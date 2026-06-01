const LONG_TERM_MILESTONES = [
  { day: 7, label: "七日立志", unlock: "开启第一次复测变化" },
  { day: 21, label: "二十一日守戒", unlock: "形成稳定事上练节奏" },
  { day: 49, label: "四十九日磨心", unlock: "进入长期训练档案" },
  { day: 108, label: "一百零八日归一", unlock: "获得年度修行画像" },
  { day: 365, label: "三百六十五日心证", unlock: "完成一轮全年修行" }
];

const MEMBERSHIP_TIERS = [
  {
    key: "starter",
    name: "观心体验",
    threshold: 0,
    note: "每日心证、九型照见、三步事上练",
    benefits: ["今日心证", "基础人格照见", "每日三步事上练"]
  },
  {
    key: "member",
    name: "精进会员",
    threshold: 7,
    note: "复测变化、365天修行库、心证卡归档",
    benefits: ["7日复测变化", "365天心证库", "心证卡连续归档"]
  },
  {
    key: "camp",
    name: "修行营会员",
    threshold: 21,
    note: "长期训练路径、助教承接、阶段复盘",
    benefits: ["长期训练路径", "助教承接提醒", "阶段复盘档案"]
  }
];

const DEFAULT_REMINDER = {
  enabled: false,
  time: "21:30",
  mode: "收盘省察",
  updatedAt: null
};

function parseDateKey(dateKey) {
  const parts = String(dateKey || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((item) => !item)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function daysBetween(fromTime, today) {
  const start = Number(fromTime || 0);
  if (!start) return 0;
  const diff = parseDateKey(today).getTime() - start;
  return Math.max(0, Math.floor(diff / 86400000));
}

function getNextMilestone(streak) {
  const current = Number(streak || 0);
  return LONG_TERM_MILESTONES.find((item) => current < item.day) || LONG_TERM_MILESTONES[LONG_TERM_MILESTONES.length - 1];
}

function buildLongTraining(continuity = {}) {
  const streak = Number(continuity.currentStreak || continuity.streak || 0);
  const milestone = getNextMilestone(streak);
  const previous = LONG_TERM_MILESTONES.slice().reverse().find((item) => item.day <= streak) || { day: 0 };
  const span = Math.max(1, milestone.day - previous.day);
  const progress = milestone.day <= streak ? 100 : Math.round(((streak - previous.day) / span) * 100);
  const remaining = Math.max(0, milestone.day - streak);

  return {
    streak,
    milestone,
    progress,
    remaining,
    title: streak ? `${streak}日连修` : "今日起修",
    subtitle: remaining ? `距「${milestone.label}」还差${remaining}日` : `已进入「${milestone.label}」`,
    unlock: milestone.unlock
  };
}

function buildRetest(profile = {}, assessment = null, today = "") {
  if (!assessment) {
    return {
      due: true,
      daysSince: 0,
      label: "首次照见",
      actionText: "先完成人格照见",
      hint: "照见主反应人格后，复测变化才有参照。"
    };
  }

  const lastAt = Number(profile.lastAssessmentAt || profile.createdAt || Date.now());
  const daysSince = daysBetween(lastAt, today);
  const remaining = Math.max(0, 7 - daysSince);

  return {
    due: daysSince >= 7,
    daysSince,
    label: daysSince >= 7 ? "今日可复测" : `${remaining}日后复测`,
    actionText: daysSince >= 7 ? "进行一次复测" : "等待复测窗口",
    hint: daysSince >= 7
      ? "复测不是推翻自己，而是看见这一周反应模式有没有变化。"
      : "先积累一段真实训练记录，再看变化。"
  };
}

function buildContent365(dailyContent = {}) {
  const dayNumber = Math.max(1, Math.min(365, Number(dailyContent.dayNumber || 1)));
  return {
    dayNumber,
    progress: Math.round((dayNumber / 365) * 100),
    dayLabel: dailyContent.id || `Day${String(dayNumber).padStart(3, "0")}`,
    title: dailyContent.heartProof || "每日一页，照见此心。",
    subtitle: `${dayNumber}/365 · ${dailyContent.stageName || "今日修行"}`,
    nextText: dayNumber >= 365 ? "已完成一轮全年心证" : `还差${365 - dayNumber}日完成全年心证`
  };
}

function buildMembership(profile = {}, continuity = {}, zhixingScoreState = {}) {
  const streak = Number(continuity.currentStreak || profile.streak || 0);
  const score = Number(((zhixingScoreState || {}).latest || {}).total || profile.zhixingScore || 0);
  const achieved = MEMBERSHIP_TIERS
    .filter((tier) => streak >= tier.threshold || (tier.key === "member" && score >= 70) || (tier.key === "camp" && score >= 82))
    .pop() || MEMBERSHIP_TIERS[0];
  const next = MEMBERSHIP_TIERS.find((tier) => tier.threshold > Math.max(streak, achieved.threshold)) || null;

  return {
    current: achieved,
    next,
    score,
    progress: next ? Math.min(100, Math.round((streak / next.threshold) * 100)) : 100,
    nextText: next ? `连续修行${next.threshold}日可进入「${next.name}」` : "已进入长期修行体系",
    benefits: achieved.benefits
  };
}

function buildReminder(reminderState = {}) {
  const reminder = Object.assign({}, DEFAULT_REMINDER, reminderState || {});
  return Object.assign({}, reminder, {
    label: reminder.enabled ? `${reminder.time} · ${reminder.mode}` : "未开启",
    hint: reminder.enabled ? "每天只提醒一次，回到照心、事上练与省察。" : "建议开启轻提醒，不催促，只把心带回来。"
  });
}

function buildRetentionState(context = {}) {
  const longTraining = buildLongTraining(context.continuity || {});
  const retest = buildRetest(context.profile || {}, context.assessment, context.todayKey);
  const content365 = buildContent365(context.dailyContent || {});
  const membership = buildMembership(context.profile || {}, context.continuity || {}, context.zhixingScoreState || {});
  const reminder = buildReminder(context.reminderState || {});
  const loop = context.loopState || {};
  const nextStep = loop.nextStep || {};

  return {
    longTraining,
    retest,
    content365,
    membership,
    reminder,
    loop: {
      statusText: loop.statusText || "0/7 已完成",
      progress: Number(loop.progress || 0),
      nextName: nextStep.name || "今日心证",
      nextAction: nextStep.action || "落下今日三印",
      nextRoute: nextStep.route || "/pages/home/index",
      completed: !!loop.completed
    },
    dailyHook: loop.completed
      ? "今日已归卷，明日再照见。"
      : `${nextStep.name || "今日心证"}还差一步，完成后才算今日归卷。`
  };
}

module.exports = {
  LONG_TERM_MILESTONES,
  MEMBERSHIP_TIERS,
  DEFAULT_REMINDER,
  buildRetentionState
};
