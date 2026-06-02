import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const typeUrl = new URL("./heartProofTypes.ts", import.meta.url)
const engineUrl = new URL("./heartProofEngine.ts", import.meta.url)
const storageUrl = new URL("./heartProofStorage.ts", import.meta.url)
const cardUrl = new URL("./HeartProofCard.tsx", import.meta.url)
const pageUrl = new URL("../../app/practice-change/page.tsx", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("heart proof exposes the daily growth persistence contract", async () => {
  const source = [
    await readFile(typeUrl, "utf8"),
    await readFile(engineUrl, "utf8"),
    await readFile(storageUrl, "utf8"),
  ].join("\n")

  ;[
    "export interface HeartProof",
    "heartProofId",
    "sourceType",
    '"daily_growth"',
    "sourceId",
    "proofText",
    "nextActionText",
    "affectedDimensions",
    "ym_heart_proofs_v1",
    "ym_latest_heart_proof_v1",
    "saveHeartProof",
    "buildDailyGrowthHeartProof",
    "buildTradeReviewHeartProof",
    '"trade_review"',
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `heart proof module missing ${token}`)
  })
})

test("sprint 10 page creates and displays heart proof after daily growth", async () => {
  const source = [
    await readFile(cardUrl, "utf8"),
    await readFile(pageUrl, "utf8"),
  ].join("\n")

  ;[
    "HeartProofCard",
    "buildDailyGrowthHeartProof",
    "saveHeartProof",
    "loadLatestHeartProof",
    'sourceType: "daily_growth"',
    "sourceId: nextGrowth.growthRecordId",
    "heartProofId",
    "复制心证文字",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `sprint 10 heart proof integration missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `heart proof contains forbidden phrase ${phrase}`)
  })
})
