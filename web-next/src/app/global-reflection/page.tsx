"use client"

import { useEffect, useMemo, useState } from "react"

import { AssessmentShell, ComplianceNote, GlassPanel, PrimaryLink, SecondaryLink, StatusPill } from "@/features/assessment/components"
import { getAssessmentTypeLabel, type AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, getStorage } from "@/features/assessment/storage"
import { getDataBindingUserProfile } from "@/features/data-binding/api-client"
import {
  buildFallbackGlobalReflectionSummary,
  fallbackGlobalReflectionChoices,
  fetchGlobalReflectionChoices,
  fetchGlobalReflectionToday,
  submitGlobalReflectionVote,
} from "@/features/global-reflection/api-client"
import type { GlobalReflectionChoice, GlobalReflectionSummary } from "../../../../packages/contracts/global-reflection"

export default function GlobalReflectionPage() {
  const [choices, setChoices] = useState<GlobalReflectionChoice[]>(fallbackGlobalReflectionChoices)
  const [summary, setSummary] = useState<GlobalReflectionSummary>(buildFallbackGlobalReflectionSummary)
  const [selectedKey, setSelectedKey] = useState(fallbackGlobalReflectionChoices[0]?.key || "")
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReport(getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null))
      setLoaded(true)
      void fetchGlobalReflectionChoices().then((result) => {
        if (result.ok && result.data.choices.length) {
          setChoices(result.data.choices)
          setSelectedKey((current) => current || result.data.choices[0].key)
        }
      })
      void fetchGlobalReflectionToday().then((result) => {
        if (result.ok) setSummary(result.data.summary)
        else setMessage(result.error)
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const primaryType = useMemo(() => {
    if (!report) return "未完成测评"
    return getAssessmentTypeLabel(report.primaryType.key)
  }, [report])
  const leading = summary.leadingThought
  const choiceStats = summary.choices.length ? summary.choices : choices.map((choice) => ({ ...choice, count: 0, percentage: 0 }))

  async function submitVote() {
    if (!selectedKey) return
    setSubmitting(true)
    setMessage("")

    const profile = getDataBindingUserProfile()
    const result = await submitGlobalReflectionVote({
      anonymousId: profile.userId,
      thoughtKey: selectedKey,
      primaryType,
      sourceChannel: "web-next",
    })

    if (result.ok) {
      setSummary(result.data.summary)
      setMessage("今日一念已匿名落入长卷。")
    } else {
      setMessage(result.error)
    }
    setSubmitting(false)
  }

  return (
    <AssessmentShell className="py-5 md:py-8" contentWidth="wide">
      <div className="global-reflection mx-auto w-full max-w-[1320px]">
        <section className="global-hero-grid">
          <div className="global-hero-copy">
            <StatusPill>全球照见层 · MVP</StatusPill>
            <h1 className="mt-8 max-w-[11em] font-story text-[clamp(3rem,7.8vw,7.2rem)] font-light leading-[1.08] tracking-[.08em]">
              不是只有你，会被那一念牵动。
            </h1>
            <p className="mt-6 max-w-[38rem] font-story text-[1.1rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.62)]">
              这里收集的是匿名交易反应，不是发帖，不是排行，也不是行情判断。
            </p>
          </div>

          <GlassPanel className="global-panel global-vote-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">今日一念投票</p>
              <p className="mt-2 font-function text-xs leading-6 text-[rgba(220,212,195,.44)]">
                选择今天最先浮上的交易反应。系统只记录匿名镜像。
              </p>
            </div>
            <span className="rounded-full border border-[rgba(172,146,83,.16)] px-3 py-1 font-mono text-xs text-[rgba(220,212,195,.46)]">
              {summary.totalVotes} 念
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {choiceStats.map((choice) => {
              const active = selectedKey === choice.key
              return (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => setSelectedKey(choice.key)}
                  className={`rounded-[8px] border px-4 py-4 text-left transition duration-300 ${
                    active
                      ? "border-[rgba(180,157,93,.42)] bg-[rgba(180,157,93,.12)]"
                      : "border-[rgba(172,146,83,.12)] bg-white/[.025] hover:border-[rgba(180,157,93,.28)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-story text-2xl font-light tracking-[.08em] text-[rgba(242,235,220,.84)]">{choice.label}</span>
                    <span className="font-mono text-xs text-[rgba(220,212,195,.45)]">{choice.percentage}%</span>
                  </div>
                  <p className="mt-3 font-function text-sm leading-7 text-[rgba(220,212,195,.52)]">{choice.note}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.055]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#8b7540,#b49d5d)]"
                      style={{ width: `${choice.percentage}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={submitVote}
            disabled={submitting || !loaded}
            className="ritual-pressable mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[linear-gradient(180deg,#b49d5d,#967c3f)] px-7 text-center font-function text-[0.96rem] font-semibold tracking-[.12em] text-[#0c0b08] shadow-[0_18px_42px_rgba(0,0,0,.36),inset_0_1px_0_rgba(255,255,255,.24)] transition duration-300 enabled:hover:brightness-110 enabled:active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? "落入长卷中..." : "匿名落下一念"}
          </button>
          {message ? (
            <p className="mt-3 text-center font-function text-xs tracking-[.08em] text-[rgba(220,212,195,.42)]">{message}</p>
          ) : null}
          </GlassPanel>
        </section>

        <section className="global-insight-grid mt-5">
          <GlassPanel className="global-panel">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">匿名人格镜像</p>
          <p className="mt-4 font-story text-[1.3rem] font-light leading-[1.7] tracking-[.06em] text-[rgba(242,235,220,.8)]">
            {leading ? `今日最常被照见的是「${leading.label}」。` : "今日还没有形成明显镜像。"}
          </p>
          <div className="mt-5 grid gap-3">
            {summary.mirrors.length ? (
              summary.mirrors.map((mirror) => (
                <MirrorRow key={mirror.primaryType} label={mirror.primaryType} count={mirror.count} percentage={mirror.percentage} />
              ))
            ) : (
              <p className="rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-4 font-function text-sm leading-7 text-[rgba(220,212,195,.5)]">
                完成测评后参与，会把你的主反应匿名汇入这里。
              </p>
            )}
          </div>
          </GlassPanel>

          <GlassPanel className="global-panel">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">全球修行长卷</p>
          <div className="mt-5 grid gap-3">
            {summary.scroll.length ? (
              summary.scroll.map((item) => (
                <div key={item.id} className="rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-4">
                  <p className="font-story text-lg font-light leading-8 tracking-[.06em] text-[rgba(242,235,220,.76)]">{item.line}</p>
                  <p className="mt-2 font-function text-xs text-[rgba(220,212,195,.36)]">{formatTime(item.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-4 font-function text-sm leading-7 text-[rgba(220,212,195,.5)]">
                今日长卷还在等待第一念落下。
              </p>
            )}
          </div>
          </GlassPanel>
        </section>

        <div className="mt-6 grid gap-3 pb-[max(16px,env(safe-area-inset-bottom))] md:grid-cols-2 lg:max-w-[760px]">
          <PrimaryLink href="/observing-archive" className="w-full">
            回到观心档案 →
          </PrimaryLink>
          <SecondaryLink href="/share-card" className="w-full">
            生成照见分享卡 →
          </SecondaryLink>
        </div>

        <ComplianceNote>
          {summary.compliance || "全球照见层仅用于匿名交易心理观察与风险教育；不构成投资建议。"}
        </ComplianceNote>
      </div>
      <style jsx>{`
        .global-reflection {
          animation: global-reflection-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .global-hero-grid,
        .global-insight-grid {
          display: grid;
          gap: 1rem;
        }

        .global-panel {
          position: relative;
          overflow: hidden;
        }

        .global-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 16% 0%, rgba(216, 183, 111, 0.065), transparent 15rem),
            radial-gradient(circle at 86% 18%, rgba(95, 132, 117, 0.06), transparent 16rem);
          pointer-events: none;
        }

        @media (min-width: 980px) {
          .global-hero-grid {
            grid-template-columns: minmax(0, 1fr) minmax(390px, 0.46fr);
            align-items: center;
            min-height: min(58vh, 640px);
          }

          .global-insight-grid {
            grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
            align-items: start;
          }
        }

        @keyframes global-reflection-in {
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

function MirrorRow({ label, count, percentage }: { label: string; count: number; percentage: number }) {
  return (
    <div className="rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="font-function text-sm text-[rgba(242,235,220,.72)]">{label}</span>
        <span className="font-mono text-xs text-[rgba(220,212,195,.42)]">{count} · {percentage}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.055]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#5f8475,#b49d5d)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "刚刚"
  return date.toLocaleString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}
