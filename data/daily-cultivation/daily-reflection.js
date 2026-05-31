const {
  DAILY_CULTIVATION_SCHEMA,
  DAILY_HEART_PROOFS,
  getDailyCultivationByDay,
  validateDailyCultivationItem
} = require("./daily-heart-proof");

const DAILY_REFLECTION_SCHEMA = Object.assign({}, DAILY_CULTIVATION_SCHEMA, {
  role: "365天省察库",
  principle: "每日省察库负责把训练动作转成收盘复盘问题，服务AI复盘和知行指数。"
});

const DAILY_REFLECTION = DAILY_HEART_PROOFS.map((item) => {
  return Object.assign({}, item, {
    contentRole: "daily_reflection",
    primaryText: item.reflectionQuestion,
    reviewFocus: `${item.stage}｜${item.zhixingDimension}`,
    aiCoachUse: "用于收盘后追问：今日是否守住戒律、是否完成训练、知行指数为何变化。"
  });
});

function getDailyReflectionByDay(day) {
  const item = getDailyCultivationByDay(day);
  return Object.assign({}, item, {
    contentRole: "daily_reflection",
    primaryText: item.reflectionQuestion,
    reviewFocus: `${item.stage}｜${item.zhixingDimension}`,
    aiCoachUse: "用于收盘后追问：今日是否守住戒律、是否完成训练、知行指数为何变化。"
  });
}

module.exports = {
  DAILY_REFLECTION_SCHEMA,
  DAILY_REFLECTION,
  getDailyReflectionByDay,
  validateDailyCultivationItem
};
