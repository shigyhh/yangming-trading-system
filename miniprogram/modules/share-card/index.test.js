const assert = require("assert");
const {
  SHARE_CARD_TYPES,
  buildShareCardPreview,
  buildShareCardList,
  normalizeType
} = require("./index");

assert.strictEqual(SHARE_CARD_TYPES.length, 17);
assert.strictEqual(normalizeType("unknown"), "daily_mantra");

const dailyCard = buildShareCardPreview("daily_mantra", {
  dailyContent: { heartProof: "真正的事上练，是边界到了能知行合一。" }
});
assert.strictEqual(dailyCard.type, "daily_mantra");
assert.ok(dailyCard.headline.includes("知行合一"));
assert.ok(dailyCard.compliance.includes("不提供投资建议"));

const zhixingCard = buildShareCardPreview("zhixing_score", {
  zhixingIndex: {
    total: 72,
    dimensions: [
      { key: "awareness", score: 80 },
      { key: "boundary", score: 68 },
      { key: "delay", score: 72 },
      { key: "personalityCalibration", score: 74 }
    ]
  }
});
assert.strictEqual(zhixingCard.metrics.length, 7);
assert.ok(zhixingCard.body.includes("不是交易分数"));

const cards = buildShareCardList({});
assert.strictEqual(cards.length, SHARE_CARD_TYPES.length);
assert.ok(cards.some((item) => item.type === "boundary_guard"));
assert.ok(cards.some((item) => item.type === "personality_mirror"));
assert.ok(cards.some((item) => item.type === "group_practice"));
assert.ok(cards.some((item) => item.type === "membership_identity"));
assert.ok(cards.some((item) => item.type === "kline_insight"));
assert.ok(cards.some((item) => item.type === "group_kline_mirror"));
assert.ok(cards.some((item) => item.type === "mirror_challenge"));
assert.ok(cards.some((item) => item.type === "impulse_delay"));

const inviteCard = buildShareCardPreview("companion_invite", {
  inviteCode: "ZX567877",
  livingMirrorStats: { currentMirror: "追涨之镜" },
  training7View: { today: { title: "观入场冲动" } },
  assistantHandoff: { statusText: "可承接", sharePrompt: "我照见了自己的第一念，邀一位同修同行。" }
});
assert.ok(inviteCard.insight.includes("第一念"));
assert.ok(inviteCard.metrics.some((item) => item.label === "承接状态" && item.value === "可承接"));
assert.ok(!inviteCard.metrics.some((item) => item.value.includes("占位")));

console.log("share-card module tests passed");
