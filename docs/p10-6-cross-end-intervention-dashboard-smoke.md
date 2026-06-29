# P10-6 Cross-End Intervention + Dashboard Smoke

审查日期：2026-06-29

## P10-6 跨端 intervention + dashboard smoke 结论

有条件通过。

本次只做只读审查、自动化测试和报告生成，没有开发业务功能。代码路径与测试结果显示 P10 intervention 与 P9 dashboard 已形成主链路：

小程序 before_training / during_training / after_review
→ interventionEvent
→ real-review data-binding intervention-events
→ DashboardSummary.interventions
→ /living-mirror-center 知行提醒分析
→ P9 心镜数据中枢分析提醒效果

条件说明：

- 未执行运行态 HTTP smoke，原因是本任务不启动服务、不写入可能污染 tracked runtime JSON 的测试数据。
- kline-service 本地 main 在审查时落后 origin/main 44 个提交；本次未在 kline-service 执行 checkout / pull，只做只读边界检查和回归测试。
- real-review 和小程序的相关前置分支均已进入 origin/main，自动化测试通过。

## 是否可以进入 P10 总复审

可以。

判断依据：

1. real-review P10-1 已进入 origin/main。
2. 小程序 P10-2 / P10-4 已进入 origin/main。
3. real-review P10-5 已进入 origin/main。
4. 小程序 interventionEvent 写入链路代码成立。
5. DashboardSummary 能读取 intervention / executionPlan。
6. /living-mirror-center 能展示知行提醒分析。
7. 三仓测试通过，缺失测试按 N/A 说明。
8. P10 链路未发现交易建议 / 买卖信号 / 实盘监控文案。
9. kline-service 未承接干预策略。
10. 无 P0 问题。

## 跨端链路图

```text
小程序 before_training / during_training / after_review
  -> interventionEvent payload
  -> real-review data-binding intervention-events
  -> DashboardSummary.interventions / executionPlans
  -> /living-mirror-center 知行提醒分析
  -> P9 心镜数据中枢后续分析提醒效果
```

## 小程序审查

触发点：

- `before_training` / `during_training` / `after_review` / `weekly_plan` 已在 `miniprogram/modules/intervention-engine/index.js` 定义默认规则。
- K 线训练页通过 `presentZhixingReminder` 复用 P5 提醒 UI，用户选择后调用 `saveZhixingReminderResponse`。
- 真实复盘页通过 `presentReviewRepeatReminder` / `saveReviewRepeatReminderResponse` 写入复盘后旧题复现提醒。

Payload：

- `miniprogram/utils/api.js` 调用 `/api/v1/data-binding/users/:userId/intervention-events`。
- 写入同时携带 `intervention_event` 和 `interventionEvent`。
- event payload 覆盖 `triggerType / trigger_type`、`sourceType / source_type`、`errorType / error_type`、`message`、`expectedAction / expected_action`、`userResponse / user_response`、`metadata`。

用户响应：

- 支持 `continue`、`change_to_hold`、`later`、`mute_session`、`followed_plan`、`deviated_again`、`unclear`。
- 复盘后“进入针对训练”映射为 `continue`，并在 metadata 中记录 `action: review_to_training`，没有扩展不兼容响应值。

频率控制：

- 训练中提醒通过 `shouldShowIntervention` 控制 `maxPerSession`、`mute_session`、cooldown。
- `saveZhixingReminderResponse` 更新 `zhixingReminderShownCount` 和 `zhixingReminderLastShownAtByKey`。
- 复盘后旧题复现提醒通过 `shouldShowAfterReviewRepeatReminder` 控制同一 `reviewId` 不重复、同日同 `errorType` 不重复。

Fallback：

- 小程序本地先保存提醒事件，再异步写入远端；`createRemoteInterventionEvent(event).catch(() => {})` 不阻断训练或复盘。
- `syncLocalState({ silent: true }).catch(() => {})` 不阻断主流程。

安全文案：

- `hasForbiddenTradingSignal` / `sanitizeInterventionMessage` 存在。
- 搜索小程序 P10 链路未发现新增交易建议类用户文案；命中项主要为 guard/test 字符串，以及旧内容中的“止盈过早之镜”等非 P10 干预文案。

## real-review 审查

intervention-events：

- `server/src/routes/dataBinding.js` 存在 `GET / POST / PATCH / DELETE /api/v1/data-binding/users/:userId/intervention-events`。
- `server/src/services/dataBinding.js` 通过 `normalizeInterventionEvent` 保存 camelCase / snake_case alias。
- server 测试覆盖创建、查询、过滤、更新、软删除。

intervention-rules：

- 存在 `GET / POST / PATCH / DELETE /api/v1/data-binding/users/:userId/intervention-rules`。
- `normalizeInterventionRule` 兼容 `triggerType / trigger_type`、`expectedAction / expected_action`、`maxPerSession / max_per_session`、`cooldownMinutes / cooldown_minutes`。
- advisory guard 拒绝明显交易建议文案。

execution-plans：

- 存在 `GET / POST / PATCH / DELETE /api/v1/data-binding/users/:userId/execution-plans`。
- `normalizeExecutionPlan` 兼容 `errorType / error_type`、`sceneTags / scene_tags`、`forbiddenActions / forbidden_actions`、`expectedAction / expected_action`、`nextAction / next_action`。

DashboardSummary：

- `getDashboardSummaryBinding` / `buildDashboardSummary` 聚合 `intervention_events` 与 `execution_plans`。
- `buildDashboardInterventionSummary` 输出 `totalCount`、`byTriggerType`、`byUserResponse`、`byErrorType`、`followedPlanRate`、`latestItems`、`dataGaps`。
- `buildDashboardExecutionPlanSummary` 输出计划覆盖、按错题类型统计和 dataGaps。
- 缺少 intervention / executionPlan 时，DashboardSummary 输出 `missing_intervention_events` / `missing_execution_plans` 等 dataGaps，不崩溃。

living-mirror-center：

- `/living-mirror-center` 读取 `DashboardSummary`。
- 页面包含“知行提醒分析”“执行反馈”“样本不足”等展示。
- 页面文案明确：“这里只分析训练和复盘中的知行提醒，观察提醒后的执行反馈，不提供行情判断或收益承诺。”
- 未新增 `/dashboard` 平行页面。

安全边界：

- real-review P10 链路存在 advisory guard。
- 搜索到的交易相关词主要位于历史内容库、题库、guard/test 或非 P10 页面；未发现 P10 intervention + dashboard 链路新增买卖信号、交易建议或实盘监控文案。

## kline-service 边界

- kline-service 中未命中 `interventionEvent / intervention_event / interventionRule / intervention_rule / executionPlan / execution_plan`。
- kline-service 当前职责仍是 K 线片段、训练包、Sampling API、sceneTags、segmentId、trainingPackId、fallbackReason 等训练数据能力。
- 未发现 kline-service 承接干预策略。
- 本次不修改 kline-service，不在该仓库创建分支。

## 测试结果

小程序仓库：

- `node miniprogram/modules/intervention-engine/index.test.js` ✅
- `node miniprogram/modules/zhixing-reminder/index.test.js` ✅
- `node miniprogram/modules/kline-mind/index.test.js` ✅
- `node miniprogram/modules/trade-review/index.test.js` ✅
- `node miniprogram/utils/api.test.js` ✅
- `node miniprogram/utils/data-binding-adapter.test.js` ✅
- `npm run test:data-binding --prefix server` ✅
- `miniprogram/ui-release-r1.test.js`：N/A，文件不存在

real-review server：

- `npm run test:data-binding` ✅
- `npm run test:dashboard-summary` ✅
- `npm run test:interventions` ✅
- `npm run test:execution-plans` ✅
- `npm run check` ✅

real-review contracts：

- `node --test packages/contracts/intervention-contract.test.mjs` ✅
- `node --test packages/contracts/execution-plan-contract.test.mjs` ✅
- `node --test packages/contracts/dashboard-summary-contract.test.mjs` ✅

real-review web-next：

- `npm run test:living-mirror-center` ✅
- `npm run test:data-binding` ✅
- `npm run build` ✅

说明：`npm run build` 有 Next.js workspace root 推断 warning，构建成功。

kline-service：

- `npm run test:sampling --prefix server` ✅
- `npm run test:kline-segments --prefix server` ✅
- `npm run check --prefix server` ✅

## 运行态 HTTP smoke

未做运行态 HTTP smoke。

原因：

- 本任务只审查不开发，不启动服务。
- 写入型 HTTP smoke 需要 POST intervention-events，可能写入 runtime JSON；当前未确认测试隔离和清理方案，按协议避免污染 tracked runtime 数据。

已完成替代验证：

- 代码路径审查：小程序 event 构造与远端写入、real-review 接收和 DashboardSummary 聚合、web-next 展示链路。
- 自动化测试：小程序、real-review server、contracts、web-next、kline-service 相关测试均通过。

建议手动验收路径：

1. 小程序进入 K 线训练页。
2. 进入 review_focus 或 special_training，确认训练提醒出现。
3. 选择“继续 / 本局不再提醒 / 已按计划执行”。
4. 确认 interventionEvent 写入 real-review data-binding，或失败时不阻断训练。
5. 真实复盘保存后确认旧题复现提醒出现并可写用户响应。
6. 打开 `/living-mirror-center`，确认“知行提醒分析”展示提醒总数、执行反馈、触发类型和用户响应分布。

## P0 问题

无。

未发现会阻断 P10 总复审的问题：链路未断、字段不丢、DashboardSummary 可聚合、页面可展示、测试通过。

## P1 问题

1. 未执行运行态 HTTP smoke。建议 P10 总复审或后续 smoke 使用隔离测试用户和可清理 runtime 数据补一轮端到端 POST / GET 验证。
2. kline-service 本地 main 落后 origin/main 44 个提交。本次按只读原则未拉取或切换，建议后续 kline 相关审查前先同步本地仓库。
3. real-review 全仓搜索仍能在历史内容库、题库或旧功能中看到“止盈 / 目标价 / 卖出信号”等词。当前 P10 链路无新增交易建议，但后续总复审应继续区分历史内容与用户端 P10 文案。

## P2 问题

1. 可以补一个不写 tracked runtime 的 HTTP smoke 脚本，使用临时数据目录或可清理 fixture。
2. `/living-mirror-center` 后续可在样本不足时展示更明确的数据缺口下一步，例如“先完成一次训练提醒响应”。
3. 小程序远端 event 写入失败目前不阻断主流程，也不强提示；后续可考虑只在开发调试模式暴露轻量同步状态。

## 下一步建议

建议进入 P10 阶段总复审。

推荐下一条任务：

```text
任务：P10 阶段总复审，只审查不开发，并将报告合并到 main
期望仓库：yangming-trading-system-miniprogram
目标分支：audit/p10-final-review
前置依赖：P10-1 / P10-2 / P10-3 / P10-4 / P10-5 / P10-6 均已合并并 push 到 origin/main
```
