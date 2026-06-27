const ROUTE_ACTIVE_MAP = {
  "/pages/home/index": "today",
  "/pages/trade-review/index": "review",
  "/pages/training/index": "training",
  "/pages/living-mirror/index": "mirror",
  "/pages/profile/index": "profile"
};

Component({
  data: {
    activeKey: "today"
  },
  lifetimes: {
    attached() {
      this.syncActiveFromRoute();
    }
  },
  pageLifetimes: {
    show() {
      this.syncActiveFromRoute();
    }
  },
  methods: {
    syncActiveFromRoute() {
      const pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
      const current = pages[pages.length - 1] || {};
      const route = current.route ? `/${current.route}` : "/pages/home/index";
      const activeKey = ROUTE_ACTIVE_MAP[route] || "today";
      if (activeKey !== this.data.activeKey) {
        this.setData({ activeKey });
      }
    }
  }
});
