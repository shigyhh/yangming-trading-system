import type { HeartProof } from "@/features/heart-proof/heartProofTypes"
import type { MirrorReport } from "@/features/mirror-report/mirrorReportTypes"
import type { TradeReview } from "../../../../packages/contracts/living-mirror"

import type { BehaviorLoop, BehaviorLoopEvidenceSource, BehaviorLoopRiskLevel } from "./behaviorLoopTypes"
import type { DailyGrowth, RetestChange } from "./growthProfileTypes"

export type BehaviorLoopDeriveInput = {
  mirrorReports: MirrorReport[]
  dailyGrowthRecords: DailyGrowth[]
  heartProofs: HeartProof[]
  tradeReviews: TradeReview[]
  retestChanges?: RetestChange[]
  now?: string
}

type LoopPatternKey =
  | "fomo"
  | "revenge"
  | "ask_others"
  | "intraday_plan_change"
  | "no_exit_rule"
  | "generic_thought"

type LoopEvidence = BehaviorLoopEvidenceSource & {
  thoughtType?: string
  affectedDimensions: string[]
  emotionIntensity?: number
  changedPlanDuringTrade?: boolean | null
  wasPlanned?: boolean | null
  hadExitRule?: boolean | null
}

type LoopCandidate = {
  ownerId: string
  userId?: string
  anonymousId: string
  reportId?: string
  thoughtType: string
  patternKey: LoopPatternKey
  evidence: LoopEvidence[]
  maxEmotionIntensity: number
  hasChangedPlan: boolean
  hasRetest: boolean
}

export function deriveBehaviorLoops(input: BehaviorLoopDeriveInput): BehaviorLoop[] {
  const now = input.now || new Date().toISOString()
  const mirrorReports = input.mirrorReports || []
  const dailyGrowthRecords = input.dailyGrowthRecords || []
  const heartProofs = input.heartProofs || []
  const tradeReviews = input.tradeReviews || []
  const retestChanges = input.retestChanges || []
  const owner = getInputOwner({ mirrorReports, dailyGrowthRecords, heartProofs, tradeReviews })
  const reportId = mirrorReports[0]?.reportId || dailyGrowthRecords.find((record) => record.reportId)?.reportId || heartProofs.find((proof) => proof.reportId)?.reportId || tradeReviews.find((review) => review.reportId)?.reportId
  const thoughtEvidence = collectThoughtEvidence({ dailyGrowthRecords, heartProofs, tradeReviews, now })
  const dimensionCounts = countAffectedDimensions(thoughtEvidence)
  const loops = new Map<string, BehaviorLoop>()

  thoughtEvidence.forEach((evidenceList, thoughtType) => {
    if (!shouldCreateThoughtLoop(thoughtType, evidenceList, dimensionCounts)) return

    const candidate = buildCandidate({
      owner,
      reportId,
      thoughtType,
      patternKey: getThoughtPatternKey(thoughtType),
      evidence: evidenceList,
      hasRetest: retestChanges.length > 0,
    })
    upsertLoop(loops, buildLoopFromCandidate(candidate, now))
  })

  tradeReviews.forEach((review) => {
    const reviewId = getTradeReviewId(review)
    const createdAt = review.createdAt || review.tradeDate || now
    const thoughtType = normalizeThoughtType(review.strongestThought)
    const baseEvidence: LoopEvidence = {
      sourceType: "trade_review",
      sourceId: reviewId,
      label: "真实交易复盘",
      createdAt,
      thoughtType,
      affectedDimensions: inferDimensionsForReview(review),
      emotionIntensity: review.emotionIntensity,
      changedPlanDuringTrade: review.changedPlanDuringTrade,
      wasPlanned: review.wasPlanned,
      hadExitRule: review.hadExitRule,
    }

    if (review.wasPlanned === false && thoughtType === "fomo") {
      upsertLoop(loops, buildLoopFromCandidate(buildCandidate({
        owner,
        reportId: review.reportId || reportId,
        thoughtType,
        patternKey: "fomo",
        evidence: [baseEvidence],
        hasRetest: retestChanges.length > 0,
      }), now))
    }

    if (review.changedPlanDuringTrade === true) {
      upsertLoop(loops, buildLoopFromCandidate(buildCandidate({
        owner,
        reportId: review.reportId || reportId,
        thoughtType: "abandon_plan",
        patternKey: "intraday_plan_change",
        evidence: [{
          ...baseEvidence,
          thoughtType: "abandon_plan",
          affectedDimensions: ["系统一致性", "临盘改计划"],
        }],
        hasRetest: retestChanges.length > 0,
      }), now))
    }

    if (review.hadExitRule === false) {
      upsertLoop(loops, buildLoopFromCandidate(buildCandidate({
        owner,
        reportId: review.reportId || reportId,
        thoughtType: "fear",
        patternKey: "no_exit_rule",
        evidence: [{
          ...baseEvidence,
          thoughtType: "fear",
          affectedDimensions: ["止损执行", "风险边界"],
        }],
        hasRetest: retestChanges.length > 0,
      }), now))
    }
  })

  return Array.from(loops.values())
    .sort((left, right) => riskRank(right.riskLevel) - riskRank(left.riskLevel) || (right.repeatCount || 1) - (left.repeatCount || 1) || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
}

function collectThoughtEvidence({
  dailyGrowthRecords,
  heartProofs,
  tradeReviews,
  now,
}: Pick<BehaviorLoopDeriveInput, "dailyGrowthRecords" | "heartProofs" | "tradeReviews"> & { now: string }) {
  const evidenceByThought = new Map<string, LoopEvidence[]>()

  dailyGrowthRecords.forEach((record) => {
    const thoughtType = normalizeThoughtType(record.thoughtType)
    if (!thoughtType) return
    addThoughtEvidence(evidenceByThought, thoughtType, {
      sourceType: "daily_growth",
      sourceId: getDailyGrowthId(record),
      label: `Day ${record.trainingDay || ""} 今日修行`.trim(),
      createdAt: record.completedAt || record.createdAt || now,
      thoughtType,
      affectedDimensions: getThoughtDimensions(thoughtType),
    })
  })

  heartProofs.forEach((proof) => {
    const thoughtType = normalizeThoughtType(proof.thoughtType || proof.thoughtLabel)
    if (!thoughtType) return
    addThoughtEvidence(evidenceByThought, thoughtType, {
      sourceType: "heart_proof",
      sourceId: proof.heartProofId,
      label: proof.sourceType === "trade_review" ? "复盘心证" : "今日心证",
      createdAt: proof.createdAt,
      thoughtType,
      affectedDimensions: uniqueStrings([
        ...getThoughtDimensions(thoughtType),
        ...(proof.affectedDimensions || []),
      ]),
    })
  })

  tradeReviews.forEach((review) => {
    const thoughtType = normalizeThoughtType(review.strongestThought)
    if (!thoughtType) return
    addThoughtEvidence(evidenceByThought, thoughtType, {
      sourceType: "trade_review",
      sourceId: getTradeReviewId(review),
      label: "真实交易复盘",
      createdAt: review.createdAt || review.tradeDate || now,
      thoughtType,
      affectedDimensions: inferDimensionsForReview(review),
      emotionIntensity: review.emotionIntensity,
      changedPlanDuringTrade: review.changedPlanDuringTrade,
      wasPlanned: review.wasPlanned,
      hadExitRule: review.hadExitRule,
    })
  })

  return evidenceByThought
}

function shouldCreateThoughtLoop(
  thoughtType: string,
  evidenceList: LoopEvidence[],
  dimensionCounts: Map<string, number>,
) {
  if (evidenceList.length >= 2) return true
  if (evidenceList.some((evidence) => evidence.wasPlanned === false)) return true
  if (evidenceList.some((evidence) => evidence.changedPlanDuringTrade === true)) return true
  if (evidenceList.some((evidence) => normalizeEmotionIntensity(evidence.emotionIntensity) >= 7)) return true
  if (evidenceList.some((evidence) => evidence.hadExitRule === false)) return true
  return uniqueStrings([
    ...getThoughtDimensions(thoughtType),
    ...evidenceList.flatMap((evidence) => evidence.affectedDimensions),
  ]).some((dimension) => (dimensionCounts.get(dimension) || 0) >= 2)
}

function buildCandidate({
  owner,
  reportId,
  thoughtType,
  patternKey,
  evidence,
  hasRetest,
}: {
  owner: { userId?: string; anonymousId: string; ownerId: string }
  reportId?: string
  thoughtType: string
  patternKey: LoopPatternKey
  evidence: LoopEvidence[]
  hasRetest: boolean
}): LoopCandidate {
  return {
    ownerId: owner.ownerId,
    userId: owner.userId,
    anonymousId: owner.anonymousId,
    reportId,
    thoughtType,
    patternKey,
    evidence,
    maxEmotionIntensity: Math.max(0, ...evidence.map((item) => item.emotionIntensity || 0)),
    hasChangedPlan: evidence.some((item) => item.changedPlanDuringTrade === true),
    hasRetest,
  }
}

function buildLoopFromCandidate(candidate: LoopCandidate, now: string): BehaviorLoop {
  const pattern = getLoopPattern(candidate)
  const evidenceSources = mergeEvidenceSources(candidate.evidence)
  const firstSeenAt = evidenceSources[0]?.createdAt || now
  const lastSeenAt = evidenceSources.at(-1)?.createdAt || now
  const signature = buildBehaviorLoopSignature({
    ownerId: candidate.ownerId,
    reportId: candidate.reportId,
    thoughtType: candidate.thoughtType,
    actionPattern: candidate.patternKey,
  })
  const behaviorLoopId = `behavior_loop_${hashText(signature)}`
  const repeatCount = Math.max(1, evidenceSources.length)
  const riskLevel = getRiskLevel(repeatCount, candidate.maxEmotionIntensity, candidate.hasChangedPlan)
  const confidence = getConfidence(candidate.evidence, candidate.hasRetest)
  const affectedDimensions = uniqueStrings([
    ...pattern.affectedDimensions,
    ...candidate.evidence.flatMap((item) => item.affectedDimensions),
  ])

  return {
    id: behaviorLoopId,
    behavior_loop_id: behaviorLoopId,
    behaviorLoopId,
    userId: candidate.userId,
    anonymousId: candidate.anonymousId,
    reportId: candidate.reportId,
    signature,
    sourceType: getPrimarySourceType(evidenceSources),
    sourceId: evidenceSources.at(-1)?.sourceId || behaviorLoopId,
    sourceMirror: pattern.sourceMirror,
    trigger: pattern.trigger,
    thought: pattern.thoughtLabel,
    action: pattern.action,
    result: pattern.result,
    selfStory: pattern.selfStory,
    repeatCount,
    affectedDimensions,
    repeatRisk: getRepeatRisk(riskLevel, pattern.thoughtLabel),
    riskLevel,
    confidence,
    loopBreakAction: pattern.breakAction,
    evidenceIds: evidenceSources.map((source) => `${source.sourceType}:${source.sourceId}`),
    evidenceSources,
    firstSeenAt,
    lastSeenAt,
    createdAt: firstSeenAt,
    updatedAt: lastSeenAt,
    complianceText: "仅用于交易行为复盘与心理训练，不构成任何投资建议。",
  }
}

function getLoopPattern(candidate: LoopCandidate) {
  if (candidate.patternKey === "fomo") {
    return {
      sourceMirror: "追涨之镜",
      trigger: "价格快速拉升或计划外机会出现",
      thoughtLabel: "怕错过",
      action: "降低原计划标准，容易追入或临时改计划",
      result: "回落后容易扛单或后悔",
      selfStory: "我只是进早了，下次应该能处理好",
      breakAction: "计划外拉升前停十秒，再看是否在原计划内",
      affectedDimensions: ["追涨冲动", "临盘改计划"],
    }
  }

  if (candidate.patternKey === "revenge") {
    return {
      sourceMirror: "赌性之镜",
      trigger: "上一笔亏损或止损后",
      thoughtLabel: "想翻本",
      action: "急着用下一笔证明自己",
      result: "风险边界扩大，容易连续失守",
      selfStory: "我只是想把刚才亏的拿回来",
      breakAction: "亏损后离开屏幕三分钟，再决定是否继续",
      affectedDimensions: ["不甘执念", "翻本冲动", "风险边界"],
    }
  }

  if (candidate.patternKey === "ask_others") {
    return {
      sourceMirror: "从众之镜",
      trigger: "群消息、他人观点或市场噪音出现",
      thoughtLabel: "想问别人",
      action: "把自己的判断让位给外部声音",
      result: "执行标准漂移，交易后难以复盘",
      selfStory: "我只是多参考一下",
      breakAction: "问别人前，先写下自己的方向和理由",
      affectedDimensions: ["独立判断", "从众依赖"],
    }
  }

  if (candidate.patternKey === "intraday_plan_change") {
    return {
      sourceMirror: "良知之镜",
      trigger: "盘中价格波动或情绪升高",
      thoughtLabel: "想改计划",
      action: "临盘修改原定规则",
      result: "系统一致性下降",
      selfStory: "市场变了，我也要灵活",
      breakAction: "只在事前写明的条件触发时修改计划",
      affectedDimensions: ["系统一致性", "临盘改计划"],
    }
  }

  if (candidate.patternKey === "no_exit_rule") {
    return {
      sourceMirror: "扛单之镜",
      trigger: "进场机会出现",
      thoughtLabel: "先进去再说",
      action: "进场前没有写清离场条件",
      result: "回撤时开始和自己谈判",
      selfStory: "到时候看情况",
      breakAction: "进场前必须写下离场条件",
      affectedDimensions: ["止损执行", "风险边界"],
    }
  }

  const thoughtLabel = getThoughtLabel(candidate.thoughtType)
  return {
    sourceMirror: inferMirrorFromThought(candidate.thoughtType),
    trigger: "相似交易场景再次出现",
    thoughtLabel,
    action: "念头出现后，执行标准容易被情绪牵动",
    result: "复盘时需要重新确认计划边界",
    selfStory: "我只是根据当时情况做了调整",
    breakAction: getBreakAction(candidate.thoughtType),
    affectedDimensions: getThoughtDimensions(candidate.thoughtType),
  }
}

export function buildBehaviorLoopSignature({
  ownerId,
  reportId,
  thoughtType,
  actionPattern,
}: {
  ownerId: string
  reportId?: string
  thoughtType: string
  actionPattern: string
}) {
  return [ownerId || "local-anonymous", reportId || "no_report", thoughtType || "unknown_thought", actionPattern || "generic"]
    .map((item) => cleanText(item, 64))
    .join("|")
}

export function normalizeThoughtType(value?: string | null) {
  const text = cleanText(value, 80)
  if (!text || text === "none" || text === "念头不明" || text === "今日一念") return ""
  if (/^fomo$|怕错过|错过|fear_missing/.test(text)) return "fomo"
  if (/^chase$|想追|追进去|追涨/.test(text)) return "chase"
  if (/^wait_pullback$|等回撤|想等|等待/.test(text)) return "wait_pullback"
  if (/^ask_others$|问别人|外部声音|群消息|他人观点/.test(text)) return "ask_others"
  if (/^abandon_plan$|放弃计划|改计划|临盘改/.test(text)) return "abandon_plan"
  if (/^revenge$|翻本|回本|报复/.test(text)) return "revenge"
  if (/^fear$|害怕|恐惧|怕失去|怕回吐/.test(text)) return "fear"
  if (/^ego$|证明|面子|自我/.test(text)) return "ego"
  if (/^hesitation$|犹豫/.test(text)) return "hesitation"
  return text
}

export function getThoughtDimensions(thoughtType?: string | null) {
  if (thoughtType === "fomo") return ["追涨冲动", "临盘改计划"]
  if (thoughtType === "chase") return ["追涨冲动", "知行合一"]
  if (thoughtType === "wait_pullback") return ["空仓焦虑", "执行边界"]
  if (thoughtType === "ask_others") return ["独立判断", "从众依赖"]
  if (thoughtType === "abandon_plan") return ["系统一致性", "临盘改计划"]
  if (thoughtType === "revenge") return ["不甘执念", "翻本冲动"]
  if (thoughtType === "fear") return ["恐惧牵动", "止损执行"]
  if (thoughtType === "ego") return ["证明执念", "风险边界"]
  return []
}

export function getThoughtLabel(thoughtType?: string | null) {
  if (thoughtType === "fomo") return "怕错过"
  if (thoughtType === "chase") return "想追进去"
  if (thoughtType === "wait_pullback") return "想等回撤"
  if (thoughtType === "ask_others") return "想问别人"
  if (thoughtType === "abandon_plan") return "想放弃计划"
  if (thoughtType === "revenge") return "想翻本"
  if (thoughtType === "fear") return "害怕失去"
  if (thoughtType === "ego") return "想证明"
  if (thoughtType === "hesitation") return "犹豫不决"
  return thoughtType || "待照见"
}

export function getRiskLevel(
  repeatCount: number,
  emotionIntensity: number,
  hasChangedPlan: boolean,
): BehaviorLoopRiskLevel {
  if (repeatCount >= 3 || normalizeEmotionIntensity(emotionIntensity) >= 8) return "high"
  if (repeatCount === 2 || hasChangedPlan) return "medium"
  return "low"
}

export function getHigherRiskLevel(left?: BehaviorLoopRiskLevel, right?: BehaviorLoopRiskLevel): BehaviorLoopRiskLevel {
  return riskRank(left) >= riskRank(right) ? (left || "low") : (right || "low")
}

export function getHigherConfidence(left?: number, right?: number) {
  return Math.max(left || 0, right || 0)
}

function addThoughtEvidence(counter: Map<string, LoopEvidence[]>, thoughtType: string, evidence: LoopEvidence) {
  counter.set(thoughtType, [...(counter.get(thoughtType) || []), evidence])
}

function countAffectedDimensions(evidenceByThought: Map<string, LoopEvidence[]>) {
  const counter = new Map<string, number>()
  evidenceByThought.forEach((evidenceList) => {
    evidenceList.forEach((evidence) => {
      evidence.affectedDimensions.forEach((dimension) => {
        counter.set(dimension, (counter.get(dimension) || 0) + 1)
      })
    })
  })
  return counter
}

function inferDimensionsForReview(review: TradeReview) {
  const thoughtType = normalizeThoughtType(review.strongestThought)
  const dimensions = [...getThoughtDimensions(thoughtType)]
  if (review.wasPlanned === false) dimensions.push("计划外交易")
  if (review.changedPlanDuringTrade === true) dimensions.push("临盘改计划")
  if (review.hadExitRule === false) dimensions.push("离场条件缺失")
  ;(review.behaviorTags || []).forEach((tag) => dimensions.push(tag))
  if (review.exposedRisk) dimensions.push(review.exposedRisk)
  return uniqueStrings(dimensions)
}

function getThoughtPatternKey(thoughtType: string): LoopPatternKey {
  if (thoughtType === "fomo") return "fomo"
  if (thoughtType === "revenge") return "revenge"
  if (thoughtType === "ask_others") return "ask_others"
  return "generic_thought"
}

function getBreakAction(thoughtType: string) {
  if (thoughtType === "chase") return "下一次想追进去时，先复核一条入场条件"
  if (thoughtType === "wait_pullback") return "等待前先写清条件，条件未到只观察"
  if (thoughtType === "abandon_plan") return "只比较计划条件，不给情绪补故事"
  if (thoughtType === "fear") return "先写下自己害怕失去的是什么，再回看离场条件"
  if (thoughtType === "ego") return "先区分事实变化和自我证明"
  return "下一次同场景，先停一息，记录念头，再回到计划"
}

function inferMirrorFromThought(thoughtType: string) {
  if (thoughtType === "fomo" || thoughtType === "chase") return "追涨之镜"
  if (thoughtType === "ask_others") return "从众之镜"
  if (thoughtType === "revenge") return "赌性之镜"
  if (thoughtType === "fear" || thoughtType === "wait_pullback") return "焦虑之镜"
  if (thoughtType === "ego") return "幻想之镜"
  if (thoughtType === "abandon_plan") return "良知之镜"
  return "良知之镜"
}

function getRepeatRisk(riskLevel: BehaviorLoopRiskLevel, thoughtLabel: string) {
  if (riskLevel === "high") return `「${thoughtLabel}」已多次出现，下一次同场景容易更快接管动作。`
  if (riskLevel === "medium") return `「${thoughtLabel}」已经形成可观察循环，需要用一个固定动作破环。`
  return `「${thoughtLabel}」已有证据出现，先保留观察，不急着下结论。`
}

function getConfidence(evidence: LoopEvidence[], hasRetest: boolean) {
  if (hasRetest) return 0.95
  const tradeReviewCount = evidence.filter((item) => item.sourceType === "trade_review").length
  if (tradeReviewCount >= 2) return 0.9
  if (tradeReviewCount >= 1) return 0.75
  if (evidence.some((item) => item.sourceType === "heart_proof")) return 0.6
  return 0.4
}

function normalizeEmotionIntensity(value?: number) {
  const intensity = Number(value || 0)
  if (intensity > 10) return intensity / 10
  return intensity
}

function getPrimarySourceType(evidenceSources: BehaviorLoopEvidenceSource[]) {
  if (evidenceSources.some((source) => source.sourceType === "trade_review")) return "trade_review"
  if (evidenceSources.some((source) => source.sourceType === "heart_proof")) return "heart_proof"
  if (evidenceSources.some((source) => source.sourceType === "daily_growth")) return "daily_growth"
  return "mirror_report"
}

function upsertLoop(loops: Map<string, BehaviorLoop>, next: BehaviorLoop) {
  const signature = next.signature || next.behaviorLoopId
  const existing = loops.get(signature)
  if (!existing) {
    loops.set(signature, next)
    return
  }

  const evidenceSources = mergeEvidenceSources([
    ...existing.evidenceSources,
    ...next.evidenceSources,
  ])
  const repeatCount = Math.max(existing.repeatCount || 1, next.repeatCount || 1, evidenceSources.length)
  const maxEmotionIntensity = Math.max(
    getMaxEvidenceEmotion(existing),
    getMaxEvidenceEmotion(next),
  )
  const riskLevel = getHigherRiskLevel(
    existing.riskLevel,
    getRiskLevel(repeatCount, maxEmotionIntensity, existing.riskLevel === "medium" || next.riskLevel === "medium"),
  )
  const firstSeenAt = evidenceSources[0]?.createdAt || existing.firstSeenAt || existing.createdAt
  const lastSeenAt = evidenceSources.at(-1)?.createdAt || next.lastSeenAt || next.updatedAt

  loops.set(signature, {
    ...existing,
    repeatCount,
    affectedDimensions: uniqueStrings([...existing.affectedDimensions, ...next.affectedDimensions]),
    riskLevel,
    confidence: getHigherConfidence(existing.confidence, next.confidence),
    evidenceIds: evidenceSources.map((source) => `${source.sourceType}:${source.sourceId}`),
    evidenceSources,
    firstSeenAt,
    lastSeenAt,
    createdAt: earlierDate(existing.createdAt, next.createdAt),
    updatedAt: laterDate(existing.updatedAt, next.updatedAt),
  })
}

function getMaxEvidenceEmotion(loop: BehaviorLoop) {
  void loop
  return 0
}

function mergeEvidenceSources(sources: BehaviorLoopEvidenceSource[]) {
  return Array.from(new Map(
    sources
      .filter((source) => source.sourceId)
      .map((source) => [`${source.sourceType}:${source.sourceId}`, source]),
  ).values())
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
}

function getInputOwner({
  mirrorReports,
  dailyGrowthRecords,
  heartProofs,
  tradeReviews,
}: Pick<BehaviorLoopDeriveInput, "mirrorReports" | "dailyGrowthRecords" | "heartProofs" | "tradeReviews">) {
  const userId = mirrorReports.find((report) => report.userId)?.userId ||
    dailyGrowthRecords.find((record) => record.userId)?.userId ||
    heartProofs.find((proof) => proof.userId)?.userId ||
    tradeReviews.find((review) => review.userId)?.userId ||
    undefined
  const anonymousId = mirrorReports.find((report) => report.anonymousId)?.anonymousId ||
    dailyGrowthRecords.find((record) => record.anonymousId)?.anonymousId ||
    heartProofs.find((proof) => proof.anonymousId)?.anonymousId ||
    tradeReviews.find((review) => review.anonymousId)?.anonymousId ||
    userId ||
    "local-anonymous"

  return {
    userId,
    anonymousId,
    ownerId: userId || anonymousId,
  }
}

function getDailyGrowthId(record: DailyGrowth) {
  return record.dailyGrowthId || record.growthRecordId || `daily_growth_day_${record.trainingDay || "unknown"}`
}

function getTradeReviewId(review: TradeReview) {
  return review.reviewId || review.id || `trade_review_${review.createdAt || "unknown"}`
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => cleanText(value, 48)).filter(Boolean)))
}

function cleanText(value?: string | null, maxLength = 80) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
}

function riskRank(value?: BehaviorLoopRiskLevel) {
  if (value === "high") return 3
  if (value === "medium") return 2
  return 1
}

function earlierDate(left: string, right: string) {
  return new Date(left).getTime() <= new Date(right).getTime() ? left : right
}

function laterDate(left: string, right: string) {
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right
}

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(36)
}
