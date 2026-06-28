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
    const reviewId = this.data.reviewId || ((this.data.record || {}).id) || "";
    const reviewQuery = reviewId
      ? `&sourceReviewId=${encodeURIComponent(reviewId)}&source_review_id=${encodeURIComponent(reviewId)}`
      : "";
    wx.navigateTo({ url: `/pages/kline-mind/index?sourceType=review_focus&source_type=review_focus${reviewQuery}` });
  }
});
