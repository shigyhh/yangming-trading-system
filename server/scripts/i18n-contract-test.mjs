import assert from "node:assert/strict";
import test from "node:test";

import { getI18nBundle, listSupportedLocales } from "../src/services/i18n.js";

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"];

test("i18n service exposes supported locales and stable worldview bundles", () => {
  const locales = listSupportedLocales();
  const localeCodes = locales.map((locale) => locale.code);

  assert.deepEqual(localeCodes, ["zh-CN", "en", "zh-TW", "ja", "ko", "es"]);

  const zh = getI18nBundle({ locale: "zh-CN" });
  const en = getI18nBundle({ locale: "en-US" });
  const acceptLanguage = getI18nBundle({ acceptLanguage: "ja,en;q=0.8" });
  const fallback = getI18nBundle({ locale: "fr-FR" });

  assert.equal(zh.locale, "zh-CN");
  assert.equal(zh.bundle.common.productName, "阳明心学交易系统");
  assert.equal(en.locale, "en");
  assert.equal(en.bundle.coreWorldview.glossary.awareness, "Awareness");
  assert.equal(acceptLanguage.locale, "ja");
  assert.equal(fallback.locale, "zh-CN");

  for (const result of [zh, en, acceptLanguage, fallback]) {
    assert.ok(result.bundle.coreWorldview.translationPolicy.length > 0);
    assert.ok(result.bundle.coreWorldview.compliance.length > 0);
    assert.equal(result.supportedLocales.length, 6);
  }

  const searchableText = JSON.stringify({ locales, zh, en, acceptLanguage, fallback });
  forbiddenPhrases.forEach((phrase) => {
    assert.equal(searchableText.includes(phrase), false, `contains forbidden phrase: ${phrase}`);
  });
});
