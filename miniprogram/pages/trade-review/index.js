const {
  getAssessmentResult,
  getTradeReviewRecords,
  getTraining7State,
  saveTradeReviewRecord,
  saveTraining7Task,
  saveInviteConversionEvent,
  todayKey
} = require("../../utils/store");
const {
  ACTION_OPTIONS,
  BOUNDARY_STATES,
  EMOTION_OPTIONS,
  STAGE_POSITIONS,
  buildLiveMirrorReminder,
  buildTradeReview,
  buildTradeReviewClosure,
  buildTradeReviewRecordView
} = require("../../modules/trade-review/index");
const { MARKET_PRESETS, TIMEFRAME_PRESETS } = require("../../modules/kline-simulator/index");
const { syncLocalState, syncTrainingProgress } = require("../../utils/api");

function defaultForm() {
  return {
    screenshotPath: "",
    marketKey: "cn",
    timeframeKey: "1d",
    tradeDate: todayKey(),
    symbol: "",
    entryReason: "",
    exitReason: "",
    inPlan: "yes",
    changedPlan: "no",
    exitPrepared: "yes",
    afterReaction: "",
    nextAction: "",
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
    closure: null,
    latestReviewId: "",
    records: [],
    showAdvanced: false
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

  selectPlanState(e) {
    this.patchForm({ inPlan: e.currentTarget.dataset.value || "yes" });
  },

  selectChangedPlan(e) {
    this.patchForm({ changedPlan: e.currentTarget.dataset.value || "no" });
  },

  selectExitPrepared(e) {
    this.patchForm({ exitPrepared: e.currentTarget.dataset.value || "yes" });
  },

  inputThought(e) {
    this.patchForm({ firstThought: e.detail.value });
  },

  inputAfterReaction(e) {
    this.patchForm({ afterReaction: e.detail.value });
  },

  inputNextAction(e) {
    this.patchForm({ nextAction: e.detail.value });
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

  toggleAdvanced() {
    this.setData({ showAdvanced: !this.data.showAdvanced });
  },

  generateReview() {
    const form = this.data.form || {};
    if (!form.screenshotPath) {
      wx.showToast({ title: "先上传截图证据", icon: "none" });
      return;
    }
    if (!String(form.firstThought || "").trim()) {
      wx.showToast({ title: "先写下第一念", icon: "none" });
      return;
    }
    if (!String(form.nextAction || "").trim()) {
      wx.showToast({ title: "写下下一次动作", icon: "none" });
      return;
    }
    const formForReview = Object.assign({}, form, {
      actionKey: form.inPlan === "no" ? "impulse" : form.actionKey,
      boundaryState: form.changedPlan === "yes" || form.exitPrepared === "no" ? "near" : form.boundaryState,
      entryReason: form.entryReason || (form.inPlan === "no" ? "计划外动作" : "计划内动作"),
      exitReason: form.exitReason || form.afterReaction || (form.exitPrepared === "yes" ? "已提前写离场条件" : "离场条件未写清"),
      planBoundary: form.planBoundary || (form.exitPrepared === "yes" ? "已提前写离场条件" : "边界待补充"),
      reviewNote: form.reviewNote || form.nextAction
    });
    const report = buildTradeReview(formForReview, {
      assessment: getAssessmentResult()
    });
    const state = saveTradeReviewRecord(report);
    const day = (getTraining7State() || {}).currentDay || 1;
    saveTraining7Task(day, "reaction_record", true);
    saveInviteConversionEvent("trade_review_completed", {
      sourcePage: "trade_review",
      shareCardType: "daily_mantra",
      relatedMirror: (state.latest || {}).relatedMirror || "",
      reviewId: (state.latest || {}).id || ""
    });
    syncLocalState({ silent: true }).catch(() => {});
    syncTrainingProgress().catch(() => {});
    const reminder = buildLiveMirrorReminder(state);
    this.setData({
      report: decorateReport(state.latest),
      closure: buildTradeReviewClosure(state.latest, reminder),
      latestReviewId: (state.latest || {}).id || "",
      records: (state.records || []).slice().reverse().slice(0, 5).map(decorateReport)
    });
    wx.showToast({ title: "已写入活镜", icon: "success" });
  },

  resetForm() {
    this.setData({ form: defaultForm(), report: null, closure: null, latestReviewId: "" });
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
  },

  goGeneratedDetail() {
    const id = this.data.latestReviewId || ((this.data.report || {}).id);
    if (!id) return;
    wx.navigateTo({ url: `/pages/trade-review-detail/index?id=${id}` });
  },

  goLivingMirror() {
    wx.redirectTo({ url: "/pages/living-mirror/index" });
  }
});
