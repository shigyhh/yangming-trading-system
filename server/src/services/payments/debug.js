import crypto from "node:crypto";

export function isPaymentDebugEnabled() {
  return String(process.env.PAYMENT_DEBUG || "").trim().toLowerCase() === "true";
}

export function createPaymentProviderError({
  provider,
  code,
  message,
  statusCode = 502,
  debug = {}
}) {
  const error = new Error(message || "支付网关请求失败");
  error.statusCode = statusCode;
  error.provider = provider;
  error.providerCode = code || "PAYMENT_PROVIDER_ERROR";
  error.providerMessage = message || error.message;
  error.paymentDebug = debug;
  return error;
}

export function logPaymentDebug(provider, payload = {}) {
  if (!isPaymentDebugEnabled()) return;
  const safePayload = {
    provider,
    ...sanitizePayload(payload)
  };
  console.warn("[payment-debug]", JSON.stringify(safePayload));
}

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

export function privateKeyPublicFingerprint(privateKeyPem) {
  try {
    const publicDer = crypto
      .createPublicKey(privateKeyPem)
      .export({ type: "spki", format: "der" });
    return crypto.createHash("sha256").update(publicDer).digest("hex");
  } catch {
    return "unavailable";
  }
}

export function appIdLast4(value) {
  const text = String(value || "");
  return text ? text.slice(-4) : "";
}

function sanitizePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => {
    if (isSensitiveDebugKey(key)) return [key, "[redacted]"];
    if (value && typeof value === "object" && !Array.isArray(value)) return [key, sanitizePayload(value)];
    return [key, value];
  }));
}

function isSensitiveDebugKey(key) {
  const lower = String(key || "").toLowerCase();
  return lower === "sign"
    || lower === "signature"
    || lower === "authorization"
    || lower === "cookie"
    || lower.includes("token")
    || lower.includes("private_key")
    || lower.includes("api_v3_key")
    || lower.includes("appsecret")
    || lower.endsWith("secret");
}
