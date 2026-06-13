import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const indexPath = resolve(repoRoot, "web-mvp/hd/ymty/index.html");
const successPath = resolve(repoRoot, "web-mvp/hd/ymty/success.html");
const adminPath = resolve(repoRoot, "web-mvp/admin/ymty/index.html");

function readUtf8(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(source, text) {
  assert.ok(source.includes(text), `Expected page to include: ${text}`);
}

function assertNotIncludes(source, text) {
  assert.ok(!source.includes(text), `Expected page not to include: ${text}`);
}

function removeAllowedCompliancePhrases(source) {
  return source
    .replaceAll("不荐股、不喊单、不承诺收益", "")
    .replaceAll("不荐股", "")
    .replaceAll("不喊单", "")
    .replaceAll("不承诺收益", "")
    .replaceAll("不代客理财", "")
    .replaceAll("不组织实盘跟单", "");
}

test("ymty information-flow landing page contains required conversion sections", () => {
  const html = readUtf8(indexPath);

  [
    "7天",
    "阳明心学交易体验营",
    "用照心训练建立交易纪律",
    "交易纪律",
    "模拟盘训练",
    "风控清单",
    "复盘模板",
    "立即报名体验营",
    "查看7天安排",
    "为什么适合你",
    "情绪容易失控",
    "一涨就追，一跌就慌。",
    "没有交易计划",
    "下单靠感觉，复盘靠记忆。",
    "仓位边界模糊",
    "亏损后容易补仓、加仓、翻本。",
    "复盘没有系统",
    "只记得盈亏，不记录念头、规则和动作。",
    "为什么选择阳明心学交易体验营",
    "照心",
    "取证",
    "训练",
    "复盘",
    "7天课程安排",
    "Day 1：照心：交易前先看见第一念",
    "Day 7：戒律：形成个人交易清单",
    "你将获得",
    "报名流程",
    "支付成功后才展示二维码或跳转企业微信获客助手",
    "未支付用户不能看到入营二维码",
    "适合与不适合",
    "FAQ",
    "风险提示",
    "湘ICP备2026021493号-1",
  ].forEach((text) => assertIncludes(html, text));
});

test("ymty landing page uses live public campaign config and safe order payload", () => {
  const html = readUtf8(indexPath);

  [
    "/api/public/campaign/ymty",
    "/api/pay/create",
    "product_code",
    "pay_channel",
    "success_url",
    "track",
    "wechat_jsapi",
    "wechat_h5",
    "alipay_wap",
    "isWechatBrowser",
    "status !== \"online\"",
    "order_id",
    "order_token",
    "jsapi_params",
    "WeixinJSBridge",
    "pay_url",
    "form_html",
    "mock_payment",
  ].forEach((text) => assertIncludes(html, text));

  [
    "amount_cents",
    "amount_display",
    "amount:",
    "price:",
    "fee:",
  ].forEach((text) => assertNotIncludes(html, text));
});

test("ymty landing page keeps information-flow visual constraints", () => {
  const html = readUtf8(indexPath);

  [
    "--red",
    "--gold",
    "--paper",
    "max-width: 760px",
    "position: fixed",
    "bottom: 0",
    "overflow-x: hidden",
    "coupon",
    "floating-enroll",
  ].forEach((text) => assertIncludes(html, text));
});

test("ymty landing page avoids high-risk advertising terms outside compliance disclaimers", () => {
  const html = removeAllowedCompliancePhrases(readUtf8(indexPath));
  const forbiddenTerms = [
    "自动炒股",
    "自动交易",
    "胜率",
    "稳赚",
    "保证收益",
    "牛股",
    "推荐买入",
    "推荐卖出",
    "买卖点",
    "跟单",
    "带单",
    "代客理财",
    "24小时自动执行",
    "精准交易",
    "一买就涨",
    "翻倍",
    "技术提示",
    "客服电话待补充",
  ];

  forbiddenTerms.forEach((term) => assertNotIncludes(html, term));
});

test("ymty success page unlocks after paid status only", () => {
  const html = readUtf8(successPath);

  [
    "/api/order/status",
    "/api/afterpay/entrance",
    "order_id",
    "token",
    "paid",
    "入口未解锁",
    "auto_redirect_after_paid",
    "redirect_delay_ms",
    "wecom_link",
    "qr_image",
    "长按识别二维码，添加课程助教",
    "如未自动跳转，点击添加课程助教",
    "<img",
  ].forEach((text) => assertIncludes(html, text));

  assertNotIncludes(html, "技术提示");
  assertNotIncludes(html, "客服电话待补充");
});

test("ymty admin page requires session token and supports livecode QR upload", () => {
  const html = readUtf8(adminPath);

  [
    "Admin Token",
    "sessionStorage",
    "Authorization",
    "Bearer",
    "无权限或登录已失效",
    "/api/admin/campaign/ymty",
    "/api/admin/livecode",
    "/api/admin/upload",
    "上传二维码",
    "qr_image",
    "wecom_link",
    "auto_redirect_after_paid",
    "redirect_delay_ms",
    "remark",
    "button_text",
    "service_text",
  ].forEach((text) => assertIncludes(html, text));
});
