import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const dir = import.meta.dirname; let fail = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.test.mjs')).sort()) { const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' }), out = (r.stdout + r.stderr).trim();
  const tag = r.status !== 0 ? 'FAIL' : /SKIPPED/.test(out) ? 'PASS (some SKIPPED)' : 'PASS'; if (r.status !== 0) fail++; console.log(`${tag.padEnd(20)} ${f}${r.status !== 0 ? '\n' + out.split('\n').slice(0, 8).join('\n') : ''}`); }
console.log(fail ? `${fail} test file(s) failed` : 'All test files passed (skips are listed above)'); process.exit(fail ? 1 : 0);
