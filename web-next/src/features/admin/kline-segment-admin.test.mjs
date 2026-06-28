import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("../../app/admin/kline-segments/page.tsx", import.meta.url)
const adminPageUrl = new URL("../../app/admin/page.tsx", import.meta.url)
const apiClientUrl = new URL("./kline-segment-api.ts", import.meta.url)
const componentUrl = new URL("./kline-segment-admin.tsx", import.meta.url)

const requiredApiTokens = [
  "fetchKlineSegments",
  "fetchKlineSegment",
  "createKlineSegment",
  "updateKlineSegment",
  "setKlineSegmentEnabled",
  "/api/v1/kline-segments",
  "/api/v1/kline-segments/${encodeURIComponent(id)}",
  "/api/v1/kline-segments/${encodeURIComponent(id)}/enabled",
  "NEXT_PUBLIC_YM_KLINE_API_BASE_URL",
  "NEXT_PUBLIC_YM_API_BASE_URL",
  "http://127.0.0.1:8787",
]

const requiredPageTokens = [
  "KlineSegmentAdmin",
  "K线片段标注",
  "片段管理",
  "kline-service KlineSegment API",
]

const requiredComponentTokens = [
  "加载K线片段",
  "读取K线片段失败",
  "暂无K线片段",
  "新增片段",
  "编辑",
  "停用",
  "启用",
  "保存中",
  "symbol",
  "period",
  "errorType",
  "sceneTag",
  "trainingPackId",
  "trainingPackIds",
  "sceneTags",
  "errorTypes",
  "difficulty",
  "note",
  "includeDisabled",
  "fetchTrainingPacks",
]

const forbiddenPhrases = [
  "推荐买入",
  "推荐卖出",
  "荐股",
  "喊单",
  "预测行情",
  "收益保证",
  "必赚",
  "稳赚",
  "抄底",
  "逃顶",
  "mockKlineSegment",
  "fakeKlineSegment",
  "samplingResult",
  "miniprogram/",
]

test("kline segment admin page uses existing admin route and external segment API", async () => {
  const [page, adminPage, apiClient, component] = await Promise.all([
    readFile(pageUrl, "utf8"),
    readFile(adminPageUrl, "utf8"),
    readFile(apiClientUrl, "utf8"),
    readFile(componentUrl, "utf8"),
  ])
  const source = `${page}\n${apiClient}\n${component}`

  requiredPageTokens.forEach((token) => {
    assert.equal(page.includes(token), true, `page missing token: ${token}`)
  })

  requiredApiTokens.forEach((token) => {
    assert.equal(apiClient.includes(token), true, `api client missing token: ${token}`)
  })

  requiredComponentTokens.forEach((token) => {
    assert.equal(component.includes(token), true, `component missing token: ${token}`)
  })

  assert.equal(adminPage.includes("/admin/kline-segments"), true, "admin page should link to kline segment management")
  assert.equal(source.includes("real-review server KlineSegment API"), false, "web page must not introduce a duplicate real-review segment API")

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `source contains forbidden phrase: ${phrase}`)
  })
})
