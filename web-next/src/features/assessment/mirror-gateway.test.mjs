import { readFileSync } from "node:fs"
import { test } from "node:test"
import assert from "node:assert/strict"

const source = readFileSync(new URL("./MirrorGateway.tsx", import.meta.url), "utf8")
const zhaoxinSource = readFileSync(new URL("./ZhaoxinRitualFlow.tsx", import.meta.url), "utf8")
const heartLakeSource = readFileSync(new URL("./HeartLakeEngine.tsx", import.meta.url), "utf8")
const stillWaterSource = readFileSync(new URL("./StillWaterIntroMirror.tsx", import.meta.url), "utf8")
const assessmentPage = readFileSync(new URL("../../app/assessment/page.tsx", import.meta.url), "utf8")

test("assessment keeps the locked mirror gateway and mounts the heart lake ritual inside it", () => {
  assert.match(assessmentPage, /MirrorGateway/)
  assert.match(assessmentPage, /<MirrorGateway/)
  assert.doesNotMatch(assessmentPage, /HeartMoonNineMirrorsScene/)
  assert.match(source, /StillWaterIntroMirror/)
  assert.match(source, /HeartLakeEngine/)
  assert.match(source, /ZhaoxinRitualFlow/)
  assert.match(source, /showZhaoxinFlow/)
  assert.match(source, /initialScene="surge"/)
  assert.match(source, /initialIntensity=\{3\}/)
  assert.doesNotMatch(source, /<RitualCanvas/)
  assert.ok(
    source.indexOf("<StillWaterIntroMirror") < source.indexOf("<HeartLakeEngine"),
    "still water intro must mount before the heart lake engine",
  )
  assert.ok(
    source.indexOf("<HeartLakeEngine") < source.indexOf("<ZhaoxinRitualFlow"),
    "lake engine must mount before the ritual flow inside the gateway",
  )
  assert.match(source, /triggerRippleKey=\{rippleKey\}/)
})

test("mirror gateway keeps the fixed heart-lake prelude before nine-mirror flow", () => {
  const requiredCopy = [
    "市场还在那里",
    "行情还在那里",
    "此刻，",
    "你心里起了什么念？",
    "一念未起时，",
    "此心本自清明。",
  ]

  for (const text of requiredCopy) {
    assert.match(source, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }

  assert.match(source, /still-water-gateway-copy/)
  assert.match(source, /STILL_WATER_ENTRY_ANCHOR/)
  assert.doesNotMatch(source, /若这一念截中你，就按下照见。/)
  assert.doesNotMatch(source, /<button[^>]*>\\s*照见此念\\s*<\/button>/)
  assert.doesNotMatch(source, /currentCopy\.kicker/)
  assert.doesNotMatch(source, /currentCopy\.main/)
})

test("assessment ritual viewport does not horizontally offset the full-screen layers", () => {
  const gatewayRule = source.match(/\.moon-heart-gateway \{[\s\S]*?\n        \}/)?.[0] ?? ""
  const zhaoxinRootRule = zhaoxinSource.match(/\.zhaoxin-ritual-flow \{[\s\S]*?\n        \}/)?.[0] ?? ""
  const zhaoxinGatewayRule =
    source.match(/\.moon-heart-gateway\.is-zhaoxin-flow :global\(\.zhaoxin-ritual-flow\) \{[\s\S]*?\n        \}/)?.[0] ??
    ""

  assert.match(assessmentPage, /<AssessmentShell className="p-0 md:p-0" contentWidth="wide">/)
  assert.doesNotMatch(gatewayRule, /left:\s*50%/)
  assert.doesNotMatch(gatewayRule, /translateX\(-50%\)/)
  assert.doesNotMatch(zhaoxinRootRule, /left:\s*50%/)
  assert.doesNotMatch(zhaoxinRootRule, /translateX\(-50%\)/)
  assert.match(zhaoxinGatewayRule, /transform:\s*none;/)
})

test("one-thought lake owns the resonance confirm button", () => {
  assert.match(zhaoxinSource, /is-thought-confirm/)
  assert.match(zhaoxinSource, /照见此念/)
  assert.match(zhaoxinSource, /若这一念正是你，请轻触照见。/)
  assert.match(zhaoxinSource, /confirmThought/)
  assert.match(zhaoxinSource, /stage === "thought"/)
  assert.match(zhaoxinSource, /insightThoughts/)
  assert.match(zhaoxinSource, /insightReflections/)
  assert.match(zhaoxinSource, /insightEvidences/)
  assert.match(zhaoxinSource, /insightPractices/)
  assert.match(zhaoxinSource, /insightMirrors/)
  assert.match(zhaoxinSource, /randomThoughtIndex/)
  assert.match(zhaoxinSource, /setSelectedScene\(thoughtScene\)/)
  assert.match(zhaoxinSource, /setSelectedIntensity\(thoughtIntensity\)/)
})

test("heart lake has natural moving glints and pressure-based pointer ripples", () => {
  assert.match(heartLakeSource, /import \* as THREE from "three"/)
  assert.match(heartLakeSource, /EffectComposer/)
  assert.match(heartLakeSource, /UnrealBloomPass/)
  assert.match(heartLakeSource, /PerspectiveCamera/)
  assert.match(heartLakeSource, /PlaneGeometry/)
  assert.match(heartLakeSource, /ShaderMaterial/)
  assert.match(heartLakeSource, /u_rippleStrength/)
  assert.match(heartLakeSource, /u_entryProgress/)
  assert.match(heartLakeSource, /normalFromHeight/)
  assert.match(heartLakeSource, /moonBandLayer/)
  assert.match(heartLakeSource, /rippleRing/)
  assert.match(heartLakeSource, /onPointerMove/)
  assert.match(heartLakeSource, /event\.pressure/)
  assert.match(heartLakeSource, /triggerPointerRipple\(event\.clientX, event\.clientY, "move"/)
  assert.match(heartLakeSource, /triggerPointerRipple\(event\.clientX, event\.clientY, "press"/)
  assert.doesNotMatch(heartLakeSource, /compileShader/)
  assert.doesNotMatch(heartLakeSource, /gl\.drawArrays/)
})

test("still water intro keeps touch ripples without periodic center ripples", () => {
  assert.match(stillWaterSource, /stirAtPointer/)
  assert.match(stillWaterSource, /pointermove/)
  assert.doesNotMatch(stillWaterSource, /lastAutoDrop/)
  assert.doesNotMatch(stillWaterSource, /autoInterval/)
  assert.doesNotMatch(stillWaterSource, /for \(let ring = 0; ring < 8/)
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
