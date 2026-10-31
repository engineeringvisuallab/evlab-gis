import assert from 'node:assert/strict';
import { snapPosition, nearestOnSegment } from '../js/edit/snap.js';
import { buildGeometry, midpoints, insertVertex, vertices, removeVertex } from '../js/edit/edit-ops.js';
const line = { type: 'LineString', coordinates: [[0, 0], [1, 0]] }, tol = 0.01;
assert.deepEqual(snapPosition([0.005, 0.004], [line], tol), { pos: [0, 0], kind: 'vertex' }); // vertex within tolerance
assert.deepEqual(snapPosition([0.5, 0.004], [line], tol), { pos: [0.5, 0], kind: 'edge' }); // lands on the segment
assert.equal(snapPosition([0.5, 0.05], [line], tol).kind, null); assert.deepEqual(snapPosition([0.5, 0.05], [line], tol).pos, [0.5, 0.05]);
assert.equal(snapPosition([0.5, 0.004], [line], tol, false).kind, null); // edges can be switched off
assert.deepEqual(snapPosition([0.008, 0.001], [line], tol).pos, [0, 0]); // vertex wins over the edge that is also in range
assert.equal(snapPosition([1.5, 0], [line], tol).kind, null); assert.deepEqual(nearestOnSegment([2, 1], [0, 0], [1, 0], 1).pos, [1, 0]); // clamped to the end
const hi = Math.cos(60 * Math.PI / 180); assert.equal(snapPosition([0.012, 60], [{ type: 'Point', coordinates: [0, 60] }], 0.01).kind, 'vertex'); assert.equal(snapPosition([0.012, 0], [{ type: 'Point', coordinates: [0, 0] }], 0.01).kind, null); // x distance shrinks with latitude
const mixed = [null, { type: 'GeometryCollection', geometries: [{ type: 'MultiPolygon', coordinates: [[[[10, 10], [11, 10], [11, 11], [10, 10]]]] }] }, { type: 'MultiPoint', coordinates: [[5, 5], [6, 6]] }];
assert.deepEqual(snapPosition([6.001, 6], mixed, tol).pos, [6, 6]); assert.deepEqual(snapPosition([10.5, 10.004], mixed, tol).kind, 'edge'); assert.equal(snapPosition([0, 0], [], tol).kind, null);
assert.deepEqual(buildGeometry('Polygon', [[0, 0], [4, 0], [4, 4], [0, 0]]).coordinates[0], [[0, 0], [4, 0], [4, 4], [0, 0]]); // clicking the first point again closes the ring once
const poly = { type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 0]]] }, mp = midpoints(poly); assert.equal(mp.length, 3); assert.deepEqual(mp[2], { after: 2, pos: [2, 2] }); // closing segment included
const ins = insertVertex(poly, 2, [1, 3]); assert.deepEqual(ins.coordinates[0], [[0, 0], [4, 0], [4, 4], [1, 3], [0, 0]]); assert.equal(vertices(ins).length, 4); assert.equal(poly.coordinates[0].length, 4); // original untouched
assert.equal(midpoints({ type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 0]] }).length, 2); assert.deepEqual(insertVertex({ type: 'LineString', coordinates: [[0, 0, 10], [2, 0, 20]] }, 0, [1, 0]).coordinates[1], [1, 0, 15]);
assert.deepEqual(insertVertex({ type: 'LineString', coordinates: [[0, 0, 10], [2, 0]] }, 0, [1, 0]).coordinates[1], [1, 0]); assert.deepEqual(midpoints({ type: 'Point', coordinates: [0, 0] }), []); assert.deepEqual(midpoints({ type: 'MultiPoint', coordinates: [[0, 0], [1, 1]] }), []); assert.throws(() => insertVertex({ type: 'MultiPoint', coordinates: [[0, 0], [1, 1]] }, 0, [0.5, 0.5]), /no segments/);
const mpl = { type: 'MultiLineString', coordinates: [[[0, 0], [1, 0]], [[5, 5], [6, 5], [7, 5]]] }, mm = midpoints(mpl); assert.deepEqual(mm.map(m => m.after), [0, 2, 3]); assert.deepEqual(insertVertex(mpl, 2, [6.5, 5.5]).coordinates[1][1], [6.5, 5.5]); // indices continue across parts
const back = removeVertex(insertVertex(poly, 0, [2, 0]), 1); assert.deepEqual(back, poly); // insert then remove round trip
console.log('snap: all tests passed');
