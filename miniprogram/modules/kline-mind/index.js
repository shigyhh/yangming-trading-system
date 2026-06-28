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
  { key: "5m", label: "5分钟", granularity: "intraday", required: true },
  { key: "10m", label: "10分钟", granularity: "intraday", required: true },
  { key: "30m", label: "30分钟", granularity: "intraday", required: true },
  { key: "60m", label: "60分钟", granularity: "intraday", required: true },
  { key: "1d", label: "日线", granularity: "daily", required: true },
  { key: "1w", label: "周线", granularity: "weekly", required: true },
  { key: "1mo", label: "月线", granularity: "monthly", required: true },
  { key: "1y", label: "年线", granularity: "yearly", required: true }
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

function normalizeHistoryCandles(historySlice = {}) {
  const candles = Array.isArray(historySlice.candles) ? historySlice.candles : [];
  if (!candles.length) return [];

  const highs = candles.map((item) => Number(item.high)).filter(Number.isFinite);
  const lows = candles.map((item) => Number(item.low)).filter(Number.isFinite);
  const volumes = candles.map((item) => Number(item.volume || 0)).filter(Number.isFinite);
  const maxHigh = Math.max.apply(null, highs);
  const minLow = Math.min.apply(null, lows);
  const maxVolume = Math.max.apply(null, volumes.concat([1]));
  const range = Math.max(0.0001, maxHigh - minLow);

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
    const bodyHeight = Math.max(6, Math.abs(openY - closeY));
    const wickHeight = Math.max(8, lowY - highY);
    const volumeHeight = Math.max(8, Math.round((volume / maxVolume) * 62));
    const key = item.id || `m${index + 1}`;
    const tone = close > open ? "gold" : close < open ? "jade" : "flat";

    return {
      key,
      label: item.focus ? "问" : "",
      indexLabel: String(index + 1).padStart(2, "0"),
      tone,
      date: item.date || item.time || "",
      open,
      high,
      low,
      close,
      volume,
      wickStyle: `height: ${Math.round(wickHeight)}rpx; top: ${Math.round(highY)}rpx;`,
      bodyStyle: `height: ${Math.round(bodyHeight)}rpx; top: ${Math.round(bodyTop)}rpx;`,
      volumeStyle: `height: ${volumeHeight}rpx;`,
      focus: !!item.focus,
      selected: false
    };
  });
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
    next_action: nextAction || ""
  };

  if (sourceReviewId) {
    context.sourceReviewId = sourceReviewId;
    context.source_review_id = sourceReviewId;
  }

  return context;
}

function pickSessionContext(session = {}) {
  const sourceType = pickValue(session.sourceType, session.source_type);
  if (sourceType === "special_training") {
    return buildSpecialTrainingContext(session);
  }
  if (sourceType !== "review_focus") return null;
  return {
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
    sourceReviewId: pickValue(session.sourceReviewId, session.source_review_id, ""),
    source_review_id: pickValue(session.sourceReviewId, session.source_review_id, "")
  };
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
    training_pack_title: context.training_pack_title || context.trainingPackTitle || ""
  };
}

function buildKlineMindSession({
  assessment = null,
  trainingDay = null,
  record = null,
  historyCache = {},
  reviewFocus = null,
  specialTraining = null
} = {}) {
  const day = clampDay((trainingDay || {}).day || (record || {}).day || 1);
  const personalityType = (assessment || {}).primary || "平衡型";
  const stagePlan = getPersonalityStagePlan(personalityType);
  const scenario = DAY_SCENARIOS[day] || DAY_SCENARIOS[1];
  const marketKey = (record || {}).marketKey || "cn_equity";
  const timeframeKey = (record || {}).timeframeKey || "1d";
  const timeframeMeta = TIMEFRAME_CATALOG.find((item) => item.key === timeframeKey) || TIMEFRAME_CATALOG[4];
  const market = getMarketConfig(marketKey);
  const historySlice = (record || {}).historySlice || getHistorySlice(historyCache, market.key, timeframeKey);
  const rawCandles = normalizeHistoryCandles(historySlice || {});
  const selectedKey = (record || {}).selectedCandleKey || "";
  const prescription = getKlinePrescription(personalityType);
  const stageGate = getSixGate(stagePlan.stageKey);
  const candles = markSelectedCandles(rawCandles, selectedKey, scenario.focusIndex);
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
    historySlice: historySlice || null,
    hasHistoricalData: candles.length > 0,
    dataStatusText: candles.length ? "真实历史数据已载入" : "等待历史数据同步",
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

  const trainingContext = reviewFocusContext || specialTrainingContext;
  return trainingContext ? Object.assign({}, session, trainingContext) : session;
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
  getMarketConfig,
  normalizeHistoryCandles,
  buildKlineMindSession,
  buildKlineMindRecord,
  calculateKlineMindScore
};
