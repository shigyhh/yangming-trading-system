const { YM_EVIDENCE_LEDGER } = require("./storage-keys");

const EVIDENCE_TYPES = [
  "mind_report",
  "daily_checkin",
  "daily_concept",
  "daily_seal",
  "heart_proof_card",
  "review_record",
  "share_card",
  "seven_day_retest"
];

const EVIDENCE_TYPE_LABELS = {
  mind_report: "心镜报告",
  daily_checkin: "今日签到",
  daily_concept: "今日观念",
  daily_seal: "今日落印",
  heart_proof_card: "今日心证",
  review_record: "真实复盘",
  share_card: "照见分享",
  seven_day_retest: "七日复测"
};

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidEvidenceType(type) {
  return EVIDENCE_TYPES.includes(type);
}

function safeNow() {
  return Date.now();
}

function safeReadStorage(key, fallback) {
  try {
    if (typeof wx === "undefined" || !wx.getStorageSync) return fallback;
    return wx.getStorageSync(key) || fallback;
  } catch (error) {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    if (typeof wx !== "undefined" && wx.setStorageSync) wx.setStorageSync(key, value);
  } catch (error) {}
  return value;
}

function normalizeLedger(ledger) {
  const source = ledger && typeof ledger === "object" ? ledger : {};
  const records = Array.isArray(source.records) ? source.records : [];
  return {
    records: records.filter((item) => item && isValidEvidenceType(item.type)),
    updatedAt: Number(source.updatedAt || 0) || null
  };
}

function readEvidenceLedger() {
  return normalizeLedger(safeReadStorage(YM_EVIDENCE_LEDGER, { records: [], updatedAt: null }));
}

function writeEvidenceLedger(ledger) {
  const next = normalizeLedger(ledger);
  next.updatedAt = safeNow();
  return safeWriteStorage(YM_EVIDENCE_LEDGER, next);
}

function buildEvidenceId(record) {
  const type = isValidEvidenceType(record.type) ? record.type : "daily_checkin";
  const day = record.day || todayKey();
  const source = record.sourceId || record.sourcePage || record.action || "daily";
  return `ev_${type}_${day}_${String(source).replace(/[^\w-]/g, "_")}`;
}

function normalizeEvidence(input = {}, defaults = {}) {
  const type = isValidEvidenceType(input.type) ? input.type : defaults.type;
  if (!isValidEvidenceType(type)) return null;
  const day = input.day || defaults.day || todayKey();
  const createdAt = Number(input.createdAt || defaults.createdAt || safeNow());
  const record = {
    id: input.id || "",
    type,
    day,
    stage: input.stage || defaults.stage || "",
    personality: input.personality || defaults.personality || "",
    heartThief: input.heartThief || defaults.heartThief || "",
    action: input.action || defaults.action || "",
    reflection: input.reflection || defaults.reflection || "",
    zhixingChange: Number(input.zhixingChange || defaults.zhixingChange || 0),
    sourcePage: input.sourcePage || defaults.sourcePage || "",
    sourceId: input.sourceId || defaults.sourceId || "",
    archived: input.archived !== undefined ? !!input.archived : !!defaults.archived,
    createdAt
  };
  record.id = record.id || buildEvidenceId(record);
  return record;
}

function upsertEvidence(ledger, input = {}, defaults = {}) {
  const record = normalizeEvidence(input, defaults);
  const current = normalizeLedger(ledger);
  if (!record) return current;
  const records = current.records
    .filter((item) => item.id !== record.id)
    .concat(record)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 200);
  return {
    records,
    latest: record,
    updatedAt: safeNow()
  };
}

function recordEvidence(input = {}, defaults = {}) {
  return writeEvidenceLedger(upsertEvidence(readEvidenceLedger(), input, defaults));
}

function listEvidence(ledger = readEvidenceLedger()) {
  return normalizeLedger(ledger).records.slice().sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

function hasEvidence(type, day, ledger = readEvidenceLedger()) {
  return listEvidence(ledger).some((item) => item.type === type && (!day || item.day === day));
}

function countEvidence(type, ledger = readEvidenceLedger()) {
  return listEvidence(ledger).filter((item) => item.type === type).length;
}

function getLatestEvidence(type, ledger = readEvidenceLedger()) {
  return listEvidence(ledger).find((item) => !type || item.type === type) || null;
}

function buildEvidenceSummary(ledger = readEvidenceLedger(), options = {}) {
  const day = options.day || todayKey();
  const records = listEvidence(ledger);
  const todayRecords = records.filter((item) => item.day === day);
  const byType = EVIDENCE_TYPES.reduce((next, type) => {
    next[type] = records.filter((item) => item.type === type).length;
    return next;
  }, {});
  const todayByType = EVIDENCE_TYPES.reduce((next, type) => {
    next[type] = todayRecords.filter((item) => item.type === type).length;
    return next;
  }, {});
  return {
    total: records.length,
    todayTotal: todayRecords.length,
    byType,
    todayByType,
    heartProofCount: byType.heart_proof_card,
    reviewCount: byType.review_record,
    shareCount: byType.share_card,
    retestCount: byType.seven_day_retest,
    latest: records[0] || null,
    rows: buildEvidenceRows(records, options)
  };
}

function shortText(value, length = 44) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

function formatDateTime(timestamp) {
  const date = new Date(Number(timestamp || 0));
  if (Number.isNaN(date.getTime())) return "时间待确认";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildEvidenceRows(records = [], options = {}) {
  const limit = Number(options.limit || 12);
  return records.slice(0, limit).map((item) => ({
    id: item.id,
    type: item.type,
    typeLabel: EVIDENCE_TYPE_LABELS[item.type] || "证据",
    title: item.action || EVIDENCE_TYPE_LABELS[item.type] || "闭环证据",
    summary: shortText(item.reflection || item.stage || item.personality || "已写入心镜档案"),
    meta: [item.day, item.personality, item.heartThief].filter(Boolean).join(" · "),
    createdAtText: formatDateTime(item.createdAt),
    sourcePage: item.sourcePage || ""
  }));
}

function getRiskLevel(score) {
  const value = Math.max(0, Math.min(100, Number(score || 0)));
  if (value <= 20) return "较低";
  if (value <= 40) return "轻微";
  if (value <= 60) return "中等";
  if (value <= 80) return "明显";
  return "强烈";
}

function formatRiskLevel(score, options = {}) {
  const value = Math.max(0, Math.min(100, Number(score || 0)));
  const level = getRiskLevel(value);
  return options.hideLowScore && value <= 20 ? level : `${level} · ${value}`;
}

module.exports = {
  EVIDENCE_TYPES,
  EVIDENCE_TYPE_LABELS,
  todayKey,
  normalizeLedger,
  readEvidenceLedger,
  writeEvidenceLedger,
  normalizeEvidence,
  upsertEvidence,
  recordEvidence,
  listEvidence,
  hasEvidence,
  countEvidence,
  getLatestEvidence,
  buildEvidenceSummary,
  buildEvidenceRows,
  getRiskLevel,
  formatRiskLevel
};
