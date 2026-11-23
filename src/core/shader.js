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
uniform vec3 uHid[4]; uniform float uStri, uStriD, uConch, uEtch, uEtchT; uniform float uHidA, uFilmK, uFilmH, uFilmR, uCOff, uFilmW, uZAx, uBand, uChord, uIn, uIOR, uPh, uAst, uPl, uLab, uGlowK, uSpk, uVein, uVeinM; uniform vec3 uAxR, uLabN, uGlowCol, uPlA, uPlB, uPlC, uSpkCol, uVeinCol, uLabX;
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
  day *= exp(-tau / (1. + tau * CAP)); { vec3 hu1 = day / max(.001, max(day.r, max(day.g, day.b))); float lr = len / max(s, 1e-3), core = smoothstep(.2, .7, lr) * (1. - smoothstep(1., 2.4, lr)); day = mix(day, min(vec3(1.), day * 1.2 + hu1 * .05), core * .42 * uSet); }   // 透光：光穿过的地方亮起来，带着石头自己的颜色 if (uGlowK > .001) { float gk = (1. - exp(-len * 1.3)) * uGlowK * (.93 + .07 * sin(uTime * 1.1)); day = mix(day, day * .55 + uGlowCol * .62, gk * .55 * uSet); day += uGlowCol * gk * gk * .16 * uSet; }                                                       // 路很长的地方（贴着外圈看过去）不让它一直深下去
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
    float hq = fhash(PN(k, m1) + 1.7 * PN(k, m2), float(k) + 2.), st4 = floor(hq * 4.) / 3.; day *= mix(1., .82 + .36 * st4, uIn * .7 * (1. - .5 * uGlowK) * uSet);   // 每一小块一档明暗，像一格一格的
    float li = (1. - smoothstep(.35, 1.3, inE)) * .5, li2 = (1. - smoothstep(.35, 1.2, inE2)) * .3 * tirK;
    vec3 lcol = mix(mix(uMidL, uDeepL, .4), vec3(1., .985, .97), .35 + .5 * tirK);
    day = mix(day, lcol, max(li, li2) * uIn * uSet);
    if (uPh > .001) { float FF = uF[k]; for (int c = 0; c < 5; c++) { float r = c == 0 ? .55 : (c == 1 ? .8 : .84 + float(c) * .035), w = (c < 2 ? .012 : .006) * FF; if (uG[k] < r + .03) continue; float sh = shell(k, p, Dr, r * FF, w) / w;   // 幻影：长到一半停过一阵，留下一层和外形一样的薄膜，斜着穿过的地方最清楚
        float a = (clamp((sh - 2.) * .12, 0., 1.) * .8 + .06 * step(.5, sh)) * uPh * (c == 0 ? 1. : (c == 1 ? .55 : .3)) * (c < 2 ? 1. : 1. - step(.5, sh) * .7); vec3 pc = mix(vec3(1., .99, .97), uHid[1 + c % 2], .35);   // 后三条是靠近表面的细生长线
        day = mix(day, pc, a * uSet); } } }
  { int m = (uIn > .001 && uK[k] < .5) ? m1 : AF[k]; vec3 nb2 = uR[k] * NRM(k, m, OL[k] + TF[k] * Dl); float bl = lightOn(nb2), pq = .5 * smoothstep(.1, .2, bl) + .5 * smoothstep(.45, .55, bl);   // 隔着正面看到的背面：朝着光的那块亮，背着光的那块暗一档、偏冷
    float hb = fhash(PN(k, m), 3.); vec3 hcb = uHid[int(min(3., floor(fract(hb * 3.7) * 4.)))]; vec3 tb = mix(.93 + .11 * cos(6.2832 * (hb + vec3(0., .33, .67))), mix(vec3(1.), hcb / max(.05, dot(hcb, vec3(.3, .55, .15))), 1.6 * uHidA), step(.001, uHidA)); day *= mix(vec3(1.), mix(mix(uBack, vec3(.88, .85, .86), uFrost), uRimB, pq) * tb * mix(.86, 1.12, fract(hb * 5.3)), uSet); uvc *= mix(1., mix(.72, 1.14, pq), uSet); vec3 qw = uT[k] + uR[k] * (OL[k] + TF[k] * Dl) - vec3(0., 2.02, 0.), rb = normalize(d - 2. * dot(d, nb2) * nb2 + qw * .34); day = mix(day, vec3(1., 1., .98), max(window(rb, WA), window(rb, WB) * .7) * .46 * uClear * uSet * (1. - .75 * uK[k])); }
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
    day = mix(day, e, F); { vec3 pw3 = uT[k] + uR[k] * p - vec3(0., 2.02, 0.), rw = normalize(r + pw3 * .2); float win = max(window(rw, WA), window(rw, WB) * .75); day = mix(day, vec3(1.), max(smoothstep(.9, .97, dot(rw, uL)) * .7, win * .9 * (1. - .6 * uK[k])) * wgl * uSet); } uvc = mix(uvc, uUVb * (.5 + .5 * e.b), F * .16); }
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
      float T2 = step(1.5, uEtchT), el = uEtchT < .5 ? 1. : (uEtchT < 1.5 ? 2.6 : mix(2.8, 1., basal)), elS = T2 > .5 ? mix(3.2, 1., basal) : 1., kE2 = uEtch * uSet * smoothstep(2., 6., dE), bF = lightOn(nw), best = 0., bestAll = -1e3, stH = 2., flr = 0.; vec2 bN = vec2(0.); vec3 hueS2 = day / max(.001, max(day.r, max(day.g, day.b)));
      for (int L3 = 0; L3 < 3; L3++) {
        float cs = (L3 == 0 ? 44. : (L3 == 1 ? 18. : 7.5)) * mix(1., mix(.62, .9, basal), T2); vec2 csv = vec2(cs, cs * el), cb = floor(lp / csv);   // 三层大小：大的、中的、碎的；格子顺着晶体的方向排，所以会排成行
        for (int yy = -1; yy <= 1; yy++) for (int xx = -1; xx <= 1; xx++) {
          vec2 cc = cb + vec2(float(xx), float(yy)), hb = cc + vec2(float(L3) * 13.7 + float(k) * 5.1, float(i) * 2.3), ctr = (cc + .5 + (vec2(hash(hb + 1.3), hash(hb + 5.9)) - .5) * .7) * csv;
          float zone = smoothstep(mix(.36, .38, T2), mix(.6, .66, T2), vn(ctr / mix(115., 150., T2) + vec2(float(k) * 3.3, float(i) * 1.9)));            // 蚀得厉害的一片和干净的一片：有疏有密，中间留干净的面
          if (hash(hb) > mix(.03, (L3 == 0 ? .6 : (L3 == 1 ? .85 : .75)) * mix(1., L3 == 2 ? .45 : 1.02, T2), zone)) continue;
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
  day = mix(day, vec3(.62) + .38 * cos(6.2832 * (alR * 1.1 + dot(nv, vec3(1.3, .9, .4)) + vec3(0., .33, .67))), (exp(-pow(uIn > .001 ? inE * 1.3 : dRe, 2.) / 1.3) * 1.25 + exp(-(uIn > .001 ? inE * 1.3 : dRe) / 3.2) * .45) * mix(.2, .12, step(.001, uIn)) * uDisp * uSet);   // 芯细而亮，外面一层很淡        // 背面的棱上有一线分出来的颜色，转动时会换
  float rev = smoothstep(0., .1, uLine * 1.2 - length(pix - vec2(384., 400.)) / 520.); la *= mix(rev * .62, 1., uSet); lc = mix(lc, vec3(.52, .5, .74), (1. - uSet) * .6);   // 生长时：线先从中心往外画出来，淡的
  day = mix(day, vec3(.9, .94, .96), .05 * rev * (1. - uSet));
  if (lit < -.1) { float gl = exp(-dS / 11.) * .34 * uSet * mix(.5, 1., smoothstep(1., 2., tone)) * smoothstep(-.1, -.4, lit); day = mix(day, GLOW, gl); uvc = mix(uvc, uUVc, gl * .8); }   // 光从背面穿出来的那一侧亮一圈
  { vec3 nbP = PN(k, nb); float eFr = max(frA, step(.0006, dot(nbP, nbP) - 1.)) * step(dF, min(dS, dC) + .01); la *= mix(1., .3 + .7 * smoothstep(.3, .62, vn(vec2(along * U / 2.6, float(i) + float(nb) * 1.7))), eFr); }   // 断开的棱崩得一截一截的
  la *= 1. - .38 * step(1.5, uEtchT) * step(.001, uEtch);   // 溶蚀过的绿柱石，棱被溶得圆一些：线淡一点、不那么硬
  day = mix(day, lc, la); uvc = mix(uvc, mix(uUVc, iri + .25, .3), la * .36);
  { float er = smoothstep(-.35, .7, lit), brk2 = mix(smoothstep(.42, .68, vn(pix / 5.5 + 8.3)), 1., er);   // 内圈：自己的浅色（暖光或冷光，跟藏色走），受光一侧亮而连贯，背光一侧淡、断开
    vec3 rimc = mix(mix(uHid[3] / max(.05, max(uHid[3].r, max(uHid[3].g, uHid[3].b))), vec3(1.), .5), iri + .1, .35);
    float r1 = lineA(abs(dS - 2.5), mix(.36, .6, er)) * mix(.25, .9, er) * brk2 * uSet; day = mix(day, rimc, r1); uvc = mix(uvc, vec3(1.), r1 * .25); }
  { float sh = max(lineA(abs(dF - 2.6), .5), lineA(abs(dC - 2.6), .5) * .7) * (.6 + .4 * wob) * (1. - smoothstep(.4, 1., tone)) * uSet; day = mix(day, vec3(1.), sh * .92); uvc = mix(uvc, vec3(1.), sh * .35); }
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
  float covA = 1.; if (dS < .5) { vec3 gd, gu; ground(pix, gd, gu); gu += uUVh * .62; float cov = clamp(dS + .5, 0., 1.); covA = cov; if (uAlpha < .5) { day = mix(gd, day, cov); uvc = mix(gu, uvc, cov); } }
  outC = finish(mix(day, uvc, uUV), pix, covA);
}`;
