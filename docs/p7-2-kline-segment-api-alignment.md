# P7-2 Kline Segment API Alignment

## P7-2A 审查结论

结论：需要先做 kline-server / kline-service 侧的 K 线片段 contract 与 CRUD API，暂不应直接进入 web-next 片段标注 UI。

原因：

- real-review 当前已有 Training Pack 公共配置和管理 UI，但没有正式 `klineSegment` 数据源。
- real-review server 与 kline-service 都有 `/api/v1/kline-history/*` 历史 K 线读取能力；其中 kline-service 已包含 `hot-slice` / `hot-pool`，更接近后续抽题能力。
- 当前已有 `slice` 是按参数即时生成的训练片段，不是可人工标注、可启停、可绑定训练包的持久化 segment。
- 小程序当前主要读取 `/api/v1/kline-history/slice`，并已承接 `trainingPackId` / `sceneTags` 等训练上下文字段；它不应该直接管理 segment。

进入下一步建议：

1. P7-2B：先在 kline-service 补 `KlineSegment` contract + segment CRUD API。
2. P7-2C：再在 real-review / web-next 接入片段标注 UI。
3. P8-1：基于 kline-service 的 segment + hot-pool 做 sampling API。

## 仓库清单

| 仓库 | 路径 | 当前职责 | 本轮结论 |
| --- | --- | --- | --- |
| real-review | `/Users/jianlinhe/Desktop/yangming-trading-system-real-review` | web-next 后台、Training Pack、real-review server、shared contracts | 保留 Training Pack 管理和后续片段标注 UI，不应成为 K 线 bars/segment 主事实源 |
| kline-service | `/Users/jianlinhe/Desktop/yangming-trading-system-kline-service` | K 线历史数据、slice、hot-slice、hot-pool、server projection | 建议承载 Kline Segment contract / CRUD / sampling |
| miniprogram | `/Users/jianlinhe/Desktop/yangming-trading-system-miniprogram` | 小程序训练消费端 | 只消费 slice/samplingResult 和 fallback，不管理 segment |
| shared contracts | `packages/contracts` | 各仓公共接口类型 | P7-2B 应补 KlineSegment contract；real-review 可在后续 UI 阶段消费 |

## 现有接口清单

### real-review 当前接口

已存在：

- `GET /api/v1/kline-history/catalog`
- `GET /api/v1/kline-history/instruments`
- `GET /api/v1/kline-history/rules`
- `GET /api/v1/kline-history/slice`
- `GET /api/v1/kline-history/reveal`
- `POST /api/v1/kline-history/download`
- `GET /api/v1/kline-practice/next`
- `POST /api/v1/kline-practice/submit`
- `GET /api/v1/training-packs`
- `POST /api/v1/training-packs`
- `PATCH /api/v1/training-packs/:id`
- `PATCH /api/v1/training-packs/:id/enabled`
- `POST /api/v1/data-binding/users/:user_id/kline-records`

可复用：

- `kline-history/slice`：后续片段标注 UI 可用它预览指定 symbol / period / start / end 的 bars。
- `kline-history/catalog` / `instruments` / `rules`：后续 UI 可用于选择市场、周期和标的。
- `kline-history/reveal`：可复用盲练揭示机制。
- `training-packs`：后续片段绑定训练包时复用，不再新建训练包接口。
- data-binding K 线记录：可继续承接训练结果，但不是 segment 管理接口。

缺失：

- 无 `klineSegment` / `kline_segment` contract。
- 无 `GET /api/v1/kline-segments` 等片段 CRUD。
- 无 `segmentId` / `trainingPackIds` / `samplingResult` 的正式跨端契约。

### kline-service 当前接口

已存在：

- `GET /api/v1/kline-history/catalog`
- `GET /api/v1/kline-history/instruments`
- `GET /api/v1/kline-history/status`
- `GET /api/v1/kline-history/rules`
- `GET /api/v1/kline-history/slice`
- `GET /api/v1/kline-history/hot-slice`
- `GET /api/v1/kline-history/hot-pool`
- `GET /api/v1/kline-history/reveal`
- `POST /api/v1/kline-history/download`

可复用：

- `slice`：作为 segment 预览和 sampling 出题的 bars 来源。
- `hot-slice` / `hot-pool`：作为 P8 sampling 的底层候选池能力。
- `catalog` / `instruments` / `status` / `rules`：作为标注 UI 选择和健康检查能力。
- `reveal`：保留盲练揭示逻辑。

缺失：

- 无正式 `klineSegment` 持久化 CRUD。
- 无 `trainingPackIds` / `errorTypes` / `sceneTags` 与 segment 的绑定事实源。
- 无正式 `samplingResult` 输出 contract。
- 无 segment API 测试。

### 小程序当前调用

已存在：

- `miniprogram/utils/api.js` 中 `fetchKlineTrainingSlice()` 调用 `/api/v1/kline-history/slice`。
- `miniprogram/pages/kline-mind/index.js` 与 `miniprogram/modules/kline-mind/index.js` 已承接 `sceneTags` / `scene_tags`、`trainingPackId` / `training_pack_id`。
- `miniprogram/utils/data-binding-adapter.js` 已将 K 线训练记录同步为 data-binding payload，并保留 `errorType` / `sceneTags` / `trainingPrescription`。

缺失：

- 小程序没有正式读取 `segmentId` / `samplingResult` 的稳定 contract。
- 小程序没有也不应该提供 segment 管理能力。

## klineSegment 归属判断

推荐归属：kline-service。

理由：

1. K 线片段的事实基础是 bars / symbol / period / date range，天然靠近 kline-service。
2. kline-service 已有 `slice`、`hot-slice`、`hot-pool`、`status`、`catalog`、`instruments`，具备片段预览和抽题候选池基础。
3. real-review server 已承担 Training Pack、复盘、后台承接等业务配置，不应再复制 K 线 bars 和 segment 主数据源。
4. P8 sampling 需要从 segment / hot-pool 中抽题，放在 kline-service 可避免小程序、web-next、real-review server 各自计算。

建议边界：

- kline-service：管理 `KlineSegment`、提供 CRUD、提供 sampling。
- real-review：管理 `TrainingPack`，后续 web-next 做片段标注 UI，调用 kline-service 的 segment API。
- miniprogram：只消费 kline-service 的 slice / samplingResult，失败时走本地或基础训练 fallback。

## Training Pack 与 Kline Segment 关联

Training Pack 已在 real-review 中作为公共训练包配置存在，核心字段包括：

- `id`
- `errorType` / `error_type`
- `sceneTags` / `scene_tags`
- `trainingGoal` / `training_goal`
- `expectedAction` / `expected_action`
- `trainingPrescription` / `training_prescription`

Kline Segment 建议只保存引用关系，不复制训练包全文：

- `trainingPackIds` / `training_pack_ids`：指向 Training Pack 的 `id`。
- `errorTypes` / `error_types`：用于快速筛选和 sampling 匹配。
- `sceneTags` / `scene_tags`：用于 K 线场景标签匹配。

调用关系建议：

1. web-next 标注 UI 从 real-review 读取 Training Pack 列表。
2. web-next 标注 UI 从 kline-service 读取 / 写入 Kline Segment。
3. kline-service segment 记录只保存 `trainingPackIds`、`errorTypes`、`sceneTags`。
4. 小程序拿到 samplingResult 后展示训练上下文，不直接维护 Training Pack 或 Segment。

## 推荐 API 契约

如果 P7-2B 在 kline-service 新增 API，建议沿用 `/api/v1` 风格。

### KlineSegment 字段

```ts
type KlineSegment = {
  id: string;
  symbol: string;
  name: string;
  period: string;

  startDate: string;
  start_date: string;
  endDate: string;
  end_date: string;

  sceneTags: string[];
  scene_tags: string[];
  errorTypes: string[];
  error_types: string[];
  trainingPackIds: string[];
  training_pack_ids: string[];

  difficulty: "初级" | "中级" | "高级" | string;
  note: string;
  enabled: boolean;

  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
};
```

### Segment CRUD API

```text
GET /api/v1/kline-segments
POST /api/v1/kline-segments
PATCH /api/v1/kline-segments/:id
PATCH /api/v1/kline-segments/:id/enabled
```

建议行为：

- `GET` 默认只返回 `enabled=true`，支持 `include_disabled=true`。
- `POST` 必填 `symbol`、`period`、`startDate/start_date`、`endDate/end_date`、`name`。
- `PATCH` 支持 camelCase / snake_case 输入。
- `PATCH enabled` 只切换启用状态。
- 预览 bars 不新增平行接口，优先复用 `/api/v1/kline-history/slice`。

## P7-2 路线建议

推荐拆分：

1. P7-2B：kline-service 新增 `KlineSegment` contract / storage / service / route / tests。
2. P7-2C：real-review web-next 新增 K 线片段标注 UI，读取 Training Pack + Kline Segment。
3. P7-2D：小程序只读接入 `segmentId` / `samplingResult`，不做管理面。

不建议：

- 不建议在 real-review server 单独造一份 segment 数据源。
- 不建议先做 web-next UI 再补接口。
- 不建议小程序本地维护正式 segment。
- 不建议把 Training Pack 复制到 kline-service，只保存引用字段即可。

## P8-1 sampling 前置判断

推荐归属：kline-service。

原因：

- kline-service 已有 hot-pool / hot-slice。
- sampling 需要靠近 bars 数据、segment 标签和可用性状态。
- 小程序和 web-next 都应消费同一个 samplingResult，避免各端抽到不同事实。

P8-1 建议输出：

```ts
type KlineSamplingResult = {
  id: string;
  segmentId: string;
  segment_id: string;
  trainingPackId: string;
  training_pack_id: string;
  symbol: string;
  period: string;
  slice: unknown;
  sceneTags: string[];
  scene_tags: string[];
  errorTypes: string[];
  error_types: string[];
  fallbackUsed: boolean;
  fallback_used: boolean;
  reason: string;
  createdAt: string;
  created_at: string;
};
```

小程序消费方式：

- 优先读取 samplingResult。
- 没有 userId、无 segment、接口失败时 fallback 到现有基础盲练 / `/api/v1/kline-history/slice`。
- 不展示完整 segment 管理信息。

## 风险点

- real-review server 和 kline-service 职责重叠：如果两个仓库都新增 segment CRUD，会出现双事实源。规避：segment 主事实源放 kline-service。
- segment 数据和 bars 数据分裂：如果 segment 不靠近 bars，会出现标注区间无法预览或 bars 变更后失配。规避：segment CRUD 和 slice 预览都放 kline-service。
- Training Pack 与 segment 关联不稳定：如果靠 title 文案关联，后续改名会断。规避：使用 `trainingPackIds`，并辅以 `errorTypes` / `sceneTags`。
- 小程序和网页读到不同片段数据：如果小程序本地抽题、网页后台另存片段，会产生不一致。规避：小程序只消费 kline-service samplingResult。
- 直接做 UI 导致接口返工：当前没有正式 segment API，先做 UI 只能写临时字段。规避：先 P7-2B API，再 P7-2C UI。
- P8 sampling 过早进入：hot-pool 是底层能力，不等于可解释 samplingResult。规避：先补 segment，再做 sampling。
