const {
  collectLocalState,
  applyRemoteState,
  applyTrainingPrescriptionDispatch,
  getProfile,
  getKlineReviewReports,
  saveKlineReviewSyncStatus,
  saveKlineMindOneThoughtEventSyncStatus,
  getPendingKlineMindOneThoughtRecords,
  saveSyncStatus
} = require("./store");
const {
  buildAssessmentBindingPayload,
  buildRetestBindingPayload,
  shouldSyncRetest,
  buildTrainingBindingPayload,
  buildKLineBindingPayload,
  buildTradeReviewBindingPayload,
  buildShareCardBindingPayload,
  buildDataBindingUser
} = require("./data-binding-adapter");

const API_BASE_KEY = "zhixing_api_base";
const API_BASE_ENABLED_KEY = "zhixing_api_base_enabled";
const AUTH_KEY = "zhixing_api_auth";
const CLIENT_ID_KEY = "zhixing_client_id";
const PRODUCTION_API_BASE = "https://xxjyxt.com";
const DEFAULT_API_BASE = "http://127.0.0.1:8787";
const KLINE_MIN_CANDLES = 6;
const KLINE_TRAINING_WINDOW_SIZE = 180;
const SAFE_CONNECTION_MESSAGE = "后端同步：暂未连接";
const SAFE_FALLBACK_TEXT = "本地档案已保存。可稍后再同步，也可以先继续今日修行。";

function getMiniProgramEnvVersion() {
  try {
    return ((wx.getAccountInfoSync() || {}).miniProgram || {}).envVersion || "develop";
  } catch (error) {
    return "develop";
  }
}

function isReleaseEnv() {
  return getMiniProgramEnvVersion() === "release";
}

function getApiBase() {
  if (isReleaseEnv()) return PRODUCTION_API_BASE;
  return wx.getStorageSync(API_BASE_KEY) || DEFAULT_API_BASE;
}

function pickProjectionText(...values) {
  for (const value of values) {
    const candidates = Array.isArray(value) ? value : [value];
    for (const item of candidates) {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object") {
        const text = item.text || item.thought || item.title || item.action || item.label || item.name || "";
        if (typeof text === "string" && text.trim()) return text.trim();
      }
    }
  }
  return "";
}

function pickProjectionNumber(...values) {
  for (const value of values) {
    if (value === "" || value === null || value === undefined) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function buildTradeReviewUrl({ userId = "", eventId = "" } = {}) {
  const safeUserId = String(userId || "").trim();
  const safeEventId = String(eventId || "").trim();
  if (!safeUserId || !safeEventId) return null;
  return `${PRODUCTION_API_BASE}/trade-review?userId=${encodeURIComponent(safeUserId)}&eventId=${encodeURIComponent(safeEventId)}`;
}

function buildLivingMirrorProfileFallback(status = "empty", errorMessage = "") {
  return {
    ok: false,
    status,
    source: "fallback",
    profile: null,
    totalEvents: 0,
    dominantReaction: "",
    repeatedThoughts: [],
    latestBoundaryState: "",
    updatedAt: "",
    empty: true,
    errorMessage
  };
}

function normalizeLivingMirrorProfileResult(result = {}) {
  const profile = result.profile || result.livingMirrorProfile || result.living_mirror_profile || result.data || {};
  const repeatedThoughts = Array.isArray(profile.repeatedThoughts)
    ? profile.repeatedThoughts
    : Array.isArray(profile.repeated_thoughts) ? profile.repeated_thoughts : [];
  const totalEvents = Number(profile.totalEvents || profile.total_events || profile.eventCount || profile.event_count || 0);
  const normalized = {
    ok: true,
    status: "ready",
    source: "server_profile",
    profile,
    totalEvents,
    dominantReaction: profile.dominantReaction || profile.dominant_reaction || "",
    repeatedThoughts,
    latestBoundaryState: profile.latestBoundaryState || profile.latest_boundary_state || "",
    updatedAt: profile.updatedAt || profile.updated_at || "",
    empty: false,
    errorMessage: ""
  };
  const empty = !normalized.totalEvents &&
    !normalized.dominantReaction &&
    !normalized.repeatedThoughts.length &&
    !normalized.latestBoundaryState;
  return empty ? buildLivingMirrorProfileFallback("empty") : normalized;
}

async function fetchLivingMirrorProfile(userId = "") {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) return buildLivingMirrorProfileFallback("missing_user");
  try {
    const result = await request({
      path: `/api/v1/users/${encodeURIComponent(safeUserId)}/living-mirror/profile`
    });
    return normalizeLivingMirrorProfileResult(result);
  } catch (error) {
    saveConnectionFallback(error, "活镜成长连接未完成");
    return buildLivingMirrorProfileFallback("network_error", getTechnicalMessage(error) || "活镜成长暂未连接");
  }
}

function normalizeLivingMirrorGrowthProjectionResult(result = {}) {
  const data = result.data || {};
  const projection = result.projection ||
    result.growthProjection ||
    result.livingMirrorGrowthProjection ||
    data.projection ||
    data.growthProjection ||
    data.livingMirrorGrowthProjection ||
    null;
  if (!projection || typeof projection !== "object") return null;
  const trainingContinuity = projection.trainingContinuity || projection.training_continuity || {};
  const nextCycleFocus = projection.nextCycleFocus || projection.next_cycle_focus || {};
  const zhixingStability = projection.zhixingStability || projection.zhixing_stability || {};
  const totalEvents = pickProjectionNumber(
    projection.totalEvents,
    projection.total_events,
    trainingContinuity.totalEvents,
    trainingContinuity.total_events
  );
  const activeDays = pickProjectionNumber(
    projection.activeDays,
    projection.active_days,
    trainingContinuity.activeDays,
    trainingContinuity.active_days
  );
  return {
    ok: result.ok !== false,
    source: "server_growth_projection",
    projection,
    totalEvents,
    activeDays,
    stage: pickProjectionText(projection.stage, projection.stageText, projection.currentStage, projection.current_stage, projection.mirrorLifeStage, projection.mirror_life_stage),
    stageText: pickProjectionText(projection.stageText, projection.stage, projection.currentStage, projection.current_stage, projection.mirrorLifeStage, projection.mirror_life_stage),
    topThought: pickProjectionText(projection.topThought, projection.topThoughtText, projection.highFrequencyThought, projection.high_frequency_thought, projection.highFrequencyThoughts, projection.high_frequency_thoughts),
    topThoughtText: pickProjectionText(projection.topThoughtText, projection.topThought, projection.highFrequencyThought, projection.high_frequency_thought, projection.highFrequencyThoughts, projection.high_frequency_thoughts),
    completedDays: pickProjectionNumber(projection.completedDays, projection.completed_days, projection.practiceDays, projection.practice_days, activeDays),
    nextAction: pickProjectionText(projection.nextAction, projection.next_action, projection.nextActionText, nextCycleFocus.action, nextCycleFocus.title),
    nextActionText: pickProjectionText(projection.nextActionText, projection.nextAction, projection.next_action, nextCycleFocus.action, nextCycleFocus.title),
    zhixing: projection.zhixing || projection.zhixingScore || projection.zhixing_score || "",
    zhixingText: pickProjectionText(projection.zhixingText, projection.zhixingScoreText, projection.zhixing_score_text, zhixingStability.totalText, zhixingStability.total_text, zhixingStability.summary),
    updatedAt: projection.updatedAt || projection.updated_at || trainingContinuity.latestRecordedAt || trainingContinuity.latest_recorded_at || ""
  };
}

async function fetchLivingMirrorGrowthProjection(userId = "") {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) return null;
  try {
    const result = await request({
      path: `/api/v1/users/${encodeURIComponent(safeUserId)}/living-mirror/growth`
    });
    return normalizeLivingMirrorGrowthProjectionResult(result);
  } catch (error) {
    saveConnectionFallback(error, "活镜成长投影连接未完成");
    return null;
  }
}

const TODAY_STATE_STATUSES = ["not_seen", "not_trained", "not_reviewed", "completed"];

function buildTodayStateFallback(reason = "empty", errorMessage = "") {
  return {
    ok: false,
    status: "unknown",
    reason,
    nextAction: "先照见这一念",
    progress: 0,
    updatedAt: "",
    empty: true,
    errorMessage
  };
}

function normalizeTodayStateResult(result = {}) {
  const state = result.state || result.todayState || result.today_state || result.data || {};
  const hasPayload = !!(state.status || state.nextAction || state.next_action || state.updatedAt || state.updated_at || Number(state.progress || 0));
  if (!hasPayload) return buildTodayStateFallback("empty");
  const rawStatus = String(state.status || "");
  const status = TODAY_STATE_STATUSES.includes(rawStatus) ? rawStatus : "unknown";
  return {
    ok: result.ok !== false,
    status,
    reason: "",
    nextAction: state.nextAction || state.next_action || "先照见这一念",
    progress: Math.max(0, Math.min(100, Number(state.progress || 0))),
    updatedAt: state.updatedAt || state.updated_at || "",
    empty: false,
    errorMessage: ""
  };
}

async function fetchTodayState(userId = "") {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) return buildTodayStateFallback("missing_user");
  try {
    const result = await request({
      path: `/api/v1/users/${encodeURIComponent(safeUserId)}/today/state`
    });
    return normalizeTodayStateResult(result);
  } catch (error) {
    saveConnectionFallback(error, "今日状态连接未完成");
    return buildTodayStateFallback("network_error", getTechnicalMessage(error) || "今日状态暂未连接");
  }
}

function hasConfiguredApiBase() {
  if (isReleaseEnv()) return true;
  return !!wx.getStorageSync(API_BASE_ENABLED_KEY);
}

function setApiBase(value) {
  if (isReleaseEnv()) {
    wx.setStorageSync(API_BASE_KEY, PRODUCTION_API_BASE);
    wx.setStorageSync(API_BASE_ENABLED_KEY, true);
    return PRODUCTION_API_BASE;
  }
  const next = String(value || "").trim().replace(/\/$/, "");
  wx.setStorageSync(API_BASE_KEY, next || DEFAULT_API_BASE);
  wx.setStorageSync(API_BASE_ENABLED_KEY, true);
  return getApiBase();
}

function getAuthSession() {
  return wx.getStorageSync(AUTH_KEY) || null;
}

function saveAuthSession(session) {
  wx.setStorageSync(AUTH_KEY, session);
  return session;
}

function getTechnicalMessage(error) {
  return error && error.message ? String(error.message).slice(0, 180) : "";
}

function saveConnectionFallback(error, message = SAFE_CONNECTION_MESSAGE) {
  saveSyncStatus({
    ok: false,
    syncing: false,
    message,
    fallbackTitle: "连接未完成",
    fallbackText: SAFE_FALLBACK_TEXT,
    technicalMessage: getTechnicalMessage(error),
    failedAt: Date.now()
  });
}

function getClientId() {
  let clientId = wx.getStorageSync(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = `mp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    wx.setStorageSync(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

function request({ path, method = "GET", data = null, token = "", apiBaseOverride = "", allowUnconfigured = false, timeout = 8000 }) {
  const apiBase = apiBaseOverride || getApiBase();
  return new Promise((resolve, reject) => {
    if (!allowUnconfigured && !hasConfiguredApiBase()) {
      reject(new Error("连接未完成"));
      return;
    }
    wx.request({
      url: `${apiBase}${path}`,
      method,
      data,
      timeout,
      header: Object.assign(
        {
          "content-type": "application/json"
        },
        token ? { Authorization: `Bearer ${token}` } : {}
      ),
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && body.ok !== false) {
          resolve(body);
          return;
        }
        reject(new Error(body.error || `请求失败：${res.statusCode}`));
      },
      fail(error) {
        reject(new Error(error.errMsg || "网络连接失败"));
      }
    });
  });
}

async function ensureAuth() {
  const cached = getAuthSession();
  if (cached && cached.access_token && cached.expires_at && new Date(cached.expires_at).getTime() > Date.now() + 60000) {
    return cached;
  }

  const profile = getProfile();
  let result;
  try {
    result = await request({
      path: "/api/v1/auth/demo-login",
      method: "POST",
      data: {
        method: "wechat_miniprogram_demo",
        display_name: profile.nickname || "修行者",
        contact: profile.phone || getClientId(),
        wechat_bound: true,
        source_channel: "微信小程序MVP"
      }
    });
  } catch (error) {
    saveConnectionFallback(error);
    throw error;
  }

  return saveAuthSession({
    user: result.user,
    access_token: result.access_token,
    expires_at: result.expires_at
  });
}

async function syncLocalState({ silent = true } = {}) {
  saveSyncStatus({ syncing: true, message: "同步中" });
  try {
    const auth = await ensureAuth();
    const result = await request({
      path: `/api/v1/users/${auth.user.id}/miniprogram-state`,
      method: "POST",
      token: auth.access_token,
      data: {
        source_channel: "微信小程序MVP",
        state: collectLocalState()
      }
    });
    saveSyncStatus({
      ok: true,
      syncing: false,
      message: "已同步",
      userId: auth.user.id,
      syncedAt: Date.now(),
      serverUpdatedAt: result.state && result.state.updated_at ? result.state.updated_at : ""
    });
    if (!silent) wx.showToast({ title: "已同步到后端", icon: "success" });
    return result.state;
  } catch (error) {
    saveConnectionFallback(error);
    if (!silent) wx.showToast({ title: "连接未完成，本地已保存", icon: "none" });
    throw error;
  }
}

async function pullRemoteState({ silent = true } = {}) {
  saveSyncStatus({ syncing: true, message: "拉取中" });
  try {
    const auth = await ensureAuth();
    const result = await request({
      path: `/api/v1/users/${auth.user.id}/miniprogram-state`,
      method: "GET",
      token: auth.access_token
    });
    applyRemoteState(result.state);
    saveSyncStatus({
      ok: true,
      syncing: false,
      message: "已拉取",
      userId: auth.user.id,
      syncedAt: Date.now(),
      serverUpdatedAt: result.state && result.state.updated_at ? result.state.updated_at : ""
    });
    if (!silent) wx.showToast({ title: "已从后端拉取", icon: "success" });
    return result.state;
  } catch (error) {
    saveConnectionFallback(error);
    if (!silent) wx.showToast({ title: "连接未完成，本地已保存", icon: "none" });
    throw error;
  }
}

async function syncCheckIn(note = "") {
  try {
    const auth = await ensureAuth();
    return request({
      path: `/api/v1/users/${auth.user.id}/check-in`,
      method: "POST",
      token: auth.access_token,
      data: {
        source_channel: "微信小程序MVP",
        note
      }
    });
  } catch (error) {
    saveConnectionFallback(error);
    throw error;
  }
}

async function syncAssessmentReport(report = null) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const payload = buildAssessmentBindingPayload({ auth, state, report: report || state.assessment_result });
    const result = await request({
      path: "/api/v1/data-binding/assessment-report",
      method: "POST",
      token: auth.access_token,
      data: payload
    });

    if (shouldSyncRetest(state)) {
      const boundUserId = (result.user && result.user.id) || payload.user.userId || auth.user.id;
      request({
        path: `/api/v1/data-binding/users/${encodeURIComponent(boundUserId)}/retests`,
        method: "POST",
        token: auth.access_token,
        data: buildRetestBindingPayload({ auth, state, report: report || state.assessment_result })
      }).catch(() => {});
    }

    return result;
  } catch (error) {
    saveConnectionFallback(error);
    throw error;
  }
}

async function syncTrainingProgress(progress = null) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const trainingPayload = buildTrainingBindingPayload({ auth, state, progress });
    if (!trainingPayload) {
      return { ok: true, skipped: true, reason: "暂无训练记录" };
    }

    const result = await request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(trainingPayload.user.userId)}/training-records`,
      method: "POST",
      token: auth.access_token,
      data: trainingPayload
    });

    const klinePayload = buildKLineBindingPayload({
      auth,
      state,
      progress: trainingPayload.practiceState,
      trainingRecord: trainingPayload.record
    });

    if (klinePayload) {
      request({
        path: `/api/v1/data-binding/users/${encodeURIComponent(klinePayload.user.userId)}/kline-records`,
        method: "POST",
        token: auth.access_token,
        data: klinePayload
      }).catch(() => {});
    }

    return result;
  } catch (error) {
    saveConnectionFallback(error);
    throw error;
  }
}

function isRecentKlineSyncPending(record = {}) {
  if ((record || {}).klineTrainingSyncStatus !== "pending") return false;
  const startedAt = Date.parse((record || {}).klineTrainingSyncStartedAt || "");
  if (!Number.isFinite(startedAt)) return false;
  return Date.now() - startedAt < 30000;
}

async function syncKlineTrainingRecord(record = null, options = {}) {
  const reviewId = String((record || {}).id || (record || {}).localRecordId || "");
  const oneThoughtEventId = String(((record || {}).oneThoughtEvent || {}).eventId || (record || {}).linkedOneThoughtEventId || "");
  const eventSyncStatus = ((record || {}).oneThoughtEvent || {}).clientSyncStatus || (record || {}).clientSyncStatus || "";
  if ((record || {}).klineTrainingSyncStatus === "synced" && (!oneThoughtEventId || eventSyncStatus === "synced")) {
    return { ok: true, skipped: true, reason: "K线训练已同步" };
  }
  if (!options.force && isRecentKlineSyncPending(record || {})) {
    return { ok: true, skipped: true, reason: "K线训练同步进行中" };
  }

  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const payload = buildKLineBindingPayload({ auth, state, klineRecord: record });
    if (!payload) {
      return { ok: true, skipped: true, reason: "暂无K线训练记录" };
    }

    saveKlineReviewSyncStatus(reviewId || payload.record.id, {
      klineTrainingSyncStatus: "pending",
      klineTrainingSyncStartedAt: new Date().toISOString(),
      klineTrainingSyncError: ""
    });
    saveKlineMindOneThoughtEventSyncStatus(oneThoughtEventId, {
      clientSyncStatus: "syncing",
      clientSyncStartedAt: new Date().toISOString(),
      clientSyncError: ""
    });

    const result = await request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(payload.user.userId)}/kline-records`,
      method: "POST",
      token: auth.access_token,
      data: payload
    });
    const syncedAt = new Date().toISOString();
    saveKlineReviewSyncStatus(reviewId || payload.record.id, {
      klineTrainingSyncStatus: "synced",
      klineTrainingLastSyncedAt: syncedAt,
      klineTrainingSyncStartedAt: "",
      klineTrainingSyncError: ""
    });
    saveKlineMindOneThoughtEventSyncStatus(oneThoughtEventId, {
      clientSyncStatus: "synced",
      clientSyncStartedAt: "",
      clientSyncLastSyncedAt: syncedAt,
      clientSyncError: ""
    });
    saveSyncStatus({
      ok: true,
      syncing: false,
      message: "K线训练已同步",
      userId: payload.user.userId,
      klineTrainingSyncStatus: "synced",
      klineTrainingLastSyncedAt: syncedAt,
      klineTrainingId: payload.record.id
    });
    return result;
  } catch (error) {
    saveKlineReviewSyncStatus(reviewId, {
      klineTrainingSyncStatus: "failed",
      klineTrainingSyncError: getTechnicalMessage(error)
    });
    saveKlineMindOneThoughtEventSyncStatus(oneThoughtEventId, {
      clientSyncStatus: "pending_retry",
      clientSyncStartedAt: "",
      clientSyncError: getTechnicalMessage(error)
    });
    saveSyncStatus({
      ok: false,
      syncing: false,
      message: SAFE_CONNECTION_MESSAGE,
      klineTrainingSyncStatus: "failed",
      klineTrainingSyncError: getTechnicalMessage(error),
      failedAt: Date.now()
    });
    throw error;
  }
}

async function retryPendingKlineTrainingSync(options = {}) {
  const state = getKlineReviewReports();
  const reviewRecords = (state.records || []).filter((record) => {
    const status = (record || {}).klineTrainingSyncStatus || "";
    return status === "pending" || status === "failed";
  });
  const pendingEventRecords = getPendingKlineMindOneThoughtRecords();
  const seen = new Set();
  const records = reviewRecords.concat(pendingEventRecords).filter((record) => {
    const key = String(((record || {}).oneThoughtEvent || {}).eventId || (record || {}).id || (record || {}).localRecordId || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const summary = {
    ok: true,
    attempted: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  for (const record of records) {
    summary.attempted += 1;
    try {
      const result = await syncKlineTrainingRecord(record, Object.assign({}, options, { force: true }));
      if (result && result.skipped) {
        summary.skipped += 1;
      } else {
        summary.synced += 1;
      }
    } catch (error) {
      summary.ok = false;
      summary.failed += 1;
      summary.errors.push({
        id: String((record || {}).id || ""),
        message: getTechnicalMessage(error)
      });
    }
  }

  return summary;
}

async function syncTradeReviewRecord(review = null) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const payload = buildTradeReviewBindingPayload({ auth, state, review });
    if (!payload) {
      return { ok: true, skipped: true, reason: "暂无真实复盘" };
    }
    const result = await request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(payload.user.userId)}/trade-reviews`,
      method: "POST",
      token: auth.access_token,
      data: payload
    });
    saveSyncStatus({
      ok: true,
      syncing: false,
      message: "真实复盘已同步",
      userId: payload.user.userId,
      tradeReviewSyncStatus: "synced",
      tradeReviewLastSyncedAt: Date.now(),
      tradeReviewId: payload.review.id
    });
    return result;
  } catch (error) {
    saveConnectionFallback(error);
    throw error;
  }
}

async function requestTradeReviewOcrDraft({ imagePath = "", imageMeta = {} } = {}) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    return request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/trade-review-ocr`,
      method: "POST",
      token: auth.access_token,
      data: {
        user,
        image: {
          localPath: imagePath,
          fileName: imageMeta.fileName || "",
          size: imageMeta.size || 0,
          width: imageMeta.width || 0,
          height: imageMeta.height || 0
        },
        source: "miniprogram"
      }
    });
  } catch (error) {
    saveConnectionFallback(error);
    throw error;
  }
}

async function pullTrainingPrescription({ silent = true } = {}) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    const result = await request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/training-prescription`,
      method: "GET",
      token: auth.access_token
    });
    const prescription = applyTrainingPrescriptionDispatch(result);
    saveSyncStatus({
      ok: true,
      syncing: false,
      message: "已接收今日训练",
      userId: user.userId,
      syncedAt: Date.now()
    });
    if (!silent) wx.showToast({ title: "已接收今日训练", icon: "success" });
    return prescription;
  } catch (error) {
    saveConnectionFallback(error);
    if (!silent) wx.showToast({ title: "连接未完成，本地已保存", icon: "none" });
    throw error;
  }
}

async function syncShareAttribution(event = null) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const payload = buildShareCardBindingPayload({ auth, state, event });
    return request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(payload.user.userId)}/share-card`,
      method: "POST",
      token: auth.access_token,
      data: {
        channel: payload.channel,
        source_channel: payload.source_channel
      }
    });
  } catch (error) {
    saveConnectionFallback(error);
    throw error;
  }
}

const KLINE_MARKET_MAP = {
  cn_equity: "cn_equity",
  cn: "cn_equity",
  ashare: "cn_equity"
};

const KLINE_TIMEFRAME_MAP = {
  "101": "101",
  "1d": "101",
  "60m": "60m",
  "30m": "30m"
};

const klineSliceCache = {};
const klineSliceRequests = {};

function buildKlineSliceCacheKey({
  marketKey = "cn",
  timeframeKey = "101",
  symbol = "",
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  mode = "step_replay",
  endDate = "",
  entryTime = "",
  personalityType = "",
  gateKey = "shi_shang_mo",
  blind = true,
  seed = ""
} = {}) {
  const market = KLINE_MARKET_MAP[marketKey] || "cn_equity";
  const timeframe = KLINE_TIMEFRAME_MAP[timeframeKey] || "101";
  return [
    market,
    timeframe,
    String(symbol || ""),
    String(windowSize || KLINE_TRAINING_WINDOW_SIZE),
    String(mode || "step_replay"),
    String(endDate || ""),
    String(entryTime || ""),
    String(personalityType || ""),
    String(gateKey || ""),
    blind ? "blind" : "open",
    String(seed || "")
  ].join("|");
}

async function fetchKlineTrainingSlice({
  marketKey = "cn",
  timeframeKey = "101",
  symbol = "",
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  mode = "step_replay",
  endDate = "",
  entryTime = "",
  personalityType = "",
  gateKey = "shi_shang_mo",
  blind = true,
  seed = ""
} = {}) {
  const market = KLINE_MARKET_MAP[marketKey] || "cn_equity";
  const timeframe = KLINE_TIMEFRAME_MAP[timeframeKey] || "101";
  const cacheKey = buildKlineSliceCacheKey({
    marketKey,
    timeframeKey,
    symbol,
    windowSize,
    mode,
    endDate,
    entryTime,
    personalityType,
    gateKey,
    blind,
    seed
  });
  if (klineSliceCache[cacheKey]) return klineSliceCache[cacheKey];
  if (klineSliceRequests[cacheKey]) return klineSliceRequests[cacheKey];
  const query = [
    `market=${encodeURIComponent(market)}`,
    symbol ? `symbol=${encodeURIComponent(symbol)}` : "",
    `timeframe=${encodeURIComponent(timeframe)}`,
    `window=${encodeURIComponent(windowSize)}`,
    endDate ? `end_date=${encodeURIComponent(endDate)}` : "",
    entryTime ? `entryTime=${encodeURIComponent(entryTime)}` : "",
    `mode=${encodeURIComponent(mode)}`,
    personalityType ? `personality_type=${encodeURIComponent(personalityType)}` : "",
    gateKey ? `gate=${encodeURIComponent(gateKey)}` : "",
    `blind=${blind ? "1" : "0"}`,
    seed ? `seed=${encodeURIComponent(seed)}` : ""
  ].filter(Boolean).join("&");
  klineSliceRequests[cacheKey] = (async () => {
    try {
      const useProductionFallback = !hasConfiguredApiBase();
      const result = await request({
        path: `/api/v1/kline-history/slice?${query}`,
        apiBaseOverride: useProductionFallback ? PRODUCTION_API_BASE : "",
        allowUnconfigured: useProductionFallback,
        timeout: 25000
      });
      const normalized = normalizeKlineTrainingSliceResult(result, { market, timeframe, symbol, windowSize });
      if (normalized.ok && (normalized.candles || []).length >= KLINE_MIN_CANDLES) {
        klineSliceCache[cacheKey] = normalized;
      }
      return normalized;
    } catch (error) {
      saveConnectionFallback(error, "历史数据连接未完成");
      return {
        ok: false,
        symbol,
        timeframe,
        candles: [],
        bars: [],
        source: "local_demo",
        manifestStatus: "unavailable",
        barCount: 0,
        reason: "network_error",
        errorMessage: getTechnicalMessage(error) || "K线服务暂不可用",
        raw: null,
        slice: {
          source: "local_demo",
          candles: [],
          manifestStatus: "unavailable",
          barCount: 0
        }
      };
    } finally {
      delete klineSliceRequests[cacheKey];
    }
  })();
  return klineSliceRequests[cacheKey];
}

function prefetchKlineTrainingSlices({
  marketKey = "cn",
  symbol = "",
  timeframes = ["1d", "60m", "30m"],
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  mode = "step_replay",
  gateKey = "shi_shang_mo",
  blind = true,
  scenarioId = "scene-fast-001",
  seed = ""
} = {}) {
  const sliceSeed = seed || scenarioId || "scene-fast-001";
  const uniqueTimeframes = Array.from(new Set(timeframes));
  return Promise.all(uniqueTimeframes.map((timeframeKey) => (
    fetchKlineTrainingSlice({
      marketKey,
      timeframeKey,
      symbol,
      windowSize,
      mode,
      gateKey,
      blind,
      seed: sliceSeed
    }).catch((error) => ({
      ok: false,
      timeframeKey,
      source: "local_demo",
      reason: "network_error",
      errorMessage: getTechnicalMessage(error)
    }))
  )));
}

function pickKlineNumber(...values) {
  for (const value of values) {
    if (value === "" || value === null || value === undefined) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return NaN;
}

function normalizeKlineCandle(candle = {}) {
  const open = pickKlineNumber(candle.open, candle.o, candle.openPrice, candle.open_price);
  const high = pickKlineNumber(candle.high, candle.h, candle.highPrice, candle.high_price);
  const low = pickKlineNumber(candle.low, candle.l, candle.lowPrice, candle.low_price);
  const close = pickKlineNumber(candle.close, candle.c, candle.closePrice, candle.close_price);
  const volume = pickKlineNumber(candle.volume, candle.vol, candle.v, candle.amount, 0);

  return {
    time: candle.time || candle.date || candle.t || candle.label || "",
    label: candle.label || candle.date || candle.time || candle.t || "",
    open,
    high: Math.max(high, open, close, low),
    low: Math.min(low, open, close, high),
    close,
    volume: Number.isFinite(volume) ? volume : 0
  };
}

function normalizeKlineTrainingSliceResult(result = {}, context = {}) {
  const slice = result.slice || result.data || result;
  const rawCandles = Array.isArray(slice.candles) ? slice.candles : (Array.isArray(slice.bars) ? slice.bars : []);
  const candles = rawCandles.map(normalizeKlineCandle).filter((item) => (
    [item.open, item.high, item.low, item.close].every(Number.isFinite)
  ));
  const barCount = Number(slice.barCount || slice.bar_count || candles.length || 0);
  const requiredWindowSize = Math.max(KLINE_MIN_CANDLES, Number(context.windowSize || 0));
  const reason = rawCandles.length <= 0
    ? "empty_slice"
    : candles.length < requiredWindowSize ? "insufficient_slice" : "";
  const ok = result.ok !== false && !reason;
  const symbol = slice.symbol || (slice.instrument || {}).symbol || context.symbol || "";
  const timeframeValue = slice.timeframe || {};
  const timeframe = typeof timeframeValue === "object"
    ? (timeframeValue.key || timeframeValue.value || context.timeframe || "")
    : (timeframeValue || context.timeframe || "");
  const manifestStatus = slice.manifestStatus || slice.manifest_status || slice.status || (ok ? "ok" : "missing");

  return {
    ok,
    symbol,
    timeframe,
    candles,
    bars: candles,
    source: ok ? (slice.source || "server_cache") : "local_demo",
    manifestStatus,
    barCount,
    reason,
    errorMessage: reason === "empty_slice"
      ? "历史数据未载入"
      : reason === "insufficient_slice" ? "历史数据未载入完整" : "",
    raw: result,
    slice: Object.assign({}, slice, {
      symbol,
      timeframe,
      candles,
      source: ok ? (slice.source || "server_cache") : "local_demo",
      manifestStatus,
      barCount
    })
  };
}

module.exports = {
  PRODUCTION_API_BASE,
  DEFAULT_API_BASE,
  KLINE_MIN_CANDLES,
  KLINE_TRAINING_WINDOW_SIZE,
  buildTradeReviewUrl,
  fetchLivingMirrorProfile,
  fetchLivingMirrorGrowthProjection,
  fetchTodayState,
  getApiBase,
  setApiBase,
  getAuthSession,
  ensureAuth,
  syncLocalState,
  pullRemoteState,
  syncCheckIn,
  syncAssessmentReport,
  syncTrainingProgress,
  syncKlineTrainingRecord,
  retryPendingKlineTrainingSync,
  syncTradeReviewRecord,
  requestTradeReviewOcrDraft,
  pullTrainingPrescription,
  syncShareAttribution,
  fetchKlineTrainingSlice,
  prefetchKlineTrainingSlices,
  normalizeKlineTrainingSliceResult
};
