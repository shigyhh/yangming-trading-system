import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./page.tsx", import.meta.url)
const apiClientUrl = new URL("../../features/data-binding/api-client.ts", import.meta.url)

test("living mirror center exposes cross-end records without advisory language", async () => {
  const page = await readFile(pageUrl, "utf8")
  const apiClient = await readFile(apiClientUrl, "utf8")

  ;[
    "心镜数据中枢",
    "三证互照",
    "unifiedConclusion",
    "proofLine",
    "nextCalibration",
    "DashboardSummary",
    "WeeklyMirrorSummary",
    "fetchDashboardSummary",
    "fetchDashboardWeeklySummary",
    "dashboard-summary",
    "dashboard-weekly",
    "已使用旧版汇总数据",
    "7 天",
    "30 天",
    "90 天",
    "真实复盘次数",
    "执行一致率",
    "高频错题",
    "第一念",
    "高频触发场景",
    "训练统计",
    "训练收藏",
    "本周活镜摘要",
    "nextWeekTrainingPlan",
    "dataGaps",
    "真实记录库",
    "活镜证据链 · 真实记录库",
    "crossEndStatusText",
    "crossEndStatusSteps",
    "盲练实验室",
    "助教工作台",
    "训练处方下发",
    "dispatchTrainingPrescriptionBinding",
    "training_prescription",
    "下发到小程序",
    "living_mirror_profile",
    "marketContext",
    "/mirror-archive",
    "/living-mirror-growth",
    "/admin/training-packs",
    "/admin/kline-segments",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `living mirror center missing ${token}`)
  })

  ;[
    "fetchDashboardSummary",
    "fetchDashboardWeeklySummary",
    "/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/dashboard-summary",
    "/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/dashboard-weekly",
  ].forEach((token) => {
    assert.equal(apiClient.includes(token), true, `data-binding client missing ${token}`)
  })

  ;["推荐买入", "推荐卖出", "必赚", "稳赚", "抄底", "逃顶", "喊单"].forEach((phrase) => {
    assert.equal(page.includes(phrase), false, `living mirror center contains forbidden phrase ${phrase}`)
  })
})
