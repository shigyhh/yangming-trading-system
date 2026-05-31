import crypto from "node:crypto";
import { appendRuntimeRecord, readRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";
import { getNextKlinePractice } from "./marketPractice.js";

const SESSION_FILE = "zhixing-replay-sessions.json";
const RESULT_FILE = "zhixing-replay-results.json";
const INITIAL_CAPITAL = 100000;
const COMMISSION_RATE = 0.0003;
const MIN_COMMISSION = 5;
const STAMP_TAX_RATE = 0.001;

const BREACH_WEIGHTS = {
  no_plan_entry: 20,
  stop_not_executed: 22,
  max_position: 12,
  emotion_open: 14,
  revenge_trade: 16,
  t1_blocked: 8,
  insufficient_cash: 6,
  no_position: 5
};

export async function startZhixingReplaySession({
  userId,
  nickname = "知行同修",
  stageId = "daily",
  personalityType = "",
  timeframe = "101",
  dataSource = "auto",
  plan = {},
  emotion = {}
} = {}) {
  assertUserId(userId);
  const normalizedPlan = normalizePlan(plan);
  const normalizedEmotion = normalizeEmotion(emotion);
  const scenario = await getNextKlinePractice({
    userId,
    stageId,
    personalityType,
    timeframe,
    requireReal: false,
    axisFocus: normalizedPlan.focus || "",
    axisSubtitle: normalizedPlan.rule || ""
  });
  const candles = normalizeCandles(scenario.candles);
  if (candles.length < 8) {
    const error = new Error("K线片段不足，无法开始逐根回放");
    error.statusCode = 503;
    throw error;
  }

  const initialVisible = clamp(
    Number(scenario.visible_count || Math.min(40, candles.length - 3)),
    5,
    Math.max(5, candles.length - 1)
  );
  const now = new Date().toISOString();
  const session = {
    id: crypto.randomUUID(),
    user_id: userId,
    nickname: String(nickname || "知行同修").slice(0, 80),
    scenario_id: scenario.id,
    scenario_title: scenario.title,
    active_stage: scenario.active_stage || null,
    data_source: scenario.data_source || "practice_bank",
    data_pipeline: buildDataPipeline(dataSource),
    anonymous: scenario.anonymous !== false,
    reveal_policy: scenario.reveal_policy || "训练前隐藏股票名、代码、日期；训练完成后可选择揭晓历史片段。",
    weighted_reason: buildWeightedReason({ stage: scenario.active_stage, personalityType }),
    timeframe: scenario.timeframe || timeframe || "101",
    timeframe_label: scenario.timeframe_label || "日K",
    candles,
    reveal_count: initialVisible,
    initial_visible_count: initialVisible,
    total_bars: candles.length,
    plan: normalizedPlan,
    emotion: normalizedEmotion,
    account: createInitialAccount(),
    decisions: [],
    equity_curve: [],
    zhixing_score: 78,
    status: "running",
    created_at: now,
    updated_at: now
  };
  markToMarket(session);
  await appendRuntimeRecord(SESSION_FILE, session);
  return toPublicReplaySession(session);
}

export async function getZhixingReplaySession(sessionId, userId) {
  const session = await findReplaySession(sessionId, userId);
  return toPublicReplaySession(session);
}

export async function submitZhixingReplayDecision({
  sessionId,
  userId,
  action,
  positionPct,
  reason = "",
  emotion = ""
} = {}) {
  assertUserId(userId);
  const normalizedAction = normalizeAction(action);
  let updatedSession;
  await updateRuntimeRecords(SESSION_FILE, (records) => records.map((record) => {
    if (record.id !== sessionId || record.user_id !== userId) return record;
    const session = clone(record);
    assertSessionRunning(session);
    applyDecision(session, {
      action: normalizedAction,
      position_pct: positionPct === undefined ? null : Number(positionPct),
      reason: String(reason || "").trim().slice(0, 240),
      emotion: String(emotion || session.emotion?.mood || "").trim().slice(0, 40)
    });
    session.updated_at = new Date().toISOString();
    updatedSession = session;
    return session;
  }));
  if (!updatedSession) throwNotFound();
  return toPublicReplaySession(updatedSession);
}

export async function advanceZhixingReplaySession(sessionId, userId) {
  assertUserId(userId);
  let updatedSession;
  await updateRuntimeRecords(SESSION_FILE, (records) => records.map((record) => {
    if (record.id !== sessionId || record.user_id !== userId) return record;
    const session = clone(record);
    assertSessionRunning(session);
    if (session.reveal_count < session.candles.length) {
      session.reveal_count += 1;
      markToMarket(session);
      if (session.reveal_count >= session.candles.length) {
        session.status = "ready_to_review";
      }
    }
    session.updated_at = new Date().toISOString();
    updatedSession = session;
    return session;
  }));
  if (!updatedSession) throwNotFound();
  return toPublicReplaySession(updatedSession);
}

export async function finishZhixingReplaySession(sessionId, userId, { reveal = false } = {}) {
  assertUserId(userId);
  let updatedSession;
  await updateRuntimeRecords(SESSION_FILE, (records) => records.map((record) => {
    if (record.id !== sessionId || record.user_id !== userId) return record;
    const session = clone(record);
    markToMarket(session);
    session.status = "completed";
    session.completed_at = new Date().toISOString();
    session.report = buildReplayReport(session, { reveal });
    session.updated_at = session.completed_at;
    updatedSession = session;
    return session;
  }));
  if (!updatedSession) throwNotFound();

  await updateRuntimeRecords(RESULT_FILE, (records) => {
    if (records.some((record) => record.session_id === updatedSession.id)) return records;
    return records.concat({
      id: crypto.randomUUID(),
      session_id: updatedSession.id,
      user_id: updatedSession.user_id,
      nickname: updatedSession.nickname,
      scenario_id: updatedSession.scenario_id,
      zhixing_score: updatedSession.report.zhixing_score,
      total_return_pct: updatedSession.report.total_return_pct,
      trade_count: updatedSession.report.trade_count,
      breach_count: updatedSession.report.breach_count,
      dominant_breach: updatedSession.report.dominant_breach,
      created_at: updatedSession.completed_at
    });
  });

  return toPublicReplaySession(updatedSession);
}

export async function listZhixingReplayResults(userId, { limit = 20 } = {}) {
  assertUserId(userId);
  const records = await readRuntimeRecords(RESULT_FILE);
  return records
    .filter((record) => record.user_id === userId)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, clamp(Number(limit || 20), 1, 100));
}

async function findReplaySession(sessionId, userId) {
  const records = await readRuntimeRecords(SESSION_FILE);
  const session = records.find((record) => record.id === sessionId && record.user_id === userId);
  if (!session) throwNotFound();
  return session;
}

function applyDecision(session, decision) {
  const barIndex = session.reveal_count - 1;
  const candle = session.candles[barIndex];
  const price = Number(candle?.close || 0);
  const requestedPct = clamp(Number(decision.position_pct || session.plan.default_position_pct || 10), 1, 100);
  const breaches = detectBreaches(session, decision, { price, requestedPct, barIndex });
  const execution = executeTrade(session, decision.action, { price, requestedPct, barIndex, breaches });
  const record = {
    id: crypto.randomUUID(),
    bar_no: session.reveal_count,
    action: decision.action,
    action_label: actionLabel(decision.action),
    price: roundMoney(price),
    position_pct: requestedPct,
    reason: decision.reason,
    emotion: decision.emotion || session.emotion?.mood || "未记录",
    breaches,
    execution,
    account: snapshotAccount(session.account),
    created_at: new Date().toISOString()
  };
  session.decisions.push(record);
  markToMarket(session);
  session.zhixing_score = computeZhixingScore(session);
}

function executeTrade(session, action, { price, requestedPct, barIndex, breaches }) {
  if (!price) return { ok: false, message: "当前K线价格无效" };
  if (action === "hold") return { ok: true, message: "观望已记录" };

  if (action === "buy") {
    const maxExposure = session.account.initial_capital * (session.plan.max_position_pct / 100);
    const currentExposure = session.account.total_shares * price;
    const requestedExposure = session.account.initial_capital * (requestedPct / 100);
    const allowedExposure = Math.max(0, Math.min(requestedExposure, maxExposure - currentExposure, session.account.cash));
    const shares = Math.floor((allowedExposure - MIN_COMMISSION) / price / 100) * 100;
    if (shares <= 0) {
      breaches.push(makeBreach("insufficient_cash", "资金或计划仓位不足，本次买入未成交"));
      return { ok: false, message: "资金或计划仓位不足" };
    }
    const amount = shares * price;
    const commission = calculateCommission(amount);
    session.account.cash = roundMoney(session.account.cash - amount - commission);
    session.account.total_shares += shares;
    session.account.lots.push({
      shares,
      price,
      amount,
      buy_bar_no: session.reveal_count,
      available_bar_index: barIndex + 1
    });
    updateAverageCost(session.account);
    return {
      ok: true,
      message: `买入${shares}股`,
      shares,
      amount: roundMoney(amount),
      commission,
      stamp_tax: 0
    };
  }

  const availableShares = getAvailableShares(session.account, barIndex);
  if (availableShares <= 0) {
    breaches.push(makeBreach("t1_blocked", "A股T+1限制：今日买入的仓位不能当日卖出"));
    return { ok: false, message: "T+1限制，可卖数量不足" };
  }
  const sharesToSell = Math.min(
    availableShares,
    Math.max(100, Math.floor((session.account.total_shares * requestedPct) / 100 / 100) * 100)
  );
  if (sharesToSell <= 0) {
    breaches.push(makeBreach("no_position", "当前没有可卖持仓"));
    return { ok: false, message: "没有可卖持仓" };
  }

  consumeLots(session.account, sharesToSell, barIndex);
  const amount = sharesToSell * price;
  const commission = calculateCommission(amount);
  const stampTax = roundMoney(amount * STAMP_TAX_RATE);
  session.account.cash = roundMoney(session.account.cash + amount - commission - stampTax);
  session.account.total_shares -= sharesToSell;
  updateAverageCost(session.account);
  return {
    ok: true,
    message: `卖出${sharesToSell}股`,
    shares: sharesToSell,
    amount: roundMoney(amount),
    commission,
    stamp_tax: stampTax
  };
}

function detectBreaches(session, decision, { price, requestedPct, barIndex }) {
  const breaches = [];
  const plan = session.plan;
  const emotion = decision.emotion || session.emotion?.mood || "";
  const hasPosition = session.account.total_shares > 0;
  const avgCost = Number(session.account.average_cost || price);
  const stopLine = avgCost * (1 - plan.stop_loss_pct / 100);

  if (decision.action === "buy" && /观望|空仓|不操作/.test(plan.direction)) {
    breaches.push(makeBreach("no_plan_entry", "计划方向是观望，却临盘开仓"));
  }
  if (decision.action === "buy" && /急|躁|贪|怕|焦|回本|上头/.test(emotion)) {
    breaches.push(makeBreach("emotion_open", `在「${emotion}」情绪下开仓`));
  }
  if (decision.action === "buy" && requestedPct > plan.max_position_pct) {
    breaches.push(makeBreach("max_position", `请求仓位${requestedPct}%超过计划上限${plan.max_position_pct}%`));
  }
  if (decision.action === "buy" && /回本|扳回|翻本/.test(`${decision.reason} ${emotion}`)) {
    breaches.push(makeBreach("revenge_trade", "亏损后带着回本念头加仓"));
  }
  if (hasPosition && price <= stopLine && decision.action !== "sell") {
    breaches.push(makeBreach("stop_not_executed", `价格已触及计划止损线${roundMoney(stopLine)}，但没有离场`));
  }
  if (decision.action === "sell" && getAvailableShares(session.account, barIndex) <= 0) {
    breaches.push(makeBreach("t1_blocked", "A股T+1限制：今日买入的仓位不能当日卖出"));
  }

  return breaches;
}

function computeZhixingScore(session) {
  if (!session.decisions.length) return 78;
  const totalPenalty = session.decisions.flatMap((decision) => decision.breaches || [])
    .reduce((sum, breach) => sum + Number(breach.weight || 0), 0);
  const calmActions = session.decisions.filter((decision) => !decision.breaches?.length).length;
  const calmBonus = Math.min(calmActions * 2, 10);
  const returnPenalty = session.account.max_drawdown_pct <= -8 ? 8 : session.account.max_drawdown_pct <= -5 ? 4 : 0;
  return clamp(Math.round(86 - totalPenalty + calmBonus - returnPenalty), 18, 98);
}

function markToMarket(session) {
  const candle = session.candles[Math.max(0, session.reveal_count - 1)];
  const price = Number(candle?.close || 0);
  const positionValue = session.account.total_shares * price;
  const totalAssets = roundMoney(session.account.cash + positionValue);
  session.account.last_price = roundMoney(price);
  session.account.position_value = roundMoney(positionValue);
  session.account.total_assets = totalAssets;
  session.account.total_return_pct = roundPct((totalAssets - session.account.initial_capital) / session.account.initial_capital * 100);
  session.account.available_shares = getAvailableShares(session.account, session.reveal_count - 1);
  session.equity_curve.push({
    bar_no: session.reveal_count,
    total_assets: totalAssets,
    created_at: new Date().toISOString()
  });
  const peak = Math.max(...session.equity_curve.map((item) => item.total_assets), session.account.initial_capital);
  session.account.max_drawdown_pct = roundPct(((totalAssets - peak) / peak) * 100);
}

function buildReplayReport(session, { reveal = false } = {}) {
  const breaches = session.decisions.flatMap((decision) => decision.breaches || []);
  const breachCounts = breaches.reduce((map, breach) => {
    map[breach.code] = (map[breach.code] || 0) + 1;
    return map;
  }, {});
  const dominantCode = Object.entries(breachCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const dominantBreach = dominantCode ? breachName(dominantCode) : "本轮主要守住了计划";
  const report = {
    title: "知行合一逐根复盘报告",
    zhixing_score: session.zhixing_score,
    total_return_pct: session.account.total_return_pct,
    max_drawdown_pct: session.account.max_drawdown_pct,
    trade_count: session.decisions.filter((decision) => decision.action !== "hold" && decision.execution?.ok).length,
    decision_count: session.decisions.length,
    breach_count: breaches.length,
    dominant_breach: dominantBreach,
    plan_summary: summarizePlan(session.plan),
    action_summary: summarizeActions(session),
    coach_advice: buildCoachAdvice(session, dominantCode),
    tomorrow_practice: buildTomorrowPractice(dominantCode),
    live_script: buildLiveScript(session, dominantBreach),
    reveal: reveal ? {
      policy: session.reveal_policy,
      note: "当前训练接口仍保持匿名。老师端如需揭晓真实股票与日期，应走单独受控接口。"
    } : null
  };
  return report;
}

function toPublicReplaySession(session) {
  const report = session.report || (session.status === "completed" ? buildReplayReport(session) : null);
  return {
    id: session.id,
    status: session.status,
    scenario_id: session.scenario_id,
    scenario_title: session.scenario_title,
    active_stage: session.active_stage,
    anonymous: session.anonymous,
    reveal_policy: session.reveal_policy,
    weighted_reason: session.weighted_reason,
    timeframe: session.timeframe,
    timeframe_label: session.timeframe_label,
    data_source: session.data_source,
    data_pipeline: session.data_pipeline,
    plan: session.plan,
    emotion: session.emotion,
    progress: {
      current: session.reveal_count,
      initial_visible: session.initial_visible_count,
      total: session.total_bars,
      remaining: Math.max(session.total_bars - session.reveal_count, 0)
    },
    candles: session.candles.slice(0, session.reveal_count),
    masked_count: Math.max(session.total_bars - session.reveal_count, 0),
    current_bar: session.candles[Math.max(0, session.reveal_count - 1)],
    account: snapshotAccount(session.account),
    decisions: session.decisions,
    zhixing_score: session.zhixing_score,
    coach_prompt: buildCoachPrompt(session),
    report,
    created_at: session.created_at,
    updated_at: session.updated_at
  };
}

function normalizePlan(plan = {}) {
  return {
    direction: String(plan.direction || "做多但等确认").slice(0, 40),
    thesis: String(plan.thesis || plan.reason || "只在回踩确认后小仓试错").slice(0, 240),
    rule: String(plan.rule || "无计划不开仓，触线即退").slice(0, 160),
    no_trade_condition: String(plan.no_trade_condition || "急躁、贪婪、想回本时不下第一笔").slice(0, 160),
    stop_loss_pct: clamp(Number(plan.stop_loss_pct || 4), 1, 20),
    take_profit_pct: clamp(Number(plan.take_profit_pct || 8), 1, 80),
    max_position_pct: clamp(Number(plan.max_position_pct || 30), 1, 100),
    default_position_pct: clamp(Number(plan.default_position_pct || 10), 1, 100),
    focus: String(plan.focus || "").slice(0, 60)
  };
}

function normalizeEmotion(emotion = {}) {
  return {
    mood: String(emotion.mood || "平静").slice(0, 40),
    trigger: String(emotion.trigger || "开盘前照心").slice(0, 80),
    intensity: clamp(Number(emotion.intensity || 2), 1, 5)
  };
}

function normalizeCandles(candles = []) {
  if (candles.every((item) => typeof item === "number")) {
    return candles.map((close, index) => {
      const prev = index > 0 ? Number(candles[index - 1]) : Number(close) * 0.98;
      const open = roundMoney(prev);
      const normalizedClose = roundMoney(close);
      const spread = Math.max(Math.abs(normalizedClose - open) * 0.35, 1);
      return {
        date: `第${index + 1}根`,
        open,
        close: normalizedClose,
        high: roundMoney(Math.max(open, normalizedClose) + spread),
        low: roundMoney(Math.max(0.01, Math.min(open, normalizedClose) - spread)),
        volume: 0
      };
    });
  }

  return candles
    .map((item, index) => ({
      date: item.date || `第${index + 1}根`,
      open: roundMoney(item.open),
      close: roundMoney(item.close),
      high: roundMoney(item.high),
      low: roundMoney(item.low),
      volume: Number(item.volume || 0)
    }))
    .filter((item) => [item.open, item.close, item.high, item.low].every(Number.isFinite));
}

function createInitialAccount() {
  return {
    initial_capital: INITIAL_CAPITAL,
    cash: INITIAL_CAPITAL,
    total_assets: INITIAL_CAPITAL,
    position_value: 0,
    total_shares: 0,
    available_shares: 0,
    average_cost: 0,
    last_price: 0,
    total_return_pct: 0,
    max_drawdown_pct: 0,
    lots: []
  };
}

function buildDataPipeline(source) {
  const normalized = normalizeDataSource(source);
  return {
    requested_source: normalized,
    active_mode: normalized === "mootdx" || normalized === "akshare" ? "offline_cache_first" : "native_cache_first",
    providers: [
      { name: "Eastmoney", role: "Node原生在线源", status: "native_supported" },
      { name: "AkShare", role: "Python增量补离线库", status: "bridge_ready" },
      { name: "mootdx", role: "通达信协议备源", status: "bridge_ready" },
      { name: "Local JSON Cache", role: "小程序训练实际读取层", status: "enabled" }
    ],
    incremental_cache: true,
    privacy: "小程序训练只读取匿名片段，不暴露股票名、代码和真实日期。"
  };
}

function buildWeightedReason({ stage, personalityType }) {
  const focus = stage?.focus || personalityType || "综合纪律";
  return `测评/关卡权重已生效：本轮优先训练「${focus}」，不是随机刷题。`;
}

function buildCoachPrompt(session) {
  if (!session.decisions.length) return "先写计划，再放出下一根。不要问会不会涨，先问这一笔有没有出场。";
  const last = session.decisions.at(-1);
  if (last.breaches?.length) return `刚才这一念有裂缝：${last.breaches.map((item) => item.message).join("；")}。先记下，不急着证明自己。`;
  return "这一根能守住计划，就是事上磨练。继续保持小动作、慢决策、清边界。";
}

function buildCoachAdvice(session, dominantCode) {
  if (!dominantCode) return "本轮最好的地方，是多数动作没有离开开仓前的计划。下一轮继续练：慢一拍，不错过真正的机会。";
  const map = {
    no_plan_entry: "你最大的问题不是看不懂K线，而是盘中给自己临时加理由。明天只守一条：没有写下出场，不开第一笔。",
    stop_not_executed: "止损线一动，心里的侥幸就开始替你交易。明天只守一条：触线即退，不与亏损辩论。",
    max_position: "仓位一重，心就失衡。明天只守一条：单笔不超过计划仓位，错了也能睡得着。",
    emotion_open: "情绪在前，交易在后，就容易把冲动包装成机会。明天只守一条：急躁、贪婪、想回本时，不下第一笔。",
    revenge_trade: "想回本不是交易理由，是心中贼。明天只守一条：亏损后暂停一根K线再决策。",
    t1_blocked: "规则本身也是修行。T+1卖不掉时，才知道开仓前仓位和止损有多重要。"
  };
  return map[dominantCode] || "这轮复盘的重点不是盈亏，而是看见自己在哪一根K线上离开了计划。";
}

function buildTomorrowPractice(dominantCode) {
  const map = {
    no_plan_entry: "无计划不开仓训练",
    stop_not_executed: "触线即退训练",
    max_position: "三成仓位上限训练",
    emotion_open: "急躁不下第一笔训练",
    revenge_trade: "亏损后暂停训练",
    t1_blocked: "T+1规则前置训练"
  };
  return map[dominantCode] || "逐根观望训练";
}

function buildLiveScript(session, dominantBreach) {
  return `今天这组K线不是教大家买哪只，而是看一个人说过的话能不能在盘中兑现。系统记录的不是神奇买点，而是${dominantBreach}。赚了但破戒，指数会扣分；亏了但守戒，长期反而是在变稳。`;
}

function summarizePlan(plan) {
  return `方向：${plan.direction}；止损：-${plan.stop_loss_pct}%；止盈：+${plan.take_profit_pct}%；仓位上限：${plan.max_position_pct}%；戒律：${plan.rule}`;
}

function summarizeActions(session) {
  const buys = session.decisions.filter((item) => item.action === "buy").length;
  const sells = session.decisions.filter((item) => item.action === "sell").length;
  const holds = session.decisions.filter((item) => item.action === "hold").length;
  return `买入${buys}次，卖出${sells}次，观望${holds}次，最终收益${session.account.total_return_pct}%`;
}

function makeBreach(code, message) {
  return {
    code,
    name: breachName(code),
    message,
    weight: BREACH_WEIGHTS[code] || 5
  };
}

function breachName(code) {
  const map = {
    no_plan_entry: "无计划开仓",
    stop_not_executed: "止损未执行",
    max_position: "仓位越界",
    emotion_open: "情绪开仓",
    revenge_trade: "回本交易",
    t1_blocked: "T+1受限",
    insufficient_cash: "资金不足",
    no_position: "无可卖仓位"
  };
  return map[code] || "纪律裂缝";
}

function snapshotAccount(account) {
  return {
    initial_capital: roundMoney(account.initial_capital),
    cash: roundMoney(account.cash),
    total_assets: roundMoney(account.total_assets),
    position_value: roundMoney(account.position_value),
    total_shares: Number(account.total_shares || 0),
    available_shares: Number(account.available_shares || 0),
    average_cost: roundMoney(account.average_cost),
    last_price: roundMoney(account.last_price),
    total_return_pct: roundPct(account.total_return_pct),
    max_drawdown_pct: roundPct(account.max_drawdown_pct)
  };
}

function getAvailableShares(account, barIndex) {
  return (account.lots || []).reduce((sum, lot) => {
    if (lot.available_bar_index <= barIndex) return sum + Number(lot.shares || 0);
    return sum;
  }, 0);
}

function consumeLots(account, shares, barIndex) {
  let remaining = shares;
  for (const lot of account.lots || []) {
    if (remaining <= 0) break;
    if (lot.available_bar_index > barIndex || lot.shares <= 0) continue;
    const used = Math.min(lot.shares, remaining);
    lot.shares -= used;
    remaining -= used;
  }
  account.lots = (account.lots || []).filter((lot) => lot.shares > 0);
}

function updateAverageCost(account) {
  const shares = (account.lots || []).reduce((sum, lot) => sum + Number(lot.shares || 0), 0);
  const amount = (account.lots || []).reduce((sum, lot) => sum + Number(lot.shares || 0) * Number(lot.price || 0), 0);
  account.average_cost = shares ? roundMoney(amount / shares) : 0;
}

function calculateCommission(amount) {
  return roundMoney(Math.max(amount * COMMISSION_RATE, MIN_COMMISSION));
}

function actionLabel(action) {
  if (action === "buy") return "买入";
  if (action === "sell") return "卖出";
  return "观望";
}

function normalizeAction(action) {
  const text = String(action || "").toLowerCase();
  if (["buy", "long", "买", "买入", "开仓"].includes(text)) return "buy";
  if (["sell", "exit", "卖", "卖出", "离场", "止损"].includes(text)) return "sell";
  return "hold";
}

function normalizeDataSource(source) {
  const text = String(source || "auto").toLowerCase();
  if (["akshare", "mootdx", "eastmoney", "offline", "auto"].includes(text)) return text;
  return "auto";
}

function assertSessionRunning(session) {
  if (session.status === "completed") {
    const error = new Error("本轮回放已完成，不能继续操作");
    error.statusCode = 409;
    throw error;
  }
}

function assertUserId(userId) {
  if (!userId) {
    const error = new Error("user_id 不能为空");
    error.statusCode = 400;
    throw error;
  }
}

function throwNotFound() {
  const error = new Error("知行回放会话不存在");
  error.statusCode = 404;
  throw error;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function roundPct(value) {
  return Number(Number(value || 0).toFixed(2));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
