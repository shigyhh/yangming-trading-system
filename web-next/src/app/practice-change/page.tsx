"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { YangmingCharacterMark } from "@/components/brand/yangming-character-mark"
import { YangmingC16Mark, YangmingGlyph } from "@/components/brand/yangming-mark"
import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  PrimaryButton,
  PrimaryLink,
  SecondaryButton,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import {
  advancePracticeChange,
  canRecordPracticeToday,
  createPracticeChange,
  getPracticePrescription,
  type PracticeChangeState,
  type PracticeMetric,
} from "@/features/assessment/practice-change"
import type { AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, clearAssessmentProgress, getStorage, setStorage } from "@/features/assessment/storage"
import { HeartProofCard } from "@/features/heart-proof/HeartProofCard"
import { buildDailyGrowthHeartProof, formatHeartProofForCopy } from "@/features/heart-proof/heartProofEngine"
import { loadLatestHeartProof, saveHeartProof } from "@/features/heart-proof/heartProofStorage"
import type { HeartProof } from "@/features/heart-proof/heartProofTypes"
import { cn } from "@/lib/utils"

function getMetricDelta(metric: PracticeMetric) {
  return metric.direction === "down" ? metric.before - metric.current : metric.current - metric.before
}

function getChangeLabel(metric: PracticeMetric) {
  const delta = getMetricDelta(metric)
  if (delta <= 0) return "等待省察"
  return metric.direction === "down" ? `下降 ${delta}%` : `提升 ${delta}%`
}

function getPracticeCounts(practice: PracticeChangeState) {
  const completed = practice.records.filter((record) => (record.status ?? "completed") === "completed").length
  const missed = practice.records.filter((record) => record.status === "missed").length

  return { completed, missed }
}

function getStrongestChange(metrics: PracticeMetric[]) {
  return [...metrics].sort((a, b) => getMetricDelta(b) - getMetricDelta(a))[0]
}

function getMetricBefore(practice: PracticeChangeState, key: PracticeMetric["key"]) {
  return practice.metrics.find((metric) => metric.key === key)?.before
}

function getDailyGrowthBaselineScores(practice: PracticeChangeState) {
  return {
    emptyPositionAnxiety: getMetricBefore(practice, "emptyAnxiety"),
    chaseImpulse: getMetricBefore(practice, "chaseImpulse"),
    stopLossExecution: getMetricBefore(practice, "stopLossExecution"),
    planChange: getMetricBefore(practice, "planChange"),
    knowingDoing: getMetricBefore(practice, "zhixing"),
  }
}

function getDailyGrowthThoughtType(report: AssessmentReport) {
  switch (report.sourceMirror?.id) {
    case "chasing":
      return "chase"
    case "following":
      return "ask_others"
    case "hesitation":
    case "anxiety":
      return "wait_pullback"
    case "holdingLoss":
    case "fantasy":
    case "procrastination":
      return "abandon_plan"
    default:
      return "fomo"
  }
}

function getDailyGrowthThoughtLabel(report: AssessmentReport) {
  return report.firstThoughtDisplay || report.firstThought || report.sourceMirror?.thought || report.primaryType.label
}

function buildPracticeGrowthRecord(nextPractice: PracticeChangeState) {
  const record = nextPractice.records.find((item) => item.day === nextPractice.day) ?? nextPractice.records.at(-1)
  const createdAt = record?.recordedAt ?? new Date().toISOString()
  const dateKey = record?.dateKey ?? createdAt.slice(0, 10)

  return {
    growthRecordId: `practice_change_${dateKey}_day_${nextPractice.day}`,
    createdAt,
    record,
  }
}

function buildHeartProofId(sourceId: string) {
  return `heart_proof_${sourceId}`.replace(/[^a-zA-Z0-9_-]/g, "_")
}

function getDailyGrowthAnonymousId(report: AssessmentReport) {
  return report.userId || getStorage<string>(assessmentStorageKeys.dataBindingUserId, "") || "local-anonymous"
}

export default function PracticeChangePage() {
  const router = useRouter()
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [practice, setPractice] = useState<PracticeChangeState | null>(null)
  const [latestHeartProof, setLatestHeartProof] = useState<HeartProof | null>(null)
  const [heartProofCopied, setHeartProofCopied] = useState(false)
  const [sealDropped, setSealDropped] = useState(false)
  const [holdingSeal, setHoldingSeal] = useState(false)
  const sealHoldTimerRef = useRef<number | null>(null)
  const prescription = useMemo(() => getPracticePrescription(report), [report])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedReport = getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null)
      if (!savedReport) return

      const savedPractice = getStorage<PracticeChangeState | null>(assessmentStorageKeys.practiceChange, null)
      const nextPractice = savedPractice ?? createPracticeChange(savedReport)

      setReport(savedReport)
      setPractice(nextPractice)
      setStorage(assessmentStorageKeys.practiceChange, nextPractice)

      const savedHeartProof = loadLatestHeartProof()
      if (savedHeartProof?.sourceType === "daily_growth") setLatestHeartProof(savedHeartProof)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const recordToday = () => {
    if (!report || !practice || !canRecordPracticeToday(practice)) return

    const nextPractice = advancePracticeChange(practice, "completed")
    const nextGrowth = buildPracticeGrowthRecord(nextPractice)
    const heartProof = buildDailyGrowthHeartProof({
      heartProofId: buildHeartProofId(nextGrowth.growthRecordId),
      anonymousId: getDailyGrowthAnonymousId(report),
      sourceType: "daily_growth",
      sourceId: nextGrowth.growthRecordId,
      reportId: report.reportId,
      trainingDay: nextPractice.day,
      completedDays: nextPractice.day,
      checkinType: nextGrowth.record?.checkIn ?? "observe_only",
      thoughtType: getDailyGrowthThoughtType(report),
      thoughtLabel: getDailyGrowthThoughtLabel(report),
      behaviorType: report.sourceMirror?.id ?? report.primaryType.key,
      reflectionText: nextGrowth.record?.cultivationText || nextGrowth.record?.note || "已完成今日省察。",
      completedAt: nextGrowth.createdAt,
      baselineScores: getDailyGrowthBaselineScores(practice),
      userId: report.userId,
      createdAt: nextGrowth.createdAt,
    })

    saveHeartProof(heartProof)
    setPractice(nextPractice)
    setStorage(assessmentStorageKeys.practiceChange, nextPractice)
    setLatestHeartProof(heartProof)
    setHeartProofCopied(false)
    setSealDropped(true)
  }

  const copyHeartProof = async () => {
    if (!latestHeartProof || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(formatHeartProofForCopy(latestHeartProof))
      setHeartProofCopied(true)
      window.setTimeout(() => setHeartProofCopied(false), 1600)
    } catch {
      setHeartProofCopied(false)
    }
  }

  const clearSealHold = () => {
    if (sealHoldTimerRef.current) window.clearTimeout(sealHoldTimerRef.current)
    sealHoldTimerRef.current = null
    setHoldingSeal(false)
  }

  const startSealHold = () => {
    if (!practice || !canRecordPracticeToday(practice)) return

    clearSealHold()
    setHoldingSeal(true)
    sealHoldTimerRef.current = window.setTimeout(() => {
      recordToday()
      setHoldingSeal(false)
      sealHoldTimerRef.current = null
    }, 960)
  }

  useEffect(() => clearSealHold, [])

  const restartAssessment = () => {
    clearAssessmentProgress()
    router.push("/assessment-ritual")
  }

  if (!report || !practice) {
    return (
      <AssessmentShell>
        <div className="text-center">
          <StatusPill>暂无心证</StatusPill>
          <h1 className="mt-8 font-story text-4xl font-light leading-[1.35] tracking-[.1em]">
            先完成一次照见。
          </h1>
          <p className="mt-6 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
            有了心证，才能看见七日之后的变化。
          </p>
          <PrimaryLink href="/assessment-entry" className="mt-8 w-full">
            回到照心入口 →
          </PrimaryLink>
        </div>
      </AssessmentShell>
    )
  }

  const canRecordToday = canRecordPracticeToday(practice)
  const displayedPracticeIndex = !canRecordToday && practice.day > 0
    ? Math.min(practice.day - 1, prescription.length - 1)
    : Math.min(practice.day, prescription.length - 1)
  const nextPractice = prescription[displayedPracticeIndex]
  const zhixingMetric = practice.metrics.find((metric) => metric.key === "zhixing")
  const practiceCounts = getPracticeCounts(practice)
  const strongestChange = getStrongestChange(practice.metrics)
  const isSevenDaysComplete = practice.day >= 7
  const showSeal = sealDropped || (!canRecordToday && practice.day > 0)

  return (
    <AssessmentShell className="py-5">
      <div className="practice-change flex flex-col">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-[8px] border border-[rgba(216,183,111,.14)] bg-[rgba(216,183,111,.026)] text-[rgba(216,183,111,.76)] shadow-[0_18px_44px_rgba(0,0,0,.18)]">
              <YangmingC16Mark className="size-8" title="阳明照见训练小标" />
            </span>
            <div className="min-w-0">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[rgba(216,183,111,.66)]">
                YANGMING TRAINING
              </p>
              <p className="mt-1 truncate font-function text-xs tracking-[.08em] text-[rgba(220,212,195,.42)]">
                停十秒 · 先照心 · 再落行动
              </p>
            </div>
          </div>
          <YangmingGlyph kind="train" className="size-7 shrink-0 text-[rgba(216,183,111,.44)]" title="训练照变化" />
        </div>
        <StatusPill>今日修行</StatusPill>
        <h1 className="mt-8 font-story text-[clamp(2.25rem,10vw,3.45rem)] font-light leading-[1.3] tracking-[.1em]">
          今天只修
          <br />
          这一念。
        </h1>
        <p className="mt-6 font-story text-[1.1rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.62)]">
          不是急着变好，
          <br />
          是把照见落到一个动作里。
        </p>

        <GlassPanel className="mt-8">
          <div className="practice-character-heading" aria-label="止字停十秒训练状态">
            <YangmingCharacterMark
              character="止"
              label="止字，停十秒训练，先照心"
              roleText="停顿"
              size="sm"
              tier="method"
            />
            <div>
              <p>今日事上练</p>
              <span>停十秒 / 先照心 / 再落行动</span>
            </div>
          </div>
          <h2 className="mt-4 font-story text-2xl font-light leading-[1.45] tracking-[.08em]">
            {nextPractice ? `第 ${nextPractice.day} 日：${nextPractice.title}` : "七日已满，复看心证。"}
          </h2>
          <p className="mt-4 font-story text-[1.22rem] font-light leading-9 tracking-[.055em] text-[rgba(242,235,220,.76)]">
            {nextPractice?.note ?? "回到心证，看看自己是否更早看见第一念。"}
          </p>
          {nextPractice?.actions?.length ? (
            <div className="practice-action-steps mt-6">
              <p>修行动作</p>
              <ol>
                {nextPractice.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="mt-7">
            <button
              type="button"
              onPointerDown={startSealHold}
              onPointerUp={clearSealHold}
              onPointerCancel={clearSealHold}
              onPointerLeave={clearSealHold}
              disabled={!canRecordToday}
              className={`liangzhi-hold-button ${holdingSeal ? "is-holding" : ""}`}
            >
              <span>{practice.day >= 7 ? "七日已落印" : canRecordToday ? "按住水面 · 致良知" : "今日已落印"}</span>
              <i aria-hidden="true" />
            </button>
          </div>
          {showSeal ? (
            <div className="practice-seal-ritual" aria-live="polite">
              <p className="seal-stage-label">今日落印</p>
              <div className={cn("practice-paper-mirror", showSeal && "is-cleansed")}>
                <p className="liangzhi-clearing-copy">
                  知善知恶是良知。
                  <br />
                  为善去恶是格物。
                </p>
                <div className="practice-seal">
                  <span>今日已照见</span>
                  <span>事上磨一念</span>
                </div>
              </div>
              <p>今日不求胜行情，只求不被一念牵走。</p>
            </div>
          ) : null}
        </GlassPanel>

        {showSeal && latestHeartProof?.sourceType === "daily_growth" ? (
          <HeartProofCard
            heartProof={latestHeartProof}
            copied={heartProofCopied}
            onCopy={copyHeartProof}
            className="mt-4"
          />
        ) : null}

        <GlassPanel className="mt-8">
          <p className="flex items-center gap-2 font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">
            <YangmingGlyph kind="growth" className="size-4 text-[rgba(216,183,111,.68)]" />
            <span>知行合一分数</span>
          </p>
          <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4">
            <div>
              <p className="font-story text-[clamp(2.55rem,12vw,4rem)] font-light leading-none tracking-[.08em]">
                {zhixingMetric?.current ?? 0}
              </p>
              <p className="mt-3 font-function text-xs tracking-[.1em] text-[rgba(220,212,195,.42)]">
                七日前 {zhixingMetric?.before ?? 0}
              </p>
            </div>
            <span className="rounded-full border border-[rgba(172,146,83,.16)] px-3 py-1 font-function text-xs tracking-[.1em] text-[rgba(180,157,93,.78)]">
              第 {practice.day} / 7 日
            </span>
          </div>
        </GlassPanel>

        <GlassPanel className="mt-4">
          <p className="flex items-center gap-2 font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">
            <YangmingGlyph kind="review" className="size-4 text-[rgba(216,183,111,.68)]" />
            <span>行为变化</span>
          </p>
          <p className="mt-4 font-story text-[1.18rem] font-light leading-8 tracking-[.05em] text-[rgba(242,235,220,.72)]">
            {practice.day === 0
              ? "变化还没开始。先落下第一日省察。"
              : strongestChange
                ? `目前最明显的变化，是${strongestChange.label}${getChangeLabel(strongestChange)}。`
                : "变化正在形成。"}
          </p>
          <div className="mt-5 grid gap-4">
            {practice.metrics.map((metric) => (
              <div key={metric.key} className="grid gap-2">
                <div className="flex items-center justify-between gap-4 font-function text-sm text-[rgba(220,212,195,.68)]">
                  <span>{metric.label}</span>
                  <span className="text-[rgba(180,157,93,.78)]">{getChangeLabel(metric)}</span>
                </div>
                <div className="grid grid-cols-[42px_1fr_42px] items-center gap-3">
                  <span className="font-function text-xs text-[rgba(220,212,195,.34)]">{metric.before}</span>
                  <div className="relative h-2 overflow-hidden rounded-full bg-white/[.055]">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#8b7540,#b49d5d)]"
                      style={{ width: `${metric.current}%` }}
                    />
                  </div>
                  <span className="text-right font-function text-xs text-[rgba(242,235,220,.56)]">{metric.current}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="mt-4">
          <div className="practice-character-heading" aria-label="练字七日训练完成态">
            <YangmingCharacterMark
              character="练"
              label="练字，七日训练完成态，事上训练"
              roleText="训练"
              size="sm"
              tier="method"
            />
            <div>
              <p>变化心证</p>
              <span>七日训练完成态</span>
            </div>
          </div>
          <h2 className="mt-4 font-story text-2xl font-light leading-[1.55] tracking-[.08em]">
            {isSevenDaysComplete
              ? "七日已过，复看此心。"
              : "七日未满，先守今日。"}
          </h2>
          <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
            已省察 {practice.day} 日，其中 {practiceCounts.completed} 日完成、{practiceCounts.missed} 日未完成。
            {isSevenDaysComplete
              ? " 现在可以重新照心，看看七天前后的第一念是否已经不同。"
              : " 不急着证明改变，只要每天如实落下一次。"}
          </p>
          <div className="mt-6">
            <PrimaryButton type="button" onClick={restartAssessment} disabled={!isSevenDaysComplete} className="w-full">
              {isSevenDaysComplete ? "七日后复测心证 →" : "七日后开启复测"}
            </PrimaryButton>
          </div>
        </GlassPanel>

        {practice.records.length ? (
          <GlassPanel className="mt-4">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">修行轨迹</p>
            <div className="mt-5 grid gap-3">
              {practice.records.map((record) => (
                <div key={record.day} className="rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3">
                  <p className="font-story text-lg font-light tracking-[.06em]">
                    第 {record.day} 日 · {record.title}
                  </p>
                  <p className="mt-2 font-function text-xs tracking-[.1em] text-[rgba(180,157,93,.58)]">
                    {(record.status ?? "completed") === "completed" ? "已完成" : "未完成"}
                  </p>
                  <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.5)]">{record.note}</p>
                  {record.actions?.length ? (
                    <p className="mt-2 font-function text-xs leading-6 text-[rgba(220,212,195,.42)]">
                      {record.actions.join(" / ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </GlassPanel>
        ) : null}

        <ComplianceNote>
          本页仅用于记录交易行为训练变化，不预测行情，不提供买卖建议，不构成任何投资建议。
        </ComplianceNote>

        <div className="mt-6 grid gap-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <SecondaryLink href="/observing-archive" className="w-full">
            回到观心档案 →
          </SecondaryLink>
          <SecondaryButton type="button" onClick={() => window.history.back()} className="w-full">
            回看心证
          </SecondaryButton>
        </div>
      </div>
      <style jsx>{`
        .practice-change {
          animation: practice-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .practice-action-steps {
          border-top: 1px solid rgba(172, 146, 83, 0.12);
          padding-top: 1.1rem;
          text-align: left;
        }

        .practice-character-heading {
          display: flex;
          align-items: center;
          gap: 0.9rem;
        }

        .practice-character-heading p {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: #b49d5d;
        }

        .practice-character-heading span {
          display: block;
          margin-top: 0.28rem;
          font-family: var(--font-function);
          font-size: 0.68rem;
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.4);
        }

        .practice-action-steps p {
          margin: 0 0 0.85rem;
          font-family: var(--font-function);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.68);
        }

        .practice-action-steps ol {
          display: grid;
          margin: 0;
          gap: 0.78rem;
          padding-left: 1.35rem;
          font-family: var(--font-function);
          font-size: 0.92rem;
          line-height: 1.8;
          letter-spacing: 0.035em;
          color: rgba(220, 212, 195, 0.64);
        }

        .practice-action-steps li::marker {
          color: rgba(180, 157, 93, 0.72);
        }

        .liangzhi-hold-button {
          position: relative;
          display: grid;
          width: 100%;
          min-height: 58px;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(180, 157, 93, 0.3);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(216, 183, 111, 0.14), transparent 48%),
            radial-gradient(ellipse at 50% 70%, rgba(95, 132, 117, 0.18), transparent 62%),
            rgba(5, 7, 7, 0.36);
          color: rgba(242, 235, 220, 0.86);
          cursor: pointer;
          font-family: var(--font-function);
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 18px 48px rgba(0, 0, 0, 0.22);
          transition:
            border-color 260ms ease,
            color 260ms ease,
            transform 220ms ease,
            opacity 260ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .liangzhi-hold-button:disabled {
          cursor: default;
          opacity: 0.62;
        }

        .liangzhi-hold-button span {
          position: relative;
          z-index: 2;
        }

        .liangzhi-hold-button i {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 34px;
          height: 34px;
          border: 1px solid rgba(216, 183, 111, 0.36);
          border-radius: 50%;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.4);
        }

        .liangzhi-hold-button.is-holding {
          border-color: rgba(216, 183, 111, 0.56);
          color: rgba(242, 220, 168, 0.92);
          transform: scale(0.992);
        }

        .liangzhi-hold-button.is-holding i {
          animation: hold-water-ripple 960ms ease-out forwards;
        }

        .practice-seal-ritual {
          display: grid;
          justify-items: center;
          gap: 0.85rem;
          margin-top: 1.35rem;
          animation: seal-quiet 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .practice-seal-ritual p {
          margin: 0;
          max-width: 18em;
          font-family: var(--font-narrative);
          font-size: 0.96rem;
          font-weight: 300;
          line-height: 1.8;
          letter-spacing: 0.055em;
          color: rgba(220, 212, 195, 0.66);
        }

        .practice-seal-ritual .seal-stage-label {
          font-family: var(--font-function);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: rgba(180, 157, 93, 0.72);
        }

        .practice-paper-mirror {
          position: relative;
          display: grid;
          width: 168px;
          height: 128px;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(180, 157, 93, 0.16);
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 45%, rgba(242, 235, 220, 0.08), transparent 44%),
            repeating-radial-gradient(circle, rgba(216, 183, 111, 0.055) 0 1px, transparent 1px 13px),
            rgba(8, 8, 6, 0.38);
          box-shadow:
            0 22px 58px rgba(0, 0, 0, 0.28),
            inset 0 0 46px rgba(0, 0, 0, 0.42);
        }

        .practice-paper-mirror.is-cleansed {
          width: 190px;
          height: 164px;
          background:
            radial-gradient(circle at 50% 34%, rgba(242, 235, 220, 0.12), transparent 38%),
            radial-gradient(circle at 50% 74%, rgba(120, 60, 45, 0.09), transparent 48%),
            repeating-radial-gradient(circle, rgba(216, 183, 111, 0.055) 0 1px, transparent 1px 13px),
            rgba(8, 8, 6, 0.34);
          box-shadow:
            0 24px 62px rgba(0, 0, 0, 0.3),
            0 0 32px rgba(216, 183, 111, 0.055),
            inset 0 0 52px rgba(0, 0, 0, 0.38);
        }

        .practice-paper-mirror::before {
          content: "";
          position: absolute;
          inset: 16px;
          border: 1px dashed rgba(220, 212, 195, 0.08);
          border-radius: inherit;
        }

        .practice-paper-mirror.is-cleansed::after {
          content: "";
          position: absolute;
          inset: -24%;
          background:
            linear-gradient(110deg, transparent 18%, rgba(242, 235, 220, 0.08) 42%, transparent 62%),
            radial-gradient(circle at 50% 44%, rgba(216, 183, 111, 0.08), transparent 42%);
          filter: blur(3px);
          opacity: 0;
          transform: translateX(-24%) rotate(-8deg);
          animation: dust-wipe 1.2s cubic-bezier(0.22, 1, 0.36, 1) 120ms both;
          pointer-events: none;
        }

        .liangzhi-clearing-copy {
          position: absolute;
          left: 50%;
          top: 17px;
          z-index: 2;
          width: 14em;
          margin: 0;
          font-family: var(--font-world);
          font-size: 0.76rem;
          font-weight: 300;
          line-height: 1.65;
          letter-spacing: 0.1em;
          color: rgba(242, 220, 168, 0.68);
          text-align: center;
          transform: translateX(-50%);
          animation: liangzhi-copy-rise 780ms cubic-bezier(0.22, 1, 0.36, 1) 260ms both;
        }

        .practice-seal {
          position: relative;
          z-index: 2;
          display: grid;
          width: 112px;
          height: 112px;
          place-items: center;
          border: 2px solid rgba(166, 45, 31, 0.72);
          border-radius: 50%;
          color: rgba(226, 95, 70, 0.9);
          font-family: var(--font-world);
          font-size: 1.06rem;
          font-weight: 300;
          letter-spacing: 0.12em;
          line-height: 1.2;
          text-align: center;
          transform: rotate(-8deg);
          box-shadow:
            0 0 24px rgba(127, 37, 25, 0.14),
            inset 0 0 28px rgba(127, 37, 25, 0.09);
          animation: seal-drop 540ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .practice-paper-mirror.is-cleansed .practice-seal {
          width: 92px;
          height: 92px;
          margin-top: 42px;
          font-size: 0.9rem;
          animation-delay: 0.48s;
        }

        .practice-seal span {
          display: block;
        }

        @keyframes practice-in {
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

        @keyframes seal-drop {
          from {
            opacity: 0;
            filter: blur(6px);
            transform: translateY(-28px) scale(1.2) rotate(-8deg);
          }

          62% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(2px) scale(0.96) rotate(-8deg);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0) scale(1) rotate(-8deg);
          }
        }

        @keyframes hold-water-ripple {
          0% {
            opacity: 0.58;
            transform: translate(-50%, -50%) scale(0.36);
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(11);
          }
        }

        @keyframes seal-quiet {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        @keyframes dust-wipe {
          0% {
            opacity: 0;
            transform: translateX(-30%) rotate(-8deg);
          }

          38% {
            opacity: 0.78;
          }

          100% {
            opacity: 0;
            transform: translateX(34%) rotate(-8deg);
          }
        }

        @keyframes liangzhi-copy-rise {
          from {
            opacity: 0;
            filter: blur(6px);
            transform: translate(-50%, 10px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </AssessmentShell>
  )
}
