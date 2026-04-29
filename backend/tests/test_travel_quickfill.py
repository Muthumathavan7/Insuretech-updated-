"""Tests for new Travel Insurance flow + QuickFill profile endpoint (iteration 9)."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "demo@insurtech.io", "password": "Demo@123"},
                      timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    return j.get("access_token") or j.get("token")


@pytest.fixture(scope="module")
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


@pytest.fixture(scope="module")
def travel_product():
    r = requests.get(f"{API}/products?category=travel", timeout=20)
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1, "Travel Shield Global product not seeded"
    p = next((x for x in items if x["name"] == "Travel Shield Global"), items[0])
    return p


# === GET /api/products?category=travel — form_config seeded ===
class TestTravelProductFormConfig:
    def test_form_config_present(self, travel_product):
        fc = travel_product.get("form_config") or {}
        s1 = fc.get("step1_fields") or []
        s2 = fc.get("step2_fields") or []
        assert len(s1) == 11, f"expected 11 step1 fields, got {len(s1)}"
        assert len(s2) == 8, f"expected 8 step2 fields, got {len(s2)}"

    def test_step1_keys(self, travel_product):
        keys = [f["key"] for f in travel_product["form_config"]["step1_fields"]]
        for k in ["region", "trip_type", "destinations", "traveler_type",
                  "age_category", "travelers", "email", "start_date",
                  "end_date", "is_malaysian", "accept_privacy"]:
            assert k in keys

    def test_step2_keys(self, travel_product):
        keys = [f["key"] for f in travel_product["form_config"]["step2_fields"]]
        for k in ["full_name", "id_type", "id_number", "phone",
                  "address", "postcode", "beneficiary_name",
                  "beneficiary_relationship"]:
            assert k in keys


# === POST /api/quotes/travel ===
def _payload(product_id, **overrides):
    base = {
        "product_id": product_id,
        "region": "international",
        "trip_type": "single_return",
        "destinations": ["Thailand"],
        "traveler_type": "individual",
        "age_category": "18_70",
        "travelers": 2,
        "email": "demo@insurtech.io",
        "start_date": "2026-03-01",
        "end_date": "2026-03-08",
        "is_malaysian": True,
        "accept_privacy": True,
        "coverage_tier": "premium",
        "addons": ["Adventure Sports"],
        "full_name": "Demo Customer",
        "id_type": "nric",
        "id_number": "900101-14-1234",
        "phone": "+60123456789",
        "address": "1 Demo Lane",
        "postcode": "50000",
        "beneficiary_name": "Jane Doe",
        "beneficiary_relationship": "spouse",
    }
    base.update(overrides)
    return base


class TestTravelQuoteCreate:
    def test_rich_payload_returns_200(self, travel_product, demo_headers):
        r = requests.post(f"{API}/quotes/travel",
                          json=_payload(travel_product["id"]),
                          headers=demo_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["id", "base_premium", "addon_total", "tax", "total"]:
            assert k in d
        assert d["total"] > 0
        assert d["addon_total"] > 0  # had Adventure Sports addon

    def test_privacy_must_be_accepted(self, travel_product, demo_headers):
        r = requests.post(f"{API}/quotes/travel",
                          json=_payload(travel_product["id"], accept_privacy=False),
                          headers=demo_headers, timeout=20)
        assert r.status_code == 400
        assert "privacy" in r.text.lower()

    def test_legacy_minimal_payload(self, travel_product, demo_headers):
        legacy = {
            "product_id": travel_product["id"],
            "destination": "Tokyo",
            "start_date": "2026-04-01",
            "end_date": "2026-04-08",
            "travelers": 1,
            "coverage_tier": "basic",
            "addons": [],
        }
        r = requests.post(f"{API}/quotes/travel", json=legacy,
                          headers=demo_headers, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["total"] > 0

    def test_pricing_scales_with_trip_type_annual(self, travel_product, demo_headers):
        single = requests.post(f"{API}/quotes/travel",
                               json=_payload(travel_product["id"], trip_type="single_return", addons=[]),
                               headers=demo_headers, timeout=20).json()
        annual = requests.post(f"{API}/quotes/travel",
                               json=_payload(travel_product["id"], trip_type="annual", addons=[]),
                               headers=demo_headers, timeout=20).json()
        assert annual["total"] > single["total"], "Annual must price higher than single_return"

    def test_pricing_scales_with_age_70_plus(self, travel_product, demo_headers):
        adult = requests.post(f"{API}/quotes/travel",
                              json=_payload(travel_product["id"], age_category="18_70", addons=[]),
                              headers=demo_headers, timeout=20).json()
        senior = requests.post(f"{API}/quotes/travel",
                               json=_payload(travel_product["id"], age_category="70_plus", addons=[]),
                               headers=demo_headers, timeout=20).json()
        assert senior["total"] > adult["total"]

    def test_domestic_cheaper_than_international(self, travel_product, demo_headers):
        intl = requests.post(f"{API}/quotes/travel",
                             json=_payload(travel_product["id"], region="international", addons=[]),
                             headers=demo_headers, timeout=20).json()
        dom = requests.post(f"{API}/quotes/travel",
                            json=_payload(travel_product["id"], region="domestic",
                                          destinations=[], addons=[]),
                            headers=demo_headers, timeout=20).json()
        assert dom["total"] < intl["total"]

    def test_requires_auth(self, travel_product):
        r = requests.post(f"{API}/quotes/travel",
                          json=_payload(travel_product["id"]),
                          timeout=20)
        assert r.status_code in (401, 403)


# === GET /api/profile/quick-fill ===
class TestQuickFillProfile:
    def test_no_auth_blocks(self):
        r = requests.get(f"{API}/profile/quick-fill", timeout=20)
        assert r.status_code in (401, 403)

    def test_demo_has_data(self, demo_headers):
        r = requests.get(f"{API}/profile/quick-fill",
                         headers=demo_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["has_data", "source_count", "full_name", "id_type",
                  "id_number", "phone", "email", "address", "city",
                  "state", "postcode", "date_of_birth", "gender",
                  "nationality", "occupation_class", "passport_number",
                  "ic_number", "last_product_category"]:
            assert k in d, f"missing key {k}"
        # demo has seeded prior policy + we just created a quote above
        assert d["has_data"] is True
        assert d["source_count"] >= 1
