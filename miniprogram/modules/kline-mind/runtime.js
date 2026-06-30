const CHART_ZOOM_OPTIONS = [
  { key: "overview", label: "总览", hint: "约180根，先看整体趋势", windowSize: 180 },
  { key: "wide", label: "缩小", hint: "约150根，适合横屏盲测", windowSize: 150 },
  { key: "standard", label: "标准", hint: "约90根，平衡节奏", windowSize: 90 },
  { key: "focus", label: "放大", hint: "约48根，细看", windowSize: 48 }
];

const INDICATOR_CATALOG = [
  { key: "ma", label: "MA", name: "均线", trainingUse: "看趋势牵动" },
  { key: "macd", label: "MACD", name: "动能", trainingUse: "看冲动来源" },
  { key: "boll", label: "BOLL", name: "波动边界", trainingUse: "看边界感" },
  { key: "vol", label: "VOL", name: "量能", trainingUse: "看放量反应" },
  { key: "rsi", label: "RSI", name: "强弱", trainingUse: "看过热牵动" },
  { key: "kdj", label: "KDJ", name: "摆动", trainingUse: "看追涨犹豫" }
];

const MAIN_INDICATOR_OPTIONS = [
  { key: "ma", label: "MA" },
  { key: "boll", label: "BOLL" }
];

const INDICATOR_PANEL_OPTIONS = [
  { key: "vol", label: "VOL" },
  { key: "macd", label: "MACD" },
  { key: "rsi", label: "RSI" },
  { key: "kdj", label: "KDJ" }
];

const CHART_GEOMETRY = {
  overview: { candleWidth: 2, bodyWidth: 2, gap: 1, paddingX: 18, paddingTop: 24 },
  wide: { candleWidth: 4, bodyWidth: 4, gap: 1, paddingX: 18, paddingTop: 24 },
  standard: { candleWidth: 10, bodyWidth: 8, gap: 4, paddingX: 18, paddingTop: 24 },
  focus: { candleWidth: 22, bodyWidth: 17, gap: 7, paddingX: 18, paddingTop: 24 }
};

const BLIND_CHART_MIN_WIDTH = 690;
const MIN_VISIBLE_CANDLES = 1;
const DEFAULT_VISIBLE_CANDLES = 150;
const MAX_VISIBLE_CANDLES = 180;

function roundMetric(value, digits = 2) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  const factor = Math.pow(10, digits);
  return Math.round(number * factor) / factor;
}

function cleanEventText(value, limit = 280) {
  const text = String(value || "").trim().slice(0, limit);
  if (!text) return "";
  return text
    .replace(/(^|[^\d])1[3-9]\d{9}(?=\D|$)/g, "$1[redacted_phone]")
    .replace(/(token|access_token|authorization|验证码|code)[=:：]\s*[\w.-]+/gi, "$1=[redacted]");
}

function pickFiniteNumber(...values) {
  for (const value of values) {
    if (value === "" || value === null || value === undefined) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return NaN;
}

function getChartZoomMeta(zoomKey = "wide") {
  return CHART_ZOOM_OPTIONS.find((item) => item.key === zoomKey) || CHART_ZOOM_OPTIONS[1];
}

function buildChartZoomOptions(selectedKey = "wide") {
  return CHART_ZOOM_OPTIONS.map((item) => Object.assign({}, item, {
    selected: item.key === selectedKey
  }));
}

function normalizeWindowSize(windowSize) {
  const value = Number(windowSize || DEFAULT_VISIBLE_CANDLES);
  if (!Number.isFinite(value)) return DEFAULT_VISIBLE_CANDLES;
  return Math.max(MIN_VISIBLE_CANDLES, Math.min(MAX_VISIBLE_CANDLES, Math.round(value)));
}

function normalizeRawHistoryCandle(item = {}, index = 0) {
  const open = pickFiniteNumber(item.open, item.o, item.openPrice, item.open_price);
  const high = pickFiniteNumber(item.high, item.h, item.highPrice, item.high_price);
  const low = pickFiniteNumber(item.low, item.l, item.lowPrice, item.low_price);
  const close = pickFiniteNumber(item.close, item.c, item.closePrice, item.close_price);
  if (![open, high, low, close].every(Number.isFinite)) return null;

  return {
    key: item.id || item.key || `m${index + 1}`,
    date: item.date || item.time || item.t || item.label || "",
    open,
    high: Math.max(high, open, close, low),
    low: Math.min(low, open, close, high),
    close,
    volume: pickFiniteNumber(item.volume, item.vol, item.v, item.amount, 0),
    focus: !!item.focus
  };
}

function average(values = []) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function movingAverage(values = [], index, period) {
  if (index < 0) return null;
  const start = Math.max(0, index - period + 1);
  return average(values.slice(start, index + 1));
}

function standardDeviation(values = [], mean) {
  if (!values.length || mean === null) return null;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function pickVisibleHistoryWindow(candles, windowSize = DEFAULT_VISIBLE_CANDLES) {
  const safeWindowSize = normalizeWindowSize(windowSize);
  if (!candles.length) return [];
  if (candles.length <= safeWindowSize) return candles;
  const focusIndex = candles.findIndex((item) => item.focus);
  if (focusIndex >= 0) {
    const half = Math.floor(safeWindowSize / 2);
    const start = Math.max(0, Math.min(candles.length - safeWindowSize, focusIndex - half));
    return candles.slice(start, start + safeWindowSize);
  }
  return candles.slice(candles.length - safeWindowSize);
}

function normalizeHistoryCandles(historySlice = {}, options = {}) {
  const rawCandles = Array.isArray(historySlice.candles)
    ? historySlice.candles
    : Array.isArray(historySlice.bars) ? historySlice.bars : [];
  const normalizedCandles = rawCandles
    .map(normalizeRawHistoryCandle)
    .filter(Boolean)
    .map((item, sourceIndex) => Object.assign({}, item, { sourceIndex }));
  const candles = pickVisibleHistoryWindow(normalizedCandles, options.windowSize);
  if (!candles.length) return [];

  const closes = normalizedCandles.map((item) => Number(item.close));
  const allIndicatorValues = normalizedCandles.map((item, index) => {
    const ma5 = movingAverage(closes, index, 5);
    const ma10 = movingAverage(closes, index, 10);
    const ma20 = movingAverage(closes, index, 20);
    const bollWindow = closes.slice(Math.max(0, index - 19), index + 1);
    const deviation = ma20 === null ? null : standardDeviation(bollWindow, ma20);
    return {
      ma5,
      ma10,
      ma20,
      bollUpper: ma20 === null || deviation === null ? null : ma20 + deviation * 2,
      bollLower: ma20 === null || deviation === null ? null : ma20 - deviation * 2
    };
  });
  const indicatorValues = candles.map((item) => allIndicatorValues[item.sourceIndex] || {});
  const highs = candles.map((item) => Number(item.high)).filter(Number.isFinite);
  const lows = candles.map((item) => Number(item.low)).filter(Number.isFinite);
  const volumes = candles.map((item) => Number(item.volume || 0)).filter(Number.isFinite);
  const overlayValues = indicatorValues.reduce((items, item) => {
    ["ma5", "ma10", "ma20", "bollUpper", "bollLower"].forEach((key) => {
      if (Number.isFinite(item[key])) items.push(item[key]);
    });
    return items;
  }, []);
  const maxHigh = Math.max.apply(null, highs.concat(overlayValues));
  const minLow = Math.min.apply(null, lows.concat(overlayValues));
  const maxVolume = Math.max.apply(null, volumes.concat([1]));
  const range = Math.max(0.0001, maxHigh - minLow);
  const valueToY = (value) => Number.isFinite(value)
    ? Math.round(((maxHigh - value) / range) * 168 + 34)
    : null;

  return candles.map((item, index) => {
    const open = Number(item.open);
    const high = Number(item.high);
    const low = Number(item.low);
    const close = Number(item.close);
    const volume = Number(item.volume || 0);
    const highY = ((maxHigh - high) / range) * 168 + 34;
    const lowY = ((maxHigh - low) / range) * 168 + 34;
    const openY = ((maxHigh - open) / range) * 168 + 34;
    const closeY = ((maxHigh - close) / range) * 168 + 34;
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(6, Math.abs(openY - closeY));
    const wickHeight = Math.max(8, lowY - highY);
    const volumeHeight = Math.max(8, Math.round((volume / maxVolume) * 62));
    const indicator = indicatorValues[index] || {};
    const tone = close > open ? "gold" : close < open ? "jade" : "flat";

    return {
      key: item.key || `m${index + 1}`,
      sourceIndex: Number(item.sourceIndex || index),
      label: item.focus ? "问" : "",
      indexLabel: String(index + 1).padStart(2, "0"),
      tone,
      date: item.date || "",
      open,
      high,
      low,
      close,
      volume,
      wickStyle: `height: ${Math.round(wickHeight)}rpx; top: ${Math.round(highY)}rpx;`,
      bodyStyle: `height: ${Math.round(bodyHeight)}rpx; top: ${Math.round(bodyTop)}rpx;`,
      volumeStyle: `height: ${volumeHeight}rpx;`,
      closeY: valueToY(close),
      ma5Y: valueToY(indicator.ma5),
      ma10Y: valueToY(indicator.ma10),
      ma20Y: valueToY(indicator.ma20),
      bollUpperY: valueToY(indicator.bollUpper),
      bollLowerY: valueToY(indicator.bollLower),
      focus: !!item.focus,
      selected: false
    };
  });
}

function getChartGeometry(zoomKey = "wide") {
  return CHART_GEOMETRY[zoomKey] || CHART_GEOMETRY.wide;
}

function getChartLayout(candleCount, zoomKey = "wide") {
  const count = Math.max(1, Number(candleCount || 0));
  const geometry = getChartGeometry(zoomKey);
  if (count <= 1) return Object.assign({}, geometry, { width: BLIND_CHART_MIN_WIDTH, gap: geometry.gap });
  const naturalWidth = Math.round(geometry.paddingX * 2 + count * geometry.candleWidth + Math.max(0, count - 1) * geometry.gap);
  if (naturalWidth >= BLIND_CHART_MIN_WIDTH) return Object.assign({}, geometry, { width: naturalWidth, gap: geometry.gap });
  const gap = Math.max(geometry.gap, (BLIND_CHART_MIN_WIDTH - geometry.paddingX * 2 - count * geometry.candleWidth) / (count - 1));
  return Object.assign({}, geometry, { width: BLIND_CHART_MIN_WIDTH, gap });
}

function getChartBoardStyle(candleCount, zoomKey = "wide") {
  const layout = getChartLayout(candleCount, zoomKey);
  return [
    `width: ${layout.width}rpx`,
    "min-width: 100%",
    `--kline-gap: ${roundMetric(layout.gap, 2)}rpx`,
    `--kline-candle-width: ${roundMetric(layout.candleWidth, 2)}rpx`,
    `--kline-body-width: ${roundMetric(layout.bodyWidth || layout.candleWidth, 2)}rpx`
  ].join("; ") + ";";
}

function getChartViewportCapacity(zoomKey = "wide") {
  const geometry = getChartGeometry(zoomKey);
  const plotWidth = BLIND_CHART_MIN_WIDTH - geometry.paddingX * 2;
  const step = Math.max(1, geometry.candleWidth + geometry.gap);
  return Math.max(1, Math.floor((plotWidth + geometry.gap) / step));
}

function buildOverlaySegments(candles = [], field, zoomKey = "wide") {
  const geometry = getChartLayout(candles.length, zoomKey);
  const segments = [];
  for (let index = 0; index < candles.length - 1; index += 1) {
    const currentY = Number(candles[index][field]);
    const nextY = Number(candles[index + 1][field]);
    if (!Number.isFinite(currentY) || !Number.isFinite(nextY)) continue;
    const x1 = geometry.paddingX + index * (geometry.candleWidth + geometry.gap) + geometry.candleWidth / 2;
    const x2 = geometry.paddingX + (index + 1) * (geometry.candleWidth + geometry.gap) + geometry.candleWidth / 2;
    const y1 = geometry.paddingTop + currentY;
    const y2 = geometry.paddingTop + nextY;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const width = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    segments.push({
      key: `${field}-${index}`,
      style: `left: ${roundMetric(x1, 1)}rpx; top: ${roundMetric(y1, 1)}rpx; width: ${roundMetric(width, 1)}rpx; transform: rotate(${roundMetric(angle, 2)}deg);`
    });
  }
  return segments;
}

function getMainIndicatorMeta(key = "ma") {
  if (key === "hide") return { key: "hide", label: "" };
  return MAIN_INDICATOR_OPTIONS.find((item) => item.key === key) || MAIN_INDICATOR_OPTIONS[0];
}

function buildEmptyIndicatorOverlay() {
  return { ma5: [], ma10: [], ma20: [], bollUpper: [], bollLower: [] };
}

function buildIndicatorOverlay(candles = [], zoomKey = "wide", indicatorKey = "ma") {
  const meta = getMainIndicatorMeta(indicatorKey);
  if (meta.key === "hide") return buildEmptyIndicatorOverlay();
  if (meta.key === "boll") {
    return Object.assign(buildEmptyIndicatorOverlay(), {
      ma20: buildOverlaySegments(candles, "ma20Y", zoomKey),
      bollUpper: buildOverlaySegments(candles, "bollUpperY", zoomKey),
      bollLower: buildOverlaySegments(candles, "bollLowerY", zoomKey)
    });
  }
  return Object.assign(buildEmptyIndicatorOverlay(), {
    ma5: buildOverlaySegments(candles, "ma5Y", zoomKey),
    ma10: buildOverlaySegments(candles, "ma10Y", zoomKey),
    ma20: buildOverlaySegments(candles, "ma20Y", zoomKey)
  });
}

function getIndicatorPanelMeta(key = "vol") {
  if (key === "hide") return { key: "hide", label: "" };
  return INDICATOR_PANEL_OPTIONS.find((item) => item.key === key) || INDICATOR_PANEL_OPTIONS[0];
}

function emaSeries(values = [], period) {
  const k = 2 / (period + 1);
  let previous = null;
  return values.map((value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    previous = previous === null ? number : number * k + previous * (1 - k);
    return previous;
  });
}

function buildPanelLineSegments(points = [], field, zoomKey = "wide") {
  const geometry = getChartLayout(points.length, zoomKey);
  const segments = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const currentY = Number(points[index][field]);
    const nextY = Number(points[index + 1][field]);
    if (!Number.isFinite(currentY) || !Number.isFinite(nextY)) continue;
    const x1 = geometry.paddingX + index * (geometry.candleWidth + geometry.gap) + geometry.candleWidth / 2;
    const x2 = geometry.paddingX + (index + 1) * (geometry.candleWidth + geometry.gap) + geometry.candleWidth / 2;
    const dx = x2 - x1;
    const dy = nextY - currentY;
    const width = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    segments.push({
      key: `${field}-${index}`,
      style: `left: ${roundMetric(x1, 1)}rpx; top: ${roundMetric(currentY, 1)}rpx; width: ${roundMetric(width, 1)}rpx; transform: rotate(${roundMetric(angle, 2)}deg);`
    });
  }
  return segments;
}

function buildVolPanel(candles = []) {
  const maxVolume = Math.max.apply(null, candles.map((item) => Number(item.volume || 0)).concat([1]));
  return candles.map((item, index) => ({
    key: `vol-${item.key || index}`,
    tone: item.tone || "flat",
    barStyle: `height: ${Math.max(2, Math.round((Number(item.volume || 0) / maxVolume) * 76))}rpx;`
  }));
}

function buildMacdPanel(candles = [], zoomKey = "wide") {
  const closes = candles.map((item) => Number(item.close || 0));
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const dif = closes.map((_, index) => Number(ema12[index] || 0) - Number(ema26[index] || 0));
  const dea = emaSeries(dif, 9);
  const hist = dif.map((value, index) => value - Number(dea[index] || 0));
  const maxAbs = Math.max.apply(null, hist.concat(dif).concat(dea).map((value) => Math.abs(Number(value || 0))).concat([0.0001]));
  const mid = 46;
  const points = candles.map((item, index) => {
    const histogram = Number(hist[index] || 0);
    const barHeight = Math.max(2, Math.round(Math.abs(histogram) / maxAbs * 42));
    return {
      key: `macd-${item.key || index}`,
      tone: histogram >= 0 ? "gold" : "jade",
      barStyle: `height: ${barHeight}rpx; top: ${histogram >= 0 ? mid - barHeight : mid}rpx;`,
      difY: mid - Number(dif[index] || 0) / maxAbs * 38,
      deaY: mid - Number(dea[index] || 0) / maxAbs * 38
    };
  });
  return {
    items: points,
    lines: {
      dif: buildPanelLineSegments(points, "difY", zoomKey),
      dea: buildPanelLineSegments(points, "deaY", zoomKey)
    }
  };
}

function indicatorValueToY(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return 86 - safe / 100 * 80;
}

function buildRsiValues(candles = [], period = 14) {
  let avgGain = 0;
  let avgLoss = 0;
  return candles.map((item, index) => {
    if (index === 0) return 50;
    const prev = Number(candles[index - 1].close || 0);
    const current = Number(item.close || 0);
    const change = current - prev;
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    const divisor = Math.min(period, index);
    avgGain = index === 1 ? gain : ((avgGain * (divisor - 1)) + gain) / divisor;
    avgLoss = index === 1 ? loss : ((avgLoss * (divisor - 1)) + loss) / divisor;
    if (avgLoss <= 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  });
}

function buildRsiPanel(candles = [], zoomKey = "wide") {
  const rsiValues = buildRsiValues(candles, 14);
  const points = candles.map((item, index) => ({
    key: `rsi-${item.key || index}`,
    rsiY: indicatorValueToY(rsiValues[index])
  }));
  return { items: [], lines: { rsi: buildPanelLineSegments(points, "rsiY", zoomKey) } };
}

function buildKdjPanel(candles = [], zoomKey = "wide") {
  let k = 50;
  let d = 50;
  const points = candles.map((item, index) => {
    const start = Math.max(0, index - 8);
    const window = candles.slice(start, index + 1);
    const high = Math.max.apply(null, window.map((candle) => Number(candle.high || 0)).concat([Number(item.high || 0)]));
    const low = Math.min.apply(null, window.map((candle) => Number(candle.low || 0)).concat([Number(item.low || 0)]));
    const close = Number(item.close || 0);
    const rsv = high === low ? 50 : ((close - low) / (high - low)) * 100;
    k = k * 2 / 3 + rsv / 3;
    d = d * 2 / 3 + k / 3;
    const j = 3 * k - 2 * d;
    return {
      key: `kdj-${item.key || index}`,
      kY: indicatorValueToY(k),
      dY: indicatorValueToY(d),
      jY: indicatorValueToY(j)
    };
  });
  return {
    items: [],
    lines: {
      k: buildPanelLineSegments(points, "kY", zoomKey),
      d: buildPanelLineSegments(points, "dY", zoomKey),
      j: buildPanelLineSegments(points, "jY", zoomKey)
    }
  };
}

function buildIndicatorPanel(candles = [], key = "vol", zoomKey = "wide") {
  const meta = getIndicatorPanelMeta(key);
  if (meta.key === "hide") return { type: "hide", label: meta.label, visible: false, items: [], lines: {} };
  if (meta.key === "macd") {
    const macd = buildMacdPanel(candles, zoomKey);
    return { type: "macd", label: meta.label, visible: true, items: macd.items, lines: macd.lines };
  }
  if (meta.key === "rsi") {
    const rsi = buildRsiPanel(candles, zoomKey);
    return { type: "rsi", label: meta.label, visible: true, items: rsi.items, lines: rsi.lines };
  }
  if (meta.key === "kdj") {
    const kdj = buildKdjPanel(candles, zoomKey);
    return { type: "kdj", label: meta.label, visible: true, items: kdj.items, lines: kdj.lines };
  }
  return { type: "vol", label: meta.label, visible: true, items: buildVolPanel(candles), lines: {} };
}

function normalizeDecisionInterval(value) {
  const number = Number(value || 5);
  if (!Number.isFinite(number)) return 5;
  return Math.max(3, Math.min(10, Math.round(number)));
}

function buildRuntimeViewport(candles = [], currentIndex = 0, zoomKey = "wide", panOffset = 0) {
  if (!Array.isArray(candles) || !candles.length) {
    return {
      startIndex: 0,
      endIndex: 0,
      rightBoundaryIndex: 0,
      panOffset: 0,
      maxPanOffset: 0,
      capacity: 0,
      barStepRpx: 1
    };
  }
  const safeIndex = Math.max(0, Math.min(candles.length - 1, Number(currentIndex || 0)));
  const capacity = Math.max(1, Math.min(safeIndex + 1, getChartViewportCapacity(zoomKey)));
  const maxPanOffset = Math.max(0, safeIndex - capacity + 1);
  const safePanOffset = Math.max(0, Math.min(maxPanOffset, Math.round(Number(panOffset || 0))));
  const endIndex = Math.max(capacity - 1, safeIndex - safePanOffset);
  const startIndex = Math.max(0, endIndex - capacity + 1);
  const geometry = getChartGeometry(zoomKey);
  return {
    startIndex,
    endIndex,
    rightBoundaryIndex: safeIndex,
    panOffset: safePanOffset,
    maxPanOffset,
    capacity,
    barStepRpx: geometry.candleWidth + geometry.gap
  };
}

function buildRuntimeVisibleCandles(candles = [], viewport = {}) {
  if (!Array.isArray(candles) || !candles.length) return [];
  const startIndex = Math.max(0, Number(viewport.startIndex || 0));
  const endIndex = Math.max(startIndex, Number(viewport.endIndex || startIndex));
  return candles.slice(startIndex, endIndex + 1).map((item, index) => Object.assign({}, item, {
    runtimeIndex: startIndex + index
  }));
}

function normalizeInitialVisibleCount(value, totalCandles) {
  const total = Math.max(0, Number(totalCandles || 0));
  if (!total) return 0;
  const number = Number(value || 1);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.min(total, Math.round(number)));
}

function getInitialKlineVisibleCount(session = {}) {
  const candles = Array.isArray(session.candles) ? session.candles : [];
  if (!candles.length) return 0;
  const windowSize = Number(session.chartWindowSize || DEFAULT_VISIBLE_CANDLES);
  const safeWindowSize = Number.isFinite(windowSize) ? windowSize : DEFAULT_VISIBLE_CANDLES;
  const target = Math.max(72, Math.min(132, Math.floor(safeWindowSize * 0.8)));
  return Math.min(candles.length, target);
}

function getRuntimePrice(candle = {}) {
  const price = Number(candle.close || candle.c || candle.price || 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function normalizePositionState(state = {}) {
  return {
    side: state.side === "LONG" ? "LONG" : "FLAT",
    entryPrice: roundMetric(state.entryPrice, 4),
    positionSize: Number(state.positionSize || state.size || 0) > 0 ? 1 : 0,
    realizedPnl: roundMetric(state.realizedPnl),
    unrealizedPnl: roundMetric(state.unrealizedPnl),
    equity: roundMetric(state.equity || 100),
    peakEquity: roundMetric(state.peakEquity || 100),
    maxDrawdown: roundMetric(state.maxDrawdown)
  };
}

function markPositionToMarket(positionState = {}, candle = {}) {
  const price = getRuntimePrice(candle);
  const state = normalizePositionState(positionState);
  const unrealizedPnl = state.side === "LONG" && state.entryPrice > 0 && price > 0
    ? ((price - state.entryPrice) / state.entryPrice) * 100 * state.positionSize
    : 0;
  const equity = 100 + state.realizedPnl + unrealizedPnl;
  const peakEquity = Math.max(state.peakEquity || 100, equity);
  const maxDrawdown = Math.max(state.maxDrawdown || 0, peakEquity - equity);
  return Object.assign({}, state, {
    unrealizedPnl: roundMetric(unrealizedPnl),
    equity: roundMetric(equity),
    peakEquity: roundMetric(peakEquity),
    maxDrawdown: roundMetric(maxDrawdown)
  });
}

function executeSimulatedPosition(positionState = {}, decision = {}, candle = {}) {
  const action = String(decision.action || "HOLD").toUpperCase();
  const price = Number(decision.price || getRuntimePrice(candle));
  const state = markPositionToMarket(positionState, candle);
  if (!Number.isFinite(price) || price <= 0) return state;
  if (action === "BUY" && state.side !== "LONG") {
    return markPositionToMarket(Object.assign({}, state, {
      side: "LONG",
      entryPrice: price,
      positionSize: 1,
      unrealizedPnl: 0
    }), candle);
  }
  if (action === "SELL" && state.side === "LONG" && state.entryPrice > 0) {
    const realizedChange = ((price - state.entryPrice) / state.entryPrice) * 100 * state.positionSize;
    return markPositionToMarket(Object.assign({}, state, {
      side: "FLAT",
      entryPrice: 0,
      positionSize: 0,
      realizedPnl: roundMetric(state.realizedPnl + realizedChange),
      unrealizedPnl: 0
    }), candle);
  }
  return state;
}

function buildSessionMetrics(positionState = {}, decisions = []) {
  const state = normalizePositionState(positionState);
  const tradeDecisions = Array.isArray(decisions)
    ? decisions.filter((item) => item && item.action && item.action !== "HOLD")
    : [];
  return {
    positionSide: state.side,
    positionSize: state.positionSize,
    realizedPnl: state.realizedPnl,
    unrealizedPnl: state.unrealizedPnl,
    totalPnl: roundMetric(state.realizedPnl + state.unrealizedPnl),
    maxDrawdown: state.maxDrawdown,
    tradeCount: tradeDecisions.length
  };
}

function shouldRuntimeRequireDecision(currentIndex, decisionInterval) {
  const index = Number(currentIndex || 0);
  return index > 0 && index % normalizeDecisionInterval(decisionInterval) === 0;
}

function buildRuntimeState(baseRuntime = {}, patch = {}) {
  const runtime = Object.assign({}, baseRuntime, patch);
  const candles = Array.isArray(runtime.candles) ? runtime.candles : [];
  const safeIndex = candles.length
    ? Math.max(0, Math.min(candles.length - 1, Number(runtime.currentIndex || 0)))
    : 0;
  const zoomKey = runtime.chartZoomKey || "wide";
  const viewport = buildRuntimeViewport(candles, safeIndex, zoomKey, runtime.chartPanOffset);
  const visibleCandles = buildRuntimeVisibleCandles(candles, viewport);
  const activeCandle = candles[safeIndex] ? Object.assign({}, candles[safeIndex], { runtimeIndex: safeIndex }) : (visibleCandles[visibleCandles.length - 1] || null);
  const positionState = markPositionToMarket(runtime.positionState || {}, activeCandle || {});
  const hasDecisionForCurrentIndex = Number(runtime.lastDecisionIndex) === safeIndex;
  const mustDecide = !!runtime.lockedUntilDecision || (!hasDecisionForCurrentIndex && shouldRuntimeRequireDecision(safeIndex, runtime.decisionInterval));
  return Object.assign({}, runtime, {
    currentIndex: safeIndex,
    visibleCandles,
    activeCandle,
    chartViewport: viewport,
    chartPanOffset: viewport.panOffset,
    chartBoardStyle: getChartBoardStyle(visibleCandles.length, zoomKey),
    indicatorOverlay: buildIndicatorOverlay(visibleCandles, zoomKey, runtime.mainIndicatorKey || "ma"),
    indicatorPanel: buildIndicatorPanel(visibleCandles, runtime.indicatorPanelKey || "vol", zoomKey),
    positionState,
    sessionMetrics: buildSessionMetrics(positionState, runtime.decisionTimeline || []),
    mustDecide,
    lockedUntilDecision: mustDecide
  });
}

function startKlineTrainingRuntime(session = {}, options = {}) {
  const candles = Array.isArray(session.candles) ? session.candles : [];
  const initialVisibleCount = normalizeInitialVisibleCount(options.initialVisibleCount, candles.length);
  return buildRuntimeState({
    trainingSessionId: cleanEventText(options.trainingSessionId || `kline-session-${Date.now()}`, 160),
    simulationMode: "blind_step_replay",
    sliceSeed: cleanEventText(options.sliceSeed || ((session.historySlice || {}).seed) || "", 120),
    marketKey: ((session.market || {}).key) || "",
    timeframeKey: session.timeframeKey || "",
    chartZoomKey: session.chartZoomKey || "wide",
    mainIndicatorKey: options.initialMainIndicatorKey || session.defaultMainIndicatorKey || "ma",
    indicatorPanelKey: options.initialIndicatorKey || session.defaultIndicatorKey || "vol",
    decisionInterval: normalizeDecisionInterval(options.decisionInterval),
    currentIndex: Math.max(0, initialVisibleCount - 1),
    totalCandles: candles.length,
    candles,
    chartPanOffset: 0,
    chartViewport: null,
    decisionTimeline: [],
    emotionBadges: [],
    riskHints: [],
    coachHints: [],
    positionState: normalizePositionState(),
    sessionMetrics: buildSessionMetrics(),
    lastDecisionIndex: -1,
    lockedUntilDecision: false,
    blockedReason: ""
  });
}

function setKlineRuntimeIndicator(runtime = {}, indicatorKey = "vol") {
  return buildRuntimeState(runtime, {
    indicatorPanelKey: getIndicatorPanelMeta(indicatorKey).key
  });
}

function setKlineRuntimeMainIndicator(runtime = {}, indicatorKey = "ma") {
  return buildRuntimeState(runtime, {
    mainIndicatorKey: getMainIndicatorMeta(indicatorKey).key
  });
}

function setKlineRuntimeChartZoom(runtime = {}, chartZoomKey = "wide") {
  return buildRuntimeState(runtime, {
    chartZoomKey: getChartZoomMeta(chartZoomKey).key
  });
}

function setKlineRuntimeViewportPan(runtime = {}, panOffset = 0) {
  return buildRuntimeState(runtime, {
    chartPanOffset: panOffset
  });
}

function buildEmotionBadge(decision = {}) {
  const text = `${decision.action || ""} ${decision.reactionDirection || ""} ${decision.firstReaction || ""} ${decision.boundaryChoice || ""}`;
  if (/不甘|夺回|回本|扳回/.test(text)) return { type: "REVENGE", label: "不甘", text: "不顺后想立刻夺回节奏。" };
  if (/追|错过|贪|急|证明/.test(text) || decision.reactionDirection === "act") {
    return { type: "GREED", label: "追念", text: "想追上去时，先照见怕错过。" };
  }
  if (/怕|恐|割|退出|躲/.test(text) || decision.reactionDirection === "avoid") {
    return { type: "FEAR", label: "惧念", text: "想退出时，先分清事实与不安。" };
  }
  if (/犹豫|不敢|等确认/.test(text)) return { type: "HESITATION", label: "犹疑", text: "知而未行时，先看见停滞处。" };
  if (decision.action && decision.action !== "HOLD" && !decision.boundaryChoice) {
    return { type: "IMPULSE", label: "冲动", text: "无边界动作容易变成临场反应。" };
  }
  return null;
}

function buildRiskHint(emotionBadge = null) {
  const type = (emotionBadge || {}).type || "";
  if (type === "GREED") return { level: "medium", text: "出现追念：先停十秒，再回到原边界。" };
  if (type === "FEAR") return { level: "medium", text: "出现惧念：先看事实，再记录不安。" };
  if (type === "REVENGE") return { level: "high", text: "出现不甘：本轮只记录，不加重动作。" };
  if (type === "HESITATION") return { level: "low", text: "出现犹疑：写下知道却未行动的原因。" };
  if (type === "IMPULSE") return { level: "medium", text: "出现无边界动作：先补边界，再继续训练。" };
  return { level: "low", text: "继续只做训练记录，不作当下判断。" };
}

function buildCoachHint(decision = {}, emotionBadge = null) {
  const action = String(decision.action || "HOLD").toUpperCase();
  const label = (emotionBadge || {}).label || "观照";
  return {
    title: `${label}已记录`,
    text: action === "HOLD"
      ? "你先停下来观察，这一刻先守住了记录。"
      : "动作已经写入记录，下一步先停十秒，再看是否仍合边界。"
  };
}

function advanceKlineTrainingRuntime(runtime = {}) {
  if (runtime.lockedUntilDecision || runtime.mustDecide) {
    return Object.assign({}, runtime, {
      blockedReason: "decision_required",
      mustDecide: true,
      lockedUntilDecision: true
    });
  }
  const total = Number(runtime.totalCandles || (runtime.candles || []).length || 0);
  const nextIndex = Math.min(Math.max(0, total - 1), Number(runtime.currentIndex || 0) + 1);
  return buildRuntimeState(runtime, {
    currentIndex: nextIndex,
    chartPanOffset: 0,
    blockedReason: ""
  });
}

function recordKlineTrainingDecision(runtime = {}, decision = {}) {
  const activeCandle = runtime.activeCandle || (runtime.candles || [])[runtime.currentIndex] || {};
  const safeDecision = {
    id: `decision-${runtime.trainingSessionId || "local"}-${runtime.currentIndex}-${(runtime.decisionTimeline || []).length + 1}`,
    sessionId: runtime.trainingSessionId || "",
    index: Number(runtime.currentIndex || 0),
    action: String(decision.action || "HOLD").toUpperCase(),
    price: Number(activeCandle.close || 0),
    selectedCandleKey: cleanEventText(decision.selectedCandleKey || activeCandle.key || "", 80),
    reactionDirection: cleanEventText(decision.reactionDirection, 40),
    firstReaction: cleanEventText(decision.firstReaction, 160),
    boundaryChoice: cleanEventText(decision.boundaryChoice, 120),
    createdAt: decision.createdAt || Date.now()
  };
  const emotionBadge = buildEmotionBadge(safeDecision);
  const riskHint = buildRiskHint(emotionBadge);
  const coachHint = buildCoachHint(safeDecision, emotionBadge);
  const nextPositionState = executeSimulatedPosition(runtime.positionState || {}, safeDecision, activeCandle);
  const decisionWithPosition = Object.assign({}, safeDecision, {
    positionSize: nextPositionState.positionSize,
    pnl: roundMetric(nextPositionState.realizedPnl + nextPositionState.unrealizedPnl),
    drawdown: nextPositionState.maxDrawdown
  });
  return buildRuntimeState(runtime, {
    decisionTimeline: (runtime.decisionTimeline || []).concat([decisionWithPosition]),
    emotionBadges: emotionBadge ? (runtime.emotionBadges || []).concat([emotionBadge]) : (runtime.emotionBadges || []),
    riskHints: (runtime.riskHints || []).concat([riskHint]),
    coachHints: (runtime.coachHints || []).concat([coachHint]),
    positionState: nextPositionState,
    lastDecisionIndex: Number(runtime.currentIndex || 0),
    mustDecide: false,
    lockedUntilDecision: false,
    blockedReason: ""
  });
}

function buildKlineTrainingRecordPatch(runtime = {}) {
  const decisions = Array.isArray(runtime.decisionTimeline) ? runtime.decisionTimeline : [];
  const lastDecision = decisions[decisions.length - 1] || {};
  const activeCandle = runtime.activeCandle || (runtime.candles || [])[runtime.currentIndex] || {};
  return {
    trainingSessionId: cleanEventText(runtime.trainingSessionId, 160),
    simulationMode: cleanEventText(runtime.simulationMode || "blind_step_replay", 80),
    sliceSeed: cleanEventText(runtime.sliceSeed, 120),
    selectedCandleKey: cleanEventText(lastDecision.selectedCandleKey || activeCandle.key || "", 80),
    reactionDirection: cleanEventText(lastDecision.reactionDirection, 40),
    firstReaction: cleanEventText(lastDecision.firstReaction, 160),
    boundaryChoice: cleanEventText(lastDecision.boundaryChoice, 120),
    decisionTimeline: decisions,
    emotionBadges: Array.isArray(runtime.emotionBadges) ? runtime.emotionBadges : [],
    riskHints: Array.isArray(runtime.riskHints) ? runtime.riskHints : [],
    coachHints: Array.isArray(runtime.coachHints) ? runtime.coachHints : [],
    positionState: normalizePositionState(runtime.positionState || {}),
    sessionMetrics: buildSessionMetrics(runtime.positionState || {}, decisions)
  };
}

module.exports = {
  CHART_ZOOM_OPTIONS,
  INDICATOR_CATALOG,
  MAIN_INDICATOR_OPTIONS,
  INDICATOR_PANEL_OPTIONS,
  getChartZoomMeta,
  buildChartZoomOptions,
  normalizeHistoryCandles,
  getChartBoardStyle,
  buildIndicatorOverlay,
  buildIndicatorPanel,
  getInitialKlineVisibleCount,
  startKlineTrainingRuntime,
  advanceKlineTrainingRuntime,
  recordKlineTrainingDecision,
  setKlineRuntimeChartZoom,
  setKlineRuntimeViewportPan,
  setKlineRuntimeIndicator,
  setKlineRuntimeMainIndicator,
  buildKlineTrainingRecordPatch
};
