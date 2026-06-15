import { listSealedOneThoughtEvents } from "@/lib/mind-archive/oneThoughtEventRepository"
import { buildReviewArchive } from "@/lib/mind-archive/reviewArchiveService"
import { formatTopReviewRiskSignalSummary } from "@/lib/mind-archive/reviewRiskSignalDisplay"
import {
  CAPITAL_STABILITY_MISSING_LABEL,
  DEFAULT_MIND_ARCHIVE_USER_ID,
  capitalStabilityLevelLabels,
  type ActualAction,
  type BrowserStorageLike,
  type CapitalStabilityLevel,
  type HeartJudgement,
  type OneThoughtReaction,
  type ReviewStatus,
} from "@/lib/mind-archive/types"
import { listTradeReviews } from "@/lib/trade-review/tradeReviewRepository"

export type ZhixingState =
  | "止念成行"
  | "心动未复"
  | "正胜"
  | "贼胜"
  | "正亏"
  | "双输"
  | "待记录"

export type ZhixingScrollItem = {
  oneThoughtEventId: string
  linkedOneThoughtEventId?: string
  tradeReviewId?: string
  createdAt: string
  os: string
  reflectionFinal: string
  userReaction?: OneThoughtReaction
  actualAction?: ActualAction
  symbol?: string
  pnl?: number
  followedPlan?: boolean
  brokeRule?: boolean
  heartJudgement?: HeartJudgement
  marketContextSummary?: string
  practiceText?: string
  capitalStabilityLevel?: CapitalStabilityLevel
  capitalStabilityLabel: string
  capitalStabilityPracticeText?: string
  hasMarketContext: boolean
  zhixingState: ZhixingState
}

export type ZhixingScrollData = {
  items: ZhixingScrollItem[]
  ruleGuardSummary: string
}

export const zhixingStateDescriptions: Record<ZhixingState, string> = {
  止念成行: "这一次，照见之后你停住了。",
  心动未复: "心已经动了，也交易了，但还没有回头看。",
  正胜: "这笔既赚钱，也守住了心。",
  贼胜: "钱赚了，但这笔是心贼赢了。",
  正亏: "钱亏了，但心没有失守。",
  双输: "钱也亏了，心也被带走了。",
  待记录: "这一念已经照见，后面的行动还没留下记录。",
}

export function getZhixingScrollData(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
): ZhixingScrollData {
  const events = storage === undefined
    ? listSealedOneThoughtEvents(userId)
    : listSealedOneThoughtEvents(userId, storage)
  const tradeReviews = listTradeReviews(userId, storage)
  const { reviewArchiveItems, reviewRiskSignals } = buildReviewArchive({
    tradeReviews,
    oneThoughtEvents: events,
  })
  const reviewByEventId = new Map(
    reviewArchiveItems
      .filter((item) => Boolean(item.linkedOneThoughtEventId))
      .map((item) => [item.linkedOneThoughtEventId as string, item]),
  )

  const items = events.map((event) => {
    const review = reviewByEventId.get(event.id)
    const zhixingState = resolveZhixingState({
      userReaction: event.userReaction,
      actualAction: event.actualAction,
      reviewStatus: event.reviewStatus,
      heartJudgement: review?.heartJudgement,
    })
    const capitalStabilityLevel = review?.capitalStabilityLevel

    return {
      oneThoughtEventId: event.id,
      linkedOneThoughtEventId: review?.linkedOneThoughtEventId,
      tradeReviewId: review?.tradeReviewId,
      createdAt: review?.createdAt || event.updatedAt || event.createdAt,
      os: event.os,
      reflectionFinal: event.reflectionFinal,
      userReaction: event.userReaction,
      actualAction: event.actualAction,
      symbol: review?.symbol,
      pnl: review?.pnl,
      followedPlan: review?.followedPlan,
      brokeRule: review?.brokeRule,
      heartJudgement: review?.heartJudgement,
      marketContextSummary: review?.marketText,
      practiceText: review?.practiceText,
      capitalStabilityLevel,
      capitalStabilityLabel: capitalStabilityLevel
        ? capitalStabilityLevelLabels[capitalStabilityLevel]
        : CAPITAL_STABILITY_MISSING_LABEL,
      capitalStabilityPracticeText: review?.capitalPracticeText,
      hasMarketContext: Boolean(review?.hasMarketContext),
      zhixingState,
    }
  })

  return {
    items,
    ruleGuardSummary: formatTopReviewRiskSignalSummary(reviewRiskSignals),
  }
}

export function getZhixingScrollItems(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
): ZhixingScrollItem[] {
  return getZhixingScrollData(userId, storage).items
}

export function resolveZhixingState(input: {
  userReaction?: OneThoughtReaction
  actualAction?: ActualAction
  reviewStatus?: ReviewStatus
  heartJudgement?: HeartJudgement
}): ZhixingState {
  if (input.userReaction === "stopped" && (input.actualAction === "paused" || input.actualAction === "watched")) {
    return "止念成行"
  }

  if (input.actualAction === "traded" && input.reviewStatus === "pending") {
    return "心动未复"
  }

  if (input.heartJudgement === "zheng_sheng") return "正胜"
  if (input.heartJudgement === "zei_sheng") return "贼胜"
  if (input.heartJudgement === "zheng_kui") return "正亏"
  if (input.heartJudgement === "shuang_shu") return "双输"

  return "待记录"
}
