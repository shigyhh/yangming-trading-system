import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

const authEnvKeys = [
  "YMTY_ADMIN_BOOTSTRAP_USERNAME",
  "YMTY_ADMIN_BOOTSTRAP_PASSWORD",
  "ADMIN_JWT_SECRET",
  "YMTY_ADMIN_TOKEN"
];

const originalEnv = Object.fromEntries(authEnvKeys.map((key) => [key, process.env[key]]));

const { handleError } = await import("../src/lib/http.js");
const { route } = await import("../src/routes/router.js");
const {
  resetYmtyForTests,
  seedYmtyDefaults
} = await import("../src/services/ymtyCampaign.js");

test.after(() => restoreEnv());

test("ymty admin login forces bootstrap password change and logout invalidates token", async () => {
  await resetYmtyForTests();
  process.env.YMTY_ADMIN_BOOTSTRAP_USERNAME = "admin";
  process.env.YMTY_ADMIN_BOOTSTRAP_PASSWORD = "bootstrap-pass-123";
  process.env.ADMIN_JWT_SECRET = "test-admin-jwt-secret";
  delete process.env.YMTY_ADMIN_TOKEN;

  try {
    await seedYmtyDefaults();

    const login = await jsonRequest("/api/admin/login", {
      username: "admin",
      password: "bootstrap-pass-123"
    });
    assert.equal(login.statusCode, 200);
    assert.equal(login.body.ok, true);
    assert.equal(login.body.user.username, "admin");
    assert.equal(login.body.user.must_change_password, true);
    assert.equal(typeof login.body.token, "string");
    assert.ok(login.body.token.length > 20);

    const beforeChange = await request({
      method: "GET",
      url: "/api/admin/campaign/ymty",
      headers: authHeaders(login.body.token)
    });
    assert.equal(beforeChange.statusCode, 403);
    assert.match(beforeChange.body.error || beforeChange.body.message, /修改初始密码/);

    const me = await request({
      method: "GET",
      url: "/api/admin/me",
      headers: authHeaders(login.body.token)
    });
    assert.equal(me.statusCode, 200);
    assert.equal(me.body.user.username, "admin");
    assert.equal(me.body.user.must_change_password, true);
    assert.equal(JSON.stringify(me.body).includes("bootstrap-pass-123"), false);
    assert.equal(JSON.stringify(me.body).includes("password_hash"), false);

    const changed = await jsonRequest("/api/admin/change-password", {
      old_password: "bootstrap-pass-123",
      new_password: "changed-pass-456"
    }, authHeaders(login.body.token));
    assert.equal(changed.statusCode, 200);
    assert.equal(changed.body.ok, true);
    assert.equal(changed.body.user.must_change_password, false);
    assert.equal(typeof changed.body.token, "string");
    assert.notEqual(changed.body.token, login.body.token);

    const campaign = await request({
      method: "GET",
      url: "/api/admin/campaign/ymty",
      headers: authHeaders(changed.body.token)
    });
    assert.equal(campaign.statusCode, 200);
    assert.equal(campaign.body.ok, true);
    assert.equal(campaign.body.product.product_code, "YMXX_JY_TY");

    const oldPasswordLogin = await jsonRequest("/api/admin/login", {
      username: "admin",
      password: "bootstrap-pass-123"
    });
    assert.equal(oldPasswordLogin.statusCode, 401);

    const newPasswordLogin = await jsonRequest("/api/admin/login", {
      username: "admin",
      password: "changed-pass-456"
    });
    assert.equal(newPasswordLogin.statusCode, 200);
    assert.equal(newPasswordLogin.body.user.must_change_password, false);

    const logout = await request({
      method: "POST",
      url: "/api/admin/logout",
      headers: authHeaders(newPasswordLogin.body.token)
    });
    assert.equal(logout.statusCode, 200);

    const afterLogout = await request({
      method: "GET",
      url: "/api/admin/me",
      headers: authHeaders(newPasswordLogin.body.token)
    });
    assert.equal(afterLogout.statusCode, 401);
  } finally {
    await resetYmtyForTests();
    await seedYmtyDefaults();
    restoreEnv();
  }
});

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
