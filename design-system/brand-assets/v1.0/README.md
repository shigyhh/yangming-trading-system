# 阳明照见 Brand Asset Pack V1.0

这是阳明心学交易系统的正式品牌资产包索引。它不把未确认授权的字体复制成可用资产，只记录源文件、使用规则和授权状态。

## Source Of Truth

| 资产 | 状态 | 源文件 |
| --- | --- | --- |
| A1 主标 | 正式 | `web-next/public/brand/yangming-a1.svg` |
| C16 小标 | 正式 | `web-next/public/brand/yangming-c16.svg` |
| UI Glyph | 正式 | `web-next/public/brand/yangming-ui-glyphs.svg` |
| React 组件 | 正式 | `web-next/src/components/brand/yangming-mark.tsx` |
| Next favicon | 正式 | `web-next/src/app/icon.svg` |
| Display 承载字体 | 可用但非原创字体 | `web-next/public/fonts/NotoSerifSC-Variable.woff2` |
| Text 承载字体 | 可用但非原创字体 | `web-next/public/fonts/NotoSansSC-Variable.woff2` |
| Hand 承载字体 | 可用但非原创字体 | `web-next/public/fonts/LXGWWenKai-Medium.woff2` |
| HarmonyOS Sans 子集 | 待授权确认，当前禁用 | `miniprogram/assets/fonts/HarmonyOS-SansSC-*.woff2` |

## 使用场景

- 首页：A1 导航标，C16 favicon，UI Glyph 点到为止。
- 报告页：A1 作为报告落款，UI Glyph 标识镜中念头、风险标签、报告结构、合规边界。
- 训练页：C16 作为训练系统小标，UI Glyph 标识今日事上练、动作、变化。
- 小程序：首页、报告页、训练页使用 CSS 几何 C16，不使用字体字形转曲。

## 字体原则

- 当前字体只是文字承载，不是完整原创中文字库。
- Logo / favicon / 小程序头像 / UI Glyph 必须使用原创矢量或 CSS 几何结构。
- 禁止描摹商业字体轮廓。
- 禁止把商业字体转曲后修改当原创。
- 禁止相信“改 20% 就安全”。

## 发布前清单

- [ ] 保留 Noto / LXGW 的授权副本。
- [ ] 如果继续使用 HarmonyOS Sans，必须补完整授权条款；否则保持禁用。
- [ ] 任何新增 Logo 或字标，都必须通过 `design-system/brand-guideline.test.mjs`。
- [ ] 小程序不得主动引用 `ZX-Harmony` 或 `HarmonyOS Sans`。
- [ ] Web / 小程序 / 报告 / 训练页都必须保留合规边界。
