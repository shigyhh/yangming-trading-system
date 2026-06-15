import { listSealedOneThoughtEvents } from "@/lib/mind-archive/oneThoughtEventRepository"
import { buildReviewArchive } from "@/lib/mind-archive/reviewArchiveService"
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

export function getMindScrollItems(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
): MindScrollItem[] {
  const events = storage === undefined
    ? listSealedOneThoughtEvents(userId)
    : listSealedOneThoughtEvents(userId, storage)
  const tradeReviews = listTradeReviews(userId, storage)
  const { reviewArchiveItems } = buildReviewArchive({
    tradeReviews,
    oneThoughtEvents: events,
  })
  const reviewByEventId = new Map(
    reviewArchiveItems
      .filter((item) => Boolean(item.linkedOneThoughtEventId))
      .map((item) => [item.linkedOneThoughtEventId as string, item]),
  )

  return events.map((event) => {
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
}
