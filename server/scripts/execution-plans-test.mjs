import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

const { handleDataBindingRoute } = await import("../src/routes/dataBinding.js");
const { handleError } = await import("../src/lib/http.js");
const { resetDataBindingForTests } = await import("../src/services/dataBinding.js");

test("execution plan API creates, lists, filters, updates and soft deletes plans", async () => {
  await resetDataBindingForTests();

  const camel = await jsonRequest("POST", "/api/v1/data-binding/users/p10-plan-api/execution-plans", {
    executionPlan: {
      title: "追高前停十秒",
      errorType: "追高冲动",
      sceneTags: ["放量拉升", "假突破"],
      firstThoughts: ["怕错过"],
      forbiddenActions: ["计划外追入", "情绪加仓"],
      expectedAction: "按计划处理",
      nextAction: "先停十秒，再记录第一念",
      trainingPrescription: "追高冲动专项训练"
    }
  });

  assert.equal(camel.statusCode, 201);
  assert.equal(camel.body.execution_plan.title, "追高前停十秒");
  assert.equal(camel.body.execution_plan.error_type, "追高冲动");
  assert.deepEqual(camel.body.executionPlan.forbiddenActions, ["计划外追入", "情绪加仓"]);

  const snake = await jsonRequest("POST", "/api/v1/data-binding/users/p10-plan-api/execution-plans", {
    execution_plan: {
      title: "计划外交易复位",
      error_type: "计划外交易",
      scene_tags: ["突然异动"],
      first_thoughts: ["这次不一样"],
      forbidden_actions: ["无计划行动"],
      expected_action: "无计划不行动",
      next_action: "先记录，再行动",
      training_prescription: "计划外交易专项训练"
    }
  });

  assert.equal(snake.statusCode, 201);
  assert.equal(snake.body.execution_plan.nextAction, "先记录，再行动");
  assert.equal(snake.body.execution_plan.training_prescription, "计划外交易专项训练");

  const filtered = await request({
    method: "GET",
    url: "/api/v1/data-binding/users/p10-plan-api/execution-plans?error_type=追高冲动"
  });
  assert.equal(filtered.statusCode, 200);
  assert.deepEqual(filtered.body.execution_plans.map((plan) => plan.id), [camel.body.execution_plan.id]);

  const patched = await jsonRequest("PATCH", `/api/v1/data-binding/users/p10-plan-api/execution-plans/${camel.body.execution_plan.id}`, {
    next_action: "先停十秒，确认仍在计划内",
    enabled: false
  });
  assert.equal(patched.statusCode, 200);
  assert.equal(patched.body.execution_plan.nextAction, "先停十秒，确认仍在计划内");
  assert.equal(patched.body.execution_plan.enabled, false);

  const dashboard = await request({
    method: "GET",
    url: "/api/v1/data-binding/users/p10-plan-api/dashboard-summary?range=30d"
  });
  assert.equal(dashboard.statusCode, 200);
  assert.equal(dashboard.body.dashboard_summary.overview.executionPlanCount, 2);
  assert.equal(dashboard.body.dashboard_summary.executionPlans.totalCount, 2);
  assert.equal(dashboard.body.dashboard_summary.executionPlans.enabledCount, 1);
  assert.equal(dashboard.body.dashboard_summary.executionPlans.byErrorType[0].key, "计划外交易");

  const enabledOnly = await request({ method: "GET", url: "/api/v1/data-binding/users/p10-plan-api/execution-plans" });
  assert.equal(enabledOnly.body.execution_plans.length, 1);

  const includeDisabled = await request({ method: "GET", url: "/api/v1/data-binding/users/p10-plan-api/execution-plans?include_disabled=true" });
  assert.equal(includeDisabled.body.execution_plans.length, 2);

  const deleted = await request({
    method: "DELETE",
    url: `/api/v1/data-binding/users/p10-plan-api/execution-plans/${snake.body.execution_plan.id}`
  });
  assert.equal(deleted.statusCode, 200);
  assert.equal(deleted.body.execution_plan.enabled, false);

  const emptyDefault = await request({ method: "GET", url: "/api/v1/data-binding/users/p10-plan-api/execution-plans" });
  assert.equal(emptyDefault.body.execution_plans.length, 0);

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
