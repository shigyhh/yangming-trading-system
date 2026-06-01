const assert = require("assert");
const { CLASSROOM_CONTENT, buildClassroomView, buildLessonView, getLessonById } = require("./index");

assert.strictEqual(CLASSROOM_CONTENT.length, 3);
assert.deepStrictEqual(CLASSROOM_CONTENT.map((item) => item.type), ["video", "live", "replay"]);

const view = buildClassroomView();
assert.strictEqual(view.title, "知行讲堂");
assert.strictEqual(view.items[0].typeLabel, "视频");
assert.strictEqual(view.items[1].typeLabel, "直播");
assert.ok(view.compliance.includes("交易心理训练"));

const live = getLessonById("camp-live");
assert.strictEqual(live.type, "live");

const lesson = buildLessonView("camp-live", { "camp-live": { reserved: true } });
assert.strictEqual(lesson.reserved, true);
assert.strictEqual(lesson.reservationText, "已预约");

const replay = buildLessonView("replay-boundary", {}, { "replay-boundary": { watched: true } });
assert.strictEqual(replay.watched, true);
assert.strictEqual(replay.reservationText, "已看完");

console.log("classroom module tests passed");
