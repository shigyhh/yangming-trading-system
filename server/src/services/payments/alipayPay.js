import { assertAlipayConfig } from "../paymentConfig.js";
import { NotImplementedError } from "./wechatPay.js";

export async function createWapOrder(order, clientContext = {}) {
  assertAlipayConfig();
  throw new NotImplementedError("支付宝手机网站支付适配器尚未接入真实网关");
}

export async function verifyAlipayNotify(params = {}) {
  assertAlipayConfig();
  throw new NotImplementedError("支付宝通知验签尚未接入真实网关");
}

export async function parseAlipayNotify(params = {}) {
  assertAlipayConfig();
  throw new NotImplementedError("支付宝通知解析尚未接入真实网关");
}

export async function queryAlipayOrder(order) {
  assertAlipayConfig();
  throw new NotImplementedError("支付宝订单查询尚未接入真实网关");
}
