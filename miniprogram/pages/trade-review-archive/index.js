const { getTradeReviewRecords } = require("../../utils/store");
const {
  buildLiveMirrorReminder,
  buildTradeReviewRecordView
} = require("../../modules/trade-review/index");

Page({
  data: {
    reminder: buildLiveMirrorReminder(getTradeReviewRecords()),
    records: [],
    hasRecords: false
  },

  onShow() {
    this.refreshRecords();
  },

  refreshRecords() {
    const state = getTradeReviewRecords();
    const records = (state.records || [])
      .slice()
      .sort((a, b) => Number(b.createdAt || b.updatedAt || 0) - Number(a.createdAt || a.updatedAt || 0))
      .map(buildTradeReviewRecordView);
    this.setData({
      reminder: buildLiveMirrorReminder(state),
      records,
      hasRecords: records.length > 0
    });
  },

  goUpload() {
    wx.navigateTo({ url: "/pages/trade-review/index" });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id || "";
    if (!id) return;
    wx.navigateTo({ url: `/pages/trade-review-detail/index?id=${id}` });
  },

  goKlineTraining() {
    const latest = (this.data.reminder || {}).latest || {};
    wx.navigateTo({
      url: `/pages/kline-simulator/index?market=${latest.marketKey || "cn"}&timeframe=${latest.timeframeKey || "1d"}`
    });
  }
});
