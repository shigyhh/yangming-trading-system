const assert = require("assert");
const { buildRetentionState } = require("./index");

function run() {
  const firstUse = buildRetentionState({
    todayKey: "2026-06-01",
    profile: { createdAt: new Date(2026, 4, 30).getTime() },
    assessment: null,
    continuity: { currentStreak: 0 },
    dailyContent: { dayNumber: 152, id: "Day152", stageName: "事上磨", heartProof: "真正的事上练，是边界到了能知行合一。" },
    loopState: { completedCount: 1, totalCount: 7, progress: 14, nextStep: { name: "开盘照心", action: "完成开盘照心", route: "/pages/mind/index" } }
  });
  assert.strictEqual(firstUse.retest.due, true);
  assert.strictEqual(firstUse.content365.progress, 42);
  assert.strictEqual(firstUse.loop.nextRoute, "/pages/mind/index");

  const dueRetest = buildRetentionState({
    todayKey: "2026-06-10",
    profile: { lastAssessmentAt: new Date(2026, 4, 30).getTime() },
    assessment: { primary: "冲动型" },
    continuity: { currentStreak: 8 },
    zhixingScoreState: { latest: { total: 72 } }
  });
  assert.strictEqual(dueRetest.retest.due, true);
  assert.strictEqual(dueRetest.membership.current.key, "member");
  assert.strictEqual(dueRetest.longTraining.milestone.day, 21);

  const reminder = buildRetentionState({
    reminderState: { enabled: true, time: "20:40", mode: "收盘省察" }
  });
  assert.strictEqual(reminder.reminder.label, "20:40 · 收盘省察");
}

run();
console.log("retention module tests passed");
