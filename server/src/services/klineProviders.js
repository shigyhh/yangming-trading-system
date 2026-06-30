import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROVIDER_LABELS = {
  akshare: "AKShare",
  baostock: "BaoStock",
  tushare: "Tushare Pro",
  futu: "Futu OpenAPI Bridge",
  okx: "OKX"
};

const AKSHARE_SCRIPT_PATH = fileURLToPath(new URL("../../scripts/providers/fetch-akshare-daily.py", import.meta.url));
const BAOSTOCK_SCRIPT_PATH = fileURLToPath(new URL("../../scripts/providers/fetch-baostock-daily.py", import.meta.url));
const TUSHARE_ENDPOINT = "https://api.tushare.pro";
const OKX_ENDPOINT = "https://www.okx.com";

const TUSHARE_DAILY_APIS = {
  cn_equity: "daily",
  hk_equity: "hk_daily",
  futures: "fut_daily"
};

const TUSHARE_MINUTE_APIS = {
  cn_equity: "stk_mins",
  hk_equity: "hk_mins",
  futures: "ft_mins"
};

const TUSHARE_FIELDS = [
  "ts_code",
  "trade_date",
  "trade_time",
  "open",
  "high",
  "low",
  "close",
  "vol",
  "amount",
  "pct_chg"
].join(",");

const OKX_BAR_MAP = {
  "5m": "5m",
  "10m": "15m",
  "30m": "30m",
  "60m": "1H",
  "1d": "1D",
  "1w": "1W",
  "1mo": "1M"
};

export function listKlineProviders() {
  return [
    {
      key: "akshare",
      label: PROVIDER_LABELS.akshare,
      markets: ["cn_equity"],
      timeframes: ["1d"],
      requires: ["python3", "akshare"],
      note: "适合 A股日线历史缓存。通过服务端 Python 脚本调用 AKShare，不需要 TUSHARE_TOKEN。"
    },
    {
      key: "baostock",
      label: PROVIDER_LABELS.baostock,
      markets: ["cn_equity"],
      timeframes: ["30m", "60m", "1d"],
      requires: ["python3", "baostock"],
      note: "作为 A股日线与 30/60 分钟线缓存主源，不需要 TUSHARE_TOKEN。"
    },
    {
      key: "tushare",
      label: PROVIDER_LABELS.tushare,
      markets: ["cn_equity", "hk_equity", "futures"],
      timeframes: ["5m", "10m", "30m", "60m", "1d", "1w", "1mo"],
      requires: ["TUSHARE_TOKEN"],
      note: "适合 A股、港股、期货历史数据。10分钟可由 5分钟数据聚合。"
    },
    {
      key: "futu",
      label: PROVIDER_LABELS.futu,
      markets: ["cn_equity", "hk_equity", "us_equity", "futures", "crypto"],
      timeframes: ["5m", "10m", "30m", "60m", "1d", "1w", "1mo", "1y"],
      requires: ["FUTU_OPENAPI_BRIDGE_URL"],
      note: "Futu OpenAPI 需要本地 OpenD/桥服务，本服务按 HTTP bridge 接入。"
    },
    {
      key: "okx",
      label: PROVIDER_LABELS.okx,
      markets: ["crypto"],
      timeframes: ["5m", "10m", "30m", "60m", "1d", "1w", "1mo"],
      requires: [],
      note: "适合数字货币历史蜡烛图。10分钟由近邻周期或本地聚合生成。"
    }
  ];
}

export function resolveDefaultProvider(marketKey = "") {
  if (marketKey === "crypto") return "okx";
  if (marketKey === "us_equity") return "futu";
  return "tushare";
}

export async function fetchProviderKlines({
  provider = "",
  market,
  symbol = "",
  timeframe,
  adjustmentMode = "none",
  startDate = "",
  endDate = "",
  limit = 1000,
  fetchImpl = globalThis.fetch,
  env = process.env
} = {}) {
  const key = String(provider || resolveDefaultProvider(market?.key)).trim().toLowerCase();
  if (key === "akshare") {
    return fetchAkshareKlines({ market, symbol, timeframe, adjustmentMode, startDate, endDate, env });
  }
  if (key === "baostock") {
    return fetchBaostockKlines({ market, symbol, timeframe, adjustmentMode, startDate, endDate, env });
  }
  if (key === "tushare") {
    return fetchTushareKlines({ market, symbol, timeframe, adjustmentMode, startDate, endDate, limit, fetchImpl });
  }
  if (key === "futu") {
    return fetchFutuKlines({ market, symbol, timeframe, adjustmentMode, startDate, endDate, limit, fetchImpl });
  }
  if (key === "okx") {
    return fetchOkxKlines({ market, symbol, timeframe, startDate, endDate, limit, fetchImpl });
  }
  const error = new Error(`暂不支持该K线数据源：${provider}`);
  error.statusCode = 400;
  throw error;
}

async function fetchAkshareKlines({ market, symbol, timeframe, adjustmentMode, startDate, endDate, env }) {
  assertMarketProvider("akshare", market?.key);
  if (timeframe?.key !== "1d") {
    const error = new Error(`AKShare 当前仅接入 A股日线缓存，不支持周期：${timeframe?.key || ""}`);
    error.statusCode = 400;
    throw error;
  }

  const safeSymbol = String(symbol || "").trim();
  if (!/^\d{6}$/.test(safeSymbol)) {
    const error = new Error(`AKShare A股 symbol 必须是 6 位代码：${symbol}`);
    error.statusCode = 400;
    throw error;
  }

  return fetchPythonDailyKlines({
    provider: "akshare",
    source: "akshare",
    safeSymbol,
    timeframeKey: timeframe?.key,
    startDate,
    endDate,
    adjustmentMode,
    env,
    runScript: runAkshareDailyScript
  });
}

async function fetchBaostockKlines({ market, symbol, timeframe, adjustmentMode, startDate, endDate, env }) {
  assertMarketProvider("baostock", market?.key);
  if (!["1d", "30m", "60m"].includes(timeframe?.key)) {
    const error = new Error(`BaoStock 当前仅接入 A股日线/30分钟/60分钟缓存，不支持周期：${timeframe?.key || ""}`);
    error.statusCode = 400;
    throw error;
  }

  const safeSymbol = String(symbol || "").trim();
  if (!/^\d{6}$/.test(safeSymbol)) {
    const error = new Error(`BaoStock A股 symbol 必须是 6 位代码：${symbol}`);
    error.statusCode = 400;
    throw error;
  }

  return fetchPythonDailyKlines({
    provider: "baostock",
    source: "baostock",
    safeSymbol,
    timeframeKey: timeframe?.key,
    startDate,
    endDate,
    adjustmentMode,
    env,
    runScript: runBaostockDailyScript
  });
}

async function fetchPythonDailyKlines({ provider, source, safeSymbol, timeframeKey, startDate, endDate, adjustmentMode, env, runScript }) {
  const retryOptions = getRetryOptions(env, provider);
  let lastError = null;

  for (let attempt = 1; attempt <= retryOptions.maxRetries; attempt += 1) {
    try {
      const payload = await runScript({
        symbols: [safeSymbol],
        timeframeKey,
        startDate,
        endDate,
        adjustmentMode,
        env,
        requestTimeoutMs: retryOptions.requestTimeoutMs
      });
      const symbolPayload = payload?.symbols?.[safeSymbol];
      const symbolError = Array.isArray(payload?.errors)
        ? payload.errors.find((item) => String(item?.symbol || "") === safeSymbol || String(item?.symbol || "") === "*")
        : null;

      if (symbolError) {
        const error = new Error(`${PROVIDER_LABELS[provider] || provider} ${safeSymbol} 获取失败：${symbolError.message || "unknown error"}`);
        error.statusCode = 502;
        throw error;
      }

      const candles = Array.isArray(symbolPayload?.candles) ? symbolPayload.candles : [];
      if (!candles.length) {
        const error = new Error(`${PROVIDER_LABELS[provider] || provider} 未返回可用K线：${safeSymbol}`);
        error.statusCode = 502;
        throw error;
      }

      return {
        provider,
        source,
        candles: candles.map(normalizeGenericProviderCandle)
      };
    } catch (error) {
      lastError = error;
      if (attempt >= retryOptions.maxRetries || !isRetryableProviderError(error)) break;
      await sleep(retryOptions.retryDelayMs + randomJitter(retryOptions.jitterMs));
    }
  }

  throw lastError;
}

async function fetchTushareKlines({ market, symbol, timeframe, adjustmentMode, startDate, endDate, limit, fetchImpl }) {
  assertMarketProvider("tushare", market?.key);
  const token = process.env.TUSHARE_TOKEN || "";
  if (!token) throwProviderConfigError("TUSHARE_TOKEN", "Tushare Pro");

  const apiName = resolveTushareApiName(market.key, timeframe.key);
  const tsCode = normalizeTushareSymbol(market.key, symbol);
  const params = {
    ts_code: tsCode,
    start_date: normalizeProviderDate(startDate),
    end_date: normalizeProviderDate(endDate),
    limit: Number(limit || 1000)
  };
  if (timeframe.minutes) {
    params.freq = timeframe.key === "10m" ? "5min" : `${timeframe.minutes}min`;
  }
  if (adjustmentMode && adjustmentMode !== "none") {
    params.adj = adjustmentMode;
  }

  const response = await postJson(fetchImpl, process.env.TUSHARE_ENDPOINT || TUSHARE_ENDPOINT, {
    api_name: apiName,
    token,
    params: pruneEmpty(params),
    fields: TUSHARE_FIELDS
  });

  const items = normalizeTushareItems(response);
  return {
    provider: "tushare",
    source: `${PROVIDER_LABELS.tushare}:${apiName}`,
    candles: items.map((item) => ({
      date: item.trade_time || item.trade_date || item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.vol ?? item.volume,
      amount: item.amount,
      pct_chg: item.pct_chg
    }))
  };
}

function runAkshareDailyScript({ symbols, startDate, endDate, adjustmentMode, env, requestTimeoutMs }) {
  const pythonBin = env?.AKSHARE_PYTHON_BIN || process.env.AKSHARE_PYTHON_BIN || "python3";
  const scriptPath = env?.AKSHARE_SCRIPT_PATH || process.env.AKSHARE_SCRIPT_PATH || AKSHARE_SCRIPT_PATH;
  return runPythonProviderScript({
    provider: "akshare",
    pythonBin,
    scriptPath,
    args: [
      scriptPath,
      "--symbols",
      symbols.join(","),
      "--start-date",
      normalizeProviderDate(startDate),
      "--end-date",
      normalizeProviderDate(endDate),
      "--adjust",
      normalizeAkshareAdjust(adjustmentMode),
      "--timeout",
      String(Math.max(Number(requestTimeoutMs || 15000), 1))
    ],
    env,
    requestTimeoutMs,
    noProxy: isTruthy(env?.AKSHARE_NO_PROXY || process.env.AKSHARE_NO_PROXY)
  });
}

function runBaostockDailyScript({ symbols, timeframeKey = "1d", startDate, endDate, adjustmentMode, env, requestTimeoutMs }) {
  const pythonBin = env?.BAOSTOCK_PYTHON_BIN || process.env.BAOSTOCK_PYTHON_BIN || env?.AKSHARE_PYTHON_BIN || process.env.AKSHARE_PYTHON_BIN || "python3";
  const scriptPath = env?.BAOSTOCK_SCRIPT_PATH || process.env.BAOSTOCK_SCRIPT_PATH || BAOSTOCK_SCRIPT_PATH;
  return runPythonProviderScript({
    provider: "baostock",
    pythonBin,
    scriptPath,
    args: [
      scriptPath,
      "--symbols",
      symbols.join(","),
      "--start-date",
      normalizeProviderDate(startDate),
      "--end-date",
      normalizeProviderDate(endDate),
      "--adjust",
      normalizeAkshareAdjust(adjustmentMode),
      "--frequency",
      String(resolveBaostockFrequency(timeframeKey)),
      "--timeout",
      String(Math.max(Number(requestTimeoutMs || 15000), 1))
    ],
    env,
    requestTimeoutMs,
    noProxy: isTruthy(env?.BAOSTOCK_NO_PROXY || process.env.BAOSTOCK_NO_PROXY)
  });
}

function resolveBaostockFrequency(timeframeKey = "1d") {
  if (timeframeKey === "30m") return "30";
  if (timeframeKey === "60m") return "60";
  return "d";
}

function runPythonProviderScript({ provider, pythonBin, scriptPath, args, env, requestTimeoutMs, noProxy }) {
  return new Promise((resolve, reject) => {
    const childEnv = buildPythonProviderEnv(env, noProxy);
    const child = spawn(pythonBin, args, {
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeoutMs = Math.max(Number(requestTimeoutMs || 15000), 1);
    const timer = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`${PROVIDER_LABELS[provider] || provider} Python 请求超时：${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`${PROVIDER_LABELS[provider] || provider} Python 启动失败：${error.message}。请确认已安装 python3 和对应 provider 依赖。`));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`${PROVIDER_LABELS[provider] || provider} Python 脚本退出 ${code}：${stderr || stdout || "请确认 provider 依赖已安装。"}`));
        return;
      }
      try {
        const payload = JSON.parse(stdout);
        if (!payload || typeof payload !== "object") throw new Error("stdout 不是 JSON object");
        resolve(payload);
      } catch (error) {
        reject(new Error(`${PROVIDER_LABELS[provider] || provider} Python 输出解析失败：${error.message}`));
      }
    });
  });
}

function buildPythonProviderEnv(env = {}, noProxy = false) {
  const childEnv = { ...process.env, ...env };
  if (noProxy) {
    delete childEnv.HTTP_PROXY;
    delete childEnv.HTTPS_PROXY;
    delete childEnv.http_proxy;
    delete childEnv.https_proxy;
    childEnv.NO_PROXY = "*";
    childEnv.no_proxy = "*";
  }
  return childEnv;
}

function getRetryOptions(env = {}, provider = "akshare") {
  const prefix = provider === "baostock" ? "BAOSTOCK" : "AKSHARE";
  return {
    maxRetries: positiveInt(env?.[`${prefix}_MAX_RETRIES`] ?? process.env[`${prefix}_MAX_RETRIES`], 3),
    retryDelayMs: positiveInt(env?.[`${prefix}_RETRY_DELAY_MS`] ?? process.env[`${prefix}_RETRY_DELAY_MS`], 1200),
    jitterMs: positiveInt(env?.[`${prefix}_JITTER_MS`] ?? process.env[`${prefix}_JITTER_MS`], 500),
    requestTimeoutMs: positiveInt(env?.[`${prefix}_REQUEST_TIMEOUT_MS`] ?? process.env[`${prefix}_REQUEST_TIMEOUT_MS`], 15000)
  };
}

function isRetryableProviderError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return [
    "remotedisconnected",
    "remote end closed",
    "timeout",
    "timed out",
    "econnreset",
    "connection reset",
    "http 5",
    " 5",
    "502",
    "503",
    "504"
  ].some((token) => message.includes(token));
}

function sleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function randomJitter(ms) {
  return ms > 0 ? Math.floor(Math.random() * (ms + 1)) : 0;
}

function positiveInt(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.trunc(numberValue) : fallback;
}

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

async function fetchFutuKlines({ market, symbol, timeframe, adjustmentMode, startDate, endDate, limit, fetchImpl }) {
  const bridgeUrl = process.env.FUTU_OPENAPI_BRIDGE_URL || "";
  if (!bridgeUrl) throwProviderConfigError("FUTU_OPENAPI_BRIDGE_URL", "Futu OpenAPI Bridge");
  const url = new URL("/history-kline", bridgeUrl.endsWith("/") ? bridgeUrl : `${bridgeUrl}/`);
  const response = await postJson(fetchImpl, url.toString(), {
    market: market.key,
    symbol,
    timeframe: timeframe.key,
    adjustment_mode: adjustmentMode,
    start_date: startDate,
    end_date: endDate,
    limit: Number(limit || 1000)
  });
  const candles = Array.isArray(response?.candles) ? response.candles : Array.isArray(response?.data) ? response.data : [];
  return {
    provider: "futu",
    source: `${PROVIDER_LABELS.futu}:${response?.source || "history-kline"}`,
    name: response?.name || "",
    candles: candles.map(normalizeGenericProviderCandle)
  };
}

async function fetchOkxKlines({ market, symbol, timeframe, startDate, endDate, limit, fetchImpl }) {
  if (market?.key !== "crypto") {
    const error = new Error("OKX 当前仅用于数字货币历史K线。");
    error.statusCode = 400;
    throw error;
  }
  const bar = OKX_BAR_MAP[timeframe.key];
  if (!bar) {
    const error = new Error(`OKX 暂不支持该周期：${timeframe.key}`);
    error.statusCode = 400;
    throw error;
  }
  const requestUrl = new URL("/api/v5/market/history-candles", process.env.OKX_ENDPOINT || OKX_ENDPOINT);
  requestUrl.searchParams.set("instId", symbol || "BTC-USDT");
  requestUrl.searchParams.set("bar", bar);
  requestUrl.searchParams.set("limit", String(Math.min(Math.max(Number(limit || 100), 1), 100)));
  const after = dateToEpochMs(startDate);
  const before = dateToEpochMs(endDate);
  if (after) requestUrl.searchParams.set("after", String(after));
  if (before) requestUrl.searchParams.set("before", String(before));

  const response = await getJson(fetchImpl, requestUrl.toString());
  const rows = Array.isArray(response?.data) ? response.data : [];
  return {
    provider: "okx",
    source: `${PROVIDER_LABELS.okx}:history-candles:${bar}`,
    candles: rows.map((row) => ({
      date: formatEpochMs(row[0]),
      open: row[1],
      high: row[2],
      low: row[3],
      close: row[4],
      volume: row[5],
      amount: row[7] || row[6],
      pct_chg: null
    }))
  };
}

function resolveTushareApiName(marketKey, timeframeKey) {
  if (timeframeKey === "1d") return TUSHARE_DAILY_APIS[marketKey];
  if (timeframeKey === "1w") return marketKey === "cn_equity" ? "weekly" : TUSHARE_DAILY_APIS[marketKey];
  if (timeframeKey === "1mo") return marketKey === "cn_equity" ? "monthly" : TUSHARE_DAILY_APIS[marketKey];
  if (["5m", "10m", "30m", "60m"].includes(timeframeKey)) return TUSHARE_MINUTE_APIS[marketKey];
  const error = new Error(`Tushare 暂不支持该周期：${timeframeKey}`);
  error.statusCode = 400;
  throw error;
}

function normalizeTushareSymbol(marketKey, symbol = "") {
  const raw = String(symbol || "").trim();
  if (marketKey !== "cn_equity" || !/^\d{6}$/.test(raw)) return raw;
  if (/^(6|9)/.test(raw)) return `${raw}.SH`;
  if (/^(0|2|3)/.test(raw)) return `${raw}.SZ`;
  if (/^(4|8)/.test(raw)) return `${raw}.BJ`;
  return raw;
}

function assertMarketProvider(provider, marketKey) {
  const meta = listKlineProviders().find((item) => item.key === provider);
  if (!meta?.markets.includes(marketKey)) {
    const error = new Error(`${meta?.label || provider} 暂不支持该市场：${marketKey}`);
    error.statusCode = 400;
    throw error;
  }
}

async function postJson(fetchImpl, url, body) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseProviderResponse(response);
}

async function getJson(fetchImpl, url) {
  const response = await fetchImpl(url, { method: "GET" });
  return parseProviderResponse(response);
}

async function parseProviderResponse(response) {
  if (!response || typeof response.json !== "function") {
    const error = new Error("数据源请求失败：fetch 不可用");
    error.statusCode = 502;
    throw error;
  }
  const payload = await response.json();
  if (response.ok === false) {
    const error = new Error(payload?.msg || payload?.error || `数据源请求失败：${response.status}`);
    error.statusCode = 502;
    throw error;
  }
  if (payload?.code && String(payload.code) !== "0" && !payload?.data?.items) {
    const error = new Error(payload.msg || payload.message || `数据源返回异常：${payload.code}`);
    error.statusCode = 502;
    throw error;
  }
  return payload;
}

function normalizeTushareItems(response) {
  const fields = response?.data?.fields || [];
  const items = response?.data?.items || [];
  if (!Array.isArray(fields) || !Array.isArray(items)) return [];
  return items.map((row) => fields.reduce((item, field, index) => {
    item[field] = row[index];
    return item;
  }, {}));
}

function normalizeGenericProviderCandle(item = {}) {
  return {
    date: item.date || item.time || item.datetime || item.timestamp || item.ts,
    code: item.code || item.symbol,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume || item.vol,
    amount: item.amount || item.turnover,
    pct_chg: item.pct_chg ?? item.pctChg ?? item.change_pct ?? null,
    amplitude: item.amplitude,
    turnover: item.turnover ?? item.turnover_rate
  };
}

function pruneEmpty(params) {
  return Object.keys(params).reduce((next, key) => {
    if (params[key] !== "" && params[key] !== null && params[key] !== undefined) next[key] = params[key];
    return next;
  }, {});
}

function normalizeProviderDate(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(0, 8) : "";
}

function normalizeAkshareAdjust(value = "") {
  const key = String(value || "").trim().toLowerCase();
  return key === "qfq" || key === "hfq" ? key : "none";
}

function dateToEpochMs(value = "") {
  const normalized = normalizeProviderDate(value);
  if (!normalized) return 0;
  const date = new Date(Date.UTC(Number(normalized.slice(0, 4)), Number(normalized.slice(4, 6)) - 1, Number(normalized.slice(6, 8))));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatEpochMs(value) {
  const date = new Date(Number(value || 0));
  if (Number.isNaN(date.getTime())) return String(value || "");
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:00`;
}

function throwProviderConfigError(envName, providerName) {
  const error = new Error(`${providerName} 未配置 ${envName}，无法下载真实历史K线。`);
  error.statusCode = 400;
  throw error;
}
