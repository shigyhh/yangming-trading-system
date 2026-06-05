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
  getTodayHeartCard,
  getSyncStatus,
  saveShareCard,
  saveInviteEvent
} = require("../../utils/store");
const { getTodayContent } = require("../../modules/content365/index");
const { buildTraining7View } = require("../../modules/training7/index");
const { buildShareCardPreview, buildShareCardList, normalizeType } = require("../../modules/share-card/index");
const { buildLessonView } = require("../../modules/classroom/index");
const { buildSevenDayChange } = require("../../modules/retest-change/index");
const { syncShareAttribution } = require("../../utils/api");

const LOAD_TIMEOUT_MS = 6000;

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

function buildFallbackView(type) {
  if (type === "network") {
    return {
      type,
      title: "暂时没有同步成功",
      lines: [
        "你的本地记录不会丢失。",
        "可以稍后重试，或先回到今日继续修行。"
      ],
      primaryText: "重新加载",
      secondaryText: "回到今日"
    };
  }
  return {
    type: "not_generated",
    title: "今日心证尚未生成",
    lines: [
      "先完成今日照心，",
      "再生成属于今天的一张心证卡。"
    ],
    primaryText: "开始今日照心",
    secondaryText: "返回今日"
  };
}

function safeEvidenceSummary() {
  try {
    return getEvidenceSummary({ limit: 4 });
  } catch (error) {
    return { total: 0, rows: [] };
  }
}

function safeAlbum() {
  try {
    return getShareCardAlbum().slice(0, 6);
  } catch (error) {
    return [];
  }
}

function shouldShowLocalSyncHint() {
  try {
    const status = getSyncStatus();
    return !status.ok && status.message !== "未同步";
  } catch (error) {
    return false;
  }
}

function buildLocalHeartCard(record = {}) {
  const headline = cleanLine(record.heartProof, "今日心证已生成");
  const practice = cleanLine(record.trainingAction || record.commandment, "今日只守住这一念。");
  return Object.assign({
    id: `local-heart-card-${record.dayKey || Date.now()}`,
    type: "daily_mantra",
    typeLabel: "今日心证卡",
    title: "今日心证卡",
    headline,
    body: `今日修行：${practice}`,
    insight: cleanLine(record.reflectionQuestion, "这张心证已保存在本地，稍后会继续同步。"),
    cta: "查看今日心证",
    shareTitle: "今日心证：先照见自己，再进入事上练心。",
    compliance: "本系统用于交易心理觉察与训练，不提供投资建议，不预测行情，不构成任何操作依据。",
    createdAt: record.updatedAt || record.completedAt || Date.now()
  }, record.shareTitle ? { shareTitle: record.shareTitle } : {});
}

function buildLocalContext(record = {}) {
  const dailyContent = {
    id: record.dayId || record.dayKey || "今日",
    heartProof: record.heartProof || "今日心证已生成",
    trainingAction: record.trainingAction || record.commandment || "今日只守住这一念。",
    stageName: record.stageName || "今日修行"
  };
  return {
    dailyContent,
    training7View: {
      today: {
        title: record.stageName || "今日修行",
        boundaryPractice: dailyContent.trainingAction,
        mantra: dailyContent.heartProof
      }
    },
    unifiedJourneyView: {
      dailyPracticeDayText: record.dayId || "每日一页 · 照见本心"
    },
    threeSeals: {},
    assessment: {},
    livingMirrorStats: {},
    evidenceSummary: safeEvidenceSummary(),
    evidenceRows: (safeEvidenceSummary().rows || [])
  };
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
    loadStatus: "loading",
    evidenceSummary: safeEvidenceSummary(),
    evidenceRows: [],
    fallbackView: null,
    localSyncHint: ""
  },

  onLoad(options = {}) {
    if (wx.showShareMenu) {
      wx.showShareMenu({ withShareTicket: true, menus: ["shareAppMessage"] });
    }
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

  onUnload() {
    clearTimeout(this.loadTimer);
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
    this.beginPageLoad();
    const localResult = this.getLocalHeartCardResult();
    let context;
    try {
      context = this.buildContext();
    } catch (error) {
      if (localResult) {
        this.finishPageLoad(Object.assign({}, localResult, {
          loadStatus: "success",
          fallbackView: null,
          posterMode: false,
          localSyncHint: "本地心证已保存，稍后同步。"
        }));
        return;
      }
      const evidenceSummary = safeEvidenceSummary();
      this.finishPageLoad({
        loadStatus: "failed",
        fallbackView: buildFallbackView("network"),
        cardTypes: buildShareCardList({}).map((item) => ({
          type: item.type,
          title: item.typeLabel,
          active: item.type === this.data.type
        })),
        album: safeAlbum(),
        evidenceSummary,
        evidenceRows: [],
        saved: false,
        localSyncHint: ""
      });
      return;
    }
    if (this.data.type === "daily_mantra" && localResult) {
      this.finishPageLoad(Object.assign({}, localResult, {
        loadStatus: "success",
        fallbackView: null,
        localSyncHint: shouldShowLocalSyncHint() ? "本地心证已保存，稍后同步。" : ""
      }));
      return;
    }
    const card = buildShareCardPreview(this.data.type, context);
    if (this.data.type === "daily_mantra" && !context.openingCheck) {
      this.finishPageLoad({
        loadStatus: "empty",
        card,
        posterCard: buildPosterCard(card, context),
        cardTypes: buildShareCardList(context).map((item) => ({
          type: item.type,
          title: item.typeLabel,
          active: item.type === this.data.type
        })),
        album: safeAlbum(),
        evidenceSummary: context.evidenceSummary,
        evidenceRows: context.evidenceRows,
        saved: false,
        posterMode: false,
        fallbackView: buildFallbackView("not_generated"),
        localSyncHint: ""
      });
      return;
    }
    this.finishPageLoad({
      loadStatus: "success",
      card,
      posterCard: buildPosterCard(card, context),
      cardTypes: buildShareCardList(context).map((item) => ({
        type: item.type,
        title: item.typeLabel,
        active: item.type === this.data.type
      })),
      album: safeAlbum(),
      evidenceSummary: context.evidenceSummary,
      evidenceRows: context.evidenceRows,
      saved: false,
      fallbackView: null,
      localSyncHint: ""
    });
  },

  getLocalHeartCardResult() {
    if (this.data.type !== "daily_mantra") return null;
    let localRecord = null;
    try {
      localRecord = getTodayHeartCard();
    } catch (error) {
      localRecord = null;
    }
    if (!localRecord || !localRecord.completed) return null;
    const context = buildLocalContext(localRecord);
    const card = buildLocalHeartCard(localRecord);
    return {
      card,
      posterCard: buildPosterCard(card, context),
      cardTypes: buildShareCardList(context).map((item) => ({
        type: item.type,
        title: item.typeLabel,
        active: item.type === this.data.type
      })),
      album: safeAlbum(),
      evidenceSummary: context.evidenceSummary,
      evidenceRows: context.evidenceRows || [],
      saved: false,
      localSyncHint: shouldShowLocalSyncHint() ? "本地心证已保存，稍后同步。" : ""
    };
  },

  beginPageLoad() {
    clearTimeout(this.loadTimer);
    this.setData({
      loadStatus: "loading",
      fallbackView: null,
      localSyncHint: ""
    });
    this.loadTimer = setTimeout(() => {
      if (this.data.loadStatus !== "loading") return;
      this.finishPageLoad({
        loadStatus: "failed",
        fallbackView: buildFallbackView("network"),
        posterMode: false,
        localSyncHint: ""
      });
    }, LOAD_TIMEOUT_MS);
  },

  finishPageLoad(patch = {}) {
    clearTimeout(this.loadTimer);
    this.setData(patch);
  },

  switchType(e) {
    this.setData({ type: normalizeType(e.currentTarget.dataset.type) }, () => {
      this.refreshCard();
    });
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
      album: safeAlbum(),
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

  handleFallbackPrimary() {
    const fallback = this.data.fallbackView || {};
    if (fallback.type === "network") {
      this.refreshCard();
      return;
    }
    wx.navigateTo({ url: "/pages/mind/index" });
  },

  handleFallbackSecondary() {
    this.goHome();
  },

  openPosterMode() {
    if (this.data.loadStatus !== "success" || this.data.fallbackView) return;
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
