// UniAether · core/renderer.js — one live crystal on one canvas.
// mount(stage, opts) draws `opts.ore` (a parameter set from colorize() or crystal()) and returns its view:
//   view.setOre(ore) · view.setLook({ warm, stain, glint, alpha }) · view.pose(frame) · view.renderFrame() · view.destroy()
// The scene is 880 × 1040 units; the stone sits around (384, 422), its projection falls on the ground below to the right.

// 生长的顺序：线 → 颜色从心里往外长（大的两颗先，小的三颗晚一点）→ 玻璃定下来 → 星闪。大小不变，变的是长到哪了
const GROW = [[.12, .68], [.12, .68], [.36, .76], [.42, .8], [.48, .84]], sm01 = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const stageOf = gt => ({ line: sm01(gt / .2), g: GROW.map(([a, b]) => sm01((gt - a) / (b - a))), set: sm01((gt - .7) / .26), proj: sm01((gt - .22) / .6) });
const SCENE_W = 880, SCENE_H = 1040, CARD = [104, 132, 560, 560];   // CARD：方形取景，矿晶集的卡片就是从这里裁的
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function mount(stage, opts = {}) {
  const motion = opts.motion || 'auto', still = motion === 'reduce' || (motion === 'auto' && reduce);
  const manual = opts.autoplay === false, interactive = opts.interactive !== false && !manual;
  const BASE = [], PLANES = new Float32Array(360);
  const buildBase = cluster => {
    const cl = cluster.slice(0, 5); BASE.length = 0;
    cl.forEach(c => { const sph = !!(c.form && c.form.sphere), f = sph ? [] : c.form.slice(0, 18); BASE.push({ R: c.R, rel: [c.t[0] - C0[0], c.t[1] - C0[1], c.t[2] - C0[2]], S: c.s, form: f, verts: sph ? [] : corners(f), sphere: sph }); });   // 球：没有晶面，着色器里按球算
    while (BASE.length < 5) BASE.push({ R: I3, rel: [0, 0, 0], S: 0, form: [], verts: [], sphere: false });
    PLANES.fill(0); for (let i = 0; i < 90; i++) PLANES[i * 4 + 3] = 1; BASE.forEach((c, i) => c.form.forEach((P, n) => { if (n < 18) PLANES.set(P, (i * 18 + n) * 4); }));
  };
  buildBase(opts.ore.cluster);
  const view = { yaw: opts.yaw || 0, pitch: opts.pitch || 0, vy: 0, grow: 1, growing: false,   // 一打开就是长好的；grow() 才从头长
    uv: 0, uvT: 0, q: opts.quality || 1, drag: null, on: true, frozen: null, slow: 0, sway: opts.sway !== false, glint: 1, noProj: opts.projection === false };
  // 哪几个顶点该闪：看得见、没埋在别的晶体里、朝着光和眼睛中间的那个方向；转过去就灭，慢慢地一呼一吸
  const VW = [0, SE, Math.cos(EL)], HV = norm([L[0] + VW[0], L[1] + VW[1], L[2] + VW[2]]), starI = new Float32Array(400), fStar = new Float32Array(32), fHue = new Float32Array(8);
  function pickStars(Rs, Ts, Ss, t, dt, uv, flash, set) {
    const cand = []; let idx = -1;
    for (let i = 0; i < 5; i++) { const s = Ss[i], R = Rs[i], B = BASE[i]; for (const vt of B.verts) { idx++; const v = vt.p; let target = 0; if (s < .1) { starI[idx] = 0; continue; }
      const pw = add(Ts[i], app(R, [v[0] * s, v[1] * s, v[2] * s])), dw = norm(app(R, v)); let vis = false;
      for (const fi of vt.f) if (dot(app(R, B.form[fi]), VW) > .08) vis = true;
      if (vis) { let dim = 1; for (let j = 0; j < 5 && dim > 0; j++) { if (j === i || Ss[j] < .05) continue; const Rt = tr(Rs[j]), lo = app(Rt, [pw[0] - Ts[j][0], pw[1] - Ts[j][1], pw[2] - Ts[j][2]]), ld = app(Rt, VW); let tn = -1e9, tf = 1e9, miss = false;
          if (BASE[j].sphere) { const b = dot(lo, ld), h = b * b - dot(lo, lo) + Ss[j] * Ss[j]; if (h < 0) miss = true; else { tn = -b - Math.sqrt(h); tf = -b + Math.sqrt(h); } }
          for (const P of BASE[j].form) { const dn = dot(P, ld), c = P[3] * Ss[j] - dot(P, lo); if (dn < -1e-9) tn = Math.max(tn, c / dn); else if (dn > 1e-9) tf = Math.min(tf, c / dn); else if (c < 0) miss = true; }
          if (!miss && tf > tn && tf > .03) dim = tn < -.03 ? 0 : dim * .5; }                                   // 埋在别的晶体里：不闪；被前面的晶体挡着：淡一半
        const spec = Math.pow(Math.max(0, dot(dw, HV)), 3.4), tw = still ? 1 : .6 + .4 * Math.sin(t * 1.9 + idx * 2.4);
        target = Math.min(1, (spec * 1.25 * view.glint * tw + flash * (.45 + .4 * ((idx * .618) % 1))) * dim) * (1 - uv) * set; }   // 只在日光下闪；紫外灯下它自己在发光，不加星
      starI[idx] = still ? target : starI[idx] + (target - starI[idx]) * Math.min(1, dt * 7);
      if (starI[idx] > .05) { const pv = app(RC, pw); cand.push([starI[idx], 384 + pv[0] * 142, 660 - pv[1] * 142, (20 + 34 * s) * (.8 + .5 * starI[idx]), (idx * .618) % 1]); } }
      if (B.sphere && s >= .1) { idx++; const pw = add(Ts[i], [HV[0] * s, HV[1] * s, HV[2] * s]), tw = still ? 1 : .7 + .3 * Math.sin(t * 1.3 + i);   // 球：只在高光那一点闪一颗
        const target = Math.min(1, (.95 * view.glint * tw + flash * .6)) * (1 - uv) * set; starI[idx] = still ? target : starI[idx] + (target - starI[idx]) * Math.min(1, dt * 7);
        if (starI[idx] > .05) { const pv = app(RC, pw); cand.push([starI[idx], 384 + pv[0] * 142, 660 - pv[1] * 142, (24 + 30 * s) * (.8 + .5 * starI[idx]), (i * .618) % 1]); } } }
    cand.sort((a, b) => b[0] - a[0]); fStar.fill(0);
    for (let k = 0, n = 0; k < cand.length && n < 5; k++) { let near = false; for (let q = 0; q < n; q++) if (Math.hypot(fStar[q * 4] - cand[k][1], fStar[q * 4 + 1] - cand[k][2]) < 46) near = true; if (near) continue;   // 挨得太近的顶点只亮一颗
      fStar[n * 4] = cand[k][1]; fStar[n * 4 + 1] = cand[k][2]; fStar[n * 4 + 2] = cand[k][3]; fStar[n * 4 + 3] = cand[k][0]; fHue[n] = cand[k][4]; n++; }
  }
  // 声音：默认不出声（opts.sound 打开）；长好的那一下是两声很轻的高音
  let AC = null; const soundOn = !!opts.sound;
  const unlock = () => { if (AC || !soundOn) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {} };
  const ping = (f, d, g, at = 0) => { if (!AC || !soundOn) return; try { if (AC.state === 'suspended') AC.resume(); const o = AC.createOscillator(), a = AC.createGain(), t = AC.currentTime + at; o.type = 'sine'; o.frequency.setValueAtTime(f, t); a.gain.setValueAtTime(.0001, t); a.gain.exponentialRampToValueAtTime(g, t + .01); a.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(a); a.connect(AC.destination); o.start(t); o.stop(t + d + .03); } catch (_) {} };

  const cv = opts.canvas || document.createElement('canvas'); if (!opts.canvas) { cv.className = 'ua-gl'; stage.appendChild(cv); }
  let gl = null; try { gl = cv.getContext('webgl2', { antialias: false, alpha: !!opts.transparent, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }); } catch (_) {}   // preserveDrawingBuffer：留住画好的那一帧，可以截图，静止时也不会空
  if (!gl) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[UniAether]', gl.getShaderInfoLog(s)); return null; } return s; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG); if (!vs || !fs) return null;
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn('[UniAether]', gl.getProgramInfoLog(pr)); return null; }
  gl.useProgram(pr); view.gl = gl; view.pr = pr; view.canvas = cv;
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const n of ['uRes', 'uQ', 'uTime', 'uUV', 'uR', 'uT', 'uS', 'uF', 'uL', 'uLF', 'uStar', 'uHue', 'uG', 'uLine', 'uSet', 'uProj', 'uWarm', 'uStain', 'uAlpha']) U[n] = gl.getUniformLocation(pr, n);
  gl.uniform3fv(U.uL, L); gl.uniform3fv(U.uLF, LF); gl.uniform1f(U.uAlpha, opts.transparent ? 1 : 0);
  const fR = new Float32Array(45), fT = new Float32Array(15), fS = new Float32Array(5), fG = new Float32Array(5);
  const size = q => { view.q = q; cv.width = Math.round(SCENE_W * q); cv.height = Math.round(SCENE_H * q); gl.viewport(0, 0, cv.width, cv.height); };
  size(view.q);
  let last = 0, rq = 0, dead = false;
  const req = () => { if (!rq && !manual && !dead) rq = requestAnimationFrame(n => { rq = 0; frame(n); }); };
  const frame = now => {
    if (dead) return;
    if (!still && !view.frozen) req();
    if (!view.on && !view.frozen) { last = 0; return; }
    const f = view.frozen, dt = last ? Math.min(.05, (now - last) / 1000) : .016, t = f ? f.t : now / 1000;
    if (last && !f && !opts.quality) { view.slow = view.slow * .9 + (now - last > 36 ? 1 : 0) * .1; if (view.slow > .7 && view.q > .5) { size(view.q - .25); view.slow = 0; } } last = now;   // 太慢就降一档清晰度（指定了 quality 就不动）
    if (!f) { if (view.growing) { const g0 = view.grow, g1 = view.grow = Math.min(1, g0 + dt / 4.8), hit = x => g0 < x && g1 >= x; if (hit(.12)) ping(440, .2, .045); GROW.forEach(([a], i) => { if (i > 1 && hit(a)) ping(520 + i * 40, .16, .045); }); if (hit(.7)) ping(880, .22, .04);
        if (g1 >= 1) { view.growing = false; view.flash = 1; ping(2093, .7, .045); ping(2637, .9, .035, .07); } }
      view.flash = (view.flash || 0) * Math.exp(-dt * 1.9);
      if (!view.drag) { const k = dt * 60; view.yaw += view.vy * k; view.vy *= Math.pow(.93, k); view.pitch = Math.max(-.55, Math.min(.7, view.pitch + (view.vp || 0) * .6 * k)); view.vp = (view.vp || 0) * Math.pow(.84, k); }   // 松手以后带一点惯性，按时间算，帧率高低都一样
      view.uv += (view.uvT - view.uv) * Math.min(1, dt * 3.4); }
    const sway = view.sway && !still, yaw = (f ? f.yaw : view.yaw + (sway ? .2 * Math.sin(t * .33) : 0)), pitch = (f ? f.pitch : view.pitch + (sway ? .04 * Math.sin(t * .27) : 0)), st = stageOf(f ? f.grow : view.grow), Ru = mul(rotY(yaw), rotX(pitch));
    const Rs = [], Ts = []; BASE.forEach((c, i) => { const R = mul(Ru, c.R), p = add(C0, app(Ru, c.rel)); Rs.push(R); Ts.push(p); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) fR[i * 9 + b * 3 + a] = R[a * 3 + b]; fT.set(p, i * 3); fG[i] = st.g[i]; });
    gl.useProgram(pr);
    pickStars(Rs, Ts, fS, t, f ? 1 : dt, f ? f.uv : view.uv, f ? (f.flash || 0) : (view.flash || 0), st.set); gl.uniform1fv(U.uG, fG); gl.uniform1f(U.uLine, st.line); gl.uniform1f(U.uSet, st.set); gl.uniform1f(U.uProj, view.noProj ? 0 : st.proj); gl.uniform4fv(U.uStar, fStar); gl.uniform1fv(U.uHue, fHue);
    gl.uniformMatrix3fv(U.uR, false, fR); gl.uniform3fv(U.uT, fT); gl.uniform1fv(U.uS, fS); gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform1f(U.uQ, view.q); gl.uniform1f(U.uTime, t); gl.uniform1f(U.uUV, f ? f.uv : view.uv);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (view.onframe) view.onframe(t);
  };
  const L_ = [];   // 挂上去的事件，destroy 时一起摘掉
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); L_.push([el, ev, fn, o]); };
  on(cv, 'webglcontextlost', e => { e.preventDefault(); dead = true; if (opts.onlost) opts.onlost(); });
  if (interactive) {
    // 转动：上下左右都能转。鼠标在画面上任何地方拖都行；手指要按在石头上拖才转，按在旁边的地上还是滚动页面
    const PMIN = -.55, PMAX = .7, grab = (x, y) => { view.drag = { x, y, yaw: view.yaw, pitch: view.pitch, lx: x, ly: y }; view.vy = view.vp = 0; unlock(); };
    const turn = (x, y) => { const g = view.drag; if (!g) return; view.vy = (x - g.lx) * .011; view.vp = (y - g.ly) * .008; g.lx = x; g.ly = y; view.yaw = g.yaw + (x - g.x) * .011; view.pitch = Math.max(PMIN, Math.min(PMAX, g.pitch + (y - g.y) * .008)); if (still) req(); };
    const onStone = (x, y) => { const r = cv.getBoundingClientRect(); return Math.hypot((x - r.left) / r.width * SCENE_W - 384, (y - r.top) / r.height * SCENE_H - 422) < 270; };
    on(cv, 'pointerdown', e => { if (e.pointerType === 'touch') return; grab(e.clientX, e.clientY); try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
    on(cv, 'pointermove', e => { if (e.pointerType !== 'touch') turn(e.clientX, e.clientY); });
    const up = e => { if (!e || e.pointerType !== 'touch') view.drag = null; }; on(cv, 'pointerup', up); on(cv, 'pointercancel', up);
    let finger = null; const mine = e => finger === null ? null : Array.prototype.find.call(e.changedTouches, q => q.identifier === finger);
    on(cv, 'touchstart', e => { const t = e.changedTouches[0]; if (finger !== null || !onStone(t.clientX, t.clientY)) return; e.preventDefault(); finger = t.identifier; grab(t.clientX, t.clientY); }, { passive: false });
    on(cv, 'touchmove', e => { const t = mine(e); if (!t) return; e.preventDefault(); turn(t.clientX, t.clientY); }, { passive: false });
    const lift = e => { if (mine(e)) { finger = null; view.drag = null; } }; on(cv, 'touchend', lift); on(cv, 'touchcancel', lift);
  }
  let io = null; if (!manual && stage && stage.isConnected && opts.observe !== false) { try { io = new IntersectionObserver(es => { view.on = es[0].isIntersecting; if (view.on) req(); }, { rootMargin: '60px' }); io.observe(stage); } catch (_) {} }   // 看不见的时候不画
  const vis = () => { last = 0; }; if (typeof document !== 'undefined') on(document, 'visibilitychange', vis);
  view.redraw = () => req(); view.size = size;
  view.pose = o => { view.frozen = o ? Object.assign({ yaw: 0, pitch: 0, grow: 1, uv: 0, t: 3 }, o) : null; if (o && o.q) size(o.q); last = 0; req(); };   // 定住一帧
  view.renderFrame = now => frame(now ?? (typeof performance !== 'undefined' ? performance.now() : Date.now()));   // 马上画一帧（导出精灵图、接游戏引擎时用）
  view.grow = 1; view.regrow = () => { view.grow = 0; view.growing = true; unlock(); req(); };
  const u1 = (n, v) => gl.uniform1f(gl.getUniformLocation(pr, n), v), u3 = (n, v) => gl.uniform3fv(gl.getUniformLocation(pr, n), new Float32Array(v));
  view.setLook = (k = {}) => {   // 背景、白炽灯、品相的污渍和星闪
    gl.useProgram(pr);
    if (k.warm !== undefined) gl.uniform1f(U.uWarm, k.warm);
    if (k.stain !== undefined) gl.uniform1f(U.uStain, k.stain);
    if (k.glint !== undefined) view.glint = k.glint;
    if (k.frost !== undefined) u1('uFrost', k.frost);
    if (k.clear !== undefined) u1('uClear', k.clear);
    if (k.phantom !== undefined) u1('uPh', k.phantom);
    if (k.projection !== undefined) view.noProj = !k.projection;
    req();
  };
  view.setOre = o => {   // 换一块矿石：晶体（最多五颗、每颗最多十八个面）和它的颜色、光泽、色散、解理、荧光
    buildBase(o.cluster);
    gl.useProgram(pr); gl.uniform4fv(gl.getUniformLocation(pr, 'uP'), PLANES); gl.uniform1fv(gl.getUniformLocation(pr, 'uK'), BASE.map(c => c.sphere ? 1 : 0)); fS.set(BASE.map(c => c.S)); gl.uniform1fv(U.uF, BASE.map(c => c.S || 1));
    gl.uniform3fv(gl.getUniformLocation(pr, 'uZ'), new Float32Array(o.pal));
    u1('uFrost', o.frost); u1('uSoft', o.soft); u1('uVar', o.var); u1('uClear', o.clear); u1('uTerr', o.terr); u1('uStep', o.step); u1('uCleave', o.cleave); u1('uLus', o.lus); u1('uDisp', o.disp);
    u3('uDeepL', o.deepL); u3('uMidL', o.midL); u3('uDeepC', o.deepC); u3('uGlowC', o.glowC); u3('uUVa', o.uva); u3('uUVb', o.uvb); u3('uUVc', o.uvc); u3('uUVg', o.uvg); u3('uUVh', o.uvh); u3('uBack', o.back || [.62, .63, .84]); const EV = o.env || [[.47, .48, .85], [.8, .74, .97], [1, .86, .89], [.8, .96, .94]]; u3('uEnv0', EV[0]); u3('uEnv1', EV[1]); u3('uEnv2', EV[2]); u3('uEnv3', EV[3]);   // 每个面映出来的环境，按这块石头的颜色配
    u3('uHiT', o.hiT || [1, 1, 1]); u3('uLoT', o.loT || [1, 1, 1]); u3('uRimB', o.rimB || [1.2, 1.2, 1.1]); u3('uHid[0]', (o.hid || [[1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]]).flat()); u1('uHidA', o.hidA || 0); u1('uFilmK', o.filmK || 0); u1('uFilmH', o.filmH || 0); u1('uFilmR', o.filmR ?? 1); u1('uCOff', o.cOff ?? 1); u1('uFilmW', o.filmW ?? 1); u1('uZAx', o.zAx || 0); u1('uBand', o.band || 0); u1('uChord', o.chord || 0); u1('uIn', o.inner || 0); u1('uIOR', o.ior || 1.55); u1('uPh', o.phantom || 0); u1('uAst', o.ast || 0); u1('uPl', o.pl || 0); const PL = o.plAx || [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; u3('uPlA', PL[0]); u3('uPlB', PL[1]); u3('uPlC', PL[2]); u3('uAxR', o.axR || [-1.3, 1.7, 0]); u1('uLab', o.lab || 0); u3('uLabN', norm(o.labN || [.15, 1, -.1])); u3('uGlowCol', o.glowCol || [0, 0, 0]); u1('uGlowK', o.glowK || 0); u1('uSpk', o.spk || 0); u3('uSpkCol', o.spkCol || [1, .4, .3]); u1('uVein', o.vein || 0); u1('uStri', o.stri || 0); u1('uStriD', o.striD || 0); u1('uConch', o.conch ?? .5); u1('uEtch', o.etch || 0); u1('uEtchT', o.etchT || 0); u1('uVeinM', o.veinM || 0); u3('uVeinCol', o.veinCol || [.12, .1, .12]); u3('uLabX', o.labX || [0, 0, 0]); 
    starI.fill(0); view.flash = 1; last = 0; req();
  };
  view.setOre(opts.ore);
  view.destroy = () => { dead = true; if (rq) cancelAnimationFrame(rq); rq = 0; if (io) io.disconnect(); for (const [el, ev, fn, o] of L_) el.removeEventListener(ev, fn, o); try { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (_) {} if (!opts.canvas && cv.parentNode) cv.parentNode.removeChild(cv); };
  req(); return view;
}
