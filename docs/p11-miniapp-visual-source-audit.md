# P11-V0S 小程序视觉源谱系审查报告

## 结论

- 确认当前视觉来源错位。P11-V2 截图证明当前 main 不是候选视觉分支的完整页面状态，而是当前旧壳叠加 P11-V1 最小恢复项后的混合状态。
- 建议重做视觉恢复。不要继续在 `fix/p11-miniapp-visual-baseline-recovery` 或现有 main 上补一块算一块。
- 没有单一分支可以作为可整包合并的 canonical visual source。应锁定“页面级多源基线”：
  - 首页 / 今日、训练页、profile 折叠结构、全局视觉：以本地 `feature/miniapp-ui-r1-release-polish` 为主要视觉参考。
  - 真实复盘 / 错题卡：以本地 `codex/miniapp-review-mistake-card-p1` 为主要参考，`feature/p1-review-error-card` 与 `feature/p1-review-error-type-storage` 只作差异辅助。
  - K线训练：以 `origin/codex/miniapp-kline-training-v2` / 本地 `codex/miniapp-kline-training-v2` 作视觉参考，但 runtime / 指标 / 换片段 / 拖动缩放属于 B 类，不能进视觉恢复分支。
- 禁止整包 merge 任一候选分支。候选分支都会覆盖或删除当前 main 的 P8/P10/P11 业务闭环。
- 可以进入 P11-V1B，但只能从干净 `origin/main` 新开 `fix/p11-miniapp-visual-baseline-recovery-v3`，按本报告逐页手工搬迁视觉和必要数据字段，不得合并候选分支。

## 候选分支谱系

| 分支 | 是否存在 | 是否进入 main | 用途判断 | 风险 | 是否作为视觉源 |
| --- | --- | --- | --- | --- | --- |
| `feature/miniapp-ui-r1-release-polish` | 本地存在，远端缺失 | 未进入；`origin/main...branch = 207/14` | UI R1 release polish，覆盖首页、训练、profile、活镜、复盘等视觉 | 会删除 `execution-plan`、`training-bookmarks`，会改 `app.json`、API、data-binding、业务 JS；本地-only，不可远端复现 | 是，作为“页面级视觉参考”，不可整包 |
| `codex/miniapp-review-mistake-card-p1` | 本地存在，远端缺失 | 未进入；`207/45` | 真实复盘错题卡与字段持久化综合分支 | 混入错题卡业务 JS、store 字段、API/data-binding 旧改动，并删除当前 main 新模块 | 是，作为真实复盘 / 错题卡目标参考 |
| `feature/p1-review-error-card` | 本地存在，远端缺失 | 未进入；`207/43` | 真实复盘错题卡结果分支 | 与 review 模块业务、旧 API、旧字段绑定强相关；非纯视觉 | 辅助参考，不作主源 |
| `feature/p1-review-error-type-storage` | 本地存在，远端缺失 | 未进入；`207/44` | 错题类型存储 / 字段分支 | 主要是字段和 store 迁移，不是视觉源；混入旧业务 | 不作为视觉主源，只作字段差异审查 |
| `codex/miniapp-kline-training-v2` | 本地存在，远端存在 `origin/codex/miniapp-kline-training-v2` | 未进入；本地 `207/42`，远端 `207/41` | K线训练视觉和 runtime 分支 | 整包会删除 P10/P11 模块，回退 API/data-binding，并带回旧 K线 runtime / 指标系统 | 仅作 K线视觉参考，B/C 大量剔除 |

补充证据：

- 远端可复现的重点候选只有 `origin/codex/miniapp-kline-training-v2`。
- 其余四个重点候选是本地分支，不可直接作为团队共享 canonical branch；报告中只能将它们作为本地历史视觉证据。
- 所有候选分支对 `origin/main` 都落后 207 个提交左右，说明它们是旧谱系，不是当前 P8/P10/P11 之后的安全基线。

## 页面级视觉源判断

### 首页 / 今日

- 推荐视觉源：本地 `feature/miniapp-ui-r1-release-polish`。
- 当前 main 状态：已有 `ymty-zhao-logo.svg`、`.brand-seal-frame`、`.brand-seal-art`、`single-focus`、轻量 `K线观心` 入口；但 P11-V2 证实首屏信息层级仍重复，像旧壳局部补丁。
- 当前 main 缺口：首屏焦点不够单一，`今日心证 / 今日一步 / 当前一步 / 今日只练一件事` 重复；完成态、链接显示条件、卡片重量和留白未完全回到 UI R1。
- 可搬内容：首屏容器节奏、`single-focus` 完整两卡布局、完成态卡片层级、`home-quiet-paths` 条件、品牌 logo 使用方式、部分 WXSS 留白和 card hierarchy。
- 不搬内容：整文件 JS、旧 `fetchTodayState` / server today state 依赖、旧 API/data-binding、`app.json`、旧安全文案；是否恢复 `阳明心学交易系统 / 每日一页 · 照见本心` 需产品确认。
- 风险：UI R1 首页仍绑定大量旧 `homeFocusView` / `miniHomeView` / completion 结构，必须用当前 main 字段承接，不可覆盖 JS。

### K线训练

- 推荐视觉源：`origin/codex/miniapp-kline-training-v2` 和本地 `codex/miniapp-kline-training-v2` 只作视觉参考。
- 当前 main 状态：保留 P8 sampling、`review_focus`、`special_training`、`custom_session`、training bookmarks、execution plan 关联；K线页没有迁回旧指标 runtime。
- 当前 main 缺口：P11-V2 未提供 K线截图，不能确认视觉是否达标；当前页面仍偏工具密度。
- 可搬内容：K线页的顶部视觉、页面留白、抽象 K线观心语言、非行情软件化的卡片样式。
- 不搬内容：`runtimeView`、MA/BOLL/MACD/RSI/KDJ、拖动缩放、换片段、逐根盲练 runtime、仓位/盈亏/回撤展示、旧 JS 计算逻辑。
- 风险：候选 K线分支最容易把视觉恢复变成旧指标系统回流；K线页 V1B 只能做轻视觉，runtime 必须单独立项。

### 真实复盘 / 错题卡

- 推荐视觉源：本地 `codex/miniapp-review-mistake-card-p1`。
- 次优参考：`feature/p1-review-error-card`；`feature/p1-review-error-type-storage` 只查字段。
- 当前 main 状态：真实复盘可用，但仍是旧流程页：截图/选择/textarea/补充锚点，未恢复错题卡的轻量选择、`mistake-card`、触发场景和下次执行动作展示。
- 当前 main 缺口：缺错题卡主视觉和“第一念 -> 触发情境 -> 计划内外 -> 状态 -> 下次执行动作”的轻量卡片化路径。
- 可搬内容：`quick-choice-grid`、`quick-choice-pill`、`report-gate-hint`、`mistake-card`、轻量 upload actions、结果卡层级、错题卡用户可见结构。
- 不搬内容：整页 JS、`trade-review` module 旧业务、store 字段旧实现、API/data-binding 旧实现、`恐惧止损` 等旧风险词。
- 风险：错题卡分支本身是功能 + 字段分支，不是纯视觉分支；V1B 若要恢复错题卡视觉，必须同时做受控 JS/data migration，不能塞进“纯视觉”恢复。

### 活镜

- 推荐视觉源：本地 `feature/miniapp-ui-r1-release-polish`；远端 `origin/codex/miniapp-kline-training-v2` 可作辅助。
- 当前 main 状态：已有活镜成长台、九镜/心贼/训练动作等业务卡片，未完成 P11-V2 截图验收。
- 当前 main 缺口：视觉层级偏数据台，页面密度较高；需要验证是否符合“活镜空间”而不是后台面板。
- 可搬内容：页面头部、bridge card、card spacing、空状态、长期档案的轻视觉组织。
- 不搬内容：旧 growth/profile API、旧 store、旧 prescription 生成逻辑。
- 风险：活镜和 P9/P10 dashboard、growth、intervention 相关，视觉恢复时不能改 `dashboard-summary`、`dashboard-weekly`、execution consistency 等字段。

### 我的 / profile

- 推荐视觉源：本地 `feature/miniapp-ui-r1-release-polish`。
- 当前 main 状态：profile 仍外露较多深层卡片，截图中 `PROFILE · 我的心镜` 横向安全边距有裁切风险；当前 main 未完全采用候选分支的“档案与同步”折叠策略。
- 当前 main 缺口：profile 需要更轻的首屏：身份卡、统计、闭环心证链、再用折叠承接档案/同步/陪练摘要。
- 可搬内容：`profile-depth-toggle`、`profile-depth-stack`、profile 首屏留白和卡片层级、debug-only 内容的隐藏方式。
- 不搬内容：会员 / 订阅 / 助教承接显性入口、手机号同步业务、邀请码、同修身份、旧 store 绑定。
- 风险：这些内容不只是视觉，涉及产品边界和敏感数据；V1B 只能做可见层级收敛，不改用户数据逻辑。

### 训练收藏 / 执行计划

- 推荐视觉源：当前 main。
- 当前 main 状态：`training-bookmarks` 与 `execution-plan` 是 P8/P10/P11 之后必须保护的新闭环；所有候选分支在 diff 中都会删除这些页面。
- 当前 main 缺口：P11-V2 未完成截图 smoke，视觉是否达标待确认。
- 可搬内容：无批量视觉源可搬；最多在 V1B 中只做入口可见性和 spacing 检查。
- 不搬内容：候选分支中的删除、旧替代入口、旧 store。
- 风险：整包候选分支会直接删除这两组页面，是禁止 merge 的核心证据。

### 全局资产 / app.wxss / tabbar

- 推荐视觉源：`feature/miniapp-ui-r1-release-polish` 的 `app.wxss` 和品牌资产，只作局部参考。
- 当前 main 状态：已有 `miniprogram/assets/brand/ymty-zhao-logo.svg`、字体资产、`.brand-seal-frame` / `.brand-seal-art`；当前 main 没有 `miniprogram/custom-tab-bar` 目录。
- 当前 main 缺口：训练页仍有旧 `brand-zhao-mini` 手绘 logo；部分页面 logo 使用不统一。
- 可搬内容：品牌 logo 资产复用、global brand seal class、页面局部 logo 替换。
- 不搬内容：`app.json`、`custom-tab-bar`、底部 tab 新机制、全局 navigation 配置。
- 风险：候选分支新增 `custom-tab-bar` 且改 `app.json`，这会改变小程序全局导航机制，不能放入视觉恢复。

## A / B / C / D 矩阵

| 页面 / 区域 | A：可马上搬，纯视觉 | B：需 JS / 数据迁移 | C：不搬 | D：待单独审查 |
| --- | --- | --- | --- | --- |
| 首页 / 今日 | `single-focus` 完整布局、logo frame、卡片留白、完成态视觉、轻量 K线入口样式 | `homeFocusView` / `miniHomeView` 条件渲染差异，完成态 actions | 旧 API、旧 today state、整页 JS、`app.json` | 品牌文案是否恢复 `阳明心学交易系统 / 每日一页 · 照见本心` |
| K线训练 | 非 runtime 的页头、card spacing、抽象 K线观心视觉 | `runtimeView`、指标 overlay、拖动缩放、换片段、逐根盲练 | MA/BOLL/MACD/RSI/KDJ、仓位/盈亏/回撤、旧 kline JS/modules | 是否另立 K线 runtime V2 |
| 真实复盘 / 错题卡 | `quick-choice-grid`、`mistake-card` 视觉、结果卡层级 | 第一念/触发情境/错题类型/下次执行动作字段承接 | 旧 trade-review JS/module、旧 store、旧 API/data-binding | 错题卡产品字段是否按 P8/P10 schema 落位 |
| 活镜 | bridge card、空状态、卡片 spacing、视觉层级 | 周报、dashboard、growth、prescription 数据映射 | 旧 growth/store/API | 活镜页是否需要单独 V1B 截图标准 |
| 我的 / profile | 首屏卡片收敛、profile depth toggle 视觉、logo/spacing | 折叠状态字段、手机号绑定可见策略 | 会员、订阅、助教显性入口、邀请/同修身份外露 | 敏感数据和产品边界确认 |
| 训练页 | logo 统一、今日只练一件事卡片、折叠计划视觉 | `trainingDayFocus`、`showTrainingPlan`、`showTrainingDepth` | 旧 training JS、旧训练业务回退 | 训练页是否纳入 V1B 最小范围 |
| 训练收藏 | 无候选纯视觉源 | 无 | 候选分支删除内容 | 等 P11-V2 smoke 补截图 |
| 执行计划 | 无候选纯视觉源 | 无 | 候选分支删除内容 | 等 P11-V2 smoke 补截图 |
| 全局 / tabbar | `ymty-zhao-logo.svg`、brand seal class、页面 logo 替换 | 全局 tab 交互机制 | `custom-tab-bar`、`app.json`、project config | 是否未来单独做 tabbar 视觉升级 |

## 当前 main 必须保护的业务逻辑

后续 P11-V1B / V3 原则上不得被旧分支覆盖：

- `miniprogram/modules/intervention-engine/index.js`
- `miniprogram/modules/intervention-engine/index.test.js`
- `miniprogram/modules/zhixing-reminder/index.js`
- `miniprogram/modules/zhixing-reminder/index.test.js`
- `miniprogram/modules/execution-plan/index.js`
- `miniprogram/modules/execution-plan/index.test.js`
- `miniprogram/pages/execution-plan/**`
- `miniprogram/pages/training-bookmarks/**`
- `miniprogram/pages/kline-mind/index.js`
- `miniprogram/modules/kline-mind/index.js`
- `miniprogram/modules/kline-mind/index.test.js`
- `miniprogram/pages/trade-review/index.js`
- `miniprogram/modules/trade-review/index.js`
- `miniprogram/modules/trade-review/index.test.js`
- `miniprogram/utils/api.js`
- `miniprogram/utils/api.test.js`
- `miniprogram/utils/data-binding-adapter.js`
- `miniprogram/utils/data-binding-adapter.test.js`
- `miniprogram/utils/store.js`
- `miniprogram/user-visible-safety-copy.test.js`
- `miniprogram/brand-assets.test.js`

保护原因：

- 当前 main 已含 P8 sampling / `custom_session` / `training-bookmarks`。
- 当前 main 已含 P10 intervention / executionPlan / zhixing reminder。
- 当前 main 已含 P11 安全文案 guard。
- 当前 main 已含 data-binding adapter 和 dashboard-summary / dashboard-weekly 入口。
- 候选视觉分支会删除或回退上述能力。

## 安全文案风险

候选分支扫描发现：

- 多个候选分支命中 `止损`、`止盈`、`仓位上限`、`止损规则`、`恐惧止损`、`止盈过早之镜` 等旧表达。
- `feature/p1-review-error-card`、`feature/p1-review-error-type-storage`、`codex/miniapp-kline-training-v2` 在 `modules/trade-review/index.js` 中包含 `恐惧止损` 训练标签。
- `feature/miniapp-ui-r1-release-polish` 等分支在 `modules/stages/index.js` 中包含 `写下仓位上限`、`写下止损规则`。
- 当前 main 的 P0 扫描仅命中 `intervention-engine` guard 和测试中的禁词样例，不是用户可见文案。

处理策略：

- 视觉可搬，但文案必须重新过 P11 safety copy gate。
- 不得从候选分支搬回 `建议买入`、`建议卖出`、`目标价`、`买入信号`、`卖出信号`、`预测涨跌`、`收益提升`、`胜率提升`。
- 对 `止损` / `止盈` / `仓位上限` 这类交易动作词，只有内部 guard/test 可保留；用户可见训练文案需改写为“边界、计划、执行、一念、下次动作”。

## P11-V1B 建议

建议新开：

- `fix/p11-miniapp-visual-baseline-recovery-v3`

不建议：

- 继续当前 dirty 视觉尝试。
- 在 main 上直接修。
- merge / cherry-pick 任一候选分支。

建议最小修改范围：

- `miniprogram/pages/home/index.wxml`
- `miniprogram/pages/home/index.wxss`
- `miniprogram/pages/training/index.wxml`
- `miniprogram/pages/training/index.wxss`
- `miniprogram/pages/trade-review/index.wxml`
- `miniprogram/pages/trade-review/index.wxss`
- `miniprogram/pages/profile/index.wxml`
- `miniprogram/pages/profile/index.wxss`
- 必要时更新既有真实断言测试，不新增空测试。

禁止范围：

- `miniprogram/app.json`
- `miniprogram/custom-tab-bar/**`
- `miniprogram/pages/execution-plan/**`
- `miniprogram/pages/training-bookmarks/**`
- `miniprogram/pages/kline-mind/index.js`
- `miniprogram/modules/kline-mind/**`
- `miniprogram/pages/trade-review/index.js`
- `miniprogram/modules/trade-review/**`
- `miniprogram/modules/intervention-engine/**`
- `miniprogram/modules/zhixing-reminder/**`
- `miniprogram/modules/execution-plan/**`
- `miniprogram/utils/api.js`
- `miniprogram/utils/data-binding-adapter.js`
- `miniprogram/utils/store.js`

测试 gate：

- `node miniprogram/user-visible-safety-copy.test.js`
- `node miniprogram/brand-assets.test.js`
- `node miniprogram/modules/intervention-engine/index.test.js`
- `node miniprogram/modules/zhixing-reminder/index.test.js`
- `node miniprogram/modules/kline-mind/index.test.js`
- `node miniprogram/modules/trade-review/index.test.js`
- `node miniprogram/utils/api.test.js`
- `node miniprogram/utils/data-binding-adapter.test.js`
- `npm run test:data-binding --prefix server`
- `git diff --check`

验收标准：

1. 首页首屏不再像旧壳局部补丁。
2. 训练页 logo 与首页品牌系统统一。
3. 真实复盘页恢复错题卡视觉或明确进入 B 类迁移。
4. Profile 首屏信息收敛，敏感/深层内容不外露。
5. K线页不引入旧 runtime / 指标系统。
6. 训练收藏、执行计划入口不丢。
7. 无用户可见 P0 安全文案。
8. DevTools smoke 补齐首页、K线、复盘、活镜、我的、训练收藏、执行计划。

## 是否可以进入 P11-V1B

可以。

但进入的是“P11-V1B / V3 页面级视觉基线恢复”，不是 P11-2 完整真机 smoke。V1B 必须按本报告的页面级多源基线手工迁移，并把所有 B 类内容拆到后续单独任务。
