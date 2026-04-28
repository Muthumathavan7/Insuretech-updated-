"""Admin — analytics, campaigns, coupons, voice-call logs, notifications, partner APIs."""
import os
from datetime import datetime, timezone, timedelta
from typing import List
from collections import defaultdict
from fastapi import APIRouter, Depends

from auth import get_current_user, require_roles
from database import db
from models import (
    Campaign, CampaignCreate, Coupon, CouponCreate,
    VoiceCall, VoiceCallCreate,
)

router = APIRouter(tags=["admin"])


# -------- Settings (Stripe & others, admin editable) --------
SETTINGS_ID = "app_settings"

DEFAULT_SUPPORTED_CURRENCIES = [
    {"code": "MYR", "symbol": "RM", "name": "Malaysian Ringgit", "rate": 1.0},
    {"code": "USD", "symbol": "$",  "name": "US Dollar",         "rate": 0.21},
    {"code": "EUR", "symbol": "€",  "name": "Euro",              "rate": 0.20},
    {"code": "GBP", "symbol": "£",  "name": "British Pound",     "rate": 0.17},
    {"code": "SGD", "symbol": "S$", "name": "Singapore Dollar",  "rate": 0.29},
    {"code": "INR", "symbol": "₹",  "name": "Indian Rupee",      "rate": 17.65},
    {"code": "AUD", "symbol": "A$", "name": "Australian Dollar", "rate": 0.32},
    {"code": "JPY", "symbol": "¥",  "name": "Japanese Yen",      "rate": 31.5},
    {"code": "AED", "symbol": "AED","name": "UAE Dirham",        "rate": 0.78},
]


def _mask(secret: str) -> str:
    if not secret:
        return ""
    if len(secret) <= 8:
        return "****"
    return f"{secret[:7]}...{secret[-4:]}"


async def _get_settings_raw() -> dict:
    doc = await db.settings.find_one({"id": SETTINGS_ID}, {"_id": 0})
    return doc or {"id": SETTINGS_ID}


async def get_active_stripe_key() -> str:
    """Return admin-configured Stripe key if present, else env fallback."""
    s = await _get_settings_raw()
    k = (s.get("stripe_secret_key") or "").strip()
    if k:
        return k
    return os.environ.get("STRIPE_API_KEY", "sk_test_emergent")


@router.get("/admin/settings")
async def get_settings(_: dict = Depends(require_roles("admin"))):
    s = await _get_settings_raw()
    secret = s.get("stripe_secret_key") or ""
    webhook = s.get("stripe_webhook_secret") or ""
    twilio_token = s.get("twilio_auth_token") or ""
    eleven_key = s.get("elevenlabs_api_key") or ""
    gmail_pwd = s.get("gmail_smtp_app_password") or ""
    google_secret = s.get("google_oauth_client_secret") or ""
    return {
        "stripe_publishable_key": s.get("stripe_publishable_key") or "",
        "stripe_secret_key_masked": _mask(secret),
        "stripe_secret_key_set": bool(secret),
        "stripe_webhook_secret_masked": _mask(webhook),
        "stripe_webhook_secret_set": bool(webhook),
        "stripe_enabled": s.get("stripe_enabled", True),
        "using_env_fallback": not bool(secret),
        # Twilio
        "twilio_account_sid": s.get("twilio_account_sid") or "",
        "twilio_auth_token_masked": _mask(twilio_token),
        "twilio_auth_token_set": bool(twilio_token),
        "twilio_phone_number": s.get("twilio_phone_number") or "",
        "twilio_whatsapp_from": s.get("twilio_whatsapp_from") or "",
        # ElevenLabs
        "elevenlabs_api_key_masked": _mask(eleven_key),
        "elevenlabs_api_key_set": bool(eleven_key),
        "elevenlabs_default_agent_id": s.get("elevenlabs_default_agent_id") or "",
        "elevenlabs_phone_number_id": s.get("elevenlabs_phone_number_id") or "",
        # Gmail SMTP
        "gmail_smtp_user": s.get("gmail_smtp_user") or "",
        "gmail_smtp_app_password_masked": _mask(gmail_pwd),
        "gmail_smtp_app_password_set": bool(gmail_pwd),
        "gmail_sender_name": s.get("gmail_sender_name") or "",
        # Google OAuth
        "google_oauth_client_id": s.get("google_oauth_client_id") or "",
        "google_oauth_client_secret_masked": _mask(google_secret),
        "google_oauth_client_secret_set": bool(google_secret),
        # Currency
        "default_currency": s.get("default_currency") or "MYR",
        "supported_currencies": s.get("supported_currencies") or DEFAULT_SUPPORTED_CURRENCIES,
    }


@router.get("/settings/public")
async def get_public_settings():
    """Public (no-auth) endpoint exposing only safe values for frontend bootstrap (currency etc.)."""
    s = await _get_settings_raw()
    return {
        "default_currency": s.get("default_currency") or "MYR",
        "supported_currencies": s.get("supported_currencies") or DEFAULT_SUPPORTED_CURRENCIES,
    }


@router.patch("/admin/settings")
async def update_settings(payload: dict, _: dict = Depends(require_roles("admin"))):
    updates = {}
    allowed = (
        "stripe_publishable_key", "stripe_secret_key", "stripe_webhook_secret", "stripe_enabled",
        "twilio_account_sid", "twilio_auth_token", "twilio_phone_number", "twilio_whatsapp_from",
        "elevenlabs_api_key", "elevenlabs_default_agent_id", "elevenlabs_phone_number_id",
        "gmail_smtp_user", "gmail_smtp_app_password", "gmail_sender_name",
        "google_oauth_client_id", "google_oauth_client_secret",
        "default_currency", "supported_currencies",
    )
    for key in allowed:
        if key in payload and payload[key] is not None:
            val = payload[key]
            updates[key] = val.strip() if isinstance(val, str) else val
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one(
        {"id": SETTINGS_ID},
        {"$set": {"id": SETTINGS_ID, **updates}},
        upsert=True,
    )
    return {"updated": True, "fields": list(updates.keys())}


@router.post("/admin/settings/stripe/test")
async def test_stripe(_: dict = Depends(require_roles("admin"))):
    """Create a $1.00 test checkout session to verify the key works."""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest,
    )
    key = await get_active_stripe_key()
    try:
        stripe = StripeCheckout(api_key=key, webhook_url="https://example.com/webhook")
        session = await stripe.create_checkout_session(CheckoutSessionRequest(
            amount=1.0, currency="usd",
            success_url="https://example.com/ok",
            cancel_url="https://example.com/cancel",
            metadata={"test": "connection"},
        ))
        return {"ok": True, "session_id": session.session_id, "key_prefix": key[:7]}
    except Exception as e:
        return {"ok": False, "error": str(e), "key_prefix": key[:7]}


# -------- Analytics --------
@router.get("/analytics/overview")
async def analytics_overview(_: dict = Depends(require_roles("admin", "agent"))):
    total_customers = await db.users.count_documents({"role": "customer"})
    active_policies = await db.policies.count_documents({"status": "active"})
    total_policies = await db.policies.count_documents({})
    total_claims = await db.claims.count_documents({})
    approved_claims = await db.claims.count_documents({"status": "approved"})
    paid_txs = await db.payment_transactions.find(
        {"payment_status": "paid"}, {"_id": 0}
    ).to_list(5000)
    revenue = sum(t.get("amount", 0) for t in paid_txs)

    # revenue by day (last 14 days)
    now = datetime.now(timezone.utc)
    days = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(13, -1, -1)]
    rev_by_day = {d: 0.0 for d in days}
    for t in paid_txs:
        ds = t.get("updated_at", t.get("created_at", ""))[:10]
        if ds in rev_by_day:
            rev_by_day[ds] += float(t.get("amount", 0))
    revenue_series = [{"date": d, "revenue": round(rev_by_day[d], 2)} for d in days]

    # policy mix
    policies = await db.policies.find({}, {"_id": 0}).to_list(2000)
    mix = defaultdict(int)
    for p in policies:
        mix[p.get("category", "other")] += 1
    policy_mix = [{"category": k, "count": v} for k, v in mix.items()]

    # conversion funnel
    funnel = {}
    for s in ["new", "qualified", "contacted", "quoted", "won", "lost"]:
        funnel[s] = await db.users.count_documents({"role": "customer", "lead_stage": s})

    claim_ratio = round((total_claims / total_policies * 100) if total_policies else 0, 1)
    approval_rate = round((approved_claims / total_claims * 100) if total_claims else 0, 1)

    return {
        "kpis": {
            "revenue": round(revenue, 2),
            "total_customers": total_customers,
            "active_policies": active_policies,
            "total_policies": total_policies,
            "total_claims": total_claims,
            "claim_ratio": claim_ratio,
            "approval_rate": approval_rate,
        },
        "revenue_series": revenue_series,
        "policy_mix": policy_mix,
        "funnel": funnel,
    }


# -------- Campaigns --------
@router.get("/campaigns")
async def list_campaigns(_: dict = Depends(require_roles("admin"))):
    items = await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@router.post("/campaigns")
async def create_campaign(body: CampaignCreate, _: dict = Depends(require_roles("admin"))):
    c = Campaign(**body.model_dump())
    await db.campaigns.insert_one(c.model_dump())
    return c.model_dump()


@router.post("/campaigns/{campaign_id}/send")
async def send_campaign(campaign_id: str, _: dict = Depends(require_roles("admin"))):
    await db.campaigns.update_one({"id": campaign_id}, {"$set": {"status": "sent"}})
    return {"sent": True}


# -------- Coupons --------
@router.get("/coupons")
async def list_coupons(_: dict = Depends(require_roles("admin"))):
    items = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@router.post("/coupons")
async def create_coupon(body: CouponCreate, _: dict = Depends(require_roles("admin"))):
    c = Coupon(**body.model_dump())
    await db.coupons.insert_one(c.model_dump())
    return c.model_dump()


# -------- Voice AI (Twilio placeholder) --------
@router.get("/voice/calls")
async def list_calls(_: dict = Depends(require_roles("admin", "agent"))):
    items = await db.voice_calls.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@router.post("/voice/calls")
async def log_call(body: VoiceCallCreate, _: dict = Depends(require_roles("admin", "agent"))):
    call = VoiceCall(**body.model_dump())
    await db.voice_calls.insert_one(call.model_dump())
    # sync to interactions
    if body.user_id:
        await db.interactions.insert_one({
            "id": __import__("uuid").uuid4().hex, "user_id": body.user_id,
            "kind": "call", "title": f"{body.direction.title()} — {body.purpose.replace('_',' ')}",
            "body": body.transcript or body.outcome or "",
            "meta": {"call_id": call.id, "direction": body.direction},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return call.model_dump()


@router.post("/voice/outbound/simulate")
async def simulate_outbound(payload: dict, _: dict = Depends(require_roles("admin", "agent"))):
    """Placeholder — when Twilio creds are set, this would trigger a real call."""
    # mock a quick dialog transcript
    mock_transcript = (
        "Aura: Hi, this is Aura calling from Tune Protect. Did you have a chance to review your travel quote?\n"
        "Customer: Yes, can you tell me what's covered?\n"
        "Aura: Absolutely — medical, trip delay, baggage, and 24/7 support. Shall we finalize today?"
    )
    call = VoiceCall(
        direction="outbound",
        user_id=payload.get("user_id"),
        phone=payload.get("phone", ""),
        purpose=payload.get("purpose", "lead_conversion"),
        duration_sec=92,
        transcript=mock_transcript,
        outcome="Interested — follow up via email",
    )
    await db.voice_calls.insert_one(call.model_dump())
    if call.user_id:
        await db.interactions.insert_one({
            "id": __import__("uuid").uuid4().hex, "user_id": call.user_id,
            "kind": "call", "title": f"Outbound — {call.purpose.replace('_',' ')}",
            "body": mock_transcript, "meta": {"call_id": call.id},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return call.model_dump()


# -------- Notifications --------
@router.get("/notifications")
async def my_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items


@router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"read": True}


# -------- Partner APIs (B2B2C placeholder) --------
@router.get("/partners/quote-api")
async def partner_quote_api_docs():
    return {
        "endpoints": [
            {"method": "POST", "path": "/api/partner/quote", "body": {"product_id": "str", "input": "object"}},
            {"method": "POST", "path": "/api/partner/purchase", "body": {"quote_id": "str", "customer": "object"}},
            {"method": "POST", "path": "/api/partner/claim", "body": {"policy_id": "str", "details": "object"}},
        ],
        "webhooks": ["policy.issued", "claim.status.changed", "payment.success"],
        "auth": "Bearer token (partner scope)",
    }
