import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexUrl = new URL("../../web-mvp/hd/ymty/index.html", import.meta.url);
const successUrl = new URL("../../web-mvp/hd/ymty/success.html", import.meta.url);

test("ymty h5 landing page reads public config and creates backend-priced orders", async () => {
  const page = await readFile(indexUrl, "utf8");

  ;[
    "心不静，交易必乱。",
    "一个动作：停十秒，先照心。",
    "一个系统：心证、取证、训练、复盘、纪律。",
    "湘ICP备2026021493号-1",
    "客服方式：支付后添加课程助教微信",
    "/api/public/campaign/ymty",
    "/api/pay/create",
    "wechat_jsapi",
    "wechat_h5",
    "alipay_wap",
    "success_url",
    "track",
    "isWechatBrowser",
    "status !== \"online\"",
  ].forEach((token) => {
    assert.ok(page.includes(token), `landing page missing ${token}`);
  });

  assert.equal(page.includes("amount_cents"), false, "landing page must not send amount_cents");
  assert.equal(page.includes("技术提示"), false, "landing page should not show technical hints");
  assert.equal(page.includes("客服电话待补充"), false, "landing page should not keep placeholder service copy");
});

test("ymty success page unlocks livecode only through paid afterpay entrance", async () => {
  const page = await readFile(successUrl, "utf8");

  ;[
    "URLSearchParams",
    "order_id",
    "token",
    "/api/order/status",
    "/api/afterpay/entrance",
    "入口未解锁",
    "auto_redirect",
    "auto_redirect_after_paid",
    "redirect_delay_ms",
    "wecom_link",
    "qr_image",
    "长按识别二维码，添加课程助教",
    "如未自动跳转，点击添加课程助教",
    "<img",
    "助教入口配置中，请联系管理员",
  ].forEach((token) => {
    assert.ok(page.includes(token), `success page missing ${token}`);
  });

  assert.equal(page.includes("display: block\" id=\"qrImage"), false, "success page must not show qr by default");
});
