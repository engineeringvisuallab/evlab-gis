// Catches broken relative imports, missing named exports, bad element ids and root-absolute paths (GitHub Pages serves from /evlab-gis/).
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..'), rd = p => fs.readFileSync(p, 'utf8'), errs = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const files = walk(path.join(root, 'js')).filter(f => f.endsWith('.js')), exp = {};
for (const f of files) { const t = rd(f), s = new Set(); for (const m of t.matchAll(/export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([\w$]+)/g)) s.add(m[1]);
  for (const m of t.matchAll(/export\s*\{([^}]*)\}/g)) m[1].split(',').forEach(x => s.add(x.trim().split(/\s+as\s+/).pop())); exp[f] = s; }
for (const f of files) for (const m of rd(f).matchAll(/import\s+(?:\{([^}]*)\}|\*\s+as\s+[\w$]+)\s+from\s+'(\.[^']+)'/g)) { const tgt = path.resolve(path.dirname(f), m[2]);
  if (!fs.existsSync(tgt)) { errs.push(`${path.relative(root, f)}: missing module ${m[2]}`); continue; }
  (m[1] || '').split(',').map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach(n => { if (!exp[tgt].has(n)) errs.push(`${path.relative(root, f)}: ${m[2]} does not export ${n}`); }); }
for (const f of files) for (const m of rd(f).matchAll(/new URL\('([^']+)',\s*import\.meta\.url\)/g)) if (!fs.existsSync(path.resolve(path.dirname(f), m[1]))) errs.push(`${path.relative(root, f)}: missing ${m[1]}`);
const html = rd(path.join(root, 'index.html')), app = rd(path.join(root, 'js/app.js'));
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) { const u = m[1]; if (/^https?:\/\//.test(u)) continue; if (u.startsWith('/')) errs.push(`index.html: root-absolute path ${u}`); else if (!fs.existsSync(path.join(root, u))) errs.push(`index.html: missing ${u}`); }
for (const f of [...files, ...walk(path.join(root, 'css'))]) if (/(?:from\s+|import\s+|src=|url\()\s*['"]?\/(?!\/)/.test(rd(f))) errs.push(`${path.relative(root, f)}: root-absolute path`);
for (const m of app.matchAll(/\$\('([\w-]+)'\)/g)) if (!html.includes(`id="${m[1]}"`) && !app.includes(`id="${m[1]}"`)) errs.push(`app.js: element #${m[1]} not found in index.html`);
assert.deepEqual(errs, [], errs.join('\n')); console.log(`static: ${files.length} modules checked, imports/exports/ids/paths OK`);
