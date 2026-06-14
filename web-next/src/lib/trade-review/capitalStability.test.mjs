import assert from "node:assert/strict"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const capitalStabilityUrl = new URL("./capitalStability.ts", import.meta.url)

function transpileTs(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  }).outputText
}

async function importCapitalStabilityModule() {
  const dir = path.join(tmpdir(), "yangming-capital-stability-tests")
  await mkdir(dir, { recursive: true })
  const source = await readFile(capitalStabilityUrl, "utf8")
  await writeFile(path.join(dir, "capitalStability.mjs"), transpileTs(source), "utf8")
  return import(`file://${path.join(dir, `capitalStability.mjs?${Date.now()}`)}`)
}

function buildReview(overrides = {}) {
  return {
    id: "trade_review_capital_1",
    userId: "local_zhaojian_user",
    linkedOneThoughtEventId: "one_thought_capital_1",
    sceneId: "scene_chase",
    itemId: "item_1",
    key: "scene_chase:item_1",
    os: "明知不可追，见涨仍动心。",
    reflectionFinal: "此念一起，先照见急心，再回到规则。",
    reflectionVersion: "reflection_final_shenji_zeyou_v1",
    symbol: "600519",
    direction: "buy",
    entryPrice: 1800,
    pnl: 600,
    followedPlan: true,
    brokeRule: false,
    heartJudgement: "zheng_sheng",
    createdAt: "2026-06-12T10:30:00.000Z",
    updatedAt: "2026-06-12T10:30:00.000Z",
    behaviorEvidence: {
      changedPlanIntraday: false,
      addedPosition: false,
      movedStopLoss: false,
      emotionDrivenEntry: false,
    },
    accountSnapshot: {
      accountEquityBefore: 100000,
      accountEquityAfter: 100600,
    },
    riskEvidence: {
      positionValue: 12000,
      plannedRiskAmount: 1000,
      actualLossAmount: 500,
      addedPosition: false,
      movedStopLoss: false,
      changedPlanIntraday: false,
    },
    ...overrides,
  }
}

function buildEvent(overrides = {}) {
  return {
    id: "one_thought_capital_1",
    userId: "local_zhaojian_user",
    userReaction: "seen",
    actualAction: "traded",
    heartThief: "急",
    ...overrides,
  }
}

const forbiddenPhrases = ["应该买", "应该卖", "可以加仓", "建议止损", "后面会涨", "后面会跌", "买点", "卖点", "收益承诺"]

test("P2.4-A capital stability returns insufficient_data when account and risk data are missing", async () => {
  const { buildCapitalStabilityResult } = await importCapitalStabilityModule()
  const result = buildCapitalStabilityResult({
    tradeReview: buildReview({ accountSnapshot: undefined, riskEvidence: undefined }),
    recentTradeReviews: [],
    linkedOneThoughtEvent: buildEvent(),
  })

  assert.equal(result.version, "capital_stability_v1")
  assert.equal(result.level, "insufficient_data")
  assert.equal(result.score, null)
  assert.ok(result.reasons.includes("资金稳定判断需要账户权益、仓位或计划风险数据。"))
  assert.equal(result.practiceText, "补上账户权益和计划风险，才能看清这笔交易有没有让资金失稳。")
})

test("P2.4-A capital stability marks a rule-kept positive review as stable_with_guard", async () => {
  const { buildCapitalStabilityResult } = await importCapitalStabilityModule()
  const result = buildCapitalStabilityResult({
    tradeReview: buildReview(),
    recentTradeReviews: [],
    linkedOneThoughtEvent: buildEvent(),
  })

  assert.equal(result.level, "stable_with_guard")
  assert.equal(result.metrics.pnlPctOfEquity, 0.6)
  assert.equal(result.metrics.positionPctOfEquity, 12)
  assert.equal(result.metrics.riskPctOfEquity, 0.5)
  assert.equal(result.metrics.exceededPlannedRisk, false)
  assert.equal(result.practiceText, "继续按计划做，不用一笔交易证明自己。")
})

test("P2.4-A capital stability marks zei_sheng as money_stable_heart_moving", async () => {
  const { buildCapitalStabilityResult } = await importCapitalStabilityModule()
  const result = buildCapitalStabilityResult({
    tradeReview: buildReview({
      pnl: 800,
      followedPlan: false,
      brokeRule: true,
      heartJudgement: "zei_sheng",
      riskEvidence: {
        positionValue: 10000,
        plannedRiskAmount: 1000,
        actualLossAmount: 0,
      },
    }),
    recentTradeReviews: [],
    linkedOneThoughtEvent: buildEvent(),
  })

  assert.equal(result.level, "money_stable_heart_moving")
  assert.ok(result.reasons.some((reason) => reason.includes("贼胜")))
  assert.equal(result.practiceText, "钱暂时没坏，不代表心没有偏。下次赚钱也要看是不是守住了规则。")
})

test("P2.4-A capital stability marks broken-rule loss beyond plan as double_unstable", async () => {
  const { buildCapitalStabilityResult } = await importCapitalStabilityModule()
  const result = buildCapitalStabilityResult({
    tradeReview: buildReview({
      pnl: -1800,
      followedPlan: false,
      brokeRule: true,
      heartJudgement: "shuang_shu",
      riskEvidence: {
        positionValue: 18000,
        plannedRiskAmount: 1000,
        actualLossAmount: 1800,
      },
    }),
    recentTradeReviews: [],
    linkedOneThoughtEvent: buildEvent(),
  })

  assert.equal(result.level, "double_unstable")
  assert.equal(result.metrics.exceededPlannedRisk, true)
  assert.ok(result.reasons.some((reason) => reason.includes("破戒亏损")))
  assert.equal(result.practiceText, "钱也失守，心也失守。先停一笔，不用下一笔把自己救回来。")
})

test("P2.4-A capital stability records risk flags for exceeded risk and intraday changes", async () => {
  const { buildCapitalStabilityResult } = await importCapitalStabilityModule()
  const result = buildCapitalStabilityResult({
    tradeReview: buildReview({
      pnl: -1200,
      followedPlan: true,
      brokeRule: false,
      heartJudgement: "zheng_kui",
      riskEvidence: {
        positionValue: 20000,
        plannedRiskAmount: 800,
        actualLossAmount: 1200,
        changedPlanIntraday: true,
      },
      behaviorEvidence: {
        changedPlanIntraday: true,
      },
    }),
    recentTradeReviews: [],
    linkedOneThoughtEvent: buildEvent(),
  })

  assert.equal(result.level, "money_moving_heart_chaotic")
  assert.equal(result.metrics.exceededPlannedRisk, true)
  assert.ok(result.reasons.some((reason) => reason.includes("实际亏损超过计划风险")))
  assert.ok(result.reasons.some((reason) => reason.includes("临盘改计划")))
})

test("P2.4-A capital stability records still_moving traded, added position and stop movement reasons", async () => {
  const { buildCapitalStabilityResult } = await importCapitalStabilityModule()
  const result = buildCapitalStabilityResult({
    tradeReview: buildReview({
      pnl: -300,
      followedPlan: true,
      brokeRule: false,
      heartJudgement: "zheng_kui",
      riskEvidence: {
        positionValue: 9000,
        plannedRiskAmount: 1000,
        actualLossAmount: 300,
        addedPosition: true,
        movedStopLoss: true,
      },
      behaviorEvidence: {
        addedPosition: true,
        movedStopLoss: true,
      },
    }),
    recentTradeReviews: [],
    linkedOneThoughtEvent: buildEvent({ userReaction: "still_moving", actualAction: "traded" }),
  })

  assert.equal(result.level, "money_moving_heart_chaotic")
  assert.ok(result.reasons.some((reason) => reason.includes("心还在动时仍然交易")))
  assert.ok(result.reasons.some((reason) => reason.includes("心还在动时加仓")))
  assert.ok(result.reasons.some((reason) => reason.includes("移动止损")))
})

test("P2.4-A capital stability counts recent loss and heart-instability streaks without changing heart judgement", async () => {
  const { buildCapitalStabilityResult } = await importCapitalStabilityModule()
  const review = buildReview({
    pnl: -200,
    followedPlan: true,
    brokeRule: false,
    heartJudgement: "zheng_kui",
    riskEvidence: {
      positionValue: 9000,
      plannedRiskAmount: 1000,
      actualLossAmount: 200,
    },
  })
  const result = buildCapitalStabilityResult({
    tradeReview: review,
    recentTradeReviews: [
      buildReview({ id: "recent_1", pnl: -100, heartJudgement: "zei_sheng" }),
      buildReview({ id: "recent_2", pnl: -50, heartJudgement: "shuang_shu" }),
      buildReview({ id: "recent_3", pnl: 120, heartJudgement: "zheng_sheng" }),
    ],
    linkedOneThoughtEvent: buildEvent(),
  })

  assert.equal(review.heartJudgement, "zheng_kui")
  assert.equal(result.metrics.lossStreak, 3)
  assert.equal(result.metrics.zeiShengCount, 1)
  assert.equal(result.metrics.shuangShuCount, 1)
  assert.ok(result.warnings.some((warning) => warning.includes("连续亏损")))
})

test("P2.4-A capital stability service is deterministic and has no GPT or trading-advice wording", async () => {
  const source = await readFile(capitalStabilityUrl, "utf8")
  const { buildCapitalStabilityResult } = await importCapitalStabilityModule()
  const result = buildCapitalStabilityResult({
    tradeReview: buildReview(),
    recentTradeReviews: [],
    linkedOneThoughtEvent: buildEvent(),
  })
  const searchable = `${source}\n${JSON.stringify(result)}`

  assert.doesNotMatch(source, /openai|chatCompletion|GPT|fetch\(|XMLHttpRequest|axios/)
  forbiddenPhrases.forEach((phrase) => {
    assert.equal(searchable.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})
