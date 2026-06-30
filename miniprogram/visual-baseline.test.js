const assert = require("node:assert")
const { readFileSync } = require("node:fs")
const { join } = require("node:path")

const root = process.cwd()

function readMiniapp(path) {
  return readFileSync(join(root, "miniprogram", path), "utf8")
}

function assertIncludes(source, marker, label) {
  assert.ok(source.includes(marker), `${label} should include ${marker}`)
}

function assertExcludes(source, marker, label) {
  assert.equal(source.includes(marker), false, `${label} should not include ${marker}`)
}

const homeWxml = readMiniapp("pages/home/index.wxml")
const trainingWxml = readMiniapp("pages/training/index.wxml")
const klineWxml = readMiniapp("pages/kline-mind/index.wxml")
const tradeReviewWxml = readMiniapp("pages/trade-review/index.wxml")
const profileWxml = readMiniapp("pages/profile/index.wxml")
const profileJs = readMiniapp("pages/profile/index.js")

for (const oldShellMarker of ["阳明心学交易系统", "每日一页 · 照见本心"]) {
  assertExcludes(homeWxml, oldShellMarker, "home visual baseline")
}

for (const homeMarker of ["brand-seal-frame", "brand-seal-art", "single-focus", "K线观心"]) {
  assertIncludes(homeWxml, homeMarker, "home canonical visual baseline")
}

assertIncludes(trainingWxml, "/assets/brand/ymty-zhao-logo.svg", "training canonical visual baseline")
assertIncludes(trainingWxml, "brand-seal-frame", "training canonical visual baseline")
assertIncludes(trainingWxml, "今日只练一件事", "training canonical visual baseline")
assertExcludes(trainingWxml, "brand-zhao-mini", "training canonical visual baseline")

for (const forbiddenKlineMarker of ["runtimeView", "MA", "BOLL", "MACD", "RSI", "KDJ"]) {
  assertExcludes(klineWxml, forbiddenKlineMarker, "kline visual baseline")
}

for (const klineMarker of ["review_focus", "今日针对训练", "special_training", "专项训练", "custom_session", "自选盲练"]) {
  assertIncludes(klineWxml, klineMarker, "kline protected training entries")
}

for (const reviewMarker of ["错题卡", "第一念", "触发场景", "下次执行动作", "quick-choice-grid", "mistake-card"]) {
  assertIncludes(tradeReviewWxml, reviewMarker, "trade review mistake-card visual baseline")
}

assertIncludes(profileWxml, "profile-depth-stack", "profile visual baseline")
assertIncludes(profileJs, "trainingBookmarks", "profile protected training bookmark entry")
assertIncludes(profileJs, "executionPlan", "profile protected execution plan entry")

const visibleWxmlFiles = [
  ["home", homeWxml],
  ["training", trainingWxml],
  ["kline", klineWxml],
  ["trade-review", tradeReviewWxml],
  ["profile", profileWxml]
]

const forbiddenVisibleTradingCopy = [
  "止盈",
  "止损",
  "仓位上限",
  "建议买入",
  "建议卖出",
  "现在可以买",
  "现在该卖",
  "目标价",
  "止损建议",
  "明日看涨",
  "明日看跌",
  "预测涨跌",
  "买入信号",
  "卖出信号",
  "收益提升",
  "胜率提升"
]

for (const [label, source] of visibleWxmlFiles) {
  for (const word of forbiddenVisibleTradingCopy) {
    assertExcludes(source, word, `${label} user-visible copy`)
  }
}

console.log("Mini program visual baseline guard passed.")
