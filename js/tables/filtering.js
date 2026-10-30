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
