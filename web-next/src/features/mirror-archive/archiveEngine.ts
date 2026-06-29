import { compareRiskRadarSnapshots, type PracticeChangeState, type PracticeRadarComparison } from "@/features/assessment/practice-change"
import { assessmentStorageKeys, getStorage } from "@/features/assessment/storage"
import { type DailyGrowthState, getCheckinLabel, getThoughtLabel } from "@/features/assessment/sprint10/trainingTypes"
import { loadHeartProofs } from "@/features/heart-proof/heartProofStorage"
import { loadOneThoughtRecords } from "@/data/insight-engine/today-one-thought"
import { ensureBehaviorLoopFromTradeReview, ensureBehaviorLoopsFromHeartProofs, loadBehaviorLoops } from "@/features/living-mirror-growth/behaviorLoopStorage"
import type { BehaviorLoop } from "@/features/living-mirror-growth/behaviorLoopTypes"
import { buildLivingMirrorGrowthProfileFromLocal, loadGrowthProfileArchiveItems, recomputeAndSaveGrowthProfile } from "@/features/living-mirror-growth/growthProfileStorage"
import type { GrowthProfile, LivingMirrorGrowthProfile } from "@/features/living-mirror-growth/growthProfileTypes"
import { loadMirrorReport } from "@/features/mirror-report/mirrorReportStorage"
import { tradeReviewLastResultStorageKey } from "@/features/trade-review/trade-review"
import type { DataBindingUserSummaryResponse } from "../../../../packages/contracts/data-binding"
import type {
  ArchiveIndex as ServerArchiveIndex,
  ArchiveItem as ServerArchiveItem,
  MirrorArchive as ServerMirrorArchive,
  TradeReview,
} from "../../../../packages/contracts/living-mirror"

import type { ArchiveItem, MirrorArchiveData } from "./archiveTypes"

export const mirrorArchiveSource = "localStorage"

type MirrorArchiveApiPayload = {
  archiveIndex?: ServerArchiveIndex | null
  archive_index?: ServerArchiveIndex | null
  mirrorArchive?: ServerMirrorArchive | null
  mirror_archive?: ServerMirrorArchive | null
}

export type ArchiveTypeFilter =
  | "all"
  | "trade_review"
  | "mistake_card"
  | "kline_record"
  | "training_bookmark"
  | "mirror_report"
  | "growth_projection"
  | "intervention_event"
  | "execution_plan"

export const archiveTypeFilters: Array<{ key: ArchiveTypeFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "trade_review", label: "真实复盘" },
  { key: "mistake_card", label: "错题卡" },
  { key: "kline_record", label: "K线训练" },
  { key: "training_bookmark", label: "训练收藏" },
  { key: "mirror_report", label: "心镜报告" },
  { key: "growth_projection", label: "成长谱" },
  { key: "intervention_event", label: "知行提醒" },
  { key: "execution_plan", label: "执行计划" },
]

export function mapServerMirrorArchiveData(payload: MirrorArchiveApiPayload | null | undefined): MirrorArchiveData | null {
  if (!payload) return null

  const mirrorArchive = payload.mirrorArchive || payload.mirror_archive
  const archiveIndex = payload.archiveIndex || payload.archive_index || mirrorArchive?.archiveIndex || mirrorArchive?.archive_index || null
  const rawItems = archiveIndex?.latestItems || archiveIndex?.latest_items || mirrorArchive?.items || []
  if (!archiveIndex && rawItems.length === 0) return null

  return buildMirrorArchiveDataFromServerItems(rawItems, archiveIndex)
}

export function mapSummaryMirrorArchiveData(summary: DataBindingUserSummaryResponse | null | undefined): MirrorArchiveData | null {
  if (!summary) return null
  return mapServerMirrorArchiveData({
    archiveIndex: summary.archiveIndex,
    archive_index: summary.archive_index,
    mirror_archive: summary.mirror_archive,
  })
}

export function filterArchiveItems(items: ArchiveItem[], selectedArchiveType: ArchiveTypeFilter) {
  if (selectedArchiveType === "all") return items
  if (selectedArchiveType === "growth_projection") {
    return items.filter((item) => item.type === "growth_projection" || item.type === "growth_profile")
  }
  return items.filter((item) => item.type === selectedArchiveType)
}

export function getArchiveTypeLabel(type: string) {
  if (type === "trade_review") return "真实复盘"
  if (type === "mistake_card") return "错题卡"
  if (type === "kline_record") return "K线训练"
  if (type === "training_bookmark") return "训练收藏"
  if (type === "mirror_report") return "心镜报告"
  if (type === "growth_projection" || type === "growth_profile") return "成长谱"
  if (type === "intervention_event") return "知行提醒"
  if (type === "execution_plan") return "执行计划"
  if (type === "weekly_mirror") return "本周活镜"
  if (type === "growth_record") return "成长记录"
  if (type === "heart_proof") return "心证"
  if (type === "one_thought_record") return "一念记录"
  if (type === "retest") return "复测变化"
  if (type === "behavior_loop") return "循环识别"
  return "档案"
}

function buildMirrorArchiveDataFromServerItems(rawItems: ServerArchiveItem[], archiveIndex: ServerArchiveIndex | null): MirrorArchiveData {
  const allItems = rawItems
    .map(toServerArchiveItem)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime())
  const byType = archiveIndex?.byType || archiveIndex?.by_type || countItemsByType(allItems)
  const updatedAt = archiveIndex?.updatedAt || archiveIndex?.updated_at || allItems[0]?.updatedAt || allItems[0]?.createdAt

  return {
    summary: {
      totalCount: archiveIndex?.totalCount ?? archiveIndex?.total_count ?? allItems.length,
      byType,
      reportCount: byType.mirror_report || 0,
      mirrorReportCount: byType.mirror_report || 0,
      completedDays: 0,
      heartProofCount: byType.heart_proof || 0,
      oneThoughtRecordCount: byType.one_thought_record || 0,
      tradeReviewCount: byType.trade_review || 0,
      mistakeCardCount: byType.mistake_card || 0,
      klineRecordCount: byType.kline_record || 0,
      trainingBookmarkCount: byType.training_bookmark || 0,
      growthProjectionCount: (byType.growth_projection || 0) + (byType.growth_profile || 0),
      growthProfileCount: (byType.growth_projection || 0) + (byType.growth_profile || 0),
      interventionEventCount: byType.intervention_event || 0,
      executionPlanCount: byType.execution_plan || 0,
      retestCount: byType.retest || 0,
      behaviorLoopCount: byType.behavior_loop || 0,
      currentPersona: "正式档案",
      retestStatus: byType.retest ? "已完成复测" : "待复测",
      updatedAt,
    },
    sections: {
      reports: allItems.filter((item) => item.type === "mirror_report"),
      growthProfiles: allItems.filter((item) => item.type === "growth_projection" || item.type === "growth_profile"),
      growthRecords: allItems.filter((item) => item.type === "growth_record"),
      tradeReviews: allItems.filter((item) => item.type === "trade_review"),
      heartProofs: allItems.filter((item) => item.type === "heart_proof"),
      oneThoughtRecords: allItems.filter((item) => item.type === "one_thought_record"),
      retests: allItems.filter((item) => item.type === "retest"),
      behaviorLoops: allItems.filter((item) => item.type === "behavior_loop"),
      mistakeCards: allItems.filter((item) => item.type === "mistake_card"),
      klineRecords: allItems.filter((item) => item.type === "kline_record"),
      trainingBookmarks: allItems.filter((item) => item.type === "training_bookmark"),
      mirrorReports: allItems.filter((item) => item.type === "mirror_report"),
      growthProjections: allItems.filter((item) => item.type === "growth_projection"),
      interventionEvents: allItems.filter((item) => item.type === "intervention_event"),
      executionPlans: allItems.filter((item) => item.type === "execution_plan"),
    },
    allItems,
  }
}

function toServerArchiveItem(item: ServerArchiveItem): ArchiveItem {
  const record = item as unknown as Record<string, unknown>
  const type = readString(record, ["type"], "note")
  const sourceId = readString(record, ["sourceId", "source_id"], item.id || "unknown-source")
  const sourceType = readString(record, ["sourceType", "source_type"], type)
  const sceneTags = readStringArray(record, ["sceneTags", "scene_tags"])
  const errorType = readOptionalString(record, ["errorType", "error_type"])
  const firstThought = readOptionalString(record, ["firstThought", "first_thought"])
  const executionResult = readOptionalString(record, ["executionResult", "execution_result"])
  const segmentId = readOptionalString(record, ["segmentId", "segment_id"])
  const trainingPackId = readOptionalString(record, ["trainingPackId", "training_pack_id"])
  const createdAt = readString(record, ["createdAt", "created_at"], new Date().toISOString())
  const updatedAt = readString(record, ["updatedAt", "updated_at"], createdAt)

  return {
    archiveItemId: readString(record, ["id"], `archive_${type}_${sourceId}`),
    userId: readOptionalString(record, ["userId", "user_id"]),
    anonymousId: "server-archive",
    type,
    sourceId,
    sourceType,
    detailHref: getArchiveDetailHref(type),
    title: readString(record, ["title"], getArchiveTypeLabel(type)),
    summary: readString(record, ["summary"], "一次可回溯的心镜记录。"),
    tags: [
      getArchiveTypeLabel(type),
      errorType,
      firstThought,
      executionResult,
      ...sceneTags,
    ].filter(Boolean).slice(0, 6) as string[],
    errorType,
    firstThought,
    sceneTags,
    executionResult,
    segmentId,
    trainingPackId,
    createdAt,
    updatedAt,
    metadata: normalizeRecord(record.metadata),
  }
}

function countItemsByType(items: ArchiveItem[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1
    return counts
  }, {})
}

function getArchiveDetailHref(type: string) {
  if (type === "trade_review" || type === "mistake_card") return "/trade-review"
  if (type === "growth_projection" || type === "growth_profile") return "/living-mirror-growth"
  if (type === "mirror_report") return "/assessment-result"
  return "/mirror-archive"
}

function readOptionalString(record: Record<string, unknown>, keys: string[]) {
  const value = readString(record, keys, "")
  return value || undefined
}

function readString(record: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return fallback
}

function readStringArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
    if (typeof value === "string" && value.trim()) {
      return value.split(/[,，/]/).map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function loadMirrorArchiveData(): MirrorArchiveData {
  const report = loadMirrorReport()
  const growth = getStorage<DailyGrowthState | null>("ym_living_mirror_growth_v1", null)
  const practice = getStorage<PracticeChangeState | null>(assessmentStorageKeys.practiceChange, null)
  const heartProofs = loadHeartProofs()
  const oneThoughtRecords = loadOneThoughtRecords().filter((record) => record.completed)
  const latestTradeReview = getStorage<TradeReview | null>(tradeReviewLastResultStorageKey, null)
  const retestComparison = compareRiskRadarSnapshots(practice?.baselineReport, practice?.retestReport)
  const growthBuildResult = recomputeAndSaveGrowthProfile()
  const latestBehaviorLoop = ensureBehaviorLoopFromTradeReview(latestTradeReview)
  const heartProofBehaviorLoops = ensureBehaviorLoopsFromHeartProofs(heartProofs)
  const behaviorLoops = dedupeBehaviorLoops([
    ...growthBuildResult.behaviorLoops,
    ...(latestBehaviorLoop ? [latestBehaviorLoop] : []),
    ...heartProofBehaviorLoops,
    ...loadBehaviorLoops(),
  ])
  const growthProfile = buildLivingMirrorGrowthProfileFromLocal()
  const persistedArchiveItems = loadGrowthProfileArchiveItems()
  const reports = report ? [toReportArchiveItem(report)] : []
  const growthProfiles = dedupeArchiveItems([
    toActiveGrowthProfileArchiveItem(growthBuildResult.growthProfile),
    ...(growthProfile.sourceSummary.evidenceCount ? [toGrowthProfileArchiveItem(growthProfile)] : []),
    ...persistedArchiveItems.filter((item) => item.type === "growth_profile"),
  ])
  const growthRecords = growth ? [toGrowthArchiveItem(growth)] : []
  const tradeReviews = latestTradeReview ? [toTradeReviewArchiveItem(latestTradeReview)] : []
  const behaviorLoopItems = dedupeArchiveItems([
    ...behaviorLoops.map(toBehaviorLoopArchiveItem),
    ...persistedArchiveItems.filter((item) => item.type === "behavior_loop"),
  ])
  const heartProofItems: ArchiveItem[] = []
  const oneThoughtRecordItems = oneThoughtRecords.map(toOneThoughtRecordArchiveItem)
  const retests = dedupeArchiveItems([
    ...(retestComparison.length ? [toRetestArchiveItem(retestComparison, practice)] : []),
    ...persistedArchiveItems.filter((item) => item.type === "retest"),
  ])
  const allItems = [
    ...reports,
    ...growthProfiles,
    ...growthRecords,
    ...tradeReviews,
    ...behaviorLoopItems,
    ...heartProofItems,
    ...oneThoughtRecordItems,
    ...retests,
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  return {
    summary: {
      reportCount: reports.length,
      completedDays: growth?.completedDays ?? 0,
      heartProofCount: heartProofItems.length,
      oneThoughtRecordCount: oneThoughtRecordItems.length,
      tradeReviewCount: tradeReviews.length,
      growthProfileCount: growthProfiles.length,
      behaviorLoopCount: behaviorLoopItems.length,
      retestCount: retests.length,
      currentPersona: report?.primaryPersona || "待照见",
      retestStatus: retests.length ? "已完成复测" : (growth?.completedDays ?? 0) >= 7 ? "可复测" : "训练中",
    },
    sections: {
      reports,
      growthProfiles,
      growthRecords,
      tradeReviews,
      behaviorLoops: behaviorLoopItems,
      heartProofs: heartProofItems,
      oneThoughtRecords: oneThoughtRecordItems,
      retests,
    },
    allItems,
  }
}

function toOneThoughtRecordArchiveItem(record: ReturnType<typeof loadOneThoughtRecords>[number]): ArchiveItem {
  return {
    archiveItemId: `archive_one_thought_${record.recordId}`,
    anonymousId: "local-anonymous",
    type: "one_thought_record",
    sourceId: record.recordId,
    detailHref: "/mirror-scroll",
    title: record.completed ? "今日一念已落印" : "今日一念",
    summary: `「${record.os}」已入档。心证：${record.evidence}`,
    tags: [record.mirrorId, record.thief, record.sceneId].filter(Boolean).slice(0, 5),
    createdAt: record.sealedAt || record.date,
  }
}

function dedupeArchiveItems(items: ArchiveItem[]) {
  return Array.from(new Map(items.map((item) => [item.archiveItemId, item])).values())
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

function dedupeBehaviorLoops(loops: BehaviorLoop[]) {
  return Array.from(new Map(loops.map((loop) => [loop.behaviorLoopId, loop])).values())
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
}

function toGrowthProfileArchiveItem(profile: LivingMirrorGrowthProfile): ArchiveItem {
  return {
    archiveItemId: `archive_growth_profile_${profile.growth_profile_id}`,
    userId: profile.userId,
    anonymousId: profile.anonymousId,
    type: "growth_profile",
    sourceId: profile.growth_profile_id,
    detailHref: "/living-mirror-growth",
    title: "活镜成长谱",
    summary: `${profile.mirrorLifeStage.title}：高频一念「${profile.highFrequencyThought.label}」，下一轮重点：${profile.nextCycleFocus}`,
    tags: [
      profile.mirrorLifeStage.treeStage,
      profile.highFrequencyThought.label,
      profile.affectedDimensions[0]?.label || "影响维度待沉淀",
    ].filter(Boolean),
    createdAt: profile.updatedAt,
  }
}

function toActiveGrowthProfileArchiveItem(profile: GrowthProfile): ArchiveItem {
  return {
    archiveItemId: `archive_growth_profile_${profile.growthProfileId}`,
    userId: profile.userId,
    anonymousId: profile.anonymousId,
    type: "growth_profile",
    sourceId: profile.growthProfileId,
    detailHref: "/living-mirror-growth",
    title: "活镜成长谱",
    summary: `${profile.mirrorLifeStage.label}：高频一念「${profile.highFrequencyThoughts[0]?.label || "待照见"}」，下一轮重点：${profile.nextCycleFocus.nextActionText}`,
    tags: [
      profile.mirrorLifeStage.label,
      profile.highFrequencyThoughts[0]?.label || "一念待照见",
      profile.nextCycleFocus.relatedDimensions[0] || "下一轮照见",
    ].filter(Boolean),
    createdAt: profile.updatedAt,
  }
}

function toReportArchiveItem(report: NonNullable<ReturnType<typeof loadMirrorReport>>): ArchiveItem {
  return {
    archiveItemId: `archive_report_${report.reportId}`,
    userId: report.userId,
    anonymousId: report.anonymousId,
    type: "mirror_report",
    sourceId: report.reportId,
    detailHref: "/assessment-result",
    title: "心镜报告",
    summary: report.headline,
    tags: [report.primaryPersona, report.secondaryPersona, "七日处方"],
    createdAt: report.createdAt,
  }
}

function toGrowthArchiveItem(growth: DailyGrowthState): ArchiveItem {
  return {
    archiveItemId: `archive_growth_${growth.growthRecordId}`,
    userId: growth.userId,
    anonymousId: growth.anonymousId,
    type: "growth_record",
    sourceId: growth.growthRecordId,
    detailHref: "/practice-change?preview=1",
    title: growth.isCompleted ? `Day ${growth.trainingDay} 今日修行已落印` : `Day ${growth.trainingDay} 今日修行`,
    summary: growth.isCompleted
      ? `签到：${getCheckinLabel(growth.checkinType)}；今日一念：${getThoughtLabel(growth.thoughtType)}；每日一省：${growth.reflectionText || "待补全"}`
      : "今日落印后，这里会留下签到、K 线心念和每日一省。",
    tags: [getCheckinLabel(growth.checkinType), getThoughtLabel(growth.thoughtType), `${growth.completedDays}/7 日`],
    createdAt: growth.completedAt || new Date().toISOString(),
  }
}

function toTradeReviewArchiveItem(review: TradeReview): ArchiveItem {
  return {
    archiveItemId: `archive_trade_review_${review.id}`,
    userId: review.userId,
    anonymousId: review.userId || "local-anonymous",
    type: "trade_review",
    sourceId: review.id,
    detailHref: "/trade-review",
    title: "真实交易复盘",
    summary: review.reviewText || `这次复盘照见的是${review.detectedMirror}。`,
    tags: [review.detectedMirror, ...review.behaviorTags].filter(Boolean).slice(0, 5),
    createdAt: review.createdAt || review.tradeDate || new Date().toISOString(),
  }
}

function toBehaviorLoopArchiveItem(loop: BehaviorLoop): ArchiveItem {
  return {
    archiveItemId: `archive_behavior_loop_${loop.behaviorLoopId}`,
    userId: loop.userId,
    anonymousId: loop.anonymousId,
    type: "behavior_loop",
    sourceId: loop.behaviorLoopId,
    detailHref: "/mirror-archive",
    title: "循环识别记录",
    summary: `已沉淀 ${loop.repeatCount || 1} 次：${loop.trigger} → ${loop.thought} → ${loop.action}。破环动作：${loop.loopBreakAction}。`,
    tags: [String(loop.sourceMirror), loop.thought, ...loop.affectedDimensions, "底层识别"].filter(Boolean).slice(0, 5),
    createdAt: loop.updatedAt,
  }
}

function toHeartProofArchiveItem(heartProof: ReturnType<typeof loadHeartProofs>[number]): ArchiveItem {
  return {
    archiveItemId: `archive_heart_proof_${heartProof.heartProofId}`,
    userId: heartProof.userId,
    anonymousId: heartProof.anonymousId,
    type: "heart_proof",
    sourceId: heartProof.heartProofId,
    detailHref: heartProof.sourceType === "trade_review" ? "/trade-review" : "/practice-change?preview=1",
    title: heartProof.sourceType === "trade_review" ? "复盘心证" : "今日心证",
    summary: heartProof.proofText,
    tags: [
      heartProof.thoughtLabel || heartProof.thoughtType,
      ...heartProof.affectedDimensions,
    ].filter(Boolean).slice(0, 5),
    createdAt: heartProof.createdAt,
  }
}

function toRetestArchiveItem(comparison: PracticeRadarComparison[], practice: PracticeChangeState | null): ArchiveItem {
  const improved = comparison
    .filter((item) => item.delta < 0)
    .sort((left, right) => left.delta - right.delta)
  const focusItems = (improved.length ? improved : comparison)
    .slice(0, 3)
    .map((item) => `${item.label} ${formatDelta(item.delta)}`)

  return {
    archiveItemId: `archive_retest_${practice?.retestReport?.createdAt || "local"}`,
    userId: undefined,
    anonymousId: "local-anonymous",
    type: "retest",
    sourceId: practice?.retestReport?.createdAt || "local-retest",
    detailHref: "/practice-change?preview=1",
    title: "复测变化",
    summary: focusItems.length
      ? `复测已生成 ${comparison.length} 项风险雷达变化：${focusItems.join("；")}。`
      : "复测已完成，变化节点等待继续观察。",
    tags: ["复测变化", `${comparison.length} 项雷达`, practice?.retestReport?.primaryType || "心镜复看"].filter(Boolean),
    createdAt: practice?.retestReport?.createdAt || new Date().toISOString(),
  }
}

function formatDelta(delta: number) {
  if (delta === 0) return "持平"
  return delta > 0 ? `+${delta}` : `${delta}`
}

export function formatArchiveTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "时间待确认"

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}
