import crypto from "node:crypto";
import path from "node:path";
import { config } from "../config.js";
import { appendRuntimeRecord, readJsonFile, readRuntimeRecords, writeJsonFile } from "../lib/store.js";

const PRACTICE_FILE = "kline-practice-results.json";
const DAILY_LIMIT = 3;
const ASHARE_HISTORY_PREFIX = "ASHARE";
const ASHARE_PUBLIC_HISTORY_PREFIX = "ASHAREX";
const ASHARE_VISIBLE_COUNT = 100;
const ASHARE_FUTURE_COUNT = 50;
const ASHARE_SCENE_SAMPLE_COUNT = 18;
const ASHARE_STOCK_POOL_CACHE_MS = 1000 * 60 * 60 * 6;
const ASHARE_TIMEFRAMES = {
  "30": { klt: "30", label: "30分钟K" },
  "60": { klt: "60", label: "60分钟K" },
  "101": { klt: "101", label: "日K" },
  "102": { klt: "102", label: "周K" },
  "103": { klt: "103", label: "月K" }
};
const DEFAULT_ASHARE_STOCK_POOL = [
  { code: "600519", name: "贵州茅台", secid: "1.600519" },
  { code: "300750", name: "宁德时代", secid: "0.300750" },
  { code: "002594", name: "比亚迪", secid: "0.002594" },
  { code: "600036", name: "招商银行", secid: "1.600036" },
  { code: "601318", name: "中国平安", secid: "1.601318" },
  { code: "300059", name: "东方财富", secid: "0.300059" },
  { code: "601012", name: "隆基绿能", secid: "1.601012" },
  { code: "000858", name: "五粮液", secid: "0.000858" },
  { code: "000002", name: "万科A", secid: "0.000002" },
  { code: "600030", name: "中信证券", secid: "1.600030" },
  { code: "002475", name: "立讯精密", secid: "0.002475" },
  { code: "601138", name: "工业富联", secid: "1.601138" }
];
const marketKlineCache = new Map();
let ashareStockPoolCache = { stocks: [], createdAt: 0 };
const KLINE_STAGES = [
  {
    id: "daily",
    name: "每日三问",
    subtitle: "每天3题，先守住基本功",
    required_streak_days: 0,
    personality_type: "",
    focus: "双盲训练"
  },
  {
    id: "axis_conscience",
    name: "致良知关",
    subtitle: "先看见自己是贪、怕，还是不甘心",
    required_streak_days: 0,
    personality_type: "",
    focus: "下单前一念"
  },
  {
    id: "axis_unity",
    name: "知行合一关",
    subtitle: "情绪上来后，还能不能照计划做",
    required_streak_days: 0,
    personality_type: "",
    focus: "按计划执行"
  },
  {
    id: "axis_mind",
    name: "心即理关",
    subtitle: "心乱时，不把K线当理由",
    required_streak_days: 0,
    personality_type: "",
    focus: "分清事实想象"
  },
  {
    id: "axis_outside",
    name: "心外无物关",
    subtitle: "不把别人的情绪接成自己的交易",
    required_streak_days: 0,
    personality_type: "",
    focus: "不接外界情绪"
  },
  {
    id: "axis_practice",
    name: "事上磨关",
    subtitle: "在最想乱动的盘面上练定力",
    required_streak_days: 0,
    personality_type: "",
    focus: "在诱惑处训练"
  },
  {
    id: "axis_thief",
    name: "破心中贼关",
    subtitle: "看见回本、面子和自欺",
    required_streak_days: 0,
    personality_type: "",
    focus: "破回本执念"
  },
  {
    id: "impulse",
    name: "冲动型专属关卡",
    subtitle: "练下单前暂停，不被急拉带走",
    required_streak_days: 0,
    personality_type: "冲动型",
    focus: "追涨冲动"
  },
  {
    id: "stop_loss",
    name: "扛单型止损关卡",
    subtitle: "练破位执行，不和亏损辩论",
    required_streak_days: 0,
    personality_type: "扛单型",
    focus: "破位执行"
  },
  {
    id: "trial",
    name: "完美型试错关",
    subtitle: "练小仓试错，不等完美才行动",
    required_streak_days: 0,
    personality_type: "完美主义型",
    focus: "计划试错"
  },
  {
    id: "counterproof",
    name: "偏执型反证关",
    subtitle: "练先找反证，不把观点当事实",
    required_streak_days: 0,
    personality_type: "偏执型",
    focus: "反证检查"
  },
  {
    id: "anxiety",
    name: "焦虑型持心关卡",
    subtitle: "练持仓定力，不把波动当命令",
    required_streak_days: 0,
    personality_type: "焦虑型",
    focus: "持仓定力"
  },
  {
    id: "independent",
    name: "从众型独立关",
    subtitle: "练独立决策，不被热闹带走",
    required_streak_days: 0,
    personality_type: "从众型",
    focus: "独立决策"
  },
  {
    id: "position",
    name: "赌徒型仓位关",
    subtitle: "练分仓与停手，不靠一把翻身",
    required_streak_days: 0,
    personality_type: "赌徒型",
    focus: "仓位纪律"
  },
  {
    id: "execution",
    name: "拖延型执行关",
    subtitle: "练条件触发后的立即行动",
    required_streak_days: 0,
    personality_type: "拖延型",
    focus: "关键动作"
  },
  {
    id: "balanced",
    name: "平衡型系统关",
    subtitle: "练少犯错、少乱动、按系统复盘",
    required_streak_days: 0,
    personality_type: "平衡型",
    focus: "系统纪律"
  },
  {
    id: "advanced",
    name: "知行合一进阶关卡",
    subtitle: "连续21天后进入综合修行",
    required_streak_days: 21,
    personality_type: "",
    focus: "稳定复利"
  }
];

export async function getNextKlinePractice({
  userId = "",
  excludeIds = [],
  stageId = "",
  personalityType = "",
  timeframe = "",
  instrumentKey = "",
  axisFocus = "",
  axisSubtitle = "",
  requireReal = false
} = {}) {
  const records = userId ? await readRuntimeRecords(PRACTICE_FILE) : [];
  const level = userId ? buildKlineLevel(records, userId, { requestedStageId: stageId }) : buildGuestKlineLevel(stageId);
  const baseActiveStage = level.active_stage || KLINE_STAGES[0];
  const safeAxisFocus = String(axisFocus || "").trim().slice(0, 60);
  const safeAxisSubtitle = String(axisSubtitle || "").trim().slice(0, 140);
  const activeStage = {
    ...baseActiveStage,
    focus: safeAxisFocus || baseActiveStage.focus,
    subtitle: safeAxisSubtitle || baseActiveStage.subtitle
  };
  const recentIds = records
    .filter((item) => item.user_id === userId)
    .slice(-80)
    .map((item) => item.scenario_id);
  try {
    const scenario = await getNextAshareHistoryPractice({ activeStage, excludeIds: [...recentIds, ...excludeIds], timeframe, instrumentKey });
    return {
      ...toPublicScenario(scenario),
      active_stage: activeStage
    };
  } catch (error) {
    if (requireReal) {
      const realDataError = new Error("真实A股历史K线暂时无法连接，请确认服务器网络可访问东方财富历史行情接口。");
      realDataError.statusCode = 503;
      realDataError.cause = error;
      throw realDataError;
    }
    console.warn("A股历史K线拉取失败，回退到本地心性题库。", error.message);
  }

  const bank = await loadKlinePracticeBank();
  const targetType = personalityType || activeStage.personality_type || "";
  const excluded = new Set([...recentIds, ...excludeIds].filter(Boolean));
  const stagePool = targetType ? bank.filter((item) => item.personality_type === targetType) : bank;
  const typedPool = stagePool.length ? stagePool : bank;
  const freshPool = typedPool.filter((item) => !excluded.has(item.id));
  const pool = freshPool.length ? freshPool : typedPool;
  const scenario = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...toPublicScenario(scenario),
    active_stage: activeStage
  };
}

export async function getUserKlineStats(userId) {
  if (!userId) {
    const error = new Error("user_id 不能为空");
    error.statusCode = 400;
    throw error;
  }

  const records = (await readRuntimeRecords(PRACTICE_FILE)).filter((item) => item.user_id === userId);
  const level = buildKlineLevel(records, userId);
  return {
    user_id: userId,
    total_points: records.reduce((sum, item) => sum + creditedPoints(item), 0),
    best_score: records.reduce((best, item) => Math.max(best, Number(item.score || 0)), 0),
    practice_count: records.length,
    today_count: level.daily_quota.used,
    daily_quota: level.daily_quota,
    streak_days: level.streak_days,
    unlocked_stage_count: level.unlocked_stages.length,
    unlocked_stages: level.unlocked_stages,
    active_stage: level.active_stage,
    last_practice_at: records.at(-1)?.created_at || null
  };
}

export async function getUserKlineLevel(userId, requestedStageId = "") {
  if (!userId) {
    return buildGuestKlineLevel(requestedStageId);
  }

  const records = await readRuntimeRecords(PRACTICE_FILE);
  return buildKlineLevel(records, userId, { requestedStageId });
}

export async function getKlineBankStats() {
  const bank = await loadKlinePracticeBank();
  const byType = {};
  const byScene = {};
  for (const item of bank) {
    byType[item.personality_type] = (byType[item.personality_type] || 0) + 1;
    byScene[item.scene_type] = (byScene[item.scene_type] || 0) + 1;
  }
  return {
    total_questions: bank.length,
    personality_counts: byType,
    scene_counts: byScene,
    version: "kline_1500_v1"
  };
}

export async function submitKlinePractice({
  userId,
  nickname = "体验学员",
  scenarioId,
  decision,
  score,
  discipline,
  note = "",
  requestNext = false,
  stageId = "daily"
}) {
  if (!userId) {
    const error = new Error("user_id 不能为空");
    error.statusCode = 400;
    throw error;
  }

  const scenario = await findScenario(scenarioId);
  const records = await readRuntimeRecords(PRACTICE_FILE);
  const normalizedScenarioId = scenario?.id || scenarioId || "daily-kline";
  const existingRecord = records.find((item) => item.user_id === userId && item.scenario_id === normalizedScenarioId);
  if (existingRecord) {
    return {
      result: {
        ...existingRecord,
        duplicate: true
      },
      insight: buildPracticeInsight(existingRecord, scenario),
      next_scenario: requestNext ? await getNextKlinePractice({ userId, excludeIds: [normalizedScenarioId], stageId: existingRecord.stage_id }) : null,
      kline_stats: buildUserKlineStats(records, userId),
      kline_level: buildKlineLevel(records, userId, { requestedStageId: existingRecord.stage_id })
    };
  }

  const levelBefore = buildKlineLevel(records, userId, { requestedStageId: stageId });
  const evaluation = evaluateDecision({ scenario, decision, score, discipline, note });
  const normalizedScore = clamp(Number(evaluation.score || 0), 0, 100);
  const normalizedDiscipline = clamp(Number(evaluation.discipline || 0), 0, 100);
  const practicePoints = Math.round(normalizedScore * 0.6 + normalizedDiscipline * 0.4);
  const countsForDaily = levelBefore.daily_quota.remaining > 0;
  const rankingPoints = countsForDaily ? practicePoints : 0;
  const record = {
    id: crypto.randomUUID(),
    user_id: userId,
    nickname: String(nickname || "体验学员").slice(0, 80),
    scenario_id: normalizedScenarioId,
    stage_id: levelBefore.active_stage?.id || stageId || "daily",
    personality_type: scenario?.personality_type || "",
    focus: scenario?.focus || "",
    decision: decision || "未选择",
    score: normalizedScore,
    discipline: normalizedDiscipline,
    practice_points: practicePoints,
    ranking_points: rankingPoints,
    counts_for_daily: countsForDaily,
    daily_limit: DAILY_LIMIT,
    note: evaluation.note,
    created_at: new Date().toISOString()
  };

  await appendRuntimeRecord(PRACTICE_FILE, record);
  const nextRecords = records.concat(record);

  return {
    result: record,
    insight: buildPracticeInsight(record, scenario),
    next_scenario: requestNext ? await getNextKlinePractice({ userId, excludeIds: [record.scenario_id], stageId: record.stage_id }) : null,
    kline_stats: buildUserKlineStats(nextRecords, userId),
    kline_level: buildKlineLevel(nextRecords, userId, { requestedStageId: record.stage_id })
  };
}

export async function getKlineLeaderboard({ limit = 20, period = "week" } = {}) {
  const records = filterRecordsByPeriod(await readRuntimeRecords(PRACTICE_FILE), period);
  const byUser = new Map();

  for (const record of records) {
    const current = byUser.get(record.user_id) || {
      user_id: record.user_id,
      nickname: record.nickname,
      total_points: 0,
      best_score: 0,
      practice_count: 0,
      last_practice_at: record.created_at
    };
    current.nickname = record.nickname || current.nickname;
    current.total_points += creditedPoints(record);
    current.best_score = Math.max(current.best_score, Number(record.score || 0));
    current.practice_count += 1;
    if (new Date(record.created_at).getTime() > new Date(current.last_practice_at).getTime()) {
      current.last_practice_at = record.created_at;
    }
    byUser.set(record.user_id, current);
  }

  const leaderboard = Array.from(byUser.values())
    .sort((a, b) => b.total_points - a.total_points || b.best_score - a.best_score || b.practice_count - a.practice_count)
    .slice(0, Number(limit) || 20)
    .map((item, index) => ({
      rank: index + 1,
      ...item
    }));

  return { period: normalizePeriod(period), leaderboard };
}

export async function loadKlinePracticeBank() {
  const bank = await readJsonFile(config.klinePracticeBankPath, []);
  if (!bank.length) {
    const error = new Error("K线心性练习题库为空，请先运行 npm run generate:kline");
    error.statusCode = 500;
    throw error;
  }
  return bank;
}

async function findScenario(scenarioId) {
  if (!scenarioId) return null;
  if (scenarioId.startsWith(`${ASHARE_HISTORY_PREFIX}-`) || scenarioId.startsWith(`${ASHARE_PUBLIC_HISTORY_PREFIX}-`)) {
    return findAshareHistoryScenario(scenarioId);
  }
  const bank = await loadKlinePracticeBank();
  return bank.find((item) => item.id === scenarioId) || null;
}

function evaluateDecision({ scenario, decision, score, discipline, note }) {
  if (!scenario) {
    return {
      score: Number(score || 0),
      discipline: Number(discipline || 0),
      note: note || "练习的重点不是猜对，而是看见自己在波动面前如何起心动念。"
    };
  }

  if (decision?.startsWith("回放完成")) {
    return {
      score: Number(score || 0),
      discipline: Number(discipline || 0),
      note: note || "本轮K线回放已完成，重点复盘操作节奏、仓位变化和最大回撤。"
    };
  }

  const optionEvaluation = scenario.decisions?.[decision];
  if (optionEvaluation) {
    return {
      score: Number(optionEvaluation.score || 0),
      discipline: Number(optionEvaluation.discipline || 0),
      note: optionEvaluation.note || scenario.yangming_lesson || "这一题练的是在真实波动前守住计划。"
    };
  }

  if (decision === scenario.right_decision) {
    return {
      score: 92,
      discipline: 94,
      note: `这一念能守住，便是事上练。${scenario.yangming_lesson}`
    };
  }

  if (decision === scenario.wrong_decision) {
    return {
      score: 38,
      discipline: 26,
      note: `这一念正是「${scenario.focus}」的考题。${scenario.yangming_lesson}`
    };
  }

  return {
    score: 70,
    discipline: 76,
    note: `能暂停观照已有进步，但还要回到计划动作。${scenario.yangming_lesson}`
  };
}

function toPublicScenario(scenario) {
  const isAshareHistory = scenario.data_source === "eastmoney_history";
  return {
    id: scenario.id,
    title: isAshareHistory ? scenario.title || `${scenario.timeframe_label || "日K"}复盘训练｜随机A股历史片段` : scenario.title,
    prompt: scenario.prompt,
    scene_type: scenario.scene_type,
    personality_type: scenario.personality_type,
    focus: scenario.focus,
    candles: isAshareHistory ? sanitizeAsharePublicCandles(scenario.candles) : scenario.candles,
    visible_count: scenario.visible_count,
    future_count: scenario.future_count,
    market: scenario.market,
    timeframe: scenario.timeframe,
    timeframe_label: scenario.timeframe_label,
    ...(isAshareHistory ? {
      anonymous: true,
      reveal_policy: "训练前隐藏股票名、代码、日期；训练完成后可选择揭晓历史片段。"
    } : {
      instrument_key: scenario.instrument_key
    }),
    data_source: scenario.data_source,
    options: scenario.options,
    difficulty: scenario.difficulty,
    version: scenario.version
  };
}

async function getNextAshareHistoryPractice({ activeStage, excludeIds = [], timeframe = "", instrumentKey = "" } = {}) {
  const excluded = new Set(excludeIds.filter(Boolean));
  const klt = normalizeAshareTimeframe(timeframe);
  const stockPool = await getAshareStockPool();
  const preferredStock = resolveAshareStockByInstrumentKey(stockPool, instrumentKey);
  const shuffledStockPool = shuffle(stockPool.filter((item) => item.code !== preferredStock?.code));
  const attempts = preferredStock ? [preferredStock, ...shuffledStockPool].slice(0, 18) : shuffledStockPool.slice(0, 18);

  for (const stock of attempts) {
    const candles = await fetchAshareKlines(stock.code, klt);
    const windowSize = ASHARE_VISIBLE_COUNT + ASHARE_FUTURE_COUNT;
    if (candles.length < windowSize + 20) continue;

    const startIndexes = chooseAshareStartIndexes(candles, { activeStage, windowSize });
    for (const startIndex of startIndexes) {
      const scenarioId = buildAshareScenarioId(stock.code, klt, startIndex, ASHARE_VISIBLE_COUNT, ASHARE_FUTURE_COUNT);
      if (excluded.has(scenarioId)) continue;

      return buildAshareScenario({
        stock,
        candles,
        klt,
        startIndex,
        visibleCount: ASHARE_VISIBLE_COUNT,
        futureCount: ASHARE_FUTURE_COUNT,
        activeStage
      });
    }
  }

  const error = new Error("暂时没有可用的A股历史K线片段");
  error.statusCode = 503;
  throw error;
}

function chooseAshareStartIndexes(candles, { activeStage = null, windowSize = ASHARE_VISIBLE_COUNT + ASHARE_FUTURE_COUNT } = {}) {
  const maxStart = candles.length - windowSize - 1;
  const minStart = Math.min(12, Math.max(maxStart, 0));
  if (maxStart <= minStart) return [Math.max(maxStart, 0)];

  const candidates = new Set();
  const count = Math.min(ASHARE_SCENE_SAMPLE_COUNT, Math.max(maxStart - minStart, 1));
  for (let index = 0; index < count; index += 1) {
    candidates.add(minStart + Math.floor(Math.random() * Math.max(maxStart - minStart, 1)));
  }

  return Array.from(candidates)
    .map((startIndex) => ({
      startIndex,
      score: scoreAshareWindowForStage(candles, startIndex, activeStage)
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.startIndex);
}

function scoreAshareWindowForStage(candles, startIndex, activeStage = null) {
  const visible = candles.slice(startIndex, startIndex + ASHARE_VISIBLE_COUNT);
  const future = candles.slice(startIndex + ASHARE_VISIBLE_COUNT, startIndex + ASHARE_VISIBLE_COUNT + ASHARE_FUTURE_COUNT);
  if (!visible.length || !future.length) return Math.random();

  const text = `${activeStage?.id || ""} ${activeStage?.name || ""} ${activeStage?.focus || ""} ${activeStage?.subtitle || ""}`;
  const last = visible.at(-1);
  const first = visible[0];
  const fiveAgo = visible.at(-6) || first;
  const tenAgo = visible.at(-11) || first;
  const twentyAgo = visible.at(-21) || first;
  const futureLast = future.at(-1) || last;
  const visibleReturn = percentChange(last.close, first.close);
  const recentReturn = percentChange(last.close, fiveAgo.close);
  const trendReturn = percentChange(last.close, twentyAgo.close);
  const futureReturn = percentChange(futureLast.close, last.close);
  const futureHigh = Math.max(...future.map((item) => item.high));
  const futureLow = Math.min(...future.map((item) => item.low));
  const maxRunup = percentChange(futureHigh, last.close);
  const maxDrawdown = percentChange(futureLow, last.close);
  const volatility = averageCandleRange(visible.slice(-24));
  const latestGap = Math.abs(percentChange(last.open, tenAgo.close));
  let score = Math.random() * 2;

  if (/拉升|怕踏空|龙头|热闹|利好|卖飞|追回|比较|空仓焦虑/.test(text)) {
    score += Math.max(recentReturn, 0) * 2.5 + Math.max(trendReturn, 0) * 0.8 + Math.max(maxRunup, 0) * 0.8;
  }
  if (/补仓|认亏|止损|破位|利空|扛|回本|小赚|大亏|隐瞒|仓位失控|长线短线/.test(text)) {
    score += Math.abs(Math.min(recentReturn, 0)) * 2 + Math.abs(Math.min(maxDrawdown, 0)) * 1.2 + Math.abs(Math.min(futureReturn, 0)) * 0.7;
  }
  if (/频繁|闲不住|震荡|指标|画线|大盘|红绿|复盘|心即理/.test(text)) {
    score += volatility * 2 + Math.abs(visibleReturn) * 0.35;
  }
  if (/群友|大V|观点|消息|心外无物|外界/.test(text)) {
    score += latestGap * 1.2 + volatility * 1.2 + Math.abs(recentReturn) * 0.7;
  }
  if (/知行合一|计划|执行|开盘|尾盘|拖延|规则/.test(text)) {
    score += Math.abs(recentReturn) * 1.2 + Math.abs(futureReturn) * 0.8 + volatility;
  }
  if (/事上磨|诱惑|轮动|妖股/.test(text)) {
    score += Math.max(recentReturn, 0) * 1.3 + volatility * 1.5 + Math.max(maxRunup, 0) * 0.5;
  }
  if (/平衡|系统|纪律|稳定|少犯错|少乱动/.test(text)) {
    score += Math.abs(trendReturn) * 0.45 + volatility * 0.8 + Math.abs(futureReturn) * 0.45;
  }

  return score;
}

function percentChange(value, base) {
  const denominator = Number(base || 0);
  if (!denominator) return 0;
  return ((Number(value || 0) - denominator) / denominator) * 100;
}

function averageCandleRange(candles) {
  if (!candles.length) return 0;
  return candles.reduce((sum, item) => {
    const base = Number(item.close || item.open || 0);
    if (!base) return sum;
    return sum + ((Number(item.high || 0) - Number(item.low || 0)) / base) * 100;
  }, 0) / candles.length;
}

async function findAshareHistoryScenario(scenarioId) {
  const descriptor = parseAshareScenarioDescriptor(scenarioId);
  const { code, klt, startIndex, visibleCount, futureCount } = descriptor;
  if (!code) {
    const error = new Error("K线训练片段无效，请重新抽取");
    error.statusCode = 400;
    throw error;
  }
  const stockPool = await getAshareStockPool();
  const stock = stockPool.find((item) => item.code === code) || { code, name: "A股历史片段" };
  const normalizedKlt = normalizeAshareTimeframe(klt || "101");
  const candles = await fetchAshareKlines(code, normalizedKlt);
  return buildAshareScenario({
    stock,
    candles,
    klt: normalizedKlt,
    startIndex,
    visibleCount,
    futureCount
  });
}

async function fetchAshareKlines(code, klt = "101") {
  const normalizedKlt = normalizeAshareTimeframe(klt);
  const cacheKey = `${code}:${normalizedKlt}`;
  const cached = marketKlineCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < 1000 * 60 * 30) return cached.candles;

  const localCandles = await readCachedAshareKlines(code, normalizedKlt);
  if (localCandles.length) {
    marketKlineCache.set(cacheKey, { candles: localCandles, createdAt: Date.now() });
    return localCandles;
  }

  const candles = await fetchAshareKlinesFromRemote(code, normalizedKlt);
  await writeCachedAshareKlines(code, normalizedKlt, candles);
  marketKlineCache.set(cacheKey, { candles, createdAt: Date.now() });
  return candles;
}

async function getAshareStockPool() {
  if (ashareStockPoolCache.stocks.length && Date.now() - ashareStockPoolCache.createdAt < ASHARE_STOCK_POOL_CACHE_MS) {
    return ashareStockPoolCache.stocks;
  }

  const localStocks = await readCachedAshareStockPool();
  if (localStocks.length) {
    ashareStockPoolCache = { stocks: localStocks, createdAt: Date.now() };
    return localStocks;
  }

  try {
    const stocks = await fetchAshareStockPool();
    if (stocks.length >= 1000) {
      await writeCachedAshareStockPool(stocks);
      ashareStockPoolCache = { stocks, createdAt: Date.now() };
      return stocks;
    }
  } catch (error) {
    console.warn("全A股股票池拉取失败，使用内置样本池。", error.message);
  }

  return DEFAULT_ASHARE_STOCK_POOL;
}

export async function cacheAshareMarketData({
  codes = [],
  limit = 50,
  timeframes = ["101"],
  delayMs = 250,
  skipExisting = true,
  incremental = false,
  refreshPool = false,
  onProgress = null
} = {}) {
  if (refreshPool) {
    await refreshAshareStockPool();
  }
  const stockPool = codes.length
    ? codes.map((code) => ({ code: String(code).trim(), name: "", secid: `${String(code).startsWith("6") ? "1" : "0"}.${String(code).trim()}` })).filter((item) => item.code)
    : (await getAshareStockPool()).slice(0, Math.max(Number(limit || 50), 1));
  const normalizedTimeframes = [...new Set(timeframes.map(normalizeAshareTimeframe))];
  const results = [];

  for (const stock of stockPool) {
    for (const klt of normalizedTimeframes) {
      try {
        const cachedCandles = await readCachedAshareKlines(stock.code, klt);
        if (skipExisting) {
          if (cachedCandles.length && !incremental) {
            results.push({ code: stock.code, klt, ok: true, skipped: true, candles: cachedCandles.length });
            if (typeof onProgress === "function") onProgress(results.at(-1), results.length, stockPool.length * normalizedTimeframes.length);
            continue;
          }
        }

        if (incremental && cachedCandles.length) {
          const begin = nextAshareBeginDate(cachedCandles.at(-1)?.date);
          const freshCandles = await fetchAshareKlinesFromRemote(stock.code, klt, { begin });
          const mergedCandles = mergeAshareCandles(cachedCandles, freshCandles);
          const added = Math.max(mergedCandles.length - cachedCandles.length, 0);
          if (added > 0) await writeCachedAshareKlines(stock.code, klt, mergedCandles);
          results.push({
            code: stock.code,
            klt,
            ok: true,
            incremental: true,
            candles: mergedCandles.length,
            added,
            latest_date: mergedCandles.at(-1)?.date || ""
          });
        } else {
          const candles = await fetchAshareKlinesFromRemote(stock.code, klt);
          await writeCachedAshareKlines(stock.code, klt, candles);
          results.push({ code: stock.code, klt, ok: true, candles: candles.length, latest_date: candles.at(-1)?.date || "" });
        }
      } catch (error) {
        results.push({ code: stock.code, klt, ok: false, error: error.message });
      }
      if (typeof onProgress === "function") onProgress(results.at(-1), results.length, stockPool.length * normalizedTimeframes.length);
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  return {
    ok: results.some((item) => item.ok),
    total: results.length,
    success: results.filter((item) => item.ok).length,
    skipped: results.filter((item) => item.skipped).length,
    added: results.reduce((sum, item) => sum + Number(item.added || 0), 0),
    failed: results.filter((item) => !item.ok).length,
    results
  };
}

export async function refreshAshareStockPool() {
  const stocks = await fetchAshareStockPool();
  if (stocks.length < 1000) {
    const error = new Error(`A股股票池数量异常：${stocks.length}`);
    error.statusCode = 502;
    throw error;
  }
  await writeCachedAshareStockPool(stocks);
  ashareStockPoolCache = { stocks, createdAt: Date.now() };
  return {
    ok: true,
    total: stocks.length,
    updated_at: new Date().toISOString()
  };
}

async function fetchAshareKlinesFromRemote(code, klt = "101", { begin = config.ashareKlineBegin, end = "20500101" } = {}) {
  const normalizedKlt = normalizeAshareTimeframe(klt);
  const fetchKlt = normalizedKlt === "5d" ? "101" : normalizedKlt;
  const secid = `${code.startsWith("6") ? "1" : "0"}.${code}`;
  const params = new URLSearchParams({
    secid,
    fields1: "f1,f2,f3,f4,f5,f6",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
    klt: fetchKlt,
    fqt: "0",
    beg: normalizeAshareQueryDate(begin),
    end: normalizeAshareQueryDate(end),
    lmt: String(config.ashareKlineLimit)
  });
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?${params.toString()}`;
  const data = await fetchJsonWithTimeout(url, 3600);
  const rows = data?.data?.klines || [];
  let candles = rows
    .map((row) => {
      const [date, open, close, high, low, volume, amount, amplitude, pct] = String(row).split(",");
      return {
        date,
        open: Number(open),
        close: Number(close),
        high: Number(high),
        low: Number(low),
        volume: Number(volume || 0),
        amount: Number(amount || 0),
        pct_chg: Number(pct || 0)
      };
    })
    .filter(isValidCandle);

  if (normalizedKlt === "5d") {
    candles = aggregateCandles(candles, 5);
  }

  if (!candles.length) throw new Error(`A股K线为空：${code}`);
  return candles;
}

function mergeAshareCandles(existing = [], fresh = []) {
  const byDate = new Map();
  for (const item of [...existing, ...fresh]) {
    if (isValidCandle(item)) byDate.set(String(item.date), item);
  }
  return Array.from(byDate.values()).sort((a, b) => compareAshareDate(a.date, b.date));
}

function nextAshareBeginDate(dateText = "") {
  const normalized = normalizeAshareQueryDate(String(dateText).split("~").at(-1));
  if (!/^\d{8}$/.test(normalized)) return config.ashareKlineBegin;
  const date = new Date(`${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return config.ashareKlineBegin;
  date.setDate(date.getDate() + 1);
  return getAshareDateKey(date);
}

function normalizeAshareQueryDate(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 8) return digits.slice(0, 8);
  return config.ashareKlineBegin;
}

function compareAshareDate(left, right) {
  return normalizeAshareQueryDate(left).localeCompare(normalizeAshareQueryDate(right));
}

function getAshareDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

async function readCachedAshareKlines(code, klt) {
  const cache = await readJsonFile(getAshareKlineFilePath(code, klt), null);
  const candles = cache?.candles || [];
  return Array.isArray(candles) ? candles.filter(isValidCandle) : [];
}

async function writeCachedAshareKlines(code, klt, candles) {
  await writeJsonFile(getAshareKlineFilePath(code, klt), {
    code,
    klt,
    timeframe_label: getKltLabel(klt),
    source: "historical_market_cache",
    updated_at: new Date().toISOString(),
    candles
  });
}

async function readCachedAshareStockPool() {
  const cache = await readJsonFile(path.join(config.marketDataDir, "stock-pool.json"), null);
  const stocks = Array.isArray(cache?.stocks) ? cache.stocks : [];
  return stocks.filter(isValidAshareStock);
}

async function writeCachedAshareStockPool(stocks) {
  await writeJsonFile(path.join(config.marketDataDir, "stock-pool.json"), {
    source: "historical_market_cache",
    updated_at: new Date().toISOString(),
    stocks
  });
}

function getAshareKlineFilePath(code, klt) {
  return path.join(config.marketDataDir, "ashare", normalizeAshareTimeframe(klt), `${code}.json`);
}

function isValidCandle(item) {
  return item?.date && [item.open, item.close, item.high, item.low].every((value) => Number.isFinite(value) && value > 0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAshareStockPool() {
  const pageSize = 100;
  const maxPages = 80;
  const byCode = new Map();

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      pn: String(page),
      pz: String(pageSize),
      po: "1",
      np: "1",
      ut: "bd1d9ddb04089700cf9c27f6f7426281",
      fltt: "2",
      invt: "2",
      fid: "f3",
      fs: "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23",
      fields: "f12,f13,f14"
    });
    const url = `https://push2.eastmoney.com/api/qt/clist/get?${params.toString()}`;
    let data;
    try {
      data = await fetchJsonWithRetry(url, 5000, 3);
    } catch (error) {
      if (byCode.size >= 1000) break;
      throw error;
    }
    const rows = data?.data?.diff || [];
    for (const item of rows) {
      const stock = {
        code: String(item.f12 || "").trim(),
        name: String(item.f14 || "").trim(),
        secid: `${item.f13}.${item.f12}`
      };
      if (isValidAshareStock(stock)) byCode.set(stock.code, stock);
    }
    if (rows.length < pageSize) break;
    await sleep(220);
  }

  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
}

async function fetchJsonWithRetry(url, timeoutMs, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchJsonWithTimeout(url, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(400 * attempt);
    }
  }
  throw lastError;
}

function isValidAshareStock(stock) {
  if (!stock.code || !stock.name) return false;
  if (!/^(000|001|002|003|300|301|600|601|603|605|688|689)\d{3}$/.test(stock.code)) return false;
  if (/退|退市/.test(stock.name)) return false;
  return true;
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; xxjyxt-kline-training/1.0)"
      }
    });
    if (!response.ok) throw new Error(`行情接口状态异常：${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function buildAshareScenario({ stock, candles, klt, startIndex, visibleCount, futureCount, activeStage = null }) {
  const safeStart = clamp(startIndex, 0, Math.max(candles.length - visibleCount - futureCount, 0));
  const segment = candles.slice(safeStart, safeStart + visibleCount + futureCount);
  const visible = segment.slice(0, visibleCount);
  const future = segment.slice(visibleCount);
  const decisionCandle = visible.at(-1);
  const finalCandle = future.at(-1) || decisionCandle;
  const decisionPrice = Number(decisionCandle.close || 0);
  const futureReturn = decisionPrice ? ((finalCandle.close - decisionPrice) / decisionPrice) * 100 : 0;
  const futureHigh = future.length ? Math.max(...future.map((item) => item.high)) : decisionPrice;
  const futureLow = future.length ? Math.min(...future.map((item) => item.low)) : decisionPrice;
  const maxRunup = decisionPrice ? ((futureHigh - decisionPrice) / decisionPrice) * 100 : 0;
  const maxDrawdown = decisionPrice ? ((futureLow - decisionPrice) / decisionPrice) * 100 : 0;
  const rightDecision = chooseAshareRightDecision({ futureReturn, maxRunup, maxDrawdown });
  const focus = activeStage?.focus || "买卖点纪律";
  const stageName = activeStage?.name || "双盲K线训练";
  const scenario = {
    id: buildAshareScenarioId(stock.code, klt, safeStart, visibleCount, futureCount),
    title: `${stageName}｜${getKltLabel(klt)}随机A股片段`,
    prompt: activeStage?.subtitle || "系统随机抽取一段已脱敏的A股历史K线。每一步只选择买入、卖出、观望，观察账户和盘面如何变化。",
    scene_type: "A股历史K线",
    personality_type: activeStage?.personality_type || "综合训练",
    focus,
    candles: normalizeAshareSegment(segment),
    visible_count: visibleCount,
    future_count: futureCount,
    market: "A股",
    timeframe: klt,
    timeframe_label: getKltLabel(klt),
    instrument_key: createAshareInstrumentKey(stock.code),
    source_meta: {
      code: stock.code,
      name: stock.name || "A股历史片段",
      date_from: segment[0]?.date || "",
      date_to: segment.at(-1)?.date || ""
    },
    data_source: "eastmoney_history",
    options: [
      { label: "买入", principle: "开仓试错" },
      { label: "卖出", principle: "离场保护" },
      { label: "观望", principle: "等待确认" }
    ],
    decisions: buildAshareDecisionMap({ rightDecision, futureReturn, maxRunup, maxDrawdown }),
    right_decision: rightDecision,
    wrong_decision: rightDecision === "买点开仓" ? "卖点离场" : "买点开仓",
    yangming_lesson: "真实K线只用来训练决策纪律，不构成任何买卖建议。",
    difficulty: "实战",
    version: "ashare_history_v1"
  };
  return scenario;
}

function normalizeAshareSegment(segment) {
  return segment.map((item, index) => ({
    date: `第${index + 1}根`,
    open: roundMarketNumber(item.open),
    close: roundMarketNumber(item.close),
    high: roundMarketNumber(item.high),
    low: roundMarketNumber(item.low),
    volume: Number(item.volume || 0)
  }));
}

function sanitizeAsharePublicCandles(candles = []) {
  return candles.map((item, index) => ({
    date: `第${index + 1}根`,
    open: roundMarketNumber(item.open),
    close: roundMarketNumber(item.close),
    high: roundMarketNumber(item.high),
    low: roundMarketNumber(item.low),
    volume: Number(item.volume || 0)
  }));
}

function roundMarketNumber(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildAshareDecisionMap({ rightDecision, futureReturn, maxRunup, maxDrawdown }) {
  const summary = `后续${ASHARE_FUTURE_COUNT}根K线：收盘变化${futureReturn.toFixed(2)}%，最大上冲${maxRunup.toFixed(2)}%，最大回撤${Math.abs(maxDrawdown).toFixed(2)}%。`;
  const notes = {
    买点开仓: `选择买点前，必须先确认失效线和仓位。${summary}`,
    卖点离场: `离场不是胆小，而是保护计划。${summary}`,
    继续观望: `看不清时不做，也是一种交易能力。${summary}`,
    触发止损: `止损不是失败，是把亏损锁在系统能承受的范围内。${summary}`
  };

  return Object.fromEntries(["买点开仓", "卖点离场", "继续观望", "触发止损"].map((label) => {
    const isRight = label === rightDecision;
    return [
      label,
      {
        score: isRight ? 92 : scoreAshareAlternative(label, { futureReturn, maxRunup, maxDrawdown }),
        discipline: isRight ? 94 : disciplineAshareAlternative(label),
        note: `${isRight ? "这次更接近计划动作。" : "这次动作需要复盘。"}${notes[label]}`
      }
    ];
  }));
}

function chooseAshareRightDecision({ futureReturn, maxRunup, maxDrawdown }) {
  if (maxDrawdown <= -5.5 && futureReturn < -1) return "触发止损";
  if (futureReturn >= 3.5 && maxDrawdown > -4) return "买点开仓";
  if (futureReturn <= -2.5 || maxDrawdown <= -4.8) return "卖点离场";
  if (maxRunup >= 5 && futureReturn > 1.5) return "买点开仓";
  return "继续观望";
}

function scoreAshareAlternative(label, { futureReturn, maxRunup, maxDrawdown }) {
  if (label === "继续观望") return Math.abs(futureReturn) <= 2.5 ? 78 : 62;
  if (label === "触发止损") return maxDrawdown <= -4 ? 74 : 58;
  if (label === "卖点离场") return futureReturn < 0 ? 72 : 55;
  if (label === "买点开仓") return maxRunup > 3 ? 70 : 48;
  return 60;
}

function disciplineAshareAlternative(label) {
  if (label.includes("止损")) return 82;
  if (label.includes("观望")) return 78;
  if (label.includes("卖点")) return 74;
  return 62;
}

function buildAshareScenarioId(code, klt, startIndex, visibleCount, futureCount) {
  return `${ASHARE_PUBLIC_HISTORY_PREFIX}-${encryptAshareScenarioDescriptor({
    code,
    klt: normalizeAshareTimeframe(klt),
    startIndex: Number(startIndex || 0),
    visibleCount: Number(visibleCount || ASHARE_VISIBLE_COUNT),
    futureCount: Number(futureCount || ASHARE_FUTURE_COUNT)
  })}`;
}

function parseAshareScenarioDescriptor(scenarioId) {
  if (String(scenarioId || "").startsWith(`${ASHARE_PUBLIC_HISTORY_PREFIX}-`)) {
    const token = String(scenarioId).slice(`${ASHARE_PUBLIC_HISTORY_PREFIX}-`.length);
    const descriptor = decryptAshareScenarioDescriptor(token);
    return {
      code: normalizeAshareCode(descriptor.code),
      klt: normalizeAshareTimeframe(descriptor.klt || "101"),
      startIndex: Number(descriptor.startIndex || 0),
      visibleCount: Number(descriptor.visibleCount || ASHARE_VISIBLE_COUNT),
      futureCount: Number(descriptor.futureCount || ASHARE_FUTURE_COUNT)
    };
  }

  const [, code, klt, startText, visibleText, futureText] = String(scenarioId || "").split("-");
  return {
    code: normalizeAshareCode(code),
    klt: normalizeAshareTimeframe(klt || "101"),
    startIndex: Number(startText || 0),
    visibleCount: Number(visibleText || ASHARE_VISIBLE_COUNT),
    futureCount: Number(futureText || ASHARE_FUTURE_COUNT)
  };
}

function encryptAshareScenarioDescriptor(descriptor) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getAshareTokenKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(descriptor), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptAshareScenarioDescriptor(token) {
  try {
    const payload = Buffer.from(String(token || ""), "base64url");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getAshareTokenKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const descriptor = JSON.parse(json);
    if (!normalizeAshareCode(descriptor.code)) throw new Error("股票代码无效");
    return descriptor;
  } catch {
    const error = new Error("K线训练片段已失效，请重新抽取");
    error.statusCode = 400;
    throw error;
  }
}

function getAshareTokenKey() {
  return crypto
    .createHash("sha256")
    .update(String(config.authCodeSecret || "local-dev-auth-code-secret"))
    .digest();
}

function getKltLabel(klt) {
  return ASHARE_TIMEFRAMES[normalizeAshareTimeframe(klt)]?.label || "日K";
}

function normalizeAshareTimeframe(value = "") {
  const normalized = String(value || "101").toLowerCase();
  if (["30", "30m", "m30"].includes(normalized)) return "30";
  if (["60", "60m", "m60"].includes(normalized)) return "60";
  if (["5d", "5day", "5days", "5日", "5日k"].includes(normalized)) return "102";
  if (["102", "week", "weekly", "w", "周", "周k"].includes(normalized)) return "102";
  if (["103", "month", "monthly", "m", "月", "月k"].includes(normalized)) return "103";
  return "101";
}

function resolveAshareStockByInstrumentKey(stockPool, instrumentKey = "") {
  const code = parseAshareInstrumentKey(instrumentKey);
  if (!code) return null;
  return stockPool.find((item) => item.code === code)
    || DEFAULT_ASHARE_STOCK_POOL.find((item) => item.code === code)
    || { code, name: "A股历史片段", secid: `${code.startsWith("6") ? "1" : "0"}.${code}` };
}

function createAshareInstrumentKey(code = "") {
  const normalizedCode = normalizeAshareCode(code);
  return normalizedCode ? Buffer.from(normalizedCode).toString("base64url") : "";
}

function parseAshareInstrumentKey(value = "") {
  const text = String(value || "").trim();
  if (/^\d{6}$/.test(text)) return text;
  try {
    const decoded = Buffer.from(text, "base64url").toString("utf8");
    return normalizeAshareCode(decoded);
  } catch {
    return "";
  }
}

function normalizeAshareCode(code = "") {
  const normalized = String(code || "").trim();
  return /^\d{6}$/.test(normalized) ? normalized : "";
}

function aggregateCandles(candles, size) {
  const output = [];
  for (let index = 0; index < candles.length; index += size) {
    const group = candles.slice(index, index + size);
    if (group.length < size) continue;
    output.push({
      date: `${group[0].date}~${group.at(-1).date}`,
      open: group[0].open,
      close: group.at(-1).close,
      high: Math.max(...group.map((item) => item.high)),
      low: Math.min(...group.map((item) => item.low)),
      volume: group.reduce((sum, item) => sum + Number(item.volume || 0), 0),
      amount: group.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    });
  }
  return output;
}

function shuffle(items) {
  return items
    .map((item) => ({ item, rank: Math.random() }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}

function buildUserKlineStats(records, userId) {
  const userRecords = records.filter((item) => item.user_id === userId);
  const level = buildKlineLevel(records, userId);
  return {
    user_id: userId,
    total_points: userRecords.reduce((sum, item) => sum + creditedPoints(item), 0),
    best_score: userRecords.reduce((best, item) => Math.max(best, Number(item.score || 0)), 0),
    practice_count: userRecords.length,
    today_count: level.daily_quota.used,
    daily_quota: level.daily_quota,
    streak_days: level.streak_days,
    unlocked_stage_count: level.unlocked_stages.length,
    unlocked_stages: level.unlocked_stages,
    active_stage: level.active_stage,
    last_practice_at: userRecords.at(-1)?.created_at || null
  };
}

function buildKlineLevel(records, userId, { requestedStageId = "" } = {}) {
  const userRecords = records.filter((item) => item.user_id === userId);
  const today = getDateKey(new Date());
  const todayCount = userRecords.filter((item) => getRecordDateKey(item) === today).length;
  const dateKeys = [...new Set(userRecords.map(getRecordDateKey).filter(Boolean))].sort();
  const streakDays = countStreak(dateKeys);
  const unlockedStages = KLINE_STAGES.map((stage) => ({
    ...stage,
    locked: streakDays < stage.required_streak_days,
    progress_days: Math.min(streakDays, stage.required_streak_days),
    remaining_days: Math.max(stage.required_streak_days - streakDays, 0)
  }));
  const requested = unlockedStages.find((stage) => stage.id === requestedStageId);
  const activeStage = requested && !requested.locked ? requested : unlockedStages[0];

  return {
    user_id: userId,
    daily_quota: {
      limit: DAILY_LIMIT,
      used: Math.min(todayCount, DAILY_LIMIT),
      remaining: Math.max(DAILY_LIMIT - todayCount, 0),
      practiced_today: todayCount
    },
    streak_days: streakDays,
    unlocked_stages: unlockedStages.filter((stage) => !stage.locked),
    stages: unlockedStages,
    active_stage: activeStage
  };
}

function buildGuestKlineLevel(requestedStageId = "") {
  const stages = KLINE_STAGES.map((stage) => ({
    ...stage,
    locked: stage.required_streak_days > 0,
    progress_days: 0,
    remaining_days: stage.required_streak_days
  }));
  return {
    user_id: "",
    daily_quota: {
      limit: DAILY_LIMIT,
      used: 0,
      remaining: DAILY_LIMIT,
      practiced_today: 0
    },
    streak_days: 0,
    unlocked_stages: stages.filter((stage) => !stage.locked),
    stages,
    active_stage: stages.find((stage) => stage.id === requestedStageId && !stage.locked) || stages[0]
  };
}

function countStreak(dateKeys) {
  const checked = new Set(dateKeys);
  let streak = 0;
  const cursor = new Date();

  while (checked.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function creditedPoints(record) {
  if (record.ranking_points !== undefined) return Number(record.ranking_points || 0);
  return Number(record.practice_points || 0);
}

function filterRecordsByPeriod(records, period) {
  const normalized = normalizePeriod(period);
  if (normalized === "all") return records;

  const start = normalized === "month" ? startOfMonth(new Date()) : startOfWeek(new Date());
  const startTime = start.getTime();
  return records.filter((record) => new Date(record.created_at || 0).getTime() >= startTime);
}

function normalizePeriod(period) {
  return ["week", "month", "all"].includes(period) ? period : "week";
}

function startOfWeek(date) {
  const output = new Date(date);
  output.setHours(0, 0, 0, 0);
  const day = (output.getDay() + 6) % 7;
  output.setDate(output.getDate() - day);
  return output;
}

function startOfMonth(date) {
  const output = new Date(date);
  output.setHours(0, 0, 0, 0);
  output.setDate(1);
  return output;
}

function getRecordDateKey(record) {
  return record.date_key || getDateKey(new Date(record.created_at || Date.now()));
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPracticeInsight(record, scenario) {
  if (scenario?.yangming_lesson && record.score >= 85) return `此心能定，临盘能照。${scenario.yangming_lesson}`;
  if (record.score >= 85) return "此心能定，临盘能照。今天这次练习体现了较强的计划感。";
  if (record.discipline >= 75) return "胜负未必尽如人意，但能守住规则，就是事上练的进步。";
  if (record.decision.includes("追")) return "今日要观照的是怕错过。行情越急，越要先正心。";
  if (record.decision.includes("扛")) return "今日要观照的是不愿认错。知错能改，才是真止损。";
  return "练习的重点不是猜对，而是看见自己在波动面前如何起心动念。";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
