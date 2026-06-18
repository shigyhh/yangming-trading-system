import crypto from "node:crypto";
import fs from "node:fs/promises";
import { assertWechatConfig, getWechatVerifyMode } from "../paymentConfig.js";

export class NotImplementedError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotImplementedError";
    this.statusCode = 501;
  }
}

export async function createJsapiOrder(order, userContext = {}) {
  assertWechatConfig();
  const openid = String(userContext.openid || "").trim();
  if (!openid) {
    const error = new Error("微信 JSAPI 支付需要 openid");
    error.statusCode = 428;
    throw error;
  }
  const result = await requestWechatApi({
    method: "POST",
    path: "/v3/pay/transactions/jsapi",
    body: {
      appid: process.env.WECHAT_SERVICE_APP_ID,
      mchid: process.env.WECHAT_MCH_ID,
      description: order.product_name,
      out_trade_no: order.order_id,
      notify_url: process.env.WECHAT_NOTIFY_URL,
      amount: {
        total: Number(order.amount_cents),
        currency: "CNY"
      },
      payer: { openid }
    }
  });

  const prepayId = result.prepay_id;
  if (!prepayId) {
    const error = new Error("微信 JSAPI 下单未返回 prepay_id");
    error.statusCode = 502;
    throw error;
  }
  return {
    channel: "wechat_jsapi",
    jsapi_params: await createJsapiParams(prepayId)
  };
}

export async function createH5Order(order, clientContext = {}) {
  assertWechatConfig();
  const result = await requestWechatApi({
    method: "POST",
    path: "/v3/pay/transactions/h5",
    body: {
      appid: process.env.WECHAT_SERVICE_APP_ID,
      mchid: process.env.WECHAT_MCH_ID,
      description: order.product_name,
      out_trade_no: order.order_id,
      notify_url: process.env.WECHAT_NOTIFY_URL,
      amount: {
        total: Number(order.amount_cents),
        currency: "CNY"
      },
      scene_info: parseSceneInfo(clientContext)
    }
  });

  const h5Url = result.h5_url;
  if (!h5Url) {
    const error = new Error("微信 H5 下单未返回 h5_url");
    error.statusCode = 502;
    throw error;
  }
  const redirectUrl = String(clientContext.redirectUrl || "");
  const payUrl = redirectUrl ? `${h5Url}${h5Url.includes("?") ? "&" : "?"}redirect_url=${encodeURIComponent(redirectUrl)}` : h5Url;
  return {
    channel: "wechat_h5",
    h5_url: h5Url,
    pay_url: payUrl
  };
}

export async function verifyWechatNotify(headers = {}, body = Buffer.alloc(0)) {
  assertWechatConfig();
  const timestamp = getHeader(headers, "wechatpay-timestamp");
  const nonce = getHeader(headers, "wechatpay-nonce");
  const serial = getHeader(headers, "wechatpay-serial");
  const signature = getHeader(headers, "wechatpay-signature");
  if (!timestamp || !nonce || !serial || !signature) {
    const error = new Error("微信支付通知签名头缺失");
    error.statusCode = 401;
    throw error;
  }

  const publicKey = await readWechatNotifyPublicKey(serial);
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${timestamp}\n${nonce}\n${body.toString("utf8")}\n`);
  verifier.end();
  const ok = verifier.verify(publicKey, signature, "base64");
  if (!ok) {
    const error = new Error("微信支付通知验签失败");
    error.statusCode = 401;
    throw error;
  }
  return true;
}

export async function parseWechatNotify(body = Buffer.alloc(0)) {
  assertWechatConfig();
  const notice = JSON.parse(body.toString("utf8"));
  const resource = notice.resource || {};
  if (resource.algorithm !== "AEAD_AES_256_GCM") {
    const error = new Error("微信支付通知加密算法不支持");
    error.statusCode = 400;
    throw error;
  }

  const encrypted = Buffer.from(resource.ciphertext || "", "base64");
  const ciphertext = encrypted.slice(0, -16);
  const authTag = encrypted.slice(-16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(process.env.WECHAT_API_V3_KEY, "utf8"), normalizeWechatNonce(resource.nonce));
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, "utf8"));
  }
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext);
}

export async function queryWechatOrder(order) {
  assertWechatConfig();
  return requestWechatApi({
    method: "GET",
    path: `/v3/pay/transactions/out-trade-no/${encodeURIComponent(order.order_id)}?mchid=${encodeURIComponent(process.env.WECHAT_MCH_ID)}`
  });
}

export function validateWechatPayment(payload, order) {
  if (payload.out_trade_no !== order.order_id) throw paymentError("微信订单号不一致", 400);
  if (payload.mchid !== process.env.WECHAT_MCH_ID) throw paymentError("微信商户号不一致", 400);
  if (payload.appid !== process.env.WECHAT_SERVICE_APP_ID && payload.appid !== process.env.WECHAT_MINI_APP_ID) throw paymentError("微信 appid 不一致", 400);
  if (payload.trade_state !== "SUCCESS") throw paymentError("微信支付状态不是 SUCCESS", 400);
  if (Number(payload.amount?.total) !== Number(order.amount_cents)) throw paymentError("微信支付金额不一致", 400);
  return true;
}

async function createJsapiParams(prepayId) {
  const appId = process.env.WECHAT_SERVICE_APP_ID;
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const pkg = `prepay_id=${prepayId}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`);
  signer.end();
  return {
    appId,
    timeStamp,
    nonceStr,
    package: pkg,
    signType: "RSA",
    paySign: signer.sign(await readWechatPrivateKey(), "base64")
  };
}

async function requestWechatApi({ method, path, body = null }) {
  const bodyText = body ? JSON.stringify(body) : "";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString("hex");
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${method}\n${path}\n${timestamp}\n${nonce}\n${bodyText}\n`);
  signer.end();
  const signature = signer.sign(await readWechatPrivateKey(), "base64");
  const authorization = [
    "WECHATPAY2-SHA256-RSA2048",
    `mchid="${process.env.WECHAT_MCH_ID}"`,
    `nonce_str="${nonce}"`,
    `signature="${signature}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${process.env.WECHAT_CERT_SERIAL_NO}"`
  ].join(",");

  const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
    method,
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "xxjyxt-ymty-payment/1.0"
    },
    ...(bodyText ? { body: bodyText } : {})
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(data.message || "微信支付网关请求失败");
    error.statusCode = response.status || 502;
    throw error;
  }
  return data;
}

async function readWechatPrivateKey() {
  return fs.readFile(process.env.WECHAT_PRIVATE_KEY_PATH, "utf8");
}

async function readWechatNotifyPublicKey(serial) {
  const verifyMode = getWechatVerifyMode();
  if (verifyMode === "public_key") {
    if (serial !== process.env.WECHAT_PAY_PUBLIC_KEY_ID) {
      const error = new Error("微信支付公钥 ID 不一致");
      error.statusCode = 401;
      throw error;
    }
    return fs.readFile(process.env.WECHAT_PAY_PUBLIC_KEY_PATH, "utf8");
  }
  return fs.readFile(process.env.WECHAT_PLATFORM_CERT_PATH, "utf8");
}

function parseSceneInfo(clientContext = {}) {
  const raw = String(process.env.WECHAT_H5_SCENE_INFO || "").trim();
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // 使用保守兜底，避免配置格式错误时泄露原始配置内容。
    }
  }
  return {
    payer_client_ip: clientContext.ip || "127.0.0.1",
    h5_info: {
      type: "Wap"
    }
  };
}

function getHeader(headers, key) {
  const lower = key.toLowerCase();
  return String(headers[key] || headers[lower] || "");
}

function normalizeWechatNonce(value) {
  return Buffer.from(String(value || ""), "utf8");
}

function paymentError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
