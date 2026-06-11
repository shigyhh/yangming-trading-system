import {
  getArchiveStats,
  getRecurringThoughts,
  getReviewJudgementCounts,
  getStillMovingRate,
  getStopRate,
  getTopHeartThieves,
  getTopScenes,
} from "@/lib/mind-archive/archiveStatsService"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type ArchiveRange,
  type BrowserStorageLike,
  type RecurringThoughtItem,
  type TopSceneItem,
} from "@/lib/mind-archive/types"

export interface HeartThiefProfile {
  userId: string
  totalEvents: number
  dominantHeartThief?: string
  topHeartThieves: Array<{ heartThief: string; count: number; ratio: number }>
  topScenes: TopSceneItem[]
  recurringThoughts: RecurringThoughtItem[]
  stopRate: number
  stillMovingRate: number
  reviewJudgementCounts: {
    zhengSheng: number
    zeiSheng: number
    zhengKui: number
    shuangShu: number
  }
  riskLabel?: string
  updatedAt: string
}

const riskLabelByHeartThief: Record<string, string> = {
  急: "近日最强心贼：急。\n你不是没有判断，是受不了等。",
  贪: "近日最强心贼：贪。\n你不是想赚钱，是想一口吃完。",
  痴: "近日最强心贼：痴。\n你不是没看懂，是不愿认错。",
  疑: "近日最强心贼：疑。\n你不是没看见机会，是不敢承担结果。",
  执: "近日最强心贼：执。\n你不是放不下行情，是放不下当初那个判断。",
  怯: "近日最强心贼：怯。\n你不是谨慎，是怕一动就坐实错误。",
  惧: "近日最强心贼：怯。\n你不是谨慎，是怕一动就坐实错误。",
  从: "近日最强心贼：从。\n你不是要建议，是想把责任交出去。",
  傲: "近日最强心贼：傲。\n你不是看懂了市场，是刚赢一次就忘了边界。",
}

export const emptyHeartThiefRiskLabel = "今日还没有照见。\n先照一念，档案才会说话。"

export function getHeartThiefRiskLabel(heartThief: string) {
  return riskLabelByHeartThief[heartThief] ?? `近日最强心贼：${heartThief}。\n它来得越多，越值得先照见。`
}

function toProfileJudgementCounts(counts: ReturnType<typeof getReviewJudgementCounts>): HeartThiefProfile["reviewJudgementCounts"] {
  return {
    zhengSheng: counts.zheng_sheng,
    zeiSheng: counts.zei_sheng,
    zhengKui: counts.zheng_kui,
    shuangShu: counts.shuang_shu,
  }
}

export function getHeartThiefProfile(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  options: {
    range?: ArchiveRange
    storage?: BrowserStorageLike | null
    now?: Date
  } = {},
): HeartThiefProfile {
  const range = options.range ?? "7d"
  const now = options.now ?? new Date()
  const stats = getArchiveStats(userId, range, options.storage, now)
  const topHeartThieves = getTopHeartThieves(userId, range, options.storage, now).map((item) => ({
    heartThief: item.label,
    count: item.count,
    ratio: stats.totalEvents ? item.count / stats.totalEvents : 0,
  }))
  const dominantHeartThief = topHeartThieves[0]?.heartThief

  return {
    userId,
    totalEvents: stats.totalEvents,
    topHeartThieves,
    topScenes: getTopScenes(userId, range, options.storage, now),
    recurringThoughts: getRecurringThoughts(userId, range, options.storage, now),
    stopRate: getStopRate(userId, range, options.storage, now),
    stillMovingRate: getStillMovingRate(userId, range, options.storage, now),
    reviewJudgementCounts: toProfileJudgementCounts(getReviewJudgementCounts(userId, range, options.storage, now)),
    dominantHeartThief,
    riskLabel: dominantHeartThief ? getHeartThiefRiskLabel(dominantHeartThief) : stats.totalEvents ? "" : emptyHeartThiefRiskLabel,
    updatedAt: now.toISOString(),
  }
}
