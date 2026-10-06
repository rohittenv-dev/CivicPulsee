# CivicPulse — Project Context

## What this is

CivicPulse is a civic issue reporting and accountability platform. Citizens report municipal
problems (potholes, streetlights, garbage, water leakage, etc.); every complaint gets a
human-readable tracking ID and a visible lifecycle that the citizen, the municipal official,
and the general public can all watch move forward in real time.

The pitch: **"you can watch it move."** No black box, no 45-day silence.

## Configurability

The municipal authority name and city must never be hardcoded in components. They live in a
single config module (`src/config/authority.ts`) so the product can be relabeled per city.

## The three audiences

| Audience | Job | Product personality |
| --- | --- | --- |
| **Citizen** | Report in under a minute, believe something will happen | Approachable, fast, reassuring |
| **Municipal official** | Triage a queue, prove work done, avoid duplicate noise | Dense, operational, efficient |
| **Public / oversight** | Aggregate truth, audit the system, zero PII | Data-forward, credible, screenshot-worthy |

## Core mechanic: the issue lifecycle

1. **Reported** — citizen submits photo + location + category, receives a short tracking ID (e.g. `CP-7K3QD2`).
2. **Assigned** — a department picks it up; citizen sees it.
3. **In Progress** — actively being worked; visually distinct everywhere including the map.
4. **Resolved** — official uploads proof.
5. **Confirmed / Reopened** — citizen confirms (closes + archives with feedback) or reopens with
   a reason, which sends it straight back to the department queue without re-filing.

Status must be consistent in real time across citizen view, live map, official dashboard, and
public analytics.

## Status color language

Red = pending/reported · Amber = in progress · Green = resolved/closed · Slate = archived.
Escalated/overdue gets its own emphasis treatment. This mapping is intuitive at a glance and is
used identically in every view that shows status.

## Differentiators (central, not extras)

- **Smart triage from the photo** — auto-suggest category and flag severity/urgency from the
  uploaded image so dangerous issues don't queue behind trivial ones.
- **Tamper-evident status history** — an audit trail (hash-chained status events) a skeptical
  journalist could trust, not a mutable status column.
- **Automatic escalation + recourse** — overdue issues escalate on their own; the citizen can
  generate a formal follow-up draft (RTI-style) instead of chasing.
- **Low-friction intake** — WhatsApp/SMS-style lightweight reporting treated as a first-class
  path (later phase), because the promise breaks if it only works for app users.

## Design direction

Trustworthy and civic without feeling like a sterile government form; modern and capable
without a flashy consumer-app tone that trivializes infrastructure problems. The map is a hero
element. Design decisions are made with judgment, not from a rigid spec. No purple gradients,
no default Inter/Poppins look-alike.

## Definition of done

The full loop — report → assign → in progress → resolve with proof → citizen confirm/reopen —
is demoable end to end with no dead clicks, and the live map plus public analytics reflect the
activity in real time.

## Technical shape

- TanStack Start v1 (React 19, Vite), TanStack Router file routes in `src/routes`.
- Lovable Cloud for database, auth, storage, and server-side logic (via `createServerFn`).
- Tailwind v4 with all design tokens in `src/styles.css`; shadcn components + variants.
- Docs to keep current: `PROJECT_CONTEXT.md`, `ROADMAP.md`, `CHANGELOG.md` (updated every change).
