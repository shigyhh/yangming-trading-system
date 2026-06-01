const TASKS = [
  { id: "opening_check", key: "opening_check", title: "完成开盘照心", completed: false },
  { id: "intraday_boundary", key: "intraday_boundary", title: "记录盘中守界", completed: false },
  { id: "reaction_record", key: "reaction_record", title: "记录一次交易反应", completed: false },
  { id: "daily_practice", key: "daily_practice", title: "完成 K 线历史训练", completed: false },
  { id: "closing_review", key: "closing_review", title: "完成收盘省察", completed: false }
];

const TRAINING_7_DAYS = [
  {
    day: 1,
    title: "观入场冲动",
    stage: "第一关 · 立界",
    mantra: "入事之前，先照见那一念急。",
    reflectionQuestion: "当你想立刻进入一件事时，是看见事实，还是想用行动缓解不安？",
    boundaryPractice: "行动前先停十秒，写下理由、边界和复盘依据。",
    tasks: TASKS,
    completed: false
  },
  {
    day: 2,
    title: "观止损抗拒",
    stage: "第二关 · 守界",
    mantra: "边界到了，正是知行合一处。",
    reflectionQuestion: "当预设边界被触碰时，你第一反应是遵守计划，还是想重新解释？",
    boundaryPractice: "提前写清今日必须守住的边界，触碰时只做记录与复盘。",
    tasks: TASKS,
    completed: false
  },
  {
    day: 3,
    title: "观亏损后的证明欲",
    stage: "第三关 · 观念",
    mantra: "不急着证明，先回到本心。",
    reflectionQuestion: "不顺之后，你是在复盘事实，还是在寻找一个立刻扳回的动作？",
    boundaryPractice: "不顺时先离开屏幕一分钟，只记录念头，不做补偿式动作。",
    tasks: TASKS,
    completed: false
  },
  {
    day: 4,
    title: "观盈利后的失控",
    stage: "第四关 · 守中",
    mantra: "得意时守住尺度，才是真功夫。",
    reflectionQuestion: "顺利之后，你是否开始放松记录、放大动作，或忘记原来的边界？",
    boundaryPractice: "顺利后仍按原计划复盘，不因兴奋放大动作。",
    tasks: TASKS,
    completed: false
  },
  {
    day: 5,
    title: "观加仓与扛单",
    stage: "第五关 · 克己",
    mantra: "念头越重，动作越要轻。",
    reflectionQuestion: "当你想加重动作或硬扛时，是规则在带路，还是不甘在发力？",
    boundaryPractice: "出现加重动作或硬扛念头时，先写下触发、情绪和边界。",
    tasks: TASKS,
    completed: false
  },
  {
    day: 6,
    title: "观计划执行断裂",
    stage: "第六关 · 知行",
    mantra: "真正的事上练，是边界到了能知行合一。",
    reflectionQuestion: "计划断裂的一刻，你最先放弃的是记录、边界，还是如实面对？",
    boundaryPractice: "只检查今天哪一步断裂，不责备自己，只补一个明日动作。",
    tasks: TASKS,
    completed: false
  },
  {
    day: 7,
    title: "复盘与复测",
    stage: "第七关 · 复测",
    mantra: "七日一省，看见反应如何变化。",
    reflectionQuestion: "这一周里，哪个旧反应变轻了？哪个念头还最容易牵动你？",
    boundaryPractice: "复盘七日记录，完成一次复测，只看反应模式变化。",
    tasks: TASKS,
    completed: false
  }
];

function clampDay(day) {
  const value = Number(day || 1);
  return Math.max(1, Math.min(7, Number.isFinite(value) ? value : 1));
}

function isDayCompleted(record = {}) {
  const tasks = record.tasks || {};
  return TASKS.every((task) => !!tasks[task.key]) ||
    ["reaction", "kline", "checkin"].every((key) => !!tasks[key]);
}

function getFirstOpenDay(records = {}) {
  const open = TRAINING_7_DAYS.find((day) => !isDayCompleted(records[day.day]));
  return open ? open.day : 7;
}

function mergeTodayRecord(state = {}, context = {}) {
  const currentDay = clampDay(state.currentDay || getFirstOpenDay(state.records || {}));
  const records = Object.assign({}, state.records || {});
  const currentRecord = Object.assign({ tasks: {} }, records[currentDay] || {});
  const currentTasks = Object.assign({}, currentRecord.tasks || {});

  if (context.reactionRecord) currentTasks.reaction = true;
  if (context.reactionRecord) currentTasks.reaction_record = true;
  if (context.openingCheck || context.mind) currentTasks.opening_check = true;
  if (context.intradayBoundaryRecord && context.intradayBoundaryRecord.completed) currentTasks.intraday_boundary = true;
  if (context.closingReview || context.review) currentTasks.closing_review = true;
  if (context.training && context.training.completed) currentTasks.daily_practice = true;
  if (context.training && context.training.steps && context.training.steps.trigger) currentTasks.kline = true;
  if (context.training && context.training.completed) currentTasks.checkin = true;
  if (context.klineMindRecord && context.klineMindRecord.completed) currentTasks.daily_practice = true;
  if (context.klineMindRecord && context.klineMindRecord.completed) currentTasks.kline = true;

  records[currentDay] = Object.assign({}, currentRecord, {
    tasks: currentTasks,
    completed: isDayCompleted({ tasks: currentTasks })
  });

  return records;
}

function buildTraining7View(state = {}, context = {}) {
  const records = context.useContextMerge ? mergeTodayRecord(state, context) : Object.assign({}, state.records || {});
  const currentDay = clampDay(state.currentDay || getFirstOpenDay(records));
  const completedCount = TRAINING_7_DAYS.filter((day) => isDayCompleted(records[day.day])).length;
  const today = TRAINING_7_DAYS.find((item) => item.day === currentDay) || TRAINING_7_DAYS[0];
  const todayRecord = records[currentDay] || {};
  const todayTasks = TASKS.map((task) => ({
    key: task.key,
    id: task.id,
    title: task.title,
    completed: !!((todayRecord.tasks || {})[task.key]),
    done: !!((todayRecord.tasks || {})[task.key]),
    status: ((todayRecord.tasks || {})[task.key]) ? "已完成" : "待完成"
  }));

  return {
    totalDays: TRAINING_7_DAYS.length,
    currentDay,
    completedCount,
    progressText: `${completedCount}/7`,
    progressPercent: Math.round((completedCount / TRAINING_7_DAYS.length) * 100),
    canRetest: currentDay === 7 || completedCount >= 6,
    today: Object.assign({}, today, {
      tasks: todayTasks,
      completed: isDayCompleted(todayRecord)
    }),
    days: TRAINING_7_DAYS.map((day) => {
      const record = records[day.day] || {};
      return Object.assign({}, day, {
        tasks: TASKS.map((task) => ({
          key: task.key,
          id: task.id,
          title: task.title,
          completed: !!((record.tasks || {})[task.key]),
          done: !!((record.tasks || {})[task.key])
        })),
        completed: isDayCompleted(record),
        active: day.day === currentDay
      });
    })
  };
}

module.exports = {
  TASKS,
  TRAINING_7_DAYS,
  buildTraining7View,
  isDayCompleted,
  clampDay
};
