const assert = require("assert");
const {
  ACTION_OPTIONS,
  BOUNDARY_STATES,
  STAGE_POSITIONS,
  buildHistoricalMatch,
  buildLiveMirrorReminder,
  buildLivingMirrorStats,
  buildTradeReview
} = require("./index");

assert.ok(ACTION_OPTIONS.length >= 6);
assert.ok(BOUNDARY_STATES.length >= 3);
assert.ok(STAGE_POSITIONS.length >= 6);

const match = buildHistoricalMatch({
  marketKey: "crypto",
  timeframeKey: "5m",
  tradeDate: "2026-06-01",
  symbol: "BTC",
  stagePositionKey: "open_fast"
});
assert.strictEqual(match.marketLabel, "数字货币");
assert.strictEqual(match.timeframeLabel, "5分钟");
assert.strictEqual(match.stagePosition, "开盘加速段");

const review = buildTradeReview({
  marketKey: "cn",
  timeframeKey: "1d",
  tradeDate: "2026-06-01",
  symbol: "示例标的",
  actionKey: "impulse",
  emotion: "急躁",
  firstThought: "我怕错过这一段",
  planBoundary: "只按计划记录",
  boundaryState: "near",
  stagePositionKey: "open_fast",
  reviewNote: "回看后发现第一念很快。"
}, {
  assessment: { primary: "冲动型" }
});

assert.strictEqual(review.relatedPersonality, "冲动型");
assert.strictEqual(review.relatedMirror, "追涨之镜");
assert.deepStrictEqual(review.heartThieves, ["贪", "急"]);
assert.strictEqual(review.verdict, "你追的不是行情，是怕被机会抛下的不安。");
assert.strictEqual(review.includeInRetest, true);
assert.ok(review.scores.boundary > 0);
assert.ok(review.evidenceChain.length >= 6);
assert.ok(review.oneLine.includes("照见"));

const secondReview = buildTradeReview({
  marketKey: "cn",
  timeframeKey: "30m",
  tradeDate: "2026-06-02",
  symbol: "示例标的",
  actionKey: "hold",
  emotion: "恐惧",
  firstThought: "我开始想重新解释边界",
  planBoundary: "触碰边界只做记录",
  boundaryState: "lost",
  stagePositionKey: "near_boundary",
  reviewNote: "这次看见迟疑。"
});

const reminder = buildLiveMirrorReminder({ records: [review, secondReview] });
assert.strictEqual(reminder.hasRecords, true);
assert.strictEqual(reminder.count, 2);
assert.notStrictEqual(reminder.highFrequencyThievesText, "待照见");
assert.ok(reminder.highFrequencyStage);
assert.ok(reminder.mainTraining.length > 8);

const emptyReminder = buildLiveMirrorReminder({ records: [] });
assert.strictEqual(emptyReminder.hasRecords, false);
assert.ok(emptyReminder.primaryActionText.includes("上传"));

const stats = buildLivingMirrorStats({ records: [review, secondReview] });
assert.strictEqual(stats.totalReviews, 2);
assert.ok(stats.mirrorScores["追涨之镜"] >= 1);
assert.ok(stats.thiefCounts["贪"] >= 1);
assert.ok(stats.reviewHistory.length >= 2);
assert.ok(stats.assistantHandoff.currentMirror);

console.log("trade-review module tests passed");
