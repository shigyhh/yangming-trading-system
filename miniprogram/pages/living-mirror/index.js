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
  getUserBinding
} = require("../../utils/store");
const { fetchLivingMirrorGrowthProjection, fetchLivingMirrorProfile, pullTrainingPrescription } = require("../../utils/api");
const { buildTraining7View } = require("../../modules/training7/index");
const { buildKlineDayRetestComparison, getKlineRecommendationForMirror } = require("../../modules/kline-simulator/index");
const { buildLivingMirrorTree } = require("../../modules/mini-loop/index");

function buildServerLivingMirrorProfileView(profile = {}) {
  const repeatedThoughts = Array.isArray(profile.repeatedThoughts) ? profile.repeatedThoughts.slice(0, 3) : [];
  const totalEvents = Number(profile.totalEvents || 0);
  return {
    ok: !!profile.ok,
    status: profile.status || "empty",
    statusText: profile.ok ? "已同步成长摘要" : "活镜仍在显影",
    totalEvents,
    dominantReaction: profile.dominantReaction || "待显影",
    repeatedThoughts: repeatedThoughts.length ? repeatedThoughts : ["今日暂无成长记录"],
    latestBoundaryState: profile.latestBoundaryState || "下一次交易前，先照见这一念",
    updatedAt: profile.updatedAt || "待更新",
    fallbackText: profile.ok
      ? "成长摘要已更新"
      : profile.status === "network_error"
      ? "今日暂无成长记录，本地活镜仍可继续使用。"
      : "今日暂无成长记录"
  };
}

function pickGrowthText(...values) {
  for (const value of values) {
    const candidates = Array.isArray(value) ? value : [value];
    for (const item of candidates) {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object") {
        const text = item.text || item.thought || item.title || item.action || item.label || item.name || "";
        if (typeof text === "string" && text.trim()) return text.trim();
      }
    }
  }
  return "";
}

function pickGrowthNumber(...values) {
  for (const value of values) {
    if (value === "" || value === null || value === undefined) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function formatGrowthDate(value = "") {
  const text = String(value || "").trim();
  if (!text) return "待更新";
  return text.includes("T") ? text.split("T")[0] : text;
}

function buildLivingMirrorGrowthSummaryView(growth = null) {
  const projection = growth && (growth.projection || growth);
  if (!projection || typeof projection !== "object") return null;
  const trainingContinuity = projection.trainingContinuity || projection.training_continuity || {};
  const nextCycleFocus = projection.nextCycleFocus || projection.next_cycle_focus || {};
  const zhixingStability = projection.zhixingStability || projection.zhixing_stability || {};
  const totalEvents = pickGrowthNumber(
    growth.totalEvents,
    projection.totalEvents,
    projection.total_events,
    trainingContinuity.totalEvents,
    trainingContinuity.total_events
  );
  const completedDays = pickGrowthNumber(
    growth.completedDays,
    projection.completedDays,
    projection.completed_days,
    growth.activeDays,
    projection.activeDays,
    projection.active_days,
    trainingContinuity.activeDays,
    trainingContinuity.active_days
  );
  const stageText = pickGrowthText(
    growth.stageText,
    growth.stage,
    projection.stageText,
    projection.stage,
    projection.currentStage,
    projection.current_stage,
    projection.mirrorLifeStage,
    projection.mirror_life_stage
  );
  const topThoughtText = pickGrowthText(
    growth.topThoughtText,
    growth.topThought,
    projection.topThoughtText,
    projection.topThought,
    projection.highFrequencyThought,
    projection.high_frequency_thought,
    projection.highFrequencyThoughts,
    projection.high_frequency_thoughts,
    projection.repeatedThoughts,
    projection.repeated_thoughts
  );
  const nextActionText = pickGrowthText(
    growth.nextActionText,
    growth.nextAction,
    projection.nextActionText,
    projection.nextAction,
    projection.next_action,
    nextCycleFocus.action,
    nextCycleFocus.title
  );
  const zhixingText = pickGrowthText(
    growth.zhixingText,
    projection.zhixingText,
    projection.zhixingScoreText,
    projection.zhixing_score_text,
    zhixingStability.totalText,
    zhixingStability.total_text,
    zhixingStability.summary
  );
  const zhixingValue = growth.zhixing || projection.zhixing || projection.zhixingScore || projection.zhixing_score || "";
  const updatedAt = growth.updatedAt || projection.updatedAt || projection.updated_at ||
    trainingContinuity.latestRecordedAt || trainingContinuity.latest_recorded_at || "";
  const hasContent = stageText || topThoughtText || totalEvents || completedDays || nextActionText || zhixingText || zhixingValue;
  if (!hasContent) return null;
  return {
    stageText: stageText || "活镜仍在显影",
    topThoughtText: topThoughtText || "今日暂无高频一念",
    totalEventsText: `${totalEvents} 条`,
    completedDaysText: completedDays ? `${completedDays} 天` : "待记录",
    nextActionText: nextActionText || "下一次交易前，先照见这一念",
    zhixingText: zhixingText || (zhixingValue ? `${zhixingValue}` : "待稳定"),
    updatedAtText: formatGrowthDate(updatedAt)
  };
}

Page({
  data: {
    stats: {
      assistantHandoff: {},
      mirrorTrendRows: [],
      recentThree: [],
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
    serverLivingMirrorProfile: buildServerLivingMirrorProfileView(),
    growthSummary: null
  },

  onShow() {
    this.refreshStats();
    this.loadServerLivingMirrorProfile();
    this.loadLivingMirrorGrowthSummary();
  },

  refreshStats() {
    const tradeReviewState = getTradeReviewRecords();
    const stats = saveLivingMirrorStatsFromReviews(tradeReviewState);
    const zhixingStability = stats.zhixingStability || {};
    const tripleReflection = stats.tripleReflection || {};
    const miniLoopProgress = getMiniLoopProgress();
    const evidenceSummary = getEvidenceSummary({ limit: 6 });
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
      klineDayRetest: buildKlineDayRetestComparison(getKlineReviewReports()),
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
      training7View: buildTraining7View(getTraining7State(), {}),
      hasRecords: Number(stats.totalReviews || 0) > 0
    });
  },

  loadServerLivingMirrorProfile() {
    const userId = (getUserBinding() || {}).userId || "";
    fetchLivingMirrorProfile(userId)
      .then((profile) => {
        this.setData({ serverLivingMirrorProfile: buildServerLivingMirrorProfileView(profile) });
      })
      .catch(() => {
        this.setData({ serverLivingMirrorProfile: buildServerLivingMirrorProfileView({ status: "network_error" }) });
      });
  },

  loadLivingMirrorGrowthSummary() {
    const userId = (getUserBinding() || {}).userId || "";
    if (!userId) {
      this.setData({ growthSummary: null });
      return;
    }
    fetchLivingMirrorGrowthProjection(userId)
      .then((growth) => {
        this.setData({ growthSummary: buildLivingMirrorGrowthSummaryView(growth) });
      })
      .catch(() => {
        this.setData({ growthSummary: null });
      });
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
    wx.navigateTo({ url: (this.data.klineRecommendation || {}).path || "/pages/kline-simulator/index" });
  }
});
