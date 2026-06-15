import type { CycleSignal, CycleSignalType, CycleSummary } from "./cycleMirrorService"
import type { ReviewRiskSignal, ReviewRiskSignalType } from "./reviewArchiveService"

export type RuleGuardInsightSource = "review_risk" | "cycle" | "combined"
export type RuleGuardInsightLevel = "low" | "medium" | "high"
export type RuleGuardInsightType = ReviewRiskSignalType | CycleSignalType

export type RuleGuardInsight = {
  id: string
  source: RuleGuardInsightSource
  type: RuleGuardInsightType
  level: RuleGuardInsightLevel
  title: string
  text: string
  count: number
  relatedIds: string[]
  actionText: string
}

export type BuildRuleGuardInsightsInput = {
  reviewRiskSignals?: ReviewRiskSignal[]
  cycleSignals?: CycleSignal[]
  cycleSummary?: CycleSummary
  maxItems?: number
}

export const RULE_GUARD_INSIGHT_EMPTY_TEXT = "暂无规则守护提醒。不是没有风险，而是还需要更多复盘样本。"

export const ruleGuardInsightLevelLabels: Record<RuleGuardInsightLevel, string> = {
  low: "轻提醒",
  medium: "守护提醒",
  high: "强守护",
}

export const ruleGuardInsightSourceLabels: Record<RuleGuardInsightSource, string> = {
  review_risk: "复盘守护",
  cycle: "循环守护",
  combined: "合证守护",
}

export const ruleGuardInsightTypeLabels: Record<RuleGuardInsightType, string> = {
  repeated_broke_rule: "反复破戒",
  repeated_zei_sheng: "贼胜反复",
  repeated_shuang_shu: "双输反复",
  capital_double_unstable: "资金双失守",
  money_moving_heart_chaotic: "钱动心乱",
  still_moving_then_traded: "心还在动仍交易",
  added_position_when_heart_moving: "心动时加仓",
  moved_stop_loss: "移动止损",
  same_thought_repeated: "复发念",
  same_scene_repeated: "复发场景",
  same_behavior_repeated: "复发行为",
  same_capital_damage_repeated: "复发资金伤害",
  heart_thief_cycle: "心贼循环",
}

const levelRank: Record<RuleGuardInsightLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

const sourceRank: Record<RuleGuardInsightSource, number> = {
  combined: 3,
  cycle: 2,
  review_risk: 1,
}

const reviewActionText: Partial<Record<ReviewRiskSignalType, string>> = {
  repeated_broke_rule: "先把规则边界写清，再看同类场景能不能停住。",
  repeated_zei_sheng: "先看清这次奖励的是规则，还是旧习惯。",
  repeated_shuang_shu: "先回到复盘，不急着用下一次覆盖这一次。",
  capital_double_unstable: "先看资金边界，再看这颗心为何被带走。",
  money_moving_heart_chaotic: "先把仓位、风险和规则偏移写清楚。",
  still_moving_then_traded: "先照见心还在动，再决定手是否该动。",
  added_position_when_heart_moving: "先照见扩大的冲动，再回到原计划。",
  moved_stop_loss: "先记录规则为何被挪动，再看下一次如何守住。",
}

const cycleActionText: Partial<Record<CycleSignalType, string>> = {
  same_thought_repeated: "先认出这不是新念头，再看它怎样带动作。",
  same_scene_repeated: "先认出同一类场景，再看同一颗心如何接管。",
  same_behavior_repeated: "先看见动作复发，再回到照见和规则。",
  same_capital_damage_repeated: "先看资金伤害如何反复绑定心动行为。",
  heart_thief_cycle: "先看见循环，再回到当时那一念。",
}

type CombinedRule = {
  riskType: ReviewRiskSignalType
  cycleType: CycleSignalType
  outputType: RuleGuardInsightType
  text: string
}

const combinedRules: CombinedRule[] = [
  {
    riskType: "still_moving_then_traded",
    cycleType: "heart_thief_cycle",
    outputType: "heart_thief_cycle",
    text: "这不是单次风险。这条循环已经出现多次：心还在动 → 还是交易 → 复盘失守。",
  },
  {
    riskType: "repeated_broke_rule",
    cycleType: "same_behavior_repeated",
    outputType: "repeated_broke_rule",
    text: "破戒不是偶然。同一类动作最近反复出现，说明规则还没有真正落到手上。",
  },
  {
    riskType: "capital_double_unstable",
    cycleType: "same_capital_damage_repeated",
    outputType: "same_capital_damage_repeated",
    text: "资金失稳不是单次波动。它正在和同一类心动行为绑定。",
  },
  {
    riskType: "money_moving_heart_chaotic",
    cycleType: "same_capital_damage_repeated",
    outputType: "same_capital_damage_repeated",
    text: "资金失稳不是单次波动。它正在和同一类心动行为绑定。",
  },
  {
    riskType: "repeated_zei_sheng",
    cycleType: "heart_thief_cycle",
    outputType: "repeated_zei_sheng",
    text: "最近多次出现贼胜。钱暂时没坏，但坏习惯正在被奖励。",
  },
]

function addUnique(items: string[], value: string | undefined) {
  if (!value) return
  if (!items.includes(value)) items.push(value)
}

function mergeRelatedIds(left: string[] = [], right: string[] = []) {
  const ids: string[] = []
  for (const id of left) addUnique(ids, id)
  for (const id of right) addUnique(ids, id)
  return ids
}

function getMaxLevel(left: RuleGuardInsightLevel, right: RuleGuardInsightLevel): RuleGuardInsightLevel {
  return levelRank[left] >= levelRank[right] ? left : right
}

function findReviewSignal(signals: ReviewRiskSignal[], type: ReviewRiskSignalType) {
  return signals.find((signal) => signal.type === type)
}

function findCycleSignal(signals: CycleSignal[], type: CycleSignalType) {
  return signals.find((signal) => signal.type === type)
}

function buildCombinedInsight(rule: CombinedRule, risk: ReviewRiskSignal, cycle: CycleSignal): RuleGuardInsight {
  const relatedIds = mergeRelatedIds(risk.relatedReviewIds, cycle.relatedIds)

  return {
    id: `combined:${rule.riskType}:${rule.cycleType}`,
    source: "combined",
    type: rule.outputType,
    level: getMaxLevel(risk.level, cycle.level),
    title: ruleGuardInsightTypeLabels[rule.outputType],
    text: rule.text,
    count: Math.max(risk.count, cycle.count),
    relatedIds,
    actionText: cycleActionText[rule.cycleType] || reviewActionText[rule.riskType] || "先看见循环，再回到复盘。",
  }
}

function buildReviewInsight(signal: ReviewRiskSignal): RuleGuardInsight {
  return {
    id: `review_risk:${signal.type}`,
    source: "review_risk",
    type: signal.type,
    level: signal.level,
    title: ruleGuardInsightTypeLabels[signal.type],
    text: signal.text,
    count: signal.count,
    relatedIds: [...signal.relatedReviewIds],
    actionText: reviewActionText[signal.type] || "先把这类失守写清楚，再看是否重复。",
  }
}

function buildCycleInsight(signal: CycleSignal, cycleSummary?: CycleSummary): RuleGuardInsight {
  return {
    id: `cycle:${signal.type}`,
    source: "cycle",
    type: signal.type,
    level: signal.level,
    title: ruleGuardInsightTypeLabels[signal.type],
    text: signal.text || cycleSummary?.conclusionText || "这不是单次风险，这是同一条循环在反复发生。",
    count: signal.count,
    relatedIds: [...signal.relatedIds],
    actionText: cycleActionText[signal.type] || "先看见循环，再看动作是否被同一念头接管。",
  }
}

export function sortRuleGuardInsights(insights: RuleGuardInsight[] = []) {
  return [...insights].sort((left, right) => {
    const levelDiff = levelRank[right.level] - levelRank[left.level]
    if (levelDiff !== 0) return levelDiff

    const sourceDiff = sourceRank[right.source] - sourceRank[left.source]
    if (sourceDiff !== 0) return sourceDiff

    const countDiff = right.count - left.count
    if (countDiff !== 0) return countDiff

    const relatedDiff = right.relatedIds.length - left.relatedIds.length
    if (relatedDiff !== 0) return relatedDiff

    return left.title.localeCompare(right.title, "zh-CN")
  })
}

export function buildRuleGuardInsights({
  reviewRiskSignals = [],
  cycleSignals = [],
  cycleSummary,
  maxItems = 3,
}: BuildRuleGuardInsightsInput) {
  const insights: RuleGuardInsight[] = []
  const combinedRiskTypes = new Set<ReviewRiskSignalType>()
  const combinedCycleTypes = new Set<CycleSignalType>()

  for (const rule of combinedRules) {
    const risk = findReviewSignal(reviewRiskSignals, rule.riskType)
    const cycle = findCycleSignal(cycleSignals, rule.cycleType)
    if (!risk || !cycle) continue

    insights.push(buildCombinedInsight(rule, risk, cycle))
    combinedRiskTypes.add(rule.riskType)
    combinedCycleTypes.add(rule.cycleType)
  }

  for (const signal of cycleSignals) {
    if (combinedCycleTypes.has(signal.type)) continue
    insights.push(buildCycleInsight(signal, cycleSummary))
  }

  for (const signal of reviewRiskSignals) {
    if (combinedRiskTypes.has(signal.type)) continue
    insights.push(buildReviewInsight(signal))
  }

  return sortRuleGuardInsights(insights).slice(0, Math.max(0, maxItems))
}

export function formatTopRuleGuardInsightSummary(insights: RuleGuardInsight[] = []) {
  const [topInsight] = sortRuleGuardInsights(insights)
  if (!topInsight) return RULE_GUARD_INSIGHT_EMPTY_TEXT

  return `${ruleGuardInsightSourceLabels[topInsight.source]}：${topInsight.title}。${topInsight.text}`
}
