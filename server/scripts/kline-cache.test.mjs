import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  backfillKlineCache,
  mergeCandles,
  normalizeKlineTimeframe,
  updateKlineCache,
  verifyKlineCache
} from "../src/services/klineCache.js";
import { fetchProviderKlines, listKlineProviders } from "../src/services/klineProviders.js";

const nodeBin = process.execPath;

test("mergeCandles deduplicates by date and sorts ascending", () => {
  const merged = mergeCandles(
    [
      { date: "2024-01-03", open: 3, high: 4, low: 2, close: 3 },
      { date: "2024-01-01", open: 1, high: 2, low: 1, close: 2 }
    ],
    [
      { date: "2024-01-02", open: 2, high: 3, low: 1, close: 2 },
      { date: "2024-01-03", open: 30, high: 40, low: 20, close: 30 }
    ]
  );

  assert.deepEqual(merged.map((item) => item.date), ["2024-01-01", "2024-01-02", "2024-01-03"]);
  assert.equal(merged.at(-1).open, 30);
});

test("mergeCandles preserves intraday candle timestamps", () => {
  const merged = mergeCandles(
    [],
    [
      { time: "2024-01-03 10:30:00", open: 10, high: 11, low: 9, close: 10.5 },
      { time: "2024-01-03 11:30:00", open: 10.5, high: 12, low: 10, close: 11 }
    ]
  );

  assert.deepEqual(merged.map((item) => item.date), ["2024-01-03 10:30:00", "2024-01-03 11:30:00"]);
});

test("timeframe aliases map to one stable cache directory", () => {
  assert.equal(normalizeKlineTimeframe("101").timeframe, "101");
  assert.equal(normalizeKlineTimeframe("1d").timeframe, "101");
  assert.equal(normalizeKlineTimeframe("daily").timeframe, "101");
  assert.equal(normalizeKlineTimeframe("60").timeframe, "60m");
  assert.equal(normalizeKlineTimeframe("60m").timeframe, "60m");
  assert.equal(normalizeKlineTimeframe("30").timeframe, "30m");
  assert.equal(normalizeKlineTimeframe("30m").timeframe, "30m");
});

test("updateKlineCache writes merged symbol cache and manifest", async () => {
  const root = await makeFixtureRoot();
  await writeJson(path.join(root, "ashare", "101", "600519.json"), {
    code: "600519",
    market: "ashare",
    klt: "101",
    timeframe: "101",
    timeframe_label: "日K",
    source: "fixture",
    updated_at: "2024-01-03T00:00:00.000Z",
    candles: [{ date: "2024-01-02", open: 10, high: 11, low: 9, close: 10 }]
  });

  const result = await updateKlineCache({
    market: "ashare",
    timeframe: "101",
    date: "20240103",
    symbols: ["600519"],
    dataRoot: root,
    fetchImpl: async () => providerResponse([
      ["600519.SH", "20240103", 11, 12, 10, 11.5, 1000, 11000, 1.2],
      ["600519.SH", "20240102", 10, 11, 9, 10.2, 800, 8200, 0.8]
    ]),
    env: { TUSHARE_TOKEN: "token" }
  });

  const file = await readJson(path.join(root, "ashare", "101", "600519.json"));
  const manifest = await readJson(path.join(root, "ashare", "101", "manifest.json"));

  assert.equal(result.status, "ok");
  assert.equal(file.code, "600519");
  assert.equal(file.market, "ashare");
  assert.equal(file.timeframe, "101");
  assert.deepEqual(file.candles.map((item) => item.date), ["2024-01-02", "2024-01-03"]);
  assert.equal(manifest.last_trade_date, "20240103");
  assert.equal(manifest.symbols_count, 1);
  assert.equal(manifest.candles_count, 2);
  assert.equal(manifest.status, "ok");
});

test("provider failure does not delete existing cache", async () => {
  const root = await makeFixtureRoot();
  const filePath = path.join(root, "ashare", "101", "600519.json");
  const original = {
    code: "600519",
    market: "ashare",
    klt: "101",
    timeframe: "101",
    timeframe_label: "日K",
    source: "fixture",
    updated_at: "2024-01-02T00:00:00.000Z",
    candles: [{ date: "2024-01-02", open: 10, high: 11, low: 9, close: 10 }]
  };
  await writeJson(filePath, original);

  const result = await updateKlineCache({
    market: "ashare",
    timeframe: "101",
    date: "20240103",
    symbols: ["600519"],
    dataRoot: root,
    fetchImpl: async () => {
      throw new Error("provider down");
    },
    env: { TUSHARE_TOKEN: "token" }
  });

  const after = await readJson(filePath);
  assert.equal(result.status, "error");
  assert.deepEqual(after, original);
});

test("missing TUSHARE_TOKEN reports error without changing symbol cache", async () => {
  const root = await makeFixtureRoot();
  const filePath = path.join(root, "ashare", "101", "600519.json");
  const original = {
    code: "600519",
    market: "ashare",
    timeframe: "101",
    candles: [{ date: "2024-01-02", open: 10, high: 11, low: 9, close: 10 }]
  };
  await writeJson(filePath, original);

  const result = await updateKlineCache({
    market: "ashare",
    timeframe: "101",
    date: "20240103",
    symbols: ["600519"],
    dataRoot: root,
    env: {}
  });

  assert.equal(result.status, "error");
  assert.ok(result.errors.some((item) => item.includes("TUSHARE_TOKEN")));
  assert.deepEqual(await readJson(filePath), original);
});

test("dry-run does not write symbol cache or manifest", async () => {
  const root = await makeFixtureRoot();

  const result = await updateKlineCache({
    market: "ashare",
    timeframe: "101",
    date: "20240103",
    symbols: ["600519"],
    dataRoot: root,
    dryRun: true,
    fetchImpl: async () => providerResponse([
      ["600519.SH", "20240103", 11, 12, 10, 11.5, 1000, 11000, 1.2]
    ]),
    env: { TUSHARE_TOKEN: "token" }
  });

  assert.equal(result.status, "ok");
  await assert.rejects(() => fs.access(path.join(root, "ashare", "101", "600519.json")));
  await assert.rejects(() => fs.access(path.join(root, "ashare", "101", "manifest.json")));
});

test("provider=akshare does not require TUSHARE_TOKEN and parses python output", async () => {
  const scriptPath = await writeAkshareFixtureScript({
    symbols: {
      "600519": {
        code: "600519",
        candles: [
          { time: "2024-01-03", code: "600519", open: 11, high: 12, low: 10, close: 11.5, volume: 1000, amount: 11000, pct_chg: 1.2, amplitude: 2.4, turnover: 0.8 }
        ]
      }
    },
    errors: []
  });

  const result = await fetchProviderKlines({
    provider: "akshare",
    market: { key: "cn_equity" },
    symbol: "600519",
    timeframe: { key: "1d" },
    startDate: "20240103",
    endDate: "20240103",
    env: {
      AKSHARE_PYTHON_BIN: nodeBin,
      AKSHARE_SCRIPT_PATH: scriptPath
    }
  });

  assert.equal(result.provider, "akshare");
  assert.equal(result.source, "akshare");
  assert.deepEqual(result.candles.map((item) => item.date), ["2024-01-03"]);
  assert.equal(result.candles[0].pct_chg, 1.2);
  assert.equal(result.candles[0].amplitude, 2.4);
  assert.equal(result.candles[0].turnover, 0.8);
});

test("baostock supports 30m and 60m provider timeframes", async () => {
  const envFile = path.join(await makeFixtureRoot(), "baostock-args.json");
  const scriptPath = await writeBaostockArgsFixtureScript(envFile);

  await fetchProviderKlines({
    provider: "baostock",
    market: { key: "cn_equity" },
    symbol: "600519",
    timeframe: { key: "60m", minutes: 60 },
    startDate: "20240101",
    endDate: "20240131",
    env: {
      BAOSTOCK_PYTHON_BIN: nodeBin,
      BAOSTOCK_SCRIPT_PATH: scriptPath
    }
  });

  await fetchProviderKlines({
    provider: "baostock",
    market: { key: "cn_equity" },
    symbol: "300750",
    timeframe: { key: "30m", minutes: 30 },
    startDate: "20240101",
    endDate: "20240131",
    env: {
      BAOSTOCK_PYTHON_BIN: nodeBin,
      BAOSTOCK_SCRIPT_PATH: scriptPath
    }
  });

  const calls = await readJson(envFile);
  assert.ok(calls.some((item) => item.includes("--frequency") && item.includes("60")));
  assert.ok(calls.some((item) => item.includes("--frequency") && item.includes("30")));
});

test("baostock minute provider avoids unsupported daily-only fields", async () => {
  const script = await fs.readFile(new URL("./providers/fetch-baostock-daily.py", import.meta.url), "utf8");

  assert.match(script, /if args\.frequency in \("30", "60"\):/);
  assert.match(script, /fields = "date,time,code,open,high,low,close,volume,amount"/);
});

test("akshare update merges candles and records manifest source", async () => {
  const root = await makeFixtureRoot();
  await writeJson(path.join(root, "ashare", "101", "600519.json"), {
    code: "600519",
    market: "ashare",
    klt: "101",
    timeframe: "101",
    timeframe_label: "日K",
    source: "fixture",
    updated_at: "2024-01-02T00:00:00.000Z",
    candles: [{ date: "2024-01-02", open: 10, high: 11, low: 9, close: 10 }]
  });
  const scriptPath = await writeAkshareFixtureScript({
    symbols: {
      "600519": {
        code: "600519",
        candles: [
          { time: "2024-01-03", code: "600519", open: 11, high: 12, low: 10, close: 11.5, volume: 1000, amount: 11000, pct_chg: 1.2, amplitude: 2.4, turnover: 0.8 },
          { time: "2024-01-02", code: "600519", open: 10, high: 11, low: 9, close: 10.2, volume: 800, amount: 8200, pct_chg: 0.8, amplitude: 1.8, turnover: 0.6 }
        ]
      }
    },
    errors: []
  });

  const result = await updateKlineCache({
    market: "ashare",
    timeframe: "101",
    provider: "akshare",
    date: "20240103",
    symbols: ["600519"],
    dataRoot: root,
    env: {
      AKSHARE_PYTHON_BIN: nodeBin,
      AKSHARE_SCRIPT_PATH: scriptPath
    }
  });
  const file = await readJson(path.join(root, "ashare", "101", "600519.json"));
  const manifest = await readJson(path.join(root, "ashare", "101", "manifest.json"));

  assert.equal(result.status, "ok");
  assert.equal(file.source, "akshare");
  assert.deepEqual(file.candles.map((item) => item.date), ["2024-01-02", "2024-01-03"]);
  assert.equal(file.candles.at(-1).pct_chg, 1.2);
  assert.equal(file.candles.at(-1).amplitude, 2.4);
  assert.equal(file.candles.at(-1).turnover, 0.8);
  assert.equal(manifest.source, "akshare");
  assert.equal(manifest.candles_count, 2);
});

test("multi-timeframe backfill dry-run writes nothing", async () => {
  const root = await makeFixtureRoot();
  const scriptPath = await writeBaostockFixtureScript({
    symbols: {
      "600519": {
        code: "600519",
        candles: [
          { time: "2024-01-03 10:30:00", open: 11, high: 12, low: 10, close: 11.5, volume: 1000, amount: 11000 }
        ]
      }
    },
    errors: []
  }, { timeframe: "60m" });

  const result = await backfillKlineCache({
    market: "ashare",
    timeframes: ["101", "60m", "30m"],
    symbols: ["600519"],
    months: 6,
    providerChain: ["baostock"],
    dataRoot: root,
    dryRun: true,
    now: new Date("2024-06-30T00:00:00Z"),
    env: {
      BAOSTOCK_PYTHON_BIN: nodeBin,
      BAOSTOCK_SCRIPT_PATH: scriptPath
    }
  });

  assert.equal(result.dry_run, true);
  assert.deepEqual(result.timeframes.map((item) => item.timeframe), ["101", "60m", "30m"]);
  await assert.rejects(() => fs.access(path.join(root, "ashare", "101", "600519.json")));
  await assert.rejects(() => fs.access(path.join(root, "ashare", "60m", "600519.json")));
  await assert.rejects(() => fs.access(path.join(root, "ashare", "30m", "600519.json")));
});

test("multi-timeframe backfill writes separate cache, manifests and checkpoints", async () => {
  const root = await makeFixtureRoot();
  const scriptPath = await writeBaostockFixtureScript({
    symbols: {
      "600519": {
        code: "600519",
        candles: [
          { time: "2024-01-03 10:30:00", open: 11, high: 12, low: 10, close: 11.5, volume: 1000, amount: 11000 }
        ]
      }
    },
    errors: []
  }, { timeframe: "101" });

  const result = await backfillKlineCache({
    market: "ashare",
    timeframes: ["101", "60", "30"],
    symbols: ["600519"],
    months: 6,
    providerChain: ["baostock"],
    dataRoot: root,
    now: new Date("2024-06-30T00:00:00Z"),
    env: {
      BAOSTOCK_PYTHON_BIN: nodeBin,
      BAOSTOCK_SCRIPT_PATH: scriptPath
    }
  });

  assert.equal(result.status, "ok");
  for (const timeframe of ["101", "60m", "30m"]) {
    const file = await readJson(path.join(root, "ashare", timeframe, "600519.json"));
    const manifest = await readJson(path.join(root, "ashare", timeframe, "manifest.json"));
    const state = await readJson(path.join(root, "ashare", timeframe, "backfill-state.json"));
    assert.equal(file.timeframe, timeframe);
    assert.equal(file.source, "baostock");
    assert.equal(manifest.source, "baostock");
    assert.equal(state.timeframe, timeframe);
    assert.deepEqual(state.completed_symbols, ["600519"]);
  }
});

test("intraday update drops legacy date-only candles before merging", async () => {
  const root = await makeFixtureRoot();
  await writeJson(path.join(root, "ashare", "30m", "600519.json"), {
    code: "600519",
    market: "ashare",
    timeframe: "30m",
    source: "baostock",
    candles: [
      { date: "2024-01-03", open: 1, high: 2, low: 1, close: 1.5, source: "baostock", adjust: "none" }
    ]
  });
  const scriptPath = await writeBaostockFixtureScript({
    symbols: {
      "600519": {
        code: "600519",
        candles: [
          { time: "2024-01-03 10:30:00", open: 11, high: 12, low: 10, close: 11.5, volume: 1000, amount: 11000 },
          { time: "2024-01-03 11:00:00", open: 11.5, high: 12.2, low: 11, close: 12, volume: 900, amount: 10800 }
        ]
      }
    },
    errors: []
  }, { timeframe: "30m" });

  await updateKlineCache({
    market: "ashare",
    timeframe: "30m",
    providerChain: ["baostock"],
    startDate: "20240101",
    endDate: "20240131",
    symbols: ["600519"],
    dataRoot: root,
    env: {
      BAOSTOCK_PYTHON_BIN: nodeBin,
      BAOSTOCK_SCRIPT_PATH: scriptPath
    }
  });

  const file = await readJson(path.join(root, "ashare", "30m", "600519.json"));
  assert.deepEqual(file.candles.map((item) => item.date), ["2024-01-03 10:30:00", "2024-01-03 11:00:00"]);
});

test("backfill resume skips completed symbols per timeframe", async () => {
  const root = await makeFixtureRoot();
  await writeJson(path.join(root, "ashare", "60m", "backfill-state.json"), {
    timeframe: "60m",
    range: { start_date: "20240101", end_date: "20240630" },
    total_symbols: 2,
    completed_symbols: ["600519"],
    failed_symbols: [],
    last_symbol: "600519",
    provider_chain: ["baostock"],
    started_at: "2024-06-30T00:00:00.000Z",
    updated_at: "2024-06-30T00:00:00.000Z"
  });
  const scriptPath = await writeBaostockFixtureScript({
    symbols: {
      "300750": {
        code: "300750",
        candles: [
          { time: "2024-01-03 10:30:00", open: 20, high: 21, low: 19, close: 20.5, volume: 100, amount: 2000 }
        ]
      }
    },
    errors: [{ symbol: "600519", message: "should be skipped" }]
  }, { timeframe: "60m" });

  const result = await backfillKlineCache({
    market: "ashare",
    timeframes: ["60m"],
    symbols: ["600519", "300750"],
    months: 6,
    providerChain: ["baostock"],
    resume: true,
    dataRoot: root,
    now: new Date("2024-06-30T00:00:00Z"),
    env: {
      BAOSTOCK_PYTHON_BIN: nodeBin,
      BAOSTOCK_SCRIPT_PATH: scriptPath
    }
  });

  const state = await readJson(path.join(root, "ashare", "60m", "backfill-state.json"));
  assert.equal(result.timeframes[0].skipped_completed, 1);
  assert.deepEqual(state.completed_symbols.sort(), ["300750", "600519"]);
  await assert.rejects(() => fs.access(path.join(root, "ashare", "60m", "600519.json")));
});

test("akshare single symbol failure does not block other symbols", async () => {
  const root = await makeFixtureRoot();
  const scriptPath = await writeAkshareFixtureScript({
    symbols: {
      "300750": {
        code: "300750",
        candles: [
          { time: "2024-01-03", open: 20, high: 21, low: 19, close: 20.5, volume: 100, amount: 2000 }
        ]
      }
    },
    errors: [{ symbol: "600519", message: "AKShare fixture error" }]
  });

  const result = await updateKlineCache({
    market: "ashare",
    timeframe: "101",
    provider: "akshare",
    date: "20240103",
    symbols: ["600519", "300750"],
    dataRoot: root,
    env: {
      AKSHARE_PYTHON_BIN: nodeBin,
      AKSHARE_SCRIPT_PATH: scriptPath
    }
  });

  assert.equal(result.status, "partial");
  assert.equal(result.updated_symbols, 1);
  assert.ok(result.errors.some((item) => item.includes("600519")));
  assert.equal((await readJson(path.join(root, "ashare", "101", "300750.json"))).source, "akshare");
});

test("akshare provider failure keeps existing cache and dry-run writes nothing", async () => {
  const root = await makeFixtureRoot();
  const filePath = path.join(root, "ashare", "101", "600519.json");
  const original = {
    code: "600519",
    market: "ashare",
    klt: "101",
    timeframe: "101",
    timeframe_label: "日K",
    source: "fixture",
    updated_at: "2024-01-02T00:00:00.000Z",
    candles: [{ date: "2024-01-02", open: 10, high: 11, low: 9, close: 10 }]
  };
  await writeJson(filePath, original);

  const failed = await updateKlineCache({
    market: "ashare",
    timeframe: "101",
    provider: "akshare",
    date: "20240103",
    symbols: ["600519"],
    dataRoot: root,
    env: {
      AKSHARE_PYTHON_BIN: nodeBin,
      AKSHARE_SCRIPT_PATH: path.join(root, "missing-akshare-script.js")
    }
  });
  assert.equal(failed.status, "error");
  assert.deepEqual(await readJson(filePath), original);

  const scriptPath = await writeAkshareFixtureScript({
    symbols: {
      "300750": {
        code: "300750",
        candles: [
          { time: "2024-01-03", open: 20, high: 21, low: 19, close: 20.5, volume: 100, amount: 2000 }
        ]
      }
    },
    errors: []
  });
  const dryRunRoot = await makeFixtureRoot();
  const dryRun = await updateKlineCache({
    market: "ashare",
    timeframe: "101",
    provider: "akshare",
    date: "20240103",
    symbols: ["300750"],
    dataRoot: dryRunRoot,
    dryRun: true,
    env: {
      AKSHARE_PYTHON_BIN: nodeBin,
      AKSHARE_SCRIPT_PATH: scriptPath
    }
  });

  assert.equal(dryRun.status, "ok");
  await assert.rejects(() => fs.access(path.join(dryRunRoot, "ashare", "101", "300750.json")));
  await assert.rejects(() => fs.access(path.join(dryRunRoot, "ashare", "101", "manifest.json")));
});

test("akshare provider is listed without TUSHARE_TOKEN requirement and reports missing runtime clearly", async () => {
  const provider = listKlineProviders().find((item) => item.key === "akshare");
  assert.ok(provider);
  assert.deepEqual(provider.requires, ["python3", "akshare"]);

  await assert.rejects(
    () => fetchProviderKlines({
      provider: "akshare",
      market: { key: "cn_equity" },
      symbol: "600519",
      timeframe: { key: "1d" },
      env: {
        AKSHARE_PYTHON_BIN: nodeBin,
        AKSHARE_SCRIPT_PATH: path.join(os.tmpdir(), "not-found-akshare-script.py")
      }
    }),
    /AKShare|akshare|Python|退出/
  );
});

test("akshare provider retries retryable failures before succeeding", async () => {
  const stateFile = path.join(await makeFixtureRoot(), "attempts.json");
  const scriptPath = await writeRetryFixtureScript({
    stateFile,
    failUntil: 2,
    provider: "akshare",
    symbol: "600519"
  });

  const result = await fetchProviderKlines({
    provider: "akshare",
    market: { key: "cn_equity" },
    symbol: "600519",
    timeframe: { key: "1d" },
    startDate: "20240103",
    endDate: "20240103",
    env: {
      AKSHARE_PYTHON_BIN: nodeBin,
      AKSHARE_SCRIPT_PATH: scriptPath,
      AKSHARE_MAX_RETRIES: "3",
      AKSHARE_RETRY_DELAY_MS: "1",
      AKSHARE_JITTER_MS: "0"
    }
  });
  const state = await readJson(stateFile);

  assert.equal(result.provider, "akshare");
  assert.equal(result.candles.length, 1);
  assert.equal(state.attempts, 3);
});

test("AKSHARE_NO_PROXY clears proxy variables for the python child process", async () => {
  const envFile = path.join(await makeFixtureRoot(), "env.json");
  const scriptPath = await writeEnvFixtureScript(envFile);

  await fetchProviderKlines({
    provider: "akshare",
    market: { key: "cn_equity" },
    symbol: "600519",
    timeframe: { key: "1d" },
    startDate: "20240103",
    endDate: "20240103",
    env: {
      AKSHARE_PYTHON_BIN: nodeBin,
      AKSHARE_SCRIPT_PATH: scriptPath,
      AKSHARE_NO_PROXY: "true",
      HTTP_PROXY: "http://127.0.0.1:1087",
      HTTPS_PROXY: "http://127.0.0.1:1087",
      http_proxy: "http://127.0.0.1:1087",
      https_proxy: "http://127.0.0.1:1087"
    }
  });
  const childEnv = await readJson(envFile);

  assert.equal(childEnv.HTTP_PROXY, undefined);
  assert.equal(childEnv.HTTPS_PROXY, undefined);
  assert.equal(childEnv.http_proxy, undefined);
  assert.equal(childEnv.https_proxy, undefined);
  assert.equal(childEnv.NO_PROXY, "*");
  assert.equal(childEnv.no_proxy, "*");
});

test("provider=akshare falls back to baostock per symbol and records mixed source", async () => {
  const root = await makeFixtureRoot();
  const akshareScriptPath = await writeAkshareFixtureScript({
    symbols: {
      "600519": {
        code: "600519",
        candles: [
          { time: "2024-01-03", open: 11, high: 12, low: 10, close: 11.5, volume: 1000, amount: 11000 }
        ]
      }
    },
    errors: [{ symbol: "300750", message: "RemoteDisconnected" }]
  });
  const baostockScriptPath = await writeBaostockFixtureScript({
    symbols: {
      "300750": {
        code: "300750",
        candles: [
          { time: "2024-01-03", open: 20, high: 21, low: 19, close: 20.5, volume: 100, amount: 2000 }
        ]
      }
    },
    errors: []
  });

  const result = await updateKlineCache({
    market: "ashare",
    timeframe: "101",
    provider: "akshare",
    date: "20240103",
    symbols: ["600519", "300750"],
    dataRoot: root,
    env: {
      AKSHARE_PYTHON_BIN: nodeBin,
      AKSHARE_SCRIPT_PATH: akshareScriptPath,
      BAOSTOCK_PYTHON_BIN: nodeBin,
      BAOSTOCK_SCRIPT_PATH: baostockScriptPath
    }
  });
  const akshareFile = await readJson(path.join(root, "ashare", "101", "600519.json"));
  const baostockFile = await readJson(path.join(root, "ashare", "101", "300750.json"));
  const manifest = await readJson(path.join(root, "ashare", "101", "manifest.json"));

  assert.equal(result.status, "ok");
  assert.equal(akshareFile.source, "akshare");
  assert.equal(baostockFile.source, "baostock");
  assert.equal(manifest.source, "mixed");
  assert.equal(result.sources.akshare, 1);
  assert.equal(result.sources.baostock, 1);
});

test("provider chain failure keeps existing cache", async () => {
  const root = await makeFixtureRoot();
  const filePath = path.join(root, "ashare", "101", "600519.json");
  const original = {
    code: "600519",
    market: "ashare",
    klt: "101",
    timeframe: "101",
    timeframe_label: "日K",
    source: "fixture",
    updated_at: "2024-01-02T00:00:00.000Z",
    candles: [{ date: "2024-01-02", open: 10, high: 11, low: 9, close: 10 }]
  };
  await writeJson(filePath, original);

  const result = await updateKlineCache({
    market: "ashare",
    timeframe: "101",
    provider: "akshare",
    date: "20240103",
    symbols: ["600519"],
    dataRoot: root,
    env: {
      AKSHARE_PYTHON_BIN: nodeBin,
      AKSHARE_SCRIPT_PATH: path.join(root, "missing-akshare-script.mjs"),
      BAOSTOCK_PYTHON_BIN: nodeBin,
      BAOSTOCK_SCRIPT_PATH: path.join(root, "missing-baostock-script.mjs")
    }
  });

  assert.equal(result.status, "error");
  assert.deepEqual(await readJson(filePath), original);
});

test("requirements pins urllib3 below v2 for Python 3.9 LibreSSL compatibility", async () => {
  const requirements = await fs.readFile(new URL("../requirements.txt", import.meta.url), "utf8");

  assert.match(requirements, /^akshare$/m);
  assert.match(requirements, /^baostock$/m);
  assert.match(requirements, /^urllib3<2$/m);
});

test("verifyKlineCache detects empty cache, duplicate candles and missing OHLC", async () => {
  const emptyRoot = await makeFixtureRoot();
  const emptyResult = await verifyKlineCache({
    market: "ashare",
    timeframe: "101",
    dataRoot: emptyRoot,
    env: {}
  });
  assert.equal(emptyResult.status, "error");
  assert.ok(emptyResult.errors.some((item) => item.includes("manifest")));

  const badRoot = await makeFixtureRoot();
  await writeJson(path.join(badRoot, "ashare", "101", "manifest.json"), {
    market: "ashare",
    timeframe: "101",
    source: "tushare",
    last_trade_date: "20240103",
    updated_at: "2024-01-03T18:00:00.000Z",
    symbols_count: 1,
    candles_count: 2,
    status: "ok",
    errors: []
  });
  await writeJson(path.join(badRoot, "ashare", "101", "600519.json"), {
    code: "600519",
    market: "ashare",
    timeframe: "101",
    candles: [
      { date: "2024-01-03", open: 10, high: 11, low: 9, close: 10 },
      { date: "2024-01-03", open: 10, high: 11, low: 9 }
    ]
  });

  const badResult = await verifyKlineCache({
    market: "ashare",
    timeframe: "101",
    dataRoot: badRoot,
    env: { TUSHARE_TOKEN: "token" }
  });
  assert.equal(badResult.status, "error");
  assert.ok(badResult.errors.some((item) => item.includes("重复")));
  assert.ok(badResult.errors.some((item) => item.includes("open/high/low/close")));
});

test("verifyKlineCache validates multi-timeframe cache and KLINE_CACHE_ROOT style roots", async () => {
  const root = await makeFixtureRoot();
  for (const timeframe of ["101", "60m", "30m"]) {
    await writeJson(path.join(root, "ashare", timeframe, "manifest.json"), {
      market: "ashare",
      timeframe,
      source: "baostock",
      last_trade_date: "20240628",
      updated_at: "2024-06-30T00:00:00.000Z",
      symbols_count: 1,
      candles_count: 1,
      status: "ok",
      errors: []
    });
    await writeJson(path.join(root, "ashare", timeframe, "600519.json"), {
      code: "600519",
      market: "ashare",
      timeframe,
      source: "baostock",
      candles: [
        { date: timeframe === "101" ? "2024-06-28" : "2024-06-28 10:30:00", open: 10, high: 11, low: 9, close: 10, volume: 100, source: "baostock", adjust: "none" }
      ]
    });
  }

  const result = await verifyKlineCache({
    market: "ashare",
    timeframes: ["101", "60", "30m"],
    dataRoot: root,
    now: new Date("2024-06-29T00:00:00Z")
  });

  assert.equal(result.status, "ok");
  assert.deepEqual(result.timeframes.map((item) => item.timeframe), ["101", "60m", "30m"]);
  assert.equal(result.timeframes[1].candles_count, 1);
});

async function makeFixtureRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "ym-kline-cache-"));
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function providerResponse(items) {
  return {
    ok: true,
    async json() {
      return {
        code: 0,
        data: {
          fields: ["ts_code", "trade_date", "open", "high", "low", "close", "vol", "amount", "pct_chg"],
          items
        }
      };
    }
  };
}

async function writeAkshareFixtureScript(payload, extra = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ym-akshare-fixture-"));
  const filePath = path.join(dir, "fetch-akshare-fixture.mjs");
  await fs.writeFile(filePath, `console.log(${JSON.stringify(JSON.stringify({
    provider: "akshare",
    market: "ashare",
    timeframe: extra.timeframe || "101",
    ...payload
  }))});\n`, "utf8");
  return filePath;
}

async function writeBaostockFixtureScript(payload, extra = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ym-baostock-fixture-"));
  const filePath = path.join(dir, "fetch-baostock-fixture.mjs");
  await fs.writeFile(filePath, `console.log(${JSON.stringify(JSON.stringify({
    provider: "baostock",
    market: "ashare",
    timeframe: extra.timeframe || "101",
    ...payload
  }))});\n`, "utf8");
  return filePath;
}

async function writeBaostockArgsFixtureScript(envFile) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ym-baostock-args-fixture-"));
  const filePath = path.join(dir, "fetch-baostock-args-fixture.mjs");
  await fs.writeFile(filePath, `
import fs from "node:fs";
const file = ${JSON.stringify(envFile)};
let calls = [];
try { calls = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
calls.push(process.argv.join(" "));
fs.writeFileSync(file, JSON.stringify(calls));
console.log(JSON.stringify({
  provider: "baostock",
  market: "ashare",
  timeframe: "101",
  symbols: {
    [process.argv[process.argv.indexOf("--symbols") + 1]]: {
      code: process.argv[process.argv.indexOf("--symbols") + 1],
      candles: [{ time: "2024-01-03 10:30:00", open: 11, high: 12, low: 10, close: 11.5, volume: 1000, amount: 11000 }]
    }
  },
  errors: []
}));
`, "utf8");
  return filePath;
}

async function writeRetryFixtureScript({ stateFile, failUntil, provider, symbol }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ym-retry-fixture-"));
  const filePath = path.join(dir, "fetch-retry-fixture.mjs");
  await fs.writeFile(filePath, `
import fs from "node:fs";
const stateFile = ${JSON.stringify(stateFile)};
let state = { attempts: 0 };
try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
state.attempts += 1;
fs.writeFileSync(stateFile, JSON.stringify(state));
if (state.attempts <= ${Number(failUntil)}) {
  console.error("RemoteDisconnected");
  process.exit(1);
}
console.log(JSON.stringify({
  provider: ${JSON.stringify(provider)},
  market: "ashare",
  timeframe: "101",
  symbols: {
    [${JSON.stringify(symbol)}]: {
      code: ${JSON.stringify(symbol)},
      candles: [{ time: "2024-01-03", open: 11, high: 12, low: 10, close: 11.5, volume: 1000, amount: 11000 }]
    }
  },
  errors: []
}));
`, "utf8");
  return filePath;
}

async function writeEnvFixtureScript(envFile) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ym-env-fixture-"));
  const filePath = path.join(dir, "fetch-env-fixture.mjs");
  await fs.writeFile(filePath, `
import fs from "node:fs";
const keys = ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "NO_PROXY", "no_proxy"];
const env = {};
for (const key of keys) {
  if (process.env[key] !== undefined) env[key] = process.env[key];
}
fs.writeFileSync(${JSON.stringify(envFile)}, JSON.stringify(env));
console.log(JSON.stringify({
  provider: "akshare",
  market: "ashare",
  timeframe: "101",
  symbols: {
    "600519": {
      code: "600519",
      candles: [{ time: "2024-01-03", open: 11, high: 12, low: 10, close: 11.5, volume: 1000, amount: 11000 }]
    }
  },
  errors: []
}));
`, "utf8");
  return filePath;
}
