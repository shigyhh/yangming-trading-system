# Coze V3：随机抽题 + 自动评分 + AI报告完整工作流

目标：从 720 道题库里随机抽 27/45/90 道题，用户答完后自动评分，并生成《九种交易人格 AI 诊断报告》。

重要判断：V3 不建议做成一个单一长工作流。应该拆成两个工作流：

```text
工作流 A：随机抽题工作流
工作流 B：评分报告工作流
```

原因：

1. 抽题是用户开始测评时发生的。
2. 答题是在页面/表单/聊天过程中发生的。
3. 评分和报告是用户提交答案后发生的。
4. 拆开以后更稳定，也方便后期接网页、小程序、飞书表格或私域系统。

---

## 一、V3 总体结构

```text
用户进入测评
→ 选择 27 / 45 / 90 题
→ 调用工作流 A：随机抽题
→ 返回题目列表
→ 用户逐题打 1-5 分
→ 提交答案
→ 调用工作流 B：自动评分 + 生成报告
→ 输出完整诊断报告
```

---

## 二、工作流 A：随机抽题

### 1. 工作流名称

```text
九人格测评_随机抽题
```

### 2. 节点结构

```text
开始节点
→ 代码节点：随机抽题
→ 结束节点
```

### 3. 开始节点配置

第一版仍然建议只保留一个输入变量：

| 变量名 | 类型 | 示例 | 说明 |
|---|---|---|---|
| input | String | JSON字符串 | 包含题量版本、用户ID、避重题目ID |

测试输入示例：

```json
{
  "input": "{\"test_version\":\"45\",\"user_id\":\"u001\",\"exclude_question_ids\":[]}"
}
```

说明：

- `test_version` 可以是 `"27"`、`"45"`、`"90"`。
- `user_id` 用于未来做历史避重。
- `exclude_question_ids` 是这位用户最近答过的题目，第一版可以传空数组。

### 4. 代码节点配置

节点名称：

```text
随机抽题
```

输入：

```text
input = 开始节点.input
```

输出：

```text
questions
```

### 5. 随机抽题代码逻辑

Coze 代码节点中需要完成：

1. 解析 input。
2. 判断用户选择 27/45/90 题。
3. 确定每种人格抽题数：
   - 27题：每类 3 道
   - 45题：每类 5 道
   - 90题：每类 10 道
4. 按人格分组。
5. 每类人格优先覆盖不同子维度。
6. 排除历史答过的题。
7. 打散顺序。
8. 返回题目列表。

### 6. 随机抽题代码模板

第一版演示时，可以先放一个“小题库”测试跑通。跑通后再把 720 题库接入数据库或外部 API。

```javascript
// 输入：input，类型为字符串
const data = JSON.parse(input || "{}");
const testVersion = String(data.test_version || "45");
const excludeIds = new Set(data.exclude_question_ids || []);

const perTypeCountMap = {
  "27": 3,
  "45": 5,
  "90": 10
};

const perTypeCount = perTypeCountMap[testVersion] || 5;

// 这里先放示例题库。正式版不要手写小题库，要替换成720题库数据库查询结果。
const questionBank = [
  {
    question_id: "CX001",
    personality_type: "冲动型",
    sub_dimension: "追涨冲动",
    question_text: "看到股票盘中突然直线拉升时，我很容易来不及分析就追进去。",
    weight: 1
  },
  {
    question_id: "CX002",
    personality_type: "冲动型",
    sub_dimension: "踏空补偿",
    question_text: "连续错过几只上涨股票后，我下一次看到机会会明显变急。",
    weight: 1
  },
  {
    question_id: "CX003",
    personality_type: "冲动型",
    sub_dimension: "盈利后上头",
    question_text: "刚赚完一笔钱后，我会觉得自己状态很好，想马上再做一笔。",
    weight: 1
  },
  {
    question_id: "KD001",
    personality_type: "扛单型",
    sub_dimension: "止损抗拒",
    question_text: "明明跌破了我原本设定的位置，我还是会告诉自己再等等。",
    weight: 1
  },
  {
    question_id: "KD002",
    personality_type: "扛单型",
    sub_dimension: "幻想回本",
    question_text: "亏损后我最常想的是等它回到成本价再说。",
    weight: 1
  }
];

const personalities = [
  "冲动型",
  "扛单型",
  "完美主义型",
  "偏执型",
  "焦虑型",
  "从众型",
  "赌徒型",
  "拖延型",
  "平衡型"
];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickBalancedQuestions(items, count) {
  const available = items.filter(q => !excludeIds.has(q.question_id));
  const bySub = {};

  for (const q of available) {
    if (!bySub[q.sub_dimension]) bySub[q.sub_dimension] = [];
    bySub[q.sub_dimension].push(q);
  }

  const subNames = shuffle(Object.keys(bySub));
  const picked = [];

  // 先保证不同子维度覆盖
  for (const sub of subNames) {
    if (picked.length >= count) break;
    const candidates = shuffle(bySub[sub]);
    if (candidates.length > 0) picked.push(candidates[0]);
  }

  // 不够再从剩余题里补
  const pickedIds = new Set(picked.map(q => q.question_id));
  const rest = shuffle(available.filter(q => !pickedIds.has(q.question_id)));

  for (const q of rest) {
    if (picked.length >= count) break;
    picked.push(q);
  }

  return picked.slice(0, count);
}

let selected = [];

for (const type of personalities) {
  const items = questionBank.filter(q => q.personality_type === type);
  const picked = pickBalancedQuestions(items, perTypeCount);
  selected = selected.concat(picked);
}

selected = shuffle(selected);

return {
  test_version: testVersion,
  per_type_count: perTypeCount,
  total_questions: selected.length,
  questions: selected.map((q, index) => ({
    index: index + 1,
    question_id: q.question_id,
    personality_type: q.personality_type,
    sub_dimension: q.sub_dimension,
    question_text: q.question_text,
    options: [
      { value: 1, label: "完全不像我" },
      { value: 2, label: "偶尔如此" },
      { value: 3, label: "有时如此" },
      { value: 4, label: "经常如此" },
      { value: 5, label: "几乎就是我" }
    ]
  }))
};
```

注意：上面代码只是演示结构。正式版要把 `questionBank` 换成你的 720 题库。

### 7. 结束节点配置

结束节点输出：

| 输出变量 | 取值 |
|---|---|
| output | 随机抽题.questions 或 随机抽题完整输出 |

建议输出完整对象，这样前端更容易拿到：

```text
output = 随机抽题.output
```

### 8. 工作流 A 测试成功标准

试运行后应该返回：

```json
{
  "test_version": "45",
  "per_type_count": 5,
  "total_questions": 45,
  "questions": [
    {
      "index": 1,
      "question_id": "CX001",
      "personality_type": "冲动型",
      "sub_dimension": "追涨冲动",
      "question_text": "……",
      "options": [...]
    }
  ]
}
```

如果示例题库不足，返回题数会少。这是正常的。接入 720 题库后才会返回完整 27/45/90 题。

---

## 三、正式接入 720 题库的三种方式

### 方式一：Coze 数据库表

适合：你想尽量都放在 Coze 里。

建一张表：

```text
question_bank
```

字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| question_id | 文本 | 题目ID |
| personality_type | 文本 | 人格类型 |
| nature | 文本 | 风险型/稳定型 |
| sub_dimension | 文本 | 子维度 |
| scene_tag | 文本 | 场景标签 |
| question_text | 文本 | 场景题 |
| weight | 数字 | 权重 |
| core_level | 文本 | 核心题/标准题/扩展题 |
| report_tag | 文本 | 报告标签 |

优点：集中在 Coze。

缺点：720 条导入、查询、随机和避重配置会比较费时间。

### 方式二：飞书/表格 + Coze

适合：运营团队维护题库。

流程：

```text
飞书多维表格存题库
→ Coze 插件/HTTP 节点查询题库
→ 代码节点随机抽题
```

优点：运营好维护。

缺点：需要接口权限。

### 方式三：独立网页后端

适合：正式商业化。

流程：

```text
网页后端存720题库
→ 后端随机抽题
→ 前端展示答题
→ 后端自动评分
→ 调用 Coze 生成报告
```

优点：最稳定、最好扩展。

缺点：需要开发。

建议：正式产品用方式三，Coze 负责报告和陪跑。

---

## 四、工作流 B：自动评分 + AI报告

### 1. 工作流名称

```text
九人格测评_评分生成报告
```

### 2. 节点结构

```text
开始节点
→ 代码节点：自动评分
→ 大模型节点：生成诊断报告
→ 结束节点
```

### 3. 开始节点配置

| 变量名 | 类型 | 说明 |
|---|---|---|
| input | String | 用户答案 JSON 字符串 |

### 4. 工作流 B 测试输入

```json
{
  "input": "{\"nickname\":\"测试用户\",\"test_version\":\"45\",\"answers\":[{\"question_id\":\"CX001\",\"personality_type\":\"冲动型\",\"sub_dimension\":\"追涨冲动\",\"score\":5},{\"question_id\":\"CX002\",\"personality_type\":\"冲动型\",\"sub_dimension\":\"踏空补偿\",\"score\":4},{\"question_id\":\"JL001\",\"personality_type\":\"焦虑型\",\"sub_dimension\":\"频繁看盘\",\"score\":5},{\"question_id\":\"PH001\",\"personality_type\":\"平衡型\",\"sub_dimension\":\"计划意识\",\"score\":2}]}"
}
```

正式前端提交答案时，每条答案必须包含：

```text
question_id
personality_type
sub_dimension
score
```

这样评分节点不需要再查题库，也更稳定。

### 5. 自动评分代码节点

节点名称：

```text
自动评分
```

输入：

```text
input = 开始.input
```

代码：

```javascript
const data = JSON.parse(input || "{}");
const answers = data.answers || [];

const riskTypes = [
  "冲动型",
  "扛单型",
  "完美主义型",
  "偏执型",
  "焦虑型",
  "从众型",
  "赌徒型",
  "拖延型"
];

const allTypes = [...riskTypes, "平衡型"];

const scores = {};
const counts = {};
const subScores = {};
const subCounts = {};

for (const type of allTypes) {
  scores[type] = 0;
  counts[type] = 0;
}

for (const item of answers) {
  const type = item.personality_type || item.personality;
  const sub = item.sub_dimension || "未分类";
  const score = Number(item.score || 0);
  const weight = Number(item.weight || 1);

  if (!allTypes.includes(type)) continue;
  if (score < 1 || score > 5) continue;

  scores[type] += score * weight;
  counts[type] += weight;

  const key = `${type}-${sub}`;
  if (!subScores[key]) subScores[key] = 0;
  if (!subCounts[key]) subCounts[key] = 0;
  subScores[key] += score * weight;
  subCounts[key] += weight;
}

const percentScores = {};

for (const type of allTypes) {
  const maxScore = counts[type] * 5;
  percentScores[type] = maxScore > 0
    ? Math.round(scores[type] / maxScore * 100)
    : 0;
}

const sortedRisk = riskTypes
  .map(type => ({
    type,
    score: percentScores[type] || 0
  }))
  .sort((a, b) => b.score - a.score);

let main_type = sortedRisk[0]?.type || "";
let sub_type = sortedRisk[1]?.type || "";

const balanceScore = percentScores["平衡型"] || 0;

if (balanceScore >= 84 && sortedRisk.every(x => x.score <= 60)) {
  main_type = "平衡型";
  sub_type = "副人格不明显";
}

const mainScore = main_type === "平衡型"
  ? balanceScore
  : sortedRisk[0]?.score || 0;

const highRiskCount = sortedRisk.filter(x => x.score >= 80).length;

let risk_level = "中等风险";

if (mainScore >= 88 || highRiskCount >= 2 || balanceScore <= 40) {
  risk_level = "高风险";
} else if ((mainScore >= 72 && mainScore <= 87) || (balanceScore >= 41 && balanceScore <= 56)) {
  risk_level = "中高风险";
} else if (mainScore >= 56 && mainScore <= 71 && balanceScore >= 57 && balanceScore <= 72) {
  risk_level = "中等风险";
} else if (sortedRisk.every(x => x.score <= 52) && balanceScore >= 72) {
  risk_level = "相对稳定";
}

const top_sub_dimensions = Object.entries(subScores)
  .map(([name, score]) => ({
    name,
    score,
    percent: Math.round(score / ((subCounts[name] || 1) * 5) * 100)
  }))
  .sort((a, b) => b.percent - a.percent)
  .slice(0, 3);

const recommendedCampMap = {
  "冲动型": "基础觉察营",
  "焦虑型": "基础觉察营",
  "从众型": "基础觉察营",
  "扛单型": "风险修正营",
  "偏执型": "风险修正营",
  "赌徒型": "风险修正营",
  "拖延型": "执行强化营",
  "完美主义型": "执行强化营",
  "平衡型": "稳定进阶营"
};

return {
  nickname: data.nickname || "测评用户",
  test_version: data.test_version || "",
  total_answered: answers.length,
  scores: percentScores,
  raw_scores: scores,
  counts,
  main_type,
  sub_type,
  risk_level,
  top_sub_dimensions,
  recommended_camp: recommendedCampMap[main_type] || "基础觉察营",
  compliance: "本测评只用于交易认知教育、行为觉察和训练分层，不构成投资建议。"
};
```

### 6. 大模型节点配置

节点名称：

```text
生成诊断报告
```

输入：

```text
input = 自动评分.output
```

系统提示词：

```text
你是“阳明心学交易人格 AI 诊断官”。

你的任务是根据自动评分结果，生成一份股民一看就懂、愿意认可、但不构成投资建议的交易行为诊断报告。

你必须遵守：
1. 不荐股，不预测行情，不承诺收益。
2. 不说“你这个人有问题”，只诊断交易行为模式。
3. 语言要真实、克制、扎心但不羞辱。
4. 必须结合阳明心学的“知行合一、致良知、克己、知止、有定”。
5. 报告必须包含：测评说明、主人格、副人格、当前交易风险、最容易亏钱的场景、最该训练的一项能力、阳明心学提醒、7天行动建议、训练营分层建议。
6. 报告要让用户感觉被看见，而不是被批判。

合规边界：
本报告只用于交易认知教育、行为觉察和训练分层，不构成任何投资建议、荐股建议、买卖建议或收益承诺。
```

用户提示词：

```text
请根据以下自动评分结果，生成一份《九种交易人格 AI 诊断报告》。

自动评分结果：
{{input}}

输出结构：

《九种交易人格 AI 诊断报告》

一、测评说明
二、你的主人格
三、你的副人格
四、当前交易风险
五、你最容易亏钱的3个场景
六、你最该训练的一项能力
七、阳明心学提醒
八、7天行动建议
九、训练营分层建议
十、结语

要求：
1. 用股民真实场景说话。
2. 必须提到高分子维度。
3. 不要只是复述分数。
4. 不要荐股，不要预测行情，不要承诺收益。
5. 结尾要引导用户先修正一个重复错误。
```

### 7. 结束节点配置

建议结束节点输出两个变量：

| 输出变量 | 取值 |
|---|---|
| report | 生成诊断报告.output |
| score_result | 自动评分.output |

这样前端既能拿到报告，也能拿到结构化评分结果。

---

## 五、V3 真正上线时的页面建议

Coze 工作流适合做后端能力，但用户答题最好不要在 Coze 聊天里完成。

建议页面流程：

```text
测评首页
→ 选择题量
→ 调用随机抽题工作流
→ 展示题目
→ 用户打分
→ 提交答案
→ 调用评分报告工作流
→ 展示报告
→ 引导私域/训练营
```

页面按钮：

```text
开始27题轻测
开始45题标准测
开始90题深度测
```

---

## 六、V3 最小可行落地顺序

不要同时做所有功能，按这个顺序：

1. 先跑通工作流 B：自动评分 + AI报告。
2. 再跑通工作流 A：随机抽题。
3. 再把 720 题库接入工作流 A。
4. 再做网页或表单承接答题。
5. 最后做用户历史避重和复测对比。

为什么先做 B：

评分报告是成交核心。只要能根据答案生成好报告，前面的抽题和页面都可以逐步优化。

---

## 七、你现在应该怎么做

如果你已经搭好 V1，下一步建议直接搭工作流 B：

```text
开始 → 自动评分 → 生成诊断报告 → 结束
```

等工作流 B 跑通，再搭工作流 A。

因为工作流 A 需要题库来源，而工作流 B 只需要答案 JSON，最容易先成功。

