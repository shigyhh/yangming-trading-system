const { getAssessmentResult, saveKlineScenarioState } = require("../../utils/store");
const {
  MARKET_PRESETS,
  TIMEFRAME_PRESETS,
  getKlineRecommendationForMirror,
  getKlineScenarios
} = require("../../modules/kline-simulator/index");

Page({
  data: {
    assessment: {},
    scenarios: [],
    markets: MARKET_PRESETS,
    timeframes: TIMEFRAME_PRESETS,
    marketKey: "cn",
    timeframeKey: "1d",
    recommendation: getKlineRecommendationForMirror("")
  },

  onLoad(options = {}) {
    const patch = {};
    if (options.market) patch.marketKey = options.market;
    if (options.timeframe) patch.timeframeKey = options.timeframe;
    if (options.sceneId) patch.preferredSceneId = options.sceneId;
    if (Object.keys(patch).length) this.setData(patch);
  },

  onShow() {
    this.refreshScenarios();
  },

  refreshScenarios() {
    const assessment = getAssessmentResult() || {};
    const recommendation = getKlineRecommendationForMirror(assessment.primaryMirror || assessment.primary, {
      marketKey: this.data.marketKey,
      timeframeKey: this.data.timeframeKey
    });
    const scenarios = getKlineScenarios({
      marketKey: this.data.marketKey,
      timeframeKey: this.data.timeframeKey
    }).map((scene) => Object.assign({}, scene, {
      recommended: scene.id === (this.data.preferredSceneId || recommendation.sceneId),
      statusText: scene.id === (this.data.preferredSceneId || recommendation.sceneId) ? "推荐" : `Day ${scene.trainingDay}`
    })).sort((left, right) => {
      if (left.recommended && !right.recommended) return -1;
      if (!left.recommended && right.recommended) return 1;
      return Number(left.trainingDay || 0) - Number(right.trainingDay || 0);
    });
    saveKlineScenarioState(scenarios);
    this.setData({
      assessment,
      recommendation,
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

  startRecommended() {
    const recommendation = this.data.recommendation || {};
    wx.navigateTo({ url: recommendation.path || `/pages/kline-session/index?market=${this.data.marketKey}&timeframe=${this.data.timeframeKey}` });
  },

  goReport() {
    wx.navigateTo({ url: "/pages/report/index" });
  },

  goTradeReview() {
    wx.navigateTo({ url: `/pages/trade-review/index?market=${this.data.marketKey}&timeframe=${this.data.timeframeKey}` });
  }
});
