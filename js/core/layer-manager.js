import { bus } from './event-bus.js';
let nextId = 1; export let activeId = null;
export const layers = []; // index 0 = top
const L = id => layers.find(l => l.id === id), emit = () => bus.emit('layers');
export const getActive = () => L(activeId);
export function addLayer(name, geojson) {
  const l = { id: nextId++, name, geojson, visible: true, crs: 'EPSG:4326', selected: new Set(),
    style: { mode: 'single', color: '#1565c0', width: 2, opacity: 1, field: null, cats: {}, edges: [], n: 4 } };
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
