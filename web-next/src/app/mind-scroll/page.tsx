"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { AssessmentShell } from "@/features/assessment/components"
import { getMindScrollItems, type MindScrollItem } from "@/lib/mind-archive/mindScrollService"
import { DEFAULT_MIND_ARCHIVE_USER_ID } from "@/lib/mind-archive/types"

const reactionLabels = {
  seen: "照见了",
  not_hit: "没照到",
  stopped: "愿止一念",
  still_moving: "心还在动",
} as const

const actionLabels = {
  no_trade: "未交易",
  traded: "还是交易了",
  paused: "停住了",
  watched: "观望了",
  unknown: "待记录",
} as const

const reviewLabels = {
  none: "无需复盘",
  pending: "待复盘",
  completed: "已复盘",
} as const

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

function topValue(values: Array<string | undefined>) {
  const counts = new Map<string, number>()
  values.filter(Boolean).forEach((value) => counts.set(value as string, (counts.get(value as string) ?? 0) + 1))
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "待显影"
}

export default function MindScrollPage() {
  const [items, setItems] = useState<MindScrollItem[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(getMindScrollItems(DEFAULT_MIND_ARCHIVE_USER_ID))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const topThief = topValue(items.map((item) => item.heartThief))
  const repeatedThought = topValue(items.map((item) => item.os))
  const stoppedCount = items.filter((item) => item.userReaction === "stopped").length
  const tradedCount = items.filter((item) => item.actualAction === "traded").length

  return (
    <AssessmentShell background="home-water" contentWidth="wide">
      <main className="mind-scroll-page">
        <header className="scroll-hero">
          <p>心镜长卷</p>
          <h1>这里不记行情，只记你被哪一念牵走。</h1>
          <span>只读取已落印的一念，照回来自神级择优版。</span>
        </header>

        <section className="question-grid" aria-label="心镜长卷回答">
          <article>
            <span>最近心怎么动</span>
            <strong>{items[0]?.os || "待照见"}</strong>
          </article>
          <article>
            <span>哪个心贼常来</span>
            <strong>{topThief}</strong>
          </article>
          <article>
            <span>哪些念头反复出现</span>
            <strong>{repeatedThought}</strong>
          </article>
          <article>
            <span>哪些照回之后停住了</span>
            <strong>{stoppedCount}</strong>
          </article>
          <article>
            <span>哪些照回之后还是交易了</span>
            <strong>{tradedCount}</strong>
          </article>
        </section>

        <section className="scroll-list" aria-label="心念时间线">
          {items.length ? items.map((item) => (
            <article key={item.id}>
              <time>{formatTime(item.updatedAt || item.createdAt)}</time>
              <h2>「{item.os}」</h2>
              <p>{item.reflectionFinal}</p>
              <dl>
                <div>
                  <dt>场景</dt>
                  <dd>{item.tradeMoment || "未标注"}</dd>
                </div>
                <div>
                  <dt>心贼</dt>
                  <dd>{item.heartThief || "待显影"}</dd>
                </div>
                <div>
                  <dt>心证</dt>
                  <dd>{item.heartEvidence || "待补齐"}</dd>
                </div>
                <div>
                  <dt>修行</dt>
                  <dd>{item.practiceText || "待补齐"}</dd>
                </div>
                <div>
                  <dt>反馈</dt>
                  <dd>{item.userReaction ? reactionLabels[item.userReaction] : "未反馈"}</dd>
                </div>
                <div>
                  <dt>动作</dt>
                  <dd>{item.actualAction ? actionLabels[item.actualAction] : "未记录"}</dd>
                </div>
                <div>
                  <dt>复盘</dt>
                  <dd>{item.reviewStatus ? reviewLabels[item.reviewStatus] : "未记录"}</dd>
                </div>
              </dl>
            </article>
          )) : (
            <p className="empty-state">长卷尚未展开。先完成一次照见一念仪轨。</p>
          )}
        </section>

        <div className="scroll-actions">
          <Link href="/mind-archive">回到档案馆</Link>
          <Link href="/zhixing-scroll">进入知行长卷</Link>
        </div>
      </main>

      <style jsx>{`
        .mind-scroll-page {
          width: min(100%, 1120px);
          margin: 0 auto;
          padding: clamp(48px, 8svh, 92px) 20px 96px;
          color: rgba(244, 235, 221, 0.9);
        }

        .scroll-hero {
          margin-bottom: clamp(34px, 6svh, 62px);
          text-align: center;
        }

        .scroll-hero p,
        .question-grid span,
        dt {
          color: rgba(216, 183, 111, 0.62);
          font-size: 13px;
          letter-spacing: 0.2em;
        }

        .scroll-hero h1 {
          margin: 14px auto 16px;
          max-width: 820px;
          font-family: var(--font-serif);
          font-size: clamp(42px, 6vw, 82px);
          font-weight: 400;
          line-height: 1.18;
        }

        .scroll-hero span,
        .empty-state {
          color: rgba(244, 235, 221, 0.48);
        }

        .question-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 34px;
        }

        .question-grid article,
        .scroll-list article {
          border-top: 1px solid rgba(216, 183, 111, 0.18);
          background: rgba(8, 8, 7, 0.16);
        }

        .question-grid article {
          min-height: 140px;
          padding: 18px 16px;
        }

        .question-grid strong {
          display: block;
          margin-top: 18px;
          font-family: var(--font-serif);
          font-size: clamp(28px, 3vw, 42px);
          font-weight: 400;
          line-height: 1.3;
        }

        .scroll-list {
          display: grid;
          gap: 20px;
        }

        .scroll-list article {
          padding: 22px 0 0;
        }

        time {
          color: rgba(244, 235, 221, 0.36);
          font-size: 13px;
        }

        h2 {
          margin: 10px 0;
          font-family: var(--font-serif);
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 400;
        }

        p,
        dd {
          color: rgba(244, 235, 221, 0.64);
          line-height: 1.8;
        }

        dl {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0 0;
        }

        dt,
        dd {
          margin: 0;
        }

        .scroll-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          justify-content: center;
          margin-top: 42px;
        }

        a {
          border-bottom: 1px solid rgba(216, 183, 111, 0.34);
          color: rgba(216, 183, 111, 0.9);
          padding-bottom: 6px;
          text-decoration: none;
        }

        @media (max-width: 900px) {
          .question-grid,
          dl {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AssessmentShell>
  )
}
