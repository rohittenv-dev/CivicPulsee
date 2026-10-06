# CivicPulse

**Civic issue reporting and accountability platform for municipal authorities.**
Configured in this repository for the **Brihanmumbai Municipal Corporation (BMC), Mumbai** —
but the authority, city, departments and SLA are one config file away from any other city.

A resident photographs a pothole, drops a pin, and gets a tracking ID in under a minute.
The complaint then moves through a visible lifecycle — **Reported → Assigned → In Progress →
Resolved → Confirmed** (or **Reopened**) — where every transition is written to a
tamper-evident, SHA-256 hash-chained audit log that anyone can read.

---

## What's inside

| Route | Who it's for | What it does |
| --- | --- | --- |
| `/` | everyone | Landing page, lifecycle explainer |
| `/report` | citizens (sign-in required) | File a complaint: category, photo, location (GPS / typed address / map pin), duplicate detection |
| `/track` | everyone | Browse every complaint; narrow by tracking ID, title, location or category; read the hash chain |
| `/map` | everyone | Live Leaflet/OpenStreetMap map of the city, pins colour-coded by status |
| `/transparency` | everyone | Aggregate city performance: backlog, median resolution, SLA compliance, hotspots, department table |
| `/official` | municipal staff only | Department-scoped work queue: assign → start work → resolve with proof photo |

Design details, the viva-voce question bank and a walkthrough of how everything fits together
live in [`public/EXPLANATION.md`](public/EXPLANATION.md).

---

## Tech stack

- **React 19** + **TanStack Start** (file-based routing, SSR, server functions) on **Vite 7**
- **Tailwind CSS v4** (CSS-first config in `src/styles.css`) + shadcn/ui, dark mode by default
- **Supabase** — Postgres, Row Level Security, Storage (`issue-photos` bucket)
- **Leaflet / react-leaflet** with CARTO OSM tiles for maps
- **OpenStreetMap Nominatim** for address search and reverse geocoding (no API key)

---

## Run it yourself

### 1. Clone and install

```sh
git clone <this-repository-url>
cd civicpulse
npm install        # or bun install
```

### 2. Create your own Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project (free tier is enough).
2. Open **SQL Editor → New query**, paste the entire contents of
   `supabase/migrations/20260805000000_civicpulse_schema.sql`, and run it.
   That single file creates every table (`profiles`, `user_roles`, `departments`, `issues`,
   `issue_events`, `issue_supporters`), the enums, the grants, the RLS policies, the
   `issue-photos` storage bucket, and the demo seed rows.
3. Go to **Project Settings → API** and copy the **Project URL** and the **anon / publishable key**.

### 3. Point the app at it

Copy `.env.example` to `.env` and fill in your values:

```sh
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
SUPABASE_URL="https://<your-project-ref>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
SUPABASE_PROJECT_ID="<your-project-ref>"
```

### 4. Start it

```sh
npm run dev      # http://localhost:8080
npm run build    # production build
```

That's it — schema + `.env` and the app is ready to go.

### 5. Sign in

- **Citizen:** any valid 10-digit Indian mobile number (`+91` is fixed, first digit 6-9).
  The number is the ownership key: only it can later confirm or reopen that complaint.
- **Municipal official:** an employee code from the authority register in
  `src/config/officials.ts` plus its PIN. Demo: `BMC-EMP-8842` / PIN `8842`.
  A role can never be self-declared — the code must exist on the register.

---

## Rebranding for another city

Edit **`src/config/authority.ts`** only:

```ts
city: "Mumbai",
authorityName: "Brihanmumbai Municipal Corporation",
authorityShortName: "BMC",
slaDays: 14,
trackingPrefix: "CP",
centre: { lat: 19.076, lng: 72.8777 },   // map centre
```

Departments and issue categories live in the same file. Nothing city-specific is hardcoded in a
component. Update the employee register in `src/config/officials.ts` to match the new authority.

---

## Sharing the project / secrets

- The repository can be made **public safely**: `.env` here contains only the Supabase **URL,
  project ref and the anon (publishable) key**. The anon key is designed to be shipped to the
  browser — it is powerless on its own because every table is protected by Row Level Security.
- The **service-role key is never in this repository** and must never be committed. It lives only
  in the hosting platform's secret store.
- Anyone you share the link with can `git clone`, run steps 1-4 above with **their own** Supabase
  project, and have a working copy. Prefer that over sharing your database.
- If you would rather not ship even the anon key, delete `.env` before publishing and let people
  copy `.env.example` instead.

### Does it have to be Supabase?

Supabase is just hosted Postgres plus auth, storage and RLS. The app talks to it through
`src/integrations/supabase/client.ts`, so a fully self-hosted deployment is possible with
[supabase/self-hosted](https://supabase.com/docs/guides/self-hosting/docker) (Docker Compose:
Postgres + PostgREST + GoTrue + Storage) — run the same migration file, point `.env` at
`http://localhost:8000`, and nothing in the app changes. A bare local Postgres alone is *not*
enough, because the client relies on the PostgREST HTTP API and the Storage API for photos.

---

## Working with Git

```sh
git clone <url>            # get the project
git checkout -b my-feature # work on a branch
git add -A && git commit -m "feat: describe the change"
git pull --rebase origin main   # take other people's work first
git push origin my-feature      # publish, then open a Pull Request
```

Database changes are **code**: never click around in the Supabase dashboard and forget it.
Add a new timestamped file under `supabase/migrations/`, commit it, and every collaborator gets
the same schema by running it. `CHANGELOG.md` is updated with every change so project context is
never lost.
