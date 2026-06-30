import assert from "node:assert/strict";
import test from "node:test";

import { brandMantras, brandTypographyPrinciples } from "./brand.js";

test("brand mantras stay in reflection and training territory", () => {
  assert.deepEqual(
    brandMantras.map((item) => item.text),
    ["以交易照人心", "以复盘照行为", "以训练照变化", "以活镜照成长"]
  );

  const forbidden = /(荐股|喊单|预测|买入|卖出|收益|必赚)/;
  assert.ok(!forbidden.test(brandMantras.map((item) => item.text).join("")));
  assert.equal(brandTypographyPrinciples.displayName, "Yangming Display");
});
