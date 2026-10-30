const esc = v => { v = v ?? ''; v = String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
export const toCSV = (fields, rows) => [fields.map(esc).join(','), ...rows.map(r => fields.map(f => esc(r[f])).join(','))].join('\r\n');
import { fieldTypes } from '../layers/styling.js';
/** All attributes; point layers also get lon/lat columns (WGS84). Other geometry types are not written to CSV. */
export function layerToCSV(F) {
  const fields = Object.keys(fieldTypes(F)), pts = F.length > 0 && F.every(f => f.geometry?.type === 'Point'), u = k => { let n = k; while (fields.includes(n)) n = '_' + n; return n; };
  if (!pts) return { text: toCSV(fields, F.map(f => f.properties || {})), note: 'Geometry not included (CSV can only hold point coordinates)' };
  const lo = u('lon'), la = u('lat'); return { text: toCSV([...fields, lo, la], F.map(f => ({ ...f.properties, [lo]: f.geometry.coordinates[0], [la]: f.geometry.coordinates[1] }))), note: '' };
}
