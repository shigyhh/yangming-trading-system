import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const typesUrl = new URL("./mirrorReportTypes.ts", import.meta.url)
const engineUrl = new URL("./mirrorReportEngine.ts", import.meta.url)
const storageUrl = new URL("./mirrorReportStorage.ts", import.meta.url)
const resultPageUrl = new URL("../../app/assessment-result/page.tsx", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("mirror report exposes Sprint 9 structured report contract", async () => {
  const source = [
    await readFile(typesUrl, "utf8"),
    await readFile(engineUrl, "utf8"),
    await readFile(storageUrl, "utf8"),
  ].join("\n")

  ;[
    "export interface MirrorReport",
    "reportId",
    "assessmentId",
    "anonymousId",
    "primaryPersona",
    "secondaryPersona",
    "confidenceScore",
    "headline",
    "coreProblem",
    "highRiskScenario",
    "riskRadar",
    "sevenDayPrescription",
    "recommendedCamp",
    "ym_mirror_report_v1",
    "buildMirrorReport",
    "saveMirrorReport",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `mirror report module missing ${token}`)
  })
})

test("assessment result page renders and saves the mirror report", async () => {
  const source = await readFile(resultPageUrl, "utf8")

  ;[
    "今日照见报告",
    "静水照心",
    "一念显影",
    "心贼显影",
    "九镜显影",
    "未来七日，只修这一念",
    "启程",
    "你不是一种人格。",
    "你只是经常被某一种念头带走。",
    "最常带走你的那一念是：",
    "这一念里，最重的是：",
    "你最容易进入：",
    "它不是你。",
    "只是你最常进入的房间。",
    "致良知，不是消灭念头。",
    "是念起时，知道是谁在下单。",
    "存入心镜档案",
    "/mirror-archive",
    "展开心镜长卷",
    "/mirror-scroll",
    "进入今日一念",
    "/assessment",
    "TODAY_ONE_THOUGHT_STORAGE_KEY",
    "todayOneThoughtSourceItems",
    "buildMirrorReport",
    "saveMirrorReport",
    "mirrorReportStorageKey",
    "reportId",
    "assessmentId",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `assessment result page missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `mirror report contains forbidden phrase ${phrase}`)
  })

  assert.equal(source.includes("/cycle-mirror"), false, "mirror report page must not expose cycle mirror as a front route")
  assert.equal(source.includes("ReportCoreCard"), false, "mirror report page must not keep the dashboard report card")
  assert.equal(source.includes("RiskRadar"), false, "mirror report page must not show the old radar chart")
  assert.equal(source.includes("主反应人格"), false, "mirror report page must not frame the user as a personality type")
  assert.equal(source.includes("七日处方"), false, "mirror report page must use cultivation language")
})
