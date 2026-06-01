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
  saveTodayKlineMindRecord
} = require("../../utils/store");
const { syncLocalState, syncTrainingProgress } = require("../../utils/api");
const { buildTraining7View } = require("../../modules/training7/index");
const {
  buildKlineMindSession,
  buildKlineMindRecord
} = require("../../modules/kline-mind/index");

function buildForm(record = {}, session = {}) {
  return {
    marketKey: record.marketKey || ((session.market || {}).key) || "cn_equity",
    timeframeKey: record.timeframeKey || session.timeframeKey || "1d",
    selectedCandleKey: record.selectedCandleKey || session.selectedCandleKey || "",
    firstReaction: record.firstReaction || "",
    bodySignal: record.bodySignal || "",
    boundaryChoice: record.boundaryChoice || "",
    insightLine: record.insightLine || ""
  };
}

Page({
  data: {
    assessment: null,
    training7View: buildTraining7View({}, {}),
    trainingDay: null,
    session: buildKlineMindSession({}),
    form: buildForm(),
    savedRecord: null,
    saving: false
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
    const session = buildKlineMindSession({
      assessment,
      trainingDay,
      record: klineMindRecord,
      historyCache: getKlineHistoryCache()
    });
    const form = buildForm(klineMindRecord, session);

    this.setData({
      assessment,
      training7View,
      trainingDay,
      session,
      form,
      savedRecord: klineMindRecord && klineMindRecord.updatedAt ? klineMindRecord : null
    });
  },

  selectCandle(e) {
    const selectedCandleKey = e.currentTarget.dataset.key;
    const form = Object.assign({}, this.data.form, { selectedCandleKey });
    const session = buildKlineMindSession({
      assessment: this.data.assessment,
      trainingDay: this.data.trainingDay,
      record: form,
      historyCache: getKlineHistoryCache()
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
      historyCache: getKlineHistoryCache()
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
      historyCache: getKlineHistoryCache()
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
    syncLocalState({ silent: true }).catch(() => {});
    syncTrainingProgress().catch(() => {});
    wx.showToast({ title: "观心已记录", icon: "success" });
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
  }
});
