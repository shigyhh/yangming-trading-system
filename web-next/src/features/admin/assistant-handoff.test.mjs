import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const componentUrl = new URL("./assistant-handoff-form.tsx", import.meta.url)
const dataUrl = new URL("./admin-data.ts", import.meta.url)
const detailPageUrl = new URL("../../app/admin/[id]/page.tsx", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("admin assistant handoff form writes to the server API without trading advice copy", async () => {
  const component = await readFile(componentUrl, "utf8")
  const data = await readFile(dataUrl, "utf8")
  const page = await readFile(detailPageUrl, "utf8")
  const source = `${component}\n${data}\n${page}`

  ;[
    "POST /api/v1/admin/users/:user_id/assistant-handoff",
    "AssistantHandoffForm",
    "承接状态",
    "负责人",
    "承接备注",
    "待复盘",
    "已完成",
    "K 线心念记录",
    "复测雷达明细",
    "保存承接记录",
    "觉察、训练、复盘",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})
