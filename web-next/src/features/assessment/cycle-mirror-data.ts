import type {
  DataBindingKLineRecord,
  DataBindingTrainingRecord,
  DataBindingUserSummaryResponse,
} from "../../../../packages/contracts/data-binding"
import type { MirrorName, TradeReview } from "../../../../packages/contracts/living-mirror"

import type { CycleMirrorCase, CycleNode } from "./CycleMirror"
import type { PracticeChangeState } from "./practice-change"
import type { AssessmentReport } from "./report"

type UserCycleMirrorInput = {
  report?: AssessmentReport | DataBindingUserSummaryResponse["report"] | null
  practiceState?: PracticeChangeState | null
  latestTradeReview?: TradeReview | null
  remoteSummary?: DataBindingUserSummaryResponse | null
}

type PracticeRecordLike = DataBindingTrainingRecord | PracticeChangeState["records"][number]
type KLineRecordLike = DataBindingKLineRecord | NonNullable<PracticeChangeState["records"][number]["klineRecord"]>

const mirrorCaseIdByName: Record<string, string> = {
  追涨之镜: "chasing",
  扛单之镜: "holdingLoss",
  幻想之镜: "fantasy",
  执念之镜: "gambling",
  从众之镜: "following",
  犹疑之镜: "hesitation",
  拖延之镜: "procrastination",
  焦虑之镜: "anxiety",
  良知之镜: "conscience",
}

const mirrorActionMap: Record<string, string> = {
  追涨之镜: "追涨",
  扛单之镜: "扛单",
  幻想之镜: "补故事",
  执念之镜: "加重动作",
  从众之镜: "跟随外声",
  犹疑之镜: "反复等待",
  拖延之镜: "推迟复盘",
  焦虑之镜: "提前处理",
  良知之镜: "先停再照",
}

const legacyPersonaMirrorMap: Record<string, MirrorName> = {
  冲动型: "追涨之镜",
  扛单型: "扛单之镜",
  完美型: "犹疑之镜",
  赌徒型: "执念之镜",
  从众型: "从众之镜",
  偏执型: "幻想之镜",
  拖延型: "拖延之镜",
  焦虑型: "焦虑之镜",
  平衡型: "良知之镜",
}

export function buildUserCycleMirror(input: UserCycleMirrorInput): CycleMirrorCase | null {
  const latestTradeReview = input.remoteSummary?.trade_reviews.at(-1) || input.latestTradeReview || null
  if (latestTradeReview) return buildTradeReviewCycle(latestTradeReview)

  const latestTrainingRecord = input.remoteSummary?.training_records.at(-1) || input.practiceState?.records.at(-1) || null
  const latestKLineRecord = input.remoteSummary?.kline_records.at(-1) || getPracticeKLineRecord(latestTrainingRecord)
  if (latestTrainingRecord) return buildPracticeCycle(latestTrainingRecord, latestKLineRecord)

  const report = input.remoteSummary?.report || input.report || null
  if (report) return buildReportCycle(report)

  return null
}

function buildTradeReviewCycle(review: TradeReview): CycleMirrorCase {
  const mirror = normalizeMirrorName(review.detectedMirror)
  const thought = cleanText(review.strongestThought || "这一念尚未命名。", 52)
  const trigger = inferTradeReviewTrigger(review)
  const result = inferTradeReviewResult(review, mirror)
  const retrigger = inferRetrigger(mirror, thought)
  const actionText = mirrorActionMap[mirror] || "被第一念牵动"

  return {
    id: mirrorCaseIdByName[mirror] || "chasing",
    sourceMirror: mirror,
    title: `${mirror.replace("之镜", "")}循环`,
    status: `真实复盘显影：${thought}`,
    verdict: cleanText(review.reviewText || `这次复盘照见的是${mirror}，先记录触发、念头、动作与结果。`, 92),
    practice: buildPracticeLine(mirror),
    dataSourceLabel: "来自真实交易复盘",
    sourceId: review.id,
    nodes: [
      trigger,
      makeNode("thought", "念头", thought, `你在复盘中写下的第一念是：${thought}`),
      makeNode("action", "动作", actionText, buildActionDetail(review, actionText)),
      result,
      makeNode("retrigger", "再次触发", retrigger.short, retrigger.detail),
    ],
  }
}

function buildPracticeCycle(record: PracticeRecordLike, klineRecord?: KLineRecordLike | null): CycleMirrorCase {
  const scene = cleanText(klineRecord?.scene || record.title || "今日训练场景", 56)
  const thought = cleanText(klineRecord?.reaction || getRecordCultivationText(record) || record.note || "今天最明显的一念。", 56)
  const action = cleanText(klineRecord?.disciplineAction || getRecordActions(record)[0] || "按今日动作落印。", 64)
  const mirror = inferMirrorFromText(`${scene} ${thought} ${action}`)
  const retrigger = inferRetrigger(mirror, thought)

  return {
    id: mirrorCaseIdByName[mirror] || "chasing",
    sourceMirror: mirror,
    title: "今日修行循环",
    status: `今日修行显影：${thought}`,
    verdict: "这不是演示链路，而是你今天留下的训练证据。",
    practice: buildPracticeLine(mirror),
    dataSourceLabel: "来自今日修行",
    sourceId: getRecordSourceId(record),
    nodes: [
      makeNode("trigger", "触发", scene, `今天的训练场景是：${scene}`),
      makeNode("thought", "念头", thought, `你今天照见的念头是：${thought}`),
      makeNode("action", "动作", action, `你留下的训练动作是：${action}`),
      makeNode("result", "结果", "已落印。", "今日心证已经进入活镜成长，后续复盘会继续补足结果。"),
      makeNode("retrigger", "再次触发", retrigger.short, retrigger.detail),
    ],
  }
}

function buildReportCycle(report: AssessmentReport | DataBindingUserSummaryResponse["report"]): CycleMirrorCase {
  const mainMirror = normalizeMirrorName(getReportMirrorName(report))
  const trigger = cleanText(report?.emotionalTriggers?.[0]?.description || "行情突然拉升，第一念浮上来。", 60)
  const thought = cleanText(report?.firstThoughtDisplay || report?.firstThought || report?.conclusion || "再不上车来不及了。", 56)
  const action = mirrorActionMap[mainMirror] || "按旧反应行动"
  const retrigger = inferRetrigger(mainMirror, thought)

  return {
    id: mirrorCaseIdByName[mainMirror] || "chasing",
    sourceMirror: mainMirror,
    title: "心镜报告循环",
    status: `报告基线显影：${thought}`,
    verdict: cleanText(report?.conclusion || "心镜报告已经给出基线，真实复盘会让循环更具体。", 92),
    practice: cleanText(report?.trainingDirection || buildPracticeLine(mainMirror), 88),
    dataSourceLabel: "来自心镜报告",
    sourceId: report?.reportId,
    nodes: [
      makeNode("trigger", "触发", trigger, `心镜报告中记录的情绪触发是：${trigger}`),
      makeNode("thought", "念头", thought, `报告里浮现的真实念头是：${thought}`),
      makeNode("action", "动作", action, `这面心镜最容易把念头带向「${action}」。`),
      makeNode("result", "结果", "等待真实复盘补全。", "完成一次真实交易复盘后，这里会替换为你的真实结果。"),
      makeNode("retrigger", "再次触发", retrigger.short, retrigger.detail),
    ],
  }
}

function inferTradeReviewTrigger(review: TradeReview): CycleNode {
  const sourceText = `${review.buyReason} ${review.sellReason} ${review.strongestThought}`
  if (/群|大家都在说|大家|直播|朋友|消息|外部/.test(sourceText)) {
    return makeNode("trigger", "触发", "群里都在说。", "外部声音变热闹时，你的原计划开始被拉扯。")
  }

  if (/拉升|冲高|上车|错过|追/.test(sourceText)) {
    return makeNode("trigger", "触发", "价格突然拉升。", "计划还没重新确认，怕错过已经先出现。")
  }

  if (/亏|回本|翻本|不甘/.test(sourceText)) {
    return makeNode("trigger", "触发", "刚经历一笔不舒服的结果。", "上一笔留下的情绪开始影响下一步。")
  }

  if (/止损|破位|边界|不认错/.test(sourceText)) {
    return makeNode("trigger", "触发", "边界被触碰。", "原计划已经提醒你，但心里仍想重新解释。")
  }

  return makeNode("trigger", "触发", cleanText(review.buyReason || "真实交易场景出现。", 42), `进入时的自述是：${cleanText(review.buyReason || "未补充", 96)}`)
}

function inferTradeReviewResult(review: TradeReview, mirror: MirrorName): CycleNode {
  const sellReason = cleanText(review.sellReason || "", 72)

  if (/被套|套住|回落|亏|亏损|不认错/.test(sellReason)) {
    return makeNode("result", "结果", "被套。", `你在复盘中记录的结果是：${sellReason}`)
  }

  if (/怕回吐|提前|先走|卖早/.test(sellReason)) {
    return makeNode("result", "结果", "提前处理。", `你在复盘中记录的结果是：${sellReason}`)
  }

  if (sellReason) {
    return makeNode("result", "结果", shortSentence(sellReason), `你在复盘中记录的结果是：${sellReason}`)
  }

  return makeNode("result", "结果", mirror === "追涨之镜" ? "被波动牵住。" : "结果已进入复盘。", "结果不用于评判对错，只用于看见反应模式。")
}

function buildActionDetail(review: TradeReview, actionText: string) {
  const buyReason = cleanText(review.buyReason || "", 110)
  if (!buyReason) return `这一步呈现为：${actionText}。`
  return `进入时的自述是：${buyReason}`
}

function inferRetrigger(mirror: MirrorName, thought: string) {
  if (mirror === "追涨之镜" || /错过|上车|追|拉升/.test(thought)) {
    return {
      short: "更怕错过。",
      detail: "如果这次没有被复盘照见，下一次外部热闹或价格拉升时，怕错过会更快接管动作。",
    }
  }

  if (mirror === "从众之镜") {
    return {
      short: "更想听答案。",
      detail: "如果没有先写下自己的判断，下一次外部声音出现时，主见会再次被交出去。",
    }
  }

  if (mirror === "扛单之镜") {
    return {
      short: "更不想认错。",
      detail: "如果边界触发后继续解释，下一次面对失效条件时会更难执行。",
    }
  }

  if (mirror === "执念之镜") {
    return {
      short: "更想翻回。",
      detail: "如果把上一笔情绪带到下一笔，循环会变成用行动修复不甘。",
    }
  }

  if (mirror === "焦虑之镜") {
    return {
      short: "更怕失去。",
      detail: "如果只处理不安而不看规则，下一次波动里焦虑会更早抢走方向。",
    }
  }

  return {
    short: "同一念头再来。",
    detail: "没有被记录的循环，会在相似场景里以新的理由回来。",
  }
}

function buildPracticeLine(mirror: MirrorName) {
  if (mirror === "追涨之镜") return "今日只练一件事：计划外拉升前，先停十秒，再写入场条件。"
  if (mirror === "从众之镜") return "今日只练一件事：听到外部声音后，先写自己的判断。"
  if (mirror === "扛单之镜") return "今日只练一件事：边界触发后，不解释，只记录并执行原计划。"
  if (mirror === "执念之镜") return "今日只练一件事：上一笔情绪未落定前，不急着开始下一笔。"
  if (mirror === "焦虑之镜") return "今日只练一件事：怕回吐出现时，先回看原计划。"
  return "今日只练一件事：念头出现时，先照见，再复盘。"
}

function inferMirrorFromText(text: string): MirrorName {
  if (/怕错过|错过|上车|拉升|追|冲动|来不及/.test(text)) return "追涨之镜"
  if (/群|大家|别人|外部|消息|问/.test(text)) return "从众之镜"
  if (/不认错|不甘|扛|止损|边界/.test(text)) return "扛单之镜"
  if (/翻本|赌|回本|报复/.test(text)) return "执念之镜"
  if (/怕回吐|焦虑|空仓|恐慌|紧张/.test(text)) return "焦虑之镜"
  if (/等待|犹豫|回撤|不确定/.test(text)) return "犹疑之镜"
  if (/拖延|明天|以后|复盘/.test(text)) return "拖延之镜"
  if (/幻想|证明|故事|执念/.test(text)) return "幻想之镜"
  if (/良知|纪律|守住|知行/.test(text)) return "良知之镜"
  return "追涨之镜"
}

function normalizeMirrorName(value?: string): MirrorName {
  if (value && mirrorCaseIdByName[value]) return value as MirrorName
  if (value && legacyPersonaMirrorMap[value]) return legacyPersonaMirrorMap[value]
  return inferMirrorFromText(value || "")
}

function getReportMirrorName(report: AssessmentReport | DataBindingUserSummaryResponse["report"]) {
  return report?.primaryPersonality?.poeticName || report?.primaryType?.poeticName || report?.primaryType?.label || "追涨之镜"
}

function getPracticeKLineRecord(record?: PracticeRecordLike | null): KLineRecordLike | null {
  if (!record || !("klineRecord" in record)) return null
  return record.klineRecord || null
}

function getRecordCultivationText(record: PracticeRecordLike) {
  return record.cultivationText || ""
}

function getRecordActions(record: PracticeRecordLike) {
  return Array.isArray(record.actions) ? record.actions : []
}

function getRecordSourceId(record: PracticeRecordLike) {
  return `${record.dateKey || record.recordedAt || "daily-growth"}-${record.day || 1}`
}

function makeNode(key: CycleNode["key"], title: string, short: string, detail: string): CycleNode {
  return {
    key,
    title,
    short: shortSentence(short),
    detail: cleanText(detail, 120),
  }
}

function shortSentence(value: string) {
  const cleaned = cleanText(value, 34)
  if (!cleaned) return "待记录。"
  return /[。！？.!?]$/.test(cleaned) ? cleaned : `${cleaned}。`
}

function cleanText(value: string | undefined, maxLength = 80) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
}
