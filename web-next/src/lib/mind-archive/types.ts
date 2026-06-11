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
  direction: TradeDirection
  entryPrice?: number
  exitPrice?: number
  quantity?: number
  pnl: number
  followedPlan: boolean
  brokeRule: boolean
  screenshotUrl?: string
  reviewText?: string
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
