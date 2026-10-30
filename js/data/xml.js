// Minimal XML reader for KML/GPX. No DTD/entity expansion (custom entities are rejected), no namespaces (prefixes are stripped).
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const dec = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? m));
export function parseXML(text) {
  if (/<!ENTITY/i.test(text)) throw new Error('DTD entities are not supported');
  const root = { name: '#root', attrs: {}, children: [], text: '' }, stack = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g; let m;
  while ((m = re.exec(text.replace(/^\uFEFF/, '')))) { const top = stack.at(-1);
    if (m[1] !== undefined) top.text += m[1];
    else if (m[3] !== undefined) { const name = m[3].split(':').pop();
      if (m[2]) { if (stack.length < 2 || top.name !== name) throw new Error(`Unexpected closing tag </${name}>`); stack.pop(); }
      else { const attrs = {}; for (const a of m[4].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1].split(':').pop()] = dec(a[2] ?? a[3]);
        const n = { name, attrs, children: [], text: '' }; top.children.push(n); if (!m[5]) stack.push(n); } }
    else if (m[6] !== undefined) top.text += dec(m[6]); }
  if (stack.length > 1) throw new Error(`Unclosed tag <${stack.at(-1).name}>`); return root; }
export const findAll = (n, name, out = []) => { n.children.forEach(c => { if (c.name === name) out.push(c); findAll(c, name, out); }); return out; };
export const find = (n, name) => findAll(n, name)[0];
export const child = (n, name) => n.children.find(c => c.name === name);
