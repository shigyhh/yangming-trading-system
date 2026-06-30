const assert = require("assert");
const {
  buildBehaviorLoop,
  buildLivingMirrorTree,
  buildMiniHomeView,
  buildMiniLoopProgress,
  buildMiniProgramBinding,
  buildTodayNextStepState,
  normalizeThoughtType
} = require("./index");

const binding = buildMiniProgramBinding({
  userBinding: { inviteCode: "ZX123456", phoneMask: "138****5678" },
  profile: { createdAt: 1 },
  linkToken: "lt_mock",
  reportId: "report_mock"
});

assert.strictEqual(binding.linkToken, "lt_mock");
assert.strictEqual(binding.reportId, "report_mock");
assert.strictEqual(normalizeThoughtType("我怕错过，想立刻上车"), "fomo");

const tradeReviewState = {
  records: [
    {
      id: "r1",
      relatedMirror: "追涨之镜",
      firstThought: "怕错过",
      heartThieves: ["贪", "急"],
      trainingAction: "先停十秒。",
      historicalMatch: { stagePosition: "计划外拉升" }
    },
    {
      id: "r2",
      relatedMirror: "追涨之镜",
      firstThought: "想追进去",
      heartThieves: ["贪", "急"],
      trainingAction: "写下第一念。",
      historicalMatch: { stagePosition: "计划外拉升" }
    }
  ]
};

const loop = buildBehaviorLoop(tradeReviewState);
assert.strictEqual(loop.ready, true);
assert.ok(loop.line.includes("计划外拉升"));
assert.ok(loop.line.includes("追涨之镜"));

const progress = buildMiniLoopProgress({
  binding,
  assessment: { primary: "冲动型" },
  training7View: { completedCount: 3 },
  threeSeals: { completed: true },
  tradeReviewState,
  livingMirrorStats: { totalReviews: 2, currentMirror: "追涨之镜", topThievesText: "贪 / 急" },
  assistantHandoff: { ready: true },
  shareCardState: { records: { c1: {} } },
  inviteEvents: [{ id: "invite-1" }],
  retestSnapshots: {}
});

assert.strictEqual(progress.currentNode, "retest");
assert.strictEqual(progress.completedDays, 3);
assert.strictEqual(progress.tradeReviewCount, 2);
assert.strictEqual(progress.behaviorLoop.ready, true);

const home = buildMiniHomeView({
  loopProgress: progress,
  training7View: { currentDay: 3, today: { title: "观亏损后的证明欲", boundaryPractice: "先写下第一念。" } },
  threeSeals: { thought: "怕错过", completed: true }
});
assert.ok(home.positionText.includes("复测变化"));
assert.strictEqual(home.stateLabel, "已归卷");
assert.strictEqual(home.klineText, "今日 K 线观心");
assert.ok(home.livingMirrorFeedback.includes("写入活镜"));
assert.strictEqual(home.practiceSteps.filter((item) => item.done).length, 3);

const tree = buildLivingMirrorTree({
  assessment: { primary: "冲动型" },
  loopProgress: progress,
  tradeReviewState,
  livingMirrorStats: { currentMirror: "追涨之镜", totalReviews: 2, topThievesText: "贪 / 急" }
});
assert.strictEqual(tree.trunk, "追涨之镜");
assert.ok(tree.loopLine.includes("追涨之镜"));

const today = "2026-06-28";
const yesterday = "2026-06-27";

const needReviewState = buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: { records: [] },
  klineMindRecords: {}
});
assert.strictEqual(needReviewState.status, "need_review");
assert.strictEqual(needReviewState.primaryActionText, "上传真实记录");
assert.strictEqual(needReviewState.primaryActionUrl, "/pages/trade-review/index");

const needTrainingState = buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: {
    records: [
      {
        id: "review-camel",
        date: today,
        mainErrorType: "追涨",
        firstThought: "怕错过",
        triggerScene: "放量拉升",
        nextRule: "先停十秒",
        mistakeCard: { title: "追涨错题" }
      }
    ]
  },
  klineMindRecords: {
    [today]: { date: today, sourceType: "base_blind", completed: true }
  }
});
assert.strictEqual(needTrainingState.status, "need_training");
assert.strictEqual(needTrainingState.primaryActionText, "开始今日针对训练");
assert.strictEqual(needTrainingState.mainErrorType, "追涨");
assert.strictEqual(needTrainingState.secondaryText, "根据你最近真实复盘，今日训练：追涨专项");
assert.ok(needTrainingState.primaryActionUrl.includes("sourceType=review_focus"));
assert.ok(needTrainingState.primaryActionUrl.includes("source_type=review_focus"));
assert.ok(needTrainingState.primaryActionUrl.includes("sourceReviewId=review-camel"));

const trainingCardState = buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: {
    records: [
      {
        id: "review-snake",
        created_at: `${today}T10:00:00.000Z`,
        main_error_type: "冲高回落",
        first_thought: "还会涨",
        trigger_scene: "冲高回落",
        next_action: "先写第一念",
        mistake_card: { title: "冲高回落错题" }
      }
    ]
  },
  klineMindRecords: {
    [today]: {
      date: today,
      source_type: "review_focus",
      error_type: "冲高回落",
      execution_result: "执行偏离",
      training_mistake_card: { title: "最明显执行偏离" }
    },
    [yesterday]: {
      date: yesterday,
      sourceType: "review_focus",
      errorType: "旧题",
      executionResult: "按计划执行"
    }
  }
});
assert.strictEqual(trainingCardState.status, "need_review_training_card");
assert.strictEqual(trainingCardState.primaryActionText, "查看训练错题卡");
assert.strictEqual(trainingCardState.errorType, "冲高回落");
assert.strictEqual(trainingCardState.executionResult, "执行偏离");
assert.ok(trainingCardState.primaryActionUrl.includes("showResult=1"));

const lawResultOnlyTrainingState = buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: {
    records: [
      {
        id: "review-law-result",
        date: today,
        mainErrorType: "追涨",
        nextRule: "先停十秒",
        mistakeCard: { title: "追涨错题" }
      }
    ]
  },
  klineMindRecords: {
    [today]: {
      date: today,
      source_type: "review_focus",
      error_type: "追涨",
      law_result: "broken",
      training_mistake_card: { title: "最明显执行偏离" }
    }
  }
});
assert.strictEqual(lawResultOnlyTrainingState.status, "need_review_training_card");
assert.strictEqual(lawResultOnlyTrainingState.executionResult, "执行偏离");
assert.ok(lawResultOnlyTrainingState.secondaryText.includes("执行结果：执行偏离"));

const executionResultPriorityState = buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: {
    records: [
      {
        id: "review-execution-priority",
        date: today,
        mainErrorType: "追涨",
        nextRule: "先停十秒",
        mistakeCard: { title: "追涨错题" }
      }
    ]
  },
  klineMindRecords: {
    [today]: {
      date: today,
      source_type: "review_focus",
      error_type: "追涨",
      execution_label: "aligned",
      law_result: "broken",
      training_mistake_card: { title: "最明显执行偏离" }
    }
  }
});
assert.strictEqual(executionResultPriorityState.executionResult, "按计划执行");

const missingExecutionResultState = buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: {
    records: [
      {
        id: "review-no-execution",
        updated_at: `${today}T11:00:00.000Z`,
        main_error_type: "放量拉升",
        next_rule: "先停十秒",
        mistake_card: { title: "放量拉升错题" }
      }
    ]
  },
  klineMindRecords: {
    [today]: {
      date: today,
      sourceType: "review_focus",
      errorType: "放量拉升",
      trainingMistakeCard: { title: "最明显执行偏离" }
    }
  }
});
assert.strictEqual(missingExecutionResultState.status, "need_review_training_card");
assert.strictEqual(missingExecutionResultState.executionResult, "说不清");

const singleRecordTrainingState = buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: {
    records: [
      {
        id: "review-single",
        date: today,
        mainErrorType: "追涨",
        mistakeCard: { title: "追涨错题" }
      }
    ]
  },
  todayKlineMindRecord: {
    date: today,
    sourceType: "review_focus",
    errorType: "追涨",
    executionResult: "按计划执行"
  }
});
assert.strictEqual(singleRecordTrainingState.status, "need_review_training_card");

const completedState = buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: {
    records: [
      {
        id: "review-complete",
        date: today,
        mainErrorType: "追涨",
        nextRule: "先记录，再行动",
        mistakeCard: { title: "追涨错题" }
      }
    ]
  },
  klineMindRecords: {
    [today]: {
      date: today,
      sourceType: "review_focus",
      errorType: "追涨",
      executionResult: "按计划执行",
      trainingMistakeCard: { title: "最明显执行偏离" },
      trainingMistakeCardViewed: true
    }
  }
});
assert.strictEqual(completedState.status, "completed");
assert.strictEqual(completedState.primaryActionText, "查看今日活镜");
assert.strictEqual(completedState.primaryActionUrl, "/pages/living-mirror/index");
assert.ok(completedState.secondaryText.includes("今日错题：追涨"));
assert.ok(completedState.secondaryText.includes("下次执行动作：先记录，再行动"));

const oldReviewState = buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: {
    records: [
      {
        id: "old-review",
        date: yesterday,
        mainErrorType: "追涨",
        mistakeCard: { title: "旧题" }
      }
    ]
  },
  klineMindRecords: {}
});
assert.strictEqual(oldReviewState.status, "need_review");

console.log("mini-loop module tests passed");
