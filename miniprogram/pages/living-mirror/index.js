const {
  getTraining7State,
  getKlineReviewReports,
  getAssessmentResult,
  getMiniLoopProgress,
  getTradeReviewRecords,
  saveLivingMirrorStatsFromReviews,
  getEvidenceSummary,
  getUnifiedJourneyView
} = require("../../utils/store");
const { buildTraining7View } = require("../../modules/training7/index");
const { buildKlineDayRetestComparison, getKlineRecommendationForMirror } = require("../../modules/kline-simulator/index");
const { buildLivingMirrorTree } = require("../../modules/mini-loop/index");

Page({
  data: {
    stats: {
      assistantHandoff: {},
      mirrorTrendRows: [],
      recentThree: []
    },
    klineRecommendation: getKlineRecommendationForMirror(""),
    klineDayRetest: buildKlineDayRetestComparison(getKlineReviewReports()),
    mirrorTree: buildLivingMirrorTree({}),
    evidenceSummary: getEvidenceSummary({ limit: 6 }),
    evidenceRows: [],
    unifiedJourneyView: getUnifiedJourneyView(),
    miniLoopProgress: getMiniLoopProgress(),
    training7View: buildTraining7View(getTraining7State(), {}),
    hasRecords: false
  },

  onShow() {
    this.refreshStats();
  },

  refreshStats() {
    const tradeReviewState = getTradeReviewRecords();
    const stats = saveLivingMirrorStatsFromReviews(tradeReviewState);
    const miniLoopProgress = getMiniLoopProgress();
    const evidenceSummary = getEvidenceSummary({ limit: 6 });
    const latest = (tradeReviewState || {}).latest || {};
    const klineRecommendation = getKlineRecommendationForMirror(stats.currentMirror, {
      marketKey: latest.marketKey || "cn",
      timeframeKey: latest.timeframeKey || "1d",
      symbol: latest.symbol || ""
    });
    this.setData({
      stats,
      klineRecommendation,
      klineDayRetest: buildKlineDayRetestComparison(getKlineReviewReports()),
      miniLoopProgress,
      mirrorTree: buildLivingMirrorTree({
        assessment: getAssessmentResult(),
        loopProgress: miniLoopProgress,
        tradeReviewState,
        livingMirrorStats: stats,
        evidenceSummary
      }),
      evidenceSummary,
      evidenceRows: evidenceSummary.rows || [],
      unifiedJourneyView: getUnifiedJourneyView(),
      training7View: buildTraining7View(getTraining7State(), {}),
      hasRecords: Number(stats.totalReviews || 0) > 0
    });
  },

  goReview() {
    wx.redirectTo({ url: "/pages/trade-review/index" });
  },

  goArchive() {
    wx.navigateTo({ url: "/pages/trade-review-archive/index" });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id || "";
    if (!id) return;
    wx.navigateTo({ url: `/pages/trade-review-detail/index?id=${id}` });
  },

  goAssistant() {
    wx.navigateTo({ url: "/pages/profile/index?anchor=assistant" });
  },

  goRecommendedKline() {
    wx.navigateTo({ url: (this.data.klineRecommendation || {}).path || "/pages/kline-simulator/index" });
  }
});
