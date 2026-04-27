"""Insurance products catalog."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from auth import require_roles
from database import db
from models import Product, ProductCreate, ProductUpdate, DEFAULT_MOTOR_FORM_CONFIG

router = APIRouter(prefix="/products", tags=["products"])


@router.get("")
async def list_products(category: Optional[str] = None):
    q = {"active": True}
    if category:
        q["category"] = category
    items = await db.products.find(q, {"_id": 0}).sort(
        [("display_order", 1), ("created_at", 1)]
    ).to_list(200)
    return items


@router.get("/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    return p


@router.post("")
async def create_product(body: ProductCreate, _: dict = Depends(require_roles("admin"))):
    p = Product(**body.model_dump())
    # fill in default motor form config
    if p.category == "motor" and not p.form_config:
        p.form_config = DEFAULT_MOTOR_FORM_CONFIG
    await db.products.insert_one(p.model_dump())
    return p.model_dump()


@router.patch("/{product_id}")
async def update_product(product_id: str, body: ProductUpdate, _: dict = Depends(require_roles("admin"))):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Product not found")
    updates = body.model_dump(exclude_unset=True, exclude_none=True)
    # Coerce pydantic objects to dicts for mongo
    if "addons" in updates:
        updates["addons"] = [
            a.model_dump() if hasattr(a, "model_dump") else a for a in updates["addons"]
        ]
    if "form_config" in updates:
        updates["form_config"] = {
            k: (v.model_dump() if hasattr(v, "model_dump") else v)
            for k, v in updates["form_config"].items()
        }
    await db.products.update_one({"id": product_id}, {"$set": updates})
    return {"updated": True, "fields": list(updates.keys())}


@router.delete("/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(require_roles("admin"))):
    await db.products.update_one({"id": product_id}, {"$set": {"active": False}})
    return {"deleted": True}
