import assert from 'node:assert/strict';
let proj4; try { proj4 = (await import('proj4')).default; } catch { console.log('crs: SKIPPED (proj4 not installed; run npm i proj4@2.9.2 in this folder to enable)'); process.exit(0); }
globalThis.proj4 = proj4; const CRS = await import('../js/core/crs-manager.js'); CRS.registerAll();
let [x, y] = CRS.makeTransform('EPSG:4326', 'EPSG:32645')([87, 0]); assert(Math.abs(x - 500000) < 0.01 && Math.abs(y) < 0.01); // central meridian of zone 45
[x, y] = CRS.makeTransform('EPSG:4326', 'EPSG:32646')([93, 0]); assert(Math.abs(x - 500000) < 0.01);
const [e, n] = CRS.makeTransform('EPSG:4326', 'EPSG:32646')([90.4125, 23.8103]), [lon, lat] = CRS.makeTransform('EPSG:32646', 'EPSG:4326')([e, n]);
assert(Math.abs(lon - 90.4125) < 1e-8 && Math.abs(lat - 23.8103) < 1e-8); console.log('crs: all tests passed');
