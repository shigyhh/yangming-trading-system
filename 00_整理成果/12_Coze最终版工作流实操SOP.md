# Coze 最终版工作流实操 SOP

适用项目：AI交易人格测评系统 2.0  
目标：把 Coze 从“能生成报告”升级成“稳定、可调用、可上线”的报告生成工作流。  
原则：正式版中，题库、抽题、评分尽量放后端；Coze 专注生成高质量诊断报告。

参考文档：

- Coze 工作流执行 API 参考：`POST /v1/workflow/run`，请求包含 `workflow_id` 与 `parameters`，需 Bearer Token 鉴权。可参考 Coze 官方文档入口：https://www.coze.com/open/docs/developer_guides
- Coze Studio API Reference（含 workflow run 说明）：https://github.com/coze-dev/coze-studio/wiki/6.-API-Reference

---

## 一、最终版推荐架构

正式版不建议再让 Coze 承担全部事情。

推荐分工：

```text
网页前端：展示、答题、报告页
后端服务：登录、抽题、评分、保存数据、防爬虫、调用 Coze、同步飞书
Coze：根据结构化评分结果生成诊断报告
飞书：线索承接和运营看板
```

原因：

1. 720 题库不能暴露在前端。
2. 评分规则是核心资产，应该放后端。
3. Coze 适合生成报告表达，不适合当唯一数据库和安全层。
4. 后端可以统一做限流、登录态、防刷、数据入库。

---

## 二、Coze 最终版只保留一个核心工作流

正式版建议只保留：

```text
工作流 B：九人格测评_生成诊断报告
```

用途：

```text
输入结构化评分结果
→ 生成一份股民能看懂、认可、愿意行动的诊断报告
→ 返回 report + followup_summary
```

你之前做过的：

```text
工作流 A：随机抽题
```

可以保留为低代码演示版，但正式版抽题应由后端完成。

---

## 三、最终版 Coze 工作流结构

画布结构：

```text
开始节点
→ 输入校验代码节点
→ 生成诊断报告大模型节点
→ 报告整理代码节点
→ 结束节点
```

### 为什么不是“开始 → 大模型 → 结束”

因为最终版必须稳定输出：

1. report：完整报告正文。
2. report_summary：给助理看的摘要。
3. followup_tags：飞书/企微打标签用。
4. recommended_camp：训练营分层。
5. risk_level：风险等级。

---

## 四、工作流 B：开始节点配置

工作流名称：

```text
九人格测评_生成诊断报告
```

开始节点只保留 1 个输入：

| 变量名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| input | String | 是 | 后端传入的评分结果 JSON 字符串 |

测试输入示例：

```json
{
  "input": "{\"user\":{\"nickname\":\"测试用户\",\"source_channel\":\"直播间\"},\"assessment\":{\"test_version\":\"45\"},\"score_result\":{\"main_type\":\"冲动型\",\"sub_type\":\"焦虑型\",\"risk_level\":\"高风险\",\"recommended_camp\":\"基础觉察营\",\"training_ability\":\"下单前延迟能力\",\"easiest_loss_scene\":\"最容易亏在分时快速拉升、热门题材扩散、朋友突然喊票时。\",\"current_trading_risk\":\"容易在急拉、涨停诱惑和盘中消息里做临时决策。\",\"yangming_reminder\":\"知是行之始，行是知之成。你不是缺机会，而是要先让心慢下来。\",\"score_percentages\":{\"冲动型\":92,\"焦虑型\":76,\"扛单型\":48,\"平衡型\":52},\"top_sub_dimensions\":[{\"personality_type\":\"冲动型\",\"sub_dimension\":\"追涨冲动\",\"percent\":100},{\"personality_type\":\"冲动型\",\"sub_dimension\":\"踏空补偿\",\"percent\":90},{\"personality_type\":\"焦虑型\",\"sub_dimension\":\"频繁看盘\",\"percent\":80}],\"actions_7_days\":[\"每次想追涨前先停10分钟，只写买入理由和失效条件。\",\"当天只允许做计划内标的，盘中临时看到的机会全部记入观察表。\"]}}"
}
```

---

## 五、输入校验代码节点

节点名称：

```text
输入校验
```

输入：

```text
input = 开始.input
```

输出：

| 变量名 | 类型 |
|---|---|
| clean_input | String |

代码：

```javascript
async function main({ params }: Args): Promise<Output> {
  const rawInput = params.input || "{}";

  let data = {};

  try {
    data = JSON.parse(rawInput);

    // 兼容误传 {"input":"..."} 的情况
    if (data.input && typeof data.input === "string") {
      data = JSON.parse(data.input);
    }
  } catch (e) {
    return {
      clean_input: JSON.stringify({
        error: "输入不是合法 JSON",
        raw_input: rawInput
      }, null, 2)
    };
  }

  const score = data.score_result || {};
  const required = ["main_type", "risk_level", "recommended_camp"];
  const missing = required.filter((key) => !score[key]);

  if (missing.length > 0) {
    return {
      clean_input: JSON.stringify({
        error: "缺少必要评分字段",
        missing,
        data
      }, null, 2)
    };
  }

  const normalized = {
    user: data.user || {},
    assessment: data.assessment || {},
    score_result: score,
    compliance: {
      no_stock_recommendation: true,
      no_profit_promise: true,
      education_only: true
    }
  };

  return {
    clean_input: JSON.stringify(normalized, null, 2)
  };
}
```

---

## 六、生成诊断报告大模型节点

节点名称：

```text
生成诊断报告
```

输入变量：

```text
input = 输入校验.clean_input
```

### 系统提示词

```text
你是“阳明心学交易人格 AI 诊断官”。

你的任务是根据结构化评分结果，生成一份股民一看就懂、愿意认可、但不构成投资建议的交易行为诊断报告。

你必须遵守：
1. 不荐股，不预测行情，不承诺收益。
2. 不说“你这个人有问题”，只诊断交易行为模式。
3. 语言要真实、克制、扎心但不羞辱。
4. 必须结合阳明心学的“知行合一、致良知、克己、知止、有定”。
5. 报告必须包含：测评说明、主人格、副人格、当前交易风险、最容易亏钱的场景、最该训练的一项能力、阳明心学提醒、7天行动建议、训练营分层建议。
6. 报告要让用户感觉被看见，而不是被批判。
7. 不要重新计算分数，评分结果以输入为准。

合规边界：
本报告只用于交易认知教育、行为觉察和训练分层，不构成任何投资建议、荐股建议、买卖建议或收益承诺。
```

### 用户提示词

```text
请根据以下结构化评分结果，生成一份《九种交易人格 AI 诊断报告》。

结构化评分结果：
{{input}}

输出必须使用以下结构：

《九种交易人格 AI 诊断报告》

一、测评说明
二、你的主人格
三、你的副人格
四、当前交易风险
五、你最容易亏钱的3个场景
六、你最该训练的一项能力
七、高分子维度解读
八、阳明心学提醒
九、7天行动建议
十、训练营分层建议
十一、给助理的跟进摘要
十二、结语

要求：
1. 用股民真实场景说话，例如追涨、扛单、频繁看盘、消息刺激、踏空后补偿等。
2. 必须提到高分子维度。
3. 不要只是复述分数。
4. 不要荐股，不要预测行情，不要承诺收益。
5. 结尾要引导用户先修正一个重复错误。
6. “给助理的跟进摘要”要简短，方便飞书群通知和人工跟进。
```

输出变量：

```text
output
```

---

## 七、报告整理代码节点

节点名称：

```text
报告整理
```

输入：

```text
report = 生成诊断报告.output
score_input = 输入校验.clean_input
```

输出：

| 变量名 | 类型 |
|---|---|
| output | String |

代码：

```javascript
async function main({ params }: Args): Promise<Output> {
  const report = params.report || "";
  let data = {};

  try {
    data = JSON.parse(params.score_input || "{}");
  } catch (e) {
    data = {};
  }

  const score = data.score_result || {};
  const user = data.user || {};

  const result = {
    report,
    report_summary: {
      nickname: user.nickname || "未命名用户",
      main_type: score.main_type || "",
      sub_type: score.sub_type || "",
      risk_level: score.risk_level || "",
      recommended_camp: score.recommended_camp || "",
      training_ability: score.training_ability || ""
    },
    followup_tags: [
      score.main_type,
      score.sub_type,
      score.risk_level,
      score.recommended_camp
    ].filter(Boolean),
    compliance: {
      education_only: true,
      no_stock_recommendation: true,
      no_profit_promise: true
    }
  };

  return {
    output: JSON.stringify(result, null, 2)
  };
}
```

---

## 八、结束节点配置

结束节点输出建议：

| 输出变量 | 类型 | 绑定 |
|---|---|---|
| output | String | 报告整理.output |
| report | String | 生成诊断报告.output |

如果 Coze 结束节点支持多个变量，就输出两个。  
如果只稳定支持一个变量，就只输出 `output`，其中包含 JSON 字符串。

---

## 九、Coze 平台内测试步骤

### 第 1 次测试：最小输入

用本文第四部分的测试输入。

期望：

1. 输入校验节点成功。
2. 大模型节点生成报告。
3. 报告整理节点输出 JSON。
4. 结束节点 output 不为空。

### 第 2 次测试：错误输入

输入：

```json
{
  "input": "abc"
}
```

期望：

1. 输入校验节点返回错误 JSON。
2. 不要让工作流直接崩。

### 第 3 次测试：真实 45 题评分结果

从当前网页 MVP 生成 payload，截取 `local_score_result`，整理成：

```json
{
  "user": {},
  "assessment": {},
  "score_result": {}
}
```

再传给 Coze。

---

## 十、发布工作流

测试通过后：

1. 点击发布。
2. 记录 workflow_id。
3. 记录工作流所属空间/应用信息。
4. 在 Coze API 管理处创建 Personal Access Token 或 API Key。
5. 不要把 Token 放前端。

---

## 十一、服务端调用 Coze 示例

### 国内扣子常见调用方式

具体域名以你的 Coze 控制台/API 管理页为准。常见形式：

```bash
curl -X POST "https://api.coze.cn/v1/workflow/run" \
  -H "Authorization: Bearer $COZE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "你的workflow_id",
    "parameters": {
      "input": "{\"user\":{\"nickname\":\"测试用户\"},\"score_result\":{\"main_type\":\"冲动型\",\"risk_level\":\"高风险\",\"recommended_camp\":\"基础觉察营\"}}"
    }
  }'
```

### Node.js 后端伪代码

```javascript
async function runCozeReportWorkflow(scorePayload) {
  const response = await fetch("https://api.coze.cn/v1/workflow/run", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.COZE_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      workflow_id: process.env.COZE_REPORT_WORKFLOW_ID,
      parameters: {
        input: JSON.stringify(scorePayload)
      }
    })
  });

  const data = await response.json();

  if (!response.ok || data.code !== 0) {
    throw new Error(`Coze workflow failed: ${JSON.stringify(data)}`);
  }

  // 不同版本返回结构可能略有不同，需按实际响应取 data/output。
  return data;
}
```

---

## 十二、最终版输入数据标准

后端传给 Coze 的标准 payload：

```json
{
  "user": {
    "id": "user_uuid",
    "nickname": "测试用户",
    "source_channel": "直播间",
    "wechat_bound": true
  },
  "assessment": {
    "id": "assessment_uuid",
    "test_version": "45",
    "submitted_at": "2026-05-24T10:10:00Z"
  },
  "score_result": {
    "main_type": "冲动型",
    "sub_type": "焦虑型",
    "risk_level": "高风险",
    "recommended_camp": "基础觉察营",
    "training_ability": "下单前延迟能力",
    "easiest_loss_scene": "最容易亏在分时快速拉升、热门题材扩散、朋友突然喊票时。",
    "current_trading_risk": "容易在急拉、涨停诱惑和盘中消息里做临时决策。",
    "yangming_reminder": "知是行之始，行是知之成。你不是缺机会，而是要先让心慢下来。",
    "score_percentages": {
      "冲动型": 92,
      "焦虑型": 76,
      "平衡型": 52
    },
    "top_sub_dimensions": [
      {
        "personality_type": "冲动型",
        "sub_dimension": "追涨冲动",
        "percent": 100
      }
    ],
    "actions_7_days": [
      "每次想追涨前先停10分钟，只写买入理由和失效条件。"
    ]
  }
}
```

---

## 十三、最终版输出数据标准

Coze 最好输出：

```json
{
  "report": "《九种交易人格 AI 诊断报告》...",
  "report_summary": {
    "nickname": "测试用户",
    "main_type": "冲动型",
    "sub_type": "焦虑型",
    "risk_level": "高风险",
    "recommended_camp": "基础觉察营",
    "training_ability": "下单前延迟能力"
  },
  "followup_tags": ["冲动型", "焦虑型", "高风险", "基础觉察营"],
  "compliance": {
    "education_only": true,
    "no_stock_recommendation": true,
    "no_profit_promise": true
  }
}
```

---

## 十四、Coze 最终版验收标准

工作流达到以下标准，就算最终版合格：

1. 输入合法 JSON 能稳定生成报告。
2. 输入错误 JSON 不会直接崩。
3. 报告不荐股、不预测行情、不承诺收益。
4. 报告包含主人格、副人格、风险、场景、训练能力、阳明心学提醒、7 天行动。
5. 输出能被后端解析成 JSON。
6. 可以通过 API 调用。
7. Token 不暴露在前端。
8. 工作流已发布，不再调用草稿版。

---

## 十五、如果暂时不做后端，低代码版怎么走

如果现在还没后端，可以临时这样：

```text
网页 MVP 前端评分
→ 调用 Coze 工作流 B
→ Coze 返回报告
→ 网页展示报告
→ 飞书 Webhook 通知
```

但要清楚：

1. 这只是演示版。
2. 题库仍然在前端，不安全。
3. Coze Token 不能放前端，所以最好用一个轻量代理服务。

---

## 十六、我们下一步怎么做

建议实操顺序：

```text
第1步：在 Coze 新建“九人格测评_生成诊断报告”
第2步：按本文配置 4 个节点
第3步：用测试输入跑通
第4步：发布工作流并拿 workflow_id
第5步：后端封装 /api/reports/generate
第6步：报告成功后同步飞书
```

下一步你可以直接打开 Coze，我们先从第 1 个节点开始配置。

