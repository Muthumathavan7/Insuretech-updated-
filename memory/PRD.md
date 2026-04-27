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

## Implemented (2026-02-27)

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
