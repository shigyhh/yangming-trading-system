const assert = require("assert");
const { YM_TRADE_REVIEW_RECORDS } = require("../core/storage-keys");

const storage = {};

global.wx = {
  getStorageSync(key) {
    return storage[key];
  },
  setStorageSync(key, value) {
    storage[key] = value;
  }
};

const {
  getTradeReviewRecords,
  saveTradeReviewRecord
} = require("./store");

function resetStorage() {
  Object.keys(storage).forEach((key) => {
    delete storage[key];
  });
}

resetStorage();
const storedState = saveTradeReviewRecord({
  id: "review-p1-storage-001",
  symbol: "300223",
  tradeDate: "2026-06-27",
  actionLabel: "买入",
  status: "持仓中",
  firstThought: "怕错过",
  triggerScene: "放量拉升",
  nextRule: "第一根放量不追，先停十秒",
  mainErrorType: "追高冲动",
  secondaryErrorTypes: ["计划外交易"],
  trainingPrescription: {
    title: "追高冲动专项训练",
    focusText: "放量拉升 / 假突破 / 冲高回落",
    packId: "chase_high_impulse",
    rule: "第一根放量不追，先停十秒"
  },
  inPlan: "no",
  positionLevel: "半仓",
  lawResult: "执行偏离"
});
const savedRecord = storedState.latest;

assert.strictEqual(savedRecord.mainErrorType, "追高冲动");
assert.strictEqual(savedRecord.main_error_type, "追高冲动");
assert.strictEqual(savedRecord.firstThought, "怕错过");
assert.strictEqual(savedRecord.first_thought, "怕错过");
assert.strictEqual(savedRecord.triggerScene, "放量拉升");
assert.strictEqual(savedRecord.trigger_scene, "放量拉升");
assert.strictEqual(savedRecord.nextRule, "第一根放量不追，先停十秒");
assert.strictEqual(savedRecord.next_rule, "第一根放量不追，先停十秒");
assert.deepStrictEqual(savedRecord.secondaryErrorTypes, ["计划外交易"]);
assert.deepStrictEqual(savedRecord.secondary_error_types, ["计划外交易"]);
assert.strictEqual(savedRecord.isPlanned, false);
assert.strictEqual(savedRecord.is_planned, false);
assert.strictEqual(savedRecord.positionLevel, "半仓");
assert.strictEqual(savedRecord.position_level, "半仓");
assert.strictEqual(savedRecord.lawResult, "执行偏离");
assert.strictEqual(savedRecord.law_result, "执行偏离");
assert.strictEqual(savedRecord.trainingPrescription.title, "追高冲动专项训练");
assert.strictEqual(savedRecord.training_prescription.title, "追高冲动专项训练");

resetStorage();
const invalidState = saveTradeReviewRecord({
  id: "review-p1-storage-002",
  symbol: "600123",
  firstThought: "说不清",
  mainErrorType: "随手生成的错题类型",
  trainingPrescription: "随手生成的训练"
});
assert.strictEqual(invalidState.latest.main_error_type, "计划外交易");
assert.strictEqual(invalidState.latest.training_prescription.title, "计划外交易专项训练");

resetStorage();
storage[YM_TRADE_REVIEW_RECORDS] = {
  latest: null,
  records: [
    {
      id: "legacy-review-001",
      symbol: "600000",
      tradeDate: "2026-06-01"
    }
  ]
};
const legacyState = getTradeReviewRecords();
assert.strictEqual(legacyState.records[0].id, "legacy-review-001");

const nextState = saveTradeReviewRecord({
  id: "review-p1-storage-003",
  symbol: "300001",
  firstThought: "不甘心"
});
assert.ok(nextState.records.some((record) => record.id === "legacy-review-001"));
assert.ok(nextState.records.some((record) => record.id === "review-p1-storage-003"));

console.log("store p1 review error type tests passed");
