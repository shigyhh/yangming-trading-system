const {
  collectLocalState,
  applyRemoteState,
  getProfile,
  saveSyncStatus
} = require("./store");
const {
  buildAssessmentBindingPayload,
  buildRetestBindingPayload,
  shouldSyncRetest,
  buildTrainingBindingPayload,
  buildKLineBindingPayload,
  buildShareCardBindingPayload
} = require("./data-binding-adapter");

const API_BASE_KEY = "zhixing_api_base";
const API_BASE_ENABLED_KEY = "zhixing_api_base_enabled";
const AUTH_KEY = "zhixing_api_auth";
const CLIENT_ID_KEY = "zhixing_client_id";
const DEFAULT_API_BASE = "http://127.0.0.1:8787";
const SAFE_CONNECTION_MESSAGE = "后端同步：暂未连接";
const SAFE_FALLBACK_TEXT = "本地档案已保存。可稍后再同步，也可以先继续今日修行。";

function getApiBase() {
  return wx.getStorageSync(API_BASE_KEY) || DEFAULT_API_BASE;
}

function hasConfiguredApiBase() {
  return !!wx.getStorageSync(API_BASE_ENABLED_KEY);
}

function setApiBase(value) {
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

function request({ path, method = "GET", data = null, token = "" }) {
  const apiBase = getApiBase();
  return new Promise((resolve, reject) => {
    if (!hasConfiguredApiBase()) {
      reject(new Error("连接未完成"));
      return;
    }
    wx.request({
      url: `${apiBase}${path}`,
      method,
      data,
      timeout: 8000,
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
  cn: "cn_equity",
  hk: "hk_equity",
  us: "us_equity",
  futures: "futures",
  crypto: "crypto"
};

const KLINE_TIMEFRAME_MAP = {
  "1m": "1mo",
  "1mo": "1mo",
  "1y": "1y",
  "1w": "1w",
  "1d": "1d",
  "60m": "60m",
  "30m": "30m",
  "10m": "10m",
  "5m": "5m"
};

async function fetchKlineTrainingSlice({
  marketKey = "cn",
  timeframeKey = "1d",
  symbol = "",
  windowSize = 60,
  mode = "firecracker",
  personalityType = "",
  gateKey = "shi_shang_mo",
  blind = true,
  seed = ""
} = {}) {
  const market = KLINE_MARKET_MAP[marketKey] || marketKey || "cn_equity";
  const timeframe = KLINE_TIMEFRAME_MAP[timeframeKey] || timeframeKey || "1d";
  const query = [
    `market=${encodeURIComponent(market)}`,
    symbol ? `symbol=${encodeURIComponent(symbol)}` : "",
    `timeframe=${encodeURIComponent(timeframe)}`,
    `window=${encodeURIComponent(windowSize)}`,
    `mode=${encodeURIComponent(mode)}`,
    personalityType ? `personality_type=${encodeURIComponent(personalityType)}` : "",
    gateKey ? `gate=${encodeURIComponent(gateKey)}` : "",
    `blind=${blind ? "1" : "0"}`,
    seed ? `seed=${encodeURIComponent(seed)}` : ""
  ].filter(Boolean).join("&");
  try {
    return await request({ path: `/api/v1/kline-history/slice?${query}` });
  } catch (error) {
    saveConnectionFallback(error, "历史数据连接未完成");
    throw error;
  }
}

module.exports = {
  DEFAULT_API_BASE,
  getApiBase,
  setApiBase,
  getAuthSession,
  ensureAuth,
  syncLocalState,
  pullRemoteState,
  syncCheckIn,
  syncAssessmentReport,
  syncTrainingProgress,
  syncShareAttribution,
  fetchKlineTrainingSlice
};
