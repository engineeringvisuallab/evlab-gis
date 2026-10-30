// Overlay is topological on lon/lat (planar). Results are valid shapes, but do not take planar areas from them; use the geodesic measure tool.
import { validateGeometry } from './geometry-validation.js';
import { bboxOf, bboxIntersect } from './spatial-query.js';
export function clean(F, errors, tag) { return F.map((f, i) => ({ f, i })).filter(({ f, i }) => {
  if (!f.geometry || !/Polygon$/.test(f.geometry.type)) { errors.push(`${tag} feature ${i}: not a polygon`); return false; }
  const e = validateGeometry(f.geometry).find(x => x.level === 'error'); if (e) { errors.push(`${tag} feature ${i}: invalid (${e.msg})`); return false; } return true; }); }
export function mergeProps(a = {}, b = {}) { const o = { ...a }; for (const k in b) { let n = k in o ? 'b_' + k : k; while (n in o) n = 'b_' + n; o[n] = b[k]; } return o; }
const ft = (p, g) => ({ type: 'Feature', properties: p, geometry: g });
export function intersectLayers(A, B, turf) { const errors = [], a = clean(A, errors, 'A'), b = clean(B, errors, 'B'), features = [], bb = b.map(x => bboxOf(x.f.geometry));
  a.forEach(({ f, i }) => { const ba = bboxOf(f.geometry); b.forEach(({ f: g, i: j }, k) => { if (!bboxIntersect(ba, bb[k])) return;
    try { const r = turf.intersect(f, g); if (r) features.push(ft(mergeProps(f.properties, g.properties), r.geometry)); } catch (e) { errors.push(`A${i} x B${j}: ${e.message}`); } }); });
  return { features, errors }; }
/** Each A feature minus every overlapping B feature; A attributes kept. */
export function differenceLayers(A, B, turf) { const errors = [], a = clean(A, errors, 'A'), b = clean(B, errors, 'B'), features = [], bb = b.map(x => bboxOf(x.f.geometry));
  a.forEach(({ f, i }) => { let cur = f; try { b.forEach(({ f: g }, k) => { if (cur && bboxIntersect(bboxOf(cur.geometry), bb[k])) cur = turf.difference(cur, g); });
    if (cur) features.push(ft({ ...f.properties }, cur.geometry)); } catch (e) { errors.push(`A${i}: ${e.message}`); } });
  return { features, errors }; }
export function unionAll(feats, turf, errors) { let acc = null; for (const { f, i } of feats) { try { acc = acc ? turf.union(acc, f) : f; } catch (e) { errors.push(`feature ${i}: ${e.message}`); } } return acc; }
/** Merges A and B into ONE geometry; attributes are intentionally not carried (reported). */
export function unionLayers(A, B, turf) { const errors = [], all = [...clean(A, errors, 'A'), ...clean(B, errors, 'B')], u = unionAll(all, turf, errors);
  if (u) errors.push('Union output has no attributes (single merged geometry)'); return { features: u ? [ft({}, u.geometry)] : [], errors }; }
