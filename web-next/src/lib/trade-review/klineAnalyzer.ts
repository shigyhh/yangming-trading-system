import type {
  KlineCandle,
  KlineContextResult,
  MarketTrend,
  PriceLocation,
  VolumeState,
} from "@/lib/mind-archive/types"

type AnalyzeKlineContextInput = {
  candles: KlineCandle[]
  symbol?: string
  timeframe?: string
  entryPrice?: number
  entryTime?: string
}

const MIN_CANDLES = 30

export function analyzeKlineContext({
  candles,
  symbol: querySymbol,
  timeframe: queryTimeframe,
  entryPrice,
  entryTime,
}: AnalyzeKlineContextInput): KlineContextResult {
  const normalized = normalizeCandles(candles)
  const first = normalized[0]
  const last = normalized.at(-1)
  const symbol = inputSymbol(querySymbol, first?.symbol)
  const timeframe = inputTimeframe(queryTimeframe, first?.timeframe)
  const resolvedEntryTime = entryTime || last?.openTime || ""

  if (normalized.length < MIN_CANDLES || !last) {
    return buildFallbackResult({
      symbol,
      timeframe,
      entryTime: resolvedEntryTime,
      candlesUsed: normalized.length,
      notes: ["K线数量不足，自动盘证暂不启用。"],
    })
  }

  const recent20 = normalized.slice(-20)
  const recent60 = normalized.slice(-60)
  const recentHigh = max(recent60.map((item) => item.high))
  const recentLow = min(recent60.map((item) => item.low))
  const lastClose = last.close
  const ma20 = average(recent20.map((item) => item.close))
  const ma60 = average(recent60.map((item) => item.close))
  const slopePct = pctChange(recent20[0]?.close, lastClose)
  const avgMove20 = averageAbsPctMove(recent20)
  const recent5Change = pctChange(normalized.at(-6)?.close, lastClose)
  const marketTrend = detectMarketTrend({
    lastClose,
    ma20,
    ma60,
    slopePct,
    recent5Change,
    avgMove20,
    recentHigh,
    recentLow,
  })
  const referencePrice = Number.isFinite(entryPrice) ? Number(entryPrice) : lastClose
  const priceLocation = detectPriceLocation({
    price: referencePrice,
    recentHigh,
    recentLow,
    ma20,
    ma60,
    marketTrend,
  })
  const pattern = detectPattern({ candles: normalized, marketTrend, ma20, recentHigh, recentLow })
  const { volumeState, volumeRatio } = detectVolumeState(normalized)
  const confidence = normalized.length >= 60 && marketTrend !== "unclear" && pattern !== "unclear"
    ? "high"
    : "medium"

  return {
    symbol,
    timeframe,
    entryTime: resolvedEntryTime,
    candlesUsed: normalized.length,
    marketTrend,
    priceLocation,
    pattern,
    volumeState,
    confidence,
    dataSource: "kline_db",
    evidence: {
      recentHigh: round(recentHigh),
      recentLow: round(recentLow),
      lastClose: round(lastClose),
      ma20: round(ma20),
      ma60: round(ma60),
      slopePct: round(slopePct),
      volumeRatio: volumeRatio === undefined ? undefined : round(volumeRatio),
    },
    notes: [],
  }
}

export function buildFallbackResult(input: {
  symbol?: string
  timeframe?: KlineCandle["timeframe"]
  entryTime?: string
  candlesUsed?: number
  notes?: string[]
}): KlineContextResult {
  return {
    symbol: input.symbol || "",
    timeframe: input.timeframe || "1d",
    entryTime: input.entryTime || "",
    candlesUsed: input.candlesUsed || 0,
    marketTrend: "unclear",
    priceLocation: "unclear",
    pattern: "unclear",
    volumeState: "unknown",
    confidence: "low",
    dataSource: "insufficient_data",
    evidence: {},
    notes: input.notes || ["暂无可用K线数据，继续使用手动盘证。"],
  }
}

function detectMarketTrend(input: {
  lastClose: number
  ma20: number
  ma60: number
  slopePct: number
  recent5Change: number
  avgMove20: number
  recentHigh: number
  recentLow: number
}): MarketTrend {
  const rangePct = pctRange(input.recentHigh, input.recentLow)

  if (input.avgMove20 > 0 && input.recent5Change > input.avgMove20 * 5 && input.recent5Change > 8) {
    return "sharp_rise"
  }

  if (input.avgMove20 > 0 && input.recent5Change < -input.avgMove20 * 5 && input.recent5Change < -8) {
    return "sharp_drop"
  }

  if (Math.abs(input.slopePct) <= 4 && rangePct <= 10) {
    return "range"
  }

  if (input.lastClose > input.ma20 && input.ma20 > input.ma60 && input.slopePct > 0.8) {
    return "uptrend"
  }

  if (input.lastClose < input.ma20 && input.ma20 < input.ma60 && input.slopePct < -0.8) {
    return "downtrend"
  }

  return "unclear"
}

function detectPriceLocation(input: {
  price: number
  recentHigh: number
  recentLow: number
  ma20: number
  ma60: number
  marketTrend: MarketTrend
}): PriceLocation {
  const span = Math.max(input.recentHigh - input.recentLow, 0.000001)
  const position = (input.price - input.recentLow) / span
  const maTolerance = span * 0.04

  if (Math.abs(input.price - input.ma20) <= maTolerance || Math.abs(input.price - input.ma60) <= maTolerance) {
    return "ma_area"
  }

  if (position >= 0.85) {
    return input.marketTrend === "range" ? "range_top" : "high"
  }

  if (position <= 0.15) {
    return input.marketTrend === "range" ? "range_bottom" : "low"
  }

  if (position >= 0.75) return "resistance_area"
  if (position <= 0.25) return "support_area"

  return "middle"
}

function detectPattern(input: {
  candles: KlineCandle[]
  marketTrend: MarketTrend
  ma20: number
  recentHigh: number
  recentLow: number
}): KlineContextResult["pattern"] {
  const current = input.candles.at(-1)
  const previous = input.candles.at(-2)
  if (!current) return "unclear"

  const beforeCurrentHigh = max(input.candles.slice(-21, -1).map((item) => item.high))
  const beforePreviousHigh = max(input.candles.slice(-22, -2).map((item) => item.high))
  const span = Math.max(input.recentHigh - input.recentLow, 0.000001)
  const upperShadow = current.high - Math.max(current.open, current.close)
  const body = Math.abs(current.close - current.open) || 0.000001

  if (upperShadow > body * 2 && current.close < current.high - span * 0.25) {
    return "spike_and_fade"
  }

  if (previous && previous.close > beforePreviousHigh && current.close < beforePreviousHigh) {
    return "false_breakout"
  }

  if (current.close > beforeCurrentHigh) {
    return "breakout"
  }

  if (input.marketTrend === "range") {
    return "range_bound"
  }

  if (input.marketTrend === "uptrend" && Math.abs(current.close - input.ma20) <= span * 0.08) {
    return "pullback"
  }

  if (["downtrend", "sharp_drop"].includes(input.marketTrend) && current.close > (previous?.close || current.open)) {
    return "rebound"
  }

  return "unclear"
}

function detectVolumeState(candles: KlineCandle[]): { volumeState: VolumeState; volumeRatio?: number } {
  const currentVolume = candles.at(-1)?.volume
  const recentVolumes = candles.slice(-21, -1).map((item) => item.volume).filter(isFiniteNumber)

  if (!isFiniteNumber(currentVolume) || !recentVolumes.length) {
    return { volumeState: "unknown" }
  }

  const volumeRatio = Number(currentVolume) / Math.max(average(recentVolumes), 0.000001)

  if (volumeRatio > 1.5) return { volumeState: "expanding", volumeRatio }
  if (volumeRatio < 0.7) return { volumeState: "shrinking", volumeRatio }
  return { volumeState: "normal", volumeRatio }
}

function normalizeCandles(candles: KlineCandle[]): KlineCandle[] {
  return candles
    .filter((item) => {
      return item.symbol && item.timeframe && item.openTime && [item.open, item.high, item.low, item.close].every(isFiniteNumber)
    })
    .map((item) => ({
      ...item,
      high: Math.max(item.high, item.low),
      low: Math.min(item.high, item.low),
    }))
    .sort((a, b) => a.openTime.localeCompare(b.openTime))
}

function inputSymbol(value?: string, fallback?: string): string {
  return String(value || fallback || "").trim()
}

function inputTimeframe(value?: string, fallback?: string): string {
  return String(value || fallback || "1d").trim() || "1d"
}

function average(values: number[]): number {
  const finite = values.filter(isFiniteNumber)
  if (!finite.length) return 0
  return finite.reduce((sum, value) => sum + value, 0) / finite.length
}

function averageAbsPctMove(candles: KlineCandle[]): number {
  const moves: number[] = []
  for (let index = 1; index < candles.length; index += 1) {
    moves.push(Math.abs(pctChange(candles[index - 1].close, candles[index].close)))
  }
  return average(moves)
}

function pctChange(from?: number, to?: number): number {
  if (!isFiniteNumber(from) || !isFiniteNumber(to) || Number(from) === 0) return 0
  return ((Number(to) - Number(from)) / Math.abs(Number(from))) * 100
}

function pctRange(high: number, low: number): number {
  if (!isFiniteNumber(high) || !isFiniteNumber(low) || low === 0) return 0
  return ((high - low) / Math.abs(low)) * 100
}

function max(values: number[]): number {
  return Math.max(...values.filter(isFiniteNumber))
}

function min(values: number[]): number {
  return Math.min(...values.filter(isFiniteNumber))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function round(value: number): number | undefined {
  if (!isFiniteNumber(value)) return undefined
  return Number(value.toFixed(4))
}
