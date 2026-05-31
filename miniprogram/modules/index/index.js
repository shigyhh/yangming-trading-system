const CULTIVATION_LOOP = [
  {
    key: "vow",
    name: "立志",
    phrase: "先立其志，再入其事。",
    page: "/pages/home/index"
  },
  {
    key: "mind",
    name: "照心",
    phrase: "开盘前先照见此刻之心。",
    page: "/pages/mind/index"
  },
  {
    key: "zhixing",
    name: "知行",
    phrase: "让说过的计划，成为盘中的行动。",
    page: "/pages/training/index"
  },
  {
    key: "practice",
    name: "磨练",
    phrase: "在真实触发中练，不在空想里练。",
    page: "/pages/training/index"
  },
  {
    key: "review",
    name: "省察",
    phrase: "收盘后只看今天哪一念带跑了自己。",
    page: "/pages/review/index"
  },
  {
    key: "re_vow",
    name: "再立志",
    phrase: "明日只克治一个动作。",
    page: "/pages/home/index"
  }
];

const PRODUCT_LANGUAGE = {
  core: ["知行合一", "照心", "立志", "戒律", "事上练", "致良知", "省察", "破心中贼", "观心", "克己", "修行", "心境"],
  forbidden: ["暴富", "翻倍", "妖股", "龙头", "必赢", "稳赚", "财富自由"]
};

const DAILY_TOOLKIT = [
  {
    key: "checkin",
    name: "打卡",
    phrase: "每天留下一次修行痕迹。",
    page: "/pages/training/index"
  },
  {
    key: "mind",
    name: "照心",
    phrase: "开盘前先观心，再入事。",
    page: "/pages/mind/index"
  },
  {
    key: "assessment",
    name: "照见",
    phrase: "照见自己的交易人格惯性。",
    page: "/pages/assessment/index"
  },
  {
    key: "practice",
    name: "每日任务",
    phrase: "今天只事上练一件事。",
    page: "/pages/training/index"
  },
  {
    key: "index",
    name: "知行指数",
    phrase: "不看外物，只看今日是否守住自己。",
    page: "/pages/zhixing-index/index"
  },
  {
    key: "review",
    name: "省察",
    phrase: "收盘后做一次心性省察。",
    page: "/pages/review/index"
  },
  {
    key: "content365",
    name: "365心证",
    phrase: "每天一条戒律、事上练与省察。",
    page: "/pages/content365/index"
  },
  {
    key: "companion",
    name: "陪伴",
    phrase: "每天一句提醒，稳住此心。",
    page: ""
  }
];

module.exports = {
  CULTIVATION_LOOP,
  PRODUCT_LANGUAGE,
  DAILY_TOOLKIT
};
