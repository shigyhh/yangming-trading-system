import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

const { handleDataBindingRoute } = await import("../src/routes/dataBinding.js");
const {
  createTrainingBookmarkBinding,
  getDataBindingUserSummary,
  getMirrorArchiveBinding,
  getMirrorArchiveItemBinding,
  resetDataBindingForTests,
  saveKLineRecordBinding,
  saveTradeReviewBinding
} = await import("../src/services/dataBinding.js");

test("mirror archive index collects trade reviews, kline records and training bookmarks", async () => {
  await resetDataBindingForTests();

  const user = {
    userId: "p9-archive-user",
    maskedPhone: "136****6618",
    phoneTail: "6618",
    inviteSource: "P9A"
  };

  const tradeReview = await saveTradeReviewBinding({
    user,
    review: {
      id: "review-p9-001",
      tradeDate: "2026-06-20",
      strongestThought: "又想追回来",
      mainErrorType: "计划外交易",
      firstThought: "不能错过",
      triggerScene: "突然异动",
      nextAction: "先停十秒，回到计划",
      reviewText: "这次复盘只记录念头与动作。"
    },
    source: "test"
  });

  const kline = await saveKLineRecordBinding({
    user,
    record: {
      day: 2,
      scene: "放量拉升",
      reaction: "想追",
      errorType: "追高冲动",
      sceneTags: ["放量拉升", "冲高回落"],
      executionResult: "执行偏离",
      segmentId: "segment-p9-rise",
      trainingPackId: "pack-chasing-surge",
      samplingResult: {
        segmentId: "segment-p9-rise",
        trainingPackId: "pack-chasing-surge",
        source: "segment",
        fallbackUsed: false,
        bars: [{ date: "2026-06-20", close: 10.2 }]
      }
    },
    source: "test"
  });

  const bookmark = await createTrainingBookmarkBinding(user.userId, {
    user,
    bookmarkType: "action",
    sessionId: "session-p9-001",
    actionId: "action-p9-001",
    sourceType: "special_training",
    errorType: "追高冲动",
    sceneTags: ["放量拉升"],
    executionResult: "执行偏离",
    segmentId: "segment-p9-rise",
    trainingPackId: "pack-chasing-surge",
    samplingResult: {
      segmentId: "segment-p9-rise",
      trainingPackId: "pack-chasing-surge",
      source: "segment",
      bars: [{ date: "2026-06-20", close: 10.2 }]
    },
    title: "第 1 次动作收藏"
  });

  const summary = await getDataBindingUserSummary(user.userId);
  assert.equal(summary.archive_index.userId, user.userId);
  assert.equal(summary.archiveIndex.userId, user.userId);
  assert.equal(summary.archive_index.by_type.trade_review, 1);
  assert.equal(summary.archive_index.by_type.kline_record, 1);
  assert.equal(summary.archive_index.by_type.training_bookmark, 1);
  assert.equal(summary.archive_index.total_count >= 3, true);

  const archive = await getMirrorArchiveBinding(user.userId);
  assert.equal(archive.archive_index.totalCount, summary.archiveIndex.totalCount);
  assert.equal(archive.mirror_archive.tradeReviews[0].id, tradeReview.review.id);
  assert.equal(archive.archive_index.latestItems.some((item) => item.type === "kline_record"), true);
  assert.equal(archive.archive_index.latest_items.some((item) => item.type === "training_bookmark"), true);

  const klineItem = archive.archive_index.latestItems.find((item) => item.sourceId === kline.record.id);
  assert.equal(klineItem.type, "kline_record");
  assert.equal(klineItem.segmentId, "segment-p9-rise");
  assert.equal(klineItem.trainingPackId, "pack-chasing-surge");
  assert.equal(klineItem.executionResult, "执行偏离");
  assert.equal("bars" in klineItem.metadata, false);

  const bookmarkItem = archive.archive_index.latestItems.find((item) => item.sourceId === bookmark.training_bookmark.id);
  assert.equal(bookmarkItem.type, "training_bookmark");
  assert.equal(bookmarkItem.source_type, "training_bookmark");

  const detail = await getMirrorArchiveItemBinding(user.userId, bookmarkItem.id);
  assert.equal(detail.archive_item.id, bookmarkItem.id);
  assert.equal(detail.archiveItem.id, bookmarkItem.id);
  assert.equal("bars" in detail.archive_item.metadata, false);

  await resetDataBindingForTests();
});

test("mirror archive API returns index and item detail", async () => {
  await resetDataBindingForTests();

  const user = {
    userId: "p9-archive-api",
    maskedPhone: "137****7788",
    phoneTail: "7788",
    inviteSource: "P9A"
  };

  const bookmark = await createTrainingBookmarkBinding(user.userId, {
    user,
    bookmark_type: "session",
    session_id: "session-api-p9",
    source_type: "custom_session",
    title: "整局收藏"
  });

  const listed = await request({
    method: "GET",
    url: "/api/v1/data-binding/users/p9-archive-api/mirror-archive"
  });
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.body.ok, true);
  assert.equal(listed.body.archive_index.by_type.training_bookmark, 1);

  const itemId = listed.body.archive_index.latest_items.find((item) => item.source_id === bookmark.training_bookmark.id).id;
  const detail = await request({
    method: "GET",
    url: `/api/v1/data-binding/users/p9-archive-api/mirror-archive/${encodeURIComponent(itemId)}`
  });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.body.archive_item.id, itemId);
  assert.equal(detail.body.archive_item.type, "training_bookmark");

  const missing = await request({
    method: "GET",
    url: "/api/v1/data-binding/users/p9-archive-api/mirror-archive/missing"
  });
  assert.equal(missing.statusCode, 404);

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
  const parsedUrl = new URL(url, "http://localhost:8787");
  const handled = await handleDataBindingRoute(req, res, {
    url: parsedUrl,
    pathname: parsedUrl.pathname
  });
  if (!handled && !res.finished) {
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
    const rawBody = Buffer.concat(this.chunks).toString("utf8");
    return {
      statusCode: this.statusCode,
      headers: this.headers,
      body: rawBody ? JSON.parse(rawBody) : null
    };
  }
}
