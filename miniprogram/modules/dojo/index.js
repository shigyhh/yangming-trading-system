const DOJO_TASKS = [
  {
    key: "quiet-start",
    title: "开盘前三息",
    discipline: "先照心，再看盘。",
    action: "今日开盘前做三次呼吸，只写下一个最强念头。"
  },
  {
    key: "plan-before-action",
    title: "行动前三问",
    discipline: "无计划，不行动。",
    action: "任何行动前先写理由、边界、复盘依据。"
  },
  {
    key: "stop-without-debate",
    title: "边界不辩",
    discipline: "触发边界，不临场辩论。",
    action: "触发预设边界后，只按预案知行合一，不再重新解释。"
  },
  {
    key: "one-review",
    title: "收盘一省",
    discipline: "今日事，今日省。",
    action: "收盘后写下今天最想冲动的一刻。"
  }
];

const SPIRITUAL_MENTOR = {
  name: "阳明先生",
  role: "道统导师",
  note: "基于阳明心学语境生成观心提醒，不代表历史人物本人言论。"
};

const HUMAN_MENTOR_ROLES = [
  { key: "coach", label: "修行营教练", scope: "陪跑修行、查看闭环进度、布置共修任务" },
  { key: "assistant", label: "助教", scope: "提醒打卡、协助省察、承接修行营服务" }
];

const { buildInviteCode, summarizeAssistantHandoff } = require("../user-identity/index");

function getTaskIndex(todayKey) {
  return String(todayKey || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % DOJO_TASKS.length;
}

function getMentorRole(roleKey) {
  return HUMAN_MENTOR_ROLES.find((item) => item.key === roleKey) || HUMAN_MENTOR_ROLES[0];
}

function buildMentorRelation(dojoState) {
  const safeState = dojoState || {};
  const role = getMentorRole(safeState.mentorRole);
  const humanMentor = safeState.joined
    ? {
        code: safeState.mentorCode || "",
        roleKey: role.key,
        role: role.label,
        scope: role.scope,
        status: "已绑定"
      }
    : {
        code: "",
        roleKey: role.key,
        role: role.label,
        scope: role.scope,
        status: "独修中"
      };

  return {
    spiritualMentor: SPIRITUAL_MENTOR,
    humanMentor,
    privacy: "修行营教练和助教只看修行闭环、知行指数、连续修行和省察完成状态，不看具体交易细节。"
  };
}

function countCompletedDojoTasks(dojoState) {
  return Object.keys((dojoState || {}).taskRecords || {}).filter((dayKey) => {
    const record = ((dojoState || {}).taskRecords || {})[dayKey] || {};
    return !!record.completed;
  }).length;
}

function buildContextLine(context, relation) {
  const safeContext = context || {};
  const assessment = safeContext.assessment ? safeContext.assessment.primary : "未建档";
  const mind = safeContext.mind ? safeContext.mind.name : "未照心";
  const growth = safeContext.growth && safeContext.growth.activeGate ? safeContext.growth.activeGate.name : "未入关";
  const continuity = safeContext.continuity ? `${safeContext.continuity.currentStreak || 0}日连修` : "未连修";
  const training = safeContext.training && safeContext.training.completed ? "今日事上练已完成" : "今日事上练未闭环";
  const review = safeContext.review ? "今日已省察" : "今日待省察";
  const mentor = relation && relation.humanMentor && relation.humanMentor.status === "已绑定" ? relation.humanMentor.role : "独修";

  return `上下文：心境${mind}；档案${assessment}；当前${growth}；${continuity}；${training}；${review}；带练状态${mentor}。`;
}

function buildAssistantReply(input, context) {
  const text = String(input || "").trim();
  const safeContext = context || {};
  const type = safeContext.assessment ? safeContext.assessment.primary : "未建档";
  const mind = safeContext.mind ? safeContext.mind.name : "未照心";
  const archive = safeContext.archive || {};
  const relation = buildMentorRelation(safeContext.dojoState || {});
  const contextLine = buildContextLine(safeContext, relation);
  const activeGate = safeContext.growth && safeContext.growth.activeGate ? safeContext.growth.activeGate.name : "当前关口";
  const todayProgress = safeContext.continuity ? safeContext.continuity.todayProgressText : "0/3";
  const lower = text.toLowerCase();
  let focus = "先把这一念写清楚，再决定要不要行动。";

  if (text.includes("急") || lower.includes("fomo")) {
    focus = "你现在要练的不是更快，而是慢一拍。行动前先写理由、边界、复盘依据。";
  } else if (text.includes("怕") || text.includes("焦虑")) {
    focus = "焦虑想要确定感，但修行先要看见不确定。把观察窗口固定下来，窗口外只记录心境。";
  } else if (text.includes("亏") || text.includes("不甘")) {
    focus = "不甘最会伪装成评判。先问一句：这是系统动作，还是想修复情绪？";
  } else if (text.includes("复") || text.includes("省察")) {
    focus = "省察只留一个可克治动作，不责备自己。今天只写触发、反应、明日克治。";
  }

  return {
    title: "观心回应",
    content: `${focus} ${contextLine}`,
    question: `此刻真正牵动你的，是事实，还是一口念头？今日闭环 ${todayProgress}，先补${activeGate}里最小的一步。`,
    prescription: archive.dailyAction || archive.discipline || `当前心境：${mind}；人格档案：${type}。`,
    createdAt: Date.now()
  };
}

function buildLeaderboard(profile, growth, continuity) {
  const myScore = Math.max(12, Math.min(99, Number((growth && growth.overall) || 0) + Number((continuity && continuity.currentStreak) || 0)));
  const rows = [
    { name: "守一同修", score: 92, tag: "21日连修" },
    { name: "省察同修", score: 84, tag: "省察稳定" },
    { name: (profile && profile.nickname) || "我", score: myScore, tag: "当前修行" },
    { name: "照心同修", score: 67, tag: "照心稳定" },
    { name: "立志同修", score: 52, tag: "刚入道场" }
  ].sort((a, b) => b.score - a.score);

  return rows.map((item, index) => Object.assign({}, item, { rank: index + 1, me: item.name === ((profile && profile.nickname) || "我") }));
}

function buildDojoView(context) {
  const safeContext = context || {};
  const dojoState = safeContext.dojoState || {};
  const todayKey = safeContext.todayKey || "";
  const task = DOJO_TASKS[getTaskIndex(todayKey)];
  const taskRecord = (dojoState.taskRecords || {})[todayKey] || {};
  const inviteCode = buildInviteCode(safeContext.profile || {});
  const leaderboard = buildLeaderboard(safeContext.profile || {}, safeContext.growth || {}, safeContext.continuity || {});
  const relation = buildMentorRelation(dojoState);
  const assistantHandoff = summarizeAssistantHandoff(safeContext);

  return {
    inviteCode,
    joined: !!dojoState.joined,
    mentorCode: dojoState.mentorCode || "",
    mentorRole: relation.humanMentor.roleKey,
    mentorRoles: HUMAN_MENTOR_ROLES,
    relation,
    task: Object.assign({}, task, {
      accepted: !!taskRecord.accepted,
      completed: !!taskRecord.completed
    }),
    assistantHandoff,
    completedTaskCount: countCompletedDojoTasks(dojoState),
    leaderboard,
    assistantLogs: dojoState.assistantLogs || [],
    dojoLevel: leaderboard.find((item) => item.me)?.rank <= 2 ? "内院" : "外院"
  };
}

module.exports = {
  DOJO_TASKS,
  SPIRITUAL_MENTOR,
  HUMAN_MENTOR_ROLES,
  buildDojoView,
  buildAssistantReply,
  buildInviteCode,
  buildMentorRelation,
  countCompletedDojoTasks
};
