# Insurance CRM Sales-Hub Replication — Implementation Notes

## What was added (this iteration)

### Backend (FastAPI)
- `services/ai_services.py` — ElevenLabs Conversational AI calls + Twilio WhatsApp + Gmail SMTP
  meeting-invite sender. **All keys pulled from `db.settings`** (admin-configured).
- `routers/sales_crm.py` — Single consolidated router exposing:
  - `POST/GET/PUT/DELETE /api/leads` (paginated list, search, status & state filters)
  - `POST /api/leads/import` (Excel .xlsx via openpyxl)
  - `POST /api/leads/{id}/convert` (lead → customer)
  - `POST /api/leads/{id}/refresh-score`
  - `GET/POST /api/leads/{id}/activities`
  - `GET/POST/PUT/DELETE /api/deals`, `GET /api/deals/{id}/agents`
  - `GET/POST /api/lead-deal-linkages`
  - `POST/GET /api/tasks`
  - `GET/POST/DELETE /api/ai-agents`
  - `POST /api/ai-calls/initiate`, `GET /api/ai-calls/lead/{id}`, `GET /api/ai-calls/{id}/details`,
    `GET /api/ai-calls/{id}/audio`, `PUT /api/ai-calls/{id}/interest`
  - `GET /api/whatsapp/messages/{lead_id}`, `POST /api/whatsapp/send`
  - `GET /api/meetings/lead/{id}`, `POST /api/meetings/schedule`
  - `GET /api/lookup/states`
- Extended `routers/admin.py` settings to include Twilio (sid, token, phone, whatsapp_from),
  ElevenLabs (api_key, default_agent_id, phone_number_id), Gmail SMTP
  (user, app_password, sender_name), and Google OAuth client placeholder.

### Frontend (React)
- New components in `/components/elstar/`: Modal, SlideInPanel, Pagination, ActionDropdown
- New pages in `/admin/`:
  - `Leads.jsx` (1300+ lines) — paginated list, search, filters, bulk-select, AI calling +
    WhatsApp batch, Excel import, convert-to-customer, action dropdown per row.
    **Adapted: "Clinic Name" → "Customer Name", added IC + Passport fields.**
  - `LeadDetailPage.jsx` (2100+ lines) — full lead 360 with activity timeline, pipeline status
    update, deal selection, WhatsApp chat, AI call modal, schedule meeting modal,
    audio player for call recordings.
- Routes:
  - `/admin/leads` → Leads list
  - `/admin/leads/:id` → Lead detail page
  - `/admin/leads-kanban` → original Kanban (kept)
- Updated `Settings.jsx` with sections for Twilio, ElevenLabs, Gmail SMTP, Google OAuth.
- `lib/auth.jsx` extended to expose `token` from context.
- `index.css` extended with Elstar component classes (cards, buttons, inputs, modals, etc.)
- `AdminLayout.jsx` sidebar updated.

## Test Credentials (unchanged)
- Admin: admin@insurtech.io / Admin@123
- Demo customer: demo@insurtech.io / Demo@123

## Notes for testing
- Backend integrations gracefully degrade: if Twilio/ElevenLabs/Gmail keys are absent in
  `db.settings`, endpoints return `{success: false, error: "..."}` rather than crashing.
- AI score is deterministic heuristic based on lead fields + pipeline stage.
- Convert-to-customer writes to `crm_customers` collection.
- Lead-deal-linkages ensure each lead has its own pipeline status per deal.
