import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const guidelineDir = join(root, "design-system", "brand-guideline")
const assetPackDir = join(root, "design-system", "brand-assets", "v1.0")

const chapters = [
  "00-font-ip-provenance.md",
  "01-logo-system.md",
  "02-typography-system.md",
  "03-product-ui-test.md",
  "04-symbol-system.md",
  "05-numeric-system.md",
  "06-compliance-language.md",
]

for (const chapter of chapters) {
  const content = readFileSync(join(guidelineDir, chapter), "utf8")
  assert.ok(content.trim().length > 200, `${chapter} should be a real guideline chapter`)
}

const index = readFileSync(join(guidelineDir, "README.md"), "utf8")
for (const chapter of chapters) {
  assert.ok(index.includes(chapter), `README should link ${chapter}`)
}

const provenance = readFileSync(join(guidelineDir, "00-font-ip-provenance.md"), "utf8")
for (const clause of [
  "禁止描摹商业字体轮廓",
  "禁止把商业字体转曲后修改当作原创",
  "禁止相信“改 20% 就安全”",
  "HarmonyOS Sans",
  "暂列待确认",
  "不得把开源字体显示效果误称为原创字体",
]) {
  assert.ok(provenance.includes(clause), `provenance should include ${clause}`)
}

const brandAssetFiles = [
  "web-next/public/brand/yangming-a1.svg",
  "web-next/public/brand/yangming-c16.svg",
  "web-next/public/brand/yangming-ui-glyphs.svg",
  "web-next/src/app/icon.svg",
  "web-next/src/components/brand/yangming-mark.tsx",
]

for (const file of brandAssetFiles) {
  const content = readFileSync(join(root, file), "utf8")
  assert.equal(/<text\b/i.test(content), false, `${file} must not use font-rendered text`)
  assert.equal(/font-family|@font-face|textPath/i.test(content), false, `${file} must not depend on fonts`)
}

const assetPackReadme = readFileSync(join(assetPackDir, "README.md"), "utf8")
const assetPackManifest = JSON.parse(readFileSync(join(assetPackDir, "manifest.json"), "utf8"))

assert.ok(assetPackReadme.includes("Brand Asset Pack V1.0"), "asset pack README should exist")
assert.equal(assetPackManifest.assets.logoA1.status, "final", "A1 should be final in asset pack")
assert.equal(assetPackManifest.assets.markC16.status, "final", "C16 should be final in asset pack")
assert.deepEqual(assetPackManifest.assets.uiGlyphs.kinds, ["trade", "review", "train", "growth"])
assert.equal(assetPackManifest.fonts.harmonyOS.status, "license-review-required")

console.log("Brand guideline and font provenance guard passed.")
