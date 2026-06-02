const {
  saveKlineSessionRecord,
  saveKlineReviewReport,
  saveTodayKlineMindRecord,
  saveTradeReviewRecord,
  saveTraining7Task,
  getTraining7State,
  saveInviteConversionEvent
} = require("../../utils/store");
const {
  buildKlineTradeReviewRecord,
  buildKlineReview,
  createKlineSession,
  getKlineScenario,
  recordKlineReaction
} = require("../../modules/kline-simulator/index");
const { fetchKlineTrainingSlice } = require("../../utils/api");

const CHART_PRICE_HEIGHT = 190;
const VOLUME_MAX_HEIGHT = 56;

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getRawCandles(scene, stepIndex) {
  const allCandles = (scene || {}).candles || [];
  const count = Math.min(allCandles.length, 4 + Number(stepIndex || 0) * 2);
  return allCandles.slice(0, count);
}

function buildChartScale(candles) {
  const prices = (candles || []).reduce((list, item) => {
    return list.concat([
      normalizeNumber(item.open),
      normalizeNumber(item.high),
      normalizeNumber(item.low),
      normalizeNumber(item.close)
    ]);
  }, []);
  const high = Math.max.apply(null, prices.length ? prices : [1]);
  const low = Math.min.apply(null, prices.length ? prices : [0]);
  const mid = (high + low) / 2;
  return {
    high: formatPrice(high),
    mid: formatPrice(mid),
    low: formatPrice(low),
    rangeText: `${formatPrice(low)} - ${formatPrice(high)}`
  };
}

function formatPrice(value) {
  const number = normalizeNumber(value);
  if (number >= 1000) return number.toFixed(0);
  if (number >= 100) return number.toFixed(1);
  return number.toFixed(2);
}

function buildFutureBars(count) {
  return Array.from({ length: Math.min(5, Math.max(0, Number(count || 0))) }).map((_, index) => ({ key: `future-${index}` }));
}

function decorateCandles(candles) {
  const visible = candles || [];
  const highs = visible.map((item) => normalizeNumber(item.high));
  const lows = visible.map((item) => normalizeNumber(item.low));
  const high = Math.max.apply(null, highs.length ? highs : [1]);
  const low = Math.min.apply(null, lows.length ? lows : [0]);
  const priceRange = Math.max(high - low, 0.01);
  const maxVolume = Math.max.apply(null, visible.map((item) => normalizeNumber(item.volume, Math.abs(normalizeNumber(item.close) - normalizeNumber(item.open)) + 1)).concat([1]));

  return (candles || []).map((item, index) => {
    const open = normalizeNumber(item.open);
    const close = normalizeNumber(item.close);
    const candleHigh = normalizeNumber(item.high);
    const candleLow = normalizeNumber(item.low);
    const volume = normalizeNumber(item.volume, Math.abs(close - open) + 1);
    const y = (price) => Math.round(((high - price) / priceRange) * CHART_PRICE_HEIGHT);
    const openY = y(open);
    const closeY = y(close);
    const highY = y(candleHigh);
    const lowY = y(candleLow);
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(6, Math.abs(openY - closeY));
    return Object.assign({}, item, {
      key: `${index}`,
      bodyHeight,
      bodyTop,
      wickTop: highY,
      wickHeight: Math.max(8, lowY - highY),
      volumeHeight: Math.max(8, Math.round((volume / maxVolume) * VOLUME_MAX_HEIGHT)),
      priceText: `${formatPrice(open)} / ${formatPrice(close)}`,
      dateText: item.date || item.time || "",
      up: close >= open
    });
  });
}

function buildChartView(scene, stepIndex) {
  const allCandles = (scene || {}).candles || [];
  const rawCandles = getRawCandles(scene, stepIndex);
  const first = rawCandles[0] || {};
  const last = rawCandles[rawCandles.length - 1] || {};
  return {
    candles: decorateCandles(rawCandles),
    chartScale: buildChartScale(rawCandles),
    futureBars: buildFutureBars(allCandles.length - rawCandles.length),
    firstCandleText: first.date || first.time || "起点隐藏",
    lastCandleText: last.date || last.time || "当前"
  };
}

function buildEmptyChartView() {
  return {
    candles: [],
    chartScale: { high: "-", mid: "-", low: "-", rangeText: "等待历史数据" },
    futureBars: [],
    firstCandleText: "待载入",
    lastCandleText: "待载入"
  };
}

function buildChartRevealText(scene, candles, ready) {
  if (!ready) return "等待历史数据";
  return `已显露 ${(candles || []).length} / ${((scene || {}).candles || []).length}`;
}

function mergeServerSlice(scene, slice) {
  if (!slice || !Array.isArray(slice.candles) || !slice.candles.length) return scene;
  const market = slice.market || {};
  const timeframe = slice.timeframe || {};
  const instrument = slice.instrument || {};
  const rules = slice.rules || {};
  return Object.assign({}, scene, {
    title: `${scene.title}`,
    subtitle: `${scene.subtitle} · 已接入后端历史切片`,
    segmentLabel: `${market.label || scene.marketLabel || "市场"} · ${timeframe.label || scene.timeframeLabel || "周期"} · ${instrument.masked ? "盲练片段" : (instrument.label || "历史切片")}`,
    ruleTag: rules.settlement || scene.ruleTag,
    marketSession: rules.session || scene.marketSession,
    marketLabel: market.label || scene.marketLabel,
    timeframeLabel: timeframe.label || scene.timeframeLabel,
    dataSourceLabel: "真实历史数据切片",
    isRealHistorical: true,
    serverSliceId: slice.id,
    serverRevealToken: slice.reveal_token,
    candles: slice.candles.map((item) => ({
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      date: item.label || item.time
    }))
  });
}

function formatElapsed(ms) {
  return `${(Math.max(0, Number(ms || 0)) / 1000).toFixed(1)} 秒`;
}

Page({
  data: {
    scene: { candles: [], checkpoints: [] },
    candles: [],
    session: null,
    checkpoint: { step: 1, options: [] },
    selectedOption: "",
    selectedAt: 0,
    elapsedText: "等待历史数据",
    reactionHint: "历史切片显露后，再开始记录第一反应。",
    emotionOptions: ["平静", "急躁", "兴奋", "恐惧", "不甘", "想证明", "逃避"],
    selectedEmotion: "",
    firstThought: "",
    boundaryStates: [
      { key: "kept", label: "已守住", note: "回到原先写下的一界" },
      { key: "near", label: "差点失守", note: "念头很强，但仍可记录" },
      { key: "lost", label: "已经失守", note: "如实记录，不做自责" }
    ],
    boundaryState: "kept",
    boundary: "计划边界",
    changedPlan: false,
    chartScale: { high: "-", mid: "-", low: "-", rangeText: "-" },
    futureBars: [],
    firstCandleText: "起点隐藏",
    lastCandleText: "当前",
    dataStatus: "正在读取后端历史数据切片",
    chartRevealText: "等待历史数据",
    mainActionText: "等待历史数据",
    historicalReady: false,
    historicalError: "",
    historicalEmptyText: "正在读取后端历史数据切片。未载入前不展示占位 K线。"
  },

  onLoad(options = {}) {
    const scenarioOptions = {
      marketKey: options.market || "cn",
      timeframeKey: options.timeframe || "1d"
    };
    const scene = getKlineScenario(options.sceneId || "", scenarioOptions);
    const session = createKlineSession(scene.id, scenarioOptions);
    const chartView = buildEmptyChartView();
    saveKlineSessionRecord(session);
    this.setData({
      scene,
      candles: chartView.candles,
      chartScale: chartView.chartScale,
      futureBars: chartView.futureBars,
      firstCandleText: chartView.firstCandleText,
      lastCandleText: chartView.lastCandleText,
      session,
      checkpoint: scene.checkpoints[0],
      dataStatus: "正在读取后端历史数据切片",
      chartRevealText: "等待历史数据",
      mainActionText: "等待历史数据",
      historicalReady: false,
      historicalError: "",
      historicalEmptyText: "正在读取后端历史数据切片。未载入前不展示占位 K线。",
      elapsedText: "等待历史数据",
      reactionHint: "历史切片显露后，再开始记录第一反应。"
    });
    this.loadServerSlice(options, scene);
  },

  loadServerSlice(options, fallbackScene) {
    fetchKlineTrainingSlice({
      marketKey: options.market || "cn",
      timeframeKey: options.timeframe || "1d",
      symbol: options.symbol || "",
      windowSize: 60,
      mode: "firecracker",
      gateKey: "shi_shang_mo",
      blind: true,
      seed: options.sceneId || fallbackScene.id
    }).then((result) => {
      if (!result || !result.slice || !Array.isArray(result.slice.candles) || !result.slice.candles.length) {
        throw new Error("后端未返回可用历史数据切片");
      }
      const scene = mergeServerSlice(fallbackScene, result.slice);
      const chartView = buildChartView(scene, this.data.session.stepIndex || 0);
      const visibleAt = Date.now();
      const session = Object.assign({}, this.data.session, {
        startedAt: visibleAt,
        lastStepAt: visibleAt
      });
      saveKlineSessionRecord(session);
      this.setData({
        scene,
        session,
        candles: chartView.candles,
        chartScale: chartView.chartScale,
        futureBars: chartView.futureBars,
        firstCandleText: chartView.firstCandleText,
        lastCandleText: chartView.lastCandleText,
        dataStatus: "已载入历史数据切片（非实时）",
        chartRevealText: buildChartRevealText(scene, chartView.candles, true),
        mainActionText: "记录并继续",
        historicalReady: true,
        historicalError: "",
        historicalEmptyText: "",
        elapsedText: "0.0 秒",
        reactionHint: "先停一息，再照见第一反应。"
      }, this.startStepTimer);
    }).catch(() => {
      if (this.stepTimer) clearInterval(this.stepTimer);
      const chartView = buildEmptyChartView();
      this.setData({
        candles: chartView.candles,
        chartScale: chartView.chartScale,
        futureBars: chartView.futureBars,
        firstCandleText: chartView.firstCandleText,
        lastCandleText: chartView.lastCandleText,
        dataStatus: "历史数据未载入",
        chartRevealText: "等待历史数据",
        mainActionText: "等待历史数据",
        historicalReady: false,
        historicalError: "请先在后端下载并缓存对应市场、标的与周期的历史K线。",
        historicalEmptyText: "请先在后端下载并缓存对应市场、标的与周期的历史K线。",
        elapsedText: "等待历史数据",
        reactionHint: "历史切片显露后，再开始记录第一反应。"
      });
    });
  },

  selectOption(e) {
    if (!this.data.historicalReady) {
      wx.showToast({ title: "请先载入历史数据", icon: "none" });
      return;
    }
    const optionId = e.currentTarget.dataset.id;
    const selectedAt = Date.now();
    const elapsedMs = selectedAt - Number((this.data.session || {}).lastStepAt || selectedAt);
    const switched = this.data.selectedOption && this.data.selectedOption !== optionId;
    const session = Object.assign({}, this.data.session, {
      optionSwitchCount: Number((this.data.session || {}).optionSwitchCount || 0) + (switched ? 1 : 0)
    });
    this.setData({
      session,
      selectedOption: optionId,
      selectedAt,
      elapsedText: formatElapsed(elapsedMs),
      reactionHint: elapsedMs <= 3000 ? "三秒内做出选择，先记下这股冲动。" : "你已经留出停顿，继续看边界是否清楚。"
    });
  },

  inputBoundary(e) {
    this.setData({ boundary: e.detail.value });
  },

  selectBoundaryState(e) {
    this.setData({ boundaryState: e.currentTarget.dataset.key || "kept" });
  },

  selectEmotion(e) {
    this.setData({ selectedEmotion: e.currentTarget.dataset.emotion || "" });
  },

  inputFirstThought(e) {
    this.setData({ firstThought: e.detail.value });
  },

  toggleChangedPlan() {
    this.setData({ changedPlan: !this.data.changedPlan });
  },

  nextStep() {
    if (!this.data.historicalReady) {
      wx.showToast({ title: "请先载入历史数据", icon: "none" });
      return;
    }
    if (!this.data.selectedOption) {
      wx.showToast({ title: "先选择第一反应", icon: "none" });
      return;
    }
    const sessionForReaction = Object.assign({}, this.data.session, {
      currentEmotion: this.data.selectedEmotion,
      currentFirstThought: this.data.firstThought,
      currentBoundaryState: this.data.boundaryState
    });
    const session = recordKlineReaction(sessionForReaction, this.data.selectedOption, this.data.scene, this.data.selectedAt);
    const nextSession = Object.assign({}, session, {
      boundary: this.data.boundary,
      boundaryState: this.data.boundaryState,
      changedPlan: this.data.changedPlan,
      emotion: this.data.selectedEmotion,
      firstThought: this.data.firstThought
    });
    saveKlineSessionRecord(nextSession);

    if (nextSession.completed) {
      if (this.stepTimer) clearInterval(this.stepTimer);
      const review = buildKlineReview(nextSession, this.data.scene, {
        boundary: this.data.boundary,
        boundaryState: this.data.boundaryState,
        changedPlan: this.data.changedPlan,
        optionSwitchCount: nextSession.optionSwitchCount,
        emotion: this.data.selectedEmotion,
        firstThought: this.data.firstThought
      });
      saveKlineReviewReport(review);
      saveTradeReviewRecord(buildKlineTradeReviewRecord(review));
      saveTodayKlineMindRecord({
        marketKey: review.marketKey,
        timeframeKey: review.timeframeKey,
        dataSource: "历史数据切片",
        symbol: review.sceneTitle,
        personalityType: review.relatedPersonality,
        stageName: `Day ${review.trainingDay || 1} · ${review.trainingFocus || "K线事上练"}`,
        firstReaction: review.primaryReaction,
        bodySignal: review.emotion,
        boundaryChoice: review.boundaryStateLabel,
        insightLine: review.insight,
        score: (review.scores || {}).boundaryKeeping || 0,
        completed: true
      });
      const day = Math.max(1, Math.min(7, Number((getTraining7State() || {}).currentDay || review.trainingDay || 1)));
      saveTraining7Task(day, "daily_practice", true);
      saveTraining7Task(day, "kline", true);
      saveInviteConversionEvent("kline_training_completed", {
        sourcePage: "kline_session",
        shareCardType: "kline_insight",
        trainingDay: review.trainingDay || day,
        relatedMirror: review.relatedMirror || ""
      });
      wx.redirectTo({ url: `/pages/kline-review/index?reviewId=${review.id}` });
      return;
    }

    const chartView = buildChartView(this.data.scene, nextSession.stepIndex);
    this.setData({
      session: nextSession,
      checkpoint: this.data.scene.checkpoints[nextSession.stepIndex],
      candles: chartView.candles,
      chartScale: chartView.chartScale,
      futureBars: chartView.futureBars,
      firstCandleText: chartView.firstCandleText,
      lastCandleText: chartView.lastCandleText,
      chartRevealText: buildChartRevealText(this.data.scene, chartView.candles, true),
      mainActionText: "记录并继续",
      selectedOption: "",
      selectedAt: 0,
      elapsedText: "0.0 秒",
      reactionHint: "下一根已显露，先照见第一念。",
      selectedEmotion: "",
      firstThought: "",
      boundaryState: "kept"
    }, this.startStepTimer);
  },

  startStepTimer() {
    if (this.stepTimer) clearInterval(this.stepTimer);
    this.stepTimer = setInterval(() => {
      if (!this.data.historicalReady) return;
      const session = this.data.session || {};
      if (this.data.selectedAt) return;
      const elapsedMs = Date.now() - Number(session.lastStepAt || session.startedAt || Date.now());
      this.setData({ elapsedText: formatElapsed(elapsedMs) });
    }, 250);
  },

  onUnload() {
    if (this.stepTimer) clearInterval(this.stepTimer);
  }
});
