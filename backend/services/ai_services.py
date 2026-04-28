"""AI Services — ElevenLabs Conversational AI calls + Twilio WhatsApp + Gmail invites.

All API keys are loaded from the MongoDB `settings` collection (admin-configured),
so callers must always pull a fresh client per request.
"""
import logging
import json
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Tuple

import httpx
from twilio.rest import Client as TwilioClient

from database import db

logger = logging.getLogger(__name__)


# ============ SETTINGS HELPERS ============
async def get_app_settings() -> dict:
    s = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    return s or {}


async def get_twilio_client() -> Tuple[Optional[TwilioClient], dict]:
    s = await get_app_settings()
    sid = s.get("twilio_account_sid")
    token = s.get("twilio_auth_token")
    if not sid or not token:
        return None, s
    try:
        return TwilioClient(sid, token), s
    except Exception as e:  # noqa: BLE001
        logger.error(f"Twilio init failed: {e}")
        return None, s


# ============ ELEVENLABS CONVERSATIONAL AI ============
async def generate_ai_call_script(lead: Dict, deal: Optional[Dict] = None,
                                  knowledge: Optional[str] = None,
                                  purpose: str = "follow_up") -> str:
    name = lead.get("pic_name") or lead.get("name") or "Customer"
    company = lead.get("name") or ""  # using customer-name field for company
    script = f"""You are a professional insurance sales representative.

## Lead
- Contact: {name}
- Customer/Company: {company}
- Phone: {lead.get('phone', '')}
- Email: {lead.get('email', '')}
- Status: {lead.get('pipeline_status', 'new')}
- Location: {lead.get('city', '')}, {lead.get('state', '')}, {lead.get('country', '')}
"""
    if deal:
        script += f"\n## Deal\n- Title: {deal.get('title')}\n- Value: {deal.get('value')}\n"
    if knowledge:
        script += f"\n## Knowledge Base\n{knowledge[:3000]}\n"
    script += f"\n## Purpose: {purpose}\nBe professional, listen actively, end with clear next steps."
    return script


async def initiate_elevenlabs_call(phone: str, lead: Dict, deal: Optional[Dict] = None,
                                   agent: Optional[Dict] = None,
                                   knowledge: Optional[str] = None,
                                   purpose: str = "follow_up") -> Dict:
    """Initiate outbound call via ElevenLabs Conversational AI Twilio integration."""
    s = await get_app_settings()
    api_key = s.get("elevenlabs_api_key")
    if not api_key:
        return {"success": False, "error": "ElevenLabs API key not configured in admin settings."}

    agent_id = (agent or {}).get("agent_id") or s.get("elevenlabs_default_agent_id")
    phone_id = (agent or {}).get("phone_number_id") or s.get("elevenlabs_phone_number_id")

    if not agent_id or not phone_id:
        return {
            "success": False,
            "error": "Missing ElevenLabs agent_id or phone_number_id. Configure them in Settings.",
        }

    formatted = phone.replace(" ", "").replace("-", "")
    if not formatted.startswith("+"):
        formatted = ("+60" + formatted[1:]) if formatted.startswith("0") else ("+" + formatted)

    customer_name = lead.get("pic_name") or lead.get("name", "Customer")
    deal_title = (deal or {}).get("title", "")
    deal_value = (deal or {}).get("value", 0)
    kb = (knowledge or "")[:4000] or "No specific product information."

    payload = {
        "agent_id": agent_id,
        "agent_phone_number_id": phone_id,
        "to_number": formatted,
        "conversation_initiation_client_data": {
            "dynamic_variables": {
                "customer_name": customer_name,
                "company_name": lead.get("name", ""),
                "deal_name": deal_title,
                "deal_value": str(deal_value),
                "call_purpose": purpose,
                "knowledge_base": kb,
            }
        },
    }
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
                headers={"xi-api-key": api_key, "Content-Type": "application/json"},
                json=payload, timeout=30.0,
            )
            if r.status_code == 200:
                data = r.json()
                return {
                    "success": True,
                    "conversation_id": data.get("conversation_id"),
                    "call_sid": data.get("callSid"),
                    "to": formatted,
                }
            return {"success": False, "error": f"{r.status_code}: {r.text}"}
    except Exception as e:  # noqa: BLE001
        return {"success": False, "error": str(e)}


async def get_elevenlabs_conversation(conversation_id: str) -> Optional[Dict]:
    s = await get_app_settings()
    api_key = s.get("elevenlabs_api_key")
    if not api_key or not conversation_id:
        return None
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}",
                headers={"xi-api-key": api_key}, timeout=30.0,
            )
            if r.status_code == 200:
                d = r.json()
                transcript = ""
                for t in d.get("transcript", []) or []:
                    transcript += f"{t.get('role','').title()}: {t.get('message','')}\n\n"
                return {
                    "status": d.get("status"),
                    "duration_seconds": d.get("call_duration_secs"),
                    "transcript": transcript or None,
                    "has_audio": d.get("has_audio", False),
                }
    except Exception as e:  # noqa: BLE001
        logger.error(f"Conv fetch failed: {e}")
    return None


async def download_elevenlabs_audio(conversation_id: str) -> Optional[bytes]:
    s = await get_app_settings()
    api_key = s.get("elevenlabs_api_key")
    if not api_key or not conversation_id:
        return None
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}/audio",
                headers={"xi-api-key": api_key}, timeout=60.0,
            )
            if r.status_code == 200:
                return r.content
    except Exception as e:  # noqa: BLE001
        logger.error(f"Audio download failed: {e}")
    return None


# ============ TWILIO WHATSAPP ============
async def send_whatsapp(to_phone: str, body: str) -> Dict:
    client, s = await get_twilio_client()
    if not client:
        return {"success": False, "error": "Twilio not configured. Set keys in admin settings."}
    wa_from = s.get("twilio_whatsapp_from") or "+14155238886"
    try:
        formatted = to_phone.replace(" ", "").replace("-", "")
        if not formatted.startswith("+"):
            formatted = "+" + formatted.lstrip("+")
        msg = client.messages.create(
            from_=f"whatsapp:{wa_from}",
            to=f"whatsapp:{formatted}",
            body=body,
        )
        return {"success": True, "sid": msg.sid, "status": msg.status}
    except Exception as e:  # noqa: BLE001
        return {"success": False, "error": str(e)}


# ============ GOOGLE GMAIL — meeting invite via SMTP ============
async def send_meeting_invite_email(to_email: str, subject: str, html_body: str,
                                    ics_content: Optional[str] = None) -> Dict:
    s = await get_app_settings()
    user = s.get("gmail_smtp_user")
    pwd = s.get("gmail_smtp_app_password")
    sender_name = s.get("gmail_sender_name") or "Insurance CRM"
    if not user or not pwd:
        return {"success": False, "error": "Gmail SMTP not configured. Set in admin settings."}
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{sender_name} <{user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))
        if ics_content:
            ics = MIMEText(ics_content, "calendar; method=REQUEST")
            ics.add_header("Content-Disposition", 'attachment; filename="invite.ics"')
            msg.attach(ics)
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(user, pwd)
            server.sendmail(user, [to_email], msg.as_string())
        return {"success": True}
    except Exception as e:  # noqa: BLE001
        return {"success": False, "error": str(e)}


def build_ics(uid: str, title: str, description: str, start: datetime,
              minutes: int, location: str = "") -> str:
    end = start + timedelta(minutes=minutes)
    fmt = "%Y%m%dT%H%M%SZ"
    return (
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//InsurTech//Meeting//EN\r\n"
        "METHOD:REQUEST\r\nBEGIN:VEVENT\r\n"
        f"UID:{uid}\r\n"
        f"DTSTAMP:{datetime.now(timezone.utc).strftime(fmt)}\r\n"
        f"DTSTART:{start.strftime(fmt)}\r\n"
        f"DTEND:{end.strftime(fmt)}\r\n"
        f"SUMMARY:{title}\r\n"
        f"DESCRIPTION:{description}\r\n"
        f"LOCATION:{location}\r\n"
        "END:VEVENT\r\nEND:VCALENDAR\r\n"
    )


# ============ AI LEAD SCORE (Claude via emergent integrations) ============
async def compute_ai_lead_score(lead: Dict) -> int:
    """Heuristic + Claude-backed scoring. Returns 0-100."""
    score = 50
    if lead.get("email"): score += 8
    if lead.get("phone"): score += 8
    if lead.get("ic_number") or lead.get("passport_number"): score += 6
    if lead.get("title"): score += 4
    if lead.get("city"): score += 4
    if lead.get("notes"): score += 5
    pstatus = lead.get("pipeline_status", "new")
    bonus = {"new": 0, "contacted": 5, "no_answer": -5, "interested": 15, "follow_up": 8,
             "booked": 20, "won": 30, "lost": -30}
    score += bonus.get(pstatus, 0)
    return max(0, min(100, int(score)))
