import { buildUserCycleMirror } from "@/features/assessment/cycle-mirror-data"
import { getStorage, setStorage } from "@/features/assessment/storage"
import type { CycleMirrorCase, CycleNode } from "@/features/assessment/CycleMirror"
import type { HeartProof } from "@/features/heart-proof/heartProofTypes"
import type { TradeReview } from "../../../../packages/contracts/living-mirror"

import type { BehaviorLoop, BehaviorLoopEvidenceSource } from "./behaviorLoopTypes"

export const behaviorLoopStorageKey = "ym_behavior_loops_v1"
export const latestBehaviorLoopStorageKey = "ym_latest_behavior_loop_v1"
export const behaviorLoopComplianceText = "仅用于交易行为复盘与心理训练，不构成任何投资建议。"

const mirrorCaseIdByName: Record<string, string> = {
  追涨之镜: "chasing",
  扛单之镜: "holdingLoss",
  幻想之镜: "fantasy",
  赌性之镜: "gambling",
  从众之镜: "following",
  犹疑之镜: "hesitation",
  拖延之镜: "procrastination",
  焦虑之镜: "anxiety",
  良知之镜: "conscience",
}

export function loadBehaviorLoops() {
  return getStorage<BehaviorLoop[]>(behaviorLoopStorageKey, [])
}

export function loadLatestBehaviorLoop() {
  return getStorage<BehaviorLoop | null>(latestBehaviorLoopStorageKey, null)
}

export function saveBehaviorLoop(loop: BehaviorLoop) {
  const storedLoops = loadBehaviorLoops()
  const loopSignature = getLoopStorageSignature(loop)
  const existing = storedLoops.find((item) => item.behaviorLoopId === loop.behaviorLoopId || getLoopStorageSignature(item) === loopSignature)
  const merged = mergeBehaviorLoop(existing, loop)
  const loops = recalculateRepeatCounts([
    ...storedLoops.filter((item) => item.behaviorLoopId !== loop.behaviorLoopId && getLoopStorageSignature(item) !== loopSignature),
    merged,
  ]).sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
  const saved = loops.find((item) => item.behaviorLoopId === merged.behaviorLoopId) || merged

  setStorage(behaviorLoopStorageKey, loops)
  setStorage(latestBehaviorLoopStorageKey, saved)
  return saved
}

export function getBehaviorLoopsForUser(userIdOrAnonymousId: string) {
  const owner = String(userIdOrAnonymousId || "").trim()
  if (!owner) return []

  return loadBehaviorLoops()
    .filter((loop) => loop.userId === owner || loop.anonymousId === owner)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
}

export function upsertBehaviorLoops(loops: BehaviorLoop[] = []) {
  const storedLoops = loadBehaviorLoops()
  const loopMap = new Map<string, BehaviorLoop>()

  storedLoops.forEach((loop) => {
    loopMap.set(getLoopStorageSignature(loop), normalizeBehaviorLoop(loop))
  })

  loops.forEach((loop) => {
    const signature = getLoopStorageSignature(loop)
    loopMap.set(signature, mergeBehaviorLoop(loopMap.get(signature), loop))
  })

  const nextLoops = recalculateRepeatCounts(Array.from(loopMap.values()))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())

  setStorage(behaviorLoopStorageKey, nextLoops)
  setStorage(latestBehaviorLoopStorageKey, nextLoops[0] || null)

  return nextLoops
}

export function getBehaviorLoopById(behaviorLoopId: string) {
  const id = String(behaviorLoopId || "").trim()
  if (!id) return null

  return loadBehaviorLoops().find((loop) => loop.behaviorLoopId === id || loop.behavior_loop_id === id || loop.id === id) || null
}

export function clearBehaviorLoopsForDev() {
  setStorage(behaviorLoopStorageKey, [])
  setStorage(latestBehaviorLoopStorageKey, null)
}

export function ensureBehaviorLoopFromTradeReview(review: TradeReview | null | undefined) {
  if (!review) return null

  const loop = buildBehaviorLoopFromTradeReview(review)
  return saveBehaviorLoop(loop)
}

export function ensureBehaviorLoopFromHeartProof(proof: HeartProof | null | undefined) {
  if (!proof) return null

  return saveBehaviorLoop(buildBehaviorLoopFromHeartProof(proof))
}

export function ensureBehaviorLoopsFromHeartProofs(proofs: HeartProof[] = []) {
  return proofs
    .map((proof) => ensureBehaviorLoopFromHeartProof(proof))
    .filter((loop): loop is BehaviorLoop => Boolean(loop))
}

export function buildBehaviorLoopFromTradeReview(review: TradeReview): BehaviorLoop {
  const sourceId = review.id || review.reviewId || `trade_review_${review.createdAt || Date.now()}`
  const createdAt = review.createdAt || new Date().toISOString()
  const behaviorLoopId = `behavior_loop_${sourceId}`
  const cycle = buildUserCycleMirror({ latestTradeReview: review })
  const trigger = getCycleNode(cycle, "trigger")
  const thought = getCycleNode(cycle, "thought")
  const action = getCycleNode(cycle, "action")
  const result = getCycleNode(cycle, "result")
  const retrigger = getCycleNode(cycle, "retrigger")

  return {
    id: behaviorLoopId,
    behavior_loop_id: behaviorLoopId,
    behaviorLoopId,
    userId: review.userId || undefined,
    anonymousId: review.anonymousId || review.userId || "local-anonymous",
    sourceType: "trade_review",
    sourceId,
    sourceMirror: cycle?.sourceMirror || review.detectedMirror || "追涨之镜",
    trigger: trigger.short,
    thought: thought.short,
    action: action.short,
    result: result.short,
    selfStory: cycle?.verdict || review.reviewText || "这次复盘先照见触发、念头、动作与结果。",
    repeatCount: 1,
    affectedDimensions: inferReviewAffectedDimensions(review, cycle?.sourceMirror),
    repeatRisk: retrigger.detail,
    loopBreakAction: cycle?.practice || review.nextAction || "下一次同场景，先照见念头，再回到规则。",
    evidenceIds: [`trade_review:${sourceId}`],
    evidenceSources: [
      {
        sourceType: "trade_review",
        sourceId,
        label: "真实交易复盘",
        createdAt,
      },
    ],
    createdAt,
    updatedAt: new Date().toISOString(),
    complianceText: behaviorLoopComplianceText,
  }
}

export function buildBehaviorLoopFromHeartProof(proof: HeartProof): BehaviorLoop {
  const sourceId = proof.sourceId || proof.heartProofId
  const behaviorLoopId = `behavior_loop_${sourceId}`
  const createdAt = proof.createdAt || new Date().toISOString()
  const thought = proof.thoughtLabel || proof.thoughtType || "今日一念"
  const sourceMirror = inferMirrorFromText(`${thought} ${proof.affectedDimensions.join(" ")} ${proof.proofText}`)
  const isReviewProof = proof.sourceType === "trade_review"

  return {
    id: behaviorLoopId,
    behavior_loop_id: behaviorLoopId,
    behaviorLoopId,
    userId: proof.userId || undefined,
    anonymousId: proof.anonymousId || proof.userId || "local-anonymous",
    sourceType: "heart_proof",
    sourceId,
    sourceMirror,
    trigger: isReviewProof ? "真实交易复盘触发。" : "今日修行触发。",
    thought: shortSentence(thought),
    action: cleanText(proof.nextActionText || proof.behaviorType || "把念头落成一条可复盘的动作。", 48),
    result: isReviewProof ? "复盘心证已生成。" : "今日心证已落印。",
    selfStory: cleanText(proof.proofText || proof.reflectionText || "这枚心证记录了当时的一念与下一步动作。", 120),
    repeatCount: 1,
    affectedDimensions: uniqueStrings(proof.affectedDimensions.length ? proof.affectedDimensions : [String(sourceMirror)]),
    repeatRisk: "如果这枚心证不进入复盘，同一念头会在相似场景中换一个理由回来。",
    loopBreakAction: cleanText(proof.nextActionText || "下一次同场景，先照见念头，再回到规则。", 88),
    evidenceIds: [`heart_proof:${proof.heartProofId}`],
    evidenceSources: [
      {
        sourceType: "heart_proof",
        sourceId: proof.heartProofId,
        label: isReviewProof ? "复盘心证" : "今日心证",
        createdAt,
      },
    ],
    createdAt,
    updatedAt: new Date().toISOString(),
    complianceText: behaviorLoopComplianceText,
  }
}

export function buildCycleMirrorCaseFromBehaviorLoop(loop: BehaviorLoop): CycleMirrorCase {
  const mirror = String(loop.sourceMirror || "追涨之镜")

  return {
    id: mirrorCaseIdByName[mirror] || "chasing",
    sourceMirror: mirror,
    title: `${mirror.replace("之镜", "")}循环`,
    status: `循环已沉淀 ${loop.repeatCount || 1} 次：${loop.thought}`,
    verdict: cleanText(loop.selfStory || "底层循环识别已经从真实证据中生成。", 92),
    practice: cleanText(loop.loopBreakAction || "下一次同场景，先照见念头，再回到规则。", 88),
    dataSourceLabel: "来自底层循环识别持久化",
    sourceId: loop.behaviorLoopId,
    nodes: [
      makeCycleNode("trigger", "触发", loop.trigger, `触发来自已沉淀证据：${loop.trigger}`),
      makeCycleNode("thought", "念头", loop.thought, `这一轮最明显的一念是：${loop.thought}`),
      makeCycleNode("action", "动作", loop.action, `这一念带出的动作是：${loop.action}`),
      makeCycleNode("result", "结果", loop.result, `复盘中记录的结果是：${loop.result}`),
      makeCycleNode("retrigger", "再次触发", getRepeatRiskShort(loop.repeatRisk), loop.repeatRisk),
    ],
  }
}

function getCycleNode(cycle: ReturnType<typeof buildUserCycleMirror>, key: "trigger" | "thought" | "action" | "result" | "retrigger") {
  return cycle?.nodes.find((node) => node.key === key) || {
    short: "待补全",
    detail: "完成一次真实交易复盘后，这里会沉淀为个人循环。",
  }
}

function mergeBehaviorLoop(existing: BehaviorLoop | undefined, next: BehaviorLoop): BehaviorLoop {
  const normalizedNext = normalizeBehaviorLoop(next)
  if (!existing) return normalizedNext

  const normalizedExisting = normalizeBehaviorLoop(existing)
  const base = normalizedExisting.sourceType === "trade_review" && normalizedNext.sourceType !== "trade_review"
    ? normalizedExisting
    : normalizedNext
  const evidenceSources = mergeEvidenceSources([
    ...normalizedExisting.evidenceSources,
    ...normalizedNext.evidenceSources,
  ])
  const affectedDimensions = uniqueStrings([
    ...normalizedExisting.affectedDimensions,
    ...normalizedNext.affectedDimensions,
  ])

  return {
    ...base,
    createdAt: earlierDate(normalizedExisting.createdAt, normalizedNext.createdAt),
    updatedAt: laterDate(normalizedExisting.updatedAt, normalizedNext.updatedAt),
    repeatCount: Math.max(normalizedExisting.repeatCount, normalizedNext.repeatCount, evidenceSources.length, 1),
    affectedDimensions,
    evidenceIds: evidenceSources.map((source) => `${source.sourceType}:${source.sourceId}`),
    evidenceSources,
    firstSeenAt: earlierDate(
      normalizedExisting.firstSeenAt || normalizedExisting.createdAt,
      normalizedNext.firstSeenAt || normalizedNext.createdAt,
    ),
    lastSeenAt: laterDate(
      normalizedExisting.lastSeenAt || normalizedExisting.updatedAt,
      normalizedNext.lastSeenAt || normalizedNext.updatedAt,
    ),
    riskLevel: higherRiskLevel(normalizedExisting.riskLevel, normalizedNext.riskLevel),
    confidence: Math.max(normalizedExisting.confidence || 0, normalizedNext.confidence || 0) || undefined,
    signature: normalizedExisting.signature || normalizedNext.signature || getLoopSignature(base),
  }
}

function normalizeBehaviorLoop(loop: BehaviorLoop): BehaviorLoop {
  const evidenceSources = loop.evidenceSources?.length
    ? loop.evidenceSources
    : [{
        sourceType: loop.sourceType,
        sourceId: loop.sourceId,
        label: loop.sourceType === "trade_review" ? "真实交易复盘" : "循环证据",
        createdAt: loop.createdAt,
      }]

  return {
    ...loop,
    repeatCount: Math.max(1, loop.repeatCount || evidenceSources.length),
    affectedDimensions: uniqueStrings(loop.affectedDimensions?.length ? loop.affectedDimensions : [String(loop.sourceMirror), loop.thought]),
    evidenceIds: loop.evidenceIds?.length
      ? uniqueStrings(loop.evidenceIds)
      : evidenceSources.map((source) => `${source.sourceType}:${source.sourceId}`),
    evidenceSources: mergeEvidenceSources(evidenceSources),
    firstSeenAt: loop.firstSeenAt || evidenceSources[0]?.createdAt || loop.createdAt,
    lastSeenAt: loop.lastSeenAt || evidenceSources.at(-1)?.createdAt || loop.updatedAt,
    signature: loop.signature || getLoopSignature(loop),
  }
}

function recalculateRepeatCounts(loops: BehaviorLoop[]) {
  const normalized = loops.map(normalizeBehaviorLoop)
  const repeatCountBySignature = new Map<string, number>()

  normalized.forEach((loop) => {
    const signature = getLoopStorageSignature(loop)
    repeatCountBySignature.set(
      signature,
      (repeatCountBySignature.get(signature) || 0) + Math.max(1, loop.evidenceSources.length),
    )
  })

  return normalized.map((loop) => ({
    ...loop,
    repeatCount: Math.max(loop.repeatCount, repeatCountBySignature.get(getLoopStorageSignature(loop)) || 1),
  }))
}

function getLoopSignature(loop: BehaviorLoop) {
  return [loop.sourceMirror, loop.thought, loop.action]
    .map((item) => cleanText(String(item || ""), 28))
    .join("|")
}

function getLoopStorageSignature(loop: BehaviorLoop) {
  return loop.signature || getLoopSignature(loop)
}

function inferReviewAffectedDimensions(review: TradeReview, sourceMirror?: string) {
  return uniqueStrings([
    ...inferAffectedDimensionsFromText(`${review.strongestThought} ${review.exposedRisk || ""} ${review.reviewText || ""}`),
    String(sourceMirror || review.detectedMirror || ""),
    ...(review.behaviorTags || []),
    ...(review.detectedThieves || []).map((thief) => `心贼：${thief}`),
  ]).slice(0, 8)
}

function inferAffectedDimensionsFromText(text: string) {
  if (/怕错过|错过|上车|拉升|追/.test(text)) return ["追涨冲动", "临盘改计划"]
  if (/翻本|不甘|报复|赌/.test(text)) return ["赌性冲动", "知行合一"]
  if (/问别人|群|大家|外部|消息/.test(text)) return ["独立判断", "知行合一"]
  if (/害怕|恐惧|怕回吐|焦虑|空仓/.test(text)) return ["空仓焦虑", "止损执行"]
  if (/证明|面子|自我/.test(text)) return ["自我证明", "临盘改计划"]
  if (/犹豫|等待|回撤|不确定/.test(text)) return ["犹疑拖延", "计划一致性"]
  return ["觉察能力"]
}

function inferMirrorFromText(text: string) {
  if (/怕错过|错过|上车|拉升|追|临盘改计划/.test(text)) return "追涨之镜"
  if (/群|大家|别人|外部|消息|独立判断|问/.test(text)) return "从众之镜"
  if (/不认错|不甘|扛|止损|边界/.test(text)) return "扛单之镜"
  if (/翻本|赌|回本|报复/.test(text)) return "赌性之镜"
  if (/怕回吐|焦虑|空仓|恐慌|紧张/.test(text)) return "焦虑之镜"
  if (/等待|犹豫|回撤|不确定/.test(text)) return "犹疑之镜"
  if (/拖延|明天|以后|复盘/.test(text)) return "拖延之镜"
  if (/幻想|证明|故事|执念/.test(text)) return "幻想之镜"
  if (/良知|纪律|守住|知行/.test(text)) return "良知之镜"
  return "追涨之镜"
}

function makeCycleNode(key: CycleNode["key"], title: string, short: string, detail: string): CycleNode {
  return {
    key,
    title,
    short: shortSentence(short),
    detail: cleanText(detail, 120),
  }
}

function getRepeatRiskShort(value: string) {
  const first = cleanText(value, 32)
  if (!first) return "同一念头再来。"
  return shortSentence(first)
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

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => cleanText(value, 48)).filter(Boolean)))
}

function mergeEvidenceSources(sources: BehaviorLoopEvidenceSource[]) {
  return Array.from(new Map(
    sources
      .filter((source) => source.sourceId)
      .map((source) => [`${source.sourceType}:${source.sourceId}`, source]),
  ).values())
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
}

function earlierDate(left: string, right: string) {
  return new Date(left).getTime() <= new Date(right).getTime() ? left : right
}

function laterDate(left: string, right: string) {
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right
}

function higherRiskLevel(left: BehaviorLoop["riskLevel"], right: BehaviorLoop["riskLevel"]) {
  return riskRank(left) >= riskRank(right) ? left : right
}

function riskRank(value: BehaviorLoop["riskLevel"]) {
  if (value === "high") return 3
  if (value === "medium") return 2
  if (value === "low") return 1
  return 0
}
