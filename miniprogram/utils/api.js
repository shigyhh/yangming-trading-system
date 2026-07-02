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
const { getRuntimePlatform } = require("./runtime-info");

const API_BASE_KEY = "zhixing_api_base";
const API_BASE_ENABLED_KEY = "zhixing_api_base_enabled";
const AUTH_KEY = "zhixing_api_auth";
const CLIENT_ID_KEY = "zhixing_client_id";
const PRODUCTION_API_BASE = "https://xxjyxt.com";
const DEFAULT_API_BASE = "http://127.0.0.1:8787";
const KLINE_MIN_CANDLES = 6;
const KLINE_TRAINING_WINDOW_SIZE = 180;
const KLINE_TRAINING_FALLBACK_WINDOWS = [180, 150, 96];
const SAFE_CONNECTION_MESSAGE = "后端同步：暂未连接";
const SAFE_FALLBACK_TEXT = "本地档案已保存。可稍后再同步，也可以先继续今日修行。";
const KLINE_HOT_POOL_QUEUE_LIMIT = 12;
const KLINE_INSTANT_CACHE_KEY = "ym_kline_training_instant_cache_v1";
const KLINE_INSTANT_CACHE_LIMIT = 24;
const KLINE_INSTANT_CACHE_TTL_MS = 1000 * 60 * 60 * 8;
const klineHotPoolQueues = {};

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

function isRealDeviceRuntime() {
  const platform = getRuntimePlatform();
  return !!platform && platform !== "devtools";
}

function isUnsafeRealDeviceApiBase(value) {
  const apiBase = String(value || "").trim();
  return !apiBase ||
    /^http:\/\//i.test(apiBase) ||
    /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:|\/|$)/i.test(apiBase);
}

function getApiBase() {
  if (isReleaseEnv()) return PRODUCTION_API_BASE;
  const apiBase = wx.getStorageSync(API_BASE_KEY) || DEFAULT_API_BASE;
  if (isRealDeviceRuntime() && isUnsafeRealDeviceApiBase(apiBase)) return PRODUCTION_API_BASE;
  return apiBase;
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

function pickApiValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function normalizeApiList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[,\s，、]+/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function buildQuery(params = {}) {
  return Object.keys(params)
    .map((key) => {
      const value = params[key];
      if (value === undefined || value === null || value === "") return "";
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .filter(Boolean)
    .join("&");
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
  if (getApiBase() === PRODUCTION_API_BASE) return true;
  return !!wx.getStorageSync(API_BASE_ENABLED_KEY);
}

function shouldUseDefaultDevtoolsApiBase() {
  if (isReleaseEnv()) return false;
  if (isRealDeviceRuntime()) return false;
  return getApiBase() === DEFAULT_API_BASE;
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

async function createRemoteInterventionEvent(event = {}) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    return request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/intervention-events`,
      method: "POST",
      token: auth.access_token,
      data: {
        user,
        intervention_event: event,
        interventionEvent: event,
        event,
        source: "miniprogram"
      }
    });
  } catch (error) {
    saveConnectionFallback(error, "知行提醒同步：暂未连接");
    throw error;
  }
}

async function listTrainingBookmarks(filters = {}) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    const query = buildQuery({
      bookmark_type: pickApiValue(filters.bookmarkType, filters.bookmark_type),
      source_type: pickApiValue(filters.sourceType, filters.source_type),
      training_pack_id: pickApiValue(filters.trainingPackId, filters.training_pack_id),
      include_disabled: filters.includeDisabled || filters.include_disabled ? "true" : ""
    });
    return request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/training-bookmarks${query ? `?${query}` : ""}`,
      method: "GET",
      token: auth.access_token
    });
  } catch (error) {
    saveConnectionFallback(error, "训练收藏同步：暂未连接");
    throw error;
  }
}

async function createTrainingBookmark(bookmark = {}) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    return request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/training-bookmarks`,
      method: "POST",
      token: auth.access_token,
      data: {
        user,
        training_bookmark: bookmark,
        trainingBookmark: bookmark,
        source: "miniprogram"
      }
    });
  } catch (error) {
    saveConnectionFallback(error, "训练收藏同步：暂未连接");
    throw error;
  }
}

async function deleteTrainingBookmark(bookmarkId = "") {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    return request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/training-bookmarks/${encodeURIComponent(String(bookmarkId || ""))}`,
      method: "DELETE",
      token: auth.access_token
    });
  } catch (error) {
    saveConnectionFallback(error, "训练收藏同步：暂未连接");
    throw error;
  }
}

async function listInterventionRules(filters = {}) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    const query = buildQuery({
      trigger_type: pickApiValue(filters.triggerType, filters.trigger_type),
      error_type: pickApiValue(filters.errorType, filters.error_type),
      include_disabled: filters.includeDisabled || filters.include_disabled ? "true" : ""
    });
    return request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/intervention-rules${query ? `?${query}` : ""}`,
      method: "GET",
      token: auth.access_token
    });
  } catch (error) {
    saveConnectionFallback(error, "知行提醒规则同步：暂未连接");
    throw error;
  }
}

async function listExecutionPlans(filters = {}) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    const query = buildQuery({
      error_type: pickApiValue(filters.errorType, filters.error_type),
      include_disabled: filters.includeDisabled || filters.include_disabled ? "true" : ""
    });
    return request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/execution-plans${query ? `?${query}` : ""}`,
      method: "GET",
      token: auth.access_token
    });
  } catch (error) {
    saveConnectionFallback(error, "执行计划同步：暂未连接");
    throw error;
  }
}

async function fetchDashboardSummary(filters = {}) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    const query = buildQuery({
      range: filters.range || "30d",
      date_from: pickApiValue(filters.dateFrom, filters.date_from),
      date_to: pickApiValue(filters.dateTo, filters.date_to)
    });
    return request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/dashboard-summary${query ? `?${query}` : ""}`,
      method: "GET",
      token: auth.access_token
    });
  } catch (error) {
    saveConnectionFallback(error, "心镜数据同步：暂未连接");
    throw error;
  }
}

async function fetchDashboardWeeklySummary(filters = {}) {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    const query = buildQuery({
      week: filters.week || "current",
      week_start: pickApiValue(filters.weekStart, filters.week_start),
      week_end: pickApiValue(filters.weekEnd, filters.week_end)
    });
    return request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/dashboard-weekly${query ? `?${query}` : ""}`,
      method: "GET",
      token: auth.access_token
    });
  } catch (error) {
    saveConnectionFallback(error, "本周活镜同步：暂未连接");
    throw error;
  }
}

function getArchiveUpdatedAt(result = {}) {
  const archiveIndex = result.archiveIndex || result.archive_index || (result.mirror_archive || {}).archiveIndex || (result.mirror_archive || {}).archive_index || {};
  return archiveIndex.updatedAt || archiveIndex.updated_at || "";
}

async function fetchDataBindingSummary() {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    const result = await request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/summary`,
      method: "GET",
      token: auth.access_token
    });
    saveSyncStatus({
      ok: true,
      syncing: false,
      message: "心镜档案已同步",
      userId: user.userId,
      syncedAt: Date.now(),
      serverUpdatedAt: getArchiveUpdatedAt(result)
    });
    return result;
  } catch (error) {
    saveConnectionFallback(error, "心镜档案同步：暂未连接");
    throw error;
  }
}

async function fetchMirrorArchive() {
  try {
    const auth = await ensureAuth();
    const state = collectLocalState();
    const user = buildDataBindingUser(auth, state);
    const result = await request({
      path: `/api/v1/data-binding/users/${encodeURIComponent(user.userId)}/mirror-archive`,
      method: "GET",
      token: auth.access_token
    });
    saveSyncStatus({
      ok: true,
      syncing: false,
      message: "心镜档案已同步",
      userId: user.userId,
      syncedAt: Date.now(),
      serverUpdatedAt: getArchiveUpdatedAt(result)
    });
    return result;
  } catch (error) {
    saveConnectionFallback(error, "心镜档案同步：暂未连接");
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

function getStorageValue(key, fallback = null) {
  try {
    const value = wx.getStorageSync(key);
    return value === undefined || value === "" ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function setStorageValue(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    // Storage can fail in low-space or restricted runtimes; network fetch still remains the source.
  }
}

function normalizeKlineHistorySymbol(symbol = "") {
  const value = String(symbol || "").trim().toUpperCase();
  const match = value.match(/^(\d{6})\.(SZ|SH|BJ)$/);
  return match ? match[1] : value;
}

function buildKlineSliceCacheKey({
  marketKey = "cn",
  timeframeKey = "101",
  symbol = "",
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  trainingLength = null,
  mode = "step_replay",
  startDate = "",
  endDate = "",
  entryTime = "",
  personalityType = "",
  gateKey = "shi_shang_mo",
  blind = true,
  seed = "",
  sourceType = "",
  source_type = "",
  sceneId = "",
  scene_id = ""
} = {}) {
  const market = KLINE_MARKET_MAP[marketKey] || "cn_equity";
  const timeframe = KLINE_TIMEFRAME_MAP[timeframeKey] || "101";
  const safeSymbol = normalizeKlineHistorySymbol(symbol);
  const source = String(sourceType || source_type || "").trim();
  const scene = String(sceneId || scene_id || "").trim();
  return [
    market,
    timeframe,
    safeSymbol,
    String(windowSize || KLINE_TRAINING_WINDOW_SIZE),
    String(mode || "step_replay"),
    String(endDate || ""),
    String(entryTime || ""),
    String(personalityType || ""),
    String(gateKey || ""),
    blind ? "blind" : "open",
    String(seed || ""),
    source,
    scene
  ].join("|");
}

function buildKlineInstantCacheKey({
  marketKey = "cn",
  timeframeKey = "101",
  symbol = "",
  mode = "step_replay",
  startDate = "",
  endDate = "",
  entryTime = "",
  personalityType = "",
  gateKey = "shi_shang_mo",
  blind = true,
  seed = "",
  scenarioId = ""
} = {}) {
  const market = KLINE_MARKET_MAP[marketKey] || "cn_equity";
  const timeframe = KLINE_TIMEFRAME_MAP[timeframeKey] || "101";
  const safeSymbol = normalizeKlineHistorySymbol(symbol);
  return [
    market,
    timeframe,
    safeSymbol,
    String(mode || "step_replay"),
    String(startDate || ""),
    String(endDate || ""),
    String(entryTime || ""),
    String(personalityType || ""),
    String(gateKey || ""),
    blind ? "blind" : "open",
    String(seed || scenarioId || "")
  ].join("|");
}

function readKlineInstantCacheStore() {
  const value = getStorageValue(KLINE_INSTANT_CACHE_KEY, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function writeKlineInstantCacheStore(store = {}) {
  const entries = Object.entries(store)
    .sort((a, b) => Number((b[1] || {}).cachedAt || 0) - Number((a[1] || {}).cachedAt || 0))
    .slice(0, KLINE_INSTANT_CACHE_LIMIT);
  setStorageValue(KLINE_INSTANT_CACHE_KEY, Object.fromEntries(entries));
}

function cacheKlineTrainingSliceResult(params = {}, result = {}) {
  if (!result || result.ok === false || !(result.candles || []).length) return null;
  if ((result.candles || []).length < KLINE_MIN_CANDLES) return null;
  const cacheKey = buildKlineInstantCacheKey(params);
  const store = readKlineInstantCacheStore();
  const safeResult = JSON.parse(JSON.stringify(result));
  store[cacheKey] = {
    cachedAt: Date.now(),
    result: safeResult
  };
  writeKlineInstantCacheStore(store);
  return safeResult;
}

function getCachedKlineTrainingSlice(params = {}) {
  const cacheKey = buildKlineInstantCacheKey(params);
  const store = readKlineInstantCacheStore();
  const entry = store[cacheKey];
  if (!entry || !entry.result) return null;
  const ageMs = Date.now() - Number(entry.cachedAt || 0);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > KLINE_INSTANT_CACHE_TTL_MS) return null;
  const result = entry.result;
  if (!result.ok || !(result.candles || []).length || (result.candles || []).length < KLINE_MIN_CANDLES) return null;
  return Object.assign({}, result, {
    instantCacheHit: true,
    instantCacheAgeMs: ageMs
  });
}

function buildKlineRequestWindowQueue(requestedWindow) {
  const safeRequested = Math.max(KLINE_MIN_CANDLES, Math.round(Number(requestedWindow || KLINE_TRAINING_WINDOW_SIZE)));
  const candidates = [safeRequested].concat(KLINE_TRAINING_FALLBACK_WINDOWS.filter((item) => item < safeRequested));
  return Array.from(new Set(candidates)).filter((item) => item >= KLINE_MIN_CANDLES);
}

function isKlineWindowInsufficientError(error) {
  return /数量不足|insufficient|请求失败：404|404/.test(getTechnicalMessage(error));
}

function buildKlinePrefetchSeedQueue({ seed = "", scenarioId = "", seedQueue = [], prefetchDepth = 1 } = {}) {
  const primarySeed = seed || scenarioId || "scene-fast-001";
  const candidates = Array.isArray(seedQueue) && seedQueue.length ? seedQueue : [primarySeed];
  const uniqueSeeds = Array.from(new Set([primarySeed].concat(candidates).filter(Boolean)));
  const depth = Math.max(1, Math.min(12, Number(prefetchDepth || uniqueSeeds.length || 1)));
  return uniqueSeeds.slice(0, depth);
}

function shouldUseKlineHotPool({ symbol = "", endDate = "", entryTime = "", blind = true } = {}) {
  return Boolean(blind) && !String(symbol || "").trim() && !String(endDate || "").trim() && !String(entryTime || "").trim();
}

function buildKlineHotPoolQueueKey({
  marketKey = "cn",
  timeframeKey = "101",
  symbol = "",
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  trainingLength = null,
  mode = "step_replay",
  startDate = "",
  endDate = "",
  entryTime = "",
  personalityType = "",
  gateKey = "shi_shang_mo",
  blind = true
} = {}) {
  const market = KLINE_MARKET_MAP[marketKey] || "cn_equity";
  const timeframe = KLINE_TIMEFRAME_MAP[timeframeKey] || "101";
  const safeSymbol = normalizeKlineHistorySymbol(symbol);
  return [
    market,
    timeframe,
    safeSymbol,
    String(windowSize || KLINE_TRAINING_WINDOW_SIZE),
    String(mode || "step_replay"),
    String(endDate || ""),
    String(entryTime || ""),
    String(personalityType || ""),
    String(gateKey || ""),
    blind ? "blind" : "open"
  ].join("|");
}

function buildHotPoolRequestSlot(prefix = "hot") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function takeQueuedKlineHotPoolSlice(params = {}) {
  const queueKey = buildKlineHotPoolQueueKey(params);
  const queue = klineHotPoolQueues[queueKey] || [];
  const next = queue.shift();
  if (!queue.length) delete klineHotPoolQueues[queueKey];
  else klineHotPoolQueues[queueKey] = queue;
  return next || null;
}

function queueKlineHotPoolSlice(params = {}, result = {}) {
  if (!result || !result.ok || !(result.candles || []).length) return;
  const queueKey = buildKlineHotPoolQueueKey(params);
  const queue = klineHotPoolQueues[queueKey] || [];
  queue.push(result);
  while (queue.length > KLINE_HOT_POOL_QUEUE_LIMIT) queue.shift();
  klineHotPoolQueues[queueKey] = queue;
}

function buildKlinePreheatItem({
  marketKey = "cn",
  timeframeKey = "1d",
  symbol = "",
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  mode = "step_replay",
  gateKey = "shi_shang_mo",
  blind = true,
  seed = "",
  hotPoolSlot = "",
  poolSlot = ""
} = {}) {
  return {
    market: KLINE_MARKET_MAP[marketKey] || "cn_equity",
    timeframe: KLINE_TIMEFRAME_MAP[timeframeKey] || "1d",
    symbol: normalizeKlineHistorySymbol(symbol),
    window: windowSize,
    mode,
    gate: gateKey,
    blind: Boolean(blind),
    seed: seed || hotPoolSlot || poolSlot || "",
    pool_slot: hotPoolSlot || poolSlot || ""
  };
}

function buildKlineTrainingHotPoolSlot({
  scenarioId = "scene-fast-001",
  timeframeKey = "1d",
  index = 1
} = {}) {
  const safeScenarioId = String(scenarioId || "scene-fast-001").trim() || "scene-fast-001";
  const safeTimeframeKey = String(timeframeKey || "1d").trim() || "1d";
  const rawIndex = Number(index || 1);
  const safeIndex = Number.isFinite(rawIndex) ? Math.max(1, Math.min(99, rawIndex)) : 1;
  return `${safeScenarioId}:${safeTimeframeKey}:${String(safeIndex).padStart(2, "0")}`;
}

function normalizeKlinePreheatPlanItem(item = {}, fallback = {}) {
  const timeframeKey = item.timeframeKey || item.timeframe_key || item.timeframe || fallback.timeframeKey || "1d";
  const hotPoolSlot = item.hotPoolSlot || item.hot_pool_slot || item.pool_slot || item.poolSlot || "";
  return {
    timeframeKey,
    hotPoolSlot,
    seed: item.seed || hotPoolSlot,
    marketKey: item.marketKey || item.market_key || item.market || fallback.marketKey || "cn",
    symbol: item.symbol || fallback.symbol || "",
    windowSize: item.windowSize || item.window_size || item.window || fallback.windowSize || KLINE_TRAINING_WINDOW_SIZE,
    mode: item.mode || fallback.mode || "step_replay",
    gateKey: item.gateKey || item.gate_key || item.gate || fallback.gateKey || "shi_shang_mo",
    blind: item.blind === undefined ? fallback.blind !== false : Boolean(item.blind)
  };
}

function buildLocalKlinePreheatPlan({
  marketKey = "cn",
  symbol = "",
  timeframes = ["1d"],
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  mode = "step_replay",
  gateKey = "shi_shang_mo",
  blind = true,
  scenarioId = "scene-fast-001",
  prefetchDepth = 1
} = {}) {
  const depth = Math.max(1, Math.min(12, Number(prefetchDepth || 1)));
  return Array.from(new Set(timeframes)).flatMap((timeframeKey) => (
    Array.from({ length: depth }, (_, index) => {
      const slot = buildKlineTrainingHotPoolSlot({ scenarioId, timeframeKey, index: index + 1 });
      return {
        marketKey,
        symbol,
        timeframeKey,
        windowSize,
        mode,
        gateKey,
        blind,
        seed: slot,
        hotPoolSlot: slot
      };
    })
  ));
}

async function fetchKlinePreheatPlan({
  marketKey = "cn",
  symbol = "",
  timeframes = ["1d"],
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  mode = "step_replay",
  gateKey = "shi_shang_mo",
  blind = true,
  scenarioId = "scene-fast-001",
  prefetchDepth = 1
} = {}) {
  const uniqueTimeframes = Array.from(new Set(timeframes));
  const fallbackContext = { marketKey, symbol, windowSize, mode, gateKey, blind };
  try {
    const result = await request({
      path: [
        "/api/v1/kline-history/preheat-plan?",
        `market=${encodeURIComponent(KLINE_MARKET_MAP[marketKey] || "cn_equity")}`,
        symbol ? `&symbol=${encodeURIComponent(normalizeKlineHistorySymbol(symbol))}` : "",
        `&timeframes=${encodeURIComponent(uniqueTimeframes.join(","))}`,
        `&window=${encodeURIComponent(windowSize)}`,
        `&mode=${encodeURIComponent(mode)}`,
        `&gate=${encodeURIComponent(gateKey)}`,
        `&blind=${blind ? "1" : "0"}`,
        `&scenario_id=${encodeURIComponent(scenarioId || "scene-fast-001")}`,
        `&prefetch_depth=${encodeURIComponent(prefetchDepth)}`
      ].join(""),
      method: "GET",
      timeout: 15000
    });
    const items = Array.isArray(result.items) ? result.items : [];
    if (items.length) {
      return items
        .map((item) => normalizeKlinePreheatPlanItem(item, fallbackContext))
        .filter((item) => item.hotPoolSlot);
    }
  } catch (error) {
    saveConnectionFallback(error, "K线预热计划暂未完成");
  }
  return buildLocalKlinePreheatPlan({
    marketKey,
    symbol,
    timeframes: uniqueTimeframes,
    windowSize,
    mode,
    gateKey,
    blind,
    scenarioId,
    prefetchDepth
  });
}

async function preheatKlineTrainingSlices({
  marketKey = "cn",
  symbol = "",
  timeframes = ["1d", "60m", "30m"],
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  mode = "step_replay",
  gateKey = "shi_shang_mo",
  blind = true,
  items = []
} = {}) {
  const preheatItems = Array.isArray(items) && items.length
    ? items.map((item) => buildKlinePreheatItem({
      marketKey,
      symbol,
      windowSize,
      mode,
      gateKey,
      blind,
      ...item
    }))
    : Array.from(new Set(timeframes)).map((timeframeKey) => buildKlinePreheatItem({
      marketKey,
      timeframeKey,
      symbol,
      windowSize,
      mode,
      gateKey,
      blind
    }));
  if (!preheatItems.length) return { ok: false, preheated: [] };
  try {
    return await request({
      path: "/api/v1/kline-history/preheat",
      method: "POST",
      data: {
        market: KLINE_MARKET_MAP[marketKey] || "cn_equity",
        symbol: normalizeKlineHistorySymbol(symbol),
        window: windowSize,
        mode,
        gate: gateKey,
        blind: Boolean(blind),
        items: preheatItems
      },
      timeout: 25000
    });
  } catch (error) {
    saveConnectionFallback(error, "历史数据预热暂未完成");
    return {
      ok: false,
      preheated: [],
      reason: "network_error",
      errorMessage: getTechnicalMessage(error)
    };
  }
}

function buildKlineSamplingPayload(input = {}) {
  const sourceType = String(pickApiValue(input.sourceType, input.source_type) || "").trim();
  const errorType = String(pickApiValue(input.errorType, input.error_type) || "").trim();
  const sceneTags = normalizeApiList(pickApiValue(input.sceneTags, input.scene_tags));
  const trainingPackId = String(pickApiValue(input.trainingPackId, input.training_pack_id) || "").trim();
  const excludeSegmentIds = normalizeApiList(pickApiValue(input.excludeSegmentIds, input.exclude_segment_ids));

  return {
    sourceType,
    source_type: sourceType,
    errorType,
    error_type: errorType,
    sceneTags,
    scene_tags: sceneTags,
    trainingPackId,
    training_pack_id: trainingPackId,
    difficulty: String(input.difficulty || "").trim(),
    period: String(input.period || "1d").trim(),
    excludeSegmentIds,
    exclude_segment_ids: excludeSegmentIds
  };
}

async function requestKlineTrainingSample(input = {}) {
  try {
    return await request({
      path: "/api/v1/kline-training/sample",
      method: "POST",
      data: buildKlineSamplingPayload(input)
    });
  } catch (error) {
    saveConnectionFallback(error, "抽题服务暂未连接");
    throw error;
  }
}

async function fetchKlineTrainingSlice({
  marketKey = "cn",
  timeframeKey = "101",
  symbol = "",
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  trainingLength = null,
  mode = "step_replay",
  startDate = "",
  endDate = "",
  entryTime = "",
  personalityType = "",
  gateKey = "shi_shang_mo",
  blind = true,
  seed = "",
  sourceType = "",
  source_type = "",
  sceneId = "",
  scene_id = "",
  hotPoolSlot = "",
  useHotPoolQueue = true,
  storeHotPoolResult = false
} = {}) {
  const market = KLINE_MARKET_MAP[marketKey] || "cn_equity";
  const timeframe = KLINE_TIMEFRAME_MAP[timeframeKey] || "101";
  const safeSymbol = normalizeKlineHistorySymbol(symbol);
  sourceType = String(sourceType || source_type || "").trim();
  sceneId = String(sceneId || scene_id || "").trim();
  const requestedWindow = trainingLength || windowSize;
  const requestWindows = buildKlineRequestWindowQueue(requestedWindow);
  const useHotPool = shouldUseKlineHotPool({ symbol: safeSymbol, endDate, entryTime, blind });
  const queueParams = {
    marketKey,
    timeframeKey,
    symbol: normalizeKlineHistorySymbol(symbol),
    windowSize: requestedWindow,
    mode,
    startDate,
    endDate,
    entryTime,
    personalityType,
    gateKey,
    blind,
    seed,
    sourceType,
    source_type: sourceType,
    sceneId,
    scene_id: sceneId
  };
  if (useHotPool && useHotPoolQueue && !storeHotPoolResult) {
    const queuedSlice = takeQueuedKlineHotPoolSlice(queueParams);
    if (queuedSlice) return queuedSlice;
  }
  const cacheKey = buildKlineSliceCacheKey({
    marketKey,
    timeframeKey,
    symbol: safeSymbol,
    windowSize: requestedWindow,
    mode,
    startDate,
    endDate,
    entryTime,
    personalityType,
    gateKey,
    blind,
    seed: useHotPool ? (hotPoolSlot || buildHotPoolRequestSlot("fetch")) : seed,
    sourceType,
    sceneId
  });
  if (!useHotPool && klineSliceCache[cacheKey]) return klineSliceCache[cacheKey];
  if (klineSliceRequests[cacheKey]) return klineSliceRequests[cacheKey];
  const buildSliceQuery = (actualWindow) => [
    `market=${encodeURIComponent(market)}`,
    safeSymbol ? `symbol=${encodeURIComponent(safeSymbol)}` : "",
    `timeframe=${encodeURIComponent(timeframe)}`,
    `window=${encodeURIComponent(actualWindow)}`,
    startDate ? `start_date=${encodeURIComponent(startDate)}` : "",
    endDate ? `end_date=${encodeURIComponent(endDate)}` : "",
    entryTime ? `entryTime=${encodeURIComponent(entryTime)}` : "",
    `mode=${encodeURIComponent(mode)}`,
    personalityType ? `personality_type=${encodeURIComponent(personalityType)}` : "",
    gateKey ? `gate=${encodeURIComponent(gateKey)}` : "",
    sourceType ? `source_type=${encodeURIComponent(sourceType)}` : "",
    sceneId ? `scene_id=${encodeURIComponent(sceneId)}` : "",
    `blind=${blind ? "1" : "0"}`,
    !useHotPool && seed ? `seed=${encodeURIComponent(seed)}` : "",
    useHotPool ? `pool_slot=${encodeURIComponent(hotPoolSlot || buildHotPoolRequestSlot("pool"))}` : ""
  ].filter(Boolean).join("&");
  klineSliceRequests[cacheKey] = (async () => {
    try {
      const useDefaultDevtoolsBase = !hasConfiguredApiBase() && shouldUseDefaultDevtoolsApiBase();
      const useProductionFallback = !hasConfiguredApiBase() && !useDefaultDevtoolsBase;
      const requestSlice = async (path, actualWindow) => {
        const result = await request({
          path,
          apiBaseOverride: useProductionFallback ? PRODUCTION_API_BASE : "",
          allowUnconfigured: useProductionFallback || useDefaultDevtoolsBase,
          timeout: 25000
        });
        return normalizeKlineTrainingSliceResult(result, { market, timeframe, symbol: safeSymbol, windowSize: actualWindow });
      };
      const requestFirstAvailableSlice = async (pathname) => {
        let lastResult = null;
        let lastError = null;
        for (const actualWindow of requestWindows) {
          try {
            const normalized = await requestSlice(`${pathname}?${buildSliceQuery(actualWindow)}`, actualWindow);
            lastResult = normalized;
            if (normalized.ok && (normalized.candles || []).length >= KLINE_MIN_CANDLES) {
              cacheKlineTrainingSliceResult(Object.assign({}, queueParams, { windowSize: actualWindow }), normalized);
              return normalized;
            }
          } catch (error) {
            lastError = error;
            if (!isKlineWindowInsufficientError(error)) throw error;
          }
        }
        if (lastResult) return lastResult;
        throw lastError || new Error("历史数据连接未完成");
      };
      if (useHotPool) {
        try {
          const hotPoolNormalized = await requestFirstAvailableSlice("/api/v1/kline-history/hot-slice");
          if (hotPoolNormalized.ok && (hotPoolNormalized.candles || []).length >= KLINE_MIN_CANDLES) {
            if (storeHotPoolResult) queueKlineHotPoolSlice(queueParams, hotPoolNormalized);
            return hotPoolNormalized;
          }
        } catch (hotPoolError) {
          saveConnectionFallback(hotPoolError, "历史数据热池连接未完成");
        }
      }
      const normalized = await requestFirstAvailableSlice("/api/v1/kline-history/slice");
      if (normalized.ok && (normalized.candles || []).length >= KLINE_MIN_CANDLES) {
        if (useHotPool && storeHotPoolResult) {
          queueKlineHotPoolSlice(queueParams, normalized);
        }
        if (!useHotPool) {
          klineSliceCache[cacheKey] = normalized;
        }
      }
      return normalized;
    } catch (error) {
      saveConnectionFallback(error, "历史数据连接未完成");
      return {
        ok: false,
        symbol: safeSymbol,
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

async function prefetchKlineTrainingSlices({
  marketKey = "cn",
  symbol = "",
  timeframes = ["1d", "60m", "30m"],
  windowSize = KLINE_TRAINING_WINDOW_SIZE,
  mode = "step_replay",
  gateKey = "shi_shang_mo",
  blind = true,
  scenarioId = "scene-fast-001",
  seed = "",
  seedQueue = [],
  prefetchDepth = 1
} = {}) {
  const uniqueTimeframes = Array.from(new Set(timeframes));
  const requests = [];
  const useHotPool = shouldUseKlineHotPool({ symbol, blind });
  const hotPoolDepth = Math.max(1, Math.min(12, Number(prefetchDepth || 1)));
  if (useHotPool) {
    const hotPoolJobs = await fetchKlinePreheatPlan({
      marketKey,
      symbol,
      timeframes: uniqueTimeframes,
      windowSize,
      mode,
      gateKey,
      blind,
      scenarioId,
      prefetchDepth: hotPoolDepth
    });
    await preheatKlineTrainingSlices({
      marketKey,
      symbol,
      windowSize,
      mode,
      gateKey,
      blind,
      items: hotPoolJobs
    }).catch(() => null);
    hotPoolJobs.forEach((job) => {
      requests.push(fetchKlineTrainingSlice({
        marketKey: job.marketKey || marketKey,
        timeframeKey: job.timeframeKey,
        symbol: job.symbol || symbol,
        windowSize: job.windowSize || windowSize,
        mode: job.mode || mode,
        gateKey: job.gateKey || gateKey,
        blind: job.blind,
        seed: job.seed || job.hotPoolSlot,
        hotPoolSlot: job.hotPoolSlot,
        useHotPoolQueue: false,
        storeHotPoolResult: true
      }).catch((error) => ({
        ok: false,
        timeframeKey: job.timeframeKey,
        source: "local_demo",
        reason: "network_error",
        errorMessage: getTechnicalMessage(error)
      })));
    });
    return Promise.all(requests);
  }
  const sliceSeeds = buildKlinePrefetchSeedQueue({ seed, scenarioId, seedQueue, prefetchDepth });
  const preheatJobs = [];
  uniqueTimeframes.forEach((timeframeKey) => {
    sliceSeeds.forEach((sliceSeed) => {
      preheatJobs.push({ timeframeKey, seed: sliceSeed });
    });
  });
  await preheatKlineTrainingSlices({
    marketKey,
    symbol,
    windowSize,
    mode,
    gateKey,
    blind,
    items: preheatJobs
  }).catch(() => null);
  uniqueTimeframes.forEach((timeframeKey) => {
    sliceSeeds.forEach((sliceSeed) => {
      requests.push(fetchKlineTrainingSlice({
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
        seed: sliceSeed,
        source: "local_demo",
        reason: "network_error",
        errorMessage: getTechnicalMessage(error)
      })));
    });
  });
  return Promise.all(requests);
}

function getTradeReviewMarketLabel(marketKey = "cn") {
  const key = String(marketKey || "").toLowerCase();
  if (["cn", "cn_equity", "ashare", "a_share"].includes(key)) return "A股";
  if (["hk", "hk_equity"].includes(key)) return "港股";
  if (["us", "us_equity"].includes(key)) return "美股";
  if (["futures", "future"].includes(key)) return "期货";
  if (["crypto", "coin"].includes(key)) return "数字货币";
  return "市场";
}

function getTradeReviewTimeframeLabel(timeframeKey = "1d") {
  const key = String(timeframeKey || "").toLowerCase();
  if (["101", "1d", "day", "daily"].includes(key)) return "日线";
  if (["60m", "60", "60min"].includes(key)) return "60分钟";
  if (["30m", "30", "30min"].includes(key)) return "30分钟";
  if (["5m", "5", "5min"].includes(key)) return "5分钟";
  if (["15m", "15", "15min"].includes(key)) return "15分钟";
  return timeframeKey || "周期";
}

async function fetchTradeReviewMarketContext({
  marketKey = "cn",
  timeframeKey = "1d",
  symbol = "",
  tradeDate = "",
  windowSize = KLINE_TRAINING_WINDOW_SIZE
} = {}) {
  const safeSymbol = String(symbol || "").trim();
  const marketLabel = getTradeReviewMarketLabel(marketKey);
  const timeframeLabel = getTradeReviewTimeframeLabel(timeframeKey);
  if (!safeSymbol) {
    return {
      status: "missing_symbol",
      marketKey,
      marketLabel,
      timeframeKey,
      timeframeLabel,
      tradeDate,
      symbolMasked: "",
      sourceStatus: "待补充标的后回看",
      sourceNote: "补充代码、周期和日期后，系统会提前回看真实历史位置。"
    };
  }

  const result = await fetchKlineTrainingSlice({
    marketKey,
    timeframeKey,
    symbol: safeSymbol,
    windowSize,
    endDate: tradeDate,
    mode: "step_replay",
    gateKey: "shi_shang_mo",
    blind: false,
    seed: ["trade-review", marketKey, timeframeKey, safeSymbol, tradeDate || "latest"].join("-")
  });
  const slice = result.slice || {};
  const timeframe = slice.timeframe || {};
  const dataRange = slice.data_range || slice.dataRange || {};
  const candleCount = (result.candles || []).length;
  if (!result.ok || candleCount < KLINE_MIN_CANDLES) {
    return {
      status: result.reason === "empty_slice" ? "missing_cache" : "failed",
      marketKey,
      marketLabel,
      timeframeKey,
      timeframeLabel,
      tradeDate,
      symbolMasked: safeSymbol,
      sourceStatus: result.errorMessage || "历史回看暂未完成",
      sourceNote: "本地复盘可先保存，历史位置稍后可继续补充。",
      source: result.source || "",
      candleCount
    };
  }

  return {
    status: "ready",
    marketKey,
    marketLabel: ((slice.market || {}).label) || marketLabel,
    timeframeKey: typeof timeframe === "object" ? (timeframe.key || timeframeKey) : (timeframe || timeframeKey),
    timeframeLabel: typeof timeframe === "object" ? (timeframe.label || timeframeLabel) : timeframeLabel,
    tradeDate,
    symbolMasked: safeSymbol,
    positionLabel: "历史位置已回看",
    sourceStatus: "历史位置已回看",
    sourceNote: "已按市场、标的、周期和记录日期回看当时历史片段。",
    source: slice.source || result.source || "server_cache",
    cacheStatus: slice.cache_status || "",
    deterministicCache: Boolean(slice.deterministic_cache),
    dataStart: dataRange.start || "",
    dataEnd: dataRange.end || "",
    candleCount,
    rulesSummary: ((slice.rules || {}).settlement || "") ? `${(slice.rules || {}).settlement} · ${((slice.rules || {}).boundaryNotes || []).slice(0, 1).join("")}` : "",
    reviewPrompt: ((slice.training || {}).prompt) || ""
  };
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
  createRemoteInterventionEvent,
  listTrainingBookmarks,
  createTrainingBookmark,
  deleteTrainingBookmark,
  listInterventionRules,
  listExecutionPlans,
  fetchDashboardSummary,
  fetchDashboardWeeklySummary,
  fetchDataBindingSummary,
  fetchMirrorArchive,
  pullTrainingPrescription,
  syncShareAttribution,
  requestKlineTrainingSample,
  fetchKlineTrainingSlice,
  getCachedKlineTrainingSlice,
  cacheKlineTrainingSliceResult,
  fetchTradeReviewMarketContext,
  preheatKlineTrainingSlices,
  prefetchKlineTrainingSlices,
  buildKlineTrainingHotPoolSlot,
  normalizeKlineTrainingSliceResult
};
