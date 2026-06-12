# 阳明心学交易体验营 V1 真实支付接入前置检查

更新时间：2026-06-12

本文只记录真实微信 / 支付宝支付接入前的配置骨架、平台前置条件和验收清单。本步骤没有调用微信支付或支付宝网关，没有修改 Nginx，没有提交 `.env`、真实密钥、证书或私钥。

当前保留 mock 支付：`pay_channel=mock` 继续可用于开发和测试。

## 当前新增能力

- `server/.env.example` 增加微信支付、支付宝支付和后台安全变量名，均为空值。
- `server/src/services/paymentConfig.js` 增加支付配置校验，只返回存在 / 缺失状态，不输出真实值。
- `server/src/services/payments/wechatPay.js` 增加微信支付适配器接口骨架。
- `server/src/services/payments/alipayPay.js` 增加支付宝支付适配器接口骨架。
- `server/src/services/payments/index.js` 增加支付通道识别和配置前置检查。
- `/api/pay/create` 识别 `mock`、`wechat_jsapi`、`wechat_h5`、`alipay_wap`。
- 缺少真实支付配置时，微信通道返回“微信支付配置未完成”，支付宝通道返回“支付宝支付配置未完成”。

## 微信 JSAPI 支付前置条件

- 服务号 AppID 已绑定微信支付商户号。
- 公众号网页授权域名已配置：`xxjyxt.com`。
- JSAPI 支付授权目录已配置：`https://xxjyxt.com/hd/ymty/`。
- 微信内 H5 需要 `openid`。
- 需要通过 OAuth 获取 `openid`。
- 需要可访问的支付通知地址：`https://xxjyxt.com/api/pay/wechat/notify`。
- 需要微信支付 API v3 key、商户证书序列号、商户私钥路径、平台证书路径。

## 微信 H5 支付前置条件

- 微信支付商户平台已开通 H5 支付产品。
- H5 支付域名已配置：`xxjyxt.com`。
- 适用于微信外手机浏览器。
- 微信内不要走 H5，应走 JSAPI。
- 需要配置 `WECHAT_H5_SCENE_INFO`。
- 需要可访问的支付通知地址：`https://xxjyxt.com/api/pay/wechat/notify`。

## 支付宝手机网站支付前置条件

- 企业支付宝账号已准备完成。
- 手机网站支付已开通。
- 已创建网页 / 移动应用并取得 AppID。
- 已生成应用私钥，并配置支付宝公钥。
- `notify_url` 建议配置为：`https://xxjyxt.com/api/pay/alipay/notify`。
- `return_url` 建议配置为：`https://xxjyxt.com/hd/ymty/success.html`。

## 微信支付商户平台配置

需要在微信支付商户平台确认：

- 商户号已通过主体认证。
- 服务号 AppID 与商户号绑定。
- JSAPI 支付产品可用。
- H5 支付产品可用。
- H5 支付域名：`xxjyxt.com`。
- API v3 key 已设置。
- 商户 API 证书 / 私钥已下载到服务器安全路径。
- 支付回调通知地址可被公网 HTTPS 访问。

不要把商户私钥、API v3 key、证书内容提交到 Git。

## 微信公众平台配置

需要在微信公众平台确认：

- 网页授权域名：`xxjyxt.com`。
- JS 接口安全域名按后续 JSAPI 需求配置。
- 服务号 AppID 与微信支付商户号绑定。
- OAuth 回调地址使用 HTTPS。
- 微信内报名时能完成 OAuth 并拿到 `openid`。

## 支付宝开放平台配置

需要在支付宝开放平台确认：

- 应用 AppID 可用。
- 手机网站支付能力已签约开通。
- 应用公钥 / 支付宝公钥配置正确。
- 网关地址按环境配置，生产与沙箱不要混用。
- `notify_url` 指向 `/api/pay/alipay/notify`。
- `return_url` 指向 `/hd/ymty/success.html`。

不要把应用私钥、支付宝公钥或生产网关凭据写死在代码里。

## 环境变量说明

微信支付：

- `WECHAT_MCH_ID`：微信支付商户号。
- `WECHAT_SERVICE_APP_ID`：服务号 AppID，用于 JSAPI。
- `WECHAT_MINI_APP_ID`：小程序 AppID，预留给后续小程序支付。
- `WECHAT_API_V3_KEY`：微信支付 API v3 key。
- `WECHAT_CERT_SERIAL_NO`：商户证书序列号。
- `WECHAT_PRIVATE_KEY_PATH`：商户私钥文件路径。
- `WECHAT_PLATFORM_CERT_PATH`：微信支付平台证书路径。
- `WECHAT_NOTIFY_URL`：微信支付回调通知地址。
- `WECHAT_H5_SCENE_INFO`：微信 H5 支付场景信息。
- `WECHAT_JSAPI_OAUTH_REDIRECT_URL`：微信 JSAPI 获取 openid 的 OAuth 回调地址。

支付宝：

- `ALIPAY_APP_ID`：支付宝开放平台应用 AppID。
- `ALIPAY_PRIVATE_KEY`：应用私钥。
- `ALIPAY_PUBLIC_KEY`：支付宝公钥。
- `ALIPAY_GATEWAY_URL`：支付宝网关地址。
- `ALIPAY_NOTIFY_URL`：支付宝异步通知地址。
- `ALIPAY_RETURN_URL`：支付宝同步返回地址。

后台安全：

- `YMTY_ADMIN_TOKEN`：体验营后台临时 Admin Token。
- `ADMIN_JWT_SECRET`：后续正式后台登录 JWT 密钥。

## 本地如何检查配置

查看缺失项：

```bash
cd server
node --input-type=module -e "import { getPaymentConfigStatus } from './src/services/paymentConfig.js'; console.log(JSON.stringify(getPaymentConfigStatus(), null, 2));"
```

输出只包含变量名和存在 / 缺失状态，不会打印真实密钥值。

缺少配置时创建真实支付订单会返回：

```json
{
  "code": 503,
  "message": "微信支付配置未完成"
}
```

或：

```json
{
  "code": 503,
  "message": "支付宝支付配置未完成"
}
```

## 真实支付接入前验收清单

- `.env` 已在服务器安全路径配置，未提交 Git。
- 微信 API v3 key、商户私钥、平台证书可被后端进程读取。
- `WECHAT_NOTIFY_URL` 是 HTTPS 公网地址。
- 微信 JSAPI 能通过 OAuth 获取 `openid`。
- 微信 H5 支付域名已配置为 `xxjyxt.com`。
- 支付宝应用私钥、支付宝公钥配置正确。
- `ALIPAY_NOTIFY_URL` 与 `ALIPAY_RETURN_URL` 已配置为线上 HTTPS 地址。
- `/api/pay/create` 创建订单金额仍以后端 `products.amount_cents` 为准。
- 支付回调必须校验订单金额、订单号、商户号 / AppID。
- 支付回调必须幂等，不能重复写 `course_users`。
- 未支付订单请求 `/api/afterpay/entrance` 必须继续返回 403。
- paid 后才返回二维码或企业微信获客助手链接。
- 日志不得打印手机号、token、私钥、证书、API key、完整回调敏感载荷。

## 4.1 待办

- 实现微信 JSAPI 统一下单。
- 实现微信 H5 统一下单。
- 实现微信支付 API v3 回调验签、解密和订单状态更新。
- 实现支付宝手机网站支付下单。
- 实现支付宝异步通知验签和订单状态更新。
- 增加真实支付订单查询与补偿任务。
- 增加支付回调幂等测试、金额篡改测试、重复通知测试。
- 增加生产后台正式登录、角色权限和操作审计。

## 密钥提醒

不要提交 `.env`、真实密钥、证书、私钥、商户号截图、平台后台截图或服务器路径下的敏感文件。发现泄露后应立即轮换对应密钥和证书。
