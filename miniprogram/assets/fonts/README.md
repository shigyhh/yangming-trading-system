# 小程序字体资产

这些字体文件是从用户提供的原始字体中裁剪出的 woff2 子集，覆盖当前小程序页面文案和常用符号。

不要把原始完整字体直接放入小程序包：

- `LXGWWenKai-*.ttf` 单个约 24MB。
- `HarmonyOS-Sans.rar` 约 54MB。

当前字体映射：

- `LXGWWenKai-Zhixing.woff2`：心证、戒律、六大关卡、九型人格名称、品牌级标题。
- `HarmonyOS-SansSC-Regular-Zhixing.woff2`：正文说明、事上练内容、AI省察。
- `HarmonyOS-SansSC-Medium-Zhixing.woff2`：正文强调、按钮、数据面板说明。
- `HarmonyOS-SansSC-Bold-Zhixing.woff2`：知行指数数字、成长数值、连续修行天数。

如果后续新增大量中文文案，需要重新生成字体子集。
