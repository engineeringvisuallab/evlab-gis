// Pure planar logic on lon/lat coordinates (topology only) plus geodesic nearest-point distance. turf is passed in where needed.
import { haversine } from './geodesy.js';
const walk = (c, f) => typeof c[0] === 'number' ? f(c) : c.forEach(x => walk(x, f));
export function bboxOf(g) { const b = [Infinity, Infinity, -Infinity, -Infinity];
  const add = p => { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); };
  const rec = x => x.type === 'GeometryCollection' ? x.geometries.forEach(rec) : walk(x.coordinates, add); rec(g); return b; }
export const bboxIntersect = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const inRing = ([x, y], r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++)
  if ((r[i][1] > y) !== (r[j][1] > y) && x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
/** Ray casting; points exactly on a boundary may fall either way. Holes are respected. */
export function pointInPolygon(pt, g) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : null;
  return !!polys && polys.some(p => inRing(pt, p[0]) && !p.slice(1).some(h => inRing(pt, h))); }
const isPoly = g => g && (g.type === 'Polygon' || g.type === 'MultiPolygon');
export function selectByLocation(feats, mask, turf) {
  const errors = [], ms = mask.filter(m => isPoly(m.geometry)).map(m => ({ f: m, g: m.geometry, b: bboxOf(m.geometry) }));
  if (!ms.length) return { indices: [], errors: ['Second layer has no polygon features'] }; const indices = [];
  feats.forEach((f, i) => { const g = f.geometry, b = bboxOf(g);
    if (g.type === 'Point') { if (ms.some(m => bboxIntersect(b, m.b) && pointInPolygon(g.coordinates, m.g))) indices.push(i); }
    else if (turf) { try { if (ms.some(m => bboxIntersect(b, m.b) && turf.booleanIntersects(f, m.f))) indices.push(i); } catch (e) { errors.push(`Feature ${i}: ${e.message}`); } }
    else errors.push(`Feature ${i}: non-point test needs Turf`); });
  return { indices, errors }; }
const uniq = (p, k) => { let n = k, i = 2; while (n in p) n = `${k}_${i++}`; return n; };
/** Point layers only. Adds nearest_idx and nearest_dist_m (spherical metres, ~0.5%). */
export function nearestPoints(A, B) {
  const errors = [], bp = B.map((f, j) => ({ j, c: f.geometry?.type === 'Point' ? f.geometry.coordinates : null })).filter(x => x.c);
  if (!bp.length) return { features: [], errors: ['Second layer has no point features'] }; const features = [];
  A.forEach((f, i) => { if (f.geometry?.type !== 'Point') return errors.push(`Feature ${i}: not a point`);
    let best = null; for (const q of bp) { const d = haversine(f.geometry.coordinates, q.c); if (!best || d < best.d) best = { j: q.j, d }; }
    const p = { ...f.properties }; p[uniq(p, 'nearest_idx')] = best.j; p[uniq(p, 'nearest_dist_m')] = Math.round(best.d * 100) / 100;
    features.push({ type: 'Feature', properties: p, geometry: f.geometry }); });
  return { features, errors }; }
export function bboxPolygons(F) { const errors = [], features = [];
  F.forEach((f, i) => { const [a, b, c, d] = bboxOf(f.geometry); if (a === c || b === d) return errors.push(`Feature ${i}: zero-extent bounding box`);
    features.push({ type: 'Feature', properties: { ...f.properties }, geometry: { type: 'Polygon', coordinates: [[[a, b], [c, b], [c, d], [a, d], [a, b]]] } }); });
  return { features, errors }; }
export function centroidLayer(F, turf) { const errors = [], features = [];
  F.forEach((f, i) => { try { const r = turf.centerOfMass(f); features.push({ type: 'Feature', properties: { ...f.properties }, geometry: r.geometry }); } catch (e) { errors.push(`Feature ${i}: ${e.message}`); } });
  return { features, errors }; }
