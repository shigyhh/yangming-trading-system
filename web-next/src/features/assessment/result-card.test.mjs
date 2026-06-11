import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const resultPageUrl = new URL("../../app/assessment-result/page.tsx", import.meta.url)
const previewReportUrl = new URL("./preview-report.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("assessment result page renders six-act today seeing ritual instead of a report dashboard", async () => {
  const resultPage = await readFile(resultPageUrl, "utf8")
  const previewReport = await readFile(previewReportUrl, "utf8")
  const source = `${resultPage}\n${previewReport}`

  ;[
    "buildPreviewAssessmentReport",
    "YangmingZhaoSeal",
    "TODAY_ONE_THOUGHT_STORAGE_KEY",
    "todayOneThoughtSourceItems",
    "loadOneThoughtRecords",
    "buildOneThoughtGrowthProfile",
    "loadHeartProofs",
    "loadLatestHeartProof",
    "buildMirrorReport",
    "saveMirrorReport",
    "今日照见报告",
    "act-still-water",
    "act-one-thought",
    "act-heart-thief",
    "act-my-seeing",
    "act-nine-mirror",
    "act-seven-days",
    "act-departure",
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
    "照见 · 我的照见",
    "我今天看见：",
    "你最容易进入：",
    "它不是你。",
    "只是你最常进入的房间。",
    "今日开始。",
    "不与市场争。",
    "先与自己见。",
    "进入今日照见",
    "/assessment",
    "存入心镜档案",
    "/mirror-archive",
    "展开心镜长卷",
    "/mirror-scroll",
    "已照见",
    "致良知，不是消灭念头。",
    "是念起时，知道是谁在下单。",
    "thought-ripple",
    "thief-orbit",
    "thief-sink",
    "current-thief-rise",
    "current-thief-glow",
    "my-seeing-line",
    "mirror-silhouette",
    "seven-day-scroll",
    "zhao-seal-drop",
    "report-path-layers",
    "照见 · 修行 · 成长",
    "你今天先照见",
    "这不是系统结构图，是你今天能带走的一条路。",
    "本报告用于交易心理觉察，不构成投资建议",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })

  assert.equal(resultPage.includes("<strong>照</strong>"), false, "completion seal must not render font zhao")
  assert.equal(resultPage.includes("/cycle-mirror"), false, "report page must not send users to cycle mirror")
  assert.equal(resultPage.includes("data-assessment-id"), false, "report page must not expose assessment ids in the visual flow")
  assert.equal(resultPage.includes("data-report-id"), false, "report page must not expose report ids in the visual flow")
  assert.equal(resultPage.includes("data-storage-key"), false, "report page must not expose storage keys in the visual flow")
  assert.equal(resultPage.includes("assessment_id"), false, "report page must not show backend assessment field names")
  assert.equal(resultPage.includes("mirror_report_id"), false, "report page must not show backend report field names")
  assert.equal(resultPage.includes("Sprint"), false, "report page must not show sprint labels in the user flow")
  assert.equal(resultPage.includes("ReportCoreCard"), false, "today seeing report must not keep the right-side report card")
  assert.equal(resultPage.includes("RiskRadar"), false, "today seeing report must not render the old radar chart")
  assert.equal(resultPage.includes("主反应人格"), false, "today seeing report must not lead with personality labels")
  assert.equal(resultPage.includes("七日处方"), false, "today seeing report must rename prescription language")
  assert.equal(resultPage.includes("hiddenThought"), false, "hidden thoughts must never be rendered or imported")
})
