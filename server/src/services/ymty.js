import crypto from "node:crypto";
import { getNextAssistantQr } from "./assistantQr.js";
import { readJsonFile, runtimeFile, updateRuntimeRecords, writeJsonFile } from "../lib/store.js";

const PRODUCT_CONFIG_FILE = "ymty-product-config.json";
const ORDERS_FILE = "ymty-orders.json";
const PAYMENT_NOTIFICATIONS_FILE = "ymty-payment-notifications.json";
const COURSE_ENROLLMENTS_FILE = "ymty-course-enrollments.json";

const PRODUCT_ID = "ymty_7day_camp";
const COURSE_ID = "ymty_7day_training_camp";

const DEFAULT_PRODUCT_CONFIG = {
  product_id: PRODUCT_ID,
  course_id: COURSE_ID,
  course_name: "阳明心学交易体验营",
  organizer: "湖南坤铘紫垣传媒有限公司",
  price_cents: 168,
  currency: "CNY",
  training_days: 7,
  opening_time_text: "每周滚动开营，晚上20:00",
  lecturer: "知行飞哥",
  compliance_text: "不荐股、不喊单、不承诺收益、不代客理财、不组织实盘跟单",
  afterpay: {
    entrance_type: "assistant_qr_rotation",
    lead_link: "",
    miniprogram_path: "pages/classroom/index?course_id=ymty_7day_training_camp"
  },
  updated_at: null
};

export async function getYmtyProductConfig() {
  const stored = await readJsonFile(runtimeFile(PRODUCT_CONFIG_FILE), null);
  return normalizeProductConfig(stored);
}

export async function createYmtyOrder(input = {}) {
  const product = await getYmtyProductConfig();
  const channel = normalizePaymentChannel(input.channel || input.payment_channel || "mock");
  if (channel !== "mock") {
    const error = new Error("当前仅开放 mock 支付骨架，真实微信/支付宝支付尚未接入");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const buyer = normalizeBuyer(input);
  const order = {
    order_id: createOrderId(),
    product_id: product.product_id,
    course_id: product.course_id,
    course_name: product.course_name,
    amount_cents: product.price_cents,
    currency: product.currency,
    status: "pending",
    payment_channel: channel,
    payment_mode: "mock",
    buyer,
    source_channel: cleanText(input.source_channel || input.sourceChannel || input.channel_name || "ymty_h5"),
    client_order_no: cleanText(input.client_order_no || input.clientOrderNo || ""),
    created_at: now,
    updated_at: now,
    paid_at: null,
    mock_payment: {
      enabled: true,
      complete_endpoint: "/api/pay/mock/complete"
    }
  };

  await updateRuntimeRecords(ORDERS_FILE, (orders) => orders.concat(order));

  return {
    order,
    payment: {
      provider: "mock",
      amount_cents: order.amount_cents,
      currency: order.currency,
      mock_pay_action: {
        method: "POST",
        path: "/api/pay/mock/complete",
        body: { order_id: order.order_id }
      }
    }
  };
}

export async function completeMockYmtyPayment(input = {}) {
  const orderId = cleanText(input.order_id || input.orderId || "");
  if (!orderId) {
    const error = new Error("缺少 order_id");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  let completedOrder = null;
  await updateRuntimeRecords(ORDERS_FILE, (orders) => {
    const nextOrders = orders.map((order) => {
      if (order.order_id !== orderId) return order;
      if (order.status === "paid") {
        completedOrder = order;
        return order;
      }
      completedOrder = {
        ...order,
        status: "paid",
        paid_at: now,
        updated_at: now,
        payment: {
          provider: "mock",
          transaction_id: cleanText(input.transaction_id || input.transactionId || `mock_${orderId}`),
          paid_at: now
        }
      };
      return completedOrder;
    });
    return nextOrders;
  });

  if (!completedOrder) {
    const error = new Error("订单不存在");
    error.statusCode = 404;
    throw error;
  }

  const enrollment = await grantYmtyEnrollment(completedOrder);
  return { order: completedOrder, enrollment };
}

export async function recordYmtyPaymentNotification(provider, payload = {}) {
  const normalizedProvider = normalizePaymentChannel(provider);
  const now = new Date().toISOString();
  const orderId = cleanText(payload.order_id || payload.orderId || payload.out_trade_no || "");
  const notification = {
    id: `notify_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    provider: normalizedProvider,
    order_id: orderId,
    received_at: now,
    verify_status: "mock_unverified",
    handled_status: "accepted",
    raw_summary: summarizeNotificationPayload(payload)
  };

  await updateRuntimeRecords(PAYMENT_NOTIFICATIONS_FILE, (records) => records.concat(notification));

  let order = null;
  let enrollment = null;
  const shouldComplete = payload.mock_paid === true || payload.mockPaid === true || payload.trade_status === "SUCCESS";
  if (orderId && shouldComplete) {
    const result = await completeMockYmtyPayment({
      order_id: orderId,
      transaction_id: payload.transaction_id || payload.transactionId || payload.trade_no
    });
    order = result.order;
    enrollment = result.enrollment;
  }

  return { notification, order, enrollment };
}

export async function getYmtyOrderStatus(query = {}) {
  const order = await findOrder(query);
  if (!order) {
    const error = new Error("订单不存在");
    error.statusCode = 404;
    throw error;
  }
  return {
    order: toPublicOrder(order),
    paid: order.status === "paid"
  };
}

export async function getYmtyAfterpayEntrance(query = {}) {
  const order = await findOrder(query);
  if (!order) {
    const error = new Error("订单不存在");
    error.statusCode = 404;
    throw error;
  }

  if (order.status !== "paid") {
    return {
      unlocked: false,
      order: toPublicOrder(order),
      message: "订单尚未支付，暂不能解锁入营入口。"
    };
  }

  const product = await getYmtyProductConfig();
  const entrance = await buildAfterpayEntrance(product);
  return {
    unlocked: true,
    order: toPublicOrder(order),
    course: toCourse(product),
    entrance
  };
}

export async function listYmtyCourses(query = {}) {
  const enrollments = await readRuntimeRecordsSafe(COURSE_ENROLLMENTS_FILE);
  const buyer = normalizeBuyer(query);
  const orderId = cleanText(query.order_id || query.orderId || "");
  const matched = enrollments.filter((item) => {
    if (orderId && item.order_id === orderId) return true;
    if (buyer.user_id && item.user_id === buyer.user_id) return true;
    if (buyer.openid && item.openid === buyer.openid) return true;
    if (buyer.phone_hash && item.phone_hash === buyer.phone_hash) return true;
    return false;
  });

  return {
    courses: matched.map((item) => ({
      course_id: item.course_id,
      course_name: item.course_name,
      status: item.status,
      order_id: item.order_id,
      unlocked_at: item.unlocked_at,
      training_days: item.training_days,
      opening_time_text: item.opening_time_text,
      lecturer: item.lecturer,
      miniprogram_path: item.miniprogram_path
    }))
  };
}

async function grantYmtyEnrollment(order) {
  const product = await getYmtyProductConfig();
  const now = new Date().toISOString();
  let saved = null;
  await updateRuntimeRecords(COURSE_ENROLLMENTS_FILE, (records) => {
    const existing = records.find((item) => item.order_id === order.order_id);
    if (existing) {
      saved = existing;
      return records;
    }
    saved = {
      enrollment_id: `enroll_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      order_id: order.order_id,
      product_id: product.product_id,
      course_id: product.course_id,
      course_name: product.course_name,
      status: "active",
      user_id: order.buyer?.user_id || "",
      openid: order.buyer?.openid || "",
      phone_hash: order.buyer?.phone_hash || "",
      phone_mask: order.buyer?.phone_mask || "",
      training_days: product.training_days,
      opening_time_text: product.opening_time_text,
      lecturer: product.lecturer,
      miniprogram_path: product.afterpay?.miniprogram_path || "",
      unlocked_at: now,
      created_at: now,
      updated_at: now
    };
    return records.concat(saved);
  });
  return saved;
}

async function buildAfterpayEntrance(product) {
  const afterpay = product.afterpay || {};
  let assistantQr = null;
  if (afterpay.entrance_type === "assistant_qr_rotation") {
    try {
      const result = await getNextAssistantQr();
      assistantQr = result.item;
    } catch {
      assistantQr = null;
    }
  }

  return {
    type: afterpay.entrance_type || "assistant_qr_rotation",
    assistant_qr: assistantQr,
    lead_link: afterpay.lead_link || "",
    miniprogram_path: afterpay.miniprogram_path || "",
    note: "支付已确认，可进入体验营承接入口。"
  };
}

async function findOrder(query = {}) {
  const orderId = cleanText(query.order_id || query.orderId || "");
  const clientOrderNo = cleanText(query.client_order_no || query.clientOrderNo || "");
  const buyer = normalizeBuyer(query);
  const orders = await readRuntimeRecordsSafe(ORDERS_FILE);

  if (orderId) return orders.find((item) => item.order_id === orderId) || null;
  if (clientOrderNo) return orders.find((item) => item.client_order_no === clientOrderNo) || null;
  if (buyer.user_id) return orders.findLast?.((item) => item.buyer?.user_id === buyer.user_id) || findLast(orders, (item) => item.buyer?.user_id === buyer.user_id);
  if (buyer.openid) return orders.findLast?.((item) => item.buyer?.openid === buyer.openid) || findLast(orders, (item) => item.buyer?.openid === buyer.openid);
  if (buyer.phone_hash) return orders.findLast?.((item) => item.buyer?.phone_hash === buyer.phone_hash) || findLast(orders, (item) => item.buyer?.phone_hash === buyer.phone_hash);

  return null;
}

function findLast(items, predicate) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) return items[index];
  }
  return null;
}

async function readRuntimeRecordsSafe(name) {
  return readJsonFile(runtimeFile(name), []);
}

function normalizeProductConfig(stored) {
  const source = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  const priceCents = Number(source.price_cents ?? source.priceCents ?? DEFAULT_PRODUCT_CONFIG.price_cents);
  return {
    ...DEFAULT_PRODUCT_CONFIG,
    ...source,
    product_id: cleanText(source.product_id || source.productId || DEFAULT_PRODUCT_CONFIG.product_id),
    course_id: cleanText(source.course_id || source.courseId || DEFAULT_PRODUCT_CONFIG.course_id),
    course_name: cleanText(source.course_name || source.courseName || DEFAULT_PRODUCT_CONFIG.course_name),
    price_cents: Number.isFinite(priceCents) && priceCents > 0 ? Math.round(priceCents) : DEFAULT_PRODUCT_CONFIG.price_cents,
    currency: cleanText(source.currency || DEFAULT_PRODUCT_CONFIG.currency),
    training_days: Number(source.training_days || source.trainingDays || DEFAULT_PRODUCT_CONFIG.training_days),
    opening_time_text: cleanText(source.opening_time_text || source.openingTimeText || DEFAULT_PRODUCT_CONFIG.opening_time_text),
    lecturer: cleanText(source.lecturer || DEFAULT_PRODUCT_CONFIG.lecturer),
    compliance_text: cleanText(source.compliance_text || source.complianceText || DEFAULT_PRODUCT_CONFIG.compliance_text),
    afterpay: {
      ...DEFAULT_PRODUCT_CONFIG.afterpay,
      ...(source.afterpay || {})
    }
  };
}

function toCourse(product) {
  return {
    course_id: product.course_id,
    course_name: product.course_name,
    training_days: product.training_days,
    opening_time_text: product.opening_time_text,
    lecturer: product.lecturer,
    compliance_text: product.compliance_text
  };
}

function toPublicOrder(order) {
  return {
    order_id: order.order_id,
    product_id: order.product_id,
    course_id: order.course_id,
    course_name: order.course_name,
    amount_cents: order.amount_cents,
    currency: order.currency,
    status: order.status,
    payment_channel: order.payment_channel,
    payment_mode: order.payment_mode,
    source_channel: order.source_channel,
    created_at: order.created_at,
    updated_at: order.updated_at,
    paid_at: order.paid_at
  };
}

function createOrderId() {
  return `ymty_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
}

function normalizePaymentChannel(value = "") {
  const channel = cleanText(value).toLowerCase();
  if (channel === "wechat" || channel === "wxpay") return "wechat";
  if (channel === "alipay") return "alipay";
  return channel || "mock";
}

function normalizeBuyer(input = {}) {
  const phone = normalizePhone(input.phone || input.mobile || "");
  return {
    user_id: cleanText(input.user_id || input.userId || ""),
    openid: cleanText(input.openid || input.open_id || input.openId || ""),
    unionid: cleanText(input.unionid || input.union_id || input.unionId || ""),
    phone_mask: phone ? maskPhone(phone) : "",
    phone_hash: phone ? hashPhone(phone) : ""
  };
}

function normalizePhone(value = "") {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function maskPhone(phone) {
  const value = String(phone || "");
  if (value.length < 7) return "***";
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function hashPhone(phone) {
  return crypto.createHash("sha256").update(`ymty:${phone}`).digest("hex");
}

function cleanText(value) {
  return String(value || "").trim();
}

function summarizeNotificationPayload(payload = {}) {
  const keys = ["order_id", "orderId", "out_trade_no", "trade_no", "transaction_id", "trade_status", "mock_paid", "mockPaid"];
  return keys.reduce((summary, key) => {
    if (payload[key] !== undefined) summary[key] = payload[key];
    return summary;
  }, {});
}

export async function resetYmtyRuntimeForTest() {
  await writeJsonFile(runtimeFile(PRODUCT_CONFIG_FILE), DEFAULT_PRODUCT_CONFIG);
  await writeJsonFile(runtimeFile(ORDERS_FILE), []);
  await writeJsonFile(runtimeFile(PAYMENT_NOTIFICATIONS_FILE), []);
  await writeJsonFile(runtimeFile(COURSE_ENROLLMENTS_FILE), []);
}

