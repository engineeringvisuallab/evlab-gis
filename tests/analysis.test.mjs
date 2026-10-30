import assert from 'node:assert/strict';
import { pointInPolygon, selectByLocation, nearestPoints, bboxPolygons, bboxOf } from '../js/analysis/spatial-query.js';
import { intersectLayers, mergeProps } from '../js/analysis/overlay.js';
import { dissolveLayer } from '../js/analysis/dissolve.js';
import { bufferLayer } from '../js/analysis/buffer.js';
import { filterIndices } from '../js/tables/filtering.js';
const sq = (x, y, s) => ({ type: 'Feature', properties: { id: x }, geometry: { type: 'Polygon', coordinates: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]] } });
const pt = (x, y, p = {}) => ({ type: 'Feature', properties: p, geometry: { type: 'Point', coordinates: [x, y] } });
const holed = { type: 'Polygon', coordinates: [sq(0, 0, 10).geometry.coordinates[0], sq(4, 4, 2).geometry.coordinates[0]] };
assert(pointInPolygon([1, 1], holed) && !pointInPolygon([5, 5], holed) && !pointInPolygon([11, 1], holed));
assert.deepEqual(selectByLocation([pt(1, 1), pt(5, 5), pt(20, 20)], [{ type: 'Feature', properties: {}, geometry: holed }]).indices, [0]);
assert.equal(selectByLocation([pt(1, 1)], [pt(0, 0)]).errors.length, 1);
const n = nearestPoints([pt(0, 0, { nearest_idx: 'keep' })], [pt(1, 0), pt(0, 2)]); const p = n.features[0].properties;
assert(p.nearest_idx === 'keep' && p.nearest_idx_2 === 0 && Math.abs(p.nearest_dist_m - 111194.93) < 1); // existing attribute not overwritten
assert(!nearestPoints([pt(0, 0)], [sq(0, 0, 1)]).features.length);
assert.deepEqual(bboxOf(sq(1, 2, 3).geometry), [1, 2, 4, 5]); assert.equal(bboxPolygons([pt(1, 1)]).errors.length, 1);
assert.deepEqual(mergeProps({ id: 1, name: 'a' }, { id: 9 }), { id: 1, name: 'a', b_id: 9 });
let calls = 0; const stub = { intersect: (a) => { calls++; return { type: 'Feature', properties: {}, geometry: a.geometry }; }, union: (a, b) => ({ type: 'Feature', properties: {}, geometry: a.geometry }),
  buffer: () => { throw new Error('boom'); } };
const r = intersectLayers([sq(0, 0, 2)], [sq(1, 1, 2), sq(10, 10, 1), pt(0, 0)], stub);
assert.equal(calls, 1); assert.equal(r.features.length, 1); assert.equal(r.features[0].properties.b_id, 1); assert(r.errors.some(e => /not a polygon/.test(e)));
const d = dissolveLayer([{ ...sq(0, 0, 1), properties: { z: 'a' } }, { ...sq(2, 0, 1), properties: { z: 'a' } }, { ...sq(5, 0, 1), properties: { z: 'b' } }], 'z', stub);
assert.deepEqual(d.features.map(f => f.properties), [{ z: 'a', count: 2 }, { z: 'b', count: 1 }]);
assert.equal(bufferLayer([pt(0, 0)], 0, stub).features.length, 0); assert(/boom/.test(bufferLayer([pt(0, 0)], 10, stub).errors[0]));
const F = [{ properties: { a: 5, s: 'Main Rd' } }, { properties: { a: 12, s: 'ring road' } }, { properties: { a: null, s: 'x' } }];
assert.deepEqual(filterIndices(F, 'a', '>', '6').indices, [1]); assert.deepEqual(filterIndices(F, 's', 'contains', 'RD').indices, [0]); assert.deepEqual(filterIndices(F, 's', 'contains', 'ro').indices, [1]); // case-insensitive
assert.deepEqual(filterIndices(F, 'a', '=', '5').indices, [0]); assert(filterIndices(F, 's', '>', '1').error);
console.log('analysis (logic with stubbed turf): all tests passed');
let turf; try { turf = await import('@turf/turf'); } catch { console.log('analysis (real Turf): SKIPPED, run npm i @turf/turf@6.5.0 to enable'); process.exit(0); }
const t = turf.default || turf; const x = intersectLayers([sq(0, 0, 2)], [sq(1, 1, 2)], t); assert(Math.abs(t.area(x.features[0]) / t.area(sq(0, 0, 1)) - 1) < 0.01);
const bf = bufferLayer([pt(90, 23)], 1000, t); assert(Math.abs(t.area(bf.features[0]) - Math.PI * 1e6) / (Math.PI * 1e6) < 0.01); console.log('analysis (real Turf): passed');
