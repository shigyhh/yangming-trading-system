const { buildLessonView } = require("../../modules/classroom/index");
const {
  getLessonReservations,
  saveLessonReservation,
  getLessonWatchRecords,
  saveLessonWatchRecord,
  saveShareCard,
  saveInviteEvent,
  getUserBinding
} = require("../../utils/store");
const { buildShareCardPreview } = require("../../modules/share-card/index");
const { syncLocalState, syncShareAttribution } = require("../../utils/api");
const { promptShareMoment } = require("../../utils/share-moments");

Page({
  data: {
    lessonId: "today-guide",
    lesson: buildLessonView("today-guide", {})
  },

  onLoad(options = {}) {
    this.setData({ lessonId: options.id || "today-guide" });
  },

  onShow() {
    this.refreshLesson();
  },

  refreshLesson() {
    this.setData({
      lesson: buildLessonView(this.data.lessonId, getLessonReservations(), getLessonWatchRecords())
    });
  },

  reserveLesson() {
    const isLive = this.data.lesson.type === "live";
    const lesson = isLive ? saveLessonReservation(this.data.lesson) : saveLessonWatchRecord(this.data.lesson);
    const sourceScene = isLive ? "lesson_reserved" : "lesson_watched";
    const card = buildShareCardPreview("live_reservation", { lesson });
    const savedCard = saveShareCard(Object.assign({}, card, { source: "lesson_detail", sourceScene }));
    const events = saveInviteEvent({
      sourceScene,
      sourcePage: "lesson_detail",
      shareCardType: "live_reservation",
      shareCardId: savedCard.latest.id,
      lessonId: lesson.id,
      reservationStatus: isLive ? "reserved" : "watched",
      inviteCode: (getUserBinding() || {}).inviteCode || ""
    });
    syncLocalState({ silent: true }).catch(() => {});
    syncShareAttribution(events[events.length - 1]).catch(() => {});
    this.refreshLesson();
    wx.showToast({
      title: isLive ? "事上练课已预约" : "观看已记录",
      icon: "success"
    });
    promptShareMoment(isLive ? "lesson_reserved" : "lesson_watched", {
      lessonId: lesson.id,
      sourceScene
    });
  },

  goShareCard() {
    wx.navigateTo({ url: `/pages/share-card/index?type=live_reservation&lessonId=${this.data.lesson.id}&sourceScene=lesson_detail_share` });
  },

  goClassroom() {
    wx.redirectTo({ url: "/pages/classroom/index" });
  }
});
