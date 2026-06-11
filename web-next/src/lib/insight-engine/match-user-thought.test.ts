import assert from "node:assert/strict"
import test from "node:test"

import {
  matchUserThought,
  shouldUseAIFallback,
  validateAIThoughtMatch,
} from "./match-user-thought.ts"

function expectScene(result: ReturnType<typeof matchUserThought>, sceneNames: string[]) {
  assert.equal(sceneNames.includes(result.matchedSceneName), true, `${result.inputText} matched ${result.matchedSceneName}`)
}

function expectNotMirror(result: ReturnType<typeof matchUserThought>, mirrorName: string) {
  assert.notEqual(result.matchedMirrorName, mirrorName)
  assert.equal(result.candidates.some((candidate) => candidate.mirrorName === mirrorName && candidate.score >= result.candidates[0].score), false)
}

test("matches sell-too-early regret without falling into gambling", () => {
  const result = matchUserThought("下次不卖了")

  expectScene(result, ["卖飞懊恼"])
  assert.equal(result.matchedMirrorName, "悔念之镜")
  expectNotMirror(result, "赌性之镜")
})

test("matches holding-longer regret to sell-too-early or profit regret", () => {
  const result = matchUserThought("再拿一下就好了")

  expectScene(result, ["卖飞懊恼", "止盈后继续涨"])
})

test("matches breakeven obsession", () => {
  const result = matchUserThought("回本我就走")

  expectScene(result, ["回本执念"])
})

test("matches revenge trading only for comeback language", () => {
  const result = matchUserThought("亏了这么多，下一笔必须打回来")

  expectScene(result, ["连续亏损后翻本"])
  assert.equal(result.matchedMirrorName, "赌性之镜")
})

test("matches all-in impulse", () => {
  const result = matchUserThought("直接梭哈算了")

  expectScene(result, ["梭哈冲动"])
})

test("matches refusing stop loss or holding loss", () => {
  const result = matchUserThought("再等等，应该会回来")

  expectScene(result, ["不愿止损", "扛单死撑"])
})

test("matches average-down language", () => {
  const result = matchUserThought("我又想补了，摊低成本")

  expectScene(result, ["补仓摊平", "越跌越补"])
})

test("matches surge or missed-entry language", () => {
  const result = matchUserThought("怎么一打开就起飞了")

  expectScene(result, ["急涨追高", "踏空焦虑"])
})

test("matches news and group chatter", () => {
  const result = matchUserThought("群里都说这个有利好")

  expectScene(result, ["消息刺激", "消息面交易"])
})

test("matches seeing right but not buying", () => {
  const result = matchUserThought("我看对了但不敢买")

  expectScene(result, ["看对不敢买"])
})

test("returns stable match structure with reflection evidence and practice", () => {
  const result = matchUserThought("卖完就涨，刚才就不该卖")

  assert.equal(result.inputText, "卖完就涨，刚才就不该卖")
  assert.equal(Boolean(result.matchedSceneId), true)
  assert.equal(Boolean(result.matchedMirrorId), true)
  assert.equal(Boolean(result.matchedThief), true)
  assert.equal(result.confidence > 0, true)
  assert.equal(["high", "medium", "low"].includes(result.confidenceLabel), true)
  assert.equal(Boolean(result.reason), true)
  assert.equal(result.candidates.length > 0 && result.candidates.length <= 3, true)
  assert.equal(Boolean(result.suggestedReflection), true)
  assert.equal(Boolean(result.suggestedEvidence), true)
  assert.equal(Boolean(result.suggestedPractice), true)
})

test("marks low confidence or long inputs as AI fallback candidates without enabling GPT", () => {
  const lowConfidence = matchUserThought("心里有点乱")
  const longInput = matchUserThought("今天盘中看到群里消息又想追，可是刚才卖完就涨，我现在又想回本，所以心里很乱")

  assert.equal(shouldUseAIFallback(lowConfidence), true)
  assert.equal(shouldUseAIFallback(longInput), true)
})

test("validates AI output must choose one local candidate", () => {
  const local = matchUserThought("群里都说这个有利好")
  const valid = validateAIThoughtMatch(
    {
      matchedSceneId: local.candidates[0].sceneId,
      matchedSceneName: local.candidates[0].sceneName,
      matchedMirrorId: "news_trigger",
      matchedMirrorName: local.candidates[0].mirrorName,
      matchedThief: local.candidates[0].thief,
      confidence: 0.82,
      reason: "在候选中选择消息刺激。",
    },
    local.candidates,
  )
  const invalid = validateAIThoughtMatch(
    {
      matchedSceneId: "scene_fake",
      matchedSceneName: "新场景",
      matchedMirrorId: "fake",
      matchedMirrorName: "新镜",
      matchedThief: "新心贼",
      confidence: 0.9,
      reason: "创造了新场景。",
    },
    local.candidates,
  )

  assert.equal(valid.valid, true)
  assert.equal(invalid.valid, false)
})
