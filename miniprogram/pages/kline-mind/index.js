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
  saveZhixingReminderEvent,
  getExecutionPlanLibrary
} = require("../../utils/store");
const {
  syncLocalState,
  syncTrainingProgress,
  requestKlineTrainingSample,
  fetchKlineTrainingSlice,
  createTrainingBookmark,
  listInterventionRules,
  listExecutionPlans,
  fetchDashboardSummary,
  fetchDashboardWeeklySummary,
  createRemoteInterventionEvent
} = require("../../utils/api");
const { buildTraining7View } = require("../../modules/training7/index");
const {
  buildKlineMindSession,
  buildKlineMindRecord,
  listSpecialTrainingPacks,
  buildSpecialTrainingSessionMeta,
  buildCustomSessionMeta,
  buildKlineSamplingRequest,
  normalizeKlineSamplingResult,
  buildTrainingBookmark,
  getInitialKlineVisibleCount,
  startKlineTrainingRuntime,
  advanceKlineTrainingRuntime,
  recordKlineTrainingDecision,
  setKlineRuntimeChartZoom,
  setKlineRuntimeViewportPan,
  setKlineRuntimeIndicator,
  setKlineRuntimeMainIndicator,
  buildKlineTrainingRecordPatch
} = require("../../modules/kline-mind/index");
const { resolveExecutionPlanAction } = require("../../modules/execution-plan/index");
const {
  ZHIXING_REMINDER_CHOICES,
  buildTrainingPreReminder,
  buildTrainingSceneReminder,
  createInterventionEvent
} = require("../../modules/zhixing-reminder/index");
const {
  normalizeInterventionResources,
  shouldShowIntervention
} = require("../../modules/intervention-engine/index");
const { buildKlineTradeReviewRecord: buildKlineMirrorRecord } = require("../../modules/kline-simulator/index");

const DECISION_ACTIONS = [
  { key: "BUY", label: "买入" },
  { key: "SELL", label: "卖出" },
  { key: "HOLD", label: "观望" }
];

const CHART_ZOOM_ORDER = ["overview", "wide", "standard", "focus"];

function inferHeartThieves(text) {
  const value = String(text || "");
  if (/错过|急|冲动/.test(value)) return ["贪", "急"];
  if (/认错|解释|扛/.test(value)) return ["痴", "慢"];
  if (/不甘|夺回|证明/.test(value)) return ["急", "痴"];
  if (/确定|焦虑|反复/.test(value)) return ["惧", "疑"];
  return ["疑"];
}

function getLastItem(items = []) {
  return Array.isArray(items) && items.length ? items[items.length - 1] : null;
}

function buildRuntimeView(runtime = null) {
  if (!runtime) {
    return {
      visibleCandles: [],
      progressText: "等待历史片段",
      nextButtonText: "下一根",
      decisionPrompt: "历史片段载入后开始逐根盲练",
      latestCoach: "",
      latestRisk: "",
      latestEmotion: "",
      decisionCount: 0,
      positionText: "空仓",
      pnlText: "0.00%",
      drawdownText: "0.00%",
      chartBoardStyle: "",
      indicatorPanel: { type: "vol", label: "VOL", visible: true, items: [], lines: {} },
      indicatorOverlay: {
        ma5: [],
        ma10: [],
        ma20: [],
        bollUpper: [],
        bollLower: []
      },
      mustDecide: false,
      isComplete: false
    };
  }
  const activeKey = ((runtime.activeCandle || {}).key) || "";
  const visibleCandles = (runtime.visibleCandles || []).map((item) => Object.assign({}, item, {
    focus: item.key === activeKey || item.focus,
    selected: item.key === activeKey,
    label: item.key === activeKey ? "" : item.label
  }));
  const total = Number(runtime.totalCandles || (runtime.candles || []).length || 0);
  const current = total ? Math.min(total, Number(runtime.currentIndex || 0) + 1) : 0;
  const latestCoach = getLastItem(runtime.coachHints || []);
  const latestRisk = getLastItem(runtime.riskHints || []);
  const latestEmotion = getLastItem(runtime.emotionBadges || []);
  const metrics = runtime.sessionMetrics || {};
  const isComplete = total > 0 && current >= total;

  return {
    visibleCandles,
    progressText: total ? `第 ${current}/${total} 根` : "等待历史片段",
    nextButtonText: runtime.mustDecide ? "先做决策" : (isComplete ? "本段已完成" : "下一根"),
    decisionPrompt: runtime.mustDecide ? "这一根必须先做一次记录。" : "只看当下这一根，不猜后面。",
    latestCoach: (latestCoach || {}).text || "",
    latestRisk: (latestRisk || {}).text || "只做训练记录，不作当下判断。",
    latestEmotion: (latestEmotion || {}).label || "",
    decisionCount: (runtime.decisionTimeline || []).length,
    positionText: metrics.positionSize ? "持仓" : "空仓",
    pnlText: `${Number(metrics.totalPnl || 0).toFixed(2)}%`,
    drawdownText: `${Number(metrics.maxDrawdown || 0).toFixed(2)}%`,
    chartBoardStyle: runtime.chartBoardStyle || "",
    indicatorPanel: runtime.indicatorPanel || { type: "vol", label: "VOL", visible: true, items: [], lines: {} },
    indicatorOverlay: runtime.indicatorOverlay || {
      ma5: [],
      ma10: [],
      ma20: [],
      bollUpper: [],
      bollLower: []
    },
    mustDecide: !!runtime.mustDecide,
    isComplete
  };
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
    training_pack_title: record.training_pack_title || record.trainingPackTitle || session.training_pack_title || session.trainingPackTitle || "",
    segmentId: record.segmentId || record.segment_id || session.segmentId || session.segment_id || "",
    segment_id: record.segment_id || record.segmentId || session.segment_id || session.segmentId || "",
    samplingResult: record.samplingResult || record.sampling_result || session.samplingResult || session.sampling_result || null,
    sampling_result: record.sampling_result || record.samplingResult || session.sampling_result || session.samplingResult || null,
    fallbackUsed: pickValue(record.fallbackUsed, record.fallback_used, session.fallbackUsed, session.fallback_used, false),
    fallback_used: pickValue(record.fallback_used, record.fallbackUsed, session.fallback_used, session.fallbackUsed, false),
    fallbackReason: record.fallbackReason || record.fallback_reason || session.fallbackReason || session.fallback_reason || "",
    fallback_reason: record.fallback_reason || record.fallbackReason || session.fallback_reason || session.fallbackReason || "",
    symbol: record.symbol || session.symbol || "",
    period: record.period || session.period || record.timeframeKey || session.timeframeKey || "1d",
    startDate: record.startDate || record.start_date || session.startDate || session.start_date || "",
    start_date: record.start_date || record.startDate || session.start_date || session.startDate || "",
    endDate: record.endDate || record.end_date || session.endDate || session.end_date || "",
    end_date: record.end_date || record.endDate || session.end_date || session.endDate || "",
    trainingLength: record.trainingLength || record.training_length || session.trainingLength || session.training_length || 60,
    training_length: record.training_length || record.trainingLength || session.training_length || session.trainingLength || 60,
    hiddenSymbol: pickValue(record.hiddenSymbol, record.hidden_symbol, session.hiddenSymbol, session.hidden_symbol, true),
    hidden_symbol: pickValue(record.hidden_symbol, record.hiddenSymbol, session.hidden_symbol, session.hiddenSymbol, true),
    hiddenDateRange: pickValue(record.hiddenDateRange, record.hidden_date_range, session.hiddenDateRange, session.hidden_date_range, true),
    hidden_date_range: pickValue(record.hidden_date_range, record.hiddenDateRange, session.hidden_date_range, session.hiddenDateRange, true),
    customVisibleCount: record.customVisibleCount || record.custom_visible_count || session.customVisibleCount || session.custom_visible_count || 1,
    custom_visible_count: record.custom_visible_count || record.customVisibleCount || session.custom_visible_count || session.customVisibleCount || 1,
    customSymbolText: record.customSymbolText || record.custom_symbol_text || session.customSymbolText || session.custom_symbol_text || "",
    custom_symbol_text: record.custom_symbol_text || record.customSymbolText || session.custom_symbol_text || session.customSymbolText || "",
    customDateRangeText: record.customDateRangeText || record.custom_date_range_text || session.customDateRangeText || session.custom_date_range_text || "",
    custom_date_range_text: record.custom_date_range_text || record.customDateRangeText || session.custom_date_range_text || session.customDateRangeText || "",
    revealedSymbolText: record.revealedSymbolText || record.revealed_symbol_text || session.revealedSymbolText || session.revealed_symbol_text || "",
    revealed_symbol_text: record.revealed_symbol_text || record.revealedSymbolText || session.revealed_symbol_text || session.revealedSymbolText || "",
    revealedDateRangeText: record.revealedDateRangeText || record.revealed_date_range_text || session.revealedDateRangeText || session.revealed_date_range_text || "",
    revealed_date_range_text: record.revealed_date_range_text || record.revealedDateRangeText || session.revealed_date_range_text || session.revealedDateRangeText || ""
  };
}

function buildDefaultCustomSessionForm(session = {}, current = {}) {
  const market = session.market || {};
  return {
    symbol: current.symbol || market.defaultSymbol || "000001.SZ",
    period: current.period || session.timeframeKey || "1d",
    startDate: current.startDate || "",
    endDate: current.endDate || "",
    trainingLength: current.trainingLength || 60
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
    "source_review_id",
    "segmentId",
    "segment_id",
    "samplingResult",
    "sampling_result",
    "fallbackUsed",
    "fallback_used",
    "fallbackReason",
    "fallback_reason",
    "symbol",
    "period",
    "startDate",
    "start_date",
    "endDate",
    "end_date",
    "trainingLength",
    "training_length",
    "hiddenSymbol",
    "hidden_symbol",
    "hiddenDateRange",
    "hidden_date_range",
    "customVisibleCount",
    "custom_visible_count",
    "customSymbolText",
    "custom_symbol_text",
    "customDateRangeText",
    "custom_date_range_text",
    "revealedSymbolText",
    "revealed_symbol_text",
    "revealedDateRangeText",
    "revealed_date_range_text"
  ].forEach((key) => {
    delete cleanForm[key];
  });
  return cleanForm;
}

function stripSamplingContext(form = {}) {
  const cleanForm = Object.assign({}, form);
  [
    "segmentId",
    "segment_id",
    "samplingResult",
    "sampling_result",
    "fallbackUsed",
    "fallback_used",
    "fallbackReason",
    "fallback_reason"
  ].forEach((key) => {
    delete cleanForm[key];
  });
  return cleanForm;
}

function getFallbackReasonLabel(reason = "") {
  const labels = {
    no_matching_segment: "暂无匹配片段",
    excluded_all_segments: "已排除近期片段",
    segment_slice_unavailable: "片段数据暂不可用",
    no_enabled_segment: "暂无启用片段",
    sampling_api_failed: "抽题服务暂未连接",
    empty_sampling_result: "抽题结果为空"
  };
  return labels[reason] || reason || "";
}

function buildSamplingUi(status = "", message = "", error = "") {
  const titleMap = {
    loading: "正在抽取训练片段",
    matched: "已匹配片段",
    fallback: "使用基础盲练兜底",
    error: "抽题失败，请稍后重试"
  };
  return {
    samplingStatus: status,
    samplingStatusText: titleMap[status] || "",
    samplingMessage: message,
    samplingError: error
  };
}

function buildSamplingUiFromSession(session = {}) {
  const status = session.samplingStatus || session.sampling_status || "";
  if (!status) return buildSamplingUi();
  const fallbackReason = getFallbackReasonLabel(session.fallbackReason || session.fallback_reason || "");
  const sceneTags = normalizeList(session.sceneTags || session.scene_tags).join(" / ");
  const sourceLabel = session.samplingSourceLabel || session.sampling_source_label || (session.fallbackUsed || session.fallback_used ? "兜底片段" : "匹配片段");
  const message = [
    `训练片段来源：${sourceLabel}`,
    sceneTags ? `场景标签：${sceneTags}` : "",
    fallbackReason ? `原因：${fallbackReason}` : ""
  ].filter(Boolean).join("；");
  return buildSamplingUi(status, message);
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

function applyExecutionPlanToReviewFocus(reviewFocus, executionPlanLibrary) {
  if (!reviewFocus) return reviewFocus;
  const errorType = pickValue(reviewFocus.errorType, reviewFocus.error_type);
  const executionPlanAction = resolveExecutionPlanAction(errorType, executionPlanLibrary);
  if (!executionPlanAction) return reviewFocus;
  const nextAction = executionPlanAction.nextAction || reviewFocus.nextAction || reviewFocus.next_action || "";
  const trainingPrescription = executionPlanAction.trainingPrescription || reviewFocus.trainingPrescription || reviewFocus.training_prescription || "";
  return Object.assign({}, reviewFocus, {
    executionPlanId: executionPlanAction.planId,
    execution_plan_id: executionPlanAction.plan_id,
    expectedAction: executionPlanAction.expectedAction,
    expected_action: executionPlanAction.expected_action,
    nextAction,
    next_action: nextAction,
    trainingPrescription,
    training_prescription: trainingPrescription
  });
}

Page({
  data: {
    assessment: null,
    training7View: buildTraining7View({}, {}),
    trainingDay: null,
    session: buildKlineMindSession({}),
    decisionActions: DECISION_ACTIONS,
    trainingRuntime: null,
    runtimeView: buildRuntimeView(),
    selectedMainIndicatorKey: "ma",
    selectedIndicatorKey: "vol",
    reviewFocus: null,
    reviewFocusErrorType: "",
    reviewFocusNextAction: "",
    form: buildForm(),
    specialTrainingPacks: listSpecialTrainingPacks(),
    activeTrainingMode: "base_blind",
    customSessionForm: buildDefaultCustomSessionForm(),
    customSessionStatusText: "",
    customSessionMessage: "",
    customSessionError: "",
    samplingStatus: "",
    samplingStatusText: "",
    samplingMessage: "",
    samplingError: "",
    savedRecord: null,
    saving: false,
    bookmarkSaving: false,
    bookmarkMessage: "",
    bookmarkError: "",
    interventionRules: [],
    interventionPlans: [],
    dashboardSummary: null,
    weeklySummary: null,
    interventionResourceFallbacks: [],
    zhixingReminderDisabled: false,
    zhixingReminderShownCount: 0,
    zhixingReminderLastShownAtByKey: {},
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
    const executionPlanLibrary = getExecutionPlanLibrary();
    const reviewFocus = applyExecutionPlanToReviewFocus(
      buildReviewFocusFromEntry(this.entryOptions || {}, getTradeReviewRecords()),
      executionPlanLibrary
    );
    const session = buildKlineMindSession({
      assessment,
      trainingDay,
      record: klineMindRecord,
      historyCache: getKlineHistoryCache(),
      reviewFocus
    });
    const form = buildForm(klineMindRecord, session);
    const sourceType = session.sourceType || session.source_type || "";
    const samplingUi = buildSamplingUiFromSession(session);
    const runtimeData = this.buildRuntimeData(session, form);

    this.setData({
      assessment,
      training7View,
      trainingDay,
      session,
      trainingRuntime: runtimeData.trainingRuntime,
      runtimeView: runtimeData.runtimeView,
      selectedMainIndicatorKey: runtimeData.selectedMainIndicatorKey,
      selectedIndicatorKey: runtimeData.selectedIndicatorKey,
      reviewFocus,
      reviewFocusErrorType: (reviewFocus && (reviewFocus.errorType || reviewFocus.error_type)) || "",
      reviewFocusNextAction: (reviewFocus && (reviewFocus.nextAction || reviewFocus.next_action)) || "",
      form,
      specialTrainingPacks: listSpecialTrainingPacks(),
      activeTrainingMode: sourceType || "base_blind",
      customSessionForm: buildDefaultCustomSessionForm(session, this.data.customSessionForm),
      samplingStatus: samplingUi.samplingStatus,
      samplingStatusText: samplingUi.samplingStatusText,
      samplingMessage: samplingUi.samplingMessage,
      samplingError: samplingUi.samplingError,
      savedRecord: klineMindRecord && klineMindRecord.updatedAt ? klineMindRecord : null,
      showBodySignal: !!form.bodySignal
    });
    this.refreshInterventionResources(executionPlanLibrary);
  },

  buildTrainingRuntime(session, record = {}) {
    if (!session || !session.hasHistoricalData) return null;
    return startKlineTrainingRuntime(session, {
      trainingSessionId: `kline-session-${Date.now()}`,
      decisionInterval: 5,
      initialVisibleCount: getInitialKlineVisibleCount(session),
      initialMainIndicatorKey: this.data.selectedMainIndicatorKey || record.mainIndicatorKey || session.defaultMainIndicatorKey || "ma",
      initialIndicatorKey: this.data.selectedIndicatorKey || record.indicatorKey || session.defaultIndicatorKey || "vol",
      sliceSeed: record.segmentId || record.segment_id || ((session.historySlice || {}).seed) || ""
    });
  },

  buildRuntimeData(session, record = {}) {
    const trainingRuntime = this.buildTrainingRuntime(session, record);
    return {
      trainingRuntime,
      runtimeView: buildRuntimeView(trainingRuntime),
      selectedMainIndicatorKey: ((trainingRuntime || {}).mainIndicatorKey) || session.defaultMainIndicatorKey || "ma",
      selectedIndicatorKey: ((trainingRuntime || {}).indicatorPanelKey) || session.defaultIndicatorKey || "vol"
    };
  },

  async refreshInterventionResources(executionPlanLibrary = getExecutionPlanLibrary()) {
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
      localExecutionPlanLibrary: executionPlanLibrary
    });
    this.setData({
      interventionRules: resources.rules,
      interventionPlans: resources.plans,
      dashboardSummary: resources.dashboardSummary,
      weeklySummary: resources.weeklySummary,
      interventionResourceFallbacks: resources.fallbacks
    });
  },

  selectCandle(e) {
    const selectedCandleKey = e.currentTarget.dataset.key;
    const form = Object.assign({}, this.data.form, { selectedCandleKey });
    const isCustomSession = (this.data.session || {}).sourceType === "custom_session" || (this.data.session || {}).source_type === "custom_session";
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache(),
      reviewFocus: this.data.reviewFocus,
      customSession: isCustomSession ? Object.assign({}, this.data.session, form, {
        historySlice: (this.data.session || {}).historySlice
      }) : null
    });
    const runtimeData = this.buildRuntimeData(session, form);
    this.setData(Object.assign({ form, session }, runtimeData));
  },

  selectMarket(e) {
    const marketKey = e.currentTarget.dataset.market;
    const form = Object.assign({}, stripSamplingContext(this.data.form || {}), {
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
    const runtimeData = this.buildRuntimeData(session, form);
    this.setData({
      form: Object.assign({}, form, { selectedCandleKey: session.selectedCandleKey }),
      session,
      trainingRuntime: runtimeData.trainingRuntime,
      runtimeView: runtimeData.runtimeView,
      selectedMainIndicatorKey: runtimeData.selectedMainIndicatorKey,
      selectedIndicatorKey: runtimeData.selectedIndicatorKey,
      samplingStatus: "",
      samplingStatusText: "",
      samplingMessage: "",
      samplingError: ""
    });
  },

  selectTimeframe(e) {
    const timeframeKey = e.currentTarget.dataset.timeframe;
    const form = Object.assign({}, stripSamplingContext(this.data.form || {}), {
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
    const runtimeData = this.buildRuntimeData(session, form);
    this.setData({
      form: Object.assign({}, form, { selectedCandleKey: session.selectedCandleKey }),
      session,
      trainingRuntime: runtimeData.trainingRuntime,
      runtimeView: runtimeData.runtimeView,
      selectedMainIndicatorKey: runtimeData.selectedMainIndicatorKey,
      selectedIndicatorKey: runtimeData.selectedIndicatorKey,
      samplingStatus: "",
      samplingStatusText: "",
      samplingMessage: "",
      samplingError: ""
    });
  },

  updateChartZoom(chartZoomKey) {
    if (!chartZoomKey) return;
    const currentRuntime = this.data.trainingRuntime;
    const form = Object.assign({}, this.data.form || {}, {
      chartZoomKey,
      historySlice: (this.data.session || {}).historySlice || (this.data.form || {}).historySlice || null
    });
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache(),
      reviewFocus: this.data.reviewFocus
    });
    const trainingRuntime = currentRuntime
      ? setKlineRuntimeChartZoom(currentRuntime, chartZoomKey)
      : this.buildTrainingRuntime(session, form);
    const selectedCandleKey = ((trainingRuntime || {}).activeCandle || {}).key || session.selectedCandleKey || form.selectedCandleKey || "";
    this.setData({
      form: Object.assign({}, form, { selectedCandleKey }),
      session,
      trainingRuntime,
      runtimeView: buildRuntimeView(trainingRuntime)
    });
  },

  decreaseChartZoom() {
    const current = ((this.data.session || {}).chartZoomKey) || ((this.data.form || {}).chartZoomKey) || "wide";
    const index = CHART_ZOOM_ORDER.indexOf(current);
    const nextIndex = Math.max(0, index <= 0 ? 0 : index - 1);
    this.updateChartZoom(CHART_ZOOM_ORDER[nextIndex]);
  },

  increaseChartZoom() {
    const current = ((this.data.session || {}).chartZoomKey) || ((this.data.form || {}).chartZoomKey) || "wide";
    const index = CHART_ZOOM_ORDER.indexOf(current);
    const safeIndex = index >= 0 ? index : 0;
    const nextIndex = Math.min(CHART_ZOOM_ORDER.length - 1, safeIndex + 1);
    this.updateChartZoom(CHART_ZOOM_ORDER[nextIndex]);
  },

  onChartPanStart(e) {
    const touch = (e.touches || [])[0] || {};
    const runtime = this.data.trainingRuntime || {};
    this.chartPanStart = {
      x: Number(touch.clientX || 0),
      panOffset: Number(runtime.chartPanOffset || 0)
    };
  },

  onChartPanMove(e) {
    if (!this.chartPanStart || !this.data.trainingRuntime) return;
    const touch = (e.touches || [])[0] || {};
    const currentX = Number(touch.clientX || 0);
    const dx = currentX - Number(this.chartPanStart.x || 0);
    const viewport = (this.data.trainingRuntime || {}).chartViewport || {};
    const barStepPx = Math.max(4, Number(viewport.barStepRpx || 8) / 2);
    const deltaBars = Math.round(dx / barStepPx);
    const nextRuntime = setKlineRuntimeViewportPan(
      this.data.trainingRuntime,
      Number(this.chartPanStart.panOffset || 0) + deltaBars
    );
    this.setData({
      trainingRuntime: nextRuntime,
      runtimeView: buildRuntimeView(nextRuntime)
    });
  },

  onChartPanEnd() {
    this.chartPanStart = null;
  },

  selectMainIndicator(e) {
    const tappedKey = e.currentTarget.dataset.indicator || "ma";
    const indicatorKey = tappedKey === this.data.selectedMainIndicatorKey ? "hide" : tappedKey;
    const runtime = this.data.trainingRuntime
      ? setKlineRuntimeMainIndicator(this.data.trainingRuntime, indicatorKey)
      : null;
    this.setData({
      selectedMainIndicatorKey: indicatorKey,
      trainingRuntime: runtime,
      runtimeView: buildRuntimeView(runtime),
      form: Object.assign({}, this.data.form || {}, { mainIndicatorKey: indicatorKey })
    });
  },

  selectIndicator(e) {
    const tappedKey = e.currentTarget.dataset.indicator || "vol";
    const indicatorKey = tappedKey === this.data.selectedIndicatorKey ? "hide" : tappedKey;
    const runtime = this.data.trainingRuntime
      ? setKlineRuntimeIndicator(this.data.trainingRuntime, indicatorKey)
      : null;
    this.setData({
      selectedIndicatorKey: indicatorKey,
      trainingRuntime: runtime,
      runtimeView: buildRuntimeView(runtime)
    });
  },

  advanceRuntimeCandle() {
    const runtime = this.data.trainingRuntime;
    if (!runtime) {
      wx.showToast({ title: "历史片段载入后再开始", icon: "none" });
      return;
    }
    if (this.data.runtimeView && this.data.runtimeView.isComplete) {
      wx.showToast({ title: "本段已完成，可写入活镜", icon: "none" });
      return;
    }
    const nextRuntime = advanceKlineTrainingRuntime(runtime);
    if (nextRuntime.blockedReason === "decision_required") {
      this.setData({
        trainingRuntime: nextRuntime,
        runtimeView: buildRuntimeView(nextRuntime)
      });
      wx.showToast({ title: "先做一次记录", icon: "none" });
      return;
    }
    this.setData({
      trainingRuntime: nextRuntime,
      runtimeView: buildRuntimeView(nextRuntime),
      form: Object.assign({}, this.data.form || {}, {
        selectedCandleKey: ((nextRuntime.activeCandle || {}).key) || (this.data.form || {}).selectedCandleKey || ""
      })
    });
  },

  recordRuntimeDecision(e) {
    const runtime = this.data.trainingRuntime;
    if (!runtime) {
      wx.showToast({ title: "历史片段载入后再记录", icon: "none" });
      return;
    }
    const action = e.currentTarget.dataset.action || "HOLD";
    const form = this.data.form || {};
    const nextRuntime = recordKlineTrainingDecision(runtime, {
      action,
      selectedCandleKey: ((runtime.activeCandle || {}).key) || form.selectedCandleKey || "",
      firstReaction: form.firstReaction || "",
      boundaryChoice: form.boundaryChoice || ""
    });
    const runtimePatch = buildKlineTrainingRecordPatch(nextRuntime);
    this.setData({
      trainingRuntime: nextRuntime,
      runtimeView: buildRuntimeView(nextRuntime),
      form: Object.assign({}, form, {
        selectedCandleKey: runtimePatch.selectedCandleKey || form.selectedCandleKey || "",
        firstReaction: form.firstReaction || runtimePatch.firstReaction || "",
        boundaryChoice: form.boundaryChoice || runtimePatch.boundaryChoice || ""
      })
    });
    wx.showToast({
      title: action === "HOLD" ? "已记录观望" : "已记录动作",
      icon: "none"
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

  async enterReviewFocusTraining(options = {}) {
    const form = stripTrainingContext(this.data.form || {});
    const samplingAttempt = await this.fetchTrainingSample(this.data.reviewFocus || {});
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache(),
      reviewFocus: this.data.reviewFocus,
      samplingResult: samplingAttempt.samplingResult
    });
    const samplingUi = samplingAttempt.failed
      ? buildSamplingUi("fallback", "抽题失败，已切换基础盲练", getFallbackReasonLabel(samplingAttempt.fallbackReason))
      : buildSamplingUiFromSession(session);
    const nextForm = buildForm(form, session);
    const runtimeData = this.buildRuntimeData(session, nextForm);
    this.setData({
      form: nextForm,
      session,
      trainingRuntime: runtimeData.trainingRuntime,
      runtimeView: runtimeData.runtimeView,
      selectedMainIndicatorKey: runtimeData.selectedMainIndicatorKey,
      selectedIndicatorKey: runtimeData.selectedIndicatorKey,
      reviewFocusErrorType: (this.data.reviewFocus && (this.data.reviewFocus.errorType || this.data.reviewFocus.error_type)) || "",
      reviewFocusNextAction: (this.data.reviewFocus && (this.data.reviewFocus.nextAction || this.data.reviewFocus.next_action)) || "",
      activeTrainingMode: "review_focus",
      samplingStatus: samplingUi.samplingStatus,
      samplingStatusText: samplingUi.samplingStatusText,
      samplingMessage: samplingUi.samplingMessage,
      samplingError: samplingUi.samplingError,
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
    const reminder = buildTrainingPreReminder(Object.assign({}, this.buildZhixingReminderContext(), meta, {
      sourceType: "special_training",
      source_type: "special_training"
    }));
    if (reminder && !this.data.zhixingReminderDisabled) {
      this.presentZhixingReminder(reminder, {
        onContinue: () => this.enterSpecialTraining(meta),
        onHold: () => wx.showToast({ title: "已记录观望，本次先不训练", icon: "none" }),
        onLater: () => wx.showToast({ title: "已记录稍后再练", icon: "none" }),
        onMute: () => this.enterSpecialTraining(meta, { disableReminders: true })
      });
      return;
    }
    this.enterSpecialTraining(meta);
  },

  async enterSpecialTraining(meta = {}, options = {}) {
    const form = Object.assign({}, stripTrainingContext(this.data.form || {}), meta);
    const samplingAttempt = await this.fetchTrainingSample(meta);
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache(),
      specialTraining: meta,
      samplingResult: samplingAttempt.samplingResult
    });
    const samplingUi = samplingAttempt.failed
      ? buildSamplingUi("fallback", "抽题失败，已切换基础盲练", getFallbackReasonLabel(samplingAttempt.fallbackReason))
      : buildSamplingUiFromSession(session);
    const nextForm = buildForm(form, session);
    const runtimeData = this.buildRuntimeData(session, nextForm);
    this.setData({
      form: nextForm,
      session,
      trainingRuntime: runtimeData.trainingRuntime,
      runtimeView: runtimeData.runtimeView,
      selectedMainIndicatorKey: runtimeData.selectedMainIndicatorKey,
      selectedIndicatorKey: runtimeData.selectedIndicatorKey,
      reviewFocus: null,
      reviewFocusErrorType: "",
      reviewFocusNextAction: "",
      activeTrainingMode: "special_training",
      samplingStatus: samplingUi.samplingStatus,
      samplingStatusText: samplingUi.samplingStatusText,
      samplingMessage: samplingUi.samplingMessage,
      samplingError: samplingUi.samplingError,
      zhixingReminderDisabled: options.disableReminders ? true : false,
      zhixingReminderShownCount: 0
    });
    wx.showToast({ title: "已进入专项训练", icon: "none" });
  },

  inputCustomSessionField(e) {
    const field = ((e.currentTarget || {}).dataset || {}).field;
    if (!field) return;
    this.setData({ [`customSessionForm.${field}`]: e.detail.value });
  },

  selectCustomPeriod(e) {
    const period = ((e.currentTarget || {}).dataset || {}).period || "1d";
    this.setData({ "customSessionForm.period": period });
  },

  normalizeCustomHistorySlice(slice = {}, meta = {}) {
    const candles = Array.isArray(slice.candles)
      ? slice.candles
      : Array.isArray(slice.bars)
        ? slice.bars
        : [];
    const trainingLength = Number(meta.trainingLength || meta.training_length || candles.length || 0);
    const slicedCandles = trainingLength > 0 ? candles.slice(0, trainingLength) : candles;
    const dataRange = slice.data_range || {};
    const instrument = slice.instrument || {};
    const startDate = dataRange.start || slice.startDate || slice.start_date || slice.start || meta.startDate || meta.start_date || "";
    const endDate = dataRange.end || slice.endDate || slice.end_date || slice.end || meta.endDate || meta.end_date || "";
    const symbol = instrument.symbol || slice.symbol || meta.symbol || "";
    return Object.assign({}, slice, {
      source: "custom_history_slice",
      symbol,
      period: meta.period || slice.period || "1d",
      start: startDate,
      startDate,
      start_date: startDate,
      end: endDate,
      endDate,
      end_date: endDate,
      data_range: Object.assign({}, slice.data_range || {}, {
        start: startDate,
        end: endDate
      }),
      candles: slicedCandles
    });
  },

  async startCustomBlindTraining() {
    const customForm = this.data.customSessionForm || {};
    const symbol = String(customForm.symbol || "").trim();
    if (!symbol) {
      wx.showToast({ title: "先填写标的代码", icon: "none" });
      return;
    }
    const trainingLength = Math.max(1, Math.min(300, Number(customForm.trainingLength || 60) || 60));
    const meta = buildCustomSessionMeta({
      symbol,
      period: customForm.period || "1d",
      startDate: customForm.startDate || "",
      endDate: customForm.endDate || "",
      trainingLength,
      hiddenSymbol: true,
      hiddenDateRange: true
    });
    const reminder = buildTrainingPreReminder(Object.assign({}, this.buildZhixingReminderContext(), meta, {
      sourceType: "custom_session",
      source_type: "custom_session",
      errorType: "自选盲练",
      error_type: "自选盲练",
      sceneTags: ["自选盲练"],
      scene_tags: ["自选盲练"],
      nextAction: "先看事实，再记录第一念",
      next_action: "先看事实，再记录第一念"
    }));
    if (reminder && !this.data.zhixingReminderDisabled) {
      this.presentZhixingReminder(reminder, {
        onContinue: () => this.enterCustomBlindTraining(meta),
        onHold: () => wx.showToast({ title: "已记录观望，本次先不训练", icon: "none" }),
        onLater: () => wx.showToast({ title: "已记录稍后再练", icon: "none" }),
        onMute: () => this.enterCustomBlindTraining(meta, { disableReminders: true })
      });
      return;
    }
    this.enterCustomBlindTraining(meta);
  },

  async enterCustomBlindTraining(meta = {}, options = {}) {
    this.setData({
      customSessionStatusText: "正在载入自选片段",
      customSessionMessage: "从历史 K 线服务读取，不在小程序复制行情数据。",
      customSessionError: ""
    });
    try {
      const result = await fetchKlineTrainingSlice({
        marketKey: (this.data.form || {}).marketKey || ((this.data.session || {}).market || {}).key || "cn_equity",
        timeframeKey: meta.period,
        symbol: meta.symbol,
        trainingLength: meta.trainingLength,
        startDate: meta.startDate,
        endDate: meta.endDate,
        mode: "blind_mirror",
        personalityType: (this.data.session || {}).personalityType || "",
        gateKey: ((this.data.session || {}).stageGate || {}).key || "shi_shang_mo",
        blind: false,
        seed: `custom-${meta.symbol}-${meta.period}-${meta.startDate}-${meta.endDate}-${meta.trainingLength}`
      });
      const rawSlice = result.slice || result.data || result;
      const candles = Array.isArray(rawSlice.candles)
        ? rawSlice.candles
        : Array.isArray(rawSlice.bars)
          ? rawSlice.bars
          : [];
      if (!candles.length) {
        this.setData({
          customSessionStatusText: "该时间段暂无可训练数据",
          customSessionMessage: "",
          customSessionError: "未生成训练 session"
        });
        wx.showToast({ title: "该时间段暂无可训练数据", icon: "none" });
        return;
      }
      const historySlice = this.normalizeCustomHistorySlice(rawSlice, meta);
      const resolvedMeta = buildCustomSessionMeta(Object.assign({}, meta, {
        symbol: historySlice.symbol || meta.symbol,
        startDate: historySlice.startDate || historySlice.start_date || meta.startDate,
        endDate: historySlice.endDate || historySlice.end_date || meta.endDate
      }));
      const form = Object.assign({}, stripTrainingContext(this.data.form || {}), resolvedMeta, {
        timeframeKey: resolvedMeta.period,
        selectedCandleKey: ""
      });
      const session = buildKlineMindSession({
        assessment: this.data.assessment,
        trainingDay: this.data.trainingDay,
        record: form,
        historyCache: getKlineHistoryCache(),
        customSession: Object.assign({}, resolvedMeta, {
          historySlice,
          customVisibleCount: 1,
          custom_visible_count: 1
        })
      });
      const nextForm = buildForm(form, session);
      const runtimeData = this.buildRuntimeData(session, nextForm);
      this.setData({
        form: nextForm,
        session,
        trainingRuntime: runtimeData.trainingRuntime,
        runtimeView: runtimeData.runtimeView,
        selectedMainIndicatorKey: runtimeData.selectedMainIndicatorKey,
        selectedIndicatorKey: runtimeData.selectedIndicatorKey,
        reviewFocus: null,
        reviewFocusErrorType: "",
        reviewFocusNextAction: "",
        activeTrainingMode: "custom_session",
        customSessionStatusText: "自选盲练片段已载入",
        customSessionMessage: "训练中默认隐藏真实标的和日期，结束后再揭示。",
        customSessionError: "",
        samplingStatus: "",
        samplingStatusText: "",
        samplingMessage: "",
        samplingError: "",
        zhixingReminderDisabled: options.disableReminders ? true : false,
        zhixingReminderShownCount: 0
      });
      wx.showToast({ title: "已进入自选盲练", icon: "none" });
    } catch (error) {
      this.setData({
        customSessionStatusText: "自选片段载入失败",
        customSessionMessage: "",
        customSessionError: "抽取失败，请稍后重试或调整时间段。"
      });
      wx.showToast({ title: "自选片段载入失败", icon: "none" });
    }
  },

  advanceCustomSession(e) {
    const session = this.data.session || {};
    const sourceType = session.sourceType || session.source_type || "";
    if (sourceType !== "custom_session") return;
    const action = ((e.currentTarget || {}).dataset || {}).action || "观望";
    const candles = session.candles || [];
    const total = Math.max(1, candles.length || session.customTotalCount || session.custom_total_count || 1);
    const nextCount = Math.min(total, Number(session.customVisibleCount || session.custom_visible_count || 1) + 1);
    const selectedCandle = candles[Math.max(0, nextCount - 1)] || candles[candles.length - 1] || {};
    const form = Object.assign({}, this.data.form || {}, {
      boundaryChoice: action,
      selectedCandleKey: selectedCandle.key || (this.data.form || {}).selectedCandleKey || session.selectedCandleKey || "",
      customVisibleCount: nextCount,
      custom_visible_count: nextCount
    });
    this.setData({
      form,
      session: Object.assign({}, session, {
        selectedCandleKey: form.selectedCandleKey,
        customVisibleCount: nextCount,
        custom_visible_count: nextCount,
        customProgressText: `当前第 ${nextCount} 根 / 共 ${total} 根`,
        custom_progress_text: `当前第 ${nextCount} 根 / 共 ${total} 根`
      })
    });
  },

  async fetchTrainingSample(context = {}) {
    const requestPayload = buildKlineSamplingRequest(context, {
      period: (this.data.form || {}).timeframeKey || (this.data.session || {}).timeframeKey || "1d"
    });
    this.setData(buildSamplingUi("loading", "正在抽取训练片段"));
    try {
      const result = await requestKlineTrainingSample(requestPayload);
      const samplingResult = normalizeKlineSamplingResult(result);
      if (!samplingResult || !Array.isArray(samplingResult.bars) || !samplingResult.bars.length) {
        throw new Error("empty_sampling_result");
      }
      return {
        samplingResult,
        failed: false,
        fallbackReason: samplingResult.fallbackReason || samplingResult.fallback_reason || ""
      };
    } catch (error) {
      const fallbackReason = error && error.message === "empty_sampling_result"
        ? "empty_sampling_result"
        : "sampling_api_failed";
      return {
        samplingResult: normalizeKlineSamplingResult(Object.assign({}, requestPayload, {
          fallbackUsed: true,
          fallback_used: true,
          fallbackReason,
          fallback_reason: fallbackReason,
          source: "base_blind_fallback"
        })),
        failed: true,
        fallbackReason
      };
    }
  },

  startBaseBlindTraining() {
    const form = stripTrainingContext(this.data.form || {});
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache()
    });
    const nextForm = buildForm(form, session);
    const runtimeData = this.buildRuntimeData(session, nextForm);
    this.setData({
      form: nextForm,
      session,
      trainingRuntime: runtimeData.trainingRuntime,
      runtimeView: runtimeData.runtimeView,
      selectedMainIndicatorKey: runtimeData.selectedMainIndicatorKey,
      selectedIndicatorKey: runtimeData.selectedIndicatorKey,
      reviewFocus: null,
      reviewFocusErrorType: "",
      reviewFocusNextAction: "",
      activeTrainingMode: "base_blind",
      samplingStatus: "",
      samplingStatusText: "",
      samplingMessage: "",
      samplingError: "",
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
      triggerType: "",
      trigger_type: "",
      sourceType: pickValue(
        form.sourceType,
        form.source_type,
        session.sourceType,
        session.source_type,
        this.data.activeTrainingMode
      ),
      source_type: pickValue(
        form.source_type,
        form.sourceType,
        session.source_type,
        session.sourceType,
        this.data.activeTrainingMode
      ),
      sessionId: pickValue(session.sessionId, session.session_id, form.sessionId, form.session_id, form.id, form.date),
      session_id: pickValue(session.session_id, session.sessionId, form.session_id, form.sessionId, form.id, form.date),
      planId: pickValue(
        form.planId,
        form.plan_id,
        form.executionPlanId,
        form.execution_plan_id,
        session.planId,
        session.plan_id,
        session.executionPlanId,
        session.execution_plan_id,
        reviewFocus.planId,
        reviewFocus.plan_id,
        reviewFocus.executionPlanId,
        reviewFocus.execution_plan_id
      ),
      plan_id: pickValue(
        form.plan_id,
        form.planId,
        form.execution_plan_id,
        form.executionPlanId,
        session.plan_id,
        session.planId,
        session.execution_plan_id,
        session.executionPlanId,
        reviewFocus.plan_id,
        reviewFocus.planId,
        reviewFocus.execution_plan_id,
        reviewFocus.executionPlanId
      ),
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
      firstThought: pickValue(form.firstReaction, form.firstThought, form.first_thought, session.firstThought, session.first_thought),
      first_thought: pickValue(form.first_thought, form.firstThought, form.firstReaction, session.first_thought, session.firstThought),
      triggerScene: pickValue(form.triggerScene, form.trigger_scene, session.triggerScene, session.trigger_scene, sceneTags[0]),
      trigger_scene: pickValue(form.trigger_scene, form.triggerScene, session.trigger_scene, session.triggerScene, sceneTags[0]),
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
      ),
      expectedAction: pickValue(form.expectedAction, form.expected_action, session.expectedAction, session.expected_action, reviewFocus.expectedAction, reviewFocus.expected_action),
      expected_action: pickValue(form.expected_action, form.expectedAction, session.expected_action, session.expectedAction, reviewFocus.expected_action, reviewFocus.expectedAction),
      userAction: pickValue(form.boundaryChoice, form.boundary_choice),
      user_action: pickValue(form.boundary_choice, form.boundaryChoice),
      executionResult: pickValue(form.executionResult, form.execution_result),
      execution_result: pickValue(form.execution_result, form.executionResult),
      samplingResult: pickValue(form.samplingResult, form.sampling_result, session.samplingResult, session.sampling_result),
      sampling_result: pickValue(form.sampling_result, form.samplingResult, session.sampling_result, session.samplingResult),
      fallbackUsed: pickValue(form.fallbackUsed, form.fallback_used, session.fallbackUsed, session.fallback_used, false),
      fallback_used: pickValue(form.fallback_used, form.fallbackUsed, session.fallback_used, session.fallbackUsed, false),
      fallbackReason: pickValue(form.fallbackReason, form.fallback_reason, session.fallbackReason, session.fallback_reason),
      fallback_reason: pickValue(form.fallback_reason, form.fallbackReason, session.fallback_reason, session.fallbackReason),
      executionPlanLibrary: getExecutionPlanLibrary(),
      interventionRules: this.data.interventionRules,
      interventionPlans: this.data.interventionPlans,
      dashboardSummary: this.data.dashboardSummary,
      weeklySummary: this.data.weeklySummary
    };
  },

  presentZhixingReminder(reminder, handlers = {}) {
    const decision = shouldShowIntervention(reminder, {
      shownCount: reminder.triggerType === "during_training" || reminder.trigger_type === "during_training"
        ? this.data.zhixingReminderShownCount
        : 0,
      maxPerSession: reminder.maxPerSession || reminder.max_per_session || 2,
      muted: this.data.zhixingReminderDisabled,
      lastShownAtByKey: this.data.zhixingReminderLastShownAtByKey,
      cooldownMs: Number(reminder.cooldownMinutes || reminder.cooldown_minutes || 1) * 60 * 1000
    });
    if (!decision.show) {
      if (handlers.onContinue) handlers.onContinue();
      return;
    }
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
    createRemoteInterventionEvent(event).catch(() => {});
    const key = `${event.triggerType || event.trigger_type || ""}:${event.errorType || event.error_type || ""}`;
    const lastShownAtByKey = Object.assign({}, this.data.zhixingReminderLastShownAtByKey || {});
    if (key !== ":") lastShownAtByKey[key] = Date.now();
    if ((reminder || {}).triggerType === "during_training") {
      this.setData({
        zhixingReminderLastShownAtByKey: lastShownAtByKey,
        zhixingReminderShownCount: Math.min(
          2,
          Number(this.data.zhixingReminderShownCount || 0) + 1
        )
      });
    } else {
      this.setData({ zhixingReminderLastShownAtByKey: lastShownAtByKey });
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
    const runtimePatch = this.data.trainingRuntime ? buildKlineTrainingRecordPatch(this.data.trainingRuntime) : {};
    const record = buildKlineMindRecord(Object.assign({}, runtimePatch, form, {
      selectedCandleKey: form.selectedCandleKey || runtimePatch.selectedCandleKey || "",
      firstReaction: form.firstReaction || runtimePatch.firstReaction || "",
      boundaryChoice: form.boundaryChoice || runtimePatch.boundaryChoice || ""
    }), this.data.session);
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

  async saveTrainingBookmark(e) {
    if (this.data.bookmarkSaving) return;
    const bookmarkType = (((e.currentTarget || {}).dataset || {}).bookmarkType) || "session";
    const savedRecord = this.data.savedRecord || {};
    if (!savedRecord.completed) {
      wx.showToast({ title: "先完成一局训练", icon: "none" });
      return;
    }
    const bookmark = buildTrainingBookmark({
      record: savedRecord,
      session: this.data.session || {},
      bookmarkType,
      title: bookmarkType === "mistake_card" ? "训练错题卡收藏" : "训练整局收藏",
      note: bookmarkType === "mistake_card" ? "回看本局最明显执行偏离。" : "留作训练回放。"
    });
    this.setData({
      bookmarkSaving: true,
      bookmarkMessage: "",
      bookmarkError: ""
    });
    try {
      const result = await createTrainingBookmark(bookmark);
      const remoteBookmark = result.trainingBookmark || result.training_bookmark || bookmark;
      this.setData({
        bookmarkSaving: false,
        bookmarkMessage: `${remoteBookmark.title || bookmark.title} 已收藏，可到我的页训练收藏查看。`,
        bookmarkError: ""
      });
      wx.showToast({ title: "已收藏", icon: "success" });
    } catch (error) {
      this.setData({
        bookmarkSaving: false,
        bookmarkMessage: "",
        bookmarkError: "收藏失败，请检查后端连接后重试。"
      });
      wx.showToast({ title: "收藏失败", icon: "none" });
    }
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
