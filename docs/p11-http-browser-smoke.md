# P11-1 三端 HTTP / Browser smoke 报告

## P11-1 HTTP / Browser smoke 结论

结论：不通过。

本轮只做运行态 smoke 验证和报告生成，未修改业务代码，未新增测试，未修改 contracts，未修改页面文件。

阻断原因：

1. kline-service server 启动失败。
2. real-review server 启动失败。
3. 两个后端均因本地缺少 `alipay-sdk` 依赖而退出。
4. 后端不可用，因此未继续执行 kline-service HTTP smoke、real-review data-binding 写入 smoke、web-next 页面联调 smoke。
5. 静态安全文案扫描命中用户可见区域中的禁扫词，需要后续专项判断或修复。

## 是否可以进入 P11-2

不可以。

原因：

- 三个服务未全部启动成功。
- kline-service HTTP smoke 未执行完成。
- real-review data-binding HTTP smoke 未执行完成。
- web-next 页面 smoke 未执行完成。
- 安全文案扫描存在用户可见区域命中，需要先处理或明确豁免。

## 启动命令与端口

### kline-service

- 实际命令：`cd /Users/jianlinhe/Desktop/yangming-trading-system-kline-service/server && PORT=8787 node src/index.js`
- 端口：`8787`
- 结果：启动失败
- 错误：`Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'alipay-sdk' imported from .../server/src/services/payments/alipayPay.js`

### real-review server

- 实际命令：`cd /Users/jianlinhe/Desktop/yangming-trading-system-real-review/server && PORT=8790 node src/index.js`
- 端口：`8790`
- 结果：启动失败
- 错误：`Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'alipay-sdk' imported from .../server/src/services/payments/alipayPay.js`

### web-next

- 实际命令：`cd /Users/jianlinhe/Desktop/yangming-trading-system-real-review/web-next && PORT=3002 NEXT_PUBLIC_YM_API_BASE_URL=http://127.0.0.1:8790 NEXT_PUBLIC_YM_KLINE_API_BASE_URL=http://127.0.0.1:8787 ./node_modules/.bin/next dev --webpack`
- 端口：`3002`
- 结果：曾启动成功，日志显示 `Ready in 287ms`
- 处理：因后端启动失败，未继续页面 smoke；随后已停止 web-next 进程。

## API base

- real-review API base：`http://127.0.0.1:8790`
- kline-service API base：`http://127.0.0.1:8787`
- web-next env：
  - `NEXT_PUBLIC_YM_API_BASE_URL=http://127.0.0.1:8790`
  - `NEXT_PUBLIC_YM_KLINE_API_BASE_URL=http://127.0.0.1:8787`

## kline-service smoke 结果

未通过启动门槛，HTTP smoke 未执行。

计划 endpoint：

- `GET /api/v1/kline-history/catalog`
- `GET /api/v1/kline-history/instruments`
- `GET /api/v1/kline-segments`
- `POST /api/v1/kline-training/sample`

实际结果：

- 服务未在 `8787` 可用。
- 直连检查：`curl --noproxy '*' http://127.0.0.1:8787/api/v1/kline-history/catalog` 返回连接失败。
- 启动日志显示缺少 `alipay-sdk`。

## real-review data-binding smoke 结果

未通过启动门槛，data-binding HTTP smoke 未执行。

计划 endpoint：

- `GET /api/v1/data-binding/users/p11-smoke-user/summary`
- `POST /api/v1/data-binding/users/p11-smoke-user/kline-records`
- `POST /api/v1/data-binding/users/p11-smoke-user/training-bookmarks`
- `POST /api/v1/data-binding/users/p11-smoke-user/intervention-events`
- `GET /api/v1/data-binding/users/p11-smoke-user/intervention-events`
- `GET /api/v1/data-binding/users/p11-smoke-user/dashboard-summary?range=30d`
- `GET /api/v1/data-binding/users/p11-smoke-user/dashboard-weekly?week=current`
- `GET /api/v1/data-binding/users/p11-smoke-user/mirror-archive`

实际结果：

- 服务未在 `8790` 可用。
- 直连检查：`curl --noproxy '*' http://127.0.0.1:8790/api/v1/data-binding/users/p11-smoke-user/summary` 返回连接失败。
- 启动日志显示缺少 `alipay-sdk`。

## web-next 页面 smoke 结果

未完成。

web-next 曾在 `3002` 启动成功，但因 kline-service 与 real-review server 均启动失败，本轮没有继续执行页面 HTTP / Browser smoke。

计划页面：

- `/mirror-archive`
- `/living-mirror-center`
- `/living-mirror-growth`
- `/admin/training-packs`
- `/admin/kline-segments`

实际结果：

- 未验证页面 `200`。
- 未验证关键字。
- 未验证 `/living-mirror-center` 的“知行提醒分析”区块。
- 未执行浏览器 console 检查。

## 安全文案扫描结果

结论：存在静态命中，需要先处理或明确豁免后再进入 P11-2。

扫描命令：

`grep -R "建议买入\|建议卖出\|现在可以买\|现在该卖\|目标价\|止盈\|止损建议\|明日看涨\|明日看跌\|预测涨跌\|买入信号\|卖出信号\|收益提升\|胜率提升" -n miniprogram "$REAL_REVIEW_REPO/web-next/src" 2>/dev/null | head -300 || true`

命中分类：

### P0

用户可见页面或内容区域命中禁扫词，需在 P11-2 前修复或明确规则豁免：

- `web-next/src/components/home/ai-focus-section.tsx`：命中 `止盈过早之镜`
- `web-next/src/features/assessment/CycleMirror.tsx`：命中 `止盈过早循环`
- `web-next/src/features/assessment/practice-change.ts`：命中含 `止盈/持仓规则` 的用户动作文案

### P1

可能进入用户可见面的内容库 / 题材库命中，需要后续专项判断：

- `web-next/src/content/reflections/reflection-final-shenji-zeyou.json`
- `web-next/src/data/insight-engine/scenes/scene-18-profit-regret.json`
- `web-next/src/data/insight-engine/scenes/scene-06-floating-gain-fear.json`
- `web-next/src/data/insight-engine/practices.json`
- `web-next/src/data/insight-engine/evidences.json`
- `web-next/src/data/insight-engine/reflection-v2.json`
- `miniprogram/utils/content.js`
- `miniprogram/modules/zhixing-stability/index.js`

### N/A

禁止词清单或测试 guard 命中，不属于用户可见问题：

- `miniprogram/modules/intervention-engine/index.js`
- `miniprogram/modules/intervention-engine/index.test.js`
- `web-next/src/features/*/*.test.mjs`
- `web-next/src/features/one-thought-lake/oneThoughtLakeEngine.ts`

## runtime 备份 / 恢复结果

- smoke id：`p11-smoke-20260629-175535`
- backup dir：`/tmp/p11-smoke-20260629-175535`

备份内容：

- real-review：`server/data/runtime/data-binding-users.json`
- kline-service：`server/data/runtime/data-binding-users.json`

恢复结果：

- 已停止记录到的本轮服务 PID。
- 已从 backup dir 恢复 real-review runtime。
- 已从 backup dir 恢复 kline-service runtime。
- 恢复后 runtime JSON 仍为 ignored 文件，未进入 Git tracked diff。
- 恢复后三仓工作区干净。

## P0 / P1 / P2 问题

### P0

1. kline-service server 无法启动：缺少 `alipay-sdk`。
2. real-review server 无法启动：缺少 `alipay-sdk`。
3. 用户可见区域静态扫描命中禁扫词，需要修复或明确豁免。

### P1

1. web-next 可启动，但未完成页面 smoke；后端恢复后必须重跑。
2. 内容库 / 题材库存在 `止盈`、`卖出信号` 等命中，需要 P11-3 单独判断是否用户可见。
3. 初始 `curl` 未加 `--noproxy '*'` 时出现代理 503；后续 P11 smoke 必须显式绕过代理访问本机。

### P2

1. 后端启动建议优先使用 `npm run dev` 或 `npm install` 后的标准启动方式；本轮直接 `node src/index.js` 用于确认失败根因。
2. web-next 启动日志提示 workspace root 推断到 `/Users/jianlinhe/package-lock.json`，目前不阻断，但后续可在 web-next 配置中评估。

## 下一步建议

当前不应进入 P11-2。

建议先做一个 P11-1A 环境依赖与安全文案修复准备：

1. 在 real-review 和 kline-service 的 `server` 目录补齐本地依赖，至少确保 `alipay-sdk` 可解析。
2. 不改业务逻辑，仅恢复本地运行环境。
3. 处理或明确豁免用户可见区域中的禁扫词命中。
4. 重跑 P11-1 三端 HTTP / Browser smoke。

修复后再进入：

P11-1 三端 HTTP / Browser smoke 重跑。
