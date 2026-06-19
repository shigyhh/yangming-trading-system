import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";

const envKeys = [
  "YMTY_ADMIN_BOOTSTRAP_USERNAME",
  "YMTY_ADMIN_BOOTSTRAP_PASSWORD",
  "ADMIN_JWT_SECRET",
  "YMTY_ADMIN_TOKEN",
  "YMTY_REFUND_EXECUTION_ENABLED",
  "YMTY_AUTO_REFUND_ENABLED",
  "YMTY_REFUND_REVOKE_COURSE_ON_SUCCESS",
  "WECHAT_PAY_MODE",
  "WECHAT_MCH_ID",
  "WECHAT_SERVICE_APP_ID",
  "WECHAT_SERVICE_APP_SECRET",
  "WECHAT_MINI_APP_ID",
  "WECHAT_VERIFY_MODE",
  "WECHAT_PAY_PUBLIC_KEY_ID",
  "WECHAT_PAY_PUBLIC_KEY_PATH",
  "WECHAT_API_V3_KEY",
  "WECHAT_CERT_SERIAL_NO",
  "WECHAT_PRIVATE_KEY_PATH",
  "WECHAT_NOTIFY_URL",
  "WECHAT_H5_SCENE_INFO",
  "WECHAT_JSAPI_OAUTH_REDIRECT_URL",
  "ALIPAY_APP_ID",
  "ALIPAY_PRIVATE_KEY_PATH",
  "ALIPAY_PUBLIC_KEY_PATH",
  "ALIPAY_GATEWAY_URL",
  "ALIPAY_NOTIFY_URL",
  "ALIPAY_RETURN_URL"
];

const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

const { handleError } = await import("../src/lib/http.js");
const { readRuntimeRecords, replaceRuntimeRecords } = await import("../src/lib/store.js");
const { route } = await import("../src/routes/router.js");
const {
  createYmtyOrder,
  getYmtyAuditLogs,
  getYmtyOrderForPayment,
  markYmtyMockPaySuccess,
  resetYmtyForTests,
  seedYmtyDefaults
} = await import("../src/services/ymtyCampaign.js");
const { getYmtyCrmLead } = await import("../src/services/ymtyCrm.js");
const {
  approveYmtyRefund,
  createYmtyRefund,
  listYmtyRefunds,
  markYmtyRefundProviderResult,
  resetYmtyRefundsForTests
} = await import("../src/services/ymtyRefunds.js");

test.after(() => restoreEnv());

test("ymty refund config is admin-only, default closed, and never leaks secrets", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    const noAuth = await request({ method: "GET", url: "/api/admin/refunds/config" });
    assert.ok([401, 403].includes(noAuth.statusCode));

    const token = await loginAndChangePassword();
    const config = await request({
      method: "GET",
      url: "/api/admin/refunds/config",
      headers: authHeaders(token)
    });
    assert.equal(config.statusCode, 200);
    assert.equal(config.body.execution_enabled, false);
    assert.equal(config.body.auto_refund_enabled, false);
    assert.equal(config.body.policy.mode, "disabled");
    assert.equal(config.body.policy.max_auto_refunds_per_order, 1);
    assert.equal(typeof config.body.providers.wechat.configured, "boolean");
    assert.equal(typeof config.body.providers.alipay.refund_ready, "boolean");
    assert.ok(config.body.warnings.includes("当前仅可申请、审批和演练，不会真实退款。"));
    const text = JSON.stringify(config.body);
    [
      "PRIVATE KEY",
      "API_V3_KEY",
      "SECRET",
      "Authorization",
      "12345678901234567890123456789012"
    ].forEach((secret) => assert.equal(text.includes(secret), false, `config leaked ${secret}`));
  } finally {
    restoreEnv();
    await resetAll();
  }
});

test("ymty refund policy validates fields, cannot change env switches, and writes audit logs", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    const noAuth = await jsonRequest("/api/admin/refund-policy", {
      mode: "auto_rule"
    });
    assert.ok([401, 403].includes(noAuth.statusCode));

    const token = await loginAndChangePassword();
    const badMode = await jsonRequest("/api/admin/refund-policy", {
      mode: "auto",
      trigger_types: ["test_order"]
    }, authHeaders(token));
    assert.equal(badMode.statusCode, 400);

    const badDelay = await jsonRequest("/api/admin/refund-policy", {
      mode: "auto_rule",
      delay_seconds: 86401,
      trigger_types: ["test_order"]
    }, authHeaders(token));
    assert.equal(badDelay.statusCode, 400);

    const badTrigger = await jsonRequest("/api/admin/refund-policy", {
      mode: "auto_rule",
      trigger_types: ["not_allowed"]
    }, authHeaders(token));
    assert.equal(badTrigger.statusCode, 400);

    const saved = await jsonRequest("/api/admin/refund-policy", {
      mode: "auto_rule",
      delay_seconds: 9,
      max_amount_cents: 168,
      product_codes: ["YMXX_JY_TY"],
      pay_channels: ["wechat_h5", "alipay_wap"],
      trigger_types: ["test_order", "promotional_auto_refund"],
      revoke_course_access: true,
      promotional_keep_access: true,
      max_auto_refunds_per_order: 99,
      execution_enabled: true,
      auto_refund_enabled: true
    }, authHeaders(token));
    assert.equal(saved.statusCode, 200);
    assert.equal(saved.body.policy.mode, "auto_rule");
    assert.equal(saved.body.policy.delay_seconds, 9);
    assert.equal(saved.body.policy.max_auto_refunds_per_order, 1);
    assert.equal(saved.body.policy.updated_by, "admin");

    const config = await request({
      method: "GET",
      url: "/api/admin/refunds/config",
      headers: authHeaders(token)
    });
    assert.equal(config.body.execution_enabled, false);
    assert.equal(config.body.auto_refund_enabled, false);

    const audit = await getYmtyAuditLogs();
    assert.ok(audit.audit_logs.some((item) => item.action === "refund_policy_update"));
  } finally {
    restoreEnv();
    await resetAll();
  }
});

test("ymty refund preview is dry-run only and reports blockers without side effects", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    const token = await loginAndChangePassword();
    await saveAutoPolicy(token, {
      trigger_types: ["test_order"],
      revoke_course_access: true
    });
    const order = await paidOrder({
      payChannel: "alipay_wap",
      channel: "douyin",
      campaign: "camp-a",
      creative: "video-a",
      transactionId: "ali-trade-001"
    });
    const beforeOrder = await getYmtyOrderForPayment(order.order_id);
    const beforeLead = await getYmtyCrmLead(order.order_id);

    const preview = await jsonRequest("/api/admin/refunds/preview", {
      order_id: order.order_id,
      amount_cents: 168,
      trigger_type: "test_order"
    }, authHeaders(token));
    assert.equal(preview.statusCode, 200);
    assert.equal(preview.body.eligible, true);
    assert.equal(preview.body.would_execute, false);
    assert.equal(preview.body.provider, "alipay");
    assert.equal(preview.body.order.pay_status, "paid");
    assert.equal(preview.body.order.refundable_cents, 168);
    assert.equal(preview.body.policy_result.mode, "auto_rule");
    assert.equal(preview.body.policy_result.trigger_matched, true);
    assert.equal(preview.body.policy_result.product_matched, true);
    assert.equal(preview.body.policy_result.pay_channel_matched, true);
    assert.equal(preview.body.policy_result.amount_within_limit, true);
    assert.equal(preview.body.effects.would_create_refund, true);
    assert.equal(preview.body.effects.would_auto_approve, true);
    assert.equal(preview.body.effects.would_call_provider, false);
    assert.equal(preview.body.effects.would_revoke_course_access, true);
    assert.equal(preview.body.effects.would_update_crm, true);
    assert.ok(preview.body.blockers.includes("YMTY_REFUND_EXECUTION_ENABLED 未开启"));
    assert.ok(preview.body.blockers.includes("YMTY_AUTO_REFUND_ENABLED 未开启"));
    assert.deepEqual(preview.body.timeline, [
      "payment_success",
      "refund_requested",
      "refund_approved",
      "refund_processing",
      "refund_provider_confirmed",
      "refunded"
    ]);

    assert.equal((await listYmtyRefunds()).refunds.length, 0);
    assert.deepEqual(await getYmtyOrderForPayment(order.order_id), beforeOrder);
    assert.deepEqual(await getYmtyCrmLead(order.order_id), beforeLead);
  } finally {
    restoreEnv();
    await resetAll();
  }
});

test("ymty refund preview only returns would_execute when both switches and policy match", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    const token = await loginAndChangePassword();
    const order = await paidOrder({ payChannel: "wechat_h5", transactionId: "wx-trade-001" });

    await saveAutoPolicy(token, { trigger_types: [] });
    process.env.YMTY_REFUND_EXECUTION_ENABLED = "true";
    process.env.YMTY_AUTO_REFUND_ENABLED = "true";
    const noTrigger = await previewRefund(token, order.order_id, "test_order", 100);
    assert.equal(noTrigger.body.would_execute, false);
    assert.ok(noTrigger.body.blockers.includes("自动退款触发条件未命中"));

    await saveAutoPolicy(token, { trigger_types: ["test_order"] });
    delete process.env.YMTY_AUTO_REFUND_ENABLED;
    const oneSwitch = await previewRefund(token, order.order_id, "test_order", 100);
    assert.equal(oneSwitch.body.would_execute, false);
    assert.ok(oneSwitch.body.blockers.includes("YMTY_AUTO_REFUND_ENABLED 未开启"));

    process.env.YMTY_AUTO_REFUND_ENABLED = "true";
    const ok = await previewRefund(token, order.order_id, "test_order", 100);
    assert.equal(ok.body.eligible, true);
    assert.equal(ok.body.would_execute, true);
    assert.deepEqual(ok.body.blockers, []);

    const tooMuch = await previewRefund(token, order.order_id, "test_order", 999);
    assert.equal(tooMuch.body.eligible, false);
    assert.equal(tooMuch.body.would_execute, false);
    assert.ok(tooMuch.body.blockers.includes("演练金额超过订单可退金额"));
  } finally {
    restoreEnv();
    await resetAll();
  }
});

test("ymty refund preview blocks unpaid and fully refunded orders", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    const token = await loginAndChangePassword();
    await saveAutoPolicy(token, { trigger_types: ["test_order"] });

    const pending = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel: "mock" });
    const pendingPreview = await previewRefund(token, pending.order.order_id, "test_order", 100);
    assert.equal(pendingPreview.statusCode, 200);
    assert.equal(pendingPreview.body.eligible, false);
    assert.ok(pendingPreview.body.blockers.includes("订单未支付"));

    const paid = await paidOrder();
    const refund = await createYmtyRefund({
      orderId: paid.order_id,
      amountCents: paid.amount_cents,
      reason: "已退完",
      admin: { adminId: "admin", user: { role: "finance_admin" } }
    });
    await approveYmtyRefund({
      refundId: refund.refund.refund_id,
      admin: { adminId: "admin", user: { role: "finance_admin" } }
    });
    await markYmtyRefundProviderResult({
      refundId: refund.refund.refund_id,
      status: "refunded",
      providerRefundId: "mock-refunded"
    });

    const preview = await previewRefund(token, paid.order_id, "test_order", 1);
    assert.equal(preview.body.eligible, false);
    assert.equal(preview.body.order.refundable_cents, 0);
    assert.ok(preview.body.blockers.includes("订单已无可退金额"));
  } finally {
    restoreEnv();
    await resetAll();
  }
});

test("ymty refund console page exposes dry run, policy draft, switch status and status explanations", async () => {
  const html = await readFile(new URL("../../web-mvp/admin/ymty/index.html", import.meta.url), "utf8");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  [
    "退款控制台",
    "当前仅可申请、审批和演练，不会真实退款。",
    "自动退款规则草稿",
    "Dry Run，不会真实退款",
    "模拟执行退款",
    "requested：已提交申请",
    "approved：财务已批准，尚未退款",
    "processing：平台处理中",
    "refunded：平台明确确认成功",
    "approved 不等于退款成功",
    "/api/admin/refunds/config",
    "/api/admin/refund-policy",
    "/api/admin/refunds/preview"
  ].forEach((text) => assert.ok(html.includes(text), `admin should include ${text}`));
  assert.ok(pkg.scripts["test:ymty-refund-controls"]);
});

async function resetAll() {
  restoreEnv();
  await resetYmtyForTests();
  await resetYmtyRefundsForTests();
  await replaceRuntimeRecords("ymty-refund-policy.json", []);
  await seedYmtyDefaults();
}

function setupAdminEnv() {
  process.env.YMTY_ADMIN_BOOTSTRAP_USERNAME = "admin";
  process.env.YMTY_ADMIN_BOOTSTRAP_PASSWORD = "bootstrap-pass-123";
  process.env.ADMIN_JWT_SECRET = "refund-controls-admin-secret";
  delete process.env.YMTY_ADMIN_TOKEN;
  delete process.env.YMTY_REFUND_EXECUTION_ENABLED;
  delete process.env.YMTY_AUTO_REFUND_ENABLED;
  delete process.env.YMTY_REFUND_REVOKE_COURSE_ON_SUCCESS;
}

function restoreEnv() {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}

async function loginAndChangePassword() {
  const login = await jsonRequest("/api/admin/login", {
    username: "admin",
    password: "bootstrap-pass-123"
  });
  assert.equal(login.statusCode, 200);
  const changed = await jsonRequest("/api/admin/change-password", {
    old_password: "bootstrap-pass-123",
    new_password: "changed-pass-456"
  }, authHeaders(login.body.token));
  assert.equal(changed.statusCode, 200);
  return changed.body.token;
}

async function paidOrder({
  payChannel = "mock",
  channel = "",
  campaign = "",
  creative = "",
  transactionId = ""
} = {}) {
  const created = await createYmtyOrder({
    productCode: "YMXX_JY_TY",
    payChannel,
    channel,
    campaign,
    creative
  });
  await markYmtyMockPaySuccess({
    orderId: created.order.order_id,
    token: created.order.order_token,
    transactionId
  });
  return created.order;
}

async function saveAutoPolicy(token, patch = {}) {
  const response = await jsonRequest("/api/admin/refund-policy", {
    mode: "auto_rule",
    delay_seconds: 5,
    max_amount_cents: 168,
    product_codes: ["YMXX_JY_TY"],
    pay_channels: ["wechat_jsapi", "wechat_h5", "alipay_wap", "mock"],
    trigger_types: ["test_order"],
    revoke_course_access: true,
    promotional_keep_access: false,
    ...patch
  }, authHeaders(token));
  assert.equal(response.statusCode, 200);
  return response.body.policy;
}

async function previewRefund(token, orderId, triggerType, amountCents) {
  return jsonRequest("/api/admin/refunds/preview", {
    order_id: orderId,
    amount_cents: amountCents,
    trigger_type: triggerType
  }, authHeaders(token));
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function jsonRequest(url, payload, headers = {}) {
  return request({
    method: "POST",
    url,
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: Buffer.from(JSON.stringify(payload))
  });
}

async function request({ method, url, headers = {}, body = Buffer.alloc(0) }) {
  const req = new MockRequest(body);
  req.method = method;
  req.url = url;
  req.headers = {
    host: "127.0.0.1:8787",
    "user-agent": "node-test",
    ...headers
  };
  req.socket = { remoteAddress: "127.0.0.1" };
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
    this.chunks = [];
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = { ...this.headers, ...headers };
  }

  end(chunk = "") {
    if (chunk) this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  result() {
    const raw = Buffer.concat(this.chunks).toString("utf8");
    let body = {};
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      body = { raw };
    }
    return { statusCode: this.statusCode, headers: this.headers, body };
  }
}
