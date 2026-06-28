const assert = require("assert");
const fs = require("fs");
const path = require("path");

const apiSource = fs.readFileSync(path.join(__dirname, "api.js"), "utf8");

assert.ok(apiSource.includes("buildKLineBindingPayload"));
assert.ok(apiSource.includes("buildTradeReviewBindingPayload"));
assert.ok(apiSource.includes("syncTrainingProgress"));
assert.ok(apiSource.includes("syncTradeReviewRecord"));
assert.ok(apiSource.includes("/api/v1/data-binding/users/"));
assert.ok(apiSource.includes("/kline-records"));
assert.ok(apiSource.includes("/trade-reviews"));
assert.ok(apiSource.includes("data: klinePayload"));
assert.ok(apiSource.includes("data: payload"));

const forbiddenTerms = ["守法", "破法", "守法率"];
forbiddenTerms.forEach((term) => {
  assert.strictEqual(apiSource.includes(term), false, `api source should not include ${term}`);
});

console.log("miniprogram api sync tests passed");
