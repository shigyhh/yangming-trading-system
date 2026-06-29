"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { DashboardSummary, WeeklyMirrorSummary } from "@yangming/contracts/data-binding"
import type { LivingMirrorGrowthProjection } from "@yangming/contracts/living-mirror"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryLink,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import {
  fetchDashboardSummary,
  fetchDashboardWeeklySummary,
  fetchMirrorArchiveBinding,
  fetchLivingMirrorGrowthProjection,
  getCurrentDataBindingUserId,
  type MirrorArchiveBindingResponse,
} from "@/features/data-binding/api-client"
import { recomputeAndSaveGrowthProfile } from "@/features/living-mirror-growth/growthProfileStorage"
import type {
  GrowthProfile,
  GrowthProfileAffectedDimension,
  GrowthProfileDataGap,
  GrowthProfileNextCycleFocus,
  GrowthProfileRepeatedBehavior,
  GrowthProfileThought,
  GrowthProfileTrainingContinuity,
} from "@/features/living-mirror-growth/growthProfileTypes"

const complianceText = "本系统仅用于交易心理训练与行为复盘，不预测行情，不提供买卖建议，不构成任何投资建议。"

type GrowthDataSourceKey =
  | "server_projection"
  | "dashboard_archive_fallback"
  | "legacy_local_recompute"
  | "unavailable"

type GrowthDataSourceState = {
  key: GrowthDataSourceKey
  label: string
  message: string
}

type DashboardArchiveFallbackPayload = {
  dashboard?: DashboardSummary | null
  weekly?: WeeklyMirrorSummary | null
  archive?: MirrorArchiveBindingResponse | null
  fallbackProfile: GrowthProfile
}

function getGrowthDataSourceState(key: GrowthDataSourceKey): GrowthDataSourceState {
  const states: Record<GrowthDataSourceKey, GrowthDataSourceState> = {
    server_projection: {
      key,
      label: "server_projection",
      message: "数据来自服务器成长谱投影。",
    },
    dashboard_archive_fallback: {
      key,
      label: "dashboard_archive_fallback",
      message: "成长谱服务暂不可用，当前使用数据看板与档案馆信息生成辅助视图。",
    },
    legacy_local_recompute: {
      key,
      label: "legacy_local_recompute",
      message: "成长谱服务暂不可用，当前使用旧版本地计算结果，仅供参考。",
    },
    unavailable: {
      key,
      label: "unavailable",
      message: "暂无足够数据生成成长谱。完成真实复盘和K线训练后再查看。",
    },
  }

  return states[key]
}

export default function LivingMirrorGrowthPage() {
  const [profile, setProfile] = useState<GrowthProfile | null>(null)
  const [dataSource, setDataSource] = useState<GrowthDataSourceState>(getGrowthDataSourceState("unavailable"))
  const [dataGaps, setDataGaps] = useState<GrowthProfileDataGap[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let isActive = true

    async function loadGrowthProfile() {
      const userId = getCurrentDataBindingUserId()
      const projectionFallbackProfile = createUnavailableGrowthProfile(userId)

      if (userId) {
        try {
          const result = await fetchLivingMirrorGrowthProjection(userId)
          if (result.ok && hasGrowthProjectionData(result.data)) {
            const projectionProfile = toGrowthProfileFromProjection(result.data, projectionFallbackProfile)
            applyGrowthProfile(projectionProfile, "server_projection", mergeGrowthDataGaps({
              projectionGaps: projectionProfile.dataGaps,
            }))
            return
          }
        } catch {
          // Keep loading through dashboard/archive and local fallback paths.
        }
      }

      const dashboardArchiveFallback = await loadDashboardArchiveFallback(projectionFallbackProfile)
      if (dashboardArchiveFallback) {
        applyGrowthProfile(
          dashboardArchiveFallback.profile,
          "dashboard_archive_fallback",
          dashboardArchiveFallback.dataGaps,
        )
        return
      }

      try {
        const legacyProfile = recomputeAndSaveGrowthProfile().growthProfile
        if (hasGrowthProfileEvidence(legacyProfile)) {
          applyGrowthProfile(legacyProfile, "legacy_local_recompute", mergeGrowthDataGaps({
            fallbackGaps: legacyProfile.dataGaps,
          }))
          return
        }
      } catch {
        // Keep the final empty state quiet; the page will show a gentle data gap.
      }

      applyGrowthProfile(projectionFallbackProfile, "unavailable", projectionFallbackProfile.dataGaps)
    }

    function applyGrowthProfile(
      nextProfile: GrowthProfile,
      sourceKey: GrowthDataSourceKey,
      nextDataGaps: GrowthProfileDataGap[] = nextProfile.dataGaps,
    ) {
      if (!isActive) return
      setProfile(nextProfile)
      setDataSource(getGrowthDataSourceState(sourceKey))
      setDataGaps(nextDataGaps)
      setLoaded(true)
    }

    const timer = window.setTimeout(() => {
      void loadGrowthProfile()
    }, 0)

    return () => {
      isActive = false
      window.clearTimeout(timer)
    }
  }, [])

  const missingTradeReview = useMemo(
    () => profile?.dataGaps.find((gap) => gap.type === "missing_trade_review") || null,
    [profile],
  )

  if (!loaded || !profile) {
    return (
      <AssessmentShell contentWidth="wide">
        <StatusPill>正在读取活镜成长谱</StatusPill>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-7" contentWidth="wide">
      <div className="growth-page mx-auto w-full max-w-[1320px]">
        <section className="growth-hero">
          <div className="min-w-0">
            <StatusPill>活镜成长谱</StatusPill>
            <div className="mt-4">
              <DataSourceBadge dataSource={dataSource} />
            </div>
            <h1 className="mt-7 font-story text-[clamp(2.6rem,6vw,5.8rem)] font-light leading-[1.12] tracking-[.08em] text-[rgba(244,235,221,.94)]">
              活镜成长谱
            </h1>
            <p className="mt-5 max-w-[46rem] font-story text-xl font-light leading-9 tracking-[.04em] text-[rgba(220,212,195,.64)]">
              把每天的一念、复盘和心证，连成可见的变化。
            </p>
          </div>

          <GlassPanel className="growth-stage-panel min-w-[240px]">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">当前阶段</p>
            <h2 className="mt-4 line-clamp-2 font-story text-4xl font-light tracking-[.08em] text-[rgba(244,235,221,.9)]">
              {profile.mirrorLifeStage.label}
            </h2>
            <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
              {profile.mirrorLifeStage.description}
            </p>
          </GlassPanel>
        </section>

        <DataSourceNotice dataSource={dataSource} />

        <section className="mt-6">
          <GlassPanel className="growth-summary-card">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">成长摘要</p>
                <h2 className="mt-3 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">
                  今日照见概览
                </h2>
              </div>
              <p className="font-function text-xs leading-6 text-[rgba(220,212,195,.42)]">
                {profile.growth_profile_id.replace("growth_profile_", "growth_")}
              </p>
            </div>
            <div className="growth-summary-grid mt-5">
              <SummaryMetric label="已修行" value={`${profile.trainingContinuity.completedGrowthDays} 日`} />
              <SummaryMetric label="已生成" value={`${profile.heartProofCount} 枚心证`} />
              <SummaryMetric label="真实复盘" value={`${profile.tradeReviewCount} 次`} />
              <SummaryMetric label="训练连续性" value={`${profile.trainingContinuity.trainingConsistencyScore}%`} />
              <SummaryMetric label="当前阶段" value={profile.mirrorLifeStage.label} />
            </div>
          </GlassPanel>
        </section>

        <DataGapsPanel dataGaps={dataGaps.length ? dataGaps : profile.dataGaps} />

        <section className="growth-grid mt-5">
          <InsightSection
            eyebrow="高频一念"
            title="反复浮现的念头"
            isEmpty={!profile.highFrequencyThoughts.length}
            emptyText="完成今日修行后，这里会出现你的第一条高频一念。"
          >
            <ThoughtList thoughts={profile.highFrequencyThoughts.slice(0, 3)} />
          </InsightSection>

          <InsightSection
            eyebrow="重复行为"
            title="从复盘里照见循环"
            isEmpty={!profile.repeatedBehaviors.length}
            emptyText={missingTradeReview?.message || "真实复盘累积后，这里会出现重复行为。"}
          >
            <BehaviorList behaviors={profile.repeatedBehaviors.slice(0, 3)} />
          </InsightSection>

          <InsightSection
            eyebrow="影响维度"
            title="最常被牵动的地方"
            isEmpty={!profile.affectedDimensions.length}
            emptyText="心证和复盘累积后，这里会出现被牵动最深的维度。"
          >
            <DimensionList dimensions={profile.affectedDimensions.slice(0, 5)} />
          </InsightSection>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <GlassPanel className="growth-focus-card min-w-[240px]">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">下一轮照见重点</p>
            <h2 className="mt-4 line-clamp-2 font-story text-4xl font-light leading-tight tracking-[.06em] text-[rgba(244,235,221,.9)]">
              {profile.nextCycleFocus.title}
            </h2>
            <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.6)]">
              {profile.nextCycleFocus.reason}
            </p>
            <div className="mt-5 rounded-[8px] border border-[rgba(217,189,122,.13)] bg-white/[.025] p-4">
              <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.72)]">下一步动作</p>
              <p className="mt-3 line-clamp-3 font-function text-sm leading-7 text-[rgba(244,235,221,.78)]">
                {profile.nextCycleFocus.nextActionText}
              </p>
            </div>
            <TagRow labels={profile.nextCycleFocus.relatedDimensions} />
          </GlassPanel>

          <GlassPanel className="growth-loop-card min-w-[240px]">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">底层循环识别</p>
            {profile.topBehaviorLoopIds.length ? (
              <>
                <h2 className="mt-4 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">
                  已识别 {profile.topBehaviorLoopIds.length} 条循环
                </h2>
                <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
                  系统已经从日课心证和真实复盘中提炼出重复模式；它会回流到今日修行和复测变化里，给出更针对性的训练。
                </p>
                <PrimaryLink href="/trade-review" className="mt-6 w-full">
                  补真实复盘
                </PrimaryLink>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">
                  循环尚未成形
                </h2>
                <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
                  完成 1 次真实交易复盘后，系统会开始识别你的重复循环。
                </p>
                <SecondaryLink href="/trade-review" className="mt-6 w-full">
                  进入真实复盘
                </SecondaryLink>
              </>
            )}
          </GlassPanel>
        </section>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <SecondaryLink href="/practice-change?preview=1" className="w-full">
            继续今日修行
          </SecondaryLink>
          <SecondaryLink href="/living-mirror-center" className="w-full">
            回到心镜数据中枢
          </SecondaryLink>
          <SecondaryLink href="/mirror-archive" className="w-full">
            回到心镜档案
          </SecondaryLink>
          <SecondaryLink href="/mirror-scroll" className="w-full">
            查看心镜长卷
          </SecondaryLink>
        </div>

        <ComplianceNote>{profile.complianceText || complianceText}</ComplianceNote>
      </div>

      <style jsx>{`
        .growth-page {
          animation: growth-page-in 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .growth-hero {
          display: grid;
          gap: 1rem;
          align-items: stretch;
        }

        .growth-stage-panel,
        .growth-summary-card,
        .growth-focus-card,
        .growth-loop-card {
          position: relative;
          overflow: hidden;
        }

        .growth-stage-panel::before,
        .growth-summary-card::before,
        .growth-focus-card::before,
        .growth-loop-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 12% 8%, rgba(216, 183, 111, 0.08), transparent 13rem),
            radial-gradient(circle at 88% 92%, rgba(95, 132, 117, 0.08), transparent 15rem),
            linear-gradient(135deg, rgba(244, 235, 221, 0.025), transparent 45%);
        }

        .growth-summary-grid,
        .growth-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 0.9rem;
        }

        @media (min-width: 980px) {
          .growth-hero {
            grid-template-columns: minmax(0, 1fr) minmax(280px, 0.38fr);
          }
        }

        @keyframes growth-page-in {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(14px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }
      `}</style>
    </AssessmentShell>
  )
}

function hasGrowthProjectionData(projection: LivingMirrorGrowthProjection | null | undefined) {
  if (!projection) return false
  const lifeStage = projection.mirrorLifeStage
  const hasLifeStage = typeof lifeStage === "string"
    ? Boolean(lifeStage.trim())
    : Boolean(lifeStage?.label || lifeStage?.title || lifeStage?.stage || lifeStage?.key)

  return Boolean(
    projection.growthProfileId ||
    hasLifeStage ||
    projection.highFrequencyThoughts?.length ||
    projection.repeatedBehaviors?.length ||
    projection.trainingContinuity ||
    projection.nextCycleFocus?.title ||
    projection.nextCycleFocus?.action,
  )
}

async function loadDashboardArchiveFallback(fallbackProfile: GrowthProfile) {
  const [dashboardResult, weeklyResult, archiveResult] = await Promise.allSettled([
    fetchDashboardSummary("30d"),
    fetchDashboardWeeklySummary("current"),
    fetchMirrorArchiveBinding(),
  ])

  const dashboard = getFulfilledBindingData<DashboardSummary>(dashboardResult)
  const weekly = getFulfilledBindingData<WeeklyMirrorSummary>(weeklyResult)
  const archive = getFulfilledBindingData<MirrorArchiveBindingResponse>(archiveResult)

  if (!hasDashboardArchiveFallbackData(dashboard, weekly, archive)) return null

  const profile = toDashboardArchiveGrowthFallback({
    dashboard,
    weekly,
    archive,
    fallbackProfile,
  })

  return {
    profile,
    dataGaps: mergeGrowthDataGaps({
      dashboardGaps: getDashboardGaps(dashboard),
      weeklyGaps: getDashboardGaps(weekly),
      fallbackGaps: profile.dataGaps,
    }),
  }
}

function getFulfilledBindingData<T>(result: PromiseSettledResult<{ ok: true; data: T } | { ok: false; error: string }>) {
  if (result.status !== "fulfilled" || !result.value.ok) return null
  return result.value.data
}

function toDashboardArchiveGrowthFallback({
  dashboard,
  weekly,
  archive,
  fallbackProfile,
}: DashboardArchiveFallbackPayload): GrowthProfile {
  const dashboardRecord = toRecord(dashboard)
  const weeklyRecord = toRecord(weekly)
  const overview = toRecord(dashboardRecord.overview)
  const execution = toRecord(dashboardRecord.execution)
  const mistakeItems = pickCountItems(
    toRecord(dashboardRecord.mistakes).topErrorTypes,
    toRecord(dashboardRecord.mistakes).top_error_types,
    weeklyRecord.topErrorTypes,
    weeklyRecord.top_error_types,
  )
  const thoughtItems = pickCountItems(
    toRecord(dashboardRecord.firstThoughts).topFirstThoughts,
    toRecord(dashboardRecord.first_thoughts).top_first_thoughts,
    weeklyRecord.topFirstThoughts,
    weeklyRecord.top_first_thoughts,
  )
  const sceneItems = pickCountItems(
    toRecord(dashboardRecord.triggerScenes).topTriggerScenes,
    toRecord(dashboardRecord.trigger_scenes).top_trigger_scenes,
    weeklyRecord.topTriggerScenes,
    weeklyRecord.top_trigger_scenes,
  )
  const nextWeekPlan = stringArray(weeklyRecord.nextWeekTrainingPlan).length
    ? stringArray(weeklyRecord.nextWeekTrainingPlan)
    : stringArray(weeklyRecord.next_week_training_plan)

  const tradeReviewCount = numberValue(overview.tradeReviewCount ?? overview.trade_review_count, fallbackProfile.tradeReviewCount)
  const klineTrainingCount = numberValue(overview.klineTrainingCount ?? overview.kline_training_count, fallbackProfile.dailyGrowthCount)
  const trainingBookmarkCount = numberValue(overview.trainingBookmarkCount ?? overview.training_bookmark_count, fallbackProfile.heartProofCount)
  const activeDays = numberValue(overview.activeDays ?? overview.active_days, fallbackProfile.trainingContinuity.completedGrowthDays)
  const consistencyRate = numberValue(execution.consistencyRate ?? execution.consistency_rate, fallbackProfile.trainingContinuity.trainingConsistencyScore)
  const archiveCount = getArchiveTotalCount(archive)
  const updatedAt = stringValue(dashboardRecord.generatedAt) || stringValue(dashboardRecord.generated_at) || stringValue(weeklyRecord.generatedAt) || stringValue(weeklyRecord.generated_at) || fallbackProfile.updatedAt

  return {
    ...fallbackProfile,
    growth_profile_id: "dashboard_archive_growth_profile",
    growthProfileId: "dashboard_archive_growth_profile",
    highFrequencyThoughts: toGrowthThoughts(thoughtItems, fallbackProfile.highFrequencyThoughts),
    repeatedBehaviors: toGrowthBehaviors(mistakeItems, fallbackProfile.repeatedBehaviors),
    affectedDimensions: toGrowthDimensions(sceneItems, fallbackProfile.affectedDimensions),
    trainingContinuity: {
      ...fallbackProfile.trainingContinuity,
      completedGrowthDays: activeDays,
      currentStreak: activeDays,
      longestStreak: Math.max(activeDays, fallbackProfile.trainingContinuity.longestStreak),
      trainingConsistencyScore: consistencyRate,
    },
    mirrorLifeStage: {
      stage: "guarding_action",
      label: "证据成谱",
      description: "成长谱服务暂不可用，当前以数据看板与档案馆证据生成辅助视图。",
    },
    nextCycleFocus: {
      ...fallbackProfile.nextCycleFocus,
      title: nextWeekPlan[0] ? "本周照见重点" : fallbackProfile.nextCycleFocus.title,
      reason: archiveCount > 0
        ? `已从 ${archiveCount} 条档案证据中整理辅助视图。`
        : "数据看板已有部分证据，先按本周摘要继续观察。",
      nextActionText: nextWeekPlan[0] || fallbackProfile.nextCycleFocus.nextActionText,
      relatedDimensions: sceneItems.length ? sceneItems.slice(0, 3).map((item) => item.label) : fallbackProfile.nextCycleFocus.relatedDimensions,
      sourceType: "training",
      sourceId: "dashboard_archive_fallback",
    },
    dataGaps: mergeGrowthDataGaps({
      dashboardGaps: getDashboardGaps(dashboard),
      weeklyGaps: getDashboardGaps(weekly),
      fallbackGaps: fallbackProfile.dataGaps,
    }),
    topBehaviorLoopIds: fallbackProfile.topBehaviorLoopIds,
    sourceSummary: {
      ...fallbackProfile.sourceSummary,
      dailyGrowthCount: klineTrainingCount,
      heartProofCount: trainingBookmarkCount,
      tradeReviewCount,
      behaviorLoopCount: Math.max(fallbackProfile.sourceSummary.behaviorLoopCount, mistakeItems.length),
    },
    dailyGrowthCount: klineTrainingCount,
    heartProofCount: trainingBookmarkCount,
    tradeReviewCount,
    behaviorLoopCount: Math.max(fallbackProfile.behaviorLoopCount, mistakeItems.length),
    computedAt: updatedAt,
    computedAtHistory: mergeComputedHistory(updatedAt, fallbackProfile.computedAtHistory),
    updatedAt,
  }
}

function mergeGrowthDataGaps({
  projectionGaps = [],
  dashboardGaps = [],
  weeklyGaps = [],
  fallbackGaps = [],
}: {
  projectionGaps?: unknown[]
  dashboardGaps?: unknown[]
  weeklyGaps?: unknown[]
  fallbackGaps?: unknown[]
}): GrowthProfileDataGap[] {
  const merged = [
    ...projectionGaps,
    ...dashboardGaps,
    ...weeklyGaps,
    ...fallbackGaps,
  ]
    .map(toGrowthDataGap)
    .filter((gap): gap is GrowthProfileDataGap => Boolean(gap))

  const seen = new Set<string>()
  return merged.filter((gap) => {
    const key = `${gap.type}:${gap.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function createUnavailableGrowthProfile(userId?: string): GrowthProfile {
  const now = new Date().toISOString()
  return {
    schemaVersion: "growth_profile_v1",
    growth_profile_id: "growth_profile_unavailable",
    growthProfileId: "growth_profile_unavailable",
    status: "active",
    userId,
    anonymousId: "web-next-anonymous",
    primaryPersona: "待照见",
    secondaryPersona: "待照见",
    sevenDayPrescription: [],
    recommendedCamp: "",
    highFrequencyThoughts: [],
    trainingContinuity: {
      completedGrowthDays: 0,
      currentStreak: 0,
      longestStreak: 0,
      missedDays: 0,
      trainingConsistencyScore: 0,
    },
    affectedDimensions: [],
    repeatedBehaviors: [],
    topBehaviorLoopIds: [],
    mirrorLifeStage: {
      stage: "initial_reflection",
      label: "待成谱",
      description: "暂无足够数据形成稳定成长谱。",
    },
    nextCycleFocus: {
      title: "先累积证据",
      reason: "完成真实复盘和K线训练后，系统会开始形成成长谱。",
      nextActionText: "完成一次真实复盘或K线训练。",
      relatedDimensions: [],
      sourceType: "training",
      sourceId: "unavailable",
    },
    dataGaps: [
      {
        type: "missing_trade_review",
        message: "暂无足够数据生成成长谱。完成真实复盘和K线训练后再查看。",
      },
    ],
    retestTrend: {
      retestCount: 0,
      improvedDimensions: [],
      declinedDimensions: [],
    },
    retestSummary: {
      retestCount: 0,
      baselineScores: {},
      currentScores: {},
      deltaScores: {},
      improvedDimensions: [],
      declinedDimensions: [],
      stableDimensions: [],
      trainingEvidenceSummary: "",
      highFrequencyThoughtChange: "",
      repeatedBehaviorChange: "",
      nextCycleFocus: {
        title: "先累积证据",
        reason: "完成真实复盘和K线训练后，系统会开始形成成长谱。",
        nextActionText: "完成一次真实复盘或K线训练。",
        relatedDimensions: [],
      },
      conclusionText: "",
    },
    sourceSummary: {
      mirrorReportCount: 0,
      dailyGrowthCount: 0,
      heartProofCount: 0,
      tradeReviewCount: 0,
      behaviorLoopCount: 0,
      retestChangeCount: 0,
    },
    dailyGrowthCount: 0,
    heartProofCount: 0,
    tradeReviewCount: 0,
    behaviorLoopCount: 0,
    retestChangeCount: 0,
    complianceText: "本成长谱仅用于交易心理觉察、复盘训练与行为管理，不构成投资建议。",
    computedAt: now,
    computedAtHistory: [now],
    updatedAt: now,
  }
}

function hasDashboardArchiveFallbackData(
  dashboard: DashboardSummary | null,
  weekly: WeeklyMirrorSummary | null,
  archive: MirrorArchiveBindingResponse | null,
) {
  return Boolean(
    getArchiveTotalCount(archive) ||
    pickCountItems(toRecord(toRecord(dashboard).firstThoughts).topFirstThoughts, toRecord(toRecord(dashboard).first_thoughts).top_first_thoughts).length ||
    pickCountItems(toRecord(toRecord(dashboard).mistakes).topErrorTypes, toRecord(toRecord(dashboard).mistakes).top_error_types).length ||
    pickCountItems(toRecord(toRecord(dashboard).triggerScenes).topTriggerScenes, toRecord(toRecord(dashboard).trigger_scenes).top_trigger_scenes).length ||
    pickCountItems(toRecord(weekly).topFirstThoughts, toRecord(weekly).top_first_thoughts).length ||
    getDashboardGaps(dashboard).length ||
    getDashboardGaps(weekly).length,
  )
}

function hasGrowthProfileEvidence(profile: GrowthProfile) {
  return Boolean(
    profile.highFrequencyThoughts.length ||
    profile.repeatedBehaviors.length ||
    profile.affectedDimensions.length ||
    profile.sourceSummary.tradeReviewCount ||
    profile.sourceSummary.dailyGrowthCount ||
    profile.sourceSummary.heartProofCount ||
    profile.trainingContinuity.completedGrowthDays,
  )
}

function toGrowthProfileFromProjection(
  projection: LivingMirrorGrowthProjection,
  fallbackProfile: GrowthProfile,
): GrowthProfile {
  const sourceSummary = normalizeProjectionSourceSummary(projection.sourceSummary, fallbackProfile.sourceSummary)
  const topBehaviorLoopIds = normalizeProjectionBehaviorLoopIds(projection.topBehaviorLoops, fallbackProfile.topBehaviorLoopIds)

  return {
    ...fallbackProfile,
    growth_profile_id: projection.growthProfileId || fallbackProfile.growth_profile_id,
    growthProfileId: projection.growthProfileId || fallbackProfile.growthProfileId,
    userId: projection.userId || fallbackProfile.userId,
    highFrequencyThoughts: normalizeProjectionThoughts(projection.highFrequencyThoughts, fallbackProfile.highFrequencyThoughts),
    repeatedBehaviors: normalizeProjectionBehaviors(projection.repeatedBehaviors, fallbackProfile.repeatedBehaviors),
    affectedDimensions: normalizeProjectionDimensions(projection.affectedDimensions, fallbackProfile.affectedDimensions),
    trainingContinuity: normalizeProjectionTrainingContinuity(projection.trainingContinuity, fallbackProfile.trainingContinuity),
    mirrorLifeStage: normalizeProjectionLifeStage(projection.mirrorLifeStage, fallbackProfile.mirrorLifeStage),
    nextCycleFocus: normalizeProjectionNextCycleFocus(projection.nextCycleFocus, fallbackProfile.nextCycleFocus),
    dataGaps: normalizeProjectionDataGaps(projection.dataGaps, fallbackProfile.dataGaps),
    topBehaviorLoopIds,
    sourceSummary,
    dailyGrowthCount: sourceSummary.dailyGrowthCount,
    heartProofCount: sourceSummary.heartProofCount,
    tradeReviewCount: sourceSummary.tradeReviewCount,
    behaviorLoopCount: Math.max(sourceSummary.behaviorLoopCount, topBehaviorLoopIds.length),
    retestChangeCount: sourceSummary.retestChangeCount,
    complianceText: projection.complianceNotice || fallbackProfile.complianceText,
    computedAt: projection.updatedAt || fallbackProfile.computedAt,
    computedAtHistory: mergeComputedHistory(projection.updatedAt, fallbackProfile.computedAtHistory),
    updatedAt: projection.updatedAt || fallbackProfile.updatedAt,
  }
}

function normalizeProjectionThoughts(
  thoughts: LivingMirrorGrowthProjection["highFrequencyThoughts"],
  fallbackThoughts: GrowthProfileThought[],
): GrowthProfileThought[] {
  if (!Array.isArray(thoughts) || !thoughts.length) return fallbackThoughts

  return thoughts.map((thought, index) => {
    const record = thought as Record<string, unknown>
    const label = stringValue(record.label) || stringValue(record.text) || stringValue(record.thoughtType) || `一念 ${index + 1}`
    return {
      thoughtType: stringValue(record.thoughtType) || stringValue(record.key) || `server_thought_${index + 1}`,
      label,
      count: numberValue(record.count, 1),
      weight: numberValue(record.weight, numberValue(record.count, 1)),
      evidenceIds: stringArray(record.evidenceIds),
    }
  }).filter((thought) => thought.label)
}

function normalizeProjectionBehaviors(
  behaviors: LivingMirrorGrowthProjection["repeatedBehaviors"],
  fallbackBehaviors: GrowthProfileRepeatedBehavior[],
): GrowthProfileRepeatedBehavior[] {
  if (!Array.isArray(behaviors) || !behaviors.length) return fallbackBehaviors

  return behaviors.map((behavior, index) => {
    const record = behavior as Record<string, unknown>
    const label = stringValue(record.label) || `重复行为 ${index + 1}`
    return {
      behaviorType: stringValue(record.behaviorType) || stringValue(record.key) || `server_behavior_${index + 1}`,
      label,
      count: numberValue(record.count, 1),
      thoughtType: stringValue(record.thoughtType) || undefined,
      evidenceIds: stringArray(record.evidenceIds),
    }
  }).filter((behavior) => behavior.label)
}

function normalizeProjectionDimensions(
  dimensions: LivingMirrorGrowthProjection["affectedDimensions"],
  fallbackDimensions: GrowthProfileAffectedDimension[],
): GrowthProfileAffectedDimension[] {
  if (!Array.isArray(dimensions) || !dimensions.length) return fallbackDimensions

  return dimensions.map((dimension) => {
    const record = dimension as Record<string, unknown>
    return {
      label: stringValue(record.label),
      weight: numberValue(record.weight, 1),
      sourceTypes: stringArray(record.sourceTypes) as GrowthProfileAffectedDimension["sourceTypes"],
      evidenceIds: stringArray(record.evidenceIds),
    }
  }).filter((dimension) => dimension.label)
}

function normalizeProjectionTrainingContinuity(
  continuity: LivingMirrorGrowthProjection["trainingContinuity"],
  fallbackContinuity: GrowthProfileTrainingContinuity,
): GrowthProfileTrainingContinuity {
  if (!continuity) return fallbackContinuity
  const record = continuity as Record<string, unknown>

  return {
    completedGrowthDays: numberValue(
      record.completedGrowthDays ?? record.completedDays ?? record.activeDays,
      fallbackContinuity.completedGrowthDays,
    ),
    currentStreak: numberValue(record.currentStreak ?? record.activeDays, fallbackContinuity.currentStreak),
    longestStreak: numberValue(record.longestStreak ?? record.activeDays, fallbackContinuity.longestStreak),
    missedDays: numberValue(record.missedDays, fallbackContinuity.missedDays),
    trainingConsistencyScore: numberValue(
      record.trainingConsistencyScore ?? record.consistencyScore ?? getContinuityScoreFromEvents(record),
      fallbackContinuity.trainingConsistencyScore,
    ),
  }
}

function normalizeProjectionLifeStage(
  lifeStage: LivingMirrorGrowthProjection["mirrorLifeStage"],
  fallbackStage: GrowthProfile["mirrorLifeStage"],
): GrowthProfile["mirrorLifeStage"] {
  if (!lifeStage) return fallbackStage
  if (typeof lifeStage === "string") {
    return getProjectionLifeStage(lifeStage, fallbackStage)
  }
  const record = lifeStage as Record<string, unknown>

  return {
    stage: (stringValue(record.stage) || stringValue(record.key) || fallbackStage.stage) as GrowthProfile["mirrorLifeStage"]["stage"],
    label: stringValue(record.label) || stringValue(record.title) || fallbackStage.label,
    description: stringValue(record.description) || fallbackStage.description,
  }
}

function normalizeProjectionNextCycleFocus(
  focus: LivingMirrorGrowthProjection["nextCycleFocus"],
  fallbackFocus: GrowthProfileNextCycleFocus,
): GrowthProfileNextCycleFocus {
  if (!focus) return fallbackFocus
  const record = focus as Record<string, unknown>
  const relatedDimensions = stringArray(record.relatedDimensions)

  return {
    title: stringValue(record.title) || stringValue(record.label) || fallbackFocus.title,
    reason: stringValue(record.reason) || stringValue(record.summary) || fallbackFocus.reason,
    nextActionText: stringValue(record.nextActionText) || stringValue(record.nextAction) || stringValue(record.actionText) || stringValue(record.action) || fallbackFocus.nextActionText,
    relatedDimensions: relatedDimensions.length ? relatedDimensions : fallbackFocus.relatedDimensions,
    sourceType: (stringValue(record.sourceType) || fallbackFocus.sourceType) as GrowthProfileNextCycleFocus["sourceType"],
    sourceId: stringValue(record.sourceId) || fallbackFocus.sourceId,
  }
}

function normalizeProjectionDataGaps(
  gaps: LivingMirrorGrowthProjection["dataGaps"],
  fallbackGaps: GrowthProfileDataGap[],
): GrowthProfileDataGap[] {
  if (!Array.isArray(gaps) || !gaps.length) return fallbackGaps

  return gaps.map((gap) => {
    const record = gap as Record<string, unknown>
    return {
      type: (stringValue(record.type) || stringValue(record.key) || "missing_trade_review") as GrowthProfileDataGap["type"],
      message: stringValue(record.message) || stringValue(record.label) || "当前成长谱数据仍在累积。",
    }
  })
}

function normalizeProjectionBehaviorLoopIds(
  behaviorLoops: LivingMirrorGrowthProjection["topBehaviorLoops"],
  fallbackIds: string[],
): string[] {
  if (!Array.isArray(behaviorLoops) || !behaviorLoops.length) return fallbackIds

  return behaviorLoops.flatMap((loop, index) => {
    if (typeof loop === "string") return [loop]
    const record = loop as Record<string, unknown>
    const id = stringValue(record.behaviorLoopId) || stringValue(record.behavior_loop_id) || stringValue(record.id)
    return id ? [id] : [`server_behavior_loop_${index + 1}`]
  })
}

function normalizeProjectionSourceSummary(
  sourceSummary: LivingMirrorGrowthProjection["sourceSummary"],
  fallbackSummary: GrowthProfile["sourceSummary"],
): GrowthProfile["sourceSummary"] {
  if (!sourceSummary) return fallbackSummary
  const record = sourceSummary as Record<string, unknown>

  return {
    mirrorReportCount: numberValue(record.mirrorReportCount, typeof record.mirrorReport === "boolean" ? Number(record.mirrorReport) : fallbackSummary.mirrorReportCount),
    dailyGrowthCount: numberValue(record.dailyGrowthCount, fallbackSummary.dailyGrowthCount),
    heartProofCount: numberValue(record.heartProofCount ?? record.oneThoughtEvents, fallbackSummary.heartProofCount),
    tradeReviewCount: numberValue(record.tradeReviewCount ?? record.tradeReviews, fallbackSummary.tradeReviewCount),
    behaviorLoopCount: numberValue(record.behaviorLoopCount, fallbackSummary.behaviorLoopCount),
    retestChangeCount: numberValue(record.retestChangeCount ?? record.retests, fallbackSummary.retestChangeCount),
  }
}

function getDashboardGaps(source: unknown) {
  const record = toRecord(source)
  const gaps = Array.isArray(record.dataGaps) ? record.dataGaps : record.data_gaps
  return Array.isArray(gaps) ? gaps : []
}

function toGrowthDataGap(gap: unknown): GrowthProfileDataGap | null {
  const record = toRecord(gap)
  const type = stringValue(record.type) || stringValue(record.key)
  const message = stringValue(record.message) || stringValue(record.label)
  if (!type && !message) return null

  return {
    type: (type || "growth_data_gap") as GrowthProfileDataGap["type"],
    message: message || "当前成长谱数据仍在累积。",
  }
}

function pickCountItems(...sources: unknown[]) {
  for (const source of sources) {
    if (!Array.isArray(source) || !source.length) continue
    const items = source
      .map(toCountItem)
      .filter((item): item is { key: string; label: string; count: number } => Boolean(item))
    if (items.length) return items
  }
  return []
}

function toCountItem(item: unknown) {
  const record = toRecord(item)
  const label = stringValue(record.label) || stringValue(record.name) || stringValue(record.key)
  if (!label) return null

  return {
    key: stringValue(record.key) || label,
    label,
    count: numberValue(record.count, 1),
  }
}

function toGrowthThoughts(
  items: { key: string; label: string; count: number }[],
  fallbackThoughts: GrowthProfileThought[],
): GrowthProfileThought[] {
  if (!items.length) return fallbackThoughts
  return items.map((item, index) => ({
    thoughtType: item.key || `dashboard_thought_${index + 1}`,
    label: item.label,
    count: item.count,
    weight: item.count,
    evidenceIds: [],
  }))
}

function toGrowthBehaviors(
  items: { key: string; label: string; count: number }[],
  fallbackBehaviors: GrowthProfileRepeatedBehavior[],
): GrowthProfileRepeatedBehavior[] {
  if (!items.length) return fallbackBehaviors
  return items.map((item, index) => ({
    behaviorType: item.key || `dashboard_behavior_${index + 1}`,
    label: item.label,
    count: item.count,
    evidenceIds: [],
  }))
}

function toGrowthDimensions(
  items: { key: string; label: string; count: number }[],
  fallbackDimensions: GrowthProfileAffectedDimension[],
): GrowthProfileAffectedDimension[] {
  if (!items.length) return fallbackDimensions
  return items.map((item) => ({
    label: item.label,
    weight: item.count,
    sourceTypes: ["trade_review"],
    evidenceIds: [],
  }))
}

function getArchiveTotalCount(archive: MirrorArchiveBindingResponse | null | undefined) {
  const archiveRecord = toRecord(archive)
  const archiveIndex = toRecord(archiveRecord.archiveIndex || archiveRecord.archive_index)
  const mirrorArchive = toRecord(archiveRecord.mirrorArchive || archiveRecord.mirror_archive)
  const mirrorArchiveIndex = toRecord(mirrorArchive.archiveIndex || mirrorArchive.archive_index)

  return numberValue(
    archiveIndex.totalCount ?? archiveIndex.total_count ?? mirrorArchiveIndex.totalCount ?? mirrorArchiveIndex.total_count,
    0,
  )
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function getContinuityScoreFromEvents(record: Record<string, unknown>) {
  const totalEvents = numberValue(record.totalEvents, 0)
  const activeDays = numberValue(record.activeDays, 0)
  if (!totalEvents || !activeDays) return undefined
  return Math.max(0, Math.min(100, Math.round((activeDays / totalEvents) * 100)))
}

function getProjectionLifeStage(stageKey: string, fallbackStage: GrowthProfile["mirrorLifeStage"]): GrowthProfile["mirrorLifeStage"] {
  const key = stageKey.trim()
  const stageMap: Record<string, GrowthProfile["mirrorLifeStage"]> = {
    seed: {
      stage: "initial_reflection",
      label: "初照",
      description: "成长事实源刚开始累积，先稳稳记录每一次照见。",
    },
    sprout: {
      stage: "seeing_thought",
      label: "初萌",
      description: "一念和行为开始显影，下一步是把看见的反应带回训练。",
    },
    rooted: {
      stage: "guarding_action",
      label: "扎根",
      description: "重复模式已经较清楚，重点是守住边界和复盘动作。",
    },
    growing: {
      stage: "guarding_action",
      label: "渐明",
      description: "行为线索逐渐清晰，继续在事上练中校准知行。",
    },
    stable: {
      stage: "proven",
      label: "稳定",
      description: "训练连续性正在形成，继续用复盘验证变化。",
    },
    mature: {
      stage: "retested",
      label: "成形",
      description: "成长模式已经成形，适合进入复照与复测校准。",
    },
  }

  return stageMap[key] || fallbackStage
}

function mergeComputedHistory(updatedAt: string | undefined, history: string[]) {
  if (!updatedAt) return history
  return [updatedAt, ...history.filter((item) => item !== updatedAt)].slice(0, 8)
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function numberValue(value: unknown, fallbackValue: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallbackValue
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[240px] rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] px-4 py-4">
      <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">{label}</p>
      <p className="mt-3 line-clamp-2 font-story text-3xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">
        {value}
      </p>
    </div>
  )
}

function InsightSection({
  eyebrow,
  title,
  isEmpty,
  emptyText,
  children,
}: {
  eyebrow: string
  title: string
  isEmpty: boolean
  emptyText: string
  children: ReactNode
}) {
  return (
    <GlassPanel className="min-w-[240px]">
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">{eyebrow}</p>
      <h2 className="mt-4 line-clamp-2 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">
        {title}
      </h2>
      <div className="mt-5">
        {isEmpty ? (
          <p className="line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </GlassPanel>
  )
}

function ThoughtList({ thoughts }: { thoughts: GrowthProfileThought[] }) {
  if (!thoughts.length) return null

  return (
    <div className="grid gap-3">
      {thoughts.map((thought) => (
        <div key={thought.thoughtType} className="flex items-center justify-between gap-4 rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-3">
          <span className="min-w-0 line-clamp-2 font-function text-sm text-[rgba(244,235,221,.78)]">{thought.label}</span>
          <span className="shrink-0 rounded-full border border-[rgba(216,183,111,.16)] px-2.5 py-1 font-function text-xs text-[rgba(216,183,111,.78)]">
            出现 {thought.count} 次
          </span>
        </div>
      ))}
    </div>
  )
}

function BehaviorList({ behaviors }: { behaviors: GrowthProfileRepeatedBehavior[] }) {
  if (!behaviors.length) return null

  return (
    <div className="grid gap-3">
      {behaviors.map((behavior) => (
        <div key={behavior.behaviorType} className="rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.025] px-4 py-3">
          <p className="line-clamp-2 font-function text-sm leading-6 text-[rgba(244,235,221,.78)]">{behavior.label}</p>
        </div>
      ))}
    </div>
  )
}

function DimensionList({ dimensions }: { dimensions: GrowthProfileAffectedDimension[] }) {
  if (!dimensions.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {dimensions.map((dimension) => (
        <span key={dimension.label} className="max-w-full rounded-full border border-[rgba(217,189,122,.14)] bg-[rgba(216,183,111,.055)] px-3 py-2 font-function text-xs leading-5 text-[rgba(244,235,221,.76)]">
          {dimension.label}
        </span>
      ))}
    </div>
  )
}

function TagRow({ labels }: { labels: string[] }) {
  if (!labels.length) return null

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {labels.map((label) => (
        <span key={label} className="rounded-full border border-[rgba(95,132,117,.28)] bg-[rgba(95,132,117,.08)] px-3 py-2 font-function text-xs text-[rgba(220,212,195,.7)]">
          {label}
        </span>
      ))}
    </div>
  )
}

function DataSourceBadge({ dataSource }: { dataSource: GrowthDataSourceState }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[rgba(217,189,122,.16)] bg-[rgba(216,183,111,.055)] px-3 py-1.5 font-function text-xs font-semibold tracking-[.12em] text-[rgba(216,183,111,.82)]">
      <span>数据来源</span>
      <span className="truncate text-[rgba(244,235,221,.68)]">{dataSource.label}</span>
    </span>
  )
}

function DataSourceNotice({ dataSource }: { dataSource: GrowthDataSourceState }) {
  if (dataSource.key === "server_projection") {
    return (
      <div className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.2)] bg-[rgba(95,132,117,.07)] px-4 py-3">
        <p className="font-function text-sm leading-7 text-[rgba(220,212,195,.66)]">{dataSource.message}</p>
      </div>
    )
  }

  return (
    <div className="mt-5 rounded-[8px] border border-[rgba(216,183,111,.18)] bg-[rgba(216,183,111,.055)] px-4 py-3">
      <p className="font-function text-sm leading-7 text-[rgba(244,235,221,.72)]">{dataSource.message}</p>
    </div>
  )
}

function DataGapsPanel({ dataGaps }: { dataGaps: GrowthProfileDataGap[] }) {
  return (
    <section className="mt-5">
      <GlassPanel className="min-w-[240px]">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">dataGaps</p>
            <h2 className="mt-3 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">数据缺口</h2>
          </div>
          <p className="font-function text-xs leading-6 text-[rgba(220,212,195,.42)]">
            缺口不是错误，只是提醒哪些证据还在累积。
          </p>
        </div>
        {dataGaps.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {dataGaps.slice(0, 6).map((gap) => (
              <div key={`${gap.type}-${gap.message}`} className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4">
                <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.72)]">{gap.type}</p>
                <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.6)]">{gap.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
            暂无明确数据缺口。后续知行提醒、执行计划与训练收藏会逐步进入成长谱。
          </p>
        )}
      </GlassPanel>
    </section>
  )
}
