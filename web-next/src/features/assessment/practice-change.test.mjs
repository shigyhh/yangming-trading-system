import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const modelUrl = new URL("./practice-change.ts", import.meta.url)
const pageUrl = new URL("../../app/practice-change/page.tsx", import.meta.url)
const trainingTypesUrl = new URL("./sprint10/trainingTypes.ts", import.meta.url)
const useDailyTrainingUrl = new URL("./sprint10/useDailyTraining.ts", import.meta.url)
const trainingStorageUrl = new URL("./sprint10/trainingStorage.ts", import.meta.url)
const trainingAnalyticsUrl = new URL("./sprint10/trainingAnalytics.ts", import.meta.url)
const storageUrl = new URL("./storage.ts", import.meta.url)
const requiredModelTokens = [
  "KLineTrainingRecord",
  "DailyPracticeEntry",
  "PracticeRiskRadarSnapshot",
  "PracticeCheckInStatus",
  "checkIn",
  "sceneKey",
  "reactionKey",
  "reactionTimeMs",
  "processScores",
  "baselineReport",
  "retestReport",
  "compareRiskRadarSnapshots",
  "reconcilePracticeChangeWithReport",
]
const requiredPageTokens = [
  "第三步 · 每日一省",
  "今日签到",
  "今日修行",
  "K 线心念训练记录",
  "价格快速拉升",
  "你今天照见的是",
  "今天哪一念最容易带走你",
  "按住水面 · 致良知",
  "照见中",
  "完成 7 日训练后解锁复测",
  "变化证据",
  "每日一省",
  "修行轨迹",
  "过程质量，不按盈亏评分",
  "buildTrainingEvidence",
  "buildAssistantSummaryPreview",
  "今日心证",
  "复制心证文字",
  "今日影响维度",
  "saveAssistantSummaryPreview",
  "buildPreviewAssessmentReport",
  "复测风险雷达",
  "cultivationText",
  "klineRecord",
  "clearAssessmentDraft",
  "Sprint10TrainingPage",
  "TrainingHero",
  "DailyPrescriptionCard",
  "CheckinSelector",
  "ThoughtSelector",
  "ThoughtFeedbackCard",
  "ReflectionInput",
  "HoldToCompleteButton",
  "CompletionSealCard",
  "useDailyTraining",
  "今日已落印",
  "写下一句后落印",
  "onMouseDown",
  "onMouseUp",
  "onMouseLeave",
  "onTouchStart",
  "onTouchEnd",
  "onTouchCancel",
  "onKeyDown",
  "onKeyUp",
  "真正的变化，不是今天就不冲动了，而是你已经能在冲动前看见它",
]
const requiredSprint10Tokens = [
  "export type CheckinType",
  "export type ThoughtType",
  "DailyTrainingState",
  "BaselineScores",
  "PracticeTrailItem",
  "trainingStorageKey",
  "getProgressStep",
  "canSelectThought",
  "canWriteReflection",
  "canHoldToComplete",
  "canCompleteTraining",
  "getRemainingDays",
  "getIsRetestUnlocked",
  "training_checkin_selected",
  "training_thought_selected",
  "training_reflection_changed",
  "training_hold_started",
  "training_hold_cancelled",
  "training_day_completed",
  "retest_locked_clicked",
  "ym_sprint10_daily_training_state_v1",
  "loadDailyTrainingDraftState",
  "saveDailyTrainingDraftState",
]
const forbiddenPhrases = ["推荐买入", "推荐卖出", "必赚", "稳赚", "收益保证", "喊单", "抄底", "逃顶"]

test("practice change model exposes the minimum training and retest structures", async () => {
  const source = await readFile(modelUrl, "utf8")

  requiredModelTokens.forEach((token) => {
    assert.equal(source.includes(token), true, `practice-change.ts missing ${token}`)
  })
})

test("practice change page supports daily text, kline records and retest comparison", async () => {
  const source = await readFile(pageUrl, "utf8")

  requiredPageTokens.forEach((token) => {
    assert.equal(source.includes(token), true, `practice-change page missing ${token}`)
  })

  forbiddenPhrases.forEach((phrase) => {
    assert.equal(source.includes(phrase), false, `practice-change page contains forbidden phrase ${phrase}`)
  })
})

test("sprint 10 training state is separated from the page", async () => {
  const source = [
    await readFile(trainingTypesUrl, "utf8"),
    await readFile(useDailyTrainingUrl, "utf8"),
    await readFile(trainingStorageUrl, "utf8"),
    await readFile(trainingAnalyticsUrl, "utf8"),
    await readFile(storageUrl, "utf8"),
  ].join("\n")

  requiredSprint10Tokens.forEach((token) => {
    assert.equal(source.includes(token), true, `sprint10 training module missing ${token}`)
  })
})
