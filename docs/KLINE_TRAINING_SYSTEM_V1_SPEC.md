# K线训练系统 V1 技术产品规格书

版本：V1.0 draft
日期：2026-06-25
适用范围：小程序、Web、后端共用的 K 线训练系统

## 0. 架构硬边界

K线训练系统必须以现有数据结构为主。V1 / V2 都不得另起一套孤立 schema，否则小程序、Web、H5 复盘、活镜成长会断链。

本规格只作为功能落地护栏，不作为重建工程架构的理由。下一步优先在现有小程序页面、现有模块、现有后端接口上补功能闭环。

硬原则：

- `klineMindRecord` 是 K 线训练主记录。
- `oneThoughtEvent` 是训练进入心镜事件模型的桥。
- `tradeReviewRecord` 是训练进入复盘报告的桥。
- `training7View` 是训练进入 7 天事上练进度的桥。
- `livingMirror` 是训练进入成长画像的桥。
- `data-binding-adapter` 是小程序 / Web / 后端共用语义的适配层。
- `KlineTrainingSession` 只作为运行态投影，不是新的权威主数据。

V1 / V2 允许新增字段，但只能作为兼容扩展：

- `trainingSessionId`
- `chartZoomKey`
- `simulationMode`
- `coachHints`
- `emotionBadges`
- `riskHints`
- `sliceSeed`
- `decisionTimeline`
- `emotionTimeline`

禁止替换以下现有闭环字段：

- `selectedCandleKey`
- `firstReaction`
- `boundaryChoice`
- `insightLine`
- `oneThoughtEvent`
- `linkedOneThoughtEventId`

## 1. 产品边界

### 1.1 产品定位

K线训练系统 V1 是“交易行为模拟 + 心智识别 + 纪律重塑 + 活镜成长”的训练平台，不是行情工具、投顾工具或实盘交易系统。

系统目标不是帮助用户“看对行情”，而是训练用户在历史 K 线情境中照见第一反应、识别交易行为偏差、复盘知行偏离，并把训练结果写入现有心镜闭环。

核心一句话：

> 用真实历史 K 线训练真实反应，但只评价行为纪律，不评价行情对错。

### 1.2 必须坚持的边界

- 不提供买卖建议。
- 不预测行情。
- 不输出“推荐买入 / 推荐卖出 / 信号 / 抄底 / 逃顶”等表达。
- 不连接券商账户、真实下单、撤单、持仓、资金。
- 不把训练盈亏包装成真实收益能力。
- 不暴露真实股票名称、行业、新闻、日期，默认进入盲测。
- AI Coach 只提示“行为风险 / 情绪风险 / 纪律偏离”，不提示市场方向。
- 训练结果只进入心镜、复盘、训练记录和成长画像，不进入任何投资决策链路。

### 1.3 V1 不做的事

- 不全量复刻任何竞品 App 的内容、文案、视觉或交互。
- 不做完整交易软件。
- 不做实时行情。
- 不做选股、荐股、策略推荐。
- 不做实盘交易撮合。
- 不做复杂社区、排行榜和商业订阅闭环。
- 不重建现有数据体系。

V1 的原则是：对标能力，超越体验；复用现有数据结构，新增训练 Session 语义层。

## 2. 对标能力覆盖矩阵

本系统对标的是“交易行为训练模拟器 + 盲测复盘系统”的能力，不复制竞品内容、视觉、文案或具体表达。

状态说明：

- `已具备`：当前代码或现有链路已有基础能力。
- `V1 必补`：当前版本要补齐，否则不像训练器。
- `P2/P3`：进入下一阶段训练体验或复盘增强。
- `后置`：不影响当前闭环，后续根据合规、数据与体验再做。

| 序号 | 对标能力 | 我们的落点 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| 1 | K线盲区训练：隐藏名称、隐藏时间、逐根推进、强制决策 | `kline-history/slice` + `klineMindRecord` + runtime | V1 必补 | 盲测、逐根推进、BUY / SELL / HOLD 是训练器核心 |
| 2 | 多市场数据池：A股、指数、期货、ETF、可转债 | `marketKey` / Market Context Filter | P2/P3 | V1 先 A股；指数 / ETF 第二批；期货和可转债后置 |
| 3 | 多周期 K线：日线、5m、15m、60m、分时 | `timeframeKey` / Training Mode Parameter | P2 | 当前已有 `1d / 60m / 30m`；需补 `5m / 15m`，分时后置 |
| 4 | 双盲训练 | blind mode | V1 必补 | 默认不显示股票、日期、行业、牛熊背景 |
| 5 | 涨停训练模式 | A股强触发训练场 | P2 | 作为“爆竹 K线 / 强触发片段”，训练急念、追念、证明欲 |
| 6 | 指数训练 | Market Context Filter | P2 | 训练市场节奏，不做指数预测 |
| 7 | 期货训练模式 | 高波动 / 多空模拟 | 后置 | 合规与复杂度更高，不能影响 V1 主闭环 |
| 8 | 模拟交易执行：开仓、平仓、多空、仓位 | `simulated-decision-engine` | V1 基础，P2/P3 完整 | V1 先 BUY / SELL / HOLD；P2/P3 补开平仓、仓位 |
| 9 | 自动止损止盈 | 纪律触发器 | P2/P3 | 只作为纪律训练，不输出操作建议 |
| 10 | 分仓系统 | 模拟仓位管理 | P3 | 用于训练非一次性下注思维 |
| 11 | 技术指标：MACD、RSI、KDJ、BOLL、EMA、ATR、CCI | Indicator Layer | P2/P3 | V1 先 VOL / MA / MACD / BOLL；其余后补 |
| 12 | 画线工具 | 结构标记能力 | P3 / Web 优先 | 趋势线、通道、支撑阻力更适合 Web 深度训练 |
| 13 | 筹码分布 | 压力 / 支撑区理解 | 后置 | 容易金融工具化，需谨慎表达 |
| 14 | 自动盈亏计算 | 模拟 PnL | V1 必补 | 用于行为量化，不承诺收益 |
| 15 | 训练结果复盘 | `tradeReviewRecord` / report | P3 | 买卖点、持仓路径、错误节点 |
| 16 | 训练成绩体系 | 纪律分 / 稳定性 / 一致性 | P3/P4 | 以行为指标为主，弱化收益排名 |
| 17 | PK 对战 | 同片段多人训练 | 后置 | 当前不做社区和竞争机制 |
| 18 | 训练记录系统 | `klineMindRecord` / `data-binding` | V1 必补 | 历史训练、行为轨迹、复训入口 |
| 19 | 收藏与结构复训 | `sliceSeed` / replay token | P3 | 可收藏片段并重复训练同一结构 |
| 20 | 个股笔记 / 延迟验证 | `insightLine` / report extension | P3 | 用于预判校准，但不变成荐股笔记 |

### 2.1 当前最小对标包

为了不散，当前必须优先完成 8 个能力：

1. 双盲训练。
2. 约 150 根真实历史 K 线训练窗口。
3. 逐根推进。
4. BUY / SELL / HOLD 模拟决策。
5. 基础仓位、模拟盈亏、最大回撤。
6. 日线 / 60m / 30m，后续补 5m / 15m。
7. VOL / MA / MACD / BOLL。
8. 训练复盘：买卖点、情绪点、错误类型、心法反馈。

这 8 个能力优先级高于额外 UI 美化、PK、社区、商业化、复杂报告包装。

## 3. 模块架构

### 3.1 总体架构

K线训练系统 V1 按“现有闭环优先、Session 运行态增强、Hook 注入”的方式设计。

```text
K线观心入口
  -> AI Mind Trigger
  -> Blind Trade Entry
  -> Training Session 初始化
  -> Historical Kline Slice
  -> Step Replay Simulation
  -> Decision Checkpoint
  -> Emotion / Risk / Coach Hooks
  -> KlineMindRecord
  -> OneThoughtEvent
  -> TradeReviewRecord
  -> LivingMirror Growth
```

### 3.2 六个核心域

K线训练系统固定拆成 6 个核心域。后续实现、目录、测试、接口命名都应围绕这 6 个域展开，不再使用泛化的“交易工具 / 行情工具”命名。

这些核心域是功能职责，不要求第一阶段拆成 6 个新目录或 6 套新服务。第一阶段优先复用现有：

- `miniprogram/pages/kline-mind/index`
- `miniprogram/modules/kline-mind/index`
- `miniprogram/utils/api.js`
- `miniprogram/utils/store.js`
- `miniprogram/utils/data-binding-adapter.js`
- `server/src/services/historicalKline.js`
- `server/src/services/dataBinding.js`

| 核心域 | 所属端 | 责任 |
| --- | --- | --- |
| `market-slice-engine` | 后端 | 从真实历史数据中抽取匿名 OHLCV 片段，只输出脱敏 K 线与训练元信息 |
| `blind-simulation-engine` | 小程序 / Web / 后端可复用 | 管理逐根推进、当前 index、强制决策节点、回放状态 |
| `simulated-decision-engine` | 小程序 / Web / 后端可复用 | 只做模拟 BUY / SELL / HOLD、仓位、浮盈亏、最大回撤，不碰真实交易 |
| `emotion-engine` | 共用规则层 | 根据行为识别 GREED / FEAR / REVENGE / IMPULSE / HESITATION，并映射阳明心法 |
| `review-engine` | 小程序 / Web / 后端 | 生成复盘：追涨点、恐惧点、无计划交易点、知行偏差 |
| `growth-engine` | 后端 / Web / 小程序读取 | 生成成长画像：纪律分、一致性、稳定性、人格演化曲线 |

### 3.3 入口层与增强层

入口层保留当前 K线观心页面结构，但语义升级：

| 入口模块 | V1 / V2 语义 | 说明 |
| --- | --- | --- |
| 真实历史片段 | Blind Trade Entry | K线训练唯一主入口，不再只是看图和记录 |
| 日线 / 60m / 30m | Training Mode Parameter | 影响训练目标与模拟节奏，不只是 UI tab |
| A股 | Market Context Filter | 控制训练环境难度、波动性、制度约束 |

非侵入式增强层作为 Hook 外挂存在，不改写主结构：

| 增强层 | 所属端 | 责任 |
| --- | --- | --- |
| AI Coach Overlay | 小程序 / Web | 非侵入式实时点评浮层，只点评行为与心态 |
| Emotion Badge | 小程序 / Web | 展示当前情绪状态，不抢主操作 |
| Risk Hint Bar | 小程序 / Web | 展示当下风险提醒，不给买卖方向 |

### 3.4 非侵入式 Hook

V1 新增能力必须作为外挂增强层，不破坏原有页面主结构。

| Hook | 触发时机 | 输出 |
| --- | --- | --- |
| `onSessionStart` | 点击“练 / 开始盲练” | 创建训练 Session、加载 K 线切片、进入盲测 |
| `onNextCandle` | 每推进一根 K 线 | 更新可见窗口、风险提示、是否触发决策 |
| `onTradeExecute` | 用户选择 BUY / SELL / HOLD | 写入模拟决策、计算纪律偏离、更新情绪标签 |
| `onEmotionTag` | 系统识别或用户补充情绪 | 写入情绪轨迹 |
| `onSessionComplete` | 训练结束 | 写入 `klineMindRecord`、`oneThoughtEvent`、`tradeReviewRecord`、成长画像 |

所有 Hook 的最终落点仍是现有事件链：

```text
klineMindRecord
  -> oneThoughtEvent
  -> tradeReviewRecord
  -> livingMirrorGrowth
```

Hook 不允许直接绕过 `data-binding-adapter` 写入一套小程序私有训练结果。

## 4. API 设计

### 4.1 现有 API 继续作为基础

V1 优先复用当前已存在的接口。

| API | 用途 | 状态 |
| --- | --- | --- |
| `GET /api/v1/kline-history/slice` | 获取真实历史 K 线匿名切片 | 已存在，V1 继续使用 |
| `GET /api/v1/kline-history/catalog` | 历史 K 线数据目录 | 已存在 |
| `GET /api/v1/kline-history/instruments` | 可用标的目录，前端默认不暴露真实名称 | 已存在 |
| `GET /api/v1/kline-history/rules` | 市场与周期规则 | 已存在 |
| `GET /api/v1/kline-history/reveal` | 管理或复盘时揭示来源 | 已存在，用户端默认不用 |
| `POST /api/v1/data-binding/users/:user_id/kline-records` | 同步 K 线训练记录 | 已存在 |
| `POST /api/v1/data-binding/users/:user_id/trade-reviews` | 同步真实复盘记录 | 已存在 |
| `POST /api/v1/users/:user_id/miniprogram-state` | 小程序状态同步 | 已存在 |

### 4.2 V1 新增建议 API

新增接口统一放在 `/api/v1/kline-training/...` 下，避免使用 `/api/trade/...` 这类容易误解为真实交易的命名。

这些接口只负责训练运行态，不替代现有同步与绑定：

```text
训练运行态：/api/v1/kline-training/session...
历史切片：  /api/v1/kline-history/slice
闭环落库：  /api/v1/data-binding/users/:user_id/kline-records
复盘落库：  /api/v1/data-binding/users/:user_id/trade-reviews
```

#### POST `/api/v1/kline-training/session`

创建一次训练 Session。

请求：

```json
{
  "userId": "u_xxx",
  "anonymousId": "anon_xxx",
  "marketKey": "cn_equity",
  "timeframeKey": "1d",
  "trainingMode": "trend",
  "chartZoomKey": "standard",
  "windowSize": 120,
  "blind": true,
  "seed": "optional-seed",
  "source": "miniprogram"
}
```

响应：

```json
{
  "ok": true,
  "session": {
    "id": "kts_xxx",
    "mode": "blind_step_replay",
    "marketKey": "cn_equity",
    "timeframeKey": "1d",
    "trainingMode": "trend",
    "chartZoomKey": "standard",
    "currentIndex": 0,
    "visibleWindowSize": 80,
    "totalCandles": 180,
    "mustDecide": false,
    "sliceRef": {
      "source": "server_cache",
      "sliceToken": "token_xxx"
    }
  }
}
```

#### POST `/api/v1/kline-training/session/:session_id/next`

逐根推进。

请求：

```json
{
  "currentIndex": 23,
  "lastDecisionId": "optional-decision-id"
}
```

响应：

```json
{
  "ok": true,
  "currentIndex": 24,
  "visibleRange": {
    "start": 0,
    "end": 24
  },
  "mustDecide": true,
  "decisionPrompt": "这一刻，你是看见事实，还是想用行动缓解不安？",
  "emotionBadge": {
    "type": "HESITATION",
    "label": "犹疑"
  },
  "riskHint": {
    "level": "medium",
    "text": "当前只记录第一反应，不急于证明。"
  }
}
```

#### POST `/api/v1/kline-training/session/:session_id/decision`

写入一次模拟决策。

请求：

```json
{
  "index": 24,
  "action": "HOLD",
  "positionSize": 0,
  "selectedCandleKey": "bar-024",
  "reactionDirection": "observe",
  "firstReaction": "想等确认后再动",
  "boundaryChoice": "先停十秒"
}
```

响应：

```json
{
  "ok": true,
  "decision": {
    "id": "ktd_xxx",
    "action": "HOLD",
    "index": 24,
    "emotionTags": ["HESITATION"],
    "disciplineDelta": 3,
    "pnlSnapshot": {
      "unrealizedPnl": 0,
      "maxDrawdown": 0
    }
  },
  "coachOverlay": {
    "title": "知而先停",
    "text": "你没有急着用动作消除不安，这一次先守住了边界。"
  }
}
```

#### POST `/api/v1/kline-training/session/:session_id/emotion`

补充情绪记录。

请求：

```json
{
  "index": 24,
  "type": "FEAR",
  "triggerContext": "K线突然放大时想退出",
  "source": "user"
}
```

#### POST `/api/v1/kline-training/session/:session_id/complete`

结束训练并生成闭环记录。

响应：

```json
{
  "ok": true,
  "klineRecordId": "kline-mind-xxx",
  "oneThoughtEventId": "one-thought-kline-xxx",
  "tradeReviewId": "review-xxx",
  "reportEntry": {
    "label": "查看心镜报告",
    "path": "/pages/report/index?source=kline_training"
  }
}
```

#### GET `/api/v1/kline-training/session/:session_id/review`

读取训练复盘。

响应包含：

- 决策轨迹
- 情绪轨迹
- 纪律偏离
- 知行一致指数
- 心法提示
- 可进入 H5 / Web 心镜报告的入口

### 4.3 K 线切片参数规范

`GET /api/v1/kline-history/slice` V1 参数建议：

| 参数 | 示例 | 说明 |
| --- | --- | --- |
| `market` | `cn_equity` | 市场环境 |
| `timeframe` | `1d` / `60m` / `30m` | 周期参数 |
| `window` | `120` | 抽取根数 |
| `blind` | `1` | 是否剥离真实信息 |
| `mode` | `step_replay` | 逐根训练模式 |
| `personality_type` | `焦虑型` | 可用于训练处方，不影响行情 |
| `gate` | `shi_shang_mo` | 心学关卡 |
| `seed` | `scene-fast-001` | 可复现训练片段 |

## 5. 数据 Schema

### 5.1 现有主数据结构

V1 必须继续以现有结构为主，不替换、不删字段。

#### KlineMindRecord

现有关键字段：

```ts
type KlineMindRecord = {
  day: number;
  scenarioId: string;
  scenarioTitle: string;
  marketKey: string;
  marketName: string;
  timeframeKey: string;
  chartZoomKey: string;
  mode: string;
  dataSource: string;
  klineSource: string;
  sliceSource: string;
  serverSliceStatus: string;
  serverSliceError: string;
  symbol: string;
  dataStart: string;
  dataEnd: string;
  personalityType: string;
  secondaryType: string;
  stageKey: string;
  stageName: string;
  selectedCandleKey: string;
  selectedCandleLabel: string;
  reactionDirection: string;
  firstReaction: string;
  bodySignal: string;
  boundaryChoice: string;
  insightLine: string;
  prescriptionTitle: string;
  completed: boolean;
  score: number;
  updatedAt: number;
  oneThoughtEvent?: OneThoughtEvent;
};
```

必须保留的核心字段：

- `selectedCandleKey`
- `firstReaction`
- `boundaryChoice`
- `insightLine`
- `oneThoughtEvent`
- `klineSource`
- `serverSliceStatus`

#### OneThoughtEvent

```ts
type OneThoughtEvent = {
  eventId: string;
  localRecordId: string;
  eventType: "kline_training";
  userId?: string;
  anonymousId?: string;
  openid?: string;
  unionid?: string;
  market: string;
  symbol: string;
  timeframe: string;
  mode: string;
  klineSource: string;
  serverSliceStatus: string;
  serverSliceError: string;
  firstThought: string;
  reactionChoice: string;
  boundaryState: string;
  mirrorType: string;
  relatedMirror: string;
  clientSyncStatus: string;
  createdAt: string | number;
  completedAt: string | number;
  updatedAt: string | number;
};
```

#### TradeReviewRecord

K线训练完成后，可生成一条复盘型记录，继续走现有真实复盘与报告入口。字段保持现有 `data-binding` 可接受结构：

- `id`
- `reviewId`
- `tradeDate`
- `symbol` / `symbolMasked`
- `marketType`
- `timeframeKey`
- `strongestThought`
- `wasPlanned`
- `hadExitRule`
- `oneThoughtEvent`
- `source`

### 5.2 V1 新增 Session 字段

以下字段作为新增增强层，优先添加到 `KlineMindRecord` / `oneThoughtEvent` / `tradeReviewRecord` 的扩展区，不替换现有字段。

第一阶段原则：

- 小程序本地仍保存 `klineMindRecord`。
- Web / H5 仍读取 `data-binding` 后的 K 线记录和复盘记录。
- 后端可保存 `KlineTrainingSession` 运行态，但它只是投影，不是最终成长画像来源。
- 最终成长画像只认 `oneThoughtEvent -> tradeReviewRecord -> livingMirrorGrowth`。

建议在 `KlineMindRecord` 上增加以下可选字段：

```ts
type KlineMindRecordV2Extension = {
  trainingSessionId?: string;
  simulationMode?: "blind_step_replay";
  chartZoomKey?: "wide" | "standard" | "focus";
  sliceSeed?: string;
  coachHints?: CoachHint[];
  emotionBadges?: EmotionBadge[];
  riskHints?: RiskHint[];
  decisionTimeline?: KlineTrainingDecision[];
  emotionTimeline?: EmotionLog[];
};
```

```ts
type KlineTrainingSession = {
  id: string;
  userId?: string;
  anonymousId?: string;
  source: "miniprogram" | "web";
  mode: "blind_step_replay";
  marketKey: string;
  timeframeKey: "1d" | "60m" | "30m";
  trainingMode: "trend" | "swing" | "emotion";
  chartZoomKey: "wide" | "standard" | "focus";
  sliceToken?: string;
  symbolMasked?: string;
  startIndex: number;
  endIndex: number;
  currentIndex: number;
  visibleWindowSize: number;
  status: "created" | "running" | "completed" | "abandoned";
  createdAt: string;
  completedAt?: string;
};
```

```ts
type KlineTrainingDecision = {
  id: string;
  sessionId: string;
  index: number;
  action: "BUY" | "SELL" | "HOLD";
  price?: number;
  positionSize?: number;
  selectedCandleKey: string;
  reactionDirection?: "act" | "avoid" | "observe";
  firstReaction?: string;
  boundaryChoice?: string;
  pnlSnapshot?: PnlSnapshot;
  emotionTags: EmotionType[];
  createdAt: string;
};
```

```ts
type EmotionLog = {
  id: string;
  sessionId: string;
  index: number;
  type: "FEAR" | "GREED" | "REVENGE" | "IMPULSE" | "HESITATION" | "OVERCONFIDENCE";
  triggerContext: string;
  source: "system" | "user" | "coach";
  createdAt: string;
};
```

```ts
type GrowthProfileSnapshot = {
  userId: string;
  disciplineScore: number;
  consistencyIndex: number;
  behaviorType: "冲动型" | "追涨型" | "恐惧型" | "复仇型" | "稳健型";
  evolutionCurve: Array<{
    date: string;
    disciplineScore: number;
    consistencyIndex: number;
    dominantEmotion: string;
  }>;
};
```

### 5.3 数据库表建议

现有表：

- `kline_practice_bank`
- `kline_practice_results`

V1 第一阶段不要求新增数据库主表。优先通过现有 `data-binding` 与小程序状态保存训练结果。

如果后端需要保存逐根推进中的运行态，可新增“投影表 / runtime 表”，但必须满足：

- 不作为心镜成长的唯一来源。
- 不替代 `klineMindRecord`。
- 不替代 `oneThoughtEvent`。
- 不替代 `tradeReviewRecord`。
- 不绕过 `data-binding-adapter`。
- 表中只保存训练运行态和可重放索引，不保存敏感身份、真实账户或真实交易。

可选投影表：

```sql
CREATE TABLE kline_training_sessions (
  id UUID PRIMARY KEY,
  user_id UUID,
  anonymous_id VARCHAR(120),
  source VARCHAR(40) NOT NULL,
  mode VARCHAR(40) NOT NULL,
  market_key VARCHAR(40) NOT NULL,
  timeframe_key VARCHAR(20) NOT NULL,
  training_mode VARCHAR(40) NOT NULL,
  chart_zoom_key VARCHAR(40) NOT NULL,
  slice_token TEXT,
  symbol_masked VARCHAR(80),
  start_index INTEGER NOT NULL,
  end_index INTEGER NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  visible_window_size INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

```sql
CREATE TABLE kline_training_decisions (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES kline_training_sessions(id),
  candle_index INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL,
  price NUMERIC(18, 6),
  position_size NUMERIC(10, 4),
  selected_candle_key VARCHAR(80),
  reaction_direction VARCHAR(40),
  first_reaction TEXT,
  boundary_choice TEXT,
  pnl_snapshot JSONB,
  emotion_tags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE kline_training_emotion_logs (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES kline_training_sessions(id),
  candle_index INTEGER NOT NULL,
  type VARCHAR(40) NOT NULL,
  trigger_context TEXT,
  source VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 6. 前端页面流

### 6.1 K线观心 / 训练入口页

保留原页面布局，但把模块语义升级为训练系统入口层。

| 当前模块 | V1 语义 | 说明 |
| --- | --- | --- |
| 今日观心 | AI Mind Trigger | 输出今日最可能出现的交易行为风险和心智建议 |
| 真实历史片段 | Blind Trade Entry | 唯一主入口，点击进入盲测逐根训练 |
| 日线 / 60m / 30m | Training Mode Parameter | 周期影响训练模式，不只是 UI 切换 |
| A股标签 | Market Context Filter | 控制市场环境、波动难度和训练语境 |
| 练按钮 | Session Start | 初始化 Session、加载切片、进入 blind mode、启动 AI Coach |

### 6.2 训练模式映射

| 周期 | 训练语义 | 行为重点 |
| --- | --- | --- |
| 日线 | 趋势训练 | 是否能守住计划，不被单根波动牵走 |
| 60m | 波段训练 | 是否能在节奏变化中保持边界 |
| 30m | 情绪训练 | 是否能识别急、贪、怕、证明欲 |

这些周期不是视觉 tab，而是进入 `blind-simulation-engine` 与 `emotion-engine` 的训练参数：

- 日线：降低噪声，训练趋势耐心与计划守持。
- 60m：增加节奏变化，训练波段边界与动作克制。
- 30m：提高触发频率，训练冲动、急躁、证明欲的识别。

### 6.3 页面流

```text
进入 K线观心
  -> 读取测评 / 今日训练 / 历史 K线记录
  -> AI Mind Trigger 输出今日行为风险
  -> 用户选择市场环境与周期模式
  -> 点击 Blind Trade Entry
  -> onSessionStart
  -> 创建训练 Session
  -> 加载匿名历史 K 线 slice
  -> 进入盲测逐根推进
  -> 每次 Next 显示下一根 K 线
  -> 每 5-10 根触发一次决策
  -> 用户选择 BUY / SELL / HOLD
  -> Emotion Engine 打标签
  -> AI Coach Overlay 给行为点评
  -> 完成训练
  -> 生成 KlineMindRecord
  -> 生成 OneThoughtEvent
  -> 生成 TradeReviewRecord
  -> 出现“查看心镜报告”
  -> 活镜成长页更新沉淀
```

### 6.4 盲测训练界面

V1 界面原则：

- 横屏优先，竖屏可用。
- 默认盲测，不显示股票名、代码、日期、行业。
- 一屏展示足够多 K 线，支持缩放：
  - `wide`：更多 K 线，适合看结构。
  - `standard`：默认训练。
  - `focus`：少量 K 线，适合看当下反应。
- 支持日线 / 60m / 30m。
- 支持 VOL 基础量能展示。
- MA / MACD / BOLL 等指标作为 V1.1 增强，不抢 V1 主闭环。

### 6.5 交互约束

- 每屏只有一个主动作。
- “下一根”是训练中的主动作。
- 决策弹窗出现时，必须先完成 BUY / SELL / HOLD 才能继续。
- AI Coach 不阻断用户操作，只在用户决策后出现。
- Emotion Badge 和 Risk Hint Bar 必须轻量，不遮挡 K 线。

## 7. 小程序 / Web / 后端共用关系

### 7.1 共用原则

三端必须共用同一套语义，不允许小程序、Web、后端各自发明一套 K 线训练语言。

```text
packages/contracts 或等价契约
  -> KlineTrainingSession
  -> KlineTrainingDecision
  -> EmotionLog
  -> KlineMindRecord
  -> OneThoughtEvent

packages/content 或等价内容库
  -> 心法反馈
  -> 情绪标签文案
  -> 风险提示文案

后端 API
  -> kline-history/slice
  -> kline-training/session
  -> data-binding/kline-records

小程序 / Web
  -> 同一 API
  -> 同一字段
  -> 不同呈现密度
```

### 7.2 小程序职责

- 高频入口。
- 轻量盲练。
- 离线优先保存。
- 本地 fallback。
- 记录第一念、边界、情绪与训练完成状态。
- 同步到 `data-binding`。

### 7.3 Web 职责

- 深度复盘。
- H5 心镜报告。
- 更完整的回放、指标、成长趋势。
- 助教承接入口。

### 7.4 后端职责

- 管理真实历史 K 线数据池。
- 提供匿名切片。
- 保存训练 Session。
- 聚合决策、情绪、纪律偏离。
- 输出复盘与成长画像。
- 保证合规边界和敏感信息脱敏。

### 7.5 当前项目落点

当前小程序 repo 已有：

- `miniprogram/pages/kline-mind/index`
- `miniprogram/modules/kline-mind/index`
- `miniprogram/utils/data-binding-adapter.js`
- `miniprogram/utils/api.js`
- `server/src/services/historicalKline.js`
- `server/src/services/dataBinding.js`
- `server/src/services/zhixingReplay.js`
- `server/src/routes/router.js`

V1 应优先在这些路径上做增量，不新建孤立系统。

## 8. 第一阶段可交付范围

### 8.1 第一阶段目标

在不破坏现有 K线观心闭环的前提下，把它升级为“可进入逐根盲测训练”的最小可用训练系统。

完成后，用户可以：

1. 从 K线观心页进入训练。
2. 获取真实历史 K 线匿名片段。
3. 横屏或竖屏逐根推进。
4. 在关键节点做 BUY / SELL / HOLD 模拟决策。
5. 被系统识别情绪和行为风险。
6. 完成后生成心镜记录、复盘入口和成长沉淀。

### 8.2 第一阶段必须交付

- 保留现有 K线观心页面结构。
- 将“今日观心”升级为 AI Mind Trigger 文案与状态。
- 将“真实历史片段”升级为唯一 Blind Trade Entry。
- “练”按钮触发 Session 初始化。
- 支持 `1d / 60m / 30m` 三种训练周期。
- 支持 Market Context Filter。
- 接入现有 `/api/v1/kline-history/slice`。
- 保留 `local_demo` fallback。
- 训练窗口目标为约 150 根 K 线；数据不足时不得低于 80 根验收线。
- 实现前端逐根推进状态机。
- 实现基础 BUY / SELL / HOLD 决策记录。
- 实现基础模拟 PnL、最大回撤快照，用于行为复盘，不作为收益承诺。
- 实现基础情绪规则：
  - 连续追高 -> `GREED`
  - 下跌割肉 -> `FEAR`
  - 连续亏损后加仓 -> `REVENGE`
  - 无计划交易 -> `IMPULSE`
  - 犹豫不执行 -> `HESITATION`
- 实现 AI Coach Overlay、Emotion Badge、Risk Hint Bar 的非侵入式展示。
- 训练完成后写入：
  - `KlineMindRecord`
  - `OneThoughtEvent`
  - `TradeReviewRecord`
- 通过现有 `data-binding-adapter` 同步，不新增孤立同步通道。
- 复盘完成后自然出现“查看心镜报告”。

### 8.3 第一阶段暂缓

- 完整 KDJ / RSI / EMA / ATR / CCI 指标体系。
- 完整买卖盘口、分笔、逐笔成交。
- 真实账户资金曲线。
- 多品种自由选择器。
- 排行榜、PK、社区。
- 商业订阅。
- 全量数据库迁移。

这些能力进入 V1.1 / V2，不阻塞 V1 训练闭环。

### 8.4 验收标准

- 从小程序 K线观心页能进入训练 Session。
- 训练默认 blind mode，不暴露真实股票名、行业、新闻和日期。
- K 线根数足够支撑训练，目标约 150 根；数据不足时默认不少于 80 根。
- 支持缩放窗口，用户能看到更多或更少 K 线。
- 支持日线 / 60m / 30m。
- 点击下一根后 K 线稳定推进，不白屏、不残影。
- 决策节点不能被跳过。
- BUY / SELL / HOLD 只作为模拟训练记录，不出现真实交易语义。
- AI Coach 不预测行情，只反馈行为纪律。
- 训练结束后现有闭环不断：
  - 首页今日状态可感知
  - 训练页 Day 进度可感知
  - 复盘报告可进入
  - 活镜成长可沉淀
  - 我的页可读取记录
- 小程序和 Web 使用同一用户、同一记录、同一 `data-binding` 语义。
- 所有用户-facing 文案符合“不荐股、不预测、不构成操作依据”边界。

## 9. 分阶段交付路线

### P0：产品边界与数据契约

目标：先把“模拟训练，不是真实交易”的 API、schema、事件流定死，避免后面返工。

交付：

- 确认现有结构优先：`klineMindRecord -> oneThoughtEvent -> tradeReviewRecord -> livingMirrorGrowth`。
- 明确 Session 是运行态投影，不是权威主数据。
- 定义兼容扩展字段：`trainingSessionId`、`simulationMode`、`coachHints`、`emotionBadges`、`riskHints`、`sliceSeed`。
- API 命名统一使用 `/api/v1/kline-training/session...`。
- 禁止 `/api/trade/execute` 这类真实交易语义。

### P1：盲测训练 MVP

目标：先让用户能进入真实历史片段的逐根推进训练。

交付：

- 复用现有 `/api/v1/kline-history/slice` 获取历史切片。
- 在现有 K线观心页内实现逐根推进、当前 index、强制决策节点。
- 在现有记录上追加基础 BUY / SELL / HOLD 模拟决策。
- 在现有记录上追加基础情绪打标。
- 在现有记录上追加基础模拟 PnL 与最大回撤快照。
- 完成后写回现有闭环。

### P2：K 线训练体验

目标：让训练像真实 K 线模拟环境，而不是几根示意蜡烛。

交付：

- 横屏优先体验。
- 一屏多 K。
- 缩小显示更多 K，放大显示更少 K。
- 日线 / 60m / 30m 训练参数。
- 补 5m / 15m 训练参数，分时模式后置。
- VOL 基础量能。
- MA / MACD / BOLL 作为第一批训练辅助指标。
- RSI / KDJ / EMA / ATR / CCI 作为第二批指标。
- 涨停 / 强触发训练模式。
- 指数 / ETF 训练模式。
- 单决策焦点 UI。

### P3：复盘报告

目标：训练结束后自然形成心镜复盘，不让用户去资料页里找报告。

交付：

- 买卖点标注。
- 情绪点标注。
- 模拟盈亏曲线。
- 胜率、操作次数、持仓周期、最大回撤、风险收益比。
- 心法反馈。
- 错误类型识别：追涨点、恐惧点、无计划交易点、知行偏差。
- 收藏复训与同一结构 replay token。
- “查看心镜报告”自然出现在训练完成结果中。

### P4：人格成长

目标：把一次次 K 线训练沉淀为长期成长画像。

交付：

- 纪律分。
- 一致性指数。
- 行为稳定性。
- 人格类型演化曲线。
- 活镜成长页读取同一数据语义，不单独维护小程序私有成长模型。

## 10. 借鉴但不新建：未来模块化蓝图

以下结构来自独立 K 线训练系统的目标形态，可以作为职责拆分参考，但当前阶段不新建 `ym-kline-mind-system/`，不另起前端、后端、数据库或 shared 工程。

当前施工原则：

- 借鉴模块边界。
- 不迁移目录。
- 不新建孤立 schema。
- 不替换现有页面。
- 不绕过 `data-binding-adapter`。
- 功能先长在现有小程序与现有后端链路上。

### 10.1 蓝图到当前项目的映射

| 未来蓝图 | 可借鉴职责 | 当前落点 |
| --- | --- | --- |
| `web/pages/training/blind.tsx` | Web 盲测训练页 | 当前先不做，优先小程序 `miniprogram/pages/kline-mind/index` |
| `web/pages/training/replay.tsx` | 回放系统 | P3 后接 H5 / Web 报告 |
| `web/pages/review/report.tsx` | 复盘报告 | 当前沿用 `tradeReviewRecord` 与报告入口 |
| `web/pages/profile/growth.tsx` | 人格画像 | 当前沿用 `livingMirror` |
| `components/kline/KLineChart` | K 线渲染核心 | 当前落在小程序 WXML/WXSS 与 `kline-mind` session 数据 |
| `components/trade/TradePanel` | 模拟决策面板 | 当前落在现有 K线观心页面交互 |
| `components/emotion/EmotionLayer` | 情绪层 | 当前落在 `emotionBadges` / `riskHints` |
| `components/replay/ReplayEngine` | 回放引擎 | P3 从 `decisionTimeline` / `emotionTimeline` 生成 |
| `server/modules/market-engine` | 真实历史切片 | `server/src/services/historicalKline.js` |
| `server/modules/simulation-engine` | 逐根推进运行态 | `miniprogram/modules/kline-mind/index.js`，未来可抽后端投影 |
| `server/modules/decision-engine` | 模拟决策、仓位、PnL | 当前先在 `kline-mind` runtime 内补 |
| `server/modules/emotion-engine` | 情绪识别与心法映射 | 当前先在 `kline-mind` runtime 内补 |
| `server/modules/review-engine` | 训练复盘 | `tradeReviewRecord` + `data-binding` |
| `server/modules/growth-engine` | 长期成长画像 | `livingMirror` |
| `shared/types.ts` | 统一契约 | 当前先由本规格与测试约束，稳定后再抽 contracts |
| `db/schema.sql` / migrations | 持久化结构 | 当前不新增权威主表；如需要，只加运行态投影 |
| `data/market` | 脱敏 K 线数据池 | 复用现有 `server/data/market` 与历史 K 线缓存 |

### 10.2 何时可以抽模块

只有同时满足以下条件，才考虑从当前页面 / 模块抽成独立组件或服务：

- 小程序 P1 盲练闭环已经稳定。
- `klineMindRecord -> oneThoughtEvent -> tradeReviewRecord -> livingMirrorGrowth` 已真实跑通。
- Web / H5 也开始消费同一训练记录。
- 同一逻辑在两个以上端重复出现。
- 抽出后不会改变现有字段和同步链路。

## 11. Future V3：高仿真压力训练层

V3 是未来“接近真实交易心理压力”的仿真层，不进入当前 P1 / P2 实现。它的价值是补足训练环境中的压力、不可逆、时间限制与行为延迟，但必须建立在 V1 盲练和 V2 完整训练器稳定之后。

### 11.1 V3 目标

在不接入真实交易、不输出投资建议的前提下，通过高仿真压力层逼近真实交易中的心理与行为压力。

V3 目标不是让用户更会交易，而是训练：

- 压力下是否仍能守边界。
- 决策后是否能接受不可逆结果。
- 亏损、震荡、假信号中是否能识别自己的反应模式。
- 行为延迟、犹豫、冲动是否能被记录和复盘。

### 11.2 V3 新增核心仿真层

| V3 层 | 责任 | 当前处理 |
| --- | --- | --- |
| Market Reality Simulator | 生成更真实、更不可预测的训练片段 | 后置；优先用真实历史片段筛选，不直接伪造 K 线 |
| Pressure & Time Engine | 3-8 秒决策倒计时、超时 MISS、压力递增 | 后置；当前只预留字段 |
| Irreversible Decision Engine | 决策不可撤销、不可修改、不可回退 | 后置；V1 可先在文案和数据上保持不可编辑原则 |
| Behavior Latency Engine | 模拟点击到成交之间 300-1500ms 延迟 | 后置；当前只记录真实用户决策耗时 |
| Session Reality Scoring | 输出真实度评分 | 后置；P3/P4 后再接 |

### 11.3 可提前预留的兼容字段

这些字段可以作为未来扩展预留，但当前页面不必展示，也不应影响 V1 闭环：

```ts
type KlineRealitySimulationExtension = {
  decisionStartedAt?: number;
  decisionSubmittedAt?: number;
  decisionLatencyMs?: number;
  decisionTimeLimitMs?: number;
  isMissedDecision?: boolean;
  pressureLevel?: "low" | "medium" | "high";
  stressSignals?: string[];
  isIrreversible?: boolean;
  behaviorLatencyMs?: number;
  realityScore?: {
    total: number;
    pressureMatch: number;
    emotionConsistency: number;
    executionSpeed: number;
    disciplineExecution: number;
  };
  interventionEvents?: Array<{
    type: string;
    message: string;
    createdAt: number;
  }>;
};
```

### 11.4 市场不可解释性原则

V3 可以引入“不可预测训练场”，但优先通过真实历史片段筛选实现，而不是直接篡改真实 OHLCV。

推荐方式：

- 从真实历史中筛选假突破。
- 从真实历史中筛选震荡陷阱。
- 从真实历史中筛选高波动切换。
- 从真实历史中筛选流动性断层。
- 从真实历史中筛选亏钱行情、假信号行情、震荡反复行情。

谨慎或禁止：

- 不直接制造会误导用户的假行情。
- 不输出“这是未来会发生的结构”。
- 不把训练场景包装成市场预测。
- 不让 AI Coach 输出方向判断。

### 11.5 V3 暂不进入当前实现

当前不做：

- 3-8 秒强制倒计时。
- UI 变暗、提示减少、压力递增的压迫式界面。
- 不可撤销强压力交互。
- `applyNoise()` 直接改造真实 K 线。
- “压迫式教练”的风险概率输出。

当前可以先做：

- 记录决策开始与提交时间。
- 记录是否错过决策点。
- 记录基础压力信号。
- 保持模拟决策不可随意编辑的产品原则。

## 12. 命名原则

为了避免投顾误解，V1 用户侧命名建议：

- “盲测交易”对内可用，对外优先叫“逐根盲练”。
- “交易执行”对内可用，对外优先叫“模拟决策”。
- “买 / 卖 / 持有”对内可存 `BUY / SELL / HOLD`，对外需要配合“模拟”语境。
- “收益 / 胜率”只在复盘分析中作为模拟训练指标，不作为能力承诺。
- “风险提示”只指行为风险，不指市场风险方向。

## 13. 合规文案

所有 K线训练页面保留轻量合规边界：

> 本系统用于交易心理觉察与训练，不提供投资建议，不预测行情，不构成任何操作依据。

完整复盘页和报告页可使用完整合规提示；首页、训练页、活镜页使用 compact / link 形态，不重复大卡片。
