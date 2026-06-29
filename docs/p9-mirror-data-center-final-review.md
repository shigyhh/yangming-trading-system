# P9 心镜数据中枢总复审报告

## P9 阶段总复审结论

结论：通过。

P9 已形成“心镜数据中枢”的三层闭环：

- P9A 档案馆：以 `/mirror-archive` 承接证据层，复用 `ArchiveIndex` / `ArchiveItem` / `MirrorArchive` 和 data-binding archive API。
- P9B 数据看板：以 `/living-mirror-center` 承接分析层，接入 `DashboardSummary` / `WeeklyMirrorSummary`。
- P9C 心镜成长谱：以 `/living-mirror-growth` 承接成长叙事层，明确 server projection 主路径与 fallback 标识。

未发现阻断进入下一阶段的 P0 问题。

## 是否可以进入 P10

可以。

满足进入 P10 的条件：

- P9A / P9B / P9C 相关分支均已进入 `origin/main`。
- real-review / miniprogram / kline-service 三仓测试通过。
- 档案馆 / 数据看板 / 成长谱三层职责清晰。
- 没有新增第二套 archive / dashboard / growth 页面。
- fallback 来源已显式标识，不静默伪装为正式数据。
- 核心跨端字段未丢失。
- P8-3C 训练收藏与回放 smoke 已进入小程序 `origin/main`。

## P9 心镜数据中枢结构

### P9A 档案馆：证据层

正式入口：`/mirror-archive`

职责：

- 收纳真实复盘、K线训练、训练收藏、心镜报告、成长投影等证据。
- 通过 `ArchiveIndex` 提供总览。
- 通过 `ArchiveItem` 提供可追溯的档案条目。
- 通过 `sourceType` / `sourceId` 回到原始记录。

### P9B 数据看板：分析层

正式入口：`/living-mirror-center`

职责：

- 汇总真实复盘、K线训练、训练收藏、执行一致性、错题类型、第一念、触发场景。
- 支持 7d / 30d / 90d 范围切换。
- 展示本周活镜摘要和数据缺口。
- 作为心镜数据中枢总入口，链接档案馆、成长谱和后台管理页。

### P9C 心镜成长谱：成长叙事层

正式入口：`/living-mirror-growth`

职责：

- 展示长期成长阶段、重复行为、训练连续性、下一轮重点。
- 以 server `LivingMirrorGrowthProjection` 为主事实源。
- 在 projection 不可用时，明确降级到 `DashboardSummary` / `MirrorArchive` 辅助视图。
- 本地旧版 recompute 仅作为最后降级，并明确标注“旧版 / 仅供参考”。

## P9A 审查

状态：通过。

证据：

- 页面存在：`web-next/src/app/mirror-archive/page.tsx`
- contract 存在：`ArchiveIndex` / `ArchiveItem` / `MirrorArchive`
- server 能力存在：
  - `buildArchiveIndex`
  - `buildMirrorArchive`
  - `getMirrorArchiveBinding`
  - `getMirrorArchiveItemBinding`
- API 存在：
  - `GET /api/v1/data-binding/users/:user_id/mirror-archive`
  - `GET /api/v1/data-binding/users/:user_id/mirror-archive/:item_id`
- 页面能力：
  - 读取正式 Archive API。
  - API 不可用时可 fallback 到 data-binding summary / 本地旧结构。
  - 展示 ArchiveIndex 概览。
  - 展示 ArchiveItem 列表。
  - 支持类型筛选。
  - 有 loading / error / empty 状态。

判断：

- `/mirror-archive` 已成为正式档案馆入口。
- 没有新建第二套 archive 页面。
- 旧入口仍存在，但属于后续收束项，不阻断 P10。

## P9B 审查

状态：通过。

证据：

- 页面存在：`web-next/src/app/living-mirror-center/page.tsx`
- contract 存在：
  - `DashboardSummary`
  - `WeeklyMirrorSummary`
- API 存在：
  - `GET /api/v1/data-binding/users/:user_id/dashboard-summary?range=30d`
  - `GET /api/v1/data-binding/users/:user_id/dashboard-weekly?week=current`
- 页面能力：
  - 调用 dashboard summary / weekly API。
  - 支持 7d / 30d / 90d。
  - 展示 overview / execution / mistakes / first thoughts / trigger scenes。
  - 展示 training / bookmarks / dataGaps / weekly summary。
  - API 失败时有旧版汇总 fallback 提示。
  - 提供到档案馆、成长谱、训练包管理、K线片段管理的轻量导航。

判断：

- `/living-mirror-center` 已成为 P9 数据看板和心镜数据中枢入口。
- 没有新建 `/dashboard` 平行页面。
- DashboardSummary 与 WeeklyMirrorSummary 的边界清楚。

## P9C 审查

状态：通过。

证据：

- 页面存在：`web-next/src/app/living-mirror-growth/page.tsx`
- contract 存在：`LivingMirrorGrowthProjection`
- 页面明确区分数据来源：
  - `server_projection`
  - `dashboard_archive_fallback`
  - `legacy_local_recompute`
  - `unavailable`
- 页面能力：
  - 优先调用 server growth projection。
  - projection 不可用时，降级到 DashboardSummary / MirrorArchive。
  - 本地 `recomputeAndSaveGrowthProfile` 仅作为最后降级。
  - 显示数据来源 badge。
  - 显示 fallback 提示。
  - 统一展示 dataGaps。
  - 提供到 `/living-mirror-center` 和 `/mirror-archive` 的轻量导航。

判断：

- `/living-mirror-growth` 保留为正式成长谱页面。
- 没有新增平行成长谱页面。
- fallback 标识清楚，不误导用户。

## 跨端数据审查

状态：通过。

### real-review

已支持：

- `training_bookmarks`
- `kline_records`
- `trade_reviews`
- `mirror_archive`
- `dashboard_summary`
- `living_mirror_profile`
- `execution_result`
- `repeat_count`
- `segment_id`
- `training_pack_id`
- `sampling_result`
- `fallback_used`

### miniprogram

已支持：

- K线训练采样 metadata 写入。
- 训练收藏创建与回放入口。
- data-binding adapter 保留 camelCase / snake_case 关键字段。
- 复盘与 K线训练字段可同步到 real-review data-binding。

### kline-service

已支持：

- K线历史切片：`/api/v1/kline-history/slice`
- KlineSegment CRUD：`/api/v1/kline-segments`
- 抽题 API：`POST /api/v1/kline-training/sample`
- samplingResult / segmentId / fallbackUsed 等字段。

判断：

- 小程序负责产生训练与收藏证据。
- kline-service 负责 K线片段、历史切片和抽题事实源。
- real-review 负责归档、分析和成长叙事。
- P9 页面不直接依赖完整 bars，主要通过 metadata / summary / archive 工作。

## 页面收束审查

正式三层入口：

- `/mirror-archive`：P9A 档案馆。
- `/living-mirror-center`：P9B 数据看板 / 心镜数据中枢入口。
- `/living-mirror-growth`：P9C 心镜成长谱。

仍存在历史入口：

- `/mind-archive`
- `/observing-archive`
- `/archive`
- `/me/archive`

判断：

- 历史入口不阻断 P10。
- 建议作为 P1 后续收束项：保留必要入口，逐步弱化或导向 `/mirror-archive`。

## 测试结果

### real-review server

- `cd server && npm run test:dashboard-summary` 通过。
- `cd server && npm run test:mirror-archive` 通过。
- `cd server && npm run test:data-binding` 通过。
- `cd server && npm run test:training-bookmarks` 通过。
- `cd server && npm run test:training-packs` 通过。
- `cd server && npm run check` 通过。

### real-review contracts

- `node --test packages/contracts/dashboard-summary-contract.test.mjs` 通过。
- `node --test packages/contracts/mirror-archive-contract.test.mjs` 通过。
- `node --test packages/contracts/living-mirror-contract.test.mjs` 通过。

### real-review web-next

- `cd web-next && npm run test:living-mirror-center` 通过。
- `cd web-next && npm run test:mirror-archive` 通过。
- `cd web-next && npm run test:living-mirror-growth` 通过。
- `cd web-next && npm run test:data-binding` 通过。
- `cd web-next && npm run build` 通过。

说明：

- build 中仍有既有 Next.js workspace root warning，不影响本次 P9 审查结论。

### miniprogram

- `node miniprogram/modules/kline-mind/index.test.js` 通过。
- `node miniprogram/modules/trade-review/index.test.js` 通过。
- `node miniprogram/utils/api.test.js` 通过。
- `node miniprogram/utils/data-binding-adapter.test.js` 通过。

### kline-service

- `npm run test:sampling --prefix server` 通过。
- `npm run test:kline-segments --prefix server` 通过。
- `npm run test:kline-history --prefix server` 通过。
- `npm run check --prefix server` 通过。

## 运行态 smoke

未执行完整运行态 HTTP smoke。

原因：

- 本轮任务限定为只审查和文档报告，不启动或重启服务。
- 已通过 web-next build 覆盖 `/mirror-archive`、`/living-mirror-center`、`/living-mirror-growth` 路由构建。
- 已通过页面测试覆盖三层入口和 fallback 标识。

建议：

- 进入 P10 前如要做发布候选，补一次真实浏览器 smoke：
  - `/mirror-archive`
  - `/living-mirror-center`
  - `/living-mirror-growth`
  - console error count
  - API fallback 提示可见性

## P0 问题

无。

## P1 问题

- 历史 archive 入口仍存在：`/mind-archive`、`/observing-archive`、`/archive`、`/me/archive`。建议后续做入口收束，避免用户理解成多套档案馆。
- 发布前建议补真实浏览器运行态 smoke，确认 API 失败时 fallback 提示在实际页面可见。

## P2 问题

- Next.js workspace root warning 仍存在，属于既有工程配置提示，不阻断 P10。
- P9 dataGaps 文案可在 P10/P11 后继续统一，避免不同页面对“样本不足”的表达细微不一致。
- kline-service 与 miniprogram 本地 checkout 曾显示落后 origin/main，但关键前置分支均已是 `origin/main` ancestor；建议后续跨仓审查前统一 `pull --ff-only`。

## 下一阶段建议

建议进入：

P10 深度知行提醒 / 干预系统升级前置审查。

P10 开始前建议先只读审查：

- 当前 `interventionEvent` / `executionPlan` / reminder 相关 contract 是否已存在。
- 小程序五个入口中“今日页 / 活镜页 / 我的页”如何承接提醒与执行计划。
- real-review web-next 是否已有提醒规则配置或 admin 入口。
- P9 dataGaps 中“知行提醒 / 执行计划缺口”如何回补。

## 风险点

- 如果直接开发 P10 UI，可能绕过已有 data-binding 和 P9 summary 口径。
- 如果历史 archive 入口长期不收束，会削弱“心镜档案馆”作为正式证据层入口的清晰度。
- 如果提醒/干预事件不先统一 contract，P10 可能再次出现小程序、web、server 字段分裂。
- 如果 P10 写成交易提醒或交易信号，会偏离“觉察、训练、复盘”的产品边界。
