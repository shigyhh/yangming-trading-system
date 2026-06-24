import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const packageUrl = new URL("../../../package.json", import.meta.url)
const listPageUrl = new URL("../../app/admin/assistant-candidates/page.tsx", import.meta.url)
const exportActionsUrl = new URL("./assistant-candidate-export-actions.tsx", import.meta.url)
const adminPageUrl = new URL("../../app/admin/page.tsx", import.meta.url)

const requiredListTokens = [
  "getAdminUsersForPage",
  "buildAssistantCandidateDryRun",
  "exportAssistantCandidatesAsJson",
  "exportAssistantCandidatesAsCsv",
  "AssistantCandidateExportActions",
  "助教候选列表",
  "候选总数",
  "数据源",
  "合规说明",
  "复制 JSON",
  "复制 CSV",
  "优先级",
  "phoneMasked",
  "承接状态",
  "跟进重点",
  "候选原因",
  "下一步",
  "reason codes",
  "查看详情",
  "href={`/admin/${candidate.userId}`}",
]

const forbiddenSensitiveTokens = ["raw phone", "phone:", "phone}", "openId", "unionId", "token", "验证码"]
const forbiddenDeliveryTokens = ["send", "push", "webhook", "template", "serviceAccount"]
const forbiddenTradingPhrases = ["买入", "卖出", "荐股", "喊单", "预测", "收益", "必赚", "信号", "抄底", "逃顶"]

test("assistant candidate list page stays read-only and export-only", async () => {
  const packageJson = await readFile(packageUrl, "utf8")
  const listPage = await readFile(listPageUrl, "utf8")
  const exportActions = await readFile(exportActionsUrl, "utf8")
  const adminPage = await readFile(adminPageUrl, "utf8")
  const renderedSource = `${listPage}\n${exportActions}`

  assert.equal(packageJson.includes("assistant-candidate-list.test.mjs"), true)
  assert.equal(adminPage.includes("/admin/assistant-candidates"), true)
  assert.equal(adminPage.includes("查看完整候选列表"), true)

  requiredListTokens.forEach((token) => {
    assert.equal(renderedSource.includes(token), true, `missing list token: ${token}`)
  })

  forbiddenSensitiveTokens.forEach((token) => {
    assert.equal(renderedSource.includes(token), false, `list page exposes sensitive token: ${token}`)
  })

  forbiddenDeliveryTokens.forEach((token) => {
    assert.equal(renderedSource.includes(token), false, `list page contains delivery token: ${token}`)
  })

  forbiddenTradingPhrases.forEach((phrase) => {
    assert.equal(renderedSource.includes(phrase), false, `list page contains forbidden trading phrase: ${phrase}`)
  })
})
