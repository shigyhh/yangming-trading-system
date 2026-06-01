const assert = require("assert");
const { normalizePhone, isValidPhone, maskPhone, buildInviteCode, buildUserBinding, summarizeAssistantHandoff } = require("./index");

assert.strictEqual(normalizePhone("+86 138 1234 5678"), "13812345678");
assert.strictEqual(isValidPhone("13812345678"), true);
assert.strictEqual(maskPhone("13812345678"), "138****5678");
assert.strictEqual(maskPhone("123"), "未绑定");
assert.strictEqual(buildInviteCode({ phone: "13812345678" }), "ZX567877");

const binding = buildUserBinding({ phone: "13812345678", inviteSource: "ZX123456" });
assert.strictEqual(binding.phoneBound, true);
assert.strictEqual(binding.phoneMask, "138****5678");
assert.strictEqual(binding.inviteSource, "ZX123456");

const handoff = summarizeAssistantHandoff({
  profile: { phone: "13812345678", inviteSource: "ZX123456" },
  assessment: { primary: "冲动型", secondary: "焦虑型" },
  training: { completed: true },
  reaction: { tag: "急念", note: "想证明自己" },
  review: { saved: true },
  continuity: { currentStreak: 7 },
  assessmentHistory: [{ primary: "焦虑型" }, { primary: "冲动型" }]
});

assert.strictEqual(handoff.phoneMask, "138****5678");
assert.strictEqual(handoff.retest, "焦虑型 -> 冲动型");
assert.ok(handoff.summary.includes("138****5678"));

console.log("user identity tests passed");
