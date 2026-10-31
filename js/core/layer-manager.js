import { bus } from './event-bus.js';
import { cleanFilter } from '../layers/labels.js';
let nextId = 1; export let activeId = null;
export const layers = []; // index 0 = top
const L = id => layers.find(l => l.id === id), emit = () => bus.emit('layers');
export const getActive = () => L(activeId);
export function addLayer(name, geojson) {
  const l = { id: nextId++, name, geojson, visible: true, crs: 'EPSG:4326', selected: new Set(), group: null, schema: {}, geomType: null, labels: { field: null, size: 12, color: '#000000' }, filter: null,
    style: { mode: 'single', color: '#1565c0', width: 2, radius: 5, method: 'equal', opacity: 1, field: null, cats: {}, edges: [], n: 4 } };
  layers.unshift(l); activeId = l.id; emit(); return l;
}
export const removeLayer = id => { const i = layers.findIndex(l => l.id === id); if (i >= 0) layers.splice(i, 1);
  if (activeId === id) activeId = layers[0]?.id ?? null; emit(); };
export const renameLayer = (id, n) => { L(id).name = n; emit(); };
export const setVisible = (id, v) => { L(id).visible = v; emit(); };
export const setActive = id => { activeId = id; emit(); };
export function move(id, d) { const i = layers.findIndex(l => l.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= layers.length) return; [layers[i], layers[j]] = [layers[j], layers[i]]; emit(); }
export const clear = () => { layers.length = 0; activeId = null; emit(); };
export function select(id, i, additive) {
  if (!additive) layers.forEach(l => { if (l.id !== id) l.selected.clear(); });
  const s = L(id).selected; if (additive && s.has(i)) s.delete(i); else { if (!additive) s.clear(); s.add(i); }
  activeId = id; emit(); }
export const setSelection = (id, idxs) => { layers.forEach(l => l.selected.clear()); L(id).selected = new Set(idxs); activeId = id; emit(); };
export const clearSelection = () => { layers.forEach(l => l.selected.clear()); emit(); };
export const editCell = (id, i, field, v) => { L(id).geojson.features[i].properties[field] = v; emit(); };
export const selectedCount = () => layers.reduce((n, l) => n + l.selected.size, 0);
export function duplicateLayer(id) { const l = L(id), c = addLayer(l.name + ' copy', structuredClone(l.geojson)); c.style = structuredClone(l.style); c.labels = { ...l.labels }; c.filter = l.filter ? { ...l.filter } : null;
  c.schema = { ...l.schema }; c.geomType = l.geomType; c.sourceCrs = l.sourceCrs; c.fileName = l.fileName; if (l.civil) c.civil = structuredClone(l.civil); emit(); return c; }
/** type 'text' fills '' (typed as text); 'number' fills null. Returns an error string or null. */
export function addField(id, name, type) { const l = L(id); name = String(name).trim(); if (!name) return 'Field name required';
  if (l.geojson.features.some(f => name in f.properties) || name in l.schema) return `Field ${name} already exists`; l.geojson.features.forEach(f => { f.properties[name] = type === 'text' ? '' : null; }); l.schema[name] = type === 'text' ? 'text' : 'number'; emit(); return null; }
export function deleteField(id, name) { const l = L(id); l.geojson.features.forEach(f => { delete f.properties[name]; });
  delete l.schema[name]; if (l.style.field === name) { l.style.field = null; l.style.mode = 'single'; } if (l.labels.field === name) l.labels.field = null; if (l.filter) { const conds = l.filter.conds.filter(c => c.field !== name); l.filter = conds.length ? { ...l.filter, conds } : null; }
  if (l.civil) for (const k in l.civil.map) if (l.civil.map[k] === name) delete l.civil.map[k]; emit(); }
export const setLabels = (id, o) => { Object.assign(L(id).labels, o); emit(); };
export const setFilter = (id, f) => { L(id).filter = cleanFilter(f); emit(); };
/** Moves the layer next to the existing members of the group so a group stays contiguous in the layer order. Empty name removes the group. */
export function setGroup(id, name) { const l = L(id); name = String(name || '').trim().slice(0, 60); l.group = name || null;
  if (name) { const j = layers.findIndex(x => x.id !== id && x.group === name); if (j >= 0) { layers.splice(layers.indexOf(l), 1); const k = layers.map(x => x.group).lastIndexOf(name); layers.splice(k + 1, 0, l); } } emit(); }
export const setGroupVisible = (name, v) => { layers.forEach(l => { if (l.group === name) l.visible = v; }); emit(); };
export function createLayer(name, geomType, schema) { const l = addLayer(name, { type: 'FeatureCollection', features: [] }); l.geomType = geomType; l.schema = { ...schema }; l.sourceCrs = 'EPSG:4326'; emit(); return l; }
export function insertFeatures(id, items) { const l = L(id); if (!l) return false; [...items].sort((a, b) => a.index - b.index).forEach(it => l.geojson.features.splice(it.index, 0, it.feature)); l.selected.clear(); emit(); return true; }
export function removeFeatures(id, indices) { const l = L(id); if (!l) return false; [...indices].sort((a, b) => b - a).forEach(i => l.geojson.features.splice(i, 1)); l.selected.clear(); emit(); return true; }
export function setGeometry(id, index, geom) { const f = L(id)?.geojson.features[index]; if (!f) return false; f.geometry = geom; emit(); return true; }
