# 阳明心学交易体验营 V1 真实支付接入

更新时间：2026-06-12

本步骤把 `/api/pay/create` 从 mock 扩展到微信 JSAPI、微信 H5、支付宝 WAP，并实现微信 / 支付宝异步通知的验签、金额校验、订单 paid 更新和课程权益幂等发放。

本步骤没有提交 `.env`、真实密钥、证书、私钥或生产配置，没有修改 Nginx。mock 支付仍保留。

## 修改文件

- `server/.env.example`：新增真实支付和微信 OAuth 变量名，不含真实值。
- `server/src/services/paymentConfig.js`：补充 `WECHAT_PAY_MODE`、OAuth secret 和 partner 模式识别。
- `server/src/services/payments/wechatPay.js`：实现微信 API v3 下单签名、JSAPI 参数签名、通知验签、resource 解密、金额校验。
- `server/src/services/payments/alipayPay.js`：实现支付宝 WAP 表单签名、异步通知验签、金额校验。
- `server/src/services/payments/index.js`：导出真实支付适配器与通道检查。
- `server/src/services/ymtyCampaign.js`：新增真实支付 paid 更新、课程权益幂等发放、课程用户列表测试辅助。
- `server/src/routes/router.js`：接入真实支付创建、微信 OAuth、微信通知、支付宝通知。
- `web-mvp/hd/ymty/index.html`：真实通道不再调用 mock，按 `jsapi_params`、`pay_url`、`form_html` 承接。
- `server/scripts/ymty-real-payment-notify-test.mjs`：新增微信 / 支付宝回调验签、金额校验、幂等测试。
- `server/scripts/ymty-payment-precheck-test.mjs`：更新支付配置变量清单。
- `server/scripts/ymty-h5-static-test.mjs`：更新 H5 真实支付承接静态检查。

## 微信支付模式

- `WECHAT_PAY_MODE` 未设置或为 `direct`：按普通直连商户模式处理。
- `WECHAT_PAY_MODE=partner`：当前仅预留变量，服务商 / 特约商户模式暂未实现，真实支付创建会返回“微信服务商模式暂未实现”。

## 微信 JSAPI 接入说明

适用场景：微信内 H5。

流程：

1. 前端以 `pay_channel=wechat_jsapi` 调用 `/api/pay/create`。
2. 后端检查微信支付配置。
3. JSAPI 必须有 `openid`。
4. 如果没有 `openid`，后端返回 `428` 和 `/api/wechat/oauth/start`。
5. OAuth 使用 `WECHAT_SERVICE_APP_ID`、`WECHAT_SERVICE_APP_SECRET` 获取 `openid`。
6. 后端调用微信 API v3 `/v3/pay/transactions/jsapi`。
7. 微信返回 `prepay_id` 后，后端生成：
   - `appId`
   - `timeStamp`
   - `nonceStr`
   - `package=prepay_id=xxx`
   - `signType=RSA`
   - `paySign`
8. 前端用 `WeixinJSBridge.invoke('getBrandWCPayRequest', jsapi_params, ...)` 调起支付。
9. 前端不把 WeixinJSBridge 返回值作为入营依据，成功页仍查询 `/api/order/status` 和 `/api/afterpay/entrance`。

## 微信 H5 接入说明

适用场景：微信外手机浏览器。

流程：

1. 前端以 `pay_channel=wechat_h5` 调用 `/api/pay/create`。
2. 后端调用微信 API v3 `/v3/pay/transactions/h5`。
3. `amount.total` 使用订单 `amount_cents`。
4. `notify_url` 使用 `WECHAT_NOTIFY_URL`。
5. 后端返回 `h5_url` / `pay_url`。
6. `pay_url` 带 `redirect_url`，回到：
   `https://xxjyxt.com/hd/ymty/success.html?order_id=xxx&token=xxx`
7. `redirect_url` 不能作为支付成功依据。
8. 微信内环境不要走 H5，应走 JSAPI。

## 支付宝 WAP 接入说明

适用场景：手机浏览器支付宝支付。

流程：

1. 前端以 `pay_channel=alipay_wap` 调用 `/api/pay/create`。
2. 后端生成 `alipay.trade.wap.pay` 参数。
3. `total_amount` 使用 `orders.amount_cents / 100`，保留两位小数。
4. `notify_url` 使用 `ALIPAY_NOTIFY_URL`。
5. `return_url` 使用 `ALIPAY_RETURN_URL` 并附带 `order_id`、`token`。
6. 后端返回 `form_html` 和 `pay_url`。
7. `return_url` 不能作为支付成功依据，异步通知才更新 paid。

## 回调验签和金额校验

微信回调 `/api/pay/wechat/notify`：

- 验证 `Wechatpay-Signature`。
- 使用 `WECHAT_API_V3_KEY` 解密 `resource`。
- 校验 `mchid`、`appid`、`out_trade_no`、`trade_state`、`amount.total`。
- 只有 `trade_state=SUCCESS` 且金额等于订单金额才更新 paid。

支付宝回调 `/api/pay/alipay/notify`：

- 使用 `ALIPAY_PUBLIC_KEY` 验签。
- 校验 `app_id`、`out_trade_no`、`total_amount`、`trade_status`。
- 只有 `TRADE_SUCCESS` 或 `TRADE_FINISHED` 且金额等于订单金额才更新 paid。

验签失败、金额不一致、订单不存在、状态未成功都不会发放权益。

## 幂等处理

真实回调和 mock 支付共用 paid 更新逻辑：

- pending -> paid：更新 `orders`，写 `payment_logs`，写 `course_users`。
- 已 paid 重复回调：继续记录 payment log，但不重复写 `course_users`。
- paid 后 `/api/afterpay/entrance` 才返回二维码或获客助手链接。
- pending / unpaid 访问 afterpay 继续返回 403。

## 环境变量

微信：

- `WECHAT_PAY_MODE`
- `WECHAT_MCH_ID`
- `WECHAT_SERVICE_APP_ID`
- `WECHAT_SERVICE_APP_SECRET`
- `WECHAT_MINI_APP_ID`
- `WECHAT_SP_MCH_ID`
- `WECHAT_SUB_MCH_ID`
- `WECHAT_SP_APP_ID`
- `WECHAT_SUB_APP_ID`
- `WECHAT_API_V3_KEY`
- `WECHAT_CERT_SERIAL_NO`
- `WECHAT_PRIVATE_KEY_PATH`
- `WECHAT_PLATFORM_CERT_PATH`
- `WECHAT_NOTIFY_URL`
- `WECHAT_H5_SCENE_INFO`
- `WECHAT_JSAPI_OAUTH_REDIRECT_URL`

支付宝：

- `ALIPAY_APP_ID`
- `ALIPAY_PRIVATE_KEY`
- `ALIPAY_PUBLIC_KEY`
- `ALIPAY_GATEWAY_URL`
- `ALIPAY_NOTIFY_URL`
- `ALIPAY_RETURN_URL`

后台：

- `YMTY_ADMIN_TOKEN`
- `ADMIN_JWT_SECRET`

## 商户平台配置

微信支付商户平台：

- 服务号 AppID 绑定微信支付商户号。
- 开通 JSAPI 支付。
- 开通 H5 支付。
- H5 支付域名：`xxjyxt.com`。
- JSAPI 支付授权目录：`https://xxjyxt.com/hd/ymty/`。
- 通知地址：`https://xxjyxt.com/api/pay/wechat/notify`。
- API v3 key、商户私钥、平台证书放在服务器安全路径。

微信公众平台：

- 网页授权域名：`xxjyxt.com`。
- OAuth 回调：`https://xxjyxt.com/api/wechat/oauth/callback`。

支付宝开放平台：

- 开通手机网站支付。
- 配置应用私钥与支付宝公钥。
- 异步通知：`https://xxjyxt.com/api/pay/alipay/notify`。
- 同步返回：`https://xxjyxt.com/hd/ymty/success.html`。

## 本地测试 mock

```bash
cd server
npm run test:ymty
npm run test:ymty-h5
npm run test:ymty-upload
```

mock 支付仍可用：

```bash
curl -s -X POST http://127.0.0.1:8787/api/pay/create \
  -H 'Content-Type: application/json' \
  -d '{"product_code":"YMXX_JY_TY","pay_channel":"mock"}'
```

## 真实小额订单测试

1. 在服务器配置 `.env`，不要提交。
2. 确认产品金额为小额测试价。
3. 微信内打开 `https://xxjyxt.com/hd/ymty/index.html` 测 JSAPI。
4. 微信外手机浏览器打开同一链接测微信 H5。
5. 手机浏览器点击支付宝测 WAP。
6. 支付后不要只看跳转页，必须检查：
   - `/api/order/status?order_id=xxx&token=xxx`
   - `/api/afterpay/entrance?order_id=xxx&token=xxx`
   - 后台订单状态
   - `payment_logs`
   - `course_users`

## 上线前检查清单

- `.env` 未进入 Git。
- 商户私钥、API v3 key、支付宝私钥未写入代码。
- 微信 / 支付宝回调域名可公网 HTTPS 访问。
- 订单金额只来自数据库 `products.amount_cents`。
- 回调金额校验已开启。
- 重复回调不重复发放权益。
- 回调失败不更新 paid。
- 日志不输出密钥、私钥、证书、token。
- `success.html` 只通过订单状态和 afterpay 入口解锁。

## 密钥提醒

不要提交 `.env`、`.env.local`、真实商户号、Key、证书、私钥、服务器证书路径下的文件、`server/.venv` 或 `node_modules`。如发生泄露，应立即轮换密钥和证书。
