const COMPLIANCE_TEXT = "本系统仅用于交易认知、事上练与风险教育；不推荐股票、不提供操作指令、不承诺结果。";

const PERSONALITIES = {
  "冲动型": {
    title: "冲动型",
    subtitle: "见动即动，知而未守",
    scenario: "盘面突然变快时，容易把兴奋当成评判。",
    trigger: "异动、热闹、错过感、群体情绪。",
    bias: "行动先于计划，省察时才发现理由不足。",
    xinxue: "心被外物牵走，知与行之间少了一次照见。",
    action: "下个事上练日只做一件事：行动前写下理由、边界、离场条件。",
    path: ["下单前十秒", "计划三问", "盘后照见"]
  },
  "扛单型": {
    title: "扛单型",
    subtitle: "明知当止，仍舍不得止",
    scenario: "走势不符合预设时，容易用希望代替规则。",
    trigger: "亏损不甘、面子、想等回来的念头。",
    bias: "把短暂拖延包装成长期耐心。",
    xinxue: "良知已经提醒，但私欲让自己继续解释。",
    action: "盘前写好无条件离场线，盘后只省察是否知行合一。",
    path: ["边界预写", "一线一行", "错后不补"]
  },
  "完美型": {
    title: "完美型",
    subtitle: "求全责备，心力耗散",
    scenario: "一次处理不理想，就开始反复自责。",
    trigger: "错过、瑕疵、他人评价、省察过度。",
    bias: "把省察变成惩罚，而不是克治。",
    xinxue: "省察不是责罚自己，而是看见下一步可改之处。",
    action: "今日省察只写一个可克治动作，不写自我否定。",
    path: ["一偏一改", "减法省察", "稳定知行"]
  },
  "赌徒型": {
    title: "赌徒型",
    subtitle: "越乱越想翻回节奏",
    scenario: "连续不顺后，动作会变大、变急、变重。",
    trigger: "急于恢复、情绪补偿、短时刺激。",
    bias: "把情绪修复误当成系统知行。",
    xinxue: "念头一起，先问它是良知，还是一口不甘。",
    action: "连续两次计划外动作后，当日只允许记录，不再追加动作。",
    path: ["停手规则", "情绪隔离", "省察归因"]
  },
  "从众型": {
    title: "从众型",
    subtitle: "众声入耳，主见动摇",
    scenario: "外部观点一致时，自己的计划开始松动。",
    trigger: "社群热度、朋友观点、榜单刺激。",
    bias: "用他人的确定感覆盖自己的系统。",
    xinxue: "致良知，是回到自己的规则和证据。",
    action: "盘中不看无关讨论，收盘后再统一整理信息。",
    path: ["信息隔离", "证据清单", "独立省察"]
  },
  "偏执型": {
    title: "偏执型",
    subtitle: "只看所愿，不看所证",
    scenario: "容易寻找支持自己评判的信息。",
    trigger: "已有立场、沉没成本、证明自己。",
    bias: "忽略反向证据，计划修正滞后。",
    xinxue: "格物不是证明自己对，而是让事实照见心。",
    action: "每次行动前必须写一条反向证据。",
    path: ["反证事上练", "事实复核", "计划修订"]
  },
  "拖延型": {
    title: "拖延型",
    subtitle: "知道要改，迟迟未行",
    scenario: "省察、记录、规则整理总被推到明天。",
    trigger: "怕麻烦、怕面对、缺少仪式感。",
    bias: "把懂了当成做到了。",
    xinxue: "知行合一的关键，是把一个小动作落地。",
    action: "今日只完成三分钟省察，不追求完整。",
    path: ["三分钟省察", "连续打卡", "小步闭环"]
  },
  "焦虑型": {
    title: "焦虑型",
    subtitle: "心随波动，越看越乱",
    scenario: "持仓波动时，会频繁查看并改变想法。",
    trigger: "浮动、消息、账户变化、开盘前后。",
    bias: "用高频关注换取安全感。",
    xinxue: "静不是不看市场，而是不被每一次波动牵走。",
    action: "设置固定观察时间，非观察窗口只记录念头。",
    path: ["观察窗口", "情绪命名", "低频知行"]
  },
  "平衡型": {
    title: "平衡型",
    subtitle: "能知能行，守中有度",
    scenario: "能把计划写清，并按节奏完成省察。",
    trigger: "主要风险来自连续顺利后的松懈。",
    bias: "稳定时容易轻视记录和边界。",
    xinxue: "良知不是一次清醒，而是每日不间断的照见。",
    action: "保持每日一省，用小记录守住稳定。",
    path: ["每日一省", "系统复测", "带练输出"]
  }
};

const QUESTIONS = [
  { id: "q1", type: "冲动型", text: "盘面突然变快时，我容易不等计划确认就行动。", dimension: "下单前延迟能力" },
  { id: "q2", type: "扛单型", text: "走势不符合预设时，我会拖着不处理，期待它自己修复。", dimension: "边界知行力" },
  { id: "q3", type: "完美型", text: "一次处理不理想后，我会反复自责，影响接下来的评判。", dimension: "省察克治力" },
  { id: "q4", type: "赌徒型", text: "连续不顺后，我会想用更激烈的动作找回节奏。", dimension: "情绪隔离力" },
  { id: "q5", type: "从众型", text: "外部观点很一致时，我会动摇自己的原计划。", dimension: "独立评判力" },
  { id: "q6", type: "偏执型", text: "我容易只看支持自己评判的信息，忽略反向证据。", dimension: "反证能力" },
  { id: "q7", type: "拖延型", text: "我知道省察重要，但常常把记录和克治推到明天。", dimension: "知行落地力" },
  { id: "q8", type: "焦虑型", text: "盘中波动时，我会频繁查看，越看越难保持稳定。", dimension: "心境稳定度" },
  { id: "q9", type: "平衡型", text: "我能先写清计划，再按固定节奏知行合一和省察。", dimension: "知行稳定度", positive: true }
];

const OPTIONS = [
  { label: "几乎不会", value: 0 },
  { label: "偶尔如此", value: 1 },
  { label: "经常如此", value: 2 },
  { label: "非常像我", value: 3 }
];

const TRAINING_PLANS = {
  "冲动型": {
    stage: "事上练",
    triggerScene: "看到盘面快速变化，心里出现“现在不动就错过”的念头。",
    oldReaction: "先行动，再回头找理由。",
    newReaction: "先停十秒，写下理由、边界、离场条件。",
    microTraining: "今天做一次“十秒停手”：行动前默数十秒，并记录那一刻的念头。",
    review: "收盘后只问：今天有没有先写计划再行动？",
    quote: "知是行之始，行是知之成。"
  },
  "扛单型": {
    stage: "省察克治",
    triggerScene: "走势触碰预设边界，心里开始替自己找理由。",
    oldReaction: "把“不甘心”解释成“再等等”。",
    newReaction: "边界出现，只按预案知行合一，不再临场辩论。",
    microTraining: "盘前写下一条无条件规则，盘后只检查是否照做。",
    review: "今天哪一刻良知已经提醒你，却被私欲压住？",
    quote: "破山中贼易，破心中贼难。"
  },
  "完美型": {
    stage: "致良知",
    triggerScene: "一个动作不够理想，开始不断责备自己。",
    oldReaction: "省察变成情绪惩罚。",
    newReaction: "只提炼一个可克治动作。",
    microTraining: "写一条“下次我会怎么做”，不写自我否定。",
    review: "今天的省察有没有帮你变清楚，而不是更沉重？",
    quote: "人须在事上磨，方立得住。"
  },
  "赌徒型": {
    stage: "克治私欲",
    triggerScene: "连续不顺后，想立刻用更大的动作找回节奏。",
    oldReaction: "越乱越急，越急越偏离系统。",
    newReaction: "连续两次计划外动作后，当日只记录不追加。",
    microTraining: "设置“停手线”：今天只要触发，就转入观察和记录。",
    review: "今天有没有把情绪修复误当成系统知行？",
    quote: "此心不动，随机而动。"
  },
  "从众型": {
    stage: "格物致知",
    triggerScene: "外部声音很热，自己的计划开始摇晃。",
    oldReaction: "用别人的确定感替代自己的评判。",
    newReaction: "先回到证据清单，收盘后再处理外部信息。",
    microTraining: "盘中关闭无关讨论，只保留自己的计划卡。",
    review: "今天哪一次你被外部声音牵走？",
    quote: "心外无理，心外无事。"
  },
  "偏执型": {
    stage: "格物",
    triggerScene: "已有评判后，只愿意看支持自己的信息。",
    oldReaction: "反向证据出现也继续解释。",
    newReaction: "每次行动前写一条反向证据。",
    microTraining: "完成一次“反证一分钟”：主动找出一个不利条件。",
    review: "今天有没有因为想证明自己，而忽略事实？",
    quote: "格物者，格其心之物也。"
  },
  "拖延型": {
    stage: "知行合一",
    triggerScene: "知道要记录，却总觉得今天先算了。",
    oldReaction: "懂了很多，落地很少。",
    newReaction: "用三分钟完成最小闭环。",
    microTraining: "只写三行：触发、反应、明日修正。",
    review: "今天是否完成了一个小动作，而不是只想明白？",
    quote: "未有知而不行者，知而不行只是未知。"
  },
  "焦虑型": {
    stage: "静中见心",
    triggerScene: "波动放大，心随屏幕起伏。",
    oldReaction: "反复查看，用频率寻找安全感。",
    newReaction: "固定观察窗口，窗口外只记录情绪。",
    microTraining: "设置三个观察点，其余时间只写下念头，不做临时动作。",
    review: "今天有没有把焦虑交给屏幕处理？",
    quote: "心即理也，此心安处是吾乡。"
  },
  "平衡型": {
    stage: "守中",
    triggerScene: "连续稳定后，容易放松记录。",
    oldReaction: "觉得自己已经会了，省略基础动作。",
    newReaction: "稳定时更要保留小记录。",
    microTraining: "今天继续做“每日一省”，只写最重要的一念。",
    review: "稳定是否来自系统，而不是一时顺手？",
    quote: "良知人人皆有，圣愚之分，只在存养省察。"
  }
};

const DAILY_INSIGHTS = [
  {
    status: "知而未行",
    reflection: "明知该守规则，临盘却容易被一念牵走。",
    action: "行动前写下三问：理由、边界、离场条件。"
  },
  {
    status: "事上练",
    reflection: "市场不是扰乱你的地方，而是照见你的地方。",
    action: "今天只事上练一个动作：看见情绪，不急着跟随。"
  },
  {
    status: "致良知",
    reflection: "真正的纪律，不是压住情绪，而是看清它从哪里来。",
    action: "收盘后写下今天最强的一念，以及你如何回应它。"
  }
];

module.exports = {
  COMPLIANCE_TEXT,
  PERSONALITIES,
  QUESTIONS,
  OPTIONS,
  TRAINING_PLANS,
  DAILY_INSIGHTS
};
