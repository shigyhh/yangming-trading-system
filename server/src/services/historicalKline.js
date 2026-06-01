import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { readJsonFile } from "../lib/store.js";

const COMPLIANCE_TEXT = "本数据仅用于交易心理训练、行为觉察与复盘教育；不构成投资建议。";
const DEFAULT_MARKET = "cn_equity";
const DEFAULT_TIMEFRAME = "1d";
const DEFAULT_WINDOW_SIZE = 96;
const MIN_WINDOW_SIZE = 12;
const MAX_WINDOW_SIZE = 240;
const SLICE_TOKEN_VERSION = "kline_slice_v1";

const TIMEFRAMES = [
  { key: "5m", label: "5分钟", granularity: "intraday", minutes: 5 },
  { key: "10m", label: "10分钟", granularity: "intraday", minutes: 10 },
  { key: "30m", label: "30分钟", granularity: "intraday", minutes: 30 },
  { key: "60m", label: "60分钟", granularity: "intraday", minutes: 60 },
  { key: "1d", label: "日线", granularity: "daily" },
  { key: "1w", label: "周线", granularity: "weekly" },
  { key: "1mo", label: "月线", granularity: "monthly" },
  { key: "1y", label: "年线", granularity: "yearly" }
];

const TIMEFRAME_ALIASES = new Map([
  ["5", "5m"],
  ["m5", "5m"],
  ["5min", "5m"],
  ["5分钟", "5m"],
  ["10", "10m"],
  ["m10", "10m"],
  ["10min", "10m"],
  ["10分钟", "10m"],
  ["30", "30m"],
  ["m30", "30m"],
  ["30min", "30m"],
  ["30分钟", "30m"],
  ["60", "60m"],
  ["m60", "60m"],
  ["60min", "60m"],
  ["60分钟", "60m"],
  ["101", "1d"],
  ["day", "1d"],
  ["daily", "1d"],
  ["d", "1d"],
  ["日", "1d"],
  ["日线", "1d"],
  ["102", "1w"],
  ["week", "1w"],
  ["weekly", "1w"],
  ["w", "1w"],
  ["周", "1w"],
  ["周线", "1w"],
  ["103", "1mo"],
  ["month", "1mo"],
  ["monthly", "1mo"],
  ["mon", "1mo"],
  ["月", "1mo"],
  ["月线", "1mo"],
  ["year", "1y"],
  ["yearly", "1y"],
  ["y", "1y"],
  ["年", "1y"],
  ["年线", "1y"]
]);

const ASHARE_KLT_BY_TIMEFRAME = {
  "30m": "30",
  "60m": "60",
  "1d": "101",
  "1w": "102",
  "1mo": "103"
};

const MARKETS = {
  cn_equity: {
    key: "cn_equity",
    aliases: ["a", "ashare", "a_share", "cn", "A股", "沪深"],
    label: "A股",
    dataDir: "ashare",
    defaultTimeframe: "1d",
    timeframes: TIMEFRAMES.map((item) => item.key),
    ruleKey: "cn_equity"
  },
  hk_equity: {
    key: "hk_equity",
    aliases: ["hk", "hkg", "港股"],
    label: "港股",
    dataDir: "hk_equity",
    defaultTimeframe: "1d",
    timeframes: TIMEFRAMES.map((item) => item.key),
    ruleKey: "hk_equity"
  },
  us_equity: {
    key: "us_equity",
    aliases: ["us", "usa", "美股"],
    label: "美股",
    dataDir: "us_equity",
    defaultTimeframe: "1d",
    timeframes: TIMEFRAMES.map((item) => item.key),
    ruleKey: "us_equity"
  },
  futures: {
    key: "futures",
    aliases: ["future", "期货"],
    label: "期货",
    dataDir: "futures",
    defaultTimeframe: "1d",
    timeframes: TIMEFRAMES.map((item) => item.key),
    ruleKey: "futures"
  },
  crypto: {
    key: "crypto",
    aliases: ["coin", "digital", "数字货币", "加密"],
    label: "数字货币",
    dataDir: "crypto",
    defaultTimeframe: "1d",
    timeframes: TIMEFRAMES.map((item) => item.key),
    ruleKey: "crypto"
  }
};

const MARKET_RULES = {
  cn_equity: {
    settlement: "T+1",
    lotSize: 100,
    session: "交易日分上午与下午两个连续时段。",
    boundaryNotes: ["当日新开仓位通常不能在同日了结。", "训练时重点观察边界触碰后的第一念。"],
    dataUse: COMPLIANCE_TEXT
  },
  hk_equity: {
    settlement: "T+0",
    lotSize: "按标的规则变化",
    session: "交易日含早盘、午盘与收市竞价时段。",
    boundaryNotes: ["同日内流动更快，训练时更要先照见急躁。", "手数规则需要按标的资料核对。"],
    dataUse: COMPLIANCE_TEXT
  },
  us_equity: {
    settlement: "T+0",
    lotSize: 1,
    session: "常规时段之外可能存在盘前与盘后数据。",
    boundaryNotes: ["隔夜跳空与延长时段会放大情绪反应。", "训练只记录念头和边界，不评判结果。"],
    dataUse: COMPLIANCE_TEXT
  },
  futures: {
    settlement: "T+0",
    lotSize: "按合约规则变化",
    session: "不同品种存在日盘、夜盘与合约换月差异。",
    boundaryNotes: ["合约规则、保证金与换月信息需要随数据源同步。", "训练时重点观察冲动、恐惧与仓位边界。"],
    dataUse: COMPLIANCE_TEXT
  },
  crypto: {
    settlement: "7x24",
    lotSize: "按交易场所规则变化",
    session: "连续运行，周末与深夜也会出现波动。",
    boundaryNotes: ["没有自然收盘会考验停手能力。", "训练时重点记录情绪边界和时间边界。"],
    dataUse: COMPLIANCE_TEXT
  }
};

const ADJUSTMENT_MODES = [
  {
    key: "none",
    label: "不复权",
    description: "按原始历史缓存读取，适合观察当时价格形态。"
  },
  {
    key: "forward",
    label: "前复权",
    description: "用于连续观察历史形态；需要数据源提供复权因子。"
  },
  {
    key: "backward",
    label: "后复权",
    description: "用于长期回看连续性；需要数据源提供复权因子。"
  },
  {
    key: "dynamic_forward",
    label: "动态前复权",
    description: "用于按观察日还原相对结构；需要数据源提供动态因子。"
  }
];

const TRAINING_MODES = {
  step_replay: {
    key: "step_replay",
    label: "逐根观心",
    prompt: "一根一根看见波动，不急着解释，先记录第一念。"
  },
  firecracker: {
    key: "firecracker",
    label: "爆竹K线",
    prompt: "在突然放大的波动处停十秒，照见冲动、恐惧与证明欲。"
  },
  boundary: {
    key: "boundary",
    label: "守界盲练",
    prompt: "当边界被触碰时，先写下理由、边界与复盘依据。"
  },
  personality: {
    key: "personality",
    label: "人格处方",
    prompt: "按你的主反应人格，练一个最小、可复盘的动作。"
  },
  gate: {
    key: "gate",
    label: "关口映射",
    prompt: "把K线波动映射到今日关口，只练一个真实动作。"
  }
};

const GATE_PRACTICES = {
  li_zhi: {
    key: "li_zhi",
    label: "立志",
    focus: "先立今日边界",
    action: "开始前写下一条不可越过的边界。"
  },
  zhao_xin: {
    key: "zhao_xin",
    label: "照心",
    focus: "先看第一念",
    action: "波动出现时，先记录此刻的念头与情绪。"
  },
  shi_shang_mo: {
    key: "shi_shang_mo",
    label: "事上磨",
    focus: "在触发处练",
    action: "最想立刻行动时，停十秒再回到计划。"
  },
  po_xin_zei: {
    key: "po_xin_zei",
    label: "破心贼",
    focus: "破证明与不甘",
    action: "写下此刻想证明什么，再判断是否偏离计划。"
  },
  zhi_xing_he_yi: {
    key: "zhi_xing_he_yi",
    label: "知行合一",
    focus: "知到处能做到",
    action: "边界出现时，只复核计划，不临时改写理由。"
  },
  zhi_liang_zhi: {
    key: "zhi_liang_zhi",
    label: "致良知",
    focus: "回到清明判断",
    action: "收盘后复盘：哪一刻最接近清明，哪一刻被情绪带走。"
  }
};

const PERSONALITY_PRACTICES = {
  "焦虑型": {
    label: "焦虑型",
    focus: "临界前稳定",
    action: "先做三息照心，再写下最怕发生的事。"
  },
  "冲动型": {
    label: "冲动型",
    focus: "入场前停十秒",
    action: "看到快速波动时，先停十秒并写下一念。"
  },
  "扛单型": {
    label: "扛单型",
    focus: "边界触碰即记录",
    action: "边界被触碰时，只记录事实，不重新解释。"
  },
  "证明型": {
    label: "证明型",
    focus: "亏损后不急于证明",
    action: "先写下想夺回什么，再进入复盘。"
  },
  "完美型": {
    label: "完美型",
    focus: "允许小步验证",
    action: "先记录条件是否足够，不等待绝对确定。"
  },
  "完美主义型": {
    label: "完美型",
    focus: "允许小步验证",
    action: "先记录条件是否足够，不等待绝对确定。"
  },
  "赌徒型": {
    label: "赌徒型",
    focus: "仓位边界",
    action: "行动前问一句：这是计划，还是想翻回情绪？"
  },
  "从众型": {
    label: "从众型",
    focus: "独立照见",
    action: "先写自己的依据，再看外界声音。"
  },
  "偏执型": {
    label: "偏执型",
    focus: "反证练习",
    action: "先找一个相反证据，再写下复盘依据。"
  },
  "拖延型": {
    label: "拖延型",
    focus: "条件触发后的执行",
    action: "条件出现时，只做一个最小确认动作。"
  },
  "平衡型": {
    label: "平衡型",
    focus: "系统节奏",
    action: "保持原有节奏，减少多余解释与多余动作。"
  }
};

const DEFAULT_STOCK_POOL = [
  { code: "600519", name: "贵州茅台", secid: "1.600519" },
  { code: "300750", name: "宁德时代", secid: "0.300750" },
  { code: "002594", name: "比亚迪", secid: "0.002594" },
  { code: "600036", name: "招商银行", secid: "1.600036" },
  { code: "600030", name: "中信证券", secid: "1.600030" },
  { code: "000002", name: "万科A", secid: "0.000002" }
];

export function listHistoricalKlineCatalog() {
  return {
    markets: Object.values(MARKETS).map((market) => ({
      key: market.key,
      label: market.label,
      default_timeframe: market.defaultTimeframe,
      timeframes: market.timeframes,
      rules: MARKET_RULES[market.ruleKey]
    })),
    timeframes: TIMEFRAMES,
    adjustment_modes: ADJUSTMENT_MODES,
    training_modes: Object.values(TRAINING_MODES),
    gates: Object.values(GATE_PRACTICES),
    personality_prescriptions: Object.values(PERSONALITY_PRACTICES),
    storage_contract: {
      root: "server/data/market",
      instrument_file: "server/data/market/{market}/instruments.json",
      kline_file: "server/data/market/{market}/{timeframe}/{symbol}.json",
      ashare_legacy_file: "server/data/market/ashare/{klt}/{code}.json"
    },
    compliance: COMPLIANCE_TEXT
  };
}

export async function listHistoricalKlineInstruments({
  marketKey = DEFAULT_MARKET,
  timeframeKey = DEFAULT_TIMEFRAME,
  limit = 50
} = {}) {
  const market = getMarket(marketKey);
  const timeframe = getTimeframe(timeframeKey || market.defaultTimeframe);
  const instruments = await loadInstrumentList(market);
  const safeLimit = clamp(Number(limit || 50), 1, 500);
  const rows = [];

  for (const instrument of instruments) {
    const availability = await getInstrumentAvailability(market, instrument.symbol, timeframe.key);
    rows.push({
      ...instrument,
      market_key: market.key,
      timeframe_key: timeframe.key,
      data_ready: availability.ready,
      source: availability.source,
      candle_count: availability.candleCount
    });
    if (rows.length >= safeLimit) break;
  }

  return {
    market: toPublicMarket(market),
    timeframe,
    total: rows.length,
    instruments: rows,
    compliance: COMPLIANCE_TEXT
  };
}

export function getHistoricalKlineRules({ marketKey = DEFAULT_MARKET } = {}) {
  const market = getMarket(marketKey);
  return {
    market: toPublicMarket(market),
    rules: MARKET_RULES[market.ruleKey],
    compliance: COMPLIANCE_TEXT
  };
}

export async function buildHistoricalKlineSlice({
  marketKey = DEFAULT_MARKET,
  symbol = "",
  timeframeKey = DEFAULT_TIMEFRAME,
  adjustmentMode = "none",
  windowSize = DEFAULT_WINDOW_SIZE,
  mode = "step_replay",
  personalityType = "",
  gateKey = "",
  blind = true,
  seed = "",
  startDate = "",
  endDate = ""
} = {}) {
  const market = getMarket(marketKey);
  const timeframe = getTimeframe(timeframeKey || market.defaultTimeframe);
  const adjustment = getAdjustmentMode(adjustmentMode);
  const trainingMode = getTrainingMode(mode);
  const gate = getGatePractice(gateKey);
  const personality = getPersonalityPractice(personalityType);
  const instruments = await loadInstrumentList(market);
  const instrument = await resolveInstrument({ market, symbol, instruments, timeframeKey: timeframe.key, seed });
  const dataset = await loadKlineDataset({ market, symbol: instrument.symbol, timeframeKey: timeframe.key, adjustmentMode: adjustment.key });
  const candles = filterCandlesByDate(dataset.candles, { startDate, endDate });
  const safeWindowSize = clamp(Number(windowSize || DEFAULT_WINDOW_SIZE), MIN_WINDOW_SIZE, MAX_WINDOW_SIZE);

  if (candles.length < safeWindowSize) {
    const error = new Error(`真实历史K线数量不足：${market.label} ${timeframe.label} ${instrument.symbol}`);
    error.statusCode = 404;
    error.details = {
      market_key: market.key,
      timeframe_key: timeframe.key,
      symbol: instrument.symbol,
      available_count: candles.length,
      required_count: safeWindowSize
    };
    throw error;
  }

  const rng = createSeededRng([market.key, instrument.symbol, timeframe.key, trainingMode.key, personality?.label || "", gate?.key || "", seed || ""].join(":"));
  const startIndex = chooseSliceStartIndex(candles, {
    windowSize: safeWindowSize,
    mode: trainingMode.key,
    personality,
    gate,
    rng
  });
  const segment = candles.slice(startIndex, startIndex + safeWindowSize);
  const sliceId = buildSliceId({
    marketKey: market.key,
    symbol: instrument.symbol,
    timeframeKey: timeframe.key,
    adjustmentMode: adjustment.key,
    startIndex,
    windowSize: safeWindowSize,
    mode: trainingMode.key
  });
  const descriptor = {
    version: SLICE_TOKEN_VERSION,
    slice_id: sliceId,
    market_key: market.key,
    market_label: market.label,
    symbol: instrument.symbol,
    name: instrument.name,
    timeframe_key: timeframe.key,
    timeframe_label: timeframe.label,
    adjustment_mode: adjustment.key,
    data_start: segment[0]?.date || "",
    data_end: segment.at(-1)?.date || "",
    source: dataset.source,
    generated_at: new Date().toISOString()
  };
  const blindBasePrice = segment[0]?.close || segment[0]?.open || 1;
  const blindVolumeBase = average(segment.map((item) => Number(item.volume || 0)).filter((value) => value > 0)) || 1;

  return {
    slice: {
      id: sliceId,
      blind: Boolean(blind),
      market: toPublicMarket(market),
      timeframe,
      adjustment: {
        ...adjustment,
        applied: dataset.adjustmentApplied
      },
      instrument: Boolean(blind)
        ? {
            label: "历史片段",
            masked: true
          }
        : {
            symbol: instrument.symbol,
            name: instrument.name,
            label: instrument.name ? `${instrument.name} ${instrument.symbol}` : instrument.symbol,
            masked: false
          },
      price_mode: Boolean(blind) ? "relative_blind" : "raw",
      candles: segment.map((item, index) => toPublicCandle(item, index, {
        blind,
        basePrice: blindBasePrice,
        volumeBase: blindVolumeBase
      })),
      visible_count: segment.length,
      data_range: Boolean(blind)
        ? {
            masked: true,
            label: "完成练习后再揭晓"
          }
        : {
            start: segment[0]?.date || "",
            end: segment.at(-1)?.date || "",
            masked: false
          },
      source: dataset.source,
      rules: MARKET_RULES[market.ruleKey],
      training: buildTrainingBrief({
        trainingMode,
        personality,
        gate,
        market,
        timeframe
      }),
      reveal_token: Boolean(blind) ? encodeSliceToken(descriptor) : "",
      reveal: Boolean(blind) ? null : descriptor,
      compliance: COMPLIANCE_TEXT
    }
  };
}

export function revealHistoricalKlineSlice(token = "") {
  const descriptor = decodeSliceToken(token);
  if (descriptor.version !== SLICE_TOKEN_VERSION || !descriptor.slice_id) {
    const error = new Error("盲练片段凭证无效");
    error.statusCode = 400;
    throw error;
  }
  return {
    reveal: descriptor,
    compliance: COMPLIANCE_TEXT
  };
}

function getMarket(value = DEFAULT_MARKET) {
  const raw = String(value || DEFAULT_MARKET).trim();
  const lower = raw.toLowerCase();
  const market = Object.values(MARKETS).find((item) => item.key === lower || item.aliases.some((alias) => alias.toLowerCase() === lower || alias === raw));
  if (market) return market;
  const error = new Error(`暂不支持该市场：${raw}`);
  error.statusCode = 400;
  throw error;
}

function getTimeframe(value = DEFAULT_TIMEFRAME) {
  const raw = String(value || DEFAULT_TIMEFRAME).trim();
  const lower = raw.toLowerCase();
  const key = TIMEFRAME_ALIASES.get(lower) || TIMEFRAME_ALIASES.get(raw) || lower;
  const timeframe = TIMEFRAMES.find((item) => item.key === key);
  if (timeframe) return timeframe;
  const error = new Error(`暂不支持该周期：${raw}`);
  error.statusCode = 400;
  throw error;
}

function getAdjustmentMode(value = "none") {
  const raw = String(value || "none").trim().toLowerCase();
  const alias = { "0": "none", nfq: "none", qfq: "forward", "1": "forward", hfq: "backward", "2": "backward", dynamic: "dynamic_forward" };
  const key = alias[raw] || raw;
  const mode = ADJUSTMENT_MODES.find((item) => item.key === key);
  if (mode) return mode;
  const error = new Error(`暂不支持该复权方式：${value}`);
  error.statusCode = 400;
  throw error;
}

function getTrainingMode(value = "step_replay") {
  const key = String(value || "step_replay").trim().toLowerCase();
  return TRAINING_MODES[key] || TRAINING_MODES.step_replay;
}

function getGatePractice(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return GATE_PRACTICES.zhao_xin;
  const lower = raw.toLowerCase();
  return Object.values(GATE_PRACTICES).find((item) => item.key === lower || item.label === raw) || GATE_PRACTICES.zhao_xin;
}

function getPersonalityPractice(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return PERSONALITY_PRACTICES["平衡型"];
  return PERSONALITY_PRACTICES[raw] || PERSONALITY_PRACTICES["平衡型"];
}

function toPublicMarket(market) {
  return {
    key: market.key,
    label: market.label,
    default_timeframe: market.defaultTimeframe,
    timeframes: market.timeframes
  };
}

async function loadInstrumentList(market) {
  if (market.key === "cn_equity") return loadAshareInstruments();
  const file = path.join(config.marketDataDir, market.dataDir, "instruments.json");
  const payload = await readJsonFile(file, null);
  const rows = Array.isArray(payload?.instruments) ? payload.instruments : Array.isArray(payload) ? payload : [];
  return rows.map((item) => normalizeInstrument(item)).filter(Boolean);
}

async function loadAshareInstruments() {
  const pool = await readJsonFile(path.join(config.marketDataDir, "stock-pool.json"), null);
  const stocks = Array.isArray(pool?.stocks) ? pool.stocks : DEFAULT_STOCK_POOL;
  const cachedSymbols = await listCachedAshareSymbols();
  const merged = new Map();

  for (const stock of stocks) {
    const instrument = normalizeInstrument({
      symbol: stock.code,
      code: stock.code,
      name: stock.name,
      secid: stock.secid
    });
    if (instrument) merged.set(instrument.symbol, instrument);
  }

  for (const symbol of cachedSymbols) {
    if (!merged.has(symbol)) {
      merged.set(symbol, { symbol, name: "", secid: "", instrument_key: createInstrumentKey(symbol) });
    }
  }

  const cachedSet = new Set(cachedSymbols);
  return Array.from(merged.values()).sort((a, b) => {
    const readyOrder = Number(cachedSet.has(b.symbol)) - Number(cachedSet.has(a.symbol));
    return readyOrder || a.symbol.localeCompare(b.symbol);
  });
}

async function listCachedAshareSymbols() {
  const root = path.join(config.marketDataDir, "ashare");
  const symbols = new Set();
  try {
    const timeframeDirs = await fs.readdir(root, { withFileTypes: true });
    for (const dirent of timeframeDirs) {
      if (!dirent.isDirectory()) continue;
      const files = await fs.readdir(path.join(root, dirent.name), { withFileTypes: true });
      files.forEach((file) => {
        if (file.isFile() && file.name.endsWith(".json")) symbols.add(file.name.replace(/\.json$/, ""));
      });
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return Array.from(symbols);
}

function normalizeInstrument(item) {
  const symbol = String(item?.symbol || item?.code || "").trim();
  if (!symbol) return null;
  const name = String(item?.name || item?.label || "").trim();
  return {
    symbol,
    name,
    secid: String(item?.secid || "").trim(),
    instrument_key: createInstrumentKey(symbol)
  };
}

async function resolveInstrument({ market, symbol, instruments, timeframeKey, seed }) {
  const requested = String(symbol || "").trim();
  if (requested) {
    const found = instruments.find((item) => item.symbol === requested || item.instrument_key === requested);
    return found || { symbol: requested, name: "", secid: "", instrument_key: createInstrumentKey(requested) };
  }

  const ready = [];
  for (const instrument of instruments.slice(0, 800)) {
    const availability = await getInstrumentAvailability(market, instrument.symbol, timeframeKey);
    if (availability.ready) ready.push(instrument);
  }
  const pool = ready.length ? ready : instruments;
  if (!pool.length) {
    const error = new Error(`${market.label} 标的列表为空，请先导入真实历史数据。`);
    error.statusCode = 404;
    throw error;
  }
  const rng = createSeededRng(`${market.key}:${timeframeKey}:${seed || new Date().toISOString().slice(0, 10)}`);
  return pool[Math.floor(rng() * pool.length)];
}

async function getInstrumentAvailability(market, symbol, timeframeKey) {
  try {
    const dataset = await loadKlineDataset({ market, symbol, timeframeKey, adjustmentMode: "none", allowMissing: true });
    return {
      ready: dataset.candles.length > 0,
      source: dataset.source,
      candleCount: dataset.candles.length
    };
  } catch {
    return {
      ready: false,
      source: "",
      candleCount: 0
    };
  }
}

async function loadKlineDataset({ market, symbol, timeframeKey, adjustmentMode = "none", allowMissing = false }) {
  const source = await readKlineCache({ market, symbol, timeframeKey });
  if (!source.candles.length && shouldAggregateFromDaily(timeframeKey)) {
    const daily = await readKlineCache({ market, symbol, timeframeKey: "1d" });
    const aggregated = aggregateCandlesByTimeframe(daily.candles, timeframeKey);
    return {
      candles: normalizeCandles(aggregated),
      source: daily.source ? `${daily.source}:resampled:${timeframeKey}` : `resampled:${timeframeKey}`,
      adjustmentApplied: false
    };
  }

  if (!source.candles.length) {
    if (allowMissing) {
      return { candles: [], source: "", adjustmentApplied: false };
    }
    const error = new Error(`真实历史K线未缓存：${market.label} ${symbol} ${getTimeframe(timeframeKey).label}`);
    error.statusCode = 404;
    error.details = {
      market_key: market.key,
      symbol,
      timeframe_key: timeframeKey,
      expected_files: buildKlineFileCandidates({ market, symbol, timeframeKey }).map((item) => item.relative)
    };
    throw error;
  }

  return {
    candles: normalizeCandles(source.candles),
    source: source.source || "historical_market_cache",
    adjustmentApplied: adjustmentMode !== "none" && Boolean(source.adjustmentApplied)
  };
}

async function readKlineCache({ market, symbol, timeframeKey }) {
  for (const candidate of buildKlineFileCandidates({ market, symbol, timeframeKey })) {
    const payload = await readJsonFile(candidate.filePath, null);
    const candles = Array.isArray(payload?.candles) ? payload.candles : Array.isArray(payload) ? payload : [];
    if (candles.length) {
      return {
        candles,
        source: payload?.source || candidate.source,
        adjustmentApplied: Boolean(payload?.adjustment_applied || payload?.adjustmentApplied)
      };
    }
  }
  return { candles: [], source: "", adjustmentApplied: false };
}

function buildKlineFileCandidates({ market, symbol, timeframeKey }) {
  const candidates = [];
  const safeSymbol = String(symbol || "").trim();
  const generic = path.join(config.marketDataDir, market.dataDir, timeframeKey, `${safeSymbol}.json`);
  candidates.push({
    filePath: generic,
    relative: path.relative(config.serverRoot, generic),
    source: "historical_market_cache"
  });

  if (market.key === "cn_equity") {
    const klt = ASHARE_KLT_BY_TIMEFRAME[timeframeKey];
    if (klt) {
      const legacy = path.join(config.marketDataDir, "ashare", klt, `${safeSymbol}.json`);
      candidates.push({
        filePath: legacy,
        relative: path.relative(config.serverRoot, legacy),
        source: "historical_market_cache"
      });
    }
  }

  return candidates;
}

function shouldAggregateFromDaily(timeframeKey) {
  return ["1w", "1mo", "1y"].includes(timeframeKey);
}

function aggregateCandlesByTimeframe(candles, timeframeKey) {
  if (!shouldAggregateFromDaily(timeframeKey)) return candles;
  const normalized = normalizeCandles(candles);
  const groups = new Map();

  for (const candle of normalized) {
    const key = getAggregateKey(candle.date, timeframeKey);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candle);
  }

  return Array.from(groups.values()).map((group) => mergeCandleGroup(group)).filter(Boolean);
}

function getAggregateKey(dateText, timeframeKey) {
  const date = parseDate(dateText);
  if (!date) return String(dateText || "");
  const year = date.getUTCFullYear();
  if (timeframeKey === "1y") return `${year}`;
  if (timeframeKey === "1mo") return `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const weekStart = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
  const day = weekStart.getUTCDay() || 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - day + 1);
  return `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, "0")}-${String(weekStart.getUTCDate()).padStart(2, "0")}`;
}

function mergeCandleGroup(group) {
  if (!group.length) return null;
  const sorted = [...group].sort((a, b) => compareDateText(a.date, b.date));
  return {
    date: sorted[0].date,
    end_date: sorted.at(-1)?.date || sorted[0].date,
    open: sorted[0].open,
    high: Math.max(...sorted.map((item) => item.high)),
    low: Math.min(...sorted.map((item) => item.low)),
    close: sorted.at(-1).close,
    volume: sorted.reduce((sum, item) => sum + Number(item.volume || 0), 0),
    amount: sorted.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  };
}

function normalizeCandles(candles = []) {
  return candles
    .map((item) => {
      const date = String(item.date || item.time || item.datetime || "").trim();
      const open = Number(item.open);
      const high = Number(item.high);
      const low = Number(item.low);
      const close = Number(item.close);
      if (!date || ![open, high, low, close].every(Number.isFinite)) return null;
      return {
        date,
        end_date: item.end_date || item.endDate || "",
        open,
        high: Math.max(high, low),
        low: Math.min(high, low),
        close,
        volume: finiteNumber(item.volume, 0),
        amount: finiteNumber(item.amount, 0),
        pct_chg: finiteNumber(item.pct_chg ?? item.pctChg ?? item.change_pct, null)
      };
    })
    .filter(Boolean)
    .sort((a, b) => compareDateText(a.date, b.date));
}

function filterCandlesByDate(candles, { startDate = "", endDate = "" } = {}) {
  const start = normalizeDateKey(startDate);
  const end = normalizeDateKey(endDate);
  return candles.filter((item) => {
    const key = normalizeDateKey(item.date);
    if (start && key < start) return false;
    if (end && key > end) return false;
    return true;
  });
}

function chooseSliceStartIndex(candles, { windowSize, mode, personality, gate, rng }) {
  const maxStart = candles.length - windowSize;
  if (maxStart <= 0) return 0;
  const candidateCount = Math.min(maxStart + 1, Math.min(96, Math.max(24, Math.floor(maxStart / 4))));
  const candidates = new Set([0, Math.floor(maxStart / 2), maxStart]);
  while (candidates.size < candidateCount) {
    candidates.add(Math.floor(rng() * (maxStart + 1)));
  }

  return Array.from(candidates)
    .map((startIndex) => ({
      startIndex,
      score: scoreWindow(candles.slice(startIndex, startIndex + windowSize), { mode, personality, gate })
    }))
    .sort((a, b) => b.score - a.score)[0].startIndex;
}

function scoreWindow(segment, { mode, personality, gate }) {
  if (!segment.length) return 0;
  const ranges = segment.map(candleRangePct);
  const bodies = segment.map(candleBodyPct);
  const maxRange = Math.max(...ranges);
  const avgRange = average(ranges);
  const avgBody = average(bodies);
  const alternation = countAlternation(segment) / Math.max(segment.length - 1, 1);
  const volumeSpike = scoreVolumeSpike(segment);
  const tailRange = average(ranges.slice(-Math.min(16, ranges.length)));
  let score = avgRange * 0.8 + avgBody * 0.5 + volumeSpike * 0.8 + alternation * 2;

  if (mode === "firecracker") score += maxRange * 2.8 + tailRange * 1.5 + volumeSpike * 1.5;
  if (mode === "boundary") score += tailRange * 1.4 + alternation * 2.2;
  if (mode === "personality") score += scorePersonalityPattern(segment, personality);
  if (mode === "gate") score += scoreGatePattern(segment, gate);
  return score;
}

function scorePersonalityPattern(segment, personality) {
  const label = personality?.label || "";
  const ranges = segment.map(candleRangePct);
  const bodies = segment.map(candleBodyPct);
  const tailRange = average(ranges.slice(-12));
  const recentMove = Math.abs(percentChange(segment.at(-1)?.close, segment.at(-12)?.close || segment[0]?.close));
  if (label.includes("焦虑")) return tailRange * 2 + countAlternation(segment) * 0.2;
  if (label.includes("冲动")) return Math.max(...bodies) * 2.2 + recentMove * 1.3;
  if (label.includes("扛单")) return drawdownLikeScore(segment) * 2.2 + tailRange;
  if (label.includes("证明")) return recentMove * 1.8 + tailRange * 1.4;
  if (label.includes("完美")) return countAlternation(segment) * 0.25 + tailRange;
  if (label.includes("赌徒")) return Math.max(...ranges) * 2.4 + recentMove;
  if (label.includes("从众")) return Math.max(...bodies) * 1.2 + scoreVolumeSpike(segment) * 1.6;
  if (label.includes("偏执")) return countAlternation(segment) * 0.3 + recentMove * 0.8;
  if (label.includes("拖延")) return tailRange * 1.6 + drawdownLikeScore(segment);
  return average(ranges) + recentMove;
}

function scoreGatePattern(segment, gate) {
  const key = gate?.key || "";
  const ranges = segment.map(candleRangePct);
  const recentMove = Math.abs(percentChange(segment.at(-1)?.close, segment.at(-20)?.close || segment[0]?.close));
  if (key === "li_zhi") return average(ranges) + scoreVolumeSpike(segment);
  if (key === "zhao_xin") return countAlternation(segment) * 0.25 + average(ranges.slice(-18)) * 1.5;
  if (key === "shi_shang_mo") return Math.max(...ranges) * 1.8 + recentMove;
  if (key === "po_xin_zei") return drawdownLikeScore(segment) * 1.8 + recentMove;
  if (key === "zhi_xing_he_yi") return average(ranges.slice(-12)) * 1.8 + scoreVolumeSpike(segment);
  if (key === "zhi_liang_zhi") return average(ranges) + countAlternation(segment) * 0.2;
  return average(ranges);
}

function toPublicCandle(item, index, { blind, basePrice = 1, volumeBase = 1 }) {
  const prices = Boolean(blind)
    ? normalizeBlindPrices(item, basePrice)
    : {
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close
      };
  return {
    index: index + 1,
    time: blind ? index + 1 : item.date,
    label: blind ? `第 ${index + 1} 根` : item.end_date ? `${item.date} ~ ${item.end_date}` : item.date,
    open: roundNumber(prices.open),
    high: roundNumber(prices.high),
    low: roundNumber(prices.low),
    close: roundNumber(prices.close),
    volume: Boolean(blind) ? roundNumber((Number(item.volume || 0) / volumeBase) * 100, 0) : roundNumber(item.volume, 0),
    amount: Boolean(blind) ? 0 : roundNumber(item.amount, 0),
    pct_chg: item.pct_chg === null ? null : roundNumber(item.pct_chg, 4)
  };
}

function normalizeBlindPrices(item, basePrice) {
  const denominator = Math.abs(Number(basePrice || 0)) || 1;
  const values = {
    open: 100 + ((Number(item.open || 0) - Number(basePrice || 0)) / denominator) * 100,
    high: 100 + ((Number(item.high || 0) - Number(basePrice || 0)) / denominator) * 100,
    low: 100 + ((Number(item.low || 0) - Number(basePrice || 0)) / denominator) * 100,
    close: 100 + ((Number(item.close || 0) - Number(basePrice || 0)) / denominator) * 100
  };
  const high = Math.max(values.open, values.high, values.low, values.close);
  const low = Math.min(values.open, values.high, values.low, values.close);
  return {
    open: values.open,
    high,
    low,
    close: values.close
  };
}

function buildTrainingBrief({ trainingMode, personality, gate, market, timeframe }) {
  return {
    mode: trainingMode,
    personality: personality || PERSONALITY_PRACTICES["平衡型"],
    gate: gate || GATE_PRACTICES.zhao_xin,
    title: `${trainingMode.label}｜${gate?.label || "照心"}｜${timeframe.label}`,
    first_question: "此刻你最明显的第一念是什么？",
    boundary_question: `在${market.label}${timeframe.label}片段中，哪一处最容易让你偏离今日边界？`,
    boundary_action: gate?.action || "先停十秒，写下一念，再进入复盘。",
    review_prompt: "完成后只复盘三件事：看见了什么、是否守界、下次如何提前十秒照见。"
  };
}

function buildSliceId(descriptor) {
  const hash = crypto.createHash("sha256").update(JSON.stringify(descriptor)).digest("base64url").slice(0, 18);
  return `HKL-${hash}`;
}

function encodeSliceToken(descriptor) {
  const iv = crypto.randomBytes(12);
  const key = getSliceTokenKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const payload = Buffer.from(JSON.stringify(descriptor), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decodeSliceToken(token) {
  try {
    const data = Buffer.from(String(token || ""), "base64url");
    if (data.length <= 28) throw new Error("invalid token");
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getSliceTokenKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(plain);
  } catch {
    const error = new Error("盲练片段凭证无效");
    error.statusCode = 400;
    throw error;
  }
}

function getSliceTokenKey() {
  return crypto.createHash("sha256").update(`${config.authCodeSecret}:historical-kline-slice`).digest();
}

function createInstrumentKey(symbol = "") {
  return Buffer.from(String(symbol || "").trim()).toString("base64url");
}

function createSeededRng(seedText) {
  let state = crypto.createHash("sha256").update(String(seedText || "seed")).digest().readUInt32BE(0);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function candleRangePct(item) {
  const base = Math.abs(Number(item.close || item.open || 0));
  if (!base) return 0;
  return (Math.abs(Number(item.high || 0) - Number(item.low || 0)) / base) * 100;
}

function candleBodyPct(item) {
  const base = Math.abs(Number(item.open || item.close || 0));
  if (!base) return 0;
  return (Math.abs(Number(item.close || 0) - Number(item.open || 0)) / base) * 100;
}

function scoreVolumeSpike(segment) {
  const volumes = segment.map((item) => Number(item.volume || 0)).filter((value) => value > 0);
  if (volumes.length < 6) return 0;
  const avg = average(volumes);
  const max = Math.max(...volumes);
  return avg ? Math.min(max / avg, 8) : 0;
}

function countAlternation(segment) {
  let count = 0;
  for (let index = 1; index < segment.length; index += 1) {
    const prev = Number(segment[index - 1].close || 0) - Number(segment[index - 1].open || 0);
    const next = Number(segment[index].close || 0) - Number(segment[index].open || 0);
    if (prev && next && Math.sign(prev) !== Math.sign(next)) count += 1;
  }
  return count;
}

function drawdownLikeScore(segment) {
  let peak = Number(segment[0]?.close || 0);
  let maxDepth = 0;
  for (const item of segment) {
    const close = Number(item.close || 0);
    if (Math.abs(close) > Math.abs(peak)) peak = close;
    const depth = Math.abs(percentChange(close, peak));
    if (depth > maxDepth) maxDepth = depth;
  }
  return maxDepth;
}

function percentChange(value, base) {
  const denominator = Math.abs(Number(base || 0));
  if (!denominator) return 0;
  return ((Number(value || 0) - Number(base || 0)) / denominator) * 100;
}

function average(values = []) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

function compareDateText(left, right) {
  return normalizeDateKey(left).localeCompare(normalizeDateKey(right));
}

function normalizeDateKey(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 14) return digits.slice(0, 14);
  if (digits.length >= 8) return digits.slice(0, 8);
  return "";
}

function parseDate(value = "") {
  const key = normalizeDateKey(value);
  if (key.length < 8) return null;
  const date = new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, Number(key.slice(6, 8))));
  return Number.isNaN(date.getTime()) ? null : date;
}
