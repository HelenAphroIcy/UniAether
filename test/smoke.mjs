// node test/smoke.mjs — loads the built library in Node (data and faces) and, if Playwright is installed, renders a few crystals in Chromium.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url), root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assert = (c, m) => { if (!c) { console.error('✗', m); process.exit(1); } console.log('✓', m); };

const UA = require(join(root, 'dist/uniaether.cjs'));
const M = UA.minerals();
assert(M.length === 26, '26 minerals');
assert(M.reduce((n, m) => n + m.colours.length, 0) === 228, '228 colours');
assert(M.every(m => UA.sources(m.id).length > 0), 'every mineral has sources');
assert(UA.shapes.prism(6).length <= 18 && UA.shapes.bipyramid(9).length <= 18, 'shapes fit in 18 faces');
assert(UA.crystal({ shape: 'prism', colour: '#5fe6ff' }).cluster.length === 1, 'a custom crystal builds');

let chromium; try { ({ chromium } = require('playwright')); } catch { console.log('· Playwright not installed: skipping the browser part'); process.exit(0); }
const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
await p.setContent(`<div id="a" style="width:220px"></div><script>${require('node:fs').readFileSync(join(root, 'dist/uniaether.js'), 'utf8')}</script>`);
const r = await p.evaluate(async () => {
  const s = UniAether.create('#a', { mineral: 'fluorite', autoplay: false, quality: .25 }); if (!s) return { gl: false };
  const out = []; for (const o of [{ mineral: 'beryl', colour: 'aqua' }, { light: 'uv', mineral: 'fluorite', colour: 'emerald' }, { grade: 'D' }, { crystal: { shape: 'bipyramid', n: 7, colour: '#ff7bd5' } }]) { s.set(o); s.render(); out.push(s.snapshot().length > 1000); }
  const sh = await UniAether.sprites({ mineral: 'spinel', frames: 2, size: 32, background: 'none' });
  return { gl: true, out, sheet: Object.keys(sh.json.frames).length };
});
await b.close();
if (!r.gl) { console.log('· no WebGL2 in this Chromium: skipping'); process.exit(0); }
assert(r.out.every(Boolean) && r.sheet === 2 && !errs.length, 'renders, switches and exports a sprite sheet' + (errs.length ? ' — ' + errs.join('; ') : ''));
