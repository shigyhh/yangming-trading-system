import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";

const runtimeFileUrl = new URL("../data/runtime/kline-segments.json", import.meta.url);
const runtimeDirUrl = new URL("../data/runtime/", import.meta.url);

let previousSegmentsPayload = null;

const { handleError } = await import("../src/lib/http.js");
const { handleKlineSegmentRoute } = await import("../src/routes/klineSegments.js");
const {
  createKlineSegment,
  getKlineSegment,
  listKlineSegments,
  normalizeKlineSegment,
  setKlineSegmentEnabled,
  updateKlineSegment,
} = await import("../src/services/klineSegments.js");

test.before(async () => {
  previousSegmentsPayload = await fs.readFile(runtimeFileUrl, "utf8").catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
});

test.after(async () => {
  await fs.mkdir(runtimeDirUrl, { recursive: true });
  if (previousSegmentsPayload === null) {
    await fs.rm(runtimeFileUrl, { force: true });
    return;
  }
  await fs.writeFile(runtimeFileUrl, previousSegmentsPayload, "utf8");
});

test("kline segment normalize supports camel and snake aliases without copying bars", () => {
  const normalized = normalizeKlineSegment({
    id: "segment-alias",
    symbol: "600519",
    name: "贵州茅台",
    period: "30m",
    start_date: "2026-06-01",
    endDate: "2026-06-12",
    scene_tags: ["放量拉升", "假突破"],
    errorTypes: ["追高冲动"],
    training_pack_ids: ["pack-chasing-surge"],
    difficulty: "中级",
    note: "只保存片段元数据",
    enabled: true,
    created_at: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
    bars: [{ open: 1, close: 2 }],
    candles: [{ open: 1, close: 2 }],
  });

  assert.equal(normalized.startDate, "2026-06-01");
  assert.equal(normalized.start_date, normalized.startDate);
  assert.equal(normalized.endDate, "2026-06-12");
  assert.equal(normalized.end_date, normalized.endDate);
  assert.deepEqual(normalized.sceneTags, ["放量拉升", "假突破"]);
  assert.deepEqual(normalized.scene_tags, normalized.sceneTags);
  assert.deepEqual(normalized.errorTypes, ["追高冲动"]);
  assert.deepEqual(normalized.error_types, normalized.errorTypes);
  assert.deepEqual(normalized.trainingPackIds, ["pack-chasing-surge"]);
  assert.deepEqual(normalized.training_pack_ids, normalized.trainingPackIds);
  assert.equal(normalized.createdAt, "2026-06-20T00:00:00.000Z");
  assert.equal(normalized.created_at, normalized.createdAt);
  assert.equal(normalized.updatedAt, "2026-06-21T00:00:00.000Z");
  assert.equal(normalized.updated_at, normalized.updatedAt);
  assert.equal("bars" in normalized, false);
  assert.equal("candles" in normalized, false);
});

test("kline segment service creates, lists, filters, updates and toggles enabled state", async () => {
  await resetSegmentsForTest();

  const first = await createKlineSegment({
    id: "segment-first",
    symbol: "600519",
    name: "贵州茅台",
    period: "30m",
    start_date: "2026-06-01",
    end_date: "2026-06-12",
    scene_tags: ["放量拉升", "假突破"],
    error_types: ["追高冲动"],
    training_pack_ids: ["pack-chasing-surge"],
    difficulty: "初级",
    note: "第一段",
    bars: [{ open: 1, close: 2 }],
  });
  const second = await createKlineSegment({
    id: "segment-second",
    symbol: "000001",
    period: "60m",
    startDate: "2026-05-01",
    endDate: "2026-05-09",
    sceneTags: ["下跌中继", "弱反弹"],
    errorTypes: ["扛单被套"],
    trainingPackIds: ["pack-holding-loss"],
    difficulty: "中级",
  });

  assert.equal(first.enabled, true);
  assert.equal(first.errorTypes[0], "追高冲动");
  assert.deepEqual(first.error_types, ["追高冲动"]);
  assert.equal(first.training_pack_ids[0], "pack-chasing-surge");
  assert.equal("bars" in first, false);

  assert.equal((await listKlineSegments()).length, 2);
  assert.deepEqual((await listKlineSegments({ errorType: "追高冲动" })).map((item) => item.id), [first.id]);
  assert.deepEqual((await listKlineSegments({ error_type: "扛单被套" })).map((item) => item.id), [second.id]);
  assert.deepEqual((await listKlineSegments({ sceneTag: "弱反弹" })).map((item) => item.id), [second.id]);
  assert.deepEqual((await listKlineSegments({ scene_tag: "假突破" })).map((item) => item.id), [first.id]);
  assert.deepEqual((await listKlineSegments({ trainingPackId: "pack-chasing-surge" })).map((item) => item.id), [first.id]);
  assert.deepEqual((await listKlineSegments({ training_pack_id: "pack-holding-loss" })).map((item) => item.id), [second.id]);
  assert.deepEqual((await listKlineSegments({ symbol: "600519" })).map((item) => item.id), [first.id]);
  assert.deepEqual((await listKlineSegments({ period: "60m" })).map((item) => item.id), [second.id]);

  const fetched = await getKlineSegment(first.id);
  assert.equal(fetched.id, first.id);

  const patched = await updateKlineSegment(first.id, {
    note: "已更新",
    sceneTags: ["冲高回落"],
    training_pack_ids: ["pack-chasing-surge", "pack-unplanned-trade"],
  });
  assert.equal(patched.note, "已更新");
  assert.deepEqual(patched.scene_tags, ["冲高回落"]);
  assert.deepEqual(patched.trainingPackIds, ["pack-chasing-surge", "pack-unplanned-trade"]);

  const disabled = await setKlineSegmentEnabled(first.id, false);
  assert.equal(disabled.enabled, false);
  assert.deepEqual((await listKlineSegments()).map((item) => item.id), [second.id]);
  assert.deepEqual((await listKlineSegments({ include_disabled: true })).map((item) => item.id).sort(), [first.id, second.id].sort());
});

test("kline segment API exposes list, detail, create, patch and enabled toggles", async () => {
  await resetSegmentsForTest();

  const created = await jsonRequest("POST", "/api/v1/kline-segments", {
    id: "api-segment",
    symbol: "600519",
    name: "贵州茅台",
    period: "30m",
    start_date: "2026-06-01",
    end_date: "2026-06-12",
    scene_tags: ["放量拉升", "假突破"],
    error_types: ["追高冲动"],
    training_pack_ids: ["pack-chasing-surge"],
    difficulty: "初级",
    bars: [{ open: 1, close: 2 }],
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.ok, true);
  assert.equal(created.body.kline_segment.id, "api-segment");
  assert.equal(created.body.klineSegment.id, created.body.kline_segment.id);
  assert.equal("bars" in created.body.kline_segment, false);

  const detail = await request({ method: "GET", url: "/api/v1/kline-segments/api-segment" });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.body.kline_segment.symbol, "600519");

  const patched = await jsonRequest("PATCH", "/api/v1/kline-segments/api-segment", {
    note: "标注已复核",
    errorTypes: ["计划外交易"],
    scene_tags: ["突然异动"],
  });
  assert.equal(patched.statusCode, 200);
  assert.deepEqual(patched.body.kline_segment.error_types, ["计划外交易"]);
  assert.deepEqual(patched.body.kline_segment.sceneTags, ["突然异动"]);

  const disabled = await jsonRequest("PATCH", "/api/v1/kline-segments/api-segment/enabled", {
    enabled: false,
  });
  assert.equal(disabled.statusCode, 200);
  assert.equal(disabled.body.kline_segment.enabled, false);

  const enabledOnly = await request({ method: "GET", url: "/api/v1/kline-segments" });
  assert.equal(enabledOnly.statusCode, 200);
  assert.equal(enabledOnly.body.kline_segments.length, 0);

  const includeDisabled = await request({ method: "GET", url: "/api/v1/kline-segments?include_disabled=true&error_type=计划外交易" });
  assert.equal(includeDisabled.statusCode, 200);
  assert.equal(includeDisabled.body.kline_segments.length, 1);

  const invalid = await jsonRequest("POST", "/api/v1/kline-segments", {
    symbol: "600519",
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.ok, false);

  const missing = await request({ method: "GET", url: "/api/v1/kline-segments/not-found" });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.body.ok, false);
});

async function resetSegmentsForTest() {
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
      "content-length": String(body.length),
    },
    body,
  });
}

async function request({ method, url, headers = {}, body = Buffer.alloc(0) }) {
  const req = new MockRequest(body);
  req.method = method;
  req.url = url;
  req.headers = {
    host: "127.0.0.1:8787",
    ...headers,
  };
  req.socket = { remoteAddress: "127.0.0.1" };

  const res = new MockResponse();
  try {
    const requestUrl = new URL(url, `http://${req.headers.host}`);
    const handled = await handleKlineSegmentRoute(req, res, {
      url: requestUrl,
      pathname: requestUrl.pathname,
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
    this.payload = payload;
  }

  result() {
    const body = this.payload ? JSON.parse(this.payload) : null;
    return {
      statusCode: this.statusCode,
      headers: this.headers,
      body,
    };
  }
}
