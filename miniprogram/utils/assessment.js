const { PERSONALITIES, OPTIONS, getAssessmentMode, getAssessmentQuestions, getMirrorBinding } = require("./content");

const TYPE_ORDER = Object.keys(PERSONALITIES);
const RISK_TYPES = TYPE_ORDER.filter((type) => type !== "平衡型");
const MAX_OPTION_VALUE = OPTIONS.reduce((max, item) => Math.max(max, Number(item.value || 0)), 0) || 4;
const MIN_OPTION_VALUE = OPTIONS.reduce((min, item) => Math.min(min, Number(item.value || 0)), MAX_OPTION_VALUE) || 1;

const BEHAVIOR_FIELD_WEIGHTS = [
  { field: "chased", type: "冲动型", weight: 0.9, note: "近期记录里出现追随快速波动的倾向。" },
  { field: "held", type: "扛单型", weight: 1.0, note: "近期记录里出现边界触碰后继续解释的倾向。" },
  { field: "changedPlan", type: "偏执型", weight: 0.7, note: "近期记录里出现临场改写计划的倾向。" },
  { field: "deviatedPlan", type: "偏执型", weight: 0.7, note: "近期记录里出现偏离原计划的倾向。" },
  { field: "revenge", type: "赌徒型", weight: 1.0, note: "近期记录里出现情绪补偿的倾向。" }
];

const EMOTION_WEIGHTS = {
  急躁: { type: "冲动型", weight: 0.55, note: "急躁会让第一念更快越过计划。" },
  焦虑: { type: "焦虑型", weight: 0.55, note: "焦虑会放大不确定感。" },
  恐惧: { type: "焦虑型", weight: 0.65, note: "恐惧会让波动更像压力。" },
  贪念: { type: "赌徒型", weight: 0.55, note: "贪念会放大补偿与刺激感。" },
  麻木: { type: "拖延型", weight: 0.45, note: "麻木容易让复盘和行动断开。" },
  想证明: { type: "偏执型", weight: 0.6, note: "证明心会把动作带离事实。" }
};

const TEXT_SIGNAL_WEIGHTS = [
  { pattern: /错过|急|追|快|立刻|马上/, type: "冲动型", weight: 0.55 },
  { pattern: /扛|等等|不甘|边界|修复|回来/, type: "扛单型", weight: 0.55 },
  { pattern: /证明|对错|面子|不服|承认/, type: "偏执型", weight: 0.55 },
  { pattern: /翻|补|刺激|重|回本/, type: "赌徒型", weight: 0.55 },
  { pattern: /别人|大家|群|老师|朋友|热闹/, type: "从众型", weight: 0.5 },
  { pattern: /等等|明天|懒|拖|不想写|没记录/, type: "拖延型", weight: 0.5 },
  { pattern: /怕|焦虑|恐惧|不安|紧张/, type: "焦虑型", weight: 0.5 },
  { pattern: /完美|确认|安全|控制|自责/, type: "完美型", weight: 0.5 }
];

function computeAssessment(answers, options = {}) {
  const mode = getAssessmentMode(options.modeKey || options.mode || "27");
  const questions = Array.isArray(options.questions) && options.questions.length
    ? options.questions
    : getAssessmentQuestions(mode.key);
  const baseScores = createInitialScores();
  const dimensionScores = {};

  questions.forEach((question, index) => {
    const raw = Array.isArray(answers) ? answers[index] : undefined;
    const score = Math.max(MIN_OPTION_VALUE, Math.min(MAX_OPTION_VALUE, Number(raw || MIN_OPTION_VALUE)));
    const normalized = (MAX_OPTION_VALUE - MIN_OPTION_VALUE) ? (score - MIN_OPTION_VALUE) / (MAX_OPTION_VALUE - MIN_OPTION_VALUE) : 0;
    const weight = Number(question.weight || 1);
    addDimensionScore(dimensionScores, question, normalized, weight);

    if (question.positive) {
      baseScores["平衡型"] += normalized * 1.35 * weight;
      RISK_TYPES.forEach((type) => {
        baseScores[type] += Math.max(0, 0.38 - normalized * 0.28) * weight;
      });
    } else {
      baseScores[question.type] += normalized * 1.25 * weight;
      if (normalized <= 0.18) baseScores["平衡型"] += 0.14 * weight;
    }
  });

  const questionnaireRanked = rankScores(baseScores);
  const behavior = buildBehaviorAdjustment(options.behaviorContext || {});
  const finalScores = mergeScores(baseScores, behavior.scores);
  const ranked = rankScores(finalScores);
  const primary = ranked[0].type;
  const secondary = ranked[1] ? ranked[1].type : "平衡型";
  const profile = PERSONALITIES[primary];
  const secondaryProfile = PERSONALITIES[secondary];
  const primaryMirror = getMirrorBinding(primary);
  const secondaryMirror = getMirrorBinding(secondary);
  const total = ranked.reduce((sum, item) => sum + Math.max(0, item.score), 0) || 1;
  const intensity = Math.round((ranked[0].score / total) * 100);
  const mixGap = ranked[0].score - (ranked[1] ? ranked[1].score : 0);
  const mixed = ranked[1] && mixGap <= Math.max(0.85, ranked[0].score * 0.24);
  const behaviorTop = behavior.ranked[0] || null;
  const drifted = questionnaireRanked[0] && questionnaireRanked[0].type !== primary;

  return {
    primary,
    secondary,
    primaryMirror: primaryMirror.mirrorName,
    secondaryMirror: secondaryMirror.mirrorName,
    primaryHeartMirror: primaryMirror.heartMirrorName,
    secondaryHeartMirror: secondaryMirror.heartMirrorName,
    primaryThieves: primaryMirror.thieves,
    secondaryThieves: secondaryMirror.thieves,
    virtuePractice: primaryMirror.virtue || "",
    intensity,
    ranked,
    scores: finalScores,
    questionnairePrimary: questionnaireRanked[0] ? questionnaireRanked[0].type : primary,
    questionnaireRanked,
    behaviorAdjustment: behavior,
    mixed,
    mixLabel: mixed ? `${primaryMirror.mirrorName} · ${secondaryMirror.mirrorName}` : primaryMirror.mirrorName,
    title: `${primary} · ${primaryMirror.mirrorName}`,
    scenario: profile.scenario,
    trigger: profile.trigger,
    bias: profile.bias,
    xinxue: profile.xinxue,
    action: profile.action,
    path: profile.path,
    secondaryNote: `${secondary}倾向提示：${secondaryProfile.scenario}`,
    dynamicNote: buildDynamicNote({ primary, secondary, questionnaireRanked, behaviorTop, drifted, mixed }),
    stageLabel: behavior.stageLabel,
    behaviorNotes: behavior.notes,
    dimensionHighlights: buildDimensionHighlights(dimensionScores),
    riskRadar: buildRiskRadar(finalScores),
    emotionalTriggers: buildEmotionalTriggers(primary, behavior.notes),
    assessmentMode: mode.key,
    assessmentModeLabel: mode.label,
    totalQuestions: questions.length,
    answeredCount: countAnswered(answers, questions.length),
    questionOrder: questions.map((question) => question.id),
    createdAt: Date.now()
  };
}

function createInitialScores() {
  return TYPE_ORDER.reduce((scores, type) => {
    scores[type] = type === "平衡型" ? 0.35 : 0;
    return scores;
  }, {});
}

function buildBehaviorContextFromState(state = {}) {
  const history = Array.isArray(state.assessmentHistory) ? state.assessmentHistory : [];
  const profile = state.profile || {};
  const reviews = normalizeRecordList(state.reviews);
  const mindRecords = normalizeRecordList(state.mindRecords);
  const klineRecords = normalizeRecordList(state.klineMindRecords);
  const reactions = normalizeRecordList(state.reactionRecords);
  const allRecords = reviews.concat(mindRecords, klineRecords, reactions).slice(-21);
  const assessmentCount = Number(profile.assessmentCount || history.length || 0);
  const trainingDays = countUniqueDays(allRecords);
  const explicitStage = state.experienceStage || profile.tradingExperience || profile.experienceStage || "";
  const stageLabel = inferStageLabel({ explicitStage, assessmentCount, trainingDays });

  return {
    stageLabel,
    assessmentCount,
    trainingDays,
    history,
    records: allRecords
  };
}

function buildBehaviorAdjustment(context = {}) {
  const scores = createZeroScores();
  const notes = [];
  const records = Array.isArray(context.records) ? context.records.slice(-21) : [];
  const history = Array.isArray(context.history) ? context.history.slice(-5) : [];
  const stageLabel = context.stageLabel || inferStageLabel(context);

  if (stageLabel === "新手期") {
    addScore(scores, "冲动型", 0.9);
    addScore(scores, "焦虑型", 0.45);
    notes.push("新手期通常先显出冲动与焦虑的混合反应，后续会随训练记录继续漂移。");
  }

  history.forEach((item, index) => {
    const decay = 0.32 + index * 0.08;
    if (item.primary) addScore(scores, item.primary, decay);
    if (item.secondary) addScore(scores, item.secondary, decay * 0.48);
  });

  records.forEach((record) => {
    BEHAVIOR_FIELD_WEIGHTS.forEach((item) => {
      if (record && record[item.field]) {
        addScore(scores, item.type, item.weight);
        addUniqueNote(notes, item.note);
      }
    });

    if (record && record.keptBoundary === false) {
      addScore(scores, "扛单型", 0.75);
      addUniqueNote(notes, "近期记录显示边界守护仍是重点训练项。");
    }

    const emotion = record && (record.emotion || record.currentStatus || record.firstReaction || record.strongestReaction);
    const emotionHit = EMOTION_WEIGHTS[emotion];
    if (emotionHit) {
      addScore(scores, emotionHit.type, emotionHit.weight);
      addUniqueNote(notes, emotionHit.note);
    }

    const text = [
      record && record.strongestReaction,
      record && record.firstReaction,
      record && record.insightLine,
      record && record.correction,
      record && record.bodySignal,
      record && record.boundaryChoice
    ].filter(Boolean).join(" ");
    TEXT_SIGNAL_WEIGHTS.forEach((item) => {
      if (item.pattern.test(text)) addScore(scores, item.type, item.weight);
    });
  });

  if (records.length >= 7 && sumScores(scores) < 1.5) {
    addScore(scores, "平衡型", 0.8);
    notes.push("近期记录较稳定，平衡型权重上升。");
  }

  return {
    scores,
    ranked: rankScores(scores),
    stageLabel,
    notes: notes.slice(0, 4),
    recordCount: records.length
  };
}

function addDimensionScore(dimensionScores, question, normalized, weight) {
  const key = `${question.type}:${question.dimension}`;
  const current = dimensionScores[key] || {
    type: question.type,
    label: question.dimension,
    score: 0,
    count: 0
  };
  current.score += normalized * 100 * weight;
  current.count += 1;
  dimensionScores[key] = current;
}

function buildDimensionHighlights(dimensionScores) {
  return Object.keys(dimensionScores)
    .map((key) => {
      const item = dimensionScores[key];
      return {
        type: item.type,
        label: item.label,
        value: Math.round(item.score / Math.max(item.count, 1))
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
}

function buildRiskRadar(scores) {
  return [
    { key: "entryImpulse", label: "入场冲动", value: scorePercent(scores["冲动型"]), description: "观察第一念是否先越过计划。" },
    { key: "boundary", label: "边界抗拒", value: scorePercent(scores["扛单型"]), description: "观察边界触碰后是否继续解释。" },
    { key: "proving", label: "证明执念", value: scorePercent((scores["偏执型"] || 0) + (scores["赌徒型"] || 0) * 0.55), description: "观察动作是否服务于证明自己。" },
    { key: "crowd", label: "外界牵引", value: scorePercent(scores["从众型"]), description: "观察外部声音是否覆盖自己的证据。" },
    { key: "execution", label: "执行断裂", value: scorePercent((scores["拖延型"] || 0) + (scores["完美型"] || 0) * 0.45), description: "观察知与行之间是否断开。" },
    { key: "stability", label: "稳定度", value: Math.max(0, 100 - scorePercent(scores["焦虑型"] || 0)), description: "观察波动中是否能回到节奏。" }
  ];
}

function buildEmotionalTriggers(primary, notes) {
  const profile = PERSONALITIES[primary] || PERSONALITIES["平衡型"];
  return [
    {
      key: "primary_trigger",
      label: "主触发",
      description: profile.trigger,
      firstThought: profile.scenario
    }
  ].concat((notes || []).slice(0, 2).map((note, index) => ({
    key: `behavior_${index + 1}`,
    label: "行为记录",
    description: note,
    firstThought: note
  })));
}

function buildDynamicNote({ primary, secondary, questionnaireRanked, behaviorTop, drifted, mixed }) {
  const questionnairePrimary = questionnaireRanked[0] ? questionnaireRanked[0].type : primary;
  if (drifted && behaviorTop) {
    return `问卷显出「${questionnairePrimary}」，近期行为把当前主反应推向「${primary}」。`;
  }
  if (mixed) return `当前不是单一人格，更像「${primary}」与「${secondary}」混合显现。`;
  return `当前主反应以「${primary}」为主，后续会随训练记录继续更新。`;
}

function inferStageLabel(context = {}) {
  const explicit = String(context.explicitStage || context.stageLabel || "").trim();
  if (/新手|刚开始|入门|初学/.test(explicit)) return "新手期";
  if (/复测|训练|七日/.test(explicit)) return "训练期";
  const assessmentCount = Number(context.assessmentCount || 0);
  const trainingDays = Number(context.trainingDays || 0);
  if (assessmentCount <= 1 && trainingDays < 3) return "新手期";
  if (trainingDays >= 7 || assessmentCount >= 2) return "复测期";
  return "训练期";
}

function rankScores(scores) {
  return TYPE_ORDER
    .map((type) => ({ type, score: Number((scores[type] || 0).toFixed(2)) }))
    .sort((a, b) => b.score - a.score);
}

function mergeScores(base, addition) {
  const scores = {};
  TYPE_ORDER.forEach((type) => {
    scores[type] = Number(((base[type] || 0) + (addition[type] || 0)).toFixed(4));
  });
  return scores;
}

function createZeroScores() {
  return TYPE_ORDER.reduce((scores, type) => {
    scores[type] = 0;
    return scores;
  }, {});
}

function addScore(scores, type, weight) {
  if (!Object.prototype.hasOwnProperty.call(scores, type)) return;
  scores[type] += Number(weight || 0);
}

function sumScores(scores) {
  return Object.keys(scores || {}).reduce((sum, key) => sum + Number(scores[key] || 0), 0);
}

function addUniqueNote(notes, note) {
  if (note && !notes.includes(note)) notes.push(note);
}

function scorePercent(score) {
  return Math.max(0, Math.min(100, Math.round(Number(score || 0) * 18)));
}

function normalizeRecordList(records) {
  if (!records) return [];
  if (Array.isArray(records)) return records.filter(Boolean);
  if (typeof records === "object") {
    return Object.keys(records)
      .map((key) => records[key])
      .filter(Boolean)
      .sort((left, right) => Number(left.updatedAt || left.createdAt || 0) - Number(right.updatedAt || right.createdAt || 0));
  }
  return [];
}

function countUniqueDays(records) {
  const days = new Set();
  records.forEach((item) => {
    const key = item.date || item.dayKey || (item.updatedAt ? String(item.updatedAt).slice(0, 10) : "");
    if (key) days.add(key);
  });
  return days.size;
}

function countAnswered(answers, total) {
  if (!Array.isArray(answers)) return 0;
  return answers.slice(0, total).filter((item) => typeof item === "number").length;
}

module.exports = {
  computeAssessment,
  buildBehaviorContextFromState,
  buildBehaviorAdjustment
};
