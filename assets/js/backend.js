// Unified data/collaboration layer.
// In STATIC mode it uses local JSON + localStorage (see util.js).
// In LIVE mode it talks to Supabase (Postgres + Auth + Realtime).
// Views call these functions and never care which mode is active.
import { SUPABASE_URL, SUPABASE_ANON_KEY, isLive } from './config.js';
import { getNotes as lsNotes, pushNote as lsPush, getOverrides as lsOverrides, setOverride as lsSetOverride } from './util.js';

let _client = null;
let _authUser = null;
const listeners = new Set();

// Lazily load the vendored Supabase UMD bundle only when LIVE.
function loadSb() {
  return new Promise((resolve, reject) => {
    if (window.supabase?.createClient) return resolve(window.supabase);
    const s = document.createElement('script');
    s.src = 'assets/vendor/supabase/supabase.umd.js';
    s.onload = () => resolve(window.supabase);
    s.onerror = () => reject(new Error('Failed to load Supabase client'));
    document.head.appendChild(s);
  });
}
async function client() {
  if (_client) return _client;
  const sb = await loadSb();
  _client = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true } });
  return _client;
}

export const live = isLive;
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Bound any live read so a wrong/unreachable URL can't freeze the UI.
const TIMEOUT_MS = 3500;
function withTimeout(promise) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS))]);
}
function emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

/* ---------- BUILDINGS ---------- */
export async function fetchBuildings() {
  const json = () => fetch('data/buildings.json').then(r => r.json());
  if (!isLive()) return json();
  try {
    const c = await client();
    const { data, error } = await withTimeout(c.from('buildings').select('*').order('total', { ascending: false }));
    if (error || !data || !data.length) throw error || new Error('empty');
    return data;
  } catch (e) {
    console.warn('Supabase buildings read failed, using bundled JSON:', e?.message || e);
    return json();
  }
}
export async function updateBuildingStatus(id, status) {
  if (!isLive()) return;
  const c = await client();
  await c.from('buildings').update({ status }).eq('id', id);
  emit();
}

/* project.json is static config content in both modes */
export async function fetchProject() { return fetch('data/project.json').then(r => r.json()); }

/* ---------- NOTES ---------- */
export async function listNotes() {
  if (!isLive()) return lsNotes('notes');
  try {
    const c = await client();
    const { data, error } = await withTimeout(c.from('notes').select('*').order('created_at', { ascending: false }));
    if (error) throw error;
    return (data || []).map(r => ({ author: r.author, tag: r.tag, body: r.body, when: new Date(r.created_at).toLocaleString() }));
  } catch (e) { console.warn('Notes read failed:', e?.message || e); return []; }
}
export async function addNote(note) {
  if (!isLive()) { lsPush('notes', { ...note, when: new Date().toLocaleString() }); return; }
  const c = await client();
  await c.from('notes').insert({ author: note.author, tag: note.tag, body: note.body, user_id: _authUser?.id || null });
}

/* ---------- QUESTION STATUS ---------- */
export async function getQuestionOverrides() {
  if (!isLive()) return lsOverrides('qstatus');
  try {
    const c = await client();
    const { data, error } = await withTimeout(c.from('question_status').select('qid,status'));
    if (error) throw error;
    const m = {}; (data || []).forEach(r => m[r.qid] = r.status); return m;
  } catch (e) { console.warn('Question status read failed:', e?.message || e); return {}; }
}
export async function setQuestionOverride(qid, status) {
  if (!isLive()) { lsSetOverride('qstatus', qid, status); return; }
  const c = await client();
  await c.from('question_status').upsert({ qid, status, updated_by: _authUser?.id || null }, { onConflict: 'qid' });
}

/* ---------- AUTH ---------- */
export async function currentUser() {
  if (!isLive()) return null;
  const c = await client();
  const { data } = await c.auth.getUser();
  _authUser = data?.user || null;
  return _authUser;
}
export async function signIn(email, password) {
  const c = await client();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  _authUser = data.user; return _authUser;
}
export async function signOut() {
  if (!isLive()) return;
  const c = await client();
  await c.auth.signOut(); _authUser = null;
}

/* ---------- REALTIME ---------- */
export async function startRealtime() {
  if (!isLive()) return;
  const c = await client();
  c.channel('hub')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, emit)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'question_status' }, emit)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'buildings' }, emit)
    .subscribe();
}
