const PROFILE_KEY = "zhixing_profile";
const ASSESSMENT_KEY = "ym_personality_report";
const LEGACY_ASSESSMENT_KEY = "zhixing_assessment_result";
const ASSESSMENT_HISTORY_KEY = "zhixing_assessment_history";
const ANSWERS_KEY = "ym_personality_test_answers";
const LEGACY_ANSWERS_KEY = "zhixing_assessment_answers";
const TRAINING_KEY = "zhixing_training_state";
const SYNC_STATUS_KEY = "zhixing_sync_status";
const DOJO_KEY = "zhixing_dojo_state";
const MIND_PROFILE_KEY = "zhixing_mind_profile";
const DAILY_LOOP_KEY = "zhixing_daily_loop_state";
const HEART_CARD_KEY = "zhixing_heart_proof_cards";
const RETENTION_KEY = "zhixing_retention_state";
const REACTION_KEY = "zhixing_reaction_records";
const {
  YM_DAILY_THREE_SEALS,
  YM_OPENING_CHECK,
  YM_INTRADAY_BOUNDARY_RECORDS,
  YM_CLOSING_REVIEW,
  YM_ZHIXING_SCORE,
  YM_TRAINING_PROGRESS,
  YM_SHARE_CARDS,
  YM_INVITE_EVENTS,
  YM_LESSON_RESERVATIONS,
  YM_MOCK_USER_PROFILE,
  YM_RETEST_SNAPSHOTS,
  YM_COMPANION_MIRRORS,
  YM_GROUP_PRACTICE,
  YM_LESSON_WATCH_RECORDS,
  YM_SUBSCRIPTION_STATE,
  YM_KLINE_MIND_RECORDS,
  YM_KLINE_HISTORY_CACHE,
  YM_KLINE_SCENARIOS,
  YM_KLINE_SESSION_RECORDS,
  YM_KLINE_REVIEW_REPORTS,
  YM_KLINE_MIRROR_CHALLENGES,
  YM_ANONYMOUS_REACTION_STATS,
  YM_TRADE_REVIEW_RECORDS,
  YM_LIVING_MIRROR_STATS,
  YM_ASSISTANT_HANDOFF,
  YM_MINI_PROGRAM_BINDING,
  YM_MINI_LOOP_PROGRESS,
  YM_MINI_HEART_PROOFS,
  YM_JOURNEY_STATE,
  YM_EVIDENCE_LEDGER,
  YM_DEMO_MODE,
  YM_DEBUG_MODE,
  YM_TRAINING_PRESCRIPTION
} = require("../core/storage-keys");
const REVIEW_KEY = YM_CLOSING_REVIEW;
const MIND_KEY = YM_OPENING_CHECK;
const ZHIXING_SCORE_KEY = YM_ZHIXING_SCORE;
const TRAINING7_KEY = YM_TRAINING_PROGRESS;
const THREE_SEALS_KEY = YM_DAILY_THREE_SEALS;
const { normalizePhone, isValidPhone, maskPhone, buildUserBinding } = require("../modules/user-identity/index");
const { buildRiskSnapshot } = require("../modules/retest-change/index");
const { buildCompanionMirror } = require("../modules/companion-mirror/index");
const { buildSubscriptionPatch, buildSubscriptionView } = require("../modules/subscription/index");
const { buildLivingMirrorStats } = require("../modules/trade-review/index");
const { applyServerTradeReviewResult, withTradeReviewCrossEndStatus } = require("../modules/trade-review/index");
const {
  buildZhixingStability,
  buildTripleReflection
} = require("../modules/zhixing-stability/index");
const { buildTraining7View } = require("../modules/training7/index");
const {
  buildMiniProgramBinding,
  buildMiniLoopProgress,
  buildMiniDailyPractice,
  buildMiniHeartProof
} = require("../modules/mini-loop/index");
const {
  readEvidenceLedger,
  writeEvidenceLedger,
  recordEvidence,
  buildEvidenceSummary,
  buildEvidenceRows,
  getLatestEvidence,
  formatRiskLevel
} = require("../core/evidence-ledger");
const {
  readTodayJourney,
  saveTodayJourney,
  syncTodayJourney,
  buildCompletionState,
  buildClosureEvidenceChainView,
  buildUnifiedJourneyView,
  resolveJourneyPagePath
} = require("../core/journey-state");

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

function bindPhone(phone, extra = {}) {
  const normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) return ensureProfile();
  const nextProfile = updateProfile(Object.assign({}, extra, {
    phone: normalized,
    phoneMask: maskPhone(normalized),
    phoneBoundAt: Date.now()
  }));
  rebindLocalRecords(nextProfile);
  return nextProfile;
}

function saveInviteSource(inviteSource, extra = {}) {
  const source = String(inviteSource || "").trim().toUpperCase();
  if (!source || !/^ZX\d{4,8}$/.test(source)) return ensureProfile();
  const profile = ensureProfile();
  if (profile.inviteSource) {
    saveInviteEvent({
      direction: "inbound_repeat",
      sourceScene: extra.sourceScene || "invite_activation",
      shareCardType: extra.shareCardType || "unknown",
      sourcePage: extra.sourcePage || "",
      inviteCode: source,
      sourcePrimary: extra.sourcePrimary || extra.inviterPrimary || "",
      sourceSecondary: extra.sourceSecondary || extra.inviterSecondary || "",
      activatedAt: Date.now()
    });
    return profile;
  }
  const nextProfile = updateProfile({
    inviteSource: source,
    inviteSourceAt: Date.now(),
    inviteSourceScene: extra.sourceScene || "invite_activation",
    inviteSourceCardType: extra.shareCardType || "unknown",
    inviteSourcePrimary: extra.sourcePrimary || extra.inviterPrimary || "",
    inviteSourceSecondary: extra.sourceSecondary || extra.inviterSecondary || "",
    inviteSourceGroupCode: extra.groupCode || ""
  });
  rebindLocalRecords(nextProfile);
  saveInviteEvent({
    direction: "inbound",
    sourceScene: extra.sourceScene || "invite_activation",
    shareCardType: extra.shareCardType || "unknown",
    sourcePage: extra.sourcePage || "",
    inviteCode: source,
    sourcePrimary: extra.sourcePrimary || extra.inviterPrimary || "",
    sourceSecondary: extra.sourceSecondary || extra.inviterSecondary || "",
    groupCode: extra.groupCode || "",
    activatedAt: Date.now()
  });
  return nextProfile;
}

function getUserBinding() {
  return buildUserBinding(ensureProfile());
}

function getMiniProgramBinding() {
  return read(YM_MINI_PROGRAM_BINDING, buildMiniProgramBinding({
    userBinding: getUserBinding(),
    profile: getProfile()
  }));
}

function saveMiniBridgeLinkToken(linkToken, extra = {}) {
  const token = String(linkToken || "").trim();
  const current = getMiniProgramBinding();
  const next = buildMiniProgramBinding({
    userBinding: getUserBinding(),
    profile: Object.assign({}, getProfile(), {
      anonymousId: extra.anonymousId || current.anonymousId,
      openid: extra.openid || current.openid,
      unionid: extra.unionid || current.unionid,
      reportId: extra.reportId || current.reportId,
      linkToken: token || current.linkToken
    }),
    linkToken: token || current.linkToken,
    reportId: extra.reportId || current.reportId
  });
  write(YM_MINI_PROGRAM_BINDING, next);
  if (token || extra.reportId) {
    updateProfile({
      linkToken: token || current.linkToken,
      reportId: extra.reportId || current.reportId,
      miniBridgeLinkedAt: Date.now()
    });
  }
  return next;
}

function withUserBinding(record) {
  return Object.assign({}, record || {}, { userBinding: getUserBinding() });
}

function getDemoMode() {
  return !!read(YM_DEMO_MODE, false);
}

function setDemoMode(enabled) {
  return write(YM_DEMO_MODE, !!enabled);
}

function getDebugMode() {
  return !!read(YM_DEBUG_MODE, false);
}

function setDebugMode(enabled) {
  return write(YM_DEBUG_MODE, !!enabled);
}

function getEvidenceLedger() {
  return readEvidenceLedger();
}

function saveEvidenceLedger(ledger) {
  return writeEvidenceLedger(ledger);
}

function appendEvidence(input = {}) {
  return recordEvidence(Object.assign({
    day: todayKey(),
    personality: ((getAssessmentResult() || {}).primary) || "",
    heartThief: (((getAssessmentResult() || {}).primaryThieves || [])[0]) || ""
  }, input || {}));
}

function getEvidenceSummary(options = {}) {
  return buildEvidenceSummary(getEvidenceLedger(), Object.assign({ day: todayKey() }, options || {}));
}

function getJourneySnapshot(extra = {}) {
  const assessment = getAssessmentResult();
  const training7 = getTraining7State();
  const records = (training7 || {}).records || {};
  const completedDays = Object.keys(records).filter((day) => !!((records[day] || {}).completed)).length;
  return syncTodayJourney(Object.assign({
    day: todayKey(),
    ledger: getEvidenceLedger(),
    hasReport: !!assessment,
    mindCheckStarted: getAssessmentAnswers().length > 0,
    completedDays,
    hasRetest: !!(getRetestSnapshotState() || {}).retest
  }, extra || {}));
}

function saveJourneyCheckpoint(patch = {}) {
  return saveTodayJourney(Object.assign({}, patch || {}, { updatedAt: Date.now() }), todayKey());
}

function getTodayCompletionState(extra = {}) {
  const training7 = getTraining7State();
  const records = (training7 || {}).records || {};
  const completedDays = Object.keys(records).filter((day) => !!((records[day] || {}).completed)).length;
  const seals = getTodayThreeSeals();
  return buildCompletionState(Object.assign({
    day: todayKey(),
    ledger: getEvidenceLedger(),
    completedDays,
    thought: seals.thought || "",
    boundary: seals.boundary || ""
  }, extra || {}));
}

function getUnifiedJourneyView(extra = {}) {
  const day = todayKey();
  const ledger = getEvidenceLedger();
  const assessment = getAssessmentResult();
  const training7View = extra.training7View || buildTraining7View(getTraining7State(), {});
  const completedDays = Number(extra.completedDays !== undefined ? extra.completedDays : training7View.completedCount || 0);
  const evidenceSummary = extra.evidenceSummary || buildEvidenceSummary(ledger, { day });
  const journeyState = extra.journeyState || syncTodayJourney(Object.assign({
    day,
    ledger,
    hasReport: !!assessment,
    mindCheckStarted: getAssessmentAnswers().length > 0,
    completedDays,
    hasRetest: !!(getRetestSnapshotState() || {}).retest
  }, extra || {}));
  const seals = getTodayThreeSeals();
  const completionView = extra.completionView || buildCompletionState(Object.assign({
    day,
    ledger,
    completedDays,
    thought: seals.thought || "",
    boundary: seals.boundary || ""
  }, extra || {}));

  return buildUnifiedJourneyView(Object.assign({}, extra || {}, {
    day,
    ledger,
    evidenceSummary,
    journeyState,
    completionView,
    threeSeals: seals,
    hasReport: !!assessment || !!extra.hasReport,
    completedDays,
    hasRetest: !!(getRetestSnapshotState() || {}).retest || !!extra.hasRetest
  }));
}

function getClosureEvidenceChain(extra = {}) {
  const training7View = extra.training7View || buildTraining7View(getTraining7State(), {});
  return buildClosureEvidenceChainView(Object.assign({}, extra || {}, {
    day: todayKey(),
    ledger: getEvidenceLedger(),
    completedDays: Number(extra.completedDays !== undefined ? extra.completedDays : training7View.completedCount || 0)
  }));
}

function bindRecord(record, userBinding) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  return Object.assign({}, record, { userBinding });
}

function bindRecordMap(key, userBinding) {
  const records = read(key, {});
  if (!records || typeof records !== "object" || Array.isArray(records)) return;
  const next = {};
  Object.keys(records).forEach((recordKey) => {
    next[recordKey] = bindRecord(records[recordKey], userBinding);
  });
  write(key, next);
}

function rebindLocalRecords(profile) {
  const userBinding = buildUserBinding(profile || ensureProfile());
  const result = getAssessmentResult();
  const history = getAssessmentHistory();
  const zhixing = getZhixingScoreState();
  const heartCard = getHeartCardState();

  if (result) write(ASSESSMENT_KEY, bindRecord(result, userBinding));
  if (Array.isArray(history)) write(ASSESSMENT_HISTORY_KEY, history.map((item) => bindRecord(item, userBinding)));
  bindRecordMap(TRAINING_KEY, userBinding);
  bindRecordMap(REVIEW_KEY, userBinding);
  bindRecordMap(MIND_KEY, userBinding);
  bindRecordMap(REACTION_KEY, userBinding);
  bindRecordMap(THREE_SEALS_KEY, userBinding);
  bindRecordMap(YM_INTRADAY_BOUNDARY_RECORDS, userBinding);
  bindRecordMap(YM_KLINE_MIND_RECORDS, userBinding);
  write(ZHIXING_SCORE_KEY, Object.assign({}, zhixing, {
    latest: bindRecord(zhixing.latest, userBinding),
    records: Object.keys(zhixing.records || {}).reduce((next, key) => {
      next[key] = bindRecord(zhixing.records[key], userBinding);
      return next;
    }, {})
  }));
  write(HEART_CARD_KEY, Object.assign({}, heartCard, {
    latest: bindRecord(heartCard.latest, userBinding),
    records: Object.keys(heartCard.records || {}).reduce((next, key) => {
      next[key] = bindRecord(heartCard.records[key], userBinding);
      return next;
    }, {})
  }));
  write(TRAINING7_KEY, bindRecord(getTraining7State(), userBinding));
  write(DAILY_LOOP_KEY, bindRecord(getDailyLoopState(), userBinding));
  write(RETENTION_KEY, bindRecord(getRetentionState(), userBinding));
  write(DOJO_KEY, bindRecord(getDojoState(), userBinding));
  write(YM_MOCK_USER_PROFILE, bindRecord(getMockUserProfile(), userBinding));
  write(YM_RETEST_SNAPSHOTS, bindRecord(getRetestSnapshotState(), userBinding));
  write(YM_COMPANION_MIRRORS, bindRecord(getCompanionMirrorState(), userBinding));
  write(YM_GROUP_PRACTICE, bindRecord(getGroupPracticeState(), userBinding));
  bindRecordMap(YM_LESSON_WATCH_RECORDS, userBinding);
  write(YM_SUBSCRIPTION_STATE, bindRecord(getSubscriptionState(), userBinding));
}

function getAssessmentResult() {
  return read(ASSESSMENT_KEY, read(LEGACY_ASSESSMENT_KEY, null));
}

function getAssessmentHistory() {
  return read(ASSESSMENT_HISTORY_KEY, []);
}

function getRetestSnapshotState() {
  return read(YM_RETEST_SNAPSHOTS, {
    baseline: null,
    retest: null,
    history: [],
    updatedAt: null
  });
}

function saveRetestSnapshot(type, assessment, extra = {}) {
  const safeType = type === "retest" ? "retest" : "baseline";
  const state = getRetestSnapshotState();
  const snapshot = withUserBinding(buildRiskSnapshot({
    assessment: assessment || getAssessmentResult() || {},
    type: safeType,
    day: safeType === "retest" ? 7 : 1,
    source: extra.source || "assessment"
  }));
  const next = Object.assign({}, state, {
    [safeType]: snapshot,
    history: (state.history || []).concat(snapshot).slice(-12),
    updatedAt: Date.now()
  });
  if (safeType === "retest") {
    appendEvidence({
      type: "seven_day_retest",
      day: todayKey(),
      stage: "七日复测",
      personality: (assessment || {}).primary || "",
      heartThief: (((assessment || {}).primaryThieves || [])[0]) || "",
      action: "完成七日复测",
      reflection: (assessment || {}).summary || "复测变化已写入闭环。",
      sourcePage: extra.source || "assessment",
      sourceId: `retest_${(assessment || {}).assessmentNo || Date.now()}`
    });
  }
  return write(YM_RETEST_SNAPSHOTS, next);
}

function saveAssessmentResult(result, answers) {
  const userBinding = getUserBinding();
  const history = getAssessmentHistory();
  const assessmentNo = history.length + 1;
  const nextResult = Object.assign({}, result, { assessmentNo, userBinding });
  const historyRecord = Object.assign({}, nextResult, {
    savedAt: Date.now()
  });
  write(ASSESSMENT_KEY, nextResult);
  write(ASSESSMENT_HISTORY_KEY, history.concat(historyRecord).slice(-12));
  write(ANSWERS_KEY, answers);
  appendEvidence({
    type: "mind_report",
    day: todayKey(),
    stage: "入照心",
    personality: result.primary || "",
    heartThief: ((result.primaryThieves || [])[0]) || "",
    action: "生成心镜报告",
    reflection: result.summary || result.oneLine || "心镜报告已成为今日修行的起点。",
    sourcePage: "assessment",
    sourceId: result.reportId || `assessment_${assessmentNo}`
  });
  updateProfile({
    stage: "照见",
    lastAssessmentType: result.primary,
    lastAssessmentAt: Date.now(),
    assessmentCount: Number((getProfile() || {}).assessmentCount || 0) + 1
  });
  if (assessmentNo === 1 || !getRetestSnapshotState().baseline) {
    saveRetestSnapshot("baseline", historyRecord, { source: "day1_assessment" });
  }
  if (assessmentNo >= 2) {
    saveRetestSnapshot("retest", historyRecord, { source: "day7_retest_assessment" });
    saveInviteConversionEvent("retest_completed", { assessmentNo });
    saveAssistantHandoffEvent({
      type: "retest_completed",
      label: "复测已完成",
      detail: `${result.primary || "待照见"} · 第 ${assessmentNo} 次照见`,
      sourcePage: "assessment"
    });
  } else {
    saveInviteConversionEvent("assessment_completed", { assessmentNo });
    saveAssistantHandoffEvent({
      type: "assessment_completed",
      label: "首次测评已完成",
      detail: `${result.primary || "待照见"} · ${result.secondary || "副人格待照见"}`,
      sourcePage: "assessment"
    });
  }
  saveCompanionMirrorFromAssessment(historyRecord);
  return nextResult;
}

function getAssessmentAnswers(modeKey = "") {
  const saved = read(ANSWERS_KEY, read(LEGACY_ANSWERS_KEY, []));
  if (Array.isArray(saved)) return saved;
  if (modeKey && Array.isArray(saved[modeKey])) return saved[modeKey];
  if (Array.isArray(saved.answers)) return saved.answers;
  return [];
}

function saveAssessmentAnswers(answers, modeKey = "") {
  if (!modeKey) return write(ANSWERS_KEY, Array.isArray(answers) ? answers : []);
  const saved = read(ANSWERS_KEY, {});
  const drafts = Array.isArray(saved) ? {} : Object.assign({}, saved || {});
  drafts[modeKey] = Array.isArray(answers) ? answers : [];
  drafts.activeMode = modeKey;
  return write(ANSWERS_KEY, drafts);
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
  state[todayKey()] = withUserBinding(Object.assign({}, dayState, { updatedAt: Date.now() }));
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
  records[todayKey()] = withUserBinding(Object.assign({}, record, { date: todayKey(), updatedAt: Date.now() }));
  write(MIND_KEY, records);
  return records[todayKey()];
}

function getOpeningCheckRecords() {
  return getMindRecords();
}

function getTodayOpeningCheck() {
  return getTodayMind();
}

function saveTodayOpeningCheck(record) {
  return saveTodayMind(Object.assign({}, record || {}, { source: "opening_check" }));
}

function getTodayReview() {
  return getReviews()[todayKey()] || null;
}

function saveTodayReview(review) {
  const reviews = getReviews();
  reviews[todayKey()] = withUserBinding(Object.assign({}, review, { date: todayKey(), updatedAt: Date.now() }));
  write(REVIEW_KEY, reviews);
  return reviews[todayKey()];
}

function getClosingReviewRecords() {
  return getReviews();
}

function getTodayClosingReview() {
  return getTodayReview();
}

function saveTodayClosingReview(review) {
  return saveTodayReview(Object.assign({}, review || {}, { source: "closing_review" }));
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
  const boundRecord = withUserBinding(nextRecord);
  const records = Object.assign({}, state.records || {}, { [dayKey]: boundRecord });
  const next = {
    latest: boundRecord,
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
  const nextRecord = withUserBinding(Object.assign({}, record || {}, {
    dayKey,
    completed: true,
    updatedAt: Date.now()
  }));
  const next = {
    latest: nextRecord,
    records: Object.assign({}, state.records || {}, { [dayKey]: nextRecord }),
    updatedAt: Date.now()
  };
  appendEvidence({
    type: "heart_proof_card",
    day: dayKey,
    stage: nextRecord.stageName || "今日心证",
    action: "生成今日心证卡",
    reflection: nextRecord.heartProof || nextRecord.reflectionQuestion || "今日心证已生成。",
    zhixingChange: Number(nextRecord.zhixingChange || 3),
    sourcePage: nextRecord.source || "home",
    sourceId: dayKey,
    archived: true
  });
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

function getReactionRecords() {
  return read(REACTION_KEY, {});
}

function getTodayReaction() {
  return getReactionRecords()[todayKey()] || null;
}

function saveTodayReaction(record) {
  const records = getReactionRecords();
  records[todayKey()] = withUserBinding(Object.assign({}, record || {}, { date: todayKey(), updatedAt: Date.now() }));
  write(REACTION_KEY, records);
  appendEvidence({
    type: "review_record",
    day: todayKey(),
    stage: "交易反应记录",
    heartThief: (record || {}).tag || "",
    action: (record || {}).tag || "记录一次交易反应",
    reflection: (record || {}).note || (record || {}).heartProof || "今日交易反应已记录。",
    sourcePage: (record || {}).source || "home_reaction_checkin",
    sourceId: "today_reaction"
  });
  return records[todayKey()];
}

function getIntradayBoundaryRecords() {
  return read(YM_INTRADAY_BOUNDARY_RECORDS, {});
}

function getTodayIntradayBoundaryRecord() {
  return getIntradayBoundaryRecords()[todayKey()] || {
    date: todayKey(),
    trigger: "",
    firstReaction: "",
    boundary: "",
    action: "",
    note: "",
    completed: false,
    updatedAt: null
  };
}

function saveTodayIntradayBoundaryRecord(record) {
  const records = getIntradayBoundaryRecords();
  const current = getTodayIntradayBoundaryRecord();
  const nextRecord = withUserBinding(Object.assign({}, current, record || {}, {
    date: todayKey(),
    completed: !!((record || {}).firstReaction || current.firstReaction) &&
      !!((record || {}).boundary || current.boundary),
    updatedAt: Date.now()
  }));
  records[todayKey()] = nextRecord;
  write(YM_INTRADAY_BOUNDARY_RECORDS, records);
  return nextRecord;
}

function getKlineMindRecords() {
  return read(YM_KLINE_MIND_RECORDS, {});
}

function getKlineHistoryCache() {
  return read(YM_KLINE_HISTORY_CACHE, {
    cn_equity: {},
    hk_equity: {},
    us_equity: {},
    futures: {},
    crypto: {},
    updatedAt: null
  });
}

function saveKlineHistorySlice(marketKey, timeframeKey, slice) {
  const market = String(marketKey || "cn_equity");
  const timeframe = String(timeframeKey || "1d");
  const cache = getKlineHistoryCache();
  const marketCache = Object.assign({}, cache[market] || {});
  marketCache[timeframe] = Object.assign({}, slice || {}, {
    marketKey: market,
    timeframeKey: timeframe,
    source: (slice || {}).source || "historical_api",
    updatedAt: Date.now()
  });
  const next = Object.assign({}, cache, {
    [market]: marketCache,
    updatedAt: Date.now()
  });
  return write(YM_KLINE_HISTORY_CACHE, next);
}

function getTodayKlineMindRecord() {
  return getKlineMindRecords()[todayKey()] || {
    date: todayKey(),
    day: 1,
    scenarioId: "",
    scenarioTitle: "",
    marketKey: "cn_equity",
    marketName: "A股",
    timeframeKey: "1d",
    dataSource: "",
    symbol: "",
    personalityType: "",
    stageKey: "",
    stageName: "",
    selectedCandleKey: "",
    firstReaction: "",
    bodySignal: "",
    boundaryChoice: "",
    insightLine: "",
    score: 0,
    completed: false,
    updatedAt: null
  };
}

function saveTodayKlineMindRecord(record) {
  const records = getKlineMindRecords();
  const current = getTodayKlineMindRecord();
  const nextRecord = withUserBinding(Object.assign({}, current, record || {}, {
    date: todayKey(),
    completed: !!((record || {}).completed),
    updatedAt: Date.now()
  }));
  records[todayKey()] = nextRecord;
  write(YM_KLINE_MIND_RECORDS, records);
  return nextRecord;
}

function getKlineScenarioState() {
  return read(YM_KLINE_SCENARIOS, {
    updatedAt: null,
    source: "local_cache",
    scenarios: []
  });
}

function saveKlineScenarioState(scenarios) {
  return write(YM_KLINE_SCENARIOS, {
    updatedAt: Date.now(),
    source: "local_cache",
    scenarios: Array.isArray(scenarios) ? scenarios : []
  });
}

function getKlineSessionRecords() {
  return read(YM_KLINE_SESSION_RECORDS, {
    latest: null,
    records: []
  });
}

function saveKlineSessionRecord(session) {
  const state = getKlineSessionRecords();
  const record = withUserBinding(Object.assign({}, session || {}, {
    updatedAt: Date.now()
  }));
  const records = (state.records || []).filter((item) => item.id !== record.id).concat(record).slice(-30);
  return write(YM_KLINE_SESSION_RECORDS, {
    latest: record,
    records
  });
}

function getKlineReviewReports() {
  return read(YM_KLINE_REVIEW_REPORTS, {
    latest: null,
    records: []
  });
}

function saveKlineReviewReport(report) {
  const state = getKlineReviewReports();
  const record = withUserBinding(Object.assign({}, report || {}, {
    updatedAt: Date.now()
  }));
  const records = (state.records || []).filter((item) => item.id !== record.id).concat(record).slice(-30);
  write(YM_ANONYMOUS_REACTION_STATS, record.anonymousStats || {});
  return write(YM_KLINE_REVIEW_REPORTS, {
    latest: record,
    records
  });
}

function getKlineMirrorChallenges() {
  return read(YM_KLINE_MIRROR_CHALLENGES, {
    latest: null,
    records: []
  });
}

function saveKlineMirrorChallenge(challenge) {
  const state = getKlineMirrorChallenges();
  const record = withUserBinding(Object.assign({}, challenge || {}, {
    updatedAt: Date.now()
  }));
  const records = (state.records || []).filter((item) => item.id !== record.id).concat(record).slice(-30);
  return write(YM_KLINE_MIRROR_CHALLENGES, {
    latest: record,
    records
  });
}

function getAnonymousReactionStats() {
  return read(YM_ANONYMOUS_REACTION_STATS, {});
}

function getTradeReviewRecords() {
  return read(YM_TRADE_REVIEW_RECORDS, {
    latest: null,
    records: []
  });
}

function buildLivingMirrorStatsEntity(tradeReviewState) {
  const safeTradeReviewState = tradeReviewState || getTradeReviewRecords();
  const training7State = getTraining7State();
  const training7View = buildTraining7View(training7State, {});
  const context = {
    assessment: getAssessmentResult() || {},
    tradeReviewState: safeTradeReviewState,
    klineReviewReports: getKlineReviewReports(),
    klineMindRecords: getKlineMindRecords(),
    training7State,
    training7View
  };
  const stats = buildLivingMirrorStats(safeTradeReviewState);
  return Object.assign({}, stats, {
    zhixingStability: buildZhixingStability(context),
    tripleReflection: buildTripleReflection(context)
  });
}

function normalizeLivingMirrorStats(stats, tradeReviewState) {
  const generated = buildLivingMirrorStatsEntity(tradeReviewState || getTradeReviewRecords());
  const current = stats && typeof stats === "object" ? stats : {};
  const serverProfile = current.serverLivingMirrorProfile || current.livingMirrorProfile || null;
  const serverTriple = normalizeServerTripleReflection(serverProfile, current.tripleReflection || generated.tripleReflection);
  return Object.assign({}, generated, current, {
    zhixingStability: current.zhixingStability || generated.zhixingStability,
    tripleReflection: serverTriple,
    serverLivingMirrorProfile: serverProfile,
    livingMirrorProfile: serverProfile,
    latestMarketContext: current.latestMarketContext || (serverProfile || {}).latestMarketContext || null
  });
}

function getLivingMirrorStats() {
  return normalizeLivingMirrorStats(read(YM_LIVING_MIRROR_STATS, null), getTradeReviewRecords());
}

function getAssistantHandoff() {
  const stats = getLivingMirrorStats();
  return buildAssistantHandoffEntity(read(YM_ASSISTANT_HANDOFF, (stats || {}).assistantHandoff || {}), stats);
}

function saveLivingMirrorStatsFromReviews(tradeReviewState) {
  const previous = read(YM_LIVING_MIRROR_STATS, {});
  const serverProfile = (previous || {}).serverLivingMirrorProfile || (previous || {}).livingMirrorProfile || null;
  const stats = write(YM_LIVING_MIRROR_STATS, mergeServerLivingMirrorProfile(
    buildLivingMirrorStatsEntity(tradeReviewState || getTradeReviewRecords()),
    serverProfile,
    (previous || {}).latestMarketContext || null
  ));
  const current = read(YM_ASSISTANT_HANDOFF, {});
  const base = Object.assign({}, current, (stats || {}).assistantHandoff || {}, {
    events: current.events || []
  });
  write(YM_ASSISTANT_HANDOFF, buildAssistantHandoffEntity(base, stats));
  return stats;
}

function normalizeServerTripleReflection(profile, fallback = {}) {
  const triple = profile && (profile.tripleReflection || profile.triple_reflection);
  if (!triple || typeof triple !== "object") return fallback || {};
  return Object.assign({}, fallback || {}, triple, {
    rows: (triple.rows || triple.sources || []).map((row) => ({
      key: row.key || "",
      name: row.name === "真实复盘" ? "真实记录" : (row.name || ""),
      mirror: row.mirror || "待照见",
      statusText: row.statusText || row.status_text || ""
    })),
    updatedAt: triple.updatedAt || triple.updated_at || Date.now()
  });
}

function mergeServerLivingMirrorProfile(stats = {}, profile = null, marketContext = null) {
  if (!profile || typeof profile !== "object") return stats;
  const triple = normalizeServerTripleReflection(profile, stats.tripleReflection);
  return Object.assign({}, stats, {
    currentMirror: profile.currentMainMirror || profile.current_main_mirror || stats.currentMirror,
    mainTraining: profile.trainingFocus || profile.training_focus || stats.mainTraining,
    tripleReflection: triple,
    serverLivingMirrorProfile: profile,
    livingMirrorProfile: profile,
    latestMarketContext: profile.latestMarketContext || profile.latest_market_context || marketContext || stats.latestMarketContext || null
  });
}

function applyTradeReviewBindingResult(reviewId, result = {}) {
  const state = getTradeReviewRecords();
  const serverReview = result.review || result.trade_review || {};
  const profile = result.living_mirror_profile || result.livingMirrorProfile || null;
  const targetId = String(reviewId || serverReview.id || serverReview.reviewId || serverReview.review_id || "");
  if (!targetId && !profile) return { tradeReviewState: state, stats: getLivingMirrorStats(), latest: state.latest || null };

  let found = false;
  const records = (state.records || []).map((record) => {
    if (String(record.id || "") !== targetId) return record;
    found = true;
    return applyServerTradeReviewResult(record, result);
  });
  const latest = state.latest && String(state.latest.id || "") === targetId
    ? applyServerTradeReviewResult(state.latest, result)
    : (found ? records.find((record) => String(record.id || "") === targetId) || state.latest : state.latest);
  const nextState = write(YM_TRADE_REVIEW_RECORDS, {
    latest,
    records: found ? records : (state.records || [])
  });
  const marketContext = (serverReview.marketContext || serverReview.market_context || (profile || {}).latestMarketContext || null);
  const stats = write(YM_LIVING_MIRROR_STATS, mergeServerLivingMirrorProfile(
    buildLivingMirrorStatsEntity(nextState),
    profile,
    marketContext
  ));
  return {
    tradeReviewState: nextState,
    stats,
    latest,
    profile,
    marketContext
  };
}

function getTrainingPrescription() {
  return read(YM_TRAINING_PRESCRIPTION, null);
}

function normalizeTrainingPrescriptionDispatch(prescription = {}) {
  if (!prescription || typeof prescription !== "object") return null;
  const day = Math.max(1, Math.min(7, Number(prescription.day || 1)));
  return withUserBinding(Object.assign({}, prescription, {
    schemaVersion: prescription.schemaVersion || prescription.schema_version || "training_prescription_v1",
    id: String(prescription.id || `mp-training-prescription-${Date.now()}`),
    day,
    status: prescription.status || "received",
    mirror: prescription.mirror || "待照见",
    title: prescription.title || "今日训练处方",
    reason: prescription.reason || "根据活镜画像生成今日训练。",
    action: prescription.action || "先照见第一念，再完成一次真实复盘。",
    reflectionPrompt: prescription.reflectionPrompt || prescription.reflection_prompt || "今天最值得记录的一念是什么？",
    klinePractice: prescription.klinePractice || prescription.kline_practice || null,
    steps: Array.isArray(prescription.steps) ? prescription.steps : [],
    receivedAt: prescription.receivedAt || prescription.received_at || Date.now(),
    updatedAt: Date.now(),
    complianceNotice: prescription.complianceNotice || "本处方仅用于交易心理训练与复盘管理，不构成投资建议。"
  }));
}

function saveTrainingPrescription(prescription = {}) {
  const normalized = normalizeTrainingPrescriptionDispatch(prescription);
  if (!normalized) return getTrainingPrescription();
  write(YM_TRAINING_PRESCRIPTION, normalized);
  saveMindProfile({
    current_stage: "事上练",
    current_stage_key: "shishanglian",
    personality_type: normalized.mirror,
    today_training: normalized.action,
    today_commandment: normalized.title
  });
  const state = getTraining7State();
  const records = Object.assign({}, state.records || {});
  const day = normalized.day;
  records[day] = withUserBinding(Object.assign({}, records[day] || {}, {
    day,
    dateKey: todayKey(),
    title: normalized.title,
    note: normalized.action,
    serverPrescription: normalized,
    updatedAt: Date.now()
  }));
  saveTraining7State({
    currentDay: Math.max(1, Math.min(7, day)),
    serverPrescription: normalized,
    records
  });
  return normalized;
}

function applyTrainingPrescriptionDispatch(payload = {}) {
  const prescription = payload.training_prescription || payload.trainingPrescription || payload;
  return saveTrainingPrescription(prescription);
}

function getTrainingRecordEntity() {
  return {
    training7: getTraining7State(),
    serverPrescription: getTrainingPrescription(),
    dailyTraining: getTrainingState(),
    threeSeals: getThreeSealsRecords(),
    openingChecks: getOpeningCheckRecords(),
    intradayBoundaries: getIntradayBoundaryRecords(),
    klineMindRecords: getKlineMindRecords(),
    closingReviews: getClosingReviewRecords()
  };
}

function getMiniHeartProofState() {
  return read(YM_MINI_HEART_PROOFS, {
    latest: null,
    records: {},
    updatedAt: null
  });
}

function saveMiniHeartProof(proof) {
  const state = getMiniHeartProofState();
  const record = withUserBinding(Object.assign({}, proof || {}, {
    heartProofId: (proof || {}).heartProofId || `hp-${Date.now()}`,
    updatedAt: Date.now()
  }));
  const next = {
    latest: record,
    records: Object.assign({}, state.records || {}, { [record.heartProofId]: record }),
    updatedAt: Date.now()
  };
  appendEvidence({
    type: "heart_proof_card",
    day: todayKey(),
    stage: record.sourceType === "trade_review" ? "复盘心证" : "今日心证",
    action: record.nextActionText || "生成今日心证",
    reflection: record.proofText || record.reflectionText || "今日心证已生成。",
    zhixingChange: Number(record.zhixingChange || 3),
    sourcePage: record.sourceType || "daily_practice",
    sourceId: record.heartProofId,
    archived: true
  });
  return write(YM_MINI_HEART_PROOFS, next);
}

function getMiniDailyPractice() {
  const binding = getMiniProgramBinding();
  const training7View = buildTraining7View(getTraining7State(), {});
  return buildMiniDailyPractice({
    todayKey: todayKey(),
    binding,
    assessment: getAssessmentResult(),
    training7View,
    threeSeals: getTodayThreeSeals()
  });
}

function getMiniLoopProgress() {
  const binding = getMiniProgramBinding();
  const training7View = buildTraining7View(getTraining7State(), {});
  const progress = buildMiniLoopProgress({
    binding,
    assessment: getAssessmentResult(),
    training7View,
    threeSeals: getTodayThreeSeals(),
    tradeReviewState: getTradeReviewRecords(),
    livingMirrorStats: getLivingMirrorStats(),
    assistantHandoff: getAssistantHandoff(),
    shareCardState: getShareCardState(),
    heartProofState: getMiniHeartProofState(),
    inviteEvents: getInviteEvents(),
    retestSnapshots: getRetestSnapshotState()
  });
  return write(YM_MINI_LOOP_PROGRESS, progress);
}

function createMiniHeartProofFromDaily(extra = {}) {
  const practice = getMiniDailyPractice();
  const day = todayKey();
  const proof = buildMiniHeartProof(Object.assign({}, extra || {}, {
    heartProofId: extra.heartProofId || `hp-daily-${day}`,
    sourceType: "daily_practice",
    sourceId: practice.dailyGrowthId || `daily-${day}`,
    binding: getMiniProgramBinding(),
    thoughtType: practice.thoughtType,
    reflectionText: practice.reflectionText,
    proofText: extra.proofText || `我今天照见的是：${practice.reflectionText || "这一念"}。`,
    nextActionText: extra.nextActionText || "下一次同场景，先停十秒，再写下第一念。"
  }));
  return saveMiniHeartProof(proof);
}

function buildAssistantHandoffEntity(base = {}, stats = getLivingMirrorStats()) {
  const assessment = getAssessmentResult();
  const tradeReview = getTradeReviewRecords();
  const training7 = getTraining7State();
  const profile = getProfile();
  const userBinding = getUserBinding();
  const userId = buildSharedUserId(userBinding);
  const userIdDisplay = userBinding.userIdDisplay || userId;
  const completedTrainingDays = countCompletedTrainingDays(training7);
  const currentMirror = base.currentMirror || (stats || {}).currentMirror || "待照见";
  const secondaryMirror = base.secondaryMirror || (assessment || {}).secondaryMirror || (assessment || {}).secondary || "待沉淀";
  const latestReview = (tradeReview || {}).latest || (((tradeReview || {}).records || []).slice(-1)[0]) || {};
  const highFrequencyThieves = base.highFrequencyThieves || (stats || {}).topThievesText || "待照见";
  const recentThought = base.recentThought || latestReview.firstThought || "待记录";
  const suggestedTrainingAction = base.suggestedTrainingAction || (stats || {}).mainTraining || "先完成一次真实复盘。";
  const riskTags = base.riskTags || [currentMirror, highFrequencyThieves].filter((item) => item && item !== "待照见").join(" · ") || "待沉淀";
  const riskElevated = !!(currentMirror && currentMirror !== "待照见" && currentMirror !== "良知之镜" && Number((stats || {}).totalReviews || 0) >= 2);
  const triggers = [
    { key: "assessment", label: "首次测评", done: !!assessment },
    { key: "tradeReview", label: "一次真实复盘", done: ((tradeReview || {}).records || []).length > 0 },
    { key: "streak3", label: "连续 3 天训练", done: completedTrainingDays >= 3 || Number(profile.streak || 0) >= 3 },
    { key: "riskElevated", label: "活镜风险升高", done: riskElevated }
  ];
  const readyCount = triggers.filter((item) => item.done).length;
  const eventTimeline = buildAssistantEventTimeline({ base, triggers, assessment, tradeReview, training7, stats });
  const statusText = readyCount >= 2 ? "可承接" : `${readyCount}/4 待沉淀`;
  const campSuggestion = base.campSuggestion || (completedTrainingDays >= 3 ? "可以进入 7 天连续观心训练。" : "先完成三天训练与三次真实复盘。");
  const scriptSuggestion = base.scriptSuggestion || (
    currentMirror === "待照见"
      ? "先完成一次真实复盘。助教只接住第一念，不急着给方法。"
      : `你最近明显是${currentMirror}偏强，背后常见念头是：${recentThought}。今天先不谈外在波动，只练一件事：${suggestedTrainingAction}`
  );
  const summaryRows = [
    { label: "统一档案", value: userIdDisplay || "待生成" },
    { label: "手机号", value: userBinding.phoneMask || "未绑定" },
    { label: "主人格", value: (assessment || {}).primary || "待照见" },
    { label: "副人格", value: (assessment || {}).secondary || "待照见" },
    { label: "活镜主镜", value: currentMirror },
    { label: "高频心贼", value: highFrequencyThieves },
    { label: "最近念头", value: recentThought },
    { label: "主修训练", value: suggestedTrainingAction }
  ];
  const handoffSummary = [
    `${userBinding.phoneMask || "未绑定"} · ${(assessment || {}).primary || "待照见"} / ${(assessment || {}).secondary || "待照见"}`,
    `活镜：${currentMirror} · 心贼：${highFrequencyThieves}`,
    `最近念头：${recentThought}`,
    `今日承接：${suggestedTrainingAction}`
  ].join("\n");
  const coachCopyText = [
    "阳明心学交易系统 · 助教承接摘要",
    `统一档案：${userIdDisplay || "待生成"}`,
    `手机号：${userBinding.phoneMask || "未绑定"}`,
    `主人格：${(assessment || {}).primary || "待照见"}`,
    `副人格：${(assessment || {}).secondary || "待照见"}`,
    `当前主镜：${currentMirror}`,
    `高频心贼：${highFrequencyThieves}`,
    `最近复盘念头：${recentThought}`,
    `风险标签：${riskTags}`,
    `建议训练动作：${suggestedTrainingAction}`,
    `训练营建议：${campSuggestion}`,
    `话术建议：${scriptSuggestion}`,
    `承接状态：${statusText}`
  ].join("\n");
  return Object.assign({}, base, {
    phoneMask: userBinding.phoneMask || "",
    phoneBound: !!userBinding.phoneBound,
    userId,
    userIdDisplay,
    currentMirror,
    secondaryMirror,
    highFrequencyThieves,
    recentThought,
    riskTags,
    suggestedTrainingAction,
    campSuggestion,
    scriptSuggestion,
    summaryRows,
    handoffSummary,
    coachCopyText,
    sharePrompt: base.sharePrompt || "先分享被照见的一念，不炫耀分数，只邀请同修照见自己。",
    triggers,
    eventTimeline,
    events: eventTimeline,
    lastEventText: (eventTimeline[0] || {}).label || "待沉淀事件",
    readyCount,
    ready: readyCount >= 2,
    statusText
  });
}

function buildAssistantEventTimeline({ base = {}, triggers = [], assessment = null, tradeReview = {}, training7 = {}, stats = {} } = {}) {
  const savedEvents = Array.isArray(base.events) ? base.events : [];
  const records = (tradeReview || {}).records || [];
  const latestReview = (tradeReview || {}).latest || records[records.length - 1] || {};
  const trainingRecords = (training7 || {}).records || {};
  const derived = [];
  if (triggers.find((item) => item.key === "assessment" && item.done)) {
    derived.push({
      id: "derived-assessment",
      type: "assessment_completed",
      label: "首次测评",
      detail: `${(assessment || {}).primary || "待照见"} · ${(assessment || {}).secondary || "副人格待照见"}`,
      sourcePage: "assessment",
      createdAt: ((assessment || {}).savedAt || (assessment || {}).updatedAt || Date.now()) - 4000
    });
  }
  if (triggers.find((item) => item.key === "tradeReview" && item.done)) {
    derived.push({
      id: "derived-trade-review",
      type: "trade_review_created",
      label: "真实复盘已写入活镜",
      detail: `${latestReview.relatedMirror || "待照见"} · ${latestReview.firstThought || "第一念待记录"}`,
      sourcePage: latestReview.sourceType === "kline_training" ? "kline_session" : "trade_review",
      createdAt: latestReview.createdAt || latestReview.updatedAt || Date.now() - 3000
    });
  }
  if (triggers.find((item) => item.key === "streak3" && item.done)) {
    derived.push({
      id: "derived-streak3",
      type: "streak_3_days",
      label: "连续三天训练达成",
      detail: "训练记录已足够生成助教承接话术。",
      sourcePage: "training7",
      createdAt: Math.max.apply(null, Object.keys(trainingRecords).map((day) => Number((trainingRecords[day] || {}).updatedAt || 0)).concat([Date.now() - 2000]))
    });
  }
  if (triggers.find((item) => item.key === "riskElevated" && item.done)) {
    derived.push({
      id: "derived-risk-elevated",
      type: "risk_elevated",
      label: "活镜风险升高",
      detail: `${(stats || {}).currentMirror || "待照见"} · ${(stats || {}).topThievesText || "待照见"}`,
      sourcePage: "living_mirror",
      createdAt: (stats || {}).updatedAt || Date.now() - 1000
    });
  }
  const byId = {};
  return savedEvents.concat(derived)
    .filter(Boolean)
    .map((event) => withUserBinding(Object.assign({
      id: `event-${Date.now()}`,
      type: "assistant_event",
      label: "承接事件",
      detail: "",
      sourcePage: "miniprogram",
      createdAt: Date.now()
    }, event)))
    .filter((event) => {
      const key = event.id || `${event.type}-${event.sourcePage}-${event.createdAt}`;
      if (byId[key]) return false;
      byId[key] = true;
      return true;
    })
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 12);
}

function saveAssistantHandoffEvent(event) {
  const current = read(YM_ASSISTANT_HANDOFF, {});
  const nextEvent = withUserBinding(Object.assign({
    id: `handoff-${Date.now()}`,
    type: "assistant_event",
    label: "承接事件",
    detail: "",
    sourcePage: "miniprogram",
    createdAt: Date.now()
  }, event || {}));
  const events = (current.events || []).filter((item) => item.id !== nextEvent.id).concat(nextEvent).slice(-40);
  const next = Object.assign({}, current, {
    events,
    updatedAt: Date.now()
  });
  write(YM_ASSISTANT_HANDOFF, next);
  return buildAssistantHandoffEntity(next, getLivingMirrorStats());
}

function buildSharedUserId(userBinding = getUserBinding()) {
  if (userBinding.userId) return userBinding.userId;
  if (userBinding.phone) return `phone_${userBinding.phone}`;
  return `invite_${userBinding.inviteCode || "pending"}`;
}

function countCompletedTrainingDays(training7 = {}) {
  const records = training7.records || {};
  return Object.keys(records).filter((day) => {
    const record = records[day] || {};
    const tasks = record.tasks || {};
    return !!record.completed ||
      ["reaction", "kline", "checkin"].every((key) => !!tasks[key]) ||
      ["opening_check", "reaction_record", "daily_practice", "closing_review"].every((key) => !!tasks[key]);
  }).length;
}

function applyTrainingRecordEntity(entity = {}) {
  if (entity.training7 && typeof entity.training7 === "object") write(TRAINING7_KEY, entity.training7);
  if (entity.serverPrescription && typeof entity.serverPrescription === "object") applyTrainingPrescriptionDispatch(entity.serverPrescription);
  if (entity.dailyTraining && typeof entity.dailyTraining === "object") write(TRAINING_KEY, entity.dailyTraining);
  if (entity.threeSeals && typeof entity.threeSeals === "object") write(THREE_SEALS_KEY, entity.threeSeals);
  if (entity.openingChecks && typeof entity.openingChecks === "object") write(MIND_KEY, entity.openingChecks);
  if (entity.intradayBoundaries && typeof entity.intradayBoundaries === "object") write(YM_INTRADAY_BOUNDARY_RECORDS, entity.intradayBoundaries);
  if (entity.klineMindRecords && typeof entity.klineMindRecords === "object") write(YM_KLINE_MIND_RECORDS, entity.klineMindRecords);
  if (entity.closingReviews && typeof entity.closingReviews === "object") write(REVIEW_KEY, entity.closingReviews);
}

function saveTradeReviewRecord(record) {
  const state = getTradeReviewRecords();
  const nextRecord = withUserBinding(Object.assign({}, record || {}, {
    updatedAt: Date.now()
  }));
  const records = (state.records || []).filter((item) => item.id !== nextRecord.id).concat(nextRecord).slice(-60);
  const nextState = write(YM_TRADE_REVIEW_RECORDS, {
    latest: nextRecord,
    records
  });
  appendEvidence({
    type: "review_record",
    day: nextRecord.tradeDate || todayKey(),
    stage: ((nextRecord.historicalMatch || {}).stagePosition) || nextRecord.stageGate || "真实交易复盘",
    personality: nextRecord.relatedMirror || "",
    heartThief: (nextRecord.heartThieves || [])[0] || "",
    action: nextRecord.actionLabel || nextRecord.trainingAction || "写入真实复盘",
    reflection: nextRecord.firstThought || nextRecord.verdict || nextRecord.reviewText || "这次复盘已进入行为印记。",
    sourcePage: nextRecord.sourceType === "kline_training" ? "kline_session" : "trade_review",
    sourceId: nextRecord.id
  });
  saveLivingMirrorStatsFromReviews(nextState);
  saveAssistantHandoffEvent({
    type: nextRecord.sourceType === "kline_training" ? "kline_training_written" : "trade_review_created",
    label: nextRecord.sourceType === "kline_training" ? "K线训练写入活镜" : "真实复盘写入活镜",
    detail: `${nextRecord.relatedMirror || "待照见"} · ${nextRecord.firstThought || "第一念待记录"}`,
    sourcePage: nextRecord.sourceType === "kline_training" ? "kline_session" : "trade_review",
    relatedMirror: nextRecord.relatedMirror || "",
    highFrequencyThieves: (nextRecord.heartThieves || []).join("、"),
    reviewId: nextRecord.id
  });
  saveMiniHeartProof(buildMiniHeartProof({
    sourceType: "trade_review",
    sourceId: nextRecord.id,
    binding: getMiniProgramBinding(),
    reflectionText: nextRecord.firstThought || nextRecord.afterReaction || "",
    proofText: nextRecord.verdict || nextRecord.oneLine || "这一次复盘照见了下单前的一念。",
    nextActionText: nextRecord.nextAction || nextRecord.trainingAction || "下一次同场景，先停十秒，再写下第一念。",
    affectedDimensions: ["awareness", "boundary", "execution", "review"]
  }));
  return nextState;
}

function getTraining7State() {
  return read(TRAINING7_KEY, {
    currentDay: 1,
    records: {},
    startedAt: null,
    updatedAt: null
  });
}

function saveTraining7State(patch) {
  const state = getTraining7State();
  const next = Object.assign({}, state, patch || {}, {
    userBinding: getUserBinding(),
    startedAt: state.startedAt || Date.now(),
    updatedAt: Date.now()
  });
  next.records = Object.assign({}, state.records || {}, (patch || {}).records || {});
  return write(TRAINING7_KEY, next);
}

function saveTraining7Task(day, taskKey, done = true) {
  const safeDay = Math.max(1, Math.min(7, Number(day || getTraining7State().currentDay || 1)));
  const state = getTraining7State();
  const records = Object.assign({}, state.records || {});
  const record = Object.assign({ tasks: {} }, records[safeDay] || {});
  const tasks = Object.assign({}, record.tasks || {}, { [taskKey]: !!done });
  const completed = ["opening_check", "intraday_boundary", "reaction_record", "daily_practice", "closing_review"].every((key) => !!tasks[key]) ||
    ["reaction", "kline", "checkin"].every((key) => !!tasks[key]);
  records[safeDay] = withUserBinding(Object.assign({}, record, {
    day: safeDay,
    dateKey: todayKey(),
    tasks,
    completed,
    updatedAt: Date.now()
  }));
  if (done && taskKey === "checkin") {
    appendEvidence({
      type: "daily_checkin",
      day: todayKey(),
      stage: `Day ${safeDay}`,
      action: "完成今日签到",
      reflection: "今日修行已开启。",
      sourcePage: "home",
      sourceId: "daily_checkin"
    });
  }
  const nextDay = completed && safeDay < 7 ? safeDay + 1 : safeDay;
  if (completed) {
    markLatestTradeReviewTrainingCompleted(safeDay);
    saveGroupPracticeCheckin(safeDay, { completed: true, completedAt: Date.now() });
    saveAssistantHandoffEvent({
      type: "training_day_completed",
      label: `Day ${safeDay} 训练完成`,
      detail: safeDay >= 7 ? "七日训练已完成，可进入复测与助教承接。" : "今日训练动作已进入连续记录。",
      sourcePage: "training7",
      trainingDay: safeDay
    });
    if (safeDay === 1) saveInviteConversionEvent("day1_completed", { sourcePage: "training7", trainingDay: safeDay });
    if (safeDay === 3) saveInviteConversionEvent("day3_completed", { sourcePage: "training7", trainingDay: safeDay });
    if (safeDay === 7) saveInviteConversionEvent("day7_completed", { sourcePage: "training7", trainingDay: safeDay });
  }
  return saveTraining7State({ currentDay: nextDay, records });
}

function markLatestTradeReviewTrainingCompleted(day) {
  const state = getTradeReviewRecords();
  const records = (state.records || []).slice();
  if (!records.length) return state;
  const latest = records
    .slice()
    .sort((a, b) => Number(b.createdAt || b.updatedAt || 0) - Number(a.createdAt || a.updatedAt || 0))[0];
  if (!latest) return state;
  const nextLatest = withTradeReviewCrossEndStatus(Object.assign({}, latest, {
    trainingCompleted: true,
    trainingCompletedDay: day,
    trainingCompletedAt: Date.now(),
    updatedAt: Date.now()
  }), { trainingCompleted: true, force: true });
  const nextRecords = records.map((record) => record.id === latest.id ? nextLatest : record);
  const nextState = write(YM_TRADE_REVIEW_RECORDS, {
    latest: (state.latest || {}).id === latest.id ? nextLatest : state.latest,
    records: nextRecords
  });
  saveLivingMirrorStatsFromReviews(nextState);
  return nextState;
}

function saveTraining7Reflection(day, reflection) {
  const safeDay = Math.max(1, Math.min(7, Number(day || getTraining7State().currentDay || 1)));
  const state = getTraining7State();
  const records = Object.assign({}, state.records || {});
  records[safeDay] = withUserBinding(Object.assign({}, records[safeDay] || {}, {
    day: safeDay,
    dateKey: todayKey(),
    reflection: String(reflection || "").trim(),
    updatedAt: Date.now()
  }));
  return saveTraining7State({ currentDay: Math.max(Number(state.currentDay || 1), safeDay), records });
}

function getThreeSealsRecords() {
  return read(THREE_SEALS_KEY, {});
}

function getTodayThreeSeals() {
  return getThreeSealsRecords()[todayKey()] || {
    thought: "",
    fear: "",
    boundary: "",
    completed: false,
    updatedAt: null
  };
}

function saveTodayThreeSeals(record) {
  const records = getThreeSealsRecords();
  const nextRecord = withUserBinding(Object.assign({}, getTodayThreeSeals(), record || {}, {
    date: todayKey(),
    completed: !!((record || {}).thought || getTodayThreeSeals().thought) &&
      !!((record || {}).fear || getTodayThreeSeals().fear) &&
      !!((record || {}).boundary || getTodayThreeSeals().boundary),
    updatedAt: Date.now()
  }));
  records[todayKey()] = nextRecord;
  write(THREE_SEALS_KEY, records);
  if (nextRecord.thought || nextRecord.fear || nextRecord.boundary) {
    appendEvidence({
      type: "daily_concept",
      day: todayKey(),
      stage: "今日之印",
      action: "写下今日一念",
      reflection: nextRecord.thought || nextRecord.fear || nextRecord.boundary || "今日观念已记录。",
      sourcePage: "home_three_seals",
      sourceId: "daily_concept"
    });
  }
  if (nextRecord.completed) {
    appendEvidence({
      type: "daily_seal",
      day: todayKey(),
      stage: "今日落印",
      action: nextRecord.boundary || "落下今日之印",
      reflection: nextRecord.thought || "今日已照见。",
      zhixingChange: 3,
      sourcePage: "home_three_seals",
      sourceId: "daily_seal"
    });
  }
  return nextRecord;
}

function getRetentionState() {
  return read(RETENTION_KEY, {
    reminder: {
      enabled: false,
      time: "21:30",
      mode: "收盘省察",
      updatedAt: null
    },
    updatedAt: null
  });
}

function saveRetentionState(patch) {
  const next = Object.assign({}, getRetentionState(), patch || {}, { updatedAt: Date.now() });
  if (patch && patch.reminder) {
    next.reminder = Object.assign({}, getRetentionState().reminder || {}, patch.reminder, { updatedAt: Date.now() });
  }
  return write(RETENTION_KEY, next);
}

function getShareCardState() {
  return read(YM_SHARE_CARDS, {
    latest: null,
    records: {},
    updatedAt: null
  });
}

function getShareCardAlbum() {
  const records = (getShareCardState() || {}).records || {};
  return Object.keys(records)
    .sort((a, b) => Number(records[b].createdAt || 0) - Number(records[a].createdAt || 0))
    .map((id) => records[id]);
}

function saveShareCard(card) {
  const state = getShareCardState();
  const id = (card && card.id) || `${todayKey()}-${Date.now()}`;
  const nextCard = withUserBinding(Object.assign({}, card || {}, {
    id,
    date: (card || {}).date || todayKey(),
    createdAt: (card || {}).createdAt || Date.now()
  }));
  const next = {
    latest: nextCard,
    records: Object.assign({}, state.records || {}, { [id]: nextCard }),
    updatedAt: Date.now()
  };
  appendEvidence({
    type: "share_card",
    day: nextCard.date || todayKey(),
    stage: nextCard.typeLabel || "照见分享",
    action: nextCard.cta || "生成分享卡",
    reflection: nextCard.headline || nextCard.insight || "一张照见卡已进入卡册。",
    sourcePage: nextCard.source || "share_card",
    sourceId: id
  });
  return write(YM_SHARE_CARDS, next);
}

function getCompanionMirrorState() {
  return read(YM_COMPANION_MIRRORS, {
    latest: null,
    records: {},
    updatedAt: null
  });
}

function saveCompanionMirrorRecord(record) {
  const state = getCompanionMirrorState();
  const id = (record && record.id) || `mirror-${Date.now()}`;
  const nextRecord = withUserBinding(Object.assign({}, record || {}, {
    id,
    createdAt: (record || {}).createdAt || Date.now()
  }));
  const next = {
    latest: nextRecord,
    records: Object.assign({}, state.records || {}, { [id]: nextRecord }),
    updatedAt: Date.now()
  };
  return write(YM_COMPANION_MIRRORS, next);
}

function saveCompanionMirrorFromAssessment(assessment) {
  const profile = getProfile();
  if (!profile.inviteSourcePrimary) return getCompanionMirrorState();
  const mirror = buildCompanionMirror({
    inviterPrimary: profile.inviteSourcePrimary,
    inviterSecondary: profile.inviteSourceSecondary,
    inviteePrimary: (assessment || {}).primary,
    inviteeSecondary: (assessment || {}).secondary
  });
  return saveCompanionMirrorRecord(Object.assign({}, mirror, {
    sourceInviteCode: profile.inviteSource || "",
    sourceScene: profile.inviteSourceScene || "",
    shareCardType: profile.inviteSourceCardType || "personality_mirror",
    assessmentNo: (assessment || {}).assessmentNo || 0
  }));
}

function getGroupPracticeState() {
  const binding = getUserBinding();
  const profile = getProfile();
  const groupCode = profile.inviteSourceGroupCode || `GX${String(binding.inviteCode || "0000").slice(-4)}7`;
  return read(YM_GROUP_PRACTICE, {
    groupCode,
    title: "7 日观心共修局",
    memberCount: 1,
    members: {
      self: {
        role: profile.inviteSourceGroupCode ? "同行同修" : "发起同修",
        joinedAt: Date.now()
      }
    },
    dayStats: {},
    updatedAt: null
  });
}

function saveGroupPracticeCheckin(day, patch = {}) {
  const safeDay = Math.max(1, Math.min(7, Number(day || 1)));
  const state = getGroupPracticeState();
  const dayStats = Object.assign({}, state.dayStats || {});
  const current = Object.assign({ day: safeDay, completedCount: 0, lastCompletedAt: null }, dayStats[safeDay] || {});
  const completedCount = patch.completed === false
    ? Number(current.completedCount || 0)
    : Math.max(1, Number(current.completedCount || 0));
  dayStats[safeDay] = Object.assign({}, current, patch || {}, {
    day: safeDay,
    completedCount,
    lastCompletedAt: Date.now()
  });
  const inviteEvents = getInviteEvents();
  const memberCount = Math.max(
    Number(state.memberCount || 1),
    1 + inviteEvents.filter((item) => item.direction === "inbound" || item.direction === "conversion").length
  );
  return write(YM_GROUP_PRACTICE, withUserBinding(Object.assign({}, state, {
    memberCount,
    dayStats,
    updatedAt: Date.now()
  })));
}

function getInviteEvents() {
  return read(YM_INVITE_EVENTS, []);
}

function getInviteConversionSnapshot() {
  const training7 = getTraining7State();
  const records = (training7 || {}).records || {};
  const assessmentHistory = getAssessmentHistory();
  return {
    assessmentCompleted: !!getAssessmentResult(),
    assessmentCount: Array.isArray(assessmentHistory) ? assessmentHistory.length : 0,
    day1Completed: !!((records[1] || {}).completed),
    day3Completed: [1, 2, 3].every((day) => !!((records[day] || {}).completed)),
    day7Completed: [1, 2, 3, 4, 5, 6, 7].every((day) => !!((records[day] || {}).completed)),
    retestCompleted: Array.isArray(assessmentHistory) && assessmentHistory.length >= 2,
    lessonReserved: Object.keys(getLessonReservations()).length > 0,
    lessonWatched: Object.keys(getLessonWatchRecords()).length > 0
  };
}

function saveInviteEvent(event) {
  const userBinding = getUserBinding();
  const conversion = getInviteConversionSnapshot();
  const assessment = getAssessmentResult() || {};
  const stats = getLivingMirrorStats() || {};
  const shareCardType = (event && (event.shareCardType || event.cardType)) || "unknown";
  const sourceScene = (event && event.sourceScene) || (event && event.source) || "unknown";
  const nextEvent = Object.assign({}, event || {}, {
    id: (event && event.id) || `invite-${Date.now()}`,
    direction: (event && event.direction) || ((event && event.activatedAt) ? "inbound" : "outbound"),
    inviteCode: (event && event.inviteCode) || userBinding.inviteCode || "",
    inviterUserId: userBinding.userId || "",
    inviteeUserId: (event && event.inviteeUserId) || "",
    sourceScene,
    sourcePage: (event && event.sourcePage) || "",
    shareCardType,
    sourceType: (event && event.sourceType) || shareCardType,
    sourceId: (event && event.sourceId) || (event && event.shareCardId) || "",
    sourceShareCard: (event && event.shareCardId) || "",
    attributionId: (event && event.attributionId) || `${userBinding.inviteCode || "INV"}-${shareCardType}-${sourceScene}`,
    sourcePrimary: (event && event.sourcePrimary) || assessment.primary || "",
    sourceSecondary: (event && event.sourceSecondary) || assessment.secondary || "",
    sourceMirror: (event && event.sourceMirror) || stats.currentMirror || assessment.primaryMirror || "",
    sourceThieves: (event && event.sourceThieves) || stats.topThievesText || ((assessment.primaryThieves || []).join("、")),
    groupCode: (event && event.groupCode) || (getGroupPracticeState() || {}).groupCode || "",
    activatedAt: (event && event.activatedAt) || null,
    assessmentCompleted: conversion.assessmentCompleted,
    assessmentCount: conversion.assessmentCount,
    day1Completed: conversion.day1Completed,
    day3Completed: conversion.day3Completed,
    day7Completed: conversion.day7Completed,
    retestCompleted: conversion.retestCompleted,
    lessonReserved: conversion.lessonReserved,
    lessonWatched: conversion.lessonWatched,
    createdAt: (event && event.createdAt) || Date.now()
  });
  const events = getInviteEvents().concat(withUserBinding(nextEvent)).slice(-60);
  if (nextEvent.direction === "outbound") {
    saveAssistantHandoffEvent({
      type: "share_attribution_created",
      label: "同修分享归因已记录",
      detail: `${nextEvent.shareCardType} · ${nextEvent.sourceMirror || "待照见"}`,
      sourcePage: nextEvent.sourcePage || "share_card",
      attributionId: nextEvent.attributionId
    });
  }
  return write(YM_INVITE_EVENTS, events);
}

function saveInviteConversionEvent(conversionStage, extra = {}) {
  const profile = getProfile();
  if (!profile.inviteSource && !extra.force) return getInviteEvents();
  saveAssistantHandoffEvent({
    type: "invite_conversion",
    label: "同修归因转化",
    detail: `${conversionStage} · ${profile.inviteSource || extra.inviteCode || "自然进入"}`,
    sourcePage: extra.sourcePage || "miniprogram",
    attributionId: `${profile.inviteSource || extra.inviteCode || "INV"}-${conversionStage}`
  });
  return saveInviteEvent(Object.assign({}, extra || {}, {
    direction: "conversion",
    conversionStage,
    sourceScene: extra.sourceScene || conversionStage,
    sourcePage: extra.sourcePage || "miniprogram",
    shareCardType: extra.shareCardType || profile.inviteSourceCardType || "unknown",
    inviteCode: extra.inviteCode || profile.inviteSource || "",
    sourceInviteCode: profile.inviteSource || "",
    sourcePrimary: profile.inviteSourcePrimary || "",
    sourceSecondary: profile.inviteSourceSecondary || "",
    groupCode: profile.inviteSourceGroupCode || "",
    convertedAt: Date.now()
  }));
}

function getInviteFunnelState() {
  const events = getInviteEvents();
  const stages = {
    activation: events.filter((item) => item.direction === "inbound").length,
    assessmentCompleted: events.filter((item) => item.assessmentCompleted || item.conversionStage === "assessment_completed").length,
    day1Completed: events.filter((item) => item.day1Completed || item.conversionStage === "day1_completed").length,
    day3Completed: events.filter((item) => item.day3Completed || item.conversionStage === "day3_completed").length,
    day7Completed: events.filter((item) => item.day7Completed || item.conversionStage === "day7_completed").length,
    retestCompleted: events.filter((item) => item.retestCompleted || item.conversionStage === "retest_completed").length,
    lessonReserved: events.filter((item) => item.lessonReserved || item.conversionStage === "lesson_reserved").length,
    lessonWatched: events.filter((item) => item.lessonWatched || item.conversionStage === "lesson_watched").length
  };
  const byCard = events.reduce((next, item) => {
    const key = item.shareCardType || "unknown";
    next[key] = Number(next[key] || 0) + 1;
    return next;
  }, {});
  return {
    totalEvents: events.length,
    stages,
    byCard,
    updatedAt: Date.now()
  };
}

function getLessonReservations() {
  return read(YM_LESSON_RESERVATIONS, {});
}

function saveLessonReservation(lesson) {
  const id = lesson && lesson.id ? lesson.id : `lesson-${Date.now()}`;
  const reservations = getLessonReservations();
  const reservation = withUserBinding(Object.assign({}, reservations[id] || {}, lesson || {}, {
    id,
    reserved: true,
    reservedAt: Date.now()
  }));
  reservations[id] = reservation;
  saveInviteConversionEvent("lesson_reserved", {
    sourcePage: "classroom",
    shareCardType: "live_reservation",
    lessonId: id
  });
  return write(YM_LESSON_RESERVATIONS, reservations);
}

function getLessonWatchRecords() {
  return read(YM_LESSON_WATCH_RECORDS, {});
}

function saveLessonWatchRecord(lesson) {
  const id = lesson && lesson.id ? lesson.id : `lesson-${Date.now()}`;
  const records = getLessonWatchRecords();
  const watchRecord = withUserBinding(Object.assign({}, records[id] || {}, lesson || {}, {
    id,
    watched: true,
    watchedAt: Date.now()
  }));
  records[id] = watchRecord;
  saveInviteConversionEvent("lesson_watched", {
    sourcePage: "classroom",
    shareCardType: "live_reservation",
    lessonId: id
  });
  return write(YM_LESSON_WATCH_RECORDS, records);
}

function getSubscriptionState() {
  return read(YM_SUBSCRIPTION_STATE, {
    activePlanKey: "free",
    startedAt: null,
    expiresAt: null,
    proofNo: "",
    updatedAt: null,
    source: "local_subscription"
  });
}

function getSubscriptionView() {
  const profile = getProfile();
  return buildSubscriptionView(getSubscriptionState(), {
    userBinding: getUserBinding(),
    nickname: profile.nickname || "修行者",
    groupCode: (getGroupPracticeState() || {}).groupCode || ""
  });
}

function saveSubscriptionPlan(planKey) {
  const patch = buildSubscriptionPatch(planKey, getUserBinding());
  const next = withUserBinding(Object.assign({}, getSubscriptionState(), patch));
  return write(YM_SUBSCRIPTION_STATE, next);
}

function getMockUserProfile() {
  const demoMode = getDemoMode();
  const fallback = demoMode
    ? {
        syncState: "本地演示",
        reportSource: "网站测评同步占位",
        inviteCode: (getUserBinding() || {}).inviteCode || "",
        assistantSummary: "待生成助教承接摘要",
        updatedAt: null
      }
    : {
        syncState: "本地优先",
        reportSource: "未同步",
        inviteCode: (getUserBinding() || {}).inviteCode || "",
        assistantSummary: "完成测评、复盘或训练后，这里会生成助教承接摘要。",
        updatedAt: null
      };
  const stored = read(YM_MOCK_USER_PROFILE, fallback);
  if (demoMode) return stored;
  return Object.assign({}, stored || {}, {
    syncState: String((stored || {}).syncState || "").includes("mock") ? "本地优先" : (stored || {}).syncState || "本地优先",
    reportSource: String((stored || {}).reportSource || "").includes("占位") ? "未同步" : (stored || {}).reportSource || "未同步",
    assistantSummary: (stored || {}).assistantSummary || "完成测评、复盘或训练后，这里会生成助教承接摘要。"
  });
}

function saveMockUserProfile(patch) {
  return write(YM_MOCK_USER_PROFILE, withUserBinding(Object.assign({}, getMockUserProfile(), patch || {}, {
    updatedAt: Date.now()
  })));
}

function getLocalUserProfile() {
  return getMockUserProfile();
}

function saveLocalUserProfile(patch) {
  return saveMockUserProfile(patch);
}

function clearMockMvpState() {
  [
    YM_DAILY_THREE_SEALS,
    YM_OPENING_CHECK,
    YM_INTRADAY_BOUNDARY_RECORDS,
    YM_CLOSING_REVIEW,
    YM_ZHIXING_SCORE,
    YM_TRAINING_PROGRESS,
    YM_KLINE_HISTORY_CACHE,
    YM_SHARE_CARDS,
    YM_INVITE_EVENTS,
    YM_LESSON_RESERVATIONS,
    YM_RETEST_SNAPSHOTS,
    YM_COMPANION_MIRRORS,
    YM_GROUP_PRACTICE,
    YM_LESSON_WATCH_RECORDS,
    YM_SUBSCRIPTION_STATE,
    YM_KLINE_MIND_RECORDS,
    YM_KLINE_SCENARIOS,
    YM_KLINE_SESSION_RECORDS,
    YM_KLINE_REVIEW_REPORTS,
    YM_KLINE_MIRROR_CHALLENGES,
    YM_ANONYMOUS_REACTION_STATS,
    YM_TRADE_REVIEW_RECORDS,
    YM_LIVING_MIRROR_STATS,
    YM_ASSISTANT_HANDOFF,
    YM_MINI_PROGRAM_BINDING,
    YM_MINI_LOOP_PROGRESS,
    YM_MINI_HEART_PROOFS,
    YM_JOURNEY_STATE,
    YM_EVIDENCE_LEDGER,
    YM_TRAINING_PRESCRIPTION,
    ASSESSMENT_KEY,
    LEGACY_ASSESSMENT_KEY,
    ANSWERS_KEY,
    LEGACY_ANSWERS_KEY,
    TRAINING_KEY,
    DAILY_LOOP_KEY,
    HEART_CARD_KEY,
    REACTION_KEY
  ].forEach((key) => wx.removeStorageSync(key));
  return saveMockUserProfile({
    syncState: "本地 mock 已重置",
    assistantSummary: "待重新生成助教承接摘要"
  });
}

function clearLocalMvpState() {
  return clearMockMvpState();
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
  const next = Object.assign({}, getDojoState(), patch, { userBinding: getUserBinding(), updatedAt: Date.now() });
  return write(DOJO_KEY, next);
}

function clearAssessment() {
  wx.removeStorageSync(ASSESSMENT_KEY);
  wx.removeStorageSync(LEGACY_ASSESSMENT_KEY);
  wx.removeStorageSync(ANSWERS_KEY);
  wx.removeStorageSync(LEGACY_ANSWERS_KEY);
  updateProfile({ stage: "立志", lastAssessmentType: "" });
}

function collectLocalState() {
  const profile = getProfile();
  const userBinding = getUserBinding();
  const userId = buildSharedUserId(userBinding);
  const mirrorReport = getAssessmentResult();
  const trainingRecord = getTrainingRecordEntity();
  const tradeReview = getTradeReviewRecords();
  const livingMirrorStats = getLivingMirrorStats();
  const assistantHandoff = getAssistantHandoff();
  const trainingPrescription = getTrainingPrescription();
  return {
    profile,
    user_id: userId,
    user_binding: userBinding,
    assessment_result: mirrorReport,
    assessment_history: getAssessmentHistory(),
    assessment_answers: getAssessmentAnswers(),
    mind_profile: getMindProfile(),
    zhixing_score: getZhixingScoreState(),
    daily_loop_state: getDailyLoopState(),
    heart_proof_cards: getHeartCardState(),
    training_record: trainingRecord,
    training7_state: getTraining7State(),
    three_seals_records: getThreeSealsRecords(),
    opening_check_records: getOpeningCheckRecords(),
    intraday_boundary_records: getIntradayBoundaryRecords(),
    kline_mind_records: getKlineMindRecords(),
    kline_history_cache: getKlineHistoryCache(),
    kline_scenarios: getKlineScenarioState(),
    kline_session_records: getKlineSessionRecords(),
    kline_review_reports: getKlineReviewReports(),
    kline_mirror_challenges: getKlineMirrorChallenges(),
    anonymous_reaction_stats: getAnonymousReactionStats(),
    trade_review_records: tradeReview,
    living_mirror_stats: livingMirrorStats,
    assistant_handoff: assistantHandoff,
    training_prescription: trainingPrescription,
    mini_program_binding: getMiniProgramBinding(),
    mini_loop_progress: getMiniLoopProgress(),
    mini_daily_practice: getMiniDailyPractice(),
    mini_heart_proofs: getMiniHeartProofState(),
    journey_state: read(YM_JOURNEY_STATE, { todayJourney: {}, history: {}, updatedAt: null }),
    evidence_ledger: getEvidenceLedger(),
    closing_review_records: getClosingReviewRecords(),
    share_cards: getShareCardState(),
    invite_events: getInviteEvents(),
    invite_funnel: getInviteFunnelState(),
    lesson_reservations: getLessonReservations(),
    lesson_watch_records: getLessonWatchRecords(),
    retest_snapshots: getRetestSnapshotState(),
    companion_mirrors: getCompanionMirrorState(),
    group_practice: getGroupPracticeState(),
    subscription_state: getSubscriptionState(),
    subscription_view: getSubscriptionView(),
    mock_user_profile: getMockUserProfile(),
    retention_state: getRetentionState(),
    reaction_records: getReactionRecords(),
    mind_records: getMindRecords(),
    training_state: getTrainingState(),
    review_records: getReviews(),
    dojo_state: getDojoState(),
    client_meta: {
      source: "wechat_miniprogram_mvp",
      role: "daily_practice_companion",
      updated_at: Date.now()
    },
    shared_entities: {
      User: {
        userId,
        profile,
        userBinding
      },
      MirrorReport: mirrorReport,
      TrainingRecord: trainingRecord,
      TradeReview: tradeReview,
      LivingMirrorStats: livingMirrorStats,
      AssistantHandoff: assistantHandoff,
      TrainingPrescription: trainingPrescription,
      MiniProgramBinding: getMiniProgramBinding(),
      MiniLoopProgress: getMiniLoopProgress(),
      MiniHeartProof: getMiniHeartProofState(),
      JourneyState: read(YM_JOURNEY_STATE, { todayJourney: {}, history: {}, updatedAt: null }),
      EvidenceLedger: getEvidenceLedger()
    }
  };
}

function applyRemoteState(remoteState = {}) {
  if (!remoteState || typeof remoteState !== "object") return collectLocalState();
  const sharedEntities = remoteState.shared_entities || {};
  if (sharedEntities.User && typeof sharedEntities.User === "object") {
    if (sharedEntities.User.profile) write(PROFILE_KEY, Object.assign({}, ensureProfile(), sharedEntities.User.profile));
    if (sharedEntities.User.userBinding && sharedEntities.User.userBinding.phone) bindPhone(sharedEntities.User.userBinding.phone);
  }
  if (sharedEntities.MirrorReport && typeof sharedEntities.MirrorReport === "object") write(ASSESSMENT_KEY, sharedEntities.MirrorReport);
  if (sharedEntities.TrainingRecord && typeof sharedEntities.TrainingRecord === "object") applyTrainingRecordEntity(sharedEntities.TrainingRecord);
  if (sharedEntities.TradeReview && typeof sharedEntities.TradeReview === "object") {
    write(YM_TRADE_REVIEW_RECORDS, sharedEntities.TradeReview);
    saveLivingMirrorStatsFromReviews(sharedEntities.TradeReview);
  }
  if (sharedEntities.LivingMirrorStats && typeof sharedEntities.LivingMirrorStats === "object") write(YM_LIVING_MIRROR_STATS, sharedEntities.LivingMirrorStats);
  if (sharedEntities.AssistantHandoff && typeof sharedEntities.AssistantHandoff === "object") write(YM_ASSISTANT_HANDOFF, sharedEntities.AssistantHandoff);
  if (sharedEntities.TrainingPrescription && typeof sharedEntities.TrainingPrescription === "object") applyTrainingPrescriptionDispatch(sharedEntities.TrainingPrescription);
  if (sharedEntities.MiniProgramBinding && typeof sharedEntities.MiniProgramBinding === "object") write(YM_MINI_PROGRAM_BINDING, sharedEntities.MiniProgramBinding);
  if (sharedEntities.MiniLoopProgress && typeof sharedEntities.MiniLoopProgress === "object") write(YM_MINI_LOOP_PROGRESS, sharedEntities.MiniLoopProgress);
  if (sharedEntities.MiniHeartProof && typeof sharedEntities.MiniHeartProof === "object") write(YM_MINI_HEART_PROOFS, sharedEntities.MiniHeartProof);
  if (sharedEntities.JourneyState && typeof sharedEntities.JourneyState === "object") write(YM_JOURNEY_STATE, sharedEntities.JourneyState);
  if (sharedEntities.EvidenceLedger && typeof sharedEntities.EvidenceLedger === "object") saveEvidenceLedger(sharedEntities.EvidenceLedger);
  if (remoteState.profile) write(PROFILE_KEY, Object.assign({}, ensureProfile(), remoteState.profile));
  if (remoteState.user_binding && remoteState.user_binding.phone) bindPhone(remoteState.user_binding.phone);
  if (remoteState.user_binding && remoteState.user_binding.inviteSource) saveInviteSource(remoteState.user_binding.inviteSource);
  if (remoteState.assessment_result) write(ASSESSMENT_KEY, remoteState.assessment_result);
  if (Array.isArray(remoteState.assessment_history)) write(ASSESSMENT_HISTORY_KEY, remoteState.assessment_history);
  if (Array.isArray(remoteState.assessment_answers)) write(ANSWERS_KEY, remoteState.assessment_answers);
  if (remoteState.mind_profile && typeof remoteState.mind_profile === "object") write(MIND_PROFILE_KEY, remoteState.mind_profile);
  if (remoteState.zhixing_score && typeof remoteState.zhixing_score === "object") write(ZHIXING_SCORE_KEY, remoteState.zhixing_score);
  if (remoteState.daily_loop_state && typeof remoteState.daily_loop_state === "object") write(DAILY_LOOP_KEY, remoteState.daily_loop_state);
  if (remoteState.heart_proof_cards && typeof remoteState.heart_proof_cards === "object") write(HEART_CARD_KEY, remoteState.heart_proof_cards);
  if (remoteState.training_record && typeof remoteState.training_record === "object") applyTrainingRecordEntity(remoteState.training_record);
  if (remoteState.training7_state && typeof remoteState.training7_state === "object") write(TRAINING7_KEY, remoteState.training7_state);
  if (remoteState.three_seals_records && typeof remoteState.three_seals_records === "object") write(THREE_SEALS_KEY, remoteState.three_seals_records);
  if (remoteState.opening_check_records && typeof remoteState.opening_check_records === "object") write(MIND_KEY, remoteState.opening_check_records);
  if (remoteState.intraday_boundary_records && typeof remoteState.intraday_boundary_records === "object") write(YM_INTRADAY_BOUNDARY_RECORDS, remoteState.intraday_boundary_records);
  if (remoteState.kline_mind_records && typeof remoteState.kline_mind_records === "object") write(YM_KLINE_MIND_RECORDS, remoteState.kline_mind_records);
  if (remoteState.kline_history_cache && typeof remoteState.kline_history_cache === "object") write(YM_KLINE_HISTORY_CACHE, remoteState.kline_history_cache);
  if (remoteState.kline_scenarios && typeof remoteState.kline_scenarios === "object") write(YM_KLINE_SCENARIOS, remoteState.kline_scenarios);
  if (remoteState.kline_session_records && typeof remoteState.kline_session_records === "object") write(YM_KLINE_SESSION_RECORDS, remoteState.kline_session_records);
  if (remoteState.kline_review_reports && typeof remoteState.kline_review_reports === "object") write(YM_KLINE_REVIEW_REPORTS, remoteState.kline_review_reports);
  if (remoteState.kline_mirror_challenges && typeof remoteState.kline_mirror_challenges === "object") write(YM_KLINE_MIRROR_CHALLENGES, remoteState.kline_mirror_challenges);
  if (remoteState.anonymous_reaction_stats && typeof remoteState.anonymous_reaction_stats === "object") write(YM_ANONYMOUS_REACTION_STATS, remoteState.anonymous_reaction_stats);
  if (remoteState.trade_review_records && typeof remoteState.trade_review_records === "object") {
    write(YM_TRADE_REVIEW_RECORDS, remoteState.trade_review_records);
    saveLivingMirrorStatsFromReviews(remoteState.trade_review_records);
  }
  if (remoteState.living_mirror_stats && typeof remoteState.living_mirror_stats === "object") write(YM_LIVING_MIRROR_STATS, remoteState.living_mirror_stats);
  if (remoteState.assistant_handoff && typeof remoteState.assistant_handoff === "object") write(YM_ASSISTANT_HANDOFF, remoteState.assistant_handoff);
  if (remoteState.training_prescription && typeof remoteState.training_prescription === "object") applyTrainingPrescriptionDispatch(remoteState.training_prescription);
  if (remoteState.mini_program_binding && typeof remoteState.mini_program_binding === "object") write(YM_MINI_PROGRAM_BINDING, remoteState.mini_program_binding);
  if (remoteState.mini_loop_progress && typeof remoteState.mini_loop_progress === "object") write(YM_MINI_LOOP_PROGRESS, remoteState.mini_loop_progress);
  if (remoteState.mini_heart_proofs && typeof remoteState.mini_heart_proofs === "object") write(YM_MINI_HEART_PROOFS, remoteState.mini_heart_proofs);
  if (remoteState.journey_state && typeof remoteState.journey_state === "object") write(YM_JOURNEY_STATE, remoteState.journey_state);
  if (remoteState.evidence_ledger && typeof remoteState.evidence_ledger === "object") saveEvidenceLedger(remoteState.evidence_ledger);
  if (remoteState.closing_review_records && typeof remoteState.closing_review_records === "object") write(REVIEW_KEY, remoteState.closing_review_records);
  if (remoteState.share_cards && typeof remoteState.share_cards === "object") write(YM_SHARE_CARDS, remoteState.share_cards);
  if (Array.isArray(remoteState.invite_events)) write(YM_INVITE_EVENTS, remoteState.invite_events);
  if (remoteState.lesson_reservations && typeof remoteState.lesson_reservations === "object") write(YM_LESSON_RESERVATIONS, remoteState.lesson_reservations);
  if (remoteState.lesson_watch_records && typeof remoteState.lesson_watch_records === "object") write(YM_LESSON_WATCH_RECORDS, remoteState.lesson_watch_records);
  if (remoteState.retest_snapshots && typeof remoteState.retest_snapshots === "object") write(YM_RETEST_SNAPSHOTS, remoteState.retest_snapshots);
  if (remoteState.companion_mirrors && typeof remoteState.companion_mirrors === "object") write(YM_COMPANION_MIRRORS, remoteState.companion_mirrors);
  if (remoteState.group_practice && typeof remoteState.group_practice === "object") write(YM_GROUP_PRACTICE, remoteState.group_practice);
  if (remoteState.subscription_state && typeof remoteState.subscription_state === "object") write(YM_SUBSCRIPTION_STATE, remoteState.subscription_state);
  if (remoteState.mock_user_profile && typeof remoteState.mock_user_profile === "object") write(YM_MOCK_USER_PROFILE, remoteState.mock_user_profile);
  if (remoteState.retention_state && typeof remoteState.retention_state === "object") write(RETENTION_KEY, remoteState.retention_state);
  if (remoteState.reaction_records && typeof remoteState.reaction_records === "object") write(REACTION_KEY, remoteState.reaction_records);
  if (remoteState.mind_records && typeof remoteState.mind_records === "object") write(MIND_KEY, remoteState.mind_records);
  if (remoteState.training_state && typeof remoteState.training_state === "object") write(TRAINING_KEY, remoteState.training_state);
  if (remoteState.review_records && typeof remoteState.review_records === "object") write(REVIEW_KEY, remoteState.review_records);
  if (remoteState.dojo_state && typeof remoteState.dojo_state === "object") write(DOJO_KEY, remoteState.dojo_state);
  if (isValidPhone(ensureProfile().phone)) rebindLocalRecords(ensureProfile());
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
  bindPhone,
  saveInviteSource,
  getUserBinding,
  getMiniProgramBinding,
  saveMiniBridgeLinkToken,
  getDemoMode,
  setDemoMode,
  getDebugMode,
  setDebugMode,
  getEvidenceLedger,
  saveEvidenceLedger,
  appendEvidence,
  getEvidenceSummary,
  buildEvidenceRows,
  getLatestEvidence,
  formatRiskLevel,
  readTodayJourney,
  saveJourneyCheckpoint,
  getJourneySnapshot,
  getTodayCompletionState,
  getUnifiedJourneyView,
  getClosureEvidenceChain,
  resolveJourneyPagePath,
  getAssessmentResult,
  getAssessmentHistory,
  getRetestSnapshotState,
  saveRetestSnapshot,
  saveAssessmentResult,
  getAssessmentAnswers,
  saveAssessmentAnswers,
  getMindRecords,
  getTodayMind,
  saveTodayMind,
  getOpeningCheckRecords,
  getTodayOpeningCheck,
  saveTodayOpeningCheck,
  getTrainingState,
  getTodayTraining,
  saveTodayTraining,
  getReviews,
  getTodayReview,
  saveTodayReview,
  getClosingReviewRecords,
  getTodayClosingReview,
  saveTodayClosingReview,
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
  getReactionRecords,
  getTodayReaction,
  saveTodayReaction,
  getIntradayBoundaryRecords,
  getTodayIntradayBoundaryRecord,
  saveTodayIntradayBoundaryRecord,
  getKlineHistoryCache,
  saveKlineHistorySlice,
  getKlineScenarioState,
  saveKlineScenarioState,
  getKlineSessionRecords,
  saveKlineSessionRecord,
  getKlineReviewReports,
  saveKlineReviewReport,
  getKlineMirrorChallenges,
  saveKlineMirrorChallenge,
  getAnonymousReactionStats,
  getTradeReviewRecords,
  saveTradeReviewRecord,
  applyTradeReviewBindingResult,
  getTrainingPrescription,
  saveTrainingPrescription,
  applyTrainingPrescriptionDispatch,
  getTrainingRecordEntity,
  getMiniLoopProgress,
  getMiniDailyPractice,
  getMiniHeartProofState,
  saveMiniHeartProof,
  createMiniHeartProofFromDaily,
  getLivingMirrorStats,
  getAssistantHandoff,
  saveAssistantHandoffEvent,
  saveLivingMirrorStatsFromReviews,
  getKlineMindRecords,
  getTodayKlineMindRecord,
  saveTodayKlineMindRecord,
  getTraining7State,
  saveTraining7State,
  saveTraining7Task,
  saveTraining7Reflection,
  getThreeSealsRecords,
  getTodayThreeSeals,
  saveTodayThreeSeals,
  getRetentionState,
  saveRetentionState,
  getShareCardState,
  getShareCardAlbum,
  saveShareCard,
  getCompanionMirrorState,
  saveCompanionMirrorRecord,
  saveCompanionMirrorFromAssessment,
  getGroupPracticeState,
  saveGroupPracticeCheckin,
  getInviteEvents,
  getInviteConversionSnapshot,
  saveInviteEvent,
  saveInviteConversionEvent,
  getInviteFunnelState,
  getLessonReservations,
  saveLessonReservation,
  getLessonWatchRecords,
  saveLessonWatchRecord,
  getSubscriptionState,
  getSubscriptionView,
  saveSubscriptionPlan,
  getMockUserProfile,
  saveMockUserProfile,
  getLocalUserProfile,
  saveLocalUserProfile,
  clearMockMvpState,
  clearLocalMvpState,
  getDojoState,
  saveDojoState,
  clearAssessment,
  collectLocalState,
  applyRemoteState,
  getSyncStatus,
  saveSyncStatus
};
