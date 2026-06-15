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
  },
  globalData: {
    productName: "阳明心学交易系统",
    complianceText: "本系统用于交易心理觉察与训练，不提供投资建议，不预测行情，不构成任何操作依据。"
  }
});
