import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const repositoryUrl = new URL("./tradeReviewRepository.ts", import.meta.url)
const reviewPageUrl = new URL("../../app/review/page.tsx", import.meta.url)
const mindArchiveTypesUrl = new URL("../mind-archive/types.ts", import.meta.url)
const archiveStatsUrl = new URL("../mind-archive/archiveStatsService.ts", import.meta.url)
const lakePageUrl = new URL("../../features/one-thought-lake/OneThoughtLakePage.tsx", import.meta.url)

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
  const reviewPage = await readFile(reviewPageUrl, "utf8")

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
  ].forEach((token) => {
    assert.equal(reviewPage.includes(token), true, `missing review page token: ${token}`)
  })

  assert.doesNotMatch(reviewPage, /不关联，单独复盘/)
  assert.doesNotMatch(reviewPage, /reflectionService|getReflection|matchUserThought|reflection_v2/)
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
    "heartJudgement: HeartJudgement",
  ].forEach((token) => {
    assert.equal(types.includes(token), true, `missing TradeReview type token: ${token}`)
  })
})

test("P2 completed reviews leave the pending archive list through oneThoughtEvent status", async () => {
  const archiveStats = await readFile(archiveStatsUrl, "utf8")

  assert.match(archiveStats, /event\.actualAction === "traded" && event\.reviewStatus === "pending"/)
  assert.doesNotMatch(archiveStats, /tradeReviewHistoryStorageKey/)
})

test("众念心湖 cannot directly create a private tradeReview", async () => {
  const lakePage = await readFile(lakePageUrl, "utf8")

  assert.doesNotMatch(lakePage, /createTradeReview/)
  assert.doesNotMatch(lakePage, /linkedOneThoughtEventId/)
})
