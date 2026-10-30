import { parseXML, find, findAll, child } from './xml.js';
import { inferNumericColumns } from './data-validator.js';
function pos(n) { const lat = Number(n.attrs.lat), lon = Number(n.attrs.lon); if (n.attrs.lat === undefined || n.attrs.lon === undefined || !isFinite(lat) || !isFinite(lon)) throw new Error('missing or non-numeric lat/lon');
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('coordinate outside lon/lat range'); const e = child(n, 'ele') ? Number(child(n, 'ele').text) : NaN; return isFinite(e) ? [lon, lat, e] : [lon, lat]; }
const props = (n, tags, kind) => { const p = { gpx_type: kind }; tags.forEach(t => { const v = child(n, t)?.text.trim(); if (v) p[t] = v; }); return p; };
/** Waypoints become points, tracks (segments) and routes become lines. Output is one mixed-geometry layer with a gpx_type attribute. */
export function parseGPX(text) {
  let doc; try { doc = parseXML(text); } catch (e) { return { ok: false, errors: ['Invalid XML: ' + e.message] }; }
  if (!doc.children.some(c => c.name === 'gpx')) return { ok: false, errors: ['Not a GPX file (no <gpx> root)'] }; const errors = [], features = [], add = (properties, geometry) => features.push({ type: 'Feature', properties, geometry });
  findAll(doc, 'wpt').forEach((w, i) => { try { add(props(w, ['name', 'desc', 'cmt', 'src', 'type', 'sym', 'ele', 'time'], 'waypoint'), { type: 'Point', coordinates: pos(w) }); } catch (e) { errors.push(`Waypoint ${i + 1}: ${e.message}`); } });
  findAll(doc, 'trk').forEach((t, i) => { try { const segs = t.children.filter(c => c.name === 'trkseg').map(s => s.children.filter(c => c.name === 'trkpt').map(pos)).filter(s => s.length >= 2);
    if (!segs.length) return errors.push(`Track ${i + 1}: no segment with 2 or more points`);
    add(props(t, ['name', 'desc', 'cmt', 'src', 'type'], 'track'), segs.length === 1 ? { type: 'LineString', coordinates: segs[0] } : { type: 'MultiLineString', coordinates: segs }); } catch (e) { errors.push(`Track ${i + 1}: ${e.message}`); } });
  findAll(doc, 'rte').forEach((r, i) => { try { const pts = r.children.filter(c => c.name === 'rtept').map(pos); if (pts.length < 2) return errors.push(`Route ${i + 1}: fewer than 2 points`);
    add(props(r, ['name', 'desc', 'cmt', 'src', 'type'], 'route'), { type: 'LineString', coordinates: pts }); } catch (e) { errors.push(`Route ${i + 1}: ${e.message}`); } });
  if (!features.length) return { ok: false, errors: errors.length ? errors : ['No waypoints, tracks or routes found'] };
  return { ok: true, geojson: { type: 'FeatureCollection', features: inferNumericColumns(features) }, errors, skipped: errors.length }; }
