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
  getPersonalityKlineDrill
} = require("./index");

assert.strictEqual(SIX_GATE_MAP.length, 6);
assert.ok(Object.keys(PERSONALITY_KLINE_PRESCRIPTIONS).length >= 9);
assert.deepStrictEqual(Object.keys(MARKET_CATALOG), ["cn_equity"]);
assert.deepStrictEqual(TIMEFRAME_CATALOG.map((item) => item.key), ["30m", "60m", "1d"]);
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
  insightLine: "当前为本地练习样本，我只记录第一念。"
}, demoSession);
assert.strictEqual(demoSession.dataStatusText, "当前为本地练习样本");
assert.strictEqual(demoRecord.klineSource, "local_demo");
assert.strictEqual(demoRecord.sliceSource, "local_demo");
assert.strictEqual(demoRecord.serverSliceStatus, "network_error");
assert.strictEqual(demoRecord.serverSliceError, "K线服务暂不可用");

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
