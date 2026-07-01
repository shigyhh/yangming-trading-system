const assert = require("assert");
const fs = require("fs");
const path = require("path");

const storage = {};
const requests = [];

function buildCandles(count) {
  return Array.from({ length: count }, (_, index) => ({
    index: index + 1,
    time: index + 1,
    open: 100 + index,
    high: 102 + index,
    low: 98 + index,
    close: 101 + index,
    volume: 1000 + index
  }));
}

global.wx = {
  getAccountInfoSync() {
    return { miniProgram: { envVersion: "develop" } };
  },
  getSystemInfoSync() {
    return { platform: "devtools" };
  },
  getStorageSync(key) {
    return storage[key];
  },
  setStorageSync(key, value) {
    storage[key] = value;
  },
  request(options) {
    const url = new URL(options.url);
    requests.push({
      method: options.method || "GET",
      path: url.pathname,
      windowSize: url.searchParams.get("window"),
      poolSlot: url.searchParams.get("pool_slot"),
      scenarioId: url.searchParams.get("scenario_id"),
      data: options.data || null
    });

    if (url.pathname === "/api/v1/kline-history/preheat-plan") {
      const timeframes = String(url.searchParams.get("timeframes") || "1d").split(",");
      const depth = Number(url.searchParams.get("prefetch_depth") || 1);
      const scenarioId = url.searchParams.get("scenario_id") || "scene-fast-001";
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          scenario_id: scenarioId,
          items: timeframes.flatMap((timeframe) => (
            Array.from({ length: depth }, (_, index) => ({
              market: "cn_equity",
              timeframe,
              window: Number(url.searchParams.get("window") || 60),
              mode: url.searchParams.get("mode") || "step_replay",
              gate: url.searchParams.get("gate") || "shi_shang_mo",
              blind: true,
              seed: `${scenarioId}:${timeframe}:${String(index + 1).padStart(2, "0")}`,
              pool_slot: `${scenarioId}:${timeframe}:${String(index + 1).padStart(2, "0")}`
            }))
          ))
        }
      });
      return;
    }

    if (url.pathname === "/api/v1/kline-history/preheat") {
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          preheated: (options.data.items || []).map((item) => ({
            ok: true,
            timeframe: item.timeframe,
            pool_slot: item.pool_slot,
            candle_count: options.data.window
          }))
        }
      });
      return;
    }

    const candles = buildCandles(Number(url.searchParams.get("window") || 60));
    options.success({
      statusCode: 200,
      data: {
        ok: true,
        slice: {
          hot_pool: true,
          cache_status: "hot_hit",
          market: { key: "cn_equity" },
          timeframe: { key: url.searchParams.get("timeframe") },
          candles,
          visible_count: candles.length
        }
      }
    });
  }
};

storage.zhixing_api_base_enabled = true;

const { buildKlineTrainingHotPoolSlot, prefetchKlineTrainingSlices } = require("./api");

(async () => {
  await prefetchKlineTrainingSlices({
    marketKey: "cn",
    timeframes: ["1d"],
    prefetchDepth: 2,
    windowSize: 60,
    scenarioId: "daily-kline-entry"
  });

  assert.strictEqual(requests[0].method, "GET");
  assert.strictEqual(requests[0].path, "/api/v1/kline-history/preheat-plan");
  assert.strictEqual(requests[0].scenarioId, "daily-kline-entry");
  assert.strictEqual(requests[1].method, "POST");
  assert.strictEqual(requests[1].path, "/api/v1/kline-history/preheat");
  assert.strictEqual(requests[1].data.items.length, 2);
  assert.deepStrictEqual(
    requests[1].data.items.map((item) => item.pool_slot),
    ["daily-kline-entry:1d:01", "daily-kline-entry:1d:02"]
  );
  assert.deepStrictEqual(
    requests.slice(2).map((item) => item.path),
    ["/api/v1/kline-history/hot-slice", "/api/v1/kline-history/hot-slice"]
  );
  assert.deepStrictEqual(
    requests.slice(2).map((item) => item.poolSlot),
    requests[1].data.items.map((item) => item.pool_slot),
    "hot reads should use the same server preheated pool slots"
  );
  assert.strictEqual(
    buildKlineTrainingHotPoolSlot({
      scenarioId: "daily-kline-entry",
      timeframeKey: "1d",
      index: 2
    }),
    "daily-kline-entry:1d:02",
    "page reads should be able to reuse the same deterministic hot-pool slot contract"
  );
  assert.strictEqual(
    buildKlineTrainingHotPoolSlot({
      scenarioId: "",
      timeframeKey: "",
      index: "bad"
    }),
    "scene-fast-001:1d:01",
    "invalid slot inputs should fall back to the canonical entry slot"
  );

  const trainingSource = fs.readFileSync(path.join(__dirname, "../pages/training/index.js"), "utf8");
  const reviewDetailSource = fs.readFileSync(path.join(__dirname, "../pages/trade-review-detail/index.js"), "utf8");
  const klinePageSource = fs.readFileSync(path.join(__dirname, "../pages/kline-mind/index.js"), "utf8");
  const klinePageWxml = fs.readFileSync(path.join(__dirname, "../pages/kline-mind/index.wxml"), "utf8");
  assert.ok(trainingSource.includes("prefetchKlineTrainingSlices"));
  assert.ok(trainingSource.includes("warmKlineMindTrainingEntry"));
  assert.ok(reviewDetailSource.includes("prefetchKlineTrainingSlices"));
  assert.ok(reviewDetailSource.includes("warmReviewFocusKline"));
  assert.ok(klinePageSource.includes("prefetchKlineTrainingSlices"));
  assert.ok(klinePageSource.includes("buildKlineTrainingHotPoolSlot"));
  assert.ok(!klinePageSource.includes("buildSliceRequestSlot(\"active\")"));
  assert.ok(klinePageSource.includes("const SLICE_SWITCH_LIMIT = 9"));
  assert.ok(klinePageSource.includes("sliceSwitchLimitReached"));
  assert.ok(klinePageWxml.includes("sliceSwitchLimitReached"));
  assert.ok(!klinePageSource.includes("SLICE_SWITCH_COOLDOWN_MS"));
  assert.ok(!klinePageSource.includes("sliceSwitchLocked"));
  assert.ok(!klinePageWxml.includes("sliceSwitchLocked"));

  console.log("kline preheat tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
