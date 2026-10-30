// A NODATA cell stays NODATA in slope/aspect/hillshade (its window includes itself).
// Grids are WGS84 degrees with cell values assumed to be metres. Slope/hillshade use Horn's 3x3 method; outer ring of cells is NaN (no neighbours).
import { RAMP } from '../layers/styling.js';
import { haversine } from '../analysis/geodesy.js';
const R = 6371008.8, rad = Math.PI / 180;
export const bounds = g => ({ west: g.x0, south: g.y0, east: g.x0 + g.ncols * g.cell, north: g.y0 + g.nrows * g.cell });
export function cellSizeM(g, row) { const lat = g.y0 + (g.nrows - row - 0.5) * g.cell, dy = g.cell * rad * R; return { dx: dy * Math.cos(lat * rad), dy }; }
export function statsArr(a) { let min = Infinity, max = -Infinity, sum = 0, n = 0; for (let i = 0; i < a.length; i++) { const v = a[i]; if (v !== v) continue; n++; sum += v; if (v < min) min = v; if (v > max) max = v; }
  return n ? { min, max, mean: sum / n, count: n, nodata: a.length - n } : { min: null, max: null, mean: null, count: 0, nodata: a.length }; }
/** Nearest-cell value, or null outside the grid / on NODATA. */
export function sample(g, lon, lat) { const c = Math.floor((lon - g.x0) / g.cell), r = Math.floor((g.y0 + g.nrows * g.cell - lat) / g.cell);
  if (c < 0 || r < 0 || c >= g.ncols || r >= g.nrows) return null; const v = g.data[r * g.ncols + c]; return v === v ? v : null; }
function gradients(g, zf, fn) { const { ncols: W, nrows: H, data: d } = g, out = new Float32Array(W * H).fill(NaN);
  for (let r = 1; r < H - 1; r++) { const { dx, dy } = cellSizeM(g, r); for (let c = 1; c < W - 1; c++) { const i = r * W + c, a = d[i - W - 1], b = d[i - W], cc = d[i - W + 1], dd = d[i - 1], f = d[i + 1], gg = d[i + W - 1], h = d[i + W], ii = d[i + W + 1];
    const s = a + b + cc + dd + d[i] + f + gg + h + ii; if (s !== s) continue; fn(out, i, zf * ((cc + 2 * f + ii) - (a + 2 * dd + gg)) / (8 * dx), zf * ((a + 2 * b + cc) - (gg + 2 * h + ii)) / (8 * dy)); } } return out; }
/** Degrees from horizontal. */
export const slope = (g, zf = 1) => gradients(g, zf, (o, i, x, y) => { o[i] = Math.atan(Math.hypot(x, y)) / rad; });
/** Downslope compass direction in degrees clockwise from north; -1 for flat cells. */
export const aspect = (g, zf = 1) => gradients(g, zf, (o, i, x, y) => { if (!x && !y) o[i] = -1; else { const a = Math.atan2(-x, -y) / rad; o[i] = a < 0 ? a + 360 : a; } });
/** Illumination 0..1 (light vector dot surface normal). */
export const hillshade = (g, az = 315, alt = 45, zf = 1) => { const A = az * rad, E = alt * rad, L = [Math.sin(A) * Math.cos(E), Math.cos(A) * Math.cos(E), Math.sin(E)];
  return gradients(g, zf, (o, i, x, y) => { const n = Math.hypot(x, y, 1); o[i] = Math.max(0, (-x * L[0] - y * L[1] + L[2]) / n); }); };
export const OPS = { hillshade: g => hillshade(g), slope: g => slope(g) };
/** Samples along a lon/lat path every stepM metres (spherical distances, linear interpolation in degrees: fine for short segments). */
export function profile(g, line, stepM) { const out = []; let cum = 0, next = 0; const push = (d, p) => out.push({ d, lon: p[0], lat: p[1], z: sample(g, p[0], p[1]) });
  for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1], L = haversine(a, b); if (!L) continue;
    while (next <= cum + L + 1e-9) { const t = (next - cum) / L; push(next, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); next += stepM; } cum += L; }
  if (line.length && out.at(-1)?.d < cum - 1e-6) push(cum, line.at(-1)); return out; }
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export function rampRGB(t) { t = Math.min(1, Math.max(0, t)); const x = t * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(x)), f = x - i, a = hex(RAMP[i]), b = hex(RAMP[i + 1]); return a.map((v, k) => Math.round(v + (b[k] - v) * f)); }
