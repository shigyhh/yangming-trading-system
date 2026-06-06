# 一念心湖视觉层

当前项目是 Next.js + TypeScript + Three.js，所以这里没有另起 Vite 项目，而是把“念头万万千 / 心猿意马 / 万念归心”的 WebGL 作品接入到 `/one-thought-lake` 页面里。

## 本地预览

```bash
cd web-next
npm run dev -- --port 3002
```

访问：

```text
http://localhost:3002/one-thought-lake
```

## 参数

参数集中在 `config.ts` 的 `THOUGHT_FIELD_CONFIG`。

- `particleCount`：金尘数量，越高越密，也越吃性能。
- `innerVoidRadius`：中心留白半径，越大越“本心未动”。
- `cloudRadius`：主要心念云半径。
- `outerScatter`：外围逸散范围，越大越有“万念纷飞”。
- `goldIntensity`：金尘亮度，过高会像科技珠子。
- `threadOpacity`：游丝透明度，过高会像神经网络。
- `mistOpacity`：墨雾强度。
- `animationSpeed`：整体速度，建议保持慢。
- `monkeyMindStrength`：左侧碎动强度，表达心猿之乱。
- `horseMindStrength`：右侧奔逸强度，表达意马之逸。
- `returnStrength`：归心力，防止粒子散掉。
- `centerFireIntensity`：中心心火强度，保持弱而稳。
- `backgroundGrain`：纸面颗粒/墨气强度。

## 快捷键

- `Space`：暂停 / 继续。
- `H`：显示 / 隐藏调试面板。
- `R`：重置粒子场。
- `S`：保存当前画面截图。

## 自检

- 不像科技粒子球。
- 中心有空，空比粒子更重要。
- 粒子不是满屏，不形成规则圆。
- 动画慢、静、玄，不爆炸、不机械旋转。
- 没有具象动物、星球、魔法阵、金融红绿。
