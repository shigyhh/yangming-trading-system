import crypto from "node:crypto";
import { readRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const USER_FILE = "users.json";
const MENTOR_FILE = "dojo-mentors.json";
const BINDING_FILE = "dojo-mentor-bindings.json";
const TASK_FILE = "dojo-tasks.json";
const TASK_RECORD_FILE = "dojo-task-records.json";
const MIND_RECORD_FILE = "dojo-mind-records.json";
const STATE_FILE = "miniprogram-states.json";

const MENTOR_ROLES = new Set(["coach", "assistant"]);
const RECORD_ACTIONS = new Set(["accept", "complete"]);

const SPIRITUAL_MENTOR = {
  name: "阳明先生",
  role: "道统导师",
  note: "基于阳明心学语境提供观心提醒，不代表历史人物本人言论。"
};

const SEED_TASKS = [
  {
    seed_id: "dojo-quiet-start",
    title: "开盘前三息",
    discipline: "先照心，再看盘。",
    action: "开盘前做三次呼吸，只写下一个最强念头。",
    personality_type: "通用",
    stage: "照心关",
    target_role: "all"
  },
  {
    seed_id: "dojo-plan-before-action",
    title: "行动前三问",
    discipline: "无计划，不开仓。",
    action: "行动前写下理由、边界、离场条件。",
    personality_type: "冲动型",
    stage: "事上磨关",
    target_role: "all"
  },
  {
    seed_id: "dojo-stop-without-debate",
    title: "边界不辩",
    discipline: "触发边界，不临场辩论。",
    action: "触发预设边界后，只执行预案，不再重新解释。",
    personality_type: "扛单型",
    stage: "省察关",
    target_role: "all"
  },
  {
    seed_id: "dojo-one-review",
    title: "收盘一省",
    discipline: "今日事，今日省。",
    action: "收盘后写下今天最想冲动的一刻。",
    personality_type: "通用",
    stage: "省察关",
    target_role: "all"
  }
];

export async function listDojoMentors({ role = "", status = "active", limit = 50 } = {}) {
  const mentors = await readRuntimeRecords(MENTOR_FILE);
  const users = await readRuntimeRecords(USER_FILE);
  const userMap = new Map(users.map((item) => [item.id, item]));
  const normalizedRole = normalizeRole(role, true);
  const normalizedLimit = clampLimit(limit);

  return mentors
    .filter((mentor) => !normalizedRole || mentor.role === normalizedRole)
    .filter((mentor) => !status || mentor.status === status)
    .slice(0, normalizedLimit)
    .map((mentor) => withMentorUser(mentor, userMap.get(mentor.user_id)));
}

export async function registerDojoMentor({
  userId,
  role = "coach",
  displayName = "",
  bio = "",
  sourceChannel = "后端API"
}) {
  const normalizedUserId = requireUserId(userId);
  const normalizedRole = normalizeRole(role);
  const users = await readRuntimeRecords(USER_FILE);
  const user = users.find((item) => item.id === normalizedUserId);
  if (!user) throwStatus("用户不存在，无法注册训练营教练/助教", 404);

  const now = new Date().toISOString();
  let saved;

  await updateRuntimeRecords(MENTOR_FILE, (records) => {
    const index = records.findIndex((item) => item.user_id === normalizedUserId);
    const base = index >= 0 ? records[index] : {
      id: crypto.randomUUID(),
      user_id: normalizedUserId,
      mentor_code: createMentorCode(records),
      created_at: now
    };

    saved = {
      ...base,
      role: normalizedRole,
      display_name: String(displayName || user.nickname || roleLabel(normalizedRole)).slice(0, 80),
      bio: String(bio || "").slice(0, 500),
      status: "active",
      source_channel: sourceChannel,
      updated_at: now
    };

    if (index >= 0) {
      records[index] = saved;
      return records;
    }
    return records.concat(saved);
  });

  return withMentorUser(saved, user);
}

export async function getUserDojoBindings(userId) {
  const normalizedUserId = requireUserId(userId);
  const [bindings, mentors, users] = await Promise.all([
    readRuntimeRecords(BINDING_FILE),
    readRuntimeRecords(MENTOR_FILE),
    readRuntimeRecords(USER_FILE)
  ]);
  const mentorMap = new Map(mentors.map((item) => [item.id, item]));
  const userMap = new Map(users.map((item) => [item.id, item]));
  const userBindings = bindings
    .filter((item) => item.user_id === normalizedUserId)
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
    .map((binding) => {
      const mentor = mentorMap.get(binding.mentor_id) || null;
      return {
        ...binding,
        mentor: mentor ? withMentorUser(mentor, userMap.get(mentor.user_id)) : null
      };
    });

  return {
    spiritual_mentor: SPIRITUAL_MENTOR,
    active_binding: userBindings.find((item) => item.status === "active") || null,
    bindings: userBindings,
    privacy: "训练营教练/助教只看修行闭环、知行指数、连续修行和复盘完成状态，不看具体交易明细。"
  };
}

export async function bindDojoMentor({
  userId,
  mentorCode,
  role = "",
  sourceChannel = "微信小程序MVP"
}) {
  const normalizedUserId = requireUserId(userId);
  const code = String(mentorCode || "").trim().toUpperCase();
  if (!/^ZX[A-Z0-9]{4,10}$/.test(code)) throwStatus("mentor_code 格式不正确", 400);

  const mentors = await readRuntimeRecords(MENTOR_FILE);
  const mentor = mentors.find((item) => item.mentor_code === code && item.status === "active");
  if (!mentor) throwStatus("训练营教练/助教不存在或未启用", 404);
  if (role && normalizeRole(role) !== mentor.role) throwStatus("道场码和选择的真人带练身份不匹配", 400);
  if (mentor.user_id === normalizedUserId) throwStatus("不能绑定自己为训练营教练/助教", 400);

  const now = new Date().toISOString();
  let saved;

  await updateRuntimeRecords(BINDING_FILE, (records) => {
    const nextRecords = records.map((item) => {
      if (item.user_id === normalizedUserId && item.status === "active") {
        return { ...item, status: "replaced", updated_at: now };
      }
      return item;
    });
    const existingIndex = nextRecords.findIndex((item) => item.user_id === normalizedUserId && item.mentor_id === mentor.id);
    const base = existingIndex >= 0 ? nextRecords[existingIndex] : {
      id: crypto.randomUUID(),
      user_id: normalizedUserId,
      mentor_id: mentor.id,
      mentor_user_id: mentor.user_id,
      mentor_code: mentor.mentor_code,
      created_at: now
    };

    saved = {
      ...base,
      role: mentor.role,
      status: "active",
      source_channel: sourceChannel,
      updated_at: now
    };

    if (existingIndex >= 0) {
      nextRecords[existingIndex] = saved;
      return nextRecords;
    }
    return nextRecords.concat(saved);
  });

  return {
    spiritual_mentor: SPIRITUAL_MENTOR,
    binding: saved,
    mentor
  };
}

export async function listDojoTasks({ personalityType = "", stage = "", status = "active", limit = 50 } = {}) {
  const tasks = await ensureSeedTasks();
  const normalizedLimit = clampLimit(limit);
  const normalizedPersonality = String(personalityType || "").trim();
  const normalizedStage = String(stage || "").trim();

  return tasks
    .filter((task) => !status || task.status === status)
    .filter((task) => !normalizedPersonality || task.personality_type === normalizedPersonality || task.personality_type === "通用")
    .filter((task) => !normalizedStage || task.stage === normalizedStage)
    .slice(0, normalizedLimit);
}

export async function createDojoTask({
  creatorUserId,
  title,
  discipline,
  action,
  personalityType = "通用",
  stage = "事上磨关",
  targetRole = "all",
  sourceChannel = "后端API"
}) {
  const normalizedCreator = requireUserId(creatorUserId);
  const cleanTitle = String(title || "").trim();
  const cleanAction = String(action || "").trim();
  if (!cleanTitle) throwStatus("title 不能为空", 400);
  if (!cleanAction) throwStatus("action 不能为空", 400);

  const now = new Date().toISOString();
  const task = {
    id: crypto.randomUUID(),
    creator_user_id: normalizedCreator,
    title: cleanTitle.slice(0, 120),
    discipline: String(discipline || "今日只练一件事。").slice(0, 200),
    action: cleanAction.slice(0, 500),
    personality_type: String(personalityType || "通用").slice(0, 40),
    stage: String(stage || "事上磨关").slice(0, 40),
    target_role: ["coach", "assistant", "all"].includes(targetRole) ? targetRole : "all",
    status: "active",
    source_channel: sourceChannel,
    created_at: now,
    updated_at: now
  };

  await updateRuntimeRecords(TASK_FILE, async (records) => (await ensureSeedTasksInMemory(records)).concat(task));
  return task;
}

export async function saveUserDojoTaskRecord({
  userId,
  taskId,
  action,
  note = "",
  sourceChannel = "微信小程序MVP"
}) {
  const normalizedUserId = requireUserId(userId);
  const normalizedTaskId = String(taskId || "").trim();
  const normalizedAction = String(action || "").trim();
  if (!RECORD_ACTIONS.has(normalizedAction)) throwStatus("action 必须是 accept 或 complete", 400);

  const tasks = await ensureSeedTasks();
  const task = tasks.find((item) => item.id === normalizedTaskId || item.seed_id === normalizedTaskId);
  if (!task) throwStatus("道场任务不存在", 404);

  const today = getLocalDateKey();
  const now = new Date().toISOString();
  let saved;

  await updateRuntimeRecords(TASK_RECORD_FILE, (records) => {
    const index = records.findIndex((item) => item.user_id === normalizedUserId && item.task_id === task.id && item.date_key === today);
    const base = index >= 0 ? records[index] : {
      id: crypto.randomUUID(),
      user_id: normalizedUserId,
      task_id: task.id,
      date_key: today,
      accepted_at: null,
      completed_at: null,
      created_at: now
    };

    saved = {
      ...base,
      status: normalizedAction === "complete" ? "completed" : "accepted",
      accepted_at: base.accepted_at || now,
      completed_at: normalizedAction === "complete" ? now : base.completed_at || null,
      note: String(note || base.note || "").slice(0, 500),
      source_channel: sourceChannel,
      updated_at: now
    };

    if (index >= 0) {
      records[index] = saved;
      return records;
    }
    return records.concat(saved);
  });

  return { record: saved, task };
}

export async function saveDojoMindRecord({
  userId,
  input,
  reply = null,
  context = {},
  sourceChannel = "微信小程序MVP"
}) {
  const normalizedUserId = requireUserId(userId);
  const cleanInput = String(input || "").trim();
  if (!cleanInput) throwStatus("input 不能为空", 400);

  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    user_id: normalizedUserId,
    date_key: getLocalDateKey(),
    input: cleanInput.slice(0, 1000),
    reply: sanitizeJson(reply),
    context: sanitizeJson(context),
    source_channel: sourceChannel,
    created_at: now
  };

  await updateRuntimeRecords(MIND_RECORD_FILE, (records) => records.concat(record));
  return record;
}

export async function listDojoMindRecords(userId, { limit = 20 } = {}) {
  const normalizedUserId = requireUserId(userId);
  const records = await readRuntimeRecords(MIND_RECORD_FILE);
  return records
    .filter((item) => item.user_id === normalizedUserId)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, clampLimit(limit));
}

export async function getDojoLeaderboard({ period = "week", limit = 30 } = {}) {
  const [users, taskRecords, mindRecords, states] = await Promise.all([
    readRuntimeRecords(USER_FILE),
    readRuntimeRecords(TASK_RECORD_FILE),
    readRuntimeRecords(MIND_RECORD_FILE),
    readRuntimeRecords(STATE_FILE)
  ]);
  const since = getPeriodStart(period);
  const userMap = new Map(users.map((item) => [item.id, item]));
  const stateMap = new Map(states.map((item) => [item.user_id, item]));
  const scores = new Map();

  for (const record of taskRecords) {
    if (since && new Date(record.updated_at || record.created_at || 0) < since) continue;
    addScore(scores, record.user_id, record.status === "completed" ? 12 : 4);
  }

  for (const record of mindRecords) {
    if (since && new Date(record.created_at || 0) < since) continue;
    addScore(scores, record.user_id, 6);
  }

  for (const state of states) {
    const profile = state.profile || {};
    const streak = Number(profile.streak || 0);
    const points = Number(profile.points || 0);
    addScore(scores, state.user_id, Math.min(30, streak * 3) + Math.min(30, Math.round(points / 20)));
  }

  return [...scores.entries()]
    .map(([userId, score]) => {
      const user = userMap.get(userId) || {};
      const state = stateMap.get(userId) || {};
      const profile = state.profile || {};
      return {
        user_id: userId,
        nickname: profile.nickname || user.nickname || "知行同修",
        score: Math.round(score),
        streak: Number(profile.streak || 0),
        tag: profile.stage || "修行中"
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, clampLimit(limit))
    .map((item, index) => ({ rank: index + 1, ...item }));
}

export async function getUserDojoSummary(userId) {
  const normalizedUserId = requireUserId(userId);
  const [bindings, tasks, taskRecords, mindRecords, leaderboard] = await Promise.all([
    getUserDojoBindings(normalizedUserId),
    listDojoTasks({ limit: 12 }),
    readRuntimeRecords(TASK_RECORD_FILE),
    listDojoMindRecords(normalizedUserId, { limit: 5 }),
    getDojoLeaderboard({ period: "week", limit: 100 })
  ]);
  const userTaskRecords = taskRecords.filter((item) => item.user_id === normalizedUserId);
  const acceptedTaskIds = new Set(userTaskRecords.filter((item) => item.status === "accepted" || item.status === "completed").map((item) => item.task_id));
  const nextTask = tasks.find((task) => !acceptedTaskIds.has(task.id)) || tasks[0] || null;
  const leaderboardRank = leaderboard.find((item) => item.user_id === normalizedUserId) || null;

  return {
    user_id: normalizedUserId,
    relation: bindings,
    next_task: nextTask,
    task_stats: {
      accepted: userTaskRecords.filter((item) => item.status === "accepted").length,
      completed: userTaskRecords.filter((item) => item.status === "completed").length,
      total: userTaskRecords.length
    },
    recent_mind_records: mindRecords,
    leaderboard_rank: leaderboardRank
  };
}

export async function getMentorDashboard({ mentorUserId, limit = 100 }) {
  const normalizedMentorUserId = requireUserId(mentorUserId);
  const [bindings, users, states, taskRecords, mindRecords] = await Promise.all([
    readRuntimeRecords(BINDING_FILE),
    readRuntimeRecords(USER_FILE),
    readRuntimeRecords(STATE_FILE),
    readRuntimeRecords(TASK_RECORD_FILE),
    readRuntimeRecords(MIND_RECORD_FILE)
  ]);
  const activeBindings = bindings.filter((item) => item.mentor_user_id === normalizedMentorUserId && item.status === "active");
  const userMap = new Map(users.map((item) => [item.id, item]));
  const stateMap = new Map(states.map((item) => [item.user_id, item]));
  const today = getLocalDateKey();

  const students = activeBindings.slice(0, clampLimit(limit)).map((binding) => {
    const user = userMap.get(binding.user_id) || {};
    const state = stateMap.get(binding.user_id) || {};
    const profile = state.profile || {};
    const mindToday = Boolean((state.mind_records || {})[today]);
    const trainingToday = Boolean(((state.training_state || {})[today] || {}).completed);
    const reviewToday = Boolean((state.review_records || {})[today]);
    const taskToday = taskRecords.some((item) => item.user_id === binding.user_id && item.date_key === today && item.status === "completed");
    const mindRecordToday = mindRecords.some((item) => item.user_id === binding.user_id && item.date_key === today);

    return {
      user_id: binding.user_id,
      nickname: profile.nickname || user.nickname || "知行同修",
      binding_id: binding.id,
      role: binding.role,
      joined_at: binding.created_at,
      streak: Number(profile.streak || 0),
      stage: profile.stage || "立志",
      today: {
        mind: mindToday,
        training: trainingToday,
        review: reviewToday,
        dojo_task: taskToday,
        assistant_mind: mindRecordToday
      },
      needs_follow_up: !mindToday || !trainingToday || !reviewToday
    };
  });

  return {
    mentor_user_id: normalizedMentorUserId,
    student_count: students.length,
    needs_follow_up_count: students.filter((item) => item.needs_follow_up).length,
    students
  };
}

async function ensureSeedTasks() {
  let saved;
  await updateRuntimeRecords(TASK_FILE, async (records) => {
    saved = await ensureSeedTasksInMemory(records);
    return saved;
  });
  return saved;
}

async function ensureSeedTasksInMemory(records) {
  const now = new Date().toISOString();
  const existingSeeds = new Set(records.map((item) => item.seed_id).filter(Boolean));
  const seeds = SEED_TASKS.filter((item) => !existingSeeds.has(item.seed_id)).map((item) => ({
    id: item.seed_id,
    creator_user_id: "system",
    title: item.title,
    discipline: item.discipline,
    action: item.action,
    personality_type: item.personality_type,
    stage: item.stage,
    target_role: item.target_role,
    status: "active",
    source_channel: "system_seed",
    seed_id: item.seed_id,
    created_at: now,
    updated_at: now
  }));
  return records.concat(seeds);
}

function withMentorUser(mentor, user) {
  return {
    ...mentor,
    role_label: roleLabel(mentor.role),
    user: user ? {
      id: user.id,
      nickname: user.nickname,
      personal_invite_code: user.personal_invite_code
    } : null
  };
}

function normalizeRole(role, allowEmpty = false) {
  const normalized = String(role || "").trim();
  if (!normalized && allowEmpty) return "";
  if (!MENTOR_ROLES.has(normalized)) throwStatus("role 必须是 coach 或 assistant", 400);
  return normalized;
}

function roleLabel(role) {
  return role === "assistant" ? "助教" : "训练营教练";
}

function createMentorCode(records) {
  const existing = new Set(records.map((item) => item.mentor_code).filter(Boolean));
  let code = "";
  do {
    code = `ZX${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  } while (existing.has(code));
  return code;
}

function requireUserId(userId) {
  const normalized = String(userId || "").trim();
  if (!normalized) throwStatus("user_id 不能为空", 400);
  return normalized;
}

function clampLimit(limit) {
  return Math.max(1, Math.min(Number(limit || 50), 200));
}

function addScore(scores, userId, score) {
  if (!userId) return;
  scores.set(userId, Number(scores.get(userId) || 0) + Number(score || 0));
}

function getPeriodStart(period) {
  const value = String(period || "week");
  if (value === "all") return null;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (value === "month") {
    date.setDate(date.getDate() - 30);
    return date;
  }
  date.setDate(date.getDate() - 7);
  return date;
}

function getLocalDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeJson(value, depth = 0) {
  if (depth > 8) return null;
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.slice(0, 2000);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitizeJson(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 120)
        .map(([key, item]) => [String(key).slice(0, 80), sanitizeJson(item, depth + 1)])
    );
  }
  return null;
}

function throwStatus(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}
