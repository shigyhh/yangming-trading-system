# P1：真实复盘反哺 K线训练闭环

## 产品原则

真实复盘不是记录一次交易，而是生成一张错题卡，再反哺下一次 K线训练。

P1 最小闭环：

真实交易错题
→ 活镜看见模式
→ K线训练补短板
→ 再真实复盘验证变化

## P1 成功标准

用户完成一次真实复盘后：
1. 系统生成错题卡。
2. 真实复盘记录中保存 main_error_type。
3. 活镜页能统计最高频错题。
4. K线训练页能读取最高频错题。
5. K线训练页显示今日针对训练。
6. 用户完成训练后生成训练错题卡。

## P1 用户端文案口径

P1 后续所有分支必须遵守以下产品口径：

1. 用户端不再使用“守法 / 破法 / 守法率”这些文案。
2. 用户端统一替换为：
   - 守法 → 按计划执行
   - 破法 → 执行偏离
   - 守法率 → 执行一致率 / 知行一致率
   - 下一次守法 → 下次执行动作
   - 复发 → 旧题复现
3. 底层旧字段可以兼容保留，例如 nextRule、lawResult，但页面展示不能再出现“守法 / 破法”。
4. 真实复盘字段需要同时兼容 camelCase 和 snake_case：
   - mainErrorType / main_error_type
   - triggerScene / trigger_scene
   - trainingPrescription / training_prescription
   - firstThought / first_thought
   - nextRule / next_rule
5. P1 不做复杂重构。优先通过 normalize 函数兼容旧数据。
6. P1 的核心目标只有一个：真实复盘生成错题卡，并且这个错题类型能反哺 K线训练。

## 核心字段

review_record:
- symbol
- date
- period
- action
- status
- buy_price
- sell_price
- current_price
- position_level
- is_planned
- first_thought
- trigger_scene
- main_error_type
- secondary_error_types
- next_rule
- training_prescription
- law_result
- created_at

training_session:
- id
- user_id
- source_type
- source_review_id
- error_type
- training_pack_id
- start_time
- end_time
- pnl_result
- law_score
- repeat_count

training_action:
- id
- session_id
- bar_index
- action
- price
- position_level
- first_thought
- scene_tag
- rule
- law_result
- created_at

## 错题类型枚举

- 追高冲动
- 扛单被套
- 卖飞懊悔
- 补仓冲动
- 计划外交易
- 盈利拿不住
- 空仓焦虑
- 急于翻本

## 错题到训练映射

追高冲动：
- 场景：放量拉升 / 假突破 / 冲高回落
- 下次执行动作：第一根放量不追，先停十秒

扛单被套：
- 场景：破位下跌 / 弱反弹 / 连续阴跌
- 下次执行动作：破位认错，不用希望代替规则

卖飞懊悔：
- 场景：洗盘后走强 / 趋势中继
- 下次执行动作：按趋势规则持有

补仓冲动：
- 场景：下跌中继 / 反抽诱多
- 下次执行动作：不在破位亏损中补仓

计划外交易：
- 场景：横盘噪音 / 突然异动
- 下次执行动作：无计划不交易

盈利拿不住：
- 场景：小幅回撤 / 趋势未破
- 下次执行动作：盈利按规则拿

空仓焦虑：
- 场景：普涨行情 / 快速反弹
- 下次执行动作：空仓也是按计划执行

急于翻本：
- 场景：连续亏损后反弹诱多
- 下次执行动作：亏损后停止，先复盘
