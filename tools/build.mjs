// node tools/build.mjs — joins src/ into dist/uniaether.js (script tag / CommonJS) and dist/uniaether.mjs (ES module).
// No dependencies. The order matters: helpers → faces → colour → data → shader → renderer → public API.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const parts = ['core/math.js', 'core/forms.js', 'core/colour.js', 'data/fluorite.js', 'data/minerals.js', 'data/sources.js', 'core/shader.js', 'core/renderer.js', 'api.js'];
const body = parts.map(p => `// ===== src/${p} =====\n` + readFileSync(join(root, 'src', p), 'utf8').trimEnd()).join('\n\n');
const banner = `/*! UniAether v${pkg.version} · crystals computed from mineralogy and optics · Helen AphroIcy · aphrogenes.com\n *  Code: MIT. Mineral data (src/data): CC BY-NC 4.0. The names UniAether, ISARO, Fufu and their marks are not licensed. See LICENSE, LICENSE-DATA.md, NOTICE. */\n`;
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/uniaether.js'), banner + `(function (root, factory) { const UA = factory(); if (typeof module === 'object' && module.exports) module.exports = UA; else root.UniAether = UA; })(typeof self !== 'undefined' ? self : this, function () {\n'use strict';\n${body}\nreturn UniAether;\n});\n`);
writeFileSync(join(root, 'dist/uniaether.cjs'), readFileSync(join(root, 'dist/uniaether.js')));
writeFileSync(join(root, 'dist/uniaether.mjs'), banner + `const UniAether = (() => {\n'use strict';\n${body}\nreturn UniAether;\n})();\nexport default UniAether;\nexport const { create, sprites, texture, crystal, minerals, sources, shapes } = UniAether;\n`);
console.log('built', pkg.version, (body.length / 1024).toFixed(0) + ' KB of source');
