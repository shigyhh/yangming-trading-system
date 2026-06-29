# P10-3 跨端 intervention smoke 验证

## P10-3 跨端 intervention smoke 结论

有条件通过。

本次只做只读代码审查和自动化测试 smoke，未启动真实服务做运行态 HTTP smoke。代码链路和三仓测试证明 P10 intervention 主链路已经闭合：

小程序 `before_training` / `during_training` / `after_review`
-> `interventionEvent`
-> real-review data-binding `intervention-events`
-> `DashboardSummary` / P9 心镜数据中枢
-> 后续可分析提醒效果。

## 是否可以进入 P10-4

可以。

依据：

1. real-review P10-1 已进入 `origin/main`。
2. 小程序 P10-2 已进入 `origin/main`。
3. 小程序代码已能生成并写入 `interventionEvent` payload。
4. real-review `DashboardSummary` 能读取 `interventions` / `executionPlans`，缺失时通过 `dataGaps` 标记而不崩。
5. miniprogram / real-review / kline-service 自动化测试通过。
6. 用户端提醒链路未发现交易建议、买卖信号或实盘监控文案；命中的禁用词只出现在 guard/test 或历史非 P10 文案中。
7. kline-service 只提供 sceneTags / segment / sampling metadata，没有承接干预策略。
8. 未发现 P0 问题。

## 跨端链路图

```text
小程序 before_training / during_training / after_review
  -> miniprogram/modules/intervention-engine
  -> miniprogram/modules/zhixing-reminder
  -> miniprogram/pages/kline-mind / miniprogram/pages/trade-review
  -> interventionEvent payload
  -> POST /api/v1/data-binding/users/:user_id/intervention-events
  -> real-review data-binding intervention_events
  -> GET /api/v1/data-binding/users/:user_id/dashboard-summary
  -> DashboardSummary / P9 心镜数据中枢
  -> 后续分析提醒次数、响应分布、提醒后执行结果
```

## 小程序审查

### 触发点

- `before_training`：
  - 覆盖 `review_focus` 今日针对训练。
  - 覆盖 `special_training` 专项训练。
  - 覆盖 `custom_session` 自选盲练。
- `during_training`：
  - 基于 `sceneTags`、当前 session、执行计划和 fallback 状态生成训练中提醒。
- `after_review`：
  - 基于同类错题、第一念、触发场景重复生成复盘后旧题复现提醒。

### 规则读取

- 小程序通过 API client 读取 `intervention-rules`。
- 读取失败时降级到本地默认安全规则。

### 执行计划读取

- 小程序通过 API client 读取 `execution-plans`。
- 读取失败时降级到 P6 本地执行计划库。
- 提醒文案优先使用对应执行计划的 `expectedAction` / `nextAction`。

### summary 读取

- 小程序读取：
  - `dashboard-summary?range=30d`
  - `dashboard-weekly?week=current`
- summary 失败不阻断训练，只是不使用周期依据。

### event 写入

- 用户响应后构造 `interventionEvent`。
- 本地继续保留 P5 事件存储。
- 同时异步写入 real-review data-binding `intervention-events`。
- 写入失败不阻断训练，不假装同步成功。

### 频率控制

- `maxPerSession` 控制每局提醒次数。
- `mute_session` 后本局不再提醒。
- `cooldown` 以 `triggerType:errorType` 为 key 避免短时间重复提醒。

### 安全文案

- 小程序 `intervention-engine` 中有 forbidden keywords guard。
- guard 覆盖：
  - 建议买入
  - 建议卖出
  - 现在可以买
  - 现在该卖
  - 目标价
  - 止盈
  - 止损建议
  - 明日看涨
  - 明日看跌
  - 预测涨跌
  - 买入信号
  - 卖出信号
- 生成提醒使用“先停一下”“本次只练一个动作”“按你的执行计划处理”等训练提醒文案。

## real-review 审查

### intervention-events

- 存在 endpoint：
  - `GET /api/v1/data-binding/users/:user_id/intervention-events`
  - `POST /api/v1/data-binding/users/:user_id/intervention-events`
  - `PATCH /api/v1/data-binding/users/:user_id/intervention-events/:id`
  - `DELETE /api/v1/data-binding/users/:user_id/intervention-events/:id`
- 支持 camelCase / snake_case：
  - `interventionEvent`
  - `intervention_event`
  - `triggerType / trigger_type`
  - `userResponse / user_response`
  - `suggestedAction / suggested_action`
  - `expectedAction / expected_action`

### intervention-rules

- 存在 endpoint：
  - `GET /api/v1/data-binding/users/:user_id/intervention-rules`
  - `POST /api/v1/data-binding/users/:user_id/intervention-rules`
  - `PATCH /api/v1/data-binding/users/:user_id/intervention-rules/:id`
  - `DELETE /api/v1/data-binding/users/:user_id/intervention-rules/:id`
- 支持 `maxPerSession / max_per_session` 与 `cooldownMinutes / cooldown_minutes`。

### execution-plans

- 存在 endpoint：
  - `GET /api/v1/data-binding/users/:user_id/execution-plans`
  - `POST /api/v1/data-binding/users/:user_id/execution-plans`
  - `PATCH /api/v1/data-binding/users/:user_id/execution-plans/:id`
  - `DELETE /api/v1/data-binding/users/:user_id/execution-plans/:id`
- 支持 `errorType / error_type`、`sceneTags / scene_tags`、`expectedAction / expected_action`、`nextAction / next_action`。

### dashboard-summary

- `DashboardSummary` 能聚合：
  - `interventions.totalCount`
  - `interventions.byTriggerType`
  - `interventions.byUserResponse`
  - `executionPlans.totalCount`
  - `executionPlans.enabledCount`
  - `executionPlans.byErrorType`
- 数据缺失时能输出：
  - `missingInterventionEvents`
  - `missingExecutionPlans`

### 禁止交易建议 guard

- real-review data-binding 在 intervention event / rule / execution plan 写入时检查交易建议、买卖信号和行情预测类文案。
- `interventions-test.mjs` 覆盖 forbidden event / rule 写入返回 400。

## kline-service 边界

- kline-service 当前只提供：
  - `sceneTags / scene_tags`
  - `errorTypes / error_types`
  - `segmentId / segment_id`
  - `trainingPackId / training_pack_id`
  - `fallbackReason / fallback_reason`
  - sampling result metadata
- kline-service 没有 `interventionEvent` / `interventionRule` / `intervention-events` / `intervention-rules`。
- 干预策略没有放进 kline-service。
- 小程序基于 kline-service 返回的 sceneTags / sampling metadata 自行生成训练提醒。

## 测试结果

### miniprogram

- `node miniprogram/modules/intervention-engine/index.test.js`：通过。
- `node miniprogram/modules/zhixing-reminder/index.test.js`：通过。
- `node miniprogram/modules/kline-mind/index.test.js`：通过。
- `node miniprogram/modules/trade-review/index.test.js`：通过。
- `node miniprogram/utils/api.test.js`：通过。
- `node miniprogram/utils/data-binding-adapter.test.js`：通过。
- `npm run test:data-binding --prefix server`：通过。
- `miniprogram/ui-release-r1.test.js`：N/A，当前 `main` 中不存在。

### real-review

- `npm run test:data-binding --prefix server`：通过。
- `npm run test:dashboard-summary --prefix server`：通过。
- `npm run test:interventions --prefix server`：通过。
- `npm run test:execution-plans --prefix server`：通过。
- `npm run check --prefix server`：通过。
- `node --test packages/contracts/intervention-contract.test.mjs`：通过。
- `node --test packages/contracts/execution-plan-contract.test.mjs`：通过。

### kline-service

- `npm run test:sampling --prefix server`：通过。
- `npm run test:kline-segments --prefix server`：通过。
- `npm run check --prefix server`：通过。

## 运行态 smoke

未做运行态 HTTP smoke。

原因：

- 本任务要求只审查不开发，不为了 smoke 修改服务配置或启动脚本。
- 当前已经完成代码路径审查和三仓自动化测试 smoke。

建议后续如需真实运行态验证，可单独执行：

1. real-review：
   - `POST /api/v1/data-binding/users/:user_id/intervention-events`
   - `GET /api/v1/data-binding/users/:user_id/intervention-events`
   - `GET /api/v1/data-binding/users/:user_id/dashboard-summary?range=30d`
2. 小程序手动路径：
   - 进入 K线训练页。
   - 进入今日针对训练或专项训练。
   - 触发知行提醒。
   - 选择“继续 / 本局不再提醒 / 已按计划执行”。
   - 在 real-review data-binding 查询对应 `interventionEvent`。

## P0 问题

无。

未发现阻断 P10-4 的链路断裂、字段丢失、交易建议文案、kline-service 干预策略下沉或 dashboard 崩溃问题。

## P1 问题

- 未执行真实运行态 HTTP smoke。自动化测试已覆盖 API route 和 contract，但不能替代真实服务联调。
- real-review 与 kline-service 本地 checkout 均落后其 `origin/main`，本次按只读原则没有 pull 或切换其他仓库分支；测试基于当前本地 checkout。

## P2 问题

- P9 后续可以进一步细化 intervention analysis，如提醒后是否仍发生执行偏离、不同用户响应后的训练完成率。
- 小程序后续可以在训练中 UI 上更清楚地区分“本局提醒已静默”和“已按计划执行 / 仍然偏离 / 说不清”。

## 下一步建议

建议进入 P10-4：复盘后旧题复现提醒升级。

理由：

- P10-3 已证明跨端 intervention 主链路在代码和自动化测试层面闭合。
- 训练前 / 训练中提醒已有基础引擎和频率控制。
- 下一步更适合把复盘后的旧题复现提醒做深：基于同类错题、第一念、触发场景和执行计划生成更稳定的复盘后干预，并继续写回 `interventionEvent` 供 P9 分析。
