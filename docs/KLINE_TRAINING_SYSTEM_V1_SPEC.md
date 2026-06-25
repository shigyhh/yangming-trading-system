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

## 12. Future V4：人格收敛与稳态交易系统

V4 已经不是训练系统升级，而是“交易行为收敛系统”。它不进入当前 P1 / P2 实现，必须建立在 V1 盲练、V2 完整训练器、V3 压力仿真都稳定之后。

### 12.1 V4 一句话定义

构建一个基于 K 线盲测交易与行为数据的“交易人格收敛系统”，通过行为约束、错误模式压缩、情绪弱化与决策稳定化机制，将用户交易行为从高波动非稳定状态逐步收敛为低熵、高一致性的稳定交易人格。

这里的“交易人格”只指交易训练中的行为模式，不是医学、心理诊断，也不约束用户真实交易行为。

### 12.2 V4 新增核心层

| V4 层 | 责任 | 当前处理 |
| --- | --- | --- |
| Behavioral Convergence Engine | 对用户训练行为聚类，识别主导行为模式并推动收敛 | 后置；P4 后再接 |
| Error Compression Engine | 将错误压缩成有限类型，避免错误分类无限扩散 | 后置；P3 可先做错误类型归一 |
| Emotional Dampening System | 降低情绪对行为输出的权重，让情绪只是信号 | 后置；当前仍先识别情绪 |
| Decision Stability Engine | 提升同类条件下决策一致性 | 后置；P3/P4 可先做一致性指标 |
| Trader Identity Engine | 建立固定交易行为画像，并检测人格偏移 | 后置；只作为训练画像，不作真实身份判断 |

### 12.3 V4 核心指标

```ts
type KlineConvergenceExtension = {
  stabilityIndex?: number;
  entropyIndex?: number;
  identityCoherence?: number;
  dominantBehaviorPattern?: "trend" | "range" | "impulsive" | "patient" | "unknown";
  behaviorDeviationPct?: number;
  compressedErrorType?: "chase" | "panic" | "hesitation" | "none";
  emotionWeight?: number;
  decisionConsistency?: number;
  traderIdentity?: {
    type: string;
    constraints: string[];
    allowedBehaviors: string[];
    discouragedBehaviors: string[];
  };
};
```

### 12.4 V4 UI 原则

V4 UI 不再强化情绪干预，而是转向低干扰、一致性反馈：

- 少情绪词。
- 少强提醒。
- 少即时纠错。
- 强化行为一致性提示。
- 强化人格偏移提示。
- 强化稳态评分。
- 情绪提示弱化为灰色辅助信号。

### 12.5 V4 暂不进入当前实现

当前不做：

- 行为聚类与人格固定。
- 行为偏移惩罚。
- 情绪权重衰减模型。
- 人格约束交易行为。
- UI 稳态评分系统。

当前可以先做：

- 保持错误类型有限集合：追涨、恐慌、犹豫。
- 在复盘中避免错误类型无限扩散。
- 在文案上弱化“情绪决定动作”，强调情绪只是信号。

## 13. Future V5：交易数字分身系统

V5 是系统终局形态：交易数字分身对照系统。它不进入当前 P1 / P2 / P3 / P4 实现，只作为长期产品愿景保留。

### 13.1 V5 一句话定义

构建一个基于 K 线行为数据、情绪轨迹与决策历史的“交易数字分身系统”，为每个用户生成一个可独立运行的 AI 交易人格分身，用于模拟、对照、预测与重塑用户训练行为，实现“自我与分身对照进化”的交易认知系统。

补充边界：

- “AI 分身”只在模拟训练中运行。
- 不接入真实交易。
- 不生成真实买卖建议。
- 不承诺收益。
- “预测”只预测用户可能出现的行为风险，不预测行情。
- “反事实路径”只比较纪律路径与实际训练路径，不称为投资最优路径。

### 13.2 V5 新增终局系统

| V5 层 | 责任 | 当前处理 |
| --- | --- | --- |
| Trading Digital Twin Engine | 基于历史行为、情绪、决策生成模拟分身 | 后置；需长期数据后再做 |
| Self-Shadow Simulation Engine | 用历史错误模式模拟“过去的我” | 后置；可由 P3/P4 复盘数据沉淀 |
| Behavior Forecast Engine | 预测用户下一步高风险行为 | 后置；只做行为风险，不做行情预测 |
| Counterfactual Trading Engine | 比较实际路径与纪律路径 | 后置；禁止输出收益承诺式“最优路径” |
| Twin vs Self Divergence Engine | 计算用户、历史自我、AI 分身的行为差异 | 后置；用于认知对照报告 |

### 13.3 V5 三重对照结构

V5 UI 不再是交易界面，而是自我认知对照界面：

```text
当前用户行为
  vs
AI 分身行为
  vs
历史影子行为
```

三层含义：

- 真实自我：当前训练中的实际行为。
- 历史自我：过去反复出现的错误影子。
- 理想自我：由稳定规则压缩出的模拟分身。

### 13.4 V5 可提前预留的兼容字段

这些字段只作为未来扩展，不进入当前页面展示：

```ts
type KlineDigitalTwinExtension = {
  twinProfileId?: string;
  twinModelVersion?: string;
  shadowModelId?: string;
  behaviorForecasts?: Array<{
    type: "chase" | "panic" | "hesitation" | "revenge" | "overtrade";
    probability: number;
    triggerContext: string;
  }>;
  counterfactualPaths?: Array<{
    pathId: string;
    label: string;
    premise: string;
    disciplineScoreDelta?: number;
    riskDelta?: number;
  }>;
  divergenceScores?: {
    decisionGap: number;
    emotionGap: number;
    timingGap: number;
    riskGap: number;
  };
};
```

### 13.5 V5 暂不进入当前实现

当前不做：

- AI 分身自主交易模拟。
- 未来行为概率预警。
- 多路径交易对照。
- Twin vs Self 三屏 UI。
- 任何收益对比式“如果按 AI 做会赚多少”的输出。

当前可以先做：

- 保留行为轨迹、情绪轨迹、决策轨迹。
- 让 `decisionTimeline` / `emotionTimeline` 足够干净，未来可训练分身。
- 复盘中保持“实际路径 vs 纪律路径”的数据可能性，但不展示收益承诺。

## 14. Future V6：交易文明与群体智能系统

V6 是远期“交易文明模拟系统”，已经不是个人训练系统。它只能作为研究级未来方向保留，不进入当前工程化路线，不设计当前 DB / API / 小程序页面。

### 14.1 V6 一句话定义

构建一个基于多用户交易行为、数字分身交互与市场反馈循环的“交易文明模拟系统”，让多个交易人格分身在同一模拟市场环境中相互影响、竞争、学习与演化，从而形成可观察、可建模、可干预的交易群体智能生态。

补充边界：

- 只在脱敏模拟环境中运行。
- 不使用可识别用户数据做公开群体模拟。
- 不预测真实市场。
- 不模拟或指导真实市场操纵。
- 不进入当前产品功能承诺。

### 14.2 V6 新增文明层

| V6 层 | 责任 | 当前处理 |
| --- | --- | --- |
| Multi-Agent Trading Civilization Engine | 生成多类交易人格 Agent，并在同一模拟市场中决策 | 远期研究层 |
| Market Ecology Engine | 模拟流动性、波动率、情绪与 Agent 压力图 | 远期研究层 |
| Behavior Herding Engine | 模拟恐慌、FOMO、流动性踩踏等群体行为 | 远期研究层 |
| Strategy Evolution Engine | 模拟策略复制、变异、淘汰 | 远期研究层 |
| Civilization Memory Engine | 记录群体行为周期、极端事件、策略演化路径 | 远期研究层 |

### 14.3 V6 Agent 类型

```ts
type TradingCivilizationAgent = {
  id: string;
  personalityType: "trend_follower" | "contrarian" | "scalper" | "emotional_trader" | "ai_rational";
  riskProfile: string;
  strategyModel: string;
  capitalWeight: number;
};
```

预置 Agent：

- Trend Follower：趋势追随者。
- Contrarian：逆势交易者。
- Scalper：短线高频。
- Emotional Trader：情绪交易者。
- AI Rational Agent：理性模型。

### 14.4 V6 可提前保留的概念字段

这些字段不进入当前存储，只作为未来研究契约：

```ts
type KlineCivilizationExtension = {
  civilizationSessionId?: string;
  agentPopulationSummary?: Array<{
    type: string;
    count: number;
    capitalWeight: number;
  }>;
  marketEcologyState?: {
    liquidity: number;
    volatility: number;
    sentiment: number;
    herdingIndex: number;
  };
  strategyEvolutionEvents?: Array<{
    eventType: "replicate" | "mutate" | "eliminate";
    strategyId: string;
    reason: string;
  }>;
  civilizationMemoryRefs?: string[];
};
```

### 14.5 V6 暂不进入当前实现

当前不做：

- 多用户分身对战。
- 群体市场价格反馈模拟。
- 策略达尔文进化。
- 文明记忆库。
- 群体情绪曲线 UI。

当前可以做：

- 保证个人训练数据结构足够干净，未来可匿名聚合。
- 保持 `klineMindRecord`、`decisionTimeline`、`emotionTimeline` 不夹带敏感身份数据。
- 在文档中保留 V6 作为远期研究方向，不进入短期 backlog。

## 15. Future V7：Market-as-Mind 终极认知系统

V7 是“市场即心智”的终极哲学与认知建模层，不是当前产品功能，不是工程承诺，也不是对真实市场的因果断言。

### 15.1 V7 一句话定义

构建一个“市场即心智”的终极交易认知系统，将 K 线市场从外部数据环境升级为可建模、可干预、可反演的集体心智结构，使市场行为、交易者行为与认知模型在同一系统中闭环共振，实现“市场 = 心智投影场”的统一建模体系。

重要边界：

- “市场即心智”是认知建模视角，不是金融科学定论。
- “可编辑”只指训练场景和认知模型可编辑，不指真实市场可编辑。
- 不输出真实市场预测。
- 不进行真实市场干预。
- 不把群体心理模型包装成买卖依据。

### 15.2 V7 终极跃迁层

| V7 层 | 责任 | 当前处理 |
| --- | --- | --- |
| Market-as-Mind Engine | 将模拟市场视为集体心智投影结构 | 哲学 / 研究层 |
| Cognitive Field Engine | 建模信念、预期、注意力与矛盾结构 | 哲学 / 研究层 |
| Intention Projection Engine | 将交易者意图映射到模拟市场行为 | 哲学 / 研究层 |
| Reality Feedback Loop Engine | 建立认知 -> 行为 -> 市场 -> 反馈 -> 认知闭环 | 哲学 / 研究层 |
| Mind-Market Unity Engine | 统一交易者行为与模拟市场状态 | 哲学 / 研究层 |

### 15.3 V7 认知变量

```ts
type MarketMindState = {
  collectiveEmotionField?: number;
  attentionFlow?: number;
  fearGreedDensity?: number;
  decisionEntropy?: number;
  beliefConflict?: number;
  expectationPressure?: number;
  cognitiveCollapseRisk?: number;
};
```

这些变量只能用于训练可视化、模拟解释和认知复盘，不用于真实行情判断。

### 15.4 V7 体验方向

V7 用户看到的不是传统 K 线，而是训练场中的认知结构可视化：

- 群体恐惧浓度。
- 贪婪扩散结构。
- 信念冲突区域。
- 注意力流向。
- 认知塌陷点。

这些可视化都必须标注为“训练模拟解释”，不得呈现为真实市场信号。

### 15.5 V1 到 V7 的完整进化链

```text
V1 工具
  -> V2 教练
  -> V3 压力模拟
  -> V4 人格收敛
  -> V5 数字分身
  -> V6 交易文明
  -> V7 心智市场
```

### 15.6 V7 之后不再扩展产品形态

V7 之后不再继续定义新版本。本规格到 V7 为止，后续只能做两件事：

1. 工程化落地：把 V1-P4 当前可实现部分做成真实系统。
2. 认知收敛：把 V5-V7 作为长期哲学与研究框架沉淀。

## 16. Trading Cognitive OS：工程化收敛层

“交易认知操作系统（Trading Cognitive OS）”是本规格的工程化收敛命名，用于把 V1-V7 压缩为可运行、可验收、可持续演进的系统边界。

重要边界：

- 当前不新建 `ym-kline-cognitive-os/` 独立仓库。
- 当前不另起一套孤立 schema。
- 当前不把 NestJS 微服务、Docker 多服务拆分作为 P1 前置条件。
- 当前小程序、Web、H5 复盘、活镜成长仍以现有事件链和数据绑定为主。
- “OS”是产品与工程组织方式，不是实盘交易系统、策略系统或量化系统。

### 16.1 收敛定位

Trading Cognitive OS 只做一件事：

> 把交易行为从随机情绪输出，收敛为稳定、可复盘、可训练的认知决策闭环。

它不是：

- 策略系统。
- 量化系统。
- 行情预测系统。
- AI 投资分析工具。

它只做：

- 行为记录。
- 认知建模。
- 模拟训练。
- 复盘反馈。
- 成长画像。

核心公式：

```text
Trading Cognitive OS = f(Behavior, Cognition, Market)

Behavior = Cognition x Market Context
```

### 16.2 三层核心模型

| 层级 | 关注点 | 当前落点 |
| --- | --- | --- |
| Behavior Layer | 用户做了什么：BUY / SELL / HOLD、仓位、频率、犹豫、追涨、恐慌 | `decisionTimeline`、`klineMindRecord`、`oneThoughtEvent` |
| Cognition Layer | 用户为什么这样做：恐惧、贪婪、FOMO、知行偏差、纪律偏移 | `emotionBadges`、`riskHints`、`coachHints`、未来 `cognitionTrace` |
| Market Simulation Field | 用户在什么环境里做：趋势、震荡、假突破、波动、量能、周期 | `/api/v1/kline-history/slice`、`visibleCandles`、`simulationMode` |

三层必须合在同一条训练链路里，不允许拆成互不相干的“小程序训练器”和“网站报告系统”。

### 16.3 统一运行闭环

工程闭环固定为：

```text
Market
  -> Session
  -> Behavior
  -> Cognition
  -> Coach
  -> Feedback
  -> Update State
```

这条闭环映射到状态机：

| 状态 | 含义 | 当前 / 近期实现 |
| --- | --- | --- |
| `INIT` | 初始化训练上下文 | 页面进入、读取用户与本地记录 |
| `LOAD_MARKET` | 加载真实历史 K 线切片 | `fetchKlineTrainingSlice` -> `/api/v1/kline-history/slice` |
| `RUN_SESSION` | 启动盲测训练会话 | `startKlineTrainingRuntime` |
| `WAIT_DECISION` | 等待用户单次模拟决策 | `mustDecide`、`lockedUntilDecision` |
| `EXECUTE_TRADE` | 记录不可撤销的模拟决策 | `recordKlineTrainingDecision` |
| `UPDATE_COGNITION` | 更新情绪与行为偏差 | `emotionBadges`、`riskHints` |
| `COACH_FEEDBACK` | 输出教练反馈 | `coachHints` |
| `NEXT_CANDLE` | 推进下一根 K 线 | `advanceKlineTrainingRuntime` |
| `END_SESSION` | 生成复盘与成长事件 | `buildKlineMindRecord` -> `oneThoughtEvent` -> `tradeReviewRecord` -> `livingMirrorGrowth` |

### 16.4 工程模块落点

工程化 V1 的模块划分有参考意义，但在当前项目里先作为“逻辑模块”，不立即拆成物理微服务。

| 工程化模块 | 责任 | 当前项目落点 |
| --- | --- | --- |
| Session Core | 会话、状态机、当前 index、训练结果 | `miniprogram/modules/kline-mind/index.js` runtime 扩展 |
| Market Engine | 随机真实历史切片、脱敏 OHLCV、周期参数 | `/api/v1/kline-history/slice`、后端历史 K 线服务 |
| Behavior Service | 模拟买卖、持有、跳过、延迟、行为日志 | `decisionTimeline`、未来模拟 PnL / 回撤快照 |
| Cognition Service | fear / greed / fomo / hesitation / disciplineDeviation | `emotionBadges`、`riskHints`、未来 `cognitionTrace` |
| Coach Service | 训练反馈、错误提示、下一步省察 | `coachHints`、`tradeReviewRecord`、H5 心镜报告 |
| Scoring System | 稳定性、纪律、知行一致、认知准确度 | `calculateKlineMindScore`、未来 `stabilityScore` / `disciplineScore` |
| Replay Engine | K 线回放、买卖点、情绪轨迹 | P3 复盘报告阶段 |
| Growth Engine | 长期成长画像与人格演化 | `livingMirror`、网站成长画像 |

### 16.5 数据模型落点

工程化 V1 提到的 `users`、`sessions`、`trades`、`cognition_logs` 只作为未来投影表参考，当前不能替换既有数据链路。

| 工程模型 | 当前主数据 | 可新增兼容字段 |
| --- | --- | --- |
| `UserState` | `livingMirror` / 用户绑定档案 | `behaviorVector`、`cognitionVector`、`marketSensitivity`、`entropyLevel` |
| `Session` | `klineMindRecord` + runtime state | `trainingSessionId`、`simulationMode`、`sliceSeed`、`chartZoomKey` |
| `TradeLog` | `decisionTimeline` | `positionSize`、`simulatedPnl`、`maxDrawdownSnapshot` |
| `CognitionLog` | `emotionBadges` / `riskHints` | `cognitionTrace`、`disciplineDeviation`、`hesitationLevel` |
| `FeedbackTrace` | `coachHints` / 复盘反馈 | `feedbackTrace`、`reviewInsightRefs` |
| `FinalScore` | `calculateKlineMindScore` 输出 | `stability`、`discipline`、`cognitionAccuracy` |

字段原则：

- 新字段只能作为兼容扩展。
- 不替换 `selectedCandleKey`、`firstReaction`、`boundaryChoice`、`insightLine`。
- 不替换 `oneThoughtEvent`、`tradeReviewRecord`、`livingMirrorGrowth`。
- 不在小程序私有存储里形成独立成长画像。

### 16.6 API 与部署边界

工程化 V1 的 API 命名需要收敛到现有后端风格：

| 工程化草案 | 当前可接受命名 |
| --- | --- |
| `POST /session/create` | `POST /api/v1/kline-training/session` |
| `POST /session/next-candle` | `POST /api/v1/kline-training/session/:id/next` |
| `POST /session/execute-trade` | `POST /api/v1/kline-training/session/:id/decision` |
| `GET /session/result` | `GET /api/v1/kline-training/session/:id/result` |

当前 P1 优先级：

1. 继续复用 `/api/v1/kline-history/slice`。
2. 继续复用现有 data-binding 同步链路。
3. 先在小程序内完成 runtime 与页面体验。
4. 后端 session API 只在 P1 runtime 稳定后补充。

暂不做：

- 新建 `market-service`、`simulation-service`、`cognition-service` 多服务仓库。
- 新建 Docker Compose 多服务部署。
- 新增 PostgreSQL schema 作为唯一数据源。
- 先做 Next.js 训练系统再回接小程序。

### 16.7 第一阶段工程收敛目标

第一阶段不是“搭完整 OS”，而是把 OS 的最小闭环跑通：

```text
真实历史 K 线切片
  -> 逐根盲练 session
  -> 模拟决策记录
  -> 行为 / 情绪提示
  -> KlineMindRecord
  -> OneThoughtEvent
  -> TradeReviewRecord
  -> LivingMirrorGrowth
```

Done when：

- 用户能从 K线观心页唯一主入口进入逐根盲练。
- 一屏能看到足够多的真实 K 线，并可缩放 / 横屏优先训练。
- 每一步模拟决策被记录，且不可编辑为“事后美化”。
- 训练完成后自然生成复盘入口，而不是藏在我的页列表。
- 训练结果进入现有活镜成长链路，不形成孤立训练数据。

## 17. 命名原则

为了避免投顾误解，V1 用户侧命名建议：

- “盲测交易”对内可用，对外优先叫“逐根盲练”。
- “交易执行”对内可用，对外优先叫“模拟决策”。
- “买 / 卖 / 持有”对内可存 `BUY / SELL / HOLD`，对外需要配合“模拟”语境。
- “收益 / 胜率”只在复盘分析中作为模拟训练指标，不作为能力承诺。
- “风险提示”只指行为风险，不指市场风险方向。

## 18. 合规文案

所有 K线训练页面保留轻量合规边界：

> 本系统用于交易心理觉察与训练，不提供投资建议，不预测行情，不构成任何操作依据。

完整复盘页和报告页可使用完整合规提示；首页、训练页、活镜页使用 compact / link 形态，不重复大卡片。
