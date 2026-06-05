import assert from "node:assert/strict";
import test from "node:test";

import {
  brandCharacterSequence,
  brandCharacterSystem,
  brandCharacterTiers,
  brandMotionSystem,
  getBrandMotionByCharacter
} from "./brand-character-system.js";

test("brand character system keeps one main Zhao and eight supporting characters", () => {
  assert.equal(brandCharacterSystem.mainCharacter.character, "照");
  assert.equal(brandCharacterSystem.mainCharacter.tier, "main");

  assert.deepEqual(
    brandCharacterSystem.supportingCharacters.map((item) => item.character),
    ["心", "知", "行", "止", "证", "复", "练", "界"]
  );

  assert.deepEqual(
    brandCharacterSystem.supportingCharacters.map((item) => item.tier),
    ["anchor", "anchor", "anchor", "method", "method", "method", "method", "boundary"]
  );

  assert.equal(brandCharacterTiers.anchor.label, "心学锚字");
  assert.equal(brandCharacterTiers.method.label, "产品法字");
  assert.equal(brandCharacterTiers.boundary.label, "边界字");
  assert.equal(brandCharacterSequence.at(0), "先照，才有知。");
  assert.equal(brandCharacterSequence.at(-1), "有界，才可信。");
});

test("brand motion system maps one restrained motion to each zhao-bone character", () => {
  assert.equal(brandMotionSystem.mainMotion.character, "照");
  assert.equal(brandMotionSystem.mainMotion.motion, "盖印");

  assert.deepEqual(
    brandMotionSystem.supportingMotions.map((item) => `${item.character}:${item.motion}`),
    ["心:微聚", "知:显明", "行:落位", "止:停顿", "证:落章", "复:回环", "练:沉淀", "界:收束"]
  );

  assert.equal(getBrandMotionByCharacter("照").className, "motion-zhao-stamp");
  assert.equal(getBrandMotionByCharacter("心").className, "motion-xin-gather");
  assert.equal(getBrandMotionByCharacter("界").className, "motion-jie-contain");
  assert.equal(getBrandMotionByCharacter("财"), null);
});

test("brand character copy avoids investment and internal logo language", () => {
  const source = JSON.stringify({
    brandCharacterSequence,
    brandCharacterSystem,
    brandCharacterTiers,
    brandMotionSystem
  });
  const forbidden = /(荐股|喊单|推荐买入|推荐卖出|必赚|收益保证|Logo|第二个 Logo)/;

  assert.equal(forbidden.test(source), false);
  assert.ok(source.includes("照为主印"));
  assert.ok(source.includes("其余八字只作锚点"));
});
