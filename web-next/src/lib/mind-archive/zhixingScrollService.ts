import { listSealedOneThoughtEvents } from "@/lib/mind-archive/oneThoughtEventRepository"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type ActualAction,
  type BrowserStorageLike,
  type HeartJudgement,
  type OneThoughtReaction,
  type ReviewStatus,
} from "@/lib/mind-archive/types"
import { listTradeReviewsByOneThoughtEvent } from "@/lib/trade-review/tradeReviewRepository"

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
  zhixingState: ZhixingState
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

export function getZhixingScrollItems(
  userId = DEFAULT_MIND_ARCHIVE_USER_ID,
  storage?: BrowserStorageLike | null,
): ZhixingScrollItem[] {
  const events = storage === undefined
    ? listSealedOneThoughtEvents(userId)
    : listSealedOneThoughtEvents(userId, storage)

  return events.map((event) => {
    const review = listTradeReviewsByOneThoughtEvent(userId, event.id, storage).at(0)
    const zhixingState = resolveZhixingState({
      userReaction: event.userReaction,
      actualAction: event.actualAction,
      reviewStatus: event.reviewStatus,
      heartJudgement: review?.heartJudgement,
    })

    return {
      oneThoughtEventId: event.id,
      tradeReviewId: review?.id,
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
      zhixingState,
    }
  })
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
