import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const componentUrl = new URL("./feishu-sync-button.tsx", import.meta.url)
const dataUrl = new URL("./admin-data.ts", import.meta.url)
const detailPageUrl = new URL("../../app/admin/[id]/page.tsx", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]
const forbiddenDefaultPageTokens = [
  "同步到飞书",
  "POST /api/v1/admin/users/:user_id/feishu-sync",
  "FEISHU_BOT_WEBHOOK",
]

test("admin assistant summary keeps feishu sync gated by default", async () => {
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
    "话术建议",
    "训练营建议",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  ;[
    'NEXT_PUBLIC_ENABLE_FEISHU_SYNC_DRY_RUN === "true"',
    "enableFeishuSync ?",
    "飞书同步预留",
    "当前未启用真实同步",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `missing gated default token: ${token}`)
  })

  forbiddenDefaultPageTokens.forEach((token) => {
    assert.equal(page.includes(token), false, `admin detail exposes default feishu sync token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})
