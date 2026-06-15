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
  saveInviteConversionEvent
} = require("../../utils/store");
const { fetchKlineTrainingSlice, retryPendingKlineTrainingSync, syncLocalState, syncTrainingProgress } = require("../../utils/api");
const { buildTraining7View } = require("../../modules/training7/index");
const {
  buildKlineMindSession,
  buildKlineMindRecord
} = require("../../modules/kline-mind/index");
const {
  buildKlineTradeReviewRecord: buildKlineMirrorRecord,
  getKlineScenario
} = require("../../modules/kline-simulator/index");

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
    historySlice: record.historySlice || null,
    selectedCandleKey: record.selectedCandleKey || session.selectedCandleKey || "",
    firstReaction: record.firstReaction || "",
    bodySignal: record.bodySignal || "",
    boundaryChoice: record.boundaryChoice || "",
    insightLine: record.insightLine || ""
  };
}

function buildLocalDemoHistorySlice(record = {}, result = {}) {
  const scene = getKlineScenario(record.scenarioId || "scene-fast-001", {
    marketKey: "cn",
    timeframeKey: record.timeframeKey || "1d"
  });
  return {
    source: "local_demo",
    sliceSource: "local_demo",
    klineSource: "local_demo",
    symbol: record.symbol || "local-demo",
    start: "",
    end: "",
    serverSliceStatus: (result || {}).reason || "server_unavailable",
    serverSliceError: (result || {}).errorMessage || "K线服务暂不可用",
    candles: (scene.candles || []).map((item, index) => Object.assign({}, item, {
      date: item.date || item.time || `demo-${index + 1}`
    }))
  };
}

function buildMindHistorySlice(result, record = {}) {
  if (!result || !result.ok) return buildLocalDemoHistorySlice(record, result);
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
    session: buildKlineMindSession({}),
    form: buildForm(),
    savedRecord: null,
    saving: false,
    historyLoading: false,
    historyError: "",
    showSelectors: false,
    showGuide: false,
    showBodySignal: false
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

    this.setData({
      assessment,
      training7View,
      trainingDay,
      session,
      form,
      savedRecord: klineMindRecord && klineMindRecord.updatedAt ? klineMindRecord : null,
      historyLoading: true,
      historyError: "",
      showBodySignal: !!form.bodySignal
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

  loadServerHistorySlice(record = {}) {
    const requestKey = `slice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.latestHistoryRequestKey = requestKey;
    const baseRecord = Object.assign({}, record || {}, { historySlice: null });
    this.setData({
      historyLoading: true,
      historyError: "",
      session: Object.assign({}, this.buildSession(baseRecord), {
        dataStatusText: "正在读取 server 历史切片"
      })
    });
    fetchKlineTrainingSlice({
      marketKey: baseRecord.marketKey || "cn_equity",
      timeframeKey: baseRecord.timeframeKey || "1d",
      symbol: baseRecord.symbol || "",
      windowSize: 60,
      mode: "mind",
      gateKey: "shi_shang_mo",
      blind: true,
      seed: baseRecord.scenarioId || ""
    }).then((result) => {
      if (this.latestHistoryRequestKey !== requestKey) return;
      const historySlice = buildMindHistorySlice(result, baseRecord);
      const recordWithSlice = Object.assign({}, baseRecord, { historySlice });
      const session = this.buildSession(recordWithSlice);
      this.setData({
        session,
        form: Object.assign({}, this.data.form, recordWithSlice, { selectedCandleKey: session.selectedCandleKey }),
        historyLoading: false,
        historyError: historySlice.source === "local_demo" ? "当前为本地练习样本" : ""
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
