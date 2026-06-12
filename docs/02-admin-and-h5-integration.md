# 阳明心学交易体验营 V1 后台与 H5 集成说明

更新时间：2026-06-12

本文记录 `/hd/ymty/` H5 与第二步 mock 支付 API 的集成方式。本步骤仍不接真实微信 / 支付宝支付，不修改 Nginx，不提交 `.env`、证书、密钥、`server/.venv` 或 `node_modules`。

合规边界：本课程仅用于投资教育、交易纪律训练、模拟盘训练和风险意识教育；不荐股、不喊单、不承诺收益、不代客理财、不组织实盘跟单。

## 本步骤修改文件

- `web-mvp/hd/ymty/index.html`：重构为红金信息流投流版 H5 长页。
- `web-mvp/hd/ymty/success.html`：补齐支付成功页，按订单 paid 状态解锁二维码或获客助手链接。
- `web-mvp/admin/ymty/index.html`：新增体验营后台页，使用 Admin Token 访问，支持二维码上传。
- `server/src/services/ymtyUpload.js`：新增后台二维码上传、格式校验、随机文件名落盘。
- `server/src/routes/router.js`：新增 `POST /api/admin/upload`，并强化 `/api/admin/*` token 保护。
- `server/src/lib/http.js`：允许后台 token 相关请求头通过 CORS。
- `server/scripts/ymty-admin-upload-test.mjs`：新增后台上传与 paid 解锁 contract test。
- `server/scripts/ymty-h5-static-test.mjs`：新增 H5 静态 contract test。
- `server/package.json`：新增 `npm run test:ymty-h5`、`npm run test:ymty-upload`。
- `docs/02-admin-and-h5-integration.md`：本文档。

## 后台如何登录

当前项目还没有正式管理员账号体系。`/admin/ymty/` 先使用 Admin Token 临时保护：

- 后台页面首次打开会要求输入 `Admin Token`。
- Token 只存入 `sessionStorage`，不使用 `localStorage`。
- 所有 `/api/admin/*` 请求会携带 `Authorization: Bearer <token>`。
- 生产环境必须配置 `YMTY_ADMIN_TOKEN`。
- 本地开发如果没有配置 `YMTY_ADMIN_TOKEN`，临时 token 为 `local-dev-admin-token`。
- Token 错误时，页面显示“无权限或登录已失效”。

上线前必须接入正式管理员登录、角色权限、审计和访问日志脱敏。

## 如何修改价格

后台接口：

```bash
curl -s -X POST http://127.0.0.1:8787/api/admin/campaign/ymty \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer local-dev-admin-token' \
  -H 'x-admin-id: local-admin' \
  -d '{"product_code":"YMXX_JY_TY","display_price_yuan":9.90,"amount_cents":990}'
```

说明：

- H5 只展示 `display_price_yuan`。
- 创建订单时金额以服务端 `products.amount_cents` 为准。
- 改价只影响新订单，旧订单金额不会被覆盖。
- 修改价格会写入 `audit_logs`。

## 如何上传二维码

后台页面路径：

```text
http://127.0.0.1:8787/admin/ymty/
```

操作：

1. 输入 Admin Token。
2. 在“企业微信活码 / 获客助手”模块选择二维码图片。
3. 点击“上传二维码”。
4. 上传成功后，页面会自动把返回 URL 填入 `qr_image`。
5. 点击“保存 livecode”，写入 `/api/admin/livecode` 并记录 `audit_logs`。

接口：

```bash
curl -s -X POST http://127.0.0.1:8787/api/admin/upload \
  -H 'Authorization: Bearer local-dev-admin-token' \
  -F 'file=@/path/to/qrcode.png'
```

成功返回：

```json
{
  "code": 0,
  "data": {
    "url": "/uploads/livecode/随机文件名.png"
  }
}
```

上传限制：

- 仅支持 `jpg`、`jpeg`、`png`、`webp`。
- 单文件不超过 2MB。
- 禁止 `html`、`js`、`php`、`svg`、`exe`、`sh` 和其他非图片类型。
- 保存文件名由后端随机生成，不使用用户原始文件名。
- 上传目录：`web-mvp/uploads/livecode/`。
- 后端校验扩展名、Content-Type 和图片文件头，防止伪装上传。

## 如何填写二维码和获客助手链接

后台保留手动填写二维码图片 URL 的能力，也支持填写企业微信获客助手链接。

```bash
curl -s -X POST http://127.0.0.1:8787/api/admin/livecode \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer local-dev-admin-token' \
  -H 'x-admin-id: local-admin' \
  -d '{"code_key":"YMXX_YMTY_DEFAULT","qr_image":"/assets/wecom-livecode-placeholder.svg","wecom_link":"https://work.weixin.qq.com/ca/mock","auto_redirect_after_paid":false,"redirect_delay_ms":600,"remark":"知行 + 手机号后4位","button_text":"添加课程助教微信","service_text":"客服方式：支付后添加课程助教微信"}'
```

说明：

- `qr_image`：二维码图片 URL。
- `wecom_link`：企业微信获客助手链接。
- `remark`：加微备注，例如“知行 + 手机号后4位”。
- `button_text`：成功页按钮文案。
- `service_text`：成功页客服说明。

## 支付后承接模式

模式 A：展示二维码

- `auto_redirect_after_paid=false`
- paid 后成功页展示 `qr_image`
- paid 后成功页请求 `/api/afterpay/entrance`
- 使用普通 `img` 标签，支持手机端长按识别

模式 B：自动跳转获客助手

- `auto_redirect_after_paid=true`
- paid 后成功页按 `redirect_delay_ms` 跳转 `wecom_link`
- 同时保留“如未自动跳转，点击添加课程助教”按钮

未支付订单请求 `/api/afterpay/entrance` 必须返回 403，不能拿到二维码或获客助手链接。

## H5 如何读取公开配置

`web-mvp/hd/ymty/index.html` 启动后请求：

```bash
GET /api/public/campaign/ymty
```

读取字段：

- `product.product_name`
- `product.display_price_yuan`
- `product.cycle`
- `product.start_time`
- `product.lecturer`
- `product.status`

若 `status != online`，报名按钮显示“暂停报名”并禁用支付。

## H5 如何创建订单

点击微信支付：

- 微信内环境：`pay_channel=wechat_jsapi`
- 微信外环境：`pay_channel=wechat_h5`

点击支付宝：

- `pay_channel=alipay_wap`

请求体只传：

```json
{
  "product_code": "YMXX_JY_TY",
  "pay_channel": "wechat_h5",
  "success_url": "http://127.0.0.1:8787/hd/ymty/success.html",
  "track": {
    "channel": "h5",
    "campaign": "ymty_flow_h5",
    "creative": "red_gold_longpage"
  }
}
```

页面不传真实金额；服务端必须根据 `product_code` 查询数据库价格。

## 成功页如何解锁入口

`web-mvp/hd/ymty/success.html` 读取 URL 参数：

- `order_id`
- `token`

流程：

1. 请求 `/api/order/status?order_id=xxx&token=xxx`
2. 如果 `pay_status != paid`，显示“入口未解锁”，不展示二维码或获客助手链接
3. 如果 `pay_status = paid`，请求 `/api/afterpay/entrance?order_id=xxx&token=xxx`
4. 根据后台活码配置展示二维码或自动跳转获客助手

## 本地启动

```bash
cd server
npm run seed:ymty
npm run dev
```

访问：

```text
http://127.0.0.1:8787/hd/ymty/index.html
```

## 如何验收

静态验收：

```bash
cd server
npm run test:ymty-h5
```

后台上传验收：

```bash
cd server
npm run test:ymty-upload
```

接口闭环：

```bash
cd server
npm run test:ymty
```

手动验收：

1. 打开 `http://127.0.0.1:8787/hd/ymty/index.html`，确认是红金投流长页。
2. 375px、390px、430px 宽度检查无横向溢出。
3. 调用后台接口把价格改为 9.90，刷新 H5 显示 9.90。
4. 点击微信支付或支付宝，确认请求 `/api/pay/create`。
5. 未支付打开成功页，确认不展示二维码或链接。
6. mock paid 后打开成功页，确认展示二维码或按配置自动跳转。
7. 调用 `/api/admin/audit-logs`，确认价格和活码修改记录存在。
8. 打开 `/admin/ymty/`，确认需要输入 Admin Token。
9. 上传二维码后保存 livecode，确认 success 页 paid 后展示新二维码。

## 已知限制

- 当前未接真实微信 / 支付宝支付。
- 当前未实现正式后台登录页面。
- H5 本地为了跑通闭环会尝试调用 mock 支付成功接口；生产环境默认禁止 mock 支付。
- 真实支付接入前，需要补齐统一下单、回调验签、金额校验、幂等发放权益、退款策略和日志脱敏。
