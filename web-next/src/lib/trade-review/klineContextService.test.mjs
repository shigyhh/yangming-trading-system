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
