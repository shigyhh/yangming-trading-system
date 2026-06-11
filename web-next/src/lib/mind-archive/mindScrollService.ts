import { listSealedOneThoughtEvents } from "@/lib/mind-archive/oneThoughtEventRepository"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type BrowserStorageLike,
  type OneThoughtEvent,
} from "@/lib/mind-archive/types"

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
>

export function getMindScrollItems(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
): MindScrollItem[] {
  const events = storage === undefined
    ? listSealedOneThoughtEvents(userId)
    : listSealedOneThoughtEvents(userId, storage)

  return events.map((event) => ({
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
  }))
}
