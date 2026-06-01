# 阳明心学交易系统项目上下文

## 当前定位
阳明心学 + 交易行为心镜 + 活镜成长 + 训练闭环。
不荐股、不带单、不承诺收益，只做交易心理觉察、纪律训练、复盘系统。

## 九面行为心镜
1. 追涨之镜
2. 扛单之镜
3. 幻想之镜
4. 赌性之镜
5. 从众之镜
6. 犹疑之镜
7. 拖延之镜
8. 焦虑之镜
9. 良知之镜

## 当前 Sprint
Sprint 9：心镜报告
Sprint 10：训练记录与活镜成长
Sprint 10.5：真实交易复盘 MVP
Sprint 11：心镜档案馆与数据绑定
Sprint 12：助教承接 / 飞书同步
Sprint 13：分享卡片 / 邀请码渠道
Sprint 14-19：全球照见层、多语言、全球案例库、心镜热力图、小程序联动、App 预留

## 心镜报告字段
- 一句话判词
- 主镜
- 副镜
- 心贼显影
- 风险雷达
- 典型循环
- 7天训练处方
- 训练营建议
- 合规提示：本报告用于交易心理觉察与训练，不构成投资建议

## 合规原则
禁止投资建议、收益承诺、荐股、喊单、带单。
所有文案强调觉察、训练、复盘、纪律、风险教育。

## 共享契约

Sprint 9 之后的 Web、小程序、后台、server 共用 `packages/contracts/living-mirror.d.ts`：

- `User`
- `MirrorReport`
- `TrainingRecord`
- `TradeReview`
- `LivingMirrorStats`
- `AssistantHandoff`
- `MirrorArchive`
