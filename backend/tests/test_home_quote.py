"""Home Easy backend E2E: products meta, /quotes/home math + validations,
policy issuance (HO- prefix, 1y term), and PATCH /products/{id} for rate-table edits."""
import os
import requests
import pytest
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tune-core.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CUSTOMER = {"email": "demo@insurtech.io", "password": "Demo@123"}
ADMIN = {"email": "admin@insurtech.io", "password": "Admin@123"}


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def cust_token():
    r = requests.post(f"{API}/auth/login", json=CUSTOMER, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def cust_headers(cust_token):
    return {"Authorization": f"Bearer {cust_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def home_product(cust_headers):
    r = requests.get(f"{API}/products", params={"category": "home"}, headers=cust_headers, timeout=15)
    assert r.status_code == 200, r.text
    items = r.json()
    home = [p for p in items if p["category"] == "home"]
    assert home, "No home product seeded"
    return home[0]


# ---------- 1. Product meta ----------
def test_home_product_meta(home_product):
    p = home_product
    assert p["name"] == "Home Easy"
    meta = p.get("meta") or {}
    # plans
    plan_keys = {pl["key"] for pl in meta.get("plans", [])}
    assert plan_keys == {"basic", "enhanced", "premier"}
    # property types
    ptype_keys = {t["key"] for t in meta.get("property_types", [])}
    assert ptype_keys == {"landed", "apartment", "terrace", "commercial"}
    # rates + bounds
    for k in ("base_rate_per_100k", "contents_rate_per_100k", "online_discount_pct",
              "tax_pct", "building_min", "building_max", "contents_min", "contents_max"):
        assert k in meta, f"meta missing {k}"
    # add-ons
    addon_names = {a["name"] for a in p.get("addons", [])}
    assert "Home Assistance 24/7" in addon_names
    assert "Personal Belongings / Valuables" in addon_names
    assert "Domestic Helper Coverage" in addon_names


# ---------- 2. Happy-path quote with expected math ----------
def _payload(home_id, **overrides):
    body = {
        "product_id": home_id,
        "plan_key": "enhanced",
        "property_type": "landed",
        "building_sum_insured": 500000,
        "contents_sum_insured": 50000,
        "addons": ["Home Assistance 24/7"],
        "full_name": "TEST_HomeUser",
        "id_type": "nric",
        "id_number": "900101105566",
        "email": "demo@insurtech.io",
        "phone": "+60123456789",
        "property_address": "12 Jalan Mawar, Kuala Lumpur",
        "postcode": "50450",
        "accept_privacy": True,
    }
    body.update(overrides)
    return body


def test_create_home_quote_math(cust_headers, home_product):
    r = requests.post(f"{API}/quotes/home", headers=cust_headers,
                      json=_payload(home_product["id"]), timeout=20)
    assert r.status_code == 200, r.text
    q = r.json()
    # Math: gross = 5 * 120 * 1.4 * 1.0 + 0.5 * 150 * 0.6 = 840 + 45 = 885
    assert q["base_premium"] == 885.0, f"gross got {q['base_premium']}"
    assert q["addon_total"] == 35.0
    meta = q.get("meta") or {}
    assert meta["online_discount"] == 88.5
    assert meta["online_discount_pct"] == 10
    # subtotal = 885 - 88.5 + 35 = 831.5 ; +rules_delta(=0 typical)
    rules_delta = meta.get("rules_delta", 0)
    expected_subtotal = round(885 - 88.5 + 35 + rules_delta, 2)
    expected_tax = round(expected_subtotal * 0.08, 2)
    expected_total = round(expected_subtotal + expected_tax, 2)
    assert q["tax"] == expected_tax, f"tax={q['tax']} expected={expected_tax}"
    assert q["total"] == expected_total, f"total={q['total']} expected={expected_total}"
    # rules engine fields
    assert "rules_delta" in meta
    assert "applied_rules" in meta
    # When no rules applied, math should match the spec: 898.02
    if rules_delta == 0:
        assert q["total"] == 898.02
        assert q["tax"] == 66.52


# ---------- 3. Validations ----------
def test_reject_no_privacy(cust_headers, home_product):
    r = requests.post(f"{API}/quotes/home", headers=cust_headers,
                      json=_payload(home_product["id"], accept_privacy=False), timeout=15)
    assert r.status_code == 400


def test_reject_building_below_min(cust_headers, home_product):
    r = requests.post(f"{API}/quotes/home", headers=cust_headers,
                      json=_payload(home_product["id"], building_sum_insured=10000), timeout=15)
    assert r.status_code == 400


def test_reject_building_above_max(cust_headers, home_product):
    r = requests.post(f"{API}/quotes/home", headers=cust_headers,
                      json=_payload(home_product["id"], building_sum_insured=5_000_000), timeout=15)
    assert r.status_code == 400


def test_reject_invalid_plan(cust_headers, home_product):
    r = requests.post(f"{API}/quotes/home", headers=cust_headers,
                      json=_payload(home_product["id"], plan_key="ultra"), timeout=15)
    assert r.status_code in (400, 422)


def test_reject_invalid_property_type(cust_headers, home_product):
    r = requests.post(f"{API}/quotes/home", headers=cust_headers,
                      json=_payload(home_product["id"], property_type="bungalow"), timeout=15)
    assert r.status_code in (400, 422)


# ---------- 4. Policy issuance ----------
def test_issue_home_policy(cust_headers, home_product):
    # create quote
    r = requests.post(f"{API}/quotes/home", headers=cust_headers,
                      json=_payload(home_product["id"]), timeout=20)
    assert r.status_code == 200, r.text
    quote_id = r.json()["id"]
    # issue
    r2 = requests.post(f"{API}/policies/issue-from-quote/{quote_id}",
                       headers=cust_headers, timeout=20)
    assert r2.status_code == 200, r2.text
    body = r2.json()
    pol = body.get("policy") or body  # endpoint wraps as {issued: True, policy: {..}}
    assert pol["policy_number"].startswith("HO-"), pol["policy_number"]
    assert pol["category"] == "home"
    sd = datetime.fromisoformat(pol["start_date"].replace("Z", "+00:00"))
    ed = datetime.fromisoformat(pol["end_date"].replace("Z", "+00:00"))
    days = (ed - sd).days
    # ~1 year (account for leap year)
    assert 364 <= days <= 366, f"policy term {days}d not ~1y"


# ---------- 5. Admin PATCH product persistence ----------
def test_admin_patch_home_product(admin_headers, cust_headers, home_product):
    pid = home_product["id"]
    # capture current
    orig_meta = home_product.get("meta") or {}
    orig_base = float(orig_meta.get("base_rate_per_100k", 120))
    orig_b_mult = float(orig_meta["plans"][0]["building_mult"])
    new_base = orig_base + 5.0
    new_b_mult = round(orig_b_mult + 0.05, 2)
    new_plans = [dict(p) for p in orig_meta["plans"]]
    new_plans[0]["building_mult"] = new_b_mult
    new_meta = {**orig_meta, "base_rate_per_100k": new_base, "plans": new_plans}

    r = requests.patch(f"{API}/products/{pid}", headers=admin_headers,
                       json={"meta": new_meta}, timeout=15)
    assert r.status_code == 200, r.text

    # re-fetch as customer
    r2 = requests.get(f"{API}/products", params={"category": "home"},
                      headers=cust_headers, timeout=15)
    assert r2.status_code == 200
    fresh = [p for p in r2.json() if p["id"] == pid][0]
    fm = fresh.get("meta") or {}
    assert float(fm["base_rate_per_100k"]) == new_base
    assert float(fm["plans"][0]["building_mult"]) == new_b_mult

    # restore
    requests.patch(f"{API}/products/{pid}", headers=admin_headers,
                   json={"meta": orig_meta}, timeout=15)
