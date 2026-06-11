"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { AssessmentShell, PrimaryButton } from "@/features/assessment/components"
import { getPendingReviewEvents } from "@/lib/mind-archive/archiveStatsService"
import {
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type OneThoughtEvent,
  type TradeDirection,
} from "@/lib/mind-archive/types"
import {
  createTradeReview,
  heartJudgementDescriptions,
  heartJudgementLabels,
  judgeTradeHeart,
  type CreateTradeReviewInput,
} from "@/lib/trade-review/tradeReviewRepository"

const directionLabels: Array<{ value: TradeDirection; label: string }> = [
  { value: "buy", label: "买入" },
  { value: "sell", label: "卖出" },
  { value: "long", label: "做多" },
  { value: "short", label: "做空" },
  { value: "close_long", label: "平多" },
  { value: "close_short", label: "平空" },
]

function ReviewPageContent() {
  const searchParams = useSearchParams()
  const linkedEventId = searchParams.get("linkedOneThoughtEventId") || ""
  const [events, setEvents] = useState<OneThoughtEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState(linkedEventId)
  const [symbol, setSymbol] = useState("")
  const [direction, setDirection] = useState<TradeDirection>("buy")
  const [entryPrice, setEntryPrice] = useState("")
  const [exitPrice, setExitPrice] = useState("")
  const [quantity, setQuantity] = useState("")
  const [pnl, setPnl] = useState("")
  const [followedPlan, setFollowedPlan] = useState(true)
  const [brokeRule, setBrokeRule] = useState(false)
  const [reviewText, setReviewText] = useState("")
  const [screenshotUrl, setScreenshotUrl] = useState("")
  const [notice, setNotice] = useState("")
  const [createdJudgement, setCreatedJudgement] = useState<ReturnType<typeof judgeTradeHeart> | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const pendingEvents = getPendingReviewEvents(DEFAULT_MIND_ARCHIVE_USER_ID)
      setEvents(pendingEvents)
      setSelectedEventId((current) => {
        if (current && pendingEvents.some((event) => event.id === current)) return current
        if (linkedEventId && pendingEvents.some((event) => event.id === linkedEventId)) return linkedEventId
        return pendingEvents[0]?.id || ""
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [linkedEventId])

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  )
  const previewJudgement = useMemo(() => {
    const numberPnl = Number(pnl)
    if (!Number.isFinite(numberPnl)) return null
    return judgeTradeHeart({ pnl: numberPnl, followedPlan, brokeRule })
  }, [pnl, followedPlan, brokeRule])

  function optionalNumber(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const numberValue = Number(trimmed)
    return Number.isFinite(numberValue) ? numberValue : undefined
  }

  function handleSubmit() {
    const numberPnl = Number(pnl)
    if (!symbol.trim()) {
      setNotice("请先写下标的。")
      return
    }
    if (!Number.isFinite(numberPnl)) {
      setNotice("请写下本次盈亏。")
      return
    }
    if (!selectedEvent) {
      setNotice("请先从待复盘的一念里选择一条。")
      return
    }

    const input: CreateTradeReviewInput = {
      userId: DEFAULT_MIND_ARCHIVE_USER_ID,
      linkedOneThoughtEventId: selectedEvent.id,
      sceneId: selectedEvent.sceneId,
      itemId: selectedEvent.itemId,
      key: selectedEvent.key,
      os: selectedEvent.os,
      reflectionFinal: selectedEvent.reflectionFinal,
      painLevel: selectedEvent.painLevel,
      painPoint: selectedEvent.painPoint,
      heartThief: selectedEvent.heartThief,
      reflectionVersion: selectedEvent.reflectionVersion,
      symbol: symbol.trim(),
      direction,
      entryPrice: optionalNumber(entryPrice),
      exitPrice: optionalNumber(exitPrice),
      quantity: optionalNumber(quantity),
      pnl: numberPnl,
      followedPlan,
      brokeRule,
      screenshotUrl: screenshotUrl.trim() || undefined,
      reviewText: reviewText.trim() || undefined,
    }

    const review = createTradeReview(input)
    setCreatedJudgement(review.heartJudgement)
    setNotice("真实复盘已写回一念档案。")
    const pendingEvents = getPendingReviewEvents(DEFAULT_MIND_ARCHIVE_USER_ID)
    setEvents(pendingEvents)
    setSelectedEventId(pendingEvents[0]?.id || "")
  }

  return (
    <AssessmentShell background="home-water" contentWidth="wide">
      <main className="review-page">
        <header className="review-hero">
          <p>真实复盘</p>
          <h1>
            不复盘行情对错，
            <br />
            只复盘谁在下单。
          </h1>
        </header>

        <section className="review-panel" aria-label="关联一念">
          <p>关联最近一念</p>
          {events.length ? (
            <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.os} · {event.tradeMoment}
                </option>
              ))}
            </select>
          ) : (
            <span className="muted">暂无待复盘的一念。先在今日所照里把最后动作标为“还是交易了”。</span>
          )}
          {selectedEvent ? (
            <div className="linked-thought">
              <span>本次关联</span>
              <h2>「{selectedEvent.os}」</h2>
              <p>{selectedEvent.reflectionFinal}</p>
            </div>
          ) : null}
        </section>

        <section className="review-panel review-form" aria-label="真实交易复盘表单">
          <p>交易事实</p>
          <div className="form-grid">
            <label>
              标的
              <input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="例如：BTC / 600000" />
            </label>
            <label>
              方向
              <select value={direction} onChange={(event) => setDirection(event.target.value as TradeDirection)}>
                {directionLabels.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              开仓价
              <input value={entryPrice} onChange={(event) => setEntryPrice(event.target.value)} inputMode="decimal" />
            </label>
            <label>
              平仓价
              <input value={exitPrice} onChange={(event) => setExitPrice(event.target.value)} inputMode="decimal" />
            </label>
            <label>
              数量
              <input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" />
            </label>
            <label>
              盈亏
              <input value={pnl} onChange={(event) => setPnl(event.target.value)} inputMode="decimal" placeholder="正数或负数" />
            </label>
          </div>

          <div className="check-row">
            <label>
              <input type="checkbox" checked={followedPlan} onChange={(event) => setFollowedPlan(event.target.checked)} />
              是否按计划
            </label>
            <label>
              <input type="checkbox" checked={brokeRule} onChange={(event) => setBrokeRule(event.target.checked)} />
              是否破戒
            </label>
          </div>

          <label className="wide-label">
            复盘文字
            <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={4} />
          </label>
          <label className="wide-label">
            截图 URL
            <input value={screenshotUrl} onChange={(event) => setScreenshotUrl(event.target.value)} placeholder="可先留空" />
          </label>
        </section>

        {previewJudgement ? (
          <section className="review-result" aria-live="polite">
            <p>镜中判定</p>
            <h2>{heartJudgementLabels[previewJudgement]}</h2>
            <span>{heartJudgementDescriptions[previewJudgement]}</span>
          </section>
        ) : null}

        {notice ? (
          <section className="review-result" aria-live="polite">
            <p>{notice}</p>
            {createdJudgement ? (
              <>
                <h2>{heartJudgementLabels[createdJudgement]}</h2>
                <span>{heartJudgementDescriptions[createdJudgement]}</span>
              </>
            ) : null}
          </section>
        ) : null}

        <div className="review-actions">
          <PrimaryButton type="button" onClick={handleSubmit}>
            写入真实复盘
          </PrimaryButton>
          <Link href="/mind-archive">查看一念档案</Link>
          <Link href="/reflect">回到今日照见</Link>
        </div>
      </main>

      <style jsx>{`
        .review-page {
          width: min(100%, 980px);
          margin: 0 auto;
          padding: clamp(48px, 8svh, 92px) 20px 96px;
          color: rgba(244, 235, 221, 0.9);
        }

        .review-hero {
          text-align: center;
          margin-bottom: 42px;
        }

        .review-hero p,
        .review-panel > p,
        .review-result p {
          margin: 0 0 14px;
          color: rgba(216, 183, 111, 0.62);
          font-size: 14px;
          letter-spacing: 0.22em;
        }

        h1 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(42px, 6vw, 82px);
          font-weight: 400;
          line-height: 1.25;
        }

        .review-panel,
        .review-result {
          border-top: 1px solid rgba(216, 183, 111, 0.18);
          margin-bottom: 26px;
          padding-top: 22px;
        }

        select,
        input,
        textarea {
          width: 100%;
          border: 1px solid rgba(216, 183, 111, 0.26);
          border-radius: 14px;
          background: rgba(8, 8, 7, 0.3);
          color: rgba(244, 235, 221, 0.88);
          font: inherit;
          outline: none;
          padding: 14px 16px;
        }

        option {
          color: #11100d;
        }

        .linked-thought {
          margin-top: 20px;
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          padding-top: 18px;
        }

        .linked-thought span,
        .muted {
          color: rgba(244, 235, 221, 0.44);
        }

        h2 {
          margin: 8px 0 10px;
          font-family: var(--font-serif);
          font-size: clamp(28px, 4vw, 50px);
          font-weight: 400;
        }

        .linked-thought p,
        .review-result span {
          color: rgba(244, 235, 221, 0.66);
          line-height: 1.8;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        label {
          color: rgba(216, 183, 111, 0.56);
          display: grid;
          gap: 8px;
          font-size: 14px;
          letter-spacing: 0.08em;
        }

        .check-row {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin: 22px 0;
        }

        .check-row label {
          align-items: center;
          display: flex;
          color: rgba(244, 235, 221, 0.7);
        }

        .check-row input {
          width: auto;
        }

        .wide-label {
          margin-top: 16px;
        }

        .review-actions {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          justify-content: center;
          margin-top: 38px;
        }

        a {
          border-bottom: 1px solid rgba(216, 183, 111, 0.34);
          color: rgba(216, 183, 111, 0.9);
          padding-bottom: 6px;
          text-decoration: none;
        }

        @media (max-width: 760px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AssessmentShell>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewPageContent />
    </Suspense>
  )
}
