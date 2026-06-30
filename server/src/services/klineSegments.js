import { randomUUID } from "node:crypto";
import { readRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const KLINE_SEGMENTS_FILE = "kline-segments.json";

export async function listKlineSegments(options = {}) {
  const records = await readRuntimeRecords(KLINE_SEGMENTS_FILE);
  return filterKlineSegments(records.map(normalizeKlineSegment), options);
}

export async function getKlineSegment(id) {
  const records = await readRuntimeRecords(KLINE_SEGMENTS_FILE);
  const record = records.find((item) => String(item.id) === String(id));
  return record ? normalizeKlineSegment(record) : null;
}

export async function createKlineSegment(input = {}) {
  assertKlineSegmentInput(input);

  let created = null;
  await updateRuntimeRecords(KLINE_SEGMENTS_FILE, (records) => {
    created = normalizeKlineSegmentRecord({
      ...input,
      id: stringValue(input.id) || `kline-segment-${randomUUID()}`,
      enabled: input.enabled ?? true,
    });
    return records.concat(created);
  });

  return normalizeKlineSegment(created);
}

export async function updateKlineSegment(id, patch = {}) {
  let updated = null;
  const normalizedPatch = normalizePatchAliases(patch);
  await updateRuntimeRecords(KLINE_SEGMENTS_FILE, (records) => records.map((record) => {
    if (String(record.id) !== String(id)) return record;
    updated = normalizeKlineSegmentRecord({
      ...record,
      ...normalizedPatch,
      id: record.id,
      createdAt: pickAlias(record, "createdAt", "created_at"),
    });
    return updated;
  }));

  return updated ? normalizeKlineSegment(updated) : null;
}

export async function setKlineSegmentEnabled(id, enabled) {
  if (typeof enabled !== "boolean") {
    throwValidationError("enabled 必须是 boolean");
  }
  return updateKlineSegment(id, { enabled });
}

export function normalizeKlineSegment(record = {}) {
  return normalizeKlineSegmentRecord(record, { touch: false });
}

export function filterKlineSegments(records = [], filters = {}) {
  const includeDisabled = parseBoolean(pickAlias(filters, "includeDisabled", "include_disabled"));
  const errorType = stringValue(pickAlias(filters, "errorType", "error_type"));
  const sceneTag = stringValue(pickAlias(filters, "sceneTag", "scene_tag"));
  const trainingPackId = stringValue(pickAlias(filters, "trainingPackId", "training_pack_id"));
  const symbol = stringValue(filters.symbol);
  const period = stringValue(filters.period);

  return sortKlineSegments(records.map(normalizeKlineSegment)).filter((segment) => {
    if (!includeDisabled && segment.enabled === false) return false;
    if (errorType && !segment.errorTypes.includes(errorType)) return false;
    if (sceneTag && !segment.sceneTags.includes(sceneTag)) return false;
    if (trainingPackId && !segment.trainingPackIds.includes(trainingPackId)) return false;
    if (symbol && segment.symbol !== symbol) return false;
    if (period && segment.period !== period) return false;
    return true;
  });
}

function normalizeKlineSegmentRecord(record = {}, { touch = true } = {}) {
  const now = new Date().toISOString();
  const startDate = stringValue(pickAlias(record, "startDate", "start_date"));
  const endDate = stringValue(pickAlias(record, "endDate", "end_date"));
  const sceneTags = arrayValue(pickAlias(record, "sceneTags", "scene_tags"));
  const errorTypes = arrayValue(pickAlias(record, "errorTypes", "error_types"));
  const trainingPackIds = arrayValue(pickAlias(record, "trainingPackIds", "training_pack_ids"));
  const createdAt = stringValue(pickAlias(record, "createdAt", "created_at")) || now;
  const previousUpdatedAt = stringValue(pickAlias(record, "updatedAt", "updated_at")) || createdAt;
  const updatedAt = touch ? now : previousUpdatedAt;

  return {
    id: stringValue(record.id),
    symbol: stringValue(record.symbol),
    name: stringValue(record.name),
    period: stringValue(record.period),
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    sceneTags,
    scene_tags: sceneTags,
    errorTypes,
    error_types: errorTypes,
    trainingPackIds,
    training_pack_ids: trainingPackIds,
    difficulty: stringValue(record.difficulty) || "初级",
    note: stringValue(record.note),
    enabled: record.enabled !== false,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt,
  };
}

function assertKlineSegmentInput(input) {
  const requiredFields = [
    ["symbol", "symbol"],
    ["period", "period"],
    ["startDate", "start_date"],
    ["endDate", "end_date"],
  ];

  const missing = requiredFields.filter(([camel, snake]) => !stringValue(pickAlias(input, camel, snake)));
  if (missing.length > 0) {
    throwValidationError(`缺少K线片段必填字段：${missing.map(([camel, snake]) => `${camel}/${snake}`).join(", ")}`);
  }
}

function normalizePatchAliases(patch = {}) {
  const normalized = { ...patch };
  for (const [camelKey, snakeKey] of [
    ["startDate", "start_date"],
    ["endDate", "end_date"],
    ["sceneTags", "scene_tags"],
    ["errorTypes", "error_types"],
    ["trainingPackIds", "training_pack_ids"],
    ["createdAt", "created_at"],
    ["updatedAt", "updated_at"],
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

function pickAlias(record = {}, camelKey, snakeKey) {
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

function parseBoolean(value) {
  return value === true || value === "true" || value === "1";
}

function sortKlineSegments(records) {
  return [...records].sort((left, right) => {
    const updatedDelta = String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
    if (updatedDelta !== 0) return updatedDelta;
    return String(left.id).localeCompare(String(right.id));
  });
}
