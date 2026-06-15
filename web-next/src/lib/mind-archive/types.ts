export const DEFAULT_MIND_ARCHIVE_USER_ID = "local_zhaojian_user"
export const ONE_THOUGHT_EVENT_STORAGE_KEY = "zhaojian:one_thought_events:v1"
export const TRADE_REVIEW_STORAGE_KEY = "zhaojian:trade_reviews:v1"
export const PRIVATE_REFLECTION_VERSION = "reflection_final_shenji_zeyou_v1"
export const ONE_THOUGHT_RITUAL_NAME = "照见一念仪轨"
export const ONE_THOUGHT_RITUAL_VERSION = "one_thought_ritual_v1"

export type PrivateReflectionVersion = typeof PRIVATE_REFLECTION_VERSION
export type OneThoughtRitualName = typeof ONE_THOUGHT_RITUAL_NAME
export type OneThoughtRitualVersion = typeof ONE_THOUGHT_RITUAL_VERSION

export type OneThoughtReaction =
  | "seen"
  | "not_hit"
  | "stopped"
  | "still_moving"

export type IntendedAction =
  | "pause"
  | "watch"
  | "buy"
  | "sell"
  | "add"
  | "reduce"
  | "exit"
  | "unknown"

export type ActualAction =
  | "no_trade"
  | "traded"
  | "paused"
  | "watched"
  | "unknown"

export type OneThoughtActualAction = ActualAction

export type RitualStatus =
  | "draft"
  | "revealed"
  | "sealed"
  | "abandoned"

export type OneThoughtRitualStatus = RitualStatus

export type ReviewStatus =
  | "none"
  | "pending"
  | "completed"

export type OneThoughtReviewStatus = ReviewStatus

export type OneThoughtEventSource =
  | "today_reflection"
  | "saved_from_public_lake"
  | "manual"
  | "one_thought_ritual"

export type OneThoughtSealStage = {
  startedAt?: string
  zhaoziStartedAt?: string
  zhaojianThisHeartAt?: string
  zhaojianThisThoughtAt?: string
  threeActCompletedAt?: string
  revealStartedAt?: string
  reflectionShownAt?: string
  reflectionSeenAt?: string
  heartThiefShownAt?: string
  heartEvidenceShownAt?: string
  practiceShownAt?: string
  sealedAt?: string
}

export interface OneThoughtEvent {
  id: string
  userId: string
  sceneId: string
  itemId: string
  key: string
  tradeMoment: string
  os: string
  reflectionFinal: string
  finalSource: string
  painLevel: 1 | 2 | 3 | 4 | 5
  painPoint?: string
  heartThief?: string
  heartEvidence?: string
  practiceText?: string
  reflectionVersion: PrivateReflectionVersion
  ritualName?: OneThoughtRitualName
  ritualVersion?: OneThoughtRitualVersion
  ritualStatus?: RitualStatus
  sealStage?: OneThoughtSealStage
  reflectionShownAt: string
  reflectionSeen: boolean
  reflectionSeenAt?: string
  userReaction?: OneThoughtReaction
  userReactionAt?: string
  intendedAction?: IntendedAction
  actualAction?: ActualAction
  actualActionAt?: string
  tradeId?: string
  tradeReviewId?: string
  reviewStatus?: ReviewStatus
  source: OneThoughtEventSource
  createdAt: string
  updatedAt: string
}

export type TradeDirection =
  | "buy"
  | "sell"
  | "long"
  | "short"
  | "close_long"
  | "close_short"

export type HeartJudgement =
  | "zheng_sheng"
  | "zei_sheng"
  | "zheng_kui"
  | "shuang_shu"

export type ChartEvidenceType =
  | "before_entry"
  | "after_entry"
  | "exit"
  | "trade_record"

export type MarketTrend =
  | "uptrend"
  | "downtrend"
  | "range"
  | "sharp_rise"
  | "sharp_drop"
  | "reversal_attempt"
  | "unclear"

export type PriceLocation =
  | "high"
  | "middle"
  | "low"
  | "support_area"
  | "resistance_area"
  | "range_top"
  | "range_bottom"
  | "ma_area"
  | "unclear"

export type MarketPattern =
  | "breakout"
  | "pullback"
  | "false_breakout"
  | "range_bound"
  | "second_push"
  | "second_dip"
  | "spike_and_fade"
  | "rebound"
  | "unclear"

export type VolumeState =
  | "expanding"
  | "shrinking"
  | "normal"
  | "unknown"

export type Timeframe =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "101"

export type KlinePattern = MarketPattern

export type MarketContextDataSource = "manual" | "kline_db" | "screenshot" | "insufficient_data"

export interface KlineCandle {
  symbol: string
  timeframe: Timeframe | string
  openTime: string
  closeTime?: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
  amount?: number
  pctChg?: number
}

export interface KlineContextQuery {
  symbol: string
  timeframe: Timeframe | string
  entryTime: string
  entryPrice?: number
}

export interface KlineContextResult {
  symbol: string
  timeframe: Timeframe | string
  entryTime: string
  candlesUsed: number
  marketTrend: MarketTrend
  priceLocation: PriceLocation
  pattern: KlinePattern
  volumeState: VolumeState
  confidence: "low" | "medium" | "high"
  dataSource: "kline_db" | "manual" | "insufficient_data"
  evidence: {
    recentHigh?: number
    recentLow?: number
    lastClose?: number
    ma20?: number
    ma60?: number
    slopePct?: number
    volumeRatio?: number
  }
  manifestStatus?: string
  sliceSource?: string
  notes?: string[]
}

export type ChartEvidence = {
  id: string
  type: ChartEvidenceType
  url: string
  fileName?: string
  createdAt: string
}

export type TradeReviewMarketContext = {
  symbol?: string
  timeframe?: string
  entryTime?: string
  entryPrice?: number
  primaryTimeframe?: "30m" | "60m" | "101" | null
  timeframes?: Record<"30m" | "60m" | "101", KlineContextResult | null>
  availability?: Record<"30m" | "60m" | "101", "ok" | "insufficient_data" | "missing" | "error">
  source?: "server" | "manual"
  fallbackReason?: string
  attemptedTimeframes?: Array<"30m" | "60m" | "101">
  fallbackChain?: Array<{
    timeframe: "30m" | "60m" | "101"
    status: "ok" | "insufficient_data" | "missing" | "error"
    reason?: string
  }>
  klineAvailable?: boolean
  candlesCount?: number
  manifestStatus?: string
  sliceSource?: string
  summary?: {
    dailyText?: string
    h60Text?: string
    m30Text?: string
    finalText?: string
  }
  marketTrend?: MarketTrend
  priceLocation?: PriceLocation
  pattern?: MarketPattern
  volumeState?: VolumeState
  confidence?: "low" | "medium" | "high"
  dataSource: MarketContextDataSource
  evidence?: KlineContextResult["evidence"]
  editedByUser?: boolean
}

export type TradeReviewBehaviorEvidence = {
  changedPlanIntraday?: boolean
  addedPosition?: boolean
  movedStopLoss?: boolean
  emotionDrivenEntry?: boolean
}

export type TradeReviewAccountSnapshot = {
  accountEquityBefore?: number
  accountEquityAfter?: number
}

export type TradeReviewRiskEvidence = {
  positionValue?: number
  plannedRiskAmount?: number
  actualLossAmount?: number
  leverage?: number
  fee?: number
  addedPosition?: boolean
  movedStopLoss?: boolean
  changedPlanIntraday?: boolean
}

export type CapitalStabilityLevel =
  | "stable_with_guard"
  | "money_stable_heart_moving"
  | "money_moving_heart_chaotic"
  | "double_unstable"
  | "insufficient_data"

export const CAPITAL_STABILITY_MISSING_LABEL = "资金证未记录"

export const capitalStabilityLevelLabels: Record<CapitalStabilityLevel, string> = {
  stable_with_guard: "稳中有戒",
  money_stable_heart_moving: "钱稳心动",
  money_moving_heart_chaotic: "钱动心乱",
  double_unstable: "双失守",
  insufficient_data: "数据不足",
}

export type TradeReviewCapitalStability = {
  version: "capital_stability_v1"
  level: CapitalStabilityLevel
  score?: number | null
  reasons: string[]
  warnings: string[]
  metrics: {
    pnlPctOfEquity?: number
    positionPctOfEquity?: number
    riskPctOfEquity?: number
    exceededPlannedRisk?: boolean
    lossStreak?: number
    brokeRuleLossPct?: number
    zeiShengCount?: number
    shuangShuCount?: number
  }
  practiceText?: string
  generatedAt: string
}

export type TradeReviewSummary = {
  version?: "pan_xin_he_zheng_v1" | string
  thoughtText?: string
  marketText?: string
  behaviorText?: string
  heartText?: string
  judgementText?: string
  practiceText?: string
  generatedAt?: string
}

export type TradeReviewSyncStatus = "pending" | "synced" | "failed"

export interface TradeReview {
  id: string
  userId: string
  linkedOneThoughtEventId: string
  sceneId: string
  itemId: string
  key: string
  os: string
  reflectionFinal: string
  painLevel?: 1 | 2 | 3 | 4 | 5
  painPoint?: string
  heartThief?: string
  reflectionVersion: PrivateReflectionVersion
  symbol: string
  timeframe?: string
  direction: TradeDirection
  entryPrice?: number
  exitPrice?: number
  quantity?: number
  pnl: number
  followedPlan: boolean
  brokeRule: boolean
  screenshotUrl?: string
  chartEvidence?: ChartEvidence[]
  marketContext?: TradeReviewMarketContext
  behaviorEvidence?: TradeReviewBehaviorEvidence
  accountSnapshot?: TradeReviewAccountSnapshot
  riskEvidence?: TradeReviewRiskEvidence
  reviewText?: string
  reviewSummary?: TradeReviewSummary
  capitalStability?: TradeReviewCapitalStability
  heartJudgement: HeartJudgement
  tradeReviewSyncStatus?: TradeReviewSyncStatus
  tradeReviewLastSyncedAt?: string
  syncError?: string
  createdAt: string
  updatedAt: string
}

export type BrowserStorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export type ArchiveRange = "all" | "7d" | "24h"

export type CountItem = {
  label: string
  count: number
}

export type TopSceneItem = {
  sceneId: string
  tradeMoment: string
  count: number
}

export type RecurringThoughtItem = {
  key: string
  sceneId: string
  itemId: string
  os: string
  tradeMoment: string
  count: number
  lastSeenAt: string
}

export type ReviewJudgementCounts = Record<HeartJudgement, number>

export type CapitalStabilityStats = {
  stableWithGuard: number
  moneyStableHeartMoving: number
  moneyMovingHeartChaotic: number
  doubleUnstable: number
  insufficientData: number
  missing: number
}

export type ArchiveStats = {
  userId: string
  totalEvents: number
  todayTotal: number
  todaySeen: number
  todayNotHit: number
  todayStopped: number
  todayStillMoving: number
  pendingReviewCount: number
  reviewedCount: number
  stopRate: number
  stillMovingRate: number
  recentEvents: OneThoughtEvent[]
  pendingReviewEvents: OneThoughtEvent[]
  topHeartThieves: CountItem[]
  topScenes: TopSceneItem[]
  recurringThoughts: RecurringThoughtItem[]
  reviewJudgementCounts: ReviewJudgementCounts
  capitalStabilityStats: CapitalStabilityStats
}
