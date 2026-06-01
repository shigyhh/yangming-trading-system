const RISK_BASELINE = {
  "冲动型": { entryImpulse: 86, stopResistance: 58, proving: 66, execution: 54, stability: 52 },
  "扛单型": { entryImpulse: 58, stopResistance: 88, proving: 70, execution: 56, stability: 54 },
  "完美型": { entryImpulse: 52, stopResistance: 62, proving: 58, execution: 68, stability: 62 },
  "赌徒型": { entryImpulse: 80, stopResistance: 70, proving: 88, execution: 48, stability: 46 },
  "从众型": { entryImpulse: 68, stopResistance: 60, proving: 62, execution: 52, stability: 56 },
  "偏执型": { entryImpulse: 62, stopResistance: 76, proving: 74, execution: 50, stability: 55 },
  "拖延型": { entryImpulse: 54, stopResistance: 64, proving: 58, execution: 42, stability: 58 },
  "焦虑型": { entryImpulse: 64, stopResistance: 66, proving: 72, execution: 52, stability: 44 },
  "平衡型": { entryImpulse: 46, stopResistance: 44, proving: 42, execution: 76, stability: 76 }
};

const METRICS = [
  { key: "entryImpulse", label: "入场冲动", direction: "down" },
  { key: "stopResistance", label: "止损抗拒", direction: "down" },
  { key: "proving", label: "亏损后证明欲", direction: "down" },
  { key: "execution", label: "计划执行力", direction: "up" },
  { key: "stability", label: "稳定度", direction: "up" }
];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value || 0))));
}

function getPersonalityRisk(type) {
  return Object.assign({}, RISK_BASELINE[type] || RISK_BASELINE["平衡型"]);
}

function buildRiskSnapshot({ assessment = {}, type = "baseline", day = 1, source = "assessment" } = {}) {
  const primary = (assessment || {}).primary || "平衡型";
  return {
    type,
    day,
    source,
    assessmentNo: Number((assessment || {}).assessmentNo || 0),
    primary,
    secondary: (assessment || {}).secondary || "待照见",
    riskRadar: getPersonalityRisk(primary),
    createdAt: Date.now()
  };
}

function getTrainingCompletion(training7State = {}) {
  const records = (training7State || {}).records || {};
  const completedDays = Object.keys(records).filter((day) => !!(records[day] || {}).completed).length;
  const day1Completed = !!((records[1] || {}).completed);
  const day3Completed = [1, 2, 3].every((day) => !!((records[day] || {}).completed));
  const day7Completed = [1, 2, 3, 4, 5, 6, 7].every((day) => !!((records[day] || {}).completed));
  return {
    completedDays,
    day1Completed,
    day3Completed,
    day7Completed,
    progress: Math.round((completedDays / 7) * 100)
  };
}

function getReviewCount(reviews = {}) {
  return Object.keys(reviews || {}).length;
}

function getLatestScore(zhixingScoreState = {}) {
  return Number(((zhixingScoreState || {}).latest || {}).total || 0);
}

function adjustRiskByTraining(baseRisk, trainingCompletion, reviews, latestScore) {
  const completedDays = Number((trainingCompletion || {}).completedDays || 0);
  const reviewCount = getReviewCount(reviews);
  const scoreLift = latestScore ? Math.max(0, Math.round((latestScore - 58) / 4)) : 0;
  const practiceLift = completedDays * 3 + Math.min(12, reviewCount * 2) + scoreLift;
  return {
    entryImpulse: clamp(baseRisk.entryImpulse - practiceLift),
    stopResistance: clamp(baseRisk.stopResistance - Math.round(practiceLift * 0.82)),
    proving: clamp(baseRisk.proving - Math.round(practiceLift * 0.72)),
    execution: clamp(baseRisk.execution + Math.round(practiceLift * 1.12)),
    stability: clamp(baseRisk.stability + Math.round(practiceLift * 0.92))
  };
}

function formatChange(metric, before, after) {
  const delta = after - before;
  if (metric.direction === "down") {
    if (delta < 0) return `下降 ${Math.abs(delta)}%`;
    if (delta > 0) return `仍偏高 +${delta}%`;
    return "持平";
  }
  if (delta > 0) return `提升 ${delta}%`;
  if (delta < 0) return `回落 ${Math.abs(delta)}%`;
  return "持平";
}

function buildSevenDayChange({
  assessmentHistory = [],
  assessment = null,
  training7State = {},
  reviews = {},
  zhixingScoreState = {},
  retestSnapshots = {}
} = {}) {
  const history = Array.isArray(assessmentHistory) ? assessmentHistory : [];
  const first = history[0] || assessment || {};
  const latest = history[history.length - 1] || assessment || first || {};
  const trainingCompletion = getTrainingCompletion(training7State);
  const baselineSnapshot = (retestSnapshots || {}).baseline || null;
  const retestSnapshot = (retestSnapshots || {}).retest || null;
  const firstRisk = baselineSnapshot && baselineSnapshot.riskRadar
    ? baselineSnapshot.riskRadar
    : getPersonalityRisk(first.primary || "平衡型");
  const latestRiskBase = retestSnapshot && retestSnapshot.riskRadar
    ? retestSnapshot.riskRadar
    : getPersonalityRisk(latest.primary || first.primary || "平衡型");
  const latestRisk = retestSnapshot && retestSnapshot.riskRadar
    ? latestRiskBase
    : adjustRiskByTraining(latestRiskBase, trainingCompletion, reviews, getLatestScore(zhixingScoreState));

  const metrics = METRICS.map((metric) => {
    const before = clamp(firstRisk[metric.key]);
    const after = clamp(latestRisk[metric.key]);
    return {
      key: metric.key,
      label: metric.label,
      before,
      after,
      value: formatChange(metric, before, after),
      improved: metric.direction === "down" ? after < before : after > before
    };
  });
  const improvedCount = metrics.filter((item) => item.improved).length;
  const ready = !!retestSnapshot || trainingCompletion.day7Completed || history.length >= 2;
  const hasSnapshotCompare = !!(baselineSnapshot && retestSnapshot);

  return {
    ready,
    title: hasSnapshotCompare ? "Day1 / Day7 复测变化" : ready ? "7 天观心变化" : "复测变化待完成",
    progressText: `${trainingCompletion.completedDays}/7`,
    day1Completed: trainingCompletion.day1Completed,
    day3Completed: trainingCompletion.day3Completed,
    day7Completed: trainingCompletion.day7Completed,
    retestCompleted: history.length >= 2 || !!retestSnapshot,
    fromType: (baselineSnapshot || first).primary || "待照见",
    toType: (retestSnapshot || latest).primary || first.primary || "待照见",
    baselineSnapshot,
    retestSnapshot,
    metrics,
    improvedCount,
    detail: hasSnapshotCompare
      ? `已基于 Day1 初测快照与 Day7 复测快照生成本地对比，${improvedCount} 项出现正向变化。`
      : ready
      ? `已基于本地训练记录、复盘记录与最近一次照见生成变化摘要，${improvedCount} 项出现正向变化。`
      : "完成 7 天训练或再次照见后，这里会呈现风险雷达的本地对比。",
    insight: improvedCount >= 3
      ? "变化不是来自外在判断，而是来自你开始看见并守住自己的反应。"
      : "先把记录做完整，变化才会被看见。"
  };
}

module.exports = {
  RISK_BASELINE,
  METRICS,
  buildRiskSnapshot,
  buildSevenDayChange,
  getTrainingCompletion,
  getPersonalityRisk
};
