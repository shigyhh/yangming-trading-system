import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

const authEnvKeys = [
  "YMTY_ADMIN_BOOTSTRAP_USERNAME",
  "YMTY_ADMIN_BOOTSTRAP_PASSWORD",
  "ADMIN_JWT_SECRET",
  "YMTY_ADMIN_TOKEN",
  "YMTY_ANALYTICS_SALT",
  "NODE_ENV",
  "YMTY_ALLOW_MOCK_PAYMENT"
];

const originalEnv = Object.fromEntries(authEnvKeys.map((key) => [key, process.env[key]]));
process.env.NODE_ENV = "test";
process.env.YMTY_ALLOW_MOCK_PAYMENT = "true";

const { handleError } = await import("../src/lib/http.js");
const { readRuntimeRecords } = await import("../src/lib/store.js");
const { route } = await import("../src/routes/router.js");
const {
  createYmtyOrder,
  markYmtyMockPaySuccess,
  resetYmtyForTests,
  seedYmtyDefaults
} = await import("../src/services/ymtyCampaign.js");
const {
  getYmtyAnalyticsSummary,
  recordYmtyFrontendEvent,
  resetYmtyAnalyticsForTests
} = await import("../src/services/ymtyAnalytics.js");

test.after(() => restoreEnv());

test("ymty analytics records allowed frontend events, deduplicates, and rejects forged trusted events", async () => {
  await resetAll();

  try {
    const first = await track({
      event_id: "evt-page-1",
      event_name: "page_view",
      session_id: "sess-1",
      product_code: "YMXX_JY_TY",
      path: "/hd/ymty/index.html",
      track: { channel: "douyin", campaign: "camp-a", creative: "video-1", click_id: "click-1" },
      metadata: { max_scroll_percent: 0 }
    }, {
      "user-agent": iphoneWechatUa(),
      "x-forwarded-for": "203.0.113.42"
    });
    assert.equal(first.statusCode, 200);

    await track({
      event_id: "evt-page-1",
      event_name: "page_view",
      session_id: "sess-1"
    });
    await track({
      event_id: "evt-scroll-25-a",
      event_name: "scroll_25",
      session_id: "sess-1"
    });
    await track({
      event_id: "evt-scroll-25-b",
      event_name: "scroll_25",
      session_id: "sess-1"
    });

    const badEvent = await track({
      event_id: "evt-bad",
      event_name: "not_allowed",
      session_id: "sess-1"
    });
    assert.equal(badEvent.statusCode, 400);

    const forgedTrusted = await track({
      event_id: "evt-forged-paid",
      event_name: "payment_success",
      session_id: "sess-1"
    });
    assert.equal(forgedTrusted.statusCode, 400);

    const records = await readRuntimeRecords("ymty-events.json");
    assert.equal(records.filter((item) => item.event_name === "page_view").length, 1);
    assert.equal(records.filter((item) => item.event_name === "scroll_25").length, 1);
    assert.equal(records.some((item) => item.event_name === "payment_success"), false);

    const pageView = records.find((item) => item.event_name === "page_view");
    assert.equal(pageView.ip_masked, "203.0.113.*");
    assert.notEqual(pageView.ip_hash, "203.0.113.42");
    assert.equal(pageView.user_agent, undefined);
    assert.equal(pageView.device_type, "mobile");
    assert.equal(pageView.os, "ios");
    assert.equal(pageView.browser, "wechat");
    assert.equal(pageView.is_wechat, true);
  } finally {
    await resetAll();
  }
});

test("ymty analytics classifies common devices without storing full user agent", async () => {
  await resetAll();

  try {
    await recordYmtyFrontendEvent({
      body: { event_id: "evt-android", event_name: "page_view", session_id: "sess-android" },
      ip: "198.51.100.12",
      userAgent: androidChromeUa()
    });
    await recordYmtyFrontendEvent({
      body: { event_id: "evt-win", event_name: "page_view", session_id: "sess-win" },
      ip: "198.51.100.13",
      userAgent: windowsEdgeUa()
    });

    const records = await readRuntimeRecords("ymty-events.json");
    const android = records.find((item) => item.session_id === "sess-android");
    const windows = records.find((item) => item.session_id === "sess-win");
    assert.equal(android.device_type, "mobile");
    assert.equal(android.os, "android");
    assert.equal(android.browser, "chrome");
    assert.equal(windows.device_type, "desktop");
    assert.equal(windows.os, "windows");
    assert.equal(windows.browser, "edge");
    assert.equal(android.user_agent, undefined);
    assert.equal(windows.user_agent, undefined);
  } finally {
    await resetAll();
  }
});

test("ymty analytics writes trusted order and payment events and summarizes funnel safely", async () => {
  await resetAll();

  try {
    const created = await createYmtyOrder({
      productCode: "YMXX_JY_TY",
      payChannel: "mock",
      channel: "douyin",
      campaign: "ymty_202606",
      creative: "video001",
      sessionId: "sess-order",
      clickId: "click-order",
      landingUrl: "https://xxjyxt.com/hd/ymty/index.html?channel=douyin",
      referrerHost: "example.com"
    });

    await recordYmtyFrontendEvent({
      body: { event_id: "evt-page-order", event_name: "page_view", session_id: "sess-order", track: { channel: "douyin" } },
      ip: "203.0.113.99",
      userAgent: iphoneWechatUa()
    });
    await recordYmtyFrontendEvent({
      body: { event_id: "evt-signup", event_name: "signup_click", session_id: "sess-order", track: { channel: "douyin" } },
      ip: "203.0.113.99",
      userAgent: iphoneWechatUa()
    });
    await recordYmtyFrontendEvent({
      body: { event_id: "evt-success-view", event_name: "success_page_view", session_id: "sess-order", order_id: created.order.order_id },
      ip: "203.0.113.99",
      userAgent: iphoneWechatUa()
    });

    const unpaidQr = await track({
      event_id: "evt-qr-forged",
      event_name: "qr_exposed",
      session_id: "sess-order",
      order_id: created.order.order_id
    });
    assert.equal(unpaidQr.statusCode, 403);

    await markYmtyMockPaySuccess({
      orderId: created.order.order_id,
      token: created.order.order_token
    });

    const paidQr = await track({
      event_id: "evt-qr-paid",
      event_name: "qr_exposed",
      session_id: "sess-order",
      order_id: created.order.order_id
    });
    assert.equal(paidQr.statusCode, 200);

    const records = await readRuntimeRecords("ymty-events.json");
    const orderEvent = records.find((item) => item.event_name === "order_created");
    const paidEvent = records.find((item) => item.event_name === "payment_success");
    assert.equal(orderEvent.order_id, created.order.order_id);
    assert.equal(orderEvent.amount_cents, 168);
    assert.equal(orderEvent.session_id, "sess-order");
    assert.equal(orderEvent.click_id, "click-order");
    assert.equal(paidEvent.order_id, created.order.order_id);
    assert.equal(paidEvent.amount_cents, 168);

    const summary = await getYmtyAnalyticsSummary({ days: 7 });
    assert.equal(summary.overview.signup_clicks, 1);
    assert.equal(summary.overview.orders_created, 1);
    assert.equal(summary.overview.paid_orders, 1);
    assert.equal(summary.overview.revenue_cents, 168);
    assert.equal(summary.overview.success_page_views, 1);
    assert.equal(summary.overview.qr_exposures, 1);
    assert.equal(Number.isFinite(summary.funnel.order_to_paid_rate), true);
    assert.ok(summary.by_channel.some((item) => item.channel === "douyin" && item.orders_created === 1));
    assert.ok(summary.by_device.some((item) => item.device_type === "mobile"));
    assert.ok(summary.by_pay_channel.some((item) => item.pay_channel === "mock" && item.paid_orders === 1));
  } finally {
    await resetAll();
  }
});

test("ymty analytics admin summary is protected and range limited", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    const noAuth = await request({ method: "GET", url: "/api/admin/analytics/summary?days=7" });
    assert.ok([401, 403].includes(noAuth.statusCode));

    const token = await loginAndChangePassword();
    const summary = await request({
      method: "GET",
      url: "/api/admin/analytics/summary?days=7",
      headers: authHeaders(token)
    });
    assert.equal(summary.statusCode, 200);
    assert.equal(summary.body.ok, true);
    assert.ok(summary.body.overview);
    assert.ok(Array.isArray(summary.body.daily));
    assert.ok(Array.isArray(summary.body.by_channel));
    assert.ok(Array.isArray(summary.body.by_device));
    assert.ok(Array.isArray(summary.body.by_pay_channel));
    assert.equal(JSON.stringify(summary.body).includes("raw_ip"), false);
    assert.equal(JSON.stringify(summary.body).includes("Mozilla/5.0"), false);

    const tooWide = await request({
      method: "GET",
      url: "/api/admin/analytics/summary?from=2026-01-01&to=2026-06-30",
      headers: authHeaders(token)
    });
    assert.equal(tooWide.statusCode, 400);
  } finally {
    restoreEnv();
    await resetAll();
  }
});

test("ymty h5 pages contain non-blocking analytics hooks and safe payment track session", async () => {
  const fs = await import("node:fs/promises");
  const indexHtml = await fs.readFile(new URL("../../web-mvp/hd/ymty/index.html", import.meta.url), "utf8");
  const successHtml = await fs.readFile(new URL("../../web-mvp/hd/ymty/success.html", import.meta.url), "utf8");
  const adminHtml = await fs.readFile(new URL("../../web-mvp/admin/ymty/index.html", import.meta.url), "utf8");

  [
    "ymty_analytics_session_id",
    "page_view",
    "scroll_25",
    "scroll_50",
    "scroll_75",
    "signup_view",
    "signup_click",
    "pay_sheet_open",
    "pay_method_select",
    "page_leave",
    "navigator.sendBeacon",
    "session_id"
  ].forEach((text) => assert.ok(indexHtml.includes(text), `index should include ${text}`));

  const payload = indexHtml.match(/const payload = \{[\s\S]*?\n\s*\};/)?.[0] || "";
  assert.ok(payload.includes("track"));
  assert.ok(payload.includes("getTrackParams()"));
  assert.ok(!payload.includes("amount"));
  assert.ok(!payload.includes("amount_cents"));
  assert.ok(!payload.includes("price"));
  assert.ok(!payload.includes("fee"));

  [
    "success_page_view",
    "qr_exposed",
    "wecom_link_click",
    "pay_status !== \"paid\"",
    "/api/afterpay/entrance"
  ].forEach((text) => assert.ok(successHtml.includes(text), `success should include ${text}`));

  [
    "数据概览",
    "/api/admin/analytics/summary",
    "今日访客",
    "渠道转化",
    "设备分布",
    "支付方式"
  ].forEach((text) => assert.ok(adminHtml.includes(text), `admin should include ${text}`));
});

async function resetAll() {
  await resetYmtyForTests();
  await resetYmtyAnalyticsForTests();
  await seedYmtyDefaults();
}

async function track(payload, headers = {}) {
  return jsonRequest("/api/track/ymty", payload, headers);
}

async function loginAndChangePassword() {
  const login = await jsonRequest("/api/admin/login", {
    username: "admin",
    password: "bootstrap-pass-123"
  });
  assert.equal(login.statusCode, 200);
  assert.equal(login.body.user.must_change_password, true);
  const changed = await jsonRequest("/api/admin/change-password", {
    old_password: "bootstrap-pass-123",
    new_password: "changed-pass-123"
  }, authHeaders(login.body.token));
  assert.equal(changed.statusCode, 200);
  return changed.body.token;
}

function setupAdminEnv() {
  process.env.YMTY_ADMIN_BOOTSTRAP_USERNAME = "admin";
  process.env.YMTY_ADMIN_BOOTSTRAP_PASSWORD = "bootstrap-pass-123";
  process.env.ADMIN_JWT_SECRET = "analytics-admin-secret";
  process.env.YMTY_ADMIN_TOKEN = "legacy-analytics-token";
}

function restoreEnv() {
  for (const key of authEnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
}

function authHeaders(token) {
  return { authorization: `Bearer ${token}` };
}

async function jsonRequest(url, payload, headers = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  return request({
    method: "POST",
    url,
    headers: {
      "content-type": "application/json",
      "content-length": String(body.length),
      ...headers
    },
    body
  });
}

async function request({ method, url, headers = {}, body = Buffer.alloc(0), ip = "127.0.0.1" }) {
  const req = new MockRequest(body);
  req.method = method;
  req.url = url;
  req.headers = {
    host: "127.0.0.1:8787",
    "user-agent": "node-test",
    ...headers
  };
  req.socket = { remoteAddress: ip };

  const res = new MockResponse();
  try {
    await route(req, res);
  } catch (error) {
    handleError(res, error);
  }
  return res.result();
}

class MockRequest extends Readable {
  constructor(body) {
    super();
    this.body = body;
    this.sent = false;
  }

  _read() {
    if (this.sent) {
      this.push(null);
      return;
    }
    this.sent = true;
    this.push(this.body);
    this.push(null);
  }
}

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.payload = "";
    this.corsOrigin = "";
    this.corsRejected = false;
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = headers;
  }

  end(payload = "") {
    this.payload += Buffer.isBuffer(payload) ? payload.toString("utf8") : String(payload);
  }

  result() {
    let body = {};
    try {
      body = JSON.parse(this.payload || "{}");
    } catch {
      body = { raw: this.payload };
    }
    return {
      statusCode: this.statusCode,
      headers: this.headers,
      body
    };
  }
}

function iphoneWechatUa() {
  return "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49";
}

function androidChromeUa() {
  return "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";
}

function windowsEdgeUa() {
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0";
}
