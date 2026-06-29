"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryButton,
  PrimaryLink,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import {
  dispatchTrainingPrescriptionBinding,
  fetchDashboardSummary,
  fetchDashboardWeeklySummary,
  fetchDataBindingSummary,
  type DataBindingSummaryResponse,
} from "@/features/data-binding/api-client"
import type { DashboardCountItem, DashboardDataGap, DashboardSummary, DataBindingKLineRecord, WeeklyMirrorSummary } from "@yangming/contracts/data-binding"
import type { LivingMirrorProfile, TradeReview, TrainingPrescriptionDispatch } from "@yangming/contracts/living-mirror"

const complianceText = "本中枢仅用于交易心理觉察、复盘训练与行为管理，不预测行情，不构成投资建议。"
type DashboardRange = "7d" | "30d" | "90d"

const dashboardRanges: Array<{ label: string; value: DashboardRange }> = [
  { label: "7 天", value: "7d" },
  { label: "30 天", value: "30d" },
  { label: "90 天", value: "90d" },
]

export default function LivingMirrorCenterPage() {
  const [summary, setSummary] = useState<DataBindingSummaryResponse | null>(null)
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [weeklySummary, setWeeklySummary] = useState<WeeklyMirrorSummary | null>(null)
  const [range, setRange] = useState<DashboardRange>("30d")
  const [dashboardNotice, setDashboardNotice] = useState("")
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [isDispatching, setIsDispatching] = useState(false)
  const [dispatchMessage, setDispatchMessage] = useState("")

  useEffect(() => {
    let cancelled = false

    const timer = window.setTimeout(() => {
      void Promise.all([
        fetchDashboardSummary(range),
        fetchDashboardWeeklySummary(),
        fetchDataBindingSummary(),
      ]).then(([dashboardResult, weeklyResult, summaryResult]) => {
        if (cancelled) return

        if (dashboardResult.ok) {
          setDashboardSummary(dashboardResult.data)
        } else {
          setDashboardSummary(null)
        }

        if (weeklyResult.ok) {
          setWeeklySummary(weeklyResult.data)
        } else {
          setWeeklySummary(null)
        }

        if (summaryResult.ok) {
          setSummary(summaryResult.data)
        } else {
          setSummary(null)
        }

        const notices = [
          dashboardResult.ok ? "" : `已使用旧版汇总数据：${dashboardResult.error}`,
          weeklyResult.ok ? "" : `本周活镜摘要暂未更新：${weeklyResult.error}`,
          summaryResult.ok || !dashboardResult.ok ? "" : `旧版活镜资料暂未读取：${summaryResult.error}`,
        ].filter(Boolean)
        setDashboardNotice(notices.join("；"))

        if (dashboardResult.ok || summaryResult.ok) {
          setError("")
        } else {
          setError(`${dashboardResult.error}；${summaryResult.error}`)
        }
        setLoaded(true)
      })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [range])

  const profile = summary?.living_mirror_profile || null
  const tradeReviews = useMemo(() => (summary?.trade_reviews || []).slice().reverse(), [summary])
  const klineRecords = useMemo(() => (summary?.kline_records || []).slice().reverse(), [summary])
  const assistant = summary?.assistant_summary || null
  const zhixing = summary?.living_mirror_stats?.zhixingStability || null
  const prescription = summary?.training_prescription || null

  async function handleDispatchPrescription() {
    setIsDispatching(true)
    setDispatchMessage("")
    const result = await dispatchTrainingPrescriptionBinding()
    setIsDispatching(false)

    if (!result.ok) {
      setDispatchMessage(result.error)
      return
    }

    setSummary((current) => current
      ? {
          ...current,
          training_prescription: result.data.training_prescription,
          living_mirror_profile: result.data.living_mirror_profile || current.living_mirror_profile,
          admin_user: result.data.admin_user || current.admin_user,
        }
      : current)
    setDispatchMessage("已下发到小程序，学员可在活镜页接收今日训练。")
  }

  if (!loaded) {
    return (
      <AssessmentShell contentWidth="wide">
        <StatusPill>正在读取活镜中枢</StatusPill>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-7" contentWidth="wide">
      <div className="mirror-center-page mx-auto w-full max-w-[1440px]">
        <section className="mirror-center-hero">
          <div className="min-w-0">
            <StatusPill>活镜中枢 · 跨端总览</StatusPill>
            <h1 className="mt-7 font-story text-[clamp(2.8rem,6.8vw,6.8rem)] font-light leading-[1.1] tracking-[.08em] text-[rgba(244,235,221,.94)]">
              活镜中枢
            </h1>
            <p className="mt-5 max-w-[48rem] font-story text-xl font-light leading-9 tracking-[.04em] text-[rgba(220,212,195,.64)]">
              网页看总览，小程序采集每日真实记录。同一个 userId 下，测评、盲练与真实复盘会合成同一份活镜画像。
            </p>
          </div>

          <GlassPanel className="mirror-center-stage-card min-w-[240px]">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">当前主镜</p>
            <h2 className="mt-4 line-clamp-2 font-story text-4xl font-light tracking-[.08em] text-[rgba(244,235,221,.9)]">
              {profile?.currentMainMirror || "待照见"}
            </h2>
            <p className="mt-4 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
              {profile?.trainingFocus || "完成九镜测评、K线盲练或一次真实复盘后，这里会出现主修方向。"}
            </p>
          </GlassPanel>
        </section>

        {error ? (
          <GlassPanel className="mt-5">
            <p className="font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.88)]">连接未完成</p>
            <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
              {error}。本地记录不会因此丢失，可以稍后重试，或先继续完成真实复盘。
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SecondaryLink href="/trade-review" className="w-full">
                继续真实复盘
              </SecondaryLink>
              <SecondaryLink href="/assessment-result?preview=1" className="w-full">
                返回心镜报告
              </SecondaryLink>
            </div>
          </GlassPanel>
        ) : null}

        <DashboardRangeSwitcher range={range} onRangeChange={setRange} />
        <DashboardSourceNotice notice={dashboardNotice} />

        <section className="mirror-center-grid mt-6" data-api="dashboard-summary dashboard-weekly" data-contract="DashboardSummary WeeklyMirrorSummary">
          <DashboardOverviewPanel dashboard={dashboardSummary} summary={summary} range={range} />
          <ExecutionDashboardPanel dashboard={dashboardSummary} />
          <DashboardListPanel
            className="lg:col-span-4"
            eyebrow="高频错题"
            title="topErrorTypes"
            emptyText="暂无高频错题。完成真实复盘或训练错题卡后，这里会开始聚合。"
            items={dashboardSummary?.mistakes?.topErrorTypes || dashboardSummary?.mistakes?.top_error_types || []}
          />
          <DashboardListPanel
            className="lg:col-span-4"
            eyebrow="第一念"
            title="topFirstThoughts"
            emptyText="暂无第一念样本。记录临盘第一念后，这里会显示高频念头。"
            items={dashboardSummary?.firstThoughts?.topFirstThoughts || dashboardSummary?.first_thoughts?.top_first_thoughts || []}
          />
          <DashboardListPanel
            className="lg:col-span-4"
            eyebrow="高频触发场景"
            title="topTriggerScenes"
            emptyText="暂无触发场景样本。完成更多复盘后，这里会显示高频场景。"
            items={dashboardSummary?.triggerScenes?.topTriggerScenes || dashboardSummary?.trigger_scenes?.top_trigger_scenes || []}
          />
          <TrainingDashboardPanel dashboard={dashboardSummary} />
          <BookmarkDashboardPanel dashboard={dashboardSummary} />
          <InterventionDashboardPanel dashboard={dashboardSummary} />
          <WeeklyMirrorDashboardPanel weekly={weeklySummary} />
          <DashboardDataGapsPanel dashboard={dashboardSummary} weekly={weeklySummary} />
        </section>

        <section className="mirror-center-grid mt-6">
          <OverviewPanel profile={profile} zhixingText={zhixing ? `${zhixing.totalText || zhixing.total} · ${zhixing.level}` : "待生成"} />
          <TripleReflectionPanel profile={profile} />
          <PrescriptionDispatchPanel
            prescription={prescription}
            isDispatching={isDispatching}
            message={dispatchMessage}
            onDispatch={handleDispatchPrescription}
          />
          <TradeReviewLibrary reviews={tradeReviews} />
          <KLineLab records={klineRecords} />
          <AssistantWorkbench assistant={assistant} />
        </section>

        <div className="mt-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <PrimaryLink href="/trade-review" className="w-full">
            上传真实记录
          </PrimaryLink>
          <SecondaryLink href="/practice-change?preview=1" className="w-full">
            继续今日修行
          </SecondaryLink>
          <SecondaryLink href="/living-mirror-growth" className="w-full">
            查看成长谱
          </SecondaryLink>
          <SecondaryLink href="/mirror-archive" className="w-full">
            回到心镜档案
          </SecondaryLink>
          <SecondaryLink href="/admin/training-packs" className="w-full">
            训练包管理
          </SecondaryLink>
          <SecondaryLink href="/admin/kline-segments" className="w-full">
            K线片段标注
          </SecondaryLink>
        </div>

        <ComplianceNote>{profile?.complianceNotice || complianceText}</ComplianceNote>
      </div>

      <style jsx>{`
        .mirror-center-page {
          animation: mirror-center-in 840ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mirror-center-hero {
          display: grid;
          gap: 1rem;
          align-items: stretch;
        }

        .mirror-center-stage-card,
        .mirror-center-panel {
          position: relative;
          overflow: hidden;
        }

        .mirror-center-stage-card::before,
        .mirror-center-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 12% 8%, rgba(216, 183, 111, 0.075), transparent 13rem),
            radial-gradient(circle at 88% 92%, rgba(95, 132, 117, 0.07), transparent 15rem),
            linear-gradient(135deg, rgba(244, 235, 221, 0.022), transparent 45%);
        }

        .mirror-center-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 1rem;
        }

        @media (min-width: 920px) {
          .mirror-center-hero {
            grid-template-columns: minmax(0, 1fr) minmax(320px, 0.36fr);
          }

          .mirror-center-grid {
            grid-template-columns: repeat(12, minmax(0, 1fr));
          }
        }

        @keyframes mirror-center-in {
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

function OverviewPanel({ profile, zhixingText }: { profile: LivingMirrorProfile | null; zhixingText: string }) {
  return (
    <CenterPanel className="lg:col-span-5">
      <PanelHeader eyebrow="活镜总览" title={profile?.currentStage || "待入镜"} />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <CenterMetric label="九镜测评" value={`${profile?.sourceCounts.assessment || 0}`} />
        <CenterMetric label="K线盲练" value={`${profile?.sourceCounts.klineBlind || 0}`} />
        <CenterMetric label="真实复盘" value={`${profile?.sourceCounts.tradeReview || 0}`} />
        <CenterMetric label="知行稳定度" value={zhixingText} />
      </div>
      <p className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
        {profile?.trainingFocus || "先留下第一条真实记录，活镜中枢会开始形成训练方向。"}
      </p>
    </CenterPanel>
  )
}

function DashboardRangeSwitcher({
  range,
  onRangeChange,
}: {
  range: DashboardRange
  onRangeChange: (range: DashboardRange) => void
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {dashboardRanges.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onRangeChange(item.value)}
          className={`rounded-full border px-4 py-2 font-function text-xs font-semibold tracking-[.14em] transition ${
            range === item.value
              ? "border-[rgba(216,183,111,.34)] bg-[rgba(216,183,111,.12)] text-[rgba(244,235,221,.9)]"
              : "border-[rgba(217,189,122,.12)] bg-white/[.025] text-[rgba(220,212,195,.48)] hover:border-[rgba(216,183,111,.24)] hover:text-[rgba(244,235,221,.76)]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function DashboardSourceNotice({ notice }: { notice: string }) {
  if (!notice) return null

  return (
    <GlassPanel className="mt-5">
      <p className="font-function text-sm leading-7 text-[rgba(216,183,111,.76)]">{notice}</p>
    </GlassPanel>
  )
}

function DashboardOverviewPanel({
  dashboard,
  summary,
  range,
}: {
  dashboard: DashboardSummary | null
  summary: DataBindingSummaryResponse | null
  range: DashboardRange
}) {
  const overview = dashboard?.overview
  const generatedAt = dashboard?.generatedAt || dashboard?.generated_at || summary?.archive_index?.updatedAt || summary?.archive_index?.updated_at || ""

  return (
    <CenterPanel className="lg:col-span-6">
      <PanelHeader eyebrow="DashboardSummary · overview" title="心镜数据中枢" />
      <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
        汇总真实复盘、K线训练、训练收藏和执行变化，查看自己的知行轨迹。
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <CenterMetric label="真实复盘次数" value={numberText(overview?.tradeReviewCount ?? overview?.trade_review_count ?? summary?.trade_reviews?.length)} />
        <CenterMetric label="K线训练次数" value={numberText(overview?.klineTrainingCount ?? overview?.kline_training_count ?? summary?.kline_records?.length)} />
        <CenterMetric label="训练收藏次数" value={numberText(overview?.trainingBookmarkCount ?? overview?.training_bookmark_count ?? summary?.training_bookmarks?.length)} />
        <CenterMetric label="活跃天数" value={numberText(overview?.activeDays ?? overview?.active_days)} />
      </div>
      <p className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
        当前窗口：{rangeLabel(range)} · 最近更新：{dateText(generatedAt)}
      </p>
    </CenterPanel>
  )
}

function ExecutionDashboardPanel({ dashboard }: { dashboard: DashboardSummary | null }) {
  const execution = dashboard?.execution
  const sampleCount = execution?.sampleCount ?? execution?.sample_count ?? 0

  return (
    <CenterPanel className="lg:col-span-6">
      <PanelHeader eyebrow="执行一致性" title={execution?.label || "样本不足"} />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <CenterMetric label="执行一致率" value={formatRate(execution?.consistencyRate ?? execution?.consistency_rate)} />
        <CenterMetric label="按计划执行" value={numberText(execution?.alignedCount ?? execution?.aligned_count)} />
        <CenterMetric label="执行偏离" value={numberText(execution?.deviatedCount ?? execution?.deviated_count)} />
        <CenterMetric label="说不清 / 样本不足" value={numberText((execution?.unclearCount ?? execution?.unclear_count ?? 0) + (sampleCount ? 0 : 1))} />
      </div>
      <p className="mt-5 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
        Dashboard 只呈现复盘和训练口径，用于行为训练与复盘趋势观察。
      </p>
    </CenterPanel>
  )
}

function DashboardListPanel({
  eyebrow,
  title,
  items,
  emptyText,
  className,
}: {
  eyebrow: string
  title: string
  items: DashboardCountItem[]
  emptyText: string
  className?: string
}) {
  return (
    <CenterPanel className={className}>
      <PanelHeader eyebrow={eyebrow} title={title} />
      <CountList items={items} emptyText={emptyText} />
    </CenterPanel>
  )
}

function TrainingDashboardPanel({ dashboard }: { dashboard: DashboardSummary | null }) {
  const training = dashboard?.training
  const bySourceType = training?.bySourceType || training?.by_source_type || []
  const byTrainingPack = training?.byTrainingPack || training?.by_training_pack || []
  const bySegment = training?.bySegment || training?.by_segment || []

  return (
    <CenterPanel className="lg:col-span-7">
      <PanelHeader eyebrow="训练统计" title="训练包 / 片段 / 来源" />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <CenterMetric label="Sampling 次数" value={numberText(training?.samplingCount ?? training?.sampling_count)} />
        <CenterMetric label="Custom Session" value={numberText(training?.customSessionCount ?? training?.custom_session_count)} />
        <CenterMetric label="Fallback 次数" value={numberText(training?.fallbackCount ?? training?.fallback_count)} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <MiniCountBlock title="sourceType 分布" items={bySourceType} emptyText="暂无训练来源分布。" />
        <MiniCountBlock title="trainingPack 分布" items={byTrainingPack} emptyText="暂无训练包分布。" />
        <MiniCountBlock title="segment 使用" items={bySegment} emptyText="暂无 K线片段使用记录。" />
      </div>
    </CenterPanel>
  )
}

function BookmarkDashboardPanel({ dashboard }: { dashboard: DashboardSummary | null }) {
  const bookmarks = dashboard?.bookmarks
  const latestItems = bookmarks?.latestItems || bookmarks?.latest_items || []

  return (
    <CenterPanel className="lg:col-span-5">
      <PanelHeader eyebrow="训练收藏" title={`${bookmarks?.totalCount ?? bookmarks?.total_count ?? 0} 条收藏`} />
      <CountList items={bookmarks?.byType || bookmarks?.by_type || []} emptyText="暂无收藏类型分布。" />
      <div className="mt-5 grid gap-3">
        {latestItems.length ? (
          latestItems.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4">
              <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">{item.sourceType || item.source_type || item.type}</p>
              <p className="mt-2 line-clamp-2 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">{item.title || item.summary || "未命名收藏"}</p>
            </div>
          ))
        ) : (
          <EmptyText>收藏训练片段后，这里会出现最近收藏。</EmptyText>
        )}
      </div>
    </CenterPanel>
  )
}

function InterventionDashboardPanel({ dashboard }: { dashboard: DashboardSummary | null }) {
  const interventions = dashboard?.interventions
  const executionPlans = dashboard?.executionPlans || dashboard?.execution_plans
  const responseSummary = interventions?.responseSummary || interventions?.response_summary || null
  const outcome = interventions?.outcome || null
  const interventionGaps = interventions?.dataGaps || interventions?.data_gaps || []
  const planGaps = executionPlans?.dataGaps || executionPlans?.data_gaps || []
  const coverage = executionPlans?.coverage || null
  const topMissingErrorTypes = coverage?.topMissingErrorTypes || coverage?.top_missing_error_types || []
  const errorTypesWithPlan = coverage?.errorTypesWithPlan || coverage?.error_types_with_plan || []
  const hasInterventionSamples = (interventions?.totalCount ?? interventions?.total_count ?? 0) > 0

  return (
    <CenterPanel className="lg:col-span-12">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,.42fr)_minmax(0,.58fr)]">
        <div>
          <PanelHeader eyebrow="知行提醒分析" title={outcome?.label || "样本不足"} />
          <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
            这里只分析训练和复盘中的知行提醒，观察提醒后的执行反馈，不提供行情判断或收益承诺。
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <CenterMetric label="提醒总数" value={numberText(interventions?.totalCount ?? interventions?.total_count)} />
            <CenterMetric label="执行反馈样本" value={numberText(outcome?.sampleCount ?? outcome?.sample_count)} />
            <CenterMetric label="已按计划执行" value={numberText(responseSummary?.followedPlanCount ?? responseSummary?.followed_plan_count)} />
            <CenterMetric label="仍然偏离" value={numberText(responseSummary?.deviatedAgainCount ?? responseSummary?.deviated_again_count)} />
          </div>
          <div className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3">
            <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.72)]">执行反馈</p>
            <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
              {typeof (outcome?.followedPlanRate ?? outcome?.followed_plan_rate) === "number"
                ? `按计划反馈占比 ${formatRate(outcome?.followedPlanRate ?? outcome?.followed_plan_rate)}`
                : "样本不足"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <MiniCountBlock
            title="触发类型分布"
            items={labelCountItems(interventions?.byTriggerType || interventions?.by_trigger_type || [], interventionTriggerText)}
            emptyText="暂无知行提醒触发样本。"
          />
          <MiniCountBlock
            title="用户响应分布"
            items={labelCountItems(interventions?.byUserResponse || interventions?.by_user_response || [], interventionResponseText)}
            emptyText="暂无用户响应样本。"
          />
          <MiniCountBlock
            title="覆盖的错题类型"
            items={interventions?.byErrorType || interventions?.by_error_type || []}
            emptyText="暂无错题类型覆盖。"
          />
          <MiniCountBlock
            title="执行计划覆盖"
            items={errorTypesWithPlan}
            emptyText="暂无启用中的执行计划覆盖。"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.02] p-4">
          <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">待补执行计划的错题</p>
          <CountList items={topMissingErrorTypes} emptyText="高频错题已有启用中的执行计划，或当前样本不足。" />
        </div>
        <div className="rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.02] p-4">
          <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">提醒数据缺口</p>
          {hasInterventionSamples || interventionGaps.length || planGaps.length ? (
            <DataGapList gaps={[...interventionGaps, ...planGaps]} emptyText="暂无明确提醒数据缺口。" />
          ) : (
            <EmptyText>还没有足够的知行提醒样本。完成几次训练或复盘提醒后，这里会显示提醒后的执行反馈。</EmptyText>
          )}
        </div>
      </div>
    </CenterPanel>
  )
}

function WeeklyMirrorDashboardPanel({ weekly }: { weekly: WeeklyMirrorSummary | null }) {
  const execution = weekly?.executionConsistency || weekly?.execution_consistency || null
  const nextWeekTrainingPlan = weekly?.nextWeekTrainingPlan || weekly?.next_week_training_plan || []

  return (
    <CenterPanel className="lg:col-span-7">
      <PanelHeader eyebrow="WeeklyMirrorSummary · 本周活镜摘要" title={`${dateText(weekly?.weekStart || weekly?.week_start || "")} - ${dateText(weekly?.weekEnd || weekly?.week_end || "")}`} />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CenterMetric label="真实复盘" value={numberText(weekly?.tradeReviewCount ?? weekly?.trade_review_count)} />
        <CenterMetric label="K线训练" value={numberText(weekly?.trainingCount ?? weekly?.training_count)} />
        <CenterMetric label="训练收藏" value={numberText(weekly?.bookmarkCount ?? weekly?.bookmark_count)} />
        <CenterMetric label="旧题复现" value={numberText(weekly?.repeatCount ?? weekly?.repeat_count)} />
      </div>
      <p className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
        本周执行一致率：{formatRate(execution?.consistencyRate ?? execution?.consistency_rate)}
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <MiniCountBlock title="本周高频错题" items={weekly?.topErrorTypes || weekly?.top_error_types || []} emptyText="暂无错题样本。" />
        <MiniCountBlock title="本周第一念" items={weekly?.topFirstThoughts || weekly?.top_first_thoughts || []} emptyText="暂无第一念样本。" />
        <MiniCountBlock title="本周触发场景" items={weekly?.topTriggerScenes || weekly?.top_trigger_scenes || []} emptyText="暂无触发场景。" />
      </div>
      <div className="mt-5">
        <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">nextWeekTrainingPlan</p>
        {nextWeekTrainingPlan.length ? (
          <ul className="mt-3 grid gap-2">
            {nextWeekTrainingPlan.slice(0, 4).map((item) => (
              <li key={item} className="rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.02] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyText>样本不足时，下一周训练计划会先保持空白。</EmptyText>
        )}
      </div>
    </CenterPanel>
  )
}

function DashboardDataGapsPanel({
  dashboard,
  weekly,
}: {
  dashboard: DashboardSummary | null
  weekly: WeeklyMirrorSummary | null
}) {
  const dataGaps = [
    ...(dashboard?.dataGaps || dashboard?.data_gaps || []),
    ...(weekly?.dataGaps || weekly?.data_gaps || []),
  ]

  return (
    <CenterPanel className="lg:col-span-5">
      <PanelHeader eyebrow="dataGaps" title="数据缺口" />
      {dataGaps.length ? (
        <div className="mt-5 grid gap-3">
          {dataGaps.slice(0, 6).map((gap) => (
            <div key={`${gap.type}-${gap.label}`} className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4">
              <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">{gap.label}</p>
              <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">{gap.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyText>暂无明确数据缺口。后续知行提醒、执行计划等数据会逐步接入。</EmptyText>
      )}
    </CenterPanel>
  )
}

function TripleReflectionPanel({ profile }: { profile: LivingMirrorProfile | null }) {
  const triple = profile?.tripleReflection || null

  return (
    <CenterPanel className="lg:col-span-7">
      <PanelHeader eyebrow="三证互照" title={triple?.evidenceLevelText || triple?.stateLabel || "待补全"} />
      {triple?.unifiedConclusion ? (
        <p className="mt-4 font-story text-3xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">
          {triple.unifiedConclusion}
        </p>
      ) : null}
      {triple?.proofLine ? (
        <p className="mt-3 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.66)]">
          {triple.proofLine}
        </p>
      ) : null}
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {(triple?.rows || [
          { key: "assessment", name: "九镜测评", mirror: "待照见", statusText: "待测评" },
          { key: "kline", name: "K线盲练", mirror: "待照见", statusText: "待训练" },
          { key: "trade", name: "真实复盘", mirror: "待照见", statusText: "待复盘" },
        ]).map((row) => (
          <div key={row.key} className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4">
            <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">{row.name}</p>
            <p className="mt-3 line-clamp-2 font-story text-2xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">
              {row.mirror}
            </p>
            <p className="mt-2 font-function text-xs leading-6 text-[rgba(220,212,195,.48)]">{row.statusText}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 font-function text-sm leading-7 text-[rgba(220,212,195,.6)]">
        {triple?.conclusion || "先完成测评、一次K线盲练或一条真实复盘，三路会开始互相校准。"}
      </p>
      {triple?.nextCalibration ? (
        <p className="mt-3 font-function text-sm leading-7 text-[rgba(216,183,111,.7)]">
          {triple.nextCalibration}
        </p>
      ) : null}
    </CenterPanel>
  )
}

function PrescriptionDispatchPanel({
  prescription,
  isDispatching,
  message,
  onDispatch,
}: {
  prescription: TrainingPrescriptionDispatch | null
  isDispatching: boolean
  message: string
  onDispatch: () => void
}) {
  return (
    <CenterPanel className="lg:col-span-12">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.34fr)] lg:items-end">
        <div>
          <PanelHeader eyebrow="训练处方下发" title={prescription?.title || "等待活镜生成今日训练"} />
          <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
            {prescription?.reason || "完成九镜测评、K线盲练或真实复盘后，中枢服务会生成同一份今日训练，小程序接收后写入今日陪跑。"}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CenterMetric label="处方状态" value={prescriptionStatusText(prescription?.status || "")} />
            <CenterMetric label="主修镜" value={prescription?.mirror || "待照见"} />
            <CenterMetric label="训练日" value={prescription ? `Day ${prescription.day}` : "待生成"} />
          </div>
          {prescription?.action ? (
            <p className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.66)]">
              今日动作：{prescription.action}
            </p>
          ) : null}
          {prescription?.klinePractice ? (
            <p className="mt-3 font-function text-xs leading-6 text-[rgba(220,212,195,.48)]">
              K线观心：{prescription.klinePractice.marketKey} · {prescription.klinePractice.timeframeKey} · {prescription.klinePractice.reason}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3">
          <PrimaryButton className="w-full" disabled={!prescription || isDispatching} onClick={onDispatch}>
            {isDispatching ? "正在下发" : "下发到小程序"}
          </PrimaryButton>
          <p className="min-h-6 text-center font-function text-xs leading-6 text-[rgba(216,183,111,.66)]">
            {message || "小程序接收后，会覆盖今日训练入口。"}
          </p>
        </div>
      </div>
    </CenterPanel>
  )
}

function TradeReviewLibrary({ reviews }: { reviews: TradeReview[] }) {
  return (
    <CenterPanel className="lg:col-span-7">
      <PanelHeader eyebrow="活镜证据链 · 真实记录库" title={`${reviews.length} 条真实复盘`} />
      <div className="mt-5 grid gap-3">
        {reviews.length ? (
          reviews.slice(0, 4).map((review) => <TradeReviewRow key={review.id} review={review} />)
        ) : (
          <EmptyText>小程序或网页完成一次真实复盘后，这里会出现同一条记录。</EmptyText>
        )}
      </div>
    </CenterPanel>
  )
}

function KLineLab({ records }: { records: DataBindingKLineRecord[] }) {
  return (
    <CenterPanel className="lg:col-span-5">
      <PanelHeader eyebrow="盲练实验室" title={`${records.length} 次K线观心`} />
      <div className="mt-5 grid gap-3">
        {records.length ? (
          records.slice(0, 3).map((record, index) => (
            <div key={`${record.scene}-${record.recordedAt || index}`} className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4">
              <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">
                Day {record.day || index + 1}
              </p>
              <p className="mt-3 font-story text-2xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">{record.scene}</p>
              <p className="mt-3 line-clamp-2 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">{record.reaction}</p>
            </div>
          ))
        ) : (
          <EmptyText>完成一次历史K线盲练后，这里会成为压力反应的对照样本。</EmptyText>
        )}
      </div>
    </CenterPanel>
  )
}

function AssistantWorkbench({ assistant }: { assistant: DataBindingSummaryResponse["assistant_summary"] }) {
  return (
    <CenterPanel className="lg:col-span-12">
      <PanelHeader eyebrow="助教工作台" title={assistant?.priority || "待生成照见摘要"} />
      {assistant ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <CenterMetric label="当前主型" value={assistant.primaryType} />
          <CenterMetric label="高频风险" value={assistant.riskLabel} />
          <CenterMetric label="训练承接" value={assistant.trainingCamp} />
          <div className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4 md:col-span-3">
            <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">助教话术</p>
            <p className="mt-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">{assistant.script}</p>
          </div>
        </div>
      ) : (
        <EmptyText>完成测评与一次真实复盘后，系统会生成助教承接摘要，方便继续陪跑。</EmptyText>
      )}
    </CenterPanel>
  )
}

function TradeReviewRow({ review }: { review: TradeReview }) {
  const context = review.marketContext
  const statusSteps = review.crossEndStatusSteps || []

  return (
    <div className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">
            {review.tradeDate || "未填日期"} · {context?.marketLabel || review.marketType || "市场待确认"}
          </p>
          <h3 className="mt-3 font-story text-2xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">
            {review.detectedMirror}
          </h3>
        </div>
        <span className="rounded-full border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.07)] px-3 py-1 font-function text-xs text-[rgba(180,214,194,.7)]">
          {review.crossEndStatusText || contextStatusText(context?.status || "")}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 font-function text-sm leading-7 text-[rgba(220,212,195,.6)]">{review.reviewText}</p>
      <p className="mt-3 line-clamp-2 font-function text-xs leading-6 text-[rgba(220,212,195,.44)]">
        当时位置：{context?.positionLabel || "待历史数据载入后回看"}
      </p>
      <p className="mt-2 font-function text-[11px] leading-5 text-[rgba(220,212,195,.34)]">
        记录编号：{review.reviewId || review.id}
      </p>
      {statusSteps.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {statusSteps.map((step) => (
            <span
              key={step.key}
              className={`rounded-full border px-3 py-1 font-function text-[11px] leading-5 ${
                step.current
                  ? "border-[rgba(216,183,111,.28)] bg-[rgba(216,183,111,.075)] text-[rgba(216,183,111,.82)]"
                  : step.done
                    ? "border-[rgba(95,132,117,.2)] bg-[rgba(95,132,117,.06)] text-[rgba(180,214,194,.72)]"
                    : "border-[rgba(217,189,122,.08)] bg-white/[.02] text-[rgba(220,212,195,.36)]"
              }`}
            >
              {step.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function CenterPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <GlassPanel className={`mirror-center-panel min-w-[240px] ${className || ""}`}>{children}</GlassPanel>
}

function PanelHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#d8b76f]">{eyebrow}</p>
      <h2 className="mt-3 line-clamp-2 font-story text-3xl font-light tracking-[.08em] text-[rgba(244,235,221,.9)]">
        {title}
      </h2>
    </div>
  )
}

function CenterMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] px-4 py-4">
      <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">{label}</p>
      <p className="mt-3 line-clamp-2 font-story text-2xl font-light tracking-[.06em] text-[rgba(244,235,221,.88)]">{value}</p>
    </div>
  )
}

function EmptyText({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.02] px-4 py-4 font-function text-sm leading-7 text-[rgba(220,212,195,.5)]">
      {children}
    </p>
  )
}

function CountList({ items, emptyText }: { items: DashboardCountItem[]; emptyText: string }) {
  if (!items.length) return <EmptyText>{emptyText}</EmptyText>

  return (
    <div className="mt-5 grid gap-3">
      {items.slice(0, 5).map((item) => (
        <div key={`${item.key}-${item.label}`} className="flex items-center justify-between gap-3 rounded-[8px] border border-[rgba(217,189,122,.12)] bg-white/[.025] px-4 py-3">
          <span className="min-w-0 truncate font-function text-sm text-[rgba(220,212,195,.66)]">{item.label || item.key}</span>
          <span className="shrink-0 font-story text-xl font-light tracking-[.06em] text-[rgba(244,235,221,.86)]">{item.count}</span>
        </div>
      ))}
    </div>
  )
}

function MiniCountBlock({ title, items, emptyText }: { title: string; items: DashboardCountItem[]; emptyText: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.02] p-4">
      <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">{title}</p>
      <div className="mt-3">
        <CountList items={items.slice(0, 3)} emptyText={emptyText} />
      </div>
    </div>
  )
}

function DataGapList({ gaps, emptyText }: { gaps: DashboardDataGap[]; emptyText: string }) {
  if (!gaps.length) return <EmptyText>{emptyText}</EmptyText>

  return (
    <div className="mt-3 grid gap-3">
      {gaps.slice(0, 4).map((gap) => (
        <div key={`${gap.type}-${gap.label}`} className="rounded-[8px] border border-[rgba(217,189,122,.1)] bg-white/[.02] px-4 py-3">
          <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(216,183,111,.7)]">{gap.label}</p>
          <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">{gap.message}</p>
        </div>
      ))}
    </div>
  )
}

function labelCountItems(items: DashboardCountItem[], mapper: (key: string) => string) {
  return items.map((item) => ({
    ...item,
    label: mapper(item.key || item.label) || item.label || item.key,
  }))
}

function interventionTriggerText(value: string) {
  const labels: Record<string, string> = {
    before_training: "训练前",
    during_training: "训练中",
    after_review: "复盘后",
    weekly_plan: "周期计划",
    repeated_mistake: "旧题复现",
    execution_deviation: "执行偏离",
  }
  return labels[value] || value
}

function interventionResponseText(value: string) {
  const labels: Record<string, string> = {
    continue: "继续",
    change_to_hold: "改为观望",
    later: "稍后再练",
    mute_session: "本局不再提醒",
    followed_plan: "已按计划执行",
    deviated_again: "仍然偏离",
    unclear: "说不清",
  }
  return labels[value] || value
}

function numberText(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0"
  return `${value}`
}

function formatRate(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "样本不足"
  return `${Math.round(value * 100)}%`
}

function dateText(value: string | undefined) {
  if (!value) return "待生成"
  return value.slice(0, 10)
}

function rangeLabel(range: DashboardRange) {
  return dashboardRanges.find((item) => item.value === range)?.label || "30 天"
}

function contextStatusText(status: string) {
  if (status === "ready") return "历史回看已载入"
  if (status === "missing_cache") return "等待历史缓存"
  if (status === "missing_symbol") return "待补充标的"
  if (status === "failed") return "回看待重试"
  return "手动复盘"
}

function prescriptionStatusText(status: string) {
  if (status === "dispatched") return "已下发"
  if (status === "received") return "已接收"
  if (status === "ready") return "待下发"
  return "待生成"
}
