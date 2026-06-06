"use client"

import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  createOneThoughtRecord,
  matchUserThought,
  oneThoughtPool,
  saveOneThoughtRecord,
} from "@/data/insight-engine/today-one-thought"
import {
  createOneThoughtLakeComment,
  createOneThoughtLakeEntryFromMatch,
  getOneThoughtLakeStats,
  readOneThoughtLakeComments,
  readOneThoughtLakeEntries,
  resonateWithOneThoughtLakeEntry,
  saveOneThoughtLakeComment,
  saveOneThoughtLakeEntry,
  screenOneThoughtLakeInput,
  type OneThoughtLakeComment,
  type OneThoughtLakeEntry,
} from "@/features/one-thought-lake/oneThoughtLakeEngine"
import { ThoughtField } from "@/features/one-thought-lake/visual/ThoughtField"

const anonymousColors = [
  "rgba(216, 183, 111, 0.92)",
  "rgba(120, 185, 164, 0.9)",
  "rgba(198, 118, 92, 0.92)",
  "rgba(148, 139, 220, 0.9)",
  "rgba(105, 169, 218, 0.9)",
  "rgba(222, 158, 92, 0.92)",
  "rgba(188, 104, 132, 0.9)",
]

function getBrowserStorage() {
  if (typeof window === "undefined") return null
  return window.localStorage
}

function findThought(entry: OneThoughtLakeEntry) {
  return (
    oneThoughtPool.find((thought) => thought.thoughtId === entry.thoughtId) ??
    oneThoughtPool.find((thought) => thought.sceneId === entry.matchedSceneId) ??
    oneThoughtPool[0]
  )
}

function isAnonymousLakeEntry(entry: OneThoughtLakeEntry) {
  return entry.id.startsWith("lake_local_")
}

function getEntryDisplayText(entry: OneThoughtLakeEntry) {
  return isAnonymousLakeEntry(entry) ? entry.anonymousText : entry.os
}

function getAnonymousColor(entry: OneThoughtLakeEntry, index: number) {
  if (!isAnonymousLakeEntry(entry)) return "rgba(216, 183, 111, 0.72)"

  const hash = Array.from(entry.id).reduce((total, char) => total + char.charCodeAt(0), index)
  return anonymousColors[hash % anonymousColors.length]
}

function getTodayLiveSeed() {
  const today = new Date().toISOString().slice(0, 10)
  return Array.from(today).reduce((total, char) => total + char.charCodeAt(0), 0)
}

export function OneThoughtLakePage() {
  const [entries, setEntries] = useState<OneThoughtLakeEntry[]>(() =>
    readOneThoughtLakeEntries(null, oneThoughtPool),
  )
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null)
  const [inputText, setInputText] = useState("")
  const [draftEntry, setDraftEntry] = useState<OneThoughtLakeEntry | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [resonatedIds, setResonatedIds] = useState<string[]>([])
  const [lakeComments, setLakeComments] = useState<OneThoughtLakeComment[]>(() =>
    readOneThoughtLakeComments(null),
  )
  const [commentText, setCommentText] = useState("")
  const [liveTotalOffset, setLiveTotalOffset] = useState(0)

  useEffect(() => {
    const storage = getBrowserStorage()
    setEntries(readOneThoughtLakeEntries(storage, oneThoughtPool))
    setLakeComments(readOneThoughtLakeComments(storage))
  }, [])

  useEffect(() => {
    const seed = getTodayLiveSeed()
    let tick = 0
    setLiveTotalOffset(seed % 29)

    const interval = window.setInterval(
      () => {
        tick += 1
        setLiveTotalOffset((current) => current + (tick % 5 === 0 ? 2 : 1))
      },
      4600 + (seed % 6) * 520,
    )

    return () => window.clearInterval(interval)
  }, [])

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  )
  const seedEntries = useMemo(() => entries.filter((entry) => !isAnonymousLakeEntry(entry)), [entries])
  const anonymousEntries = useMemo(() => entries.filter(isAnonymousLakeEntry), [entries])
  const stats = useMemo(() => getOneThoughtLakeStats(seedEntries), [seedEntries])
  const liveTotal = stats.total + liveTotalOffset
  const selectedEntryText = selectedEntry ? getEntryDisplayText(selectedEntry) : ""
  const previewEntry = useMemo(
    () => entries.find((entry) => entry.id === hoveredEntryId) ?? null,
    [entries, hoveredEntryId],
  )
  const selectedComments = useMemo(
    () =>
      selectedEntry
        ? lakeComments.filter((comment) => comment.thoughtId === selectedEntry.thoughtId).slice(0, 5)
        : [],
    [lakeComments, selectedEntry],
  )

  function handleSelect(entry: OneThoughtLakeEntry) {
    setSelectedEntryId(entry.id)
    setNotice("")
    setError("")
    setHoveredEntryId(null)
  }

  function handleResonate(entry: OneThoughtLakeEntry) {
    if (resonatedIds.includes(entry.id)) return

    const storage = getBrowserStorage()
    const nextEntries = resonateWithOneThoughtLakeEntry(entry.id, entries, storage)
    setEntries(nextEntries)
    setResonatedIds((current) => [...current, entry.id])
    setNotice("共鸣已落印。")
  }

  function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedEntry) return

    const screen = screenOneThoughtLakeInput(commentText)
    if (!screen.allowed) {
      setError(screen.reason ?? "这句回响暂时不能放入心湖。")
      return
    }

    const storage = getBrowserStorage()
    const comment = createOneThoughtLakeComment(selectedEntry, screen.cleanedText)
    saveOneThoughtLakeComment(comment, storage)
    setLakeComments(readOneThoughtLakeComments(storage))
    setCommentText("")
    setError("")
    setNotice("同念回响已入湖，同一念的人会收到这句回响。")
  }

  function handleMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice("")

    const screen = screenOneThoughtLakeInput(inputText)
    if (!screen.allowed) {
      setError(screen.reason ?? "这句一念暂时不能放入心湖。")
      setDraftEntry(null)
      return
    }

    const match = matchUserThought(screen.cleanedText)
    const entry = createOneThoughtLakeEntryFromMatch(screen.cleanedText, match, oneThoughtPool)
    if (!entry) {
      setError("这句一念还没有照到合适场景。")
      setDraftEntry(null)
      return
    }

    setError("")
    setDraftEntry(entry)
  }

  function handlePlaceIntoLake() {
    if (!draftEntry) return

    const storage = getBrowserStorage()
    saveOneThoughtLakeEntry(draftEntry, storage)
    const nextEntries = readOneThoughtLakeEntries(storage, oneThoughtPool)
    setEntries(nextEntries)
    setSelectedEntryId(draftEntry.id)
    setNotice("这一念已匿名放入心湖。")
    setInputText("")
    setDraftEntry(null)
  }

  function handleSaveArchive() {
    if (!draftEntry) return

    const thought = findThought(draftEntry)
    const storage = getBrowserStorage()
    saveOneThoughtRecord(
      createOneThoughtRecord(thought, {
        recordId: `lake_archive_${draftEntry.id}`,
        date: draftEntry.date,
        completed: false,
      }),
      storage,
    )
    setNotice("这一念已存入你的心镜档案。")
  }

  return (
    <main className="one-thought-lake-page">
      <div className="lake-ink" aria-hidden="true" />
      <div className="lake-horizon" aria-hidden="true" />
      <div className="lake-ripple lake-ripple-one" aria-hidden="true" />
      <div className="lake-ripple lake-ripple-two" aria-hidden="true" />

      <header className="lake-header">
        <a href="/" className="lake-home-link">
          照见
        </a>
        <p className="lake-kicker">匿名共照</p>
        <h1>一念心湖</h1>
        <p>匿名看见众人的一念，也匿名放下自己的一念。</p>
        <span className="lake-count" aria-live="polite">
          今日共照 <strong>{liveTotal || 0}</strong> 人
          {stats.topEntry ? ` · 最多的一念：「${getEntryDisplayText(stats.topEntry)}」` : ""}
        </span>
      </header>

      <ThoughtField
        entries={seedEntries}
        selectedEntryId={selectedEntryId}
        onPreview={(entry) => setHoveredEntryId(entry?.id ?? null)}
        onSelect={handleSelect}
      />

      {previewEntry && !selectedEntry ? (
        <div className="lake-hover-preview" aria-live="polite">
          <p>「{getEntryDisplayText(previewEntry)}」</p>
          <span>
            {previewEntry.matchedSceneName} · {previewEntry.thief}
          </span>
        </div>
      ) : null}

      {anonymousEntries.length ? (
        <section className="lake-anonymous-band" aria-label="匿名一念浮光">
          <p>匿名浮光</p>
          {anonymousEntries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              className={`lake-anonymous-node ${selectedEntryId === entry.id ? "is-active" : ""}`}
              style={
                {
                  "--node-color": getAnonymousColor(entry, index),
                  "--float-delay": `${index * -1.7}s`,
                  "--float-x": `${(index % 7) * 13 - 39}%`,
                } as CSSProperties
              }
              onClick={() => handleSelect(entry)}
            >
              <i aria-hidden="true" />
              <span>「{getEntryDisplayText(entry)}」</span>
            </button>
          ))}
        </section>
      ) : null}

      {selectedEntry ? (
        <aside className="lake-focus-panel" aria-label="一念展开">
          <button type="button" className="lake-close" onClick={() => setSelectedEntryId(null)}>
            回到心湖
          </button>
          <p className="lake-panel-label">{selectedEntry.tradeMoment}</p>
          <h2>「{selectedEntryText}」</h2>
          <dl>
            <div>
              <dt>落在</dt>
              <dd>{selectedEntry.matchedSceneName}</dd>
            </div>
            <div>
              <dt>心贼</dt>
              <dd>{selectedEntry.thief}</dd>
            </div>
            <div>
              <dt>今日共照</dt>
              <dd>{selectedEntry.sameThoughtCount} 人</dd>
            </div>
          </dl>
          <p className="lake-reflection">{selectedEntry.reflection}</p>
          <section className="lake-echoes" aria-label="同念回响">
            <div className="lake-echoes-head">
              <p>同念回响</p>
              <span>{selectedComments.length ? `${selectedComments.length} 句已入湖` : "等第一句回响"}</span>
            </div>
            <div className="lake-echo-list">
              {selectedComments.length ? (
                selectedComments.map((comment) => (
                  <p key={comment.id}>
                    <span>匿名</span>
                    {comment.text}
                  </p>
                ))
              ) : (
                <p>
                  <span>心湖</span>
                  同一念的人，会收到这里的回响。
                </p>
              )}
            </div>
            <form className="lake-echo-form" onSubmit={handleComment}>
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="匿名回一句给同一念的人。"
                maxLength={64}
              />
              <button type="submit">放入回响</button>
            </form>
            {error ? <p className="lake-error">{error}</p> : null}
          </section>
          <div className="lake-panel-actions">
            <button
              type="button"
              className="lake-primary-action"
              onClick={() => handleResonate(selectedEntry)}
              disabled={resonatedIds.includes(selectedEntry.id)}
            >
              {resonatedIds.includes(selectedEntry.id) ? "共鸣已落印" : "我也有这一念"}
            </button>
            <button type="button" className="lake-secondary-action" onClick={() => setComposeOpen(true)}>
              写下我的一念
            </button>
          </div>
          {notice ? <p className="lake-notice">{notice}</p> : null}
        </aside>
      ) : null}

      <section className={`lake-compose ${composeOpen || draftEntry ? "is-open" : ""}`} aria-label="写下我的一念">
        <div className="lake-compose-head">
          <p>写下我的一念</p>
          <button type="button" onClick={() => setComposeOpen((current) => !current)}>
            {composeOpen || draftEntry ? "收起" : "写一念"}
          </button>
        </div>
        {composeOpen || draftEntry ? (
          <>
            <form onSubmit={handleMatch}>
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="写下今天交易中最真实的一念。"
                maxLength={64}
              />
              <button type="submit">照回这一念</button>
            </form>
            {error ? <p className="lake-error">{error}</p> : null}
            {draftEntry ? (
              <div className="lake-match-result" aria-label="一念匹配结果">
                <p>
                  这一念落在：<strong>{draftEntry.matchedSceneName}</strong>
                </p>
                <p>
                  心贼：<strong>{draftEntry.thief}</strong>
                </p>
                <p>
                  镜中显影：<strong>{draftEntry.mirrorName}</strong>
                </p>
                <div>
                  <button type="button" onClick={handlePlaceIntoLake}>
                    匿名放入心湖
                  </button>
                  <button type="button" onClick={handleSaveArchive}>
                    存入我的心镜档案
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <p className="lake-compliance">心湖只照见交易中的念头，不提供投资建议。</p>

      <style jsx>{`
        .one-thought-lake-page {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 38%, rgba(95, 132, 117, 0.18), transparent 42%),
            radial-gradient(circle at 50% 108%, rgba(216, 183, 111, 0.12), transparent 42%),
            linear-gradient(180deg, #081014 0%, #08100f 46%, #040605 100%);
          color: rgba(244, 235, 221, 0.9);
          font-family: var(--font-serif, "Songti SC", serif);
          isolation: isolate;
        }

        .lake-ink,
        .lake-horizon,
        .lake-ripple {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: -1;
        }

        .lake-ink {
          background:
            linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 20%, rgba(0, 0, 0, 0.72)),
            radial-gradient(ellipse at 25% 26%, rgba(216, 183, 111, 0.045), transparent 28%),
            radial-gradient(ellipse at 72% 30%, rgba(95, 132, 117, 0.07), transparent 32%);
        }

        .lake-horizon {
          top: 42%;
          height: 28%;
          background:
            linear-gradient(180deg, transparent, rgba(95, 132, 117, 0.09) 46%, transparent),
            repeating-linear-gradient(
              0deg,
              rgba(244, 235, 221, 0.035) 0,
              rgba(244, 235, 221, 0.035) 1px,
              transparent 1px,
              transparent 24px
            );
          filter: blur(0.8px);
          opacity: 0.42;
          mask-image: linear-gradient(90deg, transparent, black 18%, black 82%, transparent);
        }

        .lake-ripple {
          inset: auto 50% 4svh auto;
          width: min(58rem, 86vw);
          aspect-ratio: 1 / 0.42;
          border: 1px solid rgba(216, 183, 111, 0.08);
          border-radius: 50%;
          transform: translateX(50%);
          filter: blur(1px);
          opacity: 0.2;
          animation: lakeRipple 6.8s ease-out infinite;
        }

        .lake-ripple-two {
          width: min(42rem, 68vw);
          animation-delay: -3.2s;
          opacity: 0.14;
        }

        .lake-header {
          position: relative;
          z-index: 2;
          display: grid;
          justify-items: center;
          gap: 0.88rem;
          width: min(58rem, calc(100vw - 2rem));
          margin: 0 auto;
          padding-top: clamp(5.2rem, 9svh, 7.1rem);
          text-align: center;
        }

        .lake-home-link {
          position: fixed;
          top: 1.1rem;
          left: 1.1rem;
          color: rgba(216, 183, 111, 0.62);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.76rem;
          letter-spacing: 0.22em;
          text-decoration: none;
        }

        .lake-kicker,
        .lake-count,
        .lake-compliance {
          margin: 0;
          color: rgba(216, 183, 111, 0.62);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.2em;
        }

        .lake-kicker {
          font-size: clamp(0.82rem, 1vw, 0.95rem);
          letter-spacing: 0.28em;
          text-indent: 0.28em;
        }

        .lake-header h1 {
          margin: 0;
          color: rgba(244, 235, 221, 0.86);
          font-size: clamp(3.1rem, 8vw, 7.6rem);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: 0.14em;
          text-indent: 0.14em;
          text-shadow:
            0 0 34px rgba(216, 183, 111, 0.08),
            0 24px 76px rgba(0, 0, 0, 0.78);
        }

        .lake-header > p:not(.lake-kicker) {
          max-width: 34rem;
          margin: 0;
          color: rgba(220, 212, 195, 0.54);
          font-size: clamp(0.92rem, 1.8vw, 1.2rem);
          line-height: 1.9;
          letter-spacing: 0.09em;
        }

        .lake-count {
          color: rgba(220, 212, 195, 0.46);
          font-size: clamp(0.82rem, 1.05vw, 0.96rem);
          letter-spacing: 0.16em;
          text-indent: 0.16em;
        }

        .lake-count strong {
          color: rgba(220, 212, 195, 0.62);
          font-weight: 700;
          letter-spacing: 0.18em;
          transition: color 600ms ease;
        }

        .lake-hover-preview {
          pointer-events: none;
          position: fixed;
          left: 50%;
          top: 72%;
          z-index: 3;
          width: fit-content;
          max-width: min(34rem, calc(100vw - 2rem));
          border: 1px solid rgba(216, 183, 111, 0.12);
          border-radius: 999px;
          background:
            linear-gradient(180deg, rgba(244, 235, 221, 0.045), rgba(244, 235, 221, 0.018)),
            rgba(5, 7, 6, 0.42);
          box-shadow:
            inset 0 1px 0 rgba(244, 235, 221, 0.05),
            0 22px 72px rgba(0, 0, 0, 0.38);
          padding: 0.78rem 1.12rem;
          text-align: center;
          transform: translate(-50%, -50%);
          backdrop-filter: blur(18px);
          animation: lakeFocusIn 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .lake-hover-preview p {
          margin: 0;
          overflow: hidden;
          color: rgba(244, 235, 221, 0.76);
          font-size: clamp(0.96rem, 1.4vw, 1.24rem);
          letter-spacing: 0.08em;
          line-height: 1.4;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lake-hover-preview span {
          display: block;
          margin-top: 0.22rem;
          color: rgba(216, 183, 111, 0.42);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.68rem;
          letter-spacing: 0.16em;
        }

        .lake-anonymous-band {
          pointer-events: none;
          position: fixed;
          right: clamp(1.1rem, 4vw, 4rem);
          top: 54%;
          z-index: 3;
          display: grid;
          gap: 0.7rem;
          width: min(17rem, calc(100vw - 2rem));
          transform: translateY(-50%);
        }

        .lake-anonymous-band p {
          justify-self: end;
          margin: 0 0 0.2rem;
          color: rgba(216, 183, 111, 0.5);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.2em;
        }

        .lake-anonymous-node {
          pointer-events: auto;
          justify-self: end;
          display: inline-flex;
          align-items: center;
          gap: 0.54rem;
          max-width: 100%;
          border: 1px solid color-mix(in srgb, var(--node-color), transparent 72%);
          border-radius: 999px;
          background:
            linear-gradient(180deg, color-mix(in srgb, var(--node-color), transparent 88%), rgba(244, 235, 221, 0.018)),
            rgba(5, 7, 6, 0.52);
          box-shadow:
            inset 0 1px 0 rgba(244, 235, 221, 0.06),
            0 16px 42px rgba(0, 0, 0, 0.28),
            0 0 34px color-mix(in srgb, var(--node-color), transparent 90%);
          color: rgba(244, 235, 221, 0.58);
          cursor: pointer;
          font-family: var(--font-serif, "Songti SC", serif);
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          line-height: 1.4;
          overflow: hidden;
          padding: 0.58rem 0.78rem;
          transform: translateX(var(--float-x, 0));
          transition:
            border-color 500ms ease,
            color 500ms ease,
            opacity 500ms ease,
            transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
          animation: lakeAnonymousFloat 8.4s ease-in-out infinite;
          animation-delay: var(--float-delay, 0s);
        }

        .lake-anonymous-node i {
          width: 0.42rem;
          height: 0.42rem;
          flex: 0 0 auto;
          border-radius: 50%;
          background: var(--node-color);
          box-shadow: 0 0 18px color-mix(in srgb, var(--node-color), transparent 42%);
          opacity: 0.82;
        }

        .lake-anonymous-node span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lake-anonymous-node:hover,
        .lake-anonymous-node.is-active {
          border-color: color-mix(in srgb, var(--node-color), transparent 52%);
          color: rgba(244, 235, 221, 0.84);
          transform: translateX(calc(var(--float-x, 0) - 0.35rem)) scale(1.04);
        }

        .lake-focus-panel,
        .lake-compose {
          position: fixed;
          z-index: 4;
          border: 1px solid rgba(216, 183, 111, 0.14);
          background:
            linear-gradient(180deg, rgba(16, 22, 20, 0.76), rgba(4, 6, 5, 0.74)),
            rgba(8, 8, 7, 0.52);
          box-shadow:
            inset 0 1px 0 rgba(244, 235, 221, 0.06),
            0 34px 110px rgba(0, 0, 0, 0.48);
          backdrop-filter: blur(24px);
        }

        .lake-focus-panel {
          left: 50%;
          top: 52%;
          display: grid;
          gap: 1rem;
          width: min(38rem, calc(100vw - 2rem));
          padding: clamp(1.2rem, 3vw, 2rem);
          border-radius: 1.35rem;
          transform: translate(-50%, -50%);
          animation: lakeFocusIn 760ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .lake-close,
        .lake-compose-head button,
        .lake-secondary-action,
        .lake-primary-action,
        .lake-compose form button,
        .lake-echo-form button,
        .lake-match-result button {
          border: 1px solid rgba(216, 183, 111, 0.16);
          border-radius: 999px;
          background: rgba(8, 8, 7, 0.24);
          color: rgba(220, 212, 195, 0.7);
          cursor: pointer;
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          padding: 0.72rem 1rem;
          transition: border-color 500ms ease, color 500ms ease, background 500ms ease, opacity 500ms ease;
        }

        .lake-close {
          justify-self: start;
          padding: 0.42rem 0.72rem;
          color: rgba(216, 183, 111, 0.62);
        }

        .lake-panel-label {
          margin: 0;
          color: rgba(216, 183, 111, 0.62);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.72rem;
          letter-spacing: 0.2em;
        }

        .lake-focus-panel h2 {
          margin: 0;
          color: rgba(244, 235, 221, 0.88);
          font-size: clamp(2rem, 4.6vw, 4.1rem);
          font-weight: 400;
          line-height: 1.24;
          letter-spacing: 0.1em;
        }

        .lake-focus-panel dl {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.7rem;
          margin: 0;
        }

        .lake-focus-panel dl div {
          border-top: 1px solid rgba(216, 183, 111, 0.1);
          padding-top: 0.72rem;
        }

        .lake-focus-panel dt {
          color: rgba(216, 183, 111, 0.56);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.68rem;
          letter-spacing: 0.2em;
        }

        .lake-focus-panel dd {
          margin: 0.25rem 0 0;
          color: rgba(220, 212, 195, 0.68);
          font-size: 1rem;
          letter-spacing: 0.08em;
        }

        .lake-reflection {
          margin: 0;
          color: rgba(220, 212, 195, 0.56);
          font-size: clamp(0.92rem, 1.4vw, 1.08rem);
          line-height: 1.9;
          letter-spacing: 0.08em;
        }

        .lake-echoes {
          display: grid;
          gap: 0.72rem;
          border-top: 1px solid rgba(216, 183, 111, 0.1);
          padding-top: 0.9rem;
        }

        .lake-echoes-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .lake-echoes-head p,
        .lake-echoes-head span {
          margin: 0;
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.68rem;
          letter-spacing: 0.18em;
        }

        .lake-echoes-head p {
          color: rgba(216, 183, 111, 0.68);
          font-weight: 700;
        }

        .lake-echoes-head span {
          color: rgba(220, 212, 195, 0.36);
        }

        .lake-echo-list {
          display: grid;
          gap: 0.5rem;
          max-height: 8rem;
          overflow: auto;
          padding-right: 0.2rem;
        }

        .lake-echo-list p {
          margin: 0;
          border: 1px solid rgba(216, 183, 111, 0.08);
          border-radius: 0.9rem;
          background: rgba(244, 235, 221, 0.025);
          color: rgba(220, 212, 195, 0.55);
          font-size: 0.88rem;
          line-height: 1.7;
          letter-spacing: 0.06em;
          padding: 0.62rem 0.72rem;
        }

        .lake-echo-list span {
          margin-right: 0.62rem;
          color: rgba(216, 183, 111, 0.52);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.68rem;
          letter-spacing: 0.16em;
        }

        .lake-echo-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.58rem;
        }

        .lake-echo-form input {
          min-width: 0;
          border: 1px solid rgba(216, 183, 111, 0.12);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.18);
          color: rgba(244, 235, 221, 0.8);
          font-family: var(--font-serif, "Songti SC", serif);
          font-size: 0.92rem;
          outline: none;
          padding: 0.72rem 0.9rem;
        }

        .lake-echo-form input::placeholder {
          color: rgba(220, 212, 195, 0.32);
        }

        .lake-panel-actions,
        .lake-match-result div {
          display: flex;
          flex-wrap: wrap;
          gap: 0.72rem;
        }

        .lake-primary-action,
        .lake-compose form button,
        .lake-match-result button:first-child {
          border-color: rgba(216, 183, 111, 0.34);
          background: linear-gradient(180deg, rgba(216, 183, 111, 0.92), rgba(156, 127, 62, 0.84));
          color: rgba(7, 7, 5, 0.9);
        }

        .lake-primary-action:disabled {
          cursor: default;
          opacity: 0.62;
        }

        .lake-compose {
          left: 50%;
          bottom: clamp(2.55rem, 4vw, 3.25rem);
          width: min(34rem, calc(100vw - 2rem));
          border-radius: 1.2rem;
          padding: 0.9rem;
          transform: translateX(-50%);
        }

        .lake-compose-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .lake-compose-head p {
          margin: 0;
          color: rgba(216, 183, 111, 0.7);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.18em;
        }

        .lake-compose form {
          display: grid;
          gap: 0.75rem;
          margin-top: 0.9rem;
        }

        .lake-compose textarea {
          min-height: 5.8rem;
          resize: vertical;
          border: 1px solid rgba(216, 183, 111, 0.12);
          border-radius: 0.95rem;
          background: rgba(0, 0, 0, 0.2);
          color: rgba(244, 235, 221, 0.82);
          font-family: var(--font-serif, "Songti SC", serif);
          font-size: 1rem;
          line-height: 1.7;
          outline: none;
          padding: 0.9rem;
        }

        .lake-compose textarea::placeholder {
          color: rgba(220, 212, 195, 0.34);
        }

        .lake-match-result {
          display: grid;
          gap: 0.58rem;
          margin-top: 0.86rem;
          border-top: 1px solid rgba(216, 183, 111, 0.1);
          padding-top: 0.86rem;
          color: rgba(220, 212, 195, 0.58);
          font-size: 0.9rem;
          line-height: 1.8;
          letter-spacing: 0.06em;
        }

        .lake-match-result p,
        .lake-error,
        .lake-notice {
          margin: 0;
        }

        .lake-match-result strong {
          color: rgba(244, 235, 221, 0.8);
          font-weight: 400;
        }

        .lake-error {
          margin-top: 0.7rem;
          color: rgba(183, 81, 59, 0.86);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .lake-notice {
          color: rgba(216, 183, 111, 0.68);
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 0.76rem;
          letter-spacing: 0.16em;
        }

        .lake-compliance {
          position: fixed;
          left: 50%;
          bottom: 1.2rem;
          z-index: 3;
          width: min(34rem, calc(100vw - 2rem));
          transform: translateX(-50%);
          color: rgba(220, 212, 195, 0.35);
          text-align: center;
        }

        @keyframes lakeRipple {
          0% {
            transform: translateX(50%) scale(0.86);
            opacity: 0.22;
          }
          100% {
            transform: translateX(50%) scale(1.3);
            opacity: 0;
          }
        }

        @keyframes lakeFocusIn {
          from {
            opacity: 0;
            transform: translate(-50%, -46%) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes lakeAnonymousFloat {
          0%,
          100% {
            opacity: 0.42;
            translate: 0 0;
          }
          50% {
            opacity: 0.78;
            translate: -0.3rem -0.7rem;
          }
        }

        @media (max-width: 720px) {
          .one-thought-lake-page {
            min-height: 100svh;
            overflow-y: auto;
          }

          .lake-header {
            padding-top: 4.6rem;
          }

          .lake-header h1 {
            font-size: clamp(2.8rem, 14vw, 4.4rem);
          }

          .lake-anonymous-band {
            position: relative;
            right: auto;
            top: auto;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            width: calc(100vw - 1.4rem);
            margin: -1.4rem auto 1.2rem;
            transform: none;
          }

          .lake-anonymous-band p {
            grid-column: 1 / -1;
            justify-self: center;
          }

          .lake-anonymous-node {
            justify-self: stretch;
            transform: none;
          }

          .lake-anonymous-node:hover,
          .lake-anonymous-node.is-active {
            transform: scale(1.02);
          }

          .lake-focus-panel {
            position: relative;
            left: auto;
            top: auto;
            width: calc(100vw - 1.4rem);
            margin: -3rem auto 8rem;
            transform: none;
          }

          .lake-focus-panel dl {
            grid-template-columns: 1fr;
          }

          .lake-compose {
            left: 0.7rem;
            right: 0.7rem;
            bottom: 0.8rem;
            width: auto;
            transform: none;
          }

          .lake-echo-form {
            grid-template-columns: 1fr;
          }

          .lake-compliance {
            position: relative;
            bottom: auto;
            margin: 4rem auto 9rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lake-anonymous-node,
          .lake-ripple {
            animation: none;
          }
        }
      `}</style>
    </main>
  )
}
