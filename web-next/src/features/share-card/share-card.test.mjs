import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("../../app/share-card/page.tsx", import.meta.url)
const componentUrl = new URL("./ShareCardPage.tsx", import.meta.url)
const engineUrl = new URL("./shareCardEngine.ts", import.meta.url)
const storageUrl = new URL("./shareCardStorage.ts", import.meta.url)
const typesUrl = new URL("./shareCardTypes.ts", import.meta.url)
const contractUrl = new URL("../../../../packages/contracts/reflection-domain.d.ts", import.meta.url)

const forbiddenPhrases = [
  "推荐买入",
  "推荐卖出",
  "必赚",
  "稳赚",
  "收益保证",
  "抄底",
  "逃顶",
  "带单",
  "喊单",
  "预测行情",
  "韭菜",
  "亏钱的命",
]

test("Sprint13 share card uses report, heart proof and retest sources", async () => {
  const page = await readFile(pageUrl, "utf8")
  const component = await readFile(componentUrl, "utf8")
  const engine = await readFile(engineUrl, "utf8")
  const storage = await readFile(storageUrl, "utf8")
  const types = await readFile(typesUrl, "utf8")
  const contract = await readFile(contractUrl, "utf8")
  const source = `${page}\n${component}\n${engine}\n${storage}\n${types}\n${contract}`

  ;[
    "ShareCard",
    "shareCardId",
    "mirror_report_card",
    "heart_proof_card",
    "retest_change_card",
    "sourceType",
    "mirror_report",
    "heart_proof",
    "retest",
    "loadMirrorReport",
    "loadHeartProofs",
    "loadMirrorArchiveData",
    "buildShareCard",
    "formatShareCardCopy",
    "ym_share_cards_v1",
    "ym_latest_share_card_v1",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })
})

test("Sprint13 share card copy is restrained and compliant", async () => {
  const page = await readFile(pageUrl, "utf8")
  const component = await readFile(componentUrl, "utf8")
  const engine = await readFile(engineUrl, "utf8")
  const source = `${page}\n${component}\n${engine}`

  ;[
    "市场照见人心",
    "我的今日心证",
    "我的心镜报告",
    "我的七日变化",
    "我照见的是",
    "测一测你的交易心镜",
    "邀请码",
    "本内容仅用于交易心理训练，不构成投资建议",
    "分享照见",
    "不分享标签",
    "YangmingC16Mark",
    "YangmingZhaoSeal",
    "阳明照见分享卡小标",
    "阳明照见分享卡主照印水印",
    "share-poster-mark",
    "share-poster-zhao-watermark",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing copy token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})
