const assert = require("node:assert")
const { existsSync, readFileSync } = require("node:fs")
const { join } = require("node:path")

const root = process.cwd()

const logoPath = join(root, "miniprogram", "assets", "brand", "ymty-zhao-logo.svg")
const appWxss = readFileSync(join(root, "miniprogram", "app.wxss"), "utf8")
const homeWxml = readFileSync(join(root, "miniprogram", "pages", "home", "index.wxml"), "utf8")

const forbiddenVisibleTradingCopy = [
  "建议买入",
  "建议卖出",
  "现在可以买",
  "现在该卖",
  "目标价",
  "止损建议",
  "明日看涨",
  "明日看跌",
  "预测涨跌",
  "买入信号",
  "卖出信号",
  "收益提升",
  "胜率提升"
]

assert.ok(existsSync(logoPath), "zhao logo asset should exist")

const logoSvg = readFileSync(logoPath, "utf8")
assert.ok(logoSvg.includes("<svg"), "zhao logo asset should be SVG")
assert.ok(logoSvg.includes('fill="none"'), "zhao logo should be restrained line art")

assert.ok(appWxss.includes(".brand-seal-frame"), "global brand seal frame class should exist")
assert.ok(appWxss.includes(".brand-seal-art"), "global brand seal art class should exist")

assert.ok(
  homeWxml.includes('src="/assets/brand/ymty-zhao-logo.svg"') ||
    (homeWxml.includes("brand-seal-frame") && homeWxml.includes("brand-seal-art")),
  "home page should render the restored zhao logo asset"
)
assert.ok(homeWxml.includes("single-focus"), "home page should include the single-focus first-screen state")
assert.ok(homeWxml.includes("K线观心"), "home page should keep a lightweight K-line mind entry")
assert.ok(homeWxml.includes("阳明心学交易系统"), "home page should keep the old visual baseline brand title")
assert.ok(homeWxml.includes("每日一页 · 照见本心"), "home page should keep the old visual baseline brand subtitle")

for (const word of forbiddenVisibleTradingCopy) {
  assert.equal(homeWxml.includes(word), false, `home page should not include user-visible trading signal copy: ${word}`)
}

console.log("Mini program brand asset guard passed.")
