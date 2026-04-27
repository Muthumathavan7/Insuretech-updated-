"""Insurance products catalog."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from auth import require_roles
from database import db
from models import Product, ProductCreate

router = APIRouter(prefix="/products", tags=["products"])


@router.get("")
async def list_products(category: Optional[str] = None):
    q = {"active": True}
    if category:
        q["category"] = category
    items = await db.products.find(q, {"_id": 0}).sort("created_at", 1).to_list(200)
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
    await db.products.insert_one(p.model_dump())
    return p.model_dump()


@router.patch("/{product_id}")
async def update_product(product_id: str, updates: dict, _: dict = Depends(require_roles("admin"))):
    updates.pop("_id", None)
    updates.pop("id", None)
    await db.products.update_one({"id": product_id}, {"$set": updates})
    return {"updated": True}


@router.delete("/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(require_roles("admin"))):
    await db.products.update_one({"id": product_id}, {"$set": {"active": False}})
    return {"deleted": True}
