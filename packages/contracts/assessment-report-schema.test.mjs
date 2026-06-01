import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const schemaUrl = new URL("./assessment-report.schema.json", import.meta.url)
const exampleUrl = new URL("./assessment-report.example.json", import.meta.url)

const requiredTopLevelFields = [
  "reportId",
  "userId",
  "createdAt",
  "conclusion",
  "primaryPersonality",
  "secondaryPersonality",
  "riskRadar",
  "emotionalTriggers",
  "trainingPrescription7Days",
  "campSuggestion",
  "complianceNotice",
  "metadata",
]

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("assessment report schema includes the required shared fields", async () => {
  const schema = JSON.parse(await readFile(schemaUrl, "utf8"))

  requiredTopLevelFields.forEach((field) => {
    assert.ok(schema.required.includes(field), `schema missing required field: ${field}`)
  })
  assert.equal(schema.properties.complianceNotice.const, "本报告用于交易心理觉察，不构成投资建议")
  assert.equal(schema.properties.trainingPrescription7Days.minItems, 7)
  assert.equal(schema.properties.trainingPrescription7Days.maxItems, 7)
})

test("assessment report example follows the minimum contract and compliance boundary", async () => {
  const report = JSON.parse(await readFile(exampleUrl, "utf8"))

  requiredTopLevelFields.forEach((field) => {
    assert.ok(report[field], `example missing field: ${field}`)
  })

  assert.equal(report.schemaVersion, "assessment_report_v1")
  assert.equal(report.complianceNotice, "本报告用于交易心理觉察，不构成投资建议")
  assert.equal(report.trainingPrescription7Days.length, 7)
  assert.ok(report.riskRadar.every((item) => item.value >= 0 && item.value <= 100))
  assert.ok(report.emotionalTriggers.length >= 1)
  assert.ok(report.primaryPersonality.label.length > 0)
  assert.ok(report.secondaryPersonality.label.length > 0)

  const searchableText = JSON.stringify(report)
  forbiddenPhrases.forEach((phrase) => {
    assert.equal(searchableText.includes(phrase), false, `example contains forbidden phrase: ${phrase}`)
  })
})
