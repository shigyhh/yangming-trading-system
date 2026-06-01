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

          <GlassPanel className="archive-panel archive-actions-card">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">延展</p>
          <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
            把今日心证继续沉淀成可复看的证据。
          </h2>
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
      <style jsx>{`
        .archive-page {
          animation: archive-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .archive-hero-grid {
          display: grid;
          gap: 1.25rem;
          align-items: end;
        }

        .archive-title {
          max-width: 13.5em;
          font-size: clamp(3.2rem, 7.2vw, 7.8rem);
        }

        .archive-next-card,
        .archive-panel {
          position: relative;
          overflow: hidden;
        }

        .archive-next-card::before,
        .archive-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 0%, rgba(216, 183, 111, 0.06), transparent 14rem),
            radial-gradient(circle at 88% 12%, rgba(95, 132, 117, 0.055), transparent 15rem);
          pointer-events: none;
        }

        .archive-dashboard-grid {
          display: grid;
          gap: 1rem;
        }

        @media (min-width: 900px) {
          .archive-hero-grid {
            grid-template-columns: minmax(0, 1fr) minmax(340px, 0.42fr);
            min-height: min(48vh, 560px);
          }

          .archive-dashboard-grid {
            grid-template-columns: repeat(12, minmax(0, 1fr));
            align-items: start;
          }

          .archive-user-card {
            grid-column: span 4;
          }

          .archive-proof-card {
            grid-column: span 8;
          }

          .archive-loop-card {
            grid-column: span 7;
          }

          .archive-change-card {
            grid-column: span 5;
          }

          .archive-actions-card {
            grid-column: span 12;
          }
        }

        @media (min-width: 1200px) {
          .archive-user-card {
            grid-column: span 4;
          }

          .archive-proof-card {
            grid-column: span 5;
          }

          .archive-actions-card {
            grid-column: span 3;
          }

          .archive-loop-card {
            grid-column: span 7;
          }

          .archive-change-card {
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
