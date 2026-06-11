"use client"

import { useEffect, useMemo, useState } from "react"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryLink,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import { compareRiskRadarSnapshots, type PracticeChangeState, type PracticeMetric } from "@/features/assessment/practice-change"
import { getAssessmentTypeLabel, type AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, getStorage } from "@/features/assessment/storage"
import {
  fetchDataBindingSummary,
  getDataBindingUserProfile,
  type DataBindingSummaryResponse,
} from "@/features/data-binding/api-client"
import type { LivingMirrorStats, TradeReview } from "../../../../packages/contracts/living-mirror"

const mirrorScoreLabels: Record<string, string> = {
  chasing: "追涨之镜",
  holding_loss: "扛单之镜",
  fantasy: "幻想之镜",
  gambling: "执念之镜",
  following: "从众之镜",
  hesitation: "犹疑之镜",
  procrastination: "拖延之镜",
  anxiety: "焦虑之镜",
  conscience: "良知之镜",
}

function getMetricDelta(metric: PracticeMetric) {
  return metric.direction === "down" ? metric.before - metric.current : metric.current - metric.before
}

function getMetricChangeText(metric: PracticeMetric) {
  const delta = getMetricDelta(metric)
  if (delta <= 0) return "等待变化"
  return metric.direction === "down" ? `下降 ${delta}%` : `提升 ${delta}%`
}

function getNextAction(report: AssessmentReport | null, practice: PracticeChangeState | null) {
  if (!report) {
    return {
      label: "开始照见",
      href: "/assessment-entry",
      note: "先落下一份观心心证。",
    }
  }

  if (!practice || practice.day === 0) {
    return {
      label: "开始七日事上练",
      href: "/practice-change",
      note: "从第一日开始，把心证放到事上练。",
    }
  }

  if (practice.day < 7) {
    return {
      label: "继续今日事上练",
      href: "/practice-change",
      note: `当前第 ${practice.day} / 7 日，先守住今天这一念。`,
    }
  }

  return {
    label: "复测心证",
    href: "/assessment-ritual",
    note: "七日已满，可以复看七天前后的自己。",
  }
}

export default function ObservingArchivePage() {
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [practice, setPractice] = useState<PracticeChangeState | null>(null)
  const [profile, setProfile] = useState<ReturnType<typeof getDataBindingUserProfile> | null>(null)
  const [remoteSummary, setRemoteSummary] = useState<DataBindingSummaryResponse | null>(null)
  const [serverChecked, setServerChecked] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProfile(getDataBindingUserProfile())
      setReport(getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null))
      setPractice(getStorage<PracticeChangeState | null>(assessmentStorageKeys.practiceChange, null))
      setLoaded(true)
      void fetchDataBindingSummary().then((result) => {
        if (result.ok) setRemoteSummary(result.data)
        setServerChecked(true)
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const nextAction = useMemo(() => getNextAction(report, practice), [report, practice])
  const primaryTypeLabel = report ? getAssessmentTypeLabel(report.primaryType.key) : ""
  const strongestChange = useMemo(() => {
    if (!practice?.metrics.length) return null
    return [...practice.metrics].sort((a, b) => getMetricDelta(b) - getMetricDelta(a))[0]
  }, [practice])
  const lastSyncAt = getStorage<string>(assessmentStorageKeys.dataBindingLastSyncAt, "")
  const trainingRecordCount = remoteSummary?.training_records.length ?? practice?.records.length ?? 0
  const klineRecordCount = remoteSummary?.kline_records.length ?? practice?.records.filter((record) => Boolean(record.klineRecord)).length ?? 0
  const tradeReviewCount = remoteSummary?.trade_reviews.length ?? 0
  const livingMirrorStats = remoteSummary?.living_mirror_stats ?? remoteSummary?.mirror_archive?.livingMirrorStats ?? null
  const tradeReviews = remoteSummary?.trade_reviews ?? remoteSummary?.mirror_archive?.tradeReviews ?? []
  const topMirrorScores = getTopMirrorScores(livingMirrorStats)
  const thiefEntries = getThiefEntries(livingMirrorStats)
  const retestComparisonCount = remoteSummary?.retest_comparison.length
    ?? compareRiskRadarSnapshots(practice?.baselineReport, practice?.retestReport).length
  const dataSourceLabel = remoteSummary
    ? "Server API 已绑定"
    : serverChecked
      ? "本地记录"
      : "同步检测中"
  const bindingUser = remoteSummary?.user
  const latestBindingTime = bindingUser?.updated_at || lastSyncAt
  const reportBindingLabel = remoteSummary?.report ? "报告已归档" : report ? "本地报告待同步" : "暂无报告"
  const assistantBindingLabel = remoteSummary?.assistant_summary ? "助教摘要已生成" : "等待测评后生成"
  const shareCardBindingLabel = remoteSummary?.share_card ? "分享卡已生成" : "未生成分享卡"
  const feishuBindingLabel = remoteSummary?.feishu_sync?.status ? `飞书：${remoteSummary.feishu_sync.status}` : "飞书未同步"

  if (!loaded) {
    return (
      <AssessmentShell>
        <StatusPill>正在归放心证</StatusPill>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-7" contentWidth="wide">
      <div className="archive-page mx-auto w-full max-w-[1440px]">
        <section className="archive-hero-grid">
          <div className="archive-hero-copy">
            <StatusPill>个人观心档案</StatusPill>
            <h1 className="archive-title mt-8 font-story font-light leading-[1.08] tracking-[.08em]">
              不是记录结果，是记录此心如何变化。
            </h1>
            <p className="mt-6 max-w-[38rem] font-story text-[1.12rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.62)]">
              每一次照见、每一日事上练，都会归入这里。
            </p>
          </div>

          <GlassPanel className="archive-next-card">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">下一步</p>
            <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
              {nextAction.note}
            </h2>
            <PrimaryLink href={nextAction.href} className="mt-6 w-full">
              {nextAction.label} →
            </PrimaryLink>
          </GlassPanel>
        </section>

        <section className="archive-dashboard-grid mt-6">
          <GlassPanel className="archive-panel archive-user-card">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">用户中心</p>
            <div className="mt-5 grid gap-3">
              <ArchiveMeta label="账号" value={bindingUser?.nickname || profile?.nickname || "体验学员"} />
              <ArchiveMeta label="手机号" value={bindingUser?.phone || profile?.maskedPhone || "未留存"} />
              <ArchiveMeta label="用户 ID" value={bindingUser?.id || profile?.userId || "等待生成"} />
              <ArchiveMeta label="邀请码来源" value={bindingUser?.invite_source || profile?.inviteSource || "web-next"} />
              <ArchiveMeta label="数据来源" value={dataSourceLabel} />
              <ArchiveMeta label="最近同步" value={latestBindingTime ? formatArchiveTime(latestBindingTime) : "等待首次同步"} />
            </div>
          </GlassPanel>

          <GlassPanel className="archive-panel archive-proof-card">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">今日心证</p>
            {report ? (
              <>
                <h2 className="mt-4 font-story text-3xl font-light leading-[1.45] tracking-[.08em]">
                  {primaryTypeLabel}交易者
                </h2>
                <p className="mt-4 font-story text-[1.08rem] font-light leading-9 tracking-[.04em] text-[rgba(220,212,195,.62)]">
                  {report.primaryType.summary}
                </p>
              </>
            ) : (
              <p className="mt-4 font-story text-2xl font-light leading-[1.55] tracking-[.08em]">
                暂无心证。
              </p>
            )}
          </GlassPanel>

          <GlassPanel className="archive-panel archive-loop-card">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">数据闭环</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ArchiveMeta label="测评报告" value={reportBindingLabel} />
              <ArchiveMeta label="训练记录" value={`${trainingRecordCount} 条`} />
              <ArchiveMeta label="K 线心念记录" value={`${klineRecordCount} 条`} />
              <ArchiveMeta label="真实交易复盘" value={`${tradeReviewCount} 条`} />
              <ArchiveMeta label="复测雷达" value={retestComparisonCount ? `${retestComparisonCount} 项变化` : "等待复测"} />
              <ArchiveMeta label="助教承接" value={assistantBindingLabel} />
              <ArchiveMeta label="分享卡片" value={shareCardBindingLabel} />
              <ArchiveMeta label="飞书同步" value={feishuBindingLabel} />
            </div>
            <p className="mt-4 font-function text-xs leading-6 text-[rgba(220,212,195,.46)]">
              server 未启动时，本页继续读取本机记录；server 启动后，测评、训练、复测、邀请码、助教摘要与分享卡会进入同一份用户数据绑定结构。
            </p>
          </GlassPanel>

          <GlassPanel className="archive-panel archive-change-card">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">七日变化</p>
          {practice ? (
            <>
              <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
                已省察 {practice.day} / 7 日
              </h2>
              <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">
                {strongestChange
                  ? `目前最明显的一处，是${strongestChange.label}${getMetricChangeText(strongestChange)}。`
                  : "变化还在形成。"}
              </p>
              <div className="mt-5 grid gap-3">
                {practice.metrics.slice(0, 4).map((metric) => (
                  <div key={metric.key} className="grid gap-2">
                    <div className="flex items-center justify-between font-function text-sm text-[rgba(220,212,195,.62)]">
                      <span>{metric.label}</span>
                      <span className="text-[rgba(180,157,93,.78)]">{getMetricChangeText(metric)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[.055]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#8b7540,#b49d5d)]"
                        style={{ width: `${metric.current}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">
              尚未开始七日事上练。
            </p>
          )}
          </GlassPanel>

          <GlassPanel className="archive-panel archive-living-card">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">活镜成长</p>
            {livingMirrorStats ? (
              <>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <ArchiveMeta label="训练完成率" value={`${livingMirrorStats.trainingCompletionRate}%`} />
                  <ArchiveMeta label="良知成长值" value={`${livingMirrorStats.conscienceGrowth}`} />
                  <ArchiveMeta label="循环复发次数" value={`${livingMirrorStats.loopRelapseCount}`} />
                </div>
                <div className="mt-5 grid gap-3">
                  <p className="font-function text-xs tracking-[.12em] text-[rgba(220,212,195,.46)]">九镜强度</p>
                  {topMirrorScores.map(([key, value]) => (
                    <MirrorScoreLine key={key} label={mirrorScoreLabels[key] || key} value={value} />
                  ))}
                </div>
                <div className="mt-5">
                  <p className="font-function text-xs tracking-[.12em] text-[rgba(220,212,195,.46)]">心贼频次</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {thiefEntries.length ? (
                      thiefEntries.map(([label, count]) => (
                        <span key={label} className="rounded-full border border-[rgba(180,157,93,.2)] bg-[rgba(180,157,93,.08)] px-3 py-1 font-function text-xs text-[rgba(216,183,111,.82)]">
                          {label} · {count}
                        </span>
                      ))
                    ) : (
                      <span className="font-function text-sm text-[rgba(220,212,195,.5)]">等待更多训练与复盘证据。</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">
                完成测评、训练或真实交易复盘后，这里会沉淀九镜强度、心贼频次和良知成长值。
              </p>
            )}
          </GlassPanel>

          <GlassPanel className="archive-panel archive-review-card">
            <div className="flex items-center justify-between gap-3">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">真实交易复盘明细</p>
              <span className="rounded-full border border-[rgba(217,189,122,.14)] px-3 py-1 font-function text-xs text-[rgba(220,212,195,.48)]">
                {tradeReviews.length} 条
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {tradeReviews.length ? (
                tradeReviews.slice(-3).reverse().map((review) => (
                  <TradeReviewItem key={review.id} review={review} />
                ))
              ) : (
                <p className="rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-5 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">
                  暂无复盘记录。上传截图并写下三问后，这里会出现行为证据。
                </p>
              )}
            </div>
            <SecondaryLink href="/trade-review" className="mt-5 w-full">
              记录一次真实交易复盘 →
            </SecondaryLink>
          </GlassPanel>

          <GlassPanel className="archive-panel archive-actions-card">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">延展</p>
          <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
            把今日心证继续沉淀成可复看的证据。
          </h2>
          <SecondaryLink href="/trade-review" className="mt-3 w-full">
            记录一次真实交易复盘 →
          </SecondaryLink>
          <SecondaryLink href="/share-card" className="mt-3 w-full">
            生成照见分享卡 →
          </SecondaryLink>
          <SecondaryLink href="/global-reflection" className="mt-3 w-full">
            看全球交易者的一念 →
          </SecondaryLink>
          </GlassPanel>
        </section>

        <ComplianceNote>
          本档案仅用于交易认知、行为训练与风险教育；不构成投资建议，不荐股，不喊单，不承诺收益。
        </ComplianceNote>
      </div>
      <style jsx global>{`
        .archive-page {
          animation: archive-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .archive-page .archive-hero-grid {
          display: grid;
          gap: 1.25rem;
          align-items: end;
        }

        .archive-page .archive-title {
          max-width: 13.5em;
          font-size: clamp(3.2rem, 7.2vw, 7.8rem);
        }

        .archive-page .archive-next-card,
        .archive-page .archive-panel {
          position: relative;
          overflow: hidden;
        }

        .archive-page .archive-next-card::before,
        .archive-page .archive-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 0%, rgba(216, 183, 111, 0.06), transparent 14rem),
            radial-gradient(circle at 88% 12%, rgba(95, 132, 117, 0.055), transparent 15rem);
          pointer-events: none;
        }

        .archive-page .archive-dashboard-grid {
          display: grid;
          gap: 1rem;
        }

        @media (min-width: 900px) {
          .archive-page .archive-hero-grid {
            grid-template-columns: minmax(0, 1fr) minmax(340px, 0.42fr);
            min-height: min(48vh, 560px);
          }

          .archive-page .archive-dashboard-grid {
            grid-template-columns: repeat(12, minmax(0, 1fr));
            align-items: start;
          }

          .archive-page .archive-user-card {
            grid-column: span 4;
          }

          .archive-page .archive-proof-card {
            grid-column: span 8;
          }

          .archive-page .archive-loop-card {
            grid-column: span 7;
          }

          .archive-page .archive-change-card {
            grid-column: span 5;
          }

          .archive-page .archive-living-card {
            grid-column: span 7;
          }

          .archive-page .archive-review-card {
            grid-column: span 5;
          }

          .archive-page .archive-actions-card {
            grid-column: span 12;
          }
        }

        @media (max-width: 640px) {
          .archive-page .archive-title {
            font-size: clamp(2.65rem, 13vw, 3.6rem);
            line-height: 1.18;
          }
        }

        @media (min-width: 1200px) {
          .archive-page .archive-user-card {
            grid-column: span 4;
          }

          .archive-page .archive-proof-card {
            grid-column: span 5;
          }

          .archive-page .archive-actions-card {
            grid-column: span 3;
          }

          .archive-page .archive-loop-card {
            grid-column: span 7;
          }

          .archive-page .archive-change-card {
            grid-column: span 5;
          }

          .archive-page .archive-living-card {
            grid-column: span 7;
          }

          .archive-page .archive-review-card {
            grid-column: span 5;
          }
        }

        @keyframes archive-in {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(18px);
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

function ArchiveMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
      <span className="font-function text-xs tracking-[.1em] text-[rgba(220,212,195,.42)]">{label}</span>
      <span className="min-w-0 break-words text-left font-function text-sm text-[rgba(242,235,220,.72)] sm:text-right">{value}</span>
    </div>
  )
}

function MirrorScoreLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between font-function text-sm text-[rgba(220,212,195,.62)]">
        <span>{label}</span>
        <span className="text-[rgba(180,157,93,.78)]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[.055]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#5f8475,#d8b76f)]"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

function TradeReviewItem({ review }: { review: TradeReview }) {
  return (
    <article className="rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="font-function text-sm font-medium text-[rgba(242,235,220,.82)]">{review.detectedMirror}</h3>
        <span className="font-mono text-xs text-[rgba(220,212,195,.42)]">{formatArchiveTime(review.createdAt || review.tradeDate)}</span>
      </div>
      <p className="mt-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
        今日一念：{review.strongestThought}
      </p>
      <p className="mt-2 font-function text-xs leading-6 text-[rgba(220,212,195,.46)]">
        {review.reviewText}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {review.behaviorTags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.07)] px-2.5 py-1 font-function text-[0.68rem] text-[rgba(174,205,191,.78)]">
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}

function getTopMirrorScores(stats: LivingMirrorStats | null) {
  if (!stats?.mirrorScores) return []
  return Object.entries(stats.mirrorScores)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 5)
}

function getThiefEntries(stats: LivingMirrorStats | null) {
  if (!stats?.thiefCounts) return []
  return Object.entries(stats.thiefCounts)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 6)
}

function formatArchiveTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "等待首次同步"
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
