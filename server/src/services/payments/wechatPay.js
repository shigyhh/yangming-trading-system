import { assertWechatConfig } from "../paymentConfig.js";

export class NotImplementedError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotImplementedError";
    this.statusCode = 501;
  }
}

export async function createJsapiOrder(order, userContext = {}) {
  assertWechatConfig();
  throw new NotImplementedError("微信 JSAPI 支付适配器尚未接入真实网关");
}

export async function createH5Order(order, clientContext = {}) {
  assertWechatConfig();
  throw new NotImplementedError("微信 H5 支付适配器尚未接入真实网关");
}

export async function verifyWechatNotify(headers = {}, body = Buffer.alloc(0)) {
  assertWechatConfig();
  throw new NotImplementedError("微信支付通知验签尚未接入真实网关");
}

export async function parseWechatNotify(body = Buffer.alloc(0)) {
  assertWechatConfig();
  throw new NotImplementedError("微信支付通知解析尚未接入真实网关");
}

export async function queryWechatOrder(order) {
  assertWechatConfig();
  throw new NotImplementedError("微信支付订单查询尚未接入真实网关");
}
