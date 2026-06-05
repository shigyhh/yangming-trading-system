const {
  getAssessmentResult,
  getTradeReviewRecords,
  getTraining7State,
  applyTradeReviewBindingResult,
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
const {
  requestTradeReviewOcrDraft,
  syncLocalState,
  syncTradeReviewRecord,
  syncTrainingProgress
} = require("../../utils/api");

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

function buildReviewFlow(form = {}, report = null) {
  const hasSource = !!form.screenshotPath || !!String(form.symbol || "").trim() || !!String(form.firstThought || "").trim();
  const hasConfirmed = !!String(form.firstThought || "").trim() && !!String(form.nextAction || "").trim();
  const hasReport = !!report;
  const matchText = hasReport
    ? (((report.historicalMatch || {}).sourceStatus) || "等待历史数据回看")
    : hasConfirmed
      ? "可先生成复盘，历史位置随后回看"
      : "确认字段后回看当时位置";
  return [
    {
      key: "source",
      number: "01",
      title: "留住真实记录",
      detail: hasSource ? "截图或手动记录已留住" : "可拍照、相册选择，也可先手动记录",
      done: hasSource,
      current: !hasSource
    },
    {
      key: "confirm",
      number: "02",
      title: "确认第一念",
      detail: hasConfirmed ? "第一念与下一次动作已写清" : "写下当时第一念和下一次动作",
      done: hasConfirmed,
      current: hasSource && !hasConfirmed
    },
    {
      key: "market",
      number: "03",
      title: "回看当时位置",
      detail: matchText,
      done: hasReport,
      current: hasConfirmed && !hasReport
    },
    {
      key: "review",
      number: "04",
      title: "生成活镜复盘",
      detail: hasReport ? "本次行为镜已生成" : "不评价外在波动，只照见反应模式",
      done: hasReport,
      current: false
    },
    {
      key: "mirror",
      number: "05",
      title: "写入活镜档案",
      detail: hasReport ? "已进入长期行为印记" : "生成后写入活镜",
      done: hasReport,
      current: false
    },
    {
      key: "training",
      number: "06",
      title: "生成下一练",
      detail: hasReport ? (report.trainingAction || "下一次同场景先停十秒") : "复盘后生成一条训练动作",
      done: hasReport,
      current: false
    }
  ];
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
    reviewFlow: buildReviewFlow(defaultForm(), null),
    ocrStatus: {
      state: "idle",
      text: "截图字段以手动确认为准。"
    },
    ocrDraft: null,
    showAdvanced: false,
    showResultDetail: false
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
      this.setData({
        form: Object.assign({}, this.data.form, { screenshotPath: path }),
        ocrStatus: {
          state: "loading",
          text: "正在请求识别草稿，字段仍需你确认。"
        }
      });
      this.requestOcrDraft(path);
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

  requestOcrDraft(path) {
    requestTradeReviewOcrDraft({ imagePath: path })
      .then((result) => {
        const draft = result.ocr_draft || result.ocrDraft || {};
        const fields = draft.fields || {};
        const patch = {};
        if (fields.tradeDate) patch.tradeDate = fields.tradeDate;
        if (fields.symbol) patch.symbol = fields.symbol;
        if (fields.marketKey) patch.marketKey = fields.marketKey;
        if (fields.timeframeKey) patch.timeframeKey = fields.timeframeKey;
        this.setData({
          form: Object.keys(patch).length ? Object.assign({}, this.data.form, patch) : this.data.form,
          ocrDraft: draft,
          ocrStatus: {
            state: draft.status || "pending",
            text: draft.message || "识别草稿已生成，请继续手动确认。"
          }
        });
      })
      .catch(() => {
        this.setData({
          ocrStatus: {
            state: "manual",
            text: "识别服务未连接，先手动确认字段。"
          }
        });
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
    const nextForm = Object.assign({}, this.data.form, patch || {});
    this.setData({
      form: nextForm,
      reviewFlow: buildReviewFlow(nextForm, this.data.report)
    });
  },

  toggleAdvanced() {
    this.setData({ showAdvanced: !this.data.showAdvanced });
  },

  toggleResultDetail() {
    this.setData({ showResultDetail: !this.data.showResultDetail });
  },

  generateReview() {
    const form = this.data.form || {};
    if (!form.screenshotPath && !String(form.symbol || "").trim() && !String(form.firstThought || "").trim()) {
      wx.showToast({ title: "先上传或手动记录", icon: "none" });
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
      exitReason: form.exitReason || form.afterReaction || (form.exitPrepared === "yes" ? "已提前写边界条件" : "边界条件未写清"),
      planBoundary: form.planBoundary || (form.exitPrepared === "yes" ? "已提前写边界条件" : "边界待补充"),
      reviewNote: form.reviewNote || form.nextAction,
      ocrDraft: this.data.ocrDraft || null
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
    syncTradeReviewRecord(state.latest)
      .then((result) => {
        const applied = applyTradeReviewBindingResult((state.latest || {}).id, result || {});
        const latest = applied.latest || state.latest;
        const nextState = applied.tradeReviewState || state;
        const nextReminder = buildLiveMirrorReminder(nextState);
        this.setData({
          report: decorateReport(latest),
          closure: buildTradeReviewClosure(latest, nextReminder),
          latestReviewId: (latest || {}).id || "",
          records: (nextState.records || []).slice().reverse().slice(0, 5).map(decorateReport),
          reviewFlow: buildReviewFlow(this.data.form, latest)
        });
      })
      .catch(() => {
        syncLocalState({ silent: true }).catch(() => {});
      });
    syncTrainingProgress().catch(() => {});
    const reminder = buildLiveMirrorReminder(state);
    this.setData({
      report: decorateReport(state.latest),
      closure: buildTradeReviewClosure(state.latest, reminder),
      latestReviewId: (state.latest || {}).id || "",
      records: (state.records || []).slice().reverse().slice(0, 5).map(decorateReport),
      reviewFlow: buildReviewFlow(this.data.form, state.latest),
      showResultDetail: false
    });
    wx.showToast({ title: "已写入活镜", icon: "success" });
  },

  resetForm() {
    const form = defaultForm();
    this.setData({
      form,
      report: null,
      closure: null,
      latestReviewId: "",
      reviewFlow: buildReviewFlow(form, null)
    });
  },

  goKlineTraining() {
    wx.navigateTo({ url: "/pages/kline-mind/index" });
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
