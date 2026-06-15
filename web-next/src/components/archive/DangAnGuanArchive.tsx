"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import ArchiveRuleGuardPanel from "@/components/archive/ArchiveRuleGuardPanel"
import CycleMirrorPanel from "@/components/archive/CycleMirrorPanel"
import {
  CAPITAL_STABILITY_MISSING_LABEL,
  capitalStabilityLevelLabels,
} from "@/lib/mind-archive/types"
import type { CycleMirrorResult } from "@/lib/mind-archive/cycleMirrorService"
import type {
  ReviewArchiveItem,
  ReviewArchiveStats,
  ReviewRiskSignal,
} from "@/lib/mind-archive/reviewArchiveService"

const GOLD = "#c8ab6f"
const INK = "#ece9e1"
const SUB = "#a7a9a1"
const DIM = "#727b76"
const HAIR = "rgba(200,171,111,0.16)"
const PANEL = "rgba(255,255,255,0.012)"
const SERIF = '"Source Han Serif SC","Noto Serif SC","Songti SC",serif'

export type ArchiveSummary = {
  todaySealedCount: number
  seenCount: number
  stoppedCount: number
  stillMovingCount: number
  pendingReviewCount: number
  stopRate: number
}

export type StrongestHeartThief = {
  name?: string
  riskLabel?: string
}

export type ThoughtEntry = {
  id: string
  time: string
  tradeMoment: string
  os: string
  reflectionFinal: string
  heartThief?: string
  userReaction?: "seen" | "not_hit" | "stopped" | "still_moving"
  actualAction?: "no_trade" | "traded" | "paused" | "watched" | "unknown"
  reviewStatus?: "none" | "pending" | "completed"
  heartJudgement?: "zheng_sheng" | "zei_sheng" | "zheng_kui" | "shuang_shu"
  marketContextSummary?: string
  practiceText?: string
  capitalStabilityLabel?: string
  capitalStabilityPracticeText?: string
}

export type RecurringThought = {
  key: string
  os: string
  count: number
  lastSeenAt?: string
}

export type DangAnGuanArchiveProps = {
  summary?: Partial<ArchiveSummary>
  strongestHeartThief?: StrongestHeartThief
  recentEntries?: ThoughtEntry[]
  recurringThoughts?: RecurringThought[]
  completedReviewCount?: number
  reviewArchiveItems?: ReviewArchiveItem[]
  reviewArchiveStats?: Partial<ReviewArchiveStats>
  reviewRiskSignals?: ReviewRiskSignal[]
  cycleMirror?: CycleMirrorResult | null
  reviewByEventId?: Record<
    string,
    Pick<
      ThoughtEntry,
      "heartJudgement" | "marketContextSummary" | "practiceText" | "capitalStabilityLabel" | "capitalStabilityPracticeText"
    >
  >
  onOpenMindArchive?: () => void
  onOpenHeartMirrorScroll?: () => void
  onOpenZhixingScroll?: () => void
  onOpenTradeReview?: () => void
  onContinueRitual?: () => void
  className?: string
}

const reactionLabel: Record<NonNullable<ThoughtEntry["userReaction"]>, string> = {
  seen: "照见了",
  not_hit: "没照到",
  stopped: "愿止一念",
  still_moving: "心还在动",
}

const actionLabel: Record<NonNullable<ThoughtEntry["actualAction"]>, string> = {
  no_trade: "未交易",
  traded: "还是交易了",
  paused: "停住了",
  watched: "观望了",
  unknown: "待记录",
}

const reviewLabel: Record<NonNullable<ThoughtEntry["reviewStatus"]>, string> = {
  none: "无需复盘",
  pending: "待复盘",
  completed: "已复盘",
}

const heartJudgementLabel: Record<NonNullable<ThoughtEntry["heartJudgement"]>, string> = {
  zheng_sheng: "正胜",
  zei_sheng: "贼胜",
  zheng_kui: "正亏",
  shuang_shu: "双输",
}

const fallbackSummary: ArchiveSummary = {
  todaySealedCount: 0,
  seenCount: 0,
  stoppedCount: 0,
  stillMovingCount: 0,
  pendingReviewCount: 0,
  stopRate: 0,
}

const fallbackReviewArchiveStats: ReviewArchiveStats = {
  heartJudgementCounts: {
    zhengSheng: 0,
    zeiSheng: 0,
    zhengKui: 0,
    shuangShu: 0,
    missing: 0,
  },
  capitalStabilityCounts: {
    stableWithGuard: 0,
    moneyStableHeartMoving: 0,
    moneyMovingHeartChaotic: 0,
    doubleUnstable: 0,
    insufficientData: 0,
    missing: 0,
  },
  behaviorCounts: {
    brokeRule: 0,
    addedPosition: 0,
    movedStopLoss: 0,
    changedPlanIntraday: 0,
    stillMovingThenTraded: 0,
  },
  marketContextCounts: {
    hasMarketContext: 0,
    missingMarketContext: 0,
  },
}

const fallbackStrongestHeartThief: Required<StrongestHeartThief> = {
  name: "待显影",
  riskLabel: "先照一念，档案才会说话。",
}

function safeCount(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0
}

function formatHeartJudgement(value: ReviewArchiveItem["heartJudgement"]) {
  return value ? heartJudgementLabel[value] : "未记录"
}

function formatCapitalStability(value: ReviewArchiveItem["capitalStabilityLevel"]) {
  return value ? capitalStabilityLevelLabels[value] : CAPITAL_STABILITY_MISSING_LABEL
}

function formatPlan(value: boolean | undefined) {
  if (value === undefined) return "未记录"
  return value ? "守计划" : "未守计划"
}

function formatRule(value: boolean | undefined) {
  if (value === undefined) return "未记录"
  return value ? "破戒" : "未破戒"
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const raf = window.requestAnimationFrame(() => setReduced(media.matches))

    const onChange = () => setReduced(media.matches)
    media.addEventListener?.("change", onChange)
    return () => {
      window.cancelAnimationFrame(raf)
      media.removeEventListener?.("change", onChange)
    }
  }, [])

  return reduced
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        const root = document.documentElement
        const max = Math.max(1, root.scrollHeight - root.clientHeight)
        setProgress(Math.min(1, Math.max(0, root.scrollTop / max)))
        raf = 0
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  return progress
}

function Reveal({ children, delay = 0, disabled = false }: { children: ReactNode; delay?: number; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(disabled)

  useEffect(() => {
    if (disabled) {
      const raf = window.requestAnimationFrame(() => setShown(true))
      return () => window.cancelAnimationFrame(raf)
    }

    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -7% 0px" },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [disabled])

  return (
    <div ref={ref} className={`danganguan-unroll${shown ? " is-in" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

export default function DangAnGuanArchive({
  summary,
  strongestHeartThief,
  recentEntries,
  recurringThoughts = [],
  completedReviewCount = 0,
  reviewArchiveItems = [],
  reviewArchiveStats,
  reviewRiskSignals = [],
  cycleMirror,
  reviewByEventId = {},
  onOpenMindArchive,
  onOpenHeartMirrorScroll,
  onOpenZhixingScroll,
  onOpenTradeReview,
  onContinueRitual,
  className = "",
}: DangAnGuanArchiveProps) {
  const reduced = useReducedMotion()
  const progress = useScrollProgress()
  const safeSummary: ArchiveSummary = {
    todaySealedCount: safeCount(summary?.todaySealedCount ?? fallbackSummary.todaySealedCount),
    seenCount: safeCount(summary?.seenCount ?? fallbackSummary.seenCount),
    stoppedCount: safeCount(summary?.stoppedCount ?? fallbackSummary.stoppedCount),
    stillMovingCount: safeCount(summary?.stillMovingCount ?? fallbackSummary.stillMovingCount),
    pendingReviewCount: safeCount(summary?.pendingReviewCount ?? fallbackSummary.pendingReviewCount),
    stopRate: safeCount(summary?.stopRate ?? fallbackSummary.stopRate),
  }
  const safeReviewArchiveStats: ReviewArchiveStats = {
    heartJudgementCounts: {
      zhengSheng: safeCount(reviewArchiveStats?.heartJudgementCounts?.zhengSheng ?? fallbackReviewArchiveStats.heartJudgementCounts.zhengSheng),
      zeiSheng: safeCount(reviewArchiveStats?.heartJudgementCounts?.zeiSheng ?? fallbackReviewArchiveStats.heartJudgementCounts.zeiSheng),
      zhengKui: safeCount(reviewArchiveStats?.heartJudgementCounts?.zhengKui ?? fallbackReviewArchiveStats.heartJudgementCounts.zhengKui),
      shuangShu: safeCount(reviewArchiveStats?.heartJudgementCounts?.shuangShu ?? fallbackReviewArchiveStats.heartJudgementCounts.shuangShu),
      missing: safeCount(reviewArchiveStats?.heartJudgementCounts?.missing ?? fallbackReviewArchiveStats.heartJudgementCounts.missing),
    },
    capitalStabilityCounts: {
      stableWithGuard: safeCount(reviewArchiveStats?.capitalStabilityCounts?.stableWithGuard ?? fallbackReviewArchiveStats.capitalStabilityCounts.stableWithGuard),
      moneyStableHeartMoving: safeCount(reviewArchiveStats?.capitalStabilityCounts?.moneyStableHeartMoving ?? fallbackReviewArchiveStats.capitalStabilityCounts.moneyStableHeartMoving),
      moneyMovingHeartChaotic: safeCount(reviewArchiveStats?.capitalStabilityCounts?.moneyMovingHeartChaotic ?? fallbackReviewArchiveStats.capitalStabilityCounts.moneyMovingHeartChaotic),
      doubleUnstable: safeCount(reviewArchiveStats?.capitalStabilityCounts?.doubleUnstable ?? fallbackReviewArchiveStats.capitalStabilityCounts.doubleUnstable),
      insufficientData: safeCount(reviewArchiveStats?.capitalStabilityCounts?.insufficientData ?? fallbackReviewArchiveStats.capitalStabilityCounts.insufficientData),
      missing: safeCount(reviewArchiveStats?.capitalStabilityCounts?.missing ?? fallbackReviewArchiveStats.capitalStabilityCounts.missing),
    },
    behaviorCounts: {
      brokeRule: safeCount(reviewArchiveStats?.behaviorCounts?.brokeRule ?? fallbackReviewArchiveStats.behaviorCounts.brokeRule),
      addedPosition: safeCount(reviewArchiveStats?.behaviorCounts?.addedPosition ?? fallbackReviewArchiveStats.behaviorCounts.addedPosition),
      movedStopLoss: safeCount(reviewArchiveStats?.behaviorCounts?.movedStopLoss ?? fallbackReviewArchiveStats.behaviorCounts.movedStopLoss),
      changedPlanIntraday: safeCount(reviewArchiveStats?.behaviorCounts?.changedPlanIntraday ?? fallbackReviewArchiveStats.behaviorCounts.changedPlanIntraday),
      stillMovingThenTraded: safeCount(reviewArchiveStats?.behaviorCounts?.stillMovingThenTraded ?? fallbackReviewArchiveStats.behaviorCounts.stillMovingThenTraded),
    },
    marketContextCounts: {
      hasMarketContext: safeCount(reviewArchiveStats?.marketContextCounts?.hasMarketContext ?? fallbackReviewArchiveStats.marketContextCounts.hasMarketContext),
      missingMarketContext: safeCount(reviewArchiveStats?.marketContextCounts?.missingMarketContext ?? fallbackReviewArchiveStats.marketContextCounts.missingMarketContext),
    },
  }
  const safeRecentEntries = recentEntries ?? []
  const safeReviewArchiveItems = reviewArchiveItems
  const safeRecurringThoughts = recurringThoughts ?? []
  const safeReviewRiskSignals = reviewRiskSignals

  const stats = useMemo(
    () => [
      { k: "今日落印", v: safeSummary.todaySealedCount },
      { k: "照见了", v: safeSummary.seenCount },
      { k: "愿止一念", v: safeSummary.stoppedCount },
      { k: "心还在动", v: safeSummary.stillMovingCount },
      { k: "待复盘", v: safeSummary.pendingReviewCount },
    ],
    [safeSummary.pendingReviewCount, safeSummary.seenCount, safeSummary.stillMovingCount, safeSummary.stoppedCount, safeSummary.todaySealedCount],
  )
  const reviewStatGroups = useMemo(
    () => [
      {
        title: "心判统计",
        items: [
          { k: "正胜", v: safeReviewArchiveStats.heartJudgementCounts.zhengSheng },
          { k: "贼胜", v: safeReviewArchiveStats.heartJudgementCounts.zeiSheng },
          { k: "正亏", v: safeReviewArchiveStats.heartJudgementCounts.zhengKui },
          { k: "双输", v: safeReviewArchiveStats.heartJudgementCounts.shuangShu },
          { k: "未记录", v: safeReviewArchiveStats.heartJudgementCounts.missing },
        ],
      },
      {
        title: "资金稳定概览",
        items: [
          { k: "稳中有戒", v: safeReviewArchiveStats.capitalStabilityCounts.stableWithGuard },
          { k: "钱稳心动", v: safeReviewArchiveStats.capitalStabilityCounts.moneyStableHeartMoving },
          { k: "钱动心乱", v: safeReviewArchiveStats.capitalStabilityCounts.moneyMovingHeartChaotic },
          { k: "双失守", v: safeReviewArchiveStats.capitalStabilityCounts.doubleUnstable },
          { k: "数据不足", v: safeReviewArchiveStats.capitalStabilityCounts.insufficientData },
          { k: "资金证未记录", v: safeReviewArchiveStats.capitalStabilityCounts.missing },
        ],
      },
      {
        title: "行为统计",
        items: [
          { k: "破戒", v: safeReviewArchiveStats.behaviorCounts.brokeRule },
          { k: "加仓", v: safeReviewArchiveStats.behaviorCounts.addedPosition },
          { k: "移动止损", v: safeReviewArchiveStats.behaviorCounts.movedStopLoss },
          { k: "临盘改计划", v: safeReviewArchiveStats.behaviorCounts.changedPlanIntraday },
          { k: "心还在动仍交易", v: safeReviewArchiveStats.behaviorCounts.stillMovingThenTraded },
        ],
      },
      {
        title: "盘证统计",
        items: [
          { k: "已有盘证", v: safeReviewArchiveStats.marketContextCounts.hasMarketContext },
          { k: "盘证未记录", v: safeReviewArchiveStats.marketContextCounts.missingMarketContext },
        ],
      },
    ],
    [
      safeReviewArchiveStats.behaviorCounts.addedPosition,
      safeReviewArchiveStats.behaviorCounts.brokeRule,
      safeReviewArchiveStats.behaviorCounts.changedPlanIntraday,
      safeReviewArchiveStats.behaviorCounts.movedStopLoss,
      safeReviewArchiveStats.behaviorCounts.stillMovingThenTraded,
      safeReviewArchiveStats.capitalStabilityCounts.doubleUnstable,
      safeReviewArchiveStats.capitalStabilityCounts.insufficientData,
      safeReviewArchiveStats.capitalStabilityCounts.missing,
      safeReviewArchiveStats.capitalStabilityCounts.moneyMovingHeartChaotic,
      safeReviewArchiveStats.capitalStabilityCounts.moneyStableHeartMoving,
      safeReviewArchiveStats.capitalStabilityCounts.stableWithGuard,
      safeReviewArchiveStats.heartJudgementCounts.missing,
      safeReviewArchiveStats.heartJudgementCounts.shuangShu,
      safeReviewArchiveStats.heartJudgementCounts.zhengKui,
      safeReviewArchiveStats.heartJudgementCounts.zhengSheng,
      safeReviewArchiveStats.heartJudgementCounts.zeiSheng,
      safeReviewArchiveStats.marketContextCounts.hasMarketContext,
      safeReviewArchiveStats.marketContextCounts.missingMarketContext,
    ],
  )
  const archiveReviewByEventId = useMemo(() => {
    const fromItems = Object.fromEntries(
      safeReviewArchiveItems
        .filter((item) => Boolean(item.linkedOneThoughtEventId))
        .map((item) => [
          item.linkedOneThoughtEventId as string,
          {
            heartJudgement: item.heartJudgement,
            marketContextSummary: item.marketText,
            practiceText: item.practiceText,
            capitalStabilityLabel: formatCapitalStability(item.capitalStabilityLevel),
            capitalStabilityPracticeText: item.capitalPracticeText,
          },
        ]),
    )

    return {
      ...fromItems,
      ...reviewByEventId,
    }
  }, [reviewByEventId, safeReviewArchiveItems])

  const heartName = strongestHeartThief?.name?.trim() || fallbackStrongestHeartThief.name
  const riskLabel = strongestHeartThief?.riskLabel?.trim() || fallbackStrongestHeartThief.riskLabel
  const hasPendingReview = safeSummary.pendingReviewCount > 0

  return (
    <main className={`danganguan-page ${className}`}>
      <style>{CSS}</style>

      <div className="danganguan-thread" aria-hidden="true">
        <div className="danganguan-thread-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="danganguan-mount">
        <div className="danganguan-silk danganguan-silk-left" aria-hidden="true" />
        <div className="danganguan-silk danganguan-silk-right" aria-hidden="true" />

        <Rod top />

        <div className="danganguan-huaxin">
          <Reveal disabled={reduced}>
            <header className="danganguan-intro">
              <div className="danganguan-eyebrow-center">私人修行总入口</div>
              <h1>档案馆</h1>
              <p className="danganguan-lead">这里收藏你已照见、已落印、已复盘的一念。</p>
              <p className="danganguan-lead-sub">不记行情，只记你被哪一念牵走，又有没有照着做。</p>
              <div className="danganguan-current-scroll">当前卷：一念档案</div>
            </header>
          </Reveal>

          <Divider />

          <Reveal disabled={reduced}>
            <section className="danganguan-overview" aria-label="今日所照与近日最强心贼">
              <div className="danganguan-overview-left" aria-label="今日所照">
                <div className="danganguan-eyebrow">今日所照</div>
                <div className="danganguan-stats">
                  {stats.map((item) => (
                    <div className="danganguan-stat" key={item.k}>
                      <div className="danganguan-stat-value">{item.v}</div>
                      <div className="danganguan-stat-key">{item.k}</div>
                    </div>
                  ))}
                </div>
                <p className="danganguan-stop-rate">止念率 {Math.round(safeSummary.stopRate * 100)}%，只看你有没有在一念起时停住。</p>
              </div>

              <div className="danganguan-overview-right">
                <div className="danganguan-eyebrow">心贼画像</div>
                <p className="danganguan-heart-name">近日最强心贼：{heartName}</p>
                <p className="danganguan-heart-line">{riskLabel}</p>
                <button type="button" className="danganguan-text-link" onClick={onContinueRitual}>
                  继续照见一念 →
                </button>
              </div>
            </section>
          </Reveal>

          <Divider />

          <div className="danganguan-body">
            <section className="danganguan-main-axis" id="one-thought-ledger" aria-label="一念档案摘要">
              <Reveal disabled={reduced}>
                <div className="danganguan-section-head">
                  <div>
                    <div className="danganguan-eyebrow">一念档案摘要</div>
                    <h2>最近一念</h2>
                  </div>
                  <a href="#one-thought-ledger" className="danganguan-text-link" onClick={() => onOpenMindArchive?.()}>
                    查看一念档案 →
                  </a>
                </div>
              </Reveal>

              <div className="danganguan-timeline">
                {safeRecentEntries.length > 0 ? (
                  safeRecentEntries.slice(0, 5).map((entry, index) => {
                    const linkedReview = archiveReviewByEventId[entry.id]

                    return (
                      <Reveal disabled={reduced} delay={index * 90} key={entry.id}>
                        <article className="danganguan-entry">
                          <span className="danganguan-node" aria-hidden="true" />
                          <div className="danganguan-entry-head">
                            <span>{entry.time}</span>
                            <span>{entry.tradeMoment}</span>
                          </div>
                          <p className="danganguan-say">「{entry.os}」</p>
                          <p className="danganguan-reflection">{entry.reflectionFinal}</p>
                          <div className="danganguan-meta">
                            <Meta label="心贼" value={entry.heartThief || "待显影"} active />
                            <Meta label="反馈" value={entry.userReaction ? reactionLabel[entry.userReaction] : "待记录"} active />
                            <Meta label="动作" value={entry.actualAction ? actionLabel[entry.actualAction] : "待记录"} />
                            <Meta label="复盘" value={entry.reviewStatus ? reviewLabel[entry.reviewStatus] : "待记录"} />
                            {linkedReview?.heartJudgement ? (
                              <Meta label="心判" value={heartJudgementLabel[linkedReview.heartJudgement]} active />
                            ) : null}
                            {linkedReview ? (
                              <Meta
                                label="资金"
                                value={linkedReview.capitalStabilityLabel || CAPITAL_STABILITY_MISSING_LABEL}
                                active={Boolean(
                                  linkedReview.capitalStabilityLabel &&
                                    linkedReview.capitalStabilityLabel !== CAPITAL_STABILITY_MISSING_LABEL,
                                )}
                              />
                            ) : null}
                            {linkedReview?.marketContextSummary ? (
                              <Meta label="盘证" value={linkedReview.marketContextSummary} />
                            ) : null}
                            {linkedReview?.capitalStabilityPracticeText ? (
                              <Meta label="资金修行" value={linkedReview.capitalStabilityPracticeText} />
                            ) : null}
                            {linkedReview?.practiceText ? (
                              <Meta label="下次修行" value={linkedReview.practiceText} />
                            ) : null}
                          </div>
                        </article>
                      </Reveal>
                    )
                  })
                ) : (
                  <Reveal disabled={reduced}>
                    <div className="danganguan-empty-main">
                      暂无落印的一念。
                      <br />
                      先完成一次照见一念仪轨，档案馆才会留下第一痕。
                    </div>
                  </Reveal>
                )}
              </div>
            </section>

            <aside className="danganguan-side-axis" aria-label="长卷入口与旁证">
              <Reveal disabled={reduced}>
                <LongScrollCard
                  title="心镜长卷"
                  subtitle="看心怎么动。"
                  line="这里不记行情，只记你被哪一念牵走。"
                  action="进入长卷 →"
                  onClick={onOpenHeartMirrorScroll}
                />
              </Reveal>

              <Reveal disabled={reduced} delay={90}>
                <LongScrollCard
                  title="知行长卷"
                  subtitle="看照见后有没有做到。"
                  line="照见之后，你到底有没有照着做。"
                  action="进入长卷 →"
                  onClick={onOpenZhixingScroll}
                />
              </Reveal>

              <Reveal disabled={reduced} delay={160}>
                <section className="danganguan-side-block" aria-label="真实复盘入口">
                  <div className="danganguan-eyebrow">真实复盘</div>
                  {hasPendingReview ? (
                    <>
                      <h3>待复盘 {safeSummary.pendingReviewCount} 念</h3>
                      <p>这一念之后你交易了，后面还欠一次回头看。</p>
                      <button type="button" className="danganguan-text-link" onClick={onOpenTradeReview}>
                        去真实复盘 →
                      </button>
                    </>
                  ) : (
                    <>
                      <h3>暂无待复盘的一念。</h3>
                      <p>{completedReviewCount ? `最近已写回 ${completedReviewCount} 条真实复盘。` : "交易之后，回到当时那一念。"}</p>
                    </>
                  )}
                </section>
              </Reveal>

              <Reveal disabled={reduced} delay={220}>
                <section className="danganguan-side-block" aria-label="最近真实复盘">
                  <div className="danganguan-eyebrow">最近真实复盘</div>
                  {safeReviewArchiveItems.length > 0 ? (
                    <ul className="danganguan-review-list">
                      {safeReviewArchiveItems.slice(0, 3).map((item) => (
                        <li key={item.tradeReviewId}>
                          <strong>「{item.os || "一念未记录"}」</strong>
                          <span>{item.symbol || "标的未记录"} · {formatHeartJudgement(item.heartJudgement)} · {formatCapitalStability(item.capitalStabilityLevel)}</span>
                          <span>{formatPlan(item.followedPlan)} · {formatRule(item.brokeRule)} · {item.hasMarketContext ? "已有盘证" : "盘证未记录"}</span>
                          {item.marketText ? <em>{item.marketText}</em> : null}
                          {item.capitalPracticeText || item.practiceText ? (
                            <em>{item.capitalPracticeText || item.practiceText}</em>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>暂无已入档的真实复盘。</p>
                  )}
                </section>
              </Reveal>

              <Reveal disabled={reduced} delay={280}>
                <section className="danganguan-side-block" aria-label="复盘统计">
                  <div className="danganguan-eyebrow">复盘统计</div>
                  <h3>不只看这笔赚没赚。</h3>
                  <p>要看这笔有没有让资金开始失稳。</p>
                  <div className="danganguan-review-stat-groups">
                    {reviewStatGroups.map((group) => (
                      <div className="danganguan-review-stat-group" key={group.title}>
                        <h4>{group.title}</h4>
                        <div className="danganguan-capital-grid">
                          {group.items.map((item) => (
                            <div key={`${group.title}-${item.k}`}>
                              <strong>{item.v}</strong>
                              <span>{item.k}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p>复盘风险信号 {safeReviewRiskSignals.length} 条，先留给规则守护读取。</p>
                </section>
              </Reveal>

              <Reveal disabled={reduced} delay={340}>
                <CycleMirrorPanel cycleMirror={cycleMirror} />
              </Reveal>

              <Reveal disabled={reduced} delay={400}>
                <section className="danganguan-side-block">
                  <div className="danganguan-eyebrow">复发念</div>
                  <h3>这不是第一次来，也不会是最后一次。</h3>
                  {safeRecurringThoughts.length > 0 ? (
                    <ul className="danganguan-plain-list">
                      {safeRecurringThoughts.slice(0, 3).map((item) => (
                        <li key={item.key}>
                          <span>「{item.os}」</span>
                          <strong>{item.count} 次</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>暂无复发念。</p>
                  )}
                </section>
              </Reveal>

              <Reveal disabled={reduced} delay={460}>
                <ArchiveRuleGuardPanel reviewRiskSignals={safeReviewRiskSignals} />
              </Reveal>
            </aside>
          </div>
        </div>

        <Reveal disabled={reduced}>
          <footer className="danganguan-colophon">
            <div className="danganguan-seal">照</div>
            <p>一念未起时，此心本自清明。</p>
          </footer>
        </Reveal>

        <Rod />
      </div>
    </main>
  )
}

function Meta({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return (
    <div>
      <div className="danganguan-meta-label">{label}</div>
      <div className={`danganguan-meta-value${active ? " is-active" : ""}`}>{value}</div>
    </div>
  )
}

function LongScrollCard({
  title,
  subtitle,
  line,
  action,
  onClick,
}: {
  title: string
  subtitle: string
  line: string
  action: string
  onClick?: () => void
}) {
  return (
    <section className="danganguan-scroll-card">
      <div className="danganguan-scroll-line" aria-hidden="true" />
      <div>
        <div className="danganguan-eyebrow">长卷入口</div>
        <h3>{title}</h3>
        <p className="danganguan-scroll-subtitle">{subtitle}</p>
        <p>{line}</p>
        <button type="button" className="danganguan-text-link" onClick={onClick}>
          {action}
        </button>
      </div>
    </section>
  )
}

function Rod({ top = false }: { top?: boolean }) {
  return (
    <div className={`danganguan-rod ${top ? "is-top" : "is-bottom"}`} aria-hidden="true">
      <span />
      <b />
      <span />
    </div>
  )
}

function Divider() {
  return (
    <div className="danganguan-divider" aria-hidden="true">
      <span />
      <b />
      <span />
    </div>
  )
}

const CSS = `
  .danganguan-page {
    min-height: 100vh;
    padding: 0 24px;
    color: ${INK};
    font-family: ${SERIF};
    background:
      radial-gradient(120% 68% at 50% 0%, rgba(23,38,36,0.78) 0%, rgba(9,12,11,0.92) 54%, #050706 100%);
  }

  .danganguan-thread {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    z-index: 50;
    background: rgba(200,171,111,0.06);
  }

  .danganguan-thread-fill {
    height: 100%;
    background: linear-gradient(90deg, rgba(200,171,111,0.25), ${GOLD});
    box-shadow: 0 0 8px rgba(200,171,111,0.5);
  }

  .danganguan-mount {
    position: relative;
    width: min(1160px, 100%);
    margin: 0 auto;
    background: linear-gradient(180deg, rgba(255,255,255,0.012), rgba(255,255,255,0.004));
    border-left: 1px solid ${HAIR};
    border-right: 1px solid ${HAIR};
    box-shadow: 0 0 120px rgba(0,0,0,0.50) inset;
  }

  .danganguan-silk {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 22px;
    pointer-events: none;
  }

  .danganguan-silk-left {
    left: -1px;
    background: linear-gradient(90deg, rgba(200,171,111,0.10), transparent);
  }

  .danganguan-silk-right {
    right: -1px;
    background: linear-gradient(270deg, rgba(200,171,111,0.10), transparent);
  }

  .danganguan-rod {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 22px;
  }

  .danganguan-rod.is-top { margin-top: 30px; }
  .danganguan-rod.is-bottom { margin-bottom: 30px; }

  .danganguan-rod b {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(180deg, #6e5e3c, #3c3322);
    box-shadow: 0 1px 0 rgba(200,171,111,0.25) inset, 0 6px 16px rgba(0,0,0,0.4);
  }

  .danganguan-rod span {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    margin: 0 -4px;
    background: radial-gradient(circle at 35% 35%, #d8bd84, #7a6334 70%, #4a3c20);
    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  }

  .danganguan-huaxin {
    position: relative;
    z-index: 2;
    padding: 0 64px;
  }

  .danganguan-intro {
    text-align: center;
    padding: 58px 0 8px;
  }

  .danganguan-eyebrow-center,
  .danganguan-eyebrow {
    font-size: 12px;
    letter-spacing: 0.42em;
    color: rgba(200,171,111,0.72);
  }

  .danganguan-eyebrow-center {
    letter-spacing: 0.50em;
    padding-left: 0.5em;
  }

  .danganguan-intro h1 {
    margin: 24px 0;
    color: #f3f1ea;
    font-size: clamp(52px, 6vw, 78px);
    font-weight: 600;
    letter-spacing: 0.16em;
    text-indent: 0.16em;
    line-height: 1.05;
  }

  .danganguan-lead,
  .danganguan-lead-sub {
    margin: 0;
    letter-spacing: 0.04em;
    line-height: 1.8;
  }

  .danganguan-lead { color: ${SUB}; font-size: 16px; }
  .danganguan-lead-sub { color: ${DIM}; font-size: 15px; }

  .danganguan-current-scroll {
    display: inline-block;
    margin-top: 30px;
    padding: 9px 18px;
    padding-left: calc(18px + 0.34em);
    border-top: 1px solid ${HAIR};
    border-bottom: 1px solid ${HAIR};
    color: rgba(200,171,111,0.70);
    font-size: 12px;
    letter-spacing: 0.34em;
  }

  .danganguan-divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 58px 0;
  }

  .danganguan-divider span {
    flex: 1;
    height: 1px;
    background: ${HAIR};
  }

  .danganguan-divider b {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(200,171,111,0.5);
  }

  .danganguan-overview {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
    border: 1px solid ${HAIR};
    background: ${PANEL};
  }

  .danganguan-overview-left,
  .danganguan-overview-right {
    padding: 30px;
  }

  .danganguan-overview-right {
    border-left: 1px solid ${HAIR};
  }

  .danganguan-stats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    margin-top: 24px;
    border-top: 1px solid ${HAIR};
    border-bottom: 1px solid ${HAIR};
  }

  .danganguan-stat {
    padding: 22px 8px;
    text-align: center;
    border-right: 1px solid ${HAIR};
  }

  .danganguan-stat:last-child { border-right: 0; }

  .danganguan-stat-value {
    color: ${INK};
    font-size: 31px;
    line-height: 1.2;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .danganguan-stat-key {
    margin-top: 9px;
    color: ${DIM};
    font-size: 12px;
    letter-spacing: 0.16em;
  }

  .danganguan-stop-rate {
    margin: 24px 0 0;
    color: ${SUB};
    font-size: 14.5px;
    line-height: 1.75;
  }

  .danganguan-heart-name {
    margin: 28px 0 10px;
    color: ${INK};
    font-size: 26px;
    line-height: 1.35;
    letter-spacing: 0.04em;
  }

  .danganguan-heart-line {
    margin: 0 0 22px;
    color: ${SUB};
    font-size: 15px;
    line-height: 1.8;
  }

  .danganguan-body {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
    gap: 32px;
    align-items: start;
  }

  .danganguan-section-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 30px;
  }

  .danganguan-section-head h2 {
    margin: 14px 0 0;
    color: #f1efe8;
    font-size: 38px;
    font-weight: 500;
    letter-spacing: 0.06em;
  }

  .danganguan-timeline {
    position: relative;
    padding-left: 30px;
    border-left: 1px solid ${HAIR};
  }

  .danganguan-entry {
    position: relative;
    padding-bottom: 46px;
  }

  .danganguan-node {
    position: absolute;
    left: -34px;
    top: 8px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(200,171,111,0.65);
    box-shadow: 0 0 8px rgba(200,171,111,0.45);
  }

  .danganguan-entry-head {
    display: flex;
    gap: 16px;
    align-items: baseline;
    margin-bottom: 12px;
    color: ${DIM};
    font-size: 13px;
  }

  .danganguan-entry-head span:first-child {
    color: ${GOLD};
    letter-spacing: 0.08em;
    font-variant-numeric: tabular-nums;
  }

  .danganguan-say {
    margin: 0 0 10px;
    color: #f1efe8;
    font-size: 25px;
    letter-spacing: 0.03em;
  }

  .danganguan-reflection {
    margin: 0 0 20px;
    color: ${SUB};
    font-size: 15.5px;
    line-height: 1.85;
    letter-spacing: 0.02em;
  }

  .danganguan-meta {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .danganguan-meta-label {
    margin-bottom: 6px;
    color: ${DIM};
    font-size: 11.5px;
    letter-spacing: 0.16em;
  }

  .danganguan-meta-value {
    color: ${DIM};
    opacity: 0.52;
    font-size: 14.5px;
    letter-spacing: 0.04em;
  }

  .danganguan-meta-value.is-active {
    color: ${INK};
    opacity: 1;
  }

  .danganguan-text-link {
    appearance: none;
    border: 0;
    border-bottom: 1px solid rgba(200,171,111,0.35);
    padding: 0 0 6px;
    background: none;
    color: ${GOLD};
    font-family: inherit;
    font-size: 14px;
    letter-spacing: 0.14em;
    cursor: pointer;
  }

  .danganguan-scroll-card,
  .danganguan-side-block {
    position: relative;
    padding: 26px 24px;
    border: 1px solid ${HAIR};
    background: ${PANEL};
  }

  .danganguan-scroll-card {
    overflow: hidden;
  }

  .danganguan-scroll-line {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 3px;
    background: linear-gradient(180deg, rgba(200,171,111,0.55), transparent);
  }

  .danganguan-scroll-card h3,
  .danganguan-side-block h3 {
    margin: 18px 0 12px;
    color: #f1efe8;
    font-size: 24px;
    font-weight: 500;
    letter-spacing: 0.05em;
    line-height: 1.35;
  }

  .danganguan-scroll-subtitle {
    margin: 0 0 8px;
    color: ${GOLD};
    font-size: 14px;
    letter-spacing: 0.08em;
  }

  .danganguan-scroll-card p,
  .danganguan-side-block p {
    margin: 0 0 18px;
    color: ${SUB};
    font-size: 14.5px;
    line-height: 1.75;
  }

  .danganguan-capital-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 18px;
  }

  .danganguan-capital-grid div {
    min-width: 0;
    padding: 12px 10px;
    border-top: 1px solid ${HAIR};
    background: rgba(255,255,255,0.008);
  }

  .danganguan-capital-grid strong {
    display: block;
    color: ${INK};
    font-size: 24px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .danganguan-capital-grid span {
    display: block;
    margin-top: 6px;
    color: ${DIM};
    font-size: 12px;
    line-height: 1.45;
    letter-spacing: 0.08em;
  }

  .danganguan-review-stat-groups {
    display: grid;
    gap: 16px;
  }

  .danganguan-review-stat-group h4 {
    margin: 0;
    color: rgba(200,171,111,0.76);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.14em;
  }

  .danganguan-review-list {
    display: grid;
    gap: 14px;
    list-style: none;
    margin: 18px 0 0;
    padding: 0;
  }

  .danganguan-review-list li {
    min-width: 0;
    padding-top: 14px;
    border-top: 1px solid ${HAIR};
  }

  .danganguan-review-list strong,
  .danganguan-review-list span,
  .danganguan-review-list em {
    display: block;
    min-width: 0;
  }

  .danganguan-review-list strong {
    color: ${INK};
    font-size: 15px;
    font-weight: 500;
    line-height: 1.7;
  }

  .danganguan-review-list span,
  .danganguan-review-list em {
    margin-top: 6px;
    color: ${SUB};
    font-size: 13.5px;
    font-style: normal;
    line-height: 1.65;
  }

  .danganguan-review-list em {
    color: ${DIM};
  }

  .danganguan-side-axis {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .danganguan-plain-list,
  .danganguan-signal-list {
    list-style: none;
    padding: 0;
    margin: 18px 0 0;
  }

  .danganguan-plain-list li {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 0;
    border-top: 1px solid ${HAIR};
    color: ${SUB};
    font-size: 14px;
    line-height: 1.65;
  }

  .danganguan-signal-list li {
    padding: 14px 0;
    border-top: 1px solid ${HAIR};
  }

  .danganguan-signal-list div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .danganguan-signal-list strong {
    color: ${GOLD};
    font-weight: 500;
  }

  .danganguan-signal-list span,
  .danganguan-signal-list small,
  .danganguan-signal-empty {
    color: ${DIM};
    font-size: 12px;
    line-height: 1.8;
  }

  .danganguan-signal-list p {
    margin: 8px 0 4px;
  }

  .danganguan-signal-list small {
    display: block;
  }

  .danganguan-cycle-list {
    display: grid;
    gap: 12px;
    margin: 16px 0 0;
  }

  .danganguan-cycle-list div {
    border-top: 1px solid ${HAIR};
    padding: 12px 0 0;
  }

  .danganguan-cycle-list span,
  .danganguan-cycle-list small,
  .danganguan-cycle-empty {
    display: block;
    color: ${DIM};
    font-size: 12px;
    line-height: 1.8;
  }

  .danganguan-cycle-list strong {
    display: block;
    margin: 4px 0;
    color: ${GOLD};
    font-weight: 500;
    line-height: 1.7;
  }

  .danganguan-cycle-conclusion {
    border-top: 1px solid ${HAIR};
    margin-top: 14px;
    padding-top: 12px;
  }

  .danganguan-plain-list strong {
    color: ${GOLD};
    font-weight: 500;
    white-space: nowrap;
  }

  .danganguan-empty-main {
    padding: 34px;
    border: 1px solid ${HAIR};
    color: ${SUB};
    line-height: 1.9;
    text-align: center;
    background: ${PANEL};
  }

  .danganguan-colophon {
    position: relative;
    z-index: 2;
    text-align: center;
    padding: 8px 72px 56px;
  }

  .danganguan-seal {
    width: 58px;
    height: 58px;
    margin: 48px auto 24px;
    border-radius: 50%;
    border: 1px solid rgba(200,171,111,0.42);
    color: ${GOLD};
    font-size: 27px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .danganguan-colophon p {
    margin: 0;
    color: rgba(200,171,111,0.65);
    font-size: 14.5px;
    letter-spacing: 0.28em;
    padding-left: 0.28em;
  }

  .danganguan-unroll {
    clip-path: inset(0 0 0 0);
    opacity: 1;
    transform: none;
    transition:
      clip-path 1.05s cubic-bezier(.4,0,.15,1),
      opacity 1.05s ease,
      transform 1.05s cubic-bezier(.4,0,.15,1);
  }

  .danganguan-unroll.is-in {
    clip-path: inset(0 0 0 0);
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .danganguan-unroll {
      clip-path: none !important;
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }
  }

  @media (max-width: 980px) {
    .danganguan-overview,
    .danganguan-body {
      grid-template-columns: 1fr;
    }

    .danganguan-overview-right {
      border-left: 0;
      border-top: 1px solid ${HAIR};
    }
  }

  @media (max-width: 820px) {
    .danganguan-page {
      padding: 0 16px;
    }

    .danganguan-silk {
      display: none;
    }

    .danganguan-huaxin {
      padding: 0 24px;
    }

    .danganguan-intro {
      padding-top: 46px;
    }

    .danganguan-intro h1 {
      font-size: 44px;
    }

    .danganguan-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .danganguan-stat:nth-child(2n) {
      border-right: 0;
    }

    .danganguan-meta {
      grid-template-columns: repeat(2, 1fr);
    }

    .danganguan-section-head {
      align-items: start;
      flex-direction: column;
    }

    .danganguan-section-head h2 {
      font-size: 30px;
    }
  }

  @media (max-width: 430px) {
    .danganguan-huaxin {
      padding: 0 18px;
    }

    .danganguan-overview-left,
    .danganguan-overview-right,
    .danganguan-scroll-card,
    .danganguan-side-block {
      padding: 22px 18px;
    }

    .danganguan-say {
      font-size: 22px;
    }
  }
`
