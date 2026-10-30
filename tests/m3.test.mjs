import assert from 'node:assert/strict';
import { haversine, pathLength, ringArea } from '../js/analysis/geodesy.js';
import { validateGeometry, validateLayer } from '../js/analysis/geometry-validation.js';
import { mapGeometry, normalize } from '../js/core/crs-manager.js';
import { parseGeoJSON } from '../js/data/geojson-import.js';
import { parseCSV, csvToGeoJSON } from '../js/data/csv-import.js';
assert(Math.abs(haversine([0, 0], [1, 0]) - 111194.9) < 1);
assert(Math.abs(pathLength([[0, 0], [1, 0], [1, 1]]) - 2 * 111194.9) < 100);
const a = ringArea([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]); assert(a > 1.22e10 && a < 1.25e10, 'area ' + a);
const sq = { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] };
assert.deepEqual(validateGeometry(sq), []);
assert(validateGeometry({ type: 'Polygon', coordinates: [[[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]]] }).some(x => /self-intersection/.test(x.msg)));
assert(validateGeometry({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] }).some(x => /closed|4 positions/.test(x.msg)));
assert(validateGeometry({ type: 'LineString', coordinates: [[0, 0]] }).length === 1);
assert(validateGeometry({ type: 'Point', coordinates: [NaN, 1] }).length === 1);
assert(validateGeometry({ type: 'LineString', coordinates: [[0, 0], [0, 0], [1, 1]] })[0].level === 'warning');
const lay = validateLayer([{ geometry: sq }, { geometry: { type: 'LineString', coordinates: [[1, 1]] } }]); assert.deepEqual(lay.invalid, [1]);
const tx = ([x, y]) => [x / 100000 + 80, y / 100000]; // fake CRS conversion for logic tests
const m = mapGeometry({ type: 'Point', coordinates: [500000, 2000000, 7] }, tx); assert.deepEqual(m.coordinates, [85, 20, 7]);
assert(/CRS/.test(parseGeoJSON(JSON.stringify({ type: 'Point', coordinates: [500000, 2000000] })).errors[0]));
const g = parseGeoJSON(JSON.stringify({ type: 'Feature', properties: { k: 1 }, geometry: { type: 'Point', coordinates: [500000, 2000000] } }), tx);
assert(g.ok && g.geojson.features[0].geometry.coordinates[0] === 85 && g.geojson.features[0].properties.k === 1);
const c = csvToGeoJSON(parseCSV('id,E,N\n1,500000,2000000\n2,abc,1'), 'N', 'E', tx);
assert(c.ok && c.geojson.features.length === 1 && c.geojson.features[0].properties.E === '500000' && c.skipped === 1); // mixed column stays text; original X preserved
assert.equal(normalize('32646'), 'EPSG:32646'); assert.equal(normalize('x'), null);
console.log('m3: all tests passed');
