import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("../../app/trade-review/page.tsx", import.meta.url)
const featureUrl = new URL("./trade-review.ts", import.meta.url)
const assessmentStorageUrl = new URL("../assessment/storage.ts", import.meta.url)
const apiClientUrl = new URL("../data-binding/api-client.ts", import.meta.url)
const heartProofEngineUrl = new URL("../heart-proof/heartProofEngine.ts", import.meta.url)
const heartProofStorageUrl = new URL("../heart-proof/heartProofStorage.ts", import.meta.url)
const behaviorLoopEngineUrl = new URL("../living-mirror-growth/behaviorLoopEngine.ts", import.meta.url)
const behaviorLoopStorageUrl = new URL("../living-mirror-growth/behaviorLoopStorage.ts", import.meta.url)
const growthProfileEngineUrl = new URL("../living-mirror-growth/growthProfileEngine.ts", import.meta.url)
const growthProfileStorageUrl = new URL("../living-mirror-growth/growthProfileStorage.ts", import.meta.url)
const archiveEngineUrl = new URL("../mirror-archive/archiveEngine.ts", import.meta.url)
const contractUrl = new URL("../../../../packages/contracts/data-binding.d.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶", "行情判断"]

test("trade review page captures screenshot-based three-question review and creates review records", async () => {
  const page = await readFile(pageUrl, "utf8")
  const feature = await readFile(featureUrl, "utf8")
  const assessmentStorage = await readFile(assessmentStorageUrl, "utf8")
  const apiClient = await readFile(apiClientUrl, "utf8")
  const heartProofEngine = await readFile(heartProofEngineUrl, "utf8")
  const heartProofStorage = await readFile(heartProofStorageUrl, "utf8")
  const behaviorLoopEngine = await readFile(behaviorLoopEngineUrl, "utf8")
  const behaviorLoopStorage = await readFile(behaviorLoopStorageUrl, "utf8")
  const growthProfileEngine = await readFile(growthProfileEngineUrl, "utf8")
  const growthProfileStorage = await readFile(growthProfileStorageUrl, "utf8")
  const archiveEngine = await readFile(archiveEngineUrl, "utf8")
  const contract = await readFile(contractUrl, "utf8")
  const source = `${page}\n${feature}\n${assessmentStorage}\n${apiClient}\n${heartProofEngine}\n${heartProofStorage}\n${behaviorLoopEngine}\n${behaviorLoopStorage}\n${growthProfileEngine}\n${growthProfileStorage}\n${archiveEngine}\n${contract}`

  ;[
    "真实交易复盘",
    "YangmingCharacterMark",
    "复字，真实复盘，回看行为",
    "复盘页 / 回看行为",
    "真实交易复盘 MVP",
    "以复盘照行为",
    "以活镜照成长",
    "上传一张截图，写下三句真实自述",
    "截图记录",
    "上传交易截图 / K 线截图 / 交易记录截图",
    "第一版只保存截图与自述，不自动识别行情。",
    "复盘三问",
    "reviewQuestionPrompts.buyReason",
    "reviewQuestionPrompts.sellReason",
    "reviewQuestionPrompts.strongestThought",
    "为什么进入？",
    "为什么离开？",
    "当时最大的念头是什么？",
    "写入活镜成长",
    "先完成截图与三问",
    "心镜映射预览",
    "心贼显影",
    "活镜成长",
    "最近复盘",
    "进入活镜中枢",
    "syncTradeReviewBinding",
    "DataBindingTradeReviewPayload",
    "POST /api/v1/data-binding/users/:user_id/trade-reviews",
    "inferTradeReviewMapping",
    "TradeReviewDraft",
    "buildTradeReviewPayload",
    "lookupSymbol",
    "timeframeKey",
    "reviewId",
    "heartProofId",
    'sourceType: "trade_review"',
    "buildTradeReviewHeartProof",
    "saveHeartProof",
    "deriveBehaviorLoops",
    "upsertBehaviorLoops",
    "recomputeAndSaveGrowthProfile",
    "assistantHandoffPatch",
    "archiveItemsToUpsert",
    "scrollEventsToUpsert",
    "behavior_loop_id",
    "ym_behavior_loops_v1",
    "tradeReviewHistoryStorageKey",
    "loadTradeReviewHistory",
    "upsertTradeReviewHistory",
    "ym_trade_review_history_v1",
    "loadHeartProofs",
    "tradeReviewLastResultStorageKey",
    "loadMirrorArchiveData",
    "/trade-review",
    "复盘心证已生成",
    "这笔复盘照见的是：",
    "真正的问题不是行情对错，而是当时哪一念先于规则行动。",
    "循环之镜显影",
    "你正在重复的循环是：",
    "循环之镜已经从真实证据中生成。",
    "完成一次真实交易复盘后，这里会沉淀为个人循环。",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `missing token: ${token}`)
  })

  ;["怕错过", "想翻本", "想问别人"].forEach((token) => {
    assert.equal(feature.includes(token), true, `missing mapping token: ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `contains forbidden phrase: ${phrase}`)
  })
})
