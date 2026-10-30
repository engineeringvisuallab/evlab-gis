import assert from 'node:assert/strict';
import * as LM from '../js/core/layer-manager.js';
import { labelText, cleanLabels, cleanFilter, MAX_LABELS } from '../js/layers/labels.js';
import { serializeProject, parseProject } from '../js/core/project-serializer.js';
import { filterMulti } from '../js/tables/filtering.js';
const fc = () => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'a', n: 1 }, geometry: { type: 'Point', coordinates: [1, 2] } }, { type: 'Feature', properties: { id: 'b', n: 2 }, geometry: { type: 'Point', coordinates: [3, 4] } }] });
const a = LM.addLayer('A', fc()); a.sourceCrs = 'EPSG:32646'; LM.setLabels(a.id, { field: 'id', size: 20 }); LM.setFilter(a.id, { field: 'n', op: '>', value: '1' }); LM.select(a.id, 0, false);
const d = LM.duplicateLayer(a.id); assert(d.id !== a.id && d.name === 'A copy' && d.selected.size === 0 && d.sourceCrs === 'EPSG:32646' && d.labels.size === 20 && d.filter.conds[0].op === '>');
d.geojson.features[0].properties.id = 'changed'; d.labels.size = 8; assert.equal(a.geojson.features[0].properties.id, 'a'); assert.equal(a.labels.size, 20); // deep copy
assert.equal(LM.addField(a.id, 'note', 'text'), null); assert.equal(a.geojson.features[1].properties.note, ''); assert.equal(LM.addField(a.id, 'qty', 'number'), null); assert.equal(a.geojson.features[0].properties.qty, null);
assert(/exists/.test(LM.addField(a.id, 'id', 'text'))); assert(/required/.test(LM.addField(a.id, '  ', 'text')));
a.style.mode = 'categorized'; a.style.field = 'n'; LM.deleteField(a.id, 'n'); assert(!('n' in a.geojson.features[0].properties) && a.style.mode === 'single' && a.filter === null && a.labels.field === 'id' && 'id' in a.geojson.features[0].properties); // dependents reset, other attributes kept
LM.deleteField(a.id, 'id'); assert.equal(a.labels.field, null);
assert.equal(labelText({ properties: { x: 'y'.repeat(50) } }, 'x').length, 40); assert.equal(labelText({ properties: { x: 0 } }, 'x'), '0'); assert.equal(labelText({ properties: { x: null } }, 'x'), ''); assert.equal(MAX_LABELS, 500);
assert.deepEqual(cleanLabels({ field: 5, size: 999, color: 'red' }), { field: null, size: 40, color: '#000000' }); assert.equal(cleanFilter({ field: 'a', op: 'DROP', value: '1' }), null); assert.deepEqual(cleanFilter({ field: 'a', op: '=', value: '1' }), { join: 'AND', conds: [{ field: 'a', op: '=', value: '1' }] }); // legacy single condition
const b = LM.addLayer('B', fc()); LM.setLabels(b.id, { field: 'id', color: '#ff0000' }); LM.setFilter(b.id, { field: 'n', op: '>=', value: '2' });
const r = parseProject(JSON.stringify(serializeProject({ name: 'p', projectCrs: 'EPSG:4326', view: null, layers: [b] }))); const L0 = r.project.layers[0];
assert.deepEqual(L0.labels, { field: 'id', size: 12, color: '#ff0000' }); assert.deepEqual(L0.filter, { join: 'AND', conds: [{ field: 'n', op: '>=', value: '2' }] }); assert.deepEqual(filterMulti(L0.geojson.features, L0.filter).indices, [1]);
console.log('m9: all tests passed');
