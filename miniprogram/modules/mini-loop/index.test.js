const assert = require("assert");
const {
  buildBehaviorLoop,
  buildHomeTodayStateView,
  buildLivingMirrorTree,
  buildMiniHomeView,
  buildMiniLoopProgress,
  buildMiniProgramBinding,
  normalizeThoughtType,
  resolveHomeTodayStateAction
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

const todayStateView = buildHomeTodayStateView({
  status: "not_trained",
  nextAction: "K线训练",
  progress: 35,
  updatedAt: "2026-06-21T10:00:00.000Z",
  rawPayloadShouldNotLeak: true
});
assert.strictEqual(todayStateView.title, "今日所照");
assert.strictEqual(todayStateView.status, "not_trained");
assert.strictEqual(todayStateView.statusText, "待训练");
assert.strictEqual(todayStateView.nextActionText, "K线训练");
assert.strictEqual(todayStateView.progress, 35);
assert.equal(/T\d{2}:\d{2}:\d{2}/.test(todayStateView.updatedAt), false);
assert.ok(todayStateView.updatedAt.includes("更新"));
assert.strictEqual(Object.prototype.hasOwnProperty.call(todayStateView, "rawPayloadShouldNotLeak"), false);

const fallbackTodayStateView = buildHomeTodayStateView({
  status: "server_surprise",
  nextAction: "陌生动作",
  progress: -1
});
assert.strictEqual(fallbackTodayStateView.status, "unknown");
assert.strictEqual(fallbackTodayStateView.statusText, "活镜仍在显影");
assert.strictEqual(fallbackTodayStateView.nextActionText, "先照见这一念");
assert.strictEqual(fallbackTodayStateView.progress, 0);
assert.deepStrictEqual(resolveHomeTodayStateAction("照见一念"), {
  actionKey: "mind",
  route: "/pages/mind/index"
});
assert.deepStrictEqual(resolveHomeTodayStateAction("K线训练"), {
  actionKey: "kline",
  route: "/pages/kline-mind/index"
});
assert.deepStrictEqual(resolveHomeTodayStateAction("轻复盘"), {
  actionKey: "trade-review",
  route: "/pages/trade-review/index"
});
assert.deepStrictEqual(resolveHomeTodayStateAction("查看活镜"), {
  actionKey: "living-mirror",
  route: "/pages/living-mirror/index"
});
assert.deepStrictEqual(resolveHomeTodayStateAction("陌生动作"), {
  actionKey: "",
  route: ""
});

const tree = buildLivingMirrorTree({
  assessment: { primary: "冲动型" },
  loopProgress: progress,
  tradeReviewState,
  livingMirrorStats: { currentMirror: "追涨之镜", totalReviews: 2, topThievesText: "贪 / 急" }
});
assert.strictEqual(tree.trunk, "追涨之镜");
assert.ok(tree.loopLine.includes("追涨之镜"));

console.log("mini-loop module tests passed");
