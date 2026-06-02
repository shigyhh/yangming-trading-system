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

test("assistant growth handoff reads growth profile and behavior loop", async () => {
  const {
    buildAssistantHandoffFromGrowthProfile,
    postAssistantGrowthHandoffLater,
    assistantHandoffUpdateApiPath,
  } = await loadAssistantSummaryModule()
  const growthProfile = {
    growthProfileId: "growth_profile_1",
    growth_profile_id: "growth_profile_1",
    highFrequencyThoughts: [{ label: "怕错过", thoughtType: "fomo", count: 2, weight: 2, evidenceIds: [] }],
    trainingContinuity: {
      completedGrowthDays: 2,
      trainingConsistencyScore: 29,
    },
    heartProofCount: 1,
    tradeReviewCount: 0,
    behaviorLoopCount: 1,
    retestChangeCount: 0,
    mirrorLifeStage: {
      stage: "seeing_thought",
      label: "见念期",
      description: "开始看见一念。",
    },
    affectedDimensions: [{ label: "追涨冲动" }, { label: "临盘改计划" }],
    nextCycleFocus: {
      title: "下一轮重点：计划外拉升前停十秒",
      reason: "高频一念已经出现。",
      nextActionText: "计划外拉升前停十秒。",
      relatedDimensions: ["追涨冲动", "临盘改计划"],
    },
    dataGaps: [{ type: "missing_trade_review" }],
  }
  const behaviorLoop = {
    behaviorLoopId: "behavior_loop_1",
    thought: "想改计划",
    repeatCount: 2,
    loopBreakAction: "只在事前写明的条件触发时修改计划",
    affectedDimensions: ["临盘改计划"],
  }
  const latestHeartProof = {
    heartProofId: "heart_proof_1",
    thoughtType: "fomo",
    thoughtLabel: "怕错过",
    proofText: "今天看见怕错过先于规则出现。",
    nextActionText: "计划外拉升前停十秒。",
    createdAt: "2026-06-01T09:00:00.000Z",
  }

  const handoff = buildAssistantHandoffFromGrowthProfile({
    anonymousId: "anon_1",
    primaryPersona: "追涨型",
    secondaryPersona: "从众型",
    latestHeartProof,
    growthProfile,
    behaviorLoop,
    createdAt: "2026-06-01T10:00:00.000Z",
  })

  assert.equal(handoff.growthProfileId, "growth_profile_1")
  assert.equal(handoff.mirrorLifeStage.label, "见念期")
  assert.equal(handoff.completedGrowthDays, 2)
  assert.equal(handoff.trainingConsistencyScore, 29)
  assert.equal(handoff.heartProofCount, 1)
  assert.equal(handoff.tradeReviewCount, 0)
  assert.equal(handoff.topThought, "怕错过")
  assert.equal(handoff.latestHeartProof.heartProofId, "heart_proof_1")
  assert.equal(handoff.topBehaviorLoop.behaviorLoopId, "behavior_loop_1")
  assert.deepEqual(handoff.affectedDimensions, ["追涨冲动", "临盘改计划"])
  assert.equal(handoff.nextCycleFocus.nextActionText, "计划外拉升前停十秒。")
  assert.equal(
    handoff.suggestedOpening,
    "你现在已经有今日修行记录，但还缺少真实交易复盘。下一步可以先复盘一笔最近的交易，只看当时是谁在下单。",
  )
  ;["保证收益", "稳赚", "推荐股票", "带单", "买入卖出建议", "预测行情"].forEach((phrase) => {
    assert.equal(handoff.forbiddenPhrases.includes(phrase), true)
  })
  assert.equal(handoff.complianceText.includes("不预测行情"), true)
  assert.equal(assistantHandoffUpdateApiPath, "/api/assistant-handoff/update")
  assert.deepEqual(await postAssistantGrowthHandoffLater(handoff), {
    ok: false,
    skipped: true,
    endpoint: "/api/assistant-handoff/update",
    reason: "assistant handoff update API is reserved for a later sprint",
  })
})

test("assistant summary source avoids forbidden investment language", async () => {
  const source = [
    await readFile(assistantSummaryUrl, "utf8"),
    await readFile(evidenceEngineUrl, "utf8"),
  ].join("\n")
  const sourceWithoutForbiddenPhraseList = source.replace(
    /export const assistantHandoffForbiddenPhrases = \[[\s\S]*?\]\n/,
    "",
  )

  ;[
    "assistantGrowthHandoffStorageKey",
    "assistantHandoffUpdateApiPath",
    "buildAssistantHandoffFromGrowthProfile",
    "AssistantGrowthHandoffSummary",
    "growthProfileId",
    "mirrorLifeStage",
    "completedGrowthDays",
    "trainingConsistencyScore",
    "heartProofCount",
    "tradeReviewCount",
    "topThought",
    "latestHeartProof",
    "topBehaviorLoop",
    "affectedDimensions",
    "behaviorLoopId",
    "nextCycleFocus",
    "suggestedOpening",
    "forbiddenPhrases",
    "complianceText",
    "phoneMasked",
    "postAssistantGrowthHandoffLater",
    "保证收益",
    "稳赚",
    "推荐股票",
    "带单",
    "买入卖出建议",
    "预测行情",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `assistant growth handoff missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(sourceWithoutForbiddenPhraseList.includes(phrase), false, `assistant summary contains forbidden phrase ${phrase}`)
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
