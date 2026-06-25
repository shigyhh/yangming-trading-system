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
  buildTradeReviewUrl,
  getApiBase,
  fetchLivingMirrorGrowthProjection,
  fetchLivingMirrorProfile,
  fetchTodayState,
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

const tradeReviewUrl = buildTradeReviewUrl({
  userId: "user 001",
  eventId: "one thought/event 001"
});
assert.strictEqual(
  tradeReviewUrl,
  "https://xxjyxt.com/trade-review?userId=user%20001&eventId=one%20thought%2Fevent%20001"
);
assert.strictEqual(buildTradeReviewUrl({ userId: "", eventId: "evt-001" }), null);
assert.strictEqual(buildTradeReviewUrl({ userId: "user-001", eventId: "" }), null);
assert.strictEqual(tradeReviewUrl.includes(["to", "ken"].join("")), false);
assert.strictEqual(tradeReviewUrl.includes(["open", "Id"].join("")), false);
assert.strictEqual(tradeReviewUrl.includes(["union", "Id"].join("")), false);

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

const compactSchemaNormalized = normalizeKlineTrainingSliceResult({
  ok: true,
  slice: {
    source: "server_cache",
    symbol: "600519",
    timeframe: "101",
    candles: [
      { t: "2026-02-01", o: 1, h: 2, l: 0.8, c: 1.5, v: 100 },
      { t: "2026-02-02", o: 1.5, h: 2.1, l: 1.2, c: 1.8, v: 120 },
      { t: "2026-02-03", o: 1.8, h: 2.4, l: 1.7, c: 2.2, v: 140 },
      { t: "2026-02-04", o: 2.2, h: 2.3, l: 1.9, c: 2.0, v: 130 },
      { t: "2026-02-05", o: 2.0, h: 2.5, l: 1.9, c: 2.3, v: 150 },
      { t: "2026-02-06", o: 2.3, h: 2.6, l: 2.1, c: 2.4, v: 160 }
    ]
  }
});
assert.strictEqual(compactSchemaNormalized.ok, true);
assert.strictEqual(compactSchemaNormalized.slice.candles[0].time, "2026-02-01");
assert.strictEqual(compactSchemaNormalized.slice.candles[0].open, 1);
assert.strictEqual(compactSchemaNormalized.slice.candles[0].volume, 100);

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
    requestedUrl = options.url;
    options.success({
      statusCode: 200,
      data: {
        ok: true,
        slice: {
          source: "server_cache",
          candles: Array.from({ length: 6 }, (_, index) => ({
            time: `2026-03-0${index + 1}`,
            open: 1,
            high: 2,
            low: 0.8,
            close: 1.5
          }))
        }
      }
    });
  };
  await fetchKlineTrainingSlice({ marketKey: "cn", timeframeKey: "1d" });
  assert.ok(requestedUrl.includes("window=150"));

  resetStorage();
  delete storage.zhixing_api_base;
  delete storage.zhixing_api_base_enabled;
  envVersion = "develop";
  global.wx.request = (options) => {
    requestedUrl = options.url;
    options.success({
      statusCode: 200,
      data: {
        ok: true,
        slice: {
          source: "server_cache",
          candles: Array.from({ length: 6 }, (_, index) => ({
            time: `2026-04-0${index + 1}`,
            open: 1,
            high: 2,
            low: 0.8,
            close: 1.5
          }))
        }
      }
    });
  };
  const developFallbackSlice = await fetchKlineTrainingSlice({ marketKey: "cn", timeframeKey: "1d" });
  assert.ok(requestedUrl.startsWith("https://xxjyxt.com/api/v1/kline-history/slice?"));
  assert.strictEqual(developFallbackSlice.ok, true);

  resetStorage();
  envVersion = "release";
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

async function runLivingMirrorProfileTests() {
  resetStorage();
  envVersion = "release";
  let requestedUrl = "";
  global.wx.request = (options) => {
    requestedUrl = options.url;
    options.success({
      statusCode: 200,
      data: {
        ok: true,
        profile: {
          totalEvents: 7,
          dominantReaction: "怕错过",
          repeatedThoughts: ["想追进去", "想改计划"],
          latestBoundaryState: "先停十秒",
          updatedAt: "2026-06-21T09:10:00.000Z"
        }
      }
    });
  };
  const profile = await fetchLivingMirrorProfile("user 001");
  assert.ok(requestedUrl.endsWith("/api/v1/users/user%20001/living-mirror/profile"));
  assert.strictEqual(profile.ok, true);
  assert.strictEqual(profile.totalEvents, 7);
  assert.strictEqual(profile.dominantReaction, "怕错过");
  assert.deepStrictEqual(profile.repeatedThoughts, ["想追进去", "想改计划"]);
  assert.strictEqual(profile.latestBoundaryState, "先停十秒");
  assert.strictEqual(profile.updatedAt, "2026-06-21T09:10:00.000Z");

  let missingUserRequested = false;
  global.wx.request = () => {
    missingUserRequested = true;
  };
  const missingUser = await fetchLivingMirrorProfile("");
  assert.strictEqual(missingUserRequested, false);
  assert.strictEqual(missingUser.ok, false);
  assert.strictEqual(missingUser.status, "missing_user");
  assert.strictEqual(missingUser.totalEvents, 0);

  global.wx.request = (options) => {
    options.fail({ errMsg: "network down" });
  };
  const networkFallback = await fetchLivingMirrorProfile("user-001");
  assert.strictEqual(networkFallback.ok, false);
  assert.strictEqual(networkFallback.status, "network_error");
  assert.strictEqual(networkFallback.totalEvents, 0);
  assert.ok(networkFallback.errorMessage.includes("network down"));

  global.wx.request = (options) => {
    options.success({ statusCode: 200, data: { ok: true, profile: {} } });
  };
  const emptyFallback = await fetchLivingMirrorProfile("user-001");
  assert.strictEqual(emptyFallback.ok, false);
  assert.strictEqual(emptyFallback.status, "empty");
  assert.strictEqual(emptyFallback.totalEvents, 0);
}

async function runLivingMirrorGrowthProjectionTests() {
  resetStorage();
  envVersion = "release";
  let requestedUrl = "";
  global.wx.request = (options) => {
    requestedUrl = options.url;
    options.success({
      statusCode: 200,
      data: {
        ok: true,
        projection: {
          stageText: "显影",
          topThoughtText: "想改计划",
          completedDays: 7,
          nextActionText: "下一次交易前，先照见这一念",
          zhixingText: "逐步稳定",
          updatedAt: "2026-06-22T10:00:00.000Z"
        }
      }
    });
  };
  const growth = await fetchLivingMirrorGrowthProjection("user 001");
  assert.ok(requestedUrl.endsWith("/api/v1/users/user%20001/living-mirror/growth"));
  assert.strictEqual(growth.ok, true);
  assert.strictEqual(growth.source, "server_growth_projection");
  assert.strictEqual(growth.stageText, "显影");
  assert.strictEqual(growth.topThoughtText, "想改计划");
  assert.strictEqual(growth.completedDays, 7);
  assert.strictEqual(growth.nextActionText, "下一次交易前，先照见这一念");
  assert.strictEqual(growth.zhixingText, "逐步稳定");
  assert.strictEqual(growth.updatedAt, "2026-06-22T10:00:00.000Z");

  global.wx.request = (options) => {
    options.success({
      statusCode: 200,
      data: {
        ok: true,
        projection: {
          schemaVersion: "living_mirror_growth_projection_v1",
          highFrequencyThoughts: [{ thought: "想追这一段" }],
          trainingContinuity: {
            totalEvents: 3,
            activeDays: 2,
            latestRecordedAt: "2026-06-23T08:00:00.000Z"
          },
          mirrorLifeStage: "seed",
          nextCycleFocus: {
            title: "先照见一念",
            action: "记录下一次训练中的第一念"
          },
          zhixingStability: {
            totalText: "暂无训练事实"
          }
        }
      }
    });
  };
  const serverProjection = await fetchLivingMirrorGrowthProjection("user-001");
  assert.strictEqual(serverProjection.stageText, "seed");
  assert.strictEqual(serverProjection.topThoughtText, "想追这一段");
  assert.strictEqual(serverProjection.totalEvents, 3);
  assert.strictEqual(serverProjection.completedDays, 2);
  assert.strictEqual(serverProjection.nextActionText, "记录下一次训练中的第一念");
  assert.strictEqual(serverProjection.zhixingText, "暂无训练事实");
  assert.strictEqual(serverProjection.updatedAt, "2026-06-23T08:00:00.000Z");

  global.wx.request = (options) => {
    options.success({
      statusCode: 200,
      data: {
        ok: true,
        projection: {}
      }
    });
  };
  const emptyProjection = await fetchLivingMirrorGrowthProjection("user-001");
  assert.strictEqual(emptyProjection.ok, true);
  assert.strictEqual(emptyProjection.totalEvents, 0);
  assert.strictEqual(emptyProjection.stageText, "");

  let missingUserRequested = false;
  global.wx.request = () => {
    missingUserRequested = true;
  };
  const missingUser = await fetchLivingMirrorGrowthProjection("");
  assert.strictEqual(missingUserRequested, false);
  assert.strictEqual(missingUser, null);

  global.wx.request = (options) => {
    options.fail({ errMsg: "network down" });
  };
  const networkFallback = await fetchLivingMirrorGrowthProjection("user-001");
  assert.strictEqual(networkFallback, null);
}

async function runTodayStateTests() {
  resetStorage();
  envVersion = "release";
  let requestedUrl = "";
  global.wx.request = (options) => {
    requestedUrl = options.url;
    options.success({
      statusCode: 200,
      data: {
        ok: true,
        state: {
          status: "not_trained",
          nextAction: "K线训练",
          progress: 35,
          updatedAt: "2026-06-21T10:00:00.000Z"
        }
      }
    });
  };
  const todayState = await fetchTodayState("user 001");
  assert.ok(requestedUrl.endsWith("/api/v1/users/user%20001/today/state"));
  assert.strictEqual(todayState.ok, true);
  assert.strictEqual(todayState.status, "not_trained");
  assert.strictEqual(todayState.nextAction, "K线训练");
  assert.strictEqual(todayState.progress, 35);
  assert.strictEqual(todayState.updatedAt, "2026-06-21T10:00:00.000Z");

  let missingUserRequested = false;
  global.wx.request = () => {
    missingUserRequested = true;
  };
  const missingUser = await fetchTodayState("");
  assert.strictEqual(missingUserRequested, false);
  assert.strictEqual(missingUser.ok, false);
  assert.strictEqual(missingUser.status, "unknown");
  assert.strictEqual(missingUser.reason, "missing_user");

  global.wx.request = (options) => {
    options.fail({ errMsg: "network down" });
  };
  const networkFallback = await fetchTodayState("user-001");
  assert.strictEqual(networkFallback.ok, false);
  assert.strictEqual(networkFallback.status, "unknown");
  assert.strictEqual(networkFallback.reason, "network_error");
  assert.strictEqual(networkFallback.progress, 0);
  assert.ok(networkFallback.errorMessage.includes("network down"));

  global.wx.request = (options) => {
    options.success({ statusCode: 200, data: { ok: true, state: { status: "surprise", nextAction: "未知动作", progress: 20 } } });
  };
  const unknownStatus = await fetchTodayState("user-001");
  assert.strictEqual(unknownStatus.ok, true);
  assert.strictEqual(unknownStatus.status, "unknown");
  assert.strictEqual(unknownStatus.nextAction, "未知动作");
  assert.strictEqual(unknownStatus.progress, 20);

  global.wx.request = (options) => {
    options.success({ statusCode: 200, data: { ok: true } });
  };
  const emptyState = await fetchTodayState("user-001");
  assert.strictEqual(emptyState.ok, false);
  assert.strictEqual(emptyState.status, "unknown");
  assert.strictEqual(emptyState.reason, "empty");
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

function withOneThoughtEvent(record, status = "local_saved") {
  return Object.assign({}, record, {
    localRecordId: record.localRecordId || record.id,
    linkedOneThoughtEventId: `one-thought-${record.id}`,
    oneThoughtEvent: {
      eventId: `one-thought-${record.id}`,
      localRecordId: record.localRecordId || record.id,
      eventType: "kline_training",
      userId: "",
      anonymousId: "anon-open-loop-001",
      market: "cn_equity",
      symbol: "local-demo",
      timeframe: "30m",
      mode: "step_replay",
      klineSource: "local_demo",
      serverSliceStatus: "network_error",
      serverSliceError: "K线服务暂不可用",
      firstThought: "当前为本地练习样本，我只记录第一念。",
      reactionChoice: "急躁",
      boundaryState: "停十秒",
      mirrorType: "冲动型",
      relatedMirror: "冲动型",
      clientSyncStatus: status,
      createdAt: 1764547300000,
      completedAt: 1764547300000,
      updatedAt: 1764547300000
    }
  });
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
  const eventPosts = [];
  global.wx.request = (options) => {
    if (options.url.endsWith("/api/v1/auth/demo-login")) {
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          user: { id: "demo-login", display_name: "测试同修" },
          access_token: "token-001a",
          expires_at: "2099-01-01T00:00:00.000Z"
        }
      });
      return;
    }
    if (options.url.endsWith("/kline-records")) {
      eventPosts.push(options.data.record.oneThoughtEvent);
      options.success({ statusCode: 200, data: { ok: true, record: options.data.record } });
      return;
    }
    options.fail({ errMsg: "unexpected request" });
  };
  const eventRecord = withOneThoughtEvent(makeKlineRecord("kr-event-sync-001"));
  storage.ym_kline_mind_records = {
    "2026-06-21": eventRecord
  };
  await syncKlineTrainingRecord(eventRecord, { force: true });
  assert.strictEqual(eventPosts.length, 1);
  assert.strictEqual(eventPosts[0].eventId, "one-thought-kr-event-sync-001");
  assert.strictEqual(eventPosts[0].eventType, "kline_training");
  assert.strictEqual(eventPosts[0].klineSource, "local_demo");
  assert.strictEqual(eventPosts[0].serverSliceStatus, "network_error");
  assert.strictEqual(JSON.stringify(eventPosts[0]).includes("13800138000"), false);
  assert.strictEqual(storage.ym_kline_mind_records["2026-06-21"].oneThoughtEvent.clientSyncStatus, "synced");
  assert.strictEqual(storage.ym_kline_mind_records["2026-06-21"].oneThoughtEvent.eventId, "one-thought-kr-event-sync-001");

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
  global.wx.request = (options) => {
    if (options.url.endsWith("/api/v1/auth/demo-login")) {
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          user: { id: "demo-login", display_name: "测试同修" },
          access_token: "token-002a",
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
  const eventFailRecord = withOneThoughtEvent(makeKlineRecord("kr-event-fail-001"));
  storage.ym_kline_mind_records = {
    "2026-06-21": eventFailRecord
  };
  await assert.rejects(() => syncKlineTrainingRecord(eventFailRecord, { force: true }), /network down/);
  assert.strictEqual(storage.ym_kline_mind_records["2026-06-21"].oneThoughtEvent.clientSyncStatus, "pending_retry");
  assert.strictEqual(storage.ym_kline_mind_records["2026-06-21"].oneThoughtEvent.eventId, "one-thought-kr-event-fail-001");

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
  storage.ym_kline_mind_records = {
    "2026-06-22": withOneThoughtEvent(makeKlineRecord("kr-event-pending-001"), "pending_retry")
  };
  const retryResult = await retryPendingKlineTrainingSync();
  assert.deepStrictEqual(retryPosts, ["kr-pending-001", "kr-failed-001", "kr-event-pending-001"]);
  assert.strictEqual(retryResult.synced, 3);
  assert.strictEqual(retryResult.failed, 0);
  assert.strictEqual(storage.ym_kline_review_reports.records.length, 3);
  assert.strictEqual(
    storage.ym_kline_review_reports.records.find((item) => item.id === "kr-synced-001").klineTrainingSyncStatus,
    "synced"
  );
  assert.strictEqual(storage.ym_kline_mind_records["2026-06-22"].oneThoughtEvent.clientSyncStatus, "synced");
  assert.strictEqual(storage.ym_kline_mind_records["2026-06-22"].oneThoughtEvent.eventId, "one-thought-kr-event-pending-001");
}

runKlineSliceTests()
  .then(runLivingMirrorProfileTests)
  .then(runLivingMirrorGrowthProjectionTests)
  .then(runTodayStateTests)
  .then(runKlineSyncTests)
  .then(() => console.log("miniprogram api tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
