const PERSONALITY_STAGE_MAP = {
  "冲动型": {
    stageKey: "zhaoxin",
    stageName: "第2关：照心",
    heartThief: "怕错过",
    commandment: "行动前三息，理由未明不动。",
    training: "出现想立刻行动的念头时，先等待10秒，再写下边界。",
    stageReason: "冲动型的关键不是多学评判，而是先把心从盘面刺激里收回来。",
    trainingCard: {
      trigger: "盘面突然变快，心里出现现在不动就错过。",
      action: "停10秒，写下理由、边界、离场条件。",
      review: "今天有没有行动先于计划？"
    },
    cost: "常把盘面刺激当成机会，事后才发现行动早于计划。"
  },
  "扛单型": {
    stageKey: "zhixing",
    stageName: "第5关：知行合一",
    heartThief: "不愿认错",
    commandment: "边界已到，不再解释。",
    training: "触发预设边界后，只按原计划知行合一，不临场改条件。",
    stageReason: "扛单型已经知道边界，却容易在行动处失守，所以主修知行合一。",
    trainingCard: {
      trigger: "走势触碰预设边界，心里开始找理由。",
      action: "只按原计划知行合一，不移动边界，不补充解释。",
      review: "今天哪一次边界到了，我是否照做？"
    },
    cost: "小偏离会被拖成大偏离，账户代价来自一次次不愿止于边界。"
  },
  "赌徒型": {
    stageKey: "shishangmo",
    stageName: "第3关：事上磨",
    heartThief: "急于补回",
    commandment: "连续不顺，禁止加大动作。",
    training: "出现冲动时等待30秒，把念头写成一句省察。",
    stageReason: "赌徒型需要在真实触发里磨，不靠道理压住不甘。",
    trainingCard: {
      trigger: "连续不顺后，想用更大的动作找回节奏。",
      action: "等待30秒，只记录念头，不追加动作。",
      review: "今天有没有把不甘包装成机会？"
    },
    cost: "真正消耗账户的不是一次评判，而是不甘心后的连续动作。"
  },
  "焦虑型": {
    stageKey: "zhaoxin",
    stageName: "第2关：照心",
    heartThief: "求确定",
    commandment: "心乱时，动作要更少。",
    training: "只在固定观察窗口查看盘面，窗口外只记录心境。",
    stageReason: "焦虑型先修照心，降低关注频率，才能重新回到系统。",
    trainingCard: {
      trigger: "盘中波动放大，想反复确认。",
      action: "只在固定窗口观察，窗口外写下心境。",
      review: "今天我是否用高频查看换安全感？"
    },
    cost: "频繁确认会把注意力耗尽，让计划被每一次波动牵走。"
  },
  "完美型": {
    stageKey: "poxinzei",
    stageName: "第4关：破心贼",
    heartThief: "苛责求全",
    commandment: "一错一改，不责其心。",
    training: "省察只写一个可克治动作，不做长篇自责。",
    stageReason: "完美型要破的是把省察变成自责的心贼。",
    trainingCard: {
      trigger: "一次处理不理想后，开始反复自责。",
      action: "只写一个下次可克治动作。",
      review: "今天省察是在克治，还是在惩罚自己？"
    },
    cost: "过度追求正确，会让省察从克治变成内耗。"
  },
  "从众型": {
    stageKey: "zhixing",
    stageName: "第5关：知行合一",
    heartThief: "随众失主",
    commandment: "众声入耳，先问本心。",
    training: "行动前只看自己的计划卡，不用外部声音替代证据。",
    stageReason: "从众型要把外部确定感还给外部，把行动交还给自己的系统。",
    trainingCard: {
      trigger: "外部观点很热，自己的计划开始摇晃。",
      action: "盘中只看计划卡，收盘后再处理外部信息。",
      review: "今天我有没有让别人的确定替代自己的证据？"
    },
    cost: "账户代价来自把他人的确定感，误当成自己的系统。"
  },
  "偏执型": {
    stageKey: "poxinzei",
    stageName: "第4关：破心贼",
    heartThief: "执己为理",
    commandment: "先格物，再立言。",
    training: "行动前必须写下一条反向证据，让事实先于立场。",
    stageReason: "偏执型要破的是证明自己，而不是看见事实。",
    trainingCard: {
      trigger: "已有评判后，只愿意看支持自己的信息。",
      action: "行动前写一条反向证据。",
      review: "今天我有没有用解释保护原评判？"
    },
    cost: "越投入越难承认偏离，最后用解释保护偏差。"
  },
  "拖延型": {
    stageKey: "lizhi",
    stageName: "第1关：立志",
    heartThief: "知而不行",
    commandment: "今日事，今日省。",
    training: "收盘后三分钟写下触发、反应、明日修正。",
    stageReason: "拖延型先回到立志，把最小动作落地，才算真的开始。",
    trainingCard: {
      trigger: "知道要记录，却想明天再说。",
      action: "三分钟写下触发、反应、明日修正。",
      review: "今天我完成了一个动作，还是只想明白？"
    },
    cost: "心中之贼不是不知道，而是每次都把克治推给明天。"
  },
  "平衡型": {
    stageKey: "zhiliangzhi",
    stageName: "第6关：致良知",
    heartThief: "稳定生怠",
    commandment: "稳定时，更要守一。",
    training: "不因状态稳定省略照心、事上练、省察三件小事。",
    stageReason: "平衡型的风险是稳定后的省略，要把清醒修成存养。",
    trainingCard: {
      trigger: "状态稳定，想省略基础记录。",
      action: "照心、事上练、省察三件事照常做。",
      review: "今天的稳定来自系统，还是来自一时顺手？"
    },
    cost: "稳定若没有存养，会慢慢变成松懈。"
  }
};

const PERSONALITY_STAGE_SCHEMA = {
  version: "v1",
  types: Object.keys(PERSONALITY_STAGE_MAP),
  requiredFields: ["stageKey", "heartThief", "commandment", "training", "stageReason", "trainingCard", "cost"],
  outputFields: ["当前主修关卡", "当前心贼", "今日戒律", "今日事上练", "账户代价"]
};

const DEFAULT_PERSONALITY_STAGE = PERSONALITY_STAGE_MAP["平衡型"];

function getPersonalityStagePlan(type) {
  return PERSONALITY_STAGE_MAP[type] || DEFAULT_PERSONALITY_STAGE;
}

function buildPersonalityStageBlocks(type) {
  const plan = getPersonalityStagePlan(type);
  return [
    { title: "当前主修关卡", content: plan.stageName },
    { title: "当前心贼", content: plan.heartThief },
    { title: "主修原因", content: plan.stageReason },
    { title: "今日戒律", content: plan.commandment },
    { title: "今日事上练", content: plan.training },
    { title: "账户代价", content: plan.cost }
  ];
}

function buildPersonalityTrainingCard(type) {
  const plan = getPersonalityStagePlan(type);
  return {
    personalityType: type || "平衡型",
    stageKey: plan.stageKey,
    stageName: plan.stageName,
    heartThief: plan.heartThief,
    commandment: plan.commandment,
    trigger: plan.trainingCard.trigger,
    action: plan.trainingCard.action,
    review: plan.trainingCard.review
  };
}

module.exports = {
  PERSONALITY_STAGE_SCHEMA,
  PERSONALITY_STAGE_MAP,
  getPersonalityStagePlan,
  buildPersonalityStageBlocks,
  buildPersonalityTrainingCard
};
