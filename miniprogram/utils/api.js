const {
  collectLocalState,
  applyRemoteState,
  getProfile,
  saveSyncStatus
} = require("./store");

const API_BASE_KEY = "zhixing_api_base";
const AUTH_KEY = "zhixing_api_auth";
const CLIENT_ID_KEY = "zhixing_client_id";
const DEFAULT_API_BASE = "http://127.0.0.1:8787";

function getApiBase() {
  return wx.getStorageSync(API_BASE_KEY) || DEFAULT_API_BASE;
}

function setApiBase(value) {
  const next = String(value || "").trim().replace(/\/$/, "");
  wx.setStorageSync(API_BASE_KEY, next || DEFAULT_API_BASE);
  return getApiBase();
}

function getAuthSession() {
  return wx.getStorageSync(AUTH_KEY) || null;
}

function saveAuthSession(session) {
  wx.setStorageSync(AUTH_KEY, session);
  return session;
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
  const result = await request({
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
    saveSyncStatus({
      ok: false,
      syncing: false,
      message: error.message || "同步失败",
      failedAt: Date.now()
    });
    if (!silent) wx.showToast({ title: "同步失败，请检查后端地址", icon: "none" });
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
    saveSyncStatus({
      ok: false,
      syncing: false,
      message: error.message || "拉取失败",
      failedAt: Date.now()
    });
    if (!silent) wx.showToast({ title: "拉取失败，请检查后端地址", icon: "none" });
    throw error;
  }
}

async function syncCheckIn(note = "") {
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
}

async function syncAssessmentReport(report = null) {
  const auth = await ensureAuth();
  const state = collectLocalState();
  return request({
    path: `/api/v1/users/${auth.user.id}/assessment-report`,
    method: "POST",
    token: auth.access_token,
    data: {
      source_channel: "微信小程序MVP",
      report: report || state.assessment_result,
      assessment_history: state.assessment_history,
      user_binding: state.user_binding,
      retest_snapshots: state.retest_snapshots,
      companion_mirrors: state.companion_mirrors,
      subscription_state: state.subscription_state
    }
  });
}

async function syncTrainingProgress(progress = null) {
  const auth = await ensureAuth();
  const state = collectLocalState();
  return request({
    path: `/api/v1/users/${auth.user.id}/training-progress`,
    method: "POST",
    token: auth.access_token,
    data: {
      source_channel: "微信小程序MVP",
      progress: progress || {
        training7_state: state.training7_state,
        three_seals_records: state.three_seals_records,
        opening_check_records: state.opening_check_records,
        intraday_boundary_records: state.intraday_boundary_records,
        closing_review_records: state.closing_review_records,
        zhixing_score: state.zhixing_score,
        retest_snapshots: state.retest_snapshots,
        group_practice: state.group_practice,
        lesson_watch_records: state.lesson_watch_records,
        subscription_state: state.subscription_state
      },
      user_binding: state.user_binding
    }
  });
}

async function syncShareAttribution(event = null) {
  const auth = await ensureAuth();
  const state = collectLocalState();
  return request({
    path: `/api/v1/users/${auth.user.id}/share-attribution`,
    method: "POST",
    token: auth.access_token,
    data: {
      source_channel: "微信小程序MVP",
      event,
      invite_events: state.invite_events,
      invite_funnel: state.invite_funnel,
      share_cards: state.share_cards,
      companion_mirrors: state.companion_mirrors,
      group_practice: state.group_practice,
      lesson_reservations: state.lesson_reservations,
      lesson_watch_records: state.lesson_watch_records,
      subscription_state: state.subscription_state,
      user_binding: state.user_binding
    }
  });
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
  syncShareAttribution
};
