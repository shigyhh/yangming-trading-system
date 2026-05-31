const CULTIVATION_CHAIN = [
  "人格识别",
  "主修关卡",
  "每日训练",
  "知行指数",
  "关卡进度"
];

const STAGE_DAY_RANGES = [
  {
    id: "stage_01",
    stage: "立志",
    dayStart: 1,
    dayEnd: 60,
    theme: "建立交易戒律",
    coreQuestion: "今天我是否先立边界再行动？",
    dailyOutput: ["今日戒律", "行动边界", "不做清单"]
  },
  {
    id: "stage_02",
    stage: "照心",
    dayStart: 61,
    dayEnd: 120,
    theme: "识别真实心境",
    coreQuestion: "此刻牵动我的，是贪、惧、急，还是别的心念？",
    dailyOutput: ["今日心境", "今日禁忌", "照心提醒"]
  },
  {
    id: "stage_03",
    stage: "事上磨",
    dayStart: 121,
    dayEnd: 180,
    theme: "让规则进入行动",
    coreQuestion: "触发来临时，我有没有照着规则做？",
    dailyOutput: ["训练动作", "执行记录", "主修兑现"]
  },
  {
    id: "stage_04",
    stage: "破心贼",
    dayStart: 181,
    dayEnd: 240,
    theme: "克服人格惯性",
    coreQuestion: "今天是哪一个心贼在替我做决定？",
    dailyOutput: ["主人格触发", "心贼命名", "修正动作"]
  },
  {
    id: "stage_05",
    stage: "知行合一",
    dayStart: 241,
    dayEnd: 300,
    theme: "计划与执行一致",
    coreQuestion: "我说过的计划，是否成为盘中的行动？",
    dailyOutput: ["计划对照", "执行一致性", "知行指数"]
  },
  {
    id: "stage_06",
    stage: "致良知",
    dayStart: 301,
    dayEnd: 365,
    theme: "形成成熟交易人格",
    coreQuestion: "没有提醒时，我能否自己觉察、自己修正？",
    dailyOutput: ["自主复盘", "长期趋势", "成熟提醒"]
  }
];

const DAILY_HEART_PROOF_STRUCTURE = {
  version: "v1",
  totalDays: 365,
  principle: "365天心证不是金句库，而是每天一张可执行的修行卡。",
  chain: CULTIVATION_CHAIN,
  requiredFields: [
    {
      key: "day",
      type: "string",
      example: "Day001",
      role: "全端统一索引，小程序、网页、视频号、AI教练共用。"
    },
    {
      key: "stage",
      type: "string",
      example: "立志",
      role: "对应六大关卡，决定当日修行方向。"
    },
    {
      key: "title",
      type: "string",
      example: "先立其志，再入其事",
      role: "卡片标题和视频号标题的精神主题。"
    },
    {
      key: "heartProof",
      type: "string",
      example: "先立其志，再入其事。",
      role: "今日心证，用来定调，不负责刺激行动。"
    },
    {
      key: "commandment",
      type: "string",
      example: "无计划，不开仓。",
      role: "今日戒律，必须能被检查。"
    },
    {
      key: "trainingAction",
      type: "string",
      example: "开盘前写下今日只做什么、不做什么。",
      role: "今日行为动作，必须能完成、能打卡、能复盘。"
    },
    {
      key: "reflectionQuestion",
      type: "string",
      example: "今天我有没有在计划未立时就想行动？",
      role: "今日省察问题，驱动AI复盘和收盘记录。"
    },
    {
      key: "targetPersonalities",
      type: "string[]",
      example: ["冲动型", "拖延型"],
      role: "适配人格，决定推荐权重。"
    },
    {
      key: "scoreDimensions",
      type: "string[]",
      example: ["纪律执行", "系统一致性", "主修兑现"],
      role: "知行指数影响项，决定完成后的分数变化。"
    }
  ],
  consumers: {
    miniprogram: ["每日修行卡", "开盘照心", "知行指数", "关卡进度"],
    website: ["内容展示", "训练体系说明", "转化承接"],
    videoChannel: ["每日选题", "短视频脚本", "直播主题"],
    aiCoach: ["人格诊断", "今日戒律", "训练动作", "复盘追问"]
  },
  validationRules: [
    "每一天必须落到六大关卡之一。",
    "每一天必须适配至少一种九型人格。",
    "每一天必须影响至少一个知行指数维度。",
    "每日训练必须是行为动作，不允许只写理念。",
    "心证、戒律、训练、省察必须能互相解释。"
  ]
};

function normalizeDayNumber(day) {
  if (typeof day === "number") return day;
  if (typeof day !== "string") return 0;

  const match = day.match(/\d+/);
  if (!match) return 0;

  return Number(match[0]);
}

function getStageByDay(day) {
  const dayNumber = normalizeDayNumber(day);

  return STAGE_DAY_RANGES.find((item) => {
    return dayNumber >= item.dayStart && dayNumber <= item.dayEnd;
  }) || null;
}

module.exports = {
  CULTIVATION_CHAIN,
  STAGE_DAY_RANGES,
  DAILY_HEART_PROOF_STRUCTURE,
  getStageByDay
};
