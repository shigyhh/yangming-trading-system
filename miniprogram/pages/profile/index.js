const { COMPLIANCE_TEXT } = require("../../utils/content");
const {
  getProfile,
  updateProfile,
  bindPhone,
  getUserBinding,
  getAssessmentResult,
  getTodayMind,
  getMindRecords,
  getTodayTraining,
  getTrainingState,
  getReviews,
  getTodayReview,
  getDojoState,
  getSyncStatus,
  getZhixingScoreState,
  getDailyLoopState,
  getRetentionState,
  saveRetentionState,
  getShareCardAlbum,
  getInviteEvents,
  getLessonReservations,
  getLessonWatchRecords,
  getCompanionMirrorState,
  getGroupPracticeState,
  getRetestSnapshotState,
  getSubscriptionView,
  saveSubscriptionPlan,
  getLocalUserProfile,
  getLivingMirrorStats,
  getAssistantHandoff,
  getEvidenceSummary,
  getClosureEvidenceChain,
  getUnifiedJourneyView,
  getDebugMode,
  clearLocalMvpState,
  todayKey
} = require("../../utils/store");
const { getApiBase, setApiBase, getAuthSession, pullRemoteState, syncLocalState } = require("../../utils/api");
const { buildGrowthState } = require("../../modules/growth/index");
const { buildContinuityState } = require("../../modules/continuity/index");
const { getTodayContent } = require("../../modules/content365/index");
const { buildRetentionState } = require("../../modules/retention/index");
const { SHARE_MOMENTS } = require("../../utils/share-moments");
const { TYPE_LABELS } = require("../../modules/share-card/index");

const SHARE_MOMENT_ENTRIES = [
  { key: "assessment_completed", label: "测评完成" },
  { key: "risk_radar_seen", label: "看见雷达" },
  { key: "three_seals_completed", label: "三印落下" },
  { key: "opening_check_completed", label: "开盘照心" },
  { key: "closing_review_completed", label: "收盘省察" },
  { key: "zhixing_score_generated", label: "知行生成" },
  { key: "streak_3_days", label: "连修三日" },
  { key: "seven_day_completed", label: "七日完成" },
  { key: "retest_change_ready", label: "复测变化" },
  { key: "lesson_reserved", label: "预约讲堂" },
  { key: "lesson_watched", label: "看完回放" },
  { key: "profile_album", label: "心证卡册" }
];

const USER_DATA_CHAIN = [
  "训练记录",
  "交易复盘",
  "活镜变化",
  "助教承接"
];

const DEBUG_DATA_CHAIN = [
  "TrainingRecord",
  "TradeReview",
  "LivingMirrorStats",
  "AssistantHandoff"
];

const TECHNICAL_MESSAGE_RE = /(request:fail|ERR_CONNECTION_REFUSED|ERR_|接口错误|网络连接失败|请求失败|localhost|127\.0\.0\.1)/i;

function buildShareMomentEntries() {
  return SHARE_MOMENT_ENTRIES.map((entry) => {
    const moment = SHARE_MOMENTS[entry.key] || {};
    return Object.assign({}, entry, {
      title: moment.title || entry.label,
      cardType: moment.cardType || "daily_mantra",
      cardLabel: TYPE_LABELS[moment.cardType] || "心证卡"
    });
  });
}

function buildAuthFallback(syncStatus = {}) {
  const failed = !!syncStatus.failedAt && !syncStatus.ok;
  return {
    visible: failed,
    title: syncStatus.fallbackTitle || "连接未完成",
    text: syncStatus.fallbackText || "本地档案已保存。可稍后再同步，也可以先继续今日修行。",
    message: syncStatus.message || ""
  };
}

function buildSyncView(syncStatus = {}, debugMode = false) {
  const rawMessage = String(syncStatus.message || "");
  const technicalMessage = String(syncStatus.technicalMessage || rawMessage || "");
  const hasTechnicalMessage = TECHNICAL_MESSAGE_RE.test(rawMessage) || TECHNICAL_MESSAGE_RE.test(technicalMessage);
  let message = "本地档案已保存";
  if (syncStatus.syncing) {
    message = "正在连接心镜档案";
  } else if (syncStatus.ok) {
    message = rawMessage && !TECHNICAL_MESSAGE_RE.test(rawMessage) ? rawMessage : "已完成同步";
  } else if (syncStatus.failedAt || hasTechnicalMessage) {
    message = "后端同步暂未连接";
  } else if (rawMessage && rawMessage !== "未同步") {
    message = rawMessage;
  }
  return {
    message,
    detail: syncStatus.ok ? "网站与小程序将读取同一份心镜档案。" : "本地档案已保存。连接完成后再同步到同一用户档案。",
    statusText: syncStatus.ok ? "已连接" : "本地优先",
    statusClass: syncStatus.ok ? "ok" : "warn",
    showTechnical: !!debugMode && !!technicalMessage,
    technicalMessage: technicalMessage || "无技术信息"
  };
}

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
    retentionView: buildRetentionState({}),
    userBinding: getUserBinding(),
    phoneDraft: "",
    shareCards: [],
    inviteEvents: [],
    lessonReservations: [],
    lessonWatchRecords: [],
    companionMirror: {},
    groupPractice: {},
    retestSnapshots: {},
    subscriptionView: getSubscriptionView(),
    localUserProfile: getLocalUserProfile(),
    livingMirrorStats: getLivingMirrorStats(),
    assistantHandoff: getAssistantHandoff(),
    evidenceSummary: getEvidenceSummary({ limit: 6 }),
    evidenceRows: [],
    closureEvidenceChain: getClosureEvidenceChain(),
    unifiedJourneyView: getUnifiedJourneyView(),
    authFallback: buildAuthFallback(getSyncStatus()),
    debugMode: getDebugMode(),
    syncView: buildSyncView(getSyncStatus(), getDebugMode()),
    userDataChain: USER_DATA_CHAIN,
    debugDataChain: DEBUG_DATA_CHAIN,
    shareMoments: buildShareMomentEntries(),
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
    const zhixingScoreState = getZhixingScoreState();
    const dailyContent = getTodayContent();
    const livingMirrorStats = getLivingMirrorStats();
    const evidenceSummary = getEvidenceSummary({ limit: 6 });
    const retentionState = getRetentionState();
    const loopState = getDailyLoopState();
    const syncStatus = getSyncStatus();
    const debugMode = getDebugMode();
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
    const retentionView = buildRetentionState({
      todayKey: today,
      profile,
      assessment: result,
      continuity,
      dailyContent,
      zhixingScoreState,
      loopState,
      reminderState: (retentionState || {}).reminder
    });

    this.setData({
      profile,
      result,
      trainingDone,
      reviewSaved: !!review,
      apiBase: getApiBase(),
      syncStatus,
      authUser: auth?.user || null,
      growth,
      continuity,
      retentionView,
      userBinding: getUserBinding(),
      phoneDraft: profile.phone || "",
      shareCards: getShareCardAlbum().slice(0, 6),
      inviteEvents: getInviteEvents().slice(-6).reverse(),
      lessonReservations: Object.keys(getLessonReservations()).map((key) => getLessonReservations()[key]).slice(-6),
      lessonWatchRecords: Object.keys(getLessonWatchRecords()).map((key) => getLessonWatchRecords()[key]).slice(-6),
      companionMirror: getCompanionMirrorState().latest || {},
      groupPractice: getGroupPracticeState(),
      retestSnapshots: getRetestSnapshotState(),
      subscriptionView: getSubscriptionView(),
      localUserProfile: getLocalUserProfile(),
      livingMirrorStats,
      assistantHandoff: getAssistantHandoff(),
      evidenceSummary,
      evidenceRows: evidenceSummary.rows || [],
      closureEvidenceChain: getClosureEvidenceChain(),
      unifiedJourneyView: getUnifiedJourneyView(),
      authFallback: buildAuthFallback(syncStatus),
      debugMode,
      syncView: buildSyncView(syncStatus, debugMode),
      userDataChain: USER_DATA_CHAIN,
      debugDataChain: DEBUG_DATA_CHAIN,
      shareMoments: buildShareMomentEntries(),
      menu: [
        { key: "report", title: "交易人格心证", subtitle: result ? `${result.primary} · ${result.secondary}` : "完成照见后生成" },
        { key: "stages", title: "六大修行关卡", subtitle: `${growth.activeGate.name} · ${growth.overall}` },
        { key: "zhixingGrowth", title: "知行成长记录", subtitle: profile.growth_level ? `${profile.growth_level} · ${profile.zhixingScore || 0}` : "沉淀7日与30日趋势" },
        { key: "growth", title: "修行成长树", subtitle: `${growth.activeGate.name} · ${growth.overall}` },
        { key: "dojo", title: "修行道场", subtitle: "同修、观心助手、排行榜" },
        { key: "training", title: "今日事上练记录", subtitle: `${trainingDone}/3 步已完成` },
        { key: "cards", title: "我的心证卡册", subtitle: `${getShareCardAlbum().length} 张照见卡` },
        { key: "classroom", title: "知行讲堂预约", subtitle: `${Object.keys(getLessonReservations()).length} 条课程记录` },
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

  inputPhone(e) {
    this.setData({ phoneDraft: e.detail.value });
  },

  savePhoneBinding() {
    const phone = String(this.data.phoneDraft || "").trim();
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: "手机号格式不完整", icon: "none" });
      return;
    }
    bindPhone(phone, { bindSource: "profile_identity_card" });
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: "手机号已贯穿绑定", icon: "success" });
    this.onShow();
  },

  syncNow() {
    syncLocalState({ silent: false })
      .then(() => this.onShow())
      .catch(() => this.onShow());
  },

  goReportFallback() {
    wx.navigateTo({ url: "/pages/report/index" });
  },

  goPracticeFallback() {
    wx.redirectTo({ url: "/pages/home/index" });
  },

  toggleReminder(e) {
    const enabled = !!e.detail.value;
    const retention = saveRetentionState({
      reminder: Object.assign({}, (getRetentionState() || {}).reminder || {}, { enabled })
    });
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: enabled ? "修行提醒已开启" : "提醒已关闭", icon: "none" });
    this.setData({
      retentionView: buildRetentionState({
        todayKey: todayKey(),
        profile: getProfile(),
        assessment: getAssessmentResult(),
        continuity: this.data.continuity,
        dailyContent: getTodayContent(),
        zhixingScoreState: getZhixingScoreState(),
        loopState: getDailyLoopState(),
        reminderState: retention.reminder
      })
    });
  },

  changeReminderTime(e) {
    const time = e.detail.value || "21:30";
    const retention = saveRetentionState({
      reminder: Object.assign({}, (getRetentionState() || {}).reminder || {}, { time, enabled: true })
    });
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: "提醒时间已保存", icon: "success" });
    this.setData({
      retentionView: buildRetentionState({
        todayKey: todayKey(),
        profile: getProfile(),
        assessment: getAssessmentResult(),
        continuity: this.data.continuity,
        dailyContent: getTodayContent(),
        zhixingScoreState: getZhixingScoreState(),
        loopState: getDailyLoopState(),
        reminderState: retention.reminder
      })
    });
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

  goContent365() {
    wx.navigateTo({ url: "/pages/content365/index" });
  },

  goAssessment() {
    wx.redirectTo({ url: "/pages/assessment/index" });
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
    if (key === "cards") {
      wx.navigateTo({ url: "/pages/share-card/index?type=daily_mantra" });
      return;
    }
    if (key === "classroom") {
      wx.redirectTo({ url: "/pages/classroom/index" });
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
    const handoff = getAssistantHandoff();
    wx.setClipboardData({
      data: handoff.coachCopyText || handoff.handoffSummary || "阳明心学交易系统 · 助教承接摘要待生成",
      success: () => {
        wx.showModal({
          title: "承接摘要已复制",
          content: "这份摘要会带上统一档案、人格、复盘念头、活镜变化与建议训练动作，方便助教继续陪跑。",
          showCancel: false,
          confirmText: "知道了"
        });
      }
    });
  },

  copyAssistantHandoff() {
    const handoff = getAssistantHandoff();
    wx.setClipboardData({
      data: handoff.coachCopyText || handoff.handoffSummary || "阳明心学交易系统 · 助教承接摘要待生成",
      success: () => wx.showToast({ title: "承接摘要已复制", icon: "success" })
    });
  },

  generateInviteCard() {
    wx.navigateTo({ url: "/pages/share-card/index?type=companion_invite" });
  },

  generateShareCard(e) {
    const type = e.currentTarget.dataset.type || "companion_invite";
    wx.navigateTo({ url: `/pages/share-card/index?type=${type}&sourceScene=profile_album` });
  },

  generateMomentCard(e) {
    const type = e.currentTarget.dataset.type || "daily_mantra";
    const key = e.currentTarget.dataset.key || "profile_album";
    wx.navigateTo({ url: `/pages/share-card/index?type=${type}&sourceScene=${key}` });
  },

  selectSubscriptionPlan(e) {
    const planKey = e.currentTarget.dataset.key || "free";
    saveSubscriptionPlan(planKey);
    syncLocalState({ silent: true }).catch(() => {});
    wx.showToast({ title: "同修身份已更新", icon: "success" });
    this.onShow();
  },

  generateMembershipIdentity() {
    wx.navigateTo({ url: "/pages/share-card/index?type=membership_identity&sourceScene=membership_identity" });
  },

  clearLocalData() {
    wx.showModal({
      title: "重置本地 MVP 数据",
      content: "将清空今日三印、训练进度、心证卡册、讲堂预约与本地指数记录。手机号绑定与测评报告不会在此处主动清除。",
      confirmText: "重置",
      success: (res) => {
        if (!res.confirm) return;
        clearLocalMvpState();
        wx.showToast({ title: "本地数据已重置", icon: "success" });
        this.onShow();
      }
    });
  }
});
