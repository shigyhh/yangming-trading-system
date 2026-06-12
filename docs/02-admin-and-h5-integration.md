# 阳明心学交易体验营 V1 后台与 H5 接入

更新时间：2026-06-12

本步骤把 `/admin/ymty/` 后台、`/hd/ymty/index.html` 落地页、`/hd/ymty/success.html` 成功页接入第二步已经完成的 mock 支付 API。仍未接真实微信/支付宝支付，未修改 Nginx、生产服务器配置、`.env`、证书或密钥。

合规边界：本系统仅用于交易认知、行为训练与风险教育；不荐股、不喊单、不承诺收益、不代客理财、不组织实盘跟单。

## 修改文件

- `server/src/services/ymtyCampaign.js`：订单列表合并课程学员承接状态，新增已加微/已入群状态更新。
- `server/src/routes/router.js`：新增 `POST /api/admin/orders/:order_id/course-user`；订单创建支持 H5 的 `track` 字段。
- `server/src/db/schema.sql`：`course_users` 增加 `added_wechat`、`joined_group` 和时间字段。
- `server/scripts/ymty-payment-contract-test.mjs`：覆盖 paid 后承接状态标记和审计日志。
- `server/scripts/ymty-h5-static-test.mjs`：覆盖 H5 落地页与成功页关键接口接入。
- `server/package.json`：新增 `test:ymty-h5`。
- `web-next/src/app/admin/ymty/page.tsx`：新增真实接口后台页面。
- `web-next/src/app/admin/ymty/page.test.mjs`：覆盖后台页面接口、字段、二次确认和不使用 localStorage。
- `web-next/package.json`：新增 `test:ymty-admin`。
- `web-mvp/hd/ymty/index.html`：新增 H5 落地页，读取公开配置并创建后端订单。
- `web-mvp/hd/ymty/success.html`：新增成功页，paid 后才解锁二维码或获客助手链接。
- `docs/02-admin-and-h5-integration.md`：本文档。

## 后台如何登录

路径：`/admin/ymty/`

当前项目没有正式后台登录系统。本步骤使用开发环境临时鉴权：

- `NODE_ENV !== production` 且服务端未配置 `YMTY_ADMIN_TOKEN` 时，后台接口允许访问。
- 页面内可填写“操作人”和“后台 Token”；Token 只存在页面内存里，不写入 localStorage。
- 生产环境必须配置 `YMTY_ADMIN_TOKEN`，并在页面输入同一 Token 后访问后台接口。

上线前必须接入正式管理员登录、角色权限和审计，不应把临时 Token 当成最终后台登录方案。

## 如何修改价格

后台模块：产品与价格

可编辑字段：

- `product_code`
- `product_name`
- `display_price_yuan`
- `amount_cents`
- `cycle`
- `start_time`
- `lecturer`
- `status`

保存价格时页面会二次确认。服务端会写入 `audit_logs`，记录 `before_json` 和 `after_json`。前端展示价格只用于展示，真实支付金额以后端订单为准；价格修改只影响新订单，旧订单金额不会被覆盖。

## 如何填写二维码或获客助手链接

后台模块：企业微信活码 / 获客助手

可编辑字段：

- `wecom_link`
- `qr_image`
- `auto_redirect_after_paid`
- `redirect_delay_ms`
- `remark`
- `button_text`
- `service_text`
- `status`

当前未实现文件上传接口 `POST /api/admin/upload`。本步骤支持在 `qr_image` 中填写二维码图片 URL，例如 `/assets/wecom-livecode-placeholder.svg` 或线上图片地址。上传功能待实现。

## 如何选择支付后模式

模式 A：展示二维码

- 设置 `auto_redirect_after_paid = false`
- 填写 `qr_image`
- paid 后成功页显示普通 `<img>`，支持手机端长按识别
- 展示备注 `remark`

模式 B：自动跳转获客助手

- 设置 `auto_redirect_after_paid = true`
- 填写 `wecom_link`
- 设置 `redirect_delay_ms`
- paid 后成功页自动跳转 `wecom_link`
- 页面仍保留按钮“如未自动跳转，点击添加课程助教”

普通 H5 不能保证所有浏览器都能直接拉起微信添加好友，所以二维码长按识别和获客助手链接都保留。

## H5 如何读取公开配置

落地页路径：`/hd/ymty/index.html`

页面启动后请求：

```bash
GET /api/public/campaign/ymty
```

只读取公开展示字段：

- `product_name`
- `display_price_yuan`
- `cycle`
- `start_time`
- `lecturer`
- `status`
- `service_text`

公开接口不返回 `wecom_link` 和真实二维码链接。`status != online` 时，报名按钮显示暂停状态。

## H5 如何创建订单

点击微信支付：

- 微信内环境：`wechat_jsapi`
- 微信外环境：`wechat_h5`

点击支付宝支付：

- `alipay_wap`

请求：

```bash
POST /api/pay/create
```

请求体只传：

- `product_code`
- `pay_channel`
- `success_url`
- `track`

落地页不传真实金额。即使前端展示价格，后端创建订单仍以 `products.amount_cents` 为准。

当前未接真实支付，所以本地 H5 会调用 `POST /api/mock/pay-success` 完成 mock 支付并跳转成功页；生产环境默认禁止 mock 支付。

## 成功页如何解锁入口

成功页路径：`/hd/ymty/success.html`

页面读取 URL 参数：

- `order_id`
- `token`

第一步请求：

```bash
GET /api/order/status?order_id=xxx&token=xxx
```

如果订单不是 `paid`：

- 显示“入口未解锁”
- 不展示二维码
- 不展示获客助手链接

如果订单是 `paid`：

```bash
GET /api/afterpay/entrance?order_id=xxx&token=xxx
```

只有 paid 后该接口才返回 `wecom_link` 或 `qr_image`。未支付用户不能通过公开 JSON 或成功页绕过支付拿到助教入口。

## 如何验收

初始化并启动服务：

```bash
cd server
npm run seed:ymty
npm run dev
```

后台读取产品配置：

```bash
curl -s http://127.0.0.1:8787/api/admin/campaign/ymty
```

后台修改价格为 9.90 元：

```bash
curl -s -X POST http://127.0.0.1:8787/api/admin/campaign/ymty \
  -H 'Content-Type: application/json' \
  -H 'x-admin-id: local-admin' \
  -d '{"product_code":"YMXX_JY_TY","display_price_yuan":9.90,"amount_cents":990}'
```

前端公开配置显示 9.90：

```bash
curl -s http://127.0.0.1:8787/api/public/campaign/ymty
```

创建新订单，新订单金额必须是 990 分：

```bash
curl -s -X POST http://127.0.0.1:8787/api/pay/create \
  -H 'Content-Type: application/json' \
  -d '{"product_code":"YMXX_JY_TY","pay_channel":"wechat_h5","success_url":"http://127.0.0.1:8787/hd/ymty/success.html","track":{"channel":"h5","campaign":"ymty_v1","creative":"manual"}}'
```

记录返回的 `order_id` 和 `order_token`：

```bash
ORDER_ID="替换成返回的 order_id"
TOKEN="替换成返回的 order_token"
```

未支付访问 afterpay，必须 403：

```bash
curl -i "http://127.0.0.1:8787/api/afterpay/entrance?order_id=${ORDER_ID}&token=${TOKEN}"
```

mock 支付成功：

```bash
curl -s -X POST http://127.0.0.1:8787/api/mock/pay-success \
  -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"${ORDER_ID}\",\"token\":\"${TOKEN}\",\"transaction_id\":\"mock-local-002\"}"
```

paid 后 afterpay 返回二维码或获客链接：

```bash
curl -s "http://127.0.0.1:8787/api/afterpay/entrance?order_id=${ORDER_ID}&token=${TOKEN}"
```

后台修改二维码图片：

```bash
curl -s -X POST http://127.0.0.1:8787/api/admin/livecode \
  -H 'Content-Type: application/json' \
  -H 'x-admin-id: local-admin' \
  -d '{"code_key":"YMXX_YMTY_DEFAULT","qr_image":"/assets/wecom-livecode-placeholder.svg","auto_redirect_after_paid":false}'
```

后台修改获客助手链接并开启自动跳转：

```bash
curl -s -X POST http://127.0.0.1:8787/api/admin/livecode \
  -H 'Content-Type: application/json' \
  -H 'x-admin-id: local-admin' \
  -d '{"code_key":"YMXX_YMTY_DEFAULT","wecom_link":"https://work.weixin.qq.com/ca/mock","auto_redirect_after_paid":true,"redirect_delay_ms":600}'
```

操作日志：

```bash
curl -s http://127.0.0.1:8787/api/admin/audit-logs
```

页面验收：

- 打开 `http://127.0.0.1:8787/hd/ymty/index.html`
- 点击微信支付或支付宝支付
- 跳转到 `/hd/ymty/success.html?order_id=...&token=...`
- `auto_redirect_after_paid=false` 时应显示二维码
- `auto_redirect_after_paid=true` 时应自动跳转获客助手链接，并保留点击按钮
- 打开 `http://127.0.0.1:3000/admin/ymty/` 验证后台页面；若 Next dev 不在 3000，以实际端口为准

## 自动化测试

```bash
cd server
npm run check
npm run test:ymty
npm run test:ymty-h5
```

```bash
cd web-next
npm run test:ymty-admin
```

## 已知限制

- 未接真实微信支付或支付宝支付。
- 未实现 `POST /api/admin/upload` 文件上传；当前只支持填写二维码 URL。
- 当前后台登录是临时 Token 方案，生产必须接正式登录权限。
- 当前运行态仍是 JSON store；支付订单长期生产化建议迁移 PostgreSQL。
- H5 本地支付按钮会触发 mock 支付；生产环境默认禁止 mock 支付，需要接真实支付后替换。
