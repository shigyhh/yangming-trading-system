import crypto from "node:crypto";
import { config } from "../config.js";
import { readRuntimeRecords, replaceRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";
import { getYmtyOrderForPayment } from "./ymtyCampaign.js";
import { markYmtyCrmLeadRefunded } from "./ymtyCrm.js";
import {
  createAlipayRefund,
  createWechatRefund,
  parseWechatRefundNotify,
  queryAlipayRefund,
  queryWechatRefund,
  verifyWechatRefundNotify
} from "./payments/index.js";

const REFUND_FILE = "ymty-refunds.json";
const AUDIT_LOG_FILE = "ymty-audit-logs.json";
const COURSE_USER_FILE = "ymty-course-users.json";

const REFUND_STATUSES = new Set(["requested", "approved", "rejected", "processing", "refunded", "failed"]);
const APPROVER_ROLES = new Set(["owner", "super_admin", "finance_admin"]);

export async function resetYmtyRefundsForTests() {
  await replaceRuntimeRecords(REFUND_FILE, []);
}

export async function createYmtyRefund({ orderId = "", amountCents = 0, reason = "", admin = {}, ip = "" } = {}) {
  const order = await getPaidOrder(orderId);
  const amount = normalizeAmount(amountCents);
  if (!amount) {
    const error = new Error("退款金额必须大于 0");
    error.statusCode = 400;
    throw error;
  }
  const remaining = await getRefundableCents(order.order_id, order.amount_cents);
  if (amount > remaining) {
    const error = new Error("退款金额不能超过订单可退金额");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const refund = normalizeRefund({
    refund_id: `refund_${crypto.randomUUID()}`,
    order_id: order.order_id,
    provider: providerFromPayChannel(order.pay_channel),
    amount_cents: amount,
    reason: cleanText(reason, 300),
    status: "requested",
    requested_by: getAdminId(admin),
    requested_at: now,
    updated_at: now
  });
  await updateRuntimeRecords(REFUND_FILE, (records) => records.concat(refund));
  await appendAuditLog({
    adminId: getAdminId(admin),
    action: "refund_request",
    targetId: refund.refund_id,
    before: null,
    after: refund,
    ip
  });
  return { refund };
}

export async function listYmtyRefunds(query = {}) {
  const refunds = (await readRefunds())
    .filter((refund) => !query.status || refund.status === cleanText(query.status, 40))
    .filter((refund) => !query.order_id || refund.order_id === cleanText(query.order_id, 80))
    .sort((a, b) => new Date(b.updated_at || b.requested_at || 0).getTime() - new Date(a.updated_at || a.requested_at || 0).getTime());
  return { refunds };
}

export async function getYmtyRefund(refundId = "") {
  return { refund: await findRefund(refundId) };
}

export async function approveYmtyRefund({ refundId = "", admin = {}, ip = "" } = {}) {
  assertRefundApprover(admin);
  return updateRefundWithAudit({
    refundId,
    admin,
    ip,
    action: "refund_approve",
    update: (refund, now) => {
      assertRefundStatus(refund, ["requested"], "只有待审核退款可以审批通过");
      return {
        ...refund,
        status: "approved",
        approved_by: getAdminId(admin),
        approved_at: now,
        updated_at: now
      };
    }
  });
}

export async function rejectYmtyRefund({ refundId = "", reason = "", admin = {}, ip = "" } = {}) {
  assertRefundApprover(admin);
  return updateRefundWithAudit({
    refundId,
    admin,
    ip,
    action: "refund_reject",
    update: (refund, now) => {
      assertRefundStatus(refund, ["requested", "approved"], "当前退款状态不能驳回");
      return {
        ...refund,
        status: "rejected",
        rejected_by: getAdminId(admin),
        provider_error_message: cleanText(reason, 300),
        updated_at: now
      };
    }
  });
}

export async function executeYmtyRefund({ refundId = "", confirmOrderSuffix = "", admin = {}, ip = "" } = {}) {
  assertRefundApprover(admin);
  const refund = await findRefund(refundId);
  const order = await getPaidOrder(refund.order_id);
  assertRefundAmountStillValid(refund, order);

  if (["processing", "refunded", "failed"].includes(refund.status)) {
    return { refund };
  }
  assertRefundStatus(refund, ["approved"], "只有已审核退款可以执行");
  assertRefundExecutionEnabled();
  assertOrderSuffix(order, confirmOrderSuffix);

  const result = await runProviderOperation({
    refund,
    order,
    operation: "execute"
  });
  await appendAuditLog({
    adminId: getAdminId(admin),
    action: "refund_execute",
    targetId: result.refund.refund_id,
    before: refund,
    after: result.refund,
    ip
  });
  return result;
}

export async function queryYmtyRefundProvider({ refundId = "", admin = {}, ip = "" } = {}) {
  assertRefundApprover(admin);
  const refund = await findRefund(refundId);
  const order = await getPaidOrder(refund.order_id);
  if (!["approved", "processing", "refunded", "failed"].includes(refund.status)) {
    const error = new Error("当前退款状态不能查询平台结果");
    error.statusCode = 400;
    throw error;
  }
  const result = await runProviderOperation({
    refund,
    order,
    operation: "query"
  });
  await appendAuditLog({
    adminId: getAdminId(admin),
    action: "refund_query",
    targetId: result.refund.refund_id,
    before: refund,
    after: result.refund,
    ip
  });
  return result;
}

export async function handleWechatRefundNotify({ headers = {}, body = Buffer.alloc(0) } = {}) {
  await verifyWechatRefundNotify(headers, body);
  const payload = await parseWechatRefundNotify(body);
  if (payload.mchid && payload.mchid !== process.env.WECHAT_MCH_ID) {
    const error = new Error("微信退款通知商户号不一致");
    error.statusCode = 400;
    throw error;
  }
  const refund = await findRefund(payload.out_refund_no || "");
  const order = await getPaidOrder(refund.order_id);
  if (payload.out_trade_no && payload.out_trade_no !== order.order_id) {
    const error = new Error("微信退款通知订单号不一致");
    error.statusCode = 400;
    throw error;
  }
  if (payload.amount?.refund !== undefined && Number(payload.amount.refund) !== Number(refund.amount_cents)) {
    const error = new Error("微信退款通知金额不一致");
    error.statusCode = 400;
    throw error;
  }
  const result = await markYmtyRefundProviderResult({
    refundId: refund.refund_id,
    ...mapWechatRefundResult(payload)
  });
  await appendAuditLog({
    adminId: "system",
    action: "refund_wechat_notify",
    targetId: result.refund.refund_id,
    before: refund,
    after: result.refund,
    ip: ""
  });
  return result;
}

export async function markYmtyRefundProviderResult({
  refundId = "",
  status = "",
  providerRefundId = "",
  providerErrorCode = "",
  providerErrorMessage = ""
} = {}) {
  const normalizedStatus = normalizeStatus(status);
  if (!["processing", "refunded", "failed"].includes(normalizedStatus)) {
    const error = new Error("退款平台结果状态不合法");
    error.statusCode = 400;
    throw error;
  }

  const current = await findRefund(refundId);
  if (current.status === normalizedStatus && ["refunded", "failed"].includes(current.status)) {
    return { refund: current };
  }

  if (normalizedStatus === "refunded") {
    const order = await getYmtyOrderForPayment(current.order_id);
    const remaining = await getRefundableCents(current.order_id, order.amount_cents, current.refund_id);
    if (current.amount_cents > remaining) {
      const error = new Error("同一订单累计成功退款不能超过实付金额");
      error.statusCode = 400;
      throw error;
    }
  }

  const result = await updateRefundWithAudit({
    refundId,
    admin: { adminId: "system" },
    ip: "",
    action: "refund_provider_result",
    update: (refund, now) => {
      if (refund.status === normalizedStatus && ["refunded", "failed"].includes(refund.status)) return refund;
      assertRefundStatus(refund, ["approved", "processing"], "只有已审核退款可以进入平台处理");
      return {
        ...refund,
        status: normalizedStatus,
        provider_refund_id: cleanText(providerRefundId, 120) || refund.provider_refund_id,
        provider_error_code: cleanText(providerErrorCode, 80),
        provider_error_message: cleanText(providerErrorMessage, 300),
        completed_at: normalizedStatus === "refunded" ? now : refund.completed_at,
        updated_at: now
      };
    }
  });

  if (result.refund.status === "refunded") {
    await markYmtyCrmLeadRefunded({
      orderId: result.refund.order_id,
      refundStatus: "refunded"
    });
    if (shouldRevokeCourseOnRefund()) {
      await revokeCourseRights(result.refund.order_id);
    }
  }
  return result;
}

async function runProviderOperation({ refund, order, operation }) {
  try {
    if (refund.provider === "wechat") {
      const payload = operation === "query" ? await queryWechatRefund(refund) : await createWechatRefund(refund, order);
      return markYmtyRefundProviderResult({
        refundId: refund.refund_id,
        ...mapWechatRefundResult(payload)
      });
    }
    if (refund.provider === "alipay") {
      const payload = operation === "query" ? await queryAlipayRefund(refund, order) : await createAlipayRefund(refund, order);
      return markYmtyRefundProviderResult({
        refundId: refund.refund_id,
        ...mapAlipayRefundResult(payload)
      });
    }
    const error = new Error("当前订单不支持真实退款执行");
    error.statusCode = 400;
    throw error;
  } catch (error) {
    if (isTimeoutError(error)) {
      return markYmtyRefundProviderResult({
        refundId: refund.refund_id,
        status: "processing",
        providerErrorCode: "PROVIDER_TIMEOUT",
        providerErrorMessage: "退款请求超时，等待平台结果查询"
      });
    }
    throw error;
  }
}

function mapWechatRefundResult(payload = {}) {
  const providerStatus = cleanText(payload.status || payload.refund_status, 40).toUpperCase();
  const statusMap = {
    SUCCESS: "refunded",
    PROCESSING: "processing",
    ABNORMAL: "failed",
    CLOSED: "failed"
  };
  return {
    status: statusMap[providerStatus] || "processing",
    providerRefundId: payload.refund_id || "",
    providerErrorCode: providerStatus && !["SUCCESS", "PROCESSING"].includes(providerStatus) ? providerStatus : "",
    providerErrorMessage: payload.status_message || payload.message || ""
  };
}

function mapAlipayRefundResult(payload = {}) {
  const code = cleanText(payload.code, 40);
  const refundStatus = cleanText(payload.refundStatus || payload.refund_status, 40).toUpperCase();
  if (code === "10000" && (!refundStatus || refundStatus === "REFUND_SUCCESS")) {
    return {
      status: "refunded",
      providerRefundId: payload.tradeNo || payload.trade_no || payload.outRequestNo || payload.out_request_no || "",
      providerErrorCode: "",
      providerErrorMessage: ""
    };
  }
  if (code === "10000") {
    return {
      status: "processing",
      providerRefundId: payload.tradeNo || payload.trade_no || "",
      providerErrorCode: refundStatus,
      providerErrorMessage: payload.msg || ""
    };
  }
  return {
    status: "failed",
    providerRefundId: payload.tradeNo || payload.trade_no || "",
    providerErrorCode: code || payload.subCode || payload.sub_code || "ALIPAY_REFUND_FAILED",
    providerErrorMessage: payload.subMsg || payload.sub_msg || payload.msg || "支付宝退款失败"
  };
}

async function updateRefundWithAudit({ refundId, admin, ip, action, update }) {
  let before = null;
  let after = null;
  const now = new Date().toISOString();
  await updateRuntimeRecords(REFUND_FILE, (records) => {
    const normalized = records.map((item) => normalizeRefund(item));
    const index = normalized.findIndex((item) => item.refund_id === cleanText(refundId, 120));
    if (index < 0) {
      const error = new Error("退款申请不存在");
      error.statusCode = 404;
      throw error;
    }
    before = normalized[index];
    const updated = update(before, now);
    if (updated && typeof updated.then === "function") {
      const error = new Error("退款更新函数不能异步运行");
      error.statusCode = 500;
      throw error;
    }
    after = normalizeRefund(updated);
    normalized[index] = after;
    return normalized;
  });
  await appendAuditLog({
    adminId: getAdminId(admin),
    action,
    targetId: after.refund_id,
    before,
    after,
    ip
  });
  return { refund: after };
}

async function getPaidOrder(orderId) {
  const order = await getYmtyOrderForPayment(orderId);
  if (order.pay_status !== "paid") {
    const error = new Error("只有 paid 订单可申请退款");
    error.statusCode = 400;
    throw error;
  }
  return order;
}

async function getRefundableCents(orderId, paidAmountCents, excludeRefundId = "") {
  const refunds = await readRefunds();
  const refunded = refunds
    .filter((refund) => refund.order_id === orderId && refund.status === "refunded" && refund.refund_id !== excludeRefundId)
    .reduce((sum, refund) => sum + Number(refund.amount_cents || 0), 0);
  return Math.max(0, Number(paidAmountCents || 0) - refunded);
}

async function readRefunds() {
  return (await readRuntimeRecords(REFUND_FILE)).map((item) => normalizeRefund(item));
}

async function findRefund(refundId) {
  const normalizedRefundId = cleanText(refundId, 120);
  const refund = (await readRefunds()).find((item) => item.refund_id === normalizedRefundId);
  if (!refund) {
    const error = new Error("退款申请不存在");
    error.statusCode = 404;
    throw error;
  }
  return refund;
}

async function revokeCourseRights(orderId) {
  const now = new Date().toISOString();
  await updateRuntimeRecords(COURSE_USER_FILE, (records) => records.map((record) => {
    if (record?.order_id !== orderId) return record;
    return {
      ...record,
      status: "revoked",
      revoked_at: now,
      updated_at: now
    };
  }));
}

function assertRefundApprover(admin) {
  const role = cleanText(admin?.user?.role || "", 40);
  if (APPROVER_ROLES.has(role)) return;
  const error = new Error("需要高权限管理员审核退款");
  error.statusCode = 403;
  throw error;
}

function assertRefundStatus(refund, allowed, message) {
  if (allowed.includes(refund.status)) return;
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function assertRefundExecutionEnabled() {
  if (process.env.YMTY_REFUND_EXECUTION_ENABLED === "true") return;
  const error = new Error("真实退款执行未启用");
  error.statusCode = 403;
  throw error;
}

function assertOrderSuffix(order, confirmOrderSuffix) {
  const expected = String(order.order_id || "").slice(-6);
  if (expected && cleanText(confirmOrderSuffix, 20) === expected) return;
  const error = new Error("请先输入订单号后6位确认退款执行");
  error.statusCode = 400;
  throw error;
}

function assertRefundAmountStillValid(refund, order) {
  if (Number(refund.amount_cents || 0) <= Number(order.amount_cents || 0)) return;
  const error = new Error("退款金额不能超过订单实付金额");
  error.statusCode = 400;
  throw error;
}

function isTimeoutError(error) {
  const code = cleanText(error?.code, 40).toUpperCase();
  const message = cleanText(error?.message, 300).toLowerCase();
  return error?.name === "AbortError" || ["ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"].includes(code) || message.includes("timeout") || message.includes("timed out") || message.includes("超时");
}

async function appendAuditLog({ adminId, action, targetId, before, after, ip }) {
  const auditLog = {
    id: crypto.randomUUID(),
    admin_id: cleanText(adminId, 80) || "dev-admin",
    action,
    target_type: "refunds",
    target_id: targetId,
    before_json: before,
    after_json: after,
    ip: cleanText(ip, 80),
    created_at: new Date().toISOString()
  };
  await updateRuntimeRecords(AUDIT_LOG_FILE, (records) => records.concat(auditLog));
  return auditLog;
}

function normalizeRefund(record = {}) {
  const requestedAt = cleanText(record.requested_at || new Date().toISOString(), 40);
  return {
    refund_id: cleanText(record.refund_id || `refund_${crypto.randomUUID()}`, 120),
    order_id: cleanText(record.order_id, 80),
    provider: cleanText(record.provider || "mock", 40),
    amount_cents: normalizeAmount(record.amount_cents),
    reason: cleanText(record.reason, 300),
    status: normalizeStatus(record.status),
    requested_by: cleanText(record.requested_by, 80),
    approved_by: cleanText(record.approved_by, 80),
    rejected_by: cleanText(record.rejected_by, 80),
    provider_refund_id: cleanText(record.provider_refund_id, 120),
    provider_error_code: cleanText(record.provider_error_code, 80),
    provider_error_message: cleanText(record.provider_error_message, 300),
    requested_at: requestedAt,
    approved_at: cleanText(record.approved_at, 40),
    completed_at: cleanText(record.completed_at, 40),
    updated_at: cleanText(record.updated_at || requestedAt, 40)
  };
}

function normalizeStatus(status = "requested") {
  const text = cleanText(status || "requested", 40);
  return REFUND_STATUSES.has(text) ? text : "requested";
}

function providerFromPayChannel(payChannel = "") {
  const text = cleanText(payChannel, 40);
  if (text.startsWith("wechat")) return "wechat";
  if (text.startsWith("alipay")) return "alipay";
  return text || "mock";
}

function shouldRevokeCourseOnRefund() {
  return String(process.env.YMTY_REFUND_REVOKE_COURSE_ON_SUCCESS || "true").toLowerCase() !== "false";
}

function getAdminId(admin = {}) {
  return cleanText(admin.adminId || admin.user?.username || "dev-admin", 80);
}

function normalizeAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.floor(number);
}

function cleanText(value = "", maxLength = 120) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}
