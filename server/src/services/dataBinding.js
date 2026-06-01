import crypto from "node:crypto";
import { buildShareCardConclusion, buildShareCardTrainingFocus, shareCardContent } from "../../../packages/content/share-card.js";
import { config } from "../config.js";
import { readJsonFile, replaceRuntimeRecords, runtimeFile } from "../lib/store.js";
import { syncReportToFeishu } from "./feishu.js";

const users = new Map();
const DATA_BINDING_FILE = "data-binding-users.json";
let dataBindingLoaded = false;
let dataBindingLoading = null;

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];
const assistantStatuses = new Set(["待承接", "已承接", "待复盘", "已完成"]);

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
  record.assistant_summary = buildAssistantSummary(record, normalizedReport);
  record.updated_at = now;

  if (config.feishuAutoSync) {
    await syncAssistantSummaryToFeishuRecord(record, { dryRun: false, persist: false });
  }

  await persistDataBindingUsers();

  return {
    user: publicUser(record),
    report: normalizedReport,
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
  const nextRecords = userRecord.training_records.filter((item) => item.day !== trainingRecord.day);

  nextRecords.push(trainingRecord);
  nextRecords.sort((a, b) => Number(a.day) - Number(b.day));
  userRecord.training_records = nextRecords;
  userRecord.practice_state = practiceState || userRecord.practice_state;
  userRecord.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(userRecord),
    record: trainingRecord,
    admin_user: toAdminUser(userRecord)
  };
}

export async function saveKLineRecordBinding({ user = {}, record = {}, source = "api" }) {
  await ensureDataBindingLoaded();
  const profile = normalizeUserProfile(user);
  const userRecord = ensureUser(profile);
  const now = new Date().toISOString();
  const klineRecord = {
    id: crypto.randomUUID(),
    day: Number(record.day || 0),
    recorded_at: record.recordedAt || now,
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

  userRecord.kline_records.push(klineRecord);
  userRecord.updated_at = now;
  await persistDataBindingUsers();

  return {
    user: publicUser(userRecord),
    record: klineRecord,
    admin_user: toAdminUser(userRecord)
  };
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
  await persistDataBindingUsers();

  return {
    user: publicUser(userRecord),
    retest: userRecord.retests[userRecord.retests.length - 1],
    comparison: radarComparison,
    admin_user: toAdminUser(userRecord)
  };
}

export async function getRetestComparisonBinding(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  const latestRetest = record?.retests?.[record.retests.length - 1];
  return latestRetest?.comparison || [];
}

export async function getDataBindingUserSummary(userId) {
  await ensureDataBindingLoaded();
  const record = findUserRecord(userId);
  if (!record) return null;

  return {
    user: publicUser(record),
    report: record.assessment?.report || null,
    training_records: record.training_records,
    kline_records: record.kline_records,
    retests: record.retests,
    retest_comparison: getLatestRetestComparison(record),
    assistant_summary: record.assistant_summary || null,
    feishu_sync: record.feishu_sync || null,
    share_card: record.share_card || null,
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
    retests: Array.isArray(record?.retests) ? record.retests : [],
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
    retests: [],
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
  canonical.retests = mergeById(canonical.retests, incoming.retests)
    .sort((a, b) => new Date(a.saved_at || 0).getTime() - new Date(b.saved_at || 0).getTime());
  canonical.practice_state = canonical.practice_state || incoming.practice_state;
  canonical.assistant = chooseAssistant(canonical.assistant, incoming.assistant);
  canonical.assistant_summary = chooseLatestByTime(canonical.assistant_summary, incoming.assistant_summary, "created_at");
  canonical.feishu_sync = chooseLatestByTime(canonical.feishu_sync, incoming.feishu_sync, "synced_at");
  canonical.share_card = canonical.share_card || incoming.share_card;
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
  const byDay = new Map();
  [...left, ...right].forEach((record) => {
    const key = String(record.day || record.date_key || record.id);
    const existing = byDay.get(key);
    if (!existing || new Date(record.recorded_at || 0).getTime() >= new Date(existing.recorded_at || 0).getTime()) {
      byDay.set(key, record);
    }
  });
  return Array.from(byDay.values()).sort((a, b) => Number(a.day || 0) - Number(b.day || 0));
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
