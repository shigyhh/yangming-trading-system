const assert = require("assert");
const {
  DEFAULT_EXECUTION_PLANS,
  buildExecutionPlanLibrary,
  createExecutionPlan,
  updateExecutionPlan,
  deleteExecutionPlan,
  findExecutionPlanForErrorType,
  resolveExecutionPlanAction
} = require("./index");

assert.strictEqual(DEFAULT_EXECUTION_PLANS.length, 4);
assert.deepStrictEqual(DEFAULT_EXECUTION_PLANS.map((item) => item.errorType), [
  "追高冲动",
  "补仓冲动",
  "卖飞懊悔",
  "计划外交易"
]);

const library = buildExecutionPlanLibrary();
assert.strictEqual(library.records.length, 4);
assert.strictEqual(library.records[0].errorType, library.records[0].error_type);
assert.deepStrictEqual(library.records[0].sceneTags, library.records[0].scene_tags);
assert.deepStrictEqual(library.records[0].firstThoughts, library.records[0].first_thoughts);
assert.deepStrictEqual(library.records[0].forbiddenActions, library.records[0].forbidden_actions);
assert.strictEqual(library.records[0].expectedAction, library.records[0].expected_action);
assert.strictEqual(library.records[0].nextAction, library.records[0].next_action);
assert.deepStrictEqual(library.records[0].trainingPrescription, library.records[0].training_prescription);
assert.strictEqual(library.records[0].enabled, true);

const customPlan = createExecutionPlan({
  title: "追高冲动自定义计划",
  error_type: "追高冲动",
  scene_tags: "放量拉升 / 假突破",
  first_thoughts: "怕错过 / 来不及",
  forbidden_actions: "第一根放量不追",
  expected_action: "先观察两根确认",
  next_action: "先观察两根确认",
  training_prescription: "追高冲动专项强化"
}, { id: "plan-custom-1", now: "2026-06-28T10:00:00.000Z", userId: "user-1" });

assert.strictEqual(customPlan.id, "plan-custom-1");
assert.strictEqual(customPlan.userId, "user-1");
assert.strictEqual(customPlan.user_id, "user-1");
assert.strictEqual(customPlan.errorType, "追高冲动");
assert.strictEqual(customPlan.expectedAction, "先观察两根确认");
assert.strictEqual(customPlan.expected_action, "先观察两根确认");
assert.strictEqual(customPlan.trainingPrescription.action, "追高冲动专项强化");
assert.strictEqual(customPlan.training_prescription.action, "追高冲动专项强化");
assert.strictEqual(customPlan.createdAt, "2026-06-28T10:00:00.000Z");
assert.strictEqual(customPlan.created_at, "2026-06-28T10:00:00.000Z");

const customLibrary = buildExecutionPlanLibrary({
  records: library.records.concat(customPlan)
});
const matchedCustom = findExecutionPlanForErrorType("追涨之镜", customLibrary);
assert.strictEqual(matchedCustom.id, "plan-custom-1");
assert.strictEqual(resolveExecutionPlanAction("追涨之镜", customLibrary).nextAction, "先观察两根确认");

const updated = updateExecutionPlan(customLibrary, "plan-custom-1", {
  nextAction: "先停十秒，再观察两根确认",
  enabled: true
});
assert.strictEqual(findExecutionPlanForErrorType("追高冲动", updated).nextAction, "先停十秒，再观察两根确认");

const deletedCustom = deleteExecutionPlan(updated, "plan-custom-1");
assert.strictEqual(deletedCustom.records.some((item) => item.id === "plan-custom-1"), false);
assert.strictEqual(findExecutionPlanForErrorType("追高冲动", deletedCustom).source, "default");

const disabledDefault = deleteExecutionPlan(deletedCustom, "default-chase-high");
assert.strictEqual(disabledDefault.records.find((item) => item.id === "default-chase-high").enabled, false);
assert.strictEqual(findExecutionPlanForErrorType("追高冲动", disabledDefault), null);

assert.strictEqual(resolveExecutionPlanAction("补仓冲动", null).nextAction, "先确认是否破位，不用补仓证明自己");
assert.strictEqual(resolveExecutionPlanAction("未知错题", null), null);

console.log("execution plan module tests passed");
