import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
  listYmtyLivecodeAssignments,
  listYmtyLivecodes,
  markYmtyMockPaySuccess,
  resetYmtyForTests,
  seedYmtyDefaults,
  toggleYmtyLivecodeFull,
  toggleYmtyLivecodeStatus,
  switchYmtyAfterpayLivecode,
  updateYmtyLivecodeByKey
} = await import("../src/services/ymtyCampaign.js");

test.after(() => restoreEnv());

test("ymty livecode pool keeps unpaid locked, assigns paid orders idempotently and concurrently", async () => {
  await resetYmtyForTests();
  await seedYmtyDefaults();

  try {
    const unpaid = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel: "mock", channel: "douyin" });
    await assert.rejects(
      () => getYmtyAfterpayEntrance({ orderId: unpaid.order.order_id, token: unpaid.order.order_token }),
      /支付完成后才可查看课程助教入口/
    );
    assert.equal((await listYmtyLivecodeAssignments()).assignments.length, 0);

    await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_DOUYIN_A",
        name: "抖音专属活码A",
        contact_type: "personal_wechat",
        qr_image: "/uploads/livecode/douyin-a.png",
        channels: ["douyin"],
        capacity_limit: 10,
        priority: 10,
        status: "active"
      }
    });

    const paid = await paidOrder("douyin");
    const results = await Promise.all(Array.from({ length: 8 }, () => getYmtyAfterpayEntrance({
      orderId: paid.order_id,
      token: paid.order_token
    })));
    assert.deepEqual(new Set(results.map((item) => item.livecode.code_key)), new Set(["YMTY_DOUYIN_A"]));
    assert.equal((await listYmtyLivecodeAssignments()).assignments.filter((item) => item.order_id === paid.order_id).length, 1);

    const repeat = await getYmtyAfterpayEntrance({ orderId: paid.order_id, token: paid.order_token });
    assert.equal(repeat.livecode.code_key, "YMTY_DOUYIN_A");
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
  }
});

test("ymty livecode pool selects channel match, fallback, capacity switch, manual full and inactive correctly", async () => {
  await resetYmtyForTests();
  await seedYmtyDefaults();

  try {
    await updateYmtyLivecodeByKey({
      adminId: "pool-test-admin",
      codeKey: "YMXX_YMTY_DEFAULT",
      patch: { qr_image: "/uploads/livecode/default-fallback.png", status: "active" }
    });
    await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_DOUYIN_CAP1",
        name: "抖音容量1",
        contact_type: "personal_wechat",
        qr_image: "/uploads/livecode/douyin-cap1.png",
        channels: "douyin",
        capacity_limit: 1,
        priority: 5,
        status: "active"
      }
    });
    await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_DOUYIN_CAP2",
        name: "抖音容量2",
        contact_type: "personal_wechat",
        qr_image: "/uploads/livecode/douyin-cap2.png",
        channels: ["douyin"],
        capacity_limit: 0,
        priority: 20,
        status: "active"
      }
    });
    await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_MANUAL_FULL",
        name: "人工满员",
        contact_type: "personal_wechat",
        qr_image: "/uploads/livecode/full.png",
        channels: ["wechat_group"],
        manual_full: true,
        priority: 1,
        status: "active"
      }
    });
    await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_INACTIVE",
        name: "停用活码",
        contact_type: "personal_wechat",
        qr_image: "/uploads/livecode/inactive.png",
        channels: ["wechat_group"],
        priority: 2,
        status: "inactive"
      }
    });

    const firstDouyin = await paidEntrance("douyin");
    const secondDouyin = await paidEntrance("douyin");
    const wechatGroup = await paidEntrance("wechat_group");
    const noSpecific = await paidEntrance("xiaohongshu");

    assert.equal(firstDouyin.livecode.code_key, "YMTY_DOUYIN_CAP1");
    assert.equal(secondDouyin.livecode.code_key, "YMTY_DOUYIN_CAP2");
    assert.equal(wechatGroup.livecode.code_key, "YMXX_YMTY_DEFAULT");
    assert.equal(noSpecific.livecode.code_key, "YMXX_YMTY_DEFAULT");
    assert.notEqual(wechatGroup.livecode.code_key, "YMTY_MANUAL_FULL");
    assert.notEqual(wechatGroup.livecode.code_key, "YMTY_INACTIVE");

    await toggleYmtyLivecodeFull({
      adminId: "pool-test-admin",
      codeKey: "YMTY_DOUYIN_CAP2",
      manualFull: true
    });
    const afterToggle = await paidEntrance("douyin");
    assert.equal(afterToggle.livecode.code_key, "YMXX_YMTY_DEFAULT");

    await updateYmtyLivecodeByKey({
      adminId: "pool-test-admin",
      codeKey: "YMXX_YMTY_DEFAULT",
      patch: { manual_full: true }
    });
    const unavailable = await paidOrder("no_capacity");
    const unavailableResponse = await request({
      method: "GET",
      url: `/api/afterpay/entrance?order_id=${encodeURIComponent(unavailable.order_id)}&token=${encodeURIComponent(unavailable.order_token)}`
    });
    assert.equal(unavailableResponse.statusCode, 503);
    assert.equal(unavailableResponse.body.code, "NO_AVAILABLE_LIVECODE");
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
  }
});

test("ymty livecode pool supports personal wechat, wecom, public privacy, legacy default normalization and admin protection", async () => {
  await resetYmtyForTests();
  await seedYmtyDefaults();
  setupAdminEnv();

  try {
    const defaultPool = await listYmtyLivecodes();
    const legacy = defaultPool.livecodes.find((item) => item.code_key === "YMXX_YMTY_DEFAULT");
    assert.equal(legacy.contact_type, "personal_wechat");
    assert.deepEqual(legacy.channels, ["*"]);
    assert.equal(legacy.capacity_limit, 0);
    assert.equal(legacy.manual_full, false);
    assert.equal(legacy.priority, 100);
    assert.equal(legacy.is_fallback, true);
    assert.equal(legacy.wecom_link, "");
    assert.equal(legacy.qr_image, "");
    assert.equal(legacy.status, "inactive");
    assert.ok(legacy.wecom_state);

    await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_PERSONAL",
        name: "个人微信活码",
        contact_type: "personal_wechat",
        qr_image: "/uploads/livecode/personal.png",
        wecom_link: "",
        channels: ["personal"],
        status: "active"
      }
    });
    const minimal = await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_MINIMAL"
      }
    });
    assert.equal(minimal.livecode.wecom_link, "");
    assert.equal(minimal.livecode.qr_image, "");
    await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_WECOM",
        name: "企业微信活码",
        contact_type: "wecom",
        qr_image: "/uploads/livecode/wecom.png",
        wecom_link: "https://work.weixin.qq.com/ca/pool",
        channels: ["wecom"],
        status: "active"
      }
    });

    assert.equal((await paidEntrance("personal")).livecode.wecom_link, "");
    const wecomEntrance = await paidEntrance("wecom");
    assert.equal(wecomEntrance.livecode.qr_image, "/uploads/livecode/wecom.png");
    assert.equal(wecomEntrance.livecode.wecom_link, "https://work.weixin.qq.com/ca/pool");

    const publicCampaign = await getYmtyPublicCampaign();
    assert.equal(JSON.stringify(publicCampaign).includes("wecom_link"), false);
    assert.equal(JSON.stringify(publicCampaign).includes("qr_image"), false);
    assert.equal(JSON.stringify(publicCampaign).includes("wecom_state"), false);
    assert.equal(JSON.stringify(publicCampaign).includes("capacity_limit"), false);
    assert.equal(JSON.stringify(publicCampaign).includes("assigned_count"), false);
    assert.equal(JSON.stringify(publicCampaign).includes("livecodes"), false);
    assert.equal(JSON.stringify(publicCampaign).includes("assignments"), false);

    const noAuthRead = await request({ method: "GET", url: "/api/admin/livecodes" });
    assert.ok([401, 403].includes(noAuthRead.statusCode));
    const noAuthWrite = await jsonRequest("/api/admin/livecodes", { code_key: "NO_AUTH" });
    assert.ok([401, 403].includes(noAuthWrite.statusCode));

    const token = await loginAndChangePassword();
    const adminRead = await request({ method: "GET", url: "/api/admin/livecodes", headers: authHeaders(token) });
    assert.equal(adminRead.statusCode, 200);
    assert.ok(Array.isArray(adminRead.body.livecodes));
    assert.ok(adminRead.body.livecodes.some((item) => item.assigned_count >= 0));
    assert.equal(adminRead.body.livecodes.some((item) => item.wecom_state), true);

    const adminAssignments = await request({ method: "GET", url: "/api/admin/livecode-assignments", headers: authHeaders(token) });
    assert.equal(adminAssignments.statusCode, 200);
    assert.ok(Array.isArray(adminAssignments.body.assignments));

    await updateYmtyLivecodeByKey({
      adminId: "pool-test-admin",
      codeKey: "YMTY_PERSONAL",
      patch: { code_key: "SHOULD_NOT_CHANGE", name: "个人微信活码-更新" }
    });
    const updated = await listYmtyLivecodes();
    assert.ok(updated.livecodes.some((item) => item.code_key === "YMTY_PERSONAL" && item.name === "个人微信活码-更新"));
    assert.equal(updated.livecodes.some((item) => item.code_key === "SHOULD_NOT_CHANGE"), false);

    const audit = await getYmtyAuditLogs();
    assert.ok(audit.audit_logs.some((item) => item.action === "create_livecode" && item.target_id === "YMTY_PERSONAL"));
    assert.ok(audit.audit_logs.some((item) => item.action === "update_livecode" && item.target_id === "YMTY_PERSONAL"));

    const legacyUpdate = await jsonRequest("/api/admin/livecode", {
      name: "默认活码旧接口更新",
      qr_image: "/uploads/livecode/default-updated.png"
    }, authHeaders(token));
    assert.equal(legacyUpdate.statusCode, 200);
    assert.equal(legacyUpdate.body.livecode.code_key, "YMXX_YMTY_DEFAULT");
    assert.equal(legacyUpdate.body.livecode.name, "默认活码旧接口更新");
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
  }
});

test("ymty livecode pool rotates fallback codes fairly and stores assignment schema", async () => {
  await resetYmtyForTests();
  await seedYmtyDefaults();

  try {
    await updateYmtyLivecodeByKey({
      adminId: "pool-test-admin",
      codeKey: "YMXX_YMTY_DEFAULT",
      patch: { manual_full: true }
    });
    for (const code of ["A", "B", "C"]) {
      await createYmtyLivecode({
        adminId: "pool-test-admin",
        patch: {
          code_key: `YMTY_ROTATE_${code}`,
          name: `轮询活码${code}`,
          contact_type: "personal_wechat",
          qr_image: `/uploads/livecode/${code}.png`,
          channels: ["*"],
          capacity_limit: 0,
          priority: 10,
          status: "active"
        }
      });
    }

    const assigned = [];
    for (let index = 0; index < 4; index += 1) {
      assigned.push((await paidEntrance("unknown")).livecode.code_key);
    }
    assert.deepEqual(assigned, ["YMTY_ROTATE_A", "YMTY_ROTATE_B", "YMTY_ROTATE_C", "YMTY_ROTATE_A"]);

    const assignments = (await listYmtyLivecodeAssignments()).assignments;
    assert.equal(assignments.filter((item) => item.status === "active").length, 4);
    assert.ok(assignments.every((item) => item.assignment_id));
    assert.ok(assignments.every((item) => item.campaign !== undefined && item.creative !== undefined));
    assert.ok(assignments.every((item) => Number.isInteger(item.switch_count)));
    const pool = await listYmtyLivecodes();
    const rotateA = pool.livecodes.find((item) => item.code_key === "YMTY_ROTATE_A");
    assert.equal(rotateA.assigned_count, 2);
    assert.ok(rotateA.last_assigned_at);
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
  }
});

test("ymty livecode pool supports paid user switch with limit and no alternative error", async () => {
  await resetYmtyForTests();
  await seedYmtyDefaults();

  try {
    await updateYmtyLivecodeByKey({
      adminId: "pool-test-admin",
      codeKey: "YMXX_YMTY_DEFAULT",
      patch: { manual_full: true }
    });
    for (const code of ["A", "B", "C", "D"]) {
      await createYmtyLivecode({
        adminId: "pool-test-admin",
        patch: {
          code_key: `YMTY_SWITCH_${code}`,
          name: `换码活码${code}`,
          contact_type: "personal_wechat",
          qr_image: `/uploads/livecode/switch-${code}.png`,
          channels: ["switch"],
          priority: 10,
          status: "active"
        }
      });
    }

    const unpaid = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel: "mock", channel: "switch" });
    await assert.rejects(
      () => switchYmtyAfterpayLivecode({ orderId: unpaid.order.order_id, token: unpaid.order.order_token, reason: "user_reported_failure" }),
      /支付完成后才可查看课程助教入口/
    );

    const order = await paidOrder("switch");
    const first = await getYmtyAfterpayEntrance({ orderId: order.order_id, token: order.order_token });
    assert.equal(first.livecode.code_key, "YMTY_SWITCH_A");

    const second = await switchYmtyAfterpayLivecode({ orderId: order.order_id, token: order.order_token, reason: "user_reported_failure" });
    const third = await switchYmtyAfterpayLivecode({ orderId: order.order_id, token: order.order_token, reason: "user_reported_failure" });
    const fourth = await switchYmtyAfterpayLivecode({ orderId: order.order_id, token: order.order_token, reason: "user_reported_failure" });
    assert.deepEqual(
      [second.livecode.code_key, third.livecode.code_key, fourth.livecode.code_key],
      ["YMTY_SWITCH_B", "YMTY_SWITCH_C", "YMTY_SWITCH_D"]
    );

    await assert.rejects(
      () => switchYmtyAfterpayLivecode({ orderId: order.order_id, token: order.order_token, reason: "user_reported_failure" }),
      (error) => error.code === "SWITCH_LIMIT_EXCEEDED"
    );

    const fixed = await getYmtyAfterpayEntrance({ orderId: order.order_id, token: order.order_token });
    assert.equal(fixed.livecode.code_key, "YMTY_SWITCH_D");

    const assignments = (await listYmtyLivecodeAssignments()).assignments.filter((item) => item.order_id === order.order_id);
    assert.equal(assignments.filter((item) => item.status === "active").length, 1);
    assert.equal(assignments.filter((item) => item.status === "superseded").length, 3);
    assert.equal(assignments.find((item) => item.status === "active").switch_count, 3);
    assert.ok(assignments.some((item) => item.switch_reason === "user_reported_failure"));

    const audit = await getYmtyAuditLogs();
    assert.ok(audit.audit_logs.some((item) => item.action === "qr_switch_request" && item.target_id === order.order_id));
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
  }
});

test("ymty livecode pool handles inactive fixed code, empty code exclusion, no alternative and toggle status route", async () => {
  await resetYmtyForTests();
  await seedYmtyDefaults();
  setupAdminEnv();

  try {
    await updateYmtyLivecodeByKey({
      adminId: "pool-test-admin",
      codeKey: "YMXX_YMTY_DEFAULT",
      patch: { manual_full: true }
    });
    await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_EMPTY",
        name: "空配置活码",
        channels: ["auto"],
        priority: 1,
        status: "active",
        qr_image: "",
        wecom_link: ""
      }
    });
    await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_AUTO_A",
        name: "自动活码A",
        qr_image: "/uploads/livecode/auto-a.png",
        channels: ["auto"],
        priority: 10,
        status: "active"
      }
    });
    await createYmtyLivecode({
      adminId: "pool-test-admin",
      patch: {
        code_key: "YMTY_AUTO_B",
        name: "自动活码B",
        qr_image: "/uploads/livecode/auto-b.png",
        channels: ["auto"],
        priority: 10,
        status: "active"
      }
    });

    const autoOrder = await paidOrder("auto");
    const first = await getYmtyAfterpayEntrance({
      orderId: autoOrder.order_id,
      token: autoOrder.order_token
    });
    assert.equal(first.livecode.code_key, "YMTY_AUTO_A");
    await toggleYmtyLivecodeStatus({
      adminId: "pool-test-admin",
      codeKey: "YMTY_AUTO_A",
      status: "inactive"
    });
    const switched = await getYmtyAfterpayEntrance({
      orderId: autoOrder.order_id,
      token: autoOrder.order_token
    });
    assert.equal(switched.livecode.code_key, "YMTY_AUTO_B");

    await toggleYmtyLivecodeStatus({
      adminId: "pool-test-admin",
      codeKey: "YMTY_AUTO_B",
      status: "inactive"
    });
    const noAlternative = await paidOrder("auto");
    await assert.rejects(
      () => switchYmtyAfterpayLivecode({
        orderId: noAlternative.order_id,
        token: noAlternative.order_token,
        reason: "user_reported_failure"
      }),
      (error) => error.code === "NO_ALTERNATIVE_LIVECODE"
    );

    const token = await loginAndChangePassword();
    const routeToggle = await jsonRequest("/api/admin/livecodes/YMTY_AUTO_B/toggle-status", {
      status: "active"
    }, authHeaders(token));
    assert.equal(routeToggle.statusCode, 200);
    assert.equal(routeToggle.body.livecode.status, "active");
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
  }
});

test("ymty admin livecode pool page keeps Chinese labels while preserving field names", () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const html = readFileSync(resolve(__dirname, "../../web-mvp/admin/ymty/index.html"), "utf8");

  [
    "活码池管理",
    "新增活码",
    "已分配数量 / 容量",
    "产品编码",
    "活码编码",
    "承接类型",
    "获客助手链接",
    "二维码图片",
    "适用渠道",
    "容量上限",
    "人工标记满员",
    "分配优先级",
    "默认兜底",
    "支付后自动跳转",
    "跳转延迟（毫秒）",
    "加微备注",
    "按钮文案",
    "客服说明"
  ].forEach((text) => assert.ok(html.includes(text), `Expected admin page to include ${text}`));

  [
    'name="product_code" readonly',
    'name="code_key" readonly',
    'name="channels"',
    'name="capacity_limit"',
    'name="manual_full"',
    'name="priority"',
    'name="is_fallback"',
    'value="personal_wechat"',
    'value="wecom"',
    'value="active"',
    'value="inactive"'
  ].forEach((text) => assert.ok(html.includes(text), `Expected admin field contract ${text}`));
});

async function paidOrder(channel) {
  const created = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel: "mock", channel });
  await markYmtyMockPaySuccess({
    orderId: created.order.order_id,
    token: created.order.order_token,
    transactionId: `mock-${channel}-${created.order.order_id}`
  });
  return created.order;
}

async function paidEntrance(channel) {
  const order = await paidOrder(channel);
  return getYmtyAfterpayEntrance({ orderId: order.order_id, token: order.order_token });
}

function setupAdminEnv() {
  process.env.YMTY_ADMIN_BOOTSTRAP_USERNAME = "admin";
  process.env.YMTY_ADMIN_BOOTSTRAP_PASSWORD = "bootstrap-pass-123";
  process.env.ADMIN_JWT_SECRET = "test-admin-jwt-secret";
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
    this.corsOrigin = "";
    this.corsRejected = false;
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = headers;
  }

  end(payload = "") {
    this.payload = Buffer.isBuffer(payload) ? payload.toString("utf8") : String(payload || "");
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
