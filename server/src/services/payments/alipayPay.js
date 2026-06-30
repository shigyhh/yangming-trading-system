import fs from "node:fs/promises";
import { AlipaySdk } from "alipay-sdk";
import { assertAlipayConfig } from "../paymentConfig.js";
import {
  appIdLast4,
  logPaymentDebug,
  privateKeyPublicFingerprint,
  sha256Hex
} from "./debug.js";

export async function createWapOrder(order, clientContext = {}) {
  assertAlipayConfig();
  const sdk = await createAlipaySdk();
  const returnUrl = clientContext.returnUrl || process.env.ALIPAY_RETURN_URL;
  const bizContent = {
    outTradeNo: order.order_id,
    totalAmount: centsToYuan(order.amount_cents),
    subject: order.product_name,
    productCode: "QUICK_WAP_WAY"
  };
  const formHtml = sdk.pageExec("alipay.trade.wap.pay", "POST", {
    notifyUrl: process.env.ALIPAY_NOTIFY_URL,
    returnUrl,
    bizContent
  });
  logPaymentDebug("alipay", {
    app_id_last4: appIdLast4(process.env.ALIPAY_APP_ID),
    gateway_host: new URL(process.env.ALIPAY_GATEWAY_URL).host,
    method: "alipay.trade.wap.pay",
    charset: getAlipayCharset(),
    sign_type: getAlipaySignType(),
    out_trade_no: order.order_id,
    canonical_sha256: sha256Hex(JSON.stringify({
      method: "alipay.trade.wap.pay",
      notifyUrl: process.env.ALIPAY_NOTIFY_URL,
      returnUrl,
      bizContent
    })),
    app_public_key_sha256: privateKeyPublicFingerprint(await readAlipayPrivateKey())
  });
  return {
    channel: "alipay_wap",
    form_html: formHtml
  };
}

export async function verifyAlipayNotify(params = {}) {
  assertAlipayConfig();
  const signature = String(params.sign || "");
  if (!signature) {
    const error = new Error("支付宝通知签名缺失");
    error.statusCode = 401;
    throw error;
  }
  const sdk = await createAlipaySdk();
  const ok = sdk.checkNotifySign(params, true);
  if (!ok) {
    const error = new Error("支付宝通知验签失败");
    error.statusCode = 401;
    throw error;
  }
  return true;
}

export async function parseAlipayNotify(params = {}) {
  assertAlipayConfig();
  return {
    app_id: params.app_id,
    out_trade_no: params.out_trade_no,
    trade_no: params.trade_no,
    total_amount: params.total_amount,
    trade_status: params.trade_status,
    raw: params
  };
}

export async function queryAlipayOrder(order) {
  assertAlipayConfig();
  const sdk = await createAlipaySdk();
  return sdk.exec("alipay.trade.query", {
    bizContent: {
      outTradeNo: order.order_id
    }
  });
}

export async function createAlipayRefund(refund, order) {
  assertAlipayConfig();
  const sdk = await createAlipaySdk();
  const bizContent = {
    outTradeNo: order.order_id,
    refundAmount: centsToYuan(refund.amount_cents),
    refundReason: trimAlipayReason(refund.reason),
    outRequestNo: refund.refund_id
  };
  if (order.transaction_id) {
    bizContent.tradeNo = order.transaction_id;
  }
  return sdk.exec("alipay.trade.refund", { bizContent }, { validateSign: true });
}

export async function queryAlipayRefund(refund, order) {
  assertAlipayConfig();
  const sdk = await createAlipaySdk();
  const bizContent = {
    outTradeNo: order.order_id,
    outRequestNo: refund.refund_id
  };
  if (order.transaction_id) {
    bizContent.tradeNo = order.transaction_id;
  }
  return sdk.exec("alipay.trade.fastpay.refund.query", { bizContent }, { validateSign: true });
}

export function validateAlipayPayment(payload, order) {
  if (payload.app_id !== process.env.ALIPAY_APP_ID) throw paymentError("支付宝 app_id 不一致", 400);
  if (payload.out_trade_no !== order.order_id) throw paymentError("支付宝订单号不一致", 400);
  if (!["TRADE_SUCCESS", "TRADE_FINISHED"].includes(payload.trade_status)) throw paymentError("支付宝交易状态未成功", 400);
  if (payload.total_amount !== centsToYuan(order.amount_cents)) throw paymentError("支付宝支付金额不一致", 400);
  return true;
}

async function readAlipayPrivateKey() {
  return fs.readFile(process.env.ALIPAY_PRIVATE_KEY_PATH, "utf8");
}

async function readAlipayPublicKey() {
  return fs.readFile(process.env.ALIPAY_PUBLIC_KEY_PATH, "utf8");
}

async function createAlipaySdk() {
  return new AlipaySdk({
    appId: process.env.ALIPAY_APP_ID,
    privateKey: await readAlipayPrivateKey(),
    alipayPublicKey: await readAlipayPublicKey(),
    gateway: process.env.ALIPAY_GATEWAY_URL,
    signType: getAlipaySignType(),
    charset: getAlipayCharset(),
    version: "1.0",
    keyType: "PKCS8"
  });
}

function centsToYuan(cents) {
  return (Number(cents) / 100).toFixed(2);
}

function trimAlipayReason(reason) {
  return String(reason || "用户申请退款")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 256) || "用户申请退款";
}

function getAlipaySignType() {
  return String(process.env.ALIPAY_SIGN_TYPE || "RSA2").trim() || "RSA2";
}

function getAlipayCharset() {
  return String(process.env.ALIPAY_CHARSET || "utf-8").trim() || "utf-8";
}

function paymentError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
