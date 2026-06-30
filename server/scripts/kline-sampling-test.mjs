import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";

const runtimeFileUrl = new URL("../data/runtime/kline-segments.json", import.meta.url);
const runtimeDirUrl = new URL("../data/runtime/", import.meta.url);

let previousSegmentsPayload = null;

const { handleError } = await import("../src/lib/http.js");
const { createKlineSegment, setKlineSegmentEnabled } = await import("../src/services/klineSegments.js");
const samplingModule = await import("../src/services/klineSampling.js").catch(() => ({}));
const samplingRouteModule = await import("../src/routes/klineSampling.js").catch(() => ({}));

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

test("sampling normalize supports camel and snake request/result aliases", () => {
  const normalizeSamplingRequest = requireSamplingFunction("normalizeSamplingRequest");
  const normalizeSamplingResult = requireSamplingFunction("normalizeSamplingResult");

  const request = normalizeSamplingRequest({
    user_id: "user-1",
    sourceType: "special_training",
    error_type: "追高冲动",
    sceneTags: ["放量拉升"],
    training_pack_id: "pack-chasing-surge",
    difficulty: "初级",
    period: "daily",
    exclude_segment_ids: ["segment-old"],
    limit: 20,
  });

  assert.equal(request.userId, "user-1");
  assert.equal(request.user_id, request.userId);
  assert.equal(request.sourceType, "special_training");
  assert.equal(request.source_type, request.sourceType);
  assert.equal(request.errorType, "追高冲动");
  assert.equal(request.error_type, request.errorType);
  assert.deepEqual(request.sceneTags, ["放量拉升"]);
  assert.deepEqual(request.scene_tags, request.sceneTags);
  assert.equal(request.trainingPackId, "pack-chasing-surge");
  assert.equal(request.training_pack_id, request.trainingPackId);
  assert.deepEqual(request.excludeSegmentIds, ["segment-old"]);
  assert.deepEqual(request.exclude_segment_ids, request.excludeSegmentIds);

  const result = normalizeSamplingResult({
    segment_id: "segment-new",
    trainingPackId: "pack-chasing-surge",
    error_type: "追高冲动",
    sceneTags: ["放量拉升"],
    symbol: "600519",
    period: "1d",
    start_date: "2024-01-01",
    endDate: "2024-03-01",
    bars: [{ time: 1, close: 2 }],
    fallback_used: false,
    fallbackReason: "",
    source: "segment",
  });

  assert.equal(result.segmentId, "segment-new");
  assert.equal(result.segment_id, result.segmentId);
  assert.equal(result.trainingPackId, "pack-chasing-surge");
  assert.equal(result.training_pack_id, result.trainingPackId);
  assert.equal(result.errorType, "追高冲动");
  assert.equal(result.error_type, result.errorType);
  assert.deepEqual(result.sceneTags, ["放量拉升"]);
  assert.deepEqual(result.scene_tags, result.sceneTags);
  assert.equal(result.startDate, "2024-01-01");
  assert.equal(result.start_date, result.startDate);
  assert.equal(result.endDate, "2024-03-01");
  assert.equal(result.end_date, result.endDate);
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.fallback_used, result.fallbackUsed);
});

test("sampling service matches enabled segment by errorType and returns bars", async () => {
  await resetSegmentsForTest();
  await createSegment({
    id: "segment-error",
    error_types: ["追高冲动"],
    scene_tags: ["放量拉升"],
    training_pack_ids: ["pack-chasing-surge"],
    difficulty: "初级",
  });

  const result = await sampleKlineTraining({
    error_type: "追高冲动",
    period: "1d",
    limit: 20,
  });

  assert.equal(result.segmentId, "segment-error");
  assert.equal(result.segment_id, "segment-error");
  assert.equal(result.trainingPackId, "pack-chasing-surge");
  assert.equal(result.training_pack_id, result.trainingPackId);
  assert.equal(result.symbol, "600519");
  assert.equal(result.period, "1d");
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.fallback_used, false);
  assert.equal(result.fallbackReason, "");
  assert.equal(result.source, "segment");
  assert.ok(result.bars.length > 0);
});

test("sampling service matches sceneTags, trainingPackId, difficulty and period", async () => {
  await resetSegmentsForTest();
  await createSegment({
    id: "segment-scene",
    error_types: ["计划外交易"],
    scene_tags: ["弱反弹", "下跌中继"],
    training_pack_ids: ["pack-holding-loss"],
    difficulty: "中级",
  });
  await createSegment({
    id: "segment-disabled",
    error_types: ["计划外交易"],
    scene_tags: ["弱反弹"],
    training_pack_ids: ["pack-holding-loss"],
    difficulty: "中级",
  });
  await setKlineSegmentEnabled("segment-disabled", false);

  const result = await sampleKlineTraining({
    scene_tags: ["弱反弹"],
    trainingPackId: "pack-holding-loss",
    difficulty: "中级",
    period: "1d",
    limit: 20,
  });

  assert.equal(result.segmentId, "segment-scene");
  assert.equal(result.fallbackUsed, false);
  assert.deepEqual(result.sceneTags, ["弱反弹", "下跌中继"]);
  assert.equal(result.errorType, "计划外交易");
});

test("sampling service respects excludeSegmentIds and falls back when all candidates are excluded", async () => {
  await resetSegmentsForTest();
  await createSegment({
    id: "segment-excluded",
    error_types: ["追高冲动"],
    scene_tags: ["假突破"],
    training_pack_ids: ["pack-chasing-surge"],
    difficulty: "初级",
  });

  const result = await sampleKlineTraining({
    errorType: "追高冲动",
    period: "1d",
    excludeSegmentIds: ["segment-excluded"],
    limit: 20,
  });

  assert.notEqual(result.segmentId, "segment-excluded");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.fallback_used, true);
  assert.equal(result.fallbackReason, "excluded_all_segments");
  assert.ok(result.bars.length > 0);
});

test("sampling service falls back through catalog, instruments and slice when no segment matches", async () => {
  await resetSegmentsForTest();

  const result = await sampleKlineTraining({
    error_type: "空仓焦虑",
    period: "1d",
    limit: 20,
  });

  assert.equal(result.segmentId, "");
  assert.equal(result.segment_id, "");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.fallbackReason, "no_matching_segment");
  assert.equal(result.source, "fallback_catalog_slice");
  assert.ok(result.symbol);
  assert.ok(result.bars.length > 0);
});

test("sampling API exposes POST /api/v1/kline-training/sample and validation errors", async () => {
  await resetSegmentsForTest();
  await createSegment({
    id: "segment-api",
    error_types: ["追高冲动"],
    scene_tags: ["放量拉升"],
    training_pack_ids: ["pack-chasing-surge"],
    difficulty: "初级",
  });

  const created = await jsonRequest("POST", "/api/v1/kline-training/sample", {
    error_type: "追高冲动",
    scene_tags: ["放量拉升"],
    training_pack_id: "pack-chasing-surge",
    period: "daily",
    limit: 20,
  });

  assert.equal(created.statusCode, 200);
  assert.equal(created.body.ok, true);
  assert.equal(created.body.segment_id, "segment-api");
  assert.equal(created.body.segmentId, created.body.segment_id);
  assert.equal(created.body.sampling_result.segment_id, "segment-api");
  assert.equal(created.body.samplingResult.segmentId, "segment-api");
  assert.ok(created.body.bars.length > 0);

  const invalid = await jsonRequest("POST", "/api/v1/kline-training/sample", {
    exclude_segment_ids: "segment-api",
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.ok, false);
});

async function sampleKlineTraining(input) {
  const fn = requireSamplingFunction("sampleKlineTraining");
  return fn(input);
}

async function createSegment(overrides = {}) {
  return createKlineSegment({
    symbol: "600519",
    name: "贵州茅台",
    period: "1d",
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    ...overrides,
  });
}

function requireSamplingFunction(name) {
  assert.equal(typeof samplingModule[name], "function", `missing sampling export: ${name}`);
  return samplingModule[name];
}

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
    const handled = await handleKlineSamplingRoute(req, res, {
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

async function handleKlineSamplingRoute(req, res, context) {
  assert.equal(typeof samplingRouteModule.handleKlineSamplingRoute, "function", "missing sampling route handler");
  return samplingRouteModule.handleKlineSamplingRoute(req, res, context);
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
