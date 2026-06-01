const {
  getTodayIntradayBoundaryRecord,
  saveTodayIntradayBoundaryRecord,
  getTraining7State,
  saveTraining7Task,
  todayKey
} = require("../../utils/store");
const { syncLocalState, syncTrainingProgress } = require("../../utils/api");
const { promptShareMoment } = require("../../utils/share-moments");

const TRIGGER_OPTIONS = ["边界被触碰", "念头变急", "不甘出现", "想证明", "计划松动", "情绪升高"];
const REACTION_OPTIONS = ["停十秒", "先记录", "回到计划", "离开屏幕", "延后判断", "请助教复盘"];
const BOUNDARY_OPTIONS = ["仓位边界", "止损边界", "次数边界", "时间边界", "情绪边界", "计划边界"];

Page({
  data: {
    form: getTodayIntradayBoundaryRecord(),
    triggerOptions: TRIGGER_OPTIONS,
    reactionOptions: REACTION_OPTIONS,
    boundaryOptions: BOUNDARY_OPTIONS,
    saved: false
  },

  onShow() {
    const form = getTodayIntradayBoundaryRecord();
    this.setData({ form, saved: !!form.completed });
  },

  selectOption(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.currentTarget.dataset.value;
    this.setData({
      form: Object.assign({}, this.data.form || {}, { [key]: value })
    });
  },

  inputField(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({
      form: Object.assign({}, this.data.form || {}, { [key]: e.detail.value })
    });
  },

  saveBoundary() {
    const form = this.data.form || {};
    if (!form.firstReaction || !form.boundary) {
      wx.showToast({ title: "请记录反应与边界", icon: "none" });
      return;
    }
    const saved = saveTodayIntradayBoundaryRecord(Object.assign({}, form, {
      dayKey: todayKey(),
      source: "intraday_boundary_page"
    }));
    const day = Number((getTraining7State() || {}).currentDay || 1);
    saveTraining7Task(day, "intraday_boundary", true);
    syncLocalState({ silent: true }).catch(() => {});
    syncTrainingProgress().catch(() => {});
    this.setData({ form: saved, saved: true });
    wx.showToast({ title: "盘中守界已记录", icon: "success" });
    promptShareMoment("opening_check_completed", {
      sourceScene: "intraday_boundary_completed",
      cardType: "boundary_guard",
      title: "今日这一界，已经被看见",
      content: "生成守界卡，提醒自己边界到了不再辩解。"
    });
  },

  goReaction() {
    wx.redirectTo({ url: "/pages/home/index" });
  },

  goReview() {
    wx.redirectTo({ url: "/pages/review/index" });
  },

  goShareCard() {
    wx.navigateTo({ url: "/pages/share-card/index?type=boundary_guard&sourceScene=intraday_boundary_completed" });
  }
});
