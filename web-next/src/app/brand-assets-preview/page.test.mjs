import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./page.tsx", import.meta.url)

test("brand assets preview board renders the full controlled asset system", async () => {
  const page = await readFile(pageUrl, "utf8")

  ;[
    "阳明品牌资产预览页",
    "BRAND ASSET PREVIEW",
    "YangmingZhaoSeal",
    "YangmingCharacterMark",
    "YangmingA1Mark",
    "YangmingC16Mark",
    "YangmingGlyph",
    "@yangming/content/brand-character-system",
    "@yangming/content/brand",
    "主照印必须最强",
    "照骨字系",
    "MOTION GRAMMAR",
    "brandMotionSystem",
    "motionSamples",
    "motion-card",
    "功能母题只服务路径",
    "放进真实物料里看",
    "满分靠边界，不靠堆满",
    "心镜报告",
    "分享卡",
    "9:16 短视频素材",
    "本系统仅用于交易认知、行为训练与风险教育；不荐股、不喊单、不承诺收益。",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `missing preview token: ${token}`)
  })

  ;["心", "知", "行", "止", "证", "复", "练", "界"].forEach((character) => {
    assert.equal(page.includes(character), true, `missing supporting character: ${character}`)
  })

  ;["推荐买入", "推荐卖出", "必赚", "收益保证", "抄底", "逃顶", "带单"].forEach((phrase) => {
    assert.equal(page.includes(phrase), false, `preview page contains forbidden phrase: ${phrase}`)
  })
})
