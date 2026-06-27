const { getPersonalityStagePlan } = require("../../core/personality-stage-map");

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

const CHART_ZOOM_OPTIONS = [
  { key: "overview", label: "总览", hint: "约180根，先看整体趋势", windowSize: 180 },
  { key: "wide", label: "缩小", hint: "约150根，适合横屏盲测", windowSize: 150 },
  { key: "standard", label: "标准", hint: "约90根，平衡节奏", windowSize: 90 },
  { key: "focus", label: "放大", hint: "约32根，细看单根结构", windowSize: 32 }
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
  focus: { candleWidth: 32, bodyWidth: 24, gap: 9, paddingX: 18, paddingTop: 24 }
};
const BLIND_CHART_MIN_WIDTH = 690;

const KLINE_TRAINING_METHODS = [
  {
    key: "firecracker",
    title: "爆竹 K 线",
    subtitle: "连续急促、放量、长实体或长影线的强触发历史片段。",
    focus: "训练急念、不甘、证明欲",
    steps: ["先停十秒", "点最想追的一根", "写下想动理由", "只做一次记录"]
  },
  {
    key: "step_replay",
    title: "逐根推进",
    subtitle: "把图当成回放，不猜后面，只看当下哪一根牵动你。",
    focus: "训练反应速度与停顿能力",
    steps: ["看十秒", "点最牵动的一根", "选第一念", "回到边界"]
  },
  {
    key: "blind_mirror",
    title: "盲练观心",
    subtitle: "不看名称、盈亏、时间，只看结构和身体里的第一反应。",
    focus: "训练少受外部标签影响",
    steps: ["不问是哪只", "不问涨跌结论", "只记想追还是想躲", "结束后再看来源"]
  },
  {
    key: "rule_mapping",
    title: "规则映射",
    subtitle: "先把市场规则翻译成今天的一条边界，再看图。",
    focus: "训练规则意识与执行稳定",
    steps: ["写一条边界", "看到触发先停", "不临场改口", "复盘是否守住"]
  },
  {
    key: "review_loop",
    title: "省察回放",
    subtitle: "训练后不判断对错，只问这一次哪里被牵动。",
    focus: "训练复盘而不责备",
    steps: ["回看触发点", "写身体感受", "写一句照见", "沉淀到活镜"]
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
  return CHART_ZOOM_OPTIONS.find((item) => item.key === zoomKey) || CHART_ZOOM_OPTIONS[0];
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

function splitKlineTrainingFocusTags(text = "") {
  return String(text || "")
    .split(/[\/／、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildKlineTargetedTrainingEntry(reviewTrainingFocus = {}) {
  const focus = reviewTrainingFocus || {};
  if (!focus.hasPrescription || !String(focus.mainErrorType || "").trim()) {
    return {
      hasTarget: false,
      errorType: "",
      title: "基础盲练",
      trainingTitle: "基础盲练",
      summary: "还没有真实复盘错题，先做一段基础盲练。",
      sceneTags: [],
      sceneText: "真实历史片段 / 第一反应 / 下一根推进",
      actionText: "先看事实，再记录第一念。",
      routeParams: { error_type: "" }
    };
  }

  const prescription = focus.prescription || {};
  const errorType = String(focus.mainErrorType || "").trim();
  const focusText = String(focus.focusText || prescription.focusText || "").trim();
  const sceneTags = splitKlineTrainingFocusTags(focusText);
  const actionText = String(focus.rule || prescription.rule || "先停十秒，只记录第一念。").trim();
  const title = `${errorType}专项`;

  return {
    hasTarget: true,
    errorType,
    title,
    trainingTitle: title,
    summary: `根据你最近真实复盘，系统发现：你最近最高频错题是「${errorType}」。`,
    sceneTags,
    sceneText: sceneTags.length ? sceneTags.join(" / ") : "待补充",
    actionText,
    packId: focus.packId || prescription.packId || "",
    count: Number(focus.count || 0),
    routeParams: { error_type: errorType }
  };
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
  if (candles.length < MIN_VISIBLE_CANDLES) return [];
  if (candles.length <= safeWindowSize) return candles;

  const focusIndex = candles.findIndex((item) => item.focus);
  if (focusIndex >= 0) {
    const half = Math.floor(safeWindowSize / 2);
    const start = Math.max(0, Math.min(candles.length - safeWindowSize, focusIndex - half));
    return candles.slice(start, start + safeWindowSize);
  }

  return candles.slice(candles.length - safeWindowSize);
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

  const highs = candles.map((item) => Number(item.high)).filter(Number.isFinite);
  const lows = candles.map((item) => Number(item.low)).filter(Number.isFinite);
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
  const overlayValues = indicatorValues.reduce((items, item) => {
    ["ma5", "ma10", "ma20", "bollUpper", "bollLower"].forEach((key) => {
      if (Number.isFinite(item[key])) items.push(item[key]);
    });
    return items;
  }, []);
  const maxHigh = Math.max.apply(null, highs.concat(overlayValues));
  const minLow = Math.min.apply(null, lows.concat(overlayValues));
  const maxVolume = Math.max.apply(null, volumes.concat([1]));
  const range = Math.max(0.0001, maxHigh - minLow);
  const visualZoomKey = getChartZoomMeta(options.zoomKey).key;
  const minBodyHeight = visualZoomKey === "focus" ? 10 : 6;
  const minWickHeight = visualZoomKey === "focus" ? 12 : 8;
  const valueToY = (value) => Number.isFinite(value)
    ? Math.round(((maxHigh - value) / range) * 168 + 34)
    : null;

  return candles.map((item, index) => {
    const open = Number(item.open);
    const high = Number(item.high);
    const low = Number(item.low);
    const close = Number(item.close);
    const volume = Number(item.volume || 0);
    const highY = ((maxHigh - high) / range) * 168 + 34;
    const lowY = ((maxHigh - low) / range) * 168 + 34;
    const openY = ((maxHigh - open) / range) * 168 + 34;
    const closeY = ((maxHigh - close) / range) * 168 + 34;
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(minBodyHeight, Math.abs(openY - closeY));
    const wickHeight = Math.max(minWickHeight, lowY - highY);
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
      wickStyle: `height: ${Math.round(wickHeight)}rpx; top: ${Math.round(highY)}rpx;`,
      bodyStyle: `height: ${Math.round(bodyHeight)}rpx; top: ${Math.round(bodyTop)}rpx;`,
      volumeStyle: `height: ${volumeHeight}rpx;`,
      closeY: valueToY(close),
      ma5Y: valueToY(indicator.ma5),
      ma10Y: valueToY(indicator.ma10),
      ma20Y: valueToY(indicator.ma20),
      bollUpperY: valueToY(indicator.bollUpper),
      bollLowerY: valueToY(indicator.bollLower),
      focus: !!item.focus,
      selected: false
    };
  });
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

function getChartBoardWidth(candleCount, zoomKey = "wide") {
  return getChartLayout(candleCount, zoomKey).width;
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

function getChartRightBoundaryScrollLeft(candleCount, zoomKey = "wide") {
  const layout = getChartLayout(candleCount, zoomKey);
  return Math.max(0, Math.round(layout.width - BLIND_CHART_MIN_WIDTH));
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
  const target = Math.max(72, Math.min(132, Math.floor(safeWindowSize * 0.8)));
  return Math.min(candles.length, target);
}

function roundMetric(value, digits = 2) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  const factor = Math.pow(10, digits);
  return Math.round(number * factor) / factor;
}

function getRuntimePrice(candle = {}) {
  const price = Number(candle.close || candle.c || candle.price || 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

const POSITION_LEVEL_CATALOG = [
  { key: "light", label: "轻仓", size: 0.25 },
  { key: "half", label: "半仓", size: 0.5 },
  { key: "heavy", label: "重仓", size: 0.75 },
  { key: "full", label: "满仓", size: 1 }
];

function clampRuntimePositionSize(size = 0) {
  const number = Number(size);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.max(0, Math.min(1, number));
}

function normalizePositionLevel(value = "", fallbackSize = 1) {
  const text = cleanEventText(value, 20);
  const found = POSITION_LEVEL_CATALOG.find((item) => item.key === text || item.label === text);
  if (found) return found;
  const size = clampRuntimePositionSize(fallbackSize);
  const bySize = POSITION_LEVEL_CATALOG.find((item) => Math.abs(item.size - size) < 0.01);
  return bySize || POSITION_LEVEL_CATALOG[POSITION_LEVEL_CATALOG.length - 1];
}

function normalizePositionState(state = {}) {
  const positionSize = clampRuntimePositionSize(
    state.positionSize !== undefined ? state.positionSize : (state.size || 0)
  );
  const positionLevel = positionSize > 0
    ? normalizePositionLevel(state.positionLevel || state.position_level, positionSize).label
    : "";
  return {
    side: state.side === "LONG" ? "LONG" : "FLAT",
    entryPrice: roundMetric(state.entryPrice, 4),
    positionSize,
    positionLevel,
    position_level: positionLevel,
    realizedPnl: roundMetric(state.realizedPnl),
    unrealizedPnl: roundMetric(state.unrealizedPnl),
    equity: roundMetric(state.equity || 100),
    peakEquity: roundMetric(state.peakEquity || 100),
    maxDrawdown: roundMetric(state.maxDrawdown)
  };
}

function markPositionToMarket(positionState = {}, candle = {}) {
  const price = getRuntimePrice(candle);
  const state = normalizePositionState(positionState);
  const unrealizedPnl = state.side === "LONG" && state.entryPrice > 0 && price > 0
    ? ((price - state.entryPrice) / state.entryPrice) * 100 * state.positionSize
    : 0;
  const equity = 100 + state.realizedPnl + unrealizedPnl;
  const peakEquity = Math.max(state.peakEquity || 100, equity);
  const maxDrawdown = Math.max(state.maxDrawdown || 0, peakEquity - equity);
  return Object.assign({}, state, {
    unrealizedPnl: roundMetric(unrealizedPnl),
    equity: roundMetric(equity),
    peakEquity: roundMetric(peakEquity),
    maxDrawdown: roundMetric(maxDrawdown)
  });
}

function executeSimulatedPosition(positionState = {}, decision = {}, candle = {}) {
  const action = String(decision.action || "HOLD").toUpperCase();
  const price = Number(decision.price || getRuntimePrice(candle));
  const state = markPositionToMarket(positionState, candle);
  const positionLevel = normalizePositionLevel(decision.positionLevel || decision.position_level);
  if (!Number.isFinite(price) || price <= 0) return state;

  if (action === "BUY" && state.side !== "LONG") {
    return markPositionToMarket(Object.assign({}, state, {
      side: "LONG",
      entryPrice: price,
      positionSize: positionLevel.size,
      positionLevel: positionLevel.label,
      position_level: positionLevel.label,
      unrealizedPnl: 0
    }), candle);
  }

  if (action === "SELL" && state.side === "LONG" && state.entryPrice > 0) {
    const realizedChange = ((price - state.entryPrice) / state.entryPrice) * 100 * state.positionSize;
    return markPositionToMarket(Object.assign({}, state, {
      side: "FLAT",
      entryPrice: 0,
      positionSize: 0,
      positionLevel: "",
      position_level: "",
      realizedPnl: roundMetric(state.realizedPnl + realizedChange),
      unrealizedPnl: 0
    }), candle);
  }

  return state;
}

function buildSessionMetrics(positionState = {}, decisions = []) {
  const state = normalizePositionState(positionState);
  const tradeDecisions = Array.isArray(decisions)
    ? decisions.filter((item) => item && item.action && item.action !== "HOLD")
    : [];
  return {
    positionSide: state.side,
    positionSize: state.positionSize,
    realizedPnl: state.realizedPnl,
    unrealizedPnl: state.unrealizedPnl,
    totalPnl: roundMetric(state.realizedPnl + state.unrealizedPnl),
    maxDrawdown: state.maxDrawdown,
    tradeCount: tradeDecisions.length
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
  const visibleCandles = buildRuntimeVisibleCandles(candles, viewport);
  const activeCandle = candles[safeIndex] ? Object.assign({}, candles[safeIndex], { runtimeIndex: safeIndex }) : (visibleCandles[visibleCandles.length - 1] || null);
  const positionState = markPositionToMarket(runtime.positionState || {}, activeCandle || {});
  const hasDecisionForCurrentIndex = Number(runtime.lastDecisionIndex) === safeIndex;
  const completed = !!runtime.completed;
  const mustDecide = completed ? false : (!!runtime.lockedUntilDecision || (!hasDecisionForCurrentIndex && shouldRuntimeRequireDecision(safeIndex, runtime.decisionInterval)));
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
    positionState,
    sessionMetrics: buildSessionMetrics(positionState, runtime.decisionTimeline || []),
    completed,
    mustDecide,
    lockedUntilDecision: completed ? false : mustDecide
  });
}

function startKlineTrainingRuntime(session = {}, options = {}) {
  const candles = Array.isArray(session.candles) ? session.candles : [];
  const initialVisibleCount = normalizeInitialVisibleCount(options.initialVisibleCount, candles.length);
  const errorType = cleanEventText(options.errorType || options.error_type || session.errorType || session.error_type || "", 80);
  return buildRuntimeState({
    trainingSessionId: cleanEventText(options.trainingSessionId || `kline-session-${Date.now()}`, 160),
    simulationMode: "blind_step_replay",
    sliceSeed: cleanEventText(options.sliceSeed || ((session.historySlice || {}).seed) || "", 120),
    errorType,
    error_type: errorType,
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
    positionState: normalizePositionState(),
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
  if (/追|错过|贪|急|证明/.test(text) || decision.reactionDirection === "act") {
    return { type: "GREED", label: "追念", text: "想追上去时，先照见怕错过。" };
  }
  if (/怕|恐|割|退出|躲/.test(text) || decision.reactionDirection === "avoid") {
    return { type: "FEAR", label: "惧念", text: "想退出时，先分清事实与不安。" };
  }
  if (/犹豫|不敢|等确认/.test(text)) return { type: "HESITATION", label: "犹疑", text: "知而未行时，先看见停滞处。" };
  if (decision.action && decision.action !== "HOLD" && !decision.boundaryChoice) {
    return { type: "IMPULSE", label: "冲动", text: "无边界动作容易变成临场反应。" };
  }
  return null;
}

function buildRiskHint(emotionBadge = null) {
  const type = (emotionBadge || {}).type || "";
  if (type === "GREED") return { level: "medium", text: "出现追念：先停十秒，再回到原边界。" };
  if (type === "FEAR") return { level: "medium", text: "出现惧念：先看事实，再记录不安。" };
  if (type === "REVENGE") return { level: "high", text: "出现不甘：本轮只记录，不加重动作。" };
  if (type === "HESITATION") return { level: "low", text: "出现犹疑：写下知道却未行动的原因。" };
  if (type === "IMPULSE") return { level: "medium", text: "出现无边界动作：先补边界，再继续训练。" };
  return { level: "low", text: "继续只做训练记录，不作当下判断。" };
}

function buildCoachHint(decision = {}, emotionBadge = null) {
  const action = String(decision.action || "HOLD").toUpperCase();
  const label = (emotionBadge || {}).label || "观照";
  return {
    title: `${label}已记录`,
    text: action === "HOLD"
      ? "你先停下来观察，这一刻先守住了记录。"
      : "动作已经写入记录，下一步先停十秒，再看是否仍合边界。"
  };
}

const TRAINING_MISTAKE_SCENE_TAGS = {
  "追高冲动": ["放量拉升", "假突破", "冲高回落"]
};

const TRAINING_MISTAKE_PRESCRIPTION_MAP = {
  "追高冲动": {
    trainingType: "追高冲动专项",
    nextAction: "第一根放量不追，先停十秒",
    trainingPrescription: "追高冲动专项：放量拉升 / 假突破 / 冲高回落"
  },
  "扛单被套": {
    trainingType: "扛单被套专项",
    nextAction: "破位认错，不用希望代替规则",
    trainingPrescription: "扛单被套专项：破位下跌 / 弱反弹 / 连续阴跌"
  },
  "卖飞懊悔": {
    trainingType: "卖飞懊悔专项",
    nextAction: "按趋势规则持有，不因一根波动急追急退",
    trainingPrescription: "卖飞懊悔专项：趋势持有 / 洗盘后走强"
  },
  "补仓冲动": {
    trainingType: "补仓冲动专项",
    nextAction: "不在破位亏损中补仓",
    trainingPrescription: "补仓冲动专项：下跌中继 / 反抽诱多"
  },
  "计划外交易": {
    trainingType: "计划外交易专项",
    nextAction: "无计划不交易",
    trainingPrescription: "计划外交易专项：无计划不交易"
  },
  "盈利拿不住": {
    trainingType: "盈利拿不住专项",
    nextAction: "盈利按规则拿，趋势未破不提前卖",
    trainingPrescription: "盈利拿不住专项：趋势未破不提前卖"
  },
  "空仓焦虑": {
    trainingType: "空仓焦虑专项",
    nextAction: "空仓也是按计划执行",
    trainingPrescription: "空仓焦虑专项：空仓等待"
  },
  "急于翻本": {
    trainingType: "急于翻本专项",
    nextAction: "亏损后停止，先复盘",
    trainingPrescription: "急于翻本专项：亏损后停止交易"
  }
};

function normalizeDecisionAction(action = "") {
  const text = cleanEventText(action, 20);
  const upper = text.toUpperCase();
  if (upper === "BUY" || text === "买入" || text === "加仓") return "BUY";
  if (upper === "SELL" || text === "卖出" || text === "减仓") return "SELL";
  return "HOLD";
}

function getDecisionBarIndex(decision = {}) {
  const value = decision.barIndex !== undefined
    ? decision.barIndex
    : (decision.bar_index !== undefined ? decision.bar_index : decision.index);
  const index = Number(value);
  return Number.isFinite(index) ? index : 0;
}

function getDecisionSceneTag(decision = {}) {
  return cleanEventText(
    decision.sceneTag || decision.scene_tag || decision.triggerScene || decision.trigger_scene || "",
    80
  );
}

function getDecisionPositionLevel(decision = {}) {
  return cleanEventText(decision.positionLevel || decision.position_level || "", 20);
}

function getDecisionPrice(decision = {}) {
  const price = Number(decision.price || decision.close || decision.c || 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function buildTrainingRepeatEvents(errorType = "", decisions = []) {
  const events = [];
  const normalizedDecisions = (Array.isArray(decisions) ? decisions : []).map((item) => Object.assign({}, item, {
    action: normalizeDecisionAction((item || {}).action),
    barIndex: getDecisionBarIndex(item || {}),
    sceneTag: getDecisionSceneTag(item || {}),
    positionLevel: getDecisionPositionLevel(item || {}),
    price: getDecisionPrice(item || {})
  }));

  if (errorType === "追高冲动") {
    const targetScenes = TRAINING_MISTAKE_SCENE_TAGS["追高冲动"];
    normalizedDecisions.forEach((decision) => {
      if (decision.action !== "BUY" || !targetScenes.includes(decision.sceneTag)) return;
      const heavy = decision.positionLevel === "重仓" || decision.positionLevel === "满仓";
      events.push({
        type: errorType,
        label: heavy ? "重仓追高" : "疑似追高失守",
        barIndex: decision.barIndex,
        sceneTag: decision.sceneTag
      });
    });
  }

  if (errorType === "补仓冲动") {
    let holding = false;
    let entryPrice = 0;
    normalizedDecisions.forEach((decision) => {
      if (decision.action === "SELL") {
        holding = false;
        entryPrice = 0;
        return;
      }
      if (decision.action !== "BUY" || decision.price <= 0) return;
      if (holding && entryPrice > 0 && decision.price < entryPrice) {
        events.push({
          type: errorType,
          label: "补仓冲动",
          barIndex: decision.barIndex,
          sceneTag: decision.sceneTag
        });
      }
      if (!holding) {
        holding = true;
        entryPrice = decision.price;
      }
    });
  }

  if (errorType === "卖飞懊悔") {
    let lastSellIndex = null;
    normalizedDecisions.forEach((decision) => {
      if (decision.action === "SELL") {
        lastSellIndex = decision.barIndex;
        return;
      }
      if (decision.action === "BUY" && lastSellIndex !== null && decision.barIndex - lastSellIndex > 0 && decision.barIndex - lastSellIndex <= 3) {
        events.push({
          type: errorType,
          label: "卖飞后急追",
          barIndex: decision.barIndex,
          sceneTag: decision.sceneTag
        });
      }
    });
  }

  return events;
}

function buildKlineTrainingMistakeCard(runtime = {}, options = {}) {
  const decisions = Array.isArray(runtime.decisionTimeline) ? runtime.decisionTimeline : [];
  const trainingResult = runtime.trainingResult || options.trainingResult || options.training_result || {};
  const errorType = cleanEventText(
    options.errorType || options.error_type || runtime.errorType || runtime.error_type || trainingResult.errorType || trainingResult.error_type || "",
    80
  );
  const prescription = TRAINING_MISTAKE_PRESCRIPTION_MAP[errorType] || {
    trainingType: errorType ? `${errorType}专项` : "基础盲练",
    nextAction: "继续只看当下这一根，先记录再行动",
    trainingPrescription: "基础盲练：继续训练买 / 卖 / 观望的稳定执行"
  };
  const repeatEvents = buildTrainingRepeatEvents(errorType, decisions);
  const repeatCount = repeatEvents.length;
  const obviousMiss = repeatEvents[0]
    ? `${repeatEvents[0].label}${repeatEvents[0].sceneTag ? ` · ${repeatEvents[0].sceneTag}` : ""}${repeatEvents[0].barIndex ? ` · 第${repeatEvents[0].barIndex}根` : ""}`
    : "本局暂无明显失守";
  const executionResult = repeatCount > 0 ? "执行偏离" : "本局暂无明显失守";
  const totalActions = Number(trainingResult.totalActions || trainingResult.total_actions || decisions.length || 0);
  const executionConsistency = totalActions > 0
    ? Math.max(0, Math.round(((totalActions - repeatCount) / totalActions) * 100))
    : null;
  const executionConsistencyText = executionConsistency === null ? "待补充" : `${executionConsistency}%`;
  const pnlResult = Number(trainingResult.pnlResult || trainingResult.pnl_result || 0);
  const sessionId = cleanEventText(runtime.trainingSessionId || runtime.training_session_id || trainingResult.sessionId || trainingResult.session_id || "", 160);

  return {
    title: "训练错题卡",
    sessionId,
    session_id: sessionId,
    errorType,
    error_type: errorType,
    trainingType: prescription.trainingType,
    training_type: prescription.trainingType,
    pnlResult: Number.isFinite(pnlResult) ? roundMetric(pnlResult) : 0,
    pnl_result: Number.isFinite(pnlResult) ? roundMetric(pnlResult) : 0,
    actionSummary: `动作 ${totalActions} 次`,
    action_summary: `动作 ${totalActions} 次`,
    executionResult,
    execution_result: executionResult,
    executionConsistencyText,
    execution_consistency_text: executionConsistencyText,
    lawResult: executionResult,
    law_result: executionResult,
    repeatCount,
    repeat_count: repeatCount,
    obviousMiss,
    obvious_miss: obviousMiss,
    nextAction: prescription.nextAction,
    next_action: prescription.nextAction,
    nextRule: prescription.nextAction,
    next_rule: prescription.nextAction,
    trainingPrescription: prescription.trainingPrescription,
    training_prescription: prescription.trainingPrescription,
    repeatEvents,
    repeat_events: repeatEvents
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
  const sessionId = cleanEventText(runtime.trainingSessionId || "", 160);
  const barIndex = Number(runtime.currentIndex || 0);
  const errorType = cleanEventText(decision.errorType || decision.error_type || runtime.errorType || runtime.error_type || "", 80);
  const positionLevel = normalizePositionLevel(decision.positionLevel || decision.position_level);
  const createdAt = decision.createdAt || decision.created_at || Date.now();
  const safeDecision = {
    id: `decision-${sessionId || "local"}-${barIndex}-${(runtime.decisionTimeline || []).length + 1}`,
    sessionId,
    session_id: sessionId,
    index: barIndex,
    barIndex,
    bar_index: barIndex,
    action: String(decision.action || "HOLD").toUpperCase(),
    price: getRuntimePrice(activeCandle),
    positionLevel: positionLevel.label,
    position_level: positionLevel.label,
    errorType,
    error_type: errorType,
    sceneTag: cleanEventText(decision.sceneTag || decision.scene_tag || "", 80),
    scene_tag: cleanEventText(decision.sceneTag || decision.scene_tag || "", 80),
    selectedCandleKey: cleanEventText(decision.selectedCandleKey || activeCandle.key || "", 80),
    reactionDirection: cleanEventText(decision.reactionDirection, 40),
    firstReaction: cleanEventText(decision.firstReaction, 160),
    boundaryChoice: cleanEventText(decision.boundaryChoice, 120),
    createdAt,
    created_at: createdAt
  };
  const emotionBadge = buildEmotionBadge(safeDecision);
  const riskHint = buildRiskHint(emotionBadge);
  const coachHint = buildCoachHint(safeDecision, emotionBadge);
  const nextPositionState = executeSimulatedPosition(runtime.positionState || {}, safeDecision, activeCandle);
  const decisionWithPosition = Object.assign({}, safeDecision, {
    positionSize: nextPositionState.positionSize,
    pnl: roundMetric(nextPositionState.realizedPnl + nextPositionState.unrealizedPnl),
    drawdown: nextPositionState.maxDrawdown
  });
  return buildRuntimeState(runtime, {
    decisionTimeline: (runtime.decisionTimeline || []).concat([decisionWithPosition]),
    emotionBadges: emotionBadge ? (runtime.emotionBadges || []).concat([emotionBadge]) : (runtime.emotionBadges || []),
    riskHints: (runtime.riskHints || []).concat([riskHint]),
    coachHints: (runtime.coachHints || []).concat([coachHint]),
    positionState: nextPositionState,
    lastDecisionIndex: Number(runtime.currentIndex || 0),
    mustDecide: false,
    lockedUntilDecision: false,
    blockedReason: ""
  });
}

function buildKlineTrainingResult(runtime = {}, options = {}) {
  const decisions = Array.isArray(runtime.decisionTimeline) ? runtime.decisionTimeline : [];
  const metrics = buildSessionMetrics(runtime.positionState || {}, decisions);
  const sessionId = cleanEventText(runtime.trainingSessionId || "", 160);
  const errorType = cleanEventText(runtime.errorType || runtime.error_type || "", 80);
  const completedAt = options.completedAt || options.completed_at || Date.now();
  const countByAction = (action) => decisions.filter((item) => String((item || {}).action || "").toUpperCase() === action).length;
  const lastDecision = decisions[decisions.length - 1] || {};
  const result = {
    sessionId,
    session_id: sessionId,
    errorType,
    error_type: errorType,
    totalActions: decisions.length,
    total_actions: decisions.length,
    buyCount: countByAction("BUY"),
    buy_count: countByAction("BUY"),
    sellCount: countByAction("SELL"),
    sell_count: countByAction("SELL"),
    holdCount: countByAction("HOLD"),
    hold_count: countByAction("HOLD"),
    lastBarIndex: Number(lastDecision.barIndex !== undefined ? lastDecision.barIndex : (lastDecision.index || runtime.currentIndex || 0)),
    last_bar_index: Number(lastDecision.bar_index !== undefined ? lastDecision.bar_index : (lastDecision.index || runtime.currentIndex || 0)),
    lastPrice: Number(lastDecision.price || getRuntimePrice(runtime.activeCandle || {})),
    last_price: Number(lastDecision.price || getRuntimePrice(runtime.activeCandle || {})),
    pnlResult: metrics.totalPnl,
    pnl_result: metrics.totalPnl,
    maxDrawdown: metrics.maxDrawdown,
    max_drawdown: metrics.maxDrawdown,
    positionSide: metrics.positionSide,
    position_side: metrics.positionSide,
    positionSize: metrics.positionSize,
    position_size: metrics.positionSize,
    completedAt,
    completed_at: completedAt
  };
  const trainingMistakeCard = buildKlineTrainingMistakeCard(Object.assign({}, runtime, {
    trainingResult: result
  }), options);
  return Object.assign({}, result, {
    trainingMistakeCard,
    training_mistake_card: trainingMistakeCard
  });
}

function finishKlineTrainingRuntime(runtime = {}, options = {}) {
  const trainingResult = buildKlineTrainingResult(runtime, options);
  return buildRuntimeState(runtime, {
    completed: true,
    completedAt: trainingResult.completedAt,
    completed_at: trainingResult.completed_at,
    trainingResult,
    trainingMistakeCard: trainingResult.trainingMistakeCard,
    training_mistake_card: trainingResult.training_mistake_card,
    mustDecide: false,
    lockedUntilDecision: false,
    blockedReason: ""
  });
}

function buildKlineTrainingRecordPatch(runtime = {}) {
  const decisions = Array.isArray(runtime.decisionTimeline) ? runtime.decisionTimeline : [];
  const lastDecision = decisions[decisions.length - 1] || {};
  const activeCandle = runtime.activeCandle || (runtime.candles || [])[runtime.currentIndex] || {};
  const errorType = cleanEventText(runtime.errorType || runtime.error_type || lastDecision.errorType || lastDecision.error_type || "", 80);
  return {
    trainingSessionId: cleanEventText(runtime.trainingSessionId, 160),
    simulationMode: cleanEventText(runtime.simulationMode || "blind_step_replay", 80),
    sliceSeed: cleanEventText(runtime.sliceSeed, 120),
    errorType,
    error_type: errorType,
    selectedCandleKey: cleanEventText(lastDecision.selectedCandleKey || activeCandle.key || "", 80),
    reactionDirection: cleanEventText(lastDecision.reactionDirection, 40),
    firstReaction: cleanEventText(lastDecision.firstReaction, 160),
    boundaryChoice: cleanEventText(lastDecision.boundaryChoice, 120),
    decisionTimeline: decisions,
    emotionBadges: Array.isArray(runtime.emotionBadges) ? runtime.emotionBadges : [],
    riskHints: Array.isArray(runtime.riskHints) ? runtime.riskHints : [],
    coachHints: Array.isArray(runtime.coachHints) ? runtime.coachHints : [],
    positionState: normalizePositionState(runtime.positionState || {}),
    sessionMetrics: buildSessionMetrics(runtime.positionState || {}, decisions),
    completed: !!runtime.completed,
    trainingResult: runtime.trainingResult || null,
    trainingMistakeCard: runtime.trainingMistakeCard || runtime.training_mistake_card || ((runtime.trainingResult || {}).trainingMistakeCard) || ((runtime.trainingResult || {}).training_mistake_card) || null,
    training_mistake_card: runtime.training_mistake_card || runtime.trainingMistakeCard || ((runtime.trainingResult || {}).training_mistake_card) || ((runtime.trainingResult || {}).trainingMistakeCard) || null
  };
}

function buildKlineMindSession({
  assessment = null,
  trainingDay = null,
  record = null,
  historyCache = {}
} = {}) {
  const day = clampDay((trainingDay || {}).day || (record || {}).day || 1);
  const personalityType = (assessment || {}).primary || "平衡型";
  const stagePlan = getPersonalityStagePlan(personalityType);
  const scenario = DAY_SCENARIOS[day] || DAY_SCENARIOS[1];
  const marketKey = (record || {}).marketKey || "cn_equity";
  const timeframeKey = (record || {}).timeframeKey || "1d";
  const timeframeMeta = TIMEFRAME_CATALOG.find((item) => item.key === timeframeKey) || TIMEFRAME_CATALOG[0];
  const chartZoomKey = (record || {}).chartZoomKey || "wide";
  const chartZoomMeta = getChartZoomMeta(chartZoomKey);
  const market = getMarketConfig(marketKey);
  const historySlice = (record || {}).historySlice || getHistorySlice(historyCache, market.key, timeframeKey);
  const rawCandles = normalizeHistoryCandles(historySlice || {}, {
    windowSize: chartZoomMeta.windowSize,
    zoomKey: chartZoomMeta.key
  });
  const selectedKey = (record || {}).selectedCandleKey || "";
  const prescription = getKlinePrescription(personalityType);
  const stageGate = getSixGate(stagePlan.stageKey);
  const candles = markSelectedCandles(rawCandles, selectedKey, scenario.focusIndex);
  const chartBoardStyle = getChartBoardStyle(candles.length, chartZoomMeta.key);
  const mainIndicatorKey = (record || {}).mainIndicatorKey || "ma";
  const indicatorOverlay = buildIndicatorOverlay(candles, chartZoomMeta.key, mainIndicatorKey);
  const selectedCandleKey = selectedKey || ((candles.find((item) => item.selected) || {}).key) || "";

  return {
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
      ? ((historySlice || {}).source === "local_demo" ? "离线练习模式" : "历史练习数据已载入")
      : "等待历史练习数据",
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

function cleanEventText(value, limit = 280) {
  const text = String(value || "").trim().slice(0, limit);
  if (!text) return "";
  return text
    .replace(/(^|[^\d])1[3-9]\d{9}(?=\D|$)/g, "$1[redacted_phone]")
    .replace(/(token|access_token|authorization|验证码|code)[=:：]\s*[\w.-]+/gi, "$1=[redacted]");
}

function normalizeEventIdPart(value) {
  return cleanEventText(value, 120)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "local";
}

function getKlineLocalRecordId(record = {}) {
  const explicitId = record.localRecordId || record.id || record.recordId || record.reviewId;
  if (explicitId) return String(explicitId);
  return [
    record.day || "day",
    record.marketKey || record.market || "market",
    record.timeframeKey || record.timeframe || "timeframe",
    record.selectedCandleKey || "candle",
    record.updatedAt || record.completedAt || record.createdAt || "local"
  ].map(normalizeEventIdPart).join("-");
}

function buildOneThoughtEvent(record = {}, options = {}) {
  const identity = options.identity || {};
  const existingEvent = record.oneThoughtEvent || options.existingEvent || {};
  const localRecordId = String(options.localRecordId || record.localRecordId || existingEvent.localRecordId || getKlineLocalRecordId(record));
  const userId = cleanEventText(identity.userId || record.userId || existingEvent.userId, 96);
  const anonymousId = cleanEventText(
    identity.anonymousId || record.anonymousId || existingEvent.anonymousId || (!userId ? `anon_${normalizeEventIdPart(localRecordId)}` : ""),
    96
  );
  const updatedAt = options.updatedAt || record.updatedAt || existingEvent.updatedAt || Date.now();
  const completedAt = options.completedAt || record.completedAt || existingEvent.completedAt || updatedAt;

  return {
    eventId: cleanEventText(
      options.eventId || record.eventId || existingEvent.eventId || `one-thought-kline-${normalizeEventIdPart(localRecordId)}`,
      160
    ),
    localRecordId,
    eventType: "kline_training",
    userId,
    anonymousId,
    openid: cleanEventText(identity.openid || record.openid || existingEvent.openid, 96),
    unionid: cleanEventText(identity.unionid || record.unionid || existingEvent.unionid, 96),
    market: cleanEventText(record.marketKey || record.market || existingEvent.market, 48),
    symbol: cleanEventText(record.symbol || existingEvent.symbol, 48),
    timeframe: cleanEventText(record.timeframeKey || record.timeframe || existingEvent.timeframe, 24),
    mode: cleanEventText(options.mode || record.mode || existingEvent.mode || "kline_mind", 48),
    klineSource: cleanEventText(record.klineSource || record.sliceSource || record.dataSource || existingEvent.klineSource, 80),
    serverSliceStatus: cleanEventText(record.serverSliceStatus || existingEvent.serverSliceStatus, 80),
    serverSliceError: cleanEventText(record.serverSliceError || existingEvent.serverSliceError, 280),
    firstThought: cleanEventText(record.firstThought || record.insightLine || existingEvent.firstThought, 280),
    reactionChoice: cleanEventText(record.reactionChoice || record.firstReaction || existingEvent.reactionChoice, 80),
    boundaryState: cleanEventText(record.boundaryState || record.boundaryChoice || existingEvent.boundaryState, 80),
    mirrorType: cleanEventText(record.mirrorType || record.personalityType || existingEvent.mirrorType, 80),
    relatedMirror: cleanEventText(
      record.relatedMirror || record.relatedHeartMirror || record.primaryMirror || record.personalityType || existingEvent.relatedMirror,
      80
    ),
    clientSyncStatus: cleanEventText(options.clientSyncStatus || record.clientSyncStatus || existingEvent.clientSyncStatus || "local_saved", 32),
    createdAt: options.createdAt || record.createdAt || existingEvent.createdAt || completedAt,
    completedAt,
    updatedAt
  };
}

function buildKlineMindRecord(input = {}, session = {}) {
  const selectedCandleKey = input.selectedCandleKey || session.selectedCandleKey || "";
  const selectedCandle = (session.candles || []).find((item) => item.key === selectedCandleKey) || {};
  const reactionDirection = String(input.reactionDirection || "").trim();
  const firstReaction = String(input.firstReaction || "").trim();
  const bodySignal = String(input.bodySignal || "").trim();
  const boundaryChoice = String(input.boundaryChoice || "").trim();
  const insightLine = String(input.insightLine || "").trim();
  const record = {
    day: clampDay(input.day || session.day || 1),
    scenarioId: session.scenarioId || input.scenarioId || "",
    scenarioTitle: session.title || input.scenarioTitle || "",
    marketKey: ((session.market || {}).key) || input.marketKey || "cn_equity",
    marketName: ((session.market || {}).name) || input.marketName || "A股",
    timeframeKey: session.timeframeKey || input.timeframeKey || "1d",
    chartZoomKey: session.chartZoomKey || input.chartZoomKey || "wide",
    mode: ((session.historySlice || {}).mode) || input.mode || "step_replay",
    dataSource: ((session.historySlice || {}).source) || input.dataSource || "",
    klineSource: ((session.historySlice || {}).klineSource) || ((session.historySlice || {}).source) || input.klineSource || "",
    source: "miniprogram",
    sliceSource: ((session.historySlice || {}).sliceSource) || ((session.historySlice || {}).source) || input.sliceSource || "",
    serverSliceStatus: ((session.historySlice || {}).serverSliceStatus) || input.serverSliceStatus || "",
    serverSliceError: ((session.historySlice || {}).serverSliceError) || input.serverSliceError || "",
    symbol: ((session.historySlice || {}).symbol) || input.symbol || ((session.market || {}).defaultSymbol) || "",
    dataStart: ((session.historySlice || {}).start) || input.dataStart || "",
    dataEnd: ((session.historySlice || {}).end) || input.dataEnd || "",
    personalityType: session.personalityType || input.personalityType || "平衡型",
    secondaryType: session.secondaryType || input.secondaryType || "",
    stageKey: (session.stageGate || {}).key || input.stageKey || "",
    stageName: (session.stageGate || {}).name || input.stageName || "",
    selectedCandleKey,
    selectedCandleLabel: selectedCandle.label || selectedCandle.indexLabel || input.selectedCandleLabel || "",
    reactionDirection,
    firstReaction,
    bodySignal,
    boundaryChoice,
    insightLine,
    prescriptionTitle: ((session.prescription || {}).title) || input.prescriptionTitle || "",
    completed: !!(firstReaction && boundaryChoice && insightLine),
    updatedAt: Date.now()
  };
  const extension = {};
  [
    "trainingSessionId",
    "simulationMode",
    "sliceSeed",
    "decisionTimeline",
    "emotionBadges",
    "riskHints",
    "coachHints",
    "positionState",
    "sessionMetrics",
    "errorType",
    "error_type",
    "trainingPackId",
    "trainingPackTitle"
  ].forEach((key) => {
    if (input[key] !== undefined) extension[key] = input[key];
  });
  return Object.assign({}, record, extension, {
    score: calculateKlineMindScore(record)
  });
}

module.exports = {
  SIX_GATE_MAP,
  PERSONALITY_KLINE_PRESCRIPTIONS,
  PERSONALITY_KLINE_DRILLS,
  MARKET_CATALOG,
  TIMEFRAME_CATALOG,
  KLINE_TRAINING_METHODS,
  GATE_TRAINING_ACTIONS,
  DAY_SCENARIOS,
  REACTION_OPTIONS,
  BODY_OPTIONS,
  BOUNDARY_OPTIONS,
  getSixGate,
  getKlinePrescription,
  getPersonalityKlineDrill,
  getNextKlineMindSliceSeed,
  buildKlineTargetedTrainingEntry,
  getMarketConfig,
  normalizeHistoryCandles,
  getInitialKlineVisibleCount,
  startKlineTrainingRuntime,
  advanceKlineTrainingRuntime,
  recordKlineTrainingDecision,
  finishKlineTrainingRuntime,
  setKlineRuntimeChartZoom,
  setKlineRuntimeViewportPan,
  setKlineRuntimeIndicator,
  setKlineRuntimeMainIndicator,
  buildKlineTrainingMistakeCard,
  buildKlineTrainingRecordPatch,
  buildKlineMindSession,
  buildKlineMindRecord,
  buildOneThoughtEvent,
  calculateKlineMindScore
};
