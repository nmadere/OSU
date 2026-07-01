// Seed the Supabase `buildings` table from data/buildings.json.
//
// Usage:
//   npm i @supabase/supabase-js            # one-time
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_KEY=<service_role_key> \
//   node supabase/seed.mjs
//
// Use the SERVICE ROLE key here (server-side only — never commit it or put it
// in the browser). It bypasses RLS so the one-time bulk insert succeeds.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
  process.exit(1);
}

const buildings = JSON.parse(readFileSync(new URL('../data/buildings.json', import.meta.url)));
const sb = createClient(url, key, { auth: { persistSession: false } });

const CHUNK = 200;
for (let i = 0; i < buildings.length; i += CHUNK) {
  const batch = buildings.slice(i, i + CHUNK);
  const { error } = await sb.from('buildings').upsert(batch, { onConflict: 'id' });
  if (error) { console.error('Upsert failed:', error.message); process.exit(1); }
  console.log(`Seeded ${Math.min(i + CHUNK, buildings.length)} / ${buildings.length}`);
}
console.log('Done. Buildings seeded.');
