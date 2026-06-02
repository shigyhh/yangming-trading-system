const { ensureProfile, saveSyncStatus } = require("./utils/store");

App({
  onLaunch() {
    ensureProfile();
  },
  onError() {
    saveSyncStatus({
      ok: false,
      syncing: false,
      message: "页面连接未完成",
      fallbackTitle: "连接未完成",
      fallbackText: "本地档案已保存。可稍后再同步，也可以先继续今日修行。",
      failedAt: Date.now()
    });
  },
  globalData: {
    productName: "阳明心学交易系统",
    complianceText: "本系统用于交易心理觉察与训练，不提供投资建议，不预测行情，不构成任何操作依据。"
  }
});
