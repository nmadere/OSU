# OSU Dispenser Installation — Logistics & Planning Hub

A multi-party logistics and planning site for the campus-wide dispenser
installation at **The Ohio State University** (Columbus campus). It centralizes
scope, routing, scheduling, logistics, the stakeholder directory, and the live
open-questions register so **Sofidel**, **Fastenal**, **Ohio State**, and
**AA Installation LLC** all work from one source of truth.

> Confidential — for project stakeholders only. Commercial terms (unit pricing,
> billing) are intentionally excluded from this shared hub.

## What's inside

| Section | Purpose |
|---|---|
| **Overview** | Project summary, scope by department, install sequence, status & next step |
| **Campus Map** | All 262 buildings plotted from GIS coordinates; color by department / quadrant / status; size by dispenser count |
| **Buildings** | Searchable, filterable, sortable table of every building; CSV export |
| **Phases & Crew** | 4-quadrant routing, the four install phases, crew deployment scenarios, special-access constraints |
| **Schedule** | Proposed phase Gantt with blackout bands, key milestones, and a blackout-date register (pending Q13/Q14) |
| **Logistics** | Receiving & staging, old-dispenser handling (Scenarios A/B/C), campus-liaison request |
| **Stakeholders** | Directory across all four parties + OSU department leads |
| **Open Questions** | Live decision register (owners + status) gating the finalized Gantt |
| **Updates** | Lightweight coordination notes (see *Collaboration* below) |
| **Documents** | Index of the source documents behind the plan |

## Tech & design

- **No build step.** Plain HTML, CSS, and ES modules — nothing to compile.
- **Self-contained.** Leaflet is vendored in `assets/vendor/` so the map works
  even with CDNs blocked. The basemap uses public OSM/CARTO tiles when the
  network allows and degrades gracefully to plain markers when it doesn't.
- **Data-driven.** All content lives in `data/buildings.json` and
  `data/project.json`. Update those files to update the site.

## Run locally

Browsers block `fetch()` on `file://`, so serve over HTTP:

```bash
python3 -m http.server 8099
# then open http://localhost:8099
```

## Deploy to GitHub Pages

1. Push this branch to GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch.**
3. Select this branch and the `/ (root)` folder, then save.
4. The site publishes at `https://<org>.github.io/<repo>/`.

`.nojekyll` is included so the `assets/` directory is served as-is.

## Updating the data

- **Buildings** (`data/buildings.json`): one object per building —
  `name, bldg, dept, quadrant, lat, lng, address, towel, tissue, total, tier,
  status` and (where known) the per-type breakdown
  `manualTowel, autoTowel, quadTissue, sbsTissue, vertTissue`.
  Source: *OSU Building Location Data* (GIS-verified coordinates).
- **Project content** (`data/project.json`): departments, quadrants, phases,
  crew model, logistics, stakeholders, and the open-questions register.
  Source: *OSU Approach Plan v5*.

To change a building's `status` to `In Progress` / `Complete`, edit its record;
the map and tables update automatically.

## Collaboration: static vs. live (built-in)

The app runs in one of two modes, controlled entirely by `assets/js/config.js`.

**Static mode (default).** With empty Supabase keys, the site reads
`data/*.json` and saves **Updates** notes and **Open Questions** toggles in each
viewer's browser (`localStorage`). Zero setup — great for publishing a shared,
read-only plan where one coordinator maintains the data in-repo.

**Live mode (real-time, multi-party).** Fill in your Supabase project URL and
anon key and the *same UI* becomes a shared, live workspace: coordination notes,
open-question statuses, and building statuses sync across all stakeholders in
real time, with a sign-in gate for editing. The Supabase client is vendored
(`assets/vendor/supabase/`), so no build step is needed.

To turn on live mode:

1. Create a **Supabase** project (free tier is fine).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) — it
   creates the `buildings`, `notes`, and `question_status` tables, sets Row
   Level Security (public read, authenticated write), and enables Realtime.
3. Seed the buildings table:
   ```bash
   npm i @supabase/supabase-js
   SUPABASE_URL=https://xxxx.supabase.co \
   SUPABASE_SERVICE_KEY=<service_role_key> \
   node supabase/seed.mjs
   ```
4. In `assets/js/config.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   (the anon key is safe in client code; RLS protects writes).
5. Create stakeholder logins under **Supabase → Authentication → Users**. Set
   `REQUIRE_LOGIN_TO_EDIT = false` if you'd rather allow anonymous editing.

The frontend is structured so this switch touches only `config.js` — every view
already calls the unified `assets/js/backend.js` layer.

## Continuous deployment

`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push
to the default branch. In **Settings → Pages**, set **Source: GitHub Actions**
(one time). No build step runs — the workflow uploads the repo as-is.

## Data note

Building counts reflect the GIS dataset (~10,586 mapped dispensers across 262
buildings). The confirmed **program scope is ~12,054** (FOD towel-only); the two
reconcile as departments finalize FOD/order counts. **FOD buildings receive
towel dispensers only — tissue is not in scope at this time.**
