import assert from "node:assert/strict"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const repositoryUrl = new URL("./tradeReviewRepository.ts", import.meta.url)
const klineContextServiceUrl = new URL("./klineContextService.ts", import.meta.url)
const panXinReportRulesUrl = new URL("./panXinReport.ts", import.meta.url)
const capitalStabilityUrl = new URL("./capitalStability.ts", import.meta.url)
const oneThoughtRepositoryUrl = new URL("../mind-archive/oneThoughtEventRepository.ts", import.meta.url)
const tradeReviewPageUrl = new URL("../../app/trade-review/page.tsx", import.meta.url)
const reviewRedirectPageUrl = new URL("../../app/review/page.tsx", import.meta.url)
const panXinReportUrl = new URL("../../components/trade-review/PanXinHeZhengReport.tsx", import.meta.url)
const mindArchiveTypesUrl = new URL("../mind-archive/types.ts", import.meta.url)
const archiveStatsUrl = new URL("../mind-archive/archiveStatsService.ts", import.meta.url)
const reviewArchiveServiceUrl = new URL("../mind-archive/reviewArchiveService.ts", import.meta.url)
const dataBindingClientUrl = new URL("../../features/data-binding/api-client.ts", import.meta.url)
const lakePageUrl = new URL("../../features/one-thought-lake/OneThoughtLakePage.tsx", import.meta.url)
const topNavUrl = new URL("../../components/home/top-nav.tsx", import.meta.url)
const reflectPageUrl = new URL("../../app/reflect/page.tsx", import.meta.url)
const todaySealedPageUrl = new URL("../../app/today-sealed/page.tsx", import.meta.url)
const mindArchivePageUrl = new URL("../../app/mind-archive/page.tsx", import.meta.url)
const zhixingScrollPageUrl = new URL("../../app/zhixing-scroll/page.tsx", import.meta.url)
const zhixingScrollServiceUrl = new URL("../mind-archive/zhixingScrollService.ts", import.meta.url)
const insightCardUrl = new URL("../../components/home/insight-card.tsx", import.meta.url)
const homeGatesUrl = new URL("../../components/home/HomeGatesSection.tsx", import.meta.url)
const nextConfigUrl = new URL("../../../next.config.ts", import.meta.url)
const livingMirrorContractUrl = new URL("../../../../packages/contracts/living-mirror.d.ts", import.meta.url)
const serverDataBindingUrl = new URL("../../../../server/src/services/dataBinding.js", import.meta.url)

async function importReviewFlowModules() {
  const dir = path.join(tmpdir(), "yangming-trade-review-flow-tests")
  await mkdir(dir, { recursive: true })
  const typesSource = await readFile(mindArchiveTypesUrl, "utf8")
  const oneThoughtSource = await readFile(oneThoughtRepositoryUrl, "utf8")
  const tradeReviewSource = await readFile(repositoryUrl, "utf8")
  const archiveStatsSource = await readFile(archiveStatsUrl, "utf8")
  const reviewArchiveServiceSource = await readFile(reviewArchiveServiceUrl, "utf8")

  await writeFile(path.join(dir, "types.mjs"), transpileTs(typesSource), "utf8")
  await writeFile(path.join(dir, "reflectionService.mjs"), "export function createReflectionKey(sceneId, itemId) { return `${sceneId}:${itemId}` }\n", "utf8")
  await writeFile(
    path.join(dir, "oneThoughtEventRepository.mjs"),
    transpileTs(oneThoughtSource)
      .replaceAll('from "@/lib/reflections/reflectionService"', 'from "./reflectionService.mjs"')
      .replaceAll('from "./types"', 'from "./types.mjs"'),
    "utf8",
  )
  await writeFile(
    path.join(dir, "tradeReviewRepository.mjs"),
    transpileTs(tradeReviewSource)
      .replaceAll('from "@/lib/mind-archive/oneThoughtEventRepository"', 'from "./oneThoughtEventRepository.mjs"')
      .replaceAll('from "@/lib/mind-archive/types"', 'from "./types.mjs"'),
    "utf8",
  )
  await writeFile(
    path.join(dir, "reviewArchiveService.mjs"),
    transpileTs(reviewArchiveServiceSource).replaceAll('from "./types"', 'from "./types.mjs"'),
    "utf8",
  )
  await writeFile(
    path.join(dir, "archiveStatsService.mjs"),
    transpileTs(archiveStatsSource)
      .replaceAll('from "@/lib/mind-archive/oneThoughtEventRepository"', 'from "./oneThoughtEventRepository.mjs"')
      .replaceAll('from "@/lib/mind-archive/reviewArchiveService"', 'from "./reviewArchiveService.mjs"')
      .replaceAll('from "@/lib/mind-archive/types"', 'from "./types.mjs"')
      .replaceAll('from "@/lib/trade-review/tradeReviewRepository"', 'from "./tradeReviewRepository.mjs"'),
    "utf8",
  )

  return {
    oneThoughtRepository: await import(`file://${path.join(dir, `oneThoughtEventRepository.mjs?${Date.now()}`)}`),
    tradeReviewRepository: await import(`file://${path.join(dir, `tradeReviewRepository.mjs?${Date.now()}`)}`),
    archiveStatsService: await import(`file://${path.join(dir, `archiveStatsService.mjs?${Date.now()}`)}`),
  }
}

function transpileTs(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  }).outputText
}

function createMemoryStorage() {
  const data = new Map()

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      data.set(key, String(value))
    },
    removeItem(key) {
      data.delete(key)
    },
  }
}

function buildPendingEvent(overrides = {}) {
  return {
    id: "one_thought_flow_1",
    userId: "local_zhaojian_user",
    sceneId: "scene_chase",
    itemId: "item_1",
    key: "scene_chase:item_1",
    tradeMoment: "临盘追高",
    os: "明知不可追，见涨仍动心。",
    reflectionFinal: "此念一起，先照见急心，再回到规则。",
    finalSource: "reflection_final_shenji_zeyou_v1",
    painLevel: 3,
    painPoint: "追涨后心乱",
    heartThief: "急",
    heartEvidence: "见涨即动",
    practiceText: "停十秒，再看规则。",
    reflectionVersion: "reflection_final_shenji_zeyou_v1",
    ritualName: "照见一念仪轨",
    ritualVersion: "one_thought_ritual_v1",
    ritualStatus: "sealed",
    reflectionShownAt: "2026-06-12T09:30:00.000Z",
    reflectionSeen: true,
    reflectionSeenAt: "2026-06-12T09:31:00.000Z",
    userReaction: "still_moving",
    userReactionAt: "2026-06-12T09:32:00.000Z",
    actualAction: "traded",
    actualActionAt: "2026-06-12T09:33:00.000Z",
    reviewStatus: "pending",
    source: "one_thought_ritual",
    createdAt: "2026-06-12T09:30:00.000Z",
    updatedAt: "2026-06-12T09:33:00.000Z",
    ...overrides,
  }
}

function buildKlineContext(timeframe, marketTrend = "uptrend") {
  return {
    symbol: "600519",
    timeframe,
    entryTime: "2026-06-12T10:30:00.000Z",
    candlesUsed: 80,
    marketTrend,
    priceLocation: "resistance_area",
    pattern: "false_breakout",
    volumeState: "shrinking",
    confidence: "medium",
    dataSource: "kline_db",
    evidence: {
      recentHigh: 1820,
      recentLow: 1760,
      lastClose: 1801,
      ma20: 1790,
      ma60: 1780,
      slopePct: 0.8,
      volumeRatio: 0.9,
    },
  }
}

function buildTradeReviewInput(event, overrides = {}) {
  return {
    id: "trade_review_flow_1",
    userId: event.userId,
    linkedOneThoughtEventId: event.id,
    sceneId: event.sceneId,
    itemId: event.itemId,
    key: event.key,
    os: event.os,
    reflectionFinal: event.reflectionFinal,
    painLevel: event.painLevel,
    painPoint: event.painPoint,
    heartThief: event.heartThief,
    reflectionVersion: event.reflectionVersion,
    symbol: "600519",
    timeframe: "30m",
    direction: "buy",
    entryPrice: 1800,
    pnl: -120,
    followedPlan: true,
    brokeRule: false,
    marketContext: {
      symbol: "600519",
      entryTime: "2026-06-12T10:30:00.000Z",
      entryPrice: 1800,
      primaryTimeframe: "60m",
      timeframes: {
        "30m": null,
        "60m": buildKlineContext("60m"),
        "101": buildKlineContext("101", "range"),
      },
      availability: {
        "30m": "insufficient_data",
        "60m": "ok",
        "101": "ok",
      },
      source: "server",
      fallbackChain: [
        { timeframe: "30m", status: "insufficient_data", reason: "K线数量不足，自动盘证暂不启用。" },
        { timeframe: "60m", status: "ok", reason: "server slice 可用于盘证" },
      ],
      attemptedTimeframes: ["30m", "60m"],
      klineAvailable: true,
      candlesCount: 80,
      manifestStatus: "ok",
      sliceSource: "server-cache",
      summary: {
        dailyText: "日线：震荡区间中上部。",
        h60Text: "60分钟：反弹到前高附近。",
        finalText: "最终盘证：以60分钟盘证为主，冲高回落，突破失败，不构成交易建议。",
      },
      marketTrend: "sharp_rise",
      priceLocation: "resistance_area",
      pattern: "false_breakout",
      volumeState: "shrinking",
      confidence: "medium",
      dataSource: "kline_db",
      editedByUser: true,
    },
    tradeReviewSyncStatus: "pending",
    behaviorEvidence: {
      changedPlanIntraday: false,
      addedPosition: false,
      movedStopLoss: false,
      emotionDrivenEntry: true,
    },
    accountSnapshot: {
      accountEquityBefore: 100000,
      accountEquityAfter: 99880,
    },
    riskEvidence: {
      positionValue: 12000,
      plannedRiskAmount: 1000,
      actualLossAmount: 120,
      leverage: 1,
      fee: 8,
      addedPosition: false,
      movedStopLoss: false,
      changedPlanIntraday: false,
    },
    reviewSummary: {
      marketText: "最终盘证：以60分钟盘证为主，冲高回落，突破失败。",
      behaviorText: "按计划，未破戒。",
      heartText: "当时反馈为“心还在动”。",
      practiceText: "下次同类场景：先回到规则，再决定是否行动。",
    },
    ...overrides,
  }
}

test("P2 repository keeps tradeReview tied to oneThoughtEvent and writes back completion", async () => {
  const repository = await readFile(repositoryUrl, "utf8")

  ;[
    "export function createTradeReview",
    "export function updateTradeReview",
    "export function getTradeReview",
    "export function listTradeReviews",
    "export function listRecentTradeReviews",
    "export function listTradeReviewsByOneThoughtEvent",
    "linkedOneThoughtEventId",
    "sceneId",
    "itemId",
    "key",
    "os",
    "reflectionFinal",
    "reflectionVersion: PRIVATE_REFLECTION_VERSION",
    "linkTradeReviewToOneThoughtEvent(review.linkedOneThoughtEventId, review.id, storage)",
    "chartEvidence",
    "marketContext",
    "behaviorEvidence",
    "reviewSummary",
    "normalizeMarketContextDataSource",
    "normalizeMarketContextEvidence",
    "normalizeMarketContextTimeframes",
    "normalizeMarketContextAvailability",
    "normalizeMarketContextSummary",
    "tradeReviewSyncStatus",
    "tradeReviewLastSyncedAt",
    "syncError",
    "editedByUser",
  ].forEach((token) => {
    assert.equal(repository.includes(token), true, `missing P2 repository token: ${token}`)
  })
})

test("P2 heart judgement keeps the four quadrant rule and user-facing copy", async () => {
  const repository = await readFile(repositoryUrl, "utf8")

  ;[
    'if (pnl > 0 && keptHeart) return "zheng_sheng"',
    'if (pnl > 0 && !keptHeart) return "zei_sheng"',
    'if (pnl <= 0 && keptHeart) return "zheng_kui"',
    'return "shuang_shu"',
    'zheng_sheng: "这笔既赚钱，也守住了心。"',
    'zei_sheng: "钱赚了，但这笔是心贼赢了。"',
    'zheng_kui: "钱亏了，但心没有失守。"',
    'shuang_shu: "钱也亏了，心也被带走了。"',
  ].forEach((token) => {
    assert.equal(repository.includes(token), true, `missing heart judgement token: ${token}`)
  })
})

test("P2 review page requires a linked oneThoughtEvent and carries its reflectionFinal forward", async () => {
  const reviewPage = await readFile(tradeReviewPageUrl, "utf8")

  ;[
    "linkedOneThoughtEventId",
    "getPendingReviewEvents",
    "selectedEvent",
    "sceneId: selectedEvent.sceneId",
    "itemId: selectedEvent.itemId",
    "key: selectedEvent.key",
    "os: selectedEvent.os",
    "reflectionFinal: selectedEvent.reflectionFinal",
    "reflectionVersion: selectedEvent.reflectionVersion",
    "heartJudgementLabels[previewJudgement]",
    "heartJudgementDescriptions[previewJudgement]",
    "真实复盘已写回一念档案。",
    "待复盘一念列表",
    "去复盘",
    "盘证",
    "盘面状态",
    "交易行为",
    "心性判定",
    "下次修行",
    "把这笔交易放回当时的盘面。",
    "先看盘面在哪，不急着解释输赢。",
    "你不是只复盘结果，而是复盘当时怎么动的手。",
    "chartEvidence",
    "marketContext",
    "behaviorEvidence",
    "reviewSummary",
    "accountSnapshot",
    "riskEvidence",
    "capitalStability",
    "getMultiTimeframeKlineContext",
    "自动识别盘面",
    "盘面识别结果",
    "盘证用于事后复盘，不构成交易建议。",
    "K线数据不足，已切换为手动盘证。",
    "日线",
    "看大势",
    "60分钟",
    "看结构",
    "30分钟",
    "看下手那一刻",
    "最终盘证",
    "30分钟数据不足，已参考 60分钟。",
    "60分钟数据不足，已参考日线。",
    "primaryTimeframe: multiTimeframeContext?.primaryTimeframe",
    "timeframes: multiTimeframeContext?.timeframes",
    "availability: multiTimeframeContext?.availability",
    "summary: multiTimeframeContext?.summary",
    "source: multiTimeframeContext?.source",
    "fallbackChain: multiTimeframeContext?.fallbackChain",
    "attemptedTimeframes: multiTimeframeContext?.attemptedTimeframes",
    "klineAvailable: multiTimeframeContext?.klineAvailable",
    "fallbackReason: multiTimeframeContext?.fallbackReason",
    "candlesCount: multiTimeframeContext?.candlesCount",
    "manifestStatus: multiTimeframeContext?.manifestStatus",
    "sliceSource: multiTimeframeContext?.sliceSource",
    "tradeReviewSyncStatus: \"pending\"",
    "syncTradeReviewBinding",
    "syncTradeReviewToServer(review)",
    "tradeReviewLastSyncedAt",
    "syncError",
    "updateTradeReview(review.id",
    "buildCapitalStabilityResult",
    "资金证",
    "不只看这笔赚没赚，要看这笔有没有让资金开始失稳。",
    "交易前账户权益",
    "交易后账户权益",
    "本笔仓位金额",
    "原计划最大风险",
    "本笔实际亏损",
    "杠杆倍数",
    "手续费",
    "是否加仓",
    "是否移动止损",
    "是否临盘改计划",
    "accountEquityBefore",
    "accountEquityAfter",
    "positionValue",
    "plannedRiskAmount",
    "actualLossAmount",
    "confidenceLabels",
    "dataSourceLabels",
    "editedByUser",
    "createManualMarketContext",
    "暂无待复盘的一念。",
    "交易之后，回到当时那一念。",
    "真实复盘不是记行情，是把一笔交易放回当时那一念。",
    "查看今日所照",
    "照见一念",
  ].forEach((token) => {
    assert.equal(reviewPage.includes(token), true, `missing review page token: ${token}`)
  })

  assert.doesNotMatch(reviewPage, /不关联，单独复盘/)
  assert.doesNotMatch(reviewPage, /reflectionService|getReflection|matchUserThought|reflection_v2|openai|chatCompletion|行情预测|买卖建议/)
})

test("P2.2-C promotes /trade-review as the only formal review page and keeps /review compatible", async () => {
  const tradeReviewPage = await readFile(tradeReviewPageUrl, "utf8")
  const reviewRedirectPage = await readFile(reviewRedirectPageUrl, "utf8")
  const topNav = await readFile(topNavUrl, "utf8")
  const reflectPage = await readFile(reflectPageUrl, "utf8")
  const todaySealedPage = await readFile(todaySealedPageUrl, "utf8")
  const mindArchivePage = await readFile(mindArchivePageUrl, "utf8")
  const zhixingScrollPage = await readFile(zhixingScrollPageUrl, "utf8")
  const insightCard = await readFile(insightCardUrl, "utf8")
  const homeGates = await readFile(homeGatesUrl, "utf8")

  assert.match(tradeReviewPage, /function ReviewPageContent/)
  assert.match(tradeReviewPage, /盘证/)
  assert.match(tradeReviewPage, /自动识别盘面/)
  assert.match(tradeReviewPage, /createManualMarketContext/)
  assert.match(tradeReviewPage, /marketContext/)
  assert.doesNotMatch(tradeReviewPage, /redirect\("\/review"\)/)

  assert.match(reviewRedirectPage, /redirect\(`\/trade-review\$\{query \? `\?\$\{query\}` : ""\}`\)/)
  assert.doesNotMatch(reviewRedirectPage, /function ReviewPageContent/)
  assert.doesNotMatch(reviewRedirectPage, /createTradeReview/)

  assert.match(topNav, /{ label: "真实复盘", href: "\/trade-review" }/)
  assert.doesNotMatch(topNav, /{ label: "真实复盘", href: "\/review" }/)
  assert.match(topNav, /if \(href === "\/trade-review"\) return pathname === "\/trade-review" \|\| pathname === "\/review"/)

  ;[reflectPage, todaySealedPage, mindArchivePage, zhixingScrollPage, insightCard, homeGates].forEach((source) => {
    assert.doesNotMatch(source, /\/review\?linkedOneThoughtEventId=/)
    assert.doesNotMatch(source, /href="\/review"/)
    assert.doesNotMatch(source, /href:\s*"\/review"/)
  })
  assert.match(reflectPage, /\/trade-review\?linkedOneThoughtEventId=/)
  assert.match(todaySealedPage, /\/trade-review\?linkedOneThoughtEventId=/)
  assert.match(mindArchivePage, /router\.push\("\/trade-review"\)/)
  assert.match(zhixingScrollPage, /href="\/trade-review"/)
  assert.match(insightCard, /href: "\/trade-review"/)
  assert.match(homeGates, /href: "\/trade-review"/)
})

test("P2.2-E-3 keeps kline-history slice as a same-origin Next route proxy", async () => {
  const nextConfig = await readFile(nextConfigUrl, "utf8")
  const klineContextService = await readFile(klineContextServiceUrl, "utf8")

  assert.match(nextConfig, /async rewrites\(\)/)
  assert.match(nextConfig, /source:\s*"\/api\/v1\/kline-history\/:path\*"/)
  assert.match(nextConfig, /destination:\s*`\$\{serverApiBaseUrl\}\/api\/v1\/kline-history\/:path\*`/)
  assert.match(klineContextService, /return apiBaseUrl \? url\.toString\(\) : `\$\{url\.pathname\}\$\{url\.search\}`/)
  assert.doesNotMatch(klineContextService, /NEXT_PUBLIC_YM_API_BASE_URL \|\| "http:\/\/127\.0\.0\.1:8787"/)
})

test("P2 TradeReview type stores linked oneThoughtEvent snapshot fields", async () => {
  const types = await readFile(mindArchiveTypesUrl, "utf8")

  ;[
    "export interface TradeReview",
    "linkedOneThoughtEventId: string",
    "sceneId: string",
    "itemId: string",
    "key: string",
    "os: string",
    "reflectionFinal: string",
    "reflectionVersion: PrivateReflectionVersion",
    "chartEvidence?: ChartEvidence[]",
    "marketContext?: TradeReviewMarketContext",
    "confidence?: \"low\" | \"medium\" | \"high\"",
    "editedByUser?: boolean",
    "evidence?: KlineContextResult[\"evidence\"]",
    "primaryTimeframe?: \"30m\" | \"60m\" | \"101\" | null",
    "timeframes?: Record<\"30m\" | \"60m\" | \"101\", KlineContextResult | null>",
    "availability?: Record<\"30m\" | \"60m\" | \"101\", \"ok\" | \"insufficient_data\" | \"missing\" | \"error\">",
    "summary?:",
    "source?: \"server\" | \"manual\"",
    "fallbackReason?: string",
    "attemptedTimeframes?: Array<\"30m\" | \"60m\" | \"101\">",
    "fallbackChain?: Array<{",
    "klineAvailable?: boolean",
    "candlesCount?: number",
    "manifestStatus?: string",
    "sliceSource?: string",
    "export type TradeReviewSyncStatus = \"pending\" | \"synced\" | \"failed\"",
    "tradeReviewSyncStatus?: TradeReviewSyncStatus",
    "tradeReviewLastSyncedAt?: string",
    "syncError?: string",
    "behaviorEvidence?: TradeReviewBehaviorEvidence",
    "accountSnapshot?: TradeReviewAccountSnapshot",
    "riskEvidence?: TradeReviewRiskEvidence",
    "capitalStability?: TradeReviewCapitalStability",
    "export type CapitalStabilityLevel",
    "stable_with_guard",
    "money_stable_heart_moving",
    "money_moving_heart_chaotic",
    "double_unstable",
    "insufficient_data",
    "version: \"capital_stability_v1\"",
    "accountEquityBefore?: number",
    "plannedRiskAmount?: number",
    "riskPctOfEquity?: number",
    "reviewSummary?: TradeReviewSummary",
    "version?: \"pan_xin_he_zheng_v1\" | string",
    "thoughtText?: string",
    "judgementText?: string",
    "generatedAt?: string",
    "heartJudgement: HeartJudgement",
  ].forEach((token) => {
    assert.equal(types.includes(token), true, `missing TradeReview type token: ${token}`)
  })
})

test("P2.2 reserves kline context without depending on external market APIs", async () => {
  const klineContextService = await readFile(klineContextServiceUrl, "utf8")

  ;[
    "export async function getKlineContext",
    "symbol",
    "timeframe",
    "entryTime",
    "entryPrice",
    "buildFallbackResult",
    "ENABLE_KLINE_CONTEXT",
    "analyzeKlineContext",
    "export function createManualMarketContext",
    "/api/v1/kline-history/slice",
    "fallbackChain",
    "attemptedTimeframes",
    "buildKlineSliceUrl",
    'dataSource: "manual"',
  ].forEach((token) => {
    assert.equal(klineContextService.includes(token), true, `missing kline context token: ${token}`)
  })

  assert.doesNotMatch(klineContextService, /\/var\/lib\/xxjyxt\/market|server\/data\/market|getKlineHistoryCache|axios|websocket|行情|quote|polygon|binance|yfinance/)
})

test("P2.2-C.3 createTradeReview saves multi-timeframe marketContext and completes linked oneThoughtEvent", async () => {
  const { oneThoughtRepository, tradeReviewRepository, archiveStatsService } = await importReviewFlowModules()
  const storage = createMemoryStorage()
  const event = oneThoughtRepository.createOneThoughtEvent(buildPendingEvent(), storage)

  assert.equal(archiveStatsService.getPendingReviewEvents(event.userId, storage).length, 1)

  const review = tradeReviewRepository.createTradeReview(buildTradeReviewInput(event), storage)
  const storedReview = tradeReviewRepository.getTradeReview(review.id, storage)
  const linkedEvent = oneThoughtRepository.getOneThoughtEvent(event.id, storage)

  assert.equal(storedReview.marketContext.primaryTimeframe, "60m")
  assert.equal(storedReview.marketContext.timeframes["30m"], null)
  assert.equal(storedReview.marketContext.timeframes["60m"].dataSource, "kline_db")
  assert.equal(storedReview.marketContext.timeframes["101"].dataSource, "kline_db")
  assert.deepEqual(storedReview.marketContext.availability, { "30m": "insufficient_data", "60m": "ok", "101": "ok" })
  assert.equal(storedReview.marketContext.source, "server")
  assert.deepEqual(storedReview.marketContext.attemptedTimeframes, ["30m", "60m"])
  assert.deepEqual(storedReview.marketContext.fallbackChain.map((item) => `${item.timeframe}:${item.status}`), ["30m:insufficient_data", "60m:ok"])
  assert.equal(storedReview.marketContext.klineAvailable, true)
  assert.equal(storedReview.marketContext.candlesCount, 80)
  assert.equal(storedReview.marketContext.manifestStatus, "ok")
  assert.equal(storedReview.marketContext.sliceSource, "server-cache")
  assert.match(storedReview.marketContext.summary.finalText, /^最终盘证：/)
  assert.equal(storedReview.marketContext.editedByUser, true)
  assert.equal(storedReview.tradeReviewSyncStatus, "pending")
  assert.equal(storedReview.heartJudgement, "zheng_kui")
  assert.equal(storedReview.accountSnapshot.accountEquityBefore, 100000)
  assert.equal(storedReview.riskEvidence.positionValue, 12000)
  assert.equal(storedReview.riskEvidence.plannedRiskAmount, 1000)
  assert.equal(linkedEvent.reviewStatus, "completed")
  assert.equal(linkedEvent.tradeReviewId, review.id)
  assert.equal(archiveStatsService.getPendingReviewEvents(event.userId, storage).length, 0)
})

test("P2.2-C.3 tradeReview sync status is readable and does not change heartJudgement", async () => {
  const { oneThoughtRepository, tradeReviewRepository } = await importReviewFlowModules()
  const storage = createMemoryStorage()
  const event = oneThoughtRepository.createOneThoughtEvent(buildPendingEvent({ id: "one_thought_flow_2" }), storage)
  const review = tradeReviewRepository.createTradeReview(
    buildTradeReviewInput(event, { id: "trade_review_flow_2", pnl: 88, followedPlan: false, brokeRule: false }),
    storage,
  )

  const updated = tradeReviewRepository.updateTradeReview(review.id, {
    tradeReviewSyncStatus: "failed",
    tradeReviewLastSyncedAt: "2026-06-12T11:00:00.000Z",
    syncError: "server 未启动，已保留本地记录",
  }, storage)

  assert.equal(review.heartJudgement, "zei_sheng")
  assert.equal(updated.heartJudgement, "zei_sheng")
  assert.equal(updated.tradeReviewSyncStatus, "failed")
  assert.equal(updated.tradeReviewLastSyncedAt, "2026-06-12T11:00:00.000Z")
  assert.equal(updated.syncError, "server 未启动，已保留本地记录")
  assert.equal(updated.reviewSummary.practiceText, "下次同类场景：先回到规则，再决定是否行动。")
})

test("P2.3.1 createTradeReview persists PanXin reviewSummary and keeps legacy records readable", async () => {
  const { oneThoughtRepository, tradeReviewRepository } = await importReviewFlowModules()
  const storage = createMemoryStorage()
  const event = oneThoughtRepository.createOneThoughtEvent(buildPendingEvent({ id: "one_thought_panxin_1" }), storage)
  const panXinSummary = {
    version: "pan_xin_he_zheng_v1",
    thoughtText: "当时那一念：明知不可追，见涨仍动心。",
    marketText: "最终盘证：以60分钟盘证为主，冲高回落，突破失败。",
    behaviorText: "当时那只手：按计划，未破戒。",
    judgementText: "正亏：钱亏了，但心没有失守。",
    practiceText: "给自己三分钟，不用一根 K线证明自己。",
    generatedAt: "2026-06-12T11:08:00.000Z",
  }

  const review = tradeReviewRepository.createTradeReview(buildTradeReviewInput(event, { reviewSummary: panXinSummary }), storage)
  const reloaded = tradeReviewRepository.getTradeReview(review.id, storage)

  assert.deepEqual(reloaded.reviewSummary, panXinSummary)

  const legacyEvent = oneThoughtRepository.createOneThoughtEvent(
    buildPendingEvent({ id: "one_thought_legacy_review", key: "scene_chase:item_legacy" }),
    storage,
  )
  const legacyReview = tradeReviewRepository.createTradeReview(
    buildTradeReviewInput(legacyEvent, {
      id: "trade_review_legacy",
      reviewSummary: undefined,
    }),
    storage,
  )

  assert.equal(tradeReviewRepository.getTradeReview(legacyReview.id, storage).reviewSummary, undefined)
  assert.equal(tradeReviewRepository.getTradeReview(legacyReview.id, storage).capitalStability, undefined)
})

test("P2.4-A createTradeReview persists accountSnapshot riskEvidence and capitalStability", async () => {
  const { oneThoughtRepository, tradeReviewRepository } = await importReviewFlowModules()
  const storage = createMemoryStorage()
  const event = oneThoughtRepository.createOneThoughtEvent(buildPendingEvent({ id: "one_thought_capital_save" }), storage)
  const capitalStability = {
    version: "capital_stability_v1",
    level: "money_moving_heart_chaotic",
    score: 42,
    reasons: ["实际亏损超过计划风险。", "临盘改计划使资金波动放大。"],
    warnings: ["先记录资金边界，再复盘这笔手。"],
    metrics: {
      pnlPctOfEquity: -1.2,
      positionPctOfEquity: 20,
      riskPctOfEquity: 1.2,
      exceededPlannedRisk: true,
      lossStreak: 2,
      brokeRuleLossPct: 1.2,
      zeiShengCount: 1,
      shuangShuCount: 0,
    },
    practiceText: "资金开始被心贼牵动。下一笔先降仓位，再谈判断。",
    generatedAt: "2026-06-12T11:20:00.000Z",
  }

  const review = tradeReviewRepository.createTradeReview(
    buildTradeReviewInput(event, {
      id: "trade_review_capital_save",
      pnl: -1200,
      followedPlan: true,
      brokeRule: false,
      accountSnapshot: {
        accountEquityBefore: 100000,
        accountEquityAfter: 98800,
      },
      riskEvidence: {
        positionValue: 20000,
        plannedRiskAmount: 800,
        actualLossAmount: 1200,
        leverage: 1,
        fee: 12,
        addedPosition: false,
        movedStopLoss: false,
        changedPlanIntraday: true,
      },
      capitalStability,
    }),
    storage,
  )
  const reloaded = tradeReviewRepository.getTradeReview(review.id, storage)

  assert.deepEqual(reloaded.accountSnapshot, {
    accountEquityBefore: 100000,
    accountEquityAfter: 98800,
  })
  assert.equal(reloaded.riskEvidence.actualLossAmount, 1200)
  assert.equal(reloaded.riskEvidence.changedPlanIntraday, true)
  assert.deepEqual(reloaded.capitalStability, capitalStability)
  assert.equal(reloaded.heartJudgement, "zheng_kui")
})

test("P2 completed reviews leave the pending archive list through oneThoughtEvent status", async () => {
  const archiveStats = await readFile(archiveStatsUrl, "utf8")

  assert.match(archiveStats, /event\.actualAction === "traded" && event\.reviewStatus === "pending"/)
  assert.doesNotMatch(archiveStats, /tradeReviewHistoryStorageKey/)
})

test("P2.2-C.3 server sync and archive-read surfaces stay wired without blocking local review", async () => {
  const reviewPage = await readFile(tradeReviewPageUrl, "utf8")
  const dataBindingClient = await readFile(dataBindingClientUrl, "utf8")
  const archivePage = await readFile(mindArchivePageUrl, "utf8")
  const dangAnGuanArchive = await readFile(new URL("../../components/archive/DangAnGuanArchive.tsx", import.meta.url), "utf8")
  const zhixingService = await readFile(zhixingScrollServiceUrl, "utf8")
  const zhixingPage = await readFile(zhixingScrollPageUrl, "utf8")
  const archiveSurface = `${archivePage}\n${dangAnGuanArchive}`

  ;[
    "syncTradeReviewBinding",
    "void syncTradeReviewToServer(review)",
    "tradeReviewSyncStatus: \"pending\"",
    "updateTradeReview(review.id",
    "tradeReviewSyncStatus: result.ok ? \"synced\" : \"failed\"",
    "syncError: result.ok ? \"\" : result.error",
    "tradeReviewLastSyncedAt",
    "syncError",
  ].forEach((token) => {
    assert.equal(reviewPage.includes(token), true, `missing sync token in trade review page: ${token}`)
  })
  assert.match(dataBindingClient, /\/api\/v1\/data-binding\/users\/\$\{encodeURIComponent\(user\.userId\)\}\/trade-reviews/)
  assert.match(dataBindingClient, /return requestJson<DataBindingTradeReviewPayload, DataBindingTradeReviewResponse>/)

  ;["buildReviewArchive", "reviewArchiveItems", "reviewArchiveStats", "reviewRiskSignals", "ruleGuardInsights", "marketContextSummary", "practiceText", "heartJudgement", "actualAction"].forEach((token) => {
    assert.equal(archiveSurface.includes(token), true, `archive cannot read completed review token: ${token}`)
  })
  ;["marketContextSummary", "review?.marketText", "practiceText", "hasMarketContext", "linkedOneThoughtEventId", "heartJudgement", "actualAction"].forEach((token) => {
    assert.equal(zhixingService.includes(token), true, `zhixing service cannot read completed review token: ${token}`)
  })
  ;["盘证", "item.marketContextSummary", "下次修行", "item.practiceText", "是否已有盘证", "item.hasMarketContext", "复盘心判"].forEach((token) => {
    assert.equal(zhixingPage.includes(token), true, `zhixing page cannot show review summary token: ${token}`)
  })
})

test("P2.3 trade review submit renders the PanXinHeZheng report from the created review", async () => {
  const reviewPage = await readFile(tradeReviewPageUrl, "utf8")

  ;[
    "PanXinHeZhengReport",
    "listRecentTradeReviews",
    "createdReview",
    "createdReportEvent",
    "recentTradeReviews",
    "selectedHistoryReviewId",
    "historyReview",
    "setCreatedReview(review)",
    "setCreatedReportEvent(selectedEvent)",
    "<PanXinHeZhengReport review={createdReview} event={createdReportEvent} />",
    "capitalStability",
    "buildCapitalStabilityResult({",
    "tradeReview: created",
    "recentTradeReviews",
    "linkedOneThoughtEvent: selectedEvent",
    "最近真实复盘",
    "查看盘心合证报告",
    "<PanXinHeZhengReport review={historyReview} event={null} />",
  ].forEach((token) => {
    assert.equal(reviewPage.includes(token), true, `missing P2.3 report submit token: ${token}`)
  })
})

test("P2.3 PanXinHeZheng report shows thought, market, hand, judgement and deterministic practice", async () => {
  const report = await readFile(panXinReportUrl, "utf8")
  const reportRules = await readFile(panXinReportRulesUrl, "utf8")
  const capitalStabilityRules = await readFile(capitalStabilityUrl, "utf8")
  const reportSurface = `${report}\n${reportRules}\n${capitalStabilityRules}`

  ;[
    "export function PanXinHeZhengReport",
    "当时那一念",
    "当时那张盘",
    "当时那只手",
    "这笔心性判定",
    "这笔资金是否稳定",
    "下次同类场景修行",
    "交易之后，回到当时那一念。",
    "日线看大势。",
    "60分钟看结构。",
    "30分钟看下手那一刻。",
    "review.marketContext",
    "timeframes",
    "availability",
    "primaryTimeframe",
    "dataSource",
    "confidence",
    "behaviorEvidence",
    "followedPlan",
    "brokeRule",
    "changedPlanIntraday",
    "addedPosition",
    "movedStopLoss",
    "emotionDrivenEntry",
    "heartJudgement",
    "这笔既赚钱，也守住了心。",
    "钱赚了，但这笔是心贼赢了。",
    "钱亏了，但心没有失守。",
    "钱也亏了，心也被带走了。",
    "稳中有戒",
    "钱稳心动",
    "钱动心乱",
    "双失守",
    "资金波动可控，规则基本守住。",
    "资金暂时没坏，但心还在动。赚钱不代表这笔是正的。",
    "补上账户权益、仓位金额或计划风险，才能看清这笔交易有没有让资金失稳。",
    "capitalStability",
    "capitalStabilityCopy",
    "riskPctOfEquity",
    "positionPctOfEquity",
    "exceededPlannedRisk",
    "心还在动时，不加仓。",
    "先守规则，再谈判断。",
    "给自己三分钟，不用一根 K线证明自己。",
    "不追全，不吃尽，计划外的利润先放过。",
    "别让一笔交易替你证明规则有没有价值。",
    "数据不足",
    "手动盘证",
  ].forEach((token) => {
    assert.equal(reportSurface.includes(token), true, `missing P2.3 report token: ${token}`)
  })

  assert.doesNotMatch(reportSurface, /openai|chatCompletion|GPT|应该买|应该卖|可以加仓|建议止损|后面会涨|后面会跌|买点|卖点|买卖建议|行情预测|加仓建议|止损建议|收益承诺/)
})

test("P2.3 practice sentences are deterministic rules and do not depend on GPT", async () => {
  const dir = path.join(tmpdir(), "yangming-panxin-report-tests")
  await mkdir(dir, { recursive: true })
  const rulesSource = await readFile(panXinReportRulesUrl, "utf8")
  await writeFile(path.join(dir, "panXinReport.mjs"), transpileTs(rulesSource), "utf8")
  const { buildPanXinPracticeSentence, buildPanXinReviewSummary } = await import(`file://${path.join(dir, `panXinReport.mjs?${Date.now()}`)}`)

  assert.equal(
    buildPanXinPracticeSentence({
      event: buildPendingEvent({ userReaction: "still_moving" }),
      review: buildTradeReviewInput(buildPendingEvent(), { behaviorEvidence: { addedPosition: true } }),
    }),
    "心还在动时，不加仓。",
  )
  assert.equal(
    buildPanXinPracticeSentence({
      event: buildPendingEvent({ userReaction: "seen", heartThief: "慢" }),
      review: buildTradeReviewInput(buildPendingEvent(), { brokeRule: true }),
    }),
    "先守规则，再谈判断。",
  )
  assert.equal(
    buildPanXinPracticeSentence({
      event: buildPendingEvent({ userReaction: "seen", heartThief: "急" }),
      review: buildTradeReviewInput(buildPendingEvent(), { behaviorEvidence: { addedPosition: false } }),
    }),
    "给自己三分钟，不用一根 K线证明自己。",
  )
  assert.equal(
    buildPanXinPracticeSentence({
      event: buildPendingEvent({ userReaction: "seen", heartThief: "贪" }),
      review: buildTradeReviewInput(buildPendingEvent(), { behaviorEvidence: { addedPosition: false } }),
    }),
    "不追全，不吃尽，计划外的利润先放过。",
  )
  assert.equal(
    buildPanXinPracticeSentence({
      event: buildPendingEvent({ userReaction: "seen", heartThief: "执" }),
      review: buildTradeReviewInput(buildPendingEvent(), { behaviorEvidence: { addedPosition: false } }),
    }),
    "别让一笔交易替你证明规则有没有价值。",
  )
  const summaryEvent = buildPendingEvent({ userReaction: "seen", heartThief: "急" })
  const summary = buildPanXinReviewSummary({
    event: summaryEvent,
    review: {
      ...buildTradeReviewInput(summaryEvent),
      heartJudgement: "zheng_kui",
      createdAt: "2026-06-12T11:08:00.000Z",
      updatedAt: "2026-06-12T11:08:00.000Z",
    },
    generatedAt: "2026-06-12T11:09:00.000Z",
  })

  assert.equal(summary.version, "pan_xin_he_zheng_v1")
  assert.match(summary.thoughtText, /当时那一念/)
  assert.match(summary.marketText, /最终盘证/)
  assert.match(summary.behaviorText, /当时那只手/)
  assert.match(summary.judgementText, /正亏/)
  assert.equal(summary.practiceText, "给自己三分钟，不用一根 K线证明自己。")
  assert.equal(summary.generatedAt, "2026-06-12T11:09:00.000Z")

  assert.doesNotMatch(rulesSource, /openai|chatCompletion|GPT|应该买|应该卖|可以加仓|建议止损|后面会涨|后面会跌|买点|卖点|买卖建议|行情预测|加仓建议|止损建议|收益承诺/)
})

test("P2.3.1 data-binding contract and server preserve reviewSummary", async () => {
  const contract = await readFile(livingMirrorContractUrl, "utf8")
  const serverDataBinding = await readFile(serverDataBindingUrl, "utf8")

  ;[
    "export type TradeReviewSummary",
    "version: \"pan_xin_he_zheng_v1\" | string",
    "thoughtText?: string",
    "marketText?: string",
    "behaviorText?: string",
    "judgementText?: string",
    "practiceText?: string",
    "generatedAt: string",
    "reviewSummary?: TradeReviewSummary | null",
    "export type TradeReviewAccountSnapshot",
    "export type TradeReviewRiskEvidence",
    "export type TradeReviewCapitalStability",
    "accountSnapshot?: TradeReviewAccountSnapshot | null",
    "riskEvidence?: TradeReviewRiskEvidence | null",
    "capitalStability?: TradeReviewCapitalStability | null",
  ].forEach((token) => {
    assert.equal(contract.includes(token), true, `missing data-binding contract token: ${token}`)
  })

  ;[
    "normalizeTradeReviewSummary",
    "reviewSummary: normalizeTradeReviewSummary",
    "pan_xin_he_zheng_v1",
    "normalizeTradeReviewAccountSnapshot",
    "normalizeTradeReviewRiskEvidence",
    "normalizeTradeReviewCapitalStability",
    "capitalStability: normalizeTradeReviewCapitalStability",
  ].forEach((token) => {
    assert.equal(serverDataBinding.includes(token), true, `missing server reviewSummary token: ${token}`)
  })
})

test("众念心湖 cannot directly create a private tradeReview", async () => {
  const lakePage = await readFile(lakePageUrl, "utf8")

  assert.doesNotMatch(lakePage, /createTradeReview/)
  assert.doesNotMatch(lakePage, /linkedOneThoughtEventId/)
})
