const {
  getAssessmentResult,
  getUserBinding,
  getTradeReviewRecords,
  getTraining7State,
  applyTradeReviewBindingResult,
  saveTradeReviewRecord,
  saveTraining7Task,
  saveInviteConversionEvent,
  getZhixingReminderEvents,
  saveZhixingReminderEvent,
  getExecutionPlanLibrary,
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
const {
  listInterventionRules,
  listExecutionPlans,
  fetchDashboardSummary,
  fetchDashboardWeeklySummary,
  buildTradeReviewUrl,
  fetchTradeReviewMarketContext,
  createRemoteInterventionEvent,
  requestTradeReviewOcrDraft,
  syncLocalState,
  syncTradeReviewRecord,
  syncTrainingProgress
} = require("../../utils/api");
const {
  AFTER_REVIEW_RESPONSE_CHOICES,
  buildReviewRepeatReminder,
  createInterventionEvent,
  normalizeZhixingReminderResponse,
  shouldShowAfterReviewRepeatReminder
} = require("../../modules/zhixing-reminder/index");
const { normalizeInterventionResources } = require("../../modules/intervention-engine/index");

const FIRST_THOUGHT_OPTIONS = ["怕错过", "不甘心", "想证明", "怕亏", "想扳回"];
const PLAN_STATE_OPTIONS = [
  { key: "yes", label: "计划内" },
  { key: "no", label: "计划外" },
  { key: "unclear", label: "说不清" }
];
const POSITION_STATES = [
  { key: "holding", label: "持仓中" },
  { key: "closed", label: "已平仓" },
  { key: "trapped", label: "被套承压" }
];
const NEXT_ACTION_OPTIONS = ["停十秒", "只按计划", "不追涨", "不扛单", "先记录"];

function syncPageTabBarActive(page) {
  if (!page || typeof page.getTabBar !== "function") return;
  const tabBar = page.getTabBar();
  if (tabBar && typeof tabBar.syncActiveFromRoute === "function") {
    tabBar.syncActiveFromRoute();
  }
}

function switchTabPage(url) {
  wx.switchTab({
    url,
    fail: () => wx.showToast({
      title: "暂时无法切换",
      icon: "none"
    })
  });
}

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
    positionState: "holding",
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

function defaultMarketContextStatus() {
  return {
    state: "idle",
    text: "补好日期和股票代码后，会自动回看 A 股日线当时位置。"
  };
}

function getChoiceLabel(list = [], key = "") {
  return ((list.find((item) => item.key === key) || {}).label) || "";
}

function buildMarketContextKey(form = {}) {
  return [
    form.marketKey || "cn",
    form.timeframeKey || "1d",
    form.tradeDate || "",
    String(form.symbol || "").trim()
  ].join("|");
}

function shouldPrefetchMarketContext(form = {}) {
  return !!String(form.symbol || "").trim() && !!form.tradeDate && !!form.timeframeKey;
}

function buildMarketContextStatus(context = {}) {
  if (context.status === "ready") {
    const range = context.dataStart && context.dataEnd ? ` · ${context.dataStart} 至 ${context.dataEnd}` : "";
    return {
      state: "ready",
      text: `历史位置已回看${range}`
    };
  }
  if (context.status === "missing_symbol") {
    return {
      state: "missing",
      text: "补充代码后回看当时位置。"
    };
  }
  if (context.status === "missing_cache") {
    return {
      state: "pending",
      text: "该标的历史缓存待载入，复盘可先保存。"
    };
  }
  if (context.status === "failed") {
    return {
      state: "failed",
      text: context.sourceStatus || "回看暂未完成，复盘可先保存。"
    };
  }
  return defaultMarketContextStatus();
}

function buildReviewFlow(form = {}, report = null, marketContext = null) {
  const hasSource = !!form.screenshotPath || !!String(form.symbol || "").trim() || !!String(form.firstThought || "").trim();
  const hasConfirmed = !!String(form.firstThought || "").trim() && !!String(form.nextAction || "").trim();
  const hasReport = !!report;
  const marketReady = (marketContext || {}).status === "ready";
  const matchText = hasReport
    ? (((report.historicalMatch || {}).sourceStatus) || "等待历史数据回看")
    : marketReady
      ? ((marketContext || {}).sourceStatus || "历史位置已回看")
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
      done: hasReport || marketReady,
      current: hasConfirmed && !hasReport && !marketReady
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

function resolveReportUrl(record = {}) {
  const userId = (getUserBinding() || {}).userId || "";
  const eventId = ((record.oneThoughtEvent || {}).eventId) || record.linkedOneThoughtEventId || record.eventId || "";
  return buildTradeReviewUrl({ userId, eventId }) || "/pages/report/index";
}

Page({
  data: {
    form: defaultForm(),
    firstThoughtOptions: FIRST_THOUGHT_OPTIONS,
    planStateOptions: PLAN_STATE_OPTIONS,
    positionStates: POSITION_STATES,
    nextActionOptions: NEXT_ACTION_OPTIONS,
    actions: ACTION_OPTIONS,
    emotions: EMOTION_OPTIONS,
    boundaryStates: BOUNDARY_STATES,
    stagePositions: STAGE_POSITIONS,
    report: null,
    closure: null,
    latestReviewId: "",
    records: [],
    reviewFlow: buildReviewFlow(defaultForm(), null),
    manualAnchorVisible: false,
    marketContext: null,
    marketContextKey: "",
    marketContextStatus: defaultMarketContextStatus(),
    interventionRules: [],
    interventionPlans: [],
    dashboardSummary: null,
    weeklySummary: null,
    interventionResourceFallbacks: [],
    reviewRepeatReminder: null,
    reviewRepeatReminderState: "idle",
    reviewRepeatReminderMuted: false,
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
    syncPageTabBarActive(this);
    this.refreshRecords();
    this.refreshInterventionResources();
  },

  refreshRecords() {
    const state = getTradeReviewRecords();
    this.setData({
      records: (state.records || []).slice().reverse().slice(0, 5).map(decorateReport)
    });
  },

  async refreshInterventionResources() {
    const settle = (promise) => promise
      .then((value) => ({ value, error: null }))
      .catch((error) => ({ value: null, error }));
    const results = await Promise.all([
      settle(listInterventionRules({ includeDisabled: false })),
      settle(listExecutionPlans({ includeDisabled: false })),
      settle(fetchDashboardSummary({ range: "30d" })),
      settle(fetchDashboardWeeklySummary({ week: "current" }))
    ]);
    const resources = normalizeInterventionResources({
      rulesResult: results[0].value,
      rulesError: results[0].error,
      plansResult: results[1].value,
      plansError: results[1].error,
      dashboardResult: results[2].value,
      dashboardError: results[2].error,
      weeklyResult: results[3].value,
      weeklyError: results[3].error,
      localExecutionPlanLibrary: getExecutionPlanLibrary()
    });
    this.setData({
      interventionRules: resources.rules,
      interventionPlans: resources.plans,
      dashboardSummary: resources.dashboardSummary,
      weeklySummary: resources.weeklySummary,
      interventionResourceFallbacks: resources.fallbacks
    });
  },

  chooseImage() {
    const applyPath = (path) => {
      if (!path) return;
      const nextForm = Object.assign({}, this.data.form, { screenshotPath: path });
      this.setData({
        form: nextForm,
        manualAnchorVisible: true,
        reviewFlow: buildReviewFlow(nextForm, this.data.report, this.data.marketContext),
        ocrStatus: {
          state: "loading",
          text: "正在识别截图，稍后确认字段。"
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
          manualAnchorVisible: true,
          ocrDraft: draft,
          ocrStatus: {
            state: draft.status || "pending",
            text: draft.message || "识别草稿已生成，确认后继续。"
          }
        });
        if (Object.keys(patch).length) this.patchForm(patch);
      })
      .catch(() => {
        this.setData({
          manualAnchorVisible: true,
          ocrStatus: {
            state: "manual",
            text: "截图未识别出来，补日期和代码即可。"
          }
        });
      });
  },

  showManualAnchor() {
    this.setData({
      manualAnchorVisible: true,
      ocrStatus: {
        state: "manual",
        text: "没有截图时，补日期和代码即可。"
      }
    });
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

  selectFirstThought(e) {
    this.patchForm({ firstThought: e.currentTarget.dataset.value || "" });
  },

  selectPositionState(e) {
    this.patchForm({ positionState: e.currentTarget.dataset.key || "holding" });
  },

  selectNextAction(e) {
    this.patchForm({ nextAction: e.currentTarget.dataset.value || "" });
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
    const previousKey = buildMarketContextKey(this.data.form || {});
    const nextForm = Object.assign({}, this.data.form, patch || {});
    const nextKey = buildMarketContextKey(nextForm);
    const shouldRefreshMarketContext = previousKey !== nextKey && (
      Object.prototype.hasOwnProperty.call(patch || {}, "marketKey") ||
      Object.prototype.hasOwnProperty.call(patch || {}, "timeframeKey") ||
      Object.prototype.hasOwnProperty.call(patch || {}, "tradeDate") ||
      Object.prototype.hasOwnProperty.call(patch || {}, "symbol")
    );
    this.setData({
      form: nextForm,
      reviewFlow: buildReviewFlow(nextForm, this.data.report, this.data.marketContext)
    });
    if (!shouldRefreshMarketContext) return;
    if (!shouldPrefetchMarketContext(nextForm)) {
      this.setData({
        marketContext: null,
        marketContextKey: nextKey,
        marketContextStatus: defaultMarketContextStatus(),
        reviewFlow: buildReviewFlow(nextForm, this.data.report, null)
      });
      return;
    }
    this.scheduleMarketContextPrefetch(nextForm, nextKey);
  },

  scheduleMarketContextPrefetch(form, key = buildMarketContextKey(form)) {
    if (this.marketContextTimer) clearTimeout(this.marketContextTimer);
    this.setData({
      marketContextKey: key,
      marketContextStatus: {
        state: "loading",
        text: "正在回看当时历史位置。"
      }
    });
    this.marketContextTimer = setTimeout(() => {
      this.prefetchMarketContext(form, key);
    }, 650);
  },

  prefetchMarketContext(form, key) {
    fetchTradeReviewMarketContext({
      marketKey: form.marketKey,
      timeframeKey: form.timeframeKey,
      symbol: form.symbol,
      tradeDate: form.tradeDate,
      windowSize: 150
    })
      .then((context) => {
        if (this.data.marketContextKey !== key) return;
        this.setData({
          marketContext: context,
          marketContextStatus: buildMarketContextStatus(context),
          reviewFlow: buildReviewFlow(this.data.form, this.data.report, context)
        });
      })
      .catch(() => {
        if (this.data.marketContextKey !== key) return;
        const context = {
          status: "failed",
          sourceStatus: "回看暂未完成，复盘可先保存。"
        };
        this.setData({
          marketContext: context,
          marketContextStatus: buildMarketContextStatus(context),
          reviewFlow: buildReviewFlow(this.data.form, this.data.report, context)
        });
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
    this.setData({
      reviewRepeatReminder: null,
      reviewRepeatReminderState: "idle",
      reviewRepeatReminderMuted: false
    });
    const positionStateLabel = getChoiceLabel(POSITION_STATES, form.positionState);
    const planStateLabel = getChoiceLabel(PLAN_STATE_OPTIONS, form.inPlan);
    const autoReviewNote = [
      positionStateLabel ? `当前状态：${positionStateLabel}` : "",
      planStateLabel ? `计划状态：${planStateLabel}` : "",
      form.nextAction ? `下一次执行动作：${form.nextAction}` : ""
    ].filter(Boolean).join("；");
    const formForReview = Object.assign({}, form, {
      actionKey: form.inPlan === "no" ? "impulse" : form.actionKey,
      boundaryState: form.changedPlan === "yes" || form.exitPrepared === "no" ? "near" : form.boundaryState,
      entryReason: form.entryReason || (form.inPlan === "no" ? "计划外动作" : "计划内动作"),
      exitReason: form.exitReason || form.afterReaction || (form.exitPrepared === "yes" ? "已提前写边界条件" : "边界条件未写清"),
      planBoundary: form.planBoundary || (form.exitPrepared === "yes" ? "已提前写边界条件" : "边界待补充"),
      reviewNote: form.reviewNote || autoReviewNote || form.nextAction,
      marketContext: this.data.marketContext || null,
      ocrDraft: this.data.ocrDraft || null
    });
    const report = buildTradeReview(formForReview, {
      assessment: getAssessmentResult(),
      executionPlanLibrary: getExecutionPlanLibrary()
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
          reviewFlow: buildReviewFlow(this.data.form, latest, this.data.marketContext)
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
      reviewFlow: buildReviewFlow(this.data.form, state.latest, this.data.marketContext),
      showResultDetail: false
    });
    wx.showToast({ title: "已写入活镜", icon: "success" });
    const zhixingReminder = buildReviewRepeatReminder({
      currentRecord: state.latest,
      records: state.records,
      executionPlanLibrary: getExecutionPlanLibrary(),
      interventionRules: this.data.interventionRules,
      interventionPlans: this.data.interventionPlans,
      dashboardSummary: this.data.dashboardSummary,
      weeklySummary: this.data.weeklySummary
    });
    const reminderGate = zhixingReminder ? shouldShowAfterReviewRepeatReminder({
      reminder: zhixingReminder,
      existingEvents: (getZhixingReminderEvents().records || []),
      muted: this.data.reviewRepeatReminderMuted,
      now: Date.now()
    }) : { show: false };
    if (zhixingReminder && reminderGate.show) {
      this.setData({
        reviewRepeatReminder: zhixingReminder,
        reviewRepeatReminderState: "ready"
      });
      setTimeout(() => this.presentReviewRepeatReminder(zhixingReminder), 350);
    }
  },

  presentReviewRepeatReminder(reminder) {
    if (!wx.showModal || !wx.showActionSheet) {
      this.saveReviewRepeatReminderResponse(reminder, "continue");
      return;
    }
    wx.showModal({
      title: reminder.title || "旧题复现提醒",
      content: reminder.message || "",
      confirmText: "选择动作",
      cancelText: "稍后再练",
      success: (modalResult) => {
        if (!modalResult.confirm) {
          this.saveReviewRepeatReminderResponse(reminder, "later");
          return;
        }
        wx.showActionSheet({
          itemList: AFTER_REVIEW_RESPONSE_CHOICES.map((item) => item.label),
          success: (actionResult) => {
            const choice = AFTER_REVIEW_RESPONSE_CHOICES[actionResult.tapIndex] || AFTER_REVIEW_RESPONSE_CHOICES[0];
            this.saveReviewRepeatReminderResponse(reminder, choice.key);
            if (choice.key === "review_to_training") this.goKlineTraining();
          },
          fail: () => {
            this.saveReviewRepeatReminderResponse(reminder, "later");
          }
        });
      }
    });
  },

  saveReviewRepeatReminderResponse(reminder, response) {
    const normalizedResponse = response === "review_to_training"
      ? "continue"
      : normalizeZhixingReminderResponse(response);
    const metadata = Object.assign({}, (reminder || {}).metadata || {}, response === "review_to_training" ? {
      action: "review_to_training"
    } : {});
    const event = createInterventionEvent(Object.assign({}, reminder || {}, {
      userResponse: normalizedResponse,
      metadata
    }));
    saveZhixingReminderEvent(event);
    createRemoteInterventionEvent(event).catch(() => {});
    syncLocalState({ silent: true }).catch(() => {});
    this.setData({
      reviewRepeatReminder: reminder || null,
      reviewRepeatReminderState: normalizedResponse === "mute_session" ? "muted" : "responded",
      reviewRepeatReminderMuted: normalizedResponse === "mute_session"
    });
  },

  resetForm() {
    const form = defaultForm();
    this.setData({
      form,
      report: null,
      closure: null,
      latestReviewId: "",
      reviewRepeatReminder: null,
      reviewRepeatReminderState: "idle",
      reviewRepeatReminderMuted: false,
      manualAnchorVisible: false,
      marketContext: null,
      marketContextKey: "",
      marketContextStatus: defaultMarketContextStatus(),
      reviewFlow: buildReviewFlow(form, null, null)
    });
  },

  onUnload() {
    if (this.marketContextTimer) clearTimeout(this.marketContextTimer);
  },

  goKlineTraining() {
    const reviewId = this.data.latestReviewId || ((this.data.report || {}).id) || "";
    const reviewQuery = reviewId
      ? `&sourceReviewId=${encodeURIComponent(reviewId)}&source_review_id=${encodeURIComponent(reviewId)}`
      : "";
    wx.navigateTo({ url: `/pages/kline-mind/index?sourceType=review_focus&source_type=review_focus${reviewQuery}` });
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
    const report = this.data.report || {};
    const id = this.data.latestReviewId || report.id;
    const reportUrl = resolveReportUrl(report);
    if (reportUrl && reportUrl.indexOf("/pages/") !== 0) {
      wx.navigateTo({ url: `/pages/h5-bridge/index?url=${encodeURIComponent(reportUrl)}` });
      return;
    }
    if (id) {
      wx.navigateTo({ url: `/pages/trade-review-detail/index?id=${id}` });
      return;
    }
    wx.navigateTo({ url: reportUrl || "/pages/report/index" });
  },

  goLivingMirror() {
    switchTabPage("/pages/living-mirror/index");
  }
});
