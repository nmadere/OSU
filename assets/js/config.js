// ────────────────────────────────────────────────────────────────────────────
// Supabase configuration.
//
// Leave BOTH values empty to run in STATIC mode: the site reads data/*.json and
// stores notes / question toggles in the browser (localStorage). No backend.
//
// Fill in your project URL + anon (public) key to switch the whole app to LIVE
// mode: buildings, coordination notes, and open-question statuses become shared
// and real-time across all stakeholders. Run supabase/schema.sql first, then
// seed buildings with `node supabase/seed.mjs` (see README → Collaboration).
//
// The anon key is safe to expose in client code; Row Level Security (in
// schema.sql) is what protects writes. Do NOT put the service_role key here.
// ────────────────────────────────────────────────────────────────────────────
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// When true, visitors can read everything but must sign in to edit
// (post notes, change question status, edit buildings). Requires LIVE mode.
export const REQUIRE_LOGIN_TO_EDIT = true;

export const isLive = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
