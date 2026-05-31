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
import type { PracticeChangeState, PracticeMetric } from "@/features/assessment/practice-change"
import { getAssessmentTypeLabel, type AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, getStorage } from "@/features/assessment/storage"

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
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReport(getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null))
      setPractice(getStorage<PracticeChangeState | null>(assessmentStorageKeys.practiceChange, null))
      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const nextAction = useMemo(() => getNextAction(report, practice), [report, practice])
  const primaryTypeLabel = report ? getAssessmentTypeLabel(report.primaryType.key) : ""
  const strongestChange = useMemo(() => {
    if (!practice?.metrics.length) return null
    return [...practice.metrics].sort((a, b) => getMetricDelta(b) - getMetricDelta(a))[0]
  }, [practice])

  if (!loaded) {
    return (
      <AssessmentShell>
        <StatusPill>正在归放心证</StatusPill>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5">
      <div className="archive-page flex flex-col">
        <StatusPill>个人观心档案</StatusPill>
        <h1 className="mt-8 font-story text-[clamp(2.35rem,10.5vw,3.7rem)] font-light leading-[1.32] tracking-[.1em]">
          不是记录结果，
          <br />
          是记录此心如何变化。
        </h1>
        <p className="mt-6 font-story text-[1.08rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.62)]">
          每一次照见、每一日事上练，
          <br />
          都会归入这里。
        </p>

        <GlassPanel className="mt-8">
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

        <GlassPanel className="mt-4">
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

        <GlassPanel className="mt-4">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">下一步</p>
          <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
            {nextAction.note}
          </h2>
          <PrimaryLink href={nextAction.href} className="mt-6 w-full">
            {nextAction.label} →
          </PrimaryLink>
          <SecondaryLink href="/global-reflection" className="mt-3 w-full">
            看全球交易者的一念 →
          </SecondaryLink>
        </GlassPanel>

        <ComplianceNote>
          本档案仅用于交易认知、行为训练与风险教育；不构成投资建议，不荐股，不喊单，不承诺收益。
        </ComplianceNote>
      </div>
      <style jsx>{`
        .archive-page {
          animation: archive-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
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
