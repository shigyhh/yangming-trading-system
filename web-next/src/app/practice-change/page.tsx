"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"

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
  buildAssistantSummary,
  logAssistantSummaryInDevelopment,
} from "@/features/assessment/assistant-summary"
import {
  buildTrainingEvidence,
  type EvidenceEngineInput,
} from "@/features/assessment/evidence-engine"
import {
  advancePracticeChange,
  compareRiskRadarSnapshots,
  createPracticeChange,
  getPracticePrescription,
  type PracticeChangeState,
  type PracticeMetric,
} from "@/features/assessment/practice-change"
import { buildPreviewAssessmentReport } from "@/features/assessment/preview-report"
import type { AssessmentReport } from "@/features/assessment/report"
import {
  assessmentStorageKeys,
  clearAssessmentDraft,
  getStorage,
  setStorage,
} from "@/features/assessment/storage"
import {
  defaultBaselineScores,
  getBaselineScoresFromMetrics,
  getCheckinLabel,
  getThoughtLabel,
  getThoughtOption,
  checkinOptions,
  thoughtOptions,
  toKlineReactionKey,
  toPracticeCheckInStatus,
  type CheckinType,
  type DailyGrowthState,
  type ThoughtType,
} from "@/features/assessment/sprint10/trainingTypes"
import {
  getIsRetestUnlocked,
  getRemainingDays,
  useDailyTraining,
} from "@/features/assessment/sprint10/useDailyTraining"
import { saveAssistantSummaryPreview } from "@/features/assessment/sprint10/trainingStorage"
import { trackTrainingEvent } from "@/features/assessment/sprint10/trainingAnalytics"
import { syncTrainingRecordBinding } from "@/features/data-binding/api-client"
import { HeartProofCard } from "@/features/heart-proof/HeartProofCard"
import {
  buildDailyGrowthHeartProof,
  formatHeartProofForCopy,
} from "@/features/heart-proof/heartProofEngine"
import {
  loadLatestHeartProof,
  saveHeartProof,
} from "@/features/heart-proof/heartProofStorage"
import type { HeartProof } from "@/features/heart-proof/heartProofTypes"
import { ensureBehaviorLoopFromHeartProof } from "@/features/living-mirror-growth/behaviorLoopStorage"
import { recomputeAndSaveGrowthProfile } from "@/features/living-mirror-growth/growthProfileStorage"
import type { GrowthProfile } from "@/features/living-mirror-growth/growthProfileTypes"
import { cn } from "@/lib/utils"

const livingMirrorGrowthStorageKey = assessmentStorageKeys.livingMirrorGrowth
const holdDurationMs = 2000

function completedRecordCount(records: PracticeChangeState["records"]) {
  return records.filter((record) => (record.status ?? "completed") === "completed").length
}

function klineRecordCount(records: PracticeChangeState["records"]) {
  return records.filter((record) => record.klineRecord).length
}

function reflectionRecordCount(records: PracticeChangeState["records"]) {
  return records.filter((record) => Boolean(record.cultivationText?.trim())).length
}

function getMetricDelta(metric: PracticeMetric) {
  return metric.direction === "down" ? metric.before - metric.current : metric.current - metric.before
}

function getDailyGrowthProgressStep(state: DailyGrowthState): 0 | 1 | 2 | 3 {
  if (state.isCompleted) return 3
  if (state.checkinType && state.thoughtType) return 2
  if (state.checkinType) return 1
  return 0
}

function canCompleteDailyGrowth(state: DailyGrowthState): boolean {
  return Boolean(
    state.checkinType &&
      state.thoughtType &&
      state.reflectionText.trim().length >= 2 &&
      !state.isCompleted,
  )
}

function getChangeLabel(metric: PracticeMetric) {
  const delta = getMetricDelta(metric)
  if (delta <= 0) return "待复测"
  return metric.direction === "down" ? `下降 ${delta}%` : `提升 ${delta}%`
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function getReportId(report: AssessmentReport) {
  return report.reportId || `report_${report.createdAt || "local"}`
}

function getAnonymousId() {
  const existing = getStorage<string>(assessmentStorageKeys.dataBindingUserId, "")
  if (existing) return existing

  const next = makeId("anon")
  setStorage(assessmentStorageKeys.dataBindingUserId, next)
  return next
}

function createDailyGrowthState(report: AssessmentReport, practice: PracticeChangeState): DailyGrowthState {
  const completedDays = completedRecordCount(practice.records)

  return {
    growthRecordId: makeId("growth_record"),
    reportId: getReportId(report),
    anonymousId: getAnonymousId(),
    trainingDay: Math.min(completedDays + 1, 7),
    checkinType: null,
    thoughtType: null,
    reflectionText: "",
    holdProgress: 0,
    isCompleted: false,
    completedAt: null,
    completedDays,
    klineMindCount: klineRecordCount(practice.records),
    reflectionCount: reflectionRecordCount(practice.records),
  }
}

function reconcileDailyGrowthState(
  saved: DailyGrowthState | null,
  report: AssessmentReport,
  practice: PracticeChangeState,
): DailyGrowthState {
  const reportId = getReportId(report)
  if (saved?.reportId === reportId) return saved
  return createDailyGrowthState(report, practice)
}

function createHeartProofFromCompletedGrowth(
  growth: DailyGrowthState,
  practice: PracticeChangeState,
) {
  if (!growth.isCompleted || !growth.completedAt || !growth.thoughtType || growth.reflectionText.trim().length < 2) {
    return null
  }

  const thought = getThoughtOption(growth.thoughtType)

  return buildDailyGrowthHeartProof({
    heartProofId: makeId("heart_proof"),
    anonymousId: growth.anonymousId,
    sourceType: "daily_growth",
    sourceId: growth.growthRecordId,
    reportId: growth.reportId,
    trainingDay: growth.trainingDay,
    completedDays: growth.completedDays,
    checkinType: growth.checkinType || "",
    thoughtType: growth.thoughtType,
    thoughtLabel: thought?.label || getThoughtLabel(growth.thoughtType),
    behaviorType: "kline_mind_training",
    reflectionText: growth.reflectionText,
    completedAt: growth.completedAt,
    createdAt: growth.completedAt,
    baselineScores: getBaselineScoresFromMetrics(practice.metrics) || defaultBaselineScores,
    userId: growth.userId || "",
  })
}

export default function Sprint10TrainingPage() {
  const router = useRouter()
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [practice, setPractice] = useState<PracticeChangeState | null>(null)
  const [growth, setGrowth] = useState<DailyGrowthState | null>(null)
  const [heartProof, setHeartProof] = useState<HeartProof | null>(null)
  const [growthProfile, setGrowthProfile] = useState<GrowthProfile | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const previewMode = new URLSearchParams(window.location.search).get("preview") === "1"
      const savedReport = getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null)
      const nextReport = savedReport || (previewMode ? buildPreviewAssessmentReport() : null)

      if (!nextReport) return

      const savedPractice = getStorage<PracticeChangeState | null>(assessmentStorageKeys.practiceChange, null)
      const nextPractice = savedPractice ?? createPracticeChange(nextReport)
      const savedGrowth = getStorage<DailyGrowthState | null>(livingMirrorGrowthStorageKey, null)
      const nextGrowth = reconcileDailyGrowthState(savedGrowth, nextReport, nextPractice)
      const latestHeartProof = loadLatestHeartProof()
      const matchedHeartProof = latestHeartProof?.sourceType === "daily_growth" && latestHeartProof.sourceId === nextGrowth.growthRecordId
        ? latestHeartProof
        : null
      const restoredHeartProof = matchedHeartProof || createHeartProofFromCompletedGrowth(nextGrowth, nextPractice)

      setReport(nextReport)
      setPractice(nextPractice)
      setGrowth(nextGrowth)
      if (restoredHeartProof) {
        setHeartProof(restoredHeartProof)
        if (!matchedHeartProof) saveHeartProof(restoredHeartProof)
      }
      setStorage(assessmentStorageKeys.practiceChange, nextPractice)
      setStorage(livingMirrorGrowthStorageKey, nextGrowth)
      const comparison = compareRiskRadarSnapshots(nextPractice.baselineReport, nextPractice.retestReport)
      if (comparison.length) {
        setGrowthProfile(recomputeAndSaveGrowthProfile({
          retestComparisons: comparison,
          now: nextPractice.retestReport?.createdAt,
        }).growthProfile)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const prescription = useMemo(() => getPracticePrescription(report), [report])
  const activePrescription = prescription[Math.min(Math.max((growth?.trainingDay ?? 1) - 1, 0), prescription.length - 1)]
  const baselineScores = useMemo(() => getBaselineScoresFromMetrics(practice?.metrics) || defaultBaselineScores, [practice?.metrics])
  const training = useDailyTraining({
    trainingDay: growth?.trainingDay ?? 1,
    completedDays: growth?.completedDays ?? 0,
    klineMindCount: growth?.klineMindCount ?? 0,
    reflectionCount: growth?.reflectionCount ?? 0,
    isCompleted: growth?.isCompleted ?? false,
    completedAt: growth?.completedAt ?? null,
    baselineScores,
  })
  const draftState = training.state
  const activeState: DailyGrowthState | null = growth
    ? {
        ...growth,
        checkinType: growth.isCompleted ? growth.checkinType : draftState.checkinType,
        thoughtType: growth.isCompleted ? growth.thoughtType : draftState.thoughtType,
        reflectionText: growth.isCompleted ? growth.reflectionText : draftState.reflectionText,
        holdProgress: draftState.holdProgress,
      }
    : null
  const progressStep = activeState ? getDailyGrowthProgressStep(activeState) : 0
  const selectedThought = getThoughtOption(activeState?.thoughtType)
  const evidenceInput: EvidenceEngineInput | null = activeState
    ? {
        trainingDay: activeState.trainingDay,
        completedDays: activeState.completedDays,
        checkinType: activeState.checkinType || "",
        thoughtType: activeState.thoughtType || "",
        thoughtLabel: getThoughtLabel(activeState.thoughtType),
        reflectionText: activeState.reflectionText,
        completedAt: activeState.completedAt || "",
        baselineScores,
        userId: activeState.userId || "",
      }
    : null
  const evidence = evidenceInput ? buildTrainingEvidence(evidenceInput) : null
  const remainingDays = getRemainingDays(activeState?.completedDays ?? 0)
  const isRetestUnlocked = getIsRetestUnlocked(activeState?.completedDays ?? 0)
  const canComplete = activeState ? canCompleteDailyGrowth(activeState) : false
  const trailItems = activeState ? buildPracticeTrail(activeState) : []
  const activeHeartProof = activeState?.isCompleted && heartProof?.sourceId === activeState.growthRecordId
    ? heartProof
    : null
  const retestComparison = practice ? compareRiskRadarSnapshots(practice.baselineReport, practice.retestReport) : []

  function persistGrowth(nextGrowth: DailyGrowthState) {
    setGrowth(nextGrowth)
    setStorage(livingMirrorGrowthStorageKey, nextGrowth)
  }

  function patchGrowth(patch: Partial<DailyGrowthState>) {
    if (!growth) return
    const nextGrowth = {
      ...growth,
      ...patch,
      holdProgress: patch.holdProgress ?? 0,
    }
    persistGrowth(nextGrowth)
  }

  function handleCheckin(nextCheckinType: CheckinType) {
    if (!growth || growth.isCompleted) return
    training.setCheckinType(nextCheckinType)
    patchGrowth({ checkinType: nextCheckinType })
    trackTrainingEvent("training_checkin_selected", {
      trainingDay: growth.trainingDay,
      checkinType: nextCheckinType,
      thoughtType: growth.thoughtType,
      completedDays: growth.completedDays,
    })
  }

  function handleThought(nextThoughtType: ThoughtType) {
    if (!growth || growth.isCompleted || !draftState.checkinType) return
    training.setThoughtType(nextThoughtType)
    patchGrowth({ thoughtType: nextThoughtType })
    trackTrainingEvent("training_thought_selected", {
      trainingDay: growth.trainingDay,
      checkinType: draftState.checkinType,
      thoughtType: nextThoughtType,
      completedDays: growth.completedDays,
    })
  }

  function handleReflection(nextReflectionText: string) {
    if (!growth || growth.isCompleted || !draftState.checkinType || !draftState.thoughtType) return
    training.setReflectionText(nextReflectionText)
    patchGrowth({ reflectionText: nextReflectionText })
    trackTrainingEvent("training_reflection_changed", {
      trainingDay: growth.trainingDay,
      checkinType: draftState.checkinType,
      thoughtType: draftState.thoughtType,
      completedDays: growth.completedDays,
    })
  }

  function handleHoldProgress(nextProgress: number) {
    training.setHoldProgress(nextProgress)
  }

  const completeToday = useCallback(() => {
    if (!report || !practice || !growth) return

    const checkinType = draftState.checkinType || growth.checkinType
    const thoughtType = draftState.thoughtType || growth.thoughtType
    const reflectionText = (draftState.reflectionText || growth.reflectionText).trim()
    if (!checkinType || !thoughtType || reflectionText.length < 2 || growth.isCompleted) return

    const thought = getThoughtOption(thoughtType)
    const completedAt = new Date().toISOString()
    const nextPractice = advancePracticeChange(practice, "completed", {
      checkIn: toPracticeCheckInStatus(checkinType),
      cultivationText: reflectionText,
      klineRecord: {
        sceneKey: "rapid_rise_without_plan",
        reactionKey: toKlineReactionKey(thoughtType),
        scene: "价格快速拉升，你原本没有计划进场。此刻最容易出现哪一念？",
        reaction: thought?.label || getThoughtLabel(thoughtType),
        disciplineAction: thought?.action || "先停十秒，再回到原计划。",
        feedback: thought?.feedback,
        reactionTimeMs: holdDurationMs,
        processScores: {
          planExecution: 42,
          boundaryKeeping: 42,
          impulseDelay: 58,
          emotionalStability: 46,
          reviewCompletion: 100,
        },
        processInsight: "过程质量，不按盈亏评分。",
        trainingSuggestion: thought?.action || "下一次念头出现时，先停一息，记录，再复盘。",
      },
    })
    const completedDays = completedRecordCount(nextPractice.records)
    const nextGrowth: DailyGrowthState = {
      ...growth,
      checkinType,
      thoughtType,
      reflectionText,
      isCompleted: true,
      completedAt,
      completedDays,
      klineMindCount: klineRecordCount(nextPractice.records),
      reflectionCount: reflectionRecordCount(nextPractice.records),
      holdProgress: 1,
    }
    const assistantSummary = buildAssistantSummary({
      trainingDay: nextGrowth.trainingDay,
      completedDays: nextGrowth.completedDays,
      checkinType,
      thoughtType,
      thoughtLabel: thought?.label || getThoughtLabel(thoughtType),
      reflectionText,
      completedAt,
      baselineScores,
      userId: nextGrowth.userId || "",
    })
    const heartProof = buildDailyGrowthHeartProof({
      heartProofId: makeId("heart_proof"),
      anonymousId: nextGrowth.anonymousId,
      sourceType: "daily_growth",
      sourceId: nextGrowth.growthRecordId,
      reportId: nextGrowth.reportId,
      trainingDay: nextGrowth.trainingDay,
      completedDays: nextGrowth.completedDays,
      checkinType,
      thoughtType,
      thoughtLabel: thought?.label || getThoughtLabel(thoughtType),
      behaviorType: "kline_mind_training",
      reflectionText,
      completedAt,
      createdAt: completedAt,
      baselineScores,
      userId: nextGrowth.userId || "",
    })
    const latestRecord = nextPractice.records[nextPractice.records.length - 1]

    setPractice(nextPractice)
    persistGrowth(nextGrowth)
    setStorage(assessmentStorageKeys.practiceChange, nextPractice)
    saveHeartProof(heartProof)
    ensureBehaviorLoopFromHeartProof(heartProof)
    recomputeAndSaveGrowthProfile({ dailyGrowth: nextGrowth, now: completedAt })
    setHeartProof(heartProof)
    saveAssistantSummaryPreview(assistantSummary)
    logAssistantSummaryInDevelopment(assistantSummary)
    training.resetDraft()
    trackTrainingEvent("training_day_completed", {
      trainingDay: nextGrowth.trainingDay,
      checkinType,
      thoughtType,
      completedDays,
    })

    if (latestRecord) {
      void syncTrainingRecordBinding({ practiceState: nextPractice, record: latestRecord })
    }
  }, [baselineScores, draftState.checkinType, draftState.reflectionText, draftState.thoughtType, growth, practice, report, training])

  const restartAssessment = () => {
    clearAssessmentDraft()
    router.push("/assessment-ritual")
  }

  const copyTodayProof = async () => {
    if (!activeHeartProof) return
    await navigator.clipboard.writeText(formatHeartProofForCopy(activeHeartProof))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1300)
  }

  if (!report || !practice || !activeState) {
    return (
      <AssessmentShell>
        <div className="text-center">
          <StatusPill>暂无心证</StatusPill>
          <h1 className="mt-8 font-story text-4xl font-light leading-[1.35] tracking-[.1em]">
            先完成一次照见。
          </h1>
          <p className="mt-6 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
            有了心镜报告，才能开始今日修行。
          </p>
          <PrimaryLink href="/assessment-entry" className="mt-8 w-full">
            回到照心入口 →
          </PrimaryLink>
        </div>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-7" contentWidth="wide">
      <div className="sprint10-page mx-auto w-full max-w-[1440px]">
        <TrainingHero progressStep={progressStep} completed={activeState.isCompleted} />

        <section className="sprint10-layout mt-7">
          <main className="sprint10-main">
            <DailyPrescriptionCard prescription={activePrescription} />
            <DailyTrainingPanel
              state={activeState}
              canComplete={canComplete}
              progressStep={progressStep}
              selectedThought={selectedThought}
              onCheckin={handleCheckin}
              onThought={handleThought}
              onReflection={handleReflection}
              onHoldProgress={handleHoldProgress}
              onComplete={completeToday}
            />
            <CompletionSealCard state={activeState} evidenceText={evidence?.dailySealText || ""} remainingDays={remainingDays} />
            <RetestChangeProofCard growthProfile={growthProfile} />
            <PracticeTrail items={trailItems} />
          </main>

          <EvidenceSidebar
            state={activeState}
            practice={practice}
            baselineScores={baselineScores}
            remainingDays={remainingDays}
            isRetestUnlocked={isRetestUnlocked}
            affectedDimensions={evidence?.affectedDimensions || []}
            retestComparisonCount={retestComparison.length}
            onRetestLocked={() => {
              trackTrainingEvent("retest_locked_clicked", {
                trainingDay: activeState.trainingDay,
                checkinType: activeState.checkinType,
                thoughtType: activeState.thoughtType,
                completedDays: activeState.completedDays,
              })
            }}
            onRetest={restartAssessment}
          />
        </section>

        <TodayProofCard
          heartProof={activeHeartProof}
          copied={copied}
          onCopy={copyTodayProof}
        />

        <ComplianceNotice />

        <div className="mt-6 grid gap-3 pb-[max(16px,env(safe-area-inset-bottom))] md:grid-cols-2">
          <SecondaryLink href="/observing-archive" className="w-full">
            回到观心档案 →
          </SecondaryLink>
          <SecondaryButton type="button" onClick={() => window.history.back()} className="w-full">
            回看心证
          </SecondaryButton>
        </div>
      </div>

      <style jsx>{`
        .sprint10-page {
          animation: sprint10-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .sprint10-layout {
          display: grid;
          gap: 1rem;
          align-items: start;
        }

        .sprint10-main {
          display: grid;
          gap: 1rem;
          min-width: 0;
        }

        @media (min-width: 1024px) {
          .sprint10-layout {
            grid-template-columns: minmax(0, 1fr) minmax(330px, 0.34fr);
          }
        }

        @keyframes sprint10-in {
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

function TrainingHero({ progressStep, completed }: { progressStep: 0 | 1 | 2 | 3; completed: boolean }) {
  return (
    <section className="training-hero">
      <div>
        <StatusPill>{completed ? "今日修行已完成" : "今日修行"}</StatusPill>
        <h1 className="mt-8 font-story text-[clamp(3.1rem,8vw,7.1rem)] font-light leading-[1.08] tracking-[.08em]">
          今天只修
          <br />
          这一念。
        </h1>
        <p className="mt-6 max-w-[42rem] font-story text-[1.18rem] font-light leading-9 tracking-[.045em] text-[rgba(220,212,195,.62)]">
          不是急着变好，是把照见落到一个动作里。
        </p>
      </div>

      <GlassPanel className="daily-progress-card">
        <div className="flex items-center justify-between gap-4">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">今日修行 {progressStep}/3</p>
          <span className="font-function text-xs tracking-[.12em] text-[rgba(242,235,220,.58)]">{completed ? "已落印" : "签到 → 观念 → 落印"}</span>
        </div>
        <DailyProgressSteps progressStep={progressStep} />
      </GlassPanel>

      <style jsx>{`
        .training-hero {
          display: grid;
          gap: 1rem;
          align-items: end;
        }

        @media (min-width: 960px) {
          .training-hero {
            grid-template-columns: minmax(0, 1fr) minmax(360px, 0.34fr);
            min-height: min(42vh, 500px);
          }
        }
      `}</style>
    </section>
  )
}

function DailyProgressSteps({ progressStep }: { progressStep: 0 | 1 | 2 | 3 }) {
  const steps = ["签到", "观念", "落印"]

  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      {steps.map((step, index) => {
        const active = progressStep >= index + 1
        return (
          <div key={step} className={cn("progress-step", active && "is-active")}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        )
      })}

      <style jsx>{`
        .progress-step {
          display: grid;
          gap: 0.52rem;
          justify-items: center;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          padding: 0.9rem 0.5rem;
          color: rgba(220, 212, 195, 0.42);
          transition: border-color 220ms ease, background 220ms ease, color 220ms ease;
        }

        .progress-step span {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.16);
          border-radius: 999px;
          font-family: var(--font-function);
          font-size: 0.72rem;
        }

        .progress-step strong {
          font-family: var(--font-function);
          font-size: 0.76rem;
          letter-spacing: 0.14em;
        }

        .progress-step.is-active {
          border-color: rgba(216, 183, 111, 0.36);
          background: radial-gradient(circle at 50% 0%, rgba(216, 183, 111, 0.12), transparent 72%), rgba(180, 157, 93, 0.05);
          color: rgba(242, 220, 168, 0.82);
          box-shadow: 0 0 30px rgba(216, 183, 111, 0.04);
        }
      `}</style>
    </div>
  )
}

function DailyPrescriptionCard({ prescription }: { prescription?: { day: number; title: string; note: string; actions?: string[] } }) {
  return (
    <GlassPanel>
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">今日处方</p>
      <h2 className="mt-4 font-story text-3xl font-light leading-[1.38] tracking-[.08em]">
        {prescription ? `第 ${prescription.day} 日：${prescription.title}` : "第 1 日：追涨前停十秒"}
      </h2>
      <p className="mt-4 font-story text-xl font-light leading-9 tracking-[.05em] text-[rgba(242,235,220,.72)]">
        {prescription?.note || "今日只练一件事：没有系统信号，不主动找机会。"}
      </p>
      {prescription?.actions?.length ? (
        <div className="mt-5 grid gap-3 border-t border-[rgba(172,146,83,.12)] pt-5 md:grid-cols-3">
          {prescription.actions.map((action) => (
            <p key={action} className="rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
              {action}
            </p>
          ))}
        </div>
      ) : null}
    </GlassPanel>
  )
}

function DailyTrainingPanel({
  state,
  canComplete,
  progressStep,
  selectedThought,
  onCheckin,
  onThought,
  onReflection,
  onHoldProgress,
  onComplete,
}: {
  state: DailyGrowthState
  canComplete: boolean
  progressStep: 0 | 1 | 2 | 3
  selectedThought: ReturnType<typeof getThoughtOption>
  onCheckin: (value: CheckinType) => void
  onThought: (value: ThoughtType) => void
  onReflection: (value: string) => void
  onHoldProgress: (value: number) => void
  onComplete: () => void
}) {
  return (
    <GlassPanel className="daily-training-panel">
      <div className="panel-heading">
        <p>签到 → 观念 → 落印</p>
        <span>今日修行 {progressStep}/3</span>
      </div>

      <div className="training-steps-grid mt-5">
        <CheckinSelector state={state} onSelect={onCheckin} />
        <ThoughtSelector state={state} onSelect={onThought} />
      </div>

      <ThoughtFeedbackCard thought={selectedThought} />
      <ReflectionInput state={state} onChange={onReflection} />
      <HoldToCompleteButton
        disabled={!canComplete}
        completed={state.isCompleted}
        durationMs={holdDurationMs}
        onProgress={onHoldProgress}
        onComplete={onComplete}
      />

      <style jsx>{`
        .panel-heading {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
          justify-content: space-between;
          font-family: var(--font-function);
        }

        .panel-heading p,
        .panel-heading span {
          margin: 0;
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: rgba(180, 157, 93, 0.78);
        }

        .panel-heading span {
          color: rgba(242, 235, 220, 0.48);
        }

        .training-steps-grid {
          display: grid;
          gap: 1rem;
        }

        @media (min-width: 760px) {
          .training-steps-grid {
            grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          }
        }
      `}</style>
      <style jsx global>{`
        .training-block {
          min-width: 0;
          border: 1px solid rgba(172, 146, 83, 0.11);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          padding: 1rem;
          transition: opacity 220ms ease, border-color 220ms ease, background 220ms ease;
        }

        .training-block.is-dimmed {
          opacity: 0.52;
        }

        .training-block:not(.is-dimmed) {
          border-color: rgba(180, 157, 93, 0.18);
          background:
            radial-gradient(circle at 0% 0%, rgba(216, 183, 111, 0.05), transparent 12rem),
            rgba(255, 255, 255, 0.024);
        }

        .block-label {
          margin: 0;
          font-family: var(--font-function);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.78);
        }
      `}</style>
    </GlassPanel>
  )
}

function CheckinSelector({ state, onSelect }: { state: DailyGrowthState; onSelect: (value: CheckinType) => void }) {
  return (
    <section className="training-block">
      <p className="block-label">第一步 · 今日签到</p>
      <div className="mt-4 grid gap-3">
        {checkinOptions.map((option) => (
          <TrainingOptionButton
            key={option.type}
            active={state.checkinType === option.type}
            disabled={state.isCompleted}
            title={option.label}
            description={option.description}
            onClick={() => onSelect(option.type)}
          />
        ))}
      </div>
    </section>
  )
}

function ThoughtSelector({ state, onSelect }: { state: DailyGrowthState; onSelect: (value: ThoughtType) => void }) {
  const enabled = Boolean(state.checkinType) && !state.isCompleted

  return (
    <section className={cn("training-block", !enabled && "is-dimmed")}>
      <p className="block-label">第二步 · K 线心念训练记录</p>
      <p className="mt-4 font-story text-xl font-light leading-9 tracking-[.05em] text-[rgba(242,235,220,.72)]">
        价格快速拉升，你原本没有计划进场。此刻最容易出现哪一念？
      </p>
      <div className="mt-4 grid gap-3">
        {thoughtOptions.map((option) => (
          <TrainingOptionButton
            key={option.type}
            active={state.thoughtType === option.type}
            disabled={!enabled}
            title={option.label}
            description={option.action}
            onClick={() => onSelect(option.type)}
          />
        ))}
      </div>
    </section>
  )
}

function TrainingOptionButton({
  active,
  disabled,
  title,
  description,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button type="button" disabled={disabled} className={cn("training-option", active && "is-active")} onClick={onClick}>
      <strong>{title}</strong>
      <span>{description}</span>
      <style jsx>{`
        .training-option {
          display: grid;
          gap: 0.4rem;
          width: 100%;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          padding: 1rem;
          text-align: left;
          transition: border-color 220ms ease, background 220ms ease, opacity 220ms ease, transform 220ms ease;
        }

        .training-option:disabled {
          cursor: default;
          opacity: 0.42;
        }

        .training-option:not(:disabled):hover,
        .training-option.is-active {
          border-color: rgba(216, 183, 111, 0.42);
          background:
            radial-gradient(circle at 0% 0%, rgba(216, 183, 111, 0.12), transparent 12rem),
            rgba(180, 157, 93, 0.04);
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(216, 183, 111, 0.035);
        }

        .training-option strong {
          font-family: var(--font-story);
          font-size: 1.18rem;
          font-weight: 300;
          letter-spacing: 0.06em;
          color: rgba(242, 235, 220, 0.84);
        }

        .training-option span {
          font-family: var(--font-function);
          font-size: 0.86rem;
          line-height: 1.7;
          color: rgba(220, 212, 195, 0.52);
        }
      `}</style>
    </button>
  )
}

function ThoughtFeedbackCard({ thought }: { thought: ReturnType<typeof getThoughtOption> }) {
  if (!thought) return null

  return (
    <div className="mt-5 rounded-[8px] border border-[rgba(95,132,117,.2)] bg-[rgba(95,132,117,.055)] px-5 py-4">
      <p className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.76)]">你今天照见的是</p>
      <p className="mt-3 font-story text-2xl font-light leading-9 tracking-[.06em] text-[rgba(242,235,220,.82)]">
        {thought.feedback}
      </p>
    </div>
  )
}

function ReflectionInput({ state, onChange }: { state: DailyGrowthState; onChange: (value: string) => void }) {
  const enabled = Boolean(state.checkinType && state.thoughtType) && !state.isCompleted

  return (
    <section className={cn("mt-5 training-block", !enabled && "is-dimmed")}>
      <p className="block-label">第三步 · 每日一省</p>
      <textarea
        value={state.reflectionText}
        disabled={!enabled}
        placeholder="今天哪一念最容易带走你？写一句即可。"
        className="mt-4 min-h-[132px] w-full resize-y rounded-[8px] border border-[rgba(172,146,83,.14)] bg-white/[.035] px-4 py-3 font-function text-sm leading-7 text-[rgba(242,235,220,.78)] outline-none transition focus:border-[rgba(216,183,111,.42)] disabled:opacity-40"
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  )
}

function HoldToCompleteButton({
  disabled = false,
  completed = false,
  durationMs = 2000,
  onProgress,
  onComplete,
}: {
  disabled?: boolean
  completed?: boolean
  durationMs?: number
  onProgress?: (progress: number) => void
  onComplete: () => void
}) {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const completedRef = useRef(false)
  const startedRef = useRef(false)

  const stop = useCallback((cancelled = true) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startRef.current = null
    startedRef.current = false

    if (!completedRef.current && cancelled) {
      setProgress(0)
      onProgress?.(0)
    }
  }, [onProgress])

  const start = useCallback(() => {
    if (disabled || completed || completedRef.current || startedRef.current) return
    startedRef.current = true
    startRef.current = null

    function run(now: number) {
      if (!startRef.current) startRef.current = now

      const elapsed = now - startRef.current
      const nextProgress = Math.min(1, elapsed / durationMs)
      setProgress(nextProgress)
      onProgress?.(nextProgress)

      if (nextProgress >= 1) {
        completedRef.current = true
        stop(false)
        onComplete()
        return
      }

      rafRef.current = requestAnimationFrame(run)
    }

    rafRef.current = requestAnimationFrame(run)
  }, [completed, disabled, durationMs, onComplete, onProgress, stop])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    if (!completed) completedRef.current = false
  }, [completed])

  const label = completed
    ? "今日已落印"
    : disabled
      ? "写下一句后落印"
      : progress > 0
        ? `照见中 ${Math.round(progress * 100)}%`
        : "按住水面 · 致良知"

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== " " && event.key !== "Enter") return
    event.preventDefault()
    start()
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== " " && event.key !== "Enter") return
    event.preventDefault()
    stop()
  }

  return (
    <button
      type="button"
      className="hold-water-button mt-6"
      disabled={disabled || completed}
      data-progress={progress}
      onMouseDown={start}
      onMouseUp={() => stop()}
      onMouseLeave={() => stop()}
      onTouchStart={start}
      onTouchEnd={() => stop()}
      onTouchCancel={() => stop()}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <span className="hold-water-fill" style={{ transform: `scaleX(${progress})` }} />
      <span className="hold-water-label">{label}</span>
      <style jsx>{`
        .hold-water-button {
          position: relative;
          display: grid;
          width: 100%;
          min-height: 64px;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(180, 157, 93, 0.32);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(216, 183, 111, 0.14), transparent 48%),
            radial-gradient(ellipse at 50% 76%, rgba(95, 132, 117, 0.2), transparent 64%),
            rgba(5, 7, 7, 0.42);
          color: rgba(242, 235, 220, 0.88);
          cursor: pointer;
          font-family: var(--font-function);
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 18px 48px rgba(0, 0, 0, 0.22);
          transition: border-color 260ms ease, color 260ms ease, transform 220ms ease, opacity 260ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .hold-water-button:disabled {
          cursor: default;
          opacity: 0.58;
        }

        .hold-water-fill {
          position: absolute;
          inset: 0;
          transform-origin: left center;
          background:
            linear-gradient(90deg, rgba(95, 132, 117, 0.24), rgba(216, 183, 111, 0.28)),
            repeating-radial-gradient(circle at 50% 50%, rgba(242, 235, 220, 0.06) 0 1px, transparent 1px 16px);
          transition: transform 60ms linear;
        }

        .hold-water-label {
          position: relative;
          z-index: 1;
        }

        .hold-water-button:not(:disabled):active {
          border-color: rgba(216, 183, 111, 0.58);
          transform: scale(0.992);
        }
      `}</style>
    </button>
  )
}

function CompletionSealCard({ state, evidenceText, remainingDays }: { state: DailyGrowthState; evidenceText: string; remainingDays: number }) {
  if (!state.isCompleted) return null

  return (
    <GlassPanel className="completion-seal-card">
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">今日修行已完成</p>
      <h2 className="mt-4 font-story text-3xl font-light leading-[1.45] tracking-[.08em]">
        你今天照见的是：{getThoughtLabel(state.thoughtType)}
      </h2>
      <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
        已落下第 {state.completedDays} 次训练证据。距离复测还差 {remainingDays} 日。
      </p>
      <p className="mt-5 rounded-[8px] border border-[rgba(180,157,93,.14)] bg-white/[.025] px-4 py-3 font-story text-xl font-light leading-9 tracking-[.04em] text-[rgba(242,235,220,.74)]">
        {evidenceText || "真正的变化，不是今天就不冲动了，而是你已经能在冲动前看见它。"}
      </p>
    </GlassPanel>
  )
}

function RetestChangeProofCard({ growthProfile }: { growthProfile: GrowthProfile | null }) {
  const retestSummary = growthProfile?.retestSummary
  if (!retestSummary?.retestCount) return null

  const changeRows = [
    ...retestSummary.improvedDimensions,
    ...retestSummary.declinedDimensions,
    ...retestSummary.stableDimensions,
  ].slice(0, 6)

  return (
    <GlassPanel className="retest-change-proof-card">
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">复测变化证明</p>
      <h2 className="mt-4 font-story text-4xl font-light leading-[1.35] tracking-[.08em] text-[rgba(244,235,221,.9)]">
        七日复照完成
      </h2>
      <p className="mt-5 font-story text-2xl font-light leading-[1.75] tracking-[.05em] text-[rgba(242,235,220,.78)]">
        你还不是完全不冲动了，
        <br />
        但你已经开始在冲动前看见它。
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <RetestEvidenceBlock label="训练证据摘要" value={retestSummary.trainingEvidenceSummary} />
        <RetestEvidenceBlock label="高频一念变化" value={retestSummary.highFrequencyThoughtChange} />
        <RetestEvidenceBlock label="重复行为是否减弱" value={retestSummary.repeatedBehaviorChange} />
      </div>

      {changeRows.length ? (
        <div className="mt-6">
          <p className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.76)]">本轮变化</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {changeRows.map((item) => (
              <div key={item.key} className="rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3">
                <div className="flex items-center justify-between gap-3 font-function text-sm text-[rgba(220,212,195,.62)]">
                  <span className="line-clamp-1">{item.label}</span>
                  <span className={cn("shrink-0", item.direction === "improved" ? "text-[rgba(132,178,150,.88)]" : item.direction === "declined" ? "text-[rgba(216,183,111,.9)]" : "text-[rgba(220,212,195,.5)]")}>
                    {formatRetestDelta(item.delta)}
                  </span>
                </div>
                <p className="mt-3 font-story text-2xl font-light tracking-[.06em] text-[rgba(244,235,221,.84)]">
                  {item.before} → {item.after}
                </p>
                <p className="mt-2 font-function text-xs leading-6 text-[rgba(220,212,195,.44)]">
                  首测 {item.before} / 复测 {item.after} / 变化差值 {formatRetestDelta(item.delta)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-[8px] border border-[rgba(95,132,117,.2)] bg-[rgba(95,132,117,.055)] px-5 py-4">
        <p className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.76)]">下一轮照见重点</p>
        <h3 className="mt-3 font-story text-2xl font-light leading-[1.45] tracking-[.06em] text-[rgba(244,235,221,.88)]">
          {retestSummary.nextCycleFocus.title.replace("下一轮重点：", "")}
        </h3>
        <p className="mt-3 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
          {retestSummary.nextCycleFocus.reason}
        </p>
        <p className="mt-3 font-function text-sm leading-7 text-[rgba(242,235,220,.76)]">
          {retestSummary.nextCycleFocus.nextActionText}
        </p>
      </div>
    </GlassPanel>
  )
}

function RetestEvidenceBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[240px] rounded-[8px] border border-[rgba(172,146,83,.11)] bg-white/[.025] px-4 py-3">
      <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(180,157,93,.7)]">{label}</p>
      <p className="mt-3 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.6)]">{value}</p>
    </div>
  )
}

function formatRetestDelta(delta: number) {
  if (delta === 0) return "持平"
  return delta > 0 ? `+${delta}` : `${delta}`
}

function EvidenceSidebar({
  state,
  practice,
  baselineScores,
  remainingDays,
  isRetestUnlocked,
  affectedDimensions,
  retestComparisonCount,
  onRetestLocked,
  onRetest,
}: {
  state: DailyGrowthState
  practice: PracticeChangeState
  baselineScores: typeof defaultBaselineScores
  remainingDays: number
  isRetestUnlocked: boolean
  affectedDimensions: string[]
  retestComparisonCount: number
  onRetestLocked: () => void
  onRetest: () => void
}) {
  return (
    <aside className="evidence-sidebar">
      <EvidenceSummaryCard state={state} />
      <LivingMirrorLifeCard state={state} />
      <KnowingDoingScoreCard score={baselineScores.knowingDoing} />
      <BehaviorBaselineCard baselineScores={baselineScores} affectedDimensions={affectedDimensions} metrics={practice.metrics} />
      <RetestGateCard
        completedDays={state.completedDays}
        remainingDays={remainingDays}
        isRetestUnlocked={isRetestUnlocked}
        retestComparisonCount={retestComparisonCount}
        onLocked={onRetestLocked}
        onRetest={onRetest}
      />
      <style jsx>{`
        .evidence-sidebar {
          display: grid;
          gap: 1rem;
        }

        @media (min-width: 1024px) {
          .evidence-sidebar {
            position: sticky;
            top: 1rem;
          }
        }
      `}</style>
    </aside>
  )
}

function EvidenceSummaryCard({ state }: { state: DailyGrowthState }) {
  return (
    <GlassPanel>
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">变化证据</p>
      <div className="mt-5 grid gap-3">
        <EvidenceRow label="训练进度" value={`${state.completedDays} / 7 日`} />
        <EvidenceRow label="K 线心念" value={`${state.klineMindCount} 次`} />
        <EvidenceRow label="每日一省" value={`${state.reflectionCount} 条`} />
        <EvidenceRow label="复测状态" value={state.completedDays >= 7 ? "可复测" : "训练中"} />
      </div>
    </GlassPanel>
  )
}

function LivingMirrorLifeCard({ state }: { state: DailyGrowthState }) {
  const growthRatio = Math.min(state.completedDays / 7, 1)

  return (
    <GlassPanel>
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">心镜生命体</p>
      <div className="mirror-tree mt-5" aria-label="心镜之树">
        <span className="tree-glow" />
        <span className="tree-trunk" style={{ height: `${48 + growthRatio * 46}px` }} />
        <span className="tree-crown" style={{ transform: `translate(-50%, -50%) scale(${0.72 + growthRatio * 0.34})` }} />
      </div>
      <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
        训练一天，心镜之树长一点。复盘一次，枝叶再多一点。365 天后，用户看到的是自己的树。
      </p>
      <style jsx>{`
        .mirror-tree {
          position: relative;
          height: 160px;
          overflow: hidden;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background:
            radial-gradient(circle at 50% 12%, rgba(216, 183, 111, 0.12), transparent 5rem),
            radial-gradient(circle at 50% 80%, rgba(95, 132, 117, 0.16), transparent 7rem),
            rgba(255, 255, 255, 0.02);
        }

        .tree-glow,
        .tree-trunk,
        .tree-crown {
          position: absolute;
          left: 50%;
          bottom: 24px;
          display: block;
        }

        .tree-glow {
          width: 130px;
          height: 130px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(216, 183, 111, 0.12), transparent 66%);
          filter: blur(2px);
          transform: translate(-50%, 10%);
        }

        .tree-trunk {
          width: 3px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(216, 183, 111, 0.72), rgba(95, 132, 117, 0.44));
          transform: translateX(-50%);
          transition: height 420ms ease;
        }

        .tree-crown {
          bottom: 84px;
          width: 84px;
          height: 84px;
          border: 1px solid rgba(216, 183, 111, 0.24);
          border-radius: 44% 56% 50% 50%;
          background:
            radial-gradient(circle at 42% 36%, rgba(242, 235, 220, 0.12), transparent 26%),
            radial-gradient(circle at 50% 50%, rgba(95, 132, 117, 0.36), transparent 72%);
          transform-origin: 50% 78%;
          box-shadow: 0 0 42px rgba(95, 132, 117, 0.12);
          transition: transform 420ms ease;
        }
      `}</style>
    </GlassPanel>
  )
}

function KnowingDoingScoreCard({ score }: { score: number }) {
  return (
    <GlassPanel>
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">知行合一分数</p>
      <p className="mt-5 font-story text-[4.2rem] font-light leading-none tracking-[.08em] text-[rgba(242,235,220,.88)]">42</p>
      <p className="mt-3 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
        当前为首测基线：{score}
        <br />
        七日后生成变化分。
      </p>
    </GlassPanel>
  )
}

function BehaviorBaselineCard({
  baselineScores,
  affectedDimensions,
  metrics,
}: {
  baselineScores: typeof defaultBaselineScores
  affectedDimensions: string[]
  metrics: PracticeMetric[]
}) {
  const spectrum = [
    { label: "追涨之镜", value: baselineScores.chaseImpulse },
    { label: "焦虑之镜", value: baselineScores.emptyPositionAnxiety },
    { label: "从众之镜", value: Math.max(41, Math.round((baselineScores.planChange + baselineScores.chaseImpulse) / 2)) },
    { label: "良知之镜", value: baselineScores.knowingDoing },
  ]

  return (
    <GlassPanel>
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">镜谱</p>
      <div className="mt-5 grid gap-4">
        {spectrum.map((item) => (
          <div key={item.label} className="grid gap-2">
            <div className="flex items-center justify-between font-function text-sm text-[rgba(220,212,195,.64)]">
              <span>{item.label}</span>
              <span className="text-[rgba(180,157,93,.82)]">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[.055]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#5f8475,#d8b76f)]" style={{ width: `${item.value}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 font-function text-xs leading-6 text-[rgba(220,212,195,.46)]">
        行为变化：{metrics.map((metric) => `${metric.label}：首测 ${metric.before}，${getChangeLabel(metric)}`).join(" / ")}
      </p>
      {affectedDimensions.length ? (
        <p className="mt-4 rounded-[8px] border border-[rgba(180,157,93,.12)] bg-white/[.025] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
          今日影响维度：{affectedDimensions.join("、")}。七日后复测将重点观察这些维度。
        </p>
      ) : null}
    </GlassPanel>
  )
}

function RetestGateCard({
  completedDays,
  remainingDays,
  isRetestUnlocked,
  retestComparisonCount,
  onLocked,
  onRetest,
}: {
  completedDays: number
  remainingDays: number
  isRetestUnlocked: boolean
  retestComparisonCount: number
  onLocked: () => void
  onRetest: () => void
}) {
  return (
    <GlassPanel>
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">复测风险雷达</p>
      <h2 className="mt-4 font-story text-2xl font-light leading-[1.45] tracking-[.08em]">
        {isRetestUnlocked ? "七日已满，可以复测。" : "七日未满，先守今日。"}
      </h2>
      <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
        {isRetestUnlocked
          ? `系统将对比首测与复测，生成风险雷达差异。当前已有 ${retestComparisonCount} 条变化节点。`
          : `已省察 ${completedDays} 日，其中 ${completedDays} 日完成，${remainingDays} 日未完成。不急着证明改变，只要每天如实落下一次。`}
      </p>
      <PrimaryButton
        type="button"
        disabled={!isRetestUnlocked}
        className="mt-6 w-full"
        onClick={isRetestUnlocked ? onRetest : onLocked}
      >
        {isRetestUnlocked ? "开始复测" : "完成 7 日训练后解锁复测"}
      </PrimaryButton>
    </GlassPanel>
  )
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3">
      <span className="font-function text-xs tracking-[.1em] text-[rgba(220,212,195,.42)]">{label}</span>
      <span className="text-right font-function text-sm text-[rgba(242,235,220,.72)]">{value}</span>
    </div>
  )
}

function PracticeTrail({ items }: { items: Array<{ id: string; time: string; label: string; value: string }> }) {
  return (
    <GlassPanel>
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">修行轨迹</p>
      {items.length ? (
        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3 md:grid-cols-[78px_128px_minmax(0,1fr)] md:items-center">
              <span className="font-function text-xs tracking-[.1em] text-[rgba(180,157,93,.72)]">{item.time}</span>
              <strong className="font-story text-lg font-light tracking-[.06em] text-[rgba(242,235,220,.78)]">{item.label}</strong>
              <span className="font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">{item.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3 font-function text-sm leading-7 text-[rgba(220,212,195,.52)]">
          今日落印后，这里会留下签到、K 线心念和每日一省。
        </p>
      )}
    </GlassPanel>
  )
}

function TodayProofCard({
  heartProof,
  copied,
  onCopy,
}: {
  heartProof: HeartProof | null
  copied: boolean
  onCopy: () => void
}) {
  if (!heartProof) return null

  return (
    <section aria-label="今日心证" data-copy-label="复制心证文字">
      <HeartProofCard
        heartProof={heartProof}
        copied={copied}
        className="mt-4"
        onCopy={onCopy}
      />
    </section>
  )
}

function ComplianceNotice() {
  return (
    <ComplianceNote>
      本页仅用于记录交易行为训练变化，不预测行情，不提供买卖建议，不构成任何投资建议。
    </ComplianceNote>
  )
}

function buildPracticeTrail(state: DailyGrowthState) {
  if (!state.isCompleted || !state.completedAt) return []
  const time = formatTime(state.completedAt)

  return [
    { id: `${state.growthRecordId}-checkin`, time, label: "签到", value: getCheckinLabel(state.checkinType) },
    { id: `${state.growthRecordId}-thought`, time, label: "K 线心念", value: getThoughtLabel(state.thoughtType) },
    { id: `${state.growthRecordId}-reflection`, time, label: "每日一省", value: state.reflectionText },
    { id: `${state.growthRecordId}-seal`, time, label: "今日落印", value: `已完成 Day ${state.trainingDay}` },
  ]
}

function formatTime(value?: string | null) {
  if (!value) return "--:--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--:--"
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}
