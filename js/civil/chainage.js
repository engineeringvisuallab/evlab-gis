import { haversine } from '../analysis/geodesy.js';
const rad = Math.PI / 180;
/** Chainage of the nearest point on a line, in spherical metres (~0.5%). Nearest-point search uses a local planar approximation (fine for short spans, not for huge distances). */
export function chainageOnLine(line, p) { let cum = 0, best = null; const k = Math.cos(p[1] * rad);
  for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1], ax = (a[0] - p[0]) * k, ay = a[1] - p[1], dx = (b[0] - a[0]) * k, dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / l2)) : 0, q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], off = haversine(p, q);
    if (!best || off < best.offset) best = { offset: off, chainage: cum + haversine(a, q) }; cum += haversine(a, b); } return best; }
const uq = (p, k) => { let n = k; while (n in p) n = '_' + n; return n; };
/** Alignment layer must hold exactly one LineString. Returns copies of the point features with chainage_m and offset_m added (existing fields are never overwritten). */
export function addChainage(points, alignment) { const L = alignment.filter(f => f.geometry?.type === 'LineString');
  if (alignment.length !== 1 || L.length !== 1) return { features: [], errors: ['Alignment layer must contain exactly one LineString feature'] };
  const errors = [], features = []; points.forEach((f, i) => { if (f.geometry?.type !== 'Point') return errors.push(`Feature ${i}: not a point`);
    const r = chainageOnLine(L[0].geometry.coordinates, f.geometry.coordinates), p = { ...f.properties }; p[uq(p, 'chainage_m')] = Math.round(r.chainage * 1000) / 1000; p[uq(p, 'offset_m')] = Math.round(r.offset * 1000) / 1000;
    features.push({ type: 'Feature', properties: p, geometry: f.geometry }); }); return { features, errors }; }
