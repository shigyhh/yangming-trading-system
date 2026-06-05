import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("./page.tsx", import.meta.url)

test("zhao seal video material keeps a restrained 9:16 stamped sequence", async () => {
  const page = await readFile(pageUrl, "utf8")

  ;[
    "照字印章短视频素材",
    "aspect-ratio: 9 / 16",
    "YangmingC16Mark",
    "YangmingZhaoSeal",
    "阳明照见短视频小标",
    "阳明照见艺术字水印",
    "阳明照见盖印艺术字",
    "完成一念，盖一枚照。",
    "已照见",
    "已存档",
    "待事上练",
    "center-art-zhao",
    "pressing-art-seal",
    "seal-press-down",
    "stamp-press-down",
    "STAMP OF AWARENESS",
    "本系统仅用于交易认知、行为训练与风险教育；不荐股、不喊单、不承诺收益。",
  ].forEach((token) => {
    assert.equal(page.includes(token), true, `missing video material token: ${token}`)
  })

  ;["推荐买入", "推荐卖出", "预测行情", "收益保证", "带单"].forEach((phrase) => {
    assert.equal(page.includes(phrase), false, `video material contains forbidden phrase: ${phrase}`)
  })

  assert.equal(page.includes('<div className="center-zhao">照</div>'), false, "center watermark must not use font zhao")
  assert.equal(page.includes('<span className="stamp-zhao">照</span>'), false, "stamp mark must not use font zhao")
  assert.equal(page.includes("天降盖印"), false, "stamp action should be a press, not a falling seal")
  assert.equal(page.includes("from-sky"), false, "animation names should not imply falling from sky")
})
