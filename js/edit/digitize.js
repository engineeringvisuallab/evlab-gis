import { getMap, setDigitizing } from '../map/map-controller.js';
let cur = null;
export function stop() { if (!cur) return; const m = getMap(); m.off('click', cur.click); m.off('dblclick', cur.dbl); m.doubleClickZoom.enable(); m.getContainer().style.cursor = ''; document.removeEventListener('keydown', cur.key); cur.group.remove(); setDigitizing(false); cur = null; }
/** Click to add points (a Point layer finishes on the first click). Double-click or Enter finishes; Esc cancels. onDone receives [[lon,lat], ...]. */
export function start(type, onDone, report, snap = p => p) { stop(); const m = getMap(), pts = [], group = L.layerGroup().addTo(m); let shape = null; setDigitizing(true);
  const finish = () => { const done = [...pts]; stop(); onDone(done); };
  const draw = () => { if (shape) group.removeLayer(shape); const ll = pts.map(p => [p[1], p[0]]); shape = (type === 'Polygon' && pts.length > 2 ? L.polygon(ll) : L.polyline(ll)).setStyle({ color: '#d500f9', weight: 3, dashArray: '6 4' }).addTo(group); };
  cur = { group, click: e => { pts.push(snap([e.latlng.lng, e.latlng.lat])); if (type === 'Point') return finish(); draw(); report(`${pts.length} points. Double-click or press Enter to finish, Esc to cancel`); },
    dbl: () => { pts.pop(); finish(); }, key: ev => { if (ev.key === 'Escape') { stop(); report('Drawing cancelled'); } else if (ev.key === 'Enter') finish(); } };
  m.doubleClickZoom.disable(); m.getContainer().style.cursor = 'crosshair'; m.on('click', cur.click); m.on('dblclick', cur.dbl); document.addEventListener('keydown', cur.key);
  report(type === 'Point' ? 'Click the map to place the point' : 'Click to add points'); }
