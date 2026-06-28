# P7-0 跨仓库公共接口审查

## P7-0 接口审查结论

需要先补 API 契约。

本次审查从小程序仓库 `yangming-trading-system-miniprogram` 启动，仓库身份匹配，`miniprogram/app.json` 存在。P6 前置分支 `feature/p6-execution-plan-library` 已进入 `origin/main`，ancestor check 返回 `0`。

P7-1 可以开始，但不建议第一步直接做网页 UI。最稳路径是先在网页 / server / contracts 侧补齐 `trainingPack / training_pack` 的 contract 与最小 CRUD API，再接 `web-next` 管理页面。K线片段和抽题接口不要混入 P7-1，应放到 kline-server 相关分支。

## 仓库清单

- 小程序仓库：`/Users/jianlinhe/Desktop/yangming-trading-system-miniprogram`
  - 当前审查分支：`audit/p7-cross-repo-api-contract-audit`
  - 角色：小程序用户闭环和本地状态同步。
  - 已有：`miniprogram/`、`server/`、`packages/contracts/`。

- 网页 / real-review 仓库：`/Users/jianlinhe/Desktop/yangming-trading-system-real-review`
  - 当前分支：`main`
  - 角色：网页管理面、后台、data-binding admin、后续 P7/P9 主要落点。
  - 已有：`web-next/`、`server/`、`packages/contracts/`、`web-next/src/features/admin`。

- K线服务仓库：`/Users/jianlinhe/Desktop/yangming-trading-system-kline-service`
  - 当前分支：`feature/p2.8-z-server-integration`
  - 角色：K线历史数据、slice、hot pool、后续 segment / sampling 服务。
  - 已有：`server/src/services/historicalKline.js`、`server/src/routes/router.js`、`packages/contracts/kline-history.d.ts`。

- shared / contracts 位置：
  - `packages/contracts/data-binding.d.ts`
  - `packages/contracts/kline-history.d.ts`
  - `server/src/services/dataBinding.js`
  - `server/src/routes/router.js`

## 三端职责分工

- 小程序：
  - 写入真实复盘、K线训练 session/action、训练错题卡、执行计划、知行提醒事件。
  - 读取训练包、抽题结果、K线 bars/slice。
  - 不做训练包管理、片段标注后台、网页数据看板。

- 网页：
  - P7-1 训练包管理。
  - P7-2 K线片段标注 UI。
  - P9 数据看板。
  - 通过 shared contracts 和 server API 管理共通数据，不另造小程序用户流程。

- kline-server：
  - 提供历史 K线 bars、slice、hot-slice、hot-pool、reveal。
  - 后续承接 `klineSegment`、`samplingResult`、segment 标签、抽题逻辑。
  - 不负责真实复盘、执行计划、知行提醒事件、活镜业务统计。

- shared contracts / data-binding：
  - 约束跨端字段。
  - 复用已有 data-binding 承接真实复盘、K线训练记录、活镜 summary、执行计划、知行提醒事件。
  - P7 起必须补齐训练包 contract；P8 起补齐 segment / sampling / bookmark contract。

## 现有接口矩阵

| 能力 | 现有接口 | 所在仓库 | 调用方 | 是否可复用 | 缺字段 | 建议动作 |
|---|---|---|---|---|---|---|
| 真实复盘创建 / 查询 | `GET|POST /api/v1/data-binding/users/:user_id/trade-reviews` | miniprogram / real-review server | 小程序复盘、网页后台 | 可复用 | 无明显 P7 阻塞字段 | 继续复用 data-binding。 |
| 错题卡同步 / 查询 | 随 `trade-reviews` 的 `mistakeCard/mistake_card` | data-binding | 小程序、网页看板 | 可复用 | 需要持续兼容 camel/snake | 不新增独立错题卡 API。 |
| 活镜统计查询 | `GET /api/v1/data-binding/users/:user_id/summary`、`trade-reviews` 响应内 stats | data-binding | 小程序、网页后台 | 可复用 | 周期 summary 不够独立 | P9 前再考虑 summary endpoint。 |
| K线训练 session 写入 / 查询 | `POST /api/v1/data-binding/users/:user_id/kline-records`，summary 返回 `kline_records` | data-binding | 小程序训练、网页看板 | 可复用 | `trainingPackId/segmentId` contract 未正式化 | 补字段，不新建重复 session API。 |
| K线训练 action 写入 / 查询 | 当前合并在 kline record / 本地 session records | 小程序 / data-binding | 小程序训练、网页看板 | 部分可复用 | action event 粒度不足 | P8/P9 如需逐步事件再补最小 action contract。 |
| 训练错题卡写入 / 查询 | `trainingMistakeCard/training_mistake_card` 随 kline record | data-binding | 小程序、网页看板 | 可复用 | 无独立查询 | 继续随 kline record 传递。 |
| 执行一致性统计查询 | 小程序模块计算，data-binding summary 有 raw records | 小程序 / data-binding | 活镜、网页看板 | 部分可复用 | server summary 缺统一口径 endpoint | P9 再统一 server summary。 |
| 知行提醒事件写入 / 查询 | `miniprogram-state` 同步 `intervention_event(s)` | miniprogram-state / store | 小程序、后续网页看板 | 可复用 | 独立 event API 暂缺 | P9 可先读 state，必要时再拆 data-binding endpoint。 |
| 执行计划写入 / 查询 | `miniprogram-state` 同步 `execution_plan(s)` | miniprogram-state / store | 小程序、后续网页 | 可复用 | 独立 plan API 暂缺 | P7/P9 暂复用 state；网页模板管理另开 API。 |
| 训练包查询 / 管理 | 小程序本地专项训练配置，无 server CRUD | 小程序模块 | 小程序训练页 | 不足 | 缺 `trainingPack` contract、GET/POST/PATCH | P7-1 先补 Training Pack API。 |
| K线 bars 查询 | `GET /api/v1/kline-history/slice`、`catalog`、`instruments`、`rules`、`reveal` | kline-service / server | 小程序训练、网页预览 | 可复用 | 仅 slice，不是可标注 segment | P7-2 前补 segment API。 |
| K线片段查询 / 标注 | 无正式 `kline-segments` API | kline-service 待补 | 网页标注、小程序只读结果 | 不可直接复用 | `segmentId`、标签、enabled、pack 关联 | P7-2 先做 kline-server segment API。 |
| K线抽题 sampling | 有 `hot-slice/hot-pool`，无 `/kline-training/sample` | kline-service | 小程序训练 | 部分可复用 | 缺按 `error_type/scene_tags/training_pack_id` 抽题 | P8-1 在 kline-server 包装 sampling API。 |
| 训练收藏写入 / 查询 | 无正式 `trainingBookmark/training_bookmark` API | 待补 | 小程序训练、网页回放 | 不可直接复用 | bookmark contract、segment 引用 | P8-3 走 data-binding bookmark + kline-server bars 回放。 |

## 关键 API 契约建议

### A. Training Pack API

用途：网页管理，小程序读取，kline-server 可引用 `error_type/scene_tags`。

建议 endpoint：

- `GET /api/training-packs`
- `POST /api/training-packs`
- `PATCH /api/training-packs/:id`
- `PATCH /api/training-packs/:id/enabled`

建议字段：

- `id`
- `title`
- `error_type`
- `scene_tags`
- `training_goal`
- `expected_action`
- `training_prescription`
- `difficulty`
- `enabled`
- `created_at`
- `updated_at`

现状判断：没有发现等价 server CRUD。小程序已有本地专项训练配置和 `trainingPackId/training_pack_id` 字段，但这不是网页可管理的公共接口。

建议落点：`yangming-trading-system-real-review` 的 `server/` + `packages/contracts`。P7-1 第一阶段先补 contract/API，再做 `web-next` admin UI。

### B. Kline Segment API

用途：网页标注，kline-server 保存，抽题使用，小程序只读抽题结果。

建议 endpoint：

- `GET /api/kline-segments`
- `POST /api/kline-segments`
- `PATCH /api/kline-segments/:id`
- `PATCH /api/kline-segments/:id/enabled`

建议字段：

- `id`
- `symbol`
- `period`
- `start_date`
- `end_date`
- `scene_tags`
- `error_types`
- `training_pack_ids`
- `difficulty`
- `enabled`
- `source_slice_id`

现状判断：kline-service 已有历史 K线 `slice/hot-slice/hot-pool/reveal`，但没有正式 `klineSegment` 标注 CRUD。

建议落点：kline-server。网页只做标注 UI 和 API 调用，不在 real-review server 复制 K线片段数据源。

### C. Sampling API

用途：小程序今日针对训练 / 专项训练向 kline-server 请求训练片段。

建议 endpoint：

- `POST /api/kline-training/sample`

输入：

- `error_type`
- `scene_tags`
- `training_pack_id`
- `difficulty`
- `user_id`，可选

输出：

- `segment_id`
- `training_pack_id`
- `symbol`
- `period`
- `bars`
- `scene_tags`
- `fallback_used`

现状判断：kline-service 有 `hot-slice/hot-pool`，可作为 sampling 的底层能力，但没有按训练包、错题类型、场景标签抽题的稳定 API。

建议落点：kline-server。P8-1 实现，失败时小程序继续 fallback 到基础盲练 / 本地 slice。

### D. Training Session API

用途：小程序写入，网页看板读取。

建议 endpoint：

- `POST /api/v1/data-binding/users/:user_id/kline-records`
- `GET /api/v1/data-binding/users/:user_id/summary`

字段：

- `session_id`
- `source_type`
- `error_type`
- `training_pack_id`
- `segment_id`
- `execution_result`
- `repeat_count`
- `training_mistake_card`

现状判断：data-binding 已承接 kline records，优先复用，不新建重复 `kline-training/sessions` API。缺口是 `training_pack_id/segment_id/sampling_result/fallback_used` 需要进入 contract 和 server normalize。

### E. Living Mirror API

用途：小程序和网页查询统一活镜统计。

建议 endpoint：

- `GET /api/living-mirror/summary?range=30d`
- `GET /api/living-mirror/weekly`

现状判断：当前主要由小程序前端统计和 data-binding summary/raw records 支撑。server 有 `GET /api/v1/data-binding/users/:user_id/summary`，但没有独立 living-mirror summary/weekly endpoint。

建议：P7/P8 阶段继续复用前端统计 + data-binding summary；P9 做网页数据看板时再把统计口径收敛为 server summary endpoint。

## 接口复用策略

- 直接复用：
  - `GET|POST /api/v1/data-binding/users/:user_id/trade-reviews`
  - `POST /api/v1/data-binding/users/:user_id/kline-records`
  - `GET /api/v1/data-binding/users/:user_id/summary`
  - `GET|POST /api/v1/data-binding/users/:user_id/training-prescription`
  - `GET /api/v1/kline-history/slice`
  - `GET /api/v1/kline-history/catalog`
  - `GET /api/v1/kline-history/instruments`
  - `GET /api/v1/kline-history/reveal`

- 补字段兼容：
  - kline records 补 `training_pack_id`、`segment_id`、`sampling_result`、`fallback_used`。
  - contracts 补 `trainingPack`、`klineSegment`、`samplingResult`、`trainingBookmark`。

- adapter 包装：
  - kline-service 的 `hot-slice/hot-pool` 可包装为 P8 的 `POST /api/kline-training/sample`。
  - 小程序旧本地专项训练配置可包装为 Training Pack API 初始 seed。

- 需要新增最小 endpoint：
  - Training Pack CRUD：P7-1。
  - Kline Segment CRUD：P7-2。
  - Kline Sampling：P8-1。
  - Training Bookmark：P8-3。

## P7-P9 路线建议

### P7-1 网页训练包管理

- 是否可直接使用已有接口：不可以；只有小程序本地训练包配置，没有公共管理 API。
- 先做：Training Pack contract + server CRUD API。
- 目标仓库：`yangming-trading-system-real-review`。
- 小程序读取：后续从 `GET /api/training-packs` 读取 enabled 包，保留本地默认包作为 fallback。

### P7-2 K线片段标注

- 是否已有 kline-server segment 接口：没有正式 CRUD。
- 先做：kline-server `klineSegment` contract/API。
- 目标仓库：`yangming-trading-system-kline-service`。
- 网页：只做标注 UI，不复制 K线数据源。

### P8-1 抽题引擎

- 是否已有 sampling API：没有；已有 `hot-slice/hot-pool` 可作为底层抽片能力。
- 先做：kline-server `POST /api/kline-training/sample`。
- 小程序：调用 API，失败时 fallback 到基础盲练 / 现有 kline-history slice。

### P8-2 自选盲练

- K线数据来自 kline-server。
- 小程序可缓存 slice，但不成为源数据服务。
- 继续保留匿名化和合规边界，不暴露为行情软件。

### P8-3 训练收藏与回放

- 收藏记录走 data-binding。
- 回放 bars 由 kline-server 根据 `segment_id` / reveal token 提供。
- 新增 `trainingBookmark/training_bookmark` contract，不保存完整 bars。

### P9 网页数据看板

- 已有 data-binding 查询接口，可作为第一版数据源。
- 需要新增 server summary API 时，优先从真实复盘、kline records、intervention events、execution plans 计算。
- 不读小程序本地缓存作为网页看板来源。

## P7-1 前置条件

- P6 是否必须完成：必须。当前已完成并进入 `origin/main`。
- Training Pack API 是否已有：未发现等价公共 CRUD。
- 如果没有，是否先做 API 契约分支：是。P7-1 第一阶段应先补 `trainingPack` contract/API，再做 UI。
- 目标仓库：`/Users/jianlinhe/Desktop/yangming-trading-system-real-review`。
- 目标分支建议：`feature/p7-training-pack-management`。

## 风险点

- 三边接口重复：小程序、real-review server、kline-server 都有部分 K线能力，必须明确训练包归网页/server，片段和抽题归 kline-server。
- 小程序和网页数据不同步：小程序本地训练包配置不能长期作为唯一来源，P7-1 后应读取公共 enabled packs。
- kline-server 与 real-review server 职责重叠：real-review 不应保存原始 bars 或片段源数据。
- contracts 分裂：新增接口前必须先补 `packages/contracts`，避免 camel/snake 和字段名继续漂移。
- 旧接口未复用导致重复建设：K线训练 session 应继续走 data-binding kline-records，不新建并行 session API。
