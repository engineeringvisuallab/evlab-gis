const undo = [], redo = [], MAX = 100;
export const canUndo = () => undo.length > 0, canRedo = () => redo.length > 0;
export const clear = () => { undo.length = 0; redo.length = 0; };
/** Runs a command {label, do, undo}; a command that returns false (for example its layer is gone) is ignored. */
export function run(cmd) { if (cmd.do() === false) return false; undo.push(cmd); redo.length = 0; if (undo.length > MAX) undo.shift(); return true; }
export function undoLast() { const c = undo.pop(); if (!c) return null; if (c.undo() === false) return `${c.label} (skipped: layer no longer exists)`; redo.push(c); return c.label; }
export function redoLast() { const c = redo.pop(); if (!c) return null; if (c.do() === false) return `${c.label} (skipped: layer no longer exists)`; undo.push(c); return c.label; }
