# P11-1 Rerun 三端 HTTP / Browser smoke 报告

## P11-1 Rerun HTTP / Browser smoke 结论

结论：有条件通过。

本轮已经解决上一轮两个 P0 阻断：

- `real-review/server` 与 `kline-service/server` 均可解析 `alipay-sdk`，两个后端均可启动。
- 小程序、real-review / web-next 用户可见安全文案复扫未发现 P0。

本轮已通过：

- kline-service HTTP smoke。
- real-review data-binding 写入 / 读取 / dashboard smoke。
- runtime 备份与恢复。
- 三仓工作区恢复干净。

仍未完全通过：

- web-next 页面 HTTP status 均为 200，但 curl 获取的是 Next 初始 HTML / loading fallback，部分页面未命中任务要求的精确关键字：
  - `/mirror-archive`：有 `正在整理心镜档案`，未命中 `心镜档案馆`。
  - `/living-mirror-center`：有 `正在读取活镜中枢`，未命中 `心镜数据中枢` / `知行提醒分析`。
  - `/living-mirror-growth`：命中 `活镜成长谱`。
  - `/admin/training-packs`：命中 `训练包`。
  - `/admin/kline-segments`：命中 `K线片段`。
- 当前环境没有 Playwright / `@playwright/test`，未完成真实浏览器渲染后的关键字与 console 检查。

## 是否可以进入 P11-2

不可以。

原因：P11-2 的前置条件要求 web-next 页面 smoke 通过。本轮 web-next 只完成 HTTP 200 与非空 fallback 验证，未完成浏览器渲染态页面关键字验证，因此不能输出“可以进入 P11-2”。

## 与上一轮 P11-1 对比

- `alipay-sdk`：已解决。两个 server 均可启动并响应 HTTP 请求。
- 安全文案 P0：已解决。剩余命中均为 guard / docs / 内部正则 / P1 内容库专项。
- 端口：使用推荐端口 `8787 / 8790 / 3002`，启动前端口未被占用。
- proxy：本轮所有 curl 均使用 `--noproxy '*'`；未再出现本机请求被代理拦截问题。
- runtime：本轮先备份再写入，结束后已恢复。

## 启动命令与端口

kline-service：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system-kline-service/server
PORT=8787 npm run dev
```

real-review server：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system-real-review/server
PORT=8790 npm run dev
```

web-next：

```bash
cd /Users/jianlinhe/Desktop/yangming-trading-system-real-review/web-next
PORT=3002 NEXT_PUBLIC_YM_API_BASE_URL=http://127.0.0.1:8790 NEXT_PUBLIC_YM_KLINE_API_BASE_URL=http://127.0.0.1:8787 npm run dev
```

服务状态：

- `8787`：启动成功，HTTP 可访问。
- `8790`：启动成功，HTTP 可访问。
- `3002`：启动成功，HTTP 可访问。

## API base

- real-review API base：`http://127.0.0.1:8790`
- kline-service API base：`http://127.0.0.1:8787`
- web-next env：
  - `NEXT_PUBLIC_YM_API_BASE_URL=http://127.0.0.1:8790`
  - `NEXT_PUBLIC_YM_KLINE_API_BASE_URL=http://127.0.0.1:8787`

## kline-service smoke 结果

全部使用 `curl --noproxy '*'`。

- `GET /api/v1/kline-history/catalog`：HTTP 200。
- `GET /api/v1/kline-history/instruments`：HTTP 200。
- `GET /api/v1/kline-segments`：HTTP 200。
- `POST /api/v1/kline-training/sample`：HTTP 200。

sample 验收结果：

```json
{
  "sampleOk": true,
  "bars": 60,
  "fallbackUsed": true,
  "fallbackReason": "no_matching_segment"
}
```

结论：通过。sample 未返回空成功结果，未报 500；返回 bars，并带 fallback metadata。

## real-review data-binding smoke 结果

全部使用 `curl --noproxy '*'`，用户为 `p11-smoke-user`。

- `GET /api/v1/data-binding/users/p11-smoke-user/summary`：写入前 HTTP 404，返回 `用户不存在`。该结果说明服务与路由可用，但测试用户尚无 runtime 数据。
- `POST /api/v1/data-binding/users/p11-smoke-user/kline-records`：HTTP 200。
- `POST /api/v1/data-binding/users/p11-smoke-user/training-bookmarks`：HTTP 201。
- `POST /api/v1/data-binding/users/p11-smoke-user/intervention-events`：HTTP 201。
- `GET /api/v1/data-binding/users/p11-smoke-user/intervention-events`：HTTP 200。
- `GET /api/v1/data-binding/users/p11-smoke-user/dashboard-summary?range=30d`：HTTP 200。
- `GET /api/v1/data-binding/users/p11-smoke-user/dashboard-weekly?week=current`：HTTP 200。
- `GET /api/v1/data-binding/users/p11-smoke-user/mirror-archive`：HTTP 200。

验收结果：

```json
{
  "summaryBeforeStatus": 404,
  "writesOk": true,
  "dashboardHasInterventions": true,
  "bookmarkNoBars": true
}
```

结论：通过。写入接口成功，读取接口字段可读，dashboard-summary 返回 interventions 区块，training bookmarks 未保存完整 bars，intervention message 不含交易建议词。

## web-next 页面 smoke 结果

全部使用 `curl --noproxy '*'`。

- `/mirror-archive`：HTTP 200；HTML 中有 `正在整理心镜档案`，未命中 `心镜档案馆`。
- `/living-mirror-center`：HTTP 200；HTML 中有 `正在读取活镜中枢`，未命中 `心镜数据中枢` / `知行提醒分析`。
- `/living-mirror-growth`：HTTP 200；命中 `活镜成长谱`。
- `/admin/training-packs`：HTTP 200；命中 `训练包`。
- `/admin/kline-segments`：HTTP 200；命中 `K线片段`。

补充说明：

- curl 初始 HTML 中包含 Next dev 的 not-found 边界片段，因此不能仅凭 `404: This page could not be found` 字样判定页面失败。
- 服务日志显示五个页面均返回 200。
- 当前环境未安装 Playwright / `@playwright/test`，未完成真实浏览器渲染后的关键字与 console 检查。

结论：有条件通过。HTTP 层可访问且非空，但未满足全部关键字验收；建议补一个真实浏览器渲染 smoke 或调整页面 HTTP smoke 关键字为服务端初始 fallback 文案。

## 安全文案扫描结果

小程序剩余命中：

- `miniprogram/user-visible-safety-copy.test.js`：测试禁词清单，豁免。
- `miniprogram/modules/intervention-engine/index.js`：安全 guard 禁词清单，豁免。
- `miniprogram/modules/intervention-engine/index.test.js`：安全 guard 测试，豁免。
- `miniprogram/AGENTS.md`：内部说明，豁免。

real-review / web-next 剩余命中：

- guard / 测试 / 内部正则：
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

- backup dir：`/tmp/p11-smoke-rerun-20260629-232305`
- real-review runtime：已备份，smoke 后已恢复。
- kline-service runtime：已备份，smoke 后已恢复。
- 服务进程：kline-service / real-review server / web-next 均已停止。
- 端口：`8787 / 8790 / 3002` 已无监听进程。
- 三仓工作区：恢复后均干净。

## P0 / P1 / P2 问题

### P0

无。

### P1

1. web-next 页面 smoke 未完成真实浏览器渲染验证；curl 初始 HTML 未满足全部关键字验收。
2. P1 内容库 / replay / insight 中仍有 `止盈 / 止损` 等训练语义，需后续按真实用户路径专项复核。
3. `GET /data-binding/users/p11-smoke-user/summary` 在写入前返回 404 `用户不存在`，不阻断写入链路，但后续 smoke harness 可以先写入再查 summary，避免把空用户状态误判成服务不可用。

### P2

1. web-next dev/build 持续提示 workspace root 推断到 `/Users/jianlinhe/package-lock.json`，建议后续配置 `outputFileTracingRoot` 或整理多 lockfile 环境。
2. 若 P11-2 仍要求浏览器 smoke，建议补最小 Playwright 依赖或提供独立浏览器验证脚本，但不要在 smoke 报告分支中新增空测试。

## 下一步建议

不建议直接进入 P11-2。

建议先做：

- P11-1D：web-next 真实浏览器渲染 smoke / 页面关键字验收补跑。

如果团队接受 HTTP fallback 的 loading 文案作为页面可用证明，也至少应把 P11-1 的页面关键字标准更新为当前服务端初始 HTML 可稳定命中的文案，然后再进入 P11-2。
