"""Vehicle registration → market value lookup (mock ISM-ABI).

This is a deterministic mock. In production, this would call the ISM-ABI API
or a partner like MyCarInfo. We return stable results per registration so the
UX feels real and testable.
"""
import hashlib
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import db
from models import VehicleLookupInput, VehicleLookupResult

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

# Deterministic seed list of real-world cars
CAR_DB = [
    ("Perodua", "Myvi",        1496, "Hatchback",  14500),
    ("Perodua", "Axia",        998,  "Hatchback",  9800),
    ("Perodua", "Bezza",       1331, "Sedan",      11500),
    ("Perodua", "Ativa",       1000, "SUV",        18000),
    ("Proton",  "Saga",        1332, "Sedan",      10500),
    ("Proton",  "X50",         1498, "SUV",        22500),
    ("Proton",  "X70",         1498, "SUV",        27500),
    ("Honda",   "City",        1498, "Sedan",      19500),
    ("Honda",   "Civic",       1498, "Sedan",      30500),
    ("Honda",   "HR-V",        1498, "SUV",        28000),
    ("Honda",   "CR-V",        1498, "SUV",        36000),
    ("Toyota",  "Vios",        1496, "Sedan",      18500),
    ("Toyota",  "Corolla",     1798, "Sedan",      32000),
    ("Toyota",  "Camry",       2487, "Sedan",      42000),
    ("Toyota",  "Yaris",       1496, "Hatchback",  17500),
    ("Mazda",   "3",           1998, "Sedan",      29500),
    ("Mazda",   "CX-5",        1998, "SUV",        38500),
    ("Nissan",  "Almera",      999,  "Sedan",      18500),
    ("Nissan",  "X-Trail",     2488, "SUV",        41000),
    ("Mitsubishi", "Xpander",  1499, "MPV",        23500),
    ("Volkswagen", "Polo",     999,  "Hatchback",  21500),
    ("BMW",     "3 Series",    1998, "Sedan",      55000),
    ("Mercedes-Benz", "C-Class", 1991, "Sedan",    62000),
    ("Tesla",   "Model 3",     0,    "EV Sedan",   48000),
]


# Hand-curated deterministic mappings (so users can test with known regs)
CURATED = {
    "WXY1234": ("Perodua", "Myvi",  2020, 1496, "Hatchback", 14500),
    "WAB5678": ("Honda",   "Civic", 2021, 1498, "Sedan",     30500),
    "VCD9999": ("Toyota",  "Vios",  2019, 1496, "Sedan",     18500),
    "MAZ3000": ("Mazda",   "CX-5",  2022, 1998, "SUV",       38500),
    "TSLA100": ("Tesla",   "Model 3", 2023, 0,  "EV Sedan",  48000),
    "BMW0003": ("BMW",     "3 Series", 2021, 1998, "Sedan",  55000),
}


def _normalise(reg: str) -> str:
    return "".join(c for c in reg.upper() if c.isalnum())


def _deterministic_car(reg: str) -> VehicleLookupResult:
    norm = _normalise(reg)
    if norm in CURATED:
        make, model, year, cc, body, val = CURATED[norm]
        ncd = 25.0 if year >= 2019 else 55.0
        return VehicleLookupResult(
            vehicle_reg=norm, make=make, model=model, year=year,
            engine_cc=cc, body_type=body, market_value=float(val),
            ncd_eligible=ncd,
        )
    # Hash → pick a car + year offset
    h = int(hashlib.sha1(norm.encode()).hexdigest(), 16)
    make, model, cc, body, base_val = CAR_DB[h % len(CAR_DB)]
    year = 2018 + (h // 31 % 7)  # 2018 – 2024
    # Depreciate by year
    age = max(0, 2025 - year)
    market_value = round(base_val * max(0.55, 1 - age * 0.09), 2)
    ncd_eligible = min(55.0, 25.0 + age * 5.0)
    return VehicleLookupResult(
        vehicle_reg=norm, make=make, model=model, year=year,
        engine_cc=cc, body_type=body, market_value=market_value,
        ncd_eligible=ncd_eligible,
    )


@router.post("/lookup")
async def lookup_vehicle(body: VehicleLookupInput, user: dict = Depends(get_current_user)):
    if not body.vehicle_reg or len(_normalise(body.vehicle_reg)) < 3:
        raise HTTPException(400, "Please enter a valid vehicle registration")
    result = _deterministic_car(body.vehicle_reg)
    # cache to a history collection (optional for CRM)
    await db.vehicle_lookups.update_one(
        {"user_id": user["id"], "vehicle_reg": result.vehicle_reg},
        {"$set": {**result.model_dump(), "user_id": user["id"]}},
        upsert=True,
    )
    return result.model_dump()
