"""Stripe Checkout via emergentintegrations."""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)

from auth import get_current_user
from database import db
from models import CheckoutRequest, PaymentTransaction
from routers.policies import issue_policy_from_quote
from routers.admin import get_active_stripe_key

router = APIRouter(prefix="/payments", tags=["payments"])


async def _stripe(request: Request) -> StripeCheckout:
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    api_key = await get_active_stripe_key()
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


@router.post("/checkout")
async def create_checkout(body: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": body.quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(404, "Quote not found")
    if quote.get("user_id") and quote["user_id"] != user["id"]:
        raise HTTPException(403, "Not your quote")

    # amount MUST be derived server-side
    amount = float(quote["total"])
    currency = "usd"
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/checkout/{body.quote_id}"

    stripe = await _stripe(request)
    metadata = {
        "quote_id": body.quote_id,
        "user_id": user["id"],
        "product_id": quote["product_id"],
    }
    req = CheckoutSessionRequest(
        amount=amount, currency=currency,
        success_url=success_url, cancel_url=cancel_url, metadata=metadata,
    )
    session = await stripe.create_checkout_session(req)

    tx = PaymentTransaction(
        session_id=session.session_id,
        user_id=user["id"],
        quote_id=body.quote_id,
        amount=amount,
        currency=currency,
        payment_status="initiated",
        status="open",
        metadata=metadata,
    )
    await db.payment_transactions.insert_one(tx.model_dump())

    return {"url": session.url, "session_id": session.session_id}


@router.get("/status/{session_id}")
async def get_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Transaction not found")

    # If already marked paid, just return
    if tx.get("payment_status") == "paid":
        return {
            "payment_status": "paid", "status": tx.get("status", "complete"),
            "amount": tx["amount"], "currency": tx["currency"],
            "policy_id": tx.get("metadata", {}).get("policy_id"),
        }

    stripe = await _stripe(request)
    try:
        status = await stripe.get_checkout_status(session_id)
    except Exception as e:
        # Session may be expired, never completed, or otherwise unreachable
        return {
            "payment_status": tx.get("payment_status", "unknown"),
            "status": tx.get("status", "unknown"),
            "amount": tx["amount"],
            "currency": tx["currency"],
            "policy_id": tx.get("metadata", {}).get("policy_id"),
            "error": str(e),
        }

    update = {
        "payment_status": status.payment_status,
        "status": status.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    policy_id = None
    if status.payment_status == "paid" and tx.get("payment_status") != "paid":
        # Issue the policy (idempotent via payment_id check)
        policy = await issue_policy_from_quote(
            quote_id=tx["quote_id"], payment_id=tx["id"], user_id=tx["user_id"],
        )
        policy_id = policy["id"]
        new_meta = {**tx.get("metadata", {}), "policy_id": policy_id}
        update["metadata"] = new_meta

    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})
    return {
        "payment_status": status.payment_status,
        "status": status.status,
        "amount": status.amount_total / 100.0,
        "currency": status.currency,
        "policy_id": policy_id,
    }


# ---------- webhook (global, mounted under /api/webhook/stripe) ----------
webhook_router = APIRouter(tags=["payments"])


@webhook_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    stripe = await _stripe(request)
    try:
        evt = await stripe.handle_webhook(body, sig)
    except Exception as e:
        raise HTTPException(400, f"Webhook error: {e}")
    # Update our record
    if evt and getattr(evt, "session_id", None):
        tx = await db.payment_transactions.find_one({"session_id": evt.session_id}, {"_id": 0})
        if tx and tx.get("payment_status") != "paid" and evt.payment_status == "paid":
            await issue_policy_from_quote(
                quote_id=tx["quote_id"], payment_id=tx["id"], user_id=tx["user_id"],
            )
            await db.payment_transactions.update_one(
                {"session_id": evt.session_id},
                {"$set": {
                    "payment_status": evt.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
    return {"received": True}
