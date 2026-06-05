import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./page.tsx", import.meta.url)

test("risk education page keeps compliance content without brand character-system labels", async () => {
  const page = await readFile(pageUrl, "utf8")

  ;[
    "先立边界",
    "不预测行情",
    "不提供买卖建议",
    "不承诺收益",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `risk education page missing ${token}`)
  })

  ;["YangmingCharacterMark", "界字，风险教育，守住边界", "风险教育 / 合规边界"].forEach((token) => {
    assert.equal(page.includes(token), false, `risk education page should not show brand character-system label ${token}`)
  })

  ;["推荐买入", "推荐卖出", "必赚", "稳赚", "抄底", "逃顶", "喊单"].forEach((phrase) => {
    assert.equal(page.includes(phrase), false, `risk education page contains forbidden phrase ${phrase}`)
  })
})
