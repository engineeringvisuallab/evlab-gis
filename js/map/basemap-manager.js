import { getMap } from './map-controller.js';
/** Returns a list of problems (empty = acceptable). Does not check that the service exists or that you may use it. */
export function validateXYZ(url, attribution) { const e = [];
  if (typeof url !== 'string' || !url.trim()) e.push('Tile URL template is required');
  else { if (!/^https:\/\//i.test(url.trim())) e.push('URL must start with https:// (http tiles are blocked on HTTPS pages)'); ['{z}', '{x}', '{y}'].forEach(t => { if (url.split(t).length !== 2) e.push(`URL must contain ${t} exactly once`); }); }
  if (!attribution || !attribution.trim()) e.push('Attribution text is required by most tile providers'); return e; }
let custom = null;
export const clearCustom = () => { custom?.remove(); custom = null; };
export function setCustom(url, attribution) { clearCustom(); custom = L.tileLayer(url.trim(), { attribution: attribution.trim(), maxZoom: 19 }).addTo(getMap()); }
