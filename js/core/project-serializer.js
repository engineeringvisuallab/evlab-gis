import { parseGeoJSON } from '../data/geojson-import.js';
import { schemaOf } from '../civil/assets.js';
import { cleanLabels, cleanFilter } from '../layers/labels.js';
export const FORMAT = 'evlab-gis-project', VERSION = 1;
/** Layer data is embedded (stored WGS84 GeoJSON), so projects have no external file references. labels/filter are reserved for later milestones. */
export function serializeProject({ name, projectCrs, view, layers, crsDefinitions = {}, rasters = [] }) {
  return { format: FORMAT, version: VERSION, name, savedAt: new Date().toISOString(), projectCrs, crsDefinitions, map: view,
    rasters: rasters.map(r => ({ name: r.name, fileName: r.fileName || null, mode: r.mode, opacity: r.opacity, visible: r.visible, embedded: false })),
    measurement: { method: 'spherical', units: 'metric' },
    layers: layers.map(l => ({ name: l.name, visible: l.visible, sourceCrs: l.sourceCrs || 'EPSG:4326', storedCrs: 'EPSG:4326', fileName: l.fileName || null,
      dataRef: { embedded: true }, style: l.style, labels: l.labels || null, filter: l.filter || null, civil: l.civil || null, group: l.group || null, data: l.geojson })) };
}
const MODES = ['single', 'categorized', 'graduated'], num = (v, lo, hi, d) => typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
export function cleanStyle(s, warnings, tag) {
  const d = { mode: 'single', color: '#1565c0', width: 2, radius: 5, method: 'equal', opacity: 1, field: null, cats: {}, edges: [], n: 4 }; if (!s || typeof s !== 'object') { warnings.push(`${tag}: style missing, defaults used`); return d; }
  const o = { ...d, mode: MODES.includes(s.mode) ? s.mode : 'single', color: /^#[0-9a-f]{6}$/i.test(s.color) ? s.color : d.color, width: num(s.width, 1, 10, 2), radius: num(s.radius, 2, 20, 5), method: ['equal', 'quantile', 'jenks'].includes(s.method) ? s.method : 'equal', opacity: num(s.opacity, 0.1, 1, 1),
    field: typeof s.field === 'string' ? s.field : null, n: Math.round(num(s.n, 2, 5, 4)),
    cats: s.cats && typeof s.cats === 'object' ? Object.fromEntries(Object.entries(s.cats).filter(([, c]) => /^#[0-9a-f]{6}$/i.test(c))) : {},
    edges: Array.isArray(s.edges) ? s.edges.filter(x => typeof x === 'number' && isFinite(x)) : [] };
  if (o.mode !== s.mode) warnings.push(`${tag}: unknown symbology mode, single symbol used`); return o;
}
function cleanCivil(c, w, tag) { if (!c) return null; if (!schemaOf(c.type) || !c.map || typeof c.map !== 'object') { w.push(`${tag}: civil asset settings invalid, ignored`); return null; }
  return { type: c.type, map: Object.fromEntries(Object.entries(c.map).filter(([, v]) => typeof v === 'string')) }; }
export function parseProject(text) {
  let p; try { p = JSON.parse(text); } catch (e) { return { ok: false, errors: ['Invalid JSON: ' + e.message] }; }
  if (!p || p.format !== FORMAT) return { ok: false, errors: ['Not an EVLab GIS project file'] };
  if (typeof p.version !== 'number' || p.version > VERSION) return { ok: false, errors: [`Unsupported project version ${p.version}; this build reads up to ${VERSION}`] };
  if (!Array.isArray(p.layers)) return { ok: false, errors: ['Project has no layers array'] };
  const warnings = [], layers = [];
  p.layers.forEach((l, i) => { const tag = `Layer ${i + 1} (${l?.name})`;
    if (!l || !l.data) return warnings.push(`${tag}: no embedded data (external references are not supported); layer skipped`);
    const r = parseGeoJSON(JSON.stringify(l.data)); if (!r.ok) return warnings.push(`${tag}: ${r.errors[0]}; layer skipped`);
    if (r.skipped) warnings.push(`${tag}: ${r.skipped} invalid features were dropped`);
    layers.push({ name: String(l.name || 'Layer'), visible: l.visible !== false, sourceCrs: l.sourceCrs || 'EPSG:4326', fileName: l.fileName || null, style: cleanStyle(l.style, warnings, tag), civil: cleanCivil(l.civil, warnings, tag), group: typeof l.group === 'string' && l.group ? l.group.slice(0, 60) : null, labels: cleanLabels(l.labels), filter: cleanFilter(l.filter), geojson: r.geojson }); });
  return { ok: true, warnings, project: { name: String(p.name || 'Untitled project'), projectCrs: p.projectCrs || 'EPSG:4326', map: p.map || null, rasters: Array.isArray(p.rasters) ? p.rasters.filter(r => r && (r.fileName || r.name)).map(r => ({ name: String(r.name || r.fileName), fileName: r.fileName || null })) : [], crsDefinitions: p.crsDefinitions || {}, layers } };
}
