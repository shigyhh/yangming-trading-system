const PROFILE_KEY = "zhixing_profile";
const ASSESSMENT_KEY = "zhixing_assessment_result";
const ANSWERS_KEY = "zhixing_assessment_answers";
const TRAINING_KEY = "zhixing_training_state";
const REVIEW_KEY = "zhixing_review_records";
const SYNC_STATUS_KEY = "zhixing_sync_status";
const MIND_KEY = "zhixing_opening_mind_records";
const DOJO_KEY = "zhixing_dojo_state";
const MIND_PROFILE_KEY = "zhixing_mind_profile";
const ZHIXING_SCORE_KEY = "zhixing_score_state";
const DAILY_LOOP_KEY = "zhixing_daily_loop_state";
const HEART_CARD_KEY = "zhixing_heart_proof_cards";

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function read(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value || fallback;
  } catch (error) {
    return fallback;
  }
}

function write(key, value) {
  wx.setStorageSync(key, value);
  return value;
}

function ensureProfile() {
  const profile = read(PROFILE_KEY, null);
  if (profile) return profile;
  return write(PROFILE_KEY, {
    nickname: "修行者",
    stage: "立志",
    points: 0,
    streak: 0,
    resourceUnlocked: false,
    createdAt: Date.now()
  });
}

function getProfile() {
  return ensureProfile();
}

function updateProfile(patch) {
  const next = Object.assign({}, ensureProfile(), patch, { updatedAt: Date.now() });
  return write(PROFILE_KEY, next);
}

function getAssessmentResult() {
  return read(ASSESSMENT_KEY, null);
}

function saveAssessmentResult(result, answers) {
  write(ASSESSMENT_KEY, result);
  write(ANSWERS_KEY, answers);
  updateProfile({ stage: "照见", lastAssessmentType: result.primary });
  return result;
}

function getAssessmentAnswers() {
  return read(ANSWERS_KEY, []);
}

function saveAssessmentAnswers(answers) {
  return write(ANSWERS_KEY, Array.isArray(answers) ? answers : []);
}

function getTrainingState() {
  return read(TRAINING_KEY, {});
}

function getTodayTraining() {
  const state = getTrainingState();
  return state[todayKey()] || {
    steps: {},
    reflection: "",
    completed: false,
    updatedAt: null
  };
}

function saveTodayTraining(dayState) {
  const state = getTrainingState();
  state[todayKey()] = Object.assign({}, dayState, { updatedAt: Date.now() });
  write(TRAINING_KEY, state);
  return state[todayKey()];
}

function getReviews() {
  return read(REVIEW_KEY, {});
}

function getMindRecords() {
  return read(MIND_KEY, {});
}

function getTodayMind() {
  return getMindRecords()[todayKey()] || null;
}

function saveTodayMind(record) {
  const records = getMindRecords();
  records[todayKey()] = Object.assign({}, record, { date: todayKey(), updatedAt: Date.now() });
  write(MIND_KEY, records);
  return records[todayKey()];
}

function getTodayReview() {
  return getReviews()[todayKey()] || null;
}

function saveTodayReview(review) {
  const reviews = getReviews();
  reviews[todayKey()] = Object.assign({}, review, { date: todayKey(), updatedAt: Date.now() });
  write(REVIEW_KEY, reviews);
  return reviews[todayKey()];
}

function getMindProfile() {
  return read(MIND_PROFILE_KEY, {
    personality_type: "",
    current_stage: "立志",
    current_stage_key: "lizhi",
    heart_thief: "",
    zhixing_score: 0,
    discipline_rate: 0,
    reflection_count: 0,
    streak_days: 0,
    current_mind_state: "",
    today_training: "",
    today_commandment: "",
    updated_at: null
  });
}

function saveMindProfile(patch) {
  const next = Object.assign({}, getMindProfile(), patch || {}, { updated_at: Date.now() });
  return write(MIND_PROFILE_KEY, next);
}

function getZhixingScoreState() {
  return read(ZHIXING_SCORE_KEY, {
    latest: null,
    records: {},
    updatedAt: null
  });
}

function saveZhixingScoreRecord(record) {
  const state = getZhixingScoreState();
  const dayKey = record && record.dayKey ? record.dayKey : todayKey();
  const nextRecord = Object.assign({}, record, { dayKey, updatedAt: Date.now() });
  const records = Object.assign({}, state.records || {}, { [dayKey]: nextRecord });
  const next = {
    latest: nextRecord,
    records,
    updatedAt: Date.now()
  };
  return write(ZHIXING_SCORE_KEY, next);
}

function getDailyLoopState() {
  return read(DAILY_LOOP_KEY, {
    today: todayKey(),
    steps: [],
    completedCount: 0,
    totalCount: 7,
    progress: 0,
    completed: false,
    updatedAt: null
  });
}

function saveDailyLoopState(loopState) {
  return write(DAILY_LOOP_KEY, Object.assign({}, loopState || {}, { updatedAt: Date.now() }));
}

function getHeartCardState() {
  return read(HEART_CARD_KEY, {
    latest: null,
    records: {},
    updatedAt: null
  });
}

function getTodayHeartCard() {
  const state = getHeartCardState();
  return (state.records || {})[todayKey()] || null;
}

function saveTodayHeartCard(record) {
  const state = getHeartCardState();
  const dayKey = record && record.dayKey ? record.dayKey : todayKey();
  const nextRecord = Object.assign({}, record || {}, {
    dayKey,
    completed: true,
    updatedAt: Date.now()
  });
  const next = {
    latest: nextRecord,
    records: Object.assign({}, state.records || {}, { [dayKey]: nextRecord }),
    updatedAt: Date.now()
  };
  return write(HEART_CARD_KEY, next);
}

function clearTodayHeartCard(dayKey = todayKey()) {
  const state = getHeartCardState();
  const records = Object.assign({}, state.records || {});
  delete records[dayKey];
  const recordKeys = Object.keys(records).sort();
  const latest = recordKeys.length ? records[recordKeys[recordKeys.length - 1]] : null;
  return write(HEART_CARD_KEY, {
    latest,
    records,
    updatedAt: Date.now()
  });
}

function getDojoState() {
  const state = read(DOJO_KEY, {
    joined: false,
    mentorCode: "",
    mentorRole: "coach",
    relation: {
      spiritualMentor: { name: "阳明先生", role: "道统导师" },
      humanMentor: null
    },
    assistantLogs: [],
    taskRecords: {},
    updatedAt: null
  });
  return Object.assign({
    joined: false,
    mentorCode: "",
    mentorRole: "coach",
    relation: {
      spiritualMentor: { name: "阳明先生", role: "道统导师" },
      humanMentor: null
    },
    assistantLogs: [],
    taskRecords: {},
    updatedAt: null
  }, state || {});
}

function saveDojoState(patch) {
  const next = Object.assign({}, getDojoState(), patch, { updatedAt: Date.now() });
  return write(DOJO_KEY, next);
}

function clearAssessment() {
  wx.removeStorageSync(ASSESSMENT_KEY);
  wx.removeStorageSync(ANSWERS_KEY);
  updateProfile({ stage: "立志", lastAssessmentType: "" });
}

function collectLocalState() {
  return {
    profile: getProfile(),
    assessment_result: getAssessmentResult(),
    assessment_answers: getAssessmentAnswers(),
    mind_profile: getMindProfile(),
    zhixing_score: getZhixingScoreState(),
    daily_loop_state: getDailyLoopState(),
    heart_proof_cards: getHeartCardState(),
    mind_records: getMindRecords(),
    training_state: getTrainingState(),
    review_records: getReviews(),
    dojo_state: getDojoState(),
    client_meta: {
      source: "wechat_miniprogram_mvp",
      updated_at: Date.now()
    }
  };
}

function applyRemoteState(remoteState = {}) {
  if (!remoteState || typeof remoteState !== "object") return collectLocalState();
  if (remoteState.profile) write(PROFILE_KEY, Object.assign({}, ensureProfile(), remoteState.profile));
  if (remoteState.assessment_result) write(ASSESSMENT_KEY, remoteState.assessment_result);
  if (Array.isArray(remoteState.assessment_answers)) write(ANSWERS_KEY, remoteState.assessment_answers);
  if (remoteState.mind_profile && typeof remoteState.mind_profile === "object") write(MIND_PROFILE_KEY, remoteState.mind_profile);
  if (remoteState.zhixing_score && typeof remoteState.zhixing_score === "object") write(ZHIXING_SCORE_KEY, remoteState.zhixing_score);
  if (remoteState.daily_loop_state && typeof remoteState.daily_loop_state === "object") write(DAILY_LOOP_KEY, remoteState.daily_loop_state);
  if (remoteState.heart_proof_cards && typeof remoteState.heart_proof_cards === "object") write(HEART_CARD_KEY, remoteState.heart_proof_cards);
  if (remoteState.mind_records && typeof remoteState.mind_records === "object") write(MIND_KEY, remoteState.mind_records);
  if (remoteState.training_state && typeof remoteState.training_state === "object") write(TRAINING_KEY, remoteState.training_state);
  if (remoteState.review_records && typeof remoteState.review_records === "object") write(REVIEW_KEY, remoteState.review_records);
  if (remoteState.dojo_state && typeof remoteState.dojo_state === "object") write(DOJO_KEY, remoteState.dojo_state);
  return collectLocalState();
}

function getSyncStatus() {
  return read(SYNC_STATUS_KEY, {
    ok: false,
    syncing: false,
    message: "未同步",
    syncedAt: null
  });
}

function saveSyncStatus(status) {
  return write(SYNC_STATUS_KEY, Object.assign({}, getSyncStatus(), status));
}

module.exports = {
  todayKey,
  ensureProfile,
  getProfile,
  updateProfile,
  getAssessmentResult,
  saveAssessmentResult,
  getAssessmentAnswers,
  saveAssessmentAnswers,
  getMindRecords,
  getTodayMind,
  saveTodayMind,
  getTrainingState,
  getTodayTraining,
  saveTodayTraining,
  getReviews,
  getTodayReview,
  saveTodayReview,
  getMindProfile,
  saveMindProfile,
  getZhixingScoreState,
  saveZhixingScoreRecord,
  getDailyLoopState,
  saveDailyLoopState,
  getHeartCardState,
  getTodayHeartCard,
  saveTodayHeartCard,
  clearTodayHeartCard,
  getDojoState,
  saveDojoState,
  clearAssessment,
  collectLocalState,
  applyRemoteState,
  getSyncStatus,
  saveSyncStatus
};
