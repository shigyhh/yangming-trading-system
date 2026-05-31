const { STAGES } = require("../stages/index");

const CONTENT_365_SCHEMA = {
  version: "v1",
  totalDays: 365,
  loop: ["人格照见", "照心", "修行关卡", "每日事上练", "收盘省察", "知行指数", "心证卡"],
  requiredFields: [
    "id",
    "dayNumber",
    "title",
    "stageKey",
    "stageName",
    "stageCore",
    "heartProof",
    "interpretation",
    "commandment",
    "training",
    "trainingAction",
    "review",
    "reflectionQuestion",
    "zhixingDimension",
    "liveTopic"
  ],
  reusableIn: ["小程序今日心证", "每日事上练卡", "收盘省察", "心证卡海报", "直播提纲", "视频号口播", "AI观心教练"]
};

const FOUNDATION_HEART_PROOFS = {
  1: "先立其志，再入其事。",
  2: "知而不行，只是未知。",
  3: "心外无物。",
  4: "事上磨练。",
  5: "破山中贼易，破心中贼难。"
};

const STAGE_DAY_RANGES = [
  { key: "lizhi", start: 1, end: 60 },
  { key: "zhaoxin", start: 61, end: 120 },
  { key: "shishangmo", start: 121, end: 180 },
  { key: "poxinzei", start: 181, end: 240 },
  { key: "zhixing", start: 241, end: 300 },
  { key: "zhiliangzhi", start: 301, end: 365 }
];

const STAGE_CONTENT = {
  lizhi: {
    heartProofs: [
      "先立其志，再入其事。",
      "知而不行，只是未知。",
      "先定边界，再入其事。",
      "仓位先于交易，戒律先于情绪。"
    ],
    interpretation: "先有边界，行动才不被情绪牵走。",
    commandment: "无计划不开仓。",
    training: "行动前写下理由、边界、离场条件。",
    review: "今天有没有因为想快一点，而省略计划？"
  },
  zhaoxin: {
    heartProofs: [
      "先照此心，再看盘面。",
      "心外无物。",
      "心急时，机会也会变形。",
      "看见贪惧急怒疲，才有不被牵走的余地。"
    ],
    interpretation: "市场不是敌人，失守的念头才是。",
    commandment: "心乱时，动作要更少。",
    training: "开盘前选择一个真实心境，并写下一条今日禁忌。",
    review: "今天哪一种情绪最先牵动了我？"
  },
  shishangmo: {
    heartProofs: [
      "在事上磨，方知真心。",
      "功夫不在空想里，在触发的一刻。",
      "事上练，不是多做，是守住该做。",
      "真正的事上练，是边界到了能知行合一。"
    ],
    interpretation: "市场不是敌人，失守的念头才是。",
    commandment: "触发边界，不再辩解。",
    training: "出现追涨、扛单、移动边界念头时，先停30秒。",
    review: "今天哪一次知行最接近原计划？"
  },
  poxinzei: {
    heartProofs: [
      "破山中贼易，破心中贼难。",
      "心贼不破，规则只是文字。",
      "不甘一起，先照见它。",
      "看见惯性人格，才有克己之处。"
    ],
    interpretation: "先破心中一念，再谈盘中一事。",
    commandment: "赌念一起，先降一档。",
    training: "记录今天最强的一念：赌、急、不甘、怕错过或不认错。",
    review: "今天我把哪一个私欲包装成了理由？"
  },
  zhixing: {
    heartProofs: [
      "真知必能行，未行仍需再知。",
      "说过的计划，要成为盘中的动作。",
      "知行差一寸，盘中差千里。"
    ],
    interpretation: "真正的知，是盘中也能照做。",
    commandment: "不临盘改计划。",
    training: "盘前写下一个动作标准，盘后只检查是否照做。",
    review: "今天我说过的计划，哪一条真正落地了？"
  },
  zhiliangzhi: {
    heartProofs: [
      "稳定不是状态，是每日存养。",
      "良知不是一句话，是每次回到清明。",
      "成熟，是不靠情绪也能守住系统。"
    ],
    interpretation: "清明不是远离市场，而是在事中不失其心。",
    commandment: "稳定时，更要守一。",
    training: "完成一次自主省察，只写一个明日克治动作。",
    review: "今天我有没有更早看见自己？"
  }
};

function padDay(dayNumber) {
  return String(dayNumber).padStart(3, "0");
}

function getStageByDayNumber(dayNumber) {
  const range = STAGE_DAY_RANGES.find((item) => dayNumber >= item.start && dayNumber <= item.end) || STAGE_DAY_RANGES[0];
  return STAGES.find((stage) => stage.key === range.key) || STAGES[0];
}

function getStageOffset(dayNumber, stageKey) {
  const range = STAGE_DAY_RANGES.find((item) => item.key === stageKey) || STAGE_DAY_RANGES[0];
  return dayNumber - range.start;
}

function buildContentItem(index) {
  const dayNumber = index + 1;
  const stage = getStageByDayNumber(dayNumber);
  const stageOffset = getStageOffset(dayNumber, stage.key);
  const content = STAGE_CONTENT[stage.key] || STAGE_CONTENT.lizhi;
  const heartProof = FOUNDATION_HEART_PROOFS[dayNumber] || content.heartProofs[stageOffset % content.heartProofs.length];

  return {
    id: `Day${padDay(dayNumber)}`,
    version: CONTENT_365_SCHEMA.version,
    dayNumber,
    title: "今日心证",
    loopPosition: "每日事上练",
    stageKey: stage.key,
    stageName: stage.name,
    stageTitle: stage.title,
    stageCore: stage.core,
    heartProof,
    interpretation: content.interpretation,
    commandment: content.commandment,
    training: content.training,
    trainingAction: content.training,
    review: content.review,
    reflectionQuestion: content.review,
    zhixingDimension: stage.key === "zhaoxin" ? "情绪稳定" : stage.key === "zhixing" ? "系统一致性" : "主修兑现",
    liveTopic: `${stage.name}：${heartProof}`,
    videoHook: `今天只讲一句：${heartProof}`,
    sourceRole: "视频号、网页、小程序统一内容源",
    usage: "可用于小程序今日心证、直播开场、视频号口播和AI观心教练。"
  };
}

const CONTENT_365 = Array.from({ length: 365 }).map((_, index) => buildContentItem(index));

function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

function getContentByDayNumber(dayNumber) {
  const safeDay = Math.max(1, Math.min(365, Number(dayNumber || 1)));
  return CONTENT_365[safeDay - 1];
}

function getTodayContent(date = new Date()) {
  const dayNumber = ((getDayOfYear(date) - 1) % 365) + 1;
  return getContentByDayNumber(dayNumber);
}

function validateContentItem(item) {
  if (!item || typeof item !== "object") return false;
  return CONTENT_365_SCHEMA.requiredFields.every((field) => item[field] !== undefined && item[field] !== "");
}

module.exports = {
  CONTENT_365_SCHEMA,
  CONTENT_365,
  getTodayContent,
  getContentByDayNumber,
  validateContentItem
};
