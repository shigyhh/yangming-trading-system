import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSESSMENT_REPORT_SCHEMA_VERSION,
  buildAssessmentReport,
  buildRiskRadar,
  buildTrainingPrescription7Days,
  COMPLIANCE_NOTICE
} from "./index.js";

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];

test("personality engine builds unified assessment_report_v1", () => {
  const report = buildAssessmentReport({
    now: new Date("2026-06-01T08:00:00.000Z"),
    reportId: "RPT-TEST-001",
    userId: "user-test",
    answers: [
      { questionId: "q1", optionId: "a" },
      { questionId: "q2", optionId: "b" }
    ],
    questions: [
      {
        id: "q1",
        options: [{ id: "a", tags: ["fomo_chaser"], weight: 2 }]
      },
      {
        id: "q2",
        options: [{ id: "b", tags: ["hold_and_hope"], weight: 1 }]
      }
    ],
    source: "unit-test"
  });

  assert.equal(report.schemaVersion, ASSESSMENT_REPORT_SCHEMA_VERSION);
  assert.equal(report.reportId, "RPT-TEST-001");
  assert.equal(report.userId, "user-test");
  assert.equal(report.primaryPersonality.label, "冲动型");
  assert.equal(report.primaryType.label, "冲动型");
  assert.equal(report.secondaryPersonality.label, "扛单型");
  assert.equal(report.trainingPrescription7Days.length, 7);
  assert.equal(report.complianceNotice, COMPLIANCE_NOTICE);
  assert.ok(report.conclusion.includes("训练重点"));
  assert.ok(report.emotionalTriggers.length >= 1);

  const searchableText = JSON.stringify(report);
  forbiddenPhrases.forEach((phrase) => {
    assert.equal(searchableText.includes(phrase), false, `contains forbidden phrase: ${phrase}`);
  });
});

test("risk radar and training prescription stay bounded", () => {
  const radar = buildRiskRadar({
    fomo_chaser: 99,
    panic_runner: 1,
    hold_and_hope: 2
  });
  const prescription = buildTrainingPrescription7Days("hold_and_hope");

  assert.ok(radar.every((item) => item.value >= 0 && item.value <= 100));
  assert.equal(prescription.length, 7);
  assert.ok(prescription[0].action.includes("止损条件"));
});
