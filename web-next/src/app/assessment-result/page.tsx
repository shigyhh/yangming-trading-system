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
import { getAssessmentTypeLabel, type AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, clearAssessmentProgress, getStorage } from "@/features/assessment/storage"

function clampRisk(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function scoreRisk(score: number) {
  return clampRisk(score * 20)
}

function getRiskLevel(value: number) {
  if (value >= 68) return "高"
  if (value >= 34) return "中"
  return "低"
}

function getHeartRiskItems(report: AssessmentReport) {
  const scores = report.scores

  return [
    { label: "追涨冲动", value: scoreRisk(scores.fomo_chaser) },
    { label: "扛单执念", value: scoreRisk(scores.hold_and_hope) },
    { label: "空仓焦虑", value: scoreRisk(scores.fomo_chaser + scores.hesitant_watcher) },
    { label: "止盈过早", value: scoreRisk(scores.panic_runner) },
    { label: "报复交易", value: scoreRisk(scores.revenge_rescuer + scores.prove_self) },
    { label: "临盘改计划", value: scoreRisk(scores.hesitant_watcher + scores.over_control) },
  ]
}

const heartProofLines: Record<AssessmentReport["primaryType"]["key"], { first: string; second: string }> = {
  fomo_chaser: {
    first: "你不是不会等。",
    second: "你只是怕错过。",
  },
  panic_runner: {
    first: "你不是不会拿。",
    second: "你只是太怕失去。",
  },
  hold_and_hope: {
    first: "你不是不懂规矩。",
    second: "你只是不甘认错。",
  },
  prove_self: {
    first: "你不是想赢。",
    second: "你只是想证明。",
  },
  revenge_rescuer: {
    first: "你不是缺机会。",
    second: "你只是急着翻回。",
  },
  hesitant_watcher: {
    first: "你不是看不见机会。",
    second: "你只是太怕选错。",
  },
  over_control: {
    first: "你不是要完美。",
    second: "你只是怕失控。",
  },
  numb_repeat: {
    first: "你不是没有偏差。",
    second: "你只是还没回看。",
  },
  disciplined_observer: {
    first: "你不是没有波动。",
    second: "你只是更早看见。",
  },
}

export default function AssessmentResultPage() {
  const router = useRouter()
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReport(getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null))
      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const restart = () => {
    clearAssessmentProgress()
    router.push("/assessment-ritual")
  }

  if (!loaded) {
    return (
      <AssessmentShell>
        <StatusPill>正在读取照心心证</StatusPill>
      </AssessmentShell>
    )
  }

  if (!report) {
    return (
      <AssessmentShell>
        <div className="text-center">
          <StatusPill>暂无心证</StatusPill>
          <h1 className="mt-8 font-story text-4xl font-light leading-[1.35] tracking-[.1em]">
            还没有生成主反应。
          </h1>
          <p className="mt-6 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
            先完成一次照见，心证会保存在这台设备。
          </p>
          <PrimaryLink href="/assessment-entry" className="mt-8 w-full">
            回到照心入口 →
          </PrimaryLink>
        </div>
      </AssessmentShell>
    )
  }

  const heartRiskItems = getHeartRiskItems(report)
  const heartProofLine = heartProofLines[report.primaryType.key]
  const primaryTypeLabel = getAssessmentTypeLabel(report.primaryType.key)
  const secondaryTypeLabel = getAssessmentTypeLabel(report.secondaryType.key)
  const sourceMirror = report.sourceMirror
  const proofLine = sourceMirror
    ? { first: "你最先浮上的那一念：", second: sourceMirror.thought }
    : heartProofLine
  const sevenDayPractice = getPracticePrescription(report)

  return (
    <AssessmentShell className="py-5">
      <div className="heart-proof-report flex flex-col">
        <section className="proof-hero flex min-h-[calc(100svh-4rem)] flex-col justify-center">
          <p className="proof-hero-line">
            {proofLine.first}
            <br />
            {proofLine.second}
          </p>
        </section>

        <GlassPanel className="mt-8 proof-panel">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">
            {sourceMirror ? "九面行为心镜 · 主镜" : "九型交易人格 · 主反应"}
          </p>
          <h2 className="mt-3 font-story text-[clamp(1.82rem,7.5vw,2.55rem)] font-light leading-[1.35] tracking-[.08em]">
            {sourceMirror?.name ?? `${primaryTypeLabel}交易者`}
          </h2>
          <p className="mt-5 font-story text-[1.04rem] font-light leading-9 tracking-[.04em] text-[rgba(220,212,195,.66)]">
            {sourceMirror?.verdict ?? report.primaryType.summary}
          </p>
          <div className="mt-6 grid gap-2 font-function text-sm leading-7 text-[rgba(220,212,195,.55)]">
            <span>镜中念头：{sourceMirror?.thought ?? report.firstThought}</span>
            <span>容易失守：{sourceMirror?.behavior ?? report.primaryType.risk}</span>
            <span>事上练方向：{report.trainingDirection}</span>
          </div>
        </GlassPanel>

        <GlassPanel className="mt-4 proof-panel">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">九型交易人格 · 副反应</p>
          <p className="mt-3 font-story text-2xl font-light tracking-[.06em]">
            {secondaryTypeLabel}交易者
          </p>
          <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.54)]">
            副反应不是另一套分类，也不是缺点；它是同一套九型交易人格中，压力下容易启动的备用模式。
          </p>
        </GlassPanel>

        <GlassPanel className="mt-4 proof-panel">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">心性风险图</p>
          <div className="mt-5 grid gap-4">
            {heartRiskItems.map((item) => (
              <div key={item.label} className="grid gap-2">
                <div className="flex items-center justify-between font-function text-sm text-[rgba(220,212,195,.68)]">
                  <span>{item.label}</span>
                  <span className="text-[rgba(220,212,195,.42)]">{getRiskLevel(item.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#967c3f,#b49d5d)]"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="mt-4 proof-panel">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">七日事上练</p>
          <div className="mt-5 grid gap-3">
            {sevenDayPractice.map((practice, index) => (
              <div
                key={practice.title}
                className="proof-day rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <p className="font-story text-lg font-light tracking-[.06em] text-[rgba(242,235,220,.78)]">
                  第 {practice.day} 日：{practice.title}
                </p>
                <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.52)]">{practice.note}</p>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="mt-4 proof-panel">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">建议修行路径</p>
          <p className="mt-4 font-story text-[1.35rem] font-light leading-[1.7] tracking-[.06em] text-[rgba(242,235,220,.82)]">
            建议进入：
            <br />
            {primaryTypeLabel}交易者七日知行训练
          </p>
          <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.52)]">
            不是教你预测行情，而是帮助你在行情波动时，更早看见自己的第一念。
          </p>
        </GlassPanel>

        <ComplianceNote>
          本心证仅用于交易认知、行为训练与风险教育；不构成投资建议，不荐股，不喊单，不承诺收益。
        </ComplianceNote>

        <div className="result-actions mt-6 grid gap-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <PrimaryLink href="/practice-change" className="w-full">
            开始 7 天事上练 →
          </PrimaryLink>
          <SecondaryButton
            type="button"
            onClick={() => setSavedMessage("心证已保存在此设备。")}
            className="w-full"
          >
            保存心证
          </SecondaryButton>
          <SecondaryLink href="/observing-archive" className="w-full">
            进入观心档案 →
          </SecondaryLink>
          <SecondaryButton type="button" onClick={restart} className="w-full">
            重新照心 →
          </SecondaryButton>
          {savedMessage ? (
            <p className="text-center font-function text-xs tracking-[.08em] text-[rgba(220,212,195,.38)]">{savedMessage}</p>
          ) : null}
        </div>
      </div>
      <style jsx>{`
        .heart-proof-report {
          animation: proof-scroll-open 980ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .proof-hero {
          text-align: center;
        }

        .proof-hero-line {
          margin: 0;
          font-family: var(--font-narrative);
          font-size: clamp(2.05rem, 9.2vw, 4.1rem);
          font-weight: 300;
          line-height: 1.58;
          letter-spacing: 0.08em;
          color: rgba(242, 235, 220, 0.86);
          text-shadow: 0 0 28px rgba(216, 183, 111, 0.06);
          animation: proof-line-in 980ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .proof-panel {
          animation: proof-panel-in 760ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .result-actions {
          position: relative;
          isolation: isolate;
        }

        .result-actions :global(.ritual-pressable) {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            inset 0 -12px 22px rgba(0, 0, 0, 0.16),
            0 12px 26px rgba(0, 0, 0, 0.22),
            0 0 0 1px rgba(216, 183, 111, 0.045);
        }

        .proof-day {
          opacity: 0;
          transform: translateY(10px);
          animation: proof-panel-in 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
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
