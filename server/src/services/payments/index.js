import { assertAlipayConfig, assertWechatConfig, PaymentConfigError } from "../paymentConfig.js";
import {
  createH5Order,
  createJsapiOrder,
  parseWechatNotify,
  queryWechatOrder,
  verifyWechatNotify
} from "./wechatPay.js";
import {
  createWapOrder,
  parseAlipayNotify,
  queryAlipayOrder,
  verifyAlipayNotify
} from "./alipayPay.js";

export {
  createH5Order,
  createJsapiOrder,
  createWapOrder,
  parseAlipayNotify,
  parseWechatNotify,
  queryAlipayOrder,
  queryWechatOrder,
  verifyAlipayNotify,
  verifyWechatNotify
};

export const supportedPayChannels = ["mock", "wechat_jsapi", "wechat_h5", "alipay_wap"];

export function normalizePayChannel(value = "mock") {
  return String(value || "mock").trim();
}

export function assertSupportedPayChannel(payChannel) {
  if (supportedPayChannels.includes(payChannel)) return;
  const error = new Error("支付渠道不支持");
  error.statusCode = 400;
  throw error;
}

export function assertRealPayConfigReady(payChannel) {
  assertSupportedPayChannel(payChannel);
  if (payChannel === "mock") return { ok: true, provider: "mock" };
  if (payChannel === "wechat_jsapi" || payChannel === "wechat_h5") return assertWechatConfig();
  if (payChannel === "alipay_wap") return assertAlipayConfig();
}

export function isPaymentConfigError(error) {
  return error instanceof PaymentConfigError || error?.name === "PaymentConfigError";
}
