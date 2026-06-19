import crypto from "node:crypto";
import { readRuntimeRecords, replaceRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const LEAD_FILE = "ymty-crm-leads.json";
const NOTE_FILE = "ymty-crm-notes.json";
const AUDIT_LOG_FILE = "ymty-audit-logs.json";

export const CRM_STAGES = [
  "paid",
  "assigned",
  "added",
  "first_contact",
  "group_joined",
  "course_started",
  "course_completed",
  "converted",
  "lost",
  "refund_requested",
  "refunded"
];

export function maskYmtyExternalUserid(value = "") {
  const text = cleanText(value, 120);
  if (!text) return "";
  if (text.length <= 8) return `${text.slice(0, 2)}****${text.slice(-2)}`;
  return `${text.slice(0, 4)}****${text.slice(-4)}`;
}

export function publicYmtyCrmLead(lead = {}) {
  const normalized = normalizeLead(lead);
  const { external_userid: externalUserid, ...publicLead } = normalized;
  return {
    ...publicLead,
    external_userid_masked: maskYmtyExternalUserid(externalUserid)
  };
}

export function publicYmtyCrmLeadDetail({ lead = {}, notes = [] } = {}) {
  return {
    lead: publicYmtyCrmLead(lead),
    notes
  };
}

const MANUAL_STAGES = new Set(CRM_STAGES.filter((stage) => stage !== "paid" && stage !== "assigned" && stage !== "refunded"));
const STAGE_TIME_FIELD = {
  added: "added_at",
  first_contact: "first_contact_at",
  group_joined: "group_joined_at",
  course_started: "course_started_at",
  course_completed: "course_completed_at",
  converted: "converted_at",
  lost: "lost_at"
};

export async function resetYmtyCrmForTests() {
  await Promise.all([
    replaceRuntimeRecords(LEAD_FILE, []),
    replaceRuntimeRecords(NOTE_FILE, [])
  ]);
}

export async function ensureYmtyCrmLeadForPaidOrder(order = {}) {
  const now = new Date().toISOString();
  let lead = null;
  await updateRuntimeRecords(LEAD_FILE, (records) => {
    const normalized = records.map((item) => normalizeLead(item));
    const existing = normalized.find((item) => item.order_id === order.order_id);
    if (existing) {
      lead = existing;
      return normalized;
    }
    lead = normalizeLead({
      lead_id: createLeadId(order.order_id),
      order_id: order.order_id,
      session_id: order.session_id || "",
      product_code: order.product_code || "YMXX_JY_TY",
      pay_channel: order.pay_channel || "",
      amount_cents: order.amount_cents || 0,
      channel: order.channel || "",
      campaign: order.campaign || "",
      creative: order.creative || "",
      click_id: order.click_id || "",
      stage: "paid",
      refund_status: "",
      created_at: now,
      updated_at: now
    });
    return normalized.concat(lead);
  });
  return { lead };
}

export async function markYmtyCrmLeadAssigned({ order = {}, livecode = {} } = {}) {
  await ensureYmtyCrmLeadForPaidOrder(order);
  const now = new Date().toISOString();
  let lead = null;
  await updateRuntimeRecords(LEAD_FILE, (records) => records.map((record) => {
    const current = normalizeLead(record);
    if (current.order_id !== order.order_id) return current;
    const nextStage = current.stage === "paid" ? "assigned" : current.stage;
    lead = normalizeLead({
      ...current,
      code_key: livecode.code_key || current.code_key,
      contact_type: livecode.contact_type || current.contact_type,
      stage: nextStage,
      updated_at: now
    });
    return lead;
  }));
  return { lead };
}

export async function markYmtyCrmLeadAddedFromWecom({
  leadId = "",
  externalUserid = "",
  followUserUserid = "",
  eventTime = "",
  tagSyncStatus = "",
  tagSyncError = ""
} = {}) {
  let lead = null;
  const now = new Date().toISOString();
  const addedAt = cleanText(eventTime, 40) || now;
  await updateRuntimeRecords(LEAD_FILE, (records) => records.map((record) => {
    const current = normalizeLead(record);
    if (current.lead_id !== leadId && current.order_id !== leadId) return current;
    lead = normalizeLead({
      ...current,
      stage: isStageAtLeast(current.stage, "added") ? current.stage : "added",
      added_at: current.added_at || addedAt,
      last_contact_at: addedAt,
      external_userid: externalUserid || current.external_userid,
      follow_user_userid: followUserUserid || current.follow_user_userid,
      data_source: "wecom_callback",
      tag_sync_status: tagSyncStatus || current.tag_sync_status,
      tag_sync_last_at: tagSyncStatus ? now : current.tag_sync_last_at,
      tag_sync_error: tagSyncError || "",
      updated_at: now
    });
    return lead;
  }));
  assertFound(lead, "CRM 线索不存在");
  return { lead };
}

export async function markYmtyCrmLeadRefunded({ orderId = "", refundStatus = "refunded" } = {}) {
  let lead = null;
  const now = new Date().toISOString();
  await updateRuntimeRecords(LEAD_FILE, (records) => records.map((record) => {
    const current = normalizeLead(record);
    if (current.order_id !== orderId && current.lead_id !== orderId) return current;
    lead = normalizeLead({
      ...current,
      stage: "refunded",
      refund_status: cleanText(refundStatus, 40) || "refunded",
      updated_at: now
    });
    return lead;
  }));
  assertFound(lead, "CRM 线索不存在");
  return { lead };
}

export async function listYmtyCrmLeads(query = {}) {
  const records = (await readRuntimeRecords(LEAD_FILE)).map((item) => normalizeLead(item));
  return {
    leads: records
      .filter((lead) => matchesLeadQuery(lead, query))
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
  };
}

export async function getYmtyCrmLead(leadId = "") {
  const lead = await findLeadById(leadId);
  const notes = (await readRuntimeRecords(NOTE_FILE))
    .map((item) => normalizeNote(item))
    .filter((note) => note.lead_id === lead.lead_id)
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  return { lead, notes };
}

export async function updateYmtyCrmLead({ leadId = "", patch = {}, adminId = "dev-admin", ip = "" } = {}) {
  let before = null;
  let after = null;
  const now = new Date().toISOString();
  await updateRuntimeRecords(LEAD_FILE, (records) => records.map((record) => {
    const current = normalizeLead(record);
    if (current.lead_id !== leadId) return current;
    before = current;
    after = normalizeLead({
      ...current,
      owner: patch.owner ?? current.owner,
      tags: patch.tags ?? current.tags,
      contact_name: patch.contact_name ?? patch.contactName ?? current.contact_name,
      phone_last4: patch.phone_last4 ?? patch.phoneLast4 ?? current.phone_last4,
      next_follow_up_at: patch.next_follow_up_at ?? patch.nextFollowUpAt ?? current.next_follow_up_at,
      updated_at: now
    });
    return after;
  }));
  assertFound(after, "CRM 线索不存在");
  await appendAuditLog({ adminId, action: "crm_update_lead", targetType: "crm_leads", targetId: leadId, before, after, ip });
  return { lead: after };
}

export async function updateYmtyCrmLeadStage({ leadId = "", stage = "", reason = "", adminId = "dev-admin", ip = "" } = {}) {
  const normalizedStage = cleanToken(stage, 32);
  if (!CRM_STAGES.includes(normalizedStage)) {
    const error = new Error("CRM 阶段不合法");
    error.statusCode = 400;
    throw error;
  }
  if (normalizedStage === "refunded") {
    const error = new Error("退款完成阶段只能由退款流程写入");
    error.statusCode = 403;
    throw error;
  }
  if (!MANUAL_STAGES.has(normalizedStage)) {
    const error = new Error("该阶段不能由后台手工设置");
    error.statusCode = 400;
    throw error;
  }

  let before = null;
  let after = null;
  const now = new Date().toISOString();
  await updateRuntimeRecords(LEAD_FILE, (records) => records.map((record) => {
    const current = normalizeLead(record);
    if (current.lead_id !== leadId) return current;
    before = current;
    const timeField = STAGE_TIME_FIELD[normalizedStage];
    after = normalizeLead({
      ...current,
      stage: normalizedStage,
      ...(timeField ? { [timeField]: current[timeField] || now } : {}),
      last_contact_at: now,
      updated_at: now
    });
    return after;
  }));
  assertFound(after, "CRM 线索不存在");
  await appendAuditLog({
    adminId,
    action: "crm_update_stage",
    targetType: "crm_leads",
    targetId: leadId,
    before,
    after: { ...after, reason: cleanText(reason, 200) },
    ip
  });
  return { lead: after };
}

export async function addYmtyCrmNote({ leadId = "", body = "", adminId = "dev-admin", ip = "" } = {}) {
  const { lead } = await getYmtyCrmLead(leadId);
  const note = normalizeNote({
    note_id: `note_${crypto.randomUUID()}`,
    lead_id: lead.lead_id,
    admin_id: cleanText(adminId, 80) || "dev-admin",
    body: cleanText(body, 1000),
    created_at: new Date().toISOString()
  });
  if (!note.body) {
    const error = new Error("备注不能为空");
    error.statusCode = 400;
    throw error;
  }
  await updateRuntimeRecords(NOTE_FILE, (records) => records.concat(note));
  await appendAuditLog({
    adminId,
    action: "crm_add_note",
    targetType: "crm_leads",
    targetId: lead.lead_id,
    before: null,
    after: { note_id: note.note_id, body: note.body },
    ip
  });
  return { note };
}

export async function exportYmtyCrmCsv(query = {}) {
  const { leads } = await listYmtyCrmLeads(query);
  const header = ["订单号", "支付时间", "金额", "渠道", "活动", "素材", "支付方式", "助教", "阶段", "负责人", "标签", "最近联系", "下次跟进"];
  const rows = leads.map((lead) => [
    lead.order_id,
    lead.created_at,
    String(lead.amount_cents),
    lead.channel,
    lead.campaign,
    lead.creative,
    lead.pay_channel,
    lead.code_key,
    lead.stage,
    lead.owner,
    lead.tags.join("|"),
    lead.last_contact_at,
    lead.next_follow_up_at
  ]);
  return [header.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n") + "\n";
}

export async function getYmtyCrmMetrics(query = {}) {
  const { leads } = await listYmtyCrmLeads(query);
  return summarizeCrmLeads(leads);
}

export function summarizeCrmLeads(leads = []) {
  return {
    crm_paid_customers: leads.length,
    crm_assigned_customers: leads.filter((lead) => Boolean(lead.code_key) || isStageAtLeast(lead.stage, "assigned")).length,
    crm_added_customers: leads.filter((lead) => Boolean(lead.added_at) || isStageAtLeast(lead.stage, "added")).length,
    crm_first_contact_customers: leads.filter((lead) => Boolean(lead.first_contact_at) || isStageAtLeast(lead.stage, "first_contact")).length,
    crm_group_joined_customers: leads.filter((lead) => Boolean(lead.group_joined_at) || isStageAtLeast(lead.stage, "group_joined")).length,
    crm_course_completed_customers: leads.filter((lead) => Boolean(lead.course_completed_at) || isStageAtLeast(lead.stage, "course_completed")).length,
    crm_converted_customers: leads.filter((lead) => lead.stage === "converted").length,
    crm_lost_customers: leads.filter((lead) => lead.stage === "lost").length
  };
}

function normalizeLead(record = {}) {
  const stage = normalizeStage(record.stage);
  const createdAt = cleanText(record.created_at || new Date().toISOString(), 40);
  return {
    lead_id: cleanText(record.lead_id || createLeadId(record.order_id), 96),
    order_id: cleanText(record.order_id, 80),
    session_id: cleanText(record.session_id, 96),
    product_code: cleanText(record.product_code || "YMXX_JY_TY", 80),
    pay_channel: cleanText(record.pay_channel, 32),
    amount_cents: normalizeNonNegativeInteger(record.amount_cents, 0),
    channel: cleanText(record.channel, 80),
    campaign: cleanText(record.campaign, 80),
    creative: cleanText(record.creative, 80),
    click_id: cleanText(record.click_id, 120),
    code_key: cleanText(record.code_key, 80),
    contact_type: normalizeContactType(record.contact_type),
    owner: cleanText(record.owner, 80),
    stage,
    tags: normalizeTags(record.tags),
    contact_name: cleanText(record.contact_name, 80),
    phone_last4: normalizePhoneLast4(record.phone_last4),
    external_userid: cleanText(record.external_userid, 120),
    follow_user_userid: cleanText(record.follow_user_userid, 120),
    data_source: cleanText(record.data_source, 40),
    tag_sync_status: normalizeTagSyncStatus(record.tag_sync_status),
    tag_sync_last_at: cleanText(record.tag_sync_last_at, 40),
    tag_sync_error: cleanText(record.tag_sync_error, 200),
    next_follow_up_at: cleanText(record.next_follow_up_at, 40),
    last_contact_at: cleanText(record.last_contact_at, 40),
    added_at: cleanText(record.added_at, 40),
    first_contact_at: cleanText(record.first_contact_at, 40),
    group_joined_at: cleanText(record.group_joined_at, 40),
    course_started_at: cleanText(record.course_started_at, 40),
    course_completed_at: cleanText(record.course_completed_at, 40),
    converted_at: cleanText(record.converted_at, 40),
    lost_at: cleanText(record.lost_at, 40),
    refund_status: cleanText(record.refund_status, 40),
    created_at: createdAt,
    updated_at: cleanText(record.updated_at || createdAt, 40)
  };
}

function normalizeTagSyncStatus(value) {
  const text = cleanToken(value || "", 32);
  return ["pending", "success", "failed", "skipped"].includes(text) ? text : "";
}

function normalizeNote(record = {}) {
  return {
    note_id: cleanText(record.note_id || `note_${crypto.randomUUID()}`, 96),
    lead_id: cleanText(record.lead_id, 96),
    admin_id: cleanText(record.admin_id, 80),
    body: cleanText(record.body, 1000),
    created_at: cleanText(record.created_at || new Date().toISOString(), 40)
  };
}

function normalizeStage(stage) {
  const text = cleanToken(stage || "paid", 32);
  return CRM_STAGES.includes(text) ? text : "paid";
}

function normalizeContactType(value) {
  const text = cleanToken(value || "", 32);
  return ["personal_wechat", "wecom"].includes(text) ? text : "";
}

function normalizeTags(value) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(",");
  return Array.from(new Set(source.map((item) => cleanText(item, 40)).filter(Boolean))).slice(0, 20);
}

function normalizePhoneLast4(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.slice(-4);
}

function matchesLeadQuery(lead, query) {
  for (const key of ["stage", "channel", "campaign", "creative", "owner", "code_key"]) {
    if (query[key] && lead[key] !== cleanText(query[key], 120)) return false;
  }
  const from = cleanDate(query.from || "");
  const to = cleanDate(query.to || "");
  const dateKey = (lead.created_at || "").slice(0, 10);
  if (from && dateKey < from) return false;
  if (to && dateKey > to) return false;
  const q = cleanText(query.q, 120).toLowerCase();
  if (q) {
    const haystack = [
      lead.order_id,
      lead.contact_name,
      lead.owner,
      lead.channel,
      lead.campaign,
      lead.creative,
      lead.code_key,
      lead.tags.join(" ")
    ].join(" ").toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

async function findLeadById(leadId) {
  const leads = (await readRuntimeRecords(LEAD_FILE)).map((item) => normalizeLead(item));
  const lead = leads.find((item) => item.lead_id === leadId || item.order_id === leadId);
  assertFound(lead, "CRM 线索不存在");
  return lead;
}

function createLeadId(orderId = "") {
  return `lead_${cleanText(orderId || crypto.randomUUID(), 80)}`;
}

function assertFound(value, message) {
  if (value) return;
  const error = new Error(message);
  error.statusCode = 404;
  throw error;
}

async function appendAuditLog({ adminId, action, targetType, targetId, before, after, ip }) {
  const auditLog = {
    id: crypto.randomUUID(),
    admin_id: cleanText(adminId, 80) || "dev-admin",
    action,
    target_type: targetType,
    target_id: targetId,
    before_json: before,
    after_json: after,
    ip: cleanText(ip, 80),
    created_at: new Date().toISOString()
  };
  await updateRuntimeRecords(AUDIT_LOG_FILE, (records) => records.concat(auditLog));
  return auditLog;
}

function isStageAtLeast(current, target) {
  const order = ["paid", "assigned", "added", "first_contact", "group_joined", "course_started", "course_completed", "converted"];
  if (current === "lost") return false;
  return order.indexOf(current) >= order.indexOf(target) && order.indexOf(target) >= 0;
}

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll("\"", "\"\"")}"`;
}

function cleanDate(value = "") {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function cleanToken(value = "", max = 96) {
  return cleanText(value, max).replace(/[^\w:.-]/g, "").slice(0, max);
}

function cleanText(value = "", max = 120) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function normalizeNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}
