const assert = require("assert");

const storage = {};
let envVersion = "release";

global.wx = {
  getStorageSync(key) {
    return storage[key];
  },
  setStorageSync(key, value) {
    storage[key] = value;
  },
  getAccountInfoSync() {
    return { miniProgram: { envVersion } };
  }
};

const {
  PRODUCTION_API_BASE,
  getApiBase,
  fetchKlineTrainingSlice,
  normalizeKlineTrainingSliceResult,
  syncKlineTrainingRecord,
  retryPendingKlineTrainingSync
} = require("./api");

assert.strictEqual(PRODUCTION_API_BASE, "https://xxjyxt.com");
storage.zhixing_api_base = "http://127.0.0.1:8787";
envVersion = "release";
assert.strictEqual(getApiBase(), "https://xxjyxt.com");

envVersion = "develop";
assert.strictEqual(getApiBase(), "http://127.0.0.1:8787");

const normalized = normalizeKlineTrainingSliceResult({
  ok: true,
  slice: {
    id: "slice-001",
    source: "server",
    symbol: "600519",
    timeframe: "1d",
    manifest_status: "ok",
    candles: [
      { time: "2026-01-01", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 },
      { time: "2026-01-02", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 },
      { time: "2026-01-03", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 },
      { time: "2026-01-04", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 },
      { time: "2026-01-05", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 },
      { time: "2026-01-06", open: 1, high: 2, low: 0.8, close: 1.5, volume: 100 }
    ]
  }
});
assert.strictEqual(normalized.ok, true);
assert.strictEqual(normalized.source, "server");
assert.strictEqual(normalized.barCount, 6);
assert.strictEqual(normalized.slice.candles.length, 6);

const empty = normalizeKlineTrainingSliceResult({ ok: true, slice: { candles: [] } });
assert.strictEqual(empty.ok, false);
assert.strictEqual(empty.reason, "empty_slice");

const insufficient = normalizeKlineTrainingSliceResult({ ok: true, slice: { candles: [{ open: 1 }] } });
assert.strictEqual(insufficient.ok, false);
assert.strictEqual(insufficient.reason, "insufficient_slice");

async function runKlineSliceTests() {
  resetStorage();
  envVersion = "release";
  let requestedUrl = "";
  global.wx.request = (options) => {
    requestedUrl = options.url;
    options.success({
      statusCode: 200,
      data: {
        ok: true,
        slice: {
          id: "server-slice-001",
          source: "server_cache",
          symbol: "600519",
          timeframe: "101",
          candles: [
            { time: "2026-01-01", open: 1, high: 2, low: 0.8, close: 1.5 },
            { time: "2026-01-02", open: 1, high: 2, low: 0.8, close: 1.5 },
            { time: "2026-01-03", open: 1, high: 2, low: 0.8, close: 1.5 },
            { time: "2026-01-04", open: 1, high: 2, low: 0.8, close: 1.5 },
            { time: "2026-01-05", open: 1, high: 2, low: 0.8, close: 1.5 },
            { time: "2026-01-06", open: 1, high: 2, low: 0.8, close: 1.5 }
          ]
        }
      }
    });
  };
  const serverSlice = await fetchKlineTrainingSlice({
    marketKey: "cn",
    symbol: "600519",
    timeframeKey: "1d",
    windowSize: 60,
    endDate: "2026-06-15"
  });
  assert.ok(requestedUrl.startsWith("https://xxjyxt.com/api/v1/kline-history/slice?"));
  assert.ok(requestedUrl.includes("market=cn_equity"));
  assert.ok(requestedUrl.includes("symbol=600519"));
  assert.ok(requestedUrl.includes("timeframe=101"));
  assert.ok(requestedUrl.includes("mode=step_replay"));
  assert.ok(requestedUrl.includes("end_date=2026-06-15"));
  assert.strictEqual(requestedUrl.includes("localhost"), false);
  assert.strictEqual(requestedUrl.includes("127.0.0.1"), false);
  assert.strictEqual(serverSlice.ok, true);
  assert.strictEqual(serverSlice.source, "server_cache");
  assert.strictEqual(serverSlice.slice.source, "server_cache");
  assert.strictEqual(serverSlice.slice.candles.length, 6);

  global.wx.request = (options) => {
    options.success({ statusCode: 200, data: { ok: true, slice: { source: "server_cache", candles: [] } } });
  };
  const emptySlice = await fetchKlineTrainingSlice({ marketKey: "cn", timeframeKey: "30m" });
  assert.strictEqual(emptySlice.ok, false);
  assert.strictEqual(emptySlice.source, "local_demo");
  assert.strictEqual(emptySlice.reason, "empty_slice");
  assert.ok(emptySlice.errorMessage.includes("历史数据未载入"));

  global.wx.request = (options) => {
    options.fail({ errMsg: "network down" });
  };
  const networkSlice = await fetchKlineTrainingSlice({ marketKey: "cn", timeframeKey: "60m" });
  assert.strictEqual(networkSlice.ok, false);
  assert.strictEqual(networkSlice.source, "local_demo");
  assert.strictEqual(networkSlice.reason, "network_error");
  assert.ok(networkSlice.errorMessage.includes("network down"));
}

function resetStorage() {
  Object.keys(storage).forEach((key) => {
    delete storage[key];
  });
  storage.zhixing_api_base = "http://127.0.0.1:8787";
  storage.zhixing_api_base_enabled = true;
  envVersion = "develop";
}

function makeKlineRecord(id, status = "pending") {
  return {
    id,
    sessionId: `session-${id}`,
    sceneId: "scene-fast-001",
    sceneTitle: "快速拉升场景",
    marketKey: "cn",
    timeframeKey: "1d",
    symbol: "历史盲练切片",
    startedAt: 1764547200000,
    completedAt: 1764547300000,
    candlesRange: { start: "2026-06-01", end: "2026-06-10" },
    userActions: [{ optionId: "rush", label: "想追", reactionTimeMs: 2400 }],
    mistakes: ["边界差点失守"],
    heartThieves: ["贪", "急"],
    scores: { boundaryKeeping: 54 },
    insight: "照见第一念，下一步让手慢半拍。",
    linkedTradeReviewId: `tr-${id}`,
    source: "miniprogram",
    createdAt: 1764547300000,
    klineTrainingSyncStatus: status,
    klineTrainingSyncError: ""
  };
}

async function runKlineSyncTests() {
  resetStorage();
  const postedKlineIds = [];
  global.wx.request = (options) => {
    if (options.path) throw new Error("unexpected path shape");
    if (options.url.endsWith("/api/v1/auth/demo-login")) {
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          user: { id: "demo-login", display_name: "测试同修" },
          access_token: "token-001",
          expires_at: "2099-01-01T00:00:00.000Z"
        }
      });
      return;
    }
    if (options.url.endsWith("/kline-records")) {
      postedKlineIds.push(options.data.record.idempotencyKey);
      options.success({ statusCode: 200, data: { ok: true, record: options.data.record } });
      return;
    }
    options.fail({ errMsg: "unexpected request" });
  };

  const syncedRecord = makeKlineRecord("kr-sync-001");
  storage.ym_kline_review_reports = {
    latest: syncedRecord,
    records: [syncedRecord]
  };
  await syncKlineTrainingRecord(syncedRecord, { force: true });
  assert.deepStrictEqual(postedKlineIds, ["kr-sync-001"]);
  assert.strictEqual(storage.ym_kline_review_reports.latest.klineTrainingSyncStatus, "synced");
  assert.ok(storage.ym_kline_review_reports.latest.klineTrainingLastSyncedAt);
  assert.strictEqual(storage.ym_kline_review_reports.latest.klineTrainingSyncError, "");

  resetStorage();
  global.wx.request = (options) => {
    if (options.url.endsWith("/api/v1/auth/demo-login")) {
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          user: { id: "demo-login", display_name: "测试同修" },
          access_token: "token-002",
          expires_at: "2099-01-01T00:00:00.000Z"
        }
      });
      return;
    }
    if (options.url.endsWith("/kline-records")) {
      options.fail({ errMsg: "network down" });
      return;
    }
    options.fail({ errMsg: "unexpected request" });
  };
  const failedRecord = makeKlineRecord("kr-fail-001");
  storage.ym_kline_review_reports = {
    latest: failedRecord,
    records: [failedRecord]
  };
  await assert.rejects(() => syncKlineTrainingRecord(failedRecord, { force: true }), /network down/);
  assert.strictEqual(storage.ym_kline_review_reports.latest.klineTrainingSyncStatus, "failed");
  assert.ok(storage.ym_kline_review_reports.latest.klineTrainingSyncError.includes("network down"));
  assert.strictEqual(storage.ym_kline_review_reports.records.length, 1);

  resetStorage();
  const retryPosts = [];
  global.wx.request = (options) => {
    if (options.url.endsWith("/api/v1/auth/demo-login")) {
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          user: { id: "demo-login", display_name: "测试同修" },
          access_token: "token-003",
          expires_at: "2099-01-01T00:00:00.000Z"
        }
      });
      return;
    }
    if (options.url.endsWith("/kline-records")) {
      retryPosts.push(options.data.record.idempotencyKey);
      options.success({ statusCode: 200, data: { ok: true, record: options.data.record } });
      return;
    }
    options.fail({ errMsg: "unexpected request" });
  };
  storage.ym_kline_review_reports = {
    latest: makeKlineRecord("kr-pending-001", "pending"),
    records: [
      makeKlineRecord("kr-pending-001", "pending"),
      makeKlineRecord("kr-failed-001", "failed"),
      makeKlineRecord("kr-synced-001", "synced")
    ]
  };
  const retryResult = await retryPendingKlineTrainingSync();
  assert.deepStrictEqual(retryPosts, ["kr-pending-001", "kr-failed-001"]);
  assert.strictEqual(retryResult.synced, 2);
  assert.strictEqual(retryResult.failed, 0);
  assert.strictEqual(storage.ym_kline_review_reports.records.length, 3);
  assert.strictEqual(
    storage.ym_kline_review_reports.records.find((item) => item.id === "kr-synced-001").klineTrainingSyncStatus,
    "synced"
  );
}

runKlineSliceTests()
  .then(runKlineSyncTests)
  .then(() => console.log("miniprogram api tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
