const DAY_MS = 24 * 60 * 60 * 1000;

const ZHIXING_REMINDER_CHOICES = [
  "继续",
  "改为观望",
  "稍后再练",
  "本局不再提醒"
];

const ERROR_PLANS = {
  "追高冲动": {
    sceneTags: ["放量拉升", "假突破", "冲高回落"],
    actionText: "第一根放量不追，先停十秒",
    prescription: "追高冲动专项：放量拉升 / 假突破 / 冲高回落"
  },
  "扛单被套": {
    sceneTags: ["破位下跌", "弱反弹", "连续阴跌"],
    actionText: "破位认错，不用希望代替规则",
    prescription: "扛单被套专项：破位下跌 / 弱反弹 / 连续阴跌"
  },
  "卖飞懊悔": {
    sceneTags: ["洗盘后走强", "趋势中继"],
    actionText: "按趋势规则持有",
    prescription: "卖飞懊悔专项：趋势持有 / 洗盘后走强"
  },
  "补仓冲动": {
    sceneTags: ["下跌中继", "反抽诱多"],
    actionText: "不在破位亏损中补仓",
    prescription: "补仓冲动专项：下跌中继 / 反抽诱多"
  },
  "计划外交易": {
    sceneTags: ["横盘噪音", "突然异动"],
    actionText: "无计划不交易",
    prescription: "计划外交易专项：无计划不交易"
  },
  "盈利拿不住": {
    sceneTags: ["小幅回撤", "趋势未破"],
    actionText: "盈利按规则拿",
    prescription: "盈利拿不住专项：趋势未破不提前卖"
  },
  "空仓焦虑": {
    sceneTags: ["普涨行情", "快速反弹"],
    actionText: "空仓也是按计划执行",
    prescription: "空仓焦虑专项：空仓等待"
  },
  "急于翻本": {
    sceneTags: ["连续亏损后反弹诱多"],
    actionText: "亏损后停止，先复盘",
    prescription: "急于翻本专项：亏损后停止交易"
  }
};

function normalizeText(value = "") {
  return String(value || "").trim();
}

function readErrorType(record = {}) {
  return normalizeText(record.errorType || record.error_type || record.mainErrorType || record.main_error_type);
}

function readSceneTag(record = {}) {
  return normalizeText(record.sceneTag || record.scene_tag || record.triggerScene || record.trigger_scene);
}

function readCreatedAt(record = {}) {
  const raw = record.createdAt || record.created_at || record.updatedAt || record.updated_at || record.date || record.tradeDate;
  if (!raw) return 0;
  if (typeof raw === "number") return raw;
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPlan(errorType) {
  return ERROR_PLANS[normalizeText(errorType)] || null;
}

function buildReminder(payload = {}) {
  const triggerType = normalizeText(payload.triggerType);
  const errorType = normalizeText(payload.errorType);
  const sceneTag = normalizeText(payload.sceneTag);
  const message = normalizeText(payload.message);
  return {
    triggerType,
    trigger_type: triggerType,
    errorType,
    error_type: errorType,
    sceneTag,
    scene_tag: sceneTag,
    title: normalizeText(payload.title) || "知行提醒",
    message,
    choices: ZHIXING_REMINDER_CHOICES.slice(),
    repeatCount: Number(payload.repeatCount || 0),
    repeat_count: Number(payload.repeatCount || 0)
  };
}

function buildTrainingPreReminder({ errorType = "", sceneTag = "" } = {}) {
  const plan = getPlan(errorType);
  if (!plan) return null;
  const mainScene = normalizeText(sceneTag) || plan.sceneTags[0] || "";
  return buildReminder({
    triggerType: "training_pre",
    errorType,
    sceneTag: mainScene,
    message: [
      `这是你的高频旧题：${normalizeText(errorType)}。`,
      `本次只练一个动作：${plan.actionText}。`
    ].join("\n")
  });
}

function buildTrainingSceneReminder({
  errorType = "",
  sceneTag = "",
  shownCount = 0,
  maxPerSession = 2,
  disabled = false
} = {}) {
  if (disabled) return null;
  if (Number(shownCount || 0) >= Number(maxPerSession || 2)) return null;
  const plan = getPlan(errorType);
  if (!plan) return null;
  const safeScene = normalizeText(sceneTag);
  if (safeScene && plan.sceneTags.indexOf(safeScene) < 0) return null;
  const displayScene = safeScene || plan.sceneTags[0] || "";
  return buildReminder({
    triggerType: "training_scene",
    errorType,
    sceneTag: displayScene,
    message: [
      `暂停一下，这里接近你的高频旧题：${normalizeText(errorType)}。`,
      `场景：${displayScene || "当前片段"}。`,
      `本局动作：${plan.actionText}。`
    ].join("\n")
  });
}

function buildReviewRepeatReminder({
  records = [],
  currentRecord = {},
  now = Date.now(),
  threshold = 2,
  windowDays = 30
} = {}) {
  const errorType = readErrorType(currentRecord);
  const plan = getPlan(errorType);
  if (!plan) return null;
  const start = Number(now || Date.now()) - Number(windowDays || 30) * DAY_MS;
  const count = (Array.isArray(records) ? records : [])
    .filter((record) => readErrorType(record) === errorType)
    .filter((record) => {
      const ts = readCreatedAt(record);
      return ts ? ts >= start && ts <= Number(now || Date.now()) : true;
    }).length;

  if (count < Number(threshold || 2)) return null;
  const sceneTag = readSceneTag(currentRecord) || plan.sceneTags[0] || "";
  return buildReminder({
    triggerType: "review_repeat",
    errorType,
    sceneTag,
    repeatCount: count,
    message: [
      `旧题复现：这是你近 ${windowDays} 天第 ${count} 次出现「${errorType}」。`,
      `下次执行动作：${plan.actionText}。`,
      `已为你保留到${plan.prescription}。`
    ].join("\n")
  });
}

function createInterventionEvent({
  triggerType = "",
  errorType = "",
  sceneTag = "",
  message = "",
  userResponse = "",
  createdAt = Date.now()
} = {}) {
  const id = `intervention-${Number(createdAt || Date.now()).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    triggerType: normalizeText(triggerType),
    trigger_type: normalizeText(triggerType),
    errorType: normalizeText(errorType),
    error_type: normalizeText(errorType),
    sceneTag: normalizeText(sceneTag),
    scene_tag: normalizeText(sceneTag),
    message: normalizeText(message),
    userResponse: normalizeText(userResponse),
    user_response: normalizeText(userResponse),
    createdAt,
    created_at: createdAt
  };
}

module.exports = {
  ZHIXING_REMINDER_CHOICES,
  ERROR_PLANS,
  buildTrainingPreReminder,
  buildTrainingSceneReminder,
  buildReviewRepeatReminder,
  createInterventionEvent
};
