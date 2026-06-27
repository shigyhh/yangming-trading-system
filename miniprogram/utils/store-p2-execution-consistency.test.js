const assert = require("assert");

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
  getLivingMirrorStats,
  saveKlineSessionRecord,
  saveTradeReviewRecord
} = require("./store");

function resetStorage() {
  Object.keys(storage).forEach((key) => {
    delete storage[key];
  });
}

function recentDate(daysAgo) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

resetStorage();
saveTradeReviewRecord({
  id: "review-p2-execution-001",
  symbol: "300223",
  tradeDate: recentDate(8),
  actionLabel: "买入",
  firstThought: "怕错过",
  mainErrorType: "追高冲动",
  execution_result: "aligned"
});
saveTradeReviewRecord({
  id: "review-p2-execution-002",
  symbol: "300224",
  tradeDate: recentDate(7),
  actionLabel: "买入",
  firstThought: "怕错过",
  mainErrorType: "追高冲动",
  execution_result: "deviated",
  repeat_count: 1
});
saveTradeReviewRecord({
  id: "review-p2-execution-003",
  symbol: "300225",
  tradeDate: recentDate(6),
  actionLabel: "观望",
  firstThought: "说不清",
  mainErrorType: "计划外交易",
  execution_result: "unclear"
});
saveKlineSessionRecord({
  id: "kline-session-p2-execution-001",
  completedAt: `${recentDate(5)}T10:00:00+08:00`,
  errorType: "追高冲动",
  firstThought: "怕错过",
  trainingMistakeCard: {
    execution_result: "执行偏离",
    repeat_count: 2,
    error_type: "追高冲动"
  },
  trainingResult: {
    total_actions: 3
  }
});

const stats = getLivingMirrorStats().executionConsistencyStats;
assert.strictEqual(stats.hasStats, true);
assert.strictEqual(stats.sampleCount, 3);
assert.strictEqual(stats.alignedCount, 1);
assert.strictEqual(stats.deviatedCount, 2);
assert.strictEqual(stats.repeatCount, 3);
assert.strictEqual(stats.rate, 33);
assert.strictEqual(stats.rateText, "33%");
assert.strictEqual(stats.topDeviationType.label, "追高冲动");
assert.strictEqual(stats.topDeviationType.count, 2);
assert.strictEqual(stats.topFirstThought.label, "怕错过");
assert.strictEqual(stats.topFirstThought.count, 3);

resetStorage();
const emptyStats = getLivingMirrorStats().executionConsistencyStats;
assert.strictEqual(emptyStats.hasStats, false);
assert.strictEqual(emptyStats.rateText, "样本不足");

console.log("store p2 execution consistency tests passed");
