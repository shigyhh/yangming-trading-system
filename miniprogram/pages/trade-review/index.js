const {
  getAssessmentResult,
  getTradeReviewRecords,
  saveTradeReviewRecord,
  todayKey
} = require("../../utils/store");
const {
  ACTION_OPTIONS,
  BOUNDARY_STATES,
  EMOTION_OPTIONS,
  STAGE_POSITIONS,
  buildTradeReview,
  buildTradeReviewRecordView
} = require("../../modules/trade-review/index");
const { MARKET_PRESETS, TIMEFRAME_PRESETS } = require("../../modules/kline-simulator/index");

function defaultForm() {
  return {
    screenshotPath: "",
    marketKey: "cn",
    timeframeKey: "1d",
    tradeDate: todayKey(),
    symbol: "",
    entryReason: "",
    exitReason: "",
    actionKey: "planned",
    emotion: "平静",
    firstThought: "",
    planBoundary: "",
    boundaryState: "kept",
    stagePositionKey: "near_boundary",
    reviewNote: ""
  };
}

function decorateReport(report) {
  return buildTradeReviewRecordView(report);
}

Page({
  data: {
    form: defaultForm(),
    markets: MARKET_PRESETS,
    timeframes: TIMEFRAME_PRESETS,
    actions: ACTION_OPTIONS,
    emotions: EMOTION_OPTIONS,
    boundaryStates: BOUNDARY_STATES,
    stagePositions: STAGE_POSITIONS,
    report: null,
    records: []
  },

  onLoad(options = {}) {
    const patch = {};
    if (options.market) patch.marketKey = options.market;
    if (options.timeframe) patch.timeframeKey = options.timeframe;
    if (Object.keys(patch).length) this.patchForm(patch);
  },

  onShow() {
    this.refreshRecords();
  },

  refreshRecords() {
    const state = getTradeReviewRecords();
    this.setData({
      records: (state.records || []).slice().reverse().slice(0, 5).map(decorateReport)
    });
  },

  chooseImage() {
    const applyPath = (path) => {
      if (!path) return;
      this.setData({ form: Object.assign({}, this.data.form, { screenshotPath: path }) });
    };
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        success: (res) => applyPath((((res.tempFiles || [])[0] || {}).tempFilePath))
      });
      return;
    }
    wx.chooseImage({
      count: 1,
      sourceType: ["album", "camera"],
      success: (res) => applyPath((res.tempFilePaths || [])[0])
    });
  },

  selectMarket(e) {
    this.patchForm({ marketKey: e.currentTarget.dataset.key || "cn" });
  },

  selectTimeframe(e) {
    this.patchForm({ timeframeKey: e.currentTarget.dataset.key || "1d" });
  },

  selectAction(e) {
    this.patchForm({ actionKey: e.currentTarget.dataset.key || "planned" });
  },

  selectEmotion(e) {
    this.patchForm({ emotion: e.currentTarget.dataset.value || "平静" });
  },

  selectBoundaryState(e) {
    this.patchForm({ boundaryState: e.currentTarget.dataset.key || "kept" });
  },

  selectStage(e) {
    this.patchForm({ stagePositionKey: e.currentTarget.dataset.key || "near_boundary" });
  },

  changeDate(e) {
    this.patchForm({ tradeDate: e.detail.value });
  },

  inputSymbol(e) {
    this.patchForm({ symbol: e.detail.value });
  },

  inputEntryReason(e) {
    this.patchForm({ entryReason: e.detail.value });
  },

  inputExitReason(e) {
    this.patchForm({ exitReason: e.detail.value });
  },

  inputThought(e) {
    this.patchForm({ firstThought: e.detail.value });
  },

  inputBoundary(e) {
    this.patchForm({ planBoundary: e.detail.value });
  },

  inputNote(e) {
    this.patchForm({ reviewNote: e.detail.value });
  },

  patchForm(patch) {
    this.setData({ form: Object.assign({}, this.data.form, patch || {}) });
  },

  generateReview() {
    const report = buildTradeReview(this.data.form, {
      assessment: getAssessmentResult()
    });
    const state = saveTradeReviewRecord(report);
    this.setData({
      report: decorateReport(state.latest),
      records: (state.records || []).slice().reverse().slice(0, 5).map(decorateReport)
    });
    wx.showToast({ title: "复盘已生成", icon: "success" });
  },

  resetForm() {
    this.setData({ form: defaultForm(), report: null });
  },

  goKlineTraining() {
    const form = this.data.form || {};
    wx.navigateTo({
      url: `/pages/kline-simulator/index?market=${form.marketKey || "cn"}&timeframe=${form.timeframeKey || "1d"}`
    });
  },

  goReviewArchive() {
    wx.navigateTo({ url: "/pages/trade-review-archive/index" });
  },

  goReviewDetail(e) {
    const id = e.currentTarget.dataset.id || "";
    if (!id) return;
    wx.navigateTo({ url: `/pages/trade-review-detail/index?id=${id}` });
  }
});
