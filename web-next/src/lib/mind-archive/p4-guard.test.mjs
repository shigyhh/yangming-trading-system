import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const profileUrl = new URL("./heartThiefProfileService.ts", import.meta.url)
const ruleGuardUrl = new URL("../rule-guard/ruleGuardService.ts", import.meta.url)
const archivePageUrl = new URL("../../app/mind-archive/page.tsx", import.meta.url)
const todaySealedPageUrl = new URL("../../app/today-sealed/page.tsx", import.meta.url)
const assessmentEntryPageUrl = new URL("../../app/assessment-entry/page.tsx", import.meta.url)
const archiveStatsUrl = new URL("./archiveStatsService.ts", import.meta.url)

const forbiddenSourceTokens = [
  "OneThoughtLake",
  "anonymousThoughtLakeEntry",
  "lake_seed",
  "reflection_v2",
  "createOneThoughtEvent",
  "createReflection",
  "openai",
  "GPT",
]

test("P4 heartThiefProfileService exposes deterministic profile from sealed archive stats", async () => {
  const profile = await readFile(profileUrl, "utf8")

  ;[
    "export interface HeartThiefProfile",
    "totalEvents: number",
    "dominantHeartThief?: string",
    "topHeartThieves",
    "heartThief: string",
    "ratio: number",
    "topScenes",
    "recurringThoughts",
    "stopRate: number",
    "stillMovingRate: number",
    "reviewJudgementCounts",
    "zhengSheng",
    "zeiSheng",
    "zhengKui",
    "shuangShu",
    "riskLabel?: string",
    "getArchiveStats",
    "getTopHeartThieves",
    "getRecurringThoughts",
    "getReviewJudgementCounts",
    "topHeartThieves[0]?.heartThief",
    "ratio: stats.totalEvents ? item.count / stats.totalEvents : 0",
    "近日最强心贼：急。\\n你不是没有判断，是受不了等。",
    "近日最强心贼：贪。\\n你不是想赚钱，是想一口吃完。",
    "近日最强心贼：痴。\\n你不是没看懂，是不愿认错。",
    "近日最强心贼：疑。\\n你不是没看见机会，是不敢承担结果。",
    "近日最强心贼：执。\\n你不是放不下行情，是放不下当初那个判断。",
    "近日最强心贼：怯。\\n你不是谨慎，是怕一动就坐实错误。",
    "近日最强心贼：从。\\n你不是要建议，是想把责任交出去。",
    "近日最强心贼：傲。\\n你不是看懂了市场，是刚赢一次就忘了边界。",
    "今日还没有照见。\\n先照一念，档案才会说话。",
  ].forEach((token) => {
    assert.equal(profile.includes(token), true, `missing P4 profile token: ${token}`)
  })

  forbiddenSourceTokens.forEach((token) => {
    assert.equal(profile.includes(token), false, `profile crosses P4 boundary: ${token}`)
  })
})

test("P4 heartThief profile normalizes composite heart thieves before ranking", async () => {
  const archiveStats = await readFile(archiveStatsUrl, "utf8")
  const profile = await readFile(profileUrl, "utf8")

  ;[
    "export function normalizeHeartThieves",
    ".split(/[、,，·\\s/|]+/)",
    'item === "惧" ? "怯" : item',
    "events.flatMap((event) => normalizeHeartThieves(event.heartThief))",
  ].forEach((token) => {
    assert.equal(archiveStats.includes(token), true, `missing heart thief normalization token: ${token}`)
  })

  assert.equal(profile.includes("getTopHeartThieves"), true, "profile must rank normalized heart thieves from archive stats")
  assert.equal(profile.includes("riskLabelByHeartThief[heartThief]"), true, "risk label must map the normalized dominant thief")
})

test("P4 ruleGuardService only emits reminders from sealed events and existing tradeReview results", async () => {
  const ruleGuard = await readFile(ruleGuardUrl, "utf8")

  ;[
    "getRuleGuardReminders",
    "listSealedOneThoughtEvents",
    "listRecentTradeReviews",
    "高频心贼提醒",
    "复发念提醒",
    "心还在动提醒",
    "贼胜提醒",
    "双输提醒",
    'type: "heart_thief"',
    'type: "recurring_thought"',
    'type: "still_moving"',
    'type: "zei_sheng"',
    'type: "shuang_shu"',
    'severity: "high"',
    'severity: "medium"',
    'source: "oneThoughtEvent"',
    'source: "tradeReview"',
    "createdAt: nowIso",
    "evidence:",
    "topHeartThief.count >= 5",
    "item.count >= 3",
    "stillMovingCount >= 2",
    "zeiShengCount >= 2",
    "shuangShuCount >= 2",
    "nowMinusHours(now, 24)",
    'review.heartJudgement === "zei_sheng"',
    'review.heartJudgement === "shuang_shu"',
    "近日「${topHeartThief.label}」出现 ${topHeartThief.count} 次。",
    "这念已经出现 ${recurringThought.count} 次。",
    "今天你已经两次承认“心还在动”。",
    "最近有 ${zeiShengCount} 笔是“贼胜”。",
    "最近双输偏多。",
    "frequent_heart_thief:${userId}:7d:${topHeartThief.label}",
    "recurring_thought:${userId}:7d:${recurringThought.sceneId}:${recurringThought.itemId}",
    "still_moving:${userId}:24h",
    "zei_sheng:${userId}:last10",
    "shuang_shu:${userId}:last10",
    "ruleGuardPriority",
    "return reminders.sort",
  ].forEach((token) => {
    assert.equal(ruleGuard.includes(token), true, `missing P4 rule guard token: ${token}`)
  })

  assert.equal(ruleGuard.includes("listOneThoughtEvents"), false, "rule guard must not count unsealed oneThoughtEvents")
  ;["calculateHeartJudgement", "judgeTradeHeart"].forEach((token) => {
    assert.equal(ruleGuard.includes(token), false, `rule guard recalculates P2 judgement: ${token}`)
  })
  forbiddenSourceTokens.forEach((token) => {
    assert.equal(ruleGuard.includes(token), false, `rule guard crosses P4 boundary: ${token}`)
  })
})

test("P4 reminders surface in archive museum and today sealed without blocking actions", async () => {
  const archivePage = await readFile(archivePageUrl, "utf8")
  const todaySealedPage = await readFile(todaySealedPageUrl, "utf8")
  const assessmentEntryPage = await readFile(assessmentEntryPageUrl, "utf8")
  const source = `${archivePage}\n${todaySealedPage}\n${assessmentEntryPage}`

  ;[
    "getHeartThiefProfile",
    "getRuleGuardReminders",
    "心贼画像",
    "规则守护",
    "不做强制拦截，只做提醒",
    "dominantHeartThief",
    "riskLabel",
    "reminders.slice(0, 3).map",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing P4 page token: ${token}`)
  })

  forbiddenSourceTokens.forEach((token) => {
    assert.equal(source.includes(token), false, `P4 page crosses boundary: ${token}`)
  })
})
