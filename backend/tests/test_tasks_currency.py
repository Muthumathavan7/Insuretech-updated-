"""Iteration 8 — Tests for Tasks CRUD, Users lookup, Google Calendar sync stub,
   Public settings endpoint, and Multi-currency PATCH /admin/settings.
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = "admin@insurtech.io"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- /api/settings/public (NO auth) ----------
class TestPublicSettings:
    def test_public_settings_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/settings/public", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "default_currency" in d
        assert "supported_currencies" in d
        assert isinstance(d["supported_currencies"], list)
        assert len(d["supported_currencies"]) >= 1
        codes = [c["code"] for c in d["supported_currencies"]]
        # MYR must always be present (base default)
        assert "MYR" in codes
        for c in d["supported_currencies"]:
            assert {"code", "symbol", "name", "rate"}.issubset(c.keys())


# ---------- PATCH /api/admin/settings — currency persistence ----------
class TestCurrencySettings:
    def test_patch_supported_currencies_and_persist(self, auth_headers):
        new_list = [
            {"code": "MYR", "symbol": "RM", "name": "Malaysian Ringgit", "rate": 1.0},
            {"code": "USD", "symbol": "$",  "name": "US Dollar",         "rate": 0.22},
            {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar",   "rate": 0.30},
        ]
        r = requests.patch(
            f"{BASE_URL}/api/admin/settings",
            json={"default_currency": "MYR", "supported_currencies": new_list},
            headers=auth_headers, timeout=15,
        )
        assert r.status_code == 200, r.text
        # Public endpoint must reflect change
        r2 = requests.get(f"{BASE_URL}/api/settings/public", timeout=15)
        assert r2.status_code == 200
        d = r2.json()
        codes = [c["code"] for c in d["supported_currencies"]]
        assert "CAD" in codes
        cad = next(c for c in d["supported_currencies"] if c["code"] == "CAD")
        assert cad["rate"] == 0.30
        assert cad["symbol"] == "C$"

    def test_reset_currencies_to_default(self, auth_headers):
        # Reset back to default (MYR-only minimal viable)
        default_list = [
            {"code": "MYR", "symbol": "RM", "name": "Malaysian Ringgit", "rate": 1.0},
            {"code": "USD", "symbol": "$",  "name": "US Dollar",         "rate": 0.21},
        ]
        r = requests.patch(
            f"{BASE_URL}/api/admin/settings",
            json={"default_currency": "MYR", "supported_currencies": default_list},
            headers=auth_headers, timeout=15,
        )
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/settings/public", timeout=15)
        assert r2.json()["default_currency"] == "MYR"


# ---------- /api/users (admin auth) ----------
class TestUsersLookup:
    def test_users_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/users", timeout=15)
        assert r.status_code in (401, 403)

    def test_users_paginated(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/users?page=1&limit=20", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert {"items", "total", "page", "limit"}.issubset(d.keys())
        assert isinstance(d["items"], list)
        assert d["total"] >= 1
        u = d["items"][0]
        # must NOT leak sensitive fields
        assert "password_hash" not in u and "_id" not in u
        assert "id" in u and "email" in u


# ---------- /api/tasks CRUD ----------
class TestTasksCRUD:
    created_task_id = None
    seeded_lead_id = None
    seeded_deal_id = None

    @classmethod
    def _seed_lead_and_deal(cls, headers):
        # create lead
        r = requests.post(
            f"{BASE_URL}/api/leads",
            json={"name": "TEST_TaskLead Co", "email": "test_tasklead@example.com",
                  "phone": "+60123456789", "pic_name": "TEST PIC", "pipeline_status": "new"},
            headers=headers, timeout=15,
        )
        assert r.status_code in (200, 201), r.text
        cls.seeded_lead_id = r.json().get("id")
        # create deal
        r = requests.post(
            f"{BASE_URL}/api/deals",
            json={"title": "TEST_TaskDeal", "value": 1000, "lead_id": cls.seeded_lead_id},
            headers=headers, timeout=15,
        )
        assert r.status_code in (200, 201), r.text
        cls.seeded_deal_id = r.json().get("id")

    def test_01_seed(self, auth_headers):
        TestTasksCRUD._seed_lead_and_deal(auth_headers)
        assert TestTasksCRUD.seeded_lead_id and TestTasksCRUD.seeded_deal_id

    def test_02_create_task_enriches_labels(self, auth_headers):
        payload = {
            "title": "TEST_FollowUpTask",
            "description": "Call back next week",
            "lead_id": TestTasksCRUD.seeded_lead_id,
            "deal_id": TestTasksCRUD.seeded_deal_id,
            "status": "pending",
            "priority": "high",
            "payment_status": "unpaid",
            "due_date": "2026-02-15",
        }
        r = requests.post(f"{BASE_URL}/api/tasks", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d["title"] == payload["title"]
        assert d["lead_id"] == payload["lead_id"]
        assert d["deal_id"] == payload["deal_id"]
        # Auto-enriched denormalized labels
        assert d.get("company_name") == "TEST_TaskLead Co"
        assert d.get("deal_name") == "TEST_TaskDeal"
        assert d.get("pic_name") == "TEST PIC"
        assert "id" in d
        TestTasksCRUD.created_task_id = d["id"]

    def test_03_list_tasks_pagination(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/tasks?page=1&limit=20", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert {"items", "total", "page", "limit", "total_pages"}.issubset(d.keys())
        assert d["total"] >= 1
        assert any(t["id"] == TestTasksCRUD.created_task_id for t in d["items"])

    def test_04_list_filter_by_lead(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/tasks?lead_id={TestTasksCRUD.seeded_lead_id}",
            headers=auth_headers, timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 1
        for t in d["items"]:
            assert t["lead_id"] == TestTasksCRUD.seeded_lead_id

    def test_05_list_filter_by_search(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/tasks?search=FollowUp", headers=auth_headers, timeout=15,
        )
        assert r.status_code == 200
        assert any(
            "FollowUp" in (t.get("title") or "")
            for t in r.json()["items"]
        )

    def test_06_update_task_persists(self, auth_headers):
        tid = TestTasksCRUD.created_task_id
        r = requests.put(
            f"{BASE_URL}/api/tasks/{tid}",
            json={"status": "in_progress", "payment_status": "paid", "priority": "low"},
            headers=auth_headers, timeout=15,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "in_progress"
        assert d["payment_status"] == "paid"
        # GET to verify persistence
        r2 = requests.get(f"{BASE_URL}/api/tasks?page=1&limit=200", headers=auth_headers, timeout=15)
        item = next((t for t in r2.json()["items"] if t["id"] == tid), None)
        assert item and item["status"] == "in_progress" and item["payment_status"] == "paid"

    def test_07_calendar_sync_400_when_keys_missing(self, auth_headers):
        # First ensure google_oauth keys are blank
        requests.patch(
            f"{BASE_URL}/api/admin/settings",
            json={"google_oauth_client_id": "", "google_oauth_client_secret": ""},
            headers=auth_headers, timeout=15,
        )
        r = requests.post(
            f"{BASE_URL}/api/google-calendar/sync-task/{TestTasksCRUD.created_task_id}",
            headers=auth_headers, timeout=15,
        )
        assert r.status_code == 400, r.text
        body = r.json()
        msg = (body.get("detail") or body.get("message") or "").lower()
        assert "google" in msg or "calendar" in msg or "configured" in msg

    def test_08_calendar_sync_200_when_keys_present(self, auth_headers):
        # Set fake but non-empty keys
        requests.patch(
            f"{BASE_URL}/api/admin/settings",
            json={"google_oauth_client_id": "fake_client_id_test",
                  "google_oauth_client_secret": "fake_secret_test"},
            headers=auth_headers, timeout=15,
        )
        r = requests.post(
            f"{BASE_URL}/api/google-calendar/sync-task/{TestTasksCRUD.created_task_id}",
            headers=auth_headers, timeout=15,
        )
        assert r.status_code == 200, r.text
        # verify calendar_synced persisted on task
        r2 = requests.get(f"{BASE_URL}/api/tasks?page=1&limit=200", headers=auth_headers, timeout=15)
        item = next((t for t in r2.json()["items"] if t["id"] == TestTasksCRUD.created_task_id), None)
        assert item and item.get("calendar_synced") is True
        # Cleanup keys
        requests.patch(
            f"{BASE_URL}/api/admin/settings",
            json={"google_oauth_client_id": "", "google_oauth_client_secret": ""},
            headers=auth_headers, timeout=15,
        )

    def test_09_delete_task(self, auth_headers):
        tid = TestTasksCRUD.created_task_id
        r = requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers=auth_headers, timeout=15)
        assert r.status_code in (200, 204)
        # verify gone
        r2 = requests.get(f"{BASE_URL}/api/tasks?page=1&limit=200", headers=auth_headers, timeout=15)
        assert not any(t["id"] == tid for t in r2.json()["items"])


# ---------- Cleanup ----------
class TestZCleanup:
    def test_cleanup_seed_data(self, auth_headers):
        if TestTasksCRUD.seeded_deal_id:
            requests.delete(f"{BASE_URL}/api/deals/{TestTasksCRUD.seeded_deal_id}",
                            headers=auth_headers, timeout=15)
        if TestTasksCRUD.seeded_lead_id:
            requests.delete(f"{BASE_URL}/api/leads/{TestTasksCRUD.seeded_lead_id}",
                            headers=auth_headers, timeout=15)
