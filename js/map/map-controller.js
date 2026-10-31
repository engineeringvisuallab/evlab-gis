import { layers, select, clearSelection } from '../core/layer-manager.js';
import { filterMulti } from '../tables/filtering.js';
import { labelText, MAX_LABELS } from '../layers/labels.js';
import { styleFor } from '../layers/styling.js';
let map, group, osm; const byId = new Map();
export const getMap = () => map;
/** Tolerance in x-scaled degrees (see edit/snap.js) for `px` screen pixels at pos. */
export const snapTolerance = (pos, px) => px * 360 / (256 * 2 ** map.getZoom()) * Math.cos(pos[1] * Math.PI / 180);
export const invalidateSize = () => map && map.invalidateSize();
export const getView = () => ({ center: [map.getCenter().lat, map.getCenter().lng], zoom: map.getZoom() });
export const setView = v => map.setView(v.center, v.zoom);
export function initMap(onMouse, onScale) {
  map = L.map('map', { center: [23.8, 90.4], zoom: 7, preferCanvas: true });
  L.control.scale({ metric: true, imperial: false }).addTo(map);
  group = L.layerGroup().addTo(map);
  map.on('mousemove', e => onMouse(e.latlng)); map.on('click', () => { if (!digitizing) clearSelection(); });
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
  [...layers].reverse().forEach(l => { if (!l.visible) return; const subs = [], keep = keepSet(l), lab = l.labels?.field && (keep ? keep.size : l.geojson.features.length) <= MAX_LABELS;
    l.geojson.features.forEach((f, i) => { if (keep && !keep.has(i)) return; const sel = l.selected.has(i);
      const g = L.geoJSON(f, { pointToLayer: (ft, ll) => L.circleMarker(ll, { radius: (l.style.radius || 5) + (sel ? 2 : 0) }), style: () => styleFor(l, f, sel) });
      g.on('click', e => { if (digitizing) return; L.DomEvent.stopPropagation(e); if (identify) return showInfo(e.latlng, f); select(l.id, i, e.originalEvent.shiftKey || e.originalEvent.ctrlKey); });
      g.addTo(group); subs[i] = g;
      if (lab) { const t = labelText(f, l.labels.field); if (t) { const s = document.createElement('span'); s.textContent = t; s.style.cssText = `font-size:${l.labels.size}px;color:${l.labels.color}`; g.bindTooltip(s, { permanent: true, direction: 'center', className: 'evlab-label' }); } } });
    byId.set(l.id, subs); });
}
const fit = gs => { const b = L.featureGroup(gs).getBounds(); if (b.isValid()) map.fitBounds(b, { padding: [20, 20], maxZoom: 18 }); };
export const zoomToLayer = id => fit((byId.get(id) || []).filter(Boolean));
export const zoomToAll = () => fit([...byId.values()].flat().filter(Boolean));
export const zoomToSelected = id => { const l = layers.find(x => x.id === id); fit([...l.selected].map(i => byId.get(id)?.[i]).filter(Boolean)); };
function keepSet(l) { if (!l.filter) return null; const r = filterMulti(l.geojson.features, l.filter); return r.error ? null : new Set(r.indices); }
export let identify = false;
export const setIdentify = v => { identify = v; map.getContainer().style.cursor = v ? 'help' : ''; };
function showInfo(ll, f) { const t = document.createElement('table'); Object.entries(f.properties || {}).forEach(([k, v]) => { const r = t.insertRow(); r.insertCell().textContent = k; r.insertCell().textContent = v ?? ''; });
  if (!t.rows.length) t.textContent = 'No attributes'; L.popup({ maxHeight: 260 }).setLatLng(ll).setContent(t).openOn(map); }
export let digitizing = false;
export const setDigitizing = v => { digitizing = v; };
