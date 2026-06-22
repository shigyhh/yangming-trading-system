import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const contractUrl = new URL("./event-projections.d.ts", import.meta.url);

test("event projection contract exposes minimal safe server projections", async () => {
  const source = await readFile(contractUrl, "utf8");

  for (const typeName of [
    "LivingMirrorProfile",
    "RiskPatternSummary",
    "TodayState",
    "LivingMirrorGrowthProjection"
  ]) {
    assert.match(source, new RegExp(`export type ${typeName}\\b`));
  }

  for (const field of [
    "userId",
    "totalEvents",
    "dominantReaction",
    "repeatedThoughts",
    "latestBoundaryState",
    "latestMirrorType",
    "topRiskPatterns",
    "repeatedReactionChoice",
    "recentServerSourceQuality",
    "status",
    "nextAction",
    "progress",
    "schemaVersion",
    "growthProfileId",
    "highFrequencyThoughts",
    "repeatedBehaviors",
    "affectedDimensions",
    "trainingContinuity",
    "mirrorLifeStage",
    "nextCycleFocus",
    "dataGaps",
    "topBehaviorLoops",
    "zhixingStability",
    "sourceSummary",
    "complianceNotice",
    "updatedAt"
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }

  for (const forbidden of ["phone", "openId", "unionId", "token", "code"]) {
    assert.doesNotMatch(source, new RegExp(`\\b${forbidden}\\b`, "i"));
  }

  for (const forbiddenPhrase of [
    "推荐买入",
    "推荐卖出",
    "必赚",
    "稳赚",
    "收益保证",
    "喊单",
    "抄底",
    "逃顶"
  ]) {
    assert.equal(source.includes(forbiddenPhrase), false, `${forbiddenPhrase} must not appear in contract`);
  }
});
