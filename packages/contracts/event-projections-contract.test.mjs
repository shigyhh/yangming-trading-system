import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const contractUrl = new URL("./event-projections.d.ts", import.meta.url);

test("event projection contract exposes minimal safe server projections", async () => {
  const source = await readFile(contractUrl, "utf8");

  for (const typeName of [
    "LivingMirrorProfile",
    "RiskPatternSummary",
    "TodayState"
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
    "updatedAt"
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }

  for (const forbidden of ["phone", "openId", "unionId", "token", "code"]) {
    assert.doesNotMatch(source, new RegExp(`\\b${forbidden}\\b`, "i"));
  }
});
