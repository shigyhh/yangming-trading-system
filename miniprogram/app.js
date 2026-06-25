const { ensureProfile } = require("./utils/store");
const { prefetchKlineTrainingSlices } = require("./utils/api");

function getEnvVersion() {
  try {
    return ((wx.getAccountInfoSync() || {}).miniProgram || {}).envVersion || "develop";
  } catch (error) {
    return "develop";
  }
}

function setupUpdateManager() {
  if (!wx.getUpdateManager) return;
  if (getEnvVersion() === "develop") return;
  const updateManager = wx.getUpdateManager();
  updateManager.onCheckForUpdate(() => {});
  updateManager.onUpdateReady(() => {
    wx.showModal({
      title: "新版本已就绪",
      content: "重启小程序后即可使用最新体验版。",
      confirmText: "立即重启",
      cancelText: "稍后",
      success(res) {
        if (res.confirm) updateManager.applyUpdate();
      }
    });
  });
  updateManager.onUpdateFailed(() => {
    wx.showToast({
      title: "新版本下载失败，请稍后重试",
      icon: "none"
    });
  });
}

function warmKlineTrainingSlices() {
  prefetchKlineTrainingSlices({
    marketKey: "cn",
    scenarioId: "scene-fast-001"
  }).catch(() => {});
}

App({
  onLaunch() {
    ensureProfile();
    warmKlineTrainingSlices();
    setupUpdateManager();
  },
  globalData: {
    productName: "阳明心学交易系统",
    complianceText: "本系统用于交易心理觉察与训练，不提供投资建议，不预测行情，不构成任何操作依据。"
  }
});
