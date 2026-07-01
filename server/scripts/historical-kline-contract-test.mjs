import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

import {
  buildHistoricalKlineSlice,
  downloadHistoricalKline,
  getHistoricalKlineRules,
  listHistoricalKlineCatalog,
  listHistoricalKlineInstruments,
  revealHistoricalKlineSlice
} from "../src/services/historicalKline.js";
import { route } from "../src/routes/router.js";

test("historical kline catalog exposes markets, cycles and rules", () => {
  const catalog = listHistoricalKlineCatalog();
  const marketKeys = catalog.markets.map((item) => item.key);
  const timeframeKeys = catalog.timeframes.map((item) => item.key);

  assert.deepEqual(marketKeys, ["cn_equity", "hk_equity", "us_equity", "futures", "crypto"]);
  assert.ok(timeframeKeys.includes("5m"));
  assert.ok(timeframeKeys.includes("1y"));
  assert.equal(catalog.markets.find((item) => item.key === "cn_equity").rules.settlement, "T+1");
  assert.deepEqual(catalog.providers.map((item) => item.key), ["akshare", "baostock", "tushare", "futu", "okx"]);
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

test("historical kline hot-slice route returns a real slice without a 404 fallback", async () => {
  const req = {
    method: "GET",
    url: "/api/v1/kline-history/hot-slice?market=cn_equity&symbol=600519&timeframe=1d&window=60&blind=1&mode=firecracker",
    headers: { host: "127.0.0.1:8787" }
  };
  const res = new MockResponse();

  await route(req, res);
  const result = res.result();

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.slice.hot_pool, true);
  assert.equal(result.body.slice.candles.length, 60);
});

test("historical kline preheat warms targeted training slices for hot reads", async () => {
  const preheatReq = Readable.from([Buffer.from(JSON.stringify({
    market: "cn_equity",
    window: 60,
    mode: "firecracker",
    gate: "shi_shang_mo",
    blind: true,
    items: [
      { timeframe: "1d", pool_slot: "review-focus-preheat-1" },
      { timeframe: "60m", pool_slot: "review-focus-preheat-2" }
    ]
  }))]);
  Object.assign(preheatReq, {
    method: "POST",
    url: "/api/v1/kline-history/preheat",
    headers: { host: "127.0.0.1:8787" }
  });
  const preheatRes = new MockResponse();

  await route(preheatReq, preheatRes);
  const preheated = preheatRes.result();

  assert.equal(preheated.statusCode, 200);
  assert.equal(preheated.body.ok, true);
  assert.equal(preheated.body.preheated.length, 2);
  assert.equal(preheated.body.preheated.every((item) => item.ok && item.candle_count === 60), true);

  const hotReq = {
    method: "GET",
    url: "/api/v1/kline-history/hot-slice?market=cn_equity&timeframe=1d&window=60&blind=1&mode=firecracker&gate=shi_shang_mo&pool_slot=review-focus-preheat-1",
    headers: { host: "127.0.0.1:8787" }
  };
  const hotRes = new MockResponse();

  await route(hotReq, hotRes);
  const hot = hotRes.result();

  assert.equal(hot.statusCode, 200);
  assert.equal(hot.body.ok, true);
  assert.equal(hot.body.slice.cache_status, "hot_hit");
  assert.equal(hot.body.slice.candles.length, 60);
});

test("historical kline blind hot slices reject distorted relative-price segments", async () => {
  const req = {
    method: "GET",
    url: "/api/v1/kline-history/hot-slice?market=cn_equity&timeframe=1d&window=60&blind=1&mode=firecracker&gate=shi_shang_mo&pool_slot=smoke-k8-1",
    headers: { host: "127.0.0.1:8787" }
  };
  const res = new MockResponse();

  await route(req, res);
  const result = res.result();
  const prices = result.body.slice.candles.flatMap((item) => [item.open, item.high, item.low, item.close]);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.ok(prices.every(Number.isFinite));
  assert.ok(Math.min(...prices) > 0, "blind relative prices must stay positive");
  assert.ok(Math.max(...prices) <= 260, "blind relative prices should not explode into distorted training charts");
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

class MockResponse {
  constructor() {
    this.statusCode = 0;
    this.headers = {};
    this.payload = "";
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = headers;
  }

  end(payload = "") {
    this.payload = String(payload || "");
  }

  result() {
    return {
      statusCode: this.statusCode,
      headers: this.headers,
      body: this.payload ? JSON.parse(this.payload) : null
    };
  }
}
