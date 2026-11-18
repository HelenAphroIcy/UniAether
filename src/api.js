// UniAether · api.js — the public side: create(), <uni-aether>, sprite sheets for game engines, live textures, custom crystals.

const VERSION = '0.1.0';
// 品相：D 矿料 → S 博物馆级。雾、通透、星闪、污渍、幻影（和 ISARO、矿晶集同一套）
const GRADES = { D: { frost: .62, clear: .45, glint: 0, stain: 1, ph: 0 }, C: { frost: .4, clear: .65, glint: .35, stain: .5, ph: 0 }, B: { frost: .18, clear: .84, glint: .85, stain: .12, ph: 0 }, A: { frost: .08, clear: .9, glint: 1.1, stain: 0, ph: .55 }, S: { frost: .04, clear: .96, glint: 1.6, stain: 0, ph: 1 } };
const LIGHTS = ['day', 'uv', 'lamp'], BACKGROUNDS = ['paper'];
const clamp01 = x => Math.max(0, Math.min(1, x));
const hasUV = col => !!(col.raw ? col.raw.uv : col.uv);
const lampOf = col => ({ ...col, hex: col.inc.hex, ...(col.inc.plAx ? { plAx: col.inc.plAx } : {}), ...(col.inc.depth ? { depth: col.inc.depth } : {}) });

// —— 形状：给自己造晶体用。每个返回一组面（最多 18 个），c 轴朝上 ——
const SPHERE = Object.assign([], { sphere: true });   // 一个球：没有晶面的那种
const SHAPES = {
  sphere: () => SPHERE,
  cube: () => habit(.93, 0, 0), octahedron: () => habit(0, .62, 0), dodecahedron: () => habit(0, 0, .7), cuboctahedron: () => habit(.93, .62, 0),
  spinelTwin: () => macleHalves(.55).up, quartz: () => QTZ(), beryl: () => BERYL(), tourmaline: () => TOUR(), apatite: () => APAT(), zircon: () => ZIRC(), topaz: () => TOPAZ(),
  barrel: () => BARREL(), blade: () => BLADE(), tabular: () => WULF(), block: () => TBLK(),
  // n 面柱，两头各一个 n 面锥（n 最多 6）。length：柱有多长；width：多粗；tip：锥有多尖（0 平，1 很尖）
  prism: (n = 6, { length = 1.1, width = .45, tip = .65, flat = false } = {}) => { n = Math.max(3, Math.min(6, n | 0)); const el = .25 + 1.1 * clamp01(tip), d = width * Math.cos(el) + length * Math.sin(el);
    return flat ? [...RING(n, width, 0, 0), ...CAP(length), ...CAP(length, -1)] : [...RING(n, width, 0, 0), ...RING(n, d, el, 0), ...RING(n, d, -el, 0)]; },
  // 双锥：没有柱面，只有上下两个 n 面锥（n 最多 9）
  bipyramid: (n = 6, { width = .7, tip = .55 } = {}) => { n = Math.max(3, Math.min(9, n | 0)); const el = .25 + 1.1 * clamp01(tip); return [...RING(n, width, el, 0), ...RING(n, width, -el, Math.PI / n)]; },
};

// —— 自己造一块（星际、科幻、虚构的矿物都行）：形状可以是虚构的，光学照真的算 ——
function crystal(c = {}) {
  const pieces = (c.forms && c.forms.length ? c.forms : [{}]).slice(0, 5).map((f, i) => {
    const sh = typeof f.shape === 'function' ? f.shape() : Array.isArray(f.faces) ? f.faces : SHAPES[f.shape || c.shape || 'quartz'](f.n, f.params || {});
    const turn = f.turn || [i * 1.3 + .4, .25, i * .7 + .3];
    return { R: tilt(turn[0], turn[1], turn[2]), t: add(C0, f.at || (i ? [Math.cos(i * 2.3) * .9, -.55, Math.sin(i * 2.3) * .5] : [0, 0, 0])), s: f.size ?? (i ? .55 : 1.3), form: sh.sphere ? sh : sh.slice(0, 18) };
  });
  const optics = { ior: c.ior ?? 1.55, inner: c.inner ?? .75, frost: c.frost ?? .05, soft: .03, var: c.variation ?? .12, clear: c.clarity ?? .95, terr: c.terraces ?? .2, step: 7, cleave: c.cleavage ?? 0, lus: c.lustre ?? 1.1, disp: c.dispersion ?? 1, ...(c.iridescence ? { lab: true } : {}) };
  const min = { en: c.name || 'Custom', zh: c.name || '自定义', optics, axial: c.axial ?? 0, axR: [-1.3, 1.7, 0], labN: c.iridescenceAxis || [.15, 1, -.1], clusters: { main: [() => pieces] }, colors: [] };
  const col = { id: 'custom', hex: c.colour || c.color || '#9b8cff', hex2: c.colour2 || c.color2, zone: c.zone || (c.colour2 || c.color2 ? 'rim' : 'even'), bands: c.bands, depth: c.depth, rarity: 'common',
    glow: c.glow, glowK: c.glowStrength, uv: c.fluorescence, ast: c.asterism, phantom: c.phantom ?? 0,
    ...(c.iridescence ? { labK: c.iridescence, film: { k: 0, h: c.iridescenceHue ?? .55, r: c.iridescenceSpread ?? .6 } } : {}),
    ...(c.sparkle ? { spk: { k: c.sparkle, c: c.sparkleColour || c.sparkleColor || '#ffd9a8' } } : {}) };
  const ore = colorize(min, col, 0);
  return ore;
}

// 按名字找矿物和颜色：颜色可以是 id（'emerald'）、序号，或者不写（第一种）
function pick(o) {   // 写错了名字不让页面空着：提醒一句，用第一种
  let min = MINERALS[o.mineral || 'fluorite']; if (!min) { console.warn(`[UniAether] unknown mineral "${o.mineral}", showing fluorite. See UniAether.minerals().`); min = MINERALS.fluorite; }
  const cs = min.colors, c = o.colour ?? o.color; let col = typeof c === 'number' ? cs[((c % cs.length) + cs.length) % cs.length] : (c ? cs.find(x => x.id === c) : cs[0]);
  if (!col) { console.warn(`[UniAether] "${o.mineral}" has no colour "${c}", showing "${cs[0].id}". Colours: ${cs.map(x => x.id).join(', ')}`); col = cs[0]; }
  return { min, col };
}
function oreFor(o) {
  if (o.crystal) return { ore: crystal(o.crystal), uv: !!o.crystal.fluorescence, lamp: false };
  const { min, col } = pick(o), lamp = o.light === 'lamp' && !!col.inc, ore = colorize(min, lamp ? lampOf(col) : col, o.form || 0);
  if (o.sphere) { ore.cluster = [{ R: tilt(.3, .25, .1), t: add(C0, [0, -.05, 0]), s: typeof o.sphere === 'number' ? o.sphere : 1.25, form: SPHERE }]; ore.inner = 0; }   // 磨圆的矿石球：同一种矿物、同一种颜色和色带，形状换成球
  return { ore, uv: hasUV(col), lamp: !!col.inc };
}
function lookFor(o, ore) {   // 品相加在这块矿物、这个颜色自己的雾和通透上
  const g = GRADES[o.grade], k = { warm: o.light === 'lamp' ? 1 : 0, projection: o.projection !== false };
  if (!g) return { ...k, frost: ore.frost, clear: ore.clear, phantom: ore.phantom || 0, glint: 1, stain: 0 };
  return { ...k, frost: clamp01((ore.frost ?? .1) + g.frost - .1), clear: clamp01((ore.clear ?? .9) + g.clear - .9), phantom: (ore.phantom || 0) * g.ph, glint: g.glint, stain: g.stain };
}

const DEFAULTS = { mineral: 'fluorite', colour: undefined, form: 0, sphere: false, grade: null, light: 'day', background: 'paper', projection: true, interactive: true, autoplay: true, sound: false, quality: undefined, transparent: false, sway: true, motion: 'auto' };

// —— 主入口：放进一个元素里，返回能改、能截图、能销毁的那一块 ——
function create(el, options = {}) {
  if (typeof el === 'string') el = document.querySelector(el);
  if (!el) throw new Error('[UniAether] create(element, options): element not found');
  let o = { ...DEFAULTS, ...options }; if (o.color !== undefined && o.colour === undefined) o.colour = o.color;
  const listeners = {}; const emit = (ev, d) => (listeners[ev] || []).forEach(fn => { try { fn(d); } catch (e) { console.error(e); } });
  let state = oreFor(o);
  el.classList.add('uniaether'); if (!el.style.position && getComputedStyle(el).position === 'static') el.style.position = 'relative';
  const view = mount(el, { ore: state.ore, interactive: o.interactive, autoplay: o.autoplay, sound: o.sound, quality: o.quality, transparent: o.transparent, sway: o.sway, motion: o.motion, canvas: o.canvas, observe: o.observe, yaw: o.yaw, pitch: o.pitch, projection: o.projection, onlost: () => emit('lost') });
  if (!view) { el.classList.add('uniaether-nogl'); emit('unsupported'); return null; }
  const cv = view.canvas; if (!o.canvas) Object.assign(cv.style, { display: 'block', width: '100%', height: 'auto', aspectRatio: '880 / 1040' });
  const apply = () => { view.setLook(lookFor(o, state.ore)); view.uvT = o.light === 'uv' && state.uv ? 1 : 0; if (o.autoplay === false) view.uv = view.uvT; };
  apply();
  const api = {
    canvas: cv, view, version: VERSION,
    get options() { return { ...o }; },
    get supports() { return { uv: state.uv, lamp: state.lamp }; },
    set(next = {}) {   // 换矿物、颜色、品相、灯、背景……只重算需要重算的
      const prev = o; o = { ...o, ...next }; if (next.color !== undefined && next.colour === undefined) o.colour = next.color;
      if ('mineral' in next && !('colour' in next) && !('color' in next)) o.colour = undefined;   // 换了矿物没说颜色：用它的第一种
      const oreChanged = ['mineral', 'colour', 'form', 'crystal', 'sphere'].some(k => k in next) || ('light' in next && (next.light === 'lamp') !== (prev.light === 'lamp'));
      if (oreChanged) { state = oreFor(o); view.setOre(state.ore); }
      apply(); emit('change', { ...o }); return api; },
    turn(yaw = 0, pitch = 0) { view.yaw = yaw; view.pitch = pitch; view.vy = view.vp = 0; view.redraw(); return api; },
    spin(speed = .02) { view.vy = speed; view.redraw(); return api; },
    pose(p) { view.pose(p); return api; },
    grow() { view.regrow(); return api; },
    render(t) { view.renderFrame(t); return api; },
    play() { view.on = true; view.redraw(); return api; }, pause() { view.on = false; return api; },
    // 截图：crop 'frame' 是整个画面（880×1040 的比例），'square' 是石头那一块（矿晶集卡片的取景）
    snapshot({ crop = 'frame', size, type = 'image/png', quality = .92, canvas = false } = {}) {
      if (o.autoplay === false) view.renderFrame();
      const k = cv.width / SCENE_W, r = crop === 'square' ? CARD : [0, 0, SCENE_W, SCENE_H], w = size || Math.round(r[2] * k), h = Math.round(w * r[3] / r[2]);
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(cv, r[0] * k, r[1] * k, r[2] * k, r[3] * k, 0, 0, w, h);
      return canvas ? c : c.toDataURL(type, quality); },
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return api; },
    off(ev, fn) { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); return api; },
    destroy() { view.destroy(); el.classList.remove('uniaether'); emit('destroy'); },
  };
  return api;
}

// —— 给游戏引擎：一张转一圈的精灵图（PNG）加一份 JSON（TexturePacker 的 JSON Hash 格式：PixiJS、Phaser 直接认，Unity、Godot、GameMaker 有现成的导入插件）——
async function sprites(options = {}) {
  const o = { frames: 36, size: 256, crop: 'square', background: 'none', pitch: .08, columns: 0, name: '', ...options };
  const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-99999px;top:0;width:440px;pointer-events:none;';
  document.body.appendChild(holder);
  const transparent = o.background === 'none';
  const inst = create(holder, { ...o, background: transparent ? 'paper' : o.background, transparent, autoplay: false, interactive: false, sway: false, quality: o.quality || Math.max(.3, Math.min(2, o.size * 2 / (o.crop === 'square' ? 560 : 880))) });   // 画到两倍大再缩下来，边是顺的
  if (!inst) { holder.remove(); throw new Error('[UniAether] WebGL2 is not available'); }
  const n = Math.max(1, Math.min(240, o.frames | 0)), cols = o.columns || Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
  const r = o.crop === 'square' ? CARD : [0, 0, SCENE_W, SCENE_H], cw = o.size, ch = Math.round(o.size * r[3] / r[2]);
  const sheet = document.createElement('canvas'); sheet.width = cols * cw; sheet.height = rows * ch; const g = sheet.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const base = o.name || (o.crystal ? (o.crystal.name || 'crystal') : `${o.mineral || 'fluorite'}${o.colour !== undefined ? '-' + o.colour : ''}${o.grade ? '-' + o.grade : ''}`).toString().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  const uv = o.light === 'uv' && inst.supports.uv ? 1 : 0, frames = {}, names = [], cv = inst.canvas, k = cv.width / SCENE_W;
  for (let i = 0; i < n; i++) {
    inst.view.pose({ yaw: (o.yaw0 || 0) + i / n * Math.PI * 2, pitch: o.pitch, grow: 1, uv, t: 3 + i * (o.twinkle ? .08 : 0), flash: 0 }); inst.view.renderFrame();
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch; g.drawImage(cv, r[0] * k, r[1] * k, r[2] * k, r[3] * k, x, y, cw, ch);
    const nm = `${base}_${String(i).padStart(3, '0')}`; names.push(nm);
    frames[nm] = { frame: { x, y, w: cw, h: ch }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: cw, h: ch }, sourceSize: { w: cw, h: ch }, duration: Math.round(1000 / (o.fps || 24)) };
    if (i % 6 === 5) await new Promise(res => setTimeout(res, 0));   // 让页面喘口气
  }
  inst.destroy(); holder.remove();
  const json = { frames, animations: { turn: names }, meta: { app: 'UniAether', version: VERSION, image: `${base}.png`, format: 'RGBA8888', size: { w: sheet.width, h: sheet.height }, scale: '1',
    uniaether: { mineral: o.crystal ? null : (o.mineral || 'fluorite'), colour: o.colour ?? null, grade: o.grade || null, light: o.light || 'day', background: o.background, crop: o.crop, frames: n, credit: 'Crystals rendered with UniAether by Helen AphroIcy · aphrogenes.com' } } };
  return { canvas: sheet, json, name: base, png: () => new Promise(res => sheet.toBlob(res, 'image/png')) };
}

// —— 给 PixiJS / Phaser / Three.js 当实时贴图：一块不放进页面的画布，每帧更新 ——
function texture(options = {}) {
  const holder = document.createElement('div');
  const inst = create(holder, { interactive: false, observe: false, ...options });
  return inst;   // inst.canvas 交给引擎当贴图；每帧告诉引擎更新（Pixi: texture.source.update()，Three: texture.needsUpdate = true）
}

// —— 列表：矿物、颜色、出处（数据 CC BY-NC 4.0）——
function minerals() {
  return Object.entries(MINERALS).map(([id, m]) => ({ id, name: { en: m.en, zh: m.zh }, formula: m.formula, system: m.sys, mohs: m.mohs,
    colours: m.colors.map((c, i) => ({ id: c.id, index: i, name: { en: c.en, zh: c.zh }, hex: c.hex, swatch: swatchOf(c), rarity: c.rarity, chance: Math.round(chanceOf(m, c) * 1000) / 10, uv: hasUV(c), lamp: !!c.inc, where: c.where || null, cause: c.cause || null })) }));
}
const sources = id => id ? (SOURCES[id] || []) : SOURCES;

// —— <uni-aether mineral="fluorite" colour="emerald" grade="S" light="uv"> ——
if (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined' && !customElements.get('uni-aether')) {
  class UniAetherElement extends HTMLElement {
    static get observedAttributes() { return ['mineral', 'colour', 'color', 'form', 'sphere', 'grade', 'light', 'background', 'projection', 'interactive', 'yaw', 'pitch']; }
    connectedCallback() { if (!this.style.display) this.style.display = 'block'; if (!this.style.aspectRatio) this.style.aspectRatio = '880 / 1040';   // 先占好位置，画面晚一点再来：不挡着页面往下读
      const go = () => { if (!this.isConnected || this._ua) return; this._ua = create(this, this._opts()); if (!this._ua) this.textContent = this.getAttribute('fallback') || 'WebGL2 is needed to show this crystal.'; };
      UniAetherElement.queue = (UniAetherElement.queue || Promise.resolve()).then(() => new Promise(r => requestAnimationFrame(() => { go(); setTimeout(r, 30); }))); }
    disconnectedCallback() { if (this._ua) { this._ua.destroy(); this._ua = null; } }
    attributeChangedCallback() { if (this._ua) this._ua.set(this._opts()); }
    _opts() { const a = n => this.getAttribute(n), num = n => a(n) === null ? undefined : +a(n), col = a('colour') ?? a('color');
      return { mineral: a('mineral') || 'fluorite', colour: col === null ? undefined : (/^\d+$/.test(col) ? +col : col), form: num('form') || 0, sphere: a('sphere') !== null && a('sphere') !== 'false', grade: a('grade') || null, light: a('light') || 'day', background: a('background') || 'paper', projection: a('projection') !== 'false', interactive: a('interactive') !== 'false', yaw: num('yaw'), pitch: num('pitch') }; }
    get engine() { return this._ua; }
  }
  customElements.define('uni-aether', UniAetherElement);
}

const UniAether = { version: VERSION, create, sprites, texture, crystal, minerals, sources, shapes: SHAPES, grades: Object.keys(GRADES), lights: LIGHTS, backgrounds: BACKGROUNDS,
  credit: 'Crystals rendered with UniAether by Helen AphroIcy · aphrogenes.com', faces: { habit, corners } };
