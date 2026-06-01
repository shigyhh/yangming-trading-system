import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const modelUrl = new URL("./practice-change.ts", import.meta.url)
const pageUrl = new URL("../../app/practice-change/page.tsx", import.meta.url)
const requiredModelTokens = [
  "KLineTrainingRecord",
  "DailyPracticeEntry",
  "PracticeRiskRadarSnapshot",
  "PracticeCheckInStatus",
  "checkIn",
  "sceneKey",
  "reactionKey",
  "baselineReport",
  "retestReport",
  "compareRiskRadarSnapshots",
  "reconcilePracticeChangeWithReport",
]
const requiredPageTokens = [
  "每日修行文字记录",
  "今日签到",
  "K 线心念训练记录",
  "价格快速拉升",
  "今天哪一念最容易带走你",
  "变化证据",
  "buildPreviewAssessmentReport",
  "复测风险雷达",
  "cultivationText",
  "klineRecord",
  "clearAssessmentDraft",
]
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("practice change model exposes the minimum training and retest structures", async () => {
  const source = await readFile(modelUrl, "utf8")

  requiredModelTokens.forEach((token) => {
    assert.equal(source.includes(token), true, `practice-change.ts missing ${token}`)
  })
})

test("practice change page supports daily text, kline records and retest comparison", async () => {
  const source = await readFile(pageUrl, "utf8")

  requiredPageTokens.forEach((token) => {
    assert.equal(source.includes(token), true, `practice-change page missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `practice-change page contains forbidden phrase ${phrase}`)
  })
})
