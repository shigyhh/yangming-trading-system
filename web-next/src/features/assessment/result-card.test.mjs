import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const resultPageUrl = new URL("../../app/assessment-result/page.tsx", import.meta.url)
const previewReportUrl = new URL("./preview-report.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("assessment result page renders unified report card sections and preview mode", async () => {
  const resultPage = await readFile(resultPageUrl, "utf8")
  const previewReport = await readFile(previewReportUrl, "utf8")
  const source = `${resultPage}\n${previewReport}`

  ;[
    "buildPreviewAssessmentReport",
    "report.riskRadar",
    "RiskRadar",
    "report.emotionalTriggers",
    "report.trainingPrescription7Days",
    "report.campSuggestion",
    "报告卡预览",
    "AI 观心系统 · 报告卡",
    "心镜报告",
    "YangmingCharacterMark",
    "YangmingC16Mark",
    "YangmingZhaoSeal",
    "阳明照见心镜报告小标",
    "report-core-mark",
    "ZhaoCompletionSeal",
    "CompletionStepSeal",
    "心镜报告照字印章",
    "证字，心证证据，落回证据",
    "一句话照见 · 心证证据",
    "已照见",
    "已存档",
    "待事上练",
    "mirrorReportSaved",
    "YangmingGlyph",
    'icon="trade"',
    "保存心镜报告",
    "进入活镜成长",
    "本报告用于交易心理觉察，不构成投资建议",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })

  assert.equal(resultPage.includes("<strong>照</strong>"), false, "completion seal must not render font zhao")
  assert.equal(resultPage.includes("<span>照</span>"), false, "completion step seal must not render font zhao")
})
