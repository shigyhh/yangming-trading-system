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
  const reviewRailClassName = pendingReviewEvents.length
    ? "review-rail-section has-pending"
    : "review-rail-section is-empty"

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

        <section className="archive-overview-deck" aria-label="档案馆总览台">
          <article className="overview-today-pane">
            <div className="overview-pane-head">
              <p className="section-kicker">今日所照摘要</p>
              <span>只看今日落下的心念痕迹</span>
            </div>
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
              <div>
                <span>止念率</span>
                <strong>{formatPercent(stats?.stopRate ?? 0)}</strong>
              </div>
            </div>
            <p className="archive-note">止念率只看你有没有在一念起时停住。</p>
          </article>

          <article className="overview-thief-pane">
            <div className="overview-pane-head">
              <p className="section-kicker">心贼画像</p>
              <span>近日最强心贼</span>
            </div>
            <h2>近日最强心贼：{strongestHeartThief}</h2>
            <p>{strongestHeartThiefCopy}</p>
          </article>
        </section>

        <div className="archive-main-grid">
          <section className="archive-primary-axis one-thought-ledger" id="one-thought-ledger">
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

          <aside className="archive-side-rail" aria-label="档案馆侧卷入口">
            <section className="long-scroll-gates" aria-label="长卷入口">
              <Link className="scroll-gate" href="/mind-scroll">
                <span className="scroll-gate-line" />
                <span>心镜长卷</span>
                <strong>看心怎么动。</strong>
                <p>这里不记行情，只记你被哪一念牵走。</p>
                <em>进入长卷 →</em>
              </Link>
              <Link className="scroll-gate" href="/zhixing-scroll">
                <span className="scroll-gate-line" />
                <span>知行长卷</span>
                <strong>看照见后有没有做到。</strong>
                <p>照见之后，你到底有没有照着做。</p>
                <em>进入长卷 →</em>
              </Link>
            </section>

            <section className={reviewRailClassName} aria-label="真实复盘入口">
              <div className="section-head">
                <div>
                  <p className="section-kicker">真实复盘入口</p>
                  <h2>{pendingReviewEvents.length ? `待复盘 ${pendingReviewEvents.length}` : "暂无待复盘的一念。"}</h2>
                </div>
              </div>
              {pendingReviewEvents.length ? (
                <div className="pending-list">
                  <p className="review-intro">这一念之后你交易了，后面还欠一次回头看。</p>
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
                <p className="empty-state">最近已写回 {recentTradeReviews.length} 条真实复盘。</p>
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
          </aside>
        </div>

        <div className="archive-actions">
          <PrimaryButton type="button" onClick={() => { window.location.href = "/assessment-entry" }}>
            继续照见一念
          </PrimaryButton>
        </div>
      </main>

      <style jsx>{`
        .mind-archive-page {
          box-sizing: border-box;
          width: min(100%, 1160px);
          margin: 0 auto;
          padding: clamp(44px, 7svh, 86px) 22px 96px;
          color: rgba(244, 235, 221, 0.9);
          overflow: hidden;
        }

        .archive-gate {
          position: relative;
          display: grid;
          justify-items: center;
          text-align: center;
          gap: 12px;
          margin-bottom: clamp(34px, 5svh, 58px);
          padding-bottom: clamp(24px, 4svh, 42px);
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
        .scroll-gate span:not(.scroll-gate-line),
        .pending-list span,
        .archive-volume {
          margin: 0;
          color: rgba(216, 183, 111, 0.68);
          font-size: 13px;
          letter-spacing: 0.18em;
        }

        .archive-gate h1 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(54px, 7vw, 96px);
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
        .overview-pane-head span,
        .overview-thief-pane p,
        .scroll-gate p,
        .ledger-list p,
        .review-intro,
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

        .archive-overview-deck {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 0.64fr) minmax(320px, 0.36fr);
          gap: 0;
          margin-bottom: clamp(28px, 4vw, 38px);
          border-top: 1px solid rgba(216, 183, 111, 0.2);
          border-bottom: 1px solid rgba(216, 183, 111, 0.1);
          background:
            radial-gradient(circle at 18% 20%, rgba(95, 132, 117, 0.09), transparent 32%),
            linear-gradient(180deg, rgba(244, 235, 221, 0.04), rgba(8, 8, 7, 0)),
            linear-gradient(120deg, rgba(216, 183, 111, 0.035), transparent 58%);
        }

        .archive-overview-deck::before {
          content: "";
          position: absolute;
          inset: 22px auto 22px 64%;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(216, 183, 111, 0.16), transparent);
        }

        .overview-today-pane,
        .overview-thief-pane {
          min-width: 0;
          padding: clamp(24px, 3vw, 34px);
        }

        .overview-today-pane {
          display: grid;
          grid-template-columns: minmax(130px, 0.28fr) minmax(0, 1fr);
          gap: 20px 28px;
          align-content: start;
        }

        .overview-pane-head,
        .overview-today-pane .archive-note {
          grid-column: 1 / -1;
        }

        .overview-pane-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .summary-primary {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin: 0;
        }

        .summary-primary strong {
          font-family: var(--font-serif);
          font-size: clamp(54px, 6vw, 78px);
          font-weight: 400;
          line-height: 1;
        }

        .summary-primary span,
        .summary-grid span {
          color: rgba(244, 235, 221, 0.44);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
          border-left: 1px solid rgba(216, 183, 111, 0.1);
          padding-left: 26px;
        }

        .summary-grid div {
          display: grid;
          gap: 8px;
          min-width: 0;
          padding-right: 12px;
        }

        .summary-grid strong {
          font-family: var(--font-serif);
          font-size: clamp(23px, 2.3vw, 30px);
          font-weight: 400;
          line-height: 1.05;
        }

        .archive-note {
          margin: 0;
          border-top: 1px solid rgba(216, 183, 111, 0.1);
          padding-top: 17px;
          line-height: 1.9;
        }

        .overview-thief-pane {
          display: flex;
          min-height: 244px;
          flex-direction: column;
          justify-content: center;
        }

        .overview-thief-pane h2,
        .section-head h2,
        .review-rail-section h2 {
          margin: 12px 0 0;
          font-family: var(--font-serif);
          font-weight: 400;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .overview-thief-pane h2 {
          max-width: 11em;
          font-size: clamp(34px, 4vw, 50px);
          text-wrap: balance;
        }

        .overview-thief-pane p {
          margin: 18px 0 0;
          line-height: 1.9;
          white-space: pre-line;
        }

        .archive-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.67fr) minmax(300px, 0.33fr);
          gap: clamp(24px, 3vw, 32px);
          align-items: start;
        }

        .archive-primary-axis,
        .archive-section,
        .review-rail-section,
        .scroll-gate {
          min-width: 0;
          border-top: 1px solid rgba(216, 183, 111, 0.16);
          background:
            linear-gradient(180deg, rgba(244, 235, 221, 0.03), rgba(8, 8, 7, 0)),
            linear-gradient(120deg, rgba(95, 132, 117, 0.05), transparent 62%);
        }

        .archive-primary-axis {
          padding: clamp(24px, 3vw, 34px) clamp(22px, 3vw, 32px);
        }

        .archive-section,
        .review-rail-section {
          padding: 22px 24px;
        }

        .section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 24px;
        }

        .section-head h2 {
          font-size: clamp(30px, 3.8vw, 46px);
        }

        .archive-side-rail {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
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

        .ledger-list {
          gap: 0;
        }

        .ledger-list article {
          position: relative;
          min-width: 0;
          border-left: 1px solid rgba(216, 183, 111, 0.16);
          padding: 0 0 28px 24px;
        }

        .ledger-list article::before {
          content: "";
          position: absolute;
          top: 8px;
          left: -4px;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(216, 183, 111, 0.72);
          box-shadow: 0 0 22px rgba(216, 183, 111, 0.22);
        }

        .ledger-list article:last-child {
          padding-bottom: 0;
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
        .review-intro,
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
          grid-template-columns: 1fr;
          gap: 16px;
          order: 1;
        }

        .scroll-gate {
          position: relative;
          display: grid;
          gap: 12px;
          min-height: 164px;
          overflow: hidden;
          padding: 24px 26px 22px 32px;
          border-bottom: 1px solid rgba(216, 183, 111, 0.1);
          background:
            linear-gradient(90deg, rgba(216, 183, 111, 0.055), transparent 18%),
            linear-gradient(180deg, rgba(244, 235, 221, 0.03), rgba(8, 8, 7, 0));
        }

        .scroll-gate::after {
          content: "";
          position: absolute;
          top: 18px;
          right: 18px;
          bottom: 18px;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(216, 183, 111, 0.16), transparent);
        }

        .scroll-gate-line {
          position: absolute;
          top: 22px;
          bottom: 22px;
          left: 15px;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(216, 183, 111, 0.28), transparent);
        }

        .scroll-gate strong {
          color: rgba(244, 235, 221, 0.9);
          font-family: var(--font-serif);
          font-size: clamp(28px, 3vw, 36px);
          font-weight: 400;
          line-height: 1.22;
        }

        .scroll-gate p {
          margin: 0;
          line-height: 1.85;
        }

        .scroll-gate em {
          color: rgba(216, 183, 111, 0.86);
          font-style: normal;
          letter-spacing: 0.08em;
        }

        .review-rail-section {
          order: 2;
          background:
            linear-gradient(180deg, rgba(244, 235, 221, 0.025), rgba(8, 8, 7, 0)),
            linear-gradient(120deg, rgba(120, 60, 45, 0.045), transparent 70%);
        }

        .review-rail-section h2 {
          font-size: clamp(23px, 2.2vw, 30px);
        }

        .review-rail-section.is-empty {
          padding-block: 18px;
          opacity: 0.76;
        }

        .review-rail-section.is-empty .section-head {
          margin-bottom: 10px;
        }

        .review-rail-section.is-empty h2 {
          font-size: 22px;
        }

        .review-intro {
          border-bottom: 1px solid rgba(216, 183, 111, 0.1);
          padding-bottom: 16px;
        }

        .repeat-list article,
        .pending-list article,
        .guard-reminder {
          min-width: 0;
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          padding-top: 16px;
        }

        .recurring-section {
          order: 3;
        }

        .guard-section {
          order: 4;
        }

        .repeat-list h3 {
          margin-bottom: 8px;
        }

        .guard-reminder span {
          color: rgba(216, 183, 111, 0.84);
          letter-spacing: 0.1em;
        }

        .archive-side-rail .archive-section {
          background:
            linear-gradient(180deg, rgba(244, 235, 221, 0.025), rgba(8, 8, 7, 0)),
            linear-gradient(120deg, rgba(120, 60, 45, 0.035), transparent 62%);
        }

        .archive-side-rail .section-head {
          align-items: flex-start;
          flex-direction: column;
        }

        .archive-side-rail .section-head h2 {
          font-size: clamp(23px, 2.2vw, 30px);
          line-height: 1.42;
        }

        .archive-actions {
          display: flex;
          justify-content: center;
          margin-top: 46px;
        }

        @media (max-width: 980px) {
          .mind-archive-page {
            padding: clamp(38px, 7svh, 70px) 18px 84px;
          }

          .archive-overview-deck,
          .archive-main-grid,
          dl {
            grid-template-columns: 1fr;
          }

          .archive-overview-deck::before {
            display: none;
          }

          .overview-thief-pane {
            min-height: 0;
            border-top: 1px solid rgba(216, 183, 111, 0.1);
          }

          .archive-side-rail {
            display: flex;
          }
        }

        @media (max-width: 720px) {
          .archive-gate {
            margin-bottom: 30px;
          }

          .archive-gate h1 {
            font-size: clamp(48px, 15vw, 62px);
          }

          .overview-today-pane {
            grid-template-columns: 1fr;
          }

          .overview-pane-head,
          .section-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            border-left: 0;
            border-top: 1px solid rgba(216, 183, 111, 0.12);
            padding-top: 18px;
            padding-left: 0;
          }

          .summary-grid div {
            padding-right: 0;
          }

          .archive-primary-axis,
          .overview-today-pane,
          .overview-thief-pane,
          .archive-section,
          .review-rail-section,
          .scroll-gate {
            padding-inline: 18px;
          }

          .review-rail-section {
            order: 1;
          }

          .long-scroll-gates {
            order: 2;
          }

          .recurring-section {
            order: 3;
          }

          .guard-section {
            order: 4;
          }

          .scroll-gate {
            min-height: 0;
          }
        }
      `}</style>
    </AssessmentShell>
  )
}
