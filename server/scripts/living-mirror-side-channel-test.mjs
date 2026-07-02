import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

process.env.RUNTIME_DIR = process.env.RUNTIME_DIR || "/tmp/p11-living-mirror-side-channel-runtime";
process.env.SKIP_LOCAL_ENV = "true";

const { route } = await import("../src/routes/router.js");
const {
  resetDataBindingForTests,
  saveTradeReviewBinding
} = await import("../src/services/dataBinding.js");

test("living mirror side-channel routes expose profile and growth projection", async () => {
  await resetDataBindingForTests();

  const user = {
    userId: "p11-living-mirror-side-channel",
    maskedPhone: "139****7711",
    phoneTail: "7711",
    inviteSource: "MiniApp RC"
  };

  await saveTradeReviewBinding({
    user,
    review: {
      id: "review-p11-living-mirror-side-channel",
      tradeDate: "2026-07-02",
      marketType: "a_share",
      strongestThought: "怕错过",
      mainErrorType: "计划外交易",
      firstThought: "怕错过",
      triggerScene: "快速拉升后想马上行动",
      nextAction: "先停十秒，写下边界",
      reviewText: "只记录事实、第一念和下一次动作。"
    },
    source: "test"
  });

  const profile = await request({
    method: "GET",
    url: "/api/v1/users/p11-living-mirror-side-channel/living-mirror/profile"
  });
  assert.equal(profile.statusCode, 200);
  assert.equal(profile.body.ok, true);
  assert.equal(profile.body.profile.currentMainMirror, "追涨之镜");
  assert.equal(profile.body.profile.totalEvents, 1);
  assert.ok(profile.body.profile.repeatedThoughts.includes("怕错过"));
  assert.ok(profile.body.profile.latestBoundaryState.includes("先停十秒"));

  const growth = await request({
    method: "GET",
    url: "/api/v1/users/p11-living-mirror-side-channel/living-mirror/growth"
  });
  assert.equal(growth.statusCode, 200);
  assert.equal(growth.body.ok, true);
  assert.equal(growth.body.growthProjection.totalEvents, 1);
  assert.equal(growth.body.growthProjection.trainingContinuity.totalEvents, 1);
  assert.ok(growth.body.growthProjection.nextCycleFocus.action.includes("先停十秒"));

  await resetDataBindingForTests();
});

async function request({ method, url, headers = {}, body = Buffer.alloc(0) }) {
  const req = new MockRequest(body);
  req.method = method;
  req.url = url;
  req.headers = {
    host: "localhost:8787",
    ...headers
  };

  const res = new MockResponse();
  await route(req, res);
  if (!res.finished) {
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: "not found" }));
  }

  return res.toResult();
}

class MockRequest extends Readable {
  constructor(body) {
    super();
    this.body = body;
    this.sent = false;
    this.headers = {};
    this.method = "GET";
    this.url = "/";
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
    this.finished = false;
    this.corsOrigin = "";
    this.corsRejected = false;
  }

  setHeader(key, value) {
    this.headers[key.toLowerCase()] = value;
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    Object.entries(headers).forEach(([key, value]) => {
      this.setHeader(key, value);
    });
  }

  end(chunk = "") {
    if (chunk) this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    this.finished = true;
  }

  toResult() {
    const text = Buffer.concat(this.chunks).toString("utf8");
    return {
      statusCode: this.statusCode,
      headers: this.headers,
      body: text ? JSON.parse(text) : null
    };
  }
}
