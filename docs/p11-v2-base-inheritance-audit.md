# P11 V2 小程序基座继承审查

## 结论

当前 `main` 还没有完全继承用户认可的 V2 小程序基座。

用户认可的预览基座在：

- `fix/p11-true-kline-v2-base-integration`
- commit: `f704ed88`

当前 `origin/main` 在：

- `061920a2`

`fix/p11-true-kline-v2-base-integration` 尚未进入 `origin/main`：

```bash
git merge-base --is-ancestor fix/p11-true-kline-v2-base-integration origin/main
# result: 1
```

因此，DevTools 切回 `main` 后页面回到旧状态是预期现象，不是缓存误判。

## 为什么不能整包 merge

候选基座与 `origin/main` 的差异过大：

```text
603 files changed, 37128 insertions(+), 268636 deletions(-)
```

分叉关系：

```text
origin/main...fix/p11-true-kline-v2-base-integration = 213 / 46
merge-base = bcbe0669
```

整包 merge 会同时卷入：

- `docs/`
- `web-next/`
- `server/`
- `packages/`
- `miniprogram/app.json`
- `miniprogram/custom-tab-bar/`
- `miniprogram/utils/api.js`
- `miniprogram/utils/data-binding-adapter.js`
- 大量历史资产删除

结论：禁止整包 merge。必须按页面和模块分层迁移。

## 候选基座中值得继承的能力

### K 线训练

`fix/p11-true-kline-v2-base-integration` 中存在用户记得的 V2 K 线能力：

- 长线 / 中线 / 短线
- MA / BOLL
- MACD / RSI / KDJ
- `runtimeView`
- 历史 candles
- zoom / pan
- 逐根盲练
- `loadServerHistorySlice`
- 不展示占位 K 线

这部分是 V2 体验基座的核心，但属于 B 类迁移，不能只靠 WXML/WXSS 搬回。

### 真实复盘

候选基座中复盘页更接近“小闭环”：

- 上传 / 选择记录
- 第一念
- 下一次动作
- 生成活镜复盘
- 写入活镜
- 复盘后进入 K 线训练

但候选基座中也有需要继续收口的内容：

- 复盘页仍需防止变成宽泛交易管理表单
- `60 秒真实复盘`、补充项、市场锚点需要按真实复盘错题卡边界再收紧
- `fetchTradeReviewMarketContext` / `buildTradeReviewUrl` 等 API helper 不能脱离主线能力直接搬

### 今日 / 训练 / 活镜 / 我的

候选基座的整体体验比当前 `main` 更接近用户期望：

- 更强的东方暗色训练空间
- 今日 / 复盘 / 训练 / 活镜 / 我的五入口闭环更明显
- 训练页有“每日修心事上练”的整体气质
- profile / 我的页更像修行档案

这些可作为页面体验基座，但不能覆盖 `main` 中后续业务闭环。

## 当前 main 必须保护的闭环

后续集成分支不得回退或删除以下能力：

- `miniprogram/modules/intervention-engine/**`
- `miniprogram/modules/zhixing-reminder/**`
- `miniprogram/modules/execution-plan/**`
- `miniprogram/pages/execution-plan/**`
- `miniprogram/pages/training-bookmarks/**`
- `miniprogram/utils/api.js`
- `miniprogram/utils/data-binding-adapter.js`
- `miniprogram/utils/store.js`

必须保护的业务字段 / 语义：

- `review_focus`
- `special_training`
- `custom_session`
- `samplingResult`
- `trainingBookmark`
- `fallbackUsed`
- `after_review`
- `repeated_mistake`
- `interventionEvent`
- `executionPlan`
- `dashboard-summary`
- `dashboard-weekly`

## A / B / C / D 继承矩阵

### A：可直接继承或窄迁移

- 首页 / 训练 / 活镜 / 我的的视觉气质与页面层级
- 复盘页小闭环的用户路径表达
- K 线页的视觉方向与“长 / 中 / 短线”训练语义
- 品牌页壳、留白、卡片层次

要求：只搬 WXML/WXSS 或极小 JS 入口适配，不覆盖主线业务模块。

### B：需要单独迁移

- K 线真实图表运行层
- `runtimeView`
- MA / BOLL / MACD / RSI / KDJ
- zoom / pan
- 逐根盲练
- 历史 candles 数据接入
- `loadServerHistorySlice`
- K 线训练与 `review_focus / special_training / custom_session` 的融合
- 复盘页 API helper 与主线 data-binding 的统一

这些需要单独实现和测试，不能混在纯视觉恢复里。

### C：不搬

- 整包 `web-next/`
- 整包 `server/`
- 整包 `packages/`
- 整包 `docs/` 历史删除
- 整包 `app.json` 覆盖
- 整包 `custom-tab-bar` 覆盖
- 旧的宽泛市场入口：美股 / 期货 / 数字货币
- 旧的交易管理式复盘表单
- 任何用户可见投资建议、买卖信号、行情预测文案

### D：待单独审查

- 是否引入 `pages/h5-bridge`
- 是否恢复 custom tab bar
- 复盘详情 / 训练收藏 / 执行计划页的视觉微调
- `utils/api.js` 中候选基座新增 helper 是否应合并到当前主线
- `kline-simulator` 中保留旧市场 preset 的必要性

## 推荐集成路线

### P11-B0：基座继承审查

本报告即 P11-B0。目标是确认：

- V2 基座在哪
- 为什么 main 不是它
- 为什么不能整包合并
- 哪些能继承
- 哪些必须保护
- 哪些要拆到 K 线专项

### P11-B1：小程序体验基座集成

新建干净分支，建议：

```text
fix/p11-v2-miniapp-base-controlled-integration
```

允许范围：

- `miniprogram/pages/home/**`
- `miniprogram/pages/training/**`
- `miniprogram/pages/trade-review/**`
- `miniprogram/pages/living-mirror/**`
- `miniprogram/pages/profile/**`
- 必要的 `miniprogram/app.wxss`
- 必要测试

禁止范围：

- 不整包 merge `fix/p11-true-kline-v2-base-integration`
- 不整包改 `app.json`
- 不整包改 `custom-tab-bar`
- 不覆盖 `utils/api.js`
- 不覆盖 `data-binding-adapter.js`
- 不覆盖 `store.js`
- 不覆盖 intervention / reminder / execution plan / training bookmarks

目标：

- 让 `main` 页面体验回到用户认可的 V2 气质
- 保留 P8/P10/P11 业务闭环
- 不在本分支实现完整 K 线指标系统

### P11-K0：K 线真实图表继承审查

单独审查：

- 长 / 中 / 短线
- MA / BOLL / MACD / RSI / KDJ
- zoom / pan
- runtimeView
- 逐根盲练
- `/api/v1/kline-history/slice`
- candles 数量和窗口语义

### P11-K1：K 线真实图表运行层恢复

在 P11-K0 之后单独实现，目标是接近真实行情软件的 K 线图表底座，但仍保持本产品“不荐股、不预测、不喊单”的训练边界。

## 当前判断

可以继续，但不能继续在 `main` 上直接验视觉，也不能继续零碎补 UI。

下一步应进入：

```text
P11-B1 小程序 V2 基座受控集成
```

完成 P11-B1 后，再进入：

```text
P11-K0 / P11-K1 K 线真实图表专项
```
