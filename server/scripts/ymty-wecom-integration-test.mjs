import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";

const envKeys = [
  "WECOM_ENABLED",
  "WECOM_CORP_ID",
  "WECOM_CONTACT_SECRET",
  "WECOM_CALLBACK_TOKEN",
  "WECOM_CALLBACK_AES_KEY",
  "YMTY_ADMIN_BOOTSTRAP_USERNAME",
  "YMTY_ADMIN_BOOTSTRAP_PASSWORD",
  "ADMIN_JWT_SECRET",
  "YMTY_ADMIN_TOKEN",
  "NODE_ENV",
  "YMTY_ALLOW_MOCK_PAYMENT"
];
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
process.env.NODE_ENV = "test";
process.env.YMTY_ALLOW_MOCK_PAYMENT = "true";

const { handleError } = await import("../src/lib/http.js");
const { route } = await import("../src/routes/router.js");
const {
  createYmtyLivecode,
  getYmtyAfterpayEntrance,
  markYmtyMockPaySuccess,
  resetYmtyForTests,
  seedYmtyDefaults,
  createYmtyOrder
} = await import("../src/services/ymtyCampaign.js");
const { listYmtyCrmLeads } = await import("../src/services/ymtyCrm.js");
const {
  getYmtyWecomSummary,
  listYmtyWecomEvents,
  listYmtyWecomSyncJobs,
  resetYmtyWecomForTests
} = await import("../src/services/wecomCustomer.js");
const { signWecomCallback } = await import("../src/services/wecomCallbackCrypto.js");

test.after(() => restoreEnv());

test("ymty wecom callback stays disabled without config and does not affect paid afterpay", async () => {
  await resetAll();
  process.env.WECOM_ENABLED = "TRUE";

  try {
    const verify = await request({ method: "GET", url: "/api/wecom/customer/callback?msg_signature=x&timestamp=1&nonce=n&echostr=e" });
    assert.equal(verify.statusCode, 503);
    assert.equal(verify.body.code, "WECOM_DISABLED");

    await createYmtyLivecode({
      adminId: "wecom-disabled-test",
      patch: {
        code_key: "YMTY_DISABLED_FALLBACK",
        name: "企微关闭测试活码",
        qr_image: "/uploads/livecode/wecom-disabled.png",
        channels: ["douyin"],
        priority: 1,
        status: "active"
      }
    });
    const order = await paidOrder({ channel: "douyin" });
    const entrance = await getYmtyAfterpayEntrance({ orderId: order.order_id, token: order.order_token });
    assert.equal(entrance.livecode.code_key, "YMTY_DISABLED_FALLBACK");
  } finally {
    await resetAll();
  }
});

test("ymty wecom callback verifies url, rejects bad signature and bad corp id", async () => {
  await resetAll();
  setupWecomEnv();

  try {
    const echostr = encryptWecomXml("hello verify", "corp_test_ymty");
    const goodSignature = signWecomCallback({
      token: process.env.WECOM_CALLBACK_TOKEN,
      timestamp: "1710000000",
      nonce: "nonce-a",
      encrypted: echostr
    });
    const verified = await request({
      method: "GET",
      url: `/api/wecom/customer/callback?msg_signature=${goodSignature}&timestamp=1710000000&nonce=nonce-a&echostr=${encodeURIComponent(echostr)}`
    });
    assert.equal(verified.statusCode, 200);
    assert.equal(verified.body.raw, "hello verify");

    const badSignature = await request({
      method: "GET",
      url: `/api/wecom/customer/callback?msg_signature=bad&timestamp=1710000000&nonce=nonce-a&echostr=${encodeURIComponent(echostr)}`
    });
    assert.equal(badSignature.statusCode, 403);

    const wrongCorpPayload = buildEncryptedXml(`<xml><ToUserName><![CDATA[corp_test_ymty]]></ToUserName><ChangeType><![CDATA[add_external_contact]]></ChangeType></xml>`, "corp_wrong");
    const wrongCorp = await postWecomEncrypted(wrongCorpPayload, "1710000001", "nonce-b");
    assert.equal(wrongCorp.statusCode, 403);
    assert.equal(wrongCorp.body.code, "WECOM_CORP_ID_MISMATCH");
  } finally {
    await resetAll();
  }
});

test("ymty wecom add contact links by state, updates crm once, and records tag retry on mock failure", async () => {
  await resetAll();
  setupWecomEnv({ tagMock: "fail" });

  try {
    const livecode = await createYmtyLivecode({
      adminId: "wecom-test-admin",
      patch: {
        code_key: "YMTY_WECOM_DOUYIN",
        name: "企业微信抖音码",
        contact_type: "wecom",
        qr_image: "/uploads/livecode/wecom-douyin.png",
        wecom_link: "https://work.weixin.qq.com/ca/mock",
        channels: ["douyin"],
        wecom_tag_ids: ["tag_product", "tag_paid"],
        priority: 1,
        status: "active"
      }
    });
    const order = await paidOrder({ channel: "douyin", campaign: "camp-x", creative: "video-x" });
    await getYmtyAfterpayEntrance({ orderId: order.order_id, token: order.order_token });

    const eventXml = customerEventXml({
      changeType: "add_external_contact",
      eventKey: "evt-add-001",
      state: livecode.livecode.wecom_state,
      externalUserId: "wm_external_001",
      userId: "helper_a",
      createTime: "1710001111"
    });
    const first = await postWecomEncrypted(buildEncryptedXml(eventXml), "1710001111", "nonce-c");
    assert.equal(first.statusCode, 200);
    assert.equal(first.body.status, "processed");

    const duplicate = await postWecomEncrypted(buildEncryptedXml(eventXml), "1710001111", "nonce-c");
    assert.equal(duplicate.statusCode, 200);
    assert.equal(duplicate.body.status, "duplicate");

    const { events } = await listYmtyWecomEvents({});
    assert.equal(events.length, 1);
    assert.equal(events[0].linked_order_id, order.order_id);
    assert.equal(events[0].linked_lead_id.startsWith("lead_"), true);
    assert.equal(events[0].external_userid, "wm_external_001");

    const lead = (await listYmtyCrmLeads({ q: order.order_id })).leads[0];
    assert.equal(lead.stage, "added");
    assert.equal(lead.external_userid, "wm_external_001");
    assert.equal(lead.follow_user_userid, "helper_a");
    assert.equal(lead.data_source, "wecom_callback");
    assert.equal(lead.tag_sync_status, "failed");

    const { jobs } = await listYmtyWecomSyncJobs({ status: "failed" });
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].lead_id, lead.lead_id);

    const summary = await getYmtyWecomSummary();
    assert.equal(summary.enabled, true);
    assert.equal(summary.added_count, 1);
    assert.equal(summary.tag_sync_failed, 1);
  } finally {
    delete process.env.WECOM_MOCK_TAG_SYNC;
    await resetAll();
  }
});

test("ymty wecom unlinked events are retained and admin endpoints are protected", async () => {
  await resetAll();
  setupWecomEnv();
  setupAdminEnv();

  try {
    const eventXml = customerEventXml({
      changeType: "add_external_contact",
      eventKey: "evt-unlinked",
      state: "unknown_state",
      externalUserId: "wm_external_unlinked",
      userId: "helper_b",
      createTime: "1710002222"
    });
    const received = await postWecomEncrypted(buildEncryptedXml(eventXml), "1710002222", "nonce-d");
    assert.equal(received.statusCode, 200);
    assert.equal(received.body.status, "unlinked");

    const { events } = await listYmtyWecomEvents({});
    assert.equal(events.length, 1);
    assert.equal(events[0].status, "unlinked");

    const noAuth = await request({ method: "GET", url: "/api/admin/wecom/customer/events" });
    assert.ok([401, 403].includes(noAuth.statusCode));

    const token = await loginAndChangePassword();
    const adminEvents = await request({
      method: "GET",
      url: "/api/admin/wecom/customer/events",
      headers: authHeaders(token)
    });
    assert.equal(adminEvents.statusCode, 200);
    assert.equal(adminEvents.body.events[0].external_userid, undefined);
    assert.equal(adminEvents.body.events[0].external_userid_masked, "wm_e****nked");
    assert.equal(JSON.stringify(adminEvents.body).includes("wm_external_unlinked"), false);

    const linked = await jsonRequest("/api/admin/wecom/customer/events/evt-unlinked/link", {
      lead_id: "manual-lead-id"
    }, authHeaders(token));
    assert.equal(linked.statusCode, 404);
  } finally {
    restoreEnv();
    await resetAll();
  }
});

test("ymty admin page exposes wecom sync module without secret values", async () => {
  const fs = await import("node:fs/promises");
  const adminHtml = await fs.readFile(new URL("../../web-mvp/admin/ymty/index.html", import.meta.url), "utf8");
  const envExample = await fs.readFile(new URL("../.env.example", import.meta.url), "utf8");
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  [
    "企业微信同步",
    "企业微信自动同步未启用",
    "最近回调时间",
    "添加成功数量",
    "未关联事件数量",
    "标签同步成功数",
    "标签同步失败数",
    "手工关联",
    "重试同步",
    "/api/admin/wecom/customer/summary",
    "/api/admin/wecom/customer/events"
  ].forEach((text) => assert.ok(adminHtml.includes(text), `admin should include ${text}`));
  assert.ok(!adminHtml.includes("CorpSecret"));
  assert.ok(!adminHtml.includes("AES Key"));
  assert.ok(envExample.includes("WECOM_ENABLED=false"));
  assert.ok(envExample.includes("WECOM_CALLBACK_AES_KEY="));
  assert.ok(packageJson.scripts["test:ymty-wecom"]);
});

async function resetAll() {
  restoreEnv();
  process.env.NODE_ENV = "test";
  process.env.YMTY_ALLOW_MOCK_PAYMENT = "true";
  await resetYmtyForTests();
  await resetYmtyWecomForTests();
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
  await markYmtyMockPaySuccess({ orderId: created.order.order_id, token: created.order.order_token });
  return created.order;
}

function setupWecomEnv({ tagMock = "success" } = {}) {
  process.env.WECOM_ENABLED = "true";
  process.env.WECOM_CORP_ID = "corp_test_ymty";
  process.env.WECOM_CONTACT_SECRET = "local-contact-secret";
  process.env.WECOM_CALLBACK_TOKEN = "local-callback-token";
  process.env.WECOM_CALLBACK_AES_KEY = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
  process.env.WECOM_MOCK_TAG_SYNC = tagMock;
}

function setupAdminEnv() {
  process.env.YMTY_ADMIN_BOOTSTRAP_USERNAME = "admin";
  process.env.YMTY_ADMIN_BOOTSTRAP_PASSWORD = "bootstrap-pass-123";
  process.env.ADMIN_JWT_SECRET = "wecom-admin-secret";
  delete process.env.YMTY_ADMIN_TOKEN;
}

function restoreEnv() {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
  delete process.env.WECOM_MOCK_TAG_SYNC;
}

function buildEncryptedXml(messageXml, corpId = "corp_test_ymty") {
  const encrypted = encryptWecomXml(messageXml, corpId);
  return `<xml><Encrypt><![CDATA[${encrypted}]]></Encrypt></xml>`;
}

function encryptWecomXml(messageXml, corpId) {
  const key = Buffer.from(`${process.env.WECOM_CALLBACK_AES_KEY}=`, "base64");
  const random = Buffer.alloc(16, 7);
  const message = Buffer.from(messageXml);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(message.length, 0);
  const plain = Buffer.concat([random, length, message, Buffer.from(corpId)]);
  const blockSize = 32;
  const padLength = blockSize - (plain.length % blockSize || blockSize);
  const padding = Buffer.alloc(padLength, padLength);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(Buffer.concat([plain, padding])), cipher.final()]).toString("base64");
}

function customerEventXml({ changeType, eventKey, state, externalUserId, userId, createTime }) {
  return `<xml>
    <ToUserName><![CDATA[corp_test_ymty]]></ToUserName>
    <Event><![CDATA[change_external_contact]]></Event>
    <ChangeType><![CDATA[${changeType}]]></ChangeType>
    <UserID><![CDATA[${userId}]]></UserID>
    <ExternalUserID><![CDATA[${externalUserId}]]></ExternalUserID>
    <State><![CDATA[${state}]]></State>
    <EventKey><![CDATA[${eventKey}]]></EventKey>
    <CreateTime>${createTime}</CreateTime>
  </xml>`;
}

async function postWecomEncrypted(xml, timestamp, nonce) {
  const encrypted = xml.match(/<Encrypt><!\[CDATA\[(.+?)\]\]><\/Encrypt>/)?.[1] || "";
  const signature = signWecomCallback({
    token: process.env.WECOM_CALLBACK_TOKEN,
    timestamp,
    nonce,
    encrypted
  });
  return request({
    method: "POST",
    url: `/api/wecom/customer/callback?msg_signature=${signature}&timestamp=${timestamp}&nonce=${nonce}`,
    headers: { "content-type": "text/xml" },
    body: Buffer.from(xml)
  });
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
    this.chunks = [];
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = { ...this.headers, ...headers };
  }

  setHeader(key, value) {
    this.headers[key] = value;
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
    return {
      statusCode: this.statusCode,
      headers: this.headers,
      body
    };
  }
}
