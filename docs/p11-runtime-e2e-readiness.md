# P11-0 发布前运行态联调准备审查

## P11-0 运行态联调准备审查结论

结论：需要先同步三仓。

本次只做只读审查和报告生成，未启动服务，未写运行态数据，未修改小程序、real-review、kline-service 的业务代码。

当前小程序仓库已基于最新 `origin/main` 创建审查分支，且 P10 总复审分支已进入 `origin/main`。但关联仓库本地工作区尚未全部同步到远端主线：

- real-review 本地 `main` 落后 `origin/main` 4 个提交。
- kline-service 本地 `main` 落后 `origin/main` 48 个提交。

因此 P11-1 不应直接在当前三仓本地状态下运行完整 HTTP / Browser smoke。P11-1 前需要先在 real-review 和 kline-service 的干净工作区同步到 `origin/main`，并确认端口映射与运行态写入隔离。

## 三仓状态

### miniprogram

- 仓库：`yangming-trading-system-miniprogram`
- 路径：`/Users/jianlinhe/Desktop/yangming-trading-system-miniprogram`
- 当前分支：`audit/p11-runtime-e2e-readiness`
- 基线：从最新 `origin/main` 创建
- 工作区：干净
- 关键结构：
  - `miniprogram/app.json` 存在
  - `miniprogram/pages/kline-mind` 存在
  - `miniprogram/pages/trade-review` 存在
  - `miniprogram/pages/living-mirror` 存在
  - `miniprogram/pages/training-bookmarks` 存在
  - `miniprogram/modules/intervention-engine` 存在
- 关键前置：
  - `audit/p10-zhixing-intervention-final-review` 已进入 `origin/main`，ancestor check 返回 `0`

### real-review

- 仓库：`yangming-trading-system-real-review`
- 路径：`/Users/jianlinhe/Desktop/yangming-trading-system-real-review`
- 当前分支：`main`
- 工作区：只读检查时干净
- 本地 `main`：`aecf58217103d5860a9c209f81f74d396863bc98`
- `origin/main`：`4a33a3aa7af7de466553b2ef89049986593310b6`
- 同步状态：`main...origin/main = 0 4`，本地 `main` 落后 4 个提交
- 关键前置：
  - `audit/p9-mirror-data-center-final-review` 已进入 `origin/main`，ancestor check 返回 `0`
  - `feature/p10-dashboard-intervention-analysis` 已进入 `origin/main`，ancestor check 返回 `0`
- P11-1 前置要求：
  - 需要先在 real-review 干净工作区同步到 `origin/main`

### kline-service

- 仓库：`yangming-trading-system-kline-service`
- 路径：`/Users/jianlinhe/Desktop/yangming-trading-system-kline-service`
- 当前分支：`main`
- 工作区：只读检查时干净
- 本地 `main`：`43d1afd9204c8b5c6c7334202936869f087b4292`
- `origin/main`：`4a33a3aa7af7de466553b2ef89049986593310b6`
- 同步状态：`main...origin/main = 0 48`，本地 `main` 落后 48 个提交
- 关键前置：
  - `feature/p8-kline-sampling-api` 已进入 `origin/main`，ancestor check 返回 `0`
  - `feature/p7-kline-segment-contract-api` 已进入 `origin/main`，ancestor check 返回 `0`
- P11-1 前置要求：
  - 需要先在 kline-service 干净工作区同步到 `origin/main`

## 启动命令与端口

### kline-service

- 启动命令候选：`cd /Users/jianlinhe/Desktop/yangming-trading-system-kline-service/server && npm run dev`
- 默认端口：`PORT || 8787`
- 默认 host：`HOST || 0.0.0.0`
- 关键能力：
  - `GET /api/v1/kline-history/catalog`
  - `GET /api/v1/kline-history/instruments`
  - `GET /api/v1/kline-history/slice`
  - `GET /api/v1/kline-segments`
  - `POST /api/v1/kline-training/sample`

### real-review server

- 启动命令候选：`cd /Users/jianlinhe/Desktop/yangming-trading-system-real-review/server && npm run dev`
- 默认端口：`PORT || 8787`
- 默认 host：`HOST || 0.0.0.0`
- 关键能力：
  - data-binding summary
  - kline records
  - training bookmarks
  - intervention events / rules
  - execution plans
  - dashboard summary / weekly
  - mirror archive
  - training packs

### web-next

- 启动命令候选：`cd /Users/jianlinhe/Desktop/yangming-trading-system-real-review/web-next && npm run dev`
- 默认端口：Next.js 默认 `3000`
- 核心页面：
  - `/mirror-archive`
  - `/living-mirror-center`
  - `/living-mirror-growth`
  - `/admin/training-packs`
  - `/admin/kline-segments`

### 小程序开发者工具 / 真机

- 使用微信开发者工具导入：`/Users/jianlinhe/Desktop/yangming-trading-system-miniprogram/miniprogram`
- 模拟器本机 API base 可使用 `http://127.0.0.1:8787`
- 真机联调需要使用局域网 IP，例如 `http://<LAN_IP>:8787`
- 真机需要确保手机和开发机在同一网络，并按微信开发者工具要求处理本地调试域名

### 端口冲突风险

kline-service 和 real-review server 默认都使用 `8787`。P11-1 如果需要同时启动两个 server，必须先明确端口策略：

- 方案 A：一个服务使用默认 `8787`，另一个通过 `PORT` 改到其他端口。
- 方案 B：只启动承载当前 endpoint 的单一服务，但必须确认 P11-1 endpoint 清单中的接口全部可达。
- 方案 C：用网关或代理统一端口，但这属于 P11-1 前需要明确的运行态方案，不应在 P11-0 中开发。

## API base 配置

### 小程序 API base

- 配置位置：`miniprogram/utils/api.js`
- 默认 base：`http://127.0.0.1:8787`
- storage key：
  - `zhixing_api_base`
  - `zhixing_api_base_enabled`
- 注意：代码存在未启用 API base 时的拦截逻辑。P11-2 真机 / 开发者工具 smoke 前，需要在小程序现有配置入口启用 API base。

### real-review web-next API base

- `NEXT_PUBLIC_YM_API_BASE_URL`
- `NEXT_PUBLIC_YM_KLINE_API_BASE_URL`
- 默认 fallback 可见为 `http://127.0.0.1:8787`
- P11-1 如果 real-review server 与 kline-service 分端口运行，需要同时配置两个 base，避免 web-next 管理页误打到同一个服务。

### kline-service API base

- 服务端通过 `PORT` / `HOST` 控制监听地址。
- 小程序和 web-next 不应硬编码生产域名，应通过现有 API base 配置指向 P11-1 本地服务。

## P11-1 HTTP smoke endpoint 清单

### kline-service

- `GET /api/v1/kline-history/catalog`
- `GET /api/v1/kline-history/instruments`
- `GET /api/v1/kline-history/slice`
- `GET /api/v1/kline-segments`
- `POST /api/v1/kline-training/sample`

### real-review

- `GET /api/v1/data-binding/users/:user_id/summary`
- `POST /api/v1/data-binding/users/:user_id/kline-records`
- `GET /api/v1/data-binding/users/:user_id/training-bookmarks`
- `POST /api/v1/data-binding/users/:user_id/training-bookmarks`
- `GET /api/v1/data-binding/users/:user_id/intervention-events`
- `POST /api/v1/data-binding/users/:user_id/intervention-events`
- `GET /api/v1/data-binding/users/:user_id/dashboard-summary?range=30d`
- `GET /api/v1/data-binding/users/:user_id/dashboard-weekly?week=current`
- `GET /api/v1/data-binding/users/:user_id/mirror-archive`
- `GET /api/v1/training-packs`

### web-next

- `GET /mirror-archive`
- `GET /living-mirror-center`
- `GET /living-mirror-growth`
- `GET /admin/training-packs`
- `GET /admin/kline-segments`

## 写入隔离策略

结论：不会污染 tracked Git 文件，但会修改本地持久 runtime JSON，P11-1 必须带隔离和清理策略。

审查结果：

- real-review 和 kline-service 均存在 `server/data/runtime/data-binding-users.json`。
- runtime 写入路径来自 `server/src/lib/store.js` 和 `server/src/config.js` 的 `runtimeDir`。
- 未发现可直接切换临时 runtime dir 的环境变量。
- `server/data/runtime/*.json` 被 `server/.gitignore` 忽略。
- `git ls-files` 未显示 runtime JSON 为 tracked 文件。
- `git status --short --untracked-files=all server/data/runtime` 未显示 runtime JSON 造成工作区污染。

P11-1 建议策略：

1. 使用专用测试用户：`p11-smoke-user`。
2. 写入前备份 runtime JSON：
   - real-review `server/data/runtime/data-binding-users.json`
   - kline-service `server/data/runtime/data-binding-users.json`
   - 如 smoke 会写训练包或片段，再备份 `training-packs.json` / `kline-segments.json`
3. smoke 后恢复备份或执行明确清理。
4. 不使用真实用户 ID。
5. 不把本地 ignored runtime 数据当成测试通过证据，需要同时验证 API 返回字段。

是否需要 smoke harness：

- 建议 P11-1 先写或使用一次性 smoke harness / 脚本化流程，但该 harness 不应在 P11-0 中新增。
- 如果 P11-1 不新增 harness，也必须用手动备份 / 恢复步骤保证可回滚。

## P11-2 真机 / 开发者工具 smoke 清单

1. 真实复盘生成错题卡。
2. 活镜统计查看。
3. 今日针对训练调用 sampling。
4. 专项训练调用 sampling。
5. 自选盲练。
6. 训练收藏与回放。
7. 知行提醒：
   - before_training
   - during_training
   - after_review
8. interventionEvent 写入失败不阻断训练或复盘。
9. P9 页面读取：
   - dashboard summary
   - mirror archive
   - living mirror growth

## P11-3 用户可见安全文案扫描范围

P11-3 建议单独做用户可见安全文案扫描报告。

### 小程序扫描路径

- `miniprogram/pages`
- `miniprogram/modules`
- `miniprogram/utils`

关注词：

- 建议买入
- 建议卖出
- 现在可以买
- 现在该卖
- 目标价
- 止盈
- 止损建议
- 明日看涨
- 明日看跌
- 预测涨跌
- 买入信号
- 卖出信号
- 收益提升
- 胜率提升

已观察到的命中类型：

- intervention engine 禁止词 guard 和测试 fixture，属于非阻塞。
- 旧内容别名或训练题材中存在“止盈”等词，需要 P11-3 判定是否进入用户可见面。

### real-review 扫描路径

- `web-next/src`
- `server`
- `packages`

重点关注：

- `/living-mirror-center`
- `/mirror-archive`
- `/living-mirror-growth`
- `web-next/src/data/insight-engine`
- `server/data/question-bank.json`
- `server/data/kline-practice-bank.json`
- `server/src/services/zhixingReplay.js`
- data-binding / intervention guard 测试和禁止词清单

判断规则：

1. 如果命中用户端页面文案，列为 P0。
2. 如果命中测试 guard 或禁止词清单，标记为非阻塞证据。
3. 如果命中题库 / replay / historical content，需要确认是否会在 P11-2 真机或 web 页面展示。
4. P11-3 需要同时扫描小程序、web-next、server 返回文案和 packages content / contracts 相关 mock。

## P11 通过标准

P11 发布准入至少需要满足：

1. 三仓同步最新 `origin/main`。
2. 三端服务能按约定端口启动。
3. HTTP smoke 通过。
4. 小程序真机 / 微信开发者工具 smoke 通过。
5. web-next 核心页面返回 200 且无新增 console error。
6. intervention / bookmark / sampling 数据不丢。
7. 用户端无交易建议 / 买卖信号 / 实盘监控文案。
8. 有明确 fallback 和错误提示。
9. runtime 写入有隔离和清理策略。
10. kline-service 不承接 intervention 策略，只提供 K 线、segment、sampling metadata。

## 下一步建议

当前不建议直接进入 P11-1 smoke 执行。

必须先做：

1. 在 real-review 干净工作区同步 `main` 到 `origin/main`。
2. 在 kline-service 干净工作区同步 `main` 到 `origin/main`。
3. 确认 kline-service 与 real-review server 的端口分配，避免默认 `8787` 冲突。
4. 明确 P11-1 runtime JSON 备份 / 恢复流程，统一测试用户 `p11-smoke-user`。

完成以上准备后，下一步进入：

P11-1 三端 HTTP / Browser smoke。
