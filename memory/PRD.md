# PRD — Tune Protect · Insurance Technology Platform

## Original problem statement
Build a production-grade Insurance Technology Platform (Tune Protect style): CRM-first, AI-powered, modular. Must support lead generation → policy purchase → claims → retention, across Travel / Health / Motor / Device insurance products. Primary color #DEB25E (gold) + secondary #FFFFFF (white).

## Architecture — delivered (MVP Phase 1 + Phase 2 scaffolding)

- **Backend**: FastAPI monolith-as-modular with 9 routers (auth, crm, products, quotes, policies, claims, payments, ai, admin) + mongo only storage
- **Frontend**: React 19 + Tailwind + shadcn/ui + Recharts, gold/white design system (Outfit + Plus Jakarta Sans)
- **Integrations**: Stripe Checkout (`emergentintegrations`), Claude Sonnet 4.5 via EMERGENT_LLM_KEY, Twilio (placeholder scaffold)
- **Auth**: JWT + bcrypt + email/password + mocked phone OTP (code 123456), roles: customer, admin, agent, partner, claims_officer

## User personas
1. **Customer** — buys travel insurance, manages policies, files claims, chats with AI
2. **Agent** — reviews leads, updates CRM stages, makes outbound calls
3. **Claims Officer** — reviews claims queue, approves/rejects with fraud score
4. **Admin** — full access: analytics, products, campaigns, coupons, CRM
5. **Partner** — B2B2C API placeholder (not exposed to UI)

## Implemented (2026-04-28 — iteration 7B: CSV + Pipeline + WhatsApp)

### CSV Export on Leads
- New backend endpoint `GET /api/leads/export/csv` → returns text/csv attachment with 23 columns
  (name, pic_name, title, email, phone, office_number, ic_number, passport_number, country,
  state, city, postcode, address, industry, company_size, website, source, pipeline_status,
  status, ai_score, owner_name, notes, created_at)
- New frontend "Export CSV" button on `/admin/leads` toolbar (data-testid `export-csv-btn`)
  triggers download with filename `leads_YYYY-MM-DD.csv`

### Pipeline Page (replaces Leads-style Kanban)
- New frontend `/admin/pipeline` route — drag-drop kanban with 6 stages
  (lead, qualified, proposal, negotiation, sales_closed, lost) showing each lead-deal-linkage
  as a card. Drag a card to a column → PUT updates the linkage status.
- "Add Deal" slide-in panel: deal title/value/expected close date, knowledge base upload,
  link companies checkbox list, AI agent selection mode (round_robin/random/manual)
- Date filter dropdown (last 5/10/20/30 days / all)
- Backend additions: `GET /api/lookup/companies`, `PUT /api/lead-deal-linkages/{id}`,
  `DELETE /api/lead-deal-linkages/{id}`, `POST /api/deals/{id}/knowledge-base/upload`

### WhatsApp Page
- New frontend `/admin/whatsapp` route — full WhatsApp-style chat UI
  - Left pane: contacts list populated from leads (search + filter)
  - Right pane: chat with selected lead, message templates, send button
  - Calls existing `POST /api/whatsapp/send` and `GET /api/whatsapp/messages/{id}`
  - Graceful degradation toast when Twilio is unconfigured

### Sidebar Updates
- Added "Pipeline" (GitBranch icon → /admin/pipeline)
- Added "WhatsApp" (MessageCircle icon → /admin/whatsapp)
- Old Kanban kept at /admin/leads-kanban

**Test results**: 48/48 backend tests pass (37 sales_crm + 11 new pipeline_csv_kb).
Frontend verified end-to-end — CSV download, Pipeline 6 columns, WhatsApp contacts + send.

## Implemented (2026-02-27 → 2026-04-28 — iteration 7)

### Sales-Hub-CRM Leads Replication (NEW — iteration 7)
- **Replicated leads page + lead detail page** functionality from
  `github.com/muthurengan4/Sales-hub-CRM` into the admin panel, adapted for insurance:
  - "Clinic Name (Company Name)" → **"Customer Name"**
  - Added **IC Number** + **Passport Number** fields in PIC section
  - Kept all other labels (PIC = Person In Charge) intact
- **Backend** (`/app/backend/routers/sales_crm.py` + `services/ai_services.py`):
  - Full CRUD: `GET/POST/PUT/DELETE /api/leads` with pagination (page, limit), search,
    pipeline_status & state filters
  - Excel import via `openpyxl` at `POST /api/leads/import`
  - Convert to customer at `POST /api/leads/{id}/convert`
  - AI score refresh at `POST /api/leads/{id}/refresh-score` (deterministic heuristic)
  - Activity timeline `GET/POST /api/leads/{id}/activities`
  - Deals CRUD + Lead-Deal-Linkages + Tasks + AI Agents endpoints
  - Real Twilio WhatsApp send at `POST /api/whatsapp/send`
  - Real ElevenLabs Conversational AI outbound calls at `POST /api/ai-calls/initiate`
  - Real Gmail SMTP meeting invites with .ics calendar attachment at `POST /api/meetings/schedule`
  - All integration keys read from `db.settings` (admin-configured, never env)
  - Graceful degradation: missing keys return `{success:false, error:"..."}` rather than crashing
- **Frontend** (`/app/frontend/src/admin/`):
  - `Leads.jsx` — paginated table with search + filters + bulk-select + AI Calling +
    AI WhatsApp batch + Excel import + Convert-to-customer + per-row actions
  - `LeadDetailPage.jsx` — split layout: contact card / activity timeline + pipeline update + WhatsApp chat /
    activity summary + deals + AI score; Edit slide-in panel with IC + Passport;
    AI Call modal with agent selection; Schedule Meeting modal with online/offline & email invite
  - Settings page extended with **Twilio**, **ElevenLabs**, **Gmail SMTP**, **Google OAuth** (placeholder)
    sections, all secrets stored masked
  - Routes:
    - `/admin/leads` — new full Leads list (replaces old Kanban)
    - `/admin/leads/:id` — Lead detail page
    - `/admin/leads-kanban` — original Kanban (kept)
- **Components added**: `Modal`, `SlideInPanel`, `Pagination`, `ActionDropdown` under
  `/components/elstar/`. Elstar CSS classes added to `index.css`.
- **Auth context** now exposes `token` for legacy fetch-based components.
- **Test results**: Backend 37/37 NEW sales-CRM + 93/93 regression — all green.

## Implemented (2026-02-27 → 2026-04-27 — iteration 6)

### Admin-Configurable Stripe (NEW)
- `/admin/settings` — full Stripe configuration UI with status banner ("Using platform default" vs "Using your custom keys"), publishable key, secret key (password field + eye toggle), webhook signing secret, enabled toggle, Save + **Test connection** button (creates a real $1 Stripe session), Clear-stored-secret action, and a "Buy premium / Open customer flow" helper card linking to `/products`
- Backend: `settings` Mongo collection (singleton `app_settings`), `get_active_stripe_key()` helper prefers admin-stored key over env, secret keys are NEVER returned in plain — only masked (`sk_test...XXXX`)
- 5 new endpoints: `GET /api/admin/settings`, `PATCH /api/admin/settings`, `POST /api/admin/settings/stripe/test`, admin-only, non-admin → 403
- All existing Travel / Motor / PA checkout flows now route through the admin-configured key automatically — no code changes needed to go live
- Sidebar entry "Settings" added to the CRM Console

### PA (Personal Accident) Insurance (iteration 5)
- `/products/pa-easy` marketing page (hero "Life is unpredictable. Your cover shouldn't be.", pricing card $29.16 with strikethrough $36.00 + -25% badge, 4 highlight tiles, 6 benefit cards with icons, Why PA Easy section, 7 FAQs, footer CTA)
- `/pa-quote/:productId` 3-step form: **Plan** (num_persons 1-6 stepper + live price preview) → **Personal Details** (15 fields: name/NRIC-Passport/gender/DOB/nationality/occupation class 1-4/email/phone/address/postcode + beneficiary name/relationship/NRIC) → **Summary & Stripe checkout**
- `POST /api/quotes/pa` — gross × (1 + occupation_loading) × num_persons → 25% online discount → 8% SST → total. Age 18-70 eligibility. Class 1 = 0%, class 2 = 15%, class 3 = 35%, class 4 = 60% loading.
- **Exact Tune Protect math**: 1 person, class 1, age 35 → **$29.16/year**
- Seeded PA Easy product with 6 benefits matching user spec (Death/Permanent Disablement $10K, Hospital Income $50/day, Ambulance $200, Bereavement $1.5K, Dental $1K, Fuel Station $10K)
- 15 admin-controllable form fields via `form_config` (same engine as Motor)

### Vehicle Registration Lookup + Admin-Controlled Forms (iteration 4)
- `POST /api/vehicles/lookup` — deterministic mock ISM-ABI endpoint. Returns make/model/year/engine/body/market_value/NCD eligibility for any registration. 6 curated test regs + 24-car hashed fallback with year-based depreciation (9%/year capped at 55%).
- Motor quote Step 0 has a **"Look up"** button next to Vehicle Registration. When found, shows a green "Vehicle found" card and auto-fills Sum Insured + suggested NCD in Step 1 (with "Auto-filled from lookup" badge).
- **Admin Products page** is now a full editor (Sheet drawer): edit name, description, `base_premium`, `coverage_amount`, features (add/remove), **addons (name + price editable, add/remove)**, image URL, active flag.
- **form_config** — for Motor product, admin can toggle each of 13 fields (`account_type, vehicle_reg, vehicle_lookup, id_type, id_number, full_name, date_of_birth, postcode, email, cover_type, sum_insured, ncd_percent, addons`) as **Shown** and **Required**. Customer quote form reads this config and conditionally renders. Server-side enforcement: disabled `addons` zeroed out; blank required fields return 400.
- New `FieldConfig`, `ProductUpdate`, `VehicleLookupInput/Result` pydantic models + `DEFAULT_MOTOR_FORM_CONFIG`.

### Motor Insurance module (iteration 3)
- `/products/motor-easy` — full marketing page (hero "Move seamlessly. Protect deeply.", 10% online discount pill, Flood Cover highlight card, Motor Bundle section with 8 numbered benefits, 5 benefit cards, 6 optional add-on cards, FAQ accordion with 6 questions, dark footer CTA)
- `/motor-quote/:productId` — 3-step wizard: **Plan Selection** (Personal/Business toggle, Vehicle Reg, NRIC/Passport toggle, ID number, Full Name, Date of Birth, Postcode, Email, Privacy consent) → **Plan Config** (Comprehensive/Third Party, Sum Insured, NCD %, 7 add-ons) → **Summary & Payment**
- Backend `POST /api/quotes/motor` — pricing: comprehensive = max(product.base, sum_insured × 3.5%), age loading for drivers <23 or >65, NCD discount (0-55%) applied, 10% online rebate on (base − NCD), addons flat, 8% SST. Updates CRM profile with KYC data + auto-sets lead_stage to "quoted"
- Seeded **Motor Easy** product with 7 add-ons (Windscreen, Inconvenience Allowance, Spray Paint, Strike/Riot/Civil, Passenger PA, Legal Liability, Flood/Special Perils)

### Consumer app
- Landing page (hero, 4 product tiles, AI section, stats, footer)
- Auth: login (password + OTP tabs) + signup
- Dashboard (stats, AI recommendations, policies, activity timeline)
- Products catalog with category filter
- Travel insurance 4-step quote wizard (destination → tier → addons → price)
- Stripe Checkout redirect + payment status polling
- Auto policy issuance after successful payment
- My Policies list + sheet-based detail view + PDF print
- File Claim 4-step wizard with document upload (filenames)
- Claims tracker with status pipeline + AI auto-approval badge
- AI Chat floating panel powered by Claude Sonnet 4.5

### Admin / CRM Console
- Overview dashboard with KPIs + quick links
- Customer list with search + table
- Customer 360 (profile, KYC, tags, stats, AI predictions, policies, claims, timeline)
- Leads Kanban (6 stages, inline stage mover)
- Analytics (revenue area chart, policy mix pie, lead funnel bar, KPIs)
- Claims Queue with fraud score bar + approve/reject/investigate actions
- Products catalog read view
- Campaigns + Coupons CRUD with Send action
- Voice AI Calls log with outbound simulation (Twilio scaffold)

### AI module
- `/ai/chat` — Claude Sonnet 4.5 session chat
- `/ai/recommendations` — rule-based product recs per user
- `/ai/lead-score/{id}` — conversion / renewal / churn predictions + next best action
- Fraud score on every claim submission
- Risk score computed during quote underwriting

### Backend features
- Seed: admin, claims officer, demo customer (+ 1 active travel policy), 6 lead customers, 4 products, sample paid transactions
- Role-based dependency guards
- Idempotent policy issuance via `payment_id` check
- CRM interactions automatically logged on every action (signup, quote, policy, claim, stage change, call)
- In-app notifications on policy issued + claim status change

## Test results (iteration 2)
- Backend: **100% (53/53 pytest)**
- Frontend E2E: **~95%** (all critical flows pass)

## Known limitations (MVP scope)
- PDF download is `window.print()` (no server-side generation yet)
- Twilio is scaffold-only (simulate endpoint creates mock call logs)
- OTP is mocked (always accepts 123456 in dev)
- Only Travel insurance has live quote flow; Health/Motor/Device products visible but quote form not built
- No real email/SMS delivery; campaigns just mark as "sent"
- Document upload stores filenames only
- Object storage not integrated for receipts
- Kafka / partner webhooks not wired (router exists as API-docs placeholder)

## Backlog (P0 / P1 / P2)

### P0 (next iteration)
- Quote flows for Health, Motor, Device (same wizard pattern)
- Real email notifications (SendGrid / Resend)
- Policy PDF generation (ReportLab) + download link

### P1
- Renewal reminders + renewal discount coupon engine
- OCR for claim documents
- Partner API auth (scoped bearer tokens)
- Real SMS (Twilio) for OTP and claim updates
- Referral system
- In-app KYC flow

### P2
- Voice AI live (Twilio Programmable Voice + transcription)
- Fraud detection with ML (currently rule-based)
- Agent mobile app
- IRDAI / GDPR compliance reports
- Multi-tenancy for partner white-labels
- Kafka event bus for cross-service async

## Next tasks
1. Ship Health / Motor / Device quote flows
2. Add server-side PDF policy document generation
3. Wire SendGrid or Resend for real email notifications
4. Build partner-scoped bearer token auth for /partner endpoints
