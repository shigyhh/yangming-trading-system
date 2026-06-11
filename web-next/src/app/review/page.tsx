"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState, type ChangeEvent } from "react"
import { useSearchParams } from "next/navigation"

import { AssessmentShell, PrimaryButton } from "@/features/assessment/components"
import { getPendingReviewEvents } from "@/lib/mind-archive/archiveStatsService"
import {
  type ChartEvidence,
  type ChartEvidenceType,
  DEFAULT_MIND_ARCHIVE_USER_ID,
  type ActualAction,
  type KlineContextResult,
  type MarketPattern,
  type MarketTrend,
  type OneThoughtEvent,
  type OneThoughtReaction,
  type PriceLocation,
  type TradeDirection,
  type VolumeState,
} from "@/lib/mind-archive/types"
import { createManualMarketContext, getKlineContext } from "@/lib/trade-review/klineContextService"
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

const chartEvidenceTypeLabels: Record<ChartEvidenceType, string> = {
  before_entry: "下单前 K 线",
  after_entry: "下单后 K 线",
  exit: "出场后 K 线",
  trade_record: "交易记录",
}

const marketTrendLabels: Record<MarketTrend, string> = {
  uptrend: "上涨趋势",
  downtrend: "下跌趋势",
  range: "震荡区间",
  sharp_rise: "急涨段",
  sharp_drop: "急跌段",
  reversal_attempt: "转折尝试",
  unclear: "看不清",
}

const priceLocationLabels: Record<PriceLocation, string> = {
  high: "高位",
  middle: "中位",
  low: "低位",
  support_area: "支撑附近",
  resistance_area: "压力附近",
  range_top: "箱体上沿",
  range_bottom: "箱体下沿",
  ma_area: "均线附近",
  unclear: "看不清",
}

const patternLabels: Record<MarketPattern, string> = {
  breakout: "突破",
  pullback: "回踩",
  false_breakout: "假突破",
  range_bound: "箱体震荡",
  second_push: "二次冲高",
  second_dip: "二次探底",
  spike_and_fade: "冲高回落",
  rebound: "反抽",
  unclear: "看不清",
}

const volumeStateLabels: Record<VolumeState, string> = {
  expanding: "放量",
  shrinking: "缩量",
  normal: "正常",
  unknown: "不明",
}

const confidenceLabels: Record<KlineContextResult["confidence"], string> = {
  low: "低",
  medium: "中",
  high: "高",
}

const dataSourceLabels: Record<KlineContextResult["dataSource"], string> = {
  kline_db: "K线缓存",
  manual: "手动盘证",
  insufficient_data: "数据不足",
}

const reactionLabels: Record<OneThoughtReaction, string> = {
  seen: "照见了",
  not_hit: "没照到",
  stopped: "愿止一念",
  still_moving: "心还在动",
}

const actionLabels: Record<ActualAction, string> = {
  no_trade: "没有交易",
  traded: "还是交易了",
  paused: "暂停",
  watched: "观察",
  unknown: "稍后再记",
}

function formatReaction(value: OneThoughtEvent["userReaction"]) {
  return value ? reactionLabels[value] : "待记录"
}

function formatActualAction(value: OneThoughtEvent["actualAction"]) {
  return value ? actionLabels[value] : "待记录"
}

function formatPendingTime(value: string) {
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return value

  return time.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function createLocalId(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("盘证图片读取失败"))
    reader.readAsDataURL(file)
  })
}

function buildPracticeText(params: {
  event: OneThoughtEvent | null
  brokeRule: boolean
  addedPosition: boolean
  marketTrend: MarketTrend
}) {
  const heartThief = params.event?.heartThief || ""

  if (params.event?.userReaction === "still_moving" && params.addedPosition) {
    return "下次同类场景：不在心还在动时加仓。"
  }
  if (params.brokeRule) {
    return "下次同类场景：先守规则，再谈判断。"
  }
  if (heartThief.includes("急")) {
    return "下次同类场景：给自己三分钟，不用一根 K 线证明自己。"
  }
  if (heartThief.includes("贪")) {
    return "下次同类场景：不追全，不吃尽，计划外的利润先放过。"
  }
  if (heartThief.includes("执")) {
    return "下次同类场景：别让一笔交易替你证明规则有没有价值。"
  }
  if (params.marketTrend === "sharp_rise" || params.marketTrend === "sharp_drop") {
    return "下次同类场景：先看自己有没有被急涨急跌带走。"
  }

  return "下次同类场景：先回到规则，再决定是否行动。"
}

function ReviewPageContent() {
  const searchParams = useSearchParams()
  const linkedEventId = searchParams.get("linkedOneThoughtEventId") || ""
  const [events, setEvents] = useState<OneThoughtEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState(linkedEventId)
  const [symbol, setSymbol] = useState("")
  const [timeframe, setTimeframe] = useState("")
  const [entryTime, setEntryTime] = useState("")
  const [direction, setDirection] = useState<TradeDirection>("buy")
  const [entryPrice, setEntryPrice] = useState("")
  const [exitPrice, setExitPrice] = useState("")
  const [quantity, setQuantity] = useState("")
  const [pnl, setPnl] = useState("")
  const [followedPlan, setFollowedPlan] = useState(true)
  const [brokeRule, setBrokeRule] = useState(false)
  const [changedPlanIntraday, setChangedPlanIntraday] = useState(false)
  const [addedPosition, setAddedPosition] = useState(false)
  const [movedStopLoss, setMovedStopLoss] = useState(false)
  const [emotionDrivenEntry, setEmotionDrivenEntry] = useState(false)
  const [marketTrend, setMarketTrend] = useState<MarketTrend>("unclear")
  const [priceLocation, setPriceLocation] = useState<PriceLocation>("unclear")
  const [pattern, setPattern] = useState<MarketPattern>("unclear")
  const [volumeState, setVolumeState] = useState<VolumeState>("unknown")
  const [klineContext, setKlineContext] = useState<KlineContextResult | null>(null)
  const [klineNotice, setKlineNotice] = useState("")
  const [isDetectingKline, setIsDetectingKline] = useState(false)
  const [marketContextEdited, setMarketContextEdited] = useState(false)
  const [chartEvidence, setChartEvidence] = useState<ChartEvidence[]>([])
  const [reviewText, setReviewText] = useState("")
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
  const reviewSummary = useMemo(() => {
    const behaviorFlags = [
      followedPlan ? "按计划" : "未按计划",
      brokeRule ? "破戒" : "未破戒",
      changedPlanIntraday ? "临盘改计划" : "",
      addedPosition ? "临盘加仓" : "",
      movedStopLoss ? "移动止损" : "",
      emotionDrivenEntry ? "情绪推动入场" : "",
    ].filter(Boolean)

    return {
      marketText: `${marketTrendLabels[marketTrend]}，${priceLocationLabels[priceLocation]}，${patternLabels[pattern]}，${volumeStateLabels[volumeState]}。`,
      behaviorText: behaviorFlags.length ? behaviorFlags.join("，") + "。" : "行为证据待补充。",
      heartText: selectedEvent
        ? `当时反馈为“${formatReaction(selectedEvent.userReaction)}”，实际动作：${formatActualAction(selectedEvent.actualAction)}。`
        : "心证待关联。",
      practiceText: buildPracticeText({
        event: selectedEvent,
        brokeRule,
        addedPosition,
        marketTrend,
      }),
    }
  }, [
    addedPosition,
    brokeRule,
    changedPlanIntraday,
    emotionDrivenEntry,
    followedPlan,
    marketTrend,
    movedStopLoss,
    pattern,
    priceLocation,
    selectedEvent,
    volumeState,
  ])

  function optionalNumber(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const numberValue = Number(trimmed)
    return Number.isFinite(numberValue) ? numberValue : undefined
  }

  function markMarketContextEdited() {
    if (klineContext) setMarketContextEdited(true)
  }

  function updateMarketTrend(value: MarketTrend) {
    setMarketTrend(value)
    markMarketContextEdited()
  }

  function updatePriceLocation(value: PriceLocation) {
    setPriceLocation(value)
    markMarketContextEdited()
  }

  function updatePattern(value: MarketPattern) {
    setPattern(value)
    markMarketContextEdited()
  }

  function updateVolumeState(value: VolumeState) {
    setVolumeState(value)
    markMarketContextEdited()
  }

  async function handleAutoDetectKline() {
    const resolvedSymbol = symbol.trim()
    const resolvedTimeframe = timeframe.trim() || "1d"
    const resolvedEntryTime = entryTime.trim() || selectedEvent?.createdAt || ""

    if (!resolvedSymbol) {
      setKlineNotice("请先填写标的，再自动识别盘面。")
      return
    }
    if (!resolvedEntryTime) {
      setKlineNotice("请先填写入场时间，再自动识别盘面。")
      return
    }

    setIsDetectingKline(true)
    setKlineNotice("")

    const result = await getKlineContext({
      symbol: resolvedSymbol,
      timeframe: resolvedTimeframe,
      entryTime: resolvedEntryTime,
      entryPrice: optionalNumber(entryPrice),
    })

    setKlineContext(result)
    setMarketTrend(result.marketTrend)
    setPriceLocation(result.priceLocation)
    setPattern(result.pattern)
    setVolumeState(result.volumeState)
    setMarketContextEdited(false)
    setIsDetectingKline(false)

    if (result.dataSource === "kline_db") {
      setKlineNotice("盘面识别已完成，结果可继续手动校准。")
      return
    }

    if (result.dataSource === "manual") {
      setKlineNotice("K线自动盘证未开启，你仍可手动选择趋势、位置、形态。")
      return
    }

    setKlineNotice("K线数据不足，已切换为手动盘证。你仍可手动选择趋势、位置、形态。")
  }

  async function handleChartEvidenceChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const images = files.filter((file) => file.type.startsWith("image/"))
    const nextEvidence = await Promise.all(
      images.map(async (file) => ({
        id: createLocalId("chart_evidence"),
        type: "before_entry" as ChartEvidenceType,
        url: await readFileAsDataUrl(file),
        fileName: file.name,
        createdAt: new Date().toISOString(),
      })),
    )

    setChartEvidence((current) => [...current, ...nextEvidence])
    event.target.value = ""
  }

  function updateChartEvidenceType(id: string, type: ChartEvidenceType) {
    setChartEvidence((current) => current.map((item) => (item.id === id ? { ...item, type } : item)))
  }

  function removeChartEvidence(id: string) {
    setChartEvidence((current) => current.filter((item) => item.id !== id))
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
      timeframe: timeframe.trim() || undefined,
      direction,
      entryPrice: optionalNumber(entryPrice),
      exitPrice: optionalNumber(exitPrice),
      quantity: optionalNumber(quantity),
      pnl: numberPnl,
      followedPlan,
      brokeRule,
      screenshotUrl: chartEvidence[0]?.url || undefined,
      chartEvidence,
      marketContext: {
        ...createManualMarketContext({
          symbol,
          timeframe,
          marketTrend,
          priceLocation,
          pattern,
          volumeState,
        }),
        entryTime: entryTime.trim() || selectedEvent.createdAt,
        entryPrice: optionalNumber(entryPrice),
        confidence: klineContext?.confidence,
        dataSource: klineContext?.dataSource || "manual",
        evidence: klineContext?.evidence,
        editedByUser: Boolean(klineContext && marketContextEdited),
      },
      behaviorEvidence: {
        changedPlanIntraday,
        addedPosition,
        movedStopLoss,
        emotionDrivenEntry,
      },
      reviewText: reviewText.trim() || undefined,
      reviewSummary,
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
            交易之后，
            <br />
            回到当时那一念。
          </h1>
          <span>看盘，是为了看清位置；复盘，是为了看清谁在下单。</span>
        </header>

        <section className="review-panel" aria-label="关联一念">
          <p>关联最近一念</p>
          {events.length ? (
            <div className="pending-review-list" aria-label="待复盘一念列表">
              {events.map((event) => (
                <article
                  className={event.id === selectedEventId ? "pending-review-item is-selected" : "pending-review-item"}
                  key={event.id}
                >
                  <div>
                    <span>{formatPendingTime(event.createdAt)}</span>
                    <h2>「{event.os}」</h2>
                    <p>{event.reflectionFinal}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>心贼</dt>
                      <dd>{event.heartThief || "待显影"}</dd>
                    </div>
                    <div>
                      <dt>反馈</dt>
                      <dd>{formatReaction(event.userReaction)}</dd>
                    </div>
                    <div>
                      <dt>动作</dt>
                      <dd>{formatActualAction(event.actualAction)}</dd>
                    </div>
                  </dl>
                  <button type="button" onClick={() => setSelectedEventId(event.id)}>
                    {event.id === selectedEventId ? "正在复盘" : "去复盘"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="review-empty-state">
              <h2>暂无待复盘的一念。</h2>
              <p>
                交易之后，回到当时那一念。
                <br />
                当你在今日所照里标记“还是交易了”，这里就会出现待复盘记录。
                <br />
                真实复盘不是记行情，是把一笔交易放回当时那一念。
              </p>
              <div>
                <Link href="/today-sealed">查看今日所照</Link>
                <Link href="/assessment-entry">照见一念</Link>
              </div>
            </div>
          )}
          {selectedEvent ? (
            <div className="linked-thought">
              <span>本次关联</span>
              <h2>「{selectedEvent.os}」</h2>
              <p>{selectedEvent.reflectionFinal}</p>
              <dl className="linked-thought-meta">
                <div>
                  <dt>sceneId</dt>
                  <dd>{selectedEvent.sceneId}</dd>
                </div>
                <div>
                  <dt>itemId</dt>
                  <dd>{selectedEvent.itemId}</dd>
                </div>
                <div>
                  <dt>key</dt>
                  <dd>{selectedEvent.key}</dd>
                </div>
                <div>
                  <dt>心贼</dt>
                  <dd>{selectedEvent.heartThief || "待显影"}</dd>
                </div>
                <div>
                  <dt>痛点</dt>
                  <dd>{selectedEvent.painPoint || "待补充"}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </section>

        {selectedEvent ? (
          <>
            <section className="review-panel" aria-label="上传盘证">
              <p>盘证</p>
              <h2>把这笔交易放回当时的盘面。</h2>
              <div className="kline-auto-box">
                <button type="button" onClick={handleAutoDetectKline} disabled={isDetectingKline}>
                  {isDetectingKline ? "正在识别..." : "自动识别盘面"}
                </button>
                <span>盘证用于事后复盘，不构成交易建议。</span>
              </div>
              {klineNotice ? <div className="kline-notice">{klineNotice}</div> : null}
              {klineContext ? (
                <div className="kline-result" aria-label="盘面识别结果">
                  <p>盘面识别结果</p>
                  <dl>
                    <div>
                      <dt>当时趋势</dt>
                      <dd>{marketTrendLabels[marketTrend]}</dd>
                    </div>
                    <div>
                      <dt>价格位置</dt>
                      <dd>{priceLocationLabels[priceLocation]}</dd>
                    </div>
                    <div>
                      <dt>形态走势</dt>
                      <dd>{patternLabels[pattern]}</dd>
                    </div>
                    <div>
                      <dt>量能状态</dt>
                      <dd>{volumeStateLabels[volumeState]}</dd>
                    </div>
                    <div>
                      <dt>置信度</dt>
                      <dd>{confidenceLabels[klineContext.confidence]}</dd>
                    </div>
                    <div>
                      <dt>数据来源</dt>
                      <dd>{dataSourceLabels[klineContext.dataSource]}</dd>
                    </div>
                  </dl>
                  <div className="kline-evidence">
                    <span>recentHigh：{klineContext.evidence.recentHigh ?? "无"}</span>
                    <span>recentLow：{klineContext.evidence.recentLow ?? "无"}</span>
                    <span>lastClose：{klineContext.evidence.lastClose ?? "无"}</span>
                    <span>ma20：{klineContext.evidence.ma20 ?? "无"}</span>
                    <span>ma60：{klineContext.evidence.ma60 ?? "无"}</span>
                    <span>slopePct：{klineContext.evidence.slopePct ?? "无"}</span>
                    <span>volumeRatio：{klineContext.evidence.volumeRatio ?? "无"}</span>
                  </div>
                </div>
              ) : null}
              <label className="evidence-upload">
                <span>选择 / 拍照上传盘证</span>
                <input type="file" accept="image/*" multiple onChange={handleChartEvidenceChange} />
              </label>
              {chartEvidence.length ? (
                <div className="evidence-grid">
                  {chartEvidence.map((item) => (
                    <article key={item.id} className="evidence-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.fileName || chartEvidenceTypeLabels[item.type]} />
                      <div>
                        <select
                          value={item.type}
                          onChange={(event) => updateChartEvidenceType(item.id, event.target.value as ChartEvidenceType)}
                        >
                          {Object.entries(chartEvidenceTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button type="button" onClick={() => removeChartEvidence(item.id)}>
                          删除
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <span className="muted">可上传下单前、下单后、出场后 K 线，或交易记录截图。MVP 不做 OCR。</span>
              )}
            </section>

            <section className="review-panel review-form" aria-label="盘面状态">
              <p>盘面状态</p>
              <span className="section-note">先看盘面在哪，不急着解释输赢。</span>
              <div className="form-grid">
                <label>
                  标的
                  <input
                    value={symbol}
                    onChange={(event) => {
                      setSymbol(event.target.value)
                      markMarketContextEdited()
                    }}
                    placeholder="例如：BTC / 600000"
                  />
                </label>
                <label>
                  周期
                  <input
                    value={timeframe}
                    onChange={(event) => {
                      setTimeframe(event.target.value)
                      markMarketContextEdited()
                    }}
                    placeholder="例如：5m / 1h / 日线"
                  />
                </label>
                <label>
                  入场时间
                  <input
                    value={entryTime}
                    onChange={(event) => {
                      setEntryTime(event.target.value)
                      markMarketContextEdited()
                    }}
                    placeholder="例如：2026-06-11 10:30"
                  />
                </label>
                <label>
                  趋势
                  <select value={marketTrend} onChange={(event) => updateMarketTrend(event.target.value as MarketTrend)}>
                    {Object.entries(marketTrendLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  位置
                  <select value={priceLocation} onChange={(event) => updatePriceLocation(event.target.value as PriceLocation)}>
                    {Object.entries(priceLocationLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  形态
                  <select value={pattern} onChange={(event) => updatePattern(event.target.value as MarketPattern)}>
                    {Object.entries(patternLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  量能
                  <select value={volumeState} onChange={(event) => updateVolumeState(event.target.value as VolumeState)}>
                    {Object.entries(volumeStateLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="review-panel review-form" aria-label="交易行为">
              <p>交易行为</p>
              <span className="section-note">你不是只复盘结果，而是复盘当时怎么动的手。</span>
              <div className="form-grid">
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
                  <input
                    value={entryPrice}
                    onChange={(event) => {
                      setEntryPrice(event.target.value)
                      markMarketContextEdited()
                    }}
                    inputMode="decimal"
                  />
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
                <label>
                  <input type="checkbox" checked={changedPlanIntraday} onChange={(event) => setChangedPlanIntraday(event.target.checked)} />
                  临盘改计划
                </label>
                <label>
                  <input type="checkbox" checked={addedPosition} onChange={(event) => setAddedPosition(event.target.checked)} />
                  临盘加仓
                </label>
                <label>
                  <input type="checkbox" checked={movedStopLoss} onChange={(event) => setMovedStopLoss(event.target.checked)} />
                  移动止损
                </label>
                <label>
                  <input type="checkbox" checked={emotionDrivenEntry} onChange={(event) => setEmotionDrivenEntry(event.target.checked)} />
                  情绪推动入场
                </label>
              </div>

              <label className="wide-label">
                复盘文字
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={4} />
              </label>
            </section>

            {previewJudgement ? (
              <section className="review-result" aria-live="polite">
                <p>心性判定</p>
                <h2>{heartJudgementLabels[previewJudgement]}</h2>
                <span>{heartJudgementDescriptions[previewJudgement]}</span>
                <div className="review-summary">
                  <div>
                    <strong>盘面</strong>
                    <span>{reviewSummary.marketText}</span>
                  </div>
                  <div>
                    <strong>行为</strong>
                    <span>{reviewSummary.behaviorText}</span>
                  </div>
                  <div>
                    <strong>心证</strong>
                    <span>{reviewSummary.heartText}</span>
                  </div>
                  <div>
                    <strong>判定</strong>
                    <span>{heartJudgementLabels[previewJudgement]}</span>
                  </div>
                </div>
              </section>
            ) : (
              <section className="review-result" aria-live="polite">
                <p>心性判定</p>
                <span>写下盈亏后，这里会按既有四象限显示正胜 / 贼胜 / 正亏 / 双输。</span>
              </section>
            )}

            <section className="review-result" aria-label="下次修行">
              <p>下次修行</p>
              <h2>同类场景，先照这一句。</h2>
              <span>{reviewSummary.practiceText}</span>
            </section>

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
              <Link href="/today-sealed">回到今日所照</Link>
            </div>
          </>
        ) : null}
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

        .review-hero span,
        .section-note {
          display: block;
          margin-top: 16px;
          color: rgba(244, 235, 221, 0.58);
          font-size: 15px;
          letter-spacing: 0.08em;
          line-height: 1.9;
        }

        .review-panel,
        .review-result {
          border-top: 1px solid rgba(216, 183, 111, 0.18);
          margin-bottom: 26px;
          padding-top: 22px;
        }

        .kline-auto-box {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px 16px;
          margin: 16px 0;
        }

        .kline-auto-box button {
          border: 1px solid rgba(216, 183, 111, 0.4);
          border-radius: 999px;
          background: rgba(216, 183, 111, 0.12);
          color: rgba(244, 235, 221, 0.88);
          cursor: pointer;
          font: inherit;
          min-height: 40px;
          padding: 10px 18px;
        }

        .kline-auto-box button:disabled {
          cursor: wait;
          opacity: 0.62;
        }

        .kline-auto-box span,
        .kline-notice {
          color: rgba(244, 235, 221, 0.52);
          font-size: 13px;
          line-height: 1.8;
        }

        .kline-notice {
          margin: 10px 0 16px;
        }

        .kline-result {
          border: 1px solid rgba(216, 183, 111, 0.16);
          border-radius: 18px;
          margin: 16px 0 20px;
          padding: 16px;
          background: rgba(8, 8, 7, 0.2);
        }

        .kline-result p {
          margin: 0 0 12px;
          color: rgba(216, 183, 111, 0.68);
          letter-spacing: 0.16em;
        }

        .kline-result dl,
        .kline-evidence {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 0;
        }

        .kline-result dt,
        .kline-evidence span {
          color: rgba(216, 183, 111, 0.48);
          font-size: 12px;
          letter-spacing: 0.08em;
        }

        .kline-result dd {
          color: rgba(244, 235, 221, 0.78);
          margin: 4px 0 0;
        }

        .kline-evidence {
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          margin-top: 14px;
          padding-top: 14px;
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

        .linked-thought-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin: 20px 0 0;
        }

        .linked-thought-meta div {
          border: 1px solid rgba(216, 183, 111, 0.1);
          border-radius: 12px;
          background: rgba(8, 8, 7, 0.18);
          padding: 12px;
        }

        .linked-thought-meta dt {
          color: rgba(216, 183, 111, 0.52);
          font-size: 12px;
          letter-spacing: 0.14em;
        }

        .linked-thought-meta dd {
          margin: 8px 0 0;
          color: rgba(244, 235, 221, 0.72);
          line-height: 1.65;
          word-break: break-word;
        }

        .pending-review-list {
          display: grid;
          gap: 14px;
        }

        .pending-review-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 18px;
          border: 1px solid rgba(216, 183, 111, 0.14);
          border-radius: 14px;
          background: rgba(8, 8, 7, 0.22);
          padding: 18px;
        }

        .pending-review-item.is-selected {
          border-color: rgba(216, 183, 111, 0.36);
          background: rgba(216, 183, 111, 0.06);
        }

        .pending-review-item span,
        .pending-review-item dt {
          color: rgba(216, 183, 111, 0.58);
          font-size: 12px;
          letter-spacing: 0.16em;
        }

        .pending-review-item h2 {
          margin: 8px 0;
          font-size: clamp(24px, 3vw, 38px);
        }

        .pending-review-item p {
          margin: 0;
          color: rgba(244, 235, 221, 0.66);
          line-height: 1.75;
        }

        .pending-review-item dl {
          min-width: 86px;
          margin: 0;
        }

        .pending-review-item dd {
          margin: 6px 0 0;
          color: rgba(244, 235, 221, 0.82);
        }

        .pending-review-item button,
        .review-empty-state a {
          border: 1px solid rgba(216, 183, 111, 0.28);
          border-radius: 999px;
          background: rgba(216, 183, 111, 0.06);
          color: rgba(244, 235, 221, 0.86);
          padding: 10px 16px;
          text-decoration: none;
          white-space: nowrap;
        }

        .review-empty-state {
          border: 1px solid rgba(216, 183, 111, 0.12);
          border-radius: 16px;
          background: rgba(8, 8, 7, 0.18);
          padding: 24px;
        }

        .review-empty-state p {
          color: rgba(244, 235, 221, 0.62);
          line-height: 1.9;
        }

        .review-empty-state div {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 20px;
        }

        .evidence-upload {
          display: grid;
          place-items: center;
          min-height: 128px;
          margin-top: 18px;
          border: 1px dashed rgba(216, 183, 111, 0.22);
          border-radius: 18px;
          background: rgba(8, 8, 7, 0.2);
          color: rgba(244, 235, 221, 0.72);
          cursor: pointer;
          text-align: center;
        }

        .evidence-upload input {
          display: none;
        }

        .evidence-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 18px;
        }

        .evidence-card {
          overflow: hidden;
          border: 1px solid rgba(216, 183, 111, 0.14);
          border-radius: 16px;
          background: rgba(8, 8, 7, 0.22);
        }

        .evidence-card img {
          display: block;
          width: 100%;
          aspect-ratio: 16 / 10;
          object-fit: cover;
          opacity: 0.86;
        }

        .evidence-card div {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          padding: 12px;
        }

        .evidence-card button {
          border: 1px solid rgba(216, 183, 111, 0.2);
          border-radius: 999px;
          background: transparent;
          color: rgba(244, 235, 221, 0.68);
          padding: 0 14px;
        }

        .review-summary {
          display: grid;
          gap: 12px;
          margin-top: 20px;
        }

        .review-summary div {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 14px;
          border-top: 1px solid rgba(216, 183, 111, 0.1);
          padding-top: 12px;
        }

        .review-summary strong {
          color: rgba(216, 183, 111, 0.62);
          font-weight: 500;
          letter-spacing: 0.16em;
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
          .pending-review-item {
            grid-template-columns: 1fr;
          }

          .linked-thought-meta,
          .evidence-grid,
          .form-grid,
          .kline-result dl,
          .kline-evidence {
            grid-template-columns: 1fr;
          }

          .review-summary div {
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
