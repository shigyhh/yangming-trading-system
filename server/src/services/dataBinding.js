import crypto from "node:crypto";
import { buildShareCardConclusion, buildShareCardTrainingFocus, shareCardContent } from "../../../packages/content/share-card.js";
import { config } from "../config.js";
import { readJsonFile, replaceRuntimeRecords, runtimeFile } from "../lib/store.js";
import { syncReportToFeishu } from "./feishu.js";
import { buildHistoricalKlineSlice } from "./historicalKline.js";

const users = new Map();
const DATA_BINDING_FILE = "data-binding-users.json";
let dataBindingLoaded = false;
let dataBindingLoading = null;

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];
const interventionForbiddenPhrases = [
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
const interventionEventAliasPairs = [
  ["triggerType", "trigger_type"],
  ["sourceType", "source_type"],
  ["sessionId", "session_id"],
  ["reviewId", "review_id"],
  ["planId", "plan_id"],
  ["errorType", "error_type"],
  ["firstThought", "first_thought"],
  ["sceneTags", "scene_tags"],
  ["triggerScene", "trigger_scene"],
  ["suggestedAction", "suggested_action"],
  ["expectedAction", "expected_action"],
  ["userResponse", "user_response"],
  ["executionResult", "execution_result"],
  ["createdAt", "created_at"],
  ["updatedAt", "updated_at"]
];
const interventionRuleAliasPairs = [
  ["userId", "user_id"],
  ["triggerType", "trigger_type"],
  ["errorType", "error_type"],
  ["sceneTags", "scene_tags"],
  ["messageTemplate", "message_template"],
  ["expectedAction", "expected_action"],
  ["maxPerSession", "max_per_session"],
  ["cooldownMinutes", "cooldown_minutes"],
  ["createdAt", "created_at"],
  ["updatedAt", "updated_at"]
];
const executionPlanAliasPairs = [
  ["userId", "user_id"],
  ["errorType", "error_type"],
  ["sceneTags", "scene_tags"],
  ["firstThoughts", "first_thoughts"],
  ["forbiddenActions", "forbidden_actions"],
  ["expectedAction", "expected_action"],
  ["nextAction", "next_action"],
  ["trainingPrescription", "training_prescription"],
  ["createdAt", "created_at"],
  ["updatedAt", "updated_at"]
];
const assistantStatuses = new Set(["待承接", "已承接", "待复盘", "已完成"]);
const livingMirrorSchemaVersion = "living_mirror_v1";
const mirrorNames = ["追涨之镜", "扛单之镜", "幻想之镜", "执念之镜", "从众之镜", "犹疑之镜", "拖延之镜", "焦虑之镜", "良知之镜"];
const mirrorKeyByName = {
  追涨之镜: "chasing",
  扛单之镜: "holding_loss",
  幻想之镜: "fantasy",
  执念之镜: "gambling",
  从众之镜: "following",
  犹疑之镜: "hesitation",
  拖延之镜: "procrastination",
  焦虑之镜: "anxiety",
  良知之镜: "conscience"
};
const legacyTypeMirrorMap = {
  冲动型: "追涨之镜",
  扛单型: "扛单之镜",
  完美型: "犹疑之镜",
  赌徒型: "执念之镜",
  从众型: "从众之镜",
  偏执型: "幻想之镜",
  拖延型: "拖延之镜",
  焦虑型: "焦虑之镜",
  平衡型: "良知之镜"
};

export async function saveAssessmentReportBinding({ user = {}, report = {}, answers = [], questionOrder = [], source = "api" }) {
  await ensureDataBindingLoaded();
  const profile = normalizeUserProfile(user);
  const record = ensureUser(profile);
  const now = new Date().toISOString();
  const normalizedReport = normalizeAssessmentReport(report);

  if (!record.baseline_report) {
    record.baseline_report = normalizedReport;
  }

  record.assessment = {
    id: record.assessment?.id || crypto.randomUUID(),
    saved_at: now,
    source,
    answers_count: Array.isArray(answers) ? answers.length : 0,
    question_order: Array.isArray(questionOrder) ? questionOrder.slice(0, 80) : [],
    report: normalizedReport
  };
  record.mirror_report = buildMirrorReportFromAssessment(normalizedReport, record);
  refreshLivingMirrorState(record);
  record.assistant_summary = buildAssistantSummary(record, normalizedReport);
  record.updated_at = now;

  if (config.feishuAutoSync) {
    await syncAssistantSummaryToFeishuRecord(record, { dryRun: false, persist: false });
  }

  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    report: normalizedReport,
    mirror_report: record.mirror_report,
    living_mirror_stats: record.living_mirror_stats,
    living_mirror_profile: record.living_mirror_profile,
    training_prescription: record.training_prescription,
    admin_user: toAdminUser(record)
  };
}

export async function getUserReportBinding(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  return record?.assessment?.report || null;
}

export async function saveTrainingRecordBinding({ user = {}, record = {}, practiceState = null, source = "api" }) {
  await ensureDataBindingLoaded();
  const profile = normalizeUserProfile(user);
  const userRecord = ensureUser(profile);
  const now = new Date().toISOString();
  const trainingRecord = normalizeTrainingRecord(record, now);

  userRecord.training_records = mergeTrainingRecords(userRecord.training_records, [trainingRecord]);
  userRecord.practice_state = practiceState || userRecord.practice_state;
  refreshLivingMirrorState(userRecord);
  userRecord.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(userRecord),
    record: trainingRecord,
    living_mirror_stats: userRecord.living_mirror_stats,
    living_mirror_profile: userRecord.living_mirror_profile,
    training_prescription: userRecord.training_prescription,
    admin_user: toAdminUser(userRecord)
  };
}

export async function saveKLineRecordBinding({ user = {}, record = {}, source = "api" }) {
  await ensureDataBindingLoaded();
  const profile = normalizeUserProfile(user);
  const userRecord = ensureUser(profile);
  const now = new Date().toISOString();
  const klineRecord = {
    id: cleanText(record.id || record.recordId || record.record_id || crypto.randomUUID(), 120),
    day: Number(record.day || 0),
    recorded_at: record.recordedAt || record.recorded_at || now,
    scene_key: cleanText(record.sceneKey || record.scene_key || "", 40),
    reaction_key: cleanText(record.reactionKey || record.reaction_key || "", 40),
    scene: cleanText(record.scene || "未填写场景", 80),
    reaction: cleanText(record.reaction || "已觉察，未展开", 120),
    discipline_action: cleanText(record.disciplineAction || record.discipline_action || "先停一息，再复盘", 120),
    feedback: cleanText(record.feedback || "", 180),
    reaction_time_ms: normalizeReactionTimeMs(record.reactionTimeMs || record.reaction_time_ms),
    process_scores: normalizeProcessScores(record.processScores || record.process_scores),
    process_insight: cleanText(record.processInsight || record.process_insight || "", 180),
    training_suggestion: cleanText(record.trainingSuggestion || record.training_suggestion || "", 160),
    source
  };
  const samplingResult = normalizeKLineSamplingResult(readAliasedField(record, "samplingResult", "sampling_result"));
  addAliasedField(klineRecord, "sourceType", "source_type", readAliasedField(record, "sourceType", "source_type", ["kline_training"]), (value) => cleanText(value, 40));
  addAliasedField(klineRecord, "errorType", "error_type", readAliasedField(record, "errorType", "error_type"), (value) => cleanText(value, 80));
  addAliasedField(klineRecord, "sceneTags", "scene_tags", readAliasedField(record, "sceneTags", "scene_tags"), normalizeAliasList);
  addAliasedField(klineRecord, "trainingPackId", "training_pack_id", readAliasedField(record, "trainingPackId", "training_pack_id", [samplingResult?.trainingPackId, samplingResult?.training_pack_id]), (value) => cleanText(value, 80));
  addAliasedField(klineRecord, "segmentId", "segment_id", readAliasedField(record, "segmentId", "segment_id", [samplingResult?.segmentId, samplingResult?.segment_id]), (value) => cleanText(value, 80));
  addAliasedField(klineRecord, "samplingResult", "sampling_result", samplingResult);
  addAliasedField(klineRecord, "fallbackUsed", "fallback_used", readAliasedField(record, "fallbackUsed", "fallback_used", [samplingResult?.fallbackUsed, samplingResult?.fallback_used]), normalizeAliasBoolean);
  addAliasedField(klineRecord, "fallbackReason", "fallback_reason", readAliasedField(record, "fallbackReason", "fallback_reason", [samplingResult?.fallbackReason, samplingResult?.fallback_reason]), (value) => cleanText(value, 160));
  addAliasedField(klineRecord, "trainingPrescription", "training_prescription", readAliasedField(record, "trainingPrescription", "training_prescription"), normalizeStructuredField);
  addAliasedField(klineRecord, "executionResult", "execution_result", readAliasedField(record, "executionResult", "execution_result"), (value) => cleanText(value, 120));
  addAliasedField(klineRecord, "repeatCount", "repeat_count", readAliasedField(record, "repeatCount", "repeat_count"), normalizeAliasNumber);
  addAliasedField(klineRecord, "trainingMistakeCard", "training_mistake_card", readAliasedField(record, "trainingMistakeCard", "training_mistake_card"), normalizeStructuredField);

  userRecord.kline_records.push(klineRecord);
  refreshLivingMirrorState(userRecord);
  userRecord.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(userRecord),
    record: klineRecord,
    living_mirror_stats: userRecord.living_mirror_stats,
    living_mirror_profile: userRecord.living_mirror_profile,
    training_prescription: userRecord.training_prescription,
    admin_user: toAdminUser(userRecord)
  };
}

export async function listTrainingBookmarkBindings(userId, options = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  const includeDisabled = parseBooleanOption(options.includeDisabled ?? options.include_disabled);
  const trainingBookmarks = filterTrainingBookmarks(record.training_bookmarks || [], {
    ...options,
    includeDisabled
  });

  return {
    user: publicUser(record),
    training_bookmarks: trainingBookmarks,
    trainingBookmarks,
    count: trainingBookmarks.length,
    include_disabled: includeDisabled,
    includeDisabled
  };
}

export async function getTrainingBookmarkBinding(userId, id) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;
  const bookmark = (record.training_bookmarks || []).find((item) => item.id === String(id || ""));
  if (!bookmark) return null;

  return {
    user: publicUser(record),
    training_bookmark: bookmark,
    trainingBookmark: bookmark
  };
}

export async function createTrainingBookmarkBinding(userId, input = {}) {
  await ensureDataBindingLoaded();
  const profile = normalizeUserProfile({ ...(input.user || {}), userId });
  const record = ensureUser(profile);
  const now = new Date().toISOString();
  const bookmark = normalizeTrainingBookmark(input, {
    userId: record.id,
    now
  });

  record.training_bookmarks = mergeById(record.training_bookmarks || [], [bookmark]);
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    training_bookmark: bookmark,
    trainingBookmark: bookmark
  };
}

export async function updateTrainingBookmarkBinding(userId, id, patch = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  const bookmarkId = String(id || "");
  const existing = (record.training_bookmarks || []).find((item) => item.id === bookmarkId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const bookmark = normalizeTrainingBookmark(
    {
      ...existing,
      ...patch,
      id: existing.id,
      userId: existing.userId || existing.user_id || record.id,
      user_id: existing.user_id || existing.userId || record.id,
      createdAt: existing.createdAt || existing.created_at,
      created_at: existing.created_at || existing.createdAt
    },
    {
      userId: record.id,
      now,
      existing
    }
  );
  record.training_bookmarks = (record.training_bookmarks || []).map((item) => (item.id === bookmarkId ? bookmark : item));
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    training_bookmark: bookmark,
    trainingBookmark: bookmark
  };
}

export async function deleteTrainingBookmarkBinding(userId, id) {
  return updateTrainingBookmarkBinding(userId, id, { enabled: false });
}

export async function listInterventionEventBindings(userId, options = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  const includeDisabled = parseBooleanOption(options.includeDisabled ?? options.include_disabled);
  const interventionEvents = filterInterventionEvents(record.intervention_events || [], {
    ...options,
    includeDisabled
  });

  return {
    user: publicUser(record),
    intervention_events: interventionEvents,
    interventionEvents,
    count: interventionEvents.length,
    include_disabled: includeDisabled,
    includeDisabled
  };
}

export async function createInterventionEventBinding(userId, input = {}) {
  await ensureDataBindingLoaded();
  const profile = normalizeUserProfile({ ...(input.user || {}), userId });
  const record = ensureUser(profile);
  const now = new Date().toISOString();
  const interventionEvent = normalizeInterventionEvent(input, {
    userId: record.id,
    now
  });

  record.intervention_events = mergeById(record.intervention_events || [], [interventionEvent]);
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    intervention_event: interventionEvent,
    interventionEvent
  };
}

export async function updateInterventionEventBinding(userId, id, patch = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  const eventId = String(id || "");
  const existing = (record.intervention_events || []).find((item) => item.id === eventId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const interventionEvent = normalizeInterventionEvent(
    mergeAliasedPatch({
      ...existing,
      ...patch,
      id: existing.id,
      userId: existing.userId || existing.user_id || record.id,
      user_id: existing.user_id || existing.userId || record.id,
      createdAt: existing.createdAt || existing.created_at,
      created_at: existing.created_at || existing.createdAt
    }, patch, interventionEventAliasPairs),
    {
      userId: record.id,
      now,
      existing
    }
  );
  record.intervention_events = (record.intervention_events || []).map((item) => (item.id === eventId ? interventionEvent : item));
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    intervention_event: interventionEvent,
    interventionEvent
  };
}

export async function deleteInterventionEventBinding(userId, id) {
  return updateInterventionEventBinding(userId, id, { enabled: false });
}

export async function listInterventionRuleBindings(userId, options = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId) || buildEmptyDataBindingRecord(userId);

  const includeDisabled = parseBooleanOption(options.includeDisabled ?? options.include_disabled);
  const interventionRules = filterInterventionRules(record.intervention_rules || [], {
    ...options,
    includeDisabled
  });

  return {
    user: publicUser(record),
    empty: record.empty === true,
    intervention_rules: interventionRules,
    interventionRules,
    count: interventionRules.length,
    include_disabled: includeDisabled,
    includeDisabled
  };
}

export async function createInterventionRuleBinding(userId, input = {}) {
  await ensureDataBindingLoaded();
  const profile = normalizeUserProfile({ ...(input.user || {}), userId });
  const record = ensureUser(profile);
  const now = new Date().toISOString();
  const interventionRule = normalizeInterventionRule(input, {
    userId: record.id,
    now
  });

  record.intervention_rules = mergeById(record.intervention_rules || [], [interventionRule]);
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    intervention_rule: interventionRule,
    interventionRule
  };
}

export async function updateInterventionRuleBinding(userId, id, patch = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  const ruleId = String(id || "");
  const existing = (record.intervention_rules || []).find((item) => item.id === ruleId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const interventionRule = normalizeInterventionRule(
    mergeAliasedPatch({
      ...existing,
      ...patch,
      id: existing.id,
      userId: existing.userId || existing.user_id || record.id,
      user_id: existing.user_id || existing.userId || record.id,
      createdAt: existing.createdAt || existing.created_at,
      created_at: existing.created_at || existing.createdAt
    }, patch, interventionRuleAliasPairs),
    {
      userId: record.id,
      now,
      existing
    }
  );
  record.intervention_rules = (record.intervention_rules || []).map((item) => (item.id === ruleId ? interventionRule : item));
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    intervention_rule: interventionRule,
    interventionRule
  };
}

export async function deleteInterventionRuleBinding(userId, id) {
  return updateInterventionRuleBinding(userId, id, { enabled: false });
}

export async function listExecutionPlanBindings(userId, options = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId) || buildEmptyDataBindingRecord(userId);

  const includeDisabled = parseBooleanOption(options.includeDisabled ?? options.include_disabled);
  const executionPlans = filterExecutionPlans(record.execution_plans || [], {
    ...options,
    includeDisabled
  });

  return {
    user: publicUser(record),
    empty: record.empty === true,
    execution_plans: executionPlans,
    executionPlans,
    count: executionPlans.length,
    include_disabled: includeDisabled,
    includeDisabled
  };
}

export async function createExecutionPlanBinding(userId, input = {}) {
  await ensureDataBindingLoaded();
  const profile = normalizeUserProfile({ ...(input.user || {}), userId });
  const record = ensureUser(profile);
  const now = new Date().toISOString();
  const executionPlan = normalizeExecutionPlan(input, {
    userId: record.id,
    now
  });

  record.execution_plans = mergeById(record.execution_plans || [], [executionPlan]);
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    execution_plan: executionPlan,
    executionPlan
  };
}

export async function updateExecutionPlanBinding(userId, id, patch = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  const planId = String(id || "");
  const existing = (record.execution_plans || []).find((item) => item.id === planId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const executionPlan = normalizeExecutionPlan(
    mergeAliasedPatch({
      ...existing,
      ...patch,
      id: existing.id,
      userId: existing.userId || existing.user_id || record.id,
      user_id: existing.user_id || existing.userId || record.id,
      createdAt: existing.createdAt || existing.created_at,
      created_at: existing.created_at || existing.createdAt
    }, patch, executionPlanAliasPairs),
    {
      userId: record.id,
      now,
      existing
    }
  );
  record.execution_plans = (record.execution_plans || []).map((item) => (item.id === planId ? executionPlan : item));
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    execution_plan: executionPlan,
    executionPlan
  };
}

export async function deleteExecutionPlanBinding(userId, id) {
  return updateExecutionPlanBinding(userId, id, { enabled: false });
}

export async function saveRetestResultBinding({ user = {}, report = {}, comparison = [], source = "api" }) {
  await ensureDataBindingLoaded();
  const profile = normalizeUserProfile(user);
  const userRecord = ensureUser(profile);
  const normalizedReport = normalizeAssessmentReport(report);
  const baselineReport = userRecord.baseline_report || userRecord.assessment?.report || normalizedReport;
  const radarComparison = Array.isArray(comparison) && comparison.length
    ? comparison.map(normalizeRadarComparison)
    : compareReportRiskRadar(baselineReport, normalizedReport);

  appendRetest(userRecord, {
    report: normalizedReport,
    comparison: radarComparison,
    source
  });
  refreshLivingMirrorState(userRecord);
  await persistDataBindingUsers();

  return {
    user: publicUser(userRecord),
    retest: userRecord.retests[userRecord.retests.length - 1],
    comparison: radarComparison,
    living_mirror_stats: userRecord.living_mirror_stats,
    living_mirror_profile: userRecord.living_mirror_profile,
    training_prescription: userRecord.training_prescription,
    admin_user: toAdminUser(userRecord)
  };
}

export async function saveTradeReviewBinding({ user = {}, review = {}, source = "api" }) {
  await ensureDataBindingLoaded();
  const profile = normalizeUserProfile(user);
  const userRecord = ensureUser(profile);
  const now = new Date().toISOString();
  const tradeReview = await normalizeTradeReview(review, userRecord, now, source);

  userRecord.trade_reviews = mergeById(userRecord.trade_reviews, [tradeReview])
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  refreshLivingMirrorState(userRecord);
  userRecord.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(userRecord),
    review: tradeReview,
    living_mirror_stats: userRecord.living_mirror_stats,
    living_mirror_profile: userRecord.living_mirror_profile,
    training_prescription: userRecord.training_prescription,
    admin_user: toAdminUser(userRecord)
  };
}

export async function listTradeReviewBindings(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  return {
    user: publicUser(record),
    trade_reviews: record.trade_reviews || [],
    living_mirror_stats: record.living_mirror_stats || refreshLivingMirrorState(record, { updateTrend: false }),
    living_mirror_profile: record.living_mirror_profile || buildLivingMirrorProfile(record),
    training_prescription: record.training_prescription || buildTrainingPrescription(record),
    assistant_summary: record.assistant_summary || null
  };
}

export async function getRetestComparisonBinding(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  const latestRetest = record?.retests?.[record.retests.length - 1];
  return latestRetest?.comparison || [];
}

function buildTodayStateFromRecord(record) {
  const now = new Date().toISOString();
  const trainingCount = (record.training_records || []).length + (record.kline_records || []).length;
  const reviewCount = (record.trade_reviews || []).length;
  const hasAssessment = !!(record.assessment?.report || record.mirror_report);
  const mainMirror = record.living_mirror_profile?.dominantMirror ||
    record.living_mirror_profile?.dominant_mirror ||
    record.living_mirror_profile?.currentMainMirror ||
    record.living_mirror_profile?.current_main_mirror ||
    record.living_mirror_profile?.mainMirror ||
    record.living_mirror_profile?.main_mirror ||
    "";
  let status = "not_seen";
  let statusText = "待照见";
  let nextAction = "照见一念";
  let progress = 0;

  if (hasAssessment && !trainingCount) {
    status = "not_trained";
    statusText = "待训练";
    nextAction = "K线训练";
    progress = 35;
  } else if (trainingCount && !reviewCount) {
    status = "not_reviewed";
    statusText = "待复盘";
    nextAction = "轻复盘";
    progress = 65;
  } else if (reviewCount) {
    status = "completed";
    statusText = "今日已完成";
    nextAction = "查看活镜";
    progress = 100;
  }

  const updatedAt = [
    record.updated_at,
    record.living_mirror_profile?.updatedAt,
    record.living_mirror_profile?.updated_at,
    record.training_records?.[record.training_records.length - 1]?.updatedAt,
    record.training_records?.[record.training_records.length - 1]?.updated_at,
    record.kline_records?.[record.kline_records.length - 1]?.updatedAt,
    record.kline_records?.[record.kline_records.length - 1]?.updated_at,
    record.trade_reviews?.[record.trade_reviews.length - 1]?.updatedAt,
    record.trade_reviews?.[record.trade_reviews.length - 1]?.updated_at,
    record.trade_reviews?.[record.trade_reviews.length - 1]?.createdAt,
    record.trade_reviews?.[record.trade_reviews.length - 1]?.created_at
  ].reduce((latest, value) => latestIso(latest, value), "") || now;

  return {
    schemaVersion: "today_state_v1",
    schema_version: "today_state_v1",
    userId: record.id,
    user_id: record.id,
    dateKey: now.slice(0, 10),
    date_key: now.slice(0, 10),
    title: "今日心证",
    stateText: statusText,
    state_text: statusText,
    status,
    statusText,
    status_text: statusText,
    summaryText: reviewCount ? "今日真实复盘已写入活镜。" : "先照见今日这一念，再落下一步行动。",
    summary_text: reviewCount ? "今日真实复盘已写入活镜。" : "先照见今日这一念，再落下一步行动。",
    todayHeartWitness: mainMirror || "先照见今日这一念",
    today_heart_witness: mainMirror || "先照见今日这一念",
    mainMirror,
    main_mirror: mainMirror,
    focusText: nextAction,
    focus_text: nextAction,
    nextAction,
    next_action: nextAction,
    actionText: nextAction,
    action_text: nextAction,
    trainingAction: nextAction,
    training_action: nextAction,
    progress,
    updatedAt,
    updated_at: updatedAt
  };
}

function buildEmptyTodayState(userId = "") {
  const now = new Date().toISOString();
  const safeUserId = String(userId || "").trim();
  return {
    schemaVersion: "today_state_v1",
    schema_version: "today_state_v1",
    userId: safeUserId,
    user_id: safeUserId,
    dateKey: now.slice(0, 10),
    date_key: now.slice(0, 10),
    title: "今日心证",
    stateText: "待照见",
    state_text: "待照见",
    status: "not_seen",
    statusText: "待照见",
    status_text: "待照见",
    summaryText: "先照见今日这一念，再落下一步行动。",
    summary_text: "先照见今日这一念，再落下一步行动。",
    todayHeartWitness: "先照见今日这一念",
    today_heart_witness: "先照见今日这一念",
    mainMirror: "",
    main_mirror: "",
    focusText: "上传真实记录",
    focus_text: "上传真实记录",
    nextAction: "上传真实记录",
    next_action: "上传真实记录",
    actionText: "上传真实记录",
    action_text: "上传真实记录",
    trainingAction: "上传真实记录",
    training_action: "上传真实记录",
    progress: 0,
    updatedAt: now,
    updated_at: now,
    empty: true
  };
}

function buildEmptyDataBindingRecord(userId = "") {
  const now = new Date().toISOString();
  return {
    id: String(userId || "").trim(),
    merged_ids: [],
    phone: "未留存",
    phone_tail: "",
    phone_identity: "",
    nickname: "修行者",
    invite_source: "local_pending",
    source_channel: "miniprogram-local",
    created_at: now,
    updated_at: now,
    assessment: null,
    baseline_report: null,
    training_records: [],
    kline_records: [],
    training_bookmarks: [],
    intervention_events: [],
    intervention_rules: [],
    execution_plans: [],
    retests: [],
    mirror_report: null,
    trade_reviews: [],
    living_mirror_stats: null,
    living_mirror_profile: null,
    training_prescription: null,
    practice_state: null,
    assistant: {
      status: "待承接",
      owner: "未分配",
      handoffAt: "",
      note: "待助教承接测评报告与七日训练记录。"
    },
    assistant_summary: null,
    feishu_sync: null,
    share_card: null,
    empty: true
  };
}

export async function getTodayStateBinding(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return buildEmptyTodayState(userId);
  return buildTodayStateFromRecord(record);
}

export async function getLivingMirrorProfileBinding(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId) || buildEmptyDataBindingRecord(userId);

  const profile = buildLivingMirrorSideChannelProfile(record);
  return {
    user: publicUser(record),
    empty: record.empty === true,
    profile,
    living_mirror_profile: profile,
    livingMirrorProfile: profile
  };
}

export async function getLivingMirrorGrowthProjectionBinding(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId) || buildEmptyDataBindingRecord(userId);

  const projection = buildLivingMirrorGrowthProjection(record);
  return {
    user: publicUser(record),
    empty: record.empty === true,
    projection,
    growthProjection: projection,
    livingMirrorGrowthProjection: projection
  };
}

export async function getDataBindingUserSummary(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId) || buildEmptyDataBindingRecord(userId);

  const archiveIndex = buildArchiveIndex(record);

  return {
    user: publicUser(record),
    empty: record.empty === true,
    report: record.assessment?.report || null,
    mirror_report: record.mirror_report || null,
    training_records: record.training_records,
    kline_records: record.kline_records,
    training_bookmarks: record.training_bookmarks || [],
    trainingBookmarks: record.training_bookmarks || [],
    intervention_events: record.intervention_events || [],
    interventionEvents: record.intervention_events || [],
    intervention_rules: record.intervention_rules || [],
    interventionRules: record.intervention_rules || [],
    execution_plans: record.execution_plans || [],
    executionPlans: record.execution_plans || [],
    trade_reviews: record.trade_reviews || [],
    living_mirror_stats: record.living_mirror_stats || null,
    living_mirror_profile: record.living_mirror_profile || buildLivingMirrorProfile(record),
    training_prescription: record.training_prescription || buildTrainingPrescription(record),
    retests: record.retests,
    retest_comparison: getLatestRetestComparison(record),
    assistant_summary: record.assistant_summary || null,
    feishu_sync: record.feishu_sync || null,
    share_card: record.share_card || null,
    admin_user: toAdminUser(record),
    archive_index: archiveIndex,
    archiveIndex,
    mirror_archive: buildMirrorArchive(record, archiveIndex)
  };
}

export async function getDashboardSummaryBinding(userId, options = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId) || buildEmptyDataBindingRecord(userId);

  const dashboardSummary = buildDashboardSummary(record, options);
  return {
    user: publicUser(record),
    empty: record.empty === true,
    dashboard_summary: dashboardSummary,
    dashboardSummary
  };
}

export async function getWeeklyMirrorSummaryBinding(userId, options = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId) || buildEmptyDataBindingRecord(userId);

  const weeklyMirrorSummary = buildWeeklyMirrorSummary(record, options);
  return {
    user: publicUser(record),
    empty: record.empty === true,
    weekly_mirror_summary: weeklyMirrorSummary,
    weeklyMirrorSummary
  };
}

export async function getMirrorArchiveBinding(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  const archiveIndex = buildArchiveIndex(record);
  return {
    user: publicUser(record),
    archive_index: archiveIndex,
    archiveIndex,
    mirror_archive: buildMirrorArchive(record, archiveIndex)
  };
}

export async function getMirrorArchiveItemBinding(userId, itemId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  const archiveIndex = buildArchiveIndex(record);
  const item = archiveIndex.latestItems.find((entry) => entry.id === itemId || entry.sourceId === itemId);
  if (!item) return null;

  return {
    user: publicUser(record),
    archive_item: item,
    archiveItem: item
  };
}

export async function getTrainingPrescriptionBinding(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  record.training_prescription = record.training_prescription || buildTrainingPrescription(record);
  return {
    user: publicUser(record),
    training_prescription: record.training_prescription,
    living_mirror_profile: record.living_mirror_profile || buildLivingMirrorProfile(record),
    admin_user: toAdminUser(record)
  };
}

export async function dispatchTrainingPrescriptionBinding(userId, { source = "web-next" } = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  const now = new Date().toISOString();
  record.training_prescription = buildTrainingPrescription(record, {
    ...(record.training_prescription || {}),
    source,
    status: "dispatched",
    dispatchedAt: now
  });
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    training_prescription: record.training_prescription,
    living_mirror_profile: record.living_mirror_profile || buildLivingMirrorProfile(record),
    admin_user: toAdminUser(record)
  };
}

export async function getShareCardBinding(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  if (record.share_card) return record.share_card;
  if (!record.assessment?.report) return null;

  record.share_card = buildShareCard(record);
  await persistDataBindingUsers();
  return record.share_card;
}

export async function generateShareCardBinding(userId, { channel = "" } = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) {
    const error = new Error("用户不存在");
    error.statusCode = 404;
    throw error;
  }

  if (!record.assessment?.report) {
    const error = new Error("完成测评后才能生成分享卡");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  record.share_card = buildShareCard(record, {
    id: record.share_card?.id,
    channel: channel || record.share_card?.channel,
    createdAt: record.share_card?.created_at || now,
    updatedAt: now
  });
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    share_card: record.share_card,
    admin_user: toAdminUser(record)
  };
}

export async function getInviteSourceStatsBinding() {
  await ensureDataBindingLoaded();
  const groups = new Map();

  Array.from(users.values()).forEach((record) => {
    const source = record.invite_source || record.source_channel || "未标记来源";
    const existing = groups.get(source) || createInviteSourceBucket(source, record.source_channel);
    const report = record.assessment?.report;
    const primary = report?.primaryType?.label || "未完成";

    existing.userCount += 1;
    existing.assessmentCount += record.assessment ? 1 : 0;
    existing.trainingStartedCount += record.training_records.length > 0 ? 1 : 0;
    existing.trainingCompletedCount += record.training_records.filter((item) => item.status === "completed").length >= 7 ? 1 : 0;
    existing.retestCount += record.retests.length;
    existing.assistantHandoffCount += record.assistant?.status && record.assistant.status !== "待承接" ? 1 : 0;
    existing.shareCardCount += record.share_card ? 1 : 0;
    existing.lastAssessmentAt = latestIso(existing.lastAssessmentAt, report?.createdAt || record.assessment?.saved_at || "");
    existing.primaryTypeCounts[primary] = (existing.primaryTypeCounts[primary] || 0) + 1;

    groups.set(source, existing);
  });

  return Array.from(groups.values())
    .map((item) => ({
      source: item.source,
      sourceChannel: item.sourceChannel,
      userCount: item.userCount,
      assessmentCount: item.assessmentCount,
      trainingStartedCount: item.trainingStartedCount,
      trainingCompletedCount: item.trainingCompletedCount,
      retestCount: item.retestCount,
      assistantHandoffCount: item.assistantHandoffCount,
      shareCardCount: item.shareCardCount,
      lastAssessmentAt: item.lastAssessmentAt,
      topPrimaryTypes: Object.entries(item.primaryTypeCounts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
      note: "仅统计测评、训练、复测和承接来源，不做收益归因。"
    }))
    .sort((a, b) => b.assessmentCount - a.assessmentCount || b.userCount - a.userCount);
}

export async function listAdminUsersFromBindings() {
  await ensureDataBindingLoaded();
  return Array.from(users.values())
    .sort((a, b) => new Date(b.assessment?.report?.createdAt || b.created_at).getTime() - new Date(a.assessment?.report?.createdAt || a.created_at).getTime())
    .map(toAdminUser);
}

export async function getAdminUserFromBindings(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  return record ? toAdminUser(record) : null;
}

export async function updateAssistantHandoffBinding(userId, { status = "", owner = "", note = "", handoffAt = "" } = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) {
    const error = new Error("用户不存在");
    error.statusCode = 404;
    throw error;
  }

  const nextStatus = normalizeAssistantStatus(status);
  const now = new Date().toISOString();
  record.assistant = {
    status: nextStatus,
    owner: cleanText(owner || (nextStatus === "待承接" ? "未分配" : record.assistant.owner || "未分配"), 40),
    handoffAt: nextStatus === "待承接" ? "" : cleanText(handoffAt || record.assistant.handoffAt || now, 40),
    note: cleanText(note || getDefaultAssistantNote(nextStatus), 180)
  };
  record.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    assistant: record.assistant,
    admin_user: toAdminUser(record)
  };
}

export async function syncAssistantSummaryToFeishuBinding(userId, { dryRun = false } = {}) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) {
    const error = new Error("用户不存在");
    error.statusCode = 404;
    throw error;
  }

  const result = await syncAssistantSummaryToFeishuRecord(record, { dryRun, persist: true });
  return {
    user: publicUser(record),
    assistant_summary: record.assistant_summary,
    feishu_sync: record.feishu_sync,
    result
  };
}

export async function resetDataBindingForTests() {
  users.clear();
  dataBindingLoaded = true;
  dataBindingLoading = null;
  await persistDataBindingUsers();
}

export function unloadDataBindingForTests() {
  users.clear();
  dataBindingLoaded = false;
  dataBindingLoading = null;
}

async function ensureDataBindingLoaded() {
  if (dataBindingLoaded) return;
  if (dataBindingLoading) return dataBindingLoading;

  dataBindingLoading = (async () => {
    const storedUsers = await readJsonFile(runtimeFile(DATA_BINDING_FILE), null);

    users.clear();
    if (Array.isArray(storedUsers) && storedUsers.length > 0) {
      storedUsers.forEach((record) => {
        const normalized = normalizePersistedUserRecord(record);
        refreshLivingMirrorState(normalized, { updateTrend: false });
        if (normalized.id) users.set(normalized.id, normalized);
      });
    } else {
      seedDemoUsers();
      await persistDataBindingUsers();
    }

    dataBindingLoaded = true;
    dataBindingLoading = null;
  })();

  return dataBindingLoading;
}

async function persistDataBindingUsers() {
  await replaceRuntimeRecords(DATA_BINDING_FILE, Array.from(users.values()));
}

function normalizePersistedUserRecord(record) {
  const now = new Date().toISOString();
  const maskedPhone = String(record?.phone || "未留存");
  const phoneTail = String(record?.phone_tail || "").slice(-4);
  return {
    id: String(record?.id || crypto.randomUUID()),
    merged_ids: Array.isArray(record?.merged_ids) ? record.merged_ids.map(String).filter(Boolean) : [],
    phone: maskedPhone,
    phone_tail: phoneTail,
    phone_identity: cleanText(record?.phone_identity || derivePhoneIdentity({ maskedPhone, phoneTail }), 96),
    nickname: cleanText(record?.nickname || "体验学员", 80),
    invite_source: cleanText(record?.invite_source || "网页MVP", 80),
    source_channel: cleanText(record?.source_channel || "网页MVP", 80),
    created_at: record?.created_at || now,
    updated_at: record?.updated_at || record?.created_at || now,
    assessment: record?.assessment || null,
    baseline_report: record?.baseline_report || record?.assessment?.report || null,
    training_records: Array.isArray(record?.training_records) ? record.training_records : [],
    kline_records: Array.isArray(record?.kline_records) ? record.kline_records : [],
    training_bookmarks: Array.isArray(record?.training_bookmarks)
      ? record.training_bookmarks.map((item) => normalizeTrainingBookmark(item, {
        userId: String(record?.id || ""),
        now,
        requireReference: false
      })).filter(Boolean)
      : [],
    intervention_events: Array.isArray(record?.intervention_events || record?.interventionEvents)
      ? (record?.intervention_events || record?.interventionEvents).map((item) => normalizeInterventionEvent(item, {
        userId: String(record?.id || ""),
        now,
        existing: item,
        requireTrigger: false
      })).filter(Boolean)
      : [],
    intervention_rules: Array.isArray(record?.intervention_rules || record?.interventionRules)
      ? (record?.intervention_rules || record?.interventionRules).map((item) => normalizeInterventionRule(item, {
        userId: String(record?.id || ""),
        now,
        existing: item,
        requireTrigger: false
      })).filter(Boolean)
      : [],
    execution_plans: Array.isArray(record?.execution_plans || record?.executionPlans)
      ? (record?.execution_plans || record?.executionPlans).map((item) => normalizeExecutionPlan(item, {
        userId: String(record?.id || ""),
        now,
        existing: item,
        requireTitle: false
      })).filter(Boolean)
      : [],
    retests: Array.isArray(record?.retests) ? record.retests : [],
    mirror_report: record?.mirror_report || null,
    trade_reviews: Array.isArray(record?.trade_reviews) ? record.trade_reviews : [],
    living_mirror_stats: record?.living_mirror_stats || null,
    living_mirror_profile: record?.living_mirror_profile || null,
    training_prescription: record?.training_prescription || null,
    practice_state: record?.practice_state || null,
    assistant: normalizeAssistant(record?.assistant),
    assistant_summary: record?.assistant_summary || null,
    feishu_sync: record?.feishu_sync || null,
    share_card: record?.share_card || null
  };
}

function normalizeAssistant(assistant = {}) {
  const status = normalizeAssistantStatus(assistant.status);
  return {
    status,
    owner: cleanText(assistant.owner || "未分配", 40),
    handoffAt: cleanText(assistant.handoffAt || assistant.handoff_at || "", 40),
    note: cleanText(assistant.note || getDefaultAssistantNote(status), 180)
  };
}

function normalizeAssistantStatus(status) {
  return assistantStatuses.has(status) ? status : "待承接";
}

function getDefaultAssistantNote(status) {
  if (status === "已承接") return "已记录助教承接状态，后续继续观察训练与复测变化。";
  if (status === "待复盘") return "已进入待复盘状态，优先查看训练记录与复测变化。";
  if (status === "已完成") return "本轮承接已完成，后续保持训练记录与复测观察。";
  return "待助教承接测评报告与七日训练记录。";
}

function getLatestRetestComparison(record) {
  const latestRetest = record?.retests?.[record.retests.length - 1];
  return latestRetest?.comparison || [];
}

function ensureUser(profile) {
  const existing = users.get(profile.id);
  const phoneOwner = profile.phone_identity ? findUserByPhoneIdentity(profile.phone_identity) : null;
  const now = new Date().toISOString();
  let target = phoneOwner || existing;

  if (existing && phoneOwner && existing.id !== phoneOwner.id) {
    target = mergeUserRecords(phoneOwner, existing);
    users.delete(existing.id);
  }

  if (target) {
    if (profile.id && profile.id !== target.id && !target.merged_ids.includes(profile.id)) {
      target.merged_ids.push(profile.id);
    }
    target.phone = profile.masked_phone || target.phone;
    target.phone_tail = profile.phone_tail || target.phone_tail;
    target.phone_identity = profile.phone_identity || target.phone_identity;
    target.nickname = profile.nickname || target.nickname;
    target.invite_source = target.invite_source || profile.invite_source;
    target.source_channel = target.source_channel || profile.source_channel;
    target.updated_at = now;
    return target;
  }

  const next = {
    id: profile.id,
    merged_ids: [],
    phone: profile.masked_phone,
    phone_tail: profile.phone_tail,
    phone_identity: profile.phone_identity,
    nickname: profile.nickname,
    invite_source: profile.invite_source,
    source_channel: profile.source_channel,
    created_at: now,
    updated_at: now,
    assessment: null,
    baseline_report: null,
    training_records: [],
    kline_records: [],
    training_bookmarks: [],
    intervention_events: [],
    intervention_rules: [],
    execution_plans: [],
    retests: [],
    mirror_report: null,
    trade_reviews: [],
    living_mirror_stats: null,
    living_mirror_profile: null,
    training_prescription: null,
    practice_state: null,
    assistant: {
      status: "待承接",
      owner: "未分配",
      handoffAt: "",
      note: "待助教承接测评报告与七日训练记录。"
    },
    assistant_summary: null,
    feishu_sync: null,
    share_card: null
  };

  users.set(next.id, next);
  return next;
}

function findUserRecord(userId) {
  const id = String(userId || "");
  if (!id) return null;
  return users.get(id) || Array.from(users.values()).find((record) => record.merged_ids?.includes(id)) || null;
}

function findUserByPhoneIdentity(phoneIdentity) {
  const identity = String(phoneIdentity || "");
  if (!identity) return null;
  return Array.from(users.values()).find((record) => record.phone_identity === identity) || null;
}

function mergeUserRecords(canonical, incoming) {
  const mergedIds = new Set([...(canonical.merged_ids || []), ...(incoming.merged_ids || []), incoming.id]);
  canonical.merged_ids = Array.from(mergedIds).filter((id) => id && id !== canonical.id);
  canonical.phone = canonical.phone === "未留存" ? incoming.phone : canonical.phone;
  canonical.phone_tail = canonical.phone_tail || incoming.phone_tail;
  canonical.phone_identity = canonical.phone_identity || incoming.phone_identity;
  canonical.nickname = canonical.nickname || incoming.nickname;
  canonical.invite_source = canonical.invite_source || incoming.invite_source;
  canonical.source_channel = canonical.source_channel || incoming.source_channel;
  canonical.assessment = chooseLatestAssessment(canonical.assessment, incoming.assessment);
  canonical.baseline_report = chooseEarliestReport(canonical.baseline_report, incoming.baseline_report);
  canonical.training_records = mergeTrainingRecords(canonical.training_records, incoming.training_records);
  canonical.kline_records = mergeById(canonical.kline_records, incoming.kline_records);
  canonical.training_bookmarks = mergeById(canonical.training_bookmarks, incoming.training_bookmarks);
  canonical.intervention_events = mergeById(canonical.intervention_events, incoming.intervention_events);
  canonical.intervention_rules = mergeById(canonical.intervention_rules, incoming.intervention_rules);
  canonical.execution_plans = mergeById(canonical.execution_plans, incoming.execution_plans);
  canonical.retests = mergeById(canonical.retests, incoming.retests)
    .sort((a, b) => new Date(a.saved_at || 0).getTime() - new Date(b.saved_at || 0).getTime());
  canonical.mirror_report = chooseLatestByTime(canonical.mirror_report, incoming.mirror_report, "createdAt");
  canonical.training_prescription = chooseLatestByTime(canonical.training_prescription, incoming.training_prescription, "dispatchedAt")
    || chooseLatestByTime(canonical.training_prescription, incoming.training_prescription, "createdAt");
  canonical.trade_reviews = mergeById(canonical.trade_reviews, incoming.trade_reviews)
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  canonical.practice_state = canonical.practice_state || incoming.practice_state;
  canonical.assistant = chooseAssistant(canonical.assistant, incoming.assistant);
  canonical.assistant_summary = chooseLatestByTime(canonical.assistant_summary, incoming.assistant_summary, "created_at");
  canonical.feishu_sync = chooseLatestByTime(canonical.feishu_sync, incoming.feishu_sync, "synced_at");
  canonical.share_card = canonical.share_card || incoming.share_card;
  refreshLivingMirrorState(canonical);
  canonical.updated_at = latestIso(canonical.updated_at, incoming.updated_at) || new Date().toISOString();
  return canonical;
}

function chooseLatestAssessment(left, right) {
  if (!left) return right || null;
  if (!right) return left;
  return new Date(right.saved_at || right.report?.createdAt || 0).getTime() > new Date(left.saved_at || left.report?.createdAt || 0).getTime()
    ? right
    : left;
}

function chooseEarliestReport(left, right) {
  if (!left) return right || null;
  if (!right) return left;
  return new Date(right.createdAt || 0).getTime() < new Date(left.createdAt || 0).getTime() ? right : left;
}

function mergeTrainingRecords(left = [], right = []) {
  const byId = new Map();
  [...left, ...right].forEach((record) => {
    const key = String(record.id || `${record.recorded_at || record.date_key || record.day}-${record.title || ""}`);
    const existing = byId.get(key);
    if (!existing || new Date(record.recorded_at || 0).getTime() >= new Date(existing.recorded_at || 0).getTime()) {
      byId.set(key, record);
    }
  });
  return Array.from(byId.values()).sort((a, b) => {
    const dayDelta = Number(a.day || 0) - Number(b.day || 0);
    if (dayDelta) return dayDelta;
    return new Date(a.recorded_at || 0).getTime() - new Date(b.recorded_at || 0).getTime();
  });
}

function mergeById(left = [], right = []) {
  const byId = new Map();
  [...left, ...right].forEach((record) => {
    const key = String(record.id || `${record.saved_at || record.recorded_at}-${JSON.stringify(record).length}`);
    byId.set(key, record);
  });
  return Array.from(byId.values());
}

function chooseAssistant(left, right) {
  if (!left) return right;
  if (!right) return left;
  if (left.status === "待承接" && right.status !== "待承接") return right;
  return left;
}

function chooseLatestByTime(left, right, key) {
  if (!left) return right || null;
  if (!right) return left;
  return new Date(right[key] || 0).getTime() > new Date(left[key] || 0).getTime() ? right : left;
}

function appendRetest(userRecord, { report, comparison, source }) {
  const now = new Date().toISOString();
  userRecord.retests.push({
    id: crypto.randomUUID(),
    saved_at: now,
    source,
    report,
    comparison
  });
  userRecord.updated_at = now;
}

function normalizeUserProfile(user) {
  const rawPhone = String(user.maskedPhone || user.masked_phone || user.phone || "");
  const rawDigits = rawPhone.replace(/\D/g, "");
  const phoneTail = String(user.phoneTail || user.phone_tail || rawDigits.slice(-4) || "").slice(-4);
  const maskedPhone = maskPhone(rawPhone, phoneTail);

  return {
    id: String(user.userId || user.user_id || user.id || `web-${crypto.randomUUID()}`),
    masked_phone: maskedPhone,
    phone_tail: phoneTail || maskedPhone.slice(-4),
    phone_identity: derivePhoneIdentity({ rawPhone, maskedPhone, phoneTail }),
    nickname: cleanText(user.nickname || user.displayName || user.display_name || "体验学员", 80),
    invite_source: cleanText(user.inviteSource || user.invite_source || user.sourceChannel || user.source_channel || "网页MVP", 80),
    source_channel: cleanText(user.sourceChannel || user.source_channel || "网页MVP", 80)
  };
}

function normalizeAssessmentReport(report) {
  const primaryType = normalizeTypeProfile(report.primaryType || report.primary_type || report.primaryPersonality || report.primary_personality || {}, "未定型");
  const secondaryType = normalizeTypeProfile(report.secondaryType || report.secondary_type || report.secondaryPersonality || report.secondary_personality || {}, "未定型");
  const riskRadar = Array.isArray(report.riskRadar || report.risk_radar)
    ? (report.riskRadar || report.risk_radar).map(normalizeRiskRadarItem)
    : [];
  const createdAt = report.createdAt || report.created_at || new Date().toISOString();
  const emotionalTriggers = Array.isArray(report.emotionalTriggers || report.emotional_triggers)
    ? (report.emotionalTriggers || report.emotional_triggers).map(normalizeEmotionalTrigger).slice(0, 6)
    : [];
  const trainingPrescription7Days = Array.isArray(report.trainingPrescription7Days || report.training_prescription_7_days)
    ? (report.trainingPrescription7Days || report.training_prescription_7_days).map(normalizeTrainingPrescription).slice(0, 7)
    : [];
  const campSuggestion = normalizeCampSuggestion(report.campSuggestion || report.camp_suggestion || {}, primaryType.label);
  const complianceNotice = cleanComplianceNotice(report.complianceNotice || report.compliance_notice || report.disclaimer);

  return {
    schemaVersion: cleanText(report.schemaVersion || report.schema_version || "assessment_report_v1", 40),
    reportId: cleanText(report.reportId || report.report_id || `RPT-${crypto.randomUUID()}`, 80),
    userId: cleanText(report.userId || report.user_id || "", 80),
    createdAt,
    conclusion: cleanText(report.conclusion || `你最容易被「${report.firstThoughtDisplay || report.first_thought_display || "第一念"}」牵动，先从一个可执行动作开始训练。`, 180),
    primaryPersonality: normalizeUnifiedPersonality(report.primaryPersonality || report.primary_personality || primaryType),
    secondaryPersonality: normalizeUnifiedPersonality(report.secondaryPersonality || report.secondary_personality || secondaryType),
    totalQuestions: Number(report.totalQuestions || report.total_questions || 0),
    answeredCount: Number(report.answeredCount || report.answered_count || 0),
    primaryType,
    secondaryType,
    scores: report.scores || {},
    riskRadar,
    emotionalTriggers,
    trainingPrescription7Days,
    campSuggestion,
    complianceNotice,
    metadata: normalizeReportMetadata(report.metadata),
    firstThought: cleanText(report.firstThought || report.first_thought || "", 160),
    firstThoughtDisplay: cleanText(report.firstThoughtDisplay || report.first_thought_display || "", 80),
    trainingDirection: cleanText(report.trainingDirection || report.training_direction || primaryType.training || "先照见触发，再训练一个可执行动作。", 160),
    disclaimer: complianceNotice.endsWith("。") ? complianceNotice : `${complianceNotice}。`
  };
}

function normalizeUnifiedPersonality(profile = {}) {
  return {
    type: String(profile.type || profile.key || profile.label || "未定型"),
    label: cleanText(profile.label || profile.type || profile.key || "未定型", 40),
    poeticName: cleanText(profile.poeticName || profile.poetic_name || "", 40),
    summary: cleanText(profile.summary || "", 180),
    score: clampPercent(profile.score)
  };
}

function normalizeTypeProfile(profile, fallbackLabel) {
  return {
    key: String(profile.key || profile.type || fallbackLabel),
    label: cleanText(profile.label || fallbackLabel, 40),
    poeticName: cleanText(profile.poeticName || profile.poetic_name || "", 40),
    summary: cleanText(profile.summary || "", 180),
    risk: cleanText(profile.risk || "", 180),
    training: cleanText(profile.training || "", 180),
    score: Number(profile.score || 0)
  };
}

function normalizeRiskRadarItem(item) {
  return {
    key: String(item.key || item.label || crypto.randomUUID()),
    label: cleanText(item.label || item.key || "风险项", 40),
    value: clampPercent(item.value),
    description: cleanText(item.description || "", 160)
  };
}

function normalizeEmotionalTrigger(item) {
  return {
    key: String(item.key || item.label || crypto.randomUUID()),
    label: cleanText(item.label || item.key || "触发项", 40),
    description: cleanText(item.description || "", 180),
    firstThought: cleanText(item.firstThought || item.first_thought || "", 160)
  };
}

function normalizeTrainingPrescription(item) {
  return {
    day: Number(item.day || 1),
    theme: cleanText(item.theme || "今日事上练", 60),
    action: cleanText(item.action || "先照见，再复盘。", 160),
    reflectionPrompt: cleanText(item.reflectionPrompt || item.reflection_prompt || "今天看见了什么？", 160)
  };
}

function normalizeCampSuggestion(item, primaryLabel) {
  return {
    name: cleanText(item.name || `${primaryLabel}七日知行训练`, 80),
    reason: cleanText(item.reason || "根据当前主反应推荐七日训练路径。", 160),
    focus: cleanText(item.focus || "照见第一念、记录触发、复盘动作。", 160)
  };
}

function normalizeReportMetadata(metadata = {}) {
  return {
    source: cleanText(metadata.source || "server", 40),
    assessmentVersion: cleanText(metadata.assessmentVersion || metadata.assessment_version || "", 60),
    scoringVersion: cleanText(metadata.scoringVersion || metadata.scoring_version || "", 60),
    contentVersion: cleanText(metadata.contentVersion || metadata.content_version || "", 60)
  };
}

function normalizeTrainingRecord(record, fallbackTime) {
  return {
    id: String(record.id || crypto.randomUUID()),
    day: Number(record.day || 1),
    date_key: cleanText(record.dateKey || record.date_key || fallbackTime.slice(0, 10), 20),
    title: cleanText(record.title || "今日事上练", 60),
    note: cleanText(record.note || "", 180),
    actions: Array.isArray(record.actions) ? record.actions.map((item) => cleanText(item, 120)).slice(0, 8) : [],
    status: record.status === "missed" ? "missed" : "completed",
    recorded_at: record.recordedAt || record.recorded_at || fallbackTime,
    check_in: cleanText(record.checkIn || record.check_in || "", 40),
    cultivation_text: cleanText(record.cultivationText || record.cultivation_text || "", 220)
  };
}

async function normalizeTradeReview(review, userRecord, fallbackTime, source) {
  const buyReason = cleanText(review.buyReason || review.buy_reason || "", 260);
  const sellReason = cleanText(review.sellReason || review.sell_reason || "", 260);
  const strongestThought = cleanText(review.strongestThought || review.strongest_thought || "", 180);
  const detectedMirror = normalizeMirrorName(
    review.detectedMirror || review.detected_mirror || inferMirrorName([strongestThought, buyReason, sellReason], userRecord.mirror_report?.mainMirror || "追涨之镜")
  );
  const detectedThieves = normalizeThieves(review.detectedThieves || review.detected_thieves, [strongestThought, detectedMirror]);
  const behaviorTags = Array.isArray(review.behaviorTags || review.behavior_tags)
    ? (review.behaviorTags || review.behavior_tags).map((item) => cleanText(item, 40)).filter(Boolean).slice(0, 8)
    : buildBehaviorTags({ detectedMirror, strongestThought });
  const reviewText = cleanText(
    review.reviewText || review.review_text || buildTradeReviewText({ detectedMirror, detectedThieves, strongestThought }),
    320
  );
  const rawSymbol = cleanText(review.lookupSymbol || review.lookup_symbol || review.symbol || review.symbol_raw || review.symbolMasked || review.symbol_masked || "", 80);
  const tradeDate = cleanText(review.tradeDate || review.trade_date || fallbackTime.slice(0, 10), 40);
  const marketType = cleanText(review.marketType || review.market_type || "other", 40);
  const timeframeKey = cleanText(review.timeframeKey || review.timeframe_key || "1d", 24);
  const marketContext = await buildTradeReviewMarketContext({
    id: review.id || "",
    marketType,
    timeframeKey,
    tradeDate,
    symbol: rawSymbol
  });

  const normalized = {
    id: String(review.id || crypto.randomUUID()),
    userId: userRecord.id,
    imageUrl: cleanText(review.imageUrl || review.image_url || "", 240),
    tradeDate,
    symbolMasked: cleanText(review.symbolMasked || review.symbol_masked || maskTradeSymbol(rawSymbol), 40),
    marketType,
    timeframeKey,
    buyReason,
    sellReason,
    strongestThought,
    wasPlanned: normalizeOptionalBoolean(review.wasPlanned ?? review.was_planned),
    hadExitRule: normalizeOptionalBoolean(review.hadExitRule ?? review.had_exit_rule),
    changedPlanDuringTrade: normalizeOptionalBoolean(review.changedPlanDuringTrade ?? review.changed_plan_during_trade),
    detectedMirror,
    detectedThieves,
    behaviorTags,
    nextAction: cleanText(review.nextAction || review.next_action || "", 180),
    reviewText,
    ocrDraft: normalizeTradeReviewOcrDraft(review.ocrDraft || review.ocr_draft || null),
    marketContext,
    createdAt: review.createdAt || review.created_at || fallbackTime,
    source
  };
  addAliasedField(normalized, "mainErrorType", "main_error_type", readAliasedField(review, "mainErrorType", "main_error_type", [review.errorType, review.error_type, detectedMirror]), (value) => cleanText(value, 80));
  addAliasedField(normalized, "firstThought", "first_thought", readAliasedField(review, "firstThought", "first_thought", [strongestThought]), (value) => cleanText(value, 180));
  addAliasedField(normalized, "triggerScene", "trigger_scene", readAliasedField(review, "triggerScene", "trigger_scene", [review.trigger, review.scene, marketContext.positionLabel]), (value) => cleanText(value, 180));
  addAliasedField(normalized, "trainingPrescription", "training_prescription", readAliasedField(review, "trainingPrescription", "training_prescription", [review.trainingAction, review.training_action]), normalizeStructuredField);
  addAliasedField(normalized, "nextRule", "next_rule", readAliasedField(review, "nextRule", "next_rule", [review.nextAction, review.next_action]), (value) => cleanText(value, 180));
  addAliasedField(normalized, "mistakeCard", "mistake_card", readAliasedField(review, "mistakeCard", "mistake_card"), normalizeStructuredField);
  return withTradeReviewCrossEndStatus(normalized, userRecord);
}

function withTradeReviewCrossEndStatus(review = {}, record = {}) {
  const status = buildTradeReviewCrossEndStatus(review, record);
  return {
    ...review,
    crossEndStatus: status.key,
    crossEndStatusText: status.label,
    crossEndStatusSteps: status.steps,
    statusUpdatedAt: status.updatedAt
  };
}

function buildTradeReviewCrossEndStatus(review = {}, record = {}) {
  const confirmed = Boolean(cleanText(review.strongestThought || review.strongest_thought || "", 180)) &&
    Boolean(cleanText(review.buyReason || review.buy_reason || review.sellReason || review.sell_reason || review.imageUrl || review.image_url || "", 260));
  const marketStatus = review.marketContext?.status || review.market_context?.status || "";
  const marketReviewed = marketStatus === "ready";
  const mirrored = Boolean(review.detectedMirror || review.detected_mirror) && Boolean(review.reviewText || review.review_text);
  const archived = Boolean(review.id);
  const trained = hasTrainingAfterReview(record, review);
  const retested = hasRetestAfterReview(record, review);
  const source = cleanText(review.source || "server", 40);
  const steps = [
    buildReviewStatusStep("pending_confirmation", "待确认", confirmed, !confirmed, "截图、自述与第一念等待确认。", source),
    buildReviewStatusStep("pending_market_review", "待回看", marketReviewed, confirmed && !marketReviewed, "等待历史位置回看完成。", source),
    buildReviewStatusStep("mirrored", "已照见", mirrored, confirmed && marketReviewed && !mirrored, "九镜六贼已生成照见结果。", source),
    buildReviewStatusStep("archived", "已入镜", archived, confirmed && marketReviewed && mirrored && !archived, "真实记录已写入活镜档案。", source),
    buildReviewStatusStep("training_pending", "待训练", trained, confirmed && marketReviewed && mirrored && archived && !trained, "等待对应训练动作完成。", source),
    buildReviewStatusStep("trained", "已训练", trained, trained && !retested, "训练动作已回流到这条记录。", source),
    buildReviewStatusStep("retested", "已复测", retested, retested, "复测变化已回看。", source)
  ];
  const current = steps.find((step) => step.current) || steps.slice().reverse().find((step) => step.done) || steps[0];
  return {
    key: current.key,
    label: current.label,
    steps,
    updatedAt: new Date().toISOString()
  };
}

function buildReviewStatusStep(key, label, done, current, detail, source) {
  return {
    key,
    label,
    done: Boolean(done),
    current: Boolean(current),
    detail,
    source
  };
}

function hasTrainingAfterReview(record = {}, review = {}) {
  const reviewTime = toTime(review.createdAt || review.created_at || review.tradeDate || review.trade_date);
  return (record.training_records || []).some((item) => {
    if (item.status && item.status !== "completed") return false;
    const trainingTime = toTime(item.recorded_at || item.recordedAt || item.date_key || item.dateKey);
    return !reviewTime || !trainingTime || trainingTime >= reviewTime;
  });
}

function hasRetestAfterReview(record = {}, review = {}) {
  const reviewTime = toTime(review.createdAt || review.created_at || review.tradeDate || review.trade_date);
  return (record.retests || []).some((item) => {
    const retestTime = toTime(item.saved_at || item.savedAt || item.report?.createdAt);
    return !reviewTime || !retestTime || retestTime >= reviewTime;
  });
}

function toTime(value) {
  const date = new Date(value || 0);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

async function buildTradeReviewMarketContext({ id = "", marketType = "", timeframeKey = "1d", tradeDate = "", symbol = "" } = {}) {
  const marketKey = toKlineMarketKey(marketType);
  const safeSymbol = cleanLookupSymbol(symbol);
  const safeTimeframe = toKlineTimeframeKey(timeframeKey);
  const base = {
    schemaVersion: "trade_review_market_context_v1",
    status: "",
    marketKey,
    timeframeKey: safeTimeframe,
    tradeDate: cleanText(tradeDate, 40),
    symbolMasked: safeSymbol ? maskTradeSymbol(safeSymbol) : "",
    sourceStatus: "",
    positionLabel: "",
    dataStart: "",
    dataEnd: "",
    candleCount: 0,
    source: "",
    rulesSummary: "",
    complianceNotice: "仅用于回看当时市场环境与交易心理反应，不构成投资建议。"
  };
  if (!safeSymbol) {
    return {
      ...base,
      status: "missing_symbol",
      sourceStatus: "未提供可回看标的",
      positionLabel: "手动复盘优先"
    };
  }

  try {
    const { slice } = await buildHistoricalKlineSlice({
      marketKey,
      symbol: safeSymbol,
      timeframeKey: safeTimeframe,
      windowSize: 40,
      mode: "boundary",
      blind: false,
      seed: `${id || safeSymbol}:${tradeDate || ""}`,
      endDate: tradeDate || "",
      anchor: "end"
    });
    return {
      ...base,
      status: "ready",
      marketKey: slice.market.key,
      marketLabel: slice.market.label,
      timeframeKey: slice.timeframe.key,
      timeframeLabel: slice.timeframe.label,
      sourceStatus: "历史片段已载入",
      positionLabel: buildMarketPositionLabel(slice),
      dataStart: slice.data_range?.start || "",
      dataEnd: slice.data_range?.end || "",
      candleCount: slice.visible_count || 0,
      source: slice.source || "",
      rulesSummary: slice.rules?.session || "",
      reviewPrompt: slice.training?.review_prompt || ""
    };
  } catch (error) {
    return {
      ...base,
      status: error && error.statusCode === 404 ? "missing_cache" : "failed",
      sourceStatus: error && error.message ? cleanText(error.message, 160) : "历史片段暂未载入",
      positionLabel: "先完成手动复盘，待历史数据载入后回看"
    };
  }
}

function toKlineMarketKey(value) {
  const text = String(value || "").toLowerCase();
  if (["a_share", "cn", "cn_equity", "ashare"].includes(text)) return "cn_equity";
  if (["hk_stock", "hk", "hk_equity"].includes(text)) return "hk_equity";
  if (["us_stock", "us", "us_equity"].includes(text)) return "us_equity";
  if (["futures", "future"].includes(text)) return "futures";
  if (["crypto", "digital_currency"].includes(text)) return "crypto";
  return "cn_equity";
}

function toKlineTimeframeKey(value) {
  const text = String(value || "1d").toLowerCase();
  if (text === "1m" || text === "1mo") return "1mo";
  if (["5m", "10m", "30m", "60m", "1d", "1w", "1y"].includes(text)) return text;
  return "1d";
}

function cleanLookupSymbol(value) {
  const text = cleanText(value, 80);
  if (!text || text.includes("*")) return "";
  return text;
}

function buildMarketPositionLabel(slice) {
  const range = slice.data_range || {};
  const market = slice.market?.label || "历史市场";
  const timeframe = slice.timeframe?.label || "周期";
  const stage = analyzeKlineStage(slice.candles || []);
  const rangeText = range.start || range.end ? `${range.start || "起点"} 至 ${range.end || "终点"}` : "历史片段";
  return `${market} · ${timeframe} · ${rangeText} · ${stage}`;
}

function analyzeKlineStage(candles = []) {
  const rows = (candles || [])
    .map((item) => ({
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
      volume: Number(item.volume || 0)
    }))
    .filter((item) => [item.open, item.high, item.low, item.close].every(Number.isFinite));
  if (rows.length < 3) return "阶段位置待补全";

  const first = rows[0];
  const last = rows[rows.length - 1];
  const closeValues = rows.map((item) => item.close);
  const highValues = rows.map((item) => item.high);
  const lowValues = rows.map((item) => item.low);
  const high = Math.max(...highValues);
  const low = Math.min(...lowValues);
  const range = high - low;
  const locationRatio = range > 0 ? (last.close - low) / range : 0.5;
  const location = locationRatio >= 0.68 ? "区间上沿" : locationRatio <= 0.32 ? "区间下沿" : "区间中部";
  const changeRatio = first.close ? (last.close - first.close) / first.close : 0;
  const direction = changeRatio >= 0.035 ? "阶段上行" : changeRatio <= -0.035 ? "阶段回落" : "阶段震荡";
  const recent = rows.slice(-8);
  const recentAmplitude = average(recent.map((item) => {
    const base = item.open || item.close || 1;
    return Math.abs(item.high - item.low) / base;
  }));
  const amplitude = recentAmplitude >= 0.035 ? "波动放大" : recentAmplitude <= 0.012 ? "波动收敛" : "波动平稳";

  return `${direction} · ${location} · ${amplitude}`;
}

function average(values = []) {
  const rows = (values || []).map(Number).filter(Number.isFinite);
  if (!rows.length) return 0;
  return rows.reduce((sum, value) => sum + value, 0) / rows.length;
}

function normalizeOptionalBoolean(value) {
  if (value === true || value === false) return value;
  if (value === "true" || value === "yes") return true;
  if (value === "false" || value === "no") return false;
  return null;
}

function hasFieldValue(value) {
  return value !== undefined && value !== null && !(typeof value === "string" && value === "");
}

function firstPresent() {
  for (let index = 0; index < arguments.length; index += 1) {
    const value = arguments[index];
    if (hasFieldValue(value)) return value;
  }
  return undefined;
}

function readAliasedField(record = {}, camelKey, snakeKey, fallbackValues = []) {
  return firstPresent(record[camelKey], record[snakeKey], ...fallbackValues);
}

function addAliasedField(target, camelKey, snakeKey, value, normalize = (item) => item) {
  const normalized = normalize(value);
  if (!hasFieldValue(normalized)) return target;
  target[camelKey] = normalized;
  target[snakeKey] = normalized;
  return target;
}

function mergeAliasedPatch(target = {}, patch = {}, pairs = []) {
  pairs.forEach(([camelKey, snakeKey]) => {
    if (hasFieldValue(patch[camelKey])) {
      target[snakeKey] = patch[camelKey];
    }
    if (hasFieldValue(patch[snakeKey])) {
      target[camelKey] = patch[snakeKey];
    }
  });
  return target;
}

function normalizeAliasNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeAliasBoolean(value) {
  const normalized = normalizeOptionalBoolean(value);
  return normalized === null ? undefined : normalized;
}

function normalizeAliasList(value) {
  if (!hasFieldValue(value)) return undefined;
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((item) => cleanText(item, 80))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeStructuredField(value) {
  if (!hasFieldValue(value)) return undefined;
  if (Array.isArray(value)) {
    return value.map(normalizeStructuredField).filter(hasFieldValue).slice(0, 20);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "object") {
    return Object.keys(value).slice(0, 30).reduce((normalized, key) => {
      const nextValue = normalizeStructuredField(value[key]);
      if (hasFieldValue(nextValue)) normalized[cleanText(key, 60)] = nextValue;
      return normalized;
    }, {});
  }
  return cleanText(value, 260);
}

function normalizeKLineSamplingResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const result = {};
  addAliasedField(result, "segmentId", "segment_id", readAliasedField(value, "segmentId", "segment_id"), (item) => cleanText(item, 80));
  addAliasedField(result, "trainingPackId", "training_pack_id", readAliasedField(value, "trainingPackId", "training_pack_id"), (item) => cleanText(item, 80));
  addAliasedField(result, "errorType", "error_type", readAliasedField(value, "errorType", "error_type"), (item) => cleanText(item, 80));
  addAliasedField(result, "sceneTags", "scene_tags", readAliasedField(value, "sceneTags", "scene_tags"), normalizeAliasList);
  result.symbol = cleanText(value.symbol || "", 40);
  result.name = cleanText(value.name || "", 80);
  result.period = cleanText(value.period || "", 40);
  addAliasedField(result, "startDate", "start_date", readAliasedField(value, "startDate", "start_date"), (item) => cleanText(item, 40));
  addAliasedField(result, "endDate", "end_date", readAliasedField(value, "endDate", "end_date"), (item) => cleanText(item, 40));
  addAliasedField(result, "fallbackUsed", "fallback_used", readAliasedField(value, "fallbackUsed", "fallback_used"), normalizeAliasBoolean);
  addAliasedField(result, "fallbackReason", "fallback_reason", readAliasedField(value, "fallbackReason", "fallback_reason"), (item) => cleanText(item, 160));
  result.source = cleanText(value.source || "", 80);

  Object.keys(result).forEach((key) => {
    if (!hasFieldValue(result[key]) || (Array.isArray(result[key]) && result[key].length === 0)) {
      delete result[key];
    }
  });

  return Object.keys(result).length ? result : undefined;
}

function normalizeTrainingBookmark(record = {}, { userId = "", now = new Date().toISOString(), existing = null, requireReference = true } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;

  const samplingResult = normalizeKLineSamplingResult(readAliasedField(record, "samplingResult", "sampling_result", [existing?.samplingResult, existing?.sampling_result]));
  const resolvedUserId = cleanText(readAliasedField(record, "userId", "user_id", [existing?.userId, existing?.user_id, userId]), 80);
  const sessionId = cleanText(readAliasedField(record, "sessionId", "session_id", [existing?.sessionId, existing?.session_id]), 120);
  const bookmarkType = cleanText(readAliasedField(record, "bookmarkType", "bookmark_type", [existing?.bookmarkType, existing?.bookmark_type, sessionId ? "session" : ""]), 40);

  if (requireReference && !bookmarkType && !sessionId) {
    const error = new Error("训练收藏至少需要 bookmarkType 或 sessionId");
    error.statusCode = 400;
    throw error;
  }
  if (!bookmarkType && !sessionId) return null;

  const createdAt = cleanText(readAliasedField(record, "createdAt", "created_at", [existing?.createdAt, existing?.created_at, now]), 40);
  const updatedAt = cleanText(readAliasedField(record, "updatedAt", "updated_at", [now]), 40);
  const enabled = normalizeAliasBoolean(readAliasedField(record, "enabled", "enabled", [existing?.enabled, true]));
  const bookmark = {
    id: cleanText(record.id || existing?.id || crypto.randomUUID(), 120),
    userId: resolvedUserId,
    user_id: resolvedUserId,
    bookmarkType: bookmarkType || "session",
    bookmark_type: bookmarkType || "session",
    title: cleanText(record.title || existing?.title || "训练收藏", 100),
    enabled: enabled === undefined ? true : enabled,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt
  };

  addAliasedField(bookmark, "sessionId", "session_id", sessionId, (value) => cleanText(value, 120));
  addAliasedField(bookmark, "actionId", "action_id", readAliasedField(record, "actionId", "action_id", [existing?.actionId, existing?.action_id]), (value) => cleanText(value, 120));
  addAliasedField(bookmark, "barIndex", "bar_index", readAliasedField(record, "barIndex", "bar_index", [existing?.barIndex, existing?.bar_index]), normalizeAliasNumber);
  addAliasedField(bookmark, "sourceType", "source_type", readAliasedField(record, "sourceType", "source_type", [existing?.sourceType, existing?.source_type]), (value) => cleanText(value, 60));
  addAliasedField(bookmark, "errorType", "error_type", readAliasedField(record, "errorType", "error_type", [existing?.errorType, existing?.error_type, samplingResult?.errorType, samplingResult?.error_type]), (value) => cleanText(value, 80));
  addAliasedField(bookmark, "sceneTags", "scene_tags", readAliasedField(record, "sceneTags", "scene_tags", [existing?.sceneTags, existing?.scene_tags, samplingResult?.sceneTags, samplingResult?.scene_tags]), normalizeAliasList);
  addAliasedField(bookmark, "executionResult", "execution_result", readAliasedField(record, "executionResult", "execution_result", [existing?.executionResult, existing?.execution_result]), (value) => cleanText(value, 120));
  addAliasedField(bookmark, "segmentId", "segment_id", readAliasedField(record, "segmentId", "segment_id", [existing?.segmentId, existing?.segment_id, samplingResult?.segmentId, samplingResult?.segment_id]), (value) => cleanText(value, 100));
  addAliasedField(bookmark, "trainingPackId", "training_pack_id", readAliasedField(record, "trainingPackId", "training_pack_id", [existing?.trainingPackId, existing?.training_pack_id, samplingResult?.trainingPackId, samplingResult?.training_pack_id]), (value) => cleanText(value, 100));
  addAliasedField(bookmark, "samplingResult", "sampling_result", samplingResult);
  bookmark.symbol = cleanText(record.symbol || existing?.symbol || samplingResult?.symbol || "", 40);
  bookmark.period = cleanText(record.period || existing?.period || samplingResult?.period || "", 40);
  addAliasedField(bookmark, "startDate", "start_date", readAliasedField(record, "startDate", "start_date", [existing?.startDate, existing?.start_date, samplingResult?.startDate, samplingResult?.start_date]), (value) => cleanText(value, 40));
  addAliasedField(bookmark, "endDate", "end_date", readAliasedField(record, "endDate", "end_date", [existing?.endDate, existing?.end_date, samplingResult?.endDate, samplingResult?.end_date]), (value) => cleanText(value, 40));
  bookmark.note = cleanText(record.note || existing?.note || "", 240);

  Object.keys(bookmark).forEach((key) => {
    if (!hasFieldValue(bookmark[key]) || (Array.isArray(bookmark[key]) && bookmark[key].length === 0)) {
      delete bookmark[key];
    }
  });

  return bookmark;
}

function filterTrainingBookmarks(bookmarks = [], options = {}) {
  const includeDisabled = parseBooleanOption(options.includeDisabled ?? options.include_disabled);
  const bookmarkType = cleanText(readAliasedField(options, "bookmarkType", "bookmark_type"), 40);
  const sourceType = cleanText(readAliasedField(options, "sourceType", "source_type"), 60);
  const errorType = cleanText(readAliasedField(options, "errorType", "error_type"), 80);
  const segmentId = cleanText(readAliasedField(options, "segmentId", "segment_id"), 100);
  const trainingPackId = cleanText(readAliasedField(options, "trainingPackId", "training_pack_id"), 100);

  return bookmarks
    .filter((bookmark) => includeDisabled || bookmark.enabled !== false)
    .filter((bookmark) => !bookmarkType || bookmark.bookmarkType === bookmarkType || bookmark.bookmark_type === bookmarkType)
    .filter((bookmark) => !sourceType || bookmark.sourceType === sourceType || bookmark.source_type === sourceType)
    .filter((bookmark) => !errorType || bookmark.errorType === errorType || bookmark.error_type === errorType)
    .filter((bookmark) => !segmentId || bookmark.segmentId === segmentId || bookmark.segment_id === segmentId)
    .filter((bookmark) => !trainingPackId || bookmark.trainingPackId === trainingPackId || bookmark.training_pack_id === trainingPackId)
    .sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime() - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime());
}

function normalizeInterventionEvent(record = {}, { userId = "", now = new Date().toISOString(), existing = null, requireTrigger = true } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;

  assertNoInterventionAdvisoryLanguage(record, ["message", "suggestedAction", "suggested_action", "expectedAction", "expected_action"]);

  const resolvedUserId = cleanText(readAliasedField(record, "userId", "user_id", [existing?.userId, existing?.user_id, userId]), 80);
  const triggerType = cleanText(readAliasedField(record, "triggerType", "trigger_type", [existing?.triggerType, existing?.trigger_type]), 80);
  const message = cleanText(record.message || existing?.message || "先停一下，回到你的执行计划。", 220);

  if (requireTrigger && !triggerType && !message) {
    const error = new Error("知行提醒事件至少需要 triggerType 或 message");
    error.statusCode = 400;
    throw error;
  }
  if (!triggerType && !message) return null;

  const createdAt = cleanText(readAliasedField(record, "createdAt", "created_at", [existing?.createdAt, existing?.created_at, now]), 40);
  const updatedAt = cleanText(readAliasedField(record, "updatedAt", "updated_at", [now]), 40);
  const enabled = normalizeAliasBoolean(readAliasedField(record, "enabled", "enabled", [existing?.enabled, true]));
  const interventionEvent = {
    id: cleanText(record.id || existing?.id || crypto.randomUUID(), 120),
    userId: resolvedUserId,
    user_id: resolvedUserId,
    triggerType: triggerType || "before_training",
    trigger_type: triggerType || "before_training",
    message,
    enabled: enabled === undefined ? true : enabled,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt
  };

  addAliasedField(interventionEvent, "sourceType", "source_type", readAliasedField(record, "sourceType", "source_type", [existing?.sourceType, existing?.source_type]), (value) => cleanText(value, 80));
  addAliasedField(interventionEvent, "sessionId", "session_id", readAliasedField(record, "sessionId", "session_id", [existing?.sessionId, existing?.session_id]), (value) => cleanText(value, 120));
  addAliasedField(interventionEvent, "reviewId", "review_id", readAliasedField(record, "reviewId", "review_id", [existing?.reviewId, existing?.review_id]), (value) => cleanText(value, 120));
  addAliasedField(interventionEvent, "planId", "plan_id", readAliasedField(record, "planId", "plan_id", [existing?.planId, existing?.plan_id]), (value) => cleanText(value, 120));
  addAliasedField(interventionEvent, "errorType", "error_type", readAliasedField(record, "errorType", "error_type", [existing?.errorType, existing?.error_type]), (value) => cleanText(value, 80));
  addAliasedField(interventionEvent, "firstThought", "first_thought", readAliasedField(record, "firstThought", "first_thought", [existing?.firstThought, existing?.first_thought]), (value) => cleanText(value, 180));
  addAliasedField(interventionEvent, "sceneTags", "scene_tags", readAliasedField(record, "sceneTags", "scene_tags", [existing?.sceneTags, existing?.scene_tags]), normalizeAliasList);
  addAliasedField(interventionEvent, "triggerScene", "trigger_scene", readAliasedField(record, "triggerScene", "trigger_scene", [existing?.triggerScene, existing?.trigger_scene]), (value) => cleanText(value, 120));
  addAliasedField(interventionEvent, "suggestedAction", "suggested_action", readAliasedField(record, "suggestedAction", "suggested_action", [existing?.suggestedAction, existing?.suggested_action]), (value) => cleanText(value, 180));
  addAliasedField(interventionEvent, "expectedAction", "expected_action", readAliasedField(record, "expectedAction", "expected_action", [existing?.expectedAction, existing?.expected_action]), (value) => cleanText(value, 180));
  addAliasedField(interventionEvent, "userResponse", "user_response", readAliasedField(record, "userResponse", "user_response", [existing?.userResponse, existing?.user_response]), (value) => cleanText(value, 80));
  addAliasedField(interventionEvent, "executionResult", "execution_result", readAliasedField(record, "executionResult", "execution_result", [existing?.executionResult, existing?.execution_result]), (value) => cleanText(value, 80));
  interventionEvent.metadata = normalizeStructuredField(record.metadata || existing?.metadata || {});

  Object.keys(interventionEvent).forEach((key) => {
    if (!hasFieldValue(interventionEvent[key]) || (Array.isArray(interventionEvent[key]) && interventionEvent[key].length === 0)) {
      delete interventionEvent[key];
    }
  });

  return interventionEvent;
}

function filterInterventionEvents(events = [], options = {}) {
  const includeDisabled = parseBooleanOption(options.includeDisabled ?? options.include_disabled);
  const triggerType = cleanText(readAliasedField(options, "triggerType", "trigger_type"), 80);
  const sourceType = cleanText(readAliasedField(options, "sourceType", "source_type"), 80);
  const errorType = cleanText(readAliasedField(options, "errorType", "error_type"), 80);
  const sessionId = cleanText(readAliasedField(options, "sessionId", "session_id"), 120);
  const reviewId = cleanText(readAliasedField(options, "reviewId", "review_id"), 120);
  const planId = cleanText(readAliasedField(options, "planId", "plan_id"), 120);

  return events
    .filter((event) => includeDisabled || event.enabled !== false)
    .filter((event) => !triggerType || event.triggerType === triggerType || event.trigger_type === triggerType)
    .filter((event) => !sourceType || event.sourceType === sourceType || event.source_type === sourceType)
    .filter((event) => !errorType || event.errorType === errorType || event.error_type === errorType)
    .filter((event) => !sessionId || event.sessionId === sessionId || event.session_id === sessionId)
    .filter((event) => !reviewId || event.reviewId === reviewId || event.review_id === reviewId)
    .filter((event) => !planId || event.planId === planId || event.plan_id === planId)
    .sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime() - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime());
}

function normalizeInterventionRule(record = {}, { userId = "", now = new Date().toISOString(), existing = null, requireTrigger = true } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;

  assertNoInterventionAdvisoryLanguage(record, ["messageTemplate", "message_template", "expectedAction", "expected_action"]);

  const triggerType = cleanText(readAliasedField(record, "triggerType", "trigger_type", [existing?.triggerType, existing?.trigger_type]), 80);
  const messageTemplate = cleanText(readAliasedField(record, "messageTemplate", "message_template", [existing?.messageTemplate, existing?.message_template, "先停一下，回到你的执行计划。"]), 220);
  if (requireTrigger && !triggerType && !messageTemplate) {
    const error = new Error("知行提醒规则至少需要 triggerType 或 messageTemplate");
    error.statusCode = 400;
    throw error;
  }
  if (!triggerType && !messageTemplate) return null;

  const createdAt = cleanText(readAliasedField(record, "createdAt", "created_at", [existing?.createdAt, existing?.created_at, now]), 40);
  const updatedAt = cleanText(readAliasedField(record, "updatedAt", "updated_at", [now]), 40);
  const enabled = normalizeAliasBoolean(readAliasedField(record, "enabled", "enabled", [existing?.enabled, true]));
  const resolvedUserId = cleanText(readAliasedField(record, "userId", "user_id", [existing?.userId, existing?.user_id, userId]), 80);
  const interventionRule = {
    id: cleanText(record.id || existing?.id || crypto.randomUUID(), 120),
    title: cleanText(record.title || existing?.title || "知行提醒规则", 100),
    triggerType: triggerType || "before_training",
    trigger_type: triggerType || "before_training",
    messageTemplate,
    message_template: messageTemplate,
    enabled: enabled === undefined ? true : enabled,
    priority: normalizeAliasNumber(record.priority ?? existing?.priority) || 0,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt
  };

  if (resolvedUserId) {
    interventionRule.userId = resolvedUserId;
    interventionRule.user_id = resolvedUserId;
  }
  addAliasedField(interventionRule, "errorType", "error_type", readAliasedField(record, "errorType", "error_type", [existing?.errorType, existing?.error_type]), (value) => cleanText(value, 80));
  addAliasedField(interventionRule, "sceneTags", "scene_tags", readAliasedField(record, "sceneTags", "scene_tags", [existing?.sceneTags, existing?.scene_tags]), normalizeAliasList);
  addAliasedField(interventionRule, "expectedAction", "expected_action", readAliasedField(record, "expectedAction", "expected_action", [existing?.expectedAction, existing?.expected_action]), (value) => cleanText(value, 180));
  addAliasedField(interventionRule, "maxPerSession", "max_per_session", readAliasedField(record, "maxPerSession", "max_per_session", [existing?.maxPerSession, existing?.max_per_session]), normalizeAliasNumber);
  addAliasedField(interventionRule, "cooldownMinutes", "cooldown_minutes", readAliasedField(record, "cooldownMinutes", "cooldown_minutes", [existing?.cooldownMinutes, existing?.cooldown_minutes]), normalizeAliasNumber);

  Object.keys(interventionRule).forEach((key) => {
    if (!hasFieldValue(interventionRule[key]) || (Array.isArray(interventionRule[key]) && interventionRule[key].length === 0)) {
      delete interventionRule[key];
    }
  });

  return interventionRule;
}

function filterInterventionRules(rules = [], options = {}) {
  const includeDisabled = parseBooleanOption(options.includeDisabled ?? options.include_disabled);
  const triggerType = cleanText(readAliasedField(options, "triggerType", "trigger_type"), 80);
  const errorType = cleanText(readAliasedField(options, "errorType", "error_type"), 80);

  return rules
    .filter((rule) => includeDisabled || rule.enabled !== false)
    .filter((rule) => !triggerType || rule.triggerType === triggerType || rule.trigger_type === triggerType)
    .filter((rule) => !errorType || rule.errorType === errorType || rule.error_type === errorType)
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime() - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime());
}

function normalizeExecutionPlan(record = {}, { userId = "", now = new Date().toISOString(), existing = null, requireTitle = true } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;

  assertNoInterventionAdvisoryLanguage(record, ["expectedAction", "expected_action", "nextAction", "next_action"]);

  const title = cleanText(record.title || existing?.title || "", 100);
  if (requireTitle && !title) {
    const error = new Error("执行计划至少需要 title");
    error.statusCode = 400;
    throw error;
  }
  if (!title) return null;

  const resolvedUserId = cleanText(readAliasedField(record, "userId", "user_id", [existing?.userId, existing?.user_id, userId]), 80);
  const createdAt = cleanText(readAliasedField(record, "createdAt", "created_at", [existing?.createdAt, existing?.created_at, now]), 40);
  const updatedAt = cleanText(readAliasedField(record, "updatedAt", "updated_at", [now]), 40);
  const enabled = normalizeAliasBoolean(readAliasedField(record, "enabled", "enabled", [existing?.enabled, true]));
  const executionPlan = {
    id: cleanText(record.id || existing?.id || crypto.randomUUID(), 120),
    userId: resolvedUserId,
    user_id: resolvedUserId,
    title,
    enabled: enabled === undefined ? true : enabled,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt
  };

  addAliasedField(executionPlan, "errorType", "error_type", readAliasedField(record, "errorType", "error_type", [existing?.errorType, existing?.error_type]), (value) => cleanText(value, 80));
  addAliasedField(executionPlan, "sceneTags", "scene_tags", readAliasedField(record, "sceneTags", "scene_tags", [existing?.sceneTags, existing?.scene_tags]), normalizeAliasList);
  addAliasedField(executionPlan, "firstThoughts", "first_thoughts", readAliasedField(record, "firstThoughts", "first_thoughts", [existing?.firstThoughts, existing?.first_thoughts]), normalizeAliasList);
  addAliasedField(executionPlan, "forbiddenActions", "forbidden_actions", readAliasedField(record, "forbiddenActions", "forbidden_actions", [existing?.forbiddenActions, existing?.forbidden_actions]), normalizeAliasList);
  addAliasedField(executionPlan, "expectedAction", "expected_action", readAliasedField(record, "expectedAction", "expected_action", [existing?.expectedAction, existing?.expected_action]), (value) => cleanText(value, 180));
  addAliasedField(executionPlan, "nextAction", "next_action", readAliasedField(record, "nextAction", "next_action", [existing?.nextAction, existing?.next_action]), (value) => cleanText(value, 180));
  addAliasedField(executionPlan, "trainingPrescription", "training_prescription", readAliasedField(record, "trainingPrescription", "training_prescription", [existing?.trainingPrescription, existing?.training_prescription]), (value) => cleanText(value, 180));

  Object.keys(executionPlan).forEach((key) => {
    if (!hasFieldValue(executionPlan[key]) || (Array.isArray(executionPlan[key]) && executionPlan[key].length === 0)) {
      delete executionPlan[key];
    }
  });

  return executionPlan;
}

function filterExecutionPlans(plans = [], options = {}) {
  const includeDisabled = parseBooleanOption(options.includeDisabled ?? options.include_disabled);
  const errorType = cleanText(readAliasedField(options, "errorType", "error_type"), 80);

  return plans
    .filter((plan) => includeDisabled || plan.enabled !== false)
    .filter((plan) => !errorType || plan.errorType === errorType || plan.error_type === errorType)
    .sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime() - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime());
}

function assertNoInterventionAdvisoryLanguage(record = {}, keys = []) {
  const text = keys
    .map((key) => record[key])
    .filter(hasFieldValue)
    .map((value) => typeof value === "string" ? value : JSON.stringify(value))
    .join("\n");
  const forbidden = interventionForbiddenPhrases.find((phrase) => text.includes(phrase));
  if (forbidden) {
    const error = new Error(`知行提醒文案不能包含交易建议、买卖信号或行情预测：${forbidden}`);
    error.statusCode = 400;
    throw error;
  }
}

function parseBooleanOption(value) {
  return value === true || value === "true" || value === "1";
}

function normalizeTradeReviewOcrDraft(draft) {
  if (!draft || typeof draft !== "object") return null;
  const fields = draft.fields && typeof draft.fields === "object" ? draft.fields : {};
  return {
    id: cleanText(draft.id || "", 80),
    status: cleanText(draft.status || "pending_confirmation", 40),
    provider: cleanText(draft.provider || "manual_confirmation", 60),
    confidence: clampPercent(draft.confidence),
    needsUserConfirmation: draft.needsUserConfirmation !== false && draft.needs_user_confirmation !== false,
    fields: {
      tradeDate: cleanText(fields.tradeDate || fields.trade_date || "", 40),
      marketType: cleanText(fields.marketType || fields.market_type || "", 40),
      marketKey: cleanText(fields.marketKey || fields.market_key || "", 40),
      timeframeKey: cleanText(fields.timeframeKey || fields.timeframe_key || "", 40),
      symbol: cleanText(fields.symbol || "", 40),
      rawText: cleanText(fields.rawText || fields.raw_text || "", 500)
    },
    message: cleanText(draft.message || "", 160),
    createdAt: cleanText(draft.createdAt || draft.created_at || "", 40)
  };
}

function normalizeRadarComparison(item) {
  const before = clampPercent(item.before);
  const after = clampPercent(item.after);
  return {
    key: String(item.key || item.label || crypto.randomUUID()),
    label: cleanText(item.label || item.key || "风险项", 40),
    before,
    after,
    delta: Number.isFinite(Number(item.delta)) ? Number(item.delta) : after - before
  };
}

function buildMirrorReportFromAssessment(report, record = {}) {
  if (!report) return null;
  const mainMirror = inferMirrorName([
    report.primaryType?.label,
    report.primaryPersonality?.label,
    report.firstThought,
    report.firstThoughtDisplay,
    getStrongestRisk(report)?.label
  ], "追涨之镜");
  const subMirror = inferSecondaryMirror(report, mainMirror);
  const thieves = normalizeThieves([], [
    report.firstThought,
    report.firstThoughtDisplay,
    mainMirror,
    getStrongestRisk(report)?.label
  ]);

  return {
    id: cleanText(report.reportId || `MIR-${crypto.randomUUID()}`, 80),
    userId: cleanText(record.id || report.userId || "", 80),
    schemaVersion: livingMirrorSchemaVersion,
    verdict: cleanText(report.conclusion || `你照见的是${mainMirror}，先从一个可执行动作开始训练。`, 180),
    mainMirror,
    subMirror,
    thieves,
    riskRadar: (report.riskRadar || []).map((item) => ({
      key: String(item.key || item.label || crypto.randomUUID()),
      label: cleanText(item.label || item.key || "风险项", 40),
      value: clampPercent(item.value),
      mirror: inferMirrorName([item.label, item.description, item.key], mainMirror),
      note: cleanText(item.description || "", 160)
    })),
    typicalLoop: buildTypicalLoop(report, mainMirror),
    sevenDayPrescription: buildSevenDayPrescription(report, mainMirror),
    campSuggestion: {
      level: getStrongestRisk(report)?.value >= 70 ? "assistant_followup" : "self_practice",
      title: cleanText(report.campSuggestion?.name || `${mainMirror}七日修行`, 80),
      reason: cleanText(report.campSuggestion?.reason || "根据当前主镜推荐七日训练路径。", 160),
      focus: cleanText(report.campSuggestion?.focus || report.trainingDirection || "照见第一念、记录触发、复盘动作。", 160)
    },
    complianceNotice: "本报告用于交易心理觉察与训练，不构成投资建议",
    createdAt: report.createdAt || new Date().toISOString()
  };
}

function buildTypicalLoop(report, mainMirror) {
  const trigger = report.emotionalTriggers?.[0];
  return [
    `触发：${cleanText(trigger?.description || "交易场景中出现第一念。", 90)}`,
    `真实念头：${cleanText(report.firstThought || report.firstThoughtDisplay || "想立刻行动。", 90)}`,
    `心镜共鸣：${mainMirror}`,
    `训练动作：${cleanText(report.trainingDirection || "停十秒，记录念头，再复盘。", 90)}`
  ];
}

function buildSevenDayPrescription(report, mainMirror) {
  const items = Array.isArray(report.trainingPrescription7Days) ? report.trainingPrescription7Days : [];
  const source = items.length ? items : Array.from({ length: 7 }, (_, index) => ({
    day: index + 1,
    theme: `第 ${index + 1} 日事上练`,
    action: "停十秒，记录念头，再复盘。",
    reflectionPrompt: "今天看见了哪一念？"
  }));

  return source.slice(0, 7).map((item) => ({
    day: Number(item.day || 1),
    mirror: mainMirror,
    title: cleanText(item.theme || item.title || "今日事上练", 60),
    action: cleanText(item.action || "停十秒，记录念头，再复盘。", 160),
    reflectionPrompt: cleanText(item.reflectionPrompt || item.reflection_prompt || "今天看见了哪一念？", 160)
  }));
}

function refreshLivingMirrorState(record, { updateTrend = true } = {}) {
  if (!record) return null;
  if (!record.mirror_report && record.assessment?.report) {
    record.mirror_report = buildMirrorReportFromAssessment(record.assessment.report, record);
  }
  record.trade_reviews = (record.trade_reviews || []).map((review) => withTradeReviewCrossEndStatus(review, record));

  const now = new Date().toISOString();
  const completedCount = (record.training_records || []).filter((item) => item.status === "completed").length;
  const klineCount = (record.kline_records || []).length;
  const tradeReviewCount = (record.trade_reviews || []).length;
  const mirrorScores = buildMirrorScores(record, { completedCount, klineCount, tradeReviewCount });
  const thiefCounts = buildThiefCounts(record);
  const trainingCompletionRate = clampPercent((completedCount / 7) * 100);
  const loopRelapseCount = tradeReviewCount;
  const conscienceGrowth = mirrorScores.conscience;
  const trendPoint = {
    date: now.slice(0, 10),
    mirrorScores,
    conscienceGrowth,
    trainingCompletionRate,
    loopRelapseCount
  };
  const previousTrend = Array.isArray(record.living_mirror_stats?.growthTrend) ? record.living_mirror_stats.growthTrend : [];
  const growthTrend = updateTrend
    ? [...previousTrend.filter((item) => item.date !== trendPoint.date), trendPoint].slice(-30)
    : previousTrend.length ? previousTrend : [trendPoint];

  record.living_mirror_stats = {
    userId: record.id,
    schemaVersion: livingMirrorSchemaVersion,
    mirrorScores,
    thiefCounts,
    growthTrend,
    trainingCompletionRate,
    loopRelapseCount,
    conscienceGrowth,
    lastUpdated: now
  };
  record.living_mirror_profile = buildLivingMirrorProfile(record);
  record.training_prescription = buildTrainingPrescription(record, record.training_prescription || {});

  return record.living_mirror_stats;
}

function buildLivingMirrorProfile(record = {}) {
  const now = new Date().toISOString();
  const assessmentMirror = normalizeMirrorName(record.mirror_report?.mainMirror || "");
  const klineMirror = getTopMirrorFromKlineRecords(record.kline_records || [], assessmentMirror);
  const tradeMirror = getTopMirrorFromTradeReviews(record.trade_reviews || []);
  const rows = [
    buildProfileSourceRow("assessment", "九镜测评", assessmentMirror, record.mirror_report ? "已入档" : "待测评", record.mirror_report?.id || ""),
    buildProfileSourceRow("kline", "K线盲练", klineMirror.mirror, klineMirror.count ? `${klineMirror.count} 次显现` : "待训练", ""),
    buildProfileSourceRow("trade", "真实交易记录", tradeMirror.mirror, tradeMirror.count ? `${tradeMirror.count} 次显现` : "待复盘", "")
  ];
  const triple = buildTripleReflection(rows);
  const marketContexts = (record.trade_reviews || [])
    .slice(-5)
    .reverse()
    .map((review) => review.marketContext)
    .filter(Boolean);

  return {
    schemaVersion: "living_mirror_profile_v1",
    userId: record.id,
    currentMainMirror: triple.mainMirror,
    currentStage: resolveLivingMirrorStage(record, triple),
    sources: rows,
    tripleReflection: triple,
    marketContexts,
    latestMarketContext: marketContexts[0] || null,
    trainingFocus: buildProfileTrainingFocus(triple.mainMirror),
    sourceCounts: {
      assessment: record.mirror_report ? 1 : 0,
      klineBlind: (record.kline_records || []).length,
      tradeReview: (record.trade_reviews || []).length
    },
    updatedAt: now,
    complianceNotice: "本画像仅用于交易心理觉察、复盘训练与行为管理，不构成投资建议。"
  };
}

function buildLivingMirrorSideChannelProfile(record = {}) {
  const stats = record.living_mirror_stats || refreshLivingMirrorState(record, { updateTrend: false }) || {};
  const profile = record.living_mirror_profile || buildLivingMirrorProfile(record);
  const repeatedThoughts = collectRepeatedLivingMirrorThoughts(record);
  const latestReview = getLatestTradeReview(record);
  const totalEvents = getLivingMirrorEventCount(record);
  const updatedAt = latestIso(
    profile.updatedAt || profile.updated_at || stats.lastUpdated || stats.last_updated || "",
    latestReview.updatedAt || latestReview.updated_at || latestReview.createdAt || latestReview.created_at || latestReview.tradeDate || latestReview.trade_date || record.updated_at || ""
  );
  const latestBoundaryState = cleanText(
    latestReview.nextAction ||
    latestReview.next_action ||
    latestReview.nextRule ||
    latestReview.next_rule ||
    profile.tripleReflection?.nextCalibration ||
    profile.trainingFocus ||
    buildProfileTrainingFocus(profile.currentMainMirror),
    180
  );

  return {
    ...profile,
    totalEvents,
    total_events: totalEvents,
    eventCount: totalEvents,
    event_count: totalEvents,
    dominantReaction: profile.currentMainMirror || profile.tripleReflection?.mainMirror || "",
    dominant_reaction: profile.currentMainMirror || profile.tripleReflection?.mainMirror || "",
    repeatedThoughts,
    repeated_thoughts: repeatedThoughts,
    latestBoundaryState,
    latest_boundary_state: latestBoundaryState,
    updatedAt,
    updated_at: updatedAt,
    source: "data_binding_living_mirror",
    complianceNotice: profile.complianceNotice || "本画像仅用于交易心理觉察、复盘训练与行为管理，不构成投资建议。"
  };
}

function buildLivingMirrorGrowthProjection(record = {}) {
  const stats = record.living_mirror_stats || refreshLivingMirrorState(record, { updateTrend: false }) || {};
  const profile = buildLivingMirrorSideChannelProfile(record);
  const prescription = record.training_prescription || buildTrainingPrescription(record);
  const activeDays = countLivingMirrorActiveDays(record);
  const completedDays = (record.training_records || []).filter((item) => item.status === "completed").length;
  const totalEvents = profile.totalEvents || 0;
  const nextAction = cleanText(
    profile.latestBoundaryState ||
    prescription.action ||
    profile.trainingFocus ||
    "下一次交易前，先照见这一念。",
    180
  );
  const updatedAt = profile.updatedAt || stats.lastUpdated || stats.last_updated || record.updated_at || "";

  return {
    schemaVersion: "living_mirror_growth_projection_v1",
    schema_version: "living_mirror_growth_projection_v1",
    userId: record.id || "",
    user_id: record.id || "",
    stage: profile.currentStage || "活镜显影",
    stageText: profile.currentStage || "活镜显影",
    stage_text: profile.currentStage || "活镜显影",
    currentStage: profile.currentStage || "活镜显影",
    current_stage: profile.currentStage || "活镜显影",
    mirrorLifeStage: profile.currentStage || "活镜显影",
    mirror_life_stage: profile.currentStage || "活镜显影",
    topThought: profile.repeatedThoughts?.[0] || "",
    topThoughtText: profile.repeatedThoughts?.[0] || "",
    top_thought_text: profile.repeatedThoughts?.[0] || "",
    repeatedThoughts: profile.repeatedThoughts || [],
    repeated_thoughts: profile.repeatedThoughts || [],
    totalEvents,
    total_events: totalEvents,
    activeDays,
    active_days: activeDays,
    completedDays,
    completed_days: completedDays,
    nextAction,
    next_action: nextAction,
    nextActionText: nextAction,
    next_action_text: nextAction,
    zhixing: stats.conscienceGrowth || 0,
    zhixingText: `良知稳定度 ${Math.round(Number(stats.conscienceGrowth || 0))}`,
    zhixingScoreText: `良知稳定度 ${Math.round(Number(stats.conscienceGrowth || 0))}`,
    trainingContinuity: {
      totalEvents,
      total_events: totalEvents,
      activeDays,
      active_days: activeDays,
      completedDays,
      completed_days: completedDays,
      latestRecordedAt: updatedAt,
      latest_recorded_at: updatedAt
    },
    training_continuity: {
      totalEvents,
      total_events: totalEvents,
      activeDays,
      active_days: activeDays,
      completedDays,
      completed_days: completedDays,
      latestRecordedAt: updatedAt,
      latest_recorded_at: updatedAt
    },
    nextCycleFocus: {
      title: prescription.title || "下一次只练一件事",
      action: nextAction
    },
    next_cycle_focus: {
      title: prescription.title || "下一次只练一件事",
      action: nextAction
    },
    zhixingStability: {
      totalText: `良知稳定度 ${Math.round(Number(stats.conscienceGrowth || 0))}`,
      total_text: `良知稳定度 ${Math.round(Number(stats.conscienceGrowth || 0))}`,
      summary: profile.tripleReflection?.conclusion || profile.trainingFocus || "活镜正在根据真实记录显影。"
    },
    zhixing_stability: {
      totalText: `良知稳定度 ${Math.round(Number(stats.conscienceGrowth || 0))}`,
      total_text: `良知稳定度 ${Math.round(Number(stats.conscienceGrowth || 0))}`,
      summary: profile.tripleReflection?.conclusion || profile.trainingFocus || "活镜正在根据真实记录显影。"
    },
    updatedAt,
    updated_at: updatedAt,
    complianceNotice: "本投影仅用于交易心理觉察、复盘训练与行为管理，不构成投资建议。"
  };
}

function collectRepeatedLivingMirrorThoughts(record = {}) {
  const reviewThoughts = (record.trade_reviews || []).flatMap((review) => [
    review.strongestThought,
    review.strongest_thought,
    review.firstThought,
    review.first_thought
  ]);
  const klineThoughts = (record.kline_records || []).flatMap((item) => [
    item.reaction,
    item.firstThought,
    item.first_thought,
    item.errorType,
    item.error_type
  ]);
  return topCountItems([...reviewThoughts, ...klineThoughts], 3).map((item) => item.label);
}

function getLatestTradeReview(record = {}) {
  const reviews = record.trade_reviews || [];
  return reviews.length ? reviews[reviews.length - 1] : {};
}

function getLivingMirrorEventCount(record = {}) {
  return (record.trade_reviews || []).length +
    (record.kline_records || []).length +
    (record.training_records || []).length;
}

function countLivingMirrorActiveDays(record = {}) {
  const dates = [
    ...(record.trade_reviews || []).flatMap((item) => [item.tradeDate, item.trade_date, item.createdAt, item.created_at]),
    ...(record.kline_records || []).flatMap((item) => [item.recorded_at, item.recordedAt, item.createdAt, item.created_at]),
    ...(record.training_records || []).flatMap((item) => [item.date_key, item.recorded_at, item.recordedAt, item.createdAt, item.created_at])
  ]
    .map((value) => cleanText(value, 40))
    .filter(Boolean)
    .map((value) => value.includes("T") ? value.slice(0, 10) : value.slice(0, 10))
    .filter(Boolean);
  return new Set(dates).size;
}

function buildProfileSourceRow(key, name, mirror, statusText, sourceId = "") {
  return {
    key,
    name,
    mirror: mirror || "待照见",
    statusText,
    sourceId
  };
}

function getTopMirrorFromTradeReviews(reviews = []) {
  return topMirror(reviews.map((review) => review.detectedMirror || ""));
}

function getTopMirrorFromKlineRecords(records = [], fallbackMirror = "") {
  const mirrors = (records || []).map((record) => inferMirrorName([
    record.reaction,
    record.scene,
    record.feedback,
    record.process_insight,
    record.training_suggestion
  ], fallbackMirror || "良知之镜"));
  return topMirror(mirrors);
}

function topMirror(values = []) {
  const counts = values.reduce((result, value) => {
    const mirror = normalizeMirrorName(value || "");
    if (!mirror) return result;
    result[mirror] = (result[mirror] || 0) + 1;
    return result;
  }, {});
  return Object.keys(counts)
    .map((mirror) => ({ mirror, count: counts[mirror] }))
    .sort((a, b) => b.count - a.count || a.mirror.localeCompare(b.mirror))[0] || { mirror: "", count: 0 };
}

function buildTripleReflection(rows = []) {
  const mirrors = rows.map((row) => row.mirror).filter((mirror) => mirror && mirror !== "待照见");
  const counts = mirrors.reduce((result, mirror) => {
    result[mirror] = (result[mirror] || 0) + 1;
    return result;
  }, {});
  const top = Object.keys(counts)
    .map((mirror) => ({ mirror, count: counts[mirror] }))
    .sort((a, b) => b.count - a.count || a.mirror.localeCompare(b.mirror))[0];
  const state = resolveTripleState({ mirrors, top, uniqueCount: Object.keys(counts).length });
  const mainMirror = top?.mirror || mirrors[0] || "待照见";
  const insight = buildTripleVerificationInsight({ rows, state, mainMirror });
  return {
    version: "triple-reflection-v1",
    title: "三证互照",
    state: state.key,
    stateLabel: state.label,
    mainMirror,
    rows,
    conclusion: insight.conclusion,
    unifiedConclusion: insight.unifiedConclusion,
    proofLine: insight.proofLine,
    evidenceLevel: insight.evidenceLevel,
    evidenceLevelText: insight.evidenceLevelText,
    matchedSources: insight.matchedSources,
    conflictSources: insight.conflictSources,
    missingSources: insight.missingSources,
    nextCalibration: insight.nextCalibration,
    prescription: buildProfileTrainingFocus(mainMirror),
    updatedAt: new Date().toISOString()
  };
}

function resolveTripleState({ mirrors, top, uniqueCount }) {
  if (!mirrors.length) return { key: "empty", label: "待入镜" };
  if (mirrors.length < 3) return { key: "insufficient", label: "待补全" };
  if (top?.count === 3) return { key: "aligned", label: "三路同向" };
  if (top?.count === 2) return { key: "partial", label: "两路同向" };
  if (uniqueCount >= 3) return { key: "conflict", label: "需要校准" };
  return { key: "insufficient", label: "待补全" };
}

function buildTripleVerificationInsight({ rows = [], state = {}, mainMirror = "待照见" } = {}) {
  const activeRows = rows.filter((row) => row.mirror && row.mirror !== "待照见");
  const matchedSources = activeRows.filter((row) => row.mirror === mainMirror).map(toTripleSourceSummary);
  const conflictSources = activeRows.filter((row) => row.mirror !== mainMirror).map(toTripleSourceSummary);
  const missingSources = rows.filter((row) => !row.mirror || row.mirror === "待照见").map((row) => ({
    key: row.key,
    name: row.name,
    statusText: row.statusText
  }));
  const formula = activeRows.length
    ? activeRows.map((row) => `${row.name}：${row.mirror}`).join(" + ")
    : "九镜测评 + K线盲练 + 真实交易记录";
  const missingText = missingSources.map((row) => row.name).join("、");

  if (state.key === "empty") {
    return {
      evidenceLevel: "empty",
      evidenceLevelText: "待入镜",
      proofLine: `${formula} → 待生成主镜`,
      unifiedConclusion: "三证尚未形成",
      conclusion: "先完成九镜测评、K线盲练或真实交易记录，活镜画像会开始生成。",
      matchedSources,
      conflictSources,
      missingSources,
      nextCalibration: "先完成九镜测评，再做一次K线盲练和一条真实复盘。"
    };
  }

  if (state.key === "aligned") {
    return {
      evidenceLevel: "strong",
      evidenceLevelText: "强印证",
      proofLine: `${formula} → ${mainMirror}增强`,
      unifiedConclusion: `${mainMirror}增强`,
      conclusion: `九镜测评、K线盲练、真实交易记录都指向「${mainMirror}」，「${mainMirror}」增强。`,
      matchedSources,
      conflictSources,
      missingSources,
      nextCalibration: `主修保持在「${mainMirror}」，下一次用真实复盘检验训练是否回流到行为。`
    };
  }

  if (state.key === "partial") {
    return {
      evidenceLevel: "medium",
      evidenceLevelText: "两路印证",
      proofLine: `${formula} → ${mainMirror}增强，待${missingText || "第三路"}校准`,
      unifiedConclusion: `${mainMirror}增强，仍需校准`,
      conclusion: `${matchedSources.map((row) => row.name).join("、")}共同指向「${mainMirror}」，「${mainMirror}」增强；${missingText || "剩余一路"}还需要补齐。`,
      matchedSources,
      conflictSources,
      missingSources,
      nextCalibration: missingText ? `下一步补齐${missingText}，验证主镜是否继续同向。` : "下一步补一条真实复盘，继续校准主镜。"
    };
  }

  if (state.key === "conflict") {
    return {
      evidenceLevel: "calibration",
      evidenceLevelText: "需要校准",
      proofLine: `${formula} → 三路不一致`,
      unifiedConclusion: "主镜暂不强化",
      conclusion: `${rows.map((row) => `${row.name}是「${row.mirror || "待照见"}」`).join("，")}。认知、压力盲练与真实交易记录暂不一致，先回看压力下的第一念。`,
      matchedSources,
      conflictSources,
      missingSources,
      nextCalibration: "先做一次同主题K线盲练，再上传一条真实交易记录校准。"
    };
  }

  return {
    evidenceLevel: "insufficient",
    evidenceLevelText: "待补全",
    proofLine: `${formula} → ${mainMirror}待校准`,
    unifiedConclusion: `${mainMirror}待校准`,
    conclusion: `当前主线暂指向「${mainMirror}」，还需要补齐${missingText || "K线盲练或真实交易记录"}。`,
    matchedSources,
    conflictSources,
    missingSources,
    nextCalibration: missingText ? `下一步补齐${missingText}。` : "下一步补一条真实复盘或K线盲练。"
  };
}

function toTripleSourceSummary(row) {
  return {
    key: row.key,
    name: row.name,
    mirror: row.mirror,
    statusText: row.statusText
  };
}

function resolveLivingMirrorStage(record, triple) {
  if (!record.mirror_report) return "待入照心";
  if (!(record.trade_reviews || []).length) return "待真实复盘";
  if (triple.state === "aligned" || triple.state === "partial") return "主线显影";
  if (triple.state === "conflict") return "需要校准";
  return "持续入镜";
}

function buildProfileTrainingFocus(mainMirror) {
  const focusMap = {
    "追涨之镜": "边界前停十秒，先写第一念。",
    "扛单之镜": "边界触碰时，只回看原先写下的规则。",
    "幻想之镜": "先写反向事实，再进入复盘。",
    "执念之镜": "动作变大前，先记录那一口不甘。",
    "从众之镜": "外部声音变热时，先回到自己的计划。",
    "犹疑之镜": "允许一次小步验证，不追求完美确认。",
    "拖延之镜": "只做三分钟复盘，先把事实落下。",
    "焦虑之镜": "固定观察窗口外，只记录念头。",
    "良知之镜": "保持每日一省，让稳定继续有根。"
  };
  return focusMap[mainMirror] || "先留下真实记录，再让系统校准下一练。";
}

function buildTrainingPrescription(record = {}, previous = {}) {
  const now = new Date().toISOString();
  const profile = record.living_mirror_profile || buildLivingMirrorProfile(record);
  const triple = profile.tripleReflection || {};
  const rawMirror = profile.currentMainMirror || triple.mainMirror || "";
  const mirror = rawMirror && rawMirror !== "待照见" ? normalizeMirrorName(rawMirror) : "待照见";
  const day = resolveTrainingPrescriptionDay(record);
  const action = cleanText(triple.nextCalibration || profile.trainingFocus || buildProfileTrainingFocus(mirror), 180);
  const marketContext = profile.latestMarketContext || (record.trade_reviews || []).slice(-1)[0]?.marketContext || null;
  const status = previous.status === "dispatched" || previous.status === "received" ? previous.status : "ready";
  const createdAt = previous.createdAt || previous.created_at || now;

  return {
    schemaVersion: "training_prescription_v1",
    id: previous.id || `tp-${record.id || "user"}-${day}-${createdAt.slice(0, 10)}`,
    userId: record.id || "",
    source: previous.source || "server",
    status,
    day,
    mirror,
    title: buildTrainingPrescriptionTitle(mirror, triple),
    reason: cleanText(triple.proofLine || triple.conclusion || "根据活镜画像生成今日训练。", 220),
    action,
    reflectionPrompt: buildTrainingPrescriptionPrompt(mirror),
    klinePractice: buildTrainingPrescriptionKlinePractice({ mirror, marketContext }),
    steps: buildTrainingPrescriptionSteps({ mirror, action }),
    sourceProfile: {
      currentMainMirror: profile.currentMainMirror || "",
      evidenceLevelText: triple.evidenceLevelText || "",
      proofLine: triple.proofLine || ""
    },
    createdAt,
    dispatchedAt: previous.dispatchedAt || previous.dispatched_at || "",
    receivedAt: previous.receivedAt || previous.received_at || "",
    complianceNotice: "本处方仅用于交易心理训练与复盘管理，不构成投资建议。"
  };
}

function resolveTrainingPrescriptionDay(record = {}) {
  const trainingDays = (record.training_records || [])
    .map((item) => Number(item.day || 0))
    .filter((day) => day > 0);
  const latestDay = trainingDays.length ? Math.max(...trainingDays) : 0;
  const reviewCount = (record.trade_reviews || []).length;
  const next = Math.max(latestDay || 1, Math.min(7, reviewCount || 1));
  return Math.max(1, Math.min(7, next));
}

function buildTrainingPrescriptionTitle(mirror, triple = {}) {
  const stage = triple.evidenceLevelText || "活镜校准";
  if (!mirror || mirror === "待照见") return `${stage} · 今日先留下一条真实复盘`;
  return `${stage} · 主修${mirror}`;
}

function buildTrainingPrescriptionPrompt(mirror) {
  const promptMap = {
    "追涨之镜": "今天哪一个瞬间最怕错过？停下后看见了什么？",
    "扛单之镜": "今天边界被触碰时，心里最不愿承认的是什么？",
    "幻想之镜": "今天有没有把希望当成事实？请写下一条反向事实。",
    "执念之镜": "今天哪一口不甘最想放大动作？先把它写下来。",
    "从众之镜": "今天哪一句外部声音最牵动你？回到自己的计划了吗？",
    "犹疑之镜": "今天有没有为了完美确认而迟迟不动？最小一步是什么？",
    "拖延之镜": "今天哪一次复盘被拖走了？先写三分钟事实。",
    "焦虑之镜": "今天哪个结果最让你担心？身体反应是什么？",
    "良知之镜": "今天哪一次守住了自己？把这个动作留下来。"
  };
  return promptMap[mirror] || "今天最值得记录的一念是什么？";
}

function buildTrainingPrescriptionKlinePractice({ mirror, marketContext } = {}) {
  const marketKey = marketContext?.marketKey || "cn_equity";
  const timeframeKey = marketContext?.timeframeKey || "1d";
  const symbolMasked = marketContext?.symbolMasked || "";
  return {
    marketKey,
    timeframeKey,
    symbolMasked,
    actionText: "进入历史K线观心",
    reason: mirror && mirror !== "待照见"
      ? `用同类历史片段观察「${mirror}」下的第一反应。`
      : "先用历史片段建立压力反应基线。"
  };
}

function buildTrainingPrescriptionSteps({ mirror, action } = {}) {
  return [
    {
      key: "review",
      label: "真实复盘",
      action: "记录一条真实交易行为，写下当时第一念。"
    },
    {
      key: "kline",
      label: "K线观心",
      action: mirror && mirror !== "待照见" ? `完成一次「${mirror}」同类盲练。` : "完成一次历史K线盲练。"
    },
    {
      key: "practice",
      label: "今日修行",
      action: action || "把今天照见的一念写入心证。"
    }
  ];
}

function buildMirrorScores(record, { completedCount, klineCount, tradeReviewCount }) {
  const scores = createEmptyMirrorScores();
  const report = record.mirror_report;
  const mainMirror = normalizeMirrorName(report?.mainMirror || "追涨之镜");
  const subMirror = normalizeMirrorName(report?.subMirror || "良知之镜");

  if (report?.riskRadar?.length) {
    report.riskRadar.forEach((item) => {
      const mirror = normalizeMirrorName(item.mirror || inferMirrorName([item.label, item.note], mainMirror));
      scores[mirrorKeyByName[mirror]] = Math.max(scores[mirrorKeyByName[mirror]], clampPercent(item.value));
    });
  }

  scores[mirrorKeyByName[mainMirror]] = Math.max(scores[mirrorKeyByName[mainMirror]], 64);
  scores[mirrorKeyByName[subMirror]] = Math.max(scores[mirrorKeyByName[subMirror]], 44);
  scores.conscience = Math.max(scores.conscience, 20);

  (record.trade_reviews || []).forEach((review) => {
    const mirror = normalizeMirrorName(review.detectedMirror || review.detected_mirror || mainMirror);
    const key = mirrorKeyByName[mirror];
    scores[key] = clampPercent(scores[key] + 4);
  });

  const trainingReduction = Math.min(18, completedCount * 2 + klineCount);
  Object.keys(scores).forEach((key) => {
    if (key !== "conscience") scores[key] = clampPercent(scores[key] - trainingReduction);
  });
  scores.conscience = clampPercent(scores.conscience + completedCount * 8 + klineCount * 3 + tradeReviewCount * 4);

  return scores;
}

function createEmptyMirrorScores() {
  return {
    chasing: 0,
    holding_loss: 0,
    fantasy: 0,
    gambling: 0,
    following: 0,
    hesitation: 0,
    procrastination: 0,
    anxiety: 0,
    conscience: 0
  };
}

function buildThiefCounts(record) {
  const counts = {};
  [...(record.mirror_report?.thieves || []), ...(record.trade_reviews || []).flatMap((review) => review.detectedThieves || [])]
    .map((item) => cleanText(item, 12))
    .filter(Boolean)
    .forEach((thief) => {
      counts[thief] = (counts[thief] || 0) + 1;
    });
  return counts;
}

function buildArchiveIndex(record) {
  const items = [];
  const mirrorReport = record.mirror_report || (record.assessment?.report ? buildMirrorReportFromAssessment(record.assessment.report, record) : null);

  if (mirrorReport) {
    items.push(createArchiveItem({
      type: "mirror_report",
      sourceId: mirrorReport.id || record.assessment?.id || record.id,
      title: "心镜报告",
      summary: mirrorReport.conclusion || mirrorReport.summary || mirrorReport.mainMirror || "一次心镜照见报告。",
      createdAt: mirrorReport.createdAt || record.assessment?.saved_at || record.created_at,
      updatedAt: mirrorReport.updatedAt || record.updated_at,
      metadata: {
        mainMirror: mirrorReport.mainMirror,
        subMirror: mirrorReport.subMirror,
        riskRadar: mirrorReport.riskRadar
      }
    }));
  }

  (record.training_records || []).forEach((trainingRecord) => {
    const trainingId = cleanText(trainingRecord.id || crypto.randomUUID(), 120);
    const createdAt = cleanText(trainingRecord.recorded_at || trainingRecord.recordedAt || record.updated_at || record.created_at, 40);
    items.push(createArchiveItem({
      type: "growth_record",
      sourceId: trainingId,
      title: cleanText(trainingRecord.title || `今日修行 · Day ${trainingRecord.day || ""}`, 100),
      summary: cleanText(trainingRecord.cultivation_text || trainingRecord.cultivationText || trainingRecord.note || trainingRecord.check_in || "已完成一次今日修行记录。", 180),
      sceneTags: normalizeAliasList([trainingRecord.check_in, trainingRecord.status, trainingRecord.date_key].filter(Boolean)),
      createdAt,
      updatedAt: readAliasedField(trainingRecord, "updatedAt", "updated_at", [createdAt]),
      metadata: {
        day: trainingRecord.day,
        dateKey: trainingRecord.date_key,
        status: trainingRecord.status,
        checkIn: trainingRecord.check_in,
        sourceType: "training_record"
      }
    }));
  });

  (record.trade_reviews || []).forEach((review) => {
    const reviewId = cleanText(review.id || review.reviewId || review.review_id || crypto.randomUUID(), 120);
    const errorType = readAliasedField(review, "mainErrorType", "main_error_type", [review.errorType, review.error_type]);
    const firstThought = readAliasedField(review, "firstThought", "first_thought", [review.strongestThought, review.strongest_thought]);
    const sceneTags = normalizeAliasList(readAliasedField(review, "sceneTags", "scene_tags", [review.behaviorTags, review.behavior_tags, review.triggerScene, review.trigger_scene]));
    const createdAt = cleanText(readAliasedField(review, "createdAt", "created_at", [review.tradeDate, review.trade_date, review.saved_at, record.updated_at]), 40);
    items.push(createArchiveItem({
      type: "trade_review",
      sourceId: reviewId,
      title: cleanText(review.title || `真实复盘 · ${errorType || "一次照见"}`, 100),
      summary: cleanText(review.reviewText || review.review_text || review.nextRule || review.next_rule || firstThought || "已记录一次真实复盘。", 180),
      errorType,
      firstThought,
      sceneTags,
      executionResult: readAliasedField(review, "executionResult", "execution_result"),
      segmentId: readAliasedField(review, "segmentId", "segment_id"),
      trainingPackId: readAliasedField(review, "trainingPackId", "training_pack_id"),
      createdAt,
      updatedAt: readAliasedField(review, "updatedAt", "updated_at", [createdAt, record.updated_at]),
      metadata: {
        triggerScene: review.triggerScene || review.trigger_scene,
        detectedMirror: review.detectedMirror || review.detected_mirror,
        nextAction: review.nextRule || review.next_rule,
        trainingPrescription: review.trainingPrescription || review.training_prescription
      }
    }));

    const mistakeCard = review.mistakeCard || review.mistake_card;
    if (mistakeCard && typeof mistakeCard === "object" && !Array.isArray(mistakeCard)) {
      items.push(createArchiveItem({
        type: "mistake_card",
        sourceId: `${reviewId}-mistake-card`,
        title: cleanText(mistakeCard.title || `错题卡 · ${errorType || "复盘"}`, 100),
        summary: cleanText(mistakeCard.summary || mistakeCard.note || "从一次复盘中沉淀的错题卡。", 180),
        errorType,
        firstThought,
        sceneTags,
        createdAt,
        updatedAt: readAliasedField(review, "updatedAt", "updated_at", [createdAt, record.updated_at]),
        metadata: mistakeCard
      }));
    }
  });

  (record.kline_records || []).forEach((klineRecord) => {
    const klineId = cleanText(klineRecord.id || crypto.randomUUID(), 120);
    const samplingResult = normalizeKLineSamplingResult(readAliasedField(klineRecord, "samplingResult", "sampling_result"));
    const errorType = readAliasedField(klineRecord, "errorType", "error_type", [samplingResult?.errorType, samplingResult?.error_type]);
    const sceneTags = normalizeAliasList(readAliasedField(klineRecord, "sceneTags", "scene_tags", [samplingResult?.sceneTags, samplingResult?.scene_tags, klineRecord.scene]));
    const createdAt = cleanText(klineRecord.recorded_at || klineRecord.recordedAt || record.updated_at, 40);
    items.push(createArchiveItem({
      type: "kline_record",
      sourceId: klineId,
      title: cleanText(`K线训练 · ${klineRecord.scene || errorType || "一次练习"}`, 100),
      summary: cleanText(klineRecord.process_insight || klineRecord.processInsight || klineRecord.reaction || "已沉淀一次 K线训练记录。", 180),
      errorType,
      sceneTags,
      executionResult: readAliasedField(klineRecord, "executionResult", "execution_result"),
      segmentId: readAliasedField(klineRecord, "segmentId", "segment_id", [samplingResult?.segmentId, samplingResult?.segment_id]),
      trainingPackId: readAliasedField(klineRecord, "trainingPackId", "training_pack_id", [samplingResult?.trainingPackId, samplingResult?.training_pack_id]),
      createdAt,
      updatedAt: readAliasedField(klineRecord, "updatedAt", "updated_at", [createdAt]),
      metadata: {
        day: klineRecord.day,
        scene: klineRecord.scene,
        reaction: klineRecord.reaction,
        sourceType: klineRecord.sourceType || klineRecord.source_type,
        samplingResult
      }
    }));
  });

  (record.training_bookmarks || []).forEach((bookmark) => {
    const bookmarkId = cleanText(bookmark.id || crypto.randomUUID(), 120);
    const samplingResult = normalizeKLineSamplingResult(readAliasedField(bookmark, "samplingResult", "sampling_result"));
    const errorType = readAliasedField(bookmark, "errorType", "error_type", [samplingResult?.errorType, samplingResult?.error_type]);
    const sceneTags = normalizeAliasList(readAliasedField(bookmark, "sceneTags", "scene_tags", [samplingResult?.sceneTags, samplingResult?.scene_tags]));
    const createdAt = cleanText(readAliasedField(bookmark, "createdAt", "created_at", [record.updated_at]), 40);
    items.push(createArchiveItem({
      type: "training_bookmark",
      sourceId: bookmarkId,
      title: cleanText(bookmark.title || "训练收藏", 100),
      summary: cleanText(bookmark.note || bookmark.bookmarkType || bookmark.bookmark_type || "一次训练收藏。", 180),
      errorType,
      sceneTags,
      executionResult: readAliasedField(bookmark, "executionResult", "execution_result"),
      segmentId: readAliasedField(bookmark, "segmentId", "segment_id", [samplingResult?.segmentId, samplingResult?.segment_id]),
      trainingPackId: readAliasedField(bookmark, "trainingPackId", "training_pack_id", [samplingResult?.trainingPackId, samplingResult?.training_pack_id]),
      createdAt,
      updatedAt: readAliasedField(bookmark, "updatedAt", "updated_at", [createdAt]),
      metadata: {
        bookmarkType: bookmark.bookmarkType || bookmark.bookmark_type,
        sourceType: bookmark.sourceType || bookmark.source_type,
        sessionId: bookmark.sessionId || bookmark.session_id,
        actionId: bookmark.actionId || bookmark.action_id,
        barIndex: bookmark.barIndex || bookmark.bar_index,
        symbol: bookmark.symbol,
        period: bookmark.period,
        startDate: bookmark.startDate || bookmark.start_date,
        endDate: bookmark.endDate || bookmark.end_date,
        samplingResult
      }
    }));
  });

  (record.intervention_events || []).forEach((event) => {
    const eventId = cleanText(event.id || crypto.randomUUID(), 120);
    const errorType = readAliasedField(event, "errorType", "error_type");
    const sceneTags = normalizeAliasList(readAliasedField(event, "sceneTags", "scene_tags"));
    const createdAt = cleanText(readAliasedField(event, "createdAt", "created_at", [record.updated_at]), 40);
    items.push(createArchiveItem({
      type: "intervention_event",
      sourceId: eventId,
      title: cleanText(`知行提醒 · ${event.triggerType || event.trigger_type || "一次提醒"}`, 100),
      summary: cleanText(event.message || event.expectedAction || event.expected_action || "一次知行提醒事件。", 180),
      errorType,
      firstThought: readAliasedField(event, "firstThought", "first_thought"),
      sceneTags,
      executionResult: readAliasedField(event, "executionResult", "execution_result"),
      trainingPackId: readAliasedField(event, "trainingPackId", "training_pack_id"),
      createdAt,
      updatedAt: readAliasedField(event, "updatedAt", "updated_at", [createdAt]),
      metadata: {
        triggerType: event.triggerType || event.trigger_type,
        sourceType: event.sourceType || event.source_type,
        sessionId: event.sessionId || event.session_id,
        reviewId: event.reviewId || event.review_id,
        planId: event.planId || event.plan_id,
        userResponse: event.userResponse || event.user_response,
        suggestedAction: event.suggestedAction || event.suggested_action,
        expectedAction: event.expectedAction || event.expected_action
      }
    }));
  });

  (record.execution_plans || []).forEach((plan) => {
    const planId = cleanText(plan.id || crypto.randomUUID(), 120);
    const errorType = readAliasedField(plan, "errorType", "error_type");
    const sceneTags = normalizeAliasList(readAliasedField(plan, "sceneTags", "scene_tags"));
    const createdAt = cleanText(readAliasedField(plan, "createdAt", "created_at", [record.updated_at]), 40);
    items.push(createArchiveItem({
      type: "execution_plan",
      sourceId: planId,
      title: cleanText(plan.title || "执行计划", 100),
      summary: cleanText(plan.expectedAction || plan.expected_action || plan.nextAction || plan.next_action || "一条执行计划。", 180),
      errorType,
      firstThought: normalizeAliasList(readAliasedField(plan, "firstThoughts", "first_thoughts"))?.join(" / "),
      sceneTags,
      trainingPackId: readAliasedField(plan, "trainingPackId", "training_pack_id"),
      createdAt,
      updatedAt: readAliasedField(plan, "updatedAt", "updated_at", [createdAt]),
      metadata: {
        enabled: plan.enabled !== false,
        forbiddenActions: plan.forbiddenActions || plan.forbidden_actions,
        expectedAction: plan.expectedAction || plan.expected_action,
        nextAction: plan.nextAction || plan.next_action,
        trainingPrescription: plan.trainingPrescription || plan.training_prescription
      }
    }));
  });

  const livingMirrorProfile = record.living_mirror_profile;
  if (livingMirrorProfile) {
    items.push(createArchiveItem({
      type: "growth_projection",
      sourceId: `${record.id}-living-mirror-profile`,
      title: "活镜成长谱摘要",
      summary: livingMirrorProfile.nextAction || livingMirrorProfile.status || "当前活镜成长摘要。",
      createdAt: livingMirrorProfile.updatedAt || livingMirrorProfile.updated_at || record.updated_at || record.created_at,
      updatedAt: livingMirrorProfile.updatedAt || livingMirrorProfile.updated_at || record.updated_at,
      metadata: {
        status: livingMirrorProfile.status,
        progress: livingMirrorProfile.progress,
        nextAction: livingMirrorProfile.nextAction,
        dominantReaction: livingMirrorProfile.dominantReaction,
        latestMirrorType: livingMirrorProfile.latestMirrorType
      }
    }));
  }

  const sortedItems = items
    .filter(Boolean)
    .sort((left, right) => Date.parse(right.updatedAt || right.createdAt || "") - Date.parse(left.updatedAt || left.createdAt || ""));
  const byType = sortedItems.reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});
  const updatedAt = sortedItems[0]?.updatedAt || record.updated_at || record.created_at || new Date().toISOString();

  return {
    schemaVersion: "mirror_archive_index_v1",
    userId: record.id,
    user_id: record.id,
    totalCount: sortedItems.length,
    total_count: sortedItems.length,
    byType,
    by_type: byType,
    latestItems: sortedItems,
    latest_items: sortedItems,
    updatedAt,
    updated_at: updatedAt
  };
}

function createArchiveItem({
  type,
  sourceId,
  title,
  summary,
  errorType,
  firstThought,
  sceneTags,
  executionResult,
  segmentId,
  trainingPackId,
  createdAt,
  updatedAt,
  metadata = {}
}) {
  const normalizedType = cleanText(type || "note", 60) || "note";
  const normalizedSourceId = cleanText(sourceId || crypto.randomUUID(), 120);
  const normalizedCreatedAt = cleanText(createdAt || updatedAt || new Date().toISOString(), 40);
  const normalizedUpdatedAt = cleanText(updatedAt || normalizedCreatedAt, 40);
  const item = {
    id: buildArchiveItemId(normalizedType, normalizedSourceId),
    type: normalizedType,
    title: cleanText(title || "心镜档案", 100),
    summary: cleanText(summary || "一次可回溯的心镜记录。", 180),
    sourceId: normalizedSourceId,
    source_id: normalizedSourceId,
    sourceType: normalizedType,
    source_type: normalizedType,
    createdAt: normalizedCreatedAt,
    created_at: normalizedCreatedAt,
    updatedAt: normalizedUpdatedAt,
    updated_at: normalizedUpdatedAt,
    metadata: stripArchiveHeavyPayload(metadata)
  };

  addAliasedField(item, "errorType", "error_type", errorType, (value) => cleanText(value, 80));
  addAliasedField(item, "firstThought", "first_thought", firstThought, (value) => cleanText(value, 180));
  addAliasedField(item, "sceneTags", "scene_tags", sceneTags, normalizeAliasList);
  addAliasedField(item, "executionResult", "execution_result", executionResult, (value) => cleanText(value, 120));
  addAliasedField(item, "segmentId", "segment_id", segmentId, (value) => cleanText(value, 100));
  addAliasedField(item, "trainingPackId", "training_pack_id", trainingPackId, (value) => cleanText(value, 100));

  return item;
}

function buildArchiveItemId(type, sourceId) {
  return `archive_${type}_${sourceId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function stripArchiveHeavyPayload(value) {
  if (!hasFieldValue(value)) return {};
  if (Array.isArray(value)) {
    return value.map(stripArchiveHeavyPayload).filter(hasFieldValue).slice(0, 20);
  }
  if (typeof value !== "object") return value;
  return Object.entries(value).reduce((result, [key, item]) => {
    if (["bars", "bar", "candles", "ohlc", "rawBars", "raw_bars"].includes(key)) return result;
    const normalizedKey = cleanText(key, 60);
    const normalizedValue = stripArchiveHeavyPayload(item);
    if (normalizedKey && hasFieldValue(normalizedValue)) result[normalizedKey] = normalizedValue;
    return result;
  }, {});
}

function buildMirrorArchive(record, archiveIndex = buildArchiveIndex(record)) {
  const mirrorReport = record.mirror_report || (record.assessment?.report ? buildMirrorReportFromAssessment(record.assessment.report, record) : null);
  return {
    user: {
      id: record.id,
      phone: record.phone,
      createdAt: record.created_at,
      inviteCode: record.invite_source,
      channel: record.source_channel
    },
    archiveIndex,
    archive_index: archiveIndex,
    items: archiveIndex.latestItems,
    reports: mirrorReport ? [mirrorReport] : [],
    trainingRecords: (record.training_records || []).map((item) => ({
      id: item.id,
      userId: record.id,
      date: item.date_key || String(item.recorded_at || "").slice(0, 10),
      mirror: inferMirrorName([item.title, item.note, item.cultivation_text], mirrorReport?.mainMirror || "追涨之镜"),
      action: item.title,
      completed: item.status === "completed",
      note: item.cultivation_text || item.note || "",
      createdAt: item.recorded_at,
      completedAt: item.status === "completed" ? item.recorded_at : null
    })),
    tradeReviews: record.trade_reviews || [],
    livingMirrorStats: record.living_mirror_stats || refreshLivingMirrorState(record, { updateTrend: false }),
    retestReports: (record.retests || []).map((item) => buildMirrorReportFromAssessment(item.report, record)).filter(Boolean),
    inviteCode: record.invite_source,
    assistantHandoff: record.assistant_summary
      ? {
          id: record.assistant_summary.id || `handoff-${record.id}`,
          userId: record.id,
          phone: record.phone,
          mainMirror: mirrorReport?.mainMirror || inferMirrorName([record.assistant_summary.primaryType], "追涨之镜"),
          subMirror: mirrorReport?.subMirror || inferMirrorName([record.assistant_summary.secondaryType], "良知之镜"),
          riskTags: [record.assistant_summary.riskLabel].filter(Boolean),
          recentReviewSummary: (record.trade_reviews || []).at(-1)?.reviewText || "暂无真实交易复盘摘要。",
          suggestedTrainingAction: record.assistant_summary.focus || "继续完成七日训练和复盘。",
          campSuggestion: record.assistant_summary.trainingCamp || "",
          suggestedScript: record.assistant_summary.script || "",
          complianceReminder: "仅交易心理训练，不提供买卖建议",
          feishuSynced: record.feishu_sync?.status === "success",
          status: record.assistant?.status || "pending",
          createdAt: record.assistant_summary.created_at || new Date().toISOString()
        }
      : null
  };
}

function buildDashboardSummary(record, options = {}) {
  const window = resolveDashboardWindow(options);
  const generatedAt = new Date().toISOString();
  const archiveIndex = buildArchiveIndex(record);
  const evidence = collectDashboardEvidence(record, window);
  const allEvidence = [...evidence.tradeReviews, ...evidence.klineRecords, ...evidence.bookmarks];
  const execution = buildDashboardExecution(evidence);
  const topErrorTypes = topCountItems(allEvidence.flatMap((item) => item.errorType ? [item.errorType] : []));
  const topFirstThoughts = topCountItems(evidence.tradeReviews.flatMap((item) => item.firstThought ? [item.firstThought] : []));
  const topTriggerScenes = topCountItems(allEvidence.flatMap((item) => item.sceneTags));
  const bySourceType = topCountItems([...evidence.klineRecords, ...evidence.bookmarks].flatMap((item) => item.sourceType ? [item.sourceType] : []));
  const byTrainingPack = topCountItems([...evidence.klineRecords, ...evidence.bookmarks].flatMap((item) => item.trainingPackId ? [item.trainingPackId] : []));
  const bySegment = topCountItems([...evidence.klineRecords, ...evidence.bookmarks].flatMap((item) => item.segmentId ? [item.segmentId] : []));
  const byBookmarkType = topCountItems(evidence.bookmarks.flatMap((item) => item.bookmarkType ? [item.bookmarkType] : []));
  const interventions = evidence.interventions || [];
  const executionPlans = evidence.executionPlans || [];
  const dataGaps = buildDashboardDataGaps({ evidence, execution, topErrorTypes, interventions, executionPlans });
  const overview = buildDashboardOverview({ evidence, interventions, executionPlans });
  const firstThoughts = {
    topFirstThoughts,
    top_first_thoughts: topFirstThoughts
  };
  const triggerScenes = {
    topTriggerScenes,
    top_trigger_scenes: topTriggerScenes
  };
  const training = {
    bySourceType,
    by_source_type: bySourceType,
    byTrainingPack,
    by_training_pack: byTrainingPack,
    bySegment,
    by_segment: bySegment,
    fallbackCount: evidence.klineRecords.concat(evidence.bookmarks).filter((item) => item.fallbackUsed === true).length,
    fallback_count: evidence.klineRecords.concat(evidence.bookmarks).filter((item) => item.fallbackUsed === true).length,
    samplingCount: evidence.klineRecords.filter((item) => Boolean(item.samplingResult)).length,
    sampling_count: evidence.klineRecords.filter((item) => Boolean(item.samplingResult)).length,
    customSessionCount: [...evidence.klineRecords, ...evidence.bookmarks].filter((item) => item.sourceType === "custom_session").length,
    custom_session_count: [...evidence.klineRecords, ...evidence.bookmarks].filter((item) => item.sourceType === "custom_session").length
  };
  const bookmarkLatestItems = archiveIndex.latestItems
    .filter((item) => item.type === "training_bookmark")
    .slice(0, 8);
  const bookmarks = {
    totalCount: evidence.bookmarks.length,
    total_count: evidence.bookmarks.length,
    byType: byBookmarkType,
    by_type: byBookmarkType,
    latestItems: bookmarkLatestItems,
    latest_items: bookmarkLatestItems
  };
  const interventionSummary = buildDashboardInterventionSummary(interventions);
  const planSummary = buildDashboardExecutionPlanSummary(executionPlans, topErrorTypes);
  const archive = {
    totalCount: archiveIndex.totalCount,
    total_count: archiveIndex.total_count,
    byType: archiveIndex.byType,
    by_type: archiveIndex.by_type
  };
  const trends = buildDashboardTrends({ evidence, window });
  const mistakes = {
    topErrorTypes,
    top_error_types: topErrorTypes,
    totalMistakeCount: topErrorTypes.reduce((sum, item) => sum + item.count, 0),
    total_mistake_count: topErrorTypes.reduce((sum, item) => sum + item.count, 0)
  };

  return {
    schemaVersion: "dashboard_summary_v1",
    schema_version: "dashboard_summary_v1",
    userId: record.id,
    user_id: record.id,
    range: window.range,
    dateFrom: window.dateFromKey,
    date_from: window.dateFromKey,
    dateTo: window.dateToKey,
    date_to: window.dateToKey,
    generatedAt,
    generated_at: generatedAt,
    overview,
    execution,
    mistakes,
    firstThoughts,
    first_thoughts: firstThoughts,
    triggerScenes,
    trigger_scenes: triggerScenes,
    training,
    bookmarks,
    interventions: interventionSummary,
    executionPlans: planSummary,
    execution_plans: planSummary,
    archive,
    trends,
    dataGaps,
    data_gaps: dataGaps
  };
}

function buildWeeklyMirrorSummary(record, options = {}) {
  const weekWindow = resolveWeeklyWindow(options);
  const dashboard = buildDashboardSummary(record, {
    range: "7d",
    dateFrom: weekWindow.weekStart,
    dateTo: weekWindow.weekEnd
  });
  const generatedAt = new Date().toISOString();
  const progressHighlights = buildWeeklyProgressHighlights(dashboard);
  const nextWeekTrainingPlan = buildNextWeekTrainingPlan(dashboard);

  return {
    schemaVersion: "weekly_mirror_summary_v1",
    schema_version: "weekly_mirror_summary_v1",
    userId: record.id,
    user_id: record.id,
    weekStart: weekWindow.weekStart,
    week_start: weekWindow.weekStart,
    weekEnd: weekWindow.weekEnd,
    week_end: weekWindow.weekEnd,
    generatedAt,
    generated_at: generatedAt,
    topErrorTypes: dashboard.mistakes.topErrorTypes,
    top_error_types: dashboard.mistakes.top_error_types,
    topFirstThoughts: dashboard.firstThoughts.topFirstThoughts,
    top_first_thoughts: dashboard.firstThoughts.top_first_thoughts,
    topTriggerScenes: dashboard.triggerScenes.topTriggerScenes,
    top_trigger_scenes: dashboard.triggerScenes.top_trigger_scenes,
    executionConsistency: dashboard.execution,
    execution_consistency: dashboard.execution,
    repeatCount: dashboard.mistakes.totalMistakeCount,
    repeat_count: dashboard.mistakes.total_mistake_count,
    trainingCount: dashboard.overview.klineTrainingCount,
    training_count: dashboard.overview.kline_training_count,
    tradeReviewCount: dashboard.overview.tradeReviewCount,
    trade_review_count: dashboard.overview.trade_review_count,
    bookmarkCount: dashboard.overview.trainingBookmarkCount,
    bookmark_count: dashboard.overview.training_bookmark_count,
    interventionCount: dashboard.interventions.totalCount,
    intervention_count: dashboard.interventions.total_count,
    topInterventionTriggers: dashboard.interventions.byTriggerType,
    top_intervention_triggers: dashboard.interventions.by_trigger_type,
    topUserResponses: dashboard.interventions.byUserResponse,
    top_user_responses: dashboard.interventions.by_user_response,
    followedPlanCount: dashboard.interventions.responseSummary.followedPlanCount,
    followed_plan_count: dashboard.interventions.response_summary.followed_plan_count,
    deviatedAgainCount: dashboard.interventions.responseSummary.deviatedAgainCount,
    deviated_again_count: dashboard.interventions.response_summary.deviated_again_count,
    interventionDataGaps: dashboard.interventions.dataGaps,
    intervention_data_gaps: dashboard.interventions.data_gaps,
    progressHighlights,
    progress_highlights: progressHighlights,
    nextWeekTrainingPlan,
    next_week_training_plan: nextWeekTrainingPlan,
    dataGaps: dashboard.dataGaps,
    data_gaps: dashboard.data_gaps
  };
}

function collectDashboardEvidence(record, window) {
  const tradeReviews = (record.trade_reviews || [])
    .map((item) => normalizeDashboardTradeReview(item, record))
    .filter((item) => isWithinDashboardWindow(item, window));
  const klineRecords = (record.kline_records || [])
    .map((item) => normalizeDashboardKLineRecord(item, record))
    .filter((item) => isWithinDashboardWindow(item, window));
  const bookmarks = (record.training_bookmarks || [])
    .filter((item) => item.enabled !== false)
    .map((item) => normalizeDashboardBookmark(item, record))
    .filter((item) => isWithinDashboardWindow(item, window));
  const interventions = normalizeDashboardRawList(record.intervention_events || record.interventionEvents || [], record)
    .filter((item) => item.raw.enabled !== false)
    .map((item) => ({
      ...item,
      id: cleanText(item.raw.id || crypto.randomUUID(), 120),
      sourceKind: "intervention_event",
      triggerType: cleanText(readAliasedField(item.raw, "triggerType", "trigger_type"), 80),
      userResponse: cleanText(readAliasedField(item.raw, "userResponse", "user_response"), 80),
      sourceType: cleanText(readAliasedField(item.raw, "sourceType", "source_type", ["intervention_event"]), 80),
      errorType: cleanText(readAliasedField(item.raw, "errorType", "error_type"), 80),
      sceneTags: normalizeAliasList(readAliasedField(item.raw, "sceneTags", "scene_tags")) || [],
      executionResult: cleanText(readAliasedField(item.raw, "executionResult", "execution_result"), 80),
      expectedAction: cleanText(readAliasedField(item.raw, "expectedAction", "expected_action"), 180),
      updatedAt: cleanText(readAliasedField(item.raw, "updatedAt", "updated_at"), 40),
      createdAt: cleanText(readAliasedField(item.raw, "createdAt", "created_at"), 40)
    }))
    .filter((item) => isWithinDashboardWindow(item, window));
  const executionPlans = normalizeDashboardRawList(record.execution_plans || record.executionPlans || [], record)
    .map((item) => ({
      ...item,
      id: cleanText(item.raw.id || crypto.randomUUID(), 120),
      errorType: cleanText(readAliasedField(item.raw, "errorType", "error_type"), 80),
      title: cleanText(item.raw.title || "执行计划", 100),
      enabled: item.raw.enabled !== false,
      updatedAt: cleanText(readAliasedField(item.raw, "updatedAt", "updated_at"), 40),
      createdAt: cleanText(readAliasedField(item.raw, "createdAt", "created_at"), 40)
    }))
    .filter((item) => isWithinDashboardWindow(item, window));

  return {
    tradeReviews,
    klineRecords,
    bookmarks,
    interventions,
    executionPlans
  };
}

function normalizeDashboardTradeReview(review = {}, record = {}) {
  const errorType = cleanText(readAliasedField(review, "mainErrorType", "main_error_type", [review.errorType, review.error_type]), 80);
  const firstThought = cleanText(readAliasedField(review, "firstThought", "first_thought", [review.strongestThought, review.strongest_thought]), 180);
  const triggerScene = cleanText(readAliasedField(review, "triggerScene", "trigger_scene"), 120);
  const sceneTags = normalizeAliasList(readAliasedField(review, "sceneTags", "scene_tags", [review.behaviorTags, review.behavior_tags, triggerScene])) || [];
  const dateValue = resolveDashboardRecordDate(review, [review.tradeDate, review.trade_date, record.updated_at]);
  return {
    id: cleanText(review.id || review.reviewId || review.review_id || crypto.randomUUID(), 120),
    sourceKind: "trade_review",
    dateValue,
    dateKey: dateValue ? formatDateKey(dateValue) : "",
    errorType,
    firstThought,
    sceneTags,
    executionResult: cleanText(readAliasedField(review, "executionResult", "execution_result", [review.lawResult, review.law_result]), 120),
    trainingPackId: cleanText(readAliasedField(review, "trainingPackId", "training_pack_id"), 100),
    segmentId: cleanText(readAliasedField(review, "segmentId", "segment_id"), 100),
    repeatCount: normalizeAliasNumber(readAliasedField(review, "repeatCount", "repeat_count")) || 0
  };
}

function normalizeDashboardKLineRecord(record = {}, userRecord = {}) {
  const samplingResult = normalizeKLineSamplingResult(readAliasedField(record, "samplingResult", "sampling_result"));
  const sourceType = cleanText(readAliasedField(record, "sourceType", "source_type", [record.source, "kline_training"]), 80);
  const dateValue = resolveDashboardRecordDate(record, [record.recordedAt, record.recorded_at, record.date, userRecord.updated_at]);
  return {
    id: cleanText(record.id || crypto.randomUUID(), 120),
    sourceKind: "kline_record",
    sourceType,
    dateValue,
    dateKey: dateValue ? formatDateKey(dateValue) : "",
    errorType: cleanText(readAliasedField(record, "errorType", "error_type", [samplingResult?.errorType, samplingResult?.error_type]), 80),
    firstThought: cleanText(readAliasedField(record, "firstThought", "first_thought", [record.reaction]), 180),
    sceneTags: normalizeAliasList(readAliasedField(record, "sceneTags", "scene_tags", [samplingResult?.sceneTags, samplingResult?.scene_tags, record.scene])) || [],
    executionResult: cleanText(readAliasedField(record, "executionResult", "execution_result", [record.lawResult, record.law_result]), 120),
    trainingPackId: cleanText(readAliasedField(record, "trainingPackId", "training_pack_id", [samplingResult?.trainingPackId, samplingResult?.training_pack_id]), 100),
    segmentId: cleanText(readAliasedField(record, "segmentId", "segment_id", [samplingResult?.segmentId, samplingResult?.segment_id]), 100),
    repeatCount: normalizeAliasNumber(readAliasedField(record, "repeatCount", "repeat_count")) || 0,
    fallbackUsed: normalizeAliasBoolean(readAliasedField(record, "fallbackUsed", "fallback_used", [samplingResult?.fallbackUsed, samplingResult?.fallback_used])) === true,
    fallbackReason: cleanText(readAliasedField(record, "fallbackReason", "fallback_reason", [samplingResult?.fallbackReason, samplingResult?.fallback_reason]), 160),
    samplingResult
  };
}

function normalizeDashboardBookmark(bookmark = {}, record = {}) {
  const samplingResult = normalizeKLineSamplingResult(readAliasedField(bookmark, "samplingResult", "sampling_result"));
  const sourceType = cleanText(readAliasedField(bookmark, "sourceType", "source_type", ["training_bookmark"]), 80);
  const dateValue = resolveDashboardRecordDate(bookmark, [bookmark.createdAt, bookmark.created_at, record.updated_at]);
  return {
    id: cleanText(bookmark.id || crypto.randomUUID(), 120),
    sourceKind: "training_bookmark",
    sourceType,
    bookmarkType: cleanText(readAliasedField(bookmark, "bookmarkType", "bookmark_type"), 60),
    dateValue,
    dateKey: dateValue ? formatDateKey(dateValue) : "",
    errorType: cleanText(readAliasedField(bookmark, "errorType", "error_type", [samplingResult?.errorType, samplingResult?.error_type]), 80),
    firstThought: cleanText(readAliasedField(bookmark, "firstThought", "first_thought"), 180),
    sceneTags: normalizeAliasList(readAliasedField(bookmark, "sceneTags", "scene_tags", [samplingResult?.sceneTags, samplingResult?.scene_tags])) || [],
    executionResult: cleanText(readAliasedField(bookmark, "executionResult", "execution_result", [bookmark.lawResult, bookmark.law_result]), 120),
    trainingPackId: cleanText(readAliasedField(bookmark, "trainingPackId", "training_pack_id", [samplingResult?.trainingPackId, samplingResult?.training_pack_id]), 100),
    segmentId: cleanText(readAliasedField(bookmark, "segmentId", "segment_id", [samplingResult?.segmentId, samplingResult?.segment_id]), 100),
    repeatCount: normalizeAliasNumber(readAliasedField(bookmark, "repeatCount", "repeat_count")) || 0,
    fallbackUsed: normalizeAliasBoolean(readAliasedField(bookmark, "fallbackUsed", "fallback_used", [samplingResult?.fallbackUsed, samplingResult?.fallback_used])) === true,
    fallbackReason: cleanText(readAliasedField(bookmark, "fallbackReason", "fallback_reason", [samplingResult?.fallbackReason, samplingResult?.fallback_reason]), 160),
    samplingResult
  };
}

function normalizeDashboardRawList(rows = [], record = {}) {
  return (Array.isArray(rows) ? rows : []).map((raw) => {
    const dateValue = resolveDashboardRecordDate(raw, [record.updated_at]);
    return {
      raw,
      dateValue,
      dateKey: dateValue ? formatDateKey(dateValue) : ""
    };
  });
}

function buildDashboardOverview({ evidence, interventions, executionPlans }) {
  const allDated = [
    ...evidence.tradeReviews,
    ...evidence.klineRecords,
    ...evidence.bookmarks,
    ...interventions,
    ...executionPlans
  ].map((item) => item.dateKey).filter(Boolean);
  const activeDays = new Set(allDated).size;
  return {
    tradeReviewCount: evidence.tradeReviews.length,
    trade_review_count: evidence.tradeReviews.length,
    klineTrainingCount: evidence.klineRecords.length,
    kline_training_count: evidence.klineRecords.length,
    trainingBookmarkCount: evidence.bookmarks.length,
    training_bookmark_count: evidence.bookmarks.length,
    interventionEventCount: interventions.length,
    intervention_event_count: interventions.length,
    executionPlanCount: executionPlans.length,
    execution_plan_count: executionPlans.length,
    activeDays,
    active_days: activeDays
  };
}

function buildDashboardInterventionSummary(interventions = []) {
  const byTriggerType = topCountItems(interventions.flatMap((item) => item.triggerType ? [item.triggerType] : []));
  const byUserResponse = topCountItems(interventions.flatMap((item) => item.userResponse ? [item.userResponse] : []));
  const byErrorType = topCountItems(interventions.flatMap((item) => item.errorType ? [item.errorType] : []));
  const bySourceType = topCountItems(interventions.flatMap((item) => item.sourceType ? [item.sourceType] : []));
  const responseSummary = buildDashboardInterventionResponseSummary(interventions);
  const outcome = buildDashboardInterventionOutcome(responseSummary);
  const latestItems = buildDashboardInterventionLatestItems(interventions);
  const dataGaps = buildDashboardInterventionDataGaps({ interventions, responseSummary });

  return {
    totalCount: interventions.length,
    total_count: interventions.length,
    byTriggerType,
    by_trigger_type: byTriggerType,
    byUserResponse,
    by_user_response: byUserResponse,
    byErrorType,
    by_error_type: byErrorType,
    bySourceType,
    by_source_type: bySourceType,
    responseSummary,
    response_summary: responseSummary,
    outcome,
    latestItems,
    latest_items: latestItems,
    dataGaps,
    data_gaps: dataGaps
  };
}

function buildDashboardInterventionResponseSummary(interventions = []) {
  const responseValues = interventions.map((item) => cleanText(item.userResponse, 80));
  const count = (value) => responseValues.filter((item) => item === value).length;
  const continuedCount = count("continue");
  const changeToHoldCount = count("change_to_hold");
  const laterCount = count("later");
  const mutedCount = count("mute_session");
  const followedPlanCount = count("followed_plan");
  const deviatedAgainCount = count("deviated_again");
  const unclearCount = count("unclear") + responseValues.filter((item) => !item).length;
  return {
    continuedCount,
    continued_count: continuedCount,
    changeToHoldCount,
    change_to_hold_count: changeToHoldCount,
    laterCount,
    later_count: laterCount,
    mutedCount,
    muted_count: mutedCount,
    followedPlanCount,
    followed_plan_count: followedPlanCount,
    deviatedAgainCount,
    deviated_again_count: deviatedAgainCount,
    unclearCount,
    unclear_count: unclearCount
  };
}

function buildDashboardInterventionOutcome(responseSummary) {
  const followedPlanCount = responseSummary.followedPlanCount || 0;
  const deviatedAgainCount = responseSummary.deviatedAgainCount || 0;
  const sampleCount = followedPlanCount + deviatedAgainCount;
  const followedPlanRate = sampleCount ? followedPlanCount / sampleCount : null;
  const deviatedAgainRate = sampleCount ? deviatedAgainCount / sampleCount : null;
  const label = sampleCount ? `执行反馈：${Math.round(followedPlanRate * 100)}% 按计划执行` : "样本不足";
  return {
    sampleCount,
    sample_count: sampleCount,
    followedPlanRate,
    followed_plan_rate: followedPlanRate,
    deviatedAgainRate,
    deviated_again_rate: deviatedAgainRate,
    label
  };
}

function buildDashboardInterventionLatestItems(interventions = []) {
  return interventions
    .slice()
    .sort((left, right) => Number(right.dateValue?.getTime?.() || 0) - Number(left.dateValue?.getTime?.() || 0))
    .slice(0, 8)
    .map((item) => {
      const createdAt = item.createdAt || item.raw.createdAt || item.raw.created_at || item.dateKey || "";
      const updatedAt = item.updatedAt || item.raw.updatedAt || item.raw.updated_at || createdAt;
      return {
        id: item.id,
        type: "intervention_event",
        title: interventionTriggerLabel(item.triggerType),
        summary: item.userResponse ? `用户响应：${interventionUserResponseLabel(item.userResponse)}` : "等待用户响应",
        sourceId: item.id,
        source_id: item.id,
        sourceType: item.sourceType || "intervention_event",
        source_type: item.sourceType || "intervention_event",
        errorType: item.errorType,
        error_type: item.errorType,
        sceneTags: item.sceneTags || [],
        scene_tags: item.sceneTags || [],
        executionResult: item.executionResult,
        execution_result: item.executionResult,
        createdAt,
        created_at: createdAt,
        updatedAt,
        updated_at: updatedAt,
        metadata: {
          triggerType: item.triggerType,
          trigger_type: item.triggerType,
          userResponse: item.userResponse,
          user_response: item.userResponse
        }
      };
    });
}

function buildDashboardInterventionDataGaps({ interventions = [], responseSummary }) {
  const gaps = [];
  if (!interventions.length) {
    gaps.push(buildDashboardDataGap("missing_intervention_events", "知行提醒样本不足", "还没有 interventionEvent 数据，暂时无法分析提醒后的执行反馈。"));
  }
  if (interventions.some((item) => !item.userResponse)) {
    gaps.push(buildDashboardDataGap("missing_user_response", "用户响应缺口", "部分知行提醒还没有 userResponse，响应分布可能偏少。"));
  }
  if (interventions.some((item) => !item.errorType)) {
    gaps.push(buildDashboardDataGap("missing_error_type", "错题类型缺口", "部分知行提醒缺少 errorType，错题覆盖统计可能偏少。"));
  }
  const outcomeSamples = (responseSummary.followedPlanCount || 0) + (responseSummary.deviatedAgainCount || 0);
  if (outcomeSamples < 2) {
    gaps.push(buildDashboardDataGap("insufficient_outcome_samples", "执行反馈样本不足", "已按计划执行和仍然偏离的样本还偏少，先不做强结论。"));
  }
  return gaps;
}

function buildDashboardExecutionPlanSummary(executionPlans = [], topErrorTypes = []) {
  const enabledPlans = executionPlans.filter((item) => item.enabled !== false);
  const disabledCount = executionPlans.length - enabledPlans.length;
  const byErrorType = topCountItems(executionPlans.flatMap((item) => item.errorType ? [item.errorType] : []));
  const activePlanErrorTypes = new Set(enabledPlans.map((item) => cleanText(item.errorType, 80)).filter(Boolean));
  const errorTypesWithPlan = topCountItems(enabledPlans.flatMap((item) => item.errorType ? [item.errorType] : []));
  const topMissingErrorTypes = topErrorTypes
    .filter((item) => item.key && !activePlanErrorTypes.has(item.key))
    .slice(0, 5);
  const coverage = {
    errorTypesWithPlan,
    error_types_with_plan: errorTypesWithPlan,
    topMissingErrorTypes,
    top_missing_error_types: topMissingErrorTypes
  };
  const dataGaps = buildDashboardExecutionPlanDataGaps({ executionPlans, topMissingErrorTypes });

  return {
    totalCount: executionPlans.length,
    total_count: executionPlans.length,
    enabledCount: enabledPlans.length,
    enabled_count: enabledPlans.length,
    disabledCount,
    disabled_count: disabledCount,
    byErrorType,
    by_error_type: byErrorType,
    coverage,
    dataGaps,
    data_gaps: dataGaps
  };
}

function buildDashboardExecutionPlanDataGaps({ executionPlans = [], topMissingErrorTypes = [] }) {
  const gaps = [];
  if (!executionPlans.length) {
    gaps.push(buildDashboardDataGap("missing_execution_plans", "执行计划缺口", "当前没有 executionPlan 数据，执行计划覆盖情况暂不计入看板。"));
  }
  if (topMissingErrorTypes.length) {
    gaps.push(buildDashboardDataGap("missing_execution_plan_coverage", "执行计划覆盖缺口", "部分高频错题还没有启用中的执行计划。"));
  }
  return gaps;
}

function interventionTriggerLabel(value) {
  const map = {
    before_training: "训练前提醒",
    during_training: "训练中提醒",
    after_review: "复盘后提醒",
    weekly_plan: "周期计划提醒",
    repeated_mistake: "旧题复现提醒",
    execution_deviation: "执行偏离提醒"
  };
  return map[value] || cleanText(value, 80) || "知行提醒";
}

function interventionUserResponseLabel(value) {
  const map = {
    continue: "继续",
    change_to_hold: "改为观望",
    later: "稍后再练",
    mute_session: "本局不再提醒",
    followed_plan: "已按计划执行",
    deviated_again: "仍然偏离",
    unclear: "说不清"
  };
  return map[value] || cleanText(value, 80) || "待确认";
}

function buildDashboardExecution(evidence) {
  const rows = [...evidence.tradeReviews, ...evidence.klineRecords, ...evidence.bookmarks]
    .map((item) => normalizeDashboardExecutionResult(item.executionResult));
  const alignedCount = rows.filter((item) => item === "aligned").length;
  const deviatedCount = rows.filter((item) => item === "deviated").length;
  const unclearCount = rows.filter((item) => item === "unclear").length;
  const sampleCount = alignedCount + deviatedCount;
  const consistencyRate = sampleCount ? alignedCount / sampleCount : null;
  const label = sampleCount ? `执行一致率 ${Math.round(consistencyRate * 100)}%` : "样本不足";
  return {
    alignedCount,
    aligned_count: alignedCount,
    deviatedCount,
    deviated_count: deviatedCount,
    unclearCount,
    unclear_count: unclearCount,
    sampleCount,
    sample_count: sampleCount,
    consistencyRate,
    consistency_rate: consistencyRate,
    label
  };
}

function normalizeDashboardExecutionResult(value) {
  const text = cleanText(value, 80).toLowerCase();
  if (!text) return "missing";
  if (["aligned", "followed", "consistent", "按计划执行", "执行一致", "守法"].includes(text)) return "aligned";
  if (["deviated", "deviation", "broken", "执行偏离", "偏离计划", "破法"].includes(text)) return "deviated";
  if (["unclear", "unknown", "不清楚", "待确认", "未判断"].includes(text)) return "unclear";
  return "unclear";
}

function topCountItems(values = [], limit = 8) {
  const counts = new Map();
  values
    .map((value) => cleanText(value, 100))
    .filter(Boolean)
    .forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN"))
    .slice(0, limit);
}

function buildDashboardTrends({ evidence, window }) {
  const allEvidence = [...evidence.tradeReviews, ...evidence.klineRecords, ...evidence.bookmarks];
  const byDate = groupEvidenceByDate(allEvidence, window);
  const daily = Array.from(byDate.entries()).map(([date, rows]) => buildDashboardTrendBucket(date, rows));
  const byWeek = new Map();
  allEvidence.forEach((item) => {
    if (!item.dateValue) return;
    const weekStart = formatDateKey(startOfWeek(item.dateValue));
    const rows = byWeek.get(weekStart) || [];
    rows.push(item);
    byWeek.set(weekStart, rows);
  });
  const weekly = Array.from(byWeek.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([weekStart, rows]) => ({
      ...buildDashboardTrendBucket(weekStart, rows),
      weekStart,
      week_start: weekStart
    }));
  const mistakeTrend = topCountItems(allEvidence.flatMap((item) => item.errorType ? [item.errorType] : []));
  const trainingTrend = topCountItems(evidence.klineRecords.flatMap((item) => item.sourceType ? [item.sourceType] : []));
  return {
    daily,
    weekly,
    executionConsistencyTrend: daily,
    execution_consistency_trend: daily,
    mistakeTrend,
    mistake_trend: mistakeTrend,
    trainingTrend,
    training_trend: trainingTrend
  };
}

function groupEvidenceByDate(rows = [], window) {
  const days = new Map();
  let cursor = new Date(window.dateFrom);
  while (cursor.getTime() <= window.dateTo.getTime()) {
    days.set(formatDateKey(cursor), []);
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  rows.forEach((item) => {
    if (!item.dateKey) return;
    if (!days.has(item.dateKey)) days.set(item.dateKey, []);
    days.get(item.dateKey).push(item);
  });
  return new Map(Array.from(days.entries()).sort(([left], [right]) => left.localeCompare(right)));
}

function buildDashboardTrendBucket(key, rows = []) {
  const tradeReviewCount = rows.filter((item) => item.sourceKind === "trade_review").length;
  const klineTrainingCount = rows.filter((item) => item.sourceKind === "kline_record").length;
  const trainingBookmarkCount = rows.filter((item) => item.sourceKind === "training_bookmark").length;
  const execution = buildDashboardExecution({
    tradeReviews: rows.filter((item) => item.sourceKind === "trade_review"),
    klineRecords: rows.filter((item) => item.sourceKind === "kline_record"),
    bookmarks: rows.filter((item) => item.sourceKind === "training_bookmark")
  });
  return {
    key,
    date: key,
    tradeReviewCount,
    trade_review_count: tradeReviewCount,
    klineTrainingCount,
    kline_training_count: klineTrainingCount,
    trainingBookmarkCount,
    training_bookmark_count: trainingBookmarkCount,
    executionSampleCount: execution.sampleCount,
    execution_sample_count: execution.sample_count,
    consistencyRate: execution.consistencyRate,
    consistency_rate: execution.consistency_rate
  };
}

function buildDashboardDataGaps({ evidence, execution, topErrorTypes, interventions, executionPlans }) {
  const allEvidence = [...evidence.tradeReviews, ...evidence.klineRecords, ...evidence.bookmarks];
  const gaps = [];
  if (!execution.sampleCount || allEvidence.some((item) => !item.executionResult)) {
    gaps.push(buildDashboardDataGap("missingExecutionResult", "执行结果缺口", "部分复盘、训练或收藏还没有 executionResult，执行一致率样本可能偏少。"));
  }
  if (!topErrorTypes.length || allEvidence.some((item) => !item.errorType)) {
    gaps.push(buildDashboardDataGap("missingErrorType", "错题类型缺口", "部分记录还没有 errorType，最高频错题统计可能偏少。"));
  }
  if (allEvidence.some((item) => !item.dateValue)) {
    gaps.push(buildDashboardDataGap("missingDate", "时间字段缺口", "部分证据没有可识别时间，只能进入总量统计。"));
  }
  if (evidence.bookmarks.some((item) => !item.segmentId && !item.trainingPackId && !item.samplingResult)) {
    gaps.push(buildDashboardDataGap("missingBookmarkMetadata", "收藏元数据缺口", "部分训练收藏缺少片段或训练包引用。"));
  }
  if (!interventions.length) {
    gaps.push(buildDashboardDataGap("missingInterventionEvents", "知行提醒缺口", "当前没有 interventionEvent 数据，知行提醒效果暂不计入看板。"));
  }
  if (!executionPlans.length) {
    gaps.push(buildDashboardDataGap("missingExecutionPlans", "执行计划缺口", "当前没有 executionPlan 数据，执行计划完成情况暂不计入看板。"));
  }
  return gaps;
}

function buildDashboardDataGap(type, label, message) {
  return {
    type,
    key: type,
    label,
    message
  };
}

function buildWeeklyProgressHighlights(dashboard) {
  const highlights = [];
  if (dashboard.overview.tradeReviewCount || dashboard.overview.klineTrainingCount) {
    highlights.push(`本周沉淀 ${dashboard.overview.tradeReviewCount} 次真实复盘、${dashboard.overview.klineTrainingCount} 次 K线训练。`);
  }
  if (dashboard.execution.sampleCount) {
    highlights.push(`本周执行一致率为 ${Math.round(dashboard.execution.consistencyRate * 100)}%，继续以记录和复盘校准。`);
  }
  if (dashboard.bookmarks.totalCount) {
    highlights.push(`本周新增 ${dashboard.bookmarks.totalCount} 条训练收藏，可作为后续回放证据。`);
  }
  return highlights.length ? highlights : ["本周样本不足，先完成复盘或训练再观察。"];
}

function buildNextWeekTrainingPlan(dashboard) {
  const primaryError = dashboard.mistakes.topErrorTypes[0]?.label;
  const primaryScene = dashboard.triggerScenes.topTriggerScenes[0]?.label;
  const plan = [];
  if (primaryError) {
    plan.push(`下一周继续围绕「${primaryError}」做复盘和专项训练。`);
  }
  if (primaryScene) {
    plan.push(`遇到「${primaryScene}」时，先停十秒，再记录第一念和下一次执行动作。`);
  }
  if (!plan.length) {
    plan.push("下一周先补足真实复盘和 K线训练样本，再观察高频模式。");
  }
  return plan;
}

function resolveDashboardWindow(options = {}) {
  const range = normalizeDashboardRange(options.range);
  const dateTo = parseDashboardDate(readAliasedField(options, "dateTo", "date_to")) || endOfDay(new Date());
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const fallbackFrom = startOfDay(new Date(dateTo.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
  const dateFrom = parseDashboardDate(readAliasedField(options, "dateFrom", "date_from")) || fallbackFrom;
  return {
    range,
    dateFrom: startOfDay(dateFrom),
    dateTo: endOfDay(dateTo),
    dateFromKey: formatDateKey(dateFrom),
    dateToKey: formatDateKey(dateTo)
  };
}

function normalizeDashboardRange(range) {
  const text = cleanText(range || "30d", 12);
  return ["7d", "30d", "90d"].includes(text) ? text : "30d";
}

function resolveWeeklyWindow(options = {}) {
  const start = parseDashboardDate(readAliasedField(options, "weekStart", "week_start"));
  const end = parseDashboardDate(readAliasedField(options, "weekEnd", "week_end"));
  if (start && end) {
    return {
      weekStart: formatDateKey(start),
      weekEnd: formatDateKey(end)
    };
  }
  const base = options.week === "previous"
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : new Date();
  const weekStart = startOfWeek(base);
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  return {
    weekStart: formatDateKey(weekStart),
    weekEnd: formatDateKey(weekEnd)
  };
}

function resolveDashboardRecordDate(record = {}, fallbackValues = []) {
  return parseDashboardDate(firstPresent(
    record.recordedAt,
    record.recorded_at,
    record.tradeDate,
    record.trade_date,
    record.savedAt,
    record.saved_at,
    record.date,
    record.dateKey,
    record.date_key,
    record.createdAt,
    record.created_at,
    record.updatedAt,
    record.updated_at,
    ...fallbackValues
  ));
}

function parseDashboardDate(value) {
  if (!hasFieldValue(value)) return null;
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T00:00:00.000Z`) : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinDashboardWindow(item, window) {
  if (!item.dateValue) return true;
  const time = item.dateValue.getTime();
  return time >= window.dateFrom.getTime() && time <= window.dateTo.getTime();
}

function formatDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function startOfDay(date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setUTCHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(date) {
  const next = startOfDay(date);
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() - day + 1);
  return next;
}

function inferSecondaryMirror(report, mainMirror) {
  const inferred = inferMirrorName([
    report.secondaryType?.label,
    report.secondaryPersonality?.label,
    report.secondaryType?.summary,
    report.secondaryType?.risk
  ], "良知之镜");
  if (inferred !== mainMirror) return inferred;
  return mainMirror === "良知之镜" ? "焦虑之镜" : "良知之镜";
}

function inferMirrorName(values = [], fallback = "追涨之镜") {
  const text = values.filter(Boolean).join(" ");
  Object.entries(legacyTypeMirrorMap).forEach(([legacy, mirror]) => {
    if (text.includes(legacy)) fallback = mirror;
  });

  if (/追|错过|上车|冲动|拉升|急拉|临盘追/.test(text)) return "追涨之镜";
  if (/扛|不认错|边界后移|不甘|止损|拖住/.test(text)) return "扛单之镜";
  if (/幻想|证明|完美|执念|一定会回来/.test(text)) return "幻想之镜";
  if (/赌|翻本|报复|梭|赢回来/.test(text)) return "执念之镜";
  if (/从众|别人|大家|群|消息|外部/.test(text)) return "从众之镜";
  if (/犹疑|犹豫|等待|回撤|不确定|观望/.test(text)) return "犹疑之镜";
  if (/拖延|麻木|明天|以后再说|迟迟/.test(text)) return "拖延之镜";
  if (/焦虑|恐慌|怕回吐|空仓|害怕|紧张/.test(text)) return "焦虑之镜";
  if (/良知|纪律|平衡|守心|知行/.test(text)) return "良知之镜";
  return normalizeMirrorName(fallback);
}

function normalizeMirrorName(value) {
  const text = String(value || "");
  if (mirrorNames.includes(text)) return text;
  return legacyTypeMirrorMap[text] || inferMirrorName([text], "追涨之镜");
}

function normalizeThieves(value, evidence = []) {
  const source = Array.isArray(value) ? value : [];
  const thieves = source.map((item) => cleanText(item, 12)).filter(Boolean);
  const text = [...evidence, ...thieves].filter(Boolean).join(" ");

  if (/错过|追|急|上车|拉升/.test(text)) thieves.push("贪", "急");
  if (/焦虑|怕|恐慌|回吐|空仓/.test(text)) thieves.push("惧");
  if (/不认错|扛|幻想|执念/.test(text)) thieves.push("痴");
  if (/别人|从众|消息|问/.test(text)) thieves.push("疑");
  if (/拖延|麻木/.test(text)) thieves.push("昧");
  if (/良知|纪律|守心/.test(text)) thieves.push("守心");

  return Array.from(new Set(thieves)).slice(0, 4);
}

function buildBehaviorTags({ detectedMirror, strongestThought }) {
  const tags = [detectedMirror.replace("之镜", "")];
  if (strongestThought) tags.push("真实念头");
  if (detectedMirror === "追涨之镜") tags.push("怕错过");
  if (detectedMirror === "执念之镜") tags.push("想翻本");
  if (detectedMirror === "扛单之镜") tags.push("不认错");
  if (detectedMirror === "从众之镜") tags.push("外部声音");
  return Array.from(new Set(tags)).slice(0, 6);
}

function buildTradeReviewText({ detectedMirror, detectedThieves, strongestThought }) {
  const thought = strongestThought || "第一念";
  const thieves = detectedThieves.length ? detectedThieves.join(" / ") : "待继续观察";
  return `这次复盘照见的是${detectedMirror}，最明显的一念是「${thought}」，心贼显影为${thieves}。先记录触发与反应，再回到训练动作。`;
}

function maskTradeSymbol(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("*")) return cleanText(raw, 40);
  if (raw.length <= 2) return "**";
  return `${"*".repeat(Math.min(6, raw.length - 2))}${raw.slice(-2)}`;
}

function normalizeReactionTimeMs(value) {
  const time = Number(value || 0);
  if (!Number.isFinite(time) || time < 0) return 0;
  return Math.min(Math.round(time), 600000);
}

function normalizeProcessScores(scores = {}) {
  const source = scores && typeof scores === "object" ? scores : {};
  return {
    planExecution: clampPercent(source.planExecution ?? source.plan_execution),
    boundaryKeeping: clampPercent(source.boundaryKeeping ?? source.boundary_keeping),
    impulseDelay: clampPercent(source.impulseDelay ?? source.impulse_delay),
    emotionalStability: clampPercent(source.emotionalStability ?? source.emotional_stability),
    reviewCompletion: clampPercent(source.reviewCompletion ?? source.review_completion)
  };
}

function compareReportRiskRadar(beforeReport, afterReport) {
  const beforeItems = beforeReport?.riskRadar || [];
  const afterItems = afterReport?.riskRadar || [];

  return beforeItems.map((beforeItem) => {
    const afterItem = afterItems.find((item) => item.key === beforeItem.key);
    const before = clampPercent(beforeItem.value);
    const after = clampPercent(afterItem?.value ?? beforeItem.value);

    return {
      key: beforeItem.key,
      label: beforeItem.label,
      before,
      after,
      delta: after - before
    };
  });
}

function publicUser(record) {
  return {
    id: record.id,
    merged_ids: record.merged_ids || [],
    phone: record.phone,
    phone_tail: record.phone_tail,
    nickname: record.nickname,
    invite_source: record.invite_source,
    source_channel: record.source_channel,
    created_at: record.created_at,
    updated_at: record.updated_at
  };
}

function toAdminUser(record) {
  const report = record.assessment?.report;
  const primary = report?.primaryType?.label || "未完成";
  const secondary = report?.secondaryType?.label || "待观察";
  const strongestRisk = getStrongestRisk(report);
  const latestRetest = record.retests[record.retests.length - 1];
  const baselineReport = record.baseline_report || report;

  return {
    id: record.id,
    phone: record.phone,
    assessmentTime: formatTime(report?.createdAt || record.created_at),
    primaryType: primary,
    secondaryType: secondary,
    riskLabel: strongestRisk?.label || "待照见",
    campSuggestion: report ? report.campSuggestion?.name || `${primary}七日知行训练` : "完成测评后生成",
    trainingStatus: getTrainingStatus(record.training_records),
    inviteSource: record.invite_source || record.source_channel || "网页MVP",
    assistant: record.assistant,
    assistantSummary: record.assistant_summary || null,
    feishuSync: record.feishu_sync || null,
    shareCard: record.share_card || null,
    mirrorReport: record.mirror_report || null,
    livingMirrorStats: record.living_mirror_stats || null,
    tradeReviews: (record.trade_reviews || []).map(toAdminTradeReview),
    report: {
      title: "交易人格照见报告",
      heartThief: report?.firstThoughtDisplay || report?.firstThought || "待照见",
      summary: report?.primaryType?.summary || "完成测评后展示交易心理觉察摘要。",
      yangmingReminder: "先照见此心，再训练一个可执行动作。",
      trainingDirection: report?.trainingDirection || "先完成测评，再进入七日训练。"
    },
    trainingRecords: record.training_records.map(toAdminTrainingRecord),
    klineRecords: record.kline_records.map(toAdminKLineRecord),
    retestComparisons: getLatestRetestComparison(record).map(toAdminRetestComparison),
    retestChange: {
      before: baselineReport?.primaryType?.label || "暂无初测",
      after: latestRetest?.report?.primaryType?.label || "暂无复测",
      changeNote: latestRetest
        ? summarizeRetest(latestRetest.comparison)
        : "完成七日训练和复测后，这里展示风险雷达前后变化。"
    }
  };
}

function toAdminTradeReview(review) {
  return {
    id: review.id,
    tradeDate: review.tradeDate,
    detectedMirror: review.detectedMirror,
    strongestThought: review.strongestThought,
    reviewText: review.reviewText,
    behaviorTags: review.behaviorTags || [],
    crossEndStatus: review.crossEndStatus || "",
    crossEndStatusText: review.crossEndStatusText || "",
    createdAt: review.createdAt
  };
}

function buildShareCard(record, { id = "", channel = "", createdAt = "", updatedAt = "" } = {}) {
  const report = record.assessment?.report || {};
  const primaryType = report.primaryType?.label || "未定型";
  const secondaryType = report.secondaryType?.label || "待观察";
  const strongestRisk = getStrongestRisk(report);
  const riskLabel = strongestRisk?.label || "第一念";
  const inviteCode = record.invite_source || record.source_channel || "web-next";
  const shareUrl = `/assessment-entry?invite_code=${encodeURIComponent(inviteCode)}`;
  const created = createdAt || new Date().toISOString();

  return {
    id: id || crypto.randomUUID(),
    user_id: record.id,
    title: shareCardContent.title,
    subtitle: shareCardContent.subtitle,
    conclusion: cleanText(buildShareCardConclusion({ primaryType, riskLabel }), 120),
    primaryType,
    secondaryType,
    riskLabel,
    trainingFocus: cleanText(buildShareCardTrainingFocus({ riskLabel }), 140),
    inviteCode,
    sourceChannel: record.source_channel || "web-next",
    channel: cleanText(channel || record.source_channel || "web-next", 80),
    cta: shareCardContent.cta,
    shareText: cleanText(`${shareCardContent.title}：我正在做交易心理觉察与七日训练。${shareCardContent.cta}`, 140),
    shareUrl,
    compliance: shareCardContent.compliance,
    created_at: created,
    updated_at: updatedAt || created
  };
}

function createInviteSourceBucket(source, sourceChannel) {
  return {
    source,
    sourceChannel: sourceChannel || source,
    userCount: 0,
    assessmentCount: 0,
    trainingStartedCount: 0,
    trainingCompletedCount: 0,
    retestCount: 0,
    assistantHandoffCount: 0,
    shareCardCount: 0,
    lastAssessmentAt: "",
    primaryTypeCounts: {}
  };
}

function latestIso(left = "", right = "") {
  if (!right) return left || "";
  if (!left) return right;
  return new Date(right).getTime() > new Date(left).getTime() ? right : left;
}

function toAdminTrainingRecord(record) {
  const checkIn = formatPracticeCheckIn(record.check_in);
  const reflection = record.cultivation_text || record.note || "已记录今日觉察。";

  return {
    day: `第 ${record.day} 天`,
    date: record.date_key || String(record.recorded_at || "").slice(0, 10),
    status: record.status === "completed" ? "已完成" : "未完成",
    action: record.title,
    reflection: checkIn ? `签到：${checkIn}；${reflection}` : reflection
  };
}

function toAdminKLineRecord(record) {
  const processQuality = summarizeKLineProcessScores(record.process_scores);
  const disciplineParts = [
    record.discipline_action || "先停一息，再复盘",
    record.feedback,
    processQuality,
    record.process_insight
  ].filter(Boolean);

  return {
    day: record.day ? `第 ${record.day} 天` : "未标记天数",
    date: String(record.recorded_at || "").slice(0, 10),
    scene: record.scene || "未填写场景",
    reaction: record.reaction || "已觉察，未展开",
    disciplineAction: disciplineParts.join("；")
  };
}

function summarizeKLineProcessScores(scores) {
  if (!scores || typeof scores !== "object") return "";
  const plan = Number(scores.planExecution ?? scores.plan_execution ?? 0);
  const boundary = Number(scores.boundaryKeeping ?? scores.boundary_keeping ?? 0);
  const delay = Number(scores.impulseDelay ?? scores.impulse_delay ?? 0);
  if (!plan && !boundary && !delay) return "";
  return `过程质量：计划执行 ${clampPercent(plan)}，守界 ${clampPercent(boundary)}，延迟 ${clampPercent(delay)}`;
}

function formatPracticeCheckIn(value) {
  if (value === "preparing_trade") return "准备交易";
  if (value === "observe_only") return "只观察";
  if (value === "already_traded") return "已经交易过";
  return "";
}

function toAdminRetestComparison(item) {
  return {
    key: item.key,
    label: item.label,
    before: item.before,
    after: item.after,
    delta: item.delta
  };
}

function getTrainingStatus(records) {
  if (!records.length) return "未开始";
  const completed = records.filter((item) => item.status === "completed").length;
  if (completed >= 7) return "第 7 天已完成";
  return `第 ${completed + 1} 天进行中`;
}

function getStrongestRisk(report) {
  const items = report?.riskRadar || [];
  return [...items].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0] || null;
}

function summarizeRetest(comparison) {
  if (!comparison?.length) return "复测已记录，继续观察同类触发下是否更早觉察。";
  const strongest = [...comparison].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  if (!strongest || strongest.delta === 0) return "复测风险雷达整体持平，适合继续记录日常触发与复盘。";
  return `${strongest.label}${strongest.delta > 0 ? "上升" : "下降"} ${Math.abs(strongest.delta)}%，用于复盘触发强度变化，不代表行情判断。`;
}

async function syncAssistantSummaryToFeishuRecord(record, { dryRun = false, persist = true } = {}) {
  const report = record.assessment?.report;
  if (!record.assistant_summary && report) {
    record.assistant_summary = buildAssistantSummary(record, report);
  }

  if (!record.assistant_summary) {
    const error = new Error("暂无助教摘要，无法同步飞书");
    error.statusCode = 400;
    throw error;
  }

  try {
    const result = await syncReportToFeishu({
      payload: buildFeishuAssistantPayload(record),
      dryRun
    });
    record.feishu_sync = {
      status: dryRun ? "dry_run" : "success",
      target: result.target || "not_configured",
      synced_at: new Date().toISOString(),
      error: ""
    };
    if (persist) await persistDataBindingUsers();
    return result;
  } catch (error) {
    record.feishu_sync = {
      status: "failed",
      target: "feishu_bot",
      synced_at: new Date().toISOString(),
      error: error.message || "飞书同步失败"
    };
    if (persist) await persistDataBindingUsers();
    if (!dryRun) throw error;
    return { sent: false, dry_run: true, error: record.feishu_sync.error };
  }
}

function buildAssistantSummary(record, report) {
  const primary = report?.primaryType?.label || "未完成";
  const secondary = report?.secondaryType?.label || "待观察";
  const strongestRisk = getStrongestRisk(report);
  const riskLabel = strongestRisk?.label || "待照见";
  const riskValue = strongestRisk?.value ?? 0;
  const trainingCamp = report ? report.campSuggestion?.name || `${primary}七日知行训练` : "完成测评后生成";
  const priority = riskValue >= 70 ? "优先承接" : riskValue >= 45 ? "常规跟进" : "自训练观察";
  const script = buildAssistantScript({ primary, riskLabel, trainingDirection: report?.trainingDirection });

  return {
    phone: record.phone,
    primaryType: primary,
    secondaryType: secondary,
    riskLabel,
    riskValue,
    trainingCamp,
    priority,
    focus: `先围绕「${riskLabel}」做七日觉察、训练与复盘。`,
    script,
    created_at: new Date().toISOString()
  };
}

function buildAssistantScript({ primary, riskLabel, trainingDirection }) {
  return cleanText(
    `你这次照见的主反应是「${primary}」，最需要先观察的是「${riskLabel}」。接下来不用急着证明改变，先按「${trainingDirection || "停十秒、记一念、做复盘"}」连续练七天，再看复测变化。`,
    220
  );
}

function buildFeishuAssistantPayload(record) {
  const report = record.assessment?.report || {};
  const summary = record.assistant_summary || buildAssistantSummary(record, report);

  return {
    user: {
      id: record.id,
      nickname: record.nickname,
      phone: record.phone,
      contact: record.phone,
      personalInviteCode: record.invite_source
    },
    phone: record.phone,
    user_id: record.id,
    invite_code: record.invite_source,
    score_result: {
      main_type: summary.primaryType,
      sub_type: summary.secondaryType,
      risk_level: summary.riskLabel,
      camp: summary.trainingCamp,
      recommended_camp: summary.trainingCamp,
      training_ability: summary.priority
    },
    assistant_handoff: {
      priority: summary.priority,
      conversion: "引导完成七日训练与复测，不做行情判断。",
      focus: summary.focus,
      action: "发送训练处方，提醒记录每日触发、第一念和复盘。",
      script: summary.script
    },
    assistant_script: summary.script,
    report_summary: report.primaryType?.summary || summary.focus,
    server_report: {
      id: record.assessment?.id,
      report_no: record.assessment?.id,
      created_at: record.assessment?.saved_at,
      content_md: report.primaryType?.summary || "",
      score_result: {
        main_type: summary.primaryType,
        sub_type: summary.secondaryType,
        risk_level: summary.riskLabel,
        camp: summary.trainingCamp
      }
    },
    channel: record.invite_source || record.source_channel,
    submitted_at: record.assessment?.saved_at || new Date().toISOString()
  };
}

function cleanText(value, maxLength) {
  const text = String(value || "").trim().slice(0, maxLength);
  return forbiddenPhrases.reduce((current, phrase) => current.replaceAll(phrase, "训练提示"), text);
}

function cleanComplianceText(value) {
  const notice = cleanComplianceNotice(value);
  return notice.endsWith("。") ? notice : `${notice}。`;
}

function cleanComplianceNotice(value) {
  const text = cleanText(value || "", 220).replace(/。+$/g, "");
  if (text.includes("不构成投资建议")) return text;
  return "本报告用于交易心理觉察，不构成投资建议";
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function maskPhone(value, tail = "") {
  if (/^\d{3}\*{4}\d{4}$/.test(String(value))) return String(value);
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 11) return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  if (tail) return `*** **** ${tail}`.replace(/\s/g, "");
  return "未留存";
}

function derivePhoneIdentity({ rawPhone = "", maskedPhone = "", phoneTail = "" } = {}) {
  const rawDigits = String(rawPhone || "").replace(/\D/g, "");
  const masked = String(maskedPhone || "").trim();
  const tail = String(phoneTail || "").replace(/\D/g, "").slice(-4);

  if (rawDigits.length >= 11) return `phone:${hashIdentity(rawDigits.slice(-11))}`;
  if (/^\d{3}\*{4}\d{4}$/.test(masked)) return `masked:${masked}`;
  if (tail) return `tail:${hashIdentity(tail)}`;
  return "";
}

function hashIdentity(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 18);
}

function formatTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function seedDemoUsers() {
  const seedReports = [
    {
      id: "adm-user-001",
      phone: "138****6219",
      inviteSource: "直播间 A-0528",
      assistant: { status: "已承接", owner: "助教清和", handoffAt: "2026-05-28 10:16", note: "已发送测评报告卡与今日停十秒训练提醒。" },
      report: demoReport({
        createdAt: "2026-05-28T09:42:00.000Z",
        primary: "冲动型",
        secondary: "焦虑型",
        riskLabel: "临盘追动",
        firstThought: "怕错过",
        training: "行动前写下理由、边界、退出条件。",
        radar: [{ key: "impulse", label: "临盘追动", value: 78 }, { key: "panic", label: "恐慌离场", value: 54 }]
      }),
      training: [
        { day: 1, dateKey: "2026-05-28", title: "看到想追的念头时停十秒", note: "今日只练暂停。", cultivationText: "今天第一次记录到怕错过。" },
        { day: 2, dateKey: "2026-05-29", title: "行动前复核计划卡", note: "先看边界。", cultivationText: "冲动出现时能先看边界。" }
      ]
    },
    {
      id: "adm-user-002",
      phone: "186****3907",
      inviteSource: "私域海报 YM-17",
      assistant: { status: "待承接", owner: "未分配", handoffAt: "", note: "建议优先发送边界确认训练说明，不涉及任何买卖判断。" },
      report: demoReport({
        createdAt: "2026-05-29T21:08:00.000Z",
        primary: "扛单型",
        secondary: "偏执型",
        riskLabel: "边界后移",
        firstThought: "不甘认错",
        training: "触发边界后只执行预案，并记录第一念。",
        radar: [{ key: "holding", label: "边界后移", value: 82 }, { key: "proving", label: "证明执念", value: 66 }]
      }),
      training: []
    }
  ];

  seedReports.forEach((item) => {
    const record = ensureUser({
      id: item.id,
      masked_phone: item.phone,
      phone_tail: item.phone.slice(-4),
      nickname: "体验学员",
      invite_source: item.inviteSource,
      source_channel: "后台MVP"
    });
    record.assistant = item.assistant;
    record.assessment = {
      id: crypto.randomUUID(),
      saved_at: item.report.createdAt,
      source: "seed",
      answers_count: 12,
      question_order: [],
      report: item.report
    };
    record.baseline_report = item.report;
    record.assistant_summary = buildAssistantSummary(record, item.report);
    record.share_card = buildShareCard(record, { channel: item.inviteSource });
    record.training_records = item.training.map((training) => normalizeTrainingRecord(training, `${training.dateKey}T09:00:00.000Z`));
    record.mirror_report = buildMirrorReportFromAssessment(item.report, record);
    refreshLivingMirrorState(record);
  });
}

function demoReport({ createdAt, primary, secondary, firstThought, training, radar }) {
  return {
    createdAt,
    totalQuestions: 12,
    answeredCount: 12,
    primaryType: { key: primary, label: primary, summary: `当前主要反应是${firstThought}，适合从暂停、记录与复盘开始训练。`, risk: "", training, score: 8 },
    secondaryType: { key: secondary, label: secondary, summary: "", risk: "", training: "", score: 5 },
    scores: {},
    riskRadar: radar.map(normalizeRiskRadarItem),
    firstThought,
    firstThoughtDisplay: firstThought,
    trainingDirection: training,
    disclaimer: "本报告用于交易心理觉察，不构成投资建议。"
  };
}
