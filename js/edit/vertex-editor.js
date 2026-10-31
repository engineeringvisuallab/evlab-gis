import { getMap } from '../map/map-controller.js';
let group = null;
export function clear() { group?.remove(); group = null; }
/** Draggable handles for each vertex. onMove(index, [lon,lat]) after a drag; onRemove(index) on double-click. */
export function show(verts, onMove, onRemove, mids = [], onInsert = () => {}) { clear(); group = L.layerGroup().addTo(getMap());
  verts.forEach((p, i) => { const mk = L.marker([p[1], p[0]], { draggable: true, icon: L.divIcon({ className: 'vtx', iconSize: [12, 12] }), title: 'Drag to move, double-click to remove' }).addTo(group);
    mk.on('dragend', () => { const ll = mk.getLatLng(); onMove(i, [ll.lng, ll.lat]); }); mk.on('dblclick', e => { L.DomEvent.stop(e); onRemove(i); }); });
  mids.forEach(m => { const mk = L.marker([m.pos[1], m.pos[0]], { draggable: true, icon: L.divIcon({ className: 'vtx mid', iconSize: [10, 10] }), title: 'Click or drag to add a vertex here' }).addTo(group);
    mk.on('dragend', () => { const ll = mk.getLatLng(); onInsert(m.after, [ll.lng, ll.lat]); }); mk.on('click', () => onInsert(m.after, m.pos)); }); }
