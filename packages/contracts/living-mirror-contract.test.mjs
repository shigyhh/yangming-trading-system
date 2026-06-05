import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const contractUrl = new URL("./living-mirror.d.ts", import.meta.url)
const roadmapUrl = new URL("../../docs/SPRINT_9_19_LIVING_MIRROR_ROADMAP.md", import.meta.url)

const requiredTypes = [
  "LivingMirrorClosedLoop",
  "LivingMirrorLoopStage",
  "User",
  "MirrorReport",
  "TrainingRecord",
  "TradeReview",
  "TradeReviewOcrDraft",
  "TradeReviewMarketContext",
  "LivingMirrorStats",
  "LivingMirrorProfile",
  "ZhixingStability",
  "TripleReflection",
  "TrainingPrescriptionDispatch",
  "TrainingPrescriptionStep",
  "TradeReviewCrossEndStatusStep",
  "MirrorSpectrumEntry",
  "PersonalCycle",
  "DailyHeartWitness",
  "LivingMirrorGrowthSignal",
  "HeartMirrorTree",
  "RetestChange",
  "AssistantHandoff",
  "ShareCardSnapshot",
  "GlobalReflectionEntry",
  "GlobalMirrorHeatmapRow",
]

const requiredFields = [
  "stages",
  "sharedEntities",
  "webRole",
  "miniprogramRole",
  "primarySurface",
  "nextAction",
  "complianceGuardrail",
  "mainMirror",
  "subMirror",
  "mirrorSpectrum",
  "thieves",
  "verdict",
  "riskRadar",
  "typicalLoop",
  "typicalCycle",
  "sevenDayPrescription",
  "campSuggestion",
  "imageUrl",
  "tradeDate",
  "lookupSymbol",
  "symbolMasked",
  "timeframeKey",
  "buyReason",
  "sellReason",
  "strongestThought",
  "detectedMirror",
  "detectedThieves",
  "personalCycle",
  "ocrDraft",
  "marketContext",
  "crossEndStatus",
  "crossEndStatusText",
  "crossEndStatusSteps",
  "mirrorScores",
  "thiefCounts",
  "currentMainMirror",
  "tripleReflection",
  "latestMarketContext",
  "unifiedConclusion",
  "proofLine",
  "matchedSources",
  "conflictSources",
  "nextCalibration",
  "klinePractice",
  "reflectionPrompt",
  "TrainingPrescriptionDispatch",
  "zhixingStability",
  "tripleReflection",
  "growthTrend",
  "heartMirrorTree",
  "growthSource",
  "dailyHeartWitness",
  "latestPersonalCycle",
  "suggestedScript",
  "feishuSynced",
]

const mirrorLabels = [
  "追涨之镜",
  "扛单之镜",
  "幻想之镜",
  "赌性之镜",
  "从众之镜",
  "犹疑之镜",
  "拖延之镜",
  "焦虑之镜",
  "良知之镜",
]

const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶"]

test("living mirror contract exposes the shared Sprint 8-19 loop entities", async () => {
  const contract = await readFile(contractUrl, "utf8")

  requiredTypes.forEach((typeName) => {
    assert.match(contract, new RegExp(`export type ${typeName}\\b`), `missing exported type: ${typeName}`)
  })

  requiredFields.forEach((fieldName) => {
    assert.ok(contract.includes(fieldName), `missing field: ${fieldName}`)
  })

  mirrorLabels.forEach((label) => {
    assert.ok(contract.includes(label), `missing mirror label: ${label}`)
  })

  assert.ok(contract.includes("本报告用于交易心理觉察与训练，不构成投资建议"))
  assert.ok(contract.includes("仅为交易心理觉察数据，不构成投资建议"))
})

test("living mirror roadmap covers Sprint 8 through Sprint 19 without forbidden promises", async () => {
  const roadmap = await readFile(roadmapUrl, "utf8")

  for (let sprint = 8; sprint <= 19; sprint += 1) {
    assert.ok(roadmap.includes(`Sprint ${sprint}`), `roadmap missing Sprint ${sprint}`)
  }

  mirrorLabels.forEach((label) => {
    assert.ok(roadmap.includes(label), `roadmap missing mirror label: ${label}`)
  })

  assert.ok(roadmap.includes("以交易照人心"))
  assert.ok(roadmap.includes("以复盘照行为"))
  assert.ok(roadmap.includes("以训练照变化"))
  assert.ok(roadmap.includes("以活镜照成长"))
  assert.ok(roadmap.includes("不要把这些 Sprint 做成一堆独立页面"))
  assert.ok(roadmap.includes("深度照见引擎"))
  assert.ok(roadmap.includes("每日修行陪跑器"))
  assert.ok(roadmap.includes("心镜之树"))
  assert.ok(roadmap.includes("用户自己的循环"))

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(roadmap.includes(phrase), false, `roadmap contains forbidden phrase: ${phrase}`)
  })
})
