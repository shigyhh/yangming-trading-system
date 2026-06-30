import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";

const runtimeFileUrl = new URL("../data/runtime/training-packs.json", import.meta.url);
const runtimeDirUrl = new URL("../data/runtime/", import.meta.url);

let previousTrainingPacksPayload = null;

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];

const { handleError } = await import("../src/lib/http.js");
const { handleTrainingPackRoute } = await import("../src/routes/trainingPacks.js");
const {
  createTrainingPack,
  listTrainingPacks,
  seedDefaultTrainingPacksIfEmpty,
  setTrainingPackEnabled,
  updateTrainingPack
} = await import("../src/services/trainingPacks.js");

test.before(async () => {
  previousTrainingPacksPayload = await fs.readFile(runtimeFileUrl, "utf8").catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
});

test.after(async () => {
  await fs.mkdir(runtimeDirUrl, { recursive: true });
  if (previousTrainingPacksPayload === null) {
    await fs.rm(runtimeFileUrl, { force: true });
    return;
  }
  await fs.writeFile(runtimeFileUrl, previousTrainingPacksPayload, "utf8");
});

test("training pack service seeds defaults and normalizes camel and snake aliases", async () => {
  await resetTrainingPacksForTest();

  const seeded = await seedDefaultTrainingPacksIfEmpty();
  const packs = await listTrainingPacks();
  const first = packs[0];
  const searchableText = JSON.stringify(packs);

  assert.equal(seeded.length, 8);
  assert.equal(packs.length, 8);
  assert.equal(first.title, "追高冲动专项");
  assert.equal(first.errorType, "追高冲动");
  assert.equal(first.error_type, first.errorType);
  assert.deepEqual(first.scene_tags, first.sceneTags);
  assert.equal(first.training_prescription, first.trainingPrescription);
  assert.equal(first.sort_order, first.sortOrder);
  assert.equal(typeof first.createdAt, "string");
  assert.equal(first.created_at, first.createdAt);
  assert.ok(packs.every((pack) => pack.enabled === true));
  assert.deepEqual(packs.map((pack) => pack.sortOrder), packs.map((pack) => pack.sortOrder).sort((a, b) => a - b));

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(searchableText.includes(phrase), false, `contains forbidden phrase: ${phrase}`);
  });
});

test("training pack service creates, updates and toggles packs with compatible input fields", async () => {
  await resetTrainingPacksForTest();

  const created = await createTrainingPack({
    title: "临盘暂停专项",
    error_type: "计划外交易",
    scene_tags: ["突然异动", "横盘噪音"],
    training_goal: "看见临盘起念后先暂停",
    expected_action: "先写下计划，再决定是否行动",
    default_prompt: "先照见一念，再做复盘记录",
    training_prescription: "临盘暂停专项训练",
    difficulty: "中级",
    sort_order: 99
  });
  assert.equal(created.errorType, "计划外交易");
  assert.equal(created.error_type, "计划外交易");
  assert.deepEqual(created.sceneTags, ["突然异动", "横盘噪音"]);
  assert.deepEqual(created.scene_tags, created.sceneTags);

  const updated = await updateTrainingPack(created.id, {
    trainingGoal: "把临盘冲动转成复盘动作",
    scene_tags: ["突然异动"],
    enabled: false,
    auditNote: "kept"
  });
  assert.equal(updated.trainingGoal, "把临盘冲动转成复盘动作");
  assert.equal(updated.training_goal, updated.trainingGoal);
  assert.deepEqual(updated.sceneTags, ["突然异动"]);
  assert.equal(updated.auditNote, "kept");
  assert.equal(updated.enabled, false);

  const enabledList = await listTrainingPacks();
  assert.equal(enabledList.some((pack) => pack.id === created.id), false);

  const allList = await listTrainingPacks({ includeDisabled: true });
  assert.equal(allList.some((pack) => pack.id === created.id), true);

  const reenabled = await setTrainingPackEnabled(created.id, true);
  assert.equal(reenabled.enabled, true);
});

test("training pack API exposes list, create, patch and enabled toggles", async () => {
  await resetTrainingPacksForTest();

  const listed = await request({ method: "GET", url: "/api/v1/training-packs" });
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.body.ok, true);
  assert.equal(listed.body.training_packs.length, 8);
  assert.equal(listed.body.trainingPacks.length, 8);
  assert.match(listed.headers["Access-Control-Allow-Methods"], /PATCH/);

  const created = await jsonRequest("POST", "/api/v1/training-packs", {
    title: "复盘前暂停专项",
    errorType: "急于翻本",
    sceneTags: ["连续受挫", "情绪升温"],
    trainingGoal: "在想证明自己时先停下来",
    expectedAction: "先完成复盘记录",
    trainingPrescription: "复盘前暂停专项训练"
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.ok, true);
  assert.equal(created.body.training_pack.title, "复盘前暂停专项");
  assert.equal(created.body.trainingPack.id, created.body.training_pack.id);

  const patched = await jsonRequest("PATCH", `/api/v1/training-packs/${created.body.training_pack.id}`, {
    training_goal: "把想证明自己的念头写入复盘",
    defaultPrompt: "先写复盘，不急着进入下一次训练"
  });
  assert.equal(patched.statusCode, 200);
  assert.equal(patched.body.training_pack.trainingGoal, "把想证明自己的念头写入复盘");
  assert.equal(patched.body.training_pack.default_prompt, "先写复盘，不急着进入下一次训练");

  const disabled = await jsonRequest("PATCH", `/api/v1/training-packs/${created.body.training_pack.id}/enabled`, {
    enabled: false
  });
  assert.equal(disabled.statusCode, 200);
  assert.equal(disabled.body.training_pack.enabled, false);

  const enabledOnly = await request({ method: "GET", url: "/api/v1/training-packs" });
  assert.equal(enabledOnly.body.training_packs.some((pack) => pack.id === created.body.training_pack.id), false);

  const includeDisabled = await request({ method: "GET", url: "/api/v1/training-packs?include_disabled=true" });
  assert.equal(includeDisabled.body.training_packs.some((pack) => pack.id === created.body.training_pack.id), true);

  const invalid = await jsonRequest("POST", "/api/v1/training-packs", {
    title: "缺少必填字段"
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.ok, false);
});

async function resetTrainingPacksForTest() {
  await fs.mkdir(runtimeDirUrl, { recursive: true });
  await fs.rm(runtimeFileUrl, { force: true });
}

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
    const handled = await handleTrainingPackRoute(req, res, {
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
