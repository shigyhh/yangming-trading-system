# P9C-1 心镜成长谱数据源审查

## P9C-1 心镜成长谱数据源审查结论

结论：可进入 P9C-2，但 P9C-2 应先做 `/living-mirror-growth` 的数据源收束与 fallback 标识，不应重做页面，也不应新增平行成长谱页面。

当前仓库已经具备 P9C 的核心基础：

- 页面：`web-next/src/app/living-mirror-growth/page.tsx`
- 本地 engine：`web-next/src/features/living-mirror-growth/growthProfileEngine.ts`
- 本地 storage/fallback：`web-next/src/features/living-mirror-growth/growthProfileStorage.ts`
- contract：`packages/contracts/living-mirror.d.ts` 中的 `LivingMirrorGrowthProjection`
- H5 client：`web-next/src/features/data-binding/api-client.ts` 中的 `fetchLivingMirrorGrowthProjection(userId)`
- 测试：`web-next/src/features/living-mirror-growth/living-mirror-growth.test.mjs`

不需要先补新的 Growth Map contract。`LivingMirrorGrowthProjection` 已覆盖高频一念、重复行为、影响维度、训练连续性、生命阶段、下一轮重点、数据缺口、知行稳定度和证据摘要。

需要在 P9C-2 处理的是数据源权威性：当前页面虽然优先读取 server projection，但仍会先生成本地 fallback profile，并在 projection 不可用或数据不足时使用 `recomputeAndSaveGrowthProfile()`。这个 fallback 应保留为降级能力，但不应继续作为和 server projection 对等的事实源。

## 现有 Growth Map 能力

### 页面

- 路径：`/living-mirror-growth`
- 文件：`web-next/src/app/living-mirror-growth/page.tsx`
- 当前产品语义：活镜成长谱，展示阶段、高频一念、重复行为、影响维度、训练摘要、下一轮重点和数据缺口。
- 页面已保留合规文案，定位为交易心理觉察、复盘训练与行为管理，不提供投资建议。

### engine

- 文件：`web-next/src/features/living-mirror-growth/growthProfileEngine.ts`
- 作用：基于 H5 本地历史数据构建 `GrowthProfile`、行为循环、成长记录和 archive item。
- 当前定位应调整为 fallback / legacy local evidence builder，不应成为 P9C 的长期权威口径。

### contract

- 文件：`packages/contracts/living-mirror.d.ts`
- 核心类型：`LivingMirrorGrowthProjection`
- 已包含：
  - `highFrequencyThoughts`
  - `repeatedBehaviors`
  - `affectedDimensions`
  - `trainingContinuity`
  - `mirrorLifeStage`
  - `nextCycleFocus`
  - `dataGaps`
  - `topBehaviorLoops`
  - `zhixingStability`
  - `sourceSummary`
  - `complianceNotice`

### server projection

- H5 client 通过 `fetchLivingMirrorGrowthProjection(userId)` 请求 `/living-mirror/growth`。
- P9-0B 已把 `GET /api/v1/users/:user_id/living-mirror/growth` 定义为 P9C Growth Map 主事实源。
- 在 real-review 仓库内，当前主要体现为 client 消费与 contract；projection 计算/API 归属不应在 P9C-1 中改动。
- P9C-2 开工前应做一次 endpoint smoke。如果 endpoint 缺失或不稳定，应先回到 server/kline-service projection 修补，而不是让页面继续扩大本地自算。

### H5 adapter

- 文件：`web-next/src/app/living-mirror-growth/page.tsx`
- 现有 adapter 会将 server projection 映射为页面使用的 `GrowthProfile`：
  - `highFrequencyThoughts[].text` 映射为 label/title 可读字段
  - `mirrorLifeStage` 的 `sprout` 等阶段映射为用户可读文案
  - `trainingContinuity.totalEvents / activeDays` 进入训练摘要
  - `nextCycleFocus.action` 进入下一步行动字段
  - `dataGaps[].key / label` 进入页面缺口字段

### fallback

- 页面当前会调用 `recomputeAndSaveGrowthProfile()` 生成本地 fallback。
- 无 userId、server projection 不可用、projection 数据不足时，会使用本地 fallback。
- fallback 能避免白屏，但当前缺少足够明确的“当前为降级数据”提示，容易让用户误以为本地自算和 server projection 是同一权威口径。

### 测试

- `web-next/src/features/living-mirror-growth/living-mirror-growth.test.mjs` 已覆盖：
  - server projection 优先
  - 本地 fallback 保留
  - `LivingMirrorGrowthProjection` contract 字段
  - adapter 字段映射
  - 缺字段时不白屏

## 当前数据源关系

### server projection

`LivingMirrorGrowthProjection` 应作为 P9C 的主事实源。它已经是跨端可共享的成长投影 contract，适合承载成长阶段、下一轮重点、知行稳定度和数据缺口。

### DashboardSummary

`DashboardSummary` 和 `WeeklyMirrorSummary` 已由 P9B-1/P9B-2 接入 `/living-mirror-center`，适合提供聚合指标和周摘要：

- 真实复盘次数
- K线训练次数
- 执行一致性
- 高频错题
- 第一念
- 触发场景
- 训练收藏
- dataGaps

这些数据应为 Growth Map 提供上下文与 fallback 证据，但不应让 `/living-mirror-growth` 页面重新计算 dashboard 指标。

### MirrorArchive

`ArchiveIndex` / `ArchiveItem` / `MirrorArchive` 已由 P9A-1/P9A-2 收束为档案馆证据层。Growth Map 应通过 sourceId/sourceType 或 archive item 引用证据，而不是复制档案馆检索能力。

### data-binding summary

`GET /api/v1/data-binding/users/:user_id/summary` 仍是 raw evidence / compatibility 输入。它可以作为 DashboardSummary、MirrorArchive 和 GrowthProjection 的底层证据来源，但不应直接成为 Growth Map 页面的最终展示 contract。

### local fallback

本地 `recomputeAndSaveGrowthProfile()` 应降级为：

- 本地开发 fallback
- server projection 不可达时的离线 fallback
- 明确标记的旧版汇总 fallback

它不应继续和 server projection 共享同一“正式成长谱”语义。

## 权威数据源建议

推荐方案 B：server projection 为主，DashboardSummary / MirrorArchive 为 fallback 与证据上下文，本地 recompute 只作为开发或离线 fallback，并明确标记。

不建议方案 A 立即落地，因为当前页面和 archive 相关能力仍依赖本地 growth engine 保底；立即取消本地 fallback 会增加无 userId、无 server、空数据用户的白屏风险。

不建议方案 C 作为长期方案，因为继续保留页面本地 recompute 为主要路径，会让成长谱、数据看板、档案馆三者口径分裂。P9 的目标正是把 Archive / Dashboard / Growth Map 收束到同一组 server contract 和 dataGaps 语义下。

P9C 权威顺序建议：

1. `LivingMirrorGrowthProjection` server API。
2. `DashboardSummary` / `WeeklyMirrorSummary` 作为聚合上下文。
3. `ArchiveIndex` / `MirrorArchive` 作为证据引用。
4. `data-binding summary` 作为兼容 fallback。
5. `recomputeAndSaveGrowthProfile()` 作为显式标记的本地降级。

## 与 P9A / P9B 的关系

### 与 P9A Archive

P9A 是证据层，负责收纳真实复盘、K线训练、训练收藏、心镜报告、成长投影等证据项。

P9C 不应重复做 archive 搜索或列表。成长谱只需要：

- 展示当前成长投影。
- 对关键成长节点挂证据引用。
- 在需要时跳转 `/mirror-archive` 查看原始档案。
- 通过 `dataGaps` 告诉用户哪些证据不足。

### 与 P9B Dashboard

P9B 是分析层，负责聚合趋势、次数、分布和周摘要。

P9C 不应重算 P9B 的指标。成长谱只需要：

- 读取或引用 DashboardSummary 中的趋势上下文。
- 把 `execution consistency`、高频错题、第一念、触发场景作为成长叙事的证据。
- 在 server projection 缺失时，可使用 DashboardSummary 降级构建轻量说明，但必须明确标记。

### 与 P9C Growth Map

P9C 是叙事层，负责把证据和指标组织为“成长阶段、行为变化、下一轮重点”的长期叙事。

它的页面职责应是展示 projection，而不是在 H5 页面重建成长算法。

## 与小程序的关系

小程序当前主要是数据贡献端和轻量活镜展示端：

- 真实复盘产生第一念、错题类型、执行结果、旧题复现等证据。
- K线训练产生 `executionResult`、`repeatCount`、training mistake card 等证据。
- 训练收藏链路为 archive / dashboard / growth 提供长期证据。
- 活镜页展示近 30 天统计、知行稳定度等轻量摘要。

小程序不应在 P9C 阶段承接完整 Web Growth Map。后续如果需要小程序展示成长谱，应只读取 server projection 的摘要字段，避免在小程序端再次计算完整成长谱。

当前跨端字段基本可支撑 P9C，但仍需关注：

- 小程序训练收藏是否稳定同步到 data-binding。
- `executionResult / repeatCount / trainingPackId / segmentId / samplingResult` 是否持续不丢。
- 小程序活镜摘要和 Web Growth Map 的 stage/dataGaps 文案是否一致。

## 风险点

- server projection 和 H5 local fallback 口径分裂：同一用户可能在 server 成功和失败时看到不同成长阶段。
- 页面本地重算与 DashboardSummary 不一致：execution、training、bookmark 统计可能各算各的。
- dataGaps 未统一：projection、dashboard、archive 可能分别提示不同缺口。
- 成长谱和档案馆重复展示：Growth Map 应展示成长叙事，不应复制 archive item 列表。
- 成长谱和数据看板重复展示：Growth Map 应引用趋势，不应变成第二个 dashboard。
- P8-3 训练收藏虽然已完成 smoke，但真实线上数据量不足时，成长谱证据仍可能偏薄。
- 如果 `/living-mirror/growth` endpoint 未部署或不稳定，P9C-2 页面收束会被迫继续依赖 fallback。

## P9C 实施建议

建议下一步进入 P9C-2：`/living-mirror-growth` 数据源与 fallback 收束。

P9C-2 不应重写页面，只做最小收束：

1. 复核 `fetchLivingMirrorGrowthProjection(userId)` endpoint smoke。
2. 明确页面数据来源状态：
   - server projection
   - dashboard/archive fallback
   - local fallback
3. server projection 成功时只展示 projection 映射结果。
4. server projection 不可用时，优先尝试 DashboardSummary / MirrorArchive 轻量 fallback。
5. 只有最后才使用 `recomputeAndSaveGrowthProfile()`，且页面明确提示“当前使用本地旧版汇总”。
6. 保留现有 adapter 和测试，不改 Growth Map 视觉结构。
7. 不新增 Growth Map contract，除非 P9C-2 smoke 发现 projection 字段无法承载 P9C。

如果 P9C-2 开工前发现 server endpoint 缺失、404 或 contract 不稳定，应先拆出一个 server/kline-service 修补任务，而不是在 H5 继续扩大本地算法。

## 下一条 Codex 命令建议

下一条建议命令：

P9C-2 升级 `/living-mirror-growth` 接统一数据源与 fallback 标识。

目标仓库：

`yangming-trading-system-real-review`

目标：

- 只改 `web-next/src/app/living-mirror-growth` 与必要的 `web-next/src/features/data-binding` adapter/test。
- 不改 server。
- 不改 contracts。
- 不改小程序。
- 不重做页面视觉。
- 让 server projection 成为主路径，DashboardSummary / MirrorArchive 成为可标识 fallback，本地 recompute 成为最后降级。
