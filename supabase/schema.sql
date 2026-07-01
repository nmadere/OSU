-- ============================================================================
-- OSU Dispenser Installation — Logistics & Planning Hub
-- Supabase schema for LIVE (multi-party, real-time) mode.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query), then seed
-- buildings with `node supabase/seed.mjs` and fill in assets/js/config.js.
--
-- Security model:
--   • Anyone (anon) can READ all tables — this is a shared stakeholder hub.
--   • Only authenticated users can WRITE (post notes, change question status,
--     update building status). Create stakeholder accounts under
--     Dashboard → Authentication → Users.
-- ============================================================================

-- ---------- BUILDINGS ----------
create table if not exists public.buildings (
  id           int primary key,
  name         text not null,
  bldg         text,
  dept         text,
  "deptFull"   text,
  quadrant     text,
  lat          double precision,
  lng          double precision,
  address      text,
  district     text,
  towel        int  default 0,
  tissue       int  default 0,
  total        int  default 0,
  tier         text,
  status       text default 'Not Started',
  "manualTowel" int,
  "autoTowel"   int,
  "quadTissue"  int,
  "sbsTissue"   int,
  "vertTissue"  int
);

-- ---------- COORDINATION NOTES ----------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  author     text,
  tag        text,
  body       text not null,
  user_id    uuid references auth.users(id),
  created_at timestamptz default now()
);
create index if not exists notes_created_idx on public.notes(created_at desc);

-- ---------- OPEN-QUESTION STATUS ----------
create table if not exists public.question_status (
  qid        text primary key,          -- e.g. 'Q7'
  status     text not null,             -- 'Open' | 'Resolved'
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);

-- ---------- ROW LEVEL SECURITY ----------
alter table public.buildings       enable row level security;
alter table public.notes           enable row level security;
alter table public.question_status enable row level security;

-- Public read
create policy "read buildings"  on public.buildings       for select using (true);
create policy "read notes"      on public.notes           for select using (true);
create policy "read qstatus"    on public.question_status for select using (true);

-- Authenticated write
create policy "auth update buildings" on public.buildings
  for update to authenticated using (true) with check (true);

create policy "auth insert notes" on public.notes
  for insert to authenticated with check (true);

create policy "auth upsert qstatus insert" on public.question_status
  for insert to authenticated with check (true);
create policy "auth upsert qstatus update" on public.question_status
  for update to authenticated using (true) with check (true);

-- ---------- REALTIME ----------
-- Add the collaboration tables to the realtime publication so the UI updates live.
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.question_status;
alter publication supabase_realtime add table public.buildings;
