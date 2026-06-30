const assert = require("node:assert");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function assertFile(relativePath) {
  assert.ok(existsSync(join(root, relativePath)), `${relativePath} should exist`);
}

[
  "miniprogram/modules/intervention-engine/index.js",
  "miniprogram/modules/zhixing-reminder/index.js",
  "miniprogram/modules/execution-plan/index.js",
  "miniprogram/pages/execution-plan/index.wxml",
  "miniprogram/pages/training-bookmarks/index.wxml",
  "miniprogram/utils/api.js",
  "miniprogram/utils/data-binding-adapter.js",
  "miniprogram/utils/store.js",
  "miniprogram/user-visible-safety-copy.test.js"
].forEach(assertFile);

const home = read("miniprogram/pages/home/index.wxml");
assert.ok(home.includes("今日只练一件事"), "home should keep old visual one-thing hierarchy");
assert.ok(home.includes("home-quiet-paths"), "home should keep old visual quiet path entry");
assert.ok(home.includes("<bottom-tab-bar") && home.includes('active="today"'), "home should keep bottom navigation");

const tradeReview = read("miniprogram/pages/trade-review/index.wxml");
const tradeReviewJs = read("miniprogram/pages/trade-review/index.js");
assert.ok(tradeReview.includes("<bottom-tab-bar") && tradeReview.includes('active="review"'), "trade review should keep bottom navigation");
[
  "【错题卡】",
  "第一念",
  "触发场景",
  "下次执行动作",
  "quick-choice-grid",
  "mirror-top3"
].forEach((marker) => {
  assert.ok(tradeReview.includes(marker), `trade review should keep ${marker}`);
});
[
  "manualAnchorVisible",
  "firstThoughtOptions",
  "triggerSceneOptions",
  "positionStates",
  "nextActionOptions",
  "buildMirrorTop3"
].forEach((marker) => {
  assert.ok(tradeReviewJs.includes(marker), `trade review should bridge old visual marker ${marker}`);
});

const livingMirror = read("miniprogram/pages/living-mirror/index.wxml");
const livingMirrorJs = read("miniprogram/pages/living-mirror/index.js");
assert.ok(livingMirror.includes("真实复盘 Top3"), "living mirror should keep old review top3 visual section");
assert.ok(livingMirror.includes("<bottom-tab-bar") && livingMirror.includes('active="mirror"'), "living mirror should keep bottom navigation");
assert.ok(livingMirrorJs.includes("showMirrorDepth"), "living mirror should support old visual depth toggle");
assert.ok(livingMirrorJs.includes("buildReviewTop3View"), "living mirror should bridge review top3 view model");

const training = read("miniprogram/pages/training/index.wxml");
const trainingJs = read("miniprogram/pages/training/index.js");
assert.ok(training.includes("每日修心"), "training should keep old training visual title");
assert.ok(training.includes("<bottom-tab-bar") && training.includes('active="training"'), "training should keep bottom navigation");
assert.ok(trainingJs.includes("trainingDayFocus"), "training should bridge old visual focus block");
assert.ok(trainingJs.includes("toggleTrainingPlan"), "training should support old visual plan toggle");

const profile = read("miniprogram/pages/profile/index.wxml");
const profileJs = read("miniprogram/pages/profile/index.js");
assert.ok(profile.includes("我的闭环"), "profile should keep old closure chain area");
assert.ok(profile.includes("<bottom-tab-bar") && profile.includes('active="profile"'), "profile should keep bottom navigation");
assert.ok(profileJs.includes("showProfileDepth"), "profile should support old visual depth toggle");

const klineMind = read("miniprogram/pages/kline-mind/index.wxml");
const klineMindJs = read("miniprogram/pages/kline-mind/index.js");
[
  "runtimeView",
  "mainIndicatorOptions",
  "indicatorPanelOptions",
  "chart-indicator-chip",
  "advanceRuntimeCandle"
].forEach((marker) => {
  assert.ok(klineMind.includes(marker), `kline mind should restore runtime marker ${marker}`);
});
[
  "review_focus",
  "special_training",
  "custom_session",
  "自选盲练",
  "saveTrainingBookmark"
].forEach((marker) => {
  assert.ok(klineMind.includes(marker) || klineMindJs.includes(marker), `kline mind should keep current business marker ${marker}`);
});
[
  "selectedMainIndicatorKey",
  "selectedIndicatorKey",
  "selectMainIndicator",
  "selectIndicator",
  "advanceRuntimeCandle",
  "recordRuntimeDecision"
].forEach((marker) => {
  assert.ok(klineMindJs.includes(marker), `kline mind should bridge runtime behavior ${marker}`);
});

[
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
].forEach((term) => {
  assert.ok(!home.includes(term), `home should not include forbidden term ${term}`);
  assert.ok(!tradeReview.includes(term), `trade review should not include forbidden term ${term}`);
  assert.ok(!training.includes(term), `training should not include forbidden term ${term}`);
  assert.ok(!profile.includes(term), `profile should not include forbidden term ${term}`);
  assert.ok(!livingMirror.includes(term), `living mirror should not include forbidden term ${term}`);
  assert.ok(!klineMind.includes(term), `kline mind should not include forbidden term ${term}`);
});

console.log("Mini program old visual integration guard passed.");
