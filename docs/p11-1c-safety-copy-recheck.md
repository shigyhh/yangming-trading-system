# P11-1C3 安全文案复查与 P11-1 重跑准入报告

## P11-1C3 安全文案复查与重跑准入结论

结论：不通过，暂不可重跑 P11-1。

原因：

- 小程序用户可见范围已经没有 P0 禁扫词命中。
- `real-review/server` 与 `kline-service/server` 的 `alipay-sdk` 均可解析，P11-1 后端启动依赖阻断已恢复。
- 但 `real-review/web-next` 仍存在确认用户可见的 `止损` 命中：`/zhixing-scroll` 页面会渲染 `web-next/src/features/zhixing-scroll/zhixingScrollDefinitions.ts` 中的节点文案，且该页面可从 `/mind-archive` 与 `/mind-scroll` 进入。

因此，P11-1C3 不建议直接重跑 P11-1；应先补一个 web-next 安全文案修复分支，至少处理 `/zhixing-scroll` 用户可见 P0。

## 小程序扫描结果

扫描命令：

```bash
rg -n "止盈|止损|仓位上限|建议买入|建议卖出|现在可以买|现在该卖|目标价|止损建议|明日看涨|明日看跌|预测涨跌|买入信号|卖出信号|收益提升|胜率提升" miniprogram
```

剩余命中分类：

- `miniprogram/user-visible-safety-copy.test.js`：测试禁词清单，D 类豁免。
- `miniprogram/modules/intervention-engine/index.js`：安全 guard 禁止词清单，D 类豁免。
- `miniprogram/modules/intervention-engine/index.test.js`：guard 测试用例，D 类豁免。
- `miniprogram/AGENTS.md`：内部说明，E 类豁免。

小程序侧结论：无用户可见 P0。

## real-review / web-next 扫描结果

扫描命令：

```bash
rg -n --glob '!*.test.*' --glob '!*.test.mjs' "止盈|止损|仓位上限|建议买入|建议卖出|现在可以买|现在该卖|目标价|止损建议|明日看涨|明日看跌|预测涨跌|买入信号|卖出信号|收益提升|胜率提升" web-next/src server packages
```

确认 P0：

- `web-next/src/features/zhixing-scroll/zhixingScrollDefinitions.ts`
  - `name: "止损印"`
  - `description: "跌破规则还幻想，止损变成祈祷。"`
- `/zhixing-scroll` 页面直接使用 `zhixingScrollNodes` 渲染上述节点。
- `/mind-archive` 中存在 `router.push("/zhixing-scroll")`。
- `/mind-scroll` 中存在 `href="/zhixing-scroll"`。

P1 需要后续专项判断：

- `web-next/src/data/insight-engine/*.json`
- `web-next/src/data/insight-engine/scenes/*.json`
- `web-next/src/content/reflections/*.json`
- `server/data/question-bank.json`
- `server/data/kline-practice-bank.json`

这些属于历史题库、insight、reflection、practice 内容库，含大量 `止盈` / `止损` 语义。部分内容可能通过 `/reflect`、`/assessment-result`、insight API、训练或 replay 链路进入用户可见面；本轮未逐条确认运行路径，不能简单豁免，建议在修复 `/zhixing-scroll` 后追加内容库专项扫描。

豁免命中：

- `server/src/services/dataBinding.js`：服务端 advisory guard 禁止词清单。
- `server/scripts/interventions-test.mjs`：服务端 guard 测试用例。
- `web-next/src/features/one-thought-lake/oneThoughtLakeEngine.ts`：输入过滤 / 安全 guard 正则。
- `web-next/src/features/*/*.test.mjs`：测试 fixture 或 guard 校验。
- `web-next/src/features/*` 中仅用于分类、匹配或内部统计的正则命中，暂按 F 类开发内部逻辑处理；如其返回值进入用户端文案，需在后续专项中复核。

## P0 / P1 / 豁免分类

P0 阻断项：

- `real-review/web-next` 的 `/zhixing-scroll` 页面存在用户可见 `止损` 文案，阻断 P11-1 重跑。

P1 项：

- `insight-engine`、reflection、practice、question-bank、kline-practice-bank 等内容库仍有大量禁扫词，需要后续按实际页面 / API 暴露路径逐条确认。
- `web-next build` 有 Next.js workspace root 推断 warning，不阻断 smoke，但建议后续修正 `outputFileTracingRoot` 或整理多 lockfile 环境。

豁免项：

- 小程序和 real-review 的安全 guard 禁词清单。
- 禁扫词相关测试用例。
- 内部协议 / docs 说明。
- 内部分类、匹配、过滤正则，前提是不直接作为用户端文案输出。

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

结论：P11-1 中两个后端 server 因 `alipay-sdk` 缺失导致的启动阻断已解除。

## 三仓状态

miniprogram：

- 当前分支：`audit/p11-1c-safety-copy-recheck`
- 工作区：仅本报告待提交。

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

kline-service：

- `npm run test:sampling`：通过。
- `npm run test:kline-segments`：通过。
- `npm run test:kline-history`：通过。
- `npm run check`：通过。

## 下一步建议

下一步不要直接重跑 P11-1。

建议先执行：

- P11-1C4：`real-review/web-next` 用户可见安全文案补修。

最小修复范围：

- `web-next/src/features/zhixing-scroll/zhixingScrollDefinitions.ts`

建议替换：

- `止损印` → `风险处理印` / `按计划处理印`
- `跌破规则还幻想，止损变成祈祷。` → `规则已破还幻想，动作就会变成祈祷。`

修复后再做：

1. 复扫 `web-next/src`、`server`、`packages` 用户可见禁扫词。
2. 跑 web-next 页面测试和 build。
3. 如无 P0，再重跑 P11-1 三端 HTTP / Browser smoke。
