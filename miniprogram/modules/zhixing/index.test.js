const assert = require("assert");
const { calculateDailyZhixingMvp } = require("./index");

const index = calculateDailyZhixingMvp({
  threeSeals: { thought: "急躁", fear: "怕错过", boundary: "守住次数边界" },
  mind: { currentStatus: "平静", todayRisk: "频繁交易", todayBoundary: "次数边界" },
  training: { steps: { trigger: true, micro: true }, completed: true },
  review: { strongestReaction: "想证明自己", keptBoundary: true, deviatedPlan: false, insightLine: "边界让心慢下来" },
  training7View: { completedCount: 2, progressPercent: 28, today: { title: "观止损抗拒", tasks: [{ done: true }, { done: true }, { done: true }] } }
});

assert.ok(index.total >= 0 && index.total <= 100);
assert.deepStrictEqual(index.dimensions.map((item) => item.name), ["照见度", "守界度", "执行度", "复盘度", "稳定度"]);
assert.strictEqual(index.mainStage.name, "观止损抗拒");
assert.ok(index.dimensions.find((item) => item.key === "boundary").score > 70);

console.log("zhixing module tests passed");
