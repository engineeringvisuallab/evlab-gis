/** Comma-delimited CSV, RFC 4180 quoting. Other delimiters are not supported (reported, not guessed). */
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, ''); const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; rows.push(row); row = []; }
    else f += c; }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
const LAT = ['lat', 'latitude'], LON = ['lon', 'lng', 'long', 'longitude'];
export function detectCoordColumns(h) {
  const l = h.map(x => x.trim().toLowerCase()), a = h[l.findIndex(x => LAT.includes(x))], b = h[l.findIndex(x => LON.includes(x))];
  return a && b ? { lat: a.trim(), lon: b.trim() } : null;
}
/** Lat/lon in WGS84 degrees. Invalid rows are skipped and reported; all columns are kept as attributes. */
export function csvToGeoJSON(rows, latF, lonF, tx) { // latF = Y/lat column, lonF = X/lon column; tx converts source CRS -> WGS84
  const h = rows[0].map(x => x.trim()), li = h.indexOf(latF), oi = h.indexOf(lonF);
  if (li < 0 || oi < 0) return { ok: false, errors: ['Coordinate column not found in header.'] };
  const body = rows.slice(1), cell = (r, c) => (r[c] ?? '').trim();
  // numeric column only if every value is a number and no value has a leading zero (IDs like "007" stay text)
  const num = h.map((_, c) => body.some(r => cell(r, c) !== '') && body.every(r => { const v = cell(r, c); return v === '' || (isFinite(Number(v)) && !/^[-+]?0\d/.test(v)); }));
  const errors = [], features = [];
  body.forEach((r, k) => { const row = k + 2;
    if (r.length !== h.length) return errors.push(`Row ${row}: expected ${h.length} columns, found ${r.length}`);
    let lat = Number(cell(r, li)), lon = Number(cell(r, oi));
    if (cell(r, li) === '' || cell(r, oi) === '' || !isFinite(lat) || !isFinite(lon)) return errors.push(`Row ${row}: missing or non-numeric coordinates`);
    if (tx) { try { [lon, lat] = tx([lon, lat]); } catch { lat = NaN; } if (!isFinite(lat) || !isFinite(lon)) return errors.push(`Row ${row}: transformation failed`); }
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return errors.push(`Row ${row}: coordinates outside lon/lat range (projected X/Y needs a CRS, Milestone 3)`);
    const properties = {}; h.forEach((n, c) => { const v = cell(r, c); properties[n] = num[c] ? (v === '' ? null : Number(v)) : r[c]; });
    features.push({ type: 'Feature', properties, geometry: { type: 'Point', coordinates: [lon, lat] } }); });
  if (!features.length) return { ok: false, errors: errors.length ? errors : ['No data rows.'] };
  return { ok: true, geojson: { type: 'FeatureCollection', features }, errors, skipped: errors.length };
}
