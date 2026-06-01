const assert = require("assert");
const { buildRiskSnapshot, buildSevenDayChange, getTrainingCompletion } = require("./index");

const completion = getTrainingCompletion({
  records: {
    1: { completed: true },
    2: { completed: true },
    3: { completed: true },
    4: { completed: true },
    5: { completed: true },
    6: { completed: true },
    7: { completed: true }
  }
});

assert.strictEqual(completion.completedDays, 7);
assert.strictEqual(completion.day7Completed, true);

const change = buildSevenDayChange({
  assessmentHistory: [{ primary: "冲动型" }, { primary: "平衡型" }],
  training7State: { records: { 1: { completed: true }, 7: { completed: true } } },
  reviews: { "2026-06-01": { keptBoundary: true } },
  zhixingScoreState: { latest: { total: 76 } }
});

assert.strictEqual(change.ready, true);
assert.strictEqual(change.metrics.length, 5);
assert.ok(change.metrics.some((item) => item.label === "入场冲动"));

const snapshotChange = buildSevenDayChange({
  assessmentHistory: [{ primary: "冲动型" }, { primary: "平衡型" }],
  retestSnapshots: {
    baseline: buildRiskSnapshot({ assessment: { primary: "冲动型" }, type: "baseline", day: 1 }),
    retest: buildRiskSnapshot({ assessment: { primary: "平衡型" }, type: "retest", day: 7 })
  }
});

assert.strictEqual(snapshotChange.retestCompleted, true);
assert.ok(snapshotChange.title.includes("Day1"));

console.log("retest-change module tests passed");
