import assert from 'node:assert/strict';
import * as LM from '../js/core/layer-manager.js';
import { filterMulti } from '../js/tables/filtering.js';
import { cleanFilter } from '../js/layers/labels.js';
import { cleanStyle, serializeProject, parseProject } from '../js/core/project-serializer.js';
const F = [{ properties: { a: 1, s: 'x' } }, { properties: { a: 5, s: 'y' } }, { properties: { a: 9, s: 'x' } }];
const c = (field, op, value) => ({ field, op, value });
assert.deepEqual(filterMulti(F, { join: 'AND', conds: [c('a', '>', '2'), c('s', '=', 'x')] }).indices, [2]); assert.deepEqual(filterMulti(F, { join: 'OR', conds: [c('a', '<', '2'), c('s', '=', 'y')] }).indices, [0, 1]);
assert(filterMulti(F, { join: 'AND', conds: [c('a', '>', '2'), c('s', '>', '1')] }).error); assert.deepEqual(filterMulti(F, null).indices, [0, 1, 2]);
assert.deepEqual(cleanFilter({ join: 'XOR', conds: [c('a', '=', '1'), { field: 'a', op: 'DROP', value: '1' }] }), { join: 'AND', conds: [c('a', '=', '1')] }); assert.equal(cleanFilter({ conds: [] }), null);
const w = []; assert.equal(cleanStyle({ radius: 500 }, w, 't').radius, 20); assert.equal(cleanStyle({ radius: 'big' }, w, 't').radius, 5); assert.equal(cleanStyle({}, w, 't').radius, 5);
const fc = () => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { n: 1 }, geometry: { type: 'Point', coordinates: [0, 0] } }] });
const A = LM.addLayer('A', fc()), B = LM.addLayer('B', fc()), C = LM.addLayer('C', fc()); // order top to bottom: C, B, A
LM.setGroup(A.id, 'Net'); LM.setGroup(C.id, 'Net'); assert.deepEqual(LM.layers.map(l => l.name), ['B', 'A', 'C']); // C was moved to sit right after A, so the group stays contiguous
LM.setGroupVisible('Net', false); assert(!A.visible && !C.visible && B.visible); LM.setGroup(A.id, '  '); assert.equal(A.group, null); assert.equal(LM.layers.find(l => l.name === 'A').group, null);
LM.setFilter(C.id, { join: 'AND', conds: [c('n', '=', '1'), c('z', '=', '1')] }); LM.deleteField(C.id, 'z'); assert.deepEqual(C.filter, { join: 'AND', conds: [c('n', '=', '1')] }); LM.deleteField(C.id, 'n'); assert.equal(C.filter, null); // conditions on a deleted field are dropped
C.style.radius = 11; const r = parseProject(JSON.stringify(serializeProject({ name: 'g', projectCrs: 'EPSG:4326', view: null, layers: [C] }))); assert.equal(r.project.layers[0].group, 'Net'); assert.equal(r.project.layers[0].style.radius, 11);
console.log('m10: all tests passed');
