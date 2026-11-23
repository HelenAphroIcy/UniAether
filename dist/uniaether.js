/*! UniAether v0.1.0 · crystals computed from mineralogy and optics · Helen AphroIcy · aphrogenes.com
 *  Code: MIT. Mineral data (src/data): CC BY-NC 4.0. The names UniAether, ISARO, Fufu and their marks are not licensed. See LICENSE, LICENSE-DATA.md, NOTICE. */
(function (root, factory) { const UA = factory(); if (typeof module === 'object' && module.exports) module.exports = UA; else root.UniAether = UA; })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
// ===== src/core/math.js =====
// UniAether · core/math.js — small vector and matrix helpers, the fixed camera and light, and crystal faces.
// A crystal is a set of faces: each face is [nx, ny, nz, d] (unit normal and distance from the centre).
const D2R = Math.PI / 180, reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rotX = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const rotY = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const rotZ = a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const mul = (A, B) => { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return o; };
const app = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
const tr = M => [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]];
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
function axis(u, a) { const [x, y, z] = u, c = Math.cos(a), s = Math.sin(a), t = 1 - c; return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c]; }
// The camera looks down at 34°; the main light comes from the upper left behind, so projections fall to the front right.
const EL = 34 * D2R, SE = Math.sin(EL), RC = rotX(EL), L = norm([-.52, .74, -.43]), LV = app(RC, L), LF = norm([-.62, .22, .75]);   // LF：正面偏左补一点光，朝着我们的几个面才分得出深浅
const C0 = [0, 2.02, 0];   // where a crystal sits above the ground
// 晶形：一组晶面（法线、到中心的距离）。立方体{100}、八面体{111}、菱形十二面体{110}可以组合，一颗最多18个面
const Q3 = 1 / Math.sqrt(3), Q2 = Math.SQRT1_2;
function habit(cube, octa, dod) { const P = [];
  if (cube) for (let a = 0; a < 3; a++) for (const g of [1, -1]) { const n = [0, 0, 0]; n[a] = g; P.push([n[0], n[1], n[2], cube]); }
  if (octa) for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) P.push([x * Q3, y * Q3, z * Q3, octa]);
  if (dod) for (let a = 0; a < 3; a++) for (const u of [1, -1]) for (const v of [1, -1]) { const n = [0, 0, 0]; n[(a + 1) % 3] = u * Q2; n[(a + 2) % 3] = v * Q2; P.push([n[0], n[1], n[2], dod]); }
  return P.slice(0, 18); }
function corners(P) { const V = [], X = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];   // 三个面交出一个顶点，留下落在晶体上的那些
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) for (let k = j + 1; k < P.length; k++) { const a = P[i], b = P[j], c = P[k], bc = X(b, c), D = dot(a, bc); if (Math.abs(D) < 1e-6) continue;
    const ca = X(c, a), ab = X(a, b), v = [0, 1, 2].map(n => (a[3] * bc[n] + b[3] * ca[n] + c[3] * ab[n]) / D); if (P.some(q => dot(q, v) > q[3] + 1e-5)) continue;
    if (V.some(w => Math.hypot(w.p[0] - v[0], w.p[1] - v[1], w.p[2] - v[2]) < 1e-4)) continue; V.push({ p: v, f: P.map((q, n) => Math.abs(dot(q, v) - q[3]) < 1e-5 ? n : -1).filter(n => n >= 0) }); }
  return V; }
// 尖晶石的晶形：尖的八面体{111}；有的棱上带一窄条菱形十二面体{110}
const N111 = norm([1, 1, 1]);
const OCT_S = habit(0, .62, 0), OCT_B = habit(0, .62, .742);
// 尖晶石律双晶：两颗八面体共用一个{111}面，一颗绕[111]转了180°。在这里做成两半：上一半是八面体在{111}这一边的部分，下一半是另一边、再绕[111]转半圈
function macleHalves(flat) {   // flat：平行于双晶面的那两个面往里收多少（越小越扁，像「macle」三角板）
  const P = habit(0, .62, 0).map(p => { const d = Math.abs(p[0] * N111[0] + p[1] * N111[1] + p[2] * N111[2]); return d > .99 ? [p[0], p[1], p[2], p[3] * flat] : p.slice(); });
  return { up: [...P, [-N111[0], -N111[1], -N111[2], .0005]], down: [...P, [N111[0], N111[1], N111[2], .0005]] };
}
const tilt = (y, x, z) => mul(rotY(y), mul(rotX(x), rotZ(z)));
const R180 = axis(N111, Math.PI);
const V3 = (r, g, b) => [r, g, b];

// ===== src/core/forms.js =====
// UniAether · core/forms.js — crystal habits built from faces (cubic, tetragonal, trigonal, hexagonal, orthorhombic, monoclinic, triclinic).
// Each builder returns up to 18 faces in the crystal's own frame, c axis up (local y).
// —— 色卡：每种矿物自己的晶形、光学，加一张颜色卡（颜色、分层、稀有度、荧光）——
// 稀有度参考了资料和市场上的说法，是游戏里的分档，不是精确统计
const CUBE_F = habit(.93, 0, 0), CUBE_T = habit(.93, 1.5, 0), OCT_P = habit(.98, .62, 0);
const TWIN60 = axis(norm([1, 1, 1]), Math.PI / 3);
// —— 三方、六方晶系的晶形：c 轴朝上（本地坐标的 y）。一圈面：n 个面、离中心 d、法线抬起 el（0 是柱面，π/2 是顶面）——
const RING = (n, d, el = 0, off = 0, sy = 1) => Array.from({ length: n }, (_, i) => { const a = off + i * 2 * Math.PI / n, c = Math.cos(el), s = Math.sin(el); return [Math.cos(a) * c, sy * s, Math.sin(a) * c, d]; });
const CAP = (d, sy = 1) => [[0, sy, 0, d]];
// 断口面、解理面：不是长出来的晶面，是从母岩上掰下来、或者顶上碎掉的地方。法线故意长一点点当记号（断口 1.0005 倍，解理 1.001 倍），着色器认出来以后画贝壳状的弧纹、细台阶和碎亮点
const FR = P => [P[0] * 1.0005, P[1] * 1.0005, P[2] * 1.0005, P[3]], CLV = P => [P[0] * 1.001, P[1] * 1.001, P[2] * 1.001, P[3]];
const D30 = Math.PI / 6;
// 碧玺：圆鼓鼓的三角形柱（三条边各是两个微微外凸的面，三个角被小柱面削掉），顶上是很缓的三面锥，被一个小三角平顶切掉尖；底下是断口
function TOUR(L = 1.25, w = .44) { const el = .72, top = L + .48, d = top * Math.sin(el);
  return [...RING(3, w, 0, D30 - .15), ...RING(3, w, 0, D30 + .15), ...RING(3, w * 1.5, 0, Math.PI / 2), ...RING(3, d, el, Math.PI / 2), ...CAP(L + .4), ...CAP(L, -1).map(FR)]; }
// 刚玉：蓝宝石常是两头尖的桶（很陡的六方双锥，两头被平面切掉）；红宝石常是扁平的六方板，上下各三个菱面体小面
function BARREL(L = 1.3, w = .6, el = .2) { return [...RING(6, w, el, 0), ...RING(6, w, -el, 0, 1), ...CAP(L), ...CAP(L, -1)].map((p, i) => i >= 6 && i < 12 ? [p[0], -Math.abs(p[1]), p[2], p[3]] : p); }
function RUBYTAB(w = .9, t = .3) { const el = 1.0, d = (t + .04) * Math.sin(el) + w * .92 * Math.cos(el); return [...RING(6, w, 0, D30), ...CAP(t), ...CAP(t, -1), ...RING(3, d, el, 0), ...RING(3, d, -el, Math.PI / 3)]; }
// 绿柱石：六方柱，平顶；顶上的棱有一圈小斜面
function BERYL(L = 1.3, w = .5, ch = .08) { const el = .9, d = (L - ch) * Math.sin(el) + w * Math.cos(el); return [...RING(6, w, 0, 0), ...CAP(L), ...(L > .6 ? CAP(L, -1).map(FR) : CAP(L, -1)), ...RING(6, d, el, 0)]; }   // 长柱的底是从母岩上断下来的（贝壳状到参差）；扁板保留底面
// 磷灰石：六方柱，顶上是六面的锥，尖被一个小平面切掉
function APAT(L = 1.0, w = .5, el = .9) { const d = w * Math.cos(el) + L * Math.sin(el), apex = d / Math.sin(el); return [...RING(6, w, 0, 0), ...RING(6, d, el, 0), ...CAP(apex - .16), ...(L > .8 ? CAP(L, -1).map(FR) : CAP(L, -1))]; }   // 长柱的底是断口（贝壳状到参差）
// 黄玉：横截面是拉长的八边形（{110}、{120} 两组柱面），顶上四个锥面、两个穹面和一个平顶
function TOPAZ(L = 1.0) { const a1 = .49, a2 = .81, w1 = .5, w2 = .53, ep = .55, ed = .8, zx = w2 / Math.sin(a2), P = [];
  for (const a of [a1, -a1, Math.PI - a1, Math.PI + a1]) P.push([Math.cos(a), 0, Math.sin(a), w1]);
  for (const a of [a2, -a2, Math.PI - a2, Math.PI + a2]) P.push([Math.cos(a), 0, Math.sin(a), w2]);
  for (const a of [a1, -a1, Math.PI - a1, Math.PI + a1]) P.push([Math.cos(a) * Math.cos(ep), Math.sin(ep), Math.sin(a) * Math.cos(ep), w1 * Math.cos(ep) + L * Math.sin(ep)]);
  for (const a of [Math.PI / 2, -Math.PI / 2]) P.push([0, Math.sin(ed), Math.sin(a) * Math.cos(ed), zx * Math.cos(ed) + (L - .05) * Math.sin(ed)]);
  return [...P, ...CAP(L + .36), ...CAP(L, -1).map(CLV)]; }   // 底面：黄玉 {001} 完全解理，掰下来的底是一片解理面
// 金绿宝石：板状，板面朝本地的 y；轮廓是一个横着拉长的六边形。三块绕板面法线各转 60° 长在一起，就是假六方的三连晶
function CHRY(w = .62, t = .22, e = .55) { return [...RING(2, w * e, 0, Math.PI / 2), ...[D30, -D30, Math.PI - D30, Math.PI + D30].map(a => [Math.cos(a), 0, Math.sin(a), w]), ...CAP(t), ...CAP(t, -1)]; }
// 锆石：四方柱，两头是四面的锥
function ZIRC(L = .8, w = .5, el = .78) { const d = w * Math.cos(el) + L * Math.sin(el); return [...RING(4, w, 0, 0), ...RING(4, d, el, 0), ...RING(4, d, -el, 0)]; }
// 钼铅矿：方形的薄板，上下两面的边上各一圈小斜面
function WULF(w = .9, t = .17, b = .07, el = .95) { const d = w * Math.cos(el) + t * Math.sin(el) - b; return [...RING(4, w, 0, 0), ...CAP(t), ...CAP(t, -1), ...RING(4, d, el, 0), ...RING(4, d, -el, 0)]; }
// 锂辉石：扁扁的柱，顶上是歪的凿子形（单斜晶系，前后不对称）
function SPOD(L = 1.2, t = .26, w = .5) { const a = .8, zx = w / Math.sin(a), P = [[1, 0, 0, t], [-1, 0, 0, t]];
  for (const g of [a, -a, Math.PI - a, Math.PI + a]) P.push([Math.cos(g), 0, Math.sin(g), w]);
  P.push([.5, .866, 0, .866 * L + .5 * t], [-.35, .937, 0, .937 * (L + .14) + .35 * t], [0, .7, .714, .7 * (L - .05) + .714 * zx], [0, .7, -.714, .7 * (L - .05) + .714 * zx]);
  return [...P, ...CAP(L, -1).map(FR)]; }   // 底下是断口（锂辉石：参差到半贝壳状）
// 榍石：信封一样扁扁的楔子，上下各四个面，往一边歪一点（单斜），两个尖被削掉
function SPHN(w = .42, e = .95, k = .14, tip = .7) { const P = [], sh = (n, q) => [n[0] * Math.cos(q) - n[1] * Math.sin(q), n[0] * Math.sin(q) + n[1] * Math.cos(q), n[2]];
  for (const g of [.62, -.62, Math.PI - .62, Math.PI + .62]) { const n = [Math.cos(g) * Math.cos(e), Math.sin(e), Math.sin(g) * Math.cos(e)]; P.push([...sh(n, k), w]); P.push([...sh([n[0], -n[1], n[2]], k), w]); }
  return [...P, [1, 0, 0, tip], [-1, 0, 0, tip]]; }
// 蓝晶石：长长的刀片，两头斜着断开（三斜，哪个方向都不对称）
function BLADE(L = 1.5, w = .36, t = .1) { const n1 = norm([.1, 0, 1]), n2 = norm([.32, .94, .12]), n3 = norm([-.28, -.95, .1]); return [[n1[0], n1[1], n1[2], t], [-n1[0], -n1[1], -n1[2], t], [1, 0, 0, w], [-1, 0, 0, w], CLV([n2[0], n2[1], n2[2], L]), CLV([n3[0], n3[1], n3[2], L * .92])]; }   // 两头：蓝晶石沿 {001} 裂开（parting）
// 拉长石：沿解理裂开的一块，歪的平行六面体，两个角被磨掉
function TBLK(a = .7, b = .55, c = .45) { const P = []; for (const [v, d] of [[[1, .12, .08], a], [[.15, 1, -.1], b], [[.05, -.12, 1], c]]) { const n = norm(v); P.push([n[0], n[1], n[2], d], [-n[0], -n[1], -n[2], d]); }
  const q1 = norm([1, 1, .3]), q2 = norm([-1, -.8, -.4]); return [...P, [q1[0], q1[1], q1[2], (a + b) * .66], [q2[0], q2[1], q2[2], (a + b) * .6]]; }
// 月光石（冰长石的样子）：菱形截面的柱，上下两个斜面交成一道棱，像一块斜着切的菱形砖
function ADU(L = .62, w = .62) { const P = []; for (const a of [Math.PI / 3, -Math.PI / 3, Math.PI * 2 / 3, -Math.PI * 2 / 3]) P.push([Math.cos(a), 0, Math.sin(a), w]); for (const [v, d] of [[[-.5, 1, 0], L], [[.85, 1, 0], L * 1.08]]) { const n = norm(v); P.push([n[0], n[1], n[2], d], [-n[0], -n[1], -n[2], d]); } return P; }
// 蓝柱石：细长的单斜柱，侧面一对平行的面，头上几个斜面歪向一边，底下是断口
function EUC(L = 1.25, w = .4) { const P = []; for (const a of [.6, -.6, Math.PI - .6, Math.PI + .6]) P.push([Math.cos(a), 0, Math.sin(a), w]); P.push([0, 0, 1, w * .92], [0, 0, -1, w * .92]); for (const [v, d] of [[[.38, .92, .26], L], [[.38, .92, -.26], L], [[-.62, .78, 0], L * .96]]) { const n = norm(v); P.push([n[0], n[1], n[2], d]); } return [...P, ...CAP(L * .82, -1)]; }
// 蔷薇辉石的透明晶体：厚板状，棱和角上多几个小斜面，不像方盒子
function RHOX(a = .74, b = .42, c = .62) { const P = TBLK(a, b, c); for (const [v, d] of [[[.72, .5, .45], .86], [[-.66, .55, -.4], .84], [[.55, -.45, .7], .82], [[-.5, -.5, -.72], .84], [[.8, -.1, -.6], .82], [[-.75, .15, .62], .82]]) { const n = norm(v); P.push([n[0], n[1], n[2], d]); } return P; }
// 石榴石：菱形十二面体，四次轴的顶角被小正方形削掉；另一种削得多一点
const GAR_D = habit(.84, 0, .62), GAR_T = habit(.76, 0, .62);
// 金刚石：八面体，六个顶角被小立方体面削掉
const DIA_O = habit(1.0, .62, 0);
// 石英：六方柱，顶上两组菱面体（大的 r、小的 z 交替），底下是断口；也可以两头尖
function QTZ(L = 1.1, w = .42, dt = false) { const el = .667, d = w * Math.cos(el) + L * Math.sin(el); const base = [...RING(6, w, 0, 0), ...RING(3, d, el, 0), ...RING(3, d + .05, el, Math.PI / 3), ...(dt ? [...RING(3, d, -el, Math.PI / 3), ...RING(3, d + .05, -el, 0)] : CAP(L * .95, -1).map(FR))];
  if (dt) return base;
  // s 面：一组三个很小的面，削掉柱面和菱面体相接的角（只在交替的三个角上）
  const es = .36, Rc = w / Math.cos(Math.PI / 6), S = [];
  for (const az of [Math.PI / 6, Math.PI / 6 + 2 * Math.PI / 3, Math.PI / 6 + 4 * Math.PI / 3]) {
    const cx = Rc * Math.cos(az), cz = Rc * Math.sin(az), yc = (d - Math.cos(el) * (cx * Math.cos(az - Math.PI / 6) + cz * Math.sin(az - Math.PI / 6))) / Math.sin(el);
    const n = [Math.cos(az) * Math.cos(es), Math.sin(es), Math.sin(az) * Math.cos(es)]; S.push([n[0], n[1], n[2], (n[0] * cx + n[1] * yc + n[2] * cz) * .965]); }
  return [...base, ...S]; }
// 玫瑰水晶：没有晶面的致密块体，做成一块不规则的、边角被磨圆一点的料
const RQB = [[1, .1, .05, .62], [-1, .05, .1, .58], [.08, 1, .05, .5], [-.05, -1, .1, .55], [.1, .05, 1, .52], [.05, -.1, -1, .56], [.7, .6, .4, .7], [-.6, .7, .3, .72], [.5, -.6, .6, .7], [-.7, -.5, -.5, .74], [.6, .4, -.7, .68], [-.5, .5, -.7, .7], [.4, -.7, -.6, .73], [-.6, -.6, .6, .71], [.3, .9, -.4, .66], [-.4, -.85, -.3, .68], [.85, -.2, .5, .7], [-.8, .3, -.5, .69]].map(([x, y, z, w]) => { const n = norm([x, y, z]); return [n[0], n[1], n[2], w]; });
// 鱼眼石：四方柱，顶上是陡的四面锥（锥面对着柱子的棱）；另一种是近乎立方的短柱，平顶，角被小锥面削掉
function APO(L = 1.0, w = .46, el = 1.05) { const d = w * Math.SQRT2 * Math.cos(el) + L * Math.sin(el); return [...RING(4, w, 0, 0), ...RING(4, d, el, Math.PI / 4), ...CAP(d / Math.sin(el) - .1), ...CAP(L, -1).map(CLV)]; }   // 底面：鱼眼石 {001} 完全解理
function APOC(h = .5, w = .5, el = .78) { const d = w * Math.SQRT2 * Math.cos(el) + h * Math.sin(el) - .1; return [...RING(4, w, 0, 0), ...CAP(h), ...CAP(h, -1), ...RING(4, d, el, Math.PI / 4)]; }
// 黝帘石（坦桑石）：菱形截面的柱，两侧一对平面，顶上两组斜的穹面
function ZOI(L = 1.1, w = .44, brk = 0) { const a1 = .62, P = []; for (const a of [a1, -a1, Math.PI - a1, Math.PI + a1]) P.push([Math.cos(a), 0, Math.sin(a), w]);
  const e = .95, e2 = 1.15; P.push([0, 0, 1, w * .9], [0, 0, -1, w * .9], [0, Math.sin(e), Math.cos(e), w * .9 * Math.cos(e) + L * Math.sin(e)], [0, Math.sin(e), -Math.cos(e), w * .9 * Math.cos(e) + L * Math.sin(e)], [Math.cos(e2), Math.sin(e2), 0, w * 1.2 * Math.cos(e2) + (L + .1) * Math.sin(e2)], [-Math.cos(e2), Math.sin(e2), 0, w * 1.2 * Math.cos(e2) + (L + .1) * Math.sin(e2)]);
  // 顶上断掉的样子：黝帘石的晶体常常「poorly terminated」，又顺着长轴的垂直方向有一组完全解理，所以断顶常是一片横着的解理面，边角再崩掉一两块贝壳状的断口
  if (brk) { const yA = Math.min((w * .9 * Math.cos(e) + L * Math.sin(e)) / Math.sin(e), (w * 1.2 * Math.cos(e2) + (L + .1) * Math.sin(e2)) / Math.sin(e2)), at = (v, x, y, z) => { const n = norm(v); return [n[0], n[1], n[2], n[0] * x + n[1] * y + n[2] * z]; };
    if (brk === 1) P.push(CLV(at([.05, 1, -.04], 0, yA - .15, 0)), FR(at([.55, 1, .35], .2, yA - .25, .12)), FR(at([-.7, 1, -.1], -.3, yA - .2, 0)));
    else P.push(CLV(at([-.06, 1, .05], 0, yA - .13, 0)), FR(at([-.4, 1, .55], -.14, yA - .24, .16))); }
  return [...P, ...CAP(L * .95, -1).map(FR)]; }
// 橄榄石：厚板状的柱，顶上是凿子一样的穹面
function PERI(L = .8, w = .5, t = .34) { const a = .75, P = [[0, 0, 1, t], [0, 0, -1, t]]; for (const g of [a, -a, Math.PI - a, Math.PI + a]) P.push([Math.cos(g), 0, Math.sin(g), w]);
  const e = .85; P.push([0, Math.sin(e), Math.cos(e), t * Math.cos(e) + L * Math.sin(e)], [0, Math.sin(e), -Math.cos(e), t * Math.cos(e) + L * Math.sin(e)], [.55, .83, 0, .55 * w * 1.1 + .83 * (L + .05)], [-.55, .83, 0, .55 * w * 1.1 + .83 * (L + .05)], [0, -Math.sin(e), Math.cos(e), t * Math.cos(e) + L * Math.sin(e)], [0, -Math.sin(e), -Math.cos(e), t * Math.cos(e) + L * Math.sin(e)], [.55, -.83, 0, .55 * w * 1.1 + .83 * (L + .05)], [-.55, -.83, 0, .55 * w * 1.1 + .83 * (L + .05)]);
  return P; }
function CORD(L = .62, w = .6, ch = .12) { const el = .75, d = (L - ch) * Math.sin(el) + w * Math.cos(el); return [...RING(6, w, 0, 0), ...RING(6, w * 1.045, 0, Math.PI / 6), ...CAP(L), ...CAP(L, -1), ...RING(6, d, el, 0), ...RING(6, d, -el, 0)]; }   // 堇青石：假六方的短柱，柱棱被小面削掉，顶和底是平的，边上一圈小斜面

// ===== src/core/colour.js =====
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
  // vivid：名字里就带着「霓虹」「鲜艳」的那几种（帕拉伊巴、霓虹尖晶石、鸽血红……）。0 是原样；越接近 1，越少往灰里收、藏色越淡、暗处和背面越不往蓝紫偏，留住它自己那一个纯的色相
  const v = Math.max(0, Math.min(1, col.vivid || 0));
  const rr = ramp(col.hex).map(x => absorb(x, col.depth || 1)), soft = x3 => { const m = (x3[0] + x3[1] + x3[2]) / 3; return x3.map(x => x + (m - x) * .2 * (1 - v)); };
  // 沿长轴分段：bands 是从下到上的颜色（双色、三色、彩虹），2 到 7 个，平均分成七段
  const B = col.bands ? Array.from({ length: 7 }, (_, i) => absorb(col.bands[Math.floor(i * col.bands.length / 7)], col.depth || 1.25)) : null, pal = (B || ZONES[col.zone || 'even'](a, b, k, rr)).map(soft).flat();   // 色带最多七段，从下到上；不够七个就按比例拉长
  const [h, s, l] = _hsl(col.hex), neutral = !!col.bands || (col.pl || 0) > .8 || s < .12 || l > .93 || l < .14;   // 分段的石头不用单一颜色的环境色：让每一段自己的颜色说话
  const acc = neutral ? { deepL: [.3, .31, .42], midL: [.5, .52, .64], deepC: [.4, .41, .55], glowC: [.94, .95, 1], back: [.76, .78, .86], loT: [.94, .96, 1.04], hiT: [1.03, 1.02, .98], rimB: [1.2, 1.18, 1.14], hid: [_rgb(.08, .5, .8), _rgb(.48, .4, .8), _rgb(.75, .4, .82), _rgb(.92, .4, .84)], hidA: .14 }
    : { deepL: _rgb(_hue(h, coolOf(h), .15 * (1 - v)), Math.min(s, .5 + .35 * v) * (.8 + .15 * v), .3), midL: _rgb(h, Math.min(s, .6 + .3 * v) * (.7 + .2 * v), .52), deepC: _rgb(_hue(h, coolOf(h), .1 * (1 - v)), Math.min(s, .7 + .25 * v), .38), glowC: _rgb(_hue(h, .14, .12 * (1 - v)), s * (.5 + .3 * v), .9), back: _rgb(_hue(h, coolOf(h), .3 * (1 - .6 * v)), Math.min(.6 + .3 * v, s * (.7 + .2 * v)), .7),   // 隔着正面看到的、背光的背面：同一个颜色往蓝紫偏、更深
        loT: _tint(_rgb(_hue(h, coolOf(h), .3 * (1 - .7 * v)), Math.min(.8, s), .5), .18, .93), hiT: _tint(_rgb(_hue(h, .14, .32 * (1 - .7 * v)), s * .7, .62), .12),
        rimB: _tint(hidOf(h, s)[3], .22 * (1 - .5 * v), 1.18), hid: hidOf(h, s), hidA: .36 * (1 - .65 * v),   // 里面受光的背面：第二种颜色，红的偏橙金，蓝的偏青
        env: [_rgb(_hue(h, coolOf(h), .35 * (1 - .7 * v)), Math.max(.22, Math.min(.42 + .38 * v, s * (.55 + .35 * v))), .46), _rgb(h, Math.max(.2, Math.min(.5 + .35 * v, s * (.5 + .35 * v))), .82), _rgb((h + .5) % 1, .42 * (1 - .5 * v), .88), _rgb(_hue(h, .14, .4 * (1 - .5 * v)), .5, .9)] };   // 环境色：深处偏冷的同色、自己的浅色、一道淡的补色、偏暖的高光
  if (col.pure) Object.assign(acc, { hidA: .002, rimB: [1.2, 1.17, 1.18] });
  if (col.hidC) Object.assign(acc, { hid: col.hidC.map(x => _lin(x)), hidA: col.hidA ?? .2 });   // 自己指定的藏色：背面和受光的里面换成这几种（比如玫瑰水晶的蜜桃、浅丁香粉），不用自动算出来的那几种   // 纯净的一种颜色（玫瑰水晶）：不要背面那层第二种颜色，也不要每一块刻面各带一点别的色，免得看着发灰发脏
  if (col.bands || (col.pl || 0) > .8) Object.assign(acc, { back: [.9, .89, .9], deepL: [.42, .41, .45], midL: [.64, .63, .67], deepC: [.54, .52, .58], hidA: .2, env: [[.6, .61, .66], [.92, .9, .92], [.96, .92, .88], [.88, .94, .95]] });   // 分段的：背面和暗处只留一点点冷，别把各段颜色蒙上一层灰紫
  const forms = min.clusters[col.habit || min.habit || 'main'] || min.clusters.main, cluster = forms[ci % forms.length]();
  const zAx = col.bands ? 1 : (col.axial ?? min.axial ?? 0), glow = col.glow ? { glowCol: _lin(col.glow).map(v => Math.min(1, v * 1.15)), glowK: col.glowK ?? .8 } : {};
  return { id: col.id, ...min.optics, ...(col.optics || {}), ...acc, ...fluoUV(col.uv), zAx, band: col.bands ? 1 : 0, chord: col.chord ?? (col.zone === 'melon' ? .85 : 0), inner: (col.optics || {}).inner ?? min.optics.inner ?? 0, ast: col.ast || 0, pl: col.pl || 0, spk: col.spk ? col.spk.k : 0, spkCol: col.spk ? [1, 3, 5].map(i => parseInt(col.spk.c.slice(i, i + 2), 16) / 255) : undefined, plAx: col.plAx ? col.plAx.map(x => absorb(x, col.depth || 1)) : undefined, phantom: col.phantom ?? min.optics.phantom ?? 1, ior: (col.optics || {}).ior ?? min.optics.ior ?? 1.55, ...(col.bands ? { var: Math.min(.06, (col.optics || {}).var ?? min.optics.var) } : {}), axR: min.axR, ...glow, ...(min.optics.lab ? { cleave: 0, lab: col.labK ?? 1, labN: min.labN, labX: [col.labW ?? min.optics.labW ?? 0, col.labS ?? min.optics.labS ?? 0, col.labZ ?? min.optics.labZ ?? 0] } : {}), stri: (col.optics || {}).stri ?? min.optics.stri ?? 0, striD: min.optics.striD ?? 0, conch: min.optics.conch ?? .5, etch: (col.etch ?? min.optics.etch) || 0, etchT: (col.etchT ?? min.optics.etchT) || 0, vein: col.vein ? col.vein.k : 0, veinM: col.vein ? (col.vein.m || 0) : 0, veinCol: col.vein ? [1, 3, 5].map(i => parseInt((col.vein.c || '#2a2228').slice(i, i + 2), 16) / 255) : undefined, ...(col.film ? { filmK: col.film.k, filmH: col.film.h, filmR: col.film.r, cOff: col.film.off ?? min.optics.cOff, filmW: col.film.w ?? min.optics.filmW } : {}), pal, cluster };
}
const swatchOf = col => { if (col.sw) return col.sw; if (col.hex2) return col.zone === 'core' ? [col.hex2, col.hex] : [col.hex, col.hex2];   // 两种颜色的：色块从心到边是这两种颜色（幻影的，心是第二种）
  const [h, s, l] = _hsl(col.hex); return [s < .12 ? '#ffffff' : 'hsl(' + Math.round(h * 360) + ' ' + Math.round(s * 70) + '% 92%)', col.hex]; };
function drawColor(min, rnd = Math.random) { const tot = min.colors.reduce((n, c) => n + RARITY[c.rarity].w, 0); let r = rnd() * tot; for (const c of min.colors) { r -= RARITY[c.rarity].w; if (r <= 0) return c; } return min.colors[0]; }
const chanceOf = (min, col) => RARITY[col.rarity].w / min.colors.reduce((n, c) => n + RARITY[c.rarity].w, 0);

// ===== src/data/fluorite.js =====
// UniAether · data/fluorite.js — the fluorite cluster of Ore Projection version 8, kept as it was.
// Licensed CC BY-NC 4.0 (see LICENSE-DATA.md).
const PAL = [.14, .03, .008,  .06, .09, .02,  .52, .18, .02,  .6, .6, .06,  .2, .33, .028,  .7, 1.1, .1,  .55, .72, .1], FROST = .1, SOFT = .04, VAR = 1, CLEAR = .9, TERR = .8, STEP = 9;
const RO = mul(rotY(-.42), mul(rotX(.1), rotZ(.07))), OCT = habit(.93, .62, 0), CLUSTER = [{ R: RO, t: C0, s: 1.5, form: OCT }, { R: RO, t: add(C0, app(RO, [1.0, -.5, .4])), s: .92, form: OCT }, { R: RO, t: add(C0, app(RO, [-.85, .45, -.55])), s: .6, form: OCT }, { R: RO, t: add(C0, app(RO, [-.55, -.8, .75])), s: .5, form: OCT }, { R: RO, t: add(C0, app(RO, [.75, .75, -.7])), s: .34, form: OCT }];
const flat7 = (c, line) => [...c, ...line, ...c, ...line, ...c, ...c, ...c];   // 七层颜色都一样：尖晶石没有萤石那样的色带，只留一点生长纹
const FLUORITE = { id: 'fluorite', cluster: CLUSTER, pal: PAL, frost: FROST, soft: SOFT, var: VAR, clear: CLEAR, terr: TERR, step: STEP, cleave: 1, lus: 1, disp: 1,
  deepL: V3(.25, .29, .46), midL: V3(.47, .4, .72), deepC: V3(.329, .282, .588), glowC: V3(.847, .949, .918),
  uva: V3(.2, .13, .72), uvb: V3(.22, .42, 1), uvc: V3(.72, .86, 1), uvg: V3(.133, .29, .588), uvh: V3(.13, .26, .74), uv: true };

// ===== src/data/minerals.js =====
// UniAether · data/minerals.js — 26 minerals: habits, optics and colour cards (colour, layering, rarity, fluorescence, notes).
// Licensed CC BY-NC 4.0 (see LICENSE-DATA.md). Sources for each mineral are in data/sources.js.
const MINERALS = {
  fluorite: {
    zh: '萤石', en: 'Fluorite', formula: 'CaF₂', sys: { zh: '等轴晶系', en: 'Cubic' }, mohs: 4,
    optics: { ior: 1.434, inner: 0.75, frost: .1, soft: .04, var: .7, clear: .9, terr: .2, step: 5, cleave: 1, lus: 1, disp: 1 },
    clusters: {
      main: [
        () => { const R = tilt(-.45, .28, .1); return [{ R, t: C0, s: 1.05, form: CUBE_F }, { R: tilt(.35, .45, -.2), t: add(C0, [-.95, -.48, .42]), s: .62, form: CUBE_F }, { R: tilt(-.9, .1, .4), t: add(C0, [.92, -.58, -.28]), s: .52, form: CUBE_F }]; },
        () => { const R = tilt(.4, .3, -.12); return [{ R, t: C0, s: 1.1, form: CUBE_T }, { R: mul(R, rotY(.35)), t: add(C0, [.3, .82, -.22]), s: .7, form: CUBE_T }]; },
      ],
      twin: [() => { const R = tilt(-.5, .25, .1); return [{ R, t: C0, s: 1.05, form: CUBE_F }, { R: mul(R, TWIN60), t: C0, s: .9, form: CUBE_F }, { R: tilt(.4, -.2, .3), t: add(C0, [1.0, -.65, .45]), s: .42, form: CUBE_F }]; }],
      oct: [() => { const R = tilt(-.3, .2, .2); return [{ R, t: C0, s: 1.35, form: OCT_P }, { R: tilt(.7, -.4, .5), t: add(C0, [.98, -.6, .38]), s: .46, form: OCT_P }, { R: tilt(-1, .5, -.3), t: add(C0, [-.95, -.7, .3]), s: .4, form: OCT_P }, { R: tilt(.2, .9, .1), t: add(C0, [.2, -.9, -.75]), s: .33, form: OCT_P }]; }],
    },
    colors: [
      { id: 'blueviolet', zh: '蓝紫', en: 'Blue-violet', hex: '#7664cc', rarity: 'common', raw: FLUORITE, cause: { zh: '蓝和紫一层层、一块块地长在一起', en: 'Blue and violet growing together in layers and sectors' }, uvNote: { zh: '长波紫外灯下发蓝光', en: 'Glows blue under long-wave UV' } },
      { id: 'purple', zh: '葡萄紫', en: 'Grape purple', hex: '#7a52c4', rarity: 'common', cause: { zh: '紫色来自钙的微小胶体散射光', en: 'Violet: light scattered by tiny calcium colloids' } },
      { id: 'emerald', zh: '翠绿', en: 'Emerald green', hex: '#3aa158', vivid: 0.4, zone: 'heart', glow: '#86b8ff', glowK: .3, habit: 'twin', rarity: 'common', uv: '#62a8ff', where: { zh: '英国威尔溪谷 · 罗杰利矿', en: 'Rogerley Mine, Weardale' }, cause: { zh: '立方体的贯穿双晶，心里一团白雾', en: 'Interpenetrant cubes with a frosted heart' }, uvNote: { zh: '荧光亮到日光下就会泛蓝；紫外灯下是很亮的蓝（铕）', en: 'Bright enough to turn blue in daylight; brilliant blue under UV (europium)' } },
      { id: 'mint', zh: '薄荷绿', en: 'Mint', hex: '#9fdcc4', rarity: 'common', optics: { clear: .95, frost: .05 }, where: { zh: '湖南郴州一带', en: 'Chenzhou, Hunan' }, cause: { zh: '淡淡的绿，一叠清透的立方体', en: 'A pale green stack of clear cubes' } },
      { id: 'okorusu', zh: '苹果绿 · 紫角', en: 'Apple green, violet corners', hex: '#a5cf5e', hex2: '#8456c8', zone: 'rim', rarity: 'uncommon', uv: '#a274ff', where: { zh: '纳米比亚 · 奥科鲁苏矿', en: 'Okorusu Mine, Namibia' }, cause: { zh: '绿的立方体，角和棱上一圈紫', en: 'Green cubes with violet at the corners' }, uvNote: { zh: '紫外灯下发紫光', en: 'Glows purple under UV' } },
      { id: 'skyblue', zh: '浅蓝', en: 'Sky blue', hex: '#8fbdf0', rarity: 'uncommon', cause: { zh: '蓝色来自钇和氟空位一起形成的色心', en: 'Blue: an yttrium and fluorine-vacancy colour centre' } },
      { id: 'banded', zh: '绿心紫边', en: 'Green heart, violet rim', hex: '#4fb184', hex2: '#8a64cc', zone: 'band', rarity: 'uncommon', where: { zh: '浙江武义一带', en: 'Wuyi, Zhejiang' }, cause: { zh: '一层层长大：心里绿，中间无色，皮是紫的', en: 'Grown in layers: green heart, clear band, violet skin' } },
      { id: 'honey', zh: '蜜黄', en: 'Honey yellow', hex: '#f4d266', depth: .4, rarity: 'uncommon', cause: { zh: '黄色来自氧取代氟形成的色心', en: 'Yellow: oxygen replacing fluorine' } },
      { id: 'amber', zh: '琥珀 · 紫心', en: 'Amber, violet phantom', hex: '#e09a32', hex2: '#8b3a9c', zone: 'core', rarity: 'rare', where: { zh: '纳米比亚 · 奥科鲁苏矿', en: 'Okorusu Mine, Namibia' }, cause: { zh: '琥珀色的立方体里包着一颗紫色的幻影', en: 'Amber cubes around a raspberry-violet phantom' } },
      { id: 'pink', zh: '粉红', en: 'Pink', hex: '#f0a0b2', habit: 'oct', rarity: 'rare', optics: { frost: .12, var: .4 }, where: { zh: '内蒙古赤峰 · 黄岗矿', en: 'Huanggang mines, Inner Mongolia' }, cause: { zh: '粉色来自钇和氧的色心；粉的萤石是最少见的颜色之一', en: 'Pink: the YO₂ colour centre; one of the rarest colours' } },
      { id: 'inky', zh: '墨紫', en: 'Inky violet', hex: '#3a2a58', depth: 1.25, rarity: 'mythic', cause: { zh: '紫到发黑；黑色的萤石最少见', en: 'Violet so deep it reads black; black fluorite is among the rarest' } },
      { id: 'colorless', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'mythic', optics: { clear: .99, frost: .02, var: .2 }, cause: { zh: '纯的氟化钙本来就是无色的，有杂质才有颜色，所以无色最少见', en: 'Pure CaF₂ is colourless; colour comes from impurities, so clear stones are rare' } },
    ],
  },
  spinel: {
    zh: '尖晶石', en: 'Spinel', formula: 'MgAl₂O₄', sys: { zh: '等轴晶系', en: 'Cubic' }, mohs: 8,
    optics: { ior: 1.718, inner: 0.75, frost: .03, soft: .03, var: .12, clear: .97, terr: .32, step: 7, cleave: 0, lus: 1.45, disp: 2.6 },
    clusters: {
      main: [
        () => { const R = tilt(-.55, .42, .18); return [{ R, t: C0, s: 1.45, form: OCT_B }, { R: tilt(.9, -.3, .5), t: add(C0, [.78, -.55, .38]), s: .46, form: OCT_S }]; },
        () => [{ R: tilt(.6, .5, -.2), t: C0, s: 1.4, form: OCT_B }],
        () => [{ R: tilt(-.4, .3, .12), t: C0, s: 1.3, form: OCT_S }, { R: tilt(1.1, .6, -.4), t: add(C0, [-.84, -.5, .34]), s: .56, form: OCT_B }, { R: tilt(-.9, -.5, .7), t: add(C0, [.78, -.68, -.2]), s: .42, form: OCT_S }],
      ],
      twin: [() => { const tg = norm([.18, .78, .6]), ax = norm([N111[1] * tg[2] - N111[2] * tg[1], N111[2] * tg[0] - N111[0] * tg[2], N111[0] * tg[1] - N111[1] * tg[0]]), R = mul(rotY(.25), axis(ax, Math.acos(dot(N111, tg)))), h = macleHalves(.55); return [{ R, t: C0, s: 1.65, form: h.up }, { R: mul(R, R180), t: C0, s: 1.65, form: h.down }]; }],
    },
    colors: [
      { id: 'pink', zh: '粉红', en: 'Pink', hex: '#f08ab0', rarity: 'common', uv: '#ff3b58', cause: { zh: '铬带来粉红', en: 'Chromium gives the pink' }, uvNote: { zh: '铬让它在紫外灯下发红光', en: 'Chromium makes it glow red under UV' } },
      { id: 'lavender', zh: '薰衣草', en: 'Lavender', hex: '#b8a6e0', rarity: 'common', where: { zh: '越南陆安', en: 'Luc Yen, Vietnam' }, cause: { zh: '颜色多来自铁，铁会压住荧光', en: 'Coloured mostly by iron, which quenches fluorescence' } },
      { id: 'violet', zh: '紫罗兰', en: 'Violet', hex: '#8452c6', rarity: 'common', cause: { zh: '紫色多来自铁，或铬、钒和铁一起', en: 'Purple from iron, or chromium, vanadium and iron together' } },
      { id: 'grey', zh: '灰', en: 'Grey', hex: '#9da3b0', rarity: 'common', cause: { zh: '灰色来自二价铁', en: 'Grey comes from ferrous iron' } },
      { id: 'black', zh: '黑', en: 'Black', hex: '#24232e', depth: 1.4, rarity: 'common', optics: { clear: .9 }, cause: { zh: '铁多到几乎不透光', en: 'So much iron that little light passes' } },
      { id: 'peach', zh: '桃粉', en: 'Peach', hex: '#f5ae98', rarity: 'uncommon', cause: { zh: '粉里带一点橙', en: 'Pink with a touch of orange' } },
      { id: 'orange', zh: '橙', en: 'Orange', hex: '#f27a3c', rarity: 'uncommon', cause: { zh: '尖晶石的颜色里有橙色', en: 'Spinel also comes in orange' } },
      { id: 'red', zh: '红', en: 'Red', hex: '#cf2a40', vivid: 0.5, rarity: 'rare', uv: '#ff2b40', where: { zh: '缅甸莫谷 · 大理岩里', en: 'Mogok, Myanmar · in marble' }, cause: { zh: '纯正的红比纯正的红宝石还难找', en: 'Pure red is said to be rarer than pure red ruby' }, uvNote: { zh: '铬发红光；铁多的深红会弱一些', en: 'Chromium glows red; deep reds with more iron glow less' } },
      { id: 'neon', zh: '霓虹粉', en: 'Neon pink', hex: '#ec6aa6', vivid: 0.5, depth: 0.55, habit: 'twin', rarity: 'rare', uv: '#ff3a6c', where: { zh: '坦桑尼亚马亨盖', en: 'Mahenge, Tanzania' }, cause: { zh: '铬多铁少；尖晶石律双晶，扁扁的三角', en: 'Much chromium, little iron; a flat spinel-law twin' }, uvNote: { zh: '紫外灯下红光最亮', en: 'The brightest red glow under UV' } },
      { id: 'cobalt', zh: '钴蓝', en: 'Cobalt blue', hex: '#2f55d6', rarity: 'mythic', where: { zh: '越南陆安 · 大理岩里的细脉', en: 'Luc Yen, Vietnam · a vein in marble' }, cause: { zh: '颜色来自钴；最稀有的尖晶石颜色', en: 'Coloured by cobalt; the rarest spinel colour' } },
      { id: 'colorless', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'mythic', cause: { zh: '天然无色的尖晶石几乎找不到', en: 'Natural colourless spinel is almost unknown' } },
    ],
  },
  garnet: {
    zh: '石榴石', en: 'Garnet', formula: 'X₃Y₂(SiO₄)₃', sys: { zh: '等轴晶系', en: 'Cubic' }, mohs: '6.5–7.5',
    fact: { zh: '几乎什么颜色都有；翠榴石的色散比钻石还高', en: 'Garnets come in almost every colour; demantoid has more fire than diamond' },
    optics: { ior: 1.78, inner: 0.75, frost: .04, soft: .03, var: .14, clear: .95, terr: .16, step: 7, cleave: 0, lus: 1.1, disp: 2.2 },
    clusters: {
      main: [
        () => [{ R: tilt(.785, .62, 0), t: C0, s: 1.5, form: GAR_D }, { R: tilt(1.1, .75, .3), t: add(C0, [-.9, -.64, .4]), s: .56, form: GAR_D }],
        () => [{ R: tilt(-.3, .95, .4), t: C0, s: 1.55, form: GAR_T }],
        () => [{ R: tilt(1.1, .75, .3), t: add(C0, [.12, .04, 0]), s: 1.3, form: GAR_D }, { R: tilt(.785, .62, 0), t: add(C0, [.92, -.6, .3]), s: .62, form: GAR_T }, { R: tilt(-.3, .95, .4), t: add(C0, [-.86, -.66, -.2]), s: .46, form: GAR_D }],
      ],
      druse: [() => [{ R: tilt(.785, .62, 0), t: add(C0, [0, -.1, 0]), s: .78, form: GAR_D }, { R: tilt(-.3, .95, .4), t: add(C0, [-.92, -.42, .2]), s: .62, form: GAR_D }, { R: tilt(1.1, .75, .3), t: add(C0, [.88, -.5, .1]), s: .66, form: GAR_D }, { R: tilt(.2, 1.1, -.5), t: add(C0, [-.3, -.78, .62]), s: .5, form: GAR_D }, { R: tilt(-.9, .6, .8), t: add(C0, [.42, -.86, -.55]), s: .46, form: GAR_D }]],
    },
    colors: [
      { id: 'almandine', zh: '深红', en: 'Deep red', hex: '#c02a40', depth: 0.75, rarity: 'common', cause: { zh: '铁铝榴石：含铁，紫红到深红，是最常见的红色石榴石', en: 'Almandine: iron-bearing, purplish to deep red; the everyday red garnet' } },
      { id: 'pyrope', zh: '血红', en: 'Blood red', hex: '#d02848', depth: 0.55, rarity: 'common', cause: { zh: '镁铝榴石：纯的是无色的，红色来自混进来的其他成分', en: 'Pyrope: colourless when pure; its red comes from other elements mixed in' } },
      { id: 'hessonite', zh: '桂榴石', en: 'Hessonite', hex: '#d88a48', depth: 0.6, rarity: 'common', cause: { zh: '钙铝榴石里金橙到棕的一种', en: 'A golden orange to brown variety of grossular' } },
      { id: 'rhodolite', zh: '玫瑰紫红', en: 'Rhodolite', hex: '#d0508e', vivid: 0.3, depth: 0.55, rarity: 'uncommon', cause: { zh: '介于镁铝榴石和铁铝榴石之间，玫瑰红到紫红', en: 'Between pyrope and almandine: rose red to purple-red' } },
      { id: 'spessartine', zh: '锰铝橙', en: 'Spessartine', hex: '#e8823e', depth: 0.65, rarity: 'uncommon', cause: { zh: '锰铝榴石：橙色来自锰', en: 'Spessartine: manganese gives the orange' } },
      { id: 'topazolite', zh: '黄榴石', en: 'Topazolite', hex: '#e2c25a', depth: 0.5, rarity: 'uncommon', cause: { zh: '钙铁榴石里黄到黄棕的一种', en: 'A yellow to yellow-brown variety of andradite' } },
      { id: 'melanite', zh: '黑榴石', en: 'Melanite', hex: '#2a2628', depth: 2, rarity: 'uncommon', optics: { clear: .86 }, cause: { zh: '钙铁榴石里黑色的一种', en: 'A black variety of andradite' } },
      { id: 'mandarin', zh: '芬达橙', en: 'Mandarin', hex: '#f6923a', vivid: 0.55, depth: 0.6, rarity: 'rare', where: { zh: '纳米比亚、尼日利亚', en: 'Namibia, Nigeria' }, cause: { zh: '锰铝榴石里最鲜亮的橙，常叫「芬达」', en: 'The most vivid orange spessartine, often called “Fanta”' } },
      { id: 'tsavorite', zh: '沙弗莱', en: 'Tsavorite', hex: '#2e9a58', vivid: 0.55, depth: 0.7, rarity: 'rare', where: { zh: '肯尼亚、坦桑尼亚', en: 'Kenya, Tanzania' }, cause: { zh: '钙铝榴石里翠绿的一种，颜色来自钒和铬', en: 'An emerald-green grossular, coloured by vanadium and chromium' } },
      { id: 'uvarovite', zh: '钙铬榴石', en: 'Uvarovite', hex: '#1f8a48', depth: 1.4, habit: 'druse', rarity: 'rare', cause: { zh: '只有绿色的一种石榴石，晶体小，常一粒粒长成一片', en: 'The garnet that only comes in green; small crystals, often in a glittering crust' } },
      { id: 'mali', zh: '马里黄绿', en: 'Mali garnet', hex: '#cdd46a', depth: 0.55, rarity: 'rare', where: { zh: '马里，1990 年代发现', en: 'Mali, found in the 1990s' }, cause: { zh: '钙铝和钙铁榴石之间，黄到黄绿，火彩比一般的钙铝榴石好', en: 'Between grossular and andradite: yellow to yellow-green, with more fire than plain grossular' } },
      { id: 'demantoid', zh: '翠榴石', en: 'Demantoid', hex: '#4cbc3c', vivid: 0.6, depth: 0.75, rarity: 'mythic', optics: { ior: 1.885, disp: 4.4, lus: 1.9 }, where: { zh: '俄罗斯乌拉尔；纳米比亚也有', en: 'Ural Mountains, Russia; also Namibia' }, cause: { zh: '钙铁榴石里绿的一种，色散 0.057，比钻石的 0.044 还高；乌拉尔的里面常有一束像马尾一样散开的纤维', en: 'Green andradite with dispersion 0.057, above diamond’s 0.044; Ural stones often hold a fan of fibres like a horse’s tail' } },
      { id: 'colorchange', zh: '变色蓝榴石', en: 'Colour-change', hex: '#5f86a6', depth: 0.7, inc: { hex: '#94508c', note: { zh: '白炽灯下变成紫红', en: 'Turns purplish red under incandescent light' } }, rarity: 'mythic', where: { zh: '马达加斯加贝基利，1990 年代末发现', en: 'Bekily, Madagascar, found in the late 1990s' }, cause: { zh: '镁铝和锰铝榴石之间，日光下偏蓝，灯光下变紫红；最少见的石榴石', en: 'Pyrope–spessartine that looks bluish in daylight and purplish red in lamplight; the rarest garnet' } },
    ],
  },
  diamond: {
    zh: '金刚石', en: 'Diamond', formula: 'C', sys: { zh: '等轴晶系', en: 'Cubic' }, mohs: 10,
    fact: { zh: '大约三成的钻石在长波紫外灯下发光，多数是蓝光', en: 'About a third of diamonds glow under long-wave UV, mostly blue' },
    optics: { ior: 2.417, inner: 0.8, etch: .8, etchT: 0, frost: .02, soft: .03, var: .1, clear: .99, terr: .22, step: 6, cleave: 0, lus: 2.4, disp: 3.8 },
    clusters: {
      main: [
        () => [{ R: tilt(-.45, .4, .15), t: C0, s: 1.5, form: DIA_O }, { R: tilt(.9, -.3, .6), t: add(C0, [.84, -.6, .38]), s: .5, form: DIA_O }],
        () => [{ R: tilt(.55, .5, -.2), t: C0, s: 1.45, form: DIA_O }],
      ],
      macle: [() => { const tg = norm([.2, .8, .56]), ax = norm([N111[1] * tg[2] - N111[2] * tg[1], N111[2] * tg[0] - N111[0] * tg[2], N111[0] * tg[1] - N111[1] * tg[0]]), R = mul(rotY(.4), axis(ax, Math.acos(dot(N111, tg)))), h = macleHalves(.32); return [{ R, t: C0, s: 1.75, form: h.up }, { R: mul(R, R180), t: C0, s: 1.75, form: h.down }]; }],
    },
    colors: [
      { id: 'colorless', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'common', uv: '#86aaff', cause: { zh: '纯的碳是无色的', en: 'Pure carbon is colourless' }, uvNote: { zh: '大约三成的钻石在长波紫外灯下发光，其中九成五以上是蓝光', en: 'About a quarter to a third of diamonds glow under long-wave UV; over 95% of those glow blue' } },
      { id: 'cape', zh: '淡黄', en: 'Light yellow', hex: '#f4e8a8', depth: .6, rarity: 'common', cause: { zh: '一点点氮让钻石带黄', en: 'A little nitrogen tints it yellow' } },
      { id: 'brown', zh: '香槟棕', en: 'Champagne', hex: '#c9a07c', depth: .6, habit: 'macle', rarity: 'common', cause: { zh: '彩色钻石里最常见的颜色；可能和晶体里平行的变形纹有关，成因还在研究', en: 'The most common fancy colour; perhaps tied to parallel strain lines in the crystal, still being studied' } },
      { id: 'canary', zh: '浓黄', en: 'Intense yellow', hex: '#f2cf48', depth: .7, rarity: 'uncommon', cause: { zh: '氮越多，黄得越浓', en: 'The more nitrogen, the deeper the yellow' } },
      { id: 'grey', zh: '灰', en: 'Grey', hex: '#a7acb6', rarity: 'uncommon', cause: { zh: '带灰的钻石', en: 'A greyish diamond' } },
      { id: 'black', zh: '黑', en: 'Black', hex: '#2b2a30', depth: 3.2, rarity: 'uncommon', optics: { clear: .7 }, cause: { zh: '看上去是黑的，本体的颜色其实可能接近无色、棕或橄榄绿', en: 'It looks black, but the body colour itself may be near colourless, brown or olive green' } },
      { id: 'pink', zh: '粉', en: 'Pink', hex: '#f2a8c2', depth: .8, rarity: 'rare', cause: { zh: '可能来自晶体里粉色的变形纹和色心，成因还没完全确定', en: 'Perhaps from pink strain lines and colour centres in the crystal; the cause is not settled' } },
      { id: 'blue', zh: '蓝', en: 'Blue', hex: '#7aa6dc', depth: .85, rarity: 'rare', where: { zh: '历史上出自印度；近年南非库里南矿也出过', en: 'Historically India; lately also the Cullinan Mine, South Africa' }, cause: { zh: '硼带来蓝色', en: 'Boron gives the blue' } },
      { id: 'orange', zh: '橙', en: 'Orange', hex: '#f2a25a', depth: .75, rarity: 'mythic', cause: { zh: '红、绿、紫、橙是最稀有的几种', en: 'Red, green, purple and orange are the rarest' } },
      { id: 'green', zh: '绿', en: 'Green', hex: '#86c494', rarity: 'mythic', cause: { zh: '天然的辐射让碳原子挪了位置；德累斯顿绿钻有 41 克拉', en: 'Natural radiation knocked carbon atoms out of place; the Dresden Green weighs 41 carats' } },
      { id: 'purple', zh: '紫', en: 'Purple', hex: '#a07ac8', rarity: 'mythic', cause: { zh: '最稀有的几种之一，紫色和氢有关', en: 'Among the rarest; the purple is linked to hydrogen' } },
      { id: 'red', zh: '红', en: 'Red', hex: '#c83a50', rarity: 'mythic', cause: { zh: '最稀有：1957 到 1987 年，GIA 没出过一张颜色只写「红」的报告', en: 'The rarest: from 1957 to 1987 GIA issued no report with “red” as the only colour term' } },
    ],
  },
  tourmaline: {
    zh: '碧玺', en: 'Tourmaline', formula: 'Na(Li,Al)₃Al₆(BO₃)₃Si₆O₁₈(OH)₄', sys: { zh: '三方晶系', en: 'Trigonal' }, mohs: '7–7.5', axial: .45, axR: [-1.3, 1.75, 0],   // 碧玺沿长轴常常一段一段换颜色：单色的也让两头带一点变化
    fact: { zh: '一根晶体上常常一段一段换颜色', en: 'One crystal often changes colour section by section' },
    optics: { ior: 1.63, inner: 0.75, frost: .05, soft: .03, var: .22, clear: .94, terr: .14, step: 9, cleave: 0, lus: 1.25, disp: 2.2, stri: .7, conch: .5 },
    clusters: {
      main: [
        () => [{ R: tilt(.35, .1, .5), t: add(C0, [.2, .06, 0]), s: 1.22, form: TOUR(1.3, .38) }, { R: tilt(-.6, .16, -.66), t: add(C0, [-1.02, -.55, .42]), s: .7, form: TOUR(1.1, .4) }],
        () => [{ R: tilt(-.25, .08, -.4), t: add(C0, [-.12, .04, 0]), s: 1.18, form: TOUR(1.4, .38) }, { R: tilt(.8, .1, .64), t: add(C0, [.95, -.42, .3]), s: .72, form: TOUR(1.2, .4) }, { R: tilt(-1.3, -.15, -.9), t: add(C0, [-.95, -.72, -.25]), s: .56, form: TOUR(1.1, .4) }],
      ],
      stub: [() => [{ R: tilt(.4, .2, .42), t: C0, s: 1.42, form: TOUR(.85, .48) }, { R: tilt(-.8, .1, -.7), t: add(C0, [-1.0, -.55, .46]), s: .72, form: TOUR(.75, .46) }]],
    },
    colors: [
      { id: 'pink', zh: '粉红', en: 'Pink', hex: '#f29ab8', rarity: 'common', cause: { zh: '粉色和红色来自锰', en: 'Pink and red come from manganese' } },
      { id: 'green', zh: '绿', en: 'Green', hex: '#4f9e6e', rarity: 'common', cause: { zh: '绿色多来自铁，有时加上钛', en: 'Green comes mostly from iron, sometimes with titanium' } },
      { id: 'mint', zh: '薄荷绿', en: 'Mint', hex: '#a3dcc0', rarity: 'common', optics: { clear: .97 }, cause: { zh: '很浅的绿，像海沫', en: 'A very pale, seafoam green' } },
      { id: 'schorl', zh: '黑', en: 'Black', hex: '#26252c', depth: 1.4, rarity: 'common', optics: { clear: .9 }, cause: { zh: '黑碧玺富含铁；碧玺里大约九成五都是它', en: 'Black schorl is rich in iron; it makes up about 95% of all tourmaline' } },
      { id: 'melon', zh: '西瓜碧玺', en: 'Watermelon', hex: '#ef86a8', depth: 1.25, hex2: '#3f9e64', zone: 'melon', axial: 0, rarity: 'uncommon', cause: { zh: '粉红的心，绿色的皮，横着切开像西瓜', en: 'A pink core in a green skin; cut across, it looks like a watermelon' } },
      { id: 'rubellite', zh: '红', en: 'Red', hex: '#d63d62', vivid: 0.45, rarity: 'uncommon', cause: { zh: '浓的粉红到红，也来自锰', en: 'Deep pink to red, also from manganese' } },
      { id: 'indicolite', zh: '蓝', en: 'Blue', hex: '#3f7fc4', rarity: 'uncommon', cause: { zh: '蓝色来自铁', en: 'Blue comes from iron' } },
      { id: 'teal', zh: '蓝绿', en: 'Teal', hex: '#3f9c9a', rarity: 'uncommon', cause: { zh: '绿色和蓝色的成因混在一起', en: 'The causes of green and blue mixed together' } },
      { id: 'peach', zh: '桃色', en: 'Peach', hex: '#f4b49a', rarity: 'uncommon', cause: { zh: '粉里带一点橙', en: 'Pink with a touch of orange' } },
      { id: 'purple', zh: '紫', en: 'Purple', hex: '#ac80cc', rarity: 'uncommon', cause: { zh: '紫到紫红', en: 'Purple to reddish purple' } },
      { id: 'bicolor', zh: '双色', en: 'Bicolour', hex: '#7cbc86', hex2: '#ec88aa', bands: ['#5fae7c', '#68b47e', '#7dbd88', '#cfdcc0', '#f2a4bd', '#ee96b2', '#ea86a8'], rarity: 'uncommon', cause: { zh: '一根晶体两头两种颜色：长的时候周围的成分变了，颜色就跟着变', en: 'Two colours along one crystal: the chemistry around it changed as it grew' } },
      { id: 'tricolor', zh: '三色', en: 'Tricolour', hex: '#5aa676', hex2: '#ec88aa', bands: ['#5aa676', '#66ae80', '#dfece4', '#eef2ee', '#f4b6c8', '#ee9cb6', '#ea86a8'], rarity: 'rare', cause: { zh: '三段颜色，中间常隔着一段几乎无色的', en: 'Three colours along one crystal, often with a nearly colourless band between' } },
      { id: 'rainbow', zh: '彩虹', en: 'Rainbow', hex: '#86c47a', hex2: '#f08cb0', depth: 1.45, sw: ['#e8d470', '#5c94d6'], bands: ['#5c94d6', '#56b4c0', '#84c47a', '#e8d470', '#f4ac80', '#f088b0', '#b896e0'], rarity: 'mythic', cause: { zh: '一根晶体上一段一段换颜色，像彩虹', en: 'Colour after colour along one crystal, like a rainbow' } },
      { id: 'canary', zh: '金丝雀黄', en: 'Canary', hex: '#f2da58', depth: .4, habit: 'stub', rarity: 'rare', cause: { zh: '明亮的黄，碧玺里少见', en: 'A bright yellow, uncommon in tourmaline' } },
      { id: 'chrome', zh: '铬绿', en: 'Chrome green', hex: '#2f9a52', vivid: 0.5, habit: 'stub', rarity: 'rare', where: { zh: '坦桑尼亚', en: 'Tanzania' }, cause: { zh: '叫铬碧玺，其实主要是钒上的色，和许多巴西、非洲的祖母绿一样', en: 'Called chrome tourmaline, but coloured mostly by vanadium, like many Brazilian and African emeralds' } },
      { id: 'paraiba', zh: '帕拉伊巴', en: 'Paraíba', hex: '#2ccad0', vivid: 1, depth: .85, glow: '#8ff3ec', glowK: 1.25, rarity: 'mythic', where: { zh: '巴西帕拉伊巴州；后来尼日利亚、莫桑比克也找到了含铜的', en: 'Paraíba, Brazil; copper-bearing stones later found in Nigeria and Mozambique' }, cause: { zh: '霓虹一样的蓝绿来自铜，铜在别的碧玺里不上色', en: 'The neon blue-green comes from copper, which colours no other tourmaline' } },
      { id: 'achroite', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'mythic', cause: { zh: '无色的碧玺很少见', en: 'Colourless tourmaline is rare' } },
    ],
  },
  corundum: {
    zh: '刚玉', en: 'Corundum', formula: 'Al₂O₃', sys: { zh: '三方晶系', en: 'Trigonal' }, mohs: 9,
    fact: { zh: '红宝石和蓝宝石都是刚玉，只是颜色不同', en: 'Ruby and sapphire are both corundum, in different colours' },
    axial: .3, axR: [-1.3, 1.3, 0],
    optics: { ior: 1.765, inner: 0.75, frost: .03, soft: .03, var: .15, clear: .97, terr: .1, step: 6, cleave: 0, lus: 1.6, disp: 2.3 },
    clusters: {
      main: [
        () => [{ R: tilt(.35, .3, .32), t: C0, s: 1.42, form: BARREL(1.3) }],
        () => [{ R: tilt(-.4, .22, -.25), t: add(C0, [-.12, .06, 0]), s: 1.36, form: BARREL(1.25, .62, .17) }, { R: tilt(.8, .5, .7), t: add(C0, [.98, -.66, .4]), s: .64, form: BARREL(1.1, .6, .22) }],
      ],
      tab: [
        () => [{ R: tilt(.3, .3, .2), t: add(C0, [.08, .04, 0]), s: 1.3, form: BERYL(.32, .82, .07) }, { R: tilt(-.6, .45, .5), t: add(C0, [-1.0, -.62, .5]), s: .6, form: BERYL(.32, .8, .07) }],
        () => [{ R: tilt(-.2, .22, -.26), t: C0, s: 1.35, form: BERYL(.26, .82, .06) }],
      ],
    },
    colors: [
      { id: 'blue', zh: '蓝宝石', en: 'Blue sapphire', hex: '#3b5fc4', vivid: 0.3, depth: 0.9, rarity: 'common', cause: { zh: '蓝色来自铁和钛之间的电荷转移', en: 'Blue comes from charge transfer between iron and titanium' } },
      { id: 'yellow', zh: '黄', en: 'Yellow', hex: '#f4d060', depth: .32, rarity: 'common', cause: { zh: '黄色多来自三价铁', en: 'Yellow comes mostly from ferric iron' } },
      { id: 'pink', zh: '粉', en: 'Pink', hex: '#f39ab8', depth: .8, rarity: 'uncommon', cause: { zh: '粉色来自铬，再加一点铁', en: 'Pink comes from chromium with a little iron' } },
      { id: 'ruby', zh: '红宝石', en: 'Ruby', hex: '#dc2c4c', vivid: 0.6, habit: 'tab', rarity: 'uncommon', uv: '#ff2a3a', cause: { zh: '铬带来红色，也让它在紫外灯下发红光', en: 'Chromium makes it red, and makes it glow red under UV' }, uvNote: { zh: '铬发红光；铁多的红宝石荧光弱', en: 'Chromium glows red; rubies with more iron glow less' } },
      { id: 'purple', zh: '紫', en: 'Purple', hex: '#8a4fb8', rarity: 'uncommon', cause: { zh: '铬加上铁和钛', en: 'Chromium with iron and titanium' } },
      { id: 'green', zh: '绿', en: 'Green', hex: '#4f8f6a', rarity: 'uncommon', cause: { zh: '绿色来自铁', en: 'Green comes from iron' } },
      { id: 'white', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'uncommon', cause: { zh: '最纯的刚玉是无色的', en: 'In its purest state, corundum is colourless' } },
      { id: 'orange', zh: '橙', en: 'Orange', hex: '#f2984a', depth: .55, rarity: 'rare', cause: { zh: '纯正的橙色少见', en: 'Pure orange is rare' } },
      { id: 'pigeon', zh: '鸽血红', en: 'Pigeon’s blood', hex: '#d4163a', vivid: 0.85, habit: 'tab', glow: '#ff5a6e', glowK: 0.45, rarity: 'rare', uv: '#ff2236', where: { zh: '缅甸莫谷', en: 'Mogok, Myanmar' }, cause: { zh: '铬多铁少，荧光强，像从里面亮起来', en: 'Much chromium, little iron: a strong glow, as if lit from within' }, uvNote: { zh: '红光很强，阳光下也看得出', en: 'A strong red glow, visible even in sunlight' } },
      { id: 'padpa', zh: '帕帕拉恰', en: 'Padparadscha', hex: '#f5aa96', vivid: 0.35, depth: .5, rarity: 'mythic', uv: '#ff8a4a', where: { zh: '斯里兰卡', en: 'Sri Lanka' }, cause: { zh: '粉里带橙、橙里带粉，颜色柔和', en: 'Pinkish orange to orangey pink, in soft tones' }, uvNote: { zh: '有的在紫外灯下发橙光', en: 'Some glow orange under UV' } },
      { id: 'parti', zh: '多色蓝宝石', en: 'Parti sapphire', hex: '#6a9ab0', depth: .75, sw: ['#4a6cc4', '#e8cc62'], bands: ['#4a6cc4', '#4f7cc0', '#5e9ca0', '#7cb08c', '#d4cc7a', '#e6c860', '#e8c85c'], rarity: 'rare', where: { zh: '澳大利亚；美国蒙大拿也有', en: 'Australia; also Montana, USA' }, cause: { zh: '一块石头里分出蓝、绿、黄几个色区：长的时候铁和钛进得不均匀', en: 'Separate blue, green and yellow zones in one stone: iron and titanium went in unevenly as it grew' } },
      { id: 'kashmir', zh: '克什米尔蓝', en: 'Kashmir blue', hex: '#5a7ae0', vivid: 0.45, depth: 0.75, rarity: 'mythic', optics: { frost: .14, clear: .9 }, cause: { zh: '像丝绒一样微微朦胧的蓝，来自极细的包裹体', en: 'A velvety, slightly sleepy blue from tiny inclusions' } },
    ],
  },
  quartz: {
    zh: '石英', en: 'Quartz', formula: 'SiO₂', sys: { zh: '三方晶系', en: 'Trigonal' }, mohs: 7, axial: .25, axR: [-1.05, 1.5, 0],
    fact: { zh: '玫瑰水晶不长晶面；能长成透明晶体的粉色石英叫粉水晶', en: 'Rose quartz never grows faces; pink quartz that forms clear crystals is called pink quartz' },
    optics: { ior: 1.544, inner: 0.75, frost: .03, soft: .03, var: .12, clear: .97, terr: .2, step: 9, cleave: 0, lus: 1.1, disp: 1.0, stri: .5, striD: 1, conch: 1 },
    clusters: {
      main: [
        () => [{ R: tilt(.4, .22, .3), t: add(C0, [.1, .02, 0]), s: 1.35, form: QTZ(1.15) }, { R: tilt(-.7, .2, -.5), t: add(C0, [-.9, -.6, .4]), s: .66, form: QTZ(1.0, .4) }, { R: tilt(1.2, .3, .7), t: add(C0, [.86, -.66, -.3]), s: .5, form: QTZ(.9, .38) }],
        () => [{ R: tilt(-.3, .3, -.42), t: C0, s: 1.3, form: QTZ(.85, .44, true) }],
      ],
      block: [() => [{ R: tilt(.35, .3, .1), t: C0, s: 1.55, form: RQB }], () => [{ R: tilt(-.5, .5, .3), t: C0, s: 1.45, form: RQB }, { R: tilt(.9, .2, -.6), t: add(C0, [.92, -.6, .3]), s: .55, form: RQB }]],
      rosexl: [() => [{ R: tilt(.3, .12, .14), t: add(C0, [.04, .46, .02]), s: .9, form: QTZ(.36, .46) }, { R: tilt(-.9, .5, .62), t: add(C0, [-.4, .08, .24]), s: .74, form: QTZ(.3, .44) }, { R: tilt(1.3, .42, -.7), t: add(C0, [.42, -.04, -.14]), s: .7, form: QTZ(.3, .44) }, { R: tilt(.2, .3, 2.7), t: add(C0, [-.02, -.58, .1]), s: .8, form: QTZ(.34, .46) }, { R: tilt(-.4, .9, -.3), t: add(C0, [.3, .98, -.2]), s: .55, form: QTZ(.32, .42) }]],   // 粉色石英晶簇：一簇短而尖的小晶体，往上下两头长，像一根小柱子
      small: [() => [{ R: tilt(.3, .25, .2), t: add(C0, [0, .05, 0]), s: 1.0, form: QTZ(1.0, .4) }, { R: tilt(-.8, .3, -.6), t: add(C0, [-.72, -.48, .3]), s: .7, form: QTZ(.95, .4) }, { R: tilt(1.0, .2, .6), t: add(C0, [.7, -.55, -.25]), s: .62, form: QTZ(.9, .38) }, { R: tilt(-.2, .5, .9), t: add(C0, [.15, -.8, .5]), s: .48, form: QTZ(.8, .36) }]],
    },
    colors: [
      { id: 'rock', zh: '白水晶', en: 'Rock crystal', hex: '#f5f7fb', rarity: 'common', cause: { zh: '纯的二氧化硅是无色的；石英是地壳里最常见的矿物之一', en: 'Pure silica is colourless; quartz is one of the most abundant minerals in the crust' } },
      { id: 'smoky', zh: '烟晶', en: 'Smoky quartz', hex: '#8a7a6c', depth: .9, rarity: 'common', cause: { zh: '茶色到近黑，来自铝和天然的辐射形成的色心', en: 'Tea-brown to nearly black, from colour centres made by aluminium and natural radiation' } },
      { id: 'amethyst', zh: '紫水晶', en: 'Amethyst', hex: '#9a6cc8', rarity: 'common', cause: { zh: '紫色来自晶格里的铁，再经过天然的辐射', en: 'The violet comes from iron in the lattice, set by natural radiation' } },
      { id: 'rose', zh: '玫瑰水晶', en: 'Rose quartz', hex: '#f7c2ce', vivid: 0.7, depth: 0.55, habit: 'block', rarity: 'uncommon', phantom: 0, glow: '#ffe2ec', glowK: 0.6, optics: { frost: .75, clear: .42, inner: .35, terr: 0, var: .06, lus: .8 }, cause: { zh: '没有晶面的致密块体，柔柔的粉、雾雾的；颜色来自极细的、和蓝线石相近的纤维。有招桃花的美好寓意', en: 'A massive piece with no crystal faces, soft pink and misty; the colour comes from tiny fibres related to dumortierite. Long given the sweet meaning of drawing love' } },
      { id: 'finerose', zh: '冰透玫瑰', en: 'Fine rose quartz', hex: '#f6b0c6', vivid: 0.7, depth: 0.6, habit: 'block', rarity: 'rare', phantom: 0, glow: '#ffd8e6', glowK: 0.5, optics: { frost: .45, clear: .65, inner: .4, terr: 0, var: .06, lus: .9 }, where: { zh: '巴西米纳斯吉拉斯，加利莱亚附近；马达加斯加', en: 'Near Galiléia, Minas Gerais, Brazil; Madagascar' }, cause: { zh: '颜色更浓、更通透的玫瑰水晶，最好的常被留作标本，拍卖价很高', en: 'Deeper, clearer rose quartz; the finest is often kept as specimens and sells high at auction' } },
      { id: 'starrose', zh: '星光玫瑰水晶', en: 'Star rose quartz', hex: '#f6bccb', vivid: 0.6, depth: 0.65, habit: 'block', rarity: 'mythic', phantom: 0, ast: 1, glow: '#ffd8e2', glowK: 0.5, optics: { frost: .65, clear: .5, inner: .35, terr: 0, var: .06, lus: .8 }, where: { zh: '巴西、马达加斯加', en: 'Brazil, Madagascar' }, cause: { zh: '里面的纤维顺着三个方向排开，光一照，浮出一颗六道光的星；转动时星跟着走', en: 'Its fibres lie in three directions, so light raises a six-rayed star that follows as you turn it' } },
      { id: 'pinkq', zh: '粉水晶', en: 'Pink quartz', hex: '#f9c8c6', hex2: '#f4b0b0', zone: 'core', vivid: 0.8, depth: .1, habit: 'rosexl', glow: '#ffe6e8', glowK: 1.3, hidC: ['#f8c6c2', '#f8c0cc', '#efc6e0', '#fcdcd4'], hidA: .24, optics: { clear: .99, frost: .01, inner: .9, lus: 1.35, disp: 1.5, gem: .5 }, rarity: 'rare', where: { zh: '巴西；马达加斯加也出过', en: 'Brazil; also Madagascar' }, cause: { zh: '能长成透明晶体的粉色石英，很少见；颜色来自铝和磷取代硅后经辐射形成的色心，见光会慢慢褪色', en: 'Pink quartz that grows as clear crystals, and is rare; its colour centre comes from aluminium and phosphorus plus radiation, and it fades in light' } },
      { id: 'citrine', zh: '黄水晶', en: 'Citrine', hex: '#f0cc6a', depth: .6, rarity: 'rare', cause: { zh: '天然的黄水晶很少，多是淡黄；市面上的大多是紫水晶或烟晶加热出来的', en: 'Natural citrine is rare and usually pale; most on the market is heated amethyst or smoky quartz' } },
      { id: 'ametrine', zh: '紫黄晶', en: 'Ametrine', hex: '#b88ab0', sw: ['#a678d0', '#f0c458'], bands: ['#a070cc', '#a678d0', '#b086cc', '#f2d47a', '#f0c458'], rarity: 'rare', where: { zh: '玻利维亚阿纳伊矿，几乎是唯一的商业产地', en: 'Anahí Mine, Bolivia, almost the only commercial source' }, cause: { zh: '一颗晶体里一半紫一半黄：长的时候温度高的部分成了黄水晶，温度低的部分留成紫水晶', en: 'Half violet, half gold in one crystal: the parts that grew hotter turned citrine, the cooler parts stayed amethyst' } },
      { id: 'prasiolite', zh: '绿水晶', en: 'Prasiolite', hex: '#b8d8a0', depth: .6, rarity: 'mythic', cause: { zh: '紫水晶加热到一定温度会变绿；天然的绿水晶非常少', en: 'Amethyst heated to the right temperature turns green; natural prasiolite is very rare' } },
    ],
  },
  beryl: {
    zh: '绿柱石', en: 'Beryl', formula: 'Be₃Al₂Si₆O₁₈', sys: { zh: '六方晶系', en: 'Hexagonal' }, mohs: '7.5–8',
    fact: { zh: '祖母绿、海蓝宝、摩根石都是绿柱石', en: 'Emerald, aquamarine and morganite are all beryl' },
    axial: .35, axR: [-1.35, 1.35, 0],
    optics: { ior: 1.575, inner: 0.75, stri: .35, conch: .55, frost: .04, soft: .03, var: .1, clear: .96, terr: .12, step: 8, cleave: 0, lus: 1.1, disp: 1.8 },
    clusters: {
      main: [
        () => [{ R: tilt(.45, .2, .26), t: add(C0, [.1, 0, 0]), s: 1.38, form: BERYL(1.35) }, { R: tilt(-.5, .25, -.48), t: add(C0, [-.92, -.6, .42]), s: .74, form: BERYL(1.15, .48) }],
        () => [{ R: tilt(-.35, .16, -.18), t: C0, s: 1.42, form: BERYL(1.3, .52, .14) }],
      ],
      stub: [
        () => [{ R: tilt(.4, .55, .2), t: C0, s: 1.55, form: BERYL(.48, .72, .1) }, { R: tilt(-.7, .4, -.4), t: add(C0, [1.08, -.66, .4]), s: .68, form: BERYL(.5, .7, .1) }],
      ],
    },
    colors: [
      { id: 'aqua', zh: '海蓝宝', en: 'Aquamarine', hex: '#94d6ee', glowK: 0.22, glow: '#dcf6ff', vivid: 0.7, depth: 0.5, rarity: 'common', optics: { clear: .98 }, cause: { zh: '蓝色来自铁', en: 'Blue comes from iron' } },
      { id: 'green', zh: '浅绿', en: 'Green beryl', hex: '#a8d8a0', rarity: 'common', cause: { zh: '浅浅的绿，比祖母绿淡', en: 'A light green, paler than emerald' } },
      { id: 'goshen', zh: '无色', en: 'Goshenite', hex: '#f5f7fb', rarity: 'common', cause: { zh: '纯的绿柱石是无色的；最早在美国马萨诸塞州的戈申发现', en: 'Pure beryl is colourless; first found at Goshen, Massachusetts' } },
      { id: 'helio', zh: '金绿柱石', en: 'Heliodor', hex: '#ecdc6a', depth: .45, rarity: 'uncommon', cause: { zh: '黄色来自三价铁；名字在希腊语里是「太阳的礼物」', en: 'Yellow from ferric iron; the name is Greek for “gift from the sun”' } },
      { id: 'golden', zh: '金黄', en: 'Golden beryl', hex: '#f2bf52', depth: .42, rarity: 'uncommon', cause: { zh: '黄到橙黄，也来自铁', en: 'Yellow to orangey yellow, also from iron' } },
      { id: 'morgan', zh: '摩根石', en: 'Morganite', hex: '#f4b8b0', habit: 'stub', rarity: 'uncommon', cause: { zh: '粉到桃色来自锰；以收藏家 J. P. 摩根命名', en: 'Pink to peach from manganese; named after the collector J. P. Morgan' } },
      { id: 'aquamorgan', zh: '粉身蓝顶', en: 'Pink with a blue cap', hex: '#f2bcb4', sw: ['#f4b8b0', '#86c0e2'], bands: ['#f4b4ac', '#f4b8b0', '#f4bab2', '#f2c0b8', '#f0c8c4', '#a8d0e6', '#86c0e2'], rarity: 'rare', where: { zh: '巴西米纳斯吉拉斯，上世纪六十年代', en: 'Minas Gerais, Brazil, in the 1960s' }, cause: { zh: '一根晶体身子是粉的摩根石，顶上戴一顶蓝的海蓝宝帽子；这样的双色绿柱石很少见', en: 'A pink morganite body under a blue aquamarine cap; bicoloured beryl like this is rare' } },
      { id: 'emerald', zh: '祖母绿', en: 'Emerald', hex: '#18a463', vivid: 0.65, depth: 0.85, rarity: 'uncommon', uv: '#a8404c', optics: { frost: .09, clear: .93 }, cause: { zh: '铬和钒带来绿色', en: 'Chromium and vanadium make it green' }, uvNote: { zh: '天然祖母绿在长波紫外灯下常有弱到中等的红光', en: 'Natural emeralds often show a weak to moderate red glow under long-wave UV' } },
      { id: 'deepaqua', zh: '深海蓝', en: 'Deep aquamarine', hex: '#4aa4dc', vivid: 0.6, depth: 0.85, rarity: 'rare', cause: { zh: '同样来自铁，颜色更浓，更少见', en: 'Also from iron, deeper and rarer' } },
      { id: 'etched', zh: '溶蚀海蓝宝', en: 'Etched aquamarine', hex: '#22c3ba', glow: '#8ef5ea', glowK: 0.4, vivid: 0.9, depth: .72, etch: .85, etchT: 2, rarity: 'rare', optics: { clear: .97, stri: .8 }, where: { zh: '巴基斯坦开伯尔-普赫图赫瓦、中国新疆都有记录；乌克兰沃伦的绿柱石也以大蚀坑出名', en: 'Recorded from Khyber Pakhtunkhwa, Pakistan, and Xinjiang, China; beryl from Volyn, Ukraine is known for its large etch pits' }, cause: { zh: '晶体长好以后又被后来的流体溶蚀：底面上是六边形的蚀坑，柱面上是顺着长轴压扁的六边形', en: 'Dissolved by later fluids after it grew: hexagonal pits on the basal face, hexagons squeezed along the length on the prism faces' } },
      { id: 'maxixe', zh: '深蓝', en: 'Maxixe blue', hex: '#2f4fb0', rarity: 'rare', cause: { zh: '很深的蓝；见光或受热会慢慢褪色', en: 'A very deep blue that slowly fades in light or heat' } },
      { id: 'red', zh: '红色绿柱石', en: 'Red beryl', hex: '#c8304f', habit: 'stub', rarity: 'mythic', where: { zh: '美国犹他州 · 瓦瓦山', en: 'Wah Wah Mountains, Utah' }, cause: { zh: '锰带来树莓一样的红；几乎只在瓦瓦山找到，晶体很小', en: 'Manganese gives a raspberry red; found almost only in the Wah Wah Mountains, in small crystals' } },
    ],
  },
  apatite: {
    zh: '磷灰石', en: 'Apatite', formula: 'Ca₅(PO₄)₃(F,Cl,OH)', sys: { zh: '六方晶系', en: 'Hexagonal' }, mohs: 5,
    fact: { zh: '霓虹蓝绿的磷灰石常被拿来和帕拉伊巴碧玺比', en: 'Neon blue-green apatite is often compared with Paraíba tourmaline' },
    axial: .35, axR: [-1.15, 1.4, 0],
    optics: { ior: 1.635, inner: 0.75, conch: .6, frost: .06, soft: .03, var: .18, clear: .94, terr: .12, step: 7, cleave: 0, lus: 1.2, disp: 1.7 },
    clusters: {
      main: [
        () => [{ R: tilt(.4, .2, .3), t: add(C0, [.08, .02, 0]), s: 1.35, form: APAT(1.15, .48) }, { R: tilt(-.6, .25, -.55), t: add(C0, [-.95, -.58, .42]), s: .7, form: APAT(1.0, .46) }],
        () => [{ R: tilt(-.35, .14, -.3), t: C0, s: 1.4, form: APAT(1.1, .5) }],
      ],
      stub: [() => [{ R: tilt(.5, .35, .35), t: C0, s: 1.45, form: APAT(.7, .55) }, { R: tilt(-.8, .3, -.6), t: add(C0, [-1.0, -.55, .45]), s: .72, form: APAT(.6, .52) }, { R: tilt(1.2, .2, .7), t: add(C0, [.95, -.62, -.2]), s: .55, form: APAT(.6, .52) }]],
    },
    colors: [
      { id: 'yellow', zh: '黄', en: 'Yellow', hex: '#f0d660', depth: .45, habit: 'stub', rarity: 'common', uv: '#e48ad0', where: { zh: '墨西哥', en: 'Mexico' }, cause: { zh: '明亮的黄', en: 'A bright yellow' }, uvNote: { zh: '紫外灯下发紫粉色的光，长波下更亮', en: 'Glows purplish pink under UV, brighter in long-wave' } },
      { id: 'green', zh: '绿', en: 'Green', hex: '#7cbf72', rarity: 'common', uv: '#d4ee6a', cause: { zh: '磷灰石最常见的颜色之一', en: 'One of apatite’s most common colours' }, uvNote: { zh: '紫外灯下发绿黄色的光', en: 'Glows greenish yellow under UV' } },
      { id: 'mint', zh: '海沫绿', en: 'Seafoam', hex: '#a6dcc6', rarity: 'common', optics: { clear: .97 }, cause: { zh: '浅浅的海沫绿', en: 'A pale seafoam green' } },
      { id: 'blue', zh: '蓝', en: 'Blue', hex: '#4f8fd0', vivid: 0.4, glow: '#9cc8ff', glowK: .3, rarity: 'uncommon', uv: '#86b4ff', cause: { zh: '各种深浅的蓝都有', en: 'Found in almost every shade of blue' }, uvNote: { zh: '紫外灯下发蓝到浅蓝的光', en: 'Glows blue to light blue under UV' } },
      { id: 'colorless', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'uncommon', cause: { zh: '纯的磷灰石是无色的', en: 'Pure apatite is colourless' } },
      { id: 'violet', zh: '紫', en: 'Violet', hex: '#9a74c8', rarity: 'rare', uv: '#d4ee6a', cause: { zh: '紫色的磷灰石少见', en: 'Violet apatite is uncommon' }, uvNote: { zh: '长波紫外灯下常发绿黄色的光', en: 'Often glows greenish yellow under long-wave UV' } },
      { id: 'pink', zh: '粉', en: 'Pink', hex: '#f2a8c0', rarity: 'rare', cause: { zh: '粉色的磷灰石少见', en: 'Pink apatite is uncommon' } },
      { id: 'neon', zh: '霓虹蓝绿', en: 'Neon blue-green', hex: '#20d6cf', vivid: 1, glow: '#70fbef', glowK: 1, rarity: 'mythic', where: { zh: '马达加斯加', en: 'Madagascar' }, cause: { zh: '电光一样的蓝绿，常被拿来和帕拉伊巴碧玺比', en: 'An electric blue-green, often compared with Paraíba tourmaline' } },
    ],
  },
  topaz: {
    zh: '黄玉', en: 'Topaz', formula: 'Al₂SiO₄(F,OH)₂', sys: { zh: '斜方晶系', en: 'Orthorhombic' }, mohs: 8,
    fact: { zh: '市面上的蓝黄玉几乎都是无色的经过辐照再加热', en: 'Almost all blue topaz sold is colourless topaz, irradiated and heated' },
    axial: .35, axR: [-1.1, 1.46, 0],
    optics: { ior: 1.62, inner: 0.75, stri: .5, frost: .03, soft: .03, var: .1, clear: .97, terr: .15, step: 7, cleave: 0, lus: 1.2, disp: 1.8 },
    clusters: {
      main: [
        () => [{ R: tilt(.5, .2, .3), t: add(C0, [.06, .02, 0]), s: 1.3, form: TOPAZ(1.1) }, { R: tilt(-.7, .25, -.55), t: add(C0, [-.98, -.6, .42]), s: .62, form: TOPAZ(.9) }],
        () => [{ R: tilt(-.3, .16, -.26), t: C0, s: 1.35, form: TOPAZ(1.0) }],
      ],
    },
    colors: [
      { id: 'colorless', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'common', cause: { zh: '天然的黄玉大多数是无色的', en: 'Most natural topaz is colourless' } },
      { id: 'champagne', zh: '淡黄', en: 'Pale yellow', hex: '#f2e2a8', depth: 0.42, rarity: 'common', cause: { zh: '最常见的天然颜色之一', en: 'One of the most common natural colours' } },
      { id: 'sherry', zh: '雪莉酒色', en: 'Sherry', hex: '#d8a070', depth: 0.42, rarity: 'common', cause: { zh: '黄里带棕，像雪莉酒', en: 'Yellow with a touch of brown, like sherry' } },
      { id: 'golden', zh: '金橙', en: 'Golden', hex: '#f2b450', depth: 0.36, rarity: 'uncommon', cause: { zh: '黄到橙，常叫「珍贵黄玉」', en: 'Yellow to orange, often called “precious” topaz' } },
      { id: 'green', zh: '淡绿', en: 'Pale green', hex: '#c4e2b8', depth: 0.5, rarity: 'uncommon', cause: { zh: '很淡的绿', en: 'A very pale green' } },
      { id: 'blue', zh: '天然淡蓝', en: 'Natural pale blue', hex: '#cde6f6', depth: 0.36, rarity: 'rare', cause: { zh: '天然的蓝很少，通常很淡；市面上的蓝黄玉几乎都是无色的经过辐照再加热', en: 'Natural blue is rare and usually pale; almost all blue topaz in shops is irradiated and heated colourless topaz' } },
      { id: 'imperial', zh: '帝王黄玉', en: 'Imperial', hex: '#f5a462', vivid: 0.35, depth: 0.45, rarity: 'rare', where: { zh: '巴西 · 欧鲁普雷图', en: 'Ouro Preto, Brazil' }, cause: { zh: '橙到粉橙；据说 1881 年巴西皇帝佩德罗二世到访时收到一块，从此叫「帝王」', en: 'Orange to pinkish orange; said to be named “imperial” after Emperor Pedro II was given one in 1881' } },
      { id: 'imp2', zh: '橙到粉', en: 'Orange to pink', hex: '#f4ae86', sw: ['#f6c08a', '#ee9aa0'], bands: ['#f6c08a', '#f6bc88', '#f4b484', '#f4ae86', '#f2a88a', '#f0a092', '#ee9aa0'], depth: .55, rarity: 'rare', where: { zh: '巴西 · 欧鲁普雷图', en: 'Ouro Preto, Brazil' }, cause: { zh: '一根晶体底下是浅橙，到尖上变成粉橙', en: 'Light orange at the base, turning pinkish orange at the tip' } },
      { id: 'pink', zh: '粉', en: 'Pink', hex: '#f4b2c4', depth: 0.42, rarity: 'mythic', cause: { zh: '天然粉色极少；粉和红来自铬', en: 'Natural pink is extremely rare; pink and red come from chromium' } },
      { id: 'red', zh: '红', en: 'Red', hex: '#d8506a', depth: 0.62, rarity: 'mythic', where: { zh: '巴西 · 有些晶体的尖上', en: 'Brazil · the tips of some crystals' }, cause: { zh: '红色的黄玉极其少见', en: 'Red topaz is exceedingly rare' } },
    ],
  },
  chrysoberyl: {
    zh: '金绿宝石', en: 'Chrysoberyl', formula: 'BeAl₂O₄', sys: { zh: '斜方晶系', en: 'Orthorhombic' }, mohs: 8.5,
    fact: { zh: '亚历山大变石日光下是绿，白炽灯下变红', en: 'Alexandrite is green in daylight and red under incandescent light' },
    optics: { ior: 1.75, inner: 0.75, frost: .04, soft: .03, var: .15, clear: .95, terr: .2, step: 6, cleave: 0, lus: 1.5, disp: 1.9 },
    clusters: {
      main: [
        () => { const R = tilt(.3, .55, .18); return [0, 1, 2].map(k => ({ R: mul(R, rotY(k * Math.PI / 3)), t: C0, s: 1.35, form: CHRY() })); },   // 三连晶：三块板转着 60° 长在一起，看起来像六边形，边上有凹口
        () => { const R = tilt(-.4, .45, -.2); return [{ R, t: C0, s: 1.3, form: CHRY(.62, .24, .62) }, { R: mul(R, rotY(Math.PI / 3)), t: C0, s: 1.3, form: CHRY(.62, .24, .62) }]; },   // V 形双晶：只有两块
      ],
      single: [() => [{ R: tilt(.4, .42, .3), t: C0, s: 1.4, form: CHRY(.6, .36, .7) }, { R: tilt(-.7, .4, -.4), t: add(C0, [-.95, -.6, .45]), s: .6, form: CHRY(.6, .34, .7) }]],
    },
    colors: [
      { id: 'yellowgreen', zh: '黄绿', en: 'Yellow-green', hex: '#d0dc66', vivid: 0.7, depth: 0.32, rarity: 'common', cause: { zh: '普通的金绿宝石是黄绿色，颜色来自铁', en: 'Ordinary chrysoberyl is yellowish green, coloured by iron' } },
      { id: 'honey', zh: '蜜黄', en: 'Honey', hex: '#eec25a', vivid: 0.6, depth: 0.3, rarity: 'common', cause: { zh: '蜜一样的黄', en: 'A honey yellow' } },
      { id: 'brown', zh: '金棕', en: 'Golden brown', hex: '#c89a58', depth: 0.45, rarity: 'common', cause: { zh: '黄到金棕', en: 'Yellow to golden brown' } },
      { id: 'lemon', zh: '柠檬黄', en: 'Lemon', hex: '#eee070', vivid: 0.6, depth: 0.3, habit: 'single', rarity: 'uncommon', cause: { zh: '清亮的柠檬黄', en: 'A clear lemon yellow' } },
      { id: 'green', zh: '绿', en: 'Green', hex: '#8fbf6a', vivid: 0.6, depth: 0.5, rarity: 'uncommon', cause: { zh: '偏绿的金绿宝石', en: 'A greener chrysoberyl' } },
      { id: 'catseye', zh: '猫眼', en: 'Cat’s-eye', hex: '#dcc070', depth: 0.4, habit: 'single', rarity: 'rare', optics: { frost: .3, clear: .82 }, where: { zh: '斯里兰卡', en: 'Sri Lanka' }, cause: { zh: '平行的细针状包裹体，让磨成弧面的石头上浮起一道光；「蜜和奶」的颜色最好', en: 'Parallel needle-like inclusions raise a line of light on a cabochon; “milk and honey” is the finest colour' } },
      { id: 'alexandrite', zh: '亚历山大变石', en: 'Alexandrite', hex: '#3f9a7c', pl: .78, plAx: ['#2e9a78', '#e2a03c', '#b8406e'], inc: { hex: '#a83c66', plAx: ['#9a3a78', '#d8883c', '#b83a54'], note: { zh: '白炽灯下变成红到紫红：它在绿和红两处都透光，日光偏蓝绿就看起来绿，灯光偏红就看起来红', en: 'Under incandescent light it turns red to purplish red: it lets through both green and red, so bluish daylight makes it look green and reddish lamplight makes it look red' } }, rarity: 'mythic', uv: '#ff3a48', cause: { zh: '铬让它日光下是绿，白炽灯下变成红到紫红；转动时还能分别看到绿、橙黄、紫红三种颜色', en: 'Chromium makes it green in daylight and red to purplish red under incandescent light; turning it also shows green, orange-yellow and purplish red' }, uvNote: { zh: '铬在长波紫外灯下发红光', en: 'Chromium glows red under long-wave UV' } },
    ],
  },
  zoisite: {
    zh: '坦桑石', en: 'Tanzanite', formula: 'Ca₂Al₃(SiO₄)(Si₂O₇)O(OH)', sys: { zh: '斜方晶系', en: 'Orthorhombic' }, mohs: '6–7',
    fact: { zh: '转着看，同一颗会在蓝和紫之间换', en: 'Turn it and the same crystal shifts between blue and violet' },
    optics: { ior: 1.69, inner: 0.75, frost: .03, soft: .03, var: .1, clear: .97, terr: .22, step: 12, cleave: 0, lus: 1.2, disp: 1.4, stri: .9, conch: .45 },
    clusters: {
      main: [
        () => [{ R: tilt(.45, .2, .3), t: add(C0, [.06, .02, 0]), s: 1.32, form: ZOI(1.1, .44, 1) }, { R: tilt(-.7, .25, -.55), t: add(C0, [-.92, -.6, .4]), s: .62, form: ZOI(.9, .4) }],
        () => [{ R: tilt(-.3, .18, -.3), t: C0, s: 1.36, form: ZOI(1.05, .46, 2) }],
      ],
      block: [() => [{ R: tilt(.35, .3, .1), t: C0, s: 1.5, form: RQB }]],
    },
    colors: [
      { id: 'tanzanite', zh: '蓝紫', en: 'Blue-violet', hex: '#6a64c8', pl: 1, plAx: ['#4a70e2', '#9a4cc8', '#b05aa8'], rarity: 'common', where: { zh: '坦桑尼亚 · 梅勒拉尼，1967 年发现；只有这一个产地', en: 'Merelani, Tanzania, found in 1967; its only source' }, cause: { zh: '颜色来自钒；几乎都经过加热，去掉了棕色，留下蓝和紫两种', en: 'Coloured by vanadium; nearly all is heated to remove the brown, leaving blue and violet' } },
      { id: 'raw', zh: '原色', en: 'Unheated', hex: '#b08a7c', pl: 1, plAx: ['#6a86da', '#c24e78', '#c8bc58'], rarity: 'common', where: { zh: '坦桑尼亚 · 梅勒拉尼', en: 'Merelani, Tanzania' }, cause: { zh: '刚挖出来的多是带棕的；顺着三个方向看分别是蓝、紫红、黄绿', en: 'Fresh from the mine it is mostly brownish; along its three directions it shows blue, purple-red and yellow-green' } },
      { id: 'green', zh: '绿', en: 'Green', hex: '#8ab878', rarity: 'uncommon', cause: { zh: '绿色的黝帘石', en: 'Green zoisite' } },
      { id: 'thulite', zh: '锰黝帘石', en: 'Thulite', hex: '#e8a0b0', habit: 'block', rarity: 'uncommon', phantom: 0, optics: { frost: .72, clear: .32, inner: .3, terr: 0 }, where: { zh: '挪威 · 泰勒马克', en: 'Telemark, Norway' }, cause: { zh: '粉到红、不透明的成块的黝帘石，颜色来自锰', en: 'Pink to red, opaque, massive zoisite coloured by manganese' } },
      { id: 'yellow', zh: '黄', en: 'Yellow', hex: '#e8d070', depth: .7, rarity: 'rare', where: { zh: '坦桑尼亚 · 梅勒拉尼', en: 'Merelani, Tanzania' }, cause: { zh: '黄色的黝帘石，有时被叫成「黄色坦桑石」，其实只有蓝和紫才算坦桑石', en: 'Yellow zoisite, sometimes sold as “yellow tanzanite”, though only blue and violet count as tanzanite' } },
      { id: 'blue', zh: '纯蓝', en: 'Pure blue', hex: '#4a62cc', pl: .9, plAx: ['#3e64da', '#7056cc', '#5060d0'], rarity: 'rare', cause: { zh: '越接近纯蓝越珍贵', en: 'The closer to pure blue, the more prized' } },
      { id: 'orange', zh: '橙', en: 'Orange', hex: '#eea060', depth: .7, rarity: 'mythic', cause: { zh: '黝帘石里最少见的颜色之一', en: 'One of the rarest colours of zoisite' } },
    ],
  },
  peridot: {
    zh: '橄榄石', en: 'Peridot', formula: '(Mg,Fe)₂SiO₄', sys: { zh: '斜方晶系', en: 'Orthorhombic' }, mohs: '6.5–7',
    fact: { zh: '绿色来自它自己成分里的铁；有的橄榄石来自陨石', en: 'Its green comes from the iron in its own formula; some peridot fell from space' },
    optics: { ior: 1.67, inner: 0.75, frost: .04, soft: .03, var: .1, clear: .96, terr: .15, step: 8, cleave: 0, lus: 1.2, disp: 1.6 },
    clusters: {
      main: [
        () => [{ R: tilt(.5, .35, .3), t: C0, s: 1.4, form: PERI() }, { R: tilt(-.8, .3, -.4), t: add(C0, [-.92, -.6, .4]), s: .6, form: PERI(.7) }],
        () => [{ R: tilt(-.4, .4, .2), t: C0, s: 1.45, form: PERI(.9, .52, .36) }],
      ],
    },
    colors: [
      { id: 'lime', zh: '黄绿', en: 'Lime', hex: '#b6d24a', depth: .7, rarity: 'common', where: { zh: '美国亚利桑那 · 圣卡洛斯', en: 'San Carlos, Arizona, USA' }, cause: { zh: '量最大的产地出的多是偏黄的绿、颗粒小', en: 'The biggest source gives mostly yellowish green in small sizes' } },
      { id: 'olive', zh: '橄榄绿', en: 'Olive', hex: '#94ac42', depth: .8, rarity: 'common', cause: { zh: '名字就来自橄榄一样的绿；铁越多，绿得越深', en: 'Named for its olive green; more iron, deeper green' } },
      { id: 'brownish', zh: '褐绿', en: 'Brownish green', hex: '#a4a058', depth: .8, rarity: 'uncommon', cause: { zh: '带一点褐色的绿', en: 'Green with a touch of brown' } },
      { id: 'yellow', zh: '金黄绿', en: 'Golden green', hex: '#ccc84a', depth: .65, rarity: 'uncommon', cause: { zh: '三价铁让它偏黄', en: 'Ferric iron pushes it toward yellow' } },
      { id: 'burma', zh: '缅甸翠绿', en: 'Burmese green', hex: '#74ba3e', vivid: 0.35, rarity: 'rare', where: { zh: '缅甸 · 莫谷', en: 'Mogok, Myanmar' }, cause: { zh: '颜色和净度都很好，量少', en: 'Fine colour and clarity, in small amounts' } },
      { id: 'zabargad', zh: '古岛绿', en: 'Zabargad green', hex: '#82b84c', rarity: 'rare', where: { zh: '埃及 · 扎巴贾德岛，红海', en: 'Zabargad Island, Red Sea, Egypt' }, cause: { zh: '公元前三百年左右就开始开采的老产地，颜色是饱满不暗的中绿；现在已经不开了', en: 'Mined from about 300 BC; a rich, not-too-dark medium green; long since closed' } },
      { id: 'pallasite', zh: '陨石橄榄石', en: 'Pallasite peridot', hex: '#d2b850', depth: .7, rarity: 'mythic', where: { zh: '来自石铁陨石', en: 'From pallasite meteorites' }, cause: { zh: '嵌在铁镍陨石里的橄榄石，是从天上掉下来的宝石', en: 'Olivine set in iron-nickel meteorites: a gem that fell from the sky' } },
    ],
  },
  cordierite: {
    zh: '堇青石', en: 'Cordierite', formula: '(Mg,Fe)₂Al₄Si₅O₁₈', sys: { zh: '斜方晶系', en: 'Orthorhombic' }, mohs: '7–7.5',
    fact: { zh: '传说维京航海者用它的薄片在阴天找太阳', en: 'Legend says Viking navigators used thin slices of it to find the sun on cloudy days' },
    optics: { ior: 1.545, inner: 0.75, frost: .04, soft: .03, var: .1, clear: .96, terr: .15, step: 8, cleave: 0, lus: 1.1, disp: 1.0 },
    clusters: {
      main: [
        () => [{ R: tilt(.42, .2, .16), t: C0, s: 1.4, form: CORD(.8, .58) }, { R: tilt(-.7, .42, -.4), t: add(C0, [-.95, -.62, .45]), s: .58, form: CORD(.5, .58) }],
        () => [{ R: tilt(-.38, .24, -.2), t: C0, s: 1.36, form: CORD(.95, .56, .14) }],
      ],
      single: [() => [{ R: tilt(.35, .24, .2), t: C0, s: 1.42, form: CORD(.78, .6) }]],
    },
    colors: [
      { id: 'iolite', zh: '蓝紫', en: 'Violet-blue', hex: '#5a64c6', pl: 1, plAx: ['#4650c4', '#f2eedc', '#8e9ed0'], rarity: 'common', where: { zh: '印度、斯里兰卡、马达加斯加、坦桑尼亚', en: 'India, Sri Lanka, Madagascar, Tanzania' }, cause: { zh: '宝石级的堇青石叫「iolite」，颜色来自铁；顺着一个方向看是深蓝紫，换个方向几乎无色或淡黄，再换一个是浅蓝灰', en: 'Gem cordierite is called iolite and is coloured by iron; one direction shows deep violet-blue, another almost colourless or pale yellow, a third light blue-grey' } },
      { id: 'violet', zh: '紫', en: 'Violet', hex: '#7a5ec2', pl: 1, plAx: ['#5e44bc', '#b49cdc', '#c4a072'], rarity: 'uncommon', cause: { zh: '偏紫的堇青石，转动时是浅紫、深紫和黄棕', en: 'Violet iolite turns light violet, dark violet and yellow-brown' } },
      { id: 'deep', zh: '深蓝', en: 'Deep blue', hex: '#3e4eb4', depth: 1.4, pl: 1, plAx: ['#2c3cb4', '#e2dcc0', '#5a72d0'], rarity: 'rare', where: { zh: '印度', en: 'India' }, cause: { zh: '最深的蓝被认为和蓝宝石一样来自铁和钛之间的电荷转移；它熔点低，没法像蓝宝石那样靠加热变深，颜色都是天然的', en: 'The deepest blue is thought to share sapphire’s iron–titanium charge transfer; its low melting point means it cannot be heated deeper, so the colour is natural' } },
      { id: 'grey', zh: '灰蓝', en: 'Greyish blue', hex: '#97a2cc', depth: .65, pl: .7, plAx: ['#7e8ecc', '#dcd8c4', '#a6b0d0'], rarity: 'common', cause: { zh: '有的颜色发灰，或淡得几乎无色', en: 'Some are greyish or so pale they look almost colourless' } },
      { id: 'bloodshot', zh: '血丝堇青石', en: 'Bloodshot iolite', hex: '#6c5eb2', pl: .7, plAx: ['#5a52bc', '#cdb6a0', '#8e96cc'], sw: ['#6c5eb2', '#c8584a'], spk: { k: .9, c: '#e0563e' }, habit: 'single', rarity: 'rare', where: { zh: '斯里兰卡', en: 'Sri Lanka' }, cause: { zh: '里面平行排着赤铁矿的小薄片，透出一层红色的闪光', en: 'Parallel platelets of hematite inside give a red glittering sheen' } },
    ],
  },
  zircon: {
    zh: '锆石', en: 'Zircon', formula: 'ZrSiO₄', sys: { zh: '四方晶系', en: 'Tetragonal' }, mohs: 7.5,
    fact: { zh: '色散 0.039，火彩接近钻石', en: 'Dispersion 0.039, close to diamond' },
    axial: .3, axR: [-1.26, 1.26, 0],
    optics: { ior: 1.95, inner: 0.75, frost: .03, soft: .03, var: .15, clear: .96, terr: .12, step: 6, cleave: 0, lus: 1.85, disp: 3.4 },
    clusters: {
      main: [
        () => [{ R: tilt(.45, .25, .32), t: add(C0, [.06, .02, 0]), s: 1.35, form: ZIRC(.75) }, { R: tilt(-.7, .3, -.6), t: add(C0, [-.95, -.6, .42]), s: .62, form: ZIRC(.6) }],
        () => [{ R: tilt(-.3, .2, -.3), t: C0, s: 1.42, form: ZIRC(.55, .52, .82) }],
      ],
    },
    colors: [
      { id: 'brown', zh: '棕', en: 'Brown', hex: '#c08a5c', depth: .55, rarity: 'common', cause: { zh: '宝石级的锆石常常是棕色的', en: 'Gem-quality zircon is usually brown' } },
      { id: 'golden', zh: '金黄', en: 'Golden', hex: '#f0c45a', depth: .42, rarity: 'common', cause: { zh: '金黄色，有天然的，也有加热出来的', en: 'Golden yellow, natural or heat-treated' } },
      { id: 'green', zh: '绿', en: 'Green', hex: '#8fb86a', rarity: 'uncommon', optics: { frost: .1, clear: .9 }, cause: { zh: '绿色的常是被自身放射性慢慢损伤过的「低型」锆石', en: 'Green zircon is often “low” zircon, slowly damaged by its own radioactivity' } },
      { id: 'colorless', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'uncommon', cause: { zh: '色散 0.039，火彩接近钻石的 0.044', en: 'Dispersion 0.039, close to diamond’s 0.044' } },
      { id: 'orange', zh: '橙', en: 'Orange', hex: '#f2a052', depth: .45, rarity: 'uncommon', cause: { zh: '好看的橙色', en: 'An attractive orange' } },
      { id: 'blue', zh: '天然蓝', en: 'Natural blue', hex: '#7cc6e4', rarity: 'rare', cause: { zh: '天然的蓝很少见；市面上的蓝锆石几乎都是棕色的加热出来的', en: 'Natural blue is rare; almost all blue zircon sold is heated brown zircon' } },
      { id: 'pink', zh: '粉', en: 'Pink', hex: '#f0a6b8', rarity: 'rare', cause: { zh: '粉色的锆石少见', en: 'Pink zircon is uncommon' } },
      { id: 'red', zh: '红', en: 'Red', hex: '#d24c58', rarity: 'mythic', where: { zh: '缅甸', en: 'Myanmar' }, cause: { zh: '红色的少见，很受珍视', en: 'Red is rare and highly valued' } },
    ],
  },
  wulfenite: {
    zh: '钼铅矿', en: 'Wulfenite', formula: 'PbMoO₄', sys: { zh: '四方晶系', en: 'Tetragonal' }, mohs: 3,
    fact: { zh: '钼铅矿是亚利桑那州的州矿物', en: 'Wulfenite is Arizona’s state mineral' },
    optics: { ior: 2.3, inner: 0.55, frost: .05, soft: .03, var: .12, clear: .92, terr: .22, step: 6, cleave: 0, lus: 1.9, disp: 2.4 },
    clusters: {
      main: [
        () => [{ R: tilt(.3, .55, .2), t: add(C0, [.12, .05, 0]), s: 1.2, form: WULF() }, { R: tilt(-.9, .9, -.5), t: add(C0, [-.85, -.35, .35]), s: .78, form: WULF(.85, .15) }, { R: tilt(1.3, 1.25, .6), t: add(C0, [.8, -.62, -.1]), s: .6, form: WULF(.85, .15) }],
        () => [{ R: tilt(-.25, .7, -.18), t: C0, s: 1.3, form: WULF(.9, .19) }, { R: tilt(.9, 1.1, .7), t: add(C0, [.92, -.5, .2]), s: .62, form: WULF(.85, .15) }],
      ],
    },
    colors: [
      { id: 'orange', zh: '橙', en: 'Orange', hex: '#f8982e', vivid: 0.7, depth: 1.0, rarity: 'common', cause: { zh: '黄、橙、红色来自少量的铬', en: 'Small amounts of chromium give its yellows, oranges and reds' } },
      { id: 'yellow', zh: '黄', en: 'Yellow', hex: '#f2d05a', vivid: 0.6, depth: 0.95, rarity: 'common', cause: { zh: '亮黄色；黄色的也叫「黄铅矿」', en: 'Bright yellow; the yellow form is sometimes called “yellow lead ore”' } },
      { id: 'honey', zh: '蜜黄', en: 'Honey', hex: '#e8b45a', depth: 1.25, rarity: 'common', cause: { zh: '蜜一样的黄', en: 'A honey yellow' } },
      { id: 'redorange', zh: '红橙', en: 'Red-orange', hex: '#ec7444', vivid: 0.65, depth: 1.15, rarity: 'uncommon', cause: { zh: '橙里带红', en: 'Orange with red in it' } },
      { id: 'brown', zh: '棕', en: 'Brown', hex: '#b88a60', depth: 1.3, rarity: 'uncommon', cause: { zh: '灰、绿、棕、黑都少见一些', en: 'Grey, green, brown and black are less common' } },
      { id: 'red', zh: '深红', en: 'Red', hex: '#e2583e', vivid: 0.6, depth: 1.25, rarity: 'rare', where: { zh: '美国亚利桑那州 · 红云矿', en: 'Red Cloud Mine, Arizona' }, cause: { zh: '红云矿以深红的板状晶体出名；钼铅矿是亚利桑那州的州矿物', en: 'Red Cloud is famous for its deep red plates; wulfenite is Arizona’s state mineral' } },
      { id: 'olive', zh: '橄榄绿', en: 'Olive', hex: '#b4b46a', depth: 1.3, rarity: 'rare', cause: { zh: '橄榄绿的少见', en: 'Olive green is uncommon' } },
      { id: 'colorless', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'mythic', cause: { zh: '纯的钼铅矿是无色的，但很难找到', en: 'Pure wulfenite is colourless, but hard to find' } },
    ],
  },
  apophyllite: {
    zh: '鱼眼石', en: 'Apophyllite', formula: 'KCa₄Si₈O₂₀(F,OH)·8H₂O', sys: { zh: '四方晶系', en: 'Tetragonal' }, mohs: '4.5–5',
    fact: { zh: '底面一刮就分层，那一面泛着珍珠一样的光，所以叫鱼眼石', en: 'It splits easily across its base, which shines like pearl; hence “fish-eye stone”' },
    optics: { ior: 1.537, inner: 0.75, stri: .75, frost: .04, soft: .03, var: .1, clear: .96, terr: .28, step: 10, cleave: 0, lus: 1.2, disp: 1.0 },
    clusters: {
      main: [
        () => [{ R: tilt(.4, .2, .25), t: add(C0, [.06, .02, 0]), s: 1.32, form: APO(1.05) }, { R: tilt(-.7, .25, -.5), t: add(C0, [-.92, -.6, .4]), s: .66, form: APO(.9) }, { R: tilt(1.0, .3, .6), t: add(C0, [.88, -.64, -.3]), s: .52, form: APO(.8) }],
        () => [{ R: tilt(-.35, .18, -.2), t: C0, s: 1.4, form: APO(1.1, .48) }],
      ],
      cube: [() => [{ R: tilt(.55, .45, .2), t: C0, s: 1.4, form: APOC() }, { R: tilt(-.6, .3, .7), t: add(C0, [-.9, -.62, .4]), s: .6, form: APOC(.45) }]],
    },
    colors: [
      { id: 'colorless', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'common', cause: { zh: '清清透透的一根，柱面上有细细的竖纹', en: 'Water-clear, with fine upright striations on the prism' } },
      { id: 'white', zh: '白', en: 'White', hex: '#eef0f2', habit: 'cube', rarity: 'common', uv: '#f2eec4', optics: { frost: .32, clear: .72 }, cause: { zh: '近乎立方的短柱，平顶泛着珍珠光', en: 'A near-cubic block with a pearly flat top' }, uvNote: { zh: '有的在紫外灯下发黄白色的光', en: 'Some glow yellow or white under UV' } },
      { id: 'palegreen', zh: '淡绿', en: 'Pale green', hex: '#c6e4bc', rarity: 'uncommon', where: { zh: '印度浦那一带', en: 'Around Pune, India' }, cause: { zh: '印度德干玄武岩里常见的浅绿', en: 'The soft green so common in India’s Deccan basalts' } },
      { id: 'yellow', zh: '淡黄', en: 'Pale yellow', hex: '#f0e4a8', depth: .7, rarity: 'uncommon', cause: { zh: '淡淡的黄', en: 'A pale yellow' } },
      { id: 'green', zh: '翠绿', en: 'Green', hex: '#6cc48a', rarity: 'rare', where: { zh: '印度浦那 · 帕尚采石场', en: 'Pashan quarries, Pune, India' }, cause: { zh: '翠绿的鱼眼石很受收藏家喜欢；最好的出自浦那的帕尚采石场', en: 'Collectors prize green apophyllite; the finest came from the Pashan quarries near Pune' } },
      { id: 'pink', zh: '粉', en: 'Pink', hex: '#f2bccb', rarity: 'rare', where: { zh: '德国哈茨山 · 圣安德烈亚斯贝格', en: 'St. Andreasberg, Harz Mountains, Germany' }, cause: { zh: '粉色的少见；老产地圣安德烈亚斯贝格出过很受追捧的粉色晶体', en: 'Pink is rare; the old St. Andreasberg locality gave much-sought pink crystals' } },
      { id: 'red', zh: '红', en: 'Red', hex: '#d8707a', depth: .8, rarity: 'mythic', cause: { zh: '红色的鱼眼石极少见', en: 'Red apophyllite is very rare' } },
    ],
  },
  tugtupite: {
    zh: '硅铍铝钠石', en: 'Tugtupite', formula: 'Na₄BeAlSi₄O₁₂Cl', sys: { zh: '四方晶系', en: 'Tetragonal' }, mohs: '4–6.5',
    fact: { zh: '放在阳光下颜色会变深，放进暗处又慢慢褪回去', en: 'Sunlight deepens its colour; in the dark it slowly fades back' },
    optics: { ior: 1.5, inner: 0.4, frost: .5, soft: .04, var: .1, clear: .55, terr: 0, step: 6, cleave: 0, lus: .9, disp: 1.0 },
    clusters: {
      main: [() => [{ R: tilt(.35, .3, .1), t: C0, s: 1.5, form: RQB }], () => [{ R: tilt(-.5, .5, .3), t: C0, s: 1.4, form: RQB }, { R: tilt(.9, .2, -.6), t: add(C0, [.92, -.6, .3]), s: .55, form: RQB }]],
      xl: [() => [{ R: tilt(.3, .3, .2), t: add(C0, [0, -.1, 0]), s: .8, form: ZIRC(.7, .5) }, { R: tilt(-.6, .4, .7), t: add(C0, [-.86, -.42, .2]), s: .6, form: ZIRC(.6, .5) }, { R: tilt(.9, .2, -.4), t: add(C0, [.84, -.5, .1]), s: .62, form: ZIRC(.65, .5) }, { R: tilt(-.2, .8, .3), t: add(C0, [-.3, -.78, .62]), s: .46, form: ZIRC(.6, .5) }, { R: tilt(1.4, .3, .9), t: add(C0, [.42, -.86, -.55]), s: .42, form: ZIRC(.6, .5) }]],
    },
    colors: [
      { id: 'white', zh: '白', en: 'White', hex: '#f2eef0', rarity: 'common', phantom: 0, uv: '#ff9a5a', cause: { zh: '最早在格陵兰找到的是白色的；强光一照会泛粉', en: 'The first finds in Greenland were white; strong sunlight turns it pink' }, uvNote: { zh: '长波紫外灯下发橙光；短波下是天然矿物里最亮的红光之一', en: 'Glows orange under long-wave UV; under short-wave, one of the brightest reds of any mineral' } },
      { id: 'pink', zh: '淡粉', en: 'Pale pink', hex: '#f4c2d0', rarity: 'common', phantom: 0, uv: '#ff9a5a', glow: '#ffd2dc', glowK: .3, cause: { zh: '淡淡的粉；颜色会随光变深，在暗处又慢慢褪', en: 'A pale pink that deepens in light and slowly fades in the dark' }, uvNote: { zh: '长波紫外灯下发橙光', en: 'Glows orange under long-wave UV' } },
      { id: 'magenta', zh: '玫红', en: 'Magenta', hex: '#d8508a', rarity: 'uncommon', phantom: 0, uv: '#ff8a50', glow: '#ffb0cc', glowK: .3, where: { zh: '格陵兰 · 伊利马萨克', en: 'Ilímaussaq, Greenland' }, cause: { zh: '从淡粉到鲜艳的玫红', en: 'From pale pink to vivid magenta' }, uvNote: { zh: '长波紫外灯下发橙光', en: 'Glows orange under long-wave UV' } },
      { id: 'red', zh: '樱桃红', en: 'Cherry red', hex: '#c42a4a', depth: .8, rarity: 'rare', phantom: 0, uv: '#ff7a46', optics: { frost: .35, clear: .68 }, where: { zh: '格陵兰 · 克瓦内山，1965 年', en: 'Kvanefjeld, Greenland, 1965' }, cause: { zh: '1965 年找到更深的红色以后，它才成了宝石', en: 'Only after deeper red was found in 1965 did it become a gemstone' }, uvNote: { zh: '长波紫外灯下发橙光', en: 'Glows orange under long-wave UV' } },
      { id: 'xl', zh: '晶体', en: 'Crystals', hex: '#d03a58', depth: .8, habit: 'xl', rarity: 'mythic', uv: '#ff7a46', optics: { frost: .1, clear: .9, inner: .7 }, where: { zh: '格陵兰 · 塔塞克坡，2002 年以后', en: 'Taseq Slope, Greenland, after 2002' }, cause: { zh: '它几乎总是成块的；能看到小晶体的标本极少', en: 'It is almost always massive; specimens with tiny crystals are very rare' }, uvNote: { zh: '紫外灯下发光', en: 'Glows under UV' } },
    ],
  },
  spodumene: {
    zh: '锂辉石', en: 'Spodumene', formula: 'LiAlSi₂O₆', sys: { zh: '单斜晶系', en: 'Monoclinic' }, mohs: '6.5–7',
    fact: { zh: '紫锂辉在强光下颜色会慢慢褪', en: 'Kunzite slowly fades in strong light' },
    axial: .4, axR: [-1.25, 1.4, 0],
    optics: { ior: 1.67, inner: 0.75, stri: .9, conch: .3, etch: .85, etchT: 1, frost: .05, soft: .03, var: .12, clear: .95, terr: .3, step: 9, cleave: 0, lus: 1.15, disp: 1.7 },
    clusters: {
      main: [
        () => [{ R: tilt(.5, .2, .3), t: add(C0, [.08, .03, 0]), s: 1.32, form: SPOD(1.25) }, { R: tilt(-.6, .3, -.55), t: add(C0, [-.95, -.58, .42]), s: .66, form: SPOD(1.0, .24, .46) }],
        () => [{ R: tilt(-.3, .15, -.32), t: C0, s: 1.36, form: SPOD(1.15, .28, .52) }],
      ],
    },
    colors: [
      { id: 'kunzite', zh: '紫锂辉', en: 'Kunzite', hex: '#e8a6d0', rarity: 'common', uv: '#ff9a7a', cause: { zh: '浅粉到紫，来自锰；强光下颜色会慢慢褪', en: 'Pale pink to violet from manganese; the colour slowly fades in strong light' }, uvNote: { zh: '长波紫外灯下发粉到橙的光，短波下弱一些', en: 'Glows pink to orange under long-wave UV, weaker in short-wave' } },
      { id: 'lilac', zh: '丁香紫', en: 'Lilac', hex: '#c8b0e4', rarity: 'common', uv: '#ff9a7a', cause: { zh: '淡淡的丁香紫，也是锰', en: 'A soft lilac, also from manganese' }, uvNote: { zh: '紫外灯下发粉到橙的光', en: 'Glows pink to orange under UV' } },
      { id: 'triphane', zh: '无色', en: 'Colourless', hex: '#f5f7fb', rarity: 'common', cause: { zh: '无色到淡黄的叫「三色」：从三个方向看颜色不一样', en: 'Colourless to pale yellow stones are called triphane, “appearing threefold”, for their strong trichroism' } },
      { id: 'yellow', zh: '黄', en: 'Yellow', hex: '#ece27a', depth: .45, rarity: 'uncommon', cause: { zh: '黄色来自铁', en: 'Yellow comes from iron' } },
      { id: 'yellowgreen', zh: '黄绿', en: 'Yellow-green', hex: '#c8e08a', rarity: 'uncommon', cause: { zh: '淡淡的黄绿', en: 'A soft yellow-green' } },
      { id: 'blue', zh: '蓝', en: 'Blue', hex: '#a8c8ec', rarity: 'rare', cause: { zh: '蓝色的锂辉石少见', en: 'Blue spodumene is uncommon' } },
      { id: 'hiddenite', zh: '翠绿锂辉', en: 'Hiddenite', hex: '#5cb47c', vivid: 0.4, rarity: 'mythic', where: { zh: '美国北卡罗来纳州', en: 'North Carolina, USA' }, cause: { zh: '翠绿来自铬，非常少见；以宝石学家希登命名', en: 'Emerald green from chromium, very rare; named after the gemmologist William Earl Hidden' } },
      { id: 'bicolor', zh: '紫到绿', en: 'Lilac to green', hex: '#c8b4dc', sw: ['#c8a0dc', '#9ccc8c'], bands: ['#c8a0dc', '#cca6de', '#d4b6e0', '#dcccdc', '#d2e2b4', '#b4d69c', '#9ccc8c'], rarity: 'rare', uv: '#ff8ab4', where: { zh: '阿富汗 · 努尔斯坦', en: 'Nuristan, Afghanistan' }, cause: { zh: '一根晶体下半截是紫，到尖上变成绿', en: 'Purple in the lower part, green at the tip' }, uvNote: { zh: '下面紫的那段在紫外灯下发粉光', en: 'The purple lower part glows pink under UV' } },
    ],
  },
  titanite: {
    zh: '榍石', en: 'Titanite', formula: 'CaTiSiO₅', sys: { zh: '单斜晶系', en: 'Monoclinic' }, mohs: '5–5.5',
    fact: { zh: '色散 0.051，比钻石还高', en: 'Dispersion 0.051, higher than diamond' },
    optics: { ior: 1.95, inner: 0.75, frost: .04, soft: .03, var: .2, clear: .94, terr: .15, step: 7, cleave: 0, lus: 1.8, disp: 4.0 },
    clusters: {
      main: [
        () => [{ R: tilt(.4, .5, .25), t: C0, s: 1.4, form: SPHN() }, { R: tilt(-.8, .7, -.4), t: add(C0, [-.95, -.6, .45]), s: .62, form: SPHN() }],
        () => [{ R: tilt(-.35, .65, -.2), t: C0, s: 1.45, form: SPHN(.4, 1.0, .18) }],
      ],
    },
    colors: [
      { id: 'yellowgreen', zh: '黄绿', en: 'Yellow-green', hex: '#c8d65a', depth: .5, rarity: 'common', cause: { zh: '最常见、也最受欢迎的颜色；铁少时是黄和绿', en: 'The most popular colour; little iron gives yellow and green' } },
      { id: 'yellow', zh: '金黄', en: 'Golden', hex: '#ecc458', depth: .45, rarity: 'common', cause: { zh: '蜜黄到金黄', en: 'Honey yellow to golden' } },
      { id: 'green', zh: '绿', en: 'Green', hex: '#8cbc64', rarity: 'common', cause: { zh: '绿色', en: 'Green' } },
      { id: 'brown', zh: '棕', en: 'Brown', hex: '#b88458', depth: .6, rarity: 'common', cause: { zh: '铁多了就是棕到黑', en: 'More iron gives brown to black' } },
      { id: 'orange', zh: '橙', en: 'Orange', hex: '#f0a050', depth: .5, rarity: 'rare', cause: { zh: '橙色少见', en: 'Orange is rare' } },
      { id: 'chrome', zh: '铬绿', en: 'Chrome green', hex: '#4cae64', vivid: 0.4, rarity: 'rare', cause: { zh: '铬带来的翠绿，最稀有、最值钱', en: 'An emerald green from chromium, the rarest and most valuable' } },
      { id: 'pink', zh: '粉红', en: 'Pink', hex: '#ec9cb0', rarity: 'mythic', cause: { zh: '粉到红很少见；粉色来自锰', en: 'Pink to red is rare; pink comes from manganese' } },
    ],
  },
  moonstone: {
    zh: '月光石', en: 'Moonstone', formula: 'KAlSi₃O₈', sys: { zh: '单斜晶系', en: 'Monoclinic' }, mohs: '6–6.5',
    fact: { zh: '那层浮动的光，是长石里一层层极薄的正长石和钠长石交替，把光散射出来的', en: 'The floating glow comes from microscopically thin, alternating layers of orthoclase and albite scattering the light' },
    optics: { ior: 1.52, inner: 0.5, frost: .3, soft: .05, var: .08, clear: .82, terr: .2, step: 7, cleave: 0, lus: 1.05, disp: .9, phantom: 0, lab: 1, labW: .7, labS: .7, labZ: 1.2 }, labN: [.1, 1, .2],   // 游彩：层的法线大致朝上
    clusters: {
      main: [
        () => [{ R: tilt(.4, .3, .2), t: C0, s: 1.25, form: ADU() }, { R: tilt(-.8, .4, -.3), t: add(C0, [-.92, -.62, .45]), s: .52, form: ADU(.55, .6) }],
        () => [{ R: tilt(-.45, .28, -.15), t: C0, s: 1.28, form: ADU(.7, .6) }],
      ],
      block: [() => [{ R: tilt(.35, .3, .1), t: C0, s: 1.45, form: RQB }]],
    },
    colors: [
      { id: 'blue', zh: '蓝光', en: 'Blue sheen', hex: '#eef1f6', depth: .35, labW: .12, labK: .95, glow: '#8cb6ff', glowK: 0.6, film: { k: .5, h: .44, r: .03 }, sw: ['#8fb6f4', '#eef1f6'], optics: { frost: .14, clear: .94 }, rarity: 'rare', where: { zh: '斯里兰卡 · 米蒂亚戈达一带', en: 'Meetiyagoda area, Sri Lanka' }, cause: { zh: '几乎无色、透明，里面浮着一层电光一样的蓝；这种蓝光的最珍贵，最好的来自斯里兰卡', en: 'Nearly colourless and clear, with an electric-blue glow floating inside; this blue sheen is the most prized, and the finest comes from Sri Lanka' } },
      { id: 'white', zh: '白光', en: 'White sheen', hex: '#eceaee', depth: .4, labW: .85, labK: .75, glow: '#f4f2ff', glowK: .4, film: { k: .5, h: .45, r: .02 }, sw: ['#ffffff', '#dcdae4'], optics: { frost: .5, clear: .72 }, rarity: 'common', where: { zh: '印度、斯里兰卡', en: 'India, Sri Lanka' }, cause: { zh: '乳白的底子，上面浮着一层银白的光；最常见的一种', en: 'A milky body with a silvery-white sheen; the most common kind' } },
      { id: 'peach', zh: '蜜桃', en: 'Peach', hex: '#f7d2ba', depth: .3, labW: .88, labK: .7, glow: '#fff0e4', glowK: .45, film: { k: .5, h: .9, r: .02 }, sw: ['#f6d4bc', '#f2c4a4'], optics: { frost: .45, clear: .74 }, rarity: 'common', where: { zh: '印度', en: 'India' }, cause: { zh: '淡橙粉的底子，光是白到银色的', en: 'A pale orange-pink body with a white to silvery sheen' } },
      { id: 'grey', zh: '灰', en: 'Grey', hex: '#9e9ca6', depth: .75, labW: .6, labK: .85, glow: '#e8ecf6', glowK: .2, film: { k: .5, h: .45, r: .03 }, sw: ['#d6d8e4', '#a9a8b6'], optics: { frost: .35, clear: .78 }, rarity: 'uncommon', where: { zh: '印度', en: 'India' }, cause: { zh: '灰色的底子，光浮在上面更显眼', en: 'A grey body that makes the sheen stand out' } },
      { id: 'orange', zh: '橙', en: 'Orange', hex: '#ec9a66', depth: .55, labW: .85, labK: .7, glow: '#ffe8d4', glowK: .4, film: { k: .5, h: .9, r: .02 }, sw: ['#f2c6a4', '#e9a274'], optics: { frost: .4, clear: .76 }, rarity: 'uncommon', where: { zh: '印度', en: 'India' }, cause: { zh: '更浓的橙色', en: 'A deeper orange' } },
      { id: 'rainbow', zh: '彩虹月光石', en: 'Rainbow moonstone', hex: '#f1f1f4', depth: .35, labW: .15, labS: .5, labZ: .8, labK: .9, glow: '#d8e4ff', glowK: .3, film: { k: .5, h: .4, r: .16 }, sw: ['#8fb6f4', '#f0c870'], optics: { frost: .22, clear: .9 }, rarity: 'uncommon', where: { zh: '印度、马达加斯加', en: 'India, Madagascar' }, cause: { zh: '其实是一种近乎透明的拉长石：光散成蓝、紫、金好几种颜色；市面上常和月光石放在一起卖', en: 'Actually a nearly clear labradorite: the light breaks into blue, violet and gold; the trade usually sells it alongside moonstone' } },
    ],
  },
  euclase: {
    zh: '蓝柱石', en: 'Euclase', formula: 'BeAlSiO₄(OH)', sys: { zh: '单斜晶系', en: 'Monoclinic' }, mohs: 7.5,
    fact: { zh: '名字来自希腊语「容易裂开」：它有一个方向的解理非常完全', en: 'Its name is Greek for “easily broken”: it has one perfect cleavage' },
    optics: { ior: 1.66, inner: 0.75, frost: .03, soft: .03, var: .1, clear: .96, terr: .15, step: 8, cleave: 0, lus: 1.25, disp: 1.2 },
    clusters: {
      main: [
        () => [{ R: tilt(.5, .5, .3), t: C0, s: 1.3, form: EUC() }, { R: tilt(-.6, .45, -.35), t: add(C0, [-.92, -.62, .45]), s: .62, form: EUC(1.05, .36) }],
        () => [{ R: tilt(-.3, .22, -.2), t: C0, s: 1.4, form: EUC(1.35, .42) }],
      ],
    },
    colors: [
      { id: 'colorless', zh: '无色', en: 'Colourless', hex: '#f3f6f6', depth: .3, rarity: 'common', where: { zh: '巴西米纳斯吉拉斯 · 欧鲁普雷图', en: 'Ouro Preto, Minas Gerais, Brazil' }, cause: { zh: '大多数蓝柱石是无色的；刻面以后亮得很', en: 'Most euclase is colourless; faceted, it is exceptionally bright' } },
      { id: 'paleblue', zh: '浅蓝', en: 'Pale blue', hex: '#c2e2f0', depth: .55, rarity: 'common', where: { zh: '巴西米纳斯吉拉斯 · 欧鲁普雷图', en: 'Ouro Preto, Minas Gerais, Brazil' }, cause: { zh: '颜色大多来自微量的铁', en: 'Most of its colour comes from traces of iron' } },
      { id: 'blue', zh: '天蓝', en: 'Sky blue', hex: '#7cbde6', pl: .6, plAx: ['#d4ecf6', '#94c6ee', '#58a8c8'], rarity: 'uncommon', where: { zh: '巴西', en: 'Brazil' }, cause: { zh: '蓝的蓝柱石，转动时在无色、浅蓝和偏绿的蓝之间换', en: 'Blue euclase turns between colourless, pale blue and a greener blue' } },
      { id: 'zimbabwe', zh: '津巴布韦深蓝', en: 'Zimbabwe blue', hex: '#4472d0', depth: 1.1, pl: .9, plAx: ['#2e4cc0', '#6aa6ea', '#3ab0cc'], rarity: 'rare', where: { zh: '津巴布韦 · 米亚米一带（Lost Hope 矿）', en: 'Miami area, Zimbabwe (Lost Hope Mine)' }, cause: { zh: '浓的、略带绿的深蓝；转动时深蓝、天蓝、青色三种', en: 'An intense, slightly greenish deep blue; turning it shows deep blue, sky blue and cyan' } },
      { id: 'colombia', zh: '哥伦比亚蓝绿', en: 'Colombian blue-green', hex: '#3ea8b4', vivid: 0.4, depth: .9, rarity: 'rare', where: { zh: '哥伦比亚 · 契沃尔', en: 'Chivor, Colombia' }, cause: { zh: '和祖母绿长在一起，绿蓝色来自铬和钒；在查尔斯滤色镜下发红', en: 'Grows with emerald; its greenish blue comes from chromium and vanadium, and it shows red under a Chelsea filter' } },
      { id: 'green', zh: '黄绿', en: 'Lime green', hex: '#c6dc8a', depth: .7, rarity: 'uncommon', where: { zh: '巴西', en: 'Brazil' }, cause: { zh: '偏黄的绿；史密森博物馆里最大的一颗蓝柱石有 144 克拉，就是巴西的黄绿色', en: 'A yellowish green; the largest euclase at the Smithsonian, 144 carats, is a lime green from Brazil' } },
      { id: 'pink', zh: '粉橙', en: 'Pink-orange', hex: '#f0b2a2', depth: .6, pl: .8, plAx: ['#f0a2b6', '#f2b886', '#f4c6b6'], rarity: 'mythic', where: { zh: '巴西巴伊亚 · 利夫拉门图', en: 'Livramento de Nossa Senhora, Bahia, Brazil' }, cause: { zh: '粉色来自三价锰，转动时在粉和橙之间换', en: 'Its pink comes from trivalent manganese; turning it moves between pink and orange' } },
      { id: 'violet', zh: '紫', en: 'Violet', hex: '#9c80d2', depth: .8, rarity: 'mythic', where: { zh: '巴西', en: 'Brazil' }, cause: { zh: '紫色最少见，也最受追捧', en: 'Violet is the rarest and most sought-after colour' } },
    ],
  },
  kyanite: {
    zh: '蓝晶石', en: 'Kyanite', formula: 'Al₂SiO₅', sys: { zh: '三斜晶系', en: 'Triclinic' }, mohs: '4.5–7',
    fact: { zh: '顺着长的方向和横着刮，硬度差很多', en: 'Its hardness differs a lot along and across the crystal' },
    axial: .3, axR: [-1.4, 1.5, 0],
    optics: { ior: 1.72, inner: 0.55, frost: .07, soft: .04, var: .3, clear: .92, terr: .35, step: 10, cleave: 0, lus: 1.25, disp: 1.6 },
    clusters: {
      main: [
        () => { const base = add(C0, [0, -1.15, 0]), up = (R, L) => add(base, app(R, [0, L, 0])); const A = tilt(.25, .12, .36), B = tilt(-.5, .2, -.1), D = tilt(.9, -.1, .62);   // 一簇从同一处散开的刀片
          return [{ R: A, t: up(A, 1.5), s: 1.0, form: BLADE(1.5, .42, .11) }, { R: B, t: up(B, 1.32), s: .9, form: BLADE(1.45, .38, .1) }, { R: D, t: up(D, 1.1), s: .78, form: BLADE(1.4, .36, .1) }]; },
        () => [{ R: tilt(-.2, .6, .4), t: C0, s: 1.3, form: BLADE(1.5, .4, .12) }],
      ],
    },
    colors: [
      { id: 'blue', zh: '蓝', en: 'Blue', hex: '#6f9ad6', hex2: '#3a5fc0', zone: 'core', rarity: 'common', cause: { zh: '蓝色来自铁和钛的电荷转移，和蓝宝石相似；中间常有一道更深的蓝', en: 'Blue from iron–titanium charge transfer, like sapphire; often with a deeper streak through the middle' } },
      { id: 'pale', zh: '浅蓝', en: 'Pale blue', hex: '#a8c6ec', rarity: 'common', cause: { zh: '浅蓝，常一块深一块浅', en: 'Pale blue, often patchy' } },
      { id: 'grey', zh: '灰白', en: 'Grey-white', hex: '#c8ccd6', rarity: 'common', optics: { frost: .14 }, cause: { zh: '灰白色的也很常见', en: 'Grey to white is common too' } },
      { id: 'teal', zh: '蓝绿', en: 'Teal', hex: '#3f9a9c', rarity: 'uncommon', where: { zh: '肯尼亚 · 乌姆巴河谷', en: 'Umba Valley, Kenya' }, cause: { zh: '很深的蓝绿', en: 'A deep teal' } },
      { id: 'green', zh: '绿', en: 'Green', hex: '#7cbc8c', rarity: 'uncommon', cause: { zh: '绿色来自钒或铬', en: 'Green comes from vanadium or chromium' } },
      { id: 'bluegreen', zh: '蓝心绿边', en: 'Blue core, green rim', hex: '#6a9ad4', hex2: '#6ab890', zone: 'rim', rarity: 'rare', where: { zh: '巴西巴伊亚', en: 'Bahia, Brazil' }, cause: { zh: '中间蓝、外面一圈绿', en: 'Blue in the middle, a green rim outside' } },
      { id: 'nepal', zh: '尼泊尔深蓝', en: 'Nepal blue', hex: '#3c5cc4', rarity: 'rare', where: { zh: '尼泊尔', en: 'Nepal' }, cause: { zh: '尼泊尔从 1995 年起出产很蓝的透明蓝晶石', en: 'Nepal has produced clear, deeply blue kyanite since 1995' } },
      { id: 'orange', zh: '橙', en: 'Orange', hex: '#f0a050', depth: .55, rarity: 'mythic', where: { zh: '坦桑尼亚 · 洛利翁多附近', en: 'Near Loliondo, Tanzania' }, cause: { zh: '橙色来自锰；2008 年起才有报道', en: 'Orange from manganese; first reported in 2008' } },
    ],
  },
  labradorite: {
    zh: '拉长石', en: 'Labradorite', formula: '(Ca,Na)(Al,Si)₄O₈', sys: { zh: '三斜晶系', en: 'Triclinic' }, mohs: '6–6.5',
    fact: { zh: '颜色不在石头里，是极薄的层把光反射回来', en: 'The colour is not in the stone: thin layers reflect the light back' },
    optics: { ior: 1.56, inner: 0.3, frost: .1, soft: .03, var: .1, clear: .8, terr: .2, step: 8, cleave: 0, lus: 1.05, disp: 1.2, lab: 1 }, labN: [.15, 1, -.1],   // 晕彩层的法线，大致平行于顶上那个大面
    clusters: {
      main: [
        () => [{ R: tilt(.4, .45, .2), t: C0, s: 1.35, form: TBLK() }],
        () => [{ R: tilt(-.5, .35, -.25), t: add(C0, [.05, .03, 0]), s: 1.25, form: TBLK(.75, .5, .4) }, { R: tilt(.9, .7, .6), t: add(C0, [-.9, -.55, .4]), s: .5, form: TBLK() }],
      ],
    },
    colors: [
      { id: 'blue', zh: '蓝光', en: 'Blue flash', hex: '#5c616c', depth: 1.25, sw: ['#6fa8f0', '#5a606c'], rarity: 'common', film: { k: .5, h: .42, r: .06 }, cause: { zh: '颜色不在石头里：是光在极薄的层与层之间干涉出来的；最常见的是蓝', en: 'The colour is not in the stone: light interferes between extremely thin layers; blue is the most common' } },
      { id: 'gold', zh: '金光', en: 'Gold flash', hex: '#5c616c', depth: 1.25, sw: ['#f0c860', '#5a606c'], rarity: 'common', film: { k: .5, h: .9, r: .06 }, cause: { zh: '层厚一点就是金和橙，薄一点是蓝和紫', en: 'Thicker layers give gold and orange; thinner ones blue and violet' } },
      { id: 'green', zh: '绿光', en: 'Green flash', hex: '#5c616c', depth: 1.25, sw: ['#7cd09a', '#5a606c'], rarity: 'uncommon', film: { k: .5, h: .72, r: .06 }, cause: { zh: '绿色的晕彩', en: 'A green flash' } },
      { id: 'peacock', zh: '孔雀蓝绿', en: 'Peacock', hex: '#5c616c', depth: 1.25, sw: ['#4cc0c8', '#5a606c'], rarity: 'uncommon', film: { k: .5, h: .56, r: .1 }, cause: { zh: '蓝和绿一起', en: 'Blue and green together' } },
      { id: 'orange', zh: '橙红光', en: 'Orange-red flash', hex: '#5c616c', depth: 1.25, sw: ['#f08a60', '#5a606c'], rarity: 'rare', film: { k: .5, h: 0, r: .06 }, cause: { zh: '偏红和紫的晕彩少见一些', en: 'Reddish and violet displays are less common' } },
      { id: 'violet', zh: '紫光', en: 'Violet flash', hex: '#5c616c', depth: 1.25, sw: ['#a888e8', '#5a606c'], rarity: 'rare', film: { k: .5, h: .26, r: .06 }, cause: { zh: '紫色的晕彩', en: 'A violet flash' } },
      { id: 'spectrolite', zh: '光谱石', en: 'Spectrolite', hex: '#4e535e', depth: 1.3, sw: ['#f0c860', '#6fa8f0'], rarity: 'mythic', film: { k: .58, h: .7, r: .32 }, where: { zh: '芬兰 · 于勒迈', en: 'Ylämaa, Finland' }, cause: { zh: '一块石头里能看到从红、橙、金、绿到蓝、紫整条光谱', en: 'A single stone can show the whole spectrum, red through gold and green to blue and violet' } },
    ],
  },
  amazonite: {
    zh: '天河石', en: 'Amazonite', formula: 'KAlSi₃O₈', sys: { zh: '三斜晶系', en: 'Triclinic' }, mohs: '6–6.5',
    fact: { zh: '叫「亚马逊石」，可亚马逊河沿岸并没有确认过的产地', en: 'Named after the Amazon, though no deposit along the river has been confirmed' },
    optics: { ior: 1.53, inner: 0, frost: .8, soft: .06, var: .12, clear: .3, terr: .08, step: 8, cleave: 0, lus: 1.0, disp: .6, phantom: 0 },
    clusters: {
      main: [
        () => [{ R: tilt(.4, .4, .2), t: C0, s: 1.35, form: TBLK(.72, .6, .55) }, { R: tilt(-.8, .5, -.4), t: add(C0, [-.92, -.6, .45]), s: .56, form: TBLK(.7, .55, .5) }],
        () => [{ R: tilt(-.45, .35, -.25), t: C0, s: 1.4, form: TBLK(.68, .64, .5) }],
      ],
    },
    colors: [
      { id: 'pikes', zh: '蓝绿', en: 'Blue-green', hex: '#4ebaa8', depth: 1.1, glow: '#a4ecdc', glowK: .5, vein: { k: .55, m: 1, c: '#f4f3ec' }, sw: ['#4ebaa8', '#f4f3ec'], rarity: 'common', uv: '#a6b06a', where: { zh: '美国科罗拉多 · 派克斯峰一带，常和烟晶长在一起', en: 'Pikes Peak area, Colorado, USA, often with smoky quartz' }, cause: { zh: '颜色来自微量的铅和结构里的水，再经过天然的辐射；白色的细纹是析出来的钠长石', en: 'Its colour comes from traces of lead and structural water, set by natural radiation; the white streaks are exsolved albite' }, uvNote: { zh: '紫外灯下有一点弱的橄榄绿光', en: 'A weak olive-green glow under UV' } },
      { id: 'green', zh: '绿', en: 'Green', hex: '#7cc9a0', depth: 1, glow: '#bcf0d4', glowK: .5, vein: { k: .45, m: 1, c: '#f4f3ec' }, sw: ['#7cc9a0', '#f4f3ec'], rarity: 'common', where: { zh: '巴西、马达加斯加', en: 'Brazil, Madagascar' }, cause: { zh: '偏绿的天河石', en: 'A greener amazonite' } },
      { id: 'pale', zh: '淡绿', en: 'Pale green', hex: '#b6ddcc', depth: .8, glow: '#e0f6ec', glowK: .5, vein: { k: .35, m: 1, c: '#f6f5ef' }, sw: ['#b6ddcc', '#f6f5ef'], rarity: 'common', cause: { zh: '颜色的深浅跟铅和水的多少有关，少一些就淡', en: 'How deep the colour runs depends on the lead and water; with less, it is pale' } },
      { id: 'ilmen', zh: '条纹天河石', en: 'Perthite amazonite', hex: '#5cbcae', depth: 1.05, glow: '#ace8de', glowK: .5, vein: { k: .85, m: 1, c: '#f6f4ec' }, sw: ['#5cbcae', '#f6f4ec'], rarity: 'uncommon', where: { zh: '俄罗斯 · 伊尔门山', en: 'Ilmen Mountains, Russia' }, cause: { zh: '白色的钠长石条纹特别多，像一层层格子；天然的天河石几乎都有一点这种纹', en: 'Full of white albite streaks like a grid; natural amazonite nearly always shows a little of this' } },
      { id: 'robin', zh: '知更鸟蛋蓝', en: 'Robin’s-egg blue', hex: '#6ccad8', vivid: 0.3, depth: .95, glow: '#b4eef6', glowK: .5, vein: { k: .25, m: 1, c: '#f6f5ef' }, sw: ['#6ccad8', '#f6f5ef'], rarity: 'rare', where: { zh: '美国科罗拉多 · 特勒县', en: 'Teller County, Colorado, USA' }, cause: { zh: '偏蓝的天河石，像知更鸟蛋壳的颜色', en: 'A bluer amazonite, the colour of a robin’s egg' } },
      { id: 'teal', zh: '深青', en: 'Deep teal', hex: '#1e9ca2', depth: 1.25, glow: '#6cd2d2', glowK: .5, vein: { k: .2, m: 1, c: '#f4f3ec' }, sw: ['#1e9ca2', '#f4f3ec'], rarity: 'rare', where: { zh: '埃塞俄比亚 · 孔索', en: 'Konso, Ethiopia' }, cause: { zh: '很深的青绿色大晶体', en: 'Large crystals of a deep turquoise-green' } },
    ],
  },
  rhodonite: {
    zh: '蔷薇辉石', en: 'Rhodonite', formula: 'MnSiO₃', sys: { zh: '三斜晶系', en: 'Triclinic' }, mohs: '5.5–6',
    fact: { zh: '名字来自希腊语 rhodon，意思是「玫瑰」', en: 'Its name comes from the Greek rhodon, “rose”' },
    optics: { ior: 1.73, inner: 0.4, frost: .4, soft: .05, var: .14, clear: .58, terr: .1, step: 7, cleave: 0, lus: 1.05, disp: .8, phantom: 0 },
    clusters: {
      main: [
        () => [{ R: tilt(.45, .35, .25), t: C0, s: 1.35, form: RHOX() }, { R: tilt(-.7, .5, -.3), t: add(C0, [-.92, -.6, .45]), s: .58, form: RHOX(.7, .4, .6) }],
        () => [{ R: tilt(-.4, .3, -.2), t: C0, s: 1.4, form: RHOX(.78, .45, .58) }],
      ],
      block: [() => [{ R: tilt(.35, .3, .1), t: C0, s: 1.5, form: RQB }], () => [{ R: tilt(-.5, .5, .3), t: C0, s: 1.42, form: RQB }, { R: tilt(.9, .2, -.6), t: add(C0, [.92, -.6, .3]), s: .55, form: RQB }]],
    },
    colors: [
      { id: 'veined', zh: '粉红黑脉', en: 'Pink with black veins', hex: '#ec8298', depth: .9, habit: 'block', optics: { inner: 0, frost: .82, clear: .26 }, glow: '#ffc8d4', glowK: .42, vein: { k: .95, m: 0, c: '#2a2228' }, sw: ['#e27c8e', '#2a2228'], rarity: 'common', where: { zh: '俄罗斯乌拉尔、澳大利亚、加拿大等', en: 'The Urals, Australia, Canada and elsewhere' }, cause: { zh: '整块的蔷薇辉石：粉到玫红；黑色树枝状的细脉是锰的氧化物，是后来沿着裂隙氧化出来的', en: 'Massive rhodonite, pink to rose; the black, branching veins are manganese oxide formed later along cracks' } },
      { id: 'rose', zh: '玫瑰粉', en: 'Rose pink', hex: '#f0a0b2', depth: .85, habit: 'block', optics: { inner: 0, frost: .82, clear: .26 }, glow: '#ffc8d4', glowK: .42, vein: { k: .4, m: 0, c: '#2e262c' }, sw: ['#ea9aaa', '#2e262c'], rarity: 'common', cause: { zh: '粉到红的颜色来自锰；黑脉少的一种', en: 'The pink to red comes from manganese; this one has few black veins' } },
      { id: 'red', zh: '玫红', en: 'Rose red', hex: '#d8546e', depth: .95, habit: 'block', optics: { inner: 0, frost: .82, clear: .26 }, glow: '#ffc8d4', glowK: .42, vein: { k: .6, m: 0, c: '#28222a' }, sw: ['#d2526c', '#28222a'], rarity: 'uncommon', cause: { zh: '更浓、更红的', en: 'Deeper and redder' } },
      { id: 'brownred', zh: '棕红', en: 'Brownish red', hex: '#bc6660', depth: .95, habit: 'block', optics: { inner: 0, frost: .82, clear: .26 }, glow: '#ffc8d4', glowK: .42, vein: { k: .55, m: 0, c: '#2a2224' }, sw: ['#b6625c', '#2a2224'], rarity: 'uncommon', cause: { zh: '偏棕的红', en: 'A brownish red' } },
      { id: 'orange', zh: '橙红', en: 'Orange-red', hex: '#e2603e', depth: .9, glow: '#ff9a72', glowK: .25, optics: { frost: .06, clear: .93, inner: .7 }, rarity: 'rare', cause: { zh: '透明的蔷薇辉石也有橙红色的', en: 'Transparent rhodonite also comes in orange-red' } },
      { id: 'brazil', zh: '巴西樱桃红', en: 'Brazilian cherry red', hex: '#cc3048', depth: 1.05, glow: '#ff6a7c', glowK: .3, optics: { frost: .05, clear: .94, inner: .72 }, rarity: 'rare', where: { zh: '巴西米纳斯吉拉斯 · 孔塞列鲁拉法耶蒂（莫罗达米纳）', en: 'Morro da Mina, Conselheiro Lafaiete, Minas Gerais, Brazil' }, cause: { zh: '透明的红色晶体，是出透明晶体最好的两个产地之一', en: 'Transparent red crystals from one of the two finest localities for them' } },
      { id: 'brokenhill', zh: '布罗肯希尔血红', en: 'Broken Hill blood red', hex: '#bc2238', depth: 1.15, glow: '#ff5a6a', glowK: .32, optics: { frost: .04, clear: .95, inner: .75 }, rarity: 'mythic', where: { zh: '澳大利亚新南威尔士 · 布罗肯希尔', en: 'Broken Hill, New South Wales, Australia' }, cause: { zh: '透明的厚板状晶体，深血红色；大多留作标本，刻面的很少', en: 'Clear, thick tabular crystals of deep blood red; most stay as specimens and few are faceted' } },
    ],
  },
};

// ===== src/data/sources.js =====
// UniAether · data/sources.js — where each mineral's colours, habits and notes come from: [label, link].
// `va` is the Townshend gem spiral at the V&A that the colour-card layout follows.
// Licensed CC BY-NC 4.0 together with data/minerals.js (see LICENSE-DATA.md).
const SOURCES = {
  fluorite: [['Gemdat · Fluorite', 'https://www.gemdat.org/gem-1576.html'], ['Bill & Calas 1978', 'https://access.archive-ouverte.unige.ch/access/metadata/2b3d5acd-7ff6-4971-beba-2dd3519838f3/download'], ['Materials 2022', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8949251'], ['Mindat · Rogerley', 'https://www.mindat.org/locdetailed-4995.html'], ['FMDB · Rogerley', 'https://uvminerals.org/fmdb/specimen/1493/'], ['FossilEra · Okorusu', 'https://www.fossilera.com/minerals/2-4-green-cubic-fluorite-cluster-with-phantoms-okorusu-mine'], ['Mineral Auctions · Okorusu', 'https://mineralauctions.com/items/fluorite-with-phantoms-96648'], ['iRocks · Huanggang', 'https://www.irocks.com/minerals/specimen/49579'], ['FossilEra · Chenzhou', 'https://www.fossilera.com/minerals/1-7-green-cubic-fluorite-crystals-with-phantoms-china']],
  spinel: [['NMNHS · Spinel', 'https://nmnhs.com/gemmology/classification/gem_id_en-4BB05-Spinel.html'], ['LibreTexts · Spinel', 'https://geo.libretexts.org/Bookshelves/Geology/Gemology/16%3A_Gemstones/16.13%3A_Spinel'], ['GIA · pink spinel', 'https://www.gia.edu/gia-news-research-spinel-submitted-diamond'], ['GIA G&G 2021 · purple spinel', 'https://gia.edu/gems-gemology/fall-2021-purple-gem-spinel-vietnam-afghanistan'], ['GIA G&G 2015 · Luc Yen', 'https://www.gia.edu/gems-gemology/spring-2015-blue-spinel-luc-yen-district-vietnam'], ['Rapaport · spinel', 'https://rapaport.com/?p=38650'], ['Gemguide 2019', 'https://files.gemguide.com/pdf/2019GemFocus-AugSpinel.pdf'], ['Spinel magnetism', 'https://www.gemstonemagnetism.com/spinel_pg_2-_red_spinel_and_other_colors']],
  garnet: [['GIA · Garnet', 'https://4cs.gia.edu/wp-content/uploads/2013/12/Garnet_v4-FNL.pdf'], ['Gemdat · Garnet group', 'https://www.gemdat.org/gem-10272.html'], ['Gemmology · Garnet', 'https://gemmology-dev.pages.dev/learn/species/garnet'], ['Skyjems · Demantoid', 'https://skyjems.ca/pages/encyclopedia-demantoid'], ['TGMS · Colours in garnets', 'https://www.tgms.org/bills-archive/2017/1/13/colors-in-garnets'], ['GIA G&G 2023 · Garnet habit', 'https://www.gia.edu/articles/spring-2023-microworld-xenomorphic-garnet-in-diamond'], ['Wikipedia · Garnet', 'https://en.wikipedia.org/wiki/Garnet']],
  diamond: [['GIA G&G 2023 · Etch features (trigons)', 'https://www.gia.edu/gems-gemology/fall-2023-lab-notes-etch-features-reveal-morphology-of-diamond'], ['GIA G&G 2023 · Negative trigons', 'https://www.gia.edu/gems-gemology/fall-2023-gemnews-diamondiferous-mantle-eclogite'], ['GIA · Fancy coloured diamonds', 'https://www.gia.edu/gia-news-research-worlds-fascination-fancy-colored-diamonds'], ['GIA 4Cs · Fluorescence', 'https://4cs.gia.edu/?p=681'], ['GIA G&G 2007 · Fluorescence', 'https://cms.gia.edu/dam/jcr:cfa7ae55-ee91-4e31-a0b3-21519d1fb2ce/Winter-2007-Gems-Gemology-Fluorescence-Spectra-Colored-Diamonds.pdf'], ['Gemmology · Crystallography', 'https://gemmology-dev.pages.dev/learn/fundamentals/crystallography-advanced'], ['The Raw Stone · Diamond crystals', 'https://www.therawstone.com/blogs/news/9627699-diamond-crystals-shapes-and-other-physical-characteristics']],
  tourmaline: [['Mindat · Elbaite (fracture)', 'https://www.mindat.org/min-1364.html'], ['GIA · Tourmaline', 'https://gia.edu/tourmaline-description'], ['GIA · Tourmaline quality', 'https://gia.edu/tourmaline-quality-factor'], ['AGS · Tourmaline', 'https://www.americangemsociety.org/tourmaline-overview'], ['GIA G&G 2019 · Paraíba', 'https://www.gia.edu/gems-gemology/winter-2019-paraiba-tourmaline-geographic-origin-determination?lang=en'], ['Galleries · Elbaite', 'https://galleries.com/minerals/silicate/elbaite/elbaite.htm'], ['UT Austin · Tourmaline', 'https://www.geo.utexas.edu/courses/347k/redesign/Gem_Notes/Tourmaline/tourm_main.htm'], ['Skyjems · Elbaite colours', 'https://skyjems.ca/blogs/news/the-colours-of-tourmaline-part-3-fancy-colours-of-elbaite']],
  corundum: [['Gemmology · Corundum', 'https://gemmology-dev.pages.dev/learn/species/corundum'], ['Skyjems · Fluorescence', 'https://skyjems.ca/pages/encyclopedia-fluorescence'], ['Gübelin · Colour terms', 'https://gubelingemlab.com/en/gemstonecolourterms'], ['Valentin Magro · Ruby, sapphire', 'https://www.valentinmagro.com/gemstones/big-three-gemstones-ruby-sapphire-emerald/'], ['Skyjems · Parti sapphire', 'https://skyjems.ca/pages/encyclopedia-parti-sapphire'], ['IGS · Parti sapphires', 'https://www.gemsociety.org/article/parti-sapphires-the-colored-gemstones-for-2021/'], ['GIA G&G 2020 · Montana & Australia', 'https://gia.edu/gems-gemology/spring-2020-gemnews-sapphires-montana-australia']],
  quartz: [['UMN · Quartz (conchoidal fracture)', 'https://commonminerals.esci.umn.edu/minerals-h-s/quartz'], ['Am. Mineral. 1977 · s faces', 'https://msaweb.org/AmMin/AM62/AM62_122.pdf'], ['McGill · Quartz', 'https://www.eps.mcgill.ca/~jeannep/eps/186-210a/Quartz-factsheet.doc'], ['GIA · Rose quartz', 'https://www.gia.edu/rose-quartz-description'], ['GIA · Rose quartz quality', 'https://www.gia.edu/articles/rose-quartz-quality-factors'], ['Goreva et al. 2001', 'https://resolver.caltech.edu/CaltechAUTHORS:20130412-093427669'], ['Fox & McDonald 2023', 'https://www.igc-gemmology.org/wp-content/uploads/2024/01/2023-Fox-et-al-rose-quartz-research.pdf'], ['Skyjems · Rose quartz', 'https://skyjems.ca/pages/encyclopedia-rose-quartz'], ['Rock & Gem · Rose vs pink', 'https://rockngem.com/rose-quartz-vs-pink-quartz'], ['FossilEra · Rose quartz', 'https://www.fossilera.com/pages/does-rose-quartz-form-crystals'], ['GIA G&G 1994 · Anahí', 'https://www.gia.edu/gems-gemology/spring-1994-amethyst-citrine-bolivia-vasconcelos'], ['Skyjems · Ametrine', 'https://skyjems.ca/pages/encyclopedia-ametrine'], ['Skyjems · Bolivian amethyst', 'https://skyjems.ca/pages/encyclopedia-bolivian-amethyst'], ['Mindat · Amethyst', 'https://zh.mindat.org/mesg-350011.html'], ['Wikipedia · Citrine', 'https://en.wikipedia.org/wiki/Citrine_(quartz)'], ['Smithsonian · Ametrine', 'https://naturalhistory.si.edu/explore/collections/geogallery/10002887']],
  beryl: [['Handbook of Mineralogy · Beryl', 'https://www.handbookofmineralogy.org/pdfs/beryl.pdf'], ['Emeralds.com · Beryl varieties', 'https://www.emeralds.com/education/emerald-characteristics/beryl-varieties'], ['Skyjems · Beryl', 'https://skyjems.ca/pages/encyclopedia-beryl'], ['TGMS · Colour in beryl', 'https://tgms.org/bills-archive/2017/3/14/color-in-beryl'], ['Ganoksin · Beryl varieties', 'https://www.ganoksin.com/article/different-beryl-varieties/'], ['Sustainable Gemstones · Beryl', 'https://sustainablegemstones.org/gemstones/beryl'], ['Skyjems · Fluorescence', 'https://skyjems.ca/pages/encyclopedia-fluorescence'], ['Earth Wonders · Bicolour beryl', 'https://earthwonders.com/specimens/54814'], ['Minerals.net · Multicoloured beryl', 'https://www.minerals.net/Image/15/31/Beryl.aspx'], ['GIA G&G 2022 · Etched aquamarine, Xinjiang', 'https://www.gia.edu/gems-gemology/summer-2022-gemnews-aquamarine-etch-features-china'], ['GIA G&G 2024 · Etched aquamarine and heliodor', 'https://www.gia.edu/gems-gemology/summer-2024-microworld-heliodor-aquamarine-surface-etching'], ['GIA G&G 2021 · Heavily etched blue beryl, Pakistan', 'https://www.gia.edu/gems-gemology/summer-2021-quarterly-crystal-heavily-etched-blue-beryl-crystals-reportedly-from-pakistan'], ['GIA G&G 2023 · Etch pits in Volyn beryl', 'https://www.gia.edu/gems-gemology/fall-2023-ukrainian-beryl']],
  apatite: [['Handbook of Mineralogy · Fluorapatite', 'https://rruff.info/doclib/hom/apatitecaf.pdf'], ['Skyjems · Apatite', 'https://skyjems.ca/pages/encyclopedia-apatite'], ['LibreTexts · Apatite', 'https://geo.libretexts.org/Bookshelves/Geology/Gemology/16%3A_Gemstones/16.19%3A_Apatite'], ['Gemdat · Apatite', 'https://www.gemdat.org/gem-29229.html'], ['Juwelo · Apatite', 'https://www.juwelo.com/gemstone-information/apatite/'], ['Gemselect · Apatite', 'https://www.gemselect.com/gem-info/apatite/apatite-info.php'], ['Skyjems · Madagascar apatite', 'https://skyjems.ca/pages/encyclopedia-madagascar-apatite']],
  topaz: [['NMNHS · Topaz (after Handbook of Mineralogy)', 'https://www.nmnhs.com/gemmology/classification/gem_id_en-9AF35-Topaz.html'], ['Geology.com · Topaz', 'https://geology.com/minerals/topaz.shtml'], ['Lang Antiques · Topaz', 'https://www.langantiques.com/university/Topaz'], ['IGS · Topaz', 'https://gemsociety.org/article/topaz-jewelry-and-gemstone-information/'], ['National Jeweler · Imperial topaz', 'https://www.nationaljeweler.com/articles/538-precious-and-imperial-topaz-from-brazil'], ['Gemmology · Topaz', 'https://gemmology-dev.pages.dev/learn/species/topaz'], ['Minerals.net · Bicoloured topaz', 'https://m.minerals.net/RoughImage/10/30/Topaz.aspx']],
  chrysoberyl: [['Skyjems · Chrysoberyl', 'https://skyjems.ca/pages/encyclopedia-chrysoberyl'], ['GIA G&G · Alexandrite 2013', 'https://www.gia.edu/gems-gemology/wn13-titanium-synthetic-alexandrite'], ['Geologyin · Chrysoberyl', 'https://geologyin.com/2020/03/chrysoberyl-one-of-worlds-most-exotic.html'], ['Harry & Co · Chrysoberyl', 'https://harryandcojewellery.com.au/blogs/glossary/chrysoberyl'], ['Skyjems · Fluorescence', 'https://skyjems.ca/pages/encyclopedia-fluorescence'], ['Skyjems · Alexandrite', 'https://skyjems.ca/pages/encyclopedia-alexandrite']],
  zoisite: [['Handbook of Mineralogy · Zoisite', 'https://www.handbookofmineralogy.org/pdfs/zoisite.pdf'], ['Gemmology · Zoisite', 'https://gemmology-dev.pages.dev/learn/species/zoisite'], ['Skyjems · Tanzanite', 'https://skyjems.ca/pages/text-encyclopedia-tanzanite'], ['LibreTexts · Tanzanite', 'https://geo.libretexts.org/Bookshelves/Geology/Gemology/16%3A_Gemstones/16.07%3A_Zoisite/16.7.01%3A_Tanzanite'], ['IGS · Tanzanite', 'https://gemsociety.org/article/tanzanite-jewelry-and-gemstone-information'], ['Earth Wonders · Zoisite', 'https://earthwonders.com/guides/zoisite'], ['Schwarzinger et al. 2025', 'https://www.igc-gemmology.org/wp-content/uploads/2025/11/2025-Schwarzinger-et-al-Zoisite-and-its-many-colors.pdf']],
  moonstone: [['GIA · Moonstone', 'https://4cs.gia.edu/?p=8957'], ['IGS · Moonstone', 'https://www.gemsociety.org/article/moonstone-jewelry-gem-information'], ['Skyjems · Moonstone', 'https://skyjems.ca/pages/encyclopedia-moonstone'], ['Skyjems · Blue sheen', 'https://skyjems.ca/pages/encyclopedia-blue-sheen'], ['Geology.com · Moonstone', 'https://geology.com/gemstones/moonstone/'], ['Nivoda · Moonstone', 'https://gemstones.nivoda.com/gem/moonstone']],
  euclase: [['IGS · Euclase', 'https://www.gemsociety.org/article/euclase-jewelry-and-gemstone-information'], ['Skyjems · Euclase', 'https://skyjems.ca/pages/encyclopedia-euclase'], ['Gemdat · Euclase', 'https://www.gemdat.org/gem-1418.html'], ['Gem Rock Auctions · Euclase', 'https://gemrockauctions.com/learn/a-z-of-gemstones/euclase'], ['Gilles-Guéry et al. 2022 · Am. Mineral.', 'https://msaweb.org/MSA/AmMin/products/AmMin/AM107P0489.pdf'], ['Geology.com · Euclase', 'https://geology.com/minerals/euclase.shtml'], ['Handbook of Mineralogy · Euclase', 'https://www.handbookofmineralogy.org/pdfs/euclase.pdf']],
  amazonite: [['Hofmeister & Rossman 1985 · Am. Mineral.', 'https://msaweb.org/AmMin/AM70/AM70_794.pdf'], ['Wikipedia · Amazonite', 'https://en.wikipedia.org/wiki/Amazonite'], ['Crystals.com · Amazonite', 'https://www.crystals.com/collections/amazonite-crystal'], ['Earth Wonders · Crystal Peak', 'https://earthwonders.com/wiki/amazonite_from_crystal-peak_usa_61521'], ['FluoMin · Amazonite', 'https://fluomin.org/uk/fiche.php?id=273']],
  rhodonite: [['Minerals.net · Rhodonite', 'https://minerals.net/mineral/rhodonite.aspx'], ['Skyjems · Rhodonite', 'https://skyjems.ca/pages/encyclopedia-rhodonite'], ['IGS · Rhodonite', 'https://www.gemsociety.org/article/rhodonite-jewelry-and-gemstone-information'], ['Australian Museum · Rhodonite', 'https://australian.museum/learn/minerals/gemstones/rhodonite'], ['Gemdat · Rhodonite', 'https://www.gemdat.org/gem-3407.html'], ['Rock & Gem · Rhodonite', 'https://rockngem.com/rhodonite']],
  cordierite: [['GIA · Iolite', 'https://www.gia.edu/iolite'], ['GIA · Iolite description', 'https://www.gia.edu/articles/iolite-description'], ['GIA · Iolite facts', 'https://www.gia.edu/iolite/gem-overview'], ['IGS · Cordierite', 'https://www.gemsociety.org/article/cordierite-jewelry-and-gemstone-information/'], ['Gemdat · Cordierite', 'https://www.gemdat.org/gem-1128.html'], ['Geology.com · Cordierite', 'https://geology.com/minerals/cordierite.shtml'], ['LibreTexts · Iolite', 'https://geo.libretexts.org/Bookshelves/Geology/Gemology/16%3A_Gemstones/16.41%3A_Iolite']],
  peridot: [['Skyjems · Peridot', 'https://skyjems.ca/pages/encyclopedia-peridot'], ['IGS · Peridot', 'https://www.gemsociety.org/article/peridot-jewelry-and-gemstone-information/'], ['Galleries · Peridot', 'https://galleries.com/minerals/gemstone/peridot/peridot.htm'], ['EarthDate · Peridot', 'https://www.earthdate.org/gems-from-deep-earth-or-deep-space'], ['Gemmology · Olivine', 'https://gemmology-dev.pages.dev/learn/species/olivine'], ['Minerals.net · Peridot', 'https://minerals.net/gemstone/peridot']],
  zircon: [['IGS · Zircon', 'https://www.gemsociety.org/article/zircon-jewelry-and-gemstone-information/'], ['UT Austin · Zircon', 'https://www.geo.utexas.edu/courses/347k/redesign/Gem_Notes/Zircon/zircon_main.htm'], ['Gemmology · Zircon', 'https://gemmology-dev.pages.dev/learn/species/zircon'], ['Minerals.net · Zircon', 'https://minerals.net/gemstone/zircon'], ['Lang Antiques · Zircon', 'https://www.langantiques.com/university/?p=70414']],
  wulfenite: [['Smithsonian · Wulfenite', 'https://naturalhistory.si.edu/explore/collections/geogallery/10026003'], ['AMMNRE · Wulfenite', 'https://ammnre.arizona.edu/news/featured-mineral-wulfenite'], ['FossilEra · Wulfenite', 'https://www.fossilera.com/pages/wulfenite-one-of-nature-s-most-striking-lead-minerals'], ['Earth Wonders · Red Cloud', 'https://earthwonders.com/guides/wulfenite_from_red-cloud-mine_usa_210568'], ['HyperPhysics · Wulfenite', 'https://hyperphysics.gsu.edu/hbase/minerals/Wulfenite.html']],
  apophyllite: [['Handbook of Mineralogy · Fluorapophyllite', 'https://www.handbookofmineralogy.org/pdfs/fluorapophyllite.pdf'], ['Minerals.net · Apophyllite', 'https://www.minerals.net/Mineral/Apophyllite.aspx'], ['Galleries · Apophyllite', 'https://galleries.com/minerals/silicate/apophyll/apophyll.htm'], ['IGS · Apophyllite', 'https://www.gemsociety.org/article/apophyllite-jewelry-and-gemstone-information/'], ['Gemstones.com · Apophyllite', 'https://gemstones.com/gemopedia/apophyllite'], ['Gem School · Apophyllite', 'https://gemschool-dev.squarespace.com/crystal-a-to-h/apophyllite']],
  tugtupite: [['GIA G&G 1982 · Tugtupite', 'https://origin.prod.gia.edu/dam/jcr:a9e536c1-98f5-4ba9-a5b8-34a7d97dda75/Tugtupite-A-Gemstone-from-Greenland.pdf'], ['Skyjems · Ilímaussaq', 'https://skyjems.ca/pages/encyclopedia-ilimaussaq'], ['FMDB · Tugtupite', 'https://uvminerals.org/fmdb/specimen/3/'], ['FMDB · Tugtupite crystals', 'https://uvminerals.org/fmdb/specimen/859/']],
  spodumene: [['Schaller · Spodumene etch figures', 'https://palagems.com/spodumene'], ['GIA G&G 2018 · Triangular etch marks', 'https://www.gia.edu/gems-gemology/spring-2018-microworld-pink-tourmaline-spodumene'], ['Mindat · Spodumene', 'https://www.mindat.org/min-3733.html'], ['JMU · Kunzite', 'https://csmgeo.csm.jmu.edu/geollab/kearns/Minerals/Kunzite.html'], ['Gemselect · Spodumene', 'https://gemselect.com/gem-info/spodumene/spodumene-info.php'], ['GemRock · Spodumene', 'https://www.gemrockauctions.com/learn/a-z-of-gemstones/spodumene'], ['LibreTexts · Spodumene', 'https://geo.libretexts.org/Bookshelves/Geology/Gemology/16%3A_Gemstones/16.11%3A_Spodumene'], ['MFA CAMEO · Spodumene', 'https://cameo.mfa.org/wiki/Spodumene'], ['Gemsprings · Kunzite', 'https://gemsprings.com/mineralpedia/kunzite'], ['Minerals.net · Multicoloured spodumene', 'https://m.minerals.net/Image/11/127/Spodumene.aspx'], ['McDougall · Zoned spodumene', 'https://www.mcdougallminerals.com/?p=21552']],
  titanite: [['Geology.com · Titanite', 'https://geology.com/minerals/titanite.shtml'], ['Gemdat · Titanite', 'https://www.gemdat.org/gem-3977.html'], ['Gemselect · Sphene', 'https://www.gemselect.com/gem-info/sphene/sphene-info.php'], ['GemRock · Sphene', 'https://www.gemrockauctions.com/tw/learn/a-z-of-gemstones/sphene']],
  kyanite: [['Handbook of Mineralogy · Kyanite', 'https://www.handbookofmineralogy.org/pdfs/kyanite.pdf'], ['Skyjems · Kyanite', 'https://skyjems.ca/pages/encyclopedia-kyanite'], ['Minerals.net · Kyanite', 'https://minerals.net/Mineral/Kyanite.aspx'], ['Mineral Expert · Kyanite', 'https://mineralexpert.org/article/kyanite-aluminosilicate-mineral-overview'], ['Gem Adventurer · Kyanite', 'https://www.gemadventurer.com/?p=78']],
  labradorite: [['Skyjems · Labradorescence', 'https://skyjems.ca/pages/encyclopedia-labradorescence'], ['Skyjems · Spectrolite', 'https://skyjems.ca/pages/encyclopedia-finnish-spectrolite'], ['Crystals.com · Labradorite', 'https://www.crystals.com/blogs/news/labradorite-crystal-guide'], ['FossilEra · Labradorite', 'https://www.fossilera.com/pages/labradorite-mineral-crystal-guide']],
  va: [['The Times · V&A jewellery gallery', 'https://www.thetimes.co.uk/life-style/luxury/article/the-strange-tales-behind-the-jewels-at-the-v-and-a-times-luxury-w6hgx0xkd'], ['V&A · Townshend ring', 'https://collections.vam.ac.uk/item/O122635/ring-unknown']],
};

// ===== src/core/shader.js =====
// UniAether · core/shader.js — the whole look in one fragment shader (WebGL2). Every pixel traces a ray through the crystals:
// faces, refraction, absorption by thickness, colour zoning, pleochroism, dispersion, films, the projection on the ground, the structure lines.
// —— 实时的那一版：同一套画法搬进着色器（WebGL2），可以转、可以看它长大；勾边的颜色跟着受光走 ——
const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `#version 300 es
precision highp float;
out vec4 outC;
uniform vec2 uRes; uniform float uQ, uTime, uUV;
uniform mat3 uR[5]; uniform vec3 uT[5]; uniform float uS[5]; uniform float uF[5];
uniform vec3 uL, uLF;
uniform vec4 uStar[8]; uniform float uHue[8];
uniform vec4 uP[90];   // 每颗晶体最多18个晶面：法线和到中心的距离（在它自己的坐标里）
uniform float uG[5]; uniform float uLine, uSet, uProj;   // 生长：每颗晶体长到哪了；线画到哪了；玻璃定下来没有；投影显出来多少
const int K = 5, M = 18;
const float CAP = .2;
const float U = 142., SE = .5591929, CE = .8290376;
const vec2 C = vec2(384., 660.);
const vec3 PAPER = vec3(.953, .949, .965), NIGHT = vec3(.098, .1137, .2196), DEEP0 = vec3(.329, .282, .588), GLOW0 = vec3(.847, .949, .918);
#define DEEP uDeepC
#define GLOW uGlowC
// 色带：萤石沿着立方体一层层长大，每一层留下自己的颜色。从心到皮：海绿、一线蜜色、青蓝、一道深紫的幻影线、淡丁香、紫、最外一层靛紫
uniform float uFrost, uSoft, uVar, uClear, uTerr, uStep;
uniform float uCleave, uLus, uDisp;
uniform vec3 uDeepL, uMidL, uDeepC, uGlowC, uUVa, uUVb, uUVc, uUVg, uUVh, uBack, uEnv0, uEnv1, uEnv2, uEnv3, uHiT, uLoT, uRimB;
uniform vec3 uHid[4]; uniform float uStri, uStriD, uConch, uEtch, uEtchT, uGem; uniform float uHidA, uFilmK, uFilmH, uFilmR, uCOff, uFilmW, uZAx, uBand, uChord, uIn, uIOR, uPh, uAst, uPl, uLab, uGlowK, uSpk, uVein, uVeinM; uniform vec3 uAxR, uLabN, uGlowCol, uPlA, uPlB, uPlC, uSpkCol, uVeinCol, uLabX;
uniform vec3 uZ[7];
uniform float uWarm, uStain, uAlpha;
uniform float uK[5];   // UniAether：0 是晶体（一组晶面），1 是磨圆的矿石球
#define Z0 uZ[0]
#define Z1 uZ[1]
#define Z2 uZ[2]
#define Z3 uZ[3]
#define Z4 uZ[4]
#define Z5 uZ[5]
#define Z6 uZ[6]
float zb(float a, float r){ return smoothstep(a - uSoft, a + uSoft, r); }
// 细的色带单独算：光线穿过一层很薄的立方壳，走了多长
float shell(int k, vec3 o, vec3 d, float a, float w){ if (uK[k] > .5) { float bb = dot(o, d), b2 = dot(o, o) - bb * bb; if (b2 >= a * a) return 0.; float c = sqrt(max(1e-4, 1. - b2 / (a * a))); return 2. * min(w / max(c, .06), sqrt(a * a - b2)); }   // 球里的一层薄壳
  float tn = -1e9, tf = 1e9, cn = 1., cf = 1., hn = 1., hf = 1.;
  for (int i = 0; i < M; i++) { vec4 P = uP[k * M + i]; float dn = dot(P.xyz, d), c = P.w * a - dot(P.xyz, o); if (dn < -1e-6) { float t = c / dn; if (t > tn) { tn = t; cn = -dn; hn = P.w; } } else if (dn > 1e-6) { float t = c / dn; if (t < tf) { tf = t; cf = dn; hf = P.w; } } else if (c < 0.) return 0.; }
  if (tn >= tf) return 0.; float half_ = (tf - tn) * .5; return min(hn * w / max(cn, .06), half_) + min(hf * w / max(cf, .06), half_); }
vec3 lines(int k, vec3 o, vec3 d){ float F = uF[k], g = uG[k]; vec3 t = vec3(0.); if (g >= .36) t += Z1 * shell(k, o, d, .36 * F, .04 * F); if (g >= .62) t += Z3 * shell(k, o, d, .62 * F, .03 * F); if (g >= .78) t += Z3 * .6 * shell(k, o, d, .78 * F, .018 * F); if (g >= .985) t += Z6 * shell(k, o, d, .985 * F, .028 * F); return t; }
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
float sand(vec2 p, float sc){ vec2 r = vec2(p.x * .8 + p.y * .6, p.y * .8 - p.x * .6); return (vn(r / sc) - .5) * 1.3 + (hash(floor(p)) - .5) * .55 + (vn(r / (sc * 2.7) + 40.) - .5) * .8; }
vec3 toWorld(vec3 v){ return vec3(v.x, CE * v.y + SE * v.z, -SE * v.y + CE * v.z); }
vec3 toView(vec3 w){ return vec3(w.x, CE * w.y - SE * w.z, SE * w.y + CE * w.z); }
vec3 PN(int k, int i){ return uP[k * M + i].xyz; }
vec3 NRM(int k, int i, vec3 p){ return uK[k] > .5 ? normalize(p) : PN(k, i); }   // 这一点的法线：晶体看是哪个面，球看这一点
vec2 tgradN(vec3 n, vec3 D, vec3 ax, vec3 ay){ float dd = dot(n, D); dd = abs(dd) < 1e-4 ? 1e-4 : dd; return vec2(dot(n, ax), dot(n, ay)) / dd; }
// 这一点在第几层：晶体按自己的晶面一层层往外长，长到最外面是1
float gauge(int k, vec3 p){ if (uK[k] > .5) return length(p); float g = 0.; for (int i = 0; i < M; i++) { vec4 P = uP[k * M + i]; g = max(g, dot(P.xyz, p) / P.w); } return g; }
// 一扇窗映在石头上：边是直的，中间有窗棂。通透的石头靠这种干净利落的反光
float window(vec3 r, vec3 W){ vec3 wu = normalize(cross(vec3(0., 1., 0.), W)), wv = cross(W, wu); float f = dot(r, W); if (f < .2) return 0.; float a = dot(r, wu) / f, b = dot(r, wv) / f;
  return (1. - smoothstep(.30, .312, abs(a))) * (1. - smoothstep(.21, .222, abs(b))) * smoothstep(.01, .02, abs(a - .05)) * smoothstep(.008, .018, abs(b + .03)); }
const vec3 WA = vec3(-.766, .287, .575), WB = vec3(.6247, .3123, .7155);
float gaugeI(int k, vec3 p, out int gi){ float g = 0.; gi = 0; if (uK[k] > .5) return length(p); for (int i = 0; i < M; i++) { vec4 P = uP[k * M + i]; float v = dot(P.xyz, p) / P.w; if (v > g) { g = v; gi = i; } } return g; }
float fhash(vec3 n, float k){ return fract(sin(dot(n, vec3(12.9898, 78.233, 37.719)) + k * 1.7) * 43758.5453); }
// 贝壳状断口的一圈圈弧：rq 是面上离敲击点的位置（像素）。给出第几圈（带小数）、走一像素过几圈、这一段弧留不留
vec3 conchRing(vec2 rq, vec3 nl, float ii){ float rr = length(rq), an = atan(rq.y, rq.x), sc = .8 + .5 * fhash(nl, 53.), w = sqrt(rr * sc) * .8 + (vn(vec2(an * 2.2, rr / 70.) + 3.) - .5) * .22;
  return vec3(w, .8 * sqrt(sc) / (2. * sqrt(max(rr, 1.))), smoothstep(.2, .45, vn(vec2(floor(w) * 1.7, an * 1.6 + ii)))); }
// 解理面上的细台阶：u 是垂直于台阶方向的位置，v 是沿着台阶的位置（像素）。给出台阶的坐标和这一段有没有
vec2 clvStep(float u, float v, float ii){ float w = u / 27. + (vn(vec2(v / 95., 1.3 + ii)) - .5) * .4; return vec2(w, smoothstep(.3, .5, vn(vec2(v / 46., floor(w) * 1.3))) * step(.5, hash(vec2(floor(w), 3.7 + ii)))); }
// 生长扇区：每个晶面往里对着的那一块，颜色深浅和偏向各不一样（有的几乎无色，有的很浓）
vec3 sector(int k, int gi, vec3 sig){ vec3 n = PN(k, gi); float h1 = fhash(n, float(k)), h2 = fract(h1 * 7.13 + .37), m = dot(sig, vec3(.3333)); vec3 alt = h2 < .5 ? uZ[2] : uZ[5]; alt = alt / max(1e-4, dot(alt, vec3(.3333))) * m;
  return mix(sig, alt, .55 * uVar * step(.3, h2)) * mix(1. - .78 * uVar, 1. + .35 * uVar, h1); }
vec2 tgrad(int k, int i, vec3 D, vec3 ax, vec3 ay){ vec3 n = PN(k, i); return vec2(dot(n, ax), dot(n, ay)) / dot(n, D); }
vec3 sigmaAt(float r){ vec3 c = Z0 * (.5 + .5 * smoothstep(.04, .26, r)); c = mix(c, Z2, smoothstep(.36 - uSoft * .6, .36 + uSoft * .6, r)); c = mix(c, Z4, zb(.62, r)); c = mix(c, Z5, zb(.95, r)); return c * 1.0; }
float gAF = -1., gRM = 0.; int gAK = -1; vec3 gDl = vec3(0., 1., 0.), gDw = vec3(0., 1., 0.);
vec3 sigmaAx(float a){ if (uBand > .5) { vec3 c = uZ[0]; for (int i = 1; i < 7; i++) { float e = float(i) / 7.; c = mix(c, uZ[i], smoothstep(e - .022, e + .022, a)); } return c; } vec3 c = Z0; c = mix(c, Z2, smoothstep(.27, .33, a)); c = mix(c, Z4, smoothstep(.52, .58, a)); c = mix(c, Z5, smoothstep(.78, .84, a)); return c; }
vec3 sigZ(int j, vec3 pp, float rho){ vec3 s0 = sigmaAt(j == gAK ? mix(rho, gRM, uChord) : rho); if (uZAx < .001) return s0; float a = clamp((pp.y / uF[j] - uAxR.x) / (uAxR.y - uAxR.x), 0., 1.); if (j == gAK) a = mix(a, gAF, .72); return mix(s0, sigmaAx(a), uZAx); }
vec3 sigP(int j, vec3 s){ if (uPl < .001 || gAK < 0) return s; vec3 dl = j == gAK ? gDl : normalize(transpose(uR[j]) * gDw), w = dl * dl; w *= w; w /= max(1e-4, w.x + w.y + w.z); return mix(s, w.x * uPlA + w.y * uPlB + w.z * uPlC, uPl); }   // 多色性：顺着晶体三个方向看，吸掉的光不一样
float lineA(float d, float w){ return clamp(w + .9 - d, 0., 1.); }

vec3 lad4(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return t < 1. ? mix(a, b, t) : (t < 2. ? mix(b, c, t - 1.) : mix(c, d, clamp(t - 2., 0., 1.))); }
float lad4f(float t, float a, float b, float c, float d){ return t < 1. ? mix(a, b, t) : (t < 2. ? mix(b, c, t - 1.) : mix(c, d, clamp(t - 2., 0., 1.))); }
float lightOn(vec3 n){ return max(0., dot(n, uL)) + .55 * max(0., dot(n, uLF)); }
// 一个面映出来的环境：从上到下是亮的天、冷的白、一道珍珠粉、灰紫、深靛，左前方还有一块窗光。面是平的，所以整面一起换颜色
vec3 envR(vec3 r){ float u = r.y; vec3 c = uEnv0; c = mix(c, uEnv1, smoothstep(-.42, -.36, u)); c = mix(c, uEnv2, smoothstep(-.02, .04, u)); c = mix(c, uEnv3, smoothstep(.25, .31, u)); c = mix(c, vec3(1., .99, .97), smoothstep(.6, .66, u));
  return mix(c, vec3(1.), smoothstep(.8, .86, dot(r, vec3(-.766, .287, .575)))); }
// 小星闪：四角星落在受光的顶点上。芯是白的，四道细光一长一短，外面一圈很淡的紫、青或粉
vec3 starry(vec3 col, vec2 pix){
  for (int i = 0; i < 8; i++) { vec4 st = uStar[i]; if (st.w < .02) continue; vec2 d = pix - st.xy; float sz = st.z, I = st.w; if (abs(d.x) > sz * 1.3 || abs(d.y) > sz * 1.3) continue;
    d = vec2(.9902 * d.x - .1395 * d.y, .1395 * d.x + .9902 * d.y); float r = length(d), R = sz * (.19 + .12 * I);
    // 四芒星：四个尖，四条往里收的弧边，边是利落的；竖的一对尖长一点，往尖上慢慢淡下去
    vec2 e = abs(vec2(d.x * 1.34, d.y)) / R; float a = pow(e.x, .58) + pow(e.y, .58), star = (1. - smoothstep(.93, 1.02, a)) * (.5 + .5 * exp(-r / (R * .42)));
    vec2 e2 = abs(vec2(d.x + d.y, d.x - d.y)) * .7071 / (R * .3); float star2 = (1. - smoothstep(.9, 1.02, pow(e2.x, .62) + pow(e2.y, .62))) * .8;                 // 中间斜着一颗小的
    vec2 eo = abs(vec2(d.x * 1.34, d.y)) / (R * 1.09); float rim = clamp((1. - smoothstep(.93, 1.02, pow(eo.x, .58) + pow(eo.y, .58))) - (1. - smoothstep(.93, 1.02, a)), 0., 1.);   // 星的外沿一线分出来的颜色
    float core = exp(-r * r / (R * R * .01 + .7)), glow = exp(-r * r / (R * R * .2));
    vec3 aura = mix(mix(vec3(.74, .64, .96), vec3(.54, .86, .86), smoothstep(.25, .5, uHue[i])), vec3(.98, .72, .84), smoothstep(.62, .88, uHue[i])); aura = mix(aura, vec3(.4, .62, 1.), uUV);
    col = mix(col, aura, glow * I * .3); col = mix(col, aura * .45 + .55, rim * I * .55);
    col = mix(col, mix(vec3(1.), vec3(.92, .96, 1.), uUV), clamp(max(star, star2) + core, 0., 1.) * min(1., I * 1.3)); }
  return col;
}
// 一条光线穿过第k颗立方体（在它自己的坐标里算）：从哪个面进、哪个面出
bool box(int k, vec3 o, vec3 d, out float tn, out float tf, out int an, out int af, out vec3 ol, out vec3 dl){
  mat3 Rt = transpose(uR[k]); ol = Rt * (o - uT[k]); dl = Rt * d; float s = uS[k]; tn = -1e9; tf = 1e9; an = 0; af = 0; bool hit = true;
  if (uK[k] > .5) { float b = dot(ol, dl), h = b * b - dot(ol, ol) + s * s; if (h < 0. || s < 1e-4) { tn = 1e9; tf = -1e9; return false; } h = sqrt(h); tn = -b - h; tf = -b + h; return true; }   // 球：光线和球面的两个交点
  for (int i = 0; i < M; i++) { vec4 P = uP[k * M + i]; float dn = dot(P.xyz, dl), c = P.w * s - dot(P.xyz, ol);
    if (dn < -1e-6) { float t = c / dn; if (t > tn) { tn = t; an = i; } } else if (dn > 1e-6) { float t = c / dn; if (t < tf) { tf = t; af = i; } } else if (c < 0.) hit = false; }
  return hit && tf > tn && s > 1e-4;
}
// 落在第i个面上的点，离这个面最近的棱有多少像素；顺便给出沿棱的位置、棱那边是哪个面
float faceEdge(int k, vec3 p, int i, vec3 dl, vec3 ax, vec3 ay, float s, out float along, out int nb){
  if (uK[k] > .5) { along = 0.; nb = i; return 1e9; }   // 球没有棱
  vec3 n = PN(k, i); float dn = dot(n, dl); vec3 px = ax - dl * (dot(n, ax) / dn), py = ay - dl * (dot(n, ay) / dn); float best = 1e9; nb = i;
  for (int j = 0; j < M; j++) { if (j == i) continue; vec4 P = uP[k * M + j]; if (dot(P.xyz, P.xyz) < .5) continue; float g = length(vec2(dot(P.xyz, px), dot(P.xyz, py))); if (g < 1e-6) continue; float dd = (P.w * s - dot(P.xyz, p)) / g; if (dd < best) { best = dd; nb = j; } }
  vec3 e = cross(n, PN(k, nb)); along = dot(p, e / max(1e-6, length(e))); return best;
}
// 纸和投影：从纸上这一点朝光看，穿过了多厚、什么颜色的晶体
void ground(vec2 pix, out vec3 day, out vec3 uvc){
  vec3 G = vec3((pix.x - C.x) / U, 0., (pix.y - C.y) / (U * SE)), gx = vec3(1. / U, 0., 0.), gy = vec3(0., 0., 1. / (U * SE));
  float lo = 1e9, hi = -1e9, din = 0., hd = 1e9; float tn[K]; float tf[K]; vec3 ol[K]; vec3 dl[K]; bool ok[K];
  for (int k = 0; k < K; k++) { int an, af; ok[k] = box(k, G, uL, tn[k], tf[k], an, af, ol[k], dl[k]); if (uS[k] < 1e-4) { ok[k] = false; continue; }
    { vec3 gc = uT[k] - uL * (uT[k].y / uL.y); hd = min(hd, length(vec2((G.x - gc.x) * U, (G.z - gc.z) * U * SE)) - uS[k] * U * 1.2); }
    mat3 Rt = transpose(uR[k]); vec3 ax = Rt * gx, ay = Rt * gy, D = dl[k];
    float dd = (tf[k] - tn[k]) / max(1e-6, length(tgradN(NRM(k, an, ol[k] + tn[k] * D), D, ax, ay) - tgradN(NRM(k, af, ol[k] + tf[k] * D), D, ax, ay)));
    if (ok[k] && tf[k] > 0.) { din = max(din, dd); lo = min(lo, max(tn[k], 0.)); hi = max(hi, tf[k]); } else ok[k] = false; }
  vec3 tau = vec3(0.);
  if (hi > lo) { float dt = (hi - lo) / 8.; for (int q = 0; q < 8; q++) { float t = lo + (float(q) + .5) * dt; for (int k = 0; k < K; k++) { if (ok[k] && t >= tn[k] && t <= tf[k]) { vec3 p = ol[k] + t * dl[k]; int gi; float rho = gaugeI(k, p, gi) / uF[k]; if (rho <= uG[k]) { tau += sector(k, gi, sigP(k, sigZ(k, p, rho))) * dt; break; } } } } }   // 还没长到的地方不吸收
  float lf = vn(pix / 150.) - .5, fib = hash(floor(pix)) - .5, m = smoothstep(0., 2.6, din), ring = m * (1. - smoothstep(3., 10., din)), core = smoothstep(.3, .95, din / (U * .5)) * .7, wash = 1. + (vn(pix / 46.) - .5) * .16;
  for (int k = 0; k < K; k++) { if (ok[k]) tau += lines(k, ol[k], dl[k]); }
  vec3 S = .44 + .56 * pow(exp(-tau * .8 / (1. + tau * .3)), vec3(wash)); S += ((1. - (1. - S) * .2) - S) * core; S *= 1. - .1 * ring; S *= 1. - .02 * (vn(pix / 1.7) - .5);
  float halo = exp(-max(hd, 0.) / 30.) * (1. - m);
  day = PAPER * (1. + lf * .018 + fib * .014) * mix(vec3(1.), S, m * uProj) * (1. - vec3(.05, .04, .025) * halo * uProj);
  float mu = smoothstep(0., 13., din), hu = exp(-max(hd, 0.) / 30.);                                                       // 紫外灯下还是那块投影，边缘往里羽化一点，和外面那圈柔光接上
  uvc = NIGHT * (1. + lf * .16 + fib * .05) + uUVg * mix(hu * .4, .62, mu) * .42 * uProj;
}
// UniAether：最后一步。星闪、白炽灯的暖、低品相的污渍、透明背景（预乘 alpha）
vec3 blob(vec2 pix, vec2 at, vec2 r, vec3 c, float k){ float d = length((pix - at) / r); return mix(vec3(1.), c, k * clamp(1. - d / .7, 0., 1.)); }
vec3 stainAt(vec2 pix){ vec3 m = blob(pix, vec2(334.4, 312.), vec2(79.2, 72.8), vec3(.784, .761, .847), .85) * blob(pix, vec2(510.4, 468.), vec2(61.6, 93.6), vec3(.745, .722, .816), .8)
  * blob(pix, vec2(404.8, 603.2), vec2(96.8, 62.4), vec3(.808, .788, .871), .85) * blob(pix, vec2(264., 520.), vec2(44., 52.), vec3(.769, .745, .839), .8); return mix(vec3(1.), m, uStain); }
vec4 finish(vec3 c, vec2 pix, float a){
  vec3 s = starry(c, pix), glint = max(s - c, vec3(0.));
  if (uWarm > .001) { float r = length((pix - vec2(440., 437.)) / 560.); vec3 w = mix(vec3(1., .941, .871), vec3(1., .851, .706), smoothstep(0., .62, r)); w = mix(w, vec3(.984, .812, .651), smoothstep(.62, 1., r)); s *= mix(vec3(1.), w, .5 * uWarm); }
  if (uStain > .001) s *= stainAt(pix);
  if (uAlpha > .5) { float ga = clamp(max(glint.r, max(glint.g, glint.b)), 0., 1.); return vec4(min(s, vec3(1.)) * a + glint * (1. - a), clamp(a + ga * (1. - a), 0., 1.)); }
  return vec4(s, 1.); }
void main(){
  vec2 pix = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uQ;
  vec2 wv = (vec2(vn(pix / 52.), vn(pix / 52. + vec2(31., 7.))) - .5) * 2.4;            // 棱线轻轻晃一点，像手画的
  float x = (pix.x + wv.x - C.x) / U, y = -(pix.y + wv.y - C.y) / U;
  vec3 o = toWorld(vec3(x, y, 0.)), d = vec3(0., -SE, -CE), dox = vec3(1. / U, 0., 0.), doy = toWorld(vec3(0., -1. / U, 0.)), LV = toView(uL);
  float TN[K]; float TF[K]; vec3 OL[K]; vec3 DL[K]; vec3 AX[K]; vec3 AY[K]; bool OK[K]; int AN[K]; int AF[K]; float SD[K];
  int near = -1; float tn = 1e9, tfar = -1e9, dOut = 1e9;   // dOut：离最近一颗晶体大概还有多少像素（紫外灯下的光晕用）
  for (int k = 0; k < K; k++) { OK[k] = box(k, o, d, TN[k], TF[k], AN[k], AF[k], OL[k], DL[k]); mat3 Rt = transpose(uR[k]); AX[k] = Rt * dox; AY[k] = Rt * doy;
    vec3 D = DL[k]; int an = AN[k], af = AF[k];
    SD[k] = (TF[k] - TN[k]) / max(1e-6, length(tgradN(NRM(k, an, OL[k] + TN[k] * D), D, AX[k], AY[k]) - tgradN(NRM(k, af, OL[k] + TF[k] * D), D, AX[k], AY[k])));
    if (uS[k] < 1e-4) { OK[k] = false; continue; }
    { vec3 pc = OL[k] - DL[k] * dot(OL[k], DL[k]); dOut = min(dOut, (gauge(k, pc) - uS[k]) * U * .66); }
    if (OK[k]) { if (TN[k] < tn) { tn = TN[k]; near = k; } tfar = max(tfar, TF[k]); } }
  vec3 day, uvc;
  if (near < 0) { ground(pix, day, uvc); float g = exp(-max(dOut, 0.) / 24.); uvc += uUVh * g * g * .62 * uProj; if (uGlowK > .001) { float hg = exp(-max(dOut, 0.) / 38.) * uGlowK * (.9 + .1 * sin(uTime * 1.1)); day = mix(day, day * (1. - .1 * hg) + uGlowCol * .2 * hg, hg); } outC = finish(mix(day, uvc, uUV), pix, 0.); return; }
  int k = near, i = AN[k]; float s = uS[k]; vec3 Dl = DL[k], p = OL[k] + tn * Dl;
  vec3 nw = uR[k] * NRM(k, i, p), nv = toView(nw); float th = tfar - tn;

  ground(pix + vec2(-nv.x, nv.y) * .1 * th * U * uSet, day, uvc); gAK = k; gAF = clamp(((OL[k].y + (tn + th * .5) * Dl.y) / uF[k] - uAxR.x) / (uAxR.y - uAxR.x), 0., 1.); gRM = gauge(k, OL[k] + (tn + th * .5) * Dl) / uF[k]; { vec3 rr = refract(Dl, NRM(k, i, p), 1. / max(uIOR, 1.01)); gDl = dot(rr, rr) > .5 ? normalize(rr) : normalize(Dl); gDw = normalize(uR[k] * gDl); }   // 多色性按折进去以后的方向算：不同的面透出不同的颜色                           // 折射：隔着这个面看，后面的纸和投影挪开一点
  vec3 tau = vec3(0.); float len = 0., fg = 0., dt = th / 16., jit = hash(floor(pix * uQ) + 7.3), flu = 0.;                              // 体色：顺着视线一段段吸收（中心绿、外圈紫）；只算已经长出来的那部分
  for (int q = 0; q < 16; q++) { float t = tn + (float(q) + .3 + .4 * jit) * dt; bool grown = false; float din2 = 0., dout2 = 1e9; vec3 sg2 = vec3(0.);
    for (int j = 0; j < K; j++) { if (OK[j] && t >= TN[j] && t <= TF[j]) { vec3 pp = OL[j] + t * DL[j]; int gi; float rho = gaugeI(j, pp, gi) / uF[j];
        if (rho <= uG[j]) { if (!grown) sg2 = sector(j, gi, sigP(j, sigZ(j, pp, rho))); grown = true; din2 = max(din2, (uG[j] - rho) * uF[j]); } else dout2 = min(dout2, (rho - uG[j]) * uF[j]); } }
    if (grown) { tau += sg2 * dt; len += dt; flu += dot(sg2, vec3(.3333)) * dt; } float sd = grown ? din2 : dout2; fg += exp(-sd * sd / .0018) * dt; }
  for (int j = 0; j < K; j++) { if (OK[j]) tau += lines(j, OL[j], DL[j]); }
  day *= exp(-tau / (1. + tau * CAP)); { vec3 hu1 = day / max(.001, max(day.r, max(day.g, day.b))); float lr = len / max(s, 1e-3), core = smoothstep(.2, .7, lr) * (1. - smoothstep(1., 2.4, lr)); day = mix(day, min(vec3(1.), day * 1.2 + hu1 * .05), core * mix(.42, .64, max(step(1.5, uEtchT) * step(.001, uEtch), uGem)) * uSet); }   // 透光：光穿过的地方亮起来，带着石头自己的颜色 if (uGlowK > .001) { float gk = (1. - exp(-len * 1.3)) * uGlowK * (.93 + .07 * sin(uTime * 1.1)); day = mix(day, day * .55 + uGlowCol * .62, gk * .55 * uSet); day += uGlowCol * gk * gk * .16 * uSet; }                                                       // 路很长的地方（贴着外圈看过去）不让它一直深下去
  if (uGlowK > 1.001) { float nk = min(1., uGlowK - 1.), lr2 = len / max(s, 1e-3), cr2 = smoothstep(.15, .6, lr2) * (1. - smoothstep(1.2, 2.6, lr2));   // 霓虹（帕拉伊巴）：像里面亮着灯，光走得多的地方透出一层电光蓝
    day = mix(day, uGlowCol * (.82 + .3 * cr2), nk * (.22 + .42 * cr2) * uSet); day = max(day, uGlowCol * nk * .32 * uSet); }
  { float fx_ = len * .3 + flu * 2.4, e1 = 1. - exp(-1.1 * fx_), e2 = 1. - exp(-.28 * fx_); vec3 gc = mix(uUVa, uUVb, e1); gc = mix(gc, uUVc, e2 * e2 * .8); uvc = uvc * .5 + gc * (.22 + .85 * e1); }
  { float gl = min(.6, fg * 1.3) * (1. - uSet); day = mix(day, vec3(.9, 1., .96), gl); uvc += vec3(.3, .5, .9) * gl; }                // 正在长的那一层微微发亮
  int m1 = AF[k], m2 = AF[k]; float tirK = 0., inE = 1e9, inE2 = 1e9, inL = 0.;
  if (uIn > .001 && uK[k] < .5) { vec3 nF = PN(k, i), Dr = refract(Dl, nF, 1. / uIOR); if (dot(Dr, Dr) < .5) Dr = Dl;   // 光进石头时拐个弯：透过每个正面，看到的是被折过的、另一组背面
    float t1 = 1e9; for (int j = 0; j < M; j++) { vec4 P = uP[k * M + j]; float dn = dot(P.xyz, Dr); if (dn > 1e-5) { float t = (P.w * s - dot(P.xyz, p)) / dn; if (t < t1) { t1 = t; m1 = j; } } }
    vec3 q1 = p + t1 * Dr, n1 = PN(k, m1); float c1 = dot(Dr, n1); tirK = smoothstep(.85, 1.15, uIOR * uIOR * (1. - c1 * c1));   // 角度太斜出不去：整个反射回石头里（全反射）
    vec3 Dr2 = reflect(Dr, n1); float t2 = 1e9; for (int j = 0; j < M; j++) { if (j == m1) continue; vec4 P = uP[k * M + j]; float dn = dot(P.xyz, Dr2); if (dn > 1e-5) { float t = (P.w * s - dot(P.xyz, q1)) / dn; if (t < t2) { t2 = t; m2 = j; } } }
    vec3 q2 = q1 + min(t2, 4. * s) * Dr2;
    for (int j = 0; j < M; j++) { vec4 P = uP[k * M + j]; if (dot(P.xyz, P.xyz) < .5) continue; if (j != m1) inE = min(inE, (P.w * s - dot(P.xyz, q1)) * U * .9); if (j != m2) inE2 = min(inE2, (P.w * s - dot(P.xyz, q2)) * U * .9); }
    float thK = TF[k] - TN[k]; inL = t1 + tirK * min(t2, 3. * s); vec3 sg = tau / max(len, 1e-3); float ext = clamp(inL - thK, -.6 * thK, 1.3 * s);
    day *= mix(vec3(1.), exp(-sg * ext / (1. + sg * max(ext, 0.) * CAP)), uIn * uSet);                       // 路走得长的那几块颜色更浓，短的更透
    vec3 o2 = refract(Dr2, -PN(k, m2), uIOR); if (dot(o2, o2) < .5) o2 = reflect(Dr2, PN(k, m2)); vec3 ow = uR[k] * o2;
    vec3 e2 = envR(ow); float sp = pow(max(0., dot(ow, uL)), 6.), lum = dot(day, vec3(.3, .55, .15)), body = max(.04, max(day.r, max(day.g, day.b)));
    vec3 refl = (e2 * (.78 + .5 * sp) + sp * .35) * (day / body) * mix(1., lum / body + .25, .5);             // 反射回来的那几块：带着这块石头的颜色，映着周围的光
    day = mix(day, refl, tirK * uIn * .7 * (1. - .6 * uGlowK) * uSet);
    float hq = fhash(PN(k, m1) + 1.7 * PN(k, m2), float(k) + 2.), st4 = floor(hq * 4.) / 3.; day *= mix(1., mix(.82 + .36 * st4, .5 + .92 * st4, max(step(1.5, uEtchT) * step(.001, uEtch), uGem)), uIn * .7 * (1. - .5 * uGlowK) * uSet);   // 每一小块一档明暗，像一格一格的
    day *= mix(1., .62 + .52 * smoothstep(2., 48., inE) + .1 * smoothstep(0., 3. * s, t1), max(step(1.5, uEtchT) * step(.001, uEtch), uGem) * uIn * uSet);   // 溶蚀海蓝宝：透过去的每一块背面像宝石的一个刻面——中间亮、靠棱的地方暗一圈，越深的那块越亮一点
    float li = (1. - smoothstep(.35, 1.3, inE)) * mix(.5, .72, max(step(1.5, uEtchT) * step(.001, uEtch), uGem)), li2 = (1. - smoothstep(.35, 1.2, inE2)) * .3 * tirK;
    vec3 lcol = mix(mix(uMidL, uDeepL, .4), vec3(1., .985, .97), .35 + .5 * tirK);
    day = mix(day, lcol, max(li, li2) * uIn * uSet);
    if (uPh > .001) { float FF = uF[k]; for (int c = 0; c < 5; c++) { float r = c == 0 ? .55 : (c == 1 ? .8 : .84 + float(c) * .035), w = (c < 2 ? .012 : .006) * FF; if (uG[k] < r + .03) continue; float sh = shell(k, p, Dr, r * FF, w) / w;   // 幻影：长到一半停过一阵，留下一层和外形一样的薄膜，斜着穿过的地方最清楚
        float a = (clamp((sh - 2.) * .12, 0., 1.) * .8 + .06 * step(.5, sh)) * uPh * (c == 0 ? 1. : (c == 1 ? .55 : .3)) * (c < 2 ? 1. : 1. - step(.5, sh) * .7); vec3 pc = mix(vec3(1., .99, .97), uHid[1 + c % 2], .35);   // 后三条是靠近表面的细生长线
        day = mix(day, pc, a * uSet); } } }
  { int m = (uIn > .001 && uK[k] < .5) ? m1 : AF[k]; vec3 nb2 = uR[k] * NRM(k, m, OL[k] + TF[k] * Dl); float bl = lightOn(nb2), pq = .5 * smoothstep(.1, .2, bl) + .5 * smoothstep(.45, .55, bl);   // 隔着正面看到的背面：朝着光的那块亮，背着光的那块暗一档、偏冷
    float hb = fhash(PN(k, m), 3.); vec3 hcb = uHid[int(min(3., floor(fract(hb * 3.7) * 4.)))]; vec3 tb = mix(.93 + .11 * cos(6.2832 * (hb + vec3(0., .33, .67))), mix(vec3(1.), hcb / max(.05, dot(hcb, vec3(.3, .55, .15))), 1.6 * uHidA), step(.001, uHidA)); day *= mix(vec3(1.), mix(mix(uBack, vec3(.88, .85, .86), uFrost), uRimB, pq) * tb * mix(.86, 1.12, fract(hb * 5.3)), uSet); uvc *= mix(1., mix(.72, 1.14, pq), uSet); vec3 qw = uT[k] + uR[k] * (OL[k] + TF[k] * Dl) - vec3(0., 2.02, 0.), rb = normalize(d - 2. * dot(d, nb2) * nb2 + qw * .34); day = mix(day, vec3(1., 1., .98), max(window(rb, WA), window(rb, WB) * .7) * mix(.46, .72, max(step(1.5, uEtchT) * step(.001, uEtch), uGem)) * uClear * uSet * (1. - .75 * uK[k])); }
  for (int j = 0; j < 2; j++) { if (!OK[j]) continue;                                           // 八面体解理：晶体里面斜着的一片，上面一层会换颜色的虹彩
    for (int c = 0; c < 2; c++) { if (j == 1 && c == 1) continue;
      vec3 n = (j == 0 ? (c == 0 ? vec3(1., 1., 1.) : vec3(-1., 1., -1.)) : vec3(1., -1., 1.)) * .57735; float off = (c == 0 ? 1.3 : 1.12) * uF[j] * uCOff;
      float dn = dot(n, DL[j]); if (abs(dn) < 1e-4) continue; float tc = (off - dot(n, OL[j])) / dn;
      if (tc > TN[j] && tc < TF[j]) { vec3 pc = OL[j] + tc * DL[j]; float rho = gauge(j, pc) / uF[j];
        if (rho < uG[j]) { vec2 pu = pc.xz * U + pc.y * 23. + float(j * 7 + c * 3) * 31.; float edge = (uG[j] - rho) * uF[j] * U, rr = length(pc - n * off) / uF[j];
          float a = smoothstep(0., 5., edge) * smoothstep(-.015, .015, dot(pc - n * off, normalize(cross(n, vec3(.2, 1., .1)))) / uF[j] + .12) * smoothstep(.6 * uFilmW, .16 * uFilmW, rr + (vn(pu / 26.) - .5) * .16 * uFilmW) * uSet * uCleave, ph = rr * rr * 3.4 + (vn(pu / 44.) - .5) * .5 + float(c) * .37 + float(j) * .2;      // 从贴得最紧的那一点往外，一圈一圈换颜色
          vec3 film = vec3(.62 - .36 * uFilmK) + (.38 + .3 * uFilmK) * cos(6.2832 * (ph * uFilmR + uFilmH + vec3(0., .33, .67))); vec3 nc = uR[j] * n, rc = d - 2. * dot(d, nc) * nc;
          day = mix(day, film * (.8 + .35 * day), a * (.3 + .6 * uFilmK)); day += (1. - day) * pow(max(0., abs(dot(rc, uL))), 22.) * a * .7; uvc = mix(uvc, vec3(.62, .76, 1.), a * .12); } } } }
  if (uAst > .001) { vec3 hL = transpose(uR[k]) * normalize(uL - d), ns = normalize(p), dv = ns - hL; float sr = 0.;   // 星光：三组相差 60° 的纤维，各把光散成一条线，交成一颗六道光的星，浮在石头上
    for (int c = 0; c < 3; c++) { float a = float(c) * 1.0472 + .3; vec3 f = vec3(cos(a), 0., sin(a)); float q = dot(dv, f) / .022; sr = max(sr, exp(-q * q)); }
    float r2 = dot(dv, dv), sA = (sr * exp(-r2 / .22) * .8 + exp(-r2 / .006) * .85 + exp(-r2 / .05) * .18) * uAst * uSet * step(0., dot(ns, hL)); day = mix(day, vec3(1., .975, .985), clamp(sA, 0., .92)); }
  if (uVein > .001) { vec3 q = (OL[k] + (tn + th * .12) * Dl) / uF[k]; float v = 0.;   // 脉和纹：蔷薇辉石的黑色锰脉（树枝状），天河石里白色的钠长石条纹
    if (uVeinM < .5) { float n = vn(q.xy * 2.1 + 1.7) * .55 + vn(q.zy * 2.1 + 5.3) * .45 + .22 * (vn(q.xz * 7.3) - .5); v = (1. - smoothstep(.01, .04, abs(n - .5))) * (.45 + .55 * smoothstep(.3, .62, vn(q.yx * 1.4 + 9.1))); v = max(v, smoothstep(.75, .85, vn(q.xz * 3.1 + 2.3) * .6 + vn(q.yz * 2.7) * .4) * .7); }
    else { float w = dot(q, vec3(.62, .55, .56)) * 8.5 + 1.1 * vn(q.xz * 2.6 + q.y) + .45 * vn(q.zy * 6.1 + 4.); v = smoothstep(.72, .93, sin(w * 3.14159) * .5 + .5) * smoothstep(.28, .6, vn(q.xz * 1.8 + 3.3)); v = max(v, smoothstep(.9, .985, sin((q.x * 6. + q.z * 4.) * 3.14159 + vn(q.yz * 3.) * 2.) * .5 + .5) * .35); }
    day = mix(day, uVeinCol * (.82 + .25 * day), clamp(v * uVein, 0., .9) * uSet); }
  if (uSpk > .001) { vec3 nS = normalize(uR[k] * vec3(0., 1., 0.)); float sp = 0.;   // 砂金效应：里面平行排着的小薄片，对上光的那几片一闪一闪
    for (int c = 0; c < 3; c++) { vec3 q = (OL[k] + (tn + th * (.2 + .3 * float(c))) * Dl) / uF[k] * 7.5 + float(c) * 7.3, fr = fract(q) - .5, ci = floor(q); float h = fract(sin(dot(ci, vec3(12.99, 78.23, 37.71))) * 43758.55), h2 = fract(h * 17.31 + .37), h3 = fract(h * 9.71 + .11);
      vec3 nP = normalize(nS + (vec3(h, h2, h3) - .5) * .45), rP = d - 2. * dot(d, nP) * nP; float al = max(0., dot(rP, uL)), r = length((fr + (vec3(h2, h3, h) - .5) * .5) * vec3(1., 1.7, 1.)) / (.8 + .55 * h3); sp += smoothstep(.36, .12, r) * step(.42, h) * (pow(al, 4.) * 1.8 + .35 + .2 * sin(uTime * 1.3 + h * 40.)); }
    day = mix(day, uSpkCol * (.85 + .45 * clamp(sp, 0., 1.)), clamp(sp * uSpk, 0., .78) * uSet); }
  if (uLab > .001) { vec3 nL = normalize(uR[k] * uLabN), rl = d - 2. * dot(d, nL) * nL; float al = max(0., dot(rl, uL)), ang = abs(dot(d, nL)); vec3 q = (OL[k] + (tn + th * .3) * Dl) / uF[k], lp = q - dot(q, uLabN) * uLabN;
    vec2 st = vec2(dot(lp, normalize(cross(uLabN, vec3(0., 0., 1.)))), dot(lp, normalize(cross(uLabN, vec3(1., 0., 0.))))); float n1 = vn(st * 1.6 + vec2(uTime * .035, 3.1)), n2 = vn(vec2(st.x * .9 + n1 * 1.2, st.y * 4.5 + n1 * 1.6) + vec2(1.7, uTime * .022)), n3 = vn(st * 5. + n2 * 2.);
    float mo = mix(.5 + .65 * smoothstep(.25, .8, n2 * .75 + n1 * .4) + .08 * (n3 - .5), .45 + .75 * smoothstep(.2, .85, n1 * .7 + n2 * .5), uLabX.y), I = (pow(al, 3. + uLabX.z) * (.9 + .25 * uLabX.y) + pow(al, 1.2 + uLabX.z * .3) * .22 * (1. - .6 * uLabX.y) + ang * ang * .14 * (1. - .7 * uLabX.y) + .05 * (1. - uLabX.y)) * mo; I = mix(I, pow(ang, 1.5 + uLabX.z) * mo * 1.15, uLabX.y); float hue = uFilmH + uFilmR * (n2 - .5) * 2. - (1. - ang) * .12 + st.x * .04 + (n1 - .5) * .06;
    vec3 film = .55 + .45 * cos(6.2832 * (hue + vec3(0., .33, .67))); film = mix(film, vec3(1.), .18 + .7 * uLabX.x); day = mix(day, film * (.8 + .35 * I), clamp(I * uLab, 0., .85) * uSet); day += film * I * I * .16 * uLab * uSet; }
  float along; int nb; float dF = faceEdge(k, p, i, Dl, AX[k], AY[k], s, along, nb), dS = SD[k], dC = 1e9;
  vec2 gth = tgradN(NRM(k, i, p), Dl, AX[k], AY[k]) - tgradN(NRM(k, AF[k], OL[k] + TF[k] * Dl), Dl, AX[k], AY[k]);
  for (int j = 0; j < K; j++) { if (j != k && OK[j] && TN[j] < TF[k]) { int a = AN[j]; dC = min(dC, (TN[j] - tn) / max(1e-6, length(tgradN(NRM(k, i, p), Dl, AX[k], AY[k]) - tgradN(NRM(j, a, OL[j] + TN[j] * DL[j]), DL[j], AX[j], AY[j])))); } }
  vec3 nN = uR[k] * NRM(k, nb, p); float b = lightOn(nw), bN = lightOn(nN), tone = clamp((.72 - b) / .2, 0., 3.), toneN = clamp((.72 - bN) / .2, 0., 3.), dE = min(dF, min(dS, dC));
  tone = floor(tone) + smoothstep(.3, .7, fract(tone)); toneN = floor(toneN) + smoothstep(.3, .7, fract(toneN)); { float lit_ = 1. - smoothstep(0., 1.2, tone), sh_ = smoothstep(.8, 2.6, tone); day *= mix(vec3(1.), uHiT, lit_ * uSet) * mix(vec3(1.), uLoT, sh_ * uSet); day += (1. - day) * lit_ * .07 * uSet; float hf = fhash(PN(k, i), float(k) + 11.); vec3 hc = uHid[int(min(3., floor(hf * 4.)))]; float lmD = dot(day, vec3(.3, .55, .15)); day = mix(day, hc * (lmD / max(.05, dot(hc, vec3(.3, .55, .15)))), uHidA * step(.3, fract(hf * 7.31)) * (.55 + .45 * lit_) * uSet); }                           // 深浅一档一档地换，不是慢慢滑过去
  vec3 nl = NRM(k, i, p), t1 = normalize(cross(nl, abs(nl.y) < .9 ? vec3(0., 1., 0.) : vec3(1., 0., 0.))), t2 = cross(nl, t1); vec2 fq = vec2(dot(p, t1), dot(p, t2)) * U + vec2(float(k) * 37. + float(i) * 91., float(k) * 53.);     // 颗粒和水痕贴在面上，跟着晶体一起转
  float wob = vn(fq / 24.), lf = vn(fq / 70. + 9.), pool = exp(-dE / 5.5);
  float frN = dot(nl, nl) - 1., frF = step(abs(frN - .001), .0004), frC = step(abs(frN - .002), .0004), frA = max(frF, frC); vec2 frQ = vec2(0.), frS = vec2(1., 0.);   // 这一面是断口（frF）还是解理面（frC）；frQ：面上离敲击点的位置，frS：台阶的方向
  { float gr = sand(fq, tone >= 1.5 ? 1.9 : 1.4), big = vn(vec2(fq.x * .8 + fq.y * .6, fq.y * .8 - fq.x * .6) / 3.2 + 17.), amp = mix(.012, .07, tone / 3.);
    vec3 pw = uR[k] * p; float settle = clamp(.5 - .5 * pw.y / (s * 1.4), 0., 1.), sep = min(.8, smoothstep(.4, .72, vn(fq / 120. + 3.)) * .62 + .16 * settle);
    float op = lad4f(tone, .05, .1, .2, .34) * (.7 + .5 * lf) * (.82 + .36 * settle) * uSet * (1. - .55 * uFrost) * (1. - .8 * uClear);
    vec3 pig = mix(lad4(tone, vec3(.945, .925, .973), vec3(.839, .804, .922), vec3(.60, .53, .80), vec3(.36, .29, .63)), lad4(tone, vec3(.91, .961, .941), vec3(.722, .878, .831), vec3(.42, .72, .67), vec3(.2, .47, .47)), sep) * (1. + amp * gr);
    { vec3 hue = day / max(.001, max(day.r, max(day.g, day.b))); pig = mix(pig, hue * mix(dot(pig, vec3(.3, .5, .2)), 1., .55 * uFrost) * 1.18, mix(.6, .92, uFrost)); }     // 颜料跟着这一处石头自己的颜色走
    pig = mix(pig, PAPER, clamp((big - .7) * 1.5, 0., 1.) * smoothstep(1.4, 2., tone));                                      // 颗粒之间露出一点底
    day = mix(day, pig, op); day = mix(day, DEEP, pool * mix(.1, .3, clamp(tone, 0., 1.)) * uSet * (1. - .55 * uClear));                                    // 颜色往棱边聚
    float ir = .5 + .5 * sin(fq.x * .017 + fq.y * .013 + float(i) * 2.1 + float(k)), w = mix(.06, .035, clamp(tone, 0., 1.)) * (1. - smoothstep(1., 1.6, tone)) * uSet;   // 一点珠光
    day.r += (1. - day.r) * w * ir; day.g += (.957 - day.g) * w * (1. - ir); day.b += (.98 - day.b) * w * (1. - ir) * .6;
    uvc = mix(uvc, lad4(tone, vec3(.808, .886, 1.), vec3(.588, .698, .973), vec3(.384, .463, .847), vec3(.235, .259, .62)) * (1. + amp * gr), lad4f(tone, .05, .1, .16, .22) * uSet * (1. - .8 * uClear)); uvc = mix(uvc, DEEP, pool * .06 * uSet); }
  { vec3 r = d - 2. * dot(d, nw) * nw; float cv = max(0., -dot(d, nw)), F = min(1., (.05 * uLus + .5 * pow(1. - cv, 2.4)) * mix(1., uLus, .45)) * uSet; vec3 e = envR(r); float wgl = 1.; { float fam = max(step(max(abs(nl.x), max(abs(nl.y), abs(nl.z))), .9), smoothstep(.7, .95, uFrost) * .8), fr = fam * uFrost * uSet, sug = vn(fq / 2.3), g2 = sand(fq, 1.1); vec3 hue = day / max(.001, max(day.r, max(day.g, day.b))), veil = mix(vec3(1.), hue, .4) * (.86 + .2 * min(1., b)) * (1. + .1 * g2); day = mix(day, veil, fr * (.2 + .3 * sug)); F *= 1. - .7 * fr; wgl = 1. - .8 * fr; }
    day = mix(day, vec3(.72) + .28 * cos(6.2832 * (cv * 1.6 + float(k) * .13 + vec3(0., .33, .67))), .07 * uSet);                              // 珠光的薄膜色：看的角度变，粉、青、紫跟着换                    // 这个面映着哪一块环境：越斜着看映得越多；转到正对主光的角度，整面亮一下
    float chm = step(1.5, uEtchT) * step(.001, uEtch) * step(.7, abs(nl.y)) * (1. - step(.97, abs(nl.y)));   // 溶蚀海蓝宝顶上那一圈斜面：不要一整条白，少映一点窗，透出里面的湖水绿，只留一线亮
    day = mix(day, e, F * (1. - .5 * chm) * (1. - .32 * max(step(1.5, uEtchT) * step(.001, uEtch), uGem))); { vec3 pw3 = uT[k] + uR[k] * p - vec3(0., 2.02, 0.), rw = normalize(r + pw3 * .2); float win = max(window(rw, WA), window(rw, WB) * .75); day = mix(day, mix(vec3(1.), vec3(.93, 1., .99), chm), max(smoothstep(.9, .97, dot(rw, uL)) * .7, win * .9 * (1. - .6 * uK[k]) * (1. - .68 * chm)) * wgl * uSet); } uvc = mix(uvc, uUVb * (.5 + .5 * e.b), F * .16); }
  { vec2 uvf = vec2(dot(p, t1), dot(p, t2)) / s; float isC = step(.9, max(abs(nl.x), max(abs(nl.y), abs(nl.z)))), hA = fhash(nl, float(k) + 5.), hB = fract(hA * 9.7 + .2); vec2 q1 = uvf - (vec2(hA, hB) - .5) * .7, q2 = uvf - (vec2(fract(hA * 3.3), fract(hB * 5.1)) - .5) * 1.1;
    float dc = min(max(abs(q1.x) * 1.25, abs(q1.y)), max(abs(q2.x), abs(q2.y) * 1.4) + .11), dt3 = min(max(q1.y, max(-.5 * q1.y + .866 * q1.x, -.5 * q1.y - .866 * q1.x)), max(-q2.y, max(.5 * q2.y + .866 * q2.x, .5 * q2.y - .866 * q2.x)) + .09);
    float st = mix(dt3, dc, isC) * uStep + (vn(fq / 40.) - .5) * .35, fs = fract(st), tl = (1. - smoothstep(0., .07, fs)) * uTerr * uSet * (1. - uK[k]) * smoothstep(1.5, 5., dE) * (.45 + .55 * vn(fq / 17. + 5.));
    tl *= 1. - frA; day = mix(day, vec3(1.), tl * (.14 + .5 * smoothstep(.2, .8, b)));
    if (uStri > .001 && uK[k] < .5) {
      // 生长条纹：柱面上顺着长轴的一道道细棱（坦桑石、碧玺、黄玉）；石英的是横的。每一道棱接光就亮，背光就暗一线
      float side = 1. - smoothstep(.5, .8, abs(nl.y)); vec3 tc = normalize(cross(nl, vec3(0., 1., 0.)) + vec3(1e-5));
      float uu = uStriD < .5 ? dot(p, tc) : p.y, vv = uStriD < .5 ? p.y : dot(p, tc);
      float w = uu / s * 30. + (vn(vec2(uu / s * 4.1 + float(k) * 3.1, 1.7)) - .5) * 1.1 + (vn(vec2(uu / s * 9., vv / s * .35)) - .5) * .08;
      float id = floor(w), f1 = fract(w), hz = fract(sin(id * 12.9898 + float(k) * 4.1 + float(i) * 1.7) * 43758.5);
      float fade = smoothstep(.1, .45, vn(vec2(id * .37, vv / s * .9 + hz * 9.)));
      float rid = (1. - smoothstep(0., .1 + .22 * hz, f1)) * step(.3, hz) * fade, gro = smoothstep(.55, .5, abs(f1 - .55)) * step(.3, hz) * fade * .5;
      float lit2 = smoothstep(.2, .8, b), kS = side * uStri * uSet * smoothstep(1.5, 4., dE);
      day = mix(day, vec3(1., .99, 1.), rid * kS * (.14 + .62 * lit2));
      day *= 1. - gro * kS * mix(.16, .06, lit2);
    } day *= 1. - .05 * (1. - frA) * uTerr * uSet * (1. - uK[k]) * (mod(floor(st), 2.) - .5); uvc = mix(uvc, uUVc, tl * .1); }
  if (frA > .5) {   // 断面。断口：从敲击点往外一圈圈贝壳状的弧，每一圈映出来的环境都换一点；解理面：平而亮，只有几道直的细台阶
    vec3 n0 = nl / sqrt(1. + frN); float kE = uSet * smoothstep(1.5, 4., dE); vec2 rq0 = vec2(dot(p, t1), dot(p, t2)) * U;
    if (frF > .5) {
      float d0 = uP[k * M + i].w * s / sqrt(1. + frN); vec3 qs = abs(n0.y) > .3 ? vec3(0., d0 / n0.y, 0.) : n0 * d0;   // 敲击点：断面和晶体中轴相交的地方；底下的断口偏到一边
      vec2 tq = n0.xz / max(.001, length(n0.xz)); qs += n0.y < -.5 ? vec3(fhash(nl, 31.) - .5, 0., fhash(nl, 47.) - .5) * s * .75 : vec3(tq.x, 0., tq.y) * s * .08;   // 顶上崩掉的一块：敲击点挪到这一块靠里的那条边上
      frQ = rq0 - vec2(dot(qs, t1), dot(qs, t2)) * U; vec3 cr = conchRing(frQ, nl, float(i)); float rr = length(frQ), fw = fract(cr.x), dw = cr.y;
      float crest = (1. - smoothstep(0., max(dw * 1.1, .015), fw)) * cr.z, shade = smoothstep(1. - dw * 2.6, 1. - dw * .3, fw) * cr.z;
      vec3 gq = normalize(t1 * frQ.x + t2 * frQ.y + vec3(1e-5)); float fl = dot(uR[k] * gq, uL), rin = smoothstep(5., 16., rr), cK = uConch * kE * rin * (1. - smoothstep(130., 230., rr));
      vec3 nr = uR[k] * normalize(n0 + gq * (fw - .5) * .55 * uConch), rj = reflect(d, nr); float cvj = max(0., -dot(d, nr));   // 每一圈像一只很浅的勺子，法线顺着往外歪一点
      day = mix(day, envR(rj), (.05 + .5 * pow(1. - cvj, 2.4)) * .75 * rin * uSet);
      day *= 1. + (fw - .5) * fl * .18 * cK;
      day = mix(day, vec3(1., .992, .985), crest * cK * (.15 + .6 * max(0., fl)));   // 每一圈的外沿：一道细亮棱
      day = mix(day, DEEP, shade * (1. - crest) * cK * .16); }                          // 紧挨着一线影子
    if (frC > .5) {
      frS = normalize(vec2(fhash(nl, 61.) - .5, fhash(nl, 67.) - .5) + 1e-4); frQ = rq0; vec2 st2 = clvStep(dot(rq0, frS), dot(rq0, vec2(-frS.y, frS.x)), float(i)); float fs2 = fract(st2.x), dws = 1. / 27.;
      float stp = (1. - smoothstep(0., dws * 1.1, fs2)) * st2.y, sha = smoothstep(1. - dws * 2.4, 1. - dws * .3, fs2) * st2.y;
      float sl = dot(uR[k] * normalize(t1 * frS.x + t2 * frS.y), uL);
      day = mix(day, vec3(1., .992, .985), stp * kE * (.2 + .55 * max(0., sl)));
      day = mix(day, DEEP, sha * (1. - stp) * kE * .12); } }
  if (uEtch > .001 && frA < .5) {   // 蚀像：一片一片挤在一起，大的套小的、一层层往下（钻石八面体面上倒着的三角蚀像；锂辉石柱面上顺着 c 轴拉长的三角蚀痕；绿柱石底面上的六边形蚀坑、柱面上顺着 c 轴压扁的六边形）。同一面上的朝向都一样，一转，整片的同一面墙一起亮
    vec3 aN = abs(nl), n0 = normalize(nl); float okF = uEtchT < .5 ? step(max(abs(aN.x - .57735), max(abs(aN.y - .57735), abs(aN.z - .57735))), .05) : (uEtchT < 1.5 ? 1. - step(.3, abs(n0.y)) : 1. - step(.3, abs(n0.y)) + step(.7, abs(n0.y))), basal = step(.7, abs(n0.y));   // 绿柱石：只蚀底面和柱面，中间斜着的小面保持光滑
    if (okF > .5 && dE > 2.) {
      vec3 v3 = uEtchT < .5 ? vec3(-sign(nl.x), 0., 0.) : (uEtchT > 1.5 && basal > .5 ? vec3(1., 0., 0.) : vec3(0., 1., 0.)); v3 -= n0 * dot(v3, n0);   // 尖朝哪儿：钻石朝着面的一条棱（和八面体面本身的三角反着），锂辉石、绿柱石顺着 c 轴
      vec2 up2 = normalize(vec2(dot(v3, t1), dot(v3, t2)) + 1e-5), rt2 = vec2(up2.y, -up2.x), rq0 = vec2(dot(p, t1), dot(p, t2)) * U, lp = vec2(dot(rq0, rt2), dot(rq0, up2));
      float chE = step(1.5, uEtchT) * basal * (1. - step(.97, abs(n0.y))), T2 = step(1.5, uEtchT), el = uEtchT < .5 ? 1. : (uEtchT < 1.5 ? 2.6 : mix(2.8, 1., basal)), elS = T2 > .5 ? mix(3.2, 1., basal) : 1., kE2 = uEtch * uSet * smoothstep(2., 6., dE), bF = lightOn(nw), best = 0., bestAll = -1e3, stH = 2., flr = 0.; vec2 bN = vec2(0.); vec3 hueS2 = day / max(.001, max(day.r, max(day.g, day.b)));
      for (int L3 = 0; L3 < 3; L3++) {
        float cs = (L3 == 0 ? 44. : (L3 == 1 ? 18. : 7.5)) * mix(1., mix(.62, .9, basal), T2) * mix(1., .6, chE); vec2 csv = vec2(cs, cs * el), cb = floor(lp / csv);   // 三层大小：大的、中的、碎的；格子顺着晶体的方向排，所以会排成行
        for (int yy = -1; yy <= 1; yy++) for (int xx = -1; xx <= 1; xx++) {
          vec2 cc = cb + vec2(float(xx), float(yy)), hb = cc + vec2(float(L3) * 13.7 + float(k) * 5.1, float(i) * 2.3), ctr = (cc + .5 + (vec2(hash(hb + 1.3), hash(hb + 5.9)) - .5) * .7) * csv;
          float zone = smoothstep(mix(.36, .38, T2), mix(.6, .66, T2), vn(ctr / mix(115., 150., T2) + vec2(float(k) * 3.3, float(i) * 1.9)));            // 蚀得厉害的一片和干净的一片：有疏有密，中间留干净的面
          if (hash(hb) > mix(.03, (L3 == 0 ? .6 : (L3 == 1 ? .85 : .75)) * mix(1., L3 == 2 ? .45 : 1.02, T2), max(zone, .75 * chE)) * mix(1., 1.25, chE)) continue;   // 斜面上蚀得满一些
          float r = cs * (uEtchT < .5 ? .5 + .5 * hash(hb + 3.7) : .45 + .45 * hash(hb + 3.7)); vec2 lq = lp - ctr, N1, N2, bw; float C0e, C12, dm;
          if (uEtchT > 1.5) { vec2 sq = vec2(lq.x, lq.y / elS); dm = 1e9; bw = vec2(0., -1.);   // 六边形：六道坑壁；底面上是正六边形，柱面上尖头朝着 c 轴、拉得很长，一排排往上叠（GIA 2024 的「压扁的六边形」）
            for (int e6 = 0; e6 < 6; e6++) { float an = float(e6) * 1.0472 + .5236 * basal; vec2 Nn = vec2(cos(an), sin(an)); float de = r * .5 - dot(sq, Nn); if (de < dm) { dm = de; bw = normalize(vec2(Nn.x, Nn.y / elS)); } } }
          else { if (uEtchT < .5) { N1 = vec2(.866, .5); N2 = vec2(-.866, .5); C0e = r * .5; C12 = r * .5; }
            else { float w = r * .42, hh = r * 2.5; N1 = normalize(vec2(hh, w)); N2 = vec2(-N1.x, N1.y); C0e = hh / 3.; C12 = dot(N1, vec2(w, -hh / 3.)); }
            float d0 = C0e + lq.y, d1 = C12 - dot(lq, N1), d2 = C12 - dot(lq, N2); dm = min(d0, min(d1, d2)); bw = d0 <= min(d1, d2) ? vec2(0., -1.) : (d1 <= d2 ? N1 : N2); }
          bestAll = max(bestAll, dm);
          if (dm <= 0.) continue;
          float cap = step(.45, hash(hb + 8.1)) * r * (.16 + .2 * hash(hb + 4.4)), dep = cap > 0. ? min(dm, cap) : dm;   // 一半平底一半尖底
          if (dep > best) { best = dep; bN = bw; flr = cap > 0. ? step(cap, dm) : 0.; stH = 1.5 + 1.7 * hash(hb + 6.6); } } }
      if (bestAll > -1.) {
        float inA = smoothstep(0., .6, best); vec2 nw2 = bN.x * rt2 + bN.y * up2; vec3 wW = uR[k] * normalize(mix(n0 - (t1 * nw2.x + t2 * nw2.y) * .75, n0, flr)), rw4 = reflect(d, wW);
        float lit4 = lightOn(wW) - bF, tc = fract(best / stH), keepT = step(.3, hash(vec2(floor(best / stH), float(i) + 1.7)));
        day *= 1. + lit4 * (.55 + .2 * (tc - .5)) * inA * kE2;                                                            // 坑壁：朝光的亮、背光的暗；一级级台阶带一点锯齿明暗
        float fl4 = (pow(max(0., dot(rw4, uL)), 34.) + max(window(rw4, WA), window(rw4, WB) * .7) * .7) * inA * (1. - flr * .6);
        day = mix(day, mix(vec3(1., .995, .99), hueS2, .3), clamp(fl4, 0., 1.) * .88 * kE2);                                // 转到那个角度，整片的同一面墙一起闪
        float soft = mix(1., .42, T2), tl4 = (1. - smoothstep(0., mix(.9, 1.8, T2), tc * stH)) * step(.8, best) * keepT * (1. - flr), rim = 1. - smoothstep(0., mix(.8, 2.2, T2), abs(bestAll));
        day = mix(day, lit4 > 0. ? mix(vec3(1., .99, .98), hueS2, .35 * T2) : DEEP, tl4 * kE2 * (lit4 > 0. ? .5 : .22) * soft);                           // 一层层台阶的细线，大三角里套小三角（绿柱石的柔一些、带一点自己的颜色）
        day = mix(day, lit4 > 0. ? mix(vec3(1., .99, .98), hueS2, .35 * T2) : DEEP, rim * kE2 * (lit4 > 0. ? .5 : .28) * soft); } } }
  // 结构线：颜色跟着受光走。背光是靛，中间是紫，受光的棱带着会变的青和玫瑰色
  float la = 0., dRe = 1e9, alR = 0.; vec3 lc = vec3(0.); vec3 deepL = uDeepL, midL = uMidL;
  float phase = dot(nv + toView(nN), vec3(.45, .35, .25)) + along * .25 + uTime * .02; vec3 iri = vec3(.58, .64, .74) + vec3(.26, .17, .14) * cos(6.2832 * (phase + vec3(0., .38, .7))); float run = pow(max(0., cos(6.2832 * (phase * 1.7 + .2))), 10.);   // run：沿着受光的棱流过去的一小段亮
  { vec3 q = OL[k] + TF[k] * Dl; bool real = true; for (int j = 0; j < K; j++) { if (j != k && OK[j] && TF[k] > TN[j] && TF[k] < TF[j]) real = false; }                    // 背面的棱：虚线
    if (real) { float al2; int nb2; float dR = faceEdge(k, q, AF[k], Dl, AX[k], AY[k], s, al2, nb2); dRe = dR; alR = al2; if (fract(al2 / .17) < .56) { float a = .3 * lineA(dR, .6) * (1. - uIn); if (a > la) { la = a; lc = vec3(.42, .38, .66); } } } }
  for (int j = 0; j < K; j++) { if (j == k || !OK[j]) continue; bool real = true; for (int q = 0; q < K; q++) { if (q != j && OK[q] && TN[j] > TN[q] && TN[j] < TF[q]) real = false; }                 // 后面那几颗透出来的轮廓：淡
    if (real) { float a = .2 * lineA(SD[j], .6); if (a > la) { la = a; lc = vec3(.42, .38, .66); } } }
  { float e = smoothstep(.12, .7, .5 * (b + bN)), firm = smoothstep(1.2, 2.2, max(tone, toneN)), a = lineA(dF, mix(.66, .8, firm)) * mix(.5 + .3 * smoothstep(.3, .56, wob), .58 + .2 * wob, firm);
    if (a > la) { la = a; lc = e < .5 ? mix(deepL, midL, e * 2.) : mix(midL, iri, (e - .5) * 2.); lc = mix(lc, vec3(1., .97, .9), run * e * .85); } }
  { float a = lineA(dC, .8) * (.56 + .2 * wob); if (a > la) { la = a; lc = mix(deepL, midL, .25); } }
  float lit = dot(-normalize(gth + vec2(1e-9)), normalize(vec2(LV.x, -LV.y)));                                               // 轮廓这一段朝不朝光
  { float e = smoothstep(-.2, .6, lit), brk = mix(1., smoothstep(.28, .52, vn(pix / 8. + 3.1)), e * .8);   // 外圈：矿物自己的深色。背光一侧实而粗，受光一侧细、断开
    float a = lineA(dS, mix(1.3, .6, e)) * mix(.95 + .05 * wob, .6 + .2 * wob, e) * brk;
    if (a > la) { la = a; lc = mix(deepL * .8, mix(deepL, midL, .6), e); } }
  { float dn = vn(pix / 70. + 3.7), dn2 = vn(pix / 23. + vec2(9.1, 1.3)), brk3 = .2 + .8 * smoothstep(.3, .74, vn(pix / vec2(52., 96.) + float(k) * 3.1)), dd = (uIn > .001 ? inE * 1.3 : dRe) / (.65 + .7 * dn2);   // 分光的虹彩：不要一整条一样的彩线——一段亮一段淡，宽窄不一，颜色顺着走慢慢变
    day = mix(day, vec3(.62) + .38 * cos(6.2832 * (alR * 1.1 + dot(nv, vec3(1.3, .9, .4)) + dn * 1.5 + dn2 * .3 + vec3(0., .33, .67))), (exp(-dd * dd / 1.3) * 1.25 + exp(-dd / 3.2) * .45) * brk3 * mix(.2, .12, step(.001, uIn)) * uDisp * uSet); }   // 芯细而亮，外面一层很淡        // 背面的棱上有一线分出来的颜色，转动时会换
  float rev = smoothstep(0., .1, uLine * 1.2 - length(pix - vec2(384., 400.)) / 520.); la *= mix(rev * .62, 1., uSet); lc = mix(lc, vec3(.52, .5, .74), (1. - uSet) * .6);   // 生长时：线先从中心往外画出来，淡的
  day = mix(day, vec3(.9, .94, .96), .05 * rev * (1. - uSet));
  if (lit < -.1) { float gl = exp(-dS / 11.) * .34 * uSet * mix(.5, 1., smoothstep(1., 2., tone)) * smoothstep(-.1, -.4, lit); day = mix(day, GLOW, gl); uvc = mix(uvc, uUVc, gl * .8); }   // 光从背面穿出来的那一侧亮一圈
  { vec3 nbP = PN(k, nb); float eFr = max(frA, step(.0006, dot(nbP, nbP) - 1.)) * step(dF, min(dS, dC) + .01); la *= mix(1., .3 + .7 * smoothstep(.3, .62, vn(vec2(along * U / 2.6, float(i) + float(nb) * 1.7))), eFr); }   // 断开的棱崩得一截一截的
  la *= 1. - .38 * step(1.5, uEtchT) * step(.001, uEtch);   // 溶蚀过的绿柱石，棱被溶得圆一些：线淡一点、不那么硬
  if (uGlowK > 1.001) lc = mix(lc, min(vec3(1.), uGlowCol * 1.08), min(1., uGlowK - 1.) * .62);   // 霓虹的棱也发光
  day = mix(day, lc, la); uvc = mix(uvc, mix(uUVc, iri + .25, .3), la * .36);
  { float er = smoothstep(-.35, .7, lit), brk2 = mix(smoothstep(.42, .68, vn(pix / 5.5 + 8.3)), 1., er);   // 内圈：自己的浅色（暖光或冷光，跟藏色走），受光一侧亮而连贯，背光一侧淡、断开
    vec3 rimc = mix(mix(uHid[3] / max(.05, max(uHid[3].r, max(uHid[3].g, uHid[3].b))), vec3(1.), .5), iri + .1, .35);
    float r1 = lineA(abs(dS - 2.5), mix(.36, .6, er)) * mix(.25, .9, er) * brk2 * uSet; day = mix(day, rimc, r1); uvc = mix(uvc, vec3(1.), r1 * .25); }
  float eB = step(1.5, uEtchT) * step(.001, uEtch);
  { float sh = max(lineA(abs(dF - 2.6), .5), lineA(abs(dC - 2.6), .5) * .7) * (.6 + .4 * wob) * (1. - smoothstep(.4, 1., tone)) * uSet; day = mix(day, mix(vec3(1.), vec3(.76) + .24 * cos(6.2832 * (along * 2.3 + dot(nv, vec3(1.1, .7, .4)) + vec3(0., .33, .67))), eB), sh * mix(.92, .42, eB)); uvc = mix(uvc, vec3(1.), sh * .35); }
  if (eB > .5) { vec3 hu5 = day / max(.001, max(day.r, max(day.g, day.b))); float bev = (1. - smoothstep(1.2, 9., dF)) * (1. - smoothstep(1.2, 9., dF) * .4), core = 1. - smoothstep(.2, 1.3, dF);   // 棱像磨圆的玻璃：里侧一条带，光在这里拐弯，颜色浓一点；最边上一线亮
    day = mix(day, day * mix(vec3(1.), hu5, .5) * .86, bev * .32 * uSet * (1. - frA)); day = mix(day, mix(vec3(1., .995, .99), hu5, .25), core * .45 * smoothstep(.15, .6, b) * uSet); }
  if (frA > .5 && uSet > .01) {   // 碎亮点：断面上满是很小的碎面，各朝各的方向；哪一片正好把灯（或窗）反进眼睛，哪一片就亮，转一下就换一批。崩口边上、弧的棱上、台阶上最多
    vec3 n0 = nl / sqrt(1. + frN), pxq = AX[k] - Dl * (dot(n0, AX[k]) / dot(n0, Dl)), pyq = AY[k] - Dl * (dot(n0, AY[k]) / dot(n0, Dl));
    mat2 Ji = inverse(mat2(vec2(dot(pxq, t1), dot(pxq, t2)) * U, vec2(dot(pyq, t1), dot(pyq, t2)) * U));   // 面上的距离换回屏幕上的像素：亮点在屏幕上是圆的，不跟着面压扁
    float obl = smoothstep(.1, .38, abs(dot(n0, Dl))), ga = 0.; vec3 gC = vec3(0.), gcc = vec3(1.), hueS = day / max(.001, max(day.r, max(day.g, day.b))); vec2 ld = normalize(vec2(LV.x, -LV.y) + 1e-4) * .6;
    for (int L2 = 0; L2 < 2; L2++) {
      float cs = L2 == 0 ? 9. : 3.4; vec2 cb = floor(fq / cs);   // 两层：一层亮点，一层更细的碎屑
      for (int yy = -1; yy <= 1; yy++) for (int xx = -1; xx <= 1; xx++) {
        vec2 cc = cb + vec2(float(xx), float(yy)), hb = cc + vec2(float(L2) * 17.3 + float(k) * 3.1, float(i) * 7.7); float h = hash(hb); if (h > .62) continue;
        vec2 h2 = vec2(hash(hb + 1.7), hash(hb + 9.1)); vec3 h3 = vec3(hash(hb + 4.3), hash(hb + 6.9), hash(hb + 2.2));
        vec2 dq = (cc + .5 + (h2 - .5) * .76) * cs - fq, ds = -(Ji * dq); float r2 = dot(ds, ds); if (r2 > 42.) continue;
        float alc; int nbc; float dFc = faceEdge(k, p + (t1 * dq.x + t2 * dq.y) / U, i, Dl, AX[k], AY[k], s, alc, nbc); if (dFc < .6) continue;   // 按亮点自己的中心算：离崩口多远、在不在弧的棱上
        float on = 0.; if (frF > .5) { vec3 cr = conchRing(frQ + dq, nl, float(i)); float f = fract(cr.x); on = (1. - smoothstep(.06, .22, min(f, 1. - f))) * cr.z * uConch; }
        else { vec2 q = frQ + dq, st2 = clvStep(dot(q, frS), dot(q, vec2(-frS.y, frS.x)), float(i)); float f = fract(st2.x); on = (1. - smoothstep(.02, .08, min(f, 1. - f))) * st2.y; }
        float eK = exp(-dFc / (L2 == 0 ? 10. : 7.)), dens = (L2 == 0 ? .07 + .6 * eK + .3 * on : .09 + .62 * eK + .26 * on) * mix(.65, 1., frF);
        if (h > dens) continue;
        // 碎面朝哪儿跟着结构走：同一圈弧上的碎面差不多朝一个方向，同一道台阶也是，崩口边上的夹在两个面之间。所以一转，一整圈、一整道、一整条边一起亮起来又暗下去
        vec3 nm = n0 + (h3 - .5) * mix(.8, 1.45, frF) * (L2 == 0 ? 1. : 1.3), jt = (h3 - .5) * .2; float hs3 = hash(hb + 12.9);
        if (hs3 < on) { if (frF > .5) { vec2 q = frQ + dq; vec3 cr = conchRing(q, nl, float(i)); nm = n0 + normalize(t1 * q.x + t2 * q.y + vec3(1e-5)) * (.3 + .55 * hash(vec2(floor(cr.x + .5), float(i) + 2.3))) + jt; }
          else { vec2 q = frQ + dq; vec2 st2 = clvStep(dot(q, frS), dot(q, vec2(-frS.y, frS.x)), float(i)); nm = n0 + (t1 * frS.x + t2 * frS.y) * (.6 + .5 * hash(vec2(floor(st2.x + .5), float(i) + 5.1))) + jt * .7; } }
        else if (hs3 < on + eK * .8) { vec3 nN2 = PN(k, nbc); nm = mix(n0, nN2 / length(nN2), .3 + .35 * h2.y) + jt * 1.4; }
        vec3 nmw = uR[k] * normalize(nm), rm = reflect(d, nmw);
        float sp = pow(max(0., dot(rm, uL)), 24.) * 1.3 + max(window(rm, WA), window(rm, WB) * .75) * .95 + pow(max(0., dot(rm, uLF)), 20.) * .45 + smoothstep(.62, .92, rm.y) * .36;   // 灯、窗最亮；朝着亮的天的那几片也微微一闪
        float I = clamp(sp * (.8 + .2 * sin(uTime * (1.1 + h3.x) + h * 60.)), 0., 1.3) * obl * (L2 == 0 ? 1. : .5), sz = L2 == 0 ? .45 + .75 * h2.x * h2.x : .38;
        if (I < .03) continue;
        float sg = L2 == 0 ? .46 + .42 * sz : .4, core = exp(-r2 / (2. * sg * sg)), halo = exp(-r2 / (9. * sg * sg)) * (L2 == 0 ? .6 : .15);   // 细碎屑几乎没有外圈，就是一个利落的小色点                     // 芯不到一个像素；外面一圈很淡
        float cbl = exp(-dot(ds - ld, ds - ld) / (2.6 * sg * sg)), crs = exp(-dot(ds + ld, ds + ld) / (2.6 * sg * sg));      // 一点色散：蓝往一边偏，粉往另一边
        vec3 au = h3.y < .34 ? vec3(.74, .64, .96) : (h3.y < .67 ? vec3(.54, .86, .9) : vec3(.98, .72, .84));
        float star = 0.; if (L2 == 0 && I * sz > .45) { vec2 dr = vec2(.9902 * ds.x - .1395 * ds.y, .1395 * ds.x + .9902 * ds.y); float R = 2.2 + 3.4 * sz * min(1., I), r = sqrt(r2);   // 最亮的几颗带四道细光，和顶点上的小星闪一个样子
          vec2 e4 = abs(vec2(dr.x * 1.34, dr.y)) / R; star = (1. - smoothstep(.86, 1.02, pow(e4.x, .58) + pow(e4.y, .58))) * exp(-r / (R * .5));
          vec2 e5 = abs(vec2(dr.x + dr.y, dr.x - dr.y)) * .7071 / (R * .32); star = max(star, (1. - smoothstep(.85, 1.02, pow(e5.x, .62) + pow(e5.y, .62))) * .6); }
        // 亮点不是纯白：一半是石头自己的颜色，一半是色散出来的光谱色（看的角度一变就沿着光谱换），再带一点淡紫、青或粉。细碎屑颜色浓一些，大亮点的芯淡一些
        vec3 spc = .6 + .4 * cos(6.2832 * (dot(rm, vec3(2.1, 1.3, 1.7)) * 1.4 + h3.z + vec3(0., .33, .67))), tint = mix(mix(spc, hueS, .45), au, .22);
        vec3 coreC = mix(vec3(1.), tint, (L2 == 0 ? .4 : .72) * (1. - .3 * smoothstep(.9, 1.3, I)));
        gC += (mix(au, tint, .5) * halo * .42 + vec3(.98, .6, .82) * crs * .3 + vec3(.5, .74, 1.) * cbl * .3) * I;
        float aG = clamp(core * 1.15 + star, 0., 1.) * min(1., I * 1.3); if (aG > ga) { ga = aG; gcc = coreC; } } }
    gC = min(gC, vec3(.85)) * uSet; day = 1. - (1. - day) * (1. - gC); day = mix(day, gcc, ga * uSet);
    uvc = 1. - (1. - uvc) * (1. - gC * .6); uvc = mix(uvc, mix(vec3(.9, .95, 1.), gcc, .35), ga * .85 * uSet); }   // 亮边
  { vec2 cell = floor(fq / 11.); float h = hash(cell + 3.3); if (h > .988 && dE > 4.) { vec2 ctr = (cell + .5 + (vec2(hash(cell + 1.7), hash(cell + 5.1)) - .5) * .6) * 11.; float dd = length(fq - ctr), tw = pow(max(0., sin(h * 97. + uTime * .9 + dot(nv, vec3(9., 6., 4.)))), 14.) * exp(-dd * dd / 6.) * (tone > .8 ? 1. : .5) * uSet; day += (1. - day) * tw; uvc += (vec3(.84, .91, 1.) - uvc) * tw; } }   // 颗粒上的闪
  if (uUV > .001) {   // 紫外灯下也看得出是一块晶体：白天那一层的明暗（刻面、台阶、棱上的光）按比例留在荧光上；里面再浮着一些会闪的小碎亮
    float dl = dot(day, vec3(.3, .55, .15)); uvc *= clamp(1. + (dl - .74) * 1.5, .62, 1.38); uvc += (vec3(.88, .9, 1.) - uvc) * clamp((dl - .9) * 2.2, 0., .45);
    float sg = 0.; vec3 sc3 = vec3(0.); for (int c = 0; c < 3; c++) { vec3 q = (OL[k] + (tn + th * (.14 + .3 * float(c))) * Dl) / uF[k] * 9. + float(c) * 5.7, fr = fract(q) - .5, ci = floor(q); float h = fract(sin(dot(ci, vec3(12.99, 78.23, 37.71))) * 43758.55);
      if (h > .89) { vec3 o3 = (vec3(fract(h * 17.3), fract(h * 31.7), fract(h * 7.1)) - .5) * .5; float r = length(fr - o3), tw = .35 + .65 * pow(.5 + .5 * sin(uTime * 2.3 + h * 70.), 3.), g = (smoothstep(.24, .03, r) + smoothstep(.5, .12, r) * .22) * tw * (1. - .2 * float(c)); if (g > sg) { sg = g; sc3 = mix(vec3(.9, .93, 1.), vec3(.78, .82, 1.), fract(h * 13.1)); } } }
    uvc += (sc3 - uvc) * sg * .9 * uSet; }
  float covA = 1.; if (dS < .5) { vec3 gd, gu; ground(pix, gd, gu); gu += uUVh * .62; float cov = clamp(dS + .5, 0., 1.); covA = cov; if (uAlpha < .5) { day = mix(gd, day, cov); uvc = mix(gu, uvc, cov); } }
  outC = finish(mix(day, uvc, uUV), pix, covA);
}`;

// ===== src/core/renderer.js =====
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
    u1('uFrost', o.frost); u1('uSoft', o.soft); u1('uVar', o.var); u1('uClear', o.clear); u1('uTerr', o.terr); u1('uStep', o.step); u1('uCleave', o.cleave); u1('uLus', o.lus); u1('uDisp', o.disp); u1('uGem', o.gem || 0);
    u3('uDeepL', o.deepL); u3('uMidL', o.midL); u3('uDeepC', o.deepC); u3('uGlowC', o.glowC); u3('uUVa', o.uva); u3('uUVb', o.uvb); u3('uUVc', o.uvc); u3('uUVg', o.uvg); u3('uUVh', o.uvh); u3('uBack', o.back || [.62, .63, .84]); const EV = o.env || [[.47, .48, .85], [.8, .74, .97], [1, .86, .89], [.8, .96, .94]]; u3('uEnv0', EV[0]); u3('uEnv1', EV[1]); u3('uEnv2', EV[2]); u3('uEnv3', EV[3]);   // 每个面映出来的环境，按这块石头的颜色配
    u3('uHiT', o.hiT || [1, 1, 1]); u3('uLoT', o.loT || [1, 1, 1]); u3('uRimB', o.rimB || [1.2, 1.2, 1.1]); u3('uHid[0]', (o.hid || [[1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]]).flat()); u1('uHidA', o.hidA || 0); u1('uFilmK', o.filmK || 0); u1('uFilmH', o.filmH || 0); u1('uFilmR', o.filmR ?? 1); u1('uCOff', o.cOff ?? 1); u1('uFilmW', o.filmW ?? 1); u1('uZAx', o.zAx || 0); u1('uBand', o.band || 0); u1('uChord', o.chord || 0); u1('uIn', o.inner || 0); u1('uIOR', o.ior || 1.55); u1('uPh', o.phantom || 0); u1('uAst', o.ast || 0); u1('uPl', o.pl || 0); const PL = o.plAx || [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; u3('uPlA', PL[0]); u3('uPlB', PL[1]); u3('uPlC', PL[2]); u3('uAxR', o.axR || [-1.3, 1.7, 0]); u1('uLab', o.lab || 0); u3('uLabN', norm(o.labN || [.15, 1, -.1])); u3('uGlowCol', o.glowCol || [0, 0, 0]); u1('uGlowK', o.glowK || 0); u1('uSpk', o.spk || 0); u3('uSpkCol', o.spkCol || [1, .4, .3]); u1('uVein', o.vein || 0); u1('uStri', o.stri || 0); u1('uStriD', o.striD || 0); u1('uConch', o.conch ?? .5); u1('uEtch', o.etch || 0); u1('uEtchT', o.etchT || 0); u1('uVeinM', o.veinM || 0); u3('uVeinCol', o.veinCol || [.12, .1, .12]); u3('uLabX', o.labX || [0, 0, 0]); 
    starI.fill(0); view.flash = 1; last = 0; req();
  };
  view.setOre(opts.ore);
  view.destroy = () => { dead = true; if (rq) cancelAnimationFrame(rq); rq = 0; if (io) io.disconnect(); for (const [el, ev, fn, o] of L_) el.removeEventListener(ev, fn, o); try { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (_) {} if (!opts.canvas && cv.parentNode) cv.parentNode.removeChild(cv); };
  req(); return view;
}

// ===== src/api.js =====
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
function oreFor(o) { const r_ = oreFor0(o); if (o.scale && r_.ore.cluster) r_.ore.cluster = r_.ore.cluster.map(c => ({ ...c, s: c.s * o.scale, t: [c.t[0] * o.scale, (c.t[1] - 2.02) * o.scale + 2.02, c.t[2] * o.scale] })); return r_; }   // scale：在同样的画框里把晶体缩小一点，多留白
function oreFor0(o) {
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
return UniAether;
});
