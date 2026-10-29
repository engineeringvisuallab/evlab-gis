const esc = v => { v = v ?? ''; v = String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
export const toCSV = (fields, rows) => [fields.map(esc).join(','), ...rows.map(r => fields.map(f => esc(r[f])).join(','))].join('\r\n');
