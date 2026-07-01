import { DEPT_COLORS, QUAD_COLORS, DEPTS } from './data.js';
import { $, el, n, esc, sum, groupBy } from './util.js';
import * as backend from './backend.js';
import { canEdit } from './app.js';

const deptBadge = (d) => `<span class="badge dept-${d}">${d}</span>`;

/* ---------------- OVERVIEW ---------------- */
export function overview({ buildings, project }) {
  const m = project.metrics;
  const byDept = groupBy(buildings, 'dept');
  const totalDisp = sum(buildings, b => b.total);
  const deptRows = project.departments.map(d => {
    const list = byDept[d.code] || [];
    return { d, bldgs: list.length, total: sum(list, b => b.total) };
  });
  const maxTotal = Math.max(...deptRows.map(r => r.total));

  return `
  <div class="section-head">
    <h2>Project Overview</h2>
    <p>${esc(project.meta.summary)}</p>
  </div>
  <div class="grid cols-4">
    ${metric(n(m.buildings), 'Buildings in scope', '5 departments · 4 quadrants')}
    ${metric(n(totalDisp), 'Mapped dispensers', `Confirmed program scope ~${n(m.confirmedScope)}`)}
    ${metric(project.phases.length, 'Install phases', 'Quadrant-first routing')}
    ${metric(project.meta.window, 'Target window', 'Crew base rate 150/team/day')}
  </div>

  <div class="grid cols-2" style="margin-top:14px">
    <div class="card pad">
      <h3>Scope by department</h3>
      <table>
        <thead><tr><th>Dept</th><th class="num">Buildings</th><th class="num">Towel</th><th class="num">Tissue</th><th class="num">Total</th></tr></thead>
        <tbody>
        ${project.departments.map(d => `
          <tr>
            <td>${deptBadge(d.code)} <span class="muted">${esc(d.name)}</span></td>
            <td class="num">${(byDept[d.code]||[]).length}</td>
            <td class="num">${n(d.towel)}</td>
            <td class="num">${n(d.tissue)}</td>
            <td class="num"><b>${n(d.total)}</b></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p class="note-banner">FOD installs <b>towel only</b> — tissue is not in scope at this time.</p>
    </div>

    <div class="card pad">
      <h3>Dispenser load by department</h3>
      ${deptRows.sort((a,b)=>b.total-a.total).map(r => `
        <div style="margin:9px 0">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
            <span>${deptBadge(r.d.code)} ${esc(r.d.name)}</span><b>${n(r.total)}</b>
          </div>
          <div class="pbar"><span style="width:${Math.round(r.total/maxTotal*100)}%;background:${r.d.color}"></span></div>
        </div>`).join('')}
    </div>
  </div>

  <div class="grid cols-2" style="margin-top:14px">
    <div class="card pad">
      <h3>Install sequence</h3>
      <ul class="checklist">
        ${project.phases.map(p => `<li><span class="mk">${p.n}</span>
          <div><b>${esc(p.name)}</b><div class="muted" style="font-size:12px">${esc(p.units)} · ${esc(p.duration)} · ${p.depts.map(deptBadge).join(' ')}</div></div></li>`).join('')}
      </ul>
      <a class="btn-ghost btn sm" href="#phases" style="margin-top:6px;display:inline-block">View phases &amp; crew model →</a>
    </div>
    <div class="card pad">
      <h3>Status &amp; next step</h3>
      <div class="callout"><b>Pre-installation planning.</b> All ${n(m.buildings)} buildings are currently <b>Not Started</b>. Next step: Fastenal alignment call &amp; confirm the install window, then answer the <a href="#questions">open questions</a> and finalize the Gantt.</div>
      <div class="callout amber" style="margin-top:10px"><b>${project.questions.filter(q=>q.status==='Open').length} open questions</b> across scope, materials, access, timeline, and vendor onboarding need owner responses. <a href="#questions">Track them →</a></div>
      <div class="callout blue" style="margin-top:10px"><b>Old-dispenser handling</b> not yet confirmed. Recommended: <b>Scenario A</b> — OSU custodial removes. <a href="#logistics">See logistics →</a></div>
    </div>
  </div>`;
}

function metric(num, lbl, sub) {
  return `<div class="card metric"><div class="bar"><div class="num">${num}</div><div class="lbl">${esc(lbl)}</div>${sub?`<div class="sub">${esc(sub)}</div>`:''}</div></div>`;
}

/* ---------------- CAMPUS MAP ---------------- */
let _map, _layer;
export function mapView() {
  return `
  <div class="section-head"><h2>Campus Map</h2>
    <p>All ${''}buildings plotted from GIS-verified coordinates. Marker size reflects dispenser count. Switch coloring between department, quadrant, and install status.</p></div>
  <div class="toolbar">
    <label class="muted">Color by</label>
    <select id="colorBy"><option value="dept">Department</option><option value="quadrant">Quadrant</option><option value="status">Status</option></select>
    <input type="search" id="mapSearch" placeholder="Find a building…" />
    <div class="chip-row" id="deptFilters"></div>
  </div>
  <div class="grid" style="grid-template-columns:1fr 230px;gap:14px">
    <div id="map"></div>
    <div class="card pad map-legend" id="legend"></div>
  </div>`;
}

export function initMap({ buildings }) {
  if (typeof L === 'undefined') {
    $('#map').innerHTML = '<div class="callout" style="margin:16px">Map library failed to load. Markers are listed in the <a href="#buildings">Buildings</a> table.</div>';
    return;
  }
  const pts = buildings.filter(b => b.lat && b.lng);
  _map = L.map('map').setView([40.0017, -83.0197], 14);
  const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19,
  }).addTo(_map);
  // Graceful degradation: if the basemap CDN is unreachable, markers still render on a plain canvas.
  let tileFail = false;
  tiles.on('tileerror', () => {
    if (tileFail) return; tileFail = true;
    document.getElementById('map').style.background = '#eef1f4';
    const note = $('#legend'); if (note) note.insertAdjacentHTML('beforeend',
      '<p class="muted" style="font-size:11px;margin-top:6px">Basemap tiles unavailable on this network — markers shown on a plain background.</p>');
  });
  _layer = L.layerGroup().addTo(_map);

  const activeDepts = new Set(DEPTS.concat(['Unassigned']));
  const colorByEl = $('#colorBy'), searchEl = $('#mapSearch');

  const radius = (t) => Math.max(5, Math.min(22, 4 + Math.sqrt(t) * 1.4));
  const colorOf = (b) => {
    const mode = colorByEl.value;
    if (mode === 'quadrant') return QUAD_COLORS[b.quadrant] || '#999';
    if (mode === 'status') return b.status === 'Complete' ? '#2E7D32' : b.status === 'In Progress' ? '#1F6FB2' : '#9aa0a6';
    return DEPT_COLORS[b.dept] || '#777';
  };

  function draw() {
    _layer.clearLayers();
    const q = (searchEl.value || '').toLowerCase();
    pts.forEach(b => {
      if (!activeDepts.has(b.dept)) return;
      if (q && !b.name.toLowerCase().includes(q)) return;
      const mk = L.circleMarker([b.lat, b.lng], {
        radius: radius(b.total), color: '#fff', weight: 1, fillColor: colorOf(b), fillOpacity: .85,
      });
      mk.bindPopup(popup(b));
      _layer.addLayer(mk);
    });
    drawLegend();
  }
  function drawLegend() {
    const lg = $('#legend'); const mode = colorByEl.value;
    let rows;
    if (mode === 'quadrant') rows = Object.entries(QUAD_COLORS);
    else if (mode === 'status') rows = [['Not Started', '#9aa0a6'], ['In Progress', '#1F6FB2'], ['Complete', '#2E7D32']];
    else rows = DEPTS.map(d => [d, DEPT_COLORS[d]]);
    lg.innerHTML = `<h3>Legend</h3>${rows.map(([k, c]) => `<div class="legend-row"><span class="dot" style="background:${c}"></span>${esc(k)}</div>`).join('')}
      <p class="muted" style="margin-top:10px;font-size:11px">Marker size ∝ dispenser count.<br>${pts.length} of ${buildings.length} buildings geocoded.</p>`;
  }
  // dept filter chips
  const df = $('#deptFilters');
  DEPTS.forEach(d => {
    const c = el(`<button class="fchip on" style="border-color:${DEPT_COLORS[d]}">${d}</button>`);
    c.onclick = () => { c.classList.toggle('on'); activeDepts.has(d) ? activeDepts.delete(d) : activeDepts.add(d); draw(); };
    df.appendChild(c);
  });
  colorByEl.onchange = draw;
  searchEl.oninput = draw;
  draw();
}
function popup(b) {
  const tb = b.manualTowel != null
    ? `<div class="row"><span>Manual / Auto towel</span><b>${b.manualTowel} / ${b.autoTowel}</b></div>
       <div class="row"><span>Quad / SBS / Vert tissue</span><b>${b.quadTissue} / ${b.sbsTissue} / ${b.vertTissue}</b></div>` : '';
  return `<div class="pop"><h4>${esc(b.name)}</h4>
    <div class="row"><span>Department</span>${deptBadge(b.dept)}</div>
    <div class="row"><span>Quadrant</span><b>${esc(b.quadrant)}</b></div>
    <div class="row"><span>Towel / Tissue</span><b>${b.towel} / ${b.tissue}</b></div>
    <div class="row"><span>Total dispensers</span><b>${b.total}</b></div>
    ${tb}
    <div class="row"><span>Tier</span><span>${esc(b.tier)}</span></div>
    ${b.address ? `<div class="row"><span>Address</span><span>${esc(b.address)}</span></div>` : ''}
    <div class="row"><span>Bldg #</span><span>${esc(b.bldg)}</span></div></div>`;
}

/* ---------------- BUILDINGS TABLE ---------------- */
let _sortKey = 'total', _sortDir = -1;
export function buildingsView({ buildings }) {
  return `
  <div class="section-head"><h2>Buildings</h2><p>All ${buildings.length} buildings in scope. Search, filter by department and quadrant, and sort any column. Click a column header to sort.</p></div>
  <div class="toolbar">
    <input type="search" id="bSearch" placeholder="Search building, address, bldg #…" />
    <select id="bDept"><option value="">All departments</option>${DEPTS.map(d=>`<option>${d}</option>`).join('')}</select>
    <select id="bQuad"><option value="">All quadrants</option>${['Southeast','Northeast','Southwest','Northwest','Unknown'].map(q=>`<option>${q}</option>`).join('')}</select>
    <span class="right muted" id="bCount"></span>
    <button class="btn btn-ghost sm" id="bExport">Export CSV</button>
  </div>
  <div class="table-wrap"><table id="bTable">
    <thead><tr>
      ${th('name','Building')}${th('dept','Dept')}${th('quadrant','Quadrant')}
      ${th('towel','Towel',1)}${th('tissue','Tissue',1)}${th('total','Total',1)}${th('tier','Tier')}
    </tr></thead><tbody id="bBody"></tbody>
  </table></div>`;
}
const th = (k, label, num) => `<th data-k="${k}" class="${num?'num':''}">${label}</th>`;

export function initBuildings({ buildings }) {
  const search = $('#bSearch'), dept = $('#bDept'), quad = $('#bQuad'), body = $('#bBody'), count = $('#bCount');
  function rows() {
    const q = (search.value||'').toLowerCase();
    let r = buildings.filter(b =>
      (!dept.value || b.dept === dept.value) &&
      (!quad.value || b.quadrant === quad.value) &&
      (!q || b.name.toLowerCase().includes(q) || (b.address||'').toLowerCase().includes(q) || (b.bldg||'').includes(q)));
    r.sort((a, b) => {
      let x = a[_sortKey], y = b[_sortKey];
      if (typeof x === 'string') return x.localeCompare(y) * _sortDir;
      return ((x||0) - (y||0)) * _sortDir;
    });
    return r;
  }
  function render() {
    const r = rows();
    count.textContent = `${r.length} of ${buildings.length}`;
    body.innerHTML = r.map(b => `<tr>
      <td><b>${esc(b.name)}</b><div class="muted" style="font-size:11px">${esc(b.address||'')}</div></td>
      <td>${deptBadge(b.dept)}</td><td>${esc(b.quadrant)}</td>
      <td class="num">${n(b.towel)}</td><td class="num">${n(b.tissue)}</td><td class="num"><b>${n(b.total)}</b></td>
      <td><span class="tag">${esc(b.tier)}</span></td></tr>`).join('');
  }
  [search, dept, quad].forEach(e => e.oninput = render);
  $('#bTable').querySelectorAll('th').forEach(h => h.onclick = () => {
    const k = h.dataset.k; if (_sortKey === k) _sortDir *= -1; else { _sortKey = k; _sortDir = (k==='total'||k==='towel'||k==='tissue')?-1:1; }
    render();
  });
  $('#bExport').onclick = () => exportCsv(rows());
  render();
}
function exportCsv(rows) {
  const cols = ['name','bldg','dept','quadrant','address','towel','tissue','total','tier','status','lat','lng'];
  const csv = [cols.join(',')].concat(rows.map(b => cols.map(c => `"${String(b[c]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'osu_buildings.csv'; a.click();
}

/* ---------------- PHASES & CREW ---------------- */
export function phasesView({ project }) {
  const c = project.crewModel;
  return `
  <div class="section-head"><h2>Phases, Routing &amp; Crew Model</h2>
    <p>Work is organized by physical quadrant first, department second — containing each crew to a defined zone to maximize dispensers installed per day.</p></div>

  <div class="grid cols-4">
    ${project.quadrants.sort((a,b)=>a.priority-b.priority).map(qd=>`
      <div class="card pad">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="tag" style="background:${QUAD_COLORS[qd.code]};color:#fff">${esc(qd.code)}</span>
          <span class="muted">Priority ${qd.priority}</span></div>
        <div style="font-family:Archivo;font-weight:800;font-size:22px;margin-top:8px">${n(qd.fodTowel)}</div>
        <div class="muted" style="font-size:12px">FOD towel · ${qd.fodBldgs} bldgs</div>
        <p style="font-size:12px;margin:8px 0 0" class="muted">${esc(qd.rationale)}</p>
      </div>`).join('')}
  </div>

  <h3 style="margin:18px 0 10px;font-family:Archivo">Install phases</h3>
  <div class="grid cols-2">
    ${project.phases.map(p=>`
      <div class="card phase">
        <div class="pn">${p.n}</div>
        <div>
          <h3>${esc(p.name)}</h3>
          <div class="deptline">${p.depts.map(deptBadge).join(' ')}</div>
          <div class="kv"><b>Units</b><span>${esc(p.units)}</span></div>
          <div class="kv"><b>Teams</b><span>${esc(p.teams)}</span></div>
          <div class="kv"><b>Duration</b><span>${esc(p.duration)}</span></div>
          <div class="kv"><b>Sequencing</b><span>${esc(p.seq)}</span></div>
        </div>
      </div>`).join('')}
  </div>

  <div class="grid cols-2" style="margin-top:14px">
    <div class="card pad">
      <h3>Crew deployment</h3>
      <p style="font-size:13px">${esc(c.base)}.</p>
      <table><thead><tr><th>Scenario</th><th>Rate</th><th>Duration</th></tr></thead><tbody>
        ${c.scenarios.map(s=>`<tr><td><b>${esc(s.name)}</b><div class="muted" style="font-size:11px">${esc(s.key)}</div></td><td>${esc(s.rate)}</td><td>${esc(s.duration)}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card pad">
      <h3>Special access &amp; constraints</h3>
      <ul class="checklist">
        ${project.specialAccess.map(s=>`<li><span class="mk">!</span><div><b>${esc(s.building)}</b><div class="muted" style="font-size:12.5px">${esc(s.note)}</div></div></li>`).join('')}
      </ul>
    </div>
  </div>`;
}

/* ---------------- LOGISTICS ---------------- */
export function logisticsView({ project }) {
  const L = project.logistics;
  return `
  <div class="section-head"><h2>Logistics &amp; Staging</h2><p>Receiving, on-campus staging, old-dispenser handling, and the campus-liaison request that drives daily crew throughput.</p></div>
  <div class="grid cols-2">
    <div class="card pad">
      <h3>Receiving &amp; staging</h3>
      <div class="callout"><b>Deliveries →</b> ${esc(L.deliveryTo)}</div>
      <ul class="checklist" style="margin-top:8px">${L.staging.map(s=>`<li><span class="mk">›</span><div>${esc(s)}</div></li>`).join('')}</ul>
      <div class="deptline" style="margin-top:6px">${L.stagingCandidates.map(s=>`<span class="tag">${esc(s)}</span>`).join('')}</div>
    </div>
    <div class="card pad">
      <h3>Old-dispenser handling</h3>
      ${project.oldDispenser.map(o=>`
        <div class="callout ${o.rec?'':'blue'}" style="margin-bottom:9px">
          <b>Scenario ${o.opt} — ${esc(o.title)}</b> ${o.rec?'<span class="badge status-resolved">Recommended</span>':''}
          <div style="font-size:12.5px;margin-top:3px">${esc(o.detail)}</div></div>`).join('')}
    </div>
  </div>
  <div class="card pad" style="margin-top:14px">
    <h3>Campus liaison request</h3>
    <div class="callout amber">${esc(L.liaison)}</div>
  </div>`;
}

/* ---------------- STAKEHOLDERS ---------------- */
export function stakeholdersView({ project }) {
  return `
  <div class="section-head"><h2>Stakeholders &amp; Directory</h2><p>This is a four-party project. Use the directory below to reach the right contact across Sofidel, Fastenal, Ohio State, and AA Installation.</p></div>
  <div class="grid cols-2">
    ${project.stakeholders.map(o=>`
      <div class="card org-card">
        <div class="org-head" style="background:${o.color}"><h3>${esc(o.org)}</h3><span>${esc(o.role)}</span></div>
        ${o.people.map(p=>`<div class="person"><span>${esc(p.name)}</span>${p.email?`<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`:'<span class="muted">—</span>'}</div>`).join('')}
      </div>`).join('')}
  </div>
  <div class="card pad" style="margin-top:14px">
    <h3>Department leads (Ohio State)</h3>
    <table><thead><tr><th>Dept</th><th>Lead</th><th>Confirmed scope</th><th>Notes</th></tr></thead><tbody>
      ${project.departments.map(d=>`<tr><td>${deptBadge(d.code)}</td><td>${esc(d.contact)}${d.contactEmail?` · <a href="mailto:${esc(d.contactEmail)}">${esc(d.contactEmail)}</a>`:''}</td><td class="num">${n(d.total)}</td><td class="muted" style="font-size:12px">${esc(d.note)}</td></tr>`).join('')}
    </tbody></table>
  </div>`;
}

/* ---------------- OPEN QUESTIONS ---------------- */
export function questionsView({ project }) {
  const cats = [...new Set(project.questions.map(q => q.cat))];
  return `
  <div class="section-head"><h2>Open Questions &amp; Decisions</h2>
    <p>The live decision register. <span id="qOpenCount">Items</span> awaiting an owner response before the Gantt can be finalized. Mark items resolved as answers come in.</p></div>
  <div class="toolbar">
    <select id="qCat"><option value="">All categories</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select>
    <select id="qStatus"><option value="">All statuses</option><option>Open</option><option>Resolved</option></select>
    <span class="right muted">Owners: Customer = Sofidel / Fastenal / OSU · AA Installation = installer</span>
  </div>
  <div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Category</th><th>Owner</th><th>Question</th><th>Status</th></tr></thead>
    <tbody id="qBody"></tbody>
  </table></div>
  <p class="note-banner" id="qBanner"></p>`;
}
export async function initQuestions({ project }) {
  const cat = $('#qCat'), st = $('#qStatus'), body = $('#qBody');
  let overrides = await backend.getQuestionOverrides();
  const eff = (q) => overrides[q.id] || q.status;
  const editable = canEdit();
  $('#qBanner').textContent = backend.live()
    ? (editable ? 'Changes are shared live with all stakeholders.' : 'Sign in to update statuses. Changes made by the team are shown live.')
    : 'Resolving an item updates your local view only — confirm with the team to update the shared record.';
  function render() {
    const openN = project.questions.filter(q => eff(q) === 'Open').length;
    const oc = $('#qOpenCount'); if (oc) oc.textContent = `${openN} item${openN===1?'':'s'}`;
    const rows = project.questions.filter(q => (!cat.value || q.cat===cat.value) && (!st.value || eff(q)===st.value))
      .sort((a,b)=> (eff(a)==='Open'?0:1)-(eff(b)==='Open'?0:1));
    body.innerHTML = rows.map(q => {
      const s = eff(q);
      const cls = s==='Resolved'?'status-resolved':'status-open';
      const btn = editable ? `<button class="btn btn-ghost sm" data-id="${q.id}" data-to="${s==='Open'?'Resolved':'Open'}" style="margin-left:6px">${s==='Open'?'Mark resolved':'Reopen'}</button>` : '';
      return `<tr class="qrow"><td><b>${esc(q.id)}</b></td><td><span class="tag">${esc(q.cat)}</span></td>
        <td>${esc(q.owner)}</td><td>${esc(q.q)}</td>
        <td><span class="badge ${cls}">${s}</span>${btn}</td></tr>`;
    }).join('');
    body.querySelectorAll('button').forEach(b => b.onclick = async () => {
      await backend.setQuestionOverride(b.dataset.id, b.dataset.to);
      overrides = await backend.getQuestionOverrides(); render();
    });
  }
  [cat, st].forEach(e => e.onchange = render);
  backend.onChange(async () => { overrides = await backend.getQuestionOverrides(); render(); });
  render();
}

/* ---------------- DOCUMENTS ---------------- */
export function documentsView({ project }) {
  return `
  <div class="section-head"><h2>Documents &amp; Resources</h2><p>Source documents behind this plan. Files live in the AA Installation project workspace; request access from the AA Installation admin.</p></div>
  <div class="grid cols-2">
    ${project.documents.map(d=>`
      <div class="card pad" style="display:flex;gap:12px;align-items:flex-start">
        <span class="tag" style="background:#fdeaea;color:#BB0000">${esc(d.type)}</span>
        <div><b>${esc(d.title)}</b><div class="muted" style="font-size:12.5px;margin-top:3px">${esc(d.note)}</div></div>
      </div>`).join('')}
  </div>
  <div class="callout" style="margin-top:14px"><b>Note on data sources.</b> The campus map and building tables are generated from <i>OSU Building Location Data</i> (GIS-verified). Dispenser scope figures follow <i>OSU Approach Plan v5</i>. Confidential commercial terms (unit pricing, billing) are intentionally excluded from this shared hub.</div>`;
}

/* ---------------- SCHEDULE / GANTT ---------------- */
const DAY = 86400000;
const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const fmtD = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function scheduleView({ project }) {
  const sc = project.schedule;
  const phases = sc.phases;
  const allDates = phases.flatMap(p => [parseD(p.start), parseD(p.end)])
    .concat(sc.blackouts.flatMap(b => [parseD(b.start), parseD(b.end)]))
    .concat(sc.milestones.map(m => parseD(m.date)));
  let min = new Date(Math.min(...allDates)), max = new Date(Math.max(...allDates));
  // pad to whole weeks
  min = new Date(min.getTime() - 3 * DAY); max = new Date(max.getTime() + 3 * DAY);
  const span = (max - min) / DAY;
  const pct = (dt) => ((dt - min) / DAY / span) * 100;
  const wid = (a, b) => ((parseD(b) - parseD(a)) / DAY / span) * 100;

  // month gridlines
  const months = [];
  let cur = new Date(Date.UTC(min.getUTCFullYear(), min.getUTCMonth(), 1));
  while (cur <= max) { months.push(new Date(cur)); cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1)); }

  const bars = phases.map(p => {
    const left = pct(parseD(p.start)), w = Math.max(wid(p.start, p.end), 1.5);
    return `<div class="gantt-row">
      <div class="gantt-label">${esc(p.name)}</div>
      <div class="gantt-track">
        <div class="gantt-bar" style="left:${left}%;width:${w}%;background:${p.color}" title="${esc(p.start)} → ${esc(p.end)}">
          <span>${fmtD(parseD(p.start))} – ${fmtD(parseD(p.end))}</span></div>
      </div></div>`;
  }).join('');

  const blackoutBands = sc.blackouts.map(b => {
    const left = pct(parseD(b.start)), w = Math.max(wid(b.start, b.end) + (100 / span / 2), 0.6);
    return `<div class="gantt-blackout" style="left:${left}%;width:${w}%" title="${esc(b.label)}"></div>`;
  }).join('');
  const monthMarks = months.map(mo => `<div class="gantt-grid" style="left:${pct(mo)}%"><span>${mo.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</span></div>`).join('');

  return `
  <div class="section-head"><h2>Schedule &amp; Timeline</h2>
    <p>Proposed phase Gantt with blackout bands. ${esc(sc.status)}</p></div>
  <div class="callout amber">${esc(sc.status)}</div>

  <div class="card pad" style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
      <h3>Phase Gantt</h3>
      <span class="muted" style="font-size:11.5px"><span class="dot" style="background:#e9b7b7"></span> shaded = proposed blackout</span>
    </div>
    <div class="gantt">
      <div class="gantt-grids">${monthMarks}${blackoutBands}</div>
      ${bars}
    </div>
  </div>

  <div class="grid cols-2" style="margin-top:14px">
    <div class="card pad">
      <h3>Key milestones</h3>
      <ul class="checklist">
        ${sc.milestones.map(m => `<li><span class="mk">◆</span><div><b>${fmtD(parseD(m.date))}, ${parseD(m.date).getUTCFullYear()}</b> — ${esc(m.label)}</div></li>`).join('')}
      </ul>
    </div>
    <div class="card pad">
      <h3>Blackout dates</h3>
      <table><thead><tr><th>Window</th><th>Type</th><th></th></tr></thead><tbody>
        ${sc.blackouts.map(b => `<tr><td><b>${fmtD(parseD(b.start))}${b.start!==b.end?' – '+fmtD(parseD(b.end)):''}</b><div class="muted" style="font-size:11.5px">${esc(b.label)}</div></td><td><span class="tag">${esc(b.type)}</span></td><td>${b.confirmed?'<span class="badge status-resolved">Confirmed</span>':'<span class="badge status-open">Unconfirmed</span>'}</td></tr>`).join('')}
      </tbody></table>
      <p class="note-banner">${esc(sc.blackoutNote)}</p>
    </div>
  </div>`;
}

/* ---------------- UPDATES (local collaboration) ---------------- */
export function updatesView() {
  const shared = backend.live();
  const gated = shared && !canEdit();
  return `
  <div class="section-head"><h2>Updates &amp; Coordination Notes</h2>
    <p>${shared ? 'Coordination notes are shared live across all stakeholders.' : 'Post coordination notes for the team. Notes are saved in your browser until the shared backend is connected (see README).'}</p></div>
  <div class="grid" style="grid-template-columns:1fr 1.4fr;gap:14px">
    <div class="card pad">
      <h3>New note</h3>
      ${gated ? '<div class="callout amber">Sign in to post shared notes.</div>' : `
      <div class="note-form">
        <input id="nAuthor" placeholder="Your name / org" />
        <select id="nTag"><option>Announcement</option><option>Logistics</option><option>Access</option><option>Scheduling</option><option>Question</option></select>
        <textarea id="nBody" rows="4" placeholder="Write an update for the stakeholders…"></textarea>
        <button class="btn" id="nPost">Post note</button>
      </div>`}
    </div>
    <div class="card pad">
      <h3>Recent notes</h3>
      <div id="noteList"><p class="muted">Loading…</p></div>
    </div>
  </div>`;
}
export async function initUpdates() {
  async function render() {
    const notes = await backend.listNotes();
    $('#noteList').innerHTML = notes.length ? notes.map(x => `
      <div class="note"><div class="meta"><span class="tag">${esc(x.tag)}</span><b>${esc(x.author||'Anonymous')}</b><span>${esc(x.when)}</span></div>${esc(x.body)}</div>`).join('')
      : '<p class="muted">No notes yet. Post the first coordination update.</p>';
  }
  const post = $('#nPost');
  if (post) post.onclick = async () => {
    const body = $('#nBody').value.trim(); if (!body) return;
    await backend.addNote({ author: $('#nAuthor').value.trim(), tag: $('#nTag').value, body });
    $('#nBody').value=''; render();
  };
  backend.onChange(render);
  render();
}
