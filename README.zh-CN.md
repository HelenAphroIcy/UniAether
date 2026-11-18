# UniAether

**按矿物学和光学算出来的矿晶。** English: [README.md](README.md).

![UniAether试玩页：一簇萤石和旁边的控制面板](docs/hero-zh.png)

> “By aesthetic, I mean responsive to the pattern which connects.”
>「我说的美学，是对那连接一切的模式有所回应。」Gregory Bateson，《心灵与自然》（1979）

UniAether在浏览器里实时画矿晶。

每一颗晶体都是矿物学里的一组晶面。屏幕上每个像素都跟着光穿过石头：

- 每个面都折射
- 越厚的地方颜色吸收得越多
- 生长色带和幻影
- 多色性、色散、晕彩、星光
- 长波紫外灯下的荧光
- 石头落在地上的彩色投影

这里没有一样东西是"生成"的，每一帧都是算出来的。

它来自「矿石投影」，是Helen AphroIcy为她的原创角色浮浮、矿物游戏[ISARO](https://isaro.aphrogenes.com)和矿晶集做的那套矿晶美学系统。里面带着26种矿物、227种颜色，每种颜色都有出处。

## 能做什么

- **摆一颗矿物出来**：一个标签就行，手指或鼠标都能转。
- **换灯**：有日光、长波紫外灯和白炽灯三种。变石在白炽灯下会从绿变红。
- **定品相**：从D（矿料）到S（博物馆级）。品相越低越雾、越脏、越暗；S级会闪。
- **放在纸上，或者什么都不垫**：放在纸上会落下彩色的投影；`transparent: true`是透明底，可以直接放进网页或游戏场景。
- **自己造一块**：形状、颜色、内光、晕彩、火彩都能定。形状可以是虚构的，光学照真的算。
- **磨圆的矿石球**：矿石球本来就是收藏里的一大类。任何矿物都能换成一颗磨圆的球（`sphere: true`），颜色、色带、晕彩、星光都保留。
- **带进游戏**：可以导出转一圈的精灵图，附一份JSON图集；也可以把实时画面当成PixiJS、Phaser、Three.js里的贴图。

全部功能都可以在[试玩页](playground/index.html)里试。

## 开始用

```html
<script src="dist/uniaether.js"></script>

<uni-aether mineral="fluorite" colour="emerald" grade="S"></uni-aether>
<uni-aether mineral="corundum" light="uv"></uni-aether>
<uni-aether mineral="labradorite" sphere></uni-aether>
```

也可以用JavaScript：

```js
import UniAether from './dist/uniaether.mjs';

const stone = UniAether.create('#stage', { mineral: 'beryl', colour: 'aqua', grade: 'A' });
stone.set({ light: 'uv' });          // 之后随时改
stone.turn(.8, .1);                  // 转多少（弧度）：左右、上下
const png = stone.snapshot({ crop: 'square', size: 512 });
```

- `UniAether.minerals()`列出所有矿物和颜色。
- `UniAether.sources('beryl')`列出某种矿物的出处。

参数、自己造晶体的写法、游戏里的用法，都写在英文说明里，那边的表和例子更全。

## 怎么做出来的

UniAether是大约700行JavaScript和GLSL，加上矿物数据，不依赖任何库。没有一样是手画的，也没有一样是生成的：每一帧都是一个片元着色器算出来的，算的是光在石头里怎么走。

```
src/data   矿物、颜色、出处
   │
src/core/colour.js    颜色 → 每个通道的吸收、生长色带、荧光
src/core/forms.js     晶形 → 晶面、双晶、晶簇
src/core/math.js      旋转和摆放
   │
src/api.js            你的设置 → 一块石头（矿物 + 颜色 + 品相 + 灯）
   │
src/core/renderer.js  WebGL2、拖动和惯性、生长、星闪、画质
src/core/shader.js    每个像素一条光线
   │
画布 · 截图 · 精灵图 + JSON · 实时贴图
```

1. **数据**（`src/data/`）：每种矿物有晶系、折射率、色散和光性；每种颜色有样子、分层、稀有度、成因，和核对过的出处。
2. **颜色**（`colour.js`）：一种颜色先换算成红、绿、蓝三个通道各自的吸收系数，所以石头厚的地方颜色深，薄的边上颜色浅（比尔–朗伯定律）。色带的样式（均匀、心、核、边、条带、西瓜）沿着生长方向最多排七段。会发荧光的颜色还带着它在长波紫外灯下的颜色。
3. **几何**（`forms.js`、`math.js`）：一颗晶体就是一组晶面围起来的空间。每个晶面是一个平面`[nx, ny, nz, d]`：立方体{100}、八面体{111}、十二面体{110}，其他晶系用柱和锥；双晶照真的双晶律。一颗晶体最多18个面，一簇最多5颗。磨圆的球只是一个标记，不是网格。
4. **光学**（`shader.js`）：每个像素朝晶簇射一条光线：
   - 用晶面去切，找到光线进出每颗凸晶体的位置；
   - 按斯涅尔定律折射；角度超过临界角就反射回石头里（全反射）；
   - 在石头里走16步，把经过的色带的吸收加起来，所以颜色取决于光走了多远、朝哪个方向（多色性）；
   - 边上按色散分出彩色；晶面映出一个画出来的环境，石头一转，整个面的颜色跟着变；
   - 从纸上这一点朝灯反着追，穿过晶体，得到落在纸上的彩色投影；
   - 最后加上颜料颗粒、边缘积色和细的描边，就是水彩和矿物颜料的质感；
   - 品相加雾、污渍和幻影；紫外灯下，日光换成荧光。
5. **动起来**（`renderer.js`）：拖动带惯性，有生长动画；星闪落在朝着光的角上（在CPU上算，被别的晶体挡住就变淡）。石头不在屏幕里会暂停；设备慢了会自己降画质。
6. **输出**（`api.js`）：画布本身、截图和精灵图。精灵图是每个角度先按两倍大画，再缩小，拼成一张图，配一份TexturePacker JSON Hash。

`tools/build.mjs`把这些文件合进`dist/`（script标签、ES模块、CommonJS三种）；`test/smoke.mjs`检查数据，装了Playwright的话还会真的渲染一遍。

## 限制

- 需要WebGL2，现在的浏览器几乎都有。
- 每颗晶体是凸的，最多18个面，或者是一个球；一簇最多5颗。
- 手机上帧慢了会自己降画质。

## 署名、许可、引用

概念、美学、框架和版式由Helen AphroIcy设计，每一种颜色都是她从色卡和自己收集的真实矿物照片里挑的。代码是在和AI的对话里成形的，AI在这里是媒介的一部分：*me, Fufu, and the medium between us*。

- **代码**：MIT。商用也可以，保留版权声明就行。
- **矿物数据**：指`src/data/`里的东西，包括26种矿物的样子、227种颜色和它们的分层、稀有度、说明和出处。数据用CC BY-NC 4.0：
  - 非商用免费，署名就行。
  - 想商用，请通过[aphrogenes.com](https://aphrogenes.com)联系Helen AphroIcy；或者用`UniAether.crystal()`自己造晶体，那样不受这条限制。
- **名字和标志**：UniAether、ISARO、浮浮这些名字和它们的标志都不在许可里。

**请这样署名**，写在作品列工具的地方，比如作品说明、片尾或网页页脚：

```
矿晶渲染：UniAether · Helen AphroIcy
Crystals rendered with UniAether by Helen AphroIcy · aphrogenes.com
```

论文、作品集、申请材料里要引用时，用[CITATION.cff](CITATION.cff)。GitHub页面上会有「Cite this repository」按钮。

## 给我们看看你做了什么

UniAether也是一种观察：看这些矿晶走到了哪里，被做成了什么。

- 发到[Discussions → Show and tell](../../discussions/categories/show-and-tell)。
- 给你的仓库打上`uniaether`标签。
- 想的话也可以挂上徽章：[![Made with UniAether](https://img.shields.io/badge/made%20with-UniAether-b7a6e6)](https://aphrogenes.com)。

库本身不往外发任何东西：没有统计，不回传。
