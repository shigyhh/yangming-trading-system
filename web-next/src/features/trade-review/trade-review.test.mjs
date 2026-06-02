import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pageUrl = new URL("../../app/trade-review/page.tsx", import.meta.url)
const featureUrl = new URL("./trade-review.ts", import.meta.url)
const apiClientUrl = new URL("../data-binding/api-client.ts", import.meta.url)
const heartProofEngineUrl = new URL("../heart-proof/heartProofEngine.ts", import.meta.url)
const heartProofStorageUrl = new URL("../heart-proof/heartProofStorage.ts", import.meta.url)
const behaviorLoopStorageUrl = new URL("../living-mirror-growth/behaviorLoopStorage.ts", import.meta.url)
const growthProfileStorageUrl = new URL("../living-mirror-growth/growthProfileStorage.ts", import.meta.url)
const archiveEngineUrl = new URL("../mirror-archive/archiveEngine.ts", import.meta.url)
const contractUrl = new URL("../../../../packages/contracts/data-binding.d.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "抄底", "逃顶", "行情判断"]

test("trade review page captures eight behavior questions and creates review heart proof", async () => {
  const page = await readFile(pageUrl, "utf8")
  const feature = await readFile(featureUrl, "utf8")
  const apiClient = await readFile(apiClientUrl, "utf8")
  const heartProofEngine = await readFile(heartProofEngineUrl, "utf8")
  const heartProofStorage = await readFile(heartProofStorageUrl, "utf8")
  const behaviorLoopStorage = await readFile(behaviorLoopStorageUrl, "utf8")
  const growthProfileStorage = await readFile(growthProfileStorageUrl, "utf8")
  const archiveEngine = await readFile(archiveEngineUrl, "utf8")
  const contract = await readFile(contractUrl, "utf8")
  const source = `${page}\n${feature}\n${apiClient}\n${heartProofEngine}\n${heartProofStorage}\n${behaviorLoopStorage}\n${growthProfileStorage}\n${archiveEngine}\n${contract}`

  ;[
    "真实交易复盘",
    "这笔交易，是计划在下单，还是念头在下单？",
    "不评价行情，不判断买卖对错，只记录交易行为和当时的一念。",
    "这笔交易是否在原计划内？",
    "下单前最强的一念是什么？",
    "下单时情绪强度是多少？",
    "是否提前写过止损/离场条件？",
    "是否临盘改计划？",
    "交易后第一反应是什么？",
    "这笔交易暴露了哪个人格风险？",
    "下一次同场景你要先做什么？",
    "复盘心证预览",
    "生成复盘心证",
    "syncTradeReviewBinding",
    "DataBindingTradeReviewPayload",
    "POST /api/v1/data-binding/users/:user_id/trade-reviews",
    "inferTradeReviewMirror",
    "TradeReviewDraft",
    "buildTradeReviewPayload",
    "reviewId",
    "heartProofId",
    "review_heart_proof",
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
    "loadMirrorReport",
    "HeartProofCard",
    "loadHeartProofs",
    "tradeReviewLastResultStorageKey",
    "loadMirrorArchiveData",
    "/trade-review",
    "复盘心证已生成",
    "这笔交易照见的是：",
    "真正的问题不是行情对错，而是当时哪一念先于规则行动。",
    "下一次同场景，只练一个动作：",
    "循环之镜已显影",
    "你可以去查看自己反复出现的触发 → 一念 → 行为 → 结果。",
    "这条复盘已入档。继续记录真实交易后，系统会识别你的重复循环。",
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
