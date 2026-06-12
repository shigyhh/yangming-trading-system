# AI交易人格测评系统 Server

这是 2.0 正式版的后端骨架第一版，先跑通：

- 题库导入
- 随机抽题
- 提交答案
- 自动评分
- 本地报告生成
- 首页统计接口
- MVP 用户登录/注册记录
- 后端飞书机器人同步中转
- 每日修心签到
- 3600题测评题库
- 1500题K线心性练习与临盘修行榜
- K线练习每日3题、连续天数解锁、人格专属关卡、周/月榜
- 专属邀请码和知行同修指数
- 小程序修行道场：训练营教练/助教、绑定关系、道场任务、观心记录、修行榜
- 后端直接托管 `web-mvp` 首页，方便上线时一个域名打开

第一版不强制安装数据库，使用 `server/data/runtime/*.json` 做本地开发数据。`src/db/schema.sql` 已经提供 PostgreSQL 正式版表结构，后面切数据库时使用。

## 启动

```bash
cd server
npm run generate:questions
npm run dev
```

默认地址：

```text
http://localhost:8787
```

现在后端默认会同时托管网页：

```text
http://localhost:8787/
```

接口目录放在：

```text
http://localhost:8787/api/v1
```

## 常用接口

健康检查：

```bash
curl http://localhost:8787/health
```

接口目录：

```bash
curl http://localhost:8787/api/v1
```

首页统计：

```bash
curl http://localhost:8787/api/v1/stats/public
```

MVP 登录/注册：

```bash
curl -X POST http://localhost:8787/api/v1/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"method":"wechat_demo","display_name":"微信学员","contact":"wechat-openid-demo","wechat_bound":true}'
```

用户每日修行：

```bash
curl http://localhost:8787/api/v1/users/{user_id}/habit

curl -X POST http://localhost:8787/api/v1/users/{user_id}/check-in \
  -H "Content-Type: application/json" \
  -d '{"note":"今日先正心，再看盘"}'
```

知行同修指数：

```bash
curl http://localhost:8787/api/v1/users/{user_id}/influence
```

K线心性练习：

```bash
npm run cache:ashare -- --limit 30 --timeframes 101

# 全A股日K历史缓存：会刷新股票池，默认跳过已缓存文件，适合断点续跑
npm run cache:ashare -- --limit all --timeframes 101 --delay 500 --refresh-pool --summary-only

# 每天收盘后增量补齐日K，已有缓存只从最后一根之后下载
npm run update:ashare

# 如果服务器安装了 AkShare，也可以用 AkShare 做增量离线补库
python3 -m pip install akshare pandas
npm run cache:akshare -- --limit all --timeframes 101 --delay 300 --refresh-pool --summary-only

# P2.2-A.2：真实复盘自动盘证使用的每日 K线缓存更新，也可指定 AKShare provider
python3 -m pip install -r requirements.txt
npm run kline:update -- --market ashare --timeframe 101 --provider akshare --symbols 600519,300750 --dry-run
npm run kline:update -- --market ashare --timeframe 101 --provider akshare --symbols 600519,300750

# 指定少量股票验证 AkShare 补库
npm run cache:akshare -- --codes 600519,000001,300750 --timeframes 101 --summary-only

# 多周期缓存会更慢、占用更大，建议夜间跑
npm run cache:ashare -- --limit all --timeframes 101,102,103,30,60 --delay 800 --skip-existing --summary-only

curl http://localhost:8787/api/v1/kline-practice/stats

curl "http://localhost:8787/api/v1/kline-practice/levels?user_id=demo_user"

curl "http://localhost:8787/api/v1/kline-practice/next?user_id=demo_user&stage_id=daily"

curl -X POST http://localhost:8787/api/v1/kline-practice/submit \
  -H "Content-Type: application/json" \
  -d '{"user_id":"demo_user","nickname":"测试用户","scenario_id":"KL001","decision":"守计划等待","stage_id":"daily","request_next":true}'

curl "http://localhost:8787/api/v1/kline-practice/leaderboard?period=week"
curl "http://localhost:8787/api/v1/kline-practice/leaderboard?period=month"
```

真实A股K线训练默认匿名化：前端只拿到片段 token 和“第N根”K线，不暴露股票名、代码和真实日期。训练完成后如需在老师复盘场景中揭晓真实片段，应通过后端受控接口单独实现，不要把原始代码和日期直接放进训练接口。

数据更新策略：

- 小程序训练接口只读本地离线缓存，保证速度和匿名化。
- 每天收盘后运行 `npm run update:ashare`，补齐东方财富源的日K缺口；训练缓存默认使用不复权原始价，避免长历史前复权出现负价格。
- 如服务器 Python 环境可用，运行 `npm run cache:akshare -- --limit all --timeframes 101 --delay 300 --summary-only`，用 AkShare 增量补离线库；默认 `--adjust ""`，需要前复权时再显式传 `--adjust qfq`。
- “实时更新”如果指日K，建议按交易日 15:30 后更新；如果指盘中训练，需要另外缓存 30/60 分钟K或接行情快照。

知行合一逐根回放：

```bash
curl -X POST http://localhost:8787/api/v1/zhixing-replay/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"stage_id":"impulse","timeframe":"101","plan":{"direction":"做多但等确认","stop_loss_pct":4,"max_position_pct":30,"rule":"无计划不开仓，触线即退"},"emotion":{"mood":"平静","intensity":2}}'

curl -X POST http://localhost:8787/api/v1/zhixing-replay/{session_id}/decision \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"hold","position_pct":10,"reason":"未到计划买点，继续等确认"}'

curl -X POST http://localhost:8787/api/v1/zhixing-replay/{session_id}/next \
  -H "Authorization: Bearer <token>"

curl -X POST http://localhost:8787/api/v1/zhixing-replay/{session_id}/finish \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reveal":false}'
```

微信小程序状态同步：

```bash
curl -X POST http://localhost:8787/api/v1/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"method":"wechat_miniprogram_demo","display_name":"修行者","contact":"mp_local_device","wechat_bound":true,"source_channel":"微信小程序MVP"}'

curl -X POST http://localhost:8787/api/v1/users/{user_id}/miniprogram-state \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"source_channel":"微信小程序MVP","state":{"profile":{"nickname":"修行者","points":30},"assessment_result":{"primary":"冲动型"},"mind_profile":{"personality_type":"冲动型","current_stage":"照心","heart_thief":"怕错过"},"zhixing_score":{"latest":{"total":76},"records":{}},"training_state":{},"review_records":{}}}'

curl -H "Authorization: Bearer <token>" \
  http://localhost:8787/api/v1/users/{user_id}/miniprogram-state
```

小程序同步策略：

- 小程序先保存到本地，再静默推送到后端；后端不可用时不影响用户继续测评、训练、复盘。
- “我的”页可手动保存后端地址、同步本机数据、从后端拉取同账号数据。
- 开发者工具模拟器可用 `http://127.0.0.1:8787`；手机真机预览需改为电脑局域网 IP，并保持同一 Wi-Fi。

小程序修行道场：

```bash
# 1. 教练或助教先用自己的账号注册真人带练身份
curl -X POST http://localhost:8787/api/v1/dojo/mentors/register \
  -H "Authorization: Bearer <coach_token>" \
  -H "Content-Type: application/json" \
  -d '{"role":"coach","display_name":"老何训练营教练","bio":"只做修行陪跑，不做交易建议"}'

# 2. 用户绑定训练营教练/助教道场码
curl -X POST http://localhost:8787/api/v1/users/{user_id}/dojo/bindings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mentor_code":"ZXABC123","role":"coach"}'

# 3. 获取用户道场概览：阳明先生道统导师、真人带练、下一条共修任务、排行榜位置
curl -H "Authorization: Bearer <token>" \
  http://localhost:8787/api/v1/users/{user_id}/dojo/summary

# 4. 获取/创建道场共修任务
curl http://localhost:8787/api/v1/dojo/tasks

curl -X POST http://localhost:8787/api/v1/dojo/tasks \
  -H "Authorization: Bearer <coach_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"行动前三问","discipline":"无计划，不开仓。","action":"行动前写下理由、边界、离场条件。","personality_type":"冲动型","stage":"事上磨关"}'

# 5. 用户领取/完成共修任务
curl -X POST http://localhost:8787/api/v1/users/{user_id}/dojo/tasks/{task_id}/records \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"accept"}'

curl -X POST http://localhost:8787/api/v1/users/{user_id}/dojo/tasks/{task_id}/records \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"complete","note":"今天完成了行动前三问"}'

# 6. AI观心助手记录：后续接真实大模型时，前端/服务端生成 reply 后写入这里
curl -X POST http://localhost:8787/api/v1/users/{user_id}/dojo/mind-records \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"input":"我现在很急，怕错过","reply":{"title":"观心回应","content":"先慢一拍"},"context":{"personality_type":"冲动型","mind":"急"}}'

# 7. 教练/助教后台看板：只看修行闭环，不看具体交易明细
curl -H "Authorization: Bearer <coach_token>" \
  http://localhost:8787/api/v1/dojo/mentor-dashboard

# 8. 修行榜
curl "http://localhost:8787/api/v1/dojo/leaderboard?period=week&limit=20"
```

道场数据边界：

- 阳明先生是道统导师，只作为心学语境和观心提醒，不代表历史人物本人言论。
- 真人带练只命名为训练营教练或助教。
- 教练/助教只看照心、训练、复盘、连续修行、道场任务和知行状态，不看具体交易明细。

开始测评：

```bash
curl -X POST http://localhost:8787/api/v1/assessments/start \
  -H "Content-Type: application/json" \
  -d '{"test_version":"45","user_id":"demo_user","nickname":"测试用户","source_channel":"直播间"}'
```

题量版本：

- `27`：轻量版，每类人格 3 题
- `45`：标准版，每类人格 5 题
- `90`：深度版，每类人格 10 题
- `108`：修心版，每类人格 12 题
- `360`：闭关版，每类人格 40 题

评分锚点：

- `1`：几乎从不，0%-10%
- `2`：偶尔，10%-30%
- `3`：有时，30%-60%
- `4`：经常，60%-80%
- `5`：几乎常态，80%-100%

作答时按最近 3 个月，或最近 10 次类似交易场景判断，不按理想中的自己作答。

提交答案：

```bash
curl -X POST http://localhost:8787/api/v1/assessments/{assessment_id}/submit \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"question_id":"CX001","score":5}]}'
```

提交答案时必须把本次抽到的题都提交，否则会返回缺失题目。

飞书同步预检：

```bash
curl -X POST http://localhost:8787/api/v1/integrations/feishu/report \
  -H "Content-Type: application/json" \
  -d '{"dry_run":true,"nickname":"测试用户","score_result":{"main_type":"冲动型","sub_type":"焦虑型","risk_level":"高风险","recommended_camp":"基础觉察营"}}'
```

正式同步有两种方式：

1. 在 `server/.env` 填写 `FEISHU_BOT_WEBHOOK=`，网页里可以不填飞书地址。
2. 在网页接口配置里填写飞书机器人 Webhook，后端会校验只允许飞书/Lark 自定义机器人地址。

## 下一步

1. 把飞书机器人同步升级成飞书多维表格写入。
2. 把K线练习从静态K线题升级成更完整的行情回放、专题关卡和直播间战队榜。
3. 接短信验证码服务商。
4. 接微信公众号/开放平台 OAuth，替换 `demo-login`。
5. 接 PostgreSQL，替换本地 runtime JSON。
6. 接 Coze 报告工作流或把报告生成全部迁到服务端。
