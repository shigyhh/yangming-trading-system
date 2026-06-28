const EXECUTION_RESULT_LABELS = {
  aligned: "按计划执行",
  kept: "按计划执行",
  "守住": "按计划执行",
  "按计划执行": "按计划执行",
  deviated: "执行偏离",
  broken: "执行偏离",
  "破法": "执行偏离",
  "执行偏离": "执行偏离",
  unclear: "说不清",
  unknown: "说不清",
  "缺失": "说不清",
  "说不清": "说不清",
  "暂无明确执行结果": "说不清"
};

function normalizeExecutionResult(...values) {
  for (let index = 0; index < values.length; index += 1) {
    const normalized = normalizeExecutionResultValue(values[index], "");
    if (normalized) return normalized;
  }
  return "说不清";
}

function normalizeExecutionResultValue(value, fallback = "说不清") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  const lower = text.toLowerCase();
  return EXECUTION_RESULT_LABELS[text] || EXECUTION_RESULT_LABELS[lower] || text;
}

module.exports = {
  normalizeExecutionResult,
  normalizeExecutionResultValue
};
