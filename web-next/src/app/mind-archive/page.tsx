"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { AssessmentShell, PrimaryButton } from "@/features/assessment/components"
import { getHeartThiefProfile, type HeartThiefProfile } from "@/lib/mind-archive/heartThiefProfileService"
import {
  getMindArchiveStats,
  getRecentSealedThoughtEvents,
} from "@/lib/mind-archive/archiveStatsService"
import { getRuleGuardReminders, type RuleGuardReminder } from "@/lib/rule-guard/ruleGuardService"
import { listRecentTradeReviews } from "@/lib/trade-review/tradeReviewRepository"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type ArchiveStats,
  type OneThoughtEvent,
  type ReviewStatus,
  type TradeReview,
} from "@/lib/mind-archive/types"

const reactionLabels = {
  seen: "照见了",
  not_hit: "没照到",
  stopped: "愿止一念",
  still_moving: "心还在动",
} as const

const actualActionLabels = {
  no_trade: "未交易",
  traded: "还是交易了",
  paused: "停住了",
  watched: "观望了",
  unknown: "稍后再记",
} as const

const reviewStatusLabels: Record<ReviewStatus, string> = {
  none: "无需复盘",
  pending: "待复盘",
  completed: "已复盘",
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getReviewLabel(event: OneThoughtEvent) {
  if (event.tradeReviewId) return "已复盘"
  return reviewStatusLabels[event.reviewStatus || "none"]
}

export default function MindArchivePage() {
  const [stats, setStats] = useState<ArchiveStats | null>(null)
  const [recentSealedEvents, setRecentSealedEvents] = useState<OneThoughtEvent[]>([])
  const [recentTradeReviews, setRecentTradeReviews] = useState<TradeReview[]>([])
  const [heartThiefProfile, setHeartThiefProfile] = useState<HeartThiefProfile | null>(null)
  const [reminders, setReminders] = useState<RuleGuardReminder[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStats(getMindArchiveStats(DEFAULT_MIND_ARCHIVE_USER_ID))
      setRecentSealedEvents(getRecentSealedThoughtEvents(DEFAULT_MIND_ARCHIVE_USER_ID, 5))
      setRecentTradeReviews(listRecentTradeReviews(DEFAULT_MIND_ARCHIVE_USER_ID, 3))
      setHeartThiefProfile(getHeartThiefProfile(DEFAULT_MIND_ARCHIVE_USER_ID))
      setReminders(getRuleGuardReminders(DEFAULT_MIND_ARCHIVE_USER_ID))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const strongestHeartThief = heartThiefProfile?.dominantHeartThief || "待显影"
  const strongestHeartThiefCopy = heartThiefProfile?.riskLabel || "先照一念，档案才会说话。"
  const pendingReviewEvents = stats ? stats.pendingReviewEvents : []
  const recurringThoughts = stats ? stats.recurringThoughts : []
  const recentArchiveEvents = recentSealedEvents.slice(0, 5)

  return (
    <AssessmentShell background="home-water" contentWidth="wide">
      <main className="mind-archive-page">
        <header className="archive-gate">
          <p className="archive-gate-kicker">私人修行总入口</p>
          <h1>档案馆</h1>
          <p className="archive-gate-copy">这里收藏你已照见、已落印、已复盘的一念。</p>
          <p className="archive-gate-subcopy">不记行情，只记你被哪一念牵走，又有没有照着做。</p>
          <span className="archive-volume">当前卷：一念档案</span>
        </header>

        <section className="archive-overview" aria-label="档案馆首屏摘要">
          <article className="today-summary">
            <p className="section-kicker">今日所照摘要</p>
            <div className="summary-primary">
              <strong>{stats?.todayTotal ?? 0}</strong>
              <span>今日落印</span>
            </div>
            <div className="summary-grid" aria-label="今日所照数字">
              <div>
                <span>照见了</span>
                <strong>{stats?.todaySeen ?? 0}</strong>
              </div>
              <div>
                <span>愿止一念</span>
                <strong>{stats?.todayStopped ?? 0}</strong>
              </div>
              <div>
                <span>心还在动</span>
                <strong>{stats?.todayStillMoving ?? 0}</strong>
              </div>
              <div>
                <span>待复盘</span>
                <strong>{stats?.pendingReviewCount ?? 0}</strong>
              </div>
            </div>
            <p className="archive-note">止念率 {formatPercent(stats?.stopRate ?? 0)}，只看你有没有在一念起时停住。</p>
          </article>

          <article className="heart-thief-panel">
            <p className="section-kicker">心贼画像</p>
            <h2>近日最强心贼：{strongestHeartThief}</h2>
            <p>{strongestHeartThiefCopy}</p>
          </article>
        </section>

        <section className="pending-review-strip" aria-label="真实复盘入口">
          <div>
            <p className="section-kicker">真实复盘入口</p>
            <h2>{pendingReviewEvents.length ? "这一念之后你交易了，后面还欠一次回头看。" : "暂无待复盘的一念。"}</h2>
            <span>
              {pendingReviewEvents.length
                ? `还有 ${pendingReviewEvents.length} 条一念等你写回真实复盘。`
                : `最近已写回 ${recentTradeReviews.length} 条真实复盘。`}
            </span>
          </div>
          {pendingReviewEvents[0] ? (
            <Link href={`/review?linkedOneThoughtEventId=${encodeURIComponent(pendingReviewEvents[0].id)}`}>
              去真实复盘 →
            </Link>
          ) : (
            <Link href="/today-sealed">回到今日所照</Link>
          )}
        </section>

        <section className="archive-section one-thought-ledger" id="one-thought-ledger">
          <div className="section-head">
            <div>
              <p className="section-kicker">最近一念</p>
              <h2>一念档案摘要</h2>
            </div>
            <Link href="#one-thought-ledger">查看一念档案</Link>
          </div>

          {recentArchiveEvents.length ? (
            <div className="ledger-list">
              {recentArchiveEvents.map((event) => (
                <article key={event.id}>
                  <div className="ledger-meta">
                    <time>{formatTime(event.updatedAt || event.createdAt)}</time>
                    <span>{event.tradeMoment}</span>
                  </div>
                  <h3>「{event.os}」</h3>
                  <p>{event.reflectionFinal}</p>
                  <dl>
                    <div>
                      <dt>心贼</dt>
                      <dd>{event.heartThief || "心贼标签待补齐"}</dd>
                    </div>
                    <div>
                      <dt>反馈</dt>
                      <dd>{event.userReaction ? reactionLabels[event.userReaction] : "未反馈"}</dd>
                    </div>
                    <div>
                      <dt>动作</dt>
                      <dd>{event.actualAction ? actualActionLabels[event.actualAction] : "未记录"}</dd>
                    </div>
                    <div>
                      <dt>复盘</dt>
                      <dd>{getReviewLabel(event)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">今日还没有照见。先照一念，档案才会说话。</p>
          )}
        </section>

        <section className="long-scroll-gates" aria-label="长卷入口">
          <Link className="scroll-gate" href="/mind-scroll">
            <span>心镜长卷</span>
            <strong>看心怎么动。</strong>
            <p>这里不记行情，只记你被哪一念牵走。</p>
          </Link>
          <Link className="scroll-gate" href="/zhixing-scroll">
            <span>知行长卷</span>
            <strong>看照见后有没有做到。</strong>
            <p>照见之后，你到底有没有照着做。</p>
          </Link>
        </section>

        <section className="archive-section review-section">
          <div className="section-head">
            <div>
              <p className="section-kicker">真实复盘</p>
              <h2>交易之后，回到当时那一念。</h2>
            </div>
          </div>
          {pendingReviewEvents.length ? (
            <div className="pending-list">
              {pendingReviewEvents.slice(0, 3).map((event) => (
                <article key={event.id}>
                  <time>{formatTime(event.updatedAt || event.createdAt)}</time>
                  <h3>「{event.os}」</h3>
                  <p>{event.reflectionFinal}</p>
                  <span>{event.heartThief || "心贼标签待补齐"}</span>
                  <Link href={`/review?linkedOneThoughtEventId=${encodeURIComponent(event.id)}`}>
                    去真实复盘 →
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">待复盘清空时，这里只保留安静的空位。</p>
          )}
        </section>

        <section className="archive-section recurring-section">
          <div className="section-head">
            <div>
              <p className="section-kicker">复发念</p>
              <h2>这不是第一次来，也不会是最后一次。</h2>
            </div>
          </div>
          {recurringThoughts.length ? (
            <div className="repeat-list">
              {recurringThoughts.slice(0, 5).map((item) => (
                <article key={item.key}>
                  <h3>「{item.os}」</h3>
                  <span>
                    {item.tradeMoment} · 出现 {item.count} 次 · 最后 {formatTime(item.lastSeenAt)}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">暂未看到反复出现的一念。</p>
          )}
        </section>

        <section className="archive-section guard-section" aria-label="规则守护">
          <div className="section-head">
            <div>
              <p className="section-kicker">规则守护</p>
              <h2>不做强制拦截，只做提醒</h2>
            </div>
          </div>
          {reminders.length ? (
            <div className="guard-list">
              {reminders.slice(0, 3).map((reminder) => (
                <article className="guard-reminder" key={reminder.id}>
                  <span>{reminder.title}</span>
                  <p>{reminder.message}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">暂无规则守护提醒。</p>
          )}
        </section>

        <div className="archive-actions">
          <PrimaryButton type="button" onClick={() => { window.location.href = "/assessment-entry" }}>
            继续照见一念
          </PrimaryButton>
        </div>
      </main>

      <style jsx>{`
        .mind-archive-page {
          width: min(100%, 1120px);
          margin: 0 auto;
          padding: clamp(50px, 8svh, 96px) 20px 96px;
          color: rgba(244, 235, 221, 0.9);
          overflow: hidden;
        }

        .archive-gate {
          position: relative;
          display: grid;
          justify-items: center;
          text-align: center;
          gap: 12px;
          margin-bottom: clamp(34px, 6svh, 66px);
          padding-bottom: clamp(28px, 5svh, 50px);
        }

        .archive-gate::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 50%;
          width: min(520px, 82vw);
          height: 1px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, rgba(216, 183, 111, 0.34), transparent);
        }

        .archive-gate-kicker,
        .section-kicker,
        dt,
        .scroll-gate span,
        .pending-list span,
        .archive-volume {
          margin: 0;
          color: rgba(216, 183, 111, 0.66);
          font-size: 13px;
          letter-spacing: 0.18em;
        }

        .archive-gate h1 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(56px, 8vw, 112px);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: 0;
        }

        .archive-gate-copy,
        .archive-gate-subcopy {
          margin: 0;
          color: rgba(244, 235, 221, 0.68);
          font-size: clamp(15px, 2vw, 19px);
          line-height: 1.9;
        }

        .archive-gate-subcopy,
        .empty-state,
        .archive-note,
        .pending-review-strip span,
        .heart-thief-panel p,
        .scroll-gate p,
        .ledger-list p,
        dd,
        .repeat-list span,
        .guard-reminder p {
          color: rgba(244, 235, 221, 0.58);
        }

        .archive-volume {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 8px;
          border-top: 1px solid rgba(216, 183, 111, 0.2);
          border-bottom: 1px solid rgba(216, 183, 111, 0.12);
          padding: 10px 18px;
        }

        .archive-overview {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
          gap: clamp(24px, 4vw, 54px);
          align-items: stretch;
          margin-bottom: 22px;
        }

        .today-summary,
        .heart-thief-panel,
        .pending-review-strip,
        .archive-section,
        .scroll-gate {
          border-top: 1px solid rgba(216, 183, 111, 0.18);
          background: linear-gradient(180deg, rgba(244, 235, 221, 0.035), rgba(8, 8, 7, 0));
          min-width: 0;
        }

        .today-summary,
        .heart-thief-panel {
          padding: 24px 0 0;
        }

        .summary-primary {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin: 14px 0 20px;
        }

        .summary-primary strong {
          font-family: var(--font-serif);
          font-size: clamp(54px, 7vw, 92px);
          font-weight: 400;
          line-height: 1;
        }

        .summary-primary span,
        .summary-grid span {
          color: rgba(244, 235, 221, 0.44);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          border-bottom: 1px solid rgba(216, 183, 111, 0.08);
        }

        .summary-grid div {
          display: grid;
          gap: 8px;
          padding: 16px 14px 16px 0;
          min-width: 0;
        }

        .summary-grid strong {
          font-family: var(--font-serif);
          font-size: 28px;
          font-weight: 400;
        }

        .archive-note {
          margin: 18px 0 0;
          line-height: 1.9;
        }

        .heart-thief-panel h2,
        .pending-review-strip h2,
        .section-head h2 {
          margin: 12px 0 0;
          font-family: var(--font-serif);
          font-size: clamp(30px, 4vw, 52px);
          font-weight: 400;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .heart-thief-panel p {
          margin: 18px 0 0;
          line-height: 1.9;
          white-space: pre-line;
        }

        .pending-review-strip {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin: 0 0 32px;
          padding: 24px 0 22px;
        }

        .pending-review-strip h2 {
          max-width: 720px;
          font-size: clamp(26px, 3.8vw, 46px);
        }

        .pending-review-strip span {
          display: block;
          margin-top: 12px;
          line-height: 1.8;
        }

        .archive-section {
          margin-bottom: 32px;
          padding-top: 24px;
        }

        .section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
        }

        a {
          color: rgba(216, 183, 111, 0.9);
          text-decoration: none;
          border-bottom: 1px solid rgba(216, 183, 111, 0.34);
          padding-bottom: 6px;
        }

        .ledger-list,
        .repeat-list,
        .pending-list,
        .guard-list {
          display: grid;
          gap: 18px;
        }

        .ledger-list article,
        .repeat-list article,
        .pending-list article,
        .guard-reminder {
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          padding-top: 18px;
          min-width: 0;
        }

        .ledger-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 16px;
          color: rgba(244, 235, 221, 0.36);
          font-size: 13px;
        }

        time {
          color: rgba(244, 235, 221, 0.36);
          font-size: 13px;
        }

        h3 {
          margin: 10px 0;
          font-family: var(--font-serif);
          font-size: 24px;
          font-weight: 400;
          line-height: 1.45;
        }

        .ledger-list p,
        .pending-list p,
        .guard-reminder p {
          margin: 0;
          line-height: 1.85;
          overflow-wrap: anywhere;
        }

        dl {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0 0;
        }

        dt,
        dd {
          margin: 0;
        }

        dd {
          margin-top: 8px;
          line-height: 1.6;
        }

        .long-scroll-gates {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: clamp(18px, 3vw, 34px);
          margin-bottom: 32px;
        }

        .scroll-gate {
          display: grid;
          gap: 14px;
          min-height: 220px;
          padding: 28px 0 26px;
          border-bottom: 1px solid rgba(216, 183, 111, 0.1);
        }

        .scroll-gate strong {
          color: rgba(244, 235, 221, 0.9);
          font-family: var(--font-serif);
          font-size: clamp(32px, 4.5vw, 56px);
          font-weight: 400;
          line-height: 1.22;
        }

        .scroll-gate p {
          margin: 0;
          line-height: 1.85;
        }

        .repeat-list h3 {
          margin-bottom: 8px;
        }

        .guard-reminder span {
          color: rgba(216, 183, 111, 0.84);
          letter-spacing: 0.1em;
        }

        .archive-actions {
          display: flex;
          justify-content: center;
          margin-top: 46px;
        }

        @media (max-width: 860px) {
          .mind-archive-page {
            padding: clamp(38px, 7svh, 70px) 18px 84px;
          }

          .archive-overview,
          .long-scroll-gates,
          dl {
            grid-template-columns: 1fr;
          }

          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pending-review-strip,
          .section-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .scroll-gate {
            min-height: 0;
          }
        }

        @media (max-width: 430px) {
          .archive-gate h1 {
            font-size: clamp(48px, 15vw, 62px);
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .summary-grid div {
            padding-right: 0;
          }
        }
      `}</style>
    </AssessmentShell>
  )
}
