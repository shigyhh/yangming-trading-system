import type { HeartProof } from "@/features/heart-proof/heartProofTypes"
import type { BehaviorLoop } from "@/features/living-mirror-growth/behaviorLoopTypes"
import type {
  GrowthMirrorLifeStage,
  GrowthProfile,
  GrowthProfileDataGap,
  GrowthProfileNextCycleFocus,
} from "@/features/living-mirror-growth/growthProfileTypes"

import {
  buildAssistantSummaryPreview,
  type AssistantSummaryPreview,
  type EvidenceEngineInput,
} from "./evidence-engine"

export type AssistantSummary = AssistantSummaryPreview

export const assistantSummaryApiPath = "/api/assistant/summary"
export const assistantHandoffUpdateApiPath = "/api/assistant-handoff/update"
export const assistantGrowthHandoffStorageKey = "ym_assistant_growth_handoff_v1"
export const assistantHandoffForbiddenPhrases = [
  "保证收益",
  "稳赚",
  "推荐股票",
  "带单",
  "买入卖出建议",
  "预测行情",
]
export const assistantHandoffComplianceText = "助教承接仅用于交易心理训练与行为复盘，不预测行情，不提供买卖建议，不构成任何投资建议。"

type LegacyGrowthProfile = {
  growth_profile_id: string
  highFrequencyThought: { label: string; count: number }
  trainingContinuity: {
    completedDays: number
    heartProofCount: number
    tradeReviewCount: number
    behaviorLoopCount: number
    retestChangeCount: number
  }
  mirrorLifeStage: { title: string; treeStage: string }
  nextCycleFocus: string
}

type AssistantGrowthProfileLike = GrowthProfile | LegacyGrowthProfile

export type AssistantHandoffLatestHeartProof = {
  heartProofId: string
  sourceType?: string
  sourceId?: string
  thoughtType: string
  thoughtLabel?: string
  reflectionText?: string
  affectedDimensions?: string[]
  proofText: string
  nextActionText: string
  createdAt: string
}

export type AssistantHandoffTopBehaviorLoop = {
  behaviorLoopId: string
  trigger?: string
  thought: string
  action?: string
  result?: string
  selfStory?: string
  repeatCount: number
  riskLevel?: BehaviorLoop["riskLevel"]
  confidence?: number
  loopBreakAction: string
  affectedDimensions: string[]
  firstSeenAt?: string
  lastSeenAt?: string
}

export type AssistantHandoffMirrorLifeStage = Pick<GrowthMirrorLifeStage, "label" | "description"> & {
  stage?: GrowthMirrorLifeStage["stage"] | string
}

export type AssistantHandoffNextCycleFocus = Pick<GrowthProfileNextCycleFocus, "title" | "reason" | "nextActionText" | "relatedDimensions">

export type AssistantGrowthHandoffInput = {
  userId?: string
  anonymousId?: string
  phone?: string
  primaryPersona?: string
  secondaryPersona?: string
  latestHeartProof?: HeartProof | AssistantHandoffLatestHeartProof | null
  growthProfile?: AssistantGrowthProfileLike | null
  behaviorLoop?: BehaviorLoop | AssistantHandoffTopBehaviorLoop | null
  createdAt?: string
}

export type AssistantGrowthHandoffSummary = {
  handoffId: string
  userId: string
  anonymousId: string
  phoneMasked?: string
  primaryPersona: string
  secondaryPersona: string
  growthProfileId?: string
  mirrorLifeStage: AssistantHandoffMirrorLifeStage
  completedGrowthDays: number
  trainingConsistencyScore: number
  heartProofCount: number
  tradeReviewCount: number
  topThought: string
  latestThought: string
  latestHeartProof: AssistantHandoffLatestHeartProof | null
  topBehaviorLoop: AssistantHandoffTopBehaviorLoop | null
  affectedDimensions: string[]
  nextCycleFocus: AssistantHandoffNextCycleFocus
  forbiddenPhrases: string[]
  suggestedOpening: string
  complianceText: string
  completedDays: number
  behaviorLoopCount: number
  hasRetest: boolean
  behaviorLoopId?: string
  nextCycleFocusText: string
  riskBoundary: "仅交易心理训练，不提供买卖建议"
  createdAt: string
}

type AssistantOpeningInput = {
  topThought?: string
  topBehaviorLoop?: AssistantHandoffTopBehaviorLoop | null
  dataGaps?: Pick<GrowthProfileDataGap, "type">[]
  nextCycleFocus?: AssistantHandoffNextCycleFocus | string | null
}

export function buildAssistantSummary(input: EvidenceEngineInput): AssistantSummary {
  return buildAssistantSummaryPreview({
    ...input,
    userId: input.userId || "",
  })
}

export function buildAssistantSuggestedOpening({
  topThought,
  topBehaviorLoop,
  dataGaps = [],
  nextCycleFocus,
}: AssistantOpeningInput) {
  const normalizedThought = normalizeThoughtLabel(topThought)
  if (dataGaps.some((gap) => gap.type === "missing_trade_review")) {
    return "你现在已经有今日修行记录，但还缺少真实交易复盘。下一步可以先复盘一笔最近的交易，只看当时是谁在下单。"
  }
  if (isPlanChangeLoop(topBehaviorLoop)) {
    return "你的循环之镜里已经显影出“临盘改计划”。下一次不是先判断行情，而是先确认：这是条件变化，还是情绪变化。"
  }
  if (normalizedThought === "怕错过") {
    return "我看你最近高频出现的是“怕错过”。今天先不谈复杂系统，只练一个动作：计划外拉升前停十秒。"
  }

  const nextActionText = typeof nextCycleFocus === "string"
    ? nextCycleFocus
    : nextCycleFocus?.nextActionText

  return `我看你最近照见的是「${normalizedThought || "待照见"}」。今天先不用急着证明改变，只练一个动作：${nextActionText || "先落下一条今日修行或真实复盘。"}`
}

export function buildAssistantHandoffFromGrowthProfile(input: AssistantGrowthHandoffInput): AssistantGrowthHandoffSummary {
  const createdAt = input.createdAt || new Date().toISOString()
  const growthProfile = input.growthProfile || null
  const topBehaviorLoop = normalizeBehaviorLoop(input.behaviorLoop)
  const latestHeartProof = normalizeHeartProof(input.latestHeartProof)
  const topThought = getTopThought({ growthProfile, latestHeartProof, topBehaviorLoop })
  const nextCycleFocus = getNextCycleFocus(growthProfile, topBehaviorLoop)
  const counts = getGrowthCounts(growthProfile, latestHeartProof, topBehaviorLoop)
  const mirrorLifeStage = getMirrorLifeStage(growthProfile)
  const dataGaps = getDataGaps(growthProfile)
  const affectedDimensions = getAffectedDimensions(growthProfile, topBehaviorLoop)
  const owner = getGrowthOwner(growthProfile)
  const ownerKey = input.userId || input.anonymousId || owner.userId || owner.anonymousId || "local"

  return {
    handoffId: `assistant_handoff_${hashAssistantHandoff(`${ownerKey}_${createdAt}`)}`,
    userId: input.userId || owner.userId || "",
    anonymousId: input.anonymousId || owner.anonymousId || "local-anonymous",
    phoneMasked: maskPhone(input.phone),
    primaryPersona: input.primaryPersona || "待照见",
    secondaryPersona: input.secondaryPersona || "待照见",
    growthProfileId: getGrowthProfileId(growthProfile),
    mirrorLifeStage,
    completedGrowthDays: counts.completedGrowthDays,
    trainingConsistencyScore: counts.trainingConsistencyScore,
    heartProofCount: counts.heartProofCount,
    tradeReviewCount: counts.tradeReviewCount,
    topThought,
    latestThought: topThought,
    latestHeartProof,
    topBehaviorLoop,
    affectedDimensions,
    nextCycleFocus,
    forbiddenPhrases: assistantHandoffForbiddenPhrases,
    suggestedOpening: buildAssistantSuggestedOpening({
      topThought,
      topBehaviorLoop,
      dataGaps,
      nextCycleFocus,
    }),
    complianceText: assistantHandoffComplianceText,
    completedDays: counts.completedGrowthDays,
    behaviorLoopCount: counts.behaviorLoopCount,
    hasRetest: counts.hasRetest,
    behaviorLoopId: topBehaviorLoop?.behaviorLoopId,
    nextCycleFocusText: nextCycleFocus.nextActionText,
    riskBoundary: "仅交易心理训练，不提供买卖建议",
    createdAt,
  }
}

export function logAssistantSummaryInDevelopment(assistantSummary: AssistantSummary) {
  if (process.env.NODE_ENV !== "development") return
  console.log("[assistantSummary]", assistantSummary)
}

export function logAssistantGrowthHandoffInDevelopment(handoff: AssistantGrowthHandoffSummary) {
  if (process.env.NODE_ENV !== "development") return
  console.log("[assistantGrowthHandoff]", {
    ...handoff,
    phoneMasked: handoff.phoneMasked ? "***" : undefined,
  })
}

export async function postAssistantSummaryLater(assistantSummary: AssistantSummary) {
  void assistantSummary

  return {
    ok: false as const,
    skipped: true as const,
    endpoint: assistantSummaryApiPath,
    reason: "assistant summary API is reserved for a later sprint",
  }
}

export async function postAssistantGrowthHandoffLater(handoff: AssistantGrowthHandoffSummary) {
  void handoff

  return {
    ok: false as const,
    skipped: true as const,
    endpoint: assistantHandoffUpdateApiPath,
    reason: "assistant handoff update API is reserved for a later sprint",
  }
}

function getTopThought({
  growthProfile,
  latestHeartProof,
  topBehaviorLoop,
}: {
  growthProfile: AssistantGrowthProfileLike | null
  latestHeartProof: AssistantHandoffLatestHeartProof | null
  topBehaviorLoop: AssistantHandoffTopBehaviorLoop | null
}) {
  if (isModernGrowthProfile(growthProfile)) {
    return normalizeThoughtLabel(growthProfile.highFrequencyThoughts[0]?.label || growthProfile.highFrequencyThoughts[0]?.thoughtType) || "待照见"
  }

  return normalizeThoughtLabel(
    growthProfile?.highFrequencyThought.label ||
    latestHeartProof?.thoughtLabel ||
    latestHeartProof?.thoughtType ||
    topBehaviorLoop?.thought ||
    "待照见",
  ) || "待照见"
}

function getGrowthCounts(
  growthProfile: AssistantGrowthProfileLike | null,
  latestHeartProof: AssistantHandoffLatestHeartProof | null,
  topBehaviorLoop: AssistantHandoffTopBehaviorLoop | null,
) {
  if (isModernGrowthProfile(growthProfile)) {
    return {
      completedGrowthDays: growthProfile.trainingContinuity.completedGrowthDays,
      trainingConsistencyScore: growthProfile.trainingContinuity.trainingConsistencyScore,
      heartProofCount: growthProfile.heartProofCount,
      tradeReviewCount: growthProfile.tradeReviewCount,
      behaviorLoopCount: growthProfile.behaviorLoopCount,
      hasRetest: growthProfile.retestChangeCount > 0,
    }
  }

  const completedGrowthDays = growthProfile?.trainingContinuity.completedDays || 0
  const trainingConsistencyScore = Math.min(100, Math.max(0, Math.round((completedGrowthDays / 7) * 100)))

  return {
    completedGrowthDays,
    trainingConsistencyScore,
    heartProofCount: growthProfile?.trainingContinuity.heartProofCount || (latestHeartProof ? 1 : 0),
    tradeReviewCount: growthProfile?.trainingContinuity.tradeReviewCount || 0,
    behaviorLoopCount: growthProfile?.trainingContinuity.behaviorLoopCount || (topBehaviorLoop ? 1 : 0),
    hasRetest: Boolean(growthProfile?.trainingContinuity.retestChangeCount),
  }
}

function getMirrorLifeStage(growthProfile: AssistantGrowthProfileLike | null): AssistantHandoffMirrorLifeStage {
  if (isModernGrowthProfile(growthProfile)) {
    return growthProfile.mirrorLifeStage
  }

  return {
    stage: growthProfile?.mirrorLifeStage.treeStage,
    label: growthProfile?.mirrorLifeStage.title || "待照见",
    description: growthProfile?.mirrorLifeStage.treeStage || "完成今日修行后，助教会看到更完整的成长状态。",
  }
}

function getNextCycleFocus(
  growthProfile: AssistantGrowthProfileLike | null,
  topBehaviorLoop: AssistantHandoffTopBehaviorLoop | null,
): AssistantHandoffNextCycleFocus {
  if (isModernGrowthProfile(growthProfile)) {
    return {
      title: growthProfile.nextCycleFocus.title,
      reason: growthProfile.nextCycleFocus.reason,
      nextActionText: growthProfile.nextCycleFocus.nextActionText,
      relatedDimensions: growthProfile.nextCycleFocus.relatedDimensions,
    }
  }

  if (growthProfile?.nextCycleFocus) {
    return {
      title: "下一轮照见重点",
      reason: "来自活镜成长谱的下一步训练重点。",
      nextActionText: growthProfile.nextCycleFocus,
      relatedDimensions: topBehaviorLoop?.affectedDimensions || [],
    }
  }

  return {
    title: "下一轮照见重点",
    reason: topBehaviorLoop ? "来自循环之镜的破环动作。" : "当前证据还不够，需要先补一条今日修行或真实复盘。",
    nextActionText: topBehaviorLoop?.loopBreakAction || "先完成一条今日修行或真实复盘。",
    relatedDimensions: topBehaviorLoop?.affectedDimensions || ["今日修行", "真实复盘"],
  }
}

function getGrowthProfileId(growthProfile: AssistantGrowthProfileLike | null) {
  if (!growthProfile) return undefined
  if (isModernGrowthProfile(growthProfile)) return growthProfile.growthProfileId || growthProfile.growth_profile_id
  return growthProfile.growth_profile_id
}

function getGrowthOwner(growthProfile: AssistantGrowthProfileLike | null) {
  if (!isModernGrowthProfile(growthProfile)) {
    return {
      userId: undefined,
      anonymousId: undefined,
    }
  }

  return {
    userId: growthProfile.userId,
    anonymousId: growthProfile.anonymousId,
  }
}

function getDataGaps(growthProfile: AssistantGrowthProfileLike | null): Pick<GrowthProfileDataGap, "type">[] {
  if (!isModernGrowthProfile(growthProfile)) return []
  return growthProfile.dataGaps.map((gap) => ({ type: gap.type }))
}

function getAffectedDimensions(
  growthProfile: AssistantGrowthProfileLike | null,
  topBehaviorLoop: AssistantHandoffTopBehaviorLoop | null,
) {
  const fromProfile = isModernGrowthProfile(growthProfile)
    ? growthProfile.affectedDimensions.map((dimension) => dimension.label)
    : []

  return uniqueStrings([
    ...fromProfile,
    ...(topBehaviorLoop?.affectedDimensions || []),
  ]).slice(0, 8)
}

function normalizeHeartProof(heartProof?: HeartProof | AssistantHandoffLatestHeartProof | null): AssistantHandoffLatestHeartProof | null {
  if (!heartProof) return null

  return {
    heartProofId: heartProof.heartProofId,
    sourceType: "sourceType" in heartProof ? heartProof.sourceType : undefined,
    sourceId: "sourceId" in heartProof ? heartProof.sourceId : undefined,
    thoughtType: heartProof.thoughtType,
    thoughtLabel: normalizeThoughtLabel(heartProof.thoughtLabel || heartProof.thoughtType),
    reflectionText: "reflectionText" in heartProof ? heartProof.reflectionText : undefined,
    affectedDimensions: "affectedDimensions" in heartProof ? heartProof.affectedDimensions : undefined,
    proofText: heartProof.proofText,
    nextActionText: heartProof.nextActionText,
    createdAt: heartProof.createdAt,
  }
}

function normalizeBehaviorLoop(loop?: BehaviorLoop | AssistantHandoffTopBehaviorLoop | null): AssistantHandoffTopBehaviorLoop | null {
  if (!loop) return null

  return {
    behaviorLoopId: loop.behaviorLoopId,
    trigger: "trigger" in loop ? loop.trigger : undefined,
    thought: normalizeThoughtLabel(loop.thought),
    action: "action" in loop ? loop.action : undefined,
    result: "result" in loop ? loop.result : undefined,
    selfStory: "selfStory" in loop ? loop.selfStory : undefined,
    repeatCount: loop.repeatCount || 1,
    riskLevel: "riskLevel" in loop ? loop.riskLevel : undefined,
    confidence: "confidence" in loop ? loop.confidence : undefined,
    loopBreakAction: loop.loopBreakAction,
    affectedDimensions: loop.affectedDimensions || [],
    firstSeenAt: "firstSeenAt" in loop ? loop.firstSeenAt : undefined,
    lastSeenAt: "lastSeenAt" in loop ? loop.lastSeenAt : undefined,
  }
}

function isModernGrowthProfile(growthProfile: AssistantGrowthProfileLike | null): growthProfile is GrowthProfile {
  return Boolean(growthProfile && "highFrequencyThoughts" in growthProfile)
}

function normalizeThoughtLabel(thought?: string) {
  const value = String(thought || "").trim()
  const labelByThought: Record<string, string> = {
    fomo: "怕错过",
    chase: "想追进去",
    wait_pullback: "想等回踩",
    ask_others: "想问别人",
    abandon_plan: "想放弃计划",
    revenge: "想翻本",
    fear: "怕亏",
    ego: "想证明自己",
  }

  return labelByThought[value] || value
}

function isPlanChangeLoop(loop?: AssistantHandoffTopBehaviorLoop | null) {
  if (!loop) return false
  return [
    loop.thought,
    loop.action,
    loop.loopBreakAction,
    ...loop.affectedDimensions,
  ].some((text) => /临盘改计划|改计划|修改计划/.test(text || ""))
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function maskPhone(phone?: string) {
  if (!phone) return undefined
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 7) return "***"
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`
}

function hashAssistantHandoff(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(36)
}
