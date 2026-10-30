import { getMap } from './map-controller.js';
import { pathLength, ringArea } from '../analysis/geodesy.js';
let cur = null, shown = null;
const fm = m => m >= 1000 ? (m / 1000).toFixed(3) + ' km' : m.toFixed(2) + ' m';
const text = (mode, pts) => mode === 'area'
  ? (pts.length < 3 ? 'Area: click at least 3 points' : `Area ${ringArea(pts).toFixed(1)} m² (${(ringArea(pts) / 1e4).toFixed(4)} ha), perimeter ${fm(pathLength([...pts, pts[0]]))}`) + ' [spherical approx.]'
  : `Distance ${fm(pathLength(pts))} [spherical approx.]`;
export function stop() { if (!cur) return; const m = getMap(); m.off('click', cur.click); m.off('dblclick', cur.dbl); m.doubleClickZoom.enable(); m.getContainer().style.cursor = ''; cur = null; }
export function start(mode, report) {
  stop(); const m = getMap(), pts = [], g = L.layerGroup().addTo(m); if (shown) m.removeLayer(shown); shown = g; let s = null;
  const draw = () => { if (s) g.removeLayer(s); const ll = pts.map(p => [p[1], p[0]]);
    s = (mode === 'area' && pts.length > 2 ? L.polygon(ll) : L.polyline(ll)).setStyle({ color: '#ff6f00', weight: 3 }).addTo(g); report(text(mode, pts)); };
  cur = { click: e => { pts.push([e.latlng.lng, e.latlng.lat]); draw(); }, dbl: () => { pts.pop(); draw(); stop(); } };
  m.doubleClickZoom.disable(); m.getContainer().style.cursor = 'crosshair'; m.on('click', cur.click); m.on('dblclick', cur.dbl);
  report(mode === 'area' ? 'Click vertices; double-click to finish' : 'Click points; double-click to finish');
}
