const assert = require("assert");
const {
  buildLivingMirrorStats,
  buildTradeReview
} = require("./trade-review/index");
const {
  buildKlineMindRecord,
  buildKlineMindSession
} = require("./kline-mind/index");
const { buildTodayNextStepState } = require("./mini-loop/index");

function dateKey(value = Date.now()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const today = dateKey();

const review = buildTradeReview({
  id: "p1-loop-review-001",
  marketKey: "cn",
  timeframeKey: "1d",
  tradeDate: today,
  symbol: "示例标的",
  actionKey: "impulse",
  emotion: "急躁",
  firstThought: "怕错过",
  inPlan: "no",
  changedPlan: "yes",
  triggerScene: "放量拉升",
  boundaryState: "lost",
  nextAction: "先停十秒，写下第一念。",
  reviewNote: "计划外买入后，看见怕错过。"
});

assert.strictEqual(review.mainErrorType, review.main_error_type);
assert.ok(review.mainErrorType);
assert.strictEqual(review.firstThought, "怕错过");
assert.strictEqual(review.first_thought, "怕错过");
assert.strictEqual(review.triggerScene, "放量拉升");
assert.strictEqual(review.trigger_scene, "放量拉升");
assert.deepStrictEqual(review.trainingPrescription, review.training_prescription);
assert.ok(review.trainingPrescription.action);
assert.ok(review.nextAction || review.nextRule);
assert.deepStrictEqual(review.mistakeCard, review.mistake_card);

const livingMirror = buildLivingMirrorStats({ records: [review] });
assert.strictEqual(livingMirror.topMistakes[0].label, review.mainErrorType);
assert.strictEqual(livingMirror.topFirstThoughts[0].label, "怕错过");
assert.strictEqual(livingMirror.topTriggerScenes[0].label, "放量拉升");
assert.strictEqual(livingMirror.nextActionText, review.nextAction);

const reviewFocusSession = buildKlineMindSession({
  assessment: { primary: "冲动型" },
  trainingDay: { day: 1 },
  reviewFocus: {
    sourceType: "review_focus",
    source_type: "review_focus",
    sourceReviewId: review.id,
    source_review_id: review.id,
    mainErrorType: review.mainErrorType,
    main_error_type: review.main_error_type,
    triggerScene: review.triggerScene,
    trigger_scene: review.trigger_scene,
    trainingPrescription: review.trainingPrescription,
    training_prescription: review.training_prescription,
    nextAction: review.nextAction,
    next_action: review.nextAction
  }
});

assert.strictEqual(reviewFocusSession.sourceType, "review_focus");
assert.strictEqual(reviewFocusSession.source_type, "review_focus");
assert.strictEqual(reviewFocusSession.errorType, review.mainErrorType);
assert.strictEqual(reviewFocusSession.error_type, review.mainErrorType);
assert.deepStrictEqual(reviewFocusSession.trainingPrescription, review.trainingPrescription);
assert.deepStrictEqual(reviewFocusSession.training_prescription, review.trainingPrescription);
assert.deepStrictEqual(reviewFocusSession.sceneTags, ["放量拉升"]);
assert.deepStrictEqual(reviewFocusSession.scene_tags, ["放量拉升"]);
assert.strictEqual(reviewFocusSession.nextAction, review.nextAction);
assert.strictEqual(reviewFocusSession.next_action, review.nextAction);

const trainingRecord = Object.assign({}, buildKlineMindRecord({
  firstReaction: "怕错过",
  boundaryChoice: "停十秒",
  insightLine: "我看见自己被放量拉升牵动。"
}, reviewFocusSession), {
  date: today
});

assert.strictEqual(trainingRecord.sourceType, "review_focus");
assert.strictEqual(trainingRecord.source_type, "review_focus");
assert.ok(trainingRecord.errorType);
assert.strictEqual(trainingRecord.errorType, trainingRecord.error_type);
assert.deepStrictEqual(trainingRecord.trainingPrescription, trainingRecord.training_prescription);
assert.deepStrictEqual(trainingRecord.sceneTags, trainingRecord.scene_tags);
assert.ok(trainingRecord.executionResult);
assert.strictEqual(trainingRecord.executionResult, trainingRecord.execution_result);
assert.strictEqual(trainingRecord.repeatCount, 1);
assert.strictEqual(trainingRecord.repeat_count, 1);
assert.strictEqual(trainingRecord.trainingMistakeCard.title, "最明显执行偏离");
assert.strictEqual(trainingRecord.training_mistake_card.title, "最明显执行偏离");
assert.strictEqual(JSON.stringify(trainingRecord).includes("最明显失守"), false);

assert.strictEqual(buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: { records: [] },
  klineMindRecords: {}
}).status, "need_review");

assert.strictEqual(buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: { records: [review] },
  klineMindRecords: {}
}).status, "need_training");

const focusedTrainingState = buildTodayNextStepState({
  todayKey: today,
  tradeReviewState: { records: [review] },
  klineMindRecords: { [today]: trainingRecord }
});
assert.ok(["need_review_training_card", "completed"].includes(focusedTrainingState.status));

console.log("p1 loop smoke tests passed");
