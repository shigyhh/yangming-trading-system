const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const klineMind = require("./modules/kline-mind/index");

const {
  buildKlineMindSession,
  startKlineTrainingRuntime,
  setKlineRuntimeChartZoom,
  setKlineRuntimeViewportPan,
  setKlineRuntimeIndicator,
  setKlineRuntimeMainIndicator,
  buildKlineTrainingRecordPatch
} = klineMind;

const sampleCandles = Array.from({ length: 80 }).map((_, index) => {
  const open = 10 + index * 0.03;
  const close = open + (index % 2 === 0 ? 0.12 : -0.08);
  return {
    date: `2026-05-${String((index % 28) + 1).padStart(2, "0")}`,
    open,
    high: Math.max(open, close) + 0.18,
    low: Math.min(open, close) - 0.16,
    close,
    volume: 1000 + index * 23
  };
});

const session = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 2, title: "观风险处理抗拒" },
  record: {
    marketKey: "cn_equity",
    timeframeKey: "1d",
    scenarioId: "scene-fast-001",
    historySlice: {
      source: "server_cache",
      symbol: "000001.SZ",
      start: "2026-05-01",
      end: "2026-06-20",
      candles: sampleCandles
    }
  }
});

assert.deepStrictEqual(session.timeframeOptions.map((item) => item.label), ["长线", "中线", "短线"]);
assert.deepStrictEqual(session.indicatorCatalog.map((item) => item.key), ["ma", "macd", "boll", "vol", "rsi", "kdj"]);
assert.deepStrictEqual(session.mainIndicatorOptions.map((item) => item.key), ["ma", "boll"]);
assert.deepStrictEqual(session.indicatorPanelOptions.map((item) => item.key), ["vol", "macd", "rsi", "kdj"]);

const runtime = startKlineTrainingRuntime(session, {
  trainingSessionId: "kline-runtime-k1",
  decisionInterval: 5,
  initialVisibleCount: 40,
  initialMainIndicatorKey: "ma",
  initialIndicatorKey: "vol",
  sliceSeed: "scene-fast-001"
});

assert.strictEqual(runtime.simulationMode, "blind_step_replay");
assert.ok(runtime.visibleCandles.length > 0);
assert.ok(runtime.indicatorOverlay.ma5.length > 0);
assert.ok(runtime.indicatorOverlay.ma10.length > 0);
assert.ok(runtime.indicatorOverlay.ma20.length > 0);
assert.strictEqual(runtime.indicatorPanel.type, "vol");
assert.ok(runtime.indicatorPanel.items.length > 0);

const zoomed = setKlineRuntimeChartZoom(runtime, "focus");
assert.strictEqual(zoomed.chartZoomKey, "focus");
assert.ok(zoomed.visibleCandles.length <= runtime.visibleCandles.length);

const panned = setKlineRuntimeViewportPan(zoomed, 8);
assert.strictEqual(panned.chartPanOffset, 8);

const bollRuntime = setKlineRuntimeMainIndicator(runtime, "boll");
assert.strictEqual(bollRuntime.mainIndicatorKey, "boll");
assert.ok(bollRuntime.indicatorOverlay.bollUpper.length > 0);
assert.ok(bollRuntime.indicatorOverlay.bollLower.length > 0);

const macdRuntime = setKlineRuntimeIndicator(runtime, "macd");
assert.strictEqual(macdRuntime.indicatorPanel.type, "macd");
assert.ok(macdRuntime.indicatorPanel.lines.dif.length > 0);
assert.ok(macdRuntime.indicatorPanel.lines.dea.length > 0);

const runtimePatch = buildKlineTrainingRecordPatch(macdRuntime);
assert.strictEqual(runtimePatch.simulationMode, "blind_step_replay");
assert.strictEqual(runtimePatch.sliceSeed, "scene-fast-001");
assert.ok(runtimePatch.selectedCandleKey);

const pageWxml = readFileSync(join(root, "miniprogram", "pages", "kline-mind", "index.wxml"), "utf8");
const pageJs = readFileSync(join(root, "miniprogram", "pages", "kline-mind", "index.js"), "utf8");

[
  "runtimeView.indicatorOverlay.ma5",
  "runtimeView.indicatorOverlay.bollUpper",
  "runtimeView.indicatorPanel.lines.dif",
  "bindtouchstart=\"onChartPanStart\"",
  "bindtap=\"decreaseChartZoom\"",
  "bindtap=\"increaseChartZoom\"",
  "bindtap=\"switchSlice\"",
  "bindtap=\"selectMainIndicator\"",
  "bindtap=\"selectIndicator\"",
  "bindtap=\"advanceRuntimeCandle\"",
  "bindtap=\"recordRuntimeDecision\""
].forEach((marker) => {
  assert.ok(pageWxml.includes(marker), `kline WXML should include ${marker}`);
});

[
  "loadServerHistorySlice",
  "prefetchTimeframeSlices",
  "prefetchNextSlice",
  "onChartPanStart",
  "onChartPanMove",
  "decreaseChartZoom",
  "increaseChartZoom",
  "recordRuntimeDecision",
  "advanceRuntimeCandle",
  "buildKlineTrainingRecordPatch"
].forEach((marker) => {
  assert.ok(pageJs.includes(marker), `kline page JS should include ${marker}`);
});

console.log("kline v2 runtime recovery guard passed");
