const assert = require("assert");
const { buildCompanionMirror } = require("./index");

const pending = buildCompanionMirror({ inviterPrimary: "焦虑型" });
assert.strictEqual(pending.ready, false);
assert.ok(pending.commonRisk.includes("待同修"));

const ready = buildCompanionMirror({
  inviterPrimary: "焦虑型",
  inviterSecondary: "扛单型",
  inviteePrimary: "冲动型",
  inviteeSecondary: "赌徒型"
});

assert.strictEqual(ready.ready, true);
assert.ok(ready.difference.includes("冲动型"));

console.log("companion-mirror module tests passed");
