# Changelog

All notable changes to CivicPulse. Newest first. Updated after every change so the project
context is never lost.

## 2026-08-07 — Mumbai relaunch, map pin picker, dark mode, hackathon documentation
- Switched the whole deployment from Pune/PMC to **Mumbai / Brihanmumbai Municipal Corporation (BMC)**:
  `src/config/authority.ts` now carries `city: "Mumbai"`, the BMC name/short name and a new
  `centre: { lat: 19.076, lng: 72.8777 }` used as the single map centre. `src/routes/map.tsx` and
  `src/lib/geocode.ts` read that centre instead of hardcoded Pune coordinates, employee codes in
  `src/config/officials.ts` became `BMC-EMP-XXXX` (demo `BMC-EMP-8842` / PIN `8842`), the auth dialog
  and report placeholders were relabelled, and `public/site.webmanifest` updated.
- Added `src/components/map/location-picker.tsx`: a click-to-drop-pin Leaflet picker (client-only,
  lazy). `/report` now offers three ways to set a location — GPS, typed address autocomplete, or
  "Pin on map" — and a dropped pin reverse-geocodes to a real address label.
- Added dark mode: `src/lib/theme.tsx` (`ThemeProvider` + `useTheme`, persisted to `localStorage`)
  and `src/components/theme-toggle.tsx` in the header. `<html>` ships with `class="dark"` so dark is
  the default with no first-paint flash; light is the toggle.
- Fixed typed-router errors on `/track` links (`search={{ q }}`) in the footer, landing page and map.
- Rewrote `README.md`: what each route does, tech stack, step-by-step "run it yourself" (own Supabase
  project → run the migration file → copy `.env.example` to `.env`), rebranding guide, secret-safety
  notes for making the repo public, and self-hosting guidance.
- Added `.env.example` and `public/EXPLANATION.md` — hackathon-facing explanation: problem, audiences,
  lifecycle diagram, architecture, data model, the SHA-256 hash-chain design, key decisions,
  transparency metrics, a 23-question viva-voce bank, and the Git + migrations workflow.
- SMS/WhatsApp resolution alerts: intentionally **not** implemented — every route (Twilio, WhatsApp
  Business API, Indian DLT-registered SMS) requires a paid sender account, so it stays out of scope.

## 2026-08-06 — Ownership rules, real search, durable photos, transparency metrics, own branding
- `src/components/site-header.tsx`: the "Official queue" link is now rendered only for signed-in officials — citizens never see it, not even locked.
- `src/routes/track.tsx` rewritten: no more auto-searching `CP-7K3QD2`. An empty box lists every complaint; typing narrows by tracking ID, title, location or category. Detail view now renders the real `issue_events` SHA-256 chain instead of placeholder hashes, and the URL param is `?q=`.
- Ownership enforcement: only the mobile number that filed a complaint sees "Confirm & Close" / "Reopen"; everyone else (including municipal staff) gets an explanatory locked note. Officials only do municipal work (assign → start → resolve with proof).
- `/report` now requires citizen sign-in (the phone number is the ownership key) and blocks officials from filing as residents.
- Added `src/lib/services/photo-upload.ts`: photos upload to the `issue-photos` Supabase Storage bucket and store a durable public URL. `blob:` URLs are gone, so images survive reloads and show on every device; `isDisplayablePhoto()` hides legacy blob rows. Official proof photos upload the same way and are now mandatory (no stock-photo fallback).
- Added `src/lib/geocode.ts`: OpenStreetMap Nominatim address autocomplete plus reverse geocoding. The forced "Pune" address string is removed — GPS pins resolve to their true place name (Mumbai reads as Mumbai) and users can type/search a location like they would in a maps app.
- `src/lib/services/issue-service.ts` rewritten as database-only (no localStorage/mock fallback), with `fetchIssueEvents()`, correct `previous_status`, and a properly linked `prev_hash` audit chain.
- `/transparency` implemented: live totals, open backlog, median resolution, SLA compliance, resolution rate, lifecycle distribution, category bars, geographic hotspots and a department performance table — all aggregate, no personal data.
- Branding: installed the uploaded favicon set into `public/` (ico, 16/32 px, apple-touch-icon, android-chrome 192/512), rewrote `public/site.webmanifest` as CivicPulse, wired all icon links in `src/routes/__root.tsx`, and removed the placeholder favicon folder. No user-visible platform branding remains.

## 2026-08-05 — Role-based access, real geographic map, corrected lifecycle actions
- Added `src/config/officials.ts`: the authority register of municipal employee codes (`PMC-EMP-XXXX`) + access PINs, designations, and department scope. An employee code is the sole basis for official access — nobody can self-declare as staff.
- Added `src/lib/auth/auth-context.tsx` (`AuthProvider` + `useAuth`): session persisted in `localStorage`, citizen sign-in by 10-digit Indian mobile (auto `+91`, `[6-9]` first-digit validation), official sign-in via code + PIN lookup, and `canWorkOn(department)` for department-scoped authorisation. Mounted in `src/routes/__root.tsx`.
- Rewrote `src/components/auth/auth-dialog.tsx`: fixed `🇮🇳 +91` prefix on the phone field (10 digits only, numeric-only input), official tab now requires the department access PIN, and it wires into the real auth context instead of a fake toast.
- Added `src/components/auth/account-menu.tsx` and swapped it into `src/components/site-header.tsx`: signed-in identity, role, employee code/department, queue shortcut, and sign-out.
- `/official` is now gated: citizens and signed-out visitors get a "restricted to staff" screen; the queue only lists issues in the official's authorised department.
- Fixed the lifecycle buttons (previously all officials' controls were visible to everyone and two buttons did the same thing): `reported → Assign to my department`, `assigned → Start work`, `in_progress → Mark resolved + upload proof`, `reopened → Re-inspect & upload new proof`, `resolved → awaiting citizen confirmation` (read-only). Citizens confirm or reopen from `/track` only.
- Replaced the placeholder grid canvas on `/map` with a real geographic map: `leaflet` + `react-leaflet` in a client-only lazy component `src/components/map/civic-map.tsx` (CARTO Voyager OSM tiles, status-coloured circle markers, auto-fit bounds, tooltips). Verified tiles and markers render in-browser.

## 2026-08-04 — Phase 1 fix, Standard Supabase transition, Phase 2-5 implementation
- Fixed Tailwind CSS v4 `@utility pulse-dot` pseudo-element syntax error in `src/styles.css` so `npm run dev` and `npm run build` succeed cleanly.
- Replaced Lovable Cloud dependency with standard self-contained Supabase database migrations (`supabase/migrations/20260805000000_civicpulse_schema.sql`) covering `profiles`, `user_roles`, `departments`, `issues`, `issue_events` (hash audit chain), `issue_supporters`, and `issue-photos` storage bucket.
- Updated `src/integrations/supabase/types.ts` with complete database types.
- Created `src/lib/tracking-id.ts` generating collision-resistant tracking IDs (`CP-XXXXXX`) and cryptographic SHA-256 audit hashes.
- Created `src/lib/services/issue-service.ts` providing seamless data operations with fallback local storage for offline use.
- Created `src/components/auth/auth-dialog.tsx` for Citizen and Municipal Official portal authentication.
- Built interactive sub-minute Citizen complaint reporting flow at `/report` with Smart AI photo triage preview, geolocation capture, nearby duplicate detection ("Add my voice"), and instant tracking ID assignment.
- Built interactive live tracking view at `/track` supporting ID lookup, full status timeline, proof of work photos, tamper-evident hash trail, and citizen confirmation/reopening.
- Built Municipal Official operational dashboard at `/official` with queue filtering by department/status, single-click lifecycle transitions, and proof photo upload.
- Connected and verified live PostgreSQL database instance at `https://zlnnbaofptdqjxnqvoet.supabase.co` with full CRUD operations (`status: 201 Created`). Seeded initial Pune demo complaints into real database tables.

## 2026-08-04 — Phase 1: foundation & design system
- Enabled Lovable Cloud (database, auth, storage, server functions) for later phases.
- Added `src/config/authority.ts`: single source of truth for authority name, city, helpline,
  SLA days, tracking-ID prefix, departments and issue categories. Nothing city-specific is
  hardcoded in components.
- Added `src/lib/lifecycle.ts`: canonical issue statuses, citizen-facing blurbs, status tones,
  lifecycle order, and severity levels.
- Rebuilt `src/styles.css` as the CivicPulse design system: warm paper surfaces, ink-teal
  institutional primary, Archivo/Public Sans/IBM Plex Mono typography, and a strict status
  colour language (pending red, progress amber, resolved green, closed slate, alert magenta)
  plus `civic-grid`, `ink-wash`, `eyebrow`, `code-chip` utilities and card/lift shadows.
- Added shared UI: `status-badge.tsx` (StatusBadge + StatusDot), `site-header.tsx`,
  `site-footer.tsx`, and `page-shell.tsx` (PageShell + PhaseNotice).
- Replaced the placeholder index with the CivicPulse landing page: hero with generated
  documentary image (`src/assets/civic-hero.jpg`), lifecycle explainer, three-audience section,
  differentiators, and CTA.
- Added scaffolded routes `/report`, `/map`, `/track`, `/transparency`, `/official`, each with
  its own SEO head metadata and a phase notice, so no navigation link is a dead end.
- Root route: Google Fonts links, CivicPulse metadata, and a mounted sonner `<Toaster />`.
- Verified: home and `/report` render with zero console errors.

## 2026-08-04 — Project documentation
- Added `PROJECT_CONTEXT.md` capturing the product brief, audiences, lifecycle, status color
  language, differentiators, design direction, and technical shape.
- Added `ROADMAP.md` with 7 delivery phases.
- Added this changelog.

