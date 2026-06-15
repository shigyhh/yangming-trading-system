import type {
  ActualAction,
  CapitalStabilityLevel,
  HeartJudgement,
  OneThoughtEvent,
  OneThoughtReaction,
  TradeDirection,
  TradeReview,
} from "./types"

export type ReviewArchiveTradeReview = Partial<TradeReview> & { id: string }
export type ReviewArchiveOneThoughtEvent = Partial<OneThoughtEvent> & { id: string }

export type ReviewArchiveItem = {
  id: string
  tradeReviewId: string
  linkedOneThoughtEventId?: string
  createdAt: string
  os?: string
  reflectionFinal?: string
  heartThief?: string
  userReaction?: OneThoughtReaction
  actualAction?: ActualAction
  symbol?: string
  direction?: TradeDirection
  pnl?: number
  hasMarketContext: boolean
  marketText?: string
  heartJudgement?: HeartJudgement
  capitalStabilityLevel?: CapitalStabilityLevel
  practiceText?: string
  capitalPracticeText?: string
  brokeRule?: boolean
  followedPlan?: boolean
  addedPosition?: boolean
  movedStopLoss?: boolean
  changedPlanIntraday?: boolean
}

export type ReviewArchiveStats = {
  heartJudgementCounts: {
    zhengSheng: number
    zeiSheng: number
    zhengKui: number
    shuangShu: number
    missing: number
  }
  capitalStabilityCounts: {
    stableWithGuard: number
    moneyStableHeartMoving: number
    moneyMovingHeartChaotic: number
    doubleUnstable: number
    insufficientData: number
    missing: number
  }
  behaviorCounts: {
    brokeRule: number
    addedPosition: number
    movedStopLoss: number
    changedPlanIntraday: number
    stillMovingThenTraded: number
  }
  marketContextCounts: {
    hasMarketContext: number
    missingMarketContext: number
  }
}

export type ReviewRiskSignalType =
  | "repeated_broke_rule"
  | "repeated_zei_sheng"
  | "repeated_shuang_shu"
  | "capital_double_unstable"
  | "money_moving_heart_chaotic"
  | "still_moving_then_traded"
  | "added_position_when_heart_moving"
  | "moved_stop_loss"

export type ReviewRiskSignal = {
  type: ReviewRiskSignalType
  level: "low" | "medium" | "high"
  count: number
  text: string
  relatedReviewIds: string[]
}

export type BuildReviewArchiveInput = {
  tradeReviews: ReviewArchiveTradeReview[]
  oneThoughtEvents: ReviewArchiveOneThoughtEvent[]
  recentDays?: number
  now?: Date | string
}

export type ReviewArchiveResult = {
  reviewArchiveItems: ReviewArchiveItem[]
  reviewArchiveStats: ReviewArchiveStats
  reviewRiskSignals: ReviewRiskSignal[]
}

function getTime(value: Date | string | undefined) {
  if (!value) return null
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function getReviewTime(review: ReviewArchiveTradeReview) {
  return getTime(review.updatedAt) ?? getTime(review.createdAt) ?? 0
}

function isInRecentWindow(review: ReviewArchiveTradeReview, recentDays: number | undefined, now: Date | string | undefined) {
  if (!Number.isFinite(recentDays) || Number(recentDays) <= 0) return true
  const nowTime = getTime(now) ?? Date.now()
  const reviewTime = getReviewTime(review)
  if (!reviewTime) return true
  return reviewTime >= nowTime - Number(recentDays) * 24 * 60 * 60 * 1000
}

function createEventMap(events: ReviewArchiveOneThoughtEvent[]) {
  return new Map(events.map((event) => [event.id, event]))
}

function buildMarketText(review: ReviewArchiveTradeReview) {
  return review.marketContext?.summary?.finalText || review.reviewSummary?.marketText
}

function hasMarketContext(review: ReviewArchiveTradeReview) {
  return Boolean(
    review.marketContext?.summary?.finalText ||
      review.marketContext?.timeframes ||
      review.marketContext?.marketTrend ||
      review.marketContext?.priceLocation ||
      review.marketContext?.pattern ||
      review.marketContext?.volumeState ||
      review.marketContext?.dataSource,
  )
}

function isBehaviorFlagSet(review: ReviewArchiveTradeReview, key: "addedPosition" | "movedStopLoss" | "changedPlanIntraday") {
  return Boolean(review.behaviorEvidence?.[key] || review.riskEvidence?.[key])
}

function buildArchiveItem(review: ReviewArchiveTradeReview, event?: ReviewArchiveOneThoughtEvent): ReviewArchiveItem {
  const marketText = buildMarketText(review)
  const createdAt = review.createdAt || event?.updatedAt || event?.createdAt || ""

  return {
    id: review.id,
    tradeReviewId: review.id,
    linkedOneThoughtEventId: review.linkedOneThoughtEventId || event?.id,
    createdAt,
    os: review.os || event?.os,
    reflectionFinal: review.reflectionFinal || event?.reflectionFinal,
    heartThief: review.heartThief || event?.heartThief,
    userReaction: event?.userReaction,
    actualAction: event?.actualAction,
    symbol: review.symbol,
    direction: review.direction,
    pnl: typeof review.pnl === "number" && Number.isFinite(review.pnl) ? review.pnl : undefined,
    hasMarketContext: hasMarketContext(review),
    marketText,
    heartJudgement: review.heartJudgement,
    capitalStabilityLevel: review.capitalStability?.level,
    practiceText: review.reviewSummary?.practiceText,
    capitalPracticeText: review.capitalStability?.practiceText,
    brokeRule: typeof review.brokeRule === "boolean" ? review.brokeRule : undefined,
    followedPlan: typeof review.followedPlan === "boolean" ? review.followedPlan : undefined,
    addedPosition: isBehaviorFlagSet(review, "addedPosition"),
    movedStopLoss: isBehaviorFlagSet(review, "movedStopLoss"),
    changedPlanIntraday: isBehaviorFlagSet(review, "changedPlanIntraday"),
  }
}

function createEmptyStats(): ReviewArchiveStats {
  return {
    heartJudgementCounts: {
      zhengSheng: 0,
      zeiSheng: 0,
      zhengKui: 0,
      shuangShu: 0,
      missing: 0,
    },
    capitalStabilityCounts: {
      stableWithGuard: 0,
      moneyStableHeartMoving: 0,
      moneyMovingHeartChaotic: 0,
      doubleUnstable: 0,
      insufficientData: 0,
      missing: 0,
    },
    behaviorCounts: {
      brokeRule: 0,
      addedPosition: 0,
      movedStopLoss: 0,
      changedPlanIntraday: 0,
      stillMovingThenTraded: 0,
    },
    marketContextCounts: {
      hasMarketContext: 0,
      missingMarketContext: 0,
    },
  }
}

function addHeartJudgement(stats: ReviewArchiveStats, value: HeartJudgement | undefined) {
  if (value === "zheng_sheng") stats.heartJudgementCounts.zhengSheng += 1
  else if (value === "zei_sheng") stats.heartJudgementCounts.zeiSheng += 1
  else if (value === "zheng_kui") stats.heartJudgementCounts.zhengKui += 1
  else if (value === "shuang_shu") stats.heartJudgementCounts.shuangShu += 1
  else stats.heartJudgementCounts.missing += 1
}

function addCapitalStability(stats: ReviewArchiveStats, value: CapitalStabilityLevel | undefined) {
  if (value === "stable_with_guard") stats.capitalStabilityCounts.stableWithGuard += 1
  else if (value === "money_stable_heart_moving") stats.capitalStabilityCounts.moneyStableHeartMoving += 1
  else if (value === "money_moving_heart_chaotic") stats.capitalStabilityCounts.moneyMovingHeartChaotic += 1
  else if (value === "double_unstable") stats.capitalStabilityCounts.doubleUnstable += 1
  else if (value === "insufficient_data") stats.capitalStabilityCounts.insufficientData += 1
  else stats.capitalStabilityCounts.missing += 1
}

function buildStats(items: ReviewArchiveItem[]) {
  const stats = createEmptyStats()

  for (const item of items) {
    addHeartJudgement(stats, item.heartJudgement)
    addCapitalStability(stats, item.capitalStabilityLevel)

    if (item.brokeRule) stats.behaviorCounts.brokeRule += 1
    if (item.addedPosition) stats.behaviorCounts.addedPosition += 1
    if (item.movedStopLoss) stats.behaviorCounts.movedStopLoss += 1
    if (item.changedPlanIntraday) stats.behaviorCounts.changedPlanIntraday += 1
    if (item.userReaction === "still_moving" && item.actualAction === "traded") {
      stats.behaviorCounts.stillMovingThenTraded += 1
    }

    if (item.hasMarketContext) stats.marketContextCounts.hasMarketContext += 1
    else stats.marketContextCounts.missingMarketContext += 1
  }

  return stats
}

function signalLevel(count: number) {
  if (count >= 3) return "high"
  if (count >= 2) return "medium"
  return "low"
}

function createSignal(
  items: ReviewArchiveItem[],
  type: ReviewRiskSignalType,
  minCount: number,
  text: string,
  predicate: (item: ReviewArchiveItem) => boolean,
): ReviewRiskSignal | null {
  const matched = items.filter(predicate)
  if (matched.length < minCount) return null

  return {
    type,
    level: signalLevel(matched.length),
    count: matched.length,
    text,
    relatedReviewIds: matched.map((item) => item.tradeReviewId),
  }
}

function buildRiskSignals(items: ReviewArchiveItem[]) {
  return [
    createSignal(
      items,
      "repeated_broke_rule",
      2,
      "最近多次出现破戒复盘。先把规则边界写清，再看下一次是否照着做。",
      (item) => item.brokeRule === true,
    ),
    createSignal(
      items,
      "repeated_zei_sheng",
      2,
      "最近出现多次贼胜。钱暂时没坏，但坏习惯正在被奖励。",
      (item) => item.heartJudgement === "zei_sheng",
    ),
    createSignal(
      items,
      "repeated_shuang_shu",
      2,
      "最近出现多次双输。钱和心一起失守时，先回到复盘和规则。",
      (item) => item.heartJudgement === "shuang_shu",
    ),
    createSignal(
      items,
      "capital_double_unstable",
      1,
      "复盘中出现资金双失守迹象。重点不是行情，而是资金边界有没有被情绪带走。",
      (item) => item.capitalStabilityLevel === "double_unstable",
    ),
    createSignal(
      items,
      "money_moving_heart_chaotic",
      1,
      "资金开始被心贼牵动。先看仓位、风险和规则是否偏移。",
      (item) => item.capitalStabilityLevel === "money_moving_heart_chaotic",
    ),
    createSignal(
      items,
      "still_moving_then_traded",
      1,
      "最近多次出现“心还在动后仍交易”。这不是行情问题，是同一颗心在反复接管下单。",
      (item) => item.userReaction === "still_moving" && item.actualAction === "traded",
    ),
    createSignal(
      items,
      "added_position_when_heart_moving",
      1,
      "心还在动时仍扩大仓位。先照见冲动，再回到原计划。",
      (item) => item.userReaction === "still_moving" && item.addedPosition === true,
    ),
    createSignal(
      items,
      "moved_stop_loss",
      1,
      "复盘中出现移动止损。先记录规则为何被挪动，再看下一次如何守住。",
      (item) => item.movedStopLoss === true,
    ),
  ].filter((signal): signal is ReviewRiskSignal => Boolean(signal))
}

export function buildReviewArchive({
  tradeReviews,
  oneThoughtEvents,
  recentDays,
  now,
}: BuildReviewArchiveInput): ReviewArchiveResult {
  const eventsById = createEventMap(oneThoughtEvents)
  const reviewArchiveItems = tradeReviews
    .filter((review) => isInRecentWindow(review, recentDays, now))
    .sort((left, right) => getReviewTime(right) - getReviewTime(left))
    .map((review) => buildArchiveItem(review, eventsById.get(review.linkedOneThoughtEventId || "")))

  return {
    reviewArchiveItems,
    reviewArchiveStats: buildStats(reviewArchiveItems),
    reviewRiskSignals: buildRiskSignals(reviewArchiveItems),
  }
}
