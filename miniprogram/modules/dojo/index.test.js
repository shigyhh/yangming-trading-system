const assert = require("assert");
const { buildDojoView, buildAssistantReply } = require("./index");

const context = {
  profile: { phone: "13812345678", inviteSource: "ZX111177", nickname: "修行者" },
  assessment: { primary: "冲动型", secondary: "焦虑型" },
  training: { completed: true },
  reaction: { tag: "急念", note: "边界到了想证明自己" },
  review: { saved: true },
  continuity: { currentStreak: 3, todayProgressText: "3/3" },
  growth: { activeGate: { name: "事上磨" }, overall: 72 },
  assessmentHistory: [{ primary: "焦虑型" }, { primary: "冲动型" }],
  dojoState: {
    joined: true,
    mentorCode: "ZX567877",
    mentorRole: "assistant",
    taskRecords: {}
  },
  todayKey: "2026-06-01"
};

const dojo = buildDojoView(context);
assert.strictEqual(dojo.inviteCode, "ZX567877");
assert.strictEqual(dojo.mentorRole, "assistant");
assert.strictEqual(dojo.assistantHandoff.phoneMask, "138****5678");
assert.strictEqual(dojo.assistantHandoff.inviteSource, "ZX111177");
assert.strictEqual(dojo.assistantHandoff.retest, "焦虑型 -> 冲动型");
assert.ok(dojo.assistantHandoff.summary.includes("训练已完成"));

const reply = buildAssistantReply("我现在很急，边界到了还想证明自己", context);
assert.strictEqual(reply.title, "观心回应");
assert.ok(reply.content.includes("慢一拍"));
assert.ok(reply.question.includes("3/3"));

console.log("dojo module tests passed");
