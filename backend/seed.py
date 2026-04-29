"""Seed admin + sample products + a demo customer."""
from datetime import datetime, timezone, timedelta
import random
import bcrypt

from database import db
from models import User, Product, DEFAULT_MOTOR_FORM_CONFIG, DEFAULT_PA_FORM_CONFIG


def _hash(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


DEFAULT_PRODUCTS = [
    {
        "name": "Travel Shield Global",
        "category": "travel",
        "description": "Worldwide travel insurance covering medical, delays, baggage & cancellation.",
        "base_premium": 29.0,
        "coverage_amount": 100000,
        "display_order": 10,
        "features": [
            "Emergency medical up to RM100k",
            "Trip cancellation reimbursement",
            "Lost/delayed baggage cover",
            "24/7 global assistance",
            "Adventure sports add-on",
        ],
        "addons": [
            {"name": "Adventure Sports", "price": 15.0},
            {"name": "Rental Car Cover", "price": 12.0},
            {"name": "Cancel For Any Reason", "price": 25.0},
        ],
        "form_config": {
            "step1_fields": [
                {"key": "region",         "label": "Region",          "type": "toggle",   "options": ["international", "domestic"], "required": True,  "show": True},
                {"key": "trip_type",      "label": "Trip Type",       "type": "select",   "options": ["single_return", "one_way", "annual"], "required": True, "show": True},
                {"key": "destinations",   "label": "Destination(s)",  "type": "multi",    "required": True, "show": True},
                {"key": "traveler_type",  "label": "Traveller Type",  "type": "select",   "options": ["individual", "family", "group"], "required": True, "show": True},
                {"key": "age_category",   "label": "Age Category",    "type": "select",   "options": ["child", "18_70", "70_plus"], "required": True, "show": True},
                {"key": "travelers",      "label": "Travellers",      "type": "number",   "required": True, "show": True},
                {"key": "email",          "label": "Email",           "type": "email",    "required": True, "show": True},
                {"key": "start_date",     "label": "Start Date",      "type": "date",     "required": True, "show": True},
                {"key": "end_date",       "label": "End Date",        "type": "date",     "required": True, "show": True},
                {"key": "is_malaysian",   "label": "Malaysian/PR",    "type": "checkbox", "required": True, "show": True},
                {"key": "accept_privacy", "label": "Privacy Notice",  "type": "checkbox", "required": True, "show": True},
            ],
            "step2_fields": [
                {"key": "full_name",                "label": "Full Name",     "type": "text",     "required": True,  "show": True},
                {"key": "id_type",                  "label": "ID Type",       "type": "select",   "options": ["nric", "passport"], "required": True, "show": True},
                {"key": "id_number",                "label": "ID Number",     "type": "text",     "required": True,  "show": True},
                {"key": "phone",                    "label": "Mobile",        "type": "tel",      "required": True,  "show": True},
                {"key": "address",                  "label": "Address",       "type": "textarea", "required": False, "show": True},
                {"key": "postcode",                 "label": "Postcode",      "type": "text",     "required": True,  "show": True},
                {"key": "beneficiary_name",         "label": "Beneficiary",   "type": "text",     "required": False, "show": True},
                {"key": "beneficiary_relationship", "label": "Relationship",  "type": "select",   "options": ["spouse", "parent", "child", "sibling", "other"], "required": False, "show": True},
            ],
        },
        "image_url": "https://images.unsplash.com/photo-1774663855124-9ede7464f37e?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
    },
    {
        "name": "Health Secure Plus",
        "category": "health",
        "description": "Comprehensive health coverage for individuals and families.",
        "base_premium": 89.0,
        "coverage_amount": 500000,
        "features": [
            "Cashless hospitalization",
            "Pre & post-hospital care",
            "Annual health check-up",
            "Maternity cover (optional)",
            "Critical illness rider",
        ],
        "addons": [
            {"name": "Maternity Cover", "price": 30.0},
            {"name": "Critical Illness", "price": 22.0},
        ],
        "image_url": "https://images.pexels.com/photos/4617309/pexels-photo-4617309.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
        "name": "Motor Easy",
        "category": "motor",
        "description": "Comprehensive private car insurance. Move seamlessly with 24/7 auto-assist, 300+ authorised workshops, and an instant 10% online rebate.",
        "base_premium": 180.0,
        "coverage_amount": 30000,
        "features": [
            "Comprehensive own-damage + third-party cover",
            "10% instant online rebate on top of NCD",
            "Agreed Sum or Market Value payout",
            "24-hour emergency roadside auto-assist",
            "300+ nationwide authorised workshops",
            "6-month workmanship & parts guarantee",
        ],
        "addons": [
            {"name": "Windscreen Coverage", "price": 35.0},
            {"name": "Inconvenience Allowance", "price": 25.0},
            {"name": "Spray Paint", "price": 60.0},
            {"name": "Strike, Riot & Civil Commotion", "price": 18.0},
            {"name": "Passenger PA Coverage", "price": 22.0},
            {"name": "Legal Liability to Passengers", "price": 20.0},
            {"name": "Flood / Special Perils", "price": 30.0},
        ],
        "image_url": "https://images.unsplash.com/photo-1636613112804-c5aebc1f4d8d?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
    },
    {
        "name": "Device Guard",
        "category": "device",
        "description": "Protect laptops, phones, tablets, and wearables from accidental damage and theft.",
        "base_premium": 7.0,
        "coverage_amount": 3000,
        "display_order": 50,
        "features": [
            "Accidental damage cover",
            "Theft & burglary protection",
            "Liquid spillage cover",
            "Nationwide service pickup",
        ],
        "addons": [
            {"name": "Extended Warranty", "price": 4.0},
            {"name": "International Travel", "price": 6.0},
        ],
        "image_url": "https://images.pexels.com/photos/7382453/pexels-photo-7382453.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
        "name": "PA Easy",
        "category": "pa",
        "description": "Life is unpredictable — you'll never know when an accident could happen. Protect yourself and your loved ones from financial strain with PA Easy.",
        "base_premium": 36.0,
        "coverage_amount": 10000,
        "display_order": 30,
        "features": [
            "Death & Permanent Disablement Benefit up to $10,000",
            "Hospital Income $50/day up to 30 days",
            "Ambulance Services up to $200",
            "Bereavement / Funeral Expenses (Accidental only) $1,500",
            "Dental & Clinical Accidental Treatment $1,000",
            "Fuel Station Accident Benefit $10,000",
        ],
        "addons": [],
        "image_url": "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
    },
]


async def seed_all():
    # Clean up legacy duplicate products
    await db.products.delete_many({"name": "Motor Drive Pro"})

    # Admin
    existing_admin = await db.users.find_one({"email": "admin@insurtech.io"}, {"_id": 0})
    if not existing_admin:
        admin = User(
            email="admin@insurtech.io",
            phone="+10000000000",
            full_name="Admin Root",
            role="admin",
            kyc_status="verified",
        )
        doc = admin.model_dump()
        doc["password_hash"] = _hash("Admin@123")
        await db.users.insert_one(doc)

    # Claims officer
    existing_co = await db.users.find_one({"email": "claims@insurtech.io"}, {"_id": 0})
    if not existing_co:
        co = User(
            email="claims@insurtech.io", phone="+10000000001",
            full_name="Claims Officer", role="claims_officer", kyc_status="verified",
        )
        doc = co.model_dump()
        doc["password_hash"] = _hash("Claims@123")
        await db.users.insert_one(doc)

    # Demo customer
    existing_cust = await db.users.find_one({"email": "demo@insurtech.io"}, {"_id": 0})
    if not existing_cust:
        cust = User(
            email="demo@insurtech.io", phone="+10000009999",
            full_name="Demo Customer", role="customer",
            kyc_status="verified", lead_stage="quoted",
            tags=["vip", "repeat-customer"], ltv=1250.0,
        )
        doc = cust.model_dump()
        doc["password_hash"] = _hash("Demo@123")
        await db.users.insert_one(doc)

    # Products — insert missing categories (idempotent per category). Also backfill display_order.
    for p in DEFAULT_PRODUCTS:
        exists = await db.products.find_one({"category": p["category"], "name": p["name"]}, {"_id": 0})
        if not exists:
            prod = Product(**p)
            if prod.category == "motor" and not prod.form_config:
                prod.form_config = DEFAULT_MOTOR_FORM_CONFIG
            if prod.category == "pa" and not prod.form_config:
                prod.form_config = DEFAULT_PA_FORM_CONFIG
            await db.products.insert_one(prod.model_dump())
        else:
            # Backfill defaults if missing on existing doc
            backfill = {}
            if p["category"] == "motor" and not exists.get("form_config"):
                backfill["form_config"] = DEFAULT_MOTOR_FORM_CONFIG
            if p["category"] == "pa" and not exists.get("form_config"):
                backfill["form_config"] = DEFAULT_PA_FORM_CONFIG
            if p["category"] == "travel" and not exists.get("form_config") and p.get("form_config"):
                backfill["form_config"] = p["form_config"]
            if "display_order" not in exists:
                backfill["display_order"] = p.get("display_order", 100)
            if backfill:
                await db.products.update_one({"id": exists["id"]}, {"$set": backfill})

    # Sample leads (customers at various stages) for Kanban
    lead_count = await db.users.count_documents({"role": "customer"})
    if lead_count < 6:
        stages = ["new", "qualified", "contacted", "quoted"]
        names = [
            ("Aria Johnson", "aria.j@example.com", "+14155550101", "new"),
            ("Daniel Kim", "daniel.k@example.com", "+14155550102", "qualified"),
            ("Sofia Martinez", "sofia.m@example.com", "+14155550103", "contacted"),
            ("Rahul Patel", "rahul.p@example.com", "+14155550104", "quoted"),
            ("Mei Chen", "mei.c@example.com", "+14155550105", "contacted"),
            ("Liam O'Connor", "liam.o@example.com", "+14155550106", "new"),
        ]
        for name, email, phone, stage in names:
            if not await db.users.find_one({"email": email}, {"_id": 0}):
                u = User(
                    email=email, phone=phone, full_name=name, role="customer",
                    lead_stage=stage, lead_source=random.choice(["website", "referral", "partner", "ad"]),
                    tags=random.sample(["warm", "cold", "hot", "repeat", "vip", "mobile"], 2),
                    risk_score=round(random.uniform(0.2, 0.8), 2),
                    ltv=round(random.uniform(0, 3000), 2),
                )
                doc = u.model_dump()
                doc["password_hash"] = _hash("Temp@123")
                await db.users.insert_one(doc)

    # Sample paid transactions for revenue chart (only if none exist)
    if await db.payment_transactions.count_documents({}) < 3:
        products = await db.products.find({}, {"_id": 0}).to_list(10)
        cust = await db.users.find_one({"email": "demo@insurtech.io"}, {"_id": 0})
        if products and cust:
            now = datetime.now(timezone.utc)
            for i in range(6):
                ds = (now - timedelta(days=random.randint(0, 10))).isoformat()
                p = random.choice(products)
                await db.payment_transactions.insert_one({
                    "id": __import__("uuid").uuid4().hex,
                    "session_id": f"seed-{i}",
                    "user_id": cust["id"],
                    "quote_id": None,
                    "amount": round(random.uniform(40, 400), 2),
                    "currency": "usd",
                    "payment_status": "paid",
                    "status": "complete",
                    "metadata": {"seed": True, "product": p["name"]},
                    "created_at": ds,
                    "updated_at": ds,
                })

    # Seed a sample active policy for the demo customer so the claims flow is testable
    cust = await db.users.find_one({"email": "demo@insurtech.io"}, {"_id": 0})
    if cust and await db.policies.count_documents({"user_id": cust["id"]}) == 0:
        travel = await db.products.find_one({"category": "travel"}, {"_id": 0})
        if travel:
            now = datetime.now(timezone.utc)
            pol = {
                "id": __import__("uuid").uuid4().hex,
                "policy_number": f"TR-{now.strftime('%y%m%d')}-{random.randint(10000, 99999)}",
                "user_id": cust["id"],
                "product_id": travel["id"],
                "product_name": travel["name"],
                "category": "travel",
                "quote_id": None,
                "payment_id": "seed-payment-demo",
                "start_date": now.isoformat(),
                "end_date": (now + timedelta(days=30)).isoformat(),
                "premium": 129.0,
                "coverage_amount": travel["coverage_amount"],
                "currency": "USD",
                "status": "active",
                "meta": {"tier": "premium", "destination": "Tokyo, Japan"},
                "created_at": now.isoformat(),
            }
            await db.policies.insert_one(pol)
