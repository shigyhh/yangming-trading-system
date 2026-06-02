import {
  assistantHandoffComplianceText,
  assistantHandoffForbiddenPhrases,
  buildAssistantSuggestedOpening,
} from "@/features/assessment/assistant-summary"
import { getThoughtLabel } from "@/features/assessment/sprint10/trainingTypes"

import { deriveBehaviorLoops, getThoughtDimensions, getThoughtLabel as getGrowthThoughtLabel, normalizeThoughtType } from "./behaviorLoopEngine"
import type { BehaviorLoop } from "./behaviorLoopTypes"
import type {
  DailyGrowth,
  GrowthMirrorLifeStage,
  GrowthProfileAffectedDimension,
  GrowthProfileBuildResult,
  GrowthProfileDataGap,
  GrowthProfileInput,
  GrowthProfileNextCycleFocus,
  GrowthProfileRepeatedBehavior,
  GrowthProfileRetestSummary,
  GrowthProfileThought,
  GrowthProfileTrainingContinuity,
  LivingMirrorGrowthCountItem,
  LivingMirrorGrowthDimension,
  LivingMirrorGrowthEvidence,
  LivingMirrorGrowthProfile,
  LivingMirrorGrowthProfileInput,
  LivingMirrorGrowthSourceType,
  LivingMirrorTreeStage,
  RetestChange,
  RetestDimensionChange,
} from "./growthProfileTypes"

export const livingMirrorGrowthComplianceText = "本成长谱仅用于交易心理觉察、复盘训练与行为管理，不构成投资建议。"

export function buildGrowthProfile(input: GrowthProfileInput = {}): GrowthProfileBuildResult {
  const now = input.now || new Date().toISOString()
  const mirrorReports = normalizeMirrorReports(input)
  const mirrorReport = input.mirrorReport || mirrorReports[0] || null
  const dailyGrowthRecords = normalizeDailyGrowthRecords(input)
  const heartProofs = input.heartProofs || []
  const tradeReviews = input.tradeReviews || []
  const retestChanges = normalizeRetestChanges(input, now)
  const owner = getGrowthProfileOwner(input, mirrorReport, dailyGrowthRecords)
  const reportId = mirrorReport?.reportId || dailyGrowthRecords.find((record) => record.reportId)?.reportId || heartProofs.find((proof) => proof.reportId)?.reportId || tradeReviews.find((review) => review.reportId)?.reportId
  const derivedBehaviorLoops = deriveBehaviorLoops({
    mirrorReports,
    dailyGrowthRecords,
    heartProofs,
    tradeReviews,
    retestChanges,
    now,
  })
  const behaviorLoops = dedupeGrowthBehaviorLoops([
    ...(input.behaviorLoops || []),
    ...derivedBehaviorLoops,
  ])
  const highFrequencyThoughts = buildHighFrequencyThoughts({
    dailyGrowthRecords,
    heartProofs,
    tradeReviews,
  })
  const trainingContinuity = buildGrowthTrainingContinuity(dailyGrowthRecords)
  const affectedDimensions = buildGrowthAffectedDimensions({
    mirrorReport,
    heartProofs,
    tradeReviews,
  })
  const repeatedBehaviors = buildGrowthRepeatedBehaviors({
    dailyGrowthRecords,
    tradeReviews,
  })
  const mirrorLifeStage = buildGrowthMirrorLifeStage({
    hasMirrorReport: !!mirrorReport,
    completedGrowthDays: trainingContinuity.completedGrowthDays,
    hasDailyGrowth: dailyGrowthRecords.length > 0,
    hasHeartProof: heartProofs.length > 0,
    hasRetest: retestChanges.length > 0,
  })
  const dataGaps = buildGrowthDataGaps({
    completedGrowthDays: trainingContinuity.completedGrowthDays,
    hasTradeReview: tradeReviews.length > 0,
    hasHeartProof: heartProofs.length > 0,
    hasRetest: retestChanges.length > 0,
  })
  const retestTrend = buildRetestTrend(retestChanges)
  const nextCycleFocus = buildGrowthNextCycleFocus({
    behaviorLoops,
    highFrequencyThoughts,
    mirrorReport,
    retestChanges,
  })
  const retestSummary = buildGrowthRetestSummary({
    retestChanges,
    highFrequencyThoughts,
    repeatedBehaviors,
    trainingContinuity,
    nextCycleFocus,
  })
  const growthProfileId = buildStableGrowthProfileId({
    ownerId: owner.userId || owner.anonymousId,
    reportId,
  })
  const growthProfile = {
    schemaVersion: "growth_profile_v1" as const,
    growth_profile_id: growthProfileId,
    growthProfileId,
    status: "active" as const,
    userId: owner.userId,
    anonymousId: owner.anonymousId,
    reportId,
    assessmentId: mirrorReport?.assessmentId,
    primaryPersona: mirrorReport?.primaryPersona || "待照见",
    secondaryPersona: mirrorReport?.secondaryPersona || "待照见",
    riskRadar: mirrorReport?.riskRadar,
    sevenDayPrescription: mirrorReport?.sevenDayPrescription || [],
    recommendedCamp: mirrorReport?.recommendedCamp || "",
    highFrequencyThoughts,
    trainingContinuity,
    affectedDimensions,
    repeatedBehaviors,
    topBehaviorLoopIds: behaviorLoops.map((loop) => loop.behaviorLoopId).slice(0, 5),
    mirrorLifeStage,
    nextCycleFocus,
    dataGaps,
    retestTrend,
    retestSummary,
    sourceSummary: {
      mirrorReportCount: mirrorReport ? 1 : 0,
      dailyGrowthCount: dailyGrowthRecords.length,
      heartProofCount: heartProofs.length,
      tradeReviewCount: tradeReviews.length,
      behaviorLoopCount: behaviorLoops.length,
      retestChangeCount: retestChanges.length,
    },
    dailyGrowthCount: dailyGrowthRecords.length,
    heartProofCount: heartProofs.length,
    tradeReviewCount: tradeReviews.length,
    behaviorLoopCount: behaviorLoops.length,
    retestChangeCount: retestChanges.length,
    complianceText: livingMirrorGrowthComplianceText,
    computedAt: now,
    computedAtHistory: [now],
    updatedAt: now,
  }

  return {
    growthProfile,
    behaviorLoops,
    archiveItemsToUpsert: buildGrowthArchiveItems(growthProfile, behaviorLoops),
    scrollEventsToUpsert: buildGrowthScrollEvents(growthProfile, behaviorLoops),
    assistantHandoffPatch: buildAssistantHandoffPatch(growthProfile, {
      behaviorLoops,
      heartProofs,
    }),
  }
}

function normalizeMirrorReports(input: GrowthProfileInput) {
  return [
    ...(input.mirrorReport ? [input.mirrorReport] : []),
    ...(input.mirrorReports || []),
  ].filter(Boolean)
}

function normalizeDailyGrowthRecords(input: GrowthProfileInput): DailyGrowth[] {
  const records = [
    ...(input.dailyGrowth ? [input.dailyGrowth] : []),
    ...(input.dailyGrowthRecords || []),
    ...(input.dailyPracticeRecords || []),
  ]

  return Array.from(new Map(records.map((record, index) => [getGrowthRecordId(record, index), record])).values())
    .sort((left, right) => (left.trainingDay || 0) - (right.trainingDay || 0) || new Date(left.completedAt || left.createdAt || 0).getTime() - new Date(right.completedAt || right.createdAt || 0).getTime())
}

function normalizeRetestChanges(input: GrowthProfileInput, now: string) {
  if (input.retestChanges?.length) return input.retestChanges
  const comparisons = input.retestComparisons || []
  if (!comparisons.length) return []

  const baselineScores: Record<string, number> = {}
  const currentScores: Record<string, number> = {}
  const deltaScores: Record<string, number> = {}
  const dimensionChanges: RetestDimensionChange[] = comparisons.map((item) => ({
    key: item.key,
    label: item.label,
    before: item.before,
    after: item.after,
    delta: item.delta,
    direction: getRetestDirection(item.key, item.label, item.delta),
  }))

  comparisons.forEach((item) => {
    baselineScores[item.key] = item.before
    currentScores[item.key] = item.after
    deltaScores[item.key] = item.delta
  })

  return [{
    retestId: `retest_${hashText(comparisons.map((item) => `${item.key}:${item.delta}`).join("|"))}`,
    userId: input.userId,
    anonymousId: input.anonymousId,
    reportId: input.mirrorReport?.reportId || input.mirrorReports?.find((report) => report.reportId)?.reportId,
    baselineScores,
    currentScores,
    deltaScores,
    dimensionChanges,
    improvedDimensions: dimensionChanges.filter((item) => item.direction === "improved").map((item) => item.label),
    declinedDimensions: dimensionChanges.filter((item) => item.direction === "declined").map((item) => item.label),
    createdAt: now,
  }]
}

function getRetestDirection(key: string, label: string, delta: number): RetestDimensionChange["direction"] {
  if (delta === 0) return "flat"
  const higherBetter = isHigherBetterRetestDimension(key, label)
  if (higherBetter) return delta > 0 ? "improved" : "declined"
  return delta < 0 ? "improved" : "declined"
}

function isHigherBetterRetestDimension(key: string, label: string) {
  return /zhixing|knowing|execution|review|consistency|control|judgment|知行|止损执行|复盘|一致性|风险边界|独立判断/.test(`${key} ${label}`)
}

function getGrowthProfileOwner(
  input: GrowthProfileInput,
  mirrorReport: GrowthProfileInput["mirrorReport"],
  dailyGrowthRecords: DailyGrowth[],
) {
  const userId = input.userId ||
    mirrorReport?.userId ||
    dailyGrowthRecords.find((record) => record.userId)?.userId ||
    input.heartProofs?.find((proof) => proof.userId)?.userId ||
    input.tradeReviews?.find((review) => review.userId)?.userId ||
    undefined
  const anonymousId = input.anonymousId ||
    mirrorReport?.anonymousId ||
    dailyGrowthRecords.find((record) => record.anonymousId)?.anonymousId ||
    input.heartProofs?.find((proof) => proof.anonymousId)?.anonymousId ||
    input.tradeReviews?.find((review) => review.anonymousId)?.anonymousId ||
    userId ||
    "local-anonymous"

  return { userId, anonymousId }
}

function buildHighFrequencyThoughts({
  dailyGrowthRecords,
  heartProofs,
  tradeReviews,
}: Pick<GrowthProfileInput, "heartProofs" | "tradeReviews"> & { dailyGrowthRecords: DailyGrowth[] }): GrowthProfileThought[] {
  const counter = new Map<string, GrowthProfileThought>()

  dailyGrowthRecords.forEach((record, index) => {
    const thoughtType = normalizeThoughtType(record.thoughtType)
    if (!thoughtType) return
    addThoughtWeight(counter, thoughtType, 1, `daily_growth:${getGrowthRecordId(record, index)}`)
  })

  ;(heartProofs || []).forEach((proof) => {
    const thoughtType = normalizeThoughtType(proof.thoughtType || proof.thoughtLabel)
    if (!thoughtType) return
    addThoughtWeight(counter, thoughtType, 1.2, `heart_proof:${proof.heartProofId}`)
  })

  ;(tradeReviews || []).forEach((review) => {
    const thoughtType = normalizeThoughtType(review.strongestThought)
    if (!thoughtType) return
    addThoughtWeight(counter, thoughtType, 1.5, `trade_review:${review.reviewId || review.id}`)
  })

  return Array.from(counter.values())
    .sort((left, right) => right.weight - left.weight || right.count - left.count || left.label.localeCompare(right.label))
}

function addThoughtWeight(counter: Map<string, GrowthProfileThought>, thoughtType: string, weight: number, evidenceId: string) {
  const current = counter.get(thoughtType) || {
    thoughtType,
    label: getGrowthThoughtLabel(thoughtType),
    count: 0,
    weight: 0,
    evidenceIds: [],
  }

  current.count += 1
  current.weight = Number((current.weight + weight).toFixed(2))
  if (!current.evidenceIds.includes(evidenceId)) current.evidenceIds.push(evidenceId)
  counter.set(thoughtType, current)
}

function buildGrowthTrainingContinuity(dailyGrowthRecords: DailyGrowth[]): GrowthProfileTrainingContinuity {
  const completedRecords = dailyGrowthRecords.filter((record) => record.isCompleted === true)
  const explicitCompletedDays = Math.max(0, ...dailyGrowthRecords.map((record) => Number(record.completedDays || 0)))
  const completedDaySet = new Set<number>()

  completedRecords.forEach((record) => {
    if (record.trainingDay && record.trainingDay >= 1 && record.trainingDay <= 7) completedDaySet.add(record.trainingDay)
  })

  for (let day = 1; day <= Math.min(7, explicitCompletedDays); day += 1) {
    completedDaySet.add(day)
  }

  if (!completedDaySet.size && completedRecords.length) {
    for (let day = 1; day <= Math.min(7, completedRecords.length); day += 1) completedDaySet.add(day)
  }

  const completedDays = Array.from(completedDaySet).sort((left, right) => left - right)
  const completedGrowthDays = Math.min(7, completedDays.length)
  const longestStreak = getLongestStreak(completedDays)
  const currentStreak = getCurrentStreak(completedDays)
  const missedDays = Math.max(0, 7 - completedGrowthDays)
  const baseScore = Math.max(0, Math.min(100, (completedGrowthDays / 7) * 100))
  const trainingConsistencyScore = Math.min(100, Math.round(baseScore + (currentStreak >= 3 ? 5 : 0)))

  return {
    completedGrowthDays,
    currentStreak,
    longestStreak,
    missedDays,
    trainingConsistencyScore,
  }
}

function getLongestStreak(days: number[]) {
  let longest = 0
  let current = 0
  let previous = 0

  days.forEach((day) => {
    current = day === previous + 1 ? current + 1 : 1
    longest = Math.max(longest, current)
    previous = day
  })

  return longest
}

function getCurrentStreak(days: number[]) {
  if (!days.length) return 0

  let streak = 1
  for (let index = days.length - 1; index > 0; index -= 1) {
    if (days[index] !== days[index - 1] + 1) break
    streak += 1
  }

  return streak
}

function buildGrowthAffectedDimensions({
  mirrorReport,
  heartProofs,
  tradeReviews,
}: {
  mirrorReport: GrowthProfileInput["mirrorReport"]
  heartProofs: NonNullable<GrowthProfileInput["heartProofs"]>
  tradeReviews: NonNullable<GrowthProfileInput["tradeReviews"]>
}): GrowthProfileAffectedDimension[] {
  const counter = new Map<string, GrowthProfileAffectedDimension>()

  getRiskRadarDimensions(mirrorReport?.riskRadar).forEach((item) => {
    addGrowthDimension(counter, item.label, Math.max(1, item.value / 20), "mirror_report", `mirror_report:${mirrorReport?.reportId || "unknown"}`)
  })

  heartProofs.forEach((proof) => {
    const thoughtType = normalizeThoughtType(proof.thoughtType || proof.thoughtLabel)
    ;[...getThoughtDimensions(thoughtType), ...(proof.affectedDimensions || [])].forEach((dimension) => {
      addGrowthDimension(counter, dimension, 1.2, "heart_proof", `heart_proof:${proof.heartProofId}`)
    })
  })

  tradeReviews.forEach((review) => {
    const thoughtType = normalizeThoughtType(review.strongestThought)
    getThoughtDimensions(thoughtType).forEach((dimension) => {
      addGrowthDimension(counter, dimension, 1.5, "trade_review", `trade_review:${review.reviewId || review.id}`)
    })
    if (review.wasPlanned === false) addGrowthDimension(counter, "计划外交易", 1.5, "trade_review", `trade_review:${review.reviewId || review.id}`)
    if (review.changedPlanDuringTrade === true) addGrowthDimension(counter, "临盘改计划", 1.5, "trade_review", `trade_review:${review.reviewId || review.id}`)
    if (review.hadExitRule === false) addGrowthDimension(counter, "离场条件缺失", 1.5, "trade_review", `trade_review:${review.reviewId || review.id}`)
  })

  return Array.from(counter.values())
    .sort((left, right) => right.weight - left.weight || left.label.localeCompare(right.label))
    .slice(0, 12)
}

function addGrowthDimension(
  counter: Map<string, GrowthProfileAffectedDimension>,
  label: string,
  weight: number,
  sourceType: GrowthProfileAffectedDimension["sourceTypes"][number],
  evidenceId: string,
) {
  const key = normalizeLabel(label)
  if (!key) return
  const current = counter.get(key) || { label: key, weight: 0, sourceTypes: [], evidenceIds: [] }
  current.weight = Number((current.weight + weight).toFixed(2))
  if (!current.sourceTypes.includes(sourceType)) current.sourceTypes.push(sourceType)
  if (!current.evidenceIds.includes(evidenceId)) current.evidenceIds.push(evidenceId)
  counter.set(key, current)
}

function buildGrowthRepeatedBehaviors({
  dailyGrowthRecords,
  tradeReviews,
}: {
  dailyGrowthRecords: DailyGrowth[]
  tradeReviews: NonNullable<GrowthProfileInput["tradeReviews"]>
}): GrowthProfileRepeatedBehavior[] {
  const behaviorCounter = new Map<string, GrowthProfileRepeatedBehavior>()
  const thoughtCounter = new Map<string, { count: number; evidenceIds: string[] }>()

  dailyGrowthRecords.forEach((record, index) => {
    const thoughtType = normalizeThoughtType(record.thoughtType)
    if (!thoughtType) return
    addThoughtBehaviorCount(thoughtCounter, thoughtType, `daily_growth:${getGrowthRecordId(record, index)}`)
  })

  tradeReviews.forEach((review) => {
    const evidenceId = `trade_review:${review.reviewId || review.id}`
    const thoughtType = normalizeThoughtType(review.strongestThought)
    if (thoughtType) addThoughtBehaviorCount(thoughtCounter, thoughtType, evidenceId)
    if (review.wasPlanned === false && thoughtType === "fomo") addRepeatedBehavior(behaviorCounter, "planless_chase", "计划外拉升时被怕错过带走", evidenceId, thoughtType)
    if (review.changedPlanDuringTrade === true) addRepeatedBehavior(behaviorCounter, "intraday_plan_change", "临盘改计划", evidenceId, thoughtType)
    if (review.hadExitRule === false) addRepeatedBehavior(behaviorCounter, "no_exit_rule", "进场前未写离场条件", evidenceId, thoughtType)
    if (thoughtType === "revenge") addRepeatedBehavior(behaviorCounter, "revenge_trade", "亏损后想翻本", evidenceId, thoughtType)
    if (thoughtType === "ask_others") addRepeatedBehavior(behaviorCounter, "outsourced_judgment", "把判断交给外部声音", evidenceId, thoughtType)
  })

  thoughtCounter.forEach((item, thoughtType) => {
    if (item.count < 2) return
    addRepeatedBehavior(behaviorCounter, `repeated_thought_${thoughtType}`, `同一念头重复出现：${getGrowthThoughtLabel(thoughtType)}`, item.evidenceIds.join("|"), thoughtType, item.count, item.evidenceIds)
  })

  return Array.from(behaviorCounter.values())
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
}

function addThoughtBehaviorCount(counter: Map<string, { count: number; evidenceIds: string[] }>, thoughtType: string, evidenceId: string) {
  const current = counter.get(thoughtType) || { count: 0, evidenceIds: [] }
  current.count += 1
  if (!current.evidenceIds.includes(evidenceId)) current.evidenceIds.push(evidenceId)
  counter.set(thoughtType, current)
}

function addRepeatedBehavior(
  counter: Map<string, GrowthProfileRepeatedBehavior>,
  behaviorType: string,
  label: string,
  evidenceId: string,
  thoughtType?: string,
  amount = 1,
  evidenceIds?: string[],
) {
  const current = counter.get(behaviorType) || { behaviorType, label, count: 0, evidenceIds: [], thoughtType }
  current.count += amount
  ;(evidenceIds || [evidenceId]).forEach((id) => {
    if (id && !current.evidenceIds.includes(id)) current.evidenceIds.push(id)
  })
  counter.set(behaviorType, current)
}

function buildGrowthMirrorLifeStage({
  hasMirrorReport,
  completedGrowthDays,
  hasDailyGrowth,
  hasHeartProof,
  hasRetest,
}: {
  hasMirrorReport: boolean
  completedGrowthDays: number
  hasDailyGrowth: boolean
  hasHeartProof: boolean
  hasRetest: boolean
}): GrowthMirrorLifeStage {
  if (!hasMirrorReport) {
    return {
      stage: "not_entered",
      label: "未入照",
      description: "还没有心镜报告，成长谱暂未开始生长。",
    }
  }

  if (hasRetest) {
    return {
      stage: "retested",
      label: "复照期",
      description: "已经完成复测，可以对照首测与复测变化继续复盘。",
    }
  }

  if (completedGrowthDays >= 7 && hasHeartProof) {
    return {
      stage: "proven",
      label: "成证期",
      description: "七日训练已经完成，心证开始形成可复看的变化证据。",
    }
  }

  if (completedGrowthDays >= 3) {
    return {
      stage: "guarding_action",
      label: "守行期",
      description: "今日修行已有连续证据，下一步是把一念守成动作。",
    }
  }

  if (completedGrowthDays >= 1) {
    return {
      stage: "seeing_thought",
      label: "见念期",
      description: "已经开始记录今日修行，先看见一念如何出现。",
    }
  }

  return {
    stage: "initial_reflection",
    label: hasDailyGrowth ? "初入照" : "初入照",
    description: "心镜报告已经生成，下一步是完成第一日今日修行。",
  }
}

function buildGrowthNextCycleFocus({
  behaviorLoops,
  highFrequencyThoughts,
  mirrorReport,
  retestChanges,
}: {
  behaviorLoops: BehaviorLoop[]
  highFrequencyThoughts: GrowthProfileThought[]
  mirrorReport: GrowthProfileInput["mirrorReport"]
  retestChanges: RetestChange[]
}): GrowthProfileNextCycleFocus {
  const highRiskLoop = behaviorLoops
    .filter((loop) => loop.riskLevel === "high")
    .sort((left, right) => (right.repeatCount || 1) - (left.repeatCount || 1) || (right.confidence || 0) - (left.confidence || 0))
    .at(0)

  if (highRiskLoop) {
    return {
      title: `下一轮重点：${highRiskLoop.loopBreakAction}`,
      reason: `这条循环已经沉淀 ${highRiskLoop.repeatCount || 1} 次，容易在相似场景中重复触发。`,
      nextActionText: highRiskLoop.loopBreakAction,
      relatedDimensions: highRiskLoop.affectedDimensions,
      sourceType: "behavior_loop",
      sourceId: highRiskLoop.behaviorLoopId,
    }
  }

  const retestFocus = getRetestFocus(retestChanges, highFrequencyThoughts)
  if (retestFocus) return retestFocus

  const thought = highFrequencyThoughts[0]
  if (thought) return getThoughtFocus(thought)

  const riskRadarFocus = getRiskRadarDimensions(mirrorReport?.riskRadar)[0]
  if (riskRadarFocus) {
    return {
      title: `下一轮重点：照见${riskRadarFocus.label}`,
      reason: `心镜报告里「${riskRadarFocus.label}」风险较高，适合作为下一轮训练重点。`,
      nextActionText: "下一次同类情境出现时，先记录触发、一念和动作，再做复盘。",
      relatedDimensions: [riskRadarFocus.label],
      sourceType: "risk_radar",
      sourceId: mirrorReport?.reportId,
    }
  }

  return {
    title: "下一轮重点：继续完成今日修行",
    reason: "当前证据还不够，需要先留下今日修行或真实复盘。",
    nextActionText: "先完成一条今日修行，记录当下最明显的一念。",
    relatedDimensions: ["今日修行", "一念记录"],
    sourceType: "training",
  }
}

function getThoughtFocus(thought: GrowthProfileThought): GrowthProfileNextCycleFocus {
  if (thought.thoughtType === "fomo") {
    return {
      title: "下一轮重点：计划外拉升前停十秒",
      reason: "你的高频一念是怕错过，容易在计划外拉升时先行动、后解释。",
      nextActionText: "下一次看到计划外拉升，先停十秒，再看是否在原计划内。",
      relatedDimensions: ["追涨冲动", "临盘改计划"],
      sourceType: "thought",
      sourceId: thought.evidenceIds[0],
    }
  }

  if (thought.thoughtType === "ask_others") {
    return {
      title: "下一轮重点：先写自己的判断",
      reason: "你的记录显示，外部声音容易临时改变你的执行。",
      nextActionText: "下一次想问别人前，先写下自己的方向和理由。",
      relatedDimensions: ["独立判断", "从众依赖"],
      sourceType: "thought",
      sourceId: thought.evidenceIds[0],
    }
  }

  const relatedDimensions = getThoughtDimensions(thought.thoughtType)
  return {
    title: `下一轮重点：照见${thought.label}`,
    reason: `你的高频一念是「${thought.label}」，下一轮先观察它如何从念头变成动作。`,
    nextActionText: "下一次同类念头出现时，先停一息，写下触发和原计划边界。",
    relatedDimensions: relatedDimensions.length ? relatedDimensions : ["一念记录"],
    sourceType: "thought",
    sourceId: thought.evidenceIds[0],
  }
}

function getRetestFocus(
  retestChanges: RetestChange[],
  highFrequencyThoughts: GrowthProfileThought[],
): GrowthProfileNextCycleFocus | null {
  const latestRetest = getLatestRetestChange(retestChanges)
  if (!latestRetest) return null

  const changes = getRetestDimensionChanges(latestRetest)
  const declined = changes
    .filter((item) => item.direction === "declined")
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
  const improved = changes
    .filter((item) => item.direction === "improved")
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
  const focusDimension = declined[0] || improved[0] || changes[0] || null

  if (!focusDimension) return null

  const thought = highFrequencyThoughts[0]
  const focus = getDimensionFocus(focusDimension.label, thought)
  const directionText = focusDimension.direction === "declined"
    ? "复测显示这个维度仍在升高，需要进入下一轮照见。"
    : "复测显示这个维度已经开始变化，但还需要用下一轮训练巩固。"

  return {
    title: focus.title,
    reason: `${focusDimension.label} 从 ${focusDimension.before} 到 ${focusDimension.after}，${directionText}`,
    nextActionText: focus.nextActionText,
    relatedDimensions: uniqueStrings([focusDimension.label, ...focus.relatedDimensions]),
    sourceType: "retest_change",
    sourceId: latestRetest.retestId,
  }
}

function getDimensionFocus(label: string, thought?: GrowthProfileThought) {
  if (/追涨|冲动|fomo/.test(label) || thought?.thoughtType === "fomo") {
    return {
      title: "下一轮重点：计划外拉升前停十秒",
      nextActionText: "计划外拉升前停十秒。",
      relatedDimensions: ["追涨冲动", "临盘改计划"],
    }
  }

  if (/独立判断|从众|外部/.test(label) || thought?.thoughtType === "ask_others") {
    return {
      title: "下一轮重点：先写自己的判断",
      nextActionText: "问别人前，先写下自己的方向和理由。",
      relatedDimensions: ["独立判断", "从众依赖"],
    }
  }

  if (/临盘|一致性|计划/.test(label)) {
    return {
      title: "下一轮重点：只按事前条件改计划",
      nextActionText: "只在事前写明的条件触发时修改计划。",
      relatedDimensions: ["系统一致性", "临盘改计划"],
    }
  }

  if (/止损|风险边界|离场/.test(label)) {
    return {
      title: "下一轮重点：进场前写清离场条件",
      nextActionText: "进场前必须写下离场条件。",
      relatedDimensions: ["止损执行", "风险边界"],
    }
  }

  return {
    title: `下一轮重点：继续照见${label}`,
    nextActionText: "下一次同类情境出现时，先记录触发、一念和动作，再做复盘。",
    relatedDimensions: [label],
  }
}

function buildGrowthRetestSummary({
  retestChanges,
  highFrequencyThoughts,
  repeatedBehaviors,
  trainingContinuity,
  nextCycleFocus,
}: {
  retestChanges: RetestChange[]
  highFrequencyThoughts: GrowthProfileThought[]
  repeatedBehaviors: GrowthProfileRepeatedBehavior[]
  trainingContinuity: GrowthProfileTrainingContinuity
  nextCycleFocus: GrowthProfileNextCycleFocus
}): GrowthProfileRetestSummary {
  const latestRetest = getLatestRetestChange(retestChanges)
  const changes = latestRetest ? getRetestDimensionChanges(latestRetest) : []
  const improvedDimensions = changes
    .filter((item) => item.direction === "improved")
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
  const declinedDimensions = changes
    .filter((item) => item.direction === "declined")
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
  const stableDimensions = changes.filter((item) => item.direction === "flat")
  const highFrequencyThought = highFrequencyThoughts[0]
  const repeatedBehavior = repeatedBehaviors[0]

  return {
    retestCount: retestChanges.length,
    latestRetestId: latestRetest?.retestId,
    baselineScores: latestRetest?.baselineScores || {},
    currentScores: latestRetest?.currentScores || {},
    deltaScores: latestRetest?.deltaScores || {},
    improvedDimensions,
    declinedDimensions,
    stableDimensions,
    trainingEvidenceSummary: latestRetest?.trainingEvidenceSummary ||
      `已完成 ${trainingContinuity.completedGrowthDays}/7 日训练，训练连续性 ${trainingContinuity.trainingConsistencyScore}%。`,
    highFrequencyThoughtChange: highFrequencyThought
      ? `复测后仍需观察的高频一念：${highFrequencyThought.label}，已累计 ${highFrequencyThought.count} 次证据。`
      : "复测后高频一念仍待更多今日修行和真实复盘确认。",
    repeatedBehaviorChange: repeatedBehavior
      ? `重复行为「${repeatedBehavior.label}」已有 ${repeatedBehavior.count} 次证据，下一轮继续观察是否减弱。`
      : "暂未形成稳定重复行为，继续用真实复盘观察是否减弱。",
    nextCycleFocus,
    conclusionText: retestChanges.length
      ? "你还不是完全不冲动了，但你已经开始在冲动前看见它。"
      : "复测完成后，这里会显示本轮变化证明。",
  }
}

function getLatestRetestChange(retestChanges: RetestChange[]) {
  return [...retestChanges]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .at(0) || null
}

function getRetestDimensionChanges(retestChange: RetestChange): RetestDimensionChange[] {
  if (retestChange.dimensionChanges?.length) return retestChange.dimensionChanges

  return Object.entries(retestChange.deltaScores || {}).map(([key, delta]) => ({
    key,
    label: normalizeLabel(key),
    before: Number(retestChange.baselineScores[key] || 0),
    after: Number(retestChange.currentScores[key] || 0),
    delta: Number(delta || 0),
    direction: getRetestDirection(key, key, Number(delta || 0)),
  }))
}

function buildGrowthDataGaps({
  completedGrowthDays,
  hasTradeReview,
  hasHeartProof,
  hasRetest,
}: {
  completedGrowthDays: number
  hasTradeReview: boolean
  hasHeartProof: boolean
  hasRetest: boolean
}): GrowthProfileDataGap[] {
  const gaps: GrowthProfileDataGap[] = []

  if (!hasTradeReview) {
    gaps.push({
      type: "missing_trade_review",
      message: "还缺少真实交易复盘，暂时只能从今日修行判断一念，无法确认真实下单行为。",
    })
  }

  if (!hasHeartProof) {
    gaps.push({
      type: "missing_heart_proof",
      message: "还没有心证，完成今日修行后会生成第一枚心证。",
    })
  }

  if (completedGrowthDays < 7) {
    gaps.push({
      type: "insufficient_training_days",
      message: "训练未满七日，暂不能生成完整复测变化。",
    })
  }

  if (completedGrowthDays >= 7 && !hasRetest) {
    gaps.push({
      type: "missing_retest",
      message: "七日已满，可以进行复测，生成变化证明。",
    })
  }

  return gaps
}

function buildRetestTrend(retestChanges: ReturnType<typeof normalizeRetestChanges>) {
  return {
    retestCount: retestChanges.length,
    improvedDimensions: uniqueStrings(retestChanges.flatMap((item) => item.improvedDimensions || [])),
    declinedDimensions: uniqueStrings(retestChanges.flatMap((item) => item.declinedDimensions || [])),
  }
}

function buildGrowthArchiveItems(
  growthProfile: GrowthProfileBuildResult["growthProfile"],
  behaviorLoops: BehaviorLoop[],
): GrowthProfileBuildResult["archiveItemsToUpsert"] {
  const retestItem = growthProfile.retestSummary.retestCount > 0
    ? [buildRetestArchiveItem(growthProfile)]
    : []

  return [
    {
      archiveItemId: `archive_growth_profile_${growthProfile.growthProfileId}`,
      userId: growthProfile.userId,
      anonymousId: growthProfile.anonymousId,
      type: "growth_profile",
      sourceId: growthProfile.growthProfileId,
      detailHref: "/living-mirror-growth",
      title: "活镜成长谱",
      summary: `${growthProfile.mirrorLifeStage.label}：下一轮重点是${growthProfile.nextCycleFocus.title.replace("下一轮重点：", "")}。`,
      tags: [
        growthProfile.mirrorLifeStage.label,
        growthProfile.highFrequencyThoughts[0]?.label || "一念待照见",
        growthProfile.affectedDimensions[0]?.label || "影响维度待沉淀",
      ],
      createdAt: growthProfile.updatedAt,
    },
    ...retestItem,
    ...behaviorLoops.map((loop) => ({
      archiveItemId: `archive_behavior_loop_${loop.behaviorLoopId}`,
      userId: loop.userId,
      anonymousId: loop.anonymousId,
      type: "behavior_loop" as const,
      sourceId: loop.behaviorLoopId,
      detailHref: "/cycle-mirror",
      title: "循环之镜",
      summary: `已沉淀 ${loop.repeatCount || 1} 次：${loop.trigger} -> ${loop.thought} -> ${loop.loopBreakAction}。`,
      tags: [String(loop.sourceMirror), loop.thought, ...(loop.affectedDimensions || [])].filter(Boolean).slice(0, 5),
      createdAt: loop.updatedAt,
    })),
  ]
}

function buildRetestArchiveItem(growthProfile: GrowthProfileBuildResult["growthProfile"]) {
  const retestSummary = growthProfile.retestSummary
  const focusChanges = [...retestSummary.improvedDimensions, ...retestSummary.declinedDimensions]
    .slice(0, 3)
    .map((item) => `${item.label}：${item.before} -> ${item.after}`)

  return {
    archiveItemId: `archive_retest_${retestSummary.latestRetestId || growthProfile.growthProfileId}`,
    userId: growthProfile.userId,
    anonymousId: growthProfile.anonymousId,
    type: "retest" as const,
    sourceId: retestSummary.latestRetestId || growthProfile.growthProfileId,
    detailHref: "/practice-change?preview=1",
    title: "复测变化",
    summary: focusChanges.length
      ? `复测变化证明：${focusChanges.join("；")}。下一轮重点：${retestSummary.nextCycleFocus.nextActionText}`
      : `复测变化已入档。下一轮重点：${retestSummary.nextCycleFocus.nextActionText}`,
    tags: [
      "复测变化",
      ...retestSummary.improvedDimensions.map((item) => item.label),
      ...retestSummary.declinedDimensions.map((item) => item.label),
    ].filter(Boolean).slice(0, 5),
    createdAt: growthProfile.updatedAt,
  }
}

function buildGrowthScrollEvents(
  growthProfile: GrowthProfileBuildResult["growthProfile"],
  behaviorLoops: BehaviorLoop[],
): GrowthProfileBuildResult["scrollEventsToUpsert"] {
  const retestNodes = growthProfile.retestSummary.retestCount > 0
    ? [buildRetestScrollNode(growthProfile)]
    : []

  return [
    {
      id: `scroll_growth_profile_${growthProfile.growthProfileId}`,
      type: "growth_profile",
      nodeLabel: "活镜成长谱节点",
      sourceId: growthProfile.growthProfileId,
      detailHref: "/living-mirror-growth",
      title: "活镜成长谱已生成",
      summary: `你的高频一念是 ${growthProfile.highFrequencyThoughts[0]?.label || "待照见"}，当前处于 ${growthProfile.mirrorLifeStage.label}。`,
      thoughtText: growthProfile.highFrequencyThoughts[0]?.label || "待照见",
      actionText: growthProfile.nextCycleFocus.nextActionText,
      proofText: growthProfile.mirrorLifeStage.description,
      affectedDimensions: growthProfile.nextCycleFocus.relatedDimensions,
      tags: [growthProfile.mirrorLifeStage.label, growthProfile.nextCycleFocus.title],
      createdAt: growthProfile.updatedAt,
    },
    ...retestNodes,
    ...behaviorLoops.map((loop) => ({
      id: `scroll_behavior_loop_${loop.behaviorLoopId}`,
      type: "behavior_loop" as const,
      nodeLabel: "循环之镜节点",
      sourceId: loop.behaviorLoopId,
      detailHref: "/cycle-mirror",
      title: "循环之镜显影",
      summary: `你正在重复的循环是：${loop.trigger} → ${loop.thought} → ${loop.action}。`,
      thoughtText: loop.thought,
      actionText: loop.loopBreakAction,
      proofText: `触发：${loop.trigger}；动作：${loop.action}；结果：${loop.result}。`,
      affectedDimensions: loop.affectedDimensions,
      tags: [String(loop.sourceMirror), loop.thought, loop.riskLevel || "low"],
      createdAt: loop.updatedAt,
    })),
  ]
}

function buildRetestScrollNode(growthProfile: GrowthProfileBuildResult["growthProfile"]) {
  const retestSummary = growthProfile.retestSummary

  return {
    id: `scroll_retest_${retestSummary.latestRetestId || growthProfile.growthProfileId}`,
    type: "retest_change" as const,
    nodeLabel: "复测变化节点",
    sourceId: retestSummary.latestRetestId || growthProfile.growthProfileId,
    detailHref: "/practice-change?preview=1",
    title: "复测变化已生成",
    summary: `本轮改善：${formatRetestImprovedSummary(retestSummary.improvedDimensions)}。下一轮重点：${retestSummary.nextCycleFocus.title}。`,
    thoughtText: retestSummary.highFrequencyThoughtChange,
    actionText: retestSummary.nextCycleFocus.nextActionText,
    proofText: retestSummary.trainingEvidenceSummary,
    affectedDimensions: [
      ...retestSummary.improvedDimensions.map((item) => item.label),
      ...retestSummary.declinedDimensions.map((item) => item.label),
    ],
    tags: ["复测变化节点", retestSummary.nextCycleFocus.title],
    createdAt: growthProfile.updatedAt,
  }
}

function formatRetestImprovedSummary(improvedDimensions: GrowthProfileBuildResult["growthProfile"]["retestSummary"]["improvedDimensions"]) {
  if (!improvedDimensions.length) return "仍待下一轮训练继续验证"
  return improvedDimensions.slice(0, 3).map((item) => item.label).join("、")
}

function buildAssistantHandoffPatch(
  growthProfile: GrowthProfileBuildResult["growthProfile"],
  sources: {
    behaviorLoops: BehaviorLoop[]
    heartProofs: NonNullable<GrowthProfileInput["heartProofs"]>
  },
): GrowthProfileBuildResult["assistantHandoffPatch"] {
  const topThought = growthProfile.highFrequencyThoughts[0]?.label || "待照见"
  const latestHeartProof = buildAssistantLatestHeartProof(sources.heartProofs)
  const topBehaviorLoop = buildAssistantTopBehaviorLoop(sources.behaviorLoops)
  const affectedDimensions = growthProfile.affectedDimensions
    .map((dimension) => dimension.label)
    .slice(0, 8)

  return {
    growthProfileId: growthProfile.growthProfileId,
    userId: growthProfile.userId,
    anonymousId: growthProfile.anonymousId,
    reportId: growthProfile.reportId,
    primaryPersona: growthProfile.primaryPersona,
    secondaryPersona: growthProfile.secondaryPersona,
    mirrorLifeStage: growthProfile.mirrorLifeStage,
    latestThought: topThought,
    topThought,
    latestHeartProof,
    topBehaviorLoop,
    affectedDimensions,
    completedGrowthDays: growthProfile.trainingContinuity.completedGrowthDays,
    trainingConsistencyScore: growthProfile.trainingContinuity.trainingConsistencyScore,
    heartProofCount: growthProfile.heartProofCount,
    tradeReviewCount: growthProfile.tradeReviewCount,
    hasTradeReview: growthProfile.sourceSummary.tradeReviewCount > 0,
    hasHeartProof: growthProfile.sourceSummary.heartProofCount > 0,
    hasRetest: growthProfile.sourceSummary.retestChangeCount > 0,
    nextCycleFocus: growthProfile.nextCycleFocus,
    suggestedOpening: buildAssistantSuggestedOpening({
      topThought,
      topBehaviorLoop,
      dataGaps: growthProfile.dataGaps,
      nextCycleFocus: growthProfile.nextCycleFocus,
    }),
    forbiddenPhrases: assistantHandoffForbiddenPhrases,
    complianceText: assistantHandoffComplianceText,
  }
}

function buildAssistantLatestHeartProof(heartProofs: NonNullable<GrowthProfileInput["heartProofs"]>) {
  const latestProof = [...heartProofs]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .at(0)

  if (!latestProof) return null

  return {
    heartProofId: latestProof.heartProofId,
    sourceType: latestProof.sourceType,
    sourceId: latestProof.sourceId,
    thoughtType: latestProof.thoughtType,
    thoughtLabel: latestProof.thoughtLabel || getGrowthThoughtLabel(latestProof.thoughtType),
    reflectionText: latestProof.reflectionText,
    affectedDimensions: latestProof.affectedDimensions,
    proofText: latestProof.proofText,
    nextActionText: latestProof.nextActionText,
    createdAt: latestProof.createdAt,
  }
}

function buildAssistantTopBehaviorLoop(behaviorLoops: BehaviorLoop[]) {
  const topLoop = [...behaviorLoops]
    .sort((left, right) => (
      riskRank(right.riskLevel) - riskRank(left.riskLevel) ||
      (right.repeatCount || 1) - (left.repeatCount || 1) ||
      (right.confidence || 0) - (left.confidence || 0) ||
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    ))
    .at(0)

  if (!topLoop) return null

  return {
    behaviorLoopId: topLoop.behaviorLoopId,
    trigger: topLoop.trigger,
    thought: topLoop.thought,
    action: topLoop.action,
    result: topLoop.result,
    selfStory: topLoop.selfStory,
    repeatCount: topLoop.repeatCount,
    riskLevel: topLoop.riskLevel,
    confidence: topLoop.confidence,
    loopBreakAction: topLoop.loopBreakAction,
    affectedDimensions: topLoop.affectedDimensions,
    firstSeenAt: topLoop.firstSeenAt,
    lastSeenAt: topLoop.lastSeenAt,
  }
}

function dedupeGrowthBehaviorLoops(loops: BehaviorLoop[]) {
  return Array.from(new Map(loops.map((loop) => [loop.signature || loop.behaviorLoopId, loop])).values())
    .sort((left, right) => riskRank(right.riskLevel) - riskRank(left.riskLevel) || (right.repeatCount || 1) - (left.repeatCount || 1))
}

function getGrowthRecordId(record: DailyGrowth, index: number) {
  return record.dailyGrowthId || record.growthRecordId || `daily_growth_${record.trainingDay || index + 1}`
}

function getRiskRadarDimensions(riskRadar: unknown) {
  if (!riskRadar) return []
  if (Array.isArray(riskRadar)) {
    return riskRadar
      .map((item) => ({
        label: normalizeLabel(item.label || item.key),
        value: Number(item.value || 0),
      }))
      .filter((item) => item.label)
      .sort((left, right) => right.value - left.value)
  }

  const labelByKey: Record<string, string> = {
    impulse: "追涨冲动",
    fear: "恐惧牵动",
    ego: "证明执念",
    stopLossExecution: "止损执行",
    reviewAbility: "复盘能力",
    systemConsistency: "系统一致性",
    riskControl: "风险边界",
    independentJudgment: "独立判断",
  }

  return Object.entries(riskRadar as Record<string, number>)
    .map(([key, value]) => ({
      label: labelByKey[key] || key,
      value: Number(value || 0),
    }))
    .filter((item) => item.label)
    .sort((left, right) => right.value - left.value)
}

function buildStableGrowthProfileId({ ownerId, reportId }: { ownerId: string; reportId?: string }) {
  return `growth_profile_${hashText(`${ownerId || "local-anonymous"}_${reportId || "no_report"}_active`)}`
}

function riskRank(value: BehaviorLoop["riskLevel"]) {
  if (value === "high") return 3
  if (value === "medium") return 2
  if (value === "low") return 1
  return 0
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeLabel(value)).filter(Boolean)))
}

export function buildLivingMirrorGrowthProfile(input: LivingMirrorGrowthProfileInput = {}): LivingMirrorGrowthProfile {
  const now = input.now || new Date().toISOString()
  const mirrorReport = input.mirrorReport || null
  const dailyGrowth = input.dailyGrowth || null
  const practiceChange = input.practiceChange || null
  const heartProofs = input.heartProofs || []
  const tradeReviews = input.tradeReviews || []
  const behaviorLoops = input.behaviorLoops || []
  const retestComparisons = input.retestComparisons || []
  const userId = mirrorReport?.userId || dailyGrowth?.userId || tradeReviews.find((review) => review.userId)?.userId || undefined
  const anonymousId = mirrorReport?.anonymousId || dailyGrowth?.anonymousId || behaviorLoops.find((loop) => loop.anonymousId)?.anonymousId || "local-anonymous"
  const reportId = mirrorReport?.reportId || dailyGrowth?.reportId
  const sourceEvidence = buildSourceEvidence(input, now)
  const thoughtCounts = countThoughts({ dailyGrowth, heartProofs, tradeReviews, behaviorLoops })
  const highFrequencyThought = thoughtCounts[0] || {
    label: "待照见",
    count: 0,
    evidenceIds: [],
  }
  const repeatedBehaviors = countRepeatedBehaviors({ mirrorReport, dailyGrowth, heartProofs, tradeReviews, behaviorLoops })
  const affectedDimensions = buildAffectedDimensions({ mirrorReport, practiceChange, heartProofs, tradeReviews, behaviorLoops, retestComparisons })
  const trainingContinuity = buildTrainingContinuity({
    dailyGrowth,
    practiceChange,
    heartProofs,
    tradeReviews,
    behaviorLoops,
    retestComparisons,
  })
  const mirrorLifeStage = buildMirrorLifeStage({
    continuity: trainingContinuity,
    evidenceCount: sourceEvidence.length,
    hasMirrorReport: !!mirrorReport,
    hasTradeReview: tradeReviews.length > 0,
    hasBehaviorLoop: behaviorLoops.length > 0,
    hasRetest: retestComparisons.length > 0,
  })
  const retestSummary = buildRetestSummary(retestComparisons, trainingContinuity.completedDays)
  const nextCycleFocus = buildNextCycleFocus({
    highFrequencyThought,
    repeatedBehaviors,
    affectedDimensions,
    behaviorLoops,
    retestComparisons,
    mirrorLifeStage,
  })
  const growthProfileId = buildGrowthProfileId({
    userId,
    anonymousId,
    reportId,
    evidenceCount: sourceEvidence.length,
    updatedAt: now,
  })

  return {
    schemaVersion: "living_mirror_growth_profile_v1",
    growth_profile_id: growthProfileId,
    growthProfileId,
    userId,
    anonymousId,
    reportId,
    primaryPersona: mirrorReport?.primaryPersona || "待照见",
    secondaryPersona: mirrorReport?.secondaryPersona || "待照见",
    highFrequencyThought,
    repeatedBehaviors,
    affectedDimensions,
    trainingContinuity,
    heartProofCount: heartProofs.length,
    tradeReviewCount: tradeReviews.length,
    retestSummary,
    nextCycleFocus,
    mirrorLifeStage,
    sourceEvidence,
    sourceSummary: {
      mirrorReportCount: mirrorReport ? 1 : 0,
      dailyGrowthCount: dailyGrowth ? 1 : 0,
      heartProofCount: heartProofs.length,
      tradeReviewCount: tradeReviews.length,
      behaviorLoopCount: behaviorLoops.length,
      retestChangeCount: retestComparisons.length,
      evidenceCount: sourceEvidence.length,
    },
    complianceText: livingMirrorGrowthComplianceText,
    updatedAt: now,
  }
}

function buildSourceEvidence(input: LivingMirrorGrowthProfileInput, now: string): LivingMirrorGrowthEvidence[] {
  const evidence: LivingMirrorGrowthEvidence[] = []
  const mirrorReport = input.mirrorReport || null
  const dailyGrowth = input.dailyGrowth || null
  const heartProofs = input.heartProofs || []
  const tradeReviews = input.tradeReviews || []
  const behaviorLoops = input.behaviorLoops || []
  const retestComparisons = input.retestComparisons || []

  if (mirrorReport) {
    evidence.push({
      id: mirrorReport.reportId,
      sourceType: "mirror_report",
      label: "心镜报告",
      summary: mirrorReport.headline || mirrorReport.coreProblem || "已生成心镜报告。",
      createdAt: mirrorReport.createdAt || now,
    })
  }

  if (dailyGrowth) {
    evidence.push({
      id: dailyGrowth.growthRecordId,
      sourceType: "daily_growth",
      label: `Day ${dailyGrowth.trainingDay} 今日修行`,
      summary: dailyGrowth.reflectionText || getThoughtLabel(dailyGrowth.thoughtType),
      createdAt: dailyGrowth.completedAt || now,
    })
  }

  heartProofs.forEach((proof) => {
    evidence.push({
      id: proof.heartProofId,
      sourceType: "heart_proof",
      label: proof.sourceType === "trade_review" ? "复盘心证" : "今日心证",
      summary: proof.proofText || proof.reflectionText,
      createdAt: proof.createdAt || now,
    })
  })

  tradeReviews.forEach((review) => {
    evidence.push({
      id: review.id,
      sourceType: "trade_review",
      label: "真实交易复盘",
      summary: review.reviewText || review.strongestThought || "已完成一次真实复盘。",
      createdAt: review.createdAt || review.tradeDate || now,
    })
  })

  behaviorLoops.forEach((loop) => {
    evidence.push({
      id: loop.behaviorLoopId,
      sourceType: "behavior_loop",
      label: "循环之镜",
      summary: `已沉淀 ${loop.repeatCount || 1} 次：触发「${loop.trigger}」；一念「${loop.thought}」；破环动作「${loop.loopBreakAction}」。`,
      createdAt: loop.updatedAt || loop.createdAt || now,
    })
  })

  if (retestComparisons.length) {
    evidence.push({
      id: `retest_${retestComparisons.length}`,
      sourceType: "retest_change",
      label: "复测变化",
      summary: `复测已生成 ${retestComparisons.length} 项变化。`,
      createdAt: now,
    })
  }

  return evidence.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

function countThoughts({
  dailyGrowth,
  heartProofs,
  tradeReviews,
  behaviorLoops,
}: Pick<LivingMirrorGrowthProfileInput, "dailyGrowth" | "heartProofs" | "tradeReviews" | "behaviorLoops">): LivingMirrorGrowthCountItem[] {
  const counter = new Map<string, LivingMirrorGrowthCountItem>()

  if (dailyGrowth?.thoughtType) {
    addCount(counter, getThoughtLabel(dailyGrowth.thoughtType), `daily_growth:${dailyGrowth.growthRecordId}`)
  }

  ;(heartProofs || []).forEach((proof) => {
    addCount(counter, proof.thoughtLabel || proof.thoughtType || "今日一念", `heart_proof:${proof.heartProofId}`)
  })

  ;(tradeReviews || []).forEach((review) => {
    addCount(counter, review.strongestThought || "复盘一念", `trade_review:${review.id}`)
  })

  ;(behaviorLoops || []).forEach((loop) => {
    addCount(counter, loop.thought || "循环一念", `behavior_loop:${loop.behaviorLoopId}`, loop.repeatCount || 1)
  })

  return sortCountItems(counter)
}

function countRepeatedBehaviors({
  mirrorReport,
  dailyGrowth,
  heartProofs,
  tradeReviews,
  behaviorLoops,
}: Pick<LivingMirrorGrowthProfileInput, "mirrorReport" | "dailyGrowth" | "heartProofs" | "tradeReviews" | "behaviorLoops">): LivingMirrorGrowthCountItem[] {
  const counter = new Map<string, LivingMirrorGrowthCountItem>()

  if (mirrorReport?.highRiskScenario) addCount(counter, "高危场景重复", `mirror_report:${mirrorReport.reportId}`)
  if (dailyGrowth?.checkinType) addCount(counter, getCheckinBehavior(dailyGrowth.checkinType), `daily_growth:${dailyGrowth.growthRecordId}`)

  ;(heartProofs || []).forEach((proof) => {
    if (proof.behaviorType) addCount(counter, proof.behaviorType, `heart_proof:${proof.heartProofId}`)
  })

  ;(tradeReviews || []).forEach((review) => {
    if (review.detectedMirror) addCount(counter, review.detectedMirror, `trade_review:${review.id}`)
    ;(review.behaviorTags || []).forEach((tag) => addCount(counter, tag, `trade_review:${review.id}`))
    if (review.changedPlanDuringTrade) addCount(counter, "临场改计划", `trade_review:${review.id}`)
  })

  ;(behaviorLoops || []).forEach((loop) => {
    addCount(counter, loop.action, `behavior_loop:${loop.behaviorLoopId}`, loop.repeatCount || 1)
    addCount(counter, loop.result, `behavior_loop:${loop.behaviorLoopId}`, loop.repeatCount || 1)
  })

  return sortCountItems(counter).slice(0, 6)
}

function buildAffectedDimensions({
  mirrorReport,
  practiceChange,
  heartProofs,
  tradeReviews,
  behaviorLoops,
  retestComparisons,
}: Pick<LivingMirrorGrowthProfileInput, "mirrorReport" | "practiceChange" | "heartProofs" | "tradeReviews" | "behaviorLoops" | "retestComparisons">): LivingMirrorGrowthDimension[] {
  const counter = new Map<string, LivingMirrorGrowthDimension>()

  if (mirrorReport) {
    addDimension(counter, "风险雷达", 2, "mirror_report", `mirror_report:${mirrorReport.reportId}`)
    addDimension(counter, mirrorReport.primaryPersona, 2, "mirror_report", `mirror_report:${mirrorReport.reportId}`)
  }

  ;(practiceChange?.metrics || []).forEach((metric) => {
    addDimension(counter, metric.label, 1, "daily_growth", `practice_metric:${metric.key}`)
  })

  ;(heartProofs || []).forEach((proof) => {
    proof.affectedDimensions.forEach((dimension) => {
      addDimension(counter, dimension, 2, "heart_proof", `heart_proof:${proof.heartProofId}`)
    })
  })

  ;(tradeReviews || []).forEach((review) => {
    ;(review.detectedThieves || []).forEach((thief) => {
      addDimension(counter, `心贼：${thief}`, 2, "trade_review", `trade_review:${review.id}`)
    })
    ;(review.behaviorTags || []).forEach((tag) => {
      addDimension(counter, tag, 1, "trade_review", `trade_review:${review.id}`)
    })
  })

  ;(behaviorLoops || []).forEach((loop) => {
    addDimension(counter, String(loop.sourceMirror), 2, "behavior_loop", `behavior_loop:${loop.behaviorLoopId}`)
    addDimension(counter, loop.thought, 1, "behavior_loop", `behavior_loop:${loop.behaviorLoopId}`)
    ;(loop.affectedDimensions || []).forEach((dimension) => {
      addDimension(counter, dimension, Math.max(1, loop.repeatCount || 1), "behavior_loop", `behavior_loop:${loop.behaviorLoopId}`)
    })
  })

  ;(retestComparisons || []).forEach((item) => {
    addDimension(counter, item.label, Math.abs(item.delta) > 0 ? 2 : 1, "retest_change", `retest:${item.key}`)
  })

  return Array.from(counter.values())
    .sort((left, right) => right.weight - left.weight || left.label.localeCompare(right.label))
    .slice(0, 8)
}

function buildTrainingContinuity({
  dailyGrowth,
  practiceChange,
  heartProofs,
  tradeReviews,
  behaviorLoops,
  retestComparisons,
}: Pick<LivingMirrorGrowthProfileInput, "dailyGrowth" | "practiceChange" | "heartProofs" | "tradeReviews" | "behaviorLoops" | "retestComparisons">) {
  const completedDays = Math.max(
    Number(dailyGrowth?.completedDays || 0),
    (practiceChange?.records || []).filter((record) => (record.status || "completed") === "completed").length,
  )
  const heartProofCount = (heartProofs || []).length
  const tradeReviewCount = (tradeReviews || []).length
  const behaviorLoopCount = (behaviorLoops || []).length
  const retestChangeCount = (retestComparisons || []).length
  const currentStreak = Math.min(7, Math.max(completedDays, heartProofCount ? 1 : 0))

  return {
    completedDays,
    totalDays: 7,
    currentStreak,
    heartProofCount,
    tradeReviewCount,
    behaviorLoopCount,
    retestChangeCount,
    statusText: completedDays >= 7
      ? "七日训练已完成，可进入复测变化。"
      : `已沉淀 ${completedDays}/7 日训练，继续让心证进入活镜。`,
  }
}

function buildMirrorLifeStage({
  continuity,
  evidenceCount,
  hasMirrorReport,
  hasTradeReview,
  hasBehaviorLoop,
  hasRetest,
}: {
  continuity: ReturnType<typeof buildTrainingContinuity>
  evidenceCount: number
  hasMirrorReport: boolean
  hasTradeReview: boolean
  hasBehaviorLoop: boolean
  hasRetest: boolean
}): LivingMirrorTreeStage {
  if (hasRetest && continuity.completedDays >= 7) {
    return makeTreeStage("evergreen", "心镜常青", "复测后继续生长", 96, "心镜已经形成一轮训练、复盘与复测证据。", "带着变化重新入照心。")
  }

  if (hasRetest) {
    return makeTreeStage("blossoming", "心镜开花", "复测变化已显", 82, "复测变化已经出现，下一步是让助教承接重点训练。", "生成助教承接摘要。")
  }

  if (continuity.completedDays >= 3 && (hasTradeReview || hasBehaviorLoop)) {
    return makeTreeStage("branching", "心镜成枝", "复盘证据入树", 68, "每日修行与真实复盘已经开始互相印证。", "继续补三次真实复盘。")
  }

  if (hasTradeReview || hasBehaviorLoop || evidenceCount >= 3) {
    return makeTreeStage("rooted", "心镜生根", "真实行为入土", 52, "活镜不再只依赖测评，真实行为已经进入成长谱。", "完成下一次真实交易复盘。")
  }

  if (continuity.completedDays >= 1 || evidenceCount >= 2) {
    return makeTreeStage("sprout", "心镜发芽", "今日心证已落", 34, "第一枚今日心证已经落下，成长谱开始有生命。", "继续完成 Day 2 今日修行。")
  }

  if (hasMirrorReport) {
    return makeTreeStage("seed", "心镜种子", "心镜报告成种", 18, "心镜报告已经成为成长谱的第一枚种子。", "完成一次今日修行。")
  }

  return makeTreeStage("seed", "待入照心", "等待第一枚种子", 0, "先完成心镜报告，成长谱才会开始生长。", "进入交易人格测试。")
}

function buildRetestSummary(
  retestComparisons: NonNullable<LivingMirrorGrowthProfileInput["retestComparisons"]>,
  completedDays: number,
) {
  if (!retestComparisons.length) {
    const remainingDays = Math.max(0, 7 - completedDays)
    if (remainingDays > 0) return `复测尚未开启，距离七日完整训练还差 ${remainingDays} 日。`
    return "七日训练已满，等待生成复测变化。"
  }

  const focusItems = [...retestComparisons]
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 3)
    .map((item) => `${item.label} ${formatDelta(item.delta)}`)

  return focusItems.length
    ? `复测已记录 ${retestComparisons.length} 项变化，重点观察：${focusItems.join("；")}。`
    : `复测已记录 ${retestComparisons.length} 项变化，等待下一轮照见继续验证。`
}

function buildNextCycleFocus({
  highFrequencyThought,
  repeatedBehaviors,
  affectedDimensions,
  behaviorLoops,
  retestComparisons,
  mirrorLifeStage,
}: {
  highFrequencyThought: LivingMirrorGrowthCountItem
  repeatedBehaviors: LivingMirrorGrowthCountItem[]
  affectedDimensions: LivingMirrorGrowthDimension[]
  behaviorLoops: NonNullable<LivingMirrorGrowthProfileInput["behaviorLoops"]>
  retestComparisons: NonNullable<LivingMirrorGrowthProfileInput["retestComparisons"]>
  mirrorLifeStage: LivingMirrorTreeStage
}) {
  const dominantLoop = [...behaviorLoops]
    .sort((left, right) => (right.repeatCount || 1) - (left.repeatCount || 1) || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .at(0)
  if (dominantLoop) {
    return `下一轮先照见「${dominantLoop.thought}」循环：${dominantLoop.loopBreakAction}`
  }

  const retestFocus = [...retestComparisons]
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .at(0)
  if (retestFocus) {
    return `下一轮围绕「${retestFocus.label}」继续留证，观察它在真实复盘中如何出现。`
  }

  const repeatedBehavior = repeatedBehaviors.at(0)
  if (repeatedBehavior?.count) {
    return `下一轮先看见「${repeatedBehavior.label}」如何从念头变成动作。`
  }

  const dimension = affectedDimensions.at(0)
  if (dimension) {
    return `下一轮优先观察「${dimension.label}」，把它落到一次今日修行或真实复盘里。`
  }

  if (highFrequencyThought.count) {
    return `下一轮先照见「${highFrequencyThought.label}」出现时的触发、动作与结果。`
  }

  return mirrorLifeStage.nextActionText
}

function makeTreeStage(
  key: LivingMirrorTreeStage["key"],
  title: string,
  treeStage: string,
  growthLevel: number,
  description: string,
  nextActionText: string,
): LivingMirrorTreeStage {
  return {
    key,
    title,
    treeStage,
    growthLevel,
    description,
    nextActionText,
  }
}

function addCount(counter: Map<string, LivingMirrorGrowthCountItem>, label: string, evidenceId: string, amount = 1) {
  const key = normalizeLabel(label)
  if (!key) return
  const current = counter.get(key) || { label: key, count: 0, evidenceIds: [] }
  current.count += Math.max(1, amount)
  if (!current.evidenceIds.includes(evidenceId)) current.evidenceIds.push(evidenceId)
  counter.set(key, current)
}

function addDimension(
  counter: Map<string, LivingMirrorGrowthDimension>,
  label: string,
  weight: number,
  sourceType: LivingMirrorGrowthSourceType,
  evidenceId: string,
) {
  const key = normalizeLabel(label)
  if (!key) return
  const current = counter.get(key) || { label: key, weight: 0, sourceTypes: [], evidenceIds: [] }
  current.weight += weight
  if (!current.sourceTypes.includes(sourceType)) current.sourceTypes.push(sourceType)
  if (!current.evidenceIds.includes(evidenceId)) current.evidenceIds.push(evidenceId)
  counter.set(key, current)
}

function sortCountItems(counter: Map<string, LivingMirrorGrowthCountItem>) {
  return Array.from(counter.values())
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
}

function normalizeLabel(value?: string | null) {
  return String(value || "").trim()
}

function getCheckinBehavior(value: string) {
  if (value === "ready") return "盘前立界"
  if (value === "observe") return "只观察"
  if (value === "traded") return "交易后省察"
  return "今日修行"
}

function formatDelta(delta: number) {
  if (delta === 0) return "持平"
  return delta > 0 ? `+${delta}` : `${delta}`
}

function buildGrowthProfileId({
  userId,
  anonymousId,
  reportId,
  evidenceCount,
  updatedAt,
}: {
  userId?: string
  anonymousId: string
  reportId?: string
  evidenceCount: number
  updatedAt: string
}) {
  const owner = userId || anonymousId || "local"
  const report = reportId || "no_report"
  const stamp = updatedAt.replace(/\D/g, "").slice(0, 14) || "now"
  return `growth_profile_${hashText(`${owner}_${report}_${evidenceCount}_${stamp}`)}`
}

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(36)
}
