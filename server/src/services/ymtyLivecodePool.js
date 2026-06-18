import crypto from "node:crypto";

export const MAX_LIVECODE_SWITCHES = 3;

export function stableWecomState(codeKey = "") {
  const digest = crypto.createHash("sha256").update(String(codeKey || "")).digest("hex").slice(0, 16);
  return `ymty_${digest}`;
}

export function normalizeAssignmentRecord(record = {}) {
  const assignedAt = cleanText(record.assigned_at || new Date().toISOString(), 40);
  const status = cleanText(record.status || "active", 24);
  return {
    assignment_id: cleanText(record.assignment_id || crypto.randomUUID(), 80),
    order_id: cleanText(record.order_id, 80),
    code_key: cleanText(record.code_key, 80),
    channel: cleanText(record.channel || "", 80),
    campaign: cleanText(record.campaign || "", 80),
    creative: cleanText(record.creative || "", 80),
    assigned_at: assignedAt,
    status: status === "superseded" ? "superseded" : "active",
    switch_reason: cleanText(record.switch_reason || "", 80),
    superseded_by: cleanText(record.superseded_by || "", 80),
    switch_count: normalizeNonNegativeInteger(record.switch_count, 0)
  };
}

export function buildLivecodeStats(assignments = []) {
  const counts = new Map();
  const lastAssignedAt = new Map();
  const switchCounts = new Map();
  const normalized = assignments.map((item) => normalizeAssignmentRecord(item));

  for (const item of normalized) {
    if (!item.code_key) continue;
    if (item.status === "active") {
      counts.set(item.code_key, (counts.get(item.code_key) || 0) + 1);
      const previous = lastAssignedAt.get(item.code_key) || "";
      if (!previous || new Date(item.assigned_at).getTime() > new Date(previous).getTime()) {
        lastAssignedAt.set(item.code_key, item.assigned_at);
      }
    }
    if (item.status === "superseded") {
      switchCounts.set(item.code_key, (switchCounts.get(item.code_key) || 0) + 1);
    }
  }

  return { counts, lastAssignedAt, switchCounts, normalized };
}

export function withLivecodeStats(livecodes = [], assignments = []) {
  const stats = buildLivecodeStats(assignments);
  return livecodes.map((item) => ({
    ...item,
    assigned_count: stats.counts.get(item.code_key) || 0,
    last_assigned_at: stats.lastAssignedAt.get(item.code_key) || "",
    switch_count: stats.switchCounts.get(item.code_key) || 0
  }));
}

export function resolveLivecodeAssignment({ records = [], livecodes = [], order = {} } = {}) {
  const normalizedRecords = records.map((item) => normalizeAssignmentRecord(item));
  const active = findActiveAssignment(normalizedRecords, order.order_id);
  const livecodeMap = new Map(livecodes.map((item) => [item.code_key, item]));

  if (active) {
    const current = livecodeMap.get(active.code_key);
    if (isExistingAssignmentUsable(current)) {
      return {
        records: normalizedRecords,
        codeKey: active.code_key,
        assignment: active,
        changed: recordsNeedNormalization(records, normalizedRecords)
      };
    }
  }

  const usedCodeKeys = getUsedCodeKeys(normalizedRecords, order.order_id);
  const selected = selectLivecodeForOrder({
    livecodes,
    assignments: normalizedRecords,
    channel: order.channel || "",
    excludeCodeKeys: usedCodeKeys
  });
  if (!selected) {
    throwPoolError("NO_AVAILABLE_LIVECODE", "课程助教入口正在分配中，请稍后重试", 503);
  }

  const now = new Date().toISOString();
  const nextAssignment = createAssignment({
    order,
    codeKey: selected.code_key,
    assignedAt: now,
    switchReason: active ? "auto_unavailable" : "",
    switchCount: getSwitchCount(normalizedRecords, order.order_id)
  });
  const nextRecords = normalizedRecords
    .map((item) => (item.order_id === order.order_id && item.status === "active"
      ? { ...item, status: "superseded", switch_reason: "auto_unavailable", superseded_by: nextAssignment.assignment_id }
      : item))
    .concat(nextAssignment);

  return {
    records: nextRecords,
    codeKey: selected.code_key,
    assignment: nextAssignment,
    changed: true
  };
}

export function switchLivecodeAssignment({ records = [], livecodes = [], order = {}, reason = "user_reported_failure" } = {}) {
  const normalizedRecords = records.map((item) => normalizeAssignmentRecord(item));
  const currentSwitchCount = getSwitchCount(normalizedRecords, order.order_id);
  if (currentSwitchCount >= MAX_LIVECODE_SWITCHES) {
    throwPoolError("SWITCH_LIMIT_EXCEEDED", "本订单换码次数已达上限", 429);
  }

  const usedCodeKeys = getUsedCodeKeys(normalizedRecords, order.order_id);
  const selected = selectLivecodeForOrder({
    livecodes,
    assignments: normalizedRecords,
    channel: order.channel || "",
    excludeCodeKeys: usedCodeKeys
  });
  if (!selected) {
    throwPoolError("NO_ALTERNATIVE_LIVECODE", "暂无其他助教，请稍后重试", 503);
  }

  const nextAssignment = createAssignment({
    order,
    codeKey: selected.code_key,
    assignedAt: new Date().toISOString(),
    switchReason: cleanText(reason || "user_reported_failure", 80),
    switchCount: currentSwitchCount + 1
  });
  const nextRecords = normalizedRecords
    .map((item) => (item.order_id === order.order_id && item.status === "active"
      ? { ...item, status: "superseded", switch_reason: cleanText(reason || "user_reported_failure", 80), superseded_by: nextAssignment.assignment_id }
      : item))
    .concat(nextAssignment);

  return {
    records: nextRecords,
    codeKey: selected.code_key,
    assignment: nextAssignment,
    changed: true
  };
}

export function canSwitchLivecode({ records = [], livecodes = [], order = {}, currentCodeKey = "" } = {}) {
  const normalizedRecords = records.map((item) => normalizeAssignmentRecord(item));
  if (getSwitchCount(normalizedRecords, order.order_id) >= MAX_LIVECODE_SWITCHES) return false;
  const usedCodeKeys = getUsedCodeKeys(normalizedRecords, order.order_id);
  if (currentCodeKey) usedCodeKeys.add(currentCodeKey);
  return Boolean(selectLivecodeForOrder({
    livecodes,
    assignments: normalizedRecords,
    channel: order.channel || "",
    excludeCodeKeys: usedCodeKeys
  }));
}

export function selectLivecodeForOrder({ livecodes = [], assignments = [], channel = "", excludeCodeKeys = new Set() } = {}) {
  const stats = buildLivecodeStats(assignments);
  const excluded = excludeCodeKeys instanceof Set ? excludeCodeKeys : new Set(excludeCodeKeys || []);
  const available = livecodes.filter((item) => isLivecodeAssignable(item, stats.counts, excluded));
  const cleanChannel = cleanText(channel, 80);
  const exact = available.filter((item) => cleanChannel && Array.isArray(item.channels) && item.channels.includes(cleanChannel));
  const fallback = available.filter((item) => Array.isArray(item.channels) && item.channels.length === 1 && item.channels[0] === "*");
  return sortAssignableLivecodes(exact.length ? exact : fallback, stats)[0] || null;
}

export function isLivecodeAssignable(livecode, counts = new Map(), excludeCodeKeys = new Set()) {
  if (!livecode) return false;
  if (excludeCodeKeys.has(livecode.code_key)) return false;
  if (livecode.status !== "active") return false;
  if (livecode.invalid === true) return false;
  if (livecode.manual_full) return false;
  if (!hasEntrance(livecode)) return false;
  const limit = Number(livecode.capacity_limit || 0);
  if (limit > 0 && (counts.get(livecode.code_key) || 0) >= limit) return false;
  return true;
}

export function isExistingAssignmentUsable(livecode) {
  if (!livecode) return false;
  if (livecode.status !== "active") return false;
  if (livecode.invalid === true) return false;
  return hasEntrance(livecode);
}

function sortAssignableLivecodes(livecodes, stats) {
  return livecodes.slice().sort((a, b) => (
    Number(a.priority) - Number(b.priority)
    || (stats.counts.get(a.code_key) || 0) - (stats.counts.get(b.code_key) || 0)
    || compareLastAssigned(stats.lastAssignedAt.get(a.code_key), stats.lastAssignedAt.get(b.code_key))
    || a.code_key.localeCompare(b.code_key)
  ));
}

function compareLastAssigned(a = "", b = "") {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return new Date(a).getTime() - new Date(b).getTime();
}

function createAssignment({ order, codeKey, assignedAt, switchReason = "", switchCount = 0 }) {
  return normalizeAssignmentRecord({
    assignment_id: crypto.randomUUID(),
    order_id: order.order_id,
    code_key: codeKey,
    channel: order.channel || "",
    campaign: order.campaign || "",
    creative: order.creative || "",
    assigned_at: assignedAt,
    status: "active",
    switch_reason: switchReason,
    superseded_by: "",
    switch_count: switchCount
  });
}

function findActiveAssignment(records, orderId) {
  return records.find((item) => item.order_id === orderId && item.status === "active") || null;
}

function getUsedCodeKeys(records, orderId) {
  return new Set(records.filter((item) => item.order_id === orderId && item.code_key).map((item) => item.code_key));
}

function getSwitchCount(records, orderId) {
  return Math.max(0, ...records
    .filter((item) => item.order_id === orderId)
    .map((item) => Number(item.switch_count || 0)));
}

function hasEntrance(livecode) {
  return Boolean(cleanText(livecode.qr_image || "", 300) || cleanText(livecode.wecom_link || "", 300));
}

function recordsNeedNormalization(original, normalized) {
  return JSON.stringify(original || []) !== JSON.stringify(normalized || []);
}

function throwPoolError(code, message, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  throw error;
}

function normalizeNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.floor(number));
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}
