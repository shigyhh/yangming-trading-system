const assert = require("assert");
const { SUBSCRIPTION_PLANS, buildSubscriptionPatch, buildSubscriptionView } = require("./index");

assert.strictEqual(SUBSCRIPTION_PLANS.length, 3);

const patch = buildSubscriptionPatch("yearly", { inviteCode: "ZX123456" });
assert.strictEqual(patch.activePlanKey, "yearly");
assert.ok(patch.expiresAt > patch.startedAt);
assert.ok(patch.proofNo.includes("YEAR"));

const view = buildSubscriptionView(patch, {
  userBinding: { inviteCode: "ZX123456", phoneMask: "138****8888" },
  nickname: "修行者"
});

assert.strictEqual(view.current.name, "年度同修");
assert.strictEqual(view.proof.identityName, "年度共修身份证明");
assert.strictEqual(view.status, "active");

console.log("subscription module tests passed");
