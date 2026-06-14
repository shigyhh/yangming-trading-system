"use client"

import type {
  ActualAction,
  CapitalStabilityLevel,
  HeartJudgement,
  KlineContextResult,
  MarketContextDataSource,
  MarketPattern,
  MarketTrend,
  OneThoughtEvent,
  OneThoughtReaction,
  PriceLocation,
  TradeDirection,
  TradeReview,
  VolumeState,
} from "@/lib/mind-archive/types"
import { buildPanXinPracticeSentence } from "@/lib/trade-review/panXinReport"

type MarketTimeframeKey = "101" | "60m" | "30m"
type TimeframeAvailability = "ok" | "insufficient_data" | "missing" | "error"

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

const dataSourceLabels: Record<MarketContextDataSource | KlineContextResult["dataSource"], string> = {
  kline_db: "K线缓存",
  manual: "手动盘证",
  screenshot: "截图盘证",
  insufficient_data: "数据不足",
}

const availabilityLabels: Record<TimeframeAvailability, string> = {
  ok: "已读取",
  insufficient_data: "数据不足",
  missing: "缺失",
  error: "读取失败",
}

const primaryTimeframeLabels: Record<MarketTimeframeKey, string> = {
  "101": "日线",
  "60m": "60分钟",
  "30m": "30分钟",
}

const timeframeRows: Array<{ key: MarketTimeframeKey; title: string; purpose: string }> = [
  { key: "101", title: "日线", purpose: "日线看大势。" },
  { key: "60m", title: "60分钟", purpose: "60分钟看结构。" },
  { key: "30m", title: "30分钟", purpose: "30分钟看下手那一刻。" },
]

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

const directionLabels: Record<TradeDirection, string> = {
  buy: "买入",
  sell: "卖出",
  long: "做多",
  short: "做空",
  close_long: "平多",
  close_short: "平空",
}

const heartJudgementCopy: Record<HeartJudgement, { label: string; text: string }> = {
  zheng_sheng: { label: "正胜", text: "这笔既赚钱，也守住了心。" },
  zei_sheng: { label: "贼胜", text: "钱赚了，但这笔是心贼赢了。" },
  zheng_kui: { label: "正亏", text: "钱亏了，但心没有失守。" },
  shuang_shu: { label: "双输", text: "钱也亏了，心也被带走了。" },
}

const capitalStabilityCopy: Record<CapitalStabilityLevel, { label: string; text: string }> = {
  stable_with_guard: { label: "稳中有戒", text: "资金波动可控，规则基本守住。" },
  money_stable_heart_moving: { label: "钱稳心动", text: "资金暂时没坏，但心还在动。赚钱不代表这笔是正的。" },
  money_moving_heart_chaotic: {
    label: "钱动心乱",
    text: "资金波动开始被心贼牵动，仓位、风险或规则已经出现偏移。",
  },
  double_unstable: { label: "双失守", text: "钱也失守，心也失守。先停一笔，不用下一笔把自己救回来。" },
  insufficient_data: {
    label: "数据不足",
    text: "补上账户权益、仓位金额或计划风险，才能看清这笔交易有没有让资金失稳。",
  },
}

function formatText(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") return "未记录"
  return String(value)
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "未记录"
}

function formatBoolean(value: boolean | undefined) {
  return value ? "是" : "否"
}

function formatPercent(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value}%` : "未记录"
}

function getTimeframeValues(result: KlineContextResult | null | undefined) {
  return {
    marketTrend: result?.marketTrend || "unclear",
    priceLocation: result?.priceLocation || "unclear",
    pattern: result?.pattern || "unclear",
    volumeState: result?.volumeState || "unknown",
    confidence: result?.confidence || "low",
  }
}

function getFallbackText(params: {
  primaryTimeframe: TradeReview["marketContext"] extends infer T
    ? T extends { primaryTimeframe?: infer P }
      ? P
      : "30m" | "60m" | "101" | null | undefined
    : "30m" | "60m" | "101" | null | undefined
  availability?: Record<MarketTimeframeKey, TimeframeAvailability>
}) {
  if (!params.primaryTimeframe) return "K线数据不足，已切换为手动盘证。"
  if (params.primaryTimeframe === "60m" && params.availability?.["30m"] !== "ok") {
    return "30分钟数据不足，已参考 60分钟。"
  }
  if (params.primaryTimeframe === "101" && params.availability?.["60m"] !== "ok") {
    return "60分钟数据不足，已参考日线。"
  }

  return "多周期盘证已读取。"
}

export function PanXinHeZhengReport({ review, event }: { review: TradeReview; event: OneThoughtEvent | null }) {
  const marketContext = review.marketContext
  const persistedSummary = review.reviewSummary
  const timeframes = marketContext?.timeframes
  const availability = marketContext?.availability
  const primaryTimeframe = marketContext?.primaryTimeframe ?? null
  const behaviorEvidence = review.behaviorEvidence
  const judgement = heartJudgementCopy[review.heartJudgement]
  const capitalStability = review.capitalStability
  const capitalLevel = capitalStability?.level || "insufficient_data"
  const capitalCopy = capitalStabilityCopy[capitalLevel]
  const fallbackText = getFallbackText({ primaryTimeframe, availability })
  const practiceSentence = persistedSummary?.practiceText || buildPanXinPracticeSentence({ event, review })

  const thoughtRows = [
    { label: "os", value: review.os },
    { label: "reflectionFinal", value: review.reflectionFinal },
    { label: "heartThief", value: event?.heartThief || review.heartThief },
    { label: "userReaction", value: event?.userReaction ? reactionLabels[event.userReaction] : undefined },
    { label: "actualAction", value: event?.actualAction ? actionLabels[event.actualAction] : undefined },
    { label: "painPoint", value: event?.painPoint || review.painPoint },
  ]

  const handRows = [
    { label: "followedPlan", value: formatBoolean(review.followedPlan) },
    { label: "brokeRule", value: formatBoolean(review.brokeRule) },
    { label: "changedPlanIntraday", value: formatBoolean(behaviorEvidence?.changedPlanIntraday) },
    { label: "addedPosition", value: formatBoolean(behaviorEvidence?.addedPosition) },
    { label: "movedStopLoss", value: formatBoolean(behaviorEvidence?.movedStopLoss) },
    { label: "emotionDrivenEntry", value: formatBoolean(behaviorEvidence?.emotionDrivenEntry) },
    { label: "pnl", value: formatNumber(review.pnl) },
    { label: "symbol", value: review.symbol },
    { label: "direction", value: directionLabels[review.direction] },
    { label: "entryPrice", value: formatNumber(review.entryPrice) },
    { label: "exitPrice", value: formatNumber(review.exitPrice) },
  ]
  const capitalMetricRows = [
    { label: "pnlPctOfEquity", value: formatPercent(capitalStability?.metrics.pnlPctOfEquity) },
    { label: "positionPctOfEquity", value: formatPercent(capitalStability?.metrics.positionPctOfEquity) },
    { label: "riskPctOfEquity", value: formatPercent(capitalStability?.metrics.riskPctOfEquity) },
    { label: "exceededPlannedRisk", value: capitalStability?.metrics.exceededPlannedRisk ? "是" : "否" },
    { label: "lossStreak", value: formatText(capitalStability?.metrics.lossStreak) },
    { label: "brokeRuleLossPct", value: formatPercent(capitalStability?.metrics.brokeRuleLossPct) },
  ]
  const capitalReasons = capitalStability?.reasons.length ? capitalStability.reasons : [capitalCopy.text]
  const capitalWarnings = capitalStability?.warnings.length ? capitalStability.warnings : []

  return (
    <section className="panxin-report" aria-label="盘心合证报告">
      <div className="report-head">
        <p>盘心合证报告</p>
        <h2>把这笔交易，放回当时那一念与那张盘。</h2>
      </div>

      <article className="report-section">
        <p>一</p>
        <h3>当时那一念</h3>
        <span>交易之后，回到当时那一念。</span>
        <dl className="report-grid thought-grid">
          {thoughtRows.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{formatText(item.value)}</dd>
            </div>
          ))}
        </dl>
      </article>

      <article className="report-section">
        <p>二</p>
        <h3>当时那张盘</h3>
        <div className="market-meta">
          <div>
            <dt>primaryTimeframe</dt>
            <dd>{primaryTimeframe ? primaryTimeframeLabels[primaryTimeframe] : "手动盘证"}</dd>
          </div>
          <div>
            <dt>dataSource</dt>
            <dd>{marketContext?.dataSource ? dataSourceLabels[marketContext.dataSource] : "手动盘证"}</dd>
          </div>
          <div>
            <dt>confidence</dt>
            <dd>{marketContext?.confidence ? confidenceLabels[marketContext.confidence] : "低"}</dd>
          </div>
          <div>
            <dt>fallback</dt>
            <dd>{fallbackText}</dd>
          </div>
        </div>
        <div className="timeframe-grid">
          {timeframeRows.map((item) => {
            const result = timeframes?.[item.key] ?? null
            const values = getTimeframeValues(result)

            return (
              <section className={primaryTimeframe === item.key ? "timeframe-card is-primary" : "timeframe-card"} key={item.key}>
                <div className="timeframe-head">
                  <div>
                    <h4>{item.title}</h4>
                    <span>{item.purpose}</span>
                  </div>
                  <strong>{availabilityLabels[availability?.[item.key] || "missing"]}</strong>
                </div>
                <dl>
                  <div>
                    <dt>趋势</dt>
                    <dd>{marketTrendLabels[values.marketTrend]}</dd>
                  </div>
                  <div>
                    <dt>位置</dt>
                    <dd>{priceLocationLabels[values.priceLocation]}</dd>
                  </div>
                  <div>
                    <dt>形态</dt>
                    <dd>{patternLabels[values.pattern]}</dd>
                  </div>
                  <div>
                    <dt>量能</dt>
                    <dd>{volumeStateLabels[values.volumeState]}</dd>
                  </div>
                  <div>
                    <dt>置信度</dt>
                    <dd>{confidenceLabels[values.confidence]}</dd>
                  </div>
                </dl>
              </section>
            )
          })}
        </div>
        <strong className="final-market-text">
          {marketContext?.summary?.finalText || persistedSummary?.marketText || "最终盘证：K线数据不足，已切换为手动盘证。"}
        </strong>
      </article>

      <article className="report-section">
        <p>三</p>
        <h3>当时那只手</h3>
        <dl className="report-grid hand-grid">
          {handRows.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{formatText(item.value)}</dd>
            </div>
          ))}
        </dl>
      </article>

      <article className="report-section judgement-section">
        <p>四</p>
        <h3>这笔心性判定</h3>
        <div className="judgement-pill">
          <span>heartJudgement</span>
          <strong>{judgement.label}</strong>
        </div>
        <p className="judgement-copy">{judgement.text}</p>
      </article>

      <article className="report-section capital-section">
        <p>五</p>
        <h3>这笔资金是否稳定</h3>
        <div className="capital-status">
          <div>
            <span>level</span>
            <strong>{capitalCopy.label}</strong>
          </div>
          {typeof capitalStability?.score === "number" ? (
            <div>
              <span>score</span>
              <strong>{capitalStability.score}</strong>
            </div>
          ) : null}
        </div>
        <p className="capital-copy">{capitalCopy.text}</p>
        <dl className="report-grid capital-metrics">
          {capitalMetricRows.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="capital-lists">
          <section>
            <h4>reasons</h4>
            <ul>
              {capitalReasons.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          {capitalWarnings.length ? (
            <section>
              <h4>warnings</h4>
              <ul>
                {capitalWarnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        {capitalStability?.practiceText ? <strong className="capital-practice">{capitalStability.practiceText}</strong> : null}
      </article>

      <article className="report-section practice-section">
        <p>六</p>
        <h3>下次同类场景修行</h3>
        <strong>{practiceSentence}</strong>
      </article>

      <style jsx>{`
        .panxin-report {
          border: 1px solid rgba(216, 183, 111, 0.18);
          border-radius: 20px;
          background:
            linear-gradient(180deg, rgba(216, 183, 111, 0.06), rgba(8, 8, 7, 0.1)),
            rgba(8, 8, 7, 0.24);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
          color: rgba(244, 235, 221, 0.86);
          margin: 28px 0;
          overflow: hidden;
          padding: clamp(20px, 4vw, 30px);
        }

        .report-head {
          border-bottom: 1px solid rgba(216, 183, 111, 0.12);
          margin-bottom: 22px;
          padding-bottom: 18px;
        }

        .report-head p,
        .report-section > p {
          color: rgba(216, 183, 111, 0.62);
          font-size: 13px;
          letter-spacing: 0.18em;
          margin: 0 0 10px;
        }

        .report-head h2,
        .report-section h3,
        .timeframe-card h4 {
          font-family: var(--font-serif);
          font-weight: 400;
          margin: 0;
        }

        .report-head h2 {
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1.35;
        }

        .report-section {
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          min-width: 0;
          padding: 22px 0;
        }

        .report-section:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .report-section h3 {
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.35;
        }

        .report-section > span,
        .judgement-copy {
          color: rgba(244, 235, 221, 0.6);
          display: block;
          line-height: 1.85;
          margin-top: 8px;
        }

        .report-grid,
        .market-meta,
        .timeframe-grid {
          display: grid;
          gap: 12px;
          margin-top: 16px;
        }

        .report-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .market-meta {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .timeframe-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .report-grid div,
        .market-meta div,
        .timeframe-card {
          border: 1px solid rgba(216, 183, 111, 0.12);
          border-radius: 14px;
          background: rgba(8, 8, 7, 0.22);
          min-width: 0;
          padding: 14px;
        }

        dt {
          color: rgba(216, 183, 111, 0.52);
          font-size: 12px;
          letter-spacing: 0.12em;
          line-height: 1.5;
        }

        dd {
          color: rgba(244, 235, 221, 0.76);
          line-height: 1.75;
          margin: 6px 0 0;
          overflow-wrap: anywhere;
        }

        .timeframe-card.is-primary {
          border-color: rgba(216, 183, 111, 0.36);
          background: rgba(216, 183, 111, 0.06);
        }

        .timeframe-head {
          align-items: flex-start;
          display: flex;
          gap: 12px;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .timeframe-card h4 {
          color: rgba(244, 235, 221, 0.9);
          font-size: 22px;
          line-height: 1.3;
        }

        .timeframe-head span,
        .timeframe-head strong {
          color: rgba(216, 183, 111, 0.58);
          font-size: 12px;
          font-weight: 500;
          line-height: 1.65;
        }

        .timeframe-head strong {
          border: 1px solid rgba(216, 183, 111, 0.16);
          border-radius: 999px;
          flex: 0 0 auto;
          padding: 4px 8px;
          white-space: nowrap;
        }

        .timeframe-card dl {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin: 0;
        }

        .final-market-text,
        .practice-section strong {
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          color: rgba(244, 235, 221, 0.82);
          display: block;
          font-size: 15px;
          font-weight: 500;
          line-height: 1.85;
          margin-top: 16px;
          padding-top: 14px;
        }

        .judgement-pill {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 16px;
        }

        .judgement-pill span {
          color: rgba(216, 183, 111, 0.52);
          letter-spacing: 0.12em;
        }

        .judgement-pill strong {
          border: 1px solid rgba(216, 183, 111, 0.26);
          border-radius: 999px;
          color: rgba(216, 183, 111, 0.9);
          font-family: var(--font-serif);
          font-size: 24px;
          font-weight: 400;
          padding: 8px 16px;
        }

        .capital-status {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 16px;
        }

        .capital-status div {
          border: 1px solid rgba(216, 183, 111, 0.18);
          border-radius: 14px;
          background: rgba(8, 8, 7, 0.22);
          display: grid;
          gap: 6px;
          min-width: 0;
          padding: 12px 14px;
        }

        .capital-status span,
        .capital-lists h4 {
          color: rgba(216, 183, 111, 0.52);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.12em;
          margin: 0;
        }

        .capital-status strong {
          color: rgba(216, 183, 111, 0.9);
          font-family: var(--font-serif);
          font-size: 24px;
          font-weight: 400;
          line-height: 1.25;
        }

        .capital-copy {
          color: rgba(244, 235, 221, 0.66);
          line-height: 1.85;
          margin: 12px 0 0;
        }

        .capital-lists {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 16px;
        }

        .capital-lists section {
          border: 1px solid rgba(216, 183, 111, 0.12);
          border-radius: 14px;
          background: rgba(8, 8, 7, 0.22);
          min-width: 0;
          padding: 14px;
        }

        .capital-lists ul {
          color: rgba(244, 235, 221, 0.72);
          line-height: 1.8;
          margin: 10px 0 0;
          padding-left: 18px;
        }

        .capital-practice {
          border-top: 1px solid rgba(216, 183, 111, 0.12);
          color: rgba(244, 235, 221, 0.82);
          display: block;
          font-size: 15px;
          font-weight: 500;
          line-height: 1.85;
          margin-top: 16px;
          padding-top: 14px;
        }

        @media (max-width: 760px) {
          .panxin-report {
            border-radius: 16px;
            padding: 18px;
          }

          .report-grid,
          .market-meta,
          .capital-lists,
          .timeframe-grid,
          .timeframe-card dl {
            grid-template-columns: 1fr;
          }

          .timeframe-head {
            display: grid;
          }
        }
      `}</style>
    </section>
  )
}
