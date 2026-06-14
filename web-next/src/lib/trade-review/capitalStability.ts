import type {
  CapitalStabilityLevel,
  OneThoughtEvent,
  TradeReview,
  TradeReviewCapitalStability,
} from "@/lib/mind-archive/types"

type BuildCapitalStabilityParams = {
  tradeReview: TradeReview
  recentTradeReviews?: TradeReview[]
  linkedOneThoughtEvent?: OneThoughtEvent | null
}

const practiceTextByLevel: Record<CapitalStabilityLevel, string> = {
  stable_with_guard: "继续按计划做，不用一笔交易证明自己。",
  money_stable_heart_moving: "钱暂时没坏，不代表心没有偏。下次赚钱也要看是不是守住了规则。",
  money_moving_heart_chaotic: "资金开始被心贼牵动。下一笔先降仓位，再谈判断。",
  double_unstable: "钱也失守，心也失守。先停一笔，不用下一笔把自己救回来。",
  insufficient_data: "补上账户权益和计划风险，才能看清这笔交易有没有让资金失稳。",
}

const scoreByLevel: Record<Exclude<CapitalStabilityLevel, "insufficient_data">, number> = {
  stable_with_guard: 86,
  money_stable_heart_moving: 64,
  money_moving_heart_chaotic: 42,
  double_unstable: 18,
}

function finiteNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function roundMetric(value: number | undefined) {
  if (value === undefined) return undefined
  return Math.round(value * 100) / 100
}

function percentOf(value: number | undefined, equity: number | undefined) {
  if (value === undefined || equity === undefined || equity <= 0) return undefined
  return roundMetric((value / equity) * 100)
}

function addUnique(items: string[], value: string) {
  if (!items.includes(value)) items.push(value)
}

function isLoss(review: TradeReview) {
  return finiteNumber(review.pnl) !== undefined && Number(review.pnl) <= 0
}

function countLossStreak(current: TradeReview, recentTradeReviews: TradeReview[]) {
  if (!isLoss(current)) return 0

  let streak = 1
  for (const review of recentTradeReviews) {
    if (!isLoss(review)) break
    streak += 1
  }
  return streak
}

export function buildCapitalStabilityResult({
  tradeReview,
  recentTradeReviews = [],
  linkedOneThoughtEvent = null,
}: BuildCapitalStabilityParams): TradeReviewCapitalStability {
  const equityBefore = finiteNumber(tradeReview.accountSnapshot?.accountEquityBefore)
  const positionValue = finiteNumber(tradeReview.riskEvidence?.positionValue)
  const plannedRiskAmount = finiteNumber(tradeReview.riskEvidence?.plannedRiskAmount)
  const actualLossAmount =
    finiteNumber(tradeReview.riskEvidence?.actualLossAmount) ??
    (Number(tradeReview.pnl) < 0 ? Math.abs(Number(tradeReview.pnl)) : undefined)
  const pnl = finiteNumber(tradeReview.pnl) ?? 0
  const hasRiskNumbers =
    positionValue !== undefined || plannedRiskAmount !== undefined || actualLossAmount !== undefined
  const exceededPlannedRisk =
    plannedRiskAmount !== undefined && actualLossAmount !== undefined
      ? actualLossAmount > plannedRiskAmount
      : undefined
  const changedPlanIntraday =
    Boolean(tradeReview.riskEvidence?.changedPlanIntraday) || Boolean(tradeReview.behaviorEvidence?.changedPlanIntraday)
  const addedPosition =
    Boolean(tradeReview.riskEvidence?.addedPosition) || Boolean(tradeReview.behaviorEvidence?.addedPosition)
  const movedStopLoss =
    Boolean(tradeReview.riskEvidence?.movedStopLoss) || Boolean(tradeReview.behaviorEvidence?.movedStopLoss)
  const stillMoving = linkedOneThoughtEvent?.userReaction === "still_moving"
  const tradedWhileMoving = stillMoving && linkedOneThoughtEvent?.actualAction === "traded"
  const lossStreak = countLossStreak(tradeReview, recentTradeReviews)
  const zeiShengCount = recentTradeReviews.filter((review) => review.heartJudgement === "zei_sheng").length
  const shuangShuCount = recentTradeReviews.filter((review) => review.heartJudgement === "shuang_shu").length
  const brokeRuleLossPct =
    tradeReview.brokeRule && pnl <= 0 ? percentOf(Math.abs(pnl), equityBefore) : undefined

  const metrics: TradeReviewCapitalStability["metrics"] = {
    pnlPctOfEquity: percentOf(pnl, equityBefore),
    positionPctOfEquity: percentOf(positionValue, equityBefore),
    riskPctOfEquity: percentOf(actualLossAmount, equityBefore),
    exceededPlannedRisk,
    lossStreak,
    brokeRuleLossPct,
    zeiShengCount,
    shuangShuCount,
  }
  const reasons: string[] = []
  const warnings: string[] = []

  if (equityBefore === undefined && !hasRiskNumbers) {
    return {
      version: "capital_stability_v1",
      level: "insufficient_data",
      score: null,
      reasons: ["资金稳定判断需要账户权益、仓位或计划风险数据。"],
      warnings: [],
      metrics,
      practiceText: practiceTextByLevel.insufficient_data,
      generatedAt: new Date().toISOString(),
    }
  }

  if (tradeReview.heartJudgement === "shuang_shu") {
    addUnique(reasons, "心性判定为双输，钱与心都出现失守。")
  }
  if (tradeReview.brokeRule && pnl <= 0) {
    addUnique(reasons, "破戒亏损暴露资金与规则边界同时变弱。")
  }
  if (exceededPlannedRisk) {
    addUnique(reasons, "实际亏损超过计划风险。")
  }
  if (tradeReview.brokeRule && exceededPlannedRisk) {
    addUnique(reasons, "破戒同时超过计划风险。")
  }
  if (changedPlanIntraday) {
    addUnique(reasons, "临盘改计划使资金波动放大。")
  }
  if (tradedWhileMoving) {
    addUnique(reasons, "心还在动时仍然交易。")
  }
  if (addedPosition && stillMoving) {
    addUnique(reasons, "心还在动时加仓，资金稳定性下降。")
  }
  if (movedStopLoss) {
    addUnique(reasons, "移动止损说明原先风险边界被临盘改写。")
  }
  if (lossStreak >= 2) {
    addUnique(warnings, `连续亏损 ${lossStreak} 笔，后续资金曲线更容易失稳。`)
  }
  if (tradeReview.heartJudgement === "zei_sheng") {
    addUnique(reasons, "这笔属于贼胜，钱暂时没坏，但心已经偏离规则。")
  }
  if (pnl > 0 && tradeReview.brokeRule) {
    addUnique(reasons, "赚钱但破戒，结果没有证明过程稳定。")
  }

  let level: CapitalStabilityLevel = "insufficient_data"
  if (
    tradeReview.heartJudgement === "shuang_shu" ||
    (tradeReview.brokeRule && pnl <= 0 && plannedRiskAmount !== undefined && actualLossAmount !== undefined && actualLossAmount > plannedRiskAmount) ||
    (tradeReview.brokeRule && exceededPlannedRisk)
  ) {
    level = "double_unstable"
  } else if (exceededPlannedRisk || changedPlanIntraday || (addedPosition && stillMoving) || movedStopLoss || lossStreak >= 2) {
    level = "money_moving_heart_chaotic"
  } else if (tradeReview.heartJudgement === "zei_sheng" || tradedWhileMoving || (pnl > 0 && tradeReview.brokeRule)) {
    level = "money_stable_heart_moving"
  } else if (
    !tradeReview.brokeRule &&
    tradeReview.followedPlan &&
    (tradeReview.heartJudgement === "zheng_sheng" || tradeReview.heartJudgement === "zheng_kui")
  ) {
    level = "stable_with_guard"
    addUnique(reasons, "这笔按计划执行，资金风险仍在边界内。")
  }

  if (level === "insufficient_data") {
    addUnique(reasons, "资金稳定判断需要账户权益、仓位或计划风险数据。")
  }

  return {
    version: "capital_stability_v1",
    level,
    score: level === "insufficient_data" ? null : scoreByLevel[level],
    reasons,
    warnings,
    metrics,
    practiceText: practiceTextByLevel[level],
    generatedAt: new Date().toISOString(),
  }
}
