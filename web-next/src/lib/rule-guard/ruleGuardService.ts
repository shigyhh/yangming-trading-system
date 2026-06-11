import {
  getRecurringThoughts,
  getTopHeartThieves,
} from "@/lib/mind-archive/archiveStatsService"
import { listSealedOneThoughtEvents } from "@/lib/mind-archive/oneThoughtEventRepository"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type BrowserStorageLike,
  type HeartJudgement,
} from "@/lib/mind-archive/types"
import { listRecentTradeReviews } from "@/lib/trade-review/tradeReviewRepository"

export type RuleGuardReminder = {
  id: string
  type: "heart_thief" | "recurring_thought" | "still_moving" | "zei_sheng" | "shuang_shu"
  severity: "high" | "medium" | "low"
  title: string
  message: string
  evidence: {
    count: number
    window: "7d" | "24h" | "last10"
    heartThief?: string
    sceneId?: string
    itemId?: string
    judgement?: HeartJudgement
  }
  source: "oneThoughtEvent" | "tradeReview"
  createdAt: string
  count: number
}

const ruleGuardPriority: Record<RuleGuardReminder["type"], number> = {
  shuang_shu: 1,
  zei_sheng: 2,
  still_moving: 3,
  recurring_thought: 4,
  heart_thief: 5,
}

function nowMinusHours(now: Date, hours: number) {
  return now.getTime() - hours * 60 * 60 * 1000
}

export function getRuleGuardReminders(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  options: {
    storage?: BrowserStorageLike | null
    now?: Date
  } = {},
) {
  const now = options.now ?? new Date()
  const nowIso = now.toISOString()
  const reminders: RuleGuardReminder[] = []
  const topHeartThief = getTopHeartThieves(userId, "7d", options.storage, now)[0]

  if (topHeartThief && topHeartThief.count >= 5) {
    reminders.push({
      id: `frequent_heart_thief:${userId}:7d:${topHeartThief.label}`,
      type: "heart_thief",
      severity: "medium",
      title: "高频心贼提醒",
      message: `近日「${topHeartThief.label}」出现 ${topHeartThief.count} 次。\n这不是行情催你，是旧心贼又来了。`,
      evidence: {
        count: topHeartThief.count,
        window: "7d",
        heartThief: topHeartThief.label,
      },
      source: "oneThoughtEvent",
      createdAt: nowIso,
      count: topHeartThief.count,
    })
  }

  const recurringThought = getRecurringThoughts(userId, "7d", options.storage, now).find((item) => item.count >= 3)
  if (recurringThought) {
    reminders.push({
      id: `recurring_thought:${userId}:7d:${recurringThought.sceneId}:${recurringThought.itemId}`,
      type: "recurring_thought",
      severity: "medium",
      title: "复发念提醒",
      message: `这念已经出现 ${recurringThought.count} 次。\n它不是第一次来，也不会是最后一次。`,
      evidence: {
        count: recurringThought.count,
        window: "7d",
        sceneId: recurringThought.sceneId,
        itemId: recurringThought.itemId,
      },
      source: "oneThoughtEvent",
      createdAt: nowIso,
      count: recurringThought.count,
    })
  }

  const oneDayStart = nowMinusHours(now, 24)
  const stillMovingCount = listSealedOneThoughtEvents(userId, options.storage).filter((event) => {
    const time = new Date(event.userReactionAt || event.updatedAt || event.createdAt).getTime()
    return event.userReaction === "still_moving" && !Number.isNaN(time) && time >= oneDayStart
  }).length

  if (stillMovingCount >= 2) {
    reminders.push({
      id: `still_moving:${userId}:24h`,
      type: "still_moving",
      severity: "medium",
      title: "心还在动提醒",
      message: "今天你已经两次承认“心还在动”。\n现在不适合用冲动证明自己。",
      evidence: {
        count: stillMovingCount,
        window: "24h",
      },
      source: "oneThoughtEvent",
      createdAt: nowIso,
      count: stillMovingCount,
    })
  }

  const recentReviews = listRecentTradeReviews(userId, 10, options.storage)
  const zeiShengCount = recentReviews.filter((review) => review.heartJudgement === "zei_sheng").length
  if (zeiShengCount >= 2) {
    reminders.push({
      id: `zei_sheng:${userId}:last10`,
      type: "zei_sheng",
      severity: "high",
      title: "贼胜提醒",
      message: `最近有 ${zeiShengCount} 笔是“贼胜”。\n钱赚了，但规则被破了。`,
      evidence: {
        count: zeiShengCount,
        window: "last10",
        judgement: "zei_sheng",
      },
      source: "tradeReview",
      createdAt: nowIso,
      count: zeiShengCount,
    })
  }

  const shuangShuCount = recentReviews.filter((review) => review.heartJudgement === "shuang_shu").length
  if (shuangShuCount >= 2) {
    reminders.push({
      id: `shuang_shu:${userId}:last10`,
      type: "shuang_shu",
      severity: "high",
      title: "双输提醒",
      message: "最近双输偏多。\n不是市场太狠，是心先失守。",
      evidence: {
        count: shuangShuCount,
        window: "last10",
        judgement: "shuang_shu",
      },
      source: "tradeReview",
      createdAt: nowIso,
      count: shuangShuCount,
    })
  }

  return reminders.sort((left, right) => ruleGuardPriority[left.type] - ruleGuardPriority[right.type])
}
