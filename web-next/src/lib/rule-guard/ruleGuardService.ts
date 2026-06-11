import {
  getRecurringThoughts,
  getTopHeartThieves,
} from "@/lib/mind-archive/archiveStatsService"
import { listOneThoughtEvents } from "@/lib/mind-archive/oneThoughtEventRepository"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type BrowserStorageLike,
} from "@/lib/mind-archive/types"
import { listRecentTradeReviews } from "@/lib/trade-review/tradeReviewRepository"

export type RuleGuardReminder = {
  id: string
  type: "heart_thief" | "recurring_thought" | "still_moving" | "zei_sheng" | "shuang_shu"
  title: string
  message: string
  count: number
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
  const reminders: RuleGuardReminder[] = []
  const topHeartThief = getTopHeartThieves(userId, "7d", options.storage, now)[0]

  if (topHeartThief && topHeartThief.count >= 5) {
    reminders.push({
      id: `heart_thief_${topHeartThief.label}`,
      type: "heart_thief",
      title: "高频心贼提醒",
      message: `近日「${topHeartThief.label}」出现 ${topHeartThief.count} 次。\n这不是行情催你，是旧心贼又来了。`,
      count: topHeartThief.count,
    })
  }

  const recurringThought = getRecurringThoughts(userId, "7d", options.storage, now).find((item) => item.count >= 3)
  if (recurringThought) {
    reminders.push({
      id: `recurring_${recurringThought.key}`,
      type: "recurring_thought",
      title: "复发念提醒",
      message: `这念已经出现 ${recurringThought.count} 次。\n它不是第一次来，也不会是最后一次。`,
      count: recurringThought.count,
    })
  }

  const oneDayStart = nowMinusHours(now, 24)
  const stillMovingCount = listOneThoughtEvents(userId, options.storage).filter((event) => {
    const time = new Date(event.userReactionAt || event.updatedAt || event.createdAt).getTime()
    return event.userReaction === "still_moving" && !Number.isNaN(time) && time >= oneDayStart
  }).length

  if (stillMovingCount >= 2) {
    reminders.push({
      id: "still_moving_24h",
      type: "still_moving",
      title: "心还在动提醒",
      message: "今天你已经两次承认“心还在动”。\n现在不适合用冲动证明自己。",
      count: stillMovingCount,
    })
  }

  const recentReviews = listRecentTradeReviews(userId, 10, options.storage)
  const zeiShengCount = recentReviews.filter((review) => review.heartJudgement === "zei_sheng").length
  if (zeiShengCount >= 2) {
    reminders.push({
      id: "zei_sheng_recent",
      type: "zei_sheng",
      title: "贼胜提醒",
      message: `最近有 ${zeiShengCount} 笔是“贼胜”。\n钱赚了，但规则被破了。`,
      count: zeiShengCount,
    })
  }

  const shuangShuCount = recentReviews.filter((review) => review.heartJudgement === "shuang_shu").length
  if (shuangShuCount >= 2) {
    reminders.push({
      id: "shuang_shu_recent",
      type: "shuang_shu",
      title: "双输提醒",
      message: "最近双输偏多。\n不是市场太狠，是心先失守。",
      count: shuangShuCount,
    })
  }

  return reminders
}
