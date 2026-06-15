import type { ReviewRiskSignal, ReviewRiskSignalType } from "./reviewArchiveService"

export const REVIEW_RISK_SIGNAL_EMPTY_TEXT = "暂无规则守护提醒。不是没有风险，而是还需要更多复盘样本。"

export const reviewRiskSignalTypeLabels: Record<ReviewRiskSignalType, string> = {
  repeated_broke_rule: "反复破戒",
  repeated_zei_sheng: "贼胜反复",
  repeated_shuang_shu: "双输反复",
  capital_double_unstable: "资金双失守",
  money_moving_heart_chaotic: "钱动心乱",
  still_moving_then_traded: "心还在动仍交易",
  added_position_when_heart_moving: "心动时加仓",
  moved_stop_loss: "移动止损",
}

export const reviewRiskSignalLevelLabels: Record<ReviewRiskSignal["level"], string> = {
  low: "轻提醒",
  medium: "守护提醒",
  high: "强守护",
}

const signalLevelRank: Record<ReviewRiskSignal["level"], number> = {
  high: 3,
  medium: 2,
  low: 1,
}

export function sortReviewRiskSignals(signals: ReviewRiskSignal[] = []) {
  return [...signals].sort((left, right) => {
    const levelDiff = signalLevelRank[right.level] - signalLevelRank[left.level]
    if (levelDiff !== 0) return levelDiff

    const countDiff = right.count - left.count
    if (countDiff !== 0) return countDiff

    return reviewRiskSignalTypeLabels[left.type].localeCompare(reviewRiskSignalTypeLabels[right.type], "zh-CN")
  })
}

export function getTopReviewRiskSignals(signals: ReviewRiskSignal[] = [], limit = 3) {
  return sortReviewRiskSignals(signals).slice(0, Math.max(0, limit))
}

export function formatTopReviewRiskSignalSummary(signals: ReviewRiskSignal[] = []) {
  const [topSignal] = getTopReviewRiskSignals(signals, 1)
  if (!topSignal) return REVIEW_RISK_SIGNAL_EMPTY_TEXT

  return `这类失守最近已出现 ${topSignal.count} 次。${topSignal.text}`
}
