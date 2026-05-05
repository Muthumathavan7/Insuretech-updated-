import os
import stripe
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user
from database import db
from models import CheckoutRequest, PaymentTransaction
from routers.policies import issue_policy_from_quote
from routers.admin import get_active_stripe_key

# =============================
# ROUTERS
# =============================
router = APIRouter(prefix="/payments", tags=["payments"])
webhook_router = APIRouter(prefix="/webhook", tags=["webhook"])


# =============================
# CREATE CHECKOUT
# =============================
@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest,
    request: Request,
    user: dict = Depends(get_current_user),
):
    quote = await db.quotes.find_one({"id": body.quote_id}, {"_id": 0})

    if not quote:
        raise HTTPException(404, "Quote not found")

    if quote.get("user_id") and quote["user_id"] != user["id"]:
        raise HTTPException(403, "Not your quote")

    api_key = await get_active_stripe_key()
    if not api_key:
        raise HTTPException(500, "Stripe API key missing")

    stripe.api_key = api_key

    if not quote.get("total"):
        raise HTTPException(400, "Invalid quote total")

    amount = int(float(quote["total"]) * 100)
    origin = body.origin_url.rstrip("/")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "Insurance Payment"},
                    "unit_amount": amount,
                },
                "quantity": 1,
            }],
            success_url=f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/checkout/{body.quote_id}",
            metadata={
                "quote_id": body.quote_id,
                "user_id": user["id"],
            },
        )
    except Exception as e:
        raise HTTPException(500, f"Stripe error: {str(e)}")

    tx = PaymentTransaction(
        session_id=session.id,
        user_id=user["id"],
        quote_id=body.quote_id,
        amount=amount / 100,
        currency="usd",
        payment_status="initiated",
        status="open",
        metadata=session.metadata.to_dict() if session.metadata else {},
    )

    await db.payment_transactions.insert_one(tx.model_dump())

    return {
        "url": session.url,
        "session_id": session.id,
    }


# =============================
# CHECK STATUS
# =============================
@router.get("/status/{session_id}")
async def get_status(session_id: str, user: dict = Depends(get_current_user)):
    tx = await db.payment_transactions.find_one(
        {"session_id": session_id}, {"_id": 0}
    )

    if not tx:
        raise HTTPException(404, "Transaction not found")

    stripe.api_key = await get_active_stripe_key()

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        payment_status = session.payment_status
        status = session.status

        update = {
            "payment_status": payment_status,
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        policy_id = None

        if payment_status == "paid" and tx.get("payment_status") != "paid":
            policy = await issue_policy_from_quote(
                quote_id=tx["quote_id"],
                payment_id=tx.get("id"),
                user_id=tx["user_id"],
            )
            policy_id = policy["id"]

        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update},
        )

        return {
            "payment_status": payment_status,
            "status": status,
            "amount": session.amount_total / 100,
            "currency": session.currency,
            "policy_id": policy_id,
        }

    except Exception as e:
        raise HTTPException(500, str(e))


# =============================
# STRIPE WEBHOOK
# =============================
@webhook_router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")

    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    stripe.api_key = await get_active_stripe_key()

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except Exception as e:
        raise HTTPException(400, str(e))

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        session_id = session["id"]

        tx = await db.payment_transactions.find_one(
            {"session_id": session_id}
        )

        if tx and tx.get("payment_status") != "paid":
            await issue_policy_from_quote(
                quote_id=tx["quote_id"],
                payment_id=tx.get("id"),
                user_id=tx["user_id"],
            )

            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )

    return {"received": True}