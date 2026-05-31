import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

export async function readJson(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > config.jsonBodyLimitBytes) {
      const error = new Error(`请求体过大，最大允许 ${Math.round(config.jsonBodyLimitBytes / 1024)}KB`);
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("请求体不是合法 JSON");
    error.statusCode = 400;
    throw error;
  }
}

export function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(res),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

export function sendOptions(res) {
  res.writeHead(204, {
    ...corsHeaders(res),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end();
}

export function notFound(res) {
  sendJson(res, 404, {
    ok: false,
    error: "接口不存在"
  });
}

export async function serveStatic(req, res, { rootDir, pathname }) {
  if (pathname === "/data/question-bank.json" && process.env.EXPOSE_PUBLIC_QUESTION_BANK !== "true") {
    return false;
  }

  const filePath = await resolveStaticPath(rootDir, pathname);
  if (!filePath) return false;

  const body = await fs.readFile(filePath);
  const type = contentType(filePath);
  const isHtml = type.startsWith("text/html");

  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": isHtml ? "no-store" : "public, max-age=300",
    "X-Content-Type-Options": "nosniff"
  });
  if (req.method === "HEAD") {
    res.end();
    return true;
  }

  res.end(body);
  return true;
}

export function handleError(res, error) {
  const statusCode = error.statusCode || 500;
  sendJson(res, statusCode, {
    ok: false,
    error: error.message || "服务器内部错误"
  });
}

export function applyCorsContext(req, res) {
  const origin = req.headers.origin || "";
  res.corsOrigin = resolveCorsOrigin(origin, req);
  res.corsRejected = Boolean(origin && !res.corsOrigin);
}

export function rejectCorsIfNeeded(req, res) {
  if (!req.url?.startsWith("/api/")) return false;
  if (!res.corsRejected) return false;
  sendJson(res, 403, {
    ok: false,
    error: "当前来源不允许访问接口"
  });
  return true;
}

async function resolveStaticPath(rootDir, pathname) {
  const indexPath = path.join(rootDir, "index.html");
  let decoded = "/";

  try {
    decoded = decodeURIComponent(pathname || "/");
  } catch {
    const error = new Error("页面路径不合法");
    error.statusCode = 400;
    throw error;
  }

  const requestedPath = decoded === "/" ? "/index.html" : decoded;
  const normalized = path.normalize(`.${requestedPath}`);
  const filePath = path.resolve(rootDir, normalized);
  const relativePath = path.relative(rootDir, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return null;

  const stat = await statFile(filePath);
  if (stat?.isFile()) return filePath;
  if (stat?.isDirectory()) {
    const nestedIndex = path.join(filePath, "index.html");
    const nestedStat = await statFile(nestedIndex);
    if (nestedStat?.isFile()) return nestedIndex;
  }

  if (!path.extname(decoded)) {
    const indexStat = await statFile(indexPath);
    if (indexStat?.isFile()) return indexPath;
  }

  return null;
}

async function statFile(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon"
  };
  return map[ext] || "application/octet-stream";
}

function resolveCorsOrigin(origin, req) {
  if (!origin) return "";
  const host = req.headers.host;
  if (host && (origin === `http://${host}` || origin === `https://${host}`)) return origin;
  return config.corsAllowedOrigins.includes(origin) ? origin : "";
}

function corsHeaders(res) {
  if (!res.corsOrigin) return {};
  return {
    "Access-Control-Allow-Origin": res.corsOrigin,
    "Vary": "Origin"
  };
}
