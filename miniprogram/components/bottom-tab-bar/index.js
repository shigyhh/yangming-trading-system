Component({
  properties: {
    active: {
      type: String,
      value: "today",
      observer(value) {
        this.setData({ activeKey: normalizeActive(value) });
      }
    }
  },
  data: {
    activeKey: "today",
    transitioning: false,
    tabs: [
      { key: "today", label: "今日", mark: "今", url: "/pages/home/index" },
      { key: "review", label: "复盘", mark: "复", url: "/pages/trade-review/index" },
      { key: "training", label: "训练", mark: "练", url: "/pages/training/index" },
      { key: "mirror", label: "活镜", mark: "镜", url: "/pages/living-mirror/index" },
      { key: "profile", label: "我的", mark: "我", url: "/pages/profile/index" }
    ]
  },
  lifetimes: {
    attached() {
      this.setData({ activeKey: normalizeActive(this.properties.active) });
    }
  },
  methods: {
    go(e) {
      const { key, url } = e.currentTarget.dataset;
      if (!url || key === this.data.activeKey || this.data.transitioning) return;
      this.setData({ transitioning: true }, () => {
        setTimeout(() => {
          wx.redirectTo({
            url,
            fail: () => wx.reLaunch({
              url,
              fail: () => this.setData({ transitioning: false })
            })
          });
        }, 32);
      });
    }
  }
});

function normalizeActive(value) {
  const key = String(value || "today");
  const map = {
    home: "today",
    today: "today",
    mind: "training",
    review: "review",
    tradeReview: "review",
    training: "training",
    stages: "training",
    kline: "training",
    klineMind: "training",
    dailyPractice: "training",
    zhixing: "training",
    mirror: "mirror",
    livingMirror: "mirror",
    assessment: "profile",
    index: "profile",
    profile: "profile"
  };
  return map[key] || key;
}
