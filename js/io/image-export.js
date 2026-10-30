import { colorFor, legendEntries } from '../layers/styling.js';
/** Largest 1/2/5 x 10^n metres that fits in maxPx at the given metres-per-pixel. */
export function niceScale(mpp, maxPx = 150) { const m = mpp * maxPx, p = 10 ** Math.floor(Math.log10(m)); const n = [1, 2, 5].reduce((b, k) => k * p <= m ? k * p : b, p);
  return { meters: n, px: n / mpp, label: n >= 1000 ? `${n / 1000} km` : `${n} m` }; }
let PR = 5;
function drawGeom(ctx, g, pt) { const path = r => { r.forEach((c, i) => { const [a, b] = pt(c); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); };
  switch (g.type) {
    case 'Point': { const [a, b] = pt(g.coordinates); ctx.beginPath(); ctx.arc(a, b, PR, 0, 7); ctx.fill(); ctx.stroke(); break; }
    case 'MultiPoint': g.coordinates.forEach(c => drawGeom(ctx, { type: 'Point', coordinates: c }, pt)); break;
    case 'LineString': ctx.beginPath(); path(g.coordinates); ctx.stroke(); break;
    case 'MultiLineString': g.coordinates.forEach(c => drawGeom(ctx, { type: 'LineString', coordinates: c }, pt)); break;
    case 'Polygon': ctx.beginPath(); g.coordinates.forEach(r => { path(r); ctx.closePath(); }); ctx.fill('evenodd'); ctx.stroke(); break;
    case 'MultiPolygon': g.coordinates.forEach(c => drawGeom(ctx, { type: 'Polygon', coordinates: c }, pt)); break;
    case 'GeometryCollection': g.geometries.forEach(x => drawGeom(ctx, x, pt)); } }
/** Vector layers only: basemap tiles are intentionally not included (provider terms, cross-origin canvas restrictions). */
export function drawMapCanvas(map, layers, title) {
  const sz = map.getSize(), S = 2, cv = document.createElement('canvas'); cv.width = sz.x * S; cv.height = sz.y * S; const ctx = cv.getContext('2d'); ctx.scale(S, S);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sz.x, sz.y); const pt = c => { const p = map.latLngToContainerPoint([c[1], c[0]]); return [p.x, p.y]; };
  [...layers].reverse().filter(l => l.visible).forEach(l => l.geojson.features.forEach(f => { const c = colorFor(l.style, f); PR = l.style.radius || 5; ctx.lineWidth = l.style.width; ctx.lineJoin = 'round';
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.globalAlpha = .4 * l.style.opacity; const fillA = ctx.globalAlpha;
    ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0)'; drawGeom(ctx, f.geometry, pt); ctx.restore();
    ctx.globalAlpha = l.style.opacity; ctx.fillStyle = 'rgba(0,0,0,0)'; drawGeom(ctx, f.geometry, pt); ctx.globalAlpha = fillA; }));
  ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(title, 14, 28);
  let y = sz.y - 12; ctx.font = '12px sans-serif'; [...layers].filter(l => l.visible).reverse().forEach(l => { legendEntries(l).slice(0, 12).reverse().forEach(e => { ctx.fillStyle = e.color; ctx.fillRect(14, y - 10, 12, 12); ctx.fillStyle = '#000'; ctx.fillText(e.label, 32, y); y -= 16; }); });
  ctx.font = 'bold 16px sans-serif'; ctx.fillText('N', sz.x - 28, 24); ctx.beginPath(); ctx.moveTo(sz.x - 24, 30); ctx.lineTo(sz.x - 32, 52); ctx.lineTo(sz.x - 16, 52); ctx.closePath(); ctx.fill();
  const h = sz.y / 2, mpp = map.containerPointToLatLng([0, h]).distanceTo(map.containerPointToLatLng([100, h])) / 100, sc = niceScale(mpp);
  ctx.fillRect(sz.x - 20 - sc.px, sz.y - 22, sc.px, 4); ctx.font = '12px sans-serif'; ctx.fillText(sc.label, sz.x - 20 - sc.px, sz.y - 28);
  ctx.fillStyle = '#555'; ctx.fillText('EVLab GIS - vector layers only, no basemap', sz.x - 280, sz.y - 6); return cv; }
