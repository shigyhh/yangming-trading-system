"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import {
  AssessmentShell,
  ComplianceNote,
  GlassPanel,
  SecondaryLink,
  StatusPill,
} from "@/features/assessment/components"
import { loadMirrorScrollData } from "@/features/mirror-scroll/scrollEngine"
import type { MirrorScrollData, MirrorScrollNode } from "@/features/mirror-scroll/scrollTypes"
import { cn } from "@/lib/utils"

export default function MirrorScrollPage() {
  const [scrollData, setScrollData] = useState<MirrorScrollData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setScrollData(loadMirrorScrollData())
      setLoaded(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  if (!loaded || !scrollData) {
    return (
      <AssessmentShell contentWidth="wide">
        <StatusPill>正在展开心镜长卷</StatusPill>
      </AssessmentShell>
    )
  }

  return (
    <AssessmentShell className="py-5 md:py-7" contentWidth="wide">
      <div className="mirror-scroll-page mx-auto w-full max-w-[1440px]">
        <section className="mirror-scroll-hero">
          <div>
            <StatusPill>心镜长卷</StatusPill>
            <h1 className="mt-8 font-story text-[clamp(3rem,7.4vw,7rem)] font-light leading-[1.12] tracking-[.08em]">
              心镜长卷
            </h1>
            <p className="mt-6 max-w-[42rem] font-story text-xl font-light leading-10 tracking-[.05em] text-[rgba(220,212,195,.62)]">
              把每天的一念，连成一卷。
            </p>
            <p className="mt-5 max-w-[46rem] font-function text-sm leading-7 text-[rgba(220,212,195,.48)]">
              档案馆保存结构，长卷展开叙事。这里不管理数据，只看见照见如何一日一日沉淀。
            </p>
          </div>

          <GlassPanel className="mirror-scroll-summary">
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">长卷刻度</p>
            <div className="mt-5 grid gap-3">
              <ScrollMeta label="展开天数" value={`${scrollData.summary.dayCount} 日`} />
              <ScrollMeta label="长卷节点" value={`${scrollData.summary.nodeCount} 枚`} />
              <ScrollMeta label="今日心证" value={`${scrollData.summary.heartProofCount} 枚`} />
              <ScrollMeta label="真实复盘" value={`${scrollData.summary.tradeReviewCount} 次`} />
              <ScrollMeta label="循环识别" value={`${scrollData.summary.behaviorLoopCount} 个`} />
            </div>
          </GlassPanel>
        </section>

        <section className="scroll-stage mt-7">
          {scrollData.groups.length ? (
            <div className="scroll-paper">
              {scrollData.groups.map((group, groupIndex) => (
                <section key={group.dateKey} className="scroll-day">
                  <div className="scroll-date">
                    <span>第 {groupIndex + 1} 日</span>
                    <strong>{group.dateLabel}</strong>
                  </div>
                  <div className="scroll-node-stack">
                    {group.nodes.map((node) => (
                      <ScrollNodeCard key={node.id} node={node} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <GlassPanel className="empty-scroll">
              <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">长卷未起笔</p>
              <h2 className="mt-5 font-story text-3xl font-light tracking-[.08em] text-[rgba(242,235,220,.86)]">
                先落下一枚心证。
              </h2>
              <p className="mt-4 font-function text-sm leading-7 text-[rgba(220,212,195,.54)]">
                完成 Day 1 今日修行后，第一条心证会出现在这里。完成真实交易复盘后，长卷会插入复盘节点。
              </p>
            </GlassPanel>
          )}
        </section>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <SecondaryLink href="/mirror-archive" className="w-full">
            回到心镜档案馆 →
          </SecondaryLink>
          <SecondaryLink href="/practice-change?preview=1" className="w-full">
            今日修行 →
          </SecondaryLink>
          <SecondaryLink href="/trade-review" className="w-full">
            真实交易复盘 →
          </SecondaryLink>
        </div>

        <ComplianceNote>
          本页仅用于展示交易心理训练与行为复盘的成长叙事；不预测行情，不提供买卖建议，不构成任何投资建议。
        </ComplianceNote>
      </div>

      <style jsx>{`
        .mirror-scroll-page {
          animation: scroll-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .mirror-scroll-hero {
          display: grid;
          gap: 1.25rem;
          align-items: end;
        }

        .mirror-scroll-summary {
          position: relative;
          overflow: hidden;
        }

        .mirror-scroll-summary::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 0%, rgba(216, 183, 111, 0.07), transparent 15rem),
            radial-gradient(circle at 86% 10%, rgba(95, 132, 117, 0.07), transparent 15rem);
          pointer-events: none;
        }

        .scroll-stage {
          position: relative;
        }

        .scroll-paper {
          position: relative;
          display: grid;
          gap: 2rem;
          overflow: hidden;
          border: 1px solid rgba(172, 146, 83, 0.14);
          border-radius: 8px;
          background:
            linear-gradient(90deg, rgba(216, 183, 111, 0.07), transparent 14%, transparent 86%, rgba(216, 183, 111, 0.06)),
            radial-gradient(circle at 20% 0%, rgba(216, 183, 111, 0.08), transparent 16rem),
            radial-gradient(circle at 80% 40%, rgba(95, 132, 117, 0.08), transparent 18rem),
            rgba(255, 255, 255, 0.018);
          padding: clamp(1rem, 3vw, 2rem);
          box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.28);
        }

        .scroll-paper::before {
          content: "";
          position: absolute;
          top: 2rem;
          bottom: 2rem;
          left: clamp(1.35rem, 5vw, 3rem);
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(216, 183, 111, 0.32), rgba(95, 132, 117, 0.24), transparent);
        }

        .scroll-day {
          position: relative;
          display: grid;
          gap: 1rem;
        }

        .scroll-date {
          display: grid;
          gap: 0.4rem;
          padding-left: clamp(2.35rem, 6vw, 4.2rem);
        }

        .scroll-date span {
          font-family: var(--font-function);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(180, 157, 93, 0.78);
        }

        .scroll-date strong {
          font-family: var(--font-story);
          font-size: 1.5rem;
          font-weight: 300;
          letter-spacing: 0.08em;
          color: rgba(242, 235, 220, 0.82);
        }

        .scroll-node-stack {
          display: grid;
          gap: 1rem;
        }

        @media (min-width: 920px) {
          .mirror-scroll-hero {
            grid-template-columns: minmax(0, 1fr) minmax(360px, 0.34fr);
            min-height: min(42vh, 500px);
          }
        }

        @keyframes scroll-in {
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
      `}</style>
    </AssessmentShell>
  )
}

function ScrollNodeCard({ node }: { node: MirrorScrollNode }) {
  const card = (
    <article className={cn("scroll-node-card", node.isLatest && "is-latest")}>
      <div className="node-orb" aria-hidden="true" />
      <div className="node-body">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-function text-xs font-semibold tracking-[.18em] text-[#b49d5d]">{node.nodeLabel}</p>
            <h2 className="mt-3 font-story text-2xl font-light tracking-[.08em] text-[rgba(242,235,220,.86)]">{node.title}</h2>
            <p className="mt-3 line-clamp-3 font-function text-sm leading-7 text-[rgba(220,212,195,.6)]">{node.summary}</p>
          </div>
          {node.isLatest ? (
            <span className="latest-seal">最新</span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <ScrollField label="当日一念" value={node.thoughtText} />
          <ScrollField label="当日动作" value={node.actionText} />
          <ScrollField label="当日心证" value={node.proofText} wide />
          <ScrollField label="影响维度" value={node.affectedDimensions.length ? node.affectedDimensions.join("、") : "待继续观察"} wide />
        </div>
      </div>

      <style jsx>{`
        .scroll-node-card {
          position: relative;
          display: grid;
          grid-template-columns: clamp(2.35rem, 6vw, 4.2rem) minmax(0, 1fr);
          align-items: start;
        }

        .node-orb {
          position: relative;
          z-index: 1;
          width: 13px;
          height: 13px;
          margin-top: 1.25rem;
          border: 1px solid rgba(216, 183, 111, 0.6);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(242, 235, 220, 0.86), rgba(216, 183, 111, 0.38) 42%, rgba(8, 8, 7, 0.9) 72%);
          box-shadow: 0 0 24px rgba(216, 183, 111, 0.16);
        }

        .node-body {
          min-width: 0;
          border: 1px solid rgba(172, 146, 83, 0.12);
          border-radius: 8px;
          background:
            radial-gradient(circle at 0% 0%, rgba(216, 183, 111, 0.065), transparent 14rem),
            rgba(0, 0, 0, 0.16);
          padding: clamp(1rem, 2vw, 1.25rem);
          transition: border-color 240ms ease, background 240ms ease, transform 240ms ease;
        }

        .scroll-node-card.is-latest .node-body {
          border-color: rgba(216, 183, 111, 0.34);
          background:
            radial-gradient(circle at 0% 0%, rgba(216, 183, 111, 0.13), transparent 16rem),
            radial-gradient(circle at 100% 10%, rgba(95, 132, 117, 0.08), transparent 14rem),
            rgba(0, 0, 0, 0.2);
          box-shadow: 0 0 42px rgba(216, 183, 111, 0.05);
        }

        .latest-seal {
          width: max-content;
          border: 1px solid rgba(216, 183, 111, 0.28);
          border-radius: 999px;
          background: rgba(180, 157, 93, 0.08);
          padding: 0.35rem 0.7rem;
          font-family: var(--font-function);
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          color: rgba(242, 220, 168, 0.86);
        }
      `}</style>
    </article>
  )

  if (!node.detailHref) return card

  return (
    <Link href={node.detailHref} className="block">
      {card}
    </Link>
  )
}

function ScrollField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3", wide && "md:col-span-2")}>
      <p className="font-function text-xs font-semibold tracking-[.14em] text-[rgba(180,157,93,.72)]">{label}</p>
      <p className="mt-2 font-function text-sm leading-7 text-[rgba(220,212,195,.62)]">{value}</p>
    </div>
  )
}

function ScrollMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-[8px] border border-[rgba(172,146,83,.1)] bg-white/[.025] px-4 py-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-center">
      <span className="font-function text-xs tracking-[.1em] text-[rgba(220,212,195,.42)]">{label}</span>
      <span className="min-w-0 break-words text-left font-function text-sm text-[rgba(242,235,220,.72)] sm:text-right">{value}</span>
    </div>
  )
}
