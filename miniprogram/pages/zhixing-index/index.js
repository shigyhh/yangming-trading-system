const {
  getProfile,
  updateProfile,
  getTodayMind,
  getMindRecords,
  getTodayTraining,
  getTrainingState,
  getReviews,
  getTodayReview,
  getAssessmentResult,
  getZhixingScoreState,
  saveZhixingScoreRecord,
  saveMindProfile,
  saveDailyLoopState,
  getTodayHeartCard,
  todayKey
} = require("../../utils/store");
const { buildContinuityState } = require("../../modules/continuity/index");
const { calculateZhixingIndex, buildZhixingRecordState } = require("../../modules/zhixing/index");
const { buildDailyLoopState } = require("../../modules/daily-loop/index");
const { buildCultivationGrowthState } = require("../../modules/cultivation/index");

Page({
  data: {
    mind: null,
    training: {},
    review: null,
    assessment: null,
    index: calculateZhixingIndex({}),
    growthLevel: {},
    growth: null,
    actions: []
  },

  onShow() {
    const profile = getProfile();
    const mind = getTodayMind();
    const mindRecords = getMindRecords();
    const training = getTodayTraining();
    const trainingState = getTrainingState();
    const reviews = getReviews();
    const review = getTodayReview();
    const assessment = getAssessmentResult();
    const zhixingScoreState = getZhixingScoreState();
    const heartCardRecord = getTodayHeartCard();
    const continuity = buildContinuityState({
      profile,
      trainingState,
      reviews,
      mindRecords,
      todayKey: todayKey()
    });
    const growth = buildCultivationGrowthState({
      todayKey: todayKey(),
      profile,
      assessment,
      mind,
      mindRecords,
      training,
      trainingState,
      reviews,
      todayReview: review,
      continuity,
      zhixingScoreState
    });
    const index = growth.zhixingIndex;
    const canSaveScore = !!review;
    const scoreState = canSaveScore ? saveZhixingScoreRecord(growth.scoreRecord) : zhixingScoreState;
    const recordState = buildZhixingRecordState(scoreState, { continuity, trainingState, reviews });
    const loopState = saveDailyLoopState(buildDailyLoopState({
      todayKey: todayKey(),
      profile,
      mind,
      assessment,
      training: growth.training,
      todayReview: review,
      zhixingScoreState: scoreState,
      heartCardRecord
    }));

    if (canSaveScore) {
      updateProfile({
        zhixingScore: index.total,
        growth_level: recordState.growthLevel.current.name
      });
      saveMindProfile(Object.assign({}, growth.mindProfile, { zhixing_score: index.total }));
    }

    this.setData({
      mind,
      training: growth.training,
      review,
      assessment,
      index,
      growthLevel: recordState.growthLevel,
      growth,
      loopState,
      actions: this.buildActions({ mind, training: growth.training, review, assessment, heartCardRecord })
    });
  },

  buildActions({ mind, training, review, assessment, heartCardRecord }) {
    const actions = [];
    if (!mind) actions.push({ label: "先做开盘照心", url: "/pages/mind/index" });
    if (!assessment) actions.push({ label: "完成九型人格", url: "/pages/assessment/index" });
    if (!training?.completed) actions.push({ label: "完成今日事上练", url: "/pages/training/index" });
    if (!review) actions.push({ label: "收盘后做省察", url: "/pages/review/index" });
    if (actions.length) return actions;
    if (!heartCardRecord || !heartCardRecord.completed) {
      return [{ label: "回首页落成心证卡", url: "/pages/home/index" }];
    }
    return [{ label: "回首页同修收束", url: "/pages/home/index" }];
  },

  goAction(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.redirectTo({ url });
  },

  goStages() {
    wx.navigateTo({ url: "/pages/stages/index" });
  },

  goRecord() {
    wx.navigateTo({ url: "/pages/zhixing-growth/index" });
  }
});
