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

const legacyCompatStats = buildLivingMirrorStats({
  records: [
    { id: "legacy-camel", date: recentDateText, mainErrorType: "追涨", firstThought: "怕错过", triggerScene: "放量拉升", nextRule: "先停十秒" },
    { id: "legacy-snake", createdAt: now - dayMs * 2, main_error_type: "冲高回落", first_thought: "还会涨", trigger_scene: "冲高回落", next_action: "写下第一念" },
    { id: "legacy-created-at-snake", created_at: new Date(now - dayMs * 3).toISOString(), main_error_type: "横盘犹疑", firstThought: "再等等", triggerScene: "横盘磨人" },
    { id: "legacy-updated", updatedAt: now - dayMs * 4, mainErrorType: "计划外动作", first_thought: "想证明", trigger_scene: "计划外拉升", nextRule: "只记录不行动" },
    { id: "legacy-updated-snake", updated_at: new Date(now - dayMs).toISOString(), main_error_type: "尾盘冲动", first_thought: "最后一把", next_rule: "收盘前不追" },
    { id: "legacy-missing-scene", createdAt: now - dayMs * 5, mainErrorType: "无触发场景", firstThought: "待补充" },
    { id: "legacy-no-time", mainErrorType: "无时间旧题", firstThought: "旧念", triggerScene: "不纳入近 30 天" },
    { id: "legacy-old", createdAt: now - dayMs * 40, main_error_type: "过期旧题", first_thought: "旧念", trigger_scene: "过期触发" }
  ]
});
assert.deepStrictEqual(legacyCompatStats.topTriggerScenes.map((item) => item.label), [
  "冲高回落",
  "放量拉升",
  "横盘磨人"
]);
assert.ok(legacyCompatStats.topMistakes.some((item) => item.label === "尾盘冲动"));
assert.ok(legacyCompatStats.reviewHistory.some((item) => item.thought === "还会涨"));
assert.strictEqual(legacyCompatStats.nextActionText, "收盘前不追");
assert.strictEqual(legacyCompatStats.topTriggerScenes.some((item) => item.label === "不纳入近 30 天"), false);
assert.strictEqual(legacyCompatStats.topTriggerScenes.some((item) => item.label === "过期触发"), false);

const p1SmokeReview = buildTradeReview({
  marketKey: "cn",
  timeframeKey: "1d",
  tradeDate: recentDateText,
  symbol: "示例标的",
  actionKey: "impulse",
  emotion: "急躁",
  firstThought: "怕错过",
  inPlan: "no",
  triggerScene: "放量拉升",
  nextAction: "先停十秒再写第一念",
  boundaryState: "lost",
  reviewNote: "计划外买入后回看第一念。"
});
assert.strictEqual(p1SmokeReview.mainErrorType, p1SmokeReview.main_error_type);
assert.ok(p1SmokeReview.mainErrorType);
assert.strictEqual(p1SmokeReview.firstThought, "怕错过");
assert.strictEqual(p1SmokeReview.first_thought, "怕错过");
assert.strictEqual(p1SmokeReview.triggerScene, "放量拉升");
assert.strictEqual(p1SmokeReview.trigger_scene, "放量拉升");
assert.deepStrictEqual(p1SmokeReview.trainingPrescription, p1SmokeReview.training_prescription);
assert.ok(p1SmokeReview.trainingPrescription.action);
assert.strictEqual(p1SmokeReview.nextRule, p1SmokeReview.next_rule);
assert.ok(p1SmokeReview.nextRule);
assert.deepStrictEqual(p1SmokeReview.mistakeCard, p1SmokeReview.mistake_card);
assert.ok(p1SmokeReview.mistakeCard.title);

const p1SmokeStats = buildLivingMirrorStats({ records: [p1SmokeReview] });
assert.strictEqual(p1SmokeStats.topMistakes[0].label, p1SmokeReview.mainErrorType);
assert.strictEqual(p1SmokeStats.topFirstThoughts[0].label, "怕错过");
assert.strictEqual(p1SmokeStats.topTriggerScenes[0].label, "放量拉升");
assert.strictEqual(p1SmokeStats.nextActionText, p1SmokeReview.nextRule);

console.log("trade-review module tests passed");
