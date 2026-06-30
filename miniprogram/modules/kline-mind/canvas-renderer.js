const MAIN_OVERLAY_COLORS = {
  ma5: "rgba(235, 217, 78, 0.92)",
  ma10: "rgba(190, 76, 215, 0.86)",
  ma20: "rgba(234, 238, 116, 0.78)",
  bollUpper: "rgba(58, 210, 105, 0.76)",
  bollLower: "rgba(58, 210, 105, 0.76)"
};

const INDICATOR_LINE_COLORS = {
  dif: "rgba(235, 217, 78, 0.9)",
  dea: "rgba(190, 76, 215, 0.86)",
  rsi: "rgba(235, 217, 78, 0.9)",
  k: "rgba(235, 217, 78, 0.9)",
  d: "rgba(190, 76, 215, 0.86)",
  j: "rgba(54, 214, 204, 0.86)",
  upper: "rgba(58, 210, 105, 0.76)",
  lower: "rgba(58, 210, 105, 0.76)",
  mid: "rgba(234, 238, 116, 0.76)"
};

const TONE_COLORS = {
  gold: "rgba(225, 62, 56, 0.92)",
  jade: "rgba(54, 214, 204, 0.9)",
  ash: "rgba(144, 132, 112, 0.62)",
  flat: "rgba(214, 224, 218, 0.58)"
};

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  const number = toFiniteNumber(value, min);
  return Math.max(min, Math.min(max, number));
}

function parseRpxStyle(style = "") {
  const result = {};
  String(style || "").split(";").forEach((part) => {
    const [rawKey, rawValue] = part.split(":");
    if (!rawKey || !rawValue) return;
    const key = rawKey.trim();
    const value = rawValue.trim();
    const numberMatch = value.match(/-?\d+(?:\.\d+)?/);
    if (numberMatch) result[key] = Number(numberMatch[0]);
  });
  const rotateMatch = String(style || "").match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
  if (rotateMatch) result.rotate = Number(rotateMatch[1]);
  return result;
}

function readCssVar(style = "", varName, fallback) {
  const pattern = new RegExp(`${varName}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)rpx`);
  const match = String(style || "").match(pattern);
  return match ? Number(match[1]) : fallback;
}

function buildGridCommands(width, height, options = {}) {
  const rows = Math.max(1, Number(options.rows || 4));
  const columns = Math.max(1, Number(options.columns || 12));
  const commands = [];
  for (let index = 1; index < rows; index += 1) {
    const y = Math.round((height / rows) * index);
    commands.push({
      type: "grid-line",
      axis: "x",
      x1: 0,
      y1: y,
      x2: width,
      y2: y,
      color: options.rowColor || "rgba(128, 36, 28, 0.2)",
      lineWidth: 1
    });
  }
  for (let index = 1; index < columns; index += 1) {
    const x = Math.round((width / columns) * index);
    commands.push({
      type: "grid-line",
      axis: "y",
      x1: x,
      y1: 0,
      x2: x,
      y2: height,
      color: options.columnColor || "rgba(50, 112, 96, 0.12)",
      lineWidth: 1
    });
  }
  return commands;
}

function buildXScale(count, width, paddingX) {
  const safeCount = Math.max(1, Number(count || 1));
  const left = Number(paddingX || 18);
  const right = width - left;
  if (safeCount === 1) return () => width / 2;
  const step = (right - left) / (safeCount - 1);
  return (index) => left + step * index;
}

function buildCandleCommands(candles = [], metrics = {}) {
  const width = metrics.width;
  const height = metrics.height;
  const plotTop = metrics.plotTop;
  const plotBottom = metrics.plotBottom;
  const bodyWidth = metrics.bodyWidth;
  const xForIndex = buildXScale(candles.length, width, metrics.paddingX);

  return candles.map((candle, index) => {
    const wickStyle = parseRpxStyle(candle.wickStyle);
    const bodyStyle = parseRpxStyle(candle.bodyStyle);
    const x = xForIndex(index);
    const highY = clamp(plotTop + toFiniteNumber(wickStyle.top, 0), 0, height);
    const lowY = clamp(highY + toFiniteNumber(wickStyle.height, plotBottom - highY), 0, height);
    const bodyTop = clamp(plotTop + toFiniteNumber(bodyStyle.top, toFiniteNumber(wickStyle.top, 0)), 0, height);
    const bodyHeight = clamp(toFiniteNumber(bodyStyle.height, 2), 2, height - bodyTop);
    return {
      type: "candle",
      key: candle.key || `candle-${index}`,
      tone: candle.tone || "flat",
      color: TONE_COLORS[candle.tone] || TONE_COLORS.flat,
      selected: !!candle.selected,
      focus: !!candle.focus,
      x,
      highY,
      lowY,
      bodyTop,
      bodyHeight,
      bodyWidth,
      open: toFiniteNumber(candle.open),
      high: toFiniteNumber(candle.high),
      low: toFiniteNumber(candle.low),
      close: toFiniteNumber(candle.close),
      volume: toFiniteNumber(candle.volume)
    };
  });
}

function styleSegmentToCommand(segment, series, color, offsetY = 0) {
  const style = parseRpxStyle(segment && segment.style);
  const x1 = toFiniteNumber(style.left, 0);
  const y1 = toFiniteNumber(style.top, 0) + offsetY;
  const width = Math.max(0, toFiniteNumber(style.width, 0));
  const rotate = toFiniteNumber(style.rotate, 0) * Math.PI / 180;
  return {
    type: "line-segment",
    key: (segment && segment.key) || `${series}-${x1}-${y1}`,
    series,
    color,
    lineWidth: series && String(series).startsWith("boll") ? 1 : 2,
    x1,
    y1,
    x2: x1 + Math.cos(rotate) * width,
    y2: y1 + Math.sin(rotate) * width,
    width
  };
}

function buildLineCommands(lines = {}, colors = {}, offsetY = 0) {
  return Object.keys(lines || {}).flatMap((series) => {
    const segments = Array.isArray(lines[series]) ? lines[series] : [];
    return segments.map((segment) => styleSegmentToCommand(
      segment,
      series,
      colors[series] || "rgba(244, 235, 221, 0.72)",
      offsetY
    ));
  });
}

function buildIndicatorBarCommands(items = [], metrics = {}) {
  const xForIndex = buildXScale(items.length, metrics.width, metrics.paddingX);
  const bodyWidth = metrics.bodyWidth;
  const bottomY = metrics.height - metrics.paddingBottom;

  return items.map((item, index) => {
    const style = parseRpxStyle(item.barStyle);
    const height = clamp(toFiniteNumber(style.height, 2), 2, metrics.height);
    const top = Number.isFinite(style.top)
      ? clamp(style.top, 0, metrics.height - 1)
      : clamp(bottomY - height, 0, metrics.height - 1);
    return {
      type: "indicator-bar",
      key: item.key || `bar-${index}`,
      tone: item.tone || "flat",
      color: TONE_COLORS[item.tone] || TONE_COLORS.flat,
      x: xForIndex(index),
      top,
      height,
      width: bodyWidth
    };
  });
}

function normalizeMetrics(runtimeView = {}, options = {}) {
  const width = Math.max(240, toFiniteNumber(options.width, 690));
  const mainHeight = Math.max(180, toFiniteNumber(options.mainHeight, 336));
  const indicatorHeight = Math.max(72, toFiniteNumber(options.indicatorHeight, 104));
  const candleCount = Math.max(1, (runtimeView.visibleCandles || []).length);
  const chartBoardStyle = runtimeView.chartBoardStyle || "";
  const bodyWidth = readCssVar(
    chartBoardStyle,
    "--kline-body-width",
    clamp(width / (candleCount * 2.4), 2, 12)
  );

  return {
    width,
    mainHeight,
    indicatorHeight,
    paddingX: 18,
    plotTop: 24,
    plotBottom: mainHeight - 18,
    bodyWidth: clamp(bodyWidth, 2, 18),
    indicatorPaddingBottom: 12
  };
}

function buildKlineCanvasDrawModel(runtimeView = {}, options = {}) {
  const metrics = normalizeMetrics(runtimeView, options);
  const candles = Array.isArray(runtimeView.visibleCandles) ? runtimeView.visibleCandles : [];
  const mainCommands = [
    ...buildGridCommands(metrics.width, metrics.mainHeight, { rows: 8, columns: 14 }),
    ...buildLineCommands(runtimeView.indicatorOverlay || {}, MAIN_OVERLAY_COLORS, metrics.plotTop),
    ...buildCandleCommands(candles, {
      width: metrics.width,
      height: metrics.mainHeight,
      paddingX: metrics.paddingX,
      plotTop: metrics.plotTop,
      plotBottom: metrics.plotBottom,
      bodyWidth: metrics.bodyWidth
    })
  ];

  const indicatorPanel = runtimeView.indicatorPanel || {};
  const indicatorCommands = indicatorPanel.visible === false
    ? []
    : [
      ...buildGridCommands(metrics.width, metrics.indicatorHeight, { rows: 3, columns: 14 }),
      ...buildLineCommands(indicatorPanel.lines || {}, INDICATOR_LINE_COLORS, 0),
      ...buildIndicatorBarCommands(indicatorPanel.items || [], {
        width: metrics.width,
        height: metrics.indicatorHeight,
        paddingX: metrics.paddingX,
        paddingBottom: metrics.indicatorPaddingBottom,
        bodyWidth: metrics.bodyWidth
      })
    ];

  return {
    main: {
      width: metrics.width,
      height: metrics.mainHeight,
      commands: mainCommands
    },
    indicator: {
      width: metrics.width,
      height: metrics.indicatorHeight,
      type: indicatorPanel.type || "vol",
      label: indicatorPanel.label || "",
      visible: indicatorPanel.visible !== false,
      commands: indicatorCommands
    }
  };
}

module.exports = {
  buildKlineCanvasDrawModel,
  parseRpxStyle
};
