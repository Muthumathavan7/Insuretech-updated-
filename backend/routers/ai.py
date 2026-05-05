import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
import anthropic

from auth import get_current_user
from database import db
from models import ChatMessage

router = APIRouter(prefix="/ai", tags=["ai"])

# -----------------------------
# CONFIG
# -----------------------------
ANTHROPIC_API_KEY = os.getenv("EMERGENT_LLM_KEY")

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY is not set")

client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_MSG = (
    "You are Aura, an AI assistant for a premium insurance platform called Afinity.ai. "
    "Help users with policies, claims, quotes, and recommendations. "
    "Be warm, concise (2-4 sentences), and friendly."
)

# -----------------------------
# CHAT
# -----------------------------
@router.post("/chat")
async def chat(body: ChatMessage, user: dict = Depends(get_current_user)):
    ts = datetime.now(timezone.utc).isoformat()

    # Save user message
    await db.chat_messages.insert_one({
        "id": __import__("uuid").uuid4().hex,
        "session_id": body.session_id,
        "user_id": user["id"],
        "role": "user",
        "content": body.message,
        "created_at": ts,
    })

    try:
        response = await client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=300,
            system=SYSTEM_MSG,
            messages=[
                {
                    "role": "user",
                    "content": body.message
                }
            ]
        )

        reply = response.content[0].text

    except Exception as e:
        raise HTTPException(500, f"AI error: {e}")

    # Save AI reply
    await db.chat_messages.insert_one({
        "id": __import__("uuid").uuid4().hex,
        "session_id": body.session_id,
        "user_id": user["id"],
        "role": "assistant",
        "content": reply,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "reply": reply,
        "session_id": body.session_id
    }


# -----------------------------
# CHAT HISTORY
# -----------------------------
@router.get("/chat/{session_id}")
async def chat_history(session_id: str, user: dict = Depends(get_current_user)):
    items = await db.chat_messages.find(
        {"session_id": session_id, "user_id": user["id"]},
        {"_id": 0},
    ).sort("created_at", 1).to_list(200)

    return items


# -----------------------------
# RECOMMENDATIONS
# -----------------------------
@router.get("/recommendations")
async def recommendations(user: dict = Depends(get_current_user)):
    policies = await db.policies.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    categories = {p["category"] for p in policies if p["status"] == "active"}

    recs = []
    products = await db.products.find({"active": True}, {"_id": 0}).to_list(50)

    for p in products:
        if p["category"] not in categories:
            recs.append({
                "product": p,
                "reason": "Recommended based on your profile.",
                "confidence": 0.7,
            })

    return recs[:4]


# -----------------------------
# LEAD SCORE
# -----------------------------
@router.get("/lead-score/{user_id}")
async def lead_score(user_id: str, _: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")

    policies = await db.policies.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    claims = await db.claims.find({"user_id": user_id}, {"_id": 0}).to_list(50)

    active = sum(1 for p in policies if p["status"] == "active")

    conversion = round(min(0.95, 0.2 + active * 0.15), 2)
    renewal = round(min(0.95, 0.4 + active * 0.12 - len(claims) * 0.05), 2)
    churn = round(max(0.05, 0.5 - active * 0.1 + len(claims) * 0.08), 2)

    return {
        "user_id": user_id,
        "conversion_probability": conversion,
        "renewal_likelihood": renewal,
        "churn_risk": churn,
        "next_best_action": (
            "Offer renewal discount"
            if active > 0 and renewal < 0.6
            else "Send upsell email"
            if active > 0
            else "Schedule outbound call"
        ),
    }