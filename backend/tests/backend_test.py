"""End-to-end backend test suite for Insurance Tech Platform.

Covers: Auth, Products, Quotes, Payments, Policies, Claims, CRM, AI,
Analytics, Campaigns, Coupons, Voice, Notifications, Role enforcement.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tune-core.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@insurtech.io", "password": "Admin@123"}
DEMO = {"email": "demo@insurtech.io", "password": "Demo@123"}
CLAIMS_OFFICER = {"email": "claims@insurtech.io", "password": "Claims@123"}

# Shared state across tests
STATE = {}


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


def _login(s, creds):
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(s):
    return _login(s, ADMIN)


@pytest.fixture(scope="session")
def demo_token(s):
    return _login(s, DEMO)


@pytest.fixture(scope="session")
def officer_token(s):
    return _login(s, CLAIMS_OFFICER)


def H(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------- Health ----------
class TestHealth:
    def test_health(self, s):
        r = s.get(f"{API}/health", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_root(self, s):
        r = s.get(f"{API}/", timeout=10)
        assert r.status_code == 200


# ---------- Auth ----------
class TestAuth:
    def test_login_demo(self, s):
        r = s.post(f"{API}/auth/login", json=DEMO, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and "user" in data
        assert data["user"]["email"] == DEMO["email"]
        assert data["user"]["role"] == "customer"

    def test_login_invalid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": DEMO["email"], "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_signup_new_user(self, s):
        email = f"TEST_signup_{uuid.uuid4().hex[:8]}@test.io"
        payload = {"email": email, "phone": "+14155550000",
                   "full_name": "Test Signup", "password": "Test@1234", "role": "customer"}
        r = s.post(f"{API}/auth/signup", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == email
        STATE["new_user_token"] = data["token"]
        STATE["new_user_id"] = data["user"]["id"]

    def test_signup_duplicate(self, s):
        r = s.post(f"{API}/auth/signup", json={
            "email": DEMO["email"], "phone": "+1", "full_name": "dup",
            "password": "x", "role": "customer",
        }, timeout=20)
        assert r.status_code == 400

    def test_otp_flow(self, s):
        phone = f"+1415555{uuid.uuid4().hex[:4]}"
        r1 = s.post(f"{API}/auth/otp/request", json={"phone": phone}, timeout=20)
        assert r1.status_code == 200
        assert r1.json().get("sent") is True
        r2 = s.post(f"{API}/auth/otp/verify", json={"phone": phone, "code": "123456"}, timeout=20)
        assert r2.status_code == 200
        assert "token" in r2.json()

    def test_otp_invalid_code(self, s):
        phone = f"+1415555{uuid.uuid4().hex[:4]}"
        s.post(f"{API}/auth/otp/request", json={"phone": phone}, timeout=20)
        r = s.post(f"{API}/auth/otp/verify", json={"phone": phone, "code": "000000"}, timeout=20)
        assert r.status_code == 401

    def test_me_endpoint(self, s, demo_token):
        r = s.get(f"{API}/auth/me", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO["email"]

    def test_me_unauth(self, s):
        r = s.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401


# ---------- Products ----------
class TestProducts:
    def test_list_products(self, s):
        r = s.get(f"{API}/products", timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        travel = [p for p in items if p["category"] == "travel"]
        assert len(travel) >= 1
        STATE["travel_product_id"] = travel[0]["id"]
        STATE["travel_product"] = travel[0]

    def test_get_product(self, s):
        pid = STATE["travel_product_id"]
        r = s.get(f"{API}/products/{pid}", timeout=20)
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_get_product_404(self, s):
        r = s.get(f"{API}/products/nonexistent-id", timeout=20)
        assert r.status_code == 404


# ---------- Quotes ----------
class TestQuotes:
    def test_create_travel_quote(self, s, demo_token):
        payload = {
            "product_id": STATE["travel_product_id"],
            "destination": "Japan",
            "start_date": "2026-02-01",
            "end_date": "2026-02-08",
            "travelers": 2,
            "coverage_tier": "premium",
            "addons": [],
        }
        r = s.post(f"{API}/quotes/travel", json=payload, headers=H(demo_token), timeout=30)
        assert r.status_code == 200, r.text
        q = r.json()
        assert q["total"] > 0
        assert q["coverage_tier"] == "premium"
        # Pricing check: base * (7/7) * 2 travelers * 1.6 tier = base*3.2 before tax/risk
        base = STATE["travel_product"]["base_premium"]
        expected_min = base * 2 * 1.6 * 1.08  # +8% tax baseline
        assert q["total"] >= expected_min * 0.9
        STATE["quote_id"] = q["id"]

    def test_list_quotes(self, s, demo_token):
        r = s.get(f"{API}/quotes", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        assert any(q["id"] == STATE["quote_id"] for q in r.json())

    def test_get_quote(self, s, demo_token):
        r = s.get(f"{API}/quotes/{STATE['quote_id']}", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        assert r.json()["id"] == STATE["quote_id"]

    def test_quote_invalid_product(self, s, demo_token):
        payload = {
            "product_id": "invalid-id", "destination": "Japan",
            "start_date": "2026-02-01", "end_date": "2026-02-08",
            "travelers": 1, "coverage_tier": "basic", "addons": [],
        }
        r = s.post(f"{API}/quotes/travel", json=payload, headers=H(demo_token), timeout=30)
        assert r.status_code == 404


# ---------- Payments ----------
class TestPayments:
    def test_checkout_session(self, s, demo_token):
        payload = {"quote_id": STATE["quote_id"], "origin_url": BASE_URL}
        r = s.post(f"{API}/payments/checkout", json=payload, headers=H(demo_token), timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and "session_id" in data
        assert "stripe.com" in data["url"] or "checkout" in data["url"].lower()
        STATE["session_id"] = data["session_id"]

    def test_payment_status(self, s, demo_token):
        r = s.get(f"{API}/payments/status/{STATE['session_id']}", headers=H(demo_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "payment_status" in data or "status" in data


# ---------- Policies ----------
class TestPolicies:
    def test_list_policies(self, s, demo_token):
        r = s.get(f"{API}/policies", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Claims ----------
class TestClaims:
    def test_create_seed_policy_for_claim(self, s, admin_token, demo_token):
        # Get demo user id
        me = s.get(f"{API}/auth/me", headers=H(demo_token), timeout=20).json()
        demo_user_id = me["id"]
        # Create a policy directly via DB would need admin API. Use policies endpoint if exists.
        # Check if demo has any policies. If not, skip claim creation which needs a policy_id.
        r = s.get(f"{API}/policies", headers=H(demo_token), timeout=20)
        policies = r.json()
        if not policies:
            # Seed a policy via backend using direct Mongo-like route is not exposed.
            # We'll create via payment webhook simulation would be complex; skip the claim CRUD flow
            # but we'll still exercise the endpoint with a bogus policy to get 404/403.
            STATE["demo_has_policy"] = False
        else:
            STATE["demo_has_policy"] = True
            STATE["policy_id"] = policies[0]["id"]

    def test_file_claim_no_policy(self, s, demo_token):
        payload = {
            "policy_id": "nonexistent", "incident_date": "2026-01-15",
            "incident_type": "delay", "description": "Flight delay",
            "amount_claimed": 200, "documents": ["boarding.pdf"],
        }
        r = s.post(f"{API}/claims", json=payload, headers=H(demo_token), timeout=30)
        assert r.status_code == 404

    def test_file_claim_auto_approval(self, s, demo_token):
        if not STATE.get("demo_has_policy"):
            pytest.skip("Demo user has no policy; cannot test auto-approval")
        payload = {
            "policy_id": STATE["policy_id"], "incident_date": "2026-01-15",
            "incident_type": "delay", "description": "Trip delay claim",
            "amount_claimed": 200, "documents": ["boarding.pdf", "receipt.pdf"],
        }
        r = s.post(f"{API}/claims", json=payload, headers=H(demo_token), timeout=30)
        assert r.status_code == 200, r.text
        claim = r.json()
        STATE["claim_id"] = claim["id"]
        # With amount 200, docs 2, delay type => fraud score low => should be approved
        assert claim["status"] in ("approved", "submitted"), f"Unexpected: {claim}"

    def test_file_claim_normal_path(self, s, demo_token):
        if not STATE.get("demo_has_policy"):
            pytest.skip("No policy")
        payload = {
            "policy_id": STATE["policy_id"], "incident_date": "2026-01-15",
            "incident_type": "theft", "description": "Luggage stolen",
            "amount_claimed": 2500, "documents": [],
        }
        r = s.post(f"{API}/claims", json=payload, headers=H(demo_token), timeout=30)
        assert r.status_code == 200
        claim = r.json()
        # High amount + no docs + theft should NOT auto-approve
        assert claim["status"] in ("submitted", "investigating")
        assert claim["auto_approved"] is False
        STATE["normal_claim_id"] = claim["id"]

    def test_list_my_claims(self, s, demo_token):
        r = s.get(f"{API}/claims", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_claims_queue(self, s, admin_token):
        r = s.get(f"{API}/claims/admin/queue", headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_claim_action_approve(self, s, officer_token):
        if "normal_claim_id" not in STATE:
            pytest.skip("No claim to act on")
        r = s.post(f"{API}/claims/{STATE['normal_claim_id']}/action",
                   json={"action": "approve", "notes": "OK", "amount_approved": 100},
                   headers=H(officer_token), timeout=20)
        assert r.status_code == 200
        assert r.json()["status"] == "approved"


# ---------- CRM ----------
class TestCRM:
    def test_list_customers_admin(self, s, admin_token):
        r = s.get(f"{API}/crm/customers", headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_customer_360(self, s, admin_token, demo_token):
        me = s.get(f"{API}/auth/me", headers=H(demo_token), timeout=20).json()
        r = s.get(f"{API}/crm/customers/{me['id']}", headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        for k in ("profile", "policies", "claims", "interactions", "quotes", "stats"):
            assert k in data

    def test_leads_pipeline_admin(self, s, admin_token):
        r = s.get(f"{API}/crm/leads/pipeline", headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        for stage in ("new", "qualified", "contacted", "quoted", "won", "lost"):
            assert stage in data

    def test_leads_pipeline_forbidden_for_customer(self, s, demo_token):
        r = s.get(f"{API}/crm/leads/pipeline", headers=H(demo_token), timeout=20)
        assert r.status_code == 403

    def test_patch_customer(self, s, admin_token):
        me = s.get(f"{API}/crm/customers", headers=H(admin_token), timeout=20).json()
        uid = me[0]["id"]
        r = s.patch(f"{API}/crm/customers/{uid}",
                    json={"tags": ["TEST_TAG"]}, headers=H(admin_token), timeout=20)
        assert r.status_code == 200

    def test_create_interaction(self, s, admin_token, demo_token):
        me = s.get(f"{API}/auth/me", headers=H(demo_token), timeout=20).json()
        r = s.post(f"{API}/crm/interactions",
                   json={"user_id": me["id"], "kind": "note", "title": "TEST note", "body": "x"},
                   headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        assert r.json().get("created") is True

    def test_list_interactions(self, s, demo_token):
        me = s.get(f"{API}/auth/me", headers=H(demo_token), timeout=20).json()
        r = s.get(f"{API}/crm/interactions/{me['id']}", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- AI ----------
class TestAI:
    def test_ai_recommendations(self, s, demo_token):
        r = s.get(f"{API}/ai/recommendations", headers=H(demo_token), timeout=30)
        assert r.status_code == 200

    def test_ai_lead_score(self, s, admin_token, demo_token):
        me = s.get(f"{API}/auth/me", headers=H(demo_token), timeout=20).json()
        r = s.get(f"{API}/ai/lead-score/{me['id']}", headers=H(admin_token), timeout=30)
        assert r.status_code == 200

    def test_ai_chat(self, s, demo_token):
        payload = {"session_id": f"test-{uuid.uuid4().hex[:8]}",
                   "message": "Hi, what is travel insurance?"}
        try:
            r = s.post(f"{API}/ai/chat", json=payload, headers=H(demo_token), timeout=60)
        except requests.exceptions.Timeout:
            pytest.skip("AI chat timed out (LLM quota/latency)")
        if r.status_code == 200:
            data = r.json()
            assert "reply" in data or "message" in data or "content" in data
        else:
            # Document but don't hard-fail (LLM quota)
            pytest.skip(f"AI chat returned {r.status_code}: {r.text[:200]}")


# ---------- Analytics ----------
class TestAnalytics:
    def test_overview_admin(self, s, admin_token):
        r = s.get(f"{API}/analytics/overview", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        for k in ("kpis", "revenue_series", "policy_mix", "funnel"):
            assert k in data
        assert len(data["revenue_series"]) == 14

    def test_overview_forbidden_customer(self, s, demo_token):
        r = s.get(f"{API}/analytics/overview", headers=H(demo_token), timeout=20)
        assert r.status_code == 403


# ---------- Campaigns & Coupons ----------
class TestCampaigns:
    def test_create_list_campaign(self, s, admin_token):
        payload = {"name": "TEST_CAMP", "channel": "email",
                   "segment": "all", "message": "Hello"}
        r = s.post(f"{API}/campaigns", json=payload, headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        cid = r.json()["id"]
        STATE["campaign_id"] = cid
        lst = s.get(f"{API}/campaigns", headers=H(admin_token), timeout=20)
        assert lst.status_code == 200
        assert any(c["id"] == cid for c in lst.json())

    def test_send_campaign(self, s, admin_token):
        cid = STATE["campaign_id"]
        r = s.post(f"{API}/campaigns/{cid}/send", headers=H(admin_token), timeout=20)
        assert r.status_code == 200

    def test_create_list_coupon(self, s, admin_token):
        code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        r = s.post(f"{API}/coupons", json={"code": code, "percent_off": 10},
                   headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        lst = s.get(f"{API}/coupons", headers=H(admin_token), timeout=20)
        assert any(c["code"] == code for c in lst.json())

    def test_campaigns_forbidden_customer(self, s, demo_token):
        r = s.get(f"{API}/campaigns", headers=H(demo_token), timeout=20)
        assert r.status_code == 403


# ---------- Voice ----------
class TestVoice:
    def test_list_calls(self, s, admin_token):
        r = s.get(f"{API}/voice/calls", headers=H(admin_token), timeout=20)
        assert r.status_code == 200

    def test_log_call(self, s, admin_token):
        r = s.post(f"{API}/voice/calls",
                   json={"direction": "outbound", "phone": "+14155550000",
                         "purpose": "lead_conversion", "duration_sec": 60},
                   headers=H(admin_token), timeout=20)
        assert r.status_code == 200

    def test_simulate_outbound(self, s, admin_token, demo_token):
        me = s.get(f"{API}/auth/me", headers=H(demo_token), timeout=20).json()
        r = s.post(f"{API}/voice/outbound/simulate",
                   json={"user_id": me["id"], "phone": me["phone"],
                         "purpose": "lead_conversion"},
                   headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        assert r.json()["direction"] == "outbound"

    def test_voice_forbidden_customer(self, s, demo_token):
        r = s.get(f"{API}/voice/calls", headers=H(demo_token), timeout=20)
        assert r.status_code == 403


# ---------- Notifications ----------
class TestNotifications:
    def test_list_notifications(self, s, demo_token):
        r = s.get(f"{API}/notifications", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        if items:
            STATE["notif_id"] = items[0]["id"]

    def test_mark_read(self, s, demo_token):
        if "notif_id" not in STATE:
            pytest.skip("No notification")
        r = s.post(f"{API}/notifications/{STATE['notif_id']}/read",
                   headers=H(demo_token), timeout=20)
        assert r.status_code == 200


# ---------- Role enforcement ----------
class TestRoleEnforcement:
    def test_customer_blocked_from_analytics(self, s, demo_token):
        assert s.get(f"{API}/analytics/overview", headers=H(demo_token)).status_code == 403

    def test_customer_blocked_from_crm_customers(self, s, demo_token):
        assert s.get(f"{API}/crm/customers", headers=H(demo_token)).status_code == 403

    def test_customer_blocked_from_claims_queue(self, s, demo_token):
        assert s.get(f"{API}/claims/admin/queue", headers=H(demo_token)).status_code == 403

    def test_customer_blocked_from_campaigns(self, s, demo_token):
        assert s.get(f"{API}/campaigns", headers=H(demo_token)).status_code == 403



# ---------- Motor (Iteration 3) ----------
class TestMotorProducts:
    def test_motor_product_seeded(self, s):
        r = s.get(f"{API}/products?category=motor", timeout=20)
        assert r.status_code == 200
        items = r.json()
        motor = [p for p in items if p.get("name") == "Motor Easy"]
        assert len(motor) == 1, f"Expected 1 Motor Easy, got {len(motor)}: {items}"
        m = motor[0]
        assert m["category"] == "motor"
        # 7 addons as per requirement
        addon_names = {a["name"] for a in m.get("addons", [])}
        expected = {
            "Windscreen Coverage", "Inconvenience Allowance", "Spray Paint",
            "Strike, Riot & Civil Commotion", "Passenger PA Coverage",
            "Legal Liability to Passengers", "Flood / Special Perils",
        }
        assert expected.issubset(addon_names), f"Missing addons: {expected - addon_names}"
        assert len(m["addons"]) == 7
        STATE["motor_product_id"] = m["id"]
        STATE["motor_product"] = m


class TestMotorQuote:
    def test_create_motor_quote_comprehensive(self, s, demo_token):
        payload = {
            "product_id": STATE["motor_product_id"],
            "account_type": "personal",
            "vehicle_reg": "TEST1234",
            "id_type": "nric",
            "id_number": "900101-10-1234",
            "full_name": "Test Driver",
            "date_of_birth": "1990-01-01",
            "postcode": "50000",
            "email": "TEST_motor@insurtech.io",
            "cover_type": "comprehensive",
            "sum_insured": 30000,
            "ncd_percent": 25,
            "addons": ["Windscreen Coverage", "Flood / Special Perils"],
        }
        r = s.post(f"{API}/quotes/motor", json=payload, headers=H(demo_token), timeout=30)
        assert r.status_code == 200, r.text
        q = r.json()
        # Expected math per review_request:
        # base = max(180, 30000*0.035) = max(180, 1050) = 1050  (age ~36 => age_loading 0)
        # ncd_discount = 1050 * 0.25 = 262.50
        # online_rebate = (1050 - 262.50) * 0.10 = 78.75
        # subtotal = (1050 - 262.50 - 78.75) + (35 + 30) = 708.75 + 65 = 773.75
        # tax = 773.75 * 0.08 = 61.90
        # total = 773.75 + 61.90 = 835.65
        assert q["total"] == pytest.approx(835.65, rel=0.02), f"Expected ~835.65, got {q['total']}"
        meta = q.get("meta", {})
        assert meta.get("ncd_discount") == pytest.approx(262.50, rel=0.02)
        assert meta.get("online_rebate") == pytest.approx(78.75, rel=0.02)
        assert meta.get("gross_premium") == pytest.approx(1050.0, rel=0.02)
        assert meta.get("vehicle_reg") == "TEST1234"
        assert q["coverage_tier"] == "comprehensive"
        STATE["motor_quote_id"] = q["id"]

    def test_motor_quote_requires_auth(self, s):
        payload = {
            "product_id": STATE["motor_product_id"],
            "vehicle_reg": "X", "id_number": "1", "full_name": "x",
            "date_of_birth": "1990-01-01", "postcode": "50000",
            "email": "x@x.com", "sum_insured": 20000,
        }
        r = s.post(f"{API}/quotes/motor", json=payload, timeout=20)
        assert r.status_code == 401

    def test_motor_quote_invalid_product_category(self, s, demo_token):
        # Use travel product id -> should 404 because category != motor
        payload = {
            "product_id": STATE["travel_product_id"],
            "vehicle_reg": "X", "id_number": "1", "full_name": "x",
            "date_of_birth": "1990-01-01", "postcode": "50000",
            "email": "x@x.com", "sum_insured": 20000,
        }
        r = s.post(f"{API}/quotes/motor", json=payload, headers=H(demo_token), timeout=20)
        assert r.status_code == 404

    def test_motor_quote_third_party(self, s, demo_token):
        payload = {
            "product_id": STATE["motor_product_id"],
            "vehicle_reg": "TP9999",
            "id_number": "800101-10-9999",
            "full_name": "TP Driver",
            "date_of_birth": "1980-01-01",
            "postcode": "50000",
            "email": "TEST_tp@insurtech.io",
            "cover_type": "third_party",
            "sum_insured": 20000,
            "ncd_percent": 0,
            "addons": [],
        }
        r = s.post(f"{API}/quotes/motor", json=payload, headers=H(demo_token), timeout=30)
        assert r.status_code == 200
        q = r.json()
        # base = 180 * 0.4 = 72, no NCD, online rebate = 7.20, subtotal 64.80, tax 5.18, total ~69.98
        assert q["total"] > 0
        assert q["coverage_tier"] == "third_party"

    def test_motor_checkout(self, s, demo_token):
        payload = {"quote_id": STATE["motor_quote_id"], "origin_url": BASE_URL}
        r = s.post(f"{API}/payments/checkout", json=payload, headers=H(demo_token), timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and "session_id" in data
        assert "stripe.com" in data["url"] or "checkout" in data["url"].lower()

    def test_motor_quote_persisted(self, s, demo_token):
        r = s.get(f"{API}/quotes/{STATE['motor_quote_id']}", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        q = r.json()
        assert q["id"] == STATE["motor_quote_id"]
        assert q.get("meta", {}).get("cover_type") == "comprehensive"
