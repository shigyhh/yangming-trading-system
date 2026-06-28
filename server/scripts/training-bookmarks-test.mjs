import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

const { handleDataBindingRoute } = await import("../src/routes/dataBinding.js");
const { handleError } = await import("../src/lib/http.js");
const { resetDataBindingForTests } = await import("../src/services/dataBinding.js");

test("training bookmark API creates, lists, filters, updates and soft deletes bookmarks", async () => {
  await resetDataBindingForTests();

  const session = await jsonRequest("POST", "/api/v1/data-binding/users/p8-bookmark-api/training-bookmarks", {
    user: {
      maskedPhone: "135****2200",
      phoneTail: "2200",
      inviteSource: "微信小程序MVP"
    },
    bookmark: {
      bookmarkType: "session",
      sessionId: "session-api-001",
      sourceType: "custom_session",
      title: "自选盲练整局",
      note: "留作回放。"
    }
  });

  assert.equal(session.statusCode, 201);
  assert.equal(session.body.ok, true);
  assert.equal(session.body.training_bookmark.bookmarkType, "session");
  assert.equal(session.body.trainingBookmark.id, session.body.training_bookmark.id);

  const action = await jsonRequest("POST", "/api/v1/data-binding/users/p8-bookmark-api/training-bookmarks", {
    training_bookmark: {
      bookmark_type: "action",
      session_id: "session-api-001",
      action_id: "action-api-002",
      bar_index: 9,
      source_type: "special_training",
      error_type: "追高冲动",
      scene_tags: ["放量拉升"],
      execution_result: "执行偏离",
      segment_id: "segment-api-rise",
      training_pack_id: "pack-chasing-surge",
      sampling_result: {
        segment_id: "segment-api-rise",
        training_pack_id: "pack-chasing-surge",
        error_type: "追高冲动",
        scene_tags: ["放量拉升"],
        symbol: "600000",
        period: "101",
        start_date: "2026-06-01",
        end_date: "2026-06-04",
        fallback_used: false,
        source: "segment",
        bars: [{ date: "2026-06-01", close: 10.2 }]
      },
      title: "第 9 根动作"
    }
  });

  assert.equal(action.statusCode, 201);
  assert.equal(action.body.training_bookmark.segmentId, "segment-api-rise");
  assert.equal(action.body.training_bookmark.training_pack_id, "pack-chasing-surge");
  assert.equal(action.body.training_bookmark.samplingResult.source, "segment");
  assert.equal("bars" in action.body.training_bookmark.samplingResult, false);
  assert.equal("bars" in action.body.training_bookmark.sampling_result, false);

  const listed = await request({ method: "GET", url: "/api/v1/data-binding/users/p8-bookmark-api/training-bookmarks" });
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.body.training_bookmarks.length, 2);
  assert.equal(listed.body.trainingBookmarks.length, 2);

  const filtered = await request({
    method: "GET",
    url: "/api/v1/data-binding/users/p8-bookmark-api/training-bookmarks?bookmark_type=action&training_pack_id=pack-chasing-surge"
  });
  assert.equal(filtered.statusCode, 200);
  assert.deepEqual(filtered.body.training_bookmarks.map((bookmark) => bookmark.id), [action.body.training_bookmark.id]);

  const patched = await jsonRequest("PATCH", `/api/v1/data-binding/users/p8-bookmark-api/training-bookmarks/${action.body.training_bookmark.id}`, {
    title: "第 9 根动作复看",
    note: "先停十秒，再记录第一念。",
    enabled: false
  });
  assert.equal(patched.statusCode, 200);
  assert.equal(patched.body.training_bookmark.title, "第 9 根动作复看");
  assert.equal(patched.body.training_bookmark.enabled, false);

  const enabledOnly = await request({ method: "GET", url: "/api/v1/data-binding/users/p8-bookmark-api/training-bookmarks" });
  assert.equal(enabledOnly.body.training_bookmarks.length, 1);

  const includeDisabled = await request({ method: "GET", url: "/api/v1/data-binding/users/p8-bookmark-api/training-bookmarks?include_disabled=true" });
  assert.equal(includeDisabled.body.training_bookmarks.length, 2);

  const deleted = await request({
    method: "DELETE",
    url: `/api/v1/data-binding/users/p8-bookmark-api/training-bookmarks/${session.body.training_bookmark.id}`
  });
  assert.equal(deleted.statusCode, 200);
  assert.equal(deleted.body.training_bookmark.enabled, false);

  const emptyDefault = await request({ method: "GET", url: "/api/v1/data-binding/users/p8-bookmark-api/training-bookmarks" });
  assert.equal(emptyDefault.body.training_bookmarks.length, 0);

  const invalid = await jsonRequest("POST", "/api/v1/data-binding/users/p8-bookmark-api/training-bookmarks", {
    title: "缺少类型和 session"
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.ok, false);

  await resetDataBindingForTests();
});

async function jsonRequest(method, url, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  return request({
    method,
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
    const requestUrl = new URL(url, `http://${req.headers.host}`);
    const handled = await handleDataBindingRoute(req, res, {
      url: requestUrl,
      pathname: requestUrl.pathname
    });
    if (!handled) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "接口不存在" }));
    }
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
