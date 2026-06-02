const assert = require("assert");
const {
  createKlineSession,
  getKlineScenario,
  getKlineScenarios,
  recordKlineReaction,
  buildKlineReview,
  buildKlineTradeReviewRecord,
  buildKlineDayRetestComparison,
  getKlineRecommendationForMirror,
  createMirrorChallenge,
  buildKlineChange
} = require("./index");

const scenarios = getKlineScenarios();
assert.ok(scenarios.length >= 9);
assert.ok(scenarios[0].mirrorNames.includes("追涨之镜"));
assert.strictEqual(scenarios[0].marketLabel, "A股");
assert.strictEqual(scenarios[0].timeframeLabel, "日线");

const hkFast = getKlineScenarios({ marketKey: "hk", timeframeKey: "5m" })[0];
assert.strictEqual(hkFast.marketLabel, "港股");
assert.strictEqual(hkFast.timeframeLabel, "5分钟");

const scene = getKlineScenario("scene-fast-001");
let session = createKlineSession(scene.id);
session.lastStepAt = Date.now() - 2400;
session.currentEmotion = "急躁";
session.currentFirstThought = "我怕错过这一段";
session.currentBoundaryState = "near";
session = recordKlineReaction(session, "rush", scene);
session = recordKlineReaction(session, "position", scene);

const review = buildKlineReview(session, scene, {
  boundary: "计划边界",
  boundaryState: "near",
  changedPlan: false,
  emotion: "急躁",
  firstThought: "我怕错过这一段"
});
assert.strictEqual(review.relatedMirror, "追涨之镜");
assert.deepStrictEqual(review.heartThieves, ["贪", "急"]);
assert.strictEqual(review.emotion, "急躁");
assert.strictEqual(review.firstThought, "我怕错过这一段");
assert.strictEqual(review.impulseWithin3s, true);
assert.strictEqual(review.boundaryStateLabel, "差点失守");
assert.ok(review.processEvidence.length >= 5);
assert.ok(review.scores.impulseDelay >= 0);
assert.ok(review.anonymousStats.rows.length >= 4);
assert.strictEqual(review.marketLabel, "A股");
assert.strictEqual(review.trainingDay, 1);

const recommendation = getKlineRecommendationForMirror("扛单之镜");
assert.strictEqual(recommendation.sceneId, "scene-boundary-001");
assert.ok(recommendation.path.includes("scene-boundary-001"));

const tradeReviewRecord = buildKlineTradeReviewRecord(review);
assert.strictEqual(tradeReviewRecord.sourceType, "kline_training");
assert.strictEqual(tradeReviewRecord.relatedMirror, "追涨之镜");
assert.strictEqual(tradeReviewRecord.historicalMatch.sourceStatus, "历史数据待后端确认");
assert.ok(tradeReviewRecord.scores.boundary > 0);

const challenge = createMirrorChallenge(review, "pause");
assert.strictEqual(challenge.inviterMirror, "追涨之镜");
assert.ok(challenge.comparisonInsight.includes("念头"));

const laterReview = Object.assign({}, review, {
  id: "later",
  createdAt: Date.now() + 1000,
  scores: Object.assign({}, review.scores, { impulseDelay: review.scores.impulseDelay + 10 })
});
const change = buildKlineChange({ records: [review, laterReview] });
assert.strictEqual(change.ready, true);
assert.ok(change.metrics.find((item) => item.key === "impulseDelay").value.includes("提升"));
assert.ok(change.beforeAfterRows.find((item) => item.key === "impulseDelay").deltaText.includes("提升"));

const day7Scene = getKlineScenario("scene-retest-001");
let day7Session = createKlineSession(day7Scene.id);
day7Session.lastStepAt = Date.now() - 5200;
day7Session.currentEmotion = "平静";
day7Session.currentFirstThought = "先写下事实与边界";
day7Session.currentBoundaryState = "kept";
day7Session = recordKlineReaction(day7Session, "clear_pause", day7Scene);
day7Session = recordKlineReaction(day7Session, "write_first", day7Scene);
const day7Review = buildKlineReview(day7Session, day7Scene, {
  boundary: "计划边界",
  boundaryState: "kept",
  firstThought: "先写下事实与边界"
});
const dayRetest = buildKlineDayRetestComparison({ records: [review, day7Review] });
assert.strictEqual(dayRetest.ready, true);
assert.ok(dayRetest.mirrorLine.includes("→"));

console.log("kline-simulator module tests passed");
