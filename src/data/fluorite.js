// UniAether · data/fluorite.js — the fluorite cluster of Ore Projection version 8, kept as it was.
// Licensed CC BY-NC 4.0 (see LICENSE-DATA.md).
const PAL = [.14, .03, .008,  .06, .09, .02,  .52, .18, .02,  .6, .6, .06,  .2, .33, .028,  .7, 1.1, .1,  .55, .72, .1], FROST = .1, SOFT = .04, VAR = 1, CLEAR = .9, TERR = .8, STEP = 9;
const RO = mul(rotY(-.42), mul(rotX(.1), rotZ(.07))), OCT = habit(.93, .62, 0), CLUSTER = [{ R: RO, t: C0, s: 1.5, form: OCT }, { R: RO, t: add(C0, app(RO, [1.0, -.5, .4])), s: .92, form: OCT }, { R: RO, t: add(C0, app(RO, [-.85, .45, -.55])), s: .6, form: OCT }, { R: RO, t: add(C0, app(RO, [-.55, -.8, .75])), s: .5, form: OCT }, { R: RO, t: add(C0, app(RO, [.75, .75, -.7])), s: .34, form: OCT }];
const flat7 = (c, line) => [...c, ...line, ...c, ...line, ...c, ...c, ...c];   // 七层颜色都一样：尖晶石没有萤石那样的色带，只留一点生长纹
const FLUORITE = { id: 'fluorite', cluster: CLUSTER, pal: PAL, frost: FROST, soft: SOFT, var: VAR, clear: CLEAR, terr: TERR, step: STEP, cleave: 1, lus: 1, disp: 1,
  deepL: V3(.25, .29, .46), midL: V3(.47, .4, .72), deepC: V3(.329, .282, .588), glowC: V3(.847, .949, .918),
  uva: V3(.2, .13, .72), uvb: V3(.22, .42, 1), uvc: V3(.72, .86, 1), uvg: V3(.133, .29, .588), uvh: V3(.13, .26, .74), uv: true };

