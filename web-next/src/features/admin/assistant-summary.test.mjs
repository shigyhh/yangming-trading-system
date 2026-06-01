import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const componentUrl = new URL("./feishu-sync-button.tsx", import.meta.url)
const dataUrl = new URL("./admin-data.ts", import.meta.url)
const detailPageUrl = new URL("../../app/admin/[id]/page.tsx", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("admin assistant summary and feishu sync stay in the data-binding MVP boundary", async () => {
  const component = await readFile(componentUrl, "utf8")
  const data = await readFile(dataUrl, "utf8")
  const page = await readFile(detailPageUrl, "utf8")
  const source = `${component}\n${data}\n${page}`

  ;[
    "AdminAssistantSummary",
    "AdminFeishuSync",
    "POST /api/v1/admin/users/:user_id/feishu-sync",
    "FeishuSyncButton",
    "飞书同步演练",
    "同步到飞书",
    "话术建议",
    "训练营建议",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})
