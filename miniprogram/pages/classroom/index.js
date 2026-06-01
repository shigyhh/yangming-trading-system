const { buildClassroomView } = require("../../modules/classroom/index");
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
    classroom: buildClassroomView(getLessonReservations(), getLessonWatchRecords())
  },

  onShow() {
    this.setData({ classroom: buildClassroomView(getLessonReservations(), getLessonWatchRecords()) });
  },

  reserveLive(e) {
    const item = (this.data.classroom.items || [])[Number(e.currentTarget.dataset.index || 0)] || {};
    const isLive = item.type === "live";
    const lessonRecord = isLive ? saveLessonReservation(item) : saveLessonWatchRecord(item);
    const sourceScene = isLive ? "lesson_reserved" : "lesson_watched";
    const card = buildShareCardPreview("live_reservation", { lesson: lessonRecord });
    const savedCard = saveShareCard(Object.assign({}, card, { source: "classroom_reservation", sourceScene }));
    const events = saveInviteEvent({
      sourceScene,
      sourcePage: "classroom",
      shareCardType: "live_reservation",
      shareCardId: savedCard.latest.id,
      lessonId: item.id,
      reservationStatus: isLive ? "reserved" : "watched",
      inviteCode: (getUserBinding() || {}).inviteCode || ""
    });
    syncLocalState({ silent: true }).catch(() => {});
    syncShareAttribution(events[events.length - 1]).catch(() => {});
    this.setData({ classroom: buildClassroomView(getLessonReservations(), getLessonWatchRecords()) });
    wx.showToast({
      title: isLive ? "事上练课已预约" : "观看已记录",
      icon: "none"
    });
    promptShareMoment(isLive ? "lesson_reserved" : "lesson_watched", {
      lessonId: item.id,
      sourceScene
    });
  },

  openLesson(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/lesson-detail/index?id=${id}` });
  },

  shareLesson(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/share-card/index?type=live_reservation&lessonId=${id}&sourceScene=classroom_lesson_share` });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/home/index" });
  }
});
