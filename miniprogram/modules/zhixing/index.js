const GROWTH_LEVELS = [
  { key: "guanji", name: "观己", minScore: 0, minStreak: 0, minTasks: 0, minReviews: 0 },
  { key: "shouzhi", name: "守志", minScore: 55, minStreak: 1, minTasks: 1, minReviews: 0 },
  { key: "zhaoxin", name: "照心", minScore: 62, minStreak: 2, minTasks: 2, minReviews: 1 },
  { key: "shishangmo", name: "事上磨", minScore: 68, minStreak: 4, minTasks: 4, minReviews: 2 },
  { key: "pozei", name: "破贼", minScore: 74, minStreak: 7, minTasks: 7, minReviews: 4 },
  { key: "zhixing", name: "知行", minScore: 80, minStreak: 14, minTasks: 12, minReviews: 8 },
  { key: "shouyi", name: "守一", minScore: 86, minStreak: 21, minTasks: 18, minReviews: 14 },
  { key: "liangzhi", name: "良知", minScore: 92, minStreak: 49, minTasks: 36, minReviews: 28 }
];

const PERSONALITY_STAGE_BIAS = {
  "冲动型": { discipline: -4, emotion: -8, system: -2, restraint: -9 },
  "扛单型": { discipline: -10, emotion: -2, system: -6, restraint: -5 },
  "赌徒型": { discipline: -8, emotion: -7, system: -4, restraint: -10 },
  "焦虑型": { discipline: -2, emotion: -9, system: -5, restraint: -3 },
  "完美型": { discipline: -3, emotion: -6, system: -2, restraint: -1 },
  "从众型": { discipline: -5, emotion: -4, system: -9, restraint: -3 },
  "偏执型": { discipline: -4, emotion: -2, system: -8, restraint: -4 },
  "拖延型": { discipline: -9, emotion: -2, system: -7, restraint: -2 },
  "平衡型": { discipline: 2, emotion: 2, system: 2, restraint: 2 }
};

const ZHIXING_SCORE_RULE = {
  version: "v1",
  range: [20, 98],
  dimensions: [
    { key: "discipline", name: "纪律知行", weight: 0.26 },
    { key: "emotion", name: "情绪稳定", weight: 0.2 },
    { key: "system", name: "系统一致性", weight: 0.22 },
    { key: "restraint", name: "临盘克制", weight: 0.16 },
    { key: "stageGrowth", name: "主修兑现", weight: 0.16 }
  ],
  inputs: ["九型人格", "主修关卡", "今日照心", "每日事上练", "心性省察"],
  boundary: "不读取收益、股票代码、账户金额。"
};

const MIND_SCORE = {
  静: 88,
  空: 74,
  疲: 66,
  惧: 62,
  急: 58,
  贪: 56,
  怒: 52,
  赌: 46
};

function clamp(value, min = 20, max = 98) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function getDimensionWeight(key) {
  const dimension = ZHIXING_SCORE_RULE.dimensions.find((item) => item.key === key);
  return dimension ? dimension.weight : 0;
}

function getStageFromState(stageState, stageKey) {
  if (!stageState) return null;
  if (stageState.mappedStage && (!stageKey || stageState.mappedStage.key === stageKey)) return stageState.mappedStage;
  return (stageState.stages || []).find((stage) => stage.key === stageKey) || stageState.currentStage || null;
}

function calculateZhixingIndex({ mind, training, review, assessment, stageState } = {}) {
  const steps = (training || {}).steps || {};
  const stepCount = Object.keys(steps).filter((key) => steps[key]).length;
  const completed = !!(training && training.completed);
  const reviewScore = review ? Number(review.score || 72) : 0;
  const mindName = mind ? mind.name : "";
  const mindBase = mind ? (MIND_SCORE[mindName] || 70) : 56;
  const hasAssessment = !!assessment;
  const hasTrainingCard = !!(training && training.trainingCard);
  const personalityType = assessment ? assessment.primary : "待识别";
  const personalityBias = PERSONALITY_STAGE_BIAS[personalityType] || PERSONALITY_STAGE_BIAS["平衡型"];
  const trainingStageKey = (training || {}).trainingCard ? training.trainingCard.stageKey : "";
  const mainStage = getStageFromState(stageState, trainingStageKey);
  const mainStageProgress = mainStage ? Number(mainStage.progress || 0) : 0;
  const mappedStageName = mainStage ? mainStage.title || mainStage.stageName || mainStage.name : ((training || {}).trainingCard || {}).stageName || "待映射";
  const stageAligned = hasAssessment && hasTrainingCard && !!trainingStageKey && (!mainStage || mainStage.key === trainingStageKey);

  const discipline = clamp(
    42 +
    stepCount * 9 +
    (completed ? 13 : 0) +
    (review ? (review.inSystem ? 12 : -8) : 0) +
    (review ? (review.executedStop ? 8 : -4) : 0) -
    (review && review.changedPlan ? 14 : 0) +
    personalityBias.discipline +
    (stageAligned ? 5 : 0)
  );
  const emotion = clamp(
    mindBase +
    (review ? 8 : 0) -
    (review && review.revenge ? 18 : 0) -
    (review && review.chased ? 10 : 0) -
    (review && review.held ? 8 : 0) +
    personalityBias.emotion
  );
  const system = clamp(
    48 +
    (hasAssessment ? 13 : 0) +
    (hasTrainingCard ? 7 : 0) +
    (completed ? 8 : 0) +
    (review ? Math.max(-12, Math.min(16, reviewScore - 70)) : 0) +
    (review && review.inSystem ? 6 : 0) +
    personalityBias.system +
    (stageAligned ? 8 : -4) +
    Math.min(10, Math.round(mainStageProgress / 10))
  );
  const restraint = clamp(
    56 +
    (mind ? 8 : 0) +
    (stepCount >= 1 ? 6 : 0) +
    (completed ? 7 : 0) -
    (review && review.chased ? 16 : 0) -
    (review && review.revenge ? 18 : 0) -
    (review && review.changedPlan ? 12 : 0) +
    personalityBias.restraint +
    (stageAligned ? 4 : 0)
  );
  const stageGrowth = clamp(
    34 +
    (hasAssessment ? 12 : 0) +
    (stageAligned ? 14 : 0) +
    Math.round(mainStageProgress * 0.28) +
    (completed ? 12 : 0) +
    stepCount * 4 +
    (review ? 6 : 0)
  );
  const total = clamp(
    discipline * getDimensionWeight("discipline") +
    emotion * getDimensionWeight("emotion") +
    system * getDimensionWeight("system") +
    restraint * getDimensionWeight("restraint") +
    stageGrowth * getDimensionWeight("stageGrowth")
  );

  return {
    version: ZHIXING_SCORE_RULE.version,
    total,
    personality: {
      type: personalityType,
      bias: personalityBias
    },
    mainStage: {
      key: mainStage ? mainStage.key : trainingStageKey,
      name: mappedStageName,
      progress: mainStageProgress,
      aligned: stageAligned
    },
    growthBinding: `${personalityType} · ${mappedStageName}`,
    dimensions: [
      { key: "discipline", name: "纪律知行", score: discipline, hint: review ? "来自今日省察与规则知行" : "完成省察后更准确" },
      { key: "emotion", name: "情绪稳定", score: emotion, hint: mind ? `今日心境：${mind.name}` : "开盘照心后生成" },
      { key: "system", name: "系统一致性", score: system, hint: assessment ? `九型心证：${assessment.primary}` : "完成九型照见后增强" },
      { key: "restraint", name: "临盘克制", score: restraint, hint: "衡量是否被一念带走" },
      { key: "stageGrowth", name: "主修兑现", score: stageGrowth, hint: mainStage ? `绑定${mappedStageName}，进度${mainStageProgress}%` : "完成人格照见后绑定主修关卡" }
    ],
    weights: ZHIXING_SCORE_RULE.dimensions,
    stateLabel: total >= 82 ? "守中有度" : total >= 68 ? "事上磨练" : "知而待行"
  };
}

function countCompletedTrainings(trainingState) {
  return Object.keys(trainingState || {}).filter((dayKey) => !!((trainingState || {})[dayKey] || {}).completed).length;
}

function countReviews(reviews) {
  return Object.keys(reviews || {}).length;
}

function buildGrowthLevel({ score = 0, continuity = {}, trainingState = {}, reviews = {} } = {}) {
  const currentStreak = Number(continuity.currentStreak || 0);
  const completedTasks = countCompletedTrainings(trainingState);
  const reviewCount = countReviews(reviews);
  let current = GROWTH_LEVELS[0];

  GROWTH_LEVELS.forEach((level) => {
    const reached =
      score >= level.minScore &&
      currentStreak >= level.minStreak &&
      completedTasks >= level.minTasks &&
      reviewCount >= level.minReviews;
    if (reached) current = level;
  });

  const nextIndex = Math.min(GROWTH_LEVELS.length - 1, GROWTH_LEVELS.findIndex((item) => item.key === current.key) + 1);
  const next = GROWTH_LEVELS[nextIndex] || current;
  const requirements = [
    { label: "知行指数", current: score, target: next.minScore },
    { label: "连续修行", current: currentStreak, target: next.minStreak },
    { label: "完成任务", current: completedTasks, target: next.minTasks },
    { label: "省察记录", current: reviewCount, target: next.minReviews }
  ];
  const progress = next.key === current.key
    ? 100
    : Math.round(requirements.reduce((sum, item) => {
        if (!item.target) return sum + 25;
        return sum + Math.min(25, Math.round((item.current / item.target) * 25));
      }, 0));

  return {
    current,
    next,
    requirements,
    progress,
    label: current.name,
    nextText: next.key === current.key ? "已至当前最高阶，继续每日存养。" : `下一阶：${next.name}`
  };
}

function normalizeRecords(scoreState) {
  const records = (scoreState || {}).records || {};
  return Object.keys(records)
    .sort()
    .map((dayKey) => Object.assign({ dayKey, label: dayKey.slice(5) }, records[dayKey]));
}

function buildTrend(records, count) {
  const list = (records || []).slice(-count);
  const average = list.length
    ? Math.round(list.reduce((sum, item) => sum + Number(item.total || 0), 0) / list.length)
    : 0;
  const first = list[0] ? Number(list[0].total || 0) : 0;
  const last = list[list.length - 1] ? Number(list[list.length - 1].total || 0) : 0;
  return {
    days: list,
    average,
    delta: list.length > 1 ? last - first : 0,
    label: list.length ? `${list.length}日均值 ${average}` : "暂无记录"
  };
}

function buildZhixingRecordState(scoreState, context = {}) {
  const records = normalizeRecords(scoreState);
  const latest = records[records.length - 1] || (scoreState || {}).latest || null;
  const growthLevel = buildGrowthLevel({
    score: latest ? Number(latest.total || 0) : 0,
    continuity: context.continuity,
    trainingState: context.trainingState,
    reviews: context.reviews
  });

  return {
    records,
    latest,
    growthLevel,
    weekTrend: buildTrend(records, 7),
    monthTrend: buildTrend(records, 30)
  };
}

function buildScoreRecord({ dayKey, index, context = {} }) {
  const growthLevel = buildGrowthLevel({
    score: Number((index || {}).total || 0),
    continuity: context.continuity,
    trainingState: context.trainingState,
    reviews: context.reviews
  });
  return {
    dayKey,
    label: dayKey.slice(5),
    total: Number((index || {}).total || 0),
    stateLabel: (index || {}).stateLabel || "",
    personality: (index || {}).personality || null,
    mainStage: (index || {}).mainStage || null,
    growthBinding: (index || {}).growthBinding || "",
    dimensions: (index || {}).dimensions || [],
    growthLevel: growthLevel.current.name,
    createdAt: Date.now()
  };
}

module.exports = {
  ZHIXING_SCORE_RULE,
  GROWTH_LEVELS,
  calculateZhixingIndex,
  buildGrowthLevel,
  buildZhixingRecordState,
  buildScoreRecord
};
