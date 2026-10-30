import { parseXML, find, findAll, child } from './xml.js';
import { inferNumericColumns } from './data-validator.js';
const G = ['Point', 'LineString', 'Polygon', 'MultiGeometry'], uq = (p, k) => { let n = k, i = 2; while (n in p) n = `${k}_${i++}`; return n; };
export function coords(n) { const c = find(n, 'coordinates'); const t = (c?.text || '').trim().replace(/\s*,\s*/g, ',');
  return t ? t.split(/\s+/).map(s => { const p = s.split(',').map(Number); if (p.length < 2 || p.length > 3 || p.some(v => !isFinite(v))) throw new Error(`bad coordinate "${s}"`);
    if (Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) throw new Error(`coordinate "${s}" outside lon/lat range (KML is always WGS84)`); return p; }) : []; }
const ring = (n, tag) => { const r = coords(n); if (r.length < 4) throw new Error(`${tag} needs at least 4 positions`); const a = r[0], b = r.at(-1); if (a[0] !== b[0] || a[1] !== b[1]) throw new Error(`${tag} is not closed`); return r; };
function build(n) { switch (n.name) {
  case 'Point': { const c = coords(n); if (c.length !== 1) throw new Error('Point needs exactly one coordinate'); return { type: 'Point', coordinates: c[0] }; }
  case 'LineString': { const c = coords(n); if (c.length < 2) throw new Error('LineString needs at least 2 positions'); return { type: 'LineString', coordinates: c }; }
  case 'Polygon': { const ob = child(n, 'outerBoundaryIs'); if (!ob) throw new Error('Polygon has no outer boundary'); const rings = [ring(ob, 'outer ring')];
    n.children.filter(c => c.name === 'innerBoundaryIs').forEach(c => rings.push(ring(c, 'inner ring'))); return { type: 'Polygon', coordinates: rings }; }
  case 'MultiGeometry': { const parts = n.children.filter(c => G.includes(c.name)).map(build); if (!parts.length) return null; const t = parts[0].type;
    return parts.every(p => p.type === t) && t !== 'MultiGeometry' ? { type: 'Multi' + t, coordinates: parts.map(p => p.coordinates) } : { type: 'GeometryCollection', geometries: parts }; } } }
/** WGS84 by definition. Styles, KMZ, NetworkLink, GroundOverlay and gx:Track are ignored (counted in the notes). Bad placemarks are skipped and reported. */
export function parseKML(text) {
  let doc; try { doc = parseXML(text); } catch (e) { return { ok: false, errors: ['Invalid XML: ' + e.message] }; }
  const pms = findAll(doc, 'Placemark'); if (!pms.length) return { ok: false, errors: ['No Placemark elements found (KMZ, NetworkLink and GroundOverlay are not supported)'] };
  const errors = [], features = [];
  pms.forEach((pm, i) => { try { const gn = pm.children.find(c => G.includes(c.name)); if (!gn) return errors.push(`Placemark ${i + 1}: no supported geometry`); const geometry = build(gn); if (!geometry) return errors.push(`Placemark ${i + 1}: empty geometry`);
    const p = {}; ['name', 'description'].forEach(k => { const v = child(pm, k)?.text.trim(); if (v) p[k] = v; });
    const put = (k, v) => { if (k && !(k in p && p[k] === v)) p[uq(p, k)] = v; }; // an ExtendedData copy of name/description with the same value is not duplicated
    findAll(pm, 'Data').forEach(d => { const v = child(d, 'value'); put(d.attrs.name, v ? v.text.trim() : ''); });
    findAll(pm, 'SimpleData').forEach(d => put(d.attrs.name, d.text.trim()));
    features.push({ type: 'Feature', properties: p, geometry }); } catch (e) { errors.push(`Placemark ${i + 1}: ${e.message}`); } });
  if (!features.length) return { ok: false, errors };
  ['NetworkLink', 'GroundOverlay', 'Track'].forEach(t => { const n = findAll(doc, t).length; if (n) errors.push(`${n} ${t} element(s) ignored`); });
  return { ok: true, geojson: { type: 'FeatureCollection', features: inferNumericColumns(features) }, errors, skipped: errors.length }; }
