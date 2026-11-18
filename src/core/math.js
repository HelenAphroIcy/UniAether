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
