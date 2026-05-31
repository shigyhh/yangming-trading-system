const { ensureProfile } = require("./utils/store");

function loadFontFace(family, source, weight) {
  if (!wx.loadFontFace) return;
  wx.loadFontFace({
    family,
    source,
    global: true,
    weight,
    fail() {}
  });
}

App({
  onLaunch() {
    ensureProfile();
    loadFontFace("ZX-LXGW", 'url("assets/fonts/LXGWWenKai-Zhixing.woff2")', "500");
    loadFontFace("ZX-Harmony", 'url("assets/fonts/HarmonyOS-SansSC-Regular-Zhixing.woff2")', "400");
    loadFontFace("ZX-Harmony", 'url("assets/fonts/HarmonyOS-SansSC-Medium-Zhixing.woff2")', "500");
    loadFontFace("ZX-Harmony", 'url("assets/fonts/HarmonyOS-SansSC-Bold-Zhixing.woff2")', "700");
  },
  globalData: {
    productName: "阳明心学交易系统",
    complianceText: "本系统仅用于交易认知、事上练与风险教育；不推荐股票、不提供操作指令、不承诺结果。"
  }
});
