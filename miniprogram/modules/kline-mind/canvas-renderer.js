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

function formatPriceLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  if (Math.abs(number) >= 1000) return number.toFixed(0);
  if (Math.abs(number) >= 100) return number.toFixed(1);
  return number.toFixed(2);
}

function formatVolumeLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  if (Math.abs(number) >= 100000000) return `${(number / 100000000).toFixed(2)}亿`;
  if (Math.abs(number) >= 10000) return `${(number / 10000).toFixed(1)}万`;
  return number.toFixed(0);
}

function formatSignedPriceLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  if (Math.abs(number) < 0.005) return "0.00";
  return `${number > 0 ? "+" : ""}${formatPriceLabel(number)}`;
}

function formatPercentLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00%";
  if (Math.abs(number) < 0.005) return "0.00%";
  return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function collectPriceValues(candles = []) {
  return candles.reduce((values, candle) => {
    ["open", "high", "low", "close"].forEach((field) => {
      const value = Number(candle[field]);
      if (Number.isFinite(value)) values.push(value);
    });
    return values;
  }, []);
}

function buildPriceAxis(candles = [], metrics = {}) {
  const values = collectPriceValues(candles);
  if (!values.length) return { min: null, max: null, labels: [], commands: [] };
  const max = Math.max.apply(null, values);
  const min = Math.min.apply(null, values);
  const range = Math.max(0.0001, max - min);
  const labelCount = 4;
  const labels = Array.from({ length: labelCount }, (_, index) => {
    const ratio = labelCount === 1 ? 0 : index / (labelCount - 1);
    const value = max - range * ratio;
    const y = metrics.plotTop + (metrics.plotBottom - metrics.plotTop) * ratio;
    return {
      value,
      text: formatPriceLabel(value),
      x: metrics.width - 10,
      y: clamp(y, 12, metrics.mainHeight - 8)
    };
  });
  return {
    min,
    max,
    labels,
    commands: labels.map((label) => ({
      type: "price-label",
      key: `price-${label.text}-${Math.round(label.y)}`,
      text: label.text,
      x: label.x,
      y: label.y,
      color: "rgba(244, 235, 221, 0.5)"
    }))
  };
}

function formatTimeLabel(candle = {}) {
  const raw = String(candle.date || candle.label || candle.time || candle.key || "").trim();
  if (!raw) return "";
  const dateMatch = raw.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (dateMatch) return `${dateMatch[2]}-${dateMatch[3]}`;
  const compactMatch = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) return `${compactMatch[2]}-${compactMatch[3]}`;
  return raw.length > 8 ? raw.slice(-8) : raw;
}

function pickTimeAxisIndexes(count) {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const indexes = [0, Math.floor((count - 1) / 2), count - 1];
  return Array.from(new Set(indexes));
}

function buildTimeAxis(candles = [], candleCommands = [], metrics = {}) {
  const labels = pickTimeAxisIndexes(candles.length).map((index) => {
    const command = candleCommands[index] || {};
    const text = formatTimeLabel(candles[index]);
    return {
      index,
      text,
      x: clamp(Number(command.x || 0), metrics.paddingX, metrics.width - metrics.paddingX),
      y: metrics.mainHeight - 8
    };
  }).filter((label) => label.text);
  return {
    labels,
    commands: labels.map((label) => ({
      type: "time-label",
      key: `time-${label.index}-${label.text}`,
      text: label.text,
      x: label.x,
      y: label.y,
      color: "rgba(244, 235, 221, 0.42)"
    }))
  };
}

function findCrosshairIndex(candleCommands = [], options = {}) {
  if (!candleCommands.length) return -1;
  const explicitIndex = Number(options.crosshairIndex);
  if (Number.isFinite(explicitIndex)) {
    return Math.max(0, Math.min(candleCommands.length - 1, Math.round(explicitIndex)));
  }
  const x = Number(options.crosshairX);
  if (!Number.isFinite(x)) return candleCommands.length - 1;
  return candleCommands.reduce((nearestIndex, command, index) => {
    const nearest = candleCommands[nearestIndex] || {};
    return Math.abs(Number(command.x || 0) - x) < Math.abs(Number(nearest.x || 0) - x)
      ? index
      : nearestIndex;
  }, 0);
}

function resolveCloseY(candleCommand = {}) {
  const close = Number(candleCommand.close);
  const open = Number(candleCommand.open);
  if (!Number.isFinite(close) || !Number.isFinite(open)) {
    return clamp(Number(candleCommand.bodyTop || 0) + Number(candleCommand.bodyHeight || 0) / 2, 0, 9999);
  }
  if (close > open) return candleCommand.bodyTop;
  if (close < open) return candleCommand.bodyTop + candleCommand.bodyHeight;
  return candleCommand.bodyTop + candleCommand.bodyHeight / 2;
}

function buildCrosshairReadout(candles = [], index = 0) {
  const candle = candles[index] || {};
  const previous = candles[index - 1] || null;
  const open = Number(candle.open);
  const high = Number(candle.high);
  const low = Number(candle.low);
  const close = Number(candle.close);
  const previousClose = Number((previous || {}).close);
  const base = Number.isFinite(previousClose) && previousClose > 0
    ? previousClose
    : Number.isFinite(open) && open > 0 ? open : close;
  const change = Number.isFinite(close) && Number.isFinite(base) ? close - base : 0;
  const changePct = Number.isFinite(base) && base !== 0 ? change / base * 100 : 0;
  const amplitude = Number.isFinite(high) && Number.isFinite(low) && Number.isFinite(base) && base !== 0
    ? (high - low) / base * 100
    : 0;
  return {
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    change: formatSignedPriceLabel(change),
    changePct: formatPercentLabel(changePct),
    amplitude: `${Math.max(0, amplitude).toFixed(2)}%`,
    volume: formatVolumeLabel(candle.volume)
  };
}

function buildCrosshair(candleCommands = [], candles = [], metrics = {}, options = {}) {
  if (!options.crosshairVisible || !candleCommands.length) {
    return { visible: false, commands: [] };
  }
  const index = findCrosshairIndex(candleCommands, options);
  const command = candleCommands[index];
  const candle = candles[index] || {};
  if (!command) return { visible: false, commands: [] };
  const x = clamp(Number(command.x || 0), 0, metrics.width);
  const y = clamp(resolveCloseY(command), metrics.plotTop, metrics.plotBottom);
  const tooltipWidth = 232;
  const tooltipLeft = x > metrics.width * 0.58
    ? Math.max(14, x - tooltipWidth - 16)
    : Math.min(metrics.width - tooltipWidth - 14, x + 16);
  const tooltipTop = y > metrics.mainHeight * 0.55 ? 18 : Math.min(metrics.mainHeight - 138, y + 16);
  return {
    visible: true,
    index,
    key: command.key || candle.key || `crosshair-${index}`,
    x,
    y,
    tooltipLeft,
    tooltipTop,
    tooltip: {
      date: candle.date || candle.label || candle.key || `第 ${index + 1} 根`,
      open: formatPriceLabel(candle.open),
      high: formatPriceLabel(candle.high),
      low: formatPriceLabel(candle.low),
      close: formatPriceLabel(candle.close),
      volume: formatVolumeLabel(candle.volume),
      indexText: `${index + 1}/${candles.length}`
    },
    readout: buildCrosshairReadout(candles, index),
    commands: [
      {
        type: "crosshair-line",
        axis: "vertical",
        x1: x,
        y1: metrics.plotTop,
        x2: x,
        y2: metrics.plotBottom,
        color: "rgba(244, 235, 221, 0.42)",
        lineWidth: 1
      },
      {
        type: "crosshair-line",
        axis: "horizontal",
        x1: metrics.paddingX,
        y1: y,
        x2: metrics.width - metrics.paddingX,
        y2: y,
        color: "rgba(244, 235, 221, 0.34)",
        lineWidth: 1
      }
    ]
  };
}

function buildIndicatorCrosshair(crosshair = {}, indicatorCommands = [], metrics = {}) {
  if (!crosshair.visible) return { visible: false, commands: [] };
  const bars = indicatorCommands.filter((item) => item.type === "indicator-bar");
  const bar = bars[crosshair.index] || null;
  const x = clamp(Number((bar || {}).x || crosshair.x || 0), 0, metrics.width);
  const volumeTop = Number.isFinite(Number((bar || {}).top)) ? Number(bar.top) : 0;
  const volumeHeight = Math.max(0, Number((bar || {}).height || 0));
  return {
    visible: true,
    index: crosshair.index,
    x,
    commands: [
      {
        type: "volume-guide",
        key: `volume-guide-${crosshair.index}`,
        x1: x,
        y1: 0,
        x2: x,
        y2: metrics.indicatorHeight,
        top: volumeTop,
        height: volumeHeight,
        color: "rgba(216, 183, 111, 0.5)",
        lineWidth: 1
      }
    ]
  };
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
  const candleCommands = buildCandleCommands(candles, {
    width: metrics.width,
    height: metrics.mainHeight,
    paddingX: metrics.paddingX,
    plotTop: metrics.plotTop,
    plotBottom: metrics.plotBottom,
    bodyWidth: metrics.bodyWidth
  });
  const priceAxis = buildPriceAxis(candles, metrics);
  const timeAxis = buildTimeAxis(candles, candleCommands, metrics);
  const crosshair = buildCrosshair(candleCommands, candles, metrics, options);
  const mainCommands = [
    ...buildGridCommands(metrics.width, metrics.mainHeight, { rows: 8, columns: 14 }),
    ...buildLineCommands(runtimeView.indicatorOverlay || {}, MAIN_OVERLAY_COLORS, metrics.plotTop),
    ...candleCommands,
    ...priceAxis.commands,
    ...timeAxis.commands,
    ...crosshair.commands
  ];

  const indicatorPanel = runtimeView.indicatorPanel || {};
  const baseIndicatorCommands = indicatorPanel.visible === false
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
  const indicatorCrosshair = buildIndicatorCrosshair(crosshair, baseIndicatorCommands, metrics);
  const indicatorCommands = baseIndicatorCommands.concat(indicatorCrosshair.commands);

  return {
    main: {
      width: metrics.width,
      height: metrics.mainHeight,
      priceAxis,
      timeAxis,
      crosshair,
      commands: mainCommands
    },
    indicator: {
      width: metrics.width,
      height: metrics.indicatorHeight,
      type: indicatorPanel.type || "vol",
      label: indicatorPanel.label || "",
      visible: indicatorPanel.visible !== false,
      crosshair: indicatorCrosshair,
      commands: indicatorCommands
    }
  };
}

module.exports = {
  buildKlineCanvasDrawModel,
  parseRpxStyle
};
