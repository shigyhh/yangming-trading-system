import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./page.tsx", import.meta.url)

test("assessment login keeps refined ritual entry layout", async () => {
  const page = await readFile(pageUrl, "utf8")

  assert.ok(page.includes("<span>让此心一照，</span>"), "title first line should be manually controlled")
  assert.ok(page.includes("<span>日后仍可回看。</span>"), "title second line should keep 回看 together")
  assert.ok(page.includes("<StatusPill>心证归档</StatusPill>"), "eyebrow should feel like a system archive entry")
  assert.ok(page.includes("word-break: keep-all"), "title should avoid awkward Chinese word breaking")
  assert.ok(page.includes("line-break: strict"), "title should use strict Chinese line breaking")
  assert.ok(page.includes("white-space: nowrap"), "title line spans should keep phrases intact")
  assert.ok(page.includes("login-passport-key"), "phone number should be visually emphasized as the pass")
  assert.ok(page.includes("就是你的照心通行证。网站、小程序、心证档案、训练记录与复测变化，都会归于同一账户。"))
  assert.ok(page.includes("填写手机号，归档心证"))
  assert.ok(page.includes("验证码已送达，填入后归档这份心证。"))
  assert.ok(page.includes("归档中..."))
  assert.ok(page.includes("markSkipEntryOpeningRitualOnce"), "login should not replay the opening seal after phone archive")
  assert.equal(page.includes("安放心证"), false, "login page should not keep the softer old archive label")
  assert.ok(page.includes("login-compliance"), "login page should use a light footer compliance note")
  assert.equal(page.includes("ComplianceNote"), false, "login page should not use the framed compliance component")
  assert.equal(page.includes("max-w-[8.8em]"), false, "title should not rely on the narrow old width")
})
