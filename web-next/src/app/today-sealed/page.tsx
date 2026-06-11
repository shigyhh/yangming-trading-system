"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { AssessmentShell } from "@/features/assessment/components"
import { getTodayArchiveStats } from "@/lib/mind-archive/archiveStatsService"
import { updateOneThoughtEventFinalAction } from "@/lib/mind-archive/oneThoughtEventRepository"
import { getRuleGuardReminders, type RuleGuardReminder } from "@/lib/rule-guard/ruleGuardService"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type ActualAction,
  type OneThoughtEvent,
  type OneThoughtReaction,
  type ReviewStatus,
} from "@/lib/mind-archive/types"

const reactionLabels: Record<OneThoughtReaction, string> = {
  seen: "照见了",
  not_hit: "没照到",
  stopped: "愿止一念",
  still_moving: "心还在动",
}

const actionLabels: Record<ActualAction, string> = {
  no_trade: "未交易",
  traded: "还是交易了",
  paused: "停住了",
  watched: "观望了",
  unknown: "待记录",
}

const reviewStatusLabels: Record<ReviewStatus, string> = {
  none: "无需复盘",
  pending: "待复盘",
  completed: "已复盘",
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function reviewStatusLabel(event: OneThoughtEvent) {
  if (event.tradeReviewId) return "已复盘"
  return reviewStatusLabels[event.reviewStatus || "none"]
}

export default function TodaySealedPage() {
  const [events, setEvents] = useState<OneThoughtEvent[]>([])
  const [summary, setSummary] = useState({
    seen: 0,
    notHit: 0,
    stopped: 0,
    stillMoving: 0,
    pendingReview: 0,
  })
  const [reminders, setReminders] = useState<RuleGuardReminder[]>([])

  const refreshToday = useCallback(() => {
    const stats = getTodayArchiveStats(DEFAULT_MIND_ARCHIVE_USER_ID)
    setEvents(stats.events)
    setSummary({
      seen: stats.seen,
      notHit: stats.notHit,
      stopped: stats.stopped,
      stillMoving: stats.stillMoving,
      pendingReview: stats.pendingReview,
    })
    setReminders(getRuleGuardReminders(DEFAULT_MIND_ARCHIVE_USER_ID))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshToday()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [refreshToday])

  function recordFinalAction(eventId: string, actualAction: ActualAction) {
    updateOneThoughtEventFinalAction(eventId, actualAction)
    refreshToday()
  }

  return (
    <AssessmentShell background="home-water" contentWidth="wide">
      <main className="today-sealed-page">
        <header className="today-hero">
          <p>今日所照</p>
          <h1>今天你照见了几念</h1>
          <span>不看行情，只看心动。</span>
        </header>

        <section className="today-summary" aria-label="今日所照统计">
          <article>
            <span>今日所照</span>
            <strong>{events.length}</strong>
            <p>已落印的一念</p>
          </article>
          <article>
            <span>照见了</span>
            <strong>{summary.seen}</strong>
            <p>这一念被看见</p>
          </article>
          <article>
            <span>没照到</span>
            <strong>{summary.notHit}</strong>
            <p>还没刺中，也记下</p>
          </article>
          <article>
            <span>愿止一念</span>
            <strong>{summary.stopped}</strong>
            <p>停住，就是功夫</p>
          </article>
          <article>
            <span>心还在动</span>
            <strong>{summary.stillMoving}</strong>
            <p>不必骗自己</p>
          </article>
          <article>
            <span>待复盘</span>
            <strong>{summary.pendingReview}</strong>
            <p>交易后还欠一次回头看</p>
          </article>
        </section>

        <section className="guard-section" aria-label="规则守护高频提醒">
          <div>
            <p>规则守护</p>
            <h2>不做强制拦截，只做提醒</h2>
            <span>提醒来自已落印的一念和已有真实复盘。</span>
          </div>
          <div>
            <p>高频提醒</p>
            {reminders.length ? reminders.slice(0, 3).map((reminder) => (
              <article key={reminder.id}>
                <strong>{reminder.title}</strong>
                <span>{reminder.message}</span>
              </article>
            )) : (
              <span>暂无高频提醒。</span>
            )}
          </div>
        </section>

        <section className="today-list" aria-label="今日最近一念">
          <div className="today-list-head">
            <p>最近一念</p>
            <Link href="/assessment-entry">继续照见一念</Link>
          </div>

          {events.length ? (
            <div className="today-records">
              {events.map((event) => {
                const reaction = event.userReaction ? reactionLabels[event.userReaction] : "未反馈"
                const action = event.actualAction ? actionLabels[event.actualAction] : "待记录"
                const evidence = event.heartEvidence || event.painPoint || "未标注"
                const practice = event.practiceText || "今日修行待补齐"

                return (
                  <article key={event.id}>
                    <time>{formatTime(event.updatedAt || event.createdAt)}</time>
                    <h2>「{event.os}」</h2>
                    <p>{event.reflectionFinal}</p>
                    <dl>
                      <div>
                        <dt>场景</dt>
                        <dd>{event.tradeMoment || event.sceneId}</dd>
                      </div>
                      <div>
                        <dt>心贼</dt>
                        <dd>{event.heartThief || "待补齐"}</dd>
                      </div>
                      <div>
                        <dt>心证</dt>
                        <dd>{evidence}</dd>
                      </div>
                      <div>
                        <dt>修行</dt>
                        <dd>{practice}</dd>
                      </div>
                      <div>
                        <dt>反馈</dt>
                        <dd>{reaction}</dd>
                      </div>
                      <div>
                        <dt>最后动作</dt>
                        <dd>{action}</dd>
                      </div>
                      <div>
                        <dt>复盘</dt>
                        <dd>{reviewStatusLabel(event)}</dd>
                      </div>
                    </dl>
                    <div className="final-action-area" aria-label="最后动作记录">
                      <span>最后你怎么做？</span>
                      <div>
                        <button type="button" onClick={() => recordFinalAction(event.id, "paused")}>
                          停住了
                        </button>
                        <button type="button" onClick={() => recordFinalAction(event.id, "watched")}>
                          观望了
                        </button>
                        <button type="button" onClick={() => recordFinalAction(event.id, "traded")}>
                          还是交易了
                        </button>
                        <button type="button" onClick={() => recordFinalAction(event.id, "unknown")}>
                          稍后再记
                        </button>
                      </div>
                      {event.actualAction === "traded" && event.reviewStatus === "pending" ? (
                        <Link href={`/review?linkedOneThoughtEventId=${encodeURIComponent(event.id)}`}>
                          稍后真实复盘
                        </Link>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="today-empty">
              <p>今天还没有落印的一念。</p>
              <Link href="/assessment-entry">照见一念</Link>
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .today-sealed-page {
          width: min(100%, 1120px);
          margin: 0 auto;
          padding: clamp(48px, 8svh, 88px) 20px 104px;
          color: rgba(244, 235, 221, 0.9);
        }

        .today-hero {
          text-align: center;
          margin-bottom: clamp(34px, 6svh, 62px);
        }

        .today-hero p,
        .today-summary span,
        .today-list-head p,
        dt {
          margin: 0;
          color: rgba(216, 183, 111, 0.64);
          font-size: 13px;
          letter-spacing: 0.2em;
        }

        .today-hero h1 {
          margin: 14px 0 16px;
          font-family: var(--font-serif);
          font-size: clamp(52px, 7vw, 96px);
          font-weight: 400;
          line-height: 1.12;
        }

        .today-hero span,
        .today-summary p,
        .today-empty p {
          color: rgba(244, 235, 221, 0.48);
        }

        .today-summary {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 30px;
        }

        .guard-section {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 30px;
        }

        .today-summary article,
        .today-list,
        .today-records article,
        .today-empty,
        .guard-section > div {
          border-top: 1px solid rgba(216, 183, 111, 0.18);
          background: rgba(8, 8, 7, 0.16);
        }

        .guard-section > div {
          padding: 20px;
        }

        .guard-section p {
          margin: 0 0 12px;
          color: rgba(216, 183, 111, 0.64);
          font-size: 13px;
          letter-spacing: 0.2em;
        }

        .guard-section h2 {
          margin: 0 0 10px;
          font-family: var(--font-serif);
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 400;
        }

        .guard-section span {
          color: rgba(244, 235, 221, 0.52);
          line-height: 1.8;
          white-space: pre-line;
        }

        .guard-section article {
          display: grid;
          gap: 6px;
          border-top: 1px solid rgba(216, 183, 111, 0.1);
          padding: 12px 0;
        }

        .guard-section strong {
          color: rgba(216, 183, 111, 0.86);
          font-weight: 400;
        }

        .today-summary article {
          min-height: 128px;
          padding: 18px 16px;
        }

        .today-summary strong {
          display: block;
          margin-top: 16px;
          font-family: var(--font-serif);
          font-size: 42px;
          font-weight: 400;
        }

        .today-summary p {
          margin: 8px 0 0;
          font-size: 13px;
        }

        .today-list {
          padding: 22px;
        }

        .today-list-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .today-list-head a,
        .today-empty a {
          color: rgba(216, 183, 111, 0.9);
          text-decoration: none;
          border-bottom: 1px solid rgba(216, 183, 111, 0.42);
          padding-bottom: 6px;
        }

        .today-records {
          display: grid;
          gap: 16px;
        }

        .today-records article,
        .today-empty {
          padding: 22px;
        }

        time {
          color: rgba(244, 235, 221, 0.38);
          font-size: 13px;
        }

        h2 {
          margin: 10px 0 12px;
          font-family: var(--font-serif);
          font-size: clamp(28px, 3vw, 42px);
          font-weight: 400;
        }

        .today-records article > p {
          margin: 0 0 18px;
          color: rgba(244, 235, 221, 0.74);
          font-size: 18px;
          line-height: 1.9;
        }

        dl {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 18px;
          margin: 0;
        }

        dd {
          margin: 6px 0 0;
          color: rgba(244, 235, 221, 0.72);
          line-height: 1.7;
        }

        .final-action-area {
          margin-top: 22px;
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          padding-top: 18px;
        }

        .final-action-area > span {
          display: block;
          color: rgba(216, 183, 111, 0.58);
          font-size: 13px;
          letter-spacing: 0.16em;
          margin-bottom: 12px;
        }

        .final-action-area > div {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .final-action-area button {
          border: 1px solid rgba(216, 183, 111, 0.2);
          border-radius: 999px;
          background: rgba(8, 8, 7, 0.22);
          color: rgba(244, 235, 221, 0.72);
          cursor: pointer;
          font: inherit;
          padding: 9px 14px;
        }

        .final-action-area button:hover {
          border-color: rgba(216, 183, 111, 0.42);
          color: rgba(216, 183, 111, 0.92);
        }

        .final-action-area a {
          display: inline-block;
          margin-top: 14px;
          color: rgba(216, 183, 111, 0.9);
          text-decoration: none;
          border-bottom: 1px solid rgba(216, 183, 111, 0.42);
          padding-bottom: 6px;
        }

        .today-empty {
          text-align: center;
          padding: 38px 20px;
        }

        @media (max-width: 900px) {
          .today-summary,
          .guard-section {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          dl {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .today-sealed-page {
            padding-inline: 16px;
          }

          .today-summary {
            grid-template-columns: 1fr;
          }

          .guard-section {
            grid-template-columns: 1fr;
          }

          .today-list-head {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </AssessmentShell>
  )
}
