"""Sales CRM router tests — Leads, Deals, Linkages, Tasks, Activities,
AI Agents, AI Calls, WhatsApp, Meetings, Lookup, Admin Settings extension.

Tests graceful degradation: integrations should return success=false
with descriptive errors when keys are not configured."""
import io
import os
import pytest
import requests
from openpyxl import Workbook

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tune-core.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@insurtech.io", "password": "Admin@123"}
DEMO = {"email": "demo@insurtech.io", "password": "Demo@123"}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def demo_token(s):
    r = s.post(f"{API}/auth/login", json=DEMO, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# Module-level state to chain tests
ST = {}


# ---------------- LEADS ----------------
class TestLeadsCRUD:
    def test_create_lead_with_new_fields(self, s, admin_token):
        payload = {
            "name": "TEST_AcmeCorp",
            "pic_name": "Alice TestPIC",
            "ic_number": "990101-12-3456",
            "passport_number": "A12345678",
            "phone": "+60123456789",
            "email": "TEST_acme@example.com",
            "country": "Malaysia",
            "state": "Selangor",
            "city": "Petaling Jaya",
            "pipeline_status": "new",
            "industry": "Tech",
            "notes": "Initial contact via web form",
        }
        r = s.post(f"{API}/leads", json=payload, headers=H(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_AcmeCorp"
        assert d["ic_number"] == "990101-12-3456"
        assert d["passport_number"] == "A12345678"
        assert d["pic_name"] == "Alice TestPIC"
        assert d["pipeline_status"] == "new"
        assert isinstance(d.get("ai_score"), int)
        assert 0 <= d["ai_score"] <= 100
        assert "id" in d and "_id" not in d
        ST["lead_id"] = d["id"]

    def test_create_lead_missing_name_400(self, s, admin_token):
        r = s.post(f"{API}/leads", json={"pic_name": "x"}, headers=H(admin_token), timeout=15)
        assert r.status_code == 400

    def test_get_lead_by_id(self, s, admin_token):
        r = s.get(f"{API}/leads/{ST['lead_id']}", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == ST["lead_id"]
        assert d["name"] == "TEST_AcmeCorp"

    def test_list_leads_pagination_filter_search(self, s, admin_token):
        r = s.get(f"{API}/leads?page=1&limit=5", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("items", "total", "page", "limit", "total_pages"):
            assert k in d
        assert d["page"] == 1 and d["limit"] == 5

        # search
        r2 = s.get(f"{API}/leads?search=TEST_Acme", headers=H(admin_token), timeout=15)
        assert r2.status_code == 200
        ids = [it["id"] for it in r2.json()["items"]]
        assert ST["lead_id"] in ids

        # status filter
        r3 = s.get(f"{API}/leads?pipeline_status=new", headers=H(admin_token), timeout=15)
        assert r3.status_code == 200
        assert all(it["pipeline_status"] == "new" for it in r3.json()["items"])

        # state filter
        r4 = s.get(f"{API}/leads?state=Selangor", headers=H(admin_token), timeout=15)
        assert r4.status_code == 200

    def test_update_lead_persists(self, s, admin_token):
        r = s.put(f"{API}/leads/{ST['lead_id']}",
                  json={"name": "TEST_AcmeCorp", "pic_name": "Alice TestPIC", "phone": "+60123456789",
                        "email": "TEST_updated@example.com", "pipeline_status": "contacted"},
                  headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == "TEST_updated@example.com"
        assert d["pipeline_status"] == "contacted"
        # GET to verify persistence
        g = s.get(f"{API}/leads/{ST['lead_id']}", headers=H(admin_token), timeout=15).json()
        assert g["email"] == "TEST_updated@example.com"
        assert g["pipeline_status"] == "contacted"

    def test_refresh_score(self, s, admin_token):
        r = s.post(f"{API}/leads/{ST['lead_id']}/refresh-score", headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "ai_score" in d
        assert 0 <= d["ai_score"] <= 100

    def test_demo_user_forbidden(self, s, demo_token):
        r = s.get(f"{API}/leads", headers=H(demo_token), timeout=15)
        assert r.status_code == 403


# ---------------- ACTIVITIES ----------------
class TestActivities:
    def test_list_activities_includes_creation(self, s, admin_token):
        r = s.get(f"{API}/leads/{ST['lead_id']}/activities", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "activities" in d
        assert any(a.get("action") == "create" for a in d["activities"])

    def test_add_activity(self, s, admin_token):
        r = s.post(f"{API}/leads/{ST['lead_id']}/activities",
                   json={"type": "note", "description": "Called the lead", "notes": "Voicemail left"},
                   headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        # Verify list now contains it
        r2 = s.get(f"{API}/leads/{ST['lead_id']}/activities", headers=H(admin_token), timeout=15)
        assert any(a["description"] == "Called the lead" for a in r2.json()["activities"])


# ---------------- DEALS ----------------
class TestDeals:
    def test_create_and_list_deal(self, s, admin_token):
        r = s.post(f"{API}/deals",
                   json={"title": "TEST_Motor Insurance Deal", "value": 1500.00, "stage": "lead"},
                   headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        ST["deal_id"] = d["id"]
        assert d["title"] == "TEST_Motor Insurance Deal"

        lr = s.get(f"{API}/deals", headers=H(admin_token), timeout=15)
        assert lr.status_code == 200
        assert any(x["id"] == ST["deal_id"] for x in lr.json())

    def test_get_deal(self, s, admin_token):
        r = s.get(f"{API}/deals/{ST['deal_id']}", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == ST["deal_id"]

    def test_update_deal(self, s, admin_token):
        r = s.put(f"{API}/deals/{ST['deal_id']}",
                  json={"value": 2000.00, "stage": "negotiation"},
                  headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["value"] == 2000.00
        assert r.json()["stage"] == "negotiation"

    def test_deal_agents(self, s, admin_token):
        r = s.get(f"{API}/deals/{ST['deal_id']}/agents", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "agents" in d
        assert "selection_mode" in d


# ---------------- LINKAGES ----------------
class TestLinkages:
    def test_create_and_upsert_linkage(self, s, admin_token):
        # initial create
        r = s.post(f"{API}/lead-deal-linkages",
                   json={"lead_id": ST["lead_id"], "deal_id": ST["deal_id"], "pipeline_status": "interested"},
                   headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        lk1 = r.json()
        # upsert: same pair → same id
        r2 = s.post(f"{API}/lead-deal-linkages",
                    json={"lead_id": ST["lead_id"], "deal_id": ST["deal_id"], "pipeline_status": "follow_up"},
                    headers=H(admin_token), timeout=15)
        assert r2.status_code == 200
        lk2 = r2.json()
        assert lk1["id"] == lk2["id"], "upsert should reuse same id"
        assert lk2["pipeline_status"] == "follow_up"

    def test_list_linkages_for_lead(self, s, admin_token):
        r = s.get(f"{API}/lead-deal-linkages?lead_id={ST['lead_id']}",
                  headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert any(x["lead_id"] == ST["lead_id"] and x["deal_id"] == ST["deal_id"] for x in items)


# ---------------- TASKS ----------------
class TestTasks:
    def test_create_task(self, s, admin_token):
        r = s.post(f"{API}/tasks",
                   json={"title": "TEST_Send proposal", "lead_id": ST["lead_id"], "deal_id": ST["deal_id"],
                         "priority": "high", "status": "pending"},
                   headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        ST["task_id"] = d["id"]
        assert d["lead_id"] == ST["lead_id"]
        assert d["title"] == "TEST_Send proposal"

    def test_list_tasks_by_lead(self, s, admin_token):
        r = s.get(f"{API}/tasks?lead_id={ST['lead_id']}", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        body = r.json()
        items = body["items"] if isinstance(body, dict) else body
        assert any(t["id"] == ST["task_id"] for t in items)


# ---------------- AI AGENTS ----------------
class TestAIAgents:
    def test_list_agents_empty_or_array(self, s, admin_token):
        r = s.get(f"{API}/ai-agents", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert "agents" in r.json()

    def test_create_agent_admin_only(self, s, admin_token):
        r = s.post(f"{API}/ai-agents",
                   json={"name": "TEST_Aura", "agent_id": "agent_abc", "description": "test agent"},
                   headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        ST["agent_id"] = r.json()["id"]

    def test_delete_agent(self, s, admin_token):
        r = s.delete(f"{API}/ai-agents/{ST['agent_id']}", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["deleted"] is True


# ---------------- AI CALLS (graceful degradation) ----------------
class TestAICalls:
    def test_initiate_without_keys_returns_failed(self, s, admin_token):
        r = s.post(f"{API}/ai-calls/initiate",
                   json={"lead_id": ST["lead_id"], "deal_id": ST["deal_id"], "agent_name": "TEST_Aura"},
                   headers=H(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # Without ElevenLabs keys → success=false but call doc is recorded
        assert d["success"] is False
        assert d.get("call") is not None
        assert d["call"]["status"] == "failed"
        assert d["call"]["lead_id"] == ST["lead_id"]
        assert d.get("message")  # descriptive error

    def test_list_lead_calls(self, s, admin_token):
        r = s.get(f"{API}/ai-calls/lead/{ST['lead_id']}", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert "calls" in r.json()
        assert len(r.json()["calls"]) >= 1


# ---------------- WHATSAPP (graceful degradation) ----------------
class TestWhatsApp:
    def test_send_without_twilio_returns_failed(self, s, admin_token):
        r = s.post(f"{API}/whatsapp/send",
                   json={"contact_id": ST["lead_id"], "phone": "+60123456789", "message": "TEST hello"},
                   headers=H(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "failed"
        assert d.get("error")

    def test_list_messages_includes_failed_attempt(self, s, admin_token):
        r = s.get(f"{API}/whatsapp/messages/{ST['lead_id']}", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        msgs = r.json()["messages"]
        assert any(m["message"] == "TEST hello" for m in msgs)


# ---------------- MEETINGS ----------------
class TestMeetings:
    def test_schedule_without_gmail_keys(self, s, admin_token):
        r = s.post(f"{API}/meetings/schedule",
                   json={"lead_id": ST["lead_id"], "title": "TEST Demo Call",
                         "date": "2030-01-15", "start_time": "14:00", "duration_minutes": 30},
                   headers=H(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["meeting"]["title"] == "TEST Demo Call"
        # invite_sent should be False since gmail not configured (lead has email)
        assert d["invite_sent"] is False

    def test_schedule_invalid_date(self, s, admin_token):
        r = s.post(f"{API}/meetings/schedule",
                   json={"lead_id": ST["lead_id"], "title": "Bad",
                         "date": "not-a-date", "start_time": "14:00"},
                   headers=H(admin_token), timeout=15)
        assert r.status_code == 400

    def test_list_meetings(self, s, admin_token):
        r = s.get(f"{API}/meetings/lead/{ST['lead_id']}", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert "meetings" in r.json()
        assert len(r.json()["meetings"]) >= 1


# ---------------- LOOKUP ----------------
class TestLookup:
    def test_states(self, s, admin_token):
        r = s.get(f"{API}/lookup/states", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "states" in d
        assert "Selangor" in d["states"]


# ---------------- IMPORT ----------------
class TestImport:
    def test_import_xlsx_correct(self, s, admin_token):
        wb = Workbook()
        ws = wb.active
        ws.append(["name", "pic_name", "email", "phone", "ic_number", "state"])
        ws.append(["TEST_Imp_A", "Bob Imp", "TEST_impA@x.com", "+60111", "I1", "Penang"])
        ws.append(["TEST_Imp_B", "Carol Imp", "TEST_impB@x.com", "+60222", "I2", "Johor"])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        files = {"file": ("leads.xlsx", buf,
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        r = s.post(f"{API}/leads/import", files=files,
                   headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["imported_count"] == 2


def admin_token_fixture_value():
    # placeholder helper; real flow uses admin_token fixture
    return ""


# ---------------- ADMIN SETTINGS EXTENSION ----------------
class TestAdminSettingsExtended:
    def test_get_settings_has_new_fields(self, s, admin_token):
        r = s.get(f"{API}/admin/settings", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in (
            "twilio_account_sid", "twilio_auth_token_masked", "twilio_auth_token_set",
            "twilio_phone_number", "twilio_whatsapp_from",
            "elevenlabs_api_key_masked", "elevenlabs_api_key_set",
            "elevenlabs_default_agent_id", "elevenlabs_phone_number_id",
            "gmail_smtp_user", "gmail_smtp_app_password_masked", "gmail_smtp_app_password_set",
            "gmail_sender_name", "google_oauth_client_id",
            "google_oauth_client_secret_masked", "google_oauth_client_secret_set",
            # regression: stripe still there
            "stripe_publishable_key", "stripe_secret_key_masked", "stripe_enabled",
        ):
            assert k in d, f"missing field {k}"

    def test_patch_new_fields_persist_and_mask(self, s, admin_token):
        secret_token = "TWILIO_SUPERSECRET_VALUE_XXX"
        eleven = "EL_API_KEY_FAKE_999"
        gmail_pwd = "gmailapppwd_TEST_777"
        r = s.patch(f"{API}/admin/settings",
                    json={
                        "twilio_account_sid": "ACtest123",
                        "twilio_auth_token": secret_token,
                        "twilio_phone_number": "+15005550006",
                        "twilio_whatsapp_from": "+14155238886",
                        "elevenlabs_api_key": eleven,
                        "elevenlabs_default_agent_id": "agent_test_xyz",
                        "elevenlabs_phone_number_id": "phn_test_abc",
                        "gmail_smtp_user": "sender@example.com",
                        "gmail_smtp_app_password": gmail_pwd,
                        "gmail_sender_name": "TEST CRM",
                        "google_oauth_client_id": "client_id_test",
                        "google_oauth_client_secret": "client_secret_test_VAL",
                    },
                    headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        # verify masked + set flags
        g = s.get(f"{API}/admin/settings", headers=H(admin_token), timeout=15).json()
        assert g["twilio_account_sid"] == "ACtest123"
        assert g["twilio_auth_token_set"] is True
        assert secret_token not in str(g)  # never leak plain secret
        assert g["elevenlabs_api_key_set"] is True
        assert eleven not in str(g)
        assert g["gmail_smtp_app_password_set"] is True
        assert gmail_pwd not in str(g)
        assert g["elevenlabs_default_agent_id"] == "agent_test_xyz"
        assert g["gmail_sender_name"] == "TEST CRM"
        # Stripe regression untouched
        assert "stripe_enabled" in g

    def test_clear_secret_with_empty_string(self, s, admin_token):
        r = s.patch(f"{API}/admin/settings",
                    json={"twilio_auth_token": "", "elevenlabs_api_key": "",
                          "gmail_smtp_app_password": "", "google_oauth_client_secret": ""},
                    headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        g = s.get(f"{API}/admin/settings", headers=H(admin_token), timeout=15).json()
        assert g["twilio_auth_token_set"] is False
        assert g["elevenlabs_api_key_set"] is False
        assert g["gmail_smtp_app_password_set"] is False

    def test_non_admin_forbidden(self, s, demo_token):
        r = s.get(f"{API}/admin/settings", headers=H(demo_token), timeout=15)
        assert r.status_code == 403


# ---------------- CONVERSION ----------------
class TestConvert:
    def test_convert_to_customer(self, s, admin_token):
        r = s.post(f"{API}/leads/{ST['lead_id']}/convert",
                   json={"services": [{"name": "Travel Insurance", "premium": 250}]},
                   headers=H(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["source_lead_id"] == ST["lead_id"]
        assert c["name"] == "TEST_AcmeCorp"
        # Lead is marked converted
        g = s.get(f"{API}/leads/{ST['lead_id']}", headers=H(admin_token), timeout=15).json()
        assert g["converted_to_customer"] is True


# ---------------- CLEANUP ----------------
class TestCleanup:
    def test_delete_lead(self, s, admin_token):
        r = s.delete(f"{API}/leads/{ST['lead_id']}", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        # Verify gone
        g = s.get(f"{API}/leads/{ST['lead_id']}", headers=H(admin_token), timeout=15)
        assert g.status_code == 404

    def test_delete_deal(self, s, admin_token):
        r = s.delete(f"{API}/deals/{ST['deal_id']}", headers=H(admin_token), timeout=15)
        assert r.status_code == 200

    def test_purge_test_imported_leads(self, s, admin_token):
        r = s.get(f"{API}/leads?search=TEST_Imp", headers=H(admin_token), timeout=15)
        for it in r.json().get("items", []):
            s.delete(f"{API}/leads/{it['id']}", headers=H(admin_token), timeout=10)
