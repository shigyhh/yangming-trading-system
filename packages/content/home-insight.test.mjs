import assert from "node:assert/strict";
import test from "node:test";

import { getHomeDailyInsightCard, homeDailyInsightCards } from "./home-insight.js";

const forbidden = /(荐股|喊单|预测行情|买入|卖出|收益|必赚|稳赚|带单)/;

test("home daily insight cards rotate by Beijing date without investment advice", () => {
  assert.ok(homeDailyInsightCards.length >= 7);

  const first = getHomeDailyInsightCard(new Date("2026-06-03T01:00:00+08:00"));
  const sameDay = getHomeDailyInsightCard(new Date("2026-06-03T22:30:00+08:00"));
  const nextDay = getHomeDailyInsightCard(new Date("2026-06-04T01:00:00+08:00"));

  assert.equal(first.key, sameDay.key);
  assert.notEqual(first.key, nextDay.key);

  homeDailyInsightCards.forEach((card) => {
    const source = Object.values(card).join("");
    assert.ok(card.heartProof);
    assert.ok(card.reflectionText);
    assert.ok(card.stageValue);
    assert.ok(card.actionValue);
    assert.equal(forbidden.test(source), false, `contains forbidden phrase: ${card.key}`);
  });
});
