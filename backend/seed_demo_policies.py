"""Seed 3 demo policies (Motor, Health, PA) for the demo user to verify PolicyCard variants."""
import asyncio
import random
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database import db
from models import Policy


def _policy_number(category: str) -> str:
    prefix = {"travel": "TR", "health": "HL", "motor": "MO", "device": "DV", "pa": "PA"}.get(category, "IN")
    return f"{prefix}-{datetime.now(timezone.utc).strftime('%y%m%d')}-{random.randint(10000, 99999)}"


async def main():
    user = await db.users.find_one({"email": "demo@insurtech.io"}, {"_id": 0})
    if not user:
        print("Demo user not found")
        return
    uid = user["id"]
    name = user.get("full_name") or "Demo Customer"

    # remove any prior demo-seeded policies (those with payment_id starting with "demo_seed_")
    await db.policies.delete_many({"user_id": uid, "payment_id": {"$regex": "^demo_seed_"}})

    targets = [
        ("motor", "Motor Easy"),
        ("health", "Health Secure Plus"),
        ("pa", "PA Easy"),
    ]
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=365)

    for cat, pname in targets:
        product = await db.products.find_one({"category": cat, "active": True}, {"_id": 0})
        if not product:
            print(f"No active product for category {cat}")
            continue
        p = Policy(
            policy_number=_policy_number(cat),
            user_id=uid,
            product_id=product["id"],
            product_name=product.get("name", pname),
            category=cat,
            payment_id=f"demo_seed_{cat}",
            start_date=now.isoformat(),
            end_date=end.isoformat(),
            premium=float(product.get("base_premium", 100)),
            coverage_amount=float(product.get("coverage_amount", 50000)),
            currency="USD",
            status="active",
            meta={"seeded": True, "holder_name": name},
        )
        await db.policies.insert_one(p.model_dump())
        print(f"Issued {cat} policy {p.policy_number} for {name}")


if __name__ == "__main__":
    asyncio.run(main())
