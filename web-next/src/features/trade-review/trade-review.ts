import type { HeartThief, MirrorName, TradeReview } from "@yangming/contracts/living-mirror"

export type TradeReviewDraft = {
  imageUrl: string
  imageName: string
  tradeDate: string
  marketType: string
  symbolMasked: string
  buyReason: string
  sellReason: string
  strongestThought: string
}

export type TradeReviewMapping = {
  detectedMirror: MirrorName
  detectedThieves: HeartThief[]
  behaviorTags: string[]
  reviewText: string
  nextPracticeText: string
}

export const tradeReviewStorageKey = "ym_trade_review_draft_v1"
export const tradeReviewLastResultStorageKey = "ym_trade_review_last_result_v1"
export const tradeReviewApiEndpoint = "POST /api/v1/data-binding/users/:user_id/trade-reviews"

export const initialTradeReviewDraft: TradeReviewDraft = {
  imageUrl: "",
  imageName: "",
  tradeDate: "",
  marketType: "other",
  symbolMasked: "",
  buyReason: "",
  sellReason: "",
  strongestThought: "",
}

export const marketTypeOptions = [
  { value: "a_share", label: "A 股" },
  { value: "us_stock", label: "美股" },
  { value: "crypto", label: "加密" },
  { value: "futures", label: "期货" },
  { value: "forex", label: "外汇" },
  { value: "fund", label: "基金" },
  { value: "other", label: "其他" },
]

export const reviewQuestionPrompts = {
  buyReason: "为什么进入？",
  sellReason: "为什么离开？",
  strongestThought: "当时最大的念头是什么？",
}

export function createEmptyTradeReviewDraft(): TradeReviewDraft {
  return {
    ...initialTradeReviewDraft,
    tradeDate: new Date().toISOString().slice(0, 10),
  }
}

export function canSubmitTradeReview(draft: TradeReviewDraft) {
  return Boolean(
    draft.imageUrl &&
      draft.buyReason.trim().length >= 2 &&
      draft.sellReason.trim().length >= 2 &&
      draft.strongestThought.trim().length >= 2,
  )
}

export function inferTradeReviewMapping(draft: Pick<TradeReviewDraft, "buyReason" | "sellReason" | "strongestThought">): TradeReviewMapping {
  const text = `${draft.buyReason} ${draft.sellReason} ${draft.strongestThought}`
  const detectedMirror = inferTradeReviewMirror(text)
  const detectedThieves = inferHeartThieves(text, detectedMirror)
  const behaviorTags = buildBehaviorTags(detectedMirror, text)
  const reviewText = buildReviewText(detectedMirror, detectedThieves, draft.strongestThought)

  return {
    detectedMirror,
    detectedThieves,
    behaviorTags,
    reviewText,
    nextPracticeText: buildNextPracticeText(detectedMirror),
  }
}

export function buildTradeReviewPayload(draft: TradeReviewDraft): Partial<TradeReview> {
  const mapping = inferTradeReviewMapping(draft)

  return {
    imageUrl: draft.imageUrl,
    tradeDate: draft.tradeDate,
    symbolMasked: maskSymbol(draft.symbolMasked),
    marketType: draft.marketType,
    buyReason: draft.buyReason.trim(),
    sellReason: draft.sellReason.trim(),
    strongestThought: draft.strongestThought.trim(),
    detectedMirror: mapping.detectedMirror,
    detectedThieves: mapping.detectedThieves,
    behaviorTags: mapping.behaviorTags,
    reviewText: mapping.reviewText,
  }
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

function inferHeartThieves(text: string, mirror: MirrorName): HeartThief[] {
  const thieves: HeartThief[] = []
  if (/怕错过|错过|上车|追|拉升/.test(text) || mirror === "追涨之镜") thieves.push("贪", "急")
  if (/焦虑|怕回吐|恐慌|空仓|害怕/.test(text) || mirror === "焦虑之镜") thieves.push("惧")
  if (/不认错|不甘|扛|幻想|执念/.test(text) || mirror === "扛单之镜" || mirror === "幻想之镜") thieves.push("痴")
  if (/大家都在说|别人|大家|问|外部|消息/.test(text) || mirror === "从众之镜") thieves.push("疑")
  if (/拖延|麻木/.test(text) || mirror === "拖延之镜") thieves.push("昧")
  if (/纪律|良知|守住|知行/.test(text) || mirror === "良知之镜") thieves.push("守心")
  return Array.from(new Set(thieves)).slice(0, 4)
}

function buildBehaviorTags(mirror: MirrorName, text: string) {
  const tags = [mirror.replace("之镜", "")]
  if (/截图|K线|交易记录/.test(text)) tags.push("截图复盘")
  if (/怕错过|追|拉升/.test(text)) tags.push("怕错过")
  if (/翻本|报复/.test(text)) tags.push("想翻本")
  if (/不认错|扛/.test(text)) tags.push("不认错")
  if (/大家|别人|外部/.test(text)) tags.push("外部声音")
  return Array.from(new Set(tags)).slice(0, 6)
}

function buildReviewText(mirror: MirrorName, thieves: HeartThief[], strongestThought: string) {
  const thought = strongestThought.trim() || "第一念"
  const thiefText = thieves.length ? thieves.join(" / ") : "待继续观察"
  return `这次复盘照见的是${mirror}，最明显的一念是「${thought}」，心贼显影为${thiefText}。先记录触发与反应，再回到训练动作。`
}

function buildNextPracticeText(mirror: MirrorName) {
  if (mirror === "追涨之镜") return "下一次计划外拉升前，先停十秒，再写下入场条件。"
  if (mirror === "赌性之镜") return "下一次想翻本时，先写下这是不是情绪在替你行动。"
  if (mirror === "扛单之镜") return "下一次边界被触碰时，先记录不甘，再回看原计划。"
  if (mirror === "焦虑之镜") return "下一次怕回吐时，先写下真正害怕失去的是什么。"
  if (mirror === "从众之镜") return "下一次看外部信息前，先写下自己的判断。"
  if (mirror === "犹疑之镜") return "下一次等待前，写清楚等待条件。"
  if (mirror === "拖延之镜") return "下一次想以后再说时，只记录一条当下事实。"
  if (mirror === "幻想之镜") return "下一次想证明自己时，先分清事实和故事。"
  return "下一次念头出现时，先停一息，记录，再复盘。"
}

function maskSymbol(value: string) {
  const raw = value.trim()
  if (!raw) return ""
  if (raw.includes("*")) return raw.slice(0, 40)
  if (raw.length <= 2) return "**"
  return `${"*".repeat(Math.min(6, raw.length - 2))}${raw.slice(-2)}`
}
