const assert = require("assert");
const { readFileSync } = require("fs");
const { join } = require("path");

const root = process.cwd();

function readPage(page, file) {
  return readFileSync(join(root, "miniprogram", "pages", page, file), "utf8");
}

function assertNoDirectTabNavigation(source, route, context) {
  assert.equal(
    source.includes(`wx.navigateTo({ url: "${route}`) || source.includes(`wx.redirectTo({ url: "${route}`),
    false,
    `${context} should switchTab to tabBar page ${route}`
  );
}

const homeJs = readPage("home", "index.js");
const trainingJs = readPage("training", "index.js");
const trainingWxml = readPage("training", "index.wxml");
const tradeReviewJs = readPage("trade-review", "index.js");
const livingMirrorJs = readPage("living-mirror", "index.js");
const klineMindJs = readPage("kline-mind", "index.js");

[
  [homeJs, "/pages/trade-review/index", "home"],
  [homeJs, "/pages/living-mirror/index", "home"],
  [homeJs, "/pages/profile/index", "home"],
  [tradeReviewJs, "/pages/living-mirror/index", "trade review"],
  [livingMirrorJs, "/pages/trade-review/index", "living mirror"],
  [livingMirrorJs, "/pages/profile/index", "living mirror"],
  [klineMindJs, "/pages/home/index", "kline mind"],
  [klineMindJs, "/pages/training/index", "kline mind"],
  [klineMindJs, "/pages/living-mirror/index", "kline mind"]
].forEach(([source, route, context]) => {
  assertNoDirectTabNavigation(source, route, context);
});

assert.ok(
  homeJs.includes("switchTabPage"),
  "home should centralize tabBar routing behind a switchTab helper"
);
assert.equal(
  trainingJs.includes("todayReviewReady"),
  false,
  "training page should not carry a review-ready flag that can reintroduce a hard gate before K-line practice"
);
assert.ok(
  trainingJs.includes("trainingContextVisible"),
  "training page should derive whether advanced plan/detail controls have enough evidence to show"
);
assert.ok(
  trainingWxml.includes('class="primary-btn kline-entry-btn" bindtap="goKlineMind"'),
  "training page should always let users start the general K-line blind practice"
);
assert.equal(
  trainingWxml.includes('wx:else class="primary-btn kline-entry-btn"'),
  false,
  "training page should not hard-gate K-line blind practice behind a real review"
);
assert.ok(
  trainingWxml.includes('wx:if="{{trainingContextVisible}}" class="training-subtle-links"'),
  "training page should only show plan/detail toggles after training or review context exists"
);
assert.equal(
  trainingWxml.includes("training-review-nudge"),
  false,
  "training first screen should not add a second review task under the blind-practice action"
);
assert.equal(
  trainingJs.includes("(state || {}).updatedAt") || trainingJs.includes("record.updatedAt") || trainingJs.includes("(klineMindRecord || {}).updatedAt"),
  false,
  "training context should use explicit behavior evidence, not passive updatedAt timestamps"
);
console.log("navigation flow guard passed");
