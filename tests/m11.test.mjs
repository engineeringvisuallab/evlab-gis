import assert from 'node:assert/strict';
import { breaks, colorFor, rampColors } from '../js/layers/styling.js';
import { cleanStyle } from '../js/core/project-serializer.js';
const F = a => a.map(x => ({ properties: { v: x } }));
assert.deepEqual(breaks(F([1, 2, 3, 10, 11, 12, 50, 51, 52]), 'v', 3, 'jenks'), [1, 3, 12, 52]); // three obvious clusters
assert.deepEqual(breaks(F([1, 2, 3, 4, 5, 6, 7, 8, 9]), 'v', 4, 'quantile'), [1, 3, 5, 7, 9]);
assert.deepEqual(breaks(F([5, 5, 5]), 'v', 3, 'jenks'), [5, 5]); assert.equal(breaks(F([2, 4, 6, 8]), 'v', 2, 'jenks').length, 3);
assert.deepEqual(breaks(F([0, 10]), 'v', 2), [0, 5, 10]); assert.equal(breaks([{ properties: { v: 'x' } }], 'v', 3, 'quantile'), null);
const big = F(Array.from({ length: 300000 }, (_, i) => i % 977)); assert.equal(breaks(big, 'v', 5).length, 6); assert.equal(breaks(big, 'v', 5, 'jenks').length, 6); // no stack overflow, jenks samples
const s = { mode: 'graduated', field: 'v', edges: [1, 3, 12, 52] }, col = x => colorFor(s, { properties: { v: x } }), rc = rampColors(3);
assert.deepEqual([col(1), col(3), col(4), col(12), col(13), col(52), col(999), col(-5)], [rc[0], rc[0], rc[1], rc[1], rc[2], rc[2], rc[2], rc[0]]); // upper bounds inclusive, outliers clamp to end classes
assert.equal(colorFor({ mode: 'graduated', field: 'v', edges: [5, 5] }, { properties: { v: 5 } }), rampColors(1)[0]); assert.equal(colorFor(s, { properties: { v: 'x' } }), '#999999');
assert.equal(cleanStyle({ method: 'quantile' }, [], 't').method, 'quantile'); assert.equal(cleanStyle({ method: 'bogus' }, [], 't').method, 'equal');
console.log('m11: all tests passed');
