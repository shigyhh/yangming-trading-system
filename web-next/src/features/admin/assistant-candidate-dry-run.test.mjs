import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const dryRunUrl = new URL("./assistant-candidate-dry-run.ts", import.meta.url)
const adminPageUrl = new URL("../../app/admin/page.tsx", import.meta.url)
const forbiddenTradingPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]
const forbiddenDeliveryTokens = ["sendMessage", "sendTemplate", "subscribeMessage", "serviceAccountPush", "公众号群发", "模板消息"]
const forbiddenSensitiveTokens = ["openId", "unionId", "token", "验证码", "rawPhone", "phone:"]

test("assistant candidate dry-run builds a read-only handoff list without delivery or sensitive fields", async () => {
  const dryRun = await readFile(dryRunUrl, "utf8")
  const adminPage = await readFile(adminPageUrl, "utf8")
  const source = `${dryRun}\n${adminPage}`

  ;[
    "AssistantCandidateDryRunItem",
    "buildAssistantCandidateDryRun",
    "assistantCandidateDryRunComplianceText",
    "dryRun: true",
    "candidateReasonCodes",
    "phoneMasked",
    "助教承接候选 dry-run",
    "只读演练",
    "不发送提醒",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  forbiddenTradingPhrases.forEach((phrase) => {
    assert.equal(dryRun.includes(phrase), false, `dry-run source contains forbidden trading phrase: ${phrase}`)
  })

  forbiddenDeliveryTokens.forEach((token) => {
    assert.equal(dryRun.includes(token), false, `dry-run source contains delivery token: ${token}`)
  })

  forbiddenSensitiveTokens.forEach((token) => {
    assert.equal(dryRun.includes(token), false, `dry-run source exposes sensitive token: ${token}`)
  })
})
