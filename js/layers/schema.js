import { fieldTypes } from './styling.js';
/** Declared fields win over types guessed from values (an all-empty text column would otherwise look numeric). */
export const fieldsOf = l => ({ ...fieldTypes(l.geojson.features), ...(l.schema || {}) });
/** "asset_id, diameter:number, material:text" -> { asset_id:'text', diameter:'number', material:'text' }. Throws a readable Error. */
export function parseFieldSpec(str) { const out = {}; (str || '').split(',').map(s => s.trim()).filter(Boolean).forEach(p => { const [n, t = 'text'] = p.split(':').map(x => x.trim());
  if (!/^[A-Za-z_][\w ]{0,39}$/.test(n)) throw new Error(`Bad field name "${n}"`); if (t !== 'text' && t !== 'number') throw new Error(`Field ${n}: type must be text or number`); if (n in out) throw new Error(`Duplicate field ${n}`); out[n] = t; });
  if (Object.keys(out).length > 50) throw new Error('At most 50 fields'); return out; }
export function cleanSchema(o) { const r = {}; if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (typeof k === 'string' && k && (v === 'text' || v === 'number')) r[k] = v; return r; }
export const newProps = l => Object.fromEntries(Object.entries(fieldsOf(l)).map(([k, t]) => [k, t === 'text' ? '' : null]));
export const GEOM_TYPES = ['Point', 'LineString', 'Polygon'];
export const drawTypeOf = l => { if (l.geomType) return l.geomType; const t = new Set(l.geojson.features.map(f => (f.geometry?.type || '').replace('Multi', ''))); return t.size === 1 && GEOM_TYPES.includes([...t][0]) ? [...t][0] : null; };
