const DEFAULT_MAX_PER_SESSION = 2;
const DEFAULT_COOLDOWN_MS = 60 * 1000;

const INTERVENTION_RESPONSE_CHOICES = [
  { key: "continue", label: "继续" },
  { key: "change_to_hold", label: "改为观望" },
  { key: "later", label: "稍后再练" },
  { key: "mute_session", label: "本局不再提醒" },
  { key: "followed_plan", label: "已按计划执行" },
  { key: "deviated_again", label: "仍然偏离" },
  { key: "unclear", label: "说不清" }
];

const FORBIDDEN_TRADING_SIGNAL_TERMS = [
  "建议买入",
  "建议卖出",
  "现在可以买",
  "现在该卖",
  "目标价",
  "止盈",
  "止损建议",
  "明日看涨",
  "明日看跌",
  "预测涨跌",
  "买入信号",
  "卖出信号"
];

const SAFE_DEFAULT_ACTION = "按你的执行计划处理，先记录，再行动";
const SAFE_DEFAULT_MESSAGE = `先停一下，这可能是你的高频旧题。\n本次只练一个动作：${SAFE_DEFAULT_ACTION}。\n当前只做训练提醒，不是买卖建议。`;

const DEFAULT_INTERVENTION_RULES = [
  {
    id: "default-before-training",
    title: "训练前知行提醒",
    triggerType: "before_training",
    trigger_type: "before_training",
    messageTemplate: "先停一下，这可能是你的高频旧题：{{errorType}}。\n本次只练一个动作：{{expectedAction}}。",
    message_template: "先停一下，这可能是你的高频旧题：{{errorType}}。\n本次只练一个动作：{{expectedAction}}。",
    priority: 10,
    maxPerSession: 2,
    max_per_session: 2,
    cooldownMinutes: 1,
    cooldown_minutes: 1,
    enabled: true
  },
  {
    id: "default-during-training",
    title: "训练中暂停提醒",
    triggerType: "during_training",
    trigger_type: "during_training",
    messageTemplate: "先停一下，当前场景可能触发{{errorType}}。\n按你的执行计划处理：{{expectedAction}}。",
    message_template: "先停一下，当前场景可能触发{{errorType}}。\n按你的执行计划处理：{{expectedAction}}。",
    priority: 8,
    maxPerSession: 2,
    max_per_session: 2,
    cooldownMinutes: 1,
    cooldown_minutes: 1,
    enabled: true
  },
  {
    id: "default-after-review",
    title: "旧题复现提醒",
    triggerType: "after_review",
    trigger_type: "after_review",
    messageTemplate: "旧题复现提醒：{{errorType}}。\n{{repeatSignal}}下次执行动作：{{expectedAction}}。",
    message_template: "旧题复现提醒：{{errorType}}。\n{{repeatSignal}}下次执行动作：{{expectedAction}}。",
    priority: 8,
    maxPerSession: 2,
    max_per_session: 2,
    cooldownMinutes: 1,
    cooldown_minutes: 1,
    enabled: true
  },
  {
    id: "default-weekly-plan",
    title: "下周训练提醒",
    triggerType: "weekly_plan",
    trigger_type: "weekly_plan",
    messageTemplate: "下周训练先聚焦：{{errorType}}。\n本次只练一个动作：{{expectedAction}}。",
    message_template: "下周训练先聚焦：{{errorType}}。\n本次只练一个动作：{{expectedAction}}。",
    priority: 6,
    maxPerSession: 1,
    max_per_session: 1,
    cooldownMinutes: 30,
    cooldown_minutes: 30,
    enabled: true
  }
];

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function pickValue() {
  for (let index = 0; index < arguments.length; index += 1) {
    const value = arguments[index];
    if (hasValue(value)) return value;
  }
  return "";
}

function cleanText(value, maxLength = 240) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item, 120)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[、,，/]/).map((item) => cleanText(item, 120)).filter(Boolean);
  }
  return [];
}

function normalizeBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return true;
}

function normalizeNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeInterventionResponse(response) {
  const value = cleanText(response, 80);
  const match = INTERVENTION_RESPONSE_CHOICES.find((item) => item.key === value || item.label === value);
  return match ? match.key : value;
}

function withAlias(target, camelKey, snakeKey, value) {
  if (!hasValue(value)) return target;
  target[camelKey] = value;
  target[snakeKey] = value;
  return target;
}

function normalizeInterventionRule(rule = {}) {
  const triggerType = cleanText(pickValue(rule.triggerType, rule.trigger_type), 80);
  const errorType = cleanText(pickValue(rule.errorType, rule.error_type), 100);
  const sceneTags = normalizeList(pickValue(rule.sceneTags, rule.scene_tags));
  const expectedAction = cleanText(pickValue(rule.expectedAction, rule.expected_action), 180);
  const messageTemplate = cleanText(pickValue(rule.messageTemplate, rule.message_template, rule.template, rule.message), 320);
  const title = cleanText(rule.title || "知行提醒", 80);
  const maxPerSession = normalizeNumber(pickValue(rule.maxPerSession, rule.max_per_session), DEFAULT_MAX_PER_SESSION);
  const cooldownMinutes = normalizeNumber(pickValue(rule.cooldownMinutes, rule.cooldown_minutes), 1);
  const priority = normalizeNumber(rule.priority, 0);
  const normalized = {
    id: cleanText(rule.id || "", 120),
    title,
    enabled: normalizeBoolean(rule.enabled, true),
    priority,
    maxPerSession,
    max_per_session: maxPerSession,
    cooldownMinutes,
    cooldown_minutes: cooldownMinutes
  };
  withAlias(normalized, "userId", "user_id", cleanText(pickValue(rule.userId, rule.user_id), 120));
  withAlias(normalized, "triggerType", "trigger_type", triggerType);
  withAlias(normalized, "errorType", "error_type", errorType);
  withAlias(normalized, "sceneTags", "scene_tags", sceneTags);
  withAlias(normalized, "messageTemplate", "message_template", messageTemplate);
  withAlias(normalized, "expectedAction", "expected_action", expectedAction);
  return normalized;
}

function normalizeExecutionPlan(plan = {}) {
  const errorType = cleanText(pickValue(plan.errorType, plan.error_type), 100);
  const sceneTags = normalizeList(pickValue(plan.sceneTags, plan.scene_tags));
  const firstThoughts = normalizeList(pickValue(plan.firstThoughts, plan.first_thoughts));
  const forbiddenActions = normalizeList(pickValue(plan.forbiddenActions, plan.forbidden_actions));
  const expectedAction = cleanText(pickValue(plan.expectedAction, plan.expected_action, plan.nextAction, plan.next_action), 180);
  const nextAction = cleanText(pickValue(plan.nextAction, plan.next_action, expectedAction), 180);
  const trainingPrescription = cleanText(pickValue(plan.trainingPrescription, plan.training_prescription), 180);
  const normalized = {
    id: cleanText(plan.id || "", 120),
    title: cleanText(plan.title || (errorType ? `${errorType}执行计划` : "执行计划"), 120),
    source: cleanText(plan.source || "", 80),
    enabled: normalizeBoolean(plan.enabled, true)
  };
  withAlias(normalized, "userId", "user_id", cleanText(pickValue(plan.userId, plan.user_id), 120));
  withAlias(normalized, "errorType", "error_type", errorType);
  withAlias(normalized, "sceneTags", "scene_tags", sceneTags);
  withAlias(normalized, "firstThoughts", "first_thoughts", firstThoughts);
  withAlias(normalized, "forbiddenActions", "forbidden_actions", forbiddenActions);
  withAlias(normalized, "expectedAction", "expected_action", expectedAction);
  withAlias(normalized, "nextAction", "next_action", nextAction);
  withAlias(normalized, "trainingPrescription", "training_prescription", trainingPrescription);
  return normalized;
}

function normalizeInterventionEvent(event = {}) {
  const triggerType = cleanText(pickValue(event.triggerType, event.trigger_type), 80);
  const sourceType = cleanText(pickValue(event.sourceType, event.source_type), 80);
  const errorType = cleanText(pickValue(event.errorType, event.error_type), 100);
  const sceneTags = normalizeList(pickValue(event.sceneTags, event.scene_tags));
  const userResponse = normalizeInterventionResponse(pickValue(event.userResponse, event.user_response));
  const message = sanitizeInterventionMessage(event.message || "");
  const normalized = {
    id: cleanText(event.id || "", 140),
    message,
    metadata: event.metadata || {},
    createdAt: event.createdAt || event.created_at || "",
    created_at: event.created_at || event.createdAt || ""
  };
  withAlias(normalized, "userId", "user_id", cleanText(pickValue(event.userId, event.user_id), 120));
  withAlias(normalized, "triggerType", "trigger_type", triggerType);
  withAlias(normalized, "sourceType", "source_type", sourceType);
  withAlias(normalized, "sessionId", "session_id", cleanText(pickValue(event.sessionId, event.session_id), 140));
  withAlias(normalized, "reviewId", "review_id", cleanText(pickValue(event.reviewId, event.review_id), 140));
  withAlias(normalized, "planId", "plan_id", cleanText(pickValue(event.planId, event.plan_id), 140));
  withAlias(normalized, "errorType", "error_type", errorType);
  withAlias(normalized, "firstThought", "first_thought", cleanText(pickValue(event.firstThought, event.first_thought), 180));
  withAlias(normalized, "sceneTags", "scene_tags", sceneTags);
  withAlias(normalized, "triggerScene", "trigger_scene", cleanText(pickValue(event.triggerScene, event.trigger_scene), 160));
  withAlias(normalized, "suggestedAction", "suggested_action", cleanText(pickValue(event.suggestedAction, event.suggested_action), 180));
  withAlias(normalized, "expectedAction", "expected_action", cleanText(pickValue(event.expectedAction, event.expected_action), 180));
  withAlias(normalized, "userResponse", "user_response", userResponse);
  withAlias(normalized, "executionResult", "execution_result", cleanText(pickValue(event.executionResult, event.execution_result), 80));
  return normalized;
}

function buildInterventionContext(input = {}) {
  const sceneTags = normalizeList(pickValue(input.sceneTags, input.scene_tags));
  const context = {};
  withAlias(context, "triggerType", "trigger_type", cleanText(pickValue(input.triggerType, input.trigger_type), 80));
  withAlias(context, "sourceType", "source_type", cleanText(pickValue(input.sourceType, input.source_type), 80));
  withAlias(context, "sessionId", "session_id", cleanText(pickValue(input.sessionId, input.session_id), 140));
  withAlias(context, "reviewId", "review_id", cleanText(pickValue(input.reviewId, input.review_id), 140));
  withAlias(context, "planId", "plan_id", cleanText(pickValue(input.planId, input.plan_id, input.executionPlanId, input.execution_plan_id), 140));
  withAlias(context, "errorType", "error_type", cleanText(pickValue(input.errorType, input.error_type, input.mainErrorType, input.main_error_type), 100));
  withAlias(context, "firstThought", "first_thought", cleanText(pickValue(input.firstThought, input.first_thought), 180));
  withAlias(context, "sceneTags", "scene_tags", sceneTags);
  withAlias(context, "triggerScene", "trigger_scene", cleanText(pickValue(input.triggerScene, input.trigger_scene, input.sceneTag, input.scene_tag, sceneTags[0]), 160));
  withAlias(context, "expectedAction", "expected_action", cleanText(pickValue(input.expectedAction, input.expected_action), 180));
  withAlias(context, "nextAction", "next_action", cleanText(pickValue(input.nextAction, input.next_action), 180));
  withAlias(context, "userAction", "user_action", cleanText(pickValue(input.userAction, input.user_action, input.boundaryChoice, input.boundary_choice), 100));
  withAlias(context, "executionResult", "execution_result", cleanText(pickValue(input.executionResult, input.execution_result), 80));
  withAlias(context, "fallbackReason", "fallback_reason", cleanText(pickValue(input.fallbackReason, input.fallback_reason), 160));
  context.samplingResult = pickValue(input.samplingResult, input.sampling_result, null) || null;
  context.sampling_result = pickValue(input.sampling_result, input.samplingResult, null) || null;
  context.fallbackUsed = !!pickValue(input.fallbackUsed, input.fallback_used, false);
  context.fallback_used = !!pickValue(input.fallback_used, input.fallbackUsed, false);
  return context;
}

function textMatches(left = "", right = "") {
  const a = cleanText(left, 120);
  const b = cleanText(right, 120);
  if (!a || !b) return true;
  return a === b || a.includes(b) || b.includes(a);
}

function sceneMatches(context = {}, rule = {}) {
  const ruleScenes = normalizeList(pickValue(rule.sceneTags, rule.scene_tags));
  if (!ruleScenes.length) return true;
  const contextScenes = normalizeList(pickValue(context.sceneTags, context.scene_tags, context.triggerScene, context.trigger_scene));
  return ruleScenes.some((ruleScene) => contextScenes.some((scene) => textMatches(scene, ruleScene)));
}

function resolveExecutionPlanForContext(context = {}, plans = []) {
  const normalizedPlans = (Array.isArray(plans) ? plans : []).map(normalizeExecutionPlan).filter((plan) => plan.enabled !== false);
  const planId = cleanText(pickValue(context.planId, context.plan_id), 140);
  if (planId) {
    const exact = normalizedPlans.find((plan) => plan.id === planId);
    if (exact) return exact;
  }
  const errorType = cleanText(pickValue(context.errorType, context.error_type), 100);
  const customMatch = normalizedPlans.find((plan) => plan.source !== "default" && textMatches(errorType, plan.errorType || plan.error_type));
  if (customMatch) return customMatch;
  return normalizedPlans.find((plan) => textMatches(errorType, plan.errorType || plan.error_type)) || null;
}

function resolveInterventionRulesForContext(context = {}, rules = []) {
  const triggerType = cleanText(pickValue(context.triggerType, context.trigger_type), 80);
  const errorType = cleanText(pickValue(context.errorType, context.error_type), 100);
  return (Array.isArray(rules) ? rules : [])
    .map(normalizeInterventionRule)
    .filter((rule) => rule.enabled !== false)
    .filter((rule) => !rule.triggerType || rule.triggerType === triggerType)
    .filter((rule) => textMatches(errorType, rule.errorType || rule.error_type))
    .filter((rule) => sceneMatches(context, rule))
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
}

function findTopMatch(items = [], value = "") {
  const text = cleanText(value, 160);
  if (!text || !Array.isArray(items)) return null;
  return items.find((item) => textMatches(text, item.key || item.value || item.label) && Number(item.count || item.valueCount || 0) >= 2) || null;
}

function buildRepeatSignal(context = {}, dashboardSummary = {}) {
  const firstThoughtMatch = findTopMatch(
    (((dashboardSummary.firstThoughts || {}).topFirstThoughts) || []),
    context.firstThought || context.first_thought
  );
  const triggerSceneMatch = findTopMatch(
    (((dashboardSummary.triggerScenes || {}).topTriggerScenes) || []),
    context.triggerScene || context.trigger_scene
  );
  return [
    firstThoughtMatch ? `第一念重复：${firstThoughtMatch.key || firstThoughtMatch.value || context.firstThought}。` : "",
    triggerSceneMatch ? `触发场景重复：${triggerSceneMatch.key || triggerSceneMatch.value || context.triggerScene}。` : ""
  ].filter(Boolean).join("");
}

function getDefaultAction(errorType = "") {
  const text = cleanText(errorType, 100);
  if (/追高|追涨|怕错过/.test(text)) return "第一根放量不追，先观察";
  if (/补仓/.test(text)) return "不在破位亏损中补仓";
  if (/卖飞|懊悔/.test(text)) return "按计划处理，不追回情绪单";
  if (/计划外|无计划/.test(text)) return "无计划不交易，先记录";
  return SAFE_DEFAULT_ACTION;
}

function hasForbiddenTradingSignal(message = "") {
  const text = String(message || "");
  return FORBIDDEN_TRADING_SIGNAL_TERMS.some((term) => text.includes(term));
}

function sanitizeInterventionMessage(message = "") {
  const text = cleanText(message, 600);
  if (!text || hasForbiddenTradingSignal(text)) return SAFE_DEFAULT_MESSAGE;
  return text;
}

function interpolate(template = "", variables = {}) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = variables[key];
    if (Array.isArray(value)) return value.join(" / ");
    return value === undefined || value === null ? "" : String(value);
  });
}

function buildInterventionMessage(context = {}, rule = {}, plan = null, dashboardSummary = {}, weeklySummary = {}) {
  const errorType = cleanText(pickValue(context.errorType, context.error_type, plan && plan.errorType, plan && plan.error_type, "高频旧题"), 100);
  const expectedAction = cleanText(pickValue(
    plan && plan.expectedAction,
    plan && plan.expected_action,
    plan && plan.nextAction,
    plan && plan.next_action,
    context.expectedAction,
    context.expected_action,
    context.nextAction,
    context.next_action,
    rule.expectedAction,
    rule.expected_action,
    getDefaultAction(errorType)
  ), 180);
  const repeatSignal = buildRepeatSignal(context, dashboardSummary);
  const weeklyPlan = pickValue(
    weeklySummary.nextWeekTrainingPlan,
    weeklySummary.next_week_training_plan,
    weeklySummary.trainingPlan,
    weeklySummary.training_plan,
    ""
  );
  const template = pickValue(rule.messageTemplate, rule.message_template, DEFAULT_INTERVENTION_RULES[0].messageTemplate);
  return sanitizeInterventionMessage(interpolate(template, {
    errorType,
    error_type: errorType,
    expectedAction,
    expected_action: expectedAction,
    nextAction: expectedAction,
    next_action: expectedAction,
    repeatSignal,
    repeat_signal: repeatSignal,
    weeklyPlan,
    weekly_plan: weeklyPlan
  }));
}

function buildInterventionReminder({
  context: rawContext = {},
  rules = [],
  plans = [],
  dashboardSummary = null,
  weeklySummary = null
} = {}) {
  const context = buildInterventionContext(rawContext);
  const triggerType = context.triggerType || context.trigger_type;
  if (!triggerType) return null;
  const plan = resolveExecutionPlanForContext(context, plans);
  const defaultRules = DEFAULT_INTERVENTION_RULES.map(normalizeInterventionRule);
  const matchedRules = resolveInterventionRulesForContext(context, rules.length ? rules : defaultRules);
  const fallbackRule = defaultRules.find((rule) => rule.triggerType === triggerType) || defaultRules[0];
  const rule = matchedRules[0] || fallbackRule;
  const errorType = cleanText(pickValue(context.errorType, context.error_type, plan && plan.errorType, plan && plan.error_type, "高频旧题"), 100);
  const expectedAction = cleanText(pickValue(
    plan && plan.expectedAction,
    plan && plan.expected_action,
    plan && plan.nextAction,
    plan && plan.next_action,
    context.expectedAction,
    context.expected_action,
    context.nextAction,
    context.next_action,
    rule.expectedAction,
    rule.expected_action,
    getDefaultAction(errorType)
  ), 180);
  const message = buildInterventionMessage(context, rule, plan, dashboardSummary || {}, weeklySummary || {});
  const sceneTags = normalizeList(pickValue(context.sceneTags, context.scene_tags, rule.sceneTags, rule.scene_tags));
  const reminder = {
    id: `intervention-reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: rule.title || "知行提醒",
    triggerType,
    trigger_type: triggerType,
    sourceType: context.sourceType || context.source_type || "",
    source_type: context.source_type || context.sourceType || "",
    sessionId: context.sessionId || context.session_id || "",
    session_id: context.session_id || context.sessionId || "",
    reviewId: context.reviewId || context.review_id || "",
    review_id: context.review_id || context.reviewId || "",
    planId: (plan && plan.id) || context.planId || context.plan_id || "",
    plan_id: (plan && plan.id) || context.plan_id || context.planId || "",
    ruleId: rule.id || "",
    rule_id: rule.id || "",
    errorType,
    error_type: errorType,
    firstThought: context.firstThought || context.first_thought || "",
    first_thought: context.first_thought || context.firstThought || "",
    sceneTags,
    scene_tags: sceneTags,
    sceneTag: context.triggerScene || context.trigger_scene || sceneTags[0] || "",
    scene_tag: context.trigger_scene || context.triggerScene || sceneTags[0] || "",
    triggerScene: context.triggerScene || context.trigger_scene || "",
    trigger_scene: context.trigger_scene || context.triggerScene || "",
    expectedAction,
    expected_action: expectedAction,
    suggestedAction: expectedAction,
    suggested_action: expectedAction,
    nextAction: expectedAction,
    next_action: expectedAction,
    executionResult: context.executionResult || context.execution_result || "",
    execution_result: context.execution_result || context.executionResult || "",
    message,
    maxPerSession: rule.maxPerSession || DEFAULT_MAX_PER_SESSION,
    max_per_session: rule.max_per_session || rule.maxPerSession || DEFAULT_MAX_PER_SESSION,
    cooldownMinutes: rule.cooldownMinutes || 1,
    cooldown_minutes: rule.cooldown_minutes || rule.cooldownMinutes || 1,
    choices: INTERVENTION_RESPONSE_CHOICES
  };
  return reminder;
}

function shouldShowIntervention(context = {}, state = {}) {
  const normalizedContext = buildInterventionContext(context);
  const triggerType = normalizedContext.triggerType || normalizedContext.trigger_type || "";
  const errorType = normalizedContext.errorType || normalizedContext.error_type || "";
  const key = `${triggerType}:${errorType}`;
  if (state.muted || state.muteSession || state.mute_session) {
    return { show: false, reason: "muted", key };
  }
  const maxPerSession = normalizeNumber(pickValue(state.maxPerSession, state.max_per_session), DEFAULT_MAX_PER_SESSION);
  const shownCount = normalizeNumber(pickValue(state.shownCount, state.shown_count), 0);
  if (shownCount >= maxPerSession) {
    return { show: false, reason: "max_per_session", key };
  }
  const cooldownMs = normalizeNumber(pickValue(state.cooldownMs, state.cooldown_ms), DEFAULT_COOLDOWN_MS);
  const now = normalizeNumber(state.now, Date.now());
  const lastShownAtByKey = state.lastShownAtByKey || state.last_shown_at_by_key || {};
  const lastShownAt = normalizeNumber(lastShownAtByKey[key], 0);
  if (lastShownAt && now - lastShownAt < cooldownMs) {
    return { show: false, reason: "cooldown", key };
  }
  return { show: true, reason: "", key };
}

function extractList(result = {}, snakeKey = "", camelKey = "") {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result[snakeKey])) return result[snakeKey];
  if (Array.isArray(result[camelKey])) return result[camelKey];
  if (Array.isArray(result.records)) return result.records;
  return [];
}

function normalizeInterventionResources({
  rulesResult = null,
  rulesError = null,
  plansResult = null,
  plansError = null,
  dashboardResult = null,
  dashboardError = null,
  weeklyResult = null,
  weeklyError = null,
  localExecutionPlanLibrary = null
} = {}) {
  const fallbacks = [];
  const remoteRules = extractList(rulesResult || {}, "intervention_rules", "interventionRules").map(normalizeInterventionRule);
  let rules = remoteRules;
  if (rulesError || !rules.length) {
    if (rulesError) fallbacks.push("rules");
    rules = DEFAULT_INTERVENTION_RULES.map(normalizeInterventionRule);
  }
  const remotePlans = extractList(plansResult || {}, "execution_plans", "executionPlans").map(normalizeExecutionPlan);
  const localPlans = extractList(localExecutionPlanLibrary || {}, "execution_plans", "executionPlans").map(normalizeExecutionPlan);
  let plans = remotePlans;
  if (plansError || !plans.length) {
    if (plansError) fallbacks.push("plans");
    plans = localPlans;
  }
  const dashboardSummary = dashboardError
    ? null
    : pickValue(dashboardResult && dashboardResult.dashboard_summary, dashboardResult && dashboardResult.dashboardSummary, dashboardResult);
  if (dashboardError) fallbacks.push("dashboard");
  const weeklySummary = weeklyError
    ? null
    : pickValue(weeklyResult && weeklyResult.weekly_mirror_summary, weeklyResult && weeklyResult.weeklyMirrorSummary, weeklyResult);
  if (weeklyError) fallbacks.push("weekly");
  return {
    rules,
    plans,
    dashboardSummary: dashboardSummary || null,
    weeklySummary: weeklySummary || null,
    fallbacks
  };
}

function buildInterventionEventPayload({
  reminder = {},
  context: rawContext = {},
  userId = "",
  userResponse = "",
  createdAt = "",
  id = ""
} = {}) {
  const context = buildInterventionContext(Object.assign({}, rawContext, reminder));
  const now = createdAt || new Date().toISOString();
  const event = normalizeInterventionEvent({
    id: id || `intervention-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: pickValue(userId, reminder.userId, reminder.user_id, context.userId, context.user_id),
    triggerType: reminder.triggerType || reminder.trigger_type || context.triggerType || context.trigger_type,
    sourceType: reminder.sourceType || reminder.source_type || context.sourceType || context.source_type,
    sessionId: reminder.sessionId || reminder.session_id || context.sessionId || context.session_id,
    reviewId: reminder.reviewId || reminder.review_id || context.reviewId || context.review_id,
    planId: reminder.planId || reminder.plan_id || context.planId || context.plan_id,
    errorType: reminder.errorType || reminder.error_type || context.errorType || context.error_type,
    firstThought: reminder.firstThought || reminder.first_thought || context.firstThought || context.first_thought,
    sceneTags: reminder.sceneTags || reminder.scene_tags || context.sceneTags || context.scene_tags,
    triggerScene: reminder.triggerScene || reminder.trigger_scene || reminder.sceneTag || reminder.scene_tag || context.triggerScene || context.trigger_scene,
    message: reminder.message || "",
    suggestedAction: reminder.suggestedAction || reminder.suggested_action || reminder.nextAction || reminder.next_action,
    expectedAction: reminder.expectedAction || reminder.expected_action || context.expectedAction || context.expected_action,
    userResponse,
    executionResult: reminder.executionResult || reminder.execution_result || context.executionResult || context.execution_result,
    metadata: Object.assign({}, reminder.metadata || {}, {
      ruleId: reminder.ruleId || reminder.rule_id || "",
      rule_id: reminder.rule_id || reminder.ruleId || "",
      fallbackUsed: context.fallbackUsed || context.fallback_used || false,
      fallback_used: context.fallback_used || context.fallbackUsed || false,
      fallbackReason: context.fallbackReason || context.fallback_reason || "",
      fallback_reason: context.fallback_reason || context.fallbackReason || ""
    }),
    createdAt: now,
    created_at: now
  });
  event.createdAt = now;
  event.created_at = now;
  return event;
}

module.exports = {
  DEFAULT_INTERVENTION_RULES,
  FORBIDDEN_TRADING_SIGNAL_TERMS,
  INTERVENTION_RESPONSE_CHOICES,
  buildInterventionContext,
  buildInterventionEventPayload,
  buildInterventionMessage,
  buildInterventionReminder,
  hasForbiddenTradingSignal,
  normalizeExecutionPlan,
  normalizeInterventionEvent,
  normalizeInterventionResources,
  normalizeInterventionRule,
  normalizeInterventionResponse,
  resolveExecutionPlanForContext,
  resolveInterventionRulesForContext,
  sanitizeInterventionMessage,
  shouldShowIntervention
};
