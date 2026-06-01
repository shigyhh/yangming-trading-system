const PROVIDER_LABELS = {
  tushare: "Tushare Pro",
  futu: "Futu OpenAPI Bridge",
  okx: "OKX"
};

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
  fetchImpl = globalThis.fetch
} = {}) {
  const key = String(provider || resolveDefaultProvider(market?.key)).trim().toLowerCase();
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
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume || item.vol,
    amount: item.amount || item.turnover,
    pct_chg: item.pct_chg ?? item.pctChg ?? item.change_pct ?? null
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
