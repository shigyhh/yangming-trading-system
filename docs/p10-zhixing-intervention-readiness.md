# P10-0 深度知行提醒 / 干预系统前置审查

## P10-0 深度知行提醒 / 干预系统前置审查结论

可进入 P10-1。

P9 总复审已在 real-review `origin/main`，结论为通过，并明确可以进入 P10。小程序 P5、P6、P8-3C 也已进入 `origin/main`。当前不建议直接开发小程序深度提醒 UI；P10-1 应先在 real-review 侧补齐 `interventionEvent` / `interventionRule` contract 与 data-binding API，并同步明确 `executionPlan` 的跨端契约。

## 现有小程序提醒能力

- 触发点：
  - 训练前：`buildTrainingPreReminder`，`triggerType = before_training`。
  - 训练中：`buildTrainingSceneReminder`，`triggerType = during_training`。
  - 复盘后：`buildReviewRepeatReminder`，`triggerType = after_review`。
- 页面落点：
  - 训练页 `miniprogram/pages/kline-mind/index.js` 使用 modal / action sheet 承接训练前和训练中提醒。
  - 复盘页 `miniprogram/pages/trade-review/index.js` 在复盘保存后展示旧题复现提醒。
- 当前用户响应：
  - `continue`
  - `change_to_hold`
  - `later`
  - `mute_session`
- 每局限制：
  - `DEFAULT_MAX_SESSION_REMINDERS = 2`。
  - 训练中保存响应后递增 `zhixingReminderShownCount`。
  - 选择 `mute_session` 后设置 `zhixingReminderDisabled`。
- 当前 `interventionEvent` 写入：
  - `createInterventionEvent` 生成轻量事件。
  - `saveZhixingReminderEvent` 写入 `YM_ZHIXING_REMINDER_EVENTS` 本地 storage。
  - `collectLocalState` 会暴露 `intervention_event` / `intervention_events` / `interventionEvent` / `interventionEvents`。
- 当前字段：
  - 已有：`id`、`userId/user_id`、`triggerType/trigger_type`、`errorType/error_type`、`sceneTag/scene_tag`、`message`、`userResponse/user_response`、`createdAt/created_at`。
  - 缺口：`sourceType/source_type`、`sessionId/session_id`、`reviewId/review_id`、`planId/plan_id`、`firstThought/first_thought`、`sceneTags/scene_tags`、`suggestedAction/suggested_action`、`expectedAction/expected_action`、`executionResult/execution_result`。
- 文案边界：
  - 当前提醒主要围绕“高频旧题”“本次只练一个动作”“旧题复现提醒”。
  - 未发现直接“买入 / 卖出建议”式提醒，但 P10 深化时必须继续避免交易信号化表达。

## 现有执行计划能力

- 我的页入口：
  - `miniprogram/pages/profile/index.js` 中有“我的执行计划”入口。
  - 页面落点为 `miniprogram/pages/execution-plan/index`。
- 本地数据：
  - storage key：`YM_EXECUTION_PLAN_LIBRARY`。
  - 模块：`miniprogram/modules/execution-plan/index.js`。
- 默认计划：
  - 追高冲动执行计划。
  - 补仓冲动执行计划。
  - 卖飞懊悔执行计划。
  - 计划外交易执行计划。
- 核心字段：
  - `errorType/error_type`
  - `sceneTags/scene_tags`
  - `firstThoughts/first_thoughts`
  - `forbiddenActions/forbidden_actions`
  - `expectedAction/expected_action`
  - `nextAction/next_action`
  - `trainingPrescription/training_prescription`
  - `enabled`
- 已被读取的位置：
  - 复盘错题卡：`miniprogram/modules/trade-review/index.js` 通过 `resolveExecutionPlanAction` 优先取计划动作。
  - 今日针对训练：`miniprogram/pages/kline-mind/index.js` 将计划动作合入 review_focus。
  - 知行提醒：`miniprogram/modules/zhixing-reminder/index.js` 使用执行计划覆盖默认动作。
- 数据共通状态：
  - 小程序会在本地同步状态中暴露 `execution_plan` / `execution_plans` / `executionPlan` / `executionPlans`。
  - real-review P9 DashboardSummary 可读取 raw `execution_plans` 并生成执行计划摘要和 dataGaps。
  - 尚未看到独立的 `executionPlan` contract + data-binding CRUD API。

## real-review 数据承接能力

- 已有能力：
  - `DashboardSummary` contract 已包含 `interventions`、`executionPlans`、`dataGaps`。
  - `DashboardInterventionSummary` 统计 `totalCount`、`byTriggerType`、`byUserResponse`。
  - `DashboardExecutionPlanSummary` 统计 `totalCount`、`enabledCount`、`byErrorType`。
  - `buildDashboardSummary` 会从 data-binding raw state 读取 `intervention_events` / `interventionEvents` 与 `execution_plans` / `executionPlans`。
  - `buildDashboardDataGaps` 会在缺少提醒事件或执行计划时输出 `missingInterventionEvents` / `missingExecutionPlans`。
  - mirror archive 已把 `intervention_event` 和 `execution_plan` 纳入证据类型。
- 缺口：
  - 未看到正式 `InterventionEvent` contract。
  - 未看到正式 `InterventionRule` contract。
  - 未看到独立的 interventionEvent data-binding 写入 / 查询 / 更新 API。
  - 未看到独立的 executionPlan data-binding CRUD API。
  - DashboardSummary 目前能汇总 raw data，但不能替代 P10 所需的写入契约。

## P9 反哺 P10 的能力

P9 已经能为 P10 提供提醒依据：

- `DashboardSummary.mistakes.topErrorTypes`：高频错题类型。
- `DashboardSummary.firstThoughts.topFirstThoughts`：高频第一念。
- `DashboardSummary.triggerScenes.topTriggerScenes`：高频触发场景。
- `DashboardSummary.execution`：执行一致性、偏离、样本量。
- `DashboardSummary.interventions`：提醒次数、触发类型、用户响应统计。
- `DashboardSummary.executionPlans`：执行计划数量、启用数量、错题类型分布。
- `DashboardSummary.dataGaps`：提示提醒事件和执行计划缺口。
- `WeeklyMirrorSummary.nextWeekTrainingPlan`：可作为周期提醒计划来源。
- `ArchiveIndex` / `MirrorArchive`：可把提醒事件和执行计划纳入证据层。
- `LivingMirrorGrowthProjection`：可在 P10 后观察提醒是否改善行为循环。

P10 应写回 `interventionEvent`，让 P9 后续能统计提醒次数、响应分布、提醒后是否仍执行偏离。

## kline-service 参与边界

- kline-service 当前能力：
  - `kline-segment` contract 提供 `sceneTags/scene_tags`、`errorTypes/error_types`、`trainingPackIds/training_pack_ids`。
  - `kline-sampling` contract 提供 `segmentId/segment_id`、`trainingPackId/training_pack_id`、`sceneTags/scene_tags`、`fallbackReason/fallback_reason`。
  - sampling service 根据 `errorType`、`sceneTags`、`trainingPackId` 选择片段。
- P10 不需要 kline-service 新接口。
- kline-service 不应承接：
  - 提醒策略。
  - 干预规则。
  - 用户响应记录。
  - 买卖建议或实盘监控。
- P10 应在小程序或 real-review 基于 sceneTags / sampling metadata 触发提醒，不把干预逻辑下沉到 kline-service。

## P10 目标边界

P10 深度知行提醒 / 干预系统升级目标：

1. 训练前提醒：
   - 基于今日训练类型、错题类型、执行计划。
2. 训练中提醒：
   - 基于 sceneTags、旧题复现、用户动作偏离。
3. 复盘后提醒：
   - 基于同类错题重复、第一念重复、触发场景重复。
4. 周期提醒：
   - 基于 P9 周报和 `nextWeekTrainingPlan`。
5. 用户响应：
   - 继续。
   - 改为观望。
   - 稍后再练。
   - 本局不再提醒。
   - 已按计划执行。
   - 仍然偏离。
6. 事件写入：
   - `interventionEvent / intervention_event`。
7. 后续分析：
   - P9 看板统计提醒次数、响应分布、提醒后是否改善。

## P10 禁止范围

P10 不做：

- 股票买卖信号。
- 买入 / 卖出建议。
- 实盘监控。
- 自动盯盘。
- 价格触发交易提醒。
- 预测涨跌。
- 收益承诺。
- 排行榜。
- 社区炫耀。
- 外部 push 推送，除非后续单独合规审查。
- kline-service 干预逻辑。

P10 文案不得出现：

- 建议买入。
- 建议卖出。
- 现在可以买。
- 现在该卖。
- 目标价。
- 止盈止损建议。
- 预测涨跌。
- 明日看涨 / 看跌。

P10 文案应使用：

- 先停一下。
- 这可能是你的高频旧题。
- 本次只练一个动作。
- 按你的执行计划处理。
- 先记录，再行动。
- 是否仍按计划？
- 是否出现执行偏离？
- 稍后再练。

## P10 推荐数据结构

### interventionEvent / intervention_event

```js
{
  id,
  userId, user_id,
  triggerType, trigger_type,

  sourceType, source_type,
  sessionId, session_id,
  reviewId, review_id,
  planId, plan_id,

  errorType, error_type,
  firstThought, first_thought,
  sceneTags, scene_tags,
  triggerScene, trigger_scene,

  message,
  suggestedAction, suggested_action,
  expectedAction, expected_action,

  userResponse, user_response,
  executionResult, execution_result,

  createdAt, created_at
}
```

### interventionRule / intervention_rule

```js
{
  id,
  title,
  errorType, error_type,
  sceneTags, scene_tags,
  triggerType, trigger_type,
  messageTemplate, message_template,
  expectedAction, expected_action,
  enabled,
  priority
}
```

### triggerType

- `before_training`
- `during_training`
- `after_review`
- `weekly_plan`
- `repeated_mistake`
- `execution_deviation`

### userResponse

- `continue`
- `change_to_hold`
- `later`
- `mute_session`
- `followed_plan`
- `deviated_again`
- `unclear`

## P10 阶段拆分建议

### P10-1：real-review intervention contract + data-binding API

- 目标仓库：`yangming-trading-system-real-review`。
- 建议分支：`feature/p10-intervention-contract-api`。
- 内容：
  - 新增 `InterventionEvent` contract。
  - 新增 `InterventionRule` contract。
  - 新增或补齐 data-binding intervention-events 写入 / 查询 / 更新接口。
  - 明确 `executionPlan` 是否同步纳入正式 contract + API；若不纳入，需要单独 P10-1B。
  - DashboardSummary 继续复用现有 `interventions` / `executionPlans` 统计口径。

### P10-2：小程序提醒引擎升级

- 目标仓库：`yangming-trading-system-miniprogram`。
- 读取 executionPlan、P9 summary、sceneTags、repeat / execution data。
- 输出更完整的 `interventionEvent` metadata。

### P10-3：小程序训练中提醒 UI / 用户响应记录

- 保持训练页既有入口。
- 增加 `followed_plan` / `deviated_again` / `unclear`。
- 控制打扰频率，不做外部推送。

### P10-4：复盘后旧题复现提醒升级

- 复用复盘页和活镜统计。
- 基于错题类型、第一念、触发场景重复生成提醒。

### P10-5：P9 看板接入 intervention analysis

- real-review DashboardSummary 展示提醒次数、响应分布、提醒后执行结果。
- 不新增平行看板。

### P10-6：P10 跨端 smoke

- 验证 real-review contract/API、小程序写入、P9 看板读取、无交易建议信号化文案。

## 下一条 Codex 命令建议

下一步应执行：

- 任务：P10-1 real-review 补 interventionEvent / interventionRule contract + data-binding API。
- 目标仓库：`yangming-trading-system-real-review`。
- 目标分支建议：`feature/p10-intervention-contract-api`。
- 前置分支：
  - real-review `audit/p9-mirror-data-center-final-review`
  - miniprogram `audit/p10-zhixing-intervention-readiness`
- 边界：
  - 不改小程序 UI。
  - 不改 kline-service。
  - 不做交易信号。
  - 不做买卖建议。

## 风险点

- 文案被误解为交易建议：P10 必须只说觉察、执行计划、复盘和训练动作。
- 小程序提醒与网页看板字段分裂：必须先统一 `interventionEvent` contract。
- `interventionEvent` 仍停留在本地轻量事件：P9 难以稳定分析提醒效果。
- `executionPlan` 仍本地化：网页默认计划、规则配置和小程序计划库可能分裂。
- 提醒过多造成打扰：P10 应保留每局次数限制和本局静默。
- kline-service 承担不该承担的干预逻辑：P10 只读 kline-service metadata，不把策略下沉过去。
