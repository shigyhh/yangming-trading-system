import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const typesUrl = new URL("./types.ts", import.meta.url)
const eventRepoUrl = new URL("./oneThoughtEventRepository.ts", import.meta.url)
const archiveStatsUrl = new URL("./archiveStatsService.ts", import.meta.url)
const ritualFlowUrl = new URL("../../features/assessment/ZhaoxinRitualFlow.tsx", import.meta.url)
const ritualFacadeUrl = new URL("../../features/assessment/OneThoughtRitualFlow.tsx", import.meta.url)
const gatewayUrl = new URL("../../features/assessment/MirrorGateway.tsx", import.meta.url)
const entryPageUrl = new URL("../../app/assessment-entry/page.tsx", import.meta.url)
const todaySealedPageUrl = new URL("../../app/today-sealed/page.tsx", import.meta.url)
const mindArchivePageUrl = new URL("../../app/mind-archive/page.tsx", import.meta.url)
const lakePageUrl = new URL("../../features/one-thought-lake/OneThoughtLakePage.tsx", import.meta.url)

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

  ;[
    "getMindArchiveStats",
    "getRecentSealedThoughtEvents",
    "listRecentTradeReviews",
    "getHeartThiefProfile",
    "getRuleGuardReminders",
    "档案馆",
    "一念档案",
    "这里收藏你已照见、已落印、已复盘的一念。",
    "不记行情，只记你被哪一念牵走，又有没有照着做。",
    "当前卷：一念档案",
    "archive-overview-deck",
    "overview-today-pane",
    "overview-thief-pane",
    "今日落印",
    "今日所照摘要",
    "近日最强心贼",
    "待显影",
    "archive-main-grid",
    "archive-primary-axis",
    "archive-side-rail",
    "最近一念",
    "一念档案摘要",
    "查看一念档案",
    "scroll-gate-line",
    "心镜长卷",
    "看心怎么动。",
    "进入长卷 →",
    "知行长卷",
    "看照见后有没有做到。",
    "真实复盘入口",
    "review-rail-section",
    "review-rail-section is-empty",
    "暂无待复盘的一念。",
    "复发念",
    "这不是第一次来，也不会是最后一次。",
    "规则守护",
    "reminders.slice(0, 3)",
    "recentSealedEvents",
    "pendingReviewEvents",
    "stats.recurringThoughts",
    "reflectionFinal",
    "心贼标签待补齐",
    "这一念之后你交易了，后面还欠一次回头看。",
    "width: min(100%, 1160px)",
    "@media (max-width: 720px)",
  ].forEach((token) => {
    assert.equal(mindArchivePage.includes(token), true, `missing mind archive page token: ${token}`)
  })

  assert.doesNotMatch(mindArchivePage, /心镜档案/)
  assert.doesNotMatch(mindArchivePage, /reflection_v2/)
  assert.doesNotMatch(mindArchivePage, /anonymousThoughtLakeEntry/)
})
