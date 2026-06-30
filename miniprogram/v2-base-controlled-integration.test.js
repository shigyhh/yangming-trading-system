const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();

function readMiniappFile(...parts) {
  return readFileSync(join(root, "miniprogram", ...parts), "utf8");
}

const homeWxml = readMiniappFile("pages", "home", "index.wxml");
const trainingWxml = readMiniappFile("pages", "training", "index.wxml");
const tradeReviewWxml = readMiniappFile("pages", "trade-review", "index.wxml");
const tradeReviewJs = readMiniappFile("pages", "trade-review", "index.js");
const livingMirrorWxml = readMiniappFile("pages", "living-mirror", "index.wxml");
const profileWxml = readMiniappFile("pages", "profile", "index.wxml");
const profileJs = readMiniappFile("pages", "profile", "index.js");

const visibleWxml = [
  homeWxml,
  trainingWxml,
  tradeReviewWxml,
  livingMirrorWxml,
  profileWxml
].join("\n");

[
  "止盈",
  "止损",
  "仓位上限",
  "建议买入",
  "建议卖出",
  "目标价",
  "买入信号",
  "卖出信号",
  "预测涨跌",
  "收益提升",
  "胜率提升"
].forEach((term) => {
  assert.equal(visibleWxml.includes(term), false, `visible miniapp pages should not expose ${term}`);
});

[
  "K线观心",
  "home-quiet-paths",
  "goKlineMind"
].forEach((term) => {
  assert.equal(homeWxml.includes(term), false, `home should not expose the old kline shortcut: ${term}`);
});

[
  "数据品类",
  "周期切片",
  "标的/合约",
  "代码 / 合约 / 币种",
  "合约 / 币种",
  "美股",
  "期货",
  "数字货币"
].forEach((term) => {
  assert.equal(tradeReviewWxml.includes(term), false, `trade review should not expose broad market form term: ${term}`);
});

[
  "selectMarket",
  "selectTimeframe",
  "wx:for=\"{{markets}}\"",
  "wx:for=\"{{timeframes}}\""
].forEach((term) => {
  assert.equal(tradeReviewWxml.includes(term), false, `trade review WXML should not bind broad selector: ${term}`);
  assert.equal(tradeReviewJs.includes(term), false, `trade review JS should not expose broad selector: ${term}`);
});

assert.ok(tradeReviewWxml.includes("第一念"), "trade review should keep first-thought capture");
assert.ok(tradeReviewWxml.includes("form.nextAction"), "trade review should keep next action binding");
assert.ok(tradeReviewWxml.includes("下一次同场景先做什么"), "trade review should keep next action prompt");
assert.ok(tradeReviewWxml.includes("生成活镜复盘"), "trade review should still generate living-mirror review");
assert.ok(tradeReviewJs.includes('marketKey: "cn"'), "trade review should keep A-share as the internal default");
assert.ok(tradeReviewJs.includes('timeframeKey: "1d"'), "trade review should keep daily line as the internal default");

assert.ok(trainingWxml.includes("每日修心"), "training page should keep the V2 training base identity");
assert.ok(trainingWxml.includes("事上练"), "training page should keep the V2 training base identity");
assert.ok(trainingWxml.includes('bindtap="goKlineMind"'), "training page should keep the V2 kline training entry");
assert.ok(profileJs.includes("训练收藏"), "profile should keep training bookmarks entry");
assert.ok(profileJs.includes("执行计划"), "profile should keep execution plan entry");
assert.ok(livingMirrorWxml.includes("活镜"), "living mirror page should remain in the five-entry loop");

console.log("v2 base controlled integration guard passed");
