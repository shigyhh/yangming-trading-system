import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

const { handleDataBindingRoute } = await import("../src/routes/dataBinding.js");
const { handleError } = await import("../src/lib/http.js");
const { resetDataBindingForTests } = await import("../src/services/dataBinding.js");

test("intervention event API creates, lists, filters, updates and soft deletes events", async () => {
  await resetDataBindingForTests();

  const created = await jsonRequest("POST", "/api/v1/data-binding/users/p10-intervention-api/intervention-events", {
    interventionEvent: {
      triggerType: "before_training",
      sourceType: "special_training",
      sessionId: "session-p10-001",
      reviewId: "review-p10-001",
      planId: "plan-p10-001",
      errorType: "追高冲动",
      firstThought: "怕错过",
      sceneTags: ["放量拉升", "冲高回落"],
      triggerScene: "训练前",
      message: "先停一下，是否仍按计划？",
      suggestedAction: "先记录，再行动",
      expectedAction: "按你的执行计划处理",
      userResponse: "continue",
      executionResult: "aligned",
      metadata: {
        source: "miniapp-p10"
      }
    }
  });

  assert.equal(created.statusCode, 201);
  assert.equal(created.body.ok, true);
  assert.equal(created.body.intervention_event.triggerType, "before_training");
  assert.equal(created.body.intervention_event.trigger_type, "before_training");
  assert.deepEqual(created.body.interventionEvent.scene_tags, ["放量拉升", "冲高回落"]);

  const snake = await jsonRequest("POST", "/api/v1/data-binding/users/p10-intervention-api/intervention-events", {
    intervention_event: {
      trigger_type: "after_review",
      source_type: "trade_review",
      review_id: "review-p10-002",
      error_type: "计划外交易",
      first_thought: "想马上补一笔",
      scene_tags: ["突然异动"],
      message: "这可能是你的高频旧题，先记录，再行动。",
      suggested_action: "稍后再练",
      expected_action: "无计划不行动",
      user_response: "later",
      execution_result: "unclear"
    }
  });

  assert.equal(snake.statusCode, 201);
  assert.equal(snake.body.intervention_event.triggerType, "after_review");
  assert.equal(snake.body.intervention_event.expected_action, "无计划不行动");

  const filtered = await request({
    method: "GET",
    url: "/api/v1/data-binding/users/p10-intervention-api/intervention-events?trigger_type=before_training&source_type=special_training"
  });
  assert.equal(filtered.statusCode, 200);
  assert.deepEqual(filtered.body.intervention_events.map((event) => event.id), [created.body.intervention_event.id]);
  assert.equal(filtered.body.include_disabled, false);

  const patched = await jsonRequest("PATCH", `/api/v1/data-binding/users/p10-intervention-api/intervention-events/${created.body.intervention_event.id}`, {
    user_response: "followed_plan",
    execution_result: "aligned"
  });
  assert.equal(patched.statusCode, 200);
  assert.equal(patched.body.intervention_event.userResponse, "followed_plan");

  const deleted = await request({
    method: "DELETE",
    url: `/api/v1/data-binding/users/p10-intervention-api/intervention-events/${snake.body.intervention_event.id}`
  });
  assert.equal(deleted.statusCode, 200);
  assert.equal(deleted.body.intervention_event.enabled, false);

  const enabledOnly = await request({ method: "GET", url: "/api/v1/data-binding/users/p10-intervention-api/intervention-events" });
  assert.equal(enabledOnly.body.intervention_events.length, 1);

  const includeDisabled = await request({ method: "GET", url: "/api/v1/data-binding/users/p10-intervention-api/intervention-events?include_disabled=true" });
  assert.equal(includeDisabled.body.intervention_events.length, 2);

  const forbidden = await jsonRequest("POST", "/api/v1/data-binding/users/p10-intervention-api/intervention-events", {
    triggerType: "during_training",
    message: "买入信号出现，现在可以买"
  });
  assert.equal(forbidden.statusCode, 400);

  await resetDataBindingForTests();
});

test("intervention rule API validates advisory language and feeds dashboard summary", async () => {
  await resetDataBindingForTests();

  const rule = await jsonRequest("POST", "/api/v1/data-binding/users/p10-rule-api/intervention-rules", {
    intervention_rule: {
      title: "追高前停十秒",
      trigger_type: "before_training",
      error_type: "追高冲动",
      scene_tags: ["放量拉升"],
      message_template: "先停一下，这可能是你的高频旧题。",
      expected_action: "按你的执行计划处理",
      priority: 8,
      max_per_session: 2,
      cooldown_minutes: 30
    }
  });

  assert.equal(rule.statusCode, 201);
  assert.equal(rule.body.intervention_rule.messageTemplate, "先停一下，这可能是你的高频旧题。");
  assert.equal(rule.body.intervention_rule.max_per_session, 2);
  assert.equal(rule.body.interventionRule.cooldownMinutes, 30);

  const forbiddenRule = await jsonRequest("POST", "/api/v1/data-binding/users/p10-rule-api/intervention-rules", {
    title: "危险规则",
    triggerType: "during_training",
    messageTemplate: "建议买入，明日看涨"
  });
  assert.equal(forbiddenRule.statusCode, 400);

  const event = await jsonRequest("POST", "/api/v1/data-binding/users/p10-rule-api/intervention-events", {
    triggerType: "before_training",
    message: "先停一下",
    userResponse: "followed_plan"
  });
  assert.equal(event.statusCode, 201);

  const dashboard = await request({
    method: "GET",
    url: "/api/v1/data-binding/users/p10-rule-api/dashboard-summary?range=30d"
  });
  assert.equal(dashboard.statusCode, 200);
  assert.equal(dashboard.body.dashboard_summary.overview.interventionEventCount, 1);
  assert.equal(dashboard.body.dashboard_summary.interventions.totalCount, 1);
  assert.equal(dashboard.body.dashboard_summary.interventions.byTriggerType[0].key, "before_training");

  const patched = await jsonRequest("PATCH", `/api/v1/data-binding/users/p10-rule-api/intervention-rules/${rule.body.intervention_rule.id}`, {
    enabled: false
  });
  assert.equal(patched.statusCode, 200);
  assert.equal(patched.body.intervention_rule.enabled, false);

  const listedDefault = await request({ method: "GET", url: "/api/v1/data-binding/users/p10-rule-api/intervention-rules" });
  assert.equal(listedDefault.body.intervention_rules.length, 0);

  const listedAll = await request({ method: "GET", url: "/api/v1/data-binding/users/p10-rule-api/intervention-rules?include_disabled=true" });
  assert.equal(listedAll.body.intervention_rules.length, 1);

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

  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
    if (name.toLowerCase() === "access-control-allow-origin") {
      this.corsOrigin = value;
    }
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    Object.entries(headers).forEach(([key, value]) => this.setHeader(key, value));
  }

  end(payload = "") {
    this.payload += payload;
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
