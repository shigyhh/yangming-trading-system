const DAILY_LOOP_STEPS = [
  {
    key: "heartProof",
    name: "今日心证",
    shortName: "心证",
    route: "/pages/home/index",
    action: "落下今日三印"
  },
  {
    key: "mind",
    name: "开盘照心",
    shortName: "照心",
    route: "/pages/mind/index",
    action: "完成开盘照心"
  },
  {
    key: "assessment",
    name: "九型人格",
    shortName: "九型",
    route: "/pages/assessment/index",
    action: "生成修行心证"
  },
  {
    key: "training",
    name: "每日事上练",
    shortName: "修行",
    route: "/pages/training/index",
    action: "完成三步事上练"
  },
  {
    key: "review",
    name: "收盘省察",
    shortName: "省察",
    route: "/pages/review/index",
    action: "写下今日省察"
  },
  {
    key: "zhixing",
    name: "知行指数",
    shortName: "知行",
    route: "/pages/zhixing-index/index",
    action: "更新知行指数"
  },
  {
    key: "heartCard",
    name: "心证卡",
    shortName: "归卷",
    route: "/pages/home/index",
    action: "落成今日心证卡"
  }
];

function isTodayScoreSaved(scoreState, todayKey, review) {
  const records = (scoreState || {}).records || {};
  const record = records[todayKey];
  if (!record) return false;
  const reviewTime = Number((review || {}).updatedAt || 0);
  if (!reviewTime) return false;
  return Number(record.updatedAt || 0) >= reviewTime;
}

function isTodayHeartProofDone(context, profile, today) {
  if (context.vowsSealed) return true;
  if (profile && profile.lastVowDate === today) return true;
  return !today && !!(profile && profile.vowsAccepted);
}

function isTodayHeartCardDone(context, today) {
  const record = context.heartCardRecord || context.heartCard || {};
  if (!record.completed) return false;
  const scoreRecord = (((context.zhixingScoreState || {}).records || {})[today]) || {};
  const scoreTime = Number(scoreRecord.updatedAt || 0);
  const cardTime = Number(record.updatedAt || record.completedAt || 0);
  if (!scoreTime) return !!cardTime;
  return cardTime >= scoreTime;
}

function buildDailyLoopState(context = {}) {
  const today = context.todayKey || "";
  const profile = context.profile || {};
  const mind = context.mind || null;
  const assessment = context.assessment || null;
  const training = context.training || {};
  const review = context.todayReview || context.review || null;
  const scoreState = context.zhixingScoreState || {};
  const doneMap = {
    heartProof: isTodayHeartProofDone(context, profile, today),
    mind: !!mind,
    assessment: !!assessment,
    training: !!training.completed,
    review: !!review,
    zhixing: isTodayScoreSaved(scoreState, today, review),
    heartCard: isTodayHeartCardDone(context, today)
  };

  const steps = DAILY_LOOP_STEPS.map((step, index) => {
    const done = !!doneMap[step.key];
    const previousDone = index === 0 ? true : !!doneMap[DAILY_LOOP_STEPS[index - 1].key];
    return Object.assign({}, step, {
      done,
      active: !done && previousDone,
      locked: !done && !previousDone,
      status: done ? "已完成" : previousDone ? "进行中" : "待开启"
    });
  });
  const completedCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done && !step.locked) || steps[steps.length - 1];

  return {
    today,
    steps,
    nextStep,
    completedCount,
    totalCount: steps.length,
    progress: Math.round((completedCount / steps.length) * 100),
    completed: completedCount === steps.length,
    statusText: `${completedCount}/${steps.length} 已完成`
  };
}

function routeForStep(key) {
  const step = DAILY_LOOP_STEPS.find((item) => item.key === key);
  return step ? step.route : "/pages/home/index";
}

module.exports = {
  DAILY_LOOP_STEPS,
  buildDailyLoopState,
  routeForStep
};
