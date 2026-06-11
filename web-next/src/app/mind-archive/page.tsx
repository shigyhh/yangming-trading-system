"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { AssessmentShell, PrimaryButton } from "@/features/assessment/components"
import { getMindArchiveStats } from "@/lib/mind-archive/archiveStatsService"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type ArchiveStats,
  type ReviewStatus,
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

export default function MindArchivePage() {
  const [stats, setStats] = useState<ArchiveStats | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStats(getMindArchiveStats(DEFAULT_MIND_ARCHIVE_USER_ID))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <AssessmentShell background="home-water" contentWidth="wide">
      <main className="mind-archive-page">
        <header className="archive-hero">
          <p>心镜档案</p>
          <h1>一念档案</h1>
          <span>胜率看结果，止念率看功夫。</span>
        </header>

        <section className="archive-grid" aria-label="一念档案统计">
          <article>
            <span>今日所照</span>
            <strong>{stats?.todayTotal ?? 0}</strong>
            <p>照见了 {stats?.todaySeen ?? 0} · 没照到 {stats?.todayNotHit ?? 0} · 愿止 {stats?.todayStopped ?? 0} · 心还在动 {stats?.todayStillMoving ?? 0}</p>
          </article>
          <article>
            <span>止念率</span>
            <strong>{formatPercent(stats?.stopRate ?? 0)}</strong>
            <p>胜率看结果，止念率看功夫。</p>
          </article>
          <article>
            <span>待复盘</span>
            <strong>{stats?.pendingReviewCount ?? 0}</strong>
            <p>这一念之后你交易了，后面还欠一次回头看。</p>
          </article>
        </section>

        <section className="archive-section">
          <div className="section-head">
            <p>最近一念</p>
            <Link href="/today-sealed">查看今日所照</Link>
          </div>
          {stats?.recentEvents.length ? (
            <div className="recent-list">
              {stats.recentEvents.map((event) => (
                <article key={event.id}>
                  <time>{formatTime(event.updatedAt || event.createdAt)}</time>
                  <h3>「{event.os}」</h3>
                  <p>{event.reflectionFinal}</p>
                  <dl>
                    <div>
                      <dt>心贼</dt>
                      <dd>{event.heartThief || "待补齐"}</dd>
                    </div>
                    <div>
                      <dt>刺痛点</dt>
                      <dd>{event.painPoint || "未标注"}</dd>
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
                      <dd>{event.tradeReviewId ? "已复盘" : reviewStatusLabels[event.reviewStatus || "none"]}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">今日还没有照见。先照一念，档案才会说话。</p>
          )}
        </section>

        <section className="archive-columns">
          <article className="archive-section">
            <p>高频心贼</p>
            {stats?.topHeartThieves.length ? (
              stats.topHeartThieves.slice(0, 6).map((item) => (
                <div className="stat-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            ) : (
              <span className="muted">心贼标签待补齐</span>
            )}
          </article>
          <article className="archive-section">
            <p>高频场景</p>
            {stats?.topScenes.length ? (
              stats.topScenes.slice(0, 6).map((item) => (
                <div className="stat-row" key={item.sceneId}>
                  <span>{item.tradeMoment || item.sceneId}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            ) : (
              <span className="muted">还没有足够场景记录</span>
            )}
          </article>
        </section>

        <section className="archive-section">
          <p>复发念</p>
          {stats?.recurringThoughts.length ? (
            <div className="repeat-list">
              {stats.recurringThoughts.slice(0, 5).map((item) => (
                <article key={item.key}>
                  <h3>「{item.os}」</h3>
                  <span>
                    {item.tradeMoment} · 出现 {item.count} 次 · 最后 {formatTime(item.lastSeenAt)}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">你以为是新行情，档案里看，是旧心贼换了张脸。</p>
          )}
        </section>

        <section className="archive-section">
          <p>待复盘</p>
          {stats?.pendingReviewEvents.length ? (
            <div className="pending-list">
              {stats.pendingReviewEvents.map((event) => (
                <article key={event.id}>
                  <time>{formatTime(event.updatedAt || event.createdAt)}</time>
                  <h3>「{event.os}」</h3>
                  <p>{event.reflectionFinal}</p>
                  <span>{event.heartThief || "心贼标签待补齐"}</span>
                  <Link href={`/review?linkedOneThoughtEventId=${encodeURIComponent(event.id)}`}>
                    进入真实复盘
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">这一念之后你交易了，后面还欠一次回头看。</p>
          )}
        </section>

        <div className="archive-actions">
          <PrimaryButton type="button" onClick={() => { window.location.href = "/assessment-entry" }}>
            继续照见一念
          </PrimaryButton>
          <Link href="/lake">众念心湖</Link>
        </div>
      </main>

      <style jsx>{`
        .mind-archive-page {
          width: min(100%, 1120px);
          margin: 0 auto;
          padding: clamp(48px, 8svh, 92px) 20px 96px;
          color: rgba(244, 235, 221, 0.9);
        }

        .archive-hero {
          text-align: center;
          margin-bottom: clamp(36px, 6svh, 64px);
        }

        .archive-hero p,
        .archive-section > p,
        .section-head p {
          margin: 0;
          color: rgba(216, 183, 111, 0.62);
          font-size: 14px;
          letter-spacing: 0.22em;
        }

        .archive-hero h1 {
          margin: 12px 0 16px;
          font-family: var(--font-serif);
          font-size: clamp(58px, 8vw, 112px);
          font-weight: 400;
          line-height: 1.1;
        }

        .archive-hero span,
        .empty-state,
        .muted {
          color: rgba(244, 235, 221, 0.46);
        }

        .archive-grid,
        .archive-columns {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 22px;
        }

        .archive-columns {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .archive-grid article,
        .archive-section {
          border-top: 1px solid rgba(216, 183, 111, 0.18);
          background: rgba(8, 8, 7, 0.18);
          padding: 22px 0 0;
        }

        .archive-grid span,
        dt,
        .pending-list span {
          color: rgba(216, 183, 111, 0.56);
          font-size: 13px;
          letter-spacing: 0.14em;
        }

        .archive-grid strong {
          display: block;
          margin: 10px 0 4px;
          font-family: var(--font-serif);
          font-size: clamp(38px, 4vw, 58px);
          font-weight: 400;
        }

        .archive-grid p,
        dd,
        .recent-list p {
          color: rgba(244, 235, 221, 0.64);
          line-height: 1.8;
        }

        .archive-section {
          margin-bottom: 28px;
        }

        .archive-risk h2 {
          margin: 18px 0 0;
          white-space: pre-line;
          font-family: var(--font-serif);
          font-size: clamp(28px, 4vw, 52px);
          font-weight: 400;
          line-height: 1.55;
        }

        .section-head {
          display: flex;
          align-items: center;
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

        .recent-list,
        .repeat-list,
        .pending-list {
          display: grid;
          gap: 18px;
        }

        .recent-list article,
        .repeat-list article,
        .pending-list article {
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          padding-top: 18px;
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
        }

        dl {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0 0;
        }

        dt,
        dd {
          margin: 0;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid rgba(216, 183, 111, 0.1);
          padding: 14px 0;
        }

        .stat-row span,
        .repeat-list span {
          color: rgba(244, 235, 221, 0.62);
        }

        .stat-row strong {
          color: rgba(216, 183, 111, 0.86);
          font-weight: 400;
        }

        .archive-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 18px;
          margin-top: 46px;
        }

        @media (max-width: 800px) {
          .archive-grid,
          .archive-columns,
          dl {
            grid-template-columns: 1fr;
          }

          .section-head {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </AssessmentShell>
  )
}
