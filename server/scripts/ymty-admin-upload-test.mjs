import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import test from "node:test";

process.env.YMTY_ADMIN_TOKEN = "test-admin-token";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const uploadRoot = resolve(repoRoot, "web-mvp/uploads/livecode");

const { handleError } = await import("../src/lib/http.js");
const { route } = await import("../src/routes/router.js");
const {
  createYmtyOrder,
  getYmtyAfterpayEntrance,
  getYmtyAuditLogs,
  getYmtyAdminCampaign,
  markYmtyMockPaySuccess,
  resetYmtyForTests,
  seedYmtyDefaults
} = await import("../src/services/ymtyCampaign.js");

const adminHeaders = {
  Authorization: "Bearer test-admin-token",
  "x-admin-id": "upload-test-admin"
};

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const jpgBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const webpBytes = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.from("VP8 ")]);

test("ymty admin upload requires token and accepts only safe livecode images", async () => {
  await resetYmtyForTests();
  await seedYmtyDefaults();
  const uploadedUrls = [];

  try {
    const noToken = await uploadFile({ filename: "qr.png", contentType: "image/png", bytes: pngBytes });
    assert.ok([401, 403].includes(noToken.statusCode));

    const png = await uploadFile({ filename: "user-original.png", contentType: "image/png", bytes: pngBytes, headers: adminHeaders });
    assert.equal(png.statusCode, 200);
    assert.equal(png.body.code, 0);
    assert.match(png.body.data.url, /^\/uploads\/livecode\/[a-f0-9-]+\.png$/);
    assert.equal(png.body.data.url.includes("user-original"), false);
    uploadedUrls.push(png.body.data.url);
    assert.equal(existsSync(resolve(repoRoot, "web-mvp", `.${png.body.data.url}`)), true);

    const jpg = await uploadFile({ filename: "qr.jpeg", contentType: "image/jpeg", bytes: jpgBytes, headers: adminHeaders });
    assert.equal(jpg.statusCode, 200);
    assert.match(jpg.body.data.url, /^\/uploads\/livecode\/[a-f0-9-]+\.jpg$/);
    uploadedUrls.push(jpg.body.data.url);

    const webp = await uploadFile({ filename: "qr.webp", contentType: "image/webp", bytes: webpBytes, headers: adminHeaders });
    assert.equal(webp.statusCode, 200);
    assert.match(webp.body.data.url, /^\/uploads\/livecode\/[a-f0-9-]+\.webp$/);
    uploadedUrls.push(webp.body.data.url);

    for (const unsafe of [
      { filename: "x.js", contentType: "text/javascript", bytes: Buffer.from("alert(1)") },
      { filename: "x.html", contentType: "text/html", bytes: Buffer.from("<html></html>") },
      { filename: "x.svg", contentType: "image/svg+xml", bytes: Buffer.from("<svg></svg>") }
    ]) {
      const rejected = await uploadFile({ ...unsafe, headers: adminHeaders });
      assert.equal(rejected.statusCode, 400);
      assert.match(rejected.body.message, /仅支持 jpg、jpeg、png、webp 图片/);
    }

    const tooLarge = await uploadFile({
      filename: "too-large.png",
      contentType: "image/png",
      bytes: Buffer.concat([pngBytes, Buffer.alloc(2 * 1024 * 1024 + 1)]),
      headers: adminHeaders
    });
    assert.equal(tooLarge.statusCode, 413);
    assert.match(tooLarge.body.message, /2MB/);

    const saveLivecode = await jsonRequest("POST", "/api/admin/livecode", {
      code_key: "YMXX_YMTY_DEFAULT",
      qr_image: png.body.data.url,
      wecom_link: "https://work.weixin.qq.com/ca/mock-upload",
      auto_redirect_after_paid: false,
      redirect_delay_ms: 600,
      remark: "知行 + 手机号后4位",
      button_text: "添加课程助教微信",
      service_text: "客服方式：支付后添加课程助教微信"
    }, adminHeaders);
    assert.equal(saveLivecode.statusCode, 200);
    assert.equal(saveLivecode.body.livecode.qr_image, png.body.data.url);

    const adminCampaign = await getYmtyAdminCampaign();
    assert.equal(adminCampaign.livecode.qr_image, png.body.data.url);

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
      transactionId: "upload-test-paid"
    });
    const entrance = await getYmtyAfterpayEntrance({
      orderId: order.order.order_id,
      token: order.order.order_token
    });
    assert.equal(entrance.livecode.qr_image, png.body.data.url);

    const audit = await getYmtyAuditLogs();
    assert.ok(audit.audit_logs.some((item) => item.action === "update_livecode" && item.after_json?.qr_image === png.body.data.url));
  } finally {
    await Promise.all(uploadedUrls.map((url) => rm(resolve(repoRoot, "web-mvp", `.${url}`), { force: true })));
    await rm(uploadRoot, { recursive: true, force: true });
    await resetYmtyForTests();
    await seedYmtyDefaults();
  }
});

async function uploadFile({ filename, contentType, bytes, headers = {} }) {
  const boundary = `ymty-test-${Math.random().toString(16).slice(2)}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`),
    Buffer.from(`Content-Type: ${contentType}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  return request({
    method: "POST",
    url: "/api/admin/upload",
    headers: {
      ...headers,
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "content-length": String(body.length)
    },
    body
  });
}

async function jsonRequest(method, url, payload, headers = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  return request({
    method,
    url,
    headers: {
      ...headers,
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
    ...lowercaseHeaders(headers)
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

function lowercaseHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
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
