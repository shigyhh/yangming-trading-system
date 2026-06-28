const {
  getAssessmentResult,
  getTodayMind,
  getTodayReaction,
  getTodayReview,
  getTodayTraining,
  saveTodayTraining,
  getTodayIntradayBoundaryRecord,
  getTraining7State,
  saveTraining7Task,
  getKlineHistoryCache,
  getTodayKlineMindRecord,
  saveTodayKlineMindRecord,
  getTradeReviewRecords,
  saveTradeReviewRecord,
  saveInviteConversionEvent,
  saveZhixingReminderEvent
} = require("../../utils/store");
const { syncLocalState, syncTrainingProgress } = require("../../utils/api");
const { buildTraining7View } = require("../../modules/training7/index");
const {
  buildKlineMindSession,
  buildKlineMindRecord,
  listSpecialTrainingPacks,
  buildSpecialTrainingSessionMeta
} = require("../../modules/kline-mind/index");
const {
  ZHIXING_REMINDER_CHOICES,
  buildTrainingPreReminder,
  buildTrainingSceneReminder,
  createInterventionEvent
} = require("../../modules/zhixing-reminder/index");
const { buildKlineTradeReviewRecord: buildKlineMirrorRecord } = require("../../modules/kline-simulator/index");

function inferHeartThieves(text) {
  const value = String(text || "");
  if (/错过|急|冲动/.test(value)) return ["贪", "急"];
  if (/认错|解释|扛/.test(value)) return ["痴", "慢"];
  if (/不甘|夺回|证明/.test(value)) return ["急", "痴"];
  if (/确定|焦虑|反复/.test(value)) return ["惧", "疑"];
  return ["疑"];
}

function buildMirrorReviewFromKline(record = {}, session = {}, assessment = {}) {
  const market = session.market || {};
  const timeframe = (session.timeframeOptions || []).find((item) => item.key === record.timeframeKey) || {};
  const prescription = session.prescription || {};
  const mirror = assessment.primaryMirror || assessment.primary || session.personalityType || "待照见";
  const score = Number(record.score || 72);
  return buildKlineMirrorRecord({
    id: `kline-mind-${record.date || Date.now()}`,
    date: record.date,
    marketKey: record.marketKey,
    marketLabel: record.marketName || market.name || "历史品类",
    timeframeKey: record.timeframeKey,
    timeframeLabel: timeframe.label || record.timeframeKey || "历史周期",
    trainingDay: record.day || session.day || 1,
    sceneTitle: `${record.marketName || market.name || "历史品类"} · ${timeframe.label || record.timeframeKey || "历史周期"}`,
    trigger: session.prompt || market.mindQuestion || "历史 K 线观心",
    primaryReaction: record.firstReaction,
    emotion: record.bodySignal,
    firstThought: record.insightLine || record.firstReaction,
    boundary: record.boundaryChoice,
    boundaryState: "kept",
    boundaryStateLabel: record.boundaryChoice || "已记录守界动作",
    insight: record.insightLine,
    relatedPersonality: session.personalityType || mirror,
    relatedMirror: mirror,
    relatedHeartMirror: mirror,
    heartThieves: inferHeartThieves(`${record.firstReaction} ${prescription.heartThief} ${prescription.watchPoint}`),
    trainingSuggestion: prescription.boundaryPractice || record.boundaryChoice || "下一次先停十秒，再写下第一念。",
    isRealHistorical: !!session.hasHistoricalData,
    scores: {
      boundaryKeeping: Math.max(18, Math.min(96, score)),
      planExecution: record.boundaryChoice ? 76 : 58,
      emotionalStability: record.bodySignal ? 72 : 58,
      reviewCompletion: record.insightLine ? 84 : 62,
      impulseDelay: record.firstReaction ? 68 : 50
    }
  });
}

function buildForm(record = {}, session = {}) {
  return {
    marketKey: record.marketKey || ((session.market || {}).key) || "cn_equity",
    timeframeKey: record.timeframeKey || session.timeframeKey || "1d",
    selectedCandleKey: record.selectedCandleKey || session.selectedCandleKey || "",
    firstReaction: record.firstReaction || "",
    bodySignal: record.bodySignal || "",
    boundaryChoice: record.boundaryChoice || "",
    insightLine: record.insightLine || "",
    sourceType: record.sourceType || record.source_type || session.sourceType || session.source_type || "",
    source_type: record.source_type || record.sourceType || session.source_type || session.sourceType || "",
    errorType: record.errorType || record.error_type || session.errorType || session.error_type || "",
    error_type: record.error_type || record.errorType || session.error_type || session.errorType || "",
    sceneTags: record.sceneTags || record.scene_tags || session.sceneTags || session.scene_tags || [],
    scene_tags: record.scene_tags || record.sceneTags || session.scene_tags || session.sceneTags || [],
    trainingGoal: record.trainingGoal || record.training_goal || session.trainingGoal || session.training_goal || "",
    training_goal: record.training_goal || record.trainingGoal || session.training_goal || session.trainingGoal || "",
    expectedAction: record.expectedAction || record.expected_action || session.expectedAction || session.expected_action || "",
    expected_action: record.expected_action || record.expectedAction || session.expected_action || session.expectedAction || "",
    nextAction: record.nextAction || record.next_action || session.nextAction || session.next_action || "",
    next_action: record.next_action || record.nextAction || session.next_action || session.nextAction || "",
    defaultPrompt: record.defaultPrompt || record.default_prompt || session.defaultPrompt || session.default_prompt || "",
    default_prompt: record.default_prompt || record.defaultPrompt || session.default_prompt || session.defaultPrompt || "",
    trainingPrescription: record.trainingPrescription || record.training_prescription || session.trainingPrescription || session.training_prescription || "",
    training_prescription: record.training_prescription || record.trainingPrescription || session.training_prescription || session.trainingPrescription || "",
    trainingPackId: record.trainingPackId || record.training_pack_id || session.trainingPackId || session.training_pack_id || "",
    training_pack_id: record.training_pack_id || record.trainingPackId || session.training_pack_id || session.trainingPackId || "",
    trainingPackTitle: record.trainingPackTitle || record.training_pack_title || session.trainingPackTitle || session.training_pack_title || "",
    training_pack_title: record.training_pack_title || record.trainingPackTitle || session.training_pack_title || session.trainingPackTitle || ""
  };
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function pickValue(...values) {
  for (let index = 0; index < values.length; index += 1) {
    if (hasValue(values[index])) return values[index];
  }
  return undefined;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function uniqueList(values) {
  const seen = {};
  return values.filter((item) => {
    const key = String(item || "").trim();
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function isReviewFocusEntry(options = {}) {
  return options.sourceType === "review_focus" ||
    options.source_type === "review_focus" ||
    options.from === "review_focus";
}

function stripTrainingContext(form = {}) {
  const cleanForm = Object.assign({}, form);
  [
    "sourceType",
    "source_type",
    "errorType",
    "error_type",
    "sceneTags",
    "scene_tags",
    "trainingGoal",
    "training_goal",
    "expectedAction",
    "expected_action",
    "nextAction",
    "next_action",
    "defaultPrompt",
    "default_prompt",
    "trainingPrescription",
    "training_prescription",
    "trainingPackId",
    "training_pack_id",
    "trainingPackTitle",
    "training_pack_title",
    "sourceReviewId",
    "source_review_id"
  ].forEach((key) => {
    delete cleanForm[key];
  });
  return cleanForm;
}

function buildReviewFocusFromEntry(options = {}, tradeReviewState = {}) {
  if (!isReviewFocusEntry(options)) return null;
  const records = tradeReviewState.records || [];
  const reviewId = pickValue(options.sourceReviewId, options.source_review_id, options.reviewId, options.id);
  const latestReview = reviewId
    ? records.find((item) => item && item.id === reviewId) || tradeReviewState.latest || {}
    : tradeReviewState.latest || records[records.length - 1] || {};
  const historicalMatch = latestReview.historicalMatch || {};
  const errorType = pickValue(
    options.errorType,
    options.error_type,
    latestReview.mainErrorType,
    latestReview.main_error_type,
    latestReview.relatedMirror,
    latestReview.relatedPersonality,
    latestReview.personalityType
  );
  const sceneTags = normalizeList(pickValue(latestReview.sceneTags, latestReview.scene_tags));
  const fallbackTags = uniqueList([
    ...normalizeList(pickValue(latestReview.triggerScene, latestReview.trigger_scene)),
    historicalMatch.stagePosition,
    latestReview.stageName,
    latestReview.stageGate,
    ...(latestReview.heartThieves || []),
    errorType
  ].map((item) => String(item || "").trim()).filter(Boolean));
  const nextAction = pickValue(
    latestReview.nextAction,
    latestReview.next_action,
    latestReview.nextRule,
    latestReview.next_rule,
    latestReview.trainingAction,
    latestReview.training_action
  );
  const trainingPrescription = pickValue(
    latestReview.trainingPrescription,
    latestReview.training_prescription,
    latestReview.trainingAction,
    latestReview.training_action,
    nextAction
  );
  const sourceReviewId = pickValue(reviewId, latestReview.id);

  return {
    sourceType: "review_focus",
    source_type: "review_focus",
    errorType: errorType || "待照见",
    error_type: errorType || "待照见",
    trainingPrescription,
    training_prescription: trainingPrescription,
    sceneTags: sceneTags.length ? sceneTags : fallbackTags,
    scene_tags: sceneTags.length ? sceneTags : fallbackTags,
    nextAction: nextAction || "",
    next_action: nextAction || "",
    sourceReviewId: sourceReviewId || "",
    source_review_id: sourceReviewId || ""
  };
}

Page({
  data: {
    assessment: null,
    training7View: buildTraining7View({}, {}),
    trainingDay: null,
    session: buildKlineMindSession({}),
    reviewFocus: null,
    reviewFocusErrorType: "",
    reviewFocusNextAction: "",
    form: buildForm(),
    specialTrainingPacks: listSpecialTrainingPacks(),
    activeTrainingMode: "base_blind",
    savedRecord: null,
    saving: false,
    zhixingReminderDisabled: false,
    zhixingReminderShownCount: 0,
    showSelectors: false,
    showGuide: false,
    showBodySignal: false
  },

  onLoad(options = {}) {
    this.entryOptions = options || {};
  },

  onShow() {
    this.load();
  },

  load() {
    const assessment = getAssessmentResult();
    const klineMindRecord = getTodayKlineMindRecord();
    const training = getTodayTraining();
    const training7View = buildTraining7View(getTraining7State(), {
      mind: getTodayMind(),
      reactionRecord: getTodayReaction(),
      intradayBoundaryRecord: getTodayIntradayBoundaryRecord(),
      review: getTodayReview(),
      training,
      klineMindRecord
    });
    const trainingDay = training7View.today || {};
    const reviewFocus = buildReviewFocusFromEntry(this.entryOptions || {}, getTradeReviewRecords());
    const session = buildKlineMindSession({
      assessment,
      trainingDay,
      record: klineMindRecord,
      historyCache: getKlineHistoryCache(),
      reviewFocus
    });
    const form = buildForm(klineMindRecord, session);
    const sourceType = session.sourceType || session.source_type || "";

    this.setData({
      assessment,
      training7View,
      trainingDay,
      session,
      reviewFocus,
      reviewFocusErrorType: (reviewFocus && (reviewFocus.errorType || reviewFocus.error_type)) || "",
      reviewFocusNextAction: (reviewFocus && (reviewFocus.nextAction || reviewFocus.next_action)) || "",
      form,
      specialTrainingPacks: listSpecialTrainingPacks(),
      activeTrainingMode: sourceType || "base_blind",
      savedRecord: klineMindRecord && klineMindRecord.updatedAt ? klineMindRecord : null,
      showBodySignal: !!form.bodySignal
    });
  },

  selectCandle(e) {
    const selectedCandleKey = e.currentTarget.dataset.key;
    const form = Object.assign({}, this.data.form, { selectedCandleKey });
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache(),
      reviewFocus: this.data.reviewFocus
    });
    this.setData({ form, session });
  },

  selectMarket(e) {
    const marketKey = e.currentTarget.dataset.market;
    const form = Object.assign({}, this.data.form, {
      marketKey,
      selectedCandleKey: ""
    });
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache(),
      reviewFocus: this.data.reviewFocus
    });
    this.setData({
      form: Object.assign({}, form, { selectedCandleKey: session.selectedCandleKey }),
      session
    });
  },

  selectTimeframe(e) {
    const timeframeKey = e.currentTarget.dataset.timeframe;
    const form = Object.assign({}, this.data.form, {
      timeframeKey,
      selectedCandleKey: ""
    });
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache(),
      reviewFocus: this.data.reviewFocus
    });
    this.setData({
      form: Object.assign({}, form, { selectedCandleKey: session.selectedCandleKey }),
      session
    });
  },

  selectOption(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.currentTarget.dataset.value;
    if (!field) return;
    this.setData({ [`form.${field}`]: value });
  },

  inputInsight(e) {
    this.setData({ "form.insightLine": e.detail.value });
  },

  toggleSelectors() {
    this.setData({ showSelectors: !this.data.showSelectors });
  },

  toggleGuide() {
    this.setData({ showGuide: !this.data.showGuide });
  },

  toggleBodySignal() {
    this.setData({ showBodySignal: !this.data.showBodySignal });
  },

  startReviewFocusTraining() {
    if (!this.data.reviewFocus) {
      wx.showToast({ title: "先从复盘错题进入今日针对训练", icon: "none" });
      return;
    }
    const reminder = buildTrainingPreReminder(this.buildZhixingReminderContext());
    if (reminder && !this.data.zhixingReminderDisabled) {
      this.presentZhixingReminder(reminder, {
        onContinue: () => this.enterReviewFocusTraining(),
        onHold: () => wx.showToast({ title: "已记录观望，本次先不训练", icon: "none" }),
        onLater: () => wx.showToast({ title: "已记录稍后再练", icon: "none" }),
        onMute: () => this.enterReviewFocusTraining({ disableReminders: true })
      });
      return;
    }
    this.enterReviewFocusTraining();
  },

  enterReviewFocusTraining(options = {}) {
    const form = stripTrainingContext(this.data.form || {});
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache(),
      reviewFocus: this.data.reviewFocus
    });
    this.setData({
      form: buildForm(form, session),
      session,
      reviewFocusErrorType: (this.data.reviewFocus && (this.data.reviewFocus.errorType || this.data.reviewFocus.error_type)) || "",
      reviewFocusNextAction: (this.data.reviewFocus && (this.data.reviewFocus.nextAction || this.data.reviewFocus.next_action)) || "",
      activeTrainingMode: "review_focus",
      zhixingReminderDisabled: options.disableReminders ? true : this.data.zhixingReminderDisabled,
      zhixingReminderShownCount: 0
    });
    wx.showToast({ title: "已进入今日针对训练", icon: "none" });
  },

  startSpecialTraining(e) {
    const packId = String(((e.currentTarget || {}).dataset || {}).packId || "").trim();
    const meta = buildSpecialTrainingSessionMeta(packId);
    if (!meta.errorType) {
      wx.showToast({ title: "专项训练暂不可用", icon: "none" });
      return;
    }
    const form = Object.assign({}, stripTrainingContext(this.data.form || {}), meta);
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache(),
      specialTraining: meta
    });
    this.setData({
      form: buildForm(form, session),
      session,
      reviewFocus: null,
      reviewFocusErrorType: "",
      reviewFocusNextAction: "",
      activeTrainingMode: "special_training",
      zhixingReminderDisabled: false,
      zhixingReminderShownCount: 0
    });
    wx.showToast({ title: "已进入专项训练", icon: "none" });
  },

  startBaseBlindTraining() {
    const form = stripTrainingContext(this.data.form || {});
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache()
    });
    this.setData({
      form: buildForm(form, session),
      session,
      reviewFocus: null,
      reviewFocusErrorType: "",
      reviewFocusNextAction: "",
      activeTrainingMode: "base_blind",
      zhixingReminderDisabled: false,
      zhixingReminderShownCount: 0
    });
    wx.showToast({ title: "已进入基础盲练", icon: "none" });
  },

  buildZhixingReminderContext() {
    const form = this.data.form || {};
    const session = this.data.session || {};
    const reviewFocus = this.data.reviewFocus || {};
    const sceneTags = normalizeList(pickValue(
      form.sceneTags,
      form.scene_tags,
      session.sceneTags,
      session.scene_tags,
      reviewFocus.sceneTags,
      reviewFocus.scene_tags
    ));
    return {
      errorType: pickValue(
        form.errorType,
        form.error_type,
        session.errorType,
        session.error_type,
        reviewFocus.errorType,
        reviewFocus.error_type
      ),
      error_type: pickValue(
        form.error_type,
        form.errorType,
        session.error_type,
        session.errorType,
        reviewFocus.error_type,
        reviewFocus.errorType
      ),
      sceneTag: sceneTags[0] || "",
      scene_tag: sceneTags[0] || "",
      sceneTags,
      scene_tags: sceneTags,
      nextAction: pickValue(
        form.nextAction,
        form.next_action,
        session.nextAction,
        session.next_action,
        reviewFocus.nextAction,
        reviewFocus.next_action
      ),
      next_action: pickValue(
        form.next_action,
        form.nextAction,
        session.next_action,
        session.nextAction,
        reviewFocus.next_action,
        reviewFocus.nextAction
      ),
      trainingPrescription: pickValue(
        form.trainingPrescription,
        form.training_prescription,
        session.trainingPrescription,
        session.training_prescription,
        reviewFocus.trainingPrescription,
        reviewFocus.training_prescription
      ),
      training_prescription: pickValue(
        form.training_prescription,
        form.trainingPrescription,
        session.training_prescription,
        session.trainingPrescription,
        reviewFocus.training_prescription,
        reviewFocus.trainingPrescription
      )
    };
  },

  presentZhixingReminder(reminder, handlers = {}) {
    if (!wx.showModal || !wx.showActionSheet) {
      this.saveZhixingReminderResponse(reminder, "continue");
      if (handlers.onContinue) handlers.onContinue();
      return;
    }
    wx.showModal({
      title: reminder.title || "知行提醒",
      content: reminder.message || "",
      confirmText: "选择动作",
      cancelText: "稍后再练",
      success: (modalResult) => {
        if (!modalResult.confirm) {
          this.saveZhixingReminderResponse(reminder, "later");
          if (handlers.onLater) handlers.onLater();
          return;
        }
        wx.showActionSheet({
          itemList: ZHIXING_REMINDER_CHOICES.map((item) => item.label),
          success: (actionResult) => {
            const choice = ZHIXING_REMINDER_CHOICES[actionResult.tapIndex] || ZHIXING_REMINDER_CHOICES[0];
            this.handleZhixingReminderResponse(reminder, choice.key, handlers);
          },
          fail: () => {
            this.saveZhixingReminderResponse(reminder, "later");
            if (handlers.onLater) handlers.onLater();
          }
        });
      }
    });
  },

  handleZhixingReminderResponse(reminder, response, handlers = {}) {
    this.saveZhixingReminderResponse(reminder, response);
    if (response === "mute_session") {
      this.setData({ zhixingReminderDisabled: true });
      if (handlers.onMute) handlers.onMute();
      else if (handlers.onContinue) handlers.onContinue();
      return;
    }
    if (response === "change_to_hold") {
      if (handlers.onHold) handlers.onHold();
      return;
    }
    if (response === "later") {
      if (handlers.onLater) handlers.onLater();
      return;
    }
    if (handlers.onContinue) handlers.onContinue();
  },

  saveZhixingReminderResponse(reminder, response) {
    const event = createInterventionEvent(Object.assign({}, reminder || {}, {
      userResponse: response
    }));
    saveZhixingReminderEvent(event);
    if ((reminder || {}).triggerType === "during_training") {
      this.setData({
        zhixingReminderShownCount: Math.min(
          2,
          Number(this.data.zhixingReminderShownCount || 0) + 1
        )
      });
    }
    syncLocalState({ silent: true }).catch(() => {});
  },

  saveRecord() {
    if (this.data.saving) return;
    if (!(this.data.session || {}).hasHistoricalData) {
      wx.showToast({ title: "请先同步历史数据", icon: "none" });
      return;
    }
    const form = this.data.form || {};
    if (!form.firstReaction) {
      wx.showToast({ title: "先照见第一反应", icon: "none" });
      return;
    }
    if (!form.boundaryChoice) {
      wx.showToast({ title: "请选择守界动作", icon: "none" });
      return;
    }
    if (!String(form.insightLine || "").trim()) {
      wx.showToast({ title: "写一句今日照见", icon: "none" });
      return;
    }

    const reminder = buildTrainingSceneReminder(Object.assign({}, this.buildZhixingReminderContext(), {
      shownCount: this.data.zhixingReminderShownCount,
      muted: this.data.zhixingReminderDisabled
    }));
    if (reminder) {
      this.presentZhixingReminder(reminder, {
        onContinue: () => this.persistKlineMindRecord(),
        onHold: () => this.persistKlineMindRecord({ forceHold: true }),
        onLater: () => wx.showToast({ title: "已记录稍后再练", icon: "none" }),
        onMute: () => this.persistKlineMindRecord()
      });
      return;
    }
    this.persistKlineMindRecord();
  },

  persistKlineMindRecord(options = {}) {
    let form = this.data.form || {};
    if (options.forceHold) {
      form = Object.assign({}, form, { boundaryChoice: "改为观望" });
      this.setData({ form });
    }
    this.setData({ saving: true });
    const record = buildKlineMindRecord(form, this.data.session);
    const saved = saveTodayKlineMindRecord(record);
    const mirrorRecord = buildMirrorReviewFromKline(saved, this.data.session, this.data.assessment || {});
    const mirrorState = saveTradeReviewRecord(mirrorRecord);
    const training = getTodayTraining();
    const steps = Object.assign({}, training.steps || {}, {
      trigger: true,
      micro: true
    });
    saveTodayTraining(Object.assign({}, training, {
      steps,
      klineMindRecord: saved,
      indexFocus: (this.data.session.stageGate || {}).name || "",
      mindTask: (this.data.session.prescription || {}).boundaryPractice || ""
    }));
    saveTraining7Task((this.data.training7View || {}).currentDay || record.day || 1, "daily_practice", true);
    saveTraining7Task((this.data.training7View || {}).currentDay || record.day || 1, "kline", true);
    saveInviteConversionEvent("kline_training_completed", {
      sourcePage: "kline_mind",
      shareCardType: "kline_insight",
      trainingDay: record.day || 1,
      relatedMirror: ((mirrorState || {}).latest || {}).relatedMirror || ""
    });
    syncLocalState({ silent: true }).catch(() => {});
    syncTrainingProgress().catch(() => {});
    wx.showToast({ title: "已写入活镜", icon: "success" });
    this.setData({ savedRecord: saved, saving: false });
    this.load();
  },

  goTraining() {
    wx.redirectTo({ url: "/pages/training/index" });
  },

  goReport() {
    wx.navigateTo({ url: "/pages/report/index" });
  },

  goRetest() {
    wx.redirectTo({ url: "/pages/assessment/index" });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/home/index" });
  },

  goLivingMirror() {
    wx.redirectTo({ url: "/pages/living-mirror/index" });
  }
});
