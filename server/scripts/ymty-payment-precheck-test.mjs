import assert from "node:assert/strict";
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
  "WECHAT_SP_MCH_ID",
  "WECHAT_SUB_MCH_ID",
  "WECHAT_SP_APP_ID",
  "WECHAT_SUB_APP_ID",
  "WECHAT_API_V3_KEY",
  "WECHAT_CERT_SERIAL_NO",
  "WECHAT_PRIVATE_KEY_PATH",
  "WECHAT_PLATFORM_CERT_PATH",
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
paymentEnvKeys.forEach((key) => delete process.env[key]);

const { handleError } = await import("../src/lib/http.js");
const { route } = await import("../src/routes/router.js");
const {
  checkAlipayConfig,
  checkWechatConfig
} = await import("../src/services/paymentConfig.js");
const {
  createYmtyOrder,
  getYmtyAfterpayEntrance,
  markYmtyMockPaySuccess,
  resetYmtyForTests,
  seedYmtyDefaults
} = await import("../src/services/ymtyCampaign.js");

test.after(() => {
  for (const key of paymentEnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

test("real payment config precheck reports missing keys without leaking secret values", () => {
  const wechat = checkWechatConfig({});
  assert.equal(wechat.ok, false);
  assert.ok(wechat.missing.includes("missing WECHAT_MCH_ID"));
  assert.ok(wechat.missing.includes("missing WECHAT_API_V3_KEY"));

  const alipay = checkAlipayConfig({});
  assert.equal(alipay.ok, false);
  assert.ok(alipay.missing.includes("missing ALIPAY_APP_ID"));
  assert.ok(alipay.missing.includes("missing ALIPAY_PRIVATE_KEY_PATH"));

  const secretEnv = {
    WECHAT_MCH_ID: "sensitive-wechat-mch",
    WECHAT_PAY_MODE: "direct",
    WECHAT_SERVICE_APP_ID: "sensitive-service-app",
    WECHAT_SERVICE_APP_SECRET: "sensitive-service-secret",
    WECHAT_MINI_APP_ID: "sensitive-mini-app",
    WECHAT_VERIFY_MODE: "public_key",
    WECHAT_PAY_PUBLIC_KEY_ID: "sensitive-pay-public-key-id",
    WECHAT_PAY_PUBLIC_KEY_PATH: "sensitive-pay-public-key-path",
    WECHAT_API_V3_KEY: "sensitive-api-v3-key",
    WECHAT_CERT_SERIAL_NO: "sensitive-cert-serial",
    WECHAT_PRIVATE_KEY_PATH: "sensitive-private-key-path",
    WECHAT_NOTIFY_URL: "sensitive-notify-url",
    WECHAT_H5_SCENE_INFO: "sensitive-scene-info",
    WECHAT_JSAPI_OAUTH_REDIRECT_URL: "sensitive-oauth-url",
    ALIPAY_APP_ID: "sensitive-alipay-app",
    ALIPAY_PRIVATE_KEY_PATH: "sensitive-alipay-private-path",
    ALIPAY_PUBLIC_KEY_PATH: "sensitive-alipay-public-path",
    ALIPAY_GATEWAY_URL: "sensitive-alipay-gateway",
    ALIPAY_NOTIFY_URL: "sensitive-alipay-notify",
    ALIPAY_RETURN_URL: "sensitive-alipay-return"
  };
  const summary = JSON.stringify({
    wechat: checkWechatConfig(secretEnv),
    alipay: checkAlipayConfig(secretEnv)
  });
  Object.entries(secretEnv)
    .filter(([key]) => !["WECHAT_PAY_MODE", "WECHAT_VERIFY_MODE"].includes(key))
    .map(([, value]) => value)
    .forEach((value) => {
    assert.equal(summary.includes(value), false, `config summary leaked ${value}`);
  });
});

test("pay create keeps mock enabled but blocks real channels when configs are missing", async () => {
  await resetYmtyForTests();
  await seedYmtyDefaults();

  try {
    const mock = await jsonRequest("/api/pay/create", {
      product_code: "YMXX_JY_TY",
      pay_channel: "mock",
      amount_cents: 1
    });
    assert.equal(mock.statusCode, 200);
    assert.equal(mock.body.ok, true);
    assert.equal(mock.body.order.amount_cents, 168);
    assert.equal(mock.body.order.pay_status, "pending");

    const wechatJsapi = await jsonRequest("/api/pay/create", {
      product_code: "YMXX_JY_TY",
      pay_channel: "wechat_jsapi"
    });
    assert.equal(wechatJsapi.statusCode, 503);
    assert.equal(wechatJsapi.body.code, 503);
    assert.equal(wechatJsapi.body.message, "微信支付配置未完成");

    const wechatH5 = await jsonRequest("/api/pay/create", {
      product_code: "YMXX_JY_TY",
      pay_channel: "wechat_h5"
    });
    assert.equal(wechatH5.statusCode, 503);
    assert.equal(wechatH5.body.code, 503);
    assert.equal(wechatH5.body.message, "微信支付配置未完成");

    const alipayWap = await jsonRequest("/api/pay/create", {
      product_code: "YMXX_JY_TY",
      pay_channel: "alipay_wap"
    });
    assert.equal(alipayWap.statusCode, 503);
    assert.equal(alipayWap.body.code, 503);
    assert.equal(alipayWap.body.message, "支付宝支付配置未完成");

    const order = await createYmtyOrder({ productCode: "YMXX_JY_TY", payChannel: "mock" });
    await assert.rejects(
      () => getYmtyAfterpayEntrance({
        orderId: order.order.order_id,
        token: order.order.order_token
      }),
      /支付完成后才可查看课程助教入口/
    );

    await markYmtyMockPaySuccess({
      orderId: order.order.order_id,
      token: order.order.order_token,
      transactionId: "precheck-paid"
    });
    const entrance = await getYmtyAfterpayEntrance({
      orderId: order.order.order_id,
      token: order.order.order_token
    });
    assert.equal(entrance.livecode.qr_image, "/assets/wecom-livecode-placeholder.svg");
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
  }
});

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
