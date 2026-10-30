export const MAX_LABELS = 500;
export function labelText(f, field) { if (!field) return ''; const v = f.properties?.[field]; if (v === null || v === undefined || v === '') return ''; const s = String(v); return s.length > 40 ? s.slice(0, 39) + '…' : s; }
export function cleanLabels(o) { if (!o || typeof o !== 'object') return { field: null, size: 12, color: '#000000' };
  return { field: typeof o.field === 'string' ? o.field : null, size: Math.min(40, Math.max(6, Number.isFinite(o.size) ? o.size : 12)), color: /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : '#000000' }; }
const OPS = ['=', '!=', '<', '<=', '>', '>=', 'contains'];
const cond = c => c && typeof c.field === 'string' && OPS.includes(c.op) && typeof c.value === 'string' ? { field: c.field, op: c.op, value: c.value } : null;
/** Filter shape: { join: 'AND'|'OR', conds: [{field, op, value}] }. The older single-condition shape is converted. */
export function cleanFilter(o) { if (!o || typeof o !== 'object') return null;
  if ('conds' in o) { const conds = (Array.isArray(o.conds) ? o.conds : []).map(cond).filter(Boolean); return conds.length ? { join: o.join === 'OR' ? 'OR' : 'AND', conds } : null; }
  const c = cond(o); return c ? { join: 'AND', conds: [c] } : null; }
