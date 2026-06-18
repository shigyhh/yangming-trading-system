import crypto from "node:crypto";
import { config } from "../config.js";
import { readRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const ADMIN_USER_FILE = "ymty-admin-users.json";
const LEGACY_PLACEHOLDER_HASH = "local-dev-placeholder-not-for-production";
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

export async function loginYmtyAdmin({ username = "", password = "" } = {}) {
  await ensureBootstrapAdmin();
  const cleanUsername = cleanText(username, 80);
  const user = await getAdminUserByUsername(cleanUsername);
  if (!user || user.status !== "active" || !verifyPassword(password, user.password_hash)) {
    const error = new Error("用户名或密码错误");
    error.statusCode = 401;
    throw error;
  }

  const updatedUser = await rotateSessionVersion(user.id);
  return {
    token: signAdminToken(updatedUser),
    user: publicAdminUser(updatedUser)
  };
}

export async function getYmtyAdminMe(req) {
  const admin = await authenticateYmtyAdmin(req, { allowPasswordChangeRequired: true });
  return {
    user: publicAdminUser(admin.user || admin)
  };
}

export async function changeYmtyAdminPassword(req, { oldPassword = "", newPassword = "" } = {}) {
  const admin = await authenticateYmtyAdmin(req, { allowPasswordChangeRequired: true, requireSessionUser: true });
  if (!verifyPassword(oldPassword, admin.user.password_hash)) {
    const error = new Error("原密码错误");
    error.statusCode = 401;
    throw error;
  }
  if (String(newPassword || "").length < 8) {
    const error = new Error("新密码至少 8 位");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  let updatedUser = null;
  await updateRuntimeRecords(ADMIN_USER_FILE, (records) => records.map((user) => {
    if (user.id !== admin.user.id) return user;
    updatedUser = {
      ...user,
      password_hash: hashPassword(newPassword),
      must_change_password: false,
      session_version: crypto.randomBytes(18).toString("hex"),
      updated_at: now
    };
    return updatedUser;
  }));

  return {
    token: signAdminToken(updatedUser),
    user: publicAdminUser(updatedUser)
  };
}

export async function logoutYmtyAdmin(req) {
  const admin = await authenticateYmtyAdmin(req, { allowPasswordChangeRequired: true });
  if (admin.user?.id) {
    await rotateSessionVersion(admin.user.id);
  }
  return { ok: true };
}

export async function authenticateYmtyAdmin(req, {
  allowPasswordChangeRequired = false,
  requireSessionUser = false
} = {}) {
  const providedToken = getProvidedAdminToken(req);
  const legacyToken = getLegacyAdminToken();
  if (!requireSessionUser && legacyToken && providedToken === legacyToken) {
    return { adminId: String(req.headers["x-admin-id"] || "ymty-admin"), legacy: true };
  }

  if (!providedToken) {
    const error = new Error("无权限或登录已失效");
    error.statusCode = 401;
    throw error;
  }

  const payload = verifyAdminToken(providedToken);
  const users = await readRuntimeRecords(ADMIN_USER_FILE);
  const user = users.find((item) => item?.id === payload.sub && item?.status === "active");
  if (!user || user.session_version !== payload.session_version) {
    const error = new Error("无权限或登录已失效");
    error.statusCode = 401;
    throw error;
  }
  if (user.must_change_password && !allowPasswordChangeRequired) {
    const error = new Error("请先修改初始密码");
    error.statusCode = 403;
    throw error;
  }

  return {
    adminId: user.username,
    user
  };
}

export async function ensureBootstrapAdmin() {
  const now = new Date().toISOString();
  const bootstrapUsername = cleanText(process.env.YMTY_ADMIN_BOOTSTRAP_USERNAME || "admin", 80);
  const bootstrapPassword = String(process.env.YMTY_ADMIN_BOOTSTRAP_PASSWORD || "");
  let result = await readRuntimeRecords(ADMIN_USER_FILE);
  const realAdmins = result.filter((user) => user?.password_hash && user.password_hash !== LEGACY_PLACEHOLDER_HASH);
  if (realAdmins.length > 0) return result;
  if (!bootstrapPassword) return result;

  const admin = {
    id: `admin-${crypto.randomUUID()}`,
    username: bootstrapUsername,
    password_hash: hashPassword(bootstrapPassword),
    role: "admin",
    status: "active",
    must_change_password: true,
    session_version: crypto.randomBytes(18).toString("hex"),
    created_at: now,
    updated_at: now
  };
  await updateRuntimeRecords(ADMIN_USER_FILE, (records) => {
    const withoutLegacy = records.filter((user) => user?.password_hash && user.password_hash !== LEGACY_PLACEHOLDER_HASH);
    return withoutLegacy.concat(admin);
  });
  result = await readRuntimeRecords(ADMIN_USER_FILE);
  return result;
}

function getProvidedAdminToken(req) {
  return String(req.headers["x-admin-token"] || req.headers["X-Admin-Token"] || req.headers.authorization || req.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function getLegacyAdminToken() {
  const configuredToken = process.env.YMTY_ADMIN_TOKEN || "";
  if (configuredToken) return configuredToken;
  if (config.nodeEnv !== "production") return "local-dev-admin-token";
  return "";
}

async function getAdminUserByUsername(username) {
  const users = await readRuntimeRecords(ADMIN_USER_FILE);
  return users.find((item) => item?.username === username) || null;
}

async function rotateSessionVersion(userId) {
  const now = new Date().toISOString();
  let updatedUser = null;
  await updateRuntimeRecords(ADMIN_USER_FILE, (records) => records.map((user) => {
    if (user.id !== userId) return user;
    updatedUser = {
      ...user,
      session_version: crypto.randomBytes(18).toString("hex"),
      last_login_at: now,
      updated_at: now
    };
    return updatedUser;
  }));
  if (!updatedUser) {
    const error = new Error("管理员不存在");
    error.statusCode = 404;
    throw error;
  }
  return updatedUser;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash = "") {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const expected = Buffer.from(parts[2], "hex");
  const actual = crypto.scryptSync(String(password || ""), parts[1], expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function signAdminToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    session_version: user.session_version,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getTokenSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyAdminToken(token) {
  const [body = "", signature = ""] = String(token || "").split(".");
  if (!body || !signature) {
    const error = new Error("无权限或登录已失效");
    error.statusCode = 401;
    throw error;
  }
  const expected = crypto.createHmac("sha256", getTokenSecret()).update(body).digest("base64url");
  const providedSignature = Buffer.from(signature);
  const expectedSignature = Buffer.from(expected);
  if (providedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(providedSignature, expectedSignature)) {
    const error = new Error("无权限或登录已失效");
    error.statusCode = 401;
    throw error;
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    const error = new Error("登录已过期");
    error.statusCode = 401;
    throw error;
  }
  return payload;
}

function getTokenSecret() {
  return process.env.ADMIN_JWT_SECRET || "local-dev-admin-session-secret";
}

function publicAdminUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role || "admin",
    status: user.status || "active",
    must_change_password: Boolean(user.must_change_password)
  };
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}
