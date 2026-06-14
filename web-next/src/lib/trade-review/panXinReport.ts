import type { HeartJudgement, OneThoughtEvent, TradeReview, TradeReviewSummary } from "@/lib/mind-archive/types"

type PanXinPracticeReview = Pick<TradeReview, "behaviorEvidence" | "brokeRule" | "heartThief">
type PanXinSummaryReview = Pick<
  TradeReview,
  | "os"
  | "reflectionFinal"
  | "heartThief"
  | "marketContext"
  | "behaviorEvidence"
  | "followedPlan"
  | "brokeRule"
  | "heartJudgement"
  | "reviewSummary"
>

export const PAN_XIN_REPORT_VERSION = "pan_xin_he_zheng_v1"

const heartJudgementCopy: Record<HeartJudgement, { label: string; text: string }> = {
  zheng_sheng: { label: "正胜", text: "这笔既赚钱，也守住了心。" },
  zei_sheng: { label: "贼胜", text: "钱赚了，但这笔是心贼赢了。" },
  zheng_kui: { label: "正亏", text: "钱亏了，但心没有失守。" },
  shuang_shu: { label: "双输", text: "钱也亏了，心也被带走了。" },
}

export function buildPanXinPracticeSentence(params: {
  event?: Pick<OneThoughtEvent, "userReaction" | "heartThief"> | null
  review: PanXinPracticeReview
}) {
  const heartThief = params.event?.heartThief || params.review.heartThief || ""

  if (params.event?.userReaction === "still_moving" && params.review.behaviorEvidence?.addedPosition) {
    return "心还在动时，不加仓。"
  }
  if (params.review.brokeRule) {
    return "先守规则，再谈判断。"
  }
  if (heartThief.includes("急")) {
    return "给自己三分钟，不用一根 K线证明自己。"
  }
  if (heartThief.includes("贪")) {
    return "不追全，不吃尽，计划外的利润先放过。"
  }
  if (heartThief.includes("执")) {
    return "别让一笔交易替你证明规则有没有价值。"
  }

  return "先回到规则，再决定是否行动。"
}

export function buildPanXinReviewSummary(params: {
  event?: Pick<OneThoughtEvent, "userReaction" | "heartThief" | "actualAction"> | null
  review: PanXinSummaryReview
  generatedAt?: string
}): TradeReviewSummary {
  const judgement = heartJudgementCopy[params.review.heartJudgement]
  const behaviorParts = [
    params.review.followedPlan ? "按计划" : "未按计划",
    params.review.brokeRule ? "破戒" : "未破戒",
    params.review.behaviorEvidence?.changedPlanIntraday ? "临盘改计划" : "",
    params.review.behaviorEvidence?.addedPosition ? "临盘加仓" : "",
    params.review.behaviorEvidence?.movedStopLoss ? "移动止损" : "",
    params.review.behaviorEvidence?.emotionDrivenEntry ? "情绪推动入场" : "",
  ].filter(Boolean)

  return {
    version: PAN_XIN_REPORT_VERSION,
    thoughtText: `当时那一念：${params.review.os}。${params.review.reflectionFinal}`,
    marketText:
      params.review.marketContext?.summary?.finalText ||
      params.review.reviewSummary?.marketText ||
      "最终盘证：K线数据不足，已切换为手动盘证。",
    behaviorText: `当时那只手：${behaviorParts.length ? behaviorParts.join("，") : "行为证据待补充"}。`,
    judgementText: `${judgement.label}：${judgement.text}`,
    practiceText: buildPanXinPracticeSentence({ event: params.event, review: params.review }),
    generatedAt: params.generatedAt || new Date().toISOString(),
  }
}
