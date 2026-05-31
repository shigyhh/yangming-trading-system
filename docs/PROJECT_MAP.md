# 阳明心学交易系统：项目结构地图

## 定位总览

本仓库围绕“交易心理训练与人格照见”构建，不是投顾系统、行情系统或交易执行系统。

当前主要工程分为三端：

| 工程 | 职责 | 当前技术形态 |
| --- | --- | --- |
| `web-next` | 官网、测评入口、测评流程、报告页、复测变化与首页品牌视觉 | Next.js、React、Tailwind CSS、Framer Motion、GSAP、Three.js |
| `server` | 共用 API、用户身份、测评会话、评分报告、训练记录、小程序同步、道场/助教承接 | Node.js HTTP server、本地 JSON runtime、PostgreSQL schema 预留 |
| `miniprogram` | 微信小程序端每日修行闭环：照心、测评、报告、训练、复盘、成长、用户中心 | 原生微信小程序页面、模块、组件、工具层 |

当前仓库还没有 `packages/` 目录。按项目规则，后续应补齐：

- `packages/personality`：统一人格计算与人格到训练路径映射。
- `packages/content`：统一文案、365 天心证、训练内容、报告内容。
- `packages/contracts`：统一 Web、小程序、后台共用接口类型。

## 顶层目录

| 目录 | 用途 |
| --- | --- |
| `web-next` | 当前重点 Web 前端，承载首页视觉、测评入口、测评结果、训练变化等用户侧页面。 |
| `server` | 当前后端 API，承载测评、报告、登录、小程序同步、训练记录、道场和飞书同步等服务。 |
| `miniprogram` | 微信小程序端，承载每日修行工具、用户中心和小程序闭环页面。 |
| `docs` | 项目文档、世界观规则、数据模型、发布流程和本项目地图。 |
| `worldview` | 世界观源文件，定义人格、六阶段、文案边界、AI 教练规则和用户旅程。 |
| `design-system` | 视觉与产品宪法、小程序 token 等设计系统资料。 |
| `data` | 项目共用静态规则与每日修行内容数据。 |
| `web-mvp` | 早期 Web MVP 静态页与数据资源，部分服务端仍可托管。 |
| `prototypes` | 原型页面。 |
| `scripts` | 根目录辅助脚本。 |
| `00_整理成果` | 早期 PRD、Coze 工作流、运营 SOP 等资料沉淀。 |

## docs：已有项目文档

| 文件 | 说明 |
| --- | --- |
| `docs/RUNBOOK.md` | 本地运行手册，说明 Web、Server、小程序如何在台式机启动。 |
| `docs/PROJECT_MAP.md` | 当前项目结构地图，说明三端职责、业务域目录、结构风险和后续顺序。 |
| `docs/V1验证报告.md` | V1 阶段验证记录。 |
| `docs/世界观与系统规则.md` | 产品世界观、核心闭环、禁止边界、九型人格、六大关卡和 AI 观心规则。 |
| `docs/上线发布流程.md` | 上线发布流程说明。 |
| `docs/数据模型文档.md` | 用户、测评、报告、训练、道场等数据模型说明。 |

## web-next：Web 官网与测评前端

`web-next` 负责浏览器端产品体验，当前重点是“东方 AI 交易修行空间”的首页，以及测评、报告、训练变化的 Web 闭环。

### 关键目录

| 路径 | 职责 |
| --- | --- |
| `web-next/src/app` | Next.js App Router 页面入口。 |
| `web-next/src/components/home` | 首页视觉与滚动叙事组件。 |
| `web-next/src/features/assessment` | Web 端测评题目、人格报告生成、复测变化、本地存储与行为镜。 |
| `web-next/src/components/ui` | shadcn 风格基础 UI 组件。 |
| `web-next/src/app/globals.css` | 全局样式、字体、主题 token。 |
| `web-next/public/fonts` | 官网字体资源。 |

### 重点页面

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `web-next/src/app/page.tsx` | 渲染 `CinematicHome`，承载品牌首屏和滚动叙事。 |
| 测评入口 | `web-next/src/app/assessment-entry/page.tsx` | 交易人格测评入口。 |
| 测评登录 | `web-next/src/app/assessment-login/page.tsx` | 测评前登录/手机号流程。 |
| 测评仪式 | `web-next/src/app/assessment-ritual/page.tsx` | 测评前的心境进入。 |
| 测评答题 | `web-next/src/app/assessment/page.tsx` | 问题作答流程。 |
| 报告生成 | `web-next/src/app/assessment-generating/page.tsx` | 报告生成过渡页。 |
| 测评结果 | `web-next/src/app/assessment-result/page.tsx` | 人格报告卡与训练方向。 |
| 复测变化 | `web-next/src/app/practice-change/page.tsx` | 训练记录与复测变化展示。 |
| 循环之镜 | `web-next/src/app/cycle-mirror/page.tsx` | 行为循环照见页面。 |
| 观心档案 | `web-next/src/app/observing-archive/page.tsx` | 观心记录/档案展示。 |
| 全球照见 | `web-next/src/app/global-reflection/page.tsx` | 全球照见层的早期页面。 |

### 首页组件

| 组件 | 作用 |
| --- | --- |
| `cinematic-home.tsx` | 首页总装组件。 |
| `hero-section.tsx` | 首屏主标题、副标题、CTA 和 AI 观心卡布局。 |
| `ink-mountain-background.tsx` | 水墨山形、墨色空间和背景层次。 |
| `zen-scene-canvas.tsx` | Three.js / Canvas 场景。 |
| `water-ripple-field.tsx` | 水波/粒子氛围。 |
| `insight-card.tsx` | AI 观心系统卡片。 |
| `kline-spirit.tsx` | 抽象 K 线意象，用作心念波动，不应像行情软件。 |
| `personality-grid.tsx` | 九型交易人格展示。 |
| `training-system.tsx` | 五层训练系统展示。 |
| `story-sections.tsx` | 滚动叙事段落。 |
| `top-nav.tsx` | 顶部导航。 |

### Web 测评相关

| 文件 | 作用 |
| --- | --- |
| `web-next/src/features/assessment/questions.ts` | Web 端测评题目和标签类型。 |
| `web-next/src/features/assessment/report.ts` | Web 端人格报告生成逻辑。 |
| `web-next/src/features/assessment/practice-change.ts` | 7 天训练记录与变化状态。 |
| `web-next/src/features/assessment/behavior-mirrors.ts` | 行为镜信号定义。 |
| `web-next/src/features/assessment/CycleMirror.tsx` | 行为循环照见交互。 |
| `web-next/src/features/assessment/MirrorGateway.tsx` | 行为镜入口交互。 |
| `web-next/src/features/assessment/MirrorRevelation.tsx` | 选项照见反馈。 |
| `web-next/src/features/assessment/storage.ts` | 浏览器本地测评状态存储。 |
| `web-next/src/features/assessment/mock-sms.ts` | Web 端模拟短信辅助逻辑。 |

## server：共用 API 与数据承接

`server` 负责 Web、小程序和后续后台共用的 API。当前是 Node.js 原生 HTTP 服务，开发期以本地 JSON runtime 为主，正式数据库结构放在 `server/src/db/schema.sql`。

### 关键目录

| 路径 | 职责 |
| --- | --- |
| `server/src/index.js` | HTTP 服务入口，处理 CORS、限流、路由和错误。 |
| `server/src/routes/router.js` | API 路由集中入口。 |
| `server/src/services` | 业务服务层。 |
| `server/src/lib` | HTTP、store、rate limit 等通用库。 |
| `server/src/config.js` | 服务端配置。 |
| `server/src/db/schema.sql` | PostgreSQL 正式版表结构。 |
| `server/data` | 题库、K 线练习库、市场缓存和本地数据。 |
| `server/scripts` | 题库导入、题库生成、K 线缓存、smoke test 等脚本。 |

### 后台/API 相关服务

| 服务文件 | 负责内容 |
| --- | --- |
| `server/src/services/auth.js` | 用户登录、注册、token 鉴权、访问权限。 |
| `server/src/services/phoneAuth.js` | 手机号验证码登录。 |
| `server/src/services/wechatAuth.js` | 微信授权入口与回调。 |
| `server/src/services/assessments.js` | 测评会话开始、提交、查询、历史记录。 |
| `server/src/services/questionBank.js` | 测评题库加载、题目选择、题库统计。 |
| `server/src/services/scoring.js` | 后端评分与本地报告生成。 |
| `server/src/services/habits.js` | 每日修行签到。 |
| `server/src/services/miniprogramSync.js` | 小程序状态同步。 |
| `server/src/services/marketPractice.js` | K 线心性练习、匿名训练片段、练习统计与榜单。 |
| `server/src/services/zhixingReplay.js` | 知行合一逐根回放。 |
| `server/src/services/dojo.js` | 修行道场、教练/助教绑定、任务、观心记录、榜单。 |
| `server/src/services/feishu.js` | 报告同步到飞书/运营承接。 |
| `server/src/services/stats.js` | 首页公开统计。 |
| `server/src/services/influence.js` | 知行同修指数。 |
| `server/src/services/forum.js` | 早期论坛/帖子功能。 |
| `server/src/services/assistantQr.js` | 助教二维码池。 |

### 主要 API 域

| 域 | 典型接口 |
| --- | --- |
| 健康与目录 | `GET /health`、`GET /api/v1` |
| 登录鉴权 | `POST /api/v1/auth/demo-login`、`POST /api/v1/auth/sms/send`、`POST /api/v1/auth/phone-login`、微信授权接口 |
| 用户 | `GET /api/v1/users/:user_id` |
| 测评 | `POST /api/v1/assessments/start`、`GET /api/v1/assessments/:assessment_id`、`POST /api/v1/assessments/:assessment_id/submit`、`GET /api/v1/users/:user_id/assessments` |
| 每日修行 | `GET /api/v1/users/:user_id/habit`、`POST /api/v1/users/:user_id/check-in` |
| 小程序同步 | `GET|POST /api/v1/users/:user_id/miniprogram-state` |
| K 线心性训练 | `GET /api/v1/kline-practice/next`、`POST /api/v1/kline-practice/submit`、统计/等级/榜单接口 |
| 知行回放 | `POST /api/v1/zhixing-replay/start`、decision、next、finish、results |
| 修行道场 | mentors、bindings、tasks、mind-records、leaderboard、mentor-dashboard |
| 运营承接 | `POST /api/v1/integrations/feishu/report`、`GET /api/v1/assistant-qrs/next` |

### 数据模型重点

`server/src/db/schema.sql` 已覆盖：

- 用户与身份：`users`、`auth_identities`、`auth_sessions`、`sms_codes`。
- 测评与报告：`question_bank`、`assessment_sessions`、`assessment_answers`、`score_results`、`reports`。
- 每日修行：`daily_checkins`。
- K 线心性训练：`kline_practice_bank`、`kline_practice_results`。
- 运营/日志：`lead_sync_logs`、`event_logs`。
- 修行道场：`dojo_mentors`、`dojo_mentor_bindings`、`dojo_tasks`、`dojo_task_records`、`dojo_mind_records`。

## miniprogram：微信小程序每日修行闭环

`miniprogram` 负责微信场景里的每日修行工具。它不是行情工具，而是让用户每天完成照心、训练、复盘、知行指数和用户中心同步。

### 关键目录

| 路径 | 职责 |
| --- | --- |
| `miniprogram/app.json` | 小程序页面注册与窗口配置。 |
| `miniprogram/pages` | 页面层，每个页面包含 `js/json/wxml/wxss`。 |
| `miniprogram/modules` | 业务规则与页面复用逻辑。 |
| `miniprogram/components` | 可复用组件。 |
| `miniprogram/utils` | API、存储、测评、内容工具。 |
| `miniprogram/core` | 小程序核心规则，目前包含人格到关卡映射。 |
| `miniprogram/assets/fonts` | 小程序字体资源。 |

### 小程序页面

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `miniprogram/pages/home` | 小程序首页。 |
| 照心 | `miniprogram/pages/mind` | 开盘前或当下心境照见。 |
| 测评 | `miniprogram/pages/assessment` | 小程序交易人格测评。 |
| 报告 | `miniprogram/pages/report` | 测评报告展示。 |
| 训练 | `miniprogram/pages/training` | 每日事上练。 |
| 知行指数 | `miniprogram/pages/zhixing-index` | 知行指数展示。 |
| 六大关卡 | `miniprogram/pages/stages` | 修行阶段/关卡。 |
| 知行成长 | `miniprogram/pages/zhixing-growth` | 成长趋势。 |
| 365 内容 | `miniprogram/pages/content365` | 每日心证与内容库。 |
| 复盘 | `miniprogram/pages/review` | 交易省察，不做行情复盘。 |
| 成长 | `miniprogram/pages/growth` | 修行成长树。 |
| 道场 | `miniprogram/pages/dojo` | 教练/助教/共修任务入口。 |
| 用户中心 | `miniprogram/pages/profile` | 用户状态、同步、积分、设置。 |

### 小程序模块

| 模块 | 作用 |
| --- | --- |
| `miniprogram/modules/personality` | 九型人格画像、惯性动作、心学解释和训练方向。 |
| `miniprogram/modules/mind` | 照心、心境、今日戒律和只练一事。 |
| `miniprogram/modules/practice` | 每日修行任务。 |
| `miniprogram/modules/review` | 收盘后心性省察。 |
| `miniprogram/modules/zhixing` | 知行指数、趋势、修行等级。 |
| `miniprogram/modules/stages` | 六大修行关卡。 |
| `miniprogram/modules/cultivation` | V1 成长引擎，统一输出人格映射、主修关卡、每日训练卡和知行指数。 |
| `miniprogram/modules/content365` | 365 天修行内容库。 |
| `miniprogram/modules/daily-loop` | 每日闭环编排。 |
| `miniprogram/modules/growth` | 成长树与连续修行。 |
| `miniprogram/modules/coach` | AI 观心教练预留接口。 |
| `miniprogram/modules/dojo` | 道场、教练/助教、任务和本地榜单。 |
| `miniprogram/modules/profile` | 用户中心状态。 |
| `miniprogram/modules/continuity` | 连续修行状态。 |
| `miniprogram/modules/companion` | 每日陪伴提示。 |
| `miniprogram/modules/share` | 分享逻辑。 |
| `miniprogram/modules/index` | 知行指数聚合。 |

### 小程序组件与工具

| 路径 | 作用 |
| --- | --- |
| `miniprogram/components/compliance-notice` | 合规提示。 |
| `miniprogram/components/today-insight-card` | 今日照见卡。 |
| `miniprogram/components/action-card` | 行动/训练卡。 |
| `miniprogram/components/bottom-tab-bar` | 底部导航。 |
| `miniprogram/utils/api.js` | 后端 API 封装与同步。 |
| `miniprogram/utils/store.js` | 本地状态存储。 |
| `miniprogram/utils/assessment.js` | 小程序测评辅助逻辑。 |
| `miniprogram/utils/content.js` | 内容读取与格式化。 |
| `miniprogram/core/personality-stage-map.js` | 人格到关卡映射。 |

## 业务域目录索引

### 测评

- Web 页面：`web-next/src/app/assessment-entry`、`assessment-login`、`assessment-ritual`、`assessment`、`assessment-generating`。
- Web 逻辑：`web-next/src/features/assessment/questions.ts`、`report.ts`、`behavior-mirrors.ts`、`MirrorGateway.tsx`、`MirrorRevelation.tsx`、`storage.ts`。
- 小程序页面：`miniprogram/pages/assessment`。
- 小程序逻辑：`miniprogram/utils/assessment.js`、`miniprogram/modules/personality`。
- 后端 API：`server/src/services/assessments.js`、`questionBank.js`、`scoring.js`、`server/data/question-bank.json`。
- 数据表：`question_bank`、`assessment_sessions`、`assessment_answers`、`score_results`。

### 报告

- Web 页面：`web-next/src/app/assessment-result/page.tsx`。
- Web 报告逻辑：`web-next/src/features/assessment/report.ts`。
- 小程序页面：`miniprogram/pages/report`。
- 后端生成/查询：`server/src/services/scoring.js`、`server/src/services/assessments.js`。
- 运营同步：`server/src/services/feishu.js`、`server/src/services/assistantQr.js`。
- 数据表：`reports`、`score_results`。

### 训练与复测变化

- Web 页面：`web-next/src/app/practice-change/page.tsx`、`web-next/src/app/cycle-mirror/page.tsx`。
- Web 逻辑：`web-next/src/features/assessment/practice-change.ts`、`CycleMirror.tsx`。
- 小程序页面：`miniprogram/pages/training`、`review`、`zhixing-index`、`zhixing-growth`、`stages`、`growth`。
- 小程序模块：`practice`、`review`、`zhixing`、`stages`、`cultivation`、`daily-loop`、`growth`、`continuity`。
- 后端服务：`server/src/services/habits.js`、`marketPractice.js`、`zhixingReplay.js`、`dojo.js`。
- 数据表：`daily_checkins`、`kline_practice_bank`、`kline_practice_results`、`dojo_tasks`、`dojo_task_records`、`dojo_mind_records`。

### 小程序

- 页面注册：`miniprogram/app.json`。
- 页面目录：`miniprogram/pages`。
- 模块目录：`miniprogram/modules`。
- 组件目录：`miniprogram/components`。
- 工具目录：`miniprogram/utils`。
- 后端同步：`server/src/services/miniprogramSync.js`。

### 后台与运营承接

- 当前尚未看到独立 `admin` 或后台前端目录。
- 已有后端承接能力：`server/src/services/dojo.js`、`feishu.js`、`assistantQr.js`、`auth.js`、`miniprogramSync.js`。
- 已有 API：道场导师/助教、导师看板、任务创建、飞书报告同步、助教二维码轮转。
- 相关数据表：`dojo_mentors`、`dojo_mentor_bindings`、`dojo_tasks`、`dojo_task_records`、`dojo_mind_records`、`lead_sync_logs`。

## 当前结构风险

1. 人格计算分散在 Web、小程序和后端：`web-next/src/features/assessment/report.ts`、`server/src/services/scoring.js`、`miniprogram/modules/personality`、`miniprogram/core/personality-stage-map.js` 都在表达人格相关规则。
2. 内容和文案分散在 `worldview`、`data`、`web-next`、`miniprogram/modules`、`server/src/services/scoring.js` 中，后续容易出现 Web 与小程序报告口径不一致。
3. 接口类型没有独立 contracts，Web、小程序、server 之间靠手写字段约定。
4. `server/src/routes/router.js` 已承载大量路由分发，后续继续扩张会影响维护性。
5. `server/src/services/marketPractice.js` 同时包含训练业务、A 股缓存、匿名化、评分、榜单、远程抓取等逻辑，文件职责偏重。
6. 小程序页面数量较多，规则要求页面不能各自决定成长逻辑，应继续收敛到 `cultivation`、`personality-stage-map`、`stages`、`practice`、`zhixing` 等模块。

## 后续建议的开发顺序

建议按“先闭环，再扩展”的顺序推进：

1. 首页视觉与测评入口：继续打磨 `web-next/src/components/home` 与测评入口，让用户明确这不是荐股软件，而是交易行为照见系统。
2. 测评闭环：统一 Web、小程序、后端测评题目、人格标签、评分和报告基础结构。
3. 报告页产品化：强化结果页报告卡、训练方向、合规提示和助教承接入口。
4. 训练记录：让 7 天训练、每日事上练、复盘记录形成可保存、可回看、可同步的数据闭环。
5. 复测变化：将复测前后的人格惯性、心贼、纪律动作变化可视化，但不评价投资能力。
6. 用户中心与数据绑定：统一手机号、微信小程序、Web 用户状态和敏感数据边界。
7. 助教承接后台：在已有 `dojo`、`feishu`、`assistantQr` 能力基础上做最小后台，不提前扩展复杂社区或行情功能。
8. 共享包治理：补齐 `packages/personality`、`packages/content`、`packages/contracts`，减少三端规则漂移。

## 后续最适合重构的模块

优先级建议：

1. `packages/personality`：最高优先级。把 Web、小程序、server 的人格标签、评分、报告基础字段、人格到关卡映射、训练方向统一到一个共享包。
2. `packages/contracts`：把用户、测评、报告、训练、小程序同步、道场相关请求/响应类型统一沉淀，避免三端字段漂移。
3. `packages/content`：把九型人格文案、心学解释、训练动作、合规提示、365 天内容索引统一管理。
4. `server/src/routes/router.js`：按 auth、assessment、training、dojo、integration 拆路由模块。
5. `server/src/services/marketPractice.js`：拆成 `klinePractice`、`ashareCache`、`practiceScoring`、`leaderboard` 等更小模块，并强化“不暴露股票名、代码、日期”的边界测试。
6. `web-next/src/features/assessment`：在共享人格包出现后，只保留 UI 状态和交互编排，把计算逻辑迁出。
