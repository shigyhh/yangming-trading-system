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
  buildReviewTrainingFocus,
  buildTradeReviewTop3Stats,
  buildTradeReviewRecordView,
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
assert.strictEqual(review.mainErrorType, "追高冲动");
assert.ok(review.secondaryErrorTypes.includes("计划外交易"));
assert.strictEqual(review.triggerScene, "放量拉升");
assert.strictEqual(review.trainingPackId, "chase_high_impulse");
assert.strictEqual(review.mistakeCard.title, "错题卡");
assert.strictEqual(review.mistakeCard.mainErrorType, "追高冲动");
assert.ok(review.mistakeCard.mirrorDeposit.line.includes("活镜"));
assert.ok(review.mistakeCard.trainingPrescription.title.includes("专项"));

const sceneDrivenReview = buildTradeReview({
  marketKey: "cn",
  timeframeKey: "1d",
  tradeDate: "2026-06-03",
  symbol: "示例标的",
  actionKey: "planned",
  emotion: "平静",
  firstThought: "当时心里一紧",
  triggerScene: "突然拉升",
  inPlan: "yes",
  planBoundary: "先看触发情境",
  boundaryState: "near",
  positionState: "holding",
  nextAction: "停十秒"
});
assert.strictEqual(sceneDrivenReview.mainErrorType, "追高冲动");
assert.strictEqual(sceneDrivenReview.triggerScene, "突然拉升");
assert.strictEqual(sceneDrivenReview.mistakeCard.triggerScene, "突然拉升");

const p1ErrorRuleCases = [
  {
    name: "buy from fear of missing out",
    input: { action: "买入", firstThought: "怕错过", inPlan: "yes" },
    expected: "追高冲动"
  },
  {
    name: "trapped and wants to average down",
    input: { positionState: "trapped", firstThought: "想补仓", inPlan: "yes" },
    expected: "补仓冲动"
  },
  {
    name: "sold too early and regrets it",
    input: { positionStateLabel: "卖飞了", firstThought: "不甘心", inPlan: "yes" },
    expected: "卖飞懊悔"
  },
  {
    name: "outside plan",
    input: { firstThought: "想动一下", inPlan: "no" },
    expected: "计划外交易"
  }
];
p1ErrorRuleCases.forEach((item) => {
  const built = buildTradeReview(Object.assign({
    marketKey: "cn",
    timeframeKey: "1d",
    tradeDate: "2026-06-27",
    symbol: "300223"
  }, item.input));
  assert.strictEqual(built.mainErrorType, item.expected, `P1 mistake rule should classify ${item.name}`);
  assert.strictEqual(built.mistakeCard.mainErrorType, item.expected, `P1 mistake card should carry ${item.name}`);
});

const fallbackMistakeCard = buildTradeReview({
  marketKey: "cn",
  timeframeKey: "1d",
  tradeDate: "2026-06-27",
  symbol: ""
});
assert.strictEqual(fallbackMistakeCard.mistakeCard.symbol, "待补充");
assert.strictEqual(fallbackMistakeCard.mistakeCard.firstThought, "待补充");
assert.strictEqual(fallbackMistakeCard.mistakeCard.triggerScene.length > 0, true);
assert.strictEqual(fallbackMistakeCard.mistakeCard.nextRule.length > 0, true);

const plannedReview = buildTradeReview({
  marketKey: "cn",
  timeframeKey: "1d",
  tradeDate: "2026-06-27",
  symbol: "300223",
  action: "买入",
  firstThought: "怕错过",
  inPlan: "yes",
  boundaryState: "kept"
});
assert.strictEqual(plannedReview.mainErrorType, "追高冲动");
assert.strictEqual(plannedReview.main_error_type, "追高冲动");
assert.strictEqual(plannedReview.lawResult, "按计划执行");
assert.strictEqual(plannedReview.law_result, "按计划执行");
assert.strictEqual(plannedReview.executionResult, "按计划执行");
assert.strictEqual(plannedReview.execution_result, "按计划执行");
assert.strictEqual(plannedReview.mistakeCard.lawResult, "按计划执行");
assert.strictEqual(plannedReview.mistakeCard.executionResult, "按计划执行");
assert.strictEqual(plannedReview.mistakeCard.execution_result, "按计划执行");
assert.strictEqual(plannedReview.mistakeCard.mainErrorType, "追高冲动");

const legacySnakeRecordView = buildTradeReviewRecordView({
  id: "legacy-snake-001",
  symbol: "600123",
  tradeDate: "2026-06-27",
  actionLabel: "加仓",
  statusLabel: "被套中",
  main_error_type: "补仓冲动",
  first_thought: "想补仓",
  trigger_scene: "弱反弹",
  next_rule: "不在破位亏损中补仓",
  training_prescription: {
    title: "补仓冲动专项",
    focusText: "下跌中继 / 反抽诱多",
    rule: "不在破位亏损中补仓"
  }
});
assert.strictEqual(legacySnakeRecordView.mainErrorType, "补仓冲动");
assert.strictEqual(legacySnakeRecordView.main_error_type, "补仓冲动");
assert.strictEqual(legacySnakeRecordView.firstThought, "想补仓");
assert.strictEqual(legacySnakeRecordView.first_thought, "想补仓");
assert.strictEqual(legacySnakeRecordView.triggerScene, "弱反弹");
assert.strictEqual(legacySnakeRecordView.trigger_scene, "弱反弹");
assert.strictEqual(legacySnakeRecordView.nextRule, "不在破位亏损中补仓");
assert.strictEqual(legacySnakeRecordView.next_rule, "不在破位亏损中补仓");
assert.strictEqual(legacySnakeRecordView.executionResult, "按计划执行");
assert.strictEqual(legacySnakeRecordView.execution_result, "按计划执行");
assert.strictEqual(legacySnakeRecordView.mistakeCard.mainErrorType, "补仓冲动");
assert.strictEqual(legacySnakeRecordView.mistakeCard.firstThought, "想补仓");
assert.strictEqual(legacySnakeRecordView.mistakeCard.triggerScene, "弱反弹");
assert.strictEqual(legacySnakeRecordView.mistakeCard.nextRule, "不在破位亏损中补仓");
assert.ok(legacySnakeRecordView.mistakeCard.trainingPrescriptionText.includes("补仓冲动专项"));

const syncedReview = applyServerTradeReviewResult(review, {
  review: {
    id: review.id,
    detectedMirror: "追涨之镜",
    detectedThieves: ["贪", "急"],
    linkedOneThoughtEventId: "evt-review-001",
    oneThoughtEvent: {
      eventId: "evt-review-001",
      eventType: "trade_review"
    },
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
assert.strictEqual(syncedReview.linkedOneThoughtEventId, "evt-review-001");
assert.strictEqual(syncedReview.oneThoughtEvent.eventId, "evt-review-001");

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

const focus = buildReviewTrainingFocus({ records: [review, Object.assign({}, review, { id: "tr-repeat-001", createdAt: review.createdAt + 1 }), secondReview] });
assert.strictEqual(focus.hasPrescription, true);
assert.strictEqual(focus.mainErrorType, "追高冲动");
assert.strictEqual(focus.prescription.packId, "chase_high_impulse");
assert.ok(focus.rule.includes("停十秒"));
assert.ok(focus.summary.includes("真实复盘"));
assert.ok(focus.top3Stats.hasStats);

const oldReviewRecords = Array.from({ length: 30 }, (_, index) => ({
  id: `focus-old-${index}`,
  tradeDate: "2026-04-20",
  main_error_type: "急于翻本",
  first_thought: "想翻本",
  next_rule: "亏损后停止，先复盘"
}));
const focusFromRecentDatedRecord = buildReviewTrainingFocus({
  now: Date.parse("2026-06-28T00:00:00+08:00"),
  records: oldReviewRecords.concat([
    {
      id: "focus-recent-001",
      tradeDate: "2026-06-26",
      main_error_type: "补仓冲动",
      first_thought: "想补仓",
      trigger_scene: "弱反弹",
      next_rule: "不在破位亏损中补仓"
    }
  ])
});
assert.strictEqual(focusFromRecentDatedRecord.hasPrescription, true);
assert.strictEqual(focusFromRecentDatedRecord.mainErrorType, "补仓冲动");

const top3Stats = buildTradeReviewTop3Stats({
  records: [
    Object.assign({}, review, { id: "top3-001", firstThought: "怕错过", triggerScene: "放量拉升", createdAt: review.createdAt + 1 }),
    Object.assign({}, review, { id: "top3-002", firstThought: "怕错过", triggerScene: "放量拉升", createdAt: review.createdAt + 2 }),
    Object.assign({}, review, { id: "top3-003", firstThought: "怕错过", triggerScene: "放量拉升", createdAt: review.createdAt + 3 }),
    Object.assign({}, secondReview, { id: "top3-004", mainErrorType: "补仓冲动", firstThought: "不甘心", triggerScene: "弱反弹", nextAction: "不补仓", createdAt: review.createdAt + 4 }),
    Object.assign({}, secondReview, { id: "top3-005", mainErrorType: "补仓冲动", firstThought: "不甘心", triggerScene: "弱反弹", nextAction: "不补仓", createdAt: review.createdAt + 5 }),
    Object.assign({}, secondReview, { id: "top3-006", mainErrorType: "卖飞懊悔", firstThought: "想证明", triggerScene: "冲高回落", nextAction: "只按计划", createdAt: review.createdAt + 6 })
  ]
});
assert.strictEqual(top3Stats.hasStats, true);
assert.deepStrictEqual(top3Stats.topErrors.map((item) => item.label), ["追高冲动", "补仓冲动", "卖飞懊悔"]);
assert.deepStrictEqual(top3Stats.topFirstThoughts.map((item) => item.label), ["怕错过", "不甘心", "想证明"]);
assert.deepStrictEqual(top3Stats.topTriggerScenes.map((item) => item.label), ["放量拉升", "弱反弹", "冲高回落"]);
assert.ok(top3Stats.nextRule.includes("停十秒"));

const livingMirrorWindowStats = buildTradeReviewTop3Stats({
  now: Date.parse("2026-06-28T00:00:00+08:00"),
  days: 30,
  records: [
    {
      id: "window-old-001",
      date: "2026-04-20",
      main_error_type: "急于翻本",
      first_thought: "想翻本",
      next_rule: "亏损后停止，先复盘"
    },
    {
      id: "window-old-002",
      created_at: "2026-04-22T10:00:00+08:00",
      main_error_type: "急于翻本",
      first_thought: "想翻本",
      next_rule: "亏损后停止，先复盘"
    },
    {
      id: "window-new-001",
      tradeDate: "2026-06-20",
      mainErrorType: "追高冲动",
      firstThought: "怕错过",
      nextRule: "第一根放量不追，先停十秒"
    },
    {
      id: "window-new-002",
      created_at: "2026-06-24T10:00:00+08:00",
      main_error_type: "追高冲动",
      first_thought: "怕错过",
      next_rule: "第一根放量不追，先停十秒"
    },
    {
      id: "window-new-003",
      date: "2026-06-26",
      main_error_type: "补仓冲动",
      first_thought: "想补仓",
      next_rule: "不在破位亏损中补仓"
    },
    {
      id: "window-missing-fields",
      createdAt: Date.parse("2026-06-26T12:00:00+08:00")
    }
  ]
});
assert.strictEqual(livingMirrorWindowStats.hasStats, true);
assert.strictEqual(livingMirrorWindowStats.total, 4);
assert.deepStrictEqual(livingMirrorWindowStats.topErrors.map((item) => item.label), ["追高冲动", "补仓冲动", "计划外交易"]);
assert.deepStrictEqual(livingMirrorWindowStats.topFirstThoughts.map((item) => item.label).slice(0, 2), ["怕错过", "想补仓"]);
assert.deepStrictEqual(livingMirrorWindowStats.topNextRules.map((item) => item.label).slice(0, 2), ["第一根放量不追，先停十秒", "不在破位亏损中补仓"]);
assert.ok(livingMirrorWindowStats.nextRule.includes("停十秒"));

const emptyLivingMirrorWindowStats = buildTradeReviewTop3Stats({ records: [], days: 30 });
assert.strictEqual(emptyLivingMirrorWindowStats.hasStats, false);
assert.ok(emptyLivingMirrorWindowStats.emptyText.includes("真实复盘"));

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

console.log("trade-review module tests passed");
