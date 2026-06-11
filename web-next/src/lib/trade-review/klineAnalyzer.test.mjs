import assert from "node:assert/strict"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const analyzerUrl = new URL("./klineAnalyzer.ts", import.meta.url)
const serviceUrl = new URL("./klineContextService.ts", import.meta.url)

async function importTsModule(fileUrl) {
  const source = await readFile(fileUrl, "utf8")
  const dir = path.join(tmpdir(), "yangming-kline-analyzer-tests")
  await mkdir(dir, { recursive: true })
  const analyzerTempPath = path.join(dir, "klineAnalyzer.mjs")
  if (path.basename(fileUrl.pathname) === "klineContextService.ts") {
    const analyzerSource = await readFile(analyzerUrl, "utf8")
    const analyzerJs = transpileTs(analyzerSource)
    await writeFile(analyzerTempPath, analyzerJs, "utf8")
  }
  const js = transpileTs(source).replaceAll('from "./klineAnalyzer"', 'from "./klineAnalyzer.mjs"')
  const filePath = path.join(dir, `${path.basename(fileUrl.pathname, ".ts")}-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`)
  await writeFile(filePath, js, "utf8")
  return import(`file://${filePath}`)
}

function transpileTs(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  }).outputText.replaceAll("@/lib/mind-archive/types", path.resolve("src/lib/mind-archive/types.ts"))
}

function buildCandles({
  symbol = "TEST",
  timeframe = "1d",
  count = 80,
  start = 100,
  step = 1,
  wave = 0,
  volume = 100,
} = {}) {
  return Array.from({ length: count }, (_, index) => {
    const base = start + index * step + (wave ? Math.sin(index / 2) * wave : 0)
    const openTime = new Date(Date.UTC(2026, 0, index + 1)).toISOString()
    return {
      symbol,
      timeframe,
      openTime,
      open: Number((base - 0.4).toFixed(2)),
      high: Number((base + 1).toFixed(2)),
      low: Number((base - 1).toFixed(2)),
      close: Number(base.toFixed(2)),
      volume,
    }
  })
}

test("klineAnalyzer returns insufficient_data when candles are not enough", async () => {
  const { analyzeKlineContext } = await importTsModule(analyzerUrl)
  const result = analyzeKlineContext({ candles: buildCandles({ count: 12 }), entryTime: "2026-01-12T00:00:00.000Z" })

  assert.equal(result.dataSource, "insufficient_data")
  assert.equal(result.marketTrend, "unclear")
  assert.equal(result.priceLocation, "unclear")
  assert.equal(result.pattern, "unclear")
  assert.equal(result.volumeState, "unknown")
  assert.equal(result.confidence, "low")
})

test("klineAnalyzer detects uptrend and downtrend", async () => {
  const { analyzeKlineContext } = await importTsModule(analyzerUrl)

  assert.equal(analyzeKlineContext({ candles: buildCandles({ step: 1.5 }) }).marketTrend, "uptrend")
  assert.equal(analyzeKlineContext({ candles: buildCandles({ start: 220, step: -1.5 }) }).marketTrend, "downtrend")
})

test("klineAnalyzer detects range, sharp rise, and sharp drop", async () => {
  const { analyzeKlineContext } = await importTsModule(analyzerUrl)
  const range = buildCandles({ start: 100, step: 0 })
  const sharpRise = buildCandles({ start: 100, step: 0.15 })
  sharpRise.slice(-5).forEach((item, index) => {
    const close = 120 + index * 4
    item.open = close - 2
    item.close = close
    item.high = close + 1
    item.low = close - 3
  })
  const sharpDrop = buildCandles({ start: 150, step: -0.15 })
  sharpDrop.slice(-5).forEach((item, index) => {
    const close = 120 - index * 4
    item.open = close + 2
    item.close = close
    item.high = close + 3
    item.low = close - 1
  })

  assert.equal(analyzeKlineContext({ candles: range }).marketTrend, "range")
  assert.equal(analyzeKlineContext({ candles: sharpRise }).marketTrend, "sharp_rise")
  assert.equal(analyzeKlineContext({ candles: sharpDrop }).marketTrend, "sharp_drop")
})

test("klineAnalyzer detects range_top and range_bottom locations", async () => {
  const { analyzeKlineContext } = await importTsModule(analyzerUrl)
  const candles = buildCandles({ start: 100, step: 0 })

  assert.equal(analyzeKlineContext({ candles, entryPrice: 100.8 }).priceLocation, "range_top")
  assert.equal(analyzeKlineContext({ candles, entryPrice: 99.2 }).priceLocation, "range_bottom")
})

test("klineAnalyzer detects breakout, false breakout, and spike and fade", async () => {
  const { analyzeKlineContext } = await importTsModule(analyzerUrl)
  const breakout = buildCandles({ start: 100, step: 0.1 })
  breakout.at(-1).close = 116
  breakout.at(-1).high = 117

  const falseBreakout = buildCandles({ start: 100, step: 0 })
  falseBreakout.at(-2).close = 115
  falseBreakout.at(-2).high = 116
  falseBreakout.at(-1).open = 104
  falseBreakout.at(-1).close = 100
  falseBreakout.at(-1).high = 106

  const spikeAndFade = buildCandles({ start: 100, step: 0.1 })
  spikeAndFade.at(-1).high = 130
  spikeAndFade.at(-1).close = 105

  assert.equal(analyzeKlineContext({ candles: breakout }).pattern, "breakout")
  assert.equal(analyzeKlineContext({ candles: falseBreakout }).pattern, "false_breakout")
  assert.equal(analyzeKlineContext({ candles: spikeAndFade }).pattern, "spike_and_fade")
})

test("klineAnalyzer detects volume states", async () => {
  const { analyzeKlineContext } = await importTsModule(analyzerUrl)
  const expanding = buildCandles({ volume: 100 })
  expanding.at(-1).volume = 220
  const shrinking = buildCandles({ volume: 100 })
  shrinking.at(-1).volume = 50
  const unknown = buildCandles()
  unknown.forEach((item) => {
    delete item.volume
  })

  assert.equal(analyzeKlineContext({ candles: expanding }).volumeState, "expanding")
  assert.equal(analyzeKlineContext({ candles: shrinking }).volumeState, "shrinking")
  assert.equal(analyzeKlineContext({ candles: unknown }).volumeState, "unknown")
})

test("getKlineContext returns insufficient_data without throwing when enabled but no data source is available", async () => {
  const { getKlineContext } = await importTsModule(serviceUrl)
  const result = await getKlineContext(
    { symbol: "TEST", timeframe: "1d", entryTime: "2026-01-01T00:00:00.000Z" },
    { enabled: true }
  )

  assert.equal(result.dataSource, "insufficient_data")
  assert.equal(result.candlesUsed, 0)
  assert.equal(result.confidence, "low")
})
