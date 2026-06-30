# P11-V2 小程序视觉恢复后 DevTools smoke 报告

## P11-V2 小程序视觉恢复后 DevTools smoke 结论

不通过。

本轮 smoke 基于用户在微信开发者工具中提供的 5 张页面截图，以及 Codex 对当前工程和 DevTools 环境的只读检查。截图证明小程序没有白屏或整体崩溃，首页品牌 logo / 印章、single-focus 首屏、轻量 K线观心入口已可见；但整体视觉基线与预期仍明显不一致，首页和多个主入口仍呈现“旧视觉壳 + 局部补丁”的混合感，不能作为 P11 后续真机完整 smoke 的稳定基线。

补充判断：用户追加提供的候选视觉分支列表显示，预期视觉来源并不只限于 `codex/miniapp-kline-training-v2`，还包括 `codex/miniapp-review-mistake-card-p1`、`feature/p1-review-error-type-storage`、`feature/p1-review-error-card`、`feature/miniapp-ui-r1-release-polish` 等历史分支。当前 DevTools 截图看起来仍是旧视觉壳，不像上述分支的整体页面视觉已进入 main。这个问题应定性为“视觉来源错位 / 恢复范围不足”，不是单纯的局部审美问题。

## 是否可以回到 P11-2

不可以。

原因：

1. 首页视觉基线未达到预期，首屏层级重复、卡片过重、信息密度偏高，用户反馈“差的有点多”。
2. 品牌 logo / 印章视觉可见，但整体品牌气质仍未统一到预期的高级东方 AI 修行空间。
3. single-focus 首屏可见，但首页存在“今日心证 / 今日一步 / 当前一步”重复表达，首屏焦点仍被拆散。
4. 轻量 K线观心入口可见。
5. 本轮未提供 K线页截图，无法确认 K线页没有被旧指标系统错误覆盖。
6. 复盘、训练、我的页可见；活镜、训练收藏、执行计划入口未完成截图验收。
7. 截图中未发现用户可见 P0 安全文案；代码扫描命中仅为 intervention-engine 的禁词 guard 和测试。
8. 截图未见白屏、崩溃或无限 loading。
9. 未取得完整 DevTools console 视图，无法确认无阻断级 console error；Codex 通过 DevTools 自动化接口成功执行过 `wx.reLaunch({ url: "/pages/home/index" })` 与 `wx.getSystemInfoSync()`，但锁屏环境限制了完整 UI/console 读取。
10. 当前截图不像候选视觉分支的完整视觉基线，说明 P11-V1 只做了极小范围 A 类搬运，未解决整体页面视觉来源问题。

## 环境信息

- 微信开发者工具版本：`2.01.2510260`（`CFBundleShortVersionString`）
- DevTools AppID：`wx376b5a5fcd86809b`
- 模拟器设备：iPhone 12/13 (Pro)
- 基础库版本：`3.16.1`（DevTools 自动化 `wx.getSystemInfoSync()` 返回）
- 微信版本模拟值：`8.0.5`
- 是否清缓存：未确认；本轮 Codex 未执行 `cli cache --clean ...`
- 是否重新编译：未确认；本轮 Codex 使用 `cli open --project` 与 `cli auto` 打开项目，用户截图来自手动 DevTools 页面浏览
- 测试时间：2026-06-30 12:53 CST 记录；用户截图状态栏时间约 11:54
- 证据来源：
  - `/var/folders/51/zfkk10_d5213mzfgk51f49840000gn/T/codex-clipboard-42febd72-51af-4923-8831-296ed5c22e59.png`
  - `/var/folders/51/zfkk10_d5213mzfgk51f49840000gn/T/codex-clipboard-fbf60399-91a5-4d1a-a919-65c64456cf8e.png`
  - `/var/folders/51/zfkk10_d5213mzfgk51f49840000gn/T/codex-clipboard-ea3891e1-9aa6-45e2-8439-22cef1d352dc.png`
  - `/var/folders/51/zfkk10_d5213mzfgk51f49840000gn/T/codex-clipboard-92ca983e-9490-484a-b5ba-98cebf641b68.png`
  - `/var/folders/51/zfkk10_d5213mzfgk51f49840000gn/T/codex-clipboard-380605b3-12e9-4648-a959-720d8149dff7.png`
  - `/var/folders/51/zfkk10_d5213mzfgk51f49840000gn/T/codex-clipboard-c2502cf5-472d-4fff-9f27-4de7e6f7aeb0.png`
- 候选视觉分支补充来源：
  - `codex/miniapp-review-mistake-card-p1`
  - `feature/p1-review-error-type-storage`
  - `feature/p1-review-error-card`
  - `codex/miniapp-kline-training-v2`
  - `feature/miniapp-ui-r1-release-polish`

## 路径 1：首页

实际结果：

- 页面可打开，无白屏。
- 顶部标题显示“今日心证”。
- 品牌印章 / logo 可见。
- single-focus 首屏可见。
- 主按钮“上传真实记录”可见。
- 轻量“K线观心”入口可见。
- 底部五入口 tab 可见。

问题：

- 首页首屏视觉仍不达标，整体像在旧视觉壳上补了局部品牌元素。
- 首页不像候选视觉分支的完整页面基线，更像当前 main 旧首页结构保留后只补了 logo / seal / single-focus。
- “今日心证”在导航标题、品牌区和卡片标题中重复，焦点被削弱。
- “今日一步 / 当前一步 / 今日只练一件事”层级重复，single-focus 的克制感不足。
- 卡片边框、阴影、金色按钮、底部 tab 的重量偏高，页面显得重和挤。

结论：首页不通过。

## 路径 2：K线页

实际结果：

- 本轮未提供 K线页截图。
- 首页轻量“K线观心”入口可见，但未完成点击进入后的页面截图验收。

结论：

- 不能确认 K线页没有被旧指标系统错误覆盖。
- 不能确认 MA / BOLL / MACD / RSI / KDJ 等旧指标系统未以错误方式回流到当前视觉基线。
- K线页需要补一次单独 DevTools 截图 smoke。

## 路径 3：真实复盘页

实际结果：

- 页面可打开，无白屏。
- 顶部标题显示“真实复盘”。
- 页面可滚动。
- “真实记录闭环”步骤区可见。
- “拍照 / 选择记录”按钮可见。
- “60 秒真实复盘”区可见。
- “在计划内 / 计划外”选择可见。
- “补充锚点 / 生成活镜复盘”底部按钮可见。

问题：

- 页面标题区显示 `LIVE MIRROR · 真实复盘`，真实复盘与活镜语义混在一起，视觉来源仍显混乱。
- 真实复盘页不像 `codex/miniapp-review-mistake-card-p1` / `feature/p1-review-error-card` 预期承接的“错题卡 / mistake card”视觉，而更像旧流程页继续保留。
- 页面信息密度偏高，流程区、表单区和底部 tab 之间留白不足。
- 底部固定操作区与 tab 区视觉距离过近，有被遮挡或压迫的风险。

结论：功能可见，但视觉不通过。

## 路径 4：活镜页

实际结果：

- 本轮未提供活镜页截图。

结论：

- 不能确认活镜页视觉基线。
- 不能确认活镜页是否无白屏、无无限 loading、无阻断级 console error。
- 活镜页需要补一次单独 DevTools 截图 smoke。

## 路径 5：我的页 / 训练收藏 / 执行计划

实际结果：

- “我的”页可打开，无白屏。
- “修行者”资料区可见。
- “闭环心证链”可见。
- “今日训练 / 全年修行 / 七日复测 / 今日三印”统计卡可见。
- 训练页可打开，无白屏。
- 训练页标题“每日修心事上练”可见。
- “7 天交易观心陪跑”可见。

未完成项：

- 未提供训练收藏页截图。
- 未提供执行计划入口 / 执行计划页截图。

问题：

- 我的页顶部 `PROFILE · 我的心镜` 在截图中左侧被裁切，移动端横向安全边距存在风险。
- 我的页卡片和列表视觉仍偏旧后台 / 任务列表，不像最终预期的“心镜”空间。
- 训练页品牌仍显示“阳明训练系统”，与首页恢复后的“今日心证”品牌层次不统一。

结论：我的页和训练页功能可见，但视觉不通过；训练收藏和执行计划未验收。

## 路径 6：安全文案

实际结果：

- 用户提供截图中未看到“建议买入 / 建议卖出 / 目标价 / 买入信号 / 卖出信号 / 预测涨跌 / 收益提升 / 胜率提升”等用户可见 P0 文案。
- 代码扫描命中仅为 `miniprogram/modules/intervention-engine/index.js` 的禁词 guard 和 `index.test.js` 的测试断言，属于内部安全防护，不是本轮新增用户可见 P0。

结论：本轮截图范围内未发现用户可见 P0 安全文案。

## P0 / P1 / P2 问题

### P0

无已确认 P0。

未见：

- 白屏
- 崩溃
- 无限 loading
- 用户可见交易建议 / 买卖信号 / 收益承诺文案

### P1

1. 首页视觉基线不通过：首屏仍像旧视觉壳 + 局部恢复，未达到 P11 期望的整体品牌质感。
2. 视觉来源错位：当前截图不像 `codex/miniapp-review-mistake-card-p1`、`feature/p1-review-error-card`、`feature/miniapp-ui-r1-release-polish` 等候选分支的完整视觉基线。
3. K线页未完成截图 smoke，不能确认旧指标系统没有错误回流。
4. 活镜页未完成截图 smoke，不能确认主入口视觉和运行状态。
5. 训练收藏、执行计划未完成截图 smoke，不能确认 P8/P10/P11 业务入口未丢。

### P2

1. 首页信息层级重复：`今日心证`、`今日一步`、`当前一步`、`今日只练一件事` 互相竞争。
2. 真实复盘页 `LIVE MIRROR · 真实复盘` 语义混杂，页面气质不够统一。
3. 我的页左侧标题被裁切，移动端安全边距需要复查。
4. 训练页品牌命名和首页恢复后的品牌层级不一致。
5. 金色按钮、描边卡片和底部 tab 的视觉重量偏大，整体偏沉重。

## 下一步建议

不通过，必须回到 P11-V1 修复视觉恢复范围。

建议先回 P11-V1 的视觉修复，不进入 P11-2 完整真机 smoke。下一轮不要继续在当前旧壳上“补一块算一块”，应先做一次候选视觉分支再审查，把页面级视觉来源重新定清楚。

下一轮候选视觉源应至少复查：

- `feature/miniapp-ui-r1-release-polish`
- `codex/miniapp-review-mistake-card-p1`
- `feature/p1-review-error-card`
- `feature/p1-review-error-type-storage`
- `codex/miniapp-kline-training-v2`

最小修复页面：

- `miniprogram/pages/home/index.wxml`
- `miniprogram/pages/home/index.wxss`
- `miniprogram/pages/trade-review/index.wxml`
- `miniprogram/pages/trade-review/index.wxss`
- `miniprogram/pages/training/index.wxml`
- `miniprogram/pages/training/index.wxss`
- `miniprogram/pages/profile/index.wxml`
- `miniprogram/pages/profile/index.wxss`

下一轮仍需禁止：

- 覆盖 K线训练 JS / modules
- 覆盖真实复盘 JS / modules
- 改 `app.json`
- 改 `custom-tab-bar`
- 改 API / data-binding
- 引入旧 K线指标系统
- 引入交易建议、买卖信号、收益承诺文案

下一轮 DevTools smoke 必须补齐：

- 首页首屏
- K线观心页
- 真实复盘页顶部和表单区
- 活镜页
- 我的页
- 训练收藏
- 执行计划入口 / 执行计划页
- console 阻断级错误检查
