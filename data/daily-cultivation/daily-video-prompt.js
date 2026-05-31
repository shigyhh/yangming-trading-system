const {
  DAILY_CULTIVATION_SCHEMA,
  DAILY_HEART_PROOFS,
  getDailyCultivationByDay,
  validateDailyCultivationItem
} = require("./daily-heart-proof");

const DAILY_VIDEO_PROMPT_SCHEMA = Object.assign({}, DAILY_CULTIVATION_SCHEMA, {
  role: "365天视频号提示词库",
  principle: "每日视频提示词负责把当天心证、戒律和训练动作转成可拍、可讲、可复用的短内容。"
});

const DAILY_VIDEO_PROMPTS = DAILY_HEART_PROOFS.map((item) => {
  return Object.assign({}, item, {
    contentRole: "daily_video_prompt",
    primaryText: item.shortVideoTitle,
    scriptSkeleton: [
      `开头：${item.shortVideoTitle}`,
      `转折：这不是行情问题，而是${item.personality}在${item.stage}关卡里的旧反应。`,
      `训练：${item.trainingAction}`,
      `收束：${item.reflectionQuestion}`
    ]
  });
});

function getDailyVideoPromptByDay(day) {
  const item = getDailyCultivationByDay(day);
  return Object.assign({}, item, {
    contentRole: "daily_video_prompt",
    primaryText: item.shortVideoTitle,
    scriptSkeleton: [
      `开头：${item.shortVideoTitle}`,
      `转折：这不是行情问题，而是${item.personality}在${item.stage}关卡里的旧反应。`,
      `训练：${item.trainingAction}`,
      `收束：${item.reflectionQuestion}`
    ]
  });
}

module.exports = {
  DAILY_VIDEO_PROMPT_SCHEMA,
  DAILY_VIDEO_PROMPTS,
  getDailyVideoPromptByDay,
  validateDailyCultivationItem
};
