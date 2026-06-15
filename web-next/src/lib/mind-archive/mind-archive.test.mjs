import assert from "node:assert/strict"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const typesUrl = new URL("./types.ts", import.meta.url)
const eventRepoUrl = new URL("./oneThoughtEventRepository.ts", import.meta.url)
const archiveStatsUrl = new URL("./archiveStatsService.ts", import.meta.url)
const reviewArchiveServiceUrl = new URL("./reviewArchiveService.ts", import.meta.url)
const cycleMirrorServiceUrl = new URL("./cycleMirrorService.ts", import.meta.url)
const tradeReviewRepoUrl = new URL("../trade-review/tradeReviewRepository.ts", import.meta.url)
const ritualFlowUrl = new URL("../../features/assessment/ZhaoxinRitualFlow.tsx", import.meta.url)
const ritualFacadeUrl = new URL("../../features/assessment/OneThoughtRitualFlow.tsx", import.meta.url)
const gatewayUrl = new URL("../../features/assessment/MirrorGateway.tsx", import.meta.url)
const entryPageUrl = new URL("../../app/assessment-entry/page.tsx", import.meta.url)
const todaySealedPageUrl = new URL("../../app/today-sealed/page.tsx", import.meta.url)
const mindArchivePageUrl = new URL("../../app/mind-archive/page.tsx", import.meta.url)
const dangAnGuanArchiveUrl = new URL("../../components/archive/DangAnGuanArchive.tsx", import.meta.url)
const archiveRuleGuardPanelUrl = new URL("../../components/archive/ArchiveRuleGuardPanel.tsx", import.meta.url)
const cycleMirrorPanelUrl = new URL("../../components/archive/CycleMirrorPanel.tsx", import.meta.url)
const reviewRiskSignalDisplayUrl = new URL("./reviewRiskSignalDisplay.ts", import.meta.url)
const lakePageUrl = new URL("../../features/one-thought-lake/OneThoughtLakePage.tsx", import.meta.url)

function transpileTs(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  }).outputText
}

async function importArchiveReviewModules() {
  const dir = path.join(tmpdir(), "yangming-mind-archive-capital-tests")
  await mkdir(dir, { recursive: true })

  const typesSource = await readFile(typesUrl, "utf8")
  const eventRepoSource = await readFile(eventRepoUrl, "utf8")
  const tradeReviewSource = await readFile(tradeReviewRepoUrl, "utf8")
  const archiveStatsSource = await readFile(archiveStatsUrl, "utf8")
  const reviewArchiveServiceSource = await readFile(reviewArchiveServiceUrl, "utf8")
  const cycleMirrorServiceSource = await readFile(cycleMirrorServiceUrl, "utf8")

  await writeFile(path.join(dir, "types.mjs"), transpileTs(typesSource), "utf8")
  await writeFile(
    path.join(dir, "reviewArchiveService.mjs"),
    transpileTs(reviewArchiveServiceSource).replaceAll('from "./types"', 'from "./types.mjs"'),
    "utf8",
  )
  await writeFile(
    path.join(dir, "cycleMirrorService.mjs"),
    transpileTs(cycleMirrorServiceSource)
      .replaceAll('from "./types"', 'from "./types.mjs"')
      .replaceAll('from "./reviewArchiveService"', 'from "./reviewArchiveService.mjs"'),
    "utf8",
  )
  await writeFile(path.join(dir, "reflectionService.mjs"), "export function createReflectionKey(sceneId, itemId) { return `${sceneId}:${itemId}` }\n", "utf8")
  await writeFile(
    path.join(dir, "oneThoughtEventRepository.mjs"),
    transpileTs(eventRepoSource)
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
    path.join(dir, "archiveStatsService.mjs"),
    transpileTs(archiveStatsSource)
      .replaceAll('from "@/lib/mind-archive/oneThoughtEventRepository"', 'from "./oneThoughtEventRepository.mjs"')
      .replaceAll('from "@/lib/mind-archive/types"', 'from "./types.mjs"')
      .replaceAll('from "@/lib/mind-archive/reviewArchiveService"', 'from "./reviewArchiveService.mjs"')
      .replaceAll('from "@/lib/trade-review/tradeReviewRepository"', 'from "./tradeReviewRepository.mjs"'),
    "utf8",
  )

  return {
    archiveStatsService: await import(`file://${path.join(dir, `archiveStatsService.mjs?${Date.now()}`)}`),
    tradeReviewRepository: await import(`file://${path.join(dir, `tradeReviewRepository.mjs?${Date.now()}`)}`),
  }
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

function buildTradeReviewInput(overrides = {}) {
  return {
    id: "trade_review_archive_capital_1",
    userId: "local_zhaojian_user",
    linkedOneThoughtEventId: "one_thought_archive_capital_1",
    sceneId: "scene_chase",
    itemId: "item_1",
    key: "scene_chase:item_1",
    os: "明知不可追，见涨仍动心。",
    reflectionFinal: "此念一起，先照见急心，再回到规则。",
    reflectionVersion: "reflection_final_shenji_zeyou_v1",
    symbol: "600519",
    direction: "buy",
    pnl: 100,
    followedPlan: true,
    brokeRule: false,
    heartJudgement: "zheng_sheng",
    createdAt: "2026-06-12T10:30:00.000Z",
    updatedAt: "2026-06-12T10:30:00.000Z",
    ...overrides,
  }
}

function buildCapitalStability(level, practiceText = "继续按计划做，不用一笔交易证明自己。") {
  return {
    version: "capital_stability_v1",
    level,
    score: null,
    reasons: ["读取已保存资金证。"],
    warnings: [],
    metrics: {},
    practiceText,
    generatedAt: "2026-06-12T10:31:00.000Z",
  }
}

test("OneThoughtEvent contract names the P0 ritual boundary", async () => {
  const types = await readFile(typesUrl, "utf8")

  ;[
    'PRIVATE_REFLECTION_VERSION = "reflection_final_shenji_zeyou_v1"',
    'ONE_THOUGHT_RITUAL_NAME = "照见一念仪轨"',
    'ONE_THOUGHT_RITUAL_VERSION = "one_thought_ritual_v1"',
    "export type OneThoughtReaction",
    '"seen"',
    '"not_hit"',
    '"stopped"',
    '"still_moving"',
    "export interface OneThoughtEvent",
    "heartEvidence?: string",
    "practiceText?: string",
    "ritualName?: OneThoughtRitualName",
    "ritualVersion?: OneThoughtRitualVersion",
    "ritualStatus?: RitualStatus",
    "sealStage?: OneThoughtSealStage",
    "zhaojianThisHeartAt?: string",
    "zhaojianThisThoughtAt?: string",
    '"one_thought_ritual"',
  ].forEach((token) => {
    assert.equal(types.includes(token), true, `missing P0 type token: ${token}`)
  })
})

test("OneThoughtRitual facade owns the public process name", async () => {
  const facade = await readFile(ritualFacadeUrl, "utf8")
  const gateway = await readFile(gatewayUrl, "utf8")

  assert.match(facade, /export \{ default \} from "\.\/ZhaoxinRitualFlow"/)
  assert.match(gateway, /OneThoughtRitualFlow/)
  assert.match(gateway, /<OneThoughtRitualFlow/)
  assert.doesNotMatch(gateway, /<ZhaoxinRitualFlow/)
})

test("首页照见一念 enters the ritual through the existing entry route", async () => {
  const entryPage = await readFile(entryPageUrl, "utf8")

  ;[
    "照",
    "照见此心",
    "/assessment",
  ].forEach((token) => {
    assert.equal(entryPage.includes(token), true, `missing entry ritual token: ${token}`)
  })
})

test("OneThoughtRitual contains the fixed P0 nodes and reflectionFinal source", async () => {
  const ritualFlow = await readFile(ritualFlowUrl, "utf8")

  ;[
    'aria-label="照见一念仪轨"',
    "oneThoughtReactionOptions",
    '{ value: "seen", label: "照见了" }',
    '{ value: "not_hit", label: "没照到" }',
    '{ value: "stopped", label: "愿止一念" }',
    '{ value: "still_moving", label: "心还在动" }',
    "照见此念",
    "selectedInsight.reflection",
    "selectedInsight.thief",
    "selectedInsight.evidence",
    "selectedInsight.practice",
    "落印入档",
    "getReflection(selectedThought.sceneId, selectedThought.id)",
    "reflectionFinal: finalReflectionEntry.reflectionFinal",
    "reflectionVersion: PRIVATE_REFLECTION_VERSION",
  ].forEach((token) => {
    assert.equal(ritualFlow.includes(token), true, `missing ritual flow token: ${token}`)
  })
})

test("落印 finalizes a sealed oneThoughtEvent with selected feedback", async () => {
  const ritualFlow = await readFile(ritualFlowUrl, "utf8")
  const eventRepo = await readFile(eventRepoUrl, "utf8")

  ;[
    "createOneThoughtEvent",
    "ONE_THOUGHT_RITUAL_NAME",
    "ONE_THOUGHT_RITUAL_VERSION",
    'ritualStatus: "sealed"',
    'source: "one_thought_ritual"',
    "userReaction: selectedReaction",
    "userReactionAt: completedAt",
    "reflectionSeen: true",
    "sealedAt: completedAt",
  ].forEach((token) => {
    assert.equal(ritualFlow.includes(token), true, `missing sealed event token: ${token}`)
  })

  assert.match(eventRepo, /event\.ritualStatus === "sealed"/)
  assert.match(eventRepo, /if \(value === "zhaojian_yinian_ritual"\) return "one_thought_ritual"/)
})

test("众念心湖 remains isolated from sealed OneThoughtRitual events", async () => {
  const lakePage = await readFile(lakePageUrl, "utf8")

  assert.doesNotMatch(lakePage, /createOneThoughtEvent/)
  assert.doesNotMatch(lakePage, /ritualStatus:\s*"sealed"/)
  assert.doesNotMatch(lakePage, /ONE_THOUGHT_RITUAL_VERSION/)
})

test("P1 stats use only sealed oneThoughtEvents and expose archive selectors", async () => {
  const archiveStats = await readFile(archiveStatsUrl, "utf8")

  ;[
    "listSealedOneThoughtEvents",
    "getTodayArchiveStats",
    "getMindArchiveStats",
    "getRecentSealedThoughtEvents",
    "getTopHeartThieves",
    "getTopScenes",
    "getStopRate",
    "getRecurringThoughts",
    "getPendingReviewEvents",
    'event.userReaction === "stopped"',
    'event.actualAction === "traded" && event.reviewStatus === "pending"',
  ].forEach((token) => {
    assert.equal(archiveStats.includes(token), true, `missing P1 archive stats token: ${token}`)
  })

  assert.doesNotMatch(archiveStats, /anonymousThoughtLakeEntry/)
  assert.doesNotMatch(archiveStats, /reflection_v2/)
})

test("P1 final action records actualAction and reviewStatus without creating reviews", async () => {
  const eventRepo = await readFile(eventRepoUrl, "utf8")

  ;[
    "updateOneThoughtEventFinalAction",
    "reviewStatusForActualAction",
    'if (actualAction === "traded") return "pending"',
    'return "none"',
    "actualActionAt: now",
    "reviewStatus: reviewStatusForActualAction(actualAction)",
  ].forEach((token) => {
    assert.equal(eventRepo.includes(token), true, `missing final action token: ${token}`)
  })
})

test("今日所照 page reads sealed stats and records the P1 final action", async () => {
  const todaySealedPage = await readFile(todaySealedPageUrl, "utf8")

  ;[
    "getTodayArchiveStats",
    "updateOneThoughtEventFinalAction",
    "今日所照",
    "今天你照见了几念",
    "照见了",
    "没照到",
    "愿止一念",
    "心还在动",
    "待复盘",
    "最近一念",
    "reflectionFinal",
    "heartEvidence || event.painPoint",
    "practiceText",
    "最后你怎么做？",
    'recordFinalAction(event.id, "paused")',
    'recordFinalAction(event.id, "watched")',
    'recordFinalAction(event.id, "traded")',
    'recordFinalAction(event.id, "unknown")',
    "/assessment-entry",
  ].forEach((token) => {
    assert.equal(todaySealedPage.includes(token), true, `missing today sealed page token: ${token}`)
  })

  assert.doesNotMatch(todaySealedPage, /reflection_v2/)
  assert.doesNotMatch(todaySealedPage, /anonymousThoughtLakeEntry/)
})

test("档案馆 page collects the private archive IA without lake or old reflection sources", async () => {
  const mindArchivePage = await readFile(mindArchivePageUrl, "utf8")
  const dangAnGuanArchive = await readFile(dangAnGuanArchiveUrl, "utf8")
  const archiveRuleGuardPanel = await readFile(archiveRuleGuardPanelUrl, "utf8")
  const cycleMirrorPanel = await readFile(cycleMirrorPanelUrl, "utf8")
  const reviewRiskSignalDisplay = await readFile(reviewRiskSignalDisplayUrl, "utf8")
  const cycleMirrorService = await readFile(cycleMirrorServiceUrl, "utf8")
  const archiveSource = `${mindArchivePage}\n${dangAnGuanArchive}\n${archiveRuleGuardPanel}\n${cycleMirrorPanel}\n${reviewRiskSignalDisplay}\n${cycleMirrorService}`

  ;[
    "DangAnGuanArchive",
    "getMindArchiveStats",
    "getRecentSealedThoughtEvents",
    "listRecentTradeReviews",
    "buildReviewArchive",
    "buildCycleMirror",
    "reviewArchiveItems",
    "reviewArchiveStats",
    "reviewRiskSignals",
    "cycleMirror",
    "getHeartThiefProfile",
    "todaySealedCount: stats?.todayTotal ?? 0",
    "seenCount: stats?.todaySeen ?? 0",
    "stoppedCount: stats?.todayStopped ?? 0",
    "stillMovingCount: stats?.todayStillMoving ?? 0",
    "pendingReviewCount: stats?.pendingReviewCount ?? 0",
    "stopRate: stats?.stopRate ?? 0",
    "name: heartThiefProfile?.dominantHeartThief || \"待显影\"",
    "riskLabel: heartThiefProfile?.riskLabel || \"先照一念，档案才会说话。\"",
    "recentEntries={recentArchiveEvents.map",
    "time: formatTime(event.createdAt)",
    "recurringThoughts={recurringThoughts.map",
    "ArchiveRuleGuardPanel",
    "CycleMirrorPanel",
    "cycleMirror={cycleMirror}",
    "reviewRiskSignals={reviewArchive?.reviewRiskSignals ?? []}",
    "onOpenMindArchive",
    "onOpenHeartMirrorScroll={() => router.push(\"/mind-scroll\")}",
    "onOpenZhixingScroll={() => router.push(\"/zhixing-scroll\")}",
    "onOpenTradeReview={() => openTradeReview(pendingReviewEvents[0]?.id)}",
    "onContinueRitual={() => router.push(\"/assessment-entry\")}",
    "danganguan-page",
    "danganguan-mount",
    "danganguan-overview",
    "danganguan-main-axis",
    "danganguan-side-axis",
    "danganguan-colophon",
    "档案馆",
    "一念档案",
    "这里收藏你已照见、已落印、已复盘的一念。",
    "不记行情，只记你被哪一念牵走，又有没有照着做。",
    "当前卷：一念档案",
    "今日落印",
    "近日最强心贼",
    "待显影",
    "最近一念",
    "一念档案摘要",
    "查看一念档案",
    "心镜长卷",
    "看心怎么动。",
    "进入长卷 →",
    "知行长卷",
    "看照见后有没有做到。",
    "真实复盘入口",
    "最近真实复盘",
    "复盘统计",
    "心判统计",
    "行为统计",
    "盘证统计",
    "资金稳定概览",
    "不只看这笔赚没赚。",
    "资金证未记录",
    "盘证未记录",
    "资金",
    "稳中有戒",
    "钱稳心动",
    "钱动心乱",
    "双失守",
    "数据不足",
    "暂无待复盘的一念。",
    "复发念",
    "这不是第一次来，也不会是最后一次。",
    "循环之镜",
    "你以为这是新行情，其实是旧心贼换了张脸。",
    "最强复发念",
    "最强复发行为",
    "最强资金伤害",
    "cycleSummary.conclusionText",
    "暂无明显循环。",
    "不是没有问题，而是还需要更多真实复盘样本。",
    "getTopCycleItems",
    "recurringBehaviorLabels",
    "recurringCapitalPatternLabels",
    "cycleSeverityLabels",
    "规则守护",
    "不强制拦截，只做提醒。",
    "看见这类循环，下一笔才有可能停住。",
    "getTopReviewRiskSignals(reviewRiskSignals)",
    "reviewRiskSignalTypeLabels",
    "reviewRiskSignalLevelLabels",
    "反复破戒",
    "贼胜反复",
    "双输反复",
    "资金双失守",
    "心还在动仍交易",
    "强守护",
    "守护提醒",
    "轻提醒",
    "recentSealedEvents",
    "pendingReviewEvents",
    "recurringThoughts",
    "reflectionFinal",
    "这一念之后你交易了，后面还欠一次回头看。",
    "width: min(1160px, 100%)",
    "@media (max-width: 430px)",
  ].forEach((token) => {
    assert.equal(archiveSource.includes(token), true, `missing mind archive page token: ${token}`)
  })

  assert.doesNotMatch(archiveSource, /心镜档案/)
  assert.doesNotMatch(archiveSource, /getCapitalStabilityLabel/)
  assert.doesNotMatch(archiveSource, /getCapitalStabilityPracticeText/)
  assert.doesNotMatch(archiveSource, /capitalStabilityStats/)
  assert.doesNotMatch(archiveSource, /getRuleGuardReminders/)
  assert.doesNotMatch(archiveSource, /ruleGuardNotices/)
  assert.doesNotMatch(archiveSource, /reflection_v2/)
  assert.doesNotMatch(archiveSource, /anonymousThoughtLakeEntry/)
})

test("P2.4-C archive reads saved capitalStability summary and counts missing separately", async () => {
  const { archiveStatsService, tradeReviewRepository } = await importArchiveReviewModules()
  const storage = createMemoryStorage()

  ;[
    ["stable_with_guard", "稳中有戒"],
    ["money_stable_heart_moving", "钱稳心动"],
    ["money_moving_heart_chaotic", "钱动心乱"],
    ["double_unstable", "双失守"],
    ["insufficient_data", "数据不足"],
  ].forEach(([level, label], index) => {
    tradeReviewRepository.createTradeReview(
      buildTradeReviewInput({
        id: `trade_review_archive_capital_${index}`,
        linkedOneThoughtEventId: `one_thought_archive_capital_${index}`,
        capitalStability: buildCapitalStability(level, label),
      }),
      storage,
    )
  })

  tradeReviewRepository.createTradeReview(
    buildTradeReviewInput({
      id: "trade_review_archive_capital_missing",
      linkedOneThoughtEventId: "one_thought_archive_capital_missing",
      capitalStability: undefined,
    }),
    storage,
  )

  const stats = archiveStatsService.getMindArchiveStats("local_zhaojian_user", "all", storage)

  assert.deepEqual(stats.capitalStabilityStats, {
    stableWithGuard: 1,
    moneyStableHeartMoving: 1,
    moneyMovingHeartChaotic: 1,
    doubleUnstable: 1,
    insufficientData: 1,
    missing: 1,
  })
})

test("档案馆展示层空数据时也必须显示正文而不是挂轴空壳", async () => {
  const dangAnGuanArchive = await readFile(dangAnGuanArchiveUrl, "utf8")
  const archiveRuleGuardPanel = await readFile(archiveRuleGuardPanelUrl, "utf8")
  const cycleMirrorPanel = await readFile(cycleMirrorPanelUrl, "utf8")
  const reviewRiskSignalDisplay = await readFile(reviewRiskSignalDisplayUrl, "utf8")
  const archiveDisplaySource = `${dangAnGuanArchive}\n${archiveRuleGuardPanel}\n${cycleMirrorPanel}\n${reviewRiskSignalDisplay}`

  ;[
    "fallbackSummary",
    "todaySealedCount: 0",
    "seenCount: 0",
    "stoppedCount: 0",
    "stillMovingCount: 0",
    "pendingReviewCount: 0",
    "stopRate: 0",
    "safeSummary",
    "safeRecentEntries",
    "safeRecurringThoughts",
    "fallbackStrongestHeartThief",
    'name: "待显影"',
    "近日最强心贼：{heartName}",
    "先照一念，档案才会说话。",
    "暂无落印的一念。",
    "先完成一次照见一念仪轨，档案馆才会留下第一痕。",
    "暂无待复盘的一念。",
    "暂无复发念。",
    "ArchiveRuleGuardPanel",
    "CycleMirrorPanel",
    "暂无明显循环。",
    "不是没有问题，而是还需要更多真实复盘样本。",
    "暂无规则守护提醒。",
    "不是没有风险，而是还需要更多复盘样本。",
    "opacity: 1;",
    "transform: none;",
  ].forEach((token) => {
    assert.equal(archiveDisplaySource.includes(token), true, `missing archive fallback/display token: ${token}`)
  })

  assert.equal(dangAnGuanArchive.includes("opacity: 0;"), false, "archive content must not start invisible and depend on scroll reveal")
})
