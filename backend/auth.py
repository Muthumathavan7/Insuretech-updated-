"""Authentication utilities and router — JWT + bcrypt + mocked OTP."""
import os
import random
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import db
from models import (
    UserCreate, UserLogin, OtpRequest, OtpVerify,
    User, UserPublic,
)

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRY_MIN = int(os.environ.get("JWT_EXPIRY_MIN", "43200"))

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


# ---------- helpers ----------
def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def _make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRY_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _decode(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = _decode(creds.credentials)
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_roles(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Insufficient role")
        return user
    return _dep


def _public(user_doc: dict) -> dict:
    return {
        "id": user_doc["id"],
        "email": user_doc["email"],
        "phone": user_doc["phone"],
        "full_name": user_doc["full_name"],
        "role": user_doc["role"],
        "kyc_status": user_doc.get("kyc_status", "pending"),
        "risk_score": user_doc.get("risk_score", 0.5),
        "ltv": user_doc.get("ltv", 0.0),
        "tags": user_doc.get("tags", []),
        "lead_stage": user_doc.get("lead_stage", "new"),
        "created_at": user_doc.get("created_at"),
    }


# ---------- routes ----------
@router.post("/signup")
async def signup(body: UserCreate):
    existing = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email already registered")
    u = User(
        email=body.email, phone=body.phone, full_name=body.full_name,
        role=body.role if body.role in ("customer", "agent", "partner") else "customer",
    )
    doc = u.model_dump()
    doc["password_hash"] = _hash(body.password)
    await db.users.insert_one(doc)
    # log interaction
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex,
        "user_id": u.id,
        "kind": "action",
        "title": "Signed up",
        "body": "New customer account created",
        "meta": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    token = _make_token(u.id, u.role)
    return {"token": token, "user": _public(doc)}


@router.post("/login")
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user or not _verify(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    token = _make_token(user["id"], user["role"])
    return {"token": token, "user": _public(user)}


@router.post("/otp/request")
async def otp_request(body: OtpRequest):
    # Mocked: always issues 123456 in prod, but we save a random one for realism
    code = "123456"
    await db.otp_codes.update_one(
        {"phone": body.phone},
        {"$set": {"phone": body.phone, "code": code, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"sent": True, "dev_code": code, "message": "OTP sent (mock). Use 123456 in dev."}


@router.post("/otp/verify")
async def otp_verify(body: OtpVerify):
    record = await db.otp_codes.find_one({"phone": body.phone}, {"_id": 0})
    if not record or record.get("code") != body.code:
        raise HTTPException(401, "Invalid OTP")
    # find or create user
    user = await db.users.find_one({"phone": body.phone}, {"_id": 0})
    if not user:
        safe_suffix = "".join(c for c in body.phone if c.isdigit())[-4:] or str(random.randint(1000, 9999))
        u = User(
            email=f"otp-{safe_suffix}-{random.randint(1000,9999)}@tuneprotect.io",
            phone=body.phone,
            full_name=f"Customer {safe_suffix}",
            role="customer",
        )
        doc = u.model_dump()
        doc["password_hash"] = _hash("otp-login")
        await db.users.insert_one(doc)
        user = doc
    token = _make_token(user["id"], user["role"])
    return {"token": token, "user": _public(user)}


@router.get("/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return _public(user)
