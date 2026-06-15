import assert from "node:assert/strict"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const serviceUrl = new URL("./cycleMirrorService.ts", import.meta.url)
const typesUrl = new URL("./types.ts", import.meta.url)

function transpileTs(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  }).outputText
}

async function importCycleMirrorService() {
  const dir = path.join(tmpdir(), "yangming-cycle-mirror-service-tests")
  await mkdir(dir, { recursive: true })

  const typesSource = await readFile(typesUrl, "utf8")
  const serviceSource = await readFile(serviceUrl, "utf8")

  await writeFile(path.join(dir, "types.mjs"), transpileTs(typesSource), "utf8")
  await writeFile(
    path.join(dir, "cycleMirrorService.mjs"),
    transpileTs(serviceSource)
      .replaceAll('from "./types"', 'from "./types.mjs"')
      .replaceAll('from "./reviewArchiveService"', 'from "./reviewArchiveService.mjs"'),
    "utf8",
  )
  await writeFile(path.join(dir, "reviewArchiveService.mjs"), "", "utf8")

  return import(`file://${path.join(dir, `cycleMirrorService.mjs?${Date.now()}`)}`)
}

const NOW = "2026-06-15T00:00:00.000Z"

function buildEvent(id, overrides = {}) {
  return {
    id,
    userId: "local_zhaojian_user",
    sceneId: "scene_chase",
    itemId: "item_pullback",
    key: `scene_chase:${id}`,
    tradeMoment: "临盘追涨",
    os: "明知不可追，见涨仍动心。",
    reflectionFinal: "此念一起，先照见急心，再回到规则。",
    finalSource: "reflection_final_shenji_zeyou_v1",
    painLevel: 3,
    heartThief: "急",
    reflectionVersion: "reflection_final_shenji_zeyou_v1",
    reflectionShownAt: "2026-06-12T10:00:00.000Z",
    reflectionSeen: true,
    userReaction: "still_moving",
    actualAction: "traded",
    source: "one_thought_ritual",
    createdAt: "2026-06-12T10:00:00.000Z",
    updatedAt: "2026-06-12T10:00:00.000Z",
    ...overrides,
  }
}

function buildReviewItem(id, eventId, overrides = {}) {
  return {
    id,
    tradeReviewId: id,
    linkedOneThoughtEventId: eventId,
    createdAt: "2026-06-12T10:30:00.000Z",
    os: "明知不可追，见涨仍动心。",
    reflectionFinal: "此念一起，先照见急心，再回到规则。",
    heartThief: "急",
    userReaction: "still_moving",
    actualAction: "traded",
    symbol: "600519",
    direction: "buy",
    pnl: 100,
    hasMarketContext: true,
    marketText: "盘证摘要。",
    heartJudgement: "zheng_sheng",
    capitalStabilityLevel: "stable_with_guard",
    practiceText: "先守规则，再谈判断。",
    capitalPracticeText: "继续按计划做，不用一笔交易证明自己。",
    brokeRule: false,
    followedPlan: true,
    addedPosition: false,
    movedStopLoss: false,
    changedPlanIntraday: false,
    ...overrides,
  }
}

function buildSignal(type, level, count, relatedReviewIds) {
  return {
    type,
    level,
    count,
    text: `${type} archive signal`,
    relatedReviewIds,
  }
}

test("P2.6-A detects recurringThoughts by sceneId and itemId", async () => {
  const { buildCycleMirror } = await importCycleMirrorService()
  const oneThoughtEvents = [
    buildEvent("event_1"),
    buildEvent("event_2"),
    buildEvent("event_3"),
  ]
  const reviewArchiveItems = [
    buildReviewItem("review_1", "event_1"),
    buildReviewItem("review_2", "event_2"),
  ]

  const result = buildCycleMirror({ oneThoughtEvents, reviewArchiveItems, reviewRiskSignals: [], now: NOW })
  const thought = result.recurringThoughts[0]

  assert.equal(thought.key, "scene_chase:item_pullback")
  assert.equal(thought.count, 3)
  assert.equal(thought.severity, "medium")
  assert.deepEqual(thought.linkedOneThoughtEventIds, ["event_1", "event_2", "event_3"])
  assert.deepEqual(thought.linkedReviewIds, ["review_1", "review_2"])
  assert.match(thought.text, /这个念头不是第一次出现/)
})

test("P2.6-A marks recurringThought high at five occurrences and falls back to normalized os", async () => {
  const { buildCycleMirror } = await importCycleMirrorService()
  const oneThoughtEvents = Array.from({ length: 5 }, (_, index) => buildEvent(`event_os_${index}`, {
    sceneId: "",
    itemId: "",
    os: "  明知不可追，见涨仍动心。 ",
  }))

  const result = buildCycleMirror({ oneThoughtEvents, reviewArchiveItems: [], reviewRiskSignals: [], now: NOW })
  const thought = result.recurringThoughts[0]

  assert.equal(thought.key, "明知不可追，见涨仍动心。")
  assert.equal(thought.count, 5)
  assert.equal(thought.severity, "high")
})

test("P2.6-A detects recurringScenes and recurringHeartThieves", async () => {
  const { buildCycleMirror } = await importCycleMirrorService()
  const oneThoughtEvents = [
    ...Array.from({ length: 5 }, (_, index) => buildEvent(`scene_event_${index}`, {
      itemId: `item_${index % 2}`,
      heartThief: index % 2 ? "急" : "贪",
    })),
    ...Array.from({ length: 8 }, (_, index) => buildEvent(`thief_event_${index}`, {
      sceneId: `scene_${index}`,
      itemId: `item_${index}`,
      heartThief: "执",
    })),
  ]
  const reviewArchiveItems = oneThoughtEvents.slice(5).map((event, index) => buildReviewItem(`review_thief_${index}`, event.id, {
    heartThief: "执",
  }))

  const result = buildCycleMirror({ oneThoughtEvents, reviewArchiveItems, reviewRiskSignals: [], now: NOW })
  const scene = result.recurringScenes.find((item) => item.sceneId === "scene_chase")
  const thief = result.recurringHeartThieves.find((item) => item.heartThief === "执")

  assert.equal(scene.count, 5)
  assert.equal(scene.severity, "high")
  assert.deepEqual(scene.itemIds, ["item_0", "item_1"])
  assert.equal(thief.count, 8)
  assert.equal(thief.severity, "high")
  assert.equal(thief.relatedOneThoughtEventIds.length, 8)
  assert.equal(thief.relatedReviewIds.length, 8)
})

test("P2.6-A detects recurringBehaviors from saved reviewArchiveItems", async () => {
  const { buildCycleMirror } = await importCycleMirrorService()
  const reviewArchiveItems = [
    buildReviewItem("review_1", "event_1", { brokeRule: true, addedPosition: true, movedStopLoss: true, changedPlanIntraday: true }),
    buildReviewItem("review_2", "event_2", { brokeRule: true, addedPosition: true, movedStopLoss: true, changedPlanIntraday: true }),
    buildReviewItem("review_3", "event_3", { userReaction: "still_moving", actualAction: "traded" }),
  ]

  const result = buildCycleMirror({ oneThoughtEvents: [], reviewArchiveItems, reviewRiskSignals: [], now: NOW })
  const behaviorByType = new Map(result.recurringBehaviors.map((item) => [item.type, item]))

  assert.equal(behaviorByType.get("still_moving_then_traded").count, 3)
  assert.equal(behaviorByType.get("still_moving_then_traded").severity, "high")
  assert.equal(behaviorByType.get("broke_rule").count, 2)
  assert.equal(behaviorByType.get("added_position").count, 2)
  assert.equal(behaviorByType.get("moved_stop_loss").count, 2)
  assert.equal(behaviorByType.get("changed_plan_intraday").count, 2)
})

test("P2.6-A detects recurringCapitalPatterns from saved capitalStabilityLevel", async () => {
  const { buildCycleMirror } = await importCycleMirrorService()
  const reviewArchiveItems = [
    buildReviewItem("review_double_1", "event_double_1", { capitalStabilityLevel: "double_unstable" }),
    buildReviewItem("review_double_2", "event_double_2", { capitalStabilityLevel: "double_unstable" }),
    buildReviewItem("review_moving_1", "event_moving_1", { capitalStabilityLevel: "money_moving_heart_chaotic" }),
    buildReviewItem("review_moving_2", "event_moving_2", { capitalStabilityLevel: "money_moving_heart_chaotic" }),
    buildReviewItem("review_stable_1", "event_stable_1", { capitalStabilityLevel: "money_stable_heart_moving" }),
    buildReviewItem("review_stable_2", "event_stable_2", { capitalStabilityLevel: "money_stable_heart_moving" }),
    buildReviewItem("review_stable_3", "event_stable_3", { capitalStabilityLevel: "money_stable_heart_moving" }),
    buildReviewItem("review_insufficient_1", "event_insufficient_1", { capitalStabilityLevel: "insufficient_data" }),
    buildReviewItem("review_insufficient_2", "event_insufficient_2", { capitalStabilityLevel: "insufficient_data" }),
    buildReviewItem("review_insufficient_3", "event_insufficient_3", { capitalStabilityLevel: "insufficient_data" }),
  ]

  const result = buildCycleMirror({ oneThoughtEvents: [], reviewArchiveItems, reviewRiskSignals: [], now: NOW })
  const capitalByType = new Map(result.recurringCapitalPatterns.map((item) => [item.type, item]))

  assert.equal(capitalByType.get("double_unstable").count, 2)
  assert.equal(capitalByType.get("double_unstable").severity, "high")
  assert.equal(capitalByType.get("money_moving_heart_chaotic").count, 2)
  assert.equal(capitalByType.get("money_moving_heart_chaotic").severity, "medium")
  assert.equal(capitalByType.get("money_stable_heart_moving").count, 3)
  assert.equal(capitalByType.get("capital_insufficient_data").count, 3)
})

test("P2.6-A emits cycleSignals including heart_thief_cycle and archive risk signals", async () => {
  const { buildCycleMirror } = await importCycleMirrorService()
  const reviewArchiveItems = [
    buildReviewItem("review_cycle_1", "event_cycle_1", { heartJudgement: "zei_sheng" }),
    buildReviewItem("review_cycle_2", "event_cycle_2", { heartJudgement: "shuang_shu" }),
    buildReviewItem("review_cycle_3", "event_cycle_3", { heartJudgement: "zheng_sheng" }),
  ]
  const reviewRiskSignals = [
    buildSignal("repeated_broke_rule", "medium", 2, ["review_cycle_1", "review_cycle_2"]),
    buildSignal("capital_double_unstable", "high", 2, ["review_cycle_1", "review_cycle_2"]),
  ]

  const result = buildCycleMirror({ oneThoughtEvents: [], reviewArchiveItems, reviewRiskSignals, now: NOW })
  const signalByType = new Map(result.cycleSignals.map((item) => [item.type, item]))

  assert.equal(signalByType.get("heart_thief_cycle").count, 2)
  assert.equal(signalByType.get("heart_thief_cycle").level, "medium")
  assert.match(signalByType.get("heart_thief_cycle").text, /心还在动 → 还是交易 → 复盘失守/)
  assert.equal(signalByType.get("same_behavior_repeated").count >= 2, true)
  assert.equal(signalByType.get("same_capital_damage_repeated").level, "high")
})

test("P2.6-A builds cycleSummary, tolerates legacy missing fields and filters old records", async () => {
  const { buildCycleMirror } = await importCycleMirrorService()
  const oneThoughtEvents = [
    ...Array.from({ length: 5 }, (_, index) => buildEvent(`old_event_${index}`, {
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-04-01T10:00:00.000Z",
    })),
    { id: "legacy_event", os: "明知不可追，见涨仍动心。", createdAt: "2026-06-14T10:00:00.000Z" },
  ]
  const reviewArchiveItems = [
    { id: "legacy_review", tradeReviewId: "legacy_review", createdAt: "2026-06-14T10:30:00.000Z", hasMarketContext: false },
  ]

  const result = buildCycleMirror({ oneThoughtEvents, reviewArchiveItems, reviewRiskSignals: [], recentDays: 30, now: NOW })

  assert.equal(result.recurringThoughts.length, 0)
  assert.equal(result.recurringScenes.length, 0)
  assert.equal(result.cycleSummary.conclusionText, "你以为这是新行情，其实是旧心贼换了张脸。")
})

test("P2.6-A service is deterministic and avoids recalculation, GPT and trading advice", async () => {
  const source = await readFile(serviceUrl, "utf8")

  ;[
    "calculateHeartJudgement",
    "judgeTradeHeart",
    "buildCapitalStabilityResult",
    "openai",
    "GPT",
    "应该买",
    "应该卖",
    "可以加仓",
    "建议止损",
    "后面会涨",
    "后面会跌",
    "买点",
    "卖点",
    "收益承诺",
    "强制禁止交易",
  ].forEach((token) => {
    assert.equal(source.includes(token), false, `cycleMirrorService must not include: ${token}`)
  })
})

test("P2.6-B exposes shared cycle sorting by severity, count and lastSeenAt", async () => {
  const { getTopCycleItems, getCycleSeverityRank } = await importCycleMirrorService()

  assert.equal(getCycleSeverityRank("low"), 1)
  assert.equal(getCycleSeverityRank("medium"), 2)
  assert.equal(getCycleSeverityRank("high"), 3)

  const topItems = getTopCycleItems([
    { id: "medium_new", severity: "medium", count: 9, lastSeenAt: "2026-06-14T10:00:00.000Z" },
    { id: "high_old", severity: "high", count: 2, lastSeenAt: "2026-06-10T10:00:00.000Z" },
    { id: "high_new", severity: "high", count: 2, lastSeenAt: "2026-06-14T10:00:00.000Z" },
    { id: "high_count", severity: "high", count: 4, lastSeenAt: "2026-06-11T10:00:00.000Z" },
  ], 3)

  assert.deepEqual(topItems.map((item) => item.id), ["high_count", "high_new", "high_old"])
})
