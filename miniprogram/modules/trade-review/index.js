const { getMirrorBinding } = require("../../utils/content");
const { MARKET_PRESETS, TIMEFRAME_PRESETS } = require("../kline-simulator/index");

const COMPLIANCE_TEXT = "本系统用于交易心理觉察与训练，不提供投资建议，不预测行情，不构成任何操作依据。";

const ACTION_OPTIONS = [
  { key: "planned", label: "计划内执行", type: "平衡型", score: 88 },
  { key: "impulse", label: "临场冲动", type: "冲动型", score: 36 },
  { key: "hold", label: "边界后迟疑", type: "扛单型", score: 32 },
  { key: "prove", label: "想证明自己", type: "偏执型", score: 34 },
  { key: "compensate", label: "想拉回状态", type: "赌徒型", score: 28 },
  { key: "avoid", label: "不愿复盘", type: "拖延型", score: 42 }
];

const EMOTION_OPTIONS = ["平静", "急躁", "恐惧", "不甘", "想证明", "焦虑", "逃避"];

const BOUNDARY_STATES = [
  { key: "kept", label: "已守住", score: 88 },
  { key: "near", label: "差点失守", score: 56 },
  { key: "lost", label: "已经失守", score: 28 }
];

const STAGE_POSITIONS = [
  { key: "open_fast", label: "开盘加速段", type: "冲动型", gate: "事上磨" },
  { key: "near_boundary", label: "边界附近", type: "扛单型", gate: "知行合一" },
  { key: "pullback", label: "回撤段", type: "焦虑型", gate: "照心" },
  { key: "sideways", label: "横盘震荡", type: "拖延型", gate: "磨练" },
  { key: "after_streak", label: "连续不顺后", type: "赌徒型", gate: "破心贼" },
  { key: "crowd_hot", label: "外部声音很热", type: "从众型", gate: "立志" }
];

const SCORE_LABELS = {
  awareness: "照见度",
  boundary: "守界度",
  execution: "执行度",
  stability: "稳定度",
  review: "复盘度",
  personalityCalibration: "人格校准度"
};

const EMOTION_TYPE_MAP = {
  急躁: "冲动型",
  恐惧: "焦虑型",
  不甘: "赌徒型",
  想证明: "偏执型",
  焦虑: "焦虑型",
  逃避: "拖延型",
  平静: "平衡型"
};

const THIEF_TRAINING_MAP = {
  贪: "热闹前停十秒，只记录第一念与边界。",
  惧: "边界触发时先命名恐惧，再回到预案。",
  急: "连续波动后只做记录，不让不甘心接管节奏。",
  痴: "写一条反向事实，照见幻想继续解释的惯性。",
  慢: "把复盘缩成三行：触发、第一念、下一次边界。",
  疑: "把计划依据写成一句话，减少临场摇摆。"
};

const TRADE_REVIEW_STATUS_STEPS = [
  { key: "pending_confirmation", label: "待确认", detail: "截图、自述与第一念等待确认。" },
  { key: "pending_market_review", label: "待回看", detail: "等待历史位置回看完成。" },
  { key: "mirrored", label: "已照见", detail: "九镜六贼已生成照见结果。" },
  { key: "archived", label: "已入镜", detail: "真实记录已写入活镜档案。" },
  { key: "training_pending", label: "待训练", detail: "等待对应训练动作完成。" },
  { key: "trained", label: "已训练", detail: "训练动作已回流到这条记录。" },
  { key: "retested", label: "已复测", detail: "复测变化已回看。" }
];

const KEYWORD_MIRROR_RULES = [
  {
    mirrorName: "追涨之镜",
    type: "冲动型",
    keywords: ["怕错过", "来不及", "上车"],
    thieves: ["贪", "急"],
    verdict: "你追的不是行情，是怕被机会抛下的不安。",
    trainingAction: "没有计划依据，不主动找机会。"
  },
  {
    mirrorName: "扛单之镜",
    type: "扛单型",
    keywords: ["再等等", "会回来", "不认错"],
    thieves: ["痴", "慢"],
    verdict: "你扛住的不是波动，而是不愿承认边界已经被触碰的自己。",
    trainingAction: "边界出现后，不再临场解释，先回到预案。"
  },
  {
    mirrorName: "幻想之镜",
    type: "完美型",
    keywords: ["这次不一样", "一定反转"],
    thieves: ["痴"],
    verdict: "这次记录照见：幻想会把事实变成自己想听的解释。",
    trainingAction: "写一条反向事实，让事实照见继续解释的惯性。"
  },
  {
    mirrorName: "执念之镜",
    type: "赌徒型",
    keywords: ["翻本", "梭哈", "加大仓位"],
    thieves: ["贪", "急", "痴"],
    verdict: "你想拉回的不是结果，而是不甘心失去掌控的感觉。",
    trainingAction: "连续不顺后只做记录，不让不甘心接管节奏。"
  },
  {
    mirrorName: "从众之镜",
    type: "从众型",
    keywords: ["别人说", "群里说", "老师说"],
    thieves: ["疑", "惧"],
    verdict: "这次牵动你的不是事实本身，而是外部声音带来的确定感。",
    trainingAction: "把外部声音放到一边，只写自己的依据与边界。"
  },
  {
    mirrorName: "犹疑之镜",
    type: "焦虑型",
    keywords: ["再确认", "万一错了"],
    thieves: ["疑", "惧"],
    verdict: "犹疑不是谨慎本身，而是害怕承担一次清晰选择。",
    trainingAction: "把计划依据写成一句话，减少临场摇摆。"
  },
  {
    mirrorName: "拖延之镜",
    type: "拖延型",
    keywords: ["明天复盘", "太累了"],
    thieves: ["慢"],
    verdict: "真正拖住你的不是时间，而是不想面对那一刻的真实反应。",
    trainingAction: "今天只完成三行复盘：触发、第一念、下一次边界。"
  },
  {
    mirrorName: "焦虑之镜",
    type: "焦虑型",
    keywords: ["怕回吐", "先卖一点"],
    thieves: ["惧", "疑"],
    verdict: "焦虑想让你用动作换安心，但真正要练的是守住观察窗口。",
    trainingAction: "把观察窗口固定下来，窗口外只记录心境。"
  },
  {
    mirrorName: "良知之镜",
    type: "平衡型",
    keywords: ["按计划", "守规则"],
    thieves: [],
    virtue: "知止、守心、执行",
    verdict: "你没有急着证明自己，而是把动作带回边界。",
    trainingAction: "继续保持每日小记录，让稳定来自持续省察。"
  }
];

function getMarketLabel(key) {
  const item = MARKET_PRESETS.find((preset) => preset.key === key) || MARKET_PRESETS[0];
  return item.label;
}

function getTimeframeLabel(key) {
  const item = TIMEFRAME_PRESETS.find((preset) => preset.key === key) || TIMEFRAME_PRESETS[3];
  return item.label;
}

function getOption(list, key, fallbackIndex = 0) {
  return list.find((item) => item.key === key) || list[fallbackIndex];
}

function inferType(input = {}) {
  const keywordRule = matchKeywordMirrorRule(input);
  if (keywordRule) return keywordRule.type;
  const action = getOption(ACTION_OPTIONS, input.actionKey);
  const stage = getOption(STAGE_POSITIONS, input.stagePositionKey);
  const emotionType = EMOTION_TYPE_MAP[input.emotion] || "";
  const boundary = getOption(BOUNDARY_STATES, input.boundaryState);
  if (input.changedPlan === "yes" || input.inPlan === "no") return "冲动型";
  if (input.exitPrepared === "no") return "拖延型";
  if (boundary.key === "lost" && action.type !== "平衡型") return action.type;
  if (emotionType && emotionType !== "平衡型") return emotionType;
  if (action.type !== "平衡型") return action.type;
  return stage.type || "平衡型";
}

function matchKeywordMirrorRule(input = {}) {
  const text = [
    input.entryReason,
    input.exitReason,
    input.firstThought,
    input.afterReaction,
    input.nextAction,
    input.reviewNote,
    input.planBoundary
  ].filter(Boolean).join(" ");
  return KEYWORD_MIRROR_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword))) || null;
}

function buildHistoricalMatch(input = {}) {
  if (input.marketContext && typeof input.marketContext === "object") {
    return buildHistoricalMatchFromMarketContext(input.marketContext, input);
  }
  const marketLabel = getMarketLabel(input.marketKey);
  const timeframeLabel = getTimeframeLabel(input.timeframeKey);
  const stage = getOption(STAGE_POSITIONS, input.stagePositionKey);
  return {
    marketKey: input.marketKey || "cn",
    marketLabel,
    timeframeKey: input.timeframeKey || "1d",
    timeframeLabel,
    tradeDate: input.tradeDate || "",
    symbol: input.symbol || "待补充",
    stagePosition: stage.label,
    stageGate: stage.gate,
    sourceStatus: input.historyMatched ? "已匹配历史切片" : "等待历史数据回看",
    sourceNote: input.historyMatched
      ? "已将记录归入对应历史切片。"
      : "先保存复盘事实；历史数据载入后会按品类、日期、标的匹配分时与多周期位置。"
  };
}

function buildHistoricalMatchFromMarketContext(context = {}, fallback = {}) {
  const status = context.status || "";
  const stage = getOption(STAGE_POSITIONS, fallback.stagePositionKey);
  const sourceStatusMap = {
    ready: context.sourceStatus || "历史位置已回看",
    missing_cache: "历史数据缓存待载入",
    missing_symbol: "待补充标的后回看",
    failed: "回看服务暂未完成"
  };
  const sourceNoteMap = {
    ready: "已按市场、标的、周期和记录日期回看当时历史片段。",
    missing_cache: "服务端已接通回看链路，等待该品类历史数据缓存载入。",
    missing_symbol: "补充可回看的标的或合约后，系统会重新匹配当时位置。",
    failed: "本地复盘已保存，可稍后重新同步回看。"
  };
  return {
    marketKey: toLocalMarketKey(context.marketKey || fallback.marketKey || "cn"),
    marketLabel: context.marketLabel || getMarketLabel(fallback.marketKey),
    timeframeKey: toLocalTimeframeKey(context.timeframeKey || fallback.timeframeKey || "1d"),
    timeframeLabel: context.timeframeLabel || getTimeframeLabel(fallback.timeframeKey),
    tradeDate: context.tradeDate || fallback.tradeDate || "",
    symbol: context.symbolMasked || fallback.symbol || "待补充",
    stagePosition: context.positionLabel || stage.label,
    stageGate: fallback.stageGate || stage.gate,
    sourceStatus: sourceStatusMap[status] || context.sourceStatus || "历史位置待回看",
    sourceNote: sourceNoteMap[status] || "系统会按真实历史数据回看当时位置。",
    source: context.source || "",
    sourceDataStatus: status || "pending",
    dataStart: context.dataStart || "",
    dataEnd: context.dataEnd || "",
    candleCount: Number(context.candleCount || 0),
    rulesSummary: context.rulesSummary || "",
    reviewPrompt: context.reviewPrompt || "",
    historyMatched: status === "ready"
  };
}

function applyServerTradeReviewResult(record = {}, result = {}) {
  const serverReview = result.review || result.trade_review || {};
  const profile = result.living_mirror_profile || result.livingMirrorProfile || null;
  const marketContext = serverReview.marketContext || serverReview.market_context || (profile || {}).latestMarketContext || null;
  const historicalMatch = marketContext
    ? buildHistoricalMatchFromMarketContext(marketContext, Object.assign({}, record, record.historicalMatch || {}))
    : (record.historicalMatch || buildHistoricalMatch(record));

  const merged = Object.assign({}, record, {
    serverReviewId: serverReview.id || record.serverReviewId || "",
    dataBindingSyncedAt: Date.now(),
    marketContext: marketContext || record.marketContext || null,
    serverLivingMirrorProfile: profile || record.serverLivingMirrorProfile || null,
    historicalMatch,
    marketKey: historicalMatch.marketKey || record.marketKey,
    marketLabel: historicalMatch.marketLabel || record.marketLabel,
    timeframeKey: historicalMatch.timeframeKey || record.timeframeKey,
    timeframeLabel: historicalMatch.timeframeLabel || record.timeframeLabel,
    tradeDate: serverReview.tradeDate || serverReview.trade_date || record.tradeDate,
    symbol: historicalMatch.symbol || serverReview.symbolMasked || serverReview.symbol_masked || record.symbol,
    relatedMirror: serverReview.detectedMirror || serverReview.detected_mirror || record.relatedMirror,
    heartThieves: Array.isArray(serverReview.detectedThieves || serverReview.detected_thieves)
      ? (serverReview.detectedThieves || serverReview.detected_thieves)
      : (record.heartThieves || []),
    verdict: serverReview.reviewText || serverReview.review_text || record.verdict,
    crossEndStatus: serverReview.crossEndStatus || serverReview.cross_end_status || record.crossEndStatus,
    crossEndStatusText: serverReview.crossEndStatusText || serverReview.cross_end_status_text || record.crossEndStatusText,
    crossEndStatusSteps: serverReview.crossEndStatusSteps || serverReview.cross_end_status_steps || record.crossEndStatusSteps,
    statusUpdatedAt: serverReview.statusUpdatedAt || serverReview.status_updated_at || record.statusUpdatedAt,
    updatedAt: Date.now()
  });
  return withTradeReviewCrossEndStatus(merged, { force: true });
}

function toLocalMarketKey(value) {
  const text = String(value || "").toLowerCase();
  if (["cn_equity", "a_share", "ashare", "cn"].includes(text)) return "cn";
  if (["hk_equity", "hk_stock", "hk"].includes(text)) return "hk";
  if (["us_equity", "us_stock", "us"].includes(text)) return "us";
  if (["futures", "future"].includes(text)) return "futures";
  if (["crypto", "digital_currency"].includes(text)) return "crypto";
  return text || "cn";
}

function toLocalTimeframeKey(value) {
  const text = String(value || "").toLowerCase();
  if (text === "1mo") return "1m";
  if (["5m", "10m", "30m", "60m", "1d", "1w", "1m", "1y"].includes(text)) return text;
  return "1d";
}

function withTradeReviewCrossEndStatus(record = {}, context = {}) {
  if (!context.force && !context.trainingCompleted && !context.retested && Array.isArray(record.crossEndStatusSteps) && record.crossEndStatus && record.crossEndStatusText) {
    return record;
  }
  const status = buildTradeReviewCrossEndStatus(record, context);
  return Object.assign({}, record, {
    crossEndStatus: status.key,
    crossEndStatusText: status.label,
    crossEndStatusSteps: status.steps,
    statusUpdatedAt: status.updatedAt
  });
}

function buildTradeReviewCrossEndStatus(record = {}, context = {}) {
  const confirmed = !!String(record.firstThought || record.strongestThought || "").trim() &&
    !!String(record.entryReason || record.exitReason || record.screenshotPath || record.imageUrl || "").trim();
  const historicalMatch = record.historicalMatch || {};
  const marketContext = record.marketContext || {};
  const marketReady = historicalMatch.historyMatched === true || marketContext.status === "ready" || historicalMatch.sourceDataStatus === "ready";
  const mirrored = !!(record.relatedMirror || record.detectedMirror) && !!(record.verdict || record.reviewText || record.oneLine);
  const archived = !!record.id;
  const trained = !!(record.trainingCompleted || context.trainingCompleted);
  const retested = !!(record.retested || context.retested);
  const source = record.sourceType || "miniprogram";
  const doneMap = {
    pending_confirmation: confirmed,
    pending_market_review: marketReady,
    mirrored,
    archived,
    training_pending: trained,
    trained,
    retested
  };
  const currentKey = resolveTradeReviewCurrentStatus({ confirmed, marketReady, mirrored, archived, trained, retested });
  const steps = TRADE_REVIEW_STATUS_STEPS.map((step) => ({
    key: step.key,
    label: step.label,
    done: !!doneMap[step.key],
    current: step.key === currentKey,
    detail: step.detail,
    source
  }));
  const current = steps.find((step) => step.current) || steps[0];
  return {
    key: current.key,
    label: current.label,
    steps,
    updatedAt: Date.now()
  };
}

function resolveTradeReviewCurrentStatus({ confirmed, marketReady, mirrored, archived, trained, retested }) {
  if (!confirmed) return "pending_confirmation";
  if (!marketReady) return "pending_market_review";
  if (!mirrored) return "mirrored";
  if (!archived) return "archived";
  if (!trained) return "training_pending";
  if (!retested) return "trained";
  return "retested";
}

function buildProcessScores(input = {}, type) {
  const action = getOption(ACTION_OPTIONS, input.actionKey);
  const boundary = getOption(BOUNDARY_STATES, input.boundaryState);
  const reactionPenalty = action.type === "平衡型" ? 0 : 14;
  const emotionPenalty = input.emotion && input.emotion !== "平静" ? 8 : 0;
  const planPenalty = input.inPlan === "no" ? 14 : 0;
  const changedPlanPenalty = input.changedPlan === "yes" ? 12 : 0;
  const exitPenalty = input.exitPrepared === "no" ? 10 : 0;
  return {
    awareness: clamp(70 + (input.firstThought ? 12 : -8) + (input.nextAction ? 8 : 0), 20, 96),
    boundary: clamp(boundary.score - exitPenalty, 18, 96),
    execution: clamp(action.score + (boundary.key === "kept" ? 6 : -10) - planPenalty - changedPlanPenalty, 18, 96),
    stability: clamp(82 - reactionPenalty - emotionPenalty - changedPlanPenalty, 18, 96),
    review: clamp(input.nextAction || input.afterReaction ? 86 : 62, 18, 96),
    personalityCalibration: clamp(type === "平衡型" ? 76 : 66, 18, 96)
  };
}

function buildTrainingAction(type, boundaryState) {
  if (type === "冲动型") return "下一次记录前先停十秒，写下理由、边界和复盘依据。";
  if (type === "扛单型") return "下次只练一件事：边界出现后，不再临场解释，先回到预案。";
  if (type === "赌徒型") return "连续不顺后，把动作降到只记录，不让不甘心接管节奏。";
  if (type === "偏执型") return "复盘时写一条反向事实，让它照见想证明自己的念头。";
  if (type === "拖延型") return "今天只完成三行复盘：触发、第一念、下一次边界。";
  if (type === "焦虑型") return "把观察窗口固定下来，窗口外只记录心境，不反复确认。";
  if (boundaryState === "lost") return "先复盘失守前的一念，不急着追求完整解释。";
  return "保持每日小记录，让稳定来自持续省察。";
}

function buildTradeReview(input = {}, context = {}) {
  const keywordRule = matchKeywordMirrorRule(input);
  const type = inferType(input);
  const baseBinding = getMirrorBinding(type);
  const binding = keywordRule ? {
    mirrorName: keywordRule.mirrorName,
    heartMirrorName: keywordRule.mirrorName,
    thieves: keywordRule.thieves,
    virtue: keywordRule.virtue || ""
  } : baseBinding;
  const historicalMatch = buildHistoricalMatch(input);
  const scores = buildProcessScores(input, type);
  const action = getOption(ACTION_OPTIONS, input.actionKey);
  const boundary = getOption(BOUNDARY_STATES, input.boundaryState);
  const report = {
    id: input.id || `tr-${Date.now()}`,
    sourceType: "trade_review",
    screenshotPath: input.screenshotPath || "",
    ocrDraft: input.ocrDraft || null,
    marketKey: historicalMatch.marketKey,
    marketLabel: historicalMatch.marketLabel,
    timeframeKey: historicalMatch.timeframeKey,
    timeframeLabel: historicalMatch.timeframeLabel,
    tradeDate: historicalMatch.tradeDate,
    symbol: historicalMatch.symbol,
    actionKey: action.key,
    actionLabel: action.label,
    emotion: input.emotion || "未记录",
    entryReason: input.entryReason || "未记录",
    exitReason: input.exitReason || "未记录",
    inPlan: input.inPlan || "yes",
    changedPlan: input.changedPlan || "no",
    exitPrepared: input.exitPrepared || "yes",
    afterReaction: input.afterReaction || "未记录",
    nextAction: input.nextAction || "",
    firstThought: input.firstThought || "未记录",
    planBoundary: input.planBoundary || "未记录",
    boundaryState: boundary.key,
    boundaryStateLabel: boundary.label,
    reviewNote: input.reviewNote || "",
    historicalMatch,
    relatedPersonality: type,
    relatedMirror: binding.mirrorName,
    relatedHeartMirror: binding.heartMirrorName,
    heartThieves: binding.thieves,
    virtuePractice: binding.virtue || "",
    stageGate: historicalMatch.stageGate,
    scores,
    oneLine: buildOneLine({ type, input, action, boundary, historicalMatch }),
    verdict: (keywordRule || {}).verdict || buildOneLine({ type, input, action, boundary, historicalMatch }),
    trainingAction: (keywordRule || {}).trainingAction || buildTrainingAction(type, boundary.key),
    evidenceChain: buildEvidenceChain({ input, action, boundary, historicalMatch, binding, context }),
    includeInRetest: true,
    compliance: COMPLIANCE_TEXT,
    createdAt: Date.now()
  };
  return withTradeReviewCrossEndStatus(report, context);
}

function buildTradeReviewRecordView(record = {}) {
  const normalized = withTradeReviewCrossEndStatus(record);
  const scores = record.scores || {};
  const heartThieves = record.heartThieves || [];
  const historicalMatch = record.historicalMatch || {};
  return Object.assign({}, normalized, {
    heartThievesText: heartThieves.length ? heartThieves.join("、") : (record.virtuePractice || "知止、守心、执行"),
    scoreRows: Object.keys(scores).map((key) => ({
      key,
      label: SCORE_LABELS[key] || key,
      value: scores[key],
      displayValue: formatScoreLevel(scores[key])
    })),
    createdAtText: formatDateTime(record.createdAt || record.updatedAt),
    archiveTitle: `${record.tradeDate || "未填日期"} · ${record.marketLabel || historicalMatch.marketLabel || "待定位"}`,
    marketLine: `${record.marketLabel || historicalMatch.marketLabel || "待定位"} · ${record.timeframeLabel || historicalMatch.timeframeLabel || "待周期"} · ${record.symbol || "待补充"}`,
    stageLine: `${historicalMatch.stagePosition || record.stageGate || "待定位"} · ${record.relatedMirror || "待照见"}`,
    sourceLine: historicalMatch.sourceStatus || "待服务端匹配历史分时",
    statusLine: normalized.crossEndStatusText || "待确认"
  });
}

function formatScoreLevel(score) {
  const value = clamp(score, 0, 100);
  if (value <= 20) return `较低 · ${value}`;
  if (value <= 40) return `轻微 · ${value}`;
  if (value <= 60) return `中等 · ${value}`;
  if (value <= 80) return `明显 · ${value}`;
  return `强烈 · ${value}`;
}

function buildTradeReviewClosure(record = {}, reminder = {}) {
  const normalized = withTradeReviewCrossEndStatus(record);
  const heartThieves = record.heartThieves || [];
  const mirrorName = record.relatedMirror || "待照见";
  const trainingAction = reminder.mainTraining || record.trainingAction || "把第一念记录下来。";
  return {
    title: "本次复盘已入活镜",
    mirrorLine: `${mirrorName} · ${heartThieves.length ? heartThieves.join("、") : (record.virtuePractice || "知止、守心、执行")}`,
    trainingAction,
    proofLine: record.oneLine || record.verdict || "这条记录已经进入行为印记。",
    statusText: normalized.crossEndStatusText || "已入镜",
    steps: (normalized.crossEndStatusSteps || []).map((step) => ({
      key: step.key,
      label: step.label,
      value: step.detail,
      done: step.done,
      current: step.current
    })),
    primaryActionText: "查看活镜成长",
    detailActionText: "查看复盘详情",
    klineActionText: "进入 K 线观心"
  };
}

function buildLiveMirrorReminder(tradeReviewState = {}) {
  const records = ((tradeReviewState || {}).records || [])
    .filter(Boolean)
    .slice()
    .sort((a, b) => Number(b.createdAt || b.updatedAt || 0) - Number(a.createdAt || a.updatedAt || 0));
  const recent = records.slice(0, 8);
  if (!recent.length) {
    return {
      hasRecords: false,
      count: 0,
      statusText: "待点亮",
      focusMirror: "活镜未点亮",
      highFrequencyThievesText: "待照见",
      highFrequencyThievesDetail: "上传一条真实记录后生成",
      highFrequencyStage: "待定位",
      stageDetail: "等待历史切片匹配",
      mainTraining: "上传一条真实记录，先照见一次第一念。",
      reminderLine: "把截图、历史位置与第一反应放进活镜，系统会把它沉淀成日常训练数据。",
      primaryActionText: "上传真实记录复盘",
      archiveActionText: "进入复盘档案",
      latest: null
    };
  }

  const thiefCounts = countValues(recent.flatMap((item) => item.heartThieves || []));
  const stageCounts = countValues(recent.map((item) => ((item.historicalMatch || {}).stagePosition || item.stageGate || "待定位")));
  const mirrorCounts = countValues(recent.map((item) => item.relatedMirror || "待照见"));
  const topThieves = topEntries(thiefCounts, 2);
  const topStage = topEntries(stageCounts, 1)[0] || { label: "待定位", count: 0 };
  const topMirror = topEntries(mirrorCounts, 1)[0] || { label: "待照见", count: 0 };
  const latest = buildTradeReviewRecordView(recent[0]);
  const thiefText = topThieves.length ? topThieves.map((item) => item.label).join("、") : "知止、守心";
  const mainThief = topThieves[0] && topThieves[0].label;
  const mainTraining = THIEF_TRAINING_MAP[mainThief] || latest.trainingAction || "保持每日小记录，让稳定来自持续省察。";

  return {
    hasRecords: true,
    count: records.length,
    statusText: `已纳入 ${records.length} 条`,
    focusMirror: topMirror.label,
    highFrequencyThievesText: thiefText,
    highFrequencyThievesDetail: topThieves.length ? `最近 ${recent.length} 条出现 ${topThieves.map((item) => `${item.count} 次`).join(" / ")}` : "最近记录偏向守心",
    highFrequencyStage: topStage.label,
    stageDetail: topStage.count ? `出现 ${topStage.count} 次` : "待定位",
    mainTraining,
    reminderLine: `最近的真实记录里，「${thiefText}」最常浮现；先把主修落到一件事：${mainTraining}`,
    primaryActionText: "继续上传真实记录",
    archiveActionText: "进入复盘档案",
    latest
  };
}

function buildOneLine({ type, input, action, boundary, historicalMatch }) {
  if (boundary.key === "lost") {
    return `这次记录照见：在「${historicalMatch.stagePosition}」里，最先失守的不是规则，而是「${input.firstThought || action.label}」这一念。`;
  }
  if (type === "平衡型") {
    return `这次记录照见：你能把「${action.label}」带回边界，继续保持复盘。`;
  }
  return `这次记录照见：在「${historicalMatch.stagePosition}」里，「${action.label}」更像${getMirrorBinding(type).mirrorName}的显现。`;
}

function buildEvidenceChain({ input, action, boundary, historicalMatch, binding, context }) {
  return [
    { label: "截图记录", value: input.screenshotPath ? "已上传" : "待上传", detail: "用于保留真实交易事实。" },
    { label: "历史位置", value: historicalMatch.stagePosition, detail: `${historicalMatch.marketLabel} · ${historicalMatch.timeframeLabel} · ${historicalMatch.sourceStatus}` },
    { label: "计划状态", value: input.inPlan === "no" ? "计划外" : "计划内", detail: input.changedPlan === "yes" ? "曾临盘改计划。" : "未记录临盘改计划。" },
    { label: "行动理由", value: input.entryReason || "待补充", detail: "用于照见行动前的第一层依据。" },
    { label: "边界理由", value: input.exitReason || "待补充", detail: "用于照见边界触碰后的反应。" },
    { label: "边界条件", value: input.exitPrepared === "no" ? "未写清" : "已写清", detail: "用于照见边界是否提前立住。" },
    { label: "第一反应", value: action.label, detail: input.firstThought || "第一念待补充。" },
    { label: "事后反应", value: input.afterReaction || "待补充", detail: input.nextAction || "下一次动作待补充。" },
    { label: "守界状态", value: boundary.label, detail: input.planBoundary || "边界待补充。" },
    { label: "九镜六贼", value: binding.mirrorName, detail: (binding.thieves || []).length ? `对应：${binding.thieves.join("、")}` : (binding.virtue || "知止、守心、执行") },
    { label: "档案联通", value: (context.assessment || {}).primary || "待照见", detail: "会进入小程序、网页与后续 App 的行为印记。" }
  ];
}

function buildLivingMirrorStats(tradeReviewState = {}) {
  const records = ((tradeReviewState || {}).records || [])
    .filter(Boolean)
    .slice()
    .sort((a, b) => Number(a.createdAt || a.updatedAt || 0) - Number(b.createdAt || b.updatedAt || 0));
  const recent = records.slice(-14).reverse();
  const lastSeven = records.slice(-7);
  const prevSeven = records.slice(-14, -7);
  const mirrorScores = countValues(records.map((item) => item.relatedMirror || "待照见"));
  const thiefCounts = countValues(records.flatMap((item) => item.heartThieves || []));
  const behaviorTags = countValues(records.map((item) => item.actionLabel || "待记录"));
  const mirrorTrendRows = buildMirrorTrendRows(lastSeven, prevSeven);
  const currentMirror = topEntries(mirrorScores, 1)[0] || { label: "活镜未点亮", count: 0 };
  const topThieves = topEntries(thiefCounts, 2);
  const topThievesText = topThieves.length ? topThieves.map((item) => item.label).join(" / ") : "待照见";
  const reminder = buildLiveMirrorReminder(tradeReviewState);

  return {
    updatedAt: Date.now(),
    totalReviews: records.length,
    currentMirror: currentMirror.label,
    currentMirrorCount: currentMirror.count,
    topThieves: topThieves.map((item) => item.label),
    topThievesText,
    mirrorScores,
    thiefCounts,
    behaviorTags,
    mirrorTrendRows,
    reviewHistory: recent.slice(0, 20).map((item) => ({
      id: item.id,
      date: item.tradeDate || formatDateTime(item.createdAt || item.updatedAt).slice(0, 10),
      mirror: item.relatedMirror || "待照见",
      thought: item.firstThought || item.actionLabel || "待记录",
      marketLabel: item.marketLabel || "",
      timeframeLabel: item.timeframeLabel || "",
      symbol: item.symbol || ""
    })),
    recentThree: recent.slice(0, 3).map((item) => ({
      id: item.id,
      line: `${formatShortDate(item.tradeDate || item.createdAt || item.updatedAt)} ${item.relatedMirror || "待照见"}：${item.firstThought || item.actionLabel || "待记录"}`
    })),
    todayReminder: reminder.reminderLine,
    mainTraining: reminder.mainTraining,
    assistantHandoff: buildAssistantHandoff({ records, stats: { currentMirror: currentMirror.label, topThievesText, reminder } }),
    compliance: COMPLIANCE_TEXT
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value || 0))));
}

function countValues(values) {
  return (values || []).reduce((counts, value) => {
    const key = String(value || "").trim();
    if (!key) return counts;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function topEntries(counts, limit) {
  return Object.keys(counts || {})
    .map((label) => ({ label, count: counts[label] }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)))
    .slice(0, limit);
}

function formatDateTime(value) {
  const timestamp = Number(value || 0);
  if (!timestamp) return "未记录时间";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "未记录时间";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatShortDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(5, 10);
  const timestamp = Number(value || 0);
  if (!timestamp) return "待记";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "待记";
  const pad = (number) => String(number).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function buildMirrorTrendRows(currentRecords, previousRecords) {
  const currentCounts = countValues((currentRecords || []).map((item) => item.relatedMirror || "待照见"));
  const previousCounts = countValues((previousRecords || []).map((item) => item.relatedMirror || "待照见"));
  const labels = Array.from(new Set(Object.keys(currentCounts).concat(Object.keys(previousCounts))))
    .filter((label) => label !== "待照见");
  if (!labels.length) {
    return [
      { mirror: "追涨之镜", direction: "待沉淀", percent: "0%", tone: "flat" },
      { mirror: "焦虑之镜", direction: "待沉淀", percent: "0%", tone: "flat" },
      { mirror: "良知之镜", direction: "待沉淀", percent: "0%", tone: "flat" }
    ];
  }
  return labels
    .map((label) => {
      const current = currentCounts[label] || 0;
      const previous = previousCounts[label] || 0;
      const delta = current - previous;
      const percent = `${Math.abs(delta) * 8 || (current ? 6 : 0)}%`;
      return {
        mirror: label,
        direction: delta > 0 ? "↑" : delta < 0 ? "↓" : "—",
        percent,
        tone: label === "良知之镜" ? (delta >= 0 ? "up" : "down") : (delta > 0 ? "warn" : delta < 0 ? "down" : "flat")
      };
    })
    .sort((a, b) => {
      if (a.mirror === "良知之镜") return -1;
      if (b.mirror === "良知之镜") return 1;
      return a.mirror.localeCompare(b.mirror);
    })
    .slice(0, 4);
}

function buildAssistantHandoff({ records = [], stats = {} } = {}) {
  const latest = records[records.length - 1] || {};
  return {
    currentMirror: stats.currentMirror || "待照见",
    secondaryMirror: (records.slice().reverse().find((item) => item.relatedMirror && item.relatedMirror !== stats.currentMirror) || {}).relatedMirror || "待沉淀",
    highFrequencyThieves: stats.topThievesText || "待照见",
    recentThought: latest.firstThought || "待记录",
    riskTags: [stats.currentMirror, stats.topThievesText].filter(Boolean).join(" · ") || "待沉淀",
    suggestedTrainingAction: (stats.reminder || {}).mainTraining || latest.trainingAction || "先完成一次真实复盘。",
    campSuggestion: records.length >= 3 ? "建议进入连续 7 天观心训练。" : "先完成三次真实复盘，再进入阶段训练。",
    scriptSuggestion: `你最近明显是${stats.currentMirror || "某一面心镜"}偏强。今天先不谈行情，只练一件事：${(stats.reminder || {}).mainTraining || "把第一念记录下来。"}`
  };
}

module.exports = {
  COMPLIANCE_TEXT,
  ACTION_OPTIONS,
  EMOTION_OPTIONS,
  BOUNDARY_STATES,
  STAGE_POSITIONS,
  SCORE_LABELS,
  buildHistoricalMatch,
  buildHistoricalMatchFromMarketContext,
  applyServerTradeReviewResult,
  buildTradeReviewCrossEndStatus,
  withTradeReviewCrossEndStatus,
  buildTradeReview,
  buildTradeReviewRecordView,
  buildTradeReviewClosure,
  buildLiveMirrorReminder,
  buildLivingMirrorStats
};
