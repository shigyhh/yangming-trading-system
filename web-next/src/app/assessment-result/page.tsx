"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryLink,
  SecondaryButton,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import { getPracticePrescription } from "@/features/assessment/practice-change"
import { buildPreviewAssessmentReport } from "@/features/assessment/preview-report"
import { getAssessmentTypeLabel, type AssessmentReport } from "@/features/assessment/report"
import {
  assessmentStorageKeys,
  clearAssessmentProgress,
  getStorage,
  hasSavedPhone,
  setStorage,
} from "@/features/assessment/storage"
import {
  buildMirrorReport,
  mirrorReportStorageKey,
} from "@/features/mirror-report/mirrorReportEngine"
import {
  loadMirrorReport,
  saveMirrorReport,
} from "@/features/mirror-report/mirrorReportStorage"
import type { MirrorReport, MirrorReportRiskRadar } from "@/features/mirror-report/mirrorReportTypes"

function clampRisk(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getRiskLevel(value: number) {
  if (value >= 68) return "偏强"
  if (value >= 34) return "中等"
  return "较轻"
}

function makeLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getAnonymousId() {
  const existing = getStorage<string>(assessmentStorageKeys.dataBindingUserId, "")
  if (existing) return existing

  const next = makeLocalId("web")
  setStorage(assessmentStorageKeys.dataBindingUserId, next)
  return next
}

function buildPracticeHref(mirrorReport: MirrorReport, isPreview: boolean) {
  const query = new URLSearchParams({ reportId: mirrorReport.reportId })
  if (isPreview) query.set("preview", "1")
  return `/practice-change?${query.toString()}`
}

function getHeartRiskItems(report: AssessmentReport) {
  return report.riskRadar.map((item) => ({
    key: item.key,
    label: item.label,
    value: clampRisk(item.value),
    description: item.description,
  }))
}

function getTrainingItems(report: AssessmentReport) {
  if (report.trainingPrescription7Days.length) {
    return report.trainingPrescription7Days.map((item) => ({
      day: item.day,
      title: item.theme,
      note: item.action,
      prompt: item.reflectionPrompt,
    }))
  }

  return getPracticePrescription(report).map((item) => ({
    day: item.day,
    title: item.title,
    note: item.note,
    prompt: item.actions?.[0] ?? "把这一念写下来，作为今日复盘入口。",
  }))
}

export default function AssessmentResultPage() {
  const router = useRouter()
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [mirrorReport, setMirrorReport] = useState<MirrorReport | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const previewMode = new URLSearchParams(window.location.search).get("preview") === "1"
      const nextReport = previewMode ? buildPreviewAssessmentReport() : getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null)
      const nextMirrorReport = nextReport
        ? buildMirrorReport({ report: nextReport, anonymousId: getAnonymousId() })
        : loadMirrorReport()

      setIsPreview(previewMode)
      setReport(nextReport)
      setMirrorReport(nextMirrorReport)
      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const restart = () => {
    clearAssessmentProgress()
    router.push("/assessment-ritual")
  }

  const saveCurrentMirrorReport = () => {
    if (!mirrorReport) return

    saveMirrorReport(mirrorReport)
    if (report) setStorage(assessmentStorageKeys.report, report)
    setSavedMessage(
      hasSavedPhone()
        ? "心镜报告已保存。"
        : "心镜报告已保存在此设备。绑定手机号后可长期保存心镜档案。",
    )
  }

  if (!loaded) {
    return (
      <AssessmentShell>
        <StatusPill>正在读取照心心证</StatusPill>
      </AssessmentShell>
    )
  }

  if (!report && mirrorReport) {
    return (
      <StoredMirrorReportPage
        mirrorReport={mirrorReport}
        savedMessage={savedMessage}
        onSave={saveCurrentMirrorReport}
        onRestart={restart}
      />
    )
  }

  if (!report || !mirrorReport) {
    return (
      <AssessmentShell>
        <div className="text-center">
          <StatusPill>暂无心证</StatusPill>
          <h1 className="mt-8 font-story text-4xl font-light leading-[1.35] tracking-[.1em]">
            还没有生成主反应。
          </h1>
          <p className="mt-6 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
            先完成一次照见，心证会保存在这台设备。也可以访问 /assessment-result?preview=1 先看报告卡预览。
          </p>
          <PrimaryLink href="/assessment-entry" className="mt-8 w-full">
            回到照心入口 →
          </PrimaryLink>
        </div>
      </AssessmentShell>
    )
  }

  const heartRiskItems = getHeartRiskItems(report)
  const primaryTypeLabel = getAssessmentTypeLabel(report.primaryType.key)
  const secondaryTypeLabel = getAssessmentTypeLabel(report.secondaryType.key)
  const practiceHref = buildPracticeHref(mirrorReport, isPreview)
  const trainingItems = mirrorReport.sevenDayPrescription.length
    ? mirrorReport.sevenDayPrescription.map((item) => ({
        day: item.day,
        title: item.title,
        note: item.action,
        prompt: item.completionStandard,
      }))
    : getTrainingItems(report)
  const leadTrigger = report.emotionalTriggers[0]

  return (
    <AssessmentShell className="py-5 md:py-8" contentWidth="wide">
      <div className="heart-proof-report mx-auto flex w-full max-w-[1180px] flex-col" data-storage-key="ym_mirror_report_v1">
        <section className="proof-hero grid min-h-[calc(100svh-5rem)] items-center gap-8 py-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1fr)] lg:gap-10">
          <div className="proof-hero-copy">
            <StatusPill>{isPreview ? "报告卡预览" : "心镜报告"}</StatusPill>
            <p className="mt-5 font-function text-xs font-semibold tracking-[.2em] text-[rgba(180,157,93,.82)]">
              心镜报告：你的交易人格被市场照见。
            </p>
            <p className="mt-8 font-function text-xs font-semibold tracking-[.18em] text-[rgba(180,157,93,.68)]">
              一句话照见
            </p>
            <p className="proof-hero-line mt-8">
              {mirrorReport.headline}
            </p>
            <p className="mt-7 max-w-[34rem] font-story text-[1.06rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.64)]">
              {report.conclusion}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <PrimaryLink href={practiceHref} className="w-full">
                进入活镜成长 →
              </PrimaryLink>
              <SecondaryButton type="button" onClick={saveCurrentMirrorReport} className="w-full">
                保存心镜报告
              </SecondaryButton>
            </div>
          </div>

          <ReportCoreCard
            report={report}
            primaryTypeLabel={primaryTypeLabel}
            secondaryTypeLabel={secondaryTypeLabel}
            riskItems={heartRiskItems}
            mirrorReport={mirrorReport}
          />
        </section>

        <section className="report-scroll-grid grid gap-4 pb-8 lg:grid-cols-[1fr_1fr] lg:gap-5">
          <GlassPanel className="proof-panel report-card-surface">
            <p className="report-kicker">风险雷达</p>
            <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
              八个维度，只用于照见行为惯性。
            </h2>
            <RiskRadarLedger riskRadar={mirrorReport.riskRadar} />
          </GlassPanel>

          <GlassPanel className="proof-panel report-card-surface">
            <p className="report-kicker">高危交易剧本</p>
            <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
              不是判断对错，是看见谁在行动。
            </h2>
            <p className="mt-5 font-story text-xl font-light leading-9 tracking-[.05em] text-[rgba(242,235,220,.74)]">
              {mirrorReport.highRiskScenario}
            </p>
            <p className="mt-5 rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
              核心问题：{mirrorReport.coreProblem}
            </p>
          </GlassPanel>

          <GlassPanel className="proof-panel report-card-surface">
            <p className="report-kicker">情绪触发</p>
            <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
              先看见被牵动的一刻。
            </h2>
            <div className="mt-5 grid gap-3">
              {report.emotionalTriggers.map((trigger) => (
                <div key={trigger.key} className="report-trigger">
                  <span>{trigger.label}</span>
                  <p>{trigger.description}</p>
                  <em>{trigger.firstThought}</em>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="proof-panel report-card-surface">
            <p className="report-kicker">训练营建议</p>
            <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
              {report.campSuggestion.name}
            </h2>
            <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
              {report.campSuggestion.reason}
            </p>
            <div className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.18)] bg-[rgba(95,132,117,.055)] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
              训练焦点：{report.campSuggestion.focus}
            </div>
          </GlassPanel>

          <GlassPanel className="proof-panel report-card-surface lg:col-span-2">
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div>
                <p className="report-kicker">七日训练处方</p>
                <p className="mt-2 font-function text-xs font-semibold tracking-[.18em] text-[rgba(180,157,93,.62)]">
                  七日处方
                </p>
                <h2 className="mt-4 font-story text-[clamp(1.8rem,4vw,2.6rem)] font-light leading-[1.45] tracking-[.08em]">
                  不急着改变结果，
                  <br />
                  先训练反应。
                </h2>
                <p className="mt-5 font-function text-sm leading-7 text-[rgba(220,212,195,.52)]">
                  每一天只落下一次觉察、一条动作、一句复盘。训练的是临场前后的自我观察能力。
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {trainingItems.map((practice, index) => (
                  <div
                    key={`${practice.day}-${practice.title}`}
                    className="proof-day rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <p className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.66)]">
                      DAY {practice.day}
                    </p>
                    <p className="mt-2 font-story text-lg font-light tracking-[.06em] text-[rgba(242,235,220,.78)]">
                      {practice.title}
                    </p>
                    <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.52)]">{practice.note}</p>
                    <p className="mt-3 border-t border-[rgba(172,146,83,.1)] pt-3 font-function text-xs leading-6 text-[rgba(220,212,195,.42)]">
                      复盘问句：{practice.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="proof-panel report-card-surface lg:col-span-2">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="report-kicker">下一步</p>
                <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
                  {leadTrigger ? `从「${leadTrigger.label}」开始，连续记录七天。` : "从第一念开始，连续记录七天。"}
                </h2>
                <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.54)]">
                  报告不是给人格下结论，而是帮你把反应模式变成可观察、可训练、可复盘的路径。
                </p>
              </div>
              <div className="grid gap-3 sm:min-w-[280px]">
                <PrimaryLink href={practiceHref} className="w-full">
                  进入活镜成长 →
                </PrimaryLink>
                <SecondaryLink href={isPreview ? "/share-card?preview=1" : "/share-card"} className="w-full">
                  生成照见分享卡 →
                </SecondaryLink>
                <SecondaryLink href="/observing-archive" className="w-full">
                  进入观心档案 →
                </SecondaryLink>
                <SecondaryButton type="button" onClick={restart} className="w-full">
                  重新照心 →
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={saveCurrentMirrorReport}
                  className="w-full"
                >
                  保存心镜报告
                </SecondaryButton>
              </div>
            </div>
            {savedMessage ? (
              <p className="mt-4 text-center font-function text-xs tracking-[.08em] text-[rgba(220,212,195,.38)]">
                {savedMessage}
              </p>
            ) : null}
          </GlassPanel>
        </section>

        <ComplianceNote>
          本报告用于交易心理觉察，不构成投资建议；本系统不荐股、不喊单、不承诺收益。
        </ComplianceNote>
      </div>
      <style jsx>{`
        .heart-proof-report {
          animation: proof-scroll-open 980ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .proof-hero {
          position: relative;
          isolation: isolate;
        }

        .proof-hero::before {
          content: "";
          position: absolute;
          inset: 7% 8% auto auto;
          width: min(58vw, 520px);
          aspect-ratio: 1;
          border-radius: 50%;
          background:
            repeating-radial-gradient(circle, rgba(216, 183, 111, 0.07) 0 1px, transparent 1px 18px),
            radial-gradient(circle, rgba(95, 132, 117, 0.12), transparent 60%);
          filter: blur(0.2px);
          opacity: 0.44;
          z-index: -1;
        }

        .proof-hero-line {
          margin-bottom: 0;
          font-family: var(--font-narrative);
          font-size: clamp(2.45rem, 7.4vw, 5.7rem);
          font-weight: 300;
          line-height: 1.42;
          letter-spacing: 0.08em;
          color: rgba(242, 235, 220, 0.9);
          text-shadow: 0 0 34px rgba(216, 183, 111, 0.08);
          animation: proof-line-in 980ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .proof-hero-copy {
          animation: proof-line-in 980ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .proof-panel {
          animation: proof-panel-in 760ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .report-card-surface {
          position: relative;
          overflow: hidden;
        }

        .report-card-surface::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 0%, rgba(216, 183, 111, 0.07), transparent 18rem),
            radial-gradient(circle at 86% 18%, rgba(95, 132, 117, 0.08), transparent 16rem);
          pointer-events: none;
        }

        .report-kicker {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.86);
        }

        .report-trigger {
          display: grid;
          gap: 0.5rem;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          padding: 1rem;
        }

        .report-trigger span {
          font-family: var(--font-story);
          font-size: 1.15rem;
          font-weight: 300;
          letter-spacing: 0.06em;
          color: rgba(242, 235, 220, 0.78);
        }

        .report-trigger p {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.9rem;
          line-height: 1.8;
          color: rgba(220, 212, 195, 0.52);
        }

        .report-trigger em {
          border-top: 1px solid rgba(172, 146, 83, 0.1);
          padding-top: 0.7rem;
          font-family: var(--font-function);
          font-size: 0.82rem;
          font-style: normal;
          line-height: 1.7;
          color: rgba(216, 183, 111, 0.7);
        }

        .proof-day {
          opacity: 0;
          transform: translateY(10px);
          animation: proof-panel-in 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @media (max-width: 760px) {
          .proof-hero {
            min-height: auto;
            padding-top: 1.5rem;
          }

          .proof-hero-line {
            font-size: clamp(2.25rem, 12vw, 3.6rem);
            line-height: 1.48;
          }
        }

        @keyframes proof-scroll-open {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(20px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes proof-line-in {
          from {
            opacity: 0;
            filter: blur(10px);
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes proof-panel-in {
          from {
            opacity: 0;
            transform: translateY(14px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </AssessmentShell>
  )
}

function ReportCoreCard({
  report,
  primaryTypeLabel,
  secondaryTypeLabel,
  riskItems,
  mirrorReport,
}: {
  report: AssessmentReport
  primaryTypeLabel: string
  secondaryTypeLabel: string
  riskItems: ReturnType<typeof getHeartRiskItems>
  mirrorReport: MirrorReport
}) {
  return (
    <GlassPanel className="proof-panel report-core-card overflow-hidden p-0">
      <div className="relative grid gap-6 px-5 py-6 sm:px-7 sm:py-7">
        <div className="report-core-ring" aria-hidden="true" />
        <div className="relative z-10">
          <p className="font-function text-xs font-semibold tracking-[.2em] text-[#b49d5d]">AI 观心系统 · 报告卡</p>
          <p className="mt-4 font-function text-xs font-semibold tracking-[.18em] text-[rgba(180,157,93,.68)]">
            主人格
          </p>
          <h1 className="mt-5 font-story text-[clamp(2.2rem,6vw,4.1rem)] font-light leading-[1.25] tracking-[.1em] text-[#f2ebdc]">
            {mirrorReport.primaryPersona || primaryTypeLabel}
            <span className="mt-2 block text-[0.46em] tracking-[.16em] text-[rgba(220,212,195,.46)]">
              主反应人格
            </span>
          </h1>
          <p className="mt-5 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
            副人格：{mirrorReport.secondaryPersona || secondaryTypeLabel} · 置信度：{mirrorReport.confidenceScore} · 训练方向：{report.trainingDirection}
          </p>
        </div>

        <RiskRadar items={riskItems} />

        <div className="relative z-10 grid gap-3 sm:grid-cols-2">
          <ReportMetric label="镜中念头" value={report.firstThoughtDisplay || report.firstThought} />
          <ReportMetric label="风险标签" value={riskItems[0]?.label ?? report.primaryType.risk} />
          <ReportMetric label="报告编号" value={mirrorReport.reportId} />
          <ReportMetric label="照心编号" value={mirrorReport.assessmentId} />
          <ReportMetric label="报告结构" value={`${report.schemaVersion} / ${mirrorReportStorageKey}`} />
          <ReportMetric label="合规边界" value={report.complianceNotice} />
        </div>
      </div>
      <style jsx>{`
        .report-core-card {
          background:
            radial-gradient(circle at 24% 10%, rgba(216, 183, 111, 0.14), transparent 18rem),
            radial-gradient(circle at 80% 24%, rgba(95, 132, 117, 0.13), transparent 18rem),
            linear-gradient(180deg, rgba(17, 16, 13, 0.88), rgba(8, 8, 7, 0.94));
        }

        .report-core-ring {
          position: absolute;
          inset: 1.1rem;
          border: 1px solid rgba(216, 183, 111, 0.09);
          border-radius: 50%;
          box-shadow:
            inset 0 0 0 1px rgba(216, 183, 111, 0.05),
            inset 0 0 72px rgba(0, 0, 0, 0.32);
          opacity: 0.72;
          animation: report-breathe 6.8s ease-in-out infinite;
        }

        @keyframes report-breathe {
          0%,
          100% {
            transform: scale(0.992);
            opacity: 0.56;
          }

          50% {
            transform: scale(1.01);
            opacity: 0.82;
          }
        }
      `}</style>
    </GlassPanel>
  )
}

function RiskRadar({ items }: { items: ReturnType<typeof getHeartRiskItems> }) {
  const displayedItems = items.slice(0, 6)
  const center = 120
  const radius = 78
  const count = displayedItems.length || 1
  const points = displayedItems
    .map((item, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
      const valueRadius = (radius * clampRisk(item.value)) / 100
      return `${center + Math.cos(angle) * valueRadius},${center + Math.sin(angle) * valueRadius}`
    })
    .join(" ")
  const gridLines = [0.33, 0.66, 1]

  return (
    <div className="relative z-10 grid gap-5 rounded-[8px] border border-[rgba(172,146,83,.12)] bg-black/15 p-4 lg:grid-cols-[250px_1fr] lg:items-center">
      <svg viewBox="0 0 240 240" className="mx-auto h-[240px] w-[240px]" role="img" aria-label="风险雷达">
        {gridLines.map((ratio) => {
          const gridPoints = displayedItems
            .map((_, index) => {
              const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
              const currentRadius = radius * ratio
              return `${center + Math.cos(angle) * currentRadius},${center + Math.sin(angle) * currentRadius}`
            })
            .join(" ")

          return (
            <polygon
              key={ratio}
              points={gridPoints}
              fill="none"
              stroke="rgba(216,183,111,.16)"
              strokeWidth="1"
            />
          )
        })}
        {displayedItems.map((item, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
          const lineX = center + Math.cos(angle) * radius
          const lineY = center + Math.sin(angle) * radius
          const labelX = center + Math.cos(angle) * (radius + 26)
          const labelY = center + Math.sin(angle) * (radius + 24)

          return (
            <g key={item.key}>
              <line x1={center} y1={center} x2={lineX} y2={lineY} stroke="rgba(216,183,111,.12)" strokeWidth="1" />
              <text
                x={labelX}
                y={labelY}
                textAnchor={labelX > center + 8 ? "start" : labelX < center - 8 ? "end" : "middle"}
                dominantBaseline="middle"
                fill="rgba(220,212,195,.52)"
                fontSize="10"
              >
                {item.label}
              </text>
            </g>
          )
        })}
        <polygon points={points} fill="rgba(216,183,111,.18)" stroke="rgba(216,183,111,.68)" strokeWidth="1.5" />
        {displayedItems.map((item, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
          const valueRadius = (radius * clampRisk(item.value)) / 100
          return (
            <circle
              key={`${item.key}-dot`}
              cx={center + Math.cos(angle) * valueRadius}
              cy={center + Math.sin(angle) * valueRadius}
              r="3"
              fill="#D8B76F"
            />
          )
        })}
      </svg>
      <div className="grid gap-3">
        {displayedItems.map((item) => (
          <div key={item.key} className="grid gap-2">
            <div className="flex items-center justify-between gap-4 font-function text-sm text-[rgba(220,212,195,.68)]">
              <span>{item.label}</span>
              <span className="text-[rgba(180,157,93,.78)]">{getRiskLevel(item.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#5F8475,#D8B76F)]"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RiskRadarLedger({ riskRadar }: { riskRadar: MirrorReportRiskRadar }) {
  const items = [
    { key: "impulse", label: "冲动反应", value: riskRadar.impulse },
    { key: "fear", label: "恐惧牵动", value: riskRadar.fear },
    { key: "ego", label: "证明执念", value: riskRadar.ego },
    { key: "stopLossExecution", label: "边界执行", value: riskRadar.stopLossExecution },
    { key: "reviewAbility", label: "复盘觉察", value: riskRadar.reviewAbility },
    { key: "systemConsistency", label: "系统一致", value: riskRadar.systemConsistency },
    { key: "riskControl", label: "风险边界", value: riskRadar.riskControl },
    { key: "independentJudgment", label: "独立判断", value: riskRadar.independentJudgment },
  ]

  return (
    <div className="mt-5 grid gap-3">
      {items.map((item) => (
        <div key={item.key} className="grid gap-2">
          <div className="flex items-center justify-between gap-4 font-function text-sm text-[rgba(220,212,195,.66)]">
            <span>{item.label}</span>
            <span className="text-[rgba(180,157,93,.78)]">{clampRisk(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[.055]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#5F8475,#D8B76F)]"
              style={{ width: `${clampRisk(item.value)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3">
      <p className="font-function text-xs tracking-[.14em] text-[rgba(180,157,93,.58)]">{label}</p>
      <p className="mt-2 font-function text-sm leading-6 text-[rgba(242,235,220,.7)]">{value}</p>
    </div>
  )
}

function StoredMirrorReportPage({
  mirrorReport,
  savedMessage,
  onSave,
  onRestart,
}: {
  mirrorReport: MirrorReport
  savedMessage: string
  onSave: () => void
  onRestart: () => void
}) {
  return (
    <AssessmentShell className="py-5 md:py-8" contentWidth="wide">
      <div className="mx-auto w-full max-w-[1080px]">
        <section className="grid min-h-[calc(100svh-5rem)] items-center gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <StatusPill>心镜报告</StatusPill>
            <p className="mt-5 font-function text-xs font-semibold tracking-[.2em] text-[rgba(180,157,93,.82)]">
              心镜报告：你的交易人格被市场照见。
            </p>
            <p className="mt-8 font-function text-xs font-semibold tracking-[.18em] text-[rgba(180,157,93,.68)]">
              一句话照见
            </p>
            <h1 className="mt-6 font-story text-[clamp(2.6rem,7vw,5.6rem)] font-light leading-[1.32] tracking-[.08em] text-[rgba(242,235,220,.9)]">
              {mirrorReport.headline}
            </h1>
            <p className="mt-7 max-w-[40rem] font-story text-lg font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.64)]">
              {mirrorReport.highRiskScenario}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <PrimaryLink href={buildPracticeHref(mirrorReport, false)} className="w-full">
                进入活镜成长 →
              </PrimaryLink>
              <SecondaryButton type="button" onClick={onSave} className="w-full">
                保存心镜报告
              </SecondaryButton>
            </div>
          </div>

          <GlassPanel>
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">主副人格</p>
            <div className="mt-5 grid gap-3">
              <ReportMetric label="主人格" value={mirrorReport.primaryPersona} />
              <ReportMetric label="副人格" value={mirrorReport.secondaryPersona} />
              <ReportMetric label="置信度" value={`${mirrorReport.confidenceScore}`} />
              <ReportMetric label="报告编号" value={mirrorReport.reportId} />
            </div>
          </GlassPanel>
        </section>

        <section className="grid gap-4 pb-8 lg:grid-cols-2">
          <GlassPanel>
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">风险雷达</p>
            <RiskRadarLedger riskRadar={mirrorReport.riskRadar} />
          </GlassPanel>
          <GlassPanel>
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">训练营建议</p>
            <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
              {mirrorReport.recommendedCamp}
            </h2>
            <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
              本地已保存报告可继续进入活镜成长；绑定手机号后，后续可长期归档。
            </p>
          </GlassPanel>
          <GlassPanel className="lg:col-span-2">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">七日处方</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {mirrorReport.sevenDayPrescription.map((item) => (
                <div key={item.day} className="rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3">
                  <p className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.66)]">
                    DAY {item.day}
                  </p>
                  <p className="mt-2 font-story text-lg font-light tracking-[.06em] text-[rgba(242,235,220,.78)]">{item.title}</p>
                  <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.52)]">{item.action}</p>
                  <p className="mt-3 border-t border-[rgba(172,146,83,.1)] pt-3 font-function text-xs leading-6 text-[rgba(220,212,195,.42)]">
                    完成标准：{item.completionStandard}
                  </p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <SecondaryLink href="/assessment-entry" className="w-full">
            回到照心入口 →
          </SecondaryLink>
          <SecondaryButton type="button" onClick={onRestart} className="w-full">
            重新照心 →
          </SecondaryButton>
        </div>
        {savedMessage ? (
          <p className="mt-4 text-center font-function text-xs tracking-[.08em] text-[rgba(220,212,195,.38)]">
            {savedMessage}
          </p>
        ) : null}
        <ComplianceNote>
          本报告用于交易心理觉察与训练，不构成投资建议；本系统不荐股、不喊单、不承诺收益。
        </ComplianceNote>
      </div>
    </AssessmentShell>
  )
}
