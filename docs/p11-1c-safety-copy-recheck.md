# P11-1C3 R2 安全文案复查与 P11-1 重跑准入报告

## P11-1C3 安全文案复查与重跑准入结论

结论：可以重跑 P11-1。

依据：

- P11-1B 已进入 `origin/main`，后端启动依赖恢复完成。
- P11-1C1 已进入 `origin/main`，小程序用户可见安全文案 P0 已修复。
- real-review P11-1C2 / P11-1C2b 已进入 `origin/main`，web-next 主体用户可见文案与 `/zhixing-scroll` 用户可见 P0 已修复。
- 小程序用户可见范围复扫无 P0 禁扫词。
- real-review / web-next 用户可见范围复扫无 P0 禁扫词。
- `/zhixing-scroll` 复扫仅剩测试 guard 禁词清单命中，无用户可见 P0。
- `real-review/server` 与 `kline-service/server` 均可解析 `alipay-sdk`。
- real-review 与 kline-service 工作区干净，且 `main...origin/main` 为 `0 0`。
- 三仓 P11-1 重跑前关键测试通过。

剩余命中均已分类为 guard / docs / 内部说明 / 内部分类正则 / P1 内容库专项，不阻断 P11-1 HTTP / Browser smoke 重跑。

## 小程序扫描结果

扫描命令：

```bash
grep -R "止盈\|止损\|仓位上限\|建议买入\|建议卖出\|现在可以买\|现在该卖\|目标价\|止损建议\|明日看涨\|明日看跌\|预测涨跌\|买入信号\|卖出信号\|收益提升\|胜率提升" -n miniprogram 2>/dev/null | head -800 || true
```

剩余命中分类：

- `miniprogram/user-visible-safety-copy.test.js`：D 类，测试禁词清单，豁免。
- `miniprogram/modules/intervention-engine/index.js`：D 类，安全 guard 禁止词清单，豁免。
- `miniprogram/modules/intervention-engine/index.test.js`：D 类，安全 guard 测试，豁免。
- `miniprogram/AGENTS.md`：E 类，内部说明，豁免。

小程序侧结论：无 A / B 类用户可见 P0。

## real-review / web-next 扫描结果

扫描命令：

```bash
grep -R "止盈\|止损\|仓位上限\|建议买入\|建议卖出\|现在可以买\|现在该卖\|目标价\|止损建议\|明日看涨\|明日看跌\|预测涨跌\|买入信号\|卖出信号\|收益提升\|胜率提升" -n "$REAL_REVIEW_REPO/web-next/src" "$REAL_REVIEW_REPO/server" "$REAL_REVIEW_REPO/packages" 2>/dev/null | head -1200 || true
```

`/zhixing-scroll` 单独复查命令：

```bash
grep -R "止盈\|止损\|仓位上限\|建议买入\|建议卖出\|现在可以买\|现在该卖\|目标价\|止损建议\|明日看涨\|明日看跌\|预测涨跌\|买入信号\|卖出信号\|收益提升\|胜率提升" -n "$REAL_REVIEW_REPO/web-next/src/features/zhixing-scroll" "$REAL_REVIEW_REPO/web-next/src/app" 2>/dev/null | head -500 || true
```

`/zhixing-scroll` 结果：

- 剩余命中仅在 `web-next/src/features/zhixing-scroll/zhixing-scroll.test.mjs` 的禁词清单中。
- `web-next/src/features/zhixing-scroll/zhixingScrollDefinitions.ts` 不再命中 `止损印 / 止损` 用户可见文案。
- 结论：`/zhixing-scroll` 用户可见 P0 已清除。

real-review / web-next 剩余命中分类：

- D 类豁免：
  - `web-next/src/features/zhixing-scroll/zhixing-scroll.test.mjs`
  - `web-next/src/features/zhixing-still-water/zhixing-still-water.test.mjs`
  - `web-next/src/features/one-thought-lake/one-thought-lake.test.mjs`
  - `server/scripts/interventions-test.mjs`
- F 类豁免：
  - `server/src/services/dataBinding.js`：advisory guard 禁止词清单。
  - `web-next/src/features/one-thought-lake/oneThoughtLakeEngine.ts`：输入过滤 / 安全 guard 正则。
  - `web-next/src/features/living-mirror-growth/behaviorLoopStorage.ts`、`web-next/src/features/assessment/cycle-mirror-data.ts`、`web-next/src/features/trade-review/trade-review.ts`：内部分类正则。
  - `web-next/src/lib/insight-engine/match-user-thought.ts`：内部匹配词表。
- C / P1：
  - `web-next/src/data/insight-engine/*.json`
  - `web-next/src/data/insight-engine/scenes/*.json`
  - `web-next/src/content/reflections/*.json`
  - `server/data/question-bank.json`
  - `server/data/kline-practice-bank.json`

P1 内容库说明：

这些命中属于历史题库、insight、reflection、practice、question-bank、K 线练习题库等内容资产。它们可能在后续 `/reflect`、`/assessment-result`、insight API、训练、replay 或 P11-2 真机路径中暴露，仍建议做专项内容库安全文案收口。但本轮 P11-1 HTTP / Browser smoke 的核心页面和服务准入不因此阻断。

## P0 / P1 / 豁免分类

P0：无。

P1：

- insight-engine、reflection、practice、question-bank、kline-practice-bank 等内容库仍存在 `止盈 / 止损` 等训练语义，需后续按实际页面 / API 暴露路径专项判断。
- `web-next build` 仍提示 Next.js workspace root 推断 warning，建议后续修正 `outputFileTracingRoot` 或整理多 lockfile 环境。
- 直接运行 `node --test src/features/zhixing-scroll/zhixing-scroll.test.mjs` 时，安全文案 guard 通过，但旧 route 挂载断言仍失败；按本任务规则记录为历史 route 挂载问题，不作为 P11-1 重跑阻断，除非后续确认影响当前 smoke 页面。

豁免：

- 测试禁词清单。
- 安全 guard 禁止词清单。
- 服务端 advisory guard。
- 内部分类、匹配、过滤正则。
- docs / AGENTS 内部说明。

## alipay-sdk 检查

real-review：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system-real-review/server
node -e "console.log(require.resolve('alipay-sdk'))"
```

结果：

```text
/Users/jianlinhe/Desktop/yangming-trading-system-real-review/server/node_modules/alipay-sdk/dist/commonjs/index.js
```

kline-service：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system-kline-service/server
node -e "console.log(require.resolve('alipay-sdk'))"
```

结果：

```text
/Users/jianlinhe/Desktop/yangming-trading-system-kline-service/server/node_modules/alipay-sdk/dist/commonjs/index.js
```

结论：P11-1 后端启动依赖阻断已解除。

## 三仓状态

miniprogram：

- 当前分支：`audit/p11-1c-safety-copy-recheck-r2`
- 当前状态：仅本报告变更。

real-review：

- 当前分支：`main`
- `main...origin/main`：`0 0`
- 工作区：干净。

kline-service：

- 当前分支：`main`
- `main...origin/main`：`0 0`
- 工作区：干净。

## 测试结果

miniprogram：

- `node miniprogram/user-visible-safety-copy.test.js`：通过。
- `node miniprogram/modules/intervention-engine/index.test.js`：通过。
- `node miniprogram/modules/zhixing-reminder/index.test.js`：通过。
- `node miniprogram/modules/kline-mind/index.test.js`：通过。
- `node miniprogram/modules/trade-review/index.test.js`：通过。
- `node miniprogram/utils/api.test.js`：通过。
- `node miniprogram/utils/data-binding-adapter.test.js`：通过。
- `npm run test:data-binding --prefix server`：通过。

real-review server：

- `npm run test:data-binding`：通过。
- `npm run test:dashboard-summary`：通过。
- `npm run test:interventions`：通过。
- `npm run test:execution-plans`：通过。
- `npm run check`：通过。

real-review web-next：

- `npm run test:living-mirror-center`：通过。
- `npm run test:mirror-archive`：通过。
- `npm run test:living-mirror-growth`：通过。
- `npm run test:data-binding`：通过。
- `npm run build`：通过，存在 Next.js workspace root 推断 warning，非阻断。
- `node --test src/features/zhixing-scroll/zhixing-scroll.test.mjs`：1 通过 / 1 失败；安全文案 guard 通过，route 挂载断言失败记录为历史问题，非 P11-1 重跑阻断。

kline-service：

- `npm run test:sampling`：通过。
- `npm run test:kline-segments`：通过。
- `npm run test:kline-history`：通过。
- `npm run check`：通过。

## 下一步建议

可以进入：

- P11-1 HTTP / Browser smoke 重跑。

重跑时仍需保持 P11-1 原约束：

- 先备份 runtime JSON。
- 使用 `p11-smoke-user`。
- smoke 后恢复 runtime JSON。
- 不提交 runtime JSON。
- 重新检查三仓工作区干净。

后续非阻断建议：

- P11-2 或 P11-3 前，对 insight / reflection / question-bank / kline-practice-bank 内容库做专项用户可见安全文案审查。
- 后续修复 web-next 的 workspace root warning。
- 后续清理 zhixing-scroll 旧 route 挂载断言问题，避免测试信号长期混杂。
