const { normalizeTradeReviewRecord } = require("../trade-review/index");

const DEFAULT_EMPTY_TEXT = "本周样本不足。完成真实复盘或 K线训练后生成本周活镜。";

const WEEKLY_TRAINING_PLANS = {
  追高冲动: {
    title: "追高冲动专项",
    focus: "放量拉升 / 假突破 / 冲高回落",
    action: "第一根放量不追，先停十秒"
  },
  扛单被套: {
    title: "扛单被套专项",
    focus: "破位下跌 / 弱反弹 / 连续阴跌",
    action: "破位认错，不用希望代替规则"
  },
  卖飞懊悔: {
    title: "卖飞懊悔专项",
    focus: "洗盘后走强 / 趋势中继",
    action: "按趋势规则持有"
  },
  补仓冲动: {
    title: "补仓冲动专项",
    focus: "下跌中继 / 反抽诱多",
    action: "不在破位亏损中补仓"
  },
  计划外交易: {
    title: "计划外交易专项",
    focus: "横盘噪音 / 突然异动",
    action: "无计划不交易"
  },
  盈利拿不住: {
    title: "盈利拿不住专项",
    focus: "小幅回撤 / 趋势未破",
    action: "盈利按规则拿"
  },
  空仓焦虑: {
    title: "空仓焦虑专项",
    focus: "普涨行情 / 快速反弹",
    action: "空仓也是按计划执行"
  },
  急于翻本: {
    title: "急于翻本专项",
    focus: "连续亏损后反弹诱多",
    action: "亏损后停止，先复盘"
  }
};

function asArray(state, keys = ["records", "reports", "sessions", "items"]) {
  if (Array.isArray(state)) return state;
  if (!state || typeof state !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(state[key])) return state[key];
  }
  return [];
}

function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value !== null && value !== undefined && typeof value !== "object") {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return "";
}

function pickNested(record, ...keys) {
  const card = record.trainingMistakeCard || record.mistakeCard || record.card || {};
  for (const key of keys) {
    const value = record[key] !== undefined ? record[key] : card[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function getTimestamp(value) {
  if (!value) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const date = new Date(value);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getWeekStart(timestamp) {
  const date = new Date(timestamp || Date.now());
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date.getTime();
}

function formatDateLabel(timestamp) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

function formatWeekRange(start) {
  const end = start + 6 * 24 * 60 * 60 * 1000;
  return `${formatDateLabel(start)}-${formatDateLabel(end)}`;
}

function normalizeExecutionResult(value) {
  const text = firstText(value).toLowerCase();
  if (!text) return "";
  if (["aligned", "consistent", "planned", "按计划执行"].includes(text)) return "aligned";
  if (["deviated", "deviation", "off_plan", "执行偏离"].includes(text)) return "deviated";
  if (["unclear", "unknown", "说不清", "样本不足"].includes(text)) return "unclear";
  if (text.includes("偏离") || text.includes("复现")) return "deviated";
  if (text.includes("按计划") || text.includes("一致")) return "aligned";
  return "";
}

function normalizeRepeatCount(record = {}) {
  const value = pickNested(record, "repeatCount", "repeat_count", "oldQuestionRepeat", "old_question_repeat");
  const number = Number(value || 0);
  if (Number.isFinite(number) && number > 0) return number;
  const repeatFlag = pickNested(record, "isRepeatError", "is_repeat_error", "isOldQuestionRepeat", "is_old_question_repeat");
  return repeatFlag === true ? 1 : 0;
}

function normalizeReviewItem(record = {}) {
  const normalized = normalizeTradeReviewRecord(record);
  return {
    sourceType: "review",
    timestamp: getTimestamp(
      normalized.createdAt || normalized.created_at || normalized.date || normalized.reviewDate || normalized.review_date ||
      record.createdAt || record.created_at || record.date || record.reviewDate || record.review_date
    ),
    errorType: firstText(normalized.mainErrorType, normalized.main_error_type, record.mainErrorType, record.main_error_type),
    firstThought: firstText(normalized.firstThought, normalized.first_thought, record.firstThought, record.first_thought),
    triggerScene: firstText(normalized.triggerScene, normalized.trigger_scene, record.triggerScene, record.trigger_scene),
    nextAction: firstText(normalized.nextRule, normalized.next_rule, record.nextRule, record.next_rule),
    executionResult: normalizeExecutionResult(
      record.executionResult || record.execution_result || record.lawResult || record.law_result ||
      normalized.executionResult || normalized.execution_result || normalized.lawResult || normalized.law_result
    ),
    repeatCount: normalizeRepeatCount(normalized)
  };
}

function normalizeTrainingItem(record = {}) {
  return {
    sourceType: "training",
    timestamp: getTimestamp(
      pickNested(record, "createdAt", "created_at", "endTime", "end_time", "startTime", "start_time", "date")
    ),
    errorType: firstText(
      pickNested(record, "mainErrorType", "main_error_type", "errorType", "error_type")
    ),
    firstThought: firstText(pickNested(record, "firstThought", "first_thought")),
    triggerScene: firstText(pickNested(record, "triggerScene", "trigger_scene", "sceneTag", "scene_tag")),
    nextAction: firstText(pickNested(record, "nextRule", "next_rule", "nextAction", "next_action", "expectedAction", "expected_action")),
    executionResult: normalizeExecutionResult(pickNested(record, "executionResult", "execution_result", "lawResult", "law_result")),
    repeatCount: normalizeRepeatCount(record)
  };
}

function collectItems({ tradeReviewState, klineReviewReports, klineSessionState } = {}) {
  const reviewItems = asArray(tradeReviewState).map(normalizeReviewItem);
  const klineReportItems = asArray(klineReviewReports).map(normalizeTrainingItem);
  const klineSessionItems = asArray(klineSessionState).map(normalizeTrainingItem);
  return reviewItems.concat(klineReportItems, klineSessionItems).filter((item) => item.timestamp);
}

function countValues(items, key) {
  return items.reduce((counts, item) => {
    const label = firstText(item[key]);
    if (!label || label === "待补充") return counts;
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
}

function rankCounts(counts, limit = 3) {
  return Object.keys(counts)
    .map((label) => ({ label, count: counts[label], text: `${label} ${counts[label]} 次` }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function buildTopMetric(ranked = []) {
  const top = ranked[0];
  if (!top) return { label: "样本不足", count: 0, text: "样本不足" };
  return top;
}

function buildExecutionConsistency(items = []) {
  const results = items.map((item) => item.executionResult).filter((value) => value && value !== "unclear");
  const alignedCount = results.filter((value) => value === "aligned").length;
  const deviatedCount = results.filter((value) => value === "deviated").length;
  const sampleCount = alignedCount + deviatedCount;
  if (!sampleCount) {
    return {
      hasStats: false,
      alignedCount: 0,
      deviatedCount: 0,
      sampleCount: 0,
      rate: null,
      rateText: "样本不足",
      text: "样本不足"
    };
  }
  const rate = Math.round((alignedCount / sampleCount) * 100);
  return {
    hasStats: true,
    alignedCount,
    deviatedCount,
    sampleCount,
    rate,
    rateText: `${rate}%`,
    text: `执行一致率 ${rate}%`
  };
}

function buildOldQuestionRepeat(items, topErrors) {
  const explicit = items.reduce((sum, item) => sum + (Number(item.repeatCount || 0) || 0), 0);
  const derived = topErrors.reduce((sum, item) => sum + Math.max(0, item.count - 1), 0);
  const count = Math.max(explicit, derived);
  if (!items.length) return { count: 0, text: "样本不足" };
  if (!count) return { count: 0, text: "本周暂无旧题复现" };
  return { count, text: `${count} 次` };
}

function buildProgress(currentConsistency, previousConsistency) {
  if (!currentConsistency.hasStats || !previousConsistency.hasStats) {
    return { hasStats: false, text: "样本不足，先完成更多真实复盘和 K线训练。" };
  }
  const diff = currentConsistency.rate - previousConsistency.rate;
  if (diff > 0) return { hasStats: true, text: `执行一致率较上周提升 ${diff} 个点` };
  if (diff < 0) return { hasStats: true, text: `执行一致率较上周回落 ${Math.abs(diff)} 个点` };
  return { hasStats: true, text: "执行一致率与上周持平" };
}

function buildNextWeekPlans(topErrors) {
  return topErrors
    .map((item) => {
      const plan = WEEKLY_TRAINING_PLANS[item.label];
      if (!plan) return null;
      return {
        errorType: item.label,
        title: plan.title,
        focus: plan.focus,
        action: plan.action
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

function buildWeeklyLivingMirrorReport({ tradeReviewState, klineReviewReports, klineSessionState, now } = {}) {
  const nowTime = getTimestamp(now) || Date.now();
  const weekStart = getWeekStart(nowTime);
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
  const previousWeekStart = weekStart - 7 * 24 * 60 * 60 * 1000;
  const items = collectItems({ tradeReviewState, klineReviewReports, klineSessionState });
  const currentWeekItems = items.filter((item) => item.timestamp >= weekStart && item.timestamp < weekEnd);
  const previousWeekItems = items.filter((item) => item.timestamp >= previousWeekStart && item.timestamp < weekStart);
  const topErrors = rankCounts(countValues(currentWeekItems, "errorType"));
  const topFirstThoughts = rankCounts(countValues(currentWeekItems, "firstThought"));
  const currentConsistency = buildExecutionConsistency(currentWeekItems);
  const previousConsistency = buildExecutionConsistency(previousWeekItems);
  const hasStats = currentWeekItems.length > 0;

  return {
    hasStats,
    total: currentWeekItems.length,
    weekRangeText: formatWeekRange(weekStart),
    topError: buildTopMetric(topErrors),
    topFirstThought: buildTopMetric(topFirstThoughts),
    executionConsistency: currentConsistency,
    oldQuestionRepeat: buildOldQuestionRepeat(currentWeekItems, topErrors),
    progress: buildProgress(currentConsistency, previousConsistency),
    nextWeekPlans: hasStats ? buildNextWeekPlans(topErrors) : [],
    emptyText: DEFAULT_EMPTY_TEXT
  };
}

module.exports = {
  buildWeeklyLivingMirrorReport,
  WEEKLY_TRAINING_PLANS
};
