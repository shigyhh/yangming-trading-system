import crypto from "node:crypto";
import { appendRuntimeRecord, readRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const USER_FILE = "users.json";
const SESSION_FILE = "auth-sessions.json";

export async function loginOrRegisterUser({
  method = "web_demo",
  displayName = "体验学员",
  contact = "",
  wechatBound = false,
  inviteCode = "",
  sourceChannel = "网页MVP",
  ipAddress = "",
  userAgent = ""
}) {
  const now = new Date().toISOString();
  const isPhoneLogin = method.includes("phone");
  const identityKey = buildIdentityKey({ method, contact, inviteCode, displayName });
  let user;

  await updateRuntimeRecords(USER_FILE, (users) => {
    user = users.find((item) => item.identity_key === identityKey);

    if (!user) {
      user = {
        id: crypto.randomUUID(),
        identity_key: identityKey,
        nickname: String(displayName || "体验学员").slice(0, 80),
        personal_invite_code: createInviteCode(users),
        referred_by_invite_code: String(inviteCode || "").trim(),
        phone: isPhoneLogin ? String(contact || "") : "",
        phone_verified: isPhoneLogin,
        contact: String(contact || ""),
        login_method: method,
        wechat_bound: Boolean(wechatBound),
        source_channel: sourceChannel,
        invite_code: inviteCode,
        assistant_status: wechatBound ? "bound" : "unknown",
        created_at: now,
        updated_at: now,
        last_login_at: now
      };
      users.push(user);
    } else {
      if (!user.personal_invite_code) user.personal_invite_code = createInviteCode(users);
      user.nickname = String(displayName || user.nickname || "体验学员").slice(0, 80);
      user.contact = String(contact || user.contact || "");
      if (isPhoneLogin) {
        user.phone = String(contact || user.phone || "");
        user.phone_verified = true;
      }
      user.login_method = method;
      user.wechat_bound = Boolean(wechatBound || user.wechat_bound);
      user.assistant_status = user.wechat_bound ? "bound" : user.assistant_status || "unknown";
      user.source_channel = sourceChannel || user.source_channel;
      user.invite_code = inviteCode || user.invite_code;
      user.updated_at = now;
      user.last_login_at = now;
    }

    return users;
  });

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const accessToken = crypto.randomBytes(32).toString("base64url");
  const authSession = {
    id: crypto.randomUUID(),
    user_id: user.id,
    access_token_hash: hashToken(accessToken),
    login_method: method,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: now,
    expires_at: expiresAt,
    revoked_at: null
  };

  await appendRuntimeRecord(SESSION_FILE, authSession);

  return {
    user,
    access_token: accessToken,
    expires_at: expiresAt
  };
}

export async function getUser(userId) {
  const users = await readRuntimeRecords(USER_FILE);
  return users.find((item) => item.id === userId) || null;
}

export async function authenticateRequest(req) {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error("请先登录");
    error.statusCode = 401;
    throw error;
  }

  const sessions = await readRuntimeRecords(SESSION_FILE);
  const tokenHash = hashToken(token);
  const session = sessions.find((item) => {
    const storedHash = item.access_token_hash || (item.access_token ? hashToken(item.access_token) : "");
    return storedHash === tokenHash && !item.revoked_at && new Date(item.expires_at).getTime() > Date.now();
  });

  if (!session) {
    const error = new Error("登录态已失效，请重新登录");
    error.statusCode = 401;
    throw error;
  }

  const user = await getUser(session.user_id);
  if (!user) {
    const error = new Error("用户不存在，请重新登录");
    error.statusCode = 401;
    throw error;
  }

  return { session, user };
}

export function assertUserAccess(auth, userId) {
  if (!userId || auth.user.id === userId) return;
  const error = new Error("无权操作其他用户的数据");
  error.statusCode = 403;
  throw error;
}

function buildIdentityKey({ method, contact, inviteCode, displayName }) {
  const raw = contact || inviteCode || displayName || "anonymous";
  return `${method}:${String(raw).trim().toLowerCase()}`;
}

function createInviteCode(users) {
  const existingCodes = new Set(users.map((item) => item.personal_invite_code).filter(Boolean));
  let code = "";
  do {
    code = `ZX${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  } while (existingCodes.has(code));
  return code;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}
