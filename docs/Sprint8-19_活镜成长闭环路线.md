# Sprint 8-19：心镜生命体闭环路线

## 核心定位

阳明心学交易系统不是普通测评系统，而是「以交易照人心」的活镜修行系统。

用户不是完成一次测评，而是开启一份会随真实交易、复盘、训练和时间而生长的心镜档案。

真正的产品只有一个：

```text
《照见》活镜成长系统
```

Web、小程序、App 都只是不同入口。

长期架构原则：

```text
入口可以变化。
活镜数据不能分裂。
用户看到的始终是同一棵心镜之树。
```

## 最终主线

```text
Sprint 8   入照心
↓
Sprint 9   心镜报告
↓
Sprint 10  心镜生命体
↓
Sprint 10.5 真实交易复盘
↓
Sprint 10.8 今日心证
↓
Sprint 11  心镜档案馆
↓
Sprint 11.5 心镜长卷
↓
Sprint 12  助教承接
↓
Sprint 13  分享卡片
↓
Sprint 14  全球照见层
↓
Sprint 15  多语言
↓
Sprint 16  全球案例库
↓
Sprint 17  全球心镜热力图
↓
Sprint 18  小程序陪跑
↓
Sprint 19  365 天修行系统
```

所有 Sprint 都必须服务同一条闭环。不要做成一堆独立页面。

## 端的分工

```text
网站 = 深度照见引擎
小程序 = 每日修行陪跑器
```

网站负责重体验：

- 入照心
- 九镜显影
- 心镜报告
- 循环之镜
- 心镜生命体大图
- 心镜长卷

小程序负责高频行为：

- 每日心证
- 训练打卡
- 交易截图上传
- 复盘记录
- 心镜提醒
- 助教承接

两端共享同一套核心数据：

- `User`
- `MirrorReport`
- `TradeReview`
- `LivingMirrorStats`
- `AssistantHandoff`

原则：

```text
网站让用户深度照见。
小程序让用户每天回来。
同一个用户，同一棵心镜之树。
```

## 三个产品升级

### 1. 活镜成长升级为心镜生命体

不要只给用户看曲线和百分比。

核心视觉资产定名：

```text
用户侧主名：心镜之树
精神层高阶名：良知之树
```

命名原则：

- 日常产品界面优先叫「心镜之树」，因为它属于用户，能承载“我的树在长”的感受。
- 当用户完成连续修行、复盘、落印，进入更深层表达时，可以显影为「良知之树」。
- 内部数据仍归入《照见》活镜成长系统，不单独拆成另一套产品。

增长来源：

- 完成一次今日心证，心镜之树长一点。
- 完成一次真实交易复盘，心镜之树长一点。
- 完成一次今日修行，心镜之树长一点。
- 完成一次复测并看到变化，心镜之树长一点。
- 上传一次交易截图并完成三问，心镜之树长一点。
- 连续 7 天完成训练，良知之树微微显影。

产品感受：

```text
我不是拿到一个分数。
我是在养一棵属于自己的心镜之树。
```

365 天后的目标画面：

```text
用户看到的不是曲线。
用户看到的是自己的树。
```

### 2. 循环之镜接入真实数据

循环之镜不能只是演示。

未来用户点进去，看到的是自己的循环：

```text
触发：群里都在说
↓
念头：再不上车来不及了
↓
动作：追涨
↓
结果：被套
↓
再次触发：更怕错过
```

这不是系统循环，而是「我的循环」。

来源数据：

- 入照心的第一念
- 真实交易复盘三问
- 行为镜映射
- 今日心证
- 循环复发记录

### 3. 九镜从标签升级为镜谱

不要让用户觉得：

```text
我是追涨型。
```

要让用户看到：

```text
我现在被追涨之镜影响较大。
```

所以前端表达改为「镜谱」：

```text
追涨之镜 78
焦虑之镜 71
从众之镜 63
良知之镜 41
```

`mainMirror` 和 `subMirror` 只作为当前峰值计算结果，报告展示应优先使用「镜谱」。

## 数据主轴

核心对象仍然是：

```text
LivingMirrorStats
```

但它不再只是统计表，而是「心镜生命体」的当前状态。

它接收这些输入：

- 入照心结果
- 心镜报告
- 今日心证
- 今日修行记录
- 真实交易复盘
- 个人循环复发记录
- 复测变化
- 助教承接反馈

它输出这些变化：

- 九镜镜谱
- 心贼频次
- 心镜之树阶段
- 心镜生命力
- 训练完成率
- 循环复发次数
- 良知成长值
- 近 7 天 / 30 天成长趋势

示例：

```text
刚照见：
追涨之镜 78
焦虑之镜 71
良知之镜 8

30 天后：
追涨之镜 42
焦虑之镜 36
良知之镜 51

心镜之树：
幼芽 -> 枝叶初成
```

产品感受必须是：

```text
我不是测出了一个标签。
我看见自己的心真的在变化。
```

## Sprint 8：入照心

目标：短信登录后，不进入普通问卷，而进入一次照心仪式。

页面名称：入照心。

体验结构：

```text
心月 = 良知
心湖 = 本心
九镜 = 行为惯性
```

流程：

```text
心湖平静
↓
触发场景：行情突然拉升
↓
真实念头：再不上车就来不及了
↓
湖面涟漪
↓
追涨之镜共鸣
↓
心贼后显：贪 / 急
```

九镜固定为：

- 追涨之镜
- 扛单之镜
- 幻想之镜
- 执念之镜
- 从众之镜
- 犹疑之镜
- 拖延之镜
- 焦虑之镜
- 良知之镜

输出数据：

- `mirrorSpectrum`
- `mainMirror`
- `subMirror`
- `thieves`
- `firstThought`
- `triggerScene`
- 写入 `mirror_reports`
- 初始化或更新 `living_mirror_stats`

验收：

- 不像问卷。
- 不像选择题。
- 真实念头先出现，不先给答案。
- 展示的是镜谱，不把用户钉死为某种人格。

## Sprint 9：心镜报告

目标：生成「心镜报告」，不是普通人格报告。

报告字段：

- 一句话判词
- 镜谱
- 当前主镜
- 当前副镜
- 心贼显影
- 风险雷达
- 个人典型循环
- 7 天修行处方
- 训练营建议
- 合规提示

示例：

```text
镜谱：
追涨之镜 78
从众之镜 63
焦虑之镜 52
良知之镜 12

当前主镜：追涨之镜
当前副镜：从众之镜
心贼：贪 / 急
判词：你追的不是行情，是怕被机会抛下的不安。
今日训练：没有系统信号，不主动找机会。
```

输出数据：

- 写入 `mirror_reports`
- 生成 `training_records` 的首日建议
- 写入 `living_mirror_events`

## Sprint 10：心镜生命体

目标：用户训练后，能看到自己的心镜生命体变化。

核心不是签到，不只是曲线，而是生命体成长。

指标：

- 九镜镜谱
- 心贼频次
- 心镜之树阶段
- 心镜生命力
- 训练完成率
- 循环复发次数
- 良知成长值

展示：

```text
追涨之镜 ↓ 12
焦虑之镜 ↓ 8
良知之镜 ↑ 15

心镜之树：幼芽长出第二片叶。
```

数据写入：

- `training_records`
- `living_mirror_events`
- 聚合刷新 `living_mirror_stats`

验收：

用户能看见：

```text
我的心真的在变化。
```

## Sprint 10.5：真实交易复盘 MVP

这是未来护城河，提前进入 MVP。

第一版不要追求完全自动识别行情。

MVP 流程：

```text
上传交易截图 / K线截图 / 交易记录截图
↓
记录图片、时间、用户 ID
↓
用户补充三问
  为什么买？
  为什么卖？
  当时最大的念头是什么？
↓
系统映射九镜
↓
生成复盘结果
↓
写入心镜生命体
↓
沉淀个人循环
```

映射示例：

```text
怕错过 → 追涨之镜
想翻本 → 执念之镜
不认错 → 扛单之镜
赚一点怕回吐 → 焦虑之镜
大家都在说 → 从众之镜
```

真正值钱的是用户写下来的念头。

例如：

```text
怕错过
```

这四个字比任何 K 线都值钱。

数据写入：

- `trade_reviews`
- `personal_cycles`
- `living_mirror_events`
- 聚合刷新 `living_mirror_stats`

合规：

- 第一版只做截图留存、用户自述、心镜映射、复盘记录。
- 不做行情预测。
- 不输出买卖建议。

## Sprint 10.8：今日心证

这是留存核心。

每天只给用户一件事。

结构：

```text
今日心证

今日照见：
你追的不是机会，是怕错过。

今日修行：
今天没有系统信号，不主动找机会。

完成后：
心镜生命体 +1
```

今日心证不是签到。

它是：

```text
今日照见 + 今日修行 + 心镜之树生长
```

数据写入：

- `daily_reflections`
- `training_records`
- `living_mirror_events`
- 聚合刷新 `living_mirror_stats`

## Sprint 11：心镜档案馆

用户中心改名为：心镜档案馆。

一个手机号对应一个用户。

归档内容：

- 历次照心记录
- 心镜报告
- 今日心证
- 训练记录
- 真实交易复盘
- 个人循环
- 心镜生命体
- 心镜长卷
- 复测变化
- 邀请码来源
- 助教承接状态

核心页面：

```text
我的镜谱
心镜之树
最近一次交易复盘
我的重复循环
今日心证
七日后复测
```

## Sprint 11.5：心镜长卷

目标：把用户所有成长记录自动生成一卷可回看的修行长卷。

不是时间线列表，而是「人生修行长卷」。

内容节点：

```text
Day 1   第一次照见
Day 7   第一次复测
Day 37  第一次循环减弱
Day 88  良知之镜开始显影
Day 176 心镜之树枝叶渐成
Day 365 此心光明
```

来源：

- 入照心
- 心镜报告
- 今日心证
- 真实交易复盘
- 循环之镜
- 今日修行
- 复测变化

数据写入：

- `mirror_scroll_entries`

验收：

- 用户愿意截图。
- 用户看到的不是功能记录，而是自己的修行痕迹。

## Sprint 12：助教承接

触发条件：

- 完成心镜报告
- 完成真实交易复盘
- 某面镜连续增强
- 某个个人循环反复出现

助教摘要字段：

- 手机尾号或脱敏手机号
- 最近镜谱
- 当前主镜
- 当前副镜
- 高频心贼
- 最近交易复盘摘要
- 个人循环摘要
- 当前风险标签
- 建议训练动作
- 训练营建议
- 助教话术建议
- 合规提醒

话术示例：

```text
你最近最明显的是追涨之镜，背后是怕错过。
今天先不谈行情，只练一件事：
没有系统信号，不主动找机会。
```

合规：

- 助教承接只围绕训练、复盘、觉察。
- 不做个股建议。
- 不讨论收益承诺。

## Sprint 13：分享卡片

分享不是低级裂变。

分享内容：

- 今日心证
- 我的镜谱
- 一句判词
- 今日修行
- 心镜之树阶段
- 邀请码来源统计

禁止：

- 收益展示
- 股票代码
- 买卖建议
- 暗示带单

## Sprint 14：全球照见层

用户贡献的不是帖子，而是交易反应。

不要做论坛。

不要帖子。

不要评论区。

做：

```text
全球一念
```

匿名字段：

- 今日一念
- 匿名镜谱
- 匿名心贼
- 匿名交易场景
- 国家 / 语言
- 时间

展示：

```text
今日全球最多的一念：怕错过 37%
今日全球最活跃心镜：焦虑之镜
今日全球最多心贼：惧
```

必须注明：

```text
仅为交易心理觉察数据，不构成投资建议。
```

## Sprint 15：多语言

预留：

- 中文
- 英文
- 繁中
- 日文
- 韩文
- 西语

原则：

- 核心世界观人工翻译。
- 功能文案后续补。
- 不让机器随意改写心学母版。

## Sprint 16：全球案例库

匿名沉淀：

- 不同市场
- 不同国家
- 不同交易者
- 情绪反应
- 行为镜像
- 个人循环类型

只记录交易心理与行为模式。

不荐股，不预测行情。

## Sprint 17：全球心镜热力图

展示全球交易心理分布。

示例：

```text
A 股用户：追涨之镜、扛单之镜高频
美股用户：焦虑之镜、执念之镜高频
加密用户：执念之镜、追涨之镜高频
```

必须注明：

```text
仅为交易心理觉察数据，不构成投资建议。
```

## Sprint 18：小程序陪跑

小程序定位：每日修行陪跑器。

小程序负责：

- 每日心证
- 训练打卡
- 交易截图上传
- 复盘记录
- 心镜生命体提醒
- 助教承接
- 订阅提醒

网站定位：深度照见引擎。

网站负责：

- 入照心仪式
- 九镜动画
- 心镜报告
- 心镜生命体大图
- 心镜长卷
- 长周期复盘分析

两端共享核心数据：

- `User`
- `MirrorReport`
- `TradeReview`
- `LivingMirrorStats`
- `AssistantHandoff`

## Sprint 19：365 天修行系统

App 暂不优先。

Sprint 19 先定义为 365 天修行系统，而不是正式 App。

目标：

```text
每天一证
每周一复盘
每月一回看
每季一复测
一年见一棵心镜之树
```

功能：

- 365 天修行日历
- 今日心证连续性
- 每周复盘汇总
- 每月心镜长卷节点
- 心镜之树阶段变化
- 良知之镜成长记录

未来 App 才是这套 365 天系统的长期陪跑器。

## 统一数据对象

### User

- `id`
- `phone`
- `createdAt`
- `inviteCode`
- `channel`

### MirrorReport

- `id`
- `userId`
- `mirrorSpectrum`
- `mainMirror`
- `subMirror`
- `thieves`
- `verdict`
- `riskRadar`
- `personalCycle`
- `sevenDayPrescription`
- `campSuggestion`
- `createdAt`

### TradeReview

- `id`
- `userId`
- `imageUrl`
- `tradeDate`
- `symbolMasked`
- `marketType`
- `buyReason`
- `sellReason`
- `strongestThought`
- `detectedMirror`
- `detectedThieves`
- `behaviorTags`
- `personalCycle`
- `reviewText`
- `createdAt`

### PersonalCycle

- `id`
- `userId`
- `mirror`
- `triggerText`
- `thoughtText`
- `actionText`
- `resultText`
- `recurrenceText`
- `thieves`
- `evidenceReviewId`
- `occurrenceCount`
- `lastOccurredAt`

### DailyReflection

- `id`
- `userId`
- `date`
- `mirror`
- `thieves`
- `todayInsight`
- `practiceAction`
- `completed`
- `completedAt`

### TrainingRecord

- `id`
- `userId`
- `date`
- `mirror`
- `action`
- `completed`
- `note`

### LivingMirrorStats

- `userId`
- `mirrorSpectrum`
- `mirrorScores`
- `thiefCounts`
- `lifeFormType`
- `lifeStage`
- `vitalityScore`
- `treeState`
- `growthTrend`
- `trainingCompletionRate`
- `cycleRelapseCount`
- `conscienceGrowth`
- `lastUpdated`

### MirrorScrollEntry

- `id`
- `userId`
- `dayIndex`
- `entryDate`
- `entryType`
- `title`
- `summary`
- `mirrorSnapshot`
- `treeSnapshot`
- `sourceType`
- `sourceId`
- `createdAt`

### AssistantHandoff

- `id`
- `userId`
- `phoneMasked`
- `mirrorSpectrum`
- `mainMirror`
- `subMirror`
- `riskTags`
- `personalCycleSummary`
- `recentReviewSummary`
- `suggestedScript`
- `feishuSynced`
- `createdAt`

## 统一 API 边界

网页、小程序、后续 App 不直接各自写本地状态，都通过统一后端 API 写入心镜生命体数据。

### 入照心 / 心镜报告

```text
POST /api/v1/mirror-sessions/start
POST /api/v1/mirror-sessions/reveal
POST /api/v1/mirror-reports
GET  /api/v1/mirror-reports/:id
GET  /api/v1/users/:userId/mirror-reports
```

### 心镜生命体

```text
GET  /api/v1/users/:userId/living-mirror
GET  /api/v1/users/:userId/living-mirror/events
POST /api/v1/users/:userId/living-mirror/events
GET  /api/v1/users/:userId/living-mirror/tree
```

### 今日心证 / 今日修行

```text
GET  /api/v1/users/:userId/daily-reflection/today
POST /api/v1/users/:userId/daily-reflections
POST /api/v1/users/:userId/daily-reflections/:id/complete
GET  /api/v1/users/:userId/training/today
POST /api/v1/users/:userId/training-records
GET  /api/v1/users/:userId/training-records
```

### 真实交易复盘 MVP

```text
POST /api/v1/users/:userId/trade-reviews/upload
POST /api/v1/users/:userId/trade-reviews
GET  /api/v1/users/:userId/trade-reviews
GET  /api/v1/trade-reviews/:id
GET  /api/v1/users/:userId/personal-cycles
GET  /api/v1/personal-cycles/:id
```

第一版 `trade-reviews` 请求必须包含用户自述三问：

```json
{
  "buyReason": "为什么买",
  "sellReason": "为什么卖",
  "strongestThought": "当时最大的念头"
}
```

### 心镜档案馆 / 心镜长卷

```text
GET /api/v1/users/:userId/mirror-archive
GET /api/v1/users/:userId/mirror-scroll
POST /api/v1/users/:userId/mirror-scroll/entries
```

### 助教承接

```text
POST /api/v1/assistant-handoffs
POST /api/v1/assistant-handoffs/:id/feishu-sync
GET  /api/v1/admin/assistant-handoffs
```

### 分享与全球照见层

```text
POST /api/v1/share-cards
GET  /api/v1/share-cards/:publicToken
POST /api/v1/global-reflections
GET  /api/v1/global-reflections/summary
```

API 合规规则：

- 前端不传模型密钥。
- 截图复盘不输出买卖建议。
- 分享卡不展示收益、股票代码、账户金额。
- 全球照见层只展示匿名心理分布。
- 助教承接只同步脱敏手机号和训练建议。

## 核心验收标准

1. 用户不是完成一次测评，而是开启一个心镜生命体。
2. 每次训练、复盘、上传截图、今日心证，都能影响心镜之树。
3. 循环之镜必须展示用户自己的循环，不是系统演示循环。
4. 九镜用镜谱表达，不把用户固化成标签。
5. 网页、小程序、后续 App 看到的是同一套用户数据。
6. 小程序负责高频记录，网页负责深度照见。
7. 所有内容避免投资建议、收益承诺、荐股、带单。
8. 产品核心感受：

```text
以交易照人心。
以复盘照行为。
以训练照变化。
以心镜照成长。
```
