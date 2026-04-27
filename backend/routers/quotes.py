"""Quote generator + Underwriting engine."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import db
from models import TravelQuoteInput, Quote

router = APIRouter(prefix="/quotes", tags=["quotes"])

TIER_MULTIPLIER = {"basic": 1.0, "premium": 1.6, "vip": 2.4}


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
