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
  getUserBinding,
  getShareCardAlbum,
  saveShareCard,
  saveInviteEvent
} = require("../../utils/store");
const { getTodayContent } = require("../../modules/content365/index");
const { buildTraining7View } = require("../../modules/training7/index");
const { buildShareCardPreview, buildShareCardList, normalizeType } = require("../../modules/share-card/index");
const { buildLessonView } = require("../../modules/classroom/index");
const { buildSevenDayChange } = require("../../modules/retest-change/index");
const { syncShareAttribution } = require("../../utils/api");

Page({
  data: {
    type: "daily_mantra",
    card: buildShareCardPreview("daily_mantra"),
    cardTypes: [],
    album: [],
    lessonId: "",
    sourceScene: "share_card_page",
    saved: false
  },

  onLoad(options = {}) {
    const type = normalizeType(options.type);
    this.setData({
      type,
      lessonId: options.lessonId || "",
      sourceScene: options.sourceScene || "share_card_page"
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
    return {
      dailyContent: getTodayContent(),
      training7View,
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
      inviteCode: userBinding.inviteCode || "",
      lesson
    };
  },

  refreshCard() {
    const context = this.buildContext();
    this.setData({
      card: buildShareCardPreview(this.data.type, context),
      cardTypes: buildShareCardList(context).map((item) => ({
        type: item.type,
        title: item.typeLabel,
        active: item.type === this.data.type
      })),
      album: getShareCardAlbum().slice(0, 6),
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
        shareCardId: saved.latest.id,
        inviteCode
      });
      syncShareAttribution(events[events.length - 1]).catch(() => {});
    }
    this.setData({
      album: getShareCardAlbum().slice(0, 6),
      saved: true,
      card: saved.latest
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

  inviteCompanion() {
    const inviteCode = (getUserBinding() || {}).inviteCode || "";
    const events = saveInviteEvent({
      sourceScene: this.data.sourceScene,
      sourcePage: "share_card",
      shareCardType: this.data.card.type,
      shareCardId: (this.data.card || {}).id,
      inviteCode
    });
    syncShareAttribution(events[events.length - 1]).catch(() => {});
    wx.showToast({ title: "同修邀请已记录", icon: "success" });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/home/index" });
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
      assessment.primary ? `sourcePrimary=${encodeURIComponent(assessment.primary)}` : "",
      assessment.secondary ? `sourceSecondary=${encodeURIComponent(assessment.secondary)}` : "",
      groupPractice.groupCode ? `groupCode=${encodeURIComponent(groupPractice.groupCode)}` : ""
    ].filter(Boolean).join("&");
    const path = `/pages/home/index${query ? `?${query}` : ""}`;
    const events = saveInviteEvent({
      sourceScene: this.data.sourceScene,
      sourcePage: "share_card",
      shareCardType: (this.data.card || {}).type,
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
