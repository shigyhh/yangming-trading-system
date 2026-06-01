# 测评报告统一 Schema

## 目标

测评报告需要在 Web、小程序、后台和后端之间使用同一份结构，避免页面各自拼字段、各自解释人格。

统一 schema 放在：

```text
packages/contracts/assessment-report.schema.json
```

示例报告放在：

```text
packages/contracts/assessment-report.example.json
```

## 必填结构

| 字段 | 含义 |
| --- | --- |
| `schemaVersion` | 当前固定为 `assessment_report_v1`。 |
| `conclusion` | 一句话结论，只描述交易心理惯性和训练方向。 |
| `primaryPersonality` | 主人格。 |
| `secondaryPersonality` | 副人格。 |
| `riskRadar` | 风险雷达，只表示心理/行为偏差强度。 |
| `emotionalTriggers` | 情绪触发和第一念。 |
| `trainingPrescription7Days` | 7 天训练处方，每天一个训练动作。 |
| `campSuggestion` | 训练营建议。 |
| `complianceNotice` | 固定为：本报告用于交易心理觉察，不构成投资建议。 |

## 当前三端字段映射

### Web

现有位置：

```text
web-next/src/features/assessment/report.ts
```

当前字段对应关系：

| 统一字段 | Web 当前来源 |
| --- | --- |
| `conclusion` | 可由 `primaryType.summary` + `trainingDirection` 生成。 |
| `primaryPersonality` | `primaryType`。 |
| `secondaryPersonality` | `secondaryType`。 |
| `riskRadar` | `riskRadar`。 |
| `emotionalTriggers` | `firstThought`、`firstThoughtDisplay`、`sourceMirror`。 |
| `trainingPrescription7Days` | 当前缺少完整 7 天处方，需要从人格训练方向扩展。 |
| `campSuggestion` | 当前缺少，需要从主人格/风险标签映射。 |
| `complianceNotice` | 当前 `disclaimer` 文案需要收敛为统一字段。 |

### Server

现有位置：

```text
server/src/services/scoring.js
```

当前字段对应关系：

| 统一字段 | Server 当前来源 |
| --- | --- |
| `conclusion` | 可由 `main_type`、`current_trading_risk`、`training_ability` 生成。 |
| `primaryPersonality` | `main_type`、`score_percentages[main_type]`。 |
| `secondaryPersonality` | `sub_type`、`score_percentages[sub_type]`。 |
| `riskRadar` | `risk_ranking` 或 `score_percentages`。 |
| `emotionalTriggers` | `profiles[main_type].pattern/risk/scene`，但需要结构化。 |
| `trainingPrescription7Days` | `actions_7_days`。 |
| `campSuggestion` | `recommended_camp`。 |
| `complianceNotice` | `buildLocalReport` 里已有合规说明，但需要输出结构化字段。 |

### Miniprogram

现有位置：

```text
miniprogram/utils/assessment.js
miniprogram/modules/personality/index.js
```

当前字段对应关系：

| 统一字段 | 小程序当前来源 |
| --- | --- |
| `conclusion` | 可由 `title`、`action`、`path` 生成。 |
| `primaryPersonality` | `primary` + `PERSONALITY_ARCHIVES[primary]`。 |
| `secondaryPersonality` | `secondary` + `PERSONALITY_ARCHIVES[secondary]`。 |
| `riskRadar` | 当前只有 `ranked`，需要转换为 0-100 雷达值。 |
| `emotionalTriggers` | `trigger`、`scenario`、`PERSONALITY_ARCHIVES[type].root`。 |
| `trainingPrescription7Days` | 当前缺少完整 7 天处方，需要读取共享内容或后端报告。 |
| `campSuggestion` | 当前缺少，建议由后端或共享人格包生成。 |
| `complianceNotice` | 小程序页面已有合规组件，但报告数据内需要固定字段。 |

## 最小改造方案

当前项目还没有统一人格引擎，最小改造不要一次性迁移所有逻辑。

建议分四步：

1. 已完成：先在 `packages/contracts` 固化 `assessment_report_v1` schema，明确 Web、小程序、后台和后端最终都输出这一份结构。
2. 下一步：在 `server/src/services/scoring.js` 增加一个 `buildUnifiedAssessmentReport(result)` 适配器，只把现有评分结果转换成统一结构，不改评分算法。
3. 再下一步：Web 的 `web-next/src/features/assessment/report.ts` 增加 `toUnifiedAssessmentReport(report)`，页面只读统一结构；小程序同理增加转换函数。
4. 最后：新增 `packages/personality`，把人格枚举、人格文案、人格到训练营/7 天训练处方的映射迁进去。迁完后，Web、server、小程序都只调用人格引擎，不在页面组件里计算人格。

## 边界

- 报告不是医学诊断。
- 报告不是投资建议。
- 风险雷达不是收益风险预测。
- 训练处方只描述觉察、纪律、复盘和行为训练。
- 不出现推荐买入、推荐卖出、必赚、稳赚、收益保证、喊单、抄底、逃顶等表达。
