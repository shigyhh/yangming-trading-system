import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("../../app/language/page.tsx", import.meta.url)
const apiClientUrl = new URL("./api-client.ts", import.meta.url)
const contentUrl = new URL("../../../../packages/content/i18n.js", import.meta.url)
const contractUrl = new URL("../../../../packages/contracts/i18n.d.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("i18n web foundation uses shared API and keeps copy inside compliance bounds", async () => {
  const page = await readFile(pageUrl, "utf8")
  const apiClient = await readFile(apiClientUrl, "utf8")
  const content = await readFile(contentUrl, "utf8")
  const contract = await readFile(contractUrl, "utf8")
  const source = `${page}\n${apiClient}\n${content}\n${contract}`

  ;[
    "SupportedLocaleCode",
    "I18nBundleResponse",
    "fetchI18nBundle",
    "fetchI18nLocales",
    "/api/v1/i18n/bundle",
    "/api/v1/i18n/locales",
    "zh-CN",
    "zh-TW",
    "en",
    "ja",
    "ko",
    "es",
    "核心世界观先人工翻译",
    "功能文案可后续补",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})
