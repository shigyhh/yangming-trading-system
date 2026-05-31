const SIX_STAGE_RULE_SCHEMA = {
  version: "v1",
  role: "六大关卡规则库",
  principle: "六大关卡不是导航菜单，而是人格训练的成长路径。",
  chain: ["人格", "主修关卡", "每日训练", "知行指数", "关卡进度"],
  requiredFields: [
    "id",
    "name",
    "dayRange",
    "goal",
    "coreProblem",
    "completionCriteria",
    "trainingActions",
    "graduationCriteria",
    "scoreDimensions",
    "personalityFocus"
  ]
};

const SIX_STAGE_RULES = [
  {
    id: "stage_01",
    name: "立志",
    dayRange: "Day001-Day060",
    goal: "建立交易戒律。",
    coreProblem: "有想法，但没有把行动边界立在情绪之前。",
    completionCriteria: ["有交易计划", "有仓位规则", "有止损规则"],
    trainingActions: ["写下今日计划", "写下今日最大仓位", "写下今日不做清单", "写下触发止损后的唯一动作"],
    graduationCriteria: ["连续7个交易日盘前有计划", "能说清今日什么情况下不行动", "计划能被盘后检查"],
    scoreDimensions: ["纪律执行", "系统一致性", "主修兑现"],
    personalityFocus: ["拖延型", "冲动型", "平衡型"],
    dailyCardRule: "立志关的每日卡必须让用户写下边界，而不是只获得一句提醒。"
  },
  {
    id: "stage_02",
    name: "照心",
    dayRange: "Day061-Day120",
    goal: "识别真实心境。",
    coreProblem: "用户以为自己在看市场，其实先被贪、惧、急带走。",
    completionCriteria: ["能识别贪", "能识别惧", "能识别急", "能把心境转成禁忌"],
    trainingActions: ["开盘前选择心境", "写下今日禁忌", "命名当前心贼", "写下今天只练一件事"],
    graduationCriteria: ["连续7次完成照心", "能分清情绪和判断", "心境能关联当天训练"],
    scoreDimensions: ["情绪稳定", "临盘克制", "主修兑现"],
    personalityFocus: ["冲动型", "焦虑型", "从众型"],
    dailyCardRule: "照心关的每日卡必须先命名心境，再给动作。"
  },
  {
    id: "stage_03",
    name: "事上磨",
    dayRange: "Day121-Day180",
    goal: "让规则进入行动。",
    coreProblem: "懂规则不难，难的是触发时仍然照做。",
    completionCriteria: ["止损执行", "不追涨", "不扛单", "不做补偿式行动"],
    trainingActions: ["照见触发", "完成微训练", "写下一句省察", "记录系统内执行"],
    graduationCriteria: ["连续20次系统内执行", "触发边界时不临场谈判", "训练记录能说明旧反应和新动作"],
    scoreDimensions: ["纪律执行", "临盘克制", "主修兑现"],
    personalityFocus: ["冲动型", "扛单型", "赌徒型", "拖延型"],
    dailyCardRule: "事上磨关的每日卡必须落到一个盘中动作。"
  },
  {
    id: "stage_04",
    name: "破心贼",
    dayRange: "Day181-Day240",
    goal: "克服人格惯性。",
    coreProblem: "反复出错的地方，往往不是技术点，而是主人格在替用户行动。",
    completionCriteria: ["识别主人格", "命名当前心贼", "修正主人格惯性"],
    trainingActions: ["完成人格识别", "记录触发场景", "把心贼改写成戒律", "把戒律改写成训练动作"],
    graduationCriteria: ["连续14天能识别主人格触发", "能把触发转成训练动作", "知行指数中的主修兑现持续提升"],
    scoreDimensions: ["情绪稳定", "系统一致性", "主修兑现"],
    personalityFocus: ["赌徒型", "完美型", "偏执型"],
    dailyCardRule: "破心贼关的每日卡必须指出旧惯性和新动作。"
  },
  {
    id: "stage_05",
    name: "知行合一",
    dayRange: "Day241-Day300",
    goal: "计划与执行一致。",
    coreProblem: "最大裂缝不是不知道，而是说过的计划没有成为行动。",
    completionCriteria: ["连续执行", "不临盘改计划", "盘后完成知行对照"],
    trainingActions: ["盘前写计划", "盘中按计划执行", "盘后对照知与行", "记录偏离原因"],
    graduationCriteria: ["连续30天有知行记录", "临盘改计划显著下降", "知行指数形成稳定趋势"],
    scoreDimensions: ["纪律执行", "系统一致性", "临盘克制", "主修兑现"],
    personalityFocus: ["扛单型", "从众型", "偏执型", "平衡型"],
    dailyCardRule: "知行合一关的每日卡必须能对照计划与行动差距。"
  },
  {
    id: "stage_06",
    name: "致良知",
    dayRange: "Day301-Day365",
    goal: "形成成熟交易人格。",
    coreProblem: "成熟不是一次冷静，而是长期能自主觉察、复盘和修正。",
    completionCriteria: ["自主复盘", "自主觉察", "长期稳定"],
    trainingActions: ["每日省察", "每周复看知行趋势", "只修正一个关键动作", "无人提醒时仍守流程"],
    graduationCriteria: ["连续60天自主修行", "能自己发现情绪触发和人格惯性", "知行指数稳定在成熟区间"],
    scoreDimensions: ["情绪稳定", "系统一致性", "主修兑现"],
    personalityFocus: ["完美型", "平衡型", "偏执型"],
    dailyCardRule: "致良知关的每日卡必须减少外部命令，强化自主觉察。"
  }
];

module.exports = {
  SIX_STAGE_RULE_SCHEMA,
  SIX_STAGE_RULES
};
