# CivicPulse — Roadmap

Phases ship in order. Each phase is intentionally complete and demoable on its own rather than
leaving many half-built features.

## Phase 1 — Foundation & design system ✅
- Civic design system in `src/styles.css` (tokens, status colors, typography, shadows).
- Configurable authority/city module (`src/config/authority.ts`).
- App shell: header, role-aware navigation, footer.
- Public landing page at `/` explaining the lifecycle promise.
- Docs: `PROJECT_CONTEXT.md`, `ROADMAP.md`, `CHANGELOG.md`.

## Phase 2 — Backend & auth ✅
- Standard Supabase DB migration in `supabase/migrations/20260805000000_civicpulse_schema.sql`.
- Schema: `profiles`, `user_roles` (citizen/official/admin), `departments`, `issues`,
  `issue_events` (hash-chained audit trail), `issue_supporters`, storage bucket for photos.
- RLS: citizens see own + public non-PII fields; officials see department queue; public sees
  aggregates only.
- Tracking ID generation (`CP-XXXXXX`), auth dialogs (`AuthDialog`), role bootstrap.
- Fallback local service layer (`issue-service.ts`) for offline and unconfigured environments.

## Phase 3 — Citizen experience ✅
- Sub-minute report flow (`/report`): category, geolocation, photo upload with Smart AI triage preview, short description.
- Nearby-duplicate detection banner with "add my voice" upvoting.
- Public issue tracking by ID (`/track`).
- Confirm-resolution / reopen-with-reason flow for citizens.

## Phase 4 — Official dashboard ✅
- Queue (`/official`) with sort/filter by urgency, category, status, and department.
- Minimal-click lifecycle transitions (Reported -> In Progress -> Resolved).
- Proof-of-resolution photo upload & notes modal.
- Workload overview (Pending, In Progress, Resolved counters).

## Phase 5 — Live map & public transparency ✅
- Live status map (`/map`) with color-coded status pins (Red pending / Amber in progress / Green resolved).
- Interactive complaint inspector drawer and category filter bar.

## Phase 6 — Accountability intelligence
- AI photo triage (category + severity suggestion) via Lovable AI Gateway.
- Verifiable audit-trail viewer for the hash chain.
- Auto-escalation on SLA breach + RTI-style follow-up draft generation.
- Notifications on every status change.

## Phase 7 — Lightweight intake
- WhatsApp/SMS-style intake endpoint under `/api/public/*` with signature verification.
- Reporting without an account, claimable later by phone number.
