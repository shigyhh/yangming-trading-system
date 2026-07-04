const { getPersonalityStagePlan } = require("../../core/personality-stage-map");
const { normalizeExecutionResult } = require("../../utils/execution-terminology");

const SIX_GATE_MAP = [
  {
    key: "lizhi",
    name: "立志",
    order: 1,
    seal: "志",
    theme: "先立今日之界",
    practice: "进入训练前，只写一条今天必须守住的边界。"
  },
  {
    key: "zhaoxin",
    name: "照心",
    order: 2,
    seal: "照",
    theme: "照见第一念",
    practice: "图形牵动你的瞬间，先看见急、惧、贪、证。"
  },
  {
    key: "shishangmo",
    name: "事上磨",
    order: 3,
    seal: "磨",
    theme: "触发处练停顿",
    practice: "念头最重时，先停十秒，把动作交还给边界。"
  },
  {
    key: "poxinzei",
    name: "破心贼",
    order: 4,
    seal: "破",
    theme: "识破解释与证明",
    practice: "一旦开始替偏离找理由，就写下此刻真正想保护的东西。"
  },
  {
    key: "zhixing",
    name: "知行合一",
    order: 5,
    seal: "行",
    theme: "边界到了即合一",
    practice: "边界触碰时，不再临场改口径，只回到已写下的计划。"
  },
  {
    key: "zhiliangzhi",
    name: "致良知",
    order: 6,
    seal: "良",
    theme: "复盘而不责备",
    practice: "复盘只问事实、念头、动作，不用情绪惩罚自己。"
  }
];

const PERSONALITY_KLINE_PRESCRIPTIONS = {
  "冲动型": {
    title: "先照急念，再看图形",
    heartThief: "怕错过",
    watchPoint: "图形突然放大时，最容易把外在变化当成立刻行动的理由。",
    firstQuestion: "这一念是事实在召唤，还是急躁在催我动？",
    boundaryPractice: "停十秒，写下理由、边界、复盘依据，再决定是否继续观察。",
    dangerMoment: "刚看见强烈波动，身体先紧，手已经想动。"
  },
  "扛单型": {
    title: "边界触碰，不再辩解",
    heartThief: "不愿认错",
    watchPoint: "边界被触碰时，最容易开始重新解释原计划。",
    firstQuestion: "我是守住边界，还是在保护一个不愿承认偏离的自己？",
    boundaryPractice: "把预设边界读一遍，只做记录，不临场改条件。",
    dangerMoment: "边界到了，心里出现再等等、再看看。"
  },
  "赌徒型": {
    title: "不顺之后，先止不甘",
    heartThief: "急于夺回",
    watchPoint: "不顺之后，最容易用更重的动作寻找立刻补偿。",
    firstQuestion: "我此刻是在复盘事实，还是在让不甘替我行动？",
    boundaryPractice: "离开屏幕三十秒，只写念头，不增加动作重量。",
    dangerMoment: "连续不顺后，心里出现必须马上夺回节奏。"
  },
  "焦虑型": {
    title: "少看一眼，多照一念",
    heartThief: "求确定",
    watchPoint: "图形反复变化时，最容易用高频查看换安全感。",
    firstQuestion: "我是在收集事实，还是在寻找一个让我暂时安心的答案？",
    boundaryPractice: "只在固定观察窗口记录，其余时间写下心境变化。",
    dangerMoment: "页面一动，心里就想反复确认。"
  },
  "完美型": {
    title: "一错一改，不责其心",
    heartThief: "苛责求全",
    watchPoint: "一次处理不理想后，最容易把复盘变成自责。",
    firstQuestion: "我是在修正动作，还是在惩罚自己不够正确？",
    boundaryPractice: "只写一个下次可执行的小修正，不写长篇自责。",
    dangerMoment: "一处偏差后，开始反复否定自己。"
  },
  "从众型": {
    title: "众声入耳，先问本心",
    heartThief: "随众失主",
    watchPoint: "外部观点很热时，最容易让他人的确定感替代自己的计划。",
    firstQuestion: "这是我的计划，还是我借来的确定感？",
    boundaryPractice: "训练中只看自己的计划卡，收盘后再处理外部声音。",
    dangerMoment: "看到别人很笃定，自己的边界开始摇晃。"
  },
  "偏执型": {
    title: "先格物，再立言",
    heartThief: "执己为理",
    watchPoint: "已有判断后，最容易只看支持自己的部分。",
    firstQuestion: "我是在看见事实，还是在维护原来的解释？",
    boundaryPractice: "写下一条反向事实，让事实先于立场。",
    dangerMoment: "图形不配合原判断，心里开始找解释。"
  },
  "拖延型": {
    title: "今日事，今日省",
    heartThief: "知而不行",
    watchPoint: "知道要记录，却容易把省察推到明天。",
    firstQuestion: "我现在是真的需要更多准备，还是在逃开记录？",
    boundaryPractice: "三分钟写下触发、反应、明日修正，先完成最小闭环。",
    dangerMoment: "看完训练题，却想先放一放。"
  },
  "平衡型": {
    title: "稳定时，更要守一",
    heartThief: "稳定生怠",
    watchPoint: "状态平稳时，最容易省略基础照心。",
    firstQuestion: "今天的稳定来自系统，还是来自一时顺手？",
    boundaryPractice: "照心、观图、省察三件小事照常做，不因平稳而省略。",
    dangerMoment: "感觉没什么问题，于是跳过记录。"
  }
};

const MARKET_CATALOG = {
  cn_equity: {
    key: "cn_equity",
    name: "A股",
    rhythm: "开盘情绪、午后反复、板块牵动",
    defaultSymbol: "000001.SZ",
    rule: "T+1、涨跌幅约束、复权口径",
    triggerLabel: "真实历史片段",
    mindQuestion: "你看到快速放大时，是守住计划观察，还是想马上证明判断？",
    guardrail: "只记录触发与边界，不把历史片段当成当下判断。"
  }
};

const TIMEFRAME_CATALOG = [
  { key: "1d", label: "长线", granularity: "daily", required: true },
  { key: "60m", label: "中线", granularity: "intraday", required: true },
  { key: "30m", label: "短线", granularity: "intraday", required: true }
];

function normalizeKlineMindTimeframeKey(value = "", fallback = "1d") {
  const fallbackKey = TIMEFRAME_CATALOG.some((item) => item.key === fallback) ? fallback : "1d";
  const raw = String(value || "").trim().toLowerCase();
  const aliases = {
    "1d": "1d",
    "101": "1d",
    d: "1d",
    day: "1d",
    daily: "1d",
    "日线": "1d",
    "长线": "1d",
    "60": "60m",
    "60m": "60m",
    "60min": "60m",
    "60分钟": "60m",
    "中线": "60m",
    "30": "30m",
    "30m": "30m",
    "30min": "30m",
    "30分钟": "30m",
    "短线": "30m"
  };
  return aliases[raw] || fallbackKey;
}

const CHART_ZOOM_OPTIONS = [
  { key: "overview", label: "总览", hint: "约180根，先看整体趋势", windowSize: 180 },
  { key: "wide", label: "缩小", hint: "约150根，适合盲练", windowSize: 150 },
  { key: "standard", label: "标准", hint: "约90根，平衡节奏", windowSize: 90 },
  { key: "focus", label: "放大", hint: "约48根，细看局部", windowSize: 48 }
];

const INDICATOR_CATALOG = [
  { key: "ma", label: "MA", name: "均线", trainingUse: "看趋势牵动" },
  { key: "macd", label: "MACD", name: "动能", trainingUse: "看冲动来源" },
  { key: "boll", label: "BOLL", name: "波动边界", trainingUse: "看边界感" },
  { key: "vol", label: "VOL", name: "量能", trainingUse: "看放量反应" },
  { key: "rsi", label: "RSI", name: "强弱", trainingUse: "看过热牵动" },
  { key: "kdj", label: "KDJ", name: "摆动", trainingUse: "看追涨犹豫" }
];

const MAIN_INDICATOR_OPTIONS = [
  { key: "ma", label: "MA" },
  { key: "boll", label: "BOLL" }
];

const INDICATOR_PANEL_OPTIONS = [
  { key: "vol", label: "VOL" },
  { key: "macd", label: "MACD" },
  { key: "rsi", label: "RSI" },
  { key: "kdj", label: "KDJ" }
];

const CHART_GEOMETRY = {
  overview: { candleWidth: 2, bodyWidth: 2, gap: 1, paddingX: 18, paddingTop: 24 },
  wide: { candleWidth: 4, bodyWidth: 4, gap: 1, paddingX: 18, paddingTop: 24 },
  standard: { candleWidth: 10, bodyWidth: 8, gap: 4, paddingX: 18, paddingTop: 24 },
  focus: { candleWidth: 28, bodyWidth: 22, gap: 8, paddingX: 18, paddingTop: 24 }
};
const BLIND_CHART_MIN_WIDTH = 690;

const KLINE_TRAINING_METHODS = [
  {
    key: "step_replay",
    title: "逐根推进",
    subtitle: "像复盘一样一根一根展开，只记录被牵动的那一刻。",
    focus: "训练反应速度与停顿能力",
    steps: ["看已展开片段", "点选最牵动的一根", "写第一反应", "回到边界再继续"]
  },
  {
    key: "blind_mirror",
    title: "盲练观心",
    subtitle: "隐藏名称与时间，只看结构、节奏和自己的第一念。",
    focus: "训练少受外部标签影响",
    steps: ["隐藏标的标签", "隐藏日期区间", "只记念头变化", "结束后再揭示来源"]
  },
  {
    key: "rule_mapping",
    title: "规则映射",
    subtitle: "不同市场有不同制度，把规则转成边界训练。",
    focus: "训练规则意识与执行稳定",
    steps: ["识别市场规则", "写下今日边界", "触碰即记录", "复盘是否改口径"]
  },
  {
    key: "firecracker",
    title: "爆竹 K 线",
    subtitle: "连续急促、放量、长实体或长影线的强触发历史片段。",
    focus: "训练急念、不甘、证明欲",
    steps: ["先停十秒", "标记身体感受", "写下想动的理由", "只完成一次观心记录"]
  },
  {
    key: "review_loop",
    title: "省察回放",
    subtitle: "训练后不评价对错，只回看反应、边界与知行断点。",
    focus: "训练复盘而不责备",
    steps: ["回看触发点", "记录是否守界", "写一句照见", "沉淀到七日复测"]
  }
];

const PERSONALITY_KLINE_DRILLS = {
  "冲动型": {
    targetScene: "突然放大的历史片段",
    drillAction: "入事前停十秒，先写理由、边界和退出条件。",
    reviewPrompt: "今天哪一根最像在催我立刻行动？"
  },
  "焦虑型": {
    targetScene: "反复拉扯、上下影线密集的片段",
    drillAction: "只在固定观察窗口看图，窗口外只记录心境。",
    reviewPrompt: "我是在看事实，还是在用反复确认换安全感？"
  },
  "扛单型": {
    targetScene: "边界被触碰后仍想解释的片段",
    drillAction: "边界触碰即记录，不在训练中临场改条件。",
    reviewPrompt: "我有没有把重新解释当成守住自己的方式？"
  },
  "赌徒型": {
    targetScene: "连续不顺后又突然加速的片段",
    drillAction: "不顺之后先离开三十秒，只记录不甘，不加重动作。",
    reviewPrompt: "我有没有把不甘包装成下一步理由？"
  },
  "完美型": {
    targetScene: "一次处理不理想后的回放片段",
    drillAction: "只写一个下次可克治动作，不写长篇自责。",
    reviewPrompt: "我是在修正动作，还是在惩罚自己不够正确？"
  },
  "从众型": {
    targetScene: "外部标签很容易牵动判断的片段",
    drillAction: "先做盲练，不看名称与时间，训练结束再揭示来源。",
    reviewPrompt: "我有没有让外部确定感替代自己的观察？"
  },
  "偏执型": {
    targetScene: "图形不配合原判断的片段",
    drillAction: "写下一条反向事实，让事实先于立场。",
    reviewPrompt: "我是在照见事实，还是在维护原解释？"
  },
  "拖延型": {
    targetScene: "看完想先放一放的片段",
    drillAction: "三分钟内完成触发、反应、明日修正三行记录。",
    reviewPrompt: "我今天落下动作，还是只是在想明白？"
  },
  "平衡型": {
    targetScene: "看似平稳却容易省略记录的片段",
    drillAction: "照心、观图、省察三件小事照常做。",
    reviewPrompt: "今天的稳定来自系统，还是来自一时顺手？"
  }
};

const GATE_TRAINING_ACTIONS = {
  lizhi: {
    title: "立边界",
    trainingAction: "训练前写下今日必须守住的一条边界。",
    passCheck: "没有边界，不进入图形训练。"
  },
  zhaoxin: {
    title: "照第一念",
    trainingAction: "点选最牵动的一根，记录急、惧、贪、证中的哪一个先出现。",
    passCheck: "能说出第一念，才算完成照心。"
  },
  shishangmo: {
    title: "触发处停顿",
    trainingAction: "强触发片段前停十秒，先写身体感受。",
    passCheck: "念头最重时，动作是否变慢。"
  },
  poxinzei: {
    title: "破解释",
    trainingAction: "一旦开始替偏离找理由，写下真正想保护的东西。",
    passCheck: "能看见解释背后的心贼。"
  },
  zhixing: {
    title: "守界合一",
    trainingAction: "边界触碰时，只回到已写计划，不临场改口径。",
    passCheck: "边界到了，是否仍能照做。"
  },
  zhiliangzhi: {
    title: "复盘存养",
    trainingAction: "只问事实、念头、动作，不用情绪责备自己。",
    passCheck: "复盘后能留下一个明日动作。"
  }
};

const DAY_SCENARIOS = {
  1: {
    id: "entry-impulse",
    title: "冲动起念",
    subtitle: "看见图形突然放大时，照见行动前的一念。",
    focusIndex: 5,
    prompt: "当你想立刻进入一件事，是看见事实，还是想用行动缓解不安？",
  },
  2: {
    id: "boundary-touch",
    title: "边界触碰",
    subtitle: "边界到了，正是知行合一处。",
    focusIndex: 3,
    prompt: "当预设边界被触碰，你第一反应是遵守计划，还是重新解释？"
  },
  3: {
    id: "prove-after-loss",
    title: "证明欲浮起",
    subtitle: "不顺之后，先看见那个想立刻证明的自己。",
    focusIndex: 3,
    prompt: "不顺之后，你是在复盘事实，还是在寻找一个立刻挽回的动作？"
  },
  4: {
    id: "ease-after-gain",
    title: "顺利后的失守",
    subtitle: "顺利时守住尺度，才是真功夫。",
    focusIndex: 2,
    prompt: "顺利之后，你是否开始省略记录、放大动作，或忘记原来的边界？"
  },
  5: {
    id: "heavy-action",
    title: "加重动作之念",
    subtitle: "念头越重，动作越要轻。",
    focusIndex: 3,
    prompt: "当你想加重动作或硬扛时，是规则在带路，还是不甘在发力？"
  },
  6: {
    id: "plan-break",
    title: "执行断裂",
    subtitle: "计划断裂的一刻，先看见，不责备。",
    focusIndex: 3,
    prompt: "计划断裂的一刻，你最先放弃的是记录、边界，还是如实面对？"
  },
  7: {
    id: "seven-review",
    title: "七日复照",
    subtitle: "七日一省，只看反应模式如何变化。",
    focusIndex: 4,
    prompt: "这一周里，哪个旧反应变轻了？哪个念头还最容易牵动你？"
  }
};

const REACTION_OPTIONS = ["急躁", "恐惧", "贪念", "证明", "抗拒", "逃避"];
const BODY_OPTIONS = ["紧", "热", "空", "沉", "乱", "稳"];
const BOUNDARY_OPTIONS = ["停十秒", "写边界", "只记录", "延后判断", "回到计划", "做收盘省察"];
const KLINE_MIND_SLICE_SEEDS = [
  "scene-fast-001",
  "scene-missed-001",
  "scene-fake-001",
  "scene-drop-001",
  "scene-boundary-001",
  "scene-loss-streak-001",
  "scene-retest-001"
];
const MIN_VISIBLE_CANDLES = 6;
const DEFAULT_VISIBLE_CANDLES = 150;
const MAX_VISIBLE_CANDLES = 180;

function clampDay(day) {
  const value = Number(day || 1);
  return Math.max(1, Math.min(7, Number.isFinite(value) ? value : 1));
}

function getSixGate(stageKey) {
  return SIX_GATE_MAP.find((item) => item.key === stageKey) || SIX_GATE_MAP[1];
}

function getKlinePrescription(type) {
  return PERSONALITY_KLINE_PRESCRIPTIONS[type] || PERSONALITY_KLINE_PRESCRIPTIONS["平衡型"];
}

function getPersonalityKlineDrill(type) {
  return PERSONALITY_KLINE_DRILLS[type] || PERSONALITY_KLINE_DRILLS["平衡型"];
}

function getMarketConfig(marketKey) {
  return MARKET_CATALOG[marketKey] || MARKET_CATALOG.cn_equity;
}

function buildMarketOptions(selectedKey) {
  return Object.keys(MARKET_CATALOG).map((key) => Object.assign({}, MARKET_CATALOG[key], {
    selected: key === selectedKey
  }));
}

function buildTimeframeOptions(selectedKey) {
  return TIMEFRAME_CATALOG.map((item) => Object.assign({}, item, {
    selected: item.key === selectedKey
  }));
}

function getChartZoomMeta(zoomKey = "wide") {
  return CHART_ZOOM_OPTIONS.find((item) => item.key === zoomKey) || CHART_ZOOM_OPTIONS[1];
}

function buildChartZoomOptions(selectedKey = "wide") {
  return CHART_ZOOM_OPTIONS.map((item) => Object.assign({}, item, {
    selected: item.key === selectedKey
  }));
}

function getNextKlineMindSliceSeed(currentSeed = "") {
  const index = KLINE_MIND_SLICE_SEEDS.indexOf(String(currentSeed || ""));
  if (index < 0) return KLINE_MIND_SLICE_SEEDS[0];
  return KLINE_MIND_SLICE_SEEDS[(index + 1) % KLINE_MIND_SLICE_SEEDS.length];
}

function pickFiniteNumber(...values) {
  for (const value of values) {
    if (value === "" || value === null || value === undefined) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return NaN;
}

function normalizeRawHistoryCandle(item = {}, index = 0) {
  const open = pickFiniteNumber(item.open, item.o, item.openPrice, item.open_price);
  const high = pickFiniteNumber(item.high, item.h, item.highPrice, item.high_price);
  const low = pickFiniteNumber(item.low, item.l, item.lowPrice, item.low_price);
  const close = pickFiniteNumber(item.close, item.c, item.closePrice, item.close_price);
  if (![open, high, low, close].every(Number.isFinite)) return null;

  return {
    key: item.id || item.key || `m${index + 1}`,
    date: item.date || item.time || item.t || item.label || "",
    open,
    high: Math.max(high, open, close, low),
    low: Math.min(low, open, close, high),
    close,
    volume: pickFiniteNumber(item.volume, item.vol, item.v, item.amount, 0),
    focus: !!item.focus
  };
}

function normalizeWindowSize(windowSize) {
  const value = Number(windowSize || DEFAULT_VISIBLE_CANDLES);
  if (!Number.isFinite(value)) return DEFAULT_VISIBLE_CANDLES;
  return Math.max(MIN_VISIBLE_CANDLES, Math.min(MAX_VISIBLE_CANDLES, Math.round(value)));
}

function average(values = []) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function movingAverage(values = [], index, period) {
  if (index < 0) return null;
  const start = Math.max(0, index - period + 1);
  return average(values.slice(start, index + 1));
}

function standardDeviation(values = [], mean) {
  if (!values.length || mean === null) return null;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function pickVisibleHistoryWindow(candles, windowSize = DEFAULT_VISIBLE_CANDLES) {
  const safeWindowSize = normalizeWindowSize(windowSize);
  if (!candles.length) return [];
  if (candles.length <= safeWindowSize) return candles;

  const focusIndex = candles.findIndex((item) => item.focus);
  if (focusIndex >= 0) {
    const half = Math.floor(safeWindowSize / 2);
    const start = Math.max(0, Math.min(candles.length - safeWindowSize, focusIndex - half));
    return candles.slice(start, start + safeWindowSize);
  }

  return candles.slice(candles.length - safeWindowSize);
}

function projectCandlesToVisiblePriceRange(candles = []) {
  if (!Array.isArray(candles) || !candles.length) return [];

  const highs = candles.map((item) => Number(item.high)).filter(Number.isFinite);
  const lows = candles.map((item) => Number(item.low)).filter(Number.isFinite);
  const candleMaxHigh = Math.max.apply(null, highs.concat([0]));
  const candleMinLow = Math.min.apply(null, lows.concat([candleMaxHigh]));
  const candleRange = Math.max(0.0001, candleMaxHigh - candleMinLow);
  const pricePadding = Math.max(candleRange * 0.08, Math.abs(candleMaxHigh) * 0.001);
  const maxHigh = candleMaxHigh + pricePadding;
  const minLow = candleMinLow - pricePadding;
  const range = Math.max(0.0001, maxHigh - minLow);
  const clampChartY = (value) => Math.max(18, Math.min(218, value));
  const valueToY = (value) => Number.isFinite(value)
    ? Math.round(clampChartY(((maxHigh - value) / range) * 168 + 34))
    : null;

  return candles.map((item) => {
    const open = Number(item.open);
    const high = Number(item.high);
    const low = Number(item.low);
    const close = Number(item.close);
    const highY = ((maxHigh - high) / range) * 168 + 34;
    const lowY = ((maxHigh - low) / range) * 168 + 34;
    const openY = ((maxHigh - open) / range) * 168 + 34;
    const closeY = ((maxHigh - close) / range) * 168 + 34;
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(6, Math.abs(openY - closeY));
    const wickHeight = Math.max(8, lowY - highY);
    return Object.assign({}, item, {
      wickStyle: `height: ${Math.round(wickHeight)}rpx; top: ${Math.round(highY)}rpx;`,
      bodyStyle: `height: ${Math.round(bodyHeight)}rpx; top: ${Math.round(bodyTop)}rpx;`,
      closeY: valueToY(close),
      ma5Y: valueToY(item.ma5),
      ma10Y: valueToY(item.ma10),
      ma20Y: valueToY(item.ma20),
      bollUpperY: valueToY(item.bollUpper),
      bollLowerY: valueToY(item.bollLower)
    });
  });
}

function normalizeHistoryCandles(historySlice = {}, options = {}) {
  const rawCandles = Array.isArray(historySlice.candles)
    ? historySlice.candles
    : Array.isArray(historySlice.bars) ? historySlice.bars : [];
  const normalizedCandles = rawCandles
    .map(normalizeRawHistoryCandle)
    .filter(Boolean)
    .map((item, sourceIndex) => Object.assign({}, item, { sourceIndex }));
  const candles = pickVisibleHistoryWindow(normalizedCandles, options.windowSize);
  if (!candles.length) return [];

  const volumes = candles.map((item) => Number(item.volume || 0)).filter(Number.isFinite);
  const closes = normalizedCandles.map((item) => Number(item.close));
  const allIndicatorValues = normalizedCandles.map((item, index) => {
    const ma5 = movingAverage(closes, index, 5);
    const ma10 = movingAverage(closes, index, 10);
    const ma20 = movingAverage(closes, index, 20);
    const bollWindow = closes.slice(Math.max(0, index - 19), index + 1);
    const deviation = ma20 === null ? null : standardDeviation(bollWindow, ma20);
    return {
      ma5,
      ma10,
      ma20,
      bollUpper: ma20 === null || deviation === null ? null : ma20 + deviation * 2,
      bollLower: ma20 === null || deviation === null ? null : ma20 - deviation * 2
    };
  });
  const indicatorValues = candles.map((item) => allIndicatorValues[item.sourceIndex] || {});
  const maxVolume = Math.max.apply(null, volumes.concat([1]));

  return projectCandlesToVisiblePriceRange(candles.map((item, index) => {
    const open = Number(item.open);
    const high = Number(item.high);
    const low = Number(item.low);
    const close = Number(item.close);
    const volume = Number(item.volume || 0);
    const volumeHeight = Math.max(8, Math.round((volume / maxVolume) * 62));
    const key = item.key || `m${index + 1}`;
    const tone = close > open ? "gold" : close < open ? "jade" : "flat";
    const indicator = indicatorValues[index] || {};

    return {
      key,
      sourceIndex: Number(item.sourceIndex || index),
      label: item.focus ? "问" : "",
      indexLabel: String(index + 1).padStart(2, "0"),
      tone,
      date: item.date || "",
      open,
      high,
      low,
      close,
      volume,
      volumeStyle: `height: ${volumeHeight}rpx;`,
      ma5: indicator.ma5,
      ma10: indicator.ma10,
      ma20: indicator.ma20,
      bollUpper: indicator.bollUpper,
      bollLower: indicator.bollLower,
      focus: !!item.focus,
      selected: false
    };
  }));
}

function roundMetric(value, digits = 2) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  const factor = Math.pow(10, digits);
  return Math.round(number * factor) / factor;
}

function getChartGeometry(zoomKey = "wide") {
  return CHART_GEOMETRY[zoomKey] || CHART_GEOMETRY.wide;
}

function getChartLayout(candleCount, zoomKey = "wide") {
  const count = Math.max(1, Number(candleCount || 0));
  const geometry = getChartGeometry(zoomKey);
  const width = BLIND_CHART_MIN_WIDTH;
  if (count <= 1) return Object.assign({}, geometry, { width, gap: geometry.gap });
  const naturalWidth = Math.round(geometry.paddingX * 2 + count * geometry.candleWidth + Math.max(0, count - 1) * geometry.gap);
  if (naturalWidth >= width) return Object.assign({}, geometry, { width: naturalWidth, gap: geometry.gap });
  const gap = Math.max(geometry.gap, (width - geometry.paddingX * 2 - count * geometry.candleWidth) / (count - 1));
  return Object.assign({}, geometry, { width, gap });
}

function getChartBoardStyle(candleCount, zoomKey = "wide") {
  const layout = getChartLayout(candleCount, zoomKey);
  return [
    `width: ${layout.width}rpx`,
    "min-width: 100%",
    `--kline-gap: ${roundMetric(layout.gap, 2)}rpx`,
    `--kline-candle-width: ${roundMetric(layout.candleWidth, 2)}rpx`,
    `--kline-body-width: ${roundMetric(layout.bodyWidth || layout.candleWidth, 2)}rpx`
  ].join("; ") + ";";
}

function getChartViewportCapacity(zoomKey = "wide") {
  const geometry = getChartGeometry(zoomKey);
  const plotWidth = BLIND_CHART_MIN_WIDTH - geometry.paddingX * 2;
  const step = Math.max(1, geometry.candleWidth + geometry.gap);
  return Math.max(1, Math.floor((plotWidth + geometry.gap) / step));
}

function buildOverlaySegments(candles = [], field, zoomKey = "wide") {
  const geometry = getChartLayout(candles.length, zoomKey);
  const segments = [];
  for (let index = 0; index < candles.length - 1; index += 1) {
    const currentRawY = candles[index][field];
    const nextRawY = candles[index + 1][field];
    if (currentRawY === null || currentRawY === undefined || nextRawY === null || nextRawY === undefined) continue;
    const currentY = Number(currentRawY);
    const nextY = Number(nextRawY);
    if (!Number.isFinite(currentY) || !Number.isFinite(nextY)) continue;
    const x1 = geometry.paddingX + index * (geometry.candleWidth + geometry.gap) + geometry.candleWidth / 2;
    const x2 = geometry.paddingX + (index + 1) * (geometry.candleWidth + geometry.gap) + geometry.candleWidth / 2;
    const y1 = geometry.paddingTop + currentY;
    const y2 = geometry.paddingTop + nextY;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const width = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    segments.push({
      key: `${field}-${index}`,
      style: `left: ${roundMetric(x1, 1)}rpx; top: ${roundMetric(y1, 1)}rpx; width: ${roundMetric(width, 1)}rpx; transform: rotate(${roundMetric(angle, 2)}deg);`
    });
  }
  return segments;
}

function getMainIndicatorMeta(key = "ma") {
  if (key === "hide") return { key: "hide", label: "" };
  return MAIN_INDICATOR_OPTIONS.find((item) => item.key === key) || MAIN_INDICATOR_OPTIONS[0];
}

function buildEmptyIndicatorOverlay() {
  return {
    ma5: [],
    ma10: [],
    ma20: [],
    bollUpper: [],
    bollLower: []
  };
}

function buildIndicatorOverlay(candles = [], zoomKey = "wide", indicatorKey = "ma") {
  const meta = getMainIndicatorMeta(indicatorKey);
  if (meta.key === "hide") return buildEmptyIndicatorOverlay();
  if (meta.key === "boll") {
    return Object.assign(buildEmptyIndicatorOverlay(), {
      ma20: buildOverlaySegments(candles, "ma20Y", zoomKey),
      bollUpper: buildOverlaySegments(candles, "bollUpperY", zoomKey),
      bollLower: buildOverlaySegments(candles, "bollLowerY", zoomKey)
    });
  }
  return Object.assign(buildEmptyIndicatorOverlay(), {
    ma5: buildOverlaySegments(candles, "ma5Y", zoomKey),
    ma10: buildOverlaySegments(candles, "ma10Y", zoomKey),
    ma20: buildOverlaySegments(candles, "ma20Y", zoomKey)
  });
}

function getIndicatorPanelMeta(key = "vol") {
  if (key === "hide") return { key: "hide", label: "" };
  return INDICATOR_PANEL_OPTIONS.find((item) => item.key === key) || INDICATOR_PANEL_OPTIONS[0];
}

function emaSeries(values = [], period) {
  const k = 2 / (period + 1);
  let previous = null;
  return values.map((value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    previous = previous === null ? number : number * k + previous * (1 - k);
    return previous;
  });
}

function buildPanelLineSegments(points = [], field, zoomKey = "wide") {
  const geometry = getChartLayout(points.length, zoomKey);
  const segments = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const currentRawY = points[index][field];
    const nextRawY = points[index + 1][field];
    if (currentRawY === null || currentRawY === undefined || nextRawY === null || nextRawY === undefined) continue;
    const currentY = Number(currentRawY);
    const nextY = Number(nextRawY);
    if (!Number.isFinite(currentY) || !Number.isFinite(nextY)) continue;
    const x1 = geometry.paddingX + index * (geometry.candleWidth + geometry.gap) + geometry.candleWidth / 2;
    const x2 = geometry.paddingX + (index + 1) * (geometry.candleWidth + geometry.gap) + geometry.candleWidth / 2;
    const y1 = currentY;
    const y2 = nextY;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const width = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    segments.push({
      key: `${field}-${index}`,
      style: `left: ${roundMetric(x1, 1)}rpx; top: ${roundMetric(y1, 1)}rpx; width: ${roundMetric(width, 1)}rpx; transform: rotate(${roundMetric(angle, 2)}deg);`
    });
  }
  return segments;
}

function buildVolPanel(candles = []) {
  const maxVolume = Math.max.apply(null, candles.map((item) => Number(item.volume || 0)).concat([1]));
  return candles.map((item, index) => ({
    key: `vol-${item.key || index}`,
    tone: item.tone || "flat",
    barStyle: `height: ${Math.max(2, Math.round((Number(item.volume || 0) / maxVolume) * 76))}rpx;`
  }));
}

function buildMacdPanel(candles = [], zoomKey = "wide") {
  const closes = candles.map((item) => Number(item.close || 0));
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const dif = closes.map((_, index) => Number(ema12[index]) - Number(ema26[index]));
  const dea = emaSeries(dif, 9);
  const hist = dif.map((value, index) => value - Number(dea[index] || 0));
  const maxAbs = Math.max.apply(null, hist.concat(dif).concat(dea).map((value) => Math.abs(Number(value || 0))).concat([0.0001]));
  const mid = 46;
  const points = candles.map((item, index) => {
    const histogram = Number(hist[index] || 0);
    const barHeight = Math.max(2, Math.round(Math.abs(histogram) / maxAbs * 42));
    return {
      key: `macd-${item.key || index}`,
      tone: histogram >= 0 ? "gold" : "jade",
      barStyle: `height: ${barHeight}rpx; top: ${histogram >= 0 ? mid - barHeight : mid}rpx;`,
      difY: mid - Number(dif[index] || 0) / maxAbs * 38,
      deaY: mid - Number(dea[index] || 0) / maxAbs * 38
    };
  });
  return {
    items: points,
    lines: {
      dif: buildPanelLineSegments(points, "difY", zoomKey),
      dea: buildPanelLineSegments(points, "deaY", zoomKey)
    }
  };
}

function indicatorValueToY(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return 86 - safe / 100 * 80;
}

function buildRsiValues(candles = [], period = 14) {
  let avgGain = 0;
  let avgLoss = 0;
  return candles.map((item, index) => {
    if (index === 0) return 50;
    const prev = Number(candles[index - 1].close || 0);
    const current = Number(item.close || 0);
    const change = current - prev;
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    const divisor = Math.min(period, index);
    avgGain = index === 1 ? gain : ((avgGain * (divisor - 1)) + gain) / divisor;
    avgLoss = index === 1 ? loss : ((avgLoss * (divisor - 1)) + loss) / divisor;
    if (avgLoss <= 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  });
}

function buildRsiPanel(candles = [], zoomKey = "wide") {
  const rsiValues = buildRsiValues(candles, 14);
  const points = candles.map((item, index) => ({
    key: `rsi-${item.key || index}`,
    rsiY: indicatorValueToY(rsiValues[index])
  }));
  return {
    items: [],
    lines: {
      rsi: buildPanelLineSegments(points, "rsiY", zoomKey)
    }
  };
}

function buildKdjPanel(candles = [], zoomKey = "wide") {
  let k = 50;
  let d = 50;
  const points = candles.map((item, index) => {
    const start = Math.max(0, index - 8);
    const window = candles.slice(start, index + 1);
    const high = Math.max.apply(null, window.map((candle) => Number(candle.high || 0)).concat([Number(item.high || 0)]));
    const low = Math.min.apply(null, window.map((candle) => Number(candle.low || 0)).concat([Number(item.low || 0)]));
    const close = Number(item.close || 0);
    const rsv = high === low ? 50 : ((close - low) / (high - low)) * 100;
    k = k * 2 / 3 + rsv / 3;
    d = d * 2 / 3 + k / 3;
    const j = 3 * k - 2 * d;
    return {
      key: `kdj-${item.key || index}`,
      kY: indicatorValueToY(k),
      dY: indicatorValueToY(d),
      jY: indicatorValueToY(j)
    };
  });
  return {
    items: [],
    lines: {
      k: buildPanelLineSegments(points, "kY", zoomKey),
      d: buildPanelLineSegments(points, "dY", zoomKey),
      j: buildPanelLineSegments(points, "jY", zoomKey)
    }
  };
}

function buildBollPanel(candles = [], zoomKey = "wide") {
  const points = candles.map((item, index) => ({
    key: `boll-${item.key || index}`,
    upperY: Number.isFinite(Number(item.bollUpperY)) ? Math.max(6, Math.min(86, Number(item.bollUpperY) / 2.7)) : null,
    lowerY: Number.isFinite(Number(item.bollLowerY)) ? Math.max(6, Math.min(86, Number(item.bollLowerY) / 2.7)) : null,
    midY: Number.isFinite(Number(item.ma20Y)) ? Math.max(6, Math.min(86, Number(item.ma20Y) / 2.7)) : null
  }));
  return {
    items: [],
    lines: {
      upper: buildPanelLineSegments(points, "upperY", zoomKey),
      lower: buildPanelLineSegments(points, "lowerY", zoomKey),
      mid: buildPanelLineSegments(points, "midY", zoomKey)
    }
  };
}

function buildIndicatorPanel(candles = [], key = "vol", zoomKey = "wide") {
  const meta = getIndicatorPanelMeta(key);
  if (meta.key === "hide") {
    return { type: "hide", label: meta.label, visible: false, items: [], lines: {} };
  }
  if (meta.key === "macd") {
    const macd = buildMacdPanel(candles, zoomKey);
    return { type: "macd", label: meta.label, visible: true, items: macd.items, lines: macd.lines };
  }
  if (meta.key === "boll") {
    const boll = buildBollPanel(candles, zoomKey);
    return { type: "boll", label: meta.label, visible: true, items: boll.items, lines: boll.lines };
  }
  if (meta.key === "rsi") {
    const rsi = buildRsiPanel(candles, zoomKey);
    return { type: "rsi", label: meta.label, visible: true, items: rsi.items, lines: rsi.lines };
  }
  if (meta.key === "kdj") {
    const kdj = buildKdjPanel(candles, zoomKey);
    return { type: "kdj", label: meta.label, visible: true, items: kdj.items, lines: kdj.lines };
  }
  return {
    type: "vol",
    label: meta.label,
    visible: true,
    items: buildVolPanel(candles),
    lines: {}
  };
}

function getHistorySlice(historyCache = {}, marketKey, timeframeKey) {
  const marketCache = historyCache[marketKey] || {};
  return marketCache[timeframeKey] || null;
}

function markSelectedCandles(candles, selectedKey, fallbackIndex) {
  if (!candles.length) return [];
  const safeIndex = Math.max(0, Math.min(candles.length - 1, Number(fallbackIndex || candles.length - 1)));
  const fallbackKey = (candles[safeIndex] || candles[candles.length - 1] || {}).key;
  const activeKey = selectedKey || fallbackKey;
  return candles.map((item) => Object.assign({}, item, {
    label: item.key === activeKey ? "问" : item.label,
    focus: item.key === activeKey || item.focus,
    selected: item.key === activeKey
  }));
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function pickValue(...values) {
  for (let index = 0; index < values.length; index += 1) {
    if (hasValue(values[index])) return values[index];
  }
  return undefined;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeTrainingPrescription(value, fallbackPrescription = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (hasValue(value)) return { action: String(value).trim() };
  return {
    title: fallbackPrescription.title || "",
    action: fallbackPrescription.boundaryPractice || "",
    watchPoint: fallbackPrescription.watchPoint || "",
    firstQuestion: fallbackPrescription.firstQuestion || ""
  };
}

function cleanText(value, maxLength = 180) {
  const text = String(value || "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

const KLINE_ENTRY_SOURCE_LABELS = {
  living_mirror: "活镜带入",
  report: "报告带入",
  trade_review: "复盘带入",
  review_focus: "复盘带入",
  kline_review: "复盘回练",
  mirror_challenge: "镜像挑战",
  zhixing: "知行补练",
  legacy_simulator: "旧入口转入",
  training: "训练带入"
};

function normalizeKlineMindMarketKey(value, fallback = "cn_equity") {
  const raw = cleanText(value || fallback, 40).toLowerCase();
  if (MARKET_CATALOG[raw]) return raw;
  if (["a", "a股", "cn", "china", "cn_a", "cn-a", "china_a", "china-a"].includes(raw)) {
    return "cn_equity";
  }
  return MARKET_CATALOG[fallback] ? fallback : "cn_equity";
}

function normalizeKlineMindSceneId(value = "") {
  const sceneId = cleanText(value, 80);
  return sceneId.indexOf("scene-") === 0 ? sceneId : "";
}

function normalizeKlineMindEntryContext(options = {}, fallback = {}) {
  const sourceType = cleanText(pickValue(
    options.sourceType,
    options.source_type,
    fallback.sourceType,
    fallback.source_type
  ), 80);
  const fallbackTimeframe = normalizeKlineMindTimeframeKey(pickValue(
    fallback.timeframeKey,
    fallback.timeframe,
    fallback.period
  ), "1d");
  const timeframeKey = normalizeKlineMindTimeframeKey(pickValue(
    options.timeframeKey,
    options.timeframe_key,
    options.timeframe,
    options.period,
    fallback.timeframeKey,
    fallback.timeframe_key,
    fallback.timeframe,
    fallback.period
  ), fallbackTimeframe);
  const marketKey = normalizeKlineMindMarketKey(pickValue(
    options.marketKey,
    options.market_key,
    options.market,
    fallback.marketKey,
    fallback.market_key,
    fallback.market
  ), normalizeKlineMindMarketKey(pickValue(fallback.marketKey, fallback.market_key, fallback.market), "cn_equity"));
  const scenarioId = normalizeKlineMindSceneId(pickValue(
    options.sceneId,
    options.scene_id,
    options.scenarioId,
    options.scenario_id,
    options.sliceSeed,
    options.slice_seed,
    fallback.sceneId,
    fallback.scene_id,
    fallback.scenarioId,
    fallback.scenario_id,
    fallback.sliceSeed,
    fallback.slice_seed
  ));
  const symbol = cleanText(pickValue(
    options.symbol,
    options.code,
    options.instrument,
    fallback.symbol,
    fallback.code,
    fallback.instrument
  ), 40);

  return {
    sourceType,
    source_type: sourceType,
    entrySourceLabel: KLINE_ENTRY_SOURCE_LABELS[sourceType] || "",
    entry_source_label: KLINE_ENTRY_SOURCE_LABELS[sourceType] || "",
    scenarioId,
    scenario_id: scenarioId,
    sliceSeed: scenarioId,
    slice_seed: scenarioId,
    marketKey,
    market_key: marketKey,
    timeframeKey,
    timeframe_key: timeframeKey,
    symbol
  };
}

function mergeKlineMindEntryContext(record = {}, entryContext = {}) {
  const normalized = normalizeKlineMindEntryContext(entryContext, record);
  const merged = Object.assign({}, record);
  [
    "sourceType",
    "source_type",
    "entrySourceLabel",
    "entry_source_label",
    "marketKey",
    "market_key",
    "timeframeKey",
    "timeframe_key",
    "symbol"
  ].forEach((key) => {
    if (hasValue(normalized[key])) merged[key] = normalized[key];
  });
  if (hasValue(normalized.scenarioId)) {
    merged.scenarioId = normalized.scenarioId;
    merged.scenario_id = normalized.scenarioId;
    merged.sliceSeed = normalized.scenarioId;
    merged.slice_seed = normalized.scenarioId;
  }
  return merged;
}

function cleanEventText(value, maxLength = 180) {
  return cleanText(value, maxLength);
}

function normalizeDecisionInterval(value) {
  const number = Number(value || 5);
  if (!Number.isFinite(number)) return 5;
  return Math.max(3, Math.min(10, Math.round(number)));
}

function buildRuntimeViewport(candles = [], currentIndex = 0, zoomKey = "wide", panOffset = 0) {
  if (!Array.isArray(candles) || !candles.length) {
    return {
      startIndex: 0,
      endIndex: 0,
      rightBoundaryIndex: 0,
      panOffset: 0,
      maxPanOffset: 0,
      capacity: 0,
      barStepRpx: 1
    };
  }
  const safeIndex = Math.max(0, Math.min(candles.length - 1, Number(currentIndex || 0)));
  const capacity = Math.max(1, Math.min(safeIndex + 1, getChartViewportCapacity(zoomKey)));
  const maxPanOffset = Math.max(0, safeIndex - capacity + 1);
  const safePanOffset = Math.max(0, Math.min(maxPanOffset, Math.round(Number(panOffset || 0))));
  const endIndex = Math.max(capacity - 1, safeIndex - safePanOffset);
  const startIndex = Math.max(0, endIndex - capacity + 1);
  const geometry = getChartGeometry(zoomKey);
  return {
    startIndex,
    endIndex,
    rightBoundaryIndex: safeIndex,
    panOffset: safePanOffset,
    maxPanOffset,
    capacity,
    barStepRpx: geometry.candleWidth + geometry.gap
  };
}

function buildRuntimeVisibleCandles(candles = [], viewport = {}) {
  if (!Array.isArray(candles) || !candles.length) return [];
  const startIndex = Math.max(0, Number(viewport.startIndex || 0));
  const endIndex = Math.max(startIndex, Number(viewport.endIndex || startIndex));
  return candles.slice(startIndex, endIndex + 1).map((item, index) => Object.assign({}, item, {
    runtimeIndex: startIndex + index
  }));
}

function normalizeInitialVisibleCount(value, totalCandles) {
  const total = Math.max(0, Number(totalCandles || 0));
  if (!total) return 0;
  const number = Number(value || 1);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.min(total, Math.round(number)));
}

function getInitialKlineVisibleCount(session = {}) {
  const candles = Array.isArray(session.candles) ? session.candles : [];
  if (!candles.length) return 0;
  const windowSize = Number(session.chartWindowSize || DEFAULT_VISIBLE_CANDLES);
  const safeWindowSize = Number.isFinite(windowSize) ? windowSize : DEFAULT_VISIBLE_CANDLES;
  const target = Math.max(96, Math.min(180, Math.round(safeWindowSize)));
  return Math.min(candles.length, target);
}

function normalizeRuntimeAction(action) {
  const value = String(action || "HOLD").toUpperCase();
  if (value === "ACT" || value === "BUY") return "ACT";
  if (value === "AVOID" || value === "SELL") return "AVOID";
  return "HOLD";
}

function buildSessionMetrics(decisions = []) {
  const safeDecisions = Array.isArray(decisions) ? decisions : [];
  return {
    decisionCount: safeDecisions.length,
    actionCount: safeDecisions.filter((item) => item.action === "ACT").length,
    avoidCount: safeDecisions.filter((item) => item.action === "AVOID").length,
    holdCount: safeDecisions.filter((item) => item.action === "HOLD").length,
    positionSize: 0,
    totalPnl: 0,
    maxDrawdown: 0
  };
}

function shouldRuntimeRequireDecision(currentIndex, decisionInterval) {
  const index = Number(currentIndex || 0);
  return index > 0 && index % normalizeDecisionInterval(decisionInterval) === 0;
}

function buildRuntimeState(baseRuntime = {}, patch = {}) {
  const runtime = Object.assign({}, baseRuntime, patch);
  const candles = Array.isArray(runtime.candles) ? runtime.candles : [];
  const safeIndex = candles.length
    ? Math.max(0, Math.min(candles.length - 1, Number(runtime.currentIndex || 0)))
    : 0;
  const zoomKey = runtime.chartZoomKey || "wide";
  const viewport = buildRuntimeViewport(candles, safeIndex, zoomKey, runtime.chartPanOffset);
  const visibleCandles = projectCandlesToVisiblePriceRange(buildRuntimeVisibleCandles(candles, viewport));
  const activeCandle = candles[safeIndex] ? Object.assign({}, candles[safeIndex], { runtimeIndex: safeIndex }) : (visibleCandles[visibleCandles.length - 1] || null);
  const hasDecisionForCurrentIndex = Number(runtime.lastDecisionIndex) === safeIndex;
  const mustDecide = !!runtime.lockedUntilDecision || (!hasDecisionForCurrentIndex && shouldRuntimeRequireDecision(safeIndex, runtime.decisionInterval));
  return Object.assign({}, runtime, {
    currentIndex: safeIndex,
    visibleCandles,
    activeCandle,
    chartViewport: viewport,
    chartPanOffset: viewport.panOffset,
    chartBoardStyle: getChartBoardStyle(visibleCandles.length, zoomKey),
    chartScrollLeft: 0,
    indicatorOverlay: buildIndicatorOverlay(visibleCandles, zoomKey, runtime.mainIndicatorKey || "ma"),
    indicatorPanel: buildIndicatorPanel(visibleCandles, runtime.indicatorPanelKey || "vol", zoomKey),
    sessionMetrics: buildSessionMetrics(runtime.decisionTimeline || []),
    mustDecide,
    lockedUntilDecision: mustDecide
  });
}

function startKlineTrainingRuntime(session = {}, options = {}) {
  const candles = Array.isArray(session.candles) ? session.candles : [];
  const initialVisibleCount = normalizeInitialVisibleCount(options.initialVisibleCount, candles.length);
  return buildRuntimeState({
    trainingSessionId: cleanEventText(options.trainingSessionId || `kline-session-${Date.now()}`, 160),
    simulationMode: "blind_step_replay",
    sliceSeed: cleanEventText(options.sliceSeed || ((session.historySlice || {}).seed) || ((session.historySlice || {}).sliceSeed) || "", 120),
    marketKey: ((session.market || {}).key) || "",
    timeframeKey: session.timeframeKey || "",
    chartZoomKey: session.chartZoomKey || "wide",
    mainIndicatorKey: options.initialMainIndicatorKey || session.defaultMainIndicatorKey || "ma",
    indicatorPanelKey: options.initialIndicatorKey || session.defaultIndicatorKey || "vol",
    decisionInterval: normalizeDecisionInterval(options.decisionInterval),
    currentIndex: Math.max(0, initialVisibleCount - 1),
    totalCandles: candles.length,
    candles,
    chartPanOffset: 0,
    chartViewport: null,
    decisionTimeline: [],
    emotionBadges: [],
    riskHints: [],
    coachHints: [],
    sessionMetrics: buildSessionMetrics(),
    lastDecisionIndex: -1,
    lockedUntilDecision: false,
    blockedReason: ""
  });
}

function setKlineRuntimeIndicator(runtime = {}, indicatorKey = "vol") {
  return buildRuntimeState(runtime, {
    indicatorPanelKey: getIndicatorPanelMeta(indicatorKey).key
  });
}

function setKlineRuntimeMainIndicator(runtime = {}, indicatorKey = "ma") {
  return buildRuntimeState(runtime, {
    mainIndicatorKey: getMainIndicatorMeta(indicatorKey).key
  });
}

function setKlineRuntimeChartZoom(runtime = {}, chartZoomKey = "wide") {
  return buildRuntimeState(runtime, {
    chartZoomKey: getChartZoomMeta(chartZoomKey).key
  });
}

function setKlineRuntimeViewportPan(runtime = {}, panOffset = 0) {
  return buildRuntimeState(runtime, {
    chartPanOffset: panOffset
  });
}

function buildEmotionBadge(decision = {}) {
  const text = `${decision.action || ""} ${decision.reactionDirection || ""} ${decision.firstReaction || ""} ${decision.boundaryChoice || ""}`;
  if (/不甘|夺回|回本|扳回/.test(text)) return { type: "REVENGE", label: "不甘", text: "不顺后想立刻夺回节奏。" };
  if (/追|错过|贪|急|证明/.test(text) || decision.action === "ACT" || decision.reactionDirection === "act") {
    return { type: "IMPULSE", label: "冲动", text: "想马上行动时，先照见怕错过。" };
  }
  if (/怕|恐|割|退出|躲/.test(text) || decision.action === "AVOID" || decision.reactionDirection === "avoid") {
    return { type: "FEAR", label: "惧念", text: "想躲开时，先分清事实与不安。" };
  }
  if (/犹豫|不敢|等确认/.test(text)) return { type: "HESITATION", label: "犹疑", text: "知而未行时，先看见停滞处。" };
  return { type: "OBSERVE", label: "观照", text: "先记录，再继续观察。" };
}

function buildRiskHint(emotionBadge = null) {
  const type = (emotionBadge || {}).type || "";
  if (type === "IMPULSE") return { level: "medium", text: "出现冲动：先停十秒，再回到原边界。" };
  if (type === "FEAR") return { level: "medium", text: "出现惧念：先看事实，再记录不安。" };
  if (type === "REVENGE") return { level: "high", text: "出现不甘：本轮只记录，不追加动作。" };
  if (type === "HESITATION") return { level: "low", text: "出现犹疑：写下知道却未行动的原因。" };
  return { level: "low", text: "继续只做训练记录，不作当下判断。" };
}

function buildCoachHint(decision = {}, emotionBadge = null) {
  const action = normalizeRuntimeAction(decision.action);
  const label = (emotionBadge || {}).label || "观照";
  return {
    title: `${label}已记录`,
    text: action === "HOLD"
      ? "你先停下来观察，这一刻先守住了记录。"
      : "这一念已经写入记录，下一步先停十秒，再看是否仍合边界。"
  };
}

function advanceKlineTrainingRuntime(runtime = {}) {
  if (runtime.lockedUntilDecision || runtime.mustDecide) {
    return Object.assign({}, runtime, {
      blockedReason: "decision_required",
      mustDecide: true,
      lockedUntilDecision: true
    });
  }
  const total = Number(runtime.totalCandles || (runtime.candles || []).length || 0);
  const nextIndex = Math.min(Math.max(0, total - 1), Number(runtime.currentIndex || 0) + 1);
  return buildRuntimeState(runtime, {
    currentIndex: nextIndex,
    chartPanOffset: 0,
    blockedReason: ""
  });
}

function recordKlineTrainingDecision(runtime = {}, decision = {}) {
  const activeCandle = runtime.activeCandle || (runtime.candles || [])[runtime.currentIndex] || {};
  const safeDecision = {
    id: `decision-${runtime.trainingSessionId || "local"}-${runtime.currentIndex}-${(runtime.decisionTimeline || []).length + 1}`,
    sessionId: runtime.trainingSessionId || "",
    index: Number(runtime.currentIndex || 0),
    action: normalizeRuntimeAction(decision.action),
    selectedCandleKey: cleanEventText(decision.selectedCandleKey || activeCandle.key || "", 80),
    reactionDirection: cleanEventText(decision.reactionDirection, 40),
    firstReaction: cleanEventText(decision.firstReaction, 160),
    boundaryChoice: cleanEventText(decision.boundaryChoice, 120),
    createdAt: decision.createdAt || Date.now()
  };
  const emotionBadge = buildEmotionBadge(safeDecision);
  const riskHint = buildRiskHint(emotionBadge);
  const coachHint = buildCoachHint(safeDecision, emotionBadge);
  return buildRuntimeState(runtime, {
    decisionTimeline: (runtime.decisionTimeline || []).concat([safeDecision]),
    emotionBadges: emotionBadge ? (runtime.emotionBadges || []).concat([emotionBadge]) : (runtime.emotionBadges || []),
    riskHints: (runtime.riskHints || []).concat([riskHint]),
    coachHints: (runtime.coachHints || []).concat([coachHint]),
    lastDecisionIndex: Number(runtime.currentIndex || 0),
    mustDecide: false,
    lockedUntilDecision: false,
    blockedReason: ""
  });
}

function buildKlineTrainingRecordPatch(runtime = {}) {
  const decisions = Array.isArray(runtime.decisionTimeline) ? runtime.decisionTimeline : [];
  const lastDecision = decisions[decisions.length - 1] || {};
  const activeCandle = runtime.activeCandle || (runtime.candles || [])[runtime.currentIndex] || {};
  return {
    trainingSessionId: cleanEventText(runtime.trainingSessionId, 160),
    simulationMode: cleanEventText(runtime.simulationMode || "blind_step_replay", 80),
    sliceSeed: cleanEventText(runtime.sliceSeed, 120),
    selectedCandleKey: cleanEventText(lastDecision.selectedCandleKey || activeCandle.key || "", 80),
    reactionDirection: cleanEventText(lastDecision.reactionDirection, 40),
    firstReaction: cleanEventText(lastDecision.firstReaction, 160),
    boundaryChoice: cleanEventText(lastDecision.boundaryChoice, 120),
    decisionTimeline: decisions,
    emotionBadges: Array.isArray(runtime.emotionBadges) ? runtime.emotionBadges : [],
    riskHints: Array.isArray(runtime.riskHints) ? runtime.riskHints : [],
    coachHints: Array.isArray(runtime.coachHints) ? runtime.coachHints : [],
    sessionMetrics: buildSessionMetrics(decisions)
  };
}

function normalizeBooleanValue(value) {
  if (value === true || value === false) return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return false;
}

function pickSamplingPayload(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const candidate = pickValue(
    input.samplingResult,
    input.sampling_result,
    input.sample,
    input.result,
    input.data
  );
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) return candidate;
  return input;
}

function buildSamplingMetadata(payload = {}) {
  const segmentId = cleanText(pickValue(payload.segmentId, payload.segment_id), 100);
  const trainingPackId = cleanText(pickValue(payload.trainingPackId, payload.training_pack_id), 100);
  const errorType = cleanText(pickValue(payload.errorType, payload.error_type), 100);
  const sceneTags = normalizeList(pickValue(payload.sceneTags, payload.scene_tags));
  const startDate = cleanText(pickValue(payload.startDate, payload.start_date), 40);
  const endDate = cleanText(pickValue(payload.endDate, payload.end_date), 40);
  const fallbackUsed = normalizeBooleanValue(pickValue(payload.fallbackUsed, payload.fallback_used, false));
  const fallbackReason = cleanText(pickValue(payload.fallbackReason, payload.fallback_reason), 160);

  return {
    segmentId,
    segment_id: segmentId,
    trainingPackId,
    training_pack_id: trainingPackId,
    errorType,
    error_type: errorType,
    sceneTags,
    scene_tags: sceneTags,
    symbol: cleanText(payload.symbol, 60),
    name: cleanText(payload.name, 100),
    period: cleanText(payload.period || "1d", 40),
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    fallbackUsed,
    fallback_used: fallbackUsed,
    fallbackReason,
    fallback_reason: fallbackReason,
    source: cleanText(payload.source || (fallbackUsed ? "fallback" : "segment"), 80)
  };
}

function normalizeKlineSamplingResult(input = {}) {
  const payload = pickSamplingPayload(input);
  if (!payload) return null;
  const explicitSamplingPayload = !!(
    input.samplingResult ||
    input.sampling_result ||
    input.sample ||
    input.result ||
    input.data
  );
  const rawBars = Array.isArray(payload.bars)
    ? payload.bars
    : Array.isArray(payload.candles)
      ? payload.candles
      : [];
  const hasSamplingIdentity = explicitSamplingPayload ||
    hasValue(pickValue(payload.segmentId, payload.segment_id)) ||
    rawBars.length > 0 ||
    normalizeBooleanValue(pickValue(payload.fallbackUsed, payload.fallback_used, false)) ||
    hasValue(pickValue(payload.fallbackReason, payload.fallback_reason));
  if (!hasSamplingIdentity) return null;
  const metadata = buildSamplingMetadata(payload);
  const bars = rawBars;
  const samplingStatus = metadata.fallbackUsed
    ? "fallback"
    : metadata.segmentId || bars.length
      ? "matched"
      : "";

  return Object.assign({}, metadata, {
    bars,
    samplingResult: metadata,
    sampling_result: metadata,
    samplingStatus,
    sampling_status: samplingStatus
  });
}

function buildSamplingHistorySlice(samplingResult = {}) {
  if (!samplingResult || !Array.isArray(samplingResult.bars) || !samplingResult.bars.length) return null;
  return {
    source: samplingResult.source || (samplingResult.fallbackUsed ? "fallback" : "segment"),
    symbol: samplingResult.symbol || "",
    name: samplingResult.name || "",
    start: samplingResult.startDate || samplingResult.start_date || "",
    end: samplingResult.endDate || samplingResult.end_date || "",
    startDate: samplingResult.startDate || samplingResult.start_date || "",
    start_date: samplingResult.start_date || samplingResult.startDate || "",
    endDate: samplingResult.endDate || samplingResult.end_date || "",
    end_date: samplingResult.end_date || samplingResult.endDate || "",
    period: samplingResult.period || "1d",
    data_range: {
      start: samplingResult.startDate || samplingResult.start_date || "",
      end: samplingResult.endDate || samplingResult.end_date || ""
    },
    candles: samplingResult.bars
  };
}

function attachSamplingMetadata(target = {}, input = {}) {
  const normalized = normalizeKlineSamplingResult(input);
  if (!normalized) return target;
  const samplingSourceLabel = normalized.fallbackUsed ? "兜底片段" : "匹配片段";
  const samplingSceneTagsText = (normalized.sceneTags || normalized.scene_tags || []).join(" / ");
  return Object.assign({}, target, {
    segmentId: normalized.segmentId,
    segment_id: normalized.segment_id,
    trainingPackId: normalized.trainingPackId || target.trainingPackId || target.training_pack_id || "",
    training_pack_id: normalized.training_pack_id || target.training_pack_id || target.trainingPackId || "",
    samplingResult: normalized.samplingResult,
    sampling_result: normalized.sampling_result,
    fallbackUsed: normalized.fallbackUsed,
    fallback_used: normalized.fallback_used,
    fallbackReason: normalized.fallbackReason,
    fallback_reason: normalized.fallback_reason,
    samplingStatus: normalized.samplingStatus,
    sampling_status: normalized.sampling_status,
    samplingSourceLabel,
    sampling_source_label: samplingSourceLabel,
    samplingSceneTagsText,
    sampling_scene_tags_text: samplingSceneTagsText
  });
}

function buildKlineSamplingRequest(context = {}, options = {}) {
  const sourceType = cleanText(pickValue(context.sourceType, context.source_type, options.sourceType, options.source_type), 60);
  const errorType = cleanText(pickValue(context.errorType, context.error_type, options.errorType, options.error_type), 100);
  const sceneTags = normalizeList(pickValue(context.sceneTags, context.scene_tags, options.sceneTags, options.scene_tags));
  const trainingPackId = cleanText(pickValue(context.trainingPackId, context.training_pack_id, context.packId, context.pack_id, options.trainingPackId, options.training_pack_id), 100);
  const period = cleanText(pickValue(options.period, context.period, context.timeframeKey, context.timeframe_key, "1d"), 40);
  const difficulty = cleanText(pickValue(options.difficulty, context.difficulty), 60);
  const excludeSegmentIds = normalizeList(pickValue(options.excludeSegmentIds, options.exclude_segment_ids, context.excludeSegmentIds, context.exclude_segment_ids));

  return {
    sourceType,
    source_type: sourceType,
    errorType,
    error_type: errorType,
    sceneTags,
    scene_tags: sceneTags,
    trainingPackId,
    training_pack_id: trainingPackId,
    difficulty,
    period,
    excludeSegmentIds,
    exclude_segment_ids: excludeSegmentIds
  };
}

function normalizeTrainingLength(value, fallback = 60) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.max(1, Math.min(300, Math.floor(number)));
}

function formatDateRangeText(startDate = "", endDate = "") {
  if (startDate && endDate) return `${startDate} 至 ${endDate}`;
  return startDate || endDate || "待揭示";
}

function buildCustomSessionMeta(input = {}) {
  const symbol = cleanText(pickValue(input.symbol, input.code, input.instrument), 60);
  const period = cleanText(pickValue(input.period, input.timeframeKey, input.timeframe_key, "1d"), 40);
  const startDate = cleanText(pickValue(input.startDate, input.start_date, input.start), 40);
  const endDate = cleanText(pickValue(input.endDate, input.end_date, input.end), 40);
  const trainingLength = normalizeTrainingLength(pickValue(input.trainingLength, input.training_length, input.windowSize, input.window_size, input.limit), 60);
  const customVisibleCount = normalizeTrainingLength(pickValue(input.customVisibleCount, input.custom_visible_count, 1), 1);
  const hiddenSymbolInput = pickValue(input.hiddenSymbol, input.hidden_symbol);
  const hiddenDateRangeInput = pickValue(input.hiddenDateRange, input.hidden_date_range);
  const hiddenSymbol = hiddenSymbolInput === undefined ? true : normalizeBooleanValue(hiddenSymbolInput);
  const hiddenDateRange = hiddenDateRangeInput === undefined ? true : normalizeBooleanValue(hiddenDateRangeInput);
  const revealedDateRangeText = formatDateRangeText(startDate, endDate);
  const nextAction = "先看事实，再记录第一念。";
  const sceneTags = ["自选盲练"];
  const trainingPrescription = {
    title: "自选盲练",
    action: nextAction
  };

  return {
    sourceType: "custom_session",
    source_type: "custom_session",
    errorType: "自选盲练",
    error_type: "自选盲练",
    sceneTags,
    scene_tags: sceneTags,
    trainingPrescription,
    training_prescription: trainingPrescription,
    nextAction,
    next_action: nextAction,
    expectedAction: nextAction,
    expected_action: nextAction,
    symbol,
    period,
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    trainingLength,
    training_length: trainingLength,
    hiddenSymbol,
    hidden_symbol: hiddenSymbol,
    hiddenDateRange,
    hidden_date_range: hiddenDateRange,
    customVisibleCount,
    custom_visible_count: customVisibleCount,
    customSourceLabel: "自选盲练",
    custom_source_label: "自选盲练",
    customSymbolText: hiddenSymbol ? "隐藏标的" : symbol || "待选择标的",
    custom_symbol_text: hiddenSymbol ? "隐藏标的" : symbol || "待选择标的",
    customDateRangeText: hiddenDateRange ? "隐藏真实日期" : revealedDateRangeText,
    custom_date_range_text: hiddenDateRange ? "隐藏真实日期" : revealedDateRangeText,
    revealedSymbolText: symbol || "待揭示",
    revealed_symbol_text: symbol || "待揭示",
    revealedDateRangeText,
    revealed_date_range_text: revealedDateRangeText
  };
}

const SPECIAL_TRAINING_PACKS = [
  {
    id: "chase_high_impulse",
    error_type: "追高冲动",
    title: "追高冲动专项",
    scene_tags: ["放量拉升", "假突破", "冲高回落"],
    training_goal: "看到快速上涨时，不被“怕错过”牵动。",
    expected_action: "第一根放量不追，先观察",
    default_prompt: "先看事实：这是结构确认，还是怕错过在催你动？"
  },
  {
    id: "average_down_impulse",
    error_type: "补仓冲动",
    title: "补仓冲动专项",
    scene_tags: ["下跌中继", "反抽诱多"],
    training_goal: "亏损中不靠补仓证明自己。",
    expected_action: "不在破位亏损中补仓",
    default_prompt: "先看事实：这是修复，还是下跌中的反抽？"
  },
  {
    id: "sell_fly_regret",
    error_type: "卖飞懊悔",
    title: "卖飞懊悔专项",
    scene_tags: ["洗盘后走强", "趋势中继"],
    training_goal: "动作后不因懊悔追回。",
    expected_action: "按规则处理，不追回情绪单",
    default_prompt: "先看事实：你是在重新确认规则，还是被懊悔牵回？"
  },
  {
    id: "unplanned_trade",
    error_type: "计划外交易",
    title: "计划外交易专项",
    scene_tags: ["横盘噪音", "突然异动"],
    training_goal: "无计划时不动手。",
    expected_action: "无计划不交易",
    default_prompt: "先看事实：这一步是否已经写进计划？"
  }
];

function normalizeSpecialTrainingPack(pack = {}) {
  const id = cleanText(pickValue(pack.id, pack.packId, pack.pack_id, pack.trainingPackId, pack.training_pack_id), 100);
  const errorType = cleanText(pickValue(pack.errorType, pack.error_type), 80);
  const title = cleanText(pack.title, 100) || (errorType ? `${errorType}专项` : "专项训练");
  const sceneTags = normalizeList(pickValue(pack.sceneTags, pack.scene_tags, pack.sceneText, pack.scene_text));
  const trainingGoal = cleanText(pickValue(pack.trainingGoal, pack.training_goal), 180);
  const expectedAction = cleanText(pickValue(pack.expectedAction, pack.expected_action, pack.nextAction, pack.next_action), 160);
  const defaultPrompt = cleanText(pickValue(pack.defaultPrompt, pack.default_prompt), 180);
  const trainingPrescription = normalizeTrainingPrescription(
    pickValue(pack.trainingPrescription, pack.training_prescription),
    {
      title,
      boundaryPractice: expectedAction,
      watchPoint: sceneTags.join(" / "),
      firstQuestion: defaultPrompt
    }
  );

  return {
    id,
    packId: id,
    pack_id: id,
    trainingPackId: id,
    training_pack_id: id,
    title,
    trainingPackTitle: title,
    training_pack_title: title,
    errorType,
    error_type: errorType,
    sceneTags,
    scene_tags: sceneTags,
    sceneText: sceneTags.length ? sceneTags.join(" / ") : "待补充",
    scene_text: sceneTags.length ? sceneTags.join(" / ") : "待补充",
    trainingGoal,
    training_goal: trainingGoal,
    expectedAction,
    expected_action: expectedAction,
    nextAction: expectedAction,
    next_action: expectedAction,
    defaultPrompt,
    default_prompt: defaultPrompt,
    trainingPrescription,
    training_prescription: trainingPrescription
  };
}

function listSpecialTrainingPacks() {
  return SPECIAL_TRAINING_PACKS.map((pack) => normalizeSpecialTrainingPack(pack));
}

function getSpecialTrainingPack(value = "") {
  const key = cleanText(value && (value.errorType || value.error_type || value.id || value.packId || value.pack_id || value.trainingPackId || value.training_pack_id || value), 120);
  if (!key) return null;
  return listSpecialTrainingPacks().find((pack) => (
    pack.id === key ||
    pack.packId === key ||
    pack.trainingPackId === key ||
    pack.errorType === key ||
    pack.error_type === key ||
    pack.title === key
  )) || null;
}

function buildSpecialTrainingSessionMeta(value = {}) {
  const pack = getSpecialTrainingPack(value);
  const fallbackErrorType = cleanText(value && (value.errorType || value.error_type || value), 80);
  const normalized = pack || normalizeSpecialTrainingPack({
    error_type: fallbackErrorType,
    title: fallbackErrorType ? `${fallbackErrorType}专项` : "",
    scene_tags: normalizeList(value && (value.sceneTags || value.scene_tags)),
    training_goal: value && (value.trainingGoal || value.training_goal),
    expected_action: value && (value.expectedAction || value.expected_action || value.nextAction || value.next_action),
    default_prompt: value && (value.defaultPrompt || value.default_prompt),
    training_prescription: value && (value.trainingPrescription || value.training_prescription)
  });

  return {
    sourceType: "special_training",
    source_type: "special_training",
    errorType: normalized.errorType,
    error_type: normalized.error_type,
    sceneTags: normalized.sceneTags,
    scene_tags: normalized.scene_tags,
    trainingGoal: normalized.trainingGoal,
    training_goal: normalized.training_goal,
    expectedAction: normalized.expectedAction,
    expected_action: normalized.expected_action,
    nextAction: normalized.nextAction,
    next_action: normalized.next_action,
    defaultPrompt: normalized.defaultPrompt,
    default_prompt: normalized.default_prompt,
    trainingPrescription: normalized.trainingPrescription,
    training_prescription: normalized.training_prescription,
    trainingPackId: normalized.trainingPackId,
    training_pack_id: normalized.training_pack_id,
    trainingPackTitle: normalized.trainingPackTitle,
    training_pack_title: normalized.training_pack_title
  };
}

function buildSpecialTrainingContext(specialTraining = {}) {
  const sourceType = pickValue(specialTraining.sourceType, specialTraining.source_type);
  if (sourceType !== "special_training") return null;
  const meta = buildSpecialTrainingSessionMeta(specialTraining);
  const sceneTags = normalizeList(pickValue(specialTraining.sceneTags, specialTraining.scene_tags, meta.sceneTags));
  const expectedAction = cleanText(pickValue(specialTraining.expectedAction, specialTraining.expected_action, specialTraining.nextAction, specialTraining.next_action, meta.expectedAction), 160);
  const trainingPrescription = normalizeTrainingPrescription(
    pickValue(specialTraining.trainingPrescription, specialTraining.training_prescription, meta.trainingPrescription),
    { title: meta.trainingPackTitle, boundaryPractice: expectedAction }
  );

  return Object.assign({}, meta, {
    sceneTags,
    scene_tags: sceneTags,
    expectedAction,
    expected_action: expectedAction,
    nextAction: expectedAction,
    next_action: expectedAction,
    trainingPrescription,
    training_prescription: trainingPrescription
  });
}

function buildCustomSessionContext(customSession = {}) {
  const sourceType = pickValue(customSession.sourceType, customSession.source_type);
  const hasCustomInput = sourceType === "custom_session" ||
    hasValue(pickValue(customSession.symbol, customSession.code, customSession.instrument)) ||
    hasValue(pickValue(customSession.startDate, customSession.start_date, customSession.start)) ||
    hasValue(pickValue(customSession.endDate, customSession.end_date, customSession.end)) ||
    hasValue(pickValue(customSession.trainingLength, customSession.training_length));
  if (!hasCustomInput) return null;
  return buildCustomSessionMeta(customSession);
}

function buildReviewFocusContext(reviewFocus = {}, prescription = {}) {
  const sourceType = pickValue(reviewFocus.sourceType, reviewFocus.source_type);
  const errorType = pickValue(
    reviewFocus.errorType,
    reviewFocus.error_type,
    reviewFocus.mainErrorType,
    reviewFocus.main_error_type,
    reviewFocus.relatedMirror,
    reviewFocus.relatedPersonality,
    reviewFocus.personalityType
  );
  const rawSceneTags = normalizeList(pickValue(reviewFocus.sceneTags, reviewFocus.scene_tags));
  const fallbackSceneTags = normalizeList(pickValue(
    reviewFocus.triggerScene,
    reviewFocus.trigger_scene,
    reviewFocus.stageName,
    reviewFocus.stageGate,
    errorType
  ));
  const sceneTags = rawSceneTags.length ? rawSceneTags : fallbackSceneTags;
  const rawTrainingPrescription = pickValue(
    reviewFocus.trainingPrescription,
    reviewFocus.training_prescription,
    reviewFocus.trainingAction,
    reviewFocus.training_action,
    reviewFocus.nextRule,
    reviewFocus.next_rule
  );
  const rawNextAction = pickValue(
    reviewFocus.nextAction,
    reviewFocus.next_action,
    reviewFocus.nextRule,
    reviewFocus.next_rule,
    reviewFocus.trainingAction,
    reviewFocus.training_action,
    rawTrainingPrescription && typeof rawTrainingPrescription === "object" ? rawTrainingPrescription.action : ""
  );
  const rawExpectedAction = pickValue(
    reviewFocus.expectedAction,
    reviewFocus.expected_action,
    rawNextAction
  );
  const executionPlanId = pickValue(
    reviewFocus.executionPlanId,
    reviewFocus.execution_plan_id,
    reviewFocus.planId,
    reviewFocus.plan_id
  );
  const sourceReviewId = pickValue(
    reviewFocus.sourceReviewId,
    reviewFocus.source_review_id,
    reviewFocus.reviewId,
    reviewFocus.review_id,
    reviewFocus.id
  );
  const explicitReviewFocus = sourceType === "review_focus";

  if (!explicitReviewFocus && !hasValue(errorType) && !sceneTags.length && !hasValue(rawTrainingPrescription) && !hasValue(rawNextAction) && !hasValue(sourceReviewId)) {
    return null;
  }

  const trainingPrescription = normalizeTrainingPrescription(rawTrainingPrescription, prescription);
  const nextAction = pickValue(rawNextAction, trainingPrescription.action);
  const expectedAction = pickValue(rawExpectedAction, nextAction);

  const context = {
    sourceType: "review_focus",
    source_type: "review_focus",
    errorType: errorType || "待照见",
    error_type: errorType || "待照见",
    trainingPrescription,
    training_prescription: trainingPrescription,
    sceneTags,
    scene_tags: sceneTags,
    nextAction: nextAction || "",
    next_action: nextAction || "",
    expectedAction: expectedAction || "",
    expected_action: expectedAction || ""
  };

  if (executionPlanId) {
    context.executionPlanId = executionPlanId;
    context.execution_plan_id = executionPlanId;
  }

  if (sourceReviewId) {
    context.sourceReviewId = sourceReviewId;
    context.source_review_id = sourceReviewId;
  }

  return context;
}

function pickSessionContext(session = {}) {
  const sourceType = pickValue(session.sourceType, session.source_type);
  if (sourceType === "custom_session") {
    return buildCustomSessionContext(session);
  }
  if (sourceType === "special_training") {
    return attachSamplingMetadata(buildSpecialTrainingContext(session), session);
  }
  if (sourceType !== "review_focus") return null;
  return attachSamplingMetadata({
    sourceType: "review_focus",
    source_type: "review_focus",
    errorType: pickValue(session.errorType, session.error_type, "待照见"),
    error_type: pickValue(session.errorType, session.error_type, "待照见"),
    trainingPrescription: pickValue(session.trainingPrescription, session.training_prescription, {}),
    training_prescription: pickValue(session.trainingPrescription, session.training_prescription, {}),
    sceneTags: normalizeList(pickValue(session.sceneTags, session.scene_tags)),
    scene_tags: normalizeList(pickValue(session.sceneTags, session.scene_tags)),
    nextAction: pickValue(session.nextAction, session.next_action, ""),
    next_action: pickValue(session.nextAction, session.next_action, ""),
    expectedAction: pickValue(session.expectedAction, session.expected_action, session.nextAction, session.next_action, ""),
    expected_action: pickValue(session.expectedAction, session.expected_action, session.nextAction, session.next_action, ""),
    executionPlanId: pickValue(session.executionPlanId, session.execution_plan_id, ""),
    execution_plan_id: pickValue(session.executionPlanId, session.execution_plan_id, ""),
    sourceReviewId: pickValue(session.sourceReviewId, session.source_review_id, ""),
    source_review_id: pickValue(session.sourceReviewId, session.source_review_id, "")
  }, session);
}

function buildTrainingMistakeCard(record = {}, context = null) {
  if (!context) return null;
  const trainingPrescription = context.trainingPrescription || context.training_prescription || {};
  const sceneTags = context.sceneTags || context.scene_tags || [];
  const executionResult = normalizeExecutionResult(
    record.executionResult,
    record.execution_result,
    record.executionLabel,
    record.execution_label,
    record.lawResult,
    record.law_result,
    record.completed ? "aligned" : "unclear"
  );
  return {
    title: "最明显执行偏离",
    errorType: context.errorType || context.error_type || "",
    error_type: context.error_type || context.errorType || "",
    sceneTags,
    scene_tags: sceneTags,
    firstReaction: record.firstReaction || "",
    boundaryChoice: record.boundaryChoice || "",
    insightLine: record.insightLine || "",
    executionResult,
    execution_result: executionResult,
    executionLabel: executionResult,
    execution_label: executionResult,
    trainingPrescription,
    training_prescription: trainingPrescription,
    nextAction: context.nextAction || context.next_action || "",
    next_action: context.next_action || context.nextAction || "",
    trainingGoal: context.trainingGoal || context.training_goal || "",
    training_goal: context.training_goal || context.trainingGoal || "",
    expectedAction: context.expectedAction || context.expected_action || context.nextAction || context.next_action || "",
    expected_action: context.expected_action || context.expectedAction || context.next_action || context.nextAction || "",
    trainingPackId: context.trainingPackId || context.training_pack_id || "",
    training_pack_id: context.training_pack_id || context.trainingPackId || "",
    trainingPackTitle: context.trainingPackTitle || context.training_pack_title || "",
    training_pack_title: context.training_pack_title || context.trainingPackTitle || "",
    segmentId: context.segmentId || context.segment_id || "",
    segment_id: context.segment_id || context.segmentId || "",
    samplingResult: context.samplingResult || context.sampling_result || null,
    sampling_result: context.sampling_result || context.samplingResult || null,
    fallbackUsed: context.fallbackUsed || context.fallback_used || false,
    fallback_used: context.fallback_used || context.fallbackUsed || false,
    fallbackReason: context.fallbackReason || context.fallback_reason || "",
    fallback_reason: context.fallback_reason || context.fallbackReason || ""
  };
}

function buildKlineMindSession({
  assessment = null,
  trainingDay = null,
  record = null,
  historyCache = {},
  reviewFocus = null,
  specialTraining = null,
  customSession = null,
  samplingResult = null
} = {}) {
  const day = clampDay((trainingDay || {}).day || (record || {}).day || 1);
  const personalityType = (assessment || {}).primary || "平衡型";
  const stagePlan = getPersonalityStagePlan(personalityType);
  const scenario = DAY_SCENARIOS[day] || DAY_SCENARIOS[1];
  const marketKey = (record || {}).marketKey || "cn_equity";
  const timeframeKey = normalizeKlineMindTimeframeKey((record || {}).timeframeKey);
  const timeframeMeta = TIMEFRAME_CATALOG.find((item) => item.key === timeframeKey) || TIMEFRAME_CATALOG[0];
  const chartZoomKey = (record || {}).chartZoomKey || "wide";
  const chartZoomMeta = getChartZoomMeta(chartZoomKey);
  const market = getMarketConfig(marketKey);
  const customSessionSource = customSession || (pickValue((record || {}).sourceType, (record || {}).source_type) === "custom_session" ? record : null);
  const customSessionContext = buildCustomSessionContext(customSessionSource || {});
  const normalizedSampling = normalizeKlineSamplingResult(pickValue(
    samplingResult,
    (record || {}).samplingResult,
    (record || {}).sampling_result,
    (reviewFocus || {}).samplingResult,
    (reviewFocus || {}).sampling_result,
    (specialTraining || {}).samplingResult,
    (specialTraining || {}).sampling_result
  ));
  const samplingHistorySlice = buildSamplingHistorySlice(normalizedSampling || {});
  const customHistorySlice = (customSessionSource || {}).historySlice || (customSessionSource || {}).slice;
  const historySlice = customHistorySlice || (record || {}).historySlice || samplingHistorySlice || getHistorySlice(historyCache, market.key, timeframeKey);
  const rawCandles = normalizeHistoryCandles(historySlice || {}, { windowSize: chartZoomMeta.windowSize });
  const selectedKey = (record || {}).selectedCandleKey || "";
  const prescription = getKlinePrescription(personalityType);
  const stageGate = getSixGate(stagePlan.stageKey);
  const candles = markSelectedCandles(rawCandles, selectedKey, scenario.focusIndex);
  const chartBoardStyle = getChartBoardStyle(candles.length, chartZoomMeta.key);
  const mainIndicatorKey = (record || {}).mainIndicatorKey || "ma";
  const indicatorOverlay = buildIndicatorOverlay(candles, chartZoomMeta.key, mainIndicatorKey);
  const selectedCandleKey = selectedKey || ((candles.find((item) => item.selected) || {}).key) || "";
  const reviewFocusContext = buildReviewFocusContext(reviewFocus || {}, prescription);
  const specialTrainingContext = buildSpecialTrainingContext(specialTraining || record || {});

  const session = {
    day,
    personalityType,
    secondaryType: (assessment || {}).secondary || "",
    title: scenario.title,
    subtitle: scenario.subtitle,
    prompt: scenario.prompt,
    scenarioId: scenario.id,
    market,
    marketOptions: buildMarketOptions(market.key),
    timeframeKey,
    timeframeLabel: timeframeMeta.label,
    timeframeOptions: buildTimeframeOptions(timeframeKey),
    chartZoomKey: chartZoomMeta.key,
    chartWindowSize: chartZoomMeta.windowSize,
    chartZoomOptions: buildChartZoomOptions(chartZoomMeta.key),
    chartBoardStyle,
    indicatorOverlay,
    defaultMainIndicatorKey: "ma",
    mainIndicatorOptions: MAIN_INDICATOR_OPTIONS,
    defaultIndicatorKey: "vol",
    indicatorPanelOptions: INDICATOR_PANEL_OPTIONS,
    chartOrientationHint: "横屏训练更稳，适合看更多 K 线；竖屏可放大少量细看。",
    indicatorCatalog: INDICATOR_CATALOG,
    historySlice: historySlice || null,
    hasHistoricalData: candles.length > 0,
    dataStatusText: candles.length
      ? normalizedSampling
        ? normalizedSampling.fallbackUsed ? "使用基础盲练兜底" : "已匹配训练片段"
        : "真实历史数据已载入"
      : "等待历史数据同步",
    marketQuestion: market.mindQuestion,
    marketGuardrail: market.guardrail,
    trainingMethods: KLINE_TRAINING_METHODS,
    personalityDrill: getPersonalityKlineDrill(personalityType),
    prescription,
    stagePlan,
    stageGate,
    gates: SIX_GATE_MAP.map((gate) => Object.assign({}, gate, GATE_TRAINING_ACTIONS[gate.key] || {}, {
      active: gate.key === stageGate.key
    })),
    candles,
    selectedCandleKey,
    reactionOptions: REACTION_OPTIONS,
    bodyOptions: BODY_OPTIONS,
    boundaryOptions: BOUNDARY_OPTIONS,
    completed: !!((record || {}).completed),
    score: calculateKlineMindScore(record || {})
  };

  const sessionWithSampling = normalizedSampling ? attachSamplingMetadata(Object.assign({}, session, {
    samplingStatusText: normalizedSampling.fallbackUsed ? "使用基础盲练兜底" : "已匹配片段",
    sampling_status_text: normalizedSampling.fallbackUsed ? "使用基础盲练兜底" : "已匹配片段",
    samplingSourceLabel: normalizedSampling.fallbackUsed ? "兜底片段" : "匹配片段",
    sampling_source_label: normalizedSampling.fallbackUsed ? "兜底片段" : "匹配片段"
  }), normalizedSampling) : session;

  const trainingContext = reviewFocusContext || specialTrainingContext || customSessionContext;
  if (customSessionContext && trainingContext === customSessionContext) {
    const customTotal = Math.max(1, candles.length || customSessionContext.trainingLength || customSessionContext.training_length || 1);
    const customVisibleCount = Math.max(
      1,
      Math.min(customTotal, Number(customSessionContext.customVisibleCount || customSessionContext.custom_visible_count || 1) || 1)
    );
    return Object.assign({}, sessionWithSampling, customSessionContext, {
      dataStatusText: candles.length ? "自选盲练片段已载入" : sessionWithSampling.dataStatusText,
      customTotalCount: customTotal,
      custom_total_count: customTotal,
      customVisibleCount,
      custom_visible_count: customVisibleCount,
      customProgressText: `当前第 ${customVisibleCount} 根 / 共 ${customTotal} 根`,
      custom_progress_text: `当前第 ${customVisibleCount} 根 / 共 ${customTotal} 根`
    });
  }
  return trainingContext ? Object.assign({}, sessionWithSampling, attachSamplingMetadata(trainingContext, sessionWithSampling)) : sessionWithSampling;
}

function calculateKlineMindScore(record = {}) {
  const fields = [
    record.selectedCandleKey,
    record.firstReaction,
    record.bodySignal,
    record.boundaryChoice,
    record.insightLine
  ];
  const filledCount = fields.filter((item) => String(item || "").trim()).length;
  const boundaryBonus = record.boundaryChoice ? 12 : 0;
  const insightBonus = String(record.insightLine || "").trim().length >= 8 ? 12 : 0;
  return Math.max(0, Math.min(100, 28 + filledCount * 10 + boundaryBonus + insightBonus));
}

function buildSingleExecutionConsistency(executionResult) {
  const normalized = normalizeExecutionResult(executionResult);
  if (normalized === "按计划执行") {
    return {
      alignedCount: 1,
      deviationCount: 0,
      denominator: 1,
      isSampleEnough: true,
      rate: 100,
      rateText: "100%"
    };
  }
  if (normalized === "执行偏离") {
    return {
      alignedCount: 0,
      deviationCount: 1,
      denominator: 1,
      isSampleEnough: true,
      rate: 0,
      rateText: "0%"
    };
  }
  return {
    alignedCount: 0,
    deviationCount: 0,
    denominator: 0,
    isSampleEnough: false,
    rate: null,
    rateText: "样本不足"
  };
}

function buildKlineMindRecord(input = {}, session = {}) {
  const selectedCandleKey = input.selectedCandleKey || session.selectedCandleKey || "";
  const selectedCandle = (session.candles || []).find((item) => item.key === selectedCandleKey) || {};
  const firstReaction = String(input.firstReaction || "").trim();
  const bodySignal = String(input.bodySignal || "").trim();
  const boundaryChoice = String(input.boundaryChoice || "").trim();
  const insightLine = String(input.insightLine || "").trim();
  const sessionContext = pickSessionContext(session);
  const record = {
    day: clampDay(input.day || session.day || 1),
    scenarioId: session.scenarioId || input.scenarioId || "",
    scenarioTitle: session.title || input.scenarioTitle || "",
    marketKey: ((session.market || {}).key) || input.marketKey || "cn_equity",
    marketName: ((session.market || {}).name) || input.marketName || "A股",
    timeframeKey: session.timeframeKey || input.timeframeKey || "1d",
    dataSource: ((session.historySlice || {}).source) || input.dataSource || "",
    symbol: ((session.historySlice || {}).symbol) || input.symbol || ((session.market || {}).defaultSymbol) || "",
    dataStart: ((session.historySlice || {}).start) || input.dataStart || "",
    dataEnd: ((session.historySlice || {}).end) || input.dataEnd || "",
    personalityType: session.personalityType || input.personalityType || "平衡型",
    secondaryType: session.secondaryType || input.secondaryType || "",
    stageKey: (session.stageGate || {}).key || input.stageKey || "",
    stageName: (session.stageGate || {}).name || input.stageName || "",
    selectedCandleKey,
    selectedCandleLabel: selectedCandle.label || selectedCandle.indexLabel || input.selectedCandleLabel || "",
    firstReaction,
    bodySignal,
    boundaryChoice,
    insightLine,
    prescriptionTitle: ((session.prescription || {}).title) || input.prescriptionTitle || "",
    completed: !!(firstReaction && boundaryChoice && insightLine),
    updatedAt: Date.now()
  };
  const executionResult = normalizeExecutionResult(
    input.executionResult,
    input.execution_result,
    input.executionLabel,
    input.execution_label,
    input.lawResult,
    input.law_result,
    record.completed ? "aligned" : "unclear"
  );
  const recordExecutionConsistency = buildSingleExecutionConsistency(executionResult);
  const scoredRecord = Object.assign({}, record, {
    score: calculateKlineMindScore(record),
    executionResult,
    execution_result: executionResult,
    executionLabel: executionResult,
    execution_label: executionResult,
    executionConsistency: recordExecutionConsistency,
    execution_consistency: recordExecutionConsistency,
    executionConsistencyRateText: recordExecutionConsistency.rateText,
    execution_consistency_rate_text: recordExecutionConsistency.rateText
  });
  if (!sessionContext) return scoredRecord;

  const repeatCount = Number(pickValue(input.repeatCount, input.repeat_count, session.repeatCount, session.repeat_count, 1)) || 1;
  const trainingMistakeCard = buildTrainingMistakeCard(scoredRecord, sessionContext);
  const executionConsistency = buildSingleExecutionConsistency(trainingMistakeCard.executionResult);
  return Object.assign({}, scoredRecord, sessionContext, {
    executionResult: trainingMistakeCard.executionResult,
    execution_result: trainingMistakeCard.execution_result,
    executionLabel: trainingMistakeCard.executionLabel,
    execution_label: trainingMistakeCard.execution_label,
    executionConsistency,
    execution_consistency: executionConsistency,
    executionConsistencyRateText: executionConsistency.rateText,
    execution_consistency_rate_text: executionConsistency.rateText,
    repeatCount,
    repeat_count: repeatCount,
    trainingMistakeCard,
    training_mistake_card: trainingMistakeCard
  });
}

function normalizeBookmarkType(value = "") {
  const type = cleanText(value, 40);
  if (["session", "action", "mistake_card"].includes(type)) return type;
  return "session";
}

function normalizeBarIndex(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : null;
}

function buildBookmarkId(prefix = "bookmark") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTrainingBookmark(input = {}) {
  const bookmarkType = normalizeBookmarkType(pickValue(input.bookmarkType, input.bookmark_type));
  const sourceType = cleanText(pickValue(input.sourceType, input.source_type), 80);
  const sampling = normalizeKlineSamplingResult(pickValue(input.samplingResult, input.sampling_result));
  const samplingMetadata = sampling ? sampling.samplingResult || sampling.sampling_result : null;
  const sceneTags = normalizeList(pickValue(input.sceneTags, input.scene_tags));
  const startDate = cleanText(pickValue(input.startDate, input.start_date, samplingMetadata && (samplingMetadata.startDate || samplingMetadata.start_date)), 40);
  const endDate = cleanText(pickValue(input.endDate, input.end_date, samplingMetadata && (samplingMetadata.endDate || samplingMetadata.end_date)), 40);
  const segmentId = cleanText(pickValue(input.segmentId, input.segment_id, samplingMetadata && (samplingMetadata.segmentId || samplingMetadata.segment_id)), 100);
  const trainingPackId = cleanText(pickValue(input.trainingPackId, input.training_pack_id, samplingMetadata && (samplingMetadata.trainingPackId || samplingMetadata.training_pack_id)), 100);
  const errorType = cleanText(pickValue(input.errorType, input.error_type, samplingMetadata && (samplingMetadata.errorType || samplingMetadata.error_type)), 100);
  const executionResult = normalizeExecutionResult(
    input.executionResult,
    input.execution_result,
    input.executionLabel,
    input.execution_label,
    input.lawResult,
    input.law_result
  );
  const sessionId = cleanText(pickValue(
    input.sessionId,
    input.session_id,
    input.recordId,
    input.record_id,
    input.id,
    input.date,
    input.updatedAt,
    input.updated_at,
    buildBookmarkId("session")
  ), 120);
  const id = cleanText(pickValue(input.id, buildBookmarkId("bookmark")), 120);
  const createdAt = pickValue(input.createdAt, input.created_at, Date.now());
  const updatedAt = pickValue(input.updatedAt, input.updated_at, createdAt);
  const enabledInput = pickValue(input.enabled);
  const enabled = enabledInput === undefined ? true : normalizeBooleanValue(enabledInput);
  const title = cleanText(
    pickValue(
      input.title,
      bookmarkType === "mistake_card" ? "训练错题卡收藏" : "",
      bookmarkType === "action" ? "训练动作收藏" : "",
      "训练整局收藏"
    ),
    120
  );

  return {
    id,
    userId: cleanText(pickValue(input.userId, input.user_id), 120),
    user_id: cleanText(pickValue(input.user_id, input.userId), 120),
    bookmarkType,
    bookmark_type: bookmarkType,
    sessionId,
    session_id: sessionId,
    actionId: cleanText(pickValue(input.actionId, input.action_id), 120),
    action_id: cleanText(pickValue(input.action_id, input.actionId), 120),
    barIndex: normalizeBarIndex(pickValue(input.barIndex, input.bar_index)),
    bar_index: normalizeBarIndex(pickValue(input.bar_index, input.barIndex)),
    sourceType,
    source_type: sourceType,
    errorType,
    error_type: errorType,
    sceneTags,
    scene_tags: sceneTags,
    executionResult,
    execution_result: executionResult,
    segmentId,
    segment_id: segmentId,
    trainingPackId,
    training_pack_id: trainingPackId,
    samplingResult: samplingMetadata,
    sampling_result: samplingMetadata,
    symbol: cleanText(pickValue(input.symbol, samplingMetadata && samplingMetadata.symbol), 80),
    period: cleanText(pickValue(input.period, input.timeframeKey, input.timeframe_key, samplingMetadata && samplingMetadata.period, "1d"), 40),
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    title,
    note: cleanText(input.note, 280),
    enabled,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt
  };
}

function buildTrainingBookmark({ record = {}, session = {}, bookmarkType = "session", actionId = "", barIndex = null, title = "", note = "" } = {}) {
  const mistakeCard = record.trainingMistakeCard || record.training_mistake_card || {};
  return normalizeTrainingBookmark({
    id: buildBookmarkId("bookmark"),
    bookmarkType,
    sessionId: pickValue(record.sessionId, record.session_id, record.id, record.date, record.updatedAt, record.updated_at),
    actionId,
    barIndex,
    sourceType: pickValue(record.sourceType, record.source_type, session.sourceType, session.source_type),
    errorType: pickValue(mistakeCard.errorType, mistakeCard.error_type, record.errorType, record.error_type, session.errorType, session.error_type),
    sceneTags: pickValue(mistakeCard.sceneTags, mistakeCard.scene_tags, record.sceneTags, record.scene_tags, session.sceneTags, session.scene_tags),
    executionResult: pickValue(mistakeCard.executionResult, mistakeCard.execution_result, record.executionResult, record.execution_result),
    segmentId: pickValue(record.segmentId, record.segment_id, session.segmentId, session.segment_id),
    trainingPackId: pickValue(record.trainingPackId, record.training_pack_id, session.trainingPackId, session.training_pack_id),
    samplingResult: pickValue(record.samplingResult, record.sampling_result, session.samplingResult, session.sampling_result),
    symbol: pickValue(record.symbol, session.symbol, (record.historySlice || {}).symbol, (session.historySlice || {}).symbol),
    period: pickValue(record.period, session.period, record.timeframeKey, session.timeframeKey),
    startDate: pickValue(record.startDate, record.start_date, record.dataStart, session.startDate, session.start_date, (session.historySlice || {}).startDate, (session.historySlice || {}).start_date, (session.historySlice || {}).start),
    endDate: pickValue(record.endDate, record.end_date, record.dataEnd, session.endDate, session.end_date, (session.historySlice || {}).endDate, (session.historySlice || {}).end_date, (session.historySlice || {}).end),
    title: title || (bookmarkType === "mistake_card" ? "训练错题卡收藏" : "训练整局收藏"),
    note
  });
}

function buildBookmarkReplaySliceRequest(bookmark = {}) {
  const normalized = normalizeTrainingBookmark(bookmark);
  if (!normalized.symbol || !normalized.period || !normalized.startDate || !normalized.endDate) return null;
  return {
    symbol: normalized.symbol,
    timeframeKey: normalized.period,
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    trainingLength: 60,
    mode: "replay",
    blind: false
  };
}

module.exports = {
  SIX_GATE_MAP,
  PERSONALITY_KLINE_PRESCRIPTIONS,
  PERSONALITY_KLINE_DRILLS,
  MARKET_CATALOG,
  TIMEFRAME_CATALOG,
  CHART_ZOOM_OPTIONS,
  INDICATOR_CATALOG,
  MAIN_INDICATOR_OPTIONS,
  INDICATOR_PANEL_OPTIONS,
  KLINE_TRAINING_METHODS,
  GATE_TRAINING_ACTIONS,
  DAY_SCENARIOS,
  REACTION_OPTIONS,
  BODY_OPTIONS,
  BOUNDARY_OPTIONS,
  SPECIAL_TRAINING_PACKS,
  getSixGate,
  getKlinePrescription,
  getPersonalityKlineDrill,
  listSpecialTrainingPacks,
  getSpecialTrainingPack,
  buildSpecialTrainingSessionMeta,
  buildCustomSessionMeta,
  buildKlineSamplingRequest,
  normalizeKlineSamplingResult,
  buildTrainingBookmark,
  normalizeTrainingBookmark,
  buildBookmarkReplaySliceRequest,
  normalizeKlineMindTimeframeKey,
  normalizeKlineMindEntryContext,
  mergeKlineMindEntryContext,
  getMarketConfig,
  getNextKlineMindSliceSeed,
  getInitialKlineVisibleCount,
  normalizeHistoryCandles,
  startKlineTrainingRuntime,
  advanceKlineTrainingRuntime,
  recordKlineTrainingDecision,
  setKlineRuntimeChartZoom,
  setKlineRuntimeViewportPan,
  setKlineRuntimeIndicator,
  setKlineRuntimeMainIndicator,
  buildKlineTrainingRecordPatch,
  buildKlineMindSession,
  buildKlineMindRecord,
  calculateKlineMindScore
};
