const assert = require("assert");
const {
  SIX_GATE_MAP,
  PERSONALITY_KLINE_PRESCRIPTIONS,
  buildKlineMindSession,
  buildKlineMindRecord,
  calculateKlineMindScore,
  MARKET_CATALOG,
  TIMEFRAME_CATALOG,
  INDICATOR_CATALOG,
  KLINE_TRAINING_METHODS,
  getPersonalityKlineDrill,
  getInitialKlineVisibleCount,
  startKlineTrainingRuntime,
  setKlineRuntimeChartZoom,
  setKlineRuntimeMainIndicator,
  setKlineRuntimeIndicator,
  buildKlineTrainingRecordPatch,
  listSpecialTrainingPacks,
  getSpecialTrainingPack,
  buildSpecialTrainingSessionMeta,
  buildKlineSamplingRequest,
  normalizeKlineSamplingResult,
  buildCustomSessionMeta,
  buildTrainingBookmark,
  normalizeTrainingBookmark,
  buildBookmarkReplaySliceRequest
} = require("./index");

assert.strictEqual(SIX_GATE_MAP.length, 6);
assert.ok(Object.keys(PERSONALITY_KLINE_PRESCRIPTIONS).length >= 9);
assert.deepStrictEqual(Object.keys(MARKET_CATALOG), ["cn_equity"]);
assert.deepStrictEqual(TIMEFRAME_CATALOG.map((item) => item.key), ["1d", "60m", "30m"]);
assert.deepStrictEqual(TIMEFRAME_CATALOG.map((item) => item.label), ["长线", "中线", "短线"]);
assert.deepStrictEqual(INDICATOR_CATALOG.map((item) => item.key), ["ma", "macd", "boll", "vol", "rsi", "kdj"]);
assert.ok(KLINE_TRAINING_METHODS.find((item) => item.key === "firecracker"));
assert.ok(getPersonalityKlineDrill("焦虑型").drillAction.includes("固定观察窗口"));

const historicalSlice = {
  source: "verified_fixture",
  symbol: "000001.SZ",
  start: "2024-01-02",
  end: "2024-01-18",
  candles: [
    { date: "2024-01-02", open: 9.2, high: 9.4, low: 9.1, close: 9.32, volume: 1000 },
    { date: "2024-01-03", open: 9.31, high: 9.5, low: 9.2, close: 9.22, volume: 1200 },
    { date: "2024-01-04", open: 9.2, high: 9.7, low: 9.16, close: 9.62, volume: 2200 },
    { date: "2024-01-05", open: 9.6, high: 9.66, low: 9.3, close: 9.34, volume: 1900 },
    { date: "2024-01-08", open: 9.35, high: 9.42, low: 9.18, close: 9.28, volume: 1400 },
    { date: "2024-01-09", open: 9.3, high: 9.58, low: 9.24, close: 9.52, volume: 2100 }
  ]
};

const session = buildKlineMindSession({
  assessment: { primary: "冲动型", secondary: "焦虑型" },
  trainingDay: { day: 2, title: "观风险处理抗拒" },
  record: { marketKey: "cn_equity", timeframeKey: "1d" },
  historyCache: { cn_equity: { "1d": historicalSlice } }
});

assert.strictEqual(session.day, 2);
assert.strictEqual(session.personalityType, "冲动型");
assert.strictEqual(session.stageGate.key, "zhaoxin");
assert.strictEqual(session.market.name, "A股");
assert.strictEqual(session.hasHistoricalData, true);
assert.ok(session.trainingMethods.length >= 5);
assert.strictEqual(session.personalityDrill.targetScene, "突然放大的历史片段");
assert.strictEqual(session.prescription.heartThief, "怕错过");
assert.strictEqual(session.candles.length, 6);
assert.ok(session.candles.some((item) => item.selected));
assert.ok(session.gates.find((item) => item.key === "zhaoxin").trainingAction);
assert.ok(session.indicatorOverlay.ma5.length > 0);
assert.deepStrictEqual(session.indicatorPanelOptions.map((item) => item.key), ["vol", "macd", "rsi", "kdj"]);

const runtime = startKlineTrainingRuntime(session, {
  trainingSessionId: "kline-module-runtime",
  initialVisibleCount: getInitialKlineVisibleCount(session),
  initialMainIndicatorKey: "ma",
  initialIndicatorKey: "vol"
});
assert.strictEqual(runtime.simulationMode, "blind_step_replay");
assert.ok(runtime.visibleCandles.length > 0);
assert.ok(runtime.indicatorOverlay.ma5.length > 0);
assert.strictEqual(runtime.indicatorPanel.type, "vol");
const zoomedRuntime = setKlineRuntimeChartZoom(runtime, "focus");
assert.strictEqual(zoomedRuntime.chartZoomKey, "focus");
const bollRuntime = setKlineRuntimeMainIndicator(runtime, "boll");
assert.ok(bollRuntime.indicatorOverlay.bollUpper.length > 0);
const macdRuntime = setKlineRuntimeIndicator(runtime, "macd");
assert.strictEqual(macdRuntime.indicatorPanel.type, "macd");
const runtimePatch = buildKlineTrainingRecordPatch(macdRuntime);
assert.strictEqual(runtimePatch.simulationMode, "blind_step_replay");
assert.ok(runtimePatch.selectedCandleKey);

const record = buildKlineMindRecord({
  selectedCandleKey: session.selectedCandleKey,
  firstReaction: "急躁",
  bodySignal: "紧",
  boundaryChoice: "停十秒",
  insightLine: "我看见自己想用行动缓解不安。"
}, session);

assert.strictEqual(record.completed, true);
assert.strictEqual(record.scenarioTitle, "边界触碰");
assert.strictEqual(record.marketKey, "cn_equity");
assert.strictEqual(record.timeframeKey, "1d");
assert.strictEqual(record.symbol, "000001.SZ");
assert.ok(record.score >= 80);
assert.strictEqual(calculateKlineMindScore({}), 28);

const reviewFocus = {
  sourceType: "review_focus",
  source_type: "review_focus",
  executionPlanId: "plan-review-focus-001",
  execution_plan_id: "plan-review-focus-001",
  errorType: "追涨之镜",
  error_type: "追涨之镜",
  trainingPrescription: { action: "停十秒，写下边界。" },
  training_prescription: { action: "停十秒，写下边界。" },
  sceneTags: ["放量拉升", "怕错过"],
  scene_tags: ["放量拉升", "怕错过"],
  nextAction: "同类场景先停十秒。",
  next_action: "同类场景先停十秒。",
  expectedAction: "同类场景先停十秒。",
  expected_action: "同类场景先停十秒。",
  sourceReviewId: "tr-review-focus-001",
  source_review_id: "tr-review-focus-001"
};
const reviewFocusSession = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 3 },
  record: { marketKey: "cn_equity", timeframeKey: "1d" },
  historyCache: { cn_equity: { "1d": historicalSlice } },
  reviewFocus
});

assert.strictEqual(reviewFocusSession.sourceType, "review_focus");
assert.strictEqual(reviewFocusSession.source_type, "review_focus");
assert.strictEqual(reviewFocusSession.errorType, "追涨之镜");
assert.strictEqual(reviewFocusSession.error_type, "追涨之镜");
assert.deepStrictEqual(reviewFocusSession.trainingPrescription, { action: "停十秒，写下边界。" });
assert.deepStrictEqual(reviewFocusSession.training_prescription, { action: "停十秒，写下边界。" });
assert.deepStrictEqual(reviewFocusSession.sceneTags, ["放量拉升", "怕错过"]);
assert.deepStrictEqual(reviewFocusSession.scene_tags, ["放量拉升", "怕错过"]);
assert.strictEqual(reviewFocusSession.nextAction, "同类场景先停十秒。");
assert.strictEqual(reviewFocusSession.next_action, "同类场景先停十秒。");
assert.strictEqual(reviewFocusSession.expectedAction, "同类场景先停十秒。");
assert.strictEqual(reviewFocusSession.expected_action, "同类场景先停十秒。");
assert.strictEqual(reviewFocusSession.executionPlanId, "plan-review-focus-001");
assert.strictEqual(reviewFocusSession.execution_plan_id, "plan-review-focus-001");
assert.strictEqual(reviewFocusSession.sourceReviewId, "tr-review-focus-001");
assert.strictEqual(reviewFocusSession.source_review_id, "tr-review-focus-001");

const reviewFocusRecord = buildKlineMindRecord({
  selectedCandleKey: reviewFocusSession.selectedCandleKey,
  firstReaction: "怕错过",
  boundaryChoice: "停十秒",
  insightLine: "我看见自己被放量拉升牵动。"
}, reviewFocusSession);

assert.strictEqual(reviewFocusRecord.sourceType, "review_focus");
assert.strictEqual(reviewFocusRecord.source_type, "review_focus");
assert.strictEqual(reviewFocusRecord.errorType, "追涨之镜");
assert.strictEqual(reviewFocusRecord.error_type, "追涨之镜");
assert.deepStrictEqual(reviewFocusRecord.sceneTags, ["放量拉升", "怕错过"]);
assert.deepStrictEqual(reviewFocusRecord.scene_tags, ["放量拉升", "怕错过"]);
assert.deepStrictEqual(reviewFocusRecord.trainingPrescription, { action: "停十秒，写下边界。" });
assert.deepStrictEqual(reviewFocusRecord.training_prescription, { action: "停十秒，写下边界。" });
assert.strictEqual(reviewFocusRecord.nextAction, "同类场景先停十秒。");
assert.strictEqual(reviewFocusRecord.next_action, "同类场景先停十秒。");
assert.strictEqual(reviewFocusRecord.expectedAction, "同类场景先停十秒。");
assert.strictEqual(reviewFocusRecord.expected_action, "同类场景先停十秒。");
assert.strictEqual(reviewFocusRecord.executionPlanId, "plan-review-focus-001");
assert.strictEqual(reviewFocusRecord.execution_plan_id, "plan-review-focus-001");
assert.strictEqual(reviewFocusRecord.sourceReviewId, "tr-review-focus-001");
assert.strictEqual(reviewFocusRecord.source_review_id, "tr-review-focus-001");
assert.strictEqual(reviewFocusRecord.trainingMistakeCard.title, "最明显执行偏离");
assert.strictEqual(reviewFocusRecord.training_mistake_card.title, "最明显执行偏离");
assert.strictEqual(reviewFocusRecord.executionResult, "按计划执行");
assert.strictEqual(reviewFocusRecord.execution_result, "按计划执行");
assert.strictEqual(reviewFocusRecord.executionLabel, "按计划执行");
assert.strictEqual(reviewFocusRecord.execution_label, "按计划执行");
assert.strictEqual(reviewFocusRecord.executionConsistencyRateText, "100%");
assert.strictEqual(reviewFocusRecord.execution_consistency_rate_text, "100%");
assert.strictEqual(reviewFocusRecord.executionConsistency.rateText, "100%");

const samplingResponse = {
  sampling_result: {
    segment_id: "segment-fast-rise",
    training_pack_id: "pack-chasing-surge",
    error_type: "追涨之镜",
    scene_tags: ["放量拉升", "怕错过"],
    symbol: "000001.SZ",
    name: "训练片段",
    period: "1d",
    start_date: "2026-05-01",
    end_date: "2026-05-16",
    bars: historicalSlice.candles,
    fallback_used: false,
    source: "segment"
  }
};
const normalizedSampling = normalizeKlineSamplingResult(samplingResponse);
assert.strictEqual(normalizedSampling.segmentId, "segment-fast-rise");
assert.strictEqual(normalizedSampling.segment_id, "segment-fast-rise");
assert.strictEqual(normalizedSampling.trainingPackId, "pack-chasing-surge");
assert.strictEqual(normalizedSampling.training_pack_id, "pack-chasing-surge");
assert.strictEqual(normalizedSampling.fallbackUsed, false);
assert.strictEqual(normalizedSampling.fallback_used, false);
assert.strictEqual(normalizedSampling.bars.length, historicalSlice.candles.length);
assert.strictEqual("bars" in normalizedSampling.samplingResult, false);
assert.strictEqual("bars" in normalizedSampling.sampling_result, false);

const reviewFocusSamplingRequest = buildKlineSamplingRequest(reviewFocus, {
  period: "1d",
  difficulty: "normal",
  excludeSegmentIds: ["segment-old"]
});
assert.strictEqual(reviewFocusSamplingRequest.sourceType, "review_focus");
assert.strictEqual(reviewFocusSamplingRequest.source_type, "review_focus");
assert.strictEqual(reviewFocusSamplingRequest.errorType, "追涨之镜");
assert.strictEqual(reviewFocusSamplingRequest.error_type, "追涨之镜");
assert.deepStrictEqual(reviewFocusSamplingRequest.sceneTags, ["放量拉升", "怕错过"]);
assert.deepStrictEqual(reviewFocusSamplingRequest.scene_tags, ["放量拉升", "怕错过"]);
assert.deepStrictEqual(reviewFocusSamplingRequest.excludeSegmentIds, ["segment-old"]);
assert.deepStrictEqual(reviewFocusSamplingRequest.exclude_segment_ids, ["segment-old"]);

const reviewFocusSampledSession = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 3 },
  record: { marketKey: "cn_equity", timeframeKey: "1d" },
  historyCache: {},
  reviewFocus,
  samplingResult: samplingResponse
});
assert.strictEqual(reviewFocusSampledSession.sourceType, "review_focus");
assert.strictEqual(reviewFocusSampledSession.segmentId, "segment-fast-rise");
assert.strictEqual(reviewFocusSampledSession.segment_id, "segment-fast-rise");
assert.strictEqual(reviewFocusSampledSession.trainingPackId, "pack-chasing-surge");
assert.strictEqual(reviewFocusSampledSession.training_pack_id, "pack-chasing-surge");
assert.strictEqual(reviewFocusSampledSession.samplingStatus, "matched");
assert.strictEqual(reviewFocusSampledSession.sampling_status, "matched");
assert.strictEqual(reviewFocusSampledSession.hasHistoricalData, true);
assert.strictEqual(reviewFocusSampledSession.historySlice.source, "segment");
assert.strictEqual("bars" in reviewFocusSampledSession.samplingResult, false);
assert.strictEqual("bars" in reviewFocusSampledSession.sampling_result, false);

const sampledRecord = buildKlineMindRecord({
  selectedCandleKey: reviewFocusSampledSession.selectedCandleKey,
  firstReaction: "怕错过",
  boundaryChoice: "停十秒",
  insightLine: "抽题片段也能写入训练记录。"
}, reviewFocusSampledSession);
assert.strictEqual(sampledRecord.segmentId, "segment-fast-rise");
assert.strictEqual(sampledRecord.segment_id, "segment-fast-rise");
assert.strictEqual(sampledRecord.trainingPackId, "pack-chasing-surge");
assert.strictEqual(sampledRecord.training_pack_id, "pack-chasing-surge");
assert.strictEqual(sampledRecord.fallbackUsed, false);
assert.strictEqual(sampledRecord.fallback_used, false);
assert.strictEqual("bars" in sampledRecord.samplingResult, false);
assert.strictEqual("bars" in sampledRecord.sampling_result, false);

const specialTrainingPacks = listSpecialTrainingPacks();
assert.deepStrictEqual(specialTrainingPacks.map((item) => item.errorType), [
  "追高冲动",
  "补仓冲动",
  "卖飞懊悔",
  "计划外交易"
]);
const chaseHighPack = getSpecialTrainingPack("追高冲动");
assert.strictEqual(chaseHighPack.title, "追高冲动专项");
assert.deepStrictEqual(chaseHighPack.scene_tags, ["放量拉升", "假突破", "冲高回落"]);
assert.ok(chaseHighPack.trainingGoal.includes("快速上涨"));
assert.strictEqual(chaseHighPack.expected_action, "第一根放量不追，先观察");
assert.ok(chaseHighPack.trainingPrescription.action.includes("先观察"));
const specialMeta = buildSpecialTrainingSessionMeta("chase_high_impulse");
assert.strictEqual(specialMeta.sourceType, "special_training");
assert.strictEqual(specialMeta.source_type, "special_training");
assert.strictEqual(specialMeta.errorType, "追高冲动");
assert.strictEqual(specialMeta.error_type, "追高冲动");
assert.deepStrictEqual(specialMeta.sceneTags, ["放量拉升", "假突破", "冲高回落"]);
assert.deepStrictEqual(specialMeta.scene_tags, ["放量拉升", "假突破", "冲高回落"]);
assert.strictEqual(specialMeta.trainingPackId, "chase_high_impulse");
assert.strictEqual(specialMeta.training_pack_title, "追高冲动专项");

const specialSamplingRequest = buildKlineSamplingRequest(specialMeta, {
  period: "1d"
});
assert.strictEqual(specialSamplingRequest.sourceType, "special_training");
assert.strictEqual(specialSamplingRequest.source_type, "special_training");
assert.strictEqual(specialSamplingRequest.errorType, "追高冲动");
assert.strictEqual(specialSamplingRequest.error_type, "追高冲动");
assert.strictEqual(specialSamplingRequest.trainingPackId, "chase_high_impulse");
assert.strictEqual(specialSamplingRequest.training_pack_id, "chase_high_impulse");

const specialSession = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 3 },
  record: Object.assign({ marketKey: "cn_equity", timeframeKey: "1d" }, specialMeta),
  historyCache: { cn_equity: { "1d": historicalSlice } }
});
assert.strictEqual(specialSession.sourceType, "special_training");
assert.strictEqual(specialSession.source_type, "special_training");
assert.strictEqual(specialSession.errorType, "追高冲动");
assert.strictEqual(specialSession.error_type, "追高冲动");
assert.deepStrictEqual(specialSession.sceneTags, ["放量拉升", "假突破", "冲高回落"]);
assert.strictEqual(specialSession.expectedAction, "第一根放量不追，先观察");
assert.strictEqual(specialSession.nextAction, "第一根放量不追，先观察");
assert.strictEqual(specialSession.trainingPrescription.action, "第一根放量不追，先观察");

const specialRecord = buildKlineMindRecord({
  selectedCandleKey: specialSession.selectedCandleKey,
  firstReaction: "怕错过",
  boundaryChoice: "先观察",
  insightLine: "我看见自己想追第一根放量。"
}, specialSession);
assert.strictEqual(specialRecord.sourceType, "special_training");
assert.strictEqual(specialRecord.source_type, "special_training");
assert.strictEqual(specialRecord.errorType, "追高冲动");
assert.strictEqual(specialRecord.error_type, "追高冲动");
assert.strictEqual(specialRecord.trainingPackTitle, "追高冲动专项");
assert.strictEqual(specialRecord.training_pack_title, "追高冲动专项");
assert.strictEqual(specialRecord.nextAction, "第一根放量不追，先观察");
assert.strictEqual(specialRecord.trainingMistakeCard.errorType, "追高冲动");
assert.strictEqual(specialRecord.training_mistake_card.trainingPackTitle, "追高冲动专项");

const oldLawResultRecord = buildKlineMindRecord({
  selectedCandleKey: reviewFocusSession.selectedCandleKey,
  firstReaction: "怕错过",
  boundaryChoice: "停十秒",
  insightLine: "我看见自己被放量拉升牵动。",
  lawResult: "broken"
}, reviewFocusSession);
assert.strictEqual(oldLawResultRecord.executionResult, "执行偏离");
assert.strictEqual(oldLawResultRecord.execution_result, "执行偏离");
assert.strictEqual(oldLawResultRecord.executionLabel, "执行偏离");
assert.strictEqual(oldLawResultRecord.execution_label, "执行偏离");
assert.strictEqual(oldLawResultRecord.trainingMistakeCard.executionResult, "执行偏离");
assert.strictEqual(oldLawResultRecord.training_mistake_card.execution_result, "执行偏离");
assert.strictEqual(oldLawResultRecord.executionConsistencyRateText, "0%");
assert.strictEqual(oldLawResultRecord.executionConsistency.deviationCount, 1);

const unclearExecutionRecord = buildKlineMindRecord({
  selectedCandleKey: reviewFocusSession.selectedCandleKey,
  firstReaction: "说不清",
  boundaryChoice: "停十秒",
  insightLine: "我暂时说不清这一念。",
  execution_result: "unclear"
}, reviewFocusSession);
assert.strictEqual(unclearExecutionRecord.executionResult, "说不清");
assert.strictEqual(unclearExecutionRecord.executionConsistencyRateText, "样本不足");
assert.strictEqual(unclearExecutionRecord.executionConsistency.isSampleEnough, false);

const newExecutionResultPriorityRecord = buildKlineMindRecord({
  selectedCandleKey: reviewFocusSession.selectedCandleKey,
  firstReaction: "怕错过",
  boundaryChoice: "停十秒",
  insightLine: "我看见自己被放量拉升牵动。",
  execution_result: "aligned",
  law_result: "broken"
}, reviewFocusSession);
assert.strictEqual(newExecutionResultPriorityRecord.executionResult, "按计划执行");
assert.strictEqual(newExecutionResultPriorityRecord.execution_result, "按计划执行");

const blindSession = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 1 },
  historyCache: { cn_equity: { "1d": historicalSlice } }
});
assert.notStrictEqual(blindSession.sourceType, "review_focus");
assert.notStrictEqual(blindSession.source_type, "review_focus");
assert.notStrictEqual(blindSession.sourceType, "special_training");
assert.notStrictEqual(blindSession.source_type, "special_training");
assert.strictEqual(blindSession.segmentId, undefined);
assert.strictEqual(blindSession.samplingResult, undefined);

const customHistorySlice = Object.assign({}, historicalSlice, {
  source: "custom_history_slice",
  symbol: "600519",
  name: "贵州茅台",
  start: "2024-01-02",
  startDate: "2024-01-02",
  start_date: "2024-01-02",
  end: "2024-01-09",
  endDate: "2024-01-09",
  end_date: "2024-01-09",
  period: "1d",
  candles: historicalSlice.candles.slice(0, 4)
});
const customMeta = buildCustomSessionMeta({
  symbol: "600519",
  period: "1d",
  startDate: "2024-01-02",
  endDate: "2024-01-09",
  trainingLength: "4"
});
assert.strictEqual(customMeta.sourceType, "custom_session");
assert.strictEqual(customMeta.source_type, "custom_session");
assert.strictEqual(customMeta.symbol, "600519");
assert.strictEqual(customMeta.period, "1d");
assert.strictEqual(customMeta.startDate, "2024-01-02");
assert.strictEqual(customMeta.start_date, "2024-01-02");
assert.strictEqual(customMeta.endDate, "2024-01-09");
assert.strictEqual(customMeta.end_date, "2024-01-09");
assert.strictEqual(customMeta.trainingLength, 4);
assert.strictEqual(customMeta.training_length, 4);
assert.strictEqual(customMeta.hiddenSymbol, true);
assert.strictEqual(customMeta.hidden_symbol, true);
assert.strictEqual(customMeta.hiddenDateRange, true);
assert.strictEqual(customMeta.hidden_date_range, true);

const customSession = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 1 },
  record: Object.assign({ marketKey: "cn_equity", timeframeKey: "1d", historySlice: customHistorySlice }, customMeta),
  customSession: Object.assign({}, customMeta, { historySlice: customHistorySlice })
});
assert.strictEqual(customSession.sourceType, "custom_session");
assert.strictEqual(customSession.source_type, "custom_session");
assert.strictEqual(customSession.hasHistoricalData, true);
assert.strictEqual(customSession.symbol, "600519");
assert.strictEqual(customSession.hiddenSymbol, true);
assert.strictEqual(customSession.hidden_symbol, true);
assert.strictEqual(customSession.hiddenDateRange, true);
assert.strictEqual(customSession.hidden_date_range, true);
assert.strictEqual(customSession.trainingLength, 4);
assert.strictEqual(customSession.training_length, 4);
assert.strictEqual(customSession.customSymbolText, "隐藏标的");
assert.strictEqual(customSession.customDateRangeText, "隐藏真实日期");
assert.strictEqual(customSession.revealedSymbolText, "600519");
assert.strictEqual(customSession.revealedDateRangeText, "2024-01-02 至 2024-01-09");
assert.strictEqual(customSession.samplingResult, undefined);

const customRecord = buildKlineMindRecord({
  selectedCandleKey: customSession.selectedCandleKey,
  firstReaction: "怕错过",
  boundaryChoice: "观望",
  insightLine: "自选盲练中我先记录，不被标的名字牵动。"
}, customSession);
assert.strictEqual(customRecord.sourceType, "custom_session");
assert.strictEqual(customRecord.source_type, "custom_session");
assert.strictEqual(customRecord.symbol, "600519");
assert.strictEqual(customRecord.period, "1d");
assert.strictEqual(customRecord.startDate, "2024-01-02");
assert.strictEqual(customRecord.start_date, "2024-01-02");
assert.strictEqual(customRecord.endDate, "2024-01-09");
assert.strictEqual(customRecord.end_date, "2024-01-09");
assert.strictEqual(customRecord.trainingLength, 4);
assert.strictEqual(customRecord.training_length, 4);
assert.strictEqual(customRecord.hiddenSymbol, true);
assert.strictEqual(customRecord.hidden_symbol, true);
assert.strictEqual(customRecord.hiddenDateRange, true);
assert.strictEqual(customRecord.hidden_date_range, true);
assert.strictEqual(customRecord.trainingMistakeCard.errorType, "自选盲练");
assert.strictEqual(customRecord.training_mistake_card.error_type, "自选盲练");
assert.strictEqual(customRecord.samplingResult, undefined);
assert.notStrictEqual(customRecord.fallbackUsed, true);

const sampledBookmark = buildTrainingBookmark({
  record: sampledRecord,
  session: reviewFocusSampledSession,
  bookmarkType: "mistake_card",
  note: "回看这一局里的追高冲动。"
});
assert.strictEqual(sampledBookmark.bookmarkType, "mistake_card");
assert.strictEqual(sampledBookmark.bookmark_type, "mistake_card");
assert.strictEqual(sampledBookmark.sourceType, "review_focus");
assert.strictEqual(sampledBookmark.source_type, "review_focus");
assert.ok(sampledBookmark.sessionId);
assert.strictEqual(sampledBookmark.session_id, sampledBookmark.sessionId);
assert.strictEqual(sampledBookmark.errorType, "追涨之镜");
assert.strictEqual(sampledBookmark.executionResult, sampledRecord.executionResult);
assert.strictEqual(sampledBookmark.segmentId, "segment-fast-rise");
assert.strictEqual(sampledBookmark.segment_id, "segment-fast-rise");
assert.strictEqual(sampledBookmark.trainingPackId, "pack-chasing-surge");
assert.strictEqual(sampledBookmark.training_pack_id, "pack-chasing-surge");
assert.strictEqual(sampledBookmark.samplingResult.source, "segment");
assert.strictEqual(sampledBookmark.sampling_result.source, "segment");
assert.strictEqual("bars" in sampledBookmark.samplingResult, false);
assert.strictEqual("bars" in sampledBookmark.sampling_result, false);

const normalizedBookmark = normalizeTrainingBookmark({
  bookmark_type: "action",
  session_id: "session-legacy",
  action_id: "action-1",
  bar_index: 3,
  source_type: "special_training",
  error_type: "追高冲动",
  scene_tags: "放量拉升 / 假突破",
  execution_result: "执行偏离",
  segment_id: "segment-legacy",
  training_pack_id: "pack-legacy",
  sampling_result: {
    segment_id: "segment-legacy",
    training_pack_id: "pack-legacy",
    source: "segment",
    bars: [{ close: 10.2 }]
  },
  title: "第 3 根动作"
});
assert.strictEqual(normalizedBookmark.bookmarkType, "action");
assert.strictEqual(normalizedBookmark.bookmark_type, "action");
assert.strictEqual(normalizedBookmark.actionId, "action-1");
assert.strictEqual(normalizedBookmark.action_id, "action-1");
assert.strictEqual(normalizedBookmark.barIndex, 3);
assert.strictEqual(normalizedBookmark.bar_index, 3);
assert.deepStrictEqual(normalizedBookmark.sceneTags, ["放量拉升", "假突破"]);
assert.strictEqual(normalizedBookmark.samplingResult.segmentId, "segment-legacy");
assert.strictEqual("bars" in normalizedBookmark.samplingResult, false);

const customBookmark = buildTrainingBookmark({
  record: customRecord,
  session: customSession,
  bookmarkType: "session"
});
assert.strictEqual(customBookmark.sourceType, "custom_session");
assert.strictEqual(customBookmark.source_type, "custom_session");
assert.strictEqual(customBookmark.symbol, "600519");
assert.strictEqual(customBookmark.period, "1d");
assert.strictEqual(customBookmark.startDate, "2024-01-02");
assert.strictEqual(customBookmark.start_date, "2024-01-02");
assert.strictEqual(customBookmark.endDate, "2024-01-09");
assert.strictEqual(customBookmark.end_date, "2024-01-09");
assert.strictEqual(customBookmark.samplingResult, null);
assert.strictEqual(customBookmark.sampling_result, null);

const replayRequest = buildBookmarkReplaySliceRequest(customBookmark);
assert.deepStrictEqual(replayRequest, {
  symbol: "600519",
  timeframeKey: "1d",
  startDate: "2024-01-02",
  endDate: "2024-01-09",
  trainingLength: 60,
  mode: "replay",
  blind: false
});

const fallbackSampling = normalizeKlineSamplingResult({
  segmentId: "",
  trainingPackId: "pack-chasing-surge",
  errorType: "追涨之镜",
  sceneTags: ["放量拉升"],
  symbol: "000001.SZ",
  period: "1d",
  bars: historicalSlice.candles,
  fallbackUsed: true,
  fallbackReason: "sampling_api_failed",
  source: "base_blind_fallback"
});
assert.strictEqual(fallbackSampling.fallbackUsed, true);
assert.strictEqual(fallbackSampling.fallback_used, true);
assert.strictEqual(fallbackSampling.fallbackReason, "sampling_api_failed");
assert.strictEqual(fallbackSampling.fallback_reason, "sampling_api_failed");
assert.strictEqual("bars" in fallbackSampling.samplingResult, false);

const legacySessionRecord = buildKlineMindRecord({
  firstReaction: "急躁",
  boundaryChoice: "停十秒",
  insightLine: "旧 session 也能完成。"
}, { day: 1, candles: [] });
assert.strictEqual(legacySessionRecord.completed, true);
assert.notStrictEqual(legacySessionRecord.sourceType, "review_focus");

const camelOnlyFocusSession = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 4 },
  historyCache: { cn_equity: { "1d": historicalSlice } },
  reviewFocus: {
    sourceType: "review_focus",
    errorType: "计划外追涨",
    trainingPrescription: "停十秒，写下第一念。",
    sceneTags: "放量拉升,怕错过",
    nextAction: "先复盘再行动",
    sourceReviewId: "review-camel-only"
  }
});
assert.strictEqual(camelOnlyFocusSession.sourceType, "review_focus");
assert.strictEqual(camelOnlyFocusSession.source_type, "review_focus");
assert.strictEqual(camelOnlyFocusSession.errorType, "计划外追涨");
assert.strictEqual(camelOnlyFocusSession.error_type, "计划外追涨");
assert.deepStrictEqual(camelOnlyFocusSession.trainingPrescription, { action: "停十秒，写下第一念。" });
assert.deepStrictEqual(camelOnlyFocusSession.training_prescription, { action: "停十秒，写下第一念。" });
assert.deepStrictEqual(camelOnlyFocusSession.sceneTags, ["放量拉升", "怕错过"]);
assert.deepStrictEqual(camelOnlyFocusSession.scene_tags, ["放量拉升", "怕错过"]);
assert.strictEqual(camelOnlyFocusSession.sourceReviewId, "review-camel-only");
assert.strictEqual(camelOnlyFocusSession.source_review_id, "review-camel-only");

const snakeOnlyFocusSession = buildKlineMindSession({
  assessment: { primary: "焦虑型" },
  trainingDay: { day: 5 },
  historyCache: { cn_equity: { "1d": historicalSlice } },
  reviewFocus: {
    source_type: "review_focus",
    error_type: "冲高回落",
    training_prescription: { action: "固定观察窗口。" },
    scene_tags: ["冲高回落"],
    next_action: "只记录，不追动",
    source_review_id: "review-snake-only"
  }
});
assert.strictEqual(snakeOnlyFocusSession.sourceType, "review_focus");
assert.strictEqual(snakeOnlyFocusSession.source_type, "review_focus");
assert.strictEqual(snakeOnlyFocusSession.errorType, "冲高回落");
assert.strictEqual(snakeOnlyFocusSession.error_type, "冲高回落");
assert.deepStrictEqual(snakeOnlyFocusSession.sceneTags, ["冲高回落"]);
assert.deepStrictEqual(snakeOnlyFocusSession.scene_tags, ["冲高回落"]);

const missingSourceTypeSession = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 2 },
  historyCache: { cn_equity: { "1d": historicalSlice } },
  reviewFocus: {
    sourceType: "base_blind",
    source_type: "base_blind"
  }
});
assert.notStrictEqual(missingSourceTypeSession.sourceType, "review_focus");
assert.notStrictEqual(missingSourceTypeSession.source_type, "review_focus");

const sparseReviewFocusRecord = buildKlineMindRecord({
  selectedCandleKey: reviewFocusSession.selectedCandleKey,
  firstReaction: "说不清",
  boundaryChoice: "先停十秒",
  insightLine: "旧 session 缺字段也能生成训练错题卡。"
}, {
  day: 2,
  source_type: "review_focus",
  error_type: "旧题复现",
  candles: reviewFocusSession.candles,
  selectedCandleKey: reviewFocusSession.selectedCandleKey
});
assert.strictEqual(sparseReviewFocusRecord.sourceType, "review_focus");
assert.strictEqual(sparseReviewFocusRecord.source_type, "review_focus");
assert.strictEqual(sparseReviewFocusRecord.errorType, "旧题复现");
assert.strictEqual(sparseReviewFocusRecord.error_type, "旧题复现");
assert.deepStrictEqual(sparseReviewFocusRecord.trainingPrescription, {});
assert.deepStrictEqual(sparseReviewFocusRecord.training_prescription, {});
assert.deepStrictEqual(sparseReviewFocusRecord.sceneTags, []);
assert.deepStrictEqual(sparseReviewFocusRecord.scene_tags, []);
assert.strictEqual(sparseReviewFocusRecord.repeatCount, 1);
assert.strictEqual(sparseReviewFocusRecord.repeat_count, 1);
assert.ok(sparseReviewFocusRecord.executionResult);
assert.strictEqual(sparseReviewFocusRecord.executionResult, sparseReviewFocusRecord.execution_result);
assert.strictEqual(sparseReviewFocusRecord.executionResult, "按计划执行");
assert.strictEqual(sparseReviewFocusRecord.trainingMistakeCard.title, "最明显执行偏离");
assert.strictEqual(sparseReviewFocusRecord.training_mistake_card.title, "最明显执行偏离");
assert.strictEqual(JSON.stringify(sparseReviewFocusRecord).includes("最明显失守"), false);

const fallback = buildKlineMindSession({
  assessment: { primary: "未知型" },
  trainingDay: { day: 12 }
});

assert.strictEqual(fallback.day, 7);
assert.strictEqual(fallback.personalityType, "未知型");
assert.strictEqual(fallback.prescription.title, "稳定时，更要守一");
assert.strictEqual(fallback.hasHistoricalData, false);

console.log("kline-mind module tests passed");
