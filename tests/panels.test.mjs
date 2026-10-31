import assert from 'node:assert/strict';
import { reduce, defaultState, loadState, saveState } from '../js/ui/panels.js';
let s = defaultState(); s = reduce(s, 'left'); assert(!s.left && s.right && s.table); s = reduce(s, 'left'); assert(s.left);
s = reduce(s, 'right'); const m = reduce(s, 'mapOnly'); assert(!m.left && !m.right && !m.table && m.prev.left && !m.prev.right); // remembers what was visible
const back = reduce(m, 'mapOnly'); assert(back.left && !back.right && back.table && back.prev === null); // restores the same layout
assert(reduce(reduce(defaultState(), 'left'), 'left').left); const none = { left: false, right: false, table: false, prev: null }; assert(reduce(none, 'mapOnly').left); // nothing remembered: show all
const store = {}, fake = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }; saveState(fake, { left: false, right: true, table: false }); assert.deepEqual(loadState(fake), { left: false, right: true, table: false, prev: null });
assert.deepEqual(loadState({ getItem: () => '{"left":1}' }), defaultState()); assert.deepEqual(loadState({ getItem: () => 'oops' }), defaultState()); assert.doesNotThrow(() => saveState({ setItem() { throw new Error('quota'); } }, defaultState()));
console.log('panels: all tests passed');
