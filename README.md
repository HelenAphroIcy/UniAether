# UniAether

**Mineral crystals computed from mineralogy and optics, live in the browser.** 中文说明见 [README.zh-CN.md](README.zh-CN.md).

![The UniAether playground: a fluorite cluster next to its controls](docs/hero.png)

> “By aesthetic, I mean responsive to the pattern which connects.”
> Gregory Bateson, *Mind and Nature: A Necessary Unity* (1979)

Each crystal is built from real crystal faces, and every pixel follows light through the stone: refraction, colour that deepens with thickness, growth zones, pleochroism, dispersion, fluorescence under UV, and the coloured light it casts on the paper. There is no generative content: the crystals' looks and motion are all computed in code.

It comes with 26 minerals and 227 colours, each checked against its sources. It grew out of *Ore Projection*, the aesthetic system Helen AphroIcy made for her original character Fufu, the mineral game [ISARO](https://isaro.aphrogenes.com) and the Crystal Atlas.

## Try it

Open the [playground](https://helenaphroicy.github.io/UniAether/playground/): pick a mineral and a colour, change the grade and the light, turn the crystal with your finger or mouse, and export it in several formats.

## Use it

```html
<script src="dist/uniaether.js"></script>

<uni-aether mineral="fluorite" colour="emerald" grade="S"></uni-aether>
<uni-aether mineral="corundum" light="uv"></uni-aether>
<uni-aether mineral="labradorite" sphere></uni-aether>
```

Or from JavaScript:

```js
import UniAether from './dist/uniaether.mjs';

const stone = UniAether.create('#stage', { mineral: 'beryl', colour: 'aqua', grade: 'A' });
stone.set({ light: 'uv' });
```

The options you will use most:

- `mineral` and `colour`: see them all with `UniAether.minerals()`
- `grade`: `D` (rough) to `S` (museum grade)
- `light`: `day`, `uv` or `lamp`
- `sphere: true`: the same mineral as a polished sphere
- `transparent: true`: no background, for compositing

<details>
<summary>All options and methods</summary>

| option | values | default |
|---|---|---|
| `mineral` | one of the 26 ids: `fluorite`, `spinel`, `garnet`, `diamond`, `tourmaline`, `corundum`, `quartz`, `beryl`, `apatite`, `topaz`, `chrysoberyl`, `zoisite`, `peridot`, `cordierite`, `zircon`, `wulfenite`, `apophyllite`, `tugtupite`, `spodumene`, `titanite`, `moonstone`, `euclase`, `kyanite`, `labradorite`, `amazonite`, `rhodonite` | `fluorite` |
| `colour` | a colour id such as `emerald`, or an index | the first colour |
| `form` | which cluster of that colour's habit, by index | `0` |
| `grade` | `D` `C` `B` `A` `S`, or none (as on the colour cards) | none |
| `light` | `day`, `uv`, `lamp`; UV only glows where fluorescence is on record | `day` |
| `projection` | show the coloured projection on the ground | `true` |
| `sphere` | show the mineral as a polished sphere: same colours, zones and play of light | `false` |
| `crystal` | your own crystal, see below; replaces `mineral` | — |
| `transparent` | transparent background, for compositing | `false` |
| `interactive` | turn with mouse or finger | `true` |
| `autoplay` | animate by itself; `false` means you call `render()` | `true` |
| `quality` | render scale (1 = 880 × 1040); leave empty to let it adapt | auto |
| `sound` | the faint chime when a crystal finishes growing | `false` |

The instance has these methods:

- `set(options)`
- `turn(yaw, pitch)`
- `spin(speed)`
- `grow()`: replays the growth
- `pose({ yaw, pitch, t })`: freezes a frame
- `render()`
- `snapshot({ crop: 'frame' | 'square', size })`
- `on('change' | 'lost' | 'unsupported', fn)`
- `destroy()`

</details>

<details>
<summary>Make your own crystal</summary>

Any shape works; the light still behaves as it would in a real stone.

```js
UniAether.create('#stage', {
  crystal: {
    name: 'Aether shard',
    forms: [                                   // up to 5 crystals, 18 faces each
      { shape: 'prism', n: 6, size: 1.25, params: { length: 1.3, width: .42, tip: .7 } },
      { shape: 'bipyramid', n: 9, size: .5, at: [-.9, -.6, .3] },
      { faces: [[0, 1, 0, .6], [0, -1, 0, .6], /* … */], size: .5, at: [.9, -.5, .5] },
    ],
    colour: '#7b6cff', colour2: '#5fe6ff', zone: 'rim',   // zones: even, heart, core, rim, band, melon
    ior: 1.75, dispersion: 1.8, lustre: 1.25,
    glow: '#5fe6ff', glowStrength: .4,                     // an inner light
    iridescence: .5, iridescenceHue: .6,                   // a labradorite-like play of colour
    fluorescence: '#5fe6ff',                               // its colour under the UV lamp
  },
});
```

**Ready-made shapes** (`UniAether.shapes`):

- cubic: `cube`, `octahedron`, `dodecahedron`, `cuboctahedron`, `spinelTwin`
- other habits: `quartz`, `beryl`, `tourmaline`, `apatite`, `zircon`, `topaz`, `barrel`, `blade`, `tabular`, `block`
- with parameters: `prism(n, { length, width, tip, flat })` and `bipyramid(n, { width, tip })`
- `sphere`: a smooth ball

A face is `[nx, ny, nz, d]`: a unit normal and its distance from the centre.

</details>

## In games

```js
const sheet = await UniAether.sprites({ mineral: 'spinel', grade: 'S', frames: 36, size: 256 });   // a turning sprite sheet + TexturePacker JSON
const live = UniAether.texture({ mineral: 'quartz', transparent: true });                         // a live canvas texture
```

PixiJS and Phaser read the sheet as it is; Unity, Godot and GameMaker have importers for it. Examples: [PixiJS](examples/pixi.html), [Three.js](examples/three.html), [plain HTML](examples/basic.html).

## How it was made

About 700 lines of plain JavaScript and GLSL, no dependencies, plus the mineral data.

```
src/data              minerals, colours, sources
src/core/colour.js    a colour → absorption per channel, growth zones, fluorescence
src/core/forms.js     a habit → face planes, twins, clusters
src/api.js            your options → one stone
src/core/renderer.js  WebGL2, dragging, growth, glints
src/core/shader.js    one ray of light per pixel
```

1. **Colour.** Each colour becomes an absorption rate for red, green and blue, so thick parts of the stone are deeper than thin edges (Beer–Lambert).
2. **Shape.** A crystal is the space inside its faces: cube {100}, octahedron {111} and so on, up to 18 faces each and 5 crystals in a cluster.
3. **Light.** For each pixel, a ray enters the crystal, bends (Snell's law), reflects inside when it must, and picks up colour from the zones it passes.
4. **Ground.** The paper is lit by tracing back through the crystals to the lamp, which gives the coloured projection.
5. **Finish.** Pigment grain and soft outlines give the watercolour and mineral-pigment look; the grade adds frost, stains and phantoms.

## Limits

- Needs WebGL2, which nearly every current browser has.
- Crystals are convex, up to 18 faces, or a sphere; up to 5 in a cluster.

## Licence and credit

- **Code:** MIT ([LICENSE](LICENSE)).
- **Mineral data** in `src/data/`: CC BY-NC 4.0 ([LICENSE-DATA.md](LICENSE-DATA.md)). Free for non-commercial work with credit. For commercial use, write through [aphrogenes.com](https://aphrogenes.com), or make your own crystals with `UniAether.crystal()`.
- **Names:** UniAether, ISARO, Fufu (浮溟) and their marks are not licensed ([NOTICE](NOTICE)).

Please credit it like this:

```
Crystals rendered with UniAether by Helen AphroIcy · aphrogenes.com
```

To cite it, use [CITATION.cff](CITATION.cff). The library itself sends no data anywhere.
