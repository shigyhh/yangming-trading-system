import assert from "node:assert/strict";
import test from "node:test";

import {
  getGlobalReflectionToday,
  listGlobalReflectionChoices,
  resetGlobalReflectionForTests,
  submitGlobalReflectionVote
} from "../src/services/globalReflection.js";

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];

test("global reflection stores anonymous daily votes and builds mirror summary", async () => {
  await resetGlobalReflectionForTests();
  const choices = listGlobalReflectionChoices();

  assert.ok(choices.length >= 5);

  const first = await submitGlobalReflectionVote({
    anonymousId: "local-user-001",
    thoughtKey: "fear_missing_out",
    primaryType: "冲动型",
    sourceChannel: "web-next",
    dateKey: "2026-06-01"
  });
  const updated = await submitGlobalReflectionVote({
    anonymousId: "local-user-001",
    thoughtKey: "wait_a_bit_more",
    primaryType: "冲动型",
    sourceChannel: "web-next",
    dateKey: "2026-06-01"
  });
  await submitGlobalReflectionVote({
    anonymousId: "local-user-002",
    thoughtKey: "wait_a_bit_more",
    primaryType: "扛单型",
    sourceChannel: "web-next",
    dateKey: "2026-06-01"
  });

  const summary = await getGlobalReflectionToday({ dateKey: "2026-06-01" });
  const searchableText = JSON.stringify({ first, updated, summary });

  assert.equal(first.summary.totalVotes, 1);
  assert.equal(updated.summary.totalVotes, 1);
  assert.equal(summary.totalVotes, 2);
  assert.equal(summary.leadingThought?.key, "wait_a_bit_more");
  assert.equal(summary.scroll.length, 2);
  assert.ok(summary.mirrors.some((mirror) => mirror.primaryType === "冲动型"));
  assert.equal(searchableText.includes("local-user-001"), false);
  assert.equal(searchableText.includes("local-user-002"), false);

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(searchableText.includes(phrase), false, `contains forbidden phrase: ${phrase}`);
  });

  await resetGlobalReflectionForTests();
});
