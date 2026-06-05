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
  "07-brand-usage-boundary.md",
  "08-zhao-character-system.md",
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

const usageBoundary = readFileSync(join(guidelineDir, "07-brand-usage-boundary.md"), "utf8")
for (const clause of [
  "一个首屏只允许一个品牌锁定",
  "导航已经出现 A1 + 产品名时，首屏正文区域不再重复 A1",
  "小程序头像、首页小标、报告页小标使用 CSS 几何 C16",
  "品牌标必须有替换文字",
  "不把任何符号用于暗示买入、卖出、预测、收益或胜率",
]) {
  assert.ok(usageBoundary.includes(clause), `usage boundary should include ${clause}`)
}

const zhaoCharacterSystem = readFileSync(join(guidelineDir, "08-zhao-character-system.md"), "utf8")
for (const clause of [
  "主形象艺术字只用一个：照",
  "心、知、行",
  "止、证、复、练",
  "边界字",
  "不得使用平台字体",
  "yangming-character-mark.tsx",
  "packages/content/brand-character-system.js",
  "先照，才有知",
]) {
  assert.ok(zhaoCharacterSystem.includes(clause), `zhao character system should include ${clause}`)
}

const logoSystem = readFileSync(join(guidelineDir, "01-logo-system.md"), "utf8")
for (const clause of [
  "使用 `<span>照</span>` 或平台默认字体临时替代品牌印记",
  "品牌印记是矢量资产或几何资产，不是字体字",
  "Web 大尺寸印记优先使用 A1 SVG",
  "小程序和 App 小尺寸印记优先使用 C16 几何 / 矢量版本",
]) {
  assert.ok(logoSystem.includes(clause), `logo system should include ${clause}`)
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

const zhaoSealComponent = readFileSync(join(root, "web-next/src/components/brand/yangming-zhao-seal.tsx"), "utf8")
assert.ok(zhaoSealComponent.includes("YangmingA1Mark"), "Zhao seal component should render A1 vector mark")
assert.equal(zhaoSealComponent.includes("<strong>照</strong>"), false, "Zhao seal must not render font zhao")
assert.equal(zhaoSealComponent.includes(">照<"), false, "Zhao seal must not render bare font zhao")

const characterMarkComponent = readFileSync(join(root, "web-next/src/components/brand/yangming-character-mark.tsx"), "utf8")
assert.ok(characterMarkComponent.includes("YangmingCharacterMark"), "supporting character mark component should exist")
assert.equal(characterMarkComponent.includes("YangmingA1Mark"), false, "supporting characters should not reuse A1 logo")
assert.equal(characterMarkComponent.includes("YangmingZhaoSeal"), false, "supporting characters should not reuse the main Zhao seal")

const assetPackReadme = readFileSync(join(assetPackDir, "README.md"), "utf8")
const assetPackManifest = JSON.parse(readFileSync(join(assetPackDir, "manifest.json"), "utf8"))

assert.ok(assetPackReadme.includes("Brand Asset Pack V1.0"), "asset pack README should exist")
assert.equal(assetPackManifest.assets.logoA1.status, "final", "A1 should be final in asset pack")
assert.equal(assetPackManifest.assets.zhaoSeal.status, "final", "Zhao seal should be final in asset pack")
assert.equal(assetPackManifest.assets.characterMarks.status, "supporting", "supporting character marks should be scoped below logo status")
assert.deepEqual(assetPackManifest.assets.characterMarks.characters, ["心", "知", "行", "止", "证", "复", "练", "界"])
assert.equal(assetPackManifest.assets.markC16.status, "final", "C16 should be final in asset pack")
assert.deepEqual(assetPackManifest.assets.uiGlyphs.kinds, ["trade", "review", "train", "growth"])
assert.equal(assetPackManifest.fonts.harmonyOS.status, "license-review-required")

console.log("Brand guideline and font provenance guard passed.")
