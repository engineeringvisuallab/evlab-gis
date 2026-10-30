import { getMap } from '../map/map-controller.js';
import { bounds, statsArr, OPS, rampRGB } from '../raster/terrain.js';
export const rasters = []; let nid = 1, worker = null, wid = 0; const pending = new Map();
function getWorker() { if (worker === null) { try { worker = new Worker(new URL('../workers/raster-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = e => { const p = pending.get(e.data.id); pending.delete(e.data.id); if (p) e.data.error ? p.rej(new Error(e.data.error)) : p.res(e.data.out); };
  worker.onerror = () => { worker = false; pending.forEach(p => p.rej(new Error('worker failed'))); pending.clear(); }; } catch { worker = false; } } return worker; }
/** Runs in a Web Worker when available; falls back to the main thread (UI may pause on large grids). */
export async function compute(op, grid) { const w = getWorker(); if (w) { try { return await new Promise((res, rej) => { const id = ++wid; pending.set(id, { res, rej }); w.postMessage({ id, op, grid }); }); } catch { /* use main thread */ } } return OPS[op](grid); }
export function addRaster(name, grid, fileName) { const r = { id: nid++, name, fileName, grid, visible: true, opacity: 0.8, mode: 'elevation', stats: statsArr(grid.data), cache: {}, overlay: null, legend: null }; rasters.push(r); return r; }
export function removeRaster(id) { const i = rasters.findIndex(r => r.id === id); if (i < 0) return; rasters[i].overlay?.remove(); rasters.splice(i, 1); }
export function zoomToRaster(r) { const b = bounds(r.grid); getMap().fitBounds([[b.south, b.west], [b.north, b.east]]); }
export async function draw(r) { const map = getMap(); if (!map.getPane('rasterPane')) map.createPane('rasterPane').style.zIndex = 350; r.overlay?.remove(); r.overlay = null; if (!r.visible) return;
  const g = r.grid; let vals = g.data, lo = r.stats.min, hi = r.stats.max;
  if (r.mode !== 'elevation') { const op = r.mode === 'slope' ? 'slope' : 'hillshade'; vals = r.cache[op] || (r.cache[op] = await compute(op, g)); if (op === 'slope') { const s = statsArr(vals); lo = 0; hi = s.max; } else { lo = 0; hi = 1; } }
  r.legend = { mode: r.mode, min: lo, max: hi }; const cv = document.createElement('canvas'); cv.width = g.ncols; cv.height = g.nrows; const ctx = cv.getContext('2d'), im = ctx.createImageData(g.ncols, g.nrows), span = hi - lo || 1;
  for (let i = 0; i < vals.length; i++) { const v = vals[i]; if (v !== v) continue; const rgb = r.mode === 'hillshade' ? [v * 255, v * 255, v * 255] : rampRGB((v - lo) / span); im.data.set([rgb[0], rgb[1], rgb[2], 255], i * 4); }
  ctx.putImageData(im, 0, 0); const b = bounds(g); r.overlay = L.imageOverlay(cv.toDataURL(), [[b.south, b.west], [b.north, b.east]], { opacity: r.opacity, pane: 'rasterPane' }).addTo(map); }
