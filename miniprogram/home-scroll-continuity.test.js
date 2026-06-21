const assert = require("node:assert")
const { readFileSync } = require("node:fs")
const { join } = require("node:path")

const root = process.cwd()
const homeWxml = readFileSync(join(root, "miniprogram", "pages", "home", "index.wxml"), "utf8")
const homeWxss = readFileSync(join(root, "miniprogram", "pages", "home", "index.wxss"), "utf8")

assert.ok(homeWxml.includes('class="home-continuity-panel"'), "home should render a below-fold continuity panel")
assert.ok(homeWxml.includes("closureEvidenceChain.steps"), "continuity panel should use the shared closure evidence chain")
assert.ok(homeWxml.includes("closureEvidenceChain.progressPercent"), "continuity panel should expose real progress")
assert.ok(homeWxml.includes("closureEvidenceChain.nextActionText"), "continuity panel should carry the next action")
assert.ok(homeWxss.includes(".home-continuity-panel"), "continuity panel should be styled")
assert.equal(homeWxss.includes("calc(160rpx + env(safe-area-inset-bottom))"), false, "home hero should not keep the old oversized bottom padding")
assert.equal(homeWxss.includes("calc(148rpx + env(safe-area-inset-bottom))"), false, "mobile hero should not keep the old oversized bottom padding")
assert.equal(homeWxss.includes("calc(140rpx + env(safe-area-inset-bottom))"), false, "narrow mobile hero should not keep the old oversized bottom padding")

console.log("Mini program home scroll continuity guard passed.")
