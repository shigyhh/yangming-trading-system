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

type FetchLike = (input: string, init?: RequestInit) => Promise<{
  ok: boolean
  status?: number
  json(): Promise<unknown>
}>

const defaultApiBaseUrl = (process.env.NEXT_PUBLIC_YM_API_BASE_URL || process.env.YM_API_BASE_URL || "").replace(/\/$/, "")
const supportedTimeframes: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "101"]

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
    const candles = options.candleAdapter
      ? await options.candleAdapter(query)
      : await fetchKlineSliceCandles(query, {
          apiBaseUrl: options.apiBaseUrl ?? defaultApiBaseUrl,
          fetchImpl: options.fetchImpl ?? globalThis.fetch,
          marketKey: options.marketKey,
        })

    if (!candles.length) {
      return buildFallbackResult({
        symbol: query.symbol,
        timeframe: query.timeframe,
        entryTime: query.entryTime,
        notes: ["未找到匹配的K线数据，继续使用手动盘证。"],
      })
    }

    return analyzeKlineContext({
      candles,
      symbol: query.symbol,
      timeframe: query.timeframe,
      entryPrice: query.entryPrice,
      entryTime: query.entryTime,
    })
  } catch {
    return buildFallbackResult({
      symbol: query.symbol,
      timeframe: query.timeframe,
      entryTime: query.entryTime,
      notes: ["K线自动盘证读取失败，继续使用手动盘证。"],
    })
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
    dataSource: "manual",
  }
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

async function fetchKlineSliceCandles(
  query: KlineContextQuery,
  options: { apiBaseUrl: string; fetchImpl?: FetchLike; marketKey?: string }
): Promise<KlineCandle[]> {
  const apiBaseUrl = String(options.apiBaseUrl || "").replace(/\/$/, "")
  const fetchImpl = options.fetchImpl

  if (!apiBaseUrl || !fetchImpl || !query.symbol || !query.entryTime) return []

  const requestUrl = buildKlineSliceUrl({
    apiBaseUrl,
    query,
    marketKey: options.marketKey,
  })
  const response = await fetchImpl(requestUrl)
  if (!response.ok) return []

  const payload = await response.json()
  return normalizeKlineSliceCandles(payload, query)
}

export function buildKlineSliceUrl(input: {
  apiBaseUrl: string
  query: KlineContextQuery
  marketKey?: string
}): string {
  const url = new URL("/api/v1/kline-history/slice", `${input.apiBaseUrl.replace(/\/$/, "")}/`)
  const serverTimeframe = toServerTimeframe(input.query.timeframe)
  const entryDate = toDateParam(input.query.entryTime)

  url.searchParams.set("market", input.marketKey || "cn_equity")
  url.searchParams.set("symbol", input.query.symbol)
  url.searchParams.set("timeframe", serverTimeframe)
  url.searchParams.set("window", "80")
  url.searchParams.set("blind", "0")
  url.searchParams.set("mode", "step_replay")
  url.searchParams.set("seed", `p2_2:${input.query.symbol}:${serverTimeframe}:${input.query.entryTime}`)
  if (entryDate) url.searchParams.set("end_date", entryDate)

  return url.toString()
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

function finiteNumber(value: unknown): number | undefined {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
