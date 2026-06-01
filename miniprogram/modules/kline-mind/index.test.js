const assert = require("assert");
const {
  SIX_GATE_MAP,
  PERSONALITY_KLINE_PRESCRIPTIONS,
  buildKlineMindSession,
  buildKlineMindRecord,
  calculateKlineMindScore,
  MARKET_CATALOG,
  TIMEFRAME_CATALOG,
  KLINE_TRAINING_METHODS,
  getPersonalityKlineDrill
} = require("./index");

assert.strictEqual(SIX_GATE_MAP.length, 6);
assert.ok(Object.keys(PERSONALITY_KLINE_PRESCRIPTIONS).length >= 9);
assert.deepStrictEqual(Object.keys(MARKET_CATALOG), ["cn_equity", "futures", "us_equity", "hk_equity", "crypto"]);
assert.deepStrictEqual(TIMEFRAME_CATALOG.map((item) => item.key), ["5m", "10m", "30m", "60m", "1d", "1w", "1mo", "1y"]);
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
assert.ok(record.score >= 80);
assert.strictEqual(calculateKlineMindScore({}), 28);

const fallback = buildKlineMindSession({
  assessment: { primary: "未知型" },
  trainingDay: { day: 12 }
});

assert.strictEqual(fallback.day, 7);
assert.strictEqual(fallback.personalityType, "未知型");
assert.strictEqual(fallback.prescription.title, "稳定时，更要守一");
assert.strictEqual(fallback.hasHistoricalData, false);

console.log("kline-mind module tests passed");
