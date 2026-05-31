function parseDayKey(dayKey) {
  const parts = String(dayKey || "").split("-").map((item) => Number(item));
  if (parts.length !== 3 || parts.some((item) => !Number.isFinite(item))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDay(dayKey, offset) {
  const date = parseDayKey(dayKey) || new Date();
  date.setDate(date.getDate() + offset);
  return formatDayKey(date);
}

function buildRecentDays(todayKey, count) {
  return Array.from({ length: count }).map((_, index) => {
    const offset = index - count + 1;
    return shiftDay(todayKey, offset);
  });
}

function isTrainingCompleted(trainingState, dayKey) {
  return !!((trainingState || {})[dayKey] || {}).completed;
}

function calculateCurrentStreak(trainingState, todayKey) {
  let streak = 0;
  let cursor = todayKey;

  if (!isTrainingCompleted(trainingState, cursor)) {
    cursor = shiftDay(cursor, -1);
  }

  while (isTrainingCompleted(trainingState, cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }

  return streak;
}

function calculateBestStreak(trainingState) {
  const keys = Object.keys(trainingState || {}).sort();
  let best = 0;
  let current = 0;
  let previous = "";

  keys.forEach((key) => {
    if (!isTrainingCompleted(trainingState, key)) {
      current = 0;
      previous = key;
      return;
    }

    current = previous && shiftDay(previous, 1) === key ? current + 1 : 1;
    best = Math.max(best, current);
    previous = key;
  });

  return best;
}

function buildDayState(dayKey, context) {
  const safeContext = context || {};
  const mind = !!((safeContext.mindRecords || {})[dayKey]);
  const training = !!(((safeContext.trainingState || {})[dayKey] || {}).completed);
  const review = !!((safeContext.reviews || {})[dayKey]);
  const score = [mind, training, review].filter(Boolean).length;

  return {
    dayKey,
    label: dayKey.slice(5).replace("-", "/"),
    mind,
    training,
    review,
    score,
    completed: training,
    status: score >= 3 ? "闭环" : score >= 2 ? "将成" : score >= 1 ? "已起" : "待修"
  };
}

function getMilestone(currentStreak) {
  const milestones = [7, 21, 49, 108];
  const target = milestones.find((item) => currentStreak < item) || 108;
  return {
    target,
    remaining: Math.max(0, target - currentStreak),
    label: `${target}日连修`
  };
}

function buildMilestones(currentStreak, bestStreak) {
  const safeCurrent = Number(currentStreak || 0);
  const safeBest = Math.max(Number(bestStreak || 0), safeCurrent);
  const milestones = [
    { day: 1, title: "今日起修", meaning: "完成第一次修行闭环。" },
    { day: 3, title: "三日续火", meaning: "让修行从一次冲动变成一个节奏。" },
    { day: 7, title: "七日立志", meaning: "初步建立每日照心和事上练习惯。" },
    { day: 21, title: "二十一日成势", meaning: "开始看见自己的惯性变化。" },
    { day: 49, title: "四十九日事上练", meaning: "在真实触发里形成稳定事上练。" },
    { day: 108, title: "一百零八日守一", meaning: "让省察成为长期存养。" }
  ];

  return milestones.map((item) => Object.assign({}, item, {
    unlocked: safeBest >= item.day,
    current: safeCurrent < item.day && safeBest < item.day,
    remaining: Math.max(0, item.day - safeCurrent),
    progress: Math.max(0, Math.min(100, Math.round((safeCurrent / item.day) * 100)))
  }));
}

function buildContinuityState(context) {
  const safeContext = context || {};
  const today = safeContext.todayKey || formatDayKey(new Date());
  const trainingState = safeContext.trainingState || {};
  const currentStreak = calculateCurrentStreak(trainingState, today);
  const bestStreak = Math.max(Number((safeContext.profile || {}).bestStreak || 0), calculateBestStreak(trainingState));
  const recentDays = buildRecentDays(today, 7).map((dayKey) => buildDayState(dayKey, safeContext));
  const todayState = recentDays[recentDays.length - 1] || buildDayState(today, safeContext);
  const milestone = getMilestone(currentStreak);
  const milestones = buildMilestones(currentStreak, bestStreak);

  return {
    today,
    currentStreak,
    bestStreak,
    recentDays,
    todayState,
    milestone,
    milestones,
    unlockedMilestoneCount: milestones.filter((item) => item.unlocked).length,
    todayProgress: todayState.score,
    todayProgressText: `${todayState.score}/3`,
    stateLabel: currentStreak >= 21 ? "稳定存养" : currentStreak >= 7 ? "连修成势" : currentStreak > 0 ? "正在续火" : "今日起修",
    nextText: todayState.score >= 3 ? "今日闭环已成，明日继续。" : "今日还差一步，把闭环补完整。"
  };
}

function buildCompletionPatch(profile, trainingState, todayKey) {
  const currentStreak = calculateCurrentStreak(trainingState, todayKey);
  const bestStreak = Math.max(Number((profile || {}).bestStreak || 0), currentStreak);

  return {
    streak: currentStreak,
    bestStreak,
    lastPracticeDate: todayKey,
    stage: "事上磨关"
  };
}

module.exports = {
  formatDayKey,
  shiftDay,
  buildContinuityState,
  buildCompletionPatch,
  calculateCurrentStreak,
  calculateBestStreak,
  buildMilestones
};
