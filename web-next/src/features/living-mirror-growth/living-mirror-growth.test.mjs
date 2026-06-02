import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

const typeUrl = new URL("./growthProfileTypes.ts", import.meta.url)
const engineUrl = new URL("./growthProfileEngine.ts", import.meta.url)
const storageUrl = new URL("./growthProfileStorage.ts", import.meta.url)
const behaviorLoopTypeUrl = new URL("./behaviorLoopTypes.ts", import.meta.url)
const behaviorLoopEngineUrl = new URL("./behaviorLoopEngine.ts", import.meta.url)
const behaviorLoopStorageUrl = new URL("./behaviorLoopStorage.ts", import.meta.url)
const retestChangeStorageUrl = new URL("./retestChangeStorage.ts", import.meta.url)
const pageUrl = new URL("../../app/living-mirror-growth/page.tsx", import.meta.url)
const practiceChangePageUrl = new URL("../../app/practice-change/page.tsx", import.meta.url)
const tradeReviewPageUrl = new URL("../../app/trade-review/page.tsx", import.meta.url)
const assessmentGeneratingPageUrl = new URL("../../app/assessment-generating/page.tsx", import.meta.url)
const archiveEngineUrl = new URL("../mirror-archive/archiveEngine.ts", import.meta.url)
const archiveTypesUrl = new URL("../mirror-archive/archiveTypes.ts", import.meta.url)
const scrollEngineUrl = new URL("../mirror-scroll/scrollEngine.ts", import.meta.url)
const loopEngineUrl = new URL("../reflection-loop/reflectionLoopEngine.ts", import.meta.url)
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("living mirror growth profile engine exposes required growth profile outputs", async () => {
  const source = [
    await readFile(typeUrl, "utf8"),
    await readFile(engineUrl, "utf8"),
    await readFile(storageUrl, "utf8"),
    await readFile(behaviorLoopTypeUrl, "utf8"),
    await readFile(behaviorLoopEngineUrl, "utf8"),
    await readFile(behaviorLoopStorageUrl, "utf8"),
    await readFile(retestChangeStorageUrl, "utf8"),
  ].join("\n")

  ;[
    "LivingMirrorGrowthProfile",
    "GrowthProfileInput",
    "GrowthProfileBuildResult",
    "buildGrowthProfile",
    "getGrowthProfileForUser",
    "getGrowthProfileById",
    "upsertGrowthProfile",
    "recomputeAndSaveGrowthProfile",
    "clearGrowthProfileForDev",
    "ym_growth_profiles_v1",
    "computedAtHistory",
    "topBehaviorLoopIds",
    "tradeReviewCount",
    "LivingMirrorGrowthProfileInput",
    "buildLivingMirrorGrowthProfile",
    "buildLivingMirrorGrowthProfileFromLocal",
    "refreshLivingMirrorGrowthProfile",
    "growth_profile_id",
    "highFrequencyThought",
    "repeatedBehaviors",
    "affectedDimensions",
    "trainingContinuity",
    "heartProofCount",
    "tradeReviewCount",
    "retestSummary",
    "GrowthProfileRetestSummary",
    "RetestDimensionChange",
    "improvedDimensions",
    "declinedDimensions",
    "trainingEvidenceSummary",
    "highFrequencyThoughtChange",
    "repeatedBehaviorChange",
    "nextCycleFocus",
    "mirrorLifeStage",
    "BehaviorLoop",
    "deriveBehaviorLoops",
    "signature",
    "riskLevel",
    "confidence",
    "firstSeenAt",
    "lastSeenAt",
    "evidenceIds",
    "behavior_loop_id",
    "repeatCount",
    "evidenceSources",
    "getBehaviorLoopsForUser",
    "upsertBehaviorLoops",
    "getBehaviorLoopById",
    "clearBehaviorLoopsForDev",
    "buildBehaviorLoopFromTradeReview",
    "ensureBehaviorLoopFromTradeReview",
    "buildBehaviorLoopFromHeartProof",
    "ensureBehaviorLoopsFromHeartProofs",
    "buildCycleMirrorCaseFromBehaviorLoop",
    "ym_behavior_loops_v1",
    "ym_behavior_loops_v1",
    "ym_retest_changes_v1",
    "loadRetestChanges",
    "upsertRetestChange",
    "buildRetestChangeFromComparisons",
    "behaviorLoopCount",
    "sourceType: \"behavior_loop\"",
    "心镜种子",
    "心镜发芽",
    "心镜生根",
    "心镜成枝",
    "心镜开花",
    "心镜常青",
    "心镜报告",
    "今日修行",
    "今日心证",
    "真实交易复盘",
    "复盘心证",
    "循环之镜",
    "复测变化",
    "ym_living_mirror_growth_profile_v1",
    "compareRiskRadarSnapshots",
    "loadHeartProofs",
    "loadMirrorReport",
    "tradeReviewLastResultStorageKey",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `growth profile missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `growth profile contains forbidden phrase ${phrase}`)
  })
})

test("growthProfileEngine covers Sprint 8-10 growth profile computation rules", async () => {
  const source = [
    await readFile(engineUrl, "utf8"),
    await readFile(typeUrl, "utf8"),
  ].join("\n")

  ;[
    "highFrequencyThoughts",
    "trainingContinuity",
    "completedGrowthDays",
    "currentStreak",
    "longestStreak",
    "missedDays",
    "trainingConsistencyScore",
    "addThoughtWeight(counter, thoughtType, 1",
    "addThoughtWeight(counter, thoughtType, 1.2",
    "addThoughtWeight(counter, thoughtType, 1.5",
    "计划外交易",
    "临盘改计划",
    "离场条件缺失",
    "planless_chase",
    "intraday_plan_change",
    "no_exit_rule",
    "revenge_trade",
    "outsourced_judgment",
    "未入照",
    "初入照",
    "见念期",
    "守行期",
    "成证期",
    "复照期",
    "missing_trade_review",
    "missing_heart_proof",
    "insufficient_training_days",
    "missing_retest",
    "archiveItemsToUpsert",
    "scrollEventsToUpsert",
    "assistantHandoffPatch",
    "mirrorLifeStage",
    "completedGrowthDays",
    "trainingConsistencyScore",
    "heartProofCount",
    "tradeReviewCount",
    "topThought",
    "latestHeartProof",
    "topBehaviorLoop",
    "forbiddenPhrases",
    "assistantHandoffForbiddenPhrases",
    "buildAssistantSuggestedOpening",
    "buildGrowthRetestSummary",
    "getRetestFocus",
    "复测变化节点",
    "_active",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `growth profile rule missing ${token}`)
  })
})

test("behaviorLoopEngine derives evidence-backed loops without duplicate signatures", async () => {
  const source = await readFile(behaviorLoopEngineUrl, "utf8")

  ;[
    "deriveBehaviorLoops",
    "evidenceList.length >= 2",
    "buildBehaviorLoopSignature",
    "ownerId",
    "reportId",
    "thoughtType",
    "actionPattern",
    "价格快速拉升或计划外机会出现",
    "计划外拉升前停十秒，再看是否在原计划内",
    "亏损后离开屏幕三分钟，再决定是否继续",
    "问别人前，先写下自己的方向和理由",
    "只在事前写明的条件触发时修改计划",
    "进场前必须写下离场条件",
    "normalizeEmotionIntensity(emotionIntensity) >= 8",
    "tradeReviewCount >= 2",
    "0.95",
    "affectedDimensions",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `behavior loop rule missing ${token}`)
  })
})

test("behaviorLoopEngine computes fomo, plan-change and exit-rule loops from evidence", async () => {
  const engine = await loadBehaviorLoopEngine()
  const mirrorReports = [makeMirrorReport()]
  const common = {
    userId: "user_1",
    anonymousId: "anon_1",
    reportId: "report_1",
    hadExitRule: true,
    changedPlanDuringTrade: false,
    detectedMirror: "追涨之镜",
    detectedThieves: [],
    behaviorTags: [],
    reviewText: "只记录当时的一念，不评价行情对错。",
  }
  const fomoLoops = engine.deriveBehaviorLoops({
    mirrorReports,
    dailyGrowthRecords: [],
    heartProofs: [],
    tradeReviews: [
      makeTradeReview({ ...common, id: "review_1", strongestThought: "fomo", wasPlanned: false, createdAt: "2026-06-01T00:00:00.000Z" }),
      makeTradeReview({ ...common, id: "review_2", strongestThought: "fomo", wasPlanned: false, createdAt: "2026-06-02T00:00:00.000Z" }),
    ],
    now: "2026-06-02T12:00:00.000Z",
  })

  assert.equal(fomoLoops.filter((loop) => loop.signature.includes("fomo|fomo")).length, 1)
  assert.equal(fomoLoops[0].repeatCount, 2)
  assert.deepEqual(fomoLoops[0].evidenceIds, ["trade_review:review_1", "trade_review:review_2"])
  assert.equal(fomoLoops[0].firstSeenAt, "2026-06-01T00:00:00.000Z")
  assert.equal(fomoLoops[0].lastSeenAt, "2026-06-02T00:00:00.000Z")

  const planChangeLoops = engine.deriveBehaviorLoops({
    mirrorReports,
    dailyGrowthRecords: [],
    heartProofs: [],
    tradeReviews: [
      makeTradeReview({ ...common, id: "review_3", strongestThought: "fomo", wasPlanned: true, changedPlanDuringTrade: true }),
    ],
    now: "2026-06-02T12:00:00.000Z",
  })
  assert.equal(planChangeLoops.some((loop) => loop.signature.includes("abandon_plan|intraday_plan_change")), true)

  const noExitLoops = engine.deriveBehaviorLoops({
    mirrorReports,
    dailyGrowthRecords: [],
    heartProofs: [],
    tradeReviews: [
      makeTradeReview({ ...common, id: "review_4", strongestThought: "fear", wasPlanned: true, hadExitRule: false }),
    ],
    now: "2026-06-02T12:00:00.000Z",
  })
  assert.equal(noExitLoops.some((loop) => loop.signature.includes("fear|no_exit_rule")), true)

  const insufficientLoops = engine.deriveBehaviorLoops({
    mirrorReports,
    dailyGrowthRecords: [{ dailyGrowthId: "daily_1", anonymousId: "anon_1", reportId: "report_1", trainingDay: 1, thoughtType: "fomo", isCompleted: true }],
    heartProofs: [],
    tradeReviews: [],
    now: "2026-06-02T12:00:00.000Z",
  })
  assert.equal(insufficientLoops.length, 0)
})

test("growthProfileStorage persists profiles and wires recompute triggers", async () => {
  const source = [
    await readFile(storageUrl, "utf8"),
    await readFile(archiveEngineUrl, "utf8"),
    await readFile(scrollEngineUrl, "utf8"),
    await readFile(practiceChangePageUrl, "utf8"),
    await readFile(tradeReviewPageUrl, "utf8"),
    await readFile(assessmentGeneratingPageUrl, "utf8"),
  ].join("\n")

  ;[
    "growthProfilesStorageKey = \"ym_growth_profiles_v1\"",
    "getGrowthProfileForUser",
    "getGrowthProfileById",
    "upsertGrowthProfile",
    "recomputeAndSaveGrowthProfile",
    "clearGrowthProfileForDev",
    "getGrowthProfileSignature",
    "computedAtHistory",
    "topBehaviorLoopIds",
    "tradeReviewCount",
    "loadGrowthProfileArchiveItems",
    "loadGrowthProfileScrollEvents",
    "loadRetestChanges",
    "recomputeAndSaveGrowthProfile({ dailyGrowth: nextGrowth",
    "recomputeAndSaveGrowthProfile({",
    "tradeReviews,",
    "upsertRetestChange",
    "retestChanges: [retestChange]",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `growth profile storage missing ${token}`)
  })
})

test("living mirror growth profile enters archive and loop as growth_profile_id evidence", async () => {
  const source = [
    await readFile(archiveEngineUrl, "utf8"),
    await readFile(archiveTypesUrl, "utf8"),
    await readFile(loopEngineUrl, "utf8"),
  ].join("\n")

  ;[
    "growth_profile",
    "growthProfiles",
    "toGrowthProfileArchiveItem",
    "buildLivingMirrorGrowthProfileFromLocal",
    "growthProfile.sourceSummary.evidenceCount",
    "growthProfile.sourceSummary.heartProofCount",
    "growthProfile.sourceSummary.tradeReviewCount",
    "growthProfile.sourceSummary.behaviorLoopCount",
    "growthProfile.sourceSummary.retestChangeCount",
    "behavior_loop",
    "behaviorLoops",
    "toBehaviorLoopArchiveItem",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `growth profile integration missing ${token}`)
  })
})

test("living mirror growth detail page reads GrowthProfile and renders Sprint 6 sections", async () => {
  const source = await readFile(pageUrl, "utf8")

  ;[
    "LivingMirrorGrowthPage",
    "GrowthProfile",
    "recomputeAndSaveGrowthProfile",
    "活镜成长谱",
    "把每天的一念、复盘和心证，连成可见的变化。",
    "成长摘要",
    "已修行",
    "已生成",
    "真实复盘",
    "训练连续性",
    "当前阶段",
    "高频一念",
    "重复行为",
    "影响维度",
    "下一轮照见重点",
    "相关循环入口",
    "profile.highFrequencyThoughts.slice(0, 3)",
    "profile.repeatedBehaviors.slice(0, 3)",
    "profile.affectedDimensions.slice(0, 5)",
    "profile.nextCycleFocus.title",
    "profile.nextCycleFocus.reason",
    "profile.nextCycleFocus.nextActionText",
    "profile.nextCycleFocus.relatedDimensions",
    "profile.topBehaviorLoopIds.length",
    "查看循环之镜",
    "完成 1 次真实交易复盘后，系统会开始识别你的重复循环。",
    "完成今日修行后，这里会出现你的第一条高频一念。",
    "missing_trade_review",
    "继续今日修行",
    "回到心镜档案馆",
    "查看心镜长卷",
    "min-w-[240px]",
    "grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))",
    "line-clamp-3",
    "本系统仅用于交易心理训练与行为复盘，不预测行情，不提供买卖建议，不构成任何投资建议。",
  ].forEach((token) => {
    assert.equal(source.includes(token), true, `growth detail page missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `growth detail page contains forbidden phrase ${phrase}`)
  })
})

async function loadBehaviorLoopEngine() {
  const source = await readFile(behaviorLoopEngineUrl, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText
  const cjsModule = { exports: {} }
  const exports = cjsModule.exports

  new Function("exports", "module", compiled)(exports, cjsModule)
  return cjsModule.exports
}

function makeMirrorReport() {
  return {
    reportId: "report_1",
    assessmentId: "assessment_1",
    anonymousId: "anon_1",
    userId: "user_1",
    primaryPersona: "冲动型",
    secondaryPersona: "焦虑型",
    confidenceScore: 80,
    headline: "照见一念",
    coreProblem: "怕错过先于计划出现。",
    highRiskScenario: "计划外拉升",
    riskRadar: {
      impulse: 80,
      fear: 40,
      ego: 30,
      stopLossExecution: 50,
      reviewAbility: 60,
      systemConsistency: 45,
      riskControl: 50,
      independentJudgment: 60,
    },
    sevenDayPrescription: [],
    recommendedCamp: "自修",
    complianceText: "本报告用于交易心理觉察与训练，不构成投资建议",
    createdAt: "2026-06-01T00:00:00.000Z",
  }
}

function makeTradeReview(overrides) {
  return {
    id: "review_1",
    reviewId: overrides.id || "review_1",
    userId: "user_1",
    anonymousId: "anon_1",
    reportId: "report_1",
    imageUrl: "",
    tradeDate: "2026-06-02",
    buyReason: "记录一念",
    sellReason: "记录动作",
    strongestThought: "fomo",
    emotionIntensity: 6,
    wasPlanned: true,
    hadExitRule: true,
    changedPlanDuringTrade: false,
    postTradeReaction: "regret",
    exposedRisk: "追涨冲动",
    nextAction: "停十秒",
    detectedMirror: "追涨之镜",
    detectedThieves: [],
    behaviorTags: [],
    reviewText: "只记录当时的一念，不评价行情对错。",
    createdAt: "2026-06-02T00:00:00.000Z",
    ...overrides,
    reviewId: overrides.reviewId || overrides.id || "review_1",
  }
}
