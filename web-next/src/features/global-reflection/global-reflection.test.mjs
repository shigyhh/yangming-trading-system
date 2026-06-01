import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("../../app/global-reflection/page.tsx", import.meta.url)
const apiClientUrl = new URL("./api-client.ts", import.meta.url)
const contentUrl = new URL("../../../../packages/content/global-reflection.js", import.meta.url)
const contractUrl = new URL("../../../../packages/contracts/global-reflection.d.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("global reflection MVP keeps anonymous voting and mirror copy in bounds", async () => {
  const page = await readFile(pageUrl, "utf8")
  const apiClient = await readFile(apiClientUrl, "utf8")
  const content = await readFile(contentUrl, "utf8")
  const contract = await readFile(contractUrl, "utf8")
  const source = `${page}\n${apiClient}\n${content}\n${contract}`

  ;[
    "GlobalReflectionVotePayload",
    "GlobalReflectionSummary",
    "fetchGlobalReflectionToday",
    "submitGlobalReflectionVote",
    "/api/v1/global-reflection/today",
    "/api/v1/global-reflection/vote",
    "今日一念投票",
    "匿名人格镜像",
    "全球修行长卷",
    "不是发帖",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})
