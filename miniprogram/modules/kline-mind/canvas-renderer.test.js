const assert = require("assert");
const {
  buildKlineMindSession,
  getInitialKlineVisibleCount,
  startKlineTrainingRuntime,
  setKlineRuntimeIndicator
} = require("./index");
const { buildKlineCanvasDrawModel } = require("./canvas-renderer");

function makeCandles(count = 18) {
  return Array.from({ length: count }, (_, index) => {
    const base = 10 + index * 0.04;
    const close = base + (index % 4 === 0 ? 0.18 : index % 3 === 0 ? -0.12 : 0.06);
    return {
      date: `2024-02-${String(index + 1).padStart(2, "0")}`,
      open: Number(base.toFixed(2)),
      high: Number((Math.max(base, close) + 0.18).toFixed(2)),
      low: Number((Math.min(base, close) - 0.16).toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: 1000 + index * 120
    };
  });
}

const session = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 1, title: "观入场冲动" },
  record: { marketKey: "cn_equity", timeframeKey: "1d", chartZoomKey: "wide" },
  historyCache: {
    cn_equity: {
      "1d": {
        source: "canvas-test",
        symbol: "000001.SZ",
        candles: makeCandles()
      }
    }
  }
});

const runtime = setKlineRuntimeIndicator(
  startKlineTrainingRuntime(session, {
    trainingSessionId: "canvas-renderer-test",
    initialVisibleCount: getInitialKlineVisibleCount(session),
    initialMainIndicatorKey: "ma",
    initialIndicatorKey: "macd"
  }),
  "macd"
);

const model = buildKlineCanvasDrawModel(runtime, {
  width: 690,
  mainHeight: 336,
  indicatorHeight: 104
});
const crosshairModel = buildKlineCanvasDrawModel(runtime, {
  width: 690,
  mainHeight: 336,
  indicatorHeight: 104,
  crosshairVisible: true,
  crosshairX: 345
});

assert.strictEqual(model.main.width, 690);
assert.strictEqual(model.main.height, 336);
assert.strictEqual(model.indicator.height, 104);

const candleCommands = model.main.commands.filter((item) => item.type === "candle");
assert.strictEqual(candleCommands.length, runtime.visibleCandles.length);
assert.ok(model.main.commands.some((item) => item.type === "grid-line"));
assert.ok(model.main.commands.some((item) => item.type === "line-segment" && item.series === "ma5"));
assert.ok(model.indicator.commands.some((item) => item.type === "indicator-bar"));
assert.ok(model.indicator.commands.some((item) => item.type === "line-segment" && item.series === "dif"));
assert.ok(model.main.priceAxis && model.main.priceAxis.labels.length >= 3, "main chart should expose readable price-axis labels");
assert.ok(model.main.commands.some((item) => item.type === "price-label"), "main chart should draw price labels through canvas commands");
model.main.priceAxis.labels.forEach((label) => {
  assert.ok(Number.isFinite(label.y), "price axis label y should be finite");
  assert.ok(String(label.text || "").length > 0, "price axis label text should be readable");
});
assert.ok(model.main.timeAxis && model.main.timeAxis.labels.length >= 2, "main chart should expose readable time-axis labels");
assert.ok(model.main.commands.some((item) => item.type === "time-label"), "main chart should draw time labels through canvas commands");
model.main.timeAxis.labels.forEach((label) => {
  assert.ok(Number.isFinite(label.x), "time axis label x should be finite");
  assert.ok(String(label.text || "").length > 0, "time axis label text should be readable");
});

assert.ok(crosshairModel.main.crosshair && crosshairModel.main.crosshair.visible, "crosshair should be resolved when requested");
assert.ok(crosshairModel.main.crosshair.tooltip, "crosshair should expose an OHLCV tooltip payload");
["date", "open", "high", "low", "close", "volume"].forEach((field) => {
  assert.ok(
    String(crosshairModel.main.crosshair.tooltip[field] || "").length > 0,
    `crosshair tooltip should include ${field}`
  );
});
assert.ok(
  crosshairModel.main.commands.some((item) => item.type === "crosshair-line" && item.axis === "vertical"),
  "crosshair should draw a vertical guide line"
);
assert.ok(
  crosshairModel.main.commands.some((item) => item.type === "crosshair-line" && item.axis === "horizontal"),
  "crosshair should draw a horizontal guide line"
);
assert.ok(
  crosshairModel.indicator.crosshair && crosshairModel.indicator.crosshair.visible,
  "indicator panel should receive linked crosshair state"
);
assert.ok(
  crosshairModel.indicator.commands.some((item) => item.type === "volume-guide"),
  "indicator panel should draw a linked volume guide for the selected candle"
);

for (const command of model.main.commands.concat(model.indicator.commands)) {
  for (const key of ["x", "x1", "x2", "y", "y1", "y2", "top", "height", "width"]) {
    if (Object.prototype.hasOwnProperty.call(command, key)) {
      assert.ok(Number.isFinite(command[key]), `${command.type}.${key} should be finite`);
    }
  }
}

for (const candle of candleCommands) {
  assert.ok(candle.x >= 0 && candle.x <= model.main.width);
  assert.ok(candle.highY >= 0 && candle.highY <= model.main.height);
  assert.ok(candle.lowY >= 0 && candle.lowY <= model.main.height);
  assert.ok(candle.bodyHeight > 0);
}

console.log("kline canvas renderer tests passed");
