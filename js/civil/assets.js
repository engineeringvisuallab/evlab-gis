import { WATER } from './water-assets.js'; import { ROAD, SURVEY } from './road-assets.js'; import { CROSSING } from './crossing-assets.js';
import { pathLength, ringArea } from '../analysis/geodesy.js';
export const SCHEMAS = [...WATER, ...ROAD, ...CROSSING, ...SURVEY];
export const schemaOf = id => SCHEMAS.find(s => s.id === id);
const base = t => t.replace('Multi', ''), val = (f, civil, key) => { const c = civil.map[key]; return c ? f.properties?.[c] : undefined; }, blank = v => v === null || v === undefined || v === '';
const lines = g => g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
const polys = g => g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
export const lengthM = g => lines(g).reduce((s, l) => s + pathLength(l), 0);
export const areaM2 = g => polys(g).reduce((s, p) => s + ringArea(p[0]) - p.slice(1).reduce((h, r) => h + ringArea(r), 0), 0);
/** Issues about mapped data. Spherical lengths/areas are approximate (~0.5%). */
export function validateAssets(F, civil) {
  const s = schemaOf(civil.type), out = []; if (!s) return [{ level: 'error', msg: 'Unknown asset type' }];
  s.fields.filter(x => x.required && !civil.map[x.key]).forEach(x => out.push({ level: 'error', msg: `Required field "${x.label}" is not mapped` }));
  const bad = F.filter(f => !s.geoms.includes(base(f.geometry?.type || ''))).length; if (bad) out.push({ level: 'warning', msg: `${bad} features have a geometry type other than ${s.geoms.join('/')}` });
  s.fields.filter(x => civil.map[x.key]).forEach(x => { let miss = 0, nonnum = 0; F.forEach(f => { const v = val(f, civil, x.key); if (blank(v)) miss++; else if (x.type === 'number' && typeof v !== 'number') nonnum++; });
    if (nonnum) out.push({ level: 'error', msg: `${x.label}: ${nonnum} non-numeric values` }); if (miss && x.required) out.push({ level: 'warning', msg: `${x.label}: ${miss} missing values` }); });
  const idk = s.fields.find(x => x.required)?.key; if (idk && civil.map[idk]) { const seen = new Map(); F.forEach((f, i) => { const v = val(f, civil, idk); if (!blank(v)) seen.set(String(v), [...(seen.get(String(v)) || []), i]); });
    const d = [...seen].filter(([, a]) => a.length > 1); if (d.length) out.push({ level: 'warning', msg: `${d.length} duplicate IDs (e.g. ${d.slice(0, 3).map(([k]) => k).join(', ')})` }); }
  if (civil.map.ground_level_m && civil.map.invert_level_m) { const n = F.filter(f => { const g = val(f, civil, 'ground_level_m'), i = val(f, civil, 'invert_level_m'); return typeof g === 'number' && typeof i === 'number' && i > g; }).length;
    if (n) out.push({ level: 'warning', msg: `${n} features have invert level above ground level` }); }
  return out; }
const tally = (F, civil, key) => { const m = {}; F.forEach(f => { const v = val(f, civil, key); const k = blank(v) ? '(missing)' : String(v); m[k] = (m[k] || 0) + 1; }); return m; };
export function summarize(F, civil) { const r = { count: F.length };
  if (F.some(f => lines(f.geometry).length)) r.length_m = F.reduce((s, f) => s + lengthM(f.geometry), 0);
  if (F.some(f => polys(f.geometry).length)) r.area_m2 = F.reduce((s, f) => s + areaM2(f.geometry), 0);
  ['material', 'diameter_mm', 'valve_type', 'crossing_type', 'surface'].forEach(k => { if (civil.map[k]) r['by_' + k] = tally(F, civil, k); });
  if (civil.map.ground_level_m) { const g = F.map(f => val(f, civil, 'ground_level_m')).filter(v => typeof v === 'number'); if (g.length) r.ground_level = { min: Math.min(...g), max: Math.max(...g), n: g.length }; }
  return r; }
/** Standard columns first, then every other original attribute (none are discarded), then derived geometry columns. */
export function inventory(F, civil) { const s = schemaOf(civil.type), used = new Set(Object.values(civil.map)), std = s.fields.filter(x => civil.map[x.key]).map(x => x.key);
  const other = [...new Set(F.flatMap(f => Object.keys(f.properties || {})))].filter(k => !used.has(k)), names = new Set(std), uq = k => { let n = k; while (names.has(n)) n = '_' + n; names.add(n); return n; };
  const oc = other.map(k => [k, uq(k)]), isL = F.some(f => lines(f.geometry).length), isA = F.some(f => polys(f.geometry).length), isP = F.length > 0 && F.every(f => f.geometry?.type === 'Point');
  const extra = [isL && 'length_m', isA && 'area_m2', isP && 'lon', isP && 'lat'].filter(Boolean).map(uq), fields = [...std, ...oc.map(x => x[1]), ...extra];
  const rows = F.map(f => { const r = {}; std.forEach(k => r[k] = val(f, civil, k)); oc.forEach(([k, n]) => r[n] = f.properties[k]);
    if (isL) r[extra[0]] = Math.round(lengthM(f.geometry) * 100) / 100; if (isA) r[extra[+isL]] = Math.round(areaM2(f.geometry)); if (isP) { r[extra[extra.length - 2]] = f.geometry.coordinates[0]; r[extra[extra.length - 1]] = f.geometry.coordinates[1]; } return r; });
  return { fields, rows }; }
