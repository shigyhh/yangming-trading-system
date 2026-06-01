const {
  getProfile,
  getAssessmentResult,
  getTodayMind,
  getMindRecords,
  getTodayTraining,
  getTrainingState,
  getReviews,
  getTodayReview,
  getZhixingScoreState,
  getTodayReaction,
  getTodayIntradayBoundaryRecord,
  getTraining7State,
  saveTraining7State,
  saveMindProfile,
  todayKey
} = require("../../utils/store");
const { buildContinuityState } = require("../../modules/continuity/index");
const { buildStageState, buildMindProfile, buildStageTrainingOverview } = require("../../modules/stages/index");
const { buildTraining7View } = require("../../modules/training7/index");

Page({
  data: {
    stageState: buildStageState({}),
    stages: [],
    stageOverview: buildStageTrainingOverview(),
    currentStage: {},
    personalityPlan: {},
    mindProfile: {},
    training7View: buildTraining7View({}, {})
  },

  onShow() {
    this.load();
  },

  load() {
    const profile = getProfile();
    const assessment = getAssessmentResult();
    const mind = getTodayMind();
    const mindRecords = getMindRecords();
    const training = getTodayTraining();
    const trainingState = getTrainingState();
    const reviews = getReviews();
    const todayReview = getTodayReview();
    const zhixingState = getZhixingScoreState();
    const training7View = buildTraining7View(getTraining7State(), {
      mind,
      reactionRecord: getTodayReaction(),
      intradayBoundaryRecord: getTodayIntradayBoundaryRecord(),
      review: todayReview,
      training
    });
    const continuity = buildContinuityState({
      profile,
      trainingState,
      reviews,
      mindRecords,
      todayKey: todayKey()
    });
    const context = {
      profile,
      assessment,
      mind,
      mindRecords,
      training,
      trainingState,
      reviews,
      todayReview,
      continuity,
      zhixingScore: zhixingState.latest
    };
    const stageState = buildStageState(context);
    const mindProfile = saveMindProfile(buildMindProfile(context));

    this.setData({
      stageState,
      stages: stageState.stages,
      stageOverview: buildStageTrainingOverview(),
      currentStage: stageState.currentStage,
      personalityPlan: stageState.personalityPlan,
      mindProfile,
      training7View
    });
  },

  goStage(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const stage = this.data.stages[index];
    if (!stage || !stage.unlocked) {
      wx.showToast({ title: "先完成前一关", icon: "none" });
      return;
    }
    wx.redirectTo({ url: stage.route });
  },

  goCurrent() {
    const stage = this.data.currentStage || {};
    wx.redirectTo({ url: stage.route || "/pages/home/index" });
  },

  goRecord() {
    wx.navigateTo({ url: "/pages/zhixing-growth/index" });
  },

  selectTrainingDay(e) {
    const day = Number(e.currentTarget.dataset.day || 1);
    saveTraining7State({ currentDay: day });
    wx.redirectTo({ url: "/pages/training/index" });
  },

  goRetest() {
    wx.redirectTo({ url: "/pages/assessment/index" });
  }
});
