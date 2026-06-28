import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractUrl = new URL("./kline-sampling.d.ts", import.meta.url);
const packageUrl = new URL("./package.json", import.meta.url);

const requiredTypes = [
  "SamplingRequest",
  "SamplingResult",
  "KlineTrainingSampleResponse",
];

const requiredFields = [
  "userId",
  "user_id",
  "sourceType",
  "source_type",
  "errorType",
  "error_type",
  "sceneTags",
  "scene_tags",
  "trainingPackId",
  "training_pack_id",
  "excludeSegmentIds",
  "exclude_segment_ids",
  "segmentId",
  "segment_id",
  "fallbackUsed",
  "fallback_used",
  "fallbackReason",
  "fallback_reason",
  "startDate",
  "start_date",
  "endDate",
  "end_date",
  "bars",
  "source",
];

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];

test("kline sampling contract exposes request and result aliases", async () => {
  const contract = await readFile(contractUrl, "utf8").catch(() => "");
  const packageJson = JSON.parse(await readFile(packageUrl, "utf8"));

  requiredTypes.forEach((typeName) => {
    assert.match(contract, new RegExp(`export type ${typeName}\\b`), `missing exported type: ${typeName}`);
  });

  requiredFields.forEach((fieldName) => {
    assert.ok(contract.includes(fieldName), `missing field: ${fieldName}`);
  });

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(contract.includes(phrase), false, `contains forbidden phrase: ${phrase}`);
  });

  assert.ok(packageJson.exports["./kline-sampling"], "kline-sampling contract export is missing");
});
