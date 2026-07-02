const ROUTE_ACTIVE_MAP = {
  "/pages/home/index": "today",
  "/pages/trade-review/index": "review",
  "/pages/training/index": "training",
  "/pages/living-mirror/index": "mirror",
  "/pages/profile/index": "profile"
};

function getCurrentRoute() {
  if (typeof getCurrentPages !== "function") return "/pages/home/index";
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] || {};
  return current.route ? `/${current.route}` : "/pages/home/index";
}

function resolveTabActiveKey(route = "") {
  const normalized = route.startsWith("/") ? route : `/${route}`;
  return ROUTE_ACTIVE_MAP[normalized] || "today";
}

function syncNativeTabBarActive(page) {
  if (!page || typeof page.getTabBar !== "function") return;
  const tabBar = page.getTabBar();
  if (!tabBar) return;
  if (typeof tabBar.syncActiveFromRoute === "function") {
    tabBar.syncActiveFromRoute();
    return;
  }
  if (typeof tabBar.setData === "function") {
    tabBar.setData({ activeKey: resolveTabActiveKey(getCurrentRoute()) });
  }
}

module.exports = {
  resolveTabActiveKey,
  syncNativeTabBarActive
};
