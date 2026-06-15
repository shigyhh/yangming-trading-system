import { listSealedOneThoughtEvents } from "@/lib/mind-archive/oneThoughtEventRepository"
import { buildCycleMirror, getTopCycleItems } from "@/lib/mind-archive/cycleMirrorService"
import { buildReviewArchive } from "@/lib/mind-archive/reviewArchiveService"
import { formatTopReviewRiskSignalSummary } from "@/lib/mind-archive/reviewRiskSignalDisplay"
import {
  CAPITAL_STABILITY_MISSING_LABEL,
  DEFAULT_MIND_ARCHIVE_USER_ID,
  capitalStabilityLevelLabels,
  type BrowserStorageLike,
  type CapitalStabilityLevel,
  type HeartJudgement,
  type OneThoughtEvent,
} from "@/lib/mind-archive/types"
import { listTradeReviews } from "@/lib/trade-review/tradeReviewRepository"

export type MindScrollItem = Pick<
  OneThoughtEvent,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "tradeMoment"
  | "os"
  | "reflectionFinal"
  | "heartThief"
  | "heartEvidence"
  | "practiceText"
  | "userReaction"
  | "actualAction"
  | "reviewStatus"
> & {
  tradeReviewId?: string
  heartJudgement?: HeartJudgement
  capitalStabilityLevel?: CapitalStabilityLevel
  capitalStabilityLabel: string
  reviewPracticeText?: string
}

export type MindScrollData = {
  items: MindScrollItem[]
  ruleGuardSummary: string
  cycleMirrorSummary: {
    strongestHeartThief?: string
    recurringHeartThieves: string[]
    heartThiefCycleText?: string
    recurringThoughtText?: string
    conclusionText: string
  }
}

export function getMindScrollData(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
): MindScrollData {
  const events = storage === undefined
    ? listSealedOneThoughtEvents(userId)
    : listSealedOneThoughtEvents(userId, storage)
  const tradeReviews = listTradeReviews(userId, storage)
  const { reviewArchiveItems, reviewRiskSignals } = buildReviewArchive({
    tradeReviews,
    oneThoughtEvents: events,
  })
  const cycleMirror = buildCycleMirror({
    oneThoughtEvents: events,
    reviewArchiveItems,
    reviewRiskSignals,
  })
  const reviewByEventId = new Map(
    reviewArchiveItems
      .filter((item) => Boolean(item.linkedOneThoughtEventId))
      .map((item) => [item.linkedOneThoughtEventId as string, item]),
  )

  const items = events.map((event) => {
    const review = reviewByEventId.get(event.id)
    const capitalStabilityLevel = review?.capitalStabilityLevel

    return {
      id: event.id,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      tradeMoment: event.tradeMoment,
      os: event.os,
      reflectionFinal: event.reflectionFinal,
      heartThief: event.heartThief,
      heartEvidence: event.heartEvidence,
      practiceText: event.practiceText,
      userReaction: event.userReaction,
      actualAction: event.actualAction,
      reviewStatus: event.reviewStatus,
      tradeReviewId: review?.tradeReviewId,
      heartJudgement: review?.heartJudgement,
      capitalStabilityLevel,
      capitalStabilityLabel: capitalStabilityLevel
        ? capitalStabilityLevelLabels[capitalStabilityLevel]
        : CAPITAL_STABILITY_MISSING_LABEL,
      reviewPracticeText: review?.practiceText,
    }
  })

  return {
    items,
    ruleGuardSummary: formatTopReviewRiskSignalSummary(reviewRiskSignals),
    cycleMirrorSummary: {
      strongestHeartThief: cycleMirror.cycleSummary.strongestHeartThief,
      recurringHeartThieves: getTopCycleItems(cycleMirror.recurringHeartThieves, 3)
        .map((item) => `${item.heartThief} · ${item.count} 次`),
      heartThiefCycleText: cycleMirror.cycleSignals.find((signal) => signal.type === "heart_thief_cycle")?.text,
      recurringThoughtText: getTopCycleItems(cycleMirror.recurringThoughts, 1)[0]?.text,
      conclusionText: cycleMirror.cycleSummary.conclusionText,
    },
  }
}

export function getMindScrollItems(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
): MindScrollItem[] {
  return getMindScrollData(userId, storage).items
}
