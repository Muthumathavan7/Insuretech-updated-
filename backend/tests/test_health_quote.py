"""Health Secure+ (Critical Safe+) — backend quote + issue policy tests."""
import os
import pytest
import requests
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/") + "/api"


@pytest.fixture(scope="module")
def customer_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/auth/login", json={"email": "demo@insurtech.io", "password": "Demo@123"})
    assert r.status_code == 200, r.text
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


@pytest.fixture(scope="module")
def health_product():
    r = requests.get(f"{BASE_URL}/products?category=health")
    assert r.status_code == 200
    items = r.json()
    assert items and items[0]["name"] == "Health Secure Plus"
    return items[0]


# --- Product seed / meta ---
class TestProductSeed:
    def test_health_product_seed(self, health_product):
        p = health_product
        assert p["base_premium"] == 22.0
        assert p["coverage_amount"] == 100000
        meta = p.get("meta") or {}
        assert len(meta["coverage_options"]) == 3
        keys = {o["key"] for o in meta["coverage_options"]}
        assert keys == {"top2", "top5", "ci39"}
        assert len(meta["plans"]) == 5
        plan_keys = {p["key"] for p in meta["plans"]}
        assert plan_keys == {"plan1", "plan2", "plan3", "plan4", "plan5"}
        sums = {p["key"]: p["sum_insured"] for p in meta["plans"]}
        assert sums == {"plan1": 20000, "plan2": 50000, "plan3": 100000, "plan4": 150000, "plan5": 200000}
        assert "age_loading" in meta
        assert set(meta["age_loading"].keys()) == {"15-29", "30-39", "40-49", "50-60"}


# --- Quote math + rule validations ---
class TestHealthQuote:
    def _payload(self, pid, **overrides):
        body = {
            "product_id": pid,
            "coverage_option": "top5",
            "plan_key": "plan3",
            "full_name": "TEST_Health User",
            "id_type": "nric",
            "id_number": "960101081234",
            "date_of_birth": "1996-01-01",
            "gender": "male",
            "smoker": False,
            "email": "testhealth@example.com",
            "phone": "+60123456789",
            "malaysian_resident": True,
            "accept_privacy": True,
        }
        body.update(overrides)
        return body

    def test_quote_happy_path(self, customer_client, health_product):
        r = customer_client.post(f"{BASE_URL}/quotes/health", json=self._payload(health_product["id"]))
        assert r.status_code == 200, r.text
        q = r.json()
        # Expected: 22 * 1.8 * 1.0 * 1.3 = 51.48 gross
        assert abs(q["base_premium"] - 51.48) < 0.5, f"base_premium={q['base_premium']}"
        meta = q.get("meta") or {}
        assert abs(meta["online_discount"] - 7.72) < 0.5
        # Total should be around 47.26 (pre-rule) but rules may adjust; just sanity-check in band
        assert 40 < q["total"] < 70
        assert meta["coverage_option"]["label"] == "Top 5 Critical Illnesses"
        assert meta["plan"]["sum_insured"] == 100000
        # Age: 2026 - 1996 = 30
        assert meta["age"] in (29, 30)
        assert "rules_delta" in meta

    def test_quote_rejects_no_privacy(self, customer_client, health_product):
        r = customer_client.post(
            f"{BASE_URL}/quotes/health",
            json=self._payload(health_product["id"], accept_privacy=False),
        )
        assert r.status_code == 400
        assert "privacy" in r.text.lower()

    def test_quote_rejects_non_resident(self, customer_client, health_product):
        r = customer_client.post(
            f"{BASE_URL}/quotes/health",
            json=self._payload(health_product["id"], malaysian_resident=False),
        )
        assert r.status_code == 400

    def test_quote_rejects_age_above_60(self, customer_client, health_product):
        r = customer_client.post(
            f"{BASE_URL}/quotes/health",
            json=self._payload(health_product["id"], date_of_birth="1950-01-01"),
        )
        assert r.status_code == 400
        assert "maximum" in r.text.lower() or "age" in r.text.lower()

    def test_smoker_premium_is_higher(self, customer_client, health_product):
        r_ns = customer_client.post(f"{BASE_URL}/quotes/health", json=self._payload(health_product["id"]))
        r_sm = customer_client.post(
            f"{BASE_URL}/quotes/health",
            json=self._payload(health_product["id"], smoker=True),
        )
        assert r_ns.status_code == 200 and r_sm.status_code == 200
        ns_base = r_ns.json()["base_premium"]
        sm_base = r_sm.json()["base_premium"]
        # 30% higher on gross
        ratio = sm_base / ns_base
        assert 1.25 <= ratio <= 1.35, f"smoker ratio={ratio}"


# --- Issue policy from quote ---
class TestIssuePolicy:
    def test_issue_from_quote_health(self, customer_client, health_product):
        payload = {
            "product_id": health_product["id"],
            "coverage_option": "top5",
            "plan_key": "plan3",
            "full_name": "TEST_Policy Holder",
            "id_type": "nric",
            "id_number": "960101081235",
            "date_of_birth": "1996-01-01",
            "gender": "male",
            "smoker": False,
            "email": "testpol@example.com",
            "phone": "+60123456788",
            "malaysian_resident": True,
            "accept_privacy": True,
        }
        qr = customer_client.post(f"{BASE_URL}/quotes/health", json=payload)
        assert qr.status_code == 200
        qid = qr.json()["id"]
        ir = customer_client.post(f"{BASE_URL}/policies/issue-from-quote/{qid}")
        assert ir.status_code == 200, ir.text
        policy = ir.json()["policy"]
        assert policy["category"] == "health"
        assert policy["product_name"] == "Health Secure Plus"
        assert policy["policy_number"].startswith("HL-")
        # end = start + 1y
        start = datetime.fromisoformat(policy["start_date"].replace("Z", "+00:00"))
        end = datetime.fromisoformat(policy["end_date"].replace("Z", "+00:00"))
        diff_days = (end - start).days
        assert 360 <= diff_days <= 370, f"expected ~365, got {diff_days}"
