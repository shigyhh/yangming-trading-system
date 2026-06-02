import { getStorage, setStorage } from "@/features/assessment/storage"
import type { HeartThief, MirrorName, TradeReview } from "../../../../packages/contracts/living-mirror"

export type TradeReviewMarketType = "stock" | "futures" | "forex" | "crypto" | "other"
export type TradeReviewDirection = "buy" | "sell" | "close" | "observe"
export type TradeReviewResultOptional = "profit" | "loss" | "flat" | "not_disclosed"
export type TradeReviewThoughtType =
  | "fomo"
  | "revenge"
  | "fear"
  | "ego"
  | "ask_others"
  | "hesitation"
  | "none"
export type TradeReviewPostReaction = "regret" | "relief" | "anger" | "numb" | "clear" | "other"

export type TradeReviewDraft = {
  imageUrl: string
  imageName: string
  tradeDate: string
  marketType: TradeReviewMarketType
  direction: TradeReviewDirection
  resultOptional: TradeReviewResultOptional
  wasPlanned: boolean | null
  strongestThought: TradeReviewThoughtType | null
  emotionIntensity: number
  hadExitRule: boolean | null
  changedPlanDuringTrade: boolean | null
  postTradeReaction: TradeReviewPostReaction | null
  exposedRisk: string
  nextAction: string
}

export type TradeReviewMapping = {
  detectedMirror: MirrorName
  detectedThieves: HeartThief[]
  behaviorTags: string[]
  reviewText: string
  proofText: string
  nextActionText: string
  affectedDimensions: string[]
}

export const tradeReviewStorageKey = "ym_trade_review_draft_v1"
export const tradeReviewLastResultStorageKey = "ym_trade_review_last_result_v1"
export const tradeReviewHistoryStorageKey = "ym_trade_review_history_v1"
export const tradeReviewApiEndpoint = "POST /api/v1/data-binding/users/:user_id/trade-reviews"
export const tradeReviewComplianceText = "仅用于交易行为训练记录，不构成任何投资建议。"

export const initialTradeReviewDraft: TradeReviewDraft = {
  imageUrl: "",
  imageName: "",
  tradeDate: "",
  marketType: "other",
  direction: "observe",
  resultOptional: "not_disclosed",
  wasPlanned: null,
  strongestThought: null,
  emotionIntensity: 50,
  hadExitRule: null,
  changedPlanDuringTrade: null,
  postTradeReaction: null,
  exposedRisk: "",
  nextAction: "",
}

export const marketTypeOptions: Array<{ value: TradeReviewMarketType; label: string }> = [
  { value: "stock", label: "股票" },
  { value: "futures", label: "期货" },
  { value: "forex", label: "外汇" },
  { value: "crypto", label: "加密" },
  { value: "other", label: "其他" },
]

export const directionOptions: Array<{ value: TradeReviewDirection; label: string }> = [
  { value: "buy", label: "买入" },
  { value: "sell", label: "卖出" },
  { value: "close", label: "平仓" },
  { value: "observe", label: "观望" },
]

export const resultOptions: Array<{ value: TradeReviewResultOptional; label: string }> = [
  { value: "not_disclosed", label: "不填写" },
  { value: "profit", label: "盈" },
  { value: "loss", label: "亏" },
  { value: "flat", label: "持平" },
]

export const thoughtOptions: Array<{ value: TradeReviewThoughtType; label: string; description: string }> = [
  { value: "fomo", label: "怕错过", description: "计划外拉升时，念头想先于规则行动。" },
  { value: "revenge", label: "想翻本", description: "上一笔的不甘，想接管下一笔。" },
  { value: "fear", label: "害怕失去", description: "担心回吐、空仓或再次受伤。" },
  { value: "ego", label: "想证明", description: "不是事实在催促，而是自我在要求证明。" },
  { value: "ask_others", label: "想问别人", description: "外部声音想替代自己的判断。" },
  { value: "hesitation", label: "犹豫不决", description: "条件不清，行动被来回拉扯。" },
  { value: "none", label: "念头不明", description: "还没看清是谁在下单，先如实记录。" },
]

export const postReactionOptions: Array<{ value: TradeReviewPostReaction; label: string }> = [
  { value: "regret", label: "后悔" },
  { value: "relief", label: "松一口气" },
  { value: "anger", label: "生气" },
  { value: "numb", label: "麻木" },
  { value: "clear", label: "清楚" },
  { value: "other", label: "其他" },
]

export const reviewQuestionPrompts = {
  wasPlanned: "这笔交易是否在原计划内？",
  strongestThought: "下单前最强的一念是什么？",
  emotionIntensity: "下单时情绪强度是多少？",
  hadExitRule: "是否提前写过止损/离场条件？",
  changedPlanDuringTrade: "是否临盘改计划？",
  postTradeReaction: "交易后第一反应是什么？",
  exposedRisk: "这笔交易暴露了哪个人格风险？",
  nextAction: "下一次同场景你要先做什么？",
}

export function createEmptyTradeReviewDraft(): TradeReviewDraft {
  return {
    ...initialTradeReviewDraft,
    tradeDate: new Date().toISOString().slice(0, 10),
  }
}

export function loadTradeReviewHistory() {
  return getStorage<TradeReview[]>(tradeReviewHistoryStorageKey, [])
}

export function upsertTradeReviewHistory(reviews: TradeReview | TradeReview[]) {
  const incoming = Array.isArray(reviews) ? reviews : [reviews]
  const reviewMap = new Map<string, TradeReview>()

  ;[...loadTradeReviewHistory(), ...incoming].forEach((review) => {
    const reviewId = review.reviewId || review.id
    if (!reviewId) return
    reviewMap.set(reviewId, {
      ...review,
      id: review.id || reviewId,
      reviewId,
    })
  })

  const nextReviews = Array.from(reviewMap.values())
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  setStorage(tradeReviewHistoryStorageKey, nextReviews)
  return nextReviews
}

export function canSubmitTradeReview(draft: TradeReviewDraft) {
  return Boolean(
    draft.wasPlanned !== null &&
      draft.strongestThought &&
      draft.hadExitRule !== null &&
      draft.changedPlanDuringTrade !== null &&
      draft.postTradeReaction &&
      draft.exposedRisk.trim().length >= 2 &&
      draft.nextAction.trim().length >= 2,
  )
}

export function inferTradeReviewMapping(draft: Pick<TradeReviewDraft, "strongestThought" | "exposedRisk" | "nextAction" | "changedPlanDuringTrade">): TradeReviewMapping {
  const thoughtType = draft.strongestThought || "none"
  const detectedMirror = getTradeReviewMirror(thoughtType, draft.exposedRisk)
  const detectedThieves = getTradeReviewThieves(thoughtType)
  const behaviorTags = buildBehaviorTags(draft)

  return {
    detectedMirror,
    detectedThieves,
    behaviorTags,
    reviewText: buildReviewText(thoughtType, detectedMirror, detectedThieves, draft.exposedRisk),
    proofText: buildTradeReviewProofText(thoughtType),
    nextActionText: buildTradeReviewNextActionText(thoughtType, draft.nextAction),
    affectedDimensions: getTradeReviewAffectedDimensions(thoughtType),
  }
}

export function buildTradeReviewPayload(
  draft: TradeReviewDraft,
  options: { reviewId?: string; userId?: string; createdAt?: string } = {},
): Partial<TradeReview> {
  const mapping = inferTradeReviewMapping(draft)
  const createdAt = options.createdAt || new Date().toISOString()
  const reviewId = options.reviewId || makeLocalId("trade_review")

  return {
    id: reviewId,
    reviewId,
    userId: options.userId || "",
    imageUrl: draft.imageUrl,
    tradeDate: draft.tradeDate || createdAt.slice(0, 10),
    marketType: draft.marketType,
    buyReason: buildBuyReason(draft),
    sellReason: buildSellReason(draft),
    strongestThought: getTradeReviewThoughtLabel(draft.strongestThought),
    detectedMirror: mapping.detectedMirror,
    detectedThieves: mapping.detectedThieves,
    behaviorTags: mapping.behaviorTags,
    reviewText: mapping.reviewText,
    wasPlanned: draft.wasPlanned,
    emotionIntensity: draft.emotionIntensity,
    hadExitRule: draft.hadExitRule,
    changedPlanDuringTrade: draft.changedPlanDuringTrade,
    postTradeReaction: draft.postTradeReaction,
    exposedRisk: draft.exposedRisk.trim(),
    nextAction: draft.nextAction.trim(),
    resultOptional: draft.resultOptional,
    direction: draft.direction,
    createdAt,
  }
}

export function getTradeReviewThoughtLabel(value?: TradeReviewThoughtType | string | null) {
  if (!value) return "念头不明"
  return thoughtOptions.find((option) => option.value === value)?.label || String(value)
}

export function getTradeReviewPostReactionLabel(value?: TradeReviewPostReaction | string | null) {
  if (!value) return "待记录"
  return postReactionOptions.find((option) => option.value === value)?.label || String(value)
}

export function buildTradeReviewProofText(thoughtType: TradeReviewThoughtType | string | null) {
  if (thoughtType === "fomo") {
    return "这笔交易照见的是：怕错过。真正的问题不是行情快，而是计划外拉升时，念头先于规则行动。"
  }

  if (thoughtType === "revenge") {
    return "这笔交易照见的是：想翻本。真正的问题不是上一笔亏损，而是你让亏损后的不甘接管了下一笔。"
  }

  if (thoughtType === "ask_others") {
    return "这笔交易照见的是：想问别人。外部信息可以参考，但不能替你完成判断。"
  }

  if (thoughtType === "fear") {
    return "这笔交易照见的是：害怕失去。真正需要复盘的不是结果，而是恐惧如何让动作变形。"
  }

  if (thoughtType === "ego") {
    return "这笔交易照见的是：想证明。真正需要看见的不是对错，而是自我如何抢在计划前面。"
  }

  if (thoughtType === "hesitation") {
    return "这笔交易照见的是：犹豫不决。犹豫不是错误，条件不清才会让念头反复拉扯。"
  }

  return "这笔交易照见的是：念头尚未明。先如实记录，下一次更早看见是谁在行动。"
}

export function buildTradeReviewNextActionText(thoughtType: TradeReviewThoughtType | string | null, fallback?: string) {
  if (thoughtType === "fomo") return "下一次只练一个动作：先停十秒，再看是否在原计划内。"
  if (thoughtType === "revenge") return "下一次只练一个动作：亏损后先离开屏幕三分钟。"
  if (thoughtType === "ask_others") return "下一次先写下自己的方向和理由。"
  if (thoughtType === "fear") return "下一次先写下自己害怕失去的是什么。"
  if (thoughtType === "ego") return "下一次先区分事实变化和自我证明。"
  if (thoughtType === "hesitation") return "下一次先写清楚等待条件，条件未到只观察。"
  return fallback?.trim() || "下一次先停一息，记录念头，再回看计划。"
}

export function getTradeReviewAffectedDimensions(thoughtType: TradeReviewThoughtType | string | null) {
  if (thoughtType === "fomo") return ["追涨冲动", "临盘改计划"]
  if (thoughtType === "revenge") return ["赌性冲动", "知行合一"]
  if (thoughtType === "ask_others") return ["独立判断", "知行合一"]
  if (thoughtType === "fear") return ["空仓焦虑", "止损执行"]
  if (thoughtType === "ego") return ["自我证明", "临盘改计划"]
  if (thoughtType === "hesitation") return ["犹疑拖延", "计划一致性"]
  return ["觉察能力"]
}

function getTradeReviewMirror(thoughtType: TradeReviewThoughtType, exposedRisk: string): MirrorName {
  if (thoughtType === "fomo") return "追涨之镜"
  if (thoughtType === "revenge") return "赌性之镜"
  if (thoughtType === "fear") return "焦虑之镜"
  if (thoughtType === "ego") return "幻想之镜"
  if (thoughtType === "ask_others") return "从众之镜"
  if (thoughtType === "hesitation") return "犹疑之镜"
  return inferTradeReviewMirror(exposedRisk)
}

export function inferTradeReviewMirror(text: string): MirrorName {
  if (/怕错过|错过|上车|拉升|追|冲动|来不及/.test(text)) return "追涨之镜"
  if (/翻本|赢回来|报复|赌|梭/.test(text)) return "赌性之镜"
  if (/不认错|不甘|扛|止损|边界/.test(text)) return "扛单之镜"
  if (/怕回吐|焦虑|恐慌|空仓|紧张|害怕/.test(text)) return "焦虑之镜"
  if (/大家都在说|大家|别人|群|消息|外部|问/.test(text)) return "从众之镜"
  if (/等回撤|等待|犹豫|不确定|观望/.test(text)) return "犹疑之镜"
  if (/拖延|麻木|明天|以后/.test(text)) return "拖延之镜"
  if (/幻想|证明|一定会|执念/.test(text)) return "幻想之镜"
  if (/纪律|良知|守住|知行/.test(text)) return "良知之镜"
  return "追涨之镜"
}

function getTradeReviewThieves(thoughtType: TradeReviewThoughtType): HeartThief[] {
  if (thoughtType === "fomo") return ["贪", "急"]
  if (thoughtType === "revenge") return ["贪", "痴"]
  if (thoughtType === "fear") return ["惧"]
  if (thoughtType === "ego") return ["痴"]
  if (thoughtType === "ask_others") return ["疑"]
  if (thoughtType === "hesitation") return ["疑"]
  return ["守心"]
}

function buildBehaviorTags(draft: Pick<TradeReviewDraft, "strongestThought" | "changedPlanDuringTrade" | "exposedRisk">) {
  const tags = [
    getTradeReviewThoughtLabel(draft.strongestThought),
    ...getTradeReviewAffectedDimensions(draft.strongestThought),
  ]

  if (draft.changedPlanDuringTrade) tags.push("临盘改计划")
  if (draft.exposedRisk.trim()) tags.push(draft.exposedRisk.trim())

  return Array.from(new Set(tags)).filter(Boolean).slice(0, 6)
}

function buildReviewText(
  thoughtType: TradeReviewThoughtType,
  mirror: MirrorName,
  thieves: HeartThief[],
  exposedRisk: string,
) {
  const thought = getTradeReviewThoughtLabel(thoughtType)
  const thiefText = thieves.length ? thieves.join(" / ") : "待继续观察"
  const riskText = exposedRisk.trim() || "待继续观察的人格风险"

  return `这次真实交易复盘照见的是${mirror}，下单前最强的一念是「${thought}」，心贼显影为${thiefText}。暴露的风险是：${riskText}。本次只记录谁在下单，不评价行情对错。`
}

function buildBuyReason(draft: TradeReviewDraft) {
  const plannedText = draft.wasPlanned ? "在原计划内" : "不在原计划内"
  return `${plannedText}；下单前最强一念：${getTradeReviewThoughtLabel(draft.strongestThought)}；情绪强度：${draft.emotionIntensity}/100。`
}

function buildSellReason(draft: TradeReviewDraft) {
  const exitText = draft.hadExitRule ? "提前写过止损/离场条件" : "没有提前写清止损/离场条件"
  const changeText = draft.changedPlanDuringTrade ? "临盘改过计划" : "未临盘改计划"
  return `${exitText}；${changeText}；交易后第一反应：${getTradeReviewPostReactionLabel(draft.postTradeReaction)}；下一步动作：${draft.nextAction.trim()}。`
}

function makeLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}
