// Snapping works in lon/lat with x scaled by cos(latitude), so a tolerance in "degrees" is the same distance in both directions.
const rad = Math.PI / 180;
function lines(g, fn) { const c = g.coordinates; switch (g.type) { case 'Point': fn([c]); break; case 'MultiPoint': c.forEach(p => fn([p])); break; case 'LineString': fn(c); break;
  case 'MultiLineString': case 'Polygon': c.forEach(fn); break; case 'MultiPolygon': c.forEach(p => p.forEach(fn)); break; case 'GeometryCollection': g.geometries.forEach(x => lines(x, fn)); } }
export function nearestOnSegment(p, a, b, k) { const ax = (a[0] - p[0]) * k, ay = a[1] - p[1], dx = (b[0] - a[0]) * k, dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / l2)) : 0;
  return { pos: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], d: Math.hypot(ax + t * dx, ay + t * dy) }; }
/** Snaps pos to the nearest vertex within tol (vertices win), otherwise to the nearest point on an edge. Returns { pos, kind: 'vertex' | 'edge' | null }. */
export function snapPosition(pos, geoms, tol, edges = true) { const k = Math.cos(pos[1] * rad); let bv = null, be = null;
  for (const g of geoms) { if (!g) continue; lines(g, a => { for (let i = 0; i < a.length; i++) { const x1 = (a[i][0] - pos[0]) * k, y1 = a[i][1] - pos[1];
    if (Math.abs(x1) <= tol && Math.abs(y1) <= tol) { const d = Math.hypot(x1, y1); if (d <= tol && (!bv || d < bv.d)) bv = { d, pos: [a[i][0], a[i][1]] }; }
    if (edges && i < a.length - 1) { const x2 = (a[i + 1][0] - pos[0]) * k, y2 = a[i + 1][1] - pos[1]; if ((x1 > tol && x2 > tol) || (x1 < -tol && x2 < -tol) || (y1 > tol && y2 > tol) || (y1 < -tol && y2 < -tol)) continue;
      const r = nearestOnSegment(pos, a[i], a[i + 1], k); if (r.d <= tol && (!be || r.d < be.d)) be = r; } } }); }
  return bv ? { pos: bv.pos, kind: 'vertex' } : be ? { pos: be.pos, kind: 'edge' } : { pos, kind: null }; }
