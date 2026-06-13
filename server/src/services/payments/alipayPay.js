import crypto from "node:crypto";
import { assertAlipayConfig } from "../paymentConfig.js";

export async function createWapOrder(order, clientContext = {}) {
  assertAlipayConfig();
  const params = {
    app_id: process.env.ALIPAY_APP_ID,
    method: "alipay.trade.wap.pay",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: formatAlipayTimestamp(new Date()),
    version: "1.0",
    notify_url: process.env.ALIPAY_NOTIFY_URL,
    return_url: clientContext.returnUrl || process.env.ALIPAY_RETURN_URL,
    biz_content: JSON.stringify({
      out_trade_no: order.order_id,
      total_amount: centsToYuan(order.amount_cents),
      subject: order.product_name,
      product_code: "QUICK_WAP_WAY"
    })
  };
  const sign = signAlipayParams(params);
  const signedParams = { ...params, sign };
  return {
    channel: "alipay_wap",
    form_html: buildAlipayForm(process.env.ALIPAY_GATEWAY_URL, signedParams),
    pay_url: `${process.env.ALIPAY_GATEWAY_URL}?${new URLSearchParams(signedParams).toString()}`
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
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(canonicalAlipayString(params));
  verifier.end();
  const ok = verifier.verify(process.env.ALIPAY_PUBLIC_KEY, signature, "base64");
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
  const params = {
    app_id: process.env.ALIPAY_APP_ID,
    method: "alipay.trade.query",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: formatAlipayTimestamp(new Date()),
    version: "1.0",
    biz_content: JSON.stringify({ out_trade_no: order.order_id })
  };
  const signedParams = { ...params, sign: signAlipayParams(params) };
  const response = await fetch(process.env.ALIPAY_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
    },
    body: new URLSearchParams(signedParams).toString()
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error("支付宝订单查询失败");
    error.statusCode = response.status || 502;
    throw error;
  }
  return data;
}

export function validateAlipayPayment(payload, order) {
  if (payload.app_id !== process.env.ALIPAY_APP_ID) throw paymentError("支付宝 app_id 不一致", 400);
  if (payload.out_trade_no !== order.order_id) throw paymentError("支付宝订单号不一致", 400);
  if (!["TRADE_SUCCESS", "TRADE_FINISHED"].includes(payload.trade_status)) throw paymentError("支付宝交易状态未成功", 400);
  if (payload.total_amount !== centsToYuan(order.amount_cents)) throw paymentError("支付宝支付金额不一致", 400);
  return true;
}

function signAlipayParams(params) {
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(canonicalAlipayString(params));
  signer.end();
  return signer.sign(process.env.ALIPAY_PRIVATE_KEY, "base64");
}

function canonicalAlipayString(params) {
  return Object.keys(params)
    .filter((key) => key !== "sign" && key !== "sign_type" && params[key] !== undefined && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

function buildAlipayForm(gatewayUrl, params) {
  const inputs = Object.entries(params)
    .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`)
    .join("");
  return `<!doctype html><html><body><form id="alipaySubmit" method="post" action="${escapeHtml(gatewayUrl)}">${inputs}</form><script>document.getElementById("alipaySubmit").submit();</script></body></html>`;
}

function centsToYuan(cents) {
  return (Number(cents) / 100).toFixed(2);
}

function formatAlipayTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paymentError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
