import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import test from "node:test"
import ts from "typescript"

const assistantSummaryUrl = new URL("./assistant-summary.ts", import.meta.url)
const evidenceEngineUrl = new URL("./evidence-engine.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("assistant summary builds handoff object and reserves API path", async () => {
  const { buildAssistantSummary, assistantSummaryApiPath, postAssistantSummaryLater } = await loadAssistantSummaryModule()

  const assistantSummary = buildAssistantSummary({
    userId: "",
    trainingDay: 1,
    completedDays: 1,
    checkinType: "ready",
    thoughtType: "fomo",
    thoughtLabel: "怕错过",
    reflectionText: "今天先停十秒。",
    completedAt: "2026-06-01T09:00:00.000Z",
  })

  assert.deepEqual(Object.keys(assistantSummary), [
    "userId",
    "trainingDay",
    "completedDays",
    "checkinType",
    "thoughtType",
    "thoughtLabel",
    "reflectionText",
    "affectedDimensions",
    "dailySealText",
    "nextActionText",
    "riskBoundary",
    "suggestedAssistantOpening",
  ])
  assert.equal(assistantSummary.userId, "")
  assert.equal(assistantSummary.trainingDay, 1)
  assert.equal(assistantSummary.completedDays, 1)
  assert.equal(assistantSummary.thoughtType, "fomo")
  assert.equal(assistantSummary.riskBoundary, "仅交易心理训练，不提供买卖建议")
  assert.equal(
    assistantSummary.suggestedAssistantOpening,
    "我看你今天照见的是怕错过。今天不用急着证明自己改变，只先练一个动作：计划外拉升前停十秒。",
  )
  assert.equal(assistantSummaryApiPath, "/api/assistant/summary")
  assert.deepEqual(await postAssistantSummaryLater(assistantSummary), {
    ok: false,
    skipped: true,
    endpoint: "/api/assistant/summary",
    reason: "assistant summary API is reserved for a later sprint",
  })
})

test("assistant summary source avoids forbidden investment language", async () => {
  const source = [
    await readFile(assistantSummaryUrl, "utf8"),
    await readFile(evidenceEngineUrl, "utf8"),
  ].join("\n")

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `assistant summary contains forbidden phrase ${phrase}`)
  })
})

async function loadAssistantSummaryModule() {
  const tempDir = await mkdtemp(join(tmpdir(), "assistant-summary-"))
  const evidenceSource = await readFile(evidenceEngineUrl, "utf8")
  const assistantSource = (await readFile(assistantSummaryUrl, "utf8"))
    .replace("\"./evidence-engine\"", "\"./evidence-engine.mjs\"")

  await writeFile(join(tempDir, "evidence-engine.mjs"), transpile(evidenceSource))
  await writeFile(join(tempDir, "assistant-summary.mjs"), transpile(assistantSource))

  return import(`${pathToFileURL(join(tempDir, "assistant-summary.mjs")).href}?t=${Date.now()}`)
}

function transpile(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
}
