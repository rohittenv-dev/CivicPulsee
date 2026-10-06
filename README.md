# CivicPulse

**Civic issue reporting, tracking, and resolution monitoring platform.**

Configured in this repository for the **Brihanmumbai Municipal Corporation (BMC), Mumbai** — CivicPulse empowers citizens to report civic complaints in under a minute, track their resolution lifecycle, and inspect real-time municipal performance transparency.

---

## Repository

- **GitHub Repository**: [https://github.com/rohittenv-dev/CivicPulsee.git](https://github.com/rohittenv-dev/CivicPulsee.git)

---

## Application Overview & Routes

| Route | Audience | Key Capabilities |
| --- | --- | --- |
| `/` | Public | Landing page & platform overview |
| `/report` | Citizens (Sign-in required) | File a civic complaint: select category, description, upload photo, drop map pin / set GPS / type address |
| `/track` | Public | Search & track complaints by Tracking ID, title, category, or status; view audit event log |
| `/map` | Public | Interactive Leaflet + OpenStreetMap civic map with real-time Supabase issue markers, search, filtering, and Locate Me |
| `/transparency` | Public | Live analytics & charts derived from real Supabase data: resolution rates, department stats, SLA performance |
| `/official` | Municipal Staff | Official dashboard: department work queue, assign staff, update progress, and resolve issues with proof photo & resolution notes |

---

## Main Features

### 1. Citizen Authentication
- Indian mobile number sign-in (`+91` format).
- Serves as ownership identification for filing and managing complaints.

### 2. Municipal Official Authentication
- Employee code authentication from the authority register (e.g. `BMC-EMP-8842`).
- Provides role-based access to the official department work queue.

### 3. Issue Reporting
- File complaints across categories (Roads & Potholes, Water Supply, Garbage & Waste, Street Lighting, Drainage, etc.).
- Photo upload integrated with Supabase Storage.
- Precise location tagging using browser GPS, address search (OpenStreetMap Nominatim), or interactive map pin.

### 4. Issue Tracking & Audit Log
- Unique tracking ID generated for every issue.
- Public search and filtering by status (`Reported`, `Assigned`, `In Progress`, `Resolved`, `Confirmed`).
- Event audit log tracking lifecycle changes.

### 5. Official Dashboard
- Department-scoped work queue for municipal staff.
- Update issue status from reported to assigned, in-progress, or resolved.
- Attach resolution notes and required "after" proof photo upon resolving an issue.

### 6. Interactive Civic Issue Map (`/map`)
- Built with **Leaflet** and **OpenStreetMap** tile layer.
- Displays real issue data fetched from **Supabase**.
- Marker clustering using `react-leaflet-cluster` for high-density areas.
- **Search & Filtering**: Filter markers instantly by category or status, or search by title/location.
- **Locate Me**: One-click geolocation centering the map on the user's location with a distinct, animated blue marker.
- **Resolved Issue Green Marker**: Issues with status `Resolved` or `Confirmed` display a distinct green marker on the map.
- **Rich Popup Details**: Clicking any marker shows issue details, status badge, category, address, date, original report photo (Before), and for resolved issues, the official resolution proof photo (After) alongside resolution notes.

### 7. Issue Resolution & Proof Verification
- Municipal officials submit resolution notes and an "After" proof photo when completing work.
- Visually distinguished on the map via green markers (`customGreenIcon`).
- Complete transparency with side-by-side Before / After photo verification in issue details.

### 8. Transparency & Analytics Dashboard (`/transparency`)
- All metrics and charts are dynamically derived from real Supabase issue data.
- Key performance indicators: Total Issues Reported, Resolution Rate %, SLA Compliance %, Average Resolution Time.
- Dynamic data visualizations using Recharts (Category Breakdown, Status Distribution, Department Performance).

### 9. Responsive UI & Dark Theme
- Modern design built with Tailwind CSS v4 and Radix UI / shadcn/ui components.
- Responsive layout optimized for mobile and desktop screens.

---

## Technology Stack

CivicPulse is built using modern web technologies:

- **Frontend Framework**: [React 19](https://react.dev/) + [TanStack Start](https://tanstack.com/start) / [TanStack Router](https://tanstack.com/router)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with CSS-first configuration (`src/styles.css`), Radix UI primitives, Lucide React icons
- **Map & Geolocation**: [Leaflet](https://leafletjs.com/), [React Leaflet v5](https://react-leaflet.js.org/), [react-leaflet-cluster](https://github.com/akshinly/react-leaflet-cluster), OpenStreetMap Nominatim for address search
- **Charts & Data Visualization**: [Recharts](https://recharts.org/)
- **Backend & Database**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`)
  - PostgreSQL Database
  - Row Level Security (RLS) policies
  - Supabase Storage (`issue-photos` bucket)
- **Forms & Validation**: React Hook Form (`react-hook-form`), Zod (`zod`)

---

## Environment Variables

The application relies on Supabase configuration for data and storage access. 

Only public/publishable client configuration variable names are required:

```env
VITE_SUPABASE_URL="https://<your-supabase-project>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-supabase-anon-key>"
```

> [!IMPORTANT]
> Secret files and secret keys (such as service-role keys or passwords) must never be committed to GitHub.

---

## Local Development

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm or bun

### 2. Installation
```sh
npm install
```

### 3. Setup Environment
Copy `.env.example` to `.env.local` and configure your Supabase URL and Publishable Key:
```sh
VITE_SUPABASE_URL="https://<your-project>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
```

### 4. Run Development Server
```sh
npm run dev
```
Open `http://localhost:8080` in your browser.

### 5. Type Checking
Validate TypeScript types across the codebase:
```sh
npx tsc --noEmit
```

---

## Production Deployment

The project can be deployed on **Vercel** or any modern web hosting platform connected to the GitHub repository:

1. Connect your repository ([`rohittenv-dev/CivicPulsee`](https://github.com/rohittenv-dev/CivicPulsee.git)) to Vercel.
2. Set Environment Variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`) in the Vercel project settings dashboard.
3. Deploy directly from the `main` branch.

---

## Security Guidelines

- Secret files containing private credentials or environment overrides — such as `.env`, `.env.local`, `rohit.env`, and `.env.production` — **must never be committed to Git**.
- Ensure `.gitignore` includes all local environment and build artifacts before committing.
