import * as LM from '../core/layer-manager.js';
import { fieldTypes } from '../layers/styling.js';
import { toCSV } from '../io/csv-export.js';
const st = { search: '', sort: null, dir: 1 }, MAX = 500;
export function renderTable(el, l, hooks) {
  el.innerHTML = ''; if (!l) { el.textContent = 'No active layer'; return; }
  const types = fieldTypes(l.geojson.features), fields = Object.keys(types), feats = l.geojson.features;
  let idx = feats.map((_, i) => i);
  if (st.search) idx = idx.filter(i => fields.some(f => String(feats[i].properties[f] ?? '').toLowerCase().includes(st.search.toLowerCase())));
  if (st.sort) idx.sort((a, b) => { const x = feats[a].properties[st.sort], y = feats[b].properties[st.sort];
    return (x == null) - (y == null) || (types[st.sort] === 'number' ? x - y : String(x).localeCompare(String(y))) * st.dir; });
  const bar = document.createElement('div');
  bar.innerHTML = `<b></b> <input placeholder="Search (Enter)"> <button id="zs">Zoom to selected</button> <button id="ex">Export selected CSV</button> <button id="af">Add field</button> <button id="df">Delete field</button> <span></span>`;
  bar.querySelector('b').textContent = `${l.name}: ${idx.length}/${feats.length} records, ${l.selected.size} selected`;
  const inp = bar.querySelector('input'); inp.value = st.search; inp.onchange = () => { st.search = inp.value; renderTable(el, l, hooks); };
  bar.querySelector('#zs').onclick = () => l.selected.size ? hooks.zoomSel(l.id) : hooks.msg('No selected features', true);
  bar.querySelector('#ex').onclick = () => l.selected.size
    ? hooks.download(`${l.name}_selected.csv`, toCSV(fields, [...l.selected].sort((a, b) => a - b).map(i => feats[i].properties))) : hooks.msg('No selected features', true);
  if (idx.length > MAX) bar.lastElementChild.textContent = `Showing first ${MAX} rows; use search to narrow`;
  bar.querySelector('#af').onclick = () => { const n = prompt('New field name'); if (!n) return; const t = prompt('Type: text or number', 'text'); if (t !== 'text' && t !== 'number') return hooks.msg('Type must be text or number', true); const e = LM.addField(l.id, n, t); if (e) hooks.msg(e, true); };
  bar.querySelector('#df').onclick = () => { const n = prompt('Field to delete (all its values are removed)'); if (!n) return; if (!fields.includes(n)) return hooks.msg(`No field ${n}`, true); if (confirm(`Delete field "${n}" and all its values?`)) LM.deleteField(l.id, n); };
  el.appendChild(bar);
  const tb = document.createElement('table'), hr = tb.insertRow();
  fields.forEach(f => { const th = document.createElement('th'); th.textContent = `${f} (${types[f]})${st.sort === f ? (st.dir > 0 ? ' ▲' : ' ▼') : ''}`;
    th.onclick = () => { st.dir = st.sort === f ? -st.dir : 1; st.sort = f; renderTable(el, l, hooks); }; hr.appendChild(th); });
  idx.slice(0, MAX).forEach(i => { const tr = tb.insertRow(); if (l.selected.has(i)) tr.className = 'sel';
    tr.onclick = e => LM.select(l.id, i, e.shiftKey || e.ctrlKey);
    fields.forEach(f => { const td = tr.insertCell(); td.textContent = feats[i].properties[f] ?? '';
      td.ondblclick = e => { e.stopPropagation(); const v = prompt(`Edit ${f}`, td.textContent); if (v === null) return;
        if (types[f] === 'number') { if (v.trim() === '' || !isFinite(Number(v))) return hooks.msg(`${f} is numeric; value rejected`, true); LM.editCell(l.id, i, f, Number(v)); }
        else LM.editCell(l.id, i, f, v); }; }); });
  el.appendChild(tb);
}
