"""Admin — analytics, campaigns, coupons, voice-call logs, notifications, partner APIs."""
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
