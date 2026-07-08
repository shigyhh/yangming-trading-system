const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();

const USER_VISIBLE_FILES = [
  "miniprogram/utils/content.js",
  "miniprogram/modules/stages/index.js",
  "miniprogram/modules/training7/index.js",
  "miniprogram/modules/personality/index.js",
  "miniprogram/modules/coach/index.js",
  "miniprogram/modules/classroom/index.js",
  "miniprogram/modules/retest-change/index.js",
  "miniprogram/modules/share-card/index.js",
  "miniprogram/modules/zhixing-stability/index.js",
  "miniprogram/modules/kline-simulator/index.js",
  "miniprogram/modules/mini-loop/index.js",
  "miniprogram/modules/trade-review/index.js",
  "miniprogram/pages/review/index.js",
  "miniprogram/pages/mind/index.js",
  "miniprogram/pages/intraday-boundary/index.js",
  "miniprogram/pages/living-mirror/index.wxml"
];

const FORBIDDEN_VISIBLE_TERMS = [
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
];
const FORBIDDEN_OLD_FLOW_COPY = [
  "先留下真实记录",
  "上传一条真实记录后生成",
  "先完成一次真实复盘。",
  "先完成三次真实复盘",
  "完成两次真实复盘后",
  "先完成一条真实复盘。",
  "真实复盘和一次针对训练",
  "复盘生成主镜",
  "真实记录长出来的树",
  "条真实复盘"
];

const violations = [];

USER_VISIBLE_FILES.forEach((file) => {
  const content = readFileSync(join(root, file), "utf8");
  FORBIDDEN_VISIBLE_TERMS.forEach((term) => {
    if (content.includes(term)) {
      violations.push(`${file}: ${term}`);
    }
  });
  FORBIDDEN_OLD_FLOW_COPY.forEach((term) => {
    if (content.includes(term)) {
      violations.push(`${file}: ${term}`);
    }
  });
});

assert.deepStrictEqual(violations, [], "user-visible miniapp copy should not include forbidden trading-advice terms");

console.log("Mini program user-visible safety copy guard passed.");
