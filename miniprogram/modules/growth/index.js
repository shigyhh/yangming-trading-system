const GROWTH_GATES = [
  {
    key: "vow",
    name: "立志",
    title: "先立其志",
    subtitle: "把交易戒律写在行动之前。",
    action: "回到首页完成三条承诺"
  },
  {
    key: "mind",
    name: "照心",
    title: "开盘照心",
    subtitle: "先看见此刻之心，再进入市场。",
    action: "完成今日开盘照心"
  },
  {
    key: "practice",
    name: "事上磨",
    title: "一日一练",
    subtitle: "把一个小动作落在真实一天里。",
    action: "完成今日事上练"
  },
  {
    key: "heartThief",
    name: "破心贼",
    title: "照见惯性",
    subtitle: "看见最容易牵动自己的那一念。",
    action: "完成九型人格照见或今日省察"
  },
  {
    key: "zhixing",
    name: "知行合一",
    title: "知行校准",
    subtitle: "让说过的计划，成为盘中的行动。",
    action: "查看知行指数"
  },
  {
    key: "conscience",
    name: "致良知",
    title: "守中复明",
    subtitle: "让稳定不靠状态，而靠每日存养。",
    action: "连续完成照心、事上练、省察"
  }
];

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countCompletedTrainings(trainingState) {
  return Object.keys(trainingState || {}).filter((key) => {
    const item = trainingState[key] || {};
    return !!item.completed;
  }).length;
}

function averageReviewScore(reviews) {
  const values = Object.keys(reviews || {}).map((key) => Number((reviews[key] || {}).score || 0)).filter(Boolean);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, item) => sum + item, 0) / values.length);
}

function countCompletedDojoTasks(dojoState) {
  const records = (dojoState || {}).taskRecords || {};
  return Object.keys(records).filter((dayKey) => !!(records[dayKey] || {}).completed).length;
}

function withStatus(gate, progress) {
  const safeProgress = clamp(progress);
  return Object.assign({}, gate, {
    progress: safeProgress,
    status: safeProgress >= 100 ? "已通关" : safeProgress >= 55 ? "修行中" : "待开启"
  });
}

function buildGrowthState(context) {
  const safeContext = context || {};
  const profile = safeContext.profile || {};
  const assessment = safeContext.assessment || null;
  const mind = safeContext.mind || null;
  const training = safeContext.training || {};
  const trainingState = safeContext.trainingState || {};
  const reviews = safeContext.reviews || {};
  const todayReview = safeContext.todayReview || null;
  const continuity = safeContext.continuity || {};
  const dojoState = safeContext.dojoState || {};
  const todayDojo = ((dojoState.taskRecords || {})[safeContext.todayKey || ""] || {});
  const dojoTaskCount = countCompletedDojoTasks(dojoState);
  const dojoBoost = (todayDojo.accepted ? 6 : 0) + (todayDojo.completed ? 12 : 0);
  const stepCount = Object.keys(training.steps || {}).filter((key) => training.steps[key]).length;
  const completedTrainings = countCompletedTrainings(trainingState);
  const reviewCount = Object.keys(reviews || {}).length;
  const averageScore = averageReviewScore(reviews);
  const streak = Number(continuity.currentStreak || profile.streak || 0);

  const gates = [
    withStatus(GROWTH_GATES[0], profile.vowsAccepted ? 100 : profile.phone ? 66 : 28),
    withStatus(GROWTH_GATES[1], mind ? 100 : 24),
    withStatus(GROWTH_GATES[2], training.completed ? 100 : 28 + stepCount * 22 + dojoBoost),
    withStatus(GROWTH_GATES[3], todayReview ? 100 : (assessment ? 72 : Math.min(86, reviewCount * 18))),
    withStatus(GROWTH_GATES[4], Math.min(100, 28 + (assessment ? 18 : 0) + (todayReview ? 20 : 0) + Math.max(0, averageScore - 58))),
    withStatus(GROWTH_GATES[5], Math.min(100, 24 + streak * 10 + completedTrainings * 8 + dojoTaskCount * 5 + Math.max(0, averageScore - 70)))
  ];

  const activeGate = gates.find((item) => item.progress < 100) || gates[gates.length - 1];
  const overall = clamp(gates.reduce((sum, item) => sum + item.progress, 0) / gates.length);
  const completedCount = gates.filter((item) => item.progress >= 100).length;
  const growthRecords = [
    { key: "streak", label: "连续修行", value: streak, unit: "天", note: continuity.stateLabel || "今日起修" },
    { key: "training", label: "事上练完成", value: completedTrainings, unit: "次", note: "每次事上练都反哺关卡进度" },
    { key: "review", label: "省察记录", value: reviewCount, unit: "条", note: "每条省察都让旧反应更清楚" },
    { key: "dojo", label: "共修任务", value: dojoTaskCount, unit: "次", note: "与同修一起守住今日一事" }
  ];

  return {
    gates,
    activeGate,
    overall,
    completedCount,
    totalCount: gates.length,
    averageScore,
    completedTrainings,
    reviewCount,
    dojoTaskCount,
    dojoTaskCompleted: !!todayDojo.completed,
    dojoTaskAccepted: !!todayDojo.accepted,
    streak,
    growthRecords,
    milestones: continuity.milestones || [],
    unlockedMilestoneCount: continuity.unlockedMilestoneCount || 0,
    milestone: continuity.milestone || { label: "7日连修", remaining: Math.max(0, 7 - streak), target: 7 },
    todayProgressText: continuity.todayProgressText || "0/3",
    stateLabel: overall >= 88 ? "渐入良知" : overall >= 66 ? "事上磨练" : "立志照心",
    nextAction: activeGate.action
  };
}

module.exports = {
  GROWTH_GATES,
  buildGrowthState
};
