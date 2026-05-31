const { getPersonalityStagePlan } = require("../../core/personality-stage-map");

const STAGES = [
  {
    key: "lizhi",
    no: 1,
    name: "立志",
    title: "第1关：立志",
    seal: "志",
    core: "交易戒律建立",
    goal: "建立交易戒律",
    subtitle: "先把交易戒律立在行动之前。",
    trainingFocus: ["写下交易计划", "写下仓位上限", "写下止损规则"],
    passingRule: "入门立志，并连续完成7日修行记录。",
    upgradeCondition: "三条戒律已落印，7日内至少完成照心、事上练或省察任一闭环。",
    unlockCriteria: "进入小程序即可开启。",
    completionEvidence: ["有交易计划", "有仓位规则", "有止损规则"],
    output: "生成今日戒律、行动边界和立志记录。",
    route: "/pages/home/index",
    action: "回到首页确认三条承诺"
  },
  {
    key: "zhaoxin",
    no: 2,
    name: "照心",
    title: "第2关：照心",
    seal: "照",
    core: "照见心境",
    goal: "照见此心",
    subtitle: "开盘前先看见此刻心境。",
    trainingFocus: ["贪", "惧", "急", "怒", "疲"],
    passingRule: "完成30日心境记录，并至少5次照见触发自己的心境。",
    upgradeCondition: "能稳定照见贪、惧、急，不把心境误当成评判。",
    unlockCriteria: "完成立志后开启。",
    completionEvidence: ["能识别贪", "能识别惧", "能识别急"],
    output: "生成今日心境、今日禁忌和今日照心提醒。",
    route: "/pages/mind/index",
    action: "完成今日开盘照心"
  },
  {
    key: "shishangmo",
    no: 3,
    name: "事上磨",
    title: "第3关：事上磨",
    seal: "磨",
    core: "盘中事上练",
    goal: "让规则进入行动",
    subtitle: "在真实一天里完成一个克己动作。",
    trainingFocus: ["止损知行合一", "不追涨", "不扛单"],
    passingRule: "完成50局K线事上练，并让边界知行合一率达到70%以上。",
    upgradeCondition: "触发边界后能知行合一，不追、不扛、不临盘辩解。",
    unlockCriteria: "完成照心和九型人格后开启。",
    completionEvidence: ["止损知行合一", "不追涨", "不扛单"],
    output: "生成每日事上练卡、完成记录和主修兑现分。",
    route: "/pages/training/index",
    action: "完成今日事上练"
  },
  {
    key: "poxinzei",
    no: 4,
    name: "破心贼",
    title: "第4关：破心贼",
    seal: "破",
    core: "省察克治人格惯性",
    goal: "破心中之贼",
    subtitle: "照见贪、急、怕、不甘等惯性。",
    trainingFocus: ["照见主人格", "找到当前心中之贼", "克治主人格"],
    passingRule: "照见主心贼，并完成30日针对事上练无明显复发。",
    upgradeCondition: "能把冲动、扛单、赌念、不甘等惯性转成具体克治动作。",
    unlockCriteria: "完成人格照见后开启。",
    completionEvidence: ["照见主人格", "克治主人格"],
    output: "生成当前人格、当前心贼、主修关卡、今日戒律和今日事上练。",
    route: "/pages/report/index",
    action: "查看人格心证，写下今日最大心贼"
  },
  {
    key: "zhixing",
    no: 5,
    name: "知行合一",
    title: "第5关：知行合一",
    seal: "合",
    core: "系统知行合一",
    goal: "计划与行动一致",
    subtitle: "让说过的计划，成为盘中的行动。",
    trainingFocus: ["连续知行合一", "不临盘改计划"],
    passingRule: "知行指数达到80，并连续30日保持稳定知行合一。",
    upgradeCondition: "盘前所知与盘中所行基本一致，不临盘改计划。",
    unlockCriteria: "完成每日修行后开启。",
    completionEvidence: ["连续知行合一", "不临盘改计划"],
    output: "生成知行指数、纪律知行分、系统一致性分和临盘克制分。",
    route: "/pages/zhixing-index/index",
    action: "查看知行指数并补齐缺口"
  },
  {
    key: "zhiliangzhi",
    no: 6,
    name: "致良知",
    title: "第6关：致良知",
    seal: "良",
    infinite: true,
    core: "稳定成熟交易者",
    goal: "形成成熟交易人格",
    subtitle: "把一次清醒，修成每日存养。",
    trainingFocus: ["自主省察", "照见此心", "长期稳定"],
    passingRule: "致良知不是终点，按一段、二段、三段持续升段。",
    upgradeCondition: "自主省察100日，并通过阶段省察；之后进入长期段位修行。",
    unlockCriteria: "形成连续修行记录后开启。",
    completionEvidence: ["自主省察", "照见此心", "长期稳定"],
    output: "生成成长阶段、知行成长曲线和长期修行路径。",
    route: "/pages/zhixing-growth/index",
    action: "查看连续修行与成长记录"
  }
];

const STAGE_SYSTEM_SCHEMA = {
  version: "v1",
  loop: ["人格照见", "照心", "修行关卡", "每日事上练", "知行指数"],
  stageKeys: STAGES.map((stage) => stage.key),
  requiredFields: ["key", "no", "name", "seal", "core", "goal", "trainingFocus", "passingRule", "upgradeCondition", "unlockCriteria", "completionEvidence", "output"]
};

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countObjectItems(object) {
  return Object.keys(object || {}).length;
}

function countCompletedTrainings(trainingState) {
  return Object.keys(trainingState || {}).filter((dayKey) => !!((trainingState || {})[dayKey] || {}).completed).length;
}

function countTruthSteps(training) {
  return Object.keys((training || {}).steps || {}).filter((key) => !!training.steps[key]).length;
}

function getTrainingCardStageKey(training) {
  return ((training || {}).trainingCard || {}).stageKey || "";
}

function applyTrainingProgress(progressMap, training) {
  const stageKey = getTrainingCardStageKey(training);
  if (!stageKey || !progressMap[stageKey]) return progressMap;
  const stepCount = countTruthSteps(training);
  const trainingProgress = clamp(34 + stepCount * 14 + (training.completed ? 24 : 0));
  return Object.assign({}, progressMap, {
    [stageKey]: Math.max(progressMap[stageKey], trainingProgress)
  });
}

function averageReviewScore(reviews) {
  const values = Object.keys(reviews || {})
    .map((dayKey) => Number((reviews[dayKey] || {}).score || 0))
    .filter(Boolean);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getStageProgressMap(context) {
  const safe = context || {};
  const profile = safe.profile || {};
  const assessment = safe.assessment || null;
  const mind = safe.mind || null;
  const mindRecords = safe.mindRecords || {};
  const training = safe.training || {};
  const trainingState = safe.trainingState || {};
  const review = safe.todayReview || null;
  const reviews = safe.reviews || {};
  const continuity = safe.continuity || {};
  const zhixingScore = Number((safe.zhixingScore || {}).total || (safe.zhixingScore || {}).latest?.total || 0);
  const stepCount = countTruthSteps(training);
  const reviewCount = countObjectItems(reviews);
  const mindCount = countObjectItems(mindRecords);
  const completedTrainings = countCompletedTrainings(trainingState);
  const streak = Number(continuity.currentStreak || profile.streak || 0);
  const reviewAverage = averageReviewScore(reviews);

  const progressMap = {
    lizhi: profile.vowsAccepted ? 100 : profile.phone ? 72 : 28,
    zhaoxin: mind ? clamp(60 + mindCount * 12) : clamp(20 + mindCount * 16),
    shishangmo: training.completed ? 100 : clamp(26 + stepCount * 22 + completedTrainings * 8),
    poxinzei: review ? 100 : clamp((assessment ? 32 : 12) + reviewCount * 18),
    zhixing: clamp(Math.max(assessment ? 42 : 22, zhixingScore || reviewAverage || 0)),
    zhiliangzhi: clamp(18 + streak * 8 + completedTrainings * 5 + reviewCount * 4 + Math.max(0, (zhixingScore || reviewAverage) - 72))
  };

  return applyTrainingProgress(progressMap, training);
}

function withStageStatus(stage, progress, previousProgress, forceUnlock) {
  const unlocked = stage.no === 1 || previousProgress >= 60 || forceUnlock;
  const safeProgress = unlocked ? clamp(progress) : 0;
  const infiniteTier = stage.infinite && safeProgress >= 100 ? Math.max(1, Math.floor(safeProgress / 100)) : 0;
  const status = !unlocked
    ? "未解锁"
    : stage.infinite
      ? (safeProgress >= 100 ? `致良知 · ${infiniteTier}段` : "长期修行")
      : safeProgress >= 100
        ? "已完成"
        : "进行中";
  return Object.assign({}, stage, {
    progress: safeProgress,
    unlocked,
    completed: stage.infinite ? false : safeProgress >= 100,
    status,
    progressText: status === "未解锁" ? "未解锁" : `已完成 ${safeProgress}%`
  });
}

function buildStageState(context) {
  const safe = context || {};
  const assessment = safe.assessment || null;
  const type = assessment ? assessment.primary : "平衡型";
  const personalityPlan = getPersonalityStagePlan(type);
  const progressMap = getStageProgressMap(safe);
  let previousProgress = 100;

  const stages = STAGES.map((stage) => {
    const item = withStageStatus(stage, progressMap[stage.key], previousProgress, stage.key === personalityPlan.stageKey);
    previousProgress = item.progress;
    return item;
  });

  const mappedStage = stages.find((stage) => stage.key === personalityPlan.stageKey) || stages[0];
  const activeStage = stages.find((stage) => stage.unlocked && !stage.completed) || mappedStage;
  const currentStage = mappedStage.unlocked ? mappedStage : activeStage;
  const completedStages = stages.filter((stage) => stage.completed);
  const lockedStages = stages.filter((stage) => !stage.unlocked);

  return {
    stages,
    activeStage,
    currentStage,
    mappedStage,
    completedStages,
    lockedStages,
    completedCount: completedStages.length,
    totalCount: stages.length,
    overall: clamp(stages.reduce((sum, stage) => sum + stage.progress, 0) / stages.length),
    personalityType: type,
    personalityPlan,
    currentGoal: personalityPlan.training || currentStage.action,
    currentCommandment: personalityPlan.commandment,
    heartThief: personalityPlan.heartThief
  };
}

function getStageDefinition(stageKey) {
  return STAGES.find((stage) => stage.key === stageKey) || STAGES[0];
}

function buildStageTrainingOverview() {
  return STAGES.map((stage) => ({
    key: stage.key,
    seal: stage.seal,
    title: stage.title,
    core: stage.core,
    goal: stage.goal,
    trainingFocus: stage.trainingFocus,
    passingRule: stage.passingRule,
    upgradeCondition: stage.upgradeCondition,
    unlockCriteria: stage.unlockCriteria,
    completionEvidence: stage.completionEvidence,
    output: stage.output
  }));
}

function buildMindProfile(context) {
  const safe = context || {};
  const stageState = buildStageState(safe);
  const zhixingScore = Number((safe.zhixingScore || {}).total || (safe.zhixingScore || {}).latest?.total || 0);
  const reviews = safe.reviews || {};
  const reviewCount = countObjectItems(reviews);
  const disciplineSamples = Object.keys(reviews)
    .map((dayKey) => reviews[dayKey] || {})
    .filter((item) => item.inSystem || item.executedStop || item.changedPlan);
  const disciplinePass = disciplineSamples.filter((item) => item.inSystem && item.executedStop && !item.changedPlan).length;
  const disciplineRate = disciplineSamples.length ? Math.round((disciplinePass / disciplineSamples.length) * 100) : 0;

  return {
    personality_type: stageState.personalityType,
    current_stage: stageState.currentStage.name,
    current_stage_key: stageState.currentStage.key,
    heart_thief: stageState.heartThief,
    zhixing_score: zhixingScore,
    discipline_rate: disciplineRate,
    reflection_count: reviewCount,
    streak_days: Number((safe.continuity || {}).currentStreak || (safe.profile || {}).streak || 0),
    current_mind_state: (safe.mind || {}).name || "",
    today_training: stageState.currentGoal,
    today_commandment: stageState.currentCommandment,
    updated_at: Date.now()
  };
}

module.exports = {
  STAGES,
  STAGE_SYSTEM_SCHEMA,
  getStageDefinition,
  buildStageTrainingOverview,
  buildStageState,
  buildMindProfile
};
