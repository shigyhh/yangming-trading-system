import crypto from "node:crypto";
import { config } from "../config.js";
import { updateRuntimeRecords } from "../lib/store.js";

const STATE_FILE = "wechat-oauth-states.json";
const STATE_TTL_MS = 10 * 60 * 1000;

export async function createWechatAuthUrl({ mode = "auto", origin = "", redirectPath = "/", userAgent = "", ipAddress = "" }) {
  const resolvedMode = resolveWechatMode(mode, userAgent);
  const app = getWechatAppConfig(resolvedMode);
  const now = Date.now();
  const state = crypto.randomBytes(18).toString("base64url");
  const callbackUrl = `${origin.replace(/\/$/, "")}/api/v1/auth/wechat/callback`;

  await updateRuntimeRecords(STATE_FILE, (records) => {
    const freshRecords = records.filter((item) => new Date(item.expires_at).getTime() > now);
    freshRecords.push({
      state,
      mode: resolvedMode,
      redirect_path: normalizeRedirectPath(redirectPath),
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + STATE_TTL_MS).toISOString(),
      used_at: null
    });
    return freshRecords;
  });

  const params = new URLSearchParams({
    appid: app.appId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: app.scope,
    state
  });

  const baseUrl = resolvedMode === "open"
    ? "https://open.weixin.qq.com/connect/qrconnect"
    : "https://open.weixin.qq.com/connect/oauth2/authorize";

  return {
    mode: resolvedMode,
    auth_url: `${baseUrl}?${params.toString()}#wechat_redirect`
  };
}

export async function consumeWechatAuthCode({ code, state }) {
  const stateRecord = await consumeWechatState(state);
  const app = getWechatAppConfig(stateRecord.mode);
  const tokenData = await requestWechatJson("https://api.weixin.qq.com/sns/oauth2/access_token", {
    appid: app.appId,
    secret: app.appSecret,
    code,
    grant_type: "authorization_code"
  });

  const userInfo = tokenData.access_token
    ? await requestWechatJson("https://api.weixin.qq.com/sns/userinfo", {
        access_token: tokenData.access_token,
        openid: tokenData.openid,
        lang: "zh_CN"
      })
    : {};

  return {
    mode: stateRecord.mode,
    redirect_path: stateRecord.redirect_path || "/",
    openid: tokenData.openid || userInfo.openid || "",
    unionid: tokenData.unionid || userInfo.unionid || "",
    nickname: userInfo.nickname || "微信学员",
    avatar_url: userInfo.headimgurl || "",
    raw: {
      scope: tokenData.scope || "",
      privilege: userInfo.privilege || []
    }
  };
}

function resolveWechatMode(mode, userAgent) {
  if (mode === "mp" || mode === "open") return mode;
  return /MicroMessenger/i.test(userAgent || "") ? "mp" : "open";
}

function getWechatAppConfig(mode) {
  const isOpen = mode === "open";
  const appId = isOpen ? config.wechatOpenAppId : config.wechatMpAppId;
  const appSecret = isOpen ? config.wechatOpenAppSecret : config.wechatMpAppSecret;
  const scope = isOpen ? "snsapi_login" : config.wechatMpScope;

  if (!appId || !appSecret) {
    const error = new Error(isOpen ? "微信开放平台登录未配置" : "微信公众号授权未配置");
    error.statusCode = 500;
    throw error;
  }

  return { appId, appSecret, scope };
}

async function consumeWechatState(state) {
  const now = Date.now();
  let matched;

  await updateRuntimeRecords(STATE_FILE, (records) => {
    const index = records.findIndex((item) => {
      return item.state === state && !item.used_at && new Date(item.expires_at).getTime() > now;
    });
    if (index < 0) {
      const error = new Error("微信登录状态已失效，请重新发起登录");
      error.statusCode = 400;
      throw error;
    }
    matched = records[index];
    records[index].used_at = new Date(now).toISOString();
    return records;
  });

  return matched;
}

async function requestWechatJson(url, params) {
  const response = await fetch(`${url}?${new URLSearchParams(params).toString()}`);
  const data = await response.json();
  if (!response.ok || data.errcode) {
    const error = new Error(data.errmsg || `微信接口请求失败：HTTP ${response.status}`);
    error.statusCode = 502;
    throw error;
  }
  return data;
}

function normalizeRedirectPath(value) {
  const path = String(value || "/").trim();
  if (!path.startsWith("/")) return "/";
  if (path.startsWith("//")) return "/";
  return path;
}
