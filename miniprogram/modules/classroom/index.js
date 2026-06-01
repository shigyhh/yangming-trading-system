const CLASSROOM_CONTENT = [
  {
    id: "today-guide",
    type: "video",
    title: "今日导引视频",
    subtitle: "三分钟进入今日观心",
    startTime: "随时观看",
    relatedDay: "今日三印",
    duration: "03:00",
    status: "可观看",
    description: "从一念、一惧、一界开始，把今日交易心理训练落到一个真实动作。",
    guide: "先写下今日三印，再进入开盘照心。"
  },
  {
    id: "camp-live",
    type: "live",
    title: "训练营直播预约",
    subtitle: "今晚 20:30 · 事上练心",
    startTime: "20:30",
    relatedDay: "观止损抗拒",
    duration: "预约中",
    status: "占位预约",
    description: "直播先做预约占位，后续可接入正式课程与助教承接。",
    guide: "预约后可生成事上练课卡，邀一位同修共修。"
  },
  {
    id: "replay-boundary",
    type: "replay",
    title: "往期回放",
    subtitle: "边界到了，如何知行合一",
    startTime: "18 分钟",
    relatedDay: "盘中守界",
    duration: "18:00",
    status: "回放",
    description: "复盘常见念头：急躁、恐惧、证明欲和边界抗拒。",
    guide: "看完后回到盘中守界，记录一次真实反应。"
  }
];

function getLessonById(id) {
  return CLASSROOM_CONTENT.find((item) => item.id === id) || CLASSROOM_CONTENT[0];
}

function buildLessonView(id, reservations = {}, watchRecords = {}) {
  const lesson = getLessonById(id);
  const watched = !!((watchRecords || {})[lesson.id] || {}).watched;
  const reserved = !!((reservations || {})[lesson.id] || {}).reserved;
  return Object.assign({}, lesson, {
    typeLabel: lesson.type === "video" ? "视频" : lesson.type === "live" ? "直播" : "回放",
    reserved,
    watched,
    reservationText: lesson.type === "live"
      ? reserved ? "已预约" : "预约观课"
      : watched ? "已看完" : "记录已看",
    compliance: "本内容用于交易心理训练，不构成投资建议。"
  });
}

function buildClassroomView(reservations = {}, watchRecords = {}) {
  return {
    title: "知行讲堂",
    subtitle: "视频、直播预约与回放占位",
    compliance: "本内容用于交易心理训练，不构成投资建议。",
    items: CLASSROOM_CONTENT.map((item) => Object.assign({}, item, {
      typeLabel: item.type === "video" ? "视频" : item.type === "live" ? "直播" : "回放",
      reserved: !!((reservations || {})[item.id] || {}).reserved,
      watched: !!((watchRecords || {})[item.id] || {}).watched,
      statusText: item.type === "live"
        ? ((reservations || {})[item.id] || {}).reserved ? "已预约" : item.status
        : ((watchRecords || {})[item.id] || {}).watched ? "已看完" : item.status
    }))
  };
}

module.exports = {
  CLASSROOM_CONTENT,
  getLessonById,
  buildLessonView,
  buildClassroomView
};
