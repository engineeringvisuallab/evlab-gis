import assert from 'node:assert/strict';
import { parseASC, looksGeographic } from '../js/raster/asc-import.js';
import { statsArr, sample, slope, aspect, hillshade, profile, cellSizeM, rampRGB, bounds } from '../js/raster/terrain.js';
const asc = 'ncols 3\nnrows 2\nxllcorner 90\nyllcorner 23\ncellsize 0.5\nNODATA_value -9999\n1 2 3\n4 -9999 6\n';
const r = parseASC(asc); assert(r.ok && r.grid.data[4] !== r.grid.data[4] && r.grid.data[0] === 1 && r.grid.y0 === 23);
assert.deepEqual(bounds(r.grid), { west: 90, south: 23, east: 91.5, north: 24 }); assert(looksGeographic(r.grid));
const c = parseASC(asc.replace('xllcorner 90', 'xllcenter 90').replace('yllcorner 23', 'yllcenter 23')); assert(c.grid.x0 === 89.75 && c.grid.y0 === 22.75);
assert(!parseASC(asc.replace('1 2 3', '1 2')).ok && !parseASC(asc.replace('cellsize 0.5\n', '')).ok && !parseASC(asc.replace('1 2 3', '1 x 3')).ok);
assert(!looksGeographic(parseASC(asc.replace('xllcorner 90', 'xllcorner 500000')).grid));
const st = statsArr(r.grid.data); assert.deepEqual([st.min, st.max, st.count, st.nodata], [1, 6, 5, 1]);
assert.equal(sample(r.grid, 90.1, 23.9), 1); assert.equal(sample(r.grid, 90.7, 23.2), null); assert.equal(sample(r.grid, 80, 23.2), null); assert.equal(sample(r.grid, 90.7, 23.7), 2); assert.equal(sample(r.grid, 90.7, 23.2), null); // NODATA cell
const mk = (W, H, fn) => { const g = { ncols: W, nrows: H, cell: 0.001, x0: 90, y0: 23, nodata: -9999, data: new Float32Array(W * H) }; for (let rr = 0; rr < H; rr++) { const { dx, dy } = cellSizeM(g, rr); for (let cc = 0; cc < W; cc++) g.data[rr * W + cc] = fn(cc * dx, rr * dy); } return g; };
const east = mk(6, 6, (x) => x * Math.tan(30 * Math.PI / 180)); // rises toward east at 30 degrees
const sl = slope(east), asp = aspect(east); assert(Math.abs(sl[2 * 6 + 2] - 30) < 0.01 && Math.abs(asp[2 * 6 + 2] - 270) < 0.01 && Number.isNaN(sl[0]));
const north = mk(6, 6, (x, y) => -y); assert(Math.abs(aspect(north)[14] - 180) < 0.01); // rows run south, so -y rises northward: downslope faces south
assert.equal(aspect(mk(5, 5, () => 10))[12], -1);
const flat = hillshade(mk(5, 5, () => 5)); assert(Math.abs(flat[12] - Math.sin(Math.PI / 4)) < 1e-6);
const nwFacing = hillshade(mk(5, 5, (x, y) => (x + y) * 0.5)), seFacing = hillshade(mk(5, 5, (x, y) => -(x + y) * 0.5)); assert(nwFacing[12] > flat[12] && flat[12] > seFacing[12]);
const holey = mk(7, 7, () => 1); holey.data[3 * 7 + 3] = NaN; const hs = slope(holey); assert(Number.isFinite(hs[1 * 7 + 1]) && Number.isNaN(hs[2 * 7 + 2]) && Number.isNaN(hs[3 * 7 + 3])); // NODATA in a window blanks that cell
const pg = { ncols: 10, nrows: 3, cell: 0.01, x0: 0, y0: -0.015, nodata: -9999, data: Float32Array.from({ length: 30 }, (_, i) => (i % 10) * 10) };
const pr = profile(pg, [[0.005, 0], [0.055, 0]], 1000); assert.equal(pr[0].z, 0); assert.equal(pr[1].d, 1000); assert(Math.abs(pr.at(-1).d - 5559.7) < 1 && pr.at(-1).z === 50 && pr.every((q, i) => !i || q.z >= pr[i - 1].z));
assert.deepEqual(rampRGB(0), [255, 255, 178]); assert.deepEqual(rampRGB(1), [189, 0, 38]);
console.log('m7: all tests passed');
