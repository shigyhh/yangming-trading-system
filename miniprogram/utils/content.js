const COMPLIANCE_TEXT = "本系统用于交易心理觉察与训练，不提供投资建议，不预测行情，不构成任何操作依据。";

const HEART_THIEVES = {
  tan: { key: "tan", name: "贪", title: "第一贼：贪", description: "见涨就追，容易把热闹当成确定。" },
  ju: { key: "ju", name: "惧", title: "第二贼：惧", description: "见跌就慌，容易把波动当成危险。" },
  ji: { key: "ji", name: "急", title: "第三贼：急", description: "失守后想一把补回，越急越乱。" },
  chi: { key: "chi", name: "痴", title: "第四贼：痴", description: "错了还幻想反转，不愿回看事实。" },
  man: { key: "man", name: "慢", title: "第五贼：慢", description: "知道错却不肯动手，知与行断开。" },
  yi: { key: "yi", name: "疑", title: "第六贼：疑", description: "系统条件出现却不敢执行，反复怀疑自己。" }
};

const MIRROR_BINDINGS = {
  "冲动型": { mirrorName: "追涨之镜", heartMirrorName: "追涨之镜", aliases: [], thieves: ["贪", "急"], virtue: "" },
  "扛单型": { mirrorName: "扛单之镜", heartMirrorName: "扛单之镜", aliases: [], thieves: ["痴", "慢"], virtue: "" },
  "完美型": { mirrorName: "错过之镜", heartMirrorName: "犹疑之镜", aliases: ["等完美点位之镜", "犹疑之镜"], thieves: ["疑", "惧"], virtue: "" },
  "赌徒型": { mirrorName: "翻本之镜", heartMirrorName: "赌性之镜", aliases: ["赌性之镜"], thieves: ["贪", "急", "痴"], virtue: "" },
  "从众型": { mirrorName: "跟风之镜", heartMirrorName: "从众之镜", aliases: ["从众之镜"], thieves: ["疑", "惧"], virtue: "" },
  "偏执型": { mirrorName: "证明之镜", heartMirrorName: "幻想之镜", aliases: ["幻想之镜"], thieves: ["痴"], virtue: "" },
  "拖延型": { mirrorName: "不复盘之镜", heartMirrorName: "拖延之镜", aliases: ["拖延之镜"], thieves: ["慢"], virtue: "" },
  "焦虑型": { mirrorName: "空仓焦虑之镜", heartMirrorName: "焦虑之镜", aliases: ["止盈过早之镜", "焦虑之镜"], thieves: ["惧", "疑"], virtue: "" },
  "平衡型": { mirrorName: "守心之镜", heartMirrorName: "良知之镜", aliases: ["良知之镜"], thieves: [], virtue: "知止、守心、执行" }
};

function getMirrorBinding(type) {
  return MIRROR_BINDINGS[type] || MIRROR_BINDINGS["平衡型"];
}

const PERSONALITIES = {
  "冲动型": {
    title: "冲动型",
    mirrorName: MIRROR_BINDINGS["冲动型"].mirrorName,
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
    mirrorName: MIRROR_BINDINGS["扛单型"].mirrorName,
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
    mirrorName: MIRROR_BINDINGS["完美型"].mirrorName,
    mirrorAlias: MIRROR_BINDINGS["完美型"].aliases.join(" / "),
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
    mirrorName: MIRROR_BINDINGS["赌徒型"].mirrorName,
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
    mirrorName: MIRROR_BINDINGS["从众型"].mirrorName,
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
    mirrorName: MIRROR_BINDINGS["偏执型"].mirrorName,
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
    mirrorName: MIRROR_BINDINGS["拖延型"].mirrorName,
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
    mirrorName: MIRROR_BINDINGS["焦虑型"].mirrorName,
    mirrorAlias: MIRROR_BINDINGS["焦虑型"].aliases.join(" / "),
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
    mirrorName: MIRROR_BINDINGS["平衡型"].mirrorName,
    subtitle: "能知能行，守中有度",
    scenario: "能把计划写清，并按节奏完成省察。",
    trigger: "主要风险来自连续顺利后的松懈。",
    bias: "稳定时容易轻视记录和边界。",
    xinxue: "良知不是一次清醒，而是每日不间断的照见。",
    action: "保持每日一省，用小记录守住稳定。",
    path: ["每日一省", "系统复测", "带练输出"]
  }
};

const ASSESSMENT_MODES = [
  { key: "9", label: "9 题快照", count: 9, perType: 1, desc: "九型各 1 题，1 分钟先照见" },
  { key: "27", label: "27 题标准", count: 27, perType: 3, desc: "九型各 3 题，适合首次报告" },
  { key: "45", label: "45 题进阶", count: 45, perType: 5, desc: "九型各 5 题，适合训练处方" },
  { key: "81", label: "81 题深测", count: 81, perType: 9, desc: "九型各 9 题，适合训练营深修" },
  { key: "108", label: "108 题复测", count: 108, perType: 12, desc: "九型各 12 题，适合阶段复测" }
];

const QUESTION_TRIGGER_BY_TYPE = {
  "冲动型": "盘面变快、错过感、热闹感",
  "扛单型": "边界触碰、不甘心、想再等等",
  "完美型": "条件不完整、怕犯错、想等完美点位",
  "赌徒型": "连续不顺、情绪补偿、想立刻扳回状态",
  "从众型": "外部观点一致、群体情绪变热",
  "偏执型": "已有判断被挑战、想证明自己",
  "拖延型": "需要记录、复盘或执行关键动作",
  "焦虑型": "波动放大、不确定感增强、空仓不安",
  "平衡型": "连续稳定后，仍要守住每日记录"
};

const QUESTION_BOUNDARY_BY_TYPE = {
  "冲动型": "真正要练的不是更快行动，而是在盘面变快时，还能等计划确认。",
  "扛单型": "真正要练的不是继续解释，而是边界出现时，先回到原先写下的规则。",
  "完美型": "真正要练的不是等到完美，而是允许自己用小步验证完成一次知行。",
  "赌徒型": "真正要练的不是把状态立刻扳回，而是先看见那一口不甘。",
  "从众型": "真正要练的不是寻找外部确定感，而是回到自己的证据和边界。",
  "偏执型": "真正要练的不是证明原判断，而是允许事实照见并修正自己。",
  "拖延型": "真正要练的不是想清楚一切，而是把三分钟复盘先落下来。",
  "焦虑型": "真正要练的不是立刻安心，而是让不确定感存在，同时守住节奏。",
  "平衡型": "真正要练的是稳定之后不松懈，继续每日省察。"
};

const ASSESSMENT_QUESTION_BANK = [
  { id: "q_impulse_1", type: "冲动型", text: "盘面突然变快时，我容易不等计划确认就行动。", dimension: "下单前延迟能力" },
  { id: "q_impulse_2", type: "冲动型", text: "看到剧烈波动时，我会先感到兴奋，再补一个理由。", dimension: "第一念觉察" },
  { id: "q_impulse_3", type: "冲动型", text: "我最怕错过，越怕错过越容易提前行动。", dimension: "错过感耐受" },
  { id: "q_impulse_4", type: "冲动型", text: "计划还没写完整，我的手已经想先动。", dimension: "行动前停顿" },
  { id: "q_impulse_5", type: "冲动型", text: "波动越热闹，我越难慢下来确认边界。", dimension: "热闹隔离力" },

  { id: "q_hold_1", type: "扛单型", text: "走势不符合预设时，我会拖着不处理，期待它自己修复。", dimension: "边界知行力" },
  { id: "q_hold_2", type: "扛单型", text: "边界被触碰时，我会开始替自己找新的解释。", dimension: "边界触发反应" },
  { id: "q_hold_3", type: "扛单型", text: "我明明知道该复核计划，却常被不甘心留住。", dimension: "不甘克治力" },
  { id: "q_hold_4", type: "扛单型", text: "我会把短暂拖延说成再观察一下。", dimension: "拖延识别力" },
  { id: "q_hold_5", type: "扛单型", text: "越接近边界，我越想证明原来的判断没有错。", dimension: "边界承认力" },

  { id: "q_perfect_1", type: "完美型", text: "一次处理不理想后，我会反复自责，影响接下来的评判。", dimension: "省察克治力" },
  { id: "q_perfect_2", type: "完美型", text: "条件不够完整时，我很难允许自己做小步验证。", dimension: "小步验证力" },
  { id: "q_perfect_3", type: "完美型", text: "我容易把复盘做成责备，而不是提炼下次动作。", dimension: "复盘减法力" },
  { id: "q_perfect_4", type: "完美型", text: "我总想等所有条件都清楚，才觉得心里安全。", dimension: "控制感识别" },
  { id: "q_perfect_5", type: "完美型", text: "一旦没有做到理想状态，我会怀疑整个训练是否有效。", dimension: "不完美容纳力" },

  { id: "q_gambler_1", type: "赌徒型", text: "连续不顺后，我会想用更激烈的动作找回节奏。", dimension: "情绪隔离力" },
  { id: "q_gambler_2", type: "赌徒型", text: "情绪上来时，我会想用一次大动作改变当下感受。", dimension: "仓位边界感" },
  { id: "q_gambler_3", type: "赌徒型", text: "越不舒服，我越想立刻把局面拉回来。", dimension: "补偿冲动" },
  { id: "q_gambler_4", type: "赌徒型", text: "我有时明知心乱，却仍想继续做点什么。", dimension: "停手能力" },
  { id: "q_gambler_5", type: "赌徒型", text: "刺激感一强，我会忽略自己原先设定的节奏。", dimension: "刺激耐受力" },

  { id: "q_crowd_1", type: "从众型", text: "外部观点很一致时，我会动摇自己的原计划。", dimension: "独立评判力" },
  { id: "q_crowd_2", type: "从众型", text: "别人越笃定，我越容易怀疑自己的证据不够。", dimension: "外部声音隔离" },
  { id: "q_crowd_3", type: "从众型", text: "热闹的信息出现后，我会想赶紧跟上大家的节奏。", dimension: "群体情绪觉察" },
  { id: "q_crowd_4", type: "从众型", text: "我容易先看别人怎么说，再决定自己怎么看。", dimension: "自证能力" },
  { id: "q_crowd_5", type: "从众型", text: "如果身边人都很兴奋，我会很难保持自己的边界。", dimension: "共振隔离力" },

  { id: "q_stubborn_1", type: "偏执型", text: "我容易只看支持自己评判的信息，忽略反向证据。", dimension: "反证能力" },
  { id: "q_stubborn_2", type: "偏执型", text: "形成判断后，我会下意识寻找证明自己的内容。", dimension: "观点松动度" },
  { id: "q_stubborn_3", type: "偏执型", text: "事实和我预想不一致时，我会先想解释，而不是先承认。", dimension: "事实承认力" },
  { id: "q_stubborn_4", type: "偏执型", text: "我不喜欢在当下推翻自己的原判断。", dimension: "计划修订力" },
  { id: "q_stubborn_5", type: "偏执型", text: "我越想证明自己，越容易听不进反向提醒。", dimension: "证明心觉察" },

  { id: "q_delay_1", type: "拖延型", text: "我知道省察重要，但常常把记录和克治推到明天。", dimension: "知行落地力" },
  { id: "q_delay_2", type: "拖延型", text: "条件已经出现时，我还会想再等等再说。", dimension: "关键动作启动" },
  { id: "q_delay_3", type: "拖延型", text: "我容易把想清楚，当成已经做到了。", dimension: "行动闭环力" },
  { id: "q_delay_4", type: "拖延型", text: "复盘模板越复杂，我越容易干脆不写。", dimension: "最小复盘力" },
  { id: "q_delay_5", type: "拖延型", text: "我常把一个很小的训练动作拖成很大的心理负担。", dimension: "小步启动力" },

  { id: "q_anxiety_1", type: "焦虑型", text: "盘中波动时，我会频繁查看，越看越难保持稳定。", dimension: "心境稳定度" },
  { id: "q_anxiety_2", type: "焦虑型", text: "不确定感一强，我会急着寻找立刻安心的办法。", dimension: "不确定耐受" },
  { id: "q_anxiety_3", type: "焦虑型", text: "我会把一次正常波动，感受成对自己的压力。", dimension: "波动容纳力" },
  { id: "q_anxiety_4", type: "焦虑型", text: "情绪紧张时，我会很难按原来的节奏观察。", dimension: "节奏守护力" },
  { id: "q_anxiety_5", type: "焦虑型", text: "我越想确认安全，心里越难安定下来。", dimension: "安心依赖度" },

  { id: "q_balance_1", type: "平衡型", text: "我能先写清计划，再按固定节奏知行合一和省察。", dimension: "知行稳定度", positive: true },
  { id: "q_balance_2", type: "平衡型", text: "即使心里有波动，我也能先回到边界和复盘依据。", dimension: "守界稳定度", positive: true },
  { id: "q_balance_3", type: "平衡型", text: "我能把一次偏离看成训练材料，而不是自我否定。", dimension: "复盘成熟度", positive: true },
  { id: "q_balance_4", type: "平衡型", text: "连续顺利时，我仍会保留记录和省察动作。", dimension: "稳定后不松懈", positive: true },
  { id: "q_balance_5", type: "平衡型", text: "我能分清事实、念头、情绪，不急着把它们混成一个判断。", dimension: "照见清晰度", positive: true }
];

const QUESTION_SCENES = [
  { key: "pre_open", label: "开盘前", trigger: "准备进入观察窗口时" },
  { key: "open_fast", label: "开盘加速", trigger: "盘面刚变快时" },
  { key: "pull_fast", label: "快速拉升", trigger: "波动突然变热时" },
  { key: "drop_fast", label: "突然下跌", trigger: "压力迅速靠近边界时" },
  { key: "near_boundary", label: "临近边界", trigger: "边界被触碰前后" },
  { key: "missed", label: "错过波动", trigger: "错过一段明显变化后" },
  { key: "sideways", label: "横盘震荡", trigger: "迟迟没有清晰方向时" },
  { key: "fake_break", label: "假突破", trigger: "看似突破又回落时" },
  { key: "pullback", label: "盈利回撤", trigger: "已有成果开始回撤时" },
  { key: "loss_streak", label: "连续不顺", trigger: "连续不顺以后" },
  { key: "after_error", label: "错后省察", trigger: "刚发现自己偏离计划后" },
  { key: "crowd_hot", label: "众声很热", trigger: "外部声音突然一致时" },
  { key: "quiet_market", label: "安静盘面", trigger: "外在很安静但内心不安时" },
  { key: "late_day", label: "尾盘收束", trigger: "一天快要结束时" },
  { key: "review_time", label: "收盘复盘", trigger: "需要回看自己当时反应时" },
  { key: "next_plan", label: "计划重写", trigger: "准备修订下一次计划时" },
  { key: "after_gain", label: "连续顺利", trigger: "连续顺利以后" },
  { key: "after_news", label: "信息扰动", trigger: "外部信息让心里起伏时" },
  { key: "alone_decide", label: "独自判断", trigger: "没人能替你做判断时" },
  { key: "training_day", label: "每日训练", trigger: "今天只需要完成一个小动作时" }
];

const TYPE_DIMENSIONS = {
  "冲动型": ["下单前延迟", "错过感耐受", "热闹隔离", "第一念命名", "行动前停顿", "计划确认", "速度克制", "边界预写", "触发识别", "手感降温", "理由清晰", "情绪暂停", "仓位节制", "频率控制", "等待能力", "观察窗口", "计划三问", "急躁克治", "冲动复盘", "知行转身"],
  "扛单型": ["边界承认", "不甘克治", "事实复核", "离场预案", "拖延识别", "幻想停止", "规则回归", "损失容纳", "承认失守", "边界执行", "解释停止", "计划复读", "情绪隔离", "一线一行", "复盘诚实", "希望识别", "临界停顿", "心贼觉察", "知行一致", "错后不补"],
  "完美型": ["不完美容纳", "小步验证", "自责收束", "确认依赖", "控制感识别", "减法复盘", "允许试错", "计划简化", "错过接受", "完美等待", "瑕疵承受", "标准松动", "一偏一改", "动作落地", "判断轻放", "复盘温度", "稳定启动", "不求全", "清晰边界", "今日一事"],
  "赌徒型": ["补偿冲动", "停手能力", "刺激耐受", "情绪隔离", "放大动作识别", "连续不顺收束", "不甘命名", "仓位边界", "节奏降速", "当日收手", "冲动隔离", "状态复位", "证明心暂停", "急躁冷却", "动作减量", "纪律复归", "复盘归因", "过热降温", "一口气识别", "知止练习"],
  "从众型": ["独立评判", "外部声音隔离", "群体情绪觉察", "证据清单", "主见守护", "信息节制", "社群降噪", "计划稳固", "观点分离", "自证能力", "共振识别", "他人确定感", "回到事实", "意见延迟", "独处判断", "边界自守", "比较降温", "从众复盘", "疑惧命名", "心中有主"],
  "偏执型": ["反证能力", "事实承认", "观点松动", "证明心觉察", "计划修订", "反向证据", "立场放下", "解释停止", "沉没成本识别", "纠偏能力", "承认不一致", "执念松开", "事实优先", "自我校准", "复盘客观", "不争对错", "证据更新", "控制感放下", "心念回看", "良知转身"],
  "拖延型": ["知行落地", "最小复盘", "关键动作启动", "三分钟完成", "小步闭环", "记录启动", "今日不拖", "行动减负", "复盘简化", "面对不适", "明日借口识别", "启动仪式", "执行落点", "任务收束", "一念一记", "立即记录", "边界行动", "省察不逃", "惯性打断", "知行合一"],
  "焦虑型": ["不确定耐受", "空仓不安", "频繁查看", "节奏守护", "波动容纳", "安心依赖", "情绪命名", "观察窗口", "安全感来源", "呼吸停顿", "低频知行", "心境稳定", "怕错过识别", "怕失控识别", "屏幕依赖", "情绪边界", "信息节制", "紧张复盘", "稳定等待", "守心练习"],
  "平衡型": ["知行稳定", "守界稳定", "复盘成熟", "稳定后不松", "事实念头分离", "每日一省", "边界自明", "计划清晰", "情绪不随", "节奏自守", "温和复盘", "小记录延续", "系统一致", "稳中觉察", "不骄不躁", "良知存养", "连续守心", "清明行动", "自我校准", "守一练习"]
};

const TYPE_REACTION_TEXT = {
  "冲动型": "我容易先想立刻行动，再回头补理由",
  "扛单型": "我容易继续解释，希望情况自己修复",
  "完美型": "我容易等到足够完美，才允许自己动一步",
  "赌徒型": "我容易想用更大的动作把状态拉回来",
  "从众型": "我容易被外部声音带走，忘了自己的证据",
  "偏执型": "我容易寻找能证明自己的材料",
  "拖延型": "我容易把该做的小记录推到之后",
  "焦虑型": "我容易反复确认，越确认越难安定",
  "平衡型": "我仍能先看事实、念头和边界，再决定下一步"
};

const TYPE_KEYS = {
  "冲动型": "impulse",
  "扛单型": "hold",
  "完美型": "perfect",
  "赌徒型": "gambler",
  "从众型": "crowd",
  "偏执型": "stubborn",
  "拖延型": "delay",
  "焦虑型": "anxiety",
  "平衡型": "balance"
};

const GENERATED_BANK_TARGET_PER_TYPE = 400;
let generatedAssessmentBankCache = null;

function buildAssessmentQuestionBank() {
  if (generatedAssessmentBankCache) return generatedAssessmentBankCache;
  const bank = [];
  Object.keys(PERSONALITIES).forEach((type) => {
    const base = ASSESSMENT_QUESTION_BANK.filter((question) => question.type === type);
    base.forEach((question) => bank.push(question));
    const dimensions = TYPE_DIMENSIONS[type] || [];
    const reaction = TYPE_REACTION_TEXT[type] || "我会看见自己的第一反应";
    const needed = Math.max(0, GENERATED_BANK_TARGET_PER_TYPE - base.length);
    let added = 0;
    dimensions.forEach((dimension, dimensionIndex) => {
      QUESTION_SCENES.forEach((scene, sceneIndex) => {
        if (added >= needed) return;
        const seq = added + 1;
        bank.push({
          id: `qb_${TYPE_KEYS[type] || "type"}_${dimensionIndex + 1}_${sceneIndex + 1}`,
          type,
          text: `${scene.trigger}，${reaction}。`,
          dimension,
          trigger: `${scene.label} · ${scene.trigger}`,
          boundaryInsight: `${QUESTION_BOUNDARY_BY_TYPE[type]} 本题观察「${dimension}」。`,
          weights: { [type]: type === "平衡型" ? 0.85 : 1 },
          positive: type === "平衡型",
          generated: true,
          seq
        });
        added += 1;
      });
    });
  });
  generatedAssessmentBankCache = bank.slice(0, Object.keys(PERSONALITIES).length * GENERATED_BANK_TARGET_PER_TYPE);
  return generatedAssessmentBankCache;
}

function getAssessmentQuestionBank() {
  return buildAssessmentQuestionBank();
}

function getQuestionBankStats() {
  const bank = getAssessmentQuestionBank();
  const byType = bank.reduce((counts, question) => {
    counts[question.type] = (counts[question.type] || 0) + 1;
    return counts;
  }, {});
  return {
    total: bank.length,
    byType,
    modes: ASSESSMENT_MODES.map((mode) => ({ key: mode.key, count: mode.count }))
  };
}

function getAssessmentMode(modeKey) {
  return ASSESSMENT_MODES.find((item) => item.key === modeKey) || ASSESSMENT_MODES[0];
}

function decorateAssessmentQuestion(question, round) {
  const binding = getMirrorBinding(question.type);
  return Object.assign({}, question, {
    question: question.question || question.text,
    trigger: question.trigger || QUESTION_TRIGGER_BY_TYPE[question.type] || "交易行为触发",
    boundaryInsight: question.boundaryInsight || QUESTION_BOUNDARY_BY_TYPE[question.type] || "先看见触发，再选择训练动作。",
    options: question.options || [0, 1, 2, 3],
    weights: question.weights || { [question.type]: 1 },
    mirrorName: binding.mirrorName,
    heartMirrorName: binding.heartMirrorName,
    heartThieves: binding.thieves,
    round: round + 1
  });
}

function getAssessmentQuestions(modeKey, bank) {
  const mode = getAssessmentMode(modeKey);
  const sourceBank = Array.isArray(bank) && bank.length ? bank : getAssessmentQuestionBank();
  const byType = {};
  sourceBank.forEach((question) => {
    if (!byType[question.type]) byType[question.type] = [];
    byType[question.type].push(question);
  });

  const questions = [];
  for (let round = 0; round < mode.perType; round += 1) {
    Object.keys(PERSONALITIES).forEach((type) => {
      const pool = byType[type] || [];
      const base = pool[round] || pool[round % Math.max(pool.length, 1)];
      if (base) {
        const question = round < pool.length ? base : Object.assign({}, base, {
          id: `${base.id}_mock_${round + 1}`,
          mockExpanded: true
        });
        questions.push(decorateAssessmentQuestion(question, round));
      }
    });
  }
  return questions;
}

const QUESTIONS = getAssessmentQuestions("27");

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
  HEART_THIEVES,
  MIRROR_BINDINGS,
  getMirrorBinding,
  PERSONALITIES,
  ASSESSMENT_MODES,
  ASSESSMENT_QUESTION_BANK,
  getAssessmentQuestionBank,
  getQuestionBankStats,
  QUESTIONS,
  OPTIONS,
  getAssessmentMode,
  getAssessmentQuestions,
  TRAINING_PLANS,
  DAILY_INSIGHTS
};
