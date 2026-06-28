const assert = require("assert");

const {
  ZHIXING_REMINDER_CHOICES,
  buildTrainingPreReminder,
  buildTrainingSceneReminder,
  buildReviewRepeatReminder,
  createInterventionEvent
} = require("./index");

function testTrainingPreReminder() {
  const reminder = buildTrainingPreReminder({
    errorType: "追高冲动"
  });

  assert(reminder, "expected targeted training reminder");
  assert.strictEqual(reminder.triggerType, "training_pre");
  assert.strictEqual(reminder.trigger_type, "training_pre");
  assert.strictEqual(reminder.errorType, "追高冲动");
  assert(reminder.message.includes("这是你的高频旧题：追高冲动"));
  assert(reminder.message.includes("第一根放量不追"));
  assert.deepStrictEqual(reminder.choices, ZHIXING_REMINDER_CHOICES);
}

function testTrainingSceneReminderLimit() {
  const reminder = buildTrainingSceneReminder({
    errorType: "追高冲动",
    sceneTag: "放量拉升",
    shownCount: 1,
    maxPerSession: 2
  });

  assert(reminder, "expected scene reminder before max count");
  assert.strictEqual(reminder.triggerType, "training_scene");
  assert.strictEqual(reminder.sceneTag, "放量拉升");

  assert.strictEqual(buildTrainingSceneReminder({
    errorType: "追高冲动",
    sceneTag: "放量拉升",
    shownCount: 2,
    maxPerSession: 2
  }), null);

  assert.strictEqual(buildTrainingSceneReminder({
    errorType: "追高冲动",
    sceneTag: "放量拉升",
    shownCount: 0,
    disabled: true
  }), null);
}

function testReviewRepeatReminder() {
  const now = Date.parse("2026-06-28T08:00:00+08:00");
  const records = [
    {
      id: "r1",
      mainErrorType: "追高冲动",
      firstThought: "怕错过",
      triggerScene: "放量拉升",
      createdAt: now - 2 * 86400000
    },
    {
      id: "r2",
      main_error_type: "追高冲动",
      first_thought: "怕错过",
      trigger_scene: "冲高回落",
      created_at: now - 86400000
    }
  ];

  const reminder = buildReviewRepeatReminder({
    records,
    currentRecord: records[1],
    now,
    threshold: 2
  });

  assert(reminder, "expected review repeat reminder");
  assert.strictEqual(reminder.triggerType, "review_repeat");
  assert.strictEqual(reminder.errorType, "追高冲动");
  assert.strictEqual(reminder.repeatCount, 2);
  assert(reminder.message.includes("旧题复现"));
  assert(reminder.message.includes("近 30 天第 2 次"));
}

function testInterventionEventShape() {
  const createdAt = Date.parse("2026-06-28T08:00:00+08:00");
  const event = createInterventionEvent({
    triggerType: "training_scene",
    errorType: "追高冲动",
    sceneTag: "放量拉升",
    message: "这是你的高频旧题：追高冲动。",
    userResponse: "改为观望",
    createdAt
  });

  assert(event.id);
  assert.strictEqual(event.triggerType, "training_scene");
  assert.strictEqual(event.trigger_type, "training_scene");
  assert.strictEqual(event.errorType, "追高冲动");
  assert.strictEqual(event.error_type, "追高冲动");
  assert.strictEqual(event.sceneTag, "放量拉升");
  assert.strictEqual(event.scene_tag, "放量拉升");
  assert.strictEqual(event.userResponse, "改为观望");
  assert.strictEqual(event.user_response, "改为观望");
  assert.strictEqual(event.createdAt, createdAt);
  assert.strictEqual(event.created_at, createdAt);
}

testTrainingPreReminder();
testTrainingSceneReminderLimit();
testReviewRepeatReminder();
testInterventionEventShape();

console.log("zhixing-reminder tests passed");
