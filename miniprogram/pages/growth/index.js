const {
  getProfile,
  getAssessmentResult,
  getTodayMind,
  getTodayTraining,
  getTrainingState,
  getMindRecords,
  getReviews,
  getTodayReview,
  getDojoState,
  todayKey
} = require("../../utils/store");
const { buildGrowthState } = require("../../modules/growth/index");
const { buildContinuityState } = require("../../modules/continuity/index");

Page({
  data: {
    growth: buildGrowthState({}),
    continuity: buildContinuityState({}),
    gates: [],
    recentDays: []
  },

  onShow() {
    this.load();
  },

  load() {
    const profile = getProfile();
    const trainingState = getTrainingState();
    const reviews = getReviews();
    const mindRecords = getMindRecords();
    const dojoState = getDojoState();
    const today = todayKey();
    const continuity = buildContinuityState({
      profile,
      trainingState,
      reviews,
      mindRecords,
      todayKey: today
    });
    const growth = buildGrowthState({
      profile,
      assessment: getAssessmentResult(),
      mind: getTodayMind(),
      training: getTodayTraining(),
      trainingState,
      reviews,
      todayReview: getTodayReview(),
      continuity,
      dojoState,
      todayKey: today
    });
    this.setData({ growth, continuity, gates: growth.gates, recentDays: continuity.recentDays });
  },

  goNext() {
    const key = this.data.growth.activeGate && this.data.growth.activeGate.key;
    const map = {
      vow: "/pages/home/index",
      mind: "/pages/mind/index",
      practice: "/pages/training/index",
      heartThief: "/pages/assessment/index",
      zhixing: "/pages/zhixing-index/index",
      conscience: "/pages/zhixing-index/index"
    };
    wx.redirectTo({ url: map[key] || "/pages/home/index" });
  },

  goIndex() {
    wx.redirectTo({ url: "/pages/zhixing-index/index" });
  },

  goDojo() {
    wx.navigateTo({ url: "/pages/dojo/index" });
  },

  onShareAppMessage() {
    const streak = this.data.continuity.currentStreak || 0;
    const milestone = this.data.continuity.milestone || {};
    return {
      title: `我已连续修行${streak}天，下一阶：${milestone.label || "7日连修"}`,
      path: "/pages/home/index"
    };
  }
});
