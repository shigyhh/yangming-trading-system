import { randomUUID } from "node:crypto";
import { readRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const TRAINING_PACKS_FILE = "training-packs.json";

const DEFAULT_TRAINING_PACKS = [
  {
    id: "pack-chasing-surge",
    title: "追高冲动专项",
    errorType: "追高冲动",
    sceneTags: ["放量拉升", "假突破", "冲高回落"],
    trainingGoal: "看到快速上涨时，不被怕错过牵动",
    expectedAction: "第一根放量不追，先观察",
    defaultPrompt: "先照见怕错过的一念，再复核计划边界",
    trainingPrescription: "追高冲动专项训练",
    difficulty: "初级",
    enabled: true,
    sortOrder: 10
  },
  {
    id: "pack-averaging-down",
    title: "补仓冲动专项",
    errorType: "补仓冲动",
    sceneTags: ["下跌中继", "反抽诱多", "破位亏损"],
    trainingGoal: "亏损中不靠补仓证明自己",
    expectedAction: "不在破位亏损中补仓",
    defaultPrompt: "先确认计划是否仍成立，再记录补仓冲动",
    trainingPrescription: "补仓冲动专项训练",
    difficulty: "初级",
    enabled: true,
    sortOrder: 20
  },
  {
    id: "pack-regret-after-exit",
    title: "卖飞懊悔专项",
    errorType: "卖飞懊悔",
    sceneTags: ["洗盘后走强", "趋势中继"],
    trainingGoal: "离场后不因懊悔追回",
    expectedAction: "按规则处理，不追回情绪单",
    defaultPrompt: "先复盘当时规则，不用懊悔补偿自己",
    trainingPrescription: "卖飞懊悔专项训练",
    difficulty: "初级",
    enabled: true,
    sortOrder: 30
  },
  {
    id: "pack-unplanned-trade",
    title: "计划外交易专项",
    errorType: "计划外交易",
    sceneTags: ["横盘噪音", "突然异动"],
    trainingGoal: "无计划时不动手",
    expectedAction: "无计划不交易",
    defaultPrompt: "先写下计划，再决定是否进入训练记录",
    trainingPrescription: "计划外交易专项训练",
    difficulty: "初级",
    enabled: true,
    sortOrder: 40
  },
  {
    id: "pack-holding-loss",
    title: "扛单被套专项",
    errorType: "扛单被套",
    sceneTags: ["破位下行", "弱反弹", "连续走弱"],
    trainingGoal: "看见不愿承认错误的念头",
    expectedAction: "先记录偏离计划的事实",
    defaultPrompt: "把事实和不甘分开写下",
    trainingPrescription: "扛单被套专项训练",
    difficulty: "中级",
    enabled: true,
    sortOrder: 50
  },
  {
    id: "pack-cannot-hold-profit",
    title: "盈利拿不住专项",
    errorType: "盈利拿不住",
    sceneTags: ["小幅浮盈", "震荡回撤", "趋势延续"],
    trainingGoal: "有浮盈时不被立刻落袋的焦虑牵动",
    expectedAction: "按计划边界处理，不用情绪抢跑",
    defaultPrompt: "先照见害怕回吐的念头",
    trainingPrescription: "盈利拿不住专项训练",
    difficulty: "中级",
    enabled: true,
    sortOrder: 60
  },
  {
    id: "pack-empty-position-anxiety",
    title: "空仓焦虑专项",
    errorType: "空仓焦虑",
    sceneTags: ["市场活跃", "连续踏空", "热点轮动"],
    trainingGoal: "空仓时不把等待误解成落后",
    expectedAction: "没有计划就继续观察",
    defaultPrompt: "把空仓焦虑写成一条觉察记录",
    trainingPrescription: "空仓焦虑专项训练",
    difficulty: "初级",
    enabled: true,
    sortOrder: 70
  },
  {
    id: "pack-revenge-trading",
    title: "急于翻本专项",
    errorType: "急于翻本",
    sceneTags: ["连续受挫", "情绪升温", "盘中急拉"],
    trainingGoal: "受挫后不急着用下一次证明自己",
    expectedAction: "先完成复盘，再进入下一次训练",
    defaultPrompt: "先照见想立刻证明自己的念头",
    trainingPrescription: "急于翻本专项训练",
    difficulty: "中级",
    enabled: true,
    sortOrder: 80
  }
];

export async function seedDefaultTrainingPacksIfEmpty() {
  const records = await updateRuntimeRecords(TRAINING_PACKS_FILE, (currentRecords) => {
    if (Array.isArray(currentRecords) && currentRecords.length > 0) return currentRecords;
    const now = new Date().toISOString();
    return DEFAULT_TRAINING_PACKS.map((pack) => normalizeTrainingPackRecord({
      ...pack,
      createdAt: now,
      updatedAt: now
    }, { touch: false }));
  });
  return sortTrainingPacks(records.map(normalizeTrainingPack));
}

export async function listTrainingPacks({ includeDisabled = false } = {}) {
  await seedDefaultTrainingPacksIfEmpty();
  const records = await readRuntimeRecords(TRAINING_PACKS_FILE);
  return sortTrainingPacks(records.map(normalizeTrainingPack))
    .filter((pack) => includeDisabled || pack.enabled);
}

export async function getTrainingPack(id) {
  await seedDefaultTrainingPacksIfEmpty();
  const records = await readRuntimeRecords(TRAINING_PACKS_FILE);
  const record = records.find((item) => String(item.id) === String(id));
  return record ? normalizeTrainingPack(record) : null;
}

export async function createTrainingPack(input = {}) {
  assertTrainingPackInput(input);
  await seedDefaultTrainingPacksIfEmpty();

  let created = null;
  await updateRuntimeRecords(TRAINING_PACKS_FILE, (records) => {
    const normalizedRecords = records.map(normalizeTrainingPack);
    const sortOrder = numberValue(pickAlias(input, "sortOrder", "sort_order"), maxSortOrder(normalizedRecords) + 10);
    created = normalizeTrainingPackRecord({
      ...input,
      id: stringValue(input.id) || `training-pack-${randomUUID()}`,
      enabled: input.enabled ?? true,
      sortOrder
    });
    return records.concat(created);
  });

  return normalizeTrainingPack(created);
}

export async function updateTrainingPack(id, patch = {}) {
  await seedDefaultTrainingPacksIfEmpty();

  let updated = null;
  const normalizedPatch = normalizePatchAliases(patch);
  await updateRuntimeRecords(TRAINING_PACKS_FILE, (records) => records.map((record) => {
    if (String(record.id) !== String(id)) return record;
    updated = normalizeTrainingPackRecord({
      ...record,
      ...normalizedPatch,
      id: record.id,
      createdAt: pickAlias(record, "createdAt", "created_at")
    });
    return updated;
  }));

  return updated ? normalizeTrainingPack(updated) : null;
}

export async function setTrainingPackEnabled(id, enabled) {
  if (typeof enabled !== "boolean") {
    throwValidationError("enabled 必须是 boolean");
  }
  return updateTrainingPack(id, { enabled });
}

export function normalizeTrainingPack(record = {}) {
  return normalizeTrainingPackRecord(record, { touch: false });
}

function normalizeTrainingPackRecord(record = {}, { touch = true } = {}) {
  const now = new Date().toISOString();
  const errorType = stringValue(pickAlias(record, "errorType", "error_type"));
  const sceneTags = arrayValue(pickAlias(record, "sceneTags", "scene_tags"));
  const trainingGoal = stringValue(pickAlias(record, "trainingGoal", "training_goal"));
  const expectedAction = stringValue(pickAlias(record, "expectedAction", "expected_action"));
  const defaultPrompt = stringValue(pickAlias(record, "defaultPrompt", "default_prompt"));
  const trainingPrescription = stringValue(pickAlias(record, "trainingPrescription", "training_prescription"));
  const sortOrder = numberValue(pickAlias(record, "sortOrder", "sort_order"), 0);
  const createdAt = stringValue(pickAlias(record, "createdAt", "created_at")) || now;
  const previousUpdatedAt = stringValue(pickAlias(record, "updatedAt", "updated_at")) || createdAt;
  const updatedAt = touch ? now : previousUpdatedAt;

  return {
    ...record,
    id: stringValue(record.id),
    title: stringValue(record.title),
    errorType,
    error_type: errorType,
    sceneTags,
    scene_tags: sceneTags,
    trainingGoal,
    training_goal: trainingGoal,
    expectedAction,
    expected_action: expectedAction,
    defaultPrompt,
    default_prompt: defaultPrompt,
    trainingPrescription,
    training_prescription: trainingPrescription,
    difficulty: stringValue(record.difficulty) || "初级",
    enabled: record.enabled !== false,
    sortOrder,
    sort_order: sortOrder,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt
  };
}

function assertTrainingPackInput(input) {
  const requiredFields = [
    ["title", "title"],
    ["errorType", "error_type"],
    ["trainingGoal", "training_goal"],
    ["expectedAction", "expected_action"]
  ];

  const missing = requiredFields.filter(([camel, snake]) => !stringValue(pickAlias(input, camel, snake)));
  if (missing.length > 0) {
    throwValidationError(`缺少训练包必填字段：${missing.map(([camel, snake]) => `${camel}/${snake}`).join(", ")}`);
  }
}

function normalizePatchAliases(patch = {}) {
  const normalized = { ...patch };
  for (const [camelKey, snakeKey] of [
    ["errorType", "error_type"],
    ["sceneTags", "scene_tags"],
    ["trainingGoal", "training_goal"],
    ["expectedAction", "expected_action"],
    ["defaultPrompt", "default_prompt"],
    ["trainingPrescription", "training_prescription"],
    ["sortOrder", "sort_order"],
    ["createdAt", "created_at"],
    ["updatedAt", "updated_at"]
  ]) {
    if (patch[camelKey] !== undefined) {
      normalized[snakeKey] = patch[camelKey];
    } else if (patch[snakeKey] !== undefined) {
      normalized[camelKey] = patch[snakeKey];
    }
  }
  return normalized;
}

function throwValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function pickAlias(record, camelKey, snakeKey) {
  if (record[camelKey] !== undefined) return record[camelKey];
  return record[snakeKey];
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function arrayValue(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => stringValue(item)).filter(Boolean);
}

function numberValue(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function maxSortOrder(records) {
  return records.reduce((max, record) => Math.max(max, numberValue(record.sortOrder, 0)), 0);
}

function sortTrainingPacks(records) {
  return [...records].sort((left, right) => {
    const sortDelta = numberValue(left.sortOrder, 0) - numberValue(right.sortOrder, 0);
    if (sortDelta !== 0) return sortDelta;
    return String(left.id).localeCompare(String(right.id));
  });
}
