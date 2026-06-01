import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHistoricalKlineSlice,
  getHistoricalKlineRules,
  listHistoricalKlineCatalog,
  listHistoricalKlineInstruments,
  revealHistoricalKlineSlice
} from "../src/services/historicalKline.js";

test("historical kline catalog exposes markets, cycles and rules", () => {
  const catalog = listHistoricalKlineCatalog();
  const marketKeys = catalog.markets.map((item) => item.key);
  const timeframeKeys = catalog.timeframes.map((item) => item.key);

  assert.deepEqual(marketKeys, ["cn_equity", "hk_equity", "us_equity", "futures", "crypto"]);
  assert.ok(timeframeKeys.includes("5m"));
  assert.ok(timeframeKeys.includes("1y"));
  assert.equal(catalog.markets.find((item) => item.key === "cn_equity").rules.settlement, "T+1");
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
