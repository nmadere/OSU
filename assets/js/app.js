import { loadData } from './data.js';
import { $, el } from './util.js';
import * as backend from './backend.js';
import { REQUIRE_LOGIN_TO_EDIT } from './config.js';
import * as V from './views.js';

const ROUTES = [
  { id: 'overview',     title: 'Overview',            ico: '◧', render: V.overview },
  { id: 'map',          title: 'Campus Map',          ico: '◉', render: V.mapView,        init: V.initMap },
  { id: 'buildings',    title: 'Buildings',           ico: '▤', render: V.buildingsView,  init: V.initBuildings },
  { id: 'phases',       title: 'Phases & Crew',       ico: '◷', render: V.phasesView },
  { id: 'schedule',     title: 'Schedule',            ico: '▦', render: V.scheduleView },
  { id: 'logistics',    title: 'Logistics',           ico: '⛟', render: V.logisticsView },
  { id: 'stakeholders', title: 'Stakeholders',        ico: '☷', render: V.stakeholdersView },
  { id: 'questions',    title: 'Open Questions',      ico: '❓', render: V.questionsView,  init: V.initQuestions },
  { id: 'updates',      title: 'Updates',             ico: '✎', render: V.updatesView,    init: V.initUpdates },
  { id: 'documents',    title: 'Documents',           ico: '🗎', render: V.documentsView },
];

let DATA = null;
let USER = null;

// Whether the current viewer may edit (post notes, toggle question status).
// Static mode: always (local edits). Live mode: only when signed in (unless disabled).
export function canEdit() {
  if (!backend.live()) return true;
  if (!REQUIRE_LOGIN_TO_EDIT) return true;
  return Boolean(USER);
}

function buildNav() {
  $('#nav').innerHTML = ROUTES.map(r => `<a href="#${r.id}" data-id="${r.id}"><span class="ico">${r.ico}</span>${r.title}</a>`).join('');
  $('#windowPill').textContent = DATA.project.meta.window;
  $('#sidebarParties').innerHTML = DATA.project.stakeholders
    .map(o => `<span class="party-chip" style="background:${o.color}">${shortOrg(o.org)}</span>`).join('');
  $('#appfoot').innerHTML = `${escapeHtml(DATA.project.meta.client)} · ${escapeHtml(DATA.project.meta.campus)} — prepared by ${escapeHtml(DATA.project.meta.preparedBy)} · ${escapeHtml(DATA.project.meta.logistics)}. Confidential planning hub.`;
  renderAuth();
}
const shortOrg = (o) => ({ 'Sofidel': 'Sofidel', 'Fastenal': 'Fastenal', 'The Ohio State University': 'Ohio State', 'AA Installation LLC': 'AA Install' }[o] || o);
const escapeHtml = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ---------- Auth UI (live mode only) ---------- */
function renderAuth() {
  const host = $('#authSlot');
  if (!host) return;
  if (!backend.live()) { host.innerHTML = ''; return; }
  host.innerHTML = USER
    ? `<span class="pill pill-ghost" title="${escapeHtml(USER.email)}">● ${escapeHtml(USER.email)}</span><button class="pill pill-ghost" id="signOutBtn">Sign out</button>`
    : `<button class="pill pill-window" id="signInBtn">Sign in to edit</button>`;
  const so = $('#signOutBtn'); if (so) so.onclick = async () => { await backend.signOut(); USER = null; renderAuth(); route(); };
  const si = $('#signInBtn'); if (si) si.onclick = openSignIn;
}
function openSignIn() {
  const modal = el(`<div class="modal-back"><div class="modal">
    <h3>Sign in</h3>
    <p class="muted" style="font-size:12.5px">Stakeholder accounts are created by the AA Installation admin.</p>
    <input id="siEmail" type="email" placeholder="Email" />
    <input id="siPass" type="password" placeholder="Password" />
    <div id="siErr" class="callout" style="display:none"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
      <button class="btn btn-ghost" id="siCancel">Cancel</button>
      <button class="btn" id="siGo">Sign in</button>
    </div></div></div>`);
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('#siCancel').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  modal.querySelector('#siGo').onclick = async () => {
    const err = modal.querySelector('#siErr');
    try {
      USER = await backend.signIn(modal.querySelector('#siEmail').value.trim(), modal.querySelector('#siPass').value);
      close(); renderAuth(); route();
    } catch (e) { err.style.display = 'block'; err.textContent = e.message || 'Sign-in failed.'; }
  };
}

function setActive(id) { document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.id === id)); }

function route() {
  const id = (location.hash.replace('#', '') || 'overview');
  const r = ROUTES.find(x => x.id === id) || ROUTES[0];
  $('#viewTitle').textContent = r.title;
  $('#view').innerHTML = r.render(DATA);
  window.scrollTo(0, 0);
  setActive(r.id);
  if (r.init) { Promise.resolve().then(() => r.init(DATA)).catch(e => console.error(e)); }
  $('#sidebar').classList.remove('open');
}

async function main() {
  try {
    DATA = await loadData();
  } catch (e) {
    $('#view').innerHTML = `<div class="callout">Could not load project data. If you opened this file directly, run it from a web server (e.g. <code>python3 -m http.server</code>) — browsers block <code>fetch()</code> on <code>file://</code>.</div>`;
    console.error(e); return;
  }
  if (backend.live()) {
    try { USER = await backend.currentUser(); } catch {}
    backend.startRealtime();
    // Refresh building-dependent views when live data changes.
    backend.onChange(async () => { await loadData(true).then(d => (DATA = d)); route(); });
  }
  buildNav();
  window.addEventListener('hashchange', route);
  $('#hamburger').onclick = () => $('#sidebar').classList.toggle('open');
  route();
}
main();
