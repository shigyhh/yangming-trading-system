import crypto from "node:crypto";
import { readRuntimeRecords, replaceRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";
import { listYmtyLivecodeAssignments, listYmtyLivecodes } from "./ymtyCampaign.js";
import { getYmtyCrmLead, listYmtyCrmLeads, markYmtyCrmLeadAddedFromWecom, maskYmtyExternalUserid, publicYmtyCrmLead } from "./ymtyCrm.js";
import { recordYmtyTrustedEvent } from "./ymtyAnalytics.js";
import { decryptWecomMessage, verifyWecomSignature } from "./wecomCallbackCrypto.js";

const EVENT_FILE = "ymty-wecom-events.json";
const SYNC_JOB_FILE = "ymty-wecom-sync-jobs.json";

const CHANGE_TYPE_MAP = {
  add_external_contact: "customer_added",
  del_external_contact: "customer_deleted",
  del_follow_user: "follow_user_deleted",
  edit_external_contact: "customer_changed"
};

export async function resetYmtyWecomForTests() {
  await Promise.all([
    replaceRuntimeRecords(EVENT_FILE, []),
    replaceRuntimeRecords(SYNC_JOB_FILE, [])
  ]);
}

export function getYmtyWecomStatus() {
  const enabled = process.env.WECOM_ENABLED === "true";
  return {
    enabled,
    message: enabled ? "企业微信自动同步已启用" : "企业微信自动同步未启用"
  };
}

export function verifyYmtyWecomCallbackUrl(query = {}) {
  const config = requireEnabledConfig();
  const encrypted = cleanText(query.echostr, 4096);
  assertSignature({ config, query, encrypted });
  const plain = decryptWecomMessage({
    encodingAesKey: config.aesKey,
    encrypted,
    corpId: config.corpId
  });
  return { echostr: plain };
}

export async function receiveYmtyWecomCallback({ query = {}, rawBody = "" } = {}) {
  const config = requireEnabledConfig();
  const encrypted = extractXmlTag(rawBody, "Encrypt");
  assertSignature({ config, query, encrypted });
  const plainXml = decryptWecomMessage({
    encodingAesKey: config.aesKey,
    encrypted,
    corpId: config.corpId
  });
  const payload = parseWecomCustomerXml(plainXml);
  if (!payload.event_id) payload.event_id = buildEventId(payload);
  if (!payload.event_type) {
    return { status: "ignored" };
  }

  let existing = null;
  let stored = null;
  await updateRuntimeRecords(EVENT_FILE, (records) => {
    const normalized = records.map((item) => normalizeWecomEvent(item));
    existing = normalized.find((item) => item.event_id === payload.event_id);
    if (existing) return normalized;
    stored = normalizeWecomEvent({
      ...payload,
      status: "received",
      created_at: new Date().toISOString()
    });
    return normalized.concat(stored);
  });
  if (existing) return { status: "duplicate", event: existing };

  const handled = await linkWecomEvent(stored);
  return {
    status: handled.event.status === "linked" ? "processed" : handled.event.status,
    event: handled.event
  };
}

export async function listYmtyWecomEvents(query = {}) {
  const events = (await readRuntimeRecords(EVENT_FILE))
    .map((item) => normalizeWecomEvent(item))
    .filter((event) => !query.status || event.status === cleanText(query.status, 40))
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return { events };
}

export function publicYmtyWecomEvent(event = {}) {
  const normalized = normalizeWecomEvent(event);
  const { external_userid: externalUserid, ...publicEvent } = normalized;
  return {
    ...publicEvent,
    external_userid_masked: maskYmtyExternalUserid(externalUserid)
  };
}

export function publicYmtyWecomSyncJob(job = {}) {
  const normalized = normalizeSyncJob(job);
  const { external_userid: externalUserid, ...publicJob } = normalized;
  return {
    ...publicJob,
    external_userid_masked: maskYmtyExternalUserid(externalUserid)
  };
}

export async function listYmtyWecomSyncJobs(query = {}) {
  const jobs = (await readRuntimeRecords(SYNC_JOB_FILE))
    .map((item) => normalizeSyncJob(item))
    .filter((job) => !query.status || job.status === cleanText(query.status, 40))
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return { jobs };
}

export async function getYmtyWecomSummary() {
  const { enabled, message } = getYmtyWecomStatus();
  const events = (await readRuntimeRecords(EVENT_FILE)).map((item) => normalizeWecomEvent(item));
  const jobs = (await readRuntimeRecords(SYNC_JOB_FILE)).map((item) => normalizeSyncJob(item));
  const latest = events.slice().sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
  return {
    enabled,
    message,
    recent_callback_at: latest?.created_at || "",
    added_count: events.filter((event) => event.event_type === "customer_added" && event.status === "linked").length,
    unlinked_count: events.filter((event) => event.status === "unlinked").length,
    tag_sync_success: jobs.filter((job) => job.status === "success").length,
    tag_sync_failed: jobs.filter((job) => job.status === "failed").length
  };
}

export async function linkYmtyWecomEventToLead({ eventId = "", leadId = "" } = {}) {
  const { lead } = await getYmtyCrmLead(leadId);
  let event = null;
  await updateRuntimeRecords(EVENT_FILE, (records) => records.map((record) => {
    const current = normalizeWecomEvent(record);
    if (current.event_id !== eventId) return current;
    event = normalizeWecomEvent({
      ...current,
      linked_lead_id: lead.lead_id,
      linked_order_id: lead.order_id,
      code_key: lead.code_key,
      status: "linked"
    });
    return event;
  }));
  assertFound(event, "企业微信事件不存在");
  const sync = await syncTagsForLead({ lead, event, livecode: null });
  const updated = await markYmtyCrmLeadAddedFromWecom({
    leadId: lead.lead_id,
    externalUserid: event.external_userid,
    followUserUserid: event.follow_user_userid,
    eventTime: event.event_time,
    tagSyncStatus: sync.status,
    tagSyncError: sync.error
  });
  return {
    event: publicYmtyWecomEvent(event),
    lead: publicYmtyCrmLead(updated.lead)
  };
}

export async function retryYmtyWecomSyncJob(jobId = "") {
  let job = null;
  await updateRuntimeRecords(SYNC_JOB_FILE, (records) => records.map((record) => {
    const current = normalizeSyncJob(record);
    if (current.job_id !== jobId) return current;
    const result = performTagSync(current.tag_ids);
    job = normalizeSyncJob({
      ...current,
      status: result.status,
      error: result.error,
      retry_count: current.retry_count + 1,
      updated_at: new Date().toISOString()
    });
    return job;
  }));
  assertFound(job, "同步任务不存在");
  if (job.lead_id) {
    const { lead } = await getYmtyCrmLead(job.lead_id);
    await markYmtyCrmLeadAddedFromWecom({
      leadId: lead.lead_id,
      externalUserid: lead.external_userid,
      followUserUserid: lead.follow_user_userid,
      eventTime: lead.added_at,
      tagSyncStatus: job.status,
      tagSyncError: job.error
    });
  }
  return { job: publicYmtyWecomSyncJob(job) };
}

async function linkWecomEvent(event) {
  if (event.event_type !== "customer_added") {
    return updateStoredEvent({ ...event, status: "ignored" });
  }
  const { livecodes } = await listYmtyLivecodes();
  const livecode = livecodes.find((item) => item.wecom_state === event.state);
  if (!livecode) {
    return updateStoredEvent({ ...event, status: "unlinked" });
  }

  const { assignments } = await listYmtyLivecodeAssignments();
  const orderIds = new Set(assignments
    .filter((item) => item.status === "active" && item.code_key === livecode.code_key)
    .map((item) => item.order_id));
  const { leads } = await listYmtyCrmLeads({ code_key: livecode.code_key });
  const candidates = leads.filter((lead) => orderIds.has(lead.order_id) && !lead.external_userid);
  if (candidates.length !== 1) {
    return updateStoredEvent({ ...event, code_key: livecode.code_key, status: "unlinked" });
  }

  const lead = candidates[0];
  const sync = await syncTagsForLead({ lead, event, livecode });
  const updated = await markYmtyCrmLeadAddedFromWecom({
    leadId: lead.lead_id,
    externalUserid: event.external_userid,
    followUserUserid: event.follow_user_userid,
    eventTime: event.event_time,
    tagSyncStatus: sync.status,
    tagSyncError: sync.error
  });
  await recordYmtyTrustedEvent("wecom_added", {
    event_id: `wecom_added:${event.event_id}`,
    order_id: lead.order_id,
    product_code: lead.product_code,
    channel: lead.channel,
    campaign: lead.campaign,
    creative: lead.creative
  }).catch(() => {});
  return updateStoredEvent({
    ...event,
    linked_lead_id: updated.lead.lead_id,
    linked_order_id: updated.lead.order_id,
    code_key: livecode.code_key,
    status: "linked"
  });
}

async function updateStoredEvent(nextEvent) {
  let event = null;
  await updateRuntimeRecords(EVENT_FILE, (records) => records.map((record) => {
    const current = normalizeWecomEvent(record);
    if (current.event_id !== nextEvent.event_id) return current;
    event = normalizeWecomEvent({ ...current, ...nextEvent });
    return event;
  }));
  return { event };
}

async function syncTagsForLead({ lead, event, livecode }) {
  const tagIds = buildTagIds({ lead, livecode });
  const result = performTagSync(tagIds);
  const job = normalizeSyncJob({
    job_id: crypto.randomUUID(),
    lead_id: lead.lead_id,
    order_id: lead.order_id,
    event_id: event.event_id,
    external_userid: event.external_userid,
    follow_user_userid: event.follow_user_userid,
    tag_ids: tagIds,
    status: result.status,
    error: result.error,
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  await updateRuntimeRecords(SYNC_JOB_FILE, (records) => records.concat(job));
  return result;
}

function performTagSync(tagIds = []) {
  if (process.env.WECOM_MOCK_TAG_SYNC === "fail") {
    return { status: "failed", error: "mock tag sync failure" };
  }
  if (!tagIds.length) return { status: "skipped", error: "" };
  return { status: "success", error: "" };
}

function buildTagIds({ lead = {}, livecode = {} } = {}) {
  const configured = Array.isArray(livecode?.wecom_tag_ids) ? livecode.wecom_tag_ids : [];
  const suggested = [
    "产品:阳明体验营",
    lead.channel ? `渠道:${lead.channel}` : "",
    "支付状态:已支付",
    lead.campaign ? `活动:${lead.campaign}` : "",
    lead.creative ? `素材:${lead.creative}` : ""
  ].filter(Boolean);
  return Array.from(new Set([...configured, ...suggested].map((item) => cleanText(item, 80)).filter(Boolean))).slice(0, 20);
}

function requireEnabledConfig() {
  const status = getYmtyWecomStatus();
  if (!status.enabled) {
    const error = new Error("企业微信自动同步未启用");
    error.statusCode = 503;
    error.code = "WECOM_DISABLED";
    throw error;
  }
  const config = {
    corpId: cleanText(process.env.WECOM_CORP_ID, 120),
    token: cleanText(process.env.WECOM_CALLBACK_TOKEN, 120),
    aesKey: cleanText(process.env.WECOM_CALLBACK_AES_KEY, 80)
  };
  if (!config.corpId || !config.token || !config.aesKey) {
    const error = new Error("企业微信回调配置未完成");
    error.statusCode = 503;
    error.code = "WECOM_CONFIG_MISSING";
    throw error;
  }
  return config;
}

function assertSignature({ config, query, encrypted }) {
  const ok = verifyWecomSignature({
    token: config.token,
    timestamp: query.timestamp || "",
    nonce: query.nonce || "",
    encrypted,
    signature: query.msg_signature || query.signature || ""
  });
  if (!ok) {
    const error = new Error("企业微信回调签名错误");
    error.statusCode = 403;
    error.code = "WECOM_BAD_SIGNATURE";
    throw error;
  }
}

function parseWecomCustomerXml(xml = "") {
  const changeType = extractXmlTag(xml, "ChangeType");
  const eventType = CHANGE_TYPE_MAP[changeType] || "";
  const createTime = extractXmlTag(xml, "CreateTime");
  return {
    event_id: cleanText(extractXmlTag(xml, "EventKey"), 120),
    event_type: eventType,
    external_userid: cleanText(extractXmlTag(xml, "ExternalUserID"), 120),
    follow_user_userid: cleanText(extractXmlTag(xml, "UserID"), 120),
    state: cleanText(extractXmlTag(xml, "State"), 120),
    change_type: cleanText(changeType, 80),
    event_time: normalizeEventTime(createTime),
    linked_lead_id: "",
    linked_order_id: "",
    code_key: "",
    status: ""
  };
}

function normalizeWecomEvent(record = {}) {
  return {
    event_id: cleanText(record.event_id || buildEventId(record), 120),
    event_type: cleanText(record.event_type, 80),
    external_userid: cleanText(record.external_userid, 120),
    follow_user_userid: cleanText(record.follow_user_userid, 120),
    state: cleanText(record.state, 120),
    change_type: cleanText(record.change_type, 80),
    event_time: cleanText(record.event_time, 40),
    linked_lead_id: cleanText(record.linked_lead_id, 120),
    linked_order_id: cleanText(record.linked_order_id, 80),
    code_key: cleanText(record.code_key, 80),
    status: cleanText(record.status || "received", 40),
    created_at: cleanText(record.created_at || new Date().toISOString(), 40)
  };
}

function normalizeSyncJob(record = {}) {
  const createdAt = cleanText(record.created_at || new Date().toISOString(), 40);
  return {
    job_id: cleanText(record.job_id || crypto.randomUUID(), 120),
    lead_id: cleanText(record.lead_id, 120),
    order_id: cleanText(record.order_id, 80),
    event_id: cleanText(record.event_id, 120),
    external_userid: cleanText(record.external_userid, 120),
    follow_user_userid: cleanText(record.follow_user_userid, 120),
    tag_ids: normalizeTags(record.tag_ids),
    status: normalizeJobStatus(record.status),
    error: cleanText(record.error, 200),
    retry_count: normalizeNonNegativeInteger(record.retry_count, 0),
    created_at: createdAt,
    updated_at: cleanText(record.updated_at || createdAt, 40)
  };
}

function normalizeJobStatus(value) {
  const text = cleanText(value || "pending", 40);
  return ["pending", "success", "failed", "skipped"].includes(text) ? text : "pending";
}

function normalizeTags(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  return source.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 20);
}

function normalizeEventTime(value = "") {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return new Date(seconds * 1000).toISOString();
  return new Date().toISOString();
}

function buildEventId(payload = {}) {
  return crypto.createHash("sha256").update([
    payload.change_type,
    payload.external_userid,
    payload.follow_user_userid,
    payload.state,
    payload.event_time
  ].join("|")).digest("hex").slice(0, 32);
}

function extractXmlTag(xml = "", tag = "") {
  const pattern = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
  return cleanText(xml.match(pattern)?.[1] || "", 4096);
}

function assertFound(value, message) {
  if (value) return;
  const error = new Error(message);
  error.statusCode = 404;
  throw error;
}

function cleanText(value = "", maxLength = 120) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}

function normalizeNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}
