import { clean, unionAll } from './overlay.js';
/** Groups polygons by field value (or all together if no field) and unions each group. Keeps the field and a count; other attributes are not carried. */
export function dissolveLayer(F, field, turf) { const errors = [], groups = new Map();
  clean(F, errors, 'A').forEach(x => { const v = field ? x.f.properties?.[field] : 'all'; const k = String(v); if (!groups.has(k)) groups.set(k, { v, items: [] }); groups.get(k).items.push(x); });
  const features = []; groups.forEach(({ v, items }) => { const u = unionAll(items, turf, errors); if (u) features.push({ type: 'Feature', properties: field ? { [field]: v, count: items.length } : { count: items.length }, geometry: u.geometry }); });
  if (features.length) errors.push('Dissolve keeps only the dissolve field and count'); return { features, errors }; }
