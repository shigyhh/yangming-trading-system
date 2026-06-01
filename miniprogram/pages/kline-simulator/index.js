const { getAssessmentResult, saveKlineScenarioState } = require("../../utils/store");
const {
  MARKET_PRESETS,
  TIMEFRAME_PRESETS,
  getKlineScenarios
} = require("../../modules/kline-simulator/index");

Page({
  data: {
    assessment: {},
    scenarios: [],
    markets: MARKET_PRESETS,
    timeframes: TIMEFRAME_PRESETS,
    marketKey: "cn",
    timeframeKey: "1d"
  },

  onLoad(options = {}) {
    const patch = {};
    if (options.market) patch.marketKey = options.market;
    if (options.timeframe) patch.timeframeKey = options.timeframe;
    if (Object.keys(patch).length) this.setData(patch);
  },

  onShow() {
    this.refreshScenarios();
  },

  refreshScenarios() {
    const scenarios = getKlineScenarios({
      marketKey: this.data.marketKey,
      timeframeKey: this.data.timeframeKey
    });
    saveKlineScenarioState(scenarios);
    this.setData({
      assessment: getAssessmentResult() || {},
      scenarios
    });
  },

  selectMarket(e) {
    const marketKey = e.currentTarget.dataset.key;
    if (!marketKey || marketKey === this.data.marketKey) return;
    this.setData({ marketKey }, this.refreshScenarios);
  },

  selectTimeframe(e) {
    const timeframeKey = e.currentTarget.dataset.key;
    if (!timeframeKey || timeframeKey === this.data.timeframeKey) return;
    this.setData({ timeframeKey }, this.refreshScenarios);
  },

  startScene(e) {
    const sceneId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/kline-session/index?sceneId=${sceneId}&market=${this.data.marketKey}&timeframe=${this.data.timeframeKey}` });
  },

  goReport() {
    wx.navigateTo({ url: "/pages/report/index" });
  },

  goTradeReview() {
    wx.navigateTo({ url: `/pages/trade-review/index?market=${this.data.marketKey}&timeframe=${this.data.timeframeKey}` });
  }
});
