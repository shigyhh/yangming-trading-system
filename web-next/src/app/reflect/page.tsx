"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import {
  createOneThoughtRecord,
  getTodayOneThoughtDateKey,
  matchUserThought,
  oneThoughtPool,
  readStableTodayOneThought,
  type OneThoughtInsightRecord,
} from "@/data/insight-engine/today-one-thought"
import { AssessmentShell, PrimaryButton } from "@/features/assessment/components"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  ONE_THOUGHT_RITUAL_NAME,
  ONE_THOUGHT_RITUAL_VERSION,
  PRIVATE_REFLECTION_VERSION,
  type ActualAction,
  type OneThoughtEvent,
  type OneThoughtReaction,
} from "@/lib/mind-archive/types"
import {
  createOneThoughtEvent,
  getOneThoughtEvent,
  updateOneThoughtEventFinalAction,
  updateOneThoughtEvent,
} from "@/lib/mind-archive/oneThoughtEventRepository"
import { createReflectionKey, getReflection } from "@/lib/reflections/reflectionService"
import {
  getTodayInsightRecord,
  markReflectEntered,
  saveInsightRecord,
} from "@/lib/user-flow/visitor-state"

function findMatchedThought(match: ReturnType<typeof matchUserThought>) {
  return (
    oneThoughtPool.find((thought) => thought.thoughtId === match.matchedThoughtId) ??
    oneThoughtPool.find((thought) => thought.sceneId === match.matchedSceneId) ??
    oneThoughtPool[0]
  )
}

function splitReflection(value: string) {
  const normalized = value.trim()
  if (!normalized) return ["", ""]

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length >= 2) return [lines[0], lines.slice(1).join("\n")]

  const parts = normalized.split(/(?<=[。？！.!?])/).map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) return [parts[0], parts.slice(1).join("")]

  return ["这一念先浮了出来。", normalized]
}

function getFinalReflectionForRecord(record: OneThoughtInsightRecord) {
  return getReflection(record.sceneId, record.thoughtId)
}

function getStrictReflectionFinal(record: OneThoughtInsightRecord | null) {
  if (!record) return ""
  return getFinalReflectionForRecord(record)?.reflectionFinal ?? ""
}

function ReflectPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sealTimerRef = useRef<number | null>(null)
  const [inputText, setInputText] = useState("")
  const [activeRecord, setActiveRecord] = useState<OneThoughtInsightRecord | null>(null)
  const [activeEvent, setActiveEvent] = useState<OneThoughtEvent | null>(null)
  const [showDraft, setShowDraft] = useState(false)
  const [notice, setNotice] = useState("")
  const [eventNotice, setEventNotice] = useState("")

  const entry = searchParams.get("entry")
  const isFreshEntry = searchParams.get("fresh") === "1" || searchParams.get("dev") === "1"
  const shouldReadStoredRecord =
    !isFreshEntry && (searchParams.get("showCompleted") === "1" || searchParams.get("resume") === "1")

  useEffect(() => {
    const timer = window.setTimeout(() => {
      markReflectEntered()
      const todayRecord = shouldReadStoredRecord ? getTodayInsightRecord() : null
      const lakeText = searchParams.get("source") === "lake" ? searchParams.get("text")?.trim() : ""

      if (lakeText && !todayRecord?.completed) {
        createDraftFromText(lakeText, "lake")
        return
      }

      setActiveRecord(todayRecord)
      setActiveEvent(null)
      setShowDraft(false)
      setNotice("")
      setEventNotice("")
    }, 0)

    return () => {
      window.clearTimeout(timer)
      if (sealTimerRef.current) window.clearTimeout(sealTimerRef.current)
    }
  }, [entry, searchParams, shouldReadStoredRecord])

  const reflectionLines = useMemo(
    () => splitReflection(getStrictReflectionFinal(activeRecord)),
    [activeRecord],
  )

  function refreshToday(record?: OneThoughtInsightRecord | null) {
    setActiveRecord(record ?? (shouldReadStoredRecord ? getTodayInsightRecord() : null))
  }

  function normalizePainLevel(value: unknown): OneThoughtEvent["painLevel"] {
    const numberValue = Number(value)
    if (numberValue === 1 || numberValue === 2 || numberValue === 3 || numberValue === 4 || numberValue === 5) {
      return numberValue
    }
    return 3
  }

  function prepareOneThoughtEvent(record: OneThoughtInsightRecord) {
    const finalEntry = getFinalReflectionForRecord(record)
    if (!finalEntry?.reflectionFinal) {
      setEventNotice("此念暂未接入最终照回源，请稍后再试。")
      return null
    }

    const now = new Date().toISOString()
    const itemId = record.thoughtId
    const eventId = `one_thought_event_${record.recordId}`
    const existingEvent = getOneThoughtEvent(eventId)

    // MVP: reflectionFinal 一进入私人照见页就标记为已看见；后续可升级成 dwell time / IntersectionObserver。
    const event = createOneThoughtEvent({
      id: eventId,
      userId: DEFAULT_MIND_ARCHIVE_USER_ID,
      sceneId: record.sceneId,
      itemId,
      key: createReflectionKey(record.sceneId, itemId),
      tradeMoment: finalEntry?.tradeMoment || record.tradeMoment,
      os: finalEntry?.os || record.os,
      reflectionFinal: finalEntry.reflectionFinal,
      finalSource: finalEntry.finalSource,
      painLevel: normalizePainLevel(finalEntry?.painLevel),
      painPoint: finalEntry?.painPoint || undefined,
      heartThief: record.thief,
      reflectionVersion: PRIVATE_REFLECTION_VERSION,
      ritualName: ONE_THOUGHT_RITUAL_NAME,
      ritualVersion: ONE_THOUGHT_RITUAL_VERSION,
      ritualStatus: existingEvent?.ritualStatus || "draft",
      reflectionShownAt: existingEvent?.reflectionShownAt || now,
      reflectionSeen: true,
      reflectionSeenAt: existingEvent?.reflectionSeenAt || now,
      userReaction: existingEvent?.userReaction,
      userReactionAt: existingEvent?.userReactionAt,
      intendedAction: existingEvent?.intendedAction,
      actualAction: existingEvent?.actualAction,
      tradeId: existingEvent?.tradeId,
      tradeReviewId: existingEvent?.tradeReviewId,
      reviewStatus: existingEvent?.reviewStatus,
      source: record.source === "lake" ? "saved_from_public_lake" : "one_thought_ritual",
      createdAt: existingEvent?.createdAt,
      updatedAt: existingEvent?.updatedAt,
    })

    setActiveEvent(event)
    return event
  }

  function createDraftFromText(
    text: string,
    source: OneThoughtInsightRecord["source"] = "user_input",
  ) {
    const cleanedInput = text.trim()
    if (!cleanedInput) return

    const match = matchUserThought(cleanedInput)
    const thought = findMatchedThought(match)
    const finalEntry = getReflection(match.matchedSceneId, thought.itemId)
    if (!finalEntry?.reflectionFinal) {
      setNotice("此念暂未接入最终照回源，请稍后再试。")
      return
    }

    const dateKey = getTodayOneThoughtDateKey(new Date())
    const reflectionFinal = finalEntry.reflectionFinal
    const record = createOneThoughtRecord(thought, {
      recordId: `one_thought_${dateKey}_draft`,
      date: dateKey,
      inputText: cleanedInput,
      source,
      mirrorName: match.matchedMirrorName,
      reflection: reflectionFinal,
      reflectionFinal: reflectionFinal,
      evidence: match.suggestedEvidence,
      practice: match.suggestedPractice,
      completed: false,
      summary: `${match.matchedSceneName}｜${match.matchedThief}`,
    })

    saveInsightRecord(record)
    setInputText("")
    setShowDraft(true)
    setEventNotice("")
    prepareOneThoughtEvent(record)
    refreshToday(record)
  }

  function createDraftFromInput() {
    if (!inputText.trim()) return
    createDraftFromText(inputText, "user_input")
  }

  function handleUseDailyThought() {
    try {
      const thought = readStableTodayOneThought()
      const finalEntry = getReflection(thought.sceneId, thought.itemId)
      if (!finalEntry?.reflectionFinal) {
        setNotice("此念暂未接入最终照回源，请稍后再试。")
        return
      }

      const dateKey = getTodayOneThoughtDateKey(new Date())
      const reflectionFinal = finalEntry.reflectionFinal
      const record = createOneThoughtRecord(thought, {
        recordId: `one_thought_${dateKey}_draft`,
        date: dateKey,
        inputText: thought.os,
        source: "daily_engine",
        reflection: reflectionFinal,
        reflectionFinal: reflectionFinal,
        evidence: thought.evidence,
        practice: thought.practice,
        completed: false,
        summary: `${thought.sceneName}｜${thought.thief}`,
      })

      saveInsightRecord(record)
      setInputText("")
      setShowDraft(true)
      setNotice("")
      setEventNotice("")
      prepareOneThoughtEvent(record)
      refreshToday(record)
    } catch (error) {
      console.warn("今日一念暂未生成", error)
      setNotice("今日一念暂未生成，请稍后再试。")
    }
  }

  function restartTodayDraft() {
    setInputText("")
    setShowDraft(false)
    setNotice("")
    setEventNotice("")
    setActiveEvent(null)
    setActiveRecord(null)
  }

  function sealActiveRecord() {
    if (!activeRecord || activeRecord.completed) return

    const sealedRecord: OneThoughtInsightRecord = {
      ...activeRecord,
      completed: true,
      sealedAt: new Date().toISOString(),
      summary: activeRecord.summary || `${activeRecord.sceneName}｜${activeRecord.thief}`,
    }

    saveInsightRecord(sealedRecord)
    if (activeEvent) {
      const sealedAt = sealedRecord.sealedAt || new Date().toISOString()
      const updated = updateOneThoughtEvent(activeEvent.id, {
        ritualStatus: "sealed",
        ritualName: ONE_THOUGHT_RITUAL_NAME,
        ritualVersion: ONE_THOUGHT_RITUAL_VERSION,
        sealStage: {
          ...(activeEvent.sealStage || {}),
          sealedAt,
        },
        reviewStatus: activeEvent.reviewStatus || "none",
      })
      if (updated) setActiveEvent(updated)
    }
    setShowDraft(false)
    refreshToday(sealedRecord)
  }

  function ensureActiveEvent() {
    if (!draftRecord) return null
    return activeEvent ?? prepareOneThoughtEvent(draftRecord)
  }

  function handleReaction(reaction: OneThoughtReaction) {
    const event = ensureActiveEvent()
    if (!event) return

    const updated = updateOneThoughtEvent(event.id, {
      userReaction: reaction,
      userReactionAt: new Date().toISOString(),
    })
    if (!updated) return

    setActiveEvent(updated)
    const messageByReaction: Record<OneThoughtReaction, string> = {
      seen: "照见了，已入一念档案。",
      not_hit: "没照到，也记下这一念。",
      stopped: "愿止一念，今日功夫记下了。",
      still_moving: "心还在动，也记下，不必骗自己。",
    }
    setEventNotice(messageByReaction[reaction])
  }

  function handleActualAction(actualAction: ActualAction) {
    const event = ensureActiveEvent()
    if (!event) return

    const updated = updateOneThoughtEventFinalAction(event.id, actualAction)
    if (updated) setActiveEvent(updated)

    if (actualAction === "traded") {
      router.push(`/review?linkedOneThoughtEventId=${encodeURIComponent(event.id)}`)
      return
    }

    const messageByAction: Partial<Record<ActualAction, string>> = {
      paused: "停住了，这一念已经记入档案。",
      watched: "观望了，心没有急着跟出去。",
      unknown: "稍后再记，档案先留住这一念。",
    }
    setEventNotice(messageByAction[actualAction] || "这一念已经记下。")
  }

  function startSealHold() {
    if (sealTimerRef.current) window.clearTimeout(sealTimerRef.current)
    sealTimerRef.current = window.setTimeout(sealActiveRecord, 960)
  }

  function stopSealHold() {
    if (!sealTimerRef.current) return
    window.clearTimeout(sealTimerRef.current)
    sealTimerRef.current = null
  }

  const todayStatus = "not_started"
  const completedRecord = activeRecord?.completed ? activeRecord : null
  const draftRecord = activeRecord && !activeRecord.completed ? activeRecord : null

  return (
    <AssessmentShell background="home-water" contentWidth="wide">
      <main className="reflect-main" data-entry={entry || "today"}>
        {completedRecord ? (
          <section className="reflect-panel reflect-summary" aria-live="polite">
            <p className="reflect-kicker">今日照见已落印</p>
            <h1>今日照见已落印</h1>
            <dl>
              <div>
                <dt>本次一念</dt>
                <dd>「{completedRecord.os}」</dd>
              </div>
              <div>
                <dt>照回</dt>
                <dd>{getStrictReflectionFinal(completedRecord)}</dd>
              </div>
              <div>
                <dt>心贼</dt>
                <dd>{completedRecord.thief}</dd>
              </div>
              <div>
                <dt>镜中显影</dt>
                <dd>{completedRecord.mirrorName}</dd>
              </div>
              <div>
                <dt>今日心证</dt>
                <dd>{completedRecord.evidence}</dd>
              </div>
              <div>
                <dt>今日修行</dt>
                <dd>{completedRecord.practice}</dd>
              </div>
            </dl>
            <div className="reflect-actions">
              <PrimaryButton type="button" onClick={() => router.push("/reflect?entry=today")}>
                明日再照
              </PrimaryButton>
              <button type="button" onClick={() => router.push("/scroll")}>
                查看心镜长卷
              </button>
              <button type="button" onClick={() => router.push("/mind-archive")}>
                查看心镜档案
              </button>
            </div>
          </section>
        ) : draftRecord && !showDraft ? (
          <section className="reflect-panel reflect-gate" aria-live="polite">
            <p className="reflect-kicker">今日照见</p>
            <h1>上一念尚未落印。</h1>
            <p>「{draftRecord.inputText || draftRecord.os}」</p>
            <div className="reflect-actions">
              <PrimaryButton type="button" onClick={() => {
                setShowDraft(true)
                prepareOneThoughtEvent(draftRecord)
              }}>
                继续上一次照见
              </PrimaryButton>
              <button type="button" onClick={restartTodayDraft}>
                重新开始
              </button>
            </div>
          </section>
        ) : draftRecord ? (
          <section className="reflect-panel reflect-flow" aria-live="polite">
            <p className="reflect-kicker">照回</p>
            <h1>「{draftRecord.os}」</h1>
            <div className="reflection-two-step">
              <p>{reflectionLines[0]}</p>
              <strong>{reflectionLines[1]}</strong>
            </div>
            <p className="thief-line">这一念里，最重的是：<span>{draftRecord.thief}</span></p>
            <div className="proof-grid">
              <div>
                <span>镜中显影</span>
                <p>{draftRecord.mirrorName}</p>
              </div>
              <div>
                <span>今日心证</span>
                <p>{draftRecord.evidence}</p>
              </div>
              <div>
                <span>今日修行</span>
                <p>{draftRecord.practice}</p>
              </div>
            </div>
            <section className="reflection-feedback" aria-label="照回反馈">
              <p>这一照，刺到哪里？</p>
              <div>
                <button type="button" onClick={() => handleReaction("seen")}>
                  照见了
                </button>
                <button type="button" onClick={() => handleReaction("not_hit")}>
                  没照到
                </button>
                <button type="button" onClick={() => handleReaction("stopped")}>
                  愿止一念
                </button>
                <button type="button" onClick={() => handleReaction("still_moving")}>
                  心还在动
                </button>
              </div>
            </section>
            {activeEvent?.userReaction ? (
              <section className="after-action" aria-label="后续动作">
                <p>最后你怎么做？</p>
                <div>
                  <button type="button" onClick={() => handleActualAction("paused")}>
                    停住了
                  </button>
                  <button type="button" onClick={() => handleActualAction("watched")}>
                    观望了
                  </button>
                  <button type="button" onClick={() => handleActualAction("traded")}>
                    还是交易了
                  </button>
                  <button type="button" onClick={() => handleActualAction("unknown")}>
                    稍后再记
                  </button>
                </div>
              </section>
            ) : null}
            {eventNotice ? <p className="reflect-notice">{eventNotice}</p> : null}
            <PrimaryButton
              type="button"
              onMouseDown={startSealHold}
              onMouseUp={stopSealHold}
              onMouseLeave={stopSealHold}
              onTouchStart={startSealHold}
              onTouchEnd={stopSealHold}
            >
              长按放下，落印
            </PrimaryButton>
            <p className="reflect-note">长按后才写入心镜档案与心镜长卷。</p>
          </section>
        ) : (
          <section className="reflect-panel reflect-input" aria-live="polite">
            <p className="reflect-kicker">{todayStatus === "not_started" ? "今日照见" : "入照心"}</p>
            <h1>
              今天，
              <br />
              你起了哪一念？
            </h1>
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder={"比如：再等等。\n比如：回本我就走。\n比如：卖完就涨。"}
              rows={3}
            />
            {notice ? <p className="reflect-notice">{notice}</p> : null}
            <div className="reflect-actions">
              <PrimaryButton type="button" onClick={createDraftFromInput} disabled={!inputText.trim()}>
                照见此念
              </PrimaryButton>
              <button type="button" onClick={handleUseDailyThought}>
                照见今日一念
              </button>
            </div>
          </section>
        )}
      </main>

      <style jsx>{`
        .reflect-main {
          display: flex;
          min-height: calc(100svh - 4rem);
          width: min(100%, 1120px);
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          padding: clamp(36px, 8svh, 88px) 18px;
          color: rgba(244, 235, 221, 0.94);
          text-align: center;
        }

        .reflect-panel {
          width: min(100%, 760px);
        }

        .reflect-kicker {
          margin: 0 0 20px;
          color: rgba(216, 183, 111, 0.62);
          font-size: 14px;
          letter-spacing: 0.24em;
        }

        h1 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(44px, 6vw, 82px);
          font-weight: 400;
          line-height: 1.22;
          letter-spacing: 0;
        }

        textarea {
          width: min(100%, 680px);
          min-height: 126px;
          margin: clamp(34px, 6svh, 58px) auto 28px;
          resize: vertical;
          border: 1px solid rgba(216, 183, 111, 0.34);
          border-radius: 28px;
          background: rgba(8, 8, 7, 0.34);
          box-shadow: inset 0 0 38px rgba(216, 183, 111, 0.05);
          color: rgba(244, 235, 221, 0.94);
          font-size: clamp(20px, 2vw, 28px);
          line-height: 1.7;
          outline: none;
          padding: 28px 34px;
          text-align: center;
        }

        textarea::placeholder {
          color: rgba(244, 235, 221, 0.34);
        }

        .reflect-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: center;
        }

        button {
          cursor: pointer;
          border: 0;
          border-bottom: 1px solid rgba(216, 183, 111, 0.42);
          background: transparent;
          color: rgba(216, 183, 111, 0.92);
          font-size: 18px;
          letter-spacing: 0.12em;
          padding: 12px 4px;
        }

        .reflection-two-step {
          margin: clamp(32px, 6svh, 56px) auto;
          font-family: var(--font-serif);
          font-size: clamp(28px, 3.4vw, 48px);
          line-height: 1.72;
        }

        .reflection-two-step p {
          margin: 0 0 12px;
          color: rgba(244, 235, 221, 0.88);
        }

        .reflection-two-step strong {
          color: rgba(216, 183, 111, 0.98);
          font-weight: 400;
          white-space: pre-line;
        }

        .thief-line {
          margin: 0 0 30px;
          color: rgba(244, 235, 221, 0.66);
          font-size: clamp(20px, 2vw, 28px);
        }

        .thief-line span {
          color: rgba(216, 183, 111, 0.96);
        }

        .proof-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin: 0 auto 32px;
          text-align: left;
        }

        .reflection-feedback,
        .after-action {
          margin: 0 auto 28px;
          border-top: 1px solid rgba(216, 183, 111, 0.16);
          padding-top: 20px;
        }

        .reflection-feedback p,
        .after-action p {
          margin: 0 0 14px;
          color: rgba(244, 235, 221, 0.48);
          font-size: 14px;
          letter-spacing: 0.16em;
        }

        .reflection-feedback div,
        .after-action div {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }

        .reflection-feedback button,
        .after-action button {
          border: 1px solid rgba(216, 183, 111, 0.22);
          border-radius: 999px;
          background: rgba(8, 8, 7, 0.22);
          color: rgba(244, 235, 221, 0.74);
          font-size: 15px;
          letter-spacing: 0.08em;
          padding: 10px 16px;
        }

        .proof-grid div {
          border-top: 1px solid rgba(216, 183, 111, 0.18);
          padding-top: 16px;
        }

        .proof-grid span,
        dt {
          color: rgba(216, 183, 111, 0.58);
          font-size: 13px;
          letter-spacing: 0.16em;
        }

        .proof-grid p,
        dd {
          margin: 8px 0 0;
          color: rgba(244, 235, 221, 0.78);
          font-size: 16px;
          line-height: 1.8;
        }

        dl {
          display: grid;
          gap: 18px;
          margin: 34px auto;
          text-align: left;
        }

        dl div {
          border-top: 1px solid rgba(216, 183, 111, 0.16);
          padding-top: 16px;
        }

        .reflect-note {
          margin: 18px 0 0;
          color: rgba(244, 235, 221, 0.38);
        }

        .reflect-notice {
          margin: 0 0 18px;
          color: rgba(244, 235, 221, 0.48);
          font-size: 14px;
          letter-spacing: 0.08em;
        }

        @media (max-width: 720px) {
          .reflect-main {
            padding-inline: 20px;
          }

          .proof-grid {
            grid-template-columns: 1fr;
          }

          .reflect-actions {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </AssessmentShell>
  )
}

export default function ReflectPage() {
  return (
    <Suspense fallback={null}>
      <ReflectPageContent />
    </Suspense>
  )
}
