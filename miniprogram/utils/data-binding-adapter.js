const { PERSONALITIES, QUESTIONS, TRAINING_PLANS } = require("./content");

const SOURCE = "miniprogram";
const SOURCE_CHANNEL = "微信小程序MVP";
const COMPLIANCE_NOTICE = "本报告用于交易心理觉察，不构成投资建议";

const RISK_LABELS = [
  { key: "entryImpulse", label: "入场冲动" },
  { key: "stopResistance", label: "边界抗拒" },
  { key: "proving", label: "亏损后证明欲" },
  { key: "execution", label: "计划执行力" },
  { key: "stability", label: "稳定度" }
];

const PERSONALITY_KEY_MAP = {
  "冲动型": "fomo_chaser",
  "焦虑型": "panic_runner",
  "扛单型": "hold_and_hope",
  "偏执型": "prove_self",
  "赌徒型": "revenge_rescuer",
  "拖延型": "hesitant_watcher",
  "完美型": "over_control",
  "从众型": "crowd_sway",
  "平衡型": "disciplined_observer"
};

const SEVEN_DAY_PRESCRIPTION = [
  {
    day: 1,
    theme: "照见第一念",
    action: "每次想立刻行动时，先写下此刻第一念。",
    reflectionPrompt: "今天最强的一次第一念是什么？"
  },
  {
    day: 2,
    theme: "停十秒",
    action: "行动前停十秒，只确认是否符合原计划。",
    reflectionPrompt: "停十秒后，动作有没有变慢？"
  },
  {
    day: 3,
    theme: "复核边界",
    action: "行动前写下理由、边界和复盘依据。",
    reflectionPrompt: "今天是否先写边界，再决定动作？"
  },
  {
    day: 4,
    theme: "记录触发",
    action: "只记录触发情绪，不急于修正结果。",
    reflectionPrompt: "哪一种场景最容易牵动你？"
  },
  {
    day: 5,
    theme: "降低噪声",
    action: "盘中减少外部声音，只看自己的计划卡。",
    reflectionPrompt: "减少噪声后，心是否更稳？"
  },
  {
    day: 6,
    theme: "省察偏离",
    action: "复盘一次偏离计划的动作，只写一个可修正点。",
    reflectionPrompt: "下次最小可改动作是什么？"
  },
  {
    day: 7,
    theme: "复测准备",
    action: "回看 7 天记录，标出最常出现的心贼。",
    reflectionPrompt: "这 7 天最需要继续训练的一件事是什么？"
  }
];

function buildAssessmentBindingPayload({ auth = {}, state = {}, report = null } = {}) {
  const user = buildDataBindingUser(auth, state);
  const normalizedReport = normalizeAssessmentReportForBinding(report || state.assessment_result || {}, state, user);

  return {
    user,
    report: normalizedReport,
    answers: normalizeAnswers(state.assessment_answers),
    questionOrder: QUESTIONS.map((question) => question.id),
    source: SOURCE
  };
}

function buildRetestBindingPayload({ auth = {}, state = {}, report = null } = {}) {
  const user = buildDataBindingUser(auth, state);
  const normalizedReport = normalizeAssessmentReportForBinding(report || getLatestAssessment(state) || {}, state, user);

  return {
    user,
    report: normalizedReport,
    comparison: buildRetestComparison(state, normalizedReport),
    source: SOURCE
  };
}

function shouldSyncRetest(state = {}) {
  const history = Array.isArray(state.assessment_history) ? state.assessment_history : [];
  const snapshots = state.retest_snapshots || {};
  return history.length >= 2 || !!(snapshots.baseline && snapshots.retest);
}

function buildTrainingBindingPayload({ auth = {}, state = {}, progress = null } = {}) {
  const practiceState = progress || buildPracticeState(state);
  const trainingRecord = getLatestTrainingRecord(practiceState, state);
  if (!trainingRecord) return null;

  return {
    user: buildDataBindingUser(auth, state),
    record: trainingRecord,
    practiceState,
    source: SOURCE
  };
}

function buildKLineBindingPayload({ auth = {}, state = {}, progress = null, trainingRecord = null } = {}) {
  const practiceState = progress || buildPracticeState(state);
  const sourceRecord = getLatestRecordFromSources([
    practiceState.intraday_boundary_records,
    state.intraday_boundary_records,
    practiceState.kline_mind_records,
    state.kline_mind_records,
    practiceState.opening_check_records,
    state.opening_check_records,
    practiceState.closing_review_records,
    state.closing_review_records,
    state.reaction_records
  ]);

  if (!sourceRecord) return null;

  return {
    user: buildDataBindingUser(auth, state),
    record: {
      day: Number((trainingRecord || {}).day || sourceRecord.day || (practiceState.training7_state || {}).currentDay || 1),
      recordedAt: toIso(sourceRecord.updatedAt || sourceRecord.createdAt || Date.now()),
      scene: pickText(sourceRecord.scene, sourceRecord.scenarioTitle, sourceRecord.trigger, sourceRecord.currentStatus, sourceRecord.todayRisk, "小程序训练场景"),
      market: pickText(sourceRecord.marketName, sourceRecord.marketKey, ""),
      timeframe: pickText(sourceRecord.timeframeKey, ""),
      symbol: pickText(sourceRecord.symbol, ""),
      dataSource: pickText(sourceRecord.dataSource, ""),
      reaction: pickText(sourceRecord.reaction, sourceRecord.firstReaction, sourceRecord.firstThought, sourceRecord.note, "已觉察，未展开"),
      disciplineAction: pickText(sourceRecord.disciplineAction, sourceRecord.boundaryChoice, sourceRecord.boundary, sourceRecord.action, sourceRecord.nextAction, "先停一息，再复盘")
    },
    source: SOURCE
  };
}

function buildShareCardBindingPayload({ auth = {}, state = {}, event = null } = {}) {
  const user = buildDataBindingUser(auth, state);
  const latestCard = (state.share_cards || {}).latest || getLatestRecord((state.share_cards || {}).records);
  const channel = pickText(
    event && (event.inviteCode || event.sourceInviteCode || event.sourceScene || event.shareCardType || event.cardType),
    latestCard && (latestCard.inviteCode || latestCard.type || latestCard.cardType),
    user.inviteSource,
    SOURCE_CHANNEL
  );

  return {
    user,
    channel,
    source_channel: SOURCE_CHANNEL
  };
}

function buildDataBindingUser(auth = {}, state = {}) {
  const profile = state.profile || {};
  const binding = state.user_binding || {};
  const authUser = auth.user || {};
  const rawPhone = binding.phone || profile.phone || authUser.phone || authUser.contact || "";
  const maskedPhone = binding.phoneMask || profile.phoneMask || authUser.phone_mask || maskPhone(rawPhone);
  const phoneTail = getPhoneTail(rawPhone, maskedPhone);
  const userId = String(authUser.id || binding.userId || binding.user_id || profile.userId || profile.openid || `mp-${Date.now()}`);

  return {
    userId,
    maskedPhone,
    phoneTail,
    nickname: profile.nickname || authUser.display_name || authUser.nickname || "修行者",
    inviteSource: binding.inviteSource || profile.inviteSource || binding.inviteCode || profile.inviteCode || SOURCE_CHANNEL,
    sourceChannel: SOURCE
  };
}

function normalizeAssessmentReportForBinding(report = {}, state = {}, user = {}) {
  const primaryLabel = report.primary || report.primaryType?.label || report.primaryPersonality?.label || "平衡型";
  const secondaryLabel = report.secondary || report.secondaryType?.label || report.secondaryPersonality?.label || "待观察";
  const primaryProfile = buildTypeProfile(primaryLabel, report, "primary");
  const secondaryProfile = buildTypeProfile(secondaryLabel, report, "secondary");
  const createdAt = toIso(report.createdAt || report.savedAt || report.completedAt || Date.now());

  return {
    schemaVersion: "assessment_report_v1",
    reportId: String(report.reportId || report.report_id || `mp-rpt-${createdAt.replace(/\D/g, "").slice(0, 14)}`),
    userId: user.userId || report.userId || "",
    createdAt,
    conclusion: report.conclusion || `你当前主反应是「${primaryProfile.label}」，训练重点是先照见第一念，再记录与复盘。`,
    totalQuestions: Number(report.totalQuestions || QUESTIONS.length),
    answeredCount: Number(report.answeredCount || normalizeAnswers(state.assessment_answers).length || QUESTIONS.length),
    primaryPersonality: toUnifiedPersonality(primaryProfile),
    secondaryPersonality: toUnifiedPersonality(secondaryProfile),
    primaryType: primaryProfile,
    secondaryType: secondaryProfile,
    scores: buildScores(report),
    riskRadar: buildRiskRadar(report),
    emotionalTriggers: buildEmotionalTriggers(report, primaryLabel),
    trainingPrescription7Days: Array.isArray(report.trainingPrescription7Days) && report.trainingPrescription7Days.length
      ? report.trainingPrescription7Days.slice(0, 7)
      : SEVEN_DAY_PRESCRIPTION,
    campSuggestion: report.campSuggestion || buildCampSuggestion(primaryLabel),
    complianceNotice: COMPLIANCE_NOTICE,
    metadata: {
      source: SOURCE,
      assessmentVersion: "miniprogram_mvp",
      scoringVersion: "miniprogram_local",
      contentVersion: "miniprogram_content_v1"
    },
    firstThought: report.firstThought || report.trigger || "",
    firstThoughtDisplay: report.firstThoughtDisplay || report.trigger || "",
    trainingDirection: report.trainingDirection || primaryProfile.training || "先照见触发，再训练一个可执行动作。",
    disclaimer: `${COMPLIANCE_NOTICE}。`
  };
}

function buildTypeProfile(label, report = {}, position = "primary") {
  const profile = PERSONALITIES[label] || {};
  const plan = TRAINING_PLANS[label] || {};
  const ranked = Array.isArray(report.ranked) ? report.ranked : [];
  const rankedItem = ranked.find((item) => item.type === label) || {};
  const existing = position === "primary" ? report.primaryType || report.primaryPersonality : report.secondaryType || report.secondaryPersonality;

  return {
    key: (existing && (existing.key || existing.type)) || PERSONALITY_KEY_MAP[label] || label,
    label,
    poeticName: (existing && existing.poeticName) || "",
    summary: (existing && existing.summary) || profile.scenario || "已生成交易心理照见摘要。",
    risk: (existing && existing.risk) || profile.bias || "",
    training: (existing && existing.training) || plan.microTraining || profile.action || "先照见第一念，再完成一次复盘。",
    score: Number((existing && existing.score) || rankedItem.score || (position === "primary" ? report.intensity : 0) || 0)
  };
}

function toUnifiedPersonality(profile) {
  return {
    type: profile.key,
    label: profile.label,
    poeticName: profile.poeticName || "",
    summary: profile.summary || "",
    score: normalizeScore(profile.score)
  };
}

function buildScores(report = {}) {
  if (report.scores && typeof report.scores === "object") return report.scores;
  if (Array.isArray(report.ranked)) {
    return report.ranked.reduce((scores, item) => {
      scores[item.type || item.key] = Number(item.score || 0);
      return scores;
    }, {});
  }
  return {};
}

function buildRiskRadar(report = {}) {
  if (Array.isArray(report.riskRadar) && report.riskRadar.length) {
    return report.riskRadar.map(normalizeRiskRadarItem).slice(0, 6);
  }
  if (report.radar && typeof report.radar === "object") {
    return Object.keys(report.radar).map((key) => normalizeRiskRadarItem({ key, label: key, value: report.radar[key] })).slice(0, 6);
  }

  const base = Number(report.intensity || 58);
  return RISK_LABELS.map((item, index) => ({
    key: item.key,
    label: item.label,
    value: clamp(index === 3 || index === 4 ? 100 - base + index * 3 : base - index * 5, 24, 92),
    description: index === 3 || index === 4 ? "用于观察训练后的稳定变化。" : "用于观察触发强度，不代表行情判断。"
  }));
}

function normalizeRiskRadarItem(item = {}) {
  return {
    key: String(item.key || item.label || "risk"),
    label: String(item.label || item.key || "风险项"),
    value: clamp(item.value, 0, 100),
    description: String(item.description || "用于交易心理觉察与复盘。")
  };
}

function buildEmotionalTriggers(report = {}, primaryLabel) {
  if (Array.isArray(report.emotionalTriggers) && report.emotionalTriggers.length) return report.emotionalTriggers.slice(0, 6);
  const profile = PERSONALITIES[primaryLabel] || {};
  const plan = TRAINING_PLANS[primaryLabel] || {};
  return [
    {
      key: "first_thought",
      label: plan.stage || "第一念",
      description: report.trigger || profile.trigger || plan.triggerScene || "真实场景触发后，先看见心里最先升起的念头。",
      firstThought: report.firstThought || report.trigger || ""
    }
  ];
}

function buildCampSuggestion(primaryLabel) {
  const plan = TRAINING_PLANS[primaryLabel] || {};
  return {
    name: `${primaryLabel}七日知行训练`,
    reason: "根据当前主反应推荐七日训练路径。",
    focus: plan.microTraining || "照见第一念、记录触发、复盘动作。"
  };
}

function buildPracticeState(state = {}) {
  return {
    training7_state: state.training7_state,
    three_seals_records: state.three_seals_records,
    opening_check_records: state.opening_check_records,
    intraday_boundary_records: state.intraday_boundary_records,
    kline_mind_records: state.kline_mind_records,
    kline_history_cache: state.kline_history_cache,
    closing_review_records: state.closing_review_records,
    zhixing_score: state.zhixing_score,
    retest_snapshots: state.retest_snapshots,
    group_practice: state.group_practice,
    lesson_watch_records: state.lesson_watch_records,
    subscription_state: state.subscription_state
  };
}

function getLatestTrainingRecord(practiceState = {}, state = {}) {
  const training7 = practiceState.training7_state || state.training7_state || {};
  const records = training7.records || {};
  const keys = Object.keys(records).sort((left, right) => Number(left) - Number(right));
  if (!keys.length) return null;

  const latestKey = keys[keys.length - 1];
  const latest = records[latestKey] || {};
  const day = Number(latest.day || latestKey || training7.currentDay || 1);
  const actions = buildTrainingActions(latest);
  const title = getTrainingTitle(day);
  const note = latest.reflection || latest.note || (latest.completed ? "今日训练已完成。" : "今日训练已记录。");

  return {
    day,
    dateKey: latest.dateKey || latest.date || toIso(latest.updatedAt || Date.now()).slice(0, 10),
    title,
    note,
    actions,
    status: latest.completed === false ? "missed" : "completed",
    recordedAt: toIso(latest.updatedAt || latest.completedAt || Date.now()),
    cultivationText: latest.reflection || latest.cultivationText || latest.note || ""
  };
}

function buildTrainingActions(record = {}) {
  const tasks = record.tasks || {};
  const labels = {
    opening_check: "开盘照心",
    intraday_boundary: "盘中守界",
    reaction_record: "交易反应记录",
    daily_practice: "今日事上练",
    closing_review: "收盘省察",
    reaction: "记录第一念",
    kline: "K 线训练记录",
    checkin: "每日打卡"
  };
  const actions = Object.keys(tasks)
    .filter((key) => !!tasks[key])
    .map((key) => labels[key] || key);
  return actions.length ? actions : ["记录今日觉察"];
}

function getTrainingTitle(day) {
  const titles = {
    1: "照见入场冲动",
    2: "复核计划边界",
    3: "记录证明欲",
    4: "顺境守中",
    5: "克治不甘",
    6: "知行不断裂",
    7: "复盘与复测"
  };
  return titles[day] || "今日事上练";
}

function buildRetestComparison(state = {}, report = {}) {
  const snapshots = state.retest_snapshots || {};
  const baseline = (snapshots.baseline || {}).riskRadar;
  const retest = (snapshots.retest || {}).riskRadar;
  if (baseline && retest) {
    return RISK_LABELS.map((metric) => {
      const before = clamp(baseline[metric.key], 0, 100);
      const after = clamp(retest[metric.key], 0, 100);
      return {
        key: metric.key,
        label: metric.label,
        before,
        after,
        delta: after - before
      };
    });
  }

  const currentRadar = report.riskRadar || [];
  return currentRadar.map((item) => ({
    key: item.key,
    label: item.label,
    before: item.value,
    after: item.value,
    delta: 0
  }));
}

function normalizeAnswers(answers) {
  if (!Array.isArray(answers)) return [];
  return answers
    .map((answer, index) => ({
      questionId: QUESTIONS[index] ? QUESTIONS[index].id : `q${index + 1}`,
      optionId: String(answer)
    }))
    .filter((item) => item.optionId !== "undefined");
}

function getLatestAssessment(state = {}) {
  const history = Array.isArray(state.assessment_history) ? state.assessment_history : [];
  return history[history.length - 1] || state.assessment_result || {};
}

function getLatestRecord(collection) {
  if (!collection) return null;
  if (Array.isArray(collection)) return collection[collection.length - 1] || null;
  if (typeof collection !== "object") return null;
  const values = Object.keys(collection).map((key) => collection[key]).filter(Boolean);
  if (!values.length) return null;
  return values.sort((left, right) => Number(right.updatedAt || right.createdAt || 0) - Number(left.updatedAt || left.createdAt || 0))[0];
}

function getLatestRecordFromSources(sources = []) {
  return sources
    .map((source) => getLatestRecord(source))
    .filter(Boolean)
    .sort((left, right) => Number(right.updatedAt || right.createdAt || 0) - Number(left.updatedAt || left.createdAt || 0))[0] || null;
}

function pickText() {
  for (let index = 0; index < arguments.length; index += 1) {
    const value = arguments[index];
    if (value === 0) return "0";
    if (value) return String(value);
  }
  return "";
}

function getPhoneTail(rawPhone, maskedPhone) {
  const digits = String(rawPhone || maskedPhone || "").replace(/\D/g, "");
  return digits.slice(-4);
}

function maskPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 11) return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  return "未绑定";
}

function toIso(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

function clamp(value, min, max) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : min;
  return Math.max(min, Math.min(max, Math.round(safe)));
}

function normalizeScore(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return number > 100 ? 100 : Math.max(0, Math.round(number));
}

module.exports = {
  COMPLIANCE_NOTICE,
  buildAssessmentBindingPayload,
  buildRetestBindingPayload,
  shouldSyncRetest,
  buildTrainingBindingPayload,
  buildKLineBindingPayload,
  buildShareCardBindingPayload,
  normalizeAssessmentReportForBinding,
  buildDataBindingUser
};
