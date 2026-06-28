# P8-1 Sampling API Readiness Audit

审查日期：2026-06-28

审查仓库：`yangming-trading-system-kline-service`

基线：`origin/main`，最近 P7 相关提交包含：

- `4f6831b Merge branch 'feature/p7-kline-segment-contract-api'`
- `ff07572 Merge branch 'feature/p7-kline-segment-admin-ui'`

本报告只审查接口和数据契约准备度，不实现 Sampling API，不修改业务代码。

## P8-1A 审查结论

结论：可进入 P8-1B，但 P8-1B 不应依赖尚未挂载的 `hot-slice` / `hot-pool` active route。

推荐路径：

1. P8-1B 在 kline-service 新增 `POST /api/v1/kline-training/sample`。
2. 候选源优先使用已完成的 `KlineSegment` API / service。
3. bars 获取复用现有 `kline-history/slice` service 能力，不在 `KlineSegment` 中复制 bars。
4. fallback 优先使用 `catalog + instruments + slice` 的最小可测路径。
5. `hot-slice` / `hot-pool` 目前只适合作为后续优化或另行确认项，不能作为 P8-1B 的唯一底座。

需要注意：`data-binding` 的 K 线训练记录当前尚未完整承载 `segment_id` / `sampling_result` / `fallback_used`。这不阻塞 P8-1B 做只读抽题 API，但会影响 P8-1C 之后的小程序训练记录闭环。

## 现有 K线接口清单

| 能力 | endpoint / 位置 | active route | 测试 | 结论 |
| --- | --- | --- | --- | --- |
| catalog | `GET /api/v1/kline-history/catalog` | 是，`server/src/routes/router.js` | 是，`server/scripts/historical-kline-contract-test.mjs` | 可复用，用于市场、周期、存储契约发现。 |
| instruments | `GET /api/v1/kline-history/instruments` | 是，`server/src/routes/router.js` | 是，`server/scripts/historical-kline-contract-test.mjs` | 可复用，用于 fallback 标的选择。 |
| rules | `GET /api/v1/kline-history/rules` | 是，`server/src/routes/router.js` | 是，`server/scripts/historical-kline-contract-test.mjs` | 可复用，非 sampling 核心。 |
| slice | `GET /api/v1/kline-history/slice` | 是，`server/src/routes/router.js` | 是，`server/scripts/historical-kline-contract-test.mjs` | P8-1B bars 获取应复用它或同一 service。 |
| reveal | `GET /api/v1/kline-history/reveal` | 是，`server/src/routes/router.js` | 是，`server/scripts/historical-kline-contract-test.mjs` | 可复用盲练揭示机制。 |
| download | `POST /api/v1/kline-history/download` | 是，`server/src/routes/router.js` | 是，`server/scripts/historical-kline-contract-test.mjs` | 与 sampling 无直接关系，本轮不碰。 |
| hot-slice | 文档曾提及 `/api/v1/kline-history/hot-slice` | 否，当前 `server/src` 未见 active route | 否 | 不能作为 P8-1B 唯一依赖。 |
| hot-pool | 文档曾提及 `/api/v1/kline-history/hot-pool` | 否，当前 `server/src` 未见 active route | 否 | 不能作为 P8-1B 唯一依赖。 |
| klineSegment | `GET/POST/PATCH /api/v1/kline-segments` | 是，`server/src/routes/klineSegments.js` | 是，`server/scripts/kline-segments-test.mjs` | 可作为 sampling 的候选片段来源。 |

## KlineSegment 作为 sampling 候选源的可用性

当前 `KlineSegment` 已具备 P8-1B 抽题候选源所需的最小能力：

- 字段：`id`、`symbol`、`name`、`period`、`startDate/start_date`、`endDate/end_date`、`sceneTags/scene_tags`、`errorTypes/error_types`、`trainingPackIds/training_pack_ids`、`difficulty`、`note`、`enabled`、`createdAt/created_at`、`updatedAt/updated_at`。
- 过滤：list 支持 `include_disabled`、`errorType/error_type`、`sceneTag/scene_tag`、`trainingPackId/training_pack_id`、`symbol`、`period`。
- 启停：`enabled` 已存在，默认 list 只返回启用片段。
- 存储边界：`KlineSegment` 只保存 metadata，不复制 bars / candles。
- 测试：contract、service、route 测试已覆盖 normalize、CRUD、过滤和不复制 bars。

P8-1B 推荐做法：

- 先从 enabled `KlineSegment` 中筛选候选。
- 抽中 segment 后，使用 segment 的 `symbol`、`period`、`startDate`、`endDate` 调用现有 `kline-history/slice` service 获取 bars。
- 如果 slice 因数据缺失返回空或错误，不应让整个 API 500，应进入 fallback，并返回 `fallbackUsed/fallback_used=true` 与 `fallbackReason/fallback_reason`。

## Sampling API 推荐契约

推荐 endpoint：

```http
POST /api/v1/kline-training/sample
```

输入建议：

```ts
type SamplingRequest = {
  userId?: string;
  user_id?: string;

  sourceType?: string;
  source_type?: string;

  errorType?: string;
  error_type?: string;

  sceneTags?: string[];
  scene_tags?: string[];

  trainingPackId?: string;
  training_pack_id?: string;

  difficulty?: string;
  period?: string;

  excludeSegmentIds?: string[];
  exclude_segment_ids?: string[];

  limit?: number;
};
```

输出建议：

```ts
type SamplingResult = {
  segmentId?: string;
  segment_id?: string;

  trainingPackId?: string;
  training_pack_id?: string;

  errorType?: string;
  error_type?: string;

  sceneTags: string[];
  scene_tags: string[];

  symbol: string;
  name?: string;
  period: string;

  startDate: string;
  start_date: string;
  endDate: string;
  end_date: string;

  bars: unknown[];

  fallbackUsed: boolean;
  fallback_used: boolean;
  fallbackReason?: string;
  fallback_reason?: string;

  source: "kline_segment" | "catalog_slice_fallback" | "legacy_practice_fallback";
};
```

匹配规则建议：

1. 只从 `enabled=true` 的 `KlineSegment` 开始匹配。
2. 优先匹配 `errorType/error_type`。
3. 其次匹配 `sceneTags/scene_tags`。
4. 再匹配 `trainingPackId/training_pack_id`、`difficulty`、`period`。
5. 支持 `excludeSegmentIds/exclude_segment_ids`，避免同一用户短时间重复抽到同一片段。
6. 抽中 segment 后，不从 segment 读取 bars，而是复用现有 `kline-history/slice`。
7. 无匹配 segment 或 slice 取不到 bars 时进入 fallback。
8. fallback 必须返回 `fallbackUsed/fallback_used=true` 和可读的 `fallbackReason/fallback_reason`。

## fallback 策略

当前可用 fallback 审查：

| fallback 源 | active route | service / tests | 是否能输出 bars | 是否建议 P8-1B 使用 |
| --- | --- | --- | --- | --- |
| `hot-slice` | 否 | 否 | 当前不可确认 | 暂不作为 P8-1B 依赖。 |
| `hot-pool` | 否 | 否 | 当前不可确认 | 暂不作为 P8-1B 依赖。 |
| `catalog + instruments + slice` | 是 | 是 | 是 | 推荐作为 P8-1B 最小 fallback。 |
| existing practice bank / legacy practice | 有历史练习能力痕迹 | 非 P8 segment 主路径 | 可用于旧训练，但语义较旧 | 仅作为兜底备选，不建议做主 fallback。 |
| 小程序本地基础盲练 | 在小程序侧存在 | 小程序本地逻辑 | 能训练但非 server sampling | P8-1C 可保留为客户端最终兜底。 |

推荐 fallback 顺序：

1. `KlineSegment` 匹配成功，并能通过 `slice` 取到 bars：`fallbackUsed=false`。
2. 无 segment 或 segment bars 缺失：使用 `catalog + instruments + slice` 生成基础盲练片段，`fallbackUsed=true`，`fallbackReason="no_matched_segment"` 或 `fallbackReason="segment_slice_unavailable"`。
3. server sampling API 失败时，小程序 P8-1C 继续保留本地基础盲练兜底，并记录错误来源。

## 小程序接入影响

只读审查结果：

- 小程序当前已有 `trainingPackId/training_pack_id` 在 `kline-mind` 训练上下文中流转。
- 未看到稳定的 `segmentId/segment_id`、`samplingResult/sampling_result`、`fallbackUsed/fallback_used` 字段闭环。
- 小程序当前通过 `fetchKlineTrainingSlice()` 请求 `/api/v1/kline-history/slice`，并在 `kline-session` 中合并 server slice。
- 小程序的 `review_focus` 与 `special_training` 模式已存在，可作为 P8-1C 接入 sampling 的入口语义。

P8-1C 建议：

1. 小程序进入专项训练或错题训练时，先调用 `POST /api/v1/kline-training/sample`。
2. 成功后使用返回的 `bars` 初始化训练主图。
3. 训练 session 和完成记录保存：
   - `segmentId/segment_id`
   - `trainingPackId/training_pack_id`
   - `samplingResult/sampling_result`
   - `fallbackUsed/fallback_used`
   - `fallbackReason/fallback_reason`
   - `source`
4. sampling API 不可用时，继续保留本地基础盲练作为最终 fallback，但需要明确记录来源，避免误判为 server segment 训练。

P8-1B 和 P8-1C 应拆开：先让 kline-service 输出稳定 sampling 契约，再让小程序接入。

## data-binding 字段影响

当前状态：

- `KlineSegment` contract 已有 `trainingPackIds/training_pack_ids`，这是片段与训练包的弱关联。
- `data-binding` 的 K 线训练记录当前已有 `sourceType/source_type`、`errorType/error_type`、`sceneTags/scene_tags`、`trainingPrescription/training_prescription`、`executionResult/execution_result` 等字段。
- 当前未看到 `DataBindingKLineRecord` 稳定定义：
  - `trainingPackId/training_pack_id`
  - `segmentId/segment_id`
  - `samplingResult/sampling_result`
  - `fallbackUsed/fallback_used`

建议阶段：

1. P8-1B：只做 kline-service sampling API 与 `SamplingRequest/SamplingResult` 契约，不写训练记录。
2. P8-1C：小程序接入 sampling API，并在本地 session / record 里携带 sampling 元信息。
3. P8-1D：补齐 data-binding K 线训练记录 contract 与 server normalize，同步保存 `training_pack_id`、`segment_id`、`sampling_result`、`fallback_used`。

如果 P8-1C 要求训练记录立刻进 server 可查询闭环，则应把 P8-1D 提前到 P8-1C 之前；否则 P8-1B 可以先做。

## P8-1 路线建议

推荐拆分：

1. P8-1B：kline-service 实现 `POST /api/v1/kline-training/sample`。
   - 只读抽题。
   - 候选源：enabled `KlineSegment`。
   - bars 来源：现有 `kline-history/slice` service。
   - fallback：`catalog + instruments + slice`。
   - 不做小程序接入，不写 data-binding 记录。

2. P8-1C：小程序接入 sampling API。
   - 专项训练 / 错题训练优先走 sampling。
   - 保存 `segmentId`、`trainingPackId`、`samplingResult`、`fallbackUsed`。
   - 保留本地基础盲练 fallback。

3. P8-1D：data-binding 字段补齐。
   - 补 `DataBindingKLineRecord` 字段。
   - server `kline-records` normalize 接收并保存 sampling 元信息。
   - 补 contract / route 测试。

如果团队坚持 P8-1B 必须基于 `hot-slice` / `hot-pool`，则需要先做一个更小的 P8-1B-0：确认或恢复 `hot-slice` / `hot-pool` active route 与测试。

## 风险点

- `hot-slice` / `hot-pool` 在前置报告里被描述为已有能力，但当前 `origin/main` 的 `server/src` 未见 active route；不能把它当成已可调用生产接口。
- `KlineSegment` 不保存 bars 是正确边界，但 sampling 抽中 segment 后仍可能因为 K 线缓存缺失导致 slice 取不到 bars。
- `catalog + instruments + slice` fallback 能保证最小可用，但不一定命中训练包语义，需要 `fallbackReason` 明确说明。
- `data-binding` 当前缺 `segment_id` / `sampling_result` / `fallback_used`，会影响训练效果追踪和后续数据看板。
- 小程序已有 `trainingPackId`，但缺完整 sampling 元信息字段；P8-1C 必须统一 camelCase / snake_case。
- P8-1B 不应新增平行 bars API；如果直接把 bars 写入 `KlineSegment`，会破坏 P7-2B 的元数据边界。

## 审查命令摘要

本次只读审查使用的关键命令包括：

```bash
git status
git fetch origin
git checkout main
git pull --ff-only
git merge-base --is-ancestor feature/p7-kline-segment-contract-api origin/main
git -C /Users/jianlinhe/Desktop/yangming-trading-system-real-review merge-base --is-ancestor feature/p7-kline-segment-admin-ui origin/main
rg -n "kline-history/(catalog|instruments|slice|reveal)|kline-segments|hot-slice|hotSlice|hot-pool|hotPool|kline-training/sample" server/src server/scripts packages/contracts docs
rg -n "trainingPackId|training_pack_id|segmentId|segment_id|samplingResult|sampling_result|fallbackUsed|fallback_used" server/src packages/contracts server/scripts
```

本报告未实现 sampling API，未修改 server / packages / data / tests / web-next / miniprogram。
