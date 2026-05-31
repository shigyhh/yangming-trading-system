import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(serverRoot, "..");
const seedPath = path.resolve(workspaceRoot, "web-mvp", "data", "question-bank.json");
const outputPath = path.resolve(serverRoot, "data", "question-bank.json");

const TARGET_PER_TYPE = 400;
const TARGET_PER_SUB_DIMENSION = 100;
const VERSION = "3600_v1";

const typeConfigs = [
  {
    type: "冲动型",
    prefix: "CX",
    nature: "风险型",
    dims: [
      ["追涨冲动", "看到价格突然拉升", "先追进去再说", "这次不追就没机会了", "下单前延迟能力"],
      ["踏空补偿", "看到自己错过一段上涨", "急着找下一个票补回来", "不能再错过第二个", "踏空后的暂停能力"],
      ["盈利后上头", "账户刚有一笔盈利", "放大仓位继续冲", "手感来了要乘胜追击", "盈利后的降温能力"],
      ["消息刺激", "听到利好或内幕传闻", "来不及核实就下单", "消息出来就要快", "消息过滤能力"]
    ]
  },
  {
    type: "扛单型",
    prefix: "KD",
    nature: "风险型",
    dims: [
      ["止损抗拒", "价格跌破原定止损位", "迟迟不愿执行止损", "再等等就会回来", "止损执行能力"],
      ["幻想回本", "亏损越拉越大", "把希望寄托在反弹回本", "只要不卖就不算亏", "承认错误能力"],
      ["补仓摊平", "持仓持续走弱", "用补仓摊低成本安慰自己", "成本降下来就安全了", "仓位边界能力"],
      ["短线变长线", "短线交易失败后", "临时改口说自己本来想做长线", "好公司拿久一点没事", "交易周期一致性"]
    ]
  },
  {
    type: "完美主义型",
    prefix: "WM",
    nature: "风险型",
    dims: [
      ["等完美点位", "机会已经接近计划区", "还想再等一个更完美的位置", "再低一点才算确定", "计划内试错能力"],
      ["过度分析", "信号已经足够清楚", "继续查更多指标和观点", "还要再确认一下", "决策收敛能力"],
      ["卖飞懊恼", "卖出后股票继续上涨", "反复责怪自己没有卖在最高点", "我本可以做得更完美", "接受不完美能力"],
      ["执行洁癖", "实际走势和计划有一点偏差", "干脆放弃原本可以执行的机会", "不完全符合就不能做", "弹性执行能力"]
    ]
  },
  {
    type: "偏执型",
    prefix: "PZ",
    nature: "风险型",
    dims: [
      ["逻辑固化", "市场走势已经和判断相反", "仍然坚持原来的逻辑", "市场迟早会证明我对", "反证检查能力"],
      ["只看支持证据", "信息越来越复杂", "只愿意看支持自己观点的内容", "看多的理由才是真逻辑", "信息平衡能力"],
      ["反驳提醒", "别人提醒风险", "第一反应是反驳而不是复查", "他们不懂这只票", "接纳提醒能力"],
      ["逆势证明", "持仓一路走弱", "反而更想证明自己没错", "越跌越有价值", "认错转向能力"]
    ]
  },
  {
    type: "焦虑型",
    prefix: "JL",
    nature: "风险型",
    dims: [
      ["频繁看盘", "持仓价格轻微波动", "忍不住反复打开行情软件", "不盯着就不安心", "看盘节制能力"],
      ["害怕亏损", "账户刚出现浮亏", "马上想卖掉避免难受", "先出来安全一点", "亏损容纳能力"],
      ["找人确认", "自己已经有计划", "还想问别人给自己吃定心丸", "有人认同我才敢拿", "独立确认能力"],
      ["影响生活", "收盘后还有持仓", "情绪、睡眠和家人交流都被影响", "明天会不会又跌", "交易生活分离能力"]
    ]
  },
  {
    type: "从众型",
    prefix: "CZ",
    nature: "风险型",
    dims: [
      ["跟群交易", "群里突然开始刷屏", "跟着热闹直接买卖", "大家都在买应该没错", "独立决策能力"],
      ["听人消息", "朋友或大V给出明确观点", "把别人的判断当成自己的计划", "高手肯定知道更多", "外部信息过滤能力"],
      ["恐慌跟卖", "别人都在喊风险", "没看清计划就跟着卖出", "大家都跑我也不能留", "恐慌隔离能力"],
      ["无独立规则", "没有自己的交易标准", "临时照搬别人的买卖点", "先跟着学总没错", "规则建立能力"]
    ]
  },
  {
    type: "赌徒型",
    prefix: "DT",
    nature: "风险型",
    dims: [
      ["重仓翻本", "账户出现较大亏损", "想靠一把重仓快速翻回来", "这次赢了就全回来了", "仓位纪律能力"],
      ["亏后加码", "连续交易不顺", "越亏越想加大下一笔", "不能就这样认输", "连亏暂停能力"],
      ["追强刺激", "强势股快速波动", "为了刺激感频繁冲进去", "这种票才有意思", "刺激识别能力"],
      ["交易上瘾", "没有清晰机会", "也想不断点开交易软件找动作", "不交易就像错过什么", "空仓能力"]
    ]
  },
  {
    type: "拖延型",
    prefix: "TY",
    nature: "风险型",
    dims: [
      ["不执行计划", "计划条件已经触发", "还是迟迟没有动作", "再看一会儿更稳", "关键动作启动能力"],
      ["不处理持仓", "持仓已经需要调整", "把减仓或止损拖到以后", "等收盘再说", "持仓处理能力"],
      ["不做复盘", "交易结束后", "总把复盘推到明天", "今天太累了下次补", "复盘闭环能力"],
      ["收藏不行动", "看到很多方法和课程", "只收藏不练习", "先存起来以后系统学", "训练落地能力"]
    ]
  },
  {
    type: "平衡型",
    prefix: "PH",
    nature: "平衡型",
    dims: [
      ["计划意识", "出现交易机会时", "先确认入场、失效和仓位条件", "先有计划再行动", "交易计划能力"],
      ["风控意识", "面对不确定行情", "先控制单笔风险和总仓位", "活下来比赌对更重要", "风险控制能力"],
      ["情绪稳定", "价格出现正常波动", "能按规则处理而不是被情绪带走", "波动不是命令", "情绪稳定能力"],
      ["复盘迭代", "交易结束之后", "愿意记录动作并修正下一次计划", "每一笔都用于训练系统", "复盘迭代能力"]
    ]
  }
];

const scenes = [
  "早盘集合竞价刚结束",
  "开盘前十分钟",
  "上午第一波冲高",
  "指数突然翻红",
  "板块热度快速扩散",
  "午后成交量放大",
  "尾盘临近收盘",
  "连续两天上涨后",
  "连续三天回撤后",
  "大盘跳水时",
  "个股冲到前高附近",
  "持仓刚刚由盈转亏",
  "持仓刚刚由亏转盈",
  "朋友发来截图时",
  "直播间情绪升温时",
  "龙虎榜和热搜同时出现",
  "财报或公告刚发布",
  "板块轮动很快时",
  "缩量横盘很久后",
  "账户本周已经波动较大"
];

const conditions = [
  "盘口突然放量",
  "分时线快速拐头",
  "评论区观点一边倒",
  "群里开始催促上车",
  "成本线被反复触碰",
  "止损线被短暂击穿",
  "盈利开始明显回撤",
  "同板块其他股票大涨",
  "消息真假还没有核实",
  "自己心里已经有点急",
  "计划条件只满足了一半",
  "账户情绪比盘面更激烈",
  "技术指标互相矛盾",
  "前一次交易刚刚失败",
  "前一次交易刚刚盈利",
  "盘面噪音明显变多",
  "成交明细忽快忽慢",
  "持仓时间超过原计划",
  "仓位已经接近上限",
  "当天没有明显好机会"
];

const templates = [
  ({ scene, condition, trigger, behavior, selfTalk }) => `在${scene}遇到${condition}时，只要${trigger}，我就容易${behavior}，并把它解释成“${selfTalk}”。`,
  ({ scene, condition, trigger, behavior }) => `当${condition}出现在${scene}，即使计划还没有完全确认，我也会因为${trigger}而${behavior}。`,
  ({ scene, condition, behavior, selfTalk }) => `${scene}如果同时出现${condition}，我常常会${behavior}，心里还会说“${selfTalk}”。`,
  ({ scene, condition, trigger, behavior }) => `遇到${scene}和${condition}叠加时，我的第一反应不是复盘计划，而是受${trigger}影响去${behavior}。`,
  ({ scene, condition, behavior }) => `哪怕事后知道不够理性，只要${scene}出现${condition}，我还是容易${behavior}。`,
  ({ scene, condition, trigger, selfTalk }) => `在${scene}，${condition}会放大我的${trigger}，让我相信“${selfTalk}”比原计划更重要。`,
  ({ scene, condition, behavior }) => `如果${scene}时盘面出现${condition}，我很难安静下来，容易直接${behavior}。`,
  ({ scene, condition, trigger, behavior }) => `我发现自己在${scene}更容易被${condition}牵动，最后因为${trigger}而${behavior}。`,
  ({ scene, condition, selfTalk }) => `面对${scene}的${condition}，我会反复用“${selfTalk}”说服自己，忽略原本写下的交易规则。`,
  ({ scene, condition, trigger, behavior }) => `${scene}一旦碰到${condition}，我的${trigger}会先于规则启动，随后就想${behavior}。`
];

const seedBank = await loadSeedBank();
const generated = normalizeSeed(seedBank);
const byId = new Set(generated.map((item) => item.question_id));
const byText = new Set(generated.map((item) => item.question_text));

for (const config of typeConfigs) {
  const prefixMatcher = new RegExp(`^${config.prefix}(\\d+)$`);
  let nextNumber =
    generated
      .filter((item) => item.question_id.startsWith(config.prefix))
      .reduce((max, item) => {
        const match = item.question_id.match(prefixMatcher);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0) + 1;

  for (const [dimIndex, dim] of config.dims.entries()) {
    const [subDimension, trigger, behavior, selfTalk, ability] = dim;
    let attempt = 0;

    while (countBy(generated, config.type, subDimension) < TARGET_PER_SUB_DIMENSION) {
      const scene = scenes[(attempt + dimIndex * 5 + nextNumber) % scenes.length];
      const condition = conditions[(attempt * 3 + dimIndex * 7 + nextNumber) % conditions.length];
      const template = templates[(attempt + dimIndex) % templates.length];
      const questionText = template({ scene, condition, trigger, behavior, selfTalk });
      attempt += 1;

      if (byText.has(questionText)) continue;

      const questionId = `${config.prefix}${String(nextNumber).padStart(3, "0")}`;
      nextNumber += 1;
      if (byId.has(questionId)) continue;

      const item = {
        question_id: questionId,
        question_code: questionId,
        personality_type: config.type,
        nature: config.nature,
        sub_dimension: subDimension,
        scene_tag: `${scene}、${condition}、${trigger}`,
        question_text: questionText,
        weight: 1,
        core_level: attempt % 5 === 0 ? "核心题" : "扩展题",
        report_tag: `${config.type}-${subDimension}`,
        training_ability: ability,
        status: "active",
        version: VERSION
      };

      generated.push(item);
      byId.add(questionId);
      byText.add(questionText);
    }
  }
}

validateBank(generated);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(generated, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      outputPath,
      total: generated.length,
      version: VERSION,
      personality_counts: summarize(generated, "personality_type"),
      sub_dimension_count: new Set(generated.map((item) => `${item.personality_type}:${item.sub_dimension}`)).size
    },
    null,
    2
  )
);

async function loadSeedBank() {
  try {
    const raw = await fs.readFile(seedPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function normalizeSeed(items) {
  const allowedTypes = new Set(typeConfigs.map((item) => item.type));
  const allowedDims = new Map(typeConfigs.map((item) => [item.type, new Set(item.dims.map((dim) => dim[0]))]));

  return items
    .filter((item) => allowedTypes.has(item.personality_type) && allowedDims.get(item.personality_type)?.has(item.sub_dimension))
    .map((item) => ({
      question_id: String(item.question_id || item.question_code).trim(),
      question_code: String(item.question_code || item.question_id).trim(),
      personality_type: String(item.personality_type).trim(),
      nature: String(item.nature || (item.personality_type === "平衡型" ? "平衡型" : "风险型")).trim(),
      sub_dimension: String(item.sub_dimension).trim(),
      scene_tag: String(item.scene_tag || "").trim(),
      question_text: String(item.question_text).trim(),
      weight: Number(item.weight || 1),
      core_level: String(item.core_level || "核心题").trim(),
      report_tag: String(item.report_tag || `${item.personality_type}-${item.sub_dimension}`).trim(),
      training_ability: String(item.training_ability || "").trim(),
      status: "active",
      version: VERSION
    }));
}

function countBy(items, type, subDimension) {
  return items.filter((item) => item.personality_type === type && item.sub_dimension === subDimension).length;
}

function summarize(items, key) {
  return items.reduce((memo, item) => {
    memo[item[key]] = (memo[item[key]] || 0) + 1;
    return memo;
  }, {});
}

function validateBank(items) {
  if (items.length !== TARGET_PER_TYPE * typeConfigs.length) {
    throw new Error(`总题量应为 ${TARGET_PER_TYPE * typeConfigs.length}，实际为 ${items.length}`);
  }

  assertUnique(items, "question_id");
  assertUnique(items, "question_text");

  for (const config of typeConfigs) {
    const typeItems = items.filter((item) => item.personality_type === config.type);
    if (typeItems.length !== TARGET_PER_TYPE) {
      throw new Error(`${config.type} 题量错误：${typeItems.length}`);
    }

    for (const [subDimension] of config.dims) {
      const count = typeItems.filter((item) => item.sub_dimension === subDimension).length;
      if (count !== TARGET_PER_SUB_DIMENSION) {
        throw new Error(`${config.type}-${subDimension} 题量错误：${count}`);
      }
    }
  }
}

function assertUnique(items, key) {
  const seen = new Set();
  for (const item of items) {
    const value = item[key];
    if (!value) throw new Error(`${key} 不能为空`);
    if (seen.has(value)) throw new Error(`${key} 重复：${value}`);
    seen.add(value);
  }
}
