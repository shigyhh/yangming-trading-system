import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const livingMirrorSource = fs.readFileSync(new URL("./living-mirror.d.ts", import.meta.url), "utf8");
const dataBindingSource = fs.readFileSync(new URL("./data-binding.d.ts", import.meta.url), "utf8");

test("living mirror contract declares ArchiveIndex and ArchiveItem", () => {
  [
    "ArchiveItemType",
    "ArchiveItem",
    "ArchiveIndex",
    "archive_item",
    "archive_index",
    "sourceId",
    "source_id",
    "sourceType",
    "source_type",
    "firstThought",
    "first_thought",
    "executionResult",
    "execution_result",
    "segmentId",
    "segment_id",
    "trainingPackId",
    "training_pack_id",
    "latestItems",
    "latest_items",
    "byType",
    "by_type"
  ].forEach((token) => {
    assert.ok(livingMirrorSource.includes(token), `missing ${token}`);
  });
});

test("data-binding summary exposes mirror archive index aliases", () => {
  [
    "ArchiveIndex",
    "archive_index",
    "archiveIndex",
    "mirror_archive?: MirrorArchive"
  ].forEach((token) => {
    assert.ok(dataBindingSource.includes(token), `missing ${token}`);
  });
});
