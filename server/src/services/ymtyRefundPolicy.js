import crypto from "node:crypto";
import { checkAlipayConfig, checkWechatConfig } from "./paymentConfig.js";
import { readRuntimeRecords, replaceRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";
import { getYmtyOrderForPayment } from "./ymtyCampaign.js";
import { listYmtyRefunds } from "./ymtyRefunds.js";

const POLICY_FILE = "ymty-refund-policy.json";
const AUDIT_LOG_FILE = "ymty-audit-logs.json";

const MODES = new Set(["disabled", "manual_only", "auto_rule"]);
const TRIGGER_TYPES = new Set([
  "test_order",
  "duplicate_payment",
  "fulfillment_failure",
  "product_offline_after_payment",
  "promotional_auto_refund"
]);
const PAY_CHANNELS = new Set(["mock", "wechat_jsapi", "wechat_h5", "alipay_wap"]);

export const DEFAULT_REFUND_POLICY = Object.freeze({
  mode: "disabled",
  delay_seconds: 5,
  max_amount_cents: 168,
  product_codes: ["YMXX_JY_TY"],
  pay_channels: ["wechat_jsapi", "wechat_h5", "alipay_wap"],
  trigger_types: [],
  revoke_course_access: true,
  promotional_keep_access: false,
  max_auto_refunds_per_order: 1,
  updated_at: "",
  updated_by: ""
});

export async function resetYmtyRefundPolicyForTests() {
  await replaceRuntimeRecords(POLICY_FILE, []);
}

export async function getYmtyRefundPolicy() {
  const records = await readRuntimeRecords(POLICY_FILE);
  const latest = Array.isArray(records) ? records[records.length - 1] : records;
  return normalizePolicy(latest || DEFAULT_REFUND_POLICY, { strict: false });
}

export async function updateYmtyRefundPolicy({ patch = {}, admin = {}, ip = "" } = {}) {
  const before = await getYmtyRefundPolicy();
  const now = new Date().toISOString();
  const after = normalizePolicy({
    ...before,
    ...patch,
    max_auto_refunds_per_order: 1,
    updated_at: now,
    updated_by: cleanText(admin.adminId || admin.user?.username || "ymty-admin", 80)
  }, { strict: true });
  await replaceRuntimeRecords(POLICY_FILE, [after]);
  await appendAuditLog({
    adminId: after.updated_by,
    action: "refund_policy_update",
    targetId: "ymty-refund-policy",
    before,
    after,
    ip
  });
  return { policy: after };
}

export async function getYmtyRefundConfigStatus() {
  const policy = await getYmtyRefundPolicy();
  const executionEnabled = isEnvTrue(process.env.YMTY_REFUND_EXECUTION_ENABLED);
  const autoRefundEnabled = isEnvTrue(process.env.YMTY_AUTO_REFUND_ENABLED);
  const wechatStatus = checkWechatConfig(process.env);
  const alipayStatus = checkAlipayConfig(process.env);
  const warnings = [];
  if (!executionEnabled) warnings.push("当前仅可申请、审批和演练，不会真实退款。");
  if (policy.mode === "auto_rule" && !autoRefundEnabled) warnings.push("自动退款规则已保存，但自动退款执行未开启。");
  if (!wechatStatus.ok) warnings.push("微信退款配置未就绪。");
  if (!alipayStatus.ok) warnings.push("支付宝退款配置未就绪。");
  return {
    execution_enabled: executionEnabled,
    auto_refund_enabled: autoRefundEnabled,
    policy,
    providers: {
      wechat: {
        configured: Boolean(wechatStatus.ok),
        refund_ready: Boolean(wechatStatus.ok && process.env.WECHAT_NOTIFY_URL),
        notify_url_configured: Boolean(String(process.env.WECHAT_NOTIFY_URL || "").trim())
      },
      alipay: {
        configured: Boolean(alipayStatus.ok),
        refund_ready: Boolean(alipayStatus.ok)
      }
    },
    revoke_course_access_on_refund: String(process.env.YMTY_REFUND_REVOKE_COURSE_ON_SUCCESS || "true").toLowerCase() !== "false",
    warnings
  };
}

export async function previewYmtyRefund({ orderId = "", amountCents = 0, triggerType = "" } = {}) {
  const policy = await getYmtyRefundPolicy();
  const config = await getYmtyRefundConfigStatus();
  const amount = normalizeInteger(amountCents, 0, 1000000, "演练金额");
  const trigger = cleanText(triggerType, 80);
  if (!TRIGGER_TYPES.has(trigger)) {
    const error = new Error("退款触发原因不支持");
    error.statusCode = 400;
    throw error;
  }
  const order = await getYmtyOrderForPayment(orderId);
  const refundable = await getRefundableCents(order.order_id, order.amount_cents);
  const provider = providerFromPayChannel(order.pay_channel);
  const policyResult = {
    mode: policy.mode,
    trigger_matched: policy.trigger_types.includes(trigger),
    product_matched: policy.product_codes.includes(order.product_code),
    pay_channel_matched: policy.pay_channels.includes(order.pay_channel),
    amount_within_limit: amount <= policy.max_amount_cents
  };
  const blockers = [];
  if (order.pay_status !== "paid") blockers.push("订单未支付");
  if (refundable <= 0) blockers.push("订单已无可退金额");
  if (amount <= 0) blockers.push("演练金额必须大于 0");
  if (amount > refundable) blockers.push("演练金额超过订单可退金额");
  if (policy.mode !== "auto_rule") blockers.push("自动退款模式未启用");
  if (policy.trigger_types.length === 0 || !policyResult.trigger_matched) blockers.push("自动退款触发条件未命中");
  if (!policyResult.product_matched) blockers.push("产品不在自动退款规则内");
  if (!policyResult.pay_channel_matched) blockers.push("支付方式不在自动退款规则内");
  if (!policyResult.amount_within_limit) blockers.push("演练金额超过自动退款金额上限");
  if (!config.execution_enabled) blockers.push("YMTY_REFUND_EXECUTION_ENABLED 未开启");
  if (!config.auto_refund_enabled) blockers.push("YMTY_AUTO_REFUND_ENABLED 未开启");

  const eligible = order.pay_status === "paid" &&
    refundable > 0 &&
    amount > 0 &&
    amount <= refundable &&
    policy.mode === "auto_rule" &&
    policyResult.trigger_matched &&
    policyResult.product_matched &&
    policyResult.pay_channel_matched &&
    policyResult.amount_within_limit;
  const wouldExecute = eligible && config.execution_enabled && config.auto_refund_enabled;
  const revokeAccess = trigger === "promotional_auto_refund" && policy.promotional_keep_access
    ? false
    : Boolean(policy.revoke_course_access);
  return {
    eligible,
    would_execute: wouldExecute,
    provider,
    order: {
      order_id: order.order_id,
      pay_status: order.pay_status,
      amount_cents: Number(order.amount_cents || 0),
      refundable_cents: refundable
    },
    policy_result: policyResult,
    effects: {
      would_create_refund: eligible,
      would_auto_approve: eligible && policy.mode === "auto_rule",
      would_call_provider: false,
      would_revoke_course_access: eligible && revokeAccess,
      would_update_crm: eligible
    },
    blockers: Array.from(new Set(blockers.filter((item) => item !== ""))),
    timeline: [
      "payment_success",
      "refund_requested",
      "refund_approved",
      "refund_processing",
      "refund_provider_confirmed",
      "refunded"
    ]
  };
}

function normalizePolicy(input = {}, { strict = false } = {}) {
  const mode = cleanText(input.mode || DEFAULT_REFUND_POLICY.mode, 40);
  if (!MODES.has(mode)) return rejectOrDefault(strict, "运行模式不合法", DEFAULT_REFUND_POLICY);
  return {
    mode,
    delay_seconds: normalizeInteger(input.delay_seconds ?? DEFAULT_REFUND_POLICY.delay_seconds, 0, 86400, "延迟秒数"),
    max_amount_cents: normalizeInteger(input.max_amount_cents ?? DEFAULT_REFUND_POLICY.max_amount_cents, 1, 1000000, "自动退款金额上限"),
    product_codes: normalizeTextArray(input.product_codes, {
      fallback: DEFAULT_REFUND_POLICY.product_codes,
      maxItems: 20,
      maxLength: 80,
      label: "适用产品"
    }),
    pay_channels: normalizeEnumArray(input.pay_channels, {
      allowed: PAY_CHANNELS,
      fallback: DEFAULT_REFUND_POLICY.pay_channels,
      label: "适用支付方式"
    }),
    trigger_types: normalizeEnumArray(input.trigger_types, {
      allowed: TRIGGER_TYPES,
      fallback: [],
      label: "触发条件",
      allowEmpty: true
    }),
    revoke_course_access: input.revoke_course_access !== false,
    promotional_keep_access: Boolean(input.promotional_keep_access),
    max_auto_refunds_per_order: 1,
    updated_at: cleanText(input.updated_at, 40),
    updated_by: cleanText(input.updated_by, 80)
  };
}

function normalizeTextArray(value, { fallback, maxItems, maxLength, label }) {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(",");
  const normalized = list
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
  if (normalized.length > 0) return Array.from(new Set(normalized));
  if (fallback) return fallback.slice();
  throw validationError(`${label}不能为空`);
}

function normalizeEnumArray(value, { allowed, fallback, label, allowEmpty = false }) {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(",");
  const normalized = list
    .map((item) => cleanText(item, 80))
    .filter(Boolean);
  for (const item of normalized) {
    if (!allowed.has(item)) throw validationError(`${label}不合法`);
  }
  if (normalized.length > 0) return Array.from(new Set(normalized));
  if (allowEmpty) return [];
  return fallback.slice();
}

function normalizeInteger(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw validationError(`${label}超出范围`);
  }
  return number;
}

async function getRefundableCents(orderId, paidAmountCents) {
  const { refunds } = await listYmtyRefunds({ order_id: orderId });
  const refunded = refunds
    .filter((refund) => refund.status === "refunded")
    .reduce((sum, refund) => sum + Number(refund.amount_cents || 0), 0);
  return Math.max(0, Number(paidAmountCents || 0) - refunded);
}

async function appendAuditLog({ adminId, action, targetId, before, after, ip }) {
  const auditLog = {
    id: crypto.randomUUID(),
    admin_id: cleanText(adminId, 80) || "dev-admin",
    action,
    target_type: "refund_policy",
    target_id: targetId,
    before_json: before,
    after_json: after,
    ip: cleanText(ip, 80),
    created_at: new Date().toISOString()
  };
  await updateRuntimeRecords(AUDIT_LOG_FILE, (records) => records.concat(auditLog));
  return auditLog;
}

function rejectOrDefault(strict, message, fallback) {
  if (!strict) return fallback;
  throw validationError(message);
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function providerFromPayChannel(payChannel = "") {
  const text = cleanText(payChannel, 40);
  if (text.startsWith("wechat")) return "wechat";
  if (text.startsWith("alipay")) return "alipay";
  return text || "mock";
}

function isEnvTrue(value) {
  return value === "true";
}

function cleanText(value = "", maxLength = 120) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}
