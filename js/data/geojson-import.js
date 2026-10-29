const TYPES = ['Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon','GeometryCollection'];
function coords(c, out) { if (typeof c[0] === 'number') out.push(c); else c.forEach(x => coords(x, out)); }
/** Parses GeoJSON text. Assumes WGS84 (RFC 7946); rejects out-of-range values instead of guessing a CRS. */
export function parseGeoJSON(text) {
  let g; try { g = JSON.parse(text); } catch (e) { return { ok: false, errors: ['Invalid JSON: ' + e.message] }; }
  const feats = g.type === 'FeatureCollection' ? g.features : g.type === 'Feature' ? [g] : TYPES.includes(g.type) ? [{ type: 'Feature', properties: {}, geometry: g }] : null;
  if (!Array.isArray(feats)) return { ok: false, errors: ['Not a GeoJSON object.'] };
  const errors = [], good = [];
  feats.forEach((f, i) => {
    const gm = f && f.geometry;
    if (!gm || !TYPES.includes(gm.type)) return errors.push(`Feature ${i}: missing or unsupported geometry`);
    const pts = []; if (gm.type !== 'GeometryCollection') coords(gm.coordinates, pts);
    if (gm.type !== 'GeometryCollection' && !pts.length) return errors.push(`Feature ${i}: empty coordinates`);
    if (pts.some(p => !isFinite(p[0]) || !isFinite(p[1]))) return errors.push(`Feature ${i}: non-numeric coordinate`);
    if (pts.some(p => Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90))
      return errors.push(`Feature ${i}: coordinates outside lon/lat range; data may be projected and needs a CRS (Milestone 3)`);
    good.push({ type: 'Feature', properties: f.properties || {}, geometry: gm });
  });
  if (!good.length) return { ok: false, errors: errors.length ? errors : ['No features found.'] };
  return { ok: true, geojson: { type: 'FeatureCollection', features: good }, errors, skipped: errors.length };
}
