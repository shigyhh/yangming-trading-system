"use client"

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react"

import { YangmingZhaoSeal } from "@/components/brand/yangming-zhao-seal"
import {
  AssessmentShell,
  ComplianceNote,
  PrimaryLink,
  SecondaryButton,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import { buildPreviewAssessmentReport } from "@/features/assessment/preview-report"
import { generateMirrorReport, type AssessmentReport } from "@/features/assessment/report"
import { assessmentStorageKeys, getStorage } from "@/features/assessment/storage"
import { getDataBindingUserProfile } from "@/features/data-binding/api-client"
import { loadHeartProofs, loadLatestHeartProof } from "@/features/heart-proof/heartProofStorage"
import type { HeartProof } from "@/features/heart-proof/heartProofTypes"
import { buildMirrorReport } from "@/features/mirror-report/mirrorReportEngine"
import { loadMirrorReport, saveMirrorReport } from "@/features/mirror-report/mirrorReportStorage"
import {
  createTodayOneThoughtSnapshot,
  buildOneThoughtGrowthProfile,
  loadOneThoughtRecords,
  TODAY_ONE_THOUGHT_CONFIRM_LIMIT,
  TODAY_ONE_THOUGHT_STORAGE_KEY,
  todayOneThoughtSourceItems,
  type OneThoughtGrowthProfile,
  type TodayOneThoughtSnapshot,
  type TodayOneThoughtSourceItem,
  type TodayOneThoughtStoredState,
} from "@/data/insight-engine/today-one-thought"

type SeeingMirror = {
  behaviorMirrorId: string
  name: string
  room: string
}

type ThiefGlyph = {
  glyph: "贪" | "急" | "惧" | "疑" | "执" | "从"
  active: boolean
  primary: boolean
}

type TodaySeeingReport = {
  thought: TodayOneThoughtSnapshot
  mirror: SeeingMirror
  thiefGlyphs: ThiefGlyph[]
  primaryThief: string
  activeThieves: string[]
  occurrenceCount: number
  recentMoments: string[]
  latestProof?: HeartProof | null
  growthProfile: OneThoughtGrowthProfile
}

const seeingMirrorById: Record<string, SeeingMirror> = {
  chase: { behaviorMirrorId: "chasing", name: "追涨之镜", room: "追涨之镜" },
  hold: { behaviorMirrorId: "holdingLoss", name: "扛单之镜", room: "扛单之镜" },
  fantasy: { behaviorMirrorId: "fantasy", name: "幻想之镜", room: "幻想之镜" },
  gamble: { behaviorMirrorId: "gambling", name: "赌性之镜", room: "赌性之镜" },
  herd: { behaviorMirrorId: "following", name: "从众之镜", room: "从众之镜" },
  hesitate: { behaviorMirrorId: "hesitation", name: "犹疑之镜", room: "犹疑之镜" },
  delay: { behaviorMirrorId: "procrastination", name: "拖延之镜", room: "拖延之镜" },
  anxiety: { behaviorMirrorId: "anxiety", name: "焦虑之镜", room: "焦虑之镜" },
  conscience: { behaviorMirrorId: "conscience", name: "良知之镜", room: "良知之镜" },
  fallback: { behaviorMirrorId: "chasing", name: "追涨之镜", room: "追涨之镜" },
}

const mirrorRooms = ["追涨之镜", "扛单之镜", "幻想之镜", "赌性之镜", "从众之镜", "犹疑之镜", "拖延之镜", "焦虑之镜", "良知之镜"]

const thiefGlyphOrder: ThiefGlyph["glyph"][] = ["贪", "急", "惧", "疑", "执", "从"]

const sevenDayCultivation = [
  "暂停三息",
  "记录这一念出现的时刻",
  "不因结果否定过程",
  "把注意力从盈亏移回规则",
  "写下是谁在下单",
  "完成一次不被念头带走的交易",
  "复照一次，看这一念是否减弱",
]

function clampConfirmationCount(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(TODAY_ONE_THOUGHT_CONFIRM_LIMIT, Math.max(0, Math.trunc(value)))
}

function snapshotFromStoredState(state: TodayOneThoughtStoredState): TodayOneThoughtSnapshot | null {
  const sourceItem = todayOneThoughtSourceItems.find((item) => item.thoughtId === state.thoughtId)
  if (!sourceItem) return null

  const confirmationCount = clampConfirmationCount(state.confirmationCount)
  const remainingConfirmations = Math.max(0, TODAY_ONE_THOUGHT_CONFIRM_LIMIT - confirmationCount)

  return {
    ...sourceItem,
    dateKey: state.dateKey,
    confirmationCount,
    remainingConfirmations,
    changeCount: confirmationCount,
    remainingChanges: remainingConfirmations,
    storedState: {
      ...state,
      confirmationCount,
    },
  }
}

function readTodayThoughtSnapshot() {
  const storedState = getStorage<TodayOneThoughtStoredState | null>(TODAY_ONE_THOUGHT_STORAGE_KEY, null)
  const storedSnapshot = storedState ? snapshotFromStoredState(storedState) : null

  return storedSnapshot ?? createTodayOneThoughtSnapshot()
}

function getSeeingMirror(mirrorId: string) {
  return seeingMirrorById[mirrorId] ?? seeingMirrorById.fallback
}

function normalizeThieves(thief: string, mirrorId: string) {
  const thieves: ThiefGlyph["glyph"][] = []
  const push = (glyph: ThiefGlyph["glyph"]) => {
    if (!thieves.includes(glyph)) thieves.push(glyph)
  }

  if (thief.includes("贪")) push("贪")
  if (thief.includes("急")) push("急")
  if (thief.includes("惧") || thief.includes("怯")) push("惧")
  if (thief.includes("疑")) push("疑")
  if (thief.includes("执") || thief.includes("痴") || thief.includes("慢") || thief.includes("懒")) push("执")
  if (thief.includes("从") || mirrorId === "herd") push("从")

  return thieves.length ? thieves : (["执"] as ThiefGlyph["glyph"][])
}

function buildThiefGlyphs(thief: string, mirrorId: string) {
  const activeThieves = normalizeThieves(thief, mirrorId)

  return thiefGlyphOrder.map((glyph) => ({
    glyph,
    active: activeThieves.includes(glyph),
    primary: activeThieves[0] === glyph,
  }))
}

function isRecentProof(proof: HeartProof, now = Date.now()) {
  const createdAt = new Date(proof.createdAt).getTime()
  if (Number.isNaN(createdAt)) return false
  return now - createdAt <= 30 * 24 * 60 * 60 * 1000
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function countThoughtOccurrences(thought: TodayOneThoughtSourceItem, heartProofs: HeartProof[]) {
  const recentProofs = heartProofs.filter((proof) => isRecentProof(proof))
  const exactCount = recentProofs.filter((proof) => proof.sourceId.includes(thought.thoughtId)).length
  const mirrorCount = recentProofs.filter((proof) => proof.behaviorType === thought.mirrorId).length

  return Math.max(1, exactCount || mirrorCount)
}

function getRecentMoments(thought: TodayOneThoughtSourceItem, heartProofs: HeartProof[]) {
  const relatedMoments = heartProofs
    .filter((proof) => isRecentProof(proof))
    .filter((proof) => proof.sourceId.includes(thought.thoughtId) || proof.behaviorType === thought.mirrorId)
    .map((proof) => proof.thoughtLabel || "")

  return uniqueStrings([thought.tradeMoment, ...relatedMoments]).slice(0, 3)
}

function buildTodaySeeingReport(thought: TodayOneThoughtSnapshot, heartProofs: HeartProof[], latestProof: HeartProof | null): TodaySeeingReport {
  const mirror = getSeeingMirror(thought.mirrorId)
  const activeThieves = normalizeThieves(thought.thief, thought.mirrorId)
  const growthProfile = buildOneThoughtGrowthProfile({
    userId: "local-anonymous",
    period: "7d",
    records: loadOneThoughtRecords(),
  })

  return {
    thought,
    mirror,
    thiefGlyphs: buildThiefGlyphs(thought.thief, thought.mirrorId),
    primaryThief: activeThieves[0],
    activeThieves,
    occurrenceCount: countThoughtOccurrences(thought, heartProofs),
    recentMoments: getRecentMoments(thought, heartProofs),
    latestProof,
    growthProfile,
  }
}

export default function AssessmentResultPage() {
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [todayReport, setTodayReport] = useState<TodaySeeingReport | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [savedMirrorReportId, setSavedMirrorReportId] = useState("")
  const [savedMessage, setSavedMessage] = useState("")
  const [visibleActs, setVisibleActs] = useState<number[]>([0])
  const [activeAct, setActiveAct] = useState(0)

  const mirrorReport = useMemo(() => {
    if (!report) return null

    const profile = getDataBindingUserProfile()
    return buildMirrorReport({
      report,
      anonymousId: profile.userId,
    })
  }, [report])

  const mirrorReportSaved = Boolean(mirrorReport && savedMirrorReportId === mirrorReport.reportId)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const previewMode = new URLSearchParams(window.location.search).get("preview") === "1"
      const thought = readTodayThoughtSnapshot()
      const heartProofs = loadHeartProofs()
      const latestProof = loadLatestHeartProof()
      const mirror = getSeeingMirror(thought.mirrorId)
      const storedReport = getStorage<AssessmentReport | null>(assessmentStorageKeys.report, null)
      const fallbackReport = generateMirrorReport(mirror.behaviorMirrorId) as AssessmentReport
      const nextReport = previewMode ? buildPreviewAssessmentReport() : storedReport ?? fallbackReport

      setIsPreview(previewMode)
      setTodayReport(buildTodaySeeingReport(thought, heartProofs, latestProof))
      setReport(nextReport)
      setSavedMirrorReportId(loadMirrorReport()?.reportId ?? "")
      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!loaded || isPreview || !mirrorReport || mirrorReportSaved) return

    saveMirrorReport(mirrorReport)
    setSavedMirrorReportId(mirrorReport.reportId)
  }, [isPreview, loaded, mirrorReport, mirrorReportSaved])

  useEffect(() => {
    if (!loaded) return undefined

    const sections = Array.from(document.querySelectorAll<HTMLElement>(".seeing-act"))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return

          const act = Number(entry.target.getAttribute("data-act") || 0)
          setActiveAct(act)
          setVisibleActs((current) => (current.includes(act) ? current : [...current, act].sort((a, b) => a - b)))
        })
      },
      { threshold: 0.42 },
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [loaded])

  const saveCurrentMirrorReport = useCallback(() => {
    if (!mirrorReport) return

    saveMirrorReport(mirrorReport)
    setSavedMirrorReportId(mirrorReport.reportId)
    setSavedMessage("今日照见报告已入档。")
  }, [mirrorReport])

  const scrollToAct = useCallback((act: number) => {
    document.querySelector<HTMLElement>(`[data-act="${act}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const isActVisible = useCallback((act: number) => visibleActs.includes(act), [visibleActs])

  if (!loaded) {
    return (
      <AssessmentShell>
        <StatusPill>正在显影今日照见报告</StatusPill>
      </AssessmentShell>
    )
  }

  if (!todayReport || !report || !mirrorReport) {
    return (
      <AssessmentShell>
        <div className="text-center">
          <StatusPill>暂无今日照见</StatusPill>
          <h1 className="mt-8 font-story text-4xl font-light leading-[1.35] tracking-[.1em]">
            今日照见报告尚未生成。
          </h1>
          <p className="mt-6 font-function text-sm leading-7 text-[rgba(220,212,195,.58)]">
            先完成一次今日照见、照回与落印，报告会从同一念头自然显影。
          </p>
          <PrimaryLink href="/assessment" className="mt-8 w-full">
            进入今日照见
          </PrimaryLink>
        </div>
      </AssessmentShell>
    )
  }

  const { thought } = todayReport
  const hasGrowthRecords = todayReport.growthProfile.topThoughts.length > 0
  const growthTopThought = todayReport.growthProfile.topThoughts[0]?.os || thought.os
  const growthTopThief = todayReport.growthProfile.thiefTrend[0]?.thief || todayReport.primaryThief
  const growthPrompt = hasGrowthRecords
    ? todayReport.growthProfile.growthPrompt
    : `你今天先照见：「${growthTopThought}」\n这一念背后，是${growthTopThief}。`

  return (
    <AssessmentShell className="p-0 md:p-0" contentWidth="wide">
      <main
        className="seeing-report"
        data-active-act={activeAct}
        aria-label={isPreview ? "今日照见报告预览" : "今日照见报告"}
      >
        <div className="heart-lake-veil" aria-hidden="true" />
        <div className="heart-lake-waterline" aria-hidden="true" />

        <section
          className={`seeing-act act-still-water ${isActVisible(0) ? "is-visible" : ""}`}
          data-act="0"
          onClick={() => scrollToAct(1)}
        >
          <div className="act-copy">
            <p className="act-kicker">第一幕 · 静水照心</p>
            <h1>
              <span>你不是一种人格。</span>
              <span>你只是经常被某一种念头带走。</span>
            </h1>
          </div>
          <span className="still-breath" aria-hidden="true" />
          <button type="button" className="act-scroll-cue" onClick={(event) => { event.stopPropagation(); scrollToAct(1) }}>
            向下照见
          </button>
        </section>

        <section
          className={`seeing-act act-one-thought ${isActVisible(1) ? "is-visible" : ""}`}
          data-act="1"
          onClick={() => scrollToAct(2)}
        >
          <div className="thought-ripple" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="act-copy">
            <p className="trade-moment">{thought.tradeMoment}</p>
            <p className="act-kicker">第二幕 · 一念显影</p>
            <p className="thought-lead">最常带走你的那一念是：</p>
            <h2 className="core-thought">「{thought.os}」</h2>
            <p className="act-note">{thought.reflectionFinal || thought.reflection}</p>
          </div>
          <button type="button" className="act-scroll-cue" onClick={(event) => { event.stopPropagation(); scrollToAct(2) }}>
            看见心贼
          </button>
        </section>

        <section
          className={`seeing-act act-heart-thief ${isActVisible(2) ? "is-visible" : ""}`}
          data-act="2"
          onClick={() => scrollToAct(3)}
        >
          <div className="thief-orbit" aria-label="心贼显影">
            {todayReport.thiefGlyphs.map((item, index) => (
              <span
                key={item.glyph}
                className={`${item.active ? "is-active" : ""} ${item.primary ? "is-primary" : ""}`}
                style={{ "--i": index, "--thief-delay": `${420 + index * 80}ms` } as CSSProperties}
              >
                {item.glyph}
              </span>
            ))}
          </div>
          <div className="act-copy">
            <p className="act-kicker">第三幕 · 心贼显影</p>
            <h2>
              这一念里，最重的是：
              <strong>{todayReport.primaryThief}</strong>
            </h2>
            <p className="act-note">
              不是给你定名，是让你看见：这一刻，谁在牵动你的手。
            </p>
          </div>
          <button type="button" className="act-scroll-cue" onClick={(event) => { event.stopPropagation(); scrollToAct(3) }}>
            我的照见
          </button>
        </section>

        <section
          className={`seeing-act act-my-seeing ${isActVisible(3) ? "is-visible" : ""}`}
          data-act="3"
          onClick={() => scrollToAct(4)}
        >
          <div className="my-seeing-ripple" aria-hidden="true" />
          <div className="act-copy my-seeing-copy">
            <p className="act-kicker">照见 · 我的照见</p>
            <h2>我今天看见：</h2>
            <p className="my-seeing-line">{thought.evidence}</p>
          </div>
          <button type="button" className="act-scroll-cue" onClick={(event) => { event.stopPropagation(); scrollToAct(4) }}>
            看见九镜
          </button>
        </section>

        <section
          className={`seeing-act act-nine-mirror ${isActVisible(4) ? "is-visible" : ""}`}
          data-act="4"
          onClick={() => scrollToAct(5)}
        >
          <div className="mirror-field" aria-label="九镜显影">
            {mirrorRooms.map((room) => (
              <span key={room} className={`mirror-silhouette ${room === todayReport.mirror.room ? "is-selected" : ""}`}>
                {room === todayReport.mirror.room ? room : ""}
              </span>
            ))}
          </div>
          <div className="act-copy">
            <p className="act-kicker">第四幕 · 九镜显影</p>
            <h2>
              你最容易进入：
              <span>{todayReport.mirror.name}</span>
            </h2>
            <p className="act-note">
              它不是你。
              <br />
              只是你最常进入的房间。
            </p>
          </div>
          <button type="button" className="act-scroll-cue" onClick={(event) => { event.stopPropagation(); scrollToAct(5) }}>
            展开七日
          </button>
        </section>

        <section
          className={`seeing-act act-seven-days ${isActVisible(5) ? "is-visible" : ""}`}
          data-act="5"
          onClick={() => scrollToAct(6)}
        >
          <div className="act-copy">
            <p className="act-kicker">第五幕 · 未来七日，只修这一念</p>
            <h2>
              未来七日，
              <br />
              只修这一念。
            </h2>
            <p className="act-note">今日起手：{thought.practice}</p>
          </div>
          <div className="seven-day-scroll" aria-label="未来七日修行安排">
            {sevenDayCultivation.map((practice, index) => (
              <div key={practice} className="practice-line" style={{ "--d": `${index * 90}ms` } as CSSProperties}>
                <span>Day{index + 1}</span>
                <p>{practice}</p>
              </div>
            ))}
          </div>
          <button type="button" className="act-scroll-cue" onClick={(event) => { event.stopPropagation(); scrollToAct(6) }}>
            启程
          </button>
        </section>

        <section className={`seeing-act act-departure ${isActVisible(6) ? "is-visible" : ""}`} data-act="6">
          <div className="zhao-seal-drop" aria-label="落印完成态">
            <YangmingZhaoSeal
              label="已照见"
              showLabel
              size="lg"
              title="已照见照字完成印"
              tone="cinnabar"
            />
          </div>
          <div className="act-copy">
            <p className="act-kicker">第六幕 · 启程</p>
            <h2>
              今日开始。
              <br />
              不与市场争。
              <br />
              先与自己见。
            </h2>
            <p className="liangzhi-note">
              致良知，不是消灭念头。
              <br />
              是念起时，知道是谁在下单。
            </p>
          </div>
          <div className="report-path-layers" aria-label="照见修行成长三层闭环">
            <p className="path-layers-title">照见 · 修行 · 成长</p>
            <div>
              <span>照见</span>
              <strong>今天先看见：「{growthTopThought}」</strong>
            </div>
            <div>
              <span>修行</span>
              <strong>{thought.practice}</strong>
            </div>
            <div>
              <span>成长</span>
              <strong>复照这一念，看它是否比昨天更轻。</strong>
            </div>
            <p className="path-layers-prompt">
              {growthPrompt}
              <br />
              这不是系统结构图，是你今天能带走的一条路。
            </p>
          </div>
          <div className="departure-actions">
            <PrimaryLink href="/assessment">进入今日照见</PrimaryLink>
            <SecondaryButton type="button" onClick={saveCurrentMirrorReport}>
              存入心镜档案
            </SecondaryButton>
            <SecondaryLink href="/mirror-archive">进入心镜档案</SecondaryLink>
            <SecondaryLink href="/mirror-scroll">展开心镜长卷</SecondaryLink>
          </div>
          <p className="archive-status" aria-live="polite">
            {savedMessage || (mirrorReportSaved ? "今日照见报告已入档。" : "落印后，可将此报告收入档案。")}
          </p>
        </section>

        <div className="report-evidence" aria-label="今日照见报告证据摘要">
          <span>照见第 {Math.max(1, thought.confirmationCount)} 念</span>
          <span>最近30天出现 {todayReport.occurrenceCount} 次</span>
          <span>{todayReport.recentMoments.join(" / ")}</span>
        </div>

        <ComplianceNote>
          本报告用于交易心理觉察，不构成投资建议；本系统不荐股、不喊单、不承诺收益。
        </ComplianceNote>
      </main>

      <style jsx>{`
        .seeing-report {
          position: relative;
          min-height: 100svh;
          height: 100svh;
          width: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior-y: contain;
          scroll-snap-type: y proximity;
          scrollbar-width: none;
          color: var(--ym-text-primary);
          background: var(--ym-bg-deep-lake);
          isolation: isolate;
        }

        .seeing-report::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .seeing-report::before,
        .seeing-report::after,
        .heart-lake-veil,
        .heart-lake-waterline {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .seeing-report::before {
          z-index: -4;
          background:
            radial-gradient(ellipse at 50% 18%, rgba(95, 132, 117, 0.16), transparent 44%),
            radial-gradient(ellipse at 50% 64%, rgba(12, 43, 48, 0.6), transparent 56%),
            linear-gradient(180deg, rgba(8, 16, 18, 0.92) 0%, rgba(6, 10, 10, 0.98) 62%, #030303 100%);
        }

        .seeing-report::after {
          z-index: -3;
          background:
            radial-gradient(ellipse at 50% 52%, rgba(216, 183, 111, 0.06), transparent 42%),
            radial-gradient(ellipse at 50% 78%, rgba(95, 132, 117, 0.12), transparent 54%);
          animation: ym-lake-breathe 7s ease-in-out infinite;
          opacity: 0.62;
        }

        .heart-lake-veil {
          z-index: -2;
          background:
            linear-gradient(180deg, rgba(2, 5, 5, 0.12) 0%, transparent 30%, rgba(3, 4, 3, 0.72) 100%),
            radial-gradient(ellipse at 50% 8%, rgba(244, 235, 221, 0.04), transparent 34%);
        }

        .heart-lake-waterline {
          top: 45%;
          z-index: -1;
          height: 55svh;
          background:
            repeating-linear-gradient(180deg, rgba(216, 183, 111, 0.026) 0 1px, transparent 1px 22px),
            radial-gradient(ellipse at 50% 8%, rgba(151, 190, 190, 0.1), transparent 58%),
            linear-gradient(180deg, rgba(95, 132, 117, 0.13), transparent 34%);
          filter: blur(0.4px);
          mask-image: linear-gradient(180deg, transparent, black 16%, black 80%, transparent);
          opacity: 0.62;
          transform-origin: center top;
          animation: ym-waterline-drift 12s ease-in-out infinite;
        }

        .seeing-act {
          position: relative;
          display: grid;
          min-height: 100svh;
          place-items: center;
          scroll-snap-align: start;
          padding: clamp(4rem, 8svh, 7rem) clamp(1.25rem, 6vw, 7rem);
          text-align: center;
        }

        .seeing-act::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(82vw, 62rem);
          aspect-ratio: 1 / 0.62;
          transform: translate(-50%, -50%) scale(0.96);
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(95, 132, 117, 0.09), transparent 68%);
          filter: blur(22px);
          opacity: 0;
          transition: opacity var(--ym-motion-fade-in) var(--ym-motion-ease-out), transform var(--ym-motion-fade-in) var(--ym-motion-ease-out);
          pointer-events: none;
        }

        .seeing-act.is-visible::before {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }

        .act-copy {
          position: relative;
          z-index: 2;
          max-width: min(74rem, calc(100vw - 2.5rem));
          opacity: 0;
          transform: translateY(22px);
          filter: blur(10px);
          transition:
            opacity var(--ym-motion-fade-in) var(--ym-motion-ease-out),
            transform var(--ym-motion-fade-in) var(--ym-motion-ease-out),
            filter var(--ym-motion-fade-in) var(--ym-motion-ease-out);
        }

        .seeing-act.is-visible .act-copy {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }

        .act-kicker,
        .trade-moment,
        .thought-lead {
          margin: 0 0 clamp(1.1rem, 2.4svh, 1.8rem);
          font-family: var(--font-function);
          font-size: clamp(0.72rem, 1vw, 0.9rem);
          font-weight: 700;
          letter-spacing: 0.26em;
          color: rgba(216, 183, 111, 0.68);
        }

        .trade-moment {
          color: rgba(216, 183, 111, 0.56);
        }

        .thought-lead {
          margin-top: -0.7rem;
          color: rgba(220, 212, 195, 0.5);
        }

        h1,
        h2 {
          margin: 0;
          font-family: var(--font-narrative);
          font-weight: 300;
          line-height: 1.26;
          letter-spacing: 0.07em;
          color: rgba(244, 235, 221, 0.9);
          text-shadow:
            0 0 34px rgba(216, 183, 111, 0.08),
            0 28px 80px rgba(0, 0, 0, 0.72);
        }

        h1 {
          font-size: clamp(3.1rem, 7.8vw, 8.6rem);
        }

        h2 {
          font-size: clamp(2.7rem, 6.2vw, 7.4rem);
        }

        h1 span,
        h2 span {
          display: block;
        }

        .core-thought {
          font-size: clamp(3.35rem, 9.4vw, 10.4rem);
          line-height: 1.12;
          animation: thought-float 5.8s ease-in-out infinite;
        }

        .act-note,
        .liangzhi-note {
          max-width: 48rem;
          margin: clamp(1.5rem, 3svh, 2.4rem) auto 0;
          font-family: var(--font-story);
          font-size: clamp(1rem, 1.4vw, 1.25rem);
          font-weight: 300;
          line-height: 2;
          letter-spacing: 0.08em;
          color: rgba(220, 212, 195, 0.52);
          text-wrap: pretty;
        }

        .liangzhi-note {
          color: rgba(220, 212, 195, 0.58);
        }

        .act-scroll-cue {
          position: absolute;
          left: 50%;
          bottom: clamp(1.4rem, 4svh, 3rem);
          z-index: 3;
          transform: translateX(-50%);
          border: 1px solid rgba(216, 183, 111, 0.2);
          border-radius: 999px;
          background: rgba(5, 5, 4, 0.32);
          padding: 0.72rem 1.15rem;
          font-family: var(--font-function);
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          color: rgba(216, 183, 111, 0.6);
          box-shadow: 0 18px 54px rgba(0, 0, 0, 0.34);
        }

        .still-breath,
        .thought-ripple,
        .thief-orbit,
        .my-seeing-ripple,
        .mirror-field,
        .zhao-seal-drop {
          pointer-events: none;
        }

        .still-breath {
          position: absolute;
          left: 50%;
          top: 55%;
          width: min(78vw, 55rem);
          aspect-ratio: 1 / 0.38;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(216, 183, 111, 0.08);
          border-radius: 50%;
          opacity: 0;
        }

        .act-still-water.is-visible .still-breath {
          animation: ym-lake-ripple 1600ms ease-out 1200ms both;
        }

        .thought-ripple {
          position: absolute;
          left: 50%;
          top: 56%;
          z-index: 1;
          width: min(78vw, 58rem);
          aspect-ratio: 1 / 0.42;
          transform: translate(-50%, -50%);
        }

        .thought-ripple i {
          position: absolute;
          inset: 8%;
          border: 1px solid rgba(216, 183, 111, 0.1);
          border-radius: 50%;
          opacity: 0;
        }

        .act-one-thought.is-visible .thought-ripple i {
          animation: ym-lake-ripple var(--ym-motion-ripple) ease-out both;
        }

        .act-one-thought.is-visible .thought-ripple i:nth-child(2) {
          animation-delay: 260ms;
        }

        .act-one-thought.is-visible .thought-ripple i:nth-child(3) {
          animation-delay: 520ms;
        }

        .thief-orbit {
          position: absolute;
          left: 50%;
          top: 55%;
          --thief-spread: 4.2rem;
          --thief-offset: 10.5rem;
          --thief-sink-spread: 3rem;
          --thief-sink-offset: 7.5rem;
          width: min(82vw, 48rem);
          height: min(42svh, 28rem);
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 900ms ease-out;
        }

        .thief-orbit::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 60%;
          width: min(64vw, 36rem);
          aspect-ratio: 1 / 0.34;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(216, 183, 111, 0.1);
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(216, 183, 111, 0.05), transparent 66%);
          filter: blur(1.2px);
          opacity: 0;
        }

        .act-heart-thief.is-visible .thief-orbit {
          opacity: 1;
        }

        .act-heart-thief.is-visible .thief-orbit::before {
          animation: ym-lake-ripple 1600ms ease-out 760ms both;
        }

        .thief-orbit span {
          position: absolute;
          left: 50%;
          top: 58%;
          transform: translate(-50%, -50%) translate(calc(var(--i) * var(--thief-spread) - var(--thief-offset)), 0);
          font-family: var(--font-narrative);
          font-size: clamp(2.4rem, 6vw, 5.2rem);
          color: rgba(220, 212, 195, 0.16);
          filter: blur(1.6px);
          opacity: 0;
        }

        .act-heart-thief.is-visible .thief-orbit span {
          animation: thief-sink 1800ms cubic-bezier(0.22, 1, 0.36, 1) var(--thief-delay) both;
        }

        .act-heart-thief.is-visible .thief-orbit span.is-primary {
          color: rgba(179, 76, 56, 0.72);
          filter: blur(0);
          animation:
            current-thief-rise 1900ms cubic-bezier(0.22, 1, 0.36, 1) 160ms both,
            current-thief-glow 4200ms ease-in-out 1900ms infinite;
          text-shadow:
            0 0 34px rgba(179, 76, 56, 0.34),
            0 0 54px rgba(216, 183, 111, 0.14);
        }

        .act-heart-thief h2 strong {
          color: rgba(179, 76, 56, 0.82);
          font-weight: 300;
          text-shadow: 0 0 36px rgba(179, 76, 56, 0.34);
        }

        .act-my-seeing .act-copy {
          max-width: min(66rem, calc(100vw - 2rem));
        }

        .my-seeing-ripple {
          position: absolute;
          left: 50%;
          top: 57%;
          z-index: 1;
          width: min(72vw, 48rem);
          aspect-ratio: 1 / 0.42;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(216, 183, 111, 0.1);
          border-radius: 50%;
          opacity: 0;
        }

        .act-my-seeing.is-visible .my-seeing-ripple {
          animation: ym-lake-ripple 1500ms ease-out 320ms both;
        }

        .my-seeing-copy h2 {
          color: rgba(244, 235, 221, 0.78);
          font-size: clamp(2.7rem, 5.8vw, 6.2rem);
        }

        .my-seeing-line {
          position: relative;
          width: min(54rem, 100%);
          margin: clamp(1.4rem, 3svh, 2.4rem) auto 0;
          border-top: 1px solid rgba(216, 183, 111, 0.18);
          border-bottom: 1px solid rgba(216, 183, 111, 0.1);
          padding: clamp(1rem, 2.6svh, 1.5rem) 0;
          color: rgba(242, 235, 220, 0.72);
          font-family: var(--font-story);
          font-size: clamp(1.25rem, 2.4vw, 2rem);
          font-weight: 300;
          line-height: 1.8;
          letter-spacing: 0.08em;
          text-align: left;
          text-wrap: pretty;
        }

        .my-seeing-line::before {
          content: "";
          position: absolute;
          left: 50%;
          top: -1px;
          width: 0;
          height: 1px;
          transform: translateX(-50%);
          background: rgba(216, 183, 111, 0.52);
        }

        .act-my-seeing.is-visible .my-seeing-line::before {
          animation: seeing-line-open 900ms ease-out 420ms both;
        }

        .mirror-field {
          position: absolute;
          left: 50%;
          top: 55%;
          z-index: 1;
          width: min(86vw, 68rem);
          aspect-ratio: 1 / 0.56;
          transform: translate(-50%, -50%);
        }

        .mirror-silhouette {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(58vw, 30rem);
          aspect-ratio: 1 / 0.42;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(216, 183, 111, 0.08);
          border-radius: 50%;
          opacity: 0.18;
          filter: blur(1.2px);
        }

        .mirror-silhouette:nth-child(2) { transform: translate(-56%, -46%) scale(0.86); }
        .mirror-silhouette:nth-child(3) { transform: translate(-44%, -54%) scale(0.76); }
        .mirror-silhouette:nth-child(4) { transform: translate(-60%, -58%) scale(0.64); }
        .mirror-silhouette:nth-child(5) { transform: translate(-40%, -42%) scale(0.62); }
        .mirror-silhouette:nth-child(6) { transform: translate(-51%, -50%) scale(0.54); }
        .mirror-silhouette:nth-child(7) { transform: translate(-62%, -38%) scale(0.48); }
        .mirror-silhouette:nth-child(8) { transform: translate(-38%, -62%) scale(0.46); }
        .mirror-silhouette:nth-child(9) { transform: translate(-50%, -50%) scale(0.38); }

        .mirror-silhouette.is-selected {
          display: grid;
          place-items: center;
          border-color: rgba(216, 183, 111, 0.26);
          background:
            radial-gradient(ellipse at 50% 42%, rgba(216, 183, 111, 0.08), transparent 58%),
            rgba(244, 235, 221, 0.016);
          color: rgba(216, 183, 111, 0.5);
          font-family: var(--font-story);
          font-size: clamp(0.8rem, 1.2vw, 1rem);
          letter-spacing: 0.28em;
          opacity: 1;
          filter: blur(0);
          box-shadow:
            0 0 80px rgba(216, 183, 111, 0.09),
            inset 0 0 44px rgba(216, 183, 111, 0.04);
          animation: mirror-reveal 1400ms ease-out both;
        }

        .act-nine-mirror h2 span {
          margin-top: 0.4rem;
          color: rgba(216, 183, 111, 0.82);
        }

        .seven-day-scroll {
          position: relative;
          z-index: 2;
          display: grid;
          width: min(68rem, calc(100vw - 2rem));
          gap: 0;
          margin-top: clamp(2.4rem, 5svh, 4.2rem);
          border-top: 1px solid rgba(216, 183, 111, 0.16);
          border-bottom: 1px solid rgba(216, 183, 111, 0.16);
          transform-origin: top center;
          opacity: 0;
          transform: scaleY(0.92);
          transition:
            opacity 900ms ease-out,
            transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .act-seven-days.is-visible .seven-day-scroll {
          opacity: 1;
          transform: scaleY(1);
        }

        .practice-line {
          display: grid;
          grid-template-columns: minmax(4.6rem, 7rem) 1fr;
          gap: clamp(1rem, 3vw, 2rem);
          align-items: center;
          border-top: 1px solid rgba(216, 183, 111, 0.09);
          padding: clamp(0.85rem, 1.8svh, 1.2rem) 0;
          opacity: 0;
          transform: translateY(12px);
        }

        .practice-line:first-child {
          border-top: 0;
        }

        .act-seven-days.is-visible .practice-line {
          animation: scroll-line-in 700ms ease-out var(--d) both;
        }

        .practice-line span {
          font-family: var(--font-function);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.24em;
          color: rgba(216, 183, 111, 0.6);
          text-align: right;
        }

        .practice-line p {
          margin: 0;
          font-family: var(--font-story);
          font-size: clamp(1.1rem, 2.1vw, 1.6rem);
          font-weight: 300;
          line-height: 1.7;
          letter-spacing: 0.08em;
          color: rgba(242, 235, 220, 0.74);
          text-align: left;
        }

        .zhao-seal-drop {
          position: absolute;
          left: 50%;
          top: clamp(15%, 18svh, 22%);
          z-index: 3;
          transform: translate(-50%, -50%) rotate(-9deg) scale(0.86);
          opacity: 0;
        }

        .act-departure.is-visible .zhao-seal-drop {
          animation: ym-seal-drop var(--ym-motion-seal-drop) var(--ym-motion-spring) 260ms both;
        }

        .report-path-layers {
          position: relative;
          z-index: 4;
          display: grid;
          width: min(52rem, calc(100vw - 2rem));
          gap: 0;
          margin-top: clamp(1.6rem, 3.8svh, 2.8rem);
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          border-bottom: 1px solid rgba(216, 183, 111, 0.08);
          padding: 1.1rem 0 0.9rem;
          opacity: 0;
          transform: translateY(18px);
          transition:
            opacity 700ms ease-out 360ms,
            transform 700ms ease-out 360ms;
        }

        .act-departure.is-visible .report-path-layers {
          opacity: 1;
          transform: translateY(0);
        }

        .path-layers-title {
          margin: 0 0 0.8rem;
          font-family: var(--font-function);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.24em;
          color: rgba(216, 183, 111, 0.62);
        }

        .report-path-layers div {
          display: grid;
          grid-template-columns: minmax(5.2rem, 0.24fr) minmax(0, 1fr);
          gap: 1rem;
          align-items: baseline;
          border-top: 1px solid rgba(216, 183, 111, 0.075);
          padding: 0.72rem 0;
          text-align: left;
        }

        .report-path-layers span {
          font-family: var(--font-function);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: rgba(216, 183, 111, 0.64);
        }

        .report-path-layers strong {
          min-width: 0;
          color: rgba(242, 235, 220, 0.78);
          font-family: var(--font-story);
          font-size: clamp(1rem, 1.7vw, 1.24rem);
          font-weight: 300;
          line-height: 1.7;
          letter-spacing: 0.06em;
        }

        .path-layers-prompt {
          margin: 0.75rem 0 0;
          white-space: pre-line;
          color: rgba(220, 212, 195, 0.48);
          font-family: var(--font-story);
          font-size: clamp(0.98rem, 1.6vw, 1.2rem);
          font-weight: 300;
          line-height: 1.8;
          letter-spacing: 0.08em;
        }

        .departure-actions {
          position: relative;
          z-index: 4;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          width: min(68rem, calc(100vw - 2rem));
          gap: 0.9rem;
          margin-top: clamp(2.2rem, 5svh, 4rem);
          opacity: 0;
          transform: translateY(18px);
          transition:
            opacity 700ms ease-out 480ms,
            transform 700ms ease-out 480ms;
        }

        .act-departure.is-visible .departure-actions {
          opacity: 1;
          transform: translateY(0);
        }

        .departure-actions :global(a),
        .departure-actions :global(button) {
          min-height: 3.55rem;
          border-radius: 999px;
          font-size: 0.88rem;
          letter-spacing: 0.12em;
        }

        .archive-status {
          position: relative;
          z-index: 4;
          margin: 1rem 0 0;
          font-family: var(--font-function);
          font-size: 0.76rem;
          letter-spacing: 0.12em;
          color: rgba(220, 212, 195, 0.4);
        }

        .report-evidence {
          position: fixed;
          right: clamp(1rem, 3vw, 2rem);
          bottom: clamp(1rem, 3vw, 2rem);
          z-index: 8;
          display: grid;
          max-width: min(28rem, calc(100vw - 2rem));
          gap: 0.38rem;
          border: 1px solid rgba(216, 183, 111, 0.12);
          border-radius: 999px;
          background: rgba(5, 5, 4, 0.34);
          padding: 0.72rem 1rem;
          font-family: var(--font-function);
          font-size: 0.7rem;
          line-height: 1.55;
          letter-spacing: 0.1em;
          color: rgba(220, 212, 195, 0.42);
          backdrop-filter: blur(18px);
        }

        .report-evidence span:first-child {
          color: rgba(216, 183, 111, 0.65);
        }

        .seeing-report :global(.compliance-note) {
          position: relative;
          z-index: 4;
          width: min(72rem, calc(100vw - 2rem));
          margin: -4rem auto 2rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.018);
        }

        @media (max-width: 860px) {
          .seeing-act {
            min-height: 100svh;
            padding: clamp(4.5rem, 10svh, 6rem) 1.15rem;
          }

          h1 {
            font-size: clamp(2.25rem, 9.6vw, 4.4rem);
            line-height: 1.42;
          }

          h2 {
            font-size: clamp(2.1rem, 9.2vw, 4.2rem);
            line-height: 1.36;
          }

          .core-thought {
            font-size: clamp(2.7rem, 11vw, 5rem);
            line-height: 1.24;
          }

          .act-note,
          .liangzhi-note {
            font-size: 0.95rem;
            line-height: 1.9;
          }

          .thief-orbit {
            --thief-spread: 2.4rem;
            --thief-offset: 6rem;
            --thief-sink-spread: 1.8rem;
            --thief-sink-offset: 4.5rem;
            width: min(92vw, 26rem);
            height: 18rem;
          }

          .thief-orbit span {
            transform: translate(-50%, -50%) translate(calc(var(--i) * var(--thief-spread) - var(--thief-offset)), 0);
          }

          .seven-day-scroll {
            width: min(100%, 34rem);
          }

          .practice-line {
            grid-template-columns: 4.4rem 1fr;
          }

          .practice-line span {
            font-size: 0.66rem;
          }

          .practice-line p {
            font-size: 1rem;
          }

          .report-path-layers div {
            grid-template-columns: 1fr;
            gap: 0.2rem;
            text-align: center;
          }

          .departure-actions {
            grid-template-columns: 1fr;
            width: min(100%, 28rem);
          }

          .report-evidence {
            position: absolute;
            left: 50%;
            right: auto;
            bottom: 1rem;
            transform: translateX(-50%);
            border-radius: 1rem;
            text-align: center;
          }

          .seeing-report :global(.compliance-note) {
            margin-top: -2rem;
            border-radius: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .seeing-report *,
          .seeing-report *::before,
          .seeing-report *::after {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 1ms !important;
          }
        }

        @keyframes thought-float {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-0.42rem);
          }
        }

        @keyframes thief-sink {
          0% {
            opacity: 0.34;
            transform: translate(-50%, -50%) translate(calc(var(--i) * var(--thief-spread) - var(--thief-offset)), -0.5rem);
            filter: blur(1px);
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(calc(var(--i) * var(--thief-sink-spread) - var(--thief-sink-offset)), 8rem);
            filter: blur(10px);
          }
        }

        @keyframes current-thief-rise {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(8rem) scale(0.72);
            filter: blur(14px);
          }

          58% {
            opacity: 0.82;
            transform: translate(-50%, -50%) translateY(-0.35rem) scale(1.04);
            filter: blur(0.8px);
          }

          100% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes current-thief-glow {
          0%,
          100% {
            text-shadow:
              0 0 30px rgba(179, 76, 56, 0.28),
              0 0 52px rgba(216, 183, 111, 0.12);
          }

          50% {
            text-shadow:
              0 0 44px rgba(179, 76, 56, 0.44),
              0 0 74px rgba(216, 183, 111, 0.18);
          }
        }

        @keyframes seeing-line-open {
          from {
            width: 0;
          }

          to {
            width: 100%;
          }
        }

        @keyframes mirror-reveal {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.72);
            filter: blur(12px);
          }

          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            filter: blur(0);
          }
        }

        @keyframes scroll-line-in {
          from {
            opacity: 0;
            transform: translateY(12px);
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
