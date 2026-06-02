const {
  getAssessmentResult,
  getAssessmentHistory,
  getTodayThreeSeals,
  getTraining7State,
  getTodayMind,
  getReviews,
  getTodayTraining,
  getTodayReaction,
  getTodayIntradayBoundaryRecord,
  getTodayReview,
  getZhixingScoreState,
  getRetestSnapshotState,
  getCompanionMirrorState,
  getGroupPracticeState,
  getLessonReservations,
  getLessonWatchRecords,
  getSubscriptionView,
  getKlineReviewReports,
  getKlineMirrorChallenges,
  getTradeReviewRecords,
  getLivingMirrorStats,
  getAssistantHandoff,
  getUserBinding,
  getShareCardAlbum,
  getEvidenceSummary,
  getUnifiedJourneyView,
  saveShareCard,
  saveInviteEvent
} = require("../../utils/store");
const { getTodayContent } = require("../../modules/content365/index");
const { buildTraining7View } = require("../../modules/training7/index");
const { buildShareCardPreview, buildShareCardList, normalizeType } = require("../../modules/share-card/index");
const { buildLessonView } = require("../../modules/classroom/index");
const { buildSevenDayChange } = require("../../modules/retest-change/index");
const { syncShareAttribution } = require("../../utils/api");

function cleanLine(value, fallback = "") {
  return String(value || fallback || "").replace(/\s+/g, " ").trim();
}

function buildPosterCard(card = {}, context = {}) {
  const metrics = Array.isArray(card.metrics) ? card.metrics.slice(0, 4) : [];
  const dailyContent = context.dailyContent || {};
  const trainingToday = (context.training7View || {}).today || {};
  const assessment = context.assessment || {};
  const livingMirrorStats = context.livingMirrorStats || {};
  const threeSeals = context.threeSeals || {};
  const unified = context.unifiedJourneyView || {};
  const mirror = livingMirrorStats.currentMirror || assessment.primary || assessment.primaryMirror || "待照见";
  const practice = trainingToday.boundaryPractice || dailyContent.trainingAction || unified.currentTheme || card.cta || "今日只守住这一念。";
  const imprint = [threeSeals.thought ? "志" : "", threeSeals.fear ? "止" : "", threeSeals.boundary ? "照" : ""].filter(Boolean);
  return Object.assign({}, card, {
    brandTitle: "阳明心学交易系统",
    brandSubtitle: unified.dailyPracticeDayText || "每日一页 · 照见本心",
    posterLabel: card.type === "daily_mantra" ? "今日心证" : cleanLine(card.typeLabel, "心证卡"),
    heartProof: cleanLine(card.headline, "真正的事上练，是边界到了能知行合一。"),
    primaryMirror: cleanLine(mirror, "待照见"),
    practice: cleanLine(practice, "今日只守住这一念。"),
    imprintText: imprint.length ? imprint.join(" · ") : "志 · 止 · 照",
    signature: "阳明心学交易系统 · 交易心理觉察训练",
    metrics,
    hasMoreMetrics: Array.isArray(card.metrics) && card.metrics.length > metrics.length,
    posterNo: String(card.createdAt || Date.now()).slice(-6)
  });
}

Page({
  data: {
    type: "daily_mantra",
    card: buildShareCardPreview("daily_mantra"),
    posterCard: buildPosterCard(buildShareCardPreview("daily_mantra")),
    cardTypes: [],
    album: [],
    lessonId: "",
    sourceScene: "share_card_page",
    saved: false,
    posterMode: false,
    evidenceSummary: getEvidenceSummary({ limit: 4 }),
    evidenceRows: []
  },

  onLoad(options = {}) {
    const type = normalizeType(options.type);
    this.setData({
      type,
      lessonId: options.lessonId || "",
      sourceScene: options.sourceScene || "share_card_page",
      posterMode: options.mode === "poster" || options.poster === "1"
    });
  },

  onShow() {
    this.refreshCard();
  },

  buildContext() {
    const training = getTodayTraining();
    const reactionRecord = getTodayReaction();
    const intradayBoundaryRecord = getTodayIntradayBoundaryRecord();
    const review = getTodayReview();
    const assessment = getAssessmentResult();
    const assessmentHistory = getAssessmentHistory();
    const training7State = getTraining7State();
    const training7View = buildTraining7View(getTraining7State(), {
      mind: getTodayMind(),
      training,
      reactionRecord,
      intradayBoundaryRecord,
      review
    });
    const lesson = this.data.lessonId ? buildLessonView(this.data.lessonId, getLessonReservations(), getLessonWatchRecords()) : null;
    const userBinding = getUserBinding();
    const evidenceSummary = getEvidenceSummary({ limit: 4 });
    const unifiedJourneyView = getUnifiedJourneyView({ training7View, dailyContent: getTodayContent() });
    return {
      dailyContent: getTodayContent(),
      training7View,
      unifiedJourneyView,
      threeSeals: getTodayThreeSeals(),
      assessment,
      zhixingScoreState: getZhixingScoreState(),
      openingCheck: getTodayMind(),
      boundaryRecord: intradayBoundaryRecord,
      retestChange: buildSevenDayChange({
        assessmentHistory,
        assessment,
        training7State,
        reviews: getReviews(),
        zhixingScoreState: getZhixingScoreState(),
        retestSnapshots: getRetestSnapshotState()
      }),
      companionMirror: getCompanionMirrorState().latest,
      groupPractice: getGroupPracticeState(),
      subscriptionView: getSubscriptionView(),
      klineReviewReports: getKlineReviewReports(),
      klineMirrorChallenges: getKlineMirrorChallenges(),
      tradeReviewRecords: getTradeReviewRecords(),
      livingMirrorStats: getLivingMirrorStats(),
      assistantHandoff: getAssistantHandoff(),
      userBinding,
      inviteCode: userBinding.inviteCode || "",
      lesson,
      evidenceSummary,
      evidenceRows: evidenceSummary.rows || []
    };
  },

  refreshCard() {
    const context = this.buildContext();
    const card = buildShareCardPreview(this.data.type, context);
    this.setData({
      card,
      posterCard: buildPosterCard(card, context),
      cardTypes: buildShareCardList(context).map((item) => ({
        type: item.type,
        title: item.typeLabel,
        active: item.type === this.data.type
      })),
      album: getShareCardAlbum().slice(0, 6),
      evidenceSummary: context.evidenceSummary,
      evidenceRows: context.evidenceRows,
      saved: false
    });
  },

  switchType(e) {
    this.setData({ type: normalizeType(e.currentTarget.dataset.type) });
    this.refreshCard();
  },

  saveCard() {
    const saved = saveShareCard(Object.assign({}, this.data.card, {
      source: "share_card_page",
      sourceScene: this.data.sourceScene
    }));
    const inviteCode = (getUserBinding() || {}).inviteCode || "";
    if (["companion_invite", "group_practice", "personality_mirror", "live_reservation", "group_kline_mirror"].includes(this.data.card.type)) {
      const events = saveInviteEvent({
        sourceScene: this.data.sourceScene,
        sourcePage: "share_card",
        shareCardType: this.data.card.type,
        sourceType: this.data.card.type,
        sourceId: saved.latest.id,
        shareCardId: saved.latest.id,
        inviteCode
      });
      syncShareAttribution(events[events.length - 1]).catch(() => {});
    }
    const evidenceSummary = getEvidenceSummary({ limit: 4 });
    this.setData({
      album: getShareCardAlbum().slice(0, 6),
      evidenceSummary,
      evidenceRows: evidenceSummary.rows || [],
      saved: true,
      card: saved.latest,
      posterCard: buildPosterCard(saved.latest, this.buildContext())
    });
    wx.showToast({ title: "已存入心证卡册", icon: "success" });
  },

  buildShareText() {
    const card = this.data.card || {};
    const metrics = (card.metrics || []).map((item) => `${item.label}：${item.value}`).join("\n");
    return [
      card.title || card.typeLabel || "心证卡",
      card.headline,
      card.body,
      metrics,
      card.insight,
      card.compliance
    ].filter(Boolean).join("\n\n");
  },

  copyShareText() {
    wx.setClipboardData({
      data: this.buildShareText(),
      success: () => wx.showToast({ title: "分享文案已复制", icon: "success" })
    });
  },

  openPosterMode() {
    this.setData({ posterMode: true });
  },

  closePosterMode() {
    this.setData({ posterMode: false });
  },

  noop() {},

  inviteCompanion() {
    const inviteCode = (getUserBinding() || {}).inviteCode || "";
    const events = saveInviteEvent({
      sourceScene: this.data.sourceScene,
      sourcePage: "share_card",
      shareCardType: this.data.card.type,
      sourceType: this.data.card.type,
      sourceId: (this.data.card || {}).id,
      shareCardId: (this.data.card || {}).id,
      inviteCode
    });
    syncShareAttribution(events[events.length - 1]).catch(() => {});
    wx.showToast({ title: "同修邀请已记录", icon: "success" });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/home/index" });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    this.goHome();
  },

  goProfile() {
    wx.navigateTo({ url: "/pages/profile/index" });
  },

  onShareAppMessage() {
    const inviteCode = (getUserBinding() || {}).inviteCode || "";
    const assessment = getAssessmentResult() || {};
    const groupPractice = getGroupPracticeState();
    const query = [
      inviteCode ? `invite=${encodeURIComponent(inviteCode)}` : "",
      `sourceScene=${encodeURIComponent(this.data.sourceScene || "share_card")}`,
      `shareCardType=${encodeURIComponent((this.data.card || {}).type || this.data.type)}`,
      `source_type=${encodeURIComponent((this.data.card || {}).type || this.data.type)}`,
      (this.data.card || {}).id ? `source_id=${encodeURIComponent((this.data.card || {}).id)}` : "",
      assessment.primary ? `sourcePrimary=${encodeURIComponent(assessment.primary)}` : "",
      assessment.secondary ? `sourceSecondary=${encodeURIComponent(assessment.secondary)}` : "",
      groupPractice.groupCode ? `groupCode=${encodeURIComponent(groupPractice.groupCode)}` : ""
    ].filter(Boolean).join("&");
    const path = `/pages/home/index${query ? `?${query}` : ""}`;
    const events = saveInviteEvent({
      sourceScene: this.data.sourceScene,
      sourcePage: "share_card",
      shareCardType: (this.data.card || {}).type,
      sourceType: (this.data.card || {}).type,
      sourceId: (this.data.card || {}).id,
      shareCardId: (this.data.card || {}).id,
      channel: "share_message",
      inviteCode
    });
    syncShareAttribution(events[events.length - 1]).catch(() => {});
    return {
      title: (this.data.card || {}).shareTitle || "邀你一起照见交易里的自己。",
      path
    };
  }
});
