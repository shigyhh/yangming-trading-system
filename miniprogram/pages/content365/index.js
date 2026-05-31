const { CONTENT_365, getTodayContent, getContentByDayNumber } = require("../../modules/content365/index");

Page({
  data: {
    total: CONTENT_365.length,
    current: getTodayContent(),
    dayNumber: 1
  },

  onLoad() {
    const current = getTodayContent();
    this.setData({ current, dayNumber: current.dayNumber });
  },

  prevDay() {
    const next = this.data.dayNumber <= 1 ? 365 : this.data.dayNumber - 1;
    this.setContent(next);
  },

  nextDay() {
    const next = this.data.dayNumber >= 365 ? 1 : this.data.dayNumber + 1;
    this.setContent(next);
  },

  setContent(dayNumber) {
    this.setData({
      current: getContentByDayNumber(dayNumber),
      dayNumber
    });
  },

  copyContent() {
    const item = this.data.current;
    const text = [
      item.id,
      item.title,
      `关卡：${item.stageTitle}`,
      `心证：${item.heartProof}`,
      `戒律：${item.commandment}`,
      `事上练：${item.training}`,
      `省察：${item.review}`
    ].join("\n");
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: "内容已复制", icon: "success" })
    });
  },

  goStages() {
    wx.navigateTo({ url: "/pages/stages/index" });
  }
});
