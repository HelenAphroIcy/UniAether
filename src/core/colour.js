// UniAether · core/colour.js — the colour engine: a colour is written as how it looks, how it is layered, how rare it is and whether it glows;
// absorption, environment, rim and fluorescence are worked out from that.
const _lin = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); };
// 从「透过一块中等厚的石头看到的颜色」反推每走一单位吃掉多少红、绿、蓝
const absorb = (hex, depth = 1) => _lin(hex).map(t => Math.min(3.2, -Math.log(Math.max(.03, t)) / 1.9 * depth));
const _hsl = hex => { const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; };
const _rgb = (h, s, l) => { const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; };
const _mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const _hue = (h, to, t, cap = .075) => { let d = ((to - h + 1.5) % 1) - .5; return (h + Math.max(-cap, Math.min(cap, d * t)) + 1) % 1; };   // 色相沿最短的方向转，最多转 27°
// 藏色：像印象派的阴影里藏着紫、亮处藏着桃色。一块石头配四种不挨着它的颜色——补色、两个三分色、一束光（冷的石头配暖光，暖的配冷光）
function hidOf(h, s) { const S = Math.max(.32, Math.min(.5, s * .6)), warm = h < .2 || h > .85; return [_rgb((h + .5) % 1, S, .74), _rgb((h + .33) % 1, S, .76), _rgb((h + .67) % 1, S, .76), warm ? _rgb(.5, S * .9, .8) : _rgb(.09, S, .8)]; }
// 一个颜色当成乘数：只取它的色相，按 k 的力度往 1 两边拉开，再整体乘 base
const _tint = (rgb, k, base = 1) => { const m = (rgb[0] + rgb[1] + rgb[2]) / 3 || 1; return rgb.map(v => Math.max(.35, Math.min(1.8, base * (1 + k * (v / m - 1))))); };
const _hex = rgb => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
// 像素宝石的色阶：同一种颜色，亮的地方往暖（黄）转一点、浅一点，暗的地方往冷（蓝紫）转一点、浓一点
const coolOf = h => h > .02 && h < .22 ? h + .012 : .7;   // 往冷的方向：别的颜色往蓝紫走；黄、橙黄留在自己的色相上（往蓝紫走会经过橙红，往绿走又发青）
function ramp(hex) { const [h, s, l] = _hsl(hex); if (s < .12) return [hex, hex, hex]; return [_hex(_rgb(_hue(h, .14, .1), s * .92, Math.min(.95, l + .07))), hex, _hex(_rgb(_hue(h, coolOf(h), .09), Math.min(1, s * 1.08), Math.max(.06, l - .06)))]; }
// 一种颜色怎么分层（对应七层：心、心外细线、中层、中层细线、外层、皮、最外细线）
const ZONES = {
  even: (a, b, k, r) => [r[0], k(a, .15), a, k(a, .1), a, r[2], k(r[2], .16)],             // 一整块，但心偏暖、皮偏冷
  heart: (a, b, k) => [k(a, .12), k(a, .05), a, k(a, .2), a, k(a, 1.05), k(a, .3)],        // 心里一团白雾
  core: (a, b, k) => [b, k(b, .4), a, k(a, .3), a, a, k(a, .4)],                           // 心里包着另一种颜色的幻影
  rim: (a, b, k) => [a, k(a, .3), a, k(a, .1), a, b, k(b, 1.5)],                           // 角和棱上另一种颜色
  band: (a, b, k) => [a, k(b, .8), a, k(b, .7), [.01, .01, .008], b, k(b, 1.4)],            // 一层层：心一种色，中间无色，皮另一种色
  melon: (a, b, k) => [a, k(a, .25), a, [.012, .01, .012], k(b, .7), k(b, 1.5), k(b, 2.2)],             // 西瓜：一整块是主色，靠外一道近乎无色的细线，最外一层薄薄的、浓的另一种颜色（皮）
};
const RARITY = { common: { w: 10, zh: '常见', en: 'common' }, uncommon: { w: 5, zh: '少见', en: 'uncommon' }, rare: { w: 2, zh: '稀有', en: 'rare' }, mythic: { w: .6, zh: '极稀有', en: 'very rare' } };
function fluoUV(hex) {   // 发什么色的光：纸上那圈、晶体里由深到亮的三档
  if (!hex) return { uva: [.05, .05, .09], uvb: [.07, .07, .12], uvc: [.1, .1, .15], uvg: [.03, .03, .05], uvh: [.03, .03, .05], uv: false };
  const c = _lin(hex).map(v => Math.pow(v, .6)); return { uva: c.map(v => v * .45), uvb: c, uvc: _mix(c, [1, 1, 1], .65), uvg: c.map(v => v * .55), uvh: c.map(v => v * .6), uv: true };
}
// phantom：幻影和生长线的满分（S 级）；小游戏里按品相乘：S 1、A .55、B 以下没有
function colorize(min, col, ci = 0) {
  if (col.raw) return { ...col.raw, id: col.id };                                          // 原样保留的（萤石第八版）
  const k = (v, f) => v.map(x => x * f), a = absorb(col.hex, col.depth || 1), b = col.hex2 ? absorb(col.hex2, col.depth || 1) : a;
  const rr = ramp(col.hex).map(x => absorb(x, col.depth || 1)), soft = v => { const m = (v[0] + v[1] + v[2]) / 3; return v.map(x => x + (m - x) * .2); };
  // 沿长轴分段：bands 是从下到上的颜色（双色、三色、彩虹），2 到 7 个，平均分成七段
  const B = col.bands ? Array.from({ length: 7 }, (_, i) => absorb(col.bands[Math.floor(i * col.bands.length / 7)], col.depth || 1.25)) : null, pal = (B || ZONES[col.zone || 'even'](a, b, k, rr)).map(soft).flat();   // 色带最多七段，从下到上；不够七个就按比例拉长
  const [h, s, l] = _hsl(col.hex), neutral = !!col.bands || (col.pl || 0) > .8 || s < .12 || l > .93 || l < .14;   // 分段的石头不用单一颜色的环境色：让每一段自己的颜色说话
  const acc = neutral ? { deepL: [.3, .31, .42], midL: [.5, .52, .64], deepC: [.4, .41, .55], glowC: [.94, .95, 1], back: [.76, .78, .86], loT: [.94, .96, 1.04], hiT: [1.03, 1.02, .98], rimB: [1.2, 1.18, 1.14], hid: [_rgb(.08, .5, .8), _rgb(.48, .4, .8), _rgb(.75, .4, .82), _rgb(.92, .4, .84)], hidA: .14 }
    : { deepL: _rgb(_hue(h, coolOf(h), .15), Math.min(s, .5) * .8, .3), midL: _rgb(h, Math.min(s, .6) * .7, .52), deepC: _rgb(_hue(h, coolOf(h), .1), Math.min(s, .7), .38), glowC: _rgb(_hue(h, .14, .12), s * .5, .9), back: _rgb(_hue(h, coolOf(h), .3), Math.min(.6, s * .7), .7),   // 隔着正面看到的、背光的背面：同一个颜色往蓝紫偏、更深
        loT: _tint(_rgb(_hue(h, coolOf(h), .3), Math.min(.8, s), .5), .18, .93), hiT: _tint(_rgb(_hue(h, .14, .32), s * .7, .62), .12),
        rimB: _tint(hidOf(h, s)[3], .22, 1.18), hid: hidOf(h, s), hidA: .36,   // 里面受光的背面：第二种颜色，红的偏橙金，蓝的偏青
        env: [_rgb(_hue(h, coolOf(h), .35), Math.max(.22, Math.min(.42, s * .55)), .46), _rgb(h, Math.max(.2, Math.min(.5, s * .5)), .82), _rgb((h + .5) % 1, .42, .88), _rgb(_hue(h, .14, .4), .5, .9)] };   // 环境色：深处偏冷的同色、自己的浅色、一道淡的补色、偏暖的高光
  if (col.bands || (col.pl || 0) > .8) Object.assign(acc, { back: [.9, .89, .9], deepL: [.42, .41, .45], midL: [.64, .63, .67], deepC: [.54, .52, .58], hidA: .2, env: [[.6, .61, .66], [.92, .9, .92], [.96, .92, .88], [.88, .94, .95]] });   // 分段的：背面和暗处只留一点点冷，别把各段颜色蒙上一层灰紫
  const forms = min.clusters[col.habit || min.habit || 'main'] || min.clusters.main, cluster = forms[ci % forms.length]();
  const zAx = col.bands ? 1 : (col.axial ?? min.axial ?? 0), glow = col.glow ? { glowCol: _lin(col.glow).map(v => Math.min(1, v * 1.15)), glowK: col.glowK ?? .8 } : {};
  return { id: col.id, ...min.optics, ...(col.optics || {}), ...acc, ...fluoUV(col.uv), zAx, band: col.bands ? 1 : 0, chord: col.chord ?? (col.zone === 'melon' ? .85 : 0), inner: (col.optics || {}).inner ?? min.optics.inner ?? 0, ast: col.ast || 0, pl: col.pl || 0, spk: col.spk ? col.spk.k : 0, spkCol: col.spk ? [1, 3, 5].map(i => parseInt(col.spk.c.slice(i, i + 2), 16) / 255) : undefined, plAx: col.plAx ? col.plAx.map(x => absorb(x, col.depth || 1)) : undefined, phantom: col.phantom ?? min.optics.phantom ?? 1, ior: (col.optics || {}).ior ?? min.optics.ior ?? 1.55, ...(col.bands ? { var: Math.min(.06, (col.optics || {}).var ?? min.optics.var) } : {}), axR: min.axR, ...glow, ...(min.optics.lab ? { cleave: 0, lab: col.labK ?? 1, labN: min.labN, labX: [col.labW ?? min.optics.labW ?? 0, col.labS ?? min.optics.labS ?? 0, col.labZ ?? min.optics.labZ ?? 0] } : {}), vein: col.vein ? col.vein.k : 0, veinM: col.vein ? (col.vein.m || 0) : 0, veinCol: col.vein ? [1, 3, 5].map(i => parseInt((col.vein.c || '#2a2228').slice(i, i + 2), 16) / 255) : undefined, ...(col.film ? { filmK: col.film.k, filmH: col.film.h, filmR: col.film.r, cOff: col.film.off ?? min.optics.cOff, filmW: col.film.w ?? min.optics.filmW } : {}), pal, cluster };
}
const swatchOf = col => { if (col.sw) return col.sw; if (col.hex2) return col.zone === 'core' ? [col.hex2, col.hex] : [col.hex, col.hex2];   // 两种颜色的：色块从心到边是这两种颜色（幻影的，心是第二种）
  const [h, s, l] = _hsl(col.hex); return [s < .12 ? '#ffffff' : 'hsl(' + Math.round(h * 360) + ' ' + Math.round(s * 70) + '% 92%)', col.hex]; };
function drawColor(min, rnd = Math.random) { const tot = min.colors.reduce((n, c) => n + RARITY[c.rarity].w, 0); let r = rnd() * tot; for (const c of min.colors) { r -= RARITY[c.rarity].w; if (r <= 0) return c; } return min.colors[0]; }
const chanceOf = (min, col) => RARITY[col.rarity].w / min.colors.reduce((n, c) => n + RARITY[c.rarity].w, 0);
