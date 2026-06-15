import assert from "node:assert/strict"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const displayUrl = new URL("./reviewRiskSignalDisplay.ts", import.meta.url)

function transpileTs(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  }).outputText
}

async function importReviewRiskSignalDisplay() {
  const dir = path.join(tmpdir(), "yangming-review-risk-signal-display-tests")
  await mkdir(dir, { recursive: true })

  const displaySource = await readFile(displayUrl, "utf8")
  await writeFile(path.join(dir, "reviewRiskSignalDisplay.mjs"), transpileTs(displaySource), "utf8")

  return import(`file://${path.join(dir, `reviewRiskSignalDisplay.mjs?${Date.now()}`)}`)
}

function signal(type, level, count) {
  return {
    type,
    level,
    count,
    text: `${type} text`,
    relatedReviewIds: Array.from({ length: count }, (_, index) => `${type}_${index}`),
  }
}

test("P2.5-C sorts reviewRiskSignals by level then count and keeps top 3", async () => {
  const { getTopReviewRiskSignals } = await importReviewRiskSignalDisplay()

  const topSignals = getTopReviewRiskSignals([
    signal("repeated_broke_rule", "medium", 4),
    signal("moved_stop_loss", "high", 1),
    signal("repeated_zei_sheng", "high", 5),
    signal("money_moving_heart_chaotic", "low", 9),
    signal("repeated_shuang_shu", "medium", 6),
  ])

  assert.deepEqual(topSignals.map((item) => item.type), [
    "repeated_zei_sheng",
    "moved_stop_loss",
    "repeated_shuang_shu",
  ])
})

test("P2.5-C labels and empty state stay in rule-guard language", async () => {
  const {
    REVIEW_RISK_SIGNAL_EMPTY_TEXT,
    reviewRiskSignalLevelLabels,
    reviewRiskSignalTypeLabels,
    formatTopReviewRiskSignalSummary,
  } = await importReviewRiskSignalDisplay()

  assert.equal(reviewRiskSignalTypeLabels.repeated_broke_rule, "反复破戒")
  assert.equal(reviewRiskSignalTypeLabels.repeated_zei_sheng, "贼胜反复")
  assert.equal(reviewRiskSignalTypeLabels.repeated_shuang_shu, "双输反复")
  assert.equal(reviewRiskSignalTypeLabels.capital_double_unstable, "资金双失守")
  assert.equal(reviewRiskSignalTypeLabels.money_moving_heart_chaotic, "钱动心乱")
  assert.equal(reviewRiskSignalTypeLabels.still_moving_then_traded, "心还在动仍交易")
  assert.equal(reviewRiskSignalTypeLabels.added_position_when_heart_moving, "心动时加仓")
  assert.equal(reviewRiskSignalTypeLabels.moved_stop_loss, "移动止损")
  assert.equal(reviewRiskSignalLevelLabels.low, "轻提醒")
  assert.equal(reviewRiskSignalLevelLabels.medium, "守护提醒")
  assert.equal(reviewRiskSignalLevelLabels.high, "强守护")
  assert.equal(REVIEW_RISK_SIGNAL_EMPTY_TEXT, "暂无规则守护提醒。不是没有风险，而是还需要更多复盘样本。")

  const summary = formatTopReviewRiskSignalSummary([
    {
      type: "still_moving_then_traded",
      level: "high",
      count: 3,
      text: "最近多次出现“心还在动后仍交易”。这不是行情问题，是同一颗心在反复接管下单。",
      relatedReviewIds: ["review_1", "review_2", "review_3"],
    },
  ])

  assert.equal(summary, "这类失守最近已出现 3 次。最近多次出现“心还在动后仍交易”。这不是行情问题，是同一颗心在反复接管下单。")
  assert.equal(formatTopReviewRiskSignalSummary([]), REVIEW_RISK_SIGNAL_EMPTY_TEXT)
})

test("P2.5-C display helper does not recalculate or generate trading advice", async () => {
  const source = await readFile(displayUrl, "utf8")

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
  ].forEach((token) => {
    assert.equal(source.includes(token), false, `reviewRiskSignalDisplay must not include: ${token}`)
  })
})
