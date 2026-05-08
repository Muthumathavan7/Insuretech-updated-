"""Pricing Rules Engine — dynamic, no-code premium logic for the platform.

Three layers:
  1. Rules Engine   — evaluates conditions (IF logic) → returns matching actions
  2. Pricing Engine — applies actions to a base premium → returns final premium
  3. Admin UI       — REST endpoints below; consumed by /admin/rules screens

A single Rule document looks like:
{
  id, rule_name, products: ["motor","pa"], priority: 1,
  logic_op: "AND" | "OR",
  conditions: [{field, operator, value}],
  action: {type: "increase_percentage" | "decrease_percentage" |
                "flat_fee" | "override_premium",
           value: <number>},
  status: "active" | "inactive",
  version: 1, created_at, updated_at, updated_by
}
"""
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import get_current_user, require_roles
from database import db


router = APIRouter(prefix="/rules", tags=["pricing-rules"])


# ---------- Pydantic schemas ----------

ALLOWED_OPS = {"==", "=", "!=", ">", "<", ">=", "<=", "in", "not_in", "contains"}
ALLOWED_ACTIONS = {
    "increase_percentage", "decrease_percentage",
    "flat_fee", "discount_fee", "override_premium",
}


class RuleCondition(BaseModel):
    field: str
    operator: str
    value: Any


class RuleAction(BaseModel):
    type: str
    value: float


class RuleCreate(BaseModel):
    rule_name: str
    products: list[str] = Field(default_factory=list)   # ["motor","pa","travel","health","device"]
    priority: int = 100
    logic_op: str = "AND"                                # AND | OR
    conditions: list[RuleCondition] = Field(default_factory=list)
    action: RuleAction
    status: str = "active"
    description: str = ""


class RuleUpdate(BaseModel):
    rule_name: str | None = None
    products: list[str] | None = None
    priority: int | None = None
    logic_op: str | None = None
    conditions: list[RuleCondition] | None = None
    action: RuleAction | None = None
    status: str | None = None
    description: str | None = None


class FormulaConfig(BaseModel):
    risk_score_weight: float = 1.0
    coverage_multiplier: float = 1.0
    tax_percent: float = 8.0
    online_discount_percent: float = 10.0
    description: str = ""


class SimulateRequest(BaseModel):
    product: str
    base_premium: float
    inputs: dict[str, Any] = Field(default_factory=dict)
    rule_ids: list[str] | None = None  # optional override → simulate-only set


# ---------- Evaluator ----------

def _coerce(value: Any, target: Any) -> Any:
    """Coerce `value` to the same primitive type as `target` for safe compare."""
    if value is None:
        return value
    if isinstance(target, bool):
        if isinstance(value, str):
            return value.strip().lower() in ("true", "1", "yes")
        return bool(value)
    if isinstance(target, (int, float)) and not isinstance(target, bool):
        try:
            return float(value)
        except (TypeError, ValueError):
            return value
    if isinstance(target, str):
        return str(value)
    return value


def _evaluate_condition(cond: dict, inputs: dict) -> bool:
    field = cond.get("field", "")
    op = cond.get("operator", "==")
    expected = cond.get("value")
    actual = inputs.get(field)
    # Coerce actual to match expected when possible (numeric comparisons)
    if isinstance(expected, (int, float)) and not isinstance(expected, bool):
        try:
            actual = float(actual) if actual is not None else None
        except (TypeError, ValueError):
            return False
    elif isinstance(expected, str):
        actual = "" if actual is None else str(actual)

    try:
        if op in ("==", "="):
            return actual == expected
        if op == "!=":
            return actual != expected
        if op == ">":
            return actual is not None and actual > expected
        if op == "<":
            return actual is not None and actual < expected
        if op == ">=":
            return actual is not None and actual >= expected
        if op == "<=":
            return actual is not None and actual <= expected
        if op == "in":
            return actual in (expected or [])
        if op == "not_in":
            return actual not in (expected or [])
        if op == "contains":
            return str(expected).lower() in str(actual or "").lower()
    except Exception:
        return False
    return False


def _evaluate_rule(rule: dict, inputs: dict) -> bool:
    conds = rule.get("conditions") or []
    if not conds:
        return True
    op = (rule.get("logic_op") or "AND").upper()
    results = [_evaluate_condition(c, inputs) for c in conds]
    return all(results) if op == "AND" else any(results)


def _apply_action(premium: float, action: dict) -> float:
    t = action.get("type", "")
    v = float(action.get("value", 0))
    if t == "increase_percentage":
        return round(premium * (1 + v / 100.0), 2)
    if t == "decrease_percentage":
        return round(premium * max(0.0, 1 - v / 100.0), 2)
    if t == "flat_fee":
        return round(premium + v, 2)
    if t == "discount_fee":
        return round(max(0.0, premium - v), 2)
    if t == "override_premium":
        return round(v, 2)
    return premium


async def evaluate_rules(
    product: str,
    base_premium: float,
    inputs: dict,
    rule_ids: list[str] | None = None,
    record_audit: bool = False,
    user_id: str | None = None,
    quote_id: str | None = None,
) -> dict:
    """Public entry point — used by /quotes endpoints + simulate API.

    Returns:
      {
        base_premium, final_premium,
        applied_rules: [{rule_id, name, action, before, after}],
        skipped_rules: [{rule_id, reason}]
      }
    """
    query: dict = {"status": "active", "products": product}
    if rule_ids:
        query = {"id": {"$in": rule_ids}}
    cursor = db.pricing_rules.find(query, {"_id": 0}).sort("priority", 1)
    rules = [r async for r in cursor]

    current = float(base_premium or 0)
    applied: list[dict] = []
    skipped: list[dict] = []
    for r in rules:
        try:
            ok = _evaluate_rule(r, inputs)
        except Exception as e:
            skipped.append({"rule_id": r.get("id"), "reason": f"eval_error:{e}"})
            continue
        if not ok:
            skipped.append({"rule_id": r.get("id"), "reason": "conditions_not_met"})
            continue
        before = current
        current = _apply_action(current, r.get("action") or {})
        applied.append({
            "rule_id": r.get("id"),
            "name": r.get("rule_name"),
            "priority": r.get("priority"),
            "action": r.get("action"),
            "before": round(before, 2),
            "after": round(current, 2),
            "delta": round(current - before, 2),
        })

    result = {
        "base_premium": round(float(base_premium or 0), 2),
        "final_premium": round(current, 2),
        "applied_rules": applied,
        "skipped_rules": skipped,
    }

    if record_audit and applied:
        await db.pricing_audit_logs.insert_one({
            "id": uuid4().hex,
            "product": product,
            "base_premium": result["base_premium"],
            "final_premium": result["final_premium"],
            "delta": round(result["final_premium"] - result["base_premium"], 2),
            "applied_rules": applied,
            "inputs": inputs,
            "user_id": user_id,
            "quote_id": quote_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return result


# ---------- CRUD endpoints ----------

@router.post("")
async def create_rule(body: RuleCreate, admin: dict = Depends(require_roles("admin"))):
    # Basic validation
    if body.action.type not in ALLOWED_ACTIONS:
        raise HTTPException(400, f"Invalid action type. Allowed: {sorted(ALLOWED_ACTIONS)}")
    for c in body.conditions:
        if c.operator not in ALLOWED_OPS:
            raise HTTPException(400, f"Invalid operator '{c.operator}'")

    doc = body.model_dump()
    doc.update({
        "id": uuid4().hex,
        "version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": admin["id"],
    })
    await db.pricing_rules.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_rules(
    product: str | None = Query(None),
    status: str | None = Query(None),
    _admin: dict = Depends(require_roles("admin")),
):
    q: dict = {}
    if product:
        q["products"] = product
    if status:
        q["status"] = status
    cur = db.pricing_rules.find(q, {"_id": 0}).sort("priority", 1)
    return [r async for r in cur]


@router.get("/{rule_id}")
async def get_rule(rule_id: str, _admin: dict = Depends(require_roles("admin"))):
    r = await db.pricing_rules.find_one({"id": rule_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Rule not found")
    return r


@router.put("/{rule_id}")
async def update_rule(rule_id: str, body: RuleUpdate, admin: dict = Depends(require_roles("admin"))):
    existing = await db.pricing_rules.find_one({"id": rule_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Rule not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates.get("action") and updates["action"].get("type") not in ALLOWED_ACTIONS:
        raise HTTPException(400, "Invalid action type")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = admin["id"]
    updates["version"] = existing.get("version", 1) + 1
    await db.pricing_rules.update_one({"id": rule_id}, {"$set": updates})
    return await db.pricing_rules.find_one({"id": rule_id}, {"_id": 0})


@router.delete("/{rule_id}")
async def delete_rule(rule_id: str, _admin: dict = Depends(require_roles("admin"))):
    res = await db.pricing_rules.delete_one({"id": rule_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Rule not found")
    return {"deleted": True}


@router.post("/{rule_id}/clone")
async def clone_rule(rule_id: str, admin: dict = Depends(require_roles("admin"))):
    src = await db.pricing_rules.find_one({"id": rule_id}, {"_id": 0})
    if not src:
        raise HTTPException(404, "Rule not found")
    src.update({
        "id": uuid4().hex,
        "rule_name": f"{src.get('rule_name', 'Rule')} (copy)",
        "status": "inactive",
        "version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": admin["id"],
    })
    await db.pricing_rules.insert_one(src)
    src.pop("_id", None)
    return src


@router.post("/{rule_id}/toggle")
async def toggle_rule(rule_id: str, admin: dict = Depends(require_roles("admin"))):
    r = await db.pricing_rules.find_one({"id": rule_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Rule not found")
    new_status = "inactive" if r.get("status") == "active" else "active"
    await db.pricing_rules.update_one(
        {"id": rule_id},
        {"$set": {"status": new_status,
                  "updated_at": datetime.now(timezone.utc).isoformat(),
                  "updated_by": admin["id"]}},
    )
    return {"id": rule_id, "status": new_status}


# ---------- Evaluation + simulation ----------

@router.post("/evaluate")
async def evaluate_endpoint(payload: dict, user: dict = Depends(get_current_user)):
    """Evaluate active rules for a product.

    Body: {"product": "motor", "base_premium": 100, "inputs": {...}}
    """
    product = payload.get("product")
    base = float(payload.get("base_premium") or 0)
    inputs = payload.get("inputs") or {}
    if not product:
        raise HTTPException(400, "product is required")
    return await evaluate_rules(
        product=product, base_premium=base, inputs=inputs,
        record_audit=True, user_id=user["id"],
    )


@router.post("/simulate")
async def simulate_endpoint(body: SimulateRequest, _admin: dict = Depends(require_roles("admin"))):
    """No-persist simulation. Used by the admin Simulator screen."""
    return await evaluate_rules(
        product=body.product, base_premium=body.base_premium,
        inputs=body.inputs, rule_ids=body.rule_ids,
        record_audit=False,
    )


# ---------- Formula config ----------

FORMULA_ID = "global_formula"


@router.get("/formula/config")
async def get_formula(_admin: dict = Depends(require_roles("admin"))):
    doc = await db.pricing_formula_config.find_one({"id": FORMULA_ID}, {"_id": 0})
    if not doc:
        defaults = FormulaConfig().model_dump()
        defaults.update({
            "id": FORMULA_ID, "version": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        await db.pricing_formula_config.insert_one(defaults)
        defaults.pop("_id", None)
        return defaults
    return doc


@router.put("/formula/config")
async def update_formula(body: FormulaConfig, admin: dict = Depends(require_roles("admin"))):
    existing = await db.pricing_formula_config.find_one({"id": FORMULA_ID}, {"_id": 0}) or {}
    new_version = existing.get("version", 0) + 1
    # Keep history snapshot
    if existing:
        await db.pricing_formula_history.insert_one({
            **{k: v for k, v in existing.items() if k != "_id"},
            "snapshot_id": uuid4().hex,
            "snapshot_at": datetime.now(timezone.utc).isoformat(),
            "snapshot_by": admin["id"],
        })
    updates = body.model_dump()
    updates.update({
        "id": FORMULA_ID, "version": new_version,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": admin["id"],
    })
    await db.pricing_formula_config.update_one(
        {"id": FORMULA_ID}, {"$set": updates}, upsert=True,
    )
    return updates


@router.get("/formula/history")
async def formula_history(_admin: dict = Depends(require_roles("admin"))):
    cur = db.pricing_formula_history.find({}, {"_id": 0}).sort("snapshot_at", -1).limit(50)
    return [d async for d in cur]


# ---------- Audit logs ----------

@router.get("/audit/logs")
async def audit_logs(
    product: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    _admin: dict = Depends(require_roles("admin")),
):
    q = {"product": product} if product else {}
    cur = db.pricing_audit_logs.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
    return [d async for d in cur]


@router.get("/meta/fields")
async def meta_fields(_admin: dict = Depends(require_roles("admin"))):
    """Field catalogue exposed to the Conditions Builder so admins know
    what variables are available for each product. Source-of-truth list —
    must stay in sync with the inputs we pass to evaluate_rules() inside
    each /quotes/* endpoint."""
    return {
        "operators": [
            {"value": "==", "label": "equals"},
            {"value": "!=", "label": "not equals"},
            {"value": ">", "label": "greater than"},
            {"value": "<", "label": "less than"},
            {"value": ">=", "label": "greater or equal"},
            {"value": "<=", "label": "less or equal"},
            {"value": "in", "label": "in (list)"},
            {"value": "not_in", "label": "not in (list)"},
            {"value": "contains", "label": "contains (text)"},
        ],
        "actions": [
            {"value": "increase_percentage", "label": "Increase by %", "unit": "%"},
            {"value": "decrease_percentage", "label": "Decrease by %", "unit": "%"},
            {"value": "flat_fee", "label": "Add flat fee", "unit": "currency"},
            {"value": "discount_fee", "label": "Subtract flat fee", "unit": "currency"},
            {"value": "override_premium", "label": "Override premium", "unit": "currency"},
        ],
        "fields_by_product": {
            "motor": [
                {"name": "age", "type": "number", "example": 25},
                {"name": "vehicle_type", "type": "string", "example": "car"},
                {"name": "cover_type", "type": "string", "options": ["comprehensive", "third_party"]},
                {"name": "sum_insured", "type": "number"},
                {"name": "ncd_percent", "type": "number"},
                {"name": "vehicle_year", "type": "number"},
                {"name": "postcode", "type": "string"},
            ],
            "pa": [
                {"name": "age", "type": "number"},
                {"name": "occupation_class", "type": "string", "options": ["class_1", "class_2", "class_3"]},
                {"name": "num_persons", "type": "number"},
                {"name": "gender", "type": "string", "options": ["male", "female"]},
                {"name": "nationality", "type": "string"},
            ],
            "travel": [
                {"name": "destination", "type": "string"},
                {"name": "trip_type", "type": "string", "options": ["single", "annual"]},
                {"name": "travelers", "type": "number"},
                {"name": "duration_days", "type": "number"},
                {"name": "coverage_tier", "type": "string", "options": ["basic", "premium", "vip"]},
            ],
            "health": [
                {"name": "age", "type": "number"},
                {"name": "smoker", "type": "boolean"},
                {"name": "pre_existing", "type": "boolean"},
                {"name": "plan_tier", "type": "string"},
            ],
            "device": [
                {"name": "device_value", "type": "number"},
                {"name": "device_age_months", "type": "number"},
                {"name": "device_type", "type": "string"},
            ],
        },
    }
