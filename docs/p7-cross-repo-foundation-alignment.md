# P7-0 跨仓库基础审查

## P7-0 跨仓库基础审查结论

可进入 P7-1。

审查从小程序仓库 `yangming-trading-system-miniprogram` 启动，当前仓库身份匹配，`miniprogram/app.json` 存在。P6 前置分支 `feature/p6-execution-plan-library` 已进入 `origin/main`，ancestor check 返回 `0`。

P7-1 可以开始，但第一步必须先明确 `trainingPack / training_pack` 的 shared contract 和 API 归属，再做网页训练包管理 UI。不能把网页 UI、K线片段服务、抽题引擎、小程序用户入口混在同一分支里。

## 仓库清单

- 小程序仓库：`/Users/jianlinhe/Desktop/yangming-trading-system-miniprogram`
  - 当前分支：`audit/p7-cross-repo-foundation-alignment`
  - 关键能力：`miniprogram/`、`web-next/`、`server/`、`packages/contracts/` 均存在。
  - 当前小程序侧已包含复盘、训练、活镜、今日调度、知行提醒、执行计划库等 P1-P6 闭环字段。

- 网页 / real-review 仓库：`/Users/jianlinhe/Desktop/yangming-trading-system-real-review`
  - 当前分支：`main`
  - 关键能力：`web-next/src/app`、`web-next/src/features/admin`、`web-next/src/features/data-binding`、`web-next/src/features/trade-review`、`server/`、`packages/contracts/`。
  - 适合作为 P7-1 网页训练包管理、P7-2 K线片段标注 UI、P9 网页数据看板的主要落点。

- K线服务仓库 / worktree：`/Users/jianlinhe/Desktop/yangming-trading-system-kline-service`
  - 当前分支：`feature/p2.8-z-server-integration`
  - 关键能力：`server/src/services/historicalKline.js`、`server/src/services/klineCache.js`、`server/src/routes/router.js`、`packages/contracts/kline-history.d.ts`。
  - 已有历史 K线缓存、`/api/v1/kline-history/slice`、`hot-slice`、`hot-pool`、`status` 等服务痕迹。
  - 注意：该 checkout 不在 `main`，P8 依赖其新增能力前必须确认对应服务分支已合并并部署。

- shared/server/contracts 位置：
  - `packages/contracts/data-binding.d.ts`
  - `packages/contracts/kline-history.d.ts`
  - `server/src/services/dataBinding.js`
  - `server/src/routes/router.js`

- 不确定 / 不作为 P7 主落点：
  - `yangming-trading-system-ymty`：偏体验营 / H5 服务内容。
  - `yangming-trading-system-ymty-entry`：偏入口 hotfix。
  - `yangming-trading-system`：当前 checkout 有未提交 `web-next/src/app/trade-review/page.tsx` 改动，不适合作为本次 P7-1 起点。

## 仓库职责分工

- 小程序负责：
  - 用户主闭环入口：今日页、复盘页、训练页、活镜页、我的页。
  - 写入真实复盘、K线训练 session/action、训练错题卡、知行提醒事件、执行计划本地数据。
  - 调用 data-binding / kline-history API 同步和读取共通数据。
  - 不承接网页训练包管理、K线片段标注后台、数据看板后台。

- 网页负责：
  - P7-1 训练包管理。
  - P7-2 K线片段标注 UI。
  - P9 数据看板。
  - 默认执行计划模板、报告后台、提醒规则配置等管理面。
  - 不替代小程序用户主流程，不新增第二套用户闭环。

- kline-server 负责：
  - 原始 K线 bars 缓存、下载、清洗、周期口径和数据源适配。
  - K线片段 slice / segment 的生成、揭示、hot pool 和后续抽题 API。
  - 为小程序和网页提供片段数据，不负责用户真实复盘、活镜统计、执行计划、知行提醒事件。

- shared contracts / data-binding 负责：
  - 约束小程序、网页、server 共享字段。
  - 负责复盘、训练、执行一致性、执行计划、知行提醒等数据同步。
  - P7 起需要补齐 `trainingPack`、P8 起需要补齐 `klineSegment / samplingResult`、P8-3 起需要补齐 `trainingBookmark`。

## 数据共通原则

网站和小程序必须共享复盘、训练、活镜、执行一致性、执行计划、知行提醒等核心数据，但页面入口分工不同：

- 小程序是用户每日闭环和训练承接面。
- 网页是后台管理、标注、配置、看板面。
- kline-server 是 K线数据和抽题服务面。
- 不把网页 UI 混进小程序用户侧分支。
- 不把实盘监控、外部推送、社区、排行榜、预测涨跌混进 P7-P9。
- 不在小程序内重建训练包后台或片段标注后台。

## 数据归属矩阵

| 数据 | 主要写入方 | 主要读取方 | 推荐归属仓库/服务 | 是否需要 packages/contracts | 是否需要 data-binding | 备注 |
|---|---|---|---|---|---|---|
| `realReview` / 真实复盘记录 | 小程序复盘页、网页复盘页 | 今日页、活镜页、网页看板 | data-binding server | 是 | 是 | 已有 `trade-reviews` API，继续兼容 camel/snake 字段。 |
| `mistakeCard` / 错题卡 | 小程序复盘模块、网页复盘模块 | 今日页、训练页、活镜页 | data-binding server | 是 | 是 | 跟随真实复盘记录同步。 |
| `livingMirrorStats` / 活镜统计 | 小程序统计模块、server projection | 小程序活镜、网页看板 | server/data-binding projection | 是 | 是 | 小程序已有近 30 天和本周活镜统计，网页读取聚合结果。 |
| `klineTrainingSession` / K线训练 session | 小程序训练页 | 今日页、训练页、网页看板 | data-binding server | 是 | 是 | 已有 `sourceType/source_type`、`errorType/error_type` 等字段。 |
| `klineTrainingAction` / K线训练 action | 小程序训练页 | 训练结果、活镜、网页看板 | data-binding server | 是 | 是 | 后续可细分 action event，但 P7 不展开。 |
| `trainingMistakeCard` / 训练错题卡 | 小程序训练模块 | 今日页、训练页、活镜页、网页看板 | data-binding server | 是 | 是 | 已有 `trainingMistakeCard/training_mistake_card`。 |
| `executionResult` / 执行结果 | 小程序复盘/训练、网页复盘 | 活镜、今日页、网页看板 | data-binding server | 是 | 是 | 已有 `executionResult/execution_result`，兼容旧 `lawResult`。 |
| `repeatCount` / 旧题复现 | 小程序统计/训练记录 | 活镜、周报、网页看板 | data-binding server | 是 | 是 | 已有 `repeatCount/repeat_count`。 |
| `trainingPack` / 训练包 | 网页 P7-1 管理后台 | 小程序训练页、kline-server 抽题 | web/admin + server API | 是 | 视同步策略需要 | P7-1 首要补 contract/API；小程序只读启用包。 |
| `klineSegment` / K线片段 | kline-server、网页标注 UI | 小程序训练、网页标注/回放 | kline-server | 是 | 可选 | 当前小程序未命中 `segmentId/klineSegment`，是 P7/P8 缺口。 |
| `samplingResult` / 抽题结果 | kline-server | 小程序训练页、网页看板 | kline-server | 是 | 可选 | P8-1 应由服务端生成，记录到训练 session。 |
| `executionPlan` / 执行计划 | 小程序我的页、后续网页模板管理 | 复盘、训练、知行提醒、网页后台 | data-binding server | 是 | 是 | P6 已有本地库和同步字段。 |
| `interventionEvent` / 知行提醒事件 | 小程序今日/训练/复盘 | 小程序、网页看板 | data-binding server | 是 | 是 | P5 已有本地事件和同步字段。 |
| `trainingBookmark` / 训练收藏 | 小程序训练页、后续网页回放 | 小程序训练回放、网页看板 | data-binding + kline-server bars | 是 | 是 | P8-3 新增；收藏记录不保存完整 bars，只保存 `segmentId` 和上下文。 |

## P7-P9 阶段路由

### P7-1 网页训练包管理

- 目标仓库：`yangming-trading-system-real-review`。
- 页面落点：`web-next/src/app/admin` 或 `web-next/src/features/admin` 下新增训练包管理视图。
- API 归属：`server/src/routes/router.js` + 新增或扩展 server service，提供 `trainingPack` CRUD。
- contracts：必须在 `packages/contracts` 增加 `trainingPack / training_pack` 类型。
- 小程序读取：小程序训练页只读取启用训练包，不新增后台入口。
- kline-server 参与：P7-1 不直接参与抽题，只在字段上预留 `sceneTags/errorType/trainingPackId`。

### P7-2 K线片段标注

- UI 落点：网页仓库 `web-next/src/app/admin` / `web-next/src/features/admin`。
- 数据归属：kline-server，负责 `klineSegment`、bars 引用、片段标签、`segmentId`。
- API：需要 kline-server 提供 segment list/create/update/tag 接口，网页只调用。
- contracts：`packages/contracts` 增加 `klineSegment` 与标注字段。
- 小程序：只读 `samplingResult`，不承担标注后台。

### P8-1 K线抽题引擎

- 应在 kline-server 实现。
- 小程序调用 API 获取 `samplingResult`，本地只做 session 写入和 fallback。
- fallback 基础盲练继续保留，使用本地/现有 kline-mind 逻辑。
- session 必须保存 `segmentId/segment_id`、`trainingPackId/training_pack_id`、`fallbackUsed/fallback_used`。

### P8-2 自选盲练

- K线数据来自 kline-server。
- 小程序可缓存最近 slice，但不成为数据源。
- 需要继续隐藏标的和时间，避免变成行情软件。

### P8-3 训练收藏与回放

- 收藏记录归 data-binding。
- 回放 bars 由 kline-server 根据 `segmentId` 或 reveal token 提供。
- 收藏记录只保存用户上下文、训练结果、`segmentId`、`trainingPackId`，不复制完整 K线数据。

### P9 网页数据看板

- 在网页仓库 `web-next` 做看板 UI。
- 读取 data-binding 数据：真实复盘、训练 session、执行一致性、执行计划、知行提醒事件。
- 可读取 kline-server 数据：训练包命中、片段覆盖、抽题质量、segment 使用分布。
- 不做小程序新入口，不做实时交易监控。

## kline-server 专项判断

- kline-server 存在：`/Users/jianlinhe/Desktop/yangming-trading-system-kline-service`。
- 当前能力：
  - `server/src/services/historicalKline.js`：历史 K线下载、缓存、slice、hot pool、symbol/timeframe/startDate/endDate 处理。
  - `server/src/routes/router.js`：`/api/v1/kline-history/catalog`、`instruments`、`rules`、`slice`、`hot-slice`、`hot-pool`、`reveal`、`download`。
  - `packages/contracts/kline-history.d.ts`：已有 K线历史 slice contract。
- 应承担：
  - 原始 K线 bars。
  - K线片段 `klineSegment`。
  - 片段标签 `sceneTags`。
  - `segmentId`。
  - `samplingResult`。
  - 抽题逻辑和 hot pool。
- 可读取：
  - `trainingPack` 的 `errorType/sceneTags/trainingGoal` 作为抽题条件。
- 不应承担：
  - 用户真实复盘。
  - 活镜统计。
  - 执行计划库。
  - 知行提醒事件。
  - 网页后台 UI。

## P7-1 前置条件

- P6 已完成并进入 `origin/main`：已满足。
- web 仓库明确：建议使用 `yangming-trading-system-real-review`。
- trainingPack contract 明确：尚未落文件，P7-1 第一阶段必须补。
- API 归属明确：训练包 CRUD 归 web/server；片段和抽题归 kline-server。
- 小程序读取边界明确：只读启用训练包和抽题结果，不新增管理入口。
- kline-server 依赖边界明确：P7-1 不依赖 kline-server 已完成片段库；P7-2/P8 再接入。

## 风险点

- 多仓库分支混淆：多个 checkout 共享同一个 GitHub origin，且分支状态不同，必须先确认 cwd、branch、baseline。
- 数据契约分裂：小程序已有本地字段，网页和 server 必须通过 `packages/contracts` 收敛。
- kline-server 与 web/server 重复职责：训练包管理归网页/server，片段和抽题归 kline-server，不能互相抢职责。
- 小程序和网页数据不同步：P7-P9 所有新数据必须决定是否进入 data-binding。
- kline-service 当前不在 main：不能默认把 hot-slice/hot-pool 当作生产基线，P8 前必须重新确认合并和部署状态。
- 当前 `yangming-trading-system` checkout 有未提交网页改动，不建议作为 P7-1 开发起点。

## 下一条 Codex 命令建议

建议下一步执行 P7-1：

- 目标仓库：`/Users/jianlinhe/Desktop/yangming-trading-system-real-review`
- 目标分支：`feature/p7-training-pack-management`
- 前置分支：`feature/p6-execution-plan-library` 已进入 `origin/main`
- 第一阶段：先补 `packages/contracts` 的 `trainingPack` 类型与 server API，再接 `web-next` admin 管理 UI。
- 暂不需要先开 kline-server 分支；K线片段标注和抽题服务放到 P7-2 / P8。
