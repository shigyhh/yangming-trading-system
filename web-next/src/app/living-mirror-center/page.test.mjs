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
    "知行提醒分析",
    "执行反馈",
    "提醒总数",
    "触发类型分布",
    "用户响应分布",
    "执行计划覆盖",
    "样本不足",
    "还没有足够的知行提醒样本",
    "interventions",
    "executionPlans",
    "byTriggerType",
    "byUserResponse",
    "byErrorType",
    "responseSummary",
    "followedPlanRate",
    "coverage",
    "topMissingErrorTypes",
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

  const forbiddenPhrases = [
    ["买", "入"],
    ["卖", "出"],
    ["目标", "价"],
    ["止", "盈"],
    ["止", "损建议"],
    ["明日", "看涨"],
    ["明日", "看跌"],
    ["预测", "涨跌"],
    ["买", "入信号"],
    ["卖", "出信号"],
    ["收益", "提升"],
    ["胜率", "提升"],
    ["推荐", "买", "入"],
    ["推荐", "卖", "出"],
    ["必", "赚"],
    ["稳", "赚"],
    ["抄", "底"],
    ["逃", "顶"],
    ["喊", "单"],
  ].map((parts) => parts.join(""))

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(page.includes(phrase), false, `living mirror center contains forbidden phrase ${phrase}`)
  })
})
