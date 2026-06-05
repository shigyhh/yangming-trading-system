const { getMirrorBinding } = require("../../utils/content");

const VERSION = "zhixing-stability-v1";

const DIMENSIONS = [
  { key: "planClarity", name: "计划清晰度", weight: 0.2 },
  { key: "boundaryExecution", name: "边界执行度", weight: 0.24 },
  { key: "intradayStability", name: "临盘稳定度", weight: 0.22 },
  { key: "reviewCompletion", name: "复盘完成度", weight: 0.18 },
  { key: "trainingCompletion", name: "训练完成度", weight: 0.16 }
];

function clamp(value, min, max) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function average(values) {
  const safeValues = (values || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!safeValues.length) return null;
  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
}

function compact(values) {
  return (values || []).filter((value) => value !== null && value !== undefined && value !== "");
}

function sortedRecords(records) {
  return (records || [])
    .filter(Boolean)
    .slice()
    .sort((a, b) => Number(a.createdAt || a.updatedAt || 0) - Number(b.createdAt || b.updatedAt || 0));
}

function getTradeRecords(tradeReviewState) {
  return sortedRecords((tradeReviewState || {}).records || []);
}

function getRealTradeRecords(tradeReviewState) {
  return getTradeRecords(tradeReviewState).filter((item) => item.sourceType !== "kline_training");
}

function getKlineTrainingRecords(tradeReviewState) {
  return getTradeRecords(tradeReviewState).filter((item) => item.sourceType === "kline_training");
}

function getKlineReports(klineReviewReports) {
  return sortedRecords((klineReviewReports || {}).records || []);
}

function getKlineMindList(klineMindRecords) {
  if (Array.isArray(klineMindRecords)) return sortedRecords(klineMindRecords);
  return sortedRecords(Object.keys(klineMindRecords || {}).map((key) => klineMindRecords[key]));
}

function scoreFromRecords(records, key) {
  return average((records || []).map((item) => (item.scores || {})[key]));
}

function scoreFromReports(reports, key) {
  return average((reports || []).map((item) => (item.scores || {})[key]));
}

function boundaryStateScore(records) {
  const values = (records || []).map((item) => {
    if (item.boundaryState === "kept") return 86;
    if (item.boundaryState === "near") return 58;
    if (item.boundaryState === "lost") return 32;
    if (item.changedPlan === "yes") return 42;
    if (item.inPlan === "no") return 48;
    return null;
  });
  return average(values);
}

function changedPlanScore(records) {
  const values = (records || []).map((item) => {
    if (item.changedPlan === "yes") return 40;
    if (item.changedPlan === "no") return 78;
    if (item.inPlan === "no") return 45;
    if (item.inPlan === "yes") return 74;
    return null;
  });
  return average(values);
}

function preparedPlanScore(records) {
  const values = (records || []).map((item) => {
    if (item.exitPrepared === "no") return 38;
    if (item.exitPrepared === "yes") return 76;
    if (item.planBoundary) return 72;
    if (item.entryReason || item.exitReason) return 64;
    return null;
  });
  return average(values);
}

function taskRatioFromTraining(training7State, training7View) {
  const today = (training7View || {}).today || {};
  const dayRecord = ((training7State || {}).records || {})[(training7View || {}).currentDay || (training7State || {}).currentDay || 1] || {};
  const tasks = Object.assign({}, dayRecord.tasks || {}, today.taskStatus || {});
  const keys = Object.keys(tasks || {});
  if (!keys.length) return null;
  const doneCount = keys.filter((key) => !!tasks[key]).length;
  return clamp((doneCount / keys.length) * 100, 0, 100);
}

function completedTrainingDays(training7State) {
  return Object.keys((training7State || {}).records || {})
    .map((key) => ((training7State || {}).records || {})[key])
    .filter((record) => record && record.completed).length;
}

function buildDimension(key, name, values, sourceText, hint) {
  const value = average(values);
  const hasData = value !== null;
  const score = hasData ? clamp(value, 0, 100) : 0;
  return {
    key,
    name,
    score,
    scoreText: hasData ? String(score) : "待记录",
    level: hasData ? getStabilityLevel(score).dimensionLabel : "待照见",
    sourceText,
    hint,
    hasData
  };
}

function getStabilityLevel(score) {
  if (!score) return { label: "待照见", dimensionLabel: "待照见" };
  if (score < 40) return { label: "起修", dimensionLabel: "待稳" };
  if (score < 60) return { label: "待稳", dimensionLabel: "待稳" };
  if (score < 75) return { label: "渐稳", dimensionLabel: "渐稳" };
  if (score < 88) return { label: "有守", dimensionLabel: "有守" };
  return { label: "守中", dimensionLabel: "守中" };
}

function buildZhixingStability(context = {}) {
  const tradeRecords = getTradeRecords(context.tradeReviewState);
  const realRecords = getRealTradeRecords(context.tradeReviewState);
  const klineTrainingRecords = getKlineTrainingRecords(context.tradeReviewState);
  const klineReports = getKlineReports(context.klineReviewReports);
  const klineMindList = getKlineMindList(context.klineMindRecords);
  const trainingProgress = Number((context.training7View || {}).progressPercent || 0);
  const todayTaskRatio = taskRatioFromTraining(context.training7State, context.training7View);
  const doneTrainingDays = completedTrainingDays(context.training7State);
  const completedKlineMindCount = klineMindList.filter((item) => item && item.completed).length;

  const dimensions = [
    buildDimension(
      "planClarity",
      "计划清晰度",
      compact([
        scoreFromRecords(realRecords, "execution"),
        scoreFromRecords(tradeRecords, "execution"),
        scoreFromReports(klineReports, "planExecution"),
        preparedPlanScore(realRecords),
        todayTaskRatio
      ]),
      "来自真实复盘、K线盲练和今日训练",
      "看计划、边界与下一步是否提前写清。"
    ),
    buildDimension(
      "boundaryExecution",
      "边界执行度",
      compact([
        scoreFromRecords(realRecords, "boundary"),
        scoreFromRecords(klineTrainingRecords, "boundary"),
        scoreFromReports(klineReports, "boundaryKeeping"),
        boundaryStateScore(realRecords),
        changedPlanScore(realRecords)
      ]),
      "来自真实复盘与K线盲练的守界表现",
      "看边界触碰时是否仍能回到原先写下的规则。"
    ),
    buildDimension(
      "intradayStability",
      "临盘稳定度",
      compact([
        scoreFromRecords(realRecords, "stability"),
        scoreFromRecords(klineTrainingRecords, "stability"),
        scoreFromReports(klineReports, "emotionalStability"),
        scoreFromReports(klineReports, "impulseDelay"),
        changedPlanScore(realRecords)
      ]),
      "来自第一反应、临盘改计划和压力切片",
      "看波动靠近边界时，第一念是否把动作带走。"
    ),
    buildDimension(
      "reviewCompletion",
      "复盘完成度",
      compact([
        scoreFromRecords(realRecords, "review"),
        scoreFromRecords(tradeRecords, "review"),
        scoreFromReports(klineReports, "reviewCompletion"),
        realRecords.length ? clamp(48 + realRecords.length * 8, 48, 92) : null,
        todayTaskRatio
      ]),
      "来自真实复盘、K线复盘和收盘省察",
      "看事实、第一念与下一练是否被写下来。"
    ),
    buildDimension(
      "trainingCompletion",
      "训练完成度",
      compact([
        trainingProgress || null,
        todayTaskRatio,
        doneTrainingDays ? clamp(42 + doneTrainingDays * 8, 42, 96) : null,
        completedKlineMindCount ? clamp(48 + completedKlineMindCount * 6, 48, 92) : null,
        klineReports.length ? clamp(52 + klineReports.length * 5, 52, 92) : null
      ]),
      "来自七日训练、今日任务和K线观心",
      "看训练是否持续落地，而不是只停留在理解。"
    )
  ];

  const activeDimensions = dimensions.filter((item) => item.hasData);
  const weightedScore = activeDimensions.length
    ? activeDimensions.reduce((sum, item) => {
        const meta = DIMENSIONS.find((dimension) => dimension.key === item.key) || { weight: 0.2 };
        return sum + item.score * meta.weight;
      }, 0) / activeDimensions.reduce((sum, item) => {
        const meta = DIMENSIONS.find((dimension) => dimension.key === item.key) || { weight: 0.2 };
        return sum + meta.weight;
      }, 0)
    : 0;
  const total = activeDimensions.length ? clamp(weightedScore, 0, 100) : 0;
  const lowest = activeDimensions.slice().sort((a, b) => a.score - b.score)[0];
  const highest = activeDimensions.slice().sort((a, b) => b.score - a.score)[0];
  const level = getStabilityLevel(total);
  const sourceCounts = {
    tradeReviewCount: realRecords.length,
    klineBlindCount: klineReports.length + klineTrainingRecords.length,
    klineMindCount: completedKlineMindCount,
    trainingDayCount: doneTrainingDays
  };
  const hasData = activeDimensions.length > 0;

  return {
    version: VERSION,
    title: "知行稳定度",
    total,
    totalText: hasData ? String(total) : "--",
    level: level.label,
    summary: buildStabilitySummary({ hasData, total, lowest, highest }),
    dimensions,
    sourceCounts,
    riskLine: lowest ? `${lowest.name}仍需加一层照见。` : "完成一次真实复盘或K线盲练后，系统会开始照见稳定度。",
    improvementLine: highest ? `${highest.name}是当前最稳的一环。` : "先留下第一条记录，稳定度才有根。",
    updatedAt: Date.now()
  };
}

function buildStabilitySummary({ hasData, total, lowest, highest }) {
  if (!hasData) return "完成一次真实复盘、K线盲练或今日训练后，知行稳定度会开始生成。";
  if (total >= 88) return "最近记录显示，你更能把看见的念头落到行动边界里。";
  if (total >= 75) return "整体正在变稳，继续观察边界触碰时的第一念。";
  if (total >= 60) return "已经有稳定迹象，下一步要让训练回到真实复盘里。";
  if (lowest && highest) return `${highest.name}已有根基，${lowest.name}仍是下一次主修。`;
  return "稳定度刚开始生成，先把真实记录持续留下来。";
}

function normalizeMirror(value, fallbackType) {
  const text = String(value || "").trim();
  if (text && text !== "待照见" && text !== "待观察") return text;
  if (fallbackType) return getMirrorBinding(fallbackType).mirrorName;
  return "";
}

function topMirror(records) {
  const counts = (records || []).reduce((result, item) => {
    const mirror = normalizeMirror(item.relatedMirror || item.heartMirrorName || item.mirrorName, item.relatedPersonality);
    if (!mirror) return result;
    result[mirror] = (result[mirror] || 0) + 1;
    return result;
  }, {});
  return Object.keys(counts)
    .map((mirror) => ({ mirror, count: counts[mirror] }))
    .sort((a, b) => b.count - a.count || a.mirror.localeCompare(b.mirror))[0] || null;
}

function buildTripleReflection(context = {}) {
  const assessment = context.assessment || {};
  const realRecords = getRealTradeRecords(context.tradeReviewState);
  const allTradeRecords = getTradeRecords(context.tradeReviewState);
  const klineTrainingRecords = getKlineTrainingRecords(context.tradeReviewState);
  const klineReports = getKlineReports(context.klineReviewReports);
  const assessmentMirror = normalizeMirror(assessment.primaryMirror || assessment.primaryHeartMirror || assessment.mirrorName, assessment.primary);
  const klineTop = topMirror(klineReports.concat(klineTrainingRecords));
  const tradeTop = topMirror(realRecords.length ? realRecords : allTradeRecords);
  const klineMirror = normalizeMirror((klineTop || {}).mirror, "");
  const tradeMirror = normalizeMirror((tradeTop || {}).mirror, "");
  const rows = [
    buildTripleRow("assessment", "九镜测评", assessmentMirror, assessmentMirror ? "已照见" : "待完成"),
    buildTripleRow("kline", "K线盲练", klineMirror, klineMirror ? `${(klineTop || {}).count || 0} 次显现` : "待训练"),
    buildTripleRow("trade", "真实交易记录", tradeMirror, tradeMirror ? `${(tradeTop || {}).count || 0} 次显现` : "待复盘")
  ];
  const mirrors = rows.map((row) => row.mirror).filter((mirror) => mirror && mirror !== "待照见");
  const counts = mirrors.reduce((result, mirror) => {
    result[mirror] = (result[mirror] || 0) + 1;
    return result;
  }, {});
  const top = Object.keys(counts)
    .map((mirror) => ({ mirror, count: counts[mirror] }))
    .sort((a, b) => b.count - a.count || a.mirror.localeCompare(b.mirror))[0];
  const uniqueCount = Object.keys(counts).length;
  const state = resolveTripleState({ mirrors, top, uniqueCount });
  const mainMirror = (top || {}).mirror || assessmentMirror || klineMirror || tradeMirror || "待照见";
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
    prescription: buildTriplePrescription(mainMirror),
    updatedAt: Date.now()
  };
}

function buildTripleRow(key, name, mirror, statusText) {
  return {
    key,
    name,
    mirror: mirror || "待照见",
    statusText
  };
}

function resolveTripleState({ mirrors, top, uniqueCount }) {
  if (!mirrors.length) return { key: "empty", label: "待入镜" };
  if (mirrors.length < 3) return { key: "insufficient", label: "待补全" };
  if (top && top.count === 3) return { key: "aligned", label: "三路同向" };
  if (top && top.count === 2) return { key: "partial", label: "两路同向" };
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
      conclusion: "先完成九镜测评、K线盲练或真实交易记录，系统会开始互照。",
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

function buildTriplePrescription(mainMirror) {
  const actionMap = {
    "追涨之镜": "今日主修：边界前停十秒，先写第一念。",
    "扛单之镜": "今日主修：边界触碰时，只回看原先写下的规则。",
    "错过之镜": "今日主修：允许一次小步验证，不追求完美确认。",
    "等完美点位之镜": "今日主修：允许一次小步验证，不追求完美确认。",
    "翻本之镜": "今日主修：连续不顺时先离开屏幕一分钟。",
    "赌性之镜": "今日主修：动作变大前，先记录那一口不甘。",
    "跟风之镜": "今日主修：外部声音变热时，先回到自己的计划。",
    "从众之镜": "今日主修：外部声音变热时，先回到自己的计划。",
    "证明之镜": "今日主修：先写一条反向事实，再做复盘判断。",
    "幻想之镜": "今日主修：先写一条反向事实，再做复盘判断。",
    "不复盘之镜": "今日主修：只做三分钟复盘，先把事实落下。",
    "拖延之镜": "今日主修：只做三分钟复盘，先把事实落下。",
    "空仓焦虑之镜": "今日主修：固定观察窗口外，只记录念头。",
    "止盈过早之镜": "今日主修：固定观察窗口外，只记录念头。",
    "焦虑之镜": "今日主修：固定观察窗口外，只记录念头。",
    "守心之镜": "今日主修：保持每日一省，让稳定继续有根。",
    "良知之镜": "今日主修：保持每日一省，让稳定继续有根。"
  };
  return actionMap[mainMirror] || "今日主修：先留下真实记录，再让系统校准下一练。";
}

module.exports = {
  buildZhixingStability,
  buildTripleReflection,
  getStabilityLevel
};
