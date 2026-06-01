const PROMPT_KEY = "ym_share_moment_prompts";

const SHARE_MOMENTS = {
  assessment_completed: {
    title: "你已照见自己的交易人格",
    content: "生成一张照见卡，发给一位也需要看见自己反应的人。",
    cardType: "personality",
    confirmText: "生成照见卡"
  },
  risk_radar_seen: {
    title: "这不是评价你",
    content: "这是帮你看见交易里的惯性。可以生成风险雷达卡。",
    cardType: "risk_radar",
    confirmText: "生成雷达卡"
  },
  three_seals_completed: {
    title: "今天这一念，值得被看见",
    content: "把一念、一惧、一界收进三印卡。",
    cardType: "three_seals",
    confirmText: "生成三印卡"
  },
  opening_check_completed: {
    title: "今日边界已立",
    content: "生成守界卡，提醒自己今日只守这一界。",
    cardType: "boundary_guard",
    confirmText: "生成守界卡"
  },
  closing_review_completed: {
    title: "今日照见已生成",
    content: "把收盘省察收成一张今日心证卡。",
    cardType: "daily_mantra",
    confirmText: "保存心证卡"
  },
  zhixing_score_generated: {
    title: "今天你守住了多少自己？",
    content: "生成知行指数卡，只看照见、守界、执行、复盘和稳定。",
    cardType: "zhixing_score",
    confirmText: "生成指数卡"
  },
  streak_3_days: {
    title: "你已连续观心 3 天",
    content: "邀一位同修一起练 7 天。",
    cardType: "companion_invite",
    confirmText: "邀同修同行"
  },
  seven_day_completed: {
    title: "7 天观心完成",
    content: "生成七日变化卡，看见这一周反应模式的变化。",
    cardType: "seven_day_change",
    confirmText: "生成变化卡"
  },
  retest_change_ready: {
    title: "你不是没有变化",
    content: "你只是以前没有看见变化。生成复测变化卡。",
    cardType: "retest_change",
    confirmText: "生成复测卡"
  },
  lesson_reserved: {
    title: "事上练课已预约",
    content: "邀请一位同修共修，不聊外物，只照见自己。",
    cardType: "live_reservation",
    confirmText: "生成预约卡"
  },
  lesson_watched: {
    title: "这节课是否照见了你？",
    content: "分享给一个正在交易里乱的人。",
    cardType: "live_reservation",
    confirmText: "生成回放卡"
  },
  profile_album: {
    title: "我的观心历程",
    content: "查看心证卡册与同修邀请，把修行路径沉淀下来。",
    cardType: "companion_invite",
    confirmText: "生成邀请卡"
  }
};

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readPromptState() {
  try {
    return wx.getStorageSync(PROMPT_KEY) || {};
  } catch (error) {
    return {};
  }
}

function markPrompted(momentKey) {
  const state = readPromptState();
  const date = todayKey();
  const daily = Object.assign({}, state[date] || {}, { [momentKey]: Date.now() });
  wx.setStorageSync(PROMPT_KEY, Object.assign({}, state, { [date]: daily }));
}

function hasPrompted(momentKey) {
  return !!((readPromptState()[todayKey()] || {})[momentKey]);
}

function buildShareCardUrl(cardType, options = {}) {
  const params = [`type=${encodeURIComponent(cardType || "daily_mantra")}`];
  if (options.lessonId) params.push(`lessonId=${encodeURIComponent(options.lessonId)}`);
  if (options.sourceScene) params.push(`sourceScene=${encodeURIComponent(options.sourceScene)}`);
  return `/pages/share-card/index?${params.join("&")}`;
}

function promptShareMoment(momentKey, options = {}) {
  const moment = SHARE_MOMENTS[momentKey];
  if (!moment || hasPrompted(momentKey)) return false;
  markPrompted(momentKey);
  wx.showModal({
    title: options.title || moment.title,
    content: options.content || moment.content,
    confirmText: options.confirmText || moment.confirmText,
    cancelText: options.cancelText || "先不生成",
    success(res) {
      if (!res.confirm) {
        if (typeof options.onCancel === "function") options.onCancel();
        return;
      }
      const cardType = options.cardType || moment.cardType;
      wx.navigateTo({
        url: buildShareCardUrl(cardType, {
          lessonId: options.lessonId,
          sourceScene: options.sourceScene || momentKey
        })
      });
    }
  });
  return true;
}

module.exports = {
  SHARE_MOMENTS,
  buildShareCardUrl,
  promptShareMoment,
  hasPrompted,
  markPrompted
};
