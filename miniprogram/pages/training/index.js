const { TRAINING_PLANS } = require("../../utils/content");
const {
  getAssessmentResult,
  getTodayMind,
  getTodayTraining,
  saveTodayTraining,
  getTrainingState,
  getProfile,
  updateProfile,
  getZhixingScoreState,
  getTodayReview,
  getTodayHeartCard,
  saveDailyLoopState,
  todayKey
} = require("../../utils/store");
const { syncCheckIn, syncLocalState } = require("../../utils/api");
const { getPersonalityArchive } = require("../../modules/personality/index");
const { buildCompletionPatch } = require("../../modules/continuity/index");
const { getPersonalityStagePlan } = require("../../core/personality-stage-map");
const { buildDailyLoopState } = require("../../modules/daily-loop/index");
const { buildDailyTrainingCard } = require("../../modules/practice/index");

const STEP_META = [
  { id: "trigger", title: "照见触发场景", subtitle: "先看见今天最容易被牵动的一念" },
  { id: "micro", title: "完成事上练", subtitle: "只克治一个小动作，不追求复杂" },
  { id: "reflection", title: "写下省察一句", subtitle: "记录旧习气如何转成克治动作" }
];

function buildSteps(state) {
  return STEP_META.map((item) => Object.assign({}, item, { done: !!(state.steps || {})[item.id] }));
}

Page({
  data: {
    result: null,
    type: "冲动型",
    plan: TRAINING_PLANS["冲动型"],
    steps: [],
    progress: 0,
    reflection: "",
    completed: false,
    archive: null,
    stagePlan: null,
    mind: null,
    mindTask: "",
    indexFocus: "",
    trainingCard: null
  },

  onShow() {
    this.load();
  },

  load() {
    const result = getAssessmentResult();
    const mind = getTodayMind();
    const type = result ? result.primary : "冲动型";
    const archive = getPersonalityArchive(type);
    const stagePlan = getPersonalityStagePlan(type);
    const state = getTodayTraining();
    const trainingCard = buildDailyTrainingCard({ dateKey: todayKey(), personalityType: type, mind });
    const steps = buildSteps(state);
    const doneCount = steps.filter((item) => item.done).length;

    this.setData({
      result,
      type,
      plan: TRAINING_PLANS[type] || TRAINING_PLANS["冲动型"],
      archive,
      stagePlan,
      trainingCard,
      steps,
      progress: Math.round((doneCount / STEP_META.length) * 100),
      reflection: state.reflection || "",
      completed: !!state.completed,
      mind,
      mindTask: mind?.oneThing || state.mindTask || "",
      indexFocus: mind?.indexFocus || state.indexFocus || "知行合一"
    });
  },

  toggleStep(e) {
    const id = e.currentTarget.dataset.id;
    const state = getTodayTraining();
    const steps = Object.assign({}, state.steps);
    steps[id] = !steps[id];
    saveTodayTraining(Object.assign({}, state, { steps, trainingCard: this.data.trainingCard }));
    syncLocalState({ silent: true }).catch(() => {});
    this.load();
  },

  inputReflection(e) {
    this.setData({ reflection: e.detail.value });
  },

  saveReflection() {
    const text = (this.data.reflection || "").trim();
    if (!text) {
      wx.showToast({ title: "写一句真实省察", icon: "none" });
      return;
    }

    const state = getTodayTraining();
    const steps = Object.assign({}, state.steps, { reflection: true });
    saveTodayTraining(Object.assign({}, state, { reflection: text, steps, trainingCard: this.data.trainingCard }));
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: "省察已保存", icon: "success" });
    this.load();
  },

  completeDay() {
    if (this.data.completed) {
      this.goReview();
      return;
    }

    const doneCount = this.data.steps.filter((item) => item.done).length;
    if (doneCount < STEP_META.length) {
      wx.showToast({ title: "先完成三步事上练", icon: "none" });
      return;
    }

    const state = getTodayTraining();
    if (!state.completed) {
      const profile = getProfile();
      const nextTrainingState = Object.assign({}, getTrainingState(), {
        [todayKey()]: Object.assign({}, state, { completed: true, trainingCard: this.data.trainingCard, updatedAt: Date.now() })
      });
      updateProfile({
        points: Number(profile.points || 0) + 18,
        ...buildCompletionPatch(profile, nextTrainingState, todayKey())
      });
    }
    const savedTraining = saveTodayTraining(Object.assign({}, state, { completed: true, trainingCard: this.data.trainingCard }));
    saveDailyLoopState(buildDailyLoopState({
      todayKey: todayKey(),
      profile: getProfile(),
      mind: getTodayMind(),
      assessment: getAssessmentResult(),
      training: savedTraining,
      todayReview: getTodayReview(),
      zhixingScoreState: getZhixingScoreState(),
      heartCardRecord: getTodayHeartCard()
    }));
    syncCheckIn(`每日事上练完成：${this.data.type}`).catch(() => {});
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: "今日事上练完成", icon: "success" });
    this.load();
    setTimeout(() => {
      this.goReview();
    }, 420);
  },

  goReview() {
    wx.redirectTo({ url: "/pages/review/index" });
  },

  goAssessment() {
    wx.redirectTo({ url: "/pages/assessment/index" });
  },

  goMind() {
    wx.redirectTo({ url: "/pages/mind/index" });
  },

  goIndex() {
    wx.redirectTo({ url: "/pages/zhixing-index/index" });
  }
});
