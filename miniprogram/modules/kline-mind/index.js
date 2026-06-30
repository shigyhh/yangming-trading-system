const { getPersonalityStagePlan } = require("../../core/personality-stage-map");
const { normalizeExecutionResult } = require("../../utils/execution-terminology");
const {
  INDICATOR_CATALOG,
  MAIN_INDICATOR_OPTIONS,
  INDICATOR_PANEL_OPTIONS,
  getChartZoomMeta,
  buildChartZoomOptions,
  normalizeHistoryCandles: normalizeRuntimeHistoryCandles,
  getChartBoardStyle,
  buildIndicatorOverlay,
  getInitialKlineVisibleCount,
  startKlineTrainingRuntime,
  advanceKlineTrainingRuntime,
  recordKlineTrainingDecision,
  setKlineRuntimeChartZoom,
  setKlineRuntimeViewportPan,
  setKlineRuntimeIndicator,
  setKlineRuntimeMainIndicator,
  buildKlineTrainingRecordPatch
} = require("./runtime");

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
  },
  futures: {
    key: "futures",
    name: "期货",
    rhythm: "节奏快、长影线、情绪放大",
    defaultSymbol: "IF主连",
    rule: "保证金、连续合约、夜盘差异",
    triggerLabel: "真实历史片段",
    mindQuestion: "速度变快时，你能否先停住身体，再回到预设边界？",
    guardrail: "训练只看反应速度与守界能力，不输出操作方向。"
  },
  us_equity: {
    key: "us_equity",
    name: "美股",
    rhythm: "缺口、趋势段、尾盘波动",
    defaultSymbol: "AAPL",
    rule: "T+0、盘前盘后需独立标记",
    triggerLabel: "真实历史片段",
    mindQuestion: "缺口之后，你是在观察结构，还是在被错过感牵动？",
    guardrail: "本训练使用历史数据，不形成任何当下市场判断。"
  },
  hk_equity: {
    key: "hk_equity",
    name: "港股",
    rhythm: "流动性切换、跳动明显、反复试探",
    defaultSymbol: "00700.HK",
    rule: "T+0、交易单位与流动性需标记",
    triggerLabel: "真实历史片段",
    mindQuestion: "反复试探时，你是在等待事实更清楚，还是被不确定感牵走？",
    guardrail: "只做心理训练记录，不给出任何交易结论。"
  },
  crypto: {
    key: "crypto",
    name: "数字货币",
    rhythm: "连续交易、波动密集、情绪放大",
    defaultSymbol: "BTCUSDT",
    rule: "7x24、无涨跌幅、需标注交易所来源",
    triggerLabel: "真实历史片段",
    mindQuestion: "连续波动中，你是在守住观察窗口，还是被不断变化牵走？",
    guardrail: "只做心理训练记录，不关联任何当下决策。"
  }
};

const TIMEFRAME_CATALOG = [
  { key: "1d", label: "长线", granularity: "daily", required: true },
  { key: "60m", label: "中线", granularity: "intraday", required: true },
  { key: "30m", label: "短线", granularity: "intraday", required: true }
];

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
    title: "强触发盲练",
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

function normalizeHistoryCandles(historySlice = {}, options = {}) {
  return normalizeRuntimeHistoryCandles(historySlice, options);
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
    training_goal: "卖出后不因懊悔追回。",
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
  const timeframeKey = (record || {}).timeframeKey || "1d";
  const timeframeMeta = TIMEFRAME_CATALOG.find((item) => item.key === timeframeKey) || TIMEFRAME_CATALOG[0];
  const chartZoomMeta = getChartZoomMeta((record || {}).chartZoomKey || "wide");
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
  const selectedCandleKey = selectedKey || ((candles.find((item) => item.selected) || {}).key) || "";
  const mainIndicatorKey = (record || {}).mainIndicatorKey || "ma";
  const chartBoardStyle = getChartBoardStyle(candles.length, chartZoomMeta.key);
  const indicatorOverlay = buildIndicatorOverlay(candles, chartZoomMeta.key, mainIndicatorKey);
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
    chartOrientationHint: "横屏训练更稳，竖屏可用放大查看局部。",
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
  const reactionDirection = String(input.reactionDirection || "").trim();
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
  const runtimeExtension = {};
  [
    "trainingSessionId",
    "simulationMode",
    "sliceSeed",
    "decisionTimeline",
    "emotionBadges",
    "riskHints",
    "coachHints",
    "positionState",
    "sessionMetrics"
  ].forEach((key) => {
    if (input[key] !== undefined) runtimeExtension[key] = input[key];
  });
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
  const scoredRecord = Object.assign({}, record, runtimeExtension, {
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
  getMarketConfig,
  normalizeHistoryCandles,
  getInitialKlineVisibleCount,
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
