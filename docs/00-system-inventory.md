# 阳明心学交易体验营系统盘点

更新时间：2026-06-12

盘点范围：为 `xxjyxt.com` 的「阳明心学交易体验营」闭环系统做只读工程盘点。本文只判断现状，不实现功能。

业务目标路径：

- H5 落地页：`/hd/ymty/index.html`
- 支付成功页：`/hd/ymty/success.html`
- 后台：`/admin/ymty/`

重要限制：

- 本次未修改业务代码、数据库、Nginx、支付配置或生产文件。
- 本次没有读取或输出任何真实密钥值。
- 若涉及密钥，仅记录“需要提供 / 示例文件存在”，不记录具体内容。

## 1. 项目结构树

当前仓库根目录：

```text
/Users/jianlinhe/Desktop/yangming-trading-system
├── server/                         # Node 后端，API、运行时 JSON 存储、K线缓存脚本
│   ├── src/
│   │   ├── index.js                # HTTP server 入口
│   │   ├── config.js               # 环境变量、运行目录、Web 根目录配置
│   │   ├── routes/router.js        # /api/v1 路由集中入口
│   │   ├── services/               # 业务服务、认证、K线、二维码轮换等
│   │   ├── lib/store.js            # JSON 文件运行时存储
│   │   └── db/schema.sql           # PostgreSQL 正式表结构草案
│   ├── data/
│   │   ├── runtime/                # 当前 JSON 运行时数据
│   │   └── market/                 # 本地 K 线缓存
│   ├── scripts/                    # K线更新、校验、回填脚本
│   ├── .env.example                # 后端环境变量示例
│   ├── package.json
│   └── requirements.txt            # Python provider 依赖
├── web-next/                       # Next.js 前端应用
│   ├── src/app/                    # App Router 页面
│   ├── src/components/             # 前端组件
│   ├── src/features/               # 页面功能模块
│   ├── src/lib/                    # 前端服务、仓储、测试
│   └── package.json
├── web-mvp/                        # 静态 Web MVP，server 默认可作为 Web 根目录
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── assets/
│   └── data/
├── miniprogram/                    # 微信小程序工程
│   ├── app.js
│   ├── app.json
│   ├── pages/
│   ├── modules/
│   └── utils/
├── packages/
│   ├── personality/                # 人格 / 测评逻辑包
│   ├── content/                    # 内容文案包
│   └── contracts/                  # 共享类型包
├── docs/
└── ...
```

## 2. 技术栈判断

### 前端

- 主前端：`web-next`
- 框架：Next.js App Router
- 主要依赖：React、TypeScript、Tailwind CSS
- 包管理：npm，存在 `web-next/package-lock.json`
- 常用命令：
  - `npm run dev`
  - `npm run build`
  - `npm run start`
  - `npm run lint`

### 后端

- 目录：`server`
- 框架形态：原生 Node.js HTTP server，未发现 Express / Koa 主框架
- 路由入口：`server/src/routes/router.js`
- 配置入口：`server/src/config.js`
- 包管理：npm，存在 `server/package-lock.json`
- 常用命令：
  - `npm run dev`
  - `npm run start`
  - `npm run check`
  - `npm run kline:update`
  - `npm run kline:verify`
  - `npm run kline:backfill`

### 数据库 / 存储

- 当前运行态主要依赖 JSON 文件存储：
  - `server/data/runtime/*.json`
  - `server/src/lib/store.js`
- 存在 PostgreSQL 表结构草案：
  - `server/src/db/schema.sql`
- 未发现 Prisma / Sequelize / Knex 等 ORM。
- 未发现已启用的数据库迁移工具。

### 小程序

- 目录：`miniprogram`
- 类型：微信小程序原生工程
- 已有课堂、训练、复盘、报告等页面模块。
- 默认后端地址在 README 中示例为 `http://127.0.0.1:8787`。

### 部署方式判断

- 仓库内未发现 Nginx 配置、PM2 配置、Dockerfile 或 docker-compose。
- `server` 可通过 `SERVE_WEB` + `WEB_DIR` 静态托管 `web-mvp`。
- `web-next` 可独立 build/start。
- 真实线上 Nginx / 反向代理配置应在服务器外部路径，需要人工提供。

## 3. 现有网站根目录、后端、小程序、Nginx 位置

### 网站根目录判断

- 静态 MVP 根目录：`web-mvp/`
- Next.js 应用根目录：`web-next/`
- 后端默认 Web 根目录由 `server/src/config.js` 中 `WEB_DIR` 控制，默认指向 `../web-mvp`。

### 后端项目目录

- `server/`

### 小程序项目目录

- `miniprogram/`

### Nginx / 反向代理配置

- 仓库内未发现 Nginx 配置文件。
- 未发现 `nginx.conf`、`sites-enabled`、`Caddyfile`、`Dockerfile`、`docker-compose.yml`、`ecosystem.config.js`。
- 线上反向代理、HTTPS、静态目录映射需要到服务器确认。

## 4. 现有相关接口列表

当前后端接口主要集中在 `/api/v1`。

### 已有可复用接口能力

| 能力 | 现有接口 / 文件 | 现状判断 |
| --- | --- | --- |
| 健康检查 | `/api/v1/health` | 已有 |
| 短信登录 / 手机认证 | `/api/v1/auth/*` | 已有基础能力 |
| 微信 OAuth | `/api/v1/auth/wechat/start`、callback | 已有登录相关能力，不是微信支付 |
| 小程序状态同步 | `/api/v1/users/:user_id/miniprogram-state` | 已有 |
| 用户签到 | `/api/v1/users/:user_id/check-in` | 已有 |
| 后台用户列表 | `/api/v1/admin/users` | 已有运营后台能力 |
| 后台用户详情 | `/api/v1/admin/users/:user_id` | 已有 |
| 助教二维码轮换 | `/api/v1/assistant-qrs/next` | 已有二维码池轮换能力，但不是支付后解锁 |
| 训练 / 复盘 / 报告数据绑定 | `/api/v1/data-binding/*` | 已有部分数据绑定接口 |
| K线历史数据 | `/api/v1/kline-history/*` | 已有 |

### 目标接口盘点

| 目标接口 | 当前是否存在 | 说明 |
| --- | --- | --- |
| `/api/pay/create` | 不存在 | 未发现订单创建 / 支付发起实现 |
| `/api/pay/wechat/notify` | 不存在 | 未发现微信支付回调 |
| `/api/pay/alipay/notify` | 不存在 | 未发现支付宝回调 |
| `/api/order/status` | 不存在 | 未发现订单状态查询 |
| `/api/afterpay/entrance` | 不存在 | 未发现支付后入口解锁接口 |
| `/api/course/my` | 不存在 | 未发现课程权益 / 我的课程接口 |

结论：支付闭环所需核心接口目前缺失，需要新增订单、支付、回调、支付后入口和课程权益接口。

## 5. 现有数据库 / 表结构判断

### 已有表结构

`server/src/db/schema.sql` 中已有较完整的业务表草案，包括：

- 用户：`users`、`auth_identities`、`auth_sessions`
- 短信：`sms_codes`
- 测评：`question_bank`、`assessment_sessions`、`assessment_answers`、`score_results`、`reports`
- 复盘 / 训练：`trade_reviews`、`daily_reflections`、`training_records`
- 小程序 / 道场：`dojo_*`
- 助教承接：`assistant_handoffs`
- 分享 / 全球照见：`share_cards`、`global_reflection_events`
- K线练习：`kline_practice_*`

### 缺失表结构

未发现体验营支付闭环所需表，例如：

- `orders`
- `payments`
- `payment_notifications`
- `course_enrollments`
- `ymty_product_config`
- `afterpay_entrances`
- `live_code_configs`
- `lead_links`

### 当前运行态判断

- 当前后端 README 明确说明早期版本不强依赖数据库，使用 JSON 运行时数据。
- 因此支付闭环如果要上线，应优先确认是否启用 PostgreSQL，还是先用 JSON 做极简 MVP。
- 涉及支付订单不建议长期使用普通 JSON 文件作为唯一生产存储。

## 6. 现有支付代码判断

未发现以下生产支付能力：

- 微信支付统一下单 / JSAPI / H5 / Native 支付实现
- 微信支付 v3 回调验签
- 支付宝创建交易 / H5 支付 / 回调验签
- 订单状态机
- 支付通知幂等处理
- 支付金额校验
- 支付成功后权益发放
- 支付成功后企业微信活码 / 获客链接解锁

已有的微信相关代码是 OAuth 登录，不是微信支付。

当前 `server/.env.example` 中存在微信 OAuth、短信、K线、飞书等配置示例；未发现微信支付商户号、API v3 key、商户证书、支付宝 app_id、支付宝公钥 / 私钥等支付配置示例。

## 7. 现有小程序承接能力判断

### 已有能力

`miniprogram/` 中已有：

- 首页
- 测评
- 报告
- 课堂
- 课程详情
- 真实复盘
- 7天训练相关模块
- 本地状态与服务端同步能力

小程序 README 中已有同步接口：

- `POST /api/v1/auth/demo-login`
- `GET /api/v1/users/:user_id/miniprogram-state`
- `POST /api/v1/users/:user_id/miniprogram-state`
- `POST /api/v1/users/:user_id/check-in`

### 缺失能力

未发现：

- 体验营购买后课程权益接口
- `GET /api/course/my`
- 支付成功后自动绑定小程序课程
- H5 支付订单与小程序用户身份打通
- 体验营专属课程 ID / SKU / batch 配置
- 7天滚动开营的服务端配置

结论：小程序具备课程承接的页面基础，但缺少支付后权益绑定和“我的课程”服务端入口。

## 8. 当前部署路径判断

### H5 落地页

目标路径：`/hd/ymty/index.html`

当前状态：

- 未发现 `web-mvp/hd/ymty/index.html`
- 未发现 `web-next` 中对应 `/hd/ymty` 页面
- 未发现独立 `hd/ymty` 静态目录

需要后续新增落地页，并确认由 Nginx 静态托管，还是由 `server` 的 `WEB_DIR` 托管。

### 支付成功页

目标路径：`/hd/ymty/success.html`

当前状态：

- 未发现 `web-mvp/hd/ymty/success.html`
- 未发现 `web-next` 中对应成功页

需要后续新增，并接入订单状态校验和支付后入口接口。

### 后台

目标路径：`/admin/ymty/`

当前状态：

- 现有后台入口是 `web-next/src/app/admin/page.tsx`
- 当前后台偏运营照见台 / 用户运营，不是体验营价格、活码、获客链接配置后台
- 未发现 `/admin/ymty/` 专属页面

需要后续新增体验营后台模块，包含价格配置、活码配置、获客链接配置、订单查询和支付回调排查。

## 9. 风险点

1. 支付闭环核心能力缺失  
   当前没有订单、支付、回调、状态查询、支付后入口解锁接口。

2. 数据存储方式需要先定  
   当前运行态大量使用 JSON 文件；支付订单和回调幂等更适合数据库持久化。

3. 支付回调必须有公网 HTTPS  
   微信 / 支付宝回调依赖稳定公网地址和证书，仓库内未看到 Nginx / HTTPS 配置。

4. 密钥配置尚未准备  
   需要微信支付和支付宝生产密钥，但当前 `.env.example` 未包含支付密钥示例。

5. 活码能力已有雏形但未受保护  
   现有 `assistant-qr-pool.json` 和 `/api/v1/assistant-qrs/next` 可作为活码轮换参考，但目前不是支付后解锁能力。

6. 后台权限需要确认  
   当前 `/admin` 是运营 MVP，未确认是否有正式管理员认证、权限和审计。

7. H5 目标路径不存在  
   `/hd/ymty/index.html` 和 `/hd/ymty/success.html` 尚未部署。

8. 小程序课程权益未打通  
   小程序有课堂页面，但缺少购买后课程权益接口。

9. 合规文案必须贯穿支付链路  
   落地页、支付页、成功页、课程承接页都必须明确“不荐股、不喊单、不承诺收益、不代客理财、不组织实盘跟单”。

10. 1.68 元价格必须后台可配置  
   默认价格是 1.68 元，但不能写死在前端页面里；至少要服务端配置来源。

## 10. 下一步实施计划

建议按最小闭环分阶段做，不要一次性铺大系统。

### 第一步：确定生产承载方式

- 确认 H5 静态页放在 `web-mvp/hd/ymty/` 还是 `web-next` 路由。
- 确认后端是否使用当前 `server` 承接支付 API。
- 确认线上 Nginx 如何把 `/hd/ymty/*` 和 `/api/*` 转发到对应服务。

### 第二步：补数据模型

最小需要：

- 体验营产品配置：价格、课程名、训练周期、开课说明
- 订单：订单号、金额、渠道、状态、用户标识、创建时间
- 支付通知日志：渠道、通知原文摘要、验签状态、幂等状态
- 支付后入口配置：企业微信活码、获客助手链接、小程序承接链接
- 课程权益：用户 / 手机号 / openid 与体验营权益绑定

### 第三步：新增支付 API

建议接口：

- `POST /api/pay/create`
- `POST /api/pay/wechat/notify`
- `POST /api/pay/alipay/notify`
- `GET /api/order/status`
- `GET /api/afterpay/entrance`
- `GET /api/course/my`

必须包含：

- 金额服务端校验
- 回调验签
- 幂等处理
- 订单状态机
- 支付成功后权益发放

### 第四步：新增 H5 页面

- `/hd/ymty/index.html`
- `/hd/ymty/success.html`

落地页只做体验营报名，不做荐股、喊单、收益承诺。

### 第五步：新增后台 `/admin/ymty/`

最小后台配置：

- 课程名称
- 售价
- 训练周期
- 开课时间说明
- 企业微信活码
- 获客助手链接
- 小程序承接链接
- 订单列表
- 支付状态排查

### 第六步：小程序课程承接

- 新增或复用课程列表 / 课程详情页面。
- 接入 `GET /api/course/my`。
- 根据支付权益显示体验营课程。

## 11. 需要人工提供的密钥和后台账号清单

请人工提供或确认以下信息。不要把密钥直接写进代码仓库。

### 域名 / 部署

- `xxjyxt.com` 服务器登录方式
- 线上 Nginx 配置路径
- HTTPS 证书配置方式
- 当前后端服务启动方式
- 当前前端服务启动方式
- 生产部署用户和目录

### 微信支付

- 微信支付商户号
- 微信支付 AppID
- API v3 Key
- 商户证书序列号
- 商户私钥 / 证书文件
- 支付回调域名配置
- 是否使用 JSAPI / H5 / Native 支付

### 支付宝

- 支付宝 AppID
- 应用私钥
- 支付宝公钥或证书
- 支付网关环境：沙箱 / 生产
- 支付回调地址配置

### 企业微信 / 获客助手

- 企业微信活码图片或素材链接
- 获客助手链接
- 是否需要多活码轮询
- 是否需要按渠道 / 订单来源分配活码

### 小程序

- 小程序 AppID
- 小程序 AppSecret
- 体验营课程页面路径
- 是否需要生成小程序码
- H5 与小程序用户身份绑定方式

### 后台

- 管理员账号
- 管理员权限范围
- 是否需要操作审计
- 是否需要订单导出

### 数据库

- 是否启用 PostgreSQL
- 数据库连接地址
- 数据库用户名
- 数据库迁移发布方式
- 备份策略

## 12. 只读结论

当前项目已经具备：

- Node 后端 API 基础
- Next.js 管理与产品页面基础
- 静态 Web MVP 托管基础
- 微信小程序课堂 / 训练 / 复盘页面基础
- 助教二维码轮换雏形
- PostgreSQL 表结构草案

当前体验营闭环缺失：

- H5 落地页目标路径
- 支付成功页目标路径
- 体验营后台
- 订单系统
- 微信 / 支付宝支付
- 支付回调验签与幂等
- 支付成功后入口解锁
- 小程序课程权益接口

下一步最稳起点：

1. 先确认线上 Nginx / 服务部署方式。
2. 再确定订单数据存储使用 PostgreSQL 还是短期 JSON MVP。
3. 然后实现最小订单 + 支付 + 成功页 + 活码解锁闭环。

