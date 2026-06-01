import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("../../app/trade-review/page.tsx", import.meta.url)
const featureUrl = new URL("./trade-review.ts", import.meta.url)
const apiClientUrl = new URL("../data-binding/api-client.ts", import.meta.url)
const archivePageUrl = new URL("../../app/observing-archive/page.tsx", import.meta.url)
const contractUrl = new URL("../../../../packages/contracts/data-binding.d.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("trade review MVP writes screenshots and three reflections into living mirror binding", async () => {
  const page = await readFile(pageUrl, "utf8")
  const feature = await readFile(featureUrl, "utf8")
  const apiClient = await readFile(apiClientUrl, "utf8")
  const archivePage = await readFile(archivePageUrl, "utf8")
  const contract = await readFile(contractUrl, "utf8")
  const source = `${page}\n${feature}\n${apiClient}\n${archivePage}\n${contract}`

  ;[
    "真实交易复盘 MVP",
    "上传交易截图 / K 线截图 / 交易记录截图",
    "为什么进入？",
    "为什么离开？",
    "当时最大的念头是什么？",
    "心镜映射预览",
    "写入活镜成长",
    "syncTradeReviewBinding",
    "DataBindingTradeReviewPayload",
    "POST /api/v1/data-binding/users/:user_id/trade-reviews",
    "inferTradeReviewMirror",
    "TradeReviewDraft",
    "真实交易复盘",
    "/trade-review",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  ;["怕错过", "想翻本", "不认错", "怕回吐", "大家都在说"].forEach((token) => {
    assert.equal(feature.includes(token), true, `missing mapping token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})

