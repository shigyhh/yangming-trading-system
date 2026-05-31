import { config } from "../config.js";

const buckets = new Map();
const strictPathMatchers = [
  /^\/api\/v1\/auth\/demo-login$/,
  /^\/api\/v1\/auth\/sms\/send$/,
  /^\/api\/v1\/auth\/phone-login$/,
  /^\/api\/v1\/assessments\/start$/,
  /^\/api\/v1\/kline-practice\/submit$/,
  /^\/api\/v1\/integrations\/feishu\/report$/
];

export function checkRateLimit(req) {
  const ip = getIp(req);
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const isStrict = strictPathMatchers.some((matcher) => matcher.test(pathname));
  const max = isStrict ? config.strictRateLimitMax : config.rateLimitMax;
  const key = `${isStrict ? "strict" : "normal"}:${ip}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.rateLimitWindowMs });
    cleanup(now);
    return;
  }

  current.count += 1;
  if (current.count > max) {
    const error = new Error("请求过于频繁，请稍后再试");
    error.statusCode = 429;
    throw error;
  }
}

function cleanup(now) {
  if (buckets.size < 5000) return;
  for (const [key, value] of buckets.entries()) {
    if (now > value.resetAt) buckets.delete(key);
  }
}

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}
