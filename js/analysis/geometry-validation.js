const ok = p => Array.isArray(p) && p.length >= 2 && isFinite(p[0]) && isFinite(p[1]);
const side = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
const cross = (a, b, c, d) => side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0; // proper crossings only; touching/collinear overlaps are not detected
function selfX(pts, closed) { const n = pts.length - 1;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (closed && i === 0 && j === n - 1) continue; if (cross(pts[i], pts[i + 1], pts[j], pts[j + 1])) return true; } return false; }
function line(c, out, tag) {
  if (!Array.isArray(c) || c.length < 2) return out.push({ level: 'error', msg: `${tag}: fewer than 2 positions` });
  if (!c.every(ok)) return out.push({ level: 'error', msg: `${tag}: non-finite coordinate` });
  if (c.every(p => p[0] === c[0][0] && p[1] === c[0][1])) out.push({ level: 'error', msg: `${tag}: zero length` });
  if (c.some((p, i) => i && p[0] === c[i - 1][0] && p[1] === c[i - 1][1])) out.push({ level: 'warning', msg: `${tag}: duplicate consecutive vertices` });
  return true; }
function ring(r, out, tag) {
  if (!Array.isArray(r) || r.length < 4) return out.push({ level: 'error', msg: `${tag}: ring needs at least 4 positions` });
  if (!r.every(ok)) return out.push({ level: 'error', msg: `${tag}: non-finite coordinate` });
  if (r[0][0] !== r.at(-1)[0] || r[0][1] !== r.at(-1)[1]) return out.push({ level: 'error', msg: `${tag}: ring not closed` });
  if (selfX(r, true)) out.push({ level: 'error', msg: `${tag}: self-intersection` }); }
/** Returns [{level:'error'|'warning', msg}]. Empty array = no issues found (not a full OGC validity proof). */
export function validateGeometry(g) {
  const out = []; if (!g || !g.type) return [{ level: 'error', msg: 'missing geometry' }]; const c = g.coordinates;
  switch (g.type) {
    case 'Point': if (!ok(c)) out.push({ level: 'error', msg: 'Point: invalid coordinate' }); break;
    case 'MultiPoint': c.forEach((p, i) => ok(p) || out.push({ level: 'error', msg: `MultiPoint[${i}]: invalid coordinate` })); break;
    case 'LineString': line(c, out, 'LineString'); break;
    case 'MultiLineString': c.forEach((l, i) => line(l, out, `MultiLineString[${i}]`)); break;
    case 'Polygon': c.forEach((r, i) => ring(r, out, i ? `Hole ${i}` : 'Outer ring')); break;
    case 'MultiPolygon': c.forEach((pg, k) => pg.forEach((r, i) => ring(r, out, `Polygon ${k} ${i ? 'hole ' + i : 'outer ring'}`))); break;
    case 'GeometryCollection': g.geometries.forEach(x => out.push(...validateGeometry(x))); break;
    default: out.push({ level: 'error', msg: 'unsupported type ' + g.type }); }
  return out; }
export function validateLayer(features) {
  const issues = [], invalid = []; features.forEach((f, i) => { const r = validateGeometry(f.geometry);
    r.forEach(x => issues.push({ index: i, ...x })); if (r.some(x => x.level === 'error')) invalid.push(i); });
  return { invalid, issues, warnings: issues.filter(x => x.level === 'warning').length }; }
