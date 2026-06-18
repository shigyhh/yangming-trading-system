import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";

const envKeys = [
  "YMTY_ADMIN_BOOTSTRAP_USERNAME",
  "YMTY_ADMIN_BOOTSTRAP_PASSWORD",
  "ADMIN_JWT_SECRET",
  "YMTY_ADMIN_TOKEN",
  "YMTY_REFUND_REVOKE_COURSE_ON_SUCCESS",
  "YMTY_REFUND_EXECUTION_ENABLED",
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
const originalFetch = globalThis.fetch;
const { AlipaySdk } = await import("alipay-sdk");
const originalAlipayExec = AlipaySdk.prototype.exec;
let cachedAdminToken = "";

const { updateRuntimeRecords } = await import("../src/lib/store.js");
const { handleError } = await import("../src/lib/http.js");
const { route } = await import("../src/routes/router.js");
const {
  createYmtyOrder,
  getYmtyAuditLogs,
  listYmtyCourseUsers,
  markYmtyMockPaySuccess,
  resetYmtyForTests,
  seedYmtyDefaults
} = await import("../src/services/ymtyCampaign.js");
const { getYmtyCrmLead } = await import("../src/services/ymtyCrm.js");
const {
  markYmtyRefundProviderResult,
  resetYmtyRefundsForTests
} = await import("../src/services/ymtyRefunds.js");

test.after(() => restoreEnv());
test.after(() => {
  globalThis.fetch = originalFetch;
  AlipaySdk.prototype.exec = originalAlipayExec;
});

test("ymty refunds can only be requested for paid orders and valid amounts", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    const token = await loginAndChangePassword();
    const pending = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel: "mock" });
    const pendingRefund = await jsonRequest("/api/admin/refunds", {
      order_id: pending.order.order_id,
      amount_cents: 100,
      reason: "用户申请"
    }, authHeaders(token));
    assert.equal(pendingRefund.statusCode, 400);
    assert.match(pendingRefund.body.message || pendingRefund.body.error, /paid|支付/i);

    const paid = await paidOrder();
    const tooMuch = await jsonRequest("/api/admin/refunds", {
      order_id: paid.order_id,
      amount_cents: paid.amount_cents + 1,
      reason: "金额过大"
    }, authHeaders(token));
    assert.equal(tooMuch.statusCode, 400);

    const created = await jsonRequest("/api/admin/refunds", {
      order_id: paid.order_id,
      amount_cents: 68,
      reason: "学员申请退款"
    }, authHeaders(token));
    assert.equal(created.statusCode, 200);
    assert.equal(created.body.refund.status, "requested");
    assert.equal(created.body.refund.provider, "mock");
    assert.equal(created.body.refund.requested_by, "admin");

    const audit = await getYmtyAuditLogs();
    assert.ok(audit.audit_logs.some((item) => item.action === "refund_request" && item.target_id === created.body.refund.refund_id));
  } finally {
    await resetAll();
    restoreEnv();
  }
});

test("ymty refunds require high privilege approval and approve does not call payment gateway", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    const adminToken = await loginAndChangePassword();
    const paid = await paidOrder();
    const request = await jsonRequest("/api/admin/refunds", {
      order_id: paid.order_id,
      amount_cents: 100,
      reason: "人工审核"
    }, authHeaders(adminToken));
    assert.equal(request.statusCode, 200);

    const denied = await jsonRequest(`/api/admin/refunds/${request.body.refund.refund_id}/approve`, {
      note: "普通管理员尝试"
    }, authHeaders(adminToken));
    assert.equal(denied.statusCode, 403);

    await elevateAdminRole("finance_admin");
    const financeToken = await loginWithPassword("changed-pass-456");
    const approved = await jsonRequest(`/api/admin/refunds/${request.body.refund.refund_id}/approve`, {
      note: "审核通过"
    }, authHeaders(financeToken));
    assert.equal(approved.statusCode, 200);
    assert.equal(approved.body.refund.status, "approved");
    assert.equal(approved.body.refund.approved_by, "admin");
    assert.equal(approved.body.refund.provider_refund_id, "");

    const detail = await requestJson({
      method: "GET",
      url: `/api/admin/refunds/${approved.body.refund.refund_id}`,
      headers: authHeaders(financeToken)
    });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.body.refund.status, "approved");
  } finally {
    await resetAll();
    restoreEnv();
  }
});

test("ymty refunds reject path, provider success updates crm and revokes course rights", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    const adminToken = await loginAndChangePassword();
    const paid = await paidOrder();
    const rejectedRequest = await jsonRequest("/api/admin/refunds", {
      order_id: paid.order_id,
      amount_cents: 30,
      reason: "材料不完整"
    }, authHeaders(adminToken));

    const request = await jsonRequest("/api/admin/refunds", {
      order_id: paid.order_id,
      amount_cents: paid.amount_cents,
      reason: "全额退款"
    }, authHeaders(adminToken));

    await elevateAdminRole("finance_admin");
    const financeToken = await loginWithPassword("changed-pass-456");

    const rejected = await jsonRequest(`/api/admin/refunds/${rejectedRequest.body.refund.refund_id}/reject`, {
      reason: "未满足退款条件"
    }, authHeaders(financeToken));
    assert.equal(rejected.statusCode, 200);
    assert.equal(rejected.body.refund.status, "rejected");
    assert.equal(rejected.body.refund.rejected_by, "admin");

    await jsonRequest(`/api/admin/refunds/${request.body.refund.refund_id}/approve`, {}, authHeaders(financeToken));
    const completed = await markYmtyRefundProviderResult({
      refundId: request.body.refund.refund_id,
      status: "refunded",
      providerRefundId: "mock-refund-001"
    });
    assert.equal(completed.refund.status, "refunded");
    assert.equal(completed.refund.provider_refund_id, "mock-refund-001");

    const crm = await getYmtyCrmLead(paid.order_id);
    assert.equal(crm.lead.stage, "refunded");
    assert.equal(crm.lead.refund_status, "refunded");

    const courseUsers = await listYmtyCourseUsers();
    assert.equal(courseUsers.course_users.find((item) => item.order_id === paid.order_id)?.status, "revoked");

    const overLimit = await jsonRequest("/api/admin/refunds", {
      order_id: paid.order_id,
      amount_cents: 1,
      reason: "超过累计金额"
    }, authHeaders(financeToken));
    assert.equal(overLimit.statusCode, 400);
  } finally {
    await resetAll();
    restoreEnv();
  }
});

test("ymty refund admin page exposes Chinese refund controls", async () => {
  const fs = await import("node:fs/promises");
  const html = await fs.readFile(new URL("../../web-mvp/admin/ymty/index.html", import.meta.url), "utf8");
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));
  [
    "退款申请",
    "退款原因",
    "申请金额",
    "审核状态",
    "审核人",
    "审计记录",
    "/api/admin/refunds"
  ].forEach((text) => assert.ok(html.includes(text), `admin should include ${text}`));
  assert.ok(packageJson.scripts["test:ymty-refund"]);
});

test("ymty refund execution is disabled by default and requires order suffix confirmation", async () => {
  await resetAll();
  const tempDir = await setupPaymentEnv();
  setupAdminEnv();

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("gateway should stay disabled");
  };

  try {
    const refund = await approvedRefund({
      payChannel: "wechat_h5",
      transactionId: "wx-paid-transaction-001"
    });

    const disabled = await jsonRequest(`/api/admin/refunds/${refund.refund_id}/execute`, {
      confirm_order_suffix: refund.order_id.slice(-6)
    }, authHeaders(await financeToken()));
    assert.equal(disabled.statusCode, 403);
    assert.match(disabled.body.message || disabled.body.error, /未启用|关闭/);
    assert.equal(fetchCalls, 0);

    process.env.YMTY_REFUND_EXECUTION_ENABLED = "true";
    const wrongConfirm = await jsonRequest(`/api/admin/refunds/${refund.refund_id}/execute`, {
      confirm_order_suffix: "WRONG1"
    }, authHeaders(await financeToken()));
    assert.equal(wrongConfirm.statusCode, 400);
    assert.match(wrongConfirm.body.message || wrongConfirm.body.error, /订单号后6位/);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(tempDir, { recursive: true, force: true });
    await resetAll();
    restoreEnv();
  }
});

test("ymty executes wechat refund once, queries processing refund, and handles refund notify", async () => {
  await resetAll();
  const tempDir = await setupPaymentEnv();
  setupAdminEnv();
  process.env.YMTY_REFUND_EXECUTION_ENABLED = "true";

  const wechatRequests = [];
  globalThis.fetch = async (url, options = {}) => {
    wechatRequests.push({ url: String(url), options });
    if (options.method === "POST") {
      const body = JSON.parse(options.body || "{}");
      assert.equal(String(url), "https://api.mch.weixin.qq.com/v3/refund/domestic/refunds");
      assert.equal(body.transaction_id, "wx-paid-transaction-001");
      assert.equal(body.out_refund_no.startsWith("refund_"), true);
      assert.equal(body.amount.refund, 100);
      assert.equal(body.amount.total, 168);
      assert.equal(body.amount.currency, "CNY");
      assert.equal(String(body.notify_url).endsWith("/api/pay/wechat/refund-notify"), true);
      assert.doesNotMatch(options.headers.Authorization || "", /BEGIN PRIVATE KEY|12345678901234567890123456789012/);
      return jsonResponse({
        refund_id: "wx-refund-provider-001",
        out_refund_no: body.out_refund_no,
        status: "PROCESSING"
      });
    }
    assert.match(String(url), /\/v3\/refund\/domestic\/refunds\/refund_/);
    return jsonResponse({
      refund_id: "wx-refund-provider-001",
      out_refund_no: String(url).split("/").pop(),
      status: "SUCCESS"
    });
  };

  try {
    const refund = await approvedRefund({
      payChannel: "wechat_h5",
      transactionId: "wx-paid-transaction-001",
      amountCents: 100
    });
    const token = await financeToken();
    const executed = await jsonRequest(`/api/admin/refunds/${refund.refund_id}/execute`, {
      confirm_order_suffix: refund.order_id.slice(-6)
    }, authHeaders(token));
    assert.equal(executed.statusCode, 200);
    assert.equal(executed.body.refund.status, "processing");
    assert.equal(executed.body.refund.provider_refund_id, "wx-refund-provider-001");

    const again = await jsonRequest(`/api/admin/refunds/${refund.refund_id}/execute`, {
      confirm_order_suffix: refund.order_id.slice(-6)
    }, authHeaders(token));
    assert.equal(again.statusCode, 200);
    assert.equal(wechatRequests.filter((item) => item.options.method === "POST").length, 1);

    const queried = await jsonRequest(`/api/admin/refunds/${refund.refund_id}/query`, {}, authHeaders(token));
    assert.equal(queried.statusCode, 200);
    assert.equal(queried.body.refund.status, "refunded");

    const notifyRefund = await approvedRefund({
      payChannel: "wechat_h5",
      transactionId: "wx-paid-transaction-002",
      amountCents: 68
    });
    await jsonRequest(`/api/admin/refunds/${notifyRefund.refund_id}/execute`, {
      confirm_order_suffix: notifyRefund.order_id.slice(-6)
    }, authHeaders(token));
    const notify = await wechatRefundNotify({
      outRefundNo: notifyRefund.refund_id,
      refundId: "wx-refund-provider-002",
      status: "SUCCESS"
    });
    assert.equal(notify.statusCode, 200);
    assert.equal(notify.body.code, "SUCCESS");
    const detail = await requestJson({
      method: "GET",
      url: `/api/admin/refunds/${notifyRefund.refund_id}`,
      headers: authHeaders(token)
    });
    assert.equal(detail.body.refund.status, "refunded");
  } finally {
    globalThis.fetch = originalFetch;
    await rm(tempDir, { recursive: true, force: true });
    await resetAll();
    restoreEnv();
  }
});

test("ymty executes alipay refund through SDK with response validation and idempotent query", async () => {
  await resetAll();
  const tempDir = await setupPaymentEnv();
  setupAdminEnv();
  process.env.YMTY_REFUND_EXECUTION_ENABLED = "true";

  const calls = [];
  AlipaySdk.prototype.exec = async function exec(method, params = {}, options = {}) {
    calls.push({ method, params, options });
    assert.equal(options.validateSign, true);
    if (method === "alipay.trade.refund") {
      assert.equal(params.bizContent.tradeNo, "ali-paid-transaction-001");
      assert.equal(params.bizContent.refundAmount, "1.00");
      assert.ok(params.bizContent.outRequestNo.startsWith("refund_"));
      return {
        code: "10000",
        msg: "Success",
        tradeNo: "ali-paid-transaction-001",
        outTradeNo: params.bizContent.outTradeNo,
        outRequestNo: params.bizContent.outRequestNo,
        refundFee: "1.00",
        fundChange: "Y"
      };
    }
    if (method === "alipay.trade.fastpay.refund.query") {
      return {
        code: "10000",
        msg: "Success",
        tradeNo: "ali-paid-transaction-001",
        outTradeNo: params.bizContent.outTradeNo,
        outRequestNo: params.bizContent.outRequestNo,
        refundAmount: "1.00",
        refundStatus: "REFUND_SUCCESS"
      };
    }
    throw new Error(`unexpected alipay method ${method}`);
  };

  try {
    const refund = await approvedRefund({
      payChannel: "alipay_wap",
      transactionId: "ali-paid-transaction-001",
      amountCents: 100
    });
    const token = await financeToken();
    const executed = await jsonRequest(`/api/admin/refunds/${refund.refund_id}/execute`, {
      confirm_order_suffix: refund.order_id.slice(-6)
    }, authHeaders(token));
    assert.equal(executed.statusCode, 200);
    assert.equal(executed.body.refund.status, "refunded");
    assert.equal(executed.body.refund.provider_refund_id, "ali-paid-transaction-001");

    const again = await jsonRequest(`/api/admin/refunds/${refund.refund_id}/execute`, {
      confirm_order_suffix: refund.order_id.slice(-6)
    }, authHeaders(token));
    assert.equal(again.statusCode, 200);
    assert.equal(calls.filter((item) => item.method === "alipay.trade.refund").length, 1);

    const queried = await jsonRequest(`/api/admin/refunds/${refund.refund_id}/query`, {}, authHeaders(token));
    assert.equal(queried.statusCode, 200);
    assert.equal(queried.body.refund.status, "refunded");
    assert.equal(calls.some((item) => item.method === "alipay.trade.fastpay.refund.query"), true);
  } finally {
    AlipaySdk.prototype.exec = originalAlipayExec;
    await rm(tempDir, { recursive: true, force: true });
    await resetAll();
    restoreEnv();
  }
});

async function resetAll() {
  cachedAdminToken = "";
  restoreEnv();
  await resetYmtyForTests();
  await resetYmtyRefundsForTests();
  await seedYmtyDefaults();
}

async function paidOrder({ payChannel = "mock", transactionId = "" } = {}) {
  const created = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel });
  await markYmtyMockPaySuccess({
    orderId: created.order.order_id,
    token: created.order.order_token,
    transactionId
  });
  return created.order;
}

function setupAdminEnv() {
  process.env.YMTY_ADMIN_BOOTSTRAP_USERNAME = "admin";
  process.env.YMTY_ADMIN_BOOTSTRAP_PASSWORD = "bootstrap-pass-123";
  process.env.ADMIN_JWT_SECRET = "refund-admin-secret";
  delete process.env.YMTY_ADMIN_TOKEN;
  delete process.env.YMTY_REFUND_REVOKE_COURSE_ON_SUCCESS;
  delete process.env.YMTY_REFUND_EXECUTION_ENABLED;
}

function restoreEnv() {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}

async function loginAndChangePassword() {
  if (cachedAdminToken) return cachedAdminToken;
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
  cachedAdminToken = changed.body.token;
  return cachedAdminToken;
}

async function loginWithPassword(password) {
  const login = await jsonRequest("/api/admin/login", {
    username: "admin",
    password
  });
  assert.equal(login.statusCode, 200);
  return login.body.token;
}

async function elevateAdminRole(role) {
  await updateRuntimeRecords("ymty-admin-users.json", (records) => records.map((user) => ({
    ...user,
    role
  })));
}

async function financeToken() {
  await elevateAdminRole("finance_admin");
  return loginAndChangePassword();
}

async function approvedRefund({ payChannel = "mock", transactionId = "", amountCents = 100 } = {}) {
  const adminToken = await loginAndChangePassword();
  const paid = await paidOrder({ payChannel, transactionId });
  const request = await jsonRequest("/api/admin/refunds", {
    order_id: paid.order_id,
    amount_cents: amountCents,
    reason: "执行退款"
  }, authHeaders(adminToken));
  assert.equal(request.statusCode, 200);
  await elevateAdminRole("finance_admin");
  const token = await financeToken();
  const approved = await jsonRequest(`/api/admin/refunds/${request.body.refund.refund_id}/approve`, {}, authHeaders(token));
  assert.equal(approved.statusCode, 200);
  return approved.body.refund;
}

async function setupPaymentEnv() {
  restoreEnv();
  const tempDir = await mkdtemp(join(tmpdir(), "ymty-refund-pay-test-"));
  const wechatMerchantKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const wechatPlatformKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const alipayKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });

  const wechatPrivatePath = join(tempDir, "wechat-private.pem");
  const wechatPayPublicKeyPath = join(tempDir, "wechat-pay-public.pem");
  const alipayPrivatePath = join(tempDir, "alipay-private.pem");
  const alipayPublicPath = join(tempDir, "alipay-public.pem");
  await writeFile(wechatPrivatePath, wechatMerchantKeys.privateKey.export({ type: "pkcs8", format: "pem" }));
  await writeFile(wechatPayPublicKeyPath, wechatPlatformKeys.publicKey.export({ type: "spki", format: "pem" }));
  await writeFile(alipayPrivatePath, alipayKeys.privateKey.export({ type: "pkcs8", format: "pem" }));
  await writeFile(alipayPublicPath, alipayKeys.publicKey.export({ type: "spki", format: "pem" }));

  process.env.WECHAT_PAY_MODE = "direct";
  process.env.WECHAT_MCH_ID = "1900000001";
  process.env.WECHAT_SERVICE_APP_ID = "wxserviceappid";
  process.env.WECHAT_MINI_APP_ID = "wxminiappid";
  process.env.WECHAT_SERVICE_APP_SECRET = "service-secret-for-test";
  process.env.WECHAT_VERIFY_MODE = "public_key";
  process.env.WECHAT_PAY_PUBLIC_KEY_ID = "PUB_KEY_ID_TEST";
  process.env.WECHAT_PAY_PUBLIC_KEY_PATH = wechatPayPublicKeyPath;
  process.env.WECHAT_API_V3_KEY = "12345678901234567890123456789012";
  process.env.WECHAT_CERT_SERIAL_NO = "TESTMERCHANTSERIAL";
  process.env.WECHAT_PRIVATE_KEY_PATH = wechatPrivatePath;
  process.env.WECHAT_NOTIFY_URL = "https://xxjyxt.com/api/pay/wechat/notify";
  process.env.WECHAT_H5_SCENE_INFO = "{\"payer_client_ip\":\"127.0.0.1\",\"h5_info\":{\"type\":\"Wap\"}}";
  process.env.WECHAT_JSAPI_OAUTH_REDIRECT_URL = "https://xxjyxt.com/api/wechat/oauth/callback";
  process.env.ALIPAY_APP_ID = "2026000000000000";
  process.env.ALIPAY_PRIVATE_KEY_PATH = alipayPrivatePath;
  process.env.ALIPAY_PUBLIC_KEY_PATH = alipayPublicPath;
  process.env.ALIPAY_GATEWAY_URL = "https://openapi.alipay.com/gateway.do";
  process.env.ALIPAY_NOTIFY_URL = "https://xxjyxt.com/api/pay/alipay/notify";
  process.env.ALIPAY_RETURN_URL = "https://xxjyxt.com/hd/ymty/success.html";
  globalThis.__ymtyWechatPlatformPrivateKey = wechatPlatformKeys.privateKey;
  return tempDir;
}

async function wechatRefundNotify({ outRefundNo, refundId, status }) {
  const bodyText = JSON.stringify({
    id: crypto.randomUUID(),
    create_time: new Date().toISOString(),
    event_type: "REFUND.SUCCESS",
    resource_type: "encrypt-resource",
    resource: encryptWechatResource({
      mchid: process.env.WECHAT_MCH_ID,
      out_refund_no: outRefundNo,
      refund_id: refundId,
      refund_status: status
    }, "refund")
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(8).toString("hex");
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${timestamp}\n${nonce}\n${bodyText}\n`)
    .sign(globalThis.__ymtyWechatPlatformPrivateKey, "base64");
  return requestJson({
    method: "POST",
    url: "/api/pay/wechat/refund-notify",
    headers: {
      "content-type": "application/json",
      "wechatpay-timestamp": timestamp,
      "wechatpay-nonce": nonce,
      "wechatpay-serial": process.env.WECHAT_PAY_PUBLIC_KEY_ID,
      "wechatpay-signature": signature
    },
    body: Buffer.from(bodyText)
  });
}

function encryptWechatResource(payload, associatedData = "refund") {
  const key = Buffer.from(process.env.WECHAT_API_V3_KEY, "utf8");
  const nonce = crypto.randomBytes(6).toString("hex");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, Buffer.from(nonce, "utf8"));
  cipher.setAAD(Buffer.from(associatedData));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    algorithm: "AEAD_AES_256_GCM",
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    nonce,
    associated_data: associatedData
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function jsonRequest(url, payload, headers = {}) {
  return requestJson({
    method: "POST",
    url,
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: Buffer.from(JSON.stringify(payload))
  });
}

async function requestJson({ method, url, headers = {}, body = Buffer.alloc(0) }) {
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
