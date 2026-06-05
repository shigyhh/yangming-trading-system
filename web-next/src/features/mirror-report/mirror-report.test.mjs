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
    "心镜报告",
    "你的交易人格被市场照见",
    "一句话照见",
    "主人格",
    "副人格",
    "置信度",
    "风险雷达",
    "高危交易剧本",
    "七日处方",
    "训练营建议",
    "保存心镜报告",
    "进入活镜成长",
    "buildMirrorReport",
    "saveMirrorReport",
    "mirrorReportStorageKey",
    "reportId",
    "assessmentId",
    "sevenDayPrescription",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `assessment result page missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `mirror report contains forbidden phrase ${phrase}`)
  })
})
