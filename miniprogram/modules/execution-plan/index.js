const DEFAULT_NOW = "2026-01-01T00:00:00.000Z";

const DEFAULT_EXECUTION_PLANS = [
  {
    id: "default-chase-high",
    source: "default",
    title: "追高冲动执行计划",
    errorType: "追高冲动",
    aliases: ["追高", "追涨", "追涨之镜", "怕错过"],
    sceneTags: ["放量拉升", "假突破", "冲高回落", "突然异动"],
    firstThoughts: ["怕错过"],
    forbiddenActions: ["第一根放量不追"],
    expectedAction: "先观察，等回踩确认",
    nextAction: "先观察，等回踩确认",
    trainingPrescription: "追高冲动专项"
  },
  {
    id: "default-add-position",
    source: "default",
    title: "补仓冲动执行计划",
    errorType: "补仓冲动",
    aliases: ["补仓", "补仓冲动"],
    sceneTags: ["下跌中继", "反抽诱多", "破位亏损"],
    firstThoughts: ["想补仓", "不甘心"],
    forbiddenActions: ["不在破位亏损中补仓"],
    expectedAction: "先确认是否破位，不用补仓证明自己",
    nextAction: "先确认是否破位，不用补仓证明自己",
    trainingPrescription: "补仓冲动专项"
  },
  {
    id: "default-sell-regret",
    source: "default",
    title: "卖飞懊悔执行计划",
    errorType: "卖飞懊悔",
    aliases: ["卖飞", "懊悔", "卖飞懊悔"],
    sceneTags: ["洗盘后走强", "趋势中继", "卖出后继续上涨"],
    firstThoughts: ["不甘心", "怕卖飞"],
    forbiddenActions: ["不因懊悔追回情绪单"],
    expectedAction: "按计划处理，不追回已错过的动作",
    nextAction: "按计划处理，不追回已错过的动作",
    trainingPrescription: "卖飞懊悔专项"
  },
  {
    id: "default-planless",
    source: "default",
    title: "计划外交易执行计划",
    errorType: "计划外交易",
    aliases: ["计划外", "无计划", "临场", "手痒"],
    sceneTags: ["横盘噪音", "突然异动", "群体情绪刺激"],
    firstThoughts: ["想证明", "怕错过", "手痒"],
    forbiddenActions: ["无计划不交易"],
    expectedAction: "先记录，不下单",
    nextAction: "先记录，不下单",
    trainingPrescription: "计划外交易专项"
  }
];

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function pickValue(...values) {
  for (let index = 0; index < values.length; index += 1) {
    if (hasValue(values[index])) return values[index];
  }
  return "";
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[、,，/]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeTrainingPrescription(value, fallbackAction) {
  if (value && typeof value === "object") {
    return Object.assign({}, value, {
      action: value.action || fallbackAction || ""
    });
  }
  const text = String(value || fallbackAction || "").trim();
  return {
    title: text || "执行计划训练处方",
    action: text || fallbackAction || ""
  };
}

function findDefaultPlanForErrorType(errorType = "") {
  const text = String(errorType || "").trim();
  return DEFAULT_EXECUTION_PLANS.find((plan) => {
    const candidates = [plan.errorType, ...(plan.aliases || [])];
    return candidates.some((candidate) => {
      const key = String(candidate || "").trim();
      return text === key || (key.length >= 3 && text.includes(key));
    });
  }) || null;
}

function normalizeExecutionPlan(plan = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const id = plan.id || options.id || `execution-plan-${Date.now()}`;
  const source = plan.source || options.source || "custom";
  const errorType = String(pickValue(plan.errorType, plan.error_type, options.errorType) || "").trim();
  const expectedAction = String(pickValue(plan.expectedAction, plan.expected_action, plan.nextAction, plan.next_action) || "").trim();
  const nextAction = String(pickValue(plan.nextAction, plan.next_action, expectedAction) || "").trim();
  const trainingPrescription = normalizeTrainingPrescription(
    pickValue(plan.trainingPrescription, plan.training_prescription),
    pickValue(nextAction, expectedAction)
  );
  const sceneTags = normalizeList(pickValue(plan.sceneTags, plan.scene_tags));
  const firstThoughts = normalizeList(pickValue(plan.firstThoughts, plan.first_thoughts));
  const forbiddenActions = normalizeList(pickValue(plan.forbiddenActions, plan.forbidden_actions));
  const defaultPlan = findDefaultPlanForErrorType(errorType);
  const aliases = Array.from(new Set(normalizeList(plan.aliases).concat((defaultPlan || {}).aliases || [])));
  const createdAt = plan.createdAt || plan.created_at || now;
  const updatedAt = plan.updatedAt || plan.updated_at || now;
  const userId = plan.userId || plan.user_id || options.userId || "";
  const title = String(plan.title || (errorType ? `${errorType}执行计划` : "执行计划")).trim();
  return {
    id,
    source,
    userId,
    user_id: userId,
    title,
    errorType,
    error_type: errorType,
    aliases,
    sceneTags,
    scene_tags: sceneTags,
    firstThoughts,
    first_thoughts: firstThoughts,
    forbiddenActions,
    forbidden_actions: forbiddenActions,
    expectedAction,
    expected_action: expectedAction,
    nextAction,
    next_action: nextAction,
    trainingPrescription,
    training_prescription: trainingPrescription,
    enabled: plan.enabled === undefined ? true : !!plan.enabled,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt
  };
}

function buildDefaultRecords(now = DEFAULT_NOW) {
  return DEFAULT_EXECUTION_PLANS.map((plan) => normalizeExecutionPlan(plan, {
    id: plan.id,
    source: "default",
    now
  }));
}

function buildExecutionPlanLibrary(state = {}) {
  const inputRecords = Array.isArray(state.records) ? state.records : [];
  const recordMap = {};
  buildDefaultRecords().forEach((plan) => {
    recordMap[plan.id] = plan;
  });
  inputRecords.forEach((item) => {
    const normalized = normalizeExecutionPlan(item);
    recordMap[normalized.id] = normalized;
  });
  const records = Object.keys(recordMap).map((id) => recordMap[id]);
  const latest = state.latest ? normalizeExecutionPlan(state.latest) : (records[0] || null);
  return {
    latest,
    records,
    updatedAt: state.updatedAt || state.updated_at || Date.now(),
    updated_at: state.updated_at || state.updatedAt || Date.now()
  };
}

function createExecutionPlan(input = {}, options = {}) {
  return normalizeExecutionPlan(input, {
    id: options.id,
    userId: options.userId,
    now: options.now,
    source: "custom"
  });
}

function updateExecutionPlan(state = {}, id, patch = {}) {
  const library = buildExecutionPlanLibrary(state);
  const now = patch.updatedAt || patch.updated_at || new Date().toISOString();
  const records = library.records.map((item) => {
    if (item.id !== id) return item;
    return normalizeExecutionPlan(Object.assign({}, item, patch, {
      id: item.id,
      source: item.source,
      createdAt: item.createdAt,
      created_at: item.created_at,
      updatedAt: now,
      updated_at: now
    }));
  });
  const latest = records.find((item) => item.id === id) || library.latest;
  return buildExecutionPlanLibrary({
    latest,
    records,
    updatedAt: Date.now()
  });
}

function deleteExecutionPlan(state = {}, id) {
  const library = buildExecutionPlanLibrary(state);
  const target = library.records.find((item) => item.id === id);
  if (!target) return library;
  if (target.source === "default") {
    return updateExecutionPlan(library, id, { enabled: false });
  }
  const records = library.records.filter((item) => item.id !== id);
  return buildExecutionPlanLibrary({
    latest: records[0] || null,
    records,
    updatedAt: Date.now()
  });
}

function planMatchesErrorType(plan = {}, errorType = "") {
  const text = String(errorType || "").trim();
  if (!text || !plan.enabled) return false;
  const candidates = [
    plan.errorType,
    plan.error_type,
    plan.title,
    ...(plan.aliases || [])
  ].map((item) => String(item || "").trim()).filter(Boolean);
  return candidates.some((candidate) => {
    const key = String(candidate || "").trim();
    return text === key || (key.length >= 3 && (text.includes(key) || key.includes(text)));
  });
}

function findExecutionPlanForErrorType(errorType, state = {}) {
  const library = buildExecutionPlanLibrary(state || {});
  const records = (library.records || []).filter((item) => item.enabled);
  const customMatch = records.find((item) => item.source !== "default" && planMatchesErrorType(item, errorType));
  if (customMatch) return customMatch;
  return records.find((item) => item.source === "default" && planMatchesErrorType(item, errorType)) || null;
}

function resolveExecutionPlanAction(errorType, state = {}) {
  const plan = findExecutionPlanForErrorType(errorType, state);
  if (!plan) return null;
  return {
    plan,
    planId: plan.id,
    plan_id: plan.id,
    title: plan.title,
    errorType: plan.errorType,
    error_type: plan.error_type,
    expectedAction: plan.expectedAction,
    expected_action: plan.expected_action,
    nextAction: plan.nextAction || plan.expectedAction,
    next_action: plan.next_action || plan.expected_action,
    trainingPrescription: plan.trainingPrescription,
    training_prescription: plan.training_prescription
  };
}

module.exports = {
  DEFAULT_EXECUTION_PLANS,
  buildExecutionPlanLibrary,
  normalizeExecutionPlan,
  createExecutionPlan,
  updateExecutionPlan,
  deleteExecutionPlan,
  findExecutionPlanForErrorType,
  resolveExecutionPlanAction
};
