"""Profile quick-fill — returns the customer's last-used personal info from
their previous quotes/policies so they don't need to re-enter Name / IC / Mobile / Address
when buying a new product.
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends
from auth import get_current_user
from database import db

router = APIRouter(prefix="/profile", tags=["profile"])


def _pull(d: Dict[str, Any], *keys, default=""):
    for k in keys:
        v = d.get(k)
        if v:
            return v
    return default


@router.get("/quick-fill")
async def get_quick_fill(user: dict = Depends(get_current_user)):
    """Aggregate the latest non-empty values for Name, IC, Passport, Mobile, Email, Address.

    Pulls from `user` doc, last quote `input`, and last policy `details`.
    """
    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0}) or {}

    quote = await db.quotes.find_one(
        {"user_id": user["id"]},
        {"_id": 0, "input": 1, "product_id": 1, "created_at": 1},
        sort=[("created_at", -1)],
    ) or {}
    qin = (quote.get("input") or {})

    policy = await db.policies.find_one(
        {"user_id": user["id"]},
        {"_id": 0, "details": 1},
        sort=[("created_at", -1)],
    ) or {}
    pin = (policy.get("details") or {})

    full_name = _pull(qin, "full_name") or _pull(pin, "full_name") or _pull(user_doc, "full_name", "name")
    id_type = _pull(qin, "id_type") or _pull(pin, "id_type") or "nric"
    id_number = _pull(qin, "id_number") or _pull(pin, "id_number")

    has_data = bool(full_name or id_number or _pull(qin, "phone") or _pull(user_doc, "phone"))

    return {
        "has_data": has_data,
        "source_count": int(bool(quote)) + int(bool(policy)),
        "full_name": full_name,
        "id_type": id_type,
        "id_number": id_number,
        "phone": _pull(qin, "phone") or _pull(pin, "phone") or _pull(user_doc, "phone"),
        "email": _pull(qin, "email") or _pull(pin, "email") or _pull(user_doc, "email"),
        "address": _pull(qin, "address") or _pull(pin, "address") or _pull(user_doc, "address"),
        "city": _pull(qin, "city") or _pull(pin, "city") or _pull(user_doc, "city"),
        "state": _pull(qin, "state") or _pull(pin, "state") or _pull(user_doc, "state"),
        "postcode": _pull(qin, "postcode") or _pull(pin, "postcode") or _pull(user_doc, "postcode"),
        "date_of_birth": _pull(qin, "date_of_birth") or _pull(pin, "date_of_birth"),
        "gender": _pull(qin, "gender") or _pull(pin, "gender"),
        "nationality": _pull(qin, "nationality") or _pull(pin, "nationality") or "malaysian",
        "occupation_class": _pull(qin, "occupation_class") or _pull(pin, "occupation_class"),
        "passport_number": _pull(qin, "passport_number") or _pull(pin, "passport_number")
            or (id_number if id_type == "passport" else ""),
        "ic_number": _pull(qin, "ic_number") or _pull(pin, "ic_number")
            or (id_number if id_type == "nric" else ""),
        "last_product_category": (await _last_category(quote.get("product_id"))) if quote else None,
    }


async def _last_category(pid):
    if not pid:
        return None
    p = await db.products.find_one({"id": pid}, {"_id": 0, "category": 1, "name": 1})
    if p:
        return {"category": p.get("category"), "product_name": p.get("name")}
    return None
