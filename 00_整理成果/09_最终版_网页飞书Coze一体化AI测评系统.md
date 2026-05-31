# 最终版：网页 + 飞书 + Coze 一体化 AI 测评系统

目标：用 720 道题库搭建一个真正可上线的“九种交易人格 AI 测评系统”。

最终形态：

```text
飞书多维表格管理720题库
→ 网页前端展示测评
→ Coze/后端随机抽题
→ 用户答题
→ Coze自动评分
→ Coze生成AI诊断报告
→ 飞书沉淀用户结果
→ 私域/训练营承接
```

---

## 一、先修复你现在的工作流 A 报错

你现在工作流 A 报：

```text
request sandbox failed err: invalid status code: 500
```

常见原因：

1. 代码节点没有包在 `main({ params })` 函数里。
2. 代码里直接用了 `input`，但 Coze 代码节点里应使用 `params.input`。
3. 输出变量叫 `questions`，但代码没有 `return { questions: "..." }`。
4. 右侧输入多套了一层 JSON，导致解析失败。

### 工作流 A 正确结构

```text
开始
→ 随机抽题代码节点
→ 结束
```

开始节点：

| 变量名 | 类型 |
|---|---|
| input | String |

代码节点输出：

| 变量名 | 类型 |
|---|---|
| questions | String |

结束节点：

| 输出变量 | 绑定 |
|---|---|
| output | 随机抽题代码节点.questions |

### 工作流 A 可直接测试的代码

先用这个小题库跑通结构，后面再接 720 题库。

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
      questions: JSON.stringify({
        error: "输入不是合法JSON",
        rawInput
      }, null, 2)
    };
  }

  const testVersion = String(data.test_version || "45");
  const excludeIds = new Set(data.exclude_question_ids || []);

  const perTypeCountMap = {
    "27": 3,
    "45": 5,
    "90": 10
  };

  const perTypeCount = perTypeCountMap[testVersion] || 5;

  // 演示题库：正式版替换为飞书/数据库里的720题库
  const questionBank = [
    { question_id: "CX001", personality_type: "冲动型", sub_dimension: "追涨冲动", question_text: "看到股票盘中突然直线拉升时，我很容易来不及分析就追进去。", weight: 1 },
    { question_id: "CX002", personality_type: "冲动型", sub_dimension: "踏空补偿", question_text: "连续错过几只上涨股票后，我下一次看到机会会明显变急。", weight: 1 },
    { question_id: "CX003", personality_type: "冲动型", sub_dimension: "盈利后上头", question_text: "刚赚完一笔钱后，我会觉得自己状态很好，想马上再做一笔。", weight: 1 },
    { question_id: "KD001", personality_type: "扛单型", sub_dimension: "止损抗拒", question_text: "明明跌破了我原本设定的位置，我还是会告诉自己再等等。", weight: 1 },
    { question_id: "KD002", personality_type: "扛单型", sub_dimension: "幻想回本", question_text: "亏损后我最常想的是等它回到成本价再说。", weight: 1 },
    { question_id: "JL001", personality_type: "焦虑型", sub_dimension: "频繁看盘", question_text: "买入后我会频繁刷新行情，哪怕只是几分钱波动。", weight: 1 },
    { question_id: "PH001", personality_type: "平衡型", sub_dimension: "计划意识", question_text: "买入前，我基本能说清楚这笔交易的入场理由。", weight: 1 }
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

    const picked = [];
    const subNames = shuffle(Object.keys(bySub));

    for (const sub of subNames) {
      if (picked.length >= count) break;
      const candidates = shuffle(bySub[sub]);
      if (candidates.length > 0) picked.push(candidates[0]);
    }

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

  const result = {
    test_version: testVersion,
    per_type_count: perTypeCount,
    total_questions: selected.length,
    questions: selected.map((q, index) => ({
      index: index + 1,
      question_id: q.question_id,
      personality_type: q.personality_type,
      sub_dimension: q.sub_dimension,
      question_text: q.question_text,
      weight: q.weight || 1,
      options: [
        { value: 1, label: "完全不像我" },
        { value: 2, label: "偶尔如此" },
        { value: 3, label: "有时如此" },
        { value: 4, label: "经常如此" },
        { value: 5, label: "几乎就是我" }
      ]
    }))
  };

  return {
    questions: JSON.stringify(result, null, 2)
  };
}
```

### 工作流 A 测试输入

如果右侧是单独的 `input String` 输入框，直接填：

```json
{"test_version":"45","user_id":"u001","exclude_question_ids":[]}
```

如果右侧是整个工作流 JSON 模式，填：

```json
{
  "input": "{\"test_version\":\"45\",\"user_id\":\"u001\",\"exclude_question_ids\":[]}"
}
```

---

## 二、最终版系统分工

### 1. 飞书负责什么

飞书适合当运营后台和数据看板。

建议建 4 张多维表：

```text
01_题库表
02_用户测评记录表
03_用户答案表
04_AI报告与训练营分层表
```

### 2. 网页负责什么

网页负责用户体验：

```text
选择题量
→ 展示题目
→ 收集答案
→ 展示报告
→ 引导加微信/进训练营
```

### 3. Coze 负责什么

Coze 负责 AI 能力：

```text
随机抽题
自动评分
AI报告生成
结果解释
私域陪跑
```

正式商业化时，建议：

```text
网页负责抽题和答题体验
Coze负责评分报告和AI解释
飞书负责题库维护和用户数据沉淀
```

---

## 三、飞书多维表结构

### 表1：01_题库表

| 字段 | 类型 | 示例 |
|---|---|---|
| question_id | 文本 | CX001 |
| personality_type | 单选 | 冲动型 |
| nature | 单选 | 风险型 |
| sub_dimension | 单选 | 追涨冲动 |
| scene_tag | 文本 | 追涨、分时拉升 |
| question_text | 多行文本 | 看到股票盘中突然直线拉升时…… |
| weight | 数字 | 1 |
| core_level | 单选 | 核心题 |
| report_tag | 文本 | 冲动型-追涨冲动 |
| enabled | 勾选 | 是 |

### 表2：02_用户测评记录表

| 字段 | 类型 | 示例 |
|---|---|---|
| session_id | 文本 | S202605240001 |
| user_id | 文本 | u001 |
| nickname | 文本 | 张先生 |
| phone_or_wechat | 文本 | 可选 |
| source_channel | 单选 | 直播间 |
| test_version | 单选 | 45 |
| status | 单选 | 已完成 |
| main_type | 文本 | 冲动型 |
| sub_type | 文本 | 焦虑型 |
| risk_level | 文本 | 中高风险 |
| recommended_camp | 文本 | 基础觉察营 |
| created_at | 日期时间 | 自动 |

### 表3：03_用户答案表

| 字段 | 类型 | 示例 |
|---|---|---|
| session_id | 文本 | S202605240001 |
| user_id | 文本 | u001 |
| question_id | 文本 | CX001 |
| personality_type | 文本 | 冲动型 |
| sub_dimension | 文本 | 追涨冲动 |
| score | 数字 | 5 |
| created_at | 日期时间 | 自动 |

### 表4：04_AI报告与训练营分层表

| 字段 | 类型 | 示例 |
|---|---|---|
| session_id | 文本 | S202605240001 |
| score_result | 多行文本 | 自动评分JSON |
| ai_report | 多行文本 | AI诊断报告 |
| recommended_camp | 单选 | 基础觉察营 |
| followup_status | 单选 | 待跟进 |
| advisor | 人员 | 运营人员 |

---

## 四、网页前端页面设计

### 页面1：测评首页

标题：

```text
九种交易人格测评
```

副标题：

```text
看见你在交易中最容易失控的地方
```

按钮：

```text
27题轻测
45题标准测
90题深度测
```

合规提示：

```text
本测评只用于交易认知教育和行为觉察，不构成任何投资建议。
```

### 页面2：答题页

展示：

```text
第 12 / 45 题
题目内容
1 完全不像我
2 偶尔如此
3 有时如此
4 经常如此
5 几乎就是我
```

要求：

1. 有进度条。
2. 支持上一题/下一题。
3. 不允许漏答提交。
4. 每题保存 question_id、personality_type、sub_dimension、score。

### 页面3：报告生成中

文案：

```text
正在生成你的交易人格诊断报告……
```

### 页面4：报告页

展示：

1. 主人格
2. 副人格
3. 当前风险等级
4. 九人格分数
5. 高分子维度
6. AI诊断报告
7. 训练营推荐
8. 添加私域/预约直播按钮

---

## 五、最终版数据流

### 1. 用户进入网页

网页生成：

```json
{
  "user_id": "u001",
  "session_id": "S202605240001",
  "test_version": "45"
}
```

### 2. 网页请求随机抽题

请求 Coze 工作流 A：

```json
{
  "input": "{\"test_version\":\"45\",\"user_id\":\"u001\",\"exclude_question_ids\":[]}"
}
```

返回：

```json
{
  "test_version": "45",
  "total_questions": 45,
  "questions": []
}
```

### 3. 用户提交答案

网页整理成：

```json
{
  "nickname": "测试用户",
  "test_version": "45",
  "answers": [
    {
      "question_id": "CX001",
      "personality_type": "冲动型",
      "sub_dimension": "追涨冲动",
      "score": 5
    }
  ]
}
```

### 4. 网页请求评分报告

请求 Coze 工作流 B：

```json
{
  "input": "{\"nickname\":\"测试用户\",\"test_version\":\"45\",\"answers\":[{\"question_id\":\"CX001\",\"personality_type\":\"冲动型\",\"sub_dimension\":\"追涨冲动\",\"score\":5}]}"
}
```

返回：

```json
{
  "report": "完整AI诊断报告",
  "score_result": "结构化评分JSON"
}
```

### 5. 网页写入飞书

写入：

1. 用户测评记录表
2. 用户答案表
3. AI报告与训练营分层表

---

## 六、最终上线建议

### MVP阶段

```text
网页前端
→ Coze 工作流 B：评分+报告
→ 飞书手动导入题库和结果
```

先不做复杂随机抽题，网页可以先用固定 45 题。

### 标准阶段

```text
网页前端
→ 飞书题库读取
→ 随机抽题
→ Coze评分报告
→ 飞书沉淀结果
```

### 完整阶段

```text
网页前端
→ 后端数据库
→ 720题库随机抽题
→ 自动评分
→ Coze生成报告
→ 飞书/CRM/私域承接
→ 用户复测和训练营进度追踪
```

---

## 七、当前你最该做的下一步

你现在已经把工作流 B 跑通了报告生成。

接下来按顺序：

1. 修正工作流 B：让 `score_result` 不再是 null。
2. 修正工作流 A：用本文提供的 `main({ params })` 完整代码。
3. 工作流 A 先用小题库跑通。
4. 再决定题库放飞书还是网页后端。
5. 最后搭网页前端。

不要现在直接把 720 道题全部塞进 Coze 代码节点。那样维护会很痛苦。

