import crypto from "node:crypto";
import { config } from "../config.js";
import { readRuntimeRecords, replaceRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const EVENT_FILE = "ymty-events.json";
const FRONTEND_EVENTS = new Set([
  "page_view",
  "scroll_25",
  "scroll_50",
  "scroll_75",
  "signup_view",
  "signup_click",
  "pay_sheet_open",
  "pay_method_select",
  "success_page_view",
  "qr_exposed",
  "wecom_link_click",
  "page_leave"
]);
const TRUSTED_EVENTS = new Set([
  "order_created",
  "payment_success",
  "refund_success",
  "wecom_added",
  "first_contact"
]);
const SCROLL_EVENTS = new Set(["scroll_25", "scroll_50", "scroll_75"]);
const PAID_ONLY_FRONTEND_EVENTS = new Set(["qr_exposed", "wecom_link_click"]);
const SHANGHAI_TIME_ZONE = "Asia/Shanghai";

export const YMTY_FRONTEND_EVENT_NAMES = Array.from(FRONTEND_EVENTS);

export async function resetYmtyAnalyticsForTests() {
  await replaceRuntimeRecords(EVENT_FILE, []);
}

export async function recordYmtyFrontendEvent({ body = {}, ip = "", userAgent = "", isOrderPaid } = {}) {
  const eventName = cleanToken(body.event_name, 40);
  if (!FRONTEND_EVENTS.has(eventName)) {
    const error = new Error(TRUSTED_EVENTS.has(eventName) ? "高可信事件不能由前端提交" : "埋点事件不在白名单内");
    error.statusCode = 400;
    throw error;
  }

  const eventId = cleanToken(body.event_id, 96);
  if (!eventId) {
    const error = new Error("event_id 不能为空");
    error.statusCode = 400;
    throw error;
  }

  const sessionId = cleanToken(body.session_id, 96);
  if (!sessionId) {
    const error = new Error("session_id 不能为空");
    error.statusCode = 400;
    throw error;
  }

  const orderId = cleanToken(body.order_id, 80);
  if (PAID_ONLY_FRONTEND_EVENTS.has(eventName) && isOrderPaid !== true) {
    const error = new Error("支付完成后才允许记录该事件");
    error.statusCode = 403;
    throw error;
  }

  const now = new Date().toISOString();
  const track = normalizeTrack(body.track);
  const metadata = normalizeMetadata(body.metadata);
  const client = buildClientFields({ ip, userAgent });
  const event = {
    event_id: eventId,
    event_name: eventName,
    session_id: sessionId,
    order_id: orderId,
    product_code: cleanToken(body.product_code || "YMXX_JY_TY", 80),
    path: cleanPath(body.path, 180),
    channel: track.channel,
    campaign: track.campaign,
    creative: track.creative,
    click_id: track.click_id,
    metadata,
    created_at: now,
    ...client
  };

  let stored = false;
  let duplicate = false;
  await updateRuntimeRecords(EVENT_FILE, (records) => {
    if (records.some((item) => item?.event_id === eventId)) {
      duplicate = true;
      return records;
    }
    if (SCROLL_EVENTS.has(eventName) && records.some((item) => item?.event_name === eventName && item?.session_id === sessionId)) {
      duplicate = true;
      return records;
    }
    stored = true;
    return records.concat(event);
  });

  return { stored, duplicate };
}

export async function recordYmtyTrustedEvent(eventName, payload = {}) {
  if (!TRUSTED_EVENTS.has(eventName)) {
    const error = new Error("高可信事件类型不合法");
    error.statusCode = 400;
    throw error;
  }
  const orderId = cleanToken(payload.order_id, 80);
  const eventId = cleanToken(payload.event_id, 120) || `${eventName}:${orderId || crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const event = {
    event_id: eventId,
    event_name: eventName,
    session_id: cleanToken(payload.session_id, 96),
    order_id: orderId,
    product_code: cleanToken(payload.product_code || "YMXX_JY_TY", 80),
    pay_channel: cleanToken(payload.pay_channel, 32),
    channel: cleanText(payload.channel, 80),
    campaign: cleanText(payload.campaign, 80),
    creative: cleanText(payload.creative, 80),
    click_id: cleanText(payload.click_id, 120),
    amount_cents: normalizeNonNegativeInteger(payload.amount_cents, 0),
    paid_at: cleanText(payload.paid_at, 40),
    created_at: cleanText(payload.created_at, 40) || now
  };

  let stored = false;
  await updateRuntimeRecords(EVENT_FILE, (records) => {
    if (records.some((item) => item?.event_id === eventId)) return records;
    stored = true;
    return records.concat(event);
  });
  return { stored };
}

export async function getYmtyAnalyticsSummary(query = {}) {
  const range = resolveDateRange(query);
  const events = (await readRuntimeRecords(EVENT_FILE)).filter((event) => {
    const dateKey = getShanghaiDateKey(event.created_at || event.paid_at);
    return dateKey >= range.from && dateKey <= range.to;
  });

  const overview = buildOverview(events);
  const funnel = {
    page_to_signup_rate: safeRate(overview.signup_clicks, overview.uv),
    signup_to_order_rate: safeRate(overview.orders_created, overview.signup_clicks),
    order_to_paid_rate: safeRate(overview.paid_orders, overview.orders_created),
    paid_to_qr_rate: safeRate(overview.qr_exposures, overview.paid_orders)
  };

  return {
    range,
    overview,
    funnel,
    daily: buildDaily(events, range),
    by_channel: buildByChannel(events),
    by_device: buildByDevice(events),
    by_pay_channel: buildByPayChannel(events)
  };
}

export function parseYmtyUserAgent(userAgent = "") {
  const ua = String(userAgent || "");
  const lower = ua.toLowerCase();
  const isWechat = /micromessenger/i.test(ua);
  const isMobile = /mobile|iphone|ipod|android/i.test(ua);
  const isTablet = /ipad|tablet/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua));

  return {
    device_type: isTablet ? "tablet" : isMobile ? "mobile" : ua ? "desktop" : "unknown",
    os: /iphone|ipad|ipod/i.test(ua)
      ? "ios"
      : /android/i.test(ua)
        ? "android"
        : /windows/i.test(ua)
          ? "windows"
          : /mac os x|macintosh/i.test(ua)
            ? "macos"
            : /linux/i.test(ua)
              ? "linux"
              : "unknown",
    browser: isWechat
      ? "wechat"
      : /edg\//i.test(ua)
        ? "edge"
        : /firefox\//i.test(ua)
          ? "firefox"
          : /chrome|crios/i.test(ua)
            ? "chrome"
            : /safari/i.test(ua)
              ? "safari"
              : ua
                ? "other"
                : "unknown",
    is_wechat: isWechat,
    user_agent_hash: hashValue(ua)
  };
}

function buildOverview(events) {
  const pageViews = events.filter((event) => event.event_name === "page_view");
  const paidEvents = events.filter((event) => event.event_name === "payment_success");
  return {
    uv: new Set(pageViews.map((event) => event.session_id).filter(Boolean)).size,
    pv: pageViews.length,
    signup_clicks: countEvents(events, "signup_click"),
    orders_created: countEvents(events, "order_created"),
    paid_orders: paidEvents.length,
    revenue_cents: paidEvents.reduce((sum, event) => sum + normalizeNonNegativeInteger(event.amount_cents, 0), 0),
    success_page_views: countEvents(events, "success_page_view"),
    qr_exposures: countEvents(events, "qr_exposed"),
    wecom_link_clicks: countEvents(events, "wecom_link_click")
  };
}

function buildDaily(events, range) {
  const rows = new Map();
  for (const date of enumerateDateKeys(range.from, range.to)) {
    rows.set(date, { date, ...emptyOverview() });
  }
  for (const event of events) {
    const date = getShanghaiDateKey(event.created_at || event.paid_at);
    if (!rows.has(date)) continue;
    const row = rows.get(date);
    applyOverviewEvent(row, event);
  }
  return Array.from(rows.values()).map((row) => finalizeUvRow(row));
}

function buildByChannel(events) {
  const groups = new Map();
  for (const event of events) {
    const key = cleanText(event.channel, 80) || "未标记";
    const row = ensureGroup(groups, key, { channel: key, ...emptyOverview() });
    applyOverviewEvent(row, event);
  }
  return Array.from(groups.values()).map((row) => finalizeUvRow(row));
}

function buildByDevice(events) {
  const groups = new Map();
  for (const event of events.filter((item) => item.event_name === "page_view")) {
    const key = `${event.device_type || "unknown"}|${event.os || "unknown"}|${event.browser || "unknown"}`;
    const row = ensureGroup(groups, key, {
      device_type: event.device_type || "unknown",
      os: event.os || "unknown",
      browser: event.browser || "unknown",
      uv: 0,
      pv: 0,
      is_wechat_count: 0,
      sessionSet: new Set()
    });
    if (event.session_id) row.sessionSet.add(event.session_id);
    row.pv += 1;
    if (event.is_wechat) row.is_wechat_count += 1;
  }
  return Array.from(groups.values()).map((row) => ({
    device_type: row.device_type,
    os: row.os,
    browser: row.browser,
    uv: row.sessionSet.size,
    pv: row.pv,
    is_wechat_count: row.is_wechat_count
  }));
}

function buildByPayChannel(events) {
  const groups = new Map();
  for (const event of events.filter((item) => item.event_name === "order_created" || item.event_name === "payment_success")) {
    const key = event.pay_channel || "unknown";
    const row = ensureGroup(groups, key, {
      pay_channel: key,
      orders_created: 0,
      paid_orders: 0,
      revenue_cents: 0
    });
    if (event.event_name === "order_created") row.orders_created += 1;
    if (event.event_name === "payment_success") {
      row.paid_orders += 1;
      row.revenue_cents += normalizeNonNegativeInteger(event.amount_cents, 0);
    }
  }
  return Array.from(groups.values());
}

function emptyOverview() {
  return {
    uv: 0,
    pv: 0,
    signup_clicks: 0,
    orders_created: 0,
    paid_orders: 0,
    revenue_cents: 0,
    success_page_views: 0,
    qr_exposures: 0,
    wecom_link_clicks: 0,
    sessionSet: new Set()
  };
}

function applyOverviewEvent(row, event) {
  if (event.event_name === "page_view") {
    row.pv += 1;
    if (event.session_id) row.sessionSet.add(event.session_id);
  }
  if (event.event_name === "signup_click") row.signup_clicks += 1;
  if (event.event_name === "order_created") row.orders_created += 1;
  if (event.event_name === "payment_success") {
    row.paid_orders += 1;
    row.revenue_cents += normalizeNonNegativeInteger(event.amount_cents, 0);
  }
  if (event.event_name === "success_page_view") row.success_page_views += 1;
  if (event.event_name === "qr_exposed") row.qr_exposures += 1;
  if (event.event_name === "wecom_link_click") row.wecom_link_clicks += 1;
}

function finalizeUvRow(row) {
  const { sessionSet, ...rest } = row;
  return { ...rest, uv: sessionSet.size };
}

function resolveDateRange(query) {
  const today = getShanghaiDateKey(new Date());
  let from = cleanDate(query.from || "");
  let to = cleanDate(query.to || "");
  const singleDate = cleanDate(query.date || "");
  const days = Math.max(1, Math.min(90, normalizeNonNegativeInteger(query.days, 1) || 1));

  if (singleDate) {
    from = singleDate;
    to = singleDate;
  } else if (!from && !to) {
    to = today;
    from = addDays(to, -(days - 1));
  } else {
    if (!to) to = today;
    if (!from) from = addDays(to, -(days - 1));
  }

  if (from > to) {
    const error = new Error("统计起止日期不合法");
    error.statusCode = 400;
    throw error;
  }
  if (daysBetween(from, to) > 89) {
    const error = new Error("统计范围不能超过 90 天");
    error.statusCode = 400;
    throw error;
  }
  return { from, to };
}

function buildClientFields({ ip, userAgent }) {
  const masked = maskIp(ip);
  return {
    ip_masked: masked,
    ip_hash: hashValue(String(ip || "")),
    ...parseYmtyUserAgent(userAgent)
  };
}

function maskIp(ip = "") {
  const value = String(ip || "").trim();
  if (!value) return "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    const parts = value.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  }
  if (value.includes(":")) {
    return value.split(":").slice(0, 3).join(":") + ":*";
  }
  return "";
}

function hashValue(value = "") {
  const salt = process.env.YMTY_ANALYTICS_SALT || process.env.ADMIN_JWT_SECRET || process.env.AUTH_CODE_SECRET || "local-ymty-analytics-salt";
  return crypto.createHmac("sha256", salt).update(String(value || "")).digest("hex");
}

function normalizeTrack(track) {
  const source = track && typeof track === "object" && !Array.isArray(track) ? track : {};
  return {
    channel: cleanText(source.channel || source.utm_source || "", 80),
    campaign: cleanText(source.campaign || source.utm_campaign || "", 80),
    creative: cleanText(source.creative || source.utm_content || "", 80),
    click_id: cleanText(source.click_id || source.gdt_vid || source.bd_vid || source.douyin_click_id || "", 120)
  };
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const raw = JSON.stringify(metadata);
  if (Buffer.byteLength(raw, "utf8") > 2048) {
    const error = new Error("metadata 过大");
    error.statusCode = 413;
    throw error;
  }
  return JSON.parse(raw);
}

function cleanText(value = "", max = 120) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function cleanToken(value = "", max = 96) {
  return cleanText(value, max).replace(/[^\w:.-]/g, "").slice(0, max);
}

function cleanPath(value = "", max = 180) {
  const text = cleanText(value, max);
  return text.startsWith("/") ? text : text ? `/${text}` : "";
}

function cleanDate(value = "") {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function normalizeNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}

function countEvents(events, name) {
  return events.filter((event) => event.event_name === name).length;
}

function safeRate(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function ensureGroup(map, key, initial) {
  if (!map.has(key)) map.set(key, initial);
  return map.get(key);
}

function getShanghaiDateKey(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function enumerateDateKeys(from, to) {
  const dates = [];
  let current = from;
  while (current <= to) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const end = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.floor((end - start) / 86400000);
}
