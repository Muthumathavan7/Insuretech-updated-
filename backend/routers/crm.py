"""CRM — customer 360, leads, interactions, segmentation."""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_user, require_roles
from database import db
from models import LeadUpdate, InteractionCreate

router = APIRouter(prefix="/crm", tags=["crm"])


@router.get("/customers")
async def list_customers(
    stage: Optional[str] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    _: dict = Depends(require_roles("admin", "agent", "claims_officer")),
):
    query = {"role": "customer"}
    if stage:
        query["lead_stage"] = stage
    if tag:
        query["tags"] = tag
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users


@router.get("/customers/{user_id}")
async def customer_360(user_id: str, _: dict = Depends(require_roles("admin", "agent", "claims_officer"))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(404, "User not found")
    policies = await db.policies.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    claims = await db.claims.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    interactions = await db.interactions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    quotes = await db.quotes.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    payments = await db.payment_transactions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {
        "profile": user,
        "policies": policies,
        "claims": claims,
        "interactions": interactions,
        "quotes": quotes,
        "payments": payments,
        "stats": {
            "active_policies": sum(1 for p in policies if p["status"] == "active"),
            "total_claims": len(claims),
            "ltv": user.get("ltv", 0.0),
        },
    }


@router.patch("/customers/{user_id}")
async def update_lead(user_id: str, body: LeadUpdate, _: dict = Depends(require_roles("admin", "agent"))):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        return {"updated": False}
    await db.users.update_one({"id": user_id}, {"$set": updates})
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": user_id,
        "kind": "action", "title": f"Lead updated", "body": str(updates), "meta": updates,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"updated": True}


@router.get("/leads/pipeline")
async def leads_pipeline(_: dict = Depends(require_roles("admin", "agent"))):
    stages = ["new", "qualified", "contacted", "quoted", "won", "lost"]
    result = {}
    for s in stages:
        users = await db.users.find(
            {"role": "customer", "lead_stage": s}, {"_id": 0, "password_hash": 0}
        ).sort("created_at", -1).limit(50).to_list(50)
        result[s] = users
    return result


@router.post("/interactions")
async def add_interaction(body: InteractionCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = __import__("uuid").uuid4().hex
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.interactions.insert_one(doc)
    return {"created": True, "id": doc["id"]}


@router.get("/interactions/{user_id}")
async def list_interactions(user_id: str, _: dict = Depends(get_current_user)):
    items = await db.interactions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items
