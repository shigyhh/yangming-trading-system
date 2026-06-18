import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

const envKeys = [
  "YMTY_ADMIN_BOOTSTRAP_USERNAME",
  "YMTY_ADMIN_BOOTSTRAP_PASSWORD",
  "ADMIN_JWT_SECRET",
  "YMTY_ADMIN_TOKEN",
  "YMTY_REFUND_REVOKE_COURSE_ON_SUCCESS"
];
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

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

async function resetAll() {
  restoreEnv();
  await resetYmtyForTests();
  await resetYmtyRefundsForTests();
  await seedYmtyDefaults();
}

async function paidOrder() {
  const created = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel: "mock" });
  await markYmtyMockPaySuccess({ orderId: created.order.order_id, token: created.order.order_token });
  return created.order;
}

function setupAdminEnv() {
  process.env.YMTY_ADMIN_BOOTSTRAP_USERNAME = "admin";
  process.env.YMTY_ADMIN_BOOTSTRAP_PASSWORD = "bootstrap-pass-123";
  process.env.ADMIN_JWT_SECRET = "refund-admin-secret";
  delete process.env.YMTY_ADMIN_TOKEN;
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
