"""Claims management with fraud scoring + auto-approval."""
from datetime import datetime, timezone
import random
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user, require_roles
from database import db
from models import Claim, ClaimCreate, ClaimAction

router = APIRouter(prefix="/claims", tags=["claims"])


def _claim_number() -> str:
    return f"CLM-{datetime.now(timezone.utc).strftime('%y%m%d')}-{random.randint(10000, 99999)}"


def _fraud_score(claim_amount: float, coverage: float, docs: int, incident_type: str) -> float:
    # Simple heuristic fraud score (0..1)
    score = 0.0
    if coverage > 0:
        ratio = claim_amount / coverage
        score += min(ratio * 0.6, 0.55)
    if docs == 0:
        score += 0.35
    elif docs < 2:
        score += 0.15
    risky = {"theft", "loss", "missing"}
    if incident_type.lower() in risky:
        score += 0.1
    return round(min(score, 0.99), 2)


@router.post("")
async def file_claim(body: ClaimCreate, user: dict = Depends(get_current_user)):
    policy = await db.policies.find_one({"id": body.policy_id}, {"_id": 0})
    if not policy:
        raise HTTPException(404, "Policy not found")
    if policy["user_id"] != user["id"] and user["role"] == "customer":
        raise HTTPException(403, "Not your policy")

    fraud = _fraud_score(body.amount_claimed, policy.get("coverage_amount", 0),
                         len(body.documents), body.incident_type)
    status = "submitted"
    auto_approved = False
    amount_approved = 0.0
    if fraud <= 0.2 and body.amount_claimed <= 500 and len(body.documents) >= 1:
        status = "approved"
        auto_approved = True
        amount_approved = body.amount_claimed
    elif fraud >= 0.7:
        status = "investigating"

    claim = Claim(
        claim_number=_claim_number(),
        policy_id=body.policy_id,
        user_id=policy["user_id"],
        incident_date=body.incident_date,
        incident_type=body.incident_type,
        description=body.description,
        amount_claimed=body.amount_claimed,
        amount_approved=amount_approved,
        documents=body.documents,
        status=status,
        fraud_score=fraud,
        auto_approved=auto_approved,
    )
    await db.claims.insert_one(claim.model_dump())
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": policy["user_id"],
        "kind": "action", "title": "Claim filed",
        "body": f"{claim.claim_number} · {body.incident_type} · ${body.amount_claimed}",
        "meta": {"claim_id": claim.id, "fraud_score": fraud},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.notifications.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": policy["user_id"],
        "title": "Claim Received" if not auto_approved else "Claim Auto-Approved",
        "body": f"Claim {claim.claim_number} — status: {status}",
        "kind": "info" if not auto_approved else "success", "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return claim.model_dump()


@router.get("")
async def my_claims(user: dict = Depends(get_current_user)):
    items = await db.claims.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@router.get("/admin/queue")
async def claims_queue(_: dict = Depends(require_roles("admin", "claims_officer"))):
    items = await db.claims.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@router.get("/{claim_id}")
async def get_claim(claim_id: str, user: dict = Depends(get_current_user)):
    c = await db.claims.find_one({"id": claim_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Claim not found")
    if user["role"] == "customer" and c["user_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    return c


@router.post("/{claim_id}/action")
async def act_on_claim(claim_id: str, body: ClaimAction, _: dict = Depends(require_roles("admin", "claims_officer"))):
    c = await db.claims.find_one({"id": claim_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Claim not found")
    new_status = {"approve": "approved", "reject": "rejected", "investigate": "investigating"}[body.action]
    upd = {"status": new_status, "reviewer_notes": body.notes}
    if body.action == "approve":
        upd["amount_approved"] = body.amount_approved if body.amount_approved is not None else c["amount_claimed"]
    await db.claims.update_one({"id": claim_id}, {"$set": upd})
    await db.notifications.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": c["user_id"],
        "title": f"Claim {new_status}",
        "body": f"Claim {c['claim_number']} has been {new_status}.",
        "kind": "success" if new_status == "approved" else ("danger" if new_status == "rejected" else "info"),
        "read": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": c["user_id"],
        "kind": "action", "title": f"Claim {new_status}",
        "body": body.notes or "", "meta": {"claim_id": claim_id},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": new_status}
