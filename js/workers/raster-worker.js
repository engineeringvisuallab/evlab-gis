import { OPS } from '../raster/terrain.js';
self.onmessage = e => { const { id, op, grid } = e.data; try { const out = OPS[op](grid); self.postMessage({ id, out }, [out.buffer]); } catch (err) { self.postMessage({ id, error: err.message }); } };
