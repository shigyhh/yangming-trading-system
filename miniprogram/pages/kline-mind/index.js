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
  buildKlineTrainingHotPoolSlot,
  buildTradeReviewUrl,
  createTrainingBookmark,
  fetchKlineTrainingSlice,
  getCachedKlineTrainingSlice,
  KLINE_TRAINING_WINDOW_SIZE,
  prefetchKlineTrainingSlices,
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
  buildTrainingBookmark,
  getNextKlineMindSliceSeed,
  getInitialKlineVisibleCount,
  startKlineTrainingRuntime,
  advanceKlineTrainingRuntime,
  recordKlineTrainingDecision,
  setKlineRuntimeChartZoom,
  setKlineRuntimeViewportPan,
  setKlineRuntimeIndicator,
  setKlineRuntimeMainIndicator,
  buildKlineTrainingRecordPatch,
  normalizeKlineMindTimeframeKey,
  normalizeKlineMindEntryContext,
  mergeKlineMindEntryContext
} = require("../../modules/kline-mind/index");
const {
  buildKlineTradeReviewRecord: buildKlineMirrorRecord
} = require("../../modules/kline-simulator/index");
const { buildKlineCanvasDrawModel } = require("../../modules/kline-mind/canvas-renderer");
const { getRuntimeRpxScale } = require("../../utils/runtime-info");

const REACTION_DIRECTIONS = [
  { key: "act", label: "想立刻做", detail: "追、急、想证明" },
  { key: "avoid", label: "想躲开", detail: "怕错、怕亏、想退出" },
  { key: "observe", label: "先看清", detail: "停住、复核、守边界" }
];

const DECISION_ACTIONS = [
  { key: "BUY", label: "买入" },
  { key: "SELL", label: "卖出" },
  { key: "HOLD", label: "观望" }
];

const CHART_ZOOM_ORDER = ["overview", "wide", "standard", "focus"];
const SLICE_SWITCH_LIMIT = 9;
const HISTORY_LOAD_TIMEOUT_MS = 8000;
const HISTORY_LOAD_FAILURE_MESSAGE = "历史数据服务暂未连接。真机预览请在我的页把后端地址改成电脑局域网 IP:8787，并确认服务已启动。";
const KLINE_CANVAS_METRICS = {
  width: 690,
  mainHeight: 336,
  indicatorHeight: 104
};

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
    timeframeLabel: timeframe.label || record.timeframeKey || "交易风格",
    trainingDay: record.day || session.day || 1,
    sceneTitle: `${record.marketName || market.name || "历史品类"} · ${timeframe.label || record.timeframeKey || "交易风格"}`,
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
  const timeframeKey = normalizeKlineMindTimeframeKey(record.timeframeKey, session.timeframeKey || "1d");
  return {
    marketKey: record.marketKey || ((session.market || {}).key) || "cn_equity",
    market_key: record.market_key || record.marketKey || ((session.market || {}).key) || "cn_equity",
    timeframeKey,
    timeframe_key: record.timeframe_key || timeframeKey,
    scenarioId: savedSceneId.indexOf("scene-") === 0 ? savedSceneId : "scene-fast-001",
    scenario_id: savedSceneId.indexOf("scene-") === 0 ? savedSceneId : "scene-fast-001",
    sliceSeed: savedSceneId.indexOf("scene-") === 0 ? savedSceneId : "scene-fast-001",
    slice_seed: savedSceneId.indexOf("scene-") === 0 ? savedSceneId : "scene-fast-001",
    sourceType: record.sourceType || record.source_type || "",
    source_type: record.source_type || record.sourceType || "",
    entrySourceLabel: record.entrySourceLabel || record.entry_source_label || "",
    entry_source_label: record.entry_source_label || record.entrySourceLabel || "",
    symbol: record.symbol || "",
    chartZoomKey: record.chartZoomKey || session.chartZoomKey || "wide",
    mainIndicatorKey: record.mainIndicatorKey || session.defaultMainIndicatorKey || "ma",
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
      chartScrollLeft: 0,
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
    decisionPrompt: runtime.mustDecide ? "这一根必须先做一次决策。" : "只看当下这一根，不猜后面。",
    latestCoach: (latestCoach || {}).text || "",
    latestRisk: (latestRisk || {}).text || "只做训练记录，不作当下判断。",
    latestEmotion: (latestEmotion || {}).label || "",
    decisionCount: (runtime.decisionTimeline || []).length,
    positionText: metrics.positionSize ? "持仓" : "空仓",
    pnlText: `${Number(metrics.totalPnl || 0).toFixed(2)}%`,
    drawdownText: `${Number(metrics.maxDrawdown || 0).toFixed(2)}%`,
    chartBoardStyle: runtime.chartBoardStyle || "",
    chartScrollLeft: Number(runtime.chartScrollLeft || 0),
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

function buildUnavailableHistorySlice(result = {}) {
  const slice = (result || {}).slice || {};
  return {
    source: "server_unavailable",
    sliceSource: "server_unavailable",
    klineSource: "server_unavailable",
    symbol: result.symbol || slice.symbol || "",
    timeframe: result.timeframe || slice.timeframe || "",
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

function buildFailedHistorySlice(record = {}, message = HISTORY_LOAD_FAILURE_MESSAGE) {
  return buildMindHistorySlice({
    ok: false,
    reason: "network_error",
    errorMessage: message,
    symbol: record.symbol || "",
    timeframe: normalizeKlineMindTimeframeKey(record.timeframeKey)
  });
}

function buildHistorySliceCacheKey(record = {}) {
  const timeframeKey = normalizeKlineMindTimeframeKey(record.timeframeKey);
  return [
    record.marketKey || "cn_equity",
    timeframeKey,
    record.scenarioId || "scene-fast-001",
    record.symbol || "",
    record.sourceType || record.source_type || "",
    record.entrySourceLabel || record.entry_source_label || ""
  ].join("|");
}

function buildHistorySliceRequestParams(record = {}) {
  const timeframeKey = normalizeKlineMindTimeframeKey(record.timeframeKey);
  const sourceType = record.sourceType || record.source_type || "";
  const scenarioId = record.scenarioId || "";
  return {
    marketKey: record.marketKey || "cn_equity",
    timeframeKey,
    symbol: record.symbol || "",
    windowSize: KLINE_TRAINING_WINDOW_SIZE,
    mode: "step_replay",
    gateKey: "shi_shang_mo",
    blind: true,
    seed: scenarioId,
    sceneId: scenarioId,
    scene_id: scenarioId,
    sourceType,
    source_type: sourceType
  };
}

function shouldCachePageHistorySlice(historySlice = {}) {
  return !!(historySlice.candles && historySlice.candles.length)
    && !historySlice.hot_pool
    && !historySlice.hotPool;
}

function buildHistoryHotPoolSlot(record = {}, index = 1) {
  const requestParams = buildHistorySliceRequestParams(record);
  return buildKlineTrainingHotPoolSlot({
    scenarioId: requestParams.seed || record.scenarioId || "scene-fast-001",
    timeframeKey: requestParams.timeframeKey,
    index
  });
}

function buildFutureSliceSeeds(currentSeed = "scene-fast-001", depth = 3) {
  const seeds = [];
  let cursor = currentSeed || "scene-fast-001";
  for (let index = 0; index < depth; index += 1) {
    cursor = getNextKlineMindSliceSeed(cursor);
    if (seeds.indexOf(cursor) < 0) seeds.push(cursor);
  }
  return seeds;
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
    showBodySignal: false,
    selectedMainIndicatorKey: "ma",
    selectedIndicatorKey: "vol",
    sliceSwitchCount: 0,
    sliceSwitchLimitReached: false,
    tradeReviewUrl: "",
    entryContext: normalizeKlineMindEntryContext(),
    bookmarkSaving: false,
    bookmarkMessage: "",
    bookmarkError: "",
    canvasMetrics: KLINE_CANVAS_METRICS,
    chartCrosshair: { visible: false, x: 0, tooltip: null }
  },

  onLoad(options = {}) {
    this.entryContext = normalizeKlineMindEntryContext(options);
    this.setData({ entryContext: this.entryContext });
  },

  onHide() {
    this.clearHistoryLoadTimer();
  },

  onUnload() {
    this.clearHistoryLoadTimer();
  },

  onShow() {
    this.historySliceCache = this.historySliceCache || {};
    this.prefetchHistoryRequests = this.prefetchHistoryRequests || {};
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
    const recordWithEntryContext = mergeKlineMindEntryContext(klineMindRecord || {}, this.entryContext || this.data.entryContext || {});
    const session = buildKlineMindSession({
      assessment,
      trainingDay,
      record: recordWithEntryContext
    });
    const form = buildForm(recordWithEntryContext, session);
    const tradeReviewUrl = resolveTradeReviewUrl(recordWithEntryContext);

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
      initialVisibleCount: getInitialKlineVisibleCount(session),
      initialMainIndicatorKey: this.data.selectedMainIndicatorKey || session.defaultMainIndicatorKey || "ma",
      initialIndicatorKey: this.data.selectedIndicatorKey || session.defaultIndicatorKey || "vol",
      sliceSeed: record.scenarioId || ((session.historySlice || {}).sliceSeed) || ((session.historySlice || {}).seed) || ""
    });
  },

  drawCanvasCommands(canvasId, board = {}) {
    if (typeof wx === "undefined" || !wx.createCanvasContext) return;
    const ctx = wx.createCanvasContext(canvasId, this);
    if (!ctx) return;
    const width = Number(board.width || KLINE_CANVAS_METRICS.width);
    const height = Number(board.height || KLINE_CANVAS_METRICS.mainHeight);
    const rpxScale = getRuntimeRpxScale();
    if (ctx.save) ctx.save();
    if (ctx.scale) ctx.scale(rpxScale, rpxScale);
    ctx.setFillStyle("#030504");
    ctx.fillRect(0, 0, width, height);

    (board.commands || []).forEach((command) => {
      if (
        command.type === "grid-line"
        || command.type === "line-segment"
        || command.type === "crosshair-line"
        || command.type === "volume-guide"
      ) {
        ctx.beginPath();
        ctx.setStrokeStyle(command.color || "rgba(244, 235, 221, 0.2)");
        ctx.setLineWidth(command.lineWidth || 1);
        ctx.moveTo(command.x1, command.y1);
        ctx.lineTo(command.x2, command.y2);
        ctx.stroke();
        return;
      }

      if (command.type === "price-label" || command.type === "time-label") {
        ctx.setFillStyle(command.color || "rgba(244, 235, 221, 0.48)");
        if (ctx.setFontSize) ctx.setFontSize(18);
        if (ctx.setTextAlign) ctx.setTextAlign(command.type === "time-label" ? "center" : "right");
        if (ctx.setTextBaseline) ctx.setTextBaseline("middle");
        ctx.fillText(command.text || "", command.x, command.y);
        if (ctx.setTextAlign) ctx.setTextAlign("left");
        return;
      }

      if (command.type === "candle") {
        ctx.beginPath();
        ctx.setStrokeStyle(command.color);
        ctx.setLineWidth(command.selected ? 2 : 1);
        ctx.moveTo(command.x, command.highY);
        ctx.lineTo(command.x, command.lowY);
        ctx.stroke();
        ctx.setFillStyle(command.color);
        ctx.fillRect(
          command.x - command.bodyWidth / 2,
          command.bodyTop,
          command.bodyWidth,
          command.bodyHeight
        );
        if (command.selected) {
          const left = command.x - command.bodyWidth / 2 - 2;
          const top = command.bodyTop - 2;
          const right = left + command.bodyWidth + 4;
          const bottom = top + command.bodyHeight + 4;
          ctx.setStrokeStyle("rgba(255, 223, 117, 0.86)");
          ctx.setLineWidth(2);
          ctx.beginPath();
          ctx.moveTo(left, top);
          ctx.lineTo(right, top);
          ctx.lineTo(right, bottom);
          ctx.lineTo(left, bottom);
          ctx.lineTo(left, top);
          ctx.stroke();
        }
        return;
      }

      if (command.type === "indicator-bar") {
        ctx.setFillStyle(command.color || "rgba(214, 224, 218, 0.42)");
        ctx.fillRect(
          command.x - command.width / 2,
          command.top,
          command.width,
          command.height
        );
      }
    });

    if (ctx.restore) ctx.restore();
    ctx.draw();
  },

  drawKlineCanvas() {
    const runtimeView = this.data.runtimeView || {};
    if (!runtimeView.visibleCandles || !runtimeView.visibleCandles.length) return;
    const crosshair = this.data.chartCrosshair || {};
    const model = buildKlineCanvasDrawModel(runtimeView, Object.assign({}, KLINE_CANVAS_METRICS, {
      crosshairVisible: !!crosshair.visible,
      crosshairX: crosshair.x,
      crosshairIndex: crosshair.index
    }));
    this.drawCanvasCommands("klineMainCanvas", model.main);
    if (model.indicator.visible) {
      this.drawCanvasCommands("klineIndicatorCanvas", model.indicator);
    }
  },

  getChartTouchX(e = {}) {
    const touch = (e.touches || [])[0] || (e.changedTouches || [])[0] || {};
    const detail = e.detail || {};
    const rawX = Number(detail.x || touch.x || touch.clientX || touch.pageX || KLINE_CANVAS_METRICS.width / 2);
    const rpxScale = getRuntimeRpxScale();
    return Math.max(0, Math.min(KLINE_CANVAS_METRICS.width, rawX / rpxScale));
  },

  showChartCrosshair(e) {
    if (this.chartPanStart || this.chartPinchStart) return;
    const runtimeView = this.data.runtimeView || {};
    if (!runtimeView.visibleCandles || !runtimeView.visibleCandles.length) return;
    const crosshairX = this.getChartTouchX(e);
    const model = buildKlineCanvasDrawModel(runtimeView, Object.assign({}, KLINE_CANVAS_METRICS, {
      crosshairVisible: true,
      crosshairX
    }));
    const crosshair = model.main.crosshair || { visible: false, x: crosshairX, tooltip: null };
    this.setData({ chartCrosshair: crosshair }, () => {
      this.drawKlineCanvas();
    });
  },

  hideChartCrosshair() {
    if (!(this.data.chartCrosshair || {}).visible) return;
    this.setData({
      chartCrosshair: { visible: false, x: 0, tooltip: null }
    }, () => {
      this.drawKlineCanvas();
    });
  },

  applyHistorySlice(record = {}, historySlice = {}) {
    const recordWithSlice = Object.assign({}, record || {}, { historySlice });
    const session = this.buildSession(recordWithSlice);
    const trainingRuntime = this.buildTrainingRuntime(session, recordWithSlice);
    this.setData({
      session,
      trainingRuntime,
      runtimeView: buildRuntimeView(trainingRuntime),
      form: Object.assign({}, this.data.form, recordWithSlice, { selectedCandleKey: session.selectedCandleKey }),
      historyLoading: false,
      historyError: session.hasHistoricalData ? "" : (historySlice.serverSliceError || "真实历史数据未载入")
    }, () => {
      this.drawKlineCanvas();
    });
    if (session.hasHistoricalData) {
      this.prefetchTimeframeSlices(recordWithSlice);
      this.prefetchNextSlice(recordWithSlice);
    }
  },

  clearHistoryLoadTimer() {
    if (!this.historyLoadTimer) return;
    clearTimeout(this.historyLoadTimer);
    this.historyLoadTimer = null;
  },

  armHistoryLoadTimeout(requestKey, baseRecord) {
    this.clearHistoryLoadTimer();
    this.historyLoadTimer = setTimeout(() => {
      if (this.latestHistoryRequestKey !== requestKey || !this.data.historyLoading) return;
      this.applyHistorySlice(baseRecord, buildFailedHistorySlice(baseRecord));
    }, HISTORY_LOAD_TIMEOUT_MS);
  },

  buildPendingHistorySession(record = {}) {
    const nextSession = this.buildSession(record);
    return Object.assign({}, this.data.session || nextSession, {
      market: nextSession.market,
      marketKey: nextSession.marketKey,
      timeframeKey: nextSession.timeframeKey,
      timeframeLabel: nextSession.timeframeLabel,
      timeframeOptions: nextSession.timeframeOptions,
      dataStatusText: "正在读取历史练习数据"
    });
  },

  loadServerHistorySlice(record = {}, options = {}) {
    const requestKey = `slice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.latestHistoryRequestKey = requestKey;
    const baseRecord = Object.assign({}, record || {});
    const cacheKey = buildHistorySliceCacheKey(baseRecord);
    const cachedSlice = (this.historySliceCache || {})[cacheKey];
    if (cachedSlice) {
      this.applyHistorySlice(baseRecord, cachedSlice);
      return;
    }
    const requestParams = buildHistorySliceRequestParams(baseRecord);
    const instantCachedResult = getCachedKlineTrainingSlice(requestParams);
    const instantCachedSlice = instantCachedResult ? buildMindHistorySlice(instantCachedResult) : null;
    const hasInstantCache = shouldCachePageHistorySlice(instantCachedSlice || {});
    if (hasInstantCache) {
      this.historySliceCache = Object.assign({}, this.historySliceCache || {}, { [cacheKey]: instantCachedSlice });
      this.applyHistorySlice(baseRecord, instantCachedSlice);
      return;
    }
    const keepCurrentChart = (!!options.keepCurrentChart || hasInstantCache) && !!((this.data.session || {}).hasHistoricalData);
    this.setData({
      historyLoading: true,
      historyError: "",
      form: Object.assign({}, this.data.form, baseRecord),
      trainingRuntime: keepCurrentChart ? this.data.trainingRuntime : null,
      runtimeView: keepCurrentChart ? this.data.runtimeView : buildRuntimeView(),
      session: keepCurrentChart
        ? this.buildPendingHistorySession(baseRecord)
        : Object.assign({}, this.buildSession(Object.assign({}, baseRecord, { historySlice: null })), {
          dataStatusText: "正在读取历史练习数据"
        })
    });
    this.armHistoryLoadTimeout(requestKey, baseRecord);
    const hotPoolScenarioId = requestParams.seed || baseRecord.scenarioId || "scene-fast-001";
    const hotPoolSlot = buildHistoryHotPoolSlot(baseRecord, 1);
    prefetchKlineTrainingSlices({
      marketKey: requestParams.marketKey,
      symbol: requestParams.symbol,
      timeframes: [requestParams.timeframeKey],
      windowSize: requestParams.windowSize,
      mode: requestParams.mode,
      gateKey: requestParams.gateKey,
      blind: requestParams.blind,
      scenarioId: hotPoolScenarioId,
      prefetchDepth: 1
    }).catch(() => null).then(() => {
      if (this.latestHistoryRequestKey !== requestKey) return null;
      return fetchKlineTrainingSlice({
        ...requestParams,
        hotPoolSlot
      });
    }).then((result) => {
      if (!result) return;
      if (this.latestHistoryRequestKey !== requestKey) return;
      this.clearHistoryLoadTimer();
      const historySlice = buildMindHistorySlice(result);
      if (shouldCachePageHistorySlice(historySlice)) {
        this.historySliceCache = Object.assign({}, this.historySliceCache || {}, { [cacheKey]: historySlice });
      }
      this.applyHistorySlice(baseRecord, historySlice);
    }).catch(() => {
      if (this.latestHistoryRequestKey !== requestKey) return;
      this.clearHistoryLoadTimer();
      this.applyHistorySlice(baseRecord, buildFailedHistorySlice(baseRecord));
    });
  },

  prefetchTimeframeSlices(record = {}) {
    const currentKey = normalizeKlineMindTimeframeKey(record.timeframeKey);
    ["1d", "60m", "30m"].forEach((timeframeKey) => {
      if (timeframeKey === currentKey) return;
      const nextRecord = Object.assign({}, record, { timeframeKey });
      const cacheKey = buildHistorySliceCacheKey(nextRecord);
      if ((this.historySliceCache || {})[cacheKey] || (this.prefetchHistoryRequests || {})[cacheKey]) return;
      const requestParams = buildHistorySliceRequestParams(nextRecord);
      this.prefetchHistoryRequests = Object.assign({}, this.prefetchHistoryRequests || {}, { [cacheKey]: true });
      fetchKlineTrainingSlice({
        ...requestParams,
        hotPoolSlot: buildHistoryHotPoolSlot(nextRecord, 1),
        useHotPoolQueue: false,
        storeHotPoolResult: true
      }).then((result) => {
        const historySlice = buildMindHistorySlice(result);
        if (shouldCachePageHistorySlice(historySlice)) {
          this.historySliceCache = Object.assign({}, this.historySliceCache || {}, { [cacheKey]: historySlice });
        }
      }).finally(() => {
        const nextRequests = Object.assign({}, this.prefetchHistoryRequests || {});
        delete nextRequests[cacheKey];
        this.prefetchHistoryRequests = nextRequests;
      });
    });
  },

  prefetchNextSlice(record = {}) {
    buildFutureSliceSeeds(record.scenarioId || "scene-fast-001", 3).forEach((nextScenarioId) => {
      const nextRecord = Object.assign({}, record, { scenarioId: nextScenarioId });
      const cacheKey = buildHistorySliceCacheKey(nextRecord);
      if ((this.historySliceCache || {})[cacheKey] || (this.prefetchHistoryRequests || {})[cacheKey]) return;
      const requestParams = buildHistorySliceRequestParams(nextRecord);
      this.prefetchHistoryRequests = Object.assign({}, this.prefetchHistoryRequests || {}, { [cacheKey]: true });
      fetchKlineTrainingSlice({
        ...requestParams,
        hotPoolSlot: buildHistoryHotPoolSlot(nextRecord, 1),
        useHotPoolQueue: false,
        storeHotPoolResult: true
      }).then((result) => {
        const historySlice = buildMindHistorySlice(result);
        if (shouldCachePageHistorySlice(historySlice)) {
          this.historySliceCache = Object.assign({}, this.historySliceCache || {}, { [cacheKey]: historySlice });
        }
      }).finally(() => {
        const nextRequests = Object.assign({}, this.prefetchHistoryRequests || {});
        delete nextRequests[cacheKey];
        this.prefetchHistoryRequests = nextRequests;
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
    this.setData({ form });
    this.loadServerHistorySlice(form, { keepCurrentChart: true });
  },

  selectTimeframe(e) {
    const timeframeKey = normalizeKlineMindTimeframeKey(e.currentTarget.dataset.timeframe);
    const form = Object.assign({}, this.data.form, {
      timeframeKey,
      selectedCandleKey: ""
    });
    this.setData({ form });
    this.loadServerHistorySlice(form, { keepCurrentChart: true });
  },

  selectChartZoom(e) {
    const chartZoomKey = e.currentTarget.dataset.zoom;
    this.hideChartCrosshair();
    this.updateChartZoom(chartZoomKey);
  },

  updateChartZoom(chartZoomKey) {
    if (!chartZoomKey) return;
    const currentRuntime = this.data.trainingRuntime;
    const activeCandleKey = ((currentRuntime || {}).activeCandle || {}).key || ((this.data.form || {}).selectedCandleKey) || "";
    const form = Object.assign({}, this.data.form, { chartZoomKey, selectedCandleKey: activeCandleKey });
    const session = this.buildSession(form);
    const trainingRuntime = currentRuntime
      ? setKlineRuntimeChartZoom(currentRuntime, session.chartZoomKey || chartZoomKey)
      : this.buildTrainingRuntime(session, form);
    const selectedCandleKey = ((trainingRuntime || {}).activeCandle || {}).key || session.selectedCandleKey || activeCandleKey;
    this.setData({
      form: Object.assign({}, form, { selectedCandleKey }),
      session,
      trainingRuntime,
      runtimeView: buildRuntimeView(trainingRuntime)
    }, () => {
      this.drawKlineCanvas();
    });
  },

  decreaseChartZoom() {
    const current = ((this.data.session || {}).chartZoomKey) || ((this.data.form || {}).chartZoomKey) || "wide";
    const index = CHART_ZOOM_ORDER.indexOf(current);
    const nextIndex = Math.max(0, index <= 0 ? 0 : index - 1);
    this.hideChartCrosshair();
    this.updateChartZoom(CHART_ZOOM_ORDER[nextIndex]);
  },

  increaseChartZoom() {
    const current = ((this.data.session || {}).chartZoomKey) || ((this.data.form || {}).chartZoomKey) || "wide";
    const index = CHART_ZOOM_ORDER.indexOf(current);
    const safeIndex = index >= 0 ? index : 0;
    const nextIndex = Math.min(CHART_ZOOM_ORDER.length - 1, safeIndex + 1);
    this.hideChartCrosshair();
    this.updateChartZoom(CHART_ZOOM_ORDER[nextIndex]);
  },

  getChartPanStep() {
    const viewport = ((this.data.trainingRuntime || {}).chartViewport) || {};
    const capacity = Number(viewport.capacity || 0);
    return Math.max(4, Math.min(12, Math.round((capacity || 24) * 0.2)));
  },

  updateChartPan(panOffset) {
    const runtime = this.data.trainingRuntime;
    if (!runtime) return null;
    const nextRuntime = setKlineRuntimeViewportPan(runtime, panOffset);
    if (Number(nextRuntime.chartPanOffset || 0) === Number(runtime.chartPanOffset || 0)) return nextRuntime;
    this.setData({
      trainingRuntime: nextRuntime,
      runtimeView: buildRuntimeView(nextRuntime)
    }, () => {
      this.drawKlineCanvas();
    });
    return nextRuntime;
  },

  panChartLeft() {
    const runtime = this.data.trainingRuntime || {};
    this.hideChartCrosshair();
    this.updateChartPan(Number(runtime.chartPanOffset || 0) + this.getChartPanStep());
  },

  panChartRight() {
    const runtime = this.data.trainingRuntime || {};
    this.hideChartCrosshair();
    this.updateChartPan(Number(runtime.chartPanOffset || 0) - this.getChartPanStep());
  },

  getTouchDistance(touches = []) {
    const first = touches[0] || {};
    const second = touches[1] || {};
    const dx = Number(second.clientX || second.x || 0) - Number(first.clientX || first.x || 0);
    const dy = Number(second.clientY || second.y || 0) - Number(first.clientY || first.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  },

  getCurrentChartZoomIndex() {
    const current = ((this.data.session || {}).chartZoomKey) || ((this.data.form || {}).chartZoomKey) || "wide";
    const index = CHART_ZOOM_ORDER.indexOf(current);
    return index >= 0 ? index : CHART_ZOOM_ORDER.indexOf("wide");
  },

  onChartPanStart(e) {
    this.hideChartCrosshair();
    const touches = e.touches || [];
    if (touches.length >= 2) {
      this.chartPanStart = null;
      this.chartPinchStart = {
        distance: this.getTouchDistance(touches),
        zoomIndex: this.getCurrentChartZoomIndex()
      };
      return;
    }
    this.chartPinchStart = null;
    const touch = touches[0] || {};
    const runtime = this.data.trainingRuntime || {};
    this.chartPanStart = {
      x: Number(touch.clientX || 0),
      panOffset: Number(runtime.chartPanOffset || 0)
    };
  },

  onChartPanMove(e) {
    const touches = e.touches || [];
    if (this.chartPinchStart && touches.length >= 2) {
      const distance = this.getTouchDistance(touches);
      const delta = distance - Number(this.chartPinchStart.distance || 0);
      if (Math.abs(delta) < 18) return;
      const direction = delta > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(
        CHART_ZOOM_ORDER.length - 1,
        Number(this.chartPinchStart.zoomIndex || 0) + direction
      ));
      if (nextIndex === this.chartPinchStart.zoomIndex) return;
      this.chartPinchStart = {
        distance,
        zoomIndex: nextIndex
      };
      this.updateChartZoom(CHART_ZOOM_ORDER[nextIndex]);
      return;
    }
    if (!this.chartPanStart || !this.data.trainingRuntime) return;
    const touch = touches[0] || {};
    const currentX = Number(touch.clientX || 0);
    const dx = currentX - Number(this.chartPanStart.x || 0);
    const viewport = (this.data.trainingRuntime || {}).chartViewport || {};
    const barStepPx = Math.max(4, Number(viewport.barStepRpx || 8) * getRuntimeRpxScale() * 0.75);
    const deltaBars = Math.round(dx / barStepPx);
    if (!deltaBars) return;
    const nextRuntime = this.updateChartPan(Number(this.chartPanStart.panOffset || 0) + deltaBars);
    this.chartPanStart = {
      x: currentX,
      panOffset: Number(nextRuntime.chartPanOffset || 0)
    };
  },

  onChartPanEnd() {
    this.chartPanStart = null;
    this.chartPinchStart = null;
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
    }, () => {
      this.drawKlineCanvas();
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
    }, () => {
      this.drawKlineCanvas();
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

  switchSlice() {
    const switchCount = Number(this.data.sliceSwitchCount || 0);
    if (switchCount >= SLICE_SWITCH_LIMIT || this.data.sliceSwitchLimitReached) {
      wx.showToast({ title: "本次先练这一段", icon: "none" });
      return;
    }
    if (this.data.historyLoading) {
      wx.showToast({ title: "正在换段", icon: "none" });
      return;
    }
    this.hideChartCrosshair();
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
    const nextSwitchCount = switchCount + 1;
    this.setData({
      form,
      sliceSwitchCount: nextSwitchCount,
      sliceSwitchLimitReached: nextSwitchCount >= SLICE_SWITCH_LIMIT,
      showBodySignal: false
    });
    this.loadServerHistorySlice(form, { keepCurrentChart: true });
  },

  goBackendSetup() {
    try {
      wx.setStorageSync("ym_profile_open_sync_setup", true);
    } catch (error) {}
    wx.navigateTo({ url: "/pages/profile/index" });
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
      }, () => {
        this.drawKlineCanvas();
      });
      wx.showToast({ title: "先做一次决策", icon: "none" });
      return;
    }
    this.setData({
      trainingRuntime: nextRuntime,
      runtimeView: buildRuntimeView(nextRuntime),
      form: Object.assign({}, this.data.form, {
        selectedCandleKey: ((nextRuntime.activeCandle || {}).key) || (this.data.form || {}).selectedCandleKey || ""
      })
    }, () => {
      this.drawKlineCanvas();
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
    }, () => {
      this.drawKlineCanvas();
    });
    wx.showToast({
      title: action === "HOLD" ? "已记录观望" : "已记录动作",
      icon: "none"
    });
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
