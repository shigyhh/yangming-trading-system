import { linkTradeReviewToOneThoughtEvent } from "@/lib/mind-archive/oneThoughtEventRepository"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  PRIVATE_REFLECTION_VERSION,
  TRADE_REVIEW_STORAGE_KEY,
  type BrowserStorageLike,
  type ChartEvidence,
  type ChartEvidenceType,
  type HeartJudgement,
  type MarketPattern,
  type MarketTrend,
  type PriceLocation,
  type TradeReview,
  type VolumeState,
} from "@/lib/mind-archive/types"

export type CreateTradeReviewInput = Omit<TradeReview, "id" | "heartJudgement" | "createdAt" | "updatedAt"> & {
  id?: string
  heartJudgement?: HeartJudgement
  createdAt?: string
  updatedAt?: string
}

export const heartJudgementLabels: Record<HeartJudgement, string> = {
  zheng_sheng: "正胜",
  zei_sheng: "贼胜",
  zheng_kui: "正亏",
  shuang_shu: "双输",
}

export const heartJudgementDescriptions: Record<HeartJudgement, string> = {
  zheng_sheng: "这笔既赚钱，也守住了心。",
  zei_sheng: "钱赚了，但这笔是心贼赢了。",
  zheng_kui: "钱亏了，但心没有失守。",
  shuang_shu: "钱也亏了，心也被带走了。",
}

function getBrowserStorage(): BrowserStorageLike | null {
  if (typeof window === "undefined") return null
  return window.localStorage
}

function safeGet(storage: BrowserStorageLike | null | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function safeSet(storage: BrowserStorageLike | null | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value)
  } catch {
    // localStorage may be unavailable in private or embedded contexts.
  }
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function createId(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

function normalizeOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function normalizePainLevel(value: unknown): TradeReview["painLevel"] {
  const numberValue = Number(value)
  if (numberValue === 1 || numberValue === 2 || numberValue === 3 || numberValue === 4 || numberValue === 5) {
    return numberValue
  }
  return undefined
}

function normalizeChartEvidenceType(value: unknown): ChartEvidenceType {
  if (
    value === "before_entry" ||
    value === "after_entry" ||
    value === "exit" ||
    value === "trade_record"
  ) {
    return value
  }
  return "before_entry"
}

function normalizeChartEvidence(value: unknown): ChartEvidence | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<ChartEvidence>
  if (!item.id || !item.url) return null

  return {
    id: String(item.id),
    type: normalizeChartEvidenceType(item.type),
    url: String(item.url),
    fileName: item.fileName ? String(item.fileName) : undefined,
    createdAt: String(item.createdAt || new Date().toISOString()),
  }
}

function normalizeMarketTrend(value: unknown): MarketTrend {
  if (
    value === "uptrend" ||
    value === "downtrend" ||
    value === "range" ||
    value === "sharp_rise" ||
    value === "sharp_drop" ||
    value === "reversal_attempt" ||
    value === "unclear"
  ) {
    return value
  }
  return "unclear"
}

function normalizePriceLocation(value: unknown): PriceLocation {
  if (
    value === "high" ||
    value === "middle" ||
    value === "low" ||
    value === "support_area" ||
    value === "resistance_area" ||
    value === "range_top" ||
    value === "range_bottom" ||
    value === "ma_area" ||
    value === "unclear"
  ) {
    return value
  }
  return "unclear"
}

function normalizePattern(value: unknown): MarketPattern {
  if (
    value === "breakout" ||
    value === "pullback" ||
    value === "false_breakout" ||
    value === "range_bound" ||
    value === "second_push" ||
    value === "second_dip" ||
    value === "spike_and_fade" ||
    value === "rebound" ||
    value === "unclear"
  ) {
    return value
  }
  return "unclear"
}

function normalizeVolumeState(value: unknown): VolumeState {
  if (value === "expanding" || value === "shrinking" || value === "normal" || value === "unknown") {
    return value
  }
  return "unknown"
}

function normalizeConfidence(value: unknown): "low" | "medium" | "high" | undefined {
  if (value === "low" || value === "medium" || value === "high") return value
  return undefined
}

function normalizeMarketContextDataSource(value: unknown): NonNullable<TradeReview["marketContext"]>["dataSource"] {
  if (value === "kline_db" || value === "screenshot" || value === "insufficient_data") return value
  return "manual"
}

function normalizeMarketContextEvidence(value: unknown): NonNullable<TradeReview["marketContext"]>["evidence"] {
  if (!value || typeof value !== "object") return undefined
  const item = value as Record<string, unknown>

  return {
    recentHigh: normalizeOptionalNumber(item.recentHigh),
    recentLow: normalizeOptionalNumber(item.recentLow),
    lastClose: normalizeOptionalNumber(item.lastClose),
    ma20: normalizeOptionalNumber(item.ma20),
    ma60: normalizeOptionalNumber(item.ma60),
    slopePct: normalizeOptionalNumber(item.slopePct),
    volumeRatio: normalizeOptionalNumber(item.volumeRatio),
  }
}

function normalizeMarketContext(value: unknown): TradeReview["marketContext"] {
  if (!value || typeof value !== "object") return undefined
  const item = value as Partial<NonNullable<TradeReview["marketContext"]>>

  return {
    symbol: item.symbol ? String(item.symbol).trim() : undefined,
    timeframe: item.timeframe ? String(item.timeframe).trim() : undefined,
    entryTime: item.entryTime ? String(item.entryTime).trim() : undefined,
    entryPrice: normalizeOptionalNumber(item.entryPrice),
    marketTrend: normalizeMarketTrend(item.marketTrend),
    priceLocation: normalizePriceLocation(item.priceLocation),
    pattern: normalizePattern(item.pattern),
    volumeState: normalizeVolumeState(item.volumeState),
    confidence: normalizeConfidence(item.confidence),
    dataSource: normalizeMarketContextDataSource(item.dataSource),
    evidence: normalizeMarketContextEvidence(item.evidence),
    editedByUser: Boolean(item.editedByUser),
  }
}

function normalizeBehaviorEvidence(value: unknown): TradeReview["behaviorEvidence"] {
  if (!value || typeof value !== "object") return undefined
  const item = value as Partial<NonNullable<TradeReview["behaviorEvidence"]>>

  return {
    changedPlanIntraday: Boolean(item.changedPlanIntraday),
    addedPosition: Boolean(item.addedPosition),
    movedStopLoss: Boolean(item.movedStopLoss),
    emotionDrivenEntry: Boolean(item.emotionDrivenEntry),
  }
}

function normalizeReviewSummary(value: unknown): TradeReview["reviewSummary"] {
  if (!value || typeof value !== "object") return undefined
  const item = value as Partial<NonNullable<TradeReview["reviewSummary"]>>

  return {
    marketText: item.marketText ? String(item.marketText) : undefined,
    behaviorText: item.behaviorText ? String(item.behaviorText) : undefined,
    heartText: item.heartText ? String(item.heartText) : undefined,
    practiceText: item.practiceText ? String(item.practiceText) : undefined,
  }
}

export function calculateHeartJudgement(
  pnl: number,
  followedPlan: boolean,
  brokeRule: boolean,
): HeartJudgement {
  const keptHeart = followedPlan && !brokeRule

  if (pnl > 0 && keptHeart) return "zheng_sheng"
  if (pnl > 0 && !keptHeart) return "zei_sheng"
  if (pnl <= 0 && keptHeart) return "zheng_kui"
  return "shuang_shu"
}

export function judgeTradeHeart(params: {
  pnl: number
  followedPlan: boolean
  brokeRule: boolean
}): HeartJudgement {
  return calculateHeartJudgement(params.pnl, params.followedPlan, params.brokeRule)
}

function normalizeTradeReview(value: unknown): TradeReview | null {
  if (!value || typeof value !== "object") return null

  const item = value as Partial<TradeReview>
  if (
    !item.id ||
    !item.linkedOneThoughtEventId ||
    !item.sceneId ||
    !item.itemId ||
    !item.key ||
    !item.os ||
    !item.reflectionFinal ||
    !item.symbol ||
    !item.direction
  ) {
    return null
  }

  const pnl = Number(item.pnl)
  if (!Number.isFinite(pnl)) return null

  const followedPlan = Boolean(item.followedPlan)
  const brokeRule = Boolean(item.brokeRule)
  const createdAt = String(item.createdAt || new Date().toISOString())

  return {
    id: String(item.id),
    userId: String(item.userId || DEFAULT_MIND_ARCHIVE_USER_ID),
    linkedOneThoughtEventId: String(item.linkedOneThoughtEventId),
    sceneId: String(item.sceneId),
    itemId: String(item.itemId),
    key: String(item.key),
    os: String(item.os),
    reflectionFinal: String(item.reflectionFinal),
    painLevel: normalizePainLevel(item.painLevel),
    painPoint: item.painPoint ? String(item.painPoint) : undefined,
    heartThief: item.heartThief ? String(item.heartThief) : undefined,
    reflectionVersion: PRIVATE_REFLECTION_VERSION,
    symbol: String(item.symbol).trim(),
    timeframe: item.timeframe ? String(item.timeframe).trim() : undefined,
    direction: item.direction,
    entryPrice: normalizeOptionalNumber(item.entryPrice),
    exitPrice: normalizeOptionalNumber(item.exitPrice),
    quantity: normalizeOptionalNumber(item.quantity),
    pnl,
    followedPlan,
    brokeRule,
    screenshotUrl: item.screenshotUrl ? String(item.screenshotUrl) : undefined,
    chartEvidence: Array.isArray(item.chartEvidence)
      ? item.chartEvidence.map(normalizeChartEvidence).filter((evidence): evidence is ChartEvidence => Boolean(evidence))
      : undefined,
    marketContext: normalizeMarketContext(item.marketContext),
    behaviorEvidence: normalizeBehaviorEvidence(item.behaviorEvidence),
    reviewText: item.reviewText ? String(item.reviewText) : undefined,
    reviewSummary: normalizeReviewSummary(item.reviewSummary),
    heartJudgement: item.heartJudgement || calculateHeartJudgement(pnl, followedPlan, brokeRule),
    createdAt,
    updatedAt: String(item.updatedAt || createdAt),
  }
}

function getReviewTime(review: Pick<TradeReview, "createdAt" | "updatedAt">) {
  const time = new Date(review.updatedAt || review.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

function writeTradeReviews(reviews: TradeReview[], storage: BrowserStorageLike | null | undefined) {
  safeSet(storage, TRADE_REVIEW_STORAGE_KEY, JSON.stringify(reviews))
}

export function listTradeReviews(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  return parseJson<unknown[]>(safeGet(storage, TRADE_REVIEW_STORAGE_KEY), [])
    .map(normalizeTradeReview)
    .filter((review): review is TradeReview => Boolean(review))
    .filter((review) => review.userId === userId)
    .sort((left, right) => getReviewTime(right) - getReviewTime(left))
}

export function listRecentTradeReviews(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  limit = 10,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  return listTradeReviews(userId, storage).slice(0, Math.max(0, Math.trunc(limit)))
}

export function listTradeReviewsByOneThoughtEvent(
  userId: string,
  eventId: string,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  return listTradeReviews(userId, storage).filter((review) => review.linkedOneThoughtEventId === eventId)
}

export function getTradeReview(id: string, storage: BrowserStorageLike | null = getBrowserStorage()) {
  return parseJson<unknown[]>(safeGet(storage, TRADE_REVIEW_STORAGE_KEY), [])
    .map(normalizeTradeReview)
    .find((review) => review?.id === id) ?? null
}

export function createTradeReview(
  input: CreateTradeReviewInput,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  const now = new Date().toISOString()
  const review = normalizeTradeReview({
    ...input,
    id: input.id || createId("trade_review"),
    heartJudgement: input.heartJudgement || calculateHeartJudgement(Number(input.pnl), input.followedPlan, input.brokeRule),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  })

  if (!review) throw new Error("TradeReview 缺少必要字段。")

  const currentReviews = parseJson<unknown[]>(safeGet(storage, TRADE_REVIEW_STORAGE_KEY), [])
    .map(normalizeTradeReview)
    .filter((item): item is TradeReview => Boolean(item))
  const nextReviews = [review, ...currentReviews.filter((item) => item.id !== review.id)].sort(
    (left, right) => getReviewTime(right) - getReviewTime(left),
  )

  writeTradeReviews(nextReviews, storage)
  linkTradeReviewToOneThoughtEvent(review.linkedOneThoughtEventId, review.id, storage)

  return review
}

export function updateTradeReview(
  id: string,
  patch: Partial<TradeReview>,
  storage: BrowserStorageLike | null = getBrowserStorage(),
) {
  const currentReviews = parseJson<unknown[]>(safeGet(storage, TRADE_REVIEW_STORAGE_KEY), [])
    .map(normalizeTradeReview)
    .filter((item): item is TradeReview => Boolean(item))
  const current = currentReviews.find((review) => review.id === id)
  if (!current) return null

  const merged = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date().toISOString(),
  }
  const updated = normalizeTradeReview({
    ...merged,
    heartJudgement: calculateHeartJudgement(Number(merged.pnl), Boolean(merged.followedPlan), Boolean(merged.brokeRule)),
  })
  if (!updated) return null

  writeTradeReviews(
    [updated, ...currentReviews.filter((review) => review.id !== id)].sort(
      (left, right) => getReviewTime(right) - getReviewTime(left),
    ),
    storage,
  )

  return updated
}

export function clearTradeReviewsForDevOnly(storage: BrowserStorageLike | null = getBrowserStorage()) {
  writeTradeReviews([], storage)
}
