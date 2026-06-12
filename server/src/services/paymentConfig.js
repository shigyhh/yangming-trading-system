const WECHAT_REQUIRED_KEYS = [
  "WECHAT_MCH_ID",
  "WECHAT_SERVICE_APP_ID",
  "WECHAT_MINI_APP_ID",
  "WECHAT_API_V3_KEY",
  "WECHAT_CERT_SERIAL_NO",
  "WECHAT_PRIVATE_KEY_PATH",
  "WECHAT_PLATFORM_CERT_PATH",
  "WECHAT_NOTIFY_URL",
  "WECHAT_H5_SCENE_INFO",
  "WECHAT_JSAPI_OAUTH_REDIRECT_URL"
];

const ALIPAY_REQUIRED_KEYS = [
  "ALIPAY_APP_ID",
  "ALIPAY_PRIVATE_KEY",
  "ALIPAY_PUBLIC_KEY",
  "ALIPAY_GATEWAY_URL",
  "ALIPAY_NOTIFY_URL",
  "ALIPAY_RETURN_URL"
];

export class PaymentConfigError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "PaymentConfigError";
    this.statusCode = 503;
    this.status = status;
  }
}

export function checkWechatConfig(env = process.env) {
  return checkRequiredConfig("wechat", WECHAT_REQUIRED_KEYS, env);
}

export function checkAlipayConfig(env = process.env) {
  return checkRequiredConfig("alipay", ALIPAY_REQUIRED_KEYS, env);
}

export function assertWechatConfig(env = process.env) {
  const status = checkWechatConfig(env);
  if (status.ok) return status;
  throw new PaymentConfigError("微信支付配置未完成", status);
}

export function assertAlipayConfig(env = process.env) {
  const status = checkAlipayConfig(env);
  if (status.ok) return status;
  throw new PaymentConfigError("支付宝支付配置未完成", status);
}

export function getPaymentConfigStatus(env = process.env) {
  return {
    wechat: checkWechatConfig(env),
    alipay: checkAlipayConfig(env)
  };
}

function checkRequiredConfig(provider, requiredKeys, env) {
  const keys = requiredKeys.map((key) => {
    const present = Boolean(String(env[key] || "").trim());
    return {
      key,
      status: present ? "present" : "missing"
    };
  });
  const missing = keys
    .filter((item) => item.status === "missing")
    .map((item) => `missing ${item.key}`);

  return {
    provider,
    ok: missing.length === 0,
    missing,
    keys
  };
}
