import { listSealedOneThoughtEvents } from "@/lib/mind-archive/oneThoughtEventRepository"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type ArchiveRange,
  type ArchiveStats,
  type BrowserStorageLike,
  type CountItem,
  type HeartJudgement,
  type OneThoughtEvent,
  type RecurringThoughtItem,
  type ReviewJudgementCounts,
  type TopSceneItem,
} from "@/lib/mind-archive/types"
import { listTradeReviews } from "@/lib/trade-review/tradeReviewRepository"

const emptyJudgementCounts: ReviewJudgementCounts = {
  zheng_sheng: 0,
  zei_sheng: 0,
  zheng_kui: 0,
  shuang_shu: 0,
}

function getEventTime(event: Pick<OneThoughtEvent, "createdAt" | "updatedAt">) {
  const time = new Date(event.updatedAt || event.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

function getRangeStart(range: ArchiveRange, now = new Date()) {
  if (range === "all") return 0
  const offset = range === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
  return now.getTime() - offset
}

function filterEventsByRange(events: OneThoughtEvent[], range: ArchiveRange, now = new Date()) {
  const start = getRangeStart(range, now)
  return events.filter((event) => getEventTime(event) >= start)
}

function listArchiveEvents(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
) {
  return storage === undefined ? listSealedOneThoughtEvents(userId) : listSealedOneThoughtEvents(userId, storage)
}

function normalizeHeartThieves(value: string | undefined) {
  if (!value) return []

  return value
    .split(/[、,，·\s/|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item === "惧" ? "怯" : item))
}

function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

function topCounts(values: string[]): CountItem[] {
  const counts = new Map<string, number>()

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
}

export function getTopHeartThieves(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  range: ArchiveRange = "7d",
  storage?: BrowserStorageLike | null,
  now = new Date(),
) {
  const events = filterEventsByRange(listArchiveEvents(userId, storage), range, now)
  return topCounts(events.flatMap((event) => normalizeHeartThieves(event.heartThief)))
}

export function getTopScenes(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  range: ArchiveRange = "7d",
  storage?: BrowserStorageLike | null,
  now = new Date(),
) {
  const events = filterEventsByRange(listArchiveEvents(userId, storage), range, now)
  const scenes = new Map<string, TopSceneItem>()

  for (const event of events) {
    const current = scenes.get(event.sceneId)
    if (!current) {
      scenes.set(event.sceneId, {
        sceneId: event.sceneId,
        tradeMoment: event.tradeMoment,
        count: 1,
      })
      continue
    }

    current.count += 1
  }

  return [...scenes.values()].sort(
    (left, right) => right.count - left.count || left.tradeMoment.localeCompare(right.tradeMoment),
  )
}

export function getRecurringThoughts(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  range: ArchiveRange = "7d",
  storage?: BrowserStorageLike | null,
  now = new Date(),
) {
  const events = filterEventsByRange(listArchiveEvents(userId, storage), range, now)
  const grouped = new Map<string, RecurringThoughtItem>()

  for (const event of events) {
    const current = grouped.get(event.key)
    if (!current) {
      grouped.set(event.key, {
        key: event.key,
        sceneId: event.sceneId,
        itemId: event.itemId,
        os: event.os,
        tradeMoment: event.tradeMoment,
        count: 1,
        lastSeenAt: event.updatedAt || event.createdAt,
      })
      continue
    }

    current.count += 1
    if (getEventTime(event) > new Date(current.lastSeenAt).getTime()) {
      current.lastSeenAt = event.updatedAt || event.createdAt
    }
  }

  return [...grouped.values()]
    .filter((item) => item.count >= 2)
    .sort((left, right) => right.count - left.count || right.lastSeenAt.localeCompare(left.lastSeenAt))
}

export function getStopRate(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  range: ArchiveRange = "7d",
  storage?: BrowserStorageLike | null,
  now = new Date(),
) {
  const events = filterEventsByRange(listArchiveEvents(userId, storage), range, now)
  if (!events.length) return 0
  return events.filter((event) => event.userReaction === "stopped").length / events.length
}

export function getStillMovingRate(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  range: ArchiveRange = "7d",
  storage?: BrowserStorageLike | null,
  now = new Date(),
) {
  const events = filterEventsByRange(listArchiveEvents(userId, storage), range, now)
  if (!events.length) return 0
  return events.filter((event) => event.userReaction === "still_moving").length / events.length
}

export function getReviewJudgementCounts(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  range: ArchiveRange = "7d",
  storage?: BrowserStorageLike | null,
  now = new Date(),
) {
  const start = getRangeStart(range, now)
  const counts: ReviewJudgementCounts = { ...emptyJudgementCounts }

  for (const review of listTradeReviews(userId, storage)) {
    const time = new Date(review.updatedAt || review.createdAt).getTime()
    if (Number.isNaN(time) || time < start) continue
    counts[review.heartJudgement as HeartJudgement] += 1
  }

  return counts
}

export function getRecentSealedThoughtEvents(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  limit = 20,
  storage?: BrowserStorageLike | null,
) {
  return listArchiveEvents(userId, storage).slice(0, Math.max(0, Math.trunc(limit)))
}

export function getPendingReviewEvents(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
) {
  return listArchiveEvents(userId, storage).filter(
    (event) => event.actualAction === "traded" && event.reviewStatus === "pending",
  )
}

export function getTodayThoughtCount(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
  now = new Date(),
) {
  const currentDate = todayKey(now)
  return listArchiveEvents(userId, storage).filter((event) => event.createdAt.slice(0, 10) === currentDate).length
}

export function getTodayArchiveStats(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
  now = new Date(),
) {
  const today = todayKey(now)
  const events = listArchiveEvents(userId, storage).filter((event) => event.createdAt.slice(0, 10) === today)
  const pendingReviewEvents = events.filter(
    (event) => event.actualAction === "traded" && event.reviewStatus === "pending",
  )

  return {
    userId,
    events,
    total: events.length,
    seen: events.filter((event) => event.userReaction === "seen").length,
    notHit: events.filter((event) => event.userReaction === "not_hit").length,
    stopped: events.filter((event) => event.userReaction === "stopped").length,
    stillMoving: events.filter((event) => event.userReaction === "still_moving").length,
    pendingReview: pendingReviewEvents.length,
    pendingReviewEvents,
  }
}

export function getArchiveStats(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  range: ArchiveRange = "7d",
  storage?: BrowserStorageLike | null,
  now = new Date(),
): ArchiveStats {
  const events = listArchiveEvents(userId, storage)
  const rangedEvents = filterEventsByRange(events, range, now)
  const today = todayKey(now)
  const todayEvents = events.filter((event) => event.createdAt.slice(0, 10) === today)
  const reviews = listTradeReviews(userId, storage)
  const pendingReviewEvents = getPendingReviewEvents(userId, storage)

  return {
    userId,
    totalEvents: rangedEvents.length,
    todayTotal: todayEvents.length,
    todaySeen: todayEvents.filter((event) => event.userReaction === "seen").length,
    todayNotHit: todayEvents.filter((event) => event.userReaction === "not_hit").length,
    todayStopped: todayEvents.filter((event) => event.userReaction === "stopped").length,
    todayStillMoving: todayEvents.filter((event) => event.userReaction === "still_moving").length,
    pendingReviewCount: pendingReviewEvents.length,
    reviewedCount: rangedEvents.filter((event) => Boolean(event.tradeReviewId)).length,
    stopRate: getStopRate(userId, range, storage, now),
    stillMovingRate: getStillMovingRate(userId, range, storage, now),
    recentEvents: events.slice(0, 20),
    pendingReviewEvents,
    topHeartThieves: getTopHeartThieves(userId, range, storage, now),
    topScenes: getTopScenes(userId, range, storage, now),
    recurringThoughts: getRecurringThoughts(userId, range, storage, now),
    reviewJudgementCounts: reviews.length ? getReviewJudgementCounts(userId, range, storage, now) : { ...emptyJudgementCounts },
  }
}

export const getMindArchiveStats = getArchiveStats
