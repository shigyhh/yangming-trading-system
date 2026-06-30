import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const contractUrl = new URL("./reflection-domain.d.ts", import.meta.url)

const requiredTypes = [
  "Assessment",
  "MirrorReport",
  "DailyGrowthState",
  "TradeReview",
  "HeartProof",
  "ArchiveItem",
  "ScrollEvent",
  "AssistantHandoff",
  "ShareCard",
]

const sharedFields = ["id", "userId", "anonymousId", "sourceId", "createdAt"]

const domainFields = [
  "entryName",
  "firstThought",
  "mainMirror",
  "subMirror",
  "sevenDayPrescription",
  "trainingDay",
  "thoughtType",
  "imageUrls",
  "strongestThought",
  "proofSentence",
  "itemType",
  "eventType",
  "latestHeartProof",
  "suggestedOpening",
  "shareCardId",
  "sourceType",
  "quote",
  "shareText",
]

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("reflection domain contract exposes core living mirror entities", async () => {
  const contract = await readFile(contractUrl, "utf8")

  requiredTypes.forEach((typeName) => {
    assert.match(contract, new RegExp(`export type ${typeName}\\b`), `missing exported type: ${typeName}`)
    assert.match(contract, new RegExp(`export type ${typeName} = ReflectionEntityBase &`), `${typeName} must include ReflectionEntityBase`)
  })

  sharedFields.forEach((fieldName) => {
    assert.ok(contract.includes(`${fieldName}: string`), `missing shared field: ${fieldName}`)
  })

  domainFields.forEach((fieldName) => {
    assert.ok(contract.includes(fieldName), `missing domain field: ${fieldName}`)
  })

  assert.ok(contract.includes("本系统仅用于交易心理觉察、行为训练与复盘，不构成任何投资建议"))
})

test("reflection domain contract stays inside compliance boundaries", async () => {
  const contract = await readFile(contractUrl, "utf8")

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(contract.includes(phrase), false, `contract contains forbidden phrase: ${phrase}`)
  })
})
