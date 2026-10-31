import { CONFIG } from './config.js';
import { bus } from './core/event-bus.js';
import * as CRS from './core/crs-manager.js';
import { validateLayer, validateGeometry } from './analysis/geometry-validation.js';
import { bufferLayer } from './analysis/buffer.js';
import { intersectLayers, differenceLayers, unionLayers } from './analysis/overlay.js';
import { dissolveLayer } from './analysis/dissolve.js';
import { selectByLocation, nearestPoints, bboxPolygons, centroidLayer } from './analysis/spatial-query.js';
import { filterIndices, filterMulti } from './tables/filtering.js';
import { project } from './core/project.js';
import { serializeProject, parseProject } from './core/project-serializer.js';
import { toGeoJSON } from './io/geojson-export.js';
import { toKML } from './io/kml-export.js';
import { layerToCSV, toCSV } from './io/csv-export.js';
import { drawMapCanvas } from './io/image-export.js';
import { legendEntries } from './layers/styling.js';
import { SCHEMAS, schemaOf, validateAssets, summarize, inventory } from './civil/assets.js';
import { addChainage } from './civil/chainage.js';
import * as R from './layers/raster-layer.js';
import { parseASC, looksGeographic } from './raster/asc-import.js';
import { sample, profile } from './raster/terrain.js';
import { parseKML } from './data/kml-import.js';
import { parseGPX } from './data/gpx-import.js';
import * as BM from './map/basemap-manager.js';
import { initPanels } from './ui/panels.js';
import * as H from './edit/history.js';
import * as DIG from './edit/digitize.js';
import * as VE from './edit/vertex-editor.js';
import { buildGeometry, newFeature, vertices, setVertex, removeVertex, midpoints, insertVertex, addFeatureCmd, deleteCmd, geomCmd } from './edit/edit-ops.js';
import { snapPosition } from './edit/snap.js';
import { parseFieldSpec, drawTypeOf, GEOM_TYPES } from './layers/schema.js';
import * as MEAS from './map/measurements.js';
import * as LM from './core/layer-manager.js';
import { parseGeoJSON } from './data/geojson-import.js';
import { parseCSV, detectCoordColumns, csvToGeoJSON } from './data/csv-import.js';
import { fieldTypes, categorizedMap, breaks, rampColors } from './layers/styling.js';
import { renderTable } from './tables/attribute-table.js';
import * as MC from './map/map-controller.js';
const $ = id => document.getElementById(id);
const msg = (t, err) => { $('s-msg').textContent = t; $('s-msg').className = err ? 'err' : ''; };
CRS.registerAll();
MC.initMap(showCoords, t => $('s-scale').textContent = t);
function renderTree() {
  const ul = $('layer-tree'); ul.innerHTML = '';
  let prevGroup = null;
  LM.layers.forEach(l => { if ((l.group || null) !== prevGroup) { prevGroup = l.group || null; if (prevGroup) ul.appendChild(groupRow(prevGroup)); } if (l.group && collapsedGroups.has(l.group)) return;
    const li = document.createElement('li'); if (l.id === LM.activeId) li.className = 'active';
    li.innerHTML = '<input type="checkbox"><span class="name"></span><button>↑</button><button>↓</button><button>⌖</button><button>✎</button><button>✕</button><button title="Duplicate layer">⧉</button><button title="Group">▤</button>';
    const [cb, nm, up, dn, zm, rn, rm, dup, grp] = li.children; nm.textContent = `${l.name} (${l.geojson.features.length})`;
    nm.title = `Source CRS: ${l.sourceCrs || l.crs}; stored as WGS84`; nm.onclick = () => LM.setActive(l.id); cb.checked = l.visible; cb.onchange = () => LM.setVisible(l.id, cb.checked);
    up.onclick = () => LM.move(l.id, -1); dn.onclick = () => LM.move(l.id, 1); zm.onclick = () => MC.zoomToLayer(l.id);
    rn.onclick = () => { const n = prompt('Layer name', l.name); if (n) LM.renameLayer(l.id, n); }; rm.onclick = () => LM.removeLayer(l.id); dup.onclick = () => LM.duplicateLayer(l.id); grp.onclick = () => { const n = prompt('Group name (empty removes the layer from its group)', l.group || ''); if (n !== null) LM.setGroup(l.id, n); };
    ul.appendChild(li); });
}
function renderSym() {
  const l = LM.getActive(), el = $('sym'); if (!l) { el.textContent = 'No active layer'; return; }
  const s = l.style, types = fieldTypes(l.geojson.features), fl = Object.keys(types), nf = fl.filter(f => types[f] === 'number');
  const opts = a => a.map(f => `<option${f === s.field ? ' selected' : ''}>${f}</option>`).join('');
  el.innerHTML = `<label>Mode <select id="m"><option value="single">Single</option><option value="categorized">Categorized</option><option value="graduated">Graduated</option></select></label>` +
    (s.mode === 'single' ? `<label>Color <input type="color" id="c" value="${s.color}"></label>` : `<label>Field <select id="f">${opts(s.mode === 'graduated' ? nf : fl)}</select></label>`) +
    (s.mode === 'graduated' ? `<label>Classes <input type="number" id="n" min="2" max="5" value="${s.n}"></label><label>Method <select id="gm"><option value="equal">Equal interval</option><option value="quantile">Quantile</option><option value="jenks">Natural breaks (Jenks)</option></select></label>` : '') +
    `<label>Line width <input type="number" id="w" min="1" max="10" value="${s.width}"></label><label>Point size <input type="number" id="r" min="2" max="20" value="${s.radius || 5}"></label><label>Opacity <input type="range" id="o" min="0.1" max="1" step="0.1" value="${s.opacity}"></label><div class="legend" id="lg"></div>`;
  $('m').value = s.mode; if ($('gm')) { $('gm').value = s.method || 'equal'; $('gm').onchange = e => { s.method = e.target.value; apply(); }; }
  const apply = () => { if (s.mode === 'categorized' && s.field) s.cats = categorizedMap(l.geojson.features, s.field);
    if (s.mode === 'graduated' && s.field) s.edges = breaks(l.geojson.features, s.field, s.n, s.method) || []; bus.emit('layers'); };
  $('m').onchange = e => { s.mode = e.target.value; s.field = null; if (s.mode !== 'single') s.field = (s.mode === 'graduated' ? nf : fl)[0] || null;
    if (s.mode !== 'single' && !s.field) { msg('No suitable field for this mode', true); s.mode = 'single'; } apply(); };
  if ($('c')) $('c').oninput = e => { s.color = e.target.value; bus.emit('layers'); };
  if ($('f')) $('f').onchange = e => { s.field = e.target.value; apply(); };
  if ($('n')) $('n').onchange = e => { s.n = +e.target.value; apply(); };
  $('w').onchange = e => { s.width = +e.target.value; bus.emit('layers'); }; $('r').onchange = e => { s.radius = Math.min(20, Math.max(2, +e.target.value || 5)); bus.emit('layers'); }; $('o').onchange = e => { s.opacity = +e.target.value; bus.emit('layers'); };
  const lg = $('lg'), row = (c, t) => { const d = document.createElement('div'); d.innerHTML = '<i></i><span></span>'; d.firstChild.style.background = c; d.lastChild.textContent = t; lg.appendChild(d); };
  if (s.mode === 'categorized') Object.entries(s.cats).forEach(([v, c]) => row(c, v));
  if (s.mode === 'graduated' && s.edges.length) rampColors(s.edges.length - 1).forEach((c, i) => row(c, `${s.edges[i].toFixed(2)} – ${s.edges[i + 1].toFixed(2)}`));
}
const hooks = { msg, zoomSel: MC.zoomToSelected, download: (name, text) => { const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click(); URL.revokeObjectURL(a.href); } };
bus.on('layers', () => { renderTree(); MC.redraw(); renderSym(); renderTable($('table-panel'), LM.getActive(), hooks); $('s-sel').textContent = `Selected: ${LM.selectedCount()}`; });
$('btn-add').onclick = () => $('file-input').click();
$('btn-zoom-all').onclick = MC.zoomToAll;
$('btn-new').onclick = () => { if (confirm('Remove all layers?')) { LM.clear(); H.clear(); project.name = 'Untitled project'; msg('New project'); } };
$('basemap-toggle').onchange = e => { MC.setBasemap(e.target.checked); msg(e.target.checked ? 'Basemap needs internet; follow the tile provider usage policy' : 'Basemap off'); };
$('file-input').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (f.size > CONFIG.maxFileMB * 1048576 && !confirm(`${f.name} is large (${(f.size / 1048576).toFixed(1)} MB). Continue?`)) return;
  if (/\.asc$/i.test(f.name)) return importAsc(f);
  if (/\.(kmz|zip|shp|gpkg|tif|tiff)$/i.test(f.name)) return msg(`${f.name.split('.').pop().toUpperCase()} import is not implemented yet. Supported: GeoJSON, CSV, KML, GPX, ESRI ASCII grid (.asc)`, true);
  const text = await f.text(); let r, srcCrs = 'EPSG:4326';
  const askCrs = why => { const c = CRS.normalize(prompt(why + '\nSource CRS EPSG code (e.g. 4326, 32646)? Cancel to abort.') || ''); if (!c) return null;
    if (!CRS.info(c)) { const d = prompt(c + ' is not built in. Paste its proj4 definition (you must verify it), or cancel:'); if (!d) return null;
      try { CRS.register(c, d); } catch (err) { msg('Invalid proj4 definition: ' + err.message, true); return null; } }
    return { code: c, tx: CRS.makeTransform(c, 'EPSG:4326') }; };
  if (/\.csv$/i.test(f.name)) { const rows = parseCSV(text); if (rows.length < 2) return msg('Import failed: CSV has no data rows', true);
    let c = detectCoordColumns(rows[0]), tx;
    if (!c) { const y = prompt('Y / latitude column name?'), x = y && prompt('X / longitude column name?'); if (!x) return msg('Import cancelled: coordinate columns required', true);
      c = { lat: y.trim(), lon: x.trim() }; const s = askCrs('Which CRS are the X/Y values in? (4326 if lon/lat degrees)'); if (!s) return msg('Import cancelled: CRS required', true); tx = s.tx; srcCrs = s.code; }
    r = csvToGeoJSON(rows, c.lat, c.lon, tx); }
  else if (/\.kml$/i.test(f.name)) r = parseKML(text);
  else if (/\.gpx$/i.test(f.name)) r = parseGPX(text);
  else { r = parseGeoJSON(text); if (!r.ok && /CRS/.test(r.errors[0])) { const s = askCrs(r.errors[0]); if (s) { r = parseGeoJSON(text, s.tx); srcCrs = s.code; } } }
  if (!r.ok) return msg(`Import failed: ${r.errors[0]}`, true);
  if (r.geojson.features.length > 20000 && !confirm(`${r.geojson.features.length} features: drawing and selection may be slow. Continue?`)) return;
  const l = LM.addLayer(f.name.replace(/\.\w+$/, ''), r.geojson); l.sourceCrs = srcCrs; l.fileName = f.name; MC.zoomToLayer(l.id);
  msg(r.skipped ? `Imported ${r.geojson.features.length} features; ${r.skipped} skipped (${r.errors[0]})` : `Imported ${r.geojson.features.length} features`, !!r.skipped);
  if (srcCrs !== 'EPSG:4326') $('s-msg').textContent += ` | reprojected from ${srcCrs} to WGS84 for storage`;
};
function showCoords(ll) {
  let t = `Lon ${ll.lng.toFixed(6)}  Lat ${ll.lat.toFixed(6)} (EPSG:4326)`; const c = CRS.projectCrs.code;
  if (c !== 'EPSG:4326') { try { const [x, y] = CRS.makeTransform('EPSG:4326', c)([ll.lng, ll.lat]); t += `  |  X ${x.toFixed(2)} Y ${y.toFixed(2)} (${c})`; } catch { t += `  |  ${c} unavailable`; } }
  $('s-coords').textContent = t; }
function renderCrs() {
  const el = $('crs'), cur = CRS.projectCrs.code;
  el.innerHTML = '<label>Project CRS <select id="pc"></select></label><button id="ec">Look up / add EPSG</button><p class="muted" id="ci"></p>';
  Object.entries(CRS.list()).forEach(([c, d]) => { const o = document.createElement('option'); o.value = c; o.textContent = `${c} ${d.name}`; o.selected = c === cur; $('pc').appendChild(o); });
  $('ci').textContent = `${CRS.info(cur).name}; units: ${CRS.info(cur).units}. Layers are stored in WGS84; project CRS drives the coordinate readout.`;
  $('pc').onchange = e => { CRS.projectCrs.code = e.target.value; $('s-crs').textContent = `Project CRS: ${e.target.value}`; renderCrs(); };
  $('ec').onclick = () => { const c = CRS.normalize(prompt('EPSG code?') || ''); if (!c) return;
    if (CRS.info(c)) return msg(`${c}: ${CRS.info(c).name}, units ${CRS.info(c).units}`);
    const d = prompt(`${c} is not built in. Paste a proj4 definition to add it (unverified), or cancel:`); if (!d) return;
    try { CRS.register(c, d); renderCrs(); msg(`${c} added from your definition`); } catch (err) { msg('Invalid proj4 definition: ' + err.message, true); } }; }
renderCrs();
$('btn-dist').onclick = () => MEAS.start('distance', msg);
$('btn-area').onclick = () => MEAS.start('area', msg);
document.addEventListener('keydown', e => { if (e.key === 'Escape') MEAS.stop(); });
$('btn-val').onclick = () => { const l = LM.getActive(); if (!l) return msg('No active layer', true);
  const r = validateLayer(l.geojson.features); LM.setSelection(l.id, r.invalid);
  const first = r.issues.find(x => x.level === 'error') || r.issues[0];
  msg(`${l.name}: ${r.invalid.length} of ${l.geojson.features.length} features invalid, ${r.warnings} warnings` + (first ? ` (first: feature ${first.index}, ${first.msg})` : ''), r.invalid.length > 0); };
const OPS = {
  buffer: { label: 'Buffer', in: ['dist'], doc: 'Distance in metres around WGS84 lon/lat geometry (Turf, local projection); approximate for very large distances.' },
  centroid: { label: 'Centroid', in: [], doc: 'Planar centre of mass on lon/lat; adequate for small features, not a geodesic centroid.' },
  bbox: { label: 'Bounding box', in: [], doc: 'Axis-aligned box in lon/lat degrees.' },
  dissolve: { label: 'Dissolve', in: ['field'], opt: true, doc: 'Polygons only. Unions features sharing a field value (or all if none). Topological on lon/lat.' },
  intersect: { label: 'Intersect', in: ['layerB'], doc: 'Polygon layers only. Pairwise intersection, attributes of both kept (B fields prefixed b_ on clashes).' },
  difference: { label: 'Difference (A - B)', in: ['layerB'], doc: 'Polygon layers only. A minus all B; A attributes kept.' },
  union: { label: 'Union', in: ['layerB'], doc: 'Polygon layers only. One merged geometry, no attributes.' },
  nearest: { label: 'Nearest feature', in: ['layerB'], doc: 'Point layers only. Spherical distance in metres (~0.5%).' },
  within: { label: 'Select by location', in: ['layerB'], doc: 'Selects features inside/intersecting polygons of the second layer. Boundary points may fall either way.' },
  attr: { label: 'Select by attribute', in: ['field', 'cmp'], doc: 'Missing values never match.' }
};
const ana = { op: 'buffer', dist: 100, field: '', cmp: '=', value: '', b: '' };
function renderAna() {
  const l = LM.getActive(), el = $('ana'); el.textContent = ''; if (!l) { el.textContent = 'No active layer'; return; }
  const types = fieldTypes(l.geojson.features), op = OPS[ana.op];
  const mk = (t, n) => { const lb = document.createElement('label'); lb.append(t + ' ', n); el.appendChild(lb); return n; };
  const sel = (items, val, fn) => { const s = document.createElement('select'); items.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); }); s.value = val; s.onchange = () => fn(s.value); return s; };
  mk('Operation', sel(Object.entries(OPS).map(([k, o]) => [k, o.label]), ana.op, v => { ana.op = v; renderAna(); }));
  if (op.in.includes('dist')) { const i = mk('Distance (m)', document.createElement('input')); i.type = 'number'; i.min = 0; i.value = ana.dist; i.onchange = () => ana.dist = +i.value; }
  if (op.in.includes('field')) mk('Field', sel([['', op.opt ? '(none)' : '- choose -'], ...Object.keys(types).map(f => [f, f])], ana.field, v => ana.field = v));
  if (op.in.includes('cmp')) { mk('Test', sel(['=', '!=', '<', '<=', '>', '>=', 'contains'].map(x => [x, x]), ana.cmp, v => ana.cmp = v)); const i = mk('Value', document.createElement('input')); i.value = ana.value; i.onchange = () => ana.value = i.value; }
  if (op.in.includes('layerB')) { const o = LM.layers.filter(x => x.id !== l.id); if (!o.some(x => String(x.id) === ana.b)) ana.b = o[0] ? String(o[0].id) : ''; mk('Second layer', sel(o.map(x => [String(x.id), x.name]), ana.b, v => ana.b = v)); }
  const p = document.createElement('p'); p.className = 'muted'; p.textContent = op.doc; el.appendChild(p);
  const b = document.createElement('button'); b.textContent = 'Run'; b.onclick = runAna; el.appendChild(b);
}
async function runAna() {
  const l = LM.getActive(); if (!l) return msg('No active layer', true); const F = l.geojson.features, op = OPS[ana.op];
  const B = LM.layers.find(x => String(x.id) === ana.b)?.geojson.features;
  if (op.in.includes('layerB') && !B) return msg('Add a second layer first', true);
  if (op.in.includes('field') && !op.opt && !ana.field) return msg('Choose a field', true);
  if (F.length * (B?.length || 1) > 2e6 && !confirm('Large operation; the page may freeze while it runs. Continue?')) return;
  msg(`Running ${op.label}...`); await new Promise(r => setTimeout(r, 20));
  try { const t = globalThis.turf; if (!t && !['nearest', 'bbox', 'attr'].includes(ana.op)) return msg('Turf.js failed to load (offline?); this operation is unavailable', true);
    const r = { buffer: () => bufferLayer(F, ana.dist, t), centroid: () => centroidLayer(F, t), bbox: () => bboxPolygons(F), dissolve: () => dissolveLayer(F, ana.field, t),
      intersect: () => intersectLayers(F, B, t), difference: () => differenceLayers(F, B, t), union: () => unionLayers(F, B, t), nearest: () => nearestPoints(F, B),
      within: () => selectByLocation(F, B, t), attr: () => filterIndices(F, ana.field, ana.cmp, ana.value) }[ana.op]();
    if (r.error) return msg(r.error, true); const errs = r.errors || [], tail = errs.length ? `; notes: ${errs.length} (first: ${errs[0]})` : '';
    if (r.indices) { LM.setSelection(l.id, r.indices); return msg(`${r.indices.length} of ${F.length} features selected${tail}`, errs.length > 0); }
    if (!r.features.length) return msg(`${op.label}: no output${tail}`, true);
    const o = LM.addLayer(`${l.name} ${ana.op}`, { type: 'FeatureCollection', features: r.features }); o.sourceCrs = 'EPSG:4326'; MC.zoomToLayer(o.id);
    msg(`${op.label}: ${r.features.length} features${tail}`, errs.length > 0);
  } catch (e) { msg(`${op.label} failed: ${e.message}`, true); } }
bus.on('layers', renderAna); renderAna();
$('btn-ana').onclick = () => $('ana').scrollIntoView();
const dl = (name, data, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
const slug = s => s.replace(/[^\w.-]+/g, '_');
$('btn-save').onclick = () => { if (!LM.layers.length && !confirm('No layers. Save an empty project?')) return;
  const n = prompt('Project name', project.name); if (!n) return; project.name = n;
  const text = JSON.stringify(serializeProject({ name: n, projectCrs: CRS.projectCrs.code, view: MC.getView(), layers: LM.layers, crsDefinitions: CRS.userDefs(), rasters: R.rasters })), mb = text.length / 1048576;
  if (mb > 25 && !confirm(`Project is ${mb.toFixed(0)} MB. Continue?`)) return;
  dl(`${slug(n)}.evlab.json`, text, 'application/json'); msg(`Download started (${mb.toFixed(2)} MB). Vector data is embedded.` + (R.rasters.length ? ' Rasters are NOT embedded: re-add them from their source files.' : '')); };
$('btn-open').onclick = () => $('proj-input').click();
$('proj-input').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const r = parseProject(await f.text()); if (!r.ok) return msg('Open failed: ' + r.errors[0], true);
  if (LM.layers.length && !confirm('Replace the current project?')) return; const p = r.project, w = [...r.warnings];
  for (const [c, d] of Object.entries(p.crsDefinitions)) { try { CRS.register(c, d); w.push(`${c} restored from the project's own definition (unverified)`); } catch { w.push(`CRS ${c}: invalid definition`); } }
  if (!CRS.info(p.projectCrs)) { w.push(`Project CRS ${p.projectCrs} unknown; using EPSG:4326`); p.projectCrs = 'EPSG:4326'; }
  p.rasters.forEach(x => w.push(`Raster "${x.name}" (${x.fileName || 'unknown file'}) is not embedded; add it again`)); LM.clear(); H.clear(); project.name = p.name; CRS.projectCrs.code = p.projectCrs; $('s-crs').textContent = `Project CRS: ${p.projectCrs}`;
  [...p.layers].reverse().forEach(d => { const l = LM.addLayer(d.name, d.geojson); Object.assign(l, { visible: d.visible, sourceCrs: d.sourceCrs, fileName: d.fileName, schema: d.schema, geomType: d.geomType, civil: d.civil, labels: d.labels, filter: d.filter, group: d.group }); Object.assign(l.style, d.style); });
  if (LM.layers.length) LM.setActive(LM.layers[0].id); renderCrs(); p.map ? MC.setView(p.map) : MC.zoomToAll();
  msg(`Opened "${p.name}": ${p.layers.length} layers` + (w.length ? `; ${w.length} warnings (first: ${w[0]})` : ''), w.length > 0); };
$('exp').onchange = e => { const v = e.target.value; e.target.value = ''; const l = LM.getActive(); if (v !== 'png' && !l) return msg('No active layer', true);
  if (v === 'geojson') { dl(`${slug(l.name)}.geojson`, toGeoJSON(l), 'application/geo+json'); msg(`GeoJSON download started (${l.geojson.features.length} features, WGS84)`); }
  if (v === 'csv') { const r = layerToCSV(l.geojson.features); dl(`${slug(l.name)}.csv`, r.text, 'text/csv'); msg('CSV download started' + (r.note ? `. ${r.note}` : '')); }
  if (v === 'kml') { try { dl(`${slug(l.name)}.kml`, toKML(l.name, l.geojson.features), 'application/vnd.google-earth.kml+xml'); msg('KML download started (geometry and attributes, no styling)'); } catch (err) { msg('KML export failed: ' + err.message, true); } }
  if (v === 'png') { try { drawMapCanvas(window.__map || MC.getMap(), LM.layers, project.name).toBlob(b => { dl(`${slug(project.name)}.png`, b, 'image/png'); msg('PNG download started (vector layers only, no basemap)'); }); } catch (err) { msg('PNG export failed: ' + err.message, true); } } };
$('btn-print').onclick = () => { $('print-title').textContent = project.name; const lg = $('print-legend'); lg.textContent = '';
  LM.layers.filter(l => l.visible).forEach(l => legendEntries(l).slice(0, 12).forEach(e => { const d = document.createElement('div'), i = document.createElement('i'); i.style.background = e.color; d.append(i, e.label); lg.appendChild(d); }));
  window.print(); };
let civilOut = '', civilForm = { layer: null, type: SCHEMAS[0].id, map: {} };
const fmtSum = s => [`Features: ${s.count}`, s.length_m !== undefined && `Length: ${(s.length_m / 1000).toFixed(3)} km (spherical approx.)`, s.area_m2 !== undefined && `Area: ${(s.area_m2 / 1e4).toFixed(2)} ha (spherical approx.)`,
  s.ground_level && `Ground level: ${s.ground_level.min}..${s.ground_level.max} m (${s.ground_level.n} values)`,
  ...Object.entries(s).filter(([k]) => k.startsWith('by_')).map(([k, v]) => `${k.slice(3)}: ` + Object.entries(v).map(([a, n]) => `${a} x${n}`).join(', '))].filter(Boolean).join('\n');
function renderCivil() {
  const l = LM.getActive(), el = $('civil'); el.textContent = ''; if (!l) { el.textContent = 'No active layer'; return; }
  const fields = Object.keys(fieldTypes(l.geojson.features)), add = (t, n) => { const lb = document.createElement('label'); lb.append(t + ' ', n); el.appendChild(lb); return n; };
  const sel = (items, val, fn) => { const s = document.createElement('select'); items.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); }); s.value = val; s.onchange = () => fn(s.value); return s; };
  const btn = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.onclick = fn; el.appendChild(b); };
  if (civilForm.layer !== l.id) civilForm = { layer: l.id, type: l.civil?.type || civilForm.type, map: { ...(l.civil?.map || {}) } };
  const s = schemaOf(civilForm.type);
  add('Asset type', sel(SCHEMAS.map(x => [x.id, x.label]), civilForm.type, v => { civilForm.type = v; civilForm.map = {}; renderCivil(); }));
  s.fields.forEach(x => { if (!(x.key in civilForm.map)) { const m = fields.find(f => f.toLowerCase() === x.key); if (m) civilForm.map[x.key] = m; }
    add(x.label + (x.required ? ' *' : ''), sel([['', '(not mapped)'], ...fields.map(f => [f, f])], civilForm.map[x.key] || '', v => civilForm.map[x.key] = v)); });
  btn('Assign to layer', () => { l.civil = { type: civilForm.type, map: Object.fromEntries(Object.entries(civilForm.map).filter(([, v]) => v)) }; civilOut = `Assigned as ${s.label}. Only your own columns are mapped; no data was added.`; renderCivil(); });
  if (l.civil) { const c = l.civil, F = l.geojson.features;
    btn('Check', () => { const r = validateAssets(F, c); civilOut = r.length ? r.map(x => `${x.level.toUpperCase()}: ${x.msg}`).join('\n') : 'No issues found by these checks'; renderCivil(); });
    btn('Summary', () => { civilOut = fmtSum(summarize(F, c)); renderCivil(); });
    btn('Inventory CSV', () => { const r = inventory(F, c); dl(`${slug(l.name)}_inventory.csv`, toCSV(r.fields, r.rows), 'text/csv'); msg(`Inventory download started (${r.rows.length} assets)`); });
    const styleBy = (key, mode) => { const col = c.map[key], t = fieldTypes(F)[col]; if (!col) return msg(`${key} is not mapped`, true); if (mode === 'graduated' && t !== 'number') return msg(`${col} is not numeric`, true);
      Object.assign(l.style, { mode, field: col, n: 4 }); if (mode === 'graduated') l.style.edges = breaks(F, col, 4) || []; else l.style.cats = categorizedMap(F, col); bus.emit('layers'); };
    btn('Style by diameter', () => styleBy('diameter_mm', 'graduated')); btn('Style by material', () => styleBy('material', 'categorized'));
    if (schemaOf(c.type).geoms.includes('Point')) { const lines = LM.layers.filter(x => x.id !== l.id && x.geojson.features.length === 1 && x.geojson.features[0].geometry?.type === 'LineString');
      if (lines.length) { let pick = String(lines[0].id); add('Alignment (1 line)', sel(lines.map(x => [String(x.id), x.name]), pick, v => pick = v));
        btn('Add chainage', () => { const a = LM.layers.find(x => String(x.id) === pick), r = addChainage(F, a.geojson.features); if (!r.features.length) return msg(r.errors[0], true);
          const o = LM.addLayer(`${l.name} chainage`, { type: 'FeatureCollection', features: r.features }); o.sourceCrs = 'EPSG:4326'; o.civil = { type: c.type, map: { ...c.map } };
          msg(`Chainage added on a new layer (${r.features.length} points)` + (r.errors.length ? `; ${r.errors.length} skipped` : ''), r.errors.length > 0); }); } } }
  if (civilOut) { const p = document.createElement('pre'); p.className = 'muted'; p.textContent = civilOut; el.appendChild(p); } }
bus.on('layers', renderCivil); renderCivil();
let rastActive = null, sampling = false;
async function importAsc(f) {
  const t = await f.text(), r = parseASC(t); if (!r.ok) return msg(`Import failed: ${r.errors[0]}`, true);
  if (!looksGeographic(r.grid)) return msg('Import failed: coordinates are not lon/lat degrees. Raster reprojection is not implemented, so only WGS84 geographic grids can be displayed.', true);
  if (!confirm('ASCII grids carry no CRS. Are these coordinates WGS84 lon/lat degrees and the cell values elevations in metres?')) return msg('Import cancelled: CRS and units must be confirmed', true);
  if (r.grid.ncols * r.grid.nrows > 4e6 && !confirm(`${r.grid.ncols} x ${r.grid.nrows} cells: this will use a lot of memory. Continue?`)) return;
  const x = R.addRaster(f.name.replace(/\.\w+$/, ''), r.grid, f.name); rastActive = x.id; await R.draw(x); R.zoomToRaster(x); renderRast();
  msg(`Raster loaded: ${r.grid.ncols} x ${r.grid.nrows} cells, ${x.stats.nodata} NODATA`); }
function renderRast() {
  const el = $('rast'); el.textContent = ''; if (!R.rasters.length) { el.textContent = 'No raster loaded. Add an ESRI ASCII grid (.asc) in WGS84 degrees.'; return; }
  const x = R.rasters.find(r => r.id === rastActive) || R.rasters[0]; rastActive = x.id;
  const add = (t, n) => { const lb = document.createElement('label'); lb.append(t + ' ', n); el.appendChild(lb); return n; };
  const sel = (items, val, fn) => { const s = document.createElement('select'); items.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); }); s.value = val; s.onchange = () => fn(s.value); return s; };
  const btn = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.onclick = fn; el.appendChild(b); };
  add('Raster', sel(R.rasters.map(r => [String(r.id), r.name]), String(x.id), v => { rastActive = +v; renderRast(); }));
  add('Display', sel([['elevation', 'Elevation'], ['hillshade', 'Hillshade (315/45)'], ['slope', 'Slope']], x.mode, async v => { x.mode = v; msg('Computing...'); await R.draw(x); renderRast(); msg('Ready'); }));
  const o = add('Opacity', document.createElement('input')); o.type = 'range'; o.min = 0.1; o.max = 1; o.step = 0.1; o.value = x.opacity; o.onchange = () => { x.opacity = +o.value; x.overlay?.setOpacity(x.opacity); };
  const v = add('Visible', document.createElement('input')); v.type = 'checkbox'; v.checked = x.visible; v.onchange = async () => { x.visible = v.checked; await R.draw(x); };
  btn('Zoom', () => R.zoomToRaster(x)); btn('Remove', () => { R.removeRaster(x.id); rastActive = null; renderRast(); });
  btn(sampling ? 'Sampling: click map (off)' : 'Sample elevation', () => { sampling = !sampling; msg(sampling ? 'Click the map to read the elevation' : 'Sampling off'); renderRast(); });
  const s = x.stats, p = document.createElement('p'); p.className = 'muted';
  p.textContent = `${x.grid.ncols} x ${x.grid.nrows} cells, ${x.grid.cell} deg. Elevation min ${s.min}, max ${s.max}, mean ${s.mean?.toFixed(2)}, NODATA ${s.nodata}. Showing ${x.legend ? `${x.legend.min?.toFixed(2)} to ${x.legend.max?.toFixed(2)}` : '...'}. Slope/hillshade leave the outer cell ring empty.`; el.appendChild(p);
  const lines = LM.layers.filter(l => l.geojson.features.length === 1 && l.geojson.features[0].geometry?.type === 'LineString');
  if (lines.length) { let pick = String(lines[0].id), step = 50; add('Profile line', sel(lines.map(l => [String(l.id), l.name]), pick, q => pick = q));
    const st = add('Step (m)', document.createElement('input')); st.type = 'number'; st.min = 1; st.value = step; st.onchange = () => step = +st.value;
    btn('Profile CSV', () => { const ln = LM.layers.find(l => String(l.id) === pick).geojson.features[0].geometry.coordinates, pr = profile(x.grid, ln, step > 0 ? step : 50), miss = pr.filter(q => q.z === null).length;
      dl(`${slug(x.name)}_profile.csv`, toCSV(['distance_m', 'lon', 'lat', 'elevation'], pr.map(q => ({ distance_m: q.d.toFixed(2), lon: q.lon, lat: q.lat, elevation: q.z }))), 'text/csv');
      msg(`Profile download started: ${pr.length} points, ${miss} without data` , miss > 0); }); } }
renderRast();
MC.getMap().on('click', e => { if (!sampling) return; const x = R.rasters.find(r => r.id === rastActive); if (!x) return; const z = sample(x.grid, e.latlng.lng, e.latlng.lat);
  msg(z === null ? 'No raster data at this point' : `Elevation ${z.toFixed(2)} m at ${e.latlng.lng.toFixed(5)}, ${e.latlng.lat.toFixed(5)} (nearest cell)`, z === null); });
$('xyz-apply').onclick = () => { const e = BM.validateXYZ($('xyz-url').value, $('xyz-attr').value); if (e.length) return msg(e[0], true);
  $('basemap-toggle').checked = false; MC.setBasemap(false); BM.setCustom($('xyz-url').value, $('xyz-attr').value); msg('Custom basemap added (needs internet; check the provider terms and rate limits)'); };
$('xyz-clear').onclick = () => { BM.clearCustom(); msg('Custom basemap removed'); };
$('basemap-toggle').addEventListener('change', e => { if (e.target.checked) BM.clearCustom(); });
$('btn-id').onclick = () => { const on = !MC.identify; MC.setIdentify(on); $('btn-id').style.background = on ? '#ffd54f' : ''; msg(on ? 'Identify on: click a feature to see its attributes' : 'Identify off'); };
let labForm = { field: '', op: '=', value: '' };
function renderLab() {
  const l = LM.getActive(), el = $('lab'); el.textContent = ''; if (!l) { el.textContent = 'No active layer'; return; } const fields = Object.keys(fieldTypes(l.geojson.features));
  const add = (t, n) => { const lb = document.createElement('label'); lb.append(t + ' ', n); el.appendChild(lb); return n; };
  const sel = (items, val, fn) => { const s = document.createElement('select'); items.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); }); s.value = val; s.onchange = () => fn(s.value); return s; };
  const btn = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.onclick = fn; el.appendChild(b); };
  add('Label field', sel([['', '(none)'], ...fields.map(f => [f, f])], l.labels.field || '', v => LM.setLabels(l.id, { field: v || null })));
  const sz = add('Size (px)', document.createElement('input')); sz.type = 'number'; sz.min = 6; sz.max = 40; sz.value = l.labels.size; sz.onchange = () => LM.setLabels(l.id, { size: Math.min(40, Math.max(6, +sz.value || 12)) });
  const co = add('Colour', document.createElement('input')); co.type = 'color'; co.value = l.labels.color; co.oninput = () => LM.setLabels(l.id, { color: co.value });
  const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Labels are drawn for up to 500 visible features per layer.'; el.appendChild(p);
  if (!labForm.field || !fields.includes(labForm.field)) labForm.field = fields[0] || '';
  const h = document.createElement('h4'); h.textContent = 'Display filter'; el.appendChild(h);
  (l.filter?.conds || []).forEach((c, i) => { const row = document.createElement('div'); row.textContent = `${i ? l.filter.join + ' ' : ''}${c.field} ${c.op} ${c.value} `; const x = document.createElement('button'); x.textContent = '✕';
    x.onclick = () => { const conds = l.filter.conds.filter((_, k) => k !== i); LM.setFilter(l.id, conds.length ? { join: l.filter.join, conds } : null); }; row.appendChild(x); el.appendChild(row); });
  if ((l.filter?.conds.length || 0) > 1) add('Combine with', sel([['AND', 'AND (all)'], ['OR', 'OR (any)']], l.filter.join, v => LM.setFilter(l.id, { ...l.filter, join: v })));
  add('Field', sel(fields.map(f => [f, f]), labForm.field, v => labForm.field = v)); add('Test', sel(['=', '!=', '<', '<=', '>', '>=', 'contains'].map(x => [x, x]), labForm.op, v => labForm.op = v));
  const va = add('Value', document.createElement('input')); va.value = labForm.value; va.onchange = () => labForm.value = va.value;
  btn('Add condition', () => { const r = filterIndices(l.geojson.features, labForm.field, labForm.op, va.value); if (r.error) return msg(r.error, true); const cur = l.filter || { join: 'AND', conds: [] };
    LM.setFilter(l.id, { join: cur.join, conds: [...cur.conds, { field: labForm.field, op: labForm.op, value: va.value }] }); msg(`Filter shows ${filterMulti(l.geojson.features, l.filter).indices.length} of ${l.geojson.features.length} features (the attribute table still lists all)`); });
  btn('Clear filter', () => { LM.setFilter(l.id, null); msg('Filter cleared'); }); }
bus.on('layers', renderLab); renderLab();
const collapsedGroups = new Set();
function groupRow(name) { const li = document.createElement('li'); li.className = 'group'; const cb = document.createElement('input'), t = document.createElement('span'), m = LM.layers.filter(l => l.group === name);
  cb.type = 'checkbox'; cb.checked = m.every(l => l.visible); cb.onchange = () => LM.setGroupVisible(name, cb.checked);
  t.className = 'name'; t.textContent = `${collapsedGroups.has(name) ? '▸' : '▾'} ${name} (${m.length})`; t.onclick = () => { collapsedGroups.has(name) ? collapsedGroups.delete(name) : collapsedGroups.add(name); renderTree(); }; li.append(cb, t); return li; }
initPanels(MC.invalidateSize);
let editLayerId = null, vertexMode = false, snapOn = true, snapNote = '';
/** Snaps to vertices/edges of visible layers within 10 px. `skip` = [layerId, featureIndex] to ignore (the feature being edited). */
function snapFn(skip) { return pos => { snapNote = ''; if (!snapOn) return pos; const geoms = (function* () { for (const l of LM.layers) if (l.visible) for (let i = 0; i < l.geojson.features.length; i++) if (!(skip && skip[0] === l.id && skip[1] === i)) yield l.geojson.features[i].geometry; })();
  const r = snapPosition(pos, geoms, MC.snapTolerance(pos, 10)); if (r.kind) snapNote = ` (snapped to ${r.kind})`; return r.pos; }; }
const errorsOf = g => validateGeometry(g).filter(x => x.level === 'error');
function renderEdit() {
  const el = $('edit'); el.textContent = ''; const l = LM.getActive(); if (editLayerId && !LM.layers.some(x => x.id === editLayerId)) editLayerId = null;
  const btn = (t, fn, off) => { const b = document.createElement('button'); b.textContent = t; b.onclick = fn; b.disabled = !!off; el.appendChild(b); };
  btn('New layer', () => { const name = prompt('Layer name'); if (!name) return; const t = { point: 'Point', line: 'LineString', polygon: 'Polygon' }[(prompt('Geometry type: point, line or polygon', 'point') || '').trim().toLowerCase()];
    if (!t) return msg('Geometry type must be point, line or polygon', true); let schema; try { schema = parseFieldSpec(prompt('Fields, e.g. asset_id, diameter:number, material (text is the default; empty for none)', 'asset_id') || ''); } catch (e) { return msg(e.message, true); }
    const nl = LM.createLayer(name, t, schema); editLayerId = nl.id; msg(`Layer "${name}" created and editing started. Use Add feature to digitize.`); });
  if (!l) return; const on = editLayerId === l.id, t = drawTypeOf(l);
  btn(on ? 'Stop editing' : 'Start editing', () => { editLayerId = on ? null : l.id; if (on) { DIG.stop(); vertexMode = false; } renderEdit(); syncVertices(); msg(on ? 'Editing stopped' : `Editing "${l.name}": changes are in memory until you save the project; undo is available`); });
  btn(snapOn ? 'Snap: on' : 'Snap: off', () => { snapOn = !snapOn; renderEdit(); msg(snapOn ? 'Snapping on: clicks and dragged vertices snap to vertices and edges within 10 px' : 'Snapping off'); });
  btn('Add feature', () => { if (!t) return msg('This layer has mixed geometry types; create a new layer to digitize', true); MEAS.stop(); DIG.start(t, pts => { try { const f = newFeature(l, buildGeometry(t, pts)); H.run(addFeatureCmd(l.id, f)); LM.select(l.id, l.geojson.features.length - 1, false); msg('Feature added. Fill its attributes in the table (double-click a cell).'); } catch (e) { msg(e.message, true); } }, msg, snapFn()); }, !on);
  btn(vertexMode ? 'Vertices: on' : 'Edit vertices', () => { vertexMode = !vertexMode; syncVertices(); renderEdit(); msg(vertexMode ? 'Select one feature: drag a handle to move a vertex, double-click to remove it' : 'Vertex editing off'); }, !on);
  btn('Delete selected', () => { const ix = [...l.selected]; if (!ix.length) return msg('Select features first', true); H.run(deleteCmd(l.id, ix)); msg(`Deleted ${ix.length} feature(s). Undo restores them.`); }, !on);
  btn('Undo', () => { const r = H.undoLast(); msg(r ? `Undone: ${r}` : 'Nothing to undo', !r); }, !H.canUndo()); btn('Redo', () => { const r = H.redoLast(); msg(r ? `Redone: ${r}` : 'Nothing to redo', !r); }, !H.canRedo());
  const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Attribute edits in the table are not part of undo. Coordinates are WGS84.'; el.appendChild(p); }
function syncVertices() { VE.clear(); const l = LM.getActive(); if (!vertexMode || !l || l.id !== editLayerId || l.selected.size !== 1) return;
  const i = [...l.selected][0], g = l.geojson.features[i]?.geometry, v = g ? vertices(g) : []; if (v.length > 500) return msg('Too many vertices to edit (limit 500)', true);
  const snap = snapFn([l.id, i]);
  VE.show(v, (vi, pos) => { const sp = snap(pos), ng = setVertex(g, vi, sp), bad = errorsOf(ng); H.run(geomCmd(l.id, i, ng, 'Move vertex')); msg((bad.length ? `Vertex moved; geometry now has an issue: ${bad[0].msg}` : 'Vertex moved') + snapNote, bad.length > 0); },
    vi => { try { H.run(geomCmd(l.id, i, removeVertex(g, vi), 'Remove vertex')); msg('Vertex removed'); } catch (e) { msg(e.message, true); } },
    midpoints(g), (after, pos) => { const sp = snap(pos); H.run(geomCmd(l.id, i, insertVertex(g, after, sp), 'Insert vertex')); msg('Vertex inserted' + snapNote); }); }
bus.on('layers', () => { renderEdit(); syncVertices(); }); renderEdit();
document.addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || !editLayerId) return;
  e.preventDefault(); const r = e.shiftKey ? H.redoLast() : H.undoLast(); msg(r ? `${e.shiftKey ? 'Redone' : 'Undone'}: ${r}` : 'Nothing to ' + (e.shiftKey ? 'redo' : 'undo'), !r); });
