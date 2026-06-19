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
const agreementPaths = [
  resolve(repoRoot, "web-mvp/agreement/privacy.html"),
  resolve(repoRoot, "web-mvp/agreement/service.html"),
  resolve(repoRoot, "web-mvp/agreement/refund.html")
];

function readUtf8(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(source, text) {
  assert.ok(source.includes(text), `Expected to include: ${text}`);
}

function assertNotIncludes(source, text) {
  assert.ok(!source.includes(text), `Expected not to include: ${text}`);
}

function removeRequiredCompliancePhrases(source) {
  return source
    .replaceAll("不荐股，不喊单，不承诺收益", "")
    .replaceAll("不荐股、不喊单、不承诺收益", "")
    .replaceAll("不荐股", "")
    .replaceAll("不喊单", "")
    .replaceAll("不承诺收益", "")
    .replaceAll("不代客理财", "")
    .replaceAll("不组织实盘跟单", "")
    .replaceAll("想跟单赚钱的人", "")
    .replaceAll("期待保证收益的人", "")
    .replaceAll("历史案例、模拟盘演示不代表未来收益", "");
}

function extractCreateOrderPayload(html) {
  const match = html.match(/const payload = \{[\s\S]*?\n\s*\};/);
  assert.ok(match, "Expected createOrder payload object to exist");
  return match[0];
}

test("ymty landing page is a simple continuous conversion page", () => {
  const html = readUtf8(indexPath);
  const sectionCount = (html.match(/<section\b/g) || []).length;
  const sectionIds = [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(sectionCount, 5, "Expected landing page to keep five compact core modules");
  assert.deepEqual(sectionIds, ["hero", "pain-method", "training", "result-fit", "signup"]);

  [
    "class=\"page\"",
    "class=\"hero\"",
    "id=\"pain-method\"",
    "id=\"training\"",
    "id=\"result-fit\"",
    "id=\"signup\"",
    "class=\"pay-sheet\"",
    "id=\"paySheet\"",
    "data-pay-choice=\"wechat\"",
    "data-pay-choice=\"alipay\"",
    "/assets/ymty-zhao-logo.svg",
    "你不是输给行情",
    "你是输给了<b>下单那一念</b>",
    "照心、停顿、取证、复盘",
    "看看我是否适合",
    "这些时刻，你可能太熟了",
    "交易真正难的",
    "不是知道，是做到",
    "Day1",
    "Day7",
    "你将获得",
    "7天直播训练",
    "交易日志模板",
    "风控清单",
    "复盘模板",
    "社群答疑",
    "适合 / 不适合",
    "想减少冲动交易的人",
    "想建立交易计划的人",
    "想训练风控和复盘的人",
    "想要老师报代码的人",
    "想跟单赚钱的人",
    "期待保证收益的人",
    "报名确认",
    "湖南坤铘紫垣传媒有限公司",
    "xxjyxt.com",
    "湘ICP备2026021493号-1",
  ].forEach((text) => assertIncludes(html, text));

  [
    "class=\"water-bg\"",
    "class=\"stage\"",
    "class=\"screen\"",
    "class=\"reflect\"",
    "class=\"mirror\"",
    "class=\"waterline\"",
    "class=\"chapter\"",
    "class=\"chapter-dot\"",
    "id=\"tapRipple\"",
    "triggerRipple",
    "id=\"pain\"",
    "id=\"method\"",
    "id=\"benefits\"",
    "id=\"fit\"",
  ].forEach((text) => assertNotIncludes(html, text));
});

test("ymty landing page avoids forbidden demo and high-risk content", () => {
  const html = readUtf8(indexPath);
  const normalized = removeRequiredCompliancePhrases(html);

  [
    "技术提示",
    "客服电话：待补充",
    "请填入 ICP",
    "讲师/品牌主视觉占位",
    "企业微信二维码占位",
    "YMXX_JY_TY_168",
    "固定底部双支付按钮",
    "固定底部价格支付条",
    "量化",
    "自动交易",
    "精准交易",
    "收益稳健",
    "捕捉信号",
    "战胜市场",
    "胜率",
    "稳赚",
    "牛股",
    "荐股",
    "跟单",
    "带单",
    "保证收益",
    "不充值",
    "不绑卡",
    "TODO",
    "?paid=1",
    "your-link.example",
    "将二维码图片放入此处",
    "二维码 / 跳转位",
    "企微 / 获客助手二维码",
    "已有 3,200+",
    "第一次照见，免费",
    "爆仓",
    "加到爆仓",
    "从来不是钱",
    "dock",
    "scroll-snap-type",
    "scroll-snap-align",
    "scroll-snap-stop",
    "overflow-y:scroll",
    "overflow-y: scroll",
    "tryMockPaySuccess",
    "/api/mock/pay-success",
    "/api/pay/mock/complete",
    "mock_payment",
  ].forEach((text) => assertNotIncludes(normalized, text));
});

test("ymty landing page uses public config and safe payment payload", () => {
  const html = readUtf8(indexPath);
  const payload = extractCreateOrderPayload(html);

  [
    "fetch(\"/api/public/campaign/ymty\"",
    "fetch(\"/api/pay/create\"",
    "product_code",
    "pay_channel",
    "success_url",
    "track",
    "wechat_jsapi",
    "wechat_h5",
    "alipay_wap",
    "data.form_html",
    "data.pay_url || data.h5_url",
    "data.jsapi_params",
    "window.WeixinJSBridge.invoke",
    "status !== \"online\"",
    "暂停报名",
  ].forEach((text) => assertIncludes(html, text));

  [
    "amount",
    "amount_cents",
    "price",
    "fee",
  ].forEach((text) => assertNotIncludes(payload, text));
});

test("ymty public agreement pages exist and are linked from h5 pages", () => {
  const indexHtml = readUtf8(indexPath);
  const successHtml = readUtf8(successPath);
  const agreementLinks = [
    "/agreement/service.html",
    "/agreement/privacy.html",
    "/agreement/refund.html"
  ];

  agreementLinks.forEach((href) => {
    assertIncludes(indexHtml, href);
    assertIncludes(successHtml, href);
  });

  agreementPaths.forEach((agreementPath) => {
    const html = readUtf8(agreementPath);
    [
      "<title>",
      "发布日期",
      "最近更新时间",
      "湖南坤铘紫垣传媒有限公司",
      "xxjyxt.com",
      "湘ICP备2026021493号-1",
      "/hd/ymty/index.html"
    ].forEach((text) => assertIncludes(html, text));

    [
      "TODO",
      "待补充",
      "your-link.example",
      "external_userid",
      "BEGIN PRIVATE KEY",
      "API_V3_KEY"
    ].forEach((text) => assertNotIncludes(html, text));
  });
});

test("ymty success page only unlocks after paid status", () => {
  const html = readUtf8(successPath);
  const statusIndex = html.indexOf("/api/order/status");
  const entranceIndex = html.indexOf("/api/afterpay/entrance");

  [
    "/api/order/status",
    "/api/afterpay/entrance",
    "status !== \"paid\"",
    "入口未解锁",
    "长按识别二维码，添加课程助教",
    "auto_redirect",
    "wecom_link",
    "qr_image",
  ].forEach((text) => assertIncludes(html, text));

  assert.ok(statusIndex >= 0 && entranceIndex > statusIndex, "success page must check order status before afterpay entrance");

  [
    "企业微信二维码占位",
    "上线前替换为真实助教二维码",
    "客服电话：待补充",
    "请填入 ICP",
    "?paid=1",
  ].forEach((text) => assertNotIncludes(html, text));
});

test("ymty admin page keeps account login and server-backed production save", () => {
  const html = readUtf8(adminPath);

  [
    "/api/admin/login",
    "/api/admin/change-password",
    "/api/admin/me",
    "/api/admin/logout",
    "sessionStorage",
    "Authorization",
    "已保存到服务器",
    "/api/admin/campaign/ymty",
    "/api/admin/livecode",
    "/api/admin/upload",
    "/api/admin/orders",
    "/api/admin/audit-logs",
  ].forEach((text) => assertIncludes(html, text));

  [
    "YMXX Admin Prototype",
    "localStorage.setItem",
    "原型已保存到本地浏览器",
    "生产环境需要后端账号",
  ].forEach((text) => assertNotIncludes(html, text));
});
