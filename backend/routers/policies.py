"""Policy issuance + lifecycle."""
from datetime import datetime, timezone
import random
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user, require_roles
from database import db
from models import Policy

router = APIRouter(prefix="/policies", tags=["policies"])


def _policy_number(category: str) -> str:
    prefix = {"travel": "TR", "health": "HL", "motor": "MO", "device": "DV"}.get(category, "IN")
    return f"{prefix}-{datetime.now(timezone.utc).strftime('%y%m%d')}-{random.randint(10000, 99999)}"


async def issue_policy_from_quote(quote_id: str, payment_id: str, user_id: str) -> dict:
    """Called after payment confirmed."""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(404, "Quote not found")
    product = await db.products.find_one({"id": quote["product_id"]}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    # Avoid duplicate
    existing = await db.policies.find_one({"payment_id": payment_id}, {"_id": 0})
    if existing:
        return existing

    inp = quote["input"]
    policy = Policy(
        policy_number=_policy_number(product["category"]),
        user_id=user_id,
        product_id=product["id"],
        product_name=product["name"],
        category=product["category"],
        quote_id=quote_id,
        payment_id=payment_id,
        start_date=inp.get("start_date", datetime.now(timezone.utc).isoformat()),
        end_date=inp.get("end_date", datetime.now(timezone.utc).isoformat()),
        premium=quote["total"],
        coverage_amount=product.get("coverage_amount", 0),
        currency="USD",
        status="active",
        meta={"tier": inp.get("coverage_tier", "basic"), "destination": inp.get("destination")},
    )
    await db.policies.insert_one(policy.model_dump())
    # update user LTV + stage to "won"
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"ltv": quote["total"]}, "$set": {"lead_stage": "won"}},
    )
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": user_id,
        "kind": "action", "title": "Policy issued",
        "body": f"{product['name']} · {policy.policy_number}",
        "meta": {"policy_id": policy.id}, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.notifications.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": user_id,
        "title": "Policy Issued",
        "body": f"Your {product['name']} policy {policy.policy_number} is now active.",
        "kind": "success", "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return policy.model_dump()


@router.get("")
async def my_policies(user: dict = Depends(get_current_user)):
    items = await db.policies.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@router.get("/{policy_id}")
async def get_policy(policy_id: str, user: dict = Depends(get_current_user)):
    p = await db.policies.find_one({"id": policy_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Policy not found")
    if user["role"] == "customer" and p["user_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    return p


@router.get("/admin/all")
async def admin_all(_: dict = Depends(require_roles("admin", "agent"))):
    items = await db.policies.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@router.post("/{policy_id}/cancel")
async def cancel_policy(policy_id: str, user: dict = Depends(get_current_user)):
    p = await db.policies.find_one({"id": policy_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Policy not found")
    if user["role"] == "customer" and p["user_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    await db.policies.update_one({"id": policy_id}, {"$set": {"status": "cancelled"}})
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": p["user_id"],
        "kind": "action", "title": "Policy cancelled", "body": p.get("policy_number", ""),
        "meta": {}, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"cancelled": True}


@router.post("/issue-from-quote/{quote_id}")
async def issue_test_policy(quote_id: str, user: dict = Depends(get_current_user)):
    """Test/demo helper: issue a policy directly from a quote without going through Stripe.
    Useful when admin Stripe keys aren't configured yet. Owner-only."""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(404, "Quote not found")
    if quote.get("user_id") != user["id"]:
        raise HTTPException(403, "Not your quote")
    payment_id = f"test_{quote_id[:12]}"
    policy = await issue_policy_from_quote(
        quote_id=quote_id, payment_id=payment_id, user_id=user["id"]
    )
    return {"issued": True, "policy": policy}
