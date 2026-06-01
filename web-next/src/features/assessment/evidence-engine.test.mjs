import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const sourceUrl = new URL("./evidence-engine.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("evidence engine keeps Sprint 10 completion evidence and assistant preview structure", async () => {
  const source = await readFile(sourceUrl, "utf8")

  ;[
    "buildTrainingEvidence",
    "buildAssistantSummaryPreview",
    "buildTodayProofText",
    "affectedDimensions",
    "dailySealText",
    "nextActionText",
    "suggestedAssistantOpening",
    "riskBoundary",
    "仅交易心理训练，不提供买卖建议",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `evidence-engine.ts missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `evidence engine contains forbidden phrase ${phrase}`)
  })
})
