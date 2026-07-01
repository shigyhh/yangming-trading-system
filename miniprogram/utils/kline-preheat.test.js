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
      data: options.data || null
    });

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

const { prefetchKlineTrainingSlices } = require("./api");

(async () => {
  await prefetchKlineTrainingSlices({
    marketKey: "cn",
    timeframes: ["1d"],
    prefetchDepth: 2,
    windowSize: 60
  });

  assert.strictEqual(requests[0].method, "POST");
  assert.strictEqual(requests[0].path, "/api/v1/kline-history/preheat");
  assert.strictEqual(requests[0].data.items.length, 2);
  assert.ok(requests[0].data.items.every((item) => item.pool_slot));
  assert.deepStrictEqual(
    requests.slice(1).map((item) => item.path),
    ["/api/v1/kline-history/hot-slice", "/api/v1/kline-history/hot-slice"]
  );
  assert.deepStrictEqual(
    requests.slice(1).map((item) => item.poolSlot),
    requests[0].data.items.map((item) => item.pool_slot),
    "hot reads should use the same server preheated pool slots"
  );

  const trainingSource = fs.readFileSync(path.join(__dirname, "../pages/training/index.js"), "utf8");
  const reviewDetailSource = fs.readFileSync(path.join(__dirname, "../pages/trade-review-detail/index.js"), "utf8");
  assert.ok(trainingSource.includes("prefetchKlineTrainingSlices"));
  assert.ok(trainingSource.includes("warmKlineMindTrainingEntry"));
  assert.ok(reviewDetailSource.includes("prefetchKlineTrainingSlices"));
  assert.ok(reviewDetailSource.includes("warmReviewFocusKline"));

  console.log("kline preheat tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
