const x = s => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const pos = c => c.length > 2 ? `${c[0]},${c[1]},${c[2]}` : `${c[0]},${c[1]}`, ring = r => `<LinearRing><coordinates>${r.map(pos).join(' ')}</coordinates></LinearRing>`;
const poly = r => `<Polygon><outerBoundaryIs>${ring(r[0])}</outerBoundaryIs>${r.slice(1).map(h => `<innerBoundaryIs>${ring(h)}</innerBoundaryIs>`).join('')}</Polygon>`;
const multi = a => `<MultiGeometry>${a.map(geom).join('')}</MultiGeometry>`;
function geom(g) { const c = g.coordinates; switch (g.type) {
  case 'Point': return `<Point><coordinates>${pos(c)}</coordinates></Point>`;
  case 'LineString': return `<LineString><coordinates>${c.map(pos).join(' ')}</coordinates></LineString>`;
  case 'Polygon': return poly(c);
  case 'MultiPoint': return multi(c.map(p => ({ type: 'Point', coordinates: p })));
  case 'MultiLineString': return multi(c.map(l => ({ type: 'LineString', coordinates: l })));
  case 'MultiPolygon': return multi(c.map(p => ({ type: 'Polygon', coordinates: p })));
  case 'GeometryCollection': return multi(g.geometries); default: throw new Error('unsupported geometry ' + g.type); } }
/** Geometry and attributes only; no KML styling is written. */
export function toKML(name, F) {
  const pm = F.map((f, i) => { const p = f.properties || {}, nk = Object.keys(p).find(k => k.toLowerCase() === 'name');
    return `<Placemark><name>${x(nk ? p[nk] : `Feature ${i + 1}`)}</name><ExtendedData>${Object.entries(p).map(([k, v]) => `<Data name="${x(k)}"><value>${x(v)}</value></Data>`).join('')}</ExtendedData>${geom(f.geometry)}</Placemark>`; });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${x(name)}</name>${pm.join('')}</Document></kml>`; }
