import assert from "node:assert/strict"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const serviceUrl = new URL("./reviewArchiveService.ts", import.meta.url)
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

async function importReviewArchiveService() {
  const dir = path.join(tmpdir(), "yangming-review-archive-service-tests")
  await mkdir(dir, { recursive: true })

  const typesSource = await readFile(typesUrl, "utf8")
  const serviceSource = await readFile(serviceUrl, "utf8")

  await writeFile(path.join(dir, "types.mjs"), transpileTs(typesSource), "utf8")
  await writeFile(
    path.join(dir, "reviewArchiveService.mjs"),
    transpileTs(serviceSource).replaceAll('from "./types"', 'from "./types.mjs"'),
    "utf8",
  )

  return import(`file://${path.join(dir, `reviewArchiveService.mjs?${Date.now()}`)}`)
}

function buildEvent(id, overrides = {}) {
  return {
    id,
    userId: "local_zhaojian_user",
    sceneId: "scene_chase",
    itemId: "item_1",
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
    userReaction: "seen",
    actualAction: "traded",
    source: "one_thought_ritual",
    createdAt: "2026-06-12T10:00:00.000Z",
    updatedAt: "2026-06-12T10:00:00.000Z",
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

function buildReview(id, eventId, overrides = {}) {
  return {
    id,
    userId: "local_zhaojian_user",
    linkedOneThoughtEventId: eventId,
    sceneId: "scene_chase",
    itemId: "item_1",
    key: `scene_chase:${id}`,
    os: "明知不可追，见涨仍动心。",
    reflectionFinal: "此念一起，先照见急心，再回到规则。",
    reflectionVersion: "reflection_final_shenji_zeyou_v1",
    symbol: "600519",
    direction: "buy",
    pnl: 100,
    followedPlan: true,
    brokeRule: false,
    heartJudgement: "zheng_sheng",
    marketContext: {
      dataSource: "kline_db",
      summary: { finalText: "这笔更像反抽末端追回。" },
    },
    behaviorEvidence: {
      changedPlanIntraday: false,
      addedPosition: false,
      movedStopLoss: false,
      emotionDrivenEntry: false,
    },
    reviewSummary: {
      version: "pan_xin_he_zheng_v1",
      practiceText: "先守规则，再谈判断。",
      marketText: "盘证摘要。",
      generatedAt: "2026-06-12T10:32:00.000Z",
    },
    capitalStability: buildCapitalStability("stable_with_guard"),
    createdAt: "2026-06-12T10:30:00.000Z",
    updatedAt: "2026-06-12T10:30:00.000Z",
    ...overrides,
  }
}

function buildFixture() {
  const events = [
    buildEvent("event_1", { userReaction: "seen", actualAction: "traded" }),
    buildEvent("event_2", { userReaction: "still_moving", actualAction: "traded" }),
    buildEvent("event_3", { userReaction: "still_moving", actualAction: "traded" }),
    buildEvent("event_4", { userReaction: "seen", actualAction: "traded" }),
    buildEvent("event_5", { userReaction: "seen", actualAction: "traded" }),
    buildEvent("event_6", { userReaction: "not_hit", actualAction: "unknown" }),
  ]
  const reviews = [
    buildReview("review_1", "event_1", {
      heartJudgement: "zheng_sheng",
      capitalStability: buildCapitalStability("stable_with_guard", "继续按计划做，不用一笔交易证明自己。"),
    }),
    buildReview("review_2", "event_2", {
      pnl: 300,
      followedPlan: false,
      brokeRule: true,
      heartJudgement: "zei_sheng",
      behaviorEvidence: { addedPosition: true, movedStopLoss: false, changedPlanIntraday: false },
      riskEvidence: { addedPosition: true },
      capitalStability: buildCapitalStability("money_moving_heart_chaotic", "资金开始被心贼牵动。先看仓位、风险和规则是否偏移。"),
    }),
    buildReview("review_3", "event_3", {
      pnl: 200,
      followedPlan: false,
      brokeRule: true,
      heartJudgement: "zei_sheng",
      behaviorEvidence: { addedPosition: false, movedStopLoss: true, changedPlanIntraday: false },
      riskEvidence: { movedStopLoss: true },
      capitalStability: buildCapitalStability("double_unstable", "钱也失守，心也失守。先停一笔，不用下一笔把自己救回来。"),
    }),
    buildReview("review_4", "event_4", {
      pnl: -1200,
      followedPlan: false,
      brokeRule: true,
      heartJudgement: "shuang_shu",
      marketContext: undefined,
      behaviorEvidence: { addedPosition: false, movedStopLoss: false, changedPlanIntraday: true },
      riskEvidence: { changedPlanIntraday: true },
      capitalStability: buildCapitalStability("double_unstable"),
    }),
    buildReview("review_5", "event_5", {
      pnl: -300,
      heartJudgement: "shuang_shu",
      marketContext: undefined,
      reviewSummary: undefined,
      capitalStability: buildCapitalStability("insufficient_data", "补上账户权益和计划风险，才能看清这笔交易有没有让资金失稳。"),
    }),
    buildReview("review_6", "event_6", {
      marketContext: undefined,
      reviewSummary: undefined,
      capitalStability: undefined,
      heartJudgement: undefined,
    }),
  ]

  return { events, reviews }
}

test("P2.5-A builds reviewArchiveItems and tolerates legacy missing summaries", async () => {
  const { buildReviewArchive } = await importReviewArchiveService()
  const { events, reviews } = buildFixture()
  const result = buildReviewArchive({ tradeReviews: reviews, oneThoughtEvents: events })

  assert.equal(result.reviewArchiveItems.length, 6)

  const richItem = result.reviewArchiveItems.find((item) => item.tradeReviewId === "review_2")
  assert.equal(richItem.linkedOneThoughtEventId, "event_2")
  assert.equal(richItem.os, "明知不可追，见涨仍动心。")
  assert.equal(richItem.userReaction, "still_moving")
  assert.equal(richItem.actualAction, "traded")
  assert.equal(richItem.heartJudgement, "zei_sheng")
  assert.equal(richItem.capitalStabilityLevel, "money_moving_heart_chaotic")
  assert.equal(richItem.practiceText, "先守规则，再谈判断。")
  assert.equal(richItem.capitalPracticeText, "资金开始被心贼牵动。先看仓位、风险和规则是否偏移。")
  assert.equal(richItem.addedPosition, true)
  assert.equal(richItem.hasMarketContext, true)
  assert.equal(richItem.marketText, "这笔更像反抽末端追回。")

  const legacyItem = result.reviewArchiveItems.find((item) => item.tradeReviewId === "review_6")
  assert.equal(legacyItem.practiceText, undefined)
  assert.equal(legacyItem.capitalStabilityLevel, undefined)
  assert.equal(legacyItem.hasMarketContext, false)
})

test("P2.5-A computes reviewArchiveStats without recalculating judgement or capital stability", async () => {
  const { buildReviewArchive } = await importReviewArchiveService()
  const { events, reviews } = buildFixture()
  const result = buildReviewArchive({ tradeReviews: reviews, oneThoughtEvents: events })

  assert.deepEqual(result.reviewArchiveStats.heartJudgementCounts, {
    zhengSheng: 1,
    zeiSheng: 2,
    zhengKui: 0,
    shuangShu: 2,
    missing: 1,
  })
  assert.deepEqual(result.reviewArchiveStats.capitalStabilityCounts, {
    stableWithGuard: 1,
    moneyStableHeartMoving: 0,
    moneyMovingHeartChaotic: 1,
    doubleUnstable: 2,
    insufficientData: 1,
    missing: 1,
  })
  assert.deepEqual(result.reviewArchiveStats.behaviorCounts, {
    brokeRule: 3,
    addedPosition: 1,
    movedStopLoss: 1,
    changedPlanIntraday: 1,
    stillMovingThenTraded: 2,
  })
  assert.deepEqual(result.reviewArchiveStats.marketContextCounts, {
    hasMarketContext: 3,
    missingMarketContext: 3,
  })
})

test("P2.5-A emits deterministic reviewRiskSignals from saved archive facts", async () => {
  const { buildReviewArchive } = await importReviewArchiveService()
  const { events, reviews } = buildFixture()
  const { reviewRiskSignals } = buildReviewArchive({ tradeReviews: reviews, oneThoughtEvents: events })
  const signalByType = new Map(reviewRiskSignals.map((signal) => [signal.type, signal]))

  assert.equal(signalByType.get("repeated_broke_rule").count, 3)
  assert.deepEqual(signalByType.get("repeated_broke_rule").relatedReviewIds, ["review_2", "review_3", "review_4"])
  assert.equal(signalByType.get("repeated_zei_sheng").count, 2)
  assert.equal(signalByType.get("repeated_shuang_shu").count, 2)
  assert.equal(signalByType.get("capital_double_unstable").count, 2)
  assert.equal(signalByType.get("money_moving_heart_chaotic").count, 1)
  assert.equal(signalByType.get("still_moving_then_traded").count, 2)
  assert.equal(signalByType.get("added_position_when_heart_moving").count, 1)
  assert.equal(signalByType.get("moved_stop_loss").count, 1)
  assert.match(signalByType.get("still_moving_then_traded").text, /心还在动后仍交易/)
  assert.match(signalByType.get("repeated_zei_sheng").text, /坏习惯正在被奖励/)
})

test("P2.5-A service is deterministic and avoids GPT, recalculation and trading advice", async () => {
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
  ].forEach((token) => {
    assert.equal(source.includes(token), false, `reviewArchiveService must not include: ${token}`)
  })
})
