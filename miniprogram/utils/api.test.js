const assert = require("assert");

const storage = {};
let envVersion = "release";

global.wx = {
  getStorageSync(key) {
    return storage[key];
  },
  setStorageSync(key, value) {
    storage[key] = value;
  },
  getAccountInfoSync() {
    return { miniProgram: { envVersion } };
  }
};

const {
  PRODUCTION_API_BASE,
  getApiBase,
  normalizeKlineTrainingSliceResult
} = require("./api");

assert.strictEqual(PRODUCTION_API_BASE, "https://xxjyxt.com");
storage.zhixing_api_base = "http://127.0.0.1:8787";
envVersion = "release";
assert.strictEqual(getApiBase(), "https://xxjyxt.com");

envVersion = "develop";
assert.strictEqual(getApiBase(), "http://127.0.0.1:8787");

const normalized = normalizeKlineTrainingSliceResult({
  ok: true,
  slice: {
    id: "slice-001",
    source: "server",
    symbol: "600519",
    timeframe: "1d",
    manifest_status: "ok",
    candles: [
      { time: "2026-01-01", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 },
      { time: "2026-01-02", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 },
      { time: "2026-01-03", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 },
      { time: "2026-01-04", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 },
      { time: "2026-01-05", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 },
      { time: "2026-01-06", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 }
    ]
  }
});
assert.strictEqual(normalized.ok, true);
assert.strictEqual(normalized.source, "server");
assert.strictEqual(normalized.barCount, 6);
assert.strictEqual(normalized.slice.candles.length, 6);

const empty = normalizeKlineTrainingSliceResult({ ok: true, slice: { candles: [] } });
assert.strictEqual(empty.ok, false);
assert.strictEqual(empty.reason, "empty_slice");

const insufficient = normalizeKlineTrainingSliceResult({ ok: true, slice: { candles: [{ open: 1 }] } });
assert.strictEqual(insufficient.ok, false);
assert.strictEqual(insufficient.reason, "insufficient_slice");

console.log("miniprogram api tests passed");
