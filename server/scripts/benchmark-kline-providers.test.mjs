import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateCandles,
  normalizeBenchmarkSymbol,
  summarizeProviderResults,
  tickflowUnavailableResult
} from "./benchmark-kline-providers.js";

test("benchmark normalizes A-share symbols for provider comparison", () => {
  assert.deepEqual(normalizeBenchmarkSymbol("600519"), {
    raw: "600519",
    market: "ashare",
    canonical: "600519.SH",
    localCode: "600519"
  });
  assert.deepEqual(normalizeBenchmarkSymbol("300750"), {
    raw: "300750",
    market: "ashare",
    canonical: "300750.SZ",
    localCode: "300750"
  });
  assert.equal(normalizeBenchmarkSymbol("00700.HK").market, "hk");
  assert.equal(normalizeBenchmarkSymbol("AAPL.US").market, "us");
});

test("benchmark evaluates field completeness, OHLC validity, sorting and duplicates", () => {
  const result = evaluateCandles([
    { time: "2024-01-02", open: 10, high: 12, low: 9, close: 11, volume: 100 },
    { time: "2024-01-03", open: 11, high: 13, low: 10, close: 12, volume: 120 },
    { time: "2024-01-03", open: 12, high: 11, low: 10, close: 11, volume: 80 }
  ]);

  assert.equal(result.candlesCount, 3);
  assert.equal(result.fieldsComplete, true);
  assert.equal(result.ohlcValid, false);
  assert.equal(result.sortedByTime, true);
  assert.equal(result.duplicateTimeCount, 1);
  assert.equal(result.firstTime, "2024-01-02");
  assert.equal(result.lastTime, "2024-01-03");
});

test("tickflow unavailable result is explicit and not counted as success", () => {
  const result = tickflowUnavailableResult({
    symbol: "600519.SH",
    period: "1d",
    count: 100,
    reason: "TICKFLOW_API_BASE_URL 未配置"
  });

  assert.equal(result.provider, "tickflow");
  assert.equal(result.success, false);
  assert.equal(result.errorMessage.includes("TICKFLOW_API_BASE_URL"), true);
});

test("benchmark summary reports success rate and average latency", () => {
  const summary = summarizeProviderResults("baostock", [
    { provider: "baostock", success: true, latencyMs: 100, fieldsComplete: false, ohlcValid: true, sortedByTime: true, duplicateTimeCount: 0 },
    { provider: "baostock", success: false, latencyMs: 300, fieldsComplete: false, ohlcValid: false, sortedByTime: false, duplicateTimeCount: 2 }
  ]);

  assert.equal(summary.provider, "baostock");
  assert.equal(summary.successRate, "50.0%");
  assert.equal(summary.avgLatencyMs, 200);
  assert.equal(summary.dataQualityErrors, 1);
});
