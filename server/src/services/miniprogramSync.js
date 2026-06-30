import { readRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const STATE_FILE = "miniprogram-states.json";
const ALLOWED_KEYS = new Set([
  "profile",
  "user_id",
  "user_binding",
  "assessment_result",
  "assessment_history",
  "assessment_answers",
  "mind_profile",
  "zhixing_score",
  "daily_loop_state",
  "heart_proof_cards",
  "training_record",
  "training7_state",
  "three_seals_records",
  "opening_check_records",
  "intraday_boundary_records",
  "kline_mind_records",
  "kline_history_cache",
  "kline_scenarios",
  "kline_session_records",
  "kline_review_reports",
  "kline_mirror_challenges",
  "anonymous_reaction_stats",
  "trade_review_records",
  "living_mirror_stats",
  "assistant_handoff",
  "training_prescription",
  "intervention_event",
  "intervention_events",
  "interventionEvent",
  "interventionEvents",
  "execution_plan",
  "execution_plans",
  "executionPlan",
  "executionPlans",
  "mini_program_binding",
  "mini_loop_progress",
  "mini_daily_practice",
  "mini_heart_proofs",
  "journey_state",
  "evidence_ledger",
  "closing_review_records",
  "share_cards",
  "invite_events",
  "invite_funnel",
  "lesson_reservations",
  "lesson_watch_records",
  "retest_snapshots",
  "companion_mirrors",
  "group_practice",
  "subscription_state",
  "subscription_view",
  "mock_user_profile",
  "retention_state",
  "reaction_records",
  "mind_records",
  "training_state",
  "review_records",
  "dojo_state",
  "shared_entities",
  "client_meta"
]);

export async function getMiniprogramState(userId) {
  const normalizedUserId = String(userId || "");
  if (!normalizedUserId) {
    const error = new Error("user_id 不能为空");
    error.statusCode = 400;
    throw error;
  }

  const records = await readRuntimeRecords(STATE_FILE);
  return records.find((item) => item.user_id === normalizedUserId) || createEmptyState(normalizedUserId);
}

export async function saveMiniprogramState({ userId, state = {}, sourceChannel = "微信小程序MVP" }) {
  const normalizedUserId = String(userId || "");
  if (!normalizedUserId) {
    const error = new Error("user_id 不能为空");
    error.statusCode = 400;
    throw error;
  }

  const cleanState = sanitizeState(state);
  const now = new Date().toISOString();
  let saved;

  await updateRuntimeRecords(STATE_FILE, (records) => {
    const index = records.findIndex((item) => item.user_id === normalizedUserId);
    const base = index >= 0 ? records[index] : createEmptyState(normalizedUserId);

    saved = {
      ...base,
      ...cleanState,
      user_id: normalizedUserId,
      source_channel: sourceChannel,
      sync_count: Number(base.sync_count || 0) + 1,
      updated_at: now
    };

    if (index >= 0) {
      records[index] = saved;
      return records;
    }

    return records.concat(saved);
  });

  return saved;
}

function createEmptyState(userId) {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    profile: null,
    user_binding: {},
    assessment_result: null,
    assessment_history: [],
    assessment_answers: [],
    mind_profile: {},
    zhixing_score: {},
    daily_loop_state: {},
    heart_proof_cards: {},
    training_record: {},
    training7_state: {},
    three_seals_records: {},
    opening_check_records: {},
    intraday_boundary_records: {},
    kline_mind_records: {},
    kline_history_cache: {},
    kline_scenarios: {},
    kline_session_records: {},
    kline_review_reports: {},
    kline_mirror_challenges: {},
    anonymous_reaction_stats: {},
    trade_review_records: {},
    living_mirror_stats: {},
    assistant_handoff: {},
    training_prescription: null,
    intervention_event: {},
    intervention_events: {},
    interventionEvent: {},
    interventionEvents: {},
    execution_plan: {},
    execution_plans: {},
    executionPlan: {},
    executionPlans: {},
    mini_program_binding: {},
    mini_loop_progress: {},
    mini_daily_practice: {},
    mini_heart_proofs: {},
    journey_state: {},
    evidence_ledger: {},
    closing_review_records: {},
    share_cards: {},
    invite_events: [],
    invite_funnel: {},
    lesson_reservations: {},
    lesson_watch_records: {},
    retest_snapshots: {},
    companion_mirrors: {},
    group_practice: {},
    subscription_state: {},
    subscription_view: {},
    mock_user_profile: {},
    retention_state: {},
    reaction_records: {},
    mind_records: {},
    training_state: {},
    review_records: {},
    dojo_state: {},
    shared_entities: {},
    client_meta: {},
    source_channel: "微信小程序MVP",
    sync_count: 0,
    created_at: now,
    updated_at: null
  };
}

function sanitizeState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    const error = new Error("state 必须是对象");
    error.statusCode = 400;
    throw error;
  }

  const clean = {};
  for (const [key, value] of Object.entries(state)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    clean[key] = sanitizeJson(value);
  }
  return clean;
}

function sanitizeJson(value, depth = 0) {
  if (depth > 8) return null;
  if (value === null) return null;
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
