# P11-1A runtime smoke blocker triage

## P11-1A runtime smoke blocker triage 结论

结论：需要先同步外仓。

本次只做只读审查和报告生成，未安装依赖，未启动服务，未写 runtime 数据，未修改小程序、real-review、kline-service 的业务代码。

当前小程序仓库为 `yangming-trading-system-miniprogram`，目标审查分支从最新 `origin/main` 创建。P11-1 报告 `docs/p11-http-browser-smoke.md` 已进入 `origin/main`，ancestor check 返回 `0`。

关联仓库状态：

- real-review：当前分支 `main`，工作区干净，本地 `main...origin/main = 0 2`，本地 `main` 落后 `origin/main` 2 个提交。
- kline-service：当前分支 `main`，工作区干净，本地 `main...origin/main = 0 2`，本地 `main` 落后 `origin/main` 2 个提交。

因此，进入任何修复分支或重跑 P11-1 前，应先在两个外仓的干净工作区同步到最新 `origin/main`。

## alipay-sdk 阻断分析

### real-review

命中位置：

- `server/src/routes/router.js` 静态导入 `../services/payments/index.js`。
- `server/src/services/payments/index.js` 静态导入 `./alipayPay.js`。
- `server/src/services/payments/alipayPay.js` 顶层 `import { AlipaySdk } from "alipay-sdk"`。
- 支付相关路由包括 `POST /api/pay/alipay/notify`。

依赖状态：

- `server/package.json` 已声明 `"alipay-sdk": "^4.14.0"`。
- `server/package-lock.json` 已包含 `node_modules/alipay-sdk`，resolved 到 `alipay-sdk-4.14.0.tgz`。
- 在 real-review 根目录执行 `require.resolve("alipay-sdk")` 失败。
- 在 real-review `server` 目录执行 `require.resolve("alipay-sdk")` 失败。

判断：

- 不是 package.json 缺声明，也不是 lockfile 缺记录。
- 直接原因是本地 `server/node_modules` 未安装或不完整。
- 深层风险是 server 启动路径无条件加载支付模块；即使 P11-1 smoke 不测试支付，只要 `alipay-sdk` 缺失，server 就无法启动。
- real-review server 承接 YMTY / 支付能力，保留 `alipay-sdk` 依赖是合理的。

最小修复建议：

1. 先同步 real-review 本地 `main` 到 `origin/main`。
2. 在 real-review `server` 目录恢复已声明依赖，例如使用 lockfile 安装。
3. 若发布前希望降低非支付 smoke 的脆弱性，再单独评估支付模块可选加载；这不是 P11-1 重跑的最小前置。

### kline-service

命中位置：

- `server/src/routes/router.js` 静态导入 `../services/payments/index.js`。
- `server/src/services/payments/index.js` 静态导入 `./alipayPay.js`。
- `server/src/services/payments/alipayPay.js` 顶层 `import { AlipaySdk } from "alipay-sdk"`。
- 仓库中同样存在 YMTY / payment / refund 相关服务与测试脚本。

依赖状态：

- `server/package.json` 已声明 `"alipay-sdk": "^4.14.0"`。
- `server/package-lock.json` 已包含 `node_modules/alipay-sdk`，resolved 到 `alipay-sdk-4.14.0.tgz`。
- 在 kline-service `server` 目录执行 `require.resolve("alipay-sdk")` 失败。

判断：

- 短期直接原因同样是本地 `server/node_modules` 未安装或不完整。
- 但从职责边界看，kline-service 应提供 K 线、segment、sampling metadata，不应承接支付策略或支付 SDK 强依赖。
- 当前 kline-service 看起来包含了与 real-review server 同源的支付模块；这会让 K 线 smoke 被支付依赖阻断。

最小修复建议：

1. 先同步 kline-service 本地 `main` 到 `origin/main`。
2. 若只是为了重跑 P11-1，先恢复 `server` 目录已声明依赖即可让启动继续。
3. 更稳的结构修复应在 kline-service 单独分支中把支付模块从 K 线启动路径剥离，或至少改为按支付路由动态加载，避免非支付服务强依赖 `alipay-sdk`。

## 建议修复分支

### 1. real-review 依赖修复分支

- 建议分支名：`chore/p11-real-review-runtime-deps`
- 目标仓库：`yangming-trading-system-real-review`
- 修改范围：
  - 若同步后 `server/package.json` / `server/package-lock.json` 仍已声明 `alipay-sdk`，优先不改代码，只恢复本地依赖并重跑 smoke。
  - 如发现 lockfile 与 package 不一致，才在该分支补齐依赖声明和 lockfile。
  - 可选增强：将支付 SDK 加载从 server 启动期改为支付路由调用期，但这不是重跑 P11-1 的最小修复。
- 测试命令：
  - `npm run check --prefix server`
  - `npm run test:data-binding --prefix server`
  - `npm run test:dashboard-summary --prefix server`
  - `npm run test:interventions --prefix server`
  - `npm run test:ymty --prefix server`，如涉及支付加载方式

### 2. kline-service 依赖 / 边界修复分支

- 建议分支名：`feature/p11-kline-service-payment-decoupling`
- 目标仓库：`yangming-trading-system-kline-service`
- 修改范围：
  - 短期：同步后恢复 `server` 目录已声明依赖，确认 `alipay-sdk` 可解析。
  - 结构修复：从 K 线服务启动路径移除支付模块强依赖，或让支付相关 import 只在支付路由真正调用时发生。
  - 不应把 intervention / dashboard / payment 策略继续塞进 kline-service。
- 测试命令：
  - `npm run check --prefix server`
  - `npm run test:kline-history --prefix server`
  - `npm run test:kline-segments --prefix server`
  - `npm run test:sampling --prefix server`
  - 如保留支付模块，再补充相关支付启动回归

### 3. 安全文案修复分支

- 建议分支名：`feature/p11-safety-copy-cleanup`
- 目标仓库：
  - `yangming-trading-system-miniprogram`
  - `yangming-trading-system-real-review`
- 修改范围：
  - 只改用户可见文案和内容映射。
  - 不改业务逻辑、不改训练规则、不改 API。
  - 不做简单全局替换，按用户可见路径逐项替换。

建议替换：

- `止盈过早之镜` -> `盈利后提前退出之镜` 或 `盈利后执行偏离之镜`
- `止盈过早循环` -> `盈利后提前退出循环` 或 `盈利后执行偏离循环`
- `开盘前写下止盈/持仓规则。` -> `开盘前写下盈利后的退出动作与观察规则。`
- `止盈后继续涨` -> `退出后仍继续上涨`
- `刚刚止盈后` -> `刚刚按计划退出后`
- `记录一次按计划止盈的交易。` -> `记录一次按计划退出的交易。`
- `按规则移动止盈，不情绪离场。` -> `按规则调整退出动作，不情绪离场。`
- `止损：...；止盈：...` -> `风险边界：...；盈利后的退出动作：...`
- `卖出信号` -> `情绪触发信号` 或 `执行偏离提示`

## 禁扫词命中分类

### A. 用户可见页面文案

P0，必须修：

- `miniprogram/utils/content.js`
  - `aliases: ["止盈过早之镜", "焦虑之镜"]`
  - 该别名可能被人格 / 镜像文案展示复用。
- `miniprogram/modules/zhixing-stability/index.js`
  - actionMap key：`"止盈过早之镜"`
  - 若上游 mirror 命中该 key，会影响用户可见的主修提醒。
- `real-review/web-next/src/components/home/ai-focus-section.tsx`
  - `title: "止盈过早之镜"`
- `real-review/web-next/src/features/assessment/CycleMirror.tsx`
  - `title: "止盈过早循环"`
- `real-review/web-next/src/features/assessment/practice-change.ts`
  - `actions: ["开盘前写下止盈/持仓规则。", ...]`

### B. API 返回用户可见文案

P0，必须修：

- `server/src/services/zhixingReplay.js`
  - `summarizePlan()` 返回 `方向 / 止损 / 止盈 / 仓位上限 / 戒律`
  - 这是服务端拼接的 replay 文案，可能通过 API 进入用户可见面。
- real-review 和 kline-service 同路径均存在该实现。

### C. 历史题库 / replay / practice content，可能用户可见

P1，需要专项判断；若确认会在 P11-2 真机或 web 页面直接展示，应提升为 P0：

- `server/data/question-bank.json`
  - `question_text` 包含 `合理止盈`、`止盈纪律`
  - `scene_tag` 包含 `小亏、止盈过早`
  - `question_text` 包含 `目标价`
- `server/data/kline-practice-bank.json`
  - 大量 prompt 包含 `刚刚止盈后`
- `real-review/web-next/src/content/reflections/reflection-final-shenji-zeyou.json`
  - `刚止盈它又冲高时`
  - `止盈后你又嫌自己少拿`
- `real-review/web-next/src/data/insight-engine/scenes/scene-18-profit-regret.json`
  - `sceneName: "止盈后继续涨"`
  - practice / reflection 中多处 `止盈`
- `real-review/web-next/src/data/insight-engine/scenes/scene-06-floating-gain-fear.json`
  - 包含 `止盈` 相关训练表达
- `real-review/web-next/src/data/insight-engine/practices.json`
  - `把止盈规则写在眼前`
  - `按规则移动止盈`
- `real-review/web-next/src/data/insight-engine/evidences.json`
  - `焦虑不是卖出信号`
- `real-review/web-next/src/data/insight-engine/reflection-v2.json`
  - 多处 `止盈后继续涨`
- `real-review/web-next/src/data/insight-engine/scene-profiles.ts`
  - sceneName / aliases / keywords 包含 `止盈`

### D. 测试 guard / 禁止词清单

可豁免，但应在扫描报告中说明：

- `miniprogram/modules/intervention-engine/index.js`
- `miniprogram/modules/intervention-engine/index.test.js`
- `server/src/services/dataBinding.js`
- `server/scripts/interventions-test.mjs`
- `real-review/web-next/src/features/one-thought-lake/oneThoughtLakeEngine.ts`
- `real-review/web-next/src/features/*/*.test.mjs`
- `real-review/web-next/src/data/insight-engine/insight-engine.test.mjs`
- `real-review/web-next/src/lib/insight-engine/match-user-thought.test.ts`

这些命中用于拦截或测试禁词，不属于用户可见违规。

### E. docs 内部说明

可豁免：

- `docs/p11-http-browser-smoke.md`
- `docs/p11-runtime-e2e-readiness.md`
- `docs/p10-zhixing-intervention-readiness.md`
- `docs/p10-3-cross-end-intervention-smoke.md`
- `docs/p10-6-cross-end-intervention-dashboard-smoke.md`
- `docs/p10-zhixing-intervention-final-review.md`
- `docs/p7-cross-repo-foundation-alignment.md`
- `docs/p1-5-loop-final-review.md`

这些文档用于规则记录、审查证据或禁词清单，不直接作为用户端产品文案。

### F. 非用户可见开发注释 / 生成脚本

可豁免或低优先级：

- `server/scripts/generate-kline-bank.mjs`
  - seed 场景词 `刚刚止盈后`
  - 如果生成结果会进入题库展示，则应按 C 类治理；脚本自身不构成用户可见文案。

## P0 阻断项

1. real-review 本地 `main` 落后 `origin/main` 2 个提交，修复或重跑前必须同步。
2. kline-service 本地 `main` 落后 `origin/main` 2 个提交，修复或重跑前必须同步。
3. real-review server 本地缺少已声明的 `alipay-sdk`，导致启动失败。
4. kline-service server 本地缺少已声明的 `alipay-sdk`，导致启动失败。
5. 用户可见页面和小程序文案中存在 `止盈` 相关命中。
6. `zhixingReplay.js` 可能通过 API 返回 `止损 / 止盈 / 仓位上限` 等用户可见文案。

## P1 / P2 项

### P1

- 历史题库、K 线练习题库、insight-engine 内容中存在大量 `止盈`、`卖出信号`、`目标价` 命中。需要确认哪些会进入 P11-2 用户路径。
- kline-service 包含 payment / YMTY 路由和支付 SDK 强依赖，与 K 线服务职责存在重叠。
- 两个外仓当前落后本次小程序 `origin/main`，可能导致后续报告或 smoke 看到旧文档 / 旧 runtime 准备状态。

### P2

- real-review 可考虑将支付 SDK 从 server 启动期加载改为按支付路由调用期加载，减少非支付 smoke 被支付依赖阻断。
- 后续安全扫描建议建立分类清单，避免 guard/test/docs 命中反复被误判为 P0。

## 是否可以直接重跑 P11-1

不可以。

原因：

1. real-review 和 kline-service 本地 `main` 均落后 `origin/main`。
2. 两个后端的 `alipay-sdk` 仍不可解析。
3. 用户可见页面 / API 文案仍存在 P0 禁扫词命中。
4. P11-1 的后端启动阻断和安全文案阻断均未解决。

## 下一条 Codex 命令建议

建议下一条先做：

P11-1B 三仓同步与运行依赖恢复，不开发业务功能。

目标：

1. 在 real-review 和 kline-service 干净工作区同步本地 `main` 到最新 `origin/main`。
2. 在两个仓库 `server` 目录恢复已声明依赖，确认 `require.resolve("alipay-sdk")` 成功。
3. 不修改 package.json / lockfile，除非同步后发现依赖声明缺失。
4. 不启动完整 smoke，只做依赖解析和工作区干净确认。

随后再做：

P11-1C 用户可见安全文案修复。

修复完成后，才重跑：

P11-1 三端 HTTP / Browser smoke。
