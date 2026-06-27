import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildEmptyHistoricalKlineSlice,
  buildHistoricalKlineSlice,
  buildHistoricalKlineHotSlice,
  downloadHistoricalKline,
  getHistoricalKlineStatus,
  getHistoricalKlineRules,
  listHistoricalKlineCatalog,
  listHistoricalKlineInstruments,
  revealHistoricalKlineSlice,
  warmHistoricalKlineHotPool
} from "../src/services/historicalKline.js";
import { getKlineWindowSizeParam } from "../src/routes/router.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");

test("historical kline route accepts count as window size alias", () => {
  const countOnly = new URL("http://local/api/v1/kline-history/hot-slice?count=150");
  const windowSizeOnly = new URL("http://local/api/v1/kline-history/hot-slice?window_size=120&count=150");
  const explicitWindow = new URL("http://local/api/v1/kline-history/hot-slice?window=90&window_size=120&count=150");

  assert.equal(getKlineWindowSizeParam(countOnly), "150");
  assert.equal(getKlineWindowSizeParam(windowSizeOnly), "120");
  assert.equal(getKlineWindowSizeParam(explicitWindow), "90");
});

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

test("historical kline slice reuses hot in-memory cache for repeated training seed", async () => {
  const params = {
    marketKey: "cn_equity",
    symbol: "600519",
    timeframeKey: "1d",
    windowSize: 60,
    mode: "firecracker",
    personalityType: "冲动型",
    gateKey: "shi_shang_mo",
    blind: true,
    seed: "hot-cache-contract-test"
  };

  const first = await buildHistoricalKlineSlice(params);
  const second = await buildHistoricalKlineSlice(params);

  assert.equal(second.slice.id, first.slice.id);
  assert.equal(second.slice.cache_status, "hit");
  assert.equal(second.slice.visible_count, 60);
  assert.deepEqual(second.slice.candles, first.slice.candles);
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
  assert.equal(first.slice.symbol, "");
  assert.equal(first.slice.candles.length, 60);
  assert.ok(first.slice.pool_key);
  assert.ok(second.slice.pool_key);
});

test("historical kline hot pool consumes warmed slices before refilling", async () => {
  const params = {
    marketKey: "cn_equity",
    symbol: "600519",
    timeframeKey: "1d",
    windowSize: 60,
    mode: "firecracker",
    personalityType: "稳健型",
    gateKey: "shi_shang_mo",
    blind: true,
    poolSize: 3,
    poolSeed: "hot-pool-consume-test"
  };

  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await warmHistoricalKlineHotPool(params);
    const first = await buildHistoricalKlineHotSlice(params);
    const second = await buildHistoricalKlineHotSlice(params);

    assert.equal(first.slice.cache_status, "pool_hit");
    assert.equal(second.slice.cache_status, "pool_hit");
    assert.notEqual(first.slice.id, second.slice.id);
  } finally {
    Math.random = originalRandom;
  }
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
    anchor: "hot-pool-cold-single-fill-anchor",
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

test("config.marketDataDir honors KLINE_CACHE_ROOT and keeps default fallback", async () => {
  const root = await createTempMarketRoot();
  const defaultConfig = runServerModule(`
    import path from "node:path";
    import { config } from "./src/config.js";
    console.log(JSON.stringify({
      marketDataDir: config.marketDataDir,
      expected: path.resolve(config.serverRoot, "data", "market")
    }));
  `, { KLINE_CACHE_ROOT: undefined });
  const envConfig = runServerModule(`
    import { config } from "./src/config.js";
    console.log(JSON.stringify({ marketDataDir: config.marketDataDir }));
  `, { KLINE_CACHE_ROOT: root });

  assert.equal(defaultConfig.marketDataDir, defaultConfig.expected);
  assert.equal(envConfig.marketDataDir, path.resolve(root));
});

test("historical kline server contract uses runtime marketDataDir for catalog, instruments, status and slice", async () => {
  const root = await createTempMarketRoot();
  const beforeFiles = await listFiles(root);
  const result = runServerModule(`
    import {
      buildEmptyHistoricalKlineSlice,
      buildHistoricalKlineSlice,
      getHistoricalKlineStatus,
      listHistoricalKlineCatalog,
      listHistoricalKlineInstruments
    } from "./src/services/historicalKline.js";

    const catalog = listHistoricalKlineCatalog();
    const instruments = await listHistoricalKlineInstruments({
      marketKey: "cn_stock",
      timeframeKey: "101",
      limit: 20
    });
    const readyStatus = await getHistoricalKlineStatus({
      marketKey: "cn_stock",
      timeframeKey: "101"
    });
    const missingStatus = await getHistoricalKlineStatus({
      marketKey: "cn_stock",
      timeframeKey: "30m"
    });
    const slice = await buildHistoricalKlineSlice({
      marketKey: "cn_stock",
      symbol: "600519",
      timeframeKey: "101",
      windowSize: 12,
      mode: "review",
      blind: false,
      endDate: "2024-01-20",
      seed: "runtime-root-test"
    });
    const emptySlice = await buildEmptyHistoricalKlineSlice({
      marketKey: "cn_stock",
      symbol: "000001",
      timeframeKey: "30m",
      windowSize: 120,
      mode: "review",
      blind: false,
      reason: "missing-symbol-fixture"
    });

    console.log(JSON.stringify({ catalog, instruments, readyStatus, missingStatus, slice, emptySlice }));
  `, { KLINE_CACHE_ROOT: root });
  const afterFiles = await listFiles(root);

  assert.notEqual(result.catalog.storage_contract.root, "server/data/market");
  assert.equal(result.catalog.storage_contract.runtime_root_config, "KLINE_CACHE_ROOT");
  assert.equal(result.instruments.market.key, "cn_equity");
  assert.equal(result.instruments.timeframe.key, "1d");
  assert.equal(result.instruments.instruments.find((item) => item.symbol === "600519")?.data_ready, true);
  assert.equal(result.readyStatus.market, "cn_equity");
  assert.equal(result.readyStatus.timeframe, "1d");
  assert.equal(result.readyStatus.status, "ready");
  assert.equal(result.readyStatus.symbols_count, 1);
  assert.equal(result.readyStatus.candles_count, 30);
  assert.equal(result.readyStatus.last_trade_date, "29991231");
  assert.equal(result.readyStatus.updated_at, "2026-06-13T00:00:00.000Z");
  assert.equal(result.missingStatus.status, "missing");
  assert.equal(result.missingStatus.symbols_count, 0);
  assert.equal(result.slice.slice.symbol, "600519");
  assert.equal(result.slice.slice.symbol_masked, false);
  assert.equal(result.slice.slice.candles.length, 12);
  assert.equal(result.slice.slice.source, "fixture-cache");
  assert.equal(result.slice.slice.manifestStatus.status, "ready");
  assert.equal(result.emptySlice.slice.symbol, "000001");
  assert.equal(result.emptySlice.slice.candles.length, 0);
  assert.equal(result.emptySlice.slice.manifestStatus.status, "missing");
  assert.deepEqual(afterFiles, beforeFiles);
});

test("historical kline status reports missing manifest without throwing", async () => {
  const status = await getHistoricalKlineStatus({
    marketKey: "cn_equity",
    timeframeKey: "5m"
  });

  assert.equal(status.market, "cn_equity");
  assert.equal(status.timeframe, "5m");
  assert.ok(["missing", "empty", "ready", "stale", "error"].includes(status.status));
  assert.equal(typeof status.symbols_count, "number");
  assert.equal(typeof status.candles_count, "number");
});

function runServerModule(source, envPatch = {}) {
  const env = { ...process.env };
  for (const [key, value] of Object.entries(envPatch)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval", source], {
    cwd: serverRoot,
    env,
    encoding: "utf8"
  });
  if (child.status !== 0) {
    throw new Error([child.stderr, child.stdout].filter(Boolean).join("\n"));
  }
  return JSON.parse(child.stdout);
}

async function createTempMarketRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kline-history-contract-"));
  const ashareRoot = path.join(root, "ashare", "101");
  await fs.mkdir(ashareRoot, { recursive: true });
  await fs.writeFile(path.join(root, "stock-pool.json"), JSON.stringify({
    stocks: [
      { code: "600519", name: "贵州茅台", secid: "1.600519" }
    ]
  }, null, 2));
  await fs.writeFile(path.join(ashareRoot, "manifest.json"), JSON.stringify({
    market: "ashare",
    timeframe: "101",
    source: "fixture-cache",
    status: "ok",
    symbols_count: 1,
    candles_count: 30,
    last_trade_date: "29991231",
    updated_at: "2026-06-13T00:00:00.000Z",
    errors: []
  }, null, 2));
  await fs.writeFile(path.join(ashareRoot, "600519.json"), JSON.stringify({
    version: "kline_cache_v2",
    source: "fixture-cache",
    market_key: "cn_equity",
    symbol: "600519",
    timeframe_key: "1d",
    candle_count: 30,
    data_start: "2024-01-01",
    data_end: "2024-01-30",
    candles: Array.from({ length: 30 }, (_, index) => ({
      date: `2024-01-${String(index + 1).padStart(2, "0")}`,
      open: 100 + index,
      high: 105 + index,
      low: 95 + index,
      close: 102 + index,
      volume: 1000 + index,
      amount: 100000 + index
    }))
  }, null, 2));
  return root;
}

async function listFiles(root) {
  const rows = [];
  await walk(root, rows, root);
  return rows.sort();
}

async function walk(current, rows, root) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, rows, root);
    } else if (entry.isFile()) {
      rows.push(path.relative(root, fullPath));
    }
  }
}
