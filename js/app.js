import { CONFIG } from './config.js';
import { bus } from './core/event-bus.js';
import { registerAll } from './core/crs-manager.js';
import * as LM from './core/layer-manager.js';
import { parseGeoJSON } from './data/geojson-import.js';
import { parseCSV, detectCoordColumns, csvToGeoJSON } from './data/csv-import.js';
import { fieldTypes, categorizedMap, breaks, rampColors } from './layers/styling.js';
import { renderTable } from './tables/attribute-table.js';
import * as MC from './map/map-controller.js';
const $ = id => document.getElementById(id);
const msg = (t, err) => { $('s-msg').textContent = t; $('s-msg').className = err ? 'err' : ''; };
registerAll();
MC.initMap(ll => $('s-coords').textContent = `Lon ${ll.lng.toFixed(6)}  Lat ${ll.lat.toFixed(6)} (EPSG:4326)`, t => $('s-scale').textContent = t);
function renderTree() {
  const ul = $('layer-tree'); ul.innerHTML = '';
  LM.layers.forEach(l => { const li = document.createElement('li'); if (l.id === LM.activeId) li.className = 'active';
    li.innerHTML = '<input type="checkbox"><span class="name"></span><button>↑</button><button>↓</button><button>⌖</button><button>✎</button><button>✕</button>';
    const [cb, nm, up, dn, zm, rn, rm] = li.children; nm.textContent = `${l.name} (${l.geojson.features.length})`;
    nm.onclick = () => LM.setActive(l.id); cb.checked = l.visible; cb.onchange = () => LM.setVisible(l.id, cb.checked);
    up.onclick = () => LM.move(l.id, -1); dn.onclick = () => LM.move(l.id, 1); zm.onclick = () => MC.zoomToLayer(l.id);
    rn.onclick = () => { const n = prompt('Layer name', l.name); if (n) LM.renameLayer(l.id, n); }; rm.onclick = () => LM.removeLayer(l.id);
    ul.appendChild(li); });
}
function renderSym() {
  const l = LM.getActive(), el = $('sym'); if (!l) { el.textContent = 'No active layer'; return; }
  const s = l.style, types = fieldTypes(l.geojson.features), fl = Object.keys(types), nf = fl.filter(f => types[f] === 'number');
  const opts = a => a.map(f => `<option${f === s.field ? ' selected' : ''}>${f}</option>`).join('');
  el.innerHTML = `<label>Mode <select id="m"><option value="single">Single</option><option value="categorized">Categorized</option><option value="graduated">Graduated</option></select></label>` +
    (s.mode === 'single' ? `<label>Color <input type="color" id="c" value="${s.color}"></label>` : `<label>Field <select id="f">${opts(s.mode === 'graduated' ? nf : fl)}</select></label>`) +
    (s.mode === 'graduated' ? `<label>Classes <input type="number" id="n" min="2" max="5" value="${s.n}"></label>` : '') +
    `<label>Line width <input type="number" id="w" min="1" max="10" value="${s.width}"></label><label>Opacity <input type="range" id="o" min="0.1" max="1" step="0.1" value="${s.opacity}"></label><div class="legend" id="lg"></div>`;
  $('m').value = s.mode;
  const apply = () => { if (s.mode === 'categorized' && s.field) s.cats = categorizedMap(l.geojson.features, s.field);
    if (s.mode === 'graduated' && s.field) s.edges = breaks(l.geojson.features, s.field, s.n) || []; bus.emit('layers'); };
  $('m').onchange = e => { s.mode = e.target.value; s.field = null; if (s.mode !== 'single') s.field = (s.mode === 'graduated' ? nf : fl)[0] || null;
    if (s.mode !== 'single' && !s.field) { msg('No suitable field for this mode', true); s.mode = 'single'; } apply(); };
  if ($('c')) $('c').oninput = e => { s.color = e.target.value; bus.emit('layers'); };
  if ($('f')) $('f').onchange = e => { s.field = e.target.value; apply(); };
  if ($('n')) $('n').onchange = e => { s.n = +e.target.value; apply(); };
  $('w').onchange = e => { s.width = +e.target.value; bus.emit('layers'); }; $('o').onchange = e => { s.opacity = +e.target.value; bus.emit('layers'); };
  const lg = $('lg'), row = (c, t) => { const d = document.createElement('div'); d.innerHTML = '<i></i><span></span>'; d.firstChild.style.background = c; d.lastChild.textContent = t; lg.appendChild(d); };
  if (s.mode === 'categorized') Object.entries(s.cats).forEach(([v, c]) => row(c, v));
  if (s.mode === 'graduated' && s.edges.length) rampColors(s.edges.length - 1).forEach((c, i) => row(c, `${s.edges[i].toFixed(2)} – ${s.edges[i + 1].toFixed(2)}`));
}
const hooks = { msg, zoomSel: MC.zoomToSelected, download: (name, text) => { const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click(); URL.revokeObjectURL(a.href); } };
bus.on('layers', () => { renderTree(); MC.redraw(); renderSym(); renderTable($('table-panel'), LM.getActive(), hooks); $('s-sel').textContent = `Selected: ${LM.selectedCount()}`; });
$('btn-add').onclick = () => $('file-input').click();
$('btn-zoom-all').onclick = MC.zoomToAll;
$('btn-new').onclick = () => { if (confirm('Remove all layers?')) { LM.clear(); msg('New project'); } };
$('basemap-toggle').onchange = e => { MC.setBasemap(e.target.checked); msg(e.target.checked ? 'Basemap needs internet; follow the tile provider usage policy' : 'Basemap off'); };
$('file-input').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (f.size > CONFIG.maxFileMB * 1048576 && !confirm(`${f.name} is large (${(f.size / 1048576).toFixed(1)} MB). Continue?`)) return;
  const text = await f.text(); let r;
  if (/\.csv$/i.test(f.name)) { const rows = parseCSV(text); if (rows.length < 2) return msg('Import failed: CSV has no data rows', true);
    let c = detectCoordColumns(rows[0]);
    if (!c) { const lat = prompt('Latitude column name (WGS84 degrees)?'), lon = lat && prompt('Longitude column name (WGS84 degrees)?'); if (!lon) return msg('Import cancelled: coordinate columns required', true); c = { lat: lat.trim(), lon: lon.trim() }; }
    r = csvToGeoJSON(rows, c.lat, c.lon); } else r = parseGeoJSON(text);
  if (!r.ok) return msg(`Import failed: ${r.errors[0]}`, true);
  const l = LM.addLayer(f.name.replace(/\.\w+$/, ''), r.geojson); MC.zoomToLayer(l.id);
  msg(r.skipped ? `Imported ${r.geojson.features.length} features; ${r.skipped} skipped (${r.errors[0]})` : `Imported ${r.geojson.features.length} features`, !!r.skipped);
};
