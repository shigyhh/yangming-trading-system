const {
  getKlineReviewReports,
  getKlineMirrorChallenges,
  saveKlineMirrorChallenge
} = require("../../utils/store");
const { createMirrorChallenge, getKlineScenario } = require("../../modules/kline-simulator/index");

function getReview(reviewId) {
  const state = getKlineReviewReports();
  return (state.records || []).find((item) => item.id === reviewId) || state.latest || null;
}

Page({
  data: {
    review: null,
    scene: null,
    options: [],
    selected: "",
    challenge: null
  },

  onLoad(options = {}) {
    const review = getReview(options.reviewId || "");
    const scene = getKlineScenario((review || {}).sceneId || "");
    const latestChallenge = getKlineMirrorChallenges().latest || null;
    this.setData({
      review,
      scene,
      options: ((scene.checkpoints || [])[0] || {}).options || [],
      challenge: latestChallenge && latestChallenge.sceneId === (review || {}).sceneId ? latestChallenge : null
    });
  },

  selectOption(e) {
    this.setData({ selected: e.currentTarget.dataset.id });
  },

  createChallenge() {
    if (!this.data.review) {
      wx.showToast({ title: "请先完成 K线复盘", icon: "none" });
      return;
    }
    const challenge = createMirrorChallenge(this.data.review, this.data.selected);
    saveKlineMirrorChallenge(challenge);
    this.setData({ challenge });
    wx.showToast({ title: "镜像已生成", icon: "success" });
  },

  goShareCard() {
    wx.navigateTo({ url: "/pages/share-card/index?type=mirror_challenge&sourceScene=mirror_challenge" });
  },

  goSimulator() {
    wx.redirectTo({ url: "/pages/kline-simulator/index" });
  }
});
