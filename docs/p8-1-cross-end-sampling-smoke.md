## P8-1D 跨端抽题链路 smoke 结论

通过。

本次只做审查和 smoke 验证，不开发业务功能。三端前置分支均已进入 `origin/main`，小程序、kline-service、real-review 的既有测试均通过。代码审查确认小程序 `review_focus` 和 `special_training` 已接入 Sampling API，session / record 会保存抽题 metadata，real-review data-binding 会透传字段且不会把完整 `bars` 写入同步记录。

## 是否可以进入 P8-2

可以。

满足条件：

1. kline-service `feature/p8-kline-sampling-api` 已进入 `origin/main`。
2. real-review `feature/p8-data-binding-kline-sampling-fields` 已进入 `origin/main`。
3. miniprogram `feature/p8-miniapp-sampling-api-integration` 已进入 `origin/main`。
4. 三仓自动化测试通过，缺失的 `miniprogram/ui-release-r1.test.js` 按 N/A 处理。
5. 小程序 session / record 保存 `segmentId` / `trainingPackId` / `samplingResult` / `fallbackUsed` / `fallbackReason`。
6. data-binding 不丢 sampling metadata。
7. `samplingResult` 写入 data-binding 前会移除完整 `bars`。
8. 基础盲练 fallback 保留。
9. 未发现 P0 问题。

## 跨端链路图

`kline-service Sampling API`
→ 小程序 `review_focus` / `special_training`
→ 小程序 K线训练 session / record
→ real-review data-binding `kline-records`
→ 后续 web 看板可读 sampling metadata

## 三仓状态

- kline-service：`POST /api/v1/kline-training/sample` 存在；Sampling 以 `KlineSegment` 为候选源，匹配失败时走 catalog / instruments / slice fallback，并返回 `fallbackReason`、`bars` 和抽题 metadata。前置分支 ancestor check = 0。
- real-review：data-binding `POST /api/v1/data-binding/users/:user_id/kline-records` 支持 sampling metadata 的 camelCase / snake_case 字段；测试覆盖不保存完整 `bars`。前置分支 ancestor check = 0。
- miniprogram：`review_focus` 与 `special_training` 进入 K线训练时会调用 Sampling API；基础盲练不强制抽题，失败时可切换基础盲练 fallback。前置分支 ancestor check = 0。

说明：kline-service 与 real-review 本地工作区只做只读测试，未执行 pull；两者工作区干净，但本地 `main` 落后对应 `origin/main`。本次以 ancestor check 和当前工作区自动化测试作为 smoke 依据。

## 字段检查

- `segmentId / segment_id`：小程序 session / record 保存；real-review data-binding 透传。
- `trainingPackId / training_pack_id`：小程序 session / record 保存；real-review data-binding 透传。
- `samplingResult / sampling_result`：小程序保存 metadata；data-binding normalize 后保留 metadata。
- `fallbackUsed / fallback_used`：小程序和 data-binding 均兼容。
- `fallbackReason / fallback_reason`：小程序和 data-binding 均兼容。
- `bars`：小程序训练当局可用于片段展示；写入 data-binding 的 `samplingResult` 不保留完整 `bars`。

## 测试结果

miniprogram：

- `node miniprogram/modules/kline-mind/index.test.js` 通过。
- `node miniprogram/modules/trade-review/index.test.js` 通过。
- `node miniprogram/utils/api.test.js` 通过。
- `node miniprogram/utils/data-binding-adapter.test.js` 通过。
- `npm run test:data-binding --prefix server` 通过。
- `node miniprogram/ui-release-r1.test.js` N/A，当前 main 不存在该文件。

kline-service：

- `npm run test:sampling --prefix server` 通过。
- `npm run test:kline-segments --prefix server` 通过。
- `npm run test:kline-history --prefix server` 通过。
- `npm run check --prefix server` 通过。

real-review：

- `npm run test:data-binding` 通过。
- `npm run test:training-packs` 通过。
- `npm run check` 通过。

## 运行态 smoke

未做运行态 HTTP smoke，仅做代码和自动化测试 smoke。

原因：本任务是只审查、不开发；当前没有启动三端服务的明确运行态环境，本次不为了 smoke 修改配置或启动额外后台。后续进入 P8-2 前，建议补一次真实 HTTP 联调：

1. 调 kline-service `POST /api/v1/kline-training/sample`。
2. 用返回 metadata 模拟小程序 record。
3. 调 real-review data-binding `POST /api/v1/data-binding/users/:user_id/kline-records`。
4. 确认 summary / 后续看板读取字段不丢。

## P0 问题

无。

未发现链路断裂、sampling metadata 丢失、完整 `bars` 写入 data-binding、空 session 阻断或基础盲练 fallback 被破坏的问题。

## P1 问题

无。

## P2 问题

- 本次未做真实 HTTP 运行态 smoke。建议 P8-2 开始前或 P8-2 验收中补一次跨端真实请求。
- 外部仓库本地 `main` 落后 `origin/main`，但任务要求只读审查，未 pull。后续若要做外仓开发，应先在对应仓库按协议更新 `main`。

## 下一步建议

可以进入 P8-2：自选标的 / 自选时间段盲练。

建议下一分支：

- 仓库：`yangming-trading-system-miniprogram`
- 分支：`feature/p8-kline-custom-session`
- 前置：P8-1D 报告合并并 push 到 `origin/main`
- 范围：复用现有 K线训练页和 Sampling / 历史 K线能力，不新增页面、不新增底部入口。
