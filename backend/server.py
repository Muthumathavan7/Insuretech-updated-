"""FastAPI main application — Insurance Tech Platform."""
import os
import logging
from pathlib import Path
from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from database import db, _client  # noqa: E402
from auth import router as auth_router  # noqa: E402
from routers.crm import router as crm_router  # noqa: E402
from routers.products import router as products_router  # noqa: E402
from routers.quotes import router as quotes_router  # noqa: E402
from routers.policies import router as policies_router  # noqa: E402
from routers.claims import router as claims_router  # noqa: E402
from routers.payments import router as payments_router, webhook_router  # noqa: E402
from routers.ai import router as ai_router  # noqa: E402
from routers.admin import router as admin_router  # noqa: E402
from routers.vehicles import router as vehicles_router  # noqa: E402
from routers.sales_crm import router as sales_crm_router  # noqa: E402
from routers.profile import router as profile_router  # noqa: E402
from routers.pricing_rules import router as pricing_rules_router  # noqa: E402
from seed import seed_all  # noqa: E402

app = FastAPI(title="Tune Protect — Insurance Tech Platform")

api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"name": "Insurance Tech API", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "healthy"}


# mount all routers
api.include_router(auth_router)
api.include_router(crm_router)
api.include_router(products_router)
api.include_router(quotes_router)
api.include_router(policies_router)
api.include_router(claims_router)
api.include_router(payments_router)
api.include_router(ai_router)
api.include_router(admin_router)
api.include_router(vehicles_router)
api.include_router(sales_crm_router)
api.include_router(profile_router)
api.include_router(pricing_rules_router)
api.include_router(webhook_router)  # /api/webhook/stripe

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_all()
    logger.info("Seeded default data")
    # Backfill: any PA / Motor / Health / Device policy whose end_date is <= start_date
    # (legacy records written before the 1-year default landed) gets reset to
    # start_date + 365 days so the policy card shows a real expiration.
    from datetime import datetime, timezone, timedelta
    from database import db as _db
    annual_cats = ["pa", "motor", "health", "device"]
    cur = _db.policies.find({"category": {"$in": annual_cats}}, {"_id": 0})
    fixed = 0
    async for p in cur:
        try:
            s = datetime.fromisoformat(str(p.get("start_date", "")).replace("Z", "+00:00"))
            e = datetime.fromisoformat(str(p.get("end_date", "")).replace("Z", "+00:00"))
        except Exception:
            continue
        if e - s < timedelta(days=30):
            try:
                new_end = s.replace(year=s.year + 1)
            except ValueError:
                new_end = s + timedelta(days=365)
            await _db.policies.update_one(
                {"id": p["id"]}, {"$set": {"end_date": new_end.isoformat()}}
            )
            fixed += 1
    if fixed:
        logger.info(f"Backfilled {fixed} annual-term policies with +1 year expiry")


@app.on_event("shutdown")
async def on_shutdown():
    _client.close()
