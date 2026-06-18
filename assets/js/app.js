import { loadData } from './data.js';
import { $, el } from './util.js';
import * as V from './views.js';

const ROUTES = [
  { id: 'overview',     title: 'Overview',            ico: '◧', render: V.overview },
  { id: 'map',          title: 'Campus Map',          ico: '◉', render: V.mapView,        init: V.initMap },
  { id: 'buildings',    title: 'Buildings',           ico: '▤', render: V.buildingsView,  init: V.initBuildings },
  { id: 'phases',       title: 'Phases & Crew',       ico: '◷', render: V.phasesView },
  { id: 'logistics',    title: 'Logistics',           ico: '⛟', render: V.logisticsView },
  { id: 'stakeholders', title: 'Stakeholders',        ico: '☷', render: V.stakeholdersView },
  { id: 'questions',    title: 'Open Questions',      ico: '❓', render: V.questionsView,  init: V.initQuestions },
  { id: 'updates',      title: 'Updates',             ico: '✎', render: V.updatesView,    init: V.initUpdates },
  { id: 'documents',    title: 'Documents',           ico: '🗎', render: V.documentsView },
];

let DATA = null;

function buildNav() {
  const nav = $('#nav');
  nav.innerHTML = ROUTES.map(r => `<a href="#${r.id}" data-id="${r.id}"><span class="ico">${r.ico}</span>${r.title}</a>`).join('');
  // window pill + sidebar parties + footer
  $('#windowPill').textContent = DATA.project.meta.window;
  $('#sidebarParties').innerHTML = DATA.project.stakeholders
    .map(o => `<span class="party-chip" style="background:${o.color}">${shortOrg(o.org)}</span>`).join('');
  $('#appfoot').innerHTML = `${escapeHtml(DATA.project.meta.client)} · ${escapeHtml(DATA.project.meta.campus)} — prepared by ${escapeHtml(DATA.project.meta.preparedBy)} · ${escapeHtml(DATA.project.meta.logistics)}. Confidential planning hub.`;
}
const shortOrg = (o) => ({ 'Sofidel': 'Sofidel', 'Fastenal': 'Fastenal', 'The Ohio State University': 'Ohio State', 'AA Installation LLC': 'AA Install' }[o] || o);
const escapeHtml = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function setActive(id) {
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.id === id));
}

function route() {
  const id = (location.hash.replace('#', '') || 'overview');
  const r = ROUTES.find(x => x.id === id) || ROUTES[0];
  $('#viewTitle').textContent = r.title;
  $('#view').innerHTML = r.render(DATA);
  $('#view').scrollTo?.(0, 0);
  window.scrollTo(0, 0);
  setActive(r.id);
  if (r.init) { try { r.init(DATA); } catch (e) { console.error(e); } }
  // close mobile sidebar
  $('#sidebar').classList.remove('open');
}

async function main() {
  try {
    DATA = await loadData();
  } catch (e) {
    $('#view').innerHTML = `<div class="callout">Could not load project data. If you opened this file directly, run it from a web server (e.g. <code>python3 -m http.server</code>) — browsers block <code>fetch()</code> on <code>file://</code>.</div>`;
    console.error(e); return;
  }
  buildNav();
  window.addEventListener('hashchange', route);
  $('#hamburger').onclick = () => $('#sidebar').classList.toggle('open');
  route();
}
main();
