"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
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
  advancePracticeChange,
  canRecordPracticeToday,
  compareRiskRadarSnapshots,
  createPracticeChange,
  getPracticePrescription,
  type KLineProcessScores,
  reconcilePracticeChangeWithReport,
  type PracticeChangeState,
} from "@/features/assessment/practice-change"
import {
  buildAssistantSummaryPreview,
  buildTodayProofText,
  buildTrainingEvidence,
} from "@/features/assessment/evidence-engine"
import { buildPreviewAssessmentReport } from "@/features/assessment/preview-report"
import type { AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, clearAssessmentDraft, getStorage } from "@/features/assessment/storage"
import { trackTrainingEvent } from "@/features/assessment/sprint10/trainingAnalytics"
import {
  checkinOptions,
  getBaselineScoresFromMetrics,
  getCheckinLabel,
  getThoughtLabel,
  getThoughtOption,
  thoughtOptions,
  toKlineReactionKey,
  toPracticeCheckInStatus,
  type CheckinType,
  type ThoughtType,
} from "@/features/assessment/sprint10/trainingTypes"
import {
  loadLegacyPracticeState,
  loadTrainingPracticeState,
  saveAssistantSummaryPreview,
  saveLegacyPracticeState,
  saveTrainingPracticeState,
} from "@/features/assessment/sprint10/trainingStorage"
import { useDailyTraining } from "@/features/assessment/sprint10/useDailyTraining"
import { syncTrainingRecordBinding } from "@/features/data-binding/api-client"

const processScoreItems: Array<{ key: keyof KLineProcessScores; label: string }> = [
  { key: "planExecution", label: "计划执行度" },
  { key: "boundaryKeeping", label: "守界度" },
  { key: "impulseDelay", label: "冲动延迟度" },
  { key: "emotionalStability", label: "情绪稳定度" },
  { key: "reviewCompletion", label: "复盘完成度" },
]

const mindKlineBars = [
  { height: 28, offset: 38, tone: "green" },
  { height: 34, offset: 32, tone: "gold" },
  { height: 42, offset: 26, tone: "green" },
  { height: 48, offset: 22, tone: "gold" },
  { height: 62, offset: 10, tone: "gold" },
  { height: 58, offset: 14, tone: "green" },
  { height: 72, offset: 4, tone: "gold" },
  { height: 66, offset: 8, tone: "gold" },
  { height: 54, offset: 18, tone: "green" },
]

const behaviorBaselineItems = [
  { key: "emptyPositionAnxiety", label: "空仓焦虑", value: 40 },
  { key: "chaseImpulse", label: "追涨冲动", value: 80 },
  { key: "stopLossExecution", label: "止损执行", value: 100 },
  { key: "planChange", label: "临盘改计划", value: 0 },
  { key: "knowingDoing", label: "知行合一", value: 42 },
]

const klinePressureProfiles: Record<
  ThoughtType,
  {
    trigger: string
    relatedPersonality: string
    scores: KLineProcessScores
    insight: string
    suggestion: string
  }
> = {
  fomo: {
    trigger: "怕错过",
    relatedPersonality: "入场冲动型 / 焦虑控制型",
    scores: {
      planExecution: 58,
      boundaryKeeping: 54,
      impulseDelay: 42,
      emotionalStability: 56,
      reviewCompletion: 78,
    },
    insight: "你并不是看不见计划，而是行情加速时，容易把速度当成必须行动。",
    suggestion: "建议进入 Day 1：观入场冲动。",
  },
  chase: {
    trigger: "用动作压住焦虑",
    relatedPersonality: "入场冲动型 / 计划断裂型",
    scores: {
      planExecution: 46,
      boundaryKeeping: 48,
      impulseDelay: 35,
      emotionalStability: 50,
      reviewCompletion: 74,
    },
    insight: "第一念来得很快时，手会比心证先到场，需要先把按钮前的一息练出来。",
    suggestion: "建议进入 Day 1：停十秒。",
  },
  wait_pullback: {
    trigger: "想等确认",
    relatedPersonality: "完美等待型 / 焦虑控制型",
    scores: {
      planExecution: 72,
      boundaryKeeping: 70,
      impulseDelay: 66,
      emotionalStability: 64,
      reviewCompletion: 82,
    },
    insight: "你已经能延迟动作，但仍要分清等待是条件，还是被波动牵住后的犹豫。",
    suggestion: "建议进入 Day 3：守空仓。",
  },
  ask_others: {
    trigger: "把判断交给外声",
    relatedPersonality: "从众型 / 焦虑控制型",
    scores: {
      planExecution: 55,
      boundaryKeeping: 60,
      impulseDelay: 62,
      emotionalStability: 52,
      reviewCompletion: 80,
    },
    insight: "外部声音出现前，先留下自己的判断，才知道被带走的是信息还是念头。",
    suggestion: "建议进入 Day 2：记一念。",
  },
  abandon_plan: {
    trigger: "临时改计划",
    relatedPersonality: "计划断裂型 / 复盘逃避型",
    scores: {
      planExecution: 42,
      boundaryKeeping: 50,
      impulseDelay: 52,
      emotionalStability: 48,
      reviewCompletion: 72,
    },
    insight: "计划可以复盘后修订，但不要在情绪峰值处把规则改成借口。",
    suggestion: "建议进入 Day 6：省察一念。",
  },
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function formatReactionSeconds(reactionTimeMs: number | null) {
  if (reactionTimeMs === null) return "待记录"
  return `${(reactionTimeMs / 1000).toFixed(1)} 秒`
}

function buildKLinePressureReview(thoughtType: ThoughtType, reactionTimeMs: number | null) {
  const profile = klinePressureProfiles[thoughtType] ?? klinePressureProfiles.fomo
  const quickReaction = reactionTimeMs !== null && reactionTimeMs <= 3000
  const calmReaction = reactionTimeMs !== null && reactionTimeMs >= 6500

  return {
    ...profile,
    reactionTimeLabel: formatReactionSeconds(reactionTimeMs),
    scores: {
      ...profile.scores,
      impulseDelay: clampPercent(profile.scores.impulseDelay + (quickReaction ? -8 : calmReaction ? 6 : 0)),
      emotionalStability: clampPercent(profile.scores.emotionalStability + (quickReaction ? -4 : calmReaction ? 3 : 0)),
    },
  }
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10)
}

function formatTrailTime(value?: string) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return "--:--"
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export default function Sprint10TrainingPage() {
  const router = useRouter()
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [practice, setPractice] = useState<PracticeChangeState | null>(null)
  const [sealDropped, setSealDropped] = useState(false)
  const [klineReactionTimeMs, setKlineReactionTimeMs] = useState<number | null>(null)
  const [recordMessage, setRecordMessage] = useState("")
  const [copyMessage, setCopyMessage] = useState("")
  const [isPreview, setIsPreview] = useState(false)
  const klineReactionStartedAtRef = useRef(0)
  const prescription = useMemo(() => getPracticePrescription(report), [report])
  const loadedTodayRecord = practice?.records.find((record) => record.dateKey === todayDateKey())
  const loadedIsTodayCompleted = Boolean(loadedTodayRecord) && practice ? !canRecordPracticeToday(practice) : false
  const loadedKlineRecordCount = practice?.records.filter((record) => record.klineRecord).length ?? 0
  const loadedReflectionCount = practice?.records.filter((record) => Boolean(record.cultivationText?.trim())).length ?? 0
  const dailyTraining = useDailyTraining({
    trainingDay: Math.min((practice?.day ?? 0) + 1, 7),
    completedDays: practice?.day ?? 0,
    klineMindCount: loadedKlineRecordCount,
    reflectionCount: loadedReflectionCount,
    isCompleted: Boolean(loadedIsTodayCompleted || (practice?.day ?? 0) >= 7),
    completedAt: loadedTodayRecord?.recordedAt ?? null,
    baselineScores: getBaselineScoresFromMetrics(practice?.metrics),
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const previewMode = new URLSearchParams(window.location.search).get("preview") === "1"
      const savedReport = previewMode
        ? buildPreviewAssessmentReport()
        : getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null)
      if (!savedReport) return
      setIsPreview(previewMode)

      const savedPractice = loadTrainingPracticeState() ?? loadLegacyPracticeState()
      const nextPractice = savedPractice
        ? reconcilePracticeChangeWithReport(savedPractice, savedReport)
        : createPracticeChange(savedReport)

      setReport(savedReport)
      setPractice(nextPractice)
      klineReactionStartedAtRef.current = new Date().getTime()
      saveTrainingPracticeState(nextPractice)
      if (!previewMode) saveLegacyPracticeState(nextPractice)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const selectCheckIn = (value: CheckinType) => {
    if (!practice || !canRecordPracticeToday(practice)) return
    dailyTraining.setCheckinType(value)
    setRecordMessage("")
    trackTrainingEvent("training_checkin_selected", {
      trainingDay: practice.day + 1,
      checkinType: value,
      thoughtType: dailyTraining.state.thoughtType,
      completedDays: practice.day,
    })
  }

  const selectKlineMind = (thoughtType: ThoughtType) => {
    if (!practice || !canRecordPracticeToday(practice)) return
    if (!dailyTraining.state.checkinType) {
      setRecordMessage("先完成今日签到，再照见一念。")
      return
    }
    dailyTraining.setThoughtType(thoughtType)
    setKlineReactionTimeMs(new Date().getTime() - klineReactionStartedAtRef.current)
    setRecordMessage("")
    trackTrainingEvent("training_thought_selected", {
      trainingDay: practice.day + 1,
      checkinType: dailyTraining.state.checkinType,
      thoughtType,
      completedDays: practice.day,
    })
  }

  const updateCultivationText = (value: string) => {
    dailyTraining.setReflectionText(value)
    if (!practice || !value.trim()) return
    trackTrainingEvent("training_reflection_changed", {
      trainingDay: practice.day + 1,
      checkinType: dailyTraining.state.checkinType,
      thoughtType: dailyTraining.state.thoughtType,
      completedDays: practice.day,
    })
  }

  const recordToday = () => {
    if (!practice || !canRecordPracticeToday(practice)) return
    const cleanCultivationText = dailyTraining.state.reflectionText.trim().slice(0, 120)
    const selectedKlineMind = getThoughtOption(dailyTraining.state.thoughtType)

    if (!dailyTraining.state.checkinType) {
      setRecordMessage("先完成今日签到，再落印。")
      return
    }

    if (!selectedKlineMind) {
      setRecordMessage("先选出 K 线场景里最容易带走你的一念。")
      return
    }

    if (!cleanCultivationText) {
      setRecordMessage("写一句每日一省，再落印。")
      return
    }

    const klinePressureReview = buildKLinePressureReview(selectedKlineMind.type, klineReactionTimeMs)
    const reactionKey = toKlineReactionKey(selectedKlineMind.type)
    const nextPractice = advancePracticeChange(practice, "completed", {
      checkIn: toPracticeCheckInStatus(dailyTraining.state.checkinType),
      cultivationText: cleanCultivationText,
      klineRecord: {
        sceneKey: "fast_rise_no_plan",
        reactionKey,
        scene: "价格快速拉升，原本没有计划进场。",
        reaction: selectedKlineMind.reaction,
        disciplineAction: selectedKlineMind.action,
        feedback: selectedKlineMind.feedback,
        reactionTimeMs: klineReactionTimeMs ?? undefined,
        processScores: klinePressureReview.scores,
        processInsight: klinePressureReview.insight,
        trainingSuggestion: klinePressureReview.suggestion,
      },
    })
    setPractice(nextPractice)
    saveTrainingPracticeState(nextPractice)
    if (!isPreview) saveLegacyPracticeState(nextPractice)
    const syncedRecord = nextPractice.records.find((record) => record.day === nextPractice.day)
    if (syncedRecord && !isPreview) {
      void syncTrainingRecordBinding({ practiceState: nextPractice, record: syncedRecord })
    }
    if (syncedRecord?.klineRecord) {
      const assistantSummary = buildAssistantSummaryPreview({
        trainingDay: syncedRecord.day,
        completedDays: nextPractice.day,
        checkinType: syncedRecord.checkIn,
        thoughtType: syncedRecord.klineRecord.reactionKey,
        thoughtLabel: selectedKlineMind.label,
        reflectionText: syncedRecord.cultivationText,
        completedAt: syncedRecord.recordedAt,
      })
      saveAssistantSummaryPreview(assistantSummary)
      if (process.env.NODE_ENV === "development") {
        console.log("[assistant-summary-preview]", assistantSummary)
      }
    }
    setSealDropped(true)
    setRecordMessage(isPreview ? "预览训练已记录，不写入数据链。" : "今日训练已记录。")
    trackTrainingEvent("training_day_completed", {
      trainingDay: nextPractice.day,
      checkinType: dailyTraining.state.checkinType,
      thoughtType: selectedKlineMind.type,
      completedDays: nextPractice.day,
    })
    dailyTraining.resetDraft()
    setKlineReactionTimeMs(null)
    klineReactionStartedAtRef.current = new Date().getTime()
  }

  const restartAssessment = () => {
    clearAssessmentDraft()
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
  const completedDays = dailyTraining.state.completedDays
  const isRetestUnlocked = dailyTraining.isRetestUnlocked
  const isSevenDaysComplete = isRetestUnlocked
  const todayRecord = loadedTodayRecord
  const latestRecord = practice.records[practice.records.length - 1]
  const isTodayCompleted = loadedIsTodayCompleted
  const showSeal = sealDropped || isTodayCompleted
  const radarComparison = compareRiskRadarSnapshots(practice.baselineReport, practice.retestReport)
  const hasRetestComparison = isSevenDaysComplete && radarComparison.length > 0
  const selectedKlineMind = getThoughtOption(dailyTraining.state.thoughtType)
  const klinePressureReview = selectedKlineMind ? buildKLinePressureReview(selectedKlineMind.type, klineReactionTimeMs) : null
  const klineRecordCount = dailyTraining.state.klineMindCount
  const reflectionCount = dailyTraining.state.reflectionCount
  const progressStep = dailyTraining.progressStep
  const canSelectThought = canRecordToday && dailyTraining.canSelectThought
  const canWriteReflection = canRecordToday && dailyTraining.canWriteReflection
  const canHoldToComplete = canRecordToday && dailyTraining.canHoldToComplete
  const remainingDays = dailyTraining.remainingDays
  const retestLockedDays = Math.max(0, 7 - completedDays)
  const completedThoughtLabel = selectedKlineMind?.label || getThoughtLabel(todayRecord?.klineRecord?.reactionKey || latestRecord?.klineRecord?.reactionKey)
  const evidenceRecord = todayRecord || latestRecord
  const todayEvidence = evidenceRecord?.klineRecord
    ? buildTrainingEvidence({
      trainingDay: evidenceRecord.day,
      completedDays: practice.day,
      checkinType: evidenceRecord.checkIn,
      thoughtType: evidenceRecord.klineRecord.reactionKey,
      thoughtLabel: getThoughtLabel(evidenceRecord.klineRecord.reactionKey),
      reflectionText: evidenceRecord.cultivationText,
      completedAt: evidenceRecord.recordedAt,
    })
    : null
  const evidenceSummary = completedDays === 0
    ? "今天是在留下证据，完成第一日训练后，七天后的复测才有对照。"
    : `已落下 ${completedDays} 次训练证据。今天记录的是行为、念头和复盘，七日后再生成变化对比。`

  const copyTodayProof = async () => {
    if (!evidenceRecord?.klineRecord) return

    const text = buildTodayProofText({
      trainingDay: evidenceRecord.day,
      completedDays: practice.day,
      checkinType: evidenceRecord.checkIn,
      thoughtType: evidenceRecord.klineRecord.reactionKey,
      thoughtLabel: getThoughtLabel(evidenceRecord.klineRecord.reactionKey),
      reflectionText: evidenceRecord.cultivationText,
      completedAt: evidenceRecord.recordedAt,
    })

    try {
      await navigator.clipboard.writeText(text)
      setCopyMessage("今日心证文字已复制。")
    } catch {
      setCopyMessage("当前浏览器暂不支持自动复制，可手动选取心证文字。")
    }
  }

  return (
    <AssessmentShell className="py-4 md:py-6" contentWidth="wide">
      <div className="practice-change mx-auto w-full max-w-[1460px]">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="min-w-0">
            <TrainingHero isPreview={isPreview} progressStep={progressStep} />

            <GlassPanel className="mt-4 practice-workbench">
              <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
                <DailyPrescriptionCard nextPractice={nextPractice} />

                <div className="grid gap-3">
                  <CheckinSelector
                    value={dailyTraining.state.checkinType}
                    disabled={!canRecordToday}
                    onSelect={selectCheckIn}
                  />

                  <ThoughtSelector
                    value={dailyTraining.state.thoughtType}
                    disabled={!canSelectThought}
                    onSelect={selectKlineMind}
                  >
                    {klinePressureReview ? (
                      <ThoughtFeedbackCard
                        review={klinePressureReview}
                        selectedLabel={selectedKlineMind?.label ?? "今日一念"}
                        feedback={selectedKlineMind?.feedback ?? ""}
                      />
                    ) : null}
                  </ThoughtSelector>

                  <div
                    className="training-step grid gap-3 rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] p-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-end"
                    data-locked={!canWriteReflection}
                  >
                    <ReflectionInput
                      value={dailyTraining.state.reflectionText}
                      disabled={!canWriteReflection}
                      onChange={updateCultivationText}
                    />
                    <div className="grid gap-2">
                      <HoldToCompleteButton
                        disabled={!canHoldToComplete}
                        completed={isTodayCompleted || practice.day >= 7}
                        progress={dailyTraining.state.holdProgress}
                        onProgressChange={dailyTraining.setHoldProgress}
                        onHoldStart={() => {
                          if (!practice) return
                          trackTrainingEvent("training_hold_started", {
                            trainingDay: practice.day + 1,
                            checkinType: dailyTraining.state.checkinType,
                            thoughtType: dailyTraining.state.thoughtType,
                            completedDays: practice.day,
                          })
                        }}
                        onHoldCancel={() => {
                          if (!practice) return
                          trackTrainingEvent("training_hold_cancelled", {
                            trainingDay: practice.day + 1,
                            checkinType: dailyTraining.state.checkinType,
                            thoughtType: dailyTraining.state.thoughtType,
                            completedDays: practice.day,
                          })
                        }}
                        onComplete={recordToday}
                      />
                      {recordMessage ? (
                        <p className="font-function text-xs leading-6 tracking-[.06em] text-[rgba(216,183,111,.76)]">
                          {recordMessage}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {showSeal ? (
                    <CompletionSealCard
                      selectedThoughtLabel={completedThoughtLabel}
                      completedDays={practice.day}
                      remainingDays={remainingDays}
                    />
                  ) : null}
                </div>
              </div>
            </GlassPanel>

            <div className="practice-left-follow mt-5 grid gap-5">
              {todayEvidence && evidenceRecord?.klineRecord ? (
                <GlassPanel className="today-proof-card">
                  <div>
                    <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">今日心证</p>
                    <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
                      今天你不是完成了一次打卡，而是留下了一条训练证据。
                    </h2>
                  </div>
                  <div className="today-proof-grid mt-5">
                    <EvidencePill label="今日一念" value={getThoughtLabel(evidenceRecord.klineRecord.reactionKey)} />
                    <EvidencePill label="今日动作" value={todayEvidence.nextActionText} />
                    <EvidencePill label="今日省察" value={evidenceRecord.cultivationText || "已完成今日省察。"} />
                  </div>
                  <p className="mt-5 font-story text-[1.05rem] font-light leading-8 tracking-[.05em] text-[rgba(242,235,220,.72)]">
                    {todayEvidence.dailySealText}
                  </p>
                  <p className="mt-4 font-function text-xs leading-6 tracking-[.08em] text-[rgba(220,212,195,.42)]">
                    仅用于交易行为训练记录，不构成任何投资建议。
                  </p>
                  <div className="mt-5 grid gap-2 md:max-w-[260px]">
                    <SecondaryButton type="button" onClick={copyTodayProof} className="w-full">
                      复制心证文字
                    </SecondaryButton>
                    {copyMessage ? (
                      <p className="font-function text-xs leading-6 tracking-[.06em] text-[rgba(216,183,111,.76)]">
                        {copyMessage}
                      </p>
                    ) : null}
                  </div>
                </GlassPanel>
              ) : null}

              <section className="grid gap-5 lg:grid-cols-[.92fr_1.08fr] lg:items-start">
                <GlassPanel className="practice-side-panel">
                  <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">复测风险雷达</p>
                  <h2 className="mt-4 font-story text-2xl font-light leading-[1.55] tracking-[.08em]">
                    {hasRetestComparison ? "前后变化已照见。" : "完成复测后，看见前后差异。"}
                  </h2>
                  <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
                    {hasRetestComparison
                      ? `初测为${practice.baselineReport?.primaryType ?? "未记录"}，复测为${practice.retestReport?.primaryType ?? "未记录"}。这里比较的是心理触发强度，不代表收益或行情判断。`
                      : "七日训练完成后重新测评，系统会保存初测与复测的风险雷达，用于复盘自己的反应模式。"}
                  </p>
                  {hasRetestComparison ? (
                    <div className="mt-5 grid gap-4">
                      {radarComparison.map((item) => {
                        const deltaText = item.delta === 0 ? "持平" : item.delta > 0 ? `上升 ${item.delta}%` : `下降 ${Math.abs(item.delta)}%`

                        return (
                          <div key={item.key} className="grid gap-2">
                            <div className="flex items-center justify-between gap-4 font-function text-sm text-[rgba(220,212,195,.68)]">
                              <span>{item.label}</span>
                              <span className={item.delta <= 0 ? "text-[rgba(95,132,117,.9)]" : "text-[rgba(216,183,111,.78)]"}>
                                {deltaText}
                              </span>
                            </div>
                            <div className="grid grid-cols-[42px_1fr_42px] items-center gap-3">
                              <span className="font-function text-xs text-[rgba(220,212,195,.34)]">{item.before}</span>
                              <div className="relative h-2 overflow-hidden rounded-full bg-white/[.055]">
                                <div
                                  className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#5F8475,#D8B76F)]"
                                  style={{ width: `${item.after}%` }}
                                />
                              </div>
                              <span className="text-right font-function text-xs text-[rgba(242,235,220,.56)]">{item.after}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </GlassPanel>

                <GlassPanel className="practice-side-panel">
                  <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">修行轨迹</p>
                  <div className="mt-5 grid gap-3">
                    {isTodayCompleted && todayRecord ? (
                      <PracticeTrail record={todayRecord} />
                    ) : (
                      <p className="rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-4 font-function text-sm leading-7 text-[rgba(220,212,195,.52)]">
                        今日落印后，这里会留下签到、K 线心念和每日一省。
                      </p>
                    )}
                  </div>
                </GlassPanel>
              </section>
            </div>
          </div>

          <aside className="practice-sidebar grid gap-4 xl:sticky xl:top-6">
            <GlassPanel className="practice-side-panel">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">变化证据</p>
              <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
                练完要留下证据，
                <br />
                复测才看得见变化。
              </h2>
              <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
                {evidenceSummary}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <EvidencePill label="训练进度" value={`${completedDays} / 7 日`} />
                <EvidencePill label="K 线心念" value={`${klineRecordCount} 次`} />
                <EvidencePill label="每日一省" value={`${reflectionCount} 条`} />
                <EvidencePill label="复测状态" value={isRetestUnlocked ? "可复测" : "训练中"} />
              </div>
            </GlassPanel>

            <GlassPanel className="practice-side-panel">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">知行合一分数</p>
              <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4">
                <div>
                  <p className="font-story text-[clamp(2.55rem,8vw,4rem)] font-light leading-none tracking-[.08em]">
                    42
                  </p>
                  <p className="mt-3 font-function text-xs tracking-[.1em] text-[rgba(220,212,195,.42)]">
                    当前为首测基线：42
                  </p>
                  <p className="mt-2 font-function text-xs tracking-[.1em] text-[rgba(180,157,93,.58)]">
                    七日后生成变化分
                  </p>
                </div>
                <span className="rounded-full border border-[rgba(172,146,83,.16)] px-3 py-1 font-function text-xs tracking-[.1em] text-[rgba(180,157,93,.78)]">
                  第 {completedDays} / 7 日
                </span>
              </div>
            </GlassPanel>

            <GlassPanel className="practice-side-panel">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">行为变化</p>
              <p className="mt-4 font-story text-[1.05rem] font-light leading-8 tracking-[.05em] text-[rgba(242,235,220,.72)]">
                今天是在留下训练证据，不把一次点击当成变化。七日后复测，再看同类触发是否更早被看见。
              </p>
              <div className="mt-5 grid gap-3">
                {behaviorBaselineItems.map((item) => (
                  <BehaviorBaselineRow key={item.key} label={item.label} value={item.value} />
                ))}
              </div>
              {todayEvidence ? (
                <div className="affected-dimensions mt-5">
                  <p>今日影响维度</p>
                  <div>
                    {todayEvidence.affectedDimensions.map((dimension) => (
                      <span key={dimension}>{dimension}</span>
                    ))}
                  </div>
                  <em>七日后复测将重点观察这些维度。</em>
                </div>
              ) : null}
            </GlassPanel>

            <GlassPanel className="practice-side-panel">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">变化心证</p>
              <h2 className="mt-4 font-story text-xl font-light leading-[1.55] tracking-[.08em]">
                {isRetestUnlocked ? "七日已满，可以复测。" : "七日未满，先守今日。"}
              </h2>
              <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
                {isRetestUnlocked
                  ? "系统将对比首测与复测，生成风险雷达差异。"
                  : `已省察 ${completedDays} 日，其中 ${completedDays} 日完成，${retestLockedDays} 日未完成。不急着证明改变，只要每天如实落下一次。`}
              </p>
              <div className="mt-5">
                {isRetestUnlocked ? (
                  <PrimaryButton type="button" onClick={restartAssessment} className="w-full">
                    开始复测
                  </PrimaryButton>
                ) : (
                  <button
                    type="button"
                    className="retest-locked-button"
                    disabled
                  >
                    完成 7 日训练后解锁复测
                  </button>
                )}
              </div>
            </GlassPanel>
          </aside>
        </section>

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

        .practice-hero {
          position: relative;
          display: grid;
          gap: 1rem;
          align-items: end;
          isolation: isolate;
        }

        @media (min-width: 1024px) {
          .practice-hero {
            grid-template-columns: minmax(0, 1fr) minmax(360px, 0.42fr);
          }
        }

        .practice-hero::before {
          content: "";
          position: absolute;
          inset: -28% auto auto 42%;
          width: min(44vw, 420px);
          aspect-ratio: 1;
          border: 1px solid rgba(216, 183, 111, 0.06);
          border-radius: 50%;
          background:
            repeating-radial-gradient(circle, rgba(216, 183, 111, 0.045) 0 1px, transparent 1px 18px),
            radial-gradient(circle, rgba(95, 132, 117, 0.08), transparent 62%);
          opacity: 0.72;
          z-index: -1;
        }

        .practice-workbench,
        .practice-side-panel {
          position: relative;
          overflow: hidden;
        }

        .practice-workbench::before,
        .practice-side-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 0%, rgba(216, 183, 111, 0.055), transparent 16rem),
            radial-gradient(circle at 86% 12%, rgba(95, 132, 117, 0.055), transparent 15rem);
          pointer-events: none;
        }

        .practice-sidebar {
          align-self: start;
        }

        .daily-progress {
          width: 100%;
          border: 1px solid rgba(172, 146, 83, 0.14);
          border-radius: 8px;
          background:
            radial-gradient(circle at 18% 0%, rgba(216, 183, 111, 0.08), transparent 9rem),
            rgba(255, 255, 255, 0.025);
          padding: 0.9rem;
        }

        .daily-progress p,
        .daily-progress span,
        .daily-progress i {
          font-family: var(--font-function);
          font-style: normal;
        }

        .daily-progress p {
          margin: 0;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          color: rgba(216, 183, 111, 0.82);
        }

        .daily-progress span {
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          color: rgba(220, 212, 195, 0.44);
        }

        .daily-progress i {
          position: relative;
          display: grid;
          min-height: 34px;
          place-items: center;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.16);
          color: rgba(220, 212, 195, 0.38);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          overflow: hidden;
        }

        .daily-progress i[data-active="true"] {
          border-color: rgba(216, 183, 111, 0.4);
          background: rgba(125, 96, 44, 0.14);
          color: rgba(242, 235, 220, 0.78);
          box-shadow: 0 0 24px rgba(216, 183, 111, 0.08);
        }

        .training-step {
          position: relative;
          transition:
            opacity 240ms ease,
            filter 240ms ease,
            border-color 240ms ease,
            background 240ms ease;
        }

        .training-step[data-locked="true"] {
          opacity: 0.48;
          filter: grayscale(0.28);
        }

        .training-step[data-locked="false"] {
          border-color: rgba(216, 183, 111, 0.2);
          background:
            radial-gradient(circle at 16% 0%, rgba(216, 183, 111, 0.045), transparent 9rem),
            rgba(255, 255, 255, 0.03);
        }

        .mind-kline-strip {
          display: flex;
          align-items: end;
          gap: 7px;
          min-height: 86px;
          border: 1px solid rgba(172, 146, 83, 0.1);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(216, 183, 111, 0.04), transparent),
            rgba(0, 0, 0, 0.18);
          padding: 12px;
          overflow: hidden;
        }

        .mind-kline-strip i {
          position: relative;
          display: block;
          width: 10px;
          height: var(--bar-height);
          margin-bottom: var(--bar-offset);
          border-radius: 999px;
          background: rgba(216, 183, 111, 0.42);
          filter: blur(0.2px);
          opacity: 0.72;
        }

        .mind-kline-strip i.is-green {
          background: rgba(95, 132, 117, 0.42);
        }

        .mind-kline-strip i::before {
          content: "";
          position: absolute;
          left: 50%;
          top: -8px;
          bottom: -8px;
          width: 1px;
          background: currentColor;
          opacity: 0.45;
          transform: translateX(-50%);
        }

        .kline-pressure-review p,
        .kline-pressure-review span,
        .kline-pressure-review strong {
          display: block;
          font-family: var(--font-function);
        }

        .kline-pressure-review p {
          margin: 0 0 0.4rem;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: rgba(180, 157, 93, 0.7);
        }

        .kline-pressure-review strong {
          font-size: 0.95rem;
          letter-spacing: 0.08em;
          color: rgba(242, 235, 220, 0.82);
        }

        .kline-pressure-review span {
          margin-top: 0.35rem;
          font-size: 0.76rem;
          line-height: 1.75;
          letter-spacing: 0.04em;
          color: rgba(220, 212, 195, 0.5);
        }

        .process-score-card {
          position: relative;
          display: grid;
          gap: 0.35rem;
          overflow: hidden;
          border: 1px solid rgba(172, 146, 83, 0.1);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.16);
          padding: 0.65rem;
        }

        .process-score-card span,
        .process-score-card strong {
          position: relative;
          z-index: 2;
          font-family: var(--font-function);
        }

        .process-score-card span {
          font-size: 0.68rem;
          line-height: 1.5;
          letter-spacing: 0.09em;
          color: rgba(220, 212, 195, 0.44);
        }

        .process-score-card strong {
          font-size: 1.15rem;
          color: rgba(242, 235, 220, 0.78);
        }

        .process-score-card i {
          position: absolute;
          inset: auto 0 0;
          height: 3px;
          transform-origin: left center;
          background: linear-gradient(90deg, rgba(95, 132, 117, 0.82), rgba(216, 183, 111, 0.8));
        }

        .affected-dimensions {
          border-top: 1px solid rgba(172, 146, 83, 0.12);
          padding-top: 1rem;
        }

        .affected-dimensions p,
        .affected-dimensions span,
        .affected-dimensions em {
          font-family: var(--font-function);
          font-style: normal;
        }

        .affected-dimensions p {
          margin: 0 0 0.75rem;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.72);
        }

        .affected-dimensions div {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .affected-dimensions span {
          border: 1px solid rgba(216, 183, 111, 0.18);
          border-radius: 999px;
          background: rgba(216, 183, 111, 0.055);
          padding: 0.38rem 0.62rem;
          color: rgba(242, 235, 220, 0.72);
          font-size: 0.76rem;
          letter-spacing: 0.08em;
        }

        .affected-dimensions em {
          display: block;
          margin-top: 0.8rem;
          color: rgba(220, 212, 195, 0.44);
          font-size: 0.76rem;
          line-height: 1.7;
          letter-spacing: 0.06em;
        }

        .today-proof-card {
          position: relative;
          overflow: hidden;
        }

        .today-proof-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 22% 0%, rgba(216, 183, 111, 0.08), transparent 18rem),
            radial-gradient(circle at 90% 20%, rgba(95, 132, 117, 0.07), transparent 16rem);
          pointer-events: none;
        }

        .today-proof-grid {
          display: grid;
          gap: 0.75rem;
        }

        @media (min-width: 760px) {
          .today-proof-grid {
            grid-template-columns: 0.72fr 1.18fr 1.1fr;
          }
        }

        .practice-action-steps {
          border-top: 1px solid rgba(172, 146, 83, 0.12);
          padding-top: 1.1rem;
          text-align: left;
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
          gap: 0.65rem;
          padding-left: 1.35rem;
          font-family: var(--font-function);
          font-size: 0.88rem;
          line-height: 1.7;
          letter-spacing: 0.035em;
          color: rgba(220, 212, 195, 0.64);
        }

        .practice-action-steps li::marker {
          color: rgba(180, 157, 93, 0.72);
        }

        .practice-choice {
          position: relative;
          display: grid;
          gap: 0.3rem;
          width: 100%;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.14);
          padding: 0.68rem 0.78rem;
          text-align: left;
          overflow: hidden;
          transition:
            border-color 220ms ease,
            background 220ms ease,
            box-shadow 220ms ease,
            transform 220ms ease,
            opacity 220ms ease;
        }

        .practice-choice:disabled {
          cursor: default;
          opacity: 0.56;
        }

        .practice-choice:not(:disabled) {
          cursor: pointer;
        }

        .practice-choice:not(:disabled):active {
          transform: scale(0.992);
        }

        .practice-choice.is-selected {
          border-color: rgba(216, 183, 111, 0.42);
          background:
            radial-gradient(circle at 14% 0%, rgba(216, 183, 111, 0.1), transparent 10rem),
            rgba(216, 183, 111, 0.055);
          box-shadow:
            0 0 0 1px rgba(216, 183, 111, 0.04),
            0 16px 34px rgba(0, 0, 0, 0.22),
            inset 0 0 28px rgba(216, 183, 111, 0.035);
        }

        .practice-choice.is-selected::after {
          content: "";
          position: absolute;
          inset: auto -18% -38% 18%;
          height: 72%;
          border-radius: 50%;
          background:
            radial-gradient(ellipse at 50% 10%, rgba(216, 183, 111, 0.1), transparent 62%),
            repeating-radial-gradient(circle, rgba(216, 183, 111, 0.05) 0 1px, transparent 1px 12px);
          opacity: 0.72;
          pointer-events: none;
        }

        .practice-choice span {
          position: relative;
          z-index: 1;
          font-family: var(--font-function);
          font-size: 0.88rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: rgba(242, 235, 220, 0.78);
        }

        .practice-choice em {
          position: relative;
          z-index: 1;
          font-family: var(--font-function);
          font-size: 0.74rem;
          font-style: normal;
          line-height: 1.7;
          letter-spacing: 0.03em;
          color: rgba(220, 212, 195, 0.42);
        }

        .liangzhi-hold-button {
          position: relative;
          display: grid;
          width: 100%;
          min-height: 52px;
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
          font-size: 0.86rem;
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

        .liangzhi-hold-button b {
          position: absolute;
          inset: auto 0 0;
          height: 100%;
          transform-origin: left center;
          background:
            linear-gradient(90deg, rgba(95, 132, 117, 0.14), rgba(216, 183, 111, 0.18)),
            radial-gradient(circle at 50% 100%, rgba(216, 183, 111, 0.18), transparent 60%);
          transition: transform 80ms linear;
          z-index: 1;
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

        .practice-paper-mirror::before {
          content: "";
          position: absolute;
          inset: 16px;
          border: 1px dashed rgba(220, 212, 195, 0.08);
          border-radius: inherit;
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

        .practice-seal span {
          display: block;
        }

        .retest-locked-button {
          width: 100%;
          border: 1px solid rgba(172, 146, 83, 0.14);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.025);
          padding: 0.9rem 1rem;
          color: rgba(220, 212, 195, 0.5);
          font-family: var(--font-function);
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          transition:
            border-color 220ms ease,
            color 220ms ease,
            background 220ms ease;
        }

        .retest-locked-button:hover {
          border-color: rgba(216, 183, 111, 0.28);
          background: rgba(216, 183, 111, 0.045);
          color: rgba(216, 183, 111, 0.78);
        }

        .practice-trail-list {
          display: grid;
          gap: 0.55rem;
          border: 1px solid rgba(172, 146, 83, 0.1);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.15);
          padding: 0.85rem;
        }

        .practice-trail-list span {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 0.65rem;
          font-family: var(--font-function);
          font-size: 0.8rem;
          line-height: 1.7;
          letter-spacing: 0.04em;
          color: rgba(220, 212, 195, 0.56);
        }

        .practice-trail-list b {
          font-weight: 600;
          color: rgba(180, 157, 93, 0.68);
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
      `}</style>
    </AssessmentShell>
  )
}

type DailyPrescriptionItem = ReturnType<typeof getPracticePrescription>[number]
type KLinePressureReview = ReturnType<typeof buildKLinePressureReview>

function TrainingHero({ isPreview, progressStep }: { isPreview: boolean; progressStep: 0 | 1 | 2 | 3 }) {
  return (
    <div className="practice-hero">
      <div>
        <StatusPill>{isPreview ? "训练预览" : "今日修行"}</StatusPill>
        <h1 className="mt-5 font-story text-[clamp(2.2rem,4.2vw,4.8rem)] font-light leading-[1.14] tracking-[.08em]">
          今天只修这一念。
        </h1>
        <p className="mt-4 max-w-[38rem] font-story text-[1.02rem] font-light leading-8 tracking-[.04em] text-[rgba(220,212,195,.62)]">
          不是急着变好，是把照见落到一个动作里。
        </p>
      </div>
      <DailyProgressSteps step={progressStep} />
    </div>
  )
}

function DailyPrescriptionCard({ nextPractice }: { nextPractice?: DailyPrescriptionItem }) {
  return (
    <div>
      <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">今日事上练</p>
      <h2 className="mt-4 font-story text-2xl font-light leading-[1.45] tracking-[.08em]">
        {nextPractice ? `第 ${nextPractice.day} 日：${nextPractice.title}` : "七日已满，复看心证。"}
      </h2>
      <p className="mt-4 font-story text-[1.12rem] font-light leading-8 tracking-[.055em] text-[rgba(242,235,220,.74)]">
        {nextPractice?.note ?? "回到心证，看看自己是否更早看见第一念。"}
      </p>
      {nextPractice?.actions?.length ? (
        <div className="practice-action-steps mt-5">
          <p>修行动作</p>
          <ol>
            {nextPractice.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  )
}

function CheckinSelector({
  value,
  disabled,
  onSelect,
}: {
  value: CheckinType | null
  disabled: boolean
  onSelect: (value: CheckinType) => void
}) {
  return (
    <div className="training-step rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] p-4">
      <p className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.72)]">
        第一步 · 今日签到
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {checkinOptions.map((option) => (
          <button
            key={option.type}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.type)}
            className={`practice-choice ${value === option.type ? "is-selected" : ""}`}
          >
            <span>{option.label}</span>
            <em>{option.description}</em>
          </button>
        ))}
      </div>
    </div>
  )
}

function ThoughtSelector({
  value,
  disabled,
  onSelect,
  children,
}: {
  value: ThoughtType | null
  disabled: boolean
  onSelect: (value: ThoughtType) => void
  children?: ReactNode
}) {
  return (
    <div
      className="training-step rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] p-4"
      data-locked={disabled}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
        <div>
          <p className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.72)]">
            第二步 · K 线心念训练记录
          </p>
          <p className="mt-3 font-story text-[1.02rem] font-light leading-8 tracking-[.045em] text-[rgba(242,235,220,.72)]">
            价格快速拉升，你原本没有计划进场。此刻最容易出现哪一念？
          </p>
        </div>
        <div className="mind-kline-strip" aria-hidden="true">
          {mindKlineBars.map((bar, index) => (
            <i
              key={`${bar.height}-${index}`}
              className={bar.tone === "green" ? "is-green" : ""}
              style={{ "--bar-height": `${bar.height}%`, "--bar-offset": `${bar.offset}%` } as CSSProperties}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {thoughtOptions.map((option) => (
          <button
            key={option.type}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.type)}
            className={`practice-choice ${value === option.type ? "is-selected" : ""}`}
          >
            <span>{option.label}</span>
            <em>{option.action}</em>
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}

function ThoughtFeedbackCard({
  review,
  selectedLabel,
  feedback,
}: {
  review: KLinePressureReview
  selectedLabel: string
  feedback: string
}) {
  return (
    <div className="kline-pressure-review mt-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
        <div className="rounded-[8px] border border-[rgba(216,183,111,.14)] bg-black/15 px-3 py-2">
          <p>本次第一反应</p>
          <strong>{selectedLabel}</strong>
          <span>反应时间：{review.reactionTimeLabel}</span>
        </div>
        <div className="rounded-[8px] border border-[rgba(95,132,117,.16)] bg-[rgba(95,132,117,.06)] px-3 py-2">
          <p>本次 K 线照见</p>
          <strong>{review.trigger}</strong>
          <span>{review.insight}</span>
        </div>
      </div>
      <p className="mt-3 font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.72)]">
        过程质量，不按盈亏评分
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
        {processScoreItems.map((item) => (
          <ProcessScoreBar key={item.key} label={item.label} value={review.scores[item.key]} />
        ))}
      </div>
      <p className="mt-3 rounded-[8px] border border-[rgba(95,132,117,.16)] bg-[rgba(95,132,117,.06)] px-3 py-2 font-function text-xs leading-6 text-[rgba(220,212,195,.56)]">
        {feedback} {review.suggestion}
      </p>
    </div>
  )
}

function ReflectionInput({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-2">
      <span className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.72)]">
        第三步 · 每日一省
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={120}
        disabled={disabled}
        placeholder="今天哪一念最容易带走你？写一句即可。"
        className="min-h-20 resize-none rounded-[8px] border border-[rgba(172,146,83,.16)] bg-black/20 px-4 py-3 font-function text-sm leading-7 text-[rgba(242,235,220,.82)] outline-none transition placeholder:text-[rgba(220,212,195,.26)] focus:border-[rgba(180,157,93,.42)] disabled:opacity-50"
      />
    </label>
  )
}

function CompletionSealCard({
  selectedThoughtLabel,
  completedDays,
  remainingDays,
}: {
  selectedThoughtLabel: string
  completedDays: number
  remainingDays: number
}) {
  return (
    <div className="practice-seal-ritual" aria-live="polite">
      <p className="seal-stage-label">今日修行已完成</p>
      <div className="practice-paper-mirror">
        <div className="practice-seal">
          <span>今日已照见</span>
          <span>事上磨一念</span>
        </div>
      </div>
      <p>你今天照见的是：{selectedThoughtLabel}</p>
      <p>已落下第 {completedDays} 次训练证据。</p>
      <p>距离复测还差 {remainingDays} 日。</p>
      <p>真正的变化，不是今天就不冲动了，而是你已经能在冲动前看见它。</p>
    </div>
  )
}

type HoldToCompleteButtonProps = {
  disabled?: boolean
  completed?: boolean
  durationMs?: number
  progress: number
  onProgressChange: (progress: number) => void
  onHoldStart?: () => void
  onHoldCancel?: () => void
  onComplete: () => void
}

function HoldToCompleteButton({
  disabled = false,
  completed = false,
  durationMs = 2000,
  progress,
  onProgressChange,
  onHoldStart,
  onHoldCancel,
  onComplete,
}: HoldToCompleteButtonProps) {
  const progressRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const completedRef = useRef(completed)

  useEffect(() => {
    completedRef.current = completed
    if (completed) progressRef.current = 1
  }, [completed])

  const stop = useCallback(() => {
    const wasHolding = Boolean(rafRef.current || startRef.current || progressRef.current > 0)
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startRef.current = null

    if (!completedRef.current) {
      if (wasHolding) onHoldCancel?.()
      progressRef.current = 0
      onProgressChange(0)
    }
  }, [onHoldCancel, onProgressChange])

  const start = useCallback(() => {
    if (disabled || completed || completedRef.current || rafRef.current) return
    completedRef.current = false
    startRef.current = null
    progressRef.current = 0
    onProgressChange(0)
    onHoldStart?.()
    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now

      const elapsed = now - startRef.current
      const nextProgress = Math.min(1, elapsed / durationMs)
      progressRef.current = nextProgress
      onProgressChange(nextProgress)

      if (nextProgress >= 1) {
        completedRef.current = true
        stop()
        onComplete()
        return
      }

      rafRef.current = window.requestAnimationFrame(tick)
    }

    rafRef.current = window.requestAnimationFrame(tick)
  }, [completed, disabled, durationMs, onComplete, onHoldStart, onProgressChange, stop])

  useEffect(() => () => {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
  }, [])

  const displayedProgress = completed ? 1 : progress
  const label = completed
    ? "今日已落印"
    : disabled
      ? "写下一句后落印"
      : displayedProgress > 0
        ? `照见中 ${Math.round(displayedProgress * 100)}%`
        : "按住水面 · 致良知"

  return (
    <button
      type="button"
      className={`liangzhi-hold-button ${displayedProgress > 0 && !completed ? "is-holding" : ""}`}
      disabled={disabled || completed}
      data-progress={displayedProgress}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={(event) => {
        event.preventDefault()
        start()
      }}
      onTouchEnd={stop}
      onTouchCancel={stop}
      onKeyDown={(event) => {
        if (event.repeat) return
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault()
          start()
        }
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault()
          stop()
        }
      }}
    >
      <span>{label}</span>
      <b aria-hidden="true" style={{ transform: `scaleX(${displayedProgress})` }} />
      <i aria-hidden="true" />
    </button>
  )
}

function DailyProgressSteps({ step }: { step: 0 | 1 | 2 | 3 }) {
  const labels = ["签到", "观念", "落印"]

  return (
    <div className="daily-progress mt-6">
      <div className="flex items-center justify-between gap-3">
        <p>今日修行 {step}/3</p>
        <span>签到 → 观念 → 落印</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {labels.map((label, index) => (
          <i key={label} data-active={step >= index + 1}>
            {label}
          </i>
        ))}
      </div>
    </div>
  )
}

function ProcessScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="process-score-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i style={{ transform: `scaleX(${value / 100})` }} />
    </div>
  )
}

function PracticeTrail({ record }: { record: PracticeChangeState["records"][number] }) {
  const time = formatTrailTime(record.recordedAt)

  return (
    <div className="rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3">
      <p className="font-story text-lg font-light tracking-[.06em]">
        第 {record.day} 日 · {record.title}
      </p>
      <div className="practice-trail-list mt-3">
        <span>
          <b>{time}</b>
          签到：{record.checkIn ? getCheckinLabel(record.checkIn) : "已签到"}
        </span>
        <span>
          <b>{time}</b>
          K 线心念：{record.klineRecord ? getThoughtLabel(record.klineRecord.reactionKey) : "已记录"}
        </span>
        <span>
          <b>{time}</b>
          每日一省：{record.cultivationText || "已完成今日省察。"}
        </span>
        <span>
          <b>{time}</b>
          今日落印：已完成 Day {record.day}
        </span>
      </div>
    </div>
  )
}

function BehaviorBaselineRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-4 font-function text-sm text-[rgba(220,212,195,.68)]">
        <span>{label}</span>
        <span className="text-[rgba(180,157,93,.78)]">待复测</span>
      </div>
      <div className="grid grid-cols-[36px_1fr_36px] items-center gap-2">
        <span className="font-function text-xs text-[rgba(220,212,195,.34)]">{value}</span>
        <div className="relative h-2 overflow-hidden rounded-full bg-white/[.055]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#8b7540,#b49d5d)]"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-right font-function text-xs text-[rgba(242,235,220,.56)]">首测</span>
      </div>
    </div>
  )
}

function EvidencePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3">
      <p className="font-function text-xs tracking-[.14em] text-[rgba(220,212,195,.4)]">{label}</p>
      <p className="mt-2 font-story text-xl font-light tracking-[.08em] text-[rgba(242,235,220,.78)]">{value}</p>
    </div>
  )
}
