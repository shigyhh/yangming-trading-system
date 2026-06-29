# P11-2 小程序开发者工具 / 真机 smoke 验收清单与执行记录模板

## P11-2 小程序开发者工具 / 真机 smoke 目标

本轮验证小程序真实运行链路，而不是代码推断或单元测试替代。

验证范围：

- 小程序真实页面运行。
- API base 是否可用。
- 页面跳转是否正常。
- 用户交互是否正常。
- 失败 fallback 是否可见。
- 真实复盘、K线训练、训练收藏、知行提醒、活镜联动是否形成端到端闭环。

边界：

- 不验证交易信号。
- 不做买卖建议。
- 不做实盘监控。
- 不以 HTTP 200 或代码扫描替代开发者工具 / 真机页面表现。

## 环境准备

1. 微信开发者工具版本：
   - 待填写
2. 真机型号：
   - 待填写
3. 小程序基础库版本：
   - 待填写
4. API base：
   - real-review server：待填写，例如 `http://127.0.0.1:8790`
   - kline-service：待填写，例如 `http://127.0.0.1:8787`
5. 后端服务：
   - kline-service：`8787` 或实际环境
   - real-review server：`8790` 或实际环境
6. web-next：
   - `3002` 或实际环境
7. 测试用户：
   - `p11-smoke-user` 或实际用户
8. 运行前检查：
   - real-review server 已启动：待填写
   - kline-service 已启动：待填写
   - web-next 已启动：待填写
   - 小程序开发者工具合法域名 / 不校验合法域名设置：待填写
   - runtime 备份路径：待填写

## 验收路径 1：真实复盘 → 错题卡 → 复盘后提醒

步骤：

1. 打开真实复盘页。
2. 填写一条复盘。
3. 生成错题卡。
4. 检查 `mainErrorType` / `firstThought` / `triggerScene` / `nextAction`。
5. 检查复盘后旧题复现提醒。
6. 点击“我知道了 / 进入针对训练 / 稍后再练”等响应。
7. 检查是否不阻断复盘保存。

预期：

- 错题卡正常展示。
- 样本不足时不强行提醒。
- 有重复时提醒展示。
- 无交易建议 / 买卖信号文案。
- `interventionEvent` 写入失败时不阻断。

记录栏：

- 结果：待填写
- 截图编号：待填写
- 问题：待填写

## 验收路径 2：今日针对训练 review_focus → Sampling → 知行提醒

步骤：

1. 从真实复盘结果进入 K线训练。
2. 确认 `review_focus` 参数带入。
3. 确认正在抽取训练片段。
4. 确认 Sampling 成功或 fallback。
5. 检查训练前知行提醒。
6. 操作买入 / 卖出 / 观望。
7. 检查训练中提醒。
8. 完成训练。
9. 检查训练错题卡。

预期：

- session 保存 `segmentId` / `trainingPackId` / `samplingResult`。
- `fallbackUsed` / `fallbackReason` 有清晰提示。
- 提醒文案是训练提醒，不是交易建议。
- 训练结束记录不丢字段。

记录栏：

- 结果：待填写
- 截图编号：待填写
- 问题：待填写

## 验收路径 3：专项训练 special_training

步骤：

1. 进入 K线训练页。
2. 选择专项训练。
3. 选择追高冲动 / 补仓冲动 / 卖飞懊悔 / 计划外交易任一专项。
4. 检查 Sampling API。
5. 检查训练前提醒。
6. 完成训练。
7. 检查训练错题卡。

预期：

- `sourceType = special_training`。
- `errorType` / `sceneTags` / `trainingPrescription` 正常。
- 知行提醒频率受控。
- 没有交易建议文案。

记录栏：

- 结果：待填写
- 截图编号：待填写
- 问题：待填写

## 验收路径 4：自选盲练 custom_session

步骤：

1. 进入 K线训练页。
2. 选择自选盲练。
3. 输入 `symbol` / `period` / `startDate` / `endDate` / `trainingLength`。
4. 开始训练。
5. 确认训练中隐藏真实标的和日期。
6. 完成训练后揭示。
7. 检查错题卡。

预期：

- 无数据时显示空状态，不生成空 session。
- 有数据时可训练。
- 训练中隐藏真实标的 / 日期。
- data-binding 不保存完整 bars。

记录栏：

- 结果：待填写
- 截图编号：待填写
- 问题：待填写

## 验收路径 5：训练收藏与回放

步骤：

1. 完成一局训练。
2. 点击收藏本局。
3. 点击收藏训练错题卡。
4. 进入我的页。
5. 打开训练收藏。
6. 查看列表。
7. 进入详情 / 回放。
8. 检查 kline-service slice 是否可拉 bars。
9. 如果不能拉，检查 metadata fallback。

预期：

- 收藏写入 `trainingBookmark`。
- `samplingResult` 不保存完整 bars。
- `custom_session` 可用 `symbol` / `period` / date range 回放。
- 只有 `segmentId` 时显示 metadata fallback，不崩溃。

记录栏：

- 结果：待填写
- 截图编号：待填写
- 问题：待填写

## 验收路径 6：活镜 / P9 数据中枢联动

步骤：

1. 打开活镜页。
2. 检查近 30 天错题 / 第一念 / 触发场景。
3. 打开 web-next `/living-mirror-center`。
4. 检查知行提醒分析。
5. 打开 `/mirror-archive`。
6. 检查训练收藏是否进入档案。
7. 打开 `/living-mirror-growth`。
8. 检查成长谱 fallback / dataGaps 提示。

预期：

- 小程序数据可进入 real-review summary。
- P9 页面能展示或 fallback。
- dataGaps 不误导用户。

记录栏：

- 结果：待填写
- 截图编号：待填写
- 问题：待填写

## 验收路径 7：安全文案真机确认

检查以下页面和模块中是否出现：

- 止盈
- 止损
- 仓位上限
- 建议买入
- 建议卖出
- 目标价
- 买入信号
- 卖出信号
- 预测涨跌
- 收益提升
- 胜率提升

范围：

- 真实复盘页
- K线训练页
- 训练错题卡
- 知行提醒
- 训练收藏
- 活镜页
- 我的页

预期：

- 用户可见范围无 P0 文案。
- 若出现，仅可在测试 / 禁止说明中出现，不应在用户页面出现。

记录栏：

- 结果：待填写
- 截图编号：待填写
- 问题：待填写

## P11-2 通过标准

只有以下全部满足，P11-2 才能通过：

1. 真实复盘链路通过。
2. `review_focus` 训练通过。
3. `special_training` 训练通过。
4. `custom_session` 自选盲练通过。
5. 训练收藏与回放通过或 fallback 清楚。
6. 知行提醒 `before_training` / `during_training` / `after_review` 可见且不阻断。
7. `interventionEvent` 写入失败不阻断。
8. 活镜 / P9 页面可读到或清楚 fallback。
9. 无用户可见 P0 安全文案。
10. 无白屏、崩溃、无限 loading。
11. 真机或开发者工具无阻断 console error。

## 待人工填写结果汇总

- 总结论：待填写
- 是否可以进入 P11-3：待填写
- P0 问题：待填写
- P1 问题：待填写
- P2 问题：待填写
- 截图 / 录屏编号：待填写
- 执行人：待填写
- 执行时间：待填写

