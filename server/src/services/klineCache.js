import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { fetchProviderKlines } from "./klineProviders.js";

const DEFAULT_MARKET = "ashare";
const DEFAULT_TIMEFRAME = "101";
const TIMEFRAME_LABELS = {
  "101": "日K",
  "60m": "60分钟K",
  "30m": "30分钟K"
};
const TIMEFRAME_PROVIDER_KEYS = {
  "101": { key: "1d" },
  "60m": { key: "60m", minutes: 60 },
  "30m": { key: "30m", minutes: 30 }
};
const DEFAULT_PROVIDER_CHAIN = ["baostock", "akshare", "tushare"];

export function mergeCandles(existing = [], incoming = []) {
  const map = new Map();
  normalizeCandles(existing).forEach((item) => map.set(normalizeDateKey(item.date), item));
  normalizeCandles(incoming).forEach((item) => map.set(normalizeDateKey(item.date), item));
  return Array.from(map.values()).sort((a, b) => compareDateText(a.date, b.date));
}

export async function updateKlineCache({
  market = DEFAULT_MARKET,
  timeframe = DEFAULT_TIMEFRAME,
  provider = "",
  providerChain = [],
  date = "",
  startDate = "",
  endDate = "",
  symbols = [],
  limit = 0,
  dryRun = false,
  dataRoot = config.marketDataDir,
  fetchImpl = globalThis.fetch,
  env = process.env,
  now = new Date()
} = {}) {
  const normalized = normalizeScope({ market, timeframe });
  const normalizedStartDate = normalizeProviderDate(startDate);
  const normalizedEndDate = normalizeProviderDate(endDate || date) || getPreviousTradeDate(now);
  const lastTradeDate = normalizedEndDate;
  const startedAt = new Date().toISOString();
  const manifestPath = getManifestPath(dataRoot, normalized);
  const selectedSymbols = await resolveSymbols({ dataRoot, symbols, limit });
  const chain = normalizeProviderChain(providerChain.length ? providerChain : provider ? defaultChainForProvider(provider) : DEFAULT_PROVIDER_CHAIN);
  const providerKey = chain[0] || normalizeProvider(provider);
  const token = env.TUSHARE_TOKEN || "";

  if (chain.length === 1 && providerKey === "tushare" && !token) {
    const existingStats = await readCacheStats(dataRoot, normalized);
    const manifest = buildManifest({
      scope: normalized,
      lastTradeDate,
      updatedAt: startedAt,
      source: providerKey,
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
  const sourceCounts = {};

  for (let index = 0; index < selectedSymbols.length; index += 1) {
    const symbol = selectedSymbols[index];
    try {
      const result = await withProviderEnv(env, () => fetchSymbolKlinesWithProviderChain({
        providerChain: chain,
        market: { key: "cn_equity" },
        symbol,
        timeframe: TIMEFRAME_PROVIDER_KEYS[normalized.timeframe],
        startDate: normalizedStartDate || lastTradeDate,
        endDate: lastTradeDate,
        limit: 20,
        fetchImpl,
        env
      }));
      const incoming = normalizeCandles(result.candles || []);
      const sourceKey = normalizeSourceKey(result.source || result.provider || providerKey);
      const stampedIncoming = incoming.map((item) => ({
        ...item,
        source: item.source || sourceKey,
        adjust: item.adjust || "none"
      }));
      if (!incoming.length) {
        skippedSymbols += 1;
        continue;
      }

      const filePath = getSymbolPath(dataRoot, normalized, symbol);
      const existing = await readJson(filePath, null);
      const existingCandlesRaw = Array.isArray(existing?.candles) ? existing.candles : [];
      const existingCandles = normalized.timeframe === "101"
        ? existingCandlesRaw
        : existingCandlesRaw.filter((item) => normalizeDateKey(item.date || item.time || item.datetime).length > 8);
      const merged = mergeCandles(existingCandles, stampedIncoming);
      const added = Math.max(0, merged.length - normalizeCandles(existingCandles).length);
      const payload = {
        code: symbol,
        market: normalized.market,
        klt: normalized.timeframe,
        timeframe: normalized.timeframe,
        timeframe_label: TIMEFRAME_LABELS[normalized.timeframe] || normalized.timeframe,
        source: sourceKey,
        updated_at: new Date().toISOString(),
        candles: merged
      };

      if (!dryRun) await atomicWriteJson(filePath, payload);
      updatedSymbols += 1;
      addedCandles += added;
      candlesCount += merged.length;
      touchedSymbols.add(symbol);
      sourceCounts[sourceKey] = (sourceCounts[sourceKey] || 0) + 1;
    } catch (error) {
      errors.push(`${symbol}: ${error.message}`);
    }
    if (index < selectedSymbols.length - 1) {
      await waitProviderInterval(providerKey, env);
    }
  }

  const status = errors.length && updatedSymbols ? "partial" : errors.length ? "error" : "ok";
  const existingStats = dryRun ? { symbolsCount: 0, candlesCount: 0 } : await readCacheStats(dataRoot, normalized);
  const manifest = buildManifest({
    scope: normalized,
    lastTradeDate,
    updatedAt: new Date().toISOString(),
    source: resolveManifestSource(providerKey, sourceCounts),
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
    sources: sourceCounts,
    dry_run: Boolean(dryRun)
  };
}

export async function verifyKlineCache({
  market = DEFAULT_MARKET,
  timeframe = DEFAULT_TIMEFRAME,
  timeframes = [],
  dataRoot = config.marketDataDir,
  env = process.env,
  now = new Date()
} = {}) {
  const requestedTimeframes = normalizeTimeframeList(timeframes.length ? timeframes : [timeframe]);
  if (requestedTimeframes.length > 1) {
    const results = [];
    for (const item of requestedTimeframes) {
      results.push(await verifyKlineCache({ market, timeframe: item, dataRoot, env, now }));
    }
    const errors = results.flatMap((item) => item.errors || []);
    const warnings = results.flatMap((item) => item.warnings || []);
    return {
      market,
      timeframes: results,
      status: errors.length ? "error" : warnings.length ? "stale" : "ok",
      errors,
      warnings
    };
  }
  const normalized = normalizeScope({ market, timeframe });
  const errors = [];
  const warnings = [];
  const manifestPath = getManifestPath(dataRoot, normalized);
  const manifest = await readJson(manifestPath, null);

  if (!manifest) {
    errors.push(`manifest 不存在：${path.relative(dataRoot, manifestPath)}`);
  }

  if (manifest && !["akshare", "baostock", "mixed"].includes(String(manifest.source || "")) && !env.TUSHARE_TOKEN) {
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
    validateCandles(candles, path.basename(filePath), errors, {
      source: payload?.source,
      adjust: payload?.adjust || payload?.adjustment || payload?.adjustment_mode || "none"
    });
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

export async function backfillKlineCache({
  market = DEFAULT_MARKET,
  timeframe = "",
  timeframes = [],
  years = 0,
  months = 0,
  all = false,
  symbols = [],
  providerChain = DEFAULT_PROVIDER_CHAIN,
  concurrency = 1,
  batchSize = 100,
  resume = false,
  dryRun = false,
  dataRoot = config.marketDataDir,
  env = process.env,
  now = new Date()
} = {}) {
  const requestedTimeframes = normalizeTimeframeList(timeframes.length ? timeframes : [timeframe || DEFAULT_TIMEFRAME]);
  const resolvedSymbols = await resolveSymbols({ dataRoot, symbols: all ? [] : symbols, limit: 0 });
  const range = resolveBackfillRange({ years, months, now });
  const startedAt = new Date().toISOString();
  const results = [];

  for (const timeframeKey of requestedTimeframes) {
    const scope = normalizeScope({ market, timeframe: timeframeKey });
    const statePath = getBackfillStatePath(dataRoot, scope);
    const existingState = resume ? await readJson(statePath, null) : null;
    const completed = new Set(Array.isArray(existingState?.completed_symbols) ? existingState.completed_symbols : []);
    const failed = new Set(Array.isArray(existingState?.failed_symbols) ? existingState.failed_symbols : []);
    const runnableSymbols = resolvedSymbols.filter((symbol) => !resume || !completed.has(symbol));
    let updatedSymbols = 0;
    let addedCandles = 0;
    const errors = [];
    let lastSymbol = existingState?.last_symbol || "";

    for (const symbol of runnableSymbols) {
      lastSymbol = symbol;
      const result = await updateKlineCache({
        market,
        timeframe: timeframeKey,
        providerChain,
        startDate: range.startDate,
        endDate: range.endDate,
        symbols: [symbol],
        dryRun,
        dataRoot,
        env,
        now
      });
      if (result.status === "ok" || result.status === "partial") {
        updatedSymbols += result.updated_symbols || 0;
        addedCandles += result.added_candles || 0;
        if ((result.updated_symbols || 0) > 0) {
          completed.add(symbol);
          failed.delete(symbol);
        }
      }
      if (result.status === "error") {
        failed.add(symbol);
        errors.push(...(result.errors || []).map((item) => `${symbol}: ${item}`));
      }
      if (!dryRun) {
        await writeBackfillState(statePath, {
          timeframe: scope.timeframe,
          range: { start_date: range.startDate, end_date: range.endDate },
          total_symbols: resolvedSymbols.length,
          completed_symbols: Array.from(completed).sort(),
          failed_symbols: Array.from(failed).sort(),
          last_symbol: lastSymbol,
          provider_chain: normalizeProviderChain(providerChain),
          started_at: existingState?.started_at || startedAt,
          updated_at: new Date().toISOString(),
          concurrency: Math.max(Number(concurrency || 1), 1),
          batch_size: Math.max(Number(batchSize || 100), 1)
        });
      }
    }

    results.push({
      timeframe: scope.timeframe,
      range,
      total_symbols: resolvedSymbols.length,
      updated_symbols: updatedSymbols,
      added_candles: addedCandles,
      skipped_completed: resolvedSymbols.length - runnableSymbols.length,
      failed_symbols: Array.from(failed).sort(),
      errors
    });
  }

  const errors = results.flatMap((item) => item.errors);
  return {
    ok: !errors.length,
    status: errors.length ? "partial" : "ok",
    dry_run: Boolean(dryRun),
    market,
    provider_chain: normalizeProviderChain(providerChain),
    timeframes: results,
    errors
  };
}

export function normalizeKlineTimeframe(value = DEFAULT_TIMEFRAME) {
  const key = String(value || DEFAULT_TIMEFRAME).trim().toLowerCase();
  if (["101", "1d", "daily", "day", "d", "日", "日线"].includes(key)) {
    return { timeframe: "101", providerTimeframe: TIMEFRAME_PROVIDER_KEYS["101"], label: TIMEFRAME_LABELS["101"] };
  }
  if (["60", "60m", "m60", "60min", "60分钟"].includes(key)) {
    return { timeframe: "60m", providerTimeframe: TIMEFRAME_PROVIDER_KEYS["60m"], label: TIMEFRAME_LABELS["60m"] };
  }
  if (["30", "30m", "m30", "30min", "30分钟"].includes(key)) {
    return { timeframe: "30m", providerTimeframe: TIMEFRAME_PROVIDER_KEYS["30m"], label: TIMEFRAME_LABELS["30m"] };
  }
  throw new Error(`P2.2-A.5 当前只支持 timeframe=101/60m/30m，收到：${value}`);
}

function normalizeScope({ market, timeframe }) {
  const safeMarket = String(market || DEFAULT_MARKET).trim();
  const safeTimeframe = normalizeKlineTimeframe(timeframe || DEFAULT_TIMEFRAME).timeframe;
  if (safeMarket !== "ashare") {
    throw new Error(`P2.2-A 当前只支持 market=ashare，收到：${safeMarket}`);
  }
  return { market: safeMarket, timeframe: safeTimeframe };
}

function normalizeProvider(value = "") {
  const key = String(value || "").trim().toLowerCase();
  return key || "tushare";
}

async function fetchSymbolKlinesWithProviderChain({ providerKey, ...params }) {
  const chain = normalizeProviderChain(params.providerChain || [providerKey]);
  const errors = [];
  for (const provider of chain) {
    if (provider === "local_cache") continue;
    try {
      return await fetchProviderKlines({ provider, ...params });
    } catch (error) {
      errors.push(`${provider}: ${error.message}`);
    }
  }
  throw new Error(errors.join("；") || "provider chain 没有返回可用 K线。");
}

function normalizeProviderChain(value = []) {
  const items = Array.isArray(value) ? value : String(value || "").split(",");
  const chain = items.map(normalizeProvider).filter(Boolean);
  return chain.length ? Array.from(new Set(chain)) : DEFAULT_PROVIDER_CHAIN;
}

function defaultChainForProvider(provider = "") {
  const key = normalizeProvider(provider);
  if (key === "akshare") return ["akshare", "baostock"];
  if (key === "baostock") return ["baostock", "akshare", "tushare"];
  return [key];
}

function normalizeSourceKey(value = "") {
  const key = String(value || "").trim().toLowerCase();
  if (key.includes("akshare")) return "akshare";
  if (key.includes("baostock")) return "baostock";
  if (key.includes("tushare")) return "tushare";
  if (key.includes("futu")) return "futu";
  if (key.includes("okx")) return "okx";
  return key || "unknown";
}

function resolveManifestSource(providerKey, sourceCounts) {
  const sources = Object.keys(sourceCounts || {}).filter(Boolean);
  if (sources.length > 1) return "mixed";
  return sources[0] || providerKey;
}

async function waitProviderInterval(providerKey, env = {}) {
  if (providerKey !== "akshare") return;
  const delayMs = positiveInt(env.AKSHARE_REQUEST_INTERVAL_MS ?? process.env.AKSHARE_REQUEST_INTERVAL_MS, 0);
  const jitterMs = positiveInt(env.AKSHARE_JITTER_MS ?? process.env.AKSHARE_JITTER_MS, 0);
  const total = delayMs + (jitterMs > 0 ? Math.floor(Math.random() * (jitterMs + 1)) : 0);
  if (total > 0) await new Promise((resolve) => setTimeout(resolve, total));
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
        pct_chg: finiteNumber(item.pct_chg ?? item.pctChg, null),
        amplitude: finiteNumber(item.amplitude, null),
        turnover: finiteNumber(item.turnover ?? item.turnover_rate, null),
        source: String(item.source || "").trim() || undefined,
        adjust: String(item.adjust || "").trim() || undefined
      };
    })
    .filter(Boolean)
    .sort((a, b) => compareDateText(a.date, b.date));
}

function validateCandles(candles, label, errors, fallback = {}) {
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
    const open = Number(item.open);
    const high = Number(item.high);
    const low = Number(item.low);
    const close = Number(item.close);
    if (hasOhlc && (high < open || high < close || high < low)) errors.push(`${label} 第 ${index + 1} 根 high 不合法。`);
    if (hasOhlc && (low > open || low > close || low > high)) errors.push(`${label} 第 ${index + 1} 根 low 不合法。`);
    if (item.volume !== undefined && Number(item.volume) < 0) errors.push(`${label} 第 ${index + 1} 根 volume 不能为负。`);
    if (!item.source && !fallback.source) errors.push(`${label} 第 ${index + 1} 根缺少 source。`);
    if (!item.adjust && !fallback.adjust) errors.push(`${label} 第 ${index + 1} 根缺少 adjust。`);
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
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "manifest.json" && entry.name !== "backfill-state.json")
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

function getBackfillStatePath(dataRoot, scope) {
  return path.join(getCacheDir(dataRoot, scope), "backfill-state.json");
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

async function writeBackfillState(filePath, payload) {
  await atomicWriteJson(filePath, payload);
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

function normalizeTimeframeList(values = []) {
  return uniqueStrings(values).map((value) => normalizeKlineTimeframe(value).timeframe);
}

function resolveBackfillRange({ years = 0, months = 0, now = new Date() } = {}) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime());
  if (Number(years || 0) > 0) {
    start.setUTCFullYear(start.getUTCFullYear() - Number(years));
  } else {
    start.setUTCMonth(start.getUTCMonth() - Math.max(Number(months || 6), 1));
  }
  return {
    startDate: formatProviderDate(start),
    endDate: formatProviderDate(end)
  };
}

function formatProviderDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function finiteNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function positiveInt(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.trunc(numberValue) : fallback;
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
  if (digits.length >= 14) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)} ${digits.slice(8, 10)}:${digits.slice(10, 12)}:${digits.slice(12, 14)}`;
  }
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
