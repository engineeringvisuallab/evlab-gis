import { validateGeometry } from './geometry-validation.js';
/** Distance in metres. Turf buffers WGS84 lon/lat via a local projection: good for small/medium distances, approximate for very large ones. */
export function bufferLayer(F, meters, turf) {
  if (!(meters > 0)) return { features: [], errors: ['Distance must be greater than 0 m'] }; const errors = [], features = [];
  F.forEach((f, i) => { const bad = validateGeometry(f.geometry).find(x => x.level === 'error'); if (bad) return errors.push(`Feature ${i}: invalid geometry (${bad.msg})`);
    try { const r = turf.buffer(f, meters / 1000, { units: 'kilometers', steps: 16 }); if (!r || !r.geometry) errors.push(`Feature ${i}: empty buffer`);
      else features.push({ type: 'Feature', properties: { ...f.properties }, geometry: r.geometry }); } catch (e) { errors.push(`Feature ${i}: ${e.message}`); } });
  return { features, errors }; }
