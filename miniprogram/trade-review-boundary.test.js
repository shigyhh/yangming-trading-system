const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const pageDir = join(root, "miniprogram", "pages", "trade-review");
const wxml = readFileSync(join(pageDir, "index.wxml"), "utf8");
const js = readFileSync(join(pageDir, "index.js"), "utf8");

const forbiddenVisibleTerms = [
  "数据品类",
  "周期切片",
  "标的/合约",
  "代码 / 合约 / 币种",
  "合约 / 币种",
  "美股",
  "期货",
  "数字货币"
];

forbiddenVisibleTerms.forEach((term) => {
  assert.equal(wxml.includes(term), false, `trade review page should not expose ${term}`);
});

[
  'wx:for="{{markets}}"',
  'wx:for="{{timeframes}}"',
  "selectMarket",
  "selectTimeframe"
].forEach((term) => {
  assert.equal(wxml.includes(term), false, `trade review WXML should not bind ${term}`);
  assert.equal(js.includes(term), false, `trade review JS should not expose ${term}`);
});

assert.ok(wxml.includes("股票代码"), "trade review should ask for stock code only");
assert.ok(wxml.includes("第一念是什么"), "trade review should keep first-thought capture");
assert.ok(wxml.includes("下一次执行动作"), "trade review should keep next action capture");
assert.ok(wxml.includes("生成活镜复盘"), "trade review should still generate living-mirror review");
assert.ok(js.includes('marketKey: "cn"'), "trade review should keep A-share as the internal default");
assert.ok(js.includes('timeframeKey: "1d"'), "trade review should keep daily line as the internal default");
assert.ok(js.includes("A 股日线"), "trade review should describe the internal A-share daily anchor");

console.log("trade-review boundary guard passed");
