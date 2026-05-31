const DIRECTOR_PROMPT_SCHEMA = {
  version: "v1",
  role: "导演提示词库",
  principle: "导演库负责把规则变成可讲、可拍、可做的内容，不负责制造行情刺激。",
  outputTypes: ["短视频", "直播段落", "训练卡", "小程序文案", "AI教练提示词"],
  requiredInputs: ["stage", "personality", "heartThief", "klineScene", "trainingAction"],
  globalRules: [
    "先讲人心，再讲动作。",
    "先命名心贼，再给训练。",
    "每条内容只练一件事。",
    "不评价具体标的，不暗示买卖方向。",
    "结尾必须回到省察问题或训练动作。"
  ]
};

const STAGE_DIRECTOR_PROMPTS = [
  {
    stage: "立志",
    directorIntent: "把用户从想做什么，拉回先定边界。",
    shortVideoPrompt: "用一个开盘前的静默场景开头：屏幕未动，心已想动。引出今日法旨：无计划，不开仓。",
    cardPrompt: "画面留白，中心是一条戒律。下方只放今日边界、今日不做清单、收盘省察。",
    trainingPrompt: "请用户写下今日只做什么、不做什么，以及触发止损后的唯一动作。",
    visualCues: ["黑金法旨", "空桌", "未点亮的屏幕", "手停在按钮前"],
    closingQuestion: "今天我有没有在计划未立时就想行动？"
  },
  {
    stage: "照心",
    directorIntent: "让用户意识到自己不是在预测市场，而是在照见此刻之心。",
    shortVideoPrompt: "用盘前心跳、呼吸、手指停顿做开头。让用户选择此刻心境：急、贪、惧、怒、疲、赌、空、静。",
    cardPrompt: "像AI观心仪，不像问卷。先显示心境，再生成今日禁忌。",
    trainingPrompt: "请用户命名当前心境，并写下今天最容易破戒的一个瞬间。",
    visualCues: ["暗色仪器", "金色呼吸光", "心境涟漪", "慢速扫描"],
    closingQuestion: "此刻牵动我的，是判断，还是心念？"
  },
  {
    stage: "事上磨",
    directorIntent: "把道理落到触发时的一次动作。",
    shortVideoPrompt: "从一根K线触发旧反应开始，切到用户把手停下来的瞬间。强调：修行不在空想，在事上磨。",
    cardPrompt: "卡片分三段：触发、旧反应、新动作。新动作必须能在今天完成。",
    trainingPrompt: "请用户记录一次触发，并完成预设动作：等待、止损、观望或复述规则。",
    visualCues: ["逐根回放", "手离开屏幕", "计时器", "训练完成印章"],
    closingQuestion: "触发来临时，我有没有照着规则做？"
  },
  {
    stage: "破心贼",
    directorIntent: "让用户看见反复犯错背后的主人格。",
    shortVideoPrompt: "用一句经典台词切入，例如“再等一下”。随后点出这不是技术问题，而是心贼接管。",
    cardPrompt: "卡片呈现：人格画像、当前心贼、今日戒律、修正动作。",
    trainingPrompt: "请用户把今天的旧惯性写成一句话，再把它改成一个可执行动作。",
    visualCues: ["镜面", "心贼命名", "旧动作划掉", "新动作盖章"],
    closingQuestion: "今天是哪一个心贼在替我做决定？"
  },
  {
    stage: "知行合一",
    directorIntent: "让用户对照说过的计划和盘中的行动。",
    shortVideoPrompt: "开头展示盘前写下的规则，随后切到盘中触发，最后对照执行差距。",
    cardPrompt: "卡片以知行指数为核心：纪律执行、系统一致性、临盘克制、主修兑现。",
    trainingPrompt: "请用户完成一次盘后知行对照：原计划是什么，实际做了什么，差距在哪里。",
    visualCues: ["计划卡", "对照线", "指数仪表", "金色刻度"],
    closingQuestion: "我说过的计划，是否成为盘中的行动？"
  },
  {
    stage: "致良知",
    directorIntent: "让用户从被提醒，走向自主觉察。",
    shortVideoPrompt: "以收盘后的安静复盘开场。强调成熟不是一次冷静，而是无人提醒时仍能自省。",
    cardPrompt: "卡片弱化命令，强化自问：我看见了什么，我修正什么，明天守什么。",
    trainingPrompt: "请用户只修正一个最关键动作，并写下明天怎样自行提醒自己。",
    visualCues: ["夜间复盘", "长线趋势", "微光书桌", "安静留白"],
    closingQuestion: "没有提醒时，我能否自己觉察、自己修正？"
  }
];

const PERSONALITY_DIRECTOR_PROMPTS = [
  {
    personality: "冲动型",
    openingHook: "你以为自己怕错过，其实是急念先替你按下了按钮。",
    conflictScene: "盘面快速变化，心里冒出：再不上车就没机会了。",
    turningPoint: "先照见急，再让手慢十秒。",
    trainingClose: "今天只练：急念出现时，等10秒。"
  },
  {
    personality: "扛单型",
    openingHook: "你不是没有止损规则，你是不愿在规则面前认错。",
    conflictScene: "边界已经触发，心里说：再等一下。",
    turningPoint: "把解释放下，回到原计划。",
    trainingClose: "今天只练：边界触发后不移动。"
  },
  {
    personality: "赌徒型",
    openingHook: "越想把节奏拉回来，越要先停下来。",
    conflictScene: "连续不顺后，手开始想加快动作。",
    turningPoint: "把补偿念头命名为赌念。",
    trainingClose: "今天只练：补偿念头出现时暂停30秒。"
  },
  {
    personality: "焦虑型",
    openingHook: "你刷新的不是盘面，是心里的不安。",
    conflictScene: "每一次小波动，都让你想重新判断。",
    turningPoint: "把担心写成条件，而不是让担心指挥行动。",
    trainingClose: "今天只练：观察窗口外只记录，不调整。"
  },
  {
    personality: "完美型",
    openingHook: "复盘不是审判自己，而是修正一个动作。",
    conflictScene: "一笔处理不理想后，开始反复责备自己。",
    turningPoint: "从评价自己，转向下一次怎么做。",
    trainingClose: "今天只练：只写一个可执行修正。"
  },
  {
    personality: "从众型",
    openingHook: "外面的声音越大，越要回到自己的计划卡。",
    conflictScene: "别人都在讨论，你开始怀疑自己的节奏。",
    turningPoint: "先问本心，再看证据。",
    trainingClose: "今天只练：盘中只按自己的计划卡行动。"
  },
  {
    personality: "偏执型",
    openingHook: "事实不是来证明你错，而是来帮你修正。",
    conflictScene: "反向证据出现，你仍想保护原判断。",
    turningPoint: "先格物，再立言。",
    trainingClose: "今天只练：行动前写一条反向证据。"
  },
  {
    personality: "拖延型",
    openingHook: "懂了不做，就还没有真的懂。",
    conflictScene: "计划、记录、复盘都想留到明天。",
    turningPoint: "修行从一个小动作开始。",
    trainingClose: "今天只练：收盘后三分钟写一条省察。"
  },
  {
    personality: "平衡型",
    openingHook: "稳定以后，最容易丢掉基础功。",
    conflictScene: "状态不错，于是省略了计划核对。",
    turningPoint: "真正的稳，是无人提醒时仍守流程。",
    trainingClose: "今天只练：状态好也完整走流程。"
  }
];

const KLINE_SCENE_POOL = [
  {
    category: "追涨",
    sceneDefinition: "价格快速上行，用户担心错过而想立即参与。",
    structures: ["急拉突破", "连续阳线加速", "高位放量冲高", "跳空后延续", "盘中快速拉升", "突破后短暂停顿"],
    stageUses: ["照心", "事上磨"],
    personalityUses: ["冲动型", "从众型", "赌徒型"],
    directorPrompt: "不要问能不能追，只问急念何时出现，以及今天是否能等10秒。"
  },
  {
    category: "突破",
    sceneDefinition: "关键位置被突破，用户容易把突破当成必须行动。",
    structures: ["放量突破", "缩量突破", "突破后回踩", "突破后横盘", "假突破回落", "连续试探压力位"],
    stageUses: ["立志", "知行合一"],
    personalityUses: ["冲动型", "偏执型", "从众型"],
    directorPrompt: "先检查是否在计划内，再决定是否行动。"
  },
  {
    category: "回调",
    sceneDefinition: "上涨或下跌后出现回落，用户容易把回调解释成自己想看的机会。",
    structures: ["缩量回踩", "放量回落", "均线附近震荡", "回调后反抽", "弱反弹再回落", "横盘后下探"],
    stageUses: ["照心", "知行合一"],
    personalityUses: ["焦虑型", "偏执型", "完美型"],
    directorPrompt: "把解释和事实分开，先写触发条件，再谈动作。"
  },
  {
    category: "假突破",
    sceneDefinition: "价格越过关键位置后回落，用户容易被第一下刺激带走。",
    structures: ["冲高回落", "上影线失败", "突破后跌回区间", "放量不延续", "早盘拉升午后回落", "二次突破失败"],
    stageUses: ["事上磨", "破心贼"],
    personalityUses: ["冲动型", "偏执型", "从众型"],
    directorPrompt: "引导用户识别：我是在看事实，还是在保护刚才的冲动？"
  },
  {
    category: "补仓",
    sceneDefinition: "走势不顺后，用户想通过增加动作来缓解不甘。",
    structures: ["跌破后反抽", "连续回撤", "低位横盘", "小阳线安慰", "下跌中继", "边界附近拉扯"],
    stageUses: ["事上磨", "破心贼"],
    personalityUses: ["扛单型", "赌徒型", "偏执型"],
    directorPrompt: "不讨论补不补，只问这是不是计划内动作。"
  },
  {
    category: "扛单",
    sceneDefinition: "预设边界已触发，用户仍想等待、解释或移动边界。",
    structures: ["跌破止损位", "反抽不过原位", "阴跌不止", "破位后横盘", "连续低点下移", "失效后小幅修复"],
    stageUses: ["事上磨", "知行合一"],
    personalityUses: ["扛单型", "偏执型", "焦虑型"],
    directorPrompt: "镜头聚焦边界触发的一刻，让戒律替用户做决定。"
  },
  {
    category: "止损",
    sceneDefinition: "预设失效条件出现，用户需要执行原计划。",
    structures: ["关键位失守", "反向放量", "跌破后无修复", "波动扩大", "趋势失效", "条件不再成立"],
    stageUses: ["立志", "事上磨", "知行合一"],
    personalityUses: ["扛单型", "完美型", "焦虑型"],
    directorPrompt: "把止损呈现为执行训练，而不是对错评价。"
  },
  {
    category: "踏空",
    sceneDefinition: "用户没有参与后，盘面继续变化，引发懊恼或追逐。",
    structures: ["错过启动", "回踩未等到", "快速拉开距离", "横盘后突然上行", "连续走强", "二次加速"],
    stageUses: ["照心", "破心贼"],
    personalityUses: ["冲动型", "从众型", "焦虑型"],
    directorPrompt: "把错过定义为一次照心机会，而不是立刻补动作。"
  },
  {
    category: "浮盈回吐",
    sceneDefinition: "已有浮盈开始回落，用户容易在贪和惧之间摆动。",
    structures: ["冲高回落", "高位震荡", "利润快速收窄", "上影线增多", "横盘后下探", "回撤到计划线"],
    stageUses: ["知行合一", "致良知"],
    personalityUses: ["焦虑型", "完美型", "平衡型"],
    directorPrompt: "引导用户对照退出规则，而不是被浮动结果牵动。"
  },
  {
    category: "连续亏损",
    sceneDefinition: "连续不顺后，用户最容易失去节奏和边界。",
    structures: ["两次失败后急动", "连续止损后反手", "窄幅震荡反复被打", "大波动中频繁进出", "情绪性加快节奏", "停手线被忽略"],
    stageUses: ["立志", "事上磨", "破心贼"],
    personalityUses: ["赌徒型", "焦虑型", "完美型"],
    directorPrompt: "核心不是再判断一次，而是回到停手线。"
  }
];

module.exports = {
  DIRECTOR_PROMPT_SCHEMA,
  STAGE_DIRECTOR_PROMPTS,
  PERSONALITY_DIRECTOR_PROMPTS,
  KLINE_SCENE_POOL
};
