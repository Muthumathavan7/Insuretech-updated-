"""Quote generator + Underwriting engine."""
from datetime import datetime, timezone
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from auth import get_current_user
from database import db
from models import TravelQuoteInput, Quote
from routers.pricing_rules import evaluate_rules

router = APIRouter(prefix="/quotes", tags=["quotes"])

TIER_MULTIPLIER = {"basic": 1.0, "premium": 1.6, "vip": 2.4}


class MotorQuoteInput(BaseModel):
    product_id: str
    # Account / Plan Selection
    account_type: Literal["personal", "business"] = "personal"
    vehicle_reg: str
    id_type: Literal["nric", "passport"] = "nric"
    id_number: str
    full_name: str
    date_of_birth: str
    postcode: str
    email: EmailStr
    # Cover
    cover_type: Literal["comprehensive", "third_party"] = "comprehensive"
    sum_insured: float = Field(gt=0, le=500000)
    ncd_percent: float = Field(ge=0, le=55, default=0)
    addons: List[str] = []


class PAQuoteInput(BaseModel):
    product_id: str
    # Plan
    num_persons: int = Field(ge=1, le=6, default=1)
    # Insured person
    full_name: str
    id_type: Literal["nric", "passport"] = "nric"
    id_number: str
    gender: Literal["male", "female"] = "male"
    date_of_birth: str
    nationality: Literal["malaysian", "non_malaysian"] = "malaysian"
    occupation_class: Literal["class_1", "class_2", "class_3", "class_4"] = "class_1"
    email: EmailStr
    phone: str
    address: Optional[str] = ""
    postcode: str
    # Beneficiary
    beneficiary_name: str
    beneficiary_relationship: Literal["spouse", "parent", "child", "sibling", "other"] = "spouse"
    beneficiary_nric: Optional[str] = ""


def _parse_date(s: str) -> datetime:
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(400, f"Invalid date: {s}")


def _risk_score(destination: str, travelers: int, tier: str) -> float:
    high_risk = {"syria", "afghanistan", "yemen", "somalia", "north korea"}
    base = 0.30
    if (destination or "").strip().lower() in high_risk:
        base += 0.40
    base += min(travelers * 0.03, 0.20)
    if tier == "basic":
        base += 0.05
    return round(min(base, 0.95), 2)


# Tune-Protect-style multipliers
TRIP_TYPE_MULT = {"single_return": 1.0, "one_way": 0.7, "annual": 5.0}
AGE_MULT = {"child": 0.6, "18_70": 1.0, "70_plus": 1.8}
REGION_MULT = {"domestic": 0.6, "international": 1.0}


@router.post("/travel")
async def create_travel_quote(body: TravelQuoteInput, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id, "active": True}, {"_id": 0})
    if not product or product["category"] != "travel":
        raise HTTPException(404, "Travel product not found")
    if not body.accept_privacy:
        raise HTTPException(400, "Please accept the privacy notice to continue")

    start = _parse_date(body.start_date)
    end = _parse_date(body.end_date)
    days = max((end - start).days, 1)
    if body.trip_type == "annual":
        days = 365  # annual auto-renew style
    if body.trip_type == "one_way":
        days = max(days, 7)

    base = product["base_premium"]
    tier_mult = TIER_MULTIPLIER.get(body.coverage_tier, 1.0)
    trip_mult = TRIP_TYPE_MULT.get(body.trip_type, 1.0)
    age_mult = AGE_MULT.get(body.age_category, 1.0)
    region_mult = REGION_MULT.get(body.region, 1.0)
    base_premium = round(
        base * (days / 7.0) * body.travelers * tier_mult * trip_mult * age_mult * region_mult, 2
    )

    addon_total = 0.0
    if body.addons and product.get("addons"):
        names = set(body.addons)
        for a in product["addons"]:
            if a["name"] in names:
                addon_total += float(a["price"]) * body.travelers

    primary_dest = body.destination or (body.destinations[0] if body.destinations else "")
    risk = _risk_score(primary_dest, body.travelers, body.coverage_tier)
    risk_loading = base_premium * (risk - 0.3) * 0.5 if risk > 0.3 else 0.0
    subtotal = base_premium + addon_total + max(risk_loading, 0)

    # ---- Pricing Rules Engine: dynamic adjustments ----
    rule_inputs = {
        "destination": primary_dest,
        "trip_type": body.trip_type,
        "travelers": body.travelers,
        "duration_days": days,
        "coverage_tier": body.coverage_tier,
        "region": body.region,
        "age_category": body.age_category,
    }
    eval_result = await evaluate_rules(
        product="travel", base_premium=subtotal, inputs=rule_inputs,
        record_audit=True, user_id=user["id"],
    )
    rules_delta = round(eval_result["final_premium"] - subtotal, 2)
    subtotal = eval_result["final_premium"]

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
    quote_doc = q.model_dump()
    quote_doc["meta"] = {
        "rules_delta": rules_delta,
        "applied_rules": eval_result["applied_rules"],
    }
    await db.quotes.insert_one(quote_doc)
    await db.users.update_one({"id": user["id"]}, {"$set": {"lead_stage": "quoted", "risk_score": risk}})
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": user["id"],
        "kind": "action", "title": "Travel quote generated",
        "body": f"Destination {primary_dest or '-'}, {days}d, total {total}",
        "meta": {"quote_id": q.id}, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return q.model_dump()


@router.post("/motor")
async def create_motor_quote(body: MotorQuoteInput, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id, "active": True}, {"_id": 0})
    if not product or product["category"] != "motor":
        raise HTTPException(404, "Motor product not found")

    # Enforce admin-controlled form config: required-but-blank fails
    fc = product.get("form_config") or {}

    def _enabled(k: str) -> bool:
        return fc.get(k, {}).get("enabled", True) if fc else True

    def _required(k: str) -> bool:
        return fc.get(k, {}).get("required", True) if fc else True

    # Null out values that the admin has disabled
    data = body.model_dump()
    if not _enabled("addons"):
        data["addons"] = []
    # validate required-and-enabled text fields not blank
    for key in ("vehicle_reg", "id_number", "full_name", "postcode"):
        if _enabled(key) and _required(key) and not str(data.get(key, "")).strip():
            raise HTTPException(400, f"Field '{key}' is required")

    # Derive base premium:
    # Comprehensive: ~3.5% of sum insured (capped by product base)
    # Third Party: fixed multiplier on product base
    if body.cover_type == "comprehensive":
        base_premium = max(product["base_premium"], round(body.sum_insured * 0.035, 2))
    else:
        base_premium = round(product["base_premium"] * 0.4, 2)

    # Age from DOB for underwriting loading
    try:
        dob = datetime.fromisoformat(body.date_of_birth).replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(400, "Invalid date_of_birth — use YYYY-MM-DD")
    age = max(18, (datetime.now(timezone.utc) - dob).days // 365)
    age_loading = 0.10 if age < 23 else (0.05 if age > 65 else 0.0)
    base_premium = round(base_premium * (1 + age_loading), 2)

    # Add-ons (flat-priced per product)
    addon_total = 0.0
    if body.addons and product.get("addons"):
        want = set(body.addons)
        for a in product["addons"]:
            if a["name"] in want:
                addon_total += float(a["price"])

    # NCD discount on base premium only
    ncd_discount = round(base_premium * (body.ncd_percent / 100.0), 2)
    # 10% online rebate on top of NCD
    online_rebate = round((base_premium - ncd_discount) * 0.10, 2)

    subtotal = max(0.0, base_premium - ncd_discount - online_rebate) + addon_total

    # ---- Pricing Rules Engine: dynamic adjustments on subtotal ----
    rule_inputs = {
        "age": age,
        "vehicle_type": "car",
        "cover_type": body.cover_type,
        "sum_insured": body.sum_insured,
        "ncd_percent": body.ncd_percent,
        "postcode": body.postcode,
        "account_type": body.account_type,
    }
    eval_result = await evaluate_rules(
        product="motor", base_premium=subtotal, inputs=rule_inputs,
        record_audit=True, user_id=user["id"],
    )
    rule_adjusted = eval_result["final_premium"]
    rules_delta = round(rule_adjusted - subtotal, 2)
    subtotal = rule_adjusted

    tax = round(subtotal * 0.08, 2)
    total = round(subtotal + tax, 2)

    risk = round(min(0.9, 0.25 + age_loading + (0.0 if body.cover_type == "comprehensive" else 0.2)), 2)

    q = Quote(
        user_id=user["id"],
        product_id=body.product_id,
        input=body.model_dump(),
        base_premium=round(base_premium - ncd_discount - online_rebate, 2),
        addon_total=round(addon_total, 2),
        tax=tax,
        total=total,
        risk_score=risk,
        coverage_tier=body.cover_type,
    )
    doc = q.model_dump()
    # stash breakdown into meta so the UI can show it
    doc["meta"] = {
        "ncd_discount": ncd_discount,
        "online_rebate": online_rebate,
        "gross_premium": base_premium,
        "sum_insured": body.sum_insured,
        "cover_type": body.cover_type,
        "vehicle_reg": body.vehicle_reg,
        "rules_delta": rules_delta,
        "applied_rules": eval_result["applied_rules"],
    }
    response = {**doc, "policy_id": None}
    await db.quotes.insert_one(doc)

    # Update customer profile with fresh personal info (CRM-first)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "lead_stage": "quoted",
            "risk_score": risk,
            "full_name": body.full_name,
            "kyc_data": {
                "id_type": body.id_type,
                "id_number": body.id_number,
                "date_of_birth": body.date_of_birth,
                "postcode": body.postcode,
                "account_type": body.account_type,
            },
        }},
    )
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": user["id"],
        "kind": "action", "title": "Motor quote generated",
        "body": f"{body.vehicle_reg} · {body.cover_type} · ${total}",
        "meta": {"quote_id": q.id}, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return response


@router.post("/pa")
async def create_pa_quote(body: PAQuoteInput, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id, "active": True}, {"_id": 0})
    if not product or product["category"] != "pa":
        raise HTTPException(404, "PA product not found")

    # Enforce form_config
    fc = product.get("form_config") or {}
    def _enabled(k): return fc.get(k, {}).get("enabled", True) if fc else True
    def _required(k): return fc.get(k, {}).get("required", True) if fc else True

    for key in ("full_name", "id_number", "beneficiary_name", "postcode", "phone"):
        if _enabled(key) and _required(key) and not str(getattr(body, key, "")).strip():
            raise HTTPException(400, f"Field '{key}' is required")

    # Eligibility check — age 18-70
    try:
        dob = datetime.fromisoformat(body.date_of_birth).replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(400, "Invalid date_of_birth — use YYYY-MM-DD")
    age = max(0, (datetime.now(timezone.utc) - dob).days // 365)
    if age < 18 or age > 70:
        raise HTTPException(400, "PA Easy is available for ages 18 to 70")

    # Occupation class loading (higher class = more hazardous job)
    occ_loading = {
        "class_1": 0.0,   # office / desk
        "class_2": 0.15,  # light manual
        "class_3": 0.35,  # heavy manual
        "class_4": 0.60,  # hazardous
    }.get(body.occupation_class, 0.0)

    base_per_person = product["base_premium"]  # e.g. 36
    gross = round(base_per_person * (1 + occ_loading) * body.num_persons, 2)
    online_discount = round(gross * 0.25, 2)  # 25% online rebate
    subtotal = round(gross - online_discount, 2)

    # ---- Pricing Rules Engine: dynamic adjustments ----
    rule_inputs = {
        "age": age,
        "occupation_class": body.occupation_class,
        "num_persons": body.num_persons,
        "gender": body.gender,
        "nationality": body.nationality,
    }
    eval_result = await evaluate_rules(
        product="pa", base_premium=subtotal, inputs=rule_inputs,
        record_audit=True, user_id=user["id"],
    )
    rules_delta = round(eval_result["final_premium"] - subtotal, 2)
    subtotal = eval_result["final_premium"]

    tax = round(subtotal * 0.08, 2)
    total = round(subtotal + tax, 2)

    risk = round(min(0.95, 0.15 + occ_loading + (0.1 if age > 60 else 0.0)), 2)

    q = Quote(
        user_id=user["id"],
        product_id=body.product_id,
        input=body.model_dump(),
        base_premium=subtotal,
        addon_total=0.0,
        tax=tax,
        total=total,
        risk_score=risk,
        coverage_tier="standard",
    )
    doc = q.model_dump()
    doc["meta"] = {
        "gross_premium": gross,
        "online_discount": online_discount,
        "occupation_loading_pct": round(occ_loading * 100, 1),
        "num_persons": body.num_persons,
        "insured_name": body.full_name,
        "age": age,
        "rules_delta": rules_delta,
        "applied_rules": eval_result["applied_rules"],
    }
    response = {**doc, "policy_id": None}
    await db.quotes.insert_one(doc)

    # Update CRM profile with PA KYC
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "lead_stage": "quoted",
            "risk_score": risk,
            "full_name": body.full_name,
            "kyc_data": {
                "id_type": body.id_type, "id_number": body.id_number,
                "gender": body.gender, "date_of_birth": body.date_of_birth,
                "nationality": body.nationality, "occupation_class": body.occupation_class,
                "phone": body.phone, "postcode": body.postcode,
                "beneficiary_name": body.beneficiary_name,
                "beneficiary_relationship": body.beneficiary_relationship,
            },
        }},
    )
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": user["id"],
        "kind": "action", "title": "PA Easy quote generated",
        "body": f"{body.num_persons} person(s) · {body.occupation_class} · ${total}",
        "meta": {"quote_id": q.id}, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return response


class HealthQuoteInput(BaseModel):
    product_id: str
    # Step 1 — Plan selection
    coverage_option: Literal["top2", "top5", "ci39"] = "top5"
    plan_key: Literal["plan1", "plan2", "plan3", "plan4", "plan5"] = "plan3"
    # Step 2 — Personal details
    full_name: str
    id_type: Literal["nric", "passport"] = "nric"
    id_number: str
    date_of_birth: str             # YYYY-MM-DD
    gender: Literal["male", "female"]
    smoker: bool = False
    email: EmailStr
    phone: str
    # Step 3 — Declarations
    malaysian_resident: bool = True
    accept_privacy: bool
    # Optional beneficiary
    beneficiary_name: Optional[str] = None
    beneficiary_relationship: Optional[str] = None


def _age_bucket(age: int) -> str:
    if age <= 29:
        return "15-29"
    if age <= 39:
        return "30-39"
    if age <= 49:
        return "40-49"
    return "50-60"


def _derive_age(dob_str: str) -> int:
    try:
        dob = datetime.fromisoformat(dob_str).replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(400, "Invalid date_of_birth — use YYYY-MM-DD")
    return max(0, (datetime.now(timezone.utc) - dob).days // 365)


@router.post("/health")
async def create_health_quote(body: HealthQuoteInput, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id, "active": True}, {"_id": 0})
    if not product or product["category"] != "health":
        raise HTTPException(404, "Health product not found")
    if not body.accept_privacy:
        raise HTTPException(400, "Please accept the privacy notice to continue")
    if not body.malaysian_resident:
        raise HTTPException(400, "Critical Safe+ is available to Malaysian residents only")

    meta = product.get("meta") or {}
    opts = {o["key"]: o for o in meta.get("coverage_options", [])}
    plans = {p["key"]: p for p in meta.get("plans", [])}
    option = opts.get(body.coverage_option)
    plan = plans.get(body.plan_key)
    if not option or not plan:
        raise HTTPException(400, "Invalid coverage option or plan")

    # Age
    age = _derive_age(body.date_of_birth)
    if age < meta.get("eligibility", {}).get("age_min", 15):
        raise HTTPException(400, "Applicant is below minimum eligible age")
    if age > meta.get("eligibility", {}).get("age_max", 60):
        raise HTTPException(400, "Applicant exceeds maximum entry age (60)")

    age_mult = (meta.get("age_loading") or {}).get(_age_bucket(age), 1.0)
    smoker_loading = 1.0 + (meta.get("smoker_loading_pct", 30) / 100.0 if body.smoker else 0.0)

    # Premium maths — all amounts per-year in MYR
    base_rate = float(product["base_premium"])                   # 22 MYR /year baseline
    gross = round(base_rate * option["multiplier"] * plan["multiplier"] * age_mult * smoker_loading, 2)
    online_discount_pct = float(meta.get("online_discount_pct", 15))
    online_discount = round(gross * online_discount_pct / 100.0, 2)
    subtotal = round(gross - online_discount, 2)

    # Rules engine adjustments
    rule_inputs = {
        "age": age, "gender": body.gender, "smoker": body.smoker,
        "coverage_option": body.coverage_option, "plan": body.plan_key,
        "sum_insured": plan["sum_insured"],
    }
    eval_result = await evaluate_rules(
        product="health", base_premium=subtotal, inputs=rule_inputs,
        record_audit=True, user_id=user["id"],
    )
    rules_delta = round(eval_result["final_premium"] - subtotal, 2)
    subtotal = eval_result["final_premium"]

    tax = round(subtotal * (float(meta.get("tax_pct", 8)) / 100.0), 2)
    total = round(subtotal + tax, 2)

    q = Quote(
        user_id=user["id"],
        product_id=body.product_id,
        input=body.model_dump(),
        base_premium=round(gross, 2),
        addon_total=0.0,
        tax=tax,
        total=total,
        risk_score=round(min(1.0, (age_mult - 1) / 2.0 + (0.2 if body.smoker else 0.0)), 3),
        coverage_tier=body.coverage_option,
    )
    doc = q.model_dump()
    doc["meta"] = {
        "gross_premium": round(gross, 2),
        "online_discount": online_discount,
        "online_discount_pct": online_discount_pct,
        "coverage_option": option,
        "plan": plan,
        "age": age,
        "age_multiplier": age_mult,
        "smoker_loading_applied": body.smoker,
        "insured_name": body.full_name,
        "rules_delta": rules_delta,
        "applied_rules": eval_result["applied_rules"],
    }
    await db.quotes.insert_one(doc)
    doc.pop("_id", None)

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "lead_stage": "quoted",
            "full_name": body.full_name,
            "kyc_data": {
                "id_type": body.id_type, "id_number": body.id_number,
                "gender": body.gender, "date_of_birth": body.date_of_birth,
                "smoker": body.smoker, "phone": body.phone,
            },
        }},
    )
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": user["id"],
        "kind": "action", "title": "Health Secure+ quote generated",
        "body": f"{option['label']} · {plan['label']} ({plan['sum_insured']}) · total {total}",
        "meta": {"quote_id": q.id}, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return doc


class HomeQuoteInput(BaseModel):
    product_id: str
    # Step 1 — Property + plan
    plan_key: Literal["basic", "enhanced", "premier"] = "enhanced"
    property_type: Literal["landed", "apartment", "terrace", "commercial"] = "landed"
    building_sum_insured: float = Field(gt=0)
    contents_sum_insured: float = Field(ge=0)
    addons: List[str] = []
    # Step 2 — Owner details
    full_name: str
    id_type: Literal["nric", "passport"] = "nric"
    id_number: str
    email: EmailStr
    phone: str
    property_address: str
    postcode: str
    # Step 3 — Declarations
    accept_privacy: bool


@router.post("/home")
async def create_home_quote(body: HomeQuoteInput, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id, "active": True}, {"_id": 0})
    if not product or product["category"] != "home":
        raise HTTPException(404, "Home product not found")
    if not body.accept_privacy:
        raise HTTPException(400, "Please accept the privacy notice to continue")

    meta = product.get("meta") or {}
    plans = {p["key"]: p for p in meta.get("plans", [])}
    ptypes = {t["key"]: t for t in meta.get("property_types", [])}
    plan = plans.get(body.plan_key)
    ptype = ptypes.get(body.property_type)
    if not plan or not ptype:
        raise HTTPException(400, "Invalid plan or property type")

    # Sum-insured bounds
    b_min = float(meta.get("building_min", 0) or 0)
    b_max = float(meta.get("building_max", 10_000_000) or 10_000_000)
    c_min = float(meta.get("contents_min", 0) or 0)
    c_max = float(meta.get("contents_max", 5_000_000) or 5_000_000)
    if not (b_min <= body.building_sum_insured <= b_max):
        raise HTTPException(400, f"Building sum insured must be between {b_min:.0f} and {b_max:.0f}")
    if body.contents_sum_insured and not (c_min <= body.contents_sum_insured <= c_max):
        raise HTTPException(400, f"Contents sum insured must be between {c_min:.0f} and {c_max:.0f}")

    base_rate = float(meta.get("base_rate_per_100k", 120))
    contents_rate = float(meta.get("contents_rate_per_100k", 150))

    building_component = (body.building_sum_insured / 100000.0) * base_rate * plan["building_mult"] * ptype["multiplier"]
    contents_component = (body.contents_sum_insured / 100000.0) * contents_rate * plan["contents_mult"]
    gross = round(building_component + contents_component, 2)

    # Add-ons (flat annual prices from product.addons)
    addon_total = 0.0
    if body.addons and product.get("addons"):
        want = set(body.addons)
        for a in product["addons"]:
            if a["name"] in want:
                addon_total += float(a["price"])

    online_pct = float(meta.get("online_discount_pct", 10))
    online_discount = round(gross * online_pct / 100.0, 2)
    subtotal = round(gross - online_discount + addon_total, 2)

    # Pricing Rules Engine adjustments
    rule_inputs = {
        "plan": body.plan_key,
        "property_type": body.property_type,
        "building_sum": body.building_sum_insured,
        "contents_sum": body.contents_sum_insured,
        "postcode": body.postcode,
        "addons_count": len(body.addons),
    }
    eval_result = await evaluate_rules(
        product="home", base_premium=subtotal, inputs=rule_inputs,
        record_audit=True, user_id=user["id"],
    )
    rules_delta = round(eval_result["final_premium"] - subtotal, 2)
    subtotal = eval_result["final_premium"]

    tax_pct = float(meta.get("tax_pct", 8))
    tax = round(subtotal * tax_pct / 100.0, 2)
    total = round(subtotal + tax, 2)

    risk = round(min(0.9, 0.25 + (0.15 if body.property_type == "commercial" else 0.0)
                     + (0.05 if body.plan_key == "basic" else 0.0)), 2)

    q = Quote(
        user_id=user["id"],
        product_id=body.product_id,
        input=body.model_dump(),
        base_premium=round(gross, 2),
        addon_total=round(addon_total, 2),
        tax=tax,
        total=total,
        risk_score=risk,
        coverage_tier=body.plan_key,
    )
    doc = q.model_dump()
    doc["meta"] = {
        "gross_premium": round(gross, 2),
        "online_discount": online_discount,
        "online_discount_pct": online_pct,
        "plan": plan,
        "property_type": ptype,
        "building_sum_insured": body.building_sum_insured,
        "contents_sum_insured": body.contents_sum_insured,
        "insured_name": body.full_name,
        "property_address": body.property_address,
        "selected_addons": body.addons,
        "rules_delta": rules_delta,
        "applied_rules": eval_result["applied_rules"],
    }
    await db.quotes.insert_one(doc)
    doc.pop("_id", None)

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "lead_stage": "quoted",
            "full_name": body.full_name,
            "kyc_data": {
                "id_type": body.id_type, "id_number": body.id_number,
                "phone": body.phone, "postcode": body.postcode,
                "property_address": body.property_address,
            },
        }},
    )
    await db.interactions.insert_one({
        "id": __import__("uuid").uuid4().hex, "user_id": user["id"],
        "kind": "action", "title": "Home Easy quote generated",
        "body": f"{plan['label']} · {ptype['label']} · Building {body.building_sum_insured:.0f} · total {total}",
        "meta": {"quote_id": q.id}, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return doc


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
