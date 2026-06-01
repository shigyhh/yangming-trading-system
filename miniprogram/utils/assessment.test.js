const assert = require("assert");
const { getAssessmentQuestions, getQuestionBankStats } = require("./content");
const { computeAssessment } = require("./assessment");

const questions27 = getAssessmentQuestions("27");
const questions9 = getAssessmentQuestions("9");
const questions45 = getAssessmentQuestions("45");
const questions81 = getAssessmentQuestions("81");
const questions108 = getAssessmentQuestions("108");
const stats = getQuestionBankStats();

assert.strictEqual(stats.total, 3600);
Object.keys(stats.byType).forEach((type) => assert.strictEqual(stats.byType[type], 400, type));
assert.strictEqual(questions27.length, 27);
assert.strictEqual(questions9.length, 9);
assert.strictEqual(questions45.length, 45);
assert.strictEqual(questions81.length, 81);
assert.strictEqual(questions108.length, 108);
assert.ok(!questions81.some((question) => question.mockExpanded));
assert.ok(!questions108.some((question) => question.mockExpanded));
assert.ok(questions27[0].boundaryInsight);
assert.ok(questions27[0].trigger);
assert.ok(questions27[0].mirrorName);
assert.deepStrictEqual(questions27[0].options, [0, 1, 2, 3]);

const typeCounts = questions45.reduce((counts, question) => {
  counts[question.type] = (counts[question.type] || 0) + 1;
  return counts;
}, {});
Object.keys(typeCounts).forEach((type) => assert.strictEqual(typeCounts[type], 5, type));

const answers = questions27.map((question) => question.type === "冲动型" ? 3 : 0);
const result = computeAssessment(answers, {
  modeKey: "27",
  questions: questions27,
  behaviorContext: { stageLabel: "新手期", records: [] }
});

assert.strictEqual(result.primary, "冲动型");
assert.strictEqual(result.primaryMirror, "追涨之镜");
assert.deepStrictEqual(result.primaryThieves, ["贪", "急"]);
assert.ok(result.dynamicNote.includes("冲动型"));

console.log("assessment utility tests passed");
