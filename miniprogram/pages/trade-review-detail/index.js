const { getTradeReviewRecords } = require("../../utils/store");
const {
  buildLiveMirrorReminder,
  buildTradeReviewRecordView
} = require("../../modules/trade-review/index");

Page({
  data: {
    reviewId: "",
    record: null,
    reminder: buildLiveMirrorReminder(getTradeReviewRecords())
  },

  onLoad(options = {}) {
    this.setData({ reviewId: options.id || "" });
  },

  onShow() {
    this.refreshRecord();
  },

  refreshRecord() {
    const state = getTradeReviewRecords();
    const records = state.records || [];
    const target = records.find((item) => item.id === this.data.reviewId) || state.latest || null;
    this.setData({
      record: target ? buildTradeReviewRecordView(target) : null,
      reminder: buildLiveMirrorReminder(state)
    });
  },

  previewScreenshot() {
    const path = (this.data.record || {}).screenshotPath || "";
    if (!path) return;
    wx.previewImage({ current: path, urls: [path] });
  },

  goArchive() {
    wx.navigateTo({ url: "/pages/trade-review-archive/index" });
  },

  goUpload() {
    wx.navigateTo({ url: "/pages/trade-review/index" });
  },

  goKlineTraining() {
    const record = this.data.record || {};
    wx.navigateTo({
      url: `/pages/kline-simulator/index?market=${record.marketKey || "cn"}&timeframe=${record.timeframeKey || "1d"}`
    });
  }
});
