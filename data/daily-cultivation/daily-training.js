const {
  DAILY_CULTIVATION_SCHEMA,
  DAILY_HEART_PROOFS,
  getDailyCultivationByDay,
  validateDailyCultivationItem
} = require("./daily-heart-proof");

const DAILY_TRAINING_SCHEMA = Object.assign({}, DAILY_CULTIVATION_SCHEMA, {
  role: "365天训练库",
  principle: "每日训练库只输出能被完成、打卡和复盘的行为动作。"
});

const DAILY_TRAINING = DAILY_HEART_PROOFS.map((item) => {
  return Object.assign({}, item, {
    contentRole: "daily_training",
    primaryText: item.trainingAction,
    completionRule: "用户完成今日训练动作并写下一句省察，才算当日训练完成。"
  });
});

function getDailyTrainingByDay(day) {
  const item = getDailyCultivationByDay(day);
  return Object.assign({}, item, {
    contentRole: "daily_training",
    primaryText: item.trainingAction,
    completionRule: "用户完成今日训练动作并写下一句省察，才算当日训练完成。"
  });
}

module.exports = {
  DAILY_TRAINING_SCHEMA,
  DAILY_TRAINING,
  getDailyTrainingByDay,
  validateDailyCultivationItem
};
