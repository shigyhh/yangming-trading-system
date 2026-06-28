const assert = require("assert");
const {
  ACTION_OPTIONS,
  BOUNDARY_STATES,
  STAGE_POSITIONS,
  buildHistoricalMatch,
  buildHistoricalMatchFromMarketContext,
  applyServerTradeReviewResult,
  buildTradeReviewClosure,
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

const serverMatch = buildHistoricalMatchFromMarketContext({
  status: "ready",
  marketKey: "cn_equity",
  marketLabel: "A股",
  timeframeKey: "1d",
  timeframeLabel: "日线",
  tradeDate: "2026-06-01",
  symbolMasked: "****19",
  positionLabel: "A股 · 日线 · 2026-05-01 至 2026-06-01 · 阶段上行 · 区间上沿 · 波动放大",
  sourceStatus: "历史片段已载入",
  dataStart: "2026-05-01",
  dataEnd: "2026-06-01",
  candleCount: 40
}, { stagePositionKey: "near_boundary" });
assert.strictEqual(serverMatch.marketKey, "cn");
assert.strictEqual(serverMatch.timeframeKey, "1d");
assert.strictEqual(serverMatch.historyMatched, true);
assert.ok(serverMatch.stagePosition.includes("阶段上行"));

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
assert.strictEqual(review.sourceType, "trade_review");
assert.strictEqual(review.relatedMirror, "追涨之镜");
assert.deepStrictEqual(review.heartThieves, ["贪", "急"]);
assert.strictEqual(review.verdict, "你追的不是行情，是怕被机会抛下的不安。");
assert.strictEqual(review.includeInRetest, true);
assert.ok(review.scores.boundary > 0);
assert.ok(review.evidenceChain.length >= 6);
assert.ok(review.oneLine.includes("照见"));
assert.strictEqual(review.crossEndStatusText, "待回看");
assert.ok(review.crossEndStatusSteps.some((item) => item.label === "待训练"));

const syncedReview = applyServerTradeReviewResult(review, {
  review: {
    id: review.id,
    detectedMirror: "追涨之镜",
    detectedThieves: ["贪", "急"],
    marketContext: {
      status: "ready",
      marketKey: "cn_equity",
      marketLabel: "A股",
      timeframeKey: "1d",
      timeframeLabel: "日线",
      tradeDate: "2026-06-01",
      symbolMasked: "****19",
      positionLabel: "A股 · 日线 · 2026-05-01 至 2026-06-01 · 阶段上行 · 区间上沿 · 波动放大",
      sourceStatus: "历史片段已载入",
      candleCount: 40
    }
  },
  living_mirror_profile: {
    currentMainMirror: "追涨之镜",
    tripleReflection: {
      title: "三证互照"
    }
  }
});
assert.strictEqual(syncedReview.historicalMatch.sourceStatus, "历史片段已载入");
assert.strictEqual(syncedReview.marketContext.status, "ready");
assert.strictEqual(syncedReview.serverLivingMirrorProfile.currentMainMirror, "追涨之镜");
assert.strictEqual(syncedReview.crossEndStatusText, "待训练");

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

const closure = buildTradeReviewClosure(review, reminder);
assert.strictEqual(closure.title, "本次复盘已入活镜");
assert.ok(closure.steps.find((item) => item.key === "archived").done);
assert.ok(closure.trainingAction.length > 8);
assert.ok(closure.primaryActionText.includes("活镜"));

const emptyReminder = buildLiveMirrorReminder({ records: [] });
assert.strictEqual(emptyReminder.hasRecords, false);
assert.ok(emptyReminder.primaryActionText.includes("上传"));

const stats = buildLivingMirrorStats({ records: [review, secondReview] });
assert.strictEqual(stats.totalReviews, 2);
assert.ok(stats.mirrorScores["追涨之镜"] >= 1);
assert.ok(stats.thiefCounts["贪"] >= 1);
assert.ok(stats.reviewHistory.length >= 2);
assert.ok(stats.assistantHandoff.currentMirror);

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;
const recentDateText = new Date(now - dayMs * 4).toISOString().slice(0, 10);
const triggerSceneStats = buildLivingMirrorStats({
  records: [
    { id: "scene-1", date: recentDateText, mainErrorType: "追涨", firstThought: "怕错过", triggerScene: "放量拉升", nextAction: "先停十秒" },
    { id: "scene-2", createdAt: now - dayMs, main_error_type: "追涨", first_thought: "来不及", trigger_scene: "放量拉升", next_rule: "先写第一念" },
    { id: "scene-3", created_at: now - dayMs * 2, mainErrorType: "回落", firstThought: "想证明", triggerScene: "冲高回落", next_action: "只记录" },
    { id: "scene-4", createdAt: now - dayMs * 3, mainErrorType: "犹疑", firstThought: "再等等", trigger_scene: "横盘磨人", nextAction: "先复盘" },
    { id: "scene-old", createdAt: now - dayMs * 35, mainErrorType: "旧题", firstThought: "旧念", triggerScene: "放量拉升", nextAction: "旧动作" }
  ]
});

assert.deepStrictEqual(triggerSceneStats.topTriggerScenes.map((item) => `${item.label}:${item.count}`), [
  "放量拉升:2",
  "冲高回落:1",
  "横盘磨人:1"
]);
assert.strictEqual(triggerSceneStats.triggerSceneEmptyText, "");
assert.strictEqual(triggerSceneStats.topMistakes[0].label, "追涨");
assert.ok(triggerSceneStats.topFirstThoughts.some((item) => item.label === "怕错过"));
assert.strictEqual(triggerSceneStats.nextActionText, "先写第一念");

const emptyTriggerSceneStats = buildLivingMirrorStats({
  records: [
    { id: "no-scene", createdAt: now, mainErrorType: "追涨", firstThought: "怕错过", nextAction: "先停十秒" }
  ]
});
assert.deepStrictEqual(emptyTriggerSceneStats.topTriggerScenes, []);
assert.strictEqual(emptyTriggerSceneStats.triggerSceneEmptyText, "暂无足够触发场景样本。");

console.log("trade-review module tests passed");
