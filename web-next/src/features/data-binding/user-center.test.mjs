import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const apiClientUrl = new URL("./api-client.ts", import.meta.url)
const archivePageUrl = new URL("../../app/observing-archive/page.tsx", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("user center reads data binding summary with local fallback", async () => {
  const apiClient = await readFile(apiClientUrl, "utf8")
  const archivePage = await readFile(archivePageUrl, "utf8")

  ;[
    "fetchDataBindingSummary",
    "DataBindingSummaryResponse",
    "dataBindingLastSyncAt",
    "Server API 已绑定",
    "用户 ID",
    "邀请码来源",
    "测评报告",
    "助教承接",
    "分享卡片",
    "飞书同步",
    "K 线心念记录",
    "复测雷达",
    "测评、训练、复测、邀请码、助教摘要与分享卡",
  ].forEach((token) => {
    assert.equal(`${apiClient}\n${archivePage}`.includes(token), true, `missing token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(archivePage.includes(phrase), false, `user center contains forbidden phrase ${phrase}`)
  })
})
