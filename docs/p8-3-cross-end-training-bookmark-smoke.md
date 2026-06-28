# P8-3C 跨端训练收藏与回放 smoke 验证

## P8-3C 跨端训练收藏 smoke 结论

有条件通过。

本次 smoke 只做代码审查、跨仓库前置确认和自动化测试，不修改业务代码。小程序训练收藏 UI、real-review data-binding training-bookmarks、kline-service slice / segment / sampling 能力均已进入对应 `origin/main`，核心自动化测试通过。

条件项：

- 未执行运行态 HTTP smoke。
- kline-service 本地 checkout 为 `main...origin/main [behind 14]`，本次遵守只读原则未在外仓 pull；前置合并判断使用 `origin/main`，测试运行在本地干净 checkout。

## 是否可以进入 P9 实现

可以。

P8-3 收藏与回放链路没有发现 P0 问题。进入 P9 前仍需先确认 P9-0B 架构审查是否已完成；如果未完成，应先执行 `audit/p9-mirror-data-center-architecture`。

## 跨端链路图

小程序训练结束
→ 收藏本局 / 收藏训练错题卡
→ real-review data-binding `training-bookmarks`
→ 小程序训练收藏列表 / 详情
→ kline-service `kline-history/slice` 重新拉 bars
→ 只读回放

## 三仓状态

### miniprogram

- 当前仓库确认为 `yangming-trading-system-miniprogram`。
- `feature/p8-miniapp-training-bookmarks-ui` 已进入 `origin/main`。
- `feature/p8-kline-custom-session` 已进入 `origin/main`。
- 小程序已注册 `pages/training-bookmarks/index` 和 `pages/training-bookmarks/detail`。
- 训练结束页提供“收藏本局”“收藏训练错题卡”入口。
- 我的页提供“训练收藏”入口。
- 小程序 API 复用 real-review data-binding `training-bookmarks`，未新增平行收藏系统。
- 收藏详情页通过 `fetchKlineTrainingSlice` 走 kline-service slice 回放；缺少回放时间范围时展示 metadata fallback，不崩溃。

### real-review

- `feature/p8-training-bookmark-contract-api` 已进入 `origin/main`。
- data-binding 已支持 `training-bookmarks` 的 GET / POST / PATCH / DELETE 或软删除。
- contracts 中已有 TrainingBookmark 字段定义。
- data-binding 测试覆盖 camelCase / snake_case、sampling metadata 去完整 bars、列表过滤、更新和软删除。

### kline-service

- `feature/p8-kline-sampling-api` 已进入 `origin/main`。
- 已有 `GET /api/v1/kline-history/slice`。
- 已有 `GET|POST /api/v1/kline-segments`、`GET|PATCH /api/v1/kline-segments/:id`、enabled toggle。
- 已有 `POST /api/v1/kline-training/sample`。
- kline-history、kline-segments、sampling 自动化测试通过。
- 本地 checkout 落后 `origin/main`，本次只读审查未更新外仓工作树。

## 字段检查

| 字段 | 检查结论 |
|---|---|
| `id` | 小程序生成并写入 bookmark，real-review contract/API 支持。 |
| `bookmarkType / bookmark_type` | 支持 `session`、`action`、`mistake_card`，小程序当前主要写入 `session` / `mistake_card`。 |
| `sessionId / session_id` | 小程序从训练 record/session 生成并写入，real-review 支持。 |
| `sourceType / source_type` | 支持 `review_focus`、`special_training`、`custom_session`、基础盲练来源。 |
| `errorType / error_type` | 从训练错题卡、record 或 session 读取并兼容双写。 |
| `sceneTags / scene_tags` | 小程序 normalize 后写入数组，real-review 支持 camel/snake。 |
| `executionResult / execution_result` | 小程序从训练错题卡或 record 写入。 |
| `segmentId / segment_id` | sampling 训练收藏写入；缺少日期范围时详情页显示 metadata fallback。 |
| `trainingPackId / training_pack_id` | sampling / 专项训练收藏写入。 |
| `samplingResult / sampling_result` | 小程序写入 metadata，测试断言不包含 `bars`。 |
| `symbol` | custom_session 收藏写入；回放 slice 依赖该字段。 |
| `period` | custom_session 收藏写入；回放 slice 依赖该字段。 |
| `startDate / start_date` | custom_session 或 sampling metadata 写入。 |
| `endDate / end_date` | custom_session 或 sampling metadata 写入。 |
| `note` | 小程序收藏本局 / 收藏错题卡写入简短备注。 |

## 测试结果

### miniprogram

- `node miniprogram/modules/kline-mind/index.test.js`：通过。
- `node miniprogram/modules/trade-review/index.test.js`：通过。
- `node miniprogram/utils/api.test.js`：通过。
- `node miniprogram/utils/data-binding-adapter.test.js`：通过。
- `npm run test:data-binding --prefix server`：通过，包含 training bookmarks 与 sampling metadata 去 bars。
- `node miniprogram/ui-release-r1.test.js`：N/A，当前仓库不存在该文件。
- 训练收藏独立测试文件：N/A，当前仓库未发现独立 bookmark test；覆盖在 kline-mind / api / data-binding 测试中。

### real-review

- `npm run test:data-binding`：通过。
- `npm run test:training-packs`：通过。
- `npm run test:training-bookmarks`：通过。
- `npm run check`：通过。

### kline-service

- `npm run test:kline-history --prefix server`：通过。
- `npm run test:kline-segments --prefix server`：通过。
- `npm run test:sampling --prefix server`：通过。
- `npm run check --prefix server`：通过。

## 运行态 smoke

未执行运行态 HTTP smoke。

原因：

- 本任务要求只审查、不开发、不修改其他仓库。
- 当前未启动 real-review / kline-service 服务进程。
- 为避免外仓配置、运行时数据或端口状态被本次审查改变，本次只做代码路径审查和自动化测试 smoke。

建议手动验收路径：

1. 在微信开发者工具完成一局 K 线训练。
2. 训练结束页点击“收藏本局”。
3. 训练结束页点击“收藏训练错题卡”。
4. 进入“我的页”。
5. 打开“训练收藏”。
6. 查看收藏列表。
7. 进入收藏详情 / 回放。
8. 对 custom_session 收藏确认能通过 `symbol / period / startDate / endDate` 拉取回放 bars。
9. 对仅有 `segmentId` 但缺少时间范围的旧收藏，确认页面展示 metadata fallback，不崩溃。

## P0 问题

无。

未发现会导致链路断裂、字段丢失、收藏无法写入、回放崩溃或阻断进入 P9 的问题。

## P1 问题

- kline-service 本地 checkout 落后 `origin/main`，测试没有在外仓最新 `origin/main` 工作树上执行；前置合并判断仍以 `origin/main` 为准。
- 当收藏只有 `segmentId`、缺少 `symbol / period / startDate / endDate` 时，小程序无法完整拉取回放 bars；当前已显示 metadata fallback，主链路不阻塞。

## P2 问题

- 后续可补一次运行态 HTTP smoke：real-review training-bookmarks POST/GET/DELETE + kline-service slice 拉取。
- 后续可补 segment detail 到回放 range 的补全链路，减少 `segmentId` only 收藏的 fallback。
- P9 看板读取训练收藏时，应继续复用 real-review data-binding，不要另建收藏统计源。

## 下一步建议

P8-3C 通过后，建议进入 P9 心镜数据中枢阶段。

如果 P9-0B 还没完成：

- 先执行 `audit/p9-mirror-data-center-architecture`。

如果 P9-0B 已完成：

- 按 P9-0B 报告进入对应的 P9A / P9B / P9C 分支。
