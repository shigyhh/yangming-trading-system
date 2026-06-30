const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function assertIncludes(source, marker, message) {
  assert.ok(source.includes(marker), message || `expected source to include ${marker}`);
}

function assertRouteExists(appJson, route) {
  const normalized = String(route || "").replace(/^\//, "");
  assert.ok(appJson.pages.includes(normalized), `${route} should be registered in app.json`);
}

const appJson = readJson("miniprogram/app.json");
const bottomTabWxml = read("miniprogram/components/bottom-tab-bar/index.wxml");
const bottomTabJs = read("miniprogram/components/bottom-tab-bar/index.js");

[
  "/pages/home/index",
  "/pages/trade-review/index",
  "/pages/training/index",
  "/pages/living-mirror/index",
  "/pages/profile/index",
  "/pages/kline-mind/index",
  "/pages/training-bookmarks/index",
  "/pages/training-bookmarks/detail",
  "/pages/execution-plan/index"
].forEach((route) => assertRouteExists(appJson, route));

[
  "/pages/home/index",
  "/pages/trade-review/index",
  "/pages/training/index",
  "/pages/living-mirror/index",
  "/pages/profile/index"
].forEach((route) => assertIncludes(bottomTabJs, route, `bottom tab should keep route ${route}`));

["今日", "复盘", "训练", "活镜", "我的"].forEach((label) => {
  assertIncludes(bottomTabJs, label, `bottom tab should keep ${label} entry`);
});
assertIncludes(bottomTabWxml, "bindtap=\"go\"", "bottom tab should keep navigation handler");

const routePages = [
  ["miniprogram/pages/home/index.wxml", 'active="today"'],
  ["miniprogram/pages/trade-review/index.wxml", 'active="review"'],
  ["miniprogram/pages/training/index.wxml", 'active="training"'],
  ["miniprogram/pages/kline-mind/index.wxml", 'active="mind"'],
  ["miniprogram/pages/living-mirror/index.wxml", 'active="mirror"'],
  ["miniprogram/pages/profile/index.wxml", 'active="profile"'],
  ["miniprogram/pages/training-bookmarks/index.wxml", 'active="profile"'],
  ["miniprogram/pages/training-bookmarks/detail.wxml", 'active="profile"'],
  ["miniprogram/pages/execution-plan/index.wxml", 'active="profile"']
];

for (const [relativePath, activeMarker] of routePages) {
  const wxml = read(relativePath);
  assertIncludes(wxml, "<bottom-tab-bar", `${relativePath} should keep bottom navigation`);
  assertIncludes(wxml, activeMarker, `${relativePath} should map to the right bottom-tab active state`);
}

[
  "miniprogram/pages/training-bookmarks/index.json",
  "miniprogram/pages/training-bookmarks/detail.json",
  "miniprogram/pages/execution-plan/index.json"
].forEach((relativePath) => {
  const pageJson = readJson(relativePath);
  assert.ok(
    pageJson.usingComponents && pageJson.usingComponents["bottom-tab-bar"],
    `${relativePath} should register bottom-tab-bar`
  );
});

const homeWxml = read("miniprogram/pages/home/index.wxml");
const homeJs = read("miniprogram/pages/home/index.js");
assertIncludes(homeWxml, "goMiniPrimary", "home should keep primary dispatch action");
assertIncludes(homeWxml, "goKlineMind", "home should keep K-line mind entry");
assertIncludes(homeJs, "review-focus-training", "home should route review-focus training state");
assertIncludes(homeJs, "sourceType=review_focus", "home should preserve review focus training query");
assertIncludes(homeJs, "goTradeReview", "home should route into real review");
assertIncludes(homeJs, "goLivingMirror", "home should route into living mirror");

const tradeReviewWxml = read("miniprogram/pages/trade-review/index.wxml");
const tradeReviewJs = read("miniprogram/pages/trade-review/index.js");
["真实记录", "第一念", "触发场景", "下次执行动作", "【错题卡】"].forEach((marker) => {
  assertIncludes(tradeReviewWxml, marker, `trade review should keep closed-loop marker ${marker}`);
});
assertIncludes(tradeReviewJs, "goKlineTraining", "trade review should keep targeted training jump");
assertIncludes(tradeReviewJs, "sourceType=review_focus", "trade review should pass review_focus to K-line");
assertIncludes(tradeReviewJs, "sourceReviewId", "trade review should pass source review id");
assertIncludes(tradeReviewJs, "goLivingMirror", "trade review should route to living mirror after review");

const trainingWxml = read("miniprogram/pages/training/index.wxml");
const trainingJs = read("miniprogram/pages/training/index.js");
assertIncludes(trainingWxml, "开始K线观心", "training should expose K-line training entry");
assertIncludes(trainingJs, "goKlineMind", "training should navigate to K-line page");
assertIncludes(trainingJs, "/pages/kline-mind/index", "training should use the canonical K-line route");

const klineWxml = read("miniprogram/pages/kline-mind/index.wxml");
const klineJs = read("miniprogram/pages/kline-mind/index.js");
[
  "review_focus",
  "special_training",
  "custom_session",
  "自选盲练",
  "saveTrainingBookmark",
  "runtimeView",
  "mainIndicatorOptions",
  "indicatorPanelOptions",
  "advanceRuntimeCandle",
  "recordRuntimeDecision"
].forEach((marker) => {
  assert.ok(klineWxml.includes(marker) || klineJs.includes(marker), `K-line should keep ${marker}`);
});
assertIncludes(klineJs, "goLivingMirror", "K-line result should route to living mirror");
assertIncludes(klineJs, "goTraining", "K-line result should route back to training");
assertIncludes(klineJs, "buildSpecialTrainingFromEntry", "K-line should accept special training entry query");
assertIncludes(klineJs, "entrySpecialTraining", "K-line should apply special training entry during load");

const livingWxml = read("miniprogram/pages/living-mirror/index.wxml");
const livingJs = read("miniprogram/pages/living-mirror/index.js");
["真实复盘 Top3", "下一步修行", "活镜推荐切片"].forEach((marker) => {
  assertIncludes(livingWxml, marker, `living mirror should keep ${marker}`);
});
assertIncludes(livingJs, "goReview", "living mirror should route back to real review");
assertIncludes(livingJs, "goRecommendedKline", "living mirror should route to recommended K-line training");
assertIncludes(livingJs, "/pages/kline-mind/index", "living mirror should use canonical K-line route");
assertIncludes(livingJs, 'sourceType: "special_training"', "living mirror should mark recommended K-line as special training");

const profileWxml = read("miniprogram/pages/profile/index.wxml");
const profileJs = read("miniprogram/pages/profile/index.js");
["我的闭环", "我的执行计划", "训练收藏"].forEach((marker) => {
  assertIncludes(profileWxml + profileJs, marker, `profile should keep ${marker}`);
});
assertIncludes(profileJs, "/pages/execution-plan/index", "profile should route to execution plan");
assertIncludes(profileJs, "/pages/training-bookmarks/index", "profile should route to training bookmarks");

const forbiddenVisibleTradingCopy = [
  "止盈",
  "止损",
  "仓位上限",
  "建议买入",
  "建议卖出",
  "目标价",
  "买入信号",
  "卖出信号",
  "收益提升",
  "胜率提升"
];

[
  homeWxml,
  tradeReviewWxml,
  trainingWxml,
  klineWxml,
  livingWxml,
  profileWxml
].forEach((source, index) => {
  forbiddenVisibleTradingCopy.forEach((term) => {
    assert.equal(source.includes(term), false, `user-facing loop page ${index} should not include ${term}`);
  });
});

console.log("Mini program product loop integration guard passed.");
