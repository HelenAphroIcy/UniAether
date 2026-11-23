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
