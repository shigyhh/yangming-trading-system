import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

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
    "baselineScores",
    "fomo",
    "chase",
    "仅交易心理训练，不提供买卖建议",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `evidence-engine.ts missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `evidence engine contains forbidden phrase ${phrase}`)
  })
})

test("evidence engine maps each thought into daily evidence", async () => {
  const { buildTrainingEvidence, buildAssistantSummaryPreview } = await loadEvidenceEngine()
  const baselineScores = {
    emptyPositionAnxiety: 40,
    chaseImpulse: 80,
    stopLossExecution: 100,
    planChange: 0,
    knowingDoing: 42,
  }

  const cases = [
    {
      thoughtType: "fomo",
      affectedDimensions: ["追涨冲动", "临盘改计划"],
      dailySealText: "今天你照见的是怕错过。训练不是消灭机会，而是在机会面前先回到计划。",
      nextActionText: "下一次看到计划外拉升，先停十秒，再写入场条件。",
    },
    {
      thoughtType: "chase",
      affectedDimensions: ["追涨冲动", "知行合一"],
      dailySealText: "今天你照见的是想追进去。真正的知行合一，是手比念头慢半拍。",
      nextActionText: "下一次手想按下去时，先复核一条原计划条件。",
    },
    {
      thoughtType: "wait_pullback",
      affectedDimensions: ["空仓焦虑", "临盘改计划"],
      dailySealText: "今天你照见的是想等回撤。等待不是逃避，等待必须有条件。",
      nextActionText: "下一次等待前，写下具体触发条件。",
    },
    {
      thoughtType: "ask_others",
      affectedDimensions: ["独立判断", "知行合一"],
      dailySealText: "今天你照见的是想问别人。外部声音不能替你完成判断。",
      nextActionText: "下一次问别人前，先写下自己的方向和理由。",
    },
    {
      thoughtType: "abandon_plan",
      affectedDimensions: ["知行合一", "临盘改计划"],
      dailySealText: "今天你照见的是想放弃计划。计划是情绪来临前的锚。",
      nextActionText: "下一次想改计划时，先写下是条件变化还是情绪变化。",
    },
  ]

  for (const item of cases) {
    const result = buildTrainingEvidence({
      trainingDay: 1,
      checkinType: "ready",
      thoughtType: item.thoughtType,
      thoughtLabel: item.thoughtType,
      reflectionText: "今天先看见这一念。",
      completedAt: "2026-06-01T09:00:00.000Z",
      baselineScores,
    })

    assert.deepEqual(result.affectedDimensions, item.affectedDimensions)
    assert.equal(result.dailySealText, item.dailySealText)
    assert.equal(result.nextActionText, item.nextActionText)
    assert.equal(result.evidenceItems.some((line) => line.includes("首测基线：知行合一 42")), true)
  }

  assert.deepEqual(
    buildTrainingEvidence({ thoughtType: "fear_missing" }).affectedDimensions,
    ["追涨冲动", "临盘改计划"],
  )
  assert.equal(buildAssistantSummaryPreview({ thoughtType: "want_chase" }).thoughtType, "chase")
  assert.equal(
    buildAssistantSummaryPreview({ thoughtType: "chase" }).suggestedAssistantOpening,
    "你今天记录的是想追进去。下一次先别管机会真假，先看它是否在原计划里。",
  )
})

async function loadEvidenceEngine() {
  const source = await readFile(sourceUrl, "utf8")
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  return import(moduleUrl)
}
