import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contractSource = fs.readFileSync(new URL("./data-binding.d.ts", import.meta.url), "utf8");

test("data-binding contract declares TrainingBookmark aliases and responses", () => {
  [
    "DataBindingTrainingBookmark",
    "DataBindingTrainingBookmarkPayload",
    "DataBindingTrainingBookmarkResponse",
    "DataBindingTrainingBookmarkListResponse",
    "training_bookmarks",
    "trainingBookmarks",
    "bookmarkType",
    "bookmark_type",
    "sessionId",
    "session_id",
    "actionId",
    "action_id",
    "barIndex",
    "bar_index",
    "sourceType",
    "source_type",
    "segmentId",
    "segment_id",
    "trainingPackId",
    "training_pack_id",
    "samplingResult",
    "sampling_result",
    "executionResult",
    "execution_result"
  ].forEach((token) => {
    assert.ok(contractSource.includes(token), `missing ${token}`);
  });
});

test("DataBindingKLineSamplingResult contract remains metadata-only", () => {
  const samplingStart = contractSource.indexOf("export type DataBindingKLineSamplingResult");
  const samplingEnd = contractSource.indexOf("export type DataBindingKLineRecord", samplingStart);
  const samplingBlock = contractSource.slice(samplingStart, samplingEnd);

  assert.equal(samplingBlock.includes("bars"), false);
  assert.equal(samplingBlock.includes("candles"), false);
});
