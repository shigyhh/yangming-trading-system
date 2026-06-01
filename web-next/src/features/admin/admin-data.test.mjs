import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const mockDataUrl = new URL("./admin-mock-data.json", import.meta.url)
const adminDataUrl = new URL("./admin-data.ts", import.meta.url)
const adminPageUrl = new URL("../../app/admin/page.tsx", import.meta.url)
const requiredListFields = [
  "phone",
  "assessmentTime",
  "primaryType",
  "secondaryType",
  "riskLabel",
  "campSuggestion",
  "trainingStatus",
  "inviteSource",
]
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("admin mock users expose required MVP list and detail fields", async () => {
  const users = JSON.parse(await readFile(mockDataUrl, "utf8"))
  const allowedStatuses = new Set(["待承接", "已承接", "待复盘", "已完成"])

  assert.ok(Array.isArray(users))
  assert.ok(users.length >= 3)
  assert.ok(users.some((user) => user.assistant.status === "待复盘"))

  users.forEach((user) => {
    requiredListFields.forEach((field) => {
      assert.equal(typeof user[field], "string", `${user.id} missing ${field}`)
      assert.ok(user[field].length > 0, `${user.id} has empty ${field}`)
    })

    assert.match(user.phone, /^\d{3}\*{4}\d{4}$/)
    const searchableText = JSON.stringify(user)
    forbiddenPhrases.forEach((phrase) => {
      assert.equal(searchableText.includes(phrase), false, `${user.id} contains forbidden phrase ${phrase}`)
    })
    assert.ok(Array.isArray(user.trainingRecords))
    assert.ok(Array.isArray(user.klineRecords))
    assert.ok(Array.isArray(user.retestComparisons))
    assert.equal(typeof user.retestChange.changeNote, "string")
    assert.ok(allowedStatuses.has(user.assistant.status))
  })
})

test("admin page exposes filters, sorting and follow-up queue helpers", async () => {
  const adminData = await readFile(adminDataUrl, "utf8")
  const adminPage = await readFile(adminPageUrl, "utf8")
  const source = `${adminData}\n${adminPage}`

  ;[
    "normalizeAdminFilters",
    "filterAdminUsers",
    "getAdminFilterOptions",
    "getAdminFollowUp",
    "assistant_status",
    "training_status",
    "risk_label",
    "invite_source",
    "assistant_priority",
    "待复盘",
    "已完成",
    "跟进建议",
    "klineRecords",
    "retestComparisons",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })
})
