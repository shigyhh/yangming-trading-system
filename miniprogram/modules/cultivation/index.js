const { getPersonalityStagePlan } = require("../../core/personality-stage-map");
const { buildDailyLoopState } = require("../daily-loop/index");
const { buildDailyTrainingCard } = require("../practice/index");
const { buildStageState, buildMindProfile } = require("../stages/index");
const { calculateZhixingIndex, buildScoreRecord, buildZhixingRecordState } = require("../zhixing/index");

const CULTIVATION_GROWTH_SCHEMA = {
  version: "v1",
  name: "知行合一交易修行成长体系",
  loop: ["人格照见", "主修关卡", "每日事上练", "收盘省察", "知行指数", "心证卡"],
  rule: "九型人格必须映射六大关卡，知行指数必须读取人格、关卡、事上练与省察，心证卡必须成为当天成果物。",
  outputs: ["personalityPlan", "stageState", "dailyTrainingCard", "zhixingIndex", "mindProfile", "dailyLoopState"]
};

function buildCultivationGrowthState(context = {}) {
  const safe = context || {};
  const assessment = safe.assessment || null;
  const personalityType = assessment ? assessment.primary : "平衡型";
  const personalityPlan = getPersonalityStagePlan(personalityType);
  const dateKey = safe.todayKey || "";
  const training = safe.training || {};
  const dailyTrainingCard = training.trainingCard || buildDailyTrainingCard({
    dateKey,
    personalityType,
    mind: safe.mind,
    content: safe.content
  });
  const trainingWithCard = Object.assign({}, training, { trainingCard: dailyTrainingCard });
  const stageState = buildStageState(Object.assign({}, safe, {
    assessment,
    training: trainingWithCard
  }));
  const zhixingIndex = calculateZhixingIndex({
    mind: safe.mind,
    training: trainingWithCard,
    review: safe.todayReview || safe.review,
    assessment,
    stageState
  });
  const scoreRecord = buildScoreRecord({
    dayKey: dateKey,
    index: zhixingIndex,
    context: {
      continuity: safe.continuity,
      trainingState: safe.trainingState,
      reviews: safe.reviews
    }
  });
  const recordState = buildZhixingRecordState(safe.zhixingScoreState, {
    continuity: safe.continuity,
    trainingState: safe.trainingState,
    reviews: safe.reviews
  });
  const dailyLoopState = buildDailyLoopState({
    todayKey: dateKey,
    profile: safe.profile,
    mind: safe.mind,
    assessment,
    training: trainingWithCard,
    todayReview: safe.todayReview || safe.review,
    zhixingScoreState: safe.zhixingScoreState,
    heartCardRecord: safe.heartCardRecord || safe.heartCard
  });
  const mindProfile = buildMindProfile(Object.assign({}, safe, {
    assessment,
    training: trainingWithCard,
    zhixingScore: zhixingIndex
  }));

  return {
    version: CULTIVATION_GROWTH_SCHEMA.version,
    personalityType,
    personalityPlan,
    mainStage: stageState.mappedStage,
    activeStage: stageState.activeStage,
    stageState,
    dailyTrainingCard,
    training: trainingWithCard,
    zhixingIndex,
    scoreRecord,
    recordState,
    dailyLoopState,
    mindProfile,
    nextAction: stageState.currentGoal,
    commandment: stageState.currentCommandment,
    heartThief: stageState.heartThief
  };
}

module.exports = {
  CULTIVATION_GROWTH_SCHEMA,
  buildCultivationGrowthState
};
