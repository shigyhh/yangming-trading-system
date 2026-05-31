import crypto from "node:crypto";
import { config } from "../config.js";
import { updateRuntimeRecords } from "../lib/store.js";

const CODE_FILE = "phone-verification-codes.json";
const PHONE_RE = /^1[3-9]\d{9}$/;

export function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

export function assertValidPhone(phone) {
  if (!PHONE_RE.test(phone)) {
    const error = new Error("请输入正确的手机号");
    error.statusCode = 400;
    throw error;
  }
}

export async function createPhoneLoginCode({ phone, ipAddress = "", userAgent = "" }) {
  const normalizedPhone = normalizePhone(phone);
  assertValidPhone(normalizedPhone);

  const now = Date.now();
  const code = createNumericCode(config.smsCodeLength);
  const expiresAt = new Date(now + config.smsCodeTtlSeconds * 1000).toISOString();
  let record;

  await updateRuntimeRecords(CODE_FILE, (records) => {
    const active = records
      .filter((item) => item.phone === normalizedPhone && !item.used_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (active && now - new Date(active.created_at).getTime() < config.smsCodeCooldownSeconds * 1000) {
      const waitSeconds = Math.ceil(
        (config.smsCodeCooldownSeconds * 1000 - (now - new Date(active.created_at).getTime())) / 1000
      );
      const error = new Error(`验证码已发送，请 ${waitSeconds} 秒后再试`);
      error.statusCode = 429;
      throw error;
    }

    record = {
      id: crypto.randomUUID(),
      phone: normalizedPhone,
      code_hash: hashCode(normalizedPhone, code),
      purpose: "login",
      attempts: 0,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date(now).toISOString(),
      expires_at: expiresAt,
      used_at: null
    };

    return records
      .filter((item) => new Date(item.expires_at).getTime() > now - 24 * 60 * 60 * 1000)
      .concat(record);
  });

  const delivery = await deliverPhoneCode({ phone: normalizedPhone, code });
  return {
    phone: normalizedPhone,
    expires_at: expiresAt,
    expires_in: config.smsCodeTtlSeconds,
    cooldown_seconds: config.smsCodeCooldownSeconds,
    provider: delivery.provider,
    delivery_status: delivery.status,
    demo_code: delivery.demoCode || ""
  };
}

export async function verifyPhoneLoginCode({ phone, code }) {
  const normalizedPhone = normalizePhone(phone);
  assertValidPhone(normalizedPhone);
  const normalizedCode = String(code || "").trim();

  if (!/^\d{4,8}$/.test(normalizedCode)) {
    const error = new Error("请输入正确的验证码");
    error.statusCode = 400;
    throw error;
  }

  const now = Date.now();
  let verified = false;

  await updateRuntimeRecords(CODE_FILE, (records) => {
    const index = records.findIndex((item) => {
      return (
        item.phone === normalizedPhone &&
        !item.used_at &&
        new Date(item.expires_at).getTime() > now &&
        item.purpose === "login"
      );
    });

    if (index < 0) {
      const error = new Error("验证码不存在或已过期，请重新获取");
      error.statusCode = 400;
      throw error;
    }

    const record = records[index];
    record.attempts = Number(record.attempts || 0) + 1;
    if (record.attempts > config.smsCodeMaxAttempts) {
      record.used_at = new Date(now).toISOString();
      const error = new Error("验证码错误次数过多，请重新获取");
      error.statusCode = 429;
      throw error;
    }

    if (record.code_hash !== hashCode(normalizedPhone, normalizedCode)) {
      const error = new Error("验证码不正确");
      error.statusCode = 400;
      throw error;
    }

    record.used_at = new Date(now).toISOString();
    verified = true;
    return records;
  });

  return verified;
}

async function deliverPhoneCode({ phone, code }) {
  if (config.smsProvider === "aliyun") {
    return deliverViaAliyun({ phone, code });
  }

  if (config.smsProvider === "webhook") {
    return deliverViaWebhook({ phone, code });
  }

  return {
    provider: "mock",
    status: "mock_delivered",
    demoCode: config.smsExposeMockCode ? code : ""
  };
}

async function deliverViaAliyun({ phone, code }) {
  assertAliyunSmsConfig();

  const { endpointUrl, canonicalUri, requestUrl } = createAliyunRequestTarget();
  const hashedPayload = sha256Hex("");
  const signedHeaders = "host;x-acs-action;x-acs-content-sha256;x-acs-date;x-acs-signature-nonce;x-acs-version";
  const headersToSign = {
    host: endpointUrl.host,
    "x-acs-action": "SendSms",
    "x-acs-content-sha256": hashedPayload,
    "x-acs-date": createAliyunDate(),
    "x-acs-signature-nonce": crypto.randomUUID(),
    "x-acs-version": "2017-05-25"
  };
  const query = canonicalizeQuery({
    PhoneNumbers: phone,
    SignName: config.smsSignName,
    TemplateCode: config.smsTemplateCode,
    TemplateParam: JSON.stringify({ code }),
    ...(config.aliyunSmsRegionId ? { RegionId: config.aliyunSmsRegionId } : {})
  });
  const canonicalHeaders = Object.keys(headersToSign)
    .sort()
    .map((key) => `${key}:${headersToSign[key]}\n`)
    .join("");
  const canonicalRequest = ["POST", canonicalUri, query, canonicalHeaders, signedHeaders, hashedPayload].join("\n");
  const stringToSign = ["ACS3-HMAC-SHA256", sha256Hex(canonicalRequest)].join("\n");
  const signature = hmacSha256Hex(config.aliyunAccessKeySecret, stringToSign);
  const response = await fetch(`${requestUrl}?${query}`, {
    method: "POST",
    headers: {
      ...headersToSign,
      Authorization: `ACS3-HMAC-SHA256 Credential=${config.aliyunAccessKeyId},SignedHeaders=${signedHeaders},Signature=${signature}`
    }
  });
  const payload = await parseAliyunSmsResponse(response);

  if (!response.ok || payload.Code !== "OK") {
    const message = payload.Message || payload.Code || `HTTP ${response.status}`;
    const error = new Error(`短信服务发送失败：${message}`);
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: "aliyun",
    status: "sent",
    requestId: payload.RequestId || "",
    demoCode: ""
  };
}

async function deliverViaWebhook({ phone, code }) {
  if (!config.smsWebhookUrl) {
    const error = new Error("短信服务未配置，请先设置 SMS_WEBHOOK_URL");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(config.smsWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.smsWebhookToken ? { Authorization: `Bearer ${config.smsWebhookToken}` } : {})
    },
    body: JSON.stringify({
      phone,
      code,
      sign_name: config.smsSignName,
      template_code: config.smsTemplateCode,
      expires_in: config.smsCodeTtlSeconds
    })
  });

  if (!response.ok) {
    const error = new Error(`短信服务发送失败：HTTP ${response.status}`);
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: "webhook",
    status: "sent",
    demoCode: ""
  };
}

function createNumericCode(length) {
  const size = Math.max(4, Math.min(Number(length) || 6, 8));
  const max = 10 ** size;
  return String(crypto.randomInt(0, max)).padStart(size, "0");
}

function hashCode(phone, code) {
  return crypto
    .createHash("sha256")
    .update(`${phone}:${code}:${config.authCodeSecret}`)
    .digest("hex");
}

function assertAliyunSmsConfig() {
  const missing = [];
  if (!config.aliyunAccessKeyId) missing.push("ALIYUN_ACCESS_KEY_ID");
  if (!config.aliyunAccessKeySecret) missing.push("ALIYUN_ACCESS_KEY_SECRET");
  if (!config.smsSignName) missing.push("SMS_SIGN_NAME");
  if (!config.smsTemplateCode) missing.push("SMS_TEMPLATE_CODE");

  if (missing.length > 0) {
    const error = new Error(`短信服务未配置：${missing.join(", ")}`);
    error.statusCode = 500;
    throw error;
  }
}

function createAliyunRequestTarget() {
  const endpointUrl = new URL(config.aliyunSmsEndpoint || "https://dysmsapi.aliyuncs.com");
  const canonicalUri = endpointUrl.pathname && endpointUrl.pathname !== "/" ? endpointUrl.pathname : "/";
  const requestUrl = `${endpointUrl.origin}${canonicalUri === "/" ? "" : canonicalUri}`;
  return { endpointUrl, canonicalUri, requestUrl };
}

function createAliyunDate() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function canonicalizeQuery(params) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .sort()
    .map((key) => `${encodeRFC3986(key)}=${encodeRFC3986(params[key])}`)
    .join("&");
}

function encodeRFC3986(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (char) => {
    return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
  });
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmacSha256Hex(secret, value) {
  return crypto.createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

async function parseAliyunSmsResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("短信服务返回格式异常");
    error.statusCode = 502;
    throw error;
  }
}
