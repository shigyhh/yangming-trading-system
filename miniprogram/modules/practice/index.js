const { buildPersonalityTrainingCard } = require("../../core/personality-stage-map");
const { getTodayContent } = require("../content365/index");

const PRACTICE_RULE = {
  version: "v1",
  principle: "每天只事上练一件事。",
  rewardName: "知行值",
  completion: ["看见触发", "完成动作", "写下省察"],
  loopPosition: "每日事上练",
  next: "知行指数"
};

const DAILY_TRAINING_CARD_SCHEMA = {
  version: "v1",
  requiredFields: [
    "id",
    "dateKey",
    "personalityType",
    "stageKey",
    "heartThief",
    "commandment",
    "trigger",
    "action",
    "review",
    "contentDayId",
    "completion"
  ],
  completionSteps: [
    { key: "trigger", name: "照见触发" },
    { key: "micro", name: "完成动作" },
    { key: "reflection", name: "写下省察" }
  ]
};

function buildDailyTrainingCard({ dateKey = "", personalityType = "平衡型", mind = null, content = null } = {}) {
  const personalityCard = buildPersonalityTrainingCard(personalityType);
  const dailyContent = content || getTodayContent();
  const mindTask = mind && mind.oneThing ? mind.oneThing : "";

  return {
    id: `${dateKey || "today"}-${personalityType}`,
    dateKey,
    personalityType,
    stageKey: personalityCard.stageKey,
    stageName: personalityCard.stageName,
    heartThief: personalityCard.heartThief,
    commandment: personalityCard.commandment || dailyContent.commandment,
    trigger: personalityCard.trigger,
    action: mindTask || personalityCard.action || dailyContent.training,
    review: personalityCard.review || dailyContent.review,
    contentDayId: dailyContent.id,
    heartProof: dailyContent.heartProof,
    completion: DAILY_TRAINING_CARD_SCHEMA.completionSteps,
    rewardName: PRACTICE_RULE.rewardName
  };
}

module.exports = {
  PRACTICE_RULE,
  DAILY_TRAINING_CARD_SCHEMA,
  buildDailyTrainingCard
};
