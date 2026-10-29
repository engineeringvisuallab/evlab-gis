import assert from 'node:assert/strict';
import { parseCSV, detectCoordColumns, csvToGeoJSON } from '../js/data/csv-import.js';
import { categorizedMap, breaks, colorFor, fieldTypes, rampColors } from '../js/layers/styling.js';
import { toCSV } from '../js/io/csv-export.js';
const rows = parseCSV('id,Lat,Lng,note,dia\r\n007,22.8,89.5,"a, ""b""",150\r\n008,22.9,89.6,x,200\r\n009,95,89,bad,100\r\n010,,89,blank,1\r\n');
assert.equal(rows[1][3], 'a, "b"');
const c = detectCoordColumns(rows[0]); assert.deepEqual(c, { lat: 'Lat', lon: 'Lng' });
const r = csvToGeoJSON(rows, c.lat, c.lon);
assert(r.ok && r.geojson.features.length === 2 && r.skipped === 2);
const p = r.geojson.features[0].properties; assert.equal(p.id, '007'); assert.equal(p.dia, 150); assert.equal(p.Lat, 22.8); // IDs stay text, no column dropped
assert.deepEqual(r.geojson.features[0].geometry.coordinates, [89.5, 22.8]);
const F = r.geojson.features, t = fieldTypes(F); assert(t.dia === 'number' && t.id === 'string');
const cats = categorizedMap(F, 'note'); assert.equal(Object.keys(cats).length, 2);
const e = breaks(F, 'dia', 2); assert.deepEqual(e, [150, 175, 200]);
const s = { mode: 'graduated', field: 'dia', edges: e }; assert.equal(colorFor(s, F[0]), rampColors(2)[0]); assert.equal(colorFor(s, F[1]), rampColors(2)[1]);
assert.equal(breaks(F, 'note', 3), null);
assert.equal(toCSV(['a', 'b'], [{ a: 'x,y', b: 'q"r' }]), 'a,b\r\n"x,y","q""r"');
assert(!csvToGeoJSON(parseCSV('a,b\n1,2'), 'lat', 'lon').ok);
console.log('csv-styling: all tests passed');
