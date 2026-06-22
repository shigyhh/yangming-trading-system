import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const dryRunUrl = new URL("./assistant-candidate-dry-run.ts", import.meta.url)
const exportUrl = new URL("./assistant-candidate-export.ts", import.meta.url)
const exportActionsUrl = new URL("./assistant-candidate-export-actions.tsx", import.meta.url)
const adminPageUrl = new URL("../../app/admin/page.tsx", import.meta.url)

const csvHeaders = [
  "userId",
  "phoneMasked",
  "priority",
  "assistantStatus",
  "focus",
  "reasonText",
  "suggestedNextStep",
  "candidateReasonCodes",
]

const forbiddenSensitiveTokens = ["raw phone", "phone:", "token", "openId", "unionId", "验证码"]
const forbiddenDeliveryTokens = ["send", "push", "webhook", "template", "serviceAccount"]
const forbiddenTradingPhrases = ["买入", "卖出", "荐股", "喊单", "预测", "收益", "必赚", "信号", "抄底", "逃顶"]

test("assistant candidate export exposes read-only JSON and CSV from dry-run result", async () => {
  const dryRun = await readFile(dryRunUrl, "utf8")
  const exporter = await readFile(exportUrl, "utf8")
  const exportActions = await readFile(exportActionsUrl, "utf8")
  const adminPage = await readFile(adminPageUrl, "utf8")
  const source = `${dryRun}\n${exporter}\n${exportActions}\n${adminPage}`

  ;[
    "buildAssistantCandidateDryRun",
    "exportAssistantCandidatesAsJson",
    "exportAssistantCandidatesAsCsv",
    "AssistantCandidateDryRunResult",
    "JSON.stringify",
    "candidateDryRun",
    "复制 JSON",
    "复制 CSV",
    "navigator.clipboard",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing export token: ${token}`)
  })

  csvHeaders.forEach((header) => {
    assert.equal(exporter.includes(header), true, `missing CSV header: ${header}`)
  })

  forbiddenSensitiveTokens.forEach((token) => {
    assert.equal(exporter.includes(token), false, `exporter exposes sensitive token: ${token}`)
  })

  forbiddenDeliveryTokens.forEach((token) => {
    assert.equal(exporter.includes(token), false, `exporter contains delivery token: ${token}`)
  })

  forbiddenTradingPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `export flow contains forbidden trading phrase: ${phrase}`)
  })
})
