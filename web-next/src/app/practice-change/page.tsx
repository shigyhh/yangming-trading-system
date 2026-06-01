"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
  reconcilePracticeChangeWithReport,
  type PracticeChangeState,
  type PracticeCheckInStatus,
  type PracticeMetric,
} from "@/features/assessment/practice-change"
import { buildPreviewAssessmentReport } from "@/features/assessment/preview-report"
import type { AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, clearAssessmentDraft, getStorage, setStorage } from "@/features/assessment/storage"
import { syncTrainingRecordBinding } from "@/features/data-binding/api-client"

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

const checkInOptions: Array<{ value: PracticeCheckInStatus; label: string; description: string }> = [
  { value: "preparing_trade", label: "准备交易", description: "今天可能会执行计划内动作。" },
  { value: "observe_only", label: "只观察", description: "今天先看念头，不急着行动。" },
  { value: "already_traded", label: "已经交易过", description: "回看刚才是谁在替我行动。" },
]

const checkInLabels: Record<PracticeCheckInStatus, string> = {
  preparing_trade: "准备交易",
  observe_only: "只观察",
  already_traded: "已经交易过",
}

const klineMindOptions = [
  {
    key: "fear_missing",
    label: "怕错过",
    reaction: "怕错过，想立刻跟上",
    action: "先停十秒，写出是否在原计划内。",
    feedback: "今天先练：看到快速拉升，先不行动，写下进场理由。",
  },
  {
    key: "want_chase",
    label: "想追进去",
    reaction: "想追进去，用动作压住焦虑",
    action: "把手从按钮上拿开，复核一条入场条件。",
    feedback: "今天先练：把想追的冲动命名，再回到一条条件。",
  },
  {
    key: "wait_pullback",
    label: "想等回撤",
    reaction: "想等回撤，但心里仍被波动牵住",
    action: "写下等待的条件，条件未到只观察。",
    feedback: "今天先练：等待不是拖延，而是让条件替你行动。",
  },
  {
    key: "ask_others",
    label: "想问别人",
    reaction: "想把判断交给外部声音",
    action: "先写自己的判断，再看外部信息。",
    feedback: "今天先练：外声出现前，先留下自己的第一判断。",
  },
  {
    key: "abandon_plan",
    label: "想放弃计划",
    reaction: "想临时放弃原计划",
    action: "只比较计划条件，不给情绪补故事。",
    feedback: "今天先练：计划可以复盘后调整，不在情绪峰值处改。",
  },
]

export default function PracticeChangePage() {
  const router = useRouter()
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [practice, setPractice] = useState<PracticeChangeState | null>(null)
  const [sealDropped, setSealDropped] = useState(false)
  const [holdingSeal, setHoldingSeal] = useState(false)
  const [cultivationText, setCultivationText] = useState("")
  const [dailyCheckIn, setDailyCheckIn] = useState<PracticeCheckInStatus | "">("")
  const [klineChoice, setKlineChoice] = useState("")
  const [recordMessage, setRecordMessage] = useState("")
  const [isPreview, setIsPreview] = useState(false)
  const sealHoldTimerRef = useRef<number | null>(null)
  const prescription = useMemo(() => getPracticePrescription(report), [report])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const previewMode = new URLSearchParams(window.location.search).get("preview") === "1"
      const savedReport = previewMode
        ? buildPreviewAssessmentReport()
        : getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null)
      if (!savedReport) return
      setIsPreview(previewMode)

      const savedPractice = getStorage<PracticeChangeState | null>(assessmentStorageKeys.practiceChange, null)
      const nextPractice = !previewMode && savedPractice
        ? reconcilePracticeChangeWithReport(savedPractice, savedReport)
        : createPracticeChange(savedReport)

      setReport(savedReport)
      setPractice(nextPractice)
      if (!previewMode) setStorage(assessmentStorageKeys.practiceChange, nextPractice)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const recordToday = () => {
    if (!practice || !canRecordPracticeToday(practice)) return
    const cleanCultivationText = cultivationText.trim().slice(0, 120)
    const selectedKlineMind = klineMindOptions.find((option) => option.key === klineChoice)

    if (!dailyCheckIn) {
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

    const nextPractice = advancePracticeChange(practice, "completed", {
      checkIn: dailyCheckIn,
      cultivationText: cleanCultivationText,
      klineRecord: {
        sceneKey: "fast_rise_no_plan",
        reactionKey: selectedKlineMind.key,
        scene: "价格快速拉升，原本没有计划进场。",
        reaction: selectedKlineMind.reaction,
        disciplineAction: selectedKlineMind.action,
        feedback: selectedKlineMind.feedback,
      },
    })
    setPractice(nextPractice)
    if (!isPreview) setStorage(assessmentStorageKeys.practiceChange, nextPractice)
    const syncedRecord = nextPractice.records.find((record) => record.day === nextPractice.day)
    if (syncedRecord && !isPreview) {
      void syncTrainingRecordBinding({ practiceState: nextPractice, record: syncedRecord })
    }
    setSealDropped(true)
    setRecordMessage(isPreview ? "预览训练已记录，不写入数据链。" : "今日训练已记录。")
    setCultivationText("")
    setDailyCheckIn("")
    setKlineChoice("")
  }

  const clearSealHold = () => {
    if (sealHoldTimerRef.current) window.clearTimeout(sealHoldTimerRef.current)
    sealHoldTimerRef.current = null
    setHoldingSeal(false)
  }

  const startSealHold = () => {
    if (!practice || !canRecordPracticeToday(practice)) return
    if (!dailyCheckIn) {
      setRecordMessage("先完成今日签到，再落印。")
      return
    }

    if (!klineChoice) {
      setRecordMessage("先选出 K 线场景里最容易带走你的一念。")
      return
    }

    if (!cultivationText.trim()) {
      setRecordMessage("写一句每日一省，再落印。")
      return
    }

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
  const zhixingMetric = practice.metrics.find((metric) => metric.key === "zhixing")
  const practiceCounts = getPracticeCounts(practice)
  const strongestChange = getStrongestChange(practice.metrics)
  const isSevenDaysComplete = practice.day >= 7
  const showSeal = sealDropped || (!canRecordToday && practice.day > 0)
  const radarComparison = compareRiskRadarSnapshots(practice.baselineReport, practice.retestReport)
  const hasRetestComparison = radarComparison.length > 0
  const selectedKlineMind = klineMindOptions.find((option) => option.key === klineChoice)
  const klineRecordCount = practice.records.filter((record) => record.klineRecord).length
  const evidenceSummary = practice.day === 0
    ? "证据还没开始。完成第一日训练后，这里会开始记录签到、K 线心念和复盘文字。"
    : strongestChange
      ? `过去 7 天，你已完成 ${practiceCounts.completed} 次训练，其中 ${klineRecordCount} 次记录了 K 线心念。目前最明显的变化是${strongestChange.label}${getChangeLabel(strongestChange)}。`
      : `过去 7 天，你已完成 ${practiceCounts.completed} 次训练，其中 ${klineRecordCount} 次记录了 K 线心念。变化正在积累。`

  return (
    <AssessmentShell className="py-5">
      <div className="practice-change flex flex-col">
        <StatusPill>{isPreview ? "训练预览" : "今日修行"}</StatusPill>
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
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">变化证据</p>
          <h2 className="mt-4 font-story text-2xl font-light leading-[1.5] tracking-[.08em]">
            练完要留下证据，
            <br />
            复测才看得见变化。
          </h2>
          <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.56)]">
            {evidenceSummary}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <EvidencePill label="训练进度" value={`${practice.day} / 7 日`} />
            <EvidencePill label="K 线心念" value={`${klineRecordCount} 次`} />
            <EvidencePill label="复测状态" value={hasRetestComparison ? "已对比" : isSevenDaysComplete ? "可复测" : "训练中"} />
          </div>
        </GlassPanel>

        <GlassPanel className="mt-8">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">今日事上练</p>
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
          <div className="mt-6 grid gap-3">
            <div className="grid gap-3 rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] p-4">
              <p className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.72)]">
                今日签到
              </p>
              <div className="grid gap-2">
                {checkInOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!canRecordToday}
                    onClick={() => setDailyCheckIn(option.value)}
                    className={`practice-choice ${dailyCheckIn === option.value ? "is-selected" : ""}`}
                  >
                    <span>{option.label}</span>
                    <em>{option.description}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] p-4">
              <p className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.72)]">
                K 线心念训练记录
              </p>
              <p className="font-story text-[1.02rem] font-light leading-8 tracking-[.045em] text-[rgba(242,235,220,.72)]">
                价格快速拉升，你原本没有计划进场。此刻最容易出现哪一念？
              </p>
              <div className="grid gap-2">
                {klineMindOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    disabled={!canRecordToday}
                    onClick={() => setKlineChoice(option.key)}
                    className={`practice-choice ${klineChoice === option.key ? "is-selected" : ""}`}
                  >
                    <span>{option.label}</span>
                    <em>{option.action}</em>
                  </button>
                ))}
              </div>
              {selectedKlineMind ? (
                <p className="rounded-[8px] border border-[rgba(95,132,117,.16)] bg-[rgba(95,132,117,.06)] px-3 py-2 font-function text-xs leading-6 text-[rgba(220,212,195,.56)]">
                  {selectedKlineMind.feedback}
                </p>
              ) : null}
            </div>

            <label className="grid gap-2">
              <span className="font-function text-xs font-semibold tracking-[.16em] text-[rgba(180,157,93,.72)]">
                每日一省 · 每日修行文字记录
              </span>
              <textarea
                value={cultivationText}
                onChange={(event) => setCultivationText(event.target.value)}
                maxLength={120}
                disabled={!canRecordToday}
                placeholder="今天哪一念最容易带走你？写一句即可。"
                className="min-h-24 resize-none rounded-[8px] border border-[rgba(172,146,83,.16)] bg-black/20 px-4 py-3 font-function text-sm leading-7 text-[rgba(242,235,220,.82)] outline-none transition placeholder:text-[rgba(220,212,195,.26)] focus:border-[rgba(180,157,93,.42)] disabled:opacity-50"
              />
            </label>

            {recordMessage ? (
              <p className="font-function text-xs leading-6 tracking-[.06em] text-[rgba(216,183,111,.76)]">
                {recordMessage}
              </p>
            ) : null}
          </div>
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
              <div className="practice-paper-mirror">
                <div className="practice-seal">
                  <span>今日已照见</span>
                  <span>事上磨一念</span>
                </div>
              </div>
              <p>今日不求胜行情，只求不被一念牵走。</p>
            </div>
          ) : null}
        </GlassPanel>

        <GlassPanel className="mt-8">
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">知行合一分数</p>
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
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">行为变化</p>
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
          <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">变化心证</p>
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
              {hasRetestComparison ? "再次复测心证 →" : isSevenDaysComplete ? "七日后复测心证 →" : "七日后开启复测"}
            </PrimaryButton>
          </div>
        </GlassPanel>

        <GlassPanel className="mt-4">
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
                    {record.checkIn ? ` · 签到：${checkInLabels[record.checkIn]}` : ""}
                  </p>
                  <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.5)]">{record.note}</p>
                  {record.cultivationText ? (
                    <p className="mt-3 rounded-[8px] border border-[rgba(172,146,83,.1)] bg-black/15 px-3 py-2 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">
                      修行记录：{record.cultivationText}
                    </p>
                  ) : null}
                  {record.klineRecord ? (
                    <div className="mt-3 grid gap-1 rounded-[8px] border border-[rgba(95,132,117,.14)] bg-[rgba(95,132,117,.06)] px-3 py-2 font-function text-xs leading-6 text-[rgba(220,212,195,.5)]">
                      <span>K 线场景：{record.klineRecord.scene}</span>
                      <span>第一反应：{record.klineRecord.reaction}</span>
                      <span>训练动作：{record.klineRecord.disciplineAction}</span>
                      {record.klineRecord.feedback ? <span>系统反馈：{record.klineRecord.feedback}</span> : null}
                    </div>
                  ) : null}
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

        .practice-choice {
          display: grid;
          gap: 0.3rem;
          width: 100%;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.14);
          padding: 0.82rem 0.9rem;
          text-align: left;
          transition:
            border-color 220ms ease,
            background 220ms ease,
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
        }

        .practice-choice span {
          font-family: var(--font-function);
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: rgba(242, 235, 220, 0.78);
        }

        .practice-choice em {
          font-family: var(--font-function);
          font-size: 0.78rem;
          font-style: normal;
          line-height: 1.7;
          letter-spacing: 0.03em;
          color: rgba(220, 212, 195, 0.42);
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

function EvidencePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(172,146,83,.12)] bg-white/[.025] px-4 py-3">
      <p className="font-function text-xs tracking-[.14em] text-[rgba(220,212,195,.4)]">{label}</p>
      <p className="mt-2 font-story text-xl font-light tracking-[.08em] text-[rgba(242,235,220,.78)]">{value}</p>
    </div>
  )
}
