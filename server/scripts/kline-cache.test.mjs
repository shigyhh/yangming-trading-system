import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  mergeCandles,
  updateKlineCache,
  verifyKlineCache
} from "../src/services/klineCache.js";

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
