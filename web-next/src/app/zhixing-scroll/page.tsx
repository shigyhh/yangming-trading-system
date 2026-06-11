"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { AssessmentShell } from "@/features/assessment/components"
import {
  getZhixingScrollItems,
  zhixingStateDescriptions,
  type ZhixingScrollItem,
} from "@/lib/mind-archive/zhixingScrollService"
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

function formatBoolean(value: boolean | undefined) {
  if (value === undefined) return "未记录"
  return value ? "是" : "否"
}

export default function ZhixingScrollPage() {
  const [items, setItems] = useState<ZhixingScrollItem[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(getZhixingScrollItems(DEFAULT_MIND_ARCHIVE_USER_ID))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <AssessmentShell background="home-water" contentWidth="wide">
      <main className="zhixing-scroll-page">
        <header className="scroll-hero">
          <p>知行长卷</p>
          <h1>看照见之后，有没有做到。</h1>
          <span>只合并已落印的一念与真实复盘，不重新判断，不生成新照回。</span>
        </header>

        <section className="scroll-list" aria-label="知行长卷时间线">
          {items.length ? items.map((item) => (
            <article key={item.oneThoughtEventId}>
              <time>{formatTime(item.createdAt)}</time>
              <div className="state-line">
                <h2>{item.zhixingState}</h2>
                <span>{zhixingStateDescriptions[item.zhixingState]}</span>
              </div>
              <p>「{item.os}」</p>
              <p>{item.reflectionFinal}</p>
              <dl>
                <div>
                  <dt>反馈</dt>
                  <dd>{item.userReaction ? reactionLabels[item.userReaction] : "未反馈"}</dd>
                </div>
                <div>
                  <dt>动作</dt>
                  <dd>{item.actualAction ? actionLabels[item.actualAction] : "未记录"}</dd>
                </div>
                <div>
                  <dt>标的</dt>
                  <dd>{item.symbol || "未复盘"}</dd>
                </div>
                <div>
                  <dt>盈亏</dt>
                  <dd>{item.pnl ?? "未复盘"}</dd>
                </div>
                <div>
                  <dt>按计划</dt>
                  <dd>{formatBoolean(item.followedPlan)}</dd>
                </div>
                <div>
                  <dt>破戒</dt>
                  <dd>{formatBoolean(item.brokeRule)}</dd>
                </div>
                <div>
                  <dt>复盘心判</dt>
                  <dd>{item.heartJudgement || "未复盘"}</dd>
                </div>
              </dl>
            </article>
          )) : (
            <p className="empty-state">知行长卷尚未展开。先完成一次照见一念，或把待复盘的一念写回真实复盘。</p>
          )}
        </section>

        <div className="scroll-actions">
          <Link href="/mind-archive">回到档案馆</Link>
          <Link href="/mind-scroll">进入心镜长卷</Link>
          <Link href="/review">进入真实复盘</Link>
        </div>
      </main>

      <style jsx>{`
        .zhixing-scroll-page {
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

        .scroll-list {
          display: grid;
          gap: 20px;
        }

        .scroll-list article {
          border-top: 1px solid rgba(216, 183, 111, 0.18);
          background: rgba(8, 8, 7, 0.16);
          padding-top: 22px;
        }

        time {
          color: rgba(244, 235, 221, 0.36);
          font-size: 13px;
        }

        .state-line {
          align-items: baseline;
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin: 10px 0 14px;
        }

        h2 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(34px, 5vw, 64px);
          font-weight: 400;
        }

        .state-line span {
          color: rgba(216, 183, 111, 0.72);
          line-height: 1.8;
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
          dl {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AssessmentShell>
  )
}
