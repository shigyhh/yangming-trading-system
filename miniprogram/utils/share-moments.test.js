const assert = require("assert");
const { SHARE_MOMENTS, buildShareCardUrl } = require("./share-moments");

const keys = Object.keys(SHARE_MOMENTS);

assert.strictEqual(keys.length, 12);
assert.strictEqual(SHARE_MOMENTS.personality_mirror, undefined);
assert.strictEqual(SHARE_MOMENTS.opening_check_completed.cardType, "boundary_guard");
assert.strictEqual(SHARE_MOMENTS.retest_change_ready.cardType, "retest_change");
assert.ok(keys.includes("profile_album"));

const url = buildShareCardUrl("live_reservation", {
  lessonId: "tonight",
  sourceScene: "lesson_reserved"
});

assert.ok(url.includes("type=live_reservation"));
assert.ok(url.includes("lessonId=tonight"));
assert.ok(url.includes("sourceScene=lesson_reserved"));

console.log("share-moments utils tests passed");
