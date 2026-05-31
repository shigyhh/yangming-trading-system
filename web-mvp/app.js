const riskTypes = ["冲动型", "扛单型", "完美主义型", "偏执型", "焦虑型", "从众型", "赌徒型", "拖延型"];
const allTypes = [...riskTypes, "平衡型"];
const displayTypeNames = { 完美主义型: "完美型" };
const retestCoreTypes = ["冲动型", "扛单型", "焦虑型", "从众型"];
const perTypeCountMap = { 27: 3, 45: 5, 90: 10, 108: 12, 360: 40 };
const impactTarget = 100000000;
const bootParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
const defaultApiBaseUrl = getDefaultApiBaseUrl();
const forceBackendOnPublicOrigin = shouldForceBackendOnPublicOrigin();
const bootChannel = bootParams.get("channel") || bootParams.get("utm_source") || "";
const bootInviteCode = bootParams.get("invite") || bootParams.get("invite_code") || "";
const sprint8Dimensions = [
  { id: "trigger", label: "触发场景" },
  { id: "emotion", label: "情绪驱动" },
  { id: "action", label: "失守动作" },
  { id: "review", label: "复盘模式" }
];
const sprint8Questions = [
  {
    question_id: "s8_trigger_01",
    dimension: "trigger",
    dimension_label: "触发场景",
    sub_dimension: "急拉错过",
    question_text: "一个你观察很久的标的突然急拉，你心里最先出现的是哪一句？",
    options: [
      { id: "s8_t1_a", text: "再不上车，可能又要错过了。", hint: "怕错过", personality_type: "冲动型", score: 5, trigger: "快速拉升", first_thought: "再不上车，可能又要错过了。", emotion: "怕错过", action: "追进去" },
      { id: "s8_t1_b", text: "先等一下，没到我的条件。", hint: "守计划", personality_type: "平衡型", score: 2, trigger: "快速拉升", first_thought: "没到条件，先不动。", emotion: "能暂停", action: "按计划等待" },
      { id: "s8_t1_c", text: "大家都在说它，是不是我信息落后了？", hint: "看他人", personality_type: "从众型", score: 4, trigger: "快速拉升", first_thought: "别人都在看，我是不是落后了。", emotion: "怕落伍", action: "跟随他人" },
      { id: "s8_t1_d", text: "再看看，等所有信号都确认再说。", hint: "等完美", personality_type: "完美主义型", score: 4, trigger: "快速拉升", first_thought: "还不够完美。", emotion: "怕做错", action: "过度等待" }
    ]
  },
  {
    question_id: "s8_trigger_02",
    dimension: "trigger",
    dimension_label: "触发场景",
    sub_dimension: "跌破持仓",
    question_text: "持仓突然跌破你原本写下的止损线，你第一反应更像哪一句？",
    options: [
      { id: "s8_t2_a", text: "再等等，应该会拉回来。", hint: "不愿认错", personality_type: "扛单型", score: 5, trigger: "跌破止损", first_thought: "再等等，应该会回来。", emotion: "怕亏损落地", action: "扛着不动" },
      { id: "s8_t2_b", text: "先出去，错了也要让损失停住。", hint: "止损", personality_type: "平衡型", score: 2, trigger: "跌破止损", first_thought: "先让损失停住。", emotion: "能接受错误", action: "执行止损" },
      { id: "s8_t2_c", text: "补一点，成本低了就没那么难受。", hint: "补救", personality_type: "赌徒型", score: 5, trigger: "跌破止损", first_thought: "补一点就能扳回来。", emotion: "想补救", action: "逆势加仓" },
      { id: "s8_t2_d", text: "我再找找理由，也许市场只是误杀。", hint: "找证据", personality_type: "偏执型", score: 4, trigger: "跌破止损", first_thought: "市场可能错了。", emotion: "怕被证明错", action: "改解释" }
    ]
  },
  {
    question_id: "s8_trigger_03",
    dimension: "trigger",
    dimension_label: "触发场景",
    sub_dimension: "空仓上涨",
    question_text: "你空仓时市场连续上涨，最容易牵动你的那句话是？",
    options: [
      { id: "s8_t3_a", text: "别人都赚了，我不能还站在外面。", hint: "踏空焦虑", personality_type: "焦虑型", score: 5, trigger: "空仓上涨", first_thought: "别人都赚了，我不能空着。", emotion: "怕错过", action: "降低标准" },
      { id: "s8_t3_b", text: "我去看看群里大家怎么判断。", hint: "找共识", personality_type: "从众型", score: 4, trigger: "空仓上涨", first_thought: "先看别人怎么说。", emotion: "怕独自判断", action: "跟随消息" },
      { id: "s8_t3_c", text: "越涨越不敢买，干脆先不看了。", hint: "回避", personality_type: "拖延型", score: 4, trigger: "空仓上涨", first_thought: "算了，先不看。", emotion: "怕承担", action: "回避决策" },
      { id: "s8_t3_d", text: "它涨归它涨，我只做我的条件。", hint: "守边界", personality_type: "平衡型", score: 2, trigger: "空仓上涨", first_thought: "只做我的条件。", emotion: "能守边界", action: "继续观察" }
    ]
  },
  {
    question_id: "s8_trigger_04",
    dimension: "trigger",
    dimension_label: "触发场景",
    sub_dimension: "亏后再来",
    question_text: "刚亏完一笔，又出现一个看起来不错的机会，你最像哪种内心独白？",
    options: [
      { id: "s8_t4_a", text: "这次抓住，就能把刚才那笔赢回来。", hint: "想扳回", personality_type: "赌徒型", score: 5, trigger: "亏后新机会", first_thought: "这次要赢回来。", emotion: "想补救", action: "加快下单" },
      { id: "s8_t4_b", text: "刚才是偶然，我的判断本来没错。", hint: "想证明", personality_type: "偏执型", score: 4, trigger: "亏后新机会", first_thought: "我要证明判断没错。", emotion: "怕被证明错", action: "重复观点" },
      { id: "s8_t4_c", text: "先停一下，亏后的下一笔最容易变形。", hint: "暂停", personality_type: "平衡型", score: 2, trigger: "亏后新机会", first_thought: "先停一下。", emotion: "能觉察", action: "暂停复盘" },
      { id: "s8_t4_d", text: "不行，我现在脑子乱，今天先算了。", hint: "退开", personality_type: "拖延型", score: 3, trigger: "亏后新机会", first_thought: "先算了。", emotion: "怕再错", action: "退出回避" }
    ]
  },
  {
    question_id: "s8_emotion_01",
    dimension: "emotion",
    dimension_label: "情绪驱动",
    sub_dimension: "怕错过",
    question_text: "看到机会快速走远时，最能描述你的驱动力的是？",
    options: [
      { id: "s8_e1_a", text: "我怕错过这一波，先进去再说。", hint: "怕错过", personality_type: "冲动型", score: 5, trigger: "机会走远", first_thought: "先进去再说。", emotion: "怕错过", action: "追进去" },
      { id: "s8_e1_b", text: "我怕买错，所以想再等一个更确定的点。", hint: "怕做错", personality_type: "完美主义型", score: 4, trigger: "机会走远", first_thought: "再等更确定。", emotion: "怕犯错", action: "等完美" },
      { id: "s8_e1_c", text: "我怕只有自己没参与，心里很难坐住。", hint: "怕落伍", personality_type: "焦虑型", score: 5, trigger: "机会走远", first_thought: "只有我没参与。", emotion: "焦虑", action: "降低标准" },
      { id: "s8_e1_d", text: "我会记下它，但不到条件不追。", hint: "能延迟", personality_type: "平衡型", score: 2, trigger: "机会走远", first_thought: "不到条件不追。", emotion: "能延迟", action: "记录观察" }
    ]
  },
  {
    question_id: "s8_emotion_02",
    dimension: "emotion",
    dimension_label: "情绪驱动",
    sub_dimension: "怕亏损",
    question_text: "浮亏扩大时，心里最响的那一句通常是？",
    options: [
      { id: "s8_e2_a", text: "只要不卖，就还不算真的亏。", hint: "怕落地", personality_type: "扛单型", score: 5, trigger: "浮亏扩大", first_thought: "不卖就不算亏。", emotion: "怕亏损", action: "扛着不动" },
      { id: "s8_e2_b", text: "我不能就这么认错，行情会证明我的。", hint: "怕认错", personality_type: "偏执型", score: 4, trigger: "浮亏扩大", first_thought: "行情会证明我的。", emotion: "怕被证明错", action: "坚持观点" },
      { id: "s8_e2_c", text: "赶紧走，别再亏了。", hint: "怕继续亏", personality_type: "焦虑型", score: 4, trigger: "浮亏扩大", first_thought: "赶紧走。", emotion: "怕亏损", action: "提前逃离" },
      { id: "s8_e2_d", text: "看止损条件，不看难受程度。", hint: "看规则", personality_type: "平衡型", score: 2, trigger: "浮亏扩大", first_thought: "看条件，不看难受。", emotion: "能稳住", action: "按规则处理" }
    ]
  },
  {
    question_id: "s8_emotion_03",
    dimension: "emotion",
    dimension_label: "情绪驱动",
    sub_dimension: "想赢回来",
    question_text: "连续两次不顺后，你最容易被哪种念头推着走？",
    options: [
      { id: "s8_e3_a", text: "下一笔我要重一点，尽快扳回来。", hint: "复仇", personality_type: "赌徒型", score: 5, trigger: "连续不顺", first_thought: "重一点扳回来。", emotion: "想赢回来", action: "放大仓位" },
      { id: "s8_e3_b", text: "我得找一个更完美的机会，不能再错。", hint: "自责", personality_type: "完美主义型", score: 4, trigger: "连续不顺", first_thought: "不能再错。", emotion: "怕犯错", action: "过度筛选" },
      { id: "s8_e3_c", text: "先暂停，今天的状态已经影响判断。", hint: "止念", personality_type: "平衡型", score: 2, trigger: "连续不顺", first_thought: "状态已经变形。", emotion: "能觉察", action: "暂停交易" },
      { id: "s8_e3_d", text: "我想问问别人，是不是我哪里看漏了。", hint: "求确认", personality_type: "从众型", score: 4, trigger: "连续不顺", first_thought: "找别人确认。", emotion: "怕独自承担", action: "依赖外部" }
    ]
  },
  {
    question_id: "s8_action_01",
    dimension: "action",
    dimension_label: "失守动作",
    sub_dimension: "追逃改等",
    question_text: "计划外的机会突然出现时，你最常见的动作是？",
    options: [
      { id: "s8_a1_a", text: "先追进去，后面再补计划。", hint: "追", personality_type: "冲动型", score: 5, trigger: "计划外机会", first_thought: "先进去。", emotion: "急", action: "追" },
      { id: "s8_a1_b", text: "马上翻聊天和消息，看看大家怎么说。", hint: "跟", personality_type: "从众型", score: 4, trigger: "计划外机会", first_thought: "看看大家怎么说。", emotion: "不确定", action: "跟" },
      { id: "s8_a1_c", text: "把原来的条件临时改宽一点。", hint: "改计划", personality_type: "焦虑型", score: 4, trigger: "计划外机会", first_thought: "条件可以放宽。", emotion: "怕错过", action: "改计划" },
      { id: "s8_a1_d", text: "先写下触发条件，没满足就不动。", hint: "守", personality_type: "平衡型", score: 2, trigger: "计划外机会", first_thought: "没满足就不动。", emotion: "能守住", action: "守计划" }
    ]
  },
  {
    question_id: "s8_action_02",
    dimension: "action",
    dimension_label: "失守动作",
    sub_dimension: "扛补止损",
    question_text: "当交易已经明显偏离计划时，你通常更容易做什么？",
    options: [
      { id: "s8_a2_a", text: "扛一扛，等它给我一个体面的退出机会。", hint: "扛", personality_type: "扛单型", score: 5, trigger: "偏离计划", first_thought: "等体面退出。", emotion: "不甘心", action: "扛" },
      { id: "s8_a2_b", text: "补一点，把成本摊下来。", hint: "补", personality_type: "赌徒型", score: 5, trigger: "偏离计划", first_thought: "补一点。", emotion: "想补救", action: "补" },
      { id: "s8_a2_c", text: "重新解释走势，把退出条件往后挪。", hint: "改", personality_type: "偏执型", score: 4, trigger: "偏离计划", first_thought: "退出条件可以往后。", emotion: "怕认错", action: "改计划" },
      { id: "s8_a2_d", text: "错了就按规则退出，先保住下一次。", hint: "止损", personality_type: "平衡型", score: 2, trigger: "偏离计划", first_thought: "保住下一次。", emotion: "能接受", action: "止损" }
    ]
  },
  {
    question_id: "s8_action_03",
    dimension: "action",
    dimension_label: "失守动作",
    sub_dimension: "过度观望",
    question_text: "机会接近你的计划条件时，你最常卡在哪里？",
    options: [
      { id: "s8_a3_a", text: "还差一点点完美，我再等等。", hint: "等完美", personality_type: "完美主义型", score: 4, trigger: "接近条件", first_thought: "还差一点完美。", emotion: "怕瑕疵", action: "过度观望" },
      { id: "s8_a3_b", text: "我知道该做，但总想晚一点再确认。", hint: "拖", personality_type: "拖延型", score: 5, trigger: "接近条件", first_thought: "晚一点再确认。", emotion: "怕承担", action: "拖延" },
      { id: "s8_a3_c", text: "按小仓执行，先完成计划动作。", hint: "小仓试错", personality_type: "平衡型", score: 2, trigger: "接近条件", first_thought: "小仓完成动作。", emotion: "能试错", action: "按计划小仓" },
      { id: "s8_a3_d", text: "如果有人也这么看，我就更敢做。", hint: "等认同", personality_type: "从众型", score: 4, trigger: "接近条件", first_thought: "有人认同我才敢。", emotion: "怕孤立", action: "等外部确认" }
    ]
  },
  {
    question_id: "s8_review_01",
    dimension: "review",
    dimension_label: "复盘模式",
    sub_dimension: "事后解释",
    question_text: "一笔交易结束后，你更常用哪种方式面对它？",
    options: [
      { id: "s8_r1_a", text: "我会责备自己：怎么又这么蠢。", hint: "责备", personality_type: "完美主义型", score: 4, trigger: "交易结束", first_thought: "我怎么又这么蠢。", emotion: "自责", action: "责备自己", review: "责备" },
      { id: "s8_r1_b", text: "我会找理由：这次只是运气不好。", hint: "合理化", personality_type: "偏执型", score: 4, trigger: "交易结束", first_thought: "只是运气不好。", emotion: "不想认错", action: "合理化", review: "合理化" },
      { id: "s8_r1_c", text: "我不太想看，过两天就忘了。", hint: "遗忘", personality_type: "拖延型", score: 5, trigger: "交易结束", first_thought: "先别看了。", emotion: "怕面对", action: "遗忘", review: "遗忘" },
      { id: "s8_r1_d", text: "我会写下触发、念头和动作，找重复模式。", hint: "看模式", personality_type: "平衡型", score: 2, trigger: "交易结束", first_thought: "找重复模式。", emotion: "能面对", action: "复盘记录", review: "看见模式" }
    ]
  },
  {
    question_id: "s8_review_02",
    dimension: "review",
    dimension_label: "复盘模式",
    sub_dimension: "修正能力",
    question_text: "下一次遇到类似行情前，你最可能怎么处理上一次的教训？",
    options: [
      { id: "s8_r2_a", text: "知道归知道，真到盘中还是先反应。", hint: "重复", personality_type: "冲动型", score: 5, trigger: "类似行情再来", first_thought: "先反应再说。", emotion: "急", action: "重复旧动作", review: "看见但守不住" },
      { id: "s8_r2_b", text: "我会提前写一条规则，盘中只执行它。", hint: "修正", personality_type: "平衡型", score: 2, trigger: "类似行情再来", first_thought: "提前写规则。", emotion: "能修正", action: "按规则执行", review: "能修正" },
      { id: "s8_r2_c", text: "我想等老师或朋友确认，再决定怎么改。", hint: "依赖", personality_type: "从众型", score: 4, trigger: "类似行情再来", first_thought: "等别人确认。", emotion: "怕独自承担", action: "外部确认", review: "依赖外部" },
      { id: "s8_r2_d", text: "我会先放一放，等心情好了再说。", hint: "搁置", personality_type: "拖延型", score: 4, trigger: "类似行情再来", first_thought: "以后再说。", emotion: "怕麻烦", action: "搁置", review: "搁置" }
    ]
  }
];
const klineTimeframes = {
  30: "30分钟K",
  60: "60分钟K",
  101: "日K",
  102: "周K",
  103: "月K"
};
const klineDisplayMin = 40;
const klineDisplayDefault = 100;
const klineZoomInStep = 25;
const klineZoomOutStep = 50;
const klineTradeRules = {
  initialCash: 100000,
  commissionRate: 0.00025,
  minCommission: 5,
  stampTaxRate: 0.0005
};
const forumCategories = [
  { id: "all", name: "全部" },
  { id: "mind", name: "心学入门" },
  { id: "trading_mind", name: "交易认知" },
  { id: "stock_basics", name: "股票基础" },
  { id: "kline_review", name: "K线复盘" },
  { id: "risk", name: "风险教育" },
  { id: "qa", name: "同修问答" }
];
const forumCategoryNameMap = Object.fromEntries(forumCategories.map((item) => [item.id, item.name]));
const forumFallbackPosts = [
  {
    id: "local-mind-001",
    category: "mind",
    category_name: "心学入门",
    title: "王阳明心学里，交易者先练哪一念？",
    summary: "先看见贪、惧、急、悔，再谈交易系统。",
    content: "很多交易者一上来就找买点，其实更应该先找自己的起心动念。\n\n心学里讲知行合一，放到交易里，就是知道风险以后，仓位、止损和复盘也要跟上。每次下单前停一下：我现在是在按计划行动，还是在被恐惧、侥幸、急躁推着走？",
    tags: ["知行合一", "交易心性"],
    author_name: "知行学堂",
    view_count: 168,
    comment_count: 0,
    like_count: 12,
    pinned: true,
    created_at: "2026-05-28T08:00:00.000Z"
  },
  {
    id: "local-stock-001",
    category: "stock_basics",
    category_name: "股票基础",
    title: "股票基础：K线不是预测工具，而是复盘语言",
    summary: "一根K线只记录开高低收，真正有价值的是你当时怎么判断、怎么执行。",
    content: "K线由开盘价、最高价、最低价、收盘价组成。它能记录价格运动，但不能保证下一步怎么走。\n\n新手看K线，先不要急着找神奇形态。更重要的是记录三件事：当时趋势是否清楚、自己的仓位是否合理、错了以后有没有退出条件。",
    tags: ["K线基础", "新手教程"],
    author_name: "知行学堂",
    view_count: 126,
    comment_count: 0,
    like_count: 9,
    pinned: true,
    created_at: "2026-05-28T08:05:00.000Z"
  },
  {
    id: "local-risk-001",
    category: "risk",
    category_name: "风险教育",
    title: "为什么不先教买点？先教仓位和止损",
    summary: "买点只解决入场，仓位和止损决定一次错误会不会扩大。",
    content: "交易教育最容易吸引人的，是买点、形态和涨停故事。但真正决定普通用户能不能长期训练下去的，往往是仓位和止损。\n\n如果一次错误会伤到本金和心态，后面的技术动作都会变形。先把单笔风险降下来，人才有余地复盘和修正。",
    tags: ["风险教育", "仓位", "止损"],
    author_name: "知行学堂",
    view_count: 102,
    comment_count: 0,
    like_count: 7,
    pinned: false,
    created_at: "2026-05-28T08:10:00.000Z"
  },
  {
    id: "local-kline-001",
    category: "kline_review",
    category_name: "K线复盘",
    title: "一局K线训练后，应该复盘哪三件事？",
    summary: "看结果之前，先看计划、情绪和动作。",
    content: "一局训练结束后，不要只问赚没赚。先问三个问题：我有没有提前设定条件？我中途有没有因为涨跌改变计划？我错了以后有没有缩小损失？\n\n如果这三件事能说清楚，哪怕这局没拿高分，也是在进步。",
    tags: ["K线训练", "复盘方法"],
    author_name: "知行学堂",
    view_count: 89,
    comment_count: 0,
    like_count: 6,
    pinned: false,
    created_at: "2026-05-28T08:15:00.000Z"
  }
];
const personalityTrainingMap = {
  冲动型: {
    stage_id: "impulse",
    stage_name: "冲动型追涨关",
    focus: "追涨冲动",
    title: "冲动型专属训练：追涨前先停",
    text: "急拉不追、买入前写失效线，连续20根K线不被踏空感牵走。"
  },
  扛单型: {
    stage_id: "stop_loss",
    stage_name: "扛单型止损关",
    focus: "破位执行",
    title: "扛单型专属训练：破位就执行",
    text: "破位不辩论，亏损不补理由，卖出不是认输，是守住系统。"
  },
  完美主义型: {
    stage_id: "trial",
    stage_name: "完美型试错关",
    focus: "计划试错",
    title: "完美型专属训练：允许小仓试错",
    text: "不用等完美信号，用小仓位完成计划内试错，训练行动闭环。"
  },
  偏执型: {
    stage_id: "counterproof",
    stage_name: "偏执型反证关",
    focus: "反证检查",
    title: "偏执型专属训练：先看反证",
    text: "每次买入前先找反向证据，盘面证明错了就退出，不把观点当事实。"
  },
  焦虑型: {
    stage_id: "anxiety",
    stage_name: "焦虑型持心关",
    focus: "持仓定力",
    title: "焦虑型专属训练：波动不是命令",
    text: "持仓时不被一根K线牵走，只看计划是否失效。"
  },
  从众型: {
    stage_id: "independent",
    stage_name: "从众型独立关",
    focus: "独立决策",
    title: "从众型专属训练：不用别人的判断替自己下单",
    text: "只按盘面和计划行动，不把消息、热闹和别人的观点当买卖理由。"
  },
  赌徒型: {
    stage_id: "position",
    stage_name: "赌徒型仓位关",
    focus: "仓位纪律",
    title: "赌徒型专属训练：不靠一把翻身",
    text: "分仓、止损、连续亏损后停手，让风险先小下来。"
  },
  拖延型: {
    stage_id: "execution",
    stage_name: "拖延型执行关",
    focus: "关键动作",
    title: "拖延型专属训练：触发就行动",
    text: "买卖条件触发后立即执行，不把计划停留在纸面。"
  },
  平衡型: {
    stage_id: "balanced",
    stage_name: "平衡型系统关",
    focus: "稳定复利",
    title: "平衡型进阶训练：少犯错，少乱动",
    text: "减少无效动作，记录规则偏离，保持稳定交易人格。"
  }
};

const personalityTrainingStages = [
  {
    id: "impulse",
    type: "冲动型",
    stage_id: "impulse",
    name: "冲动型追涨关",
    focus: "追涨杀跌",
    subtitle: "急拉时先看见怕踏空，再决定是否动手。",
    scenes: ["盘中急拉不追", "卖飞后不乱追回", "高开冲动降速"],
    check: "我现在买，是计划触发，还是怕错过？",
    lesson: "冲动型最该练的不是更快，而是在下单前慢一拍。",
    action: "下一步：拉升时先等一根K线，再写失效条件。"
  },
  {
    id: "stop_loss",
    type: "扛单型",
    stage_id: "stop_loss",
    name: "扛单型止损关",
    focus: "不止损死扛",
    subtitle: "破位后不讲故事，只看计划是否失效。",
    scenes: ["破位不幻想", "亏损不补理由", "短线不拖长线"],
    check: "我是在执行止损，还是在等市场证明我没错？",
    lesson: "止损不是认输，是从情绪里撤出来。",
    action: "下一步：破位触发后先减仓，不在亏损里辩论。"
  },
  {
    id: "trial",
    type: "完美主义型",
    stage_id: "trial",
    name: "完美型试错关",
    focus: "完美点位",
    subtitle: "不等完美才行动，用小仓完成计划内试错。",
    scenes: ["等待完美信号", "错过后不补追", "小仓试错闭环"],
    check: "我现在犹豫，是因为风险没想清，还是害怕不完美？",
    lesson: "正确不是完美，正确是可重复。",
    action: "下一步：满足核心条件就小仓试错，把退出条件写清。"
  },
  {
    id: "position",
    type: "赌徒型",
    stage_id: "position",
    name: "赌徒型仓位关",
    focus: "重仓梭哈",
    subtitle: "不靠一把翻身，先让风险小下来。",
    scenes: ["重仓诱惑", "连续亏损停手", "盈利后不膨胀"],
    check: "这笔仓位，是系统允许，还是我想一把翻身？",
    lesson: "仓位不是胆量，仓位是你能不能睡得着。",
    action: "下一步：单次动作只用计划仓位，连续失误后停一局。"
  },
  {
    id: "independent",
    type: "从众型",
    stage_id: "independent",
    name: "从众型独立关",
    focus: "消息依赖",
    subtitle: "别人喊的是他的节奏，你接的是你的风险。",
    scenes: ["群聊喊票不接力", "利好不幻想", "别人盈利不比较"],
    check: "如果没有别人那句话，我还会做这笔操作吗？",
    lesson: "外面的声音只是外缘，真正下单的是自己的心。",
    action: "下一步：外部观点出现后先空一根K线，再看盘面。"
  },
  {
    id: "counterproof",
    type: "偏执型",
    stage_id: "counterproof",
    name: "偏执型反证关",
    focus: "看对不敢做",
    subtitle: "观点不是事实，先找反证再行动。",
    scenes: ["看对不敢动", "做了不敢拿", "反向证据检查"],
    check: "我是在看盘面证据，还是在守自己的观点？",
    lesson: "心乱时，K线会被自己解释成想要的样子。",
    action: "下一步：每次开仓前写一条反证，错了就退出。"
  },
  {
    id: "execution",
    type: "拖延型",
    stage_id: "execution",
    name: "拖延型执行关",
    focus: "无规则拖延",
    subtitle: "条件触发就行动，不让计划停在纸面。",
    scenes: ["触发不拖", "收盘前复盘", "规则断档补齐"],
    check: "我现在不动，是因为规则没触发，还是在逃避执行？",
    lesson: "知而不行，只是未知。",
    action: "下一步：触发条件后只执行一个动作，不临盘重写规则。"
  },
  {
    id: "anxiety",
    type: "焦虑型",
    stage_id: "anxiety",
    name: "焦虑型持心关",
    focus: "赚一点就跑",
    subtitle: "波动不是命令，先看计划是否失效。",
    scenes: ["持仓不被一根K线吓走", "小赚不急跑", "亏损不慌砍"],
    check: "我想卖，是计划失效，还是情绪想求安心？",
    lesson: "焦虑不是风险控制，清楚的退出条件才是。",
    action: "下一步：卖出前先看失效线，不用一根K线决定全部。"
  },
  {
    id: "balanced",
    type: "平衡型",
    stage_id: "balanced",
    name: "平衡型系统关",
    focus: "系统纪律",
    subtitle: "有系统、有纪律、能复盘，重点练少犯错。",
    scenes: ["稳定执行", "少做无效动作", "复盘修正"],
    check: "这一笔是否符合我的系统，还是只是想多做一点？",
    lesson: "稳定不是不犯错，而是错误不扩大。",
    action: "下一步：少做一笔无效交易，记录一次规则偏离。"
  }
];

let klineSceneCards = [
  {
    id: "rush_chase",
    title: "急拉追高",
    theme: "一念动处",
    text: "快速拉升后追入，高位承受回落。",
    image: "assets/kline-scenes/S01_急拉追高.jpg",
    tags: ["冲动型", "致良知关", "追涨冲动"]
  },
  {
    id: "high_divergence",
    title: "高位分歧",
    theme: "分歧不妄动",
    text: "高位放量滞涨，先辨明再行动。",
    image: "assets/kline-scenes/S02_高位分歧.jpg",
    tags: ["完美型", "从众型", "高位分歧"]
  },
  {
    id: "break_hold",
    title: "破位不走",
    theme: "边界已破",
    text: "跌破计划位却迟迟不走。",
    image: "assets/kline-scenes/S03_破位不走.jpg",
    tags: ["扛单型", "破心中贼", "破位执行"]
  },
  {
    id: "fear_cut",
    title: "恐惧割肉",
    theme: "惧念夺主",
    text: "低位急跌后恐惧卖出。",
    image: "assets/kline-scenes/S04_恐惧割肉.jpg",
    tags: ["焦虑型", "心即理", "低位恐惧"]
  },
  {
    id: "shake_trade",
    title: "震荡乱做",
    theme: "心随境转",
    text: "区间震荡中反复进出。",
    image: "assets/kline-scenes/S05_震荡乱做.jpg",
    tags: ["拖延型", "知行合一", "频繁交易"]
  },
  {
    id: "pullback",
    title: "缩量回踩",
    theme: "等待确认",
    text: "突破后缩量回踩，守规则等确认。",
    image: "assets/kline-scenes/S06_缩量回踩.jpg",
    tags: ["平衡型", "系统纪律", "等待确认"]
  },
  {
    id: "breakout_confirm",
    title: "突破确认",
    theme: "信号成形",
    text: "突破后回踩确认再行动。",
    image: "assets/kline-scenes/S07_突破确认.jpg",
    tags: ["平衡型", "事上磨", "信号确认"]
  },
  {
    id: "false_breakout",
    title: "假突破",
    theme: "不被表象牵走",
    text: "突破未能站稳，及时回到规则。",
    image: "assets/kline-scenes/S08_假突破.jpg",
    tags: ["偏执型", "赌徒型", "假突破"]
  }
];

const personalitySceneCardMap = {
  冲动型: "rush_chase",
  扛单型: "break_hold",
  完美主义型: "high_divergence",
  偏执型: "false_breakout",
  焦虑型: "fear_cut",
  从众型: "high_divergence",
  赌徒型: "false_breakout",
  拖延型: "shake_trade",
  平衡型: "pullback"
};

const axisSceneCardMap = {
  conscience: "rush_chase",
  unity: "shake_trade",
  mind: "fear_cut",
  outside: "high_divergence",
  practice: "false_breakout",
  thief: "break_hold"
};
const impactBase = {
  registrations: 12860,
  assessments: 9864,
  reports: 7352,
  assistants: 4218
};

const dailyQuotes = [
  "此心不动，随机而动。今日先守住一个动作。",
  "知是行之始，行是知之成。今天只练一次知行合一。",
  "破山中贼易，破心中贼难。盘中先破自己的冲动。",
  "事上练，不在空想。今日把止损、等待、复盘做成动作。",
  "心即理。行情只是外缘，真正要看见的是自己的一念。"
];

const mindAxisStages = [
  {
    id: "conscience",
    stage_id: "axis_conscience",
    name: "致良知关",
    short: "致良知",
    focus: "下单前一念",
    subtitle: "先看见自己是贪、怕，还是不甘心。",
    goal: "训练下单前那一秒的觉察力，不被怕踏空、想翻本、后悔追回牵着走。",
    scenes: ["盘中拉升与怕踏空", "补仓翻本与不肯认亏", "止损割肉与承认错误", "卖飞后悔与追回冲动"],
    check: "我现在想动，是因为计划触发，还是因为心里不甘心？",
    useful: "每次点击后都会标记本次心念，让你知道账户波动来自计划，还是来自情绪。",
    lesson: "致良知不是忍住不做，而是在动手前看清这一念从哪里来。",
    action: "下一步：拉升前先等一根K线，再写买入理由。"
  },
  {
    id: "unity",
    stage_id: "axis_unity",
    name: "知行合一关",
    short: "知行合一",
    focus: "按计划执行",
    subtitle: "情绪上来后，还能不能照计划做。",
    goal: "训练清醒时写下的规则，在盘中最吵的时候还能不能执行。",
    scenes: ["开盘十分钟与手痒乱动", "尾盘偷袭与临收盘冲动", "频繁交易与闲不住", "阳明交易系统日课"],
    check: "如果我现在不看涨跌，只看规则，这一笔该不该做？",
    useful: "每一步都会把仓位、账户变化和操作次数放在一起，逼自己看见是否偏离计划。",
    lesson: "懂规则不难，难的是盘中热起来以后还照着清醒时的计划做。",
    action: "下一步：每次动作只问一句，这是计划还是情绪。"
  },
  {
    id: "mind",
    stage_id: "axis_mind",
    name: "心即理关",
    short: "心即理",
    focus: "分清事实想象",
    subtitle: "心乱时，所有K线都会变成理由。",
    goal: "训练把盘面事实和自己脑补的故事分开，不把亏损解释成希望。",
    scenes: ["仓位失控与越亏越重", "空仓焦虑与拿不住现金", "复盘自责与夜里刷账户", "大盘指数与红绿牵心"],
    check: "眼前这一根K线，是事实，还是我为了证明自己找的理由？",
    useful: "反馈卡会把本步结果和最大回撤展示出来，减少只看单根涨跌的错觉。",
    lesson: "心稳一点，才分得清盘面事实和自己脑补出来的故事。",
    action: "下一步：先看仓位和失效线，再解释涨跌。"
  },
  {
    id: "outside",
    stage_id: "axis_outside",
    name: "心外无物关",
    short: "心外无物",
    focus: "不接外界情绪",
    subtitle: "别人喊的是他的节奏，你接的是你的风险。",
    goal: "训练不被群友、消息、别人盈利刺激带节奏，先守住自己的系统。",
    scenes: ["群友喊票与接别人情绪", "比较心与别人盈利刺激", "利好消息与提前幻想", "利空恐慌与开盘乱砍"],
    check: "如果没有别人那句话，我还会做这笔操作吗？",
    useful: "关卡会把训练重点固定在外界诱惑上，帮你分清别人的节奏和自己的风险。",
    lesson: "外面的消息只是外缘，真正拖你下单的常常是心里的投射。",
    action: "下一步：听到观点后先空一根K线，不立刻跟随。"
  },
  {
    id: "practice",
    stage_id: "axis_practice",
    name: "事上磨关",
    short: "事上磨",
    focus: "在诱惑处训练",
    subtitle: "越想追、越想赌、越想改规则，越要在这里磨。",
    goal: "训练在龙头、板块轮动、指标执念这些最容易上头的地方保持动作清楚。",
    scenes: ["龙头妖股与热闹诱惑", "板块轮动与乱换车", "技术指标执念与画线上头", "大V研报与外部观点诱惑"],
    check: "这是不是我的能力圈？还是我只是被热闹吸过去？",
    useful: "每局结束会沉淀最伤账户动作，帮助你找到真正需要反复磨的场景。",
    lesson: "修心不离开盘面，最想乱动的那一刻就是训练点。",
    action: "下一步：只在能力圈内做动作，热闹不等于机会。"
  },
  {
    id: "thief",
    stage_id: "axis_thief",
    name: "破心中贼关",
    short: "破心中贼",
    focus: "破回本执念",
    subtitle: "不服气、爱面子、想翻本，是账户里的暗伤。",
    goal: "训练识别回本执念、爱面子和自我欺骗，不用下一笔交易证明上一笔。",
    scenes: ["回本执念与翻本冲动", "小赚不走与大亏硬扛", "家人压力与隐瞒亏损", "长线短线混乱与模式漂移"],
    check: "我现在这一下，是为了系统，还是为了把上一笔亏损讨回来？",
    useful: "训练结束会给出本轮操作画像和下一轮训练计划，让问题变成可执行动作。",
    lesson: "破心中贼，是看见自己正在用下一笔交易证明上一笔没错。",
    action: "下一步：凡是为了回本的动作，先暂停两根K线。"
  }
];

function buildKlineUnavailableScenario(message = "真实A股历史K线未连接，请先启动后端并确认服务器能访问历史行情接口。") {
  const timeframe = "101";
  return {
    id: "real-kline-unavailable",
    title: "真实K线训练盘｜等待连接",
    prompt: message,
    scene_type: "真实K线连接中",
    personality_type: "综合训练",
    focus: "真实K线",
    candles: [],
    visible_count: 0,
    future_count: 0,
    market: "A股",
    timeframe,
    timeframe_label: klineTimeframes[timeframe] || "日K",
    data_source: "unavailable",
    options: [{ label: "买入" }, { label: "卖出" }, { label: "观望" }],
    difficulty: "待连接",
    version: "real_kline_required"
  };
}

const profiles = {
  冲动型: {
    pattern: "机会一出现就先上车，事后再补理由。",
    risk: "容易在急拉、涨停诱惑和盘中消息里做临时决策。",
    scene: "最容易亏在分时快速拉升、热门题材扩散、朋友突然喊票时。",
    ability: "下单前延迟能力",
    camp: "基础觉察营",
    reminder: "知是行之始，行是知之成。你不是缺机会，而是要先让心慢下来。",
    actions: [
      "每次想追涨前先停 10 分钟，只写买入理由和失效条件。",
      "当天只允许做计划内标的，盘中临时看到的机会全部记入观察表。",
      "复盘最近 3 次冲动交易，标出触发情绪、入场价格和实际结果。",
      "设置单笔最大亏损线，买入前先写出错了在哪里退出。",
      "练习用虚拟盘处理急拉行情，连续 3 次做到不追才进入下一步。",
      "把“怕错过”改写成一句提醒：错过机会不是风险，失控下单才是风险。",
      "总结一条能长期执行的小规则，贴在交易软件旁边。"
    ]
  },
  扛单型: {
    pattern: "亏损出现后先安慰自己，再把短线拖成长线。",
    risk: "容易把破位、亏损扩大和仓位失衡合理化。",
    scene: "最容易亏在跌破计划止损位、补仓摊低成本、幻想反弹时。",
    ability: "止损执行能力",
    camp: "风险修正营",
    reminder: "致良知不是让你硬扛，而是看见事实后立刻修正行动。",
    actions: [
      "给每笔持仓写清楚止损条件，没有条件不允许买入。",
      "盘中触发止损只做执行，不做辩论。",
      "把最近一笔扛单交易拆成三个节点：破位、犹豫、扩大亏损。",
      "设置亏损提醒，触线后先减仓一半，避免情绪占满大脑。",
      "连续 7 天记录自己说过的“再等等”，看它是否真的保护你。",
      "用小仓位练习机械止损，目标是训练动作，不是追求盈利。",
      "复盘一条规则：亏损扩大前，我真正能控制的动作是什么。"
    ]
  },
  完美主义型: {
    pattern: "总想等到最完美信号，结果错过后又自责。",
    risk: "容易陷入过度分析、迟迟不动和事后否定自己。",
    scene: "最容易亏在反复等确认、追求最低点最高点、错过后补追时。",
    ability: "计划内试错能力",
    camp: "执行强化营",
    reminder: "事上练不是等万事俱备，而是在规则内接受不完美的行动。",
    actions: [
      "把入场条件压缩到 3 条，满足即按计划执行。",
      "允许用 1/3 仓位试错，先训练行动闭环。",
      "记录每次因为等完美而错过的机会，不评价，只看模式。",
      "把复盘重点从结果好坏改成是否按规则行动。",
      "设置“可接受的小亏损”，让自己愿意完成交易实验。",
      "选择一类简单形态连续训练 7 天，减少策略切换。",
      "写一句提醒：正确不是完美，正确是可重复。"
    ]
  },
  偏执型: {
    pattern: "一旦形成判断，就很难接受市场反证。",
    risk: "容易把观点当事实，对反向信号视而不见。",
    scene: "最容易亏在基本面叙事、长期看好、越跌越相信自己时。",
    ability: "反证检查能力",
    camp: "风险修正营",
    reminder: "心外无物不是固执己见，而是照见自己的念头也会遮住事实。",
    actions: [
      "买入前必须写出一个反对自己判断的理由。",
      "每天收盘后只问一句：今天有没有证据说明我错了。",
      "给持仓设置客观退出条件，避免靠信念续命。",
      "找一笔亏损交易，标出你忽略过的三条市场反证。",
      "和一位风格不同的人做一次反向复盘，只听不反驳。",
      "把“我认为”改成“如果市场证明我错，我如何退出”。",
      "建立反证清单，未来每次交易前逐条检查。"
    ]
  },
  焦虑型: {
    pattern: "买入后被价格波动牵着走，越看盘越心慌。",
    risk: "容易频繁看盘、过早卖出和情绪性撤退。",
    scene: "最容易亏在小幅回撤、盘中震荡、盈利刚出现就急着落袋时。",
    ability: "持仓情绪稳定能力",
    camp: "基础觉察营",
    reminder: "此心不动，随机而动。先稳住心，才看得清盘。",
    actions: [
      "设置固定看盘时间，每次不超过 10 分钟。",
      "买入前写明持仓理由，盘中只看是否失效。",
      "连续 7 天记录价格波动带来的身体反应。",
      "盈利票不因一根分时回落卖出，只按计划条件处理。",
      "睡前不看持仓盈亏，改看交易日志。",
      "用轻仓训练持仓，直到能接受正常波动。",
      "写一句提醒：波动不是命令，计划才是命令。"
    ]
  },
  从众型: {
    pattern: "别人的观点越热闹，自己的判断越容易被带走。",
    risk: "容易依赖群消息、大 V 观点和热门情绪。",
    scene: "最容易亏在直播荐股、社群喊单、热榜题材后排接力时。",
    ability: "独立决策能力",
    camp: "基础觉察营",
    reminder: "良知在自己心上，不在热闹处。先问自己懂不懂，再决定做不做。",
    actions: [
      "任何外部消息都先放进观察表，不直接下单。",
      "买入理由必须由自己写出，不能写“别人说好”。",
      "取关或静音一个最容易影响你冲动的人或群。",
      "复盘最近 3 次跟风交易，看自己是否理解交易逻辑。",
      "建立自己的三条选股条件，条件不满足不参与。",
      "练习在热门消息出现后延迟 30 分钟再判断。",
      "写一句提醒：热闹不等于确定，跟随不等于认知。"
    ]
  },
  赌徒型: {
    pattern: "喜欢用一次重仓或高风险机会改变结果。",
    risk: "容易重仓、频繁交易、追求刺激和回本。",
    scene: "最容易亏在连亏后加倍、满仓押注、把交易当翻本游戏时。",
    ability: "仓位纪律能力",
    camp: "风险修正营",
    reminder: "欲胜人者先自胜。真正的勇敢，是不把命运交给一把牌。",
    actions: [
      "未来 7 天单笔仓位上限固定，任何理由不得突破。",
      "连续亏损两笔后停止交易一天。",
      "把回本念头写下来，标出它让你做过哪些危险动作。",
      "删除会诱发高频冲动的盘口提醒。",
      "只做一类低波动训练单，目标是控制手，不是刺激心。",
      "复盘一次重仓失败，计算如果按仓位纪律会少亏多少。",
      "写一句提醒：小亏可控，大赌伤身。"
    ]
  },
  拖延型: {
    pattern: "知道该做什么，却常在关键动作上慢半拍。",
    risk: "容易错过买卖点、复盘断档和计划长期停留在纸面。",
    scene: "最容易亏在该止损不止、该复盘不复、该调整仓位却拖到收盘后。",
    ability: "关键动作启动能力",
    camp: "执行强化营",
    reminder: "知而不行，只是未知。把一个动作做出来，认知才真正落地。",
    actions: [
      "每天只设一个必须完成的交易动作，并在收盘前打勾。",
      "止损、减仓、复盘都设置固定时间提醒。",
      "把复杂计划拆成 5 分钟能完成的小动作。",
      "复盘最近一次拖延，找出拖延前的真实念头。",
      "用模拟盘训练触发条件后的立即执行。",
      "建立交易日志模板，减少开始复盘的阻力。",
      "写一句提醒：今天完成一个动作，胜过想清十个道理。"
    ]
  },
  平衡型: {
    pattern: "能在计划、风险和情绪之间保持相对稳定。",
    risk: "主要风险是稳定后松懈，或在极端行情中被旧习惯拉回去。",
    scene: "最容易在连续盈利后放松纪律，或在市场剧烈波动时偏离计划。",
    ability: "稳定复利能力",
    camp: "稳定进阶营",
    reminder: "此心光明，亦复何言。保持清明，不因一时胜负失其本心。",
    actions: [
      "保留现有交易规则，重点记录每次偏离规则的细节。",
      "每笔交易只检查计划、仓位、退出条件三件事。",
      "连续盈利后主动降一次仓位，防止自信膨胀。",
      "复盘最稳定的一笔交易，提炼可重复的动作。",
      "设置每周一次深度复盘，不因短期结果改变系统。",
      "用小仓位测试一个改进点，不扰动主系统。",
      "写一句提醒：稳定不是不犯错，而是错误不扩大。"
    ]
  }
};

const state = {
  bank: [],
  selectedVersion: sprint8Questions.length,
  assessmentMode: "sprint8",
  assessmentId: "",
  questions: [],
  answers: {},
  sprint8AnswerOptions: {},
  currentIndex: 0,
  result: null,
  report: "",
  serverReport: null,
  assessmentHistory: [],
  latestAssessment: null,
  retestComparison: null,
  retestReport: null,
  auth: null,
  habit: loadLocalHabit(),
  influence: null,
  leaderboard: [],
  klineStats: loadLocalKlineStats(),
  bankStats: { total_questions: 3600, personality_counts: {} },
  klineBankStats: { total_questions: 1500 },
  trainingPlans: [],
  klineLevel: {
    daily_quota: { limit: 3, used: 0, remaining: 3, practiced_today: 0 },
    streak_days: 0,
    unlocked_stages: [{ id: "daily", name: "每日三问", locked: false }],
    stages: [{ id: "daily", name: "每日三问", locked: false, required_streak_days: 0 }],
    active_stage: { id: "daily", name: "每日三问" }
  },
  klineScenario: buildKlineUnavailableScenario(),
  klineSim: null,
  nextKlineScenario: null,
  klineAnswered: false,
  klineSubmitting: false,
  klineSelectedDecision: "",
  klineAxisId: "conscience",
  klineAxisSceneIndex: 0,
  klinePersonaId: "",
  klineSceneCardId: "",
  klineLastFeedback: null,
  klineTimeframe: "101",
  klineInstrumentKey: "",
  klineDisplayCount: klineDisplayDefault,
  klineIndicators: { ma: true, vol: true, macd: true, kdj: true, rsi: false, boll: true },
  leaderboardPeriod: "week",
  forumPosts: [],
  forumSelectedCategory: "all",
  forumSearch: "",
  forumSelectedPostId: "",
  forumPostDetail: null,
  forumComments: [],
  demoCode: "246810",
  smsTimer: null,
  impact: loadImpactStats(),
  config: {
    apiBaseUrl: defaultApiBaseUrl,
    useBackend: bootParams.has("backend") ? bootParams.get("backend") !== "0" : forceBackendOnPublicOrigin || localStorage.getItem("tradingPersonality.useBackend") !== "false",
    cozeUrl: localStorage.getItem("tradingPersonality.cozeUrl") || "",
    feishuUrl: localStorage.getItem("tradingPersonality.feishuUrl") || ""
  }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const setText = (selector, value) => {
  const target = $(selector);
  if (target) target.textContent = value;
};

function getDefaultApiBaseUrl() {
  const apiFromUrl = bootParams.get("api");
  if (apiFromUrl) return apiFromUrl;

  const savedApiUrl = localStorage.getItem("tradingPersonality.apiBaseUrl");
  if (savedApiUrl && !isLocalFrontendUrl(savedApiUrl) && !(isPublicHttpOrigin() && isLocalApiUrl(savedApiUrl))) {
    return savedApiUrl;
  }

  const origin = window.location.origin;
  if (origin && origin !== "null" && ["4173", "5173", "8795"].includes(window.location.port)) {
    return "http://127.0.0.1:8787";
  }
  if (origin && origin !== "null") return origin;
  return "http://127.0.0.1:8787";
}

function isPublicHttpOrigin() {
  const host = window.location.hostname;
  return Boolean(window.location.origin && window.location.origin !== "null" && host && !["localhost", "127.0.0.1", "::1"].includes(host));
}

function isLocalApiUrl(value = "") {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isLocalFrontendUrl(value = "") {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname) && ["4173", "5173", "8795"].includes(url.port);
  } catch {
    return false;
  }
}

function shouldForceBackendOnPublicOrigin() {
  return isPublicHttpOrigin() && !bootParams.has("backend");
}

function applyBootParams() {
  const channelInput = $("#channelInput");
  if (bootChannel && channelInput) {
    const hasOption = Array.from(channelInput.options).some((option) => option.value === bootChannel || option.textContent === bootChannel);
    if (!hasOption) {
      const option = document.createElement("option");
      option.textContent = bootChannel;
      option.value = bootChannel;
      channelInput.prepend(option);
    }
    channelInput.value = bootChannel;
  }

  if (bootInviteCode) {
    $("#inviteCodeInput").value = bootInviteCode;
    switchAuthTab("invite");
  }
}

async function loadAssistantQrPool() {
  const qrImg = $("#assistantQrImg");
  if (!qrImg) return;
  const qrFrame = $("#assistantQrFrame");

  qrImg.addEventListener("error", () => {
    qrFrame?.classList.add("qr-missing");
  }, { once: true });

  qrImg.addEventListener("load", () => {
    qrFrame?.classList.remove("qr-missing");
  });

  const serverItem = await loadAssistantQrFromServer();
  if (serverItem) {
    applyAssistantQrItem(serverItem, 0);
    return;
  }

  try {
    const response = await fetch("./data/assistant-qr-pool.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pool = await response.json();
    const enabledItems = Array.isArray(pool)
      ? pool.filter((item) => item && item.enabled !== false && item.src)
      : [];
    if (!enabledItems.length) return;

    const index = getNextAssistantQrIndex(enabledItems.length);
    const item = enabledItems[index];
    applyAssistantQrItem(item, index);
  } catch (error) {
    console.warn("助理二维码池暂不可用，继续使用默认二维码。", error);
  }
}

async function loadAssistantQrFromServer() {
  syncConfigFromInputs();
  if (!state.config.useBackend || !state.config.apiBaseUrl) return null;

  try {
    const response = await fetch(`${state.config.apiBaseUrl.replace(/\/$/, "")}/api/v1/assistant-qrs/next`, {
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`);
    return data.item || null;
  } catch (error) {
    console.warn("服务器助理二维码轮询暂不可用，改用本地轮换。", error);
    return null;
  }
}

function applyAssistantQrItem(item, index = 0) {
  const qrImg = $("#assistantQrImg");
  if (!qrImg || !item?.src) return;

  qrImg.src = item.src;
  qrImg.alt = item.name || "助理二维码";

  const label = $("#assistantQrLabel");
  if (label) {
    label.textContent = item.name || `入院助理 ${String(index + 1).padStart(2, "0")}`;
  }
}

function getNextAssistantQrIndex(count) {
  if (count <= 1) return 0;

  const key = "tradingPersonality.assistantQrIndex";
  const savedValue = Number(localStorage.getItem(key));
  const currentIndex = Number.isFinite(savedValue)
    ? savedValue % count
    : 0;
  localStorage.setItem(key, String((currentIndex + 1) % count));
  return currentIndex;
}

document.addEventListener("DOMContentLoaded", () => {
  initHomepageCinema();
  bindAuthEvents();
  bindEvents();
  $("#apiBaseUrlInput").value = state.config.apiBaseUrl;
  $("#useBackendInput").checked = state.config.useBackend;
  $("#cozeUrlInput").value = state.config.cozeUrl;
  $("#feishuUrlInput").value = state.config.feishuUrl;
  applyBootParams();
  loadAssistantQrPool();
  renderImpactStats();
  initAuth();
  renderRetention();
  loadQuestionBank();
  loadForumPosts();
  loadTrainingPlans();
  loadKlineScenePool().finally(() => {
    renderRetention();
    loadNextKlineScenario({ silent: true });
  });
});

let ambientAudio = null;

function initHomepageCinema() {
  const home = $("#authGate.yangming-home");
  if (!home) return;
  initCinemaScroll(home);
  initCinemaButtons(home);
  initCinemaPointer(home);
  initAmbientSoundToggle();
  initZenWebglCanvas();
}

function initCinemaScroll(home) {
  const sections = $$(".home-hero, .home-section, .home-final-cta");
  if (!sections.length) return;

  const setProgress = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = clamp(window.scrollY / max, 0, 1);
    home.style.setProperty("--scroll-progress", progress.toFixed(4));
  };
  setProgress();
  window.addEventListener("scroll", setProgress, { passive: true });

  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("cinema-in"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("cinema-in");
        home.dataset.scene = entry.target.id || entry.target.className || "home";
      });
    }, { threshold: 0.32, rootMargin: "-8% 0px -12%" });

    sections.forEach((section) => observer.observe(section));
  }

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    sections.forEach((section) => {
      window.gsap.fromTo(section,
        { y: 70, opacity: 0.18, filter: "blur(8px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 78%",
            end: "top 34%",
            scrub: 0.7
          }
        }
      );
    });
    window.gsap.to(".breathing-field", {
      xPercent: 1.6,
      yPercent: -1.2,
      duration: 8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }
}

function initCinemaButtons(root = document) {
  const targets = root.querySelectorAll(".home-btn, .home-nav-cta, .yangming-home .primary-action, .yangming-home .secondary-action, .yangming-home .auth-tab");
  targets.forEach((button) => {
    button.classList.add("flow-button");
    button.addEventListener("click", (event) => {
      createButtonParticleBurst(button, event);
    });
  });
}

function createButtonParticleBurst(button, event) {
  const rect = button.getBoundingClientRect();
  const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
  const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
  for (let index = 0; index < 12; index += 1) {
    const particle = document.createElement("span");
    particle.className = "button-particle";
    const angle = (Math.PI * 2 * index) / 12;
    const distance = 20 + (index % 4) * 8;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty("--px", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--py", `${Math.sin(angle) * distance}px`);
    button.appendChild(particle);
    window.setTimeout(() => particle.remove(), 720);
  }
}

function initCinemaPointer(home) {
  const updatePointer = (event) => {
    const x = event.clientX / Math.max(window.innerWidth, 1);
    const y = event.clientY / Math.max(window.innerHeight, 1);
    home.style.setProperty("--pointer-x", x.toFixed(3));
    home.style.setProperty("--pointer-y", y.toFixed(3));
  };
  window.addEventListener("pointermove", updatePointer, { passive: true });
}

function initAmbientSoundToggle() {
  const button = $("#ambientSoundToggle");
  if (!button) return;
  button.addEventListener("click", async () => {
    if (ambientAudio?.active) {
      stopAmbientAudio();
      button.setAttribute("aria-pressed", "false");
      button.querySelector("strong").textContent = "关";
      return;
    }
    try {
      ambientAudio = await startAmbientAudio();
      button.setAttribute("aria-pressed", "true");
      button.querySelector("strong").textContent = "开";
    } catch (error) {
      console.warn("环境音启动失败。", error);
      showToast("当前浏览器暂时无法开启环境音。");
    }
  });
}

async function startAmbientAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) throw new Error("Web Audio unavailable");
  const context = new AudioContext();
  await context.resume();
  const master = context.createGain();
  master.gain.value = 0.045;
  master.connect(context.destination);

  const noise = context.createBufferSource();
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.34;
  }
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const windFilter = context.createBiquadFilter();
  windFilter.type = "lowpass";
  windFilter.frequency.value = 620;
  const windGain = context.createGain();
  windGain.gain.value = 0.08;
  noise.connect(windFilter).connect(windGain).connect(master);
  noise.start();

  const valley = context.createOscillator();
  valley.type = "sine";
  valley.frequency.value = 54;
  const valleyGain = context.createGain();
  valleyGain.gain.value = 0.025;
  valley.connect(valleyGain).connect(master);
  valley.start();

  const timers = [];
  const scheduleDrop = () => {
    playWaterDrop(context, master);
    timers.push(window.setTimeout(scheduleDrop, 3600 + Math.random() * 4200));
  };
  const scheduleWood = () => {
    playWoodTap(context, master);
    timers.push(window.setTimeout(scheduleWood, 7200 + Math.random() * 5200));
  };
  const scheduleBrush = () => {
    playBrushFriction(context, master);
    timers.push(window.setTimeout(scheduleBrush, 9600 + Math.random() * 6800));
  };
  timers.push(window.setTimeout(scheduleDrop, 1800));
  timers.push(window.setTimeout(scheduleWood, 4200));
  timers.push(window.setTimeout(scheduleBrush, 6200));

  return { active: true, context, master, nodes: [noise, valley], timers };
}

function playWaterDrop(context, destination) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(920 + Math.random() * 260, context.currentTime);
  osc.frequency.exponentialRampToValueAtTime(420, context.currentTime + 0.18);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
  osc.connect(gain).connect(destination);
  osc.start();
  osc.stop(context.currentTime + 0.46);
}

function playWoodTap(context, destination) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(180, context.currentTime);
  filter.type = "bandpass";
  filter.frequency.value = 420;
  filter.Q.value = 9;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
  osc.connect(filter).connect(gain).connect(destination);
  osc.start();
  osc.stop(context.currentTime + 0.24);
}

function playBrushFriction(context, destination) {
  const source = context.createBufferSource();
  const duration = 0.72;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < data.length; index += 1) {
    last = last * 0.82 + (Math.random() * 2 - 1) * 0.18;
    data[index] = last;
  }
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1180;
  filter.Q.value = 0.72;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.linearRampToValueAtTime(0.025, context.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.connect(filter).connect(gain).connect(destination);
  source.start();
}

function stopAmbientAudio() {
  if (!ambientAudio) return;
  const audio = ambientAudio;
  ambientAudio = null;
  audio.active = false;
  audio.timers?.forEach((timer) => window.clearTimeout(timer));
  audio.nodes?.forEach((node) => {
    try {
      node.stop();
    } catch {}
  });
  audio.master?.gain?.setTargetAtTime(0.0001, audio.context.currentTime, 0.08);
  window.setTimeout(() => audio.context?.close(), 220);
}

function initZenWebglCanvas() {
  const canvas = $("#zenWebglCanvas");
  if (!canvas || !window.WebGLRenderingContext) return;
  if (window.THREE && initThreeZenParticles(canvas)) return;
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return;
  const vertexSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    uniform vec2 resolution;
    uniform float time;
    uniform float scroll;
    float circle(vec2 uv, vec2 p, float r) {
      return smoothstep(r, r - 0.22, distance(uv, p));
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec2 p1 = vec2(0.24 + sin(time * 0.07) * 0.05, 0.70 + cos(time * 0.05) * 0.08);
      vec2 p2 = vec2(0.78 + cos(time * 0.04) * 0.07, 0.22 + sin(time * 0.06) * 0.05);
      vec2 p3 = vec2(0.50 + sin(time * 0.035 + scroll) * 0.12, 0.48 + cos(time * 0.045) * 0.08);
      float ink = circle(uv, p1, 0.36) * 0.18 + circle(uv, p2, 0.30) * 0.16 + circle(uv, p3, 0.46) * 0.12;
      float grain = fract(sin(dot(uv * resolution.xy + time, vec2(12.9898, 78.233))) * 43758.5453);
      vec3 gold = vec3(0.84, 0.70, 0.42);
      vec3 green = vec3(0.37, 0.52, 0.46);
      vec3 red = vec3(0.47, 0.24, 0.18);
      vec3 color = mix(green, gold, smoothstep(0.2, 0.9, uv.y + sin(time * 0.04) * 0.18));
      color = mix(color, red, circle(uv, vec2(0.58, 0.1), 0.32) * 0.32);
      float alpha = ink + grain * 0.018;
      gl_FragColor = vec4(color, alpha);
    }
  `;
  const program = createWebglProgram(gl, vertexSource, fragmentSource);
  if (!program) return;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  const resolution = gl.getUniformLocation(program, "resolution");
  const time = gl.getUniformLocation(program, "time");
  const scroll = gl.getUniformLocation(program, "scroll");
  const started = performance.now();

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(canvas.clientWidth * ratio);
    const height = Math.floor(canvas.clientHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function render(now) {
    resize();
    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(time, (now - started) / 1000);
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    gl.uniform1f(scroll, window.scrollY / max);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

function initThreeZenParticles(canvas) {
  try {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 5;
    const count = 820;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      const radius = 1.2 + Math.random() * 3.8;
      const angle = Math.random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 4.8;
      positions[index * 3 + 2] = Math.sin(angle) * radius * 0.42;
      seeds[index] = Math.random() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xd8b76f,
      size: 0.018,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const resize = () => {
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", resize);
    resize();

    const started = performance.now();
    const render = (now) => {
      const t = (now - started) / 1000;
      const array = geometry.attributes.position.array;
      for (let index = 0; index < count; index += 1) {
        array[index * 3 + 1] += Math.sin(t * 0.28 + seeds[index]) * 0.0009;
      }
      geometry.attributes.position.needsUpdate = true;
      points.rotation.y = Math.sin(t * 0.08) * 0.16;
      points.rotation.x = Math.cos(t * 0.06) * 0.06;
      material.opacity = 0.34 + Math.sin(t * Math.PI / 4) * 0.08;
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
    return true;
  } catch (error) {
    console.warn("Three.js 粒子背景不可用，回退到原生WebGL。", error);
    return false;
  }
}

function createWebglProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileWebglShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileWebglShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

function compileWebglShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function bindAuthEvents() {
  $$(".auth-tab").forEach((button) => {
    button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
  });

  $("#wechatLoginBtn").addEventListener("click", startWechatLogin);

  $("#sendCodeBtn").addEventListener("click", sendPhoneCode);

  $("#phoneLoginBtn").addEventListener("click", loginByPhoneCode);

  $("#inviteLoginBtn").addEventListener("click", async () => {
    const inviteCode = $("#inviteCodeInput").value.trim();
    if (inviteCode.length < 4) {
      showToast("请输入有效邀请码。");
      return;
    }
    await completeLogin({
      method: "invite_demo",
      displayName: `邀请码学员-${inviteCode.slice(-4)}`,
      contact: inviteCode,
      wechatBound: false
    });
  });

  $("#logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("tradingPersonality.authUser");
    sessionStorage.removeItem("tradingPersonality.accessToken");
    state.auth = null;
    lockApp();
    showToast("已退出当前账号。");
  });
}

async function startWechatLogin() {
  syncConfigFromInputs();
  if (!state.config.useBackend || !state.config.apiBaseUrl) {
    setAuthStatus("微信授权需要先连接后端服务。");
    showToast("请先启动后端，再使用微信授权登录。");
    return;
  }

  const redirectPath = `${window.location.pathname}${window.location.search || ""}`;
  const url = `${state.config.apiBaseUrl.replace(/\/$/, "")}/api/v1/auth/wechat/start?mode=auto&redirect_path=${encodeURIComponent(redirectPath)}`;
  setAuthStatus("正在打开微信授权页面...");
  window.location.href = url;
}

async function sendPhoneCode() {
  syncConfigFromInputs();
  const phone = $("#loginPhoneInput").value.trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    showToast("请输入正确的手机号。");
    return;
  }
  if (!state.config.useBackend || !state.config.apiBaseUrl) {
    setAuthStatus("手机号验证码需要连接后端服务。");
    showToast("请先启动后端，再获取验证码。");
    return;
  }

  const button = $("#sendCodeBtn");
  button.disabled = true;
  button.textContent = "发送中";
  try {
    const result = await apiFetch("/api/v1/auth/sms/send", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
    const mockText = result.demo_code ? ` 本地测试验证码：${result.demo_code}` : "";
    setAuthStatus(`验证码已发送，${Math.round((result.expires_in || 300) / 60)} 分钟内有效。${mockText}`);
    showToast(result.demo_code ? `测试验证码：${result.demo_code}` : "验证码已发送，请查看手机短信。");
    startSmsCountdown(Number(result.cooldown_seconds || 60));
  } catch (error) {
    button.disabled = false;
    button.textContent = "获取验证码";
    const friendlyMessage = getFriendlySmsError(error.message);
    setAuthStatus(friendlyMessage);
    showToast(friendlyMessage);
  }
}

async function loginByPhoneCode() {
  syncConfigFromInputs();
    const phone = $("#loginPhoneInput").value.trim();
    const code = $("#loginCodeInput").value.trim();
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      showToast("请输入正确的手机号。");
      return;
    }
    if (!/^\d{4,8}$/.test(code)) {
      showToast("请输入短信验证码。");
      return;
    }
    if (!state.config.useBackend || !state.config.apiBaseUrl) {
      setAuthStatus("绑定手机号需要连接后端服务。");
      showToast("请先启动后端，再绑定手机号。");
      return;
    }

    const button = $("#phoneLoginBtn");
    button.disabled = true;
    button.textContent = "保存中";
    try {
      const result = await apiFetch("/api/v1/auth/phone-login", {
        method: "POST",
        body: JSON.stringify({
          phone,
          code,
          display_name: maskPhone(phone),
          invite_code: $("#inviteCodeInput").value.trim(),
          source_channel: getSourceChannel()
        })
      });
      completeServerLogin(result, {
        method: "phone",
        displayName: maskPhone(phone),
        contact: phone,
        wechatBound: false
      });
      setAuthStatus("手机号已绑定，正在开始照心测评。");
      showToast("照心报告将为你保存。");
      await enterAssessmentAfterPhoneLogin();
    } catch (error) {
      const friendlyMessage = getFriendlySmsError(error.message);
      setAuthStatus(friendlyMessage);
      showToast(friendlyMessage);
    } finally {
      button.disabled = false;
      button.textContent = "保存并开始照心 →";
    }
}

function startSmsCountdown(seconds) {
  window.clearInterval(state.smsTimer);
  const button = $("#sendCodeBtn");
  let remaining = Math.max(Number(seconds) || 60, 1);
  button.disabled = true;
  button.textContent = `${remaining}秒后重发`;
  state.smsTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      window.clearInterval(state.smsTimer);
      button.disabled = false;
      button.textContent = "获取验证码";
      return;
    }
    button.textContent = `${remaining}秒后重发`;
  }, 1000);
}

function setAuthStatus(message) {
  const target = $("#authStatus");
  if (target) target.textContent = message || "";
}

function completeServerLogin(serverAuth, fallbackUser = {}) {
  const serverUser = serverAuth?.user || {};
  const user = {
    id: serverUser.id || fallbackUser.id || `local_${Date.now()}`,
    serverId: serverUser.id || fallbackUser.serverId || "",
    displayName: serverUser.nickname || fallbackUser.displayName || "体验学员",
    method: serverUser.login_method || fallbackUser.method || "phone",
    contact: serverUser.contact || fallbackUser.contact || "",
    wechatBound: Boolean(serverUser.wechat_bound || fallbackUser.wechatBound),
    personalInviteCode: serverUser.personal_invite_code || fallbackUser.personalInviteCode || "",
    accessToken: serverAuth?.access_token || "",
    tokenExpiresAt: serverAuth?.expires_at || "",
    serverCreatedAt: serverUser.created_at || "",
    createdAt: serverUser.created_at || new Date().toISOString()
  };

  if (user.accessToken) {
    sessionStorage.setItem("tradingPersonality.accessToken", user.accessToken);
  }
  localStorage.setItem("tradingPersonality.authUser", JSON.stringify(user));
  if (!localStorage.getItem("tradingPersonality.registeredOnce")) {
    incrementImpact({
      registrations: 1,
      assistants: user.wechatBound ? 1 : 0
    });
    localStorage.setItem("tradingPersonality.registeredOnce", "1");
  }
  unlockApp(user);
}

function bindEvents() {
  $$(".version-btn").forEach((button) => {
    button.addEventListener("click", () => {
      selectVersion(Number(button.dataset.version));
    });
  });

  $("#beginCeremonyBtn")?.addEventListener("click", revealAssessmentAuth);
  $("#startBtn").addEventListener("click", showPrecheck);
  $("#precheckReadyBtn")?.addEventListener("click", () => startAssessment(false));
  $("#demoBtn").addEventListener("click", runDemo);
  $("#prevBtn").addEventListener("click", goPrev);
  $("#nextBtn").addEventListener("click", () => goNext());
  $("#restartBtn").addEventListener("click", restart);
  $("#copyReportBtn").addEventListener("click", copyReport);
  $("#copyShareCardBtn").addEventListener("click", copyShareCardText);
  $("#copyAssistantSummaryBtn").addEventListener("click", copyAssistantSummary);
  $("#startResultTrainingBtn").addEventListener("click", async () => {
    await prepareResultTraining();
    updateStep("setup");
    scrollToKlinePractice();
  });
  $("#startRetestBtn").addEventListener("click", () => {
    selectVersion(45);
    restart();
    showToast("已进入复测。请按最近7天真实交易和训练感受作答。");
  });
  $("#exportJsonBtn").addEventListener("click", exportJson);
  $("#saveConfigBtn").addEventListener("click", saveConfig);
  $("#callCozeBtn").addEventListener("click", callCoze);
  $("#sendFeishuBtn").addEventListener("click", sendFeishu);
  $("#dailyCheckInBtn").addEventListener("click", handleDailyCheckIn);
  $("#copyInviteBtn").addEventListener("click", copyInviteText);
  $("#nextKlineBtn").addEventListener("click", () => {
    const trainingContext = getActiveKlineTrainingContext();
    setKlineSceneLoading(`正在换入「${trainingContext.name}｜${trainingContext.focus}」真实K线片段...`);
    loadNextKlineScenario({ keepInstrument: false, focusAfterLoad: true });
  });
  $("#enterKlineLabBtn").addEventListener("click", scrollToKlinePractice);
  $("#refreshKlineLabBtn").addEventListener("click", async () => {
    await loadNextKlineScenario({ keepInstrument: false });
    scrollToKlinePractice();
  });
  $("#quickPracticeBtn").addEventListener("click", () => {
    selectVersion(27);
    startAssessment(false);
  });
  $$(".leaderboard-tabs button").forEach((button) => {
    button.addEventListener("click", async () => {
      state.leaderboardPeriod = button.dataset.leaderboardPeriod || "week";
      await refreshKlineLeaderboard();
      renderRetention();
    });
  });

  $$("#klineActions button, .kline-actions button").forEach((button) => {
    button.addEventListener("click", () => submitKlineDecision(button.dataset.klineDecision));
  });

  $$(".kline-mind-check button").forEach((button) => {
    button.addEventListener("click", () => showMindCheck(button.dataset.mindCheck));
  });

  $$(".kline-mode-row button[data-kline-module]").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".kline-mode-row button[data-kline-module]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      showToast(button.dataset.klineModule === "blind" ? "已进入双盲训练。" : "该模块先进入预留体验，初版统一使用脱敏A股历史K线训练。");
    });
  });

  $$(".kline-mode-row button[data-kline-setting]").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("active");
      showToast(`${button.textContent.trim()}已${button.classList.contains("active") ? "开启" : "关闭"}。`);
    });
  });

  $$(".kline-timeframes button").forEach((button) => {
    button.addEventListener("click", async () => {
      state.klineTimeframe = button.dataset.klineTimeframe || "101";
      $$(".kline-timeframes button").forEach((item) => item.classList.toggle("active", item === button));
      state.nextKlineScenario = null;
      setKlineSceneLoading(`正在切换同一标的的${button.textContent.trim()}真实K线...`);
      await loadNextKlineScenario({ keepInstrument: true, focusAfterLoad: true });
      showToast(`已切换到${button.textContent.trim()}训练。`);
    });
  });

  $$(".kline-indicators button").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.klineIndicator;
      state.klineIndicators[key] = !state.klineIndicators[key];
      button.classList.toggle("active", Boolean(state.klineIndicators[key]));
      renderKlineChart();
    });
  });

  $$(".kline-feature-grid article").forEach((card) => {
    const enterPractice = async () => {
      await loadNextKlineScenario();
      scrollToKlinePractice();
    };
    card.addEventListener("click", enterPractice);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        enterPractice();
      }
    });
  });

  $("#forumCategoryTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-forum-category]");
    if (!button) return;
    state.forumSelectedCategory = button.dataset.forumCategory || "all";
    state.forumSelectedPostId = "";
    state.forumPostDetail = null;
    loadForumPosts({ keepSelection: false });
  });

  let forumSearchTimer = null;
  $("#forumSearchInput")?.addEventListener("input", (event) => {
    window.clearTimeout(forumSearchTimer);
    state.forumSearch = event.target.value.trim();
    forumSearchTimer = window.setTimeout(() => {
      state.forumSelectedPostId = "";
      state.forumPostDetail = null;
      loadForumPosts({ keepSelection: false });
    }, 220);
  });

  $("#forumPostList")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-forum-post]");
    if (!button) return;
    loadForumPostDetail(button.dataset.forumPost);
  });

  $("#openForumComposerBtn")?.addEventListener("click", () => {
    const composer = $("#forumComposer");
    if (!composer) return;
    composer.hidden = !composer.hidden;
    if (!composer.hidden) $("#forumPostTitle")?.focus();
  });

  $("#cancelForumPostBtn")?.addEventListener("click", () => {
    const composer = $("#forumComposer");
    if (composer) composer.hidden = true;
  });

  $("#forumComposer")?.addEventListener("submit", submitForumPost);

  $("#forumPostDetail")?.addEventListener("submit", submitForumComment);

  $("#scoreOptions").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-score], button[data-option-index]");
    if (!button) return;
    const question = state.questions[state.currentIndex];
    if ("optionIndex" in button.dataset) {
      const option = question.options?.[Number(button.dataset.optionIndex)];
      if (!option) return;
      state.answers[question.question_id] = Number(option.score || 5);
      state.sprint8AnswerOptions[question.question_id] = option;
    } else {
      state.answers[question.question_id] = Number(button.dataset.score);
    }
    renderQuestion();
    if (state.currentIndex < state.questions.length - 1) {
      window.setTimeout(goNext, 120);
    }
  });
}

function revealAssessmentAuth() {
  $("#assessmentCeremony")?.setAttribute("hidden", "");
  const panel = $("#assessmentAuthPanel");
  if (panel) panel.hidden = false;
  $("#loginPhoneInput")?.focus();
}

function showPrecheck() {
  state.assessmentMode = "sprint8";
  updateStep("precheck");
  setText("#sessionStatus", "测前静场");
}

function initAuth() {
  const storedUser = localStorage.getItem("tradingPersonality.authUser");
  if (!storedUser) {
    lockApp();
    return;
  }

  try {
    const user = JSON.parse(storedUser);
    const accessToken = sessionStorage.getItem("tradingPersonality.accessToken") || user.accessToken || "";
    if (accessToken) sessionStorage.setItem("tradingPersonality.accessToken", accessToken);
    unlockApp(accessToken ? { ...user, accessToken } : user);
  } catch {
    localStorage.removeItem("tradingPersonality.authUser");
    sessionStorage.removeItem("tradingPersonality.accessToken");
    lockApp();
  }
}

function lockApp() {
  $("#authGate").hidden = false;
  $("#appShell").hidden = true;
}

function unlockApp(user) {
  state.auth = user;
  $("#authGate").hidden = true;
  $("#appShell").hidden = false;
  $("#currentUserName").textContent = user.displayName || "体验学员";
  $("#nicknameInput").value = user.displayName || $("#nicknameInput").value;
  updateStep("setup");
  renderRetention();
  loadEngagementData();
}

async function enterAssessmentAfterPhoneLogin() {
  if (!getAccessToken()) {
    showToast("登录态未拿到，请重新获取验证码登录。");
    return;
  }

  await loadEngagementData();
  if (state.latestAssessment?.score_result) {
    showToast("已找回历史测评，本次可重新照心更新画像。");
  }

  showPrecheck();
}

function switchAuthTab(tab) {
  if (tab === "wechat" && $("#wechatAuthPanel")?.hidden) tab = "phone";
  $$(".auth-tab").forEach((button) => button.classList.toggle("active", button.dataset.authTab === tab));
  $$(".auth-form").forEach((panel) => panel.classList.toggle("active", panel.dataset.authPanel === tab));
}

async function completeLogin(userDraft) {
  let user = {
    id: `local_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...userDraft
  };

  const serverAuth = await registerUserOnServer(user);
  if (serverAuth?.user) {
    user = {
      ...user,
      id: serverAuth.user.id,
      serverId: serverAuth.user.id,
      displayName: serverAuth.user.nickname || user.displayName,
      personalInviteCode: serverAuth.user.personal_invite_code,
      accessToken: serverAuth.access_token,
      tokenExpiresAt: serverAuth.expires_at,
      serverCreatedAt: serverAuth.user.created_at
    };
    sessionStorage.setItem("tradingPersonality.accessToken", serverAuth.access_token);
  }

  localStorage.setItem("tradingPersonality.authUser", JSON.stringify(user));
  if (!localStorage.getItem("tradingPersonality.registeredOnce")) {
    incrementImpact({
      registrations: 1,
      assistants: user.wechatBound ? 1 : 0
    });
    localStorage.setItem("tradingPersonality.registeredOnce", "1");
  }
  unlockApp(user);
  showToast(serverAuth ? "已进入交易人格测评，后端用户记录已创建。" : "已进入交易人格测评，本地体验账号已创建。");
}

async function registerUserOnServer(userDraft) {
  syncConfigFromInputs();
  if (!state.config.useBackend || !state.config.apiBaseUrl) return null;

  try {
    return await apiFetch("/api/v1/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({
        method: userDraft.method,
        display_name: userDraft.displayName,
        contact: userDraft.contact,
        wechat_bound: Boolean(userDraft.wechatBound),
        invite_code: userDraft.method === "invite_demo" ? userDraft.contact : "",
        source_channel: getSourceChannel()
      })
    });
  } catch (error) {
    console.warn("后端用户登录暂不可用，使用本地体验账号。", error);
    return null;
  }
}

async function loadEngagementData() {
  renderRetention();
  const userId = getCurrentUserId();
  if (!userId || !state.config.useBackend || !state.config.apiBaseUrl) return;

  try {
    const [habitData, influenceData, historyData, leaderboardData, klineStatsData, klineLevelData, klineBankData, nextKlineData] = await Promise.all([
      apiFetch(`/api/v1/users/${userId}/habit`),
      apiFetch(`/api/v1/users/${userId}/influence`),
      apiFetch(`/api/v1/users/${userId}/assessments?limit=8`),
      apiFetch(`/api/v1/kline-practice/leaderboard?period=${state.leaderboardPeriod}&limit=6`),
      apiFetch(`/api/v1/users/${userId}/kline-practice/stats`),
      apiFetch(`/api/v1/kline-practice/levels?user_id=${encodeURIComponent(userId)}`),
      apiFetch("/api/v1/kline-practice/stats"),
      apiFetch(`/api/v1/kline-practice/next?user_id=${encodeURIComponent(userId)}&stage_id=${encodeURIComponent(getActiveKlineStageId())}&timeframe=${encodeURIComponent(state.klineTimeframe)}&require_real=1`)
    ]);
    state.habit = habitData.habit || state.habit;
    state.influence = influenceData.influence || null;
    state.assessmentHistory = historyData.history || [];
    state.latestAssessment = historyData.latest || null;
    state.leaderboard = leaderboardData.leaderboard || [];
    state.klineStats = klineStatsData.stats || state.klineStats;
    state.klineLevel = klineLevelData.level || klineStatsData.stats || state.klineLevel;
    state.klineBankStats = klineBankData || state.klineBankStats;
    if (nextKlineData.scenario) {
      state.klineScenario = normalizeKlineScenario(nextKlineData.scenario);
      resetKlineSimulation(state.klineScenario);
      state.klineAnswered = false;
      state.nextKlineScenario = null;
    }
    renderRetention();
  } catch (error) {
    console.warn("修行数据暂不可用，使用本地留存数据。", error);
  }
}

async function loadForumPosts({ keepSelection = true } = {}) {
  const params = new URLSearchParams();
  if (state.forumSelectedCategory && state.forumSelectedCategory !== "all") {
    params.set("category", state.forumSelectedCategory);
  }
  if (state.forumSearch) params.set("q", state.forumSearch);
  params.set("limit", "40");

  try {
    if (state.config.useBackend && state.config.apiBaseUrl) {
      const data = await apiFetch(`/api/v1/forum/posts?${params.toString()}`);
      const localDrafts = getFilteredLocalForumPosts().filter((post) => post.id.startsWith("local-forum-"));
      state.forumPosts = localDrafts.concat(Array.isArray(data.posts) ? data.posts : []);
    } else {
      state.forumPosts = getFilteredLocalForumPosts();
    }
  } catch (error) {
    console.warn("论坛后端暂不可用，使用本地学堂内容。", error);
    state.forumPosts = getFilteredLocalForumPosts();
  }

  if (!keepSelection || !state.forumPosts.some((post) => post.id === state.forumSelectedPostId)) {
    state.forumSelectedPostId = state.forumPosts[0]?.id || "";
    state.forumPostDetail = null;
    state.forumComments = [];
  }

  const selected = getSelectedForumPost();
  if (selected?.content && !state.forumPostDetail) {
    state.forumPostDetail = selected;
    state.forumComments = readLocalForumComments(selected.id);
  }
  renderForum();

  if (state.forumSelectedPostId && (!state.forumPostDetail || state.forumPostDetail.id !== state.forumSelectedPostId)) {
    await loadForumPostDetail(state.forumSelectedPostId, { silent: true });
  }
}

async function loadForumPostDetail(postId, { silent = false } = {}) {
  if (!postId) return;
  state.forumSelectedPostId = postId;
  const localPost = getLocalForumPosts().find((post) => post.id === postId);

  try {
    if (state.config.useBackend && state.config.apiBaseUrl && !postId.startsWith("local-")) {
      const data = await apiFetch(`/api/v1/forum/posts/${encodeURIComponent(postId)}`);
      state.forumPostDetail = data.post || null;
      state.forumComments = Array.isArray(data.comments) ? data.comments : [];
    } else {
      state.forumPostDetail = localPost || getSelectedForumPost();
      state.forumComments = readLocalForumComments(postId);
    }
  } catch (error) {
    console.warn("论坛详情暂不可用，使用本地内容。", error);
    state.forumPostDetail = localPost || getSelectedForumPost();
    state.forumComments = readLocalForumComments(postId);
    if (!silent) showToast("讨论详情暂时无法连接后端，已显示本地内容。");
  }

  renderForum();
}

function renderForum() {
  renderForumCategories();
  renderForumPostList();
  renderForumPostDetail();
}

function renderForumCategories() {
  const target = $("#forumCategoryTabs");
  if (!target) return;
  target.innerHTML = forumCategories.map((category) => `
    <button type="button" class="${state.forumSelectedCategory === category.id ? "active" : ""}" data-forum-category="${category.id}">
      ${escapeHtml(category.name)}
    </button>
  `).join("");
  const searchInput = $("#forumSearchInput");
  if (searchInput && searchInput.value !== state.forumSearch) searchInput.value = state.forumSearch;
}

function renderForumPostList() {
  const target = $("#forumPostList");
  if (!target) return;
  if (!state.forumPosts.length) {
    target.innerHTML = `
      <div class="forum-empty">
        <strong>还没有找到相关内容</strong>
        <span>换个关键词，或发起一个同修问题。</span>
      </div>
    `;
    return;
  }

  target.innerHTML = state.forumPosts.map((post) => `
    <button type="button" class="forum-post-card ${post.id === state.forumSelectedPostId ? "active" : ""}" data-forum-post="${escapeHtml(post.id)}">
      <span>${escapeHtml(post.category_name || getForumCategoryName(post.category))}</span>
      <strong>${escapeHtml(post.title)}</strong>
      <p>${escapeHtml(post.summary || "")}</p>
      <em>${formatForumDate(post.created_at)} · ${formatNumber(post.view_count || 0)}阅读 · ${formatNumber(post.comment_count || 0)}讨论</em>
    </button>
  `).join("");
}

function renderForumPostDetail() {
  const target = $("#forumPostDetail");
  if (!target) return;
  const post = state.forumPostDetail || getSelectedForumPost();
  if (!post) {
    target.innerHTML = `
      <div class="forum-detail-empty">
        <strong>选择一篇内容</strong>
        <span>这里会显示文章、复盘和同修讨论。</span>
      </div>
    `;
    return;
  }

  const paragraphs = String(post.content || post.summary || "")
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const comments = state.forumComments.map((comment) => `
    <div class="forum-comment">
      <div>
        <strong>${escapeHtml(comment.author_name || "知行同修")}</strong>
        <span>${formatForumDate(comment.created_at)}</span>
      </div>
      <p>${escapeHtml(comment.content)}</p>
    </div>
  `).join("");

  target.innerHTML = `
    <div class="forum-detail-head">
      <span>${escapeHtml(post.category_name || getForumCategoryName(post.category))}</span>
      <h3>${escapeHtml(post.title)}</h3>
      <div>
        <em>${escapeHtml(post.author_name || "知行学堂")}</em>
        <em>${formatForumDate(post.created_at)}</em>
      </div>
    </div>
    <div class="forum-detail-body">${paragraphs}</div>
    <div class="forum-tags">
      ${(post.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
    </div>
    <section class="forum-comments">
      <div class="forum-comments-head">
        <strong>同修讨论</strong>
        <span>${formatNumber(state.forumComments.length)} 条</span>
      </div>
      ${comments || `<p class="forum-login-tip">还没有讨论。你可以留下问题、复盘或训练体会。</p>`}
      ${state.auth ? `
        <form class="forum-comment-form" data-forum-comment-form data-post-id="${escapeHtml(post.id)}">
          <textarea name="content" rows="3" maxlength="1200" placeholder="写下你的问题、复盘或回应。"></textarea>
          <button class="secondary-action" type="submit">回应</button>
        </form>
      ` : `<p class="forum-login-tip">登录后可以参与讨论。</p>`}
    </section>
  `;
}

async function submitForumPost(event) {
  event.preventDefault();
  if (!state.auth) {
    showToast("请先登录，再发布提问或复盘。");
    return;
  }

  const form = event.currentTarget;
  const category = $("#forumPostCategory")?.value || "qa";
  const title = $("#forumPostTitle")?.value.trim() || "";
  const content = $("#forumPostContent")?.value.trim() || "";
  const tags = parseForumTags($("#forumPostTags")?.value || "");
  if (title.length < 4) {
    showToast("标题至少写 4 个字。");
    return;
  }
  if (content.length < 10) {
    showToast("内容至少写 10 个字，把场景说清楚一点。");
    return;
  }

  const button = form.querySelector("button[type='submit']");
  if (button) button.disabled = true;
  const payload = {
    category,
    title,
    content,
    tags,
    nickname: state.auth.displayName || "知行同修",
    source_channel: getSourceChannel()
  };

  try {
    const hasServerUser = Boolean(state.auth.serverId && !String(state.auth.serverId).startsWith("local_"));
    if (state.config.useBackend && state.config.apiBaseUrl && hasServerUser && !getAccessToken()) {
      showToast("登录态已失效，请重新登录后再发布。");
      return;
    }

    if (state.config.useBackend && state.config.apiBaseUrl && getAccessToken()) {
      const data = await apiFetch("/api/v1/forum/posts", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      state.forumSelectedPostId = data.post?.id || "";
      state.forumPostDetail = data.post || null;
      state.forumComments = [];
      showToast("已发布到知行学堂。");
    } else {
      const post = saveLocalForumPost(payload);
      state.forumSelectedPostId = post.id;
      state.forumPostDetail = post;
      state.forumComments = [];
      showToast("已发布到本机学堂草稿。");
    }

    form.reset();
    form.hidden = true;
    await loadForumPosts({ keepSelection: true });
  } catch (error) {
    console.warn("发布讨论失败。", error);
    const post = saveLocalForumPost(payload);
    state.forumSelectedPostId = post.id;
    state.forumPostDetail = post;
    state.forumComments = [];
    form.reset();
    form.hidden = true;
    await loadForumPosts({ keepSelection: true });
    showToast("后端暂不可用，已先保存在本机学堂草稿。");
  } finally {
    if (button) button.disabled = false;
  }
}

async function submitForumComment(event) {
  const form = event.target.closest("form[data-forum-comment-form]");
  if (!form) return;
  event.preventDefault();
  if (!state.auth) {
    showToast("请先登录，再参与讨论。");
    return;
  }

  const postId = form.dataset.postId || state.forumSelectedPostId;
  const textarea = form.querySelector("textarea[name='content']");
  const content = textarea?.value.trim() || "";
  if (content.length < 2) {
    showToast("回应内容太短了。");
    return;
  }

  const button = form.querySelector("button[type='submit']");
  if (button) button.disabled = true;

  try {
    const hasServerUser = Boolean(state.auth.serverId && !String(state.auth.serverId).startsWith("local_"));
    if (state.config.useBackend && state.config.apiBaseUrl && hasServerUser && !getAccessToken()) {
      showToast("登录态已失效，请重新登录后再回应。");
      return;
    }

    if (state.config.useBackend && state.config.apiBaseUrl && getAccessToken() && !postId.startsWith("local-")) {
      await apiFetch(`/api/v1/forum/posts/${encodeURIComponent(postId)}/comments`, {
        method: "POST",
        body: JSON.stringify({
          content,
          nickname: state.auth.displayName || "知行同修"
        })
      });
      showToast("回应已发布。");
    } else {
      saveLocalForumComment(postId, {
        content,
        author_name: state.auth.displayName || "知行同修"
      });
      showToast("回应已保存在本机。");
    }

    textarea.value = "";
    await loadForumPostDetail(postId);
    await loadForumPosts({ keepSelection: true });
  } catch (error) {
    console.warn("发布回应失败。", error);
    saveLocalForumComment(postId, {
      content,
      author_name: state.auth.displayName || "知行同修"
    });
    textarea.value = "";
    await loadForumPostDetail(postId);
    showToast("后端暂不可用，回应已先保存在本机。");
  } finally {
    if (button) button.disabled = false;
  }
}

function getFilteredLocalForumPosts() {
  const keyword = state.forumSearch.toLowerCase();
  return getLocalForumPosts()
    .filter((post) => {
      if (state.forumSelectedCategory !== "all" && post.category !== state.forumSelectedCategory) return false;
      if (!keyword) return true;
      return [post.title, post.summary, post.content, ...(post.tags || [])].join(" ").toLowerCase().includes(keyword);
    })
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

function getLocalForumPosts() {
  const localPosts = readJsonFromStorage("tradingPersonality.forumPosts", []);
  return forumFallbackPosts.concat(Array.isArray(localPosts) ? localPosts : []).map((post) => ({
    ...post,
    category_name: post.category_name || getForumCategoryName(post.category),
    comment_count: readLocalForumComments(post.id).length || Number(post.comment_count || 0)
  }));
}

function saveLocalForumPost(payload) {
  const now = new Date().toISOString();
  const post = {
    id: `local-forum-${Date.now()}`,
    category: payload.category || "qa",
    category_name: getForumCategoryName(payload.category),
    title: payload.title,
    summary: payload.content.replace(/\s+/g, " ").slice(0, 90),
    content: payload.content,
    tags: payload.tags || [],
    author_name: payload.nickname || "知行同修",
    view_count: 0,
    comment_count: 0,
    like_count: 0,
    pinned: false,
    created_at: now,
    updated_at: now
  };
  const posts = readJsonFromStorage("tradingPersonality.forumPosts", []);
  localStorage.setItem("tradingPersonality.forumPosts", JSON.stringify([post].concat(posts)));
  return post;
}

function readLocalForumComments(postId) {
  const comments = readJsonFromStorage("tradingPersonality.forumComments", {});
  return Array.isArray(comments[postId]) ? comments[postId] : [];
}

function saveLocalForumComment(postId, payload) {
  const comments = readJsonFromStorage("tradingPersonality.forumComments", {});
  const nextComment = {
    id: `local-comment-${Date.now()}`,
    post_id: postId,
    author_name: payload.author_name || "知行同修",
    content: payload.content,
    created_at: new Date().toISOString()
  };
  comments[postId] = (comments[postId] || []).concat(nextComment);
  localStorage.setItem("tradingPersonality.forumComments", JSON.stringify(comments));
  return nextComment;
}

function readJsonFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getSelectedForumPost() {
  return state.forumPosts.find((post) => post.id === state.forumSelectedPostId) || state.forumPosts[0] || null;
}

function getForumCategoryName(category) {
  return forumCategoryNameMap[category] || "同修问答";
}

function parseForumTags(value) {
  return String(value || "")
    .split(/[，,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function formatForumDate(value) {
  if (!value) return "刚刚";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "刚刚";
  const diffMinutes = Math.floor((Date.now() - time) / 60000);
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffMinutes < 60 * 24) return `${Math.floor(diffMinutes / 60)}小时前`;
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(time));
}

async function handleDailyCheckIn() {
  const userId = getCurrentUserId();
  if (!userId) {
    showToast("请先登录，再做每日修心签到。");
    return;
  }

  if (state.config.useBackend && state.config.apiBaseUrl) {
    try {
      const data = await apiFetch(`/api/v1/users/${userId}/check-in`, {
        method: "POST",
        body: JSON.stringify({
          source_channel: getSourceChannel(),
          note: "今日先正心，再看盘"
        })
      });
      state.habit = data.habit;
      renderRetention();
      showToast(data.habit.repeated ? "今日已经签到，守住即可。" : "今日修心签到完成，修行值 +10。");
      return;
    } catch (error) {
      console.warn("后端签到暂不可用，使用本地签到。", error);
    }
  }

  const today = getDateKey(new Date());
  const dates = new Set(state.habit.local_dates || []);
  const repeated = dates.has(today);
  dates.add(today);
  state.habit = buildLocalHabitFromDates([...dates]);
  saveLocalHabit(state.habit);
  renderRetention();
  showToast(repeated ? "今日已经签到，守住即可。" : "今日修心签到完成。");
}

async function submitKlineDecision(decision) {
  if (state.klineAnswered) {
    showToast("本轮训练已结束，请换一段K线。");
    return;
  }

  state.klineSelectedDecision = decision;
  advanceKlineSimulation(decision);
  renderRetention();

  if (state.klineAnswered) {
    await finishKlineSimulation();
  }
}

function resetKlineSimulation(scenario = state.klineScenario) {
  const candles = normalizeCandles(scenario.candles || []);
  const total = candles.length || 0;
  const startIndex = Math.min(Math.max(Number(scenario.visible_count || 30), 1), Math.max(total - 1, 0));
  state.klineSim = {
    candles,
    currentIndex: startIndex,
    cash: klineTradeRules.initialCash,
    units: 0,
    startEquity: klineTradeRules.initialCash,
    peakEquity: klineTradeRules.initialCash,
    maxDrawdown: 0,
    tradeCount: 0,
    feeTotal: 0,
    taxTotal: 0,
    costTotal: 0,
    realizedPnl: 0,
    sameDaySellBlocks: 0,
    openLots: [],
    closedTrades: [],
    tradeLedger: [],
    actions: [],
    startedAt: Date.now(),
    completed: total <= startIndex
  };
  state.klineAnswered = Boolean(state.klineSim.completed);
  state.klineSubmitting = false;
  state.klineSelectedDecision = "";
  state.klineLastFeedback = null;
  clearKlineReviewCard();
}

function advanceKlineSimulation(action) {
  const sim = ensureKlineSimulation();
  if (!sim.candles.length) return;

  const normalizedAction = normalizeKlineAction(action);
  const beforeIndex = sim.currentIndex;
  const beforeEquity = getKlineEquity(sim);
  const beforePosition = getKlinePositionPercent(sim);
  const current = sim.candles[sim.currentIndex];
  const price = current?.close || 1;
  let note = "观望也是动作。能不乱动，就是临盘定力。";
  let recordedAction = normalizedAction;
  let tradeResult = null;

  if (normalizedAction === "买") {
    const ratio = isKlineSettingActive("splitPosition") ? 0.33 : 1;
    tradeResult = executeKlineBuy(sim, { price, index: beforeIndex, cashRatio: ratio });
    if (tradeResult.executed) {
      note = isKlineSettingActive("splitPosition")
        ? "已按分仓模式买入一份。下一根K线继续验证计划。"
        : "已买入。现在重点是盯住计划，而不是盯住情绪。";
    } else {
      recordedAction = "观望";
      note = tradeResult.reason || "当前现金不足，继续持仓观察。";
    }
  }

  if (normalizedAction === "卖") {
    tradeResult = executeKlineSell(sim, { price, index: beforeIndex, label: "卖" });
    if (tradeResult.executed) {
      note = "已卖出离场。离场不是对错之争，是保护复盘节奏。";
    } else {
      recordedAction = tradeResult.blockedByT1 ? "T+1限制" : "观望";
      note = tradeResult.reason || "当前没有持仓，A股训练里不做裸卖空，这次按观望处理。";
    }
  }

  if (normalizedAction === "观望") {
    note = sim.units > 0
      ? "选择继续观望，持仓不变。练的是持仓中的定力，而不是每根K线都要动作。"
      : "选择空仓观望。观望不是错过，是先把主动权拿回来。";
  }

  const nextIndex = Math.min(sim.currentIndex + 1, sim.candles.length - 1);
  sim.actions.push({
    action: recordedAction,
    raw_action: action,
    index: beforeIndex,
    price,
    trade_value: tradeResult?.tradeValue || 0,
    fee: tradeResult?.fee || 0,
    tax: tradeResult?.tax || 0,
    cost: tradeResult?.cost || 0,
    blocked_reason: tradeResult?.reason || "",
    position_before: beforePosition,
    position_after: getKlinePositionPercent(sim),
    equity_before: beforeEquity,
    equity_after_at_decision: getKlineEquity(sim)
  });
  sim.currentIndex = nextIndex;
  const autoSellNote = applyAutoSell(sim);
  updateKlineRisk(sim);
  note = buildKlineStepFeedback({
    sim,
    action: recordedAction,
    beforeIndex,
    nextIndex,
    decisionPrice: price,
    beforeEquity,
    beforePosition,
    baseNote: autoSellNote || note
  });

  if (sim.currentIndex >= sim.candles.length - 1) {
    updateKlineRisk(sim);
    sim.finalEquity = getKlineEquity(sim);
    sim.completed = true;
    state.klineAnswered = true;
    note = buildKlineCompletionText(sim);
    renderKlineReviewResult(sim);
  }

  $("#klineInsight").textContent = note;
}

function normalizeKlineAction(action = "") {
  if (/空仓|观望|等待/.test(action)) return "观望";
  if (/卖|离场|止损/.test(action)) return "卖";
  return "买";
}

function executeKlineBuy(sim, { price, index, cashRatio = 1 }) {
  const budget = Math.max(0, Number(sim.cash || 0) * cashRatio);
  if (budget <= 1 || price <= 0) {
    return { executed: false, reason: "当前现金不足，继续持仓观察。" };
  }
  const order = buildKlineBuyOrder(budget, price);
  if (order.units <= 0 || order.totalCost > sim.cash) {
    return { executed: false, reason: "扣除模拟交易成本后，可用现金不足。" };
  }
  const tradeDay = getKlineTradeDay(sim.candles[index]);
  sim.cash -= order.totalCost;
  sim.units += order.units;
  sim.tradeCount += 1;
  sim.feeTotal += order.fee;
  sim.costTotal += order.fee;
  const lot = {
    units: order.units,
    price,
    index,
    trade_date: tradeDay,
    trade_value: order.tradeValue,
    fee: order.fee,
    cost_basis: order.tradeValue + order.fee
  };
  sim.openLots.push(lot);
  const event = {
    side: "买入",
    index,
    date: tradeDay,
    price,
    units: order.units,
    tradeValue: order.tradeValue,
    fee: order.fee,
    tax: 0,
    cost: order.fee,
    pnl: 0
  };
  sim.tradeLedger.push(event);
  return { executed: true, ...event };
}

function executeKlineSell(sim, { price, index, label = "卖" }) {
  if (Number(sim.units || 0) <= 0) {
    return { executed: false, reason: "当前没有持仓，A股训练里不做裸卖空，这次按观望处理。" };
  }
  const currentDay = getKlineTradeDay(sim.candles[index]);
  const lots = getKlineSellableLots(sim, index);
  const blockedUnits = getKlineBlockedUnits(sim, index);
  const units = lots.reduce((sum, lot) => sum + Number(lot.units || 0), 0);
  if (units <= 0) {
    sim.sameDaySellBlocks += 1;
    return {
      executed: false,
      blockedByT1: true,
      reason: `T+1限制：${currentDay || "当日"}买入的仓位暂不可卖，已按纪律提醒记录。`
    };
  }
  const tradeValue = units * price;
  const fee = getKlineTradeFee(tradeValue);
  const tax = getKlineStampTax(tradeValue);
  const cost = fee + tax;
  const costBasis = lots.reduce((sum, lot) => sum + Number(lot.cost_basis || lot.units * lot.price || 0), 0);
  const pnl = tradeValue - cost - costBasis;
  sim.cash += Math.max(0, tradeValue - cost);
  sim.units = Math.max(0, Number(sim.units || 0) - units);
  sim.tradeCount += 1;
  sim.feeTotal += fee;
  sim.taxTotal += tax;
  sim.costTotal += cost;
  sim.realizedPnl += pnl;
  sim.openLots = keepUnfilledKlineLots(sim.openLots, lots);
  if (sim.openLots.length === 0 && sim.units < 0.000001) sim.units = 0;
  const event = {
    side: label,
    index,
    date: currentDay,
    price,
    units,
    tradeValue,
    fee,
    tax,
    cost,
    pnl,
    blockedUnits
  };
  sim.closedTrades.push(event);
  sim.tradeLedger.push(event);
  return { executed: true, ...event };
}

function buildKlineBuyOrder(budget, price) {
  let tradeValue = Math.max(0, Number(budget || 0));
  let fee = getKlineTradeFee(tradeValue);
  if (tradeValue + fee > budget) {
    tradeValue = Math.max(0, budget - fee);
    fee = getKlineTradeFee(tradeValue);
  }
  if (tradeValue + fee > budget) {
    tradeValue = Math.max(0, budget - fee);
  }
  return {
    tradeValue,
    fee,
    totalCost: tradeValue + fee,
    units: price > 0 ? tradeValue / price : 0
  };
}

function getKlineTradeFee(tradeValue) {
  if (!isKlineSettingActive("tradeCost")) return 0;
  const value = Number(tradeValue || 0);
  if (value <= 0) return 0;
  return Math.max(klineTradeRules.minCommission, value * klineTradeRules.commissionRate);
}

function getKlineStampTax(tradeValue) {
  if (!isKlineSettingActive("tradeCost")) return 0;
  return Math.max(0, Number(tradeValue || 0) * klineTradeRules.stampTaxRate);
}

function getKlineTradeDay(candle = {}) {
  const text = String(candle.date || "");
  const match = text.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
  return match ? match[0].replace(/\//g, "-") : text.slice(0, 10);
}

function getKlineSellableLots(sim, index) {
  const lots = sim.openLots?.length
    ? sim.openLots
    : Number(sim.units || 0) > 0
      ? [{ units: sim.units, price: sim.candles[index]?.close || 1, index: -1, trade_date: "", cost_basis: sim.units * (sim.candles[index]?.close || 1) }]
      : [];
  return lots.filter((lot) => isKlineLotSellable(sim, lot, index));
}

function getKlineBlockedUnits(sim, index) {
  if (!isKlineSettingActive("t1Rule")) return 0;
  return (sim.openLots || [])
    .filter((lot) => !isKlineLotSellable(sim, lot, index))
    .reduce((sum, lot) => sum + Number(lot.units || 0), 0);
}

function isKlineLotSellable(sim, lot, index) {
  if (!isKlineSettingActive("t1Rule")) return true;
  if (Number(lot.index || 0) < 0) return true;
  const buyDay = lot.trade_date || getKlineTradeDay(sim.candles[lot.index]);
  const currentDay = getKlineTradeDay(sim.candles[index]);
  if (buyDay && currentDay && buyDay === currentDay) return false;
  return index > Number(lot.index || 0);
}

function keepUnfilledKlineLots(openLots = [], soldLots = []) {
  const sold = new Set(soldLots);
  return openLots.filter((lot) => !sold.has(lot));
}

function buildKlineStepFeedback({ sim, action, beforeIndex, nextIndex, decisionPrice, beforeEquity, beforePosition, baseNote }) {
  const trainingContext = getActiveKlineTrainingContext();
  const next = sim.candles[nextIndex];
  const nextPct = decisionPrice ? ((Number(next?.close || decisionPrice) - decisionPrice) / decisionPrice) * 100 : 0;
  const equityNow = getKlineEquity(sim);
  const accountPct = sim.startEquity ? ((equityNow - sim.startEquity) / sim.startEquity) * 100 : 0;
  const accountDelta = beforeEquity ? ((equityNow - beforeEquity) / beforeEquity) * 100 : 0;
  const positionNow = getKlinePositionPercent(sim);
  const actionText = action === "空仓" ? "观望" : action;
  const lastAction = sim.actions.at(-1) || {};
  const costText = Number(lastAction.cost || 0) > 0 ? `，本次成本 ${formatKlineMoney(lastAction.cost)}` : "";
  let resultText = "";

  if (action === "买") {
    resultText = nextPct >= 0
      ? `买入后下一根上涨 ${nextPct.toFixed(2)}%，这一步暂时得到市场反馈。`
      : `买入后下一根下跌 ${Math.abs(nextPct).toFixed(2)}%，这一步开始承受回撤，重点看是否有失效线。`;
  } else if (action === "卖") {
    resultText = nextPct < 0
      ? `卖出后下一根下跌 ${Math.abs(nextPct).toFixed(2)}%，这一步躲过了一段回撤。`
      : `卖出后下一根上涨 ${nextPct.toFixed(2)}%，这一步少赚了后面的波动，但保护了纪律。`;
  } else if (beforePosition > 0) {
    resultText = nextPct >= 0
      ? `持仓观望后下一根上涨 ${nextPct.toFixed(2)}%，这一步练的是按计划持有。`
      : `持仓观望后下一根下跌 ${Math.abs(nextPct).toFixed(2)}%，这一步承受了波动，重点看是否触发失效线。`;
  } else {
    resultText = nextPct < 0
      ? `观望后下一根下跌 ${Math.abs(nextPct).toFixed(2)}%，这一步躲过了一根下跌K。`
      : `观望后下一根上涨 ${nextPct.toFixed(2)}%，这一步练的是不被踏空感牵走。`;
  }

  state.klineLastFeedback = {
    action: actionText,
    next_result: `${nextPct >= 0 ? "+" : ""}${nextPct.toFixed(2)}%`,
    account_delta: `${accountDelta >= 0 ? "+" : ""}${accountDelta.toFixed(2)}%`,
    account_total: `${accountPct >= 0 ? "+" : ""}${accountPct.toFixed(2)}%`,
    drawdown: `${Math.abs(sim.maxDrawdown).toFixed(2)}%`,
    position: `${beforePosition}% → ${positionNow}%`,
    cost: Number(lastAction.cost || 0) > 0 ? formatKlineMoney(lastAction.cost) : "无",
    scene: trainingContext.scene,
    mind_tag: lastAction.blocked_reason ? "规则提醒" : getKlineMindTag({ action, beforePosition, nextPct }),
    reminder: `${trainingContext.lesson} 本轮盯住：${trainingContext.scene || trainingContext.focus}。`,
    next_action: trainingContext.action
  };

  return `第${beforeIndex + 1}根选择「${actionText}」 → 推进到第${nextIndex + 1}根
${resultText}
账户变化：本步 ${accountDelta >= 0 ? "+" : ""}${accountDelta.toFixed(2)}%，本轮 ${accountPct >= 0 ? "+" : ""}${accountPct.toFixed(2)}%，仓位 ${beforePosition}% → ${positionNow}%${costText}。
${baseNote}`;
}

function getKlineMindTag({ action, beforePosition, nextPct }) {
  if (action === "买" && nextPct < -1) return "追高冲动";
  if (action === "买" && nextPct >= 1) return "开仓试错";
  if (action === "卖" && nextPct < -1) return "离场保护";
  if (action === "卖" && nextPct >= 1) return "卖飞后悔";
  if (action === "观望" && beforePosition > 0 && nextPct < -1) return "持仓考验";
  if (action === "观望" && beforePosition > 0) return "持有确认";
  if (action === "观望" && nextPct >= 1) return "踏空觉察";
  if (action === "观望" && nextPct < -1) return "空仓定力";
  return getActiveKlineTrainingContext().focus || "一念觉察";
}

function renderKlineFeedbackCard() {
  const target = $("#klineFeedbackCard");
  if (!target) return;
  const feedback = state.klineLastFeedback;
  if (!feedback) {
    target.hidden = true;
    target.innerHTML = "";
    return;
  }
  target.hidden = false;
  target.innerHTML = `
    <div class="feedback-main">
      <span>本次动作</span>
      <strong>${escapeHtml(feedback.action)}</strong>
      <em>${escapeHtml(feedback.mind_tag)}</em>
    </div>
    <div class="feedback-scene">当前场景：${escapeHtml(feedback.scene || "综合训练")}</div>
    <div class="feedback-metrics">
      <div><span>下一根</span><strong>${escapeHtml(feedback.next_result)}</strong></div>
      <div><span>本步账户</span><strong>${escapeHtml(feedback.account_delta)}</strong></div>
      <div><span>本轮盈亏</span><strong>${escapeHtml(feedback.account_total)}</strong></div>
      <div><span>仓位</span><strong>${escapeHtml(feedback.position)}</strong></div>
      <div><span>成本</span><strong>${escapeHtml(feedback.cost)}</strong></div>
    </div>
    <p>${escapeHtml(feedback.reminder)}</p>
    <small>${escapeHtml(feedback.next_action)}</small>
  `;
}

function applyAutoSell(sim) {
  if (!isKlineSettingActive("autoSell") || sim.units <= 0) return "";
  const currentPrice = sim.candles[sim.currentIndex]?.close || 1;
  const lastBuy = [...sim.actions].reverse().find((item) => item.action === "买");
  if (!lastBuy) return "";
  const pnl = ((currentPrice - lastBuy.price) / lastBuy.price) * 100;
  if (pnl <= -5 || pnl >= 10) {
    const result = executeKlineSell(sim, { price: currentPrice, index: sim.currentIndex, label: "自动卖出" });
    if (!result.executed) {
      return result.blockedByT1
        ? "自动卖出信号出现，但T+1限制暂不能卖出，先记录风险。"
        : result.reason;
    }
    sim.actions.push({
      action: "自动卖出",
      index: sim.currentIndex,
      price: currentPrice,
      trade_value: result.tradeValue,
      fee: result.fee,
      tax: result.tax,
      cost: result.cost,
      position_after: getKlinePositionPercent(sim),
      equity_after_at_decision: getKlineEquity(sim)
    });
    return pnl <= -5 ? "自动卖出触发：回撤超过纪律线。" : "自动卖出触发：阶段收益达到保护线。";
  }
  return "";
}

function updateKlineRisk(sim) {
  const equity = getKlineEquity(sim);
  sim.peakEquity = Math.max(sim.peakEquity, equity);
  const drawdown = sim.peakEquity ? ((equity - sim.peakEquity) / sim.peakEquity) * 100 : 0;
  sim.maxDrawdown = Math.min(sim.maxDrawdown, drawdown);
}

async function finishKlineSimulation() {
  const sim = ensureKlineSimulation();
  const pnlPercent = getKlinePnlPercent(sim);
  const score = Math.max(20, Math.min(98, Math.round(76 + pnlPercent * 1.4 - Math.abs(sim.maxDrawdown) * 0.8 + Math.min(sim.tradeCount, 8))));
  recordLocalKlineCompletion(score);
  $("#klineScoreBadge").textContent = `${score}分`;
  renderKlineReviewResult(sim, score);

  const userId = getCurrentUserId();
  if (!userId || !state.config.useBackend || !state.config.apiBaseUrl || state.klineSubmitting) {
    renderRetention();
    return;
  }

  state.klineSubmitting = true;
  try {
    const data = await apiFetch("/api/v1/kline-practice/submit", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        nickname: state.auth?.displayName || "体验学员",
        scenario_id: state.klineScenario.id,
        decision: `回放完成：${sim.tradeCount}次操作`,
        score,
        discipline: Math.max(30, 100 - Math.round(Math.abs(sim.maxDrawdown) * 3)),
        note: buildKlineCompletionText(sim),
        stage_id: getActiveKlineStageId(),
        request_next: true
      })
    });
    state.klineStats = data.kline_stats || state.klineStats;
    state.klineLevel = data.kline_level || state.klineLevel;
    state.nextKlineScenario = data.next_scenario?.data_source === "eastmoney_history" ? normalizeKlineScenario(data.next_scenario) : null;
    await refreshKlineLeaderboard();
  } catch (error) {
    console.warn("K线回放结果同步失败，已保留本地成绩。", error);
  } finally {
    state.klineSubmitting = false;
    renderRetention();
  }
}

function buildKlineCompletionText(sim) {
  const card = buildKlineReviewCard(sim);
  return `【本轮K线复盘卡】
模拟收益：${card.pnl}
最大回撤：${card.drawdown}
交易胜率：${card.winRate}
模拟成本：${card.totalCost}
操作次数：${card.tradeCount}
操作画像：${card.profile}
盘面变化：${card.marketReplay}

交易操作建议：
${card.operationAdvice}

阳明心学提醒：
${card.yangmingQuote}

下一轮训练计划：
${card.trainingPlan}

AI复盘点评：
${card.aiReview}

交易明细：
${card.tradeLedger}`;
}

function renderKlineReviewResult(sim, score = null) {
  const target = $("#klineReviewCard");
  if (!target) return;
  const card = buildKlineReviewCard(sim);
  const quota = getKlineQuota();
  target.hidden = false;
  target.innerHTML = `
    <div class="review-card-head">
      <span>本轮K线复盘卡</span>
      <strong>${score ? `${score}分` : "已完成"}</strong>
    </div>
    <div class="review-card-metrics">
      <div><strong>${escapeHtml(card.pnl)}</strong><span>模拟收益</span></div>
      <div><strong>${escapeHtml(card.drawdown)}</strong><span>最大回撤</span></div>
      <div><strong>${escapeHtml(card.winRate)}</strong><span>交易胜率</span></div>
      <div><strong>${escapeHtml(card.totalCost)}</strong><span>模拟成本</span></div>
      <div><strong>${escapeHtml(card.tradeCount)}</strong><span>操作次数</span></div>
      <div><strong>${escapeHtml(card.profile)}</strong><span>操作画像</span></div>
    </div>
    <dl>
      <dt>盘面变化</dt>
      <dd>${escapeHtml(card.marketReplay)}</dd>
      <dt>交易操作建议</dt>
      <dd>${escapeHtml(card.operationAdvice)}</dd>
      <dt>AI复盘点评</dt>
      <dd>${escapeHtml(card.aiReview)}</dd>
      <dt>交易明细</dt>
      <dd>${escapeHtml(card.tradeLedger)}</dd>
      <dt>阳明心学提醒</dt>
      <dd>${escapeHtml(card.yangmingQuote)}</dd>
      <dt>下一轮训练计划</dt>
      <dd>${escapeHtml(card.trainingPlan)}</dd>
      <dt>今日闭环反馈</dt>
      <dd>本局惯性：${escapeHtml(card.profile)}。${quota.remaining > 0 ? `今天还剩 ${quota.remaining} 局，下一局继续练「${escapeHtml(card.nextFocus)}」。` : `今日训练额度已完成，明天继续练「${escapeHtml(card.nextFocus)}」。`}</dd>
    </dl>
  `;
}

function clearKlineReviewCard() {
  const target = $("#klineReviewCard");
  if (!target) return;
  target.hidden = true;
  target.innerHTML = "";
}

function buildKlineReviewCard(sim) {
  const pnlValue = getKlinePnlPercent(sim);
  const drawdownValue = Math.abs(sim.maxDrawdown);
  const buyCount = sim.actions.filter((item) => item.action === "买").length;
  const sellCount = sim.actions.filter((item) => item.action === "卖" || item.action === "自动卖出").length;
  const actionCount = sim.actions.length || 1;
  const tradeRatio = ((buyCount + sellCount) / actionCount) * 100;
  const closedTrades = sim.closedTrades || [];
  const wins = closedTrades.filter((trade) => Number(trade.pnl || 0) > 0).length;
  const winRate = closedTrades.length ? `${Math.round((wins / closedTrades.length) * 100)}%` : "--";
  const totalCost = Number(sim.costTotal || 0);
  const trainingContext = getActiveKlineTrainingContext();
  const ruleBlocks = Number(sim.sameDaySellBlocks || 0);

  let profile = "稳定观察型";
  let operationAdvice = "你本轮能较多使用空仓，说明并不是每根K线都急着行动。下一轮继续练“只在计划点行动”。";
  let yangmingQuote = "此心不动，随机而动。能不被每一根K线牵走，就是临盘定力。";
  let trainingPlan = "下一轮使用双盲训练，要求至少连续20根K线不乱点买卖，只记录计划线。";

  if (ruleBlocks > 0) {
    profile = "规则冲撞型";
    operationAdvice = "你本轮出现了想卖但T+1不可卖的情况。下一轮先把买入后的可卖时间、止损条件写清楚，再决定是否开仓。";
    yangmingQuote = "知止而后有定。规则不是束缚，是帮你在情绪上来时还有边界。";
    trainingPlan = "下一轮开启T+1纪律训练，每次买入前先问：如果今天不能卖，我还能承受这笔仓位吗？";
  } else if (tradeRatio > 45) {
    profile = "高频冲动型";
    operationAdvice = "你本轮买卖次数偏多，容易把波动当机会。下一轮先把每次买入前的理由写清楚，没有失效线不允许买。";
    yangmingQuote = "破山中贼易，破心中贼难。真正要破的是看到波动就想证明自己的那一念。";
    trainingPlan = "下一轮开启分仓模式，每30根K线最多买入2次，练下单前暂停。";
  } else if (totalCost > sim.startEquity * 0.003) {
    profile = "成本消耗型";
    operationAdvice = "你本轮交易成本已经开始侵蚀账户。下一轮减少无效买卖，把动作集中在最明确的计划点。";
    yangmingQuote = "省察克治，不只省察念头，也省察每一笔看似很小的消耗。";
    trainingPlan = "下一轮要求成本控制在账户0.2%以内，先等形态和纪律同时满足再行动。";
  } else if (drawdownValue > 8) {
    profile = "回撤放大型";
    operationAdvice = "你本轮最大回撤偏高，说明风险暴露后处理不够及时。下一轮重点练自动卖出和止损纪律。";
    yangmingQuote = "知错即改，才是真致良知。止损不是失败，是让错误不扩大。";
    trainingPlan = "下一轮开启自动卖出，把单轮最大回撤控制在5%以内。";
  } else if (pnlValue > 3 && drawdownValue < 5) {
    profile = "知行稳定型";
    operationAdvice = "你本轮收益与回撤比较均衡，可以继续提高难度：减少无效操作，观察是否能用更少动作完成训练。";
    yangmingQuote = "知是行之始，行是知之成。能按计划做完，比单次赚亏更重要。";
    trainingPlan = "下一轮尝试只做1到3次关键动作，训练等待与确认。";
  }

  return {
    pnl: `${pnlValue.toFixed(2)}%`,
    drawdown: `${drawdownValue.toFixed(2)}%`,
    winRate,
    totalCost: formatKlineMoney(totalCost),
    tradeCount: `${sim.tradeCount}次`,
    profile,
    marketReplay: buildKlineMarketReplay(sim),
    operationAdvice,
    yangmingQuote,
    trainingPlan: buildMatchedTrainingPlan(profile, trainingPlan),
    nextFocus: inferTrainingTopic(profile),
    aiReview: buildKlineAiReview({ sim, profile, pnlValue, drawdownValue, trainingContext, winRate }),
    tradeLedger: buildKlineTradeLedger(sim)
  };
}

function buildKlineMarketReplay(sim) {
  const candidates = sim.actions
    .map((action) => {
      const window = sim.candles.slice(action.index + 1, Math.min(action.index + 18, sim.candles.length));
      if (!window.length || !action.price) return null;
      const futureLow = Math.min(...window.map((item) => item.low));
      const futureHigh = Math.max(...window.map((item) => item.high));
      const lowPct = ((futureLow - action.price) / action.price) * 100;
      const highPct = ((futureHigh - action.price) / action.price) * 100;
      const score = Math.max(Math.abs(lowPct), Math.abs(highPct));
      return { ...action, lowPct, highPct, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const key = candidates[0];
  if (!key) return "本轮盘面波动不大，主要训练的是每一根K线前不急着证明自己。";
  const keyAction = key.action === "空仓" ? "观望" : key.action;
  const heldWhileWatching = key.action === "观望" && Number(key.position_after || key.position_before || 0) > 0;

  if ((key.action === "卖" || key.action === "空仓" || key.action === "观望") && key.lowPct <= -4) {
    if (heldWhileWatching) {
      return `第${key.index + 1}根选择「观望」后仍在持仓，后续最低下探 ${Math.abs(key.lowPct).toFixed(2)}%。这一步重点复盘：当时是否已经触发失效线。`;
    }
    return `第${key.index + 1}根选择「${keyAction}」后，后续最低下探 ${Math.abs(key.lowPct).toFixed(2)}%。这一步不是预测对了，而是用纪律躲过了一段回撤。`;
  }
  if (key.action === "买" && key.lowPct <= -4) {
    return `第${key.index + 1}根选择「买」后，后续最低下探 ${Math.abs(key.lowPct).toFixed(2)}%。这说明买点偏急，下一轮要先写失效线再开仓。`;
  }
  if (key.action === "买" && key.highPct >= 5) {
    return `第${key.index + 1}根选择「买」后，后续最高上冲 ${key.highPct.toFixed(2)}%。这一步有顺势反馈，但仍要看你是否能守住退出计划。`;
  }
  if ((key.action === "卖" || key.action === "空仓" || key.action === "观望") && key.highPct >= 5) {
    if (heldWhileWatching) {
      return `第${key.index + 1}根选择「观望」后继续持仓，后续最高上涨 ${key.highPct.toFixed(2)}%。这一步有持仓反馈，但仍要复盘是否按计划退出。`;
    }
    return `第${key.index + 1}根选择「${keyAction}」后，后续最高上涨 ${key.highPct.toFixed(2)}%。这一步会产生踏空感，训练重点是不因为错过而追下一笔。`;
  }
  return `本轮最大后续波动出现在第${key.index + 1}根之后：上冲 ${key.highPct.toFixed(2)}%，下探 ${Math.abs(key.lowPct).toFixed(2)}%。复盘重点是动作是否来自计划，而不是结果是否刚好赚钱。`;
}

function buildKlineAiReview({ sim, profile, pnlValue, drawdownValue, trainingContext, winRate }) {
  const costPct = sim.startEquity ? (Number(sim.costTotal || 0) / sim.startEquity) * 100 : 0;
  const heldPosition = getKlinePositionPercent(sim) > 0;
  const points = [];
  points.push(`本局核心惯性：${profile}，对应训练主题是「${trainingContext.scene || trainingContext.focus || "临盘纪律"}」。`);
  if (pnlValue >= 0) {
    points.push(`账户结果为正，但仍要看动作是否来自计划；赚钱不能掩盖坏习惯。`);
  } else {
    points.push(`账户结果为负，优先复盘最早一次偏离计划的动作，而不是急着找下一笔机会。`);
  }
  if (drawdownValue >= 5) {
    points.push(`最大回撤 ${drawdownValue.toFixed(2)}%，说明风险暴露后需要更快执行失效线。`);
  }
  if (costPct >= 0.2) {
    points.push(`模拟成本占账户 ${costPct.toFixed(2)}%，频繁动作已经成为本局隐形亏损。`);
  }
  if (sim.sameDaySellBlocks > 0) {
    points.push(`出现 ${sim.sameDaySellBlocks} 次T+1限制提醒，下一局买入前先确认“今天不能卖也能承受”。`);
  }
  if (heldPosition) {
    points.push(`本局结束仍有持仓，报告按浮动市值计入结果，下一局重点练持仓退出计划。`);
  }
  points.push(`闭环指标：胜率 ${winRate}，完成后建议进入7天同主题训练，再做复测变化对比。`);
  return points.join("\n");
}

function buildKlineTradeLedger(sim) {
  const ledger = sim.tradeLedger || [];
  if (!ledger.length) return "本轮没有实际成交，主要训练空仓等待。";
  return ledger.slice(-8).map((trade) => {
    const pnl = Number(trade.pnl || 0);
    const pnlText = trade.side === "买入" ? "" : `，盈亏${pnl >= 0 ? "+" : ""}${formatKlineMoney(pnl)}`;
    return `第${trade.index + 1}根 ${trade.side} ${formatKlineMoney(trade.tradeValue)}，价格${formatPrice(trade.price)}，成本${formatKlineMoney(trade.cost)}${pnlText}`;
  }).join("\n");
}

function buildMatchedTrainingPlan(profile, fallbackPlan) {
  if (!state.trainingPlans.length) return fallbackPlan;
  const topic = inferTrainingTopic(profile);
  const pool = state.trainingPlans.filter((item) => item.topic.includes(topic));
  const selectedPool = pool.length ? pool : state.trainingPlans;
  const index = Number(state.klineStats.practice_count || 0) % selectedPool.length;
  const plan = selectedPool[index];
  const tasks = plan.tasks.slice(0, 3).join("；");
  return `${plan.day_label} · ${plan.stage} · ${plan.topic}：${tasks}`;
}

function inferTrainingTopic(profile) {
  if (/高频|冲动/.test(profile)) return "频繁交易";
  if (/回撤|扛单/.test(profile)) return "扛单";
  if (/稳定/.test(profile)) return "盈利拿不住";
  return "震荡";
}

function ensureKlineSimulation() {
  if (!state.klineSim) resetKlineSimulation(state.klineScenario);
  return state.klineSim;
}

function getKlineEquity(sim = ensureKlineSimulation()) {
  const price = sim.candles[sim.currentIndex]?.close || 1;
  return sim.cash + sim.units * price;
}

function getKlinePnlPercent(sim = ensureKlineSimulation()) {
  return ((getKlineEquity(sim) - sim.startEquity) / sim.startEquity) * 100;
}

function getKlinePositionPercent(sim = ensureKlineSimulation()) {
  const equity = getKlineEquity(sim);
  const price = sim.candles[sim.currentIndex]?.close || 1;
  if (!equity) return 0;
  return Math.round(((sim.units * price) / equity) * 100);
}

function isKlineSettingActive(name) {
  return Boolean(document.querySelector(`[data-kline-setting="${name}"]`)?.classList.contains("active"));
}

async function loadNextKlineScenario({ keepInstrument = false, focusAfterLoad = false, silent = false } = {}) {
  const trainingContext = getActiveKlineTrainingContext();
  if (state.nextKlineScenario) {
    state.klineScenario = state.nextKlineScenario;
    state.nextKlineScenario = null;
    resetKlineSimulation(state.klineScenario);
    state.klineAnswered = false;
    state.klineSubmitting = false;
    state.klineSelectedDecision = "";
    $("#klineScoreBadge").textContent = "一念关";
    $("#klineInsight").textContent = buildActiveKlineInsight(trainingContext);
    renderRetention();
    if (focusAfterLoad) focusKlineTradingArea();
    return;
  }

  const userId = getCurrentUserId();
  if (state.config.useBackend && state.config.apiBaseUrl) {
    try {
      const params = new URLSearchParams({
        stage_id: getActiveKlineStageId(),
        timeframe: state.klineTimeframe,
        require_real: "1",
        personality_type: trainingContext.personalityType || state.result?.main_type || state.klineLevel?.active_stage?.personality_type || "",
        axis_focus: trainingContext.focus,
        axis_subtitle: trainingContext.subtitle
      });
      if (userId && getAccessToken()) params.set("user_id", userId);
      if (keepInstrument && state.klineInstrumentKey) params.set("instrument_key", state.klineInstrumentKey);
      const data = await apiFetch(`/api/v1/kline-practice/next?${params.toString()}`);
      state.klineScenario = normalizeKlineScenario(data.scenario);
      resetKlineSimulation(state.klineScenario);
      state.klineAnswered = false;
      state.klineSubmitting = false;
      state.klineSelectedDecision = "";
      $("#klineScoreBadge").textContent = "一念关";
      $("#klineInsight").textContent = buildActiveKlineInsight(trainingContext);
      renderRetention();
      if (focusAfterLoad) focusKlineTradingArea();
      return;
    } catch (error) {
      console.warn("真实A股历史K线暂不可用。", error);
      state.klineScenario = buildKlineUnavailableScenario(error.message);
      resetKlineSimulation(state.klineScenario);
      state.klineAnswered = true;
      state.klineSubmitting = false;
      state.klineSelectedDecision = "";
      $("#klineScoreBadge").textContent = "待连接";
      $("#klineInsight").textContent = "当前没有加载到真实A股历史K线。为避免误导判断，训练台不会使用备用模拟K线。";
      if (!silent) showToast("真实A股历史K线未连接，已停止备用数据展示。");
      renderRetention();
      return;
    }
  }

  state.klineScenario = buildKlineUnavailableScenario("当前未连接后端，无法加载真实A股历史K线。");
  resetKlineSimulation(state.klineScenario);
  state.klineAnswered = true;
  state.klineSubmitting = false;
  state.klineSelectedDecision = "";
  $("#klineScoreBadge").textContent = "待连接";
  $("#klineInsight").textContent = "当前未连接后端。为避免误导判断，训练台不会使用备用模拟K线。";
  renderRetention();
}

function setKlineSceneLoading(label = "正在进入真实K线训练场景...") {
  const chart = $("#klineChart");
  if (chart) chart.innerHTML = `<div class="kline-empty kline-loading">${escapeHtml(label)}</div>`;
  const badge = $("#klineScoreBadge");
  if (badge) badge.textContent = "加载中";
  const insight = $("#klineInsight");
  if (insight) insight.textContent = label;
  const feedback = $("#klineFeedbackCard");
  if (feedback) feedback.hidden = true;
}

function focusKlineTradingArea() {
  const target = $("#klineChart") || $(".kline-panel");
  window.setTimeout(() => {
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 80);
}

async function refreshKlineLeaderboard() {
  if (!state.config.useBackend || !state.config.apiBaseUrl) return;
  try {
    const data = await apiFetch(`/api/v1/kline-practice/leaderboard?period=${state.leaderboardPeriod}&limit=6`);
    state.leaderboard = data.leaderboard || [];
  } catch (error) {
    console.warn("K线排行榜刷新失败。", error);
  }
}

async function copyInviteText() {
  const code = state.influence?.personal_invite_code || state.auth?.personalInviteCode;
  if (!code) {
    showToast("登录后会生成专属邀请码。");
    return;
  }
  const text = state.influence?.invite_text || `我正在做九种交易人格测评和K线心性训练，输入邀请码 ${code} 一起事上练。`;
  await navigator.clipboard.writeText(text);
  showToast("邀请文案已复制。每一位新朋友，都是知行同修。");
}

function renderRetention() {
  const quote = dailyQuotes[new Date().getDate() % dailyQuotes.length];
  $("#dailyQuote").textContent = quote;

  $("#streakDays").textContent = state.habit.streak_days || 0;
  $("#practicePoints").textContent = Number(state.habit.practice_points || 0);
  $("#totalPracticeDays").textContent = state.habit.total_days || 0;
  $("#dailyCheckInBtn").textContent = state.habit.checked_today ? "今日已签到" : "今日签到";
  $("#dailyCheckInBtn").disabled = Boolean(state.habit.checked_today);

  const weekly = state.habit.weekly_checkins?.length ? state.habit.weekly_checkins : getRecentLocalWeek();
  $("#weeklyCheckins").innerHTML = weekly
    .map((item) => `<span class="${item.checked ? "checked" : ""}">${item.date_key.slice(-2)}</span>`)
    .join("");

  $("#influenceScore").textContent = state.influence?.influence_score || 0;
  $("#inviteCodeValue").textContent = state.influence?.personal_invite_code || state.auth?.personalInviteCode || "登录后生成";
  $("#partnersCount").textContent = state.influence?.partners_count || 0;
  $("#partnerReports").textContent = state.influence?.partner_reports || 0;
  $("#personalImpactIndex").textContent = Number(state.influence?.impact_index || 0).toFixed(4);

  $("#klineScenarioTitle").textContent = state.klineScenario.title;
  $("#klineScenarioPrompt").textContent = state.klineScenario.prompt;
  $("#klineMarketMeta").textContent = getKlineMarketMeta();
  $("#nextKlineBtn").textContent = "换一段K线";
  renderKlineGameMetrics();
  renderMindAxisPanel();
  renderPersonalityTrainingPanel();
  renderKlineSceneCard();
  renderKlineLevel();
  renderKlineOptions();
  renderKlineFeedbackCard();
  renderKlineChart();
  renderLeaderboard();
}

function getActiveMindAxis() {
  return mindAxisStages.find((axis) => axis.id === state.klineAxisId) || mindAxisStages[0];
}

function getActiveMindAxisScene(axis = getActiveMindAxis()) {
  const sceneIndex = clamp(Number(state.klineAxisSceneIndex || 0), 0, Math.max((axis.scenes || []).length - 1, 0));
  return axis.scenes?.[sceneIndex] || axis.focus || "";
}

function getActiveMindAxisContext() {
  const axis = getActiveMindAxis();
  const scene = getActiveMindAxisScene(axis);
  return {
    axis,
    scene,
    subtitle: scene ? `${axis.name}：${scene}。${axis.check}` : axis.subtitle
  };
}

function buildActiveAxisInsight(axisContext = getActiveMindAxisContext()) {
  return `当前关卡：${axisContext.axis.name}。本轮盯住「${axisContext.scene || axisContext.axis.focus}」，先做临盘自查，再点买入、卖出或观望。`;
}

function getPersonalityStageByType(type = "") {
  const target = String(type || "").trim();
  if (!target) return null;
  return personalityTrainingStages.find((stage) => (
    stage.id === target ||
    stage.stage_id === target ||
    stage.type === target ||
    displayType(stage.type) === displayType(target)
  )) || null;
}

function getActivePersonalityStage() {
  return personalityTrainingStages.find((stage) => stage.id === state.klinePersonaId || stage.stage_id === state.klinePersonaId) || null;
}

function personalityStageToStage(stage, focusOverride = "") {
  const focus = focusOverride || stage.focus;
  return {
    id: stage.stage_id,
    name: stage.name,
    subtitle: `${stage.name}：${focus}。${stage.check}`,
    required_streak_days: 0,
    personality_type: stage.type,
    focus,
    locked: false
  };
}

function activateKlineTrainingStage(stage) {
  const level = state.klineLevel || {};
  const stages = level.stages?.length ? [...level.stages] : [];
  const index = stages.findIndex((item) => item.id === stage.id);
  if (index >= 0) {
    stages[index] = { ...stages[index], ...stage, locked: false };
  } else {
    stages.unshift(stage);
  }
  state.klineLevel = {
    ...level,
    stages,
    unlocked_stages: stages.filter((item) => !item.locked),
    active_stage: stage
  };
}

function getSelectedKlineSceneCard() {
  return klineSceneCards.find((card) => card.id === state.klineSceneCardId) || null;
}

function getDefaultKlineSceneCardForContext() {
  const persona = getActivePersonalityStage();
  if (persona) {
    return klineSceneCards.find((card) => card.id === personalitySceneCardMap[persona.type]) || klineSceneCards[0];
  }
  const axis = getActiveMindAxis();
  return klineSceneCards.find((card) => card.id === axisSceneCardMap[axis.id]) || klineSceneCards[0];
}

function pickKlineSceneCardForText(text = "", type = "") {
  const source = `${text} ${type}`;
  if (/急拉|追涨|踏空|冲动|卖飞|追回/.test(source)) return klineSceneCards.find((card) => card.id === "rush_chase");
  if (/高位|分歧|从众|消息|利好|比较/.test(source)) return klineSceneCards.find((card) => card.id === "high_divergence");
  if (/破位|止损|扛单|不走|回本/.test(source)) return klineSceneCards.find((card) => card.id === "break_hold");
  if (/恐惧|焦虑|割肉|慌|小赚/.test(source)) return klineSceneCards.find((card) => card.id === "fear_cut");
  if (/震荡|乱做|频繁|拖延|执行/.test(source)) return klineSceneCards.find((card) => card.id === "shake_trade");
  if (/回踩|等待|确认|平衡|系统/.test(source)) return klineSceneCards.find((card) => card.id === "pullback");
  if (/突破|信号/.test(source)) return klineSceneCards.find((card) => card.id === "breakout_confirm");
  if (/假突破|偏执|赌徒|重仓|梭哈/.test(source)) return klineSceneCards.find((card) => card.id === "false_breakout");
  return null;
}

function getActiveKlineSceneCard() {
  return getSelectedKlineSceneCard() || getDefaultKlineSceneCardForContext();
}

function getActiveKlineTrainingContext() {
  const selectedSceneCard = getSelectedKlineSceneCard();
  const sceneCard = selectedSceneCard || getDefaultKlineSceneCardForContext();
  const persona = getActivePersonalityStage();
  if (persona) {
    return {
      mode: "personality",
      name: persona.name,
      focus: selectedSceneCard?.title || state.klineLevel?.active_stage?.focus || persona.focus,
      subtitle: selectedSceneCard ? `${selectedSceneCard.title}：${selectedSceneCard.text}` : `${persona.name}：${persona.subtitle} ${persona.check}`,
      personalityType: persona.type,
      stageId: persona.stage_id,
      scene: selectedSceneCard?.title || state.klineLevel?.active_stage?.focus || persona.scenes?.[0] || persona.focus,
      lesson: persona.lesson,
      action: persona.action,
      check: persona.check,
      sceneCard
    };
  }

  const axisContext = getActiveMindAxisContext();
  return {
    mode: "axis",
    name: axisContext.axis.name,
    focus: selectedSceneCard?.title || axisContext.scene || axisContext.axis.focus,
    subtitle: selectedSceneCard ? `${selectedSceneCard.title}：${selectedSceneCard.text}` : axisContext.subtitle,
    personalityType: "",
    stageId: axisContext.axis.stage_id,
    scene: selectedSceneCard?.title || axisContext.scene,
    lesson: axisContext.axis.lesson,
    action: axisContext.axis.action,
    check: axisContext.axis.check,
    sceneCard
  };
}

function buildActiveKlineInsight(context = getActiveKlineTrainingContext()) {
  const scene = context.scene || context.focus;
  return `当前关卡：${context.name}。本轮盯住「${scene}」，先做临盘自查，再点买入、卖出或观望。`;
}

function mindAxisToStage(axis = getActiveMindAxis()) {
  const scene = getActiveMindAxisScene(axis);
  return {
    id: axis.stage_id,
    name: axis.name,
    subtitle: scene ? `${axis.name}：${scene}。${axis.check}` : axis.subtitle,
    required_streak_days: 0,
    personality_type: "",
    focus: scene || axis.focus,
    locked: false
  };
}

function syncMindAxisFromStage(stageId = "", stageFocus = "") {
  const axis = mindAxisStages.find((item) => item.stage_id === stageId);
  if (axis) {
    const axisChanged = state.klineAxisId !== axis.id;
    state.klineAxisId = axis.id;
    const sceneIndex = axis.scenes.findIndex((scene) => scene === stageFocus);
    state.klineAxisSceneIndex = sceneIndex >= 0 ? sceneIndex : axisChanged ? 0 : state.klineAxisSceneIndex;
  }
}

function syncPersonalityFromStage(stage = {}) {
  const persona = getPersonalityStageByType(stage.personality_type || stage.id || stage.focus || "");
  state.klinePersonaId = persona ? persona.id : "";
}

function renderMindAxisPanel() {
  const grid = $("#mindAxisGrid");
  if (!grid) return;
  const active = getActiveMindAxis();
  const activeScene = getActiveMindAxisScene(active);
  const activeSceneIndex = Math.max(active.scenes.indexOf(activeScene), 0);
  $("#mindAxisActiveName").textContent = active.name;
  $("#mindAxisLesson").textContent = active.lesson;
  $("#mindAxisAction").textContent = active.action;
  const detail = $("#mindAxisDetail");
  if (detail) {
    detail.innerHTML = `
      <div class="axis-detail-goal">
        <span>本关目标</span>
        <strong>${escapeHtml(active.goal)}</strong>
      </div>
      <div class="axis-detail-functions">
        <div>
          <span>场景训练</span>
          <strong>${escapeHtml(activeScene)}</strong>
          <em>换本关真实K线片段，专练这一类心念。</em>
        </div>
        <div>
          <span>操作反馈</span>
          <strong>买 / 卖 / 观望</strong>
          <em>每点一次，立即看账户、仓位和下一根结果。</em>
        </div>
        <div>
          <span>复盘沉淀</span>
          <strong>最伤账户动作</strong>
          <em>训练结束后，把问题变成下一次动作。</em>
        </div>
      </div>
      <div class="axis-detail-scenes">
        ${active.scenes.map((scene, index) => `<button class="${index === activeSceneIndex ? "active" : ""}" data-axis-scene-index="${index}">${escapeHtml(scene)}</button>`).join("")}
      </div>
      <div class="axis-detail-check">
        <span>临盘自查</span>
        <strong>${escapeHtml(active.check)}</strong>
      </div>
      <div class="axis-detail-useful">${escapeHtml(active.useful)}</div>
    `;
  }
  grid.innerHTML = mindAxisStages
    .map((axis, index) => `
      <button class="mind-axis-card ${axis.id === active.id ? "active" : ""}" data-mind-axis="${axis.id}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(axis.short)}</strong>
        <em>${escapeHtml(axis.focus)}</em>
      </button>
    `)
    .join("");
  $$("#mindAxisGrid button").forEach((button) => {
    button.addEventListener("click", async () => {
      const axis = mindAxisStages.find((item) => item.id === button.dataset.mindAxis);
      if (!axis) return;
      state.klineAxisId = axis.id;
      state.klineAxisSceneIndex = 0;
      state.klinePersonaId = "";
      state.klineSceneCardId = "";
      state.klineLevel = {
        ...state.klineLevel,
        active_stage: mindAxisToStage(axis)
      };
      state.nextKlineScenario = null;
      state.klineLastFeedback = null;
      const scene = getActiveMindAxisScene(axis);
      setKlineSceneLoading(`正在进入「${axis.name}｜${scene}」真实K线训练...`);
      renderMindAxisPanel();
      await loadNextKlineScenario({ keepInstrument: false, focusAfterLoad: true });
      showToast(`已进入「${axis.name}」真实训练场景。`);
    });
  });
  $$("#mindAxisDetail [data-axis-scene-index]").forEach((button) => {
    button.addEventListener("click", async () => {
      const sceneIndex = clamp(Number(button.dataset.axisSceneIndex || 0), 0, active.scenes.length - 1);
      state.klineAxisSceneIndex = sceneIndex;
      state.klinePersonaId = "";
      state.klineSceneCardId = "";
      state.klineLevel = {
        ...state.klineLevel,
        active_stage: mindAxisToStage(active)
      };
      state.nextKlineScenario = null;
      state.klineLastFeedback = null;
      setKlineSceneLoading(`正在进入「${active.name}｜${active.scenes[sceneIndex]}」真实K线训练...`);
      renderMindAxisPanel();
      await loadNextKlineScenario({ keepInstrument: false, focusAfterLoad: true });
      showToast(`已切换到「${active.scenes[sceneIndex]}」真实训练。`);
    });
  });
}

function renderPersonalityTrainingPanel() {
  const grid = $("#personalityTrainingGrid");
  if (!grid) return;

  const recommended = getPersonalityStageByType(state.result?.main_type) || personalityTrainingStages[0];
  const selectedPersona = getActivePersonalityStage();
  const active = selectedPersona || recommended;
  const shouldHighlight = Boolean(selectedPersona || state.result);
  const activeName = $("#personalityTrainingActiveName");
  if (activeName) {
    activeName.textContent = state.result ? `${displayType(active.type)}推荐关` : "测评后自动推荐";
  }

  grid.innerHTML = personalityTrainingStages
    .map((stage, index) => `
      <button class="personality-training-card ${shouldHighlight && stage.id === active.id ? "active" : ""}" data-personality-stage="${stage.id}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(displayType(stage.type))}</strong>
        <em>${escapeHtml(stage.focus)}</em>
      </button>
    `)
    .join("");

  const detail = $("#personalityTrainingDetail");
  if (detail) {
    detail.innerHTML = `
      <div class="persona-detail-main">
        <span>本关目标</span>
        <strong>${escapeHtml(active.subtitle)}</strong>
        <em>${escapeHtml(active.check)}</em>
      </div>
      <div class="persona-scene-chips">
        ${(active.scenes || []).map((scene) => `<button data-persona-scene="${escapeHtml(scene)}">${escapeHtml(scene)}</button>`).join("")}
      </div>
      <div class="persona-detail-lesson">
        <span>${escapeHtml(active.lesson)}</span>
        <strong>${escapeHtml(active.action)}</strong>
      </div>
    `;
  }

  $$("#personalityTrainingGrid [data-personality-stage]").forEach((button) => {
    button.addEventListener("click", async () => {
      const stage = personalityTrainingStages.find((item) => item.id === button.dataset.personalityStage);
      if (!stage) return;
      state.klinePersonaId = stage.id;
      state.klineSceneCardId = "";
      activateKlineTrainingStage(personalityStageToStage(stage));
      state.nextKlineScenario = null;
      state.klineLastFeedback = null;
      setKlineSceneLoading(`正在进入「${displayType(stage.type)}｜${stage.focus}」真实K线训练...`);
      renderPersonalityTrainingPanel();
      renderKlineSceneCard();
      await loadNextKlineScenario({ keepInstrument: false, focusAfterLoad: true });
      showToast(`已进入「${stage.name}」。`);
    });
  });

  $$("#personalityTrainingDetail [data-persona-scene]").forEach((button) => {
    button.addEventListener("click", async () => {
      const scene = button.dataset.personaScene || "";
      const card = pickKlineSceneCardForText(scene, active.type);
      state.klinePersonaId = active.id;
      state.klineSceneCardId = card?.id || "";
      activateKlineTrainingStage(personalityStageToStage(active, scene));
      state.nextKlineScenario = null;
      state.klineLastFeedback = null;
      setKlineSceneLoading(`正在进入「${displayType(active.type)}｜${scene}」真实K线训练...`);
      renderPersonalityTrainingPanel();
      renderKlineSceneCard();
      await loadNextKlineScenario({ keepInstrument: false, focusAfterLoad: true });
      showToast(`已切换到「${scene}」人格训练。`);
    });
  });
}

function renderKlineSceneCard() {
  const target = $("#klineScenePoolCard");
  if (!target) return;
  const active = getActiveKlineSceneCard();
  target.innerHTML = `
    <div class="scene-pool-head">
      <span>K线场景图池</span>
      <strong>${escapeHtml(active.title)}</strong>
    </div>
    <div class="scene-pool-body">
      <img src="${escapeHtml(active.image)}" alt="${escapeHtml(active.title)}" loading="lazy">
      <div class="scene-pool-copy">
        <span>${escapeHtml(active.theme)}</span>
        <p>${escapeHtml(active.text)}</p>
        <div>${active.tags.map((tag) => `<em>${escapeHtml(displayType(tag))}</em>`).join("")}</div>
      </div>
    </div>
    <div class="scene-pool-picker">
      ${klineSceneCards.map((card) => `<button class="${card.id === active.id ? "active" : ""}" data-scene-card="${card.id}">${escapeHtml(card.title)}</button>`).join("")}
    </div>
  `;

  $$("#klineScenePoolCard [data-scene-card]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = klineSceneCards.find((item) => item.id === button.dataset.sceneCard);
      if (!card) return;
      state.klineSceneCardId = card.id;
      state.nextKlineScenario = null;
      state.klineLastFeedback = null;
      setKlineSceneLoading(`正在按「${card.title}」抽取真实K线片段...`);
      renderKlineSceneCard();
      await loadNextKlineScenario({ keepInstrument: false, focusAfterLoad: true });
      showToast(`已切换到「${card.title}」场景训练。`);
    });
  });
}

function renderKlineLevel() {
  const level = state.klineLevel || {};
  const sim = ensureKlineSimulation();
  const quota = level.daily_quota || state.klineStats.daily_quota || { limit: 3, used: 0, remaining: 3 };
  const activeStage = level.active_stage || { id: "daily", name: "每日三问" };
  const stages = level.stages?.length ? level.stages : level.unlocked_stages || [activeStage];

  $("#klineDailyQuota").textContent = `本轮${sim.candles.length || 150}根，已推进${Math.min(sim.currentIndex + 1, sim.candles.length || 150)}`;
  $("#klineStageLabel").textContent = activeStage.name || "每日三问";
  $("#klineRoundLabel").textContent = `第${Math.min(sim.currentIndex + 1, sim.candles.length || 150)} / ${sim.candles.length || 150}根`;
  $("#klinePersonaTag").textContent = state.klineScenario.focus || activeStage.focus || "双盲训练";
  $("#klineStageChips").innerHTML = stages
    .map((stage) => {
      const label = stage.locked ? `${stage.name} · ${stage.remaining_days || stage.required_streak_days || 0}天后` : stage.name;
      return `<button class="${stage.id === activeStage.id ? "active" : ""} ${stage.locked ? "locked" : ""}" data-kline-stage="${stage.id}" ${stage.locked ? "disabled" : ""}>${label}</button>`;
    })
    .join("");

  $$("#klineStageChips button").forEach((button) => {
    button.addEventListener("click", async () => {
      const stage = stages.find((item) => item.id === button.dataset.klineStage);
      if (!stage || stage.locked) return;
      state.klineLevel = {
        ...level,
        active_stage: stage
      };
      syncPersonalityFromStage(stage);
      if (!state.klinePersonaId) syncMindAxisFromStage(stage.id, stage.focus);
      state.klineSceneCardId = "";
      state.nextKlineScenario = null;
      setKlineSceneLoading(`正在进入「${stage.name || "K线关卡"}」真实K线训练...`);
      await loadNextKlineScenario({ keepInstrument: false, focusAfterLoad: true });
    });
  });

  $$(".leaderboard-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.leaderboardPeriod === state.leaderboardPeriod);
  });
}

function renderKlineOptions() {
  const options = state.klineScenario.data_source === "eastmoney_history"
    ? [{ label: "买入" }, { label: "卖出" }, { label: "观望" }]
    : state.klineScenario.options || Object.keys(state.klineScenario.decisions || {}).map((label) => ({ label }));
  $(".kline-actions").innerHTML = options
    .map((option) => {
      const selected = Boolean(state.klineSelectedDecision) && normalizeKlineAction(option.label) === normalizeKlineAction(state.klineSelectedDecision);
      const locked = state.klineAnswered || state.klineSubmitting;
      return `<button class="${selected ? "selected" : ""}" data-kline-decision="${escapeHtml(option.label)}" data-action-tone="${getKlineActionTone(option.label)}" ${locked ? "disabled" : ""}>${escapeHtml(option.label)}</button>`;
    })
    .join("");
  $$(".kline-actions button").forEach((button) => {
    button.addEventListener("click", () => submitKlineDecision(button.dataset.klineDecision));
  });
}

function renderKlineChart() {
  const sim = ensureKlineSimulation();
  const allCandles = sim.candles;
  if (!allCandles.length) {
    $("#klineChart").innerHTML = `<div class="kline-empty">真实A股历史K线暂未加载。请连接后端后再预览训练盘。</div>`;
    return;
  }
  const renderCandles = allCandles.slice(0, sim.currentIndex + 1);
  const maxDisplayCount = Math.max(klineDisplayDefault, allCandles.length || klineDisplayDefault);
  const displayCount = Math.min(
    Math.max(Number(state.klineDisplayCount || klineDisplayDefault), klineDisplayMin),
    maxDisplayCount,
    renderCandles.length
  );
  const displayCandles = renderCandles.slice(-displayCount);
  const last = renderCandles.at(-1);
  const previous = renderCandles.at(-2) || renderCandles[0] || last;
  const dailyChange = previous?.close ? (((last.close - previous.close) / previous.close) * 100) : 0;
  const absoluteChange = Number(last.close || 0) - Number(previous?.close || last.close || 0);
  const trendClass = Number(dailyChange) >= 0 ? "up" : "down";
  const ma5 = calculateMA(renderCandles, 5);
  const ma10 = calculateMA(renderCandles, 10);
  const ma20 = calculateMA(renderCandles, 20);
  const boll = calculateBOLL(renderCandles);
  const rsi = calculateRSI(renderCandles);
  const offset = renderCandles.length - displayCandles.length;
  const visibleOverlayValues = [
    ...ma5.slice(offset),
    ...ma10.slice(offset),
    ...ma20.slice(offset),
    ...(state.klineIndicators.boll ? boll.slice(offset).flatMap((item) => [item?.upper, item?.middle, item?.lower]) : [])
  ].filter(Number.isFinite);
  const min = Math.min(...displayCandles.map((item) => item.low), ...visibleOverlayValues);
  const max = Math.max(...displayCandles.map((item) => item.high), ...visibleOverlayValues);
  const range = Math.max(max - min, 0.01);
  const volumeMax = Math.max(...displayCandles.map((item) => Number(item.volume || 0)), 1);
  const actionByIndex = new Map(sim.actions.map((item) => [item.index, item.action]));
  const visibleDensity = Math.max(displayCandles.length, 1);
  const candleWidth = Math.max(2.6, Math.min(13, 920 / visibleDensity * 0.7));
  const candleGap = visibleDensity >= 120 ? 1.8 : 4.5;
  const chartWidth = Math.max(980, Math.round(visibleDensity * Math.max(candleWidth + candleGap, 4.2)));
  const candles = displayCandles
    .map((candle, index) => {
      const realIndex = offset + index;
      const x = displayCandles.length === 1 ? 50 : (index / (displayCandles.length - 1)) * 100;
      const highY = mapToPercent(candle.high, min, max);
      const lowY = mapToPercent(candle.low, min, max);
      const openY = mapToPercent(candle.open, min, max);
      const closeY = mapToPercent(candle.close, min, max);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));
      const direction = candle.close >= candle.open ? "up" : "down";
      const revealed = realIndex === sim.currentIndex ? " revealed" : "";
      const marker = actionByIndex.get(realIndex);
      const markerText = marker === "自动卖出" ? "卖" : marker === "T+1限制" ? "T1" : marker === "空仓" || marker === "观望" ? "望" : marker;
      return `
        <i class="terminal-candle ${direction}${revealed}" title="${escapeHtml(candle.date || "")}" style="--x:${x}%;--w:${candleWidth}px;--marker-top:${Math.max(2, bodyTop - 10)}%">
          <span class="wick" style="top:${highY}%;height:${Math.max(1, lowY - highY)}%;"></span>
          <span class="body" style="top:${bodyTop}%;height:${bodyHeight}%;"></span>
          ${marker ? `<b class="trade-marker ${getKlineMarkerClass(marker)}">${markerText}</b>` : ""}
        </i>
      `;
    })
    .join("");
  const volumes = displayCandles
    .map((candle, index) => {
      const x = displayCandles.length === 1 ? 50 : (index / (displayCandles.length - 1)) * 100;
      const height = Math.max(3, (Number(candle.volume || 0) / volumeMax) * 96);
      const direction = candle.close >= candle.open ? "up" : "down";
      return `<i class="${direction}" style="--x:${x}%;--h:${height}%;--w:${candleWidth}px"></i>`;
    })
    .join("");
  const maLegends = [
    { label: "MA5", value: ma5.at(-1), className: "ma5" },
    { label: "MA10", value: ma10.at(-1), className: "ma10" },
    { label: "MA20", value: ma20.at(-1), className: "ma20" }
  ];
  const maLines = state.klineIndicators.ma
    ? `
      <svg class="indicator-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${buildIndicatorPolyline(ma5.slice(offset), min, max, "ma5")}
        ${buildIndicatorPolyline(ma10.slice(offset), min, max, "ma10")}
        ${buildIndicatorPolyline(ma20.slice(offset), min, max, "ma20")}
      </svg>
    `
    : "";
  const bollLines = state.klineIndicators.boll
    ? `
      <svg class="indicator-lines boll-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${buildIndicatorPolyline(boll.slice(offset).map((item) => item?.upper), min, max, "boll-upper")}
        ${buildIndicatorPolyline(boll.slice(offset).map((item) => item?.middle), min, max, "boll-mid")}
        ${buildIndicatorPolyline(boll.slice(offset).map((item) => item?.lower), min, max, "boll-lower")}
      </svg>
    `
    : "";
  const macd = calculateMACD(renderCandles);
  const kdj = calculateKDJ(renderCandles);
  const revealText = state.klineAnswered ? "训练结束" : "点击买入 / 卖出 / 观望推进下一根";
  const mid = (max + min) / 2;
  const remaining = Math.max(allCandles.length - sim.currentIndex - 1, 0);
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Number(sim.startedAt || Date.now())) / 1000));
  const volumeMA5 = calculateMA(renderCandles.map((item) => ({ close: Number(item.volume || 0) })), 5).at(-1);
  const volumeMA10 = calculateMA(renderCandles.map((item) => ({ close: Number(item.volume || 0) })), 10).at(-1);
  const latestBoll = boll.at(-1);

  $("#klineChart").innerHTML = `
    <div class="kline-terminal-top">
      <div class="terminal-title">知行K线训练 - 进行中</div>
      <div><span>用时: ${formatKlineElapsed(elapsedSeconds)}</span><span>剩余: ${remaining}根</span></div>
    </div>
    <div class="kline-quote-board">
      <div class="quote-price ${trendClass}">
        <strong>${formatPrice(last.close)}</strong>
        <span>${absoluteChange >= 0 ? "+" : ""}${absoluteChange.toFixed(2)} ${dailyChange >= 0 ? "+" : ""}${dailyChange.toFixed(2)}%</span>
      </div>
      <div><span>开</span><strong>${formatPrice(last.open)}</strong></div>
      <div><span>收</span><strong>${formatPrice(last.close)}</strong></div>
      <div><span>高</span><strong>${formatPrice(last.high)}</strong></div>
      <div><span>低</span><strong>${formatPrice(last.low)}</strong></div>
      <div><span>量</span><strong>${formatVolume(last.volume)}</strong></div>
    </div>
    <div class="kline-ma-legend">
      ${state.klineIndicators.ma ? maLegends.map((item) => `<span class="${item.className}">${item.label}:${formatOptionalPrice(item.value)}</span>`).join("") : "<span>MA 已隐藏</span>"}
      ${state.klineIndicators.boll && latestBoll ? `<span class="boll-mid">BOLL:${formatOptionalPrice(latestBoll.middle)}</span><span class="boll-upper">UP:${formatOptionalPrice(latestBoll.upper)}</span><span class="boll-lower">LOW:${formatOptionalPrice(latestBoll.lower)}</span>` : ""}
      <div class="kline-zoom-controls" aria-label="K线缩放">
        <button data-kline-zoom="in" title="放大">+</button>
        <button data-kline-zoom="out" title="缩小">-</button>
        <span>${displayCandles.length}根</span>
      </div>
    </div>
    <div class="kline-scroll-shell">
      <div class="kline-scroll-canvas" style="width:${chartWidth}px">
        <div class="kline-main-pane">
          <div class="kline-axis"><span>${formatPrice(max)}</span><span>${formatPrice(mid)}</span><span>${formatPrice(min)}</span></div>
          <div class="current-price-line ${trendClass}" style="--y:${mapToPercent(last.close, min, max)}%"><span>${formatPrice(last.close)}</span></div>
          ${maLines}
          ${bollLines}
          <div class="terminal-candle-layer">${candles}</div>
        </div>
        ${state.klineIndicators.vol ? `
          <div class="indicator-pane volume-pane">
            <div class="indicator-label">VOL:${formatVolume(last.volume)}　MA5:${formatVolume(volumeMA5)}　MA10:${formatVolume(volumeMA10)}</div>
            <div class="volume-layer">${volumes}</div>
          </div>
        ` : ""}
        ${state.klineIndicators.macd ? renderMacdPane(macd.slice(offset), candleWidth) : ""}
        ${state.klineIndicators.kdj ? renderKdjPane(kdj.slice(offset)) : ""}
        ${state.klineIndicators.rsi ? renderRsiPane(rsi.slice(offset)) : ""}
      </div>
    </div>
    <div class="kline-reveal-label">${revealText}</div>
  `;
  bindKlineZoomControls();
  scrollKlineChartToLatest();
}

function bindKlineZoomControls() {
  $$("#klineChart [data-kline-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      const sim = ensureKlineSimulation();
      const maxDisplayCount = Math.max(klineDisplayDefault, sim.candles?.length || klineDisplayDefault);
      const current = Math.min(
        Math.max(Number(state.klineDisplayCount || klineDisplayDefault), klineDisplayMin),
        maxDisplayCount
      );
      state.klineDisplayCount = button.dataset.klineZoom === "in"
        ? Math.max(klineDisplayMin, current - klineZoomInStep)
        : Math.min(maxDisplayCount, current + klineZoomOutStep);
      renderKlineChart();
      renderKlineGameMetrics();
    });
  });
}

function scrollKlineChartToLatest() {
  const shell = $("#klineChart .kline-scroll-shell");
  if (!shell) return;
  shell.scrollLeft = shell.scrollWidth;
}

function mapToPercent(value, min, max) {
  return ((max - Number(value || 0)) / Math.max(max - min, 0.01)) * 100;
}

function calculateMA(candles, period) {
  return candles.map((_, index) => {
    if (index + 1 < period) return null;
    const slice = candles.slice(index + 1 - period, index + 1);
    return slice.reduce((sum, item) => sum + Number(item.close || 0), 0) / period;
  });
}

function calculateEMA(values, period) {
  const k = 2 / (period + 1);
  const result = [];
  values.forEach((value, index) => {
    result[index] = index === 0 ? value : value * k + result[index - 1] * (1 - k);
  });
  return result;
}

function calculateMACD(candles) {
  const closes = candles.map((item) => Number(item.close || 0));
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const dif = closes.map((_, index) => ema12[index] - ema26[index]);
  const dea = calculateEMA(dif, 9);
  return closes.map((_, index) => ({
    dif: Number(dif[index] || 0),
    dea: Number(dea[index] || 0),
    bar: Number(((dif[index] || 0) - (dea[index] || 0)) * 2)
  }));
}

function calculateKDJ(candles) {
  let k = 50;
  let d = 50;
  return candles.map((candle, index) => {
    const window = candles.slice(Math.max(0, index - 8), index + 1);
    const low = Math.min(...window.map((item) => item.low));
    const high = Math.max(...window.map((item) => item.high));
    const rsv = high === low ? 50 : ((candle.close - low) / (high - low)) * 100;
    k = (2 / 3) * k + (1 / 3) * rsv;
    d = (2 / 3) * d + (1 / 3) * k;
    return { k, d, j: 3 * k - 2 * d };
  });
}

function calculateBOLL(candles, period = 20, multiple = 2) {
  return candles.map((candle, index) => {
    if (index + 1 < period) return null;
    const window = candles.slice(index + 1 - period, index + 1).map((item) => Number(item.close || 0));
    const middle = window.reduce((sum, value) => sum + value, 0) / period;
    const variance = window.reduce((sum, value) => sum + Math.pow(value - middle, 2), 0) / period;
    const width = Math.sqrt(variance) * multiple;
    return {
      middle,
      upper: middle + width,
      lower: middle - width
    };
  });
}

function calculateRSI(candles, period = 14) {
  const closes = candles.map((item) => Number(item.close || 0));
  let avgGain = 0;
  let avgLoss = 0;
  return closes.map((close, index) => {
    if (index === 0) return null;
    const change = close - closes[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (index <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (index < period) return null;
      avgGain /= period;
      avgLoss /= period;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  });
}

function buildIndicatorPolyline(values, min, max, className) {
  const points = values
    .map((value, index) => {
      if (!Number.isFinite(value)) return null;
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = mapToPercent(value, min, max);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .filter(Boolean)
    .join(" ");
  return points ? `<polyline class="${className}" points="${points}"></polyline>` : "";
}

function renderMacdPane(values, candleWidth) {
  const maxAbs = Math.max(...values.flatMap((item) => [Math.abs(item.dif), Math.abs(item.dea), Math.abs(item.bar)]), 0.01);
  const bars = values
    .map((item, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const height = Math.max(1, (Math.abs(item.bar) / maxAbs) * 46);
      const top = item.bar >= 0 ? 50 - height : 50;
      return `<i class="${item.bar >= 0 ? "up" : "down"}" style="--x:${x}%;--top:${top}%;--h:${height}%;--w:${Math.max(3, candleWidth * 0.68)}px"></i>`;
    })
    .join("");
  const dif = values.at(-1)?.dif || 0;
  const dea = values.at(-1)?.dea || 0;
  const bar = values.at(-1)?.bar || 0;
  return `
    <div class="indicator-pane macd-pane">
      <div class="indicator-label">MACD(12,26,9)　DIF:${dif.toFixed(2)}　DEA:${dea.toFixed(2)}　柱:${bar.toFixed(2)}</div>
      <svg class="indicator-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${buildCenteredPolyline(values.map((item) => item.dif), maxAbs, "dif")}
        ${buildCenteredPolyline(values.map((item) => item.dea), maxAbs, "dea")}
      </svg>
      <div class="macd-bars">${bars}</div>
    </div>
  `;
}

function renderKdjPane(values) {
  const latest = values.at(-1) || { k: 0, d: 0, j: 0 };
  return `
    <div class="indicator-pane kdj-pane">
      <div class="indicator-label">KDJ(14,1,3)　K:${latest.k.toFixed(2)}　D:${latest.d.toFixed(2)}　J:${latest.j.toFixed(2)}</div>
      <svg class="indicator-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${buildIndicatorPolyline(values.map((item) => item.k), 0, 100, "k")}
        ${buildIndicatorPolyline(values.map((item) => item.d), 0, 100, "d")}
        ${buildIndicatorPolyline(values.map((item) => item.j), 0, 100, "j")}
      </svg>
    </div>
  `;
}

function renderRsiPane(values) {
  const latest = values.findLast((value) => Number.isFinite(value)) || 0;
  return `
    <div class="indicator-pane rsi-pane">
      <div class="indicator-label">RSI(14)　${latest.toFixed(2)}</div>
      <svg class="indicator-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${buildIndicatorPolyline(values, 0, 100, "rsi")}
      </svg>
    </div>
  `;
}

function buildCenteredPolyline(values, maxAbs, className) {
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 50 - (Number(value || 0) / Math.max(maxAbs, 0.01)) * 45;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return `<polyline class="${className}" points="${points}"></polyline>`;
}

function renderKlineGameMetrics() {
  const sim = ensureKlineSimulation();
  const values = sim.candles;
  const visible = values.slice(0, sim.currentIndex + 1);
  const open = visible[0]?.open || 1;
  const high = visible.length ? Math.max(...visible.map((item) => item.high)) : open;
  const low = visible.length ? Math.min(...visible.map((item) => item.low)) : open;
  const account = getKlineEquity(sim);

  $("#klineAccountValue").textContent = formatNumber(account);
  $("#klinePositionValue").textContent = `${getKlinePositionPercent(sim)}%`;
  $("#klineProfitValue").textContent = `${getKlinePnlPercent(sim).toFixed(2)}%`;
  $("#klineDrawdownValue").textContent = `${Math.abs(sim.maxDrawdown).toFixed(2)}%`;
  $("#klinePracticeCount").textContent = sim.actions.length;
  $("#klineQuestionBankCount").textContent = values.length || 150;
  $("#klineScoreBadge").textContent = `${Math.round(((sim.currentIndex + 1) / Math.max(values.length, 1)) * 100)}%`;

  const labTotal = $("#klineLabTotal");
  const labPoints = $("#klineLabPoints");
  const labReminder = $("#klineLabReminder");
  const labInstrument = $("#klineLabInstrument");
  if (labTotal) labTotal.textContent = state.klineBankStats.total_questions || 1500;
  if (labPoints) labPoints.textContent = state.klineStats.total_points || 0;
  if (labReminder) labReminder.textContent = `训练第一问：${state.klineScenario.focus || "这一笔"}，是计划，还是情绪？`;
  if (labInstrument) labInstrument.textContent = `A股随机片段 · ${state.klineScenario.timeframe_label || "日K"}`;
}

function scrollToKlinePractice() {
  $(".kline-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  showToast("已进入知行K线训练台。");
}

function estimateKlinePosition(decision = "") {
  if (!decision) return 0;
  if (/重仓|加码|追涨|扛单/.test(decision)) return 80;
  if (/轻仓|小仓|降低/.test(decision)) return 20;
  if (/买入|买点|开仓/.test(decision)) return 50;
  if (/卖点|离场|等待|暂停|止损|复盘|计划|观望/.test(decision)) return 0;
  return 30;
}

function getKlineActionTone(label = "") {
  if (/^买$|买入|买点|开仓|追涨|重仓|加码|扛单|幻想/.test(label)) return "risk";
  if (/^卖$|空仓|卖点|离场|止损|降低|暂停|等待|观望|计划|复盘|验证|守/.test(label)) return "discipline";
  return "observe";
}

function getKlineMarkerClass(action = "") {
  if (action === "买") return "buy";
  if (action === "卖" || action === "自动卖出") return "sell";
  return "cash";
}

function getKlineMarketMeta() {
  const scenario = state.klineScenario || {};
  if (scenario.data_source === "eastmoney_history") {
    return `A股历史K线 · 同一匿名标的 · ${scenario.timeframe_label || "日K"} · 只做复盘训练，不识别个股`;
  }
  return "A股历史K线训练位 · 当前为心性题库回退模式 · 作答后进入下一段";
}

function normalizeCandles(candles = []) {
  return candles.map((item, index) => {
    if (typeof item === "number") {
      const previous = index ? Number(candles[index - 1]) : Number(item);
      const high = Math.max(Number(item), previous) + 2;
      const low = Math.min(Number(item), previous) - 2;
      return {
        date: "",
        open: previous,
        close: Number(item),
        high,
        low,
        volume: 0
      };
    }

    const open = Number(item.open ?? item.o ?? item.close ?? 0);
    const close = Number(item.close ?? item.c ?? open);
    const high = Number(item.high ?? item.h ?? Math.max(open, close));
    const low = Number(item.low ?? item.l ?? Math.min(open, close));
    return {
      date: item.date || item.day || "",
      open,
      close,
      high,
      low,
      volume: Number(item.volume || item.vol || 0)
    };
  }).filter((item) => [item.open, item.close, item.high, item.low].every(Number.isFinite));
}

function formatPrice(value) {
  const num = Number(value || 0);
  if (Math.abs(num) >= 100) return num.toFixed(2);
  return num.toFixed(2);
}

function formatKlineMoney(value) {
  const num = Number(value || 0);
  const sign = num < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(num))}`;
}

function formatOptionalPrice(value) {
  return Number.isFinite(value) ? formatPrice(value) : "--";
}

function formatVolume(value) {
  const num = Number(value || 0);
  if (!num) return "-";
  if (num >= 100000000) return `${(num / 100000000).toFixed(2)}亿`;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  return formatNumber(num);
}

function formatKlineElapsed(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min ? `${min}分${String(sec).padStart(2, "0")}秒` : `${sec}秒`;
}

function showMindCheck(text) {
  const reminders = {
    想追涨: "冲动一起，先停10分钟。写下买入理由和失效条件，再决定是否行动。",
    想扛单: "扛单常伪装成耐心。先看计划线是否破位，破位就执行，不和亏损辩论。",
    怕错过: "错过不是风险，失控才是风险。把这次机会放进观察表，不急着证明自己。",
    想听别人意见: "良知在自己心上，不在热闹处。先写出自己的判断，再听外部观点。"
  };
  $("#klineInsight").textContent = reminders[text] || "先照见这一念，再决定下一步动作。";
  showToast("已生成一念提醒。");
}

function renderLeaderboard() {
  const rows = state.leaderboard.length
    ? state.leaderboard
    : [
        { rank: 1, nickname: "等待第一位修行者", total_points: 0, practice_count: 0 },
        { rank: 2, nickname: "K线练习后上榜", total_points: 0, practice_count: 0 },
        { rank: 3, nickname: "排行榜不比收益", total_points: 0, practice_count: 0 }
      ];

  $("#leaderboardList").innerHTML = rows
    .slice(0, 6)
    .map(
      (item) => `
        <div class="leaderboard-row">
          <em>${item.rank}</em>
          <strong>${escapeHtml(item.nickname)}</strong>
          <span>${item.total_points || 0} 临盘分</span>
        </div>
      `
    )
    .join("");
}

async function loadQuestionBank() {
  const backendReady = await refreshBackendStats();
  if (backendReady) return;

  try {
    const response = await fetch("./data/question-bank.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.bank = await response.json();
    state.bankStats = {
      total_questions: state.bank.length,
      personality_counts: countBy(state.bank, "personality_type")
    };
    setText("#bankStatus", "题库已就绪");
    $("#totalQuestionsStat").textContent = "动态";
    renderDimensionPreview();
  } catch (error) {
    if (state.config.useBackend && state.config.apiBaseUrl) {
      setText("#bankStatus", "题库已就绪");
      $("#totalQuestionsStat").textContent = "动态";
      renderDimensionPreview();
      console.warn("本地演示题库未加载，正式测评继续使用后端题库。", error);
      return;
    }
    setText("#bankStatus", "题库暂未连接");
    showToast("题库暂时不可用，请稍后重试或联系助教处理。");
    console.error(error);
  }
}

async function loadTrainingPlans() {
  try {
    const response = await fetch("./data/training-plan-720.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.trainingPlans = Array.isArray(data.plans) ? data.plans : [];
  } catch (error) {
    state.trainingPlans = [];
    console.warn("720天训练计划暂未加载，K线复盘使用默认训练建议。", error);
  }
}

function normalizeKlineSceneCard(card = {}, index = 0) {
  const image = String(card.image || card.src || "").trim();
  const title = String(card.title || card.name || "").trim();
  if (!image || !title) return null;
  return {
    id: String(card.id || `scene_${index + 1}`).trim(),
    title,
    theme: String(card.theme || "场景训练").trim(),
    text: String(card.text || card.description || "看见盘面，也看见自己当下的一念。").trim(),
    image,
    tags: Array.isArray(card.tags) ? card.tags.map((tag) => String(tag).trim()).filter(Boolean) : []
  };
}

async function loadKlineScenePool() {
  try {
    const response = await fetch("./data/kline-scene-pool.json", { cache: "no-cache" });
    if (!response.ok) return;
    const payload = await response.json();
    const source = Array.isArray(payload) ? payload : payload.scenes;
    if (!Array.isArray(source)) return;
    const cards = source.map(normalizeKlineSceneCard).filter(Boolean);
    if (cards.length) {
      klineSceneCards = cards;
    }
  } catch (error) {
    console.warn("K线场景池暂不可用，使用内置场景。", error);
  }
}

async function refreshBackendStats() {
  syncConfigFromInputs();
  if (!state.config.useBackend || !state.config.apiBaseUrl) return false;

  try {
    const data = await apiFetch("/api/v1/stats/public");
    const questionBank = data.question_bank || {};
    const bankTotal = questionBank.total_questions || questionBank.total || state.bank.length;
    state.bankStats = {
      total_questions: bankTotal,
      personality_counts: questionBank.personality_counts || {}
    };
    setText("#bankStatus", "题库已就绪");
    $("#totalQuestionsStat").textContent = "动态";
    renderDimensionPreview();
    mergeServerImpactStats(data);
    return true;
  } catch (error) {
    console.warn("后端统计暂不可用，继续使用本地题库。", error);
    if (state.bank.length) {
      setText("#bankStatus", "题库已就绪");
    } else if (state.config.useBackend && state.config.apiBaseUrl) {
      setText("#bankStatus", "题库已就绪");
      $("#totalQuestionsStat").textContent = "动态";
      renderDimensionPreview();
    }
    return false;
  }
}

async function apiFetch(path, options = {}) {
  const baseUrl = state.config.apiBaseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
}

function syncConfigFromInputs() {
  const apiInput = $("#apiBaseUrlInput");
  const backendInput = $("#useBackendInput");
  const cozeInput = $("#cozeUrlInput");
  const feishuInput = $("#feishuUrlInput");
  if (apiInput) {
    const nextApiBaseUrl = apiInput.value.trim() || defaultApiBaseUrl;
    state.config.apiBaseUrl = isLocalFrontendUrl(nextApiBaseUrl) ? "http://127.0.0.1:8787" : nextApiBaseUrl;
    if (apiInput.value.trim() !== state.config.apiBaseUrl) apiInput.value = state.config.apiBaseUrl;
  }
  if (backendInput) state.config.useBackend = backendInput.checked;
  if (cozeInput) state.config.cozeUrl = cozeInput.value.trim();
  if (feishuInput) state.config.feishuUrl = feishuInput.value.trim();
}

function normalizeServerScoreResult(result) {
  if (!result) return calculateResult();
  const camp = result.camp || result.recommended_camp || profiles[result.main_type]?.camp || "基础觉察营";
  return {
    ...result,
    camp,
    score_percentages: result.score_percentages || {},
    top_sub_dimensions: result.top_sub_dimensions || [],
    risk_ranking: result.risk_ranking || [],
    actions_7_days: result.actions_7_days || profiles[result.main_type]?.actions || []
  };
}

function getRecentQuestionIds() {
  try {
    return JSON.parse(localStorage.getItem("tradingPersonality.recentQuestionIds") || "[]");
  } catch {
    return [];
  }
}

function mergeServerImpactStats(data) {
  if (!data) return;
  state.serverImpact = {
    registrations: Number(data.registrations || 0),
    assessments: Number(data.assessments || 0),
    reports: Number(data.reports || 0),
    assistants: Number(data.assistant_bindings || data.assistants || 0)
  };
  renderImpactStats();
}

function renderDimensionPreview() {
  const counts = Object.keys(state.bankStats.personality_counts || {}).length
    ? state.bankStats.personality_counts
    : countBy(state.bank, "personality_type");
  const maxCount = Math.max(...allTypes.map((type) => counts[type] || 0), 1);
  $("#dimensionPreview").innerHTML = allTypes
    .map((type) => {
      const count = counts[type] || 0;
      const width = Math.round((count / maxCount) * 100);
      return `
        <div class="mini-row">
          <span>${displayType(type)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
          <strong>${count}</strong>
        </div>
      `;
    })
    .join("");
}

async function startAssessment(useDemoScores) {
  syncConfigFromInputs();
  state.assessmentMode = "sprint8";
  const loggedServerUser = Boolean(state.auth?.serverId && state.config.useBackend);
  if (loggedServerUser && !getAccessToken()) {
    showToast("登录态已失效，请重新登录后再开始测评。");
    lockApp();
    return;
  }

  const startedByServer = state.assessmentMode === "sprint8" ? false : await startAssessmentByServer();
  if (loggedServerUser && !startedByServer) {
    showToast("本次照心题会先在本地生成，报告仍归到你的手机号。");
  }

  if (state.assessmentMode === "sprint8") {
    state.assessmentId = "";
    state.selectedVersion = sprint8Questions.length;
    state.questions = sprint8Questions.map((question) => ({
      ...question,
      personality_type: question.dimension_label,
      weight: 1,
      options: question.options.map((option) => ({ ...option }))
    }));
  } else if (!startedByServer) {
    if (!state.bank.length) {
      showToast("题库还没有加载完成，且后端暂不可用。");
      return;
    }
    state.assessmentId = "";
    state.questions = selectQuestions(state.bank, state.selectedVersion);
  }

  state.answers = {};
  state.sprint8AnswerOptions = {};
  state.currentIndex = 0;
  state.result = null;
  state.report = "";
  state.serverReport = null;

  if (useDemoScores) {
    state.questions.forEach((question) => {
      const base = question.personality_type === "冲动型" ? 4 : question.personality_type === "焦虑型" ? 3 : 2;
      state.answers[question.question_id] = clamp(base + Math.floor(Math.random() * 2), 1, 5);
    });
    await finishAssessment();
    return;
  }

  updateStep("answer");
  setText("#sessionStatus", `照心进行中：${state.selectedVersion} 题`);
  $("#answerTotal").textContent = `/ ${state.questions.length}`;
  renderQuestion();
}

async function startAssessmentByServer() {
  if (state.assessmentMode === "sprint8") return false;
  if (!state.config.useBackend || !state.config.apiBaseUrl) return false;

  try {
    setText("#sessionStatus", "正在生成题组");
    const result = await apiFetch("/api/v1/assessments/start", {
      method: "POST",
      body: JSON.stringify({
        user_id: state.auth?.serverId || state.auth?.id || "web_user",
        nickname: $("#nicknameInput").value.trim() || state.auth?.displayName || "测试用户",
        user: state.auth
          ? {
              id: state.auth.serverId || state.auth.id,
              displayName: state.auth.displayName,
              method: state.auth.method,
              wechatBound: Boolean(state.auth.wechatBound)
            }
          : null,
        test_version: String(state.selectedVersion),
        source_channel: getSourceChannel(),
        exclude_question_ids: getRecentQuestionIds()
      })
    });

    state.assessmentId = result.assessment_id;
    state.questions = result.questions || [];
    return state.questions.length > 0;
  } catch (error) {
    console.error(error);
    showToast("题组暂时生成失败，请稍后重试或联系助教处理。");
    return false;
  }
}

function selectQuestions(bank, version) {
  const perTypeCount = perTypeCountMap[version] || 5;
  const recentIds = new Set(JSON.parse(localStorage.getItem("tradingPersonality.recentQuestionIds") || "[]"));
  const selected = [];

  allTypes.forEach((type) => {
    const typePool = bank.filter((item) => item.personality_type === type);
    const freshPool = typePool.filter((item) => !recentIds.has(item.question_id));
    const usablePool = freshPool.length >= perTypeCount ? freshPool : typePool;
    const bySub = groupBy(usablePool, "sub_dimension");
    const subKeys = shuffle(Object.keys(bySub));
    const picks = [];

    subKeys.forEach((subKey) => {
      if (picks.length >= perTypeCount) return;
      picks.push(shuffle(bySub[subKey])[0]);
    });

    const pickedIds = new Set(picks.map((item) => item.question_id));
    const rest = shuffle(usablePool.filter((item) => !pickedIds.has(item.question_id)));
    while (picks.length < perTypeCount && rest.length) {
      picks.push(rest.shift());
    }

    selected.push(...picks.slice(0, perTypeCount));
  });

  return shuffle(selected);
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  const answered = Object.keys(state.answers).length;
  const progress = Math.round((answered / state.questions.length) * 100);
  const isSceneQuestion = Array.isArray(question.options) && question.options.length;

  $("#questionIndex").textContent = `第 ${state.currentIndex + 1} / ${state.questions.length} 题`;
  $("#progressBar").style.width = `${progress}%`;
  $("#questionType").textContent = question.dimension_label || displayType(question.personality_type);
  $("#questionSub").textContent = question.sub_dimension;
  $("#questionText").textContent = question.question_text;
  $("#answeredCount").textContent = answered;
  $("#prevBtn").disabled = state.currentIndex === 0;
  $("#nextBtn").textContent = state.currentIndex === state.questions.length - 1 ? "生成照心报告" : "继续观照";

  if (isSceneQuestion) {
    $("#scoreOptions").classList.add("scene-options");
    $("#scoreOptions").innerHTML = question.options
      .map((option, index) => `
        <button data-option-index="${index}" aria-checked="${state.sprint8AnswerOptions[question.question_id]?.id === option.id ? "true" : "false"}">
          <strong>${String.fromCharCode(65 + index)}</strong>
          <span>${escapeHtml(option.text)}</span>
          <em>${escapeHtml(option.hint || "")}</em>
        </button>
      `)
      .join("");
    $$("#scoreOptions button").forEach((button) => {
      const option = question.options[Number(button.dataset.optionIndex)];
      button.classList.toggle("selected", state.sprint8AnswerOptions[question.question_id]?.id === option?.id);
    });
  } else {
    $("#scoreOptions").classList.remove("scene-options");
    $$("#scoreOptions button").forEach((button) => {
      button.classList.toggle("selected", Number(button.dataset.score) === state.answers[question.question_id]);
    });
  }

  renderCoverage();
}

function renderCoverage() {
  if (state.assessmentMode === "sprint8") {
    const byDimension = groupBy(state.questions, "dimension");
    $("#typeCoverage").innerHTML = sprint8Dimensions
      .map((dimension) => {
        const questions = byDimension[dimension.id] || [];
        const answered = questions.filter((item) => state.answers[item.question_id]).length;
        const width = questions.length ? Math.round((answered / questions.length) * 100) : 0;
        return `
          <div class="coverage-row">
            <span>${dimension.label}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
            <strong>${answered}/${questions.length}</strong>
          </div>
        `;
      })
      .join("");
    return;
  }

  const byType = groupBy(state.questions, "personality_type");
  $("#typeCoverage").innerHTML = allTypes
    .map((type) => {
      const questions = byType[type] || [];
      const answered = questions.filter((item) => state.answers[item.question_id]).length;
      const width = questions.length ? Math.round((answered / questions.length) * 100) : 0;
      return `
        <div class="coverage-row">
          <span>${displayType(type)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
          <strong>${answered}/${questions.length}</strong>
        </div>
      `;
    })
    .join("");
}

function goPrev() {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    renderQuestion();
  }
}

async function goNext() {
  const question = state.questions[state.currentIndex];
  if (!state.answers[question.question_id]) {
    showToast("这一题还没有选择最像你的那一句。");
    return;
  }

  if (state.currentIndex === state.questions.length - 1) {
    const unanswered = state.questions.filter((item) => !state.answers[item.question_id]);
    if (unanswered.length) {
      state.currentIndex = state.questions.findIndex((item) => item.question_id === unanswered[0].question_id);
      renderQuestion();
      showToast(`还有 ${unanswered.length} 题没有作答。`);
      return;
    }
    await finishAssessment();
    return;
  }

  state.currentIndex += 1;
  renderQuestion();
}

async function finishAssessment() {
  const scoredByServer = await submitAssessmentToServer();
  if (!scoredByServer) {
    state.result = calculateResult();
    state.report = buildReport(state.result);
  }

  state.retestReport = buildRetestReport(state.result);
  state.retestComparison = state.retestReport.summary;
  saveAssessmentBaseline(state.result);
  incrementImpact({ assessments: 1, reports: 1 });
  rememberQuestionIds();
  if (scoredByServer) await autoSyncFeishuLead();
  renderResult();
  updateStep("generating");
  setText("#sessionStatus", "正在整理照心报告");
  await delay(3800);
  updateStep("result");
  setText("#sessionStatus", `${scoredByServer ? "后端" : "本地"}已完成：${state.selectedVersion} 题`);
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function submitAssessmentToServer() {
  if (state.assessmentMode === "sprint8") return false;
  if (!state.config.useBackend || !state.assessmentId) return false;

  const answers = state.questions.map((question) => ({
    question_id: question.question_id,
    score: Number(state.answers[question.question_id])
  }));

  try {
    setText("#sessionStatus", "正在生成后端报告");
    $("#nextBtn").disabled = true;
    const data = await apiFetch(`/api/v1/assessments/${state.assessmentId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers })
    });

    state.result = normalizeServerScoreResult(data.score_result);
    state.serverReport = data.report || null;
    state.report = data.report?.content_md || buildReport(state.result);
    return true;
  } catch (error) {
    console.error(error);
    showToast("后端评分暂不可用，已使用本地评分生成报告。");
    return false;
  } finally {
    $("#nextBtn").disabled = false;
  }
}

function calculateResult() {
  if (state.assessmentMode === "sprint8") return calculateSprint8Result();

  const scores = {};
  const counts = {};
  const maxScores = {};
  const subScores = {};

  allTypes.forEach((type) => {
    scores[type] = 0;
    counts[type] = 0;
    maxScores[type] = 0;
  });

  state.questions.forEach((question) => {
    const score = Number(state.answers[question.question_id] || 0);
    const weight = Number(question.weight || 1);
    const type = question.personality_type;
    const subKey = `${type}｜${question.sub_dimension}`;

    scores[type] += score * weight;
    counts[type] += 1;
    maxScores[type] += 5 * weight;

    if (!subScores[subKey]) {
      subScores[subKey] = {
        personality_type: type,
        sub_dimension: question.sub_dimension,
        score: 0,
        max_score: 0,
        training_ability: question.training_ability
      };
    }
    subScores[subKey].score += score * weight;
    subScores[subKey].max_score += 5 * weight;
  });

  const percentages = {};
  allTypes.forEach((type) => {
    percentages[type] = maxScores[type] ? Math.round((scores[type] / maxScores[type]) * 100) : 0;
  });

  const riskRanking = riskTypes
    .map((type) => ({ type, score: scores[type], percent: percentages[type] }))
    .sort((a, b) => b.percent - a.percent || b.score - a.score);

  const balancePercent = percentages["平衡型"];
  const topRisk = riskRanking[0];
  const secondRisk = riskRanking[1];
  const mainType = balancePercent >= 84 && topRisk.percent <= 58 ? "平衡型" : topRisk.type;
  const subType = mainType === "平衡型" ? (topRisk.percent >= 50 ? topRisk.type : "副人格不明显") : secondRisk.type;
  const riskLevel = getRiskLevel(topRisk.percent);
  const topSubDimensions = Object.values(subScores)
    .map((item) => ({
      ...item,
      percent: item.max_score ? Math.round((item.score / item.max_score) * 100) : 0
    }))
    .sort((a, b) => b.percent - a.percent || b.score - a.score)
    .slice(0, 5);

  const profile = profiles[mainType];

  return {
    nickname: $("#nicknameInput").value.trim() || "测试用户",
    channel: getSourceChannel(),
    test_version: String(state.selectedVersion),
    main_type: mainType,
    sub_type: subType,
    risk_level: riskLevel,
    current_trading_risk: profile.risk,
    easiest_loss_scene: profile.scene,
    training_ability: topSubDimensions[0]?.training_ability || profile.ability,
    yangming_reminder: profile.reminder,
    camp: profile.camp,
    score_percentages: percentages,
    raw_scores: scores,
    top_sub_dimensions: topSubDimensions,
    risk_ranking: riskRanking,
    balance_percent: balancePercent,
    actions_7_days: profile.actions
  };
}

function calculateSprint8Result() {
  const scores = {};
  const maxScores = {};
  const subScores = {};

  allTypes.forEach((type) => {
    scores[type] = 0;
    maxScores[type] = 0;
  });

  state.questions.forEach((question) => {
    const option = state.sprint8AnswerOptions[question.question_id];
    if (!option) return;

    const type = option.personality_type || "平衡型";
    const score = Number(option.score || 5);
    const subKey = `${type}｜${option.hint || question.sub_dimension}`;

    scores[type] += score;
    maxScores[type] += 5;

    if (!subScores[subKey]) {
      subScores[subKey] = {
        personality_type: type,
        sub_dimension: option.hint || question.sub_dimension,
        score: 0,
        max_score: 0,
        training_ability: option.action || "先看见起心动念，再训练下一次动作。"
      };
    }

    subScores[subKey].score += score;
    subScores[subKey].max_score += 5;
  });

  const percentages = {};
  allTypes.forEach((type) => {
    percentages[type] = maxScores[type] ? Math.round((scores[type] / maxScores[type]) * 100) : 0;
  });

  const riskRanking = riskTypes
    .map((type) => ({ type, score: scores[type], percent: percentages[type] }))
    .sort((a, b) => b.percent - a.percent || b.score - a.score);
  const topRisk = riskRanking[0] || { type: "平衡型", percent: 0 };
  const secondRisk = riskRanking[1] || { type: "副人格不明显", percent: 0 };
  const mainType = topRisk.percent > 0 ? topRisk.type : "平衡型";
  const profile = profiles[mainType] || profiles["平衡型"];
  const topSubDimensions = Object.values(subScores)
    .map((item) => ({
      ...item,
      percent: item.max_score ? Math.round((item.score / item.max_score) * 100) : 0
    }))
    .sort((a, b) => b.percent - a.percent || b.score - a.score)
    .slice(0, 5);

  return {
    nickname: $("#nicknameInput").value.trim() || "测试用户",
    channel: getSourceChannel(),
    test_version: String(sprint8Questions.length),
    main_type: mainType,
    sub_type: secondRisk.type,
    risk_level: getRiskLevel(topRisk.percent),
    current_trading_risk: profile.risk,
    easiest_loss_scene: profile.scene,
    training_ability: topSubDimensions[0]?.training_ability || profile.ability,
    yangming_reminder: profile.reminder,
    camp: profile.camp,
    score_percentages: percentages,
    raw_scores: scores,
    top_sub_dimensions: topSubDimensions,
    risk_ranking: riskRanking,
    balance_percent: percentages["平衡型"],
    actions_7_days: profile.actions
  };
}

function getRiskLevel(percent) {
  if (percent >= 78) return "高风险：近期很容易被交易惯性带走";
  if (percent >= 62) return "中高风险：需要马上训练关键动作";
  if (percent >= 46) return "中等风险：已有明显模式，需要持续校正";
  return "低风险：保持复盘，避免松懈";
}

function buildReport(result) {
  const profile = profiles[result.main_type];
  const subProfile = profiles[result.sub_type] || null;
  const topSubs = result.top_sub_dimensions
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${displayType(item.personality_type)}-${item.sub_dimension}：${item.percent}%`)
    .join("\n");
  const actions = result.actions_7_days.map((item, index) => `${index + 1}. 第${index + 1}天：${item}`).join("\n");

  return `《九种交易人格 AI 诊断报告》

一、测评说明
本报告基于你本次 ${result.test_version} 题作答生成，用于交易认知教育、行为觉察与训练分层，不构成任何投资建议、买卖建议或收益承诺。

二、主人格：${displayType(result.main_type)}
你的主要交易模式是：${profile.pattern}
这说明你在交易中最容易重复出现的，不是技术问题，而是一种稳定的行为惯性。真正要修的不是某一笔交易，而是下单、持仓、止损、复盘背后的心念和动作。

三、副人格：${displayType(result.sub_type)}
${subProfile ? `压力下容易暴露的问题是：${subProfile.pattern}` : "当前副人格并不突出，说明你的风险人格没有明显集中在第二类型上。"}

四、当前交易风险
${result.risk_level}
${result.current_trading_risk}

五、最容易亏钱的场景
${result.easiest_loss_scene}

六、最该训练的一项能力
${result.training_ability}

七、高分子维度
${topSubs}

八、阳明心学提醒
${result.yangming_reminder}

九、7 天行动建议
${actions}

十、训练营分层建议
建议进入「${result.camp}」。训练重点不是预测行情，而是把你的交易动作从情绪驱动，慢慢训练成规则驱动。`;
}

function renderResult() {
  const result = state.result;
  const mainPercent = Number(result.score_percentages[result.main_type] || 0);
  const profile = profiles[result.main_type] || {};
  $("#mainTypeTitle").textContent = `${displayType(result.main_type)} 交易画像`;
  $("#riskBadge").textContent = result.risk_level.replace(/：.*/, "");
  $("#mainTypeValue").textContent = displayType(result.main_type);
  $("#subTypeValue").textContent = displayType(result.sub_type);
  $("#campValue").textContent = result.camp;
  $("#mainTypeGauge").style.setProperty("--score", `${mainPercent}%`);
  $("#mainTypePercent").textContent = `${mainPercent}%`;
  $("#mainTypePattern").textContent = profile.pattern || `${displayType(result.main_type)}倾向明显`;
  $("#mainTypeRiskText").textContent = result.current_trading_risk || "先看见惯性，再训练动作。";
  $("#lossSceneValue").textContent = result.easiest_loss_scene || "-";
  $("#trainingAbilityValue").textContent = result.training_ability || "-";
  $("#yangmingReminderValue").textContent = result.yangming_reminder || "-";
  renderTopRiskList(result);
  renderTrainingForecast(result);
  renderTrainingLoop(result);
  renderRetestReportCard(result);
  $("#reportBox").textContent = normalizeDisplayText(state.report);
  $("#payloadPreview").textContent = JSON.stringify(buildPayload(), null, 2);
  renderGrowthLoop();

  $("#scoreBoard").innerHTML = allTypes
    .map((type) => {
      const percent = result.score_percentages[type] || 0;
      const level = getScoreLevel(percent, type);
      const rowClass = type === "平衡型" ? "balance" : percent >= 78 ? "critical" : percent >= 62 ? "high" : "";
      return `
        <div class="score-row ${rowClass}">
          <span>${displayType(type)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
          <strong>${percent}%<em>${escapeHtml(level)}</em></strong>
        </div>
      `;
    })
    .join("");
}

function getScoreLevel(percent, type = "") {
  if (type === "平衡型") return percent >= 80 ? "稳定" : percent >= 62 ? "可用" : "待稳";
  if (percent >= 78) return "优先";
  if (percent >= 62) return "重点";
  if (percent >= 46) return "明显";
  return "轻微";
}

function renderTrainingLoop(result) {
  const quota = getKlineQuota();
  const practiceCount = Number(state.klineStats?.practice_count || 0);
  const completionPercent = Math.min(100, Math.round((practiceCount / 21) * 100));
  const trend = buildAssessmentTrend(result);
  const mainType = result.main_type || "平衡型";
  const latest = trend[trend.length - 1];
  const previous = trend.length > 1 ? trend[trend.length - 2] : null;
  const currentScore = Number(latest?.score || result.score_percentages?.[mainType] || 0);
  const previousScore = previous ? Number(previous.score || 0) : null;
  const delta = previousScore === null ? null : currentScore - previousScore;

  $("#loopProgressBadge").textContent = `${completionPercent}%`;
  $("#loopPracticeCount").textContent = `${practiceCount} 局`;
  $("#loopTodayQuota").textContent = `${quota.used} / ${quota.limit}`;
  $("#loopRetestDelta").textContent = delta === null
    ? "待复测"
    : `${delta > 0 ? "上升" : delta < 0 ? "下降" : "持平"} ${Math.abs(delta)}%`;
  $("#loopTrendTitle").textContent = `${displayType(mainType)}趋势`;
  $("#loopTrendHint").textContent = trend.length > 1
    ? "分数越低，代表这个风险惯性越弱。"
    : "完成第二次测评后，这里会显示训练前后变化。";
  $("#loopTrendChart").innerHTML = renderTrendChart(trend, mainType);
}

function renderRetestReportCard(result) {
  const report = state.retestReport || buildRetestReport(result);
  state.retestReport = report;
  $("#retestReportTitle").textContent = report.title;
  $("#retestReportBadge").textContent = report.badge;
  $("#retestReportSummary").textContent = report.text;
  $("#retestImprovedCount").textContent = String(report.improved_count);
  $("#retestWorsenedCount").textContent = String(report.worsened_count);
  $("#retestTrainingMatch").textContent = report.training_match;
  $("#retestNextAction").textContent = report.next_action;
  $("#retestDimensionList").innerHTML = report.dimensions.map(renderRetestDimensionRow).join("");
}

function renderRetestDimensionRow(item) {
  const beforeValue = item.before === null ? item.current : item.before;
  const deltaText = item.delta === null
    ? "基准"
    : `${item.delta > 0 ? "上升" : item.delta < 0 ? "下降" : "持平"} ${Math.abs(item.delta)}%`;
  return `
    <div class="retest-dimension-row ${escapeHtml(item.status)}">
      <div class="retest-dimension-name">
        <span>${escapeHtml(item.focus)}</span>
        <strong>${escapeHtml(displayType(item.type))}</strong>
      </div>
      <div class="retest-dimension-bars">
        <div class="retest-bar-line">
          <span>${item.before === null ? "目标" : "上次"}</span>
          <div class="retest-bar-track"><i style="--bar:${Math.max(4, beforeValue)}%"></i></div>
          <strong>${beforeValue}%</strong>
        </div>
        <div class="retest-bar-line current">
          <span>本次</span>
          <div class="retest-bar-track"><i style="--bar:${Math.max(4, item.current)}%"></i></div>
          <strong>${item.current}%</strong>
        </div>
      </div>
      <div class="retest-delta">${escapeHtml(deltaText)}</div>
    </div>
  `;
}

function buildRetestReport(result) {
  if (!result?.score_percentages) {
    return {
      title: "建立本次基准",
      badge: "待测评",
      text: "先完成本次测评，系统会记录冲动、扛单、焦虑、从众等关键风险维度。",
      improved_count: 0,
      worsened_count: 0,
      training_match: "待验证",
      next_action: "先完成测评，再进入每日训练。",
      previous: null,
      dimensions: [],
      summary: { title: "7天后查看", text: "先完成本次测评，建立你的第一份交易人格基准。" }
    };
  }

  const previous = findPreviousRetestRecord(result);
  const dimensions = getRetestDimensionTypes(result).map((type) => buildRetestDimension(result, previous, type));
  const improved = dimensions.filter((item) => item.status === "improved");
  const worsened = dimensions.filter((item) => item.status === "worsened");
  const stable = dimensions.filter((item) => item.status === "stable");
  const practiceCount = Number(state.klineStats?.practice_count || 0);
  const primaryTraining = getPersonaTrainingProfile(result);
  const mainDimension = dimensions.find((item) => item.type === result.main_type) || dimensions[0];

  if (!previous) {
    const text = "本次已记录为复测基准。连续训练7天后，再看冲动、扛单、焦虑、从众这些分数有没有下降。";
    return {
      title: "已建立本次基准",
      badge: "基准",
      text,
      improved_count: 0,
      worsened_count: 0,
      training_match: "待验证",
      next_action: `接下来先完成每日三局，优先练「${primaryTraining.stage_name || result.training_ability || "关键动作"}」。`,
      previous: null,
      dimensions,
      summary: { title: "已建立基准", text }
    };
  }

  const title = buildRetestReportTitle({ improved, worsened, stable, mainDimension });
  const text = buildRetestReportText({ improved, worsened, stable, result, practiceCount });
  const trainingMatch = getRetestTrainingMatch({ improved, worsened, practiceCount });
  const nextAction = buildRetestNextAction({ improved, worsened, result, primaryTraining });
  const badge = worsened.length > improved.length
    ? "需回炉"
    : improved.length > 0
      ? "有改善"
      : "待突破";

  return {
    title,
    badge,
    text,
    improved_count: improved.length,
    worsened_count: worsened.length,
    stable_count: stable.length,
    training_match: trainingMatch,
    next_action: nextAction,
    previous,
    dimensions,
    summary: { title, text }
  };
}

function buildRetestDimension(result, previous, type) {
  const current = Number(result.score_percentages?.[type] || 0);
  if (!previous) {
    const targetDrop = clamp(Math.round(current * 0.12), 3, 12);
    return {
      type,
      focus: getRetestDimensionFocus(type),
      before: Math.max(25, current - targetDrop),
      current,
      delta: null,
      status: "baseline"
    };
  }

  const before = Number(previous.score_percentages?.[type] || 0);
  const delta = current - before;
  const status = delta <= -3 ? "improved" : delta >= 3 ? "worsened" : "stable";
  return {
    type,
    focus: getRetestDimensionFocus(type),
    before,
    current,
    delta,
    status
  };
}

function getRetestDimensionTypes(result) {
  const rankedTypes = (result.risk_ranking || []).map((item) => item.type).filter(Boolean);
  return [...new Set([
    ...retestCoreTypes,
    result.main_type,
    result.sub_type,
    ...rankedTypes
  ])]
    .filter((type) => riskTypes.includes(type))
    .slice(0, 6);
}

function getRetestDimensionFocus(type) {
  const focusMap = {
    冲动型: "追涨冲动",
    扛单型: "止损执行",
    完美主义型: "行动闭环",
    偏执型: "反证能力",
    焦虑型: "持仓定力",
    从众型: "独立判断",
    赌徒型: "仓位纪律",
    拖延型: "触发执行"
  };
  return focusMap[type] || "关键惯性";
}

function buildRetestReportTitle({ improved, worsened, mainDimension }) {
  if (worsened.length > improved.length) {
    return `${displayType(worsened[0].type)}反弹 ${Math.abs(worsened[0].delta)}%`;
  }
  if (improved.length) {
    return `${displayType(improved[0].type)}下降 ${Math.abs(improved[0].delta)}%`;
  }
  return `${displayType(mainDimension?.type || "主人格")}基本持平`;
}

function buildRetestReportText({ improved, worsened, stable, result, practiceCount }) {
  if (worsened.length > improved.length) {
    const names = worsened.slice(0, 2).map((item) => displayType(item.type)).join("、");
    return `${names}出现反弹。先不用自责，这说明训练还没有压住真实场景里的旧惯性，接下来7天减少动作，重点练「${getPersonaTrainingProfile(result).focus}」。`;
  }
  if (improved.length) {
    const names = improved.slice(0, 3).map((item) => displayType(item.type)).join("、");
    return `${names}已经下降。${practiceCount >= 7 ? "训练完成度和变化开始匹配，继续把动作稳定下来。" : "如果训练局数还不够，先别急着下结论，继续完成每日三局。"}`;
  }
  if (stable.length) {
    return "主要风险维度暂时持平。持平不是没用，说明本轮训练先守住了不恶化，下一步要把训练动作做得更具体。";
  }
  return "复测变化还不明显。先完成7天连续训练，再看关键风险维度。";
}

function getRetestTrainingMatch({ improved, worsened, practiceCount }) {
  if (practiceCount < 7) return "样本不足";
  if (improved.length > worsened.length) return "基本匹配";
  if (worsened.length > improved.length) return "未匹配";
  return "继续观察";
}

function buildRetestNextAction({ improved, worsened, result, primaryTraining }) {
  if (worsened.length) {
    return `下一步：先练「${primaryTraining.stage_name || result.training_ability}」，尤其盯住${displayType(worsened[0].type)}。`;
  }
  if (improved.length) {
    return `下一步：保持每日三局，把${displayType(improved[0].type)}下降的动作固定成交易前检查。`;
  }
  return `下一步：继续7天训练，重点观察「${result.easiest_loss_scene || primaryTraining.focus}」。`;
}

function findPreviousRetestRecord(result) {
  return getRetestHistoryRecords()
    .filter((record) => !isCurrentRetestRecord(record, result))
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] || null;
}

function getRetestHistoryRecords() {
  const records = [];
  const pushRecord = (record = {}, source = "history") => {
    const scoreResult = record.score_result || record;
    if (!scoreResult?.score_percentages) return;
    records.push({
      assessment_id: record.assessment_id || scoreResult.assessment_id || "",
      created_at: scoreResult.created_at || record.submitted_at || record.created_at || record.started_at || "",
      main_type: scoreResult.main_type || record.main_type || "",
      sub_type: scoreResult.sub_type || record.sub_type || "",
      score_percentages: scoreResult.score_percentages,
      fingerprint: record.fingerprint || buildScoreFingerprint(scoreResult.score_percentages),
      source
    });
  };

  (state.assessmentHistory || []).forEach((item) => pushRecord(item, "server"));
  loadAssessmentBaselines().forEach((item) => pushRecord(item, "local"));
  return records;
}

function isCurrentRetestRecord(record, result) {
  if (!record || !result?.score_percentages) return false;
  if (state.assessmentId && record.assessment_id && record.assessment_id === state.assessmentId) return true;
  const sameFingerprint = record.fingerprint === buildScoreFingerprint(result.score_percentages);
  const createdAt = new Date(record.created_at || 0).getTime();
  const isRecent = Number.isFinite(createdAt) && Date.now() - createdAt < 5 * 60 * 1000;
  return sameFingerprint && isRecent;
}

function buildScoreFingerprint(scorePercentages = {}) {
  return allTypes.map((type) => `${type}:${Number(scorePercentages[type] || 0)}`).join("|");
}

function buildAssessmentTrend(result) {
  const currentMainType = result.main_type || "平衡型";
  const records = [];
  const pushRecord = (record = {}, fallbackDate = "") => {
    const scoreResult = record.score_result || record;
    const percentages = scoreResult.score_percentages || {};
    const score = Number(percentages[currentMainType] ?? percentages[scoreResult.main_type] ?? 0);
    if (!score) return;
    records.push({
      id: record.assessment_id || record.created_at || fallbackDate || `${records.length}`,
      created_at: scoreResult.created_at || record.submitted_at || record.created_at || fallbackDate || new Date().toISOString(),
      main_type: scoreResult.main_type || currentMainType,
      score
    });
  };

  [...(state.assessmentHistory || [])].reverse().forEach((item) => {
    if (!isCurrentRetestRecord({
      assessment_id: item.assessment_id,
      created_at: item.submitted_at || item.started_at || "",
      score_percentages: item.score_result?.score_percentages,
      fingerprint: item.score_result?.score_percentages ? buildScoreFingerprint(item.score_result.score_percentages) : ""
    }, result)) {
      pushRecord(item, item.submitted_at || item.started_at || "");
    }
  });
  loadAssessmentBaselines().forEach((item) => {
    if (!isCurrentRetestRecord(item, result)) pushRecord(item, item.created_at);
  });
  pushRecord({
    assessment_id: state.assessmentId || "current",
    submitted_at: new Date().toISOString(),
    score_result: result
  });

  const deduped = [];
  const seen = new Set();
  records
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((item) => {
      const key = `${item.id}:${item.score}`;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });
  return deduped.slice(-6);
}

function renderTrendChart(trend, mainType) {
  if (!trend.length) {
    return `<div class="loop-trend-empty">完成测评后生成趋势。</div>`;
  }
  const max = Math.max(...trend.map((item) => item.score), 100);
  return trend
    .map((item, index) => {
      const height = Math.max(12, Math.round((item.score / max) * 100));
      const label = index === trend.length - 1 ? "本次" : `第${index + 1}次`;
      const tone = index === trend.length - 1 ? "current" : "";
      return `
        <div class="loop-trend-bar ${tone}">
          <div class="loop-trend-track"><i style="height:${height}%"></i></div>
          <strong>${Number(item.score)}%</strong>
          <span>${escapeHtml(label)}</span>
        </div>
      `;
    })
    .join("");
}

function renderTopRiskList(result) {
  const topItems = (result.risk_ranking || [])
    .filter((item) => item.type && item.type !== "平衡型")
    .slice(0, 3);
  $("#topRiskList").innerHTML = topItems
    .map((item, index) => {
      const percent = Number(item.percent || 0);
      const tone = index === 0 ? "primary" : "";
      return `
        <div class="top-risk-item ${tone}">
          <div>
            <span>0${index + 1}</span>
            <strong>${escapeHtml(displayType(item.type))}</strong>
          </div>
          <em>${percent}%</em>
          <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
        </div>
      `;
    })
    .join("");
}

function renderTrainingForecast(result) {
  const forecast = buildTrainingForecast(result);
  $("#forecastTitle").textContent = forecast.title;
  $("#forecastTarget").textContent = forecast.target;
  $("#forecastPrimaryEffect").textContent = forecast.primaryEffect;
  $("#forecastMetric").textContent = forecast.metric;
  $("#forecastRetestGoal").textContent = forecast.retestGoal;
  $("#forecastTimeline").innerHTML = forecast.timeline
    .map((item) => `
      <div class="forecast-step">
        <span>${escapeHtml(item.day)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.text)}</p>
      </div>
    `)
    .join("");
}

function buildTrainingForecast(result) {
  const training = getPersonaTrainingProfile(result);
  const mainType = result.main_type || "平衡型";
  const mainPercent = Number(result.score_percentages?.[mainType] || 0);
  const riskDrop7 = clamp(Math.round(mainPercent * 0.08), 3, 8);
  const riskDrop21 = clamp(Math.round(mainPercent * 0.18), 8, 18);
  const focus = training.focus || result.training_ability || "关键动作";
  const scene = result.easiest_loss_scene || profiles[mainType]?.scene || "高频亏损场景";
  const targetPercent = Math.max(35, mainPercent - riskDrop21);
  const forecasts = {
    冲动型: {
      primaryEffect: `追涨冲动预计下降 ${riskDrop7}-${riskDrop21} 个点`,
      metric: "急拉时能先等一根K线，再写失效条件",
      retestGoal: `冲动倾向压到 ${targetPercent}% 左右`
    },
    扛单型: {
      primaryEffect: `扛单倾向预计下降 ${riskDrop7}-${riskDrop21} 个点`,
      metric: "破位后先执行减仓或止损，不再临盘找理由",
      retestGoal: `扛单分数压到 ${targetPercent}% 左右`
    },
    完美主义型: {
      primaryEffect: `过度等待预计下降 ${riskDrop7}-${riskDrop21} 个点`,
      metric: "满足核心条件后能小仓试错，并提前写退出条件",
      retestGoal: `完美型倾向压到 ${targetPercent}% 左右`
    },
    偏执型: {
      primaryEffect: `单边确认偏误预计下降 ${riskDrop7}-${riskDrop21} 个点`,
      metric: "每次开仓前至少写一条反证，错了能退出",
      retestGoal: `偏执倾向压到 ${targetPercent}% 左右`
    },
    焦虑型: {
      primaryEffect: `持仓焦虑预计下降 ${riskDrop7}-${riskDrop21} 个点`,
      metric: "不被一根K线吓走，只看计划是否失效",
      retestGoal: `焦虑倾向压到 ${targetPercent}% 左右`
    },
    从众型: {
      primaryEffect: `消息依赖预计下降 ${riskDrop7}-${riskDrop21} 个点`,
      metric: "外部观点出现后，先空一根K线再看盘面",
      retestGoal: `从众倾向压到 ${targetPercent}% 左右`
    },
    赌徒型: {
      primaryEffect: `重仓冲动预计下降 ${riskDrop7}-${riskDrop21} 个点`,
      metric: "单次动作只用计划仓位，连续失误后停手",
      retestGoal: `赌徒倾向压到 ${targetPercent}% 左右`
    },
    拖延型: {
      primaryEffect: `执行拖延预计下降 ${riskDrop7}-${riskDrop21} 个点`,
      metric: "条件触发后只执行一个动作，不临盘重写规则",
      retestGoal: `拖延倾向压到 ${targetPercent}% 左右`
    },
    平衡型: {
      primaryEffect: "减少无效动作，维持稳定交易节奏",
      metric: "每天记录一次规则偏离，保持复盘连续性",
      retestGoal: "稳定分维持在 80% 以上"
    }
  };
  const selected = forecasts[mainType] || forecasts["平衡型"];
  return {
    title: `${training.stage_name || "专属训练"}：${focus}`,
    target: mainType === "平衡型" ? "稳定 21 天" : "先练 7 天",
    primaryEffect: selected.primaryEffect,
    metric: selected.metric,
    retestGoal: selected.retestGoal,
    timeline: [
      {
        day: "第1-3天",
        title: "先止住最容易亏钱的一念",
        text: `围绕「${scene}」做每日三局，不追求做对，只记录触发点。`
      },
      {
        day: "第4-7天",
        title: "把动作固定下来",
        text: `重复训练「${focus}」，做到先写条件、再做动作、最后复盘。`
      },
      {
        day: "第8-21天",
        title: "复测验证变化",
        text: "看主人格分数是否下降，训练完成度是否提升，是否少犯同一种错误。"
      }
    ]
  };
}

function renderGrowthLoop() {
  const result = state.result;
  const inviteCode = state.influence?.personal_invite_code || state.auth?.personalInviteCode || "登录后生成";
  const training = getPersonaTrainingProfile(result);
  const quota = getKlineQuota();
  const comparison = state.retestComparison || buildRetestComparison(result);
  $("#resultInviteCode").textContent = inviteCode;
  $("#loopSelfText").textContent = `你本次主人格为「${displayType(result.main_type)}」，最该训练「${result.training_ability}」。`;
  $("#personaTrainingTitle").textContent = training.title;
  $("#personaTrainingText").textContent = training.text;
  $("#dailyTrainingTitle").textContent = `${quota.used} / ${quota.limit}`;
  $("#dailyTrainingText").textContent = quota.remaining > 0
    ? `今天还剩 ${quota.remaining} 局训练。建议先完成一局「${training.stage_name}」。`
    : "今日三局已完成，明天继续事上练。";
  $("#retestChangeTitle").textContent = comparison.title;
  $("#retestChangeText").textContent = comparison.text;
  $("#startResultTrainingBtn").textContent = `开始${training.stage_name}`;
  $("#sharePreview").textContent = buildShareCardText();
  renderAssistantHandoff(result);
}

function renderAssistantHandoff(result) {
  const handoff = buildAssistantHandoff(result);
  $("#handoffPriority").textContent = handoff.priority;
  $("#handoffConversion").textContent = handoff.conversion;
  $("#handoffFocus").textContent = handoff.focus;
  $("#handoffAction").textContent = handoff.action;
  $("#handoffScript").textContent = handoff.script;
}

function buildAssistantHandoff(result = state.result) {
  const risk = result?.risk_level || "";
  const training = getPersonaTrainingProfile(result);
  const highRisk = /高风险|中高风险/.test(risk);
  const mediumRisk = /中等风险/.test(risk);
  const phone = state.auth?.method === "phone" ? state.auth.contact : "";
  const priority = highRisk ? "高优先承接" : mediumRisk ? "训练营跟进" : "自训练观察";
  const conversion = highRisk
    ? "建议助教主动跟进 / 训练营优先承接"
    : mediumRisk
      ? "建议邀约7天训练营"
      : "建议自训练 + 7天复测";
  const focus = `${displayType(result?.main_type)}｜${result?.training_ability || training.focus}`;
  const action = highRisk
    ? `当天引导进入「${result?.camp || training.stage_name}」，先完成一局${training.stage_name}`
    : mediumRisk
      ? `邀请完成7天${training.stage_name}，第7天提醒复测`
      : "发送自训练入口，提醒完成每日三局和7天复测";
  const script = `你这次最明显的是「${displayType(result?.main_type)}」，不是技术不够，而是「${result?.easiest_loss_scene || "固定亏损场景"}」里容易重复同一种动作。接下来先不急着学更多方法，先按「${training.stage_name}」练7天，练完我们再看复测变化。`;
  return {
    priority,
    conversion,
    focus,
    action,
    script,
    phone: phone || state.auth?.contact || "",
    training
  };
}

async function copyAssistantSummary() {
  if (!state.result) {
    showToast("请先完成测评。");
    return;
  }
  await navigator.clipboard.writeText(buildAssistantSummaryText());
  showToast("助教承接摘要已复制。");
}

function buildAssistantSummaryText() {
  const result = state.result;
  const handoff = buildAssistantHandoff(result);
  const quota = getKlineQuota();
  const retestReport = state.retestReport || buildRetestReport(result);
  const dimensionText = retestReport.dimensions.length
    ? retestReport.dimensions.map((item) => {
        const delta = item.delta === null ? "基准" : `${item.delta > 0 ? "上升" : item.delta < 0 ? "下降" : "持平"}${Math.abs(item.delta)}%`;
        return `${displayType(item.type)} ${item.before === null ? "-" : `${item.before}% -> `}${item.current}%（${delta}）`;
      }).join("；")
    : "待复测";
  return `【助教承接摘要】
学员：${state.auth?.displayName || result.nickname || "学员"}
手机号/联系方式：${handoff.phone || "-"}
主人格：${displayType(result.main_type)}
副人格：${displayType(result.sub_type)}
风险等级：${result.risk_level}
推荐训练营：${result.camp}
承接优先级：${handoff.priority}
商业承接：${handoff.conversion}
训练重点：${handoff.focus}
推荐动作：${handoff.action}
训练完成度：累计${Number(state.klineStats?.practice_count || 0)}局，今日${quota.used}/${quota.limit}
复测变化：${retestReport.summary.title}｜${retestReport.summary.text}
维度对比：${dimensionText}
训练匹配：${retestReport.training_match}
下一步：${retestReport.next_action}
话术建议：${handoff.script}`;
}

async function copyShareCardText() {
  if (!state.result) {
    showToast("请先完成测评。");
    return;
  }
  await navigator.clipboard.writeText(buildShareCardText());
  showToast("分享文案已复制。");
}

function buildShareCardText() {
  if (!state.result) return "我正在体验九种交易人格测评，一起照见交易中的自己。";
  const inviteCode = state.influence?.personal_invite_code || state.auth?.personalInviteCode || "";
  const inviteUrl = buildInviteUrl(inviteCode);
  const training = getPersonaTrainingProfile(state.result);
  return `我刚完成了「九种交易人格 AI 测评」
主人格：${displayType(state.result.main_type)}
副人格：${displayType(state.result.sub_type)}
我的阳明提醒：${state.result.yangming_reminder}
今日专属训练：${training.stage_name}

这个测评不荐股、不预测行情，只帮助股民看见自己的交易惯性。
一起做一次问心测评，看看你最容易在哪个场景亏钱。
${inviteCode ? `我的传习码：${inviteCode}` : ""}
${inviteUrl}`;
}

function buildInviteUrl(inviteCode = "") {
  const url = new URL(window.location.href);
  url.searchParams.delete("api");
  url.searchParams.delete("backend");
  if (inviteCode) url.searchParams.set("invite", inviteCode);
  return url.toString();
}

function getPersonaTrainingProfile(result = state.result) {
  if (!result) return personalityTrainingMap["平衡型"];
  return personalityTrainingMap[result.main_type] || personalityTrainingMap["平衡型"];
}

function getKlineQuota() {
  const quota = state.klineLevel?.daily_quota || state.klineStats?.daily_quota || {};
  const limit = Number(quota.limit || 3);
  const used = Math.min(Number(quota.used || 0), limit);
  return {
    limit,
    used,
    remaining: Math.max(limit - used, 0)
  };
}

async function prepareResultTraining() {
  if (!state.result) {
    showToast("请先完成测评，再进入专属训练。");
    return;
  }

  const training = getPersonaTrainingProfile(state.result);
  const personaStage = getPersonalityStageByType(state.result.main_type);
  const stage = personaStage ? personalityStageToStage(personaStage) : {
    id: training.stage_id,
    name: training.stage_name,
    focus: training.focus,
    personality_type: state.result.main_type,
    required_streak_days: 0,
    locked: false
  };
  const stages = state.klineLevel?.stages?.length ? [...state.klineLevel.stages] : [];
  const stageIndex = stages.findIndex((item) => item.id === stage.id);
  if (stageIndex >= 0) {
    stages[stageIndex] = { ...stages[stageIndex], ...stage, locked: false };
  } else {
    stages.unshift(stage);
  }
  state.klineLevel = {
    ...state.klineLevel,
    stages,
    unlocked_stages: stages.filter((item) => !item.locked),
    active_stage: stage
  };
  state.klinePersonaId = personaStage?.id || "";
  state.klineSceneCardId = "";
  state.nextKlineScenario = null;
  await loadNextKlineScenario();
  showToast(`已进入「${training.stage_name}」，今天先练一局。`);
}

function loadAssessmentBaselines() {
  try {
    return JSON.parse(localStorage.getItem("tradingPersonality.assessmentBaselines") || "[]");
  } catch {
    return [];
  }
}

function saveAssessmentBaseline(result) {
  if (!result?.score_percentages) return;
  const records = loadAssessmentBaselines();
  records.push({
    assessment_id: state.assessmentId || "",
    created_at: new Date().toISOString(),
    main_type: result.main_type,
    sub_type: result.sub_type,
    score_percentages: result.score_percentages,
    fingerprint: buildScoreFingerprint(result.score_percentages)
  });
  localStorage.setItem("tradingPersonality.assessmentBaselines", JSON.stringify(records.slice(-8)));
}

function buildRetestComparison(result) {
  return buildRetestReport(result).summary;
}

function buildPayload() {
  const reportUrl = state.serverReport?.id
    ? `${window.location.origin}${window.location.pathname}?report=${encodeURIComponent(state.serverReport.id)}`
    : "";
  const handoff = state.result ? buildAssistantHandoff(state.result) : null;
  const quota = getKlineQuota();
  const retestReport = state.result ? state.retestReport || buildRetestReport(state.result) : null;
  const retest = retestReport?.summary || null;
  return {
    assessment_id: state.assessmentId || null,
    scoring_mode: state.assessmentId && state.config.useBackend ? "server" : "local",
    user: state.auth
      ? {
          id: state.auth.id,
          serverId: state.auth.serverId || state.auth.id,
          displayName: state.auth.displayName,
          method: state.auth.method,
          contact: state.auth.contact || "",
          phone: state.auth.method === "phone" ? state.auth.contact || "" : "",
          wechatBound: Boolean(state.auth.wechatBound),
          personalInviteCode: state.auth.personalInviteCode || "",
          tokenExpiresAt: state.auth.tokenExpiresAt || ""
        }
      : null,
    user_id: state.auth?.serverId || state.auth?.id || null,
    phone: state.auth?.method === "phone" ? state.auth.contact || "" : "",
    contact: state.auth?.contact || "",
    invite_code: state.auth?.personalInviteCode || "",
    nickname: $("#nicknameInput").value.trim() || "测试用户",
    test_version: String(state.selectedVersion),
    channel: getSourceChannel(),
    submitted_at: new Date().toISOString(),
    report_url: reportUrl,
    report_summary: summarizeReportForPayload(state.report),
    assistant_handoff: handoff
      ? {
          priority: handoff.priority,
          conversion: handoff.conversion,
          focus: handoff.focus,
          action: handoff.action,
          script: handoff.script
        }
      : null,
    assistant_script: handoff?.script || "",
    training_progress: {
      practice_count: Number(state.klineStats?.practice_count || 0),
      today_used: quota.used,
      today_limit: quota.limit,
      today_remaining: quota.remaining,
      total_points: Number(state.klineStats?.total_points || 0),
      best_score: Number(state.klineStats?.best_score || 0)
    },
    retest_change: {
      summary: retest ? `${retest.title}：${retest.text}` : "",
      title: retest?.title || "",
      text: retest?.text || "",
      improved_count: retestReport?.improved_count || 0,
      worsened_count: retestReport?.worsened_count || 0,
      training_match: retestReport?.training_match || "",
      next_action: retestReport?.next_action || "",
      dimensions: (retestReport?.dimensions || []).map((item) => ({
        type: item.type,
        focus: item.focus,
        before: item.before,
        current: item.current,
        delta: item.delta,
        status: item.status
      }))
    },
    answers: state.questions.map((question) => ({
      question_id: question.question_id,
      personality_type: question.personality_type,
      sub_dimension: question.sub_dimension,
      score: Number(state.answers[question.question_id]),
      weight: Number(question.weight || 1)
    })),
    score_result: state.result,
    local_score_result: state.result,
    server_report: state.serverReport
  };
}

function summarizeReportForPayload(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

async function runDemo() {
  await startAssessment(true);
  showToast("已生成一份样例报告。");
}

function selectVersion(version) {
  state.selectedVersion = Number(version);
  $$(".version-btn").forEach((item) => item.classList.toggle("selected", Number(item.dataset.version) === state.selectedVersion));
}

function restart() {
  state.assessmentId = "";
  state.questions = [];
  state.answers = {};
  state.currentIndex = 0;
  state.result = null;
  state.report = "";
  state.serverReport = null;
  updateStep("setup");
  setText("#sessionStatus", "未开始");
  $("#payloadPreview").textContent = "{}";
}

async function copyReport() {
  if (!state.report) return;
  await navigator.clipboard.writeText(state.report);
  showToast("报告已复制。");
}

function exportJson() {
  if (!state.result) {
    showToast("还没有生成结果。");
    return;
  }
  const blob = new Blob([JSON.stringify(buildPayload(), null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `交易人格测评_${state.result.nickname}_${state.result.test_version}题.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function saveConfig() {
  syncConfigFromInputs();
  localStorage.setItem("tradingPersonality.apiBaseUrl", state.config.apiBaseUrl);
  localStorage.setItem("tradingPersonality.useBackend", String(state.config.useBackend));
  localStorage.setItem("tradingPersonality.cozeUrl", state.config.cozeUrl);
  localStorage.setItem("tradingPersonality.feishuUrl", state.config.feishuUrl);
  showToast("接口配置已保存到本机浏览器。");
  refreshBackendStats();
}

async function callCoze() {
  if (!state.result) {
    showToast("请先完成测评。");
    return;
  }
  const url = $("#cozeUrlInput").value.trim();
  if (!url) {
    showToast("请先填写 Coze 工作流 B 地址。");
    return;
  }

  saveConfig();
  $("#callCozeBtn").disabled = true;
  $("#callCozeBtn").textContent = "调用中";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: JSON.stringify(buildPayload()) })
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    const remoteReport = data?.report || data?.output || data?.data?.report || data?.data?.output || text;
    state.report = typeof remoteReport === "string" ? remoteReport : JSON.stringify(remoteReport, null, 2);
    $("#reportBox").textContent = state.report;
    showToast("Coze 报告已返回。");
  } catch (error) {
    console.error(error);
    showToast("浏览器直连 Coze 失败，常见原因是接口鉴权或 CORS。可先使用本地报告。");
  } finally {
    $("#callCozeBtn").disabled = false;
    $("#callCozeBtn").textContent = "调用Coze报告";
  }
}

async function autoSyncFeishuLead() {
  if (!state.config.useBackend || !state.config.apiBaseUrl || !state.result) return;

  try {
    await apiFetch("/api/v1/integrations/feishu/report", {
      method: "POST",
      body: JSON.stringify({
        ...buildPayload(),
        webhook_url: state.config.feishuUrl || ""
      })
    });
    showToast("测评线索已同步到飞书。");
  } catch (error) {
    console.warn("飞书自动同步未完成，已保留后端报告。", error);
  }
}

async function sendFeishu() {
  if (!state.result) {
    showToast("请先完成测评。");
    return;
  }
  const url = $("#feishuUrlInput").value.trim();

  saveConfig();
  $("#sendFeishuBtn").disabled = true;
  $("#sendFeishuBtn").textContent = "发送中";
  try {
    if (state.config.useBackend && state.config.apiBaseUrl) {
      const data = await apiFetch("/api/v1/integrations/feishu/report", {
        method: "POST",
        body: JSON.stringify({
          ...buildPayload(),
          webhook_url: url
        })
      });
      showToast(data.sent ? "已由后端同步到飞书。" : "飞书同步已完成预检。");
      return;
    }

    if (!url) {
      showToast("请先填写飞书 Webhook 地址。");
      return;
    }

    const text = `【交易人格测评】${state.result.nickname}
主人格：${state.result.main_type}
副人格：${state.result.sub_type}
风险：${state.result.risk_level}
训练营：${state.result.camp}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg_type: "text", content: { text } })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    showToast("已发送到飞书。");
  } catch (error) {
    console.error(error);
    showToast("飞书发送失败，可能需要服务端中转或检查 Webhook 权限。");
  } finally {
    $("#sendFeishuBtn").disabled = false;
    $("#sendFeishuBtn").textContent = "发送飞书";
  }
}

function getFriendlySmsError(message) {
  const raw = String(message || "");
  if (/余额不足|isv\.BUSINESS_LIMIT_CONTROL|AmountNotEnough/i.test(raw)) {
    return "短信通道暂时不可用，请稍后重试或联系助教处理。";
  }
  if (/频繁|秒后|cooldown|Too Many/i.test(raw)) {
    return raw;
  }
  if (/短信服务发送失败|HTTP 5|Bad Gateway|502/i.test(raw)) {
    return "短信发送失败，请稍后重试或联系助教处理。";
  }
  return raw || "短信服务暂时不可用，请稍后再试。";
}

function loadImpactStats() {
  try {
    return JSON.parse(localStorage.getItem("tradingPersonality.impactStats") || "{}");
  } catch {
    return {};
  }
}

function loadLocalHabit() {
  try {
    return buildLocalHabitFromDates(JSON.parse(localStorage.getItem("tradingPersonality.checkinDates") || "[]"));
  } catch {
    return buildLocalHabitFromDates([]);
  }
}

function saveLocalHabit(habit) {
  localStorage.setItem("tradingPersonality.checkinDates", JSON.stringify(habit.local_dates || []));
}

function loadLocalKlineStats() {
  const fallback = {
    total_points: 0,
    best_score: 0,
    practice_count: 0,
    daily_quota: { limit: 3, used: 0, remaining: 3, practiced_today: 0 },
    local_daily_counts: {}
  };
  try {
    const saved = JSON.parse(localStorage.getItem("tradingPersonality.klineStats") || "{}");
    const todayCount = Number(saved.local_daily_counts?.[getDateKey(new Date())] || 0);
    return {
      ...fallback,
      ...saved,
      daily_quota: {
        limit: 3,
        used: Math.min(todayCount, 3),
        remaining: Math.max(3 - todayCount, 0),
        practiced_today: todayCount
      }
    };
  } catch {
    return fallback;
  }
}

function saveLocalKlineStats() {
  localStorage.setItem("tradingPersonality.klineStats", JSON.stringify(state.klineStats));
}

function recordLocalKlineCompletion(score) {
  const today = getDateKey(new Date());
  const counts = { ...(state.klineStats.local_daily_counts || {}) };
  counts[today] = Number(counts[today] || 0) + 1;
  state.klineStats = {
    ...state.klineStats,
    total_points: Number(state.klineStats.total_points || 0) + score,
    best_score: Math.max(Number(state.klineStats.best_score || 0), score),
    practice_count: Number(state.klineStats.practice_count || 0) + 1,
    local_daily_counts: counts,
    daily_quota: {
      limit: 3,
      used: Math.min(counts[today], 3),
      remaining: Math.max(3 - counts[today], 0),
      practiced_today: counts[today]
    }
  };
  saveLocalKlineStats();
}

function buildLocalHabitFromDates(dates) {
  const uniqueDates = [...new Set(dates)].sort();
  const weekly = getRecentLocalWeek().map((item) => ({
    ...item,
    checked: uniqueDates.includes(item.date_key)
  }));
  const checkedToday = uniqueDates.includes(getDateKey(new Date()));
  return {
    checked_today: checkedToday,
    total_days: uniqueDates.length,
    streak_days: countLocalStreak(uniqueDates),
    practice_points: uniqueDates.length * 10,
    weekly_checkins: weekly,
    local_dates: uniqueDates
  };
}

function getRecentLocalWeek() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      date_key: getDateKey(date),
      checked: false
    };
  });
}

function countLocalStreak(dates) {
  const checked = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  while (checked.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeKlineScenario(scenario) {
  if (!scenario) return buildKlineUnavailableScenario();
  if (scenario.active_stage) {
    syncPersonalityFromStage(scenario.active_stage);
    if (!state.klinePersonaId) syncMindAxisFromStage(scenario.active_stage.id, scenario.active_stage.focus);
    state.klineLevel = {
      ...state.klineLevel,
      active_stage: scenario.active_stage
    };
  }
  state.klineInstrumentKey = scenario.instrument_key || "";
  return {
    ...scenario,
    candles: Array.isArray(scenario.candles) ? scenario.candles : [],
    options: Array.isArray(scenario.options) && scenario.options.length ? scenario.options : null,
    decisions: scenario.decisions || null
  };
}

function getActiveKlineStageId() {
  const persona = getActivePersonalityStage();
  if (persona) return persona.stage_id;
  return getActiveMindAxis()?.stage_id || state.klineLevel?.active_stage?.id || "daily";
}

function getSourceChannel() {
  return $("#channelInput")?.value || bootChannel || "网页MVP";
}

function getCurrentUserId() {
  return state.auth?.serverId || state.auth?.id || "";
}

function saveImpactStats() {
  localStorage.setItem("tradingPersonality.impactStats", JSON.stringify(state.impact));
}

function incrementImpact(patch) {
  Object.keys(patch).forEach((key) => {
    state.impact[key] = Number(state.impact[key] || 0) + Number(patch[key] || 0);
  });
  saveImpactStats();
  renderImpactStats();
}

function getImpactTotals() {
  const localTotals = {
    registrations: impactBase.registrations + Number(state.impact.registrations || 0),
    assessments: impactBase.assessments + Number(state.impact.assessments || 0),
    reports: impactBase.reports + Number(state.impact.reports || 0),
    assistants: impactBase.assistants + Number(state.impact.assistants || 0)
  };
  if (!state.serverImpact) return localTotals;
  return {
    registrations: Math.max(localTotals.registrations, state.serverImpact.registrations),
    assessments: Math.max(localTotals.assessments, state.serverImpact.assessments),
    reports: Math.max(localTotals.reports, state.serverImpact.reports),
    assistants: Math.max(localTotals.assistants, state.serverImpact.assistants)
  };
}

function renderImpactStats() {
  const totals = getImpactTotals();
  const influenced = Math.min(totals.assessments, impactTarget);
  const percent = (influenced / impactTarget) * 100;
  const maxValue = Math.max(totals.registrations, totals.assessments, totals.reports, totals.assistants);
  const chartData = [
    ["注册人数", totals.registrations],
    ["完成测评", totals.assessments],
    ["诊断报告", totals.reports],
    ["助理承接", totals.assistants]
  ];

  $("#impactIndexValue").textContent = `${percent.toFixed(4)}%`;
  $("#impactIndexCount").textContent = `${formatNumber(influenced)} / ${formatNumber(impactTarget)}`;
  $("#impactIndexBar").style.width = `${Math.max(percent, 0.2)}%`;
  $("#impactReports").textContent = formatNumber(totals.reports);
  $("#impactRegistrations").textContent = formatNumber(totals.registrations);
  $("#impactAssessments").textContent = formatNumber(totals.assessments);
  $("#impactAssistants").textContent = formatNumber(totals.assistants);
  $("#impactChart").innerHTML = chartData
    .map(([label, value]) => {
      const width = maxValue ? Math.round((value / maxValue) * 100) : 0;
      return `
        <div class="impact-chart-row">
          <span>${label}</span>
          <div class="impact-chart-track">
            <div class="impact-chart-fill" style="--chart-value:${width}%"></div>
          </div>
          <strong>${formatNumber(value)}</strong>
        </div>
      `;
    })
    .join("");
}

function updateStep(step) {
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${step}View`).classList.add("active");
  $$(".step-item").forEach((button) => {
    const active = button.dataset.stepLink === step;
    button.classList.toggle("active", active);
    button.disabled = button.dataset.stepLink !== "setup" && !state.result && step !== "answer";
  });
  if (step === "result") {
    $$('.step-item[data-step-link="answer"], .step-item[data-step-link="result"]').forEach((button) => {
      button.disabled = false;
    });
  }
}

function rememberQuestionIds() {
  const ids = state.questions.map((item) => item.question_id);
  localStorage.setItem("tradingPersonality.recentQuestionIds", JSON.stringify(ids.slice(-720)));
}

function countBy(items, key) {
  return items.reduce((memo, item) => {
    memo[item[key]] = (memo[item[key]] || 0) + 1;
    return memo;
  }, {});
}

function groupBy(items, key) {
  return items.reduce((memo, item) => {
    const value = item[key] || "未分类";
    if (!memo[value]) memo[value] = [];
    memo[value].push(item);
    return memo;
  }, {});
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Math.round(Number(value) || 0));
}

function getAccessToken() {
  return state.auth?.accessToken || sessionStorage.getItem("tradingPersonality.accessToken") || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function displayType(type = "") {
  return displayTypeNames[type] || type;
}

function normalizeDisplayText(text = "") {
  return String(text || "").replace(/完美主义型/g, "完美型");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}
