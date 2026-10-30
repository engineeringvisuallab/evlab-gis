import { fieldTypes } from '../layers/styling.js';
/** Missing/null values never match. Numeric operators require a numeric field and a numeric value. */
export function filterIndices(F, field, op, value) {
  const t = fieldTypes(F)[field]; if (!t) return { indices: [], error: `Unknown field ${field}` };
  const numOp = ['<', '<=', '>', '>='].includes(op), n = Number(value);
  if (numOp && (t !== 'number' || value.trim() === '' || !isFinite(n))) return { indices: [], error: `${op} needs a numeric field and value` };
  const test = v => { if (v === null || v === undefined || v === '') return false;
    switch (op) { case '=': return t === 'number' && isFinite(n) && value.trim() !== '' ? v === n : String(v) === value;
      case '!=': return t === 'number' && isFinite(n) && value.trim() !== '' ? v !== n : String(v) !== value;
      case '<': return v < n; case '<=': return v <= n; case '>': return v > n; case '>=': return v >= n;
      case 'contains': return String(v).toLowerCase().includes(value.toLowerCase()); default: return false; } };
  const indices = []; F.forEach((f, i) => { if (test(f.properties?.[field])) indices.push(i); }); return { indices }; }
/** Combines conditions with AND/OR. An error in any condition returns { indices: [], error }. */
export function filterMulti(F, filter) { if (!filter) return { indices: F.map((_, i) => i) }; let acc = null;
  for (const c of filter.conds) { const r = filterIndices(F, c.field, c.op, c.value); if (r.error) return { indices: [], error: r.error }; const s = new Set(r.indices);
    acc = acc === null ? s : filter.join === 'OR' ? new Set([...acc, ...s]) : new Set([...acc].filter(i => s.has(i))); }
  return { indices: [...(acc || [])].sort((a, b) => a - b) }; }
