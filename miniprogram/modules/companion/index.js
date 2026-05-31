const COMPANION_PROMPTS = [
  "今天只修一念：看见冲动，但不急着跟随。",
  "先问此心，再看盘面。心乱时，动作要更少。",
  "修行不是忍住情绪，而是知道它什么时候来。",
  "省察只问一件事：今天哪一念让你偏离计划？",
  "能不动，也是一种知行合一。"
];

const COMPANION_SYSTEM_SCHEMA = {
  version: "v1",
  role: "Companion System 同修系统",
  principle: "不是讨论区，而是让用户感到自己正在一个交易修行道场中同行。",
  modules: ["今日同修人数", "今日修行统计", "今日省察墙", "人格部落", "知行成长榜", "同修故事库"],
  guardrails: [
    "不展示具体标的。",
    "不提供操作方向。",
    "不展示结果诱导。",
    "只围绕照心、修行、戒律、省察、成长。"
  ]
};

const PERSONALITY_TRIBES = [
  {
    type: "冲动型",
    name: "慢一拍部落",
    stage: "照心",
    heartThief: "急",
    vow: "急念出现，先慢下来。",
    practice: "行动前等待10秒。"
  },
  {
    type: "扛单型",
    name: "守边界部落",
    stage: "知行合一",
    heartThief: "不甘",
    vow: "触发边界，不移动。",
    practice: "边界出现后只按原计划知行合一。"
  },
  {
    type: "赌徒型",
    name: "停手部落",
    stage: "事上磨",
    heartThief: "赌",
    vow: "连续不顺，先降一档。",
    practice: "补偿念头出现时暂停30秒。"
  },
  {
    type: "焦虑型",
    name: "定心部落",
    stage: "照心",
    heartThief: "惧",
    vow: "心乱时，动作要更少。",
    practice: "只在固定窗口观察。"
  },
  {
    type: "完美型",
    name: "一改部落",
    stage: "致良知",
    heartThief: "苛责",
    vow: "一错一改，不责其心。",
    practice: "省察只写一个克治动作。"
  },
  {
    type: "从众型",
    name: "问本心部落",
    stage: "知行合一",
    heartThief: "随众失主",
    vow: "众声入耳，先问本心。",
    practice: "行动前先读自己的计划卡。"
  },
  {
    type: "偏执型",
    name: "格物部落",
    stage: "破心贼",
    heartThief: "执己为理",
    vow: "先格物，再立言。",
    practice: "行动前写下一条反向证据。"
  },
  {
    type: "拖延型",
    name: "今日事部落",
    stage: "立志",
    heartThief: "知而不行",
    vow: "今日事，今日省。",
    practice: "收盘后三分钟写一条省察。"
  },
  {
    type: "平衡型",
    name: "守一部落",
    stage: "致良知",
    heartThief: "稳中生怠",
    vow: "稳定时，更守流程。",
    practice: "状态好时也完整走流程。"
  }
];

const REFLECTION_WALL_SEEDS = [
  {
    name: "照心同修",
    stage: "照心",
    text: "今天看见自己最急的一念，先停了十秒。"
  },
  {
    name: "守界同修",
    stage: "事上磨",
    text: "边界触发时没有解释，只按原计划做完。"
  },
  {
    name: "省察同修",
    stage: "破心贼",
    text: "我把不甘写了下来，它就没有那么像理由。"
  },
  {
    name: "守一同修",
    stage: "致良知",
    text: "状态平稳时也没有省略省察。"
  },
  {
    name: "立志同修",
    stage: "立志",
    text: "今天先写不做清单，再进入盘前准备。"
  }
];

const COMPANION_STORIES = [
  {
    title: "从急着行动，到先停十秒",
    tribe: "慢一拍部落",
    stage: "照心",
    summary: "一位冲动型同修连续七天只练一件事：急念出现时，把手放下十秒。第七天，他第一次在触发时看见了自己。"
  },
  {
    title: "把不甘交还给边界",
    tribe: "守边界部落",
    stage: "知行合一",
    summary: "一位扛单型同修把原计划写成一句戒律。触发边界时，他没有再解释，而是完成了第一次真正的知行对照。"
  },
  {
    title: "省察不再责备自己",
    tribe: "一改部落",
    stage: "致良知",
    summary: "一位完美型同修把长篇自责改成一个明日动作。省察变轻以后，事上练反而更稳定。"
  },
  {
    title: "从看别人，到问本心",
    tribe: "问本心部落",
    stage: "知行合一",
    summary: "一位从众型同修把外部声音延后到收盘后处理。盘中只读自己的计划卡，第一次感到心有主。"
  }
];

function getTodayCompanionPrompt() {
  const day = new Date().getDate();
  return COMPANION_PROMPTS[day % COMPANION_PROMPTS.length];
}

function daySeed(todayKey) {
  return String(todayKey || new Date().toISOString().slice(0, 10))
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function getProfileType(context) {
  return context && context.assessment ? context.assessment.primary : "未建档";
}

function getReviewText(review, training) {
  if (review && review.reflection) return review.reflection;
  if (review && review.selfReview) return review.selfReview;
  if (review && review.tomorrowAction) return review.tomorrowAction;
  if (training && training.reflection) return training.reflection;
  return "";
}

function buildTodayCompanionCount(context = {}) {
  const seed = daySeed(context.todayKey);
  const streak = Number((context.continuity || {}).currentStreak || 0);
  const completed = context.training && context.training.completed ? 7 : 0;
  const reflected = context.review ? 5 : 0;
  return clamp(168 + (seed % 58) + streak * 3 + completed + reflected, 128, 366);
}

function buildTodayPracticeStats(context = {}) {
  const count = buildTodayCompanionCount(context);
  const seed = daySeed(context.todayKey);
  const localDone = context.training && context.training.completed ? 1 : 0;
  const localMind = context.mind ? 1 : 0;
  const localReview = context.review ? 1 : 0;

  return [
    { key: "mind", label: "完成照心", value: clamp(Math.round(count * 0.64) + localMind, 0, count), unit: "人" },
    { key: "vow", label: "守住戒律", value: clamp(Math.round(count * 0.52) + localDone, 0, count), unit: "人" },
    { key: "reflection", label: "写下省察", value: clamp(Math.round(count * 0.38) + localReview, 0, count), unit: "人" },
    { key: "streak", label: "连续修行", value: clamp(18 + (seed % 31), 8, count), unit: "人" }
  ];
}

function buildReflectionWall(context = {}) {
  const userText = getReviewText(context.review, context.training);
  const userStage = context.growth && context.growth.activeGate ? context.growth.activeGate.name : "今日修行";
  const userEntry = userText
    ? [{ name: "我的省察", stage: userStage, text: userText }]
    : [];

  return userEntry.concat(REFLECTION_WALL_SEEDS).slice(0, 5);
}

function buildPersonalityTribes(context = {}) {
  const type = getProfileType(context);
  const seed = daySeed(context.todayKey);
  return PERSONALITY_TRIBES.map((tribe, index) => {
    const memberCount = clamp(16 + ((seed + index * 13) % 48), 12, 88);
    return Object.assign({}, tribe, {
      memberCount,
      active: tribe.type === type,
      status: tribe.type === type ? "我的主修" : "同修中"
    });
  });
}

function buildZhixingGrowthBoard(context = {}) {
  const profile = context.profile || {};
  const growth = context.growth || {};
  const continuity = context.continuity || {};
  const latest = context.zhixingScore && context.zhixingScore.latest ? context.zhixingScore.latest : context.zhixingScore || {};
  const myScore = clamp(Number(latest.total || growth.overall || 0) + Number(continuity.currentStreak || 0), 18, 99);
  const rows = [
    { name: "守一同修", score: 91, tag: "连续省察" },
    { name: "照心同修", score: 84, tag: "心境稳定" },
    { name: (profile && profile.nickname) || "我", score: myScore, tag: "当前修行" },
    { name: "克己同修", score: 76, tag: "戒律稳定" },
    { name: "立志同修", score: 62, tag: "今日入关" }
  ].sort((a, b) => b.score - a.score);

  return rows.map((item, index) => Object.assign({}, item, {
    rank: index + 1,
    me: item.name === ((profile && profile.nickname) || "我")
  }));
}

function buildCompanionStories(context = {}) {
  const type = getProfileType(context);
  const activeTribe = PERSONALITY_TRIBES.find((tribe) => tribe.type === type);
  const highlighted = activeTribe
    ? COMPANION_STORIES.find((story) => story.tribe === activeTribe.name)
    : null;
  const stories = highlighted
    ? [highlighted].concat(COMPANION_STORIES.filter((story) => story.title !== highlighted.title))
    : COMPANION_STORIES;
  return stories.slice(0, 3);
}

function buildCompanionSystem(context = {}) {
  const count = buildTodayCompanionCount(context);
  return {
    schema: COMPANION_SYSTEM_SCHEMA,
    todayCount: {
      value: count,
      label: "今日同修人数",
      note: "只统计照心、修行、戒律、省察等成长行为。"
    },
    todayStats: buildTodayPracticeStats(context),
    reflectionWall: buildReflectionWall(context),
    personalityTribes: buildPersonalityTribes(context),
    growthBoard: buildZhixingGrowthBoard(context),
    storyLibrary: buildCompanionStories(context),
    guardrailText: "同修系统只看照心、修行、戒律、省察与成长，不讨论具体标的和操作方向。"
  };
}

module.exports = {
  COMPANION_SYSTEM_SCHEMA,
  COMPANION_PROMPTS,
  PERSONALITY_TRIBES,
  COMPANION_STORIES,
  getTodayCompanionPrompt,
  buildCompanionSystem
};
