const {
  getProfile,
  getAssessmentResult,
  getTodayMind,
  getTodayTraining,
  getTrainingState,
  getMindRecords,
  getReviews,
  getTodayReview,
  getTodayReaction,
  getAssessmentHistory,
  getZhixingScoreState,
  getDojoState,
  saveDojoState,
  getUserBinding,
  saveInviteSource,
  saveInviteEvent,
  updateProfile,
  todayKey
} = require("../../utils/store");
const { syncLocalState, syncShareAttribution } = require("../../utils/api");
const { buildGrowthState } = require("../../modules/growth/index");
const { buildContinuityState } = require("../../modules/continuity/index");
const { buildDojoView, buildAssistantReply } = require("../../modules/dojo/index");
const { buildCompanionSystem } = require("../../modules/companion/index");
const { getPersonalityArchive } = require("../../modules/personality/index");

Page({
  data: {
    dojo: buildDojoView({}),
    companion: buildCompanionSystem({}),
    mentorCode: "",
    selectedMentorRole: "coach",
    assistantInput: "",
    assistantReply: null
  },

  onLoad(options = {}) {
    if (options.invite) {
      saveInviteSource(options.invite, {
        sourceScene: options.sourceScene || "dojo_invite_activation",
        sourcePage: "dojo",
        shareCardType: options.shareCardType || "companion_invite",
        sourcePrimary: options.sourcePrimary || "",
        sourceSecondary: options.sourceSecondary || "",
        groupCode: options.groupCode || ""
      });
    }
  },

  onShow() {
    this.load();
  },

  buildContext() {
    const profile = getProfile();
    const trainingState = getTrainingState();
    const reviews = getReviews();
    const mindRecords = getMindRecords();
    const assessment = getAssessmentResult();
    const training = getTodayTraining();
    const review = getTodayReview();
    const reaction = getTodayReaction();
    const dojoState = getDojoState();
    const zhixingScore = getZhixingScoreState();
    const assessmentHistory = getAssessmentHistory();
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
      assessment,
      mind: getTodayMind(),
      training,
      trainingState,
      reviews,
      todayReview: review,
      continuity,
      dojoState,
      todayKey: today
    });

    return {
      profile,
      assessment,
      archive: assessment ? getPersonalityArchive(assessment.primary) : null,
      mind: getTodayMind(),
      training,
      review,
      reaction,
      growth,
      continuity,
      zhixingScore,
      assessmentHistory,
      userBinding: getUserBinding(),
      dojoState,
      todayKey: today
    };
  },

  load() {
    const context = this.buildContext();
    const dojo = buildDojoView(context);
    const companion = buildCompanionSystem(context);
    this.setData({
      dojo,
      companion,
      mentorCode: dojo.mentorCode || "",
      selectedMentorRole: dojo.mentorRole || "coach"
    });
  },

  copyInvite() {
    wx.setClipboardData({
      data: this.data.dojo.inviteCode,
      success: () => wx.showToast({ title: "道场码已复制", icon: "success" })
    });
  },

  inputMentor(e) {
    this.setData({ mentorCode: e.detail.value });
  },

  selectMentorRole(e) {
    this.setData({ selectedMentorRole: e.currentTarget.dataset.role });
  },

  joinMentor() {
    const mentorCode = String(this.data.mentorCode || "").trim().toUpperCase();
    if (!/^ZX\d{4,6}$/.test(mentorCode)) {
      wx.showToast({ title: "输入正确道场码", icon: "none" });
      return;
    }
    saveDojoState({
      joined: true,
      mentorCode,
      mentorRole: this.data.selectedMentorRole || "coach",
      relation: {
        spiritualMentor: { name: "阳明先生", role: "道统导师" },
        humanMentor: {
          code: mentorCode,
          roleKey: this.data.selectedMentorRole || "coach"
        }
      }
    });
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: "已入同修道场", icon: "success" });
    this.load();
  },

  acceptTask() {
    const state = getDojoState();
    const records = Object.assign({}, state.taskRecords);
    const today = todayKey();
    records[today] = Object.assign({}, records[today] || {}, {
      accepted: true,
      acceptedAt: Date.now()
    });
    saveDojoState({ taskRecords: records });
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: "今日共修已领取", icon: "success" });
    this.load();
  },

  completeTask() {
    const state = getDojoState();
    const records = Object.assign({}, state.taskRecords);
    const today = todayKey();
    const alreadyCompleted = !!(records[today] || {}).completed;
    if (!records[today] || !records[today].accepted) {
      wx.showToast({ title: "先领取今日共修", icon: "none" });
      return;
    }
    records[today] = Object.assign({}, records[today], {
      completed: true,
      completedAt: Date.now()
    });
    saveDojoState({ taskRecords: records });
    if (!alreadyCompleted) {
      const profile = getProfile();
      updateProfile({
        points: Number(profile.points || 0) + 6,
        stage: "道场共修"
      });
    }
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: "共修已完成", icon: "success" });
    this.load();
  },

  inputAssistant(e) {
    this.setData({ assistantInput: e.detail.value });
  },

  askAssistant() {
    const input = String(this.data.assistantInput || "").trim();
    if (!input) {
      wx.showToast({ title: "写下此刻一念", icon: "none" });
      return;
    }
    const context = this.buildContext();
    const reply = buildAssistantReply(input, context);
    const handoff = buildDojoView(context).assistantHandoff;
    const state = getDojoState();
    const logs = [{ input, reply, assistantHandoff: handoff, createdAt: Date.now() }].concat(state.assistantLogs || []).slice(0, 8);
    saveDojoState({ assistantLogs: logs, assistantHandoff: handoff });
    syncLocalState({ silent: true }).catch(() => {});
    this.setData({ assistantReply: reply, assistantInput: "" });
    this.load();
  },

  goArchive() {
    wx.navigateTo({ url: "/pages/report/index" });
  },

  goGrowth() {
    wx.redirectTo({ url: "/pages/growth/index" });
  },

  onShareAppMessage() {
    const inviteCode = (this.data.dojo && this.data.dojo.inviteCode) || "";
    const sourceScene = "dojo_companion";
    const shareCardType = "companion_invite";
    const query = [
      inviteCode ? `invite=${encodeURIComponent(inviteCode)}` : "",
      `sourceScene=${encodeURIComponent(sourceScene)}`,
      `shareCardType=${encodeURIComponent(shareCardType)}`
    ].filter(Boolean).join("&");
    const path = `/pages/dojo/index${query ? `?${query}` : ""}`;
    const events = saveInviteEvent({
      sourceScene,
      sourcePage: "dojo",
      shareCardType,
      channel: "share_message",
      inviteCode
    });
    syncShareAttribution(events[events.length - 1]).catch(() => {});
    return {
      title: `今日有${this.data.companion.todayCount.value}位同修正在修行，一起守住今日一念`,
      path
    };
  }
});
