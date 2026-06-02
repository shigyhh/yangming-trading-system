# 00 字体与字形来源防护

这一章优先级高于所有视觉审美。字体系统可以高级，但必须先能说明来源。

## 红线

- 禁止描摹商业字体轮廓。
- 禁止把商业字体转曲后修改当作原创。
- 禁止相信“改 20% 就安全”。
- 禁止用未授权字体生成 Logo、海报、App 标题或小程序头像。
- 禁止把某个商用字体的骨架当作自己的字体源文件。

## 当前审计结论

| 项目 | 当前状态 | 风险判断 | 动作 |
| --- | --- | --- | --- |
| A1 主标 | `web-next/public/brand/yangming-a1.svg` 与 `YangmingA1Mark` 使用手写 SVG path | 不依赖字体轮廓 | 可进入产品，但保留版本记录 |
| C16 小标 | `web-next/public/brand/yangming-c16.svg` 与 `YangmingC16Mark` 使用手写 SVG path | 不依赖字体轮廓 | 可用于 favicon、头像、小尺寸标 |
| UI Glyph | `web-next/public/brand/yangming-ui-glyphs.svg` 与 `YangmingGlyph` 使用手写 SVG path | 不依赖字体轮廓 | 可用于 UI 图标体系 |
| Noto Serif SC / Noto Sans SC | 当前 Web 字体承载 | 官方 Noto 文档说明 Noto 字体使用 SIL Open Font License | 可作为 UI / Display 承载；不得转曲描摹成 Logo |
| LXGW WenKai | 当前手感字承载 | 官方仓库使用 SIL Open Font License | 可作为 UI / 文案承载；不得转曲描摹成 Logo |
| HarmonyOS Sans SC | 当前小程序正文子集承载 | 本地 name table 声明 Huawei Device Co., Ltd. 与 Hanyi Fonts，仓库内没有授权副本 | 暂列待确认；不得用于 Logo、字标、主视觉底稿 |

## 已验证的本地事实

- 当前 brand SVG 资产没有 `<text>`、`font-family`、`@font-face`、`textPath` 或字体 glyph 引用。
- `NotoSerifSC-Variable.woff2` name table 显示 Adobe / Noto Serif SC 信息。
- `NotoSansSC-Variable.woff2` name table 显示 Adobe / Noto Sans SC 信息。
- `LXGWWenKai-Medium.woff2` name table 显示 LXGW WenKai 与 Klee Project 信息。
- `HarmonyOS-SansSC-Regular-Zhixing.woff2` name table 显示 Huawei Device Co., Ltd.、Hanyi Fonts 与 HarmonyOS Sans SC 信息。
- 当前仓库没有集中保存 Noto / LXGW / HarmonyOS 的许可证副本，发布前必须补齐。

## 授权资料留档

必须在设计资产库或仓库保留：

- 字体来源 URL。
- 字体版本号。
- 下载日期。
- 原始授权文件。
- 子集生成记录。
- 使用场景清单。

当前可作为来源线索的官方页面：

- Noto 官方使用说明：https://notofonts.github.io/noto-docs/website/use/
- Google Fonts Noto Serif SC 页面：https://fonts.google.com/noto/specimen/Noto+Serif+SC
- Google Fonts Noto Sans SC 页面：https://fonts.google.com/noto/specimen/Noto+Sans+SC
- LXGW WenKai 官方仓库 OFL：https://github.com/lxgw/LxgwWenKai/blob/main/OFL.txt
- HarmonyOS Sans 官方设计资源页：https://developer.huawei.com/consumer/cn/doc/design-guides/font-0000001828772001

HarmonyOS Sans 只有在拿到可留档的完整授权条款后，才允许继续作为打包字体长期使用。否则应替换为 Noto Sans SC / Source Han Sans / 系统字体。

## 原创字形工作流

如果后续要真正定制“阳明照骨字系”，必须满足：

1. 从空白网格、手稿或几何骨架开始画。
2. 保留草图、网格、版本记录和设计说明。
3. 不使用商业字体轮廓作为底稿。
4. 不从截图、PDF、字体转曲文件反描。
5. 每次输出字体文件时保留源文件和导出记录。
6. 委托外部设计师时签完整权利转让或独占授权协议。

## 使用原则

Logo 是原创矢量符号，字体只是文字承载。

品牌大标题可以使用开源字体承载，但不得把开源字体显示效果误称为原创字体。正式对外表达应写：

“阳明照见品牌字形规范 V1.0，当前使用开源字体承载，核心 Logo 与 UI Glyph 为原创矢量资产。”

不得写：

“我们已经拥有完整原创中文字体。”
