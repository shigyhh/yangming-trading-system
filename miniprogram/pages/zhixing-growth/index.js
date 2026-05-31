const {
  getProfile,
  updateProfile,
  getAssessmentResult,
  getTodayMind,
  getMindRecords,
  getTodayTraining,
  getTrainingState,
  getReviews,
  getTodayReview,
  getZhixingScoreState,
  saveZhixingScoreRecord,
  saveMindProfile,
  todayKey
} = require("../../utils/store");
const { buildContinuityState } = require("../../modules/continuity/index");
const { buildZhixingRecordState } = require("../../modules/zhixing/index");
const { buildCultivationGrowthState } = require("../../modules/cultivation/index");

const BASELINE_CURVE = [61, 65, 68, 72, 75];

function buildCurveDays(records = []) {
  const realRecords = (records || []).slice(-7);
  if (realRecords.length >= 5) return realRecords;
  const seedCount = Math.max(0, 5 - realRecords.length);
  const seed = BASELINE_CURVE.slice(0, seedCount).map((total, index) => ({
    dayKey: `baseline-${index + 1}`,
    label: `第${index + 1}日`,
    total,
    stateLabel: "成长基线",
    growthLevel: "观己",
    baseline: true
  }));
  return seed.concat(realRecords).slice(-7);
}

Page({
  data: {
    latest: null,
    recordState: buildZhixingRecordState({}),
    weekDays: [],
    monthDays: [],
    growthLevel: {},
    requirements: [],
    records: []
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
    const review = getTodayReview();
    const zhixingScoreState = getZhixingScoreState();
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
    const context = { continuity, trainingState, reviews };
    const savedState = saveZhixingScoreRecord(growth.scoreRecord);
    const recordState = buildZhixingRecordState(savedState, context);
    const curveDays = buildCurveDays(recordState.records);

    updateProfile({
      zhixingScore: index.total,
      growth_level: recordState.growthLevel.current.name
    });
    saveMindProfile(Object.assign({}, growth.mindProfile, { zhixing_score: index.total }));

    this.setData({
      latest: savedState.latest,
      recordState,
      weekDays: curveDays,
      monthDays: recordState.monthTrend.days,
      growthLevel: recordState.growthLevel,
      requirements: recordState.growthLevel.requirements,
      records: recordState.records.slice(-10).reverse()
    });
  },

  goIndex() {
    wx.redirectTo({ url: "/pages/zhixing-index/index" });
  },

  goStages() {
    wx.navigateTo({ url: "/pages/stages/index" });
  }
});
