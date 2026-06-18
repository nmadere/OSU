// Small DOM + formatting helpers shared across views.
export const $ = (sel, root = document) => root.querySelector(sel);
export const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export const n = (x) => (x == null ? '' : Number(x).toLocaleString());
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sum = (arr, f) => arr.reduce((a, b) => a + (f ? f(b) : b), 0);
export const groupBy = (arr, key) => arr.reduce((m, x) => { const k = typeof key === 'function' ? key(x) : x[key]; (m[k] = m[k] || []).push(x); return m; }, {});

// Local-only persistence for notes/decisions (static-site collaboration layer).
const LS = 'osu_hub_v1';
export function store() {
  try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; }
}
export function saveStore(s) { localStorage.setItem(LS, JSON.stringify(s)); }
export function pushNote(bucket, note) {
  const s = store(); s[bucket] = s[bucket] || []; s[bucket].unshift(note); saveStore(s); return s[bucket];
}
export function getNotes(bucket) { return store()[bucket] || []; }
export function setOverride(bucket, id, value) {
  const s = store(); s[bucket] = s[bucket] || {}; s[bucket][id] = value; saveStore(s);
}
export function getOverrides(bucket) { return store()[bucket] || {}; }
