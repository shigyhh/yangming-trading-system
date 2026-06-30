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
  normalizeInterventionResponse,
  sanitizeInterventionMessage
} = require("../intervention-engine/index");

const ZHIXING_REMINDER_CHOICES = INTERVENTION_RESPONSE_CHOICES;
const AFTER_REVIEW_RESPONSE_CHOICES = [
  { key: "continue", label: "我知道了" },
  { key: "review_to_training", label: "进入针对训练", userResponse: "continue" },
  { key: "later", label: "稍后再练" },
  { key: "mute_session", label: "本次不再提醒" },
  { key: "followed_plan", label: "已按计划执行" },
  { key: "deviated_again", label: "仍然偏离" },
  { key: "unclear", label: "说不清" }
];

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

function readReviewId(record = {}) {
  return String(pickValue(record.reviewId, record.review_id, record.id) || "").trim();
}

function readFirstThought(record = {}) {
  return String(pickValue(record.firstThought, record.first_thought) || "").trim();
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

function readSceneTags(record = {}) {
  return Array.from(new Set(normalizeList(pickValue(record.sceneTags, record.scene_tags))
    .concat(readSceneTag(record))
    .filter(Boolean)));
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

function readExecutionResult(record = {}) {
  return String(pickValue(
    record.executionResult,
    record.execution_result,
    record.lawResult,
    record.law_result,
    record.boundaryState,
    record.boundary_state
  ) || "").trim();
}

function isExecutionDeviation(record = {}) {
  const text = readExecutionResult(record);
  return /deviated|broken|lost|偏离|失守|计划外/.test(text);
}

function buildRecordKey(record = {}) {
  return readReviewId(record) || [
    readErrorType(record),
    readFirstThought(record),
    readSceneTag(record),
    resolveTimestamp(record) || ""
  ].join("|");
}

function sameText(left = "", right = "") {
  return String(left || "").trim() === String(right || "").trim();
}

function sameDay(left, right) {
  if (!left || !right) return false;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) return false;
  return leftDate.getFullYear() === rightDate.getFullYear()
    && leftDate.getMonth() === rightDate.getMonth()
    && leftDate.getDate() === rightDate.getDate();
}

function uniqueRecentRecords(currentRecord = {}, records = [], now = Date.now(), days = DEFAULT_WINDOW_DAYS) {
  const currentKey = buildRecordKey(currentRecord);
  const seen = {};
  return (Array.isArray(records) ? records : [])
    .concat(currentRecord)
    .filter(Boolean)
    .filter((record) => {
      const key = buildRecordKey(record);
      if (key && seen[key]) return false;
      if (key) seen[key] = true;
      if (key && currentKey && key === currentKey) return true;
      return isWithinDays(record, now, days);
    });
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

function buildAfterReviewRepeatInsights(input = {}) {
  const currentRecord = input.currentRecord || input.current_record || {};
  const now = Number(input.now || Date.now());
  const windowDays = Number(input.windowDays || input.window_days || DEFAULT_WINDOW_DAYS);
  const threshold = Number(input.threshold || 2);
  const records = uniqueRecentRecords(currentRecord, input.records || [], now, windowDays);
  const errorType = readErrorType(currentRecord);
  const firstThought = readFirstThought(currentRecord);
  const currentScenes = readSceneTags(currentRecord);
  const repeatErrorTypeCount = errorType
    ? records.filter((record) => sameText(readErrorType(record), errorType)).length
    : 0;
  const repeatFirstThoughtCount = firstThought
    ? records.filter((record) => sameText(readFirstThought(record), firstThought)).length
    : 0;
  const repeatTriggerSceneCount = currentScenes.length
    ? records.filter((record) => {
      const scenes = readSceneTags(record);
      return scenes.some((scene) => currentScenes.some((currentScene) => sameText(scene, currentScene)));
    }).length
    : 0;
  const repeatExecutionDeviationCount = isExecutionDeviation(currentRecord)
    ? records.filter(isExecutionDeviation).length
    : 0;
  const repeatDimensions = [
    repeatErrorTypeCount >= threshold ? "error_type" : "",
    repeatFirstThoughtCount >= threshold ? "first_thought" : "",
    repeatTriggerSceneCount >= threshold ? "trigger_scene" : "",
    repeatExecutionDeviationCount >= threshold ? "execution_deviation" : ""
  ].filter(Boolean);
  return {
    windowDays,
    range: `${windowDays}d`,
    threshold,
    sampleCount: records.length,
    errorType,
    firstThought,
    triggerScene: currentScenes[0] || "",
    sceneTags: currentScenes,
    repeatErrorTypeCount,
    repeatFirstThoughtCount,
    repeatTriggerSceneCount,
    repeatExecutionDeviationCount,
    repeatDimensions,
    hasRepeat: repeatDimensions.length > 0,
    sampleEnough: records.length >= threshold
  };
}

function buildAfterReviewRepeatMessage({
  errorType = "",
  firstThought = "",
  triggerScene = "",
  insights = {},
  nextAction = ""
} = {}) {
  const lines = [];
  if (insights.repeatErrorTypeCount >= insights.threshold) {
    lines.push(`这不是第一次出现。近 ${insights.windowDays || DEFAULT_WINDOW_DAYS} 天，${errorType || "这类错题"} 已出现 ${insights.repeatErrorTypeCount} 次。`);
  } else {
    lines.push("这类旧题最近又出现了。");
  }
  if (firstThought && insights.repeatFirstThoughtCount >= insights.threshold) {
    lines.push(`你的第一念又落在「${firstThought}」上。`);
  }
  if (triggerScene && insights.repeatTriggerSceneCount >= insights.threshold) {
    lines.push(`这个场景最近反复触发你：${triggerScene}。`);
  }
  if (insights.repeatExecutionDeviationCount >= insights.threshold) {
    lines.push("这次先看见执行偏离，不急着证明自己。");
  }
  lines.push(`本次只记一个动作：${nextAction || "先记录，再行动"}。`);
  lines.push("当前只做复盘提醒，不是买卖建议。");
  return sanitizeInterventionMessage(lines.join("\n"));
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
    source_type: reminder.sourceType,
    review_id: reminder.reviewId,
    error_type: reminder.errorType,
    first_thought: reminder.firstThought,
    scene_tags: reminder.sceneTags,
    scene_tag: reminder.sceneTag,
    trigger_scene: reminder.triggerScene,
    expected_action: reminder.expectedAction,
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
  const insights = buildAfterReviewRepeatInsights(Object.assign({}, input, { now, threshold }));
  if (!insights.hasRepeat) return null;
  const plan = getActionPlan(errorType);
  const executionPlanAction = resolveExecutionPlanAction(errorType, pickValue(
    input.executionPlanLibrary,
    input.execution_plan,
    input.executionPlan
  ));
  const expectedAction = (executionPlanAction || {}).expectedAction || readNextAction(currentRecord) || plan.action;
  const nextAction = (executionPlanAction || {}).nextAction || expectedAction;
  const sceneTags = insights.sceneTags.length ? insights.sceneTags : plan.sceneTags;
  const sceneTag = insights.triggerScene || sceneTags[0] || "";
  const reviewId = readReviewId(currentRecord);
  const firstThought = insights.firstThought;
  const executionResult = readExecutionResult(currentRecord);
  const metadata = {
    repeatErrorTypeCount: insights.repeatErrorTypeCount,
    repeatFirstThoughtCount: insights.repeatFirstThoughtCount,
    repeatTriggerSceneCount: insights.repeatTriggerSceneCount,
    repeatExecutionDeviationCount: insights.repeatExecutionDeviationCount,
    repeatDimensions: insights.repeatDimensions,
    sampleCount: insights.sampleCount,
    threshold: insights.threshold,
    range: insights.range,
    reviewId,
    review_id: reviewId,
    reminderSource: "after_review_repeat",
    reminder_source: "after_review_repeat"
  };
  const reminder = buildEngineReminder(Object.assign({}, currentRecord, input, {
    triggerType: "after_review",
    trigger_type: "after_review",
    sourceType: "trade_review",
    source_type: "trade_review",
    reviewId,
    review_id: reviewId,
    errorType,
    error_type: errorType,
    firstThought,
    first_thought: firstThought,
    sceneTags,
    scene_tags: sceneTags,
    sceneTag,
    scene_tag: sceneTag,
    triggerScene: sceneTag,
    trigger_scene: sceneTag,
    expectedAction,
    expected_action: expectedAction,
    nextAction,
    next_action: nextAction,
    executionResult,
    execution_result: executionResult
  }), "after_review");
  return withSnakeAliases(Object.assign({}, reminder || {}, {
    triggerType: "after_review",
    sourceType: "trade_review",
    reviewId,
    title: "旧题复现提醒",
    errorType,
    firstThought,
    sceneTags,
    sceneTag,
    triggerScene: sceneTag,
    expectedAction,
    nextAction,
    repeatCount: Math.max(
      insights.repeatErrorTypeCount,
      insights.repeatFirstThoughtCount,
      insights.repeatTriggerSceneCount,
      insights.repeatExecutionDeviationCount
    ),
    metadata,
    message: buildAfterReviewRepeatMessage({
      errorType,
      firstThought,
      triggerScene: sceneTag,
      insights,
      nextAction
    }),
    choices: AFTER_REVIEW_RESPONSE_CHOICES
  }));
}

function normalizeZhixingReminderResponse(response) {
  const value = String(response || "").trim();
  if (value === "我知道了" || value === "进入针对训练") return "continue";
  if (value === "本次不再提醒") return "mute_session";
  return normalizeInterventionResponse(value);
}

function isAfterReviewEvent(event = {}) {
  const triggerType = String(pickValue(event.triggerType, event.trigger_type) || "").trim();
  const source = String(((event.metadata || {}).reminderSource || (event.metadata || {}).reminder_source || "")).trim();
  return triggerType === "after_review" || triggerType === "repeated_mistake" || source === "after_review_repeat";
}

function shouldShowAfterReviewRepeatReminder({
  reminder = {},
  existingEvents = [],
  muted = false,
  now = Date.now()
} = {}) {
  if (muted) return { show: false, reason: "muted" };
  const reviewId = readReviewId(reminder);
  const errorType = readErrorType(reminder);
  const currentTime = resolveTimestamp(reminder) || Number(now || Date.now());
  const events = Array.isArray(existingEvents) ? existingEvents : [];
  if (reviewId && events.some((event) => isAfterReviewEvent(event) && readReviewId(event) === reviewId)) {
    return { show: false, reason: "review_id" };
  }
  if (errorType && events.some((event) => {
    if (!isAfterReviewEvent(event) || readErrorType(event) !== errorType) return false;
    const eventTime = resolveTimestamp(event);
    return eventTime && sameDay(eventTime, currentTime);
  })) {
    return { show: false, reason: "daily_error_type" };
  }
  return { show: true, reason: "" };
}

function createInterventionEvent(input = {}) {
  const createdAt = input.createdAt || input.created_at || new Date().toISOString();
  const id = input.id || `intervention-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const userId = input.userId || input.user_id || "";
  const userResponse = normalizeZhixingReminderResponse(input.userResponse || input.user_response || "");
  const event = buildInterventionEventPayload({
    reminder: input,
    context: input,
    userId,
    userResponse,
    createdAt,
    id
  });
  const sceneTag = input.sceneTag || input.scene_tag || input.triggerScene || input.trigger_scene || "";
  event.sceneTag = sceneTag;
  event.scene_tag = sceneTag;
  return event;
}

module.exports = {
  AFTER_REVIEW_RESPONSE_CHOICES,
  ZHIXING_REMINDER_CHOICES,
  buildAfterReviewRepeatInsights,
  buildTrainingPreReminder,
  buildTrainingSceneReminder,
  buildReviewRepeatReminder,
  createInterventionEvent,
  normalizeZhixingReminderResponse,
  shouldShowAfterReviewRepeatReminder
};
