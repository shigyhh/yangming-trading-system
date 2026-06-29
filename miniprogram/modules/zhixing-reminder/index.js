const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_MAX_SESSION_REMINDERS = 2;
const { buildExecutionPlanLibrary, resolveExecutionPlanAction } = require("../execution-plan/index");
const {
  INTERVENTION_RESPONSE_CHOICES,
  buildInterventionContext,
  buildInterventionEventPayload,
  buildInterventionReminder,
  normalizeInterventionResources,
  normalizeInterventionResponse
} = require("../intervention-engine/index");

const ZHIXING_REMINDER_CHOICES = INTERVENTION_RESPONSE_CHOICES;

const ERROR_ACTION_MAP = [
  {
    match: ["追高冲动", "追涨", "追高", "怕错过", "冲动"],
    errorType: "追高冲动",
    sceneTags: ["放量拉升", "假突破", "冲高回落"],
    action: "第一根放量不追，先观察"
  },
  {
    match: ["补仓冲动", "补仓"],
    errorType: "补仓冲动",
    sceneTags: ["下跌中继", "反抽诱多"],
    action: "不在破位亏损中补仓"
  },
  {
    match: ["卖飞懊悔", "卖飞", "懊悔"],
    errorType: "卖飞懊悔",
    sceneTags: ["洗盘后走强", "趋势中继"],
    action: "按规则处理，不追回情绪单"
  },
  {
    match: ["计划外交易", "计划外", "临场", "无计划"],
    errorType: "计划外交易",
    sceneTags: ["横盘噪音", "突然异动"],
    action: "无计划不交易"
  }
];

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function pickValue(...values) {
  for (let index = 0; index < values.length; index += 1) {
    if (hasValue(values[index])) return values[index];
  }
  return "";
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function resolveTimestamp(record = {}) {
  const raw = pickValue(
    record.date,
    record.tradeDate,
    record.createdAt,
    record.created_at,
    record.updatedAt,
    record.updated_at
  );
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function isWithinDays(record = {}, now = Date.now(), days = DEFAULT_WINDOW_DAYS) {
  const time = resolveTimestamp(record);
  if (!time) return false;
  return time >= now - days * DAY_MS && time <= now + DAY_MS;
}

function readErrorType(record = {}) {
  return String(pickValue(
    record.errorType,
    record.error_type,
    record.mainErrorType,
    record.main_error_type,
    record.relatedMirror,
    record.relatedPersonality,
    record.personalityType
  ) || "").trim();
}

function readSceneTag(record = {}) {
  const sceneTags = normalizeList(pickValue(record.sceneTags, record.scene_tags));
  return String(pickValue(
    record.sceneTag,
    record.scene_tag,
    record.triggerScene,
    record.trigger_scene,
    sceneTags[0]
  ) || "").trim();
}

function readNextAction(record = {}) {
  return String(pickValue(
    record.nextAction,
    record.next_action,
    record.nextRule,
    record.next_rule,
    record.expectedAction,
    record.expected_action,
    record.trainingPrescription && record.trainingPrescription.action,
    record.training_prescription && record.training_prescription.action,
    record.trainingPrescription,
    record.training_prescription
  ) || "").trim();
}

function getActionPlan(errorType = "") {
  const text = String(errorType || "");
  const plan = ERROR_ACTION_MAP.find((item) => item.match.some((keyword) => text.includes(keyword)));
  return plan || {
    errorType: text || "高频旧题",
    sceneTags: [],
    action: "先停十秒，写下第一念和下次执行动作"
  };
}

function buildMessage(errorType, action) {
  const safeErrorType = String(errorType || "高频旧题").trim();
  const safeAction = String(action || "先停十秒，写下第一念和下次执行动作").trim();
  return `这是你的高频旧题：${safeErrorType}。\n本次只练一个动作：${safeAction}。`;
}

function readInterventionPlans(input = {}) {
  const remotePlans = pickValue(
    input.interventionPlans,
    input.intervention_plans,
    input.executionPlans,
    input.execution_plans,
    input.remoteExecutionPlans,
    input.remote_execution_plans
  );
  if (Array.isArray(remotePlans)) return remotePlans;
  const library = buildExecutionPlanLibrary(pickValue(
    input.executionPlanLibrary,
    input.execution_plan,
    input.executionPlan
  ) || {});
  return library.records || [];
}

function readInterventionRules(input = {}) {
  return pickValue(
    input.interventionRules,
    input.intervention_rules,
    input.rules
  ) || [];
}

function buildEngineReminder(input = {}, triggerType = "before_training") {
  const context = buildInterventionContext(Object.assign({}, input, {
    triggerType,
    trigger_type: triggerType
  }));
  const resources = normalizeInterventionResources({
    rulesResult: { intervention_rules: readInterventionRules(input) },
    plansResult: { execution_plans: readInterventionPlans(input) },
    dashboardResult: pickValue(input.dashboardSummary, input.dashboard_summary, input.p9DashboardSummary, input.p9_dashboard_summary),
    weeklyResult: pickValue(input.weeklySummary, input.weekly_summary)
  });
  return buildInterventionReminder({
    context,
    rules: resources.rules,
    plans: resources.plans,
    dashboardSummary: resources.dashboardSummary,
    weeklySummary: resources.weeklySummary
  });
}

function withSnakeAliases(reminder = {}) {
  return Object.assign({}, reminder, {
    trigger_type: reminder.triggerType,
    error_type: reminder.errorType,
    scene_tag: reminder.sceneTag,
    next_action: reminder.nextAction,
    repeat_count: reminder.repeatCount
  });
}

function buildTrainingPreReminder(input = {}) {
  const reminder = buildEngineReminder(input, "before_training");
  if (reminder) return withSnakeAliases(Object.assign({ repeatCount: 0 }, reminder));
  const errorType = readErrorType(input) || "高频旧题";
  const plan = getActionPlan(errorType);
  const nextAction = readNextAction(input) || plan.action;
  return withSnakeAliases({
    triggerType: "before_training",
    title: "知行提醒",
    errorType,
    sceneTag: readSceneTag(input) || plan.sceneTags[0] || "",
    nextAction,
    repeatCount: 0,
    message: buildMessage(errorType, nextAction),
    choices: ZHIXING_REMINDER_CHOICES
  });
}

function buildTrainingSceneReminder(input = {}) {
  const shownCount = Number(input.shownCount || input.shown_count || 0);
  const maxPerSession = Number(input.maxPerSession || input.max_per_session || DEFAULT_MAX_SESSION_REMINDERS);
  if (input.muted || input.muteSession || input.mute_session || shownCount >= maxPerSession) return null;
  const errorType = readErrorType(input);
  if (!errorType) return null;
  const plan = getActionPlan(errorType);
  const sceneTag = readSceneTag(input);
  if (sceneTag && plan.sceneTags.length && !plan.sceneTags.includes(sceneTag)) return null;
  const reminder = buildEngineReminder(input, "during_training");
  if (reminder) {
    return withSnakeAliases(Object.assign({
      repeatCount: shownCount + 1
    }, reminder));
  }
  const executionPlanAction = resolveExecutionPlanAction(errorType, pickValue(
    input.executionPlanLibrary,
    input.execution_plan,
    input.executionPlan
  ));
  const nextAction = (executionPlanAction || {}).nextAction || readNextAction(input) || plan.action;
  return withSnakeAliases({
    triggerType: "during_training",
    title: "暂停一下",
    errorType,
    sceneTag: sceneTag || plan.sceneTags[0] || "",
    nextAction,
    repeatCount: shownCount + 1,
    message: buildMessage(errorType, nextAction),
    choices: ZHIXING_REMINDER_CHOICES
  });
}

function buildReviewRepeatReminder(input = {}) {
  const currentRecord = input.currentRecord || input.current_record || {};
  const errorType = readErrorType(currentRecord);
  if (!errorType) return null;
  const now = Number(input.now || Date.now());
  const threshold = Number(input.threshold || 2);
  const records = Array.isArray(input.records) ? input.records : [];
  const recentSameRecords = records
    .concat(currentRecord)
    .filter((record) => record && readErrorType(record) === errorType)
    .filter((record) => isWithinDays(record, now));
  const uniqueIds = {};
  const repeatCount = recentSameRecords.filter((record) => {
    const key = record.id || `${readErrorType(record)}-${resolveTimestamp(record) || ""}-${readSceneTag(record)}`;
    if (uniqueIds[key]) return false;
    uniqueIds[key] = true;
    return true;
  }).length;
  if (repeatCount < threshold) return null;
  const plan = getActionPlan(errorType);
  const executionPlanAction = resolveExecutionPlanAction(errorType, pickValue(
    input.executionPlanLibrary,
    input.execution_plan,
    input.executionPlan
  ));
  const nextAction = (executionPlanAction || {}).nextAction || readNextAction(currentRecord) || plan.action;
  const sceneTag = readSceneTag(currentRecord) || plan.sceneTags[0] || "";
  const reminder = buildEngineReminder(Object.assign({}, currentRecord, input, {
    triggerType: "after_review",
    trigger_type: "after_review",
    errorType,
    error_type: errorType,
    sceneTag,
    scene_tag: sceneTag,
    nextAction,
    next_action: nextAction
  }), "after_review");
  return withSnakeAliases(Object.assign({
    triggerType: "after_review",
    title: "旧题复现提醒",
    errorType,
    sceneTag,
    nextAction,
    repeatCount,
    message: `旧题复现提醒：近 ${DEFAULT_WINDOW_DAYS} 天，${errorType} 已出现 ${repeatCount} 次。\n下次执行动作：${nextAction}。`,
    choices: ZHIXING_REMINDER_CHOICES
  }, reminder || {}));
}

function normalizeZhixingReminderResponse(response) {
  return normalizeInterventionResponse(response);
}

function createInterventionEvent(input = {}) {
  const createdAt = input.createdAt || input.created_at || new Date().toISOString();
  const id = input.id || `intervention-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const userId = input.userId || input.user_id || "";
  const event = buildInterventionEventPayload({
    reminder: input,
    context: input,
    userId,
    userResponse: input.userResponse || input.user_response || "",
    createdAt,
    id
  });
  const sceneTag = input.sceneTag || input.scene_tag || input.triggerScene || input.trigger_scene || "";
  event.sceneTag = sceneTag;
  event.scene_tag = sceneTag;
  return event;
}

module.exports = {
  ZHIXING_REMINDER_CHOICES,
  buildTrainingPreReminder,
  buildTrainingSceneReminder,
  buildReviewRepeatReminder,
  createInterventionEvent,
  normalizeZhixingReminderResponse
};
