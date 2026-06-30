const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  AFTER_REVIEW_RESPONSE_CHOICES,
  ZHIXING_REMINDER_CHOICES,
  buildTrainingPreReminder,
  buildTrainingSceneReminder,
  buildAfterReviewRepeatInsights,
  buildReviewRepeatReminder,
  createInterventionEvent,
  normalizeZhixingReminderResponse,
  shouldShowAfterReviewRepeatReminder
} = require("./index");
const {
  buildExecutionPlanLibrary,
  createExecutionPlan
} = require("../execution-plan/index");

assert.deepStrictEqual(ZHIXING_REMINDER_CHOICES.map((item) => item.label), [
  "继续",
  "改为观望",
  "稍后再练",
  "本局不再提醒",
  "已按计划执行",
  "仍然偏离",
  "说不清"
]);
assert.deepStrictEqual(AFTER_REVIEW_RESPONSE_CHOICES.map((item) => item.label), [
  "我知道了",
  "进入针对训练",
  "稍后再练",
  "本次不再提醒",
  "已按计划执行",
  "仍然偏离",
  "说不清"
]);

const preReminder = buildTrainingPreReminder({
  errorType: "追高冲动",
  nextAction: "第一根放量不追，先观察"
});
assert.strictEqual(preReminder.triggerType, "before_training");
assert.strictEqual(preReminder.trigger_type, "before_training");
assert.strictEqual(preReminder.errorType, "追高冲动");
assert.strictEqual(preReminder.message.includes("先停一下"), true);
assert.strictEqual(preReminder.message.includes("追高冲动"), true);
assert.strictEqual(preReminder.message.includes("先观察，等回踩确认"), true);

const planLibrary = buildExecutionPlanLibrary({
  records: [
    createExecutionPlan({
      errorType: "追高冲动",
      expectedAction: "先观察两根确认",
      nextAction: "先观察两根确认"
    }, { id: "plan-reminder-custom" })
  ]
});
const planReminder = buildTrainingPreReminder({
  errorType: "追高冲动",
  nextAction: "旧动作不应优先",
  executionPlanLibrary: planLibrary
});
assert.strictEqual(planReminder.nextAction, "先观察两根确认");
assert.strictEqual(planReminder.next_action, "先观察两根确认");
assert.strictEqual(planReminder.message.includes("先观察两根确认"), true);

const sceneReminder = buildTrainingSceneReminder({
  errorType: "追高冲动",
  sceneTag: "放量拉升",
  shownCount: 1,
  muted: false
});
assert.strictEqual(sceneReminder.triggerType, "during_training");
assert.strictEqual(sceneReminder.sceneTag, "放量拉升");
assert.strictEqual(sceneReminder.message.includes("按你的执行计划处理"), true);

assert.strictEqual(buildTrainingSceneReminder({
  errorType: "追高冲动",
  sceneTag: "放量拉升",
  shownCount: 2
}), null);
assert.strictEqual(buildTrainingSceneReminder({
  errorType: "追高冲动",
  sceneTag: "放量拉升",
  muted: true
}), null);
assert.strictEqual(buildTrainingSceneReminder({
  errorType: "追高冲动",
  sceneTag: "横盘磨人",
  shownCount: 0
}), null);

const repeatReminder = buildReviewRepeatReminder({
  currentRecord: {
    id: "review-current",
    mainErrorType: "追高冲动",
    triggerScene: "放量拉升",
    createdAt: Date.now()
  },
  records: [
    { id: "review-old-1", main_error_type: "追高冲动", trigger_scene: "放量拉升", created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "review-old-2", mainErrorType: "计划外交易", triggerScene: "横盘磨人", createdAt: Date.now() }
  ]
});
assert.strictEqual(repeatReminder.triggerType, "after_review");
assert.strictEqual(repeatReminder.error_type, "追高冲动");
assert.strictEqual(repeatReminder.repeatCount, 2);
assert.strictEqual(repeatReminder.message.includes("这不是第一次出现"), true);
assert.strictEqual(repeatReminder.message.includes("本次只记一个动作"), true);

assert.strictEqual(buildReviewRepeatReminder({
  currentRecord: { mainErrorType: "追高冲动", createdAt: Date.now() },
  records: [{ mainErrorType: "计划外交易", createdAt: Date.now() }]
}), null);

const repeatNow = new Date("2026-06-20T10:00:00.000Z").getTime();
const firstThoughtSceneReminder = buildReviewRepeatReminder({
  now: repeatNow,
  currentRecord: {
    id: "review-repeat-current",
    mainErrorType: "计划外交易",
    firstThought: "怕错过",
    triggerScene: "突然异动",
    sceneTags: ["突然异动", "横盘噪音"],
    nextAction: "先记录，再行动",
    executionResult: "deviated",
    createdAt: "2026-06-20T09:00:00.000Z"
  },
  records: [
    {
      id: "review-repeat-thought",
      main_error_type: "补仓冲动",
      first_thought: "怕错过",
      trigger_scene: "突然异动",
      created_at: "2026-06-18T09:00:00.000Z"
    },
    {
      id: "review-repeat-old",
      main_error_type: "计划外交易",
      first_thought: "旧念头",
      trigger_scene: "突然异动",
      created_at: "2026-05-01T09:00:00.000Z"
    }
  ]
});
assert.strictEqual(firstThoughtSceneReminder.triggerType, "after_review");
assert.strictEqual(firstThoughtSceneReminder.reviewId, "review-repeat-current");
assert.strictEqual(firstThoughtSceneReminder.sourceType, "trade_review");
assert.strictEqual(firstThoughtSceneReminder.firstThought, "怕错过");
assert.strictEqual(firstThoughtSceneReminder.triggerScene, "突然异动");
assert.strictEqual(firstThoughtSceneReminder.metadata.repeatErrorTypeCount, 1);
assert.strictEqual(firstThoughtSceneReminder.metadata.repeatFirstThoughtCount, 2);
assert.strictEqual(firstThoughtSceneReminder.metadata.repeatTriggerSceneCount, 2);
assert.strictEqual(firstThoughtSceneReminder.metadata.range, "30d");
assert.strictEqual(firstThoughtSceneReminder.metadata.reminderSource, "after_review_repeat");
assert.strictEqual(firstThoughtSceneReminder.message.includes("第一念又落在「怕错过」"), true);
assert.strictEqual(firstThoughtSceneReminder.message.includes("这个场景最近反复触发你"), true);

const repeatInsights = buildAfterReviewRepeatInsights({
  now: repeatNow,
  currentRecord: firstThoughtSceneReminder,
  records: [
    { id: "insight-1", mainErrorType: "计划外交易", firstThought: "怕错过", triggerScene: "突然异动", createdAt: "2026-06-17T09:00:00.000Z" },
    { id: "insight-old", mainErrorType: "计划外交易", firstThought: "怕错过", triggerScene: "突然异动", createdAt: "2026-04-17T09:00:00.000Z" }
  ]
});
assert.strictEqual(repeatInsights.repeatErrorTypeCount, 2);
assert.strictEqual(repeatInsights.repeatFirstThoughtCount, 2);
assert.strictEqual(repeatInsights.repeatTriggerSceneCount, 2);
assert.strictEqual(repeatInsights.hasRepeat, true);

assert.strictEqual(buildReviewRepeatReminder({
  now: repeatNow,
  currentRecord: {
    id: "review-insufficient",
    mainErrorType: "追高冲动",
    firstThought: "怕错过",
    triggerScene: "放量拉升",
    createdAt: "2026-06-20T09:00:00.000Z"
  },
  records: [
    { id: "review-too-old", mainErrorType: "追高冲动", firstThought: "怕错过", triggerScene: "放量拉升", createdAt: "2026-04-01T09:00:00.000Z" }
  ]
}), null);

const planRepeatLibrary = buildExecutionPlanLibrary({
  records: [
    createExecutionPlan({
      errorType: "追高冲动",
      expectedAction: "先观察两根确认",
      nextAction: "只记录第一念，不下动作"
    }, { id: "plan-after-review-repeat" })
  ]
});
const planRepeatReminder = buildReviewRepeatReminder({
  now: repeatNow,
  currentRecord: {
    id: "review-plan-repeat",
    mainErrorType: "追高冲动",
    firstThought: "怕错过",
    triggerScene: "放量拉升",
    nextAction: "旧动作不应优先",
    createdAt: "2026-06-20T09:00:00.000Z"
  },
  records: [
    { id: "review-plan-repeat-old", mainErrorType: "追高冲动", firstThought: "怕错过", triggerScene: "放量拉升", createdAt: "2026-06-18T09:00:00.000Z" }
  ],
  executionPlanLibrary: planRepeatLibrary
});
assert.strictEqual(planRepeatReminder.planId, "plan-after-review-repeat");
assert.strictEqual(planRepeatReminder.expectedAction, "先观察两根确认");
assert.strictEqual(planRepeatReminder.nextAction, "只记录第一念，不下动作");
assert.strictEqual(planRepeatReminder.message.includes("只记录第一念，不下动作"), true);

const frequencyBase = {
  triggerType: "after_review",
  reviewId: "review-repeat-current",
  errorType: "计划外交易",
  createdAt: "2026-06-20T09:00:00.000Z"
};
assert.deepStrictEqual(shouldShowAfterReviewRepeatReminder({
  reminder: frequencyBase,
  existingEvents: [
    { triggerType: "after_review", reviewId: "review-repeat-current", errorType: "计划外交易", createdAt: "2026-06-20T09:10:00.000Z" }
  ],
  now: repeatNow
}), { show: false, reason: "review_id" });
assert.deepStrictEqual(shouldShowAfterReviewRepeatReminder({
  reminder: Object.assign({}, frequencyBase, { reviewId: "review-repeat-new" }),
  existingEvents: [
    { trigger_type: "after_review", review_id: "other-review", error_type: "计划外交易", created_at: "2026-06-20T08:10:00.000Z" }
  ],
  now: repeatNow
}), { show: false, reason: "daily_error_type" });
assert.deepStrictEqual(shouldShowAfterReviewRepeatReminder({
  reminder: Object.assign({}, frequencyBase, { reviewId: "review-repeat-muted" }),
  muted: true,
  now: repeatNow
}), { show: false, reason: "muted" });
assert.deepStrictEqual(shouldShowAfterReviewRepeatReminder({
  reminder: Object.assign({}, frequencyBase, { reviewId: "review-repeat-ok", errorType: "补仓冲动" }),
  existingEvents: [],
  now: repeatNow
}), { show: true, reason: "" });

const event = createInterventionEvent({
  id: "event-1",
  userId: "user-1",
  triggerType: "during_training",
  errorType: "追高冲动",
  sceneTag: "放量拉升",
  message: "提醒",
  userResponse: "改为观望",
  createdAt: "2026-06-28T10:00:00.000Z"
});
assert.strictEqual(event.id, "event-1");
assert.strictEqual(event.userId, "user-1");
assert.strictEqual(event.user_id, "user-1");
assert.strictEqual(event.triggerType, "during_training");
assert.strictEqual(event.trigger_type, "during_training");
assert.strictEqual(event.errorType, "追高冲动");
assert.strictEqual(event.error_type, "追高冲动");
assert.strictEqual(event.sceneTag, "放量拉升");
assert.strictEqual(event.scene_tag, "放量拉升");
assert.strictEqual(event.userResponse, "change_to_hold");
assert.strictEqual(event.user_response, "change_to_hold");
assert.strictEqual(event.createdAt, "2026-06-28T10:00:00.000Z");
assert.strictEqual(event.created_at, "2026-06-28T10:00:00.000Z");

const repeatEvent = createInterventionEvent(Object.assign({}, firstThoughtSceneReminder, {
  id: "event-repeat-review",
  userId: "user-repeat",
  userResponse: "本次不再提醒",
  createdAt: "2026-06-20T10:30:00.000Z"
}));
assert.strictEqual(repeatEvent.id, "event-repeat-review");
assert.strictEqual(repeatEvent.triggerType, "after_review");
assert.strictEqual(repeatEvent.sourceType, "trade_review");
assert.strictEqual(repeatEvent.reviewId, "review-repeat-current");
assert.strictEqual(repeatEvent.firstThought, "怕错过");
assert.strictEqual(repeatEvent.triggerScene, "突然异动");
assert.strictEqual(repeatEvent.metadata.repeatFirstThoughtCount, 2);
assert.strictEqual(repeatEvent.metadata.repeatTriggerSceneCount, 2);
assert.strictEqual(repeatEvent.metadata.reminderSource, "after_review_repeat");
assert.strictEqual(repeatEvent.userResponse, "mute_session");

assert.strictEqual(normalizeZhixingReminderResponse("继续"), "continue");
assert.strictEqual(normalizeZhixingReminderResponse("本局不再提醒"), "mute_session");
assert.strictEqual(normalizeZhixingReminderResponse("我知道了"), "continue");
assert.strictEqual(normalizeZhixingReminderResponse("本次不再提醒"), "mute_session");
assert.strictEqual(normalizeZhixingReminderResponse("进入针对训练"), "continue");
assert.strictEqual(normalizeZhixingReminderResponse("已按计划执行"), "followed_plan");
assert.strictEqual(normalizeZhixingReminderResponse("仍然偏离"), "deviated_again");
assert.strictEqual(normalizeZhixingReminderResponse("说不清"), "unclear");
assert.strictEqual(normalizeZhixingReminderResponse("unknown"), "unknown");

const tradeReviewPageSource = fs.readFileSync(
  path.join(__dirname, "../../pages/trade-review/index.js"),
  "utf8"
);
assert.strictEqual(tradeReviewPageSource.includes("reviewRepeatReminderState"), true);
assert.strictEqual(tradeReviewPageSource.includes("AFTER_REVIEW_RESPONSE_CHOICES"), true);
assert.strictEqual(tradeReviewPageSource.includes("shouldShowAfterReviewRepeatReminder"), true);
assert.strictEqual(tradeReviewPageSource.includes("review_to_training"), true);

console.log("zhixing reminder tests passed");
