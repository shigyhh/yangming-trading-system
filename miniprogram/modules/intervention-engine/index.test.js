const assert = require("assert");
const {
  DEFAULT_INTERVENTION_RULES,
  buildInterventionContext,
  buildInterventionEventPayload,
  buildInterventionReminder,
  hasForbiddenTradingSignal,
  normalizeExecutionPlan,
  normalizeInterventionEvent,
  normalizeInterventionResources,
  normalizeInterventionRule,
  sanitizeInterventionMessage,
  shouldShowIntervention
} = require("./index");

const rule = normalizeInterventionRule({
  id: "rule-snake",
  user_id: "user-1",
  trigger_type: "before_training",
  error_type: "追高冲动",
  scene_tags: "放量拉升 / 假突破",
  message_template: "先停一下，这可能是你的高频旧题：{{errorType}}。本次只练一个动作：{{expectedAction}}。",
  expected_action: "先按规则停一下",
  max_per_session: "2",
  cooldown_minutes: "30",
  priority: "20"
});
assert.strictEqual(rule.triggerType, "before_training");
assert.strictEqual(rule.trigger_type, "before_training");
assert.deepStrictEqual(rule.sceneTags, ["放量拉升", "假突破"]);
assert.deepStrictEqual(rule.scene_tags, ["放量拉升", "假突破"]);
assert.strictEqual(rule.maxPerSession, 2);
assert.strictEqual(rule.cooldownMinutes, 30);
assert.strictEqual(rule.priority, 20);

const plan = normalizeExecutionPlan({
  id: "plan-camel",
  errorType: "追高冲动",
  sceneTags: ["放量拉升"],
  expectedAction: "第一根放量不追",
  nextAction: "先观察两根确认",
  enabled: true
});
assert.strictEqual(plan.error_type, "追高冲动");
assert.strictEqual(plan.expected_action, "第一根放量不追");
assert.strictEqual(plan.next_action, "先观察两根确认");

const normalizedEvent = normalizeInterventionEvent({
  id: "event-snake",
  trigger_type: "during_training",
  error_type: "追高冲动",
  scene_tags: "放量拉升 / 冲高回落",
  expected_action: "先观察",
  user_response: "已按计划执行"
});
assert.strictEqual(normalizedEvent.triggerType, "during_training");
assert.strictEqual(normalizedEvent.userResponse, "followed_plan");
assert.deepStrictEqual(normalizedEvent.scene_tags, ["放量拉升", "冲高回落"]);

const context = buildInterventionContext({
  trigger_type: "before_training",
  source_type: "review_focus",
  session_id: "session-1",
  error_type: "追高冲动",
  scene_tags: ["放量拉升"],
  first_thought: "怕错过"
});
assert.strictEqual(context.triggerType, "before_training");
assert.strictEqual(context.source_type, "review_focus");
assert.deepStrictEqual(context.sceneTags, ["放量拉升"]);

const beforeReminder = buildInterventionReminder({
  context,
  plans: [plan],
  rules: [
    Object.assign({}, rule, { id: "rule-low", priority: 1, messageTemplate: "低优先级 {{expectedAction}}" }),
    Object.assign({}, rule, { id: "rule-high", priority: 99, messageTemplate: "高优先级 {{errorType}}：{{expectedAction}}" })
  ],
  dashboardSummary: {
    mistakes: { topErrorTypes: [{ key: "追高冲动", count: 4 }] }
  }
});
assert.strictEqual(beforeReminder.triggerType, "before_training");
assert.strictEqual(beforeReminder.ruleId, "rule-high");
assert.strictEqual(beforeReminder.planId, "plan-camel");
assert.strictEqual(beforeReminder.expectedAction, "第一根放量不追");
assert.strictEqual(beforeReminder.message.includes("高优先级 追高冲动：第一根放量不追"), true);

const duringReminder = buildInterventionReminder({
  context: buildInterventionContext({
    triggerType: "during_training",
    sourceType: "special_training",
    errorType: "追高冲动",
    sceneTags: ["放量拉升"],
    userAction: "追涨"
  }),
  plans: [plan],
  rules: [Object.assign({}, rule, { triggerType: "during_training", trigger_type: "during_training" })]
});
assert.strictEqual(duringReminder.triggerType, "during_training");
assert.strictEqual(duringReminder.message.includes("第一根放量不追"), true);

const afterReviewReminder = buildInterventionReminder({
  context: buildInterventionContext({
    triggerType: "after_review",
    errorType: "追高冲动",
    firstThought: "怕错过",
    triggerScene: "放量拉升"
  }),
  plans: [plan],
  rules: [],
  dashboardSummary: {
    firstThoughts: { topFirstThoughts: [{ key: "怕错过", count: 3 }] },
    triggerScenes: { topTriggerScenes: [{ key: "放量拉升", count: 3 }] }
  }
});
assert.strictEqual(afterReviewReminder.triggerType, "after_review");
assert.strictEqual(afterReviewReminder.message.includes("第一念重复"), true);
assert.strictEqual(afterReviewReminder.message.includes("触发场景重复"), true);

assert.strictEqual(shouldShowIntervention(context, {
  shownCount: 2,
  maxPerSession: 2
}).show, false);
assert.strictEqual(shouldShowIntervention(context, {
  muted: true,
  shownCount: 0
}).show, false);
assert.strictEqual(shouldShowIntervention(context, {
  shownCount: 0,
  lastShownAtByKey: { "before_training:追高冲动": Date.now() - 1000 },
  cooldownMs: 60 * 1000
}).show, false);
assert.strictEqual(shouldShowIntervention(context, {
  shownCount: 0,
  lastShownAtByKey: { "before_training:追高冲动": Date.now() - 2 * 60 * 1000 },
  cooldownMs: 60 * 1000
}).show, true);

const fallbackResources = normalizeInterventionResources({
  rulesError: new Error("rules failed"),
  plansError: new Error("plans failed"),
  dashboardError: new Error("dashboard failed"),
  localExecutionPlanLibrary: { records: [plan] }
});
assert.strictEqual(fallbackResources.rules.length >= DEFAULT_INTERVENTION_RULES.length, true);
assert.strictEqual(fallbackResources.plans[0].id, "plan-camel");
assert.strictEqual(fallbackResources.dashboardSummary, null);
assert.deepStrictEqual(fallbackResources.fallbacks, ["rules", "plans", "dashboard"]);

assert.strictEqual(hasForbiddenTradingSignal("建议买入"), true);
assert.strictEqual(hasForbiddenTradingSignal("先停一下，这可能是你的高频旧题。"), false);
const sanitized = sanitizeInterventionMessage("建议买入，目标价到了就卖");
assert.strictEqual(hasForbiddenTradingSignal(sanitized), false);
assert.strictEqual(sanitized.includes("当前只做训练提醒，不是买卖建议"), true);

const payload = buildInterventionEventPayload({
  reminder: beforeReminder,
  context,
  userResponse: "已按计划执行",
  createdAt: "2026-06-29T00:00:00.000Z"
});
assert.strictEqual(payload.triggerType, "before_training");
assert.strictEqual(payload.trigger_type, "before_training");
assert.strictEqual(payload.errorType, "追高冲动");
assert.strictEqual(payload.expectedAction, "第一根放量不追");
assert.strictEqual(payload.userResponse, "followed_plan");
assert.strictEqual(payload.user_response, "followed_plan");
assert.strictEqual(hasForbiddenTradingSignal(payload.message), false);

console.log("intervention engine tests passed");
