const assert = require("assert");
const {
  ZHIXING_REMINDER_CHOICES,
  buildTrainingPreReminder,
  buildTrainingSceneReminder,
  buildReviewRepeatReminder,
  createInterventionEvent,
  normalizeZhixingReminderResponse
} = require("./index");

assert.deepStrictEqual(ZHIXING_REMINDER_CHOICES.map((item) => item.label), [
  "继续",
  "改为观望",
  "稍后再练",
  "本局不再提醒"
]);

const preReminder = buildTrainingPreReminder({
  errorType: "追高冲动",
  nextAction: "第一根放量不追，先观察"
});
assert.strictEqual(preReminder.triggerType, "before_training");
assert.strictEqual(preReminder.trigger_type, "before_training");
assert.strictEqual(preReminder.errorType, "追高冲动");
assert.strictEqual(preReminder.message.includes("这是你的高频旧题：追高冲动"), true);
assert.strictEqual(preReminder.message.includes("第一根放量不追，先观察"), true);

const sceneReminder = buildTrainingSceneReminder({
  errorType: "追高冲动",
  sceneTag: "放量拉升",
  shownCount: 1,
  muted: false
});
assert.strictEqual(sceneReminder.triggerType, "during_training");
assert.strictEqual(sceneReminder.sceneTag, "放量拉升");
assert.strictEqual(sceneReminder.message.includes("本次只练一个动作"), true);

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
assert.strictEqual(repeatReminder.message.includes("旧题复现提醒"), true);

assert.strictEqual(buildReviewRepeatReminder({
  currentRecord: { mainErrorType: "追高冲动", createdAt: Date.now() },
  records: [{ mainErrorType: "计划外交易", createdAt: Date.now() }]
}), null);

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

assert.strictEqual(normalizeZhixingReminderResponse("继续"), "continue");
assert.strictEqual(normalizeZhixingReminderResponse("本局不再提醒"), "mute_session");
assert.strictEqual(normalizeZhixingReminderResponse("unknown"), "unknown");

console.log("zhixing reminder tests passed");
