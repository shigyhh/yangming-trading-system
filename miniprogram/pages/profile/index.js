const { COMPLIANCE_TEXT } = require("../../utils/content");
const { getProfile, updateProfile, getAssessmentResult, getTodayMind, getMindRecords, getTodayTraining, getTrainingState, getReviews, getTodayReview, getDojoState, getSyncStatus, todayKey } = require("../../utils/store");
const { getApiBase, setApiBase, getAuthSession, pullRemoteState, syncLocalState } = require("../../utils/api");
const { buildGrowthState } = require("../../modules/growth/index");
const { buildContinuityState } = require("../../modules/continuity/index");

Page({
  data: {
    profile: {},
    result: null,
    trainingDone: 0,
    reviewSaved: false,
    apiBase: "",
    syncStatus: {},
    authUser: null,
    growth: buildGrowthState({}),
    continuity: buildContinuityState({}),
    menu: []
  },

  onShow() {
    const profile = getProfile();
    const result = getAssessmentResult();
    const mind = getTodayMind();
    const mindRecords = getMindRecords();
    const training = getTodayTraining();
    const trainingState = getTrainingState();
    const reviews = getReviews();
    const review = getTodayReview();
    const dojoState = getDojoState();
    const auth = getAuthSession();
    const today = todayKey();
    const trainingDone = Object.keys(training.steps || {}).filter((key) => training.steps[key]).length;
    const continuity = buildContinuityState({
      profile,
      trainingState,
      reviews,
      mindRecords,
      todayKey: today
    });
    const growth = buildGrowthState({
      profile,
      assessment: result,
      mind,
      training,
      trainingState,
      reviews,
      todayReview: review,
      continuity,
      dojoState,
      todayKey: today
    });

    this.setData({
      profile,
      result,
      trainingDone,
      reviewSaved: !!review,
      apiBase: getApiBase(),
      syncStatus: getSyncStatus(),
      authUser: auth?.user || null,
      growth,
      continuity,
      menu: [
        { key: "report", title: "交易人格心证", subtitle: result ? `${result.primary} · ${result.secondary}` : "完成照见后生成" },
        { key: "stages", title: "六大修行关卡", subtitle: `${growth.activeGate.name} · ${growth.overall}` },
        { key: "zhixingGrowth", title: "知行成长记录", subtitle: profile.growth_level ? `${profile.growth_level} · ${profile.zhixingScore || 0}` : "沉淀7日与30日趋势" },
        { key: "growth", title: "修行成长树", subtitle: `${growth.activeGate.name} · ${growth.overall}` },
        { key: "dojo", title: "修行道场", subtitle: "同修、观心助手、排行榜" },
        { key: "training", title: "今日事上练记录", subtitle: `${trainingDone}/3 步已完成` },
        { key: "resource", title: "省察表资料", subtitle: profile.resourceUnlocked ? "领取口令已保存" : "复制资料领取口令" },
        { key: "assistant", title: "修行营助理", subtitle: "复制助理暗号，便于私域承接" },
        { key: "boundary", title: "合规边界", subtitle: "查看系统使用边界" },
        { key: "assessment", title: "重新照见", subtitle: "用当下状态重新照见" }
      ]
    });
  },

  inputApiBase(e) {
    this.setData({ apiBase: e.detail.value });
  },

  saveApiBase() {
    const apiBase = setApiBase(this.data.apiBase);
    this.setData({ apiBase });
    wx.showToast({ title: "后端地址已保存", icon: "success" });
  },

  syncNow() {
    syncLocalState({ silent: false })
      .then(() => this.onShow())
      .catch(() => this.onShow());
  },

  pullNow() {
    wx.showModal({
      title: "从后端拉取",
      content: "会用后端保存的数据覆盖本机同账号数据。建议只在换设备或重新安装后使用。",
      confirmText: "拉取",
      success: (res) => {
        if (!res.confirm) return;
        pullRemoteState({ silent: false })
          .then(() => this.onShow())
          .catch(() => this.onShow());
      }
    });
  },

  tapMenu(e) {
    const key = e.currentTarget.dataset.key;
    if (key === "report") {
      wx.navigateTo({ url: "/pages/report/index" });
      return;
    }
    if (key === "growth") {
      wx.navigateTo({ url: "/pages/growth/index" });
      return;
    }
    if (key === "stages") {
      wx.navigateTo({ url: "/pages/stages/index" });
      return;
    }
    if (key === "zhixingGrowth") {
      wx.navigateTo({ url: "/pages/zhixing-growth/index" });
      return;
    }
    if (key === "dojo") {
      wx.navigateTo({ url: "/pages/dojo/index" });
      return;
    }
    if (key === "training") {
      wx.redirectTo({ url: "/pages/training/index" });
      return;
    }
    if (key === "resource") {
      this.receiveResource();
      return;
    }
    if (key === "assistant") {
      this.contactAssistant();
      return;
    }
    if (key === "boundary") {
      wx.showModal({
        title: "系统边界",
        content: COMPLIANCE_TEXT,
        showCancel: false,
        confirmText: "我知道了"
      });
      return;
    }
    if (key === "assessment") {
      wx.redirectTo({ url: "/pages/assessment/index" });
    }
  },

  receiveResource() {
    updateProfile({ resourceUnlocked: true });
    syncLocalState({ silent: true }).catch(() => {});
    wx.setClipboardData({
      data: "阳明省察表领取口令：每日一省",
      success: () => {
        wx.showToast({ title: "领取口令已复制", icon: "success" });
        this.onShow();
      }
    });
  },

  contactAssistant() {
    wx.setClipboardData({
      data: "知行修行营助理暗号：事上练",
      success: () => {
        wx.showModal({
          title: "助理暗号已复制",
          content: "后续正式上线时，这里可替换为企业微信二维码或客服入口。",
          showCancel: false,
          confirmText: "知道了"
        });
      }
    });
  }
});
