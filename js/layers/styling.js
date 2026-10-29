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
/** Equal-interval class edges (n+1 values) from numeric attribute values; null if no numeric data. */
export function breaks(features, field, n) {
  const v = features.map(f => f.properties?.[field]).filter(x => typeof x === 'number' && isFinite(x));
  if (!v.length) return null; const min = Math.min(...v), max = Math.max(...v);
  return Array.from({ length: n + 1 }, (_, i) => min + (max - min) * i / n);
}
export const rampColors = n => Array.from({ length: n }, (_, i) => RAMP[Math.round(i * (RAMP.length - 1) / Math.max(1, n - 1))]);
export function colorFor(s, f) {
  const v = f.properties?.[s.field];
  if (s.mode === 'categorized') return s.cats[String(v)] || '#999999';
  if (s.mode === 'graduated') {
    if (typeof v !== 'number' || !s.edges?.length) return '#999999';
    const n = s.edges.length - 1, lo = s.edges[0], hi = s.edges[n];
    return rampColors(n)[hi === lo ? 0 : Math.min(n - 1, Math.max(0, Math.floor((v - lo) / (hi - lo) * n)))];
  }
  return s.color;
}
export function styleFor(l, f, sel) {
  const s = l.style, c = colorFor(s, f);
  return sel ? { color: '#d50000', fillColor: c, weight: s.width + 2, opacity: 1, fillOpacity: .7 * s.opacity }
             : { color: c, fillColor: c, weight: s.width, opacity: s.opacity, fillOpacity: .4 * s.opacity };
}
