/** Text-sourced attributes (KML, GPX): a column becomes numeric only if every non-empty value is numeric and none has a leading zero (IDs like "007" stay text). Mutates and returns features. */
export function inferNumericColumns(features) {
  const blank = v => v === undefined || v === null || v === '', keys = new Set(features.flatMap(f => Object.keys(f.properties)));
  keys.forEach(k => { const vals = features.map(f => f.properties[k]);
    if (vals.some(v => !blank(v)) && vals.every(v => blank(v) || (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v)) && !/^[-+]?0\d/.test(v.trim()))))
      features.forEach(f => { if (k in f.properties) f.properties[k] = blank(f.properties[k]) ? null : Number(f.properties[k]); }); });
  return features; }
