import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const archivePageUrl = new URL("../../app/mind-archive/page.tsx", import.meta.url)
const dangAnGuanArchiveUrl = new URL("../../components/archive/DangAnGuanArchive.tsx", import.meta.url)
const mindScrollPageUrl = new URL("../../app/mind-scroll/page.tsx", import.meta.url)
const mindScrollServiceUrl = new URL("./mindScrollService.ts", import.meta.url)
const zhixingScrollPageUrl = new URL("../../app/zhixing-scroll/page.tsx", import.meta.url)
const zhixingScrollServiceUrl = new URL("./zhixingScrollService.ts", import.meta.url)

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

test("P3 archive museum is the private entry and reads only archive/review services", async () => {
  const archivePage = await readFile(archivePageUrl, "utf8")
  const dangAnGuanArchive = await readFile(dangAnGuanArchiveUrl, "utf8")
  const archiveSource = `${archivePage}\n${dangAnGuanArchive}`

  ;[
    "DangAnGuanArchive",
    "getMindArchiveStats",
    "getRecentSealedThoughtEvents",
    "listRecentTradeReviews",
    "档案馆",
    "这里收藏你已照见、已落印、已复盘的一念。",
    "当前卷：一念档案",
    "今日所照",
    "近日最强心贼",
    "最近一念",
    "一念档案摘要",
    "心镜长卷",
    "看心怎么动。",
    "知行长卷",
    "看照见后有没有做到。",
    "真实复盘入口",
    "复发念",
    "规则守护",
    "/mind-scroll",
    "/zhixing-scroll",
    "/trade-review?linkedOneThoughtEventId=",
  ].forEach((token) => {
    assert.equal(archiveSource.includes(token), true, `missing P3 archive token: ${token}`)
  })

  assert.doesNotMatch(archiveSource, /心镜档案/)
  forbiddenSourceTokens.forEach((token) => {
    assert.equal(archiveSource.includes(token), false, `archive page crosses P3 boundary: ${token}`)
  })
})

test("P3 mind scroll only displays sealed oneThoughtEvent fields and reflectionFinal", async () => {
  const mindScrollPage = await readFile(mindScrollPageUrl, "utf8")
  const mindScrollService = await readFile(mindScrollServiceUrl, "utf8")
  const source = `${mindScrollPage}\n${mindScrollService}`

  ;[
    "getMindScrollItems",
    "listSealedOneThoughtEvents",
    "这里不记行情，只记你被哪一念牵走。",
    "最近心怎么动",
    "哪个心贼常来",
    "哪些念头反复出现",
    "哪些照回之后停住了",
    "哪些照回之后还是交易了",
    "tradeMoment",
    "os",
    "reflectionFinal",
    "heartThief",
    "heartEvidence",
    "practiceText",
    "userReaction",
    "actualAction",
    "reviewStatus",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing P3 mind scroll token: ${token}`)
  })

  forbiddenSourceTokens.forEach((token) => {
    assert.equal(source.includes(token), false, `mind scroll crosses P3 boundary: ${token}`)
  })
})

test("P3 zhixing scroll merges oneThoughtEvent and tradeReview without new judgement", async () => {
  const zhixingPage = await readFile(zhixingScrollPageUrl, "utf8")
  const zhixingService = await readFile(zhixingScrollServiceUrl, "utf8")
  const source = `${zhixingPage}\n${zhixingService}`

  ;[
    "getZhixingScrollItems",
    "listSealedOneThoughtEvents",
    "listTradeReviewsByOneThoughtEvent",
    "oneThoughtEventId",
    "tradeReviewId",
    "reflectionFinal",
    "symbol",
    "pnl",
    "followedPlan",
    "brokeRule",
    "heartJudgement",
    "zhixingState",
    'return "止念成行"',
    'return "心动未复"',
    'return "正胜"',
    'return "贼胜"',
    'return "正亏"',
    'return "双输"',
    'return "待记录"',
    "这一次，照见之后你停住了。",
    "心已经动了，也交易了，但还没有回头看。",
    "钱赚了，但这笔是心贼赢了。",
    "钱亏了，但心没有失守。",
    "钱也亏了，心也被带走了。",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing P3 zhixing token: ${token}`)
  })

  ;["calculateHeartJudgement", "judgeTradeHeart"].forEach((token) => {
    assert.equal(source.includes(token), false, `zhixing scroll recalculates P2 judgement: ${token}`)
  })

  forbiddenSourceTokens.forEach((token) => {
    assert.equal(source.includes(token), false, `zhixing scroll crosses P3 boundary: ${token}`)
  })
})
