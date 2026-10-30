export const PALETTE = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#17becf', '#bcbd22', '#7f7f7f'];
export const RAMP = ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026'];
export function fieldTypes(features) {
  const t = {}; features.forEach(f => Object.entries(f.properties || {}).forEach(([k, v]) => {
    if (!(k in t)) t[k] = 'number'; if (v !== null && v !== undefined && typeof v !== 'number') t[k] = 'string'; }));
  return t;
}
/** Unique attribute values -> colours (values come from the data). */
export function categorizedMap(features, field) {
  const vals = [...new Set(features.map(f => f.properties?.[field]).filter(v => v !== null && v !== undefined && v !== '').map(String))].sort();
  const m = {}; vals.forEach((v, i) => m[v] = PALETTE[i % PALETTE.length]); return m;
}
const JENKS_MAX = 1000;
// Fisher-Jenks optimal classes on sorted values; returns k+1 edges (each class ends at an edge, upper bounds inclusive).
function jenks(v, k) { const n = v.length, lower = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0)), vr = Array.from({ length: n + 1 }, () => Array(k + 1).fill(Infinity));
  for (let j = 1; j <= k; j++) { lower[1][j] = 1; vr[1][j] = 0; }
  for (let l = 2; l <= n; l++) { let s1 = 0, s2 = 0, w = 0; for (let m = 1; m <= l; m++) { const i3 = l - m + 1, x = v[i3 - 1]; w++; s1 += x; s2 += x * x; const d = s2 - s1 * s1 / w, i4 = i3 - 1;
      if (i4 !== 0) for (let j = 2; j <= k; j++) if (vr[l][j] >= d + vr[i4][j - 1]) { lower[l][j] = i3; vr[l][j] = d + vr[i4][j - 1]; } }
    lower[l][1] = 1; vr[l][1] = s2 - s1 * s1 / w; }
  const e = Array(k + 1); e[0] = v[0]; e[k] = v[n - 1]; let kk = n; for (let j = k; j >= 2; j--) { e[j - 1] = v[lower[kk][j] - 2]; kk = lower[kk][j] - 1; } return e; }
/** Class edges (n+1 values) from numeric attribute values; null if there are none. method: 'equal' | 'quantile' (nearest rank; ties can leave empty classes) | 'jenks' (natural breaks, samples at most 1000 values, may return fewer classes). */
export function breaks(features, field, n, method = 'equal') {
  const v = features.map(f => f.properties?.[field]).filter(x => typeof x === 'number' && isFinite(x)); if (!v.length) return null; v.sort((a, b) => a - b); const min = v[0], max = v[v.length - 1];
  if (method === 'quantile') return Array.from({ length: n + 1 }, (_, i) => v[Math.round(i / n * (v.length - 1))]);
  if (method === 'jenks') { const k = Math.min(n, new Set(v).size); if (k < 2) return [min, max];
    const s = v.length > JENKS_MAX ? Array.from({ length: JENKS_MAX }, (_, i) => v[Math.round(i / (JENKS_MAX - 1) * (v.length - 1))]) : v; return jenks(s, k); }
  return Array.from({ length: n + 1 }, (_, i) => min + (max - min) * i / n); }
export const rampColors = n => Array.from({ length: n }, (_, i) => RAMP[Math.round(i * (RAMP.length - 1) / Math.max(1, n - 1))]);
export function colorFor(s, f) {
  const v = f.properties?.[s.field];
  if (s.mode === 'categorized') return s.cats[String(v)] || '#999999';
  if (s.mode === 'graduated') {
    if (typeof v !== 'number' || !s.edges?.length) return '#999999';
    const n = s.edges.length - 1; let i = 0; while (i < n - 1 && v > s.edges[i + 1]) i++; return rampColors(n)[i];
  }
  return s.color;
}
export function styleFor(l, f, sel) {
  const s = l.style, c = colorFor(s, f);
  return sel ? { color: '#d50000', fillColor: c, weight: s.width + 2, opacity: 1, fillOpacity: .7 * s.opacity }
             : { color: c, fillColor: c, weight: s.width, opacity: s.opacity, fillOpacity: .4 * s.opacity };
}
export function legendEntries(l) { const s = l.style;
  if (s.mode === 'categorized') return Object.entries(s.cats).map(([v, c]) => ({ color: c, label: `${s.field}: ${v}` }));
  if (s.mode === 'graduated' && s.edges?.length) { const n = s.edges.length - 1; return rampColors(n).map((c, i) => ({ color: c, label: `${s.field}: ${s.edges[i].toFixed(2)} - ${s.edges[i + 1].toFixed(2)}` })); }
  return [{ color: s.color, label: l.name }]; }
