import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

const authEnvKeys = [
  "YMTY_ADMIN_BOOTSTRAP_USERNAME",
  "YMTY_ADMIN_BOOTSTRAP_PASSWORD",
  "ADMIN_JWT_SECRET",
  "YMTY_ADMIN_TOKEN",
  "NODE_ENV",
  "YMTY_ALLOW_MOCK_PAYMENT"
];

const originalEnv = Object.fromEntries(authEnvKeys.map((key) => [key, process.env[key]]));
process.env.NODE_ENV = "test";
process.env.YMTY_ALLOW_MOCK_PAYMENT = "true";

const { handleError } = await import("../src/lib/http.js");
const { route } = await import("../src/routes/router.js");
const {
  createYmtyLivecode,
  createYmtyOrder,
  getYmtyAfterpayEntrance,
  getYmtyAuditLogs,
  getYmtyPublicCampaign,
  markYmtyMockPaySuccess,
  resetYmtyForTests,
  seedYmtyDefaults
} = await import("../src/services/ymtyCampaign.js");
const {
  addYmtyCrmNote,
  getYmtyCrmLead,
  listYmtyCrmLeads,
  resetYmtyCrmForTests,
  updateYmtyCrmLead,
  updateYmtyCrmLeadStage
} = await import("../src/services/ymtyCrm.js");
const { getYmtyAnalyticsSummary } = await import("../src/services/ymtyAnalytics.js");

test.after(() => restoreEnv());

test("ymty crm creates one paid lead and updates assigned after livecode allocation", async () => {
  await resetAll();

  try {
    const created = await createYmtyOrder({
      productCode: "YMXX_JY_TY",
      payChannel: "mock",
      channel: "douyin",
      campaign: "ymty_202606",
      creative: "video001",
      sessionId: "sess-crm",
      clickId: "click-crm"
    });

    await markYmtyMockPaySuccess({ orderId: created.order.order_id, token: created.order.order_token });
    await markYmtyMockPaySuccess({ orderId: created.order.order_id, token: created.order.order_token });

    let { leads } = await listYmtyCrmLeads({});
    assert.equal(leads.length, 1);
    assert.equal(leads[0].order_id, created.order.order_id);
    assert.equal(leads[0].stage, "paid");
    assert.equal(leads[0].session_id, "sess-crm");
    assert.equal(leads[0].channel, "douyin");
    assert.equal(leads[0].click_id, "click-crm");
    assert.equal(leads[0].amount_cents, 168);
    assert.equal(leads[0].phone, undefined);

    await createYmtyLivecode({
      adminId: "crm-test-admin",
      patch: {
        code_key: "YMTY_CRM_ASSIGN",
        name: "CRM 分配测试码",
        qr_image: "/uploads/livecode/crm-assign.png",
        channels: ["douyin"],
        priority: 1,
        status: "active"
      }
    });

    const entrance = await getYmtyAfterpayEntrance({
      orderId: created.order.order_id,
      token: created.order.order_token
    });
    assert.equal(entrance.livecode.code_key, "YMTY_CRM_ASSIGN");

    ({ leads } = await listYmtyCrmLeads({}));
    assert.equal(leads.length, 1);
    assert.equal(leads[0].stage, "assigned");
    assert.equal(leads[0].code_key, "YMTY_CRM_ASSIGN");
    assert.equal(leads[0].contact_type, "personal_wechat");
    assert.ok(leads[0].updated_at);

    const oldOrder = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel: "mock" });
    await markYmtyMockPaySuccess({ orderId: oldOrder.order.order_id, token: oldOrder.order.order_token });
    const oldLead = (await listYmtyCrmLeads({ q: oldOrder.order.order_id })).leads[0];
    assert.equal(oldLead.session_id, "");
  } finally {
    await resetAll();
  }
});

test("ymty crm admin endpoints protect leads, update fields, stages, notes and audit logs", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    await createYmtyLivecode({
      adminId: "crm-test-admin",
      patch: {
        code_key: "YMTY_CRM_GROUP",
        name: "CRM 社群测试码",
        qr_image: "/uploads/livecode/crm-group.png",
        channels: ["wechat_group"],
        priority: 1,
        status: "active"
      }
    });
    const created = await paidOrder({ channel: "wechat_group", campaign: "camp-a", creative: "poster-a" });
    await getYmtyAfterpayEntrance({ orderId: created.order_id, token: created.order_token });
    const lead = (await listYmtyCrmLeads({})).leads[0];

    const noAuth = await request({ method: "GET", url: "/api/admin/crm/leads" });
    assert.ok([401, 403].includes(noAuth.statusCode));

    const token = await loginAndChangePassword();
    const updated = await jsonRequest(`/api/admin/crm/leads/${encodeURIComponent(lead.lead_id)}`, {
      owner: "助教A",
      tags: ["重点跟进", "=公式标签"],
      contact_name: "王同学",
      phone_last4: "13800123456",
      next_follow_up_at: "2026-06-20T10:00:00+08:00"
    }, authHeaders(token));
    assert.equal(updated.statusCode, 200);
    assert.equal(updated.body.lead.owner, "助教A");
    assert.deepEqual(updated.body.lead.tags, ["重点跟进", "=公式标签"]);
    assert.equal(updated.body.lead.contact_name, "王同学");
    assert.equal(updated.body.lead.phone_last4, "3456");

    const added = await jsonRequest(`/api/admin/crm/leads/${encodeURIComponent(lead.lead_id)}/stage`, {
      stage: "added",
      reason: "已加微信"
    }, authHeaders(token));
    assert.equal(added.statusCode, 200);
    assert.equal(added.body.lead.stage, "added");
    assert.ok(added.body.lead.added_at);

    const firstContact = await updateYmtyCrmLeadStage({
      leadId: lead.lead_id,
      stage: "first_contact",
      reason: "已首次沟通",
      adminId: "crm-test-admin"
    });
    assert.equal(firstContact.lead.stage, "first_contact");
    assert.ok(firstContact.lead.first_contact_at);

    const badStage = await jsonRequest(`/api/admin/crm/leads/${encodeURIComponent(lead.lead_id)}/stage`, {
      stage: "not-a-stage"
    }, authHeaders(token));
    assert.equal(badStage.statusCode, 400);

    const refunded = await jsonRequest(`/api/admin/crm/leads/${encodeURIComponent(lead.lead_id)}/stage`, {
      stage: "refunded"
    }, authHeaders(token));
    assert.equal(refunded.statusCode, 403);

    await addYmtyCrmNote({ leadId: lead.lead_id, adminId: "crm-test-admin", body: "第一次备注" });
    await jsonRequest(`/api/admin/crm/leads/${encodeURIComponent(lead.lead_id)}/note`, {
      body: "第二次备注"
    }, authHeaders(token));
    const detail = await request({
      method: "GET",
      url: `/api/admin/crm/leads/${encodeURIComponent(lead.lead_id)}`,
      headers: authHeaders(token)
    });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.body.notes.length, 2);
    assert.equal(detail.body.notes[0].body, "第一次备注");
    assert.equal(detail.body.notes[1].body, "第二次备注");

    const audit = await getYmtyAuditLogs();
    assert.ok(audit.audit_logs.some((item) => item.action === "crm_update_lead" && item.target_id === lead.lead_id));
    assert.ok(audit.audit_logs.some((item) => item.action === "crm_update_stage" && item.target_id === lead.lead_id));
    assert.ok(audit.audit_logs.some((item) => item.action === "crm_add_note" && item.target_id === lead.lead_id));
  } finally {
    restoreEnv();
    await resetAll();
  }
});

test("ymty crm filters, exports safe csv, stays private and feeds analytics manual funnel", async () => {
  await resetAll();
  setupAdminEnv();

  try {
    await createYmtyLivecode({
      adminId: "crm-test-admin",
      patch: {
        code_key: "YMTY_CRM_DOUYIN",
        name: "CRM 抖音码",
        contact_type: "personal_wechat",
        qr_image: "/uploads/livecode/crm-douyin.png",
        channels: ["douyin"],
        priority: 1,
        status: "active"
      }
    });
    await createYmtyLivecode({
      adminId: "crm-test-admin",
      patch: {
        code_key: "YMTY_CRM_FALLBACK",
        name: "CRM 兜底码",
        contact_type: "personal_wechat",
        qr_image: "/uploads/livecode/crm-fallback.png",
        channels: ["*"],
        priority: 100,
        status: "active"
      }
    });
    const douyin = await paidOrder({ channel: "douyin", campaign: "camp-a", creative: "video-a" });
    const tencent = await paidOrder({ channel: "tencent_ads", campaign: "camp-b", creative: "image-b" });
    await getYmtyAfterpayEntrance({ orderId: douyin.order_id, token: douyin.order_token });
    await getYmtyAfterpayEntrance({ orderId: tencent.order_id, token: tencent.order_token });

    const leads = (await listYmtyCrmLeads({})).leads;
    const douyinLead = leads.find((item) => item.order_id === douyin.order_id);
    const tencentLead = leads.find((item) => item.order_id === tencent.order_id);
    await updateYmtyCrmLead({ leadId: douyinLead.lead_id, adminId: "crm-test-admin", patch: { owner: "=助教A", tags: ["高意向"] } });
    await updateYmtyCrmLeadStage({ leadId: douyinLead.lead_id, stage: "added", adminId: "crm-test-admin" });
    await updateYmtyCrmLeadStage({ leadId: douyinLead.lead_id, stage: "first_contact", adminId: "crm-test-admin" });
    await updateYmtyCrmLeadStage({ leadId: douyinLead.lead_id, stage: "group_joined", adminId: "crm-test-admin" });
    await updateYmtyCrmLeadStage({ leadId: tencentLead.lead_id, stage: "lost", adminId: "crm-test-admin" });

    assert.equal((await listYmtyCrmLeads({ channel: "douyin" })).leads.length, 1);
    assert.equal((await listYmtyCrmLeads({ stage: "lost" })).leads[0].order_id, tencent.order_id);
    assert.equal((await listYmtyCrmLeads({ q: "camp-a" })).leads.length, 1);

    const publicCampaign = await getYmtyPublicCampaign();
    const publicText = JSON.stringify(publicCampaign);
    assert.equal(publicText.includes("crm"), false);
    assert.equal(publicText.includes("owner"), false);
    assert.equal(publicText.includes("contact_name"), false);

    const token = await loginAndChangePassword();
    const csv = await request({
      method: "GET",
      url: "/api/admin/crm/export.csv?channel=douyin",
      headers: authHeaders(token)
    });
    assert.equal(csv.statusCode, 200);
    assert.equal(csv.headers["Content-Type"], "text/csv; charset=utf-8");
    assert.ok(csv.body.raw.includes("订单号,支付时间,金额,渠道,活动,素材,支付方式,助教,阶段,负责人,标签,最近联系,下次跟进"));
    assert.ok(csv.body.raw.includes("\"'=助教A\""));

    const summary = await getYmtyAnalyticsSummary({ days: 7 });
    assert.equal(summary.overview.crm_paid_customers, 2);
    assert.equal(summary.overview.crm_assigned_customers, 2);
    assert.equal(summary.overview.crm_added_customers, 1);
    assert.equal(summary.overview.crm_first_contact_customers, 1);
    assert.equal(summary.overview.crm_group_joined_customers, 1);
    assert.equal(summary.overview.crm_lost_customers, 1);
    assert.equal(summary.crm_funnel.source, "人工");

    const adminSummary = await request({
      method: "GET",
      url: "/api/admin/analytics/summary?days=7",
      headers: authHeaders(token)
    });
    assert.equal(adminSummary.statusCode, 200);
    assert.equal(adminSummary.body.crm_funnel.source, "人工");
  } finally {
    restoreEnv();
    await resetAll();
  }
});

test("ymty admin crm page exposes Chinese CRM controls without changing payment UI", async () => {
  const fs = await import("node:fs/promises");
  const adminHtml = await fs.readFile(new URL("../../web-mvp/admin/ymty/index.html", import.meta.url), "utf8");
  const packageJson = await fs.readFile(new URL("../package.json", import.meta.url), "utf8");
  const pkg = JSON.parse(packageJson);

  [
    "客户与跟进",
    "订单号",
    "支付金额",
    "分配助教",
    "当前阶段",
    "负责人",
    "最近联系时间",
    "下次跟进",
    "标记已添加",
    "标记已首次沟通",
    "标记已进群",
    "标记已开课",
    "标记已完课",
    "标记已转化",
    "标记流失",
    "数据来源：人工",
    "/api/admin/crm/leads",
    "/api/admin/crm/export.csv"
  ].forEach((text) => assert.ok(adminHtml.includes(text), `admin should include ${text}`));
  assert.ok(pkg.scripts["test:ymty-crm"]);
});

async function resetAll() {
  process.env.NODE_ENV = "test";
  process.env.YMTY_ALLOW_MOCK_PAYMENT = "true";
  await resetYmtyForTests();
  await resetYmtyCrmForTests();
  await seedYmtyDefaults();
}

async function paidOrder({ channel = "", campaign = "", creative = "" } = {}) {
  const created = await createYmtyOrder({
    productCode: "YMXX_JY_TY",
    payChannel: "mock",
    channel,
    campaign,
    creative
  });
  await markYmtyMockPaySuccess({
    orderId: created.order.order_id,
    token: created.order.order_token,
    transactionId: `mock-${created.order.order_id}`
  });
  return created.order;
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

function setupAdminEnv() {
  process.env.YMTY_ADMIN_BOOTSTRAP_USERNAME = "admin";
  process.env.YMTY_ADMIN_BOOTSTRAP_PASSWORD = "bootstrap-pass-123";
  process.env.ADMIN_JWT_SECRET = "crm-admin-secret";
  delete process.env.YMTY_ADMIN_TOKEN;
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
  return { Authorization: `Bearer ${token}` };
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
    this.payload = "";
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = headers;
  }

  end(payload = "") {
    this.payload += Buffer.isBuffer(payload) ? payload.toString("utf8") : String(payload || "");
  }

  result() {
    let body = {};
    try {
      body = this.payload ? JSON.parse(this.payload) : {};
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
