import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHistoricalKlineHotSlice,
  buildHistoricalKlineSlice,
  chooseCachedInstrument,
  downloadHistoricalKline,
  getHistoricalKlineRules,
  listHistoricalKlineCatalog,
  listHistoricalKlineInstruments,
  revealHistoricalKlineSlice,
  warmHistoricalKlineHotPool
} from "../src/services/historicalKline.js";
import { getKlineWindowSizeParam } from "../src/routes/router.js";

test("historical kline route accepts count as window size alias", () => {
  const countOnly = new URL("http://local/api/v1/kline-history/hot-slice?count=150");
  const windowSizeOnly = new URL("http://local/api/v1/kline-history/hot-slice?window_size=120&count=150");
  const explicitWindow = new URL("http://local/api/v1/kline-history/hot-slice?window=90&window_size=120&count=150");

  assert.equal(getKlineWindowSizeParam(countOnly), "150");
  assert.equal(getKlineWindowSizeParam(windowSizeOnly), "120");
  assert.equal(getKlineWindowSizeParam(explicitWindow), "90");
});

test("historical kline random slice prefers cached symbols for the requested timeframe", () => {
  const instruments = Array.from({ length: 820 }, (_, index) => ({
    symbol: String(100000 + index),
    name: `未缓存-${index}`
  })).concat([
    { symbol: "600519", name: "缓存标的" },
    { symbol: "000001", name: "缓存标的二" }
  ]);

  const picked = chooseCachedInstrument({
    instruments,
    cachedSymbols: ["600519", "000001"],
    marketKey: "cn_equity",
    timeframeKey: "30m",
    seed: "contract-test"
  });

  assert.ok(["600519", "000001"].includes(picked.symbol));
});

test("historical kline catalog exposes markets, cycles and rules", () => {
  const catalog = listHistoricalKlineCatalog();
  const marketKeys = catalog.markets.map((item) => item.key);
  const timeframeKeys = catalog.timeframes.map((item) => item.key);

  assert.deepEqual(marketKeys, ["cn_equity", "hk_equity", "us_equity", "futures", "crypto"]);
  assert.ok(timeframeKeys.includes("5m"));
  assert.ok(timeframeKeys.includes("1y"));
  assert.equal(catalog.markets.find((item) => item.key === "cn_equity").rules.settlement, "T+1");
  assert.deepEqual(catalog.providers.map((item) => item.key), ["tushare", "futu", "okx"]);
});

test("historical kline instruments report local cache availability", async () => {
  const result = await listHistoricalKlineInstruments({
    marketKey: "cn_equity",
    timeframeKey: "1d",
    limit: 500
  });

  const cached = result.instruments.find((item) => item.symbol === "600519");
  assert.equal(result.market.key, "cn_equity");
  assert.ok(cached);
  assert.equal(cached.data_ready, true);
  assert.ok(cached.candle_count > 200);
});

test("historical kline slice returns blind real-data practice segment", async () => {
  const result = await buildHistoricalKlineSlice({
    marketKey: "cn_equity",
    symbol: "600519",
    timeframeKey: "1d",
    windowSize: 60,
    mode: "firecracker",
    personalityType: "冲动型",
    gateKey: "shi_shang_mo",
    blind: true,
    seed: "contract-test"
  });

  assert.equal(result.slice.market.key, "cn_equity");
  assert.equal(result.slice.timeframe.key, "1d");
  assert.equal(result.slice.blind, true);
  assert.equal(result.slice.instrument.masked, true);
  assert.equal(result.slice.visible_count, 60);
  assert.equal(result.slice.candles.length, 60);
  assert.equal(typeof result.slice.candles[0].time, "number");
  assert.ok(result.slice.reveal_token);
  assert.ok(result.slice.training.title.includes("爆竹K线"));
  assert.ok(result.slice.training.boundary_question.includes("A股"));

  const reveal = revealHistoricalKlineSlice(result.slice.reveal_token);
  assert.equal(reveal.reveal.symbol, "600519");
  assert.equal(reveal.reveal.timeframe_key, "1d");
});

test("historical kline slice caches deterministic review anchors", async () => {
  const params = {
    marketKey: "cn_equity",
    symbol: "600519",
    timeframeKey: "1d",
    windowSize: 60,
    mode: "step_replay",
    gateKey: "shi_shang_mo",
    blind: false,
    seed: "review-anchor-cache-test",
    endDate: "2014-03-19"
  };

  const first = await buildHistoricalKlineSlice(params);
  const second = await buildHistoricalKlineSlice(params);

  assert.equal(first.slice.cache_status, "deterministic_miss");
  assert.equal(first.slice.deterministic_cache, true);
  assert.equal(second.slice.cache_status, "deterministic_hit");
  assert.equal(second.slice.deterministic_cache, true);
  assert.equal(second.slice.visible_count, 60);
  assert.ok(second.slice.data_range.end <= "2014-03-19");
  assert.equal(second.slice.data_range.end, first.slice.data_range.end);
});

test("historical kline hot pool returns prebuilt random-ready practice slices", async () => {
  const params = {
    marketKey: "cn_equity",
    symbol: "600519",
    timeframeKey: "1d",
    windowSize: 60,
    mode: "firecracker",
    personalityType: "冲动型",
    gateKey: "shi_shang_mo",
    blind: true,
    poolSize: 3,
    poolSeed: "hot-pool-contract-test"
  };

  const warmed = await warmHistoricalKlineHotPool(params);
  const first = await buildHistoricalKlineHotSlice(params);
  const second = await buildHistoricalKlineHotSlice(params);

  assert.equal(warmed.pool.status, "ready");
  assert.equal(warmed.pool.size, 3);
  assert.equal(first.slice.cache_status, "pool_hit");
  assert.equal(second.slice.cache_status, "pool_hit");
  assert.equal(first.slice.hot_pool, true);
  assert.equal(first.slice.visible_count, 60);
  assert.equal(first.slice.candles.length, 60);
  assert.ok(first.slice.pool_key);
  assert.ok(second.slice.pool_key);
});

test("historical kline hot slice uses default training gate for warmed pools", async () => {
  const warmedParams = {
    marketKey: "cn_equity",
    symbol: "600519",
    timeframeKey: "1d",
    windowSize: 60,
    mode: "step_replay",
    gateKey: "shi_shang_mo",
    blind: true,
    poolSize: 2,
    poolSeed: "hot-pool-default-gate-test"
  };

  await warmHistoricalKlineHotPool(warmedParams);
  const slice = await buildHistoricalKlineHotSlice({
    marketKey: warmedParams.marketKey,
    symbol: warmedParams.symbol,
    timeframeKey: warmedParams.timeframeKey,
    windowSize: warmedParams.windowSize,
    mode: warmedParams.mode,
    blind: true
  });

  assert.equal(slice.slice.cache_status, "pool_hit");
  assert.equal(slice.slice.hot_pool, true);
  assert.equal(slice.slice.candles.length, 60);
});

test("historical kline hot slice does not synchronously fill full pool when cold", async () => {
  const slice = await buildHistoricalKlineHotSlice({
    marketKey: "cn_equity",
    symbol: "600519",
    timeframeKey: "1d",
    windowSize: 60,
    mode: "step_replay",
    gateKey: "shi_shang_mo",
    blind: true,
    startDate: "2016-01-01",
    endDate: "2018-12-31",
    poolSize: 6,
    poolSeed: "hot-pool-cold-single-fill-test"
  });

  assert.equal(slice.slice.cache_status, "pool_cold_fill");
  assert.equal(slice.slice.hot_pool, true);
  assert.equal(slice.slice.pool_size, 1);
  assert.equal(slice.slice.candles.length, 60);
});

test("historical kline slice can resample daily cache into week and year cycles", async () => {
  const week = await buildHistoricalKlineSlice({
    marketKey: "cn_equity",
    symbol: "600519",
    timeframeKey: "1w",
    windowSize: 40,
    mode: "gate",
    gateKey: "zhi_xing_he_yi",
    blind: false,
    seed: "weekly-test"
  });
  const year = await buildHistoricalKlineSlice({
    marketKey: "cn_equity",
    symbol: "600519",
    timeframeKey: "1y",
    windowSize: 20,
    mode: "step_replay",
    blind: false,
    seed: "yearly-test"
  });

  assert.equal(week.slice.timeframe.key, "1w");
  assert.ok(week.slice.source.includes("resampled:1w"));
  assert.equal(week.slice.instrument.symbol, "600519");
  assert.equal(year.slice.timeframe.key, "1y");
  assert.ok(year.slice.source.includes("resampled:1y"));
});

test("historical kline rules are available per market", () => {
  const cn = getHistoricalKlineRules({ marketKey: "cn_equity" });
  const crypto = getHistoricalKlineRules({ marketKey: "crypto" });

  assert.equal(cn.rules.settlement, "T+1");
  assert.equal(crypto.rules.settlement, "7x24");
  assert.ok(cn.rules.boundaryNotes.length >= 1);
});

test("historical kline download normalizes provider data without exposing tokens", async () => {
  process.env.TUSHARE_TOKEN = "test-token";
  const fetchImpl = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.api_name, "daily");
    assert.equal(body.token, "test-token");
    return {
      ok: true,
      async json() {
        return {
          code: 0,
          data: {
            fields: ["ts_code", "trade_date", "open", "high", "low", "close", "vol", "amount", "pct_chg"],
            items: [
              ["600519.SH", "20240103", 100, 108, 98, 106, 1200, 128000, 2.1],
              ["600519.SH", "20240102", 98, 102, 96, 100, 1000, 99000, 1.2]
            ]
          }
        };
      }
    };
  };

  const result = await downloadHistoricalKline({
    provider: "tushare",
    marketKey: "cn_equity",
    symbol: "600519.SH",
    name: "测试标的",
    timeframeKey: "1d",
    dryRun: true,
    fetchImpl
  });

  assert.equal(result.job.provider, "tushare");
  assert.equal(result.job.candle_count, 2);
  assert.equal(result.job.dry_run, true);
  assert.ok(!JSON.stringify(result).includes("test-token"));
});
