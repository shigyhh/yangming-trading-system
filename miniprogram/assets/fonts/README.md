# 小程序字体资产

这些字体文件是从用户提供的原始字体中裁剪出的 woff2 子集，覆盖当前小程序页面文案和常用符号。

重要：字体能被加载，不等于已经完成商用授权留档。Logo、小程序头像、favicon、海报主标必须使用原创矢量或 CSS 结构，不得从这些字体转曲、描摹或修改。

不要把原始完整字体直接放入小程序包：

- `LXGWWenKai-*.ttf` 单个约 24MB。
- `HarmonyOS-Sans.rar` 约 54MB。

当前字体映射：

- `LXGWWenKai-Zhixing.woff2`：心证、戒律、六大关卡、九型人格名称、品牌级标题。
- `HarmonyOS-SansSC-Regular-Zhixing.woff2`：正文说明、事上练内容、AI省察。
- `HarmonyOS-SansSC-Medium-Zhixing.woff2`：正文强调、按钮、数据面板说明。
- `HarmonyOS-SansSC-Bold-Zhixing.woff2`：知行指数数字、成长数值、连续修行天数。

当前工程状态：

- `app.js` 不再主动加载 `HarmonyOS-SansSC-*.woff2`。
- `app.wxss` 不再声明 `ZX-Harmony`。
- 正文、数字和英文标签回到系统无衬线 / Noto Sans SC fallback。

授权状态：

- `LXGWWenKai-Zhixing.woff2`：按 LXGW WenKai 官方 OFL 留档后可继续作为文字承载。
- `HarmonyOS-SansSC-*.woff2`：当前仓库未保存完整授权条款，暂列待确认。没有授权证明前，不得用于 Logo、字标、品牌标题底稿、默认正文承载或对外宣称的原创字体。

如果后续新增大量中文文案，需要重新生成字体子集。
