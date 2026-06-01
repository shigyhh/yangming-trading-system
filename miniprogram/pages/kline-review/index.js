const {
  getKlineReviewReports,
  saveShareCard
} = require("../../utils/store");

function buildScoreRows(review) {
  const scores = (review || {}).scores || {};
  const labels = (review || {}).scoreLabels || {};
  return Object.keys(scores).map((key) => ({
    key,
    label: labels[key] || key,
    value: scores[key]
  }));
}

Page({
  data: {
    review: null,
    scoreRows: [],
    statsRows: []
  },

  onLoad(options = {}) {
    const state = getKlineReviewReports();
    const review = (state.records || []).find((item) => item.id === options.reviewId) || state.latest || null;
    const reviewView = review ? Object.assign({}, review, {
      heartThievesText: (review.heartThieves || []).length ? review.heartThieves.join("、") : (review.virtuePractice || "知止、守心、执行"),
      relatedLine: `${review.relatedPersonality || "待照见"} · ${review.relatedMirror || "待照见"}`,
      reactionSecondsText: review.reactionSecondsText || `${(Number(review.reactionTimeMs || 0) / 1000).toFixed(1)} 秒`,
      impulseLine: review.impulseWithin3s ? "三秒内选择，需重点训练停顿" : "已留出停顿，继续观察边界"
    }) : null;
    this.setData({
      review: reviewView,
      scoreRows: buildScoreRows(reviewView),
      statsRows: ((reviewView || {}).anonymousStats || {}).rows || []
    });
  },

  goSimulator() {
    wx.redirectTo({ url: "/pages/kline-simulator/index" });
  },

  goMirror() {
    wx.navigateTo({ url: `/pages/mirror-challenge/index?reviewId=${(this.data.review || {}).id || ""}` });
  },

  goShareCard(e) {
    const type = (e && e.currentTarget && e.currentTarget.dataset.type) || "kline_insight";
    wx.navigateTo({ url: `/pages/share-card/index?type=${type}&sourceScene=kline_review_completed` });
  },

  saveCard() {
    const review = this.data.review || {};
    saveShareCard({
      type: "kline_insight",
      typeLabel: "一根 K 线照见卡",
      headline: "一根 K 线照见我",
      body: `我的第一反应：${review.primaryReaction || "待照见"}\n第一念：${review.firstThought || "待记录"}\n反应之镜：${review.relatedMirror || "待照见"}\n心贼：${review.heartThievesText || "待照见"}`,
      insight: review.insight || "这一刻照见的不是走势，而是我的第一念。",
      source: "kline_review",
      createdAt: Date.now()
    });
    wx.showToast({ title: "已存入心证卡册", icon: "success" });
  }
});
