const assert = require("assert");
const fs = require("fs");
const path = require("path");

const storage = {};
const requests = [];

function buildCandles(count) {
  return Array.from({ length: count }, (_, index) => ({
    index: index + 1,
    time: index + 1,
    open: 100 + index * 0.01,
    high: 100.2 + index * 0.01,
    low: 99.8 + index * 0.01,
    close: 100.05 + index * 0.01,
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
    const windowSize = url.searchParams.get("window");
    requests.push({
      path: url.pathname,
      windowSize,
      url: options.url
    });

    if (Number(windowSize) > 96) {
      options.success({
        statusCode: 404,
        data: {
          ok: false,
          error: "真实历史K线数量不足"
        }
      });
      return;
    }

    const candles = buildCandles(96);
    options.success({
      statusCode: 200,
      data: {
        ok: true,
        slice: {
          source: "historical_market_cache",
          market: { key: "cn_equity" },
          timeframe: { key: "60m" },
          candles,
          visible_count: candles.length
        }
      }
    });
  }
};

storage.zhixing_api_base_enabled = true;

const {
  KLINE_TRAINING_WINDOW_SIZE,
  fetchKlineTrainingSlice,
  getCachedKlineTrainingSlice
} = require("./api");

(async () => {
  assert.strictEqual(
    KLINE_TRAINING_WINDOW_SIZE,
    180,
    "default K-line training request should ask for enough bars for indicator warmup"
  );

  const result = await fetchKlineTrainingSlice({
    marketKey: "cn_equity",
    timeframeKey: "60m",
    symbol: "000001.SZ",
    blind: true,
    mode: "step_replay",
    gateKey: "shi_shang_mo"
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.candles.length, 96);
  assert.deepStrictEqual(
    requests.map((item) => item.windowSize),
    ["180", "150", "96"],
    "fetch should fall back to smaller real windows instead of returning an empty K-line page"
  );

  const cached = getCachedKlineTrainingSlice({
    marketKey: "cn_equity",
    timeframeKey: "60m",
    symbol: "000001.SZ",
    blind: true,
    mode: "step_replay",
    gateKey: "shi_shang_mo"
  });

  assert.strictEqual(cached.ok, true);
  assert.strictEqual(cached.candles.length, 96);
  assert.strictEqual(cached.instantCacheHit, true);

  const pageSource = fs.readFileSync(path.join(__dirname, "../pages/kline-mind/index.js"), "utf8");
  assert.ok(pageSource.includes("getCachedKlineTrainingSlice"));
  assert.ok(pageSource.includes("instantCachedResult"));
  assert.ok(pageSource.includes("keepCurrentChart || hasInstantCache"));

  console.log("kline instant cache tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
