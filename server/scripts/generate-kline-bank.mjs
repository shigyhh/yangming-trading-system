import fs from "node:fs/promises";
import path from "node:path";

const outputPath = path.resolve("data", "kline-practice-bank.json");
const TARGET_TOTAL = 1500;
const VERSION = "kline_1500_v1";

const types = [
  { type: "冲动型", focus: "追涨冲动", right: "守计划等待", wrong: "追涨买入", lesson: "怕错过一起，先停手，才有资格看机会。" },
  { type: "扛单型", focus: "破位执行", right: "破位止损", wrong: "扛单幻想", lesson: "止损不是认输，是知错能改。" },
  { type: "完美主义型", focus: "计划试错", right: "小仓试错", wrong: "反复观望", lesson: "正确不是完美，正确是可重复。" },
  { type: "偏执型", focus: "反证检查", right: "反证复核", wrong: "坚持己见", lesson: "市场反证出现时，先照见自己的执念。" },
  { type: "焦虑型", focus: "持仓定力", right: "按计划持有", wrong: "恐慌卖出", lesson: "波动不是命令，计划才是命令。" },
  { type: "从众型", focus: "独立判断", right: "独立复盘", wrong: "跟随喊单", lesson: "良知在自己心上，不在热闹处。" },
  { type: "赌徒型", focus: "仓位纪律", right: "轻仓验证", wrong: "重仓押注", lesson: "真正的勇敢，是不把命运交给一把。" },
  { type: "拖延型", focus: "即时执行", right: "立刻执行计划", wrong: "再等等", lesson: "知而不行，只是未知。" },
  { type: "平衡型", focus: "稳定复利", right: "守系统复盘", wrong: "盈利后放纵", lesson: "稳定不是不犯错，而是错误不扩大。" }
];

const scenes = [
  { key: "spike", name: "急拉诱惑", prompt: "分时突然拉升，消息和情绪同时变热。", base: [38, 42, 48, 61, 75, 86, 74, 69, 63, 58, 54, 50] },
  { key: "breakdown", name: "破位反抽", prompt: "价格跌破计划线后出现反抽，亏损开始考验心性。", base: [78, 74, 70, 63, 55, 48, 52, 47, 43, 39, 41, 36] },
  { key: "wash", name: "震荡洗盘", prompt: "盘中上下扫动，盈利和回撤反复出现。", base: [50, 55, 48, 54, 58, 52, 61, 56, 64, 59, 67, 71] },
  { key: "gap", name: "跳空缺口", prompt: "开盘出现跳空，账户情绪比价格更先波动。", base: [46, 48, 51, 68, 72, 66, 63, 60, 65, 62, 57, 54] },
  { key: "late", name: "尾盘异动", prompt: "临近收盘突然异动，今天是否临时起念。", base: [44, 43, 45, 46, 44, 45, 47, 49, 53, 62, 70, 65] },
  { key: "loss", name: "连亏之后", prompt: "连续两次小亏后，又出现一个看似能回本的机会。", base: [62, 59, 55, 57, 53, 50, 48, 51, 46, 44, 47, 42] },
  { key: "profit", name: "盈利回撤", prompt: "浮盈出现后开始回撤，落袋和计划之间开始拉扯。", base: [42, 46, 51, 58, 64, 70, 76, 72, 69, 66, 71, 68] },
  { key: "rumor", name: "消息扰动", prompt: "群里出现利好传闻，大V观点和盘面波动同时出现。", base: [48, 51, 49, 55, 60, 58, 64, 61, 57, 63, 59, 56] },
  { key: "support", name: "支撑位试探", prompt: "价格反复试探支撑，你需要区分计划和幻想。", base: [66, 62, 58, 55, 52, 54, 51, 53, 50, 52, 49, 48] },
  { key: "trend", name: "趋势回踩", prompt: "趋势中出现正常回踩，考验的是是否过度反应。", base: [42, 46, 50, 55, 61, 66, 62, 65, 69, 72, 70, 75] },
  { key: "false_break", name: "假突破回落", prompt: "价格短暂突破后回落，诱发确认和怀疑的拉扯。", base: [45, 48, 52, 58, 66, 72, 63, 57, 54, 50, 47, 44] },
  { key: "panic_low", name: "恐慌低开", prompt: "低开后情绪迅速扩散，真正要处理的是慌乱。", base: [62, 54, 48, 44, 40, 43, 46, 42, 45, 49, 47, 50] },
  { key: "late_chase", name: "尾盘追单", prompt: "收盘前突然冲高，时间压力让决策变形。", base: [43, 44, 45, 47, 46, 48, 50, 53, 59, 67, 73, 69] },
  { key: "gap_fill", name: "缺口回补", prompt: "跳空后的回补过程让预期和事实反复冲突。", base: [58, 70, 74, 68, 63, 59, 55, 52, 50, 54, 51, 48] },
  { key: "volume_dry", name: "缩量僵持", prompt: "成交缩小、价格横住，最容易把无聊误认为安全。", base: [51, 52, 50, 51, 49, 50, 52, 51, 53, 52, 54, 53] },
  { key: "limit_open", name: "涨停开板", prompt: "涨停板打开后，贪心、恐惧和侥幸同时出现。", base: [55, 64, 75, 86, 91, 84, 79, 82, 74, 69, 72, 65] },
  { key: "sector_diverge", name: "板块分化", prompt: "同板块有的继续强，有的开始弱，考验独立判断。", base: [48, 53, 57, 55, 61, 58, 54, 59, 56, 62, 60, 57] },
  { key: "news_reverse", name: "消息反转", prompt: "刚相信消息，盘面却反向运动，考验是否愿意看事实。", base: [52, 58, 63, 61, 56, 50, 45, 47, 42, 39, 41, 37] },
  { key: "after_win", name: "盈利后试探", prompt: "刚做对一笔后又遇到机会，最容易高估自己。", base: [46, 50, 55, 61, 68, 72, 69, 73, 70, 75, 71, 76] },
  { key: "after_loss", name: "亏损后诱惑", prompt: "刚亏完又出现波动机会，回本念头容易抢走方向盘。", base: [58, 54, 50, 47, 44, 46, 51, 55, 53, 49, 45, 42] }
];

const variants = [
  "开盘十分钟",
  "午后第一波",
  "板块轮动中",
  "连续上涨后",
  "连续下跌后",
  "缩量震荡时",
  "放量冲高后",
  "消息发酵时",
  "指数跳水时",
  "尾盘临近时",
  "反复横盘后",
  "前高压力位",
  "成本线附近",
  "刚刚止盈后",
  "刚刚止损后",
  "账户回撤后",
  "直播情绪很热时",
  "群消息刷屏时",
  "指数分歧加大时",
  "仓位已经偏重时"
];

const pressures = [
  "你听见心里说“这次必须抓住”。",
  "你发现自己手指已经靠近买入按钮。",
  "你想起上一笔错过的机会。",
  "你担心别人已经先上车。",
  "你开始寻找支持自己动作的理由。",
  "你把短线波动想象成确定趋势。",
  "你想用这一笔修复今天的情绪。",
  "你突然不愿意再看原来的交易计划。",
  "你开始把幻想当成耐心。",
  "你能感觉到身体已经紧张。"
];

const neutralOptions = ["暂停观照", "写下计划", "降低仓位", "收盘复盘"];

const questions = [];
const usedPrompts = new Set();
let index = 1;

const basePerType = Math.floor(TARGET_TOTAL / types.length);
const remainder = TARGET_TOTAL % types.length;

for (const [typeIndex, type] of types.entries()) {
  const typeTarget = basePerType + (typeIndex < remainder ? 1 : 0);
  let typeCount = 0;
  let attempt = 0;

  while (typeCount < typeTarget) {
    const scene = scenes[(attempt + typeIndex * 3) % scenes.length];
    const variant = variants[(Math.floor(attempt / scenes.length) + typeIndex) % variants.length];
    const pressure = pressures[(Math.floor(attempt / (scenes.length * variants.length)) + typeIndex * 5) % pressures.length];
    const prompt = `${variant}，${scene.prompt}${pressure}这一题练的是「${type.focus}」。`;
    attempt += 1;

    if (usedPrompts.has(prompt)) continue;

    const id = `KL${String(index).padStart(3, "0")}`;
    const candles = scene.base.map((value, candleIndex) =>
      clamp(value + ((attempt * 3 + candleIndex * 2 + index + typeIndex) % 11) - 5, 20, 92)
    );
    const options = buildOptions(type, attempt);

    questions.push({
      id,
      title: `${scene.name}｜${type.focus}`,
      prompt,
      scene_type: scene.name,
      personality_type: type.type,
      focus: type.focus,
      candles,
      options,
      right_decision: type.right,
      wrong_decision: type.wrong,
      yangming_lesson: type.lesson,
      difficulty: attempt % 5 === 0 ? "高压" : attempt % 3 === 0 ? "进阶" : "入门",
      version: VERSION
    });
    usedPrompts.add(prompt);
    typeCount += 1;
    index += 1;
  }
}

validateBank(questions);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
console.log(`已生成K线心性练习题库：${questions.length}题 -> ${outputPath}`);

function buildOptions(type, offset) {
  const rotateBy = offset % neutralOptions.length;
  const rotated = neutralOptions.slice(rotateBy).concat(neutralOptions.slice(0, rotateBy));
  const labels = [type.wrong, type.right, ...rotated].filter((item, index, arr) => arr.indexOf(item) === index).slice(0, 4);
  return labels.map((label) => ({
    label,
    principle: label === type.right ? "知行合一" : label === type.wrong ? "心性偏差" : "临盘观照"
  }));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function validateBank(items) {
  if (items.length !== TARGET_TOTAL) throw new Error(`K线题库总量错误：${items.length}`);
  assertUnique(items, "id");
  assertUnique(items, "prompt");
}

function assertUnique(items, key) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item[key])) throw new Error(`${key} 重复：${item[key]}`);
    seen.add(item[key]);
  }
}
