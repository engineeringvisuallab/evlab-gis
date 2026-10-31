import assert from 'node:assert/strict';
import * as LM from '../js/core/layer-manager.js';
import * as H from '../js/edit/history.js';
import { buildGeometry, newFeature, vertices, setVertex, removeVertex, addFeatureCmd, deleteCmd, geomCmd } from '../js/edit/edit-ops.js';
import { parseFieldSpec, drawTypeOf, newProps, fieldsOf } from '../js/layers/schema.js';
import { serializeProject, parseProject } from '../js/core/project-serializer.js';
assert.deepEqual(buildGeometry('Polygon', [[0, 0], [0, 0], [4, 0], [4, 4]]), { type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 0]]] }); // duplicate click dropped, ring closed
assert.throws(() => buildGeometry('Polygon', [[0, 0], [1, 1]]), /at least 3/); assert.throws(() => buildGeometry('LineString', [[0, 0], [0, 0]]), /at least 2/); assert.throws(() => buildGeometry('Point', []), /Click/);
assert.throws(() => buildGeometry('Polygon', [[0, 0], [4, 4], [4, 0], [0, 4]]), /self-intersection/); assert.equal(buildGeometry('Point', [[1, 2]]).coordinates[1], 2);
const poly = { type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]], [[1, 1], [2, 1], [2, 2], [1, 1]]] };
assert.equal(vertices(poly).length, 7); const m0 = setVertex(poly, 0, [-1, -1]); assert.deepEqual(m0.coordinates[0][0], [-1, -1]); assert.deepEqual(m0.coordinates[0][4], [-1, -1]); assert.deepEqual(poly.coordinates[0][0], [0, 0]); // closing vertex follows, input untouched
assert.deepEqual(setVertex(poly, 5, [9, 9]).coordinates[1][1], [9, 9]); assert.deepEqual(setVertex({ type: 'Point', coordinates: [1, 2, 7] }, 0, [3, 4]).coordinates, [3, 4, 7]);
assert.equal(removeVertex(poly, 2).coordinates[0].length, 4); assert.throws(() => removeVertex(poly, 4), /invalid/); const rm0 = removeVertex(poly, 0).coordinates[0]; assert(rm0[0][0] === 4 && rm0.at(-1)[0] === 4);
assert.throws(() => removeVertex({ type: 'LineString', coordinates: [[0, 0], [1, 1]] }, 0), /invalid/); assert.equal(removeVertex({ type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 0]] }, 1).coordinates.length, 2); assert.throws(() => setVertex(poly, 99, [0, 0]), /range/);
assert.deepEqual(parseFieldSpec('asset_id, dia:number ,mat:text'), { asset_id: 'text', dia: 'number', mat: 'text' }); assert.throws(() => parseFieldSpec('a:int'), /text or number/); assert.throws(() => parseFieldSpec('a,a'), /Duplicate/); assert.throws(() => parseFieldSpec('1bad'), /Bad field/); assert.deepEqual(parseFieldSpec(''), {});
const L = LM.createLayer('Assets', 'Point', parseFieldSpec('asset_id,dia:number')); assert.deepEqual(drawTypeOf(L), 'Point'); assert.deepEqual(newProps(L), { asset_id: '', dia: null }); assert.deepEqual(fieldsOf(L), { asset_id: 'text', dia: 'number' });
const pt = (x, y) => newFeature(L, { type: 'Point', coordinates: [x, y] }); H.clear();
assert(H.run(addFeatureCmd(L.id, pt(1, 1)))); H.run(addFeatureCmd(L.id, pt(2, 2))); H.run(addFeatureCmd(L.id, pt(3, 3))); assert.equal(L.geojson.features.length, 3);
H.run(deleteCmd(L.id, [0, 2])); assert.deepEqual(L.geojson.features.map(f => f.geometry.coordinates[0]), [2]); assert.equal(H.undoLast(), 'Delete 2 feature(s)'); assert.deepEqual(L.geojson.features.map(f => f.geometry.coordinates[0]), [1, 2, 3]); // original order restored
H.run(geomCmd(L.id, 1, { type: 'Point', coordinates: [9, 9] })); assert.equal(L.geojson.features[1].geometry.coordinates[0], 9); H.undoLast(); assert.equal(L.geojson.features[1].geometry.coordinates[0], 2); H.redoLast(); assert.equal(L.geojson.features[1].geometry.coordinates[0], 9);
H.undoLast(); H.undoLast(); H.undoLast(); H.undoLast(); H.undoLast(); assert.equal(L.geojson.features.length, 0); assert.equal(H.undoLast(), null); assert(H.canRedo()); H.run(addFeatureCmd(L.id, pt(5, 5))); assert(!H.canRedo()); // new action clears redo
LM.addField(L.id, 'note', 'text'); assert.equal(L.schema.note, 'text'); assert(/exists/.test(LM.addField(L.id, 'note', 'text'))); LM.deleteField(L.id, 'note'); assert(!('note' in L.schema));
const D = LM.duplicateLayer(L.id); assert.deepEqual(D.schema, L.schema); assert.equal(D.geomType, 'Point'); LM.removeLayer(D.id); H.clear(); const E = LM.createLayer('E', 'Polygon', {}); H.run(addFeatureCmd(E.id, newFeature(E, buildGeometry('Polygon', [[0, 0], [1, 0], [1, 1]])))); LM.removeLayer(E.id); assert.match(H.undoLast(), /skipped/); // stale layer is skipped, not a crash
const empty = LM.createLayer('New', 'LineString', { a: 'number' }), r = parseProject(JSON.stringify(serializeProject({ name: 'p', projectCrs: 'EPSG:4326', view: null, layers: [empty, L] })));
assert(r.ok && r.project.layers.length === 2 && r.warnings.length === 0 && r.project.layers[0].geomType === 'LineString' && r.project.layers[0].geojson.features.length === 0 && r.project.layers[0].schema.a === 'number'); // empty layers survive save/open
console.log('edit: all tests passed');
