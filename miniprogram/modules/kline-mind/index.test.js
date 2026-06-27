const assert = require("assert");
const {
  SIX_GATE_MAP,
  PERSONALITY_KLINE_PRESCRIPTIONS,
  buildKlineMindSession,
  buildKlineMindRecord,
  buildOneThoughtEvent,
  calculateKlineMindScore,
  MARKET_CATALOG,
  TIMEFRAME_CATALOG,
  KLINE_TRAINING_METHODS,
  normalizeHistoryCandles,
  getNextKlineMindSliceSeed,
  getPersonalityKlineDrill,
  getInitialKlineVisibleCount,
  startKlineTrainingRuntime,
  advanceKlineTrainingRuntime,
  recordKlineTrainingDecision,
  finishKlineTrainingRuntime,
  buildKlineTrainingMistakeCard,
  setKlineRuntimeChartZoom,
  setKlineRuntimeViewportPan,
  buildKlineTrainingRecordPatch,
  buildKlineTargetedTrainingEntry
} = require("./index");

assert.strictEqual(SIX_GATE_MAP.length, 6);
assert.ok(Object.keys(PERSONALITY_KLINE_PRESCRIPTIONS).length >= 9);
assert.deepStrictEqual(Object.keys(MARKET_CATALOG), ["cn_equity"]);
assert.deepStrictEqual(TIMEFRAME_CATALOG.map((item) => item.key), ["1d", "60m", "30m"]);
assert.ok(KLINE_TRAINING_METHODS.find((item) => item.key === "firecracker"));
assert.strictEqual(KLINE_TRAINING_METHODS[0].key, "firecracker");
assert.ok(KLINE_TRAINING_METHODS[0].steps.includes("点最想追的一根"));
assert.ok(getPersonalityKlineDrill("焦虑型").drillAction.includes("固定观察窗口"));
assert.strictEqual(getNextKlineMindSliceSeed(""), "scene-fast-001");
assert.notStrictEqual(getNextKlineMindSliceSeed("scene-fast-001"), "scene-fast-001");
assert.strictEqual(getNextKlineMindSliceSeed("unknown-seed"), "scene-fast-001");

const targetedTrainingEntry = buildKlineTargetedTrainingEntry({
  hasPrescription: true,
  mainErrorType: "追高冲动",
  count: 5,
  title: "追高冲动专项训练",
  focusText: "放量拉升 / 假突破 / 冲高回落",
  rule: "第一根放量不追，先停十秒",
  packId: "chase_high_impulse"
});
assert.strictEqual(targetedTrainingEntry.hasTarget, true);
assert.strictEqual(targetedTrainingEntry.errorType, "追高冲动");
assert.strictEqual(targetedTrainingEntry.title, "追高冲动专项");
assert.ok(targetedTrainingEntry.summary.includes("你最近最高频错题是「追高冲动」"));
assert.deepStrictEqual(targetedTrainingEntry.sceneTags, ["放量拉升", "假突破", "冲高回落"]);
assert.strictEqual(targetedTrainingEntry.sceneText, "放量拉升 / 假突破 / 冲高回落");
assert.strictEqual(targetedTrainingEntry.actionText, "第一根放量不追，先停十秒");
assert.strictEqual(targetedTrainingEntry.routeParams.error_type, "追高冲动");

const basicTrainingEntry = buildKlineTargetedTrainingEntry({ hasPrescription: false });
assert.strictEqual(basicTrainingEntry.hasTarget, false);
assert.strictEqual(basicTrainingEntry.errorType, "");
assert.strictEqual(basicTrainingEntry.title, "基础盲练");
assert.ok(basicTrainingEntry.summary.includes("还没有真实复盘错题"));
assert.strictEqual(basicTrainingEntry.routeParams.error_type, "");

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
  trainingDay: { day: 2, title: "观止损抗拒" },
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

const compactSchemaSlice = {
  source: "server_cache",
  candles: Array.from({ length: 20 }, (_, index) => ({
    t: `2024-02-${String(index + 1).padStart(2, "0")}`,
    o: 10 + index * 0.1,
    h: 10.8 + index * 0.1,
    l: 9.8 + index * 0.1,
    c: 10.4 + index * 0.1,
    v: 1000 + index * 50
  }))
};
const visualCandles = normalizeHistoryCandles(compactSchemaSlice);
assert.strictEqual(visualCandles.length, 20);
assert.ok(visualCandles.every((item) => !String(item.wickStyle + item.bodyStyle + item.volumeStyle).includes("NaN")));
assert.strictEqual(visualCandles[0].date, "2024-02-01");

const wideVisualCandles = normalizeHistoryCandles({
  source: "server_cache",
  candles: Array.from({ length: 48 }, (_, index) => ({
    t: `2024-03-${String(index + 1).padStart(2, "0")}`,
    o: 10 + index * 0.05,
    h: 10.7 + index * 0.05,
    l: 9.8 + index * 0.05,
    c: 10.35 + index * 0.05,
    v: 1200 + index * 40
  }))
}, { windowSize: 36 });
assert.strictEqual(wideVisualCandles.length, 36);
assert.strictEqual(wideVisualCandles[0].date, "2024-03-13");

const longBlindSlice = {
  source: "server_cache",
  candles: Array.from({ length: 180 }, (_, index) => ({
    t: `bar-${String(index + 1).padStart(3, "0")}`,
    o: 10 + Math.sin(index / 5) * 0.4 + index * 0.01,
    h: 10.7 + Math.sin(index / 5) * 0.4 + index * 0.01,
    l: 9.6 + Math.sin(index / 5) * 0.4 + index * 0.01,
    c: 10.25 + Math.sin((index + 1) / 5) * 0.4 + index * 0.01,
    v: 1200 + (index % 13) * 80
  }))
};
const longVisualCandles = normalizeHistoryCandles(longBlindSlice, { windowSize: 150 });
assert.strictEqual(longVisualCandles.length, 150);
assert.strictEqual(longVisualCandles[0].date, "bar-031");
assert.strictEqual(longVisualCandles[0].ma5Y !== null, true);
assert.strictEqual(longVisualCandles[0].ma10Y !== null, true);
assert.strictEqual(longVisualCandles[0].ma20Y !== null, true);
assert.strictEqual(longVisualCandles[0].bollUpperY !== null, true);
assert.strictEqual(longVisualCandles[0].bollLowerY !== null, true);

const defaultLongSession = buildKlineMindSession({
  record: {
    marketKey: "cn_equity",
    timeframeKey: "1d",
    historySlice: longBlindSlice
  }
});
assert.strictEqual(defaultLongSession.chartZoomKey, "wide");
assert.strictEqual(defaultLongSession.chartWindowSize, 150);
assert.strictEqual(defaultLongSession.candles.length, 150);
assert.deepStrictEqual(defaultLongSession.chartZoomOptions.map((item) => item.key), ["overview", "wide", "standard", "focus"]);
assert.ok(defaultLongSession.chartZoomOptions.find((item) => item.key === "overview").hint.includes("180"));
assert.ok(defaultLongSession.chartZoomOptions.find((item) => item.key === "wide").hint.includes("150"));
assert.strictEqual(defaultLongSession.defaultMainIndicatorKey, "ma");
assert.strictEqual(defaultLongSession.defaultIndicatorKey, "vol");
assert.deepStrictEqual(defaultLongSession.timeframeOptions.map((item) => item.label), ["长线", "中线", "短线"]);
assert.deepStrictEqual(defaultLongSession.mainIndicatorOptions.map((item) => item.key), ["ma", "boll"]);
assert.deepStrictEqual(defaultLongSession.indicatorPanelOptions.map((item) => item.key), ["vol", "macd", "rsi", "kdj"]);
assert.ok(defaultLongSession.chartBoardStyle.includes("width:"));
assert.ok(defaultLongSession.indicatorOverlay.ma5.length > 0);
assert.ok(defaultLongSession.indicatorOverlay.ma10.length > 0);
assert.ok(defaultLongSession.indicatorOverlay.ma20.length > 0);
assert.strictEqual(defaultLongSession.indicatorOverlay.bollUpper.length, 0);
assert.strictEqual(defaultLongSession.indicatorOverlay.bollLower.length, 0);
assert.strictEqual(defaultLongSession.candles[4].ma5Y !== null, true);

const overviewSession = buildKlineMindSession({
  record: {
    marketKey: "cn_equity",
    timeframeKey: "1d",
    chartZoomKey: "overview",
    historySlice: longBlindSlice
  }
});
assert.strictEqual(overviewSession.chartZoomKey, "overview");
assert.strictEqual(overviewSession.chartWindowSize, 180);
assert.strictEqual(overviewSession.candles.length, 180);
assert.ok(overviewSession.chartBoardStyle.includes("min-width: 100%"));
assert.ok(overviewSession.chartBoardStyle.includes("--kline-gap"));

const focusReadableSession = buildKlineMindSession({
  record: {
    marketKey: "cn_equity",
    timeframeKey: "1d",
    chartZoomKey: "focus",
    historySlice: longBlindSlice
  }
});
assert.strictEqual(focusReadableSession.chartWindowSize, 32);
assert.strictEqual(focusReadableSession.candles.length, 32);
assert.ok(focusReadableSession.chartBoardStyle.includes("--kline-candle-width: 32rpx"));
assert.ok(focusReadableSession.chartBoardStyle.includes("--kline-body-width: 24rpx"));
assert.ok(focusReadableSession.candles.every((item) => {
  const match = /height:\s*(\d+)rpx/.exec(item.bodyStyle || "");
  return Number(match && match[1]) >= 10;
}));

const bollCompleteSession = buildKlineMindSession({
  record: {
    marketKey: "cn_equity",
    timeframeKey: "1d",
    chartZoomKey: "overview",
    mainIndicatorKey: "boll",
    historySlice: longBlindSlice
  }
});
assert.strictEqual(bollCompleteSession.indicatorOverlay.bollUpper.length, bollCompleteSession.candles.length - 1);
assert.strictEqual(bollCompleteSession.indicatorOverlay.bollLower.length, bollCompleteSession.candles.length - 1);

const sparseSession = buildKlineMindSession({
  record: {
    marketKey: "cn_equity",
    timeframeKey: "1d",
    historySlice: {
      source: "server_cache",
      candles: historicalSlice.candles.slice(0, 2)
    }
  }
});
assert.strictEqual(sparseSession.hasHistoricalData, false);
assert.strictEqual(sparseSession.candles.length, 0);

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
assert.strictEqual(record.chartZoomKey, "wide");
assert.strictEqual(record.symbol, "000001.SZ");
assert.strictEqual(record.klineSource, "verified_fixture");
assert.strictEqual(record.source, "miniprogram");
assert.ok(record.score >= 80);
assert.strictEqual(calculateKlineMindScore({}), 28);

const demoSession = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 1 },
  record: {
    marketKey: "cn_equity",
    timeframeKey: "30m",
    chartZoomKey: "wide",
    historySlice: {
      source: "local_demo",
      klineSource: "local_demo",
      sliceSource: "local_demo",
      serverSliceStatus: "network_error",
      serverSliceError: "K线服务暂不可用",
      symbol: "local-demo",
      candles: historicalSlice.candles
    }
  }
});
const demoRecord = buildKlineMindRecord({
  selectedCandleKey: demoSession.selectedCandleKey,
  firstReaction: "急躁",
  boundaryChoice: "停十秒",
  insightLine: "离线练习模式下，我只记录第一念。"
}, demoSession);
assert.strictEqual(demoSession.dataStatusText, "离线练习模式");
assert.strictEqual(demoSession.chartZoomKey, "wide");
assert.strictEqual(demoSession.chartWindowSize, 150);
assert.ok(demoSession.chartOrientationHint.includes("横屏"));
assert.deepStrictEqual(demoSession.indicatorCatalog.map((item) => item.key), ["ma", "macd", "boll", "vol", "rsi", "kdj"]);
assert.strictEqual(demoRecord.klineSource, "local_demo");
assert.strictEqual(demoRecord.sliceSource, "local_demo");
assert.strictEqual(demoRecord.serverSliceStatus, "network_error");
assert.strictEqual(demoRecord.serverSliceError, "K线服务暂不可用");

const runtime = startKlineTrainingRuntime(demoSession, {
  trainingSessionId: "runtime-001",
  decisionInterval: 3,
  sliceSeed: "scene-fast-001"
});
assert.strictEqual(runtime.trainingSessionId, "runtime-001");
assert.strictEqual(runtime.simulationMode, "blind_step_replay");
assert.strictEqual(runtime.currentIndex, 0);
assert.strictEqual(runtime.visibleCandles.length, 1);
assert.strictEqual(runtime.mustDecide, false);
assert.strictEqual(runtime.positionState.side, "FLAT");
assert.strictEqual(runtime.sessionMetrics.positionSize, 0);
assert.strictEqual(runtime.sessionMetrics.maxDrawdown, 0);

const warmupRuntime = startKlineTrainingRuntime(buildKlineMindSession({
  record: {
    marketKey: "cn_equity",
    timeframeKey: "1d",
    historySlice: compactSchemaSlice
  }
}), {
  trainingSessionId: "runtime-warmup-001",
  initialVisibleCount: 8
});
assert.strictEqual(warmupRuntime.currentIndex, 7);
assert.strictEqual(warmupRuntime.visibleCandles.length, 8);
assert.strictEqual(warmupRuntime.activeCandle.key, warmupRuntime.visibleCandles[7].key);
assert.strictEqual(
  warmupRuntime.visibleCandles.some((item) => Number(item.runtimeIndex) > warmupRuntime.currentIndex),
  false
);
assert.ok(warmupRuntime.chartBoardStyle.includes("width:"));
assert.ok(warmupRuntime.chartBoardStyle.includes("min-width: 100%"));
assert.strictEqual(warmupRuntime.chartScrollLeft, 0);
assert.strictEqual(warmupRuntime.indicatorPanel.type, "vol");
assert.strictEqual(warmupRuntime.indicatorPanel.items.length, 8);
assert.ok(warmupRuntime.indicatorOverlay.ma5.length > 0);
assert.strictEqual(warmupRuntime.indicatorOverlay.bollUpper.length, 0);
assert.strictEqual(warmupRuntime.mustDecide, false);

const zoomedWarmupRuntime = setKlineRuntimeChartZoom(warmupRuntime, "focus");
assert.strictEqual(zoomedWarmupRuntime.currentIndex, warmupRuntime.currentIndex);
assert.strictEqual(zoomedWarmupRuntime.activeCandle.key, warmupRuntime.activeCandle.key);
assert.strictEqual(zoomedWarmupRuntime.visibleCandles.length, warmupRuntime.visibleCandles.length);
assert.strictEqual(zoomedWarmupRuntime.chartZoomKey, "focus");

const anchoredRuntime = startKlineTrainingRuntime(defaultLongSession, {
  trainingSessionId: "runtime-anchor-001",
  initialVisibleCount: 48
});
const anchoredZoomRuntime = setKlineRuntimeChartZoom(anchoredRuntime, "focus");
assert.strictEqual(anchoredZoomRuntime.currentIndex, anchoredRuntime.currentIndex);
assert.strictEqual(anchoredZoomRuntime.activeCandle.key, anchoredRuntime.activeCandle.key);
assert.strictEqual(anchoredZoomRuntime.chartScrollLeft, 0);
assert.strictEqual(anchoredZoomRuntime.chartViewport.rightBoundaryIndex, anchoredRuntime.currentIndex);
assert.strictEqual(
  Number(anchoredZoomRuntime.visibleCandles[anchoredZoomRuntime.visibleCandles.length - 1].runtimeIndex),
  anchoredRuntime.currentIndex
);

const initialTrainingContext = getInitialKlineVisibleCount(defaultLongSession);
assert.strictEqual(initialTrainingContext, 120);
const expandedContextRuntime = startKlineTrainingRuntime(defaultLongSession, {
  trainingSessionId: "runtime-expanded-context-001",
  initialVisibleCount: initialTrainingContext
});
assert.strictEqual(expandedContextRuntime.visibleCandles.length, 120);
assert.strictEqual(expandedContextRuntime.currentIndex, 119);
assert.strictEqual(
  expandedContextRuntime.visibleCandles.some((item) => Number(item.runtimeIndex) > expandedContextRuntime.currentIndex),
  false
);

const overviewFullRuntime = startKlineTrainingRuntime(overviewSession, {
  trainingSessionId: "runtime-overview-full-001",
  initialVisibleCount: 180
});
assert.strictEqual(overviewFullRuntime.chartZoomKey, "overview");
assert.strictEqual(overviewFullRuntime.visibleCandles.length, 180);
assert.strictEqual(Number(overviewFullRuntime.visibleCandles[0].runtimeIndex), 0);
assert.strictEqual(
  Number(overviewFullRuntime.visibleCandles[overviewFullRuntime.visibleCandles.length - 1].runtimeIndex),
  179
);

const professionalViewportRuntime = startKlineTrainingRuntime(defaultLongSession, {
  trainingSessionId: "runtime-professional-viewport-001",
  initialVisibleCount: 150
});
assert.strictEqual(professionalViewportRuntime.currentIndex, 149);
assert.strictEqual(
  Number(professionalViewportRuntime.visibleCandles[professionalViewportRuntime.visibleCandles.length - 1].runtimeIndex),
  professionalViewportRuntime.currentIndex
);
assert.strictEqual(
  professionalViewportRuntime.visibleCandles.some((item) => Number(item.runtimeIndex) > professionalViewportRuntime.currentIndex),
  false
);
const professionalZoomOutRuntime = setKlineRuntimeChartZoom(professionalViewportRuntime, "overview");
assert.ok(professionalZoomOutRuntime.visibleCandles.length > professionalViewportRuntime.visibleCandles.length);
assert.strictEqual(
  Number(professionalZoomOutRuntime.visibleCandles[professionalZoomOutRuntime.visibleCandles.length - 1].runtimeIndex),
  professionalZoomOutRuntime.currentIndex
);
assert.strictEqual(Number(professionalZoomOutRuntime.visibleCandles[0].runtimeIndex), 0);
const professionalPannedRuntime = setKlineRuntimeViewportPan(professionalViewportRuntime, 18);
assert.strictEqual(professionalPannedRuntime.chartPanOffset, 18);
assert.strictEqual(
  Number(professionalPannedRuntime.visibleCandles[professionalPannedRuntime.visibleCandles.length - 1].runtimeIndex),
  professionalViewportRuntime.currentIndex - 18
);
assert.strictEqual(
  professionalPannedRuntime.visibleCandles.some((item) => Number(item.runtimeIndex) > professionalPannedRuntime.currentIndex),
  false
);
const professionalOverPannedRuntime = setKlineRuntimeViewportPan(professionalViewportRuntime, 999);
assert.strictEqual(Number(professionalOverPannedRuntime.visibleCandles[0].runtimeIndex), 0);
assert.strictEqual(
  professionalOverPannedRuntime.chartPanOffset,
  professionalOverPannedRuntime.chartViewport.maxPanOffset
);

const rsiRuntime = startKlineTrainingRuntime(demoSession, {
  trainingSessionId: "runtime-rsi-001",
  initialVisibleCount: 6,
  initialIndicatorKey: "rsi"
});
assert.strictEqual(rsiRuntime.indicatorPanel.type, "rsi");
assert.ok(rsiRuntime.indicatorPanel.lines.rsi.length > 0);

const kdjRuntime = startKlineTrainingRuntime(demoSession, {
  trainingSessionId: "runtime-kdj-001",
  initialVisibleCount: 6,
  initialIndicatorKey: "kdj"
});
assert.strictEqual(kdjRuntime.indicatorPanel.type, "kdj");
assert.ok(kdjRuntime.indicatorPanel.lines.k.length > 0);
assert.ok(kdjRuntime.indicatorPanel.lines.d.length > 0);
assert.ok(kdjRuntime.indicatorPanel.lines.j.length > 0);

const runtimeStep1 = advanceKlineTrainingRuntime(runtime);
const runtimeStep2 = advanceKlineTrainingRuntime(runtimeStep1);
const runtimeStep3 = advanceKlineTrainingRuntime(runtimeStep2);
assert.strictEqual(runtimeStep3.currentIndex, 3);
assert.strictEqual(runtimeStep3.mustDecide, true);
assert.strictEqual(runtimeStep3.lockedUntilDecision, true);

const blockedRuntime = advanceKlineTrainingRuntime(runtimeStep3);
assert.strictEqual(blockedRuntime.currentIndex, 3);
assert.strictEqual(blockedRuntime.blockedReason, "decision_required");

const decidedRuntime = recordKlineTrainingDecision(runtimeStep3, {
  action: "BUY",
  selectedCandleKey: runtimeStep3.activeCandle.key,
  reactionDirection: "act",
  firstReaction: "想追上去，怕错过这一根。",
  boundaryChoice: "停十秒"
});
assert.strictEqual(decidedRuntime.mustDecide, false);
assert.strictEqual(decidedRuntime.lockedUntilDecision, false);
assert.strictEqual(decidedRuntime.decisionTimeline.length, 1);
assert.strictEqual(decidedRuntime.decisionTimeline[0].action, "BUY");
assert.strictEqual(decidedRuntime.decisionTimeline[0].positionSize, 1);
assert.strictEqual(decidedRuntime.positionState.side, "LONG");
assert.strictEqual(decidedRuntime.positionState.entryPrice, decidedRuntime.decisionTimeline[0].price);
assert.strictEqual(decidedRuntime.sessionMetrics.positionSize, 1);
assert.deepStrictEqual(decidedRuntime.emotionBadges.map((item) => item.type), ["GREED"]);
assert.ok(decidedRuntime.riskHints[0].text.includes("追"));
assert.ok(decidedRuntime.coachHints[0].text.includes("先停"));

const runtimeRecordPatch = buildKlineTrainingRecordPatch(decidedRuntime);
assert.strictEqual(runtimeRecordPatch.trainingSessionId, "runtime-001");
assert.strictEqual(runtimeRecordPatch.simulationMode, "blind_step_replay");
assert.strictEqual(runtimeRecordPatch.sliceSeed, "scene-fast-001");
assert.strictEqual(runtimeRecordPatch.selectedCandleKey, decidedRuntime.activeCandle.key);
assert.strictEqual(runtimeRecordPatch.reactionDirection, "act");
assert.strictEqual(runtimeRecordPatch.firstReaction, "想追上去，怕错过这一根。");
assert.strictEqual(runtimeRecordPatch.boundaryChoice, "停十秒");
assert.strictEqual(runtimeRecordPatch.decisionTimeline.length, 1);
assert.strictEqual(runtimeRecordPatch.emotionBadges[0].type, "GREED");
assert.ok(runtimeRecordPatch.riskHints[0].text.includes("追"));
assert.ok(runtimeRecordPatch.coachHints[0].text.includes("先停"));
assert.strictEqual(runtimeRecordPatch.sessionMetrics.positionSize, 1);
assert.strictEqual(runtimeRecordPatch.positionState.side, "LONG");

const targetedRuntime = startKlineTrainingRuntime(demoSession, {
  trainingSessionId: "runtime-targeted-001",
  initialVisibleCount: 2,
  errorType: "追高冲动"
});
const targetedDecisionRuntime = recordKlineTrainingDecision(targetedRuntime, {
  action: "BUY",
  positionLevel: "半仓",
  createdAt: "2026-06-28T10:00:00.000Z"
});
const targetedDecision = targetedDecisionRuntime.decisionTimeline[0];
assert.strictEqual(targetedDecision.sessionId, "runtime-targeted-001");
assert.strictEqual(targetedDecision.session_id, "runtime-targeted-001");
assert.strictEqual(targetedDecision.index, targetedRuntime.currentIndex);
assert.strictEqual(targetedDecision.barIndex, targetedRuntime.currentIndex);
assert.strictEqual(targetedDecision.bar_index, targetedRuntime.currentIndex);
assert.strictEqual(targetedDecision.errorType, "追高冲动");
assert.strictEqual(targetedDecision.error_type, "追高冲动");
assert.strictEqual(targetedDecision.positionLevel, "半仓");
assert.strictEqual(targetedDecision.position_level, "半仓");
assert.strictEqual(targetedDecision.createdAt, "2026-06-28T10:00:00.000Z");
assert.strictEqual(targetedDecision.created_at, "2026-06-28T10:00:00.000Z");
assert.strictEqual(targetedDecision.positionSize, 0.5);
assert.ok(targetedDecision.price > 0);

const finishedTargetedRuntime = finishKlineTrainingRuntime(targetedDecisionRuntime, {
  completedAt: "2026-06-28T10:01:00.000Z"
});
assert.strictEqual(finishedTargetedRuntime.completed, true);
assert.strictEqual(finishedTargetedRuntime.trainingResult.sessionId, "runtime-targeted-001");
assert.strictEqual(finishedTargetedRuntime.trainingResult.session_id, "runtime-targeted-001");
assert.strictEqual(finishedTargetedRuntime.trainingResult.errorType, "追高冲动");
assert.strictEqual(finishedTargetedRuntime.trainingResult.error_type, "追高冲动");
assert.strictEqual(finishedTargetedRuntime.trainingResult.totalActions, 1);
assert.strictEqual(finishedTargetedRuntime.trainingResult.buyCount, 1);
assert.strictEqual(finishedTargetedRuntime.trainingResult.completedAt, "2026-06-28T10:01:00.000Z");
assert.strictEqual(finishedTargetedRuntime.trainingResult.completed_at, "2026-06-28T10:01:00.000Z");
const finishedTargetedPatch = buildKlineTrainingRecordPatch(finishedTargetedRuntime);
assert.strictEqual(finishedTargetedPatch.completed, true);
assert.strictEqual(finishedTargetedPatch.errorType, "追高冲动");
assert.strictEqual(finishedTargetedPatch.error_type, "追高冲动");
assert.strictEqual(finishedTargetedPatch.trainingResult.totalActions, 1);

const chaseHighCard = buildKlineTrainingMistakeCard({
  trainingSessionId: "runtime-chase-high",
  errorType: "追高冲动",
  decisionTimeline: [
    {
      action: "BUY",
      sceneTag: "放量拉升",
      scene_tag: "放量拉升",
      positionLevel: "重仓",
      position_level: "重仓",
      barIndex: 8,
      bar_index: 8,
      price: 10.25
    }
  ],
  trainingResult: {
    pnlResult: -1.25,
    pnl_result: -1.25,
    totalActions: 1,
    total_actions: 1
  }
});
assert.strictEqual(chaseHighCard.errorType, "追高冲动");
assert.strictEqual(chaseHighCard.error_type, "追高冲动");
assert.strictEqual(chaseHighCard.trainingType, "追高冲动专项");
assert.strictEqual(chaseHighCard.repeatCount, 1);
assert.strictEqual(chaseHighCard.repeat_count, 1);
assert.strictEqual(chaseHighCard.executionResult, "执行偏离");
assert.strictEqual(chaseHighCard.executionConsistencyText, "0%");
assert.strictEqual(chaseHighCard.execution_consistency_text, "0%");
assert.ok(chaseHighCard.obviousMiss.includes("重仓追高"));
assert.ok(chaseHighCard.nextAction.includes("第一根放量不追"));
assert.ok(chaseHighCard.trainingPrescription.includes("追高冲动专项"));

const addPositionCard = buildKlineTrainingMistakeCard({
  trainingSessionId: "runtime-add-position",
  errorType: "补仓冲动",
  decisionTimeline: [
    { action: "BUY", price: 10, barIndex: 2, positionLevel: "半仓" },
    { action: "BUY", price: 9.2, barIndex: 5, positionLevel: "重仓" }
  ],
  trainingResult: { totalActions: 2, total_actions: 2 }
});
assert.strictEqual(addPositionCard.repeatCount, 1);
assert.ok(addPositionCard.obviousMiss.includes("补仓冲动"));

const sellFlyCard = buildKlineTrainingMistakeCard({
  trainingSessionId: "runtime-sell-fly",
  errorType: "卖飞懊悔",
  decisionTimeline: [
    { action: "SELL", price: 10.8, barIndex: 10 },
    { action: "BUY", price: 11.1, barIndex: 12, positionLevel: "半仓" }
  ],
  trainingResult: { totalActions: 2, total_actions: 2 }
});
assert.strictEqual(sellFlyCard.repeatCount, 1);
assert.ok(sellFlyCard.obviousMiss.includes("卖飞后急追"));

const cleanCard = buildKlineTrainingMistakeCard({
  trainingSessionId: "runtime-clean",
  errorType: "追高冲动",
  decisionTimeline: [
    { action: "HOLD", sceneTag: "放量拉升", barIndex: 4 }
  ],
  trainingResult: { totalActions: 1, total_actions: 1 }
});
assert.strictEqual(cleanCard.repeatCount, 0);
assert.strictEqual(cleanCard.obviousMiss, "本局暂无明显失守");
assert.strictEqual(cleanCard.executionResult, "本局暂无明显失守");
assert.strictEqual(cleanCard.executionConsistencyText, "100%");

const emptyTrainingCard = buildKlineTrainingMistakeCard({
  trainingSessionId: "runtime-empty-training",
  errorType: "追高冲动",
  decisionTimeline: [],
  trainingResult: {
    totalActions: 0,
    total_actions: 0
  }
});
assert.strictEqual(emptyTrainingCard.executionConsistencyText, "样本不足");
assert.strictEqual(emptyTrainingCard.execution_consistency_text, "样本不足");

const runtimeStep4 = advanceKlineTrainingRuntime(decidedRuntime);
assert.strictEqual(runtimeStep4.currentIndex, 4);
assert.ok(Number.isFinite(runtimeStep4.sessionMetrics.unrealizedPnl));

const closedRuntime = recordKlineTrainingDecision(runtimeStep4, {
  action: "SELL",
  selectedCandleKey: runtimeStep4.activeCandle.key,
  reactionDirection: "observe",
  firstReaction: "先退出模拟仓位，记录这次波动。",
  boundaryChoice: "回到计划"
});
assert.strictEqual(closedRuntime.positionState.side, "FLAT");
assert.strictEqual(closedRuntime.sessionMetrics.positionSize, 0);
assert.ok(Number.isFinite(closedRuntime.sessionMetrics.realizedPnl));
assert.ok(Number.isFinite(closedRuntime.sessionMetrics.maxDrawdown));

const runtimeRecord = buildKlineMindRecord({
  selectedCandleKey: demoSession.selectedCandleKey,
  firstReaction: "急躁",
  boundaryChoice: "停十秒",
  insightLine: "我看见自己想追上去，但先停了一下。",
  trainingSessionId: decidedRuntime.trainingSessionId,
  simulationMode: decidedRuntime.simulationMode,
  sliceSeed: decidedRuntime.sliceSeed,
  decisionTimeline: decidedRuntime.decisionTimeline,
  emotionBadges: decidedRuntime.emotionBadges,
  riskHints: decidedRuntime.riskHints,
  coachHints: decidedRuntime.coachHints,
  positionState: decidedRuntime.positionState,
  sessionMetrics: decidedRuntime.sessionMetrics,
  errorType: "追高冲动",
  error_type: "追高冲动",
  trainingPackId: "chase_high_impulse",
  trainingPackTitle: "追高冲动专项"
}, demoSession);
assert.strictEqual(runtimeRecord.trainingSessionId, "runtime-001");
assert.strictEqual(runtimeRecord.simulationMode, "blind_step_replay");
assert.strictEqual(runtimeRecord.sliceSeed, "scene-fast-001");
assert.strictEqual(runtimeRecord.errorType, "追高冲动");
assert.strictEqual(runtimeRecord.error_type, "追高冲动");
assert.strictEqual(runtimeRecord.trainingPackId, "chase_high_impulse");
assert.strictEqual(runtimeRecord.trainingPackTitle, "追高冲动专项");
assert.strictEqual(runtimeRecord.decisionTimeline.length, 1);
assert.strictEqual(runtimeRecord.sessionMetrics.positionSize, 1);
assert.strictEqual(runtimeRecord.positionState.side, "LONG");
assert.strictEqual(runtimeRecord.firstReaction, "急躁");
assert.strictEqual(runtimeRecord.boundaryChoice, "停十秒");
assert.strictEqual(runtimeRecord.insightLine, "我看见自己想追上去，但先停了一下。");

const oneThoughtEvent = buildOneThoughtEvent(Object.assign({}, demoRecord, {
  localRecordId: "kline-mind-local-001",
  userId: "",
  insightLine: "手机号 13800138000 不应进入事件明文。",
  relatedMirror: "冲动型"
}), {
  identity: {
    anonymousId: "anon-open-loop-001"
  }
});
const rebuiltOneThoughtEvent = buildOneThoughtEvent(Object.assign({}, demoRecord, {
  localRecordId: "kline-mind-local-001"
}), {
  existingEvent: oneThoughtEvent
});
assert.strictEqual(oneThoughtEvent.eventId, rebuiltOneThoughtEvent.eventId);
assert.strictEqual(oneThoughtEvent.localRecordId, "kline-mind-local-001");
assert.strictEqual(oneThoughtEvent.eventType, "kline_training");
assert.strictEqual(oneThoughtEvent.anonymousId, "anon-open-loop-001");
assert.strictEqual(oneThoughtEvent.klineSource, "local_demo");
assert.strictEqual(oneThoughtEvent.serverSliceStatus, "network_error");
assert.strictEqual(oneThoughtEvent.serverSliceError, "K线服务暂不可用");
assert.strictEqual(oneThoughtEvent.market, "cn_equity");
assert.strictEqual(oneThoughtEvent.symbol, "local-demo");
assert.strictEqual(oneThoughtEvent.timeframe, "30m");
assert.strictEqual(oneThoughtEvent.mode, "step_replay");
assert.strictEqual(oneThoughtEvent.reactionChoice, "急躁");
assert.strictEqual(oneThoughtEvent.boundaryState, "停十秒");
assert.strictEqual(oneThoughtEvent.relatedMirror, "冲动型");
assert.strictEqual(oneThoughtEvent.clientSyncStatus, "local_saved");
assert.ok(!JSON.stringify(oneThoughtEvent).includes("13800138000"));

const fallback = buildKlineMindSession({
  assessment: { primary: "未知型" },
  trainingDay: { day: 12 }
});

assert.strictEqual(fallback.day, 7);
assert.strictEqual(fallback.personalityType, "未知型");
assert.strictEqual(fallback.prescription.title, "稳定时，更要守一");
assert.strictEqual(fallback.hasHistoricalData, false);

console.log("kline-mind module tests passed");
