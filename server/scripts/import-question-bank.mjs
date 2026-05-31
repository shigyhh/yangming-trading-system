import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");
const sourcePath = path.resolve(serverRoot, process.env.QUESTION_BANK_SOURCE || "../web-mvp/data/question-bank.json");
const outputPath = path.resolve(serverRoot, "data", "question-bank.json");

const requiredTypes = ["冲动型", "扛单型", "完美主义型", "偏执型", "焦虑型", "从众型", "赌徒型", "拖延型", "平衡型"];

const raw = await fs.readFile(sourcePath, "utf8");
const source = JSON.parse(raw);

if (!Array.isArray(source)) {
  throw new Error("题库源文件必须是数组");
}

const normalized = source.map((item, index) => {
  const questionId = String(item.question_id || item.question_code || "").trim();
  if (!questionId) throw new Error(`第 ${index + 1} 行缺少 question_id`);
  if (!item.personality_type) throw new Error(`${questionId} 缺少 personality_type`);
  if (!item.sub_dimension) throw new Error(`${questionId} 缺少 sub_dimension`);
  if (!item.question_text) throw new Error(`${questionId} 缺少 question_text`);

  return {
    question_id: questionId,
    question_code: questionId,
    personality_type: String(item.personality_type).trim(),
    nature: String(item.nature || "").trim(),
    sub_dimension: String(item.sub_dimension).trim(),
    scene_tag: String(item.scene_tag || "").trim(),
    question_text: String(item.question_text).trim(),
    weight: Number(item.weight || 1),
    core_level: String(item.core_level || "").trim(),
    report_tag: String(item.report_tag || "").trim(),
    training_ability: String(item.training_ability || "").trim(),
    status: "active",
    version: source.length >= 3600 ? "3600_v1" : "720_v1"
  };
});

const ids = new Set();
for (const item of normalized) {
  if (ids.has(item.question_id)) throw new Error(`题目 ID 重复：${item.question_id}`);
  ids.add(item.question_id);
}

const counts = normalized.reduce((memo, item) => {
  memo[item.personality_type] = (memo[item.personality_type] || 0) + 1;
  return memo;
}, {});

for (const type of requiredTypes) {
  if (!counts[type]) throw new Error(`题库缺少人格类型：${type}`);
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(normalized, null, 2), "utf8");

console.log(JSON.stringify({ outputPath, total: normalized.length, counts }, null, 2));
