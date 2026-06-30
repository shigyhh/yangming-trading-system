import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";

const paymentEnvKeys = [
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

const originalEnv = Object.fromEntries(paymentEnvKeys.map((key) => [key, process.env[key]]));

const { handleError } = await import("../src/lib/http.js");
const { route } = await import("../src/routes/router.js");
const {
  createYmtyLivecode,
  createYmtyOrder,
  getYmtyAfterpayEntrance,
  getYmtyOrderStatus,
  listYmtyCourseUsers,
  markYmtyMockPaySuccess,
  resetYmtyForTests,
  seedYmtyDefaults
} = await import("../src/services/ymtyCampaign.js");

test.after(() => restoreEnv());

test("wechat notify verifies signature, checks amount, and grants paid rights idempotently", async () => {
  const tempDir = await setupPaymentEnv();
  await resetYmtyForTests();
  await seedYmtyDefaults();

  try {
    const order = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel: "wechat_h5" });
    await createNotifyLivecode("wechat");

    const badSignature = await wechatNotify({
      payload: buildWechatPayload(order.order, { total: order.order.amount_cents }),
      signatureOverride: "bad-signature"
    });
    assert.equal(badSignature.statusCode, 401);
    assert.equal((await getYmtyOrderStatus({ orderId: order.order.order_id, token: order.order.order_token })).order.pay_status, "pending");

    const wrongPublicKeyId = await wechatNotify({
      payload: buildWechatPayload(order.order, { total: order.order.amount_cents }),
      serialOverride: "WRONG_PUBLIC_KEY_ID"
    });
    assert.equal(wrongPublicKeyId.statusCode, 401);
    assert.equal((await getYmtyOrderStatus({ orderId: order.order.order_id, token: order.order.order_token })).order.pay_status, "pending");

    const wrongAmount = await wechatNotify({
      payload: buildWechatPayload(order.order, { total: order.order.amount_cents + 1 })
    });
    assert.equal(wrongAmount.statusCode, 400);
    assert.equal((await getYmtyOrderStatus({ orderId: order.order.order_id, token: order.order.order_token })).order.pay_status, "pending");

    await assert.rejects(
      () => getYmtyAfterpayEntrance({
        orderId: order.order.order_id,
        token: order.order.order_token
      }),
      /支付完成后才可查看课程助教入口/
    );

    const ok = await wechatNotify({
      payload: buildWechatPayload(order.order, { total: order.order.amount_cents })
    });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.body.code, "SUCCESS");
    assert.equal((await getYmtyOrderStatus({ orderId: order.order.order_id, token: order.order.order_token })).order.pay_status, "paid");
    const firstUsers = await listYmtyCourseUsers();
    assert.equal(firstUsers.course_users.length, 1);

    const again = await wechatNotify({
      payload: buildWechatPayload(order.order, { total: order.order.amount_cents })
    });
    assert.equal(again.statusCode, 200);
    const secondUsers = await listYmtyCourseUsers();
    assert.equal(secondUsers.course_users.length, 1);

    const entrance = await getYmtyAfterpayEntrance({
      orderId: order.order.order_id,
      token: order.order.order_token
    });
    assert.equal(Boolean(entrance.livecode.qr_image || entrance.livecode.wecom_link), true);
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
    await rm(tempDir, { recursive: true, force: true });
    restoreEnv();
  }
});

test("alipay notify verifies signature, checks amount, and grants paid rights idempotently", async () => {
  const tempDir = await setupPaymentEnv();
  await resetYmtyForTests();
  await seedYmtyDefaults();

  try {
    const order = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel: "alipay_wap" });
    await createNotifyLivecode("alipay");

    const badSignature = await alipayNotify(buildAlipayParams(order.order, {
      total_amount: centsToYuan(order.order.amount_cents),
      signOverride: "bad-signature"
    }));
    assert.equal(badSignature.statusCode, 401);
    assert.equal((await getYmtyOrderStatus({ orderId: order.order.order_id, token: order.order.order_token })).order.pay_status, "pending");

    const wrongAmount = await alipayNotify(buildAlipayParams(order.order, {
      total_amount: centsToYuan(order.order.amount_cents + 1)
    }));
    assert.equal(wrongAmount.statusCode, 400);
    assert.equal((await getYmtyOrderStatus({ orderId: order.order.order_id, token: order.order.order_token })).order.pay_status, "pending");

    const ok = await alipayNotify(buildAlipayParams(order.order, {
      total_amount: centsToYuan(order.order.amount_cents)
    }));
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.body.raw, "success");
    assert.equal((await getYmtyOrderStatus({ orderId: order.order.order_id, token: order.order.order_token })).order.pay_status, "paid");
    const firstUsers = await listYmtyCourseUsers();
    assert.equal(firstUsers.course_users.length, 1);

    const again = await alipayNotify(buildAlipayParams(order.order, {
      total_amount: centsToYuan(order.order.amount_cents)
    }));
    assert.equal(again.statusCode, 200);
    const secondUsers = await listYmtyCourseUsers();
    assert.equal(secondUsers.course_users.length, 1);

    const entrance = await getYmtyAfterpayEntrance({
      orderId: order.order.order_id,
      token: order.order.order_token
    });
    assert.equal(Boolean(entrance.livecode.qr_image || entrance.livecode.wecom_link), true);
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
    await rm(tempDir, { recursive: true, force: true });
    restoreEnv();
  }
});

async function createNotifyLivecode(suffix) {
  await createYmtyLivecode({
    adminId: "notify-test-admin",
    patch: {
      code_key: `YMTY_NOTIFY_${suffix.toUpperCase()}`,
      name: `通知测试活码${suffix}`,
      qr_image: `/uploads/livecode/notify-${suffix}.png`,
      channels: ["*"],
      priority: 1,
      status: "active"
    }
  });
}

test("wechat jsapi reports oauth requirement when config is ready but openid is missing", async () => {
  const tempDir = await setupPaymentEnv();
  await resetYmtyForTests();
  await seedYmtyDefaults();

  try {
    const response = await jsonRequest("/api/pay/create", {
      product_code: "YMXX_JY_TY",
      pay_channel: "wechat_jsapi",
      success_url: "https://xxjyxt.com/hd/ymty/success.html"
    });
    assert.equal(response.statusCode, 428);
    assert.equal(response.body.ok, false);
    assert.equal(response.body.provider, "wechat");
    assert.equal(response.body.code, "OAUTH_REQUIRED");
    assert.match(response.body.message, /openid/);
    assert.match(response.body.oauth_url, /^\/api\/wechat\/oauth\/start/);
    assert.match(response.body.oauth_url, /return_url=%2Fhd%2Fymty%2Findex\.html/);
    assert.doesNotMatch(response.body.oauth_url, /success\.html/);
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
    await rm(tempDir, { recursive: true, force: true });
    restoreEnv();
  }
});

async function setupPaymentEnv() {
  const tempDir = await mkdtemp(join(tmpdir(), "ymty-pay-test-"));
  const wechatMerchantKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const wechatPlatformKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const alipayKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });

  const wechatPrivateKey = wechatMerchantKeys.privateKey.export({ type: "pkcs8", format: "pem" });
  const wechatPayPublicKey = wechatPlatformKeys.publicKey.export({ type: "spki", format: "pem" });
  const alipayPrivateKey = alipayKeys.privateKey.export({ type: "pkcs8", format: "pem" });
  const alipayPublicKey = alipayKeys.publicKey.export({ type: "spki", format: "pem" });

  const wechatPrivatePath = join(tempDir, "wechat-private.pem");
  const wechatPayPublicKeyPath = join(tempDir, "wechat-pay-public.pem");
  const alipayPrivatePath = join(tempDir, "alipay-private.pem");
  const alipayPublicPath = join(tempDir, "alipay-public.pem");
  await writeFile(wechatPrivatePath, wechatPrivateKey);
  await writeFile(wechatPayPublicKeyPath, wechatPayPublicKey);
  await writeFile(alipayPrivatePath, alipayPrivateKey);
  await writeFile(alipayPublicPath, alipayPublicKey);

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
  globalThis.__ymtyAlipayPrivateKey = alipayKeys.privateKey;
  return tempDir;
}

function restoreEnv() {
  for (const key of paymentEnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
  delete globalThis.__ymtyWechatPlatformPrivateKey;
  delete globalThis.__ymtyAlipayPrivateKey;
}

function buildWechatPayload(order, { total }) {
  return {
    appid: process.env.WECHAT_SERVICE_APP_ID,
    mchid: process.env.WECHAT_MCH_ID,
    out_trade_no: order.order_id,
    transaction_id: "wx-test-transaction",
    trade_state: "SUCCESS",
    amount: {
      total,
      payer_total: total,
      currency: "CNY"
    }
  };
}

async function wechatNotify({ payload, signatureOverride = "", serialOverride = "" }) {
  const bodyText = JSON.stringify({
    id: crypto.randomUUID(),
    create_time: new Date().toISOString(),
    event_type: "TRANSACTION.SUCCESS",
    resource_type: "encrypt-resource",
    resource: encryptWechatResource(payload)
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(8).toString("hex");
  const message = `${timestamp}\n${nonce}\n${bodyText}\n`;
  const signature = signatureOverride || crypto
    .createSign("RSA-SHA256")
    .update(message)
    .sign(globalThis.__ymtyWechatPlatformPrivateKey, "base64");

  return request({
    method: "POST",
    url: "/api/pay/wechat/notify",
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(bodyText)),
      "wechatpay-timestamp": timestamp,
      "wechatpay-nonce": nonce,
      "wechatpay-serial": serialOverride || process.env.WECHAT_PAY_PUBLIC_KEY_ID,
      "wechatpay-signature": signature
    },
    body: Buffer.from(bodyText)
  });
}

function encryptWechatResource(payload) {
  const key = Buffer.from(process.env.WECHAT_API_V3_KEY, "utf8");
  const nonce = crypto.randomBytes(6).toString("hex");
  const associatedData = "transaction";
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

function buildAlipayParams(order, { total_amount, signOverride = "" }) {
  const params = {
    app_id: process.env.ALIPAY_APP_ID,
    trade_no: "ali-test-transaction",
    out_trade_no: order.order_id,
    total_amount,
    trade_status: "TRADE_SUCCESS",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: "2026-06-12 20:00:00",
    version: "1.0"
  };
  params.sign = signOverride || crypto
    .createSign("RSA-SHA256")
    .update(canonicalAlipayString(params))
    .sign(globalThis.__ymtyAlipayPrivateKey, "base64");
  return params;
}

async function alipayNotify(params) {
  return request({
    method: "POST",
    url: "/api/pay/alipay/notify",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: Buffer.from(new URLSearchParams(params).toString())
  });
}

async function jsonRequest(url, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  return request({
    method: "POST",
    url,
    headers: {
      "content-type": "application/json",
      "content-length": String(body.length)
    },
    body
  });
}

function centsToYuan(cents) {
  return (Number(cents) / 100).toFixed(2);
}

function canonicalAlipayString(params) {
  return Object.keys(params)
    .filter((key) => key !== "sign" && key !== "sign_type" && params[key] !== undefined && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
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
