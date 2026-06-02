import { readFileSync } from "node:fs"
import { test } from "node:test"
import assert from "node:assert/strict"

const source = readFileSync(new URL("./MirrorGateway.tsx", import.meta.url), "utf8")
const assessmentPage = readFileSync(new URL("../../app/assessment/page.tsx", import.meta.url), "utf8")

test("mirror gateway keeps the fixed moon-heart nine-mirror sequence", () => {
  const requiredCopy = [
    "明月照心",
    "九镜照念",
    "水面入静",
    "先不判断行情。",
    "先看见这一念。",
    "「再不上车就来不及了。」",
    "九镜响应",
    "追涨之镜正在发亮。",
    "照见此念",
    "追涨之镜入湖。",
    "照回情绪收益",
    "心贼现形",
    "贪 · 急",
    "今日心证",
    "心随涨动",
    "良知收束",
    "知善知恶是良知",
    "为善去恶是格物",
    "今日已照见",
    "进入循环之镜",
  ]

  for (const text of requiredCopy) {
    assert.match(source, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
})

test("mirror gateway presents emotional payoff before naming the thieves", () => {
  assert.match(source, /你怕的不是错过行情/)
  assert.match(source, /那个“又慢了一步”的自己/)
  assert.match(source, /贪：想抓住更多/)
  assert.match(source, /急：怕慢一步就失去机会/)
  assert.ok(
    source.indexOf("照回情绪收益") < source.indexOf("心贼现形"),
    "emotional payoff must be shown before the thief seal",
  )

  const forbiddenCopy = ["推荐买入", "推荐卖出", "收益保证", "必赚", "抄底", "逃顶"]

  for (const text of forbiddenCopy) {
    assert.doesNotMatch(source, new RegExp(text))
  }
})

test("mirror gateway is not a nine-option questionnaire", () => {
  const mirrorNames = [
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

  for (const name of mirrorNames) {
    assert.match(source, new RegExp(name))
  }

  assert.doesNotMatch(source, /onComplete\(mirror\.id\)/)
  assert.doesNotMatch(source, /selectedMirrorId/)
  assert.doesNotMatch(source, /heart-mirror-side/)
  assert.doesNotMatch(source, /assessmentStorageKeys/)
  assert.match(source, /MAIN_MIRROR_ID: MirrorId = "chasing"/)
  assert.match(source, /onComplete\(MAIN_MIRROR_ID\)/)
})

test("assessment entry into water gateway is not skipped by old questionnaire cache", () => {
  assert.match(assessmentPage, /setAnswers\(\[\]\)/)
  assert.match(assessmentPage, /setCurrentIndex\(0\)/)
  assert.doesNotMatch(assessmentPage, /restoredAnswers\.length > 0/)
  assert.doesNotMatch(assessmentPage, /restoredIndex/)
  assert.match(assessmentPage, /router\.push\(`\/cycle-mirror\?mirror=/)
})
