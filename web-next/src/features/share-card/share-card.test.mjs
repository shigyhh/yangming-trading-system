import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("../../app/share-card/page.tsx", import.meta.url)
const apiClientUrl = new URL("../data-binding/api-client.ts", import.meta.url)
const adminPageUrl = new URL("../../app/admin/page.tsx", import.meta.url)
const adminDataUrl = new URL("../admin/admin-data.ts", import.meta.url)
const contentUrl = new URL("../../../../packages/content/share-card.js", import.meta.url)
const contractUrl = new URL("../../../../packages/contracts/data-binding.d.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("share card and invite source MVP use shared API and compliant copy", async () => {
  const page = await readFile(pageUrl, "utf8")
  const apiClient = await readFile(apiClientUrl, "utf8")
  const adminPage = await readFile(adminPageUrl, "utf8")
  const adminData = await readFile(adminDataUrl, "utf8")
  const content = await readFile(contentUrl, "utf8")
  const contract = await readFile(contractUrl, "utf8")
  const source = `${page}\n${apiClient}\n${adminPage}\n${adminData}\n${content}\n${contract}`

  ;[
    "DataBindingShareCard",
    "DataBindingInviteSourceStats",
    "generateShareCardBinding",
    "fetchShareCardBinding",
    "GET|POST /api/v1/data-binding/users/:user_id/share-card",
    "GET /api/v1/admin/invite-sources",
    "邀请码渠道统计",
    "生成照见分享卡",
    "shareCardContent",
    "buildShareCardConclusion",
    "preview-sprint8",
    "分享卡预览",
    "不做收益归因或裂变排行",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})
