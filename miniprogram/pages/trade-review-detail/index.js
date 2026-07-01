const { getTradeReviewRecords } = require("../../utils/store");
const { prefetchKlineTrainingSlices } = require("../../utils/api");
const {
  buildLiveMirrorReminder,
  buildTradeReviewRecordView
} = require("../../modules/trade-review/index");

function warmReviewFocusKline(record = {}) {
  const reviewId = record.id || record.reviewId || "latest";
  const errorType = record.errorType || record.error_type || record.trainingPrescription || "review";
  prefetchKlineTrainingSlices({
    marketKey: "cn",
    timeframes: ["1d", "60m", "30m"],
    mode: "firecracker",
    gateKey: "shi_shang_mo",
    blind: true,
    scenarioId: `review-focus-${reviewId}`,
    seedQueue: [
      `review-focus-${reviewId}-${errorType}-a`,
      `review-focus-${reviewId}-${errorType}-b`,
      `review-focus-${reviewId}-${errorType}-c`
    ],
    prefetchDepth: 3
  }).catch(() => {});
}

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
    if (target) warmReviewFocusKline(target);
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
    warmReviewFocusKline(this.data.record || {});
    const reviewQuery = reviewId
      ? `&sourceReviewId=${encodeURIComponent(reviewId)}&source_review_id=${encodeURIComponent(reviewId)}`
      : "";
    wx.navigateTo({ url: `/pages/kline-mind/index?sourceType=review_focus&source_type=review_focus${reviewQuery}` });
  }
});
