# P9 心镜数据中枢架构审查

审查时间：2026-06-29

审查基线：

- 仓库：`yangming-trading-system-real-review`
- 基线：最新 `origin/main`
- 当前基线提交：`71c34ff Merge branch 'feature/p8-miniapp-training-bookmarks-ui'`
- 本报告只做架构审查，不新增页面、API、contracts 或业务逻辑。

## P9 心镜数据中枢架构审查结论

结论：暂不可直接进入完整 P9 实现。

可以进入的最小下一步：

- 可以先做 `P9-0C` API / contract 预备设计分支，只补统一 contract 与服务边界方案。
- 可以做不依赖训练收藏闭环的 P9 子集审查或只读原型。

暂不建议直接进入：

- 不建议直接做完整 `/dashboard` 页面。
- 不建议直接把 `data-binding summary` 原始数据塞到数据看板。
- 不建议新建第二套 archive / dashboard / growth 页面体系。

原因：

- P8-3B 小程序训练收藏 UI 已进入 `origin/main`，但本次只读检查未发现 `audit/p8-3*` smoke 分支；完整 P9 实现前仍建议先做 P8-3C 跨端训练收藏 smoke。
- 当前已有 `/living-mirror-center`、`/mirror-archive`、`/living-mirror-growth` 三条线，P9 应收束和升级它们，而不是重新造一套入口。
- 当前已有 `DataBindingUserSummaryResponse`、`MirrorArchive`、`LivingMirrorGrowthProjection`，但还缺面向 P9 的 `ArchiveIndex`、`DashboardSummary`、`WeeklyMirrorSummary` 等稳定 contract。

## P9 命名

建议正式命名为：P9 心镜数据中枢。

说明：

- 继续叫“网页数据看板”会过窄，只覆盖指标层。
- 现有产品已经同时存在档案证据、数据总览、成长谱叙事三类资产。
- “心镜数据中枢”能统一 Archive / Dashboard / Growth Map，避免 `/mirror-archive`、`/mind-archive`、`/observing-archive`、`/living-mirror-center` 各说各话。

建议对外/用户可见：

- 总入口：心镜数据中枢
- 证据层：心镜档案馆
- 分析层：数据看板
- 叙事层：心镜成长谱

## 三层结构

### P9A 档案馆 / Archive

定位：证据层。

负责收纳和索引：

- 真实复盘
- 错题卡
- K线训练记录
- 训练收藏
- 知行提醒事件
- 执行计划
- 心证
- 一念记录
- 心镜报告
- 复测变化

边界：

- 档案馆不直接计算趋势指标。
- 档案馆不生成新训练建议。
- 档案馆只负责“证据可查、可筛、可追溯”。

### P9B 数据看板 / Dashboard

定位：分析层。

负责聚合：

- 真实复盘次数
- K线训练次数
- 执行一致率
- 旧题复现
- 最高频错题
- 最常见第一念
- 触发场景
- 训练包完成情况
- K线片段使用情况
- 知行提醒效果
- 训练收藏趋势

边界：

- Dashboard 不应直接读取 raw summary 后在页面里散算所有指标。
- Dashboard 应由 server summary contract 固定口径。
- Dashboard 只展示行为训练与复盘趋势，不输出投资建议、行情预测或交易信号。

### P9C 心镜成长谱 / Growth Map

定位：成长叙事层。

负责呈现：

- 成长阶段
- 旧题下降
- 执行稳定性提升
- 错题迁移
- 训练处方演进
- 下一轮重点
- 长期成长轨迹

边界：

- P9C 优先复用现有 `LivingMirrorGrowthProjection`。
- H5 本地 `recomputeAndSaveGrowthProfile()` 只能保留为 fallback，不能长期作为事实源。
- 成长谱不承担 archive 搜索，也不承担 dashboard 全量趋势分析。

## 现有页面盘点

| 当前页面 | 当前作用 | 数据来源 | 建议归属 | 建议动作 |
|---|---|---|---|---|
| `/living-mirror-center` | “活镜中枢 · 跨端总览”，展示测评、盲练、真实复盘、活镜画像、助教摘要、训练处方下发 | `fetchDataBindingSummary()`，`dispatchTrainingPrescriptionBinding()` | P9 总入口 + P9B 数据看板雏形 | 保留并升级 |
| `/living-mirror-growth` | “活镜成长谱”，展示阶段、高频一念、重复行为、影响维度、下一轮重点 | 优先 `fetchLivingMirrorGrowthProjection(userId)`，失败回退 `recomputeAndSaveGrowthProfile()` | P9C 心镜成长谱 | 保留并升级 |
| `/mirror-archive` | “心镜档案 · 归档中心”，汇总报告、成长谱、循环识别、复盘、心证、一念、复测 | 当前主要 `loadMirrorArchiveData()` + 本地 growth engine | P9A 档案馆 | 保留并升级 |
| `/mind-archive` | 旧的一念/心贼/守则提醒档案入口，使用本地 mind-archive lib | 本地 archive stats、trade-review repository、rule guard | P9A 历史入口 | 标记为历史入口 |
| `/observing-archive` | 观察档案，混合本地 assessment storage 和远端 data-binding summary | local storage + `fetchDataBindingSummary()` | P9A/P9B 过渡页 | 合并到某模块 |
| `/archive` | alias，目前重定向到 `/mind-archive` | 无直接数据 | P9A 入口别名 | 收束为入口 |
| `/me/archive` | alias，目前重定向到 `/mind-archive` | 无直接数据 | P9A 入口别名 | 收束为入口 |
| `/admin/training-packs` | 训练包管理，供小程序训练和后续看板统计使用 | Training Pack API | P7 管理面，P9 元数据来源 | 不动 |
| `/admin/kline-segments` | K线片段标注，供 sampling 和后续看板统计使用 | KlineSegment API | P7/P8 管理面，P9 元数据来源 | 不动 |
| `/admin` | 后台总览和管理入口 | admin data + data-binding 能力 | 后台入口 | 不动 |

补充判断：

- 当前没有正式 `/dashboard` 页面。
- 当前有 `/living-mirror-center`，它已经承担“跨端总览”的产品语义，后续不应另起一个完全平行的 dashboard shell。
- `/mirror-archive` 比 `/mind-archive` 更接近正式“心镜档案馆”；`/mind-archive` 更像早期一念档案/心贼档案入口。

## 现有 API / contracts 盘点

### 可直接复用

| 能力 | 现有位置 | 复用方式 |
|---|---|---|
| data-binding 用户 summary | `GET /api/v1/data-binding/users/:user_id/summary` | 作为 P9A/P9B/P9C 的 raw evidence 输入，不直接当最终 dashboard contract |
| 真实复盘 | `GET|POST /api/v1/data-binding/users/:user_id/trade-reviews` | P9A Archive 证据项，P9B 复盘次数/触发场景来源 |
| K线训练记录 | `POST /api/v1/data-binding/users/:user_id/kline-records`，summary 返回 `kline_records` | P9A Archive 证据项，P9B 训练次数/片段使用来源 |
| 训练收藏 | `GET|POST /api/v1/data-binding/users/:user_id/training-bookmarks`，`PATCH|DELETE /training-bookmarks/:id` | P9A 收藏档案，P9B 收藏趋势来源 |
| Training Pack | `GET|POST /api/v1/training-packs` 等 | P9B 训练包完成情况和错题分类元数据 |
| KlineSegment | `GET|POST /api/v1/kline-segments` 等 | P9B K线片段使用情况和场景标签元数据 |
| 活镜成长投影 | `GET /api/v1/users/:user_id/living-mirror/growth` | P9C Growth Map 主事实源 |
| MirrorArchive 类型 | `packages/contracts/living-mirror.d.ts` | 可作为 P9A 早期 archive payload 基础 |
| LivingMirrorGrowthProjection 类型 | `packages/contracts/living-mirror.d.ts` | P9C 继续复用 |
| DataBindingUserSummaryResponse 类型 | `packages/contracts/data-binding.d.ts` | P9A/P9B 聚合输入 |

### 需补字段或 adapter

| 能力 | 当前缺口 | 建议 |
|---|---|---|
| Archive index | `mirror_archive` 是汇总对象，不是可分页、可筛选的索引 | 补 `ArchiveIndex` / `ArchiveItem` contract |
| Dashboard summary | summary 有 raw records，但没有 dashboard 指标口径 | 补 `DashboardSummary` contract 和 server 聚合 |
| Weekly summary | 缺周报/本周活镜统一口径 | 补 `WeeklyMirrorSummary` |
| executionPlan | P7 报告显示当前多在 miniprogram-state / store，缺独立 server API | P9 前先决定是否进入 data-binding |
| interventionEvent | P7 报告显示当前多在 miniprogram-state / store，缺独立 server API | P9 前先决定是否进入 data-binding |
| dashboard range | 现有 summary 不带统一 range/window | P9B summary 支持 `range=7d/30d/90d` |
| archive source type | 多个页面各自定义 archive item | 统一 `sourceType`、`sourceId`、`occurredAt`、`title`、`summary` |

### 需新增

| 类型/API | 必要性 | 说明 |
|---|---|---|
| `ArchiveIndex` | 必要 | 档案馆需要索引，不应每页自行拼本地 archive card |
| `ArchiveItem` | 必要 | 统一复盘、训练、收藏、心证、报告、复测等证据项 |
| `DashboardSummary` | 必要 | 防止页面散算指标和口径漂移 |
| `WeeklyMirrorSummary` | 建议 | 支撑本周活镜/周报，不强行塞进 dashboard summary |
| `TrainingBookmarkSummary` | 建议 | 支撑收藏趋势和回放入口 |
| `InterventionEventSummary` | 待 P8/P9 决策 | 取决于知行提醒事件是否先进入 data-binding |
| `ExecutionPlanSummary` | 待 P8/P9 决策 | 取决于执行计划是否先进入 data-binding |
| `GrowthMapSummary` | 可后置 | 若 `LivingMirrorGrowthProjection` 足够，可先不新增 |

### 不应新增

- 不应新建第二套用户数据 API。
- 不应在 real-review server 之外再造独立 archive store。
- 不应让 `/living-mirror-growth`、`/mirror-archive`、`/living-mirror-center` 各自新增私有 summary API。
- 不应把 kline-service 的 bars/sampling API 复制进 real-review。

## P9 API / contract 方案

### Contracts

建议放在 `packages/contracts`，保持 Web、小程序、server 共用。

#### `ArchiveIndex`

用途：档案馆索引响应。

建议字段：

- `schemaVersion`
- `userId`
- `range`
- `items`
- `sourceSummary`
- `filters`
- `updatedAt`
- `complianceNotice`

#### `ArchiveItem`

用途：统一证据项。

建议字段：

- `id`
- `sourceType`
- `sourceId`
- `title`
- `summary`
- `occurredAt`
- `tags`
- `mirror`
- `errorType`
- `sceneTags`
- `trainingPackId`
- `segmentId`
- `bookmarkId`
- `linkedUserAction`
- `detailPath`

#### `DashboardSummary`

用途：数据看板主响应。

建议字段：

- `schemaVersion`
- `userId`
- `range`
- `realReviewCount`
- `klineTrainingCount`
- `trainingBookmarkCount`
- `executionConsistency`
- `oldPatternRepeatCount`
- `topErrorTypes`
- `topFirstThoughts`
- `topSceneTags`
- `trainingPackProgress`
- `klineSegmentUsage`
- `interventionEffect`
- `trend`
- `dataGaps`
- `updatedAt`
- `complianceNotice`

#### `WeeklyMirrorSummary`

用途：本周活镜 / 周报。

建议字段：

- `weekStart`
- `weekEnd`
- `reviewCount`
- `trainingCount`
- `bookmarkCount`
- `mainMirror`
- `dominantErrorType`
- `improvedBehavior`
- `repeatedPattern`
- `nextWeekFocus`
- `dataGaps`

#### `GrowthMapSummary`

建议：先不强制新增，优先复用 `LivingMirrorGrowthProjection`。

只有当 P9C 页面需要更轻的列表/卡片摘要时，再补 `GrowthMapSummary`。

### API

#### P9A Archive

推荐优先使用 user-scoped data-binding 风格：

- `GET /api/v1/data-binding/users/:user_id/mirror-archive`
- `GET /api/v1/data-binding/users/:user_id/mirror-archive/:item_id`

说明：

- 当前 `GET /api/v1/data-binding/users/:user_id/summary` 已返回 `mirror_archive`，但它不是可筛选、可分页的 archive index。
- 不建议第一步新增全局 `GET /api/v1/mirror-archive`，以免与用户维度、后台维度混淆。
- 如果后续 admin 需要跨用户档案索引，再另设 admin scoped API。

#### P9B Dashboard

推荐：

- `GET /api/v1/data-binding/users/:user_id/dashboard/summary?range=30d`
- `GET /api/v1/data-binding/users/:user_id/dashboard/trends?range=90d`
- `GET /api/v1/data-binding/users/:user_id/dashboard/weekly`

说明：

- 这些 API 由 data-binding summary、training bookmarks、training packs、kline segments、growth projection 聚合而来。
- 页面只消费聚合结果，不在页面里重复算指标。

#### P9C Growth Map

推荐继续复用：

- `GET /api/v1/users/:user_id/living-mirror/growth`

暂不建议立刻新增：

- `POST /api/v1/living-mirror-growth/recompute`

说明：

- 当前 H5 已有 server projection 读取和本地 fallback。
- recompute 如果要做，应放在后续 admin-only 或 dry-run 任务里，不作为 P9C 首轮必需能力。

## 实施顺序

推荐采用方案 C：先 contract/API 预备，再分模块开发。

建议顺序：

1. `P8-3C` 跨端训练收藏 smoke：确认小程序收藏、data-binding、summary、H5 后续读取链路不丢字段。
2. `P9-0C` 心镜数据中枢 contract/API 预备：只补 `ArchiveIndex`、`ArchiveItem`、`DashboardSummary`、`WeeklyMirrorSummary` 等 contract 和接口设计，不做页面。
3. `P9A` 档案馆收束：把 `/mirror-archive` 升级为正式 Archive，`/archive`、`/me/archive`、`/mind-archive` 收束为入口或历史入口。
4. `P9B` DashboardSummary API：新增 user-scoped dashboard summary/trends/weekly 聚合，`/living-mirror-center` 读取统一 summary。
5. `P9C` 成长谱统一：继续复用 `LivingMirrorGrowthProjection`，将本地 growth engine 降级为 fallback，而不是主要计算事实源。

不建议顺序：

- 不建议先做大 UI。
- 不建议先新建 `/dashboard` 再反向找数据源。
- 不建议先删除历史 archive 页面。

## P8-3 依赖判断

| 问题 | 判断 |
|---|---|
| P8-3B 未完成时，P9A 是否可做？ | 只能做不含训练收藏的 Archive 子集；完整 P9A 不建议做。 |
| P8-3B 未完成时，P9B 是否可做？ | 只能做不含收藏趋势的 Dashboard 子集；完整 P9B 不建议做。 |
| P8-3B 未完成时，P9C 是否可做？ | 可继续做现有 Growth Projection 相关收束，但不能把训练收藏作为证据源。 |
| 是否必须先做 P8-3C？ | 完整 P9 实现前建议必须先做；否则 archive/dashboard 的训练收藏口径没有跨端 smoke 证据。 |
| 是否可以先做不依赖 trainingBookmark 的 dashboard 子集？ | 可以，但必须明确标记为子集，不要宣称 P9 完整闭环已完成。 |

本次实际只读结果：

- 小程序 `feature/p8-miniapp-training-bookmarks-ui` 对 `origin/main` ancestor check 为 `0`，说明 P8-3B 已进入小程序主线。
- 未发现本地或远端 `audit/p8-3*` smoke 分支。
- 因此：P9-0B 可以完成；P9 完整实现不应开始，除非先完成 P8-3C 或明确只做不依赖训练收藏的子集。

## 下一条 Codex 命令建议

推荐下一步：

`P8-3C 跨端训练收藏 smoke`

目标：

- 小程序训练收藏 UI 写入收藏。
- real-review data-binding 收到 `training_bookmarks`。
- summary 返回收藏数据。
- `samplingResult` metadata 保留，`bars` 不落库。
- 旧记录/空收藏 fallback 正常。

如果用户决定先推进 P9 子集，则下一条应是：

`P9-0C 心镜数据中枢 contract/API 预备`

边界：

- 只补 contracts 和 server API 设计/最小接口。
- 不做页面。
- 不重做 archive/growth UI。

## 风险点

1. 重复已有页面
   - 风险：再新建 `/dashboard`、新 archive 或新 growth 页面，会和 `/living-mirror-center`、`/mirror-archive`、`/living-mirror-growth` 平行。
   - 规避：先收束现有页面，再决定是否需要 alias。

2. archive / dashboard / growth 混乱
   - 风险：档案馆开始算趋势，看板开始展示原始记录，成长谱开始承担搜索。
   - 规避：Archive 是证据层，Dashboard 是分析层，Growth Map 是成长叙事层。

3. summary API 口径不统一
   - 风险：页面、server、小程序各自计算执行一致率、旧题复现、最高频错题。
   - 规避：P9B 必须新增统一 `DashboardSummary` 口径。

4. data-binding 原始汇总直接当看板
   - 风险：`getDataBindingUserSummary()` 当前返回 raw records 和 archive 汇总，适合作输入，不适合作最终 dashboard response。
   - 规避：新增 summary adapter/service，页面只消费稳定指标。

5. P8-3 收藏链路未完成导致 P9 缺数据
   - 风险：训练收藏趋势、回放入口、收藏证据项无法确认。
   - 规避：先做 P8-3C 跨端 smoke，再做完整 P9A/P9B。

6. H5 fallback 和 server projection 分裂
   - 风险：`/living-mirror-growth` 本地 fallback 计算结果与 server projection 语义漂移。
   - 规避：P9C 保留 fallback 但以 server projection 为主；字段变更先改 contract/adapter。

7. 敏感数据与合规表达风险
   - 风险：档案和看板容易暴露手机号、原始记录、或产生交易建议式表达。
   - 规避：Archive/Dashboard contracts 默认只返回脱敏字段；所有表达限定为照见、复盘、训练、风险教育。

## 最终建议

P9 方向应升级为“心镜数据中枢”，但当前不要直接开发完整 P9。

最小安全路线：

1. 完成 P8-3C smoke。
2. 做 P9-0C contracts/API 预备。
3. 先收束 P9A Archive。
4. 再做 P9B Dashboard summary。
5. 最后让 P9C Growth Map 统一读取 server projection。
