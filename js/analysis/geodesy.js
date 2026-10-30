// Inputs are [lon, lat] in WGS84 degrees. Spherical formulas: distance error up to ~0.5% vs the ellipsoid; area uses the WGS84 equatorial radius (approximate).
const R = 6371008.8, RA = 6378137, rad = Math.PI / 180;
export function haversine([x1, y1], [x2, y2]) {
  const a = Math.sin((y2 - y1) * rad / 2) ** 2 + Math.cos(y1 * rad) * Math.cos(y2 * rad) * Math.sin((x2 - x1) * rad / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a))); }
export const pathLength = c => c.slice(1).reduce((s, p, i) => s + haversine(c[i], p), 0);
export function ringArea(ring) {
  const same = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1], p = same ? ring.slice(0, -1) : ring; let a = 0;
  p.forEach((q, i) => { const n = p[(i + 1) % p.length]; a += (n[0] - q[0]) * rad * (2 + Math.sin(q[1] * rad) + Math.sin(n[1] * rad)); });
  return Math.abs(a * RA * RA / 2); }
