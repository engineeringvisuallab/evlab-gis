// Panel visibility: pure state logic (testable) plus a small DOM binding. State is remembered in localStorage when available.
const KEYS = ['left', 'right', 'table'], KEY = 'evlab-panels';
export const defaultState = () => ({ left: true, right: true, table: true, prev: null });
export function reduce(s, action) { const n = { ...s };
  if (KEYS.includes(action)) { n[action] = !s[action]; return n; }
  if (action === 'mapOnly') { if (KEYS.some(k => s[k])) { n.prev = { left: s.left, right: s.right, table: s.table }; KEYS.forEach(k => n[k] = false); } else { const p = s.prev || { left: true, right: true, table: true }; KEYS.forEach(k => n[k] = p[k]); n.prev = null; } return n; }
  return n; }
export function loadState(storage) { try { const o = JSON.parse(storage.getItem(KEY)); if (o && KEYS.every(k => typeof o[k] === 'boolean')) return { ...defaultState(), left: o.left, right: o.right, table: o.table }; } catch { /* no saved state */ } return defaultState(); }
export function saveState(storage, s) { try { storage.setItem(KEY, JSON.stringify({ left: s.left, right: s.right, table: s.table })); } catch { /* storage unavailable */ } }
export function initPanels(onResize) {
  let st = loadState(globalThis.localStorage || { getItem: () => null }); const ids = { left: 'tg-left', right: 'tg-right', table: 'tg-table' };
  const apply = () => { KEYS.forEach(k => { document.body.classList.toggle('hide-' + k, !st[k]); document.getElementById(ids[k]).classList.toggle('on', st[k]); });
    document.getElementById('tg-full').classList.toggle('on', !KEYS.some(k => st[k])); saveState(globalThis.localStorage, st); setTimeout(onResize, 0); };
  [...KEYS, 'mapOnly'].forEach(a => { document.getElementById(a === 'mapOnly' ? 'tg-full' : ids[a]).onclick = () => { st = reduce(st, a); apply(); }; });
  document.querySelectorAll('#right h3').forEach(h => { h.classList.add('fold'); h.title = 'Click to collapse or expand'; h.onclick = () => { const d = h.nextElementSibling, hide = d.style.display !== 'none'; d.style.display = hide ? 'none' : ''; h.classList.toggle('collapsed', hide); }; });
  apply(); }
