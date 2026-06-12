import crypto from "node:crypto";
import { config } from "../config.js";
import { readRuntimeRecords, replaceRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const PRODUCT_FILE = "ymty-products.json";
const LIVECODE_FILE = "ymty-livecodes.json";
const ORDER_FILE = "ymty-orders.json";
const PAYMENT_LOG_FILE = "ymty-payment-logs.json";
const COURSE_USER_FILE = "ymty-course-users.json";
const ADMIN_USER_FILE = "ymty-admin-users.json";
const AUDIT_LOG_FILE = "ymty-audit-logs.json";

const DEFAULT_PRODUCT_CODE = "YMXX_JY_TY";
const DEFAULT_LIVECODE_KEY = "YMXX_YMTY_DEFAULT";

const defaultProduct = {
  product_code: DEFAULT_PRODUCT_CODE,
  product_name: "阳明心学交易体验营",
  display_price_yuan: 1.68,
  amount_cents: 168,
  currency: "CNY",
  cycle: "7天训练",
  start_time: "每周滚动开营｜晚20:00",
  lecturer: "知行飞哥",
  status: "online"
};

const defaultLivecode = {
  code_key: DEFAULT_LIVECODE_KEY,
  name: "阳明心学交易体验营默认活码",
  wecom_link: "https://work.weixin.qq.com/ca/mock",
  qr_image: "/assets/wecom-livecode-placeholder.svg",
  auto_redirect_after_paid: false,
  redirect_delay_ms: 600,
  remark: "知行 + 手机号后4位",
  button_text: "添加课程助教微信",
  service_text: "客服方式：支付后添加课程助教微信",
  status: "active"
};

const defaultAdminUser = {
  username: "local_ymty_admin",
  password_hash: "local-dev-placeholder-not-for-production",
  role: "admin",
  status: "active"
};

export async function seedYmtyDefaults() {
  const now = new Date().toISOString();
  const [products, livecodes, adminUsers] = await Promise.all([
    updateRuntimeRecords(PRODUCT_FILE, (records) => insertByKeyIfMissing(records, "product_code", {
      ...defaultProduct,
      created_at: now,
      updated_at: now
    })),
    updateRuntimeRecords(LIVECODE_FILE, (records) => insertByKeyIfMissing(records, "code_key", {
      ...defaultLivecode,
      created_at: now,
      updated_at: now
    })),
    updateRuntimeRecords(ADMIN_USER_FILE, (records) => insertByKeyIfMissing(records, "username", {
      ...defaultAdminUser,
      id: "admin-local-ymty",
      created_at: now,
      updated_at: now
    }))
  ]);

  return {
    products,
    livecodes,
    admin_users: adminUsers
  };
}

export async function resetYmtyForTests() {
  await Promise.all([
    replaceRuntimeRecords(PRODUCT_FILE, []),
    replaceRuntimeRecords(LIVECODE_FILE, []),
    replaceRuntimeRecords(ORDER_FILE, []),
    replaceRuntimeRecords(PAYMENT_LOG_FILE, []),
    replaceRuntimeRecords(COURSE_USER_FILE, []),
    replaceRuntimeRecords(ADMIN_USER_FILE, []),
    replaceRuntimeRecords(AUDIT_LOG_FILE, [])
  ]);
}

export async function getYmtyPublicCampaign() {
  const { product, livecode } = await getActiveYmtyConfig();
  return {
    product: publicProduct(product),
    livecode: publicLivecodeSummary(livecode),
    compliance: "本系统仅用于交易认知、行为训练与风险教育；不荐股、不喊单、不承诺收益、不代客理财、不组织实盘跟单。"
  };
}

export async function getYmtyAdminCampaign() {
  const { product, livecode } = await getActiveYmtyConfig();
  return {
    product,
    livecode
  };
}

export async function createYmtyOrder({
  productCode = DEFAULT_PRODUCT_CODE,
  payChannel = "mock",
  channel = "",
  campaign = "",
  creative = ""
} = {}) {
  const product = await getProductByCode(productCode);
  if (!product || product.status !== "online") {
    const error = new Error("体验营产品不存在或未上线");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date().toISOString();
  const order = {
    order_id: createOrderId(),
    order_token: crypto.randomBytes(24).toString("hex"),
    product_code: product.product_code,
    product_name: product.product_name,
    amount_cents: Number(product.amount_cents),
    pay_channel: normalizeEnum(payChannel, "mock", 32),
    pay_status: "pending",
    transaction_id: "",
    channel: cleanText(channel, 80),
    campaign: cleanText(campaign, 80),
    creative: cleanText(creative, 80),
    paid_at: null,
    created_at: now,
    updated_at: now
  };

  await updateRuntimeRecords(ORDER_FILE, (records) => records.concat(order));

  return {
    order: publicOrder(order, { includeToken: true }),
    mock_payment: {
      status: "pending",
      mock_pay_url: `/api/mock/pay-success?order_id=${encodeURIComponent(order.order_id)}&token=${encodeURIComponent(order.order_token)}`,
      note: "mock 支付仅用于开发和测试，不代表真实微信或支付宝支付。"
    }
  };
}

export async function getYmtyOrderStatus({ orderId = "", token = "" } = {}) {
  const order = await getOrderWithToken(orderId, token);
  return {
    order: publicOrder(order)
  };
}

export async function getYmtyAfterpayEntrance({ orderId = "", token = "" } = {}) {
  const order = await getOrderWithToken(orderId, token);
  if (order.pay_status !== "paid") {
    const error = new Error("支付完成后才可查看课程助教入口");
    error.statusCode = 403;
    throw error;
  }

  const livecode = await getActiveLivecode();
  return {
    order: publicOrder(order),
    livecode: {
      code_key: livecode.code_key,
      name: livecode.name,
      wecom_link: livecode.wecom_link,
      qr_image: livecode.qr_image,
      auto_redirect: Boolean(livecode.auto_redirect_after_paid),
      auto_redirect_after_paid: Boolean(livecode.auto_redirect_after_paid),
      redirect_delay_ms: Number(livecode.redirect_delay_ms || 0),
      remark: livecode.remark,
      button_text: livecode.button_text,
      service_text: livecode.service_text
    },
    compliance: "课程助教仅做交易心理觉察、训练与复盘承接，不荐股、不喊单、不承诺收益、不代客理财、不组织实盘跟单。"
  };
}

export async function markYmtyMockPaySuccess({ orderId = "", token = "", transactionId = "" } = {}) {
  assertMockPayAllowed();
  const existingOrder = await getOrderWithToken(orderId, token);
  const now = new Date().toISOString();
  let paidOrder = existingOrder;

  if (existingOrder.pay_status !== "paid") {
    await updateRuntimeRecords(ORDER_FILE, (records) => records.map((order) => {
      if (order.order_id !== existingOrder.order_id) return order;
      paidOrder = {
        ...order,
        pay_status: "paid",
        transaction_id: cleanText(transactionId || `mock-${order.order_id}`, 120),
        paid_at: now,
        updated_at: now
      };
      return paidOrder;
    }));
  }

  const paymentLog = await appendPaymentLog({
    order_id: paidOrder.order_id,
    pay_channel: paidOrder.pay_channel,
    event_type: existingOrder.pay_status === "paid" ? "mock_pay_success_idempotent" : "mock_pay_success",
    raw_payload: {
      order_id: paidOrder.order_id,
      transaction_id: transactionId || paidOrder.transaction_id,
      source: "mock"
    },
    verify_status: "mock_verified"
  });
  const courseUser = await ensureCourseUser(paidOrder);

  return {
    order: publicOrder(paidOrder),
    payment_log: paymentLog,
    course_user: courseUser
  };
}

export async function updateYmtyCampaign({ adminId = "dev-admin", patch = {}, ip = "" } = {}) {
  await seedYmtyDefaults();
  const productCode = cleanText(patch.product_code || DEFAULT_PRODUCT_CODE, 80);
  let before = null;
  let after = null;
  const now = new Date().toISOString();

  await updateRuntimeRecords(PRODUCT_FILE, (records) => records.map((product) => {
    if (product.product_code !== productCode) return product;
    before = product;
    after = {
      ...product,
      product_name: cleanText(patch.product_name ?? product.product_name, 120),
      display_price_yuan: normalizeDisplayPrice(patch.display_price_yuan ?? product.display_price_yuan),
      amount_cents: normalizeAmountCents(patch.amount_cents ?? product.amount_cents),
      currency: normalizeEnum(patch.currency ?? product.currency, "CNY", 16),
      cycle: cleanText(patch.cycle ?? product.cycle, 80),
      start_time: cleanText(patch.start_time ?? product.start_time, 120),
      lecturer: cleanText(patch.lecturer ?? product.lecturer, 80),
      status: normalizeEnum(patch.status ?? product.status, "online", 32),
      updated_at: now
    };
    return after;
  }));

  if (!after) {
    const error = new Error("体验营产品不存在");
    error.statusCode = 404;
    throw error;
  }
  await appendAuditLog({ adminId, action: "update_product", targetType: "products", targetId: productCode, before, after, ip });
  return { product: after };
}

export async function updateYmtyLivecode({ adminId = "dev-admin", patch = {}, ip = "" } = {}) {
  await seedYmtyDefaults();
  const codeKey = cleanText(patch.code_key || DEFAULT_LIVECODE_KEY, 80);
  let before = null;
  let after = null;
  const now = new Date().toISOString();

  await updateRuntimeRecords(LIVECODE_FILE, (records) => records.map((livecode) => {
    if (livecode.code_key !== codeKey) return livecode;
    before = livecode;
    after = {
      ...livecode,
      name: cleanText(patch.name ?? livecode.name, 120),
      wecom_link: cleanText(patch.wecom_link ?? livecode.wecom_link, 300),
      qr_image: cleanText(patch.qr_image ?? livecode.qr_image, 300),
      auto_redirect_after_paid: Boolean(patch.auto_redirect_after_paid ?? livecode.auto_redirect_after_paid),
      redirect_delay_ms: normalizeDelayMs(patch.redirect_delay_ms ?? livecode.redirect_delay_ms),
      remark: cleanText(patch.remark ?? livecode.remark, 160),
      button_text: cleanText(patch.button_text ?? livecode.button_text, 80),
      service_text: cleanText(patch.service_text ?? livecode.service_text, 160),
      status: normalizeEnum(patch.status ?? livecode.status, "active", 32),
      updated_at: now
    };
    return after;
  }));

  if (!after) {
    const error = new Error("体验营活码不存在");
    error.statusCode = 404;
    throw error;
  }
  await appendAuditLog({ adminId, action: "update_livecode", targetType: "livecodes", targetId: codeKey, before, after, ip });
  return { livecode: after };
}

export async function listYmtyOrders() {
  const [orders, courseUsers] = await Promise.all([
    readRuntimeRecords(ORDER_FILE),
    readRuntimeRecords(COURSE_USER_FILE)
  ]);
  const courseUserByOrderId = new Map(courseUsers.map((item) => [item.order_id, publicCourseUser(item)]));
  return {
    orders: orders
      .slice()
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .map((order) => ({
        ...publicOrder(order),
        course_user: courseUserByOrderId.get(order.order_id) || emptyCourseUserSummary(order.order_id)
      }))
  };
}

export async function updateYmtyCourseUserStatus({ adminId = "dev-admin", orderId = "", patch = {}, ip = "" } = {}) {
  const orders = await readRuntimeRecords(ORDER_FILE);
  const order = orders.find((item) => item?.order_id === String(orderId || ""));
  if (!order) {
    const error = new Error("订单不存在");
    error.statusCode = 404;
    throw error;
  }
  if (order.pay_status !== "paid") {
    const error = new Error("未支付订单不能标记课程承接状态");
    error.statusCode = 400;
    throw error;
  }

  let before = null;
  let after = null;
  const now = new Date().toISOString();
  await updateRuntimeRecords(COURSE_USER_FILE, (records) => {
    const existing = records.find((item) => item?.order_id === order.order_id);
    const base = existing || buildCourseUser(order, now);
    before = existing || null;
    after = {
      ...base,
      added_wechat: Boolean(patch.added_wechat ?? patch.addedWechat ?? base.added_wechat),
      joined_group: Boolean(patch.joined_group ?? patch.joinedGroup ?? base.joined_group),
      added_wechat_at: patch.added_wechat || patch.addedWechat ? base.added_wechat_at || now : base.added_wechat_at || null,
      joined_group_at: patch.joined_group || patch.joinedGroup ? base.joined_group_at || now : base.joined_group_at || null,
      updated_at: now
    };
    if (existing) return records.map((item) => (item.order_id === order.order_id ? after : item));
    return records.concat(after);
  });

  await appendAuditLog({
    adminId,
    action: "update_course_user_status",
    targetType: "course_users",
    targetId: order.order_id,
    before,
    after,
    ip
  });

  return { course_user: publicCourseUser(after) };
}

export async function getYmtyAuditLogs() {
  const auditLogs = await readRuntimeRecords(AUDIT_LOG_FILE);
  return {
    audit_logs: auditLogs
      .slice()
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  };
}

async function getActiveYmtyConfig() {
  await seedYmtyDefaults();
  const [product, livecode] = await Promise.all([getProductByCode(DEFAULT_PRODUCT_CODE), getActiveLivecode()]);
  return { product, livecode };
}

async function getProductByCode(productCode) {
  await seedYmtyDefaults();
  const products = await readRuntimeRecords(PRODUCT_FILE);
  return products.find((item) => item?.product_code === productCode) || null;
}

async function getActiveLivecode() {
  await seedYmtyDefaults();
  const livecodes = await readRuntimeRecords(LIVECODE_FILE);
  const livecode = livecodes.find((item) => item?.code_key === DEFAULT_LIVECODE_KEY && item?.status === "active")
    || livecodes.find((item) => item?.status === "active");
  if (!livecode) {
    const error = new Error("课程助教入口未配置");
    error.statusCode = 503;
    throw error;
  }
  return livecode;
}

async function getOrderWithToken(orderId, token) {
  const orders = await readRuntimeRecords(ORDER_FILE);
  const order = orders.find((item) => item?.order_id === String(orderId || ""));
  if (!order) {
    const error = new Error("订单不存在");
    error.statusCode = 404;
    throw error;
  }
  if (!token || token !== order.order_token) {
    const error = new Error("订单令牌无效");
    error.statusCode = 403;
    throw error;
  }
  return order;
}

async function appendPaymentLog({ order_id, pay_channel, event_type, raw_payload, verify_status }) {
  const now = new Date().toISOString();
  const log = {
    id: crypto.randomUUID(),
    order_id,
    pay_channel,
    event_type,
    raw_payload,
    verify_status,
    created_at: now
  };
  await updateRuntimeRecords(PAYMENT_LOG_FILE, (records) => records.concat(log));
  return log;
}

async function ensureCourseUser(order) {
  let courseUser = null;
  const now = new Date().toISOString();
  await updateRuntimeRecords(COURSE_USER_FILE, (records) => {
    const existing = records.find((item) => item?.order_id === order.order_id);
    if (existing) {
      courseUser = existing;
      return records;
    }
    courseUser = buildCourseUser(order, now);
    return records.concat(courseUser);
  });
  return courseUser;
}

function buildCourseUser(order, now) {
  return {
    user_id: `ymty_${crypto.randomUUID()}`,
    openid: "",
    unionid: "",
    order_id: order.order_id,
    product_code: order.product_code,
    course_name: order.product_name,
    status: "active",
    paid_at: order.paid_at || now,
    added_wechat: false,
    joined_group: false,
    added_wechat_at: null,
    joined_group_at: null,
    created_at: now,
    updated_at: now
  };
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

function insertByKeyIfMissing(records, key, item) {
  if (records.some((record) => record?.[key] === item[key])) return records;
  return records.concat(item);
}

function publicProduct(product) {
  return {
    product_code: product.product_code,
    product_name: product.product_name,
    display_price_yuan: product.display_price_yuan,
    amount_cents: product.amount_cents,
    currency: product.currency,
    cycle: product.cycle,
    start_time: product.start_time,
    lecturer: product.lecturer,
    status: product.status
  };
}

function publicLivecodeSummary(livecode) {
  return {
    service_text: livecode.service_text,
    button_text: livecode.button_text,
    auto_redirect_after_paid: Boolean(livecode.auto_redirect_after_paid),
    redirect_delay_ms: Number(livecode.redirect_delay_ms || 0)
  };
}

function publicOrder(order, { includeToken = false } = {}) {
  return {
    order_id: order.order_id,
    ...(includeToken ? { order_token: order.order_token } : {}),
    product_code: order.product_code,
    product_name: order.product_name,
    amount_cents: order.amount_cents,
    pay_channel: order.pay_channel,
    pay_status: order.pay_status,
    transaction_id: order.transaction_id,
    channel: order.channel,
    campaign: order.campaign,
    creative: order.creative,
    paid_at: order.paid_at,
    created_at: order.created_at,
    updated_at: order.updated_at
  };
}

function publicCourseUser(courseUser) {
  return {
    user_id: courseUser.user_id,
    order_id: courseUser.order_id,
    product_code: courseUser.product_code,
    course_name: courseUser.course_name,
    status: courseUser.status,
    paid_at: courseUser.paid_at,
    added_wechat: Boolean(courseUser.added_wechat),
    joined_group: Boolean(courseUser.joined_group),
    added_wechat_at: courseUser.added_wechat_at || null,
    joined_group_at: courseUser.joined_group_at || null,
    created_at: courseUser.created_at,
    updated_at: courseUser.updated_at || courseUser.created_at
  };
}

function emptyCourseUserSummary(orderId) {
  return {
    order_id: orderId,
    added_wechat: false,
    joined_group: false,
    added_wechat_at: null,
    joined_group_at: null
  };
}

function createOrderId() {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date()).replaceAll("-", "");
  return `YMTY${dateKey}${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

function assertMockPayAllowed() {
  if (config.nodeEnv !== "production") return;
  if (process.env.YMTY_ENABLE_MOCK_PAY === "true") return;
  const error = new Error("生产环境不允许使用 mock 支付");
  error.statusCode = 403;
  throw error;
}

function normalizeAmountCents(value) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount <= 0) {
    const error = new Error("价格金额必须是正整数分");
    error.statusCode = 400;
    throw error;
  }
  return amount;
}

function normalizeDisplayPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    const error = new Error("展示价格必须大于 0");
    error.statusCode = 400;
    throw error;
  }
  return Math.round(price * 100) / 100;
}

function normalizeDelayMs(value) {
  const delay = Number(value);
  if (!Number.isFinite(delay) || delay < 0) return 600;
  return Math.min(Math.round(delay), 10000);
}

function normalizeEnum(value, fallback, maxLength) {
  return cleanText(value || fallback, maxLength) || fallback;
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}
