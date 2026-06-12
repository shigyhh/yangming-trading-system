import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const tradeReviewPageUrl = new URL("../../app/trade-review/page.tsx", import.meta.url)
const reviewCompatibilityUrl = new URL("../../app/review/page.tsx", import.meta.url)
const topNavUrl = new URL("../../components/home/top-nav.tsx", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶", "行情判断", "买点", "卖点"]

test("official trade review route renders the one-thought P2 review with kline context", async () => {
  const page = await readFile(tradeReviewPageUrl, "utf8")

  ;[
    "真实复盘",
    "交易之后，",
    "回到当时那一念。",
    "getPendingReviewEvents",
    "linkedOneThoughtEventId",
    "selectedEvent",
    "reflectionFinal: selectedEvent.reflectionFinal",
    "盘证",
    "把这笔交易放回当时的盘面。",
    "自动识别盘面",
    "盘面识别结果",
    "盘证用于事后复盘，不构成交易建议。",
    "盘证自动识别暂未开启。",
    "K线数据不足，已切换为手动盘证。",
    "盘证识别失败，已切换为手动盘证。",
    "marketContext",
    "editedByUser",
    "heartJudgementLabels[previewJudgement]",
    "写入真实复盘",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `missing official trade-review token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(page.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})

test("/review remains a compatibility redirect to /trade-review and preserves query", async () => {
  const page = await readFile(reviewCompatibilityUrl, "utf8")

  assert.match(page, /redirect\(suffix \? `\/trade-review\?\$\{suffix\}` : "\/trade-review"\)/)
  assert.match(page, /linkedOneThoughtEventId|URLSearchParams|searchParams/)
  assert.doesNotMatch(page, /ReviewPageContent|getPendingReviewEvents|createTradeReview/)
})

test("home navigation points true review entry to /trade-review", async () => {
  const topNav = await readFile(topNavUrl, "utf8")

  assert.match(topNav, /\{ label: "真实复盘", href: "\/trade-review" \}/)
  assert.doesNotMatch(topNav, /\{ label: "真实复盘", href: "\/review" \}/)
  assert.match(topNav, /pathname === "\/review" \|\| pathname === "\/trade-review"/)
})
