const assert = require("assert");
const {
  buildZhixingStability,
  buildTripleReflection
} = require("./index");

function runAlignedCase() {
  const context = {
    assessment: {
      primary: "冲动型",
      primaryMirror: "追涨之镜"
    },
    tradeReviewState: {
      records: [
        {
          id: "tr-1",
          sourceType: "trade_review",
          relatedMirror: "追涨之镜",
          firstThought: "怕错过",
          boundaryState: "near",
          changedPlan: "yes",
          exitPrepared: "yes",
          createdAt: 1,
          scores: {
            boundary: 58,
            execution: 62,
            stability: 54,
            review: 80
          }
        },
        {
          id: "tr-2",
          sourceType: "trade_review",
          relatedMirror: "追涨之镜",
          firstThought: "想快一点",
          boundaryState: "kept",
          changedPlan: "no",
          planBoundary: "边界前停十秒",
          createdAt: 2,
          scores: {
            boundary: 76,
            execution: 72,
            stability: 68,
            review: 84
          }
        },
        {
          id: "tr-kline-1",
          sourceType: "kline_training",
          relatedMirror: "追涨之镜",
          createdAt: 3,
          scores: {
            boundary: 70,
            execution: 74,
            stability: 66,
            review: 88
          }
        }
      ]
    },
    klineReviewReports: {
      records: [
        {
          id: "kr-1",
          relatedMirror: "追涨之镜",
          createdAt: 4,
          scores: {
            planExecution: 74,
            boundaryKeeping: 70,
            impulseDelay: 64,
            emotionalStability: 68,
            reviewCompletion: 90
          }
        }
      ]
    },
    klineMindRecords: {
      "2026-06-03": { completed: true, score: 72, updatedAt: 5 }
    },
    training7State: {
      currentDay: 2,
      records: {
        1: { completed: true, tasks: { opening_check: true, intraday_boundary: true } },
        2: { completed: false, tasks: { opening_check: true, intraday_boundary: false } }
      }
    },
    training7View: {
      currentDay: 2,
      progressPercent: 28,
      today: {
        taskStatus: { opening_check: true, intraday_boundary: false, closing_review: false }
      }
    }
  };

  const stability = buildZhixingStability(context);
  assert.strictEqual(stability.dimensions.length, 5);
  assert.ok(stability.total > 0 && stability.total <= 100);
  assert.strictEqual(stability.totalText, String(stability.total));
  assert.strictEqual(stability.sourceCounts.tradeReviewCount, 2);
  assert.ok(stability.dimensions.some((item) => item.name === "计划清晰度"));
  assert.ok(stability.dimensions.some((item) => item.name === "边界执行度"));
  assert.ok(stability.dimensions.some((item) => item.name === "临盘稳定度"));
  assert.ok(stability.dimensions.some((item) => item.name === "复盘完成度"));
  assert.ok(stability.dimensions.some((item) => item.name === "训练完成度"));

  const triple = buildTripleReflection(context);
  assert.strictEqual(triple.state, "aligned");
  assert.strictEqual(triple.mainMirror, "追涨之镜");
  assert.strictEqual(triple.unifiedConclusion, "追涨之镜增强");
  assert.strictEqual(triple.evidenceLevel, "strong");
  assert.ok(triple.proofLine.indexOf("→ 追涨之镜增强") >= 0);
  assert.strictEqual(triple.matchedSources.length, 3);
  assert.ok(triple.conclusion.indexOf("追涨之镜") >= 0);
}

function runConflictCase() {
  const triple = buildTripleReflection({
    assessment: {
      primary: "冲动型",
      primaryMirror: "追涨之镜"
    },
    tradeReviewState: {
      records: [
        {
          id: "tr-1",
          sourceType: "trade_review",
          relatedMirror: "扛单之镜",
          createdAt: 1
        }
      ]
    },
    klineReviewReports: {
      records: [
        {
          id: "kr-1",
          relatedMirror: "焦虑之镜",
          createdAt: 2
        }
      ]
    }
  });
  assert.strictEqual(triple.state, "conflict");
  assert.strictEqual(triple.stateLabel, "需要校准");
  assert.strictEqual(triple.unifiedConclusion, "主镜暂不强化");
  assert.strictEqual(triple.evidenceLevel, "calibration");
  assert.ok(triple.proofLine.indexOf("三路不一致") >= 0);
  assert.ok(triple.conclusion.indexOf("认知、压力盲练与真实交易记录") >= 0);
}

function runEmptyCase() {
  const stability = buildZhixingStability({});
  assert.strictEqual(stability.totalText, "--");
  assert.strictEqual(stability.level, "待照见");
  assert.ok(stability.dimensions.every((item) => item.scoreText === "待记录"));

  const triple = buildTripleReflection({});
  assert.strictEqual(triple.state, "empty");
  assert.strictEqual(triple.mainMirror, "待照见");
  assert.strictEqual(triple.unifiedConclusion, "三证尚未形成");
}

runAlignedCase();
runConflictCase();
runEmptyCase();

console.log("zhixing-stability tests passed");
