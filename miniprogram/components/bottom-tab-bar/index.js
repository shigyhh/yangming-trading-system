Component({
  properties: {
    active: {
      type: String,
      value: "home"
    }
  },
  data: {
    tabs: [
      { key: "home", label: "首页", mark: "知", url: "/pages/home/index" },
      { key: "mind", label: "照心", mark: "心", url: "/pages/mind/index" },
      { key: "assessment", label: "九型", mark: "型", url: "/pages/assessment/index" },
      { key: "stages", label: "关卡", mark: "关", url: "/pages/stages/index" },
      { key: "index", label: "讲堂", mark: "行", url: "/pages/classroom/index" }
    ]
  },
  methods: {
    go(e) {
      const { key, url } = e.currentTarget.dataset;
      if (!url || key === this.properties.active) return;
      wx.redirectTo({ url });
    }
  }
});
