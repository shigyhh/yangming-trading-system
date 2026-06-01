import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");

loadLocalEnv(path.resolve(serverRoot, ".env"));

export const config = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  serverRoot,
  webDir: path.resolve(serverRoot, process.env.WEB_DIR || "../web-mvp"),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  serveWeb: process.env.SERVE_WEB !== "false",
  dataDir: path.resolve(serverRoot, "data"),
  marketDataDir: path.resolve(serverRoot, "data", "market"),
  runtimeDir: path.resolve(serverRoot, "data", "runtime"),
  questionBankPath: path.resolve(serverRoot, "data", "question-bank.json"),
  klinePracticeBankPath: path.resolve(serverRoot, "data", "kline-practice-bank.json"),
  sourceQuestionBankPath: path.resolve(serverRoot, process.env.QUESTION_BANK_SOURCE || "../web-mvp/data/question-bank.json"),
  jsonBodyLimitBytes: Number(process.env.JSON_BODY_LIMIT_BYTES || 256 * 1024),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 180),
  strictRateLimitMax: Number(process.env.STRICT_RATE_LIMIT_MAX || 40),
  ashareKlineBegin: process.env.ASHARE_KLINE_BEGIN || "19900101",
  ashareKlineLimit: Number(process.env.ASHARE_KLINE_LIMIT || 5000),
  klineDownloadToken: process.env.KLINE_DOWNLOAD_TOKEN || "",
  tushareToken: process.env.TUSHARE_TOKEN || "",
  tushareEndpoint: process.env.TUSHARE_ENDPOINT || "https://api.tushare.pro",
  futuOpenApiBridgeUrl: process.env.FUTU_OPENAPI_BRIDGE_URL || "",
  okxEndpoint: process.env.OKX_ENDPOINT || "https://www.okx.com",
  allowClientFeishuWebhook: process.env.ALLOW_CLIENT_FEISHU_WEBHOOK === "true",
  authCodeSecret: process.env.AUTH_CODE_SECRET || process.env.SESSION_SECRET || "local-dev-auth-code-secret",
  smsProvider: process.env.SMS_PROVIDER || "mock",
  smsExposeMockCode: process.env.SMS_EXPOSE_MOCK_CODE !== "false",
  smsCodeLength: Number(process.env.SMS_CODE_LENGTH || 6),
  smsCodeTtlSeconds: Number(process.env.SMS_CODE_TTL_SECONDS || 300),
  smsCodeCooldownSeconds: Number(process.env.SMS_CODE_COOLDOWN_SECONDS || 60),
  smsCodeMaxAttempts: Number(process.env.SMS_CODE_MAX_ATTEMPTS || 5),
  smsWebhookUrl: process.env.SMS_WEBHOOK_URL || "",
  smsWebhookToken: process.env.SMS_WEBHOOK_TOKEN || "",
  smsSignName: process.env.SMS_SIGN_NAME || "",
  smsTemplateCode: process.env.SMS_TEMPLATE_CODE || "",
  aliyunAccessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || "",
  aliyunAccessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || "",
  aliyunSmsEndpoint: process.env.ALIYUN_SMS_ENDPOINT || "https://dysmsapi.aliyuncs.com",
  aliyunSmsRegionId: process.env.ALIYUN_SMS_REGION_ID || "cn-hangzhou",
  wechatMpAppId: process.env.WECHAT_MP_APP_ID || "",
  wechatMpAppSecret: process.env.WECHAT_MP_APP_SECRET || "",
  wechatMpScope: process.env.WECHAT_MP_SCOPE || "snsapi_userinfo",
  wechatOpenAppId: process.env.WECHAT_OPEN_APP_ID || "",
  wechatOpenAppSecret: process.env.WECHAT_OPEN_APP_SECRET || "",
  corsAllowedOrigins: parseList(
    process.env.CORS_ALLOWED_ORIGINS ||
      "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8787,http://127.0.0.1:8787,http://localhost:8790,http://127.0.0.1:8790,http://localhost:8795,http://127.0.0.1:8795,http://116.62.146.166,http://xxjyxt.com,http://www.xxjyxt.com,https://xxjyxt.com,https://www.xxjyxt.com"
  ),
  feishuBotWebhook: process.env.FEISHU_BOT_WEBHOOK || "",
  feishuBotSecret: process.env.FEISHU_BOT_SECRET || "",
  feishuAutoSync: process.env.FEISHU_AUTO_SYNC === "true"
};

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadLocalEnv(filePath) {
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(filePath);
      return;
    } catch {
      // 继续使用兼容解析，避免旧版/异常环境下 .env 失效。
    }
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;

      const key = match[1];
      let value = match[2].trim();
      const quote = value[0];
      if ((quote === "\"" || quote === "'") && value.endsWith(quote)) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // 本地没有 .env 时直接使用系统环境变量和默认值。
  }
}
