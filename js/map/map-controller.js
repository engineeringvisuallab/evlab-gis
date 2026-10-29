import { layers, select, clearSelection } from '../core/layer-manager.js';
import { styleFor } from '../layers/styling.js';
let map, group, osm; const byId = new Map();
export function initMap(onMouse, onScale) {
  map = L.map('map', { center: [23.8, 90.4], zoom: 7 });
  L.control.scale({ metric: true, imperial: false }).addTo(map);
  group = L.layerGroup().addTo(map);
  map.on('mousemove', e => onMouse(e.latlng)); map.on('click', clearSelection);
  map.on('zoomend moveend', () => onScale(scaleText())); onScale(scaleText());
}
function scaleText() { const c = map.getCenter(); // approximate ground resolution at map centre (Web Mercator)
  return `≈ ${(156543.03392 * Math.cos(c.lat * Math.PI / 180) / Math.pow(2, map.getZoom())).toFixed(1)} m/px`; }
export function setBasemap(on) {
  if (on && !osm) osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' });
  if (osm) on ? osm.addTo(map).bringToBack() : map.removeLayer(osm);
}
export function redraw() {
  group.clearLayers(); byId.clear();
  [...layers].reverse().forEach(l => { if (!l.visible) return; const subs = [];
    l.geojson.features.forEach((f, i) => { const sel = l.selected.has(i);
      const g = L.geoJSON(f, { pointToLayer: (ft, ll) => L.circleMarker(ll, { radius: sel ? 7 : 5 }), style: () => styleFor(l, f, sel) });
      g.on('click', e => { L.DomEvent.stopPropagation(e); select(l.id, i, e.originalEvent.shiftKey || e.originalEvent.ctrlKey); });
      g.addTo(group); subs[i] = g; });
    byId.set(l.id, subs); });
}
const fit = gs => { const b = L.featureGroup(gs).getBounds(); if (b.isValid()) map.fitBounds(b, { padding: [20, 20], maxZoom: 18 }); };
export const zoomToLayer = id => fit((byId.get(id) || []).filter(Boolean));
export const zoomToAll = () => fit([...byId.values()].flat().filter(Boolean));
export const zoomToSelected = id => { const l = layers.find(x => x.id === id); fit([...l.selected].map(i => byId.get(id)?.[i]).filter(Boolean)); };
