import assert from "node:assert/strict"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const serviceUrl = new URL("./ruleGuardInsightService.ts", import.meta.url)

function transpileTs(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  }).outputText
}

async function importRuleGuardInsightService() {
  const dir = path.join(tmpdir(), "yangming-rule-guard-insight-service-tests")
  await mkdir(dir, { recursive: true })

  const serviceSource = await readFile(serviceUrl, "utf8")
  await writeFile(path.join(dir, "ruleGuardInsightService.mjs"), transpileTs(serviceSource), "utf8")

  return import(`file://${path.join(dir, `ruleGuardInsightService.mjs?${Date.now()}`)}`)
}

function riskSignal(type, level = "medium", count = 2, relatedReviewIds = ["review_1", "review_2"]) {
  return {
    type,
    level,
    count,
    text: `${type} risk text`,
    relatedReviewIds,
  }
}

function cycleSignal(type, level = "medium", count = 2, relatedIds = ["cycle_1", "cycle_2"]) {
  return {
    type,
    level,
    count,
    text: `${type} cycle text`,
    relatedIds,
  }
}

test("P2.6-C buildRuleGuardInsights reads reviewRiskSignals", async () => {
  const { buildRuleGuardInsights } = await importRuleGuardInsightService()

  const [insight] = buildRuleGuardInsights({
    reviewRiskSignals: [riskSignal("repeated_broke_rule", "medium", 2, ["review_a", "review_b"])],
    cycleSignals: [],
  })

  assert.equal(insight.source, "review_risk")
  assert.equal(insight.type, "repeated_broke_rule")
  assert.equal(insight.title, "反复破戒")
  assert.equal(insight.level, "medium")
  assert.equal(insight.count, 2)
  assert.deepEqual(insight.relatedIds, ["review_a", "review_b"])
})

test("P2.6-C buildRuleGuardInsights reads cycleSignals", async () => {
  const { buildRuleGuardInsights } = await importRuleGuardInsightService()

  const [insight] = buildRuleGuardInsights({
    reviewRiskSignals: [],
    cycleSignals: [cycleSignal("same_scene_repeated", "high", 4, ["scene_a", "scene_b", "scene_c"])],
  })

  assert.equal(insight.source, "cycle")
  assert.equal(insight.type, "same_scene_repeated")
  assert.equal(insight.title, "复发场景")
  assert.equal(insight.level, "high")
  assert.equal(insight.count, 4)
  assert.deepEqual(insight.relatedIds, ["scene_a", "scene_b", "scene_c"])
})

test("P2.6-C combines still_moving_then_traded with heart_thief_cycle", async () => {
  const { buildRuleGuardInsights } = await importRuleGuardInsightService()

  const [insight] = buildRuleGuardInsights({
    reviewRiskSignals: [riskSignal("still_moving_then_traded", "medium", 3, ["review_a", "review_b"])],
    cycleSignals: [cycleSignal("heart_thief_cycle", "high", 3, ["review_b", "review_c"])],
  })

  assert.equal(insight.source, "combined")
  assert.equal(insight.type, "heart_thief_cycle")
  assert.equal(insight.title, "心贼循环")
  assert.equal(insight.level, "high")
  assert.equal(insight.count, 3)
  assert.deepEqual(insight.relatedIds, ["review_a", "review_b", "review_c"])
  assert.equal(insight.text, "这不是单次风险。这条循环已经出现多次：心还在动 → 还是交易 → 复盘失守。")
})

test("P2.6-C combines broke rule, capital damage and zei sheng patterns", async () => {
  const { buildRuleGuardInsights } = await importRuleGuardInsightService()

  const insights = buildRuleGuardInsights({
    reviewRiskSignals: [
      riskSignal("repeated_broke_rule", "medium", 2),
      riskSignal("capital_double_unstable", "high", 2),
      riskSignal("repeated_zei_sheng", "medium", 2),
    ],
    cycleSignals: [
      cycleSignal("same_behavior_repeated", "medium", 3),
      cycleSignal("same_capital_damage_repeated", "high", 2),
      cycleSignal("heart_thief_cycle", "medium", 2),
    ],
    maxItems: 10,
  })
  const byType = new Map(insights.map((item) => [item.type, item]))

  assert.equal(byType.get("repeated_broke_rule")?.source, "combined")
  assert.equal(byType.get("repeated_broke_rule")?.text, "破戒不是偶然。同一类动作最近反复出现，说明规则还没有真正落到手上。")
  assert.equal(byType.get("same_capital_damage_repeated")?.source, "combined")
  assert.equal(byType.get("same_capital_damage_repeated")?.text, "资金失稳不是单次波动。它正在和同一类心动行为绑定。")
  assert.equal(byType.get("repeated_zei_sheng")?.source, "combined")
  assert.equal(byType.get("repeated_zei_sheng")?.text, "最近多次出现贼胜。钱暂时没坏，但坏习惯正在被奖励。")
})

test("P2.6-C sorts by level, source, count and relatedIds, then keeps top 3 by default", async () => {
  const { buildRuleGuardInsights } = await importRuleGuardInsightService()

  const insights = buildRuleGuardInsights({
    reviewRiskSignals: [
      riskSignal("still_moving_then_traded", "high", 2, ["review_a", "review_b"]),
      riskSignal("moved_stop_loss", "high", 9, Array.from({ length: 9 }, (_, index) => `stop_${index}`)),
      riskSignal("repeated_shuang_shu", "medium", 8, Array.from({ length: 8 }, (_, index) => `double_${index}`)),
    ],
    cycleSignals: [
      cycleSignal("heart_thief_cycle", "high", 2, ["review_b", "review_c"]),
      cycleSignal("same_thought_repeated", "high", 4, ["thought_a"]),
      cycleSignal("same_scene_repeated", "high", 4, ["scene_a", "scene_b", "scene_c"]),
    ],
  })

  assert.equal(insights.length, 3)
  assert.deepEqual(insights.map((item) => item.source), ["combined", "cycle", "cycle"])
  assert.deepEqual(insights.map((item) => item.type), [
    "heart_thief_cycle",
    "same_scene_repeated",
    "same_thought_repeated",
  ])
})

test("P2.6-C returns empty array for empty input", async () => {
  const { buildRuleGuardInsights } = await importRuleGuardInsightService()

  assert.deepEqual(buildRuleGuardInsights({}), [])
})

test("P2.6-C labels, summary and source mapping stay in rule-guard language", async () => {
  const {
    RULE_GUARD_INSIGHT_EMPTY_TEXT,
    formatTopRuleGuardInsightSummary,
    ruleGuardInsightLevelLabels,
    ruleGuardInsightSourceLabels,
    ruleGuardInsightTypeLabels,
  } = await importRuleGuardInsightService()

  assert.equal(ruleGuardInsightLevelLabels.low, "轻提醒")
  assert.equal(ruleGuardInsightLevelLabels.medium, "守护提醒")
  assert.equal(ruleGuardInsightLevelLabels.high, "强守护")
  assert.equal(ruleGuardInsightSourceLabels.review_risk, "复盘守护")
  assert.equal(ruleGuardInsightSourceLabels.cycle, "循环守护")
  assert.equal(ruleGuardInsightSourceLabels.combined, "合证守护")
  assert.equal(ruleGuardInsightTypeLabels.heart_thief_cycle, "心贼循环")
  assert.equal(RULE_GUARD_INSIGHT_EMPTY_TEXT, "暂无规则守护提醒。不是没有风险，而是还需要更多复盘样本。")

  const summary = formatTopRuleGuardInsightSummary([
    {
      id: "combined:heart_thief_cycle",
      source: "combined",
      type: "heart_thief_cycle",
      level: "high",
      title: "心贼循环",
      text: "这不是单次风险。这条循环已经出现多次：心还在动 → 还是交易 → 复盘失守。",
      count: 3,
      relatedIds: ["review_1", "review_2", "review_3"],
      actionText: "先看见循环，再回到当时那一念。",
    },
  ])

  assert.equal(summary, "合证守护：心贼循环。这不是单次风险。这条循环已经出现多次：心还在动 → 还是交易 → 复盘失守。")
})

test("P2.6-C service does not recalculate, call external intelligence, or generate trading advice", async () => {
  const source = await readFile(serviceUrl, "utf8")

  ;[
    "calculateHeartJudgement",
    "judgeTradeHeart",
    "buildCapitalStabilityResult",
    "openai",
    "GPT",
    "应该买",
    "应该卖",
    "可以加仓",
    "建议止损",
    "后面会涨",
    "后面会跌",
    "买点",
    "卖点",
    "收益承诺",
    "强制禁止交易",
  ].forEach((token) => {
    assert.equal(source.includes(token), false, `ruleGuardInsightService must not include: ${token}`)
  })
})
