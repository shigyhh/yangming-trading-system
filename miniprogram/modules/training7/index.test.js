const assert = require("assert");
const { TRAINING_7_DAYS, buildTraining7View, isDayCompleted } = require("./index");

assert.strictEqual(TRAINING_7_DAYS.length, 7);
assert.ok(TRAINING_7_DAYS.every((item) => item.boundaryPractice));
assert.ok(TRAINING_7_DAYS.every((item) => item.stage));
assert.ok(TRAINING_7_DAYS.every((item) => item.tasks.every((task) => task.id && task.title)));
assert.deepStrictEqual(
  TRAINING_7_DAYS.map((item) => item.title),
  [
    "观入场冲动",
    "观止损抗拒",
    "观亏损后的证明欲",
    "观盈利后的失控",
    "观加仓与扛单",
    "观计划执行断裂",
    "复盘与复测"
  ]
);

assert.strictEqual(isDayCompleted({ tasks: { reaction: true, kline: true, checkin: true } }), true);
assert.strictEqual(isDayCompleted({ tasks: { reaction: true, kline: true } }), false);
assert.strictEqual(isDayCompleted({ tasks: {
  opening_check: true,
  intraday_boundary: true,
  reaction_record: true,
  daily_practice: true,
  closing_review: true
} }), true);

const view = buildTraining7View(
  {
    currentDay: 7,
    records: {
      1: { tasks: { opening_check: true, intraday_boundary: true, reaction_record: true, daily_practice: true, closing_review: true } },
      7: { tasks: { opening_check: true, intraday_boundary: true } }
    }
  },
  {}
);

assert.strictEqual(view.currentDay, 7);
assert.strictEqual(view.today.title, "复盘与复测");
assert.strictEqual(view.today.tasks.find((task) => task.key === "opening_check").done, true);
assert.strictEqual(view.today.tasks.find((task) => task.key === "intraday_boundary").done, true);
assert.strictEqual(view.today.tasks.find((task) => task.key === "reaction_record").done, false);
assert.strictEqual(view.canRetest, true);

console.log("training7 module tests passed");
