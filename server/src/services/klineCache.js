import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { fetchProviderKlines } from "./klineProviders.js";

const DEFAULT_MARKET = "ashare";
const DEFAULT_TIMEFRAME = "101";
const TIMEFRAME_LABELS = {
  "101": "日K"
};

export function mergeCandles(existing = [], incoming = []) {
  const map = new Map();
  normalizeCandles(existing).forEach((item) => map.set(normalizeDateKey(item.date), item));
  normalizeCandles(incoming).forEach((item) => map.set(normalizeDateKey(item.date), item));
  return Array.from(map.values()).sort((a, b) => compareDateText(a.date, b.date));
}

export async function updateKlineCache({
  market = DEFAULT_MARKET,
  timeframe = DEFAULT_TIMEFRAME,
  date = "",
  symbols = [],
  limit = 0,
  dryRun = false,
  dataRoot = config.marketDataDir,
  fetchImpl = globalThis.fetch,
  env = process.env,
  now = new Date()
} = {}) {
  const normalized = normalizeScope({ market, timeframe });
  const lastTradeDate = normalizeProviderDate(date) || getPreviousTradeDate(now);
  const startedAt = new Date().toISOString();
  const manifestPath = getManifestPath(dataRoot, normalized);
  const selectedSymbols = await resolveSymbols({ dataRoot, symbols, limit });
  const token = env.TUSHARE_TOKEN || "";

  if (!token) {
    const existingStats = await readCacheStats(dataRoot, normalized);
    const manifest = buildManifest({
      scope: normalized,
      lastTradeDate,
      updatedAt: startedAt,
      source: "tushare",
      status: "error",
      errors: ["TUSHARE_TOKEN 未配置，无法更新 K线缓存。"],
      symbolsCount: existingStats.symbolsCount,
      candlesCount: existingStats.candlesCount
    });
    if (!dryRun) await atomicWriteJson(manifestPath, manifest);
    return { ...manifest, updated_symbols: 0, added_candles: 0, skipped_symbols: selectedSymbols.length };
  }

  let updatedSymbols = 0;
  let addedCandles = 0;
  let skippedSymbols = 0;
  const errors = [];
  let candlesCount = 0;
  const touchedSymbols = new Set();

  for (const symbol of selectedSymbols) {
    try {
      const result = await withProviderEnv(env, () => fetchProviderKlines({
        provider: "tushare",
        market: { key: "cn_equity" },
        symbol,
        timeframe: { key: "1d" },
        startDate: lastTradeDate,
        endDate: lastTradeDate,
        limit: 20,
        fetchImpl
      }));
      const incoming = normalizeCandles(result.candles || []);
      if (!incoming.length) {
        skippedSymbols += 1;
        continue;
      }

      const filePath = getSymbolPath(dataRoot, normalized, symbol);
      const existing = await readJson(filePath, null);
      const existingCandles = Array.isArray(existing?.candles) ? existing.candles : [];
      const merged = mergeCandles(existingCandles, incoming);
      const added = Math.max(0, merged.length - normalizeCandles(existingCandles).length);
      const payload = {
        code: symbol,
        market: normalized.market,
        klt: normalized.timeframe,
        timeframe: normalized.timeframe,
        timeframe_label: TIMEFRAME_LABELS[normalized.timeframe] || normalized.timeframe,
        source: result.source || "tushare",
        updated_at: new Date().toISOString(),
        candles: merged
      };

      if (!dryRun) await atomicWriteJson(filePath, payload);
      updatedSymbols += 1;
      addedCandles += added;
      candlesCount += merged.length;
      touchedSymbols.add(symbol);
    } catch (error) {
      errors.push(`${symbol}: ${error.message}`);
    }
  }

  const status = errors.length && updatedSymbols ? "partial" : errors.length ? "error" : "ok";
  const existingStats = dryRun ? { symbolsCount: 0, candlesCount: 0 } : await readCacheStats(dataRoot, normalized);
  const manifest = buildManifest({
    scope: normalized,
    lastTradeDate,
    updatedAt: new Date().toISOString(),
    source: "tushare",
    status,
    errors,
    symbolsCount: Math.max(existingStats.symbolsCount, touchedSymbols.size),
    candlesCount: Math.max(existingStats.candlesCount, candlesCount)
  });

  if (!dryRun) await atomicWriteJson(manifestPath, manifest);

  return {
    ...manifest,
    updated_symbols: updatedSymbols,
    added_candles: addedCandles,
    skipped_symbols: skippedSymbols,
    dry_run: Boolean(dryRun)
  };
}

export async function verifyKlineCache({
  market = DEFAULT_MARKET,
  timeframe = DEFAULT_TIMEFRAME,
  dataRoot = config.marketDataDir,
  env = process.env,
  now = new Date()
} = {}) {
  const normalized = normalizeScope({ market, timeframe });
  const errors = [];
  const warnings = [];
  const manifestPath = getManifestPath(dataRoot, normalized);
  const manifest = await readJson(manifestPath, null);

  if (!manifest) {
    errors.push(`manifest 不存在：${path.relative(dataRoot, manifestPath)}`);
  }

  if (!env.TUSHARE_TOKEN) {
    warnings.push("TUSHARE_TOKEN 未配置，verify 标记为 stale。");
  }

  const expectedTradeDate = getPreviousTradeDate(now);
  if (manifest?.last_trade_date && manifest.last_trade_date < expectedTradeDate) {
    warnings.push(`manifest 已过期：${manifest.last_trade_date} < ${expectedTradeDate}`);
  }

  if (manifest && Number(manifest.symbols_count || 0) <= 0) {
    errors.push("manifest symbols_count 必须大于 0。");
  }
  if (manifest && Number(manifest.candles_count || 0) <= 0) {
    errors.push("manifest candles_count 必须大于 0。");
  }

  const files = await listSymbolFiles(dataRoot, normalized);
  if (!files.length) {
    errors.push("缓存目录中没有 symbol K线文件。");
  }

  let readableSymbols = 0;
  let candlesCount = 0;

  for (const filePath of files.slice(0, Math.max(files.length, 1))) {
    const payload = await readJson(filePath, null);
    const candles = Array.isArray(payload?.candles) ? payload.candles : [];
    readableSymbols += payload ? 1 : 0;
    candlesCount += candles.length;
    validateCandles(candles, path.basename(filePath), errors);
  }

  const status = errors.length ? "error" : warnings.length ? "stale" : "ok";
  return {
    market: normalized.market,
    timeframe: normalized.timeframe,
    manifest_exists: Boolean(manifest),
    token_configured: Boolean(env.TUSHARE_TOKEN),
    symbols_count: manifest?.symbols_count || readableSymbols,
    candles_count: manifest?.candles_count || candlesCount,
    status,
    errors,
    warnings
  };
}

function normalizeScope({ market, timeframe }) {
  const safeMarket = String(market || DEFAULT_MARKET).trim();
  const safeTimeframe = String(timeframe || DEFAULT_TIMEFRAME).trim();
  if (safeMarket !== "ashare") {
    throw new Error(`P2.2-A 当前只支持 market=ashare，收到：${safeMarket}`);
  }
  if (safeTimeframe !== "101") {
    throw new Error(`P2.2-A 当前只支持 timeframe=101，收到：${safeTimeframe}`);
  }
  return { market: safeMarket, timeframe: safeTimeframe };
}

async function resolveSymbols({ dataRoot, symbols = [], limit = 0 }) {
  const direct = uniqueStrings(symbols);
  if (direct.length) return direct;
  const pool = await readJson(path.join(dataRoot, "stock-pool.json"), null);
  const rows = Array.isArray(pool?.stocks) ? pool.stocks : [];
  const resolved = rows.map((item) => String(item.code || item.symbol || "").trim()).filter(Boolean);
  const safeLimit = Number(limit || 0);
  return safeLimit > 0 ? resolved.slice(0, safeLimit) : resolved;
}

function normalizeCandles(candles = []) {
  return candles
    .map((item) => {
      const date = String(item.date || item.trade_date || item.time || item.datetime || "").trim();
      const open = Number(item.open);
      const high = Number(item.high);
      const low = Number(item.low);
      const close = Number(item.close);
      if (!date || ![open, high, low, close].every(Number.isFinite)) return null;
      return {
        date: normalizeDisplayDate(date),
        open,
        close,
        high: Math.max(high, low),
        low: Math.min(high, low),
        volume: finiteNumber(item.volume ?? item.vol, 0),
        amount: finiteNumber(item.amount, 0),
        pct_chg: finiteNumber(item.pct_chg ?? item.pctChg, null)
      };
    })
    .filter(Boolean)
    .sort((a, b) => compareDateText(a.date, b.date));
}

function validateCandles(candles, label, errors) {
  const seen = new Set();
  let previous = "";

  candles.forEach((item, index) => {
    const key = normalizeDateKey(item.date || item.time || item.datetime);
    if (!key) errors.push(`${label} 第 ${index + 1} 根缺少 date/time。`);
    if (seen.has(key)) errors.push(`${label} 存在重复 candle：${item.date || item.time || item.datetime}`);
    seen.add(key);
    if (previous && key < previous) errors.push(`${label} candles 未按时间升序排序。`);
    previous = key;

    const hasOhlc = ["open", "high", "low", "close"].every((field) => Number.isFinite(Number(item[field])));
    if (!hasOhlc) errors.push(`${label} 第 ${index + 1} 根缺少 open/high/low/close。`);
  });
}

function buildManifest({
  scope,
  lastTradeDate,
  updatedAt,
  source,
  status,
  errors,
  symbolsCount = 0,
  candlesCount = 0
}) {
  return {
    market: scope.market,
    timeframe: scope.timeframe,
    source,
    last_trade_date: lastTradeDate,
    updated_at: updatedAt,
    symbols_count: symbolsCount,
    candles_count: candlesCount,
    status,
    errors
  };
}

async function readCacheStats(dataRoot, scope) {
  const files = await listSymbolFiles(dataRoot, scope);
  let candlesCount = 0;
  for (const filePath of files) {
    const payload = await readJson(filePath, null);
    candlesCount += Array.isArray(payload?.candles) ? payload.candles.length : 0;
  }
  return { symbolsCount: files.length, candlesCount };
}

async function listSymbolFiles(dataRoot, scope) {
  const dir = getCacheDir(dataRoot, scope);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "manifest.json")
      .map((entry) => path.join(dir, entry.name))
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function getCacheDir(dataRoot, scope) {
  return path.join(dataRoot, scope.market, scope.timeframe);
}

function getSymbolPath(dataRoot, scope, symbol) {
  return path.join(getCacheDir(dataRoot, scope), `${symbol}.json`);
}

function getManifestPath(dataRoot, scope) {
  return path.join(getCacheDir(dataRoot, scope), "manifest.json");
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function atomicWriteJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

async function withProviderEnv(env, action) {
  const oldToken = process.env.TUSHARE_TOKEN;
  const oldEndpoint = process.env.TUSHARE_ENDPOINT;
  if (env.TUSHARE_TOKEN !== undefined) process.env.TUSHARE_TOKEN = env.TUSHARE_TOKEN;
  if (env.TUSHARE_ENDPOINT !== undefined) process.env.TUSHARE_ENDPOINT = env.TUSHARE_ENDPOINT;
  try {
    return await action();
  } finally {
    restoreEnv("TUSHARE_TOKEN", oldToken);
    restoreEnv("TUSHARE_ENDPOINT", oldEndpoint);
  }
}

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((item) => String(item || "").trim()).filter(Boolean)));
}

function finiteNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function compareDateText(a, b) {
  return normalizeDateKey(a).localeCompare(normalizeDateKey(b));
}

function normalizeDateKey(value = "") {
  return String(value || "").replace(/\D/g, "").slice(0, 14);
}

function normalizeProviderDate(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(0, 8) : "";
}

function normalizeDisplayDate(value = "") {
  const digits = normalizeDateKey(value);
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return String(value || "");
}

function getPreviousTradeDate(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - 1);
  while ([0, 6].includes(date.getUTCDay())) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
