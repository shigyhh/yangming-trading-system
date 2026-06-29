# P11-1D web-next 真实浏览器渲染 smoke 报告

## P11-1D web-next 浏览器渲染 smoke 结论

结论：有条件通过。

本轮使用本机 Chrome headless + Chrome DevTools Protocol 做真实浏览器渲染检查，不再只依赖 curl 初始 HTML。5 个 web-next 页面均完成真实渲染，HTTP status 均为 200，页面关键字均命中，页面不空白，未发现 React runtime exception / hydration crash / pageerror。

有条件点：

- `/mirror-archive`、`/living-mirror-center`、`/living-mirror-growth` 真实渲染时存在后端 404 fetch console error。
- 404 来源为当前浏览器会话自动生成的 `web-...` 用户 ID 缺少 runtime 数据，页面已展示 fallback 提示，不影响渲染主链路。
- `/living-mirror-growth` 还请求了 `/api/v1/users/:user_id/living-mirror/growth` 并返回 404，页面显示 `dataGaps` 和 fallback。

以上列为 P1，不列为 P0。

## 是否可以进入 P11-2

可以。

理由：

1. 三端服务均启动成功。
2. 浏览器自动化成功执行。
3. 5 个页面真实渲染后关键字均命中。
4. `/living-mirror-center` 真实渲染后命中 `心镜数据中枢` / `活镜中枢`，并命中 `知行提醒分析`。
5. console / pageerror 无 P0；存在的 console error 为可见 fallback 覆盖的 404 数据缺口。
6. runtime 已恢复。
7. 三仓工作区干净。
8. 无用户可见 P0 安全文案。

## 浏览器自动化环境

- Playwright：不可用。
- Puppeteer：不可用。
- 使用方式：本机 Chrome headless + Chrome DevTools Protocol。
- Chrome：`Chrome/149.0.7827.200`
- CDP 端口：`9222`
- 临时脚本：`/tmp/p11-web-render-smoke-20260630-065907/render-smoke.mjs`
- 结果文件：`/tmp/p11-web-render-smoke-20260630-065907/results/browser-render-results.json`

## 页面结果

| 页面 | HTTP status | 关键字 | 是否命中 | console error | page error | 证据摘要 |
| --- | --- | --- | --- | ---: | ---: | --- |
| `/mirror-archive` | 200 | `心镜档案馆` / `心镜档案` | 是 | 2 | 0 | `心镜档案馆`、`档案加载失败，请稍后重试`、`已保留本地档案 fallback` |
| `/living-mirror-center` | 200 | `心镜数据中枢` / `活镜中枢` + `知行提醒分析` | 是 | 3 | 0 | `活镜中枢`、`心镜数据中枢`、`DashboardSummary`、`知行提醒分析` |
| `/living-mirror-growth` | 200 | `心镜成长谱` / `活镜成长谱` | 是 | 4 | 0 | `活镜成长谱`、`数据来源 unavailable`、`dataGaps` |
| `/admin/training-packs` | 200 | `训练包` | 是 | 0 | 0 | `训练包管理`、`训练包总数 8` |
| `/admin/kline-segments` | 200 | `K线片段` / `K 线片段` | 是 | 0 | 0 | `K线片段标注`、`片段管理` |

console error 明细：

- `/mirror-archive`
  - `GET /api/v1/data-binding/users/web-.../mirror-archive` -> 404
  - `GET /api/v1/data-binding/users/web-.../summary` -> 404
- `/living-mirror-center`
  - `GET /api/v1/data-binding/users/web-.../dashboard-summary?range=30d` -> 404
  - `GET /api/v1/data-binding/users/web-.../dashboard-weekly?week=current` -> 404
  - `GET /api/v1/data-binding/users/web-.../summary` -> 404
- `/living-mirror-growth`
  - `GET /api/v1/users/web-.../living-mirror/growth` -> 404
  - `GET /api/v1/data-binding/users/web-.../dashboard-summary?range=30d` -> 404
  - `GET /api/v1/data-binding/users/web-.../dashboard-weekly?week=current` -> 404
  - `GET /api/v1/data-binding/users/web-.../mirror-archive` -> 404

这些错误均有页面 fallback 承接，未导致空白页、Next error overlay、React runtime exception 或 pageerror。

## living-mirror-center 重点结果

- 看到 `活镜中枢`：是。
- 看到 `心镜数据中枢`：是。
- 看到 `知行提醒分析`：是。
- fallback 提示可见：是，页面显示 `连接未完成`、`接口不存在；用户不存在`、`已使用旧版汇总数据`。
- 是否空白：否。
- pageerror：0。

补充：本轮先用 `p11-smoke-user` 写入最小 interventionEvent 和 kline-record，`dashboard-summary` 返回 `interventions.totalCount = 1`。web-next 浏览器会话实际使用自动生成的 `web-...` 用户 ID，因此页面以 fallback 数据渲染；这不影响“真实浏览器渲染”本身，但建议后续 P11-2 真机/开发者工具 smoke 明确用户 ID 绑定路径。

## 安全文案扫描结果

小程序剩余命中：

- `miniprogram/user-visible-safety-copy.test.js`：测试禁词清单，豁免。
- `miniprogram/modules/intervention-engine/index.js`：安全 guard 禁词清单，豁免。
- `miniprogram/modules/intervention-engine/index.test.js`：安全 guard 测试，豁免。
- `miniprogram/AGENTS.md`：内部说明，豁免。

real-review / web-next 剩余命中：

- guard / test / 内部正则：
  - `web-next/src/features/zhixing-scroll/zhixing-scroll.test.mjs`
  - `web-next/src/features/one-thought-lake/oneThoughtLakeEngine.ts`
  - `web-next/src/features/living-mirror-growth/behaviorLoopStorage.ts`
  - `web-next/src/features/assessment/cycle-mirror-data.ts`
  - `web-next/src/features/trade-review/trade-review.ts`
  - `server/src/services/dataBinding.js`
- P1 内容库 / replay / insight：
  - `web-next/src/content/reflections/reflection-final-shenji-zeyou.json`
  - `web-next/src/data/insight-engine/*.json`
  - `web-next/src/data/insight-engine/scenes/*.json`
  - `server/data/question-bank.json`
  - `server/data/kline-practice-bank.json`

结论：无用户可见 P0；P1 内容库仍建议在 P11-2 / P11-3 前专项复核真实暴露路径。

## runtime 备份 / 恢复结果

- backup dir：`/tmp/p11-web-render-smoke-20260630-065907`
- real-review runtime：已备份，smoke 后已恢复。
- kline-service runtime：已备份，smoke 后已恢复。
- 服务进程：kline-service / real-review server / web-next / Chrome headless 均已停止。
- 端口：`8787 / 8790 / 3002 / 9222` 已无监听进程。
- 三仓工作区：恢复后均干净。

## P0 / P1 / P2 问题

### P0

无。

### P1

1. web-next 浏览器会话自动生成 `web-...` userId，未复用 `p11-smoke-user`，导致 `/mirror-archive`、`/living-mirror-center`、`/living-mirror-growth` 发生 data-binding 404 fetch console error。页面 fallback 可见，未阻断渲染。
2. `/living-mirror-growth` 请求 `/api/v1/users/:user_id/living-mirror/growth` 返回 404，页面通过 unavailable / dataGaps fallback 展示。建议后续确认该 legacy endpoint 是否仍应存在，或改为只使用 DashboardSummary / Archive 数据源。
3. P1 内容库 / replay / insight 仍包含 `止盈 / 止损` 等训练语义，需要按真实暴露路径专项复核。

### P2

1. Chrome headless stderr 有 GCM / GPU / chrome://newtab 噪声日志，未进入页面 console，不影响本轮结果。
2. web-next dev server 仍提示 workspace root 推断到 `/Users/jianlinhe/package-lock.json`，建议后续整理多 lockfile 或配置 `outputFileTracingRoot`。

## 下一步建议

可以进入 P11-2 小程序开发者工具 / 真机 smoke。

P11-2 重点建议：

1. 明确小程序 / web-next / real-review 的 userId 绑定路径，避免运行态 smoke 中写入 `p11-smoke-user` 但页面读取 `web-...`。
2. 真机 smoke 需要覆盖：真实复盘、今日训练、训练收藏与回放、知行提醒、interventionEvent 写入失败 fallback。
3. P11-3 前继续做内容库 / replay / insight 用户可见路径的安全文案专项复核。
