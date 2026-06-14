import type {
  KlineCandle,
  KlineContextQuery,
  KlineContextResult,
  TradeReviewMarketContext,
  MarketPattern,
  MarketTrend,
  PriceLocation,
  Timeframe,
  VolumeState,
} from "@/lib/mind-archive/types"
import { analyzeKlineContext, buildFallbackResult } from "./klineAnalyzer"

export type GetKlineContextInput = {
  symbol?: string
  timeframe?: Timeframe | string
  entryTime?: string
  entryPrice?: number
}

export type KlineCandleAdapter = (query: KlineContextQuery) => Promise<KlineCandle[]> | KlineCandle[]

export const ENABLE_KLINE_CONTEXT = process.env.NEXT_PUBLIC_ENABLE_KLINE_CONTEXT === "true"

type MultiTimeframeKey = "30m" | "60m" | "101"
type MultiTimeframeAvailability = "ok" | "insufficient_data" | "missing" | "error"
type MultiTimeframeFallbackStep = {
  timeframe: MultiTimeframeKey
  status: MultiTimeframeAvailability
  reason: string
}

export type MultiTimeframeKlineContextResult = {
  symbol: string
  entryTime: string
  entryPrice?: number
  primaryTimeframe: MultiTimeframeKey | null
  timeframes: Record<MultiTimeframeKey, KlineContextResult | null>
  availability: Record<MultiTimeframeKey, MultiTimeframeAvailability>
  source: "server" | "manual"
  fallbackReason?: string
  fallbackChain: MultiTimeframeFallbackStep[]
  attemptedTimeframes: MultiTimeframeKey[]
  klineAvailable: boolean
  candlesCount?: number
  manifestStatus?: string
  sliceSource?: string
  summary: {
    dailyText?: string
    h60Text?: string
    m30Text?: string
    finalText?: string
  }
  dataSource: KlineContextResult["dataSource"]
  confidence: KlineContextResult["confidence"]
}

type KlineSliceReadResult = {
  candles: KlineCandle[]
  manifestStatus?: string
  sliceSource?: string
  notes?: string[]
}

type FetchLike = (input: string, init?: RequestInit) => Promise<{
  ok: boolean
  status?: number
  json(): Promise<unknown>
}>

const publicApiBaseUrl = normalizePublicBrowserApiBaseUrl(process.env.NEXT_PUBLIC_YM_API_BASE_URL)
const serverApiBaseUrl = (process.env.YM_API_BASE_URL || "").trim().replace(/\/$/, "")
const defaultApiBaseUrl = publicApiBaseUrl || (typeof window === "undefined" ? serverApiBaseUrl : "")
const supportedTimeframes: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "101"]
const multiTimeframeOrder: MultiTimeframeKey[] = ["30m", "60m", "101"]

const marketTrendText: Record<MarketTrend, string> = {
  uptrend: "上行趋势延续",
  downtrend: "下行趋势延续",
  range: "震荡区间",
  sharp_rise: "急涨段",
  sharp_drop: "急跌段",
  reversal_attempt: "转折尝试",
  unclear: "盘面方向不清",
}

const priceLocationText: Record<PriceLocation, string> = {
  high: "高位",
  middle: "中部",
  low: "低位",
  support_area: "支撑附近",
  resistance_area: "压力附近",
  range_top: "区间上沿",
  range_bottom: "区间下沿",
  ma_area: "均线附近",
  unclear: "位置不清",
}

const patternText: Record<MarketPattern, string> = {
  breakout: "突破",
  pullback: "回踩",
  false_breakout: "突破失败",
  range_bound: "箱体震荡",
  second_push: "二次冲高",
  second_dip: "二次探底",
  spike_and_fade: "冲高回落",
  rebound: "反抽",
  unclear: "形态不清",
}

const volumeText: Record<VolumeState, string> = {
  expanding: "放量",
  shrinking: "缩量",
  normal: "量能正常",
  unknown: "量能不明",
}

export async function getKlineContext(
  input: GetKlineContextInput,
  options: {
    candleAdapter?: KlineCandleAdapter
    enabled?: boolean
    fetchImpl?: FetchLike
    apiBaseUrl?: string
    marketKey?: string
  } = {}
): Promise<KlineContextResult> {
  const query = normalizeQuery(input)
  const enabled = options.enabled ?? ENABLE_KLINE_CONTEXT

  if (!enabled) {
    return buildManualFallbackResult({
      symbol: query.symbol,
      timeframe: query.timeframe,
      entryTime: query.entryTime,
      notes: ["K线自动盘证未开启"],
    })
  }

  try {
    const sliceRead = options.candleAdapter
      ? { candles: await options.candleAdapter(query) }
      : await fetchKlineSlice(query, {
          apiBaseUrl: options.apiBaseUrl ?? defaultApiBaseUrl,
          fetchImpl: options.fetchImpl ?? globalThis.fetch,
          marketKey: options.marketKey,
        })
    const candles = sliceRead.candles

    if (!candles.length) {
      return buildFallbackResult({
        symbol: query.symbol,
        timeframe: query.timeframe,
        entryTime: query.entryTime,
        notes: sliceRead.notes?.length ? sliceRead.notes : ["未找到匹配的K线数据，继续使用手动盘证。"],
      })
    }

    const coverage = getEntryTimeCoverage(candles, query.entryTime)
    if (coverage.status === "outside") {
      return buildFallbackResult({
        symbol: query.symbol,
        timeframe: query.timeframe,
        entryTime: query.entryTime,
        candlesUsed: candles.length,
        notes: [`K线数据未覆盖入场时间 ${query.entryTime}，slice 范围 ${coverage.first} 至 ${coverage.last}，继续使用手动盘证。`],
      })
    }

    return {
      ...analyzeKlineContext({
        candles,
        symbol: query.symbol,
        timeframe: query.timeframe,
        entryPrice: query.entryPrice,
        entryTime: query.entryTime,
      }),
      manifestStatus: sliceRead.manifestStatus,
      sliceSource: sliceRead.sliceSource,
    }
  } catch {
    return buildFallbackResult({
      symbol: query.symbol,
      timeframe: query.timeframe,
      entryTime: query.entryTime,
      notes: ["K线自动盘证读取失败，继续使用手动盘证。"],
    })
  }
}

export async function getMultiTimeframeKlineContext(
  input: Omit<GetKlineContextInput, "timeframe">,
  options: {
    candleAdapter?: KlineCandleAdapter
    enabled?: boolean
    fetchImpl?: FetchLike
    apiBaseUrl?: string
    marketKey?: string
  } = {}
): Promise<MultiTimeframeKlineContextResult> {
  const symbol = input.symbol?.trim() || ""
  const entryTime = input.entryTime?.trim() || ""
  const enabled = options.enabled ?? ENABLE_KLINE_CONTEXT

  if (!enabled) {
    return buildManualMultiTimeframeFallback({
      symbol,
      entryTime,
      entryPrice: input.entryPrice,
      fallbackReason: "K线自动盘证未开启，已切换为手动盘证。",
      attemptedTimeframes: multiTimeframeOrder,
    })
  }

  const timeframes: Record<MultiTimeframeKey, KlineContextResult | null> = {
    "30m": null,
    "60m": null,
    "101": null,
  }
  const availability: Record<MultiTimeframeKey, MultiTimeframeAvailability> = {
    "30m": "missing",
    "60m": "missing",
    "101": "missing",
  }

  const fallbackChain: MultiTimeframeFallbackStep[] = []
  const attemptedTimeframes: MultiTimeframeKey[] = []
  let primaryTimeframe: MultiTimeframeKey | null = null
  let primaryResult: KlineContextResult | null = null

  for (const timeframe of multiTimeframeOrder) {
    attemptedTimeframes.push(timeframe)

    try {
      const result = await getKlineContext(
        {
          symbol,
          timeframe,
          entryTime,
          entryPrice: input.entryPrice,
        },
        options,
      )

      if (isKlineReadError(result)) {
        timeframes[timeframe] = null
        availability[timeframe] = "error"
        fallbackChain.push({
          timeframe,
          status: "error",
          reason: getKlineFailureReason(result, "K线自动盘证读取失败，继续尝试下一周期。"),
        })
        continue
      }

      timeframes[timeframe] = result
      availability[timeframe] = toAvailability(result)
      fallbackChain.push({
        timeframe,
        status: availability[timeframe],
        reason: availability[timeframe] === "ok"
          ? "server slice 可用于盘证"
          : getKlineFailureReason(result, "K线数据不足，继续尝试下一周期。"),
      })

      if (availability[timeframe] === "ok") {
        primaryTimeframe = timeframe
        primaryResult = result
        break
      }
    } catch {
      timeframes[timeframe] = null
      availability[timeframe] = "error"
      fallbackChain.push({
        timeframe,
        status: "error",
        reason: "K线自动盘证读取失败，继续尝试下一周期。",
      })
    }
  }

  if (!primaryTimeframe || !primaryResult) {
    return {
      ...buildManualMultiTimeframeFallback({
        symbol,
        entryTime,
        entryPrice: input.entryPrice,
        fallbackReason: "30m、60m、101 周期均不可用于自动盘证，已切换为手动盘证。",
        attemptedTimeframes,
        fallbackChain,
      }),
      timeframes,
      availability,
    }
  }

  return {
    symbol,
    entryTime,
    entryPrice: input.entryPrice,
    primaryTimeframe,
    timeframes,
    availability,
    source: "server",
    fallbackChain,
    attemptedTimeframes,
    klineAvailable: true,
    candlesCount: primaryResult.candlesUsed,
    manifestStatus: primaryResult.manifestStatus,
    sliceSource: primaryResult.sliceSource,
    summary: buildMultiTimeframeSummary(timeframes, primaryTimeframe),
    dataSource: primaryResult.dataSource,
    confidence: primaryResult.confidence,
  }
}

export function createManualMarketContext(input: {
  symbol?: string
  timeframe?: string
  marketTrend?: MarketTrend
  priceLocation?: PriceLocation
  pattern?: MarketPattern
  volumeState?: VolumeState
}): TradeReviewMarketContext {
  return {
    symbol: input.symbol?.trim() || undefined,
    timeframe: input.timeframe?.trim() || undefined,
    marketTrend: input.marketTrend || "unclear",
    priceLocation: input.priceLocation || "unclear",
    pattern: input.pattern || "unclear",
    volumeState: input.volumeState || "unknown",
    source: "manual",
    klineAvailable: false,
    dataSource: "manual",
  }
}

function buildManualMultiTimeframeFallback(input: {
  symbol?: string
  entryTime?: string
  entryPrice?: number
  fallbackReason?: string
  fallbackChain?: MultiTimeframeFallbackStep[]
  attemptedTimeframes?: MultiTimeframeKey[]
}): MultiTimeframeKlineContextResult {
  return {
    symbol: input.symbol || "",
    entryTime: input.entryTime || "",
    entryPrice: input.entryPrice,
    primaryTimeframe: null,
    timeframes: {
      "30m": null,
      "60m": null,
      "101": null,
    },
    availability: {
      "30m": "missing",
      "60m": "missing",
      "101": "missing",
    },
    source: "manual",
    fallbackReason: input.fallbackReason,
    fallbackChain: input.fallbackChain || [],
    attemptedTimeframes: input.attemptedTimeframes || multiTimeframeOrder,
    klineAvailable: false,
    summary: {
      finalText: "最终盘证：多周期K线暂不可用，继续使用手动盘证，不构成交易建议。",
    },
    dataSource: "manual",
    confidence: "low",
  }
}

function buildMultiTimeframeSummary(
  timeframes: Record<MultiTimeframeKey, KlineContextResult | null>,
  primaryTimeframe: MultiTimeframeKey,
): MultiTimeframeKlineContextResult["summary"] {
  const dailyDescription = describeKlineResult(timeframes["101"])
  const h60Description = describeKlineResult(timeframes["60m"])
  const m30Description = describeKlineResult(timeframes["30m"])
  const primaryDescription = describeKlineResult(timeframes[primaryTimeframe])

  return {
    dailyText: dailyDescription ? `日线：${dailyDescription}` : undefined,
    h60Text: h60Description ? `60分钟：${h60Description}` : undefined,
    m30Text: m30Description ? `30分钟：${m30Description}` : undefined,
    finalText: primaryDescription
      ? `最终盘证：以${formatTimeframeName(primaryTimeframe)}盘证为主，${primaryDescription}，不构成交易建议。`
      : "最终盘证：多周期K线暂不可用，继续使用手动盘证，不构成交易建议。",
  }
}

function describeKlineResult(result: KlineContextResult | null): string {
  if (!result || result.dataSource !== "kline_db") return ""

  return [
    marketTrendText[result.marketTrend],
    priceLocationText[result.priceLocation],
    patternText[result.pattern],
    volumeText[result.volumeState],
  ].filter(Boolean).join("，") + "。"
}

function formatTimeframeName(timeframe: MultiTimeframeKey): string {
  if (timeframe === "101") return "日线"
  if (timeframe === "60m") return "60分钟"
  return "30分钟"
}

function toAvailability(result: KlineContextResult): MultiTimeframeAvailability {
  if (result.dataSource === "kline_db") return "ok"
  if (result.dataSource === "manual") return "missing"
  return "insufficient_data"
}

function isKlineReadError(result: KlineContextResult): boolean {
  return result.dataSource === "insufficient_data" && Boolean(result.notes?.some((note) => note.includes("读取失败")))
}

function getKlineFailureReason(result: KlineContextResult, fallback: string): string {
  return result.notes?.filter(Boolean).join("；") || fallback
}

function normalizeQuery(input: GetKlineContextInput): KlineContextQuery {
  return {
    symbol: input.symbol?.trim() || "",
    timeframe: normalizeTimeframe(input.timeframe),
    entryTime: input.entryTime?.trim() || "",
    entryPrice: input.entryPrice,
  }
}

function normalizeTimeframe(value?: Timeframe | string): Timeframe {
  const normalized = String(value || "1d").trim().toLowerCase()
  if (supportedTimeframes.includes(normalized as Timeframe)) return normalized as Timeframe
  if (normalized === "60m") return "1h"
  if (normalized === "240m") return "4h"
  if (normalized === "日线" || normalized === "day" || normalized === "daily") return "1d"
  return "1d"
}

async function fetchKlineSlice(
  query: KlineContextQuery,
  options: { apiBaseUrl: string; fetchImpl?: FetchLike; marketKey?: string }
): Promise<KlineSliceReadResult> {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl)
  const fetchImpl = options.fetchImpl

  if (!fetchImpl) return { candles: [], notes: ["K线 slice API 请求能力不可用，继续使用手动盘证。"] }
  if (!query.symbol) return { candles: [], notes: ["未提供标的，继续使用手动盘证。"] }
  if (!query.entryTime) return { candles: [], notes: ["未提供入场时间，继续使用手动盘证。"] }

  const requestUrl = buildKlineSliceUrl({
    apiBaseUrl,
    query,
    marketKey: options.marketKey,
  })
  const response = await fetchImpl(requestUrl)
  if (!response.ok) {
    return {
      candles: [],
      notes: [`K线 slice API 返回 HTTP ${response.status || "非 2xx"}，继续使用手动盘证。`],
    }
  }

  const payload = await response.json()
  const meta = normalizeKlineSliceMeta(payload)
  const candles = normalizeKlineSliceCandles(payload, query)
  const apiError = normalizeKlineSliceApiError(payload)

  return {
    candles,
    ...meta,
    notes: buildKlineSliceNotes({ candles, meta, apiError }),
  }
}

export function buildKlineSliceUrl(input: {
  apiBaseUrl: string
  query: KlineContextQuery
  marketKey?: string
}): string {
  const apiBaseUrl = normalizeApiBaseUrl(input.apiBaseUrl)
  const url = new URL("/api/v1/kline-history/slice", apiBaseUrl ? `${apiBaseUrl}/` : "https://xxjyxt.local")
  const serverTimeframe = toServerTimeframe(input.query.timeframe)
  const entryDate = toDateParam(input.query.entryTime)

  url.searchParams.set("market", input.marketKey || "cn_equity")
  url.searchParams.set("symbol", input.query.symbol)
  url.searchParams.set("timeframe", serverTimeframe)
  url.searchParams.set("window", "80")
  url.searchParams.set("blind", "0")
  url.searchParams.set("mode", "step_replay")
  url.searchParams.set("entryTime", input.query.entryTime)
  url.searchParams.set("seed", `p2_2:${input.query.symbol}:${serverTimeframe}:${input.query.entryTime}`)
  if (entryDate) url.searchParams.set("end_date", entryDate)

  return apiBaseUrl ? url.toString() : `${url.pathname}${url.search}`
}

function normalizeKlineSliceCandles(payload: unknown, query: KlineContextQuery): KlineCandle[] {
  const slice = isRecord(payload) && isRecord(payload.slice) ? payload.slice : null
  const candles = slice && Array.isArray(slice.candles) ? slice.candles : []
  const timeframe = isRecord(slice?.timeframe) && typeof slice.timeframe.key === "string"
    ? fromServerTimeframe(slice.timeframe.key)
    : query.timeframe
  const symbol = getSliceSymbol(slice) || query.symbol

  return candles
    .map((item) => normalizeSliceCandle(item, { symbol, timeframe }))
    .filter((item): item is KlineCandle => Boolean(item))
}

function normalizeKlineSliceMeta(payload: unknown): Omit<KlineSliceReadResult, "candles"> {
  const slice = isRecord(payload) && isRecord(payload.slice) ? payload.slice : null
  const manifest = isRecord(slice?.manifest) ? slice.manifest : null
  const rootManifest = isRecord(payload) && isRecord(payload.manifestStatus)
    ? payload.manifestStatus
    : null
  const manifestStatus = stringValue(
    slice?.manifestStatus ||
    slice?.manifest_status ||
    manifest?.status ||
    rootManifest?.status ||
    (isRecord(payload) ? payload.manifestStatus || payload.manifest_status : undefined),
  )
  const sliceSource = stringValue(slice?.source || (isRecord(payload) ? payload.source : undefined))

  return {
    manifestStatus,
    sliceSource,
  }
}

function normalizeKlineSliceApiError(payload: unknown): string {
  if (!isRecord(payload)) return ""
  if (payload.ok !== false && !payload.error && !payload.message) return ""
  return stringValue(payload.error || payload.message || "K线 slice API 返回错误") || "K线 slice API 返回错误"
}

function buildKlineSliceNotes(input: {
  candles: KlineCandle[]
  meta: Omit<KlineSliceReadResult, "candles">
  apiError: string
}): string[] | undefined {
  if (input.apiError) return [`K线 slice API 返回错误：${input.apiError}，继续使用手动盘证。`]
  if (input.candles.length) return undefined

  const manifestStatus = input.meta.manifestStatus ? `，manifestStatus=${input.meta.manifestStatus}` : ""
  return [`K线 slice API 未返回 candles${manifestStatus}，继续使用手动盘证。`]
}

function getEntryTimeCoverage(
  candles: KlineCandle[],
  entryTime: string,
): { status: "covered" | "outside" | "unknown"; first?: string; last?: string } {
  const entryDate = toDateKey(entryTime)
  const first = candles[0]?.openTime || ""
  const last = candles.at(-1)?.openTime || ""
  const firstDate = toDateKey(first)
  const lastDate = toDateKey(last)

  if (!entryDate || !firstDate || !lastDate) return { status: "unknown", first, last }
  if (firstDate <= entryDate && entryDate <= lastDate) return { status: "covered", first, last }
  return { status: "outside", first, last }
}

function toDateKey(value: string): string {
  if (!value) return ""
  const direct = value.match(/\d{4}-\d{2}-\d{2}/)?.[0]
  if (direct) return direct

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function normalizeSliceCandle(
  item: unknown,
  context: { symbol: string; timeframe: string }
): KlineCandle | null {
  if (!isRecord(item)) return null

  const open = finiteNumber(item.open)
  const high = finiteNumber(item.high)
  const low = finiteNumber(item.low)
  const close = finiteNumber(item.close)
  const openTime = String(item.time || item.label || "").trim()

  if (!openTime || open === undefined || high === undefined || low === undefined || close === undefined) return null

  return {
    symbol: context.symbol,
    timeframe: context.timeframe,
    openTime,
    open,
    high,
    low,
    close,
    volume: finiteNumber(item.volume),
    amount: finiteNumber(item.amount),
    pctChg: finiteNumber(item.pct_chg ?? item.pctChg),
  }
}

function buildManualFallbackResult(input: {
  symbol?: string
  timeframe?: string
  entryTime?: string
  notes?: string[]
}): KlineContextResult {
  return {
    ...buildFallbackResult(input),
    dataSource: "manual",
    notes: input.notes,
  }
}

function toServerTimeframe(value: string): string {
  if (value === "101") return "1d"
  if (value === "1h") return "60m"
  if (value === "4h") return "60m"
  if (value === "15m") return "10m"
  return value || "1d"
}

function fromServerTimeframe(value: string): string {
  if (value === "60m") return "1h"
  return value || "1d"
}

function normalizeApiBaseUrl(value: string | undefined): string {
  return String(value || "").trim().replace(/\/$/, "")
}

function normalizePublicBrowserApiBaseUrl(value: string | undefined): string {
  const normalized = String(value || "").trim().replace(/\/$/, "")
  if (!normalized) return ""
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?(?:\/|$)/i.test(normalized)) {
    return ""
  }
  return normalized
}

function toDateParam(value: string): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function getSliceSymbol(slice: unknown): string {
  if (!isRecord(slice)) return ""
  if (isRecord(slice.reveal) && typeof slice.reveal.symbol === "string") return slice.reveal.symbol
  if (isRecord(slice.instrument) && typeof slice.instrument.symbol === "string") return slice.instrument.symbol
  return ""
}

function stringValue(value: unknown): string | undefined {
  if (isRecord(value) && typeof value.status === "string") return stringValue(value.status)
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized || undefined
}

function finiteNumber(value: unknown): number | undefined {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
