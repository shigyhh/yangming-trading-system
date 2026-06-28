import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractUrl = new URL("./kline-segment.d.ts", import.meta.url);
const packageUrl = new URL("./package.json", import.meta.url);

const requiredTypes = [
  "KlineSegment",
  "CreateKlineSegmentInput",
  "UpdateKlineSegmentInput",
  "KlineSegmentResponse",
  "KlineSegmentListResponse",
];

const requiredFields = [
  "startDate",
  "start_date",
  "endDate",
  "end_date",
  "sceneTags",
  "scene_tags",
  "errorTypes",
  "error_types",
  "trainingPackIds",
  "training_pack_ids",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
];

const requiredSceneTags = [
  "放量拉升",
  "假突破",
  "冲高回落",
  "破位下跌",
  "弱反弹",
  "连续阴跌",
  "下跌中继",
  "反抽诱多",
  "洗盘后走强",
  "趋势中继",
  "横盘噪音",
  "突然异动",
  "普涨行情",
  "快速反弹",
];

const requiredErrorTypes = [
  "追高冲动",
  "扛单被套",
  "卖飞懊悔",
  "补仓冲动",
  "计划外交易",
  "盈利拿不住",
  "空仓焦虑",
  "急于翻本",
];

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];

test("kline segment contract exposes public CRUD payloads with camel and snake aliases", async () => {
  const contract = await readFile(contractUrl, "utf8");
  const packageJson = JSON.parse(await readFile(packageUrl, "utf8"));

  requiredTypes.forEach((typeName) => {
    assert.match(contract, new RegExp(`export type ${typeName}\\b`), `missing exported type: ${typeName}`);
  });

  requiredFields.forEach((fieldName) => {
    assert.ok(contract.includes(fieldName), `missing field: ${fieldName}`);
  });

  requiredSceneTags.forEach((tag) => {
    assert.ok(contract.includes(tag), `missing scene tag: ${tag}`);
  });

  requiredErrorTypes.forEach((type) => {
    assert.ok(contract.includes(type), `missing error type: ${type}`);
  });

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(contract.includes(phrase), false, `contains forbidden phrase: ${phrase}`);
  });

  assert.ok(packageJson.exports["./kline-segment"], "kline-segment contract export is missing");
});
