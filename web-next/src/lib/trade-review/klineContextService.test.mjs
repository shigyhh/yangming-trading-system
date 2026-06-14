import assert from "node:assert/strict"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const analyzerUrl = new URL("./klineAnalyzer.ts", import.meta.url)
const serviceUrl = new URL("./klineContextService.ts", import.meta.url)

async function importService() {
  const dir = path.join(tmpdir(), "yangming-kline-context-service-tests")
  await mkdir(dir, { recursive: true })
  const analyzerSource = await readFile(analyzerUrl, "utf8")
  const serviceSource = await readFile(serviceUrl, "utf8")
  await writeFile(path.join(dir, "klineAnalyzer.mjs"), transpileTs(analyzerSource), "utf8")
  const serviceJs = transpileTs(serviceSource).replaceAll('from "./klineAnalyzer"', 'from "./klineAnalyzer.mjs"')
  const servicePath = path.join(dir, `klineContextService-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`)
  await writeFile(servicePath, serviceJs, "utf8")
  return import(`file://${servicePath}`)
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

function buildServerCandles(count = 80) {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 1.2
    return {
      index,
      time: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      label: `D${index + 1}`,
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 100 + index,
      amount: 1000 + index,
      pct_chg: 1,
    }
  })
}

function buildServerCandlesFrom(startDate, count = 80) {
  const start = new Date(`${startDate}T00:00:00.000Z`)
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 1.2
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000)
    return {
      index,
      time: date.toISOString(),
      label: `D${index + 1}`,
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 100 + index,
      amount: 1000 + index,
      pct_chg: 1,
    }
  })
}

function buildPayload(timeframe, candles = buildServerCandles()) {
  return {
    ok: true,
    slice: {
      timeframe: { key: timeframe, label: timeframe },
      reveal: { symbol: "600519" },
      source: "server-cache",
      manifest: { status: "ok" },
      candles,
    },
  }
}

function makeFetchByTimeframe(payloadByTimeframe) {
  const calls = []
  const fetchImpl = async (url) => {
    const parsed = new URL(String(url), "https://example.test")
    const timeframe = parsed.searchParams.get("timeframe")
    calls.push(timeframe)

    const payload = payloadByTimeframe[timeframe]
    if (payload instanceof Error) throw payload
    if (payload === undefined) {
      return { ok: false, status: 404, json: async () => ({ ok: false }) }
    }

    return { ok: true, json: async () => payload }
  }

  return { fetchImpl, calls }
}

test("getKlineContext calls existing kline-history slice API and analyzes returned candles", async () => {
  const { getKlineContext } = await importService()
  let calledUrl = ""
  const fetchImpl = async (url) => {
    calledUrl = String(url)
    return {
      ok: true,
      json: async () => ({
        ok: true,
        slice: {
          timeframe: { key: "1d", label: "日线" },
          reveal: { symbol: "600519" },
          candles: buildServerCandles(),
        },
      }),
    }
  }

  const result = await getKlineContext(
    { symbol: "600519", timeframe: "101", entryTime: "2026-03-20T00:00:00.000Z", entryPrice: 190 },
    { enabled: true, apiBaseUrl: "https://example.test", fetchImpl }
  )
  const url = new URL(calledUrl)

  assert.equal(url.pathname, "/api/v1/kline-history/slice")
  assert.equal(url.searchParams.get("symbol"), "600519")
  assert.equal(url.searchParams.get("timeframe"), "1d")
  assert.equal(url.searchParams.get("blind"), "0")
  assert.equal(url.searchParams.get("window"), "80")
  assert.equal(url.searchParams.get("end_date"), "2026-03-20")
  assert.equal(result.dataSource, "kline_db")
  assert.equal(result.marketTrend, "uptrend")
  assert.equal(result.symbol, "600519")
  assert.equal(result.sliceSource, undefined)
})

test("getKlineContext defaults browser-safe kline-history slice requests to same-origin path", async () => {
  const { getKlineContext } = await importService()
  let calledUrl = ""
  const result = await getKlineContext(
    { symbol: "600519", timeframe: "30m", entryTime: "2026-03-20T00:00:00.000Z", entryPrice: 190 },
    {
      enabled: true,
      fetchImpl: async (url) => {
        calledUrl = String(url)
        return {
          ok: true,
          json: async () => buildPayload("30m"),
        }
      },
    }
  )

  const url = new URL(calledUrl, "https://xxjyxt.com")
  assert.equal(calledUrl.startsWith("/api/v1/kline-history/slice?"), true)
  assert.equal(url.pathname, "/api/v1/kline-history/slice")
  assert.equal(url.searchParams.get("timeframe"), "30m")
  assert.equal(result.dataSource, "kline_db")
})

test("getKlineContext returns insufficient_data instead of throwing when slice API fails", async () => {
  const { getKlineContext } = await importService()
  const result = await getKlineContext(
    { symbol: "NOPE", timeframe: "1d", entryTime: "2026-01-01T00:00:00.000Z" },
    {
      enabled: true,
      apiBaseUrl: "https://example.test",
      fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({ ok: false }) }),
    }
  )

  assert.equal(result.dataSource, "insufficient_data")
  assert.equal(result.marketTrend, "unclear")
  assert.equal(result.confidence, "low")
  assert.match(result.notes.join("；"), /HTTP 404/)
})

test("getKlineContext records empty candle payload reason from slice API", async () => {
  const { getKlineContext } = await importService()
  const result = await getKlineContext(
    { symbol: "600519", timeframe: "30m", entryTime: "2026-06-12T00:00:00.000Z" },
    {
      enabled: true,
      apiBaseUrl: "https://example.test",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          slice: {
            timeframe: { key: "30m", label: "30m" },
            source: "baostock",
            manifestStatus: { status: "missing_cache" },
            candles: [],
          },
        }),
      }),
    }
  )

  assert.equal(result.dataSource, "insufficient_data")
  assert.match(result.notes.join("；"), /missing_cache|未返回 candles/)
})

test("getKlineContext rejects slice candles that do not cover entryTime", async () => {
  const { getKlineContext } = await importService()
  const result = await getKlineContext(
    { symbol: "600519", timeframe: "30m", entryTime: "2026-06-12T00:00:00.000Z" },
    {
      enabled: true,
      apiBaseUrl: "https://example.test",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => buildPayload("30m", buildServerCandlesFrom("2026-04-01", 30)),
      }),
    }
  )

  assert.equal(result.dataSource, "insufficient_data")
  assert.equal(result.candlesUsed, 30)
  assert.match(result.notes.join("；"), /未覆盖入场时间/)
})

test("getKlineContext returns manual fallback when feature flag is disabled", async () => {
  const { getKlineContext } = await importService()
  const result = await getKlineContext(
    { symbol: "600519", timeframe: "1d", entryTime: "2026-01-01T00:00:00.000Z" },
    { enabled: false }
  )

  assert.equal(result.dataSource, "manual")
  assert.equal(result.marketTrend, "unclear")
  assert.equal(result.volumeState, "unknown")
  assert.deepEqual(result.notes, ["K线自动盘证未开启"])
})

test("getMultiTimeframeKlineContext uses 30m as primary when every timeframe has data", async () => {
  const { getMultiTimeframeKlineContext } = await importService()
  const { fetchImpl, calls } = makeFetchByTimeframe({
    "30m": buildPayload("30m"),
    "60m": buildPayload("60m"),
    "1d": buildPayload("1d"),
  })

  const result = await getMultiTimeframeKlineContext(
    { symbol: "600519", entryTime: "2026-03-20T00:00:00.000Z", entryPrice: 190 },
    { enabled: true, apiBaseUrl: "https://example.test", fetchImpl }
  )

  assert.deepEqual(calls, ["30m"])
  assert.equal(result.primaryTimeframe, "30m")
  assert.equal(result.timeframes["30m"].dataSource, "kline_db")
  assert.equal(result.timeframes["60m"], null)
  assert.equal(result.timeframes["101"], null)
  assert.deepEqual(result.availability, { "30m": "ok", "60m": "missing", "101": "missing" })
  assert.equal(result.source, "server")
  assert.equal(result.klineAvailable, true)
  assert.deepEqual(result.attemptedTimeframes, ["30m"])
  assert.deepEqual(result.fallbackChain, [{ timeframe: "30m", status: "ok", reason: "server slice 可用于盘证" }])
  assert.equal(result.candlesCount, 80)
  assert.equal(result.sliceSource, "server-cache")
  assert.equal(result.manifestStatus, "ok")
  assert.equal(result.dataSource, "kline_db")
  assert.match(result.summary.m30Text, /^30分钟：/)
  assert.match(result.summary.finalText, /^最终盘证：/)
})

test("getMultiTimeframeKlineContext falls back from missing 30m to 60m", async () => {
  const { getMultiTimeframeKlineContext } = await importService()
  const { fetchImpl, calls } = makeFetchByTimeframe({
    "60m": buildPayload("60m"),
    "1d": buildPayload("1d"),
  })

  const result = await getMultiTimeframeKlineContext(
    { symbol: "600519", entryTime: "2026-03-20T00:00:00.000Z", entryPrice: 190 },
    { enabled: true, apiBaseUrl: "https://example.test", fetchImpl }
  )

  assert.deepEqual(calls, ["30m", "60m"])
  assert.equal(result.primaryTimeframe, "60m")
  assert.equal(result.timeframes["30m"].dataSource, "insufficient_data")
  assert.equal(result.timeframes["60m"].dataSource, "kline_db")
  assert.equal(result.timeframes["101"], null)
  assert.equal(result.availability["30m"], "insufficient_data")
  assert.equal(result.availability["60m"], "ok")
  assert.deepEqual(result.attemptedTimeframes, ["30m", "60m"])
  assert.deepEqual(result.fallbackChain.map((item) => `${item.timeframe}:${item.status}`), ["30m:insufficient_data", "60m:ok"])
  assert.equal(result.source, "server")
  assert.equal(result.dataSource, "kline_db")
})

test("getMultiTimeframeKlineContext falls back from 30m and 60m gaps to 101 daily", async () => {
  const { getMultiTimeframeKlineContext } = await importService()
  const { fetchImpl, calls } = makeFetchByTimeframe({
    "1d": buildPayload("1d"),
  })

  const result = await getMultiTimeframeKlineContext(
    { symbol: "600519", entryTime: "2026-03-20T00:00:00.000Z", entryPrice: 190 },
    { enabled: true, apiBaseUrl: "https://example.test", fetchImpl }
  )

  assert.deepEqual(calls, ["30m", "60m", "1d"])
  assert.equal(result.primaryTimeframe, "101")
  assert.equal(result.timeframes["30m"].dataSource, "insufficient_data")
  assert.equal(result.timeframes["60m"].dataSource, "insufficient_data")
  assert.equal(result.timeframes["101"].dataSource, "kline_db")
  assert.equal(result.availability["101"], "ok")
  assert.deepEqual(result.attemptedTimeframes, ["30m", "60m", "101"])
  assert.deepEqual(result.fallbackChain.map((item) => `${item.timeframe}:${item.status}`), [
    "30m:insufficient_data",
    "60m:insufficient_data",
    "101:ok",
  ])
  assert.equal(result.source, "server")
  assert.equal(result.dataSource, "kline_db")
})

test("getMultiTimeframeKlineContext returns manual fallback when all server timeframes are unavailable", async () => {
  const { getMultiTimeframeKlineContext } = await importService()
  const { fetchImpl, calls } = makeFetchByTimeframe({})
  const result = await getMultiTimeframeKlineContext(
    { symbol: "600519", entryTime: "2026-03-20T00:00:00.000Z", entryPrice: 190 },
    { enabled: true, apiBaseUrl: "https://example.test", fetchImpl }
  )

  assert.deepEqual(calls, ["30m", "60m", "1d"])
  assert.equal(result.primaryTimeframe, null)
  assert.equal(result.source, "manual")
  assert.equal(result.klineAvailable, false)
  assert.equal(result.fallbackReason, "30m、60m、101 周期均不可用于自动盘证，已切换为手动盘证。")
  assert.deepEqual(result.attemptedTimeframes, ["30m", "60m", "101"])
  assert.deepEqual(result.fallbackChain.map((item) => `${item.timeframe}:${item.status}`), [
    "30m:insufficient_data",
    "60m:insufficient_data",
    "101:insufficient_data",
  ])
  assert.equal(result.dataSource, "manual")
  assert.equal(result.confidence, "low")
  assert.deepEqual(result.availability, { "30m": "insufficient_data", "60m": "insufficient_data", "101": "insufficient_data" })
  assert.equal(result.timeframes["30m"].dataSource, "insufficient_data")
  assert.equal(result.timeframes["60m"].dataSource, "insufficient_data")
  assert.equal(result.timeframes["101"].dataSource, "insufficient_data")
  assert.match(result.summary.finalText, /手动盘证/)
})

test("getMultiTimeframeKlineContext records manual fallback when feature flag is disabled", async () => {
  const { getMultiTimeframeKlineContext } = await importService()
  const result = await getMultiTimeframeKlineContext(
    { symbol: "600519", entryTime: "2026-03-20T00:00:00.000Z", entryPrice: 190 },
    { enabled: false }
  )

  assert.equal(result.primaryTimeframe, null)
  assert.equal(result.source, "manual")
  assert.equal(result.klineAvailable, false)
  assert.deepEqual(result.attemptedTimeframes, ["30m", "60m", "101"])
  assert.deepEqual(result.availability, { "30m": "missing", "60m": "missing", "101": "missing" })
  assert.equal(result.timeframes["30m"], null)
  assert.equal(result.timeframes["60m"], null)
  assert.equal(result.timeframes["101"], null)
})

test("getMultiTimeframeKlineContext isolates single timeframe failures and avoids trading advice", async () => {
  const { getMultiTimeframeKlineContext } = await importService()
  const { fetchImpl, calls } = makeFetchByTimeframe({
    "30m": new Error("temporary 30m failure"),
    "60m": buildPayload("60m"),
    "1d": buildPayload("1d"),
  })

  const result = await getMultiTimeframeKlineContext(
    { symbol: "600519", entryTime: "2026-03-20T00:00:00.000Z", entryPrice: 190 },
    { enabled: true, apiBaseUrl: "https://example.test", fetchImpl }
  )
  const serialized = JSON.stringify(result)

  assert.deepEqual(calls, ["30m", "60m"])
  assert.equal(result.primaryTimeframe, "60m")
  assert.equal(result.timeframes["30m"], null)
  assert.equal(result.availability["30m"], "error")
  assert.equal(result.availability["60m"], "ok")
  assert.deepEqual(result.fallbackChain.map((item) => `${item.timeframe}:${item.status}`), ["30m:error", "60m:ok"])
  ;["应该买", "应该卖", "可以加仓", "建议止损", "后面会涨", "后面会跌", "买点", "卖点"].forEach((phrase) => {
    assert.equal(serialized.includes(phrase), false, `multi timeframe result contains forbidden advice: ${phrase}`)
  })
})
