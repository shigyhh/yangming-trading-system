const assert = require("assert");
const {
  buildBehaviorLoop,
  buildLivingMirrorTree,
  buildMiniHomeView,
  buildMiniLoopProgress,
  buildMiniProgramBinding,
  normalizeThoughtType
} = require("./index");

const binding = buildMiniProgramBinding({
  userBinding: { inviteCode: "ZX123456", phoneMask: "138****5678" },
  profile: { createdAt: 1 },
  linkToken: "lt_mock",
  reportId: "report_mock"
});

assert.strictEqual(binding.linkToken, "lt_mock");
assert.strictEqual(binding.reportId, "report_mock");
assert.strictEqual(normalizeThoughtType("我怕错过，想立刻上车"), "fomo");

const tradeReviewState = {
  records: [
    {
      id: "r1",
      relatedMirror: "追涨之镜",
      firstThought: "怕错过",
      heartThieves: ["贪", "急"],
      trainingAction: "先停十秒。",
      historicalMatch: { stagePosition: "计划外拉升" }
    },
    {
      id: "r2",
      relatedMirror: "追涨之镜",
      firstThought: "想追进去",
      heartThieves: ["贪", "急"],
      trainingAction: "写下第一念。",
      historicalMatch: { stagePosition: "计划外拉升" }
    }
  ]
};

const loop = buildBehaviorLoop(tradeReviewState);
assert.strictEqual(loop.ready, true);
assert.ok(loop.line.includes("计划外拉升"));
assert.ok(loop.line.includes("追涨之镜"));

const progress = buildMiniLoopProgress({
  binding,
  assessment: { primary: "冲动型" },
  training7View: { completedCount: 3 },
  threeSeals: { completed: true },
  tradeReviewState,
  livingMirrorStats: { totalReviews: 2, currentMirror: "追涨之镜", topThievesText: "贪 / 急" },
  assistantHandoff: { ready: true },
  shareCardState: { records: { c1: {} } },
  inviteEvents: [{ id: "invite-1" }],
  retestSnapshots: {}
});

assert.strictEqual(progress.currentNode, "retest");
assert.strictEqual(progress.completedDays, 3);
assert.strictEqual(progress.tradeReviewCount, 2);
assert.strictEqual(progress.behaviorLoop.ready, true);

const home = buildMiniHomeView({
  loopProgress: progress,
  training7View: { currentDay: 3, today: { title: "观亏损后的证明欲", boundaryPractice: "先写下第一念。" } },
  threeSeals: { thought: "怕错过", completed: true }
});
assert.ok(home.positionText.includes("复测变化"));
assert.strictEqual(home.stateLabel, "已归卷");
assert.strictEqual(home.klineText, "今日 K 线观心");
assert.ok(home.livingMirrorFeedback.includes("写入活镜"));
assert.strictEqual(home.practiceSteps.filter((item) => item.done).length, 3);

const tree = buildLivingMirrorTree({
  assessment: { primary: "冲动型" },
  loopProgress: progress,
  tradeReviewState,
  livingMirrorStats: { currentMirror: "追涨之镜", totalReviews: 2, topThievesText: "贪 / 急" }
});
assert.strictEqual(tree.trunk, "追涨之镜");
assert.ok(tree.loopLine.includes("追涨之镜"));

console.log("mini-loop module tests passed");
