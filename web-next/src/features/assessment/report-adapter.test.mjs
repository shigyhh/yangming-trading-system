import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const reportUrl = new URL("./report.ts", import.meta.url)
const apiClientUrl = new URL("../data-binding/api-client.ts", import.meta.url)
const contractUrl = new URL("../../../../packages/contracts/assessment-report.schema.json", import.meta.url)

test("web report generation uses shared personality engine and assessment_report_v1", async () => {
  const reportSource = await readFile(reportUrl, "utf8")
  const apiClientSource = await readFile(apiClientUrl, "utf8")
  const contract = JSON.parse(await readFile(contractUrl, "utf8"))
  const source = `${reportSource}\n${apiClientSource}`

  ;[
    "packages/personality/index.js",
    "buildAssessmentReport",
    "UnifiedAssessmentReport",
    "userId: report.userId || user.userId",
    "metadata",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  ;["reportId", "userId", "createdAt", "metadata"].forEach((field) => {
    assert.equal(contract.required.includes(field), true, `schema should require ${field}`)
  })
})
