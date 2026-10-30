/** ESRI ASCII grid (.asc). No CRS is stored in the file, so the caller must confirm it. NODATA cells become NaN. Rows run north to south. */
export const MAX_CELLS = 16e6;
export function parseASC(text) {
  const lines = text.split(/\r?\n/), h = {}; let i = 0;
  for (; i < lines.length; i++) { const m = /^\s*([A-Za-z_]+)\s+(\S+)\s*$/.exec(lines[i]); if (!m) break; h[m[1].toLowerCase()] = m[2]; }
  const ncols = +h.ncols, nrows = +h.nrows, cell = +h.cellsize, nodata = h.nodata_value !== undefined ? +h.nodata_value : -9999;
  const xl = h.xllcorner ?? h.xllcenter, yl = h.yllcorner ?? h.yllcenter;
  if (!(ncols > 0 && nrows > 0 && Number.isInteger(ncols) && Number.isInteger(nrows)) || !(cell > 0) || xl === undefined || yl === undefined || !isFinite(+xl) || !isFinite(+yl))
    return { ok: false, errors: ['Missing or invalid header (need ncols, nrows, xllcorner/xllcenter, yllcorner/yllcenter, cellsize)'] };
  if (ncols * nrows > MAX_CELLS) return { ok: false, errors: [`Grid has ${ncols * nrows} cells; the browser limit here is ${MAX_CELLS}`] };
  const tok = lines.slice(i).join(' ').split(/\s+/).filter(Boolean);
  if (tok.length !== ncols * nrows) return { ok: false, errors: [`Expected ${ncols * nrows} values, found ${tok.length}`] };
  const data = new Float32Array(tok.length); let bad = 0;
  for (let k = 0; k < tok.length; k++) { const v = Number(tok[k]); if (!isFinite(v)) { bad++; data[k] = NaN; } else data[k] = v === nodata ? NaN : v; }
  if (bad) return { ok: false, errors: [`${bad} non-numeric cell values`] };
  const half = h.xllcenter !== undefined ? cell / 2 : 0, halfY = h.yllcenter !== undefined ? cell / 2 : 0;
  return { ok: true, errors: [], grid: { ncols, nrows, cell, x0: +xl - half, y0: +yl - halfY, nodata, data } };
}
/** Display requires lon/lat degrees; raster reprojection is not implemented. */
export const looksGeographic = g => g.x0 >= -180 && g.y0 >= -90 && g.x0 + g.ncols * g.cell <= 180 && g.y0 + g.nrows * g.cell <= 90;
