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

## Collaboration (current vs. live)

This is a **static** site, so the **Updates** notes and **Open Questions**
status toggles are saved in each viewer's browser (`localStorage`) — fine for
personal tracking and for a single coordinator publishing updates via the repo.

To make editing **truly multi-party and live**, add a managed backend (no server
to maintain) and point the existing data layer at it:

1. Create a **Supabase** project; add `buildings`, `notes`, and `questions`
   tables (mirroring the JSON shapes above).
2. Replace the `fetch('data/*.json')` calls in `assets/js/data.js` with Supabase
   client reads, and the `localStorage` writes in `assets/js/util.js`
   (`pushNote`, `setOverride`) with table writes.
3. Enable Supabase Realtime on `notes`/`questions` for live updates, and Row
   Level Security + auth if you want a login-gated internal section.

The frontend is structured so this swap touches only the data layer.

## Data note

Building counts reflect the GIS dataset (~10,586 mapped dispensers across 262
buildings). The confirmed **program scope is ~12,054** (FOD towel-only); the two
reconcile as departments finalize FOD/order counts. **FOD buildings receive
towel dispensers only — tissue is not in scope at this time.**
