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
  getTodayKlineMindRecord,
  saveTodayKlineMindRecord,
  saveTradeReviewRecord,
  saveInviteConversionEvent,
  getUserBinding,
  getMiniProgramBinding,
  todayKey
} = require("../../utils/store");
const {
  buildTradeReviewUrl,
  fetchKlineTrainingSlice,
  retryPendingKlineTrainingSync,
  syncKlineTrainingRecord,
  syncLocalState,
  syncTrainingProgress
} = require("../../utils/api");
const { buildTraining7View } = require("../../modules/training7/index");
const {
  buildKlineMindSession,
  buildKlineMindRecord,
  buildOneThoughtEvent,
  getNextKlineMindSliceSeed,
  startKlineTrainingRuntime,
  advanceKlineTrainingRuntime,
  recordKlineTrainingDecision,
  setKlineRuntimeIndicator,
  buildKlineTrainingRecordPatch
} = require("../../modules/kline-mind/index");
const {
  buildKlineTradeReviewRecord: buildKlineMirrorRecord
} = require("../../modules/kline-simulator/index");

const REACTION_DIRECTIONS = [
  { key: "act", label: "想立刻做", detail: "追、急、想证明" },
  { key: "avoid", label: "想躲开", detail: "怕错、怕亏、想退出" },
  { key: "observe", label: "先看清", detail: "停住、复核、守边界" }
];

const DECISION_ACTIONS = [
  { key: "BUY", label: "模拟买入", detail: "记录想进入的一念" },
  { key: "SELL", label: "模拟卖出", detail: "记录想退出的一念" },
  { key: "HOLD", label: "观望", detail: "先看事实不动作" }
];

function inferReactionDirection(firstReaction) {
  const value = String(firstReaction || "");
  if (/急躁|贪念|证明/.test(value)) return "act";
  if (/恐惧|抗拒|逃避/.test(value)) return "avoid";
  return "";
}

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
  const savedSceneId = String(record.klineSceneId || record.sliceSeed || record.scenarioId || "");
  return {
    marketKey: record.marketKey || ((session.market || {}).key) || "cn_equity",
    timeframeKey: record.timeframeKey || session.timeframeKey || "1d",
    scenarioId: savedSceneId.indexOf("scene-") === 0 ? savedSceneId : "scene-fast-001",
    chartZoomKey: record.chartZoomKey || session.chartZoomKey || "wide",
    historySlice: record.historySlice || null,
    selectedCandleKey: record.selectedCandleKey || session.selectedCandleKey || "",
    reactionDirection: record.reactionDirection || inferReactionDirection(record.firstReaction),
    firstReaction: record.firstReaction || "",
    bodySignal: record.bodySignal || "",
    boundaryChoice: record.boundaryChoice || "",
    insightLine: record.insightLine || ""
  };
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
      decisionPrompt: "先进入逐根盲练",
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
    label: item.key === activeKey ? "当" : item.label
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
    nextButtonText: runtime.mustDecide ? "先做模拟决策" : (isComplete ? "本段已完成" : "下一根"),
    decisionPrompt: runtime.mustDecide ? "这一根必须先做一次模拟决策。" : "只看当下这一根，不猜后面。",
    latestCoach: (latestCoach || {}).text || "",
    latestRisk: (latestRisk || {}).text || "只做模拟训练，不作当下判断。",
    latestEmotion: (latestEmotion || {}).label || "",
    decisionCount: (runtime.decisionTimeline || []).length,
    positionText: metrics.positionSize ? "模拟持仓" : "空仓",
    pnlText: `${Number(metrics.totalPnl || 0).toFixed(2)}%`,
    drawdownText: `${Number(metrics.maxDrawdown || 0).toFixed(2)}%`,
    chartBoardStyle: runtime.chartBoardStyle || "",
    indicatorPanel: runtime.indicatorPanel || { type: "vol", label: "VOL", visible: true, items: [], lines: {} },
    indicatorOverlay: runtime.indicatorOverlay || {
      ma5: [],
      ma10: [],
      bollUpper: [],
      bollLower: []
    },
    mustDecide: !!runtime.mustDecide,
    isComplete
  };
}

function getInitialVisibleCount(session = {}) {
  const candles = Array.isArray(session.candles) ? session.candles : [];
  if (!candles.length) return 0;
  const windowSize = Number(session.chartWindowSize || 150);
  const safeWindowSize = Number.isFinite(windowSize) ? windowSize : 150;
  const target = Math.max(24, Math.min(48, Math.floor(safeWindowSize / 3)));
  return Math.min(candles.length, target);
}

function buildUnavailableHistorySlice(result = {}) {
  return {
    source: "server_unavailable",
    sliceSource: "server_unavailable",
    klineSource: "server_unavailable",
    symbol: "",
    start: "",
    end: "",
    serverSliceStatus: (result || {}).reason || "server_unavailable",
    serverSliceError: (result || {}).errorMessage || "真实历史数据未载入",
    candles: []
  };
}

function resolveTradeReviewUrl(record = {}) {
  const userId = (getUserBinding() || {}).userId || "";
  const eventId = ((record.oneThoughtEvent || {}).eventId) || record.linkedOneThoughtEventId || "";
  return buildTradeReviewUrl({ userId, eventId });
}

function buildMindHistorySlice(result) {
  if (!result || !result.ok) return buildUnavailableHistorySlice(result);
  return Object.assign({}, result.slice || {}, {
    source: result.source || ((result.slice || {}).source) || "server_cache",
    sliceSource: result.source || ((result.slice || {}).source) || "server_cache",
    klineSource: result.source || ((result.slice || {}).source) || "server_cache",
    serverSliceStatus: result.manifestStatus || ((result.slice || {}).manifestStatus) || "ready",
    serverSliceError: "",
    symbol: result.symbol || ((result.slice || {}).symbol) || "",
    timeframe: result.timeframe || ((result.slice || {}).timeframe) || "",
    candles: result.candles || []
  });
}

Page({
  data: {
    assessment: null,
    training7View: buildTraining7View({}, {}),
    trainingDay: null,
    reactionDirections: REACTION_DIRECTIONS,
    decisionActions: DECISION_ACTIONS,
    session: buildKlineMindSession({}),
    trainingRuntime: null,
    runtimeView: buildRuntimeView(),
    form: buildForm(),
    savedRecord: null,
    saving: false,
    historyLoading: false,
    historyError: "",
    showSelectors: false,
    showGuide: false,
    showBodySignal: false,
    showIndicatorPicker: false,
    selectedIndicatorKey: "vol",
    tradeReviewUrl: ""
  },

  onShow() {
    retryPendingKlineTrainingSync().catch(() => {});
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
    const session = buildKlineMindSession({
      assessment,
      trainingDay,
      record: klineMindRecord
    });
    const form = buildForm(klineMindRecord, session);
    const tradeReviewUrl = resolveTradeReviewUrl(klineMindRecord);

    this.setData({
      assessment,
      training7View,
      trainingDay,
      session,
      trainingRuntime: null,
      runtimeView: buildRuntimeView(),
      form,
      savedRecord: klineMindRecord && klineMindRecord.updatedAt ? klineMindRecord : null,
      historyLoading: true,
      historyError: "",
      showBodySignal: !!form.bodySignal,
      tradeReviewUrl
    });
    this.loadServerHistorySlice(form);
  },

  buildSession(record) {
    return buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record
    });
  },

  buildTrainingRuntime(session, record = {}) {
    if (!session || !session.hasHistoricalData) return null;
    return startKlineTrainingRuntime(session, {
      trainingSessionId: `kline-session-${todayKey()}-${Date.now()}`,
      decisionInterval: 5,
      initialVisibleCount: getInitialVisibleCount(session),
      initialIndicatorKey: this.data.selectedIndicatorKey || session.defaultIndicatorKey || "vol",
      sliceSeed: record.scenarioId || ((session.historySlice || {}).sliceSeed) || ((session.historySlice || {}).seed) || ""
    });
  },

  loadServerHistorySlice(record = {}) {
    const requestKey = `slice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.latestHistoryRequestKey = requestKey;
    const baseRecord = Object.assign({}, record || {}, { historySlice: null });
    this.setData({
      historyLoading: true,
      historyError: "",
      trainingRuntime: null,
      runtimeView: buildRuntimeView(),
      session: Object.assign({}, this.buildSession(baseRecord), {
        dataStatusText: "正在读取历史练习数据"
      })
    });
    fetchKlineTrainingSlice({
      marketKey: baseRecord.marketKey || "cn_equity",
      timeframeKey: baseRecord.timeframeKey || "1d",
      symbol: baseRecord.symbol || "",
      windowSize: 150,
      mode: "step_replay",
      gateKey: "shi_shang_mo",
      blind: true,
      seed: baseRecord.scenarioId || ""
    }).then((result) => {
      if (this.latestHistoryRequestKey !== requestKey) return;
      const historySlice = buildMindHistorySlice(result);
      const recordWithSlice = Object.assign({}, baseRecord, { historySlice });
      const session = this.buildSession(recordWithSlice);
      const trainingRuntime = this.buildTrainingRuntime(session, recordWithSlice);
      this.setData({
        session,
        trainingRuntime,
        runtimeView: buildRuntimeView(trainingRuntime),
        form: Object.assign({}, this.data.form, recordWithSlice, { selectedCandleKey: session.selectedCandleKey }),
        historyLoading: false,
        historyError: session.hasHistoricalData ? "" : (historySlice.serverSliceError || "真实历史数据未载入")
      });
    });
  },

  selectCandle(e) {
    const selectedCandleKey = e.currentTarget.dataset.key;
    const form = Object.assign({}, this.data.form, { selectedCandleKey });
    const session = this.buildSession(form);
    this.setData({ form, session });
  },

  selectMarket(e) {
    const marketKey = e.currentTarget.dataset.market;
    const form = Object.assign({}, this.data.form, {
      marketKey,
      selectedCandleKey: ""
    });
    const session = this.buildSession(form);
    this.setData({
      form: Object.assign({}, form, { selectedCandleKey: session.selectedCandleKey }),
      session
    });
    this.loadServerHistorySlice(form);
  },

  selectTimeframe(e) {
    const timeframeKey = e.currentTarget.dataset.timeframe;
    const form = Object.assign({}, this.data.form, {
      timeframeKey,
      selectedCandleKey: ""
    });
    const session = this.buildSession(form);
    this.setData({
      form: Object.assign({}, form, { selectedCandleKey: session.selectedCandleKey }),
      session
    });
    this.loadServerHistorySlice(form);
  },

  selectChartZoom(e) {
    const chartZoomKey = e.currentTarget.dataset.zoom;
    if (!chartZoomKey) return;
    const form = Object.assign({}, this.data.form, { chartZoomKey });
    const session = this.buildSession(form);
    const trainingRuntime = this.buildTrainingRuntime(session, form);
    this.setData({
      form: Object.assign({}, form, { selectedCandleKey: session.selectedCandleKey }),
      session,
      trainingRuntime,
      runtimeView: buildRuntimeView(trainingRuntime)
    });
  },

  toggleIndicatorPicker() {
    this.setData({ showIndicatorPicker: !this.data.showIndicatorPicker });
  },

  selectIndicator(e) {
    const indicatorKey = e.currentTarget.dataset.indicator || "vol";
    const runtime = this.data.trainingRuntime
      ? setKlineRuntimeIndicator(this.data.trainingRuntime, indicatorKey)
      : null;
    this.setData({
      selectedIndicatorKey: indicatorKey,
      showIndicatorPicker: false,
      trainingRuntime: runtime,
      runtimeView: buildRuntimeView(runtime)
    });
  },

  selectOption(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.currentTarget.dataset.value;
    if (!field) return;
    if (field === "reactionDirection") {
      const currentForm = this.data.form || {};
      const directionChanged = currentForm.reactionDirection !== value;
      this.setData({
        form: Object.assign({}, currentForm, {
          reactionDirection: value,
          firstReaction: directionChanged ? "" : currentForm.firstReaction,
          bodySignal: directionChanged ? "" : currentForm.bodySignal,
          boundaryChoice: directionChanged ? "" : currentForm.boundaryChoice,
          insightLine: directionChanged ? "" : currentForm.insightLine
        }),
        showBodySignal: directionChanged ? false : this.data.showBodySignal
      });
      return;
    }
    this.setData({ [`form.${field}`]: value });
  },

  inputInsight(e) {
    this.setData({ "form.insightLine": e.detail.value });
  },

  toggleSelectors() {
    this.setData({ showSelectors: !this.data.showSelectors });
  },

  switchSlice() {
    const currentForm = this.data.form || {};
    const scenarioId = getNextKlineMindSliceSeed(currentForm.scenarioId || "scene-fast-001");
    const form = Object.assign({}, currentForm, {
      scenarioId,
      chartZoomKey: currentForm.chartZoomKey || "wide",
      historySlice: null,
      selectedCandleKey: "",
      reactionDirection: "",
      firstReaction: "",
      bodySignal: "",
      boundaryChoice: "",
      insightLine: ""
    });
    const session = this.buildSession(form);
    this.setData({
      form: Object.assign({}, form, { selectedCandleKey: session.selectedCandleKey }),
      session,
      trainingRuntime: null,
      runtimeView: buildRuntimeView(),
      showBodySignal: false
    });
    this.loadServerHistorySlice(form);
  },

  advanceRuntimeCandle() {
    const runtime = this.data.trainingRuntime;
    if (!runtime) {
      wx.showToast({ title: "历史片段载入后再开始", icon: "none" });
      return;
    }
    if (this.data.runtimeView && this.data.runtimeView.isComplete) {
      wx.showToast({ title: "本段已完成，可写入复盘", icon: "none" });
      return;
    }
    const nextRuntime = advanceKlineTrainingRuntime(runtime);
    if (nextRuntime.blockedReason === "decision_required") {
      this.setData({
        trainingRuntime: nextRuntime,
        runtimeView: buildRuntimeView(nextRuntime)
      });
      wx.showToast({ title: "先做一次模拟决策", icon: "none" });
      return;
    }
    this.setData({
      trainingRuntime: nextRuntime,
      runtimeView: buildRuntimeView(nextRuntime),
      form: Object.assign({}, this.data.form, {
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
      reactionDirection: form.reactionDirection || "",
      firstReaction: form.firstReaction || "",
      boundaryChoice: form.boundaryChoice || ""
    });
    const runtimePatch = buildKlineTrainingRecordPatch(nextRuntime);
    this.setData({
      trainingRuntime: nextRuntime,
      runtimeView: buildRuntimeView(nextRuntime),
      form: Object.assign({}, form, {
        selectedCandleKey: runtimePatch.selectedCandleKey || form.selectedCandleKey || ""
      })
    });
    wx.showToast({
      title: action === "HOLD" ? "已记录观望" : "已记录模拟动作",
      icon: "none"
    });
  },

  toggleGuide() {
    this.setData({ showGuide: !this.data.showGuide });
  },

  toggleBodySignal() {
    this.setData({ showBodySignal: !this.data.showBodySignal });
  },

  saveRecord() {
    if (this.data.saving) return;
    if (!(this.data.session || {}).hasHistoricalData) {
      wx.showToast({ title: "请先同步历史数据", icon: "none" });
      return;
    }
    const rawForm = this.data.form || {};
    const runtimePatch = this.data.trainingRuntime ? buildKlineTrainingRecordPatch(this.data.trainingRuntime) : {};
    const form = Object.assign({}, runtimePatch, rawForm, {
      selectedCandleKey: rawForm.selectedCandleKey || runtimePatch.selectedCandleKey || "",
      reactionDirection: rawForm.reactionDirection || runtimePatch.reactionDirection || "",
      firstReaction: rawForm.firstReaction || runtimePatch.firstReaction || "",
      boundaryChoice: rawForm.boundaryChoice || runtimePatch.boundaryChoice || ""
    });
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

    this.setData({ saving: true });
    const now = Date.now();
    const existingRecord = getTodayKlineMindRecord();
    const existingEvent = existingRecord.oneThoughtEvent || {};
    const localRecordId = existingRecord.localRecordId || `kline-mind-${todayKey()}`;
    const baseRecord = Object.assign({}, buildKlineMindRecord(form, this.data.session), {
      localRecordId,
      relatedMirror: ((this.data.assessment || {}).primaryMirror) || ((this.data.assessment || {}).primary) || ""
    });
    const oneThoughtEvent = buildOneThoughtEvent(baseRecord, {
      identity: getMiniProgramBinding(),
      existingEvent,
      createdAt: existingEvent.createdAt || now,
      completedAt: now,
      updatedAt: now
    });
    const record = Object.assign({}, baseRecord, {
      linkedOneThoughtEventId: oneThoughtEvent.eventId,
      oneThoughtEvent
    });
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
    syncKlineTrainingRecord(saved, { force: true }).catch(() => {
      wx.showToast({ title: "已本地保存，网络恢复后自动归档", icon: "none" });
    });
    syncLocalState({ silent: true }).catch(() => {});
    syncTrainingProgress().catch(() => {});
    wx.showToast({ title: "已写入活镜", icon: "success" });
    this.setData({ savedRecord: saved, saving: false, tradeReviewUrl: resolveTradeReviewUrl(saved) });
    this.load();
  },

  goTradeReviewH5() {
    const tradeReviewUrl = this.data.tradeReviewUrl || "";
    if (!tradeReviewUrl) {
      wx.showToast({ title: "复盘入口待生成", icon: "none" });
      return;
    }
    wx.navigateTo({ url: `/pages/h5-bridge/index?url=${encodeURIComponent(tradeReviewUrl)}` });
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
