const assert = require("node:assert")
const { readdirSync, readFileSync, statSync } = require("node:fs")
const { join, relative } = require("node:path")

const root = process.cwd()
const miniprogramRoot = join(root, "miniprogram")
const activeExtensions = new Set([".js", ".wxml", ".wxss", ".wxs"])
const allowedActiveFiles = new Set([
  "miniprogram/assets/fonts/README.md",
  "miniprogram/font-risk.test.js",
])

function extensionOf(file) {
  const dot = file.lastIndexOf(".")
  return dot === -1 ? "" : file.slice(dot)
}

function collectFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) return collectFiles(path)
    return [path]
  })
}

const activeFiles = collectFiles(miniprogramRoot).filter((file) => activeExtensions.has(extensionOf(file)))

for (const file of activeFiles) {
  const relativePath = relative(root, file)
  if (allowedActiveFiles.has(relativePath)) continue

  const content = readFileSync(file, "utf8")
  assert.equal(/ZX-Harmony|HarmonyOS Sans/i.test(content), false, `${relativePath} should not actively reference HarmonyOS fonts`)
  assert.equal(/assets\/fonts\/[^"')]+\.woff2/i.test(content), false, `${relativePath} should not load local woff2 font resources`)
  assert.equal(/@font-face/i.test(content), false, `${relativePath} should not declare local font-face resources`)
  assert.equal(/wx\.loadFontFace|function\s+loadFontFace/.test(content), false, `${relativePath} should not call wx.loadFontFace for local fonts`)
}

const appJs = readFileSync(join(miniprogramRoot, "app.js"), "utf8")
const appWxss = readFileSync(join(miniprogramRoot, "app.wxss"), "utf8")

assert.equal(appJs.includes("HarmonyOS-SansSC"), false, "app.js must not load HarmonyOS font subsets")
assert.equal(appJs.includes("LXGWWenKai-Zhixing.woff2"), false, "app.js must not load local LXGW font subsets")
assert.equal(appWxss.includes('font-family: "ZX-Harmony"'), false, "app.wxss must not declare ZX-Harmony font-face")
assert.equal(appWxss.includes("@font-face"), false, "app.wxss must not declare local font-face resources")
assert.equal(appWxss.includes("LXGWWenKai-Zhixing.woff2"), false, "app.wxss must not reference local LXGW font subsets")

console.log("Mini program font risk guard passed.")
