import {
  firstThoughtDisplayMap,
  personalityProfiles,
  riskTypeKeys,
  sevenDayTrainingPrescription
} from "../content/personality.js";

export const ASSESSMENT_REPORT_SCHEMA_VERSION = "assessment_report_v1";
export const ASSESSMENT_VERSION = "web_ritual_12q_v1";
export const SCORING_VERSION = "personality_engine_2026_06_v1";
export const CONTENT_VERSION = "personality_content_2026_06_v1";
export const COMPLIANCE_NOTICE = "本报告用于交易心理觉察，不构成投资建议";

const personalityKeys = Object.keys(personalityProfiles);
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];

export function createEmptyPersonalityScores() {
  return personalityKeys.reduce((scores, key) => {
    scores[key] = 0;
    return scores;
  }, {});
}

export function getPersonalityProfile(key) {
  return personalityProfiles[key] || personalityProfiles.disciplined_observer;
}

export function getPersonalityLabel(key) {
  return getPersonalityProfile(key).label;
}

export function buildAssessmentReport({
  answers = [],
  questions = [],
  mirrorSignal = null,
  source = "web-next",
  reportId = "",
  userId = "",
  now = new Date()
} = {}) {
  const scores = scorePersonalityAnswers({ answers, questions, mirrorSignal });
  const sortedAll = personalityKeys
    .map((key) => ({ key, score: scores[key] || 0 }))
    .sort((left, right) => right.score - left.score);
  const sortedRisks = riskTypeKeys
    .map((key) => ({ key, score: scores[key] || 0 }))
    .sort((left, right) => right.score - left.score);
  const observerScore = scores.disciplined_observer || 0;
  const highestRisk = sortedRisks[0] || { key: "disciplined_observer", score: 0 };
  const primaryKey = highestRisk.score >= Math.max(2, observerScore * 0.6)
    ? highestRisk.key
    : sortedAll[0]?.key || "disciplined_observer";
  const secondaryKey = sortedAll.find((item) => item.key !== primaryKey)?.key || "disciplined_observer";
  const primaryType = toLegacyTypeProfile(primaryKey, scores[primaryKey] || 0);
  const secondaryType = toLegacyTypeProfile(secondaryKey, scores[secondaryKey] || 0);
  const riskRadar = buildRiskRadar(scores);
  const emotionalTriggers = buildEmotionalTriggers(primaryKey, mirrorSignal);
  const firstThought = cleanText(mirrorSignal?.thought || getPersonalityProfile(primaryKey).trigger.firstThought, 160);
  const firstThoughtDisplay = cleanText(
    mirrorSignal?.thought?.replace(/[。？?]/g, "") || firstThoughtDisplayMap[primaryKey] || firstThought.replace(/[。？?]/g, ""),
    80
  );
  const trainingDirection = cleanText(mirrorSignal?.training || primaryType.training, 180);
  const createdAt = toIsoString(now);

  return {
    schemaVersion: ASSESSMENT_REPORT_SCHEMA_VERSION,
    reportId: reportId || createReportId("rpt", now),
    userId,
    createdAt,
    conclusion: buildConclusion({ firstThoughtDisplay, trainingDirection }),
    primaryPersonality: toUnifiedPersonality(primaryKey, scores[primaryKey] || 0),
    secondaryPersonality: toUnifiedPersonality(secondaryKey, scores[secondaryKey] || 0),
    riskRadar,
    emotionalTriggers,
    trainingPrescription7Days: buildTrainingPrescription7Days(primaryKey, mirrorSignal),
    campSuggestion: buildCampSuggestion(primaryKey),
    complianceNotice: COMPLIANCE_NOTICE,
    metadata: {
      source,
      assessmentVersion: ASSESSMENT_VERSION,
      scoringVersion: SCORING_VERSION,
      contentVersion: CONTENT_VERSION
    },
    totalQuestions: questions.length,
    answeredCount: countValidAnswers(answers, questions),
    primaryType,
    secondaryType,
    scores,
    firstThought,
    firstThoughtDisplay,
    trainingDirection,
    disclaimer: `${COMPLIANCE_NOTICE}。`
  };
}

export function scorePersonalityAnswers({ answers = [], questions = [], mirrorSignal = null } = {}) {
  const scores = createEmptyPersonalityScores();

  answers.forEach((answer) => {
    const option = findSelectedOption(questions, answer);
    if (!option) return;

    (option.tags || []).forEach((tag) => {
      if (Object.hasOwn(scores, tag)) scores[tag] += Number(option.weight || 0);
    });
  });

  if (mirrorSignal?.assessmentTag && Object.hasOwn(scores, mirrorSignal.assessmentTag)) {
    scores[mirrorSignal.assessmentTag] += mirrorSignal.id === "conscience" ? 3 : 4;
  }

  return scores;
}

export function buildRiskRadar(scores = {}) {
  return [
    { key: "impulse", label: "冲动追入", value: normalizeRiskValue(scores.fomo_chaser), description: "看到快速波动时容易先动手。" },
    { key: "panic", label: "恐慌离场", value: normalizeRiskValue(scores.panic_runner), description: "波动放大时容易急于脱离。" },
    { key: "holding", label: "扛单拖延", value: normalizeRiskValue(scores.hold_and_hope), description: "条件失效后容易把边界往后挪。" },
    { key: "proving", label: "证明执念", value: normalizeRiskValue((scores.prove_self || 0) + (scores.revenge_rescuer || 0)), description: "容易让动作服务于证明自己。" },
    { key: "hesitation", label: "犹豫过控", value: normalizeRiskValue((scores.hesitant_watcher || 0) + (scores.over_control || 0)), description: "容易在过度确认里失去行动边界。" },
    { key: "review", label: "复盘失察", value: normalizeRiskValue(scores.numb_repeat), description: "违规后容易跳过命名和复盘。" }
  ];
}

export function buildTrainingPrescription7Days(primaryKey, mirrorSignal = null) {
  return sevenDayTrainingPrescription.map((item, index) => {
    if (index !== 0) return { ...item };

    return {
      ...item,
      action: cleanText(mirrorSignal?.training || getPersonalityProfile(primaryKey).training || item.action, 140)
    };
  });
}

export function buildCampSuggestion(primaryKey) {
  return { ...getPersonalityProfile(primaryKey).camp };
}

function findSelectedOption(questions, answer) {
  const question = questions.find((item) => item.id === answer.questionId);
  return question?.options?.find((option) => option.id === answer.optionId);
}

function countValidAnswers(answers, questions) {
  return answers.filter((answer) => Boolean(findSelectedOption(questions, answer))).length;
}

function toLegacyTypeProfile(key, rawScore) {
  const profile = getPersonalityProfile(key);
  return {
    key,
    label: profile.label,
    poeticName: profile.poeticName,
    summary: cleanText(profile.summary, 180),
    risk: cleanText(profile.risk, 180),
    training: cleanText(profile.training, 180),
    score: Number(rawScore || 0)
  };
}

function toUnifiedPersonality(key, rawScore) {
  const legacy = toLegacyTypeProfile(key, rawScore);
  return {
    type: key,
    label: legacy.label,
    poeticName: legacy.poeticName,
    summary: legacy.summary,
    score: normalizeRiskValue(rawScore)
  };
}

function buildEmotionalTriggers(primaryKey, mirrorSignal) {
  const trigger = getPersonalityProfile(primaryKey).trigger;
  const first = {
    key: trigger.key,
    label: trigger.label,
    description: cleanText(trigger.description, 180),
    firstThought: cleanText(mirrorSignal?.thought || trigger.firstThought, 160)
  };

  if (!mirrorSignal?.name) return [first];

  return [
    first,
    {
      key: `mirror_${mirrorSignal.id || "selected"}`,
      label: cleanText(mirrorSignal.name, 60),
      description: cleanText(mirrorSignal.behavior || mirrorSignal.verdict || "你选择的行为心镜会影响本次照见。", 180),
      firstThought: cleanText(mirrorSignal.thought || first.firstThought, 160)
    }
  ];
}

function buildConclusion({ firstThoughtDisplay, trainingDirection }) {
  return cleanText(
    `你最容易被「${firstThoughtDisplay || "第一念"}」牵动，训练重点是${trainingDirection || "先照见，再复盘"}。`,
    160
  );
}

function normalizeRiskValue(score) {
  return clampPercent(Number(score || 0) * 20);
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function createReportId(prefix, now) {
  const stamp = toIsoString(now).replace(/\D/g, "").slice(0, 14);
  const random = cryptoRandomId().slice(0, 8).toUpperCase();
  return `${prefix.toUpperCase()}-${stamp}-${random}`;
}

function cryptoRandomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, "");
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function toIsoString(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function cleanText(value, maxLength) {
  const text = String(value || "").trim().slice(0, maxLength);
  return forbiddenPhrases.reduce((current, phrase) => current.replaceAll(phrase, "训练提示"), text);
}
