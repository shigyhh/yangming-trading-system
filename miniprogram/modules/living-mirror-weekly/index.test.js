const assert = require("assert");
const { buildWeeklyLivingMirrorReport } = require("./index");

const NOW = new Date("2026-06-28T12:00:00+08:00").getTime();

function buildReport(input) {
  return buildWeeklyLivingMirrorReport({
    now: NOW,
    tradeReviewState: input.tradeReviewState,
    klineSessionState: input.klineSessionState
  });
}

function testWeeklyReportAggregatesReviewsAndTraining() {
  const report = buildReport({
    tradeReviewState: {
      records: [
        {
          createdAt: "2026-06-24T10:00:00+08:00",
          mainErrorType: "追高冲动",
          firstThought: "怕错过",
          nextRule: "第一根放量不追，先停十秒",
          execution_result: "aligned"
        },
        {
          created_at: "2026-06-25T10:00:00+08:00",
          main_error_type: "追高冲动",
          first_thought: "怕错过",
          next_rule: "第一根放量不追，先停十秒",
          executionResult: "deviated"
        },
        {
          createdAt: "2026-06-26T10:00:00+08:00",
          mainErrorType: "补仓冲动",
          firstThought: "不甘心",
          nextRule: "不在破位亏损中补仓",
          execution_result: "aligned"
        }
      ]
    },
    klineSessionState: {
      records: [
        {
          createdAt: "2026-06-27T10:00:00+08:00",
          errorType: "追高冲动",
          firstThought: "怕错过",
          repeatCount: 1,
          execution_result: "deviated"
        }
      ]
    }
  });

  assert.strictEqual(report.hasStats, true);
  assert.strictEqual(report.total, 4);
  assert.strictEqual(report.topError.label, "追高冲动");
  assert.strictEqual(report.topError.count, 3);
  assert.strictEqual(report.topFirstThought.label, "怕错过");
  assert.strictEqual(report.topFirstThought.count, 3);
  assert.strictEqual(report.executionConsistency.rateText, "50%");
  assert.ok(report.oldQuestionRepeat.count >= 2);
  assert.ok(report.nextWeekPlans.length >= 1);
  assert.ok(report.nextWeekPlans[0].title.includes("追高冲动"));
}

function testEmptyReportDoesNotForceAttribution() {
  const report = buildReport({});
  assert.strictEqual(report.hasStats, false);
  assert.strictEqual(report.total, 0);
  assert.strictEqual(report.topError.text, "样本不足");
  assert.strictEqual(report.executionConsistency.rateText, "样本不足");
  assert.deepStrictEqual(report.nextWeekPlans, []);
}

function testProgressComparesPreviousWeek() {
  const report = buildReport({
    tradeReviewState: {
      records: [
        {
          createdAt: "2026-06-18T10:00:00+08:00",
          mainErrorType: "追高冲动",
          firstThought: "怕错过",
          execution_result: "deviated"
        },
        {
          createdAt: "2026-06-19T10:00:00+08:00",
          mainErrorType: "补仓冲动",
          firstThought: "不甘心",
          execution_result: "deviated"
        },
        {
          createdAt: "2026-06-24T10:00:00+08:00",
          mainErrorType: "追高冲动",
          firstThought: "怕错过",
          execution_result: "aligned"
        },
        {
          createdAt: "2026-06-25T10:00:00+08:00",
          mainErrorType: "追高冲动",
          firstThought: "怕错过",
          execution_result: "deviated"
        }
      ]
    }
  });

  assert.ok(report.progress.text.includes("提升"));
}

testWeeklyReportAggregatesReviewsAndTraining();
testEmptyReportDoesNotForceAttribution();
testProgressComparesPreviousWeek();

console.log("living-mirror-weekly tests passed");
