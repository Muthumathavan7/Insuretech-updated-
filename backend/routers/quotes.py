"""Quote generator + Underwriting engine."""
from datetime import datetime, timezone
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from auth import get_current_user
from database import db
from models import TravelQuoteInput, Quote

router = APIRouter(prefix="/quotes", tags=["quotes"])

TIER_MULTIPLIER = {"basic": 1.0, "premium": 1.6, "vip": 2.4}


class MotorQuoteInput(BaseModel):
    product_id: str
    # Account / Plan Selection
    account_type: Literal["personal", "business"] = "personal"
    vehicle_reg: str
    id_type: Literal["nric", "passport"] = "nric"
    id_number: str
    full_name: str
    date_of_birth: str
    postcode: str
    email: EmailStr
    # Cover
    cover_type: Literal["comprehensive", "third_party"] = "comprehensive"
    sum_insured: float = Field(gt=0, le=500000)
    ncd_percent: float = Field(ge=0, le=55, default=0)
    addons: List[str] = []


def _parse_date(s: str) -> datetime:
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(400, f"Invalid date: {s}")


def _risk_score(destination: str, travelers: int, tier: str) -> float:
    # Simple rule-based risk score (0..1). High-risk destinations bump the score.
    high_risk = {"syria", "afghanistan", "yemen", "somalia", "north korea"}
    base = 0.30
    if destination.strip().lower() in high_risk:
        base += 0.40
    base += min(travelers * 0.03, 0.20)
    if tier == "basic":
        base += 0.05
    return round(min(base, 0.95), 2)


@router.post("/travel")
async def create_travel_quote(body: TravelQuoteInput, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id, "active": True}, {"_id": 0})
    if not product or product["category"] != "travel":
        raise HTTPException(404, "Travel product not found")

    start = _parse_date(body.start_date)
    end = _parse_date(body.end_date)
    days = max((end - start).days, 1)

    base = product["base_premium"]
    tier_mult = TIER_MULTIPLIER.get(body.coverage_tier, 1.0)
    base_premium = round(base * (days / 7.0) * body.travelers * tier_mult, 2)

    addon_total = 0.0
    if body.addons and product.get("addons"):
        names = set(body.addons)
        for a in product["addons"]:
            if a["name"] in names:
                addon_total += float(a["price"]) * body.travelers

    risk = _risk_score(body.destination, body.travelers, body.coverage_tier)
    risk_loading = base_premium * (risk - 0.3) * 0.5 if risk > 0.3 else 0.0
    subtotal = base_premium + addon_total + max(risk_loading, 0)
    tax = round(subtotal * 0.08, 2)
    total = round(subtotal + tax, 2)

    q = Quote(
        user_id=user["id"],
        product_id=body.product_id,
        input=body.model_dump(),
        base_premium=round(base_premium + max(risk_loading, 0), 2),
        addon_total=round(addon_total, 2),
        tax=tax,
        total=total,
        risk_score=risk,
        coverage_tier=body.coverage_tier,
    )
    await db.quotes.insert_one(q.model_dump())

    # update lead stage to "quoted"
    await db.users.update_one({"id": user["id"]}, {"$set": {"lead_stage": "quoted", "risk_score": risk}})
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": user["id"],
        "kind": "action", "title": "Travel quote generated",
        "body": f"Destination {body.destination}, {days}d, ${total}",
        "meta": {"quote_id": q.id}, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return q.model_dump()


@router.post("/motor")
async def create_motor_quote(body: MotorQuoteInput, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id, "active": True}, {"_id": 0})
    if not product or product["category"] != "motor":
        raise HTTPException(404, "Motor product not found")

    # Derive base premium:
    # Comprehensive: ~3.5% of sum insured (capped by product base)
    # Third Party: fixed multiplier on product base
    if body.cover_type == "comprehensive":
        base_premium = max(product["base_premium"], round(body.sum_insured * 0.035, 2))
    else:
        base_premium = round(product["base_premium"] * 0.4, 2)

    # Age from DOB for underwriting loading
    try:
        dob = datetime.fromisoformat(body.date_of_birth).replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(400, "Invalid date_of_birth — use YYYY-MM-DD")
    age = max(18, (datetime.now(timezone.utc) - dob).days // 365)
    age_loading = 0.10 if age < 23 else (0.05 if age > 65 else 0.0)
    base_premium = round(base_premium * (1 + age_loading), 2)

    # Add-ons (flat-priced per product)
    addon_total = 0.0
    if body.addons and product.get("addons"):
        want = set(body.addons)
        for a in product["addons"]:
            if a["name"] in want:
                addon_total += float(a["price"])

    # NCD discount on base premium only
    ncd_discount = round(base_premium * (body.ncd_percent / 100.0), 2)
    # 10% online rebate on top of NCD
    online_rebate = round((base_premium - ncd_discount) * 0.10, 2)

    subtotal = max(0.0, base_premium - ncd_discount - online_rebate) + addon_total
    tax = round(subtotal * 0.08, 2)
    total = round(subtotal + tax, 2)

    risk = round(min(0.9, 0.25 + age_loading + (0.0 if body.cover_type == "comprehensive" else 0.2)), 2)

    q = Quote(
        user_id=user["id"],
        product_id=body.product_id,
        input=body.model_dump(),
        base_premium=round(base_premium - ncd_discount - online_rebate, 2),
        addon_total=round(addon_total, 2),
        tax=tax,
        total=total,
        risk_score=risk,
        coverage_tier=body.cover_type,
    )
    doc = q.model_dump()
    # stash breakdown into meta so the UI can show it
    doc["meta"] = {
        "ncd_discount": ncd_discount,
        "online_rebate": online_rebate,
        "gross_premium": base_premium,
        "sum_insured": body.sum_insured,
        "cover_type": body.cover_type,
        "vehicle_reg": body.vehicle_reg,
    }
    response = {**doc, "policy_id": None}
    await db.quotes.insert_one(doc)

    # Update customer profile with fresh personal info (CRM-first)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "lead_stage": "quoted",
            "risk_score": risk,
            "full_name": body.full_name,
            "kyc_data": {
                "id_type": body.id_type,
                "id_number": body.id_number,
                "date_of_birth": body.date_of_birth,
                "postcode": body.postcode,
                "account_type": body.account_type,
            },
        }},
    )
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": user["id"],
        "kind": "action", "title": "Motor quote generated",
        "body": f"{body.vehicle_reg} · {body.cover_type} · ${total}",
        "meta": {"quote_id": q.id}, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return response


@router.get("")
async def list_my_quotes(user: dict = Depends(get_current_user)):
    items = await db.quotes.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return items


@router.get("/{quote_id}")
async def get_quote(quote_id: str, user: dict = Depends(get_current_user)):
    q = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Quote not found")
    if user["role"] == "customer" and q.get("user_id") != user["id"]:
        raise HTTPException(403, "Not your quote")
    return q
