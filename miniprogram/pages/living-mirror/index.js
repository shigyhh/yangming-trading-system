const {
  getTraining7State,
  getKlineReviewReports,
  getAssessmentResult,
  getMiniLoopProgress,
  getTradeReviewRecords,
  saveLivingMirrorStatsFromReviews,
  getTrainingPrescription,
  getEvidenceSummary,
  getUnifiedJourneyView,
  getKlineMindRecords,
  getKlineSessionRecords
} = require("../../utils/store");
const { pullTrainingPrescription } = require("../../utils/api");
const { buildTraining7View } = require("../../modules/training7/index");
const { buildKlineDayRetestComparison, getKlineRecommendationForMirror } = require("../../modules/kline-simulator/index");
const { buildLivingMirrorTree } = require("../../modules/mini-loop/index");

function encodeQuery(params = {}) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && String(params[key]).trim() !== "")
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join("&");
}

function buildKlineMindRecommendationPath(recommendation = {}) {
  const query = encodeQuery({
    sourceType: "special_training",
    source_type: "special_training",
    errorType: recommendation.errorType || recommendation.error_type || recommendation.title || recommendation.mirrorName,
    error_type: recommendation.error_type || recommendation.errorType || recommendation.title || recommendation.mirrorName,
    trainingPackTitle: recommendation.title,
    training_pack_title: recommendation.title,
    sceneId: recommendation.sceneId,
    scene_id: recommendation.sceneId,
    marketKey: recommendation.marketKey || recommendation.market,
    market: recommendation.marketKey || recommendation.market,
    timeframeKey: recommendation.timeframeKey || recommendation.timeframe,
    timeframe: recommendation.timeframeKey || recommendation.timeframe,
    symbol: recommendation.symbol
  });
  return `/pages/kline-mind/index?${query}`;
}

function buildReviewTop3View(stats = {}) {
  const total = Number(stats.totalReviews || 0);
  return {
    windowDays: 30,
    total,
    summary: total
      ? `最近 ${total} 条真实复盘里，反复出现的是「${stats.topMistakeText || "待补充"}」。`
      : "完成第一条真实复盘后，这里会沉淀重复念头。",
    topErrors: stats.topMistakes || [],
    topFirstThoughts: stats.topFirstThoughts || [],
    topTriggerScenes: stats.topTriggerScenes || [],
    nextRule: stats.nextActionText || "先记录，再行动"
  };
}

function buildServerLivingMirrorProfile(stats = {}) {
  return {
    statusText: Number(stats.totalReviews || 0) ? "本地已生成" : "待第一条复盘",
    totalEvents: Number(stats.totalReviews || 0),
    dominantReaction: stats.currentMirror || "待照见",
    repeatedThoughts: (stats.topFirstThoughts || []).map((item) => item.label).slice(0, 3),
    latestBoundaryState: stats.executionConsistencyRateText || "样本不足",
    fallbackText: "本地活镜摘要",
    updatedAt: stats.updatedAt ? "刚刚更新" : "待更新"
  };
}

function buildGrowthSummary(stats = {}, training7View = {}) {
  if (!Number(stats.totalReviews || 0)) return null;
  return {
    stageText: stats.currentMirror || "待照见",
    totalEventsText: `${stats.totalReviews || 0} 次`,
    topThoughtText: stats.topFirstThoughtText || "待记录",
    completedDaysText: `Day ${training7View.currentDay || 1}`,
    zhixingText: stats.executionConsistencyRateText || "样本不足",
    nextActionText: stats.mainTraining || "把第一念记录下来。",
    updatedAtText: "刚刚"
  };
}

Page({
  data: {
    stats: {
      assistantHandoff: {},
      mirrorTrendRows: [],
      recentThree: [],
      topTriggerScenes: [],
      triggerSceneEmptyText: "暂无足够触发场景样本。",
      topMistakeText: "待补充",
      topFirstThoughtText: "待记录",
      nextActionText: "先记录，再行动",
      executionConsistency: {
        rateText: "样本不足",
        deviationCount: 0,
        oldIssueRepeatCount: 0,
        topDeviationTypeText: "样本不足",
        topFirstThoughtText: "待记录"
      },
      executionConsistencyRateText: "样本不足",
      executionDeviationText: "0 次",
      oldIssueRepeatText: "0 次",
      topDeviationTypeText: "样本不足",
      weeklyReport: {
        hasStats: false,
        weekRangeText: "",
        total: 0,
        topMistakeText: "样本不足",
        topFirstThoughtText: "样本不足",
        executionConsistencyRateText: "样本不足",
        oldIssueRepeatText: "样本不足",
        progressText: "样本不足",
        nextWeekPlans: [],
        emptyText: "样本不足，先完成一次真实复盘和一次针对训练。",
        nextWeekPlanEmptyText: "样本不足，先完成一次真实复盘和一次针对训练。"
      },
      zhixingStability: {},
      tripleReflection: {}
    },
    zhixingStability: {
      totalText: "--",
      level: "待照见",
      dimensions: []
    },
    tripleReflection: {
      stateLabel: "待入镜",
      rows: []
    },
    klineRecommendation: getKlineRecommendationForMirror(""),
    klineDayRetest: buildKlineDayRetestComparison(getKlineReviewReports()),
    mirrorTree: buildLivingMirrorTree({}),
    serverPrescription: getTrainingPrescription() || {},
    prescriptionStatusText: "待接收",
    evidenceSummary: getEvidenceSummary({ limit: 6 }),
    evidenceRows: [],
    unifiedJourneyView: getUnifiedJourneyView(),
    miniLoopProgress: getMiniLoopProgress(),
    training7View: buildTraining7View(getTraining7State(), {}),
    hasRecords: false,
    showMirrorDepth: false,
    reviewTop3: buildReviewTop3View({}),
    serverLivingMirrorProfile: buildServerLivingMirrorProfile({}),
    growthSummary: null
  },

  onShow() {
    this.refreshStats();
  },

  refreshStats() {
    const klineReviewReports = getKlineReviewReports();
    const tradeReviewState = Object.assign({}, getTradeReviewRecords(), {
      klineMindRecords: getKlineMindRecords(),
      klineSessionRecords: getKlineSessionRecords(),
      klineReviewReports
    });
    const stats = saveLivingMirrorStatsFromReviews(tradeReviewState);
    const zhixingStability = stats.zhixingStability || {};
    const tripleReflection = stats.tripleReflection || {};
    const miniLoopProgress = getMiniLoopProgress();
    const evidenceSummary = getEvidenceSummary({ limit: 6 });
    const training7View = buildTraining7View(getTraining7State(), {});
    const latest = (tradeReviewState || {}).latest || {};
    const klineRecommendation = getKlineRecommendationForMirror(stats.currentMirror, {
      marketKey: latest.marketKey || "cn",
      timeframeKey: latest.timeframeKey || "1d",
      symbol: latest.symbol || ""
    });
    this.setData({
      stats,
      zhixingStability,
      tripleReflection,
      serverPrescription: getTrainingPrescription() || {},
      prescriptionStatusText: this.getPrescriptionStatusText(getTrainingPrescription()),
      klineRecommendation,
      klineDayRetest: buildKlineDayRetestComparison(klineReviewReports),
      miniLoopProgress,
      mirrorTree: buildLivingMirrorTree({
        assessment: getAssessmentResult(),
        loopProgress: miniLoopProgress,
        tradeReviewState,
        livingMirrorStats: stats,
        evidenceSummary
      }),
      evidenceSummary,
      evidenceRows: evidenceSummary.rows || [],
      unifiedJourneyView: getUnifiedJourneyView(),
      training7View,
      hasRecords: Number(stats.totalReviews || 0) > 0,
      reviewTop3: buildReviewTop3View(stats),
      serverLivingMirrorProfile: buildServerLivingMirrorProfile(stats),
      growthSummary: buildGrowthSummary(stats, training7View)
    });
  },

  toggleMirrorDepth() {
    this.setData({ showMirrorDepth: !this.data.showMirrorDepth });
  },

  getPrescriptionStatusText(prescription) {
    const status = prescription && prescription.status ? prescription.status : "";
    if (status === "dispatched") return "已下发";
    if (status === "received") return "已接收";
    if (status === "ready") return "待下发";
    return "待接收";
  },

  receiveServerPrescription() {
    pullTrainingPrescription({ silent: false })
      .then(() => {
        this.refreshStats();
      })
      .catch(() => {});
  },

  goReview() {
    wx.redirectTo({ url: "/pages/trade-review/index" });
  },

  goArchive() {
    wx.navigateTo({ url: "/pages/trade-review-archive/index" });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id || "";
    if (!id) return;
    wx.navigateTo({ url: `/pages/trade-review-detail/index?id=${id}` });
  },

  goAssistant() {
    wx.navigateTo({ url: "/pages/profile/index?anchor=assistant" });
  },

  goRecommendedKline() {
    wx.navigateTo({ url: buildKlineMindRecommendationPath(this.data.klineRecommendation || {}) });
  }
});
