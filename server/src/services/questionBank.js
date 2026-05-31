import { config } from "../config.js";
import { readJsonFile } from "../lib/store.js";

export const riskTypes = ["冲动型", "扛单型", "完美主义型", "偏执型", "焦虑型", "从众型", "赌徒型", "拖延型"];
export const allTypes = [...riskTypes, "平衡型"];
export const perTypeCountMap = { 27: 3, 45: 5, 90: 10, 108: 12, 360: 40 };

let cachedBank = null;

export async function loadQuestionBank() {
  if (cachedBank) return cachedBank;
  cachedBank = await readJsonFile(config.questionBankPath, []);
  return cachedBank;
}

export function clearQuestionBankCache() {
  cachedBank = null;
}

export async function getQuestionBankStats() {
  const bank = await loadQuestionBank();
  const counts = {};
  const subDimensions = new Set();

  for (const item of bank) {
    counts[item.personality_type] = (counts[item.personality_type] || 0) + 1;
    subDimensions.add(`${item.personality_type}:${item.sub_dimension}`);
  }

  return {
    total_questions: bank.length,
    personality_counts: counts,
    sub_dimension_count: subDimensions.size
  };
}

export async function selectQuestions({ testVersion = "45", excludeQuestionIds = [] }) {
  const bank = await loadQuestionBank();
  if (!bank.length) {
    const error = new Error("题库为空，请先运行 npm run import:questions");
    error.statusCode = 500;
    throw error;
  }

  const version = String(testVersion || "45");
  const perTypeCount = perTypeCountMap[version] || 5;
  const excludeIds = new Set(excludeQuestionIds || []);
  const selected = [];

  for (const type of allTypes) {
    const typePool = bank.filter((item) => item.status !== "disabled" && item.personality_type === type);
    const freshPool = typePool.filter((item) => !excludeIds.has(item.question_id));
    const usablePool = freshPool.length >= perTypeCount ? freshPool : typePool;
    const picks = pickBalancedQuestions(usablePool, perTypeCount);

    if (picks.length < perTypeCount) {
      const error = new Error(`${type} 题库数量不足，无法抽取 ${perTypeCount} 题`);
      error.statusCode = 500;
      throw error;
    }

    selected.push(...picks);
  }

  return {
    test_version: version,
    per_type_count: perTypeCount,
    total_questions: selected.length,
    questions: shuffle(selected).map((question, index) => ({
      index: index + 1,
      question_id: question.question_id,
      question_code: question.question_code || question.question_id,
      personality_type: question.personality_type,
      sub_dimension: question.sub_dimension,
      scene_tag: question.scene_tag,
      question_text: question.question_text,
      options: [
        { value: 1, label: "几乎从不", frequency: "0%-10%" },
        { value: 2, label: "偶尔", frequency: "10%-30%" },
        { value: 3, label: "有时", frequency: "30%-60%" },
        { value: 4, label: "经常", frequency: "60%-80%" },
        { value: 5, label: "几乎常态", frequency: "80%-100%" }
      ]
    }))
  };
}

function pickBalancedQuestions(items, count) {
  const bySub = groupBy(items, "sub_dimension");
  const subNames = shuffle(Object.keys(bySub));
  const picked = [];

  for (const subName of subNames) {
    if (picked.length >= count) break;
    const candidates = shuffle(bySub[subName]);
    if (candidates.length) picked.push(candidates[0]);
  }

  const pickedIds = new Set(picked.map((item) => item.question_id));
  const rest = shuffle(items.filter((item) => !pickedIds.has(item.question_id)));

  for (const item of rest) {
    if (picked.length >= count) break;
    picked.push(item);
  }

  return picked.slice(0, count);
}

export function groupBy(items, key) {
  return items.reduce((memo, item) => {
    const value = item[key] || "未分类";
    if (!memo[value]) memo[value] = [];
    memo[value].push(item);
    return memo;
  }, {});
}

export function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
