# 阳明心学交易体验营 V1 数据库与 API

更新时间：2026-06-12

本步骤只实现「数据库结构草案 + 基础接口 + mock 支付状态 + 支付后解锁」。未接入真实微信支付、支付宝支付、Nginx、生产服务器配置或真实密钥。

合规边界：本系统仅用于交易认知、行为训练与风险教育；不荐股、不喊单、不承诺收益、不代客理财、不组织实盘跟单。

## 修改文件

- `server/src/services/ymtyCampaign.js`：体验营产品、活码、订单、mock 支付、课程权益、审计日志服务。
- `server/src/routes/router.js`：新增 `/api/...` 体验营接口。
- `server/src/db/schema.sql`：新增正式 PostgreSQL 表结构草案与默认 seed SQL。
- `server/scripts/seed-ymty-defaults.mjs`：JSON 运行态默认数据初始化脚本。
- `server/scripts/ymty-payment-contract-test.mjs`：mock 支付闭环 contract test。
- `server/package.json`：新增 `seed:ymty`、`test:ymty` 命令。
- `web-mvp/assets/wecom-livecode-placeholder.svg`：支付后活码占位图，不是真实企业微信二维码。
- `docs/01-database-and-api.md`：本文档。

## 新增表

正式表结构已写入 `server/src/db/schema.sql`：

- `products`
- `livecodes`
- `orders`
- `payment_logs`
- `course_users`
- `admin_users`
- `audit_logs`

当前项目运行态沿用现有 `server/data/runtime/*.json` 存储，不新增 ORM，不引入新后端框架。后续启用 PostgreSQL 时，可按 `schema.sql` 建表并迁移服务层存储实现。

## 默认数据

`products` 默认：

- `product_code`: `YMXX_JY_TY`
- `product_name`: `阳明心学交易体验营`
- `display_price_yuan`: `1.68`
- `amount_cents`: `168`
- `currency`: `CNY`
- `cycle`: `7天训练`
- `start_time`: `每周滚动开营｜晚20:00`
- `lecturer`: `知行飞哥`
- `status`: `online`

`livecodes` 默认：

- `code_key`: `YMXX_YMTY_DEFAULT`
- `name`: `阳明心学交易体验营默认活码`
- `wecom_link`: `https://work.weixin.qq.com/ca/mock`
- `qr_image`: `/assets/wecom-livecode-placeholder.svg`
- `auto_redirect_after_paid`: `false`
- `redirect_delay_ms`: `600`
- `remark`: `知行 + 手机号后4位`
- `button_text`: `添加课程助教微信`
- `service_text`: `客服方式：支付后添加课程助教微信`
- `status`: `active`

## 新增接口

公开接口：

- `GET /api/public/campaign/ymty`

订单与支付接口：

- `POST /api/pay/create`
- `GET /api/order/status?order_id=xxx&token=xxx`
- `GET /api/afterpay/entrance?order_id=xxx&token=xxx`
- `POST /api/mock/pay-success`

后台接口：

- `GET /api/admin/campaign/ymty`
- `POST /api/admin/campaign/ymty`
- `POST /api/admin/livecode`
- `GET /api/admin/orders`
- `GET /api/admin/audit-logs`

后台临时鉴权：当前项目没有正式管理员登录体系。本步骤开发环境允许本地访问后台接口；生产环境必须配置 `YMTY_ADMIN_TOKEN`，并通过 `Authorization: Bearer <token>` 或 `x-admin-token` 访问。后续上线前必须接入正式后台登录、权限和审计。

## 初始化数据库

当前 JSON 运行态：

```bash
cd server
npm run seed:ymty
```

后续 PostgreSQL：

```bash
psql "$DATABASE_URL" -f server/src/db/schema.sql
```

不要把 `.env`、证书、密钥、`server/.venv` 提交到 Git。

## 启动本地服务

```bash
cd server
npm run dev
```

默认服务地址：`http://127.0.0.1:8787`

## curl 测试命令

A. 查询公开产品配置：

```bash
curl -s http://127.0.0.1:8787/api/public/campaign/ymty
```

B. 创建 mock 订单，故意传 `amount_cents=1`，后端仍应按数据库价格创建：

```bash
curl -s -X POST http://127.0.0.1:8787/api/pay/create \
  -H 'Content-Type: application/json' \
  -d '{"product_code":"YMXX_JY_TY","amount_cents":1,"amount":1,"price":"0.01","pay_channel":"mock","channel":"h5","campaign":"ymty_v1","creative":"manual_test"}'
```

记录返回的 `order.order_id` 和 `order.order_token`：

```bash
ORDER_ID="替换成返回的 order_id"
TOKEN="替换成返回的 order_token"
```

C. 查询订单 pending：

```bash
curl -s "http://127.0.0.1:8787/api/order/status?order_id=${ORDER_ID}&token=${TOKEN}"
```

D. 未支付请求 afterpay，必须 403：

```bash
curl -i "http://127.0.0.1:8787/api/afterpay/entrance?order_id=${ORDER_ID}&token=${TOKEN}"
```

E. mock 支付成功：

```bash
curl -s -X POST http://127.0.0.1:8787/api/mock/pay-success \
  -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"${ORDER_ID}\",\"token\":\"${TOKEN}\",\"transaction_id\":\"mock-local-001\"}"
```

F. 查询订单 paid：

```bash
curl -s "http://127.0.0.1:8787/api/order/status?order_id=${ORDER_ID}&token=${TOKEN}"
```

G. paid 后请求 afterpay，必须返回二维码或获客链接：

```bash
curl -s "http://127.0.0.1:8787/api/afterpay/entrance?order_id=${ORDER_ID}&token=${TOKEN}"
```

H. 后台把价格改成 9.90 元：

```bash
curl -s -X POST http://127.0.0.1:8787/api/admin/campaign/ymty \
  -H 'Content-Type: application/json' \
  -H 'x-admin-id: local-admin' \
  -d '{"product_code":"YMXX_JY_TY","display_price_yuan":9.90,"amount_cents":990}'
```

I. 再创建新订单，新订单金额必须是 990 分：

```bash
curl -s -X POST http://127.0.0.1:8787/api/pay/create \
  -H 'Content-Type: application/json' \
  -d '{"product_code":"YMXX_JY_TY","amount_cents":1,"pay_channel":"mock"}'
```

旧订单金额不会被新价格覆盖，可用 `GET /api/admin/orders` 查看：

```bash
curl -s http://127.0.0.1:8787/api/admin/orders
```

审计日志：

```bash
curl -s http://127.0.0.1:8787/api/admin/audit-logs
```

## 当前未接真实支付

- `POST /api/mock/pay-success` 只用于开发和测试。
- 生产环境默认禁止 mock 支付；除非显式设置 `YMTY_ENABLE_MOCK_PAY=true`，否则 `NODE_ENV=production` 下会返回 403。
- 当前没有微信支付统一下单、支付宝交易创建、回调验签、证书读取、真实交易号校验。

## 下一步接微信/支付宝支付待办

- 增加微信支付和支付宝配置项，但只放 `.env.example` 说明，不提交真实密钥。
- 新增微信支付统一下单、支付宝创建交易接口。
- 新增微信 / 支付宝 notify 回调，并做签名验签。
- 回调必须校验订单金额等于 `orders.amount_cents`。
- 回调处理必须幂等，不能重复发放 `course_users` 权益。
- 后台必须接入正式登录、角色权限、操作审计。
- 上线前确认 HTTPS、Nginx 反代、回调域名、日志脱敏和数据库备份。
