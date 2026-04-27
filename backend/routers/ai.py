"""AI — Claude-powered chat assistant + recommendations."""
import os
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from emergentintegrations.llm.chat import LlmChat, UserMessage

from auth import get_current_user
from database import db
from models import ChatMessage

router = APIRouter(prefix="/ai", tags=["ai"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

SYSTEM_MSG = (
    "You are Aura, an AI assistant for a premium insurance platform called Tune Protect. "
    "Your job: help customers understand their policies, file claims, get quotes, and "
    "recommend products (Travel, Health, Motor, Device). Be warm, concise (2-4 sentences), "
    "and friendly. If a user asks about a claim or purchase, walk them through the flow. "
    "Never invent policy numbers or claim outcomes. If unsure, tell them to contact support."
)


async def _chat(session_id: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=SYSTEM_MSG,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")


@router.post("/chat")
async def chat(body: ChatMessage, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")
    # Store user message
    ts = datetime.now(timezone.utc).isoformat()
    await db.chat_messages.insert_one({
        "id": __import__("uuid").uuid4().hex,
        "session_id": body.session_id, "user_id": user["id"],
        "role": "user", "content": body.message, "created_at": ts,
    })
    try:
        chat_client = await _chat(body.session_id)
        reply = await chat_client.send_message(UserMessage(text=body.message))
    except Exception as e:
        raise HTTPException(500, f"AI error: {e}")

    await db.chat_messages.insert_one({
        "id": __import__("uuid").uuid4().hex,
        "session_id": body.session_id, "user_id": user["id"],
        "role": "assistant", "content": reply,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"reply": reply, "session_id": body.session_id}


@router.get("/chat/{session_id}")
async def chat_history(session_id: str, user: dict = Depends(get_current_user)):
    items = await db.chat_messages.find(
        {"session_id": session_id, "user_id": user["id"]},
        {"_id": 0},
    ).sort("created_at", 1).to_list(200)
    return items


@router.get("/recommendations")
async def recommendations(user: dict = Depends(get_current_user)):
    """Rule-based recommendations (AI stub for MVP, expandable with Claude)."""
    policies = await db.policies.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    categories = {p["category"] for p in policies if p["status"] == "active"}

    recs = []
    products = await db.products.find({"active": True}, {"_id": 0}).to_list(50)
    for p in products:
        if p["category"] not in categories:
            reason_map = {
                "travel": "Planning a trip? Get protected against delays, medical & lost luggage.",
                "health": "Secure your family's health with comprehensive medical coverage.",
                "motor": "Drive worry-free with motor insurance — roadside assistance included.",
                "device": "Protect your laptops, phones & gadgets from accidental damage.",
            }
            recs.append({
                "product": p,
                "reason": reason_map.get(p["category"], "Recommended for you."),
                "confidence": 0.85 if p["category"] == "travel" else 0.7,
            })
    return recs[:4]


@router.get("/lead-score/{user_id}")
async def lead_score(user_id: str, _: dict = Depends(get_current_user)):
    """Predictive intelligence: conversion / renewal / churn."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(404, "User not found")
    policies = await db.policies.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    claims = await db.claims.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    active = sum(1 for p in policies if p["status"] == "active")

    conversion = round(min(0.95, 0.2 + active * 0.15 + user.get("ltv", 0) / 10000), 2)
    renewal = round(min(0.95, 0.4 + active * 0.12 - len(claims) * 0.05), 2)
    churn = round(max(0.05, 0.5 - active * 0.1 + len(claims) * 0.08), 2)
    return {
        "user_id": user_id,
        "conversion_probability": conversion,
        "renewal_likelihood": max(renewal, 0.05),
        "churn_risk": min(churn, 0.95),
        "next_best_action": (
            "Offer renewal discount" if active > 0 and renewal < 0.6
            else "Send upsell email" if active > 0
            else "Schedule outbound call"
        ),
    }
