import * as LM from '../core/layer-manager.js';
import { validateGeometry } from '../analysis/geometry-validation.js';
import { newProps } from '../layers/schema.js';
const same = (a, b) => a[0] === b[0] && a[1] === b[1], find = id => LM.layers.find(l => l.id === id);
/** Builds a valid geometry from clicked [lon,lat] points. Consecutive duplicate clicks are dropped. Throws an Error with the reason if it cannot. */
export function buildGeometry(type, pts) { const p = pts.filter((q, i) => !i || !same(q, pts[i - 1])); let g;
  if (type === 'Point') { if (p.length < 1) throw new Error('Click a location'); g = { type, coordinates: p[0] }; }
  else if (type === 'LineString') { if (p.length < 2) throw new Error('A line needs at least 2 points'); g = { type, coordinates: p }; }
  else if (type === 'Polygon') { if (p.length > 1 && same(p[0], p.at(-1))) p.pop(); /* clicking the first point again closes the ring */ if (p.length < 3) throw new Error('A polygon needs at least 3 points'); g = { type, coordinates: [[...p, p[0]]] }; }
  else throw new Error('Unsupported geometry type ' + type);
  const bad = validateGeometry(g).find(x => x.level === 'error'); if (bad) throw new Error('Not saved: ' + bad.msg); return g; }
export const newFeature = (l, geometry) => ({ type: 'Feature', properties: newProps(l), geometry });
const lists = g => ({ MultiPoint: () => [{ a: g.coordinates, closed: false }], LineString: () => [{ a: g.coordinates, closed: false }], MultiLineString: () => g.coordinates.map(a => ({ a, closed: false })),
  Polygon: () => g.coordinates.map(a => ({ a, closed: true })), MultiPolygon: () => g.coordinates.flatMap(p => p.map(a => ({ a, closed: true }))) }[g.type]?.() ?? null);
const keepZ = (old, pos) => old.length > 2 ? [pos[0], pos[1], old[2]] : [pos[0], pos[1]];
/** Vertices in a stable order; the closing duplicate of a polygon ring is not listed. */
export const vertices = g => g.type === 'Point' ? [g.coordinates] : (lists(g) || []).flatMap(({ a, closed }) => a.slice(0, closed ? a.length - 1 : a.length));
function locate(c, vi) { let k = vi; for (const x of lists(c) || []) { const n = x.closed ? x.a.length - 1 : x.a.length; if (k < n) return { ...x, k }; k -= n; } throw new Error('Vertex index out of range'); }
export function setVertex(g, vi, pos) { if (g.type === 'Point') return { ...g, coordinates: keepZ(g.coordinates, pos) }; const c = structuredClone(g), { a, closed, k } = locate(c, vi);
  a[k] = keepZ(a[k], pos); if (closed && k === 0) a[a.length - 1] = [...a[0]]; return c; }
export function removeVertex(g, vi) { if (g.type === 'Point') throw new Error('A point has no vertex to remove'); const c = structuredClone(g), { a, closed, k } = locate(c, vi);
  const min = closed ? 4 : g.type === 'MultiPoint' ? 1 : 2; if (a.length - 1 < min) throw new Error('Cannot remove: the geometry would become invalid');
  a.splice(k, 1); if (closed && k === 0) a[a.length - 1] = [...a[0]]; return c; }
export const addFeatureCmd = (id, feature) => { let idx; return { label: 'Add feature', do() { const l = find(id); if (!l) return false; idx = l.geojson.features.length; return LM.insertFeatures(id, [{ index: idx, feature }]); }, undo() { return LM.removeFeatures(id, [idx]); } }; };
export const deleteCmd = (id, indices) => { let items; return { label: `Delete ${indices.length} feature(s)`, do() { const l = find(id); if (!l) return false; items = [...indices].sort((a, b) => a - b).map(i => ({ index: i, feature: l.geojson.features[i] })); return LM.removeFeatures(id, indices); }, undo() { return LM.insertFeatures(id, items); } }; };
export const geomCmd = (id, index, after, label = 'Edit geometry') => { let before; return { label, do() { const f = find(id)?.geojson.features[index]; if (!f) return false; before = f.geometry; return LM.setGeometry(id, index, after); }, undo() { return LM.setGeometry(id, index, before); } }; };
/** Midpoint handles: one per segment. `after` is the vertex index (as in vertices()) the new vertex would follow. */
export function midpoints(g) { const out = []; let off = 0; if (g.type === 'MultiPoint') return out; // points have no segments
  for (const { a, closed } of lists(g) || []) { const n = closed ? a.length - 1 : a.length, segs = closed ? n : n - 1;
  for (let k = 0; k < segs; k++) out.push({ after: off + k, pos: [(a[k][0] + a[k + 1][0]) / 2, (a[k][1] + a[k + 1][1]) / 2] }); off += n; } return out; }
/** Inserts a vertex after vertex `after` (before the next one; for the last vertex of a ring, before the closing point). Z is interpolated only when both neighbours have it. */
export function insertVertex(g, after, pos) { if (g.type === 'Point' || g.type === 'MultiPoint') throw new Error('Points have no segments to add a vertex to'); const c = structuredClone(g), { a, k } = locate(c, after), p = a[k], q = a[k + 1];
  a.splice(k + 1, 0, p.length > 2 && q.length > 2 ? [pos[0], pos[1], (p[2] + q[2]) / 2] : [pos[0], pos[1]]); return c; }
