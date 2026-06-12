#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { fetchProviderKlines } from "../src/services/klineProviders.js";

const DEFAULT_SYMBOLS = [
  "600519.SH",
  "300750.SZ",
  "000001.SZ",
  "000002.SZ",
  "688981.SH",
  "00700.HK",
  "09988.HK",
  "AAPL.US",
  "TSLA.US"
];

const DEFAULT_PROVIDERS = ["tickflow", "baostock", "akshare"];
const DEFAULT_COUNTS = [100, 1000];
const DEFAULT_PERIODS = ["1d"];
const TICKFLOW_MINUTE_PERIOD = "15m";
const TICKFLOW_MINUTE_COUNT = 200;

export function normalizeBenchmarkSymbol(value = "") {
  const raw = String(value || "").trim().toUpperCase();
  const compact = raw.replace(/\.(SH|SZ|BJ|HK|US)$/, "");
  const suffix = raw.match(/\.(SH|SZ|BJ|HK|US)$/)?.[1] || "";

  if (suffix === "HK") {
    return { raw, market: "hk", canonical: `${compact.padStart(5, "0")}.HK`, localCode: compact.padStart(5, "0") };
  }
  if (suffix === "US") {
    return { raw, market: "us", canonical: `${compact}.US`, localCode: compact };
  }
  if (/^\d{6}$/.test(compact)) {
    const exchange = suffix || inferAshareExchange(compact);
    return { raw: value, market: "ashare", canonical: `${compact}.${exchange}`, localCode: compact };
  }

  return { raw, market: "unknown", canonical: raw, localCode: compact || raw };
}

export function evaluateCandles(candles = []) {
  const normalized = candles.map(normalizeBenchmarkCandle).filter(Boolean);
  const times = normalized.map((item) => item.time);
  const seen = new Set();
  let duplicateTimeCount = 0;
  let sortedByTime = true;

  times.forEach((time, index) => {
    if (seen.has(time)) duplicateTimeCount += 1;
    seen.add(time);
    if (index > 0 && time < times[index - 1]) sortedByTime = false;
  });

  const fieldsComplete = normalized.length > 0 && normalized.every((item) => (
    Boolean(item.time) &&
    ["open", "high", "low", "close", "volume"].every((field) => Number.isFinite(Number(item[field])))
  ));
  const ohlcValid = normalized.length > 0 && normalized.every((item) => {
    const open = Number(item.open);
    const high = Number(item.high);
    const low = Number(item.low);
    const close = Number(item.close);
    return high >= open && high >= close && high >= low && low <= open && low <= close && low <= high;
  });

  return {
    candlesCount: normalized.length,
    fieldsComplete,
    ohlcValid,
    sortedByTime,
    duplicateTimeCount,
    firstTime: times[0] || "",
    lastTime: times.at(-1) || ""
  };
}

export function tickflowUnavailableResult({ symbol, period, count, reason }) {
  return {
    provider: "tickflow",
    market: normalizeBenchmarkSymbol(symbol).market,
    symbol,
    period,
    count,
    success: false,
    latencyMs: 0,
    candlesCount: 0,
    fieldsComplete: false,
    ohlcValid: false,
    sortedByTime: false,
    duplicateTimeCount: 0,
    firstTime: "",
    lastTime: "",
    errorMessage: reason || "TickFlow 未配置"
  };
}

export function summarizeProviderResults(provider, results = []) {
  const rows = results.filter((item) => item.provider === provider);
  const successRows = rows.filter((item) => item.success);
  const latencies = rows.map((item) => Number(item.latencyMs || 0)).filter(Number.isFinite);
  const qualityErrors = rows.filter((item) => (
    item.success &&
    (!item.fieldsComplete || !item.ohlcValid || !item.sortedByTime || Number(item.duplicateTimeCount || 0) > 0)
  )).length;
  const unsupported = rows.filter((item) => /unsupported|不支持/i.test(item.errorMessage || "")).length;
  const authIssues = rows.filter((item) => /auth|key|token|api_key|TICKFLOW_API_KEY/i.test(item.errorMessage || "")).length;

  return {
    provider,
    cases: rows.length,
    successRate: rows.length ? `${((successRows.length / rows.length) * 100).toFixed(1)}%` : "0.0%",
    avgLatencyMs: latencies.length ? Math.round(latencies.reduce((sum, item) => sum + item, 0) / latencies.length) : 0,
    fieldCompleteness: successRows.length ? `${((successRows.filter((item) => item.fieldsComplete).length / successRows.length) * 100).toFixed(1)}%` : "0.0%",
    dataQualityErrors: qualityErrors,
    unsupported,
    authIssues,
    recommendation: buildProviderRecommendation(provider, rows, successRows, qualityErrors, authIssues)
  };
}

export async function runBenchmark(options = {}) {
  const providers = options.providers || DEFAULT_PROVIDERS;
  const symbols = options.symbols || DEFAULT_SYMBOLS;
  const counts = options.counts || DEFAULT_COUNTS;
  const periods = options.periods || DEFAULT_PERIODS;
  const includeMinute = Boolean(options.includeMinute);
  const rows = [];

  for (const provider of providers) {
    for (const symbol of symbols) {
      for (const period of periods) {
        for (const count of counts) {
          rows.push(await runBenchmarkCase({ provider, symbol, period, count, env: options.env || process.env }));
        }
      }
      if (provider === "tickflow" && includeMinute && normalizeBenchmarkSymbol(symbol).market === "ashare") {
        rows.push(await runBenchmarkCase({
          provider,
          symbol,
          period: TICKFLOW_MINUTE_PERIOD,
          count: TICKFLOW_MINUTE_COUNT,
          env: options.env || process.env
        }));
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    environment: {
      tickflowSdkInstalled: detectTickFlowSdk(options.env || process.env),
      hasTickflowApiKey: Boolean((options.env || process.env).TICKFLOW_API_KEY),
      hasTickflowApiBaseUrl: Boolean((options.env || process.env).TICKFLOW_API_BASE_URL || (options.env || process.env).TICKFLOW_API_URL_TEMPLATE)
    },
    results: rows,
    summary: providers.map((provider) => summarizeProviderResults(provider, rows))
  };
}

function detectTickFlowSdk(env = {}) {
  const pythonBin = env.TICKFLOW_PYTHON_BIN || env.AKSHARE_PYTHON_BIN || "python3";
  const result = spawnSync(pythonBin, [
    "-c",
    "import importlib.util; raise SystemExit(0 if importlib.util.find_spec('tickflow') else 1)"
  ], {
    encoding: "utf8",
    timeout: 5000,
    stdio: ["ignore", "ignore", "ignore"]
  });
  return result.status === 0;
}

async function runBenchmarkCase({ provider, symbol, period, count, env }) {
  const started = Date.now();
  try {
    if (provider === "tickflow") {
      return await benchmarkTickFlow({ symbol, period, count, env, started });
    }
    if (provider === "akshare" || provider === "baostock") {
      return await benchmarkExistingProvider({ provider, symbol, period, count, env, started });
    }
    return buildResult({
      provider,
      symbol,
      period,
      count,
      started,
      errorMessage: `unsupported provider: ${provider}`
    });
  } catch (error) {
    return buildResult({
      provider,
      symbol,
      period,
      count,
      started,
      errorMessage: error.message || String(error)
    });
  }
}

async function benchmarkExistingProvider({ provider, symbol, period, count, env, started }) {
  const normalized = normalizeBenchmarkSymbol(symbol);
  if (normalized.market !== "ashare") {
    return buildResult({ provider, symbol: normalized.canonical, period, count, started, errorMessage: "unsupported market" });
  }
  if (period !== "1d") {
    return buildResult({ provider, symbol: normalized.canonical, period, count, started, errorMessage: "unsupported period" });
  }

  const range = buildDateRange(count);
  const fetched = await fetchProviderKlines({
    provider,
    market: { key: "cn_equity" },
    symbol: normalized.localCode,
    timeframe: { key: "1d" },
    startDate: range.startDate,
    endDate: range.endDate,
    limit: count,
    env
  });

  return buildResult({
    provider,
    symbol: normalized.canonical,
    period,
    count,
    started,
    candles: (fetched.candles || []).slice(-count)
  });
}

async function benchmarkTickFlow({ symbol, period, count, env, started }) {
  const normalized = normalizeBenchmarkSymbol(symbol);
  const apiBaseUrl = String(env.TICKFLOW_API_BASE_URL || "").replace(/\/$/, "");
  const template = String(env.TICKFLOW_API_URL_TEMPLATE || "").trim();
  if (!apiBaseUrl && !template) {
    return tickflowUnavailableResult({
      symbol: normalized.canonical,
      period,
      count,
      reason: "TICKFLOW_API_BASE_URL 或 TICKFLOW_API_URL_TEMPLATE 未配置，无法确认免费/完整 TickFlow REST 能力。"
    });
  }

  const requestUrl = buildTickFlowUrl({ apiBaseUrl, template, symbol: normalized.canonical, period, count });
  const headers = {};
  if (env.TICKFLOW_API_KEY) headers.authorization = `Bearer ${env.TICKFLOW_API_KEY}`;
  const response = await fetch(requestUrl, { headers });
  if (!response.ok) {
    return buildResult({
      provider: "tickflow",
      symbol: normalized.canonical,
      period,
      count,
      started,
      errorMessage: `TickFlow HTTP ${response.status}`
    });
  }
  const payload = await response.json();
  return buildResult({
    provider: "tickflow",
    symbol: normalized.canonical,
    period,
    count,
    started,
    candles: normalizeTickFlowPayload(payload)
  });
}

function buildTickFlowUrl({ apiBaseUrl, template, symbol, period, count }) {
  if (template) {
    return template
      .replaceAll("{symbol}", encodeURIComponent(symbol))
      .replaceAll("{period}", encodeURIComponent(period))
      .replaceAll("{timeframe}", encodeURIComponent(period))
      .replaceAll("{count}", encodeURIComponent(String(count)));
  }

  const url = new URL("/api/v1/kline/history", `${apiBaseUrl}/`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("period", period);
  url.searchParams.set("timeframe", period);
  url.searchParams.set("count", String(count));
  return url.toString();
}

function normalizeTickFlowPayload(payload) {
  const rows = Array.isArray(payload?.candles)
    ? payload.candles
    : Array.isArray(payload?.data?.candles)
      ? payload.data.candles
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
  return rows.map(normalizeBenchmarkCandle).filter(Boolean);
}

function buildResult({ provider, symbol, period, count, started, candles = [], errorMessage = "" }) {
  const quality = evaluateCandles(candles);
  return {
    provider,
    market: normalizeBenchmarkSymbol(symbol).market,
    symbol,
    period,
    count,
    success: !errorMessage && quality.candlesCount > 0,
    latencyMs: Math.max(Date.now() - started, 0),
    ...quality,
    errorMessage
  };
}

function normalizeBenchmarkCandle(item = {}) {
  const time = String(item.time || item.date || item.datetime || item.openTime || item.trade_date || "").trim();
  if (!time) return null;
  return {
    time: normalizeTimeText(time),
    open: toFiniteNumber(item.open),
    high: toFiniteNumber(item.high),
    low: toFiniteNumber(item.low),
    close: toFiniteNumber(item.close),
    volume: toFiniteNumber(item.volume ?? item.vol),
  };
}

function buildDateRange(count) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(Number(count || 100) * 3, 365));
  return {
    startDate: formatDate(start),
    endDate: formatDate(end)
  };
}

function formatDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("");
}

function normalizeTimeText(value) {
  const text = String(value || "").trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}${digits.length >= 12 ? ` ${digits.slice(8, 10)}:${digits.slice(10, 12)}` : ""}`;
  return text;
}

function inferAshareExchange(code) {
  if (/^(6|9)/.test(code)) return "SH";
  if (/^(0|2|3)/.test(code)) return "SZ";
  if (/^(4|8)/.test(code)) return "BJ";
  return "SH";
}

function toFiniteNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function buildProviderRecommendation(provider, rows, successRows, qualityErrors, authIssues) {
  if (!rows.length) return "未测试";
  if (provider === "tickflow" && !successRows.length && authIssues) return "先配置 TickFlow API key / base URL";
  if (provider === "tickflow" && !successRows.length) return "当前环境未跑通，不建议切主源";
  if (qualityErrors > 0) return "数据质量需复核";
  const successRate = successRows.length / rows.length;
  if (successRate >= 0.98) return "可作为主源候选";
  if (successRate >= 0.8) return "可作为 fallback 候选";
  return "暂不建议作为主源";
}

function parseArgs(argv) {
  const parsed = {
    providers: DEFAULT_PROVIDERS,
    symbols: DEFAULT_SYMBOLS,
    counts: DEFAULT_COUNTS,
    periods: DEFAULT_PERIODS,
    includeMinute: true,
    json: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    if (arg === "--json") parsed.json = true;
    if (arg === "--no-minute") parsed.includeMinute = false;
    if (arg === "--providers" && next) {
      parsed.providers = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    }
    if (arg === "--symbols" && next) {
      parsed.symbols = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    }
    if (arg === "--counts" && next) {
      parsed.counts = next.split(",").map((item) => Math.max(Number(item), 1)).filter(Number.isFinite);
      index += 1;
    }
    if (arg === "--periods" && next) {
      parsed.periods = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`
K线 provider 稳定性基准测试

用法：
  node scripts/benchmark-kline-providers.js
  node scripts/benchmark-kline-providers.js --providers tickflow,baostock,akshare --symbols 600519.SH,300750.SZ --counts 100
  node scripts/benchmark-kline-providers.js --json

说明：
  只读 provider，不写生产缓存。
  TickFlow 需要 TICKFLOW_API_BASE_URL 或 TICKFLOW_API_URL_TEMPLATE；如需鉴权，设置 TICKFLOW_API_KEY。
  BaoStock / AKShare 复用现有 provider 读取能力，仅测试 A股 1d。
`);
}

function printReport(report) {
  console.log("# TickFlow 稳定性基准测试报告");
  console.log(`生成时间：${report.generatedAt}`);
  console.log("");
  console.log("## Provider 对比表");
  console.table(report.summary);
  console.log("");
  console.log("## 明细结果");
  console.table(report.results.map((item) => ({
    provider: item.provider,
    market: item.market,
    symbol: item.symbol,
    period: item.period,
    count: item.count,
    success: item.success,
    latencyMs: item.latencyMs,
    candlesCount: item.candlesCount,
    fieldsComplete: item.fieldsComplete,
    ohlcValid: item.ohlcValid,
    sortedByTime: item.sortedByTime,
    duplicateTimeCount: item.duplicateTimeCount,
    firstTime: item.firstTime,
    lastTime: item.lastTime,
    errorMessage: item.errorMessage
  })));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const report = await runBenchmark(args);
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  printReport(report);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[KLINE BENCHMARK] ${error.message}`);
    process.exitCode = 1;
  });
}
