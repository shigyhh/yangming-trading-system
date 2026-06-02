import { compareRiskRadarSnapshots, type PracticeChangeState, type PracticeRadarComparison } from "@/features/assessment/practice-change"
import { assessmentStorageKeys, getStorage } from "@/features/assessment/storage"
import { type DailyGrowthState, getCheckinLabel, getThoughtLabel } from "@/features/assessment/sprint10/trainingTypes"
import { loadHeartProofs } from "@/features/heart-proof/heartProofStorage"
import { ensureBehaviorLoopFromTradeReview, ensureBehaviorLoopsFromHeartProofs, loadBehaviorLoops } from "@/features/living-mirror-growth/behaviorLoopStorage"
import type { BehaviorLoop } from "@/features/living-mirror-growth/behaviorLoopTypes"
import { buildLivingMirrorGrowthProfileFromLocal, loadGrowthProfileArchiveItems, recomputeAndSaveGrowthProfile } from "@/features/living-mirror-growth/growthProfileStorage"
import type { GrowthProfile, LivingMirrorGrowthProfile } from "@/features/living-mirror-growth/growthProfileTypes"
import { loadMirrorReport } from "@/features/mirror-report/mirrorReportStorage"
import { tradeReviewLastResultStorageKey } from "@/features/trade-review/trade-review"
import type { TradeReview } from "../../../../packages/contracts/living-mirror"

import type { ArchiveItem, MirrorArchiveData } from "./archiveTypes"

export const mirrorArchiveSource = "localStorage"

export function loadMirrorArchiveData(): MirrorArchiveData {
  const report = loadMirrorReport()
  const growth = getStorage<DailyGrowthState | null>("ym_living_mirror_growth_v1", null)
  const practice = getStorage<PracticeChangeState | null>(assessmentStorageKeys.practiceChange, null)
  const heartProofs = loadHeartProofs()
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
  const heartProofItems = heartProofs.map(toHeartProofArchiveItem)
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
    ...retests,
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  return {
    summary: {
      reportCount: reports.length,
      completedDays: growth?.completedDays ?? 0,
      heartProofCount: heartProofItems.length,
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
      retests,
    },
    allItems,
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
    detailHref: "/assessment-result?preview=1",
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
    detailHref: "/cycle-mirror",
    title: "循环之镜",
    summary: `已沉淀 ${loop.repeatCount || 1} 次：${loop.trigger} → ${loop.thought} → ${loop.action}。破环动作：${loop.loopBreakAction}。`,
    tags: [String(loop.sourceMirror), loop.thought, ...loop.affectedDimensions, "循环证据"].filter(Boolean).slice(0, 5),
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
