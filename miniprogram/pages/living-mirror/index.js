const {
  getTradeReviewRecords,
  saveLivingMirrorStatsFromReviews
} = require("../../utils/store");

Page({
  data: {
    stats: {
      assistantHandoff: {},
      mirrorTrendRows: [],
      recentThree: []
    },
    hasRecords: false
  },

  onShow() {
    this.refreshStats();
  },

  refreshStats() {
    const tradeReviewState = getTradeReviewRecords();
    const stats = saveLivingMirrorStatsFromReviews(tradeReviewState);
    this.setData({
      stats,
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
  }
});
