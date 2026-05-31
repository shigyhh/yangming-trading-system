# AI交易人格系统上线部署与直播引流 SOP

这份文档解决一个核心问题：让用户在直播间扫码后，能直接打开网页、登录、测评、做 K 线心性练习，并把结果沉淀到后端和飞书。

## 一、当前系统已经具备什么

当前项目已经是“前端 + 后端一体”的上线形态：

- 前端页面：`web-mvp/index.html`
- 后端服务：`server/src/index.js`
- 后端默认托管网页：访问 `/` 就打开首页
- 接口目录：访问 `/api/v1`
- 题库：3600 道交易人格题库 + 1500 道 K 线心性练习题
- 已有功能：登录体验、随机抽题、自动评分、报告生成、飞书机器人预检、每日签到、K 线练习、关卡、周榜/月榜、知行同修指数

本地启动：

```bash
cd server
npm run dev
```

本地访问：

```text
http://localhost:8787/
```

## 二、上线有两条路

### 路线 A：直播前快速彩排

适合：明天就要直播，先让一小批人能打开体验。

做法：

1. 在你的电脑上启动后端。
2. 用公网隧道工具把 `localhost:8787` 暴露成一个临时 HTTPS 地址。
3. 把这个临时地址生成二维码，直播间扫码体验。

优点：最快，不用买服务器。

风险：电脑不能关机，网络不能断，直播人多时不稳定。

可选工具：Cloudflare Tunnel、cpolar、花生壳等。Cloudflare Tunnel 的官方说明是可以把本地应用发布到公网主机名，不需要直接暴露服务器公网 IP。参考：[Cloudflare Tunnel Docs](https://developers.cloudflare.com/tunnel/)。

### 路线 B：正式上线

适合：直播引流、投放、长期运营。

推荐结构：

```text
用户手机
  ↓
域名 HTTPS
  ↓
Nginx 反向代理
  ↓
Node 后端服务
  ↓
本地 JSON / 后续 PostgreSQL
  ↓
飞书 / Coze / 企业微信
```

大白话解释：

- Nginx：站在门口收请求，把访问转给后端。
- Node 后端：真正处理测评、评分、K 线练习、排行榜。
- PM2 或 systemd：让 Node 后端断了能自动拉起。

Nginx 反向代理是常见部署方式，官方文档可参考：[NGINX Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy)。PM2 是 Node 进程管理工具，官方文档可参考：[PM2 Documentation](https://pm2.io/docs/runtime/overview/)。

## 三、正式服务器部署步骤

### 1. 服务器准备

建议先用一台小型 Linux 云服务器，系统选 Ubuntu LTS。

最低配置建议：

- 2 核 CPU
- 2GB 内存
- 40GB 硬盘
- 带公网 IP

如果面向国内微信生态长期投放，后面要考虑备案、短信服务、微信开放平台/公众号授权。

### 2. 上传项目

把整个项目上传到服务器，例如：

```text
/var/www/yangming-trading
```

进入后端目录：

```bash
cd /var/www/yangming-trading/server
```

本项目目前没有外部依赖，先不需要安装复杂包。确认 Node 版本：

```bash
node -v
```

要求 Node 18 或更高。

### 3. 初始化题库

```bash
npm run generate:questions
npm run generate:kline
```

### 4. 配置环境变量

复制示例文件：

```bash
cp .env.example .env
```

最小配置：

```env
PORT=8787
NODE_ENV=production
SERVE_WEB=true
WEB_DIR=../web-mvp
QUESTION_BANK_SOURCE=../web-mvp/data/question-bank.json
FEISHU_BOT_WEBHOOK=
FEISHU_BOT_SECRET=
```

注意：不要把 `.env` 发给别人，不要把密钥写进代码。

### 5. 启动服务

先手动测试：

```bash
npm run start
```

浏览器打开：

```text
http://服务器IP:8787/
```

能看到首页后，再用进程管理工具守护。

PM2 方案：

```bash
pm2 start src/index.js --name yangming-trading
pm2 save
pm2 startup
```

如果不想引入 PM2，也可以用 systemd，后续再单独整理一份。

### 6. 配置 Nginx 和域名

示例配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置 HTTPS 后，直播间最终使用：

```text
https://your-domain.com/
```

## 四、直播引流页面怎么放

直播间不要只放一个裸链接，要放“有仪式感的入口”：

```text
扫码进入
  ↓
先添加助理
  ↓
绑定/登录
  ↓
先做九种交易人格测评
  ↓
领取 AI 诊断报告
  ↓
每天 3 道 K 线心性练习
  ↓
连续 7 天解锁止损/冲动专属关卡
  ↓
进入训练营/社群承接
```

直播二维码建议带渠道参数：

```text
https://your-domain.com/?channel=0525直播间&invite=ZX123456
```

页面会自动把 `channel` 填到来源渠道里，把 `invite` 填到邀请码入口里。这样后面看飞书和后台数据时，能知道用户来自哪一场直播、哪一位同修邀请。

直播话术建议：

```text
今天不讲荐股，不讲内幕。
我们只做一件事：看见你在交易里最容易重复犯的那个错。
扫码进入，先做九种交易人格测评，做完系统会给你一份 AI 诊断报告。
从今天开始每天 3 道 K 线心性练习，练的不是猜涨跌，而是临盘能不能知行合一。
```

## 五、K 线练习 2.0 可以继续加什么

当前已经有：

- 每日 3 题
- 连续天数解锁
- 冲动型专属关卡
- 扛单型止损关卡
- 周榜/月榜/总榜
- 临盘修行分
- 每题单选一次，答完立即锁定，不允许反复改答案刷分

下一步更能留住客户的功能：

1. 直播间专属榜：每场直播一个榜单，用户扫码后自动归属当场直播。
2. 人格专属训练路径：测评出主人格后，首页优先推对应关卡。
3. 七日修行证书：连续 7 天完成后生成可分享海报。
4. 错题本：记录用户最常选错的心性动作。
5. 每日晨课：开盘前推送一句心学提醒 + 今日训练目标。
6. 训练营分层：高风险人格进入基础觉察营，平衡型进入系统复盘营。
7. 助理跟进：用户高风险报告、连续打卡、断签，都同步飞书提醒人工承接。

## 六、防爬虫和安全怎么做

先说结论：不要指望前端防爬。真正的防护要在服务器、网关和接口层做。

MVP 最小防护：

- 首页保留 `noindex`，避免搜索引擎主动收录测试站。
- Nginx 加请求频率限制。
- 登录/提交接口加验证码或短信验证码。
- 每个 IP、每个用户每天限制测评次数和 K 线提交次数。
- 报告接口必须登录后访问。
- 飞书 Webhook 放在 `.env`，不要放前端。
- 定期备份 `server/data/runtime`。

正式版防护：

- 接 Cloudflare / 云厂商 WAF。
- 对 `/api/v1/assessments/start`、`/submit`、`/kline-practice/submit` 做限流。
- 增加服务端 Session，不信任前端传来的用户身份。
- 增加操作日志，记录 IP、UA、渠道、异常请求。
- PostgreSQL 替换本地 JSON，并做每日备份。
- 重要接口增加签名或 CSRF 防护。

## 七、直播上线前检查清单

开播前 30 分钟检查：

- 首页能打开。
- 手机扫码能打开。
- 能登录。
- 能完成 27 题快测。
- 能生成报告。
- K 线练习能答题、换题、上榜。
- 助理二维码是正确的。
- 飞书能收到报告或至少 dry_run 成功。
- 页面底部/侧边有“不构成投资建议”的合规提示。
- 服务器磁盘和内存正常。

## 八、我建议你的下一步

先不要急着接一堆复杂功能。

下一步最稳的是：

1. 买/准备一个正式域名。
2. 准备一台云服务器。
3. 我们把当前 Node 服务部署上去。
4. 配好 HTTPS。
5. 接飞书通知。
6. 用直播间二维码做一次 20 人以内内测。
7. 根据真实用户卡点，再决定接微信 OAuth、短信、PostgreSQL 和训练营付费。

这样节奏最稳：先打开门，再接人，再沉淀数据，最后做商业化闭环。
