"""Tests for new endpoints introduced in this iteration:
   - GET /api/leads/export/csv
   - GET /api/lookup/companies
   - PUT /api/lead-deal-linkages/{id}
   - DELETE /api/lead-deal-linkages/{id}
   - POST /api/deals/{id}/knowledge-base/upload
"""
import io
import os
import csv
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tune-core.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@insurtech.io", "password": "Admin@123"}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


ST = {}


# ---------------- Setup: seed lead + deal ----------------
class TestSetup:
    def test_create_lead(self, s, admin_token):
        r = s.post(f"{API}/leads",
                   json={"name": "TEST_PipelineLead", "pic_name": "PIC1",
                         "email": "TEST_pipe@x.com", "phone": "+60123",
                         "state": "Selangor", "industry": "Tech",
                         "pipeline_status": "new", "notes": "from-pipeline-test"},
                   headers=H(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        ST["lead_id"] = r.json()["id"]

    def test_create_deal(self, s, admin_token):
        r = s.post(f"{API}/deals",
                   json={"title": "TEST_PipelineDeal", "value": 1234.0, "stage": "lead"},
                   headers=H(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        ST["deal_id"] = r.json()["id"]

    def test_create_linkage(self, s, admin_token):
        r = s.post(f"{API}/lead-deal-linkages",
                   json={"lead_id": ST["lead_id"], "deal_id": ST["deal_id"],
                         "pipeline_status": "lead"},
                   headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        ST["linkage_id"] = r.json()["id"]


# ---------------- CSV EXPORT ----------------
class TestCSVExport:
    def test_export_csv_returns_csv(self, s, admin_token):
        r = s.get(f"{API}/leads/export/csv", headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "")
        assert "text/csv" in ct, f"unexpected content-type: {ct}"
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd and ".csv" in cd

        text = r.content.decode("utf-8")
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        assert len(rows) >= 2, "should have header + at least one row"
        header = rows[0]
        expected = ["name", "pic_name", "title", "email", "phone", "office_number",
                    "ic_number", "passport_number", "country", "state", "city",
                    "postcode", "address", "industry", "company_size", "website",
                    "source", "pipeline_status", "status", "ai_score", "owner_name",
                    "notes", "created_at"]
        assert header == expected, f"header mismatch: {header}"

        # Check our seed lead is present somewhere
        flat = "\n".join([",".join(r) for r in rows[1:]])
        assert "TEST_PipelineLead" in flat

    def test_export_csv_requires_auth(self, s):
        r = s.get(f"{API}/leads/export/csv", timeout=15)
        assert r.status_code in (401, 403)


# ---------------- LOOKUP COMPANIES ----------------
class TestLookupCompanies:
    def test_companies_shape(self, s, admin_token):
        r = s.get(f"{API}/lookup/companies", headers=H(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "companies" in d
        assert isinstance(d["companies"], list)
        assert len(d["companies"]) >= 1
        first = d["companies"][0]
        for k in ("id", "name", "pic_name", "state"):
            assert k in first, f"missing {k} in {first}"
        # find our seed lead
        assert any(c["id"] == ST["lead_id"] for c in d["companies"])


# ---------------- LINKAGE PUT/DELETE ----------------
class TestLinkageUpdateDelete:
    def test_put_linkage_updates_pipeline_status(self, s, admin_token):
        r = s.put(f"{API}/lead-deal-linkages/{ST['linkage_id']}",
                  json={"pipeline_status": "qualified"},
                  headers=H(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["pipeline_status"] == "qualified"
        # GET to verify persistence
        g = s.get(f"{API}/lead-deal-linkages?lead_id={ST['lead_id']}",
                  headers=H(admin_token), timeout=15)
        items = g.json()
        match = [x for x in items if x["id"] == ST["linkage_id"]]
        assert match and match[0]["pipeline_status"] == "qualified"

    def test_put_linkage_drag_to_negotiation(self, s, admin_token):
        r = s.put(f"{API}/lead-deal-linkages/{ST['linkage_id']}",
                  json={"pipeline_status": "negotiation"},
                  headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["pipeline_status"] == "negotiation"

    def test_delete_linkage_removes(self, s, admin_token):
        r = s.delete(f"{API}/lead-deal-linkages/{ST['linkage_id']}",
                     headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("deleted") is True
        g = s.get(f"{API}/lead-deal-linkages?lead_id={ST['lead_id']}",
                  headers=H(admin_token), timeout=15)
        ids = [x["id"] for x in g.json()]
        assert ST["linkage_id"] not in ids


# ---------------- KNOWLEDGE BASE UPLOAD ----------------
class TestKnowledgeBaseUpload:
    def test_upload_kb_file_persists(self, s, admin_token):
        content = b"This is a test knowledge base document for the deal."
        files = {"file": ("kb.txt", io.BytesIO(content), "text/plain")}
        r = s.post(f"{API}/deals/{ST['deal_id']}/knowledge-base/upload",
                   files=files,
                   headers={"Authorization": f"Bearer {admin_token}"},
                   timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("uploaded") is True
        assert d.get("filename") == "kb.txt"
        assert d.get("size") == len(content)
        # Verify persisted on the deal doc
        g = s.get(f"{API}/deals/{ST['deal_id']}", headers=H(admin_token), timeout=15)
        assert g.status_code == 200
        deal = g.json()
        assert deal.get("knowledge_base_filename") == "kb.txt"
        assert "test knowledge base document" in (deal.get("knowledge_base_content") or "")


# ---------------- CLEANUP ----------------
class TestCleanup:
    def test_cleanup(self, s, admin_token):
        s.delete(f"{API}/deals/{ST['deal_id']}", headers=H(admin_token), timeout=15)
        s.delete(f"{API}/leads/{ST['lead_id']}", headers=H(admin_token), timeout=15)
