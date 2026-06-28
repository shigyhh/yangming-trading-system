import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("../../app/admin/training-packs/page.tsx", import.meta.url)
const adminPageUrl = new URL("../../app/admin/page.tsx", import.meta.url)
const apiClientUrl = new URL("./training-pack-api.ts", import.meta.url)
const componentUrl = new URL("./training-pack-admin.tsx", import.meta.url)

const requiredApiTokens = [
  "fetchTrainingPacks",
  "createTrainingPack",
  "updateTrainingPack",
  "setTrainingPackEnabled",
  "/api/v1/training-packs?include_disabled=true",
  "/api/v1/training-packs",
  "/api/v1/training-packs/${encodeURIComponent(id)}",
  "/api/v1/training-packs/${encodeURIComponent(id)}/enabled",
]

const requiredPageTokens = [
  "TrainingPackAdmin",
  "训练包管理",
  "公共训练包配置",
  "查看训练包列表",
]

const requiredComponentTokens = [
  "加载训练包",
  "读取训练包失败",
  "暂无训练包",
  "新增训练包",
  "编辑",
  "停用",
  "启用",
  "保存中",
  "title",
  "errorType",
  "sceneTags",
  "trainingGoal",
  "expectedAction",
  "defaultPrompt",
  "trainingPrescription",
  "difficulty",
  "enabled",
  "sortOrder",
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
  "mockTrainingPack",
  "fakeTrainingPack",
]

test("training pack admin page uses existing admin route and P7-1A API", async () => {
  const [page, adminPage, apiClient, component] = await Promise.all([
    readFile(pageUrl, "utf8"),
    readFile(adminPageUrl, "utf8"),
    readFile(apiClientUrl, "utf8"),
    readFile(componentUrl, "utf8"),
  ])
  const source = `${page}\n${adminPage}\n${apiClient}\n${component}`

  requiredPageTokens.forEach((token) => {
    assert.equal(page.includes(token), true, `page missing token: ${token}`)
  })

  requiredApiTokens.forEach((token) => {
    assert.equal(apiClient.includes(token), true, `api client missing token: ${token}`)
  })

  requiredComponentTokens.forEach((token) => {
    assert.equal(component.includes(token), true, `component missing token: ${token}`)
  })

  assert.equal(adminPage.includes("/admin/training-packs"), true, "admin page should link to training pack management")
  assert.equal(apiClient.includes("NEXT_PUBLIC_YM_API_BASE_URL"), true, "api client should reuse existing public API base env")
  assert.equal(apiClient.includes("http://127.0.0.1:8787"), true, "api client should keep local server fallback")
  assert.equal(source.includes("miniprogram/"), false, "web admin page must not touch miniprogram")

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `source contains forbidden phrase: ${phrase}`)
  })
})
