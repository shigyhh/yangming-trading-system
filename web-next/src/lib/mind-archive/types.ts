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

export type TradeReviewSummary = {
  marketText?: string
  behaviorText?: string
  heartText?: string
  practiceText?: string
}

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
  reviewText?: string
  reviewSummary?: TradeReviewSummary
  heartJudgement: HeartJudgement
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
}
