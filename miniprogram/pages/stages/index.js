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
  saveMindProfile,
  todayKey
} = require("../../utils/store");
const { buildContinuityState } = require("../../modules/continuity/index");
const { buildStageState, buildMindProfile, buildStageTrainingOverview } = require("../../modules/stages/index");

Page({
  data: {
    stageState: buildStageState({}),
    stages: [],
    stageOverview: buildStageTrainingOverview(),
    currentStage: {},
    personalityPlan: {},
    mindProfile: {}
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
      mindProfile
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
  }
});
