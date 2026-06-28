const assert = require("assert");
const fs = require("fs");
const path = require("path");

const apiSource = fs.readFileSync(path.join(__dirname, "api.js"), "utf8");
const storeSource = fs.readFileSync(path.join(__dirname, "store.js"), "utf8");
const storageKeysSource = fs.readFileSync(path.join(__dirname, "../core/storage-keys.js"), "utf8");

assert.ok(apiSource.includes("buildKLineBindingPayload"));
assert.ok(apiSource.includes("buildTradeReviewBindingPayload"));
assert.ok(apiSource.includes("syncTrainingProgress"));
assert.ok(apiSource.includes("syncTradeReviewRecord"));
assert.ok(apiSource.includes("requestKlineTrainingSample"));
assert.ok(apiSource.includes("fetchKlineTrainingSlice"));
assert.ok(apiSource.includes("/api/v1/data-binding/users/"));
assert.ok(apiSource.includes("/kline-records"));
assert.ok(apiSource.includes("/trade-reviews"));
assert.ok(apiSource.includes("/api/v1/kline-training/sample"));
assert.ok(apiSource.includes("/api/v1/kline-history/slice"));
assert.ok(apiSource.includes("data: klinePayload"));
assert.ok(apiSource.includes("data: payload"));
assert.ok(apiSource.includes("source_type"));
assert.ok(apiSource.includes("training_pack_id"));
assert.ok(apiSource.includes("exclude_segment_ids"));
assert.ok(apiSource.includes("trainingLength"));
assert.ok(apiSource.includes("start_date"));
assert.ok(apiSource.includes("end_date"));
assert.ok(storageKeysSource.includes("YM_ZHIXING_REMINDER_EVENTS"));
assert.ok(storeSource.includes("saveZhixingReminderEvent"));
assert.ok(storeSource.includes("getZhixingReminderEvents"));
assert.ok(storeSource.includes("intervention_event"));
assert.ok(storeSource.includes("intervention_events"));
assert.ok(storageKeysSource.includes("YM_EXECUTION_PLAN_LIBRARY"));
assert.ok(storeSource.includes("getExecutionPlanLibrary"));
assert.ok(storeSource.includes("saveExecutionPlanLibrary"));
assert.ok(storeSource.includes("execution_plan"));
assert.ok(storeSource.includes("executionPlan"));

const forbiddenTerms = ["守法", "破法", "守法率"];
forbiddenTerms.forEach((term) => {
  assert.strictEqual(apiSource.includes(term), false, `api source should not include ${term}`);
});

console.log("miniprogram api sync tests passed");
